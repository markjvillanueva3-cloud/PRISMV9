---
name: reference-u-offload-ratelimit-hint-2026-05-18
description: "Hint-aware Ollama offload rate-limit gate — root-cause leg of U-OFFLOAD-AUDIT (charlie 2026-05-18, golf FLEET-PENDING-EXTRACT pickup)"
aliases: reference_u_offload_ratelimit_hint_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.006Z
---


# U-OFFLOAD-RATELIMIT-HINT (2026-05-18 charlie)

Charlie pickup from golf's `FLEET-PENDING-EXTRACT-2026-05-18.md` redistribution
(slot-golf-claude-cedef311 tail-extracted 9 chats from the 13:00-16:00 window;
charlie's highest-confidence single pickup = **U-OFFLOAD-AUDIT**, "853 suggest /
0 convert").

## Root cause

`ollama-task-offloader.mjs` `isRateLimited()` — a 60s per-category self-throttle
— fired FIRST in the suggest path and was INDEPENDENT of the [[reference_fleet_reaper|fleet-reaper]]
routing hint. An aggressive-offload hint could lower confidence/inject bars but
never relaxed the rate-limit gate that killed ~43 would-be offloads. The
accounting half (89 infra `fleet-reaper-coordinator` suggests inflating the
denominator) was already closed by U-OE-DASH-KEEP-BREAKDOWN (baef3c361d, same
day) — this was the remaining REAL lever.

## Fix

Pure exported `effectiveRateLimitMs(hint, baseMs, floorMs)`: no hint → baseMs
(byte-identical back-compat, load-bearing); active hint → window scales down
∝ aggression, floored at `RATE_LIMIT_FLOOR_MS=5000` (single-path storm bound
~12×/min). `isRateLimited(category, hint=null)` gates on the scaled window;
callsite passes the already-loaded hint (no extra I/O). Commit on slot/charlie,
2 files +213, 15/15 node:test.

## Lessons

- **R8 / dedup-first paid off twice**: golf's headline "wiring gap" was
  ALREADY half-closed by my own earlier same-day work (U-OE-DASH-KEEP-BREAKDOWN).
  Reading the dashboard code first (it already separates [[reference_fleet_reaper|fleet-reaper]] infra
  suggests with a KEEP-IN-SYNC drift guard) stopped a duplicate accounting
  rebuild. The real residual was a narrower, different defect (gate ordering).
- **Wrong-tree verification trap**: edits went to the slot worktree
  (`H:/prism-slot-charlie`); `cd H:/prism && grep` read the *main* tree (a
  different, unedited file) → false "edits didn't persist" + a misleading
  `import()` failure. In the slot-worktree model ALWAYS verify against
  `H:/prism-slot-<slot>`, never `cd H:/prism`.
- **Windows dynamic import**: `await import(absPath)` on a bare `H:\...` path
  throws `ERR_UNSUPPORTED_ESM_URL_SCHEME` — must wrap `pathToFileURL().href`.
  (spawnSync-based hook tests sidestep this; direct-import tests don't.)
- P2 recurring class: pure-core + injected-reader designs need ≥1 real
  integration oracle — `isRateLimited` end-to-end still only transitively
  tested. Follow-up: U-OFFLOAD-RATELIMIT-INTEGRATION-ORACLE.

## Sisters

[[reference_ollama_expand_charlie_iter_2026_05_18]] — U-OE-DASH-KEEP-BREAKDOWN, the accounting half (same hook family, same day).
[[reference_master_index_hit_counter_2026_05_18]] — prior charlie unit this session (HIGH-ROI-AUDIT action #2).
[[reference_rgs_tool_autoinvoke_ms1_2026_05_16]] — the "hermetic fakes don't prove wiring" lesson this P2 echoes.
