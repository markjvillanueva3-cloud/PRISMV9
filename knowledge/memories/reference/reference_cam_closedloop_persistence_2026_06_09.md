---
name: reference_cam_closedloop_persistence_2026_06_09
description: "Closed-loop CAM learning — U1 made SelfLearningCAMEngine durably persist learned posteriors across restart (commit 1134289ad2); plan U2-U6 + the real-engine map (kilo, 2026-06-09)"
type: reference
galaxy: cam
source: prism-memory
synced: 2026-06-27T20:30:46.502Z
aliases: reference_cam_closedloop_persistence_2026_06_09
---


Kilo /goal "fully finished closed loop learning for highly complex CAM programs" (ultracode). The closed-loop CAM hub is **`SelfLearningCAMEngine.ts`** (1740L, wired to calc+cam dispatchers) — NOT the `CAMDriveRecipeEngine` the ultracode mappers fabricated (it does not exist; verify file claims, R8). The real outcome store is `mcp-server/state/features/cam/{nc_validate,post,toolpath}_outcome/v1.jsonl` (only ~4 seed records — closed-loop data is near-empty).

**U1 shipped (commit 1134289ad2):** the engine learned Bayesian posteriors / digital-twin / strategy state in-memory ONLY and reset to literature priors every restart — the loop was never closed across runs. Added `saveState`/`loadState` (atomic to `state/shared/cam-drive/learned-cam-state.json`, schemaVersion 1.0.0), **fail-loud + preserve-corrupt-aside** (the 2026-06-08 tribal-index fail-open clobber lesson applied), constructor auto-load, `autoPersist` after cutToLearn/digitalTwinSync/anomalyRelearn, bounded on-disk snapshot (`PERSIST_MAX_*` → O(n) not O(n²)), call-time env knobs `PRISM_CAM_LEARN_{AUTOSAVE,STATE_PATH,FORCE_LOAD}`, `save_state`/`load_state` dispatch actions. 11 tests; 2-reviewer scrutiny P1s fixed (anomalyRelearn residual-persist gap, write-amplification cap, runtime-knob un-freeze).

**Plan U2–U6** (critical path persist→consume→retrain→optimal): U2 consume learned posteriors into strategyRanking + op sequencing; U3 retrain daemon (+Blackwell GPU `H:/Tools/python-gpu`, gpt-oss:120b teacher); U4 fix feed-model R²=-32 extraction (gates live recs); U5 dual-emit CAM outcomes to FeedbackBus for LoRA; U6 OptimalStrategySelectionEngine = the 5-axis/multi-setup "optimal" payload (CAMX-MS1).

**Follow-up [SCOPED] U1b:** the shared `learned-cam-state.json` path is last-writer-wins across the 26-slot fleet — needs `withLock` or per-slot paths. **Drift:** CAMK-MS2 envelope claims `not_started` but all 5 units shipped → `/envelope-drift-fix`. **Side-blocker:** `mine-galaxy-transcripts.mjs --galaxy cam` synthesis step fails (gpt-oss:120b VRAM "fetch failed"; 20b run exited 255) → cam galaxy synthesis is shallow (2/217). Related: [[feedback_utilize_ollama_for_efficiency]], [[reference_tribal_index_v8_string_cap_2026_06_08]].
