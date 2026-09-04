# Sightline — Devpost submission copy

## One-line pitch

Sightline is a Copilot for pages: a WebMCP-native approval layer where a browser
agent finds what holds a live page back — accessibility, SEO, performance —
drafts the fix, and stops for a human click before anything changes.

## Why this use case is a strong fit for WebMCP

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

## How WebMCP was implemented

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

## Technology

React, TypeScript, Vite, axe-core, imperative WebMCP, Cloudflare Pages.
No backend, authentication, model API, or secret is required.

## Important scope statement

Sightline is a focused remediation collaboration demo, not a claim of
automatic WCAG compliance. Automated checks support, but never replace, manual
and expert accessibility testing.

## Submission links

- Live app: https://sightline-5vu.pages.dev
- Source: https://github.com/marcelsafin/sightline
- Demo video: add public YouTube URL

<!--
Maintainer notes — do not paste into Devpost:
- Repository is PRIVATE until you flip it:
  gh repo edit marcelsafin/sightline --visibility public --accept-visibility-change-consequences
  Confirm logged-out that the About panel shows "MIT license" before submitting.
- Video: upload per submission/VIDEO_UPLOAD.md, then replace the line above.
- Devpost "Built with": React, TypeScript, Vite, axe-core, WebMCP, Cloudflare Pages.
- Project page: https://devpost.com/software/sightline-mndf14 (draft until the video URL is set and the form is submitted).
-->

