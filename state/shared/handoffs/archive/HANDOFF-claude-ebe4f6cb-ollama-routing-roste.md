---
session: claude-ebe4f6cb
topic: ollama-routing-roster-sync
slot: alpha
written_at: 2026-06-25T13:51:22.100Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-ebe4f6cb
status: active
---

# HANDOFF: claude-ebe4f6cb
Updated: 2026-06-25T13:51:22.100Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-ebe4f6cb

## STATE
SHIPPED this session — 3 commits, all 3-of-3 PASS / mutation-tested:
1. U-ALPHA-OLLAMA-ROSTER-SYNC (69bd13c824): wedge-safe probe (num_ctx + unload-between-models + roster 3->9) +6/6; restored qwen2.5-coder:7b to the DEAD balanced tier + R9 fixture fix, 61/61+20/20.
2. U-ALPHA-OLLAMA-ROSTER-COVERAGE-GUARD (85d50fd661): audit-probe-roster-coverage.mjs — asserts every installed routable model is in the probe roster (prevents blind-graph drift). +7/7 incl regression oracle, LIVE audit OK.
3. U-ALPHA-OLLAMA-ROSTER-COVERAGE-WIRE (a37b015a87): wired the guard into ollama-night-batch registry RIGHT AFTER the probe (R13 order) — auto-runs nightly (R15 no-orphan complete). parseRegistry validated, 15 jobs, guard@8=probe@7+1.
REVERTED (R12 unverified): hermes-cron-prewarm num_ctx fix. KEY FINDING: 32b@55GB (131072 KV) starves the box; num_ctx lever NOT verified for a resident model. Memory: reference_ollama_routing_roster_sync_2026_06_25.md

## RESUME
/startup-alpha /loop [10m] /goal — 2 remaining follow-ups, BOTH need a FLEET-IDLE/clean GPU (env-blocked this session, empirically confirmed the fleet reloads 32b within seconds): (A) cold-load qwen2.5-coder:32b at num_ctx 4096/16384/131072 + MEASURE resident VRAM each to confirm/refute the per-request num_ctx lever (measured 54.2 vs 54.7GB on a RESIDENT instance = reuse, inconclusive); then ollama-stress-expanded-run.mjs --include-codegen solo-per-model -> resolve qwen3-coder:30b vs qwen2.5-coder:32b codegen winner (router prefers 30b on a comment claim only). (C) IF (A)'s lever holds + real callers use small num_ctx, fix prewarm callers (hermes-cron-prewarm:104 / ollama-prewarm-on-pipeline / galaxy-reasoning-bridge) — BUILT+REVERTED this session pending (A). NOTE: other goal facets (hermes cli/agent, system-viz, octopus) are large fresh units best done as focused sessions.

## CONTEXT

