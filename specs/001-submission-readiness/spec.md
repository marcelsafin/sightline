# Feature Specification: Submission Readiness

**Feature Branch**: `001-submission-readiness`

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "Execute audit FIXPLAN Block A so the Sightline entry to the WebMCP Challenge is valid, truthful and verifiable before the 2026-09-03 22:00 CEST deadline: every published claim matches the deployed build; source is public under a visible open-source license; a sub-3-minute demo video shows the current build through a verified agent route; the submission form has no placeholders; operators can recover the deployment."

## Constitution Check

| Principle | Touched | Compliance |
|---|---|---|
| I. Approval Before Mutation | Yes (copy) | Product copy changes from "every write" to "every forward change"; `revert_fix` described as reversal-only. No gate logic changes. |
| IV. Truthful Claims Ledger | Central | Every claim in README, DEVPOST, narration and demo script is reconciled against BUILT capabilities from the 2026-09-03 audit. |
| V. WebMCP as the Only Agent Surface | Yes | The one permitted code change marks the remaining page-derived tool output as untrusted so the existing claim becomes true. |
| VI. Verified, Not Claimed | Yes | Publication steps are verified logged-out; video route is the one already verified natively. |
| Delivery Workflow — external actions | Yes | Commit, push, public repo, video upload, redeploy and form submission each wait for explicit user approval in the session. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Judge reads only true claims (Priority: P1)

A challenge judge opens the submission text, the repository README and the demo narration. Every capability they read about is something they can reproduce on the live URL within minutes. Nothing describes a feature that is not shipped, and nothing overstates the safety boundary.

**Why this priority**: A single discovered falsehood discounts the whole entry (Constitution IV). It is also the only story with zero external dependencies, so it is the guaranteed-deliverable MVP.

**Independent Test**: Read each published document with the live URL open beside it. For each sentence that states a capability, attempt it. Test passes when no sentence fails and no sentence describes an absent capability.

**Acceptance Scenarios**:

1. **Given** the README lists core files, **When** a reader looks for the sanitizer described as an import boundary, **Then** no such line exists because that boundary is not shipped.
2. **Given** the README describes the fixture, **When** the reader scans the live page, **Then** the stated problem count and pack breakdown (23 problems: 14 accessibility, 5 SEO, 4 performance) match the scan result.
3. **Given** the README and submission text describe the approval boundary, **When** the reader triggers a reversal of an already-approved change, **Then** the text has told them in advance that reversal does not stop for approval while every forward change does.
4. **Given** the submission text says page-derived outputs are marked untrusted, **When** an agent lists the tools, **Then** every tool that returns page content — including the export — carries that marking.
5. **Given** the narration and demo script, **When** a viewer follows along on the live page, **Then** they see measured evidence rather than a confidence percentage, three rule packs rather than one, and an overall score moving from 54 to 100.
6. **Given** the project's own handoff and product documents, **When** a reader checks for import-your-own-page or tool-removal capabilities, **Then** neither is described as available.

---

### User Story 2 - Judge reaches open source without logging in (Priority: P2)

A judge follows the repository link from the submission form while logged out. They see the license in the repository summary panel, find the WebMCP registration call in source, and every link in the README resolves.

**Why this priority**: The challenge requires a public repository with a detectable license; without it the entry is invalid regardless of product quality. It depends on P1 so nothing false is published.

**Independent Test**: In a logged-out browser session open the repository URL, confirm the license badge is visible in the summary panel, open the tool-registration source file, and click every relative link in the README.

**Acceptance Scenarios**:

1. **Given** the maintainer has explicitly approved publication, **When** the repository is created, **Then** it is public, contains the complete working tree, and shows the open-source license in its summary panel when viewed logged out.
2. **Given** the public repository, **When** a judge opens the tool-registration source file, **Then** the registration call the challenge asks for is visible.
3. **Given** the README references source files, screenshots and submission documents by relative path, **When** each link is followed, **Then** each resolves to existing content.
4. **Given** approval has *not* been given, **When** the maintainer's assistant reaches this story, **Then** it stops and reports the exact commands it would run, without running them.

