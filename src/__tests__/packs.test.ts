import { describe, expect, it } from 'vitest'
import { seoPack } from '../packs/seo'
import { performancePack } from '../packs/performance'
import { pathSelector } from '../packs/shared'
import type { ScanContext } from '../packs/types'
import type { AuditIssue } from '../types'

function mount(html: string): ScanContext & { root: HTMLElement } {
  document.body.innerHTML = `<div id="audit">${html}</div>`
  const root = document.getElementById('audit')!
  return {
    root,
    auditRoot: root,
    stableSelector: (raw) => raw,
    findElement: (selector) => root.querySelector<HTMLElement>(selector),
  }
}
const byRule = (issues: AuditIssue[], rule: string) => issues.filter((i) => i.ruleId === rule)

describe('seo pack — plain DOM checks, agents author the words', () => {
  it('flags a missing title, missing description, missing lang, duplicate h1 and generic link text', async () => {
    const ctx = mount(`
      <div data-page-head><span data-page-html></span></div>
      <h1>One</h1><h1>Two</h1>
      <a href="#teams">Read more</a>
    `)
    const issues = await seoPack.scan(ctx)
    expect(byRule(issues, 'document-title')).toHaveLength(1)
    expect(byRule(issues, 'meta-description')).toHaveLength(1)
    expect(byRule(issues, 'html-lang')).toHaveLength(1)
    expect(byRule(issues, 'single-h1')).toHaveLength(1)
    expect(byRule(issues, 'link-text')).toHaveLength(1)
    for (const issue of issues) {
      expect(issue.packId).toBe('seo')
      expect(ctx.root.querySelector(issue.selector), `${issue.id} selector resolves`).not.toBeNull()
    }
  })

  it('is quiet on a well-formed head', async () => {
    const ctx = mount(`
      <div data-page-head>
        <span data-page-html lang="en"></span>
        <span data-page-title>Stride for Life — every step counts</span>
        <meta name="description" content="Walk, jog or run 3, 6 or 12 km on September 14. Every kilometre becomes research funding for the cause.">
      </div>
      <h1>Only one</h1>
      <a href="/teams">See all teams</a>
    `)
    const issues = await seoPack.scan(ctx)
    expect(issues.map((i) => i.ruleId)).toEqual([])
  })

  it('document-title refuses to invent a title and validates the agent-authored one', async () => {
    const ctx = mount(`<div data-page-head data-sightline-key="k"><span data-page-html></span></div>`)
    const [issue] = byRule(await seoPack.scan(ctx), 'document-title')
    const head = ctx.root.querySelector<HTMLElement>(issue.selector)!
    const fixer = seoPack.fixers['document-title']
    const ask = fixer(issue, head, { root: ctx.root, input: {} })
    expect(ask.kind).toBe('needs_input')
    expect(ask.kind === 'needs_input' && ask.requiredField).toBe('title')
    expect(() => fixer(issue, head, { root: ctx.root, input: { title: '<b>x</b>' } })).toThrow(/plain text/)
    expect(() => fixer(issue, head, { root: ctx.root, input: { title: 'x'.repeat(61) } })).toThrow(/60 characters/)
    const ok = fixer(issue, head, { root: ctx.root, input: { title: 'Stride for Life — every step counts' } })
    expect(ok.kind).toBe('patch')
    expect(ok.kind === 'patch' && ok.definition.authoredBy).toBe('agent')
  })
})

describe('performance pack — measured, never guessed', () => {
  it('flags images without dimensions and new-tab links without noopener; lazy rule needs layout', async () => {
    const ctx = mount(`
      <img src="a.png">
      <img src="b.png" width="10" height="10">
      <a href="https://example.com" target="_blank">out</a>
      <a href="https://example.com" target="_blank" rel="noopener">safe</a>
    `)
    const issues = await performancePack.scan(ctx)
    expect(byRule(issues, 'img-dimensions')).toHaveLength(1)
    expect(byRule(issues, 'link-rel-noopener')).toHaveLength(1)
    expect(byRule(issues, 'img-lazy')).toHaveLength(0) // jsdom has no layout; nothing is "below the fold"
    for (const issue of issues) expect(issue.packId).toBe('performance')
  })

  it('img-dimensions refuses to patch an image it cannot measure', async () => {
    const ctx = mount(`<img src="a.png">`)
    const [issue] = byRule(await performancePack.scan(ctx), 'img-dimensions')
    const img = ctx.root.querySelector<HTMLElement>(issue.selector)!
    expect(() => performancePack.fixers['img-dimensions'](issue, img, { root: ctx.root, input: {} })).toThrow(/not loaded/)
  })

  it('link-rel-noopener adds noopener with measured evidence', async () => {
    const ctx = mount(`<a href="https://example.com" target="_blank" rel="nofollow">out</a>`)
    const [issue] = byRule(await performancePack.scan(ctx), 'link-rel-noopener')
    const a = ctx.root.querySelector<HTMLElement>(issue.selector)!
    const out = performancePack.fixers['link-rel-noopener'](issue, a, { root: ctx.root, input: {} })
    expect(out.kind).toBe('patch')
    if (out.kind === 'patch') {
      expect(out.definition.authoredBy).toBe('engine')
      expect(out.definition.evidence.join(' ')).toMatch(/nofollow/)
      expect(JSON.stringify(out.definition.operation)).toMatch(/noopener/)
    }
  })
})

describe('selectors from packs are structural', () => {
  it('pathSelector output never embeds page text', () => {
    const ctx = mount(`<section><p>Hello <em>world</em></p></section>`)
    const em = ctx.root.querySelector('em')!
    expect(pathSelector(em, ctx.root)).toBe('section:nth-of-type(1) > p:nth-of-type(1) > em:nth-of-type(1)')
  })
})
