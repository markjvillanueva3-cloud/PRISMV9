# Video Tutorial Plan

Video tutorials are planned per the CAM-EXHAUST-MS0 / U-CAM105 envelope
and will be recorded inside the four target CAM hosts at JM Die Company.
Each video is short, task-focused, and demonstrates a real production
workflow rather than a contrived demo.

## Format conventions

- **Length**: 3–5 minutes per video. Anything longer is split.
- **Voiceover**: by an experienced JM Die operator, not a developer.
- **Recording**: 1080p60, OBS, raw screen capture (no overlays during
  shoot — annotations added in post).
- **Distribution**: PRISM internal docs site + bundled into each plugin
  installer's `Help` menu.

## Per-host playlist

Each host gets the same 6-video playlist. The shop process is
identical across hosts; only the host UI differs.

| # | Title                                  | Engine actions exercised                       | Goal                                                    |
|---|----------------------------------------|------------------------------------------------|---------------------------------------------------------|
| 1 | Install and connect                    | (none — installer + Settings dialog)           | First-run flow, MCP server pairing, status pip         |
| 2 | Read the six overlays                  | `cam_overlay_*_render`                         | What each bar means, what the colors mean, when to act |
| 3 | Predict before cycle start             | `cam_predict_scan`, `cam_predict_encode`       | Walk through a real ALCOA die job; show 1 critical alert resolved |
| 4 | Optimize for cycle time / tool life    | `cam_suggest_recommend`, `cam_suggest_apply`   | Shave 18% off a real M2 roughing op without losing tool life |
| 5 | Use the tooltip pane                   | `cam_tooltip_render`                           | Show 3 thin-wall finish tips picked from 4,758-tip corpus on a real Holo-Krome part |
| 6 | When something goes wrong              | `cam_registry_health`, `cam_registry_events`   | Plugin offline → reconnect; how to tell it from MCP-down |

## Production schedule

Recording happens at JM Die during the slow week between **2026-05-04**
and **2026-05-08** (operator availability confirmed).
Post-production (annotations + cuts) the following week. Publication
target: **2026-05-22**.

## Why these six?

The six topics cover every PRISM feature an operator touches during a
normal day — install, read, predict, optimize, learn, recover. We
deliberately chose **not** to record videos for the developer-facing
features (geometry handoff, registry health, telemetry) — those have a
written runbook in [troubleshooting.md](troubleshooting.md) and most
operators never need them.

## What we are NOT producing yet

- Per-feature deep dives (e.g., "How chatter SLD is built"). PRISM has
  reference docs in `docs/physics/` for the physics-curious.
- Dev-side videos (writing a fifth-host plugin, contributing tribal
  tips). These belong in dev onboarding, not the operator playlist.
- Marketing reels. Operator playlist comes first; sales material later.

## Tracking

Each recorded video lands in `docs/cam-plugins/videos/` as an `.mp4`
plus a sidecar `.md` transcript so the docs are searchable. Status of
each video is tracked in the U-CAM105 milestone deliverable list.