---

### User Story 3 - Judge watches the current build work (Priority: P3)

A judge watches a public video under three minutes, with clear audio, showing the deployed application driven by an agent through a verified route: packs listed, page scanned, a fix proposed that needs authored content, the agent authoring it, the change stopping for the person, approval, re-scan, and completion across all three packs to 100.

**Why this priority**: The video is the judges' primary evidence and currently every existing recording shows a superseded interface. Depends on P1 (script) and P2 (repository URL in the closing frame).

**Independent Test**: Play the video with the live URL open; every on-screen state is reproducible; runtime is under 3:00; audio is intelligible; captions are present; the closing frame's repository URL resolves.

**Acceptance Scenarios**:

1. **Given** the demo script for the current build, **When** the recording is made, **Then** it uses the deployed URL and the agent route that has been natively verified, and does not attribute behaviour to any route that was never tested.
2. **Given** the recording, **When** its duration and audio are checked, **Then** it is under three minutes with intelligible narration and embedded or sidecar captions.
3. **Given** the maintainer has explicitly approved upload, **When** the video is published, **Then** it is publicly viewable without sign-in.
4. **Given** approval for upload has not been given, **When** this story is reached, **Then** the video exists locally and the assistant reports the file path and stops.

---

### User Story 4 - Submission form is complete (Priority: P4)

The maintainer opens the submission text and finds no placeholder fields; the repository and video URLs are real; the text only claims the verified fixture workflow and the verified agent route.

**Why this priority**: Placeholders make the entry incomplete. Depends on P2 and P3 for the URLs.

**Independent Test**: Search the submission text for placeholder phrasing; open both URLs; read the text against the live page.

**Acceptance Scenarios**:

1. **Given** the submission text, **When** it is searched for "add public" or similar placeholder phrasing, **Then** no matches remain.
2. **Given** the final submission text, **When** compared to the constitution's forbidden claims, **Then** it does not assert automated conformance, Core Web Vitals remediation, or agent behaviour on untested routes.

---

### User Story 5 - Operator can recover the deployment (Priority: P5)

If the live site misbehaves during judging, the maintainer opens a one-page runbook and can check health, redeploy, roll back to a known-good deployment, recover a stuck approval, and fall back to the built-in agent.

**Why this priority**: Judging happens without the maintainer present. Cheap insurance, but only after P1-P4.

**Independent Test**: Follow each runbook step on a spare browser; each completes without further lookup.

**Acceptance Scenarios**:

1. **Given** the runbook, **When** the health URL is opened, **Then** the application loads and its response headers match the intended security headers.
2. **Given** the runbook, **When** the rollback step is followed, **Then** it names the known-good deployment identifier and where to select it.
3. **Given** an approval dialog that stops responding, **When** the recovery step is followed (Skip, Undo, Reload), **Then** the workbench returns to a usable state.
4. **Given** time remains, **When** the application is opened in the ChatGPT in-app browser, **Then** the outcome — success or failure — is recorded with a screenshot or log, and no public text claims that route unless it succeeded.

---

### Edge Cases

