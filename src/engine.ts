import { DEMO_HTML, DEMO_NAME } from './demo'
import { accessibilityPack } from './packs/accessibility'
import { performancePack } from './packs/performance'
import { seoPack } from './packs/seo'
import { nearbyText } from './packs/shared'
import type { AuditPack, ScanContext } from './packs/types'
import { shortHash, slug } from './packs/util'
import type {
  Activity,
  ActivityActor,
  AppliedFix,
  AuditIssue,
  EngineState,
  ExportPreview,
  FixPatch,
  PackId,
  PatchOperation,
  ProposalInput,
  ProposalNeedsInput,
  ScanInput,
  WcagLevel,
  WebMcpState,
} from './types'

interface InvocationContext {
  actor?: ActivityActor
  signal?: AbortSignal
  silent?: boolean
}

interface ApprovalResolver {
  resolve: (value: ApplyResult) => void
  reject: (reason?: unknown) => void
  signal?: AbortSignal
  abortHandler?: () => void
}

interface PackSummary {
  id: PackId
  label: string
  issueCount: number
  score: number
}

interface ScanResult {
  source: string
  wcagLevel: WcagLevel
  score: number
  issueCount: number
  packs: PackSummary[]
  issues: Array<{
    id: string
    pack: PackId
    rule: string
    impact: AuditIssue['impact']
    summary: string
    selector: string
  }>
  suggestedNextIssue: string | null
}

interface ApplyResult {
  status: 'applied' | 'rejected'
  fixId?: string
  summary: string
  score?: number
  remainingIssues?: number
}

const initialWebMcpState: WebMcpState = {
  available: false,
  registering: false,
  registeredTools: [],
  error: null,
}

function createInitialState(): EngineState {
  return {
    status: 'idle',
    sourceName: DEMO_NAME,
    issues: [],
    score: null,
    scanCount: 0,
    lastScanAt: null,
    selectedIssueId: null,
    proposal: null,
    pendingApproval: null,
    appliedFixes: [],
    activities: [
      {
        id: 'activity-0',
        actor: 'system',
        title: 'Shared workspace ready',
        detail: 'Connect a browser agent or run the focused audit yourself.',
        timestamp: Date.now(),
      },
    ],
    exportPreview: null,
    webMcp: initialWebMcpState,
    error: null,
  }
}

function abortError(): DOMException {
  return new DOMException('Tool execution was cancelled.', 'AbortError')
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw abortError()
  }
}

function selectorFromAuditTarget(
  auditRoot: HTMLElement,
  rawSelector: string,
): string {
  try {
    const auditElement = auditRoot.querySelector(rawSelector)
    const key = auditElement?.getAttribute('data-sightline-key')
    if (key) return `[data-sightline-key="${key}"]`
  } catch {
    // Fall through to the raw selector when axe returns a non-CSS target.
  }
  return rawSelector
}

function cloneWithTag(element: HTMLElement, tagName: string): HTMLElement {
  const replacement = document.createElement(tagName)
  for (const attribute of [...element.attributes]) {
    replacement.setAttribute(attribute.name, attribute.value)
  }
  replacement.innerHTML = element.innerHTML
  return replacement
}

function previewOperation(
  element: HTMLElement,
  operation: PatchOperation,
): string {
  const clone = element.cloneNode(true) as HTMLElement

  switch (operation.kind) {
    case 'set-attribute':
      clone.setAttribute(operation.name, operation.value)
      return clone.outerHTML
    case 'set-attributes':
      Object.entries(operation.attributes).forEach(([k, v]) => clone.setAttribute(k, v))
      return clone.outerHTML
    case 'set-style':
      clone.style.setProperty(operation.property, operation.value)
      return clone.outerHTML
    case 'insert-label': {
      clone.id = operation.inputId
      const label = document.createElement('label')
      label.className = 'sightline-generated-label'
      label.htmlFor = operation.inputId
      label.textContent = operation.text
      return `${label.outerHTML}\n${clone.outerHTML}`
    }
    case 'replace-tag':
      return cloneWithTag(clone, operation.tagName).outerHTML
    case 'set-text':
      clone.textContent = operation.text
      return clone.outerHTML
    case 'insert-meta':
      return `<meta name="${operation.name}" content="${operation.content.replace(/"/g, '&quot;')}">\n${clone.outerHTML}`
    case 'set-title':
      return `<title>${operation.text}</title>`
  }
}

