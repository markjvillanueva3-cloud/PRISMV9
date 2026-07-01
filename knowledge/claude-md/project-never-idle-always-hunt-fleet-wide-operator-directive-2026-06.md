---
source: project
section: NEVER IDLE — ALWAYS HUNT (FLEET-WIDE, operator directive 2026-06-18)
slug: never-idle-always-hunt-fleet-wide-operator-directive-2026-06
indexed_at: 2026-06-21T04:20:36.218Z
---

## NEVER IDLE — ALWAYS HUNT (FLEET-WIDE, operator directive 2026-06-18)

A chat slot NEVER answers "Idle." When its current unit is done it HUNTS down the ladder (descend only when the rung above is dry; PREFER own domain first): (0) finish in-flight work; (1) own-domain leftover/deferred (handoff/DELTA open-threads); (2) slot-task/priority queue + backlogged roadmaps (`loop-state.mjs next`, ROADMAP-CONSOLIDATED, PRISM-UNIFIED-ROADMAP); (3) **FIXES** (failing tests, tsc errors, `## Recent regressions` debt); (4) **WIRINGS** (`audit-unwired-engines.mjs`, BUILD_STATE NEEDS_WIRING); (5) **GHOST builds/wirings** (/system-viz ghost roosts, `master_index_query`); (6) **BACKLOG** (MISC-TASKS-INVENTORY; the 9 any-domain slots expand to ANY domain here); (7) **ULTIMATE FALLBACK — transcript+chat reconciliation:** run `mine-galaxy-transcripts.mjs` / read the already-mined MISC-TASKS-INVENTORY (912 transcripts + 504 handoffs) + ROADMAP-CONSOLIDATED, reconcile promised-vs-shipped against the CURRENT build (BUILD_STATE/ENGINE_DIGEST/system-viz), then build/wire the gaps. **Use the existing miners — never read raw transcripts into Claude context (R5/Ollama-first).** Idle is valid ONLY when every rung is dry AND budget is RED (a spiral is the only other stop signal; context growth is NOT — R6). → [[feedback_slots_never_idle_always_hunt]] · [[feedback_loop_exhaustion_domain_fallback]] · [[feedback_any_domain_fallback_slots]]
