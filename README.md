<div align="center">

# Sightline

### The approval layer between an agent and a live page.

**Sightline is a Copilot for pages. A browser agent finds what holds a page
back — accessibility, SEO, performance — and drafts the fix. Nothing ships
until a person says yes, inside the page, with the exact change in view.**

[Live demo](https://sightline-5vu.pages.dev) ·
[Demo script](submission/DEMO_SCRIPT.md) ·
[Devpost copy](submission/DEVPOST.md)

</div>

![Sightline workbench: Stride for Life page on the left, review rail with 23 issues across three rule packs on the right](docs/workbench.png)

## The idea

Every "AI fixes your site" tool makes the same trade: speed for control. The
agent edits somewhere you cannot see, on a copy you did not watch, and reports
back "done". Sightline refuses that trade.

Sightline is a **human-approval layer** built on WebMCP. The agent works on the
real page, in front of you, through declared tools. Every read is free. Every
forward change stops for your click; `revert_fix` only reverses changes you
already approved. Accessibility is the first rule pack; SEO and performance
run on the same engine, through the same gate.

1. `list_packs` tells the agent what this page can be checked for.
2. `scan_page` runs one or all packs and returns stable issue IDs, per-pack
   scores, and an overall score.
3. `highlight_issue` puts the exact DOM node in front of both of you.
4. `propose_fix` splits the work honestly: the **agent authors** human-facing
   content (alt text, labels, roles, page title, meta description, link text)
   and the **engine measures** what can be measured (contrast ratio from real
   luminance, heading level from the document outline, image dimensions). Ask
   for a fix without authoring and the tool answers `needs_input` with page
   context — it never invents the words.
5. `apply_fix` pauses inside the page until the person approves or skips.
6. `re_scan` proves the change. `revert_fix` undoes any approved step.
   `export_patch` ships only what a human approved.

## Three rule packs, one gate

| Pack | Checks | Who authors the fix |
|---|---|---|
| **Accessibility** (axe-core) | alt text, form labels, contrast, heading order, ARIA roles, focus order | agent for words, engine for measurements |
| **SEO** | document title, meta description, single h1, descriptive link text, `lang` | agent for words, engine for structure |
| **Performance** | image dimensions (CLS), lazy loading below the fold, `rel="noopener"` | engine — all measured |

Packs are a first-class primitive (`src/packs/types.ts`). A pack is
`{ scan(root), fixers }`; the engine, the WebMCP tool surface, undo, and export
are shared. Adding a fourth pack is one file.

## Why WebMCP

This cannot be built by pointing an agent at buttons:

| Without WebMCP | With Sightline tools |
|---|---|
| Agent scrapes a report | Agent receives typed issue IDs, selectors, per-pack scores |
| Agent and person look at different things | `highlight_issue` puts one DOM node in front of both |
| Suggested code is detached from the page | Patch carries live before/after DOM and measured evidence |
| Writes happen invisibly | `apply_fix` **blocks inside the tool call** until a human clicks |
| "Fixed" is a claim | `re_scan` measures the changed page |
| Work vanishes into chat | `export_patch` produces a reviewable diff |

Tools are registered imperatively and appear as the workflow unlocks them:
`apply_fix` after a proposal, `revert_fix`/`export_patch` after an approval.
Chrome emits native tool-change events at each step. Every callback honours
`AbortSignal`. Read tools carry `readOnlyHint`; anything returning page content
carries `untrustedContentHint`.

## Nine structured tools

| Tool | Purpose | Safety |
|---|---|---|
| `list_packs` | Discover rule packs and what each requires | Read-only |
| `scan_page` | Run selected packs; per-pack + overall score | Read-only |
| `navigate_node` | Inspect page context at a selector | Read-only; untrusted content |
| `highlight_issue` | Move the shared focus overlay | Read-only |
| `propose_fix` | Draft a scoped patch; may return `needs_input` | Read-only; untrusted content |
| `apply_fix` | Stage mutation and **wait for a human click** | Human checkpoint |
| `re_scan` | Verify score and remaining issues | Read-only |
| `revert_fix` | Rebuild the page without one approved fix | Reversible |
| `export_patch` | Export approved changes as diff/report | Read-only |

## Deterministic judging demo

The bundled Stride for Life page carries **23 real, deliberately planted
problems**: 14 accessibility, 5 SEO, 4 performance. It contains only problems —
no hidden answers for the agent to read. Scans run in an isolated 900px audit
frame so the result is identical on every viewport.

Score is transparent per pack and overall: `100 − 2 × open issues`. The page
starts at **54 overall** (72 / 90 / 92) and ends at **100 / 100 / 100** after
23 human-approved changes. Nine of those changes required the agent to write
something; fourteen were measured by the engine.

![Human approval sheet: "Your call", exact before/after diff, Skip or Approve](docs/human-checkpoint.png)

The bundled **Watch the agent work** button is itself a WebMCP client: it calls
`document.modelContext.getTools()` / `executeTool()` exactly as an external
WebMCP agent does (verified natively with Chrome 151), and stops at every
`apply_fix`.

## Run locally

Requirements: Node.js 20.19+ and Chrome 151+.

```bash
npm install
npm run dev
```

Then enable `chrome://flags/#enable-webmcp-testing`, relaunch Chrome, and open
the local URL. To inspect the page's registered tools:

```js
await document.modelContext.getTools()
```

Useful project commands:

```bash
npm run build
npm run lint
npm run preview
```

## Implementation

- React + TypeScript + Vite
- axe-core, restricted to six deliberate rule classes
- one event-driven engine shared by human UI and all WebMCP callbacks
- selector-scoped rule patches; arbitrary agent code is never executed
- snapshot-derived undo that can remove any approved fix safely
- static deployment on Cloudflare Pages; no backend, account, or API key

Core files:

- [`src/engine.ts`](src/engine.ts) — audit, proposals, consent, undo, exports
- [`src/webmcp.ts`](src/webmcp.ts) — schemas, annotations, progressive tools
- [`src/demo.ts`](src/demo.ts) — deterministic 23-problem fixture (14 accessibility · 5 SEO · 4 performance)

## Scope and honesty

Sightline demonstrates **verified pair-fixing**, not automated compliance.
Automated rules cannot replace keyboard, screen-reader, cognitive, usability,
or expert conformance testing. Exports state that boundary explicitly.

## License

[MIT](LICENSE)
