import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { runAgentStep, type AgentTransport } from './agent'
import { sightlineEngine, type SightlineEngine } from './engine'
import type {
  Activity,
  AuditIssue,
  EngineState,
  FixPatch,
  Impact,
  PackId,
  ProposalInput,
} from './types'
import { registerWebMcp } from './webmcp'

type RailTab = 'issues' | 'trace'
type ExportFormat = 'diff' | 'report'
type IconName =
  | 'check'
  | 'chevron'
  | 'copy'
  | 'export'
  | 'pause'
  | 'play'
  | 'scan'
  | 'undo'
  | 'x'

const TOOL_NAMES = [
  'scan_page',
  'highlight_issue',
  'navigate_node',
  'propose_fix',
  'apply_fix',
  're_scan',
  'revert_fix',
  'export_patch',
]

const STRIDE_ISSUE_ORDER = [
  'image-alt-image-hero',
  'color-contrast-contrast-lede',
  'aria-roles-aria-share',
  'label-label-email',
  'image-alt-image-facebook',
  'image-alt-image-instagram',
  'label-label-distance',
  'color-contrast-contrast-goal',
  'heading-order-heading-donation',
  'heading-order-heading-teams',
  'tabindex-aria-share',
  'tabindex-focus-signup',
  'color-contrast-contrast-newsletter',
  'color-contrast-contrast-footer',
]

const STRIDE_ISSUE_RANK = new Map(
  STRIDE_ISSUE_ORDER.map((id, index) => [id, index]),
)

