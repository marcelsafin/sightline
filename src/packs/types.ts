/**
 * Rule-pack contract.
 *
 * Sightline is the approval layer between an agent and a live page; a pack is
 * one family of checks that plugs into that layer. Every pack scans the same
 * isolated audit surface and returns issues in one shape, so the WebMCP tool
 * surface, the approval gate, undo and export are shared across packs.
 */
import type {
  AuditIssue,
  FixPatch,
  PackId,
  PatchOperation,
  ProposalInput,
} from '../types'

export type PatchDefinition = Omit<
  FixPatch,
  'id' | 'issueId' | 'selector' | 'before' | 'after'
> & { operation: PatchOperation }

export type PatchOutcome =
  | { kind: 'patch'; definition: PatchDefinition }
  | {
      kind: 'needs_input'
      requiredField: keyof ProposalInput
      guidance: string
    }

export interface ScanContext {
  /** The isolated, full-width clone of the page being audited. */
  auditRoot: HTMLElement
  /** Resolve an axe-style raw selector to a stable, key-based selector. */
  stableSelector: (rawSelector: string) => string
  /** Find the live element for a stable selector, if it still exists. */
  findElement: (selector: string) => HTMLElement | null
}

export interface FixContext {
  /** Live page root (mutations apply here). */
  root: HTMLElement
  /** Content the agent (or person) authored for this fix. */
  input: ProposalInput
}

export type Fixer = (
  issue: AuditIssue,
  element: HTMLElement,
  ctx: FixContext,
) => PatchOutcome

export interface AuditPack {
  id: PackId
  label: string
  /** One-line description shown to agents via `list_packs`. */
  description: string
  /** Rule ids this pack owns, in display order. */
  rules: string[]
  scan(ctx: ScanContext): Promise<AuditIssue[]>
  fixers: Record<string, Fixer>
}
