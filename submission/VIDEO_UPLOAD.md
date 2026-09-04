# Demo video — upload sheet

File (session workspace, not in repo): `files/sightline-launch/remotion/out/sightline-launch.mp4`
2:46 · 1920×1080 · H.264 (CRF 16) / AAC 256k · −14.9 LUFS · no voiceover, music-led.

How it was made (truthfully reproducible — `files/sightline-launch/`):
- `record2.py` drives https://sightline-5vu.pages.dev as an external WebMCP agent over
  Chrome's native CDP `WebMCP.*` domain (Chrome 152, DSF 2 → 3840×1986 screencast) and
  logs every `invokeTool` / `toolResponded` with timestamps (`events.json`) plus 4K stills.
- `remotion/` is a Remotion composition: real screencast + stills, punch-ins, tool-call
  callouts generated from `events.json`, score HUD from the real `apply_fix` responses,
  cut to the beat grid of the maintainer's own track (`music-launch.wav`, 88.5 BPM).
- Only the 89–103 s and 125–136 s montages are time-compressed (1.4× / 1.8× / 1.23×).
  Every other frame is real time. Nothing is mocked or drawn.

**Title**
Sightline — the human-approval layer between an agent and a live page (WebMCP)

**Description**
An agent finds what holds a page back, drafts the fix, and stops. Nothing ships until you say yes — inside the page, with the exact change in view.

Sightline exposes nine WebMCP tools across three rule packs (accessibility via axe-core, SEO, performance). When a fix needs words — alt text, a label, a role, a title — the engine returns needs_input and the agent authors them from the page context; contrast, heading levels and image dimensions are measured from the live DOM. Every apply_fix call pauses until a person approves. 23 problems → 100 / 100 / 100, then export only the approved work.

Every frame is the deployed app driven by a real external agent through Chrome's native WebMCP surface. Tool-call captions are generated from the recorded WebMCP event log. Two montages are time-compressed; nothing is mocked.

Live: https://sightline-5vu.pages.dev
Source (MIT): https://github.com/marcelsafin/sightline
Built for the OpenAI WebMCP Challenge.

**Tags**
WebMCP, OpenAI, accessibility, axe-core, human-in-the-loop, AI agents, Chrome, web standards, SEO, Core Web Vitals

**Settings**
Visibility: Public (required by the challenge) · Not made for kids · Music: maintainer's own composition, all rights held.
After upload: paste the URL into `submission/DEVPOST.md` line "Demo video:".
