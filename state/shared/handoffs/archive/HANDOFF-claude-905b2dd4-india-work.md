---
session: claude-905b2dd4
topic: india-work
slot: india
written_at: 2026-06-21T12:47:17.490Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-905b2dd4
status: active
---

# HANDOFF: claude-905b2dd4
Updated: 2026-06-21T12:47:17.490Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-905b2dd4

## STATE
SESSION (post-compact): 2 units shipped (70219ce497, fa08abd0d5). Then exhaustive backlog+fleet triage (NO further code unit shipped -- honestly, the remaining reds were not cleanly india-fixable): india MISC all stale/forked; fleet sweep (269/4928 files, 15 red) triaged + owner-routed in reference_fleet_test_sweep_triage_2026_06_21. Disproven this session: PRISMSelfAwarenessEngine fossil one-shot (reverted clean), cam-plugins stale-bump (it is a real 5v7 divergence). LESSON: the source-of-truth-realign pattern needs a passing convention-companion oracle; fleet reds lacking that need their domain owner. Memories: reference_fleet_test_sweep_triage_2026_06_21, reference_india_lora_adapter_engine_dup_2026_06_21, reference_lathe_g76_dialect_fossil_2026_06_21, reference_india_ai_test_reds_backlog_2026_06_21.

## RESUME
india clean-unilateral backlog EXHAUSTED + fleet sweep triaged. The fleet red tests are NOT clean stale-fixtures -- they are divergences/forks/U-TEST-FOSSILs/safety/peer-claimed (full owner-routed red-list: reference_fleet_test_sweep_triage_2026_06_21). NEXT india options (need runway/decision): (1) PRISMSelfAwarenessEngine.test.ts -- 134-test U-TEST-FOSSIL (799be785cb), DISPROVEN as a one-shot (export-class -> 114/134 stale-body fails, 45s); a dedicated near-rewrite unit (realign every body to the singleton + current manifest shape) IF worth it -- fresh window. (2) GNN full-coverage -- operator ref-pool labeling gated. Domain reds route to OWNERS (idle slots can claim): businessDispatcher ghost->hotel, WEDM safety->mike, cam-plugins 5v7 divergence + cadCamDeepAgi + cam-vendor->kilo, MasterPostHurcoV11 (PEER-CLAIMED)->echo. DO NOT re-chase verified-stale MISC-186/228/254 or the MISC-085 dedup fork.

## CONTEXT

