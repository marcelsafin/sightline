# Sightline handoff

## Mission

Ship a top-10 WebMCP Challenge submission by September 3, 2026.
Sightline lets a human and browser agent audit and repair accessibility
barriers together in one visible workspace.

## Product contract

- Scan a controlled page with axe-core.
- Expose the workflow through imperative `document.modelContext.registerTool`.
- Let the agent inspect and propose; require a human click before mutation.
- Show every change in the shared UI, support undo, then export a patch.
- Say "focused WCAG audit", never claim automated compliance.

## Approved stack

- Vite, React, TypeScript, axe-core
- Static application; no backend or API keys
- Cloudflare Pages deployment

## WebMCP tools

`scan_page`, `highlight_issue`, `propose_fix`, `apply_fix`, `revert_fix`,
`re_scan`, `export_patch`, `navigate_node`

Tools are registered imperatively. Read tools use `readOnlyHint`; proposal
output uses `untrustedContentHint`; every callback honors `AbortSignal`.
State-dependent tools are registered dynamically as the workflow unlocks them
(add-only; none are removed).

## Signature demo

1. Agent calls `list_packs`, then `scan_page`: 23 problems across three packs,
   overall score 54.
2. Agent highlights one issue and calls `propose_fix`.
3. Human approves `apply_fix` in the page.
4. Page changes visibly and `re_scan` raises the score.
5. Repeat to 100 overall (100 / 100 / 100 per pack), then call `export_patch`.

## Safety and scope

- Bundled Stride for Life page is the deterministic judging demo.
- No import entry point ships; the audited page is the bundled fixture. (A
  sanitizer module exists in the tree but is not wired — see FIXPLAN B3.)
- Fixes are rule-based and selector-scoped. Agent-provided arbitrary code is
  never executed.
- Six focused rules: image alt text, labels, contrast, heading order,
  valid ARIA roles, and positive tabindex.

## Current status

Implementation and production deployment are complete.

- Live: https://sightline-5vu.pages.dev
- Production WebMCP verified in Chrome 151 through the native CDP domain.
- Baseline: 23 problems (14 · 5 · 4), overall score 54, six discovered tools
  (`list_packs`, `scan_page`, `navigate_node`, `highlight_issue`, `propose_fix`,
  `re_scan`) after the automatic first scan.
- Full workflow: propose → human approval → re-scan → undo → export.
- End state verified: 23 approved fixes, zero open problems, 100 / 100 / 100.
- Sightline shell passes axe with the intentionally broken canvas excluded:
  zero violations.
- Lint, TypeScript and Vite production build pass.
- Desktop and 390 px mobile layouts verified with no horizontal overflow.
- Thumbnail-matching user-supplied `Sightline Workbench v5.dc.html` ported on
  2026-09-02: blue Stride for Life page, fixed review rail, status/progress,
  Watch the agent work, Issues/Agent log, node callout, approval sheet, export.
- Approved source SHA-256:
  `c88cf56020b7caa5e2a90187c78741132f5aa6c310abf4b37ed800ef50b23b7c`.