- Maintainer never grants publication or upload approval: P1 still ships; P2-P4 remain reported-not-executed with exact commands and file paths.
- Deadline arrives before P3: submission may reference the built-in agent route ("Watch the agent work"), which is a real WebMCP client, but must say so.
- The ChatGPT in-app browser does not expose the tools: record the failure; no published text claims that route.
- A README relative link points to a file that is ignored by version control: the link would 404 publicly; verification must be done on the public copy, not the local tree.
- The one permitted code change requires a redeploy: the redeploy is itself an external action and waits for approval; until then the untrusted-marking claim must be phrased to match production.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Published documentation MUST NOT describe an import/sanitize boundary as shipped while no import entry point exists.
- **FR-002**: Published documentation MUST state the fixture as 23 problems across three packs (14 / 5 / 4) wherever a count appears.
- **FR-003**: Published documentation MUST describe the approval boundary as "every forward change stops for approval; reversal applies only to already-approved changes".
- **FR-004**: Every tool output that contains page-derived content MUST be marked untrusted, so that the published statement "outputs containing page content carry the untrusted marking" is true for all such tools including export.
- **FR-005**: Published documentation MUST describe dynamic tool registration as add-only (tools appear as the workflow unlocks them; none are removed).
- **FR-006**: Narration and demo script MUST use "measured evidence" language and MUST NOT present a confidence percentage.
- **FR-007**: The demo script MUST describe the current build: three packs, 23 problems, overall score 54 → 100, per-pack 100 / 100 / 100, at least one round where the agent is asked to author content.
- **FR-008**: The submission text MUST contain no placeholder fields.
- **FR-009**: The public repository MUST be created only after explicit user approval in the session, MUST contain the complete working tree, and MUST show its open-source license in the summary panel when viewed logged out.
- **FR-010**: The demo video MUST be under three minutes, publicly viewable, with intelligible audio and captions, recorded against the deployed URL via a natively verified agent route; upload MUST wait for explicit approval.
- **FR-011**: A one-page runbook MUST exist covering health check, redeploy, rollback to a named known-good deployment, stuck-approval recovery, and the built-in agent fallback.
- **FR-012**: Any attempt to reproduce the ChatGPT in-app browser route MUST be recorded with its outcome; published text MUST NOT claim that route unless it succeeded.
- **FR-013**: Every external action (commit, push, repository creation, redeploy, video upload, form submission) MUST be preceded by an explicit approval from the user in the session; absent approval, the exact command or file path MUST be reported and execution MUST stop.

### Key Entities

- **Claim**: A sentence in a published artifact asserting a capability or boundary. Attributes: artifact, location, capability referenced, verified status (BUILT / not).
- **Published Artifact**: README, submission text, narration, demo script, handoff, product brief, runbook. Each has a truth-reconciled state.
- **External Action**: An operation visible outside the local tree. Attributes: description, exact command, approval status, executed status.
- **Verified Route**: An agent-to-page path with native evidence (currently: Chrome 151 with the WebMCP testing flag; built-in agent client). ChatGPT in-app browser is unverified.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reader checking every capability sentence in README, submission text and narration against the live URL finds zero sentences describing an absent capability.
- **SC-002**: 100% of tools returning page content are marked untrusted in the tool listing.
- **SC-003**: A logged-out visitor sees the license in the repository summary panel and reaches the registration source within two clicks.
- **SC-004**: The demo video runs under 3:00, is public, and every state shown is reproducible on the live URL.
- **SC-005**: Zero placeholder strings remain in the submission text.
- **SC-006**: Zero external actions executed without a preceding explicit approval recorded in the session.
- **SC-007**: A maintainer following the runbook completes each recovery step without consulting any other document.

## Assumptions

- The 2026-09-03 audit's classification of capabilities (BUILT / PREPARED / MISSING) is accurate and current; no engine behaviour has changed since.
- The import boundary is deferred to the product backlog (delete-or-ship decision belongs to a later feature), so documentation removes the claim rather than shipping the feature.
- The verified agent route for recording is Chrome 151 with the WebMCP testing flag against the deployed URL; the built-in agent client is an acceptable fallback if stated honestly.
- Repository owner is the maintainer's personal account; repository name is `sightline`; license is MIT as already present in the tree.
- The known-good deployment identifier for rollback is the most recent successful production deployment at the time the runbook is written.
- Redeploy after the one permitted code change is optional for validity: if not redeployed before submission, the untrusted-marking sentence is phrased to match what production actually exposes.
