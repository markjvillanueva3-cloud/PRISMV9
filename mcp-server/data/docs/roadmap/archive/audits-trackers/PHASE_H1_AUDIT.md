# H1 ROADMAP AUDIT — Gaps, Pitfalls, Synergy Analysis
## Date: 2026-02-19 | Auditor: Architecture + Integration Review

---

## CRITICAL FINDINGS

### 1. DUPLICATE INFRASTRUCTURE — observationLedger.ts reinvents existing systems

**Problem:** The roadmap proposes a NEW `observationLedger.ts` with JSONL append-only logging. But we ALREADY HAVE:
- `RECENT_ACTIONS.json` — written by autoHookWrapper, tracks last N tool calls with result previews
- `DECISION_LOG.jsonl` — exists at `C:\PRISM\state\DECISION_LOG.jsonl`
- `ERROR_LOG.jsonl` — exists at `C:\PRISM\state\ERROR_LOG.jsonl`
- `LEARNING_LOG.jsonl` — exists at `C:\PRISM\state\LEARNING_LOG.jsonl`
- `SESSION_JOURNAL.jsonl` — exists at `C:\PRISM\state\SESSION_JOURNAL.jsonl`
- `session_events.jsonl` — exists at `C:\PRISM\state\session_events.jsonl`
- `session_history.jsonl` — exists at `C:\PRISM\state\session_history.jsonl`
- `MemGraph.captureDispatch()` — already records dispatcher calls as graph nodes
- `RECOVERY_MANIFEST.json` — already a session state snapshot
- `HANDOFF_PACKAGE.json` — already a cross-session resume package

**Impact:** Building observationLedger.ts would create a 7th parallel logging system. None of these existing systems are being READ at boot or during sessions.

**Fix:** Don't create new files. Wire existing RECENT_ACTIONS.json + MemGraph.captureDispatch() into boot injection. Consolidate existing JSONL files into one authoritative source.

### 2. SESSION_BOOT ALREADY READS 6+ STATE FILES — but nobody uses the output

**Problem:** devDispatcher.ts `session_boot` handler (lines 68-237+) already reads:
- CURRENT_STATE.json (quick_resume)
- ACTION_TRACKER.md (completed/pending items)
- PRIORITY_ROADMAP.md (roadmap items)
- warm_start data (registry status, recent errors, top failures)
- RECENT_ACTIONS.json (last 5 actions for compaction recovery)
- RECOVERY_MANIFEST.json (age, next_action, current_task, active_files)
- HANDOFF_PACKAGE.json (structured cross-session resume)
- COMPACTION_SURVIVAL.json

**Impact:** The roadmap says "session_boot reads HOT_RESUME (manual seed)" — this is WRONG. Boot already reads 8 state files. The problem isn't that boot doesn't read enough — it's that (a) the data in these files is stale/inaccurate, and (b) the output is too large and gets ignored in the response.

**Fix:** Instead of adding MORE boot injection, fix the QUALITY of existing injections. Slim the boot response to ≤500 tokens total. Ensure RECENT_ACTIONS.json is always fresh.

### 3. DECISION JOURNAL ALREADY EXISTS

**Problem:** H1-11 proposes creating `decisionJournal.ts` with DECISIONS.jsonl. But:
- `DECISION_LOG.jsonl` already exists in state/
- `prism_guard:decision_log` action already writes decision entries
- `prism_memory:trace_decision` already traverses MemGraph for decision chains

**Impact:** Creating a parallel system fragments decision data across two locations.

**Fix:** Wire existing decision_log into the boot injection path. Add the missing fields (alternatives, reasoning) to the existing schema rather than creating a new file.

### 4. MS5 COMPACTION DEFENSE — checkpoints/ DIRECTORY ALREADY EXISTS

