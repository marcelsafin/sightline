---

description: "Task list for Submission Readiness (audit FIXPLAN Block A)"
---

# Tasks: Submission Readiness

**Input**: Design documents from `/specs/001-submission-readiness/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/claims-ledger.md, contracts/tool-annotations.md, quickstart.md

**Tests**: Not requested. Verification = quickstart.md checks (grep gates, tsc/eslint/build, native CDP annotation check).

**Organization**: Grouped by user story. US1 is the MVP and has no external dependencies. US2-US4 contain approval-gated tasks marked **[GATE]**: when reached without explicit in-session approval, print the exact command/path and stop; do not execute.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[GATE]**: External action; requires explicit user approval before execution (Constitution — Delivery Workflow)
- **[Story]**: US1–US5 from spec.md

## Path Conventions

Single project at the repository root. Submission material under `submission/`.

---

## Phase 1: Setup

**Purpose**: Freeze the "before" state so every ledger edit can be verified against exact strings.

- [ ] T001 Verify every "Before" string in `specs/001-submission-readiness/contracts/claims-ledger.md` still matches the tree (`grep -n -F` per row for README.md, HANDOFF.md, PRODUCT.md, submission/DEVPOST.md, submission/NARRATION.txt). If any row drifted, update the ledger row before editing.
- [ ] T002 [P] Record current build baseline: `npx tsc -b && npx eslint . && npx vite build` must be green before any change (establishes that later failures are ours).

---

## Phase 2: Foundational

**Purpose**: The one code change every "untrusted-marking" sentence depends on.

- [ ] T003 Add `untrustedContentHint: true` to the `export_patch` annotations in `src/webmcp.ts` (`annotations: { readOnlyHint: true }` → `annotations: { readOnlyHint: true, untrustedContentHint: true }`) per contracts/tool-annotations.md.
- [ ] T004 Re-run `npx tsc -b && npx eslint . && npx vite build`; confirm `dist/` contains the new annotation (`grep -c untrustedContentHint dist/assets/*.js` ≥ 3).

**Checkpoint**: Tool annotation invariant 3/3 in source and bundle. Production still 2/3 until T-redeploy.

---

## Phase 3: User Story 1 — Judge reads only true claims (Priority: P1) 🎯 MVP

**Goal**: Every capability sentence in published artifacts maps to a BUILT capability.

**Independent Test**: quickstart.md §1 negative greps return 0, positive greps match; a reader with the live URL open can reproduce every stated capability.

### Implementation for User Story 1

- [ ] T005 [P] [US1] README.md: apply ledger rows R1 (L24-26 "forward change" + revert sentence), R3 (L144 23-problem fixture), R4 (delete L145 sanitize line). Leave R2 unchanged (true after T003).
- [ ] T006 [P] [US1] HANDOFF.md: apply H1 (L30 add-only registration), H2 (L34 list_packs + 23/54), H3 (L38 per-pack 100), H4 (L43-44 no import entry point), H5 (delete L62-63 import smoke evidence).
- [ ] T007 [P] [US1] PRODUCT.md: apply P1 (L37-41 Operating Context rewrite), P2 (L45-47 nine tools incl. `list_packs`), P3 (delete L51 imported-HTML line), P4 (L52-53 three-packs bullet), P5 (L54 23-issue 54→100).
- [ ] T008 [P] [US1] submission/DEVPOST.md: verify L19 says "nine imperative tools across three rule packs" (already true); keep D1 sentence; confirm no "confidence" positive claim (L67 negates it — keep). No edit expected; record result.
- [ ] T009 [P] [US1] submission/NARRATION.txt: full rewrite per claims-ledger.md §NARRATION — three packs, 23 problems, 54, `needs_input` authoring beat, "measured evidence", approval inside tool call, 100/100/100, approved-only export, "not a claim of automatic compliance". Read time ≤ 2:40.
- [ ] T010 [P] [US1] submission/DEMO_SCRIPT.md: full rewrite per claims-ledger.md §DEMO_SCRIPT — 9-shot list for Chrome 151 route, no "confidence", no ChatGPT claim, timing budget summing < 3:00, recording setup notes (1920×1080, zoom 100%, flag URL).
- [ ] T011 [US1] Run quickstart.md §1 (all negative greps = 0, positive greps match) and §2. Fix any miss. (depends on T005-T010)
- [ ] T012 [US1] Update `HANDOFF.md` checklist: add "Submission readiness (spec 001)" section with T-IDs; tick T003-T011 as done.

**Checkpoint**: Published docs are truthful against current source. Entry is honest even if nothing further ships.

---

## Phase 4: User Story 2 — Judge reaches open source logged-out (Priority: P2)

**Goal**: Public GitHub repo, MIT visible in About, `registerTool` visible, README links resolve.

**Independent Test**: quickstart.md §4 in a logged-out browser.

### Implementation for User Story 2

- [ ] T013 [US2] Pre-flight (no external effect): confirm `.gitignore` excludes `node_modules/`, `dist/`, `.wrangler/`, `.impeccable/` decision; confirm `LICENSE` is MIT at root; list README relative links (`grep -o '](\(src\|docs\|submission\)[^)]*)' README.md`) and verify each target exists and is not ignored (`git check-ignore -v <path>` returns nothing). Report findings.
- [ ] T014 [GATE] [US2] Ask user for explicit approval to run: `git add -A && git commit -m "Sightline: WebMCP approval layer for pages (a11y · SEO · performance)"`. Include Co-authored-by trailer. Execute only on approval; otherwise print command and stop.
- [ ] T015 [GATE] [US2] Ask user for explicit approval to run: `gh repo create marcelsafin/sightline --public --source=. --push`. Execute only on approval; otherwise print and stop. (depends on T014)
- [ ] T016 [US2] Verify logged-out: `curl -s https://api.github.com/repos/marcelsafin/sightline | jq '.license.spdx_id, .private'` → `"MIT", false`; fetch raw `src/webmcp.ts` and grep `registerTool`; HEAD every README relative link on `raw.githubusercontent.com`. (depends on T015)

**Checkpoint**: Repository requirement of the challenge satisfied.

---

## Phase 5: User Story 3 — Judge watches the current build (Priority: P3)

**Goal**: < 3:00 public video of the deployed app on a verified route, matching T010's script.

**Independent Test**: quickstart.md §5.

### Implementation for User Story 3

- [ ] T017 [US3] Recording pre-flight: Chrome 151 with `chrome://flags/#enable-webmcp-testing` on, 1920×1080 window, https://sightline-5vu.pages.dev loaded, DevTools/CDP agent driver ready (session Python websocket-client helper), mic level check. Dry-run the 9 shots once without recording; confirm 23/54 → 100/100/100 and the `needs_input` beat occurs.
- [ ] T018 [US3] Record screen + narration per submission/DEMO_SCRIPT.md and NARRATION.txt. Output H.264/AAC MP4 to the session workspace (`files/sightline-video-v5/sightline-demo-v5.mp4`, outside the repo). Closing frame shows repo URL (from T015) or, if T015 not executed, the live URL only.
- [ ] T019 [US3] Generate captions SRT from NARRATION.txt timings; mux as `mov_text` (ffmpeg 8: decimals as `0.25` not `.25`). Verify `ffprobe` duration < 180 s and audio stream present.
- [ ] T020 [GATE] [US3] Ask user for explicit approval to upload to YouTube as **public**. On approval: upload, set title/description with live + repo URLs, confirm plays logged-out. Otherwise print local file path and stop.

**Checkpoint**: Video requirement satisfied, or local artifact ready with a single approval outstanding.

---

## Phase 6: User Story 4 — Submission form complete (Priority: P4)

**Goal**: No placeholders; only verified claims; real URLs.

**Independent Test**: quickstart.md §6 = 0 matches; both URLs open.

### Implementation for User Story 4

- [ ] T021 [US4] submission/DEVPOST.md L86: replace `add public GitHub repository URL` with the T015 URL. Only if T015 executed; else leave and report. (depends on T015)
- [ ] T022 [US4] submission/DEVPOST.md L87: replace `add public YouTube URL` with the T020 URL. Only if T020 executed; else leave and report. (depends on T020)
- [ ] T023 [US4] Final read of DEVPOST.md against constitution forbidden claims (automated conformance, CWV remediation, ChatGPT route). Confirm "nine tools / three packs / 23 / 54→100" appear consistently. (depends on T021, T022)
- [ ] T024 [GATE] [US4] Ask user for explicit approval before submitting the Devpost form. Otherwise stop and hand over DEVPOST.md ready-to-paste.

---

## Phase 7: User Story 5 — Operator can recover (Priority: P5)

**Goal**: One-page runbook; header verification; ChatGPT smoke recorded.

**Independent Test**: quickstart.md §7.

### Implementation for User Story 5

- [ ] T025 [P] [US5] Create `submission/RUNBOOK.md` per claims-ledger.md §RUNBOOK: Health (`curl -I` + expected headers from `public/_headers`), Redeploy (exact wrangler command with Node 22 PATH note), Rollback (Cloudflare Pages → Deployments → `d0479006` → Rollback; update id after each verified deploy), Stuck approval (Skip → Undo → Reload), Fallback route (Watch the agent work), Verified-routes table from data-model.md.
- [ ] T026 [P] [US5] Run `curl -sI https://sightline-5vu.pages.dev/` and diff observed security headers against `public/_headers`; record result in RUNBOOK.md Health section.
- [ ] T027 [US5] ChatGPT in-app browser smoke: open live URL, ask agent to list tools / scan. Record outcome (screenshot or log) to session files `files/chatgpt-smoke/`. If success → may add sentence to README/DEVPOST; if failure/unknown → no public text change.
- [ ] T028 [GATE] [US5] Redeploy so production carries the `export_patch` annotation: `PATH=<node22-bin>:$PATH npx wrangler@latest pages deploy dist --project-name sightline --branch main --commit-dirty=true`. **Sequenced after T015** (Delivery Workflow: no deploy from an uncommitted, non-remote tree). Ask approval; otherwise print and stop. After deploy: native CDP check per quickstart.md §3 against prod; update RUNBOOK rollback id.
- [ ] T029 [US5] If T028 not executed before submission, apply ledger fallback R2/D1 wording ("`navigate_node`, `propose_fix` and `export_patch` carry `untrustedContentHint`" is only true post-deploy → use two-tool wording) so copy matches production.

---

## Phase 8: Polish

- [ ] T030 Run full quickstart.md §1-§7 once more end-to-end; record pass/fail per section in `specs/001-submission-readiness/checklists/requirements.md` Notes.
- [ ] T031 Update `HANDOFF.md`: tick all executed T-IDs; list any [GATE] tasks left pending with their exact commands so a fresh session can resume with one approval each.

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 → Phase 2 → Phase 3 (US1, MVP) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (US4) → Phase 7 (US5) → Phase 8
- US5's T025-T027 can run any time after Phase 3; T028 only after T015.

### User Story Dependencies

- **US1**: none beyond Phase 2. Deliverable alone.
- **US2**: US1 (publish truthful docs only). Gated at T014/T015.
- **US3**: US1 (script), US2 optional (repo URL in closing frame). Gated at T020.
- **US4**: US2 + US3 for URLs. Gated at T024.
- **US5**: T028 gated and ordered after T015.

### Parallel Opportunities

- T005, T006, T007, T008, T009, T010 — six different files, run together.
- T025, T026 — parallel with Phase 4-6.

---

## Parallel Example: User Story 1

```bash
# All six ledger edits touch different files:
Task: "README.md rows R1 R3 R4"
Task: "HANDOFF.md rows H1-H5"
Task: "PRODUCT.md rows P1-P5"
Task: "DEVPOST.md verify-only"
Task: "NARRATION.txt rewrite"
Task: "DEMO_SCRIPT.md rewrite"
```

---

## Implementation Strategy

### MVP First (US1)

1. T001-T004 (freeze + one-line code change + green build)
2. T005-T012 (truthful docs)
3. **STOP and VALIDATE** with quickstart §1-§2
4. Entry is honest. Everything after this adds validity (repo, video, form) but each needs one approval.

### Approval batching

Present T014+T015 together as one approval ("commit + create public repo + push"), T020 alone, T024 alone, T028 alone. Four yes/no decisions total.

---

## Notes

- Never execute a [GATE] task on inferred consent; autopilot does not override Constitution Delivery Workflow.
- "Before" strings in the ledger are the contract; if grep -F misses, re-read the file, do not guess.
- Do not touch `src/demo.ts`, `src/engine.ts`, `src/packs/*` — out of scope (Block B).
