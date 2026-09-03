# Quickstart: verifying Submission Readiness

Run from the repository root.

## 1. Claim checks (P1) — must all return 0 matches

```bash
grep -n 'sanitize.ts' README.md                      # R4 removed
grep -n '14-barrier' README.md                       # R3 reworded
grep -n 'Every.*write stops' README.md               # R1 reworded (multiline: check L24-26 manually)
grep -n 'removed dynamically' HANDOFF.md             # H1
grep -n -i 'pasted html\|import smoke' HANDOFF.md    # H4, H5
grep -n -i 'import local html\|Imported HTML' PRODUCT.md   # P1, P3
grep -n 'Eight imperative' PRODUCT.md                # P2
grep -n -i 'confidence' submission/NARRATION.txt submission/DEMO_SCRIPT.md
grep -n -E '\b(14 barriers|score 72|99%)\b' submission/DEMO_SCRIPT.md
```

Positive checks — must match:

```bash
grep -n '23-problem' README.md
grep -n 'forward change' README.md
grep -n 'Nine imperative' PRODUCT.md
grep -n -c 'measured' submission/NARRATION.txt      # ≥ 1
```

## 2. Code + build gate (T-code)

```bash
grep -n -A1 "name: 'export_patch'" src/webmcp.ts    # then confirm annotations line includes untrustedContentHint
npx tsc -b && npx eslint . && npx vite build
```

## 3. Native annotation check (Constitution V/VI) — local preview

```bash
npx vite preview --port 4173 &
# Chrome 151 with --remote-debugging-port=9222 --remote-allow-origins=* and #enable-webmcp-testing
# Drive with the session's Python websocket-client CDP helper:
#   WebMCP.enable → collect toolsAdded; scan_page → propose_fix(+authored text) → apply_fix → click Approve
#   → toolsAdded again → assert export_patch.annotations.untrustedContentHint === true
```

Expected: `export_patch` appears after first approval with both `readOnlyHint` and `untrustedContentHint` true.

## 4. Public repo check (P2) — only after user-approved A2

Logged-out browser: `https://github.com/marcelsafin/sightline`
- About panel shows **MIT license**
- `src/webmcp.ts` renders and contains `registerTool`
- Click every relative link in README → 200

## 5. Video check (P3) — only after user-approved upload

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 <file>.mp4   # < 180
```
Public URL opens in a logged-out/incognito window; captions present.

## 6. Placeholder check (P4)

```bash
grep -n -i 'add public' submission/DEVPOST.md    # 0 matches after A4
```

## 7. Runbook + headers (P5)

```bash
curl -sI https://sightline-5vu.pages.dev/ | grep -i -E 'permissions-policy|content-security|x-frame|referrer'
diff <(grep -v '^#' public/_headers | sed 's/^ *//') <(…)   # eyeball match
```
Follow each RUNBOOK.md section once on a spare browser.
