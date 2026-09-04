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
- Earlier narrated demos (Liquid Glass, Rosa) show superseded UIs and must not
  be uploaded. The current-build recording is described in
  `submission/VIDEO_UPLOAD.md` (kept in the session workspace, not in the repo).

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
- [x] T014 First commit `eca3a2e` (85 files) — approved 2026-09-03 12:4x.
- [x] T015 https://github.com/marcelsafin/sightline created **PRIVATE** per user
      ("ha den privat sålänge") and pushed. **Flip to public before Devpost submit.**
- [x] T016 Remote verified (authenticated, repo private): `registerTool` in
      src/webmcp.ts, 8/8 README link targets 200, `/license` API → MIT.
      Logged-out check deferred until public.
- [x] T017–T019 v5 demo recorded locally via native CDP `WebMCP.*` on prod
      (Chrome 152 headless, real screencast, TTS narration, mov_text captions):
      2:07, 1920×1080, 23→0, 100/100/100, export 23. File in session workspace
      `files/sightline-video-v5/sightline-demo-v5.mp4`. Not uploaded.
- [x] T017–T019 (superseded) **Launch cut** built 2026-09-04: Remotion composition
      over a real 2560-px WebMCP screencast of prod (external agent via CDP
      `WebMCP.*`, agent-authored content), tool-call callouts + score HUD
      generated from the recorded event log, cut to the maintainer's own track
      (88.5 BPM grid), no voiceover. 2:46, 1080p30, −15 LUFS. Pipeline in session
      workspace `files/sightline-launch/{record2.py,remotion/}`.
- [ ] T020 YouTube upload — automated (`files/submit/yt_upload.py`), waits for a
      YouTube session in Comet. Narrated cut preferred.
- [x] T021 DEVPOST Source URL filled (with "set to public before submitting").
- [ ] T022 DEVPOST video URL — automated by `devpost_finish.py` after T020.
- [x] T023 Final DEVPOST read done (claims verified incl. AbortController cleanup;
      maintainer notes moved to HTML comment). Only the video URL line remains.
- [x] T024a Repo public 2026-09-04 03:36 (MIT visible logged-out).
- [ ] T024b Devpost submit — automated after T022 (draft 3/5 saved, all fields done).
- [x] T025 `submission/RUNBOOK.md` written.
- [x] T026 Prod headers 4/4 match `public/_headers` (recorded in RUNBOOK).
- [x] T027 ChatGPT smoke: NOT RUN (no programmatic driver). Manual 2-min procedure in RUNBOOK; route stays unclaimed.
- [x] T028 Redeployed `8772bfdd` from committed tree. Native CDP on prod:
      23/54, needs_input, gate holds, export_patch appears only after approval
      with `untrustedContent: true` → 3/3 page-content tools marked. Headers 4/4.
- [x] T029 Not needed — production now matches the general wording.
- [x] T030 Final quickstart pass recorded in `specs/001-submission-readiness/checklists/requirements.md`.
- [x] T031 Handoff written (below). User was unavailable at gate time; nothing
      external was executed.

### Resume here — ONE thing left for you

**Sign in to YouTube in Comet** (any tab → youtube.com → Sign in). That's it.
A scheduled job checks every 15 min; when it sees the session it uploads the
narrated launch cut, puts the URL into Devpost, submits, and verifies — no
further input needed. Deadline 2026-09-04 10:00 CEST (Devpost extended 12 h).

State 2026-09-04 04:30:
- Repo **PUBLIC**, MIT visible logged-out: https://github.com/marcelsafin/sightline
- Prod `55674fc8` verified (headers 4/4, native WebMCP 23→0, annotations 3/3).
- Devpost draft `1153616-sightline`: overview ✓ (title, pitch, thumbnail),
  details ✓ (story, 8 tags, live + repo links, 8 gallery images),
  additional info ✓ (Individual, Sweden, New, live URL, testing notes,
  agents tested, AI tools, Significant, Yes). **Submit is blocked only by the
  required "Video demo link"** — Devpost rejects submission without it.
- Video: `files/sightline-launch/sightline-launch.mp4` (music-led, 2:46) and
  the narrated cut `remotion/out/sightline-launch-vo.mp4` (Kokoro af_heart VO,
  18 lines, music ducked) — the rules require audio that explains the build,
  so the narrated cut is the one to upload. Captions: `vo/captions.srt`.
- Automation: `files/submit/{comet.py,yt_status.py,yt_upload.py,devpost_finish.py}`
  drive Comet over CDP :9556 (Comet relaunched with the debug port; tabs restored).
- No valid Google session exists in Comet, Safari, Chrome or other local browsers,
  so the upload cannot start until you sign in.

## External actions still requiring explicit user approval

- None. On 2026-09-04 03:13 the user authorized everything ("ladda upp
  allting"): repo made public, Devpost filled and will be submitted
  automatically, YouTube upload runs automatically once a YouTube session exists.
