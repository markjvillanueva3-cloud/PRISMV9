---
source: project
section: HOOK FIRE TELEMETRY (added 2026-04-30)
slug: hook-fire-telemetry-added-2026-04-30
indexed_at: 2026-04-30T16:36:31.248Z
---

## HOOK FIRE TELEMETRY (added 2026-04-30)

`mcp-server/data/state/hook-fire-counts.jsonl` — append-only per-fire log. Both new hooks emit one event per fire (`wiki-precheck-inject` → `matched`/`noop_no_matches`/`skip_short`/`disabled`; `error-pattern-promote` → `drafted`/`noop_below_threshold`/`disabled`). Tail to verify hooks fire; silence = regression.
