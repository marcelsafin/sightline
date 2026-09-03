# Sightline demo script — 2:40 target (hard cap 2:59)

Route: **Google Chrome 151+ with `chrome://flags/#enable-webmcp-testing`** on
https://sightline-5vu.pages.dev, driven by an external agent through the native
WebMCP tool surface. Do not attribute behaviour to the ChatGPT in-app browser;
that route is untested.

Numbers are measurements from the deployed build: 23 problems (14 · 5 · 4),
overall 54 → 100, per-pack 100 / 100 / 100, 9 agent-authored + 14
engine-measured fixes. Never say "confidence".

## 0:00–0:20 — Problem (shot 1)

**Visual:** Workbench loaded after its automatic first scan. Stride for Life
page left; review rail right reads **"23 things hold this page back"** with
three pack chips (14 · 5 · 4). Header shows the WebMCP status.

**Voiceover:** NARRATION §01, first three sentences.

## 0:20–0:38 — Discovery (shots 2–3)

**Visual:** Agent calls `list_packs` → three packs. Agent calls `scan_page`
→ log confirms **23 issues**, per-pack 72 / 90 / 92, overall **54**.

**Voiceover:** NARRATION §01, remaining sentences.

## 0:38–1:10 — The agent has to author (shots 4–5)

**Visual:** `highlight_issue` → focus box lands on the share control
carrying `role="buton"`. `propose_fix` **without** `role` → response shows
`needs_input` with `guidance`, `html`, `nearbyText`. Agent calls `propose_fix`
again with `role: "button"`. Proposal card shows before/after DOM,
**evidence** rows, and `authoredBy: agent`.

**Voiceover:** NARRATION §02.

## 1:10–1:35 — Human checkpoint (shot 6)

**Visual:** Agent calls `apply_fix`. Sheet opens: **Your call**, exact diff,
Skip / Approve. Hold 2 s on the pending tool call. Click **Approve** (real
click, on camera). Image updates; rail shows re-scan; overall **56**.

**Voiceover:** NARRATION §03.

## 1:35–1:55 — Verification, second kind of authoring (shot 7a)

**Visual:** Next issue: hero image with no text alternative. `propose_fix` →
`needs_input` again; agent authors `altText` in prose from `nearbyText`.
Approve. Then a contrast failure: patch arrives with measured before/after
ratio in `evidence`, no round-trip needed. Approve. Score rises each time.

**Voiceover:** NARRATION §04.

## 1:55–2:15 — Montage to 100 (shot 7b)

**Visual:** Jump cuts only here. Show one SEO fix (agent-authored meta
description via `needs_input`) and one performance fix (image dimensions,
engine-measured). Land on **"All 23 fixed"**, chips **0 · 0 · 0**, header
"9 WebMCP tools live"; agent log shows `re_scan` → overall **100**, per-pack
**100 / 100 / 100**. (Undo is optional here; history lists 23 approved changes.)

**Voiceover:** NARRATION §05, first two sentences.

## 2:15–2:40 — Export + close (shots 8–9)

**Visual:** Agent calls `export_patch({ format: "diff" })`. Diff preview.
Closing frame: live URL + public repository URL (if published) + "Human
judgment + agent speed. That's WebMCP."

**Voiceover:** NARRATION §05, remaining sentences.

## Recording checklist

- The 2026-09-03 recording was produced exactly this way: Chrome 152 headless
  driven over the native CDP `WebMCP.*` domain against the deployed URL, real
  screencast frames (no stills), TTS narration from NARRATION.txt, `mov_text`
  captions. Only the 1:55–2:15 montage is time-compressed (≈0.9×; the 20 fixes
  took 15 s real time).

- 1920×1080, browser zoom 100%, light theme, no extensions visible.
- Flag enabled; confirm `document.modelContext` exists before recording.
- Show each tool name at least once in the agent transcript.
- Record the Approve click live; never fake it in editing.
- Jump cuts only in the 1:55–2:15 montage, never in the core needs_input →
  apply_fix → Approve flow.
- Fallback if external agent misbehaves: **Watch the agent work** button. It is
  a real WebMCP client (`getTools`/`executeTool`); the header then reads
  "agent via WebMCP". Say so in the voiceover if used.
- Captions embedded (mov_text) + SRT sidecar; clear audio; end < 2:50.
