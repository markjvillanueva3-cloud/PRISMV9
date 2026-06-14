---
name: reference_u_bpa_consumer_2026_05_18
description: "U-BPA-CONSUMER (commit 6cbe5b1561, slot mike 2026-05-18) — offline events consumer activates the dead blueprint-accuracy-events.jsonl→state.json→xproc_* loop. Closes the activation gap left by U-MS1-U5; the OCR/RAG/LoRA infra shipped in MS1 is now an actual closed-loop training surface, not infra-with-no-pulse."
aliases: reference_u_bpa_consumer_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.987Z
---


**Date:** 2026-05-18 slot mike, `/checkin-mike /loop` autonomous /loop iter 2.

**Context:** User goal "train cad and cam ai systems so they can accurately read prints, generate cad files relative to prints then generate cnc programs with cam. start with fusion360." + mid-loop expansion "train the ocr readers and print interpretation capabilites, if we need to build an ai system for that, do it".

**R8 dedup-preflight finding:** BLUEPRINT-OCR-TRAINING-MS1 (all 8 units U-MS1-U1..U8) **already shipped 2026-05-12..16**. The OCR training infrastructure is FULLY BUILT — BlueprintExtractionRAGEngine, BlueprintLoRABridgeEngine, GroundTruthRegistryEngine extension, blueprint-accuracy-guard hook all exist. Rebuilding any of those would be a dedup-collision. See [[reference_blueprint_ocr_training_ms1_collision]] for the prior collision lesson.

**Real gap discovered:** The MS1 hook (`blueprint-accuracy-guard.mjs`) writes events to `state/shared/blueprint-accuracy-events.jsonl` and its docstring explicitly says: *"An offline consumer (script or scheduled task) reads this file and dispatches the corresponding xproc_* actions through prism_ai. Hooks CANNOT call MCP dispatchers directly (no transport from a stdin-fed .mjs to an MCP client), so the JSONL pattern is the canonical bridge."* That **offline consumer never shipped**. Result: `blueprint-accuracy-state.json` has stayed at `{window:[], outcomesSinceConsolidate:0, lastConsolidatedAt:null}` since the hook landed 2026-05-16. The closed-loop training signal was dead.

**What ships (3 files, 869 LOC, commit 6cbe5b1561):**

- **`scripts/lib/blueprint-accuracy-consumer-lib.mjs`** (303 LOC, 14 exports, PURE) — `parseEventLine`, `parseEventsBlob`, `clampWindowCap`, `migrateState`, `applyEvents`, `buildConsolidationSummary`, `advanceOffset` + 7 constants (`DEFAULT_WINDOW_CAP=50`, `DEFAULT_CONSOLIDATE_THRESHOLD=25`, `STATE_SCHEMA_VERSION=2`, `KNOWN_EVENT_TYPES`, `EVENT_TO_XPROC_ACTION` map, etc). Schema v1→v2 additive migration: adds `lastProcessedOffset` + `eventCounts` to the v1 `{window, outcomesSinceConsolidate, lastConsolidatedAt}` shape. FIFO-bounded window. Threshold-triggered implicit `ewc_consolidate` action with R12-honest `summary.consolidationTriggeredByThreshold` flag. Unknown event types bucket separately; malformed events drop silently (fail-soft per [[feedback_chat_lane_discipline]] — corrupt input must not block legitimate downstream events).
- **`scripts/lib/blueprint-accuracy-consumer-lib.test.mjs`** (358 LOC, 35 tests via `node:test`) — covers parseEventLine null/empty/JSON-error/non-object/missing-type, parseEventsBlob CRLF + malformed counting, clampWindowCap clamping + non-finite fallback, migrateState v1→v2 + corruption defense + immutability, applyEvents append/FIFO/threshold/reset/unknown-bucket/state-immutability, buildConsolidationSummary aggregation, advanceOffset, idempotency, R12 NaN-poison regression. 35/35 PASS.
- **`scripts/blueprint-accuracy-consumer.mjs`** (208 LOC, CLI) — atomic state writes (`.tmp-PID-TS` + rename, survives mid-write crashes), idempotent via `lastProcessedOffset` tracking, rotation-aware (offset reset on file-shrink), `--dry-run`/`--json`/`--reset` flags, daily ledger emission to `state/shared/blueprint-accuracy-ledger/blueprint-accuracy-YYYY-MM-DD.json`. Knobs: `PRISM_BPA_{EVENTS_FILE,STATE_FILE,LEDGER_DIR,WINDOW_CAP,CONSOLIDATE_THRESHOLD}`.

**Smoke-tested live:** 4 synthetic events (`outcome_record`, `drift_observation`, `replay_add`, `outcome_record`) → 4 xproc_* actions emitted with correct mappings (`xproc_outcome_record_outcome`, `xproc_drift_observe`, `xproc_replay_add`), `outcomesSinceConsolidate` incremented to 2, offset 0→329, state.json populated correctly. Re-run with same file = no-op (priorOffset=newOffset=329, 0 events parsed). Idempotency contract holds.

**How to apply:**
1. Register a Windows scheduled task (15-min cadence is sane): `node H:/prism/scripts/blueprint-accuracy-consumer.mjs`. Once the MS1 hook starts firing on real extraction tool calls, the JSONL grows and the consumer drains it on every tick.
2. The consumer emits xproc_* action names in `actions[]` but does NOT dispatch them itself — it's a pure data-mover. The caller (a sibling cron / a downstream script / an operator) routes those through `prism_ai` to complete the round-trip.
3. Use `--dry-run --json` to inspect what would happen without mutating state.
4. Use `--reset` (DESTRUCTIVE) to wipe state.json back to v2 baseline if the rolling window gets out of sync with the events file.

**Lesson — R8 dedup before R12 build:** every "build OCR training" instinct collides with U-MS1-U1..U8. The real gap is always the **activation** piece — the script/hook/cron that turns infra-with-no-pulse into a running closed loop. /master-index + envelope status are the right preflight, not the engine inventory alone (engines exist, status says complete, but the integration glue between them often doesn't).

**Companion this session:** [[reference_u_fge01_geometry_evidence_2026_05_18]] (sibling unit shipped iter 1).

## Related
[[feedback_chat_lane_discipline]] · [[reference_blueprint_ocr_training_ms1_collision]] · [[feedback_always_build]] · [[reference_u_fge01_geometry_evidence_2026_05_18]]
