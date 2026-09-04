# Sightline runbook

One page. Everything a maintainer needs while judges are on the site.

## Health

- URL: https://sightline-5vu.pages.dev
- Expected response: `HTTP/2 200`, page loads, review rail reads "23 things
  hold this page back" with three pack chips (14 · 5 · 4).
- Security headers (from `public/_headers`), verified 2026-09-03 with
  `curl -sI https://sightline-5vu.pages.dev/`:

  | header | expected |
  |---|---|
  | `permissions-policy` | `tools=(self)` — required for WebMCP |
  | `x-content-type-options` | `nosniff` |
  | `referrer-policy` | `strict-origin-when-cross-origin` |
  | `cross-origin-resource-policy` | `same-origin` |
  | `x-frame-options` | `DENY` — the approval UI must not be framed |
  | `content-security-policy` | `frame-ancestors 'none'` |

  Result 2026-09-04 05:05: **7/7 match** (incl. `HTTP/2 200`). A full CSP
  (script/style sources) is deferred until an import entry point ships.

- Native smoke: `npm run smoke` (scripts/webmcp-smoke.py) — 15 invariants over
  Chrome's native WebMCP CDP domain against the live URL; exit 0 = healthy.

## Lighthouse / axe on the live URL

Expected: performance 100 (desktop) / ~98 (mobile), best practices 100, SEO 92,
accessibility ~81. The accessibility and SEO deductions are **the fixture's
deliberate problems** (every failing node is under `.audit-canvas`). The
Sightline shell itself, with the canvas excluded, has 0 axe violations
(verified 2026-09-04 in four UI states). Do not "fix" the fixture.

## Redeploy

Requires Node 22 on PATH for `wrangler`; the repo itself runs on Node 20.

```bash
npx tsc -b && npx eslint . && npx vite build
npx wrangler@latest pages deploy dist --project-name sightline --branch main --commit-dirty=true
```

After deploy: repeat the native smoke above, then update the rollback id below.

## Rollback

Cloudflare dashboard → Workers & Pages → **sightline** → Deployments → select
the known-good deployment → **Rollback to this deployment**.

- Known-good id: **`806b7f8c`** (2026-09-04 05:05; anti-clickjacking headers, robots/sitemap; smoke 15/15) — before that **`1f04cc60`** (lazy axe) and **`d0f8732e`** (2026-09-04 04:40; race fix CTO-2, contrast
  both directions, modal focus trap, dev-only debug handle, OG meta, clear
  no-WebMCP header, engine-order rail, host UI axe 0 in all states;
  CDP-verified on prod).
- Previous: `55674fc8` (rail header "Agent is working" for external agents).
- Previous: `8772bfdd` (2026-09-03; annotations 3/3, gate holds).
- Previous known-good: `d0479006` (Option C build, 23→0, 23/23 gated,
  100/100/100).
- Update this id after every deployment that passes the native smoke.

## Stuck approval

Symptom: the "Your call" sheet stays open and Approve/Skip do nothing, or an
agent tool call never resolves. (The concurrent-call race behind this, audit
CTO-2, was fixed and regression-tested on 2026-09-04; keep the steps as a
general recovery.)

1. Click **Skip**. If the sheet closes, continue.
2. If the page state looks wrong, use **Undo** on the last history entry.
3. If still stuck, **reload the page** — the fixture resets to 23 / 54 and all
   tools re-register. Nothing is persisted, so a reload is always safe.

## Fallback demo route

If an external agent misbehaves, click **Watch the agent work**. It is a real
WebMCP client (`document.modelContext.getTools()` / `executeTool()`); the
header reads "agent via WebMCP" and every `apply_fix` still stops at the sheet.
Say so if it is used on camera.

## Verified routes

| route | evidence | publishable |
|---|---|---|
| Chrome 151/152 + `#enable-webmcp-testing` (native CDP `WebMCP.*`) | 23→0, 23/23 gated, 100/100/100 on `d0479006`; annotations 3/3 + gate re-verified on `8772bfdd`; 2026-09-03 demo recording on Chrome 152 headless | yes |
| Built-in "Watch the agent work" client | same session; header "agent via WebMCP" | yes, labelled as built-in |
| ChatGPT in-app browser | not tested | **no** — do not claim |

## ChatGPT in-app browser smoke (manual, 2 min)

Status 2026-09-03: **not run** (no programmatic driver; not attempted against
the maintainer's live ChatGPT session). Until this passes, no public text may
claim the ChatGPT route.

1. ChatGPT desktop app → open the in-app browser → load
   https://sightline-5vu.pages.dev
2. Prompt: "List the tools this page exposes, then scan it."
3. Pass = the assistant names `list_packs` / `scan_page` / `navigate_node` and
   reports 23 issues, overall 54. Fail = it describes the UI or guesses.
4. Screenshot the result into the session workspace `files/chatgpt-smoke/`
   either way. On pass, README/DEVPOST may add one sentence naming the route.

## Contacts / ownership

Single maintainer. Cloudflare account and GitHub repository
(https://github.com/marcelsafin/sightline — private until the maintainer flips
it public for submission) are personal; no shared credentials exist. Nothing in this app stores data or secrets.
