# Contract: Claims Ledger (exact edits)

Every row is one sentence-level change. "Before" strings are verbatim from the tree on 2026-09-03 and MUST match exactly at edit time (grep first). Status column is the audited capability status the *after* text relies on.

## README.md

| # | Locator | Before | After | Status |
|---|---|---|---|---|
| R1 | L24-26 "The idea" | `Every read is free. Every\nwrite stops for your click.` | `Every read is free. Every\nforward change stops for your click; \`revert_fix\` only reverses changes you already approved.` | BUILT (revert = approved-history reversal) |
| R2 | L72-73 "Why WebMCP" | `Read tools carry \`readOnlyHint\`; anything returning page content\ncarries \`untrustedContentHint\`.` | **keep unchanged** — becomes true once `export_patch` is annotated (T-code). If redeploy is not approved before submission, change to: `Read tools carry \`readOnlyHint\`; \`navigate_node\`, \`propose_fix\` and \`export_patch\` carry \`untrustedContentHint\`.` — only when production has the annotation. | BUILT after T-code |
| R3 | L144 Core files | `- [\`src/demo.ts\`](src/demo.ts) — deterministic 14-barrier demo document` | `- [\`src/demo.ts\`](src/demo.ts) — deterministic 23-problem fixture (14 accessibility · 5 SEO · 4 performance)` | BUILT |
| R4 | L145 Core files | `- [\`src/sanitize.ts\`](src/sanitize.ts) — local HTML import boundary` | **delete line** | MISSING (dead code) |

## HANDOFF.md

| # | Locator | Before | After | Status |
|---|---|---|---|---|
| H1 | L30 | `State-dependent tools are registered and removed dynamically.` | `State-dependent tools are registered dynamically as the workflow unlocks them (add-only; none are removed).` | BUILT |
| H2 | L34 Signature demo | `1. Agent calls \`scan_page\` and finds 14 focused barriers: score 72.` | `1. Agent calls \`list_packs\`, then \`scan_page\`: 23 problems across three packs, overall score 54.` | BUILT |
| H3 | L38 | `5. Repeat to 100, then call \`export_patch\`.` | `5. Repeat to 100 overall (100 / 100 / 100 per pack), then call \`export_patch\`.` | BUILT |
| H4 | L43-44 Safety | `- Pasted HTML is sanitized; scripts, embedded content, event handlers, and\n  dangerous URLs are removed.` | `- No import entry point ships; the audited page is the bundled fixture. (A sanitizer module exists in the tree but is not wired — see FIXPLAN B3.)` | MISSING |
| H5 | L62-63 Quality evidence | `- Malicious HTML import smoke test strips scripts, remote URLs, \`srcset\`,\n  event handlers, form actions, inline styles and autofocus.` | **delete both lines** (evidence for an unshipped path) | MISSING |

## PRODUCT.md

| # | Locator | Before | After | Status |
|---|---|---|---|---|
| P1 | L37-41 Operating Context | `…starts from a welcome choice: try the deterministic\nDaylight Festival demo or import local HTML. In the demo, the browser agent\nscans 14 focused barriers, highlights one element, proposes a selector-scoped\npatch, waits for approval, re-scans, and repeats from score 72 to 100.` | `…starts on the bundled Stride for Life fixture. The browser agent lists\nthree rule packs, scans 23 problems, highlights one element, proposes a\nselector-scoped patch (authoring text itself where a person would), waits for\napproval, re-scans, and repeats from overall score 54 to 100.` | BUILT |
| P2 | L45-47 Capabilities | `- Eight imperative WebMCP tools: \`scan_page\`, \`navigate_node\`,\n  \`highlight_issue\`, \`propose_fix\`, \`apply_fix\`, \`re_scan\`, \`revert_fix\`, and\n  \`export_patch\`.` | `- Nine imperative WebMCP tools: \`list_packs\`, \`scan_page\`, \`navigate_node\`,\n  \`highlight_issue\`, \`propose_fix\`, \`apply_fix\`, \`re_scan\`, \`revert_fix\`, and\n  \`export_patch\`.` | BUILT |
| P3 | L51 | `- Imported HTML is sanitized and remains local to the browser.` | **delete line** | MISSING |
| P5 | L54 | `- Preserve the verified 14-issue, score 72-to-100 demo and real tool names.` | `- Preserve the verified 23-issue, overall score 54-to-100 demo and real tool names.` | BUILT |
| P4 | L52-53 | `- Six focused rule classes: image alt text, labels, contrast, heading order,` … | `- Three rule packs: accessibility (axe-core: alt text, labels, contrast, heading order, ARIA roles, focus order), SEO (title, description, single h1, link text, lang), performance (image dimensions, lazy loading, noopener).` — read the full bullet before editing; rewrite whole bullet. | BUILT |

## submission/DEVPOST.md

| # | Locator | Before | After | Status |
|---|---|---|---|---|
| D1 | L19-21 | `outputs containing audited page content carry\n\`untrustedContentHint\`` | **keep** (true after T-code + redeploy). Fallback identical to R2. | BUILT after T-code |
| D2 | L86 | `- Source: add public GitHub repository URL` | `- Source: https://github.com/marcelsafin/sightline` — **only after A2 executed** | gated |
| D3 | L87 | `- Demo video: add public YouTube URL` | `- Demo video: <public URL>` — **only after A3 upload executed** | gated |

## submission/NARRATION.txt — full rewrite

Segments 01-05 rewritten for: three packs, 23 problems, score 54, agent asked to author (`needs_input`), "measured evidence" (never "confidence"), approval inside the tool call, 100/100/100, export of approved work only, explicit "not a claim of automatic compliance". Target read time ≤ 2:40 at normal pace.

## submission/DEMO_SCRIPT.md — full rewrite

Shot list for the Chrome 151 route: (1) open prod URL, flag enabled, agent sees 9 tools progressively; (2) `list_packs` → 3; (3) `scan_page` → 23 / 54, rail shows chips 14·5·4; (4) `highlight_issue`; (5) `propose_fix` without text → `needs_input` with `html`/`nearbyText`; agent calls again with authored `altText`; (6) `apply_fix` → sheet opens, "Your turn", tool promise pending; Approve → DOM morphs → re-scan → 56; (7) montage to 100 overall, 100/100/100; (8) `export_patch` diff; (9) closing frame with repo URL. No "confidence". No ChatGPT claim. Under 3:00.

## submission/RUNBOOK.md — new

Sections: Health (URL + `curl -I` expected headers from `public/_headers`), Redeploy (exact command, Node 22 PATH), Rollback (Cloudflare dashboard → Pages → sightline → Deployments → `d0479006` → Rollback), Stuck approval (Skip → Undo → Reload), Fallback route ("Watch the agent work"), Verified routes table.
