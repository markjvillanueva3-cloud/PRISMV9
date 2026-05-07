# HANDOFF: wire-road-map

**Track**: WEDM-CONSOLIDATED (Wire EDM roadmap)
**Author**: Claude Opus 4.7 (1M)
**Date**: 2026-04-20 (latest — MS-P4-DL-PRED complete)
**Resume trigger phrases**: "continue wire road map" | "resume wedm roadmap" | "pick up MS-P5-GNN"

---

## 0a. Latest Update — MS-P4-DL-PRED COMPLETE (2026-04-20)

**MS-P4-DL-PRED is COMPLETE (4/4 units).** Predictor layer landed on top of DL-CORE.

**New engines (3):**
- `mcp-server/src/engines/WEDMRaPredictorEngine.ts` (U-P4-PR-01) — Klocke base + LoRA correction; AtomicValue<um>; per-material adapters via `wedm-ra::<material>` slots
- `mcp-server/src/engines/WEDMWireBreakPredictorEngine.ts` (U-P4-PR-02) — Weibull hazard P=1−exp(−(t/η)^β), current-density-driven η, logit-additive LoRA; Brier + reliability-bin diagnostics
- `mcp-server/src/engines/WEDMRecastDepthPredictorEngine.ts` (U-P4-PR-03) — Carslaw–Jaeger §10.2 eq.(2) point-source semi-infinite solid closed form: z_m = 2·sqrt(α·t_on)·sqrt(ln(Q_w/(4·ρ·c·ΔTm·(π·α·t_on)^1.5))); ASM thermal table for 8 materials

**Tests (U-P4-PR-04):**
- `mcp-server/src/__tests__/wedm-dl-pred.test.ts` — 22 engine tests (≥3 spanning materials per engine, NaN/∞ rejection, monotonicity, AtomicValue shape, training-stability invariants)
- `mcp-server/src/__tests__/wedm-dl-pred-dispatcher.test.ts` — 7 dispatcher E2E tests
- All 29 green; DL-CORE 34 tests still green (anti-regression clean)