function sortIssueCatalog(issues: AuditIssue[]): AuditIssue[] {
  return [...issues].sort(
    (left, right) =>
      (STRIDE_ISSUE_RANK.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (STRIDE_ISSUE_RANK.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  )
}

const ISSUE_COPY: Record<
  string,
  { title: string; why: string; wcag: string }
> = {
  'aria-roles-aria-share': {
    title: 'The share control has an invalid role',
    why: 'Assistive technology ignores an unknown role, so the control loses predictable button semantics.',
    wcag: '4.1.2 A',
  },
  'image-alt-image-hero': {
    title: 'The hero photo has no description',
    why: 'A screen reader announces the asset path instead of the purpose of the campaign image.',
    wcag: '1.1.1 A',
  },
  'image-alt-image-facebook': {
    title: 'The Facebook icon has no description',
    why: 'The linked image needs concise alternative text even when the surrounding link already has a visible destination.',
    wcag: '1.1.1 A',
  },
  'image-alt-image-instagram': {
    title: 'The Instagram icon has no description',
    why: 'The linked image needs concise alternative text so its purpose survives without vision.',
    wcag: '1.1.1 A',
  },
  'label-label-distance': {
    title: 'The distance field has no label',
    why: 'Visual text beside a field is not an accessible name unless it is programmatically associated.',
    wcag: '3.3.2 A',
  },
  'label-label-email': {
    title: 'The email field has a hint, not a label',
    why: 'A visual hint can disappear or be missed. A persistent associated label fixes both navigation and comprehension.',
    wcag: '3.3.2 A',
  },
  'color-contrast-contrast-date': {
    title: 'The event date is too pale to read',
    why: 'Rose text on white falls below the minimum contrast required for small text.',
    wcag: '1.4.3 AA',
  },
  'color-contrast-contrast-lede': {
    title: 'The intro text is too pale to read',
    why: 'The current foreground blends into white and makes essential campaign context hard to read.',
    wcag: '1.4.3 AA',
  },
  'color-contrast-contrast-goal': {
    title: 'The goal label misses minimum contrast',
    why: 'The fundraising status must remain legible without relying on the progress bar alone.',
    wcag: '1.4.3 AA',
  },
  'color-contrast-contrast-newsletter': {
    title: 'The newsletter heading is too pale',
    why: 'Small uppercase text needs a darker foreground to remain readable on white.',
    wcag: '1.4.3 AA',
  },
  'color-contrast-contrast-footer': {
    title: 'The footer text is too pale to read',
    why: 'Low-contrast legal and source information becomes unreadable even though it remains important context.',
    wcag: '1.4.3 AA',
  },
  'tabindex-aria-share': {
    title: 'The share control breaks focus order',
    why: 'A positive tabindex pulls focus ahead of controls that appear before it in the document.',
    wcag: '2.4.3 A',
  },
  'tabindex-focus-signup': {
    title: 'The sign-up link jumps the focus order',
    why: 'DOM order should define keyboard navigation; positive tabindex creates a different and surprising route.',
    wcag: '2.4.3 A',
  },
  'heading-order-heading-donation': {
    title: 'The donation heading skips a level',
    why: 'Jumping from the page heading to h4 makes the document outline sound incomplete.',
    wcag: '1.3.1 A',
  },
  'heading-order-heading-teams': {
    title: 'The teams heading skips a level',
    why: 'Heading levels should increase one step at a time so section relationships remain clear.',
    wcag: '1.3.1 A',
  },
}

const IMPACT_LABELS: Record<string, string> = {
  critical: 'critical',
  serious: 'serious',
  moderate: 'moderate',
  minor: 'minor',
  null: 'review',
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    copy: (
      <>
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
    export: (
      <>
        <path d="M12 16V3m0 0L7 8m5-5 5 5" />
        <path d="M5 13v7h14v-7" />
      </>
    ),
    pause: (
      <>
        <path d="M9 7v10M15 7v10" />
      </>
    ),
    play: <path d="m9 7 8 5-8 5V7Z" />,
    scan: (
      <>
        <path d="M4 8V4h4m8 0h4v4m0 8v4h-4M8 20H4v-4" />
        <path d="M7 12h10" />
      </>
    ),
    undo: (
      <>
        <path d="m9 7-5 5 5 5" />
        <path d="M5 12h8a6 6 0 0 1 6 6" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
  }

  return (
    <svg
      aria-hidden="true"
      className="wb-icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  )
}

function SightlineMark() {
  return (
    <span className="wb-sightline-mark">
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <circle cx="8" cy="8" fill="none" r="5.6" />
        <circle cx="8" cy="8" r="1.7" />
      </svg>
    </span>
  )
}

function impactLabel(impact: Impact): string {
  return IMPACT_LABELS[String(impact)] ?? 'review'
}

function traceTool(activity: Activity): string | null {
  const titles: Record<string, string> = {
    'Focused audit complete': 'scan_page',
    'Changes verified': 're_scan',
    'Barrier highlighted': 'highlight_issue',
    'Node inspected': 'navigate_node',
    'Safe patch proposed': 'propose_fix',
    'Human decision required': 'apply_fix',
    'Patch approved': 'apply_fix',
    'Patch declined': 'apply_fix',
    'Fix reverted': 'revert_fix',
    'Patch exported as diff': 'export_patch',
    'Patch exported as report': 'export_patch',
  }
  return titles[activity.title] ?? null
}

function traceResult(activity: Activity): string {
  if (activity.title === 'Human decision required') {
    return 'waiting for human approval · DOM unchanged'
  }
  if (activity.title === 'Patch approved') {
    return 'applied · re-scan requested · undo token stored'
  }
  if (activity.title === 'Patch declined') {
    return 'rejected by human · DOM unchanged'
  }
  return activity.detail
}

function patchLines(patch: FixPatch): Array<{
  sign: '-' | '+'
  text: string
  kind: 'remove' | 'add'
}> {
  const tagName = patch.before.match(/^<([a-z0-9-]+)/i)?.[1] ?? 'element'
  switch (patch.operation.kind) {
    case 'set-attribute': {
      const escaped = patch.operation.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const current =
        patch.before.match(new RegExp(`${escaped}="([^"]*)"`))?.[1] ??
        '(missing)'
      return [
        {
          sign: '-',
          text: `<${tagName} ${patch.operation.name}="${current}">`,
          kind: 'remove',
        },
        {
          sign: '+',
          text: `<${tagName} ${patch.operation.name}="${patch.operation.value}">`,
          kind: 'add',
        },
      ]
    }
    case 'set-style':
      return [
        {
          sign: '-',
          text: `${patch.operation.property}: current value`,
          kind: 'remove',
        },
        {
          sign: '+',
          text: `${patch.operation.property}: ${patch.operation.value}`,
          kind: 'add',
        },
      ]
    case 'insert-label':
      return [
        {
          sign: '-',
          text: `<${tagName}> has no associated label`,
          kind: 'remove',
        },
        {
          sign: '+',
          text: `<label for="${patch.operation.inputId}">${patch.operation.text}</label>`,
          kind: 'add',
        },
      ]
    case 'replace-tag':
      return [
        {
          sign: '-',
          text: `<${tagName}>${patch.summary}</${tagName}>`,
          kind: 'remove',
        },
        {
          sign: '+',
          text: `<${patch.operation.tagName}>${patch.summary}</${patch.operation.tagName}>`,
          kind: 'add',
        },
      ]
    case 'set-attributes': {
      const attrs = Object.entries(patch.operation.attributes)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
      return [
        { sign: '-', text: `<${tagName}>`, kind: 'remove' },
        { sign: '+', text: `<${tagName} ${attrs}>`, kind: 'add' },
      ]
    }
    case 'set-text': {
      const current = patch.before.replace(/<[^>]+>/g, '').trim().slice(0, 60)
      return [
        { sign: '-', text: `<${tagName}>${current || '(empty)'}</${tagName}>`, kind: 'remove' },
        { sign: '+', text: `<${tagName}>${patch.operation.text}</${tagName}>`, kind: 'add' },
      ]
    }
    case 'set-title':
      return [
        { sign: '-', text: '<title> missing', kind: 'remove' },
        { sign: '+', text: `<title>${patch.operation.text}</title>`, kind: 'add' },
      ]
    case 'insert-meta':
      return [
        { sign: '-', text: `<meta name="${patch.operation.name}"> missing`, kind: 'remove' },
        { sign: '+', text: `<meta name="${patch.operation.name}" content="${patch.operation.content}">`, kind: 'add' },
      ]
  }
}

interface AuditCanvasProps {
  engine: SightlineEngine
  issue: AuditIssue | null
  phase: 'highlighted' | 'proposed' | 'pending' | 'verified'
  revision: string
}

function AuditCanvas({
  engine,
  issue,
  phase,
  revision,
}: AuditCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [overlay, setOverlay] = useState<{
    top: number
    left: number
    width: number
    height: number
    calloutTop: number
    calloutLeft: number
  } | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    engine.attachCanvas(root)
    const preventSubmit = (event: Event) => event.preventDefault()
    const preventNavigation = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest('a')
      if (link) event.preventDefault()
    }
    root.addEventListener('submit', preventSubmit)
    root.addEventListener('click', preventNavigation)
    return () => {
      root.removeEventListener('submit', preventSubmit)
      root.removeEventListener('click', preventNavigation)
      engine.detachCanvas(root)
    }
  }, [engine])

  const measure = useCallback(() => {
    const root = rootRef.current
    const viewport = viewportRef.current
    if (!root || !viewport || !issue) {
      setOverlay(null)
      return
    }

    try {
      const target = root.querySelector(issue.selector)
      if (!(target instanceof HTMLElement)) {
        setOverlay(null)
        return
      }
      const targetRect = target.getBoundingClientRect()
      const viewportRect = viewport.getBoundingClientRect()
      const top = targetRect.top - viewportRect.top + viewport.scrollTop
      const left = targetRect.left - viewportRect.left + viewport.scrollLeft
      const calloutWidth = 220
      const calloutLeft = Math.max(
        8,
        Math.min(
          left,
          viewport.scrollLeft + viewport.clientWidth - calloutWidth - 12,
        ),
      )
      const calloutTop =
        top > viewport.scrollTop + 126
          ? top - 112
          : top + targetRect.height + 10

      setOverlay({
        top,
        left,
        width: targetRect.width,
        height: targetRect.height,
        calloutTop,
        calloutLeft,
      })
    } catch {
      setOverlay(null)
    }
  }, [issue])

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(measure)
    return () => window.cancelAnimationFrame(frame)
  }, [measure, revision])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    viewport.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      viewport.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const proposeDone = phase !== 'highlighted'
  const applyStatus =
    phase === 'verified' ? 'verified' : phase === 'pending' ? 'waiting' : 'idle'

  return (
    <div className="wb-canvas-scroll" ref={viewportRef}>
      <div className="wb-preview-wrap">
        <div className="audit-canvas" ref={rootRef} />
      </div>
      <p className="wb-scope-note">
        axe-core covers a subset of WCAG 2.1 AA. Sightline reports what it
        finds and applies only what you approve — it does not certify
        conformance.
      </p>
      {overlay && issue ? (
        <>
          <div
            aria-hidden="true"
            className={`wb-target-outline is-${phase}`}
            style={{
              top: overlay.top,
              left: overlay.left,
              width: overlay.width,
              height: overlay.height,
            }}
          />
          <div
            aria-hidden="true"
            className="wb-node-callout"
            style={{
              top: overlay.calloutTop,
              left: overlay.calloutLeft,
            }}
          >
            <div>
              <strong>{issue.ruleId}</strong>
              <span>{phase === 'verified' ? 'verified' : impactLabel(issue.impact)}</span>
            </div>
            <ol>
              <li className="is-done">
                <span>✓</span>
                highlight_issue
              </li>
              <li className={proposeDone ? 'is-done' : ''}>
                <span>{proposeDone ? '✓' : '·'}</span>
                propose_fix
              </li>
              <li className={applyStatus === 'verified' ? 'is-done' : applyStatus === 'waiting' ? 'is-waiting' : ''}>
                <span>
                  {applyStatus === 'verified'
                    ? '✓'
                    : applyStatus === 'waiting'
                      ? '●'
                      : '·'}
                </span>
                apply_fix
                {applyStatus !== 'idle' ? <em>{applyStatus}</em> : null}
              </li>
            </ol>
          </div>
        </>
      ) : null}
    </div>
  )
}