// axe-core (~560 KB) is only needed inside the audit frame. Load it on first
// scan instead of shipping it in the initial bundle.
let axeSourcePromise: Promise<string> | null = null
function loadAxeSource(): Promise<string> {
  axeSourcePromise ??= import('axe-core/axe.min.js?raw').then((m) => m.default)
  return axeSourcePromise
}

function mountAuditSurface(root: HTMLElement, axeSource: string): {
  auditRoot: HTMLElement
  cleanup: () => void
} {
  const frame = document.createElement('iframe')
  Object.assign(frame.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '900px',
    height: '1600px',
    zIndex: '-2147483647',
    pointerEvents: 'none',
    border: '0',
  })
  document.body.append(frame)

  const frameDocument = frame.contentDocument
  if (!frameDocument) {
    frame.remove()
    throw new Error('Could not create the isolated audit surface.')
  }

  const cssText = [...document.styleSheets]
    .map((sheet) => {
      try {
        return [...sheet.cssRules].map((rule) => rule.cssText).join('\n')
      } catch {
        return ''
      }
    })
    .join('\n')

  frameDocument.open()
  frameDocument.write('<!doctype html><html><head></head><body></body></html>')
  frameDocument.close()

  const base = frameDocument.createElement('base')
  base.href = document.baseURI
  const style = frameDocument.createElement('style')
  style.textContent = cssText
  const script = frameDocument.createElement('script')
  script.textContent = axeSource
  frameDocument.head.append(base, style, script)

  const auditRoot = root.cloneNode(true) as HTMLElement
  auditRoot.setAttribute('data-sightline-audit-root', '')
  Object.assign(frameDocument.body.style, {
    margin: '0',
    width: '900px',
    minHeight: '1600px',
    background: '#ffffff',
  })
  frameDocument.body.append(auditRoot)
  return {
    auditRoot,
    cleanup: () => frame.remove(),
  }
}

export class SightlineEngine {
  /** Rule packs, in display order. Accessibility first: it is the origin story. */
  readonly packs: readonly AuditPack[] = [accessibilityPack, seoPack, performancePack]
  private state = createInitialState()
  private readonly listeners = new Set<() => void>()
  private root: HTMLElement | null = null
  private baseHtml = DEMO_HTML
  private activitySequence = 0
  private fixSequence = 0
  private approvalResolver: ApprovalResolver | null = null
  private approvalTimer: number | null = null
  private scanQueue: Promise<unknown> = Promise.resolve()

  readonly getSnapshot = (): EngineState => this.state

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  attachCanvas(root: HTMLElement): void {
    this.root = root
    this.root.innerHTML = this.baseHtml
    window.setTimeout(() => {
      void this.scanPage(
        { wcagLevel: 'AA' },
        { actor: 'system', silent: true },
      )
    }, 80)
  }

  detachCanvas(root: HTMLElement): void {
    if (this.root === root) {
      this.root = null
    }
  }

  setWebMcpState(next: Partial<WebMcpState>): void {
    this.update({
      webMcp: {
        ...this.state.webMcp,
        ...next,
      },
    })
  }

  loadHtml(html: string, sourceName: string): void {
    this.cancelPendingApproval('The page source changed.')
    this.baseHtml = html
    if (this.root) {
      this.root.innerHTML = html
    }
    const webMcp = this.state.webMcp
    this.state = {
      ...createInitialState(),
      sourceName,
      webMcp,
      activities: [],
    }
    this.log(
      'human',
      'New page loaded',
      `${sourceName} is ready for a focused audit.`,
    )
    void this.scanPage(
      { wcagLevel: 'AA' },
      { actor: 'system', silent: true },
    )
  }

  resetDemo(): void {
    this.loadHtml(DEMO_HTML, DEMO_NAME)
  }

  scanPage(
    input: ScanInput = {},
    context: InvocationContext = {},
  ): Promise<ScanResult> {
    const run = this.scanQueue.then(
      () => this.performScan(input, context),
      () => this.performScan(input, context),
    )
    this.scanQueue = run.catch(() => undefined)
    return run
  }

