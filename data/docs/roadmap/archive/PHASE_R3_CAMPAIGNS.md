# PHASE R3: DATA CAMPAIGNS — v13.9 (STUB — expand via Brainstorm-to-Ship at phase start)
# Status: not-started | Sessions: 3-4 | Role: Data Campaign Manager
# v13.9: Cross-Audit Governance Hardening — artifact manifest, fault injection, test levels (XA-1,13,7).
# v13.5: BATCH SIZE CORRECTED: 10 materials per batch, not 50 (SL-1).
#         250 concurrent effort=max Opus calls is impossible on any API tier.
#         Realistic: 10 materials × 5 ops = 50 calls/batch, concurrency=3, ~10min/batch.
#         Campaign state uses batch IDs not counts (prevents write-race data loss — DC-3).
#         Adaptive rate limiting with 429 backoff (CB-4). PFP feedback loop architecture (SK-7).
# v13.3: Tool anchors added (concrete dispatcher calls per MS). ATCS tracking calls specified.
#         Rate limiting note for batch API calls. Test suite growth documented.
# v13.0: Parallel batch via Agent Teams. PFP at max effort. Fast Mode for batch diagnostics.
#         1M context option for full batch ingestion without session splitting.

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: R2 validated 50-calc test matrix + AI-generated edge cases. Safety baseline established. All registries >95%. Build passes with full test suite.

WHAT THIS PHASE DOES: Expand calculation coverage to the FULL material library in batches. Fill gaps identified in R1-MS4 and R2-MS4. Calibrate PFP predictions against R2 baselines.

WHAT COMES AFTER: R6 (Production Hardening) requires R3 + R4 + R5 all complete.

ARTIFACT MANIFEST (XA-1):
  REQUIRES: R2_CALC_RESULTS.md, PHASE_FINDINGS.md (R2 section)
  PRODUCES: PHASE_FINDINGS.md (R3 section), src/__tests__/batchCalcs.test.ts, src/__tests__/pfpCalibration.test.ts

TEST LEVELS: L1-L5 required (unit + contract + integration + orchestration + safety invariants)

FAULT INJECTION TEST (XA-13):
  R3 FAULT TEST: Timeout one batch task → verify batch continues without it.
  WHEN: During second or later batch (need at least one successful batch first).
  HOW: Set artificially low timeout on one task in parallel_batch → let it fail.
  EXPECTED: Batch completes with partial results. Failed task logged. No data corruption.
  PASS: Batch continues. Partial results saved. Failed material added to quarantine.
  FAIL: Entire batch aborts, or failed task causes data corruption.
  EFFORT: ~5 calls.

---

## MANDATORY REQUIREMENTS (brainstorm MUST include ALL of these)

```
1. Error budget enforcement per batch (not just aggregate)
2. Quarantine protocol for materials that fail >2 categories
3. Human review gate before campaign completion (no fully-automated sign-off)
4. PFP calibration against R2 baselines
5. MAINTENANCE_MODE during any batch that modifies registry data
6. Schema version bump if ANY new fields added to material JSON (Code Standards)
7. Threshold monitoring active (from R1-MS5) throughout all campaigns
8. Swarm pattern selection documented (which pattern for parallel batch)
9. ATCS tracks batch progress: task_init per campaign, batch = subtask.
   Session resume: task_list → find incomplete campaign → continue.
10. CAMPAIGN_STATE.json written after each batch (not just at MS completion):
    { campaign_id, total_batches, completed_batch_ids: ["batch_1","batch_2",...],
      current_batch, error_count, quarantined_materials, last_update }
    NOTE (DC-3): Use completed_batch_ids ARRAY, not completed_batches COUNT.
    If two parallel batches complete simultaneously and both read-modify-write a count,
    one increment is lost. With an ID array, the union of concurrent writes is correct.
```

## STUB OBJECTIVES (expand at phase start using PHASE_TEMPLATE.md)

1. Batch calc campaigns: 10 materials/batch via parallel_batch Agent Teams (SL-1 CORRECTED)
   OLD (v13.4): 50 materials/batch = 250 concurrent effort=max Opus calls. IMPOSSIBLE.
   NEW: 10 materials/batch = 50 calls/batch, p-queue concurrency=3, intervalCap=10/min for max-effort.
   ~5 minutes per batch. ~35 batches for full library. Spread across 3-4 sessions.
2. Coverage target: >90% of all 3518+ materials have validated safety calcs
3. PFP calibration: Predictive Failure Prevention at effort=max against R2 baselines
   PFP FEEDBACK ARCHITECTURE (SK-7): Design ingestion path for real shop floor failure data.
   Initial release uses calc-based calibration. Architecture must support future failure event feeds.
4. Gap fill: Address PARSE FAILURE and MISSING DATA items from R1-MS4
5. Regression suite: All R2 edge cases (manual + AI) pass after batch changes

## TOOL ANCHORS (concrete starting points for Brainstorm-to-Ship expansion)