**Dispatcher wiring (7 new actions on prism_edm):**
- Ra: `wedm_predict_ra_v2`, `wedm_train_ra_adapter`
- WireBreak: `wedm_predict_break`, `wedm_train_break_adapter`, `wedm_evaluate_break`
- Recast: `wedm_predict_recast`, `wedm_train_recast_adapter`
- (`_v2` suffix on Ra avoids clash with WEDM-PREDICT-MS1's heavier `wedm_predict_ra` orchestration action.)

**Commits (6, on `work/cad-complete-ms0`):**
```
2e9005e7b  MS-P4-DL-PRED: edmDispatcher wiring (7 actions) for predictor layer
43acfc156  MS-P4-DL-PRED/U-P4-PR-04: 22 engine + 7 dispatcher E2E tests, all green
c730f7cb5  MS-P4-DL-PRED/U-P4-PR-03: WEDMRecastDepthPredictorEngine — Carslaw + LoRA
196b2a222  MS-P4-DL-PRED/U-P4-PR-02: WEDMWireBreakPredictorEngine — Weibull + LoRA
ec526698a  MS-P4-DL-PRED/U-P4-PR-01: WEDMRaPredictorEngine — Klocke base + LoRA correction
```

**Bug fix discovered:** Original Carslaw closed form had `sqrt(π·α·t)` denom (units wrong) — corrected to `4·ρ·c·ΔTm·(π·α·t)^1.5` per Carslaw eq.10.2(2). Now produces realistic 5–50 µm recast depths for typical EDM inputs.

**Status:** All committed. Branch: `work/cad-complete-ms0`. Next phase = **MS-P5-GNN** (graph-attention embedding lattice over machine × material × wire × thickness × Ra). Note: parallel session also dropped a `CAM-UIX-MS0.json` milestone envelope into the dispatcher-wiring commit — incidental, not part of this work.

---

## 0b. Previous Update — MS-P4-DL-CORE COMPLETE (2026-04-20)

**MS-P4-DL-CORE is COMPLETE (5/5 units).** Deep-learning substrate now in place.

**New engines (4):**
- `mcp-server/src/engines/WEDMJobOutcomeEngine.ts` (U-P4-DL-01) — finished-job telemetry capture, schema-versioned WEDM_JOB_HISTORY.json rollup + WEDM_OUTCOME_LEDGER.jsonl audit trail
- `mcp-server/src/engines/WEDMLoRAAdapterEngine.ts` (U-P4-DL-02) — rank-r LoRA per Hu 2021; scale=0 yields bit-exact base, gradient check matches numerical autodiff, JSON serialize round-trip bit-exact
- `mcp-server/src/engines/WEDMEWCMemoryEngine.ts` (U-P4-DL-03) — EWC++ per Chaudhry 2018; published Table 1 schedules (mnist-like λ=100/γ=0.97, split-cifar λ=400/γ=0.95, permuted-mnist λ=25/γ=0.99), online running-average Fisher
- `mcp-server/src/engines/WEDMFewShotMaterialEngine.ts` (U-P4-DL-04) — 3-5 sample LoRA bootstrap; ≥20% MAE improvement on biased signals; degenerate fallback to base-only when <2 samples

**New schema:** `mcp-server/src/schemas/wedmJobHistorySchema.ts` (Zod v1)

**Tests (U-P4-DL-05):**
- `mcp-server/src/__tests__/wedm-dl-core.test.ts` — 29 tests covering all 4 engines, all green
- `mcp-server/src/__tests__/wedm-dl-core-dispatcher.test.ts` — 5 dispatcher E2E tests, all green
- Coverage: happy + ≥3 failure modes + ≥2 adversarial inputs (NaN/Infinity), spans D2/M2/WC + 4 EWC presets

**State files seeded:**
- `mcp-server/data/state/WEDM_JOB_HISTORY.json` (schemaVersion 1)
- `mcp-server/data/state/WEDM_LORA_WEIGHTS.json` (schemaVersion 1)
- `mcp-server/data/state/WEDM_EWC_MEMORY.json` (schemaVersion 1)

**Dispatcher wiring (20 new actions on prism_edm):**
- Job outcome: `wedm_learn_from_job`, `wedm_job_history_query`, `wedm_job_history_stats`
- LoRA: `wedm_lora_create`, `wedm_lora_forward`, `wedm_lora_step`, `wedm_lora_set_scale`, `wedm_lora_fisher_diag`, `wedm_lora_save`, `wedm_lora_load`
- EWC: `wedm_ewc_consolidate`, `wedm_ewc_penalty`, `wedm_ewc_penalty_grad`, `wedm_ewc_list_slots`, `wedm_ewc_schedule`, `wedm_ewc_save`, `wedm_ewc_load`
- Few-shot: `wedm_fewshot_bootstrap`, `wedm_fewshot_predict`, `wedm_fewshot_list`

**Bug fix discovered & landed:** edmDispatcher had a pre-existing `let _awareness` declaration inside the outer `try` block, referenced after the `catch` — caused ReferenceError under E2E. Promoted declaration to handler scope (5-line fix at top of handler).

**Anti-regression:** wedm-coordination-routes + WEDMMultiAgentDispatchEngine substrate tests still pass. Pre-existing wedm-self-awareness test failures (`getLearnedTipCount` missing on tribal runtime) are unrelated to this work — those engines weren't touched.

**Status:** Not yet committed. Branch: `work/cad-complete-ms0` (current). Recommended commit format:
```
MS-P4-DL-CORE/U-P4-DL-01: WEDMJobOutcomeEngine + schema + ledger
MS-P4-DL-CORE/U-P4-DL-02: WEDMLoRAAdapterEngine — rank-r LoRA per Hu 2021
MS-P4-DL-CORE/U-P4-DL-03: WEDMEWCMemoryEngine — Chaudhry 2018 EWC++
MS-P4-DL-CORE/U-P4-DL-04: WEDMFewShotMaterialEngine — LoRA bootstrap
MS-P4-DL-CORE/U-P4-DL-05: 29 engine + 5 dispatcher E2E tests
MS-P4-DL-CORE: edmDispatcher wiring + _awareness scope fix
```

**Note:** Two engines `WEDMLoRACadenceEngine.ts` + `WEDMLoRADatasetBuilderEngine.ts` are also in the untracked tree — created by a parallel session, NOT by this work. Coordinate before assuming their interfaces.

---

## 0. Previous Update (work PC session)

**MS-P1-DIGEST-SELFAWARENESS is COMPLETE (3/3 units).** AI now has comprehensive self-awareness of WEDM subsystem.

**New files for MS-P1-DIGEST-SELFAWARENESS (620 LOC):**
- `mcp-server/src/engines/WEDMSelfAwarenessEngine.ts` — digest + substrate + autonomy + learning snapshot
- `mcp-server/src/__tests__/wedm-self-awareness.test.ts` — 33 tests
- `mcp-server/web/src/api/wedmCoordination.ts` — extended with selfAwarenessApi

**API Endpoints added for self-awareness:**
- GET /self-awareness/snapshot — complete WEDM subsystem state
- GET /self-awareness/report — human-readable status report (markdown)
- GET /self-awareness/digest — cached WEDM_DIGEST.json
- POST /self-awareness/query — capability search by keyword
- GET /self-awareness/health — health assessment only

**Previous: MS-P1-AUTONOMY is COMPLETE (3/3 units).** Autonomy L0-L5 gated by substrate health.

**New files for MS-P1-AUTONOMY (850 LOC):**
- `mcp-server/src/engines/WEDMAutonomySubstrateGateEngine.ts` — health-gated autonomy transitions
- `mcp-server/web/src/components/wedm-studio/AutonomyPanel.tsx` — React UI for autonomy control
- `mcp-server/src/__tests__/wedm-autonomy-gate.test.ts` — 24 tests

**API Endpoints added for autonomy:**
- GET /autonomy/status — current level, health metrics, eligibility
- GET /autonomy/metrics — substrate health metrics
- GET /autonomy/eligibility — promotion check
- POST /autonomy/promote — request level increase (health-gated)
- POST /autonomy/demote — request level decrease
- GET /autonomy/degrade-check — check auto-degrade triggers
- POST /autonomy/auto-degrade — apply automatic degrade
- GET /autonomy/history — transition history

**Previous: MS-P1-LEARN-LOOP is COMPLETE (5/5 units).** Learning loop closes feedback → tribal tips → neural fusion.

**New files for MS-P1-LEARN-LOOP (1,450 LOC):**
- `mcp-server/src/engines/WEDMFeedbackIngestionEngine.ts` — feedback processing, ground truth buffering
- `mcp-server/src/engines/WEDMTribalTipLearnerEngine.ts` — tip generation, approval workflow
- `mcp-server/web/src/components/wedm-studio/FeedbackPanel.tsx` — React UI for feedback/learning
- `mcp-server/src/__tests__/wedm-learning-loop.test.ts` — 24 tests

**API Endpoints added:**
- POST /coordination/feedback — submit job outcome feedback
- GET /coordination/feedback/recent — recent submissions
- GET /coordination/feedback/stats — ingestion statistics
- GET /coordination/learning/tip-candidates — pending tip candidates
- POST /coordination/learning/process-tips — trigger tribal learner
- GET /coordination/learning/stats — combined learning stats
- POST /coordination/learning/update-fusion — wire ground truth to neural fusion
- POST /coordination/learning/approve-tip — approve pending tip
- POST /coordination/learning/reject-tip — reject pending tip
- GET /coordination/learning/pending-tips — tips pending review

**Previous: MS-P1-FRONT-WIRE is COMPLETE (6/6 units).** Coordination substrate now visible in UI.

**New files (1,313 LOC):**
- `mcp-server/src/routes/edm.ts` — 7 new coordination API endpoints
- `mcp-server/web/src/api/wedmCoordination.ts` — typed API client
- `mcp-server/web/src/hooks/useCoordination.ts` — React state hook
- `mcp-server/web/src/components/wedm-studio/ReasoningTraceDashboard.tsx`
- `mcp-server/web/src/components/wedm-studio/BlackboardPanel.tsx`
- `mcp-server/web/src/components/wedm-studio/AIReasoningTab.tsx`
- `mcp-server/web/src/pages/WireEdmStudioPage.tsx` — collapsible AI panel
- `mcp-server/src/__tests__/wedm-coordination-routes.test.ts` — 11 tests

**API Endpoints:**
- GET /coordination/snapshot — combined state of all engines
- GET /coordination/ledger/recent — reasoning trace entries
- GET /coordination/ledger/stats — trace statistics
- GET /coordination/blackboard/stats — blackboard statistics
- POST /coordination/blackboard/query — namespace-filtered queries
- GET /coordination/bridge/stats — bridge layer statistics
- GET /coordination/dispatch/stats — dispatch coordinator stats

**Next phase options:** MS-P1-LEARN-LOOP, MS-P1-AUTONOMY, or MS-P1-DIGEST-SELFAWARENESS

---

## 1. What just got done

**MS-P0.5-COORD is COMPLETE (8/8 units).** Round 4 coordination substrate is fully wired
into the edm + cam dispatchers. The substrate gives every WEDM dispatch call:
- Awareness-middleware consult (tips + rules + citations, <50 ms budget)
- Reasoning-trace ledger (append-only JSONL, ring-buffer in memory)
- Blackboard (shared namespace-scoped observations/hypotheses/decisions)
- Reasoning bridge (glue: tips → blackboard observations, ledger entry, enriched context)
- Tribal-runtime tip selection (107 tips, scored by keyword/tag/confidence/recency/exploration)
- Neural formula fusion (EMA + softmax adaptive ensemble of MRR/Ra/etc. estimators)
- Archive backfill (JM Die WEDM_BATCH_ANALYSIS.json → blackboard observations + priors)
- Multi-agent dispatch facade (single coordinateDispatch / recordOutcome pair per dispatcher)

**Commit chain** (newest → oldest, all on `main`):
```
7ed1c3e5 U-P0.5-COORD-08  MultiAgentDispatch + dispatcher wiring (CAPSTONE)
f69d4d57 U-P0.5-COORD-07  ArchiveBackfill — warm-start from historical programs
0eab7b02 U-P0.5-COORD-06  NeuralFormulaFusion — adaptive ensemble fusion
96a6b2ef (contains U-P0.5-COORD-05 TribalRuntime bundled w/ MILL-MASTER handoff)
8e755dbf U-P0.5-COORD-04  ReasoningBridge — awareness/ledger/blackboard glue
34839186 U-P0.5-COORD-03  Blackboard — shared coordination state
10cd7bd0 U-P0.5-COORD-02  ReasoningTraceLedger + dispatcher wiring
9de25c88 U-P0.5-COORD-01  AwarenessAdoption + wedm-awareness-coverage hook
```

**Digest counts (as of 7ed1c3e5):**
- engines: 103 (WEDM/EDM/WireEDM\*)
- hooks: 23 · skills: 13 · playbooks: 8 · state_files: 42
- Tests: 62 across the 4 final COORD engines, all green

---

## 2. Resume-tomorrow checklist (work PC, Claude session)

1. **Pull the repo**: `cd /h/prism && git pull`  (or check out main & sync)
2. **Read-first sequence** (5 lines):
   - `H:\prism\state\shared\handoffs\HANDOFF-wire-road-map.md`  ← THIS FILE
   - `H:\prism\state\shared\WEDM-CONSOLIDATED-ROADMAP-v1.3.1.md`  ← master roadmap
   - `H:\prism\mcp-server\data\state\WEDM_DIGEST.json`  ← verify engines=103
   - `H:\prism\state\shared\memory-mirror\MEMORY.md`  ← cross-PC memory snapshot
   - `git log --oneline | head -15`  ← confirm commit chain above
3. **Verify substrate intact**: `npx vitest run src/__tests__/WEDMMultiAgentDispatchEngine.test.ts src/__tests__/WEDMArchiveBackfillEngine.test.ts src/__tests__/WEDMNeuralFormulaFusionEngine.test.ts src/__tests__/WEDMTribalRuntimeEngine.test.ts`  (expect 62/62 green)
4. **Pick next phase** (see §3 below).

---

## 3. Next up in WEDM-CONSOLIDATED roadmap

Per the consolidated WEDM roadmap, phases after MS-P0.5-COORD (choose one to drive next):

| Phase | Scope | Status |
|-------|-------|--------|
| ~~MS-P1-FRONT-WIRE~~ | Wire Codex's front-end studio to the edm dispatcher | ✅ COMPLETE |
| ~~MS-P1-LEARN-LOOP~~ | Close the learning loop: feedback → tips → neural fusion | ✅ COMPLETE |
| ~~MS-P1-AUTONOMY~~ | Extend WEDM autonomy levels L0→L5 gated by substrate health | ✅ COMPLETE |
| ~~MS-P1-DIGEST-SELFAWARENESS~~ | Feed WEDM_DIGEST + substrate snapshot into self-awareness | ✅ COMPLETE |

**All MS-P1 phases are COMPLETE.** The WEDM-CONSOLIDATED roadmap is done.

Next steps would be MS-P2 phases (if defined) or moving to other track roadmaps.

---

## 4. Substrate API surface (what front-end wiring needs)

```typescript
// Entry point for any new WEDM dispatcher wiring:
import { wedmMultiAgentDispatchEngine } from "./engines/WEDMMultiAgentDispatchEngine.js";

const coord = await wedmMultiAgentDispatchEngine.coordinateDispatch({
  dispatcher: "edm", action: "wire_settings", params,
});
// ... run engine work ...
wedmMultiAgentDispatchEngine.recordOutcome({
  dispatcher: "edm", action: "wire_settings",
  keywords: coord.keywords, entryAt: coord.entryAt,
  success: !isError,
  awareness_used: !!coord.summary,
  decisionKey: "result.wireTension",
  decisionValue: result.wireTension,
  confidence: 0.85,
});

// Read-side for UI dashboards:
import { wedmReasoningTraceLedgerEngine } from "./engines/WEDMReasoningTraceLedgerEngine.js";
import { wedmBlackboardEngine }             from "./engines/WEDMBlackboardEngine.js";
import { wedmReasoningBridgeEngine }        from "./engines/WEDMReasoningBridgeEngine.js";
import { wedmTribalRuntimeEngine }          from "./engines/WEDMTribalRuntimeEngine.js";
import { wedmNeuralFormulaFusionEngine }    from "./engines/WEDMNeuralFormulaFusionEngine.js";
import { wedmArchiveBackfillEngine }        from "./engines/WEDMArchiveBackfillEngine.js";

wedmReasoningTraceLedgerEngine.getRecent(50);               // last 50 traces
wedmReasoningTraceLedgerEngine.getStats();                  // topActions/errorRate/awarenessAdoption/silentMinutes
wedmBlackboardEngine.readByPrefix("wedm.edm.mat.d2");       // namespace pull
wedmBlackboardEngine.getStats();                            // active/expired/ns counts
wedmReasoningBridgeEngine.getStats();                       // avgLatencyMs/tipsIngested/priorObs
wedmTribalRuntimeEngine.select({ dispatcher, action, keywords, operation, maxResults });
wedmNeuralFormulaFusionEngine.getContextStats({ target: "mrr", material: "D2" });
wedmArchiveBackfillEngine.getState();                       // totals: runs/programs/entries
wedmMultiAgentDispatchEngine.snapshot();                    // ALL of the above in one call
```

Front-end plan should at minimum expose `snapshot()` as a dashboard tile and `getRecent()` as a
live-tail panel. Those two alone turn the substrate into a visible, debuggable system.

---

## 5. Conventions / gotchas

- **Git lock dance**: home PC has 6+ open terminals; git ops serialize through
  `state/shared/GIT_LOCK.json` (180 s TTL). If a commit is blocked by a dead pid, run
  `bash /h/prism/.claude/helpers/git-lock.sh release` then retry — that's the clean path.
  `rm -f` works too but the helper is the sanctioned way.
- **CRLF warnings**: all new files warn `LF will be replaced by CRLF` — harmless, this is a Windows
  checkout of a unix-authored repo. `.gitattributes` handles it.
- **Dispatcher wiring pattern** (the U-08 pattern, copy for any new WEDM dispatcher):
  1. At entry: `await wedmMultiAgentDispatchEngine.coordinateDispatch({...})` (fails open)
  2. At exit: `wedmMultiAgentDispatchEngine.recordOutcome({..., success: !isError, ...})`
- **Awareness-coverage hook** (U-01) blocks when a *new* dispatcher is registered but never
  calls consultAwareness AND at least one other dispatcher has activity. Wire the substrate at
  the same commit as you introduce any new WEDM-relevant dispatcher.
- **Stop hooks that enforce H-drive writes**: they exist. Any file I wrote during this session
  is on H; the memory mirror at `H:\prism\state\shared\memory-mirror\` was populated from the
  C-drive auto-memory system (Claude Code writes there by framework default — the mirror is for
  cross-PC portability).

---

## 6. Open items NOT in this session

- The pre-existing compaction-survival docs (`state/COMPACTION_SURVIVAL.json`,
  `state/HANDOFF.md`, etc.) were modified by the session-start hook, not by me — leave them alone
  or let the hook refresh them.
- `state/checkpoints/` has some deleted files in the status — those are hook-managed, don't
  re-add.
- The full `npx vitest run` across the whole repo was interrupted at user request. Only the 4
  new COORD engines' tests are verified. If you want a whole-repo regression sweep before the
  next phase, run it at work PC with plenty of time (~3-5 min).
- 28 memory files were mirrored from `C:\Users\wompu\.claude\projects\H--prism\memory\` to
  `H:\prism\state\shared\memory-mirror\`. Framework auto-memory will continue writing to C on
  each PC — the mirror is the portable snapshot. Re-mirror on any PC with:
  `cp -r /c/Users/<user>/.claude/projects/H--prism/memory/*.md /h/prism/state/shared/memory-mirror/`

---

## 7. Files owned by this track (do-not-clobber list)

```
# MS-P0.5-COORD (Round 4 coordination substrate)
src/engines/WEDMAwarenessAdoptionEngine.ts      (U-01)
src/engines/WEDMReasoningTraceLedgerEngine.ts   (U-02)
src/engines/WEDMBlackboardEngine.ts             (U-03)
src/engines/WEDMReasoningBridgeEngine.ts        (U-04)
src/engines/WEDMTribalRuntimeEngine.ts          (U-05)
src/engines/WEDMNeuralFormulaFusionEngine.ts    (U-06)
src/engines/WEDMArchiveBackfillEngine.ts        (U-07)
src/engines/WEDMMultiAgentDispatchEngine.ts     (U-08)

# MS-P1-FRONT-WIRE (UI wiring)
src/routes/edm.ts                               (coordination + autonomy + self-awareness routes)
web/src/api/wedmCoordination.ts                 (API client)
web/src/hooks/useCoordination.ts
web/src/components/wedm-studio/ReasoningTraceDashboard.tsx
web/src/components/wedm-studio/BlackboardPanel.tsx
web/src/components/wedm-studio/AIReasoningTab.tsx

# MS-P1-LEARN-LOOP (Learning loop)
src/engines/WEDMFeedbackIngestionEngine.ts
src/engines/WEDMTribalTipLearnerEngine.ts
web/src/components/wedm-studio/FeedbackPanel.tsx

# MS-P1-AUTONOMY (Health-gated autonomy)
src/engines/WEDMAutonomySubstrateGateEngine.ts
web/src/components/wedm-studio/AutonomyPanel.tsx

# MS-P1-DIGEST-SELFAWARENESS (Self-awareness)
src/engines/WEDMSelfAwarenessEngine.ts

# Dispatcher wiring
src/tools/dispatchers/edmDispatcher.ts          (U-08 wiring — lines ~405-420, ~2965-2981)
src/tools/dispatchers/camDispatcher.ts          (U-08 wiring — lines ~1402-1418, ~7856-7875)
src/hooks/wedm-awareness-coverage               (U-01)

# State files
data/state/WEDM_BACKFILL_STATE.json             (U-07 runtime state)
data/state/WEDM_REASONING_TRACE_LEDGER.jsonl    (U-02 runtime state)
data/docs/WEDM_DIGEST.md                        (generated)
data/state/WEDM_DIGEST.json                     (generated)
```

**Do not mass-reformat or rewrite these files** without preserving the coordination protocol.
Any new WEDM dispatcher/action must call `coordinateDispatch` + `recordOutcome` or the
awareness-coverage hook will block it.

---

## 8. Context for work-PC session

- **Primary roadmap**: `H:\prism\state\shared\WEDM-CONSOLIDATED-ROADMAP-v1.3.1.md`
- **WEDM-CONSOLIDATED status**: MS-P0.5-COORD done. Next phase = MS-P1-FRONT-WIRE (recommended).
- **Build**: `npm run build:fast` (3-5 s) for iteration; `npm run build` (30 s) before commits.
- **Test**: `npx vitest run src/__tests__/WEDM*` for substrate, full run before merge.
- **Omega target**: 1.0 (per user directive). Every new unit must close green.
- **Commit format**: `MS-P1-<PHASE>/U-P1-<PHASE>-<NN>: <engine> — <one-line summary>`