**Problem:** H1-15 proposes creating `C:\PRISM\state\CHECKPOINTS\CP-{timestamp}.json`. The directory already exists:
- `C:\PRISM\state\checkpoints\` — present
- `checkpoint_index.json` — present
- `autoCheckpoint` cadence fires at call 10+

**Impact:** Building a new checkpoint system would duplicate existing functionality.

**Fix:** Audit what the existing checkpoints contain, fix quality/freshness issues, and wire into compaction recovery.

### 5. PARAM CONTRACTS — KNOWN_RENAMES ALREADY HAS 190 ENTRIES

**Problem:** H1-5 proposes building a new paramContracts.ts. But `prism_guard:pre_call_validate` already has 190 KNOWN_RENAMES that handle legacy → current mappings.

**Impact:** Partial duplicate. The existing system handles renames but not type validation or auto-normalization.

**Fix:** Extend KNOWN_RENAMES with snake_case → camelCase mappings for safety/calc dispatchers specifically. Add auto-normalization at the dispatcher entry point, not a new file.

---

## SYNERGY GAPS

### 6. MemGraph.captureDispatch() NOT CONNECTED TO BOOT

MemGraph already captures every dispatch call as a graph node. 412 nodes exist. But session_boot never queries MemGraph for relevant history. This is the exact M3 gap from the claude-mem doc — and it's a 5-line fix in devDispatcher.ts, not a new engine.

### 7. PFP LEARNS FROM ERRORS BUT DOESN'T SHARE AT BOOT

PFP engine tracks failure patterns and has a pre-filter. But the error patterns aren't injected at boot. When a new session starts, PFP has the data but Claude doesn't see it until a failure triggers the pre-filter.

**Fix:** At boot, query `pfpEngine.getTopFailures(5)` and inject as "known issues" in boot response.

### 8. TELEMETRY TRACKS PERFORMANCE BUT ISN'T USED FOR PARAM VALIDATION

Telemetry records duration_ms per dispatcher+action. Unusually long durations often indicate param issues (engine doing fallback/retry). This signal could feed into param contract validation.

### 9. CADENCE_VERBOSITY SUPPRESSES OUTPUT BUT OBSERVATIONS STILL FIRE

The cadence functions (autoAgentRecommend, autoSkillHint, etc.) still execute on every call even with CADENCE_VERBOSITY=critical. They write to various state files. The ONLY thing suppressed is the response injection. This means the observation data IS being captured — it's just not queryable.

**Fix:** Make existing cadence writes queryable by adding read functions, not by creating new write paths.

### 10. SMOKE TESTS NEED ENGINE ACCESS, NOT DISPATCHER ACCESS

H1-8 proposes calling speed_feed, thread_calc, etc. at startup. But these go through dispatchers which go through autoHookWrapper which does cadence. Smoke tests should call engine functions directly to avoid side effects.

---

## MISSING FROM ROADMAP

### 11. STATE DIRECTORY CLEANUP

`C:\PRISM\state\` has 300+ files, many are stale scripts, audit outputs, and temp files from past sessions. These are never cleaned up and create confusion about what's authoritative.

**Add:** State hygiene step — archive old scripts/audits, establish clear ownership for each state file.

### 12. OBSERVATIONS.jsonl ROTATION STRATEGY IS INCOMPLETE

500KB max then rotate is mentioned, but no strategy for:
- What happens to rotated files? Are they queryable?
- Cross-session queries need to span rotated files
- How many rotations before disk fills up?

### 13. NO METRICS ON THE IMPROVEMENTS

No baseline measurements defined for:
- Current compaction recovery call count (to measure improvement)
- Current boot time (to ensure smoke tests don't regress it)
- Current param error rate per session

**Add:** Baseline metrics collection step before implementation begins.

### 14. COMPLIANCE/TENANT INTEGRATION

H1 doesn't mention how observations/decisions interact with:
- prism_compliance (F8) — should observations be audit-logged?
- prism_tenant (F5) — should observations be tenant-scoped?

These are F1-F8 systems we just verified as active. New data flows should respect them.

---

## REVISED APPROACH

Instead of 5 milestones creating 4 new files, the audit suggests:

### MS1-REVISED: Fix Existing Systems (not new ones)
1. Audit RECENT_ACTIONS.json — verify it's being written fresh on every call
2. Audit MemGraph.captureDispatch() — verify nodes are accumulating
3. Audit existing checkpoints — verify checkpoint_index.json is current
4. Slim session_boot response to ≤500 tokens (it's currently massive)
5. Add MemGraph query to boot: last 10 decisions for current phase
6. Add PFP top-5 failures to boot injection
7. Fix auto-HOT_RESUME by generating from RECENT_ACTIONS + MemGraph (not new JSONL)

### MS2-REVISED: Param Normalization (extend existing, don't create new)
1. Add snake_case → camelCase mappings to KNOWN_RENAMES for safety/calc/thread actions
2. Wire auto-normalization into dispatcher entry (before handler call)
3. Log remapped params to existing ERROR_LOG.jsonl with type="param_remap"

### MS3-REVISED: Boot Smoke Tests (still valid, but call engines directly)
1. Create smokeTest.ts — calls engine functions, not dispatchers
2. Wire into startup after dispatcher registration
3. Post-build verification script (verify-build.ps1)

### MS4-REVISED: Cross-Session Learning (extend MemGraph, not new files)
1. Add "outcome" field to MemGraph.captureDispatch() (currently missing)
2. Add "alternatives_rejected" field to existing decision_log writes
3. Create query function: getRelevantHistory(context) → last 10 relevant nodes
4. Wire error→fix tracking into existing LEARNING_LOG.jsonl (already has the structure)

### MS5-REVISED: Compaction Defense (fix existing checkpoint system)
1. Audit existing autoCheckpoint cadence — is it writing?
2. Fix checkpoint quality (include position, recent decisions, todo items)
3. Wire compaction recovery to read latest checkpoint instead of HOT_RESUME
4. Generate HOT_RESUME FROM checkpoint (not the other way around)

---

## DEPENDENCY MATRIX (revised)

```
MS1 (fix existing) ─→ MS4 (extend MemGraph learning) ─→ MS5 (checkpoint defense)
     │                                                         ↑
     └─→ MS2 (param normalization) ─→ MS3 (smoke tests) ──────┘
```

MS1 must come first — it verifies what's working and what's broken.
MS2+MS3 can run in parallel after MS1.
MS4 depends on MS1 (need working MemGraph queries).
MS5 depends on MS4 (checkpoints include decision context).

---

## TOKEN BUDGET (revised)

| System | Current | After | Change |
|--------|---------|-------|--------|
| Boot response | ~800 tokens (8 state files, mostly ignored) | ~400 tokens (slimmed, relevant only) | -400 |
| Cadence output | ~5-10 (critical only, already done) | Same | 0 |
| Per-call overhead | ~30 (RECENT_ACTIONS write + MemGraph capture) | ~35 (add outcome field) | +5 |
| Recovery | ~500-1000 | ~150-300 (checkpoint-based) | -400 |
| **NET PER SESSION** | | | **~800-1200 saved** |

More conservative than original estimate, but more realistic because we're not adding new write paths.