- Impeccable fidelity verdict: `ship`; remaining clear.
- `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, and the workbench
  surface brief now record product and visual truth.
- Previous narrated demo shows the superseded Rosa variant and must be
  regenerated before YouTube upload:
  `~/.copilot/session-state/4a61ba03-ede2-47a7-9dbd-3dba9e384bee/files/sightline-video-rosa/sightline-demo-rosa.mp4`
- YouTube caption sidecar:
  `~/.copilot/session-state/4a61ba03-ede2-47a7-9dbd-3dba9e384bee/files/sightline-video-rosa/captions.srt`

## Option C — Copilot for pages, multi-pack — 2026-09-02 (DONE)

Thesis: Sightline is not an a11y tool. It is the human-approval layer between
an agent and a live page. Accessibility is the first *rule pack*; SEO and
performance are the second and third, on the same engine, same approval gate.

- [x] `AuditPack` primitive in `src/packs/types.ts`: `{ id, label, scan(root), fixers }`.
      Engine holds a pack registry; `scan_page` accepts `packs?: string[]`
      (default: all enabled). Issues carry `packId`.
- [x] Move axe into `src/packs/accessibility.ts` — no behaviour change.
- [x] `src/packs/seo.ts` (pure DOM, deterministic): missing/duplicate `<title>`,
      missing meta description, multiple `<h1>`, links with generic text
      ("click here"), images without dimensions in hero, missing `lang`.
      Fixers: agent authors title/description/link text (needs_input);
      engine fixes structural ones.
- [x] `src/packs/performance.ts` (pure DOM): `<img>` without `loading="lazy"`
      below fold, missing `width/height` (CLS), render-blocking inline `<style>`
      size, unoptimised `<img>` format hint. Fixers: engine-measured.
- [x] Fixture gains real SEO + perf barriers; keep a11y at 14 so the existing
      72→100 story survives. Total → ~22 issues across three packs.
- [x] Score per pack + overall. Header shows three chips. Rail filters by pack.
- [x] New WebMCP tool `list_packs` (readOnly). `scan_page` schema gains `packs`.
- [x] Bundled agent handles new `needs_input` fields (`title`, `description`,
      `linkText`).
- [x] Verify: build, lint, host axe zero, native CDP: `list_packs` → 3,
      `scan_page` all packs, per-pack scan, full loop → 100, no planted answers.
- [x] Deploy, verify canonical URL.
- [x] README/Devpost: reposition as "Copilot for pages".

## 10/10 hardening — 2026-09-02 (DONE)

Goal: remove every "pre-planted answer" a judge could find in 5 minutes, and
make the agent's contribution genuine. Work one item at a time; tick as done.

- [x] Remove all `data-fix-*` attributes from `src/demo.ts`. The fixture must
      contain only barriers, never answers.
- [x] `propose_fix` accepts agent-authored content: `altText`, `labelText`,
      `headingLevel`, `role`. Engine validates (length, allowed roles, h1–h6
      range, no markup) and refuses unsafe input. Missing content → tool
      returns `needsInput` with a `requiredField`, so the agent is told what
      to author instead of receiving a canned string.
- [x] Contrast fix computes the real minimum passing color from the element's
      actual foreground/background (WCAG 2.x relative luminance), instead of a
      hardcoded hex. Rationale reports measured before/after ratio.
- [x] Heading fix derives the correct level from the real document outline
      (nearest preceding heading level + 1) instead of a planted attribute.
- [x] Drop the fake `confidence` field; replace with `evidence` (measured
      facts: ratio, missing attribute, current level) in the tool result.
- [x] In-page agent uses the real WebMCP tool surface via
      `document.modelContext.getTools()/executeTool()` when available, so the
      "Watch the agent work" path is a genuine WebMCP client, not a scripted
      orchestrator. Falls back to direct engine calls when `modelContext`
      is absent, and says so in the Agent log.
- [x] Rescan after each approval is a real `re_scan` tool call.
- [x] Verify: build, lint, host axe zero, native CDP scan 14/72,
      full loop → 100 with agent-authored content, no `data-fix` in bundle.
- [x] Deploy and verify canonical URL.
- [x] Update README/Devpost copy: honest description of the agent/engine split.

## Submission readiness — spec 001 — 2026-09-03 (Spec Kit)

Spec, plan, ledger and tasks under `specs/001-submission-readiness/`.
Constitution: `.specify/memory/constitution.md` v1.0.0.

- [x] T001 Ledger "before" strings verified against tree (0 drift).
- [x] T002 Baseline `tsc -b` / `eslint .` / `vite build` green.
- [x] T003 `export_patch` gains `untrustedContentHint: true` (`src/webmcp.ts`).
- [x] T004 Rebuild green; bundle carries 3 × `untrustedContentHint`.
- [x] T005 README: forward-change wording, 23-problem fixture, sanitize line
      removed, "as an external WebMCP agent does" (no ChatGPT attribution).
- [x] T006 HANDOFF: add-only registration, 23/54 demo, import claims removed,
      quality evidence updated to 23 / 54 / 100·100·100.
- [x] T007 PRODUCT: Operating Context, nine tools, three packs, 23/54 evidence.
- [x] T008 DEVPOST verified: nine tools / three packs / 14·5·4 already true;
      "confidence" appears only as negation. No edit needed.
- [x] T009 NARRATION.txt rewritten (386 words ≈ 2:25; aria-roles first,
      needs_input beat, measured evidence, 100/100/100).
- [x] T010 DEMO_SCRIPT.md rewritten (Chrome 151 route, 9 shots, < 2:59).
- [x] T011 quickstart §1–§2 gates pass (17 negative = 0, 7 positive ≥ 1).
- [x] T012 This section.
- [x] T013 Publish pre-flight: MIT at root, 8/8 README link targets tracked, `.gitignore` covers node_modules/dist/.wrangler, local absolute paths scrubbed from specs/.
- [ ] T014 **[GATE]** `git add -A && git commit`
- [ ] T015 **[GATE]** `gh repo create marcelsafin/sightline --public --source=. --push`
- [ ] T016 Logged-out repo verification.
- [x] T017–T019 v5 demo recorded locally via native CDP `WebMCP.*` on prod
      (Chrome 152 headless, real screencast, TTS narration, mov_text captions):
      2:07, 1920×1080, 23→0, 100/100/100, export 23. File in session workspace
      `files/sightline-video-v5/sightline-demo-v5.mp4`. Not uploaded.
- [ ] T020 **[GATE]** YouTube upload (public).
- [ ] T021–T023 DEVPOST URLs + final read.
- [ ] T024 **[GATE]** Devpost submit.
- [x] T025 `submission/RUNBOOK.md` written.
- [x] T026 Prod headers 4/4 match `public/_headers` (recorded in RUNBOOK).
- [x] T027 ChatGPT smoke: NOT RUN (no programmatic driver). Manual 2-min procedure in RUNBOOK; route stays unclaimed.
- [ ] T028 **[GATE]** Redeploy (after T015) + native CDP check of annotation.
- [ ] T029 Fallback wording if T028 not executed before submission.
- [x] T030 Final quickstart pass recorded in `specs/001-submission-readiness/checklists/requirements.md`.
- [x] T031 Handoff written (below). User was unavailable at gate time; nothing
      external was executed.

### Resume here — four gates, one approval each

1. **T014+T015 repo** (needed for a valid entry):
   `git add -A && git commit -m "Sightline: WebMCP approval layer for pages (a11y · SEO · performance)" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"`
   `gh repo create marcelsafin/sightline --public --source=. --push`
   then T016: `curl -s https://api.github.com/repos/marcelsafin/sightline | jq '.license.spdx_id,.private'` → `"MIT"`, `false`.
