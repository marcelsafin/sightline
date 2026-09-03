export type WcagLevel = 'A' | 'AA' | 'AAA'
export type Impact = 'critical' | 'serious' | 'moderate' | 'minor' | null
export type ActivityActor = 'agent' | 'human' | 'system'

/** Identifier of the rule pack that produced an issue. */
export type PackId = 'accessibility' | 'seo' | 'performance'

export interface AuditIssue {
  id: string
  packId: PackId
  ruleId: string
  title: string
  description: string
  helpUrl: string
  impact: Impact
  selector: string
  html: string
  failureSummary: string
  /** WCAG tags for a11y; other packs use their own reference tags. */
  wcagTags: string[]
}

export type PatchOperation =
  | {
      kind: 'set-attribute'
      name: string
      value: string
    }
  | {
      kind: 'set-style'
      property: string
      value: string
    }
  | {
      kind: 'insert-label'
      text: string
      inputId: string
    }
  | {
      kind: 'replace-tag'
      tagName: string
    }
  | {
      /** Set several attributes atomically (e.g. width + height). */
      kind: 'set-attributes'
      attributes: Record<string, string>
    }
  | {
      /** Replace the element's text content (title, link text). */
      kind: 'set-text'
      text: string
    }
  | {
      /** Insert `<meta name="…" content="…">` at the start of the audited root. */
      kind: 'insert-meta'
      name: string
      content: string
    }
  | {
      /** Create or replace the page title marker inside the head container. */
      kind: 'set-title'
      text: string
    }

export interface FixPatch {
  id: string
  issueId: string
  ruleId: string
  selector: string
  summary: string
  rationale: string
  /** Measured facts behind the patch — never a made-up percentage. */
  evidence: string[]
  /** Who authored the human-facing content (alt text, label, role). */
  authoredBy: 'agent' | 'human' | 'engine'
  before: string
  after: string
  operation: PatchOperation
}

/** Content the agent must author for rules where the engine cannot know the answer. */
export interface ProposalInput {
  altText?: string
  labelText?: string
  headingLevel?: number
  role?: string
  /** seo: page title, ≤60 chars */
  title?: string
  /** seo: meta description, ≤155 chars */
  description?: string
  /** seo: descriptive link text replacing "click here" etc. */
  linkText?: string
}

/** Returned by propose_fix when the agent must supply content first. */
export interface ProposalNeedsInput {
  status: 'needs_input'
  issueId: string
  ruleId: string
  requiredField: keyof ProposalInput
  guidance: string
  context: {
    selector: string
    html: string
    nearbyText: string
  }
}

export interface AppliedFix {
  id: string
  patch: FixPatch
  appliedAt: number
}

export interface PendingApproval {
  patch: FixPatch
  requestedAt: number
  requestedBy: ActivityActor
}

export interface Activity {
  id: string
  actor: ActivityActor
  title: string
  detail: string
  timestamp: number
}

export interface ExportPreview {
  format: 'diff' | 'report'
  content: string
  createdAt: number
}

export interface WebMcpState {
  available: boolean
  registering: boolean
  registeredTools: string[]
  error: string | null
}

export interface EngineState {
  status: 'idle' | 'scanning' | 'ready' | 'error'
  sourceName: string
  issues: AuditIssue[]
  score: number | null
  scanCount: number
  lastScanAt: number | null
  selectedIssueId: string | null
  proposal: FixPatch | null
  pendingApproval: PendingApproval | null
  appliedFixes: AppliedFix[]
  activities: Activity[]
  exportPreview: ExportPreview | null
  webMcp: WebMcpState
  error: string | null
}

export interface ScanInput {
  wcagLevel?: WcagLevel
  scope?: 'page' | 'changed'
  /** Which rule packs to run. Omit for all. */
  packs?: PackId[]
}

export interface ToolExecutionOptions {
  signal: AbortSignal
}
