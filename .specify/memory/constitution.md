<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Modified principles: none (initial ratification)
- Added sections: Core Principles (I–VI), Scope & Truth Constraints, Delivery Workflow, Governance
- Removed sections: none
- Templates requiring updates: none at ratification (plan/spec/tasks templates read this file at runtime)
- Follow-up TODOs: none
- Sources: PRODUCT.md (Product Principles, Capabilities and Constraints), HANDOFF.md (Product contract,
  Safety and scope), audit REPORT.md 2026-09-03 (findings CTO-1, CTO-2, CISO-2, CTO-7, CTO-9, BOARD-1)
-->

# Sightline Constitution

Sightline is the human-approval layer between an agent and a live page. An agent
finds what holds a page back, drafts the fix, and stops. Nothing ships until a
person says yes, inside the page, with the exact change in view. Accessibility
is the first rule pack; every other pack runs through the same gate.

## Core Principles

### I. Approval Before Mutation (NON-NEGOTIABLE)
No operation MAY change the audited DOM without a preceding human decision
recorded in the same session. `applyOperation` MUST have exactly two call sites:
the approval handler and the replay of already-approved fixes. Any agent-callable
tool that mutates the page MUST either block on the approval gate or be
explicitly documented as reversal-only of prior approvals. Claims in product copy
MUST match this boundary exactly — "every forward change" is true; "every write"
is not unless revert is also gated.

*Rationale:* this is the product's only irreducible promise. If it leaks once,
the category collapses into "another autonomous fixer".

### II. Agents Author, Engines Measure
Human-facing content (alt text, labels, roles, titles, descriptions, link text)
MUST be authored by the agent or the person; the engine MUST refuse to invent it
and MUST return `needs_input` with page context instead. Mechanical facts
(contrast ratio, heading level, image dimensions) MUST be measured from the live
DOM. Every patch MUST carry `evidence[]` of measured facts and `authoredBy`.
Fabricated confidence scores are forbidden.

*Rationale:* the division of labour is what makes the agent's contribution
genuine and the engine's contribution honest.

### III. No Planted Answers
The bundled fixture MUST contain only problems. No `data-fix-*`, hidden hints,
or fixture-specific lookups MAY exist in source or bundle. The bundled agent MAY
use only the context a tool returns; it MUST NOT query the DOM directly. Any
heuristic tuned to the fixture's markup MUST be disclosed as such in
documentation.

*Rationale:* a judge who finds a planted answer in five minutes discounts the
whole demonstration.

### IV. Truthful Claims Ledger
Every user-facing claim (README, DEVPOST, narration, UI copy) MUST be traceable
to a verified capability with a status of BUILT. PREPARED, PLANNED, or MISSING
capabilities MUST NOT be described as available. Dead code MUST NOT be listed as
a trust boundary. Documentation drift discovered in review is a FAIL, not a
cosmetic issue.

*Rationale:* the 2026-09-03 audit found four truth conflicts that no engineering
had caused — all were stale copy. Copy is a release artifact.

### V. WebMCP as the Only Agent Surface
All agent capability MUST be exposed through imperative
`document.modelContext.registerTool`. Tools MUST carry JSON Schema inputs,
`readOnlyHint` where true, `untrustedContentHint` on any output containing
page-derived content, and MUST honour `AbortSignal`. State-dependent tools MUST
register as the workflow unlocks them. The bundled agent MUST consume the same
tool surface via `getTools()`/`executeTool()` and MUST disclose when it falls
back to direct engine calls.

*Rationale:* the challenge judges WebMCP leverage; a privileged side-channel
would make the demonstration dishonest.

### VI. Verified, Not Claimed
Every change to the engine or tool surface MUST be verified against a live
browser through the native WebMCP path (Chrome CDP `WebMCP.*` domain or
equivalent), not only through in-page shims. Behavioural changes MUST land with
tests. Concurrency paths in the approval lifecycle MUST have explicit tests
before the approval state machine is described as production-grade.

*Rationale:* the audit confirmed a concurrency race that sequential
verification could not catch.

## Scope & Truth Constraints

- Static SPA; no backend, accounts, secrets, or PII. Any change introducing one
  requires a constitution amendment.
- Imported or fetched page content is untrusted. Import MUST route through a
  single sanitizer as the sole ingress, and a CSP MUST be deployed before any
  import UI ships.
- The score is transparent: `100 − 2 × open issues`, per pack and overall.
- Product language MUST say "focused audit" or "verified pair-fixing"; it MUST
  NOT claim automated WCAG conformance, Core Web Vitals remediation, or
  behaviour-understanding agents.
- Rule packs implement `AuditPack = { scan, fixers }`. A new pack MUST update
  the `PackId` union and the engine registry; documentation MUST describe that
  step honestly.
- Synthetic demo data MUST be labelled as synthetic where a visitor could
  mistake it for real.

## Delivery Workflow

- Source of truth is version control. No deployment MAY happen from a working
  tree that has no committed, remotely backed revision. (Audit SRE-1, SRE-8.)
- Quality gate before deploy: `tsc -b`, `eslint .`, `vite build`, test suite,
  bundle-size budget, host-UI axe with the audited canvas excluded = 0
  violations, native CDP smoke of `scan_page` on the deployed URL.
- Behavioural changes follow test-first: failing test → implementation → green.
- HANDOFF.md is the durable state file: checklist items ticked when done, never
  in advance; the active item marked **PÅGÅR**.
- External actions (commit, push, public repo, deploy, video upload, submission)
  require explicit user approval in the session.

## Governance

This constitution supersedes README, HANDOFF, PRODUCT, and DESIGN where they
conflict; those files MUST be brought into line, not the reverse. Amendments
require: a written rationale, a version bump per semantic versioning (MAJOR for
principle removal or redefinition, MINOR for a new principle or materially
expanded guidance, PATCH for clarification), and synchronized updates to every
affected artifact. Every spec, plan, and task list produced under Spec Kit MUST
include a Constitution Check that names the principles it touches and how it
complies. Reviews MUST reject work that weakens Principle I or III regardless of
deadline.

**Version**: 1.0.0 | **Ratified**: 2026-09-03 | **Last Amended**: 2026-09-03