2. **T020 video**: upload `files/sightline-video-v5/sightline-demo-v5.mp4` (session
   workspace) to YouTube, public. Title: "Sightline — the human-approval layer
   between an agent and a live page (WebMCP)". Description: live URL + repo URL
   + "Recorded on the deployed app through Chrome's native WebMCP surface."
3. **T021–T023 DEVPOST URLs**: replace lines "Source: add public…" and "Demo
   video: add public…" in `submission/DEVPOST.md`; then T024 submit on Devpost.
4. **T028 redeploy** (after 1): build is already green; run
   `PATH=<node22-bin>:$PATH npx wrangler@latest pages deploy dist --project-name sightline --branch main --commit-dirty=true`,
   then native smoke + update rollback id in `submission/RUNBOOK.md`.
   If 4 is skipped before submission, apply T029: README "Why WebMCP" and
   DEVPOST §How WebMCP must name only `navigate_node` and `propose_fix` as
   carrying `untrustedContentHint` (production is 2/3 until redeploy).

## External actions still requiring explicit user approval

- T014+T015: git commit, create public GitHub repository, push.
- T020: upload the demo video to YouTube (public) and paste its URL into
  `submission/DEVPOST.md`.
- T024: submit the Devpost form.
- T028: redeploy to Cloudflare Pages so production carries the `export_patch`
  annotation (only after T015).

Do not commit or push unless the user explicitly requests it.