  private async performScan(
    input: ScanInput,
    context: InvocationContext,
  ): Promise<ScanResult> {
    throwIfAborted(context.signal)
    const root = this.requireRoot()
    const wcagLevel = input.wcagLevel ?? 'AA'
    const auditSurface = mountAuditSurface(root, await loadAxeSource())

    this.update({ status: 'scanning', error: null })

    try {
      const wanted = new Set<PackId>(
        input.packs?.length ? input.packs : this.packs.map((pack) => pack.id),
      )
      const ctx: ScanContext = {
        auditRoot: auditSurface.auditRoot,
        stableSelector: (raw) =>
          selectorFromAuditTarget(auditSurface.auditRoot, raw),
        findElement: (selector) => this.findElement(selector),
      }

      const issues: AuditIssue[] = []
      for (const pack of this.packs) {
        if (!wanted.has(pack.id)) continue
        throwIfAborted(context.signal)
        issues.push(...(await pack.scan(ctx)))
      }
      throwIfAborted(context.signal)

      const score = Math.max(0, 100 - issues.length * 2)
      const selectedIssueId = issues.some(
        (issue) => issue.id === this.state.selectedIssueId,
      )
        ? this.state.selectedIssueId
        : issues[0]?.id ?? null
      const proposal = issues.some(
        (issue) => issue.id === this.state.proposal?.issueId,
      )
        ? this.state.proposal
        : null

      this.update({
        status: 'ready',
        issues,
        score,
        scanCount: this.state.scanCount + 1,
        lastScanAt: Date.now(),
        selectedIssueId,
        proposal,
        error: null,
      })

      if (!context.silent) {
        this.log(
          context.actor ?? 'agent',
          input.scope === 'changed' ? 'Changes verified' : 'Focused audit complete',
          issues.length
            ? `${issues.length} barriers remain. Sightline score: ${score}.`
            : 'No barriers remain in the focused rule set. Score: 100.',
        )
      }

      const packs: PackSummary[] = this.packs.map((pack) => {
        const count = issues.filter((issue) => issue.packId === pack.id).length
        return {
          id: pack.id,
          label: pack.label,
          issueCount: count,
          score: Math.max(0, 100 - count * 2),
        }
      })

      return {
        source: this.state.sourceName,
        wcagLevel,
        score,
        issueCount: issues.length,
        packs,
        issues: issues.map((issue) => ({
          id: issue.id,
          pack: issue.packId,
          rule: issue.ruleId,
          impact: issue.impact,
          summary: issue.title,
          selector: issue.selector,
        })),
        suggestedNextIssue: issues[0]?.id ?? null,
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        this.update({ status: 'ready' })
        throw error
      }
      const message =
        error instanceof Error ? error.message : 'The audit could not run.'
      this.update({ status: 'error', error: message })
      this.log('system', 'Audit interrupted', message)
      throw error
    } finally {
      auditSurface.cleanup()
    }
  }

  highlightIssue(
    issueId: string,
    context: InvocationContext = {},
  ): {
    issueId: string
    selector: string
    summary: string
    impact: AuditIssue['impact']
  } {
    throwIfAborted(context.signal)
    const issue = this.requireIssue(issueId)
    const element = this.requireElement(issue.selector)
    element.scrollIntoView({
      behavior: context.actor === 'human' ? 'smooth' : 'auto',
      block: 'center',
      inline: 'center',
    })
    this.update({ selectedIssueId: issue.id })
    this.log(
      context.actor ?? 'agent',
      'Barrier highlighted',
      `${issue.title} · ${issue.selector}`,
    )
    return {
      issueId: issue.id,
      selector: issue.selector,
      summary: issue.title,
      impact: issue.impact,
    }
  }

  navigateNode(
    selector: string,
    context: InvocationContext = {},
  ): {
    selector: string
    html: string
    text: string
  } {
    throwIfAborted(context.signal)
    if (!selector.trim()) {
      throw new Error('selector is required.')
    }
    const element = this.requireElement(selector)
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const matchingIssue = this.state.issues.find(
      (issue) => issue.selector === selector,
    )
    this.update({ selectedIssueId: matchingIssue?.id ?? null })
    this.log(
      context.actor ?? 'agent',
      'Node inspected',
      selector,
    )
    return {
      selector,
      html: element.outerHTML.slice(0, 2_000),
      text: (element.textContent || '').trim().slice(0, 500),
    }
  }

