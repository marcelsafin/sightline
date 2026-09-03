# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite, React, TypeScript, axe-core, imperative WebMCP, static Cloudflare Pages
deployment. No backend, account, model API, or secret is required.

## Users

Primary working assumption: web developers and product teams repairing
accessibility barriers in a page they own. The user did not choose a narrower
persona, so the interface must also remain legible to accessibility
consultants reviewing a client page.

## Product Purpose

Sightline gives a person and browser agent one shared workspace for finding,
reviewing, repairing, verifying, undoing, and exporting focused accessibility
fixes. Success means the person can understand exactly what the agent found,
approve only safe changes, and see objective re-scan evidence afterward.

## Positioning

Sightline is not another report dashboard or autonomous compliance claim. Its
distinct mechanism is a WebMCP tool call that visibly connects agent action to
the exact live DOM element, pauses mutation for a human decision, then returns
verification from the changed page.

## Operating Context

The primary judging flow starts on the bundled Stride for Life fixture. The
browser agent lists three rule packs, scans 23 problems, highlights one
element, proposes a selector-scoped patch (authoring text itself where a
person would), waits for approval, re-scans, and repeats from overall score 54
to 100. The person can undo any approved change and export a diff or report.

## Capabilities and Constraints

- Nine imperative WebMCP tools: `list_packs`, `scan_page`, `navigate_node`,
  `highlight_issue`, `propose_fix`, `apply_fix`, `re_scan`, `revert_fix`, and
  `export_patch`.
- `apply_fix` must never mutate before explicit in-page approval.
- Fixes remain deterministic and rule-based; arbitrary agent code is never
  executed.
- Three rule packs: accessibility (axe-core: image alt text, labels, contrast,
  heading order, valid ARIA roles, positive tabindex), SEO (title, meta
  description, single h1, link text, `lang`), performance (image dimensions,
  lazy loading, `noopener`).
- Preserve the verified 23-issue, overall score 54-to-100 demo and real tool
  names.
- Product language must say focused audit or verified pair-fixing, never
  automated WCAG compliance.

## Brand Commitments

The product name is Sightline. Voice is direct, calm, operational, and
trustworthy rather than promotional. Current visual authority is the
thumbnail-matching user-supplied `Sightline Workbench v5.dc.html`: a
light-gray Apple-style workbench, white Stride for Life page card, fixed review
rail, blue agent action, orange human turn, green verification, and monospace
only for literal WebMCP evidence.

## Evidence on Hand

- Working application and engine under `src/`.
- Production deployment: https://sightline-5vu.pages.dev
- Native Chrome 151 WebMCP/CDP verification of the complete workflow.
- Deterministic baseline across three packs: 23 problems, overall score 54.
- Verified completion: zero open problems, 23 approved fixes, 100 / 100 / 100.
- Existing screenshots under `docs/`.
- Devpost copy, demo script and narration under `submission/`; the demo video
  must be re-recorded against the current workbench before submission.
- No customers, testimonials, independent benchmarks, or compliance
  certification exist and none may be fabricated.

## Product Principles

1. Shared context before explanation.
2. Human approval before mutation.
3. Verification before claiming success.
4. One obvious next action at every state.
5. Complexity appears only when the user asks for detail.

## Accessibility & Inclusion

The workbench itself must meet accessible interaction and contrast standards,
support keyboard focus and reduced motion, and never let its intentionally
broken demo content contaminate host-interface testing. Automated checks
support, but do not replace, manual and expert accessibility review.
