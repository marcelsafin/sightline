# Data Model: Submission Readiness

This feature manipulates documents, not runtime data. Entities below are the review model used by tasks and quickstart, not code types.

## Claim

A capability or boundary sentence in a published artifact.

| Field | Values | Rule |
|---|---|---|
| artifact | README / DEVPOST / NARRATION / DEMO_SCRIPT / HANDOFF / PRODUCT / RUNBOOK | — |
| locator | file:line or section heading | must be exact at time of edit |
| capability | text | maps to one audit capability row |
| status | BUILT / PREPARED / PLANNED / MISSING / CONTRADICTED | from audit REPORT.md |
| disposition | keep / reword / remove | keep only if status = BUILT |

**Validation**: after implementation, every Claim with status ≠ BUILT has disposition ≠ keep. The full ledger is in [contracts/claims-ledger.md](contracts/claims-ledger.md).

## Published Artifact

| Artifact | Truth-critical sections | Reconciled by |
|---|---|---|
| README.md | The idea (write boundary), Why WebMCP (annotations), Core files | T-A1-readme |
| HANDOFF.md | Product contract (registration), Safety and scope, Quality evidence | T-A1-handoff |
| PRODUCT.md | Operating Context, Capabilities and Constraints | T-A1-product |
| submission/DEVPOST.md | §How WebMCP, links block | T-A1-devpost, T-A4 |
| submission/NARRATION.txt | all five segments | T-A1-narration |
| submission/DEMO_SCRIPT.md | whole file | T-A1-script |
| submission/RUNBOOK.md | new | T-A5-runbook |

## External Action

| Action | Exact command / step | Approval | State |
|---|---|---|---|
| Commit | `git add -A && git commit -m "…"` | required | pending |
| Create public repo + push | `gh repo create marcelsafin/sightline --public --source=. --push` | required | pending |
| Redeploy | `npx wrangler@latest pages deploy dist --project-name sightline --branch main --commit-dirty=true` (Node 22 PATH) | required | pending |
| Video upload | YouTube Studio, public visibility | required | pending |
| Form submission | Devpost submit | required | pending |

**State transitions**: pending → approved (user says yes in-session) → executed → verified. Any action reaching a task while `pending` → task emits the exact command and stops; feature remains valid at P1.

## Verified Route

| Route | Evidence | Publishable |
|---|---|---|
| Chrome 151 + `#enable-webmcp-testing`, CDP `WebMCP.*` | 23→0, 23/23 gated, per-pack 100/100/100 on `d0479006` | yes |
| Built-in agent client (`getTools`/`executeTool`) | same session; header shows "agent via WebMCP" | yes, labelled as built-in |
| ChatGPT in-app browser | none | **no** until A5 smoke succeeds |