```
THESE ARE THE KEY DISPATCHER CALLS FOR EACH FUTURE MS:
The brainstorm expander MUST build MS steps around these — they are NOT optional.

MS0 — BATCH EXECUTION (per 50-material batch):
  prism_orchestrate action=swarm_execute pattern="parallel_batch"  [effort=max]
    tasks=["speed_feed [material_1] turning", "speed_feed [material_1] milling", ...(5 ops × 50 mats)]
  → Sort results by material+operation before flush (ORDERING RULE).
  → Flush: prism_doc action=append name=R3_BATCH_[N]_RESULTS.md content="[sorted results]"  [effort=low]
  → MANDATORY CONTENT VERIFY: prism_doc action=read name=R3_BATCH_[N]_RESULTS.md → verify tail.
  RATE LIMIT: Use p-queue with intervalCap matching API tier limits (see §Code Standards §Rate Limiting).
  250+ calcs at effort=max WILL hit Anthropic rate limits without throttling.

MS1 — PFP CALIBRATION:
  prism_pfp action=analyze target="[material] [operation] [machine_hours]"  [effort=max]
  → Compare PFP prediction against R2 safety baseline for same material/operation.
  → Record delta: prism_doc action=append name=R3_PFP_CALIBRATION.md content="[results]"  [effort=low]

MS2 — GAP FILL:
  For each PARSE FAILURE from R1-MS4:
    prism_dev action=code_search pattern="[material_name]\|[registry_error]" path="src/"  [effort=high]
    → Diagnose → fix loader → build → prism_data action=material_get material="[fixed_material]"  [effort=high]
  For each MISSING DATA:
    Document in PHASE_FINDINGS.md as "requires external data source" (cannot fix with code changes).

BETWEEN BATCHES:
  prism_context action=context_compress  [effort=low]  → shed completed batch from context
  Context editing: clear completed batch tool results (supplements flush).

QUALITY GATE:
  prism_ralph action=assess target="R3 Data Campaigns"  [effort=max]
  prism_omega action=compute target="R3 complete"  [effort=max]
```

## ATCS TRACKING (task management across R3 sessions)

```
R3 spans 2-3 sessions. ATCS provides cross-session continuity.

CAMPAIGN START (first R3 session):
  prism_atcs action=task_list  [effort=low]  → check no duplicate campaign task exists
  prism_atcs action=task_init title="R3 Campaign All-Materials" priority="high"  [effort=medium]
  → Returns task_id. Record it in CURRENT_POSITION.md.

BATCH COMPLETE (after each batch flush):
  prism_atcs action=task_update task_id="[id]" status="batch_[N]_complete"  [effort=low]

SESSION RESUME (subsequent R3 sessions):
  prism_atcs action=task_list  [effort=low]  → find "R3 Campaign All-Materials" task
  → Read status → determine which batch to resume from.

  ORPHANED TASK HANDLING (if session crashed between task_init and task_complete):
    If task_list returns >1 task with title containing "R3 Campaign":
      Compare created_at timestamps. Keep the NEWEST. Note others for cleanup.
    If task status is stale (last update >24h ago):
      Read R3_CAMPAIGN_STATE.json for ground truth on actual batch progress.
    If CAMPAIGN_STATE.json and ATCS task disagree on batch number:
      Trust CAMPAIGN_STATE.json (written after each batch, more granular than ATCS).

CAMPAIGN END:
  prism_atcs action=task_complete task_id="[id]"  [effort=low]

CAMPAIGN STATE FILE (write after EACH batch, not just at MS completion):
  prism_doc action=write name=R3_CAMPAIGN_STATE.json  [effort=low]
  content='{ "campaign_id": "[id]", "total_batches": N, "completed_batches": N,
             "current_batch": N, "error_count": N, "quarantined_materials": [...], "last_update": "[ISO]" }'
```

## OPUS 4.6 PATTERNS FOR R3

```
PARALLEL BATCHES: 50 materials/batch via prism_orchestrate action=swarm_execute pattern="parallel_batch"
  Each material runs 5 operations concurrently. Results flushed per batch.
  SORT results by material+operation before flush (ORDERING RULE from §Parallel Execution).
  RATE LIMIT: Use p-queue with intervalCap matching API tier limits (see §Code Standards §Rate Limiting).
  250+ calcs at effort=max WILL hit Anthropic rate limits without throttling.
  
PFP AT MAX EFFORT: prism_pfp action=analyze (effort=max)
  Opus 4.6 OpenRCA: 34.9% (vs 26.9% Opus 4.5) — 30% better failure diagnosis.
  Feed richer context: machine hours, vibration patterns, historical failures.
  Cross-reference PFP predictions against R2 safety baselines for confidence calibration.

FAST MODE FOR DIAGNOSTICS: Batch status checks, progress reporting, health monitoring
  Use speed: "fast" for LOW effort operations during campaign execution.
  Reduces wall-clock time ~30% on admin overhead.

1M CONTEXT OPTION: For batch sessions processing >100 materials per session.
  Eliminates session splitting. Full batch results in working memory for cross-validation.
  Use when: batch size × avg result size > 100K tokens.

CONTEXT EDITING: Clear tool results from completed batches before starting next batch.
  Supplements flush-to-file. Keeps working memory clean across batch boundaries.
```

## GATE REQUIREMENTS (from Phase Template)
Ralph >= A- | Omega >= 0.70 | Build passes | PFP calibrated | No R2 regressions