  proposeFix(
    issueId: string,
    input: ProposalInput = {},
    context: InvocationContext = {},
  ): FixPatch | ProposalNeedsInput {
    throwIfAborted(context.signal)
    const issue = this.requireIssue(issueId)
    const element = this.requireElement(issue.selector)
    const pack = this.packs.find((candidate) => candidate.id === issue.packId)
    const fixer = pack?.fixers[issue.ruleId]
    if (!fixer) {
      throw new Error(`Sightline has no safe fixer for ${issue.ruleId}.`)
    }
    const outcome = fixer(issue, element, { root: this.requireRoot(), input })

    if (outcome.kind === 'needs_input') {
      this.update({ selectedIssueId: issue.id })
      this.log(
        context.actor ?? 'agent',
        'Agent input required',
        `${issue.ruleId}: engine will not invent ${outcome.requiredField}; waiting for the agent to author it.`,
      )
      return {
        status: 'needs_input',
        issueId: issue.id,
        ruleId: issue.ruleId,
        requiredField: outcome.requiredField,
        guidance: outcome.guidance,
        context: {
          selector: issue.selector,
          html: element.outerHTML.slice(0, 600),
          nearbyText: nearbyText(element),
        },
      }
    }

    const { definition } = outcome
    const operation = definition.operation
    const patch: FixPatch = {
      ...definition,
      id: `patch-${slug(issue.id)}-${shortHash(JSON.stringify(operation))}`,
      issueId: issue.id,
      selector: issue.selector,
      before: element.outerHTML,
      after: previewOperation(element, operation),
      operation,
    }

    this.update({
      proposal: patch,
      selectedIssueId: issue.id,
      exportPreview: null,
    })
    this.log(
      context.actor ?? 'agent',
      'Safe patch proposed',
      `${patch.summary} · ${patch.evidence.join(' · ')}`,
    )
    return patch
  }

  requestApply(
    issueId: string,
    patchId: string,
    context: InvocationContext = {},
  ): Promise<ApplyResult> {
    throwIfAborted(context.signal)
    if (this.state.pendingApproval) {
      throw new Error('Another patch is already waiting for human approval.')
    }

    const issue = this.requireIssue(issueId)
    const patch = this.state.proposal
    if (
      !patch ||
      patch.id !== patchId ||
      patch.issueId !== issue.id
    ) {
      throw new Error(
        'Patch not found. Call propose_fix for this issue before apply_fix.',
      )
    }

    this.update({
      pendingApproval: {
        patch,
        requestedAt: Date.now(),
        requestedBy: context.actor ?? 'agent',
      },
    })
    this.log(
      context.actor ?? 'agent',
      'Human decision required',
      `${patch.summary} is staged in the shared approval dialog.`,
    )

    return new Promise<ApplyResult>((resolve, reject) => {
      const abortHandler = () => {
        if (this.approvalResolver?.resolve !== resolve) return
        this.update({ pendingApproval: null })
        this.log(
          'system',
          'Approval request canceled',
          'The calling agent ended this tool execution.',
        )
        this.clearApprovalResolver()
        reject(abortError())
      }
      if (context.signal) {
        context.signal.addEventListener('abort', abortHandler, { once: true })
      }
      this.approvalResolver = {
        resolve,
        reject,
        signal: context.signal,
        abortHandler,
      }
      this.approvalTimer = window.setTimeout(() => {
        if (this.approvalResolver?.resolve !== resolve) return
        this.update({ pendingApproval: null })
        this.log(
          'system',
          'Approval request expired',
          'No page change was made. The agent can propose the patch again.',
        )
        this.clearApprovalResolver()
        reject(
          new DOMException(
            'Human approval timed out after two minutes.',
            'TimeoutError',
          ),
        )
      }, 120_000)
    })
  }

  async approvePending(): Promise<void> {
    const pending = this.state.pendingApproval
    const resolver = this.approvalResolver
    if (!pending || !resolver) {
      return
    }

    // Release the approval slot *before* the asynchronous re-scan. A concurrent
    // agent may legitimately propose and stage the next patch while we verify
    // this one; clearing after the await would wipe that newer resolver and
    // orphan its apply_fix promise (audit finding CTO-2).
    this.clearApprovalResolver()
    try {
      this.applyOperation(pending.patch)
      const fix: AppliedFix = {
        id: `fix-${++this.fixSequence}-${slug(pending.patch.ruleId)}`,
        patch: pending.patch,
        appliedAt: Date.now(),
      }
      this.update({
        pendingApproval: null,
        proposal: null,
        appliedFixes: [...this.state.appliedFixes, fix],
        exportPreview: null,
      })
      this.log('human', 'Patch approved', pending.patch.summary)
      const scan = await this.scanPage(
        { wcagLevel: 'AA', scope: 'changed' },
        { actor: 'human', silent: true },
      )
      resolver.resolve({
        status: 'applied',
        fixId: fix.id,
        summary: pending.patch.summary,
        score: scan.score,
        remainingIssues: scan.issueCount,
      })
    } catch (error) {
      if (this.state.pendingApproval?.patch.id === pending.patch.id) {
        this.update({ pendingApproval: null })
      }
      resolver.reject(error)
    }
  }

