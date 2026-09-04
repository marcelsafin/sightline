import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SightlineEngine } from '../engine'
import type { AuditIssue } from '../types'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Internals = { state: any; performScan: unknown }

function issue(id: string, packId: AuditIssue['packId'], ruleId: string, selector: string): AuditIssue {
  return { id, packId, ruleId, title: 't', description: 'd', helpUrl: '', impact: 'critical', selector, html: '', failureSummary: '', wcagTags: [] }
}

/**
 * Drives the real engine (real fixers, real applyOperation, real undo/export)
 * against the bundled fixture in jsdom. Only the axe-backed scan is stubbed,
 * because jsdom has no layout; the issues below are the ones the real scan
 * finds on production (verified with scripts/webmcp-smoke.py).
 */
describe('engine workflow: propose → approve → export → revert', () => {
  let engine: SightlineEngine
  let root: HTMLElement
  let internals: Internals
  const share = issue('aria-roles-aria-share', 'accessibility', 'aria-roles', '[data-sightline-key="aria-share"]')
  const hero = issue('image-alt-image-hero', 'accessibility', 'image-alt', '[data-sightline-key="image-hero"]')
  const title = issue('document-title-head', 'seo', 'document-title', '[data-sightline-key="page-head"]')

  beforeEach(() => {
    engine = new SightlineEngine()
    internals = engine as unknown as Internals
    internals.performScan = async () => {
      await sleep(5)
      return { source: 't', wcagLevel: 'AA', score: 100, issueCount: 0, packs: [], issues: [], suggestedNextIssue: null }
    }
    root = document.createElement('div')
    document.body.append(root)
    engine.attachCanvas(root)
    internals.state = { ...engine.getSnapshot(), issues: [share, hero, title] }
  })
  afterEach(() => root.remove())

  it('refuses to invent human-facing content and returns the page context instead', () => {
    const ask = engine.proposeFix(share.id, {}, { actor: 'agent' })
    expect(ask).toMatchObject({ status: 'needs_input', requiredField: 'role', issueId: share.id })
    if ('status' in ask) {
      expect(ask.context.html).toContain('role="buton"')
      expect(ask.context.selector).toBe(share.selector)
    }
    const askAlt = engine.proposeFix(hero.id, {}, { actor: 'agent' })
    expect(askAlt).toMatchObject({ status: 'needs_input', requiredField: 'altText' })
    const askTitle = engine.proposeFix(title.id, {}, { actor: 'agent' })
    expect(askTitle).toMatchObject({ status: 'needs_input', requiredField: 'title' })
    expect(engine.getSnapshot().proposal).toBeNull()
  })

  it('validates agent-authored content before it becomes a patch', () => {
    expect(() => engine.proposeFix(share.id, { role: 'buton' })).toThrow(/role/)
    expect(() => engine.proposeFix(hero.id, { altText: '<img src=x onerror=alert(1)>' })).toThrow(/plain text/)
    expect(() => engine.proposeFix(title.id, { title: 'x'.repeat(61) })).toThrow(/60 characters/)
    const patch = engine.proposeFix(share.id, { role: 'button' })
    expect(patch).toMatchObject({ authoredBy: 'agent', ruleId: 'aria-roles', issueId: share.id })
    if (!('status' in patch)) {
      expect(patch.before).toContain('role="buton"')
      expect(patch.after).toContain('role="button"')
      expect(patch.evidence.join(' ')).toMatch(/buton/)
    }
  })

  it('applies only on approval, exports only approved work, and revert restores the page', async () => {
    const el = () => root.querySelector<HTMLElement>(share.selector)!
    const patch = engine.proposeFix(share.id, { role: 'button' })
    if ('status' in patch) throw new Error('expected a patch')
    const applied = engine.requestApply(share.id, patch.id, { actor: 'agent' })
    await sleep(5)
    expect(el().getAttribute('role')).toBe('buton')
    await engine.approvePending()
    const result = await applied
    expect(result.status).toBe('applied')
    expect(el().getAttribute('role')).toBe('button')

    const diff = engine.exportPatch('diff', { actor: 'agent' })
    expect(diff.fixCount).toBe(1)
    expect(diff.content).toMatch(/^--- a\/page\.html/m)
    expect(diff.content).toMatch(/^-.*role="buton"/m)
    expect(diff.content).toContain('role="button"')
    const report = engine.exportPatch('report', { actor: 'human' })
    expect(report.content).toMatch(/not a certification of WCAG conformance/)
    expect(report.content).toMatch(/authored by agent/)
    expect(report.content).toMatch(/Evidence: .*buton/)
    expect(report.content).toMatch(/Accessibility: \d+\/100/)

    const fixId = 'fixId' in result ? result.fixId : ''
    const reverted = await engine.revertFix(fixId, { actor: 'human' })
    expect(reverted.status).toBe('reverted')
    expect(el().getAttribute('role')).toBe('buton')
    expect(engine.getSnapshot().appliedFixes).toHaveLength(0)
    expect(engine.exportPatch('diff').fixCount).toBe(0)
  })

  it('rejects apply_fix for a stale or mismatched patch id', () => {
    const patch = engine.proposeFix(share.id, { role: 'button' })
    if ('status' in patch) throw new Error('expected a patch')
    expect(() => engine.requestApply(share.id, 'patch-not-real')).toThrow(/Patch not found/)
    expect(() => engine.requestApply(hero.id, patch.id)).toThrow(/Patch not found/)
  })

  it('honours AbortSignal on a pending approval', async () => {
    const patch = engine.proposeFix(share.id, { role: 'button' })
    if ('status' in patch) throw new Error('expected a patch')
    const controller = new AbortController()
    const p = engine.requestApply(share.id, patch.id, { actor: 'agent', signal: controller.signal })
    await sleep(5)
    controller.abort()
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
    expect(engine.getSnapshot().pendingApproval).toBeNull()
    expect(root.querySelector<HTMLElement>(share.selector)!.getAttribute('role')).toBe('buton')
  })
})
