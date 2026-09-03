# Research: Submission Readiness

All unknowns from Technical Context resolved from the 2026-09-03 audit evidence and direct source inspection (no external research needed).

## D1 — Fix the claim or fix the code for `untrustedContentHint`?

- **Decision**: Fix the code. Add `untrustedContentHint: true` to `export_patch` annotations (`src/webmcp.ts` ~L367).
- **Rationale**: One object-literal key. Makes the stronger, already-written sentence true instead of weakening it. Aligns with Constitution V.
- **Alternatives considered**: Rewrite README:73 and DEVPOST:20-21 to enumerate only `navigate_node` and `propose_fix` — cheaper by zero seconds, leaves a real annotation gap (CISO-5/BOARD-4) in the product.
- **Verification of scope**: inspected outputs of all nine tools. `scan_page`/`re_scan` return `{id, pack, rule, impact, summary: issue.title, selector}`; `highlight_issue` returns `{issueId, selector, summary: title, impact}`. `title` is rule metadata (axe / pack-defined), `selector` is `pathSelector()` = tag + `nth-of-type` + engine-assigned `data-sightline-key`; no page-authored strings. `list_packs`, `apply_fix`, `revert_fix` return engine state. Only `navigate_node` (html), `propose_fix` (before/after html, nearbyText) and `export_patch` (diff with outerHTML) carry page content. Conclusion: after the change, 3/3 page-content tools are marked.

## D2 — Ship the import UI or remove the claim?

- **Decision**: Remove the claim (README:145 line, HANDOFF:43-44 + 62-63, PRODUCT:38 + 51). Leave `src/sanitize.ts` in the tree untouched; its fate is Block B3.
- **Rationale**: Shipping requires CSP first (CISO-6) + UI + adversarial tests ≈ 3 h; deadline is today. Constitution IV forbids describing an unshipped boundary.
- **Alternatives considered**: Delete `sanitize.ts` now — 5 min, but that is a product decision the audit assigned to B3; not needed for truth.

## D3 — Which agent route for the demo video?

- **Decision**: Chrome 151 + `chrome://flags/#enable-webmcp-testing` against https://sightline-5vu.pages.dev. Fallback: the built-in "Watch the agent work" client, stated explicitly as such.
- **Rationale**: Only natively verified route (CDP `WebMCP.*`, 23→0, 23/23 gated). ChatGPT in-app browser is UNKNOWN; claiming it would violate IV and VI.
- **Alternatives considered**: Record in ChatGPT in-app browser — untested; attempt is A5 smoke, outcome recorded regardless.

## D4 — Repository hosting and identity

- **Decision**: `gh repo create marcelsafin/sightline --public --source=. --push` after `git add -A && git commit`. LICENSE (MIT) already in tree; GitHub detects it for the About panel automatically.
- **Rationale**: Challenge accepts GitHub; maintainer already authenticated with `gh`. First push doubles as first off-disk backup (SRE-8).
- **Alternatives considered**: GitLab/Bitbucket — no advantage, extra auth.
- **Pre-flight**: before commit, confirm `.gitignore` excludes `node_modules/`, `dist/`, `.wrangler/`; confirm README relative links (`src/engine.ts`, `docs/*.png`, `submission/*`) point at tracked files.

## D5 — Fixture numbers to publish

- **Decision**: 23 problems (14 accessibility · 5 SEO · 4 performance), overall 54 → 100, per-pack 100/100/100, 9 agent-authored + 14 engine-measured fixes.
- **Rationale**: CDP-verified on production deployment `d0479006` (Option C). `100 − 2 × 23 = 54`.
- **Alternatives considered**: none; these are measurements.

## D6 — Rollback identifier for runbook

- **Decision**: Cloudflare Pages deployment `d0479006` is the known-good target until a newer deployment is CDP-verified; runbook instructs updating the id after each verified deploy.