  rejectPending(): void {
    const pending = this.state.pendingApproval
    const resolver = this.approvalResolver
    if (!pending || !resolver) {
      return
    }
    this.update({ pendingApproval: null })
    this.log('human', 'Patch declined', pending.patch.summary)
    this.clearApprovalResolver()
    resolver.resolve({
      status: 'rejected',
      summary: pending.patch.summary,
    })
  }

  async revertFix(
    fixId: string,
    context: InvocationContext = {},
  ): Promise<{
    status: 'reverted'
    fixId: string
    score: number
    remainingIssues: number
  }> {
    throwIfAborted(context.signal)
    const target = this.state.appliedFixes.find((fix) => fix.id === fixId)
    if (!target) {
      throw new Error(`Applied fix "${fixId}" was not found.`)
    }
    const remaining = this.state.appliedFixes.filter(
      (fix) => fix.id !== fixId,
    )
    const root = this.requireRoot()
    root.innerHTML = this.baseHtml
    for (const fix of remaining) {
      this.applyOperation(fix.patch)
    }
    this.update({
      appliedFixes: remaining,
      proposal: null,
      pendingApproval: null,
      exportPreview: null,
    })
    this.log(
      context.actor ?? 'agent',
      'Fix reverted',
      target.patch.summary,
    )
    const scan = await this.scanPage(
      { wcagLevel: 'AA', scope: 'changed' },
      { actor: context.actor ?? 'agent', silent: true, signal: context.signal },
    )
    return {
      status: 'reverted',
      fixId,
      score: scan.score,
      remainingIssues: scan.issueCount,
    }
  }

  exportPatch(
    format: 'diff' | 'report',
    context: InvocationContext = {},
  ): {
    format: 'diff' | 'report'
    fixCount: number
    content: string
  } {
    throwIfAborted(context.signal)
    const content =
      format === 'diff' ? this.createDiff() : this.createReport()
    const preview: ExportPreview = {
      format,
      content,
      createdAt: Date.now(),
    }
    this.update({ exportPreview: preview })
    this.log(
      context.actor ?? 'agent',
      `Patch exported as ${format}`,
      `${this.state.appliedFixes.length} verified change${this.state.appliedFixes.length === 1 ? '' : 's'} included.`,
    )
    return {
      format,
      fixCount: this.state.appliedFixes.length,
      content,
    }
  }

  dismissExport(): void {
    this.update({ exportPreview: null })
  }

  /** Surface a failure from the bundled agent in the shared log. */
  noteAgentError(message: string): void {
    this.log('system', 'Agent stopped', message)
  }

  private createDiff(): string {
    if (!this.state.appliedFixes.length) {
      return '# No approved Sightline fixes yet.\n'
    }
    return [
      '--- a/page.html',
      '+++ b/page.html',
      ...this.state.appliedFixes.flatMap((fix) => [
        `@@ ${fix.patch.selector} · ${fix.patch.ruleId} @@`,
        `- ${fix.patch.before}`,
        `+ ${fix.patch.after.replace(/\n/g, '\n+ ')}`,
      ]),
      '',
    ].join('\n')
  }

  private createReport(): string {
    const score = this.state.score ?? '—'
    return [
      '# Sightline focused accessibility report',
      '',
      `Source: ${this.state.sourceName}`,
      `Score: ${score}/100`,
      `Focused barriers remaining: ${this.state.issues.length}`,
      `Approved fixes: ${this.state.appliedFixes.length}`,
      '',
      '## Approved changes',
      '',
      ...(this.state.appliedFixes.length
        ? this.state.appliedFixes.flatMap((fix, index) => [
            `${index + 1}. **${fix.patch.summary}**`,
            `   - Rule: \`${fix.patch.ruleId}\``,
            `   - Target: \`${fix.patch.selector}\``,
            `   - Why: ${fix.patch.rationale}`,
          ])
        : ['No fixes approved.']),
      '',
      '## Scope',
      '',
      `Rule packs: ${this.packs.map((pack) => `${pack.label} (${pack.rules.join(', ')})`).join('; ')}.`,
      'This report supports human review; it is not a certification of WCAG compliance.',
      '',
    ].join('\n')
  }

