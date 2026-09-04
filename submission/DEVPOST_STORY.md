## Inspiration

Every "AI fixes your site" tool makes the same trade: speed for control. The agent edits somewhere you cannot see, on a copy you did not watch, and reports back "done". We wanted the opposite: an agent that works on the **real page, in front of you**, through declared tools — and that physically cannot change anything until you say yes.

WebMCP made that possible. Instead of an agent guessing at our UI, the page declares exactly what an agent can do, and `apply_fix` can hold the tool call open until a person approves.

## What it does

Sightline is a Copilot for pages: a WebMCP-native approval layer where a browser
agent finds what holds a live page back — accessibility, SEO, performance —
drafts the fix, and stops for a human click before anything changes.

Nine imperative WebMCP tools across three rule packs — accessibility (axe-core), SEO and performance — on one engine, through one gate:

- `list_packs` → `scan_page` finds 23 problems on the bundled fixture (14 · 5 · 4), overall score 54.
- `highlight_issue` puts the agent and the person on the exact same live element.
- `propose_fix` refuses to invent human-facing content: for alt text, labels, roles, titles, descriptions and link text it returns `needs_input` with the page context, and **the agent authors it**. Contrast, heading level and image dimensions are **measured by the engine** from the live DOM. Every patch carries `evidence[]` and `authoredBy`.
- `apply_fix` stages the patch in a visible approval sheet and **returns an unresolved promise** until the person clicks Approve or Skip. Then it re-scans and returns the new score.
- `revert_fix` reverses only already-approved changes; `export_patch` hands back only approved work as a diff or report.

Result on the demo: 54 → 100 overall, 100 / 100 / 100 per pack, 23 approved changes, zero planted answers.

## Why this is a strong fit for WebMCP

Fixing a page is not one action. It is a collaboration loop: inspect the real
element, understand impact, propose a bounded change, apply it with judgment,
and verify the result. That loop is the same whether the problem is a missing
alt text, a generic page title, or an image with no dimensions. Conventional browser agents must infer
this workflow from visual reports and unstable DOM controls. Sightline exposes
each step as a structured WebMCP tool with typed inputs and explicit safety
semantics.

The page progressively exposes nine imperative tools across three rule packs. Read operations carry
`readOnlyHint`; outputs containing audited page content carry
`untrustedContentHint`; mutations cannot complete until a person confirms the
exact before/after DOM in Sightline's visible approval checkpoint. The agent
and person always share the same page, focus target, issue state, and score.

## How it creates a better user experience

Sightline replaces the handoff between scanner, chat, editor, browser, and
report with one understandable workspace. The agent can prioritize and explain
barriers using stable issue IDs. The person sees the exact highlighted element
and keeps final say over every mutation. Each approved fix is immediately
re-scanned, can be undone independently, and becomes a clean diff or report.

The bundled judging demo is deterministic: 23 real problems across three rule
packs (14 accessibility via axe-core, 5 SEO, 4 performance), per-pack and
overall scores, and a transparent path from 54 to 100 as fixes are verified.
Nine fixes require the agent to author content; fourteen are engine-measured.
The fixture contains only problems — no planted answers.

## What people and agents can do together that was difficult before

- Run one approval workflow across accessibility, SEO and performance instead of
  three tools with three reports.
- Point to the exact same live element without translating between a report,
  chat response, selector, and source file.
- Turn audit output into safe, reviewable DOM patches without executing
  arbitrary model-generated code.
- Pause an agent tool call inside a visible page until a person decides.
- Verify each claim against the changed DOM instead of accepting “fixed” text.
- Export only human-approved changes, with rationale and a truthful scope note.

## How we built it

Sightline uses the imperative `document.modelContext.registerTool()` API. All
tools have JSON Schemas, natural-language descriptions, and relevant
annotations. Chrome registration uses `AbortController` cleanup and
state-driven progressive discovery, producing native tool-change events
without re-registering active tools.

The same TypeScript engine powers manual controls and agent callbacks, so the
two paths cannot drift. Scans run in an isolated 900px audit frame so results
are identical on every viewport. `propose_fix` enforces a clear division of
labour: for alt text, labels and ARIA roles the agent must author the content
(validated as plain text, length-bounded, roles allow-listed); for contrast the
engine computes the minimum passing colour from measured WCAG luminance; for
heading order it derives the level from the live document outline. Every patch
carries `evidence` (measured ratios, current attributes) instead of a made-up
confidence score. `apply_fix` returns an unresolved promise while the human
checkpoint is open, then resolves with the new score after approval and
re-scan. The bundled "Watch the agent work" demo is itself a WebMCP client that
calls `getTools()`/`executeTool()` — the same path an external agent uses.

**Stack:** React, TypeScript, Vite, axe-core, imperative WebMCP, Cloudflare Pages.
No backend, authentication, model API, or secret is required.

## Challenges we ran into

- **Keeping a tool call open across a human decision.** `apply_fix` returns a promise that resolves only after approval and re-scan. Chrome's `cancelInvocation` does not abort the callback's `AbortSignal` (Chrome 151), so the engine adds its own 120 s timeout and a Skip path.
- **Not cheating.** Our first fixture had planted answers (`data-fix-*` attributes). We removed every one and made the engine return `needs_input` instead — the agent has to read the page and write. A fake "confidence" score became measured `evidence`.
- **Viewport-independent audits.** Scans run in an isolated 900 px audit frame so an agent on a phone-sized viewport gets the same 23 issues as a desktop judge.
- **axe-core across realms.** `axe.run(HTMLElement)` fails across the iframe boundary; we pass a selector string instead, and import `axe.min.js?raw` explicitly because `axe.source` is tree-shaken in production.

## Accomplishments that we're proud of

- The whole demo — 23 → 0 across three packs — was verified with an **external agent through Chrome's native WebMCP surface** (CDP `WebMCP.*`), not only through in-page shims. The launch video is that exact run.
- The bundled "Watch the agent work" button is itself a WebMCP client (`getTools()` / `executeTool()`) — no privileged side channel.
- A new rule pack is one file implementing `{ scan, fixers }` (plus its id in the `PackId` union and the engine's pack list); the tool surface, the gate, undo and export come for free.
- `npm run smoke` reproduces our verification: 15 invariants driven through Chrome's native WebMCP DevTools domain against the live URL.
- A written constitution (Spec Kit) with six principles; the first one is *Approval Before Mutation (NON-NEGOTIABLE)*. A source-level test enforces that the DOM-mutating function has exactly two call sites: approval and replay of approved history.
- Vitest coverage of the content validator, the WCAG contrast maths and the approval state machine — including a regression test for two agents overlapping the post-approval re-scan (a real race we found in review) — plus CI with a bundle budget and a no-planted-answers check.

## What we learned

WebMCP's real power is not "agents can click for you" — it is that a page can **declare where the human belongs** in a workflow, and make the agent wait there. Tool annotations (`readOnlyHint`, `untrustedContentHint`), progressive registration and `AbortSignal` turn that from a UX convention into a contract.

## What's next for Sightline

- Import any page (sanitizer exists; CSP and an import UI are next).
- Gate `revert_fix` behind the same approval; add Playwright coverage of the native tool flow on top of the unit suite.
- More packs on the same engine: security headers, structured data, i18n hygiene.

## Scope statement

Sightline is a focused remediation collaboration demo, not a claim of
automatic WCAG compliance. Automated checks support, but never replace, manual
and expert accessibility testing.
