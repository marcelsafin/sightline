import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SightlineEngine } from '../engine'
import type { AuditIssue, FixPatch } from '../types'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function issue(id: string, selector: string): AuditIssue {
  return {
    id,
    packId: 'accessibility',
    ruleId: 'aria-roles',
    title: 't',
    description: 'd',
    helpUrl: '',
    impact: 'critical',
    selector,
    html: '',
    failureSummary: '',
    wcagTags: [],
  }
}
function patch(id: string, iss: AuditIssue, name: string, value: string): FixPatch {
  return {
    id,
    issueId: iss.id,
    ruleId: iss.ruleId,
    selector: iss.selector,
    summary: `set ${name}`,
    rationale: '',
    evidence: ['test'],
    authoredBy: 'engine',
    before: '',
    after: '',
    operation: { kind: 'set-attribute', name, value },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Internals = { state: any; root: HTMLElement | null; performScan: unknown; approvalResolver: unknown }

describe('approval state machine (constitution I)', () => {
  let engine: SightlineEngine
  let root: HTMLElement
  let internals: Internals
  const A = issue('A', '[data-sightline-key="aria-share"]')
  const B = issue('B', '[data-sightline-key="image-hero"]')

  beforeEach(() => {
    engine = new SightlineEngine()
    internals = engine as unknown as Internals
    // Replace the axe-backed scan with a slow synthetic one so the re-scan window is observable.
    internals.performScan = async () => {
      await sleep(60)
      return { source: 't', wcagLevel: 'AA', score: 100, issueCount: 0, packs: [], issues: [], suggestedNextIssue: null }
    }
    root = document.createElement('div')
    document.body.append(root)
    engine.attachCanvas(root)
    internals.state = { ...engine.getSnapshot(), issues: [A, B] }
  })
  afterEach(() => root.remove())

  it('apply_fix resolves only after a human approves, and the DOM changes only then', async () => {
    internals.state = { ...engine.getSnapshot(), proposal: patch('pA', A, 'role', 'button') }
    const el = root.querySelector(A.selector)!
    const p = engine.requestApply('A', 'pA', { actor: 'agent' })
    await sleep(20)
    expect(el.getAttribute('role')).toBe('buton')
    expect(engine.getSnapshot().pendingApproval?.patch.id).toBe('pA')
    await engine.approvePending()
    expect(el.getAttribute('role')).toBe('button')
    await expect(p).resolves.toMatchObject({ status: 'applied', score: 100 })
  })

  it('rejecting leaves the DOM untouched and resolves with rejected', async () => {
    internals.state = { ...engine.getSnapshot(), proposal: patch('pA', A, 'role', 'button') }
    const p = engine.requestApply('A', 'pA', { actor: 'agent' })
    engine.rejectPending()
    await expect(p).resolves.toMatchObject({ status: 'rejected' })
    expect(root.querySelector(A.selector)!.getAttribute('role')).toBe('buton')
  })

  it('a second apply_fix during the post-approval re-scan is not orphaned (CTO-2 race)', async () => {
    internals.state = { ...engine.getSnapshot(), proposal: patch('pA', A, 'role', 'button') }
    const p1 = engine.requestApply('A', 'pA', { actor: 'agent' })
    const approving = engine.approvePending() // applies synchronously, then awaits the 60 ms re-scan
    await sleep(5)
    // Concurrent agent: new proposal + apply_fix while the first approval is still re-scanning.
    internals.state = { ...engine.getSnapshot(), proposal: patch('pB', B, 'alt', 'Stride for Life illustration') }
    const p2 = engine.requestApply('B', 'pB', { actor: 'agent' })
    await approving
    await expect(p1).resolves.toMatchObject({ status: 'applied' })
    // The human decides on B. Before the fix this resolver had been wiped and p2 hung forever.
    expect(engine.getSnapshot().pendingApproval?.patch.id).toBe('pB')
    engine.rejectPending()
    const settled = await Promise.race([p2.then(() => 'settled'), sleep(400).then(() => 'hung')])
    expect(settled).toBe('settled')
    await expect(p2).resolves.toMatchObject({ status: 'rejected' })
  })

  it('applyOperation has exactly two call sites: approval and replay of approved history', () => {
    const src = readFileSync(path.resolve(process.cwd(), 'src/engine.ts'), 'utf8')
    const calls = src.match(/this\.applyOperation\(/g) ?? []
    expect(calls).toHaveLength(2)
  })
})