interface ApprovalDockProps {
  state: EngineState
  onApprove: () => void
  onReject: () => void
}

function ApprovalDock({
  state,
  onApprove,
  onReject,
}: ApprovalDockProps) {
  const patch = state.pendingApproval?.patch
  const dialogRef = useRef<HTMLElement>(null)
  const patchId = patch?.id

  // Modal focus management: move focus into the dialog when it opens, trap
  // Tab inside it, and give focus back to where the person was afterwards.
  useEffect(() => {
    if (!patchId) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const approve = dialog?.querySelector<HTMLButtonElement>('button[data-approve]')
    approve?.focus()
    return () => {
      previous?.focus?.()
    }
  }, [patchId])

  const onDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
      return
    }
    // The single-letter shortcut only fires while focus is inside the dialog,
    // never from a text field elsewhere on the page (audit BOARD-7).
    if (event.key.toLowerCase() === 'a' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault()
      onApprove()
    }
  }

  if (!patch) return null

  return (
    <div className="wb-approval-dock">
      <section
        aria-labelledby="approval-title"
        aria-modal="true"
        onKeyDown={onDialogKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <span className="wb-approval-handle" />
        <div className="wb-approval-meta">
          <strong>Your call</strong>
          <code>
            {patch.selector} · {patch.ruleId}
          </code>
        </div>
        <h2 id="approval-title">{patch.summary}</h2>
        <p>{patch.rationale}</p>
        <div className="wb-inline-diff">
          {patchLines(patch).map((line) => (
            <div className={`is-${line.kind}`} key={line.sign}>
              <span>{line.sign}</span>
              <code>{line.text}</code>
            </div>
          ))}
        </div>
        <footer>
          <span>Nothing changes on the page until you approve.</span>
          <div>
            <button onClick={onReject} type="button">
              Skip <small>Esc</small>
            </button>
            <button data-approve onClick={onApprove} type="button">
              Approve <small>A</small>
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

interface ExportDialogProps {
  state: EngineState
  format: ExportFormat
  copied: boolean
  onClose: () => void
  onCopy: () => void
  onFormat: (format: ExportFormat) => void
}

function ExportDialog({
  state,
  format,
  copied,
  onClose,
  onCopy,
  onFormat,
}: ExportDialogProps) {
  const preview = state.exportPreview
  if (!preview) return null

  return (
    <div className="wb-modal-backdrop">
      <section aria-labelledby="export-title" className="wb-export-dialog" role="dialog">
        <header>
          <h2 id="export-title">Export</h2>
          <div>
            <button
              aria-pressed={format === 'diff'}
              onClick={() => onFormat('diff')}
              type="button"
            >
              Patch
            </button>
            <button
              aria-pressed={format === 'report'}
              onClick={() => onFormat('report')}
              type="button"
            >
              Report
            </button>
          </div>
          <button onClick={onClose} type="button">
            Close
          </button>
        </header>
        <pre>{preview.content}</pre>
        <footer>
          <span>
            {state.appliedFixes.length} approved ·{' '}
            {format === 'diff' ? 'sightline-a11y.patch' : 'sightline-report.md'}
          </span>
          <button onClick={onCopy} type="button">
            <Icon name={copied ? 'check' : 'copy'} size={16} />
            {copied ? 'Copied' : format === 'diff' ? 'Copy patch' : 'Copy report'}
          </button>
        </footer>
      </section>
    </div>
  )
}

function App() {
  const state = useSyncExternalStore(
    sightlineEngine.subscribe,
    sightlineEngine.getSnapshot,
    sightlineEngine.getSnapshot,
  )
  const [railTab, setRailTab] = useState<RailTab>('issues')
  const [packFilter, setPackFilter] = useState<PackId | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<AuditIssue[]>([])
  const [guided, setGuided] = useState(false)
  // True once the bundled agent has run in this session; distinguishes a paused
  // bundled demo from an external agent driving the page through WebMCP.
  const bundledStarted = useRef(false)
  const [agentTransport, setAgentTransport] = useState<AgentTransport | null>(null)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('diff')
  const [copied, setCopied] = useState(false)
  const sourceRef = useRef(state.sourceName)
  const guidedTimerRef = useRef<number | null>(null)

  useEffect(() => registerWebMcp(sightlineEngine), [])

  useEffect(() => {
    if (sourceRef.current !== state.sourceName) {
      sourceRef.current = state.sourceName
      setCatalog(sortIssueCatalog(state.issues))
      setSelectedId(null)
      return
    }

    if (!state.issues.length) return
    setCatalog((current) => {
      const byId = new Map(current.map((issue) => [issue.id, issue]))
      state.issues.forEach((issue) => byId.set(issue.id, issue))
      return sortIssueCatalog([...byId.values()])
    })
  }, [state.issues, state.sourceName])

  useEffect(() => {
    if (state.activities[0]?.title === 'Barrier highlighted') {
      setSelectedId(state.selectedIssueId)
    }
  }, [state.activities, state.selectedIssueId])

  useEffect(() => {
    if (state.proposal) setSelectedId(state.proposal.issueId)
  }, [state.proposal])

  useEffect(() => {
    if (!state.pendingApproval) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setGuided(false)
        sightlineEngine.rejectPending()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(
    () => () => {
      if (guidedTimerRef.current !== null) {
        window.clearTimeout(guidedTimerRef.current)
      }
    },
    [],
  )

  const fixedByIssue = useMemo(
    () =>
      new Map(
        state.appliedFixes.map((fix) => [fix.patch.issueId, fix]),
      ),
    [state.appliedFixes],
  )

  const selectedIssue =
    catalog.find((issue) => issue.id === selectedId) ?? null
  const selectedFixed = selectedId ? fixedByIssue.has(selectedId) : false

  const trace = useMemo(
    () =>
      [...state.activities]
        .reverse()
        .map((activity) => ({
          activity,
          tool: traceTool(activity),
        }))
        .filter(
          (entry): entry is { activity: Activity; tool: string } =>
            Boolean(entry.tool),
        ),
    [state.activities],
  )

  const totalIssues = Math.max(catalog.length, state.issues.length)
  const fixedCount = state.appliedFixes.length
  const openCount = state.issues.length

  const packStats = sightlineEngine.packs.map((pack) => {
    const total = catalog.filter((i) => i.packId === pack.id).length
    const open = state.issues.filter((i) => i.packId === pack.id).length
    return { id: pack.id, label: pack.label, total, open, score: Math.max(0, 100 - open * 2) }
  })
  const visibleCatalog =
    packFilter === 'all' ? catalog : catalog.filter((i) => i.packId === packFilter)
  const revision = [
    state.scanCount,
    selectedId,
    state.proposal?.id,
    state.pendingApproval?.patch.id,
    fixedCount,
  ].join(':')

  const phase: 'highlighted' | 'proposed' | 'pending' | 'verified' =
    selectedFixed
      ? 'verified'
      : state.pendingApproval?.patch.issueId === selectedId
        ? 'pending'
        : state.proposal?.issueId === selectedId
          ? 'proposed'
          : 'highlighted'

  const copyFor = (issue: AuditIssue) =>
    ISSUE_COPY[issue.id] ?? {
      title: issue.title,
      why: issue.failureSummary,
      wcag: issue.wcagTags[0]?.toUpperCase() ?? 'WCAG',
    }

  const selectIssue = (issue: AuditIssue) => {
    if (selectedId === issue.id) {
      setSelectedId(null)
      return
    }
    setSelectedId(issue.id)
    const current = state.issues.find((candidate) => candidate.id === issue.id)
    if (current) {
      sightlineEngine.highlightIssue(current.id, { actor: 'human' })
    }
  }

  const proposeIssue = (issue: AuditIssue) => {
    const current = state.issues.find((candidate) => candidate.id === issue.id)
    if (!current || state.pendingApproval) return
    let result = sightlineEngine.proposeFix(current.id, {}, { actor: 'human' })
    if ('status' in result) {
      // Manual path: the person authors the content the engine refuses to invent.
      const answer = window.prompt(result.guidance)
      if (answer === null) return
      const field = result.requiredField
      const input: ProposalInput =
        field === 'headingLevel'
          ? { headingLevel: Number(answer) }
          : { [field]: answer }
      try {
        result = sightlineEngine.proposeFix(current.id, input, { actor: 'human' })
      } catch (error) {
        window.alert(error instanceof Error ? error.message : String(error))
        return
      }
      if ('status' in result) return
    }
    void sightlineEngine
      .requestApply(current.id, result.id, { actor: 'human' })
      .catch(() => undefined)
  }

  const stageNextGuidedIssue = useCallback(() => {
    const snapshot = sightlineEngine.getSnapshot()
    if (snapshot.pendingApproval || !snapshot.issues.length) {
      if (!snapshot.issues.length) {
        setGuided(false)
        setRailTab('trace')
      }
      return
    }
    const issue = snapshot.issues[0]
    setSelectedId(issue.id)
    void runAgentStep(sightlineEngine, issue.id, () => undefined)
      .then((step) => setAgentTransport(step.transport))
      .catch((error: unknown) => {
        setGuided(false)
        sightlineEngine.noteAgentError(
          error instanceof Error ? error.message : String(error),
        )
      })
  }, [])

  const startGuidedDemo = async () => {
    if (state.pendingApproval) return
    if (state.score === 100 || !state.issues.length) {
      setCatalog([])
      setSelectedId(null)
      sightlineEngine.resetDemo()
      await sightlineEngine.scanPage(
        { wcagLevel: 'AA' },
        { actor: 'agent', silent: true },
      )
    } else if (state.score === null) {
      await sightlineEngine.scanPage(
        { wcagLevel: 'AA' },
        { actor: 'agent' },
      )
    }
    bundledStarted.current = true
    setGuided(true)
    setRailTab('issues')
    stageNextGuidedIssue()
  }

  async function handleApprove() {
    await sightlineEngine.approvePending()
    if (guided) {
      guidedTimerRef.current = window.setTimeout(
        stageNextGuidedIssue,
        420,
      )
    }
  }

  const handleReject = () => {
    setGuided(false)
    sightlineEngine.rejectPending()
  }

  const reset = () => {
    bundledStarted.current = false
    setGuided(false)
    setSelectedId(null)
    setCatalog([])
    setRailTab('issues')
    sightlineEngine.resetDemo()
  }

  const undoLast = () => {
    const last = state.appliedFixes.at(-1)
    if (!last) return
    setGuided(false)
    void sightlineEngine.revertFix(last.id, { actor: 'human' })
  }

  const openExport = (format: ExportFormat) => {
    setExportFormat(format)
    setCopied(false)
    sightlineEngine.exportPatch(format, { actor: 'human' })
  }

  const closeExport = () => {
    sightlineEngine.dismissExport()
    setCopied(false)
  }

  const copyExport = async () => {
    if (!state.exportPreview) return
    await navigator.clipboard.writeText(state.exportPreview.content)
    setCopied(true)
  }

  const status = state.pendingApproval
    ? {
        title: 'Your turn',
        body: 'The agent wrote a change and stopped. Read it below the page, then approve or skip.',
        tone: 'is-human',
      }
    : guided
      ? {
          title: 'Agent is working',
          body: 'Reading the page through its declared tools. It will pause before changing anything.',
          tone: 'is-agent',
        }
      : fixedCount === totalIssues && totalIssues > 0
        ? {
            title: `All ${totalIssues} fixed`,
            body: 'Every change was approved by you. Export the patch or report from the top bar.',
            tone: 'is-complete',
          }
        : trace.length &&
            !bundledStarted.current &&
            state.activities.some((activity) => activity.actor === 'agent')
          ? {
              title: 'Agent is working',
              body: 'An agent is driving this page through its WebMCP tools. It pauses before changing anything.',
              tone: 'is-agent',
            }
          : trace.length
          ? {
              title: 'Paused',
              body: 'Pick up where you left off, or open an issue below to review it on its own.',
              tone: 'is-paused',
            }
          : {
              title: `${totalIssues} things hold this page back`,
              body: `${packStats.map((p) => `${p.open} ${p.label.toLowerCase()}`).join(' · ')}. The agent finds each one and drafts the fix. You decide what ships.`,
              tone: 'is-ready',
            }

  const playLabel =
    fixedCount === totalIssues && totalIssues > 0
      ? 'Run it again'
      : guided
        ? 'Pause'
        : trace.length
          ? 'Resume the demo'
          : 'Watch the agent work'

  return (
    <div className="wb-app">
      <header className="wb-header">
        <div className="wb-header__brand">
          <SightlineMark />
          <strong>Sightline</strong>
        </div>
        <code>{state.sourceName}</code>
        <span className="wb-header__tool-count">
          {state.webMcp.available
            ? `${state.webMcp.registeredTools.length} WebMCP tools live`
            : `${TOOL_NAMES.length} WebMCP tools · preview mode`}
          {agentTransport ? ` · agent via ${agentTransport === 'webmcp' ? 'WebMCP' : 'direct fallback'}` : ''}
        </span>
        <button
          className="wb-header__export"
          onClick={() => openExport(exportFormat)}
          type="button"
        >
          Export
        </button>
      </header>

      <div className="wb-workbench">
        <section className="wb-stage" aria-label="Live page canvas">
          <AuditCanvas
            engine={sightlineEngine}
            issue={selectedIssue}
            phase={phase}
            revision={revision}
          />

          <ApprovalDock
            onApprove={() => {
              void handleApprove()
            }}
            onReject={handleReject}
            state={state}
          />
        </section>

        <aside className="wb-rail" aria-label="Contextual workbench rail">
          <div className={`wb-rail-status ${status.tone}`}>
            <div>
              <span />
              <h1>{status.title}</h1>
            </div>
            <p>{status.body}</p>
            <div className="wb-progress-copy">
              <strong>{fixedCount} of {totalIssues} fixed</strong>
              <span>{openCount ? `${openCount} to go` : 'nothing left'}</span>
            </div>
            <div className="wb-progress-track">
              <span style={{ transform: `scaleX(${totalIssues ? fixedCount / totalIssues : 0})` }} />
            </div>
            {!state.pendingApproval ? (
              <button
                className={guided ? 'is-paused' : ''}
                onClick={() => {
                  if (guided) setGuided(false)
                  else void startGuidedDemo()
                }}
                type="button"
              >
                {playLabel}
              </button>
            ) : null}
          </div>

          <div className="wb-rail-tabs-wrap">
            <div className="wb-rail-tabs" role="tablist">
              <button
                aria-selected={railTab === 'issues'}
                onClick={() => setRailTab('issues')}
                role="tab"
                type="button"
              >
                Issues {openCount ? `· ${openCount}` : ''}
              </button>
              <button
                aria-selected={railTab === 'trace'}
                onClick={() => setRailTab('trace')}
                role="tab"
                type="button"
              >
                Agent log {trace.length ? `· ${trace.length}` : ''}
              </button>
            </div>
          </div>

          {railTab === 'issues' ? (
            <div
              aria-label="Page issues"
              className="wb-rail-content wb-issues"
              tabIndex={0}
            >
              <div className="wb-pack-chips" role="group" aria-label="Filter by rule pack">
                <button
                  aria-pressed={packFilter === 'all'}
                  onClick={() => setPackFilter('all')}
                  type="button"
                >
                  All <span>{openCount}</span>
                </button>
                {packStats.map((pack) => (
                  <button
                    aria-pressed={packFilter === pack.id}
                    className={pack.open === 0 && pack.total > 0 ? 'is-clear' : ''}
                    key={pack.id}
                    onClick={() => setPackFilter(pack.id)}
                    type="button"
                  >
                    {pack.label} <span>{pack.open}</span>
                  </button>
                ))}
              </div>
              <ol className="wb-issue-card">
                {visibleCatalog.map((issue, index) => {
                  const copy = copyFor(issue)
                  const fixed = fixedByIssue.has(issue.id)
                  const current = state.issues.some(
                    (candidate) => candidate.id === issue.id,
                  )
                  const open = selectedId === issue.id
                  const pending =
                    state.pendingApproval?.patch.issueId === issue.id
                  const patch =
                    state.proposal?.issueId === issue.id
                      ? state.proposal
                      : fixedByIssue.get(issue.id)?.patch ?? null
                  const rowStyle = {
                    '--impact-color': fixed
                      ? '#0F8E86'
                      : pending
                        ? '#E8467F'
                        : issue.impact === 'moderate'
                          ? '#8A5712'
                          : issue.impact === 'minor'
                            ? '#6B3FA0'
                            : '#C82C63',
                  } as CSSProperties

                  return (
                    <li
                      className={`${open ? 'is-open' : ''}${fixed ? ' is-fixed' : ''}`}
                      key={issue.id}
                      style={rowStyle}
                    >
                      <button
                        className="wb-issue-row"
                        onClick={() => selectIssue(issue)}
                        type="button"
                      >
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <span>
                          <strong>{copy.title}</strong>
                          <small>
                            {issue.ruleId} · {impactLabel(issue.impact)}
                          </small>
                        </span>
                        <em className={fixed ? 'is-fixed' : pending ? 'is-human' : ''}>
                          {fixed ? 'Fixed' : pending ? 'Your turn' : ''}
                          <Icon name="chevron" size={13} />
                        </em>
                      </button>

                      {open ? (
                        <div className="wb-issue-detail">
                          <p>{copy.why}</p>
                          <code>
                            {issue.selector} · WCAG {copy.wcag}
                          </code>
                          {patch ? (
                            <div className="wb-issue-diff">
                              {patchLines(patch).map((line) => (
                                <div className={`is-${line.kind}`} key={line.sign}>
                                  <span>{line.sign}</span>
                                  <code>{line.text}</code>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          <button
                            className={
                              fixed
                                ? 'is-verified'
                                : pending
                                  ? 'is-pending'
                                  : ''
                            }
                            disabled={!current || fixed || pending}
                            onClick={() => proposeIssue(issue)}
                            type="button"
                          >
                            {fixed
                              ? 'Verified'
                              : pending
                              ? 'Waiting on you'
                              : 'Draft a fix'}
                          </button>
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            </div>
          ) : (
            <div
              aria-label="WebMCP tool trace"
              className="wb-rail-content wb-trace"
              tabIndex={0}
            >
              <div className="wb-trace-card">
                <p>
                  Every step below is a declared WebMCP tool call. Reads run
                  freely; anything that changes the page stops for you.
                </p>
                <div>
                  {!trace.length ? (
                    <div className="wb-tool-list">
                      {TOOL_NAMES.map((tool) => (
                        <span key={tool}>{tool}</span>
                      ))}
                    </div>
                  ) : (
                    <ol>
                      {trace.map(({ activity, tool }) => (
                        <li
                          className={
                            activity.title === 'Patch approved' ||
                            activity.title === 'Changes verified'
                              ? 'is-success'
                              : activity.title === 'Human decision required'
                                ? 'is-pending'
                                : ''
                          }
                          key={activity.id}
                        >
                          <div>
                            <span>
                              {activity.actor === 'human' ? 'You' : 'Agent'}
                            </span>
                            <strong>sightline.{tool}</strong>
                          </div>
                          <code>{activity.detail}</code>
                          <p>{traceResult(activity)}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </div>
          )}

          <footer className="wb-rail-actions">
            <button disabled={!fixedCount} onClick={undoLast} type="button">
              Undo last
            </button>
            <button onClick={reset} type="button">
              Start over
            </button>
          </footer>
        </aside>
      </div>

      <ExportDialog
        copied={copied}
        format={exportFormat}
        onClose={closeExport}
        onCopy={() => {
          void copyExport()
        }}
        onFormat={openExport}
        state={state}
      />
    </div>
  )
}

export default App
