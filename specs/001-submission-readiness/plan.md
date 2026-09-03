# Implementation Plan: Submission Readiness

**Branch**: `001-submission-readiness` | **Date**: 2026-09-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-submission-readiness/spec.md`

## Summary

Make the Sightline hackathon entry valid and truthful by reconciling every
published claim with the deployed build (audit FIXPLAN Block A). One code
change: `export_patch` gains `untrustedContentHint: true` so the existing
"page-content outputs are marked untrusted" claim becomes true. Everything
else is documentation, a rewritten demo script/narration, a runbook, and
approval-gated external actions (public repo, video upload, form completion)
that stop and report if approval is absent.

## Technical Context

**Language/Version**: TypeScript 5 / Node 20.19.5 (repo), Node 22 for `wrangler` deploy

**Primary Dependencies**: Vite, React, axe-core; WebMCP imperative API (`document.modelContext.registerTool`)

**Storage**: N/A (static SPA, no persistence)

**Testing**: No unit test suite exists (audit CTO-9). Verification for this feature = `tsc -b`, `eslint .`, `vite build`, grep-based claim checks, and native CDP `WebMCP.enable` → `getTools` annotation check (see quickstart.md)

**Target Platform**: Static site on Cloudflare Pages (https://sightline-5vu.pages.dev), Chrome 151 with `#enable-webmcp-testing`

**Project Type**: Single web application (SPA) + submission documents

**Performance Goals**: N/A for this feature (no runtime path changes beyond one annotation object literal)

**Constraints**: Deadline 2026-09-03 22:00 CEST. No commit/push/deploy/upload without explicit user approval in-session. Repo currently has 0 commits and no remote.

**Scale/Scope**: 7 documents, 1 source line, 1 new runbook page, 1 recording session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|---|---|---|
| I. Approval Before Mutation — no gate logic altered; copy narrows to "every forward change" | PASS | Copy-only. `revert_fix` remains documented as reversal of approved history. |
| II. Agents Author, Engines Measure — no authoring/measurement changes | PASS | Narration/script updated to say "measured evidence", matching engine. |
| III. No Planted Answers — fixture untouched | PASS | No `src/demo.ts` change. |
| IV. Truthful Claims Ledger — central purpose | PASS | Every edit in contracts/claims-ledger.md maps to a BUILT capability. |
| V. WebMCP as the Only Agent Surface — `untrustedContentHint` on page-content outputs | PASS after T-code | Adds annotation to `export_patch`; verified no other tool returns page-authored content (scan/re_scan/highlight return rule titles + structural selectors only). |
| VI. Verified, Not Claimed — native CDP check of annotation; logged-out repo check | PASS | quickstart.md defines the checks. No test-suite addition is in scope (Block B4). |
| Delivery Workflow — external actions need approval | PASS | Tasks T-A2*, T-A3-upload, T-A4-submit, T-redeploy are approval-gated with explicit stop-and-report behaviour. |
| Delivery Workflow — "no deploy from a tree with no committed, remotely backed revision" | **VIOLATION if redeploy happens before A2** | See Complexity Tracking. |

**Post-design re-check**: PASS with one justified ordering constraint (redeploy only after public repo exists, or skip redeploy and phrase copy to match production).

## Project Structure

### Documentation (this feature)

```text
specs/001-submission-readiness/
├── plan.md              # This file
├── research.md          # Phase 0: decisions on the 5 open choices
├── data-model.md        # Phase 1: Claim / Artifact / ExternalAction / VerifiedRoute
├── quickstart.md        # Phase 1: how to verify the feature end-to-end
├── contracts/
│   ├── claims-ledger.md # Exact before → after for every published sentence
│   └── tool-annotations.md # Required annotation matrix for the 9 tools
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
└── webmcp.ts            # export_patch annotations (one line)

README.md                # A1 copy
HANDOFF.md               # A1 copy
PRODUCT.md               # A1 copy
submission/
├── DEVPOST.md           # A1 copy + A4 URLs
├── NARRATION.txt        # rewritten for current build
├── DEMO_SCRIPT.md       # rewritten for current build
└── RUNBOOK.md           # new (A5)
```

**Structure Decision**: Existing single-project layout; no new source directories. Submission material stays under `submission/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Redeploy of the `export_patch` annotation may be requested before the tree is committed/remote-backed (Delivery Workflow rule) | Production must match the "page-content outputs are marked untrusted" sentence | **Resolved by ordering**: redeploy task is sequenced *after* A2 (public repo). If A2 is not approved, the DEVPOST/README sentence is phrased as "`navigate_node`, `propose_fix` and `export_patch` carry `untrustedContentHint`" only once production actually does; until then copy names the two that do. No rule is broken either way. |