  private applyOperation(patch: FixPatch): void {
    const element = this.requireElement(patch.selector)
    const { operation } = patch

    switch (operation.kind) {
      case 'set-attribute':
        element.setAttribute(operation.name, operation.value)
        break
      case 'set-attributes':
        Object.entries(operation.attributes).forEach(([k, v]) =>
          element.setAttribute(k, v),
        )
        break
      case 'set-style':
        element.style.setProperty(operation.property, operation.value)
        break
      case 'insert-label': {
        element.id = operation.inputId
        const visualLabel =
          element.previousElementSibling?.hasAttribute('data-visual-label')
            ? element.previousElementSibling
            : null
        visualLabel?.remove()
        const existing = this.root?.querySelector(
          `label[for="${operation.inputId}"]`,
        )
        if (!existing) {
          const label = document.createElement('label')
          label.className = 'sightline-generated-label'
          label.htmlFor = operation.inputId
          label.textContent = operation.text
          element.parentElement?.insertBefore(label, element)
        }
        break
      }
      case 'replace-tag':
        element.replaceWith(cloneWithTag(element, operation.tagName))
        break
      case 'set-text':
        element.textContent = operation.text
        break
      case 'set-title': {
        const existing = element.querySelector('[data-page-title]')
        if (existing) {
          existing.textContent = operation.text
        } else {
          const title = document.createElement('span')
          title.setAttribute('data-page-title', '')
          title.textContent = operation.text
          element.prepend(title)
        }
        break
      }
      case 'insert-meta': {
        const existing = this.root?.querySelector(
          `meta[name="${operation.name}"]`,
        )
        if (existing) {
          existing.setAttribute('content', operation.content)
        } else {
          const meta = document.createElement('meta')
          meta.setAttribute('name', operation.name)
          meta.setAttribute('content', operation.content)
          element.prepend(meta)
        }
        break
      }
    }
  }

  private requireRoot(): HTMLElement {
    if (!this.root) {
      throw new Error('The audit canvas is not mounted yet.')
    }
    return this.root
  }

  private findElement(selector: string): HTMLElement | null {
    if (!selector || !this.root) {
      return null
    }
    try {
      const local = this.root.querySelector(selector)
      if (local instanceof HTMLElement) {
        return local
      }
      const global = document.querySelector(selector)
      if (global instanceof HTMLElement && this.root.contains(global)) {
        return global
      }
      return null
    } catch {
      return null
    }
  }

  private requireElement(selector: string): HTMLElement {
    const element = this.findElement(selector)
    if (!element) {
      throw new Error(`Target "${selector}" is no longer on the page.`)
    }
    return element
  }

  private requireIssue(issueId: string): AuditIssue {
    const issue = this.state.issues.find((candidate) => candidate.id === issueId)
    if (!issue) {
      throw new Error(
        `Issue "${issueId}" was not found. Run scan_page to refresh issue IDs.`,
      )
    }
    return issue
  }

  private cancelPendingApproval(reason: string): void {
    if (!this.approvalResolver) {
      return
    }
    const resolver = this.approvalResolver
    this.clearApprovalResolver()
    resolver.reject(new Error(reason))
  }

  private clearApprovalResolver(): void {
    const resolver = this.approvalResolver
    if (resolver?.signal && resolver.abortHandler) {
      resolver.signal.removeEventListener('abort', resolver.abortHandler)
    }
    if (this.approvalTimer !== null) {
      window.clearTimeout(this.approvalTimer)
      this.approvalTimer = null
    }
    this.approvalResolver = null
  }

  private log(
    actor: ActivityActor,
    title: string,
    detail: string,
  ): void {
    const activity: Activity = {
      id: `activity-${++this.activitySequence}`,
      actor,
      title,
      detail,
      timestamp: Date.now(),
    }
    this.update({
      activities: [activity, ...this.state.activities].slice(0, 20),
    })
  }

  private update(patch: Partial<EngineState>): void {
    this.state = {
      ...this.state,
      ...patch,
    }
    this.listeners.forEach((listener) => listener())
  }
}

export const sightlineEngine = new SightlineEngine()
