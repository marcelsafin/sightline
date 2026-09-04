# Sightline launch video — shot list (2:46)

This is the video submitted to the WebMCP Challenge: `sightline-launch-vo.mp4`.
It is a Remotion composition over a **real screencast** of the deployed app
(https://sightline-5vu.pages.dev) driven by an external agent through Chrome's
native WebMCP DevTools domain. Tool-call callouts and the score HUD are
generated from the recorded WebMCP event log; nothing is mocked or drawn.
Two montages are time-compressed (1.4× and 1.8× / 1.23×); every other frame is
real time.

- Music: the maintainer's own track, 88.5 BPM; every cut sits on the bar grid
  (first downbeat 0.07 s). The `needs_input` beat lands on the bar-16 hit; the
  100·100·100 reveal lands on the bar-50 drop.
- Narration: synthesized voice (Kokoro-82M, voice `af_heart`), 18 lines, kept
  under 1.1× tempo, normalised to −16.5 LUFS with the music ducked to 36 %
  underneath. Devpost explicitly allows AI narration; the words are ours.
- Loudness: −15.9 LUFS integrated, true peak −0.9 dBFS. Captions: `captions.srt` (same 18 lines).
- Route: Chrome 152 headless, `--enable-features=WebMCP,WebMCPTesting`,
  agent-authored content (`role: "button"`, `altText: "Stride for Life event
  illustration"`, `title: "Stride for Life — every step counts"`, …).

| Time | Beat | On screen | Voice |
|---|---|---|---|
| 0:00–0:08 | Cold open | Black. Kinetic type: “Every AI that fixes your site” → “makes the same trade.” | “Every AI that fixes your website makes the same trade. Speed, for control. It edits somewhere you can't see, and reports back: done.” |
| 0:08–0:14 |  | “Speed for control.” (display type) |  |
| 0:14–0:19 | Reveal | Workbench still zooms out to a floating card; wordmark; tagline “The human-approval layer between an agent and a live page.” | “Sightline refuses that trade.” |
| 0:19–0:24 | Discovery | Live screencast: `list_packs` → three packs; `scan_page` → 23 issues, overall 54 (callouts from the recorded WebMCP log) | “A human-approval layer, built on WebMCP. The page declares. The agent calls.” |
| 0:24–0:30 |  | Punch-in on the review rail: “23 problems. Three packs. One gate.” | “Three rule packs. One engine. One gate.” |
| 0:30–0:35 |  | `highlight_issue` on the share control (`role="buton"`): “The agent points. You both see the same element.” | “The agent scans, points, and proposes, on the real page, in front of you. You both see the same element.” |
| 0:35–0:43 |  | `propose_fix` without content → popover shows highlight ✓, propose, apply |  |
| 0:43–0:48 | The gate (music hit) | `needs_input · requiredField: "role"` — “The engine refuses to guess.” | “When a fix needs words, the engine refuses to guess.” |
| 0:48–0:54 |  | Agent calls again with `role: "button"`; proposal card: authoredBy agent, evidence — “The agent authors it.” | “It returns the context. The agent writes the words.” |
| 0:54–0:56 |  | `apply_fix` called; live screencast |  |
| 0:56–1:02 |  | Punch-in on the “Your call” sheet: exact before/after, Skip / Approve — “Nothing changes until you say yes.” Callout: apply_fix · pending — waiting for a person | “Then apply fix stops. Nothing changes until you say yes.” |
| 1:02–1:07 |  | Approve click on camera → DOM changes, re-scan, overall 56 (score HUD) | “Approve, and the live page changes, re-scans, and reports back.” |
| 1:07–1:15 | Agents author | Second `needs_input` (alt text); agent writes “Stride for Life event illustration” — “Agents author.” | “Agents author what a person would write.” |
| 1:15–1:21 |  | Approve → 58 |  |
| 1:21–1:26 | Engines measure | Contrast proposal: measured 1.68:1 · required 4.5:1 · proposed #727275 → 4.79:1 — “Engines measure.” | “Engines measure: contrast, heading levels, image sizes.” |
| 1:26–1:43 | Montage 1 | Approve → 60; accessibility fixes 1.4× (label, image-alt, contrast, tabindex, heading-order) with per-fix callouts and HUD to 82; “Accessibility → 100” | “Every forward change goes through the same click. Accessibility, to one hundred.” |
| 1:43–1:48 | Breakdown | Rail: Accessibility 0 · SEO 5 · Performance 4 — “Not automatic compliance.” | “Not automatic compliance. A record of what a human approved.” |
| 1:48–1:59 | Built on WebMCP | Code card: the real `registerTool` for `apply_fix` types in; bullets: nine tools, readOnlyHint, untrustedContentHint, AbortSignal, apply_fix resolves after approval, progressive discovery | “Nine tools, registered with document dot model context. Typed inputs. Read-only and untrusted-content hints. Abort signals honoured.” |
| 1:59–2:05 | Same gate. SEO. | `needs_input · title`; agent writes “Stride for Life — every step counts”; sheet; Approve → 84 | “SEO. Performance. Same engine, same gate. Every pack, the same click.” |
| 2:05–2:15 | Montage 2 | SEO + performance fixes (meta description, lang, single h1, link text, image dimensions, noopener) 1.8× / 1.23× with callouts; HUD to 100 — “Every pack. Same click.” |  |
| 2:15–2:20 | Climax (music drop) | “100 · 100 · 100” — All 23 fixed; callout re_scan · 0 issues · overall 100 · accessibility 100 · seo 100 · performance 100 | “Twenty-three approved changes. One hundred, everywhere.” |
| 2:20–2:26 |  | `export_patch { format: "diff" }` → unified diff of the 23 approved changes — “Export only what you approved.” | “Export only what you approved.” |
| 2:26–2:31 |  | “Nine tools. Three packs. One gate.” tool chips land on beats |  |
| 2:31–2:46 | Close | Wordmark. “The agent drafts. You decide.” sightline-5vu.pages.dev · github.com/marcelsafin/sightline · Built for the OpenAI WebMCP Challenge · MIT | “Sightline. The agent drafts. You decide.” |

## Reproduce

```
files/sightline-launch/record2.py     # drives prod over CDP WebMCP.*, logs events.json + 4K stills
files/sightline-launch/remotion/       # composition: src/Launch.tsx, timing from events.json + music-analysis.json
files/sightline-launch/vo/             # lines.json → synth.py (Kokoro) → L01…L18.wav, vo.json, captions.srt
```
(These live in the maintainer's session workspace; the composition is
deterministic given the recorded event log.)
