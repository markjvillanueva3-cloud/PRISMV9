---
name: reference_golf_inventory_of_record_2026_06_11
description: "Golf/fleet-hygiene categorized inventory of record (2026-06-11) — todo / unfinished / dormant-unwired / articles + ROI-ranked queue + 6 india/zulu AI-systems improvements. Built by ultracode Workflow wf_2c7ce362 (5 agents, verified)."
type: reference
source: prism-memory
synced: 2026-06-11T15:44:37.339Z
aliases: reference_golf_inventory_of_record_2026_06_11
---


# Golf / fleet-hygiene — inventory of record (2026-06-11, slot:golf /loop)

Source: ultracode Workflow `wf_2c7ce362` (4 sonnet miners over git+memories+dormant-audit+AI-posture → opus synthesis, 755K tok, wire-status grep-verified). Supersedes [[reference_golf_context_regain_2026_06_10]] as the current categorized picture. (Ollama galaxy-miner `mine-galaxy-transcripts.mjs --galaxy fleet-hygiene` failed exit 255 — registry key mismatch; Workflow covered categorization without it.)

## CATEGORIZED

### Dormant / built-but-unwired (all slot/golf-branch-only, UNWIRED in BOTH settings.json — verified 0 grep hits)
1. **`stop-mcp-server-heal.mjs`** (`6270570625`) — 4th MCP keepalive layer, 26-chat redundancy. HIGH ROI. Needs merge-to-live + PreToolUse:Stop entry + fire test.
2. **`agent-tier-route.mjs`** + **`agent-tier-router.mjs` lib** (`34bcb6bfd9`/`2f0010b10d`; lib ABSENT from live tree) — Ollama→Haiku→Sonnet→Opus tier routing, 26 slots. HIGH ROI. Needs merge + settings.json wire.
3. **`hermes-orchestration-advisory-inject.mjs`** (`771b59f4ec`) — parallel-agent-batch advisory (UserPromptSubmit). MEDIUM ROI. Pending operator review.
4. **`ollama-cost-router.mjs` lib** — ON live tree (tango/alpha) but dormant: its consumer (agent-tier-router) is unmerged. Auto-activates when the hook chain merges.

### Unfinished (parent commit shipped, named piece deferred)
- Auto-snapshot Stop hook (10-min) for `regenerate-launch-fleet.mjs` (`49c517e117`) — CLI shipped, hook never built (operator opt-in).
- inject `tele()` 3-line fix (`3333549ff7`) — 61/62 inject hooks write no telemetry ledger.
- `error-learn-store.mjs` per-pattern-bucket eviction (`3333549ff7`) — 92.8% of 500-cap is git-lock-contention noise drowning real lessons.
- SLOT-COMPACT-SYNERGY U-WAVE5a/5b/5c-AUTO (`85e282fe59`) — measured 0/13 slots actually in slot worktree (branch field never written); mechanical fix deferred pending operator approval.

### To-do (highest-leverage open)
- U-AT04..08 hybrid-routing follow-ons (frontmatter repin, `prism_ai:model_route_scored`, telemetry/R12 gate, offload suggest→execute, /loop wiring) — integrator-gated; india owns AI-systems.
- 89 unwired engines / 26 wiring bridges (P0, per ROADMAP-CONSOLIDATED) — top backend leverage.
- U-GOLF-HEAL-VERIFY-LEG — verify `LastRunTime>healedAt`, flip healed→heal-INEFFECTIVE (R12 backstop before destructive rekick).
- G3 tribal-index write-sharding (P0) — the V8-cap crash-class root cause.
- git-push corruption repair (corrupt tree `e36809bbd2`; fsck needs a real terminal) + regen `slot-worktrees.json` 11→26 + rm 17 broken `agent-*` dirs.

