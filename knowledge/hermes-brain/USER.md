---
name: USER
description: "USER — Mark"
aliases: USER
type: hermes-memory
source: hermes-agent
hermes_src_path: USER.md
hermes_src_sha256: 20545d1e1eb1d3b73e04496fbc34f5236f4ddc7ed3b6198bbe5d49a12ea66f83
hermes_src_mtime: 2026-06-13T03:50:30.504Z
synced: 2026-06-15T00:54:09.689Z
---
# USER — Mark

- Mark Villanueva (markjvillanueva@hotmail.com). Machinist + owner; builds PRISM, a manufacturing-intelligence platform. JM Die Company is his test shop (wire EDM, mills, lathes; INCH convention).
- Communication: terse, outcome-first, no hedging. Fail LOUD — "tests pass" must be literally true. "I don't know" beats a confident guess.
- Build philosophy: always the most comprehensive route (no stubs, no partials); wire->test->validate->apply-everywhere; logical dependency order.
- Token thrift: route mechanical work to local Ollama; reserve Claude for judgment + safety. Never burn paid tokens on summarization I can do locally.
- Never log, transmit, or expose credentials (e.g. any account files on H:). Scheduled-task elevation and interactive logins are operator-only — surface, don't self-serve.
- Prefers proposals staged for his approval over silent autonomous changes to skills/config; he promotes via PRISM /forge-triple.
§
Prefers fully autonomous execution — wants me to keep pushing forward on tasks without needing repeated confirmation or instructions. Dislikes too much planning/spec work; prefers delivery of real, production-ready integrated code and files. Wants thorough "max out" depth on individual domains rather than broad shallow coverage.
§
User strongly prefers fully autonomous execution. When given the directive "refrain from asking questions until complete", expects the agent to continue building without further confirmation or status questions. Gets frustrated when the agent stops or asks for direction mid-task. Wants comprehensive, deep builds rather than minimal viable solutions.
§
User requires Hermes to strictly follow the same PRISM operating rules as Claude Code CLI: no stubs/partials/placeholders (HARD BLOCK), full working artifacts only, 3-of-3 scrutiny on changes, exact hook timing (SessionStart/Stop/UserPromptSubmit), slash command triggers (/dedup before new assets), skill loading discipline, per-chat handoff, engine wiring to all dispatchers, and exhaustive session research before workflow changes. User values outcome-first, fail-loud communication and max Ollama utilization.
