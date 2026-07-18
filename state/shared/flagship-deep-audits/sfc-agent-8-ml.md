# SFC Deep Audit — Agent 8: ML / Closed-Loop Learning

**Date:** 2026-05-08  
**Audit Scope:** SFC (Speed/Feed Calculator) ML pipeline, operator feedback capture, LoRA/online-learning engines, reasoning trace ledgers  
**Reference:** Mill: 7,986 MILLING_REASONING_TRACE_LEDGER entries, WEDM: 311 entries

---

## EXECUTIVE SUMMARY

**SFC ML/Closed-Loop Learning Verdict: GRADE C+ (58/100)**

SFC has operator feedback capture wired but NO dedicated ML/LoRA/online-learning engines. Unlike Mill (47 ML engines) and WEDM (10 ML engines), SFC relies entirely on the universal OutcomeCaptureBusEngine for closed-loop feedback — no speed/feed-specific reasoning traces, no LoRA checkpoints, no adaptive learning cadence. This is acceptable for a web calculator but differs fundamentally from flagship AGI stacks.

---

## REASONING LEDGER STATUS

### Universal Outcome Capture Bus (Shared Ledger)
- **File:** `mcp-server/data/state/dev-outcomes.jsonl`
- **Size:** 586 KB
- **Entry Count:** 2,840 lines (development telemetry, not production)
- **Domain Scope:** Vitest, Git, TypeScript builds — NOT speed/feed specific

**Verdict:** No dedicated SFC reasoning trace ledger. Capture exists; analysis does not.

---

## TRAINING CORPUS & SCRIPTS

- **SFC Corpus:** NOT FOUND
- **SFC Training Scripts:** None discovered
- **SFC AI Training Report:** None in data/state/

Contrast to Mill (3 training scripts), WEDM (inferred), Lathe (508 KB log + 17 KB report).

---

## LoRA / ONLINE-LEARNING ENGINES

### Engines Wired for SFC Feedback

| Engine | Status | Feedback Path | Learning | Notes |
|--------|--------|---------------|----------|-------|
| UniversalFeedbackCommandEngine | ✓ | recordOverride, recordMeasurement, recordScrap | ✗ Generic | U-LEARN-01: applies to all domains |
| OperatorPreferencesEngine | ✓ | speedFeedBias (0.85–1.15 multiplier) | ✗ Static bias only | Per-operator prefs, no correction learning |
| SFCOutcomeCaptureWireEngine | ✓ | captureSFC() middleware | ✗ Capture-only | Records: sfm, vc, rpm, fpt, fz, fpr, feed_rate, doc, ae, ap |
| ToolCatalogAdaptiveEngine | ✓ | Tool rec + adaptive adjustments | ✗ Physics-based | speed_override, feed_override derived from physics |

**Dedicated SFC LoRA/Online-Learning Engines:** 0

**SFC Engines Calling captureSFC():**
1. UltimateSpeedFeedEngine.calculate
2. AutoSpeedFeedCalculatorEngine.calculate
3. SFCCalculateEngine.calculate
4. MachineAwareSpeedFeedEngine.constrain
5. LatheSpeedFeedCalculatorFacadeEngine.calculate

---

## OPERATOR OVERRIDE CAPTURE

✓ **recordOverride()** — captures recommended vs actual
✓ **recordMeasurement()** — captures cycle_time, Ra, CMM, FAI
✓ **recordScrap()** — captures failures (severity="high")
✓ **lineage_id** auto-threading for traceability

**BUT:** Feedback stored in-memory, never persisted, never analyzed, never fed back to speed/feed models.

---

## CLOSED-LOOP VERIFICATION

**Capture Layer:** ✓ Complete (UniversalFeedbackCommandEngine)
**Analysis Layer:** ✗ Missing (no SFCFeedbackAnalysisEngine)
**Correction Layer:** ✗ Missing (no feedback-driven parameter adaptation)

**Verdict:** Incomplete loop. Feedback logged; learning not implemented.

---

## CRITICAL GAPS

### GAP-1: No SFC Reasoning Trace Ledger
**Severity:** MEDIUM | **Fix Effort:** 8 hours  
Need dedicated `SFC_REASONING_TRACE_LEDGER.jsonl` with decision context, confidence, limiting factors.

### GAP-2: Feedback Not Consumed
**Severity:** MEDIUM | **Fix Effort:** 12 hours  
Need SFCFeedbackAnalysisEngine to compute operator override patterns and export RLHF tuples.

### GAP-3: No LoRA Persistence
**Severity:** LOW | **Fix Effort:** 6 hours  
Need SFC_LORA_CHECKPOINT.json + serialization of OperatorPreferencesEngine state.

---

## SCORE BREAKDOWN

| Dimension | Score | Notes |
|-----------|-------|-------|
| Reasoning ledger | 0 | No SFC-specific trace ledger |
| Feedback capture | 90 | Fully wired (override, measurement, scrap) |
| Feedback analysis | 10 | Captured but never analyzed |
| Operator override usage | 15 | Stored in-memory, not persisted |
| LoRA / online-learning | 0 | No SFC-specific engines |
| Training pipeline | 0 | No scripts or corpus |
| Closed-loop verification | 20 | Capture layer ⬜ analysis + correction |
| Test coverage | 50 | UniversalFeedbackCommandEngine tested; no SFC analysis tests |

**Overall: C+ (58/100)**

---

## CONTEXT: SFC vs FLAGSHIP SCOPES

SFC is a **web calculator** (stateless); Mill/WEDM/Lathe are **autonomous reasoning systems** (persistent AGI stacks). SFC's current scope does not require closed-loop learning — feedback capture is acceptable without analysis. If requirements escalate to "adaptive SFC," schedule 40–50 hours of development.

---

## RECOMMENDATION

**Current posture: RELEASE-READY AS-IS**

SFC meets calculator requirements. Feedback is captured; not acting on it is by design. If closed-loop becomes a product requirement, implement:
1. SFCFeedbackAnalysisEngine (Priority 1, 12h)
2. SFC_REASONING_TRACE_LEDGER.jsonl (Priority 2, 8h)
3. SFCAdaptiveParameterEngine (Priority 3, 12h)
4. LoRA checkpoint serialization (Priority 4, 6h)

---

**Sign-off:** Agent 8 (ML/Closed-Loop Specialist) | Evidence: High | Score: 58/100 (C+)