### Articles the operator fed (decoded → memories)
- **Loop Engineering** (Steinberger/Osmani, sairahul1) — 5-30x agentic cost multiplier is the real problem; PRISM exceeds the article on loop primitives, gap = hybrid model-routing cost layer → drove AGENT-TIER-MS0. [[reference_loop_engineering_article_2026_06_10]]
- **Pawel Huryn** — Claude dynamic workflows, 113 agents/1.95M tok/12min via deterministic JS → maps to ultracode Workflow + R5.
- **Akshay Pachaar / Opik** — self-repairing agent harness (trace→diagnose→test→repair→VERIFY) → maps directly to golf's mandate; G10 auto-re-enable is the first instance.
- **IBuzovskyi** — 8 loops inside the Hermes agent (ms→weeks multi-timescale compounding) → golf owns the hygiene loops.

## ROI QUEUE (ranked, from the Workflow)
1. **Merge slot/golf AGENT-TIER stack → live + wire `agent-tier-route.mjs`** (S, fleet) — THE cost-control lever (Loop-Engineering 5-30x); 20 tests, live-smoke verified; pure activation.
2. **Merge + wire `stop-mcp-server-heal.mjs`** (S, fleet) — 4th MCP keepalive layer.
3. **Wire 89 unwired engines via 26 bridges** (L, fleet) — top backend leverage.
4. **inject `tele()` backstop** (M, fleet) — unblocks all hook-ROI data.
5. **G3 tribal-index write-sharding** (L, fleet) — V8-cap crash class.
6. U-GOLF-HEAL-VERIFY-LEG (S, golf) · 7. read-to-ollama-digest + read-dedup-cache (M, fleet, 6.8%→20% offload) · 8. wire hermes-orchestration-advisory (S, fleet) · 9. error-learn bucket-eviction (M, fleet) · 10. git-push corruption repair (M, golf).

## AI-SYSTEMS IMPROVEMENTS (golf adopts from india/zulu — all use existing infra)
Golf currently has **ZERO AI-reasoning wiring** (no `reasonForGalaxy` call, 0 LoRA pairs, not a GNN-refpool/octopus consumer). Six fillable gaps:
1. Route reaper/monitor decisions through `reasonForGalaxy('fleet-hygiene', q, {deep:false})` (`scripts/lib/galaxy-reasoning-bridge.mjs`) — CAG hot-cache + sparse+dense RAG over the galaxy brain; degraded-mode returns `{degraded:true,prompt}` (no regression). Replaces hard-coded orphan-triage heuristics.
2. Wire bridge calls through india's `OllamaCapabilityProbeEngine.getBestReasoningModel()` (`c1b40183c1`) — VRAM-gated, kills the retired-model-tag regression class.
3. Emit LoRA pairs from reaper outcomes (`PRISM_GALAXY_BRIDGE_LORA_EMIT=1` + `appendLoraPair` in fleet-reaper-home + fleet-memory-monitor) → `state/shared/lora/bridge-reasoning/` → feeds india's LoRA feeder.
4. Feed ancestry-confirmed-orphan events to india's GNN active-label-worklist (`gnn-active-pool-select.mjs`, `f512700c56`) → grows ref-pool toward the 0.55 macro-F1 gate (currently 0.439).
5. Publish reaper health signals to `state/shared/octopus-outcomes/fleet-hygiene.jsonl` → zulu WeeklySynthesis + system-viz `ghost.octopus_consensus` (hermes-zulu already lists fleet-hygiene as a bridge target).
6. Adopt zulu's cross-slot work-order pattern: after each multi-slot reap write `state/shared/specs/GOLF-REAPER-CROSS-SLOT-<date>.md` → visible to zulu's synthesis + `weekly_synthesis_get`.

## BLOCKERS (the recurring one)
slot/golf worktree blocks live-tree harness-exec edits → all dormant hooks + galaxy docs are stranded on the branch until merged/checked-out-from-live. git-push is gated on a corrupt-tree fsck (`e36809bbd2`, needs a real terminal). Activation path: merge/cherry-pick to `cad-fusion-live-ms0` → wire settings.json there. india owns AI-systems execution.

**Why:** one ultracode pass categorized golf's entire history so the next session picks the next ROI item in one read instead of re-mining. **How to apply:** read this before /pick; top ROI = merge+wire the AGENT-TIER stack (cost lever, already built+tested). Galaxy MEMORY.md carries the long-form of this. Wire to Obsidian = automatic (this file feeds the vault on Stop).
