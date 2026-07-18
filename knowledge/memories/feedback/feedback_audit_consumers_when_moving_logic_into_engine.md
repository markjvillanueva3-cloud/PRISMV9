---
name: feedback_audit_consumers_when_moving_logic_into_engine
description: "When you fix an engine to fold a computation it previously only WARNED about (derate, clamp, correction) into its output, AUDIT every consumer for a compensating workaround that now double-counts."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.399Z
aliases: feedback_audit_consumers_when_moving_logic_into_engine
---


**The trap:** an engine emits an advisory value (a warning, a `*_impact.reduction_pct`) but does
NOT fold it into its headline output. Consumers, seeing the gap, build their OWN compensating
correction (`life *= keep`). Later you fix the engine to fold the correction into its output --
now EVERY consumer that already compensated DOUBLE-COUNTS it.

**Why:** [[feedback_run_full_affected_suite_before_green]] catches consumers whose TESTS pin the
value. But a consumer that re-implements the SAME physics (not just reads the value) is invisible to
the engine's OWN scrutiny -- the 3 reviewers reviewed UltimateSpeedFeedEngine in isolation and
correctly found no double-count WITHIN it; none looked at SpeedFeedNineAxisOrchestratorEngine, which
had `life *= keep` reading the same `runout_impact.life_reduction_pct`. Result: orchestrator
tool_life_min collapsed to raw * keep^2 (proven: engineFactor 0.884 single vs orchFactor 0.795 ~
0.884^2). U-OSC-RUNOUT-LIFE-DERATE (a8f72823cb) -> regression -> U-OSC-HOLDER-RUNOUT-DEDUP (73b97ef25f).

**How to apply (when an engine fix moves an advisory INTO the headline output):**
- Before committing, GREP every consumer of that engine for the SAME correction term -- the field
  name (`life_reduction_pct`, `runout_impact`), the operation (`* keep`, `* factor`, `-= derate`),
  and the output it touches (`tool_life`, `life_minutes`). A consumer that READS the advisory and
  applies it itself is now a double-count.
- This is R8 ("read the immediate CONSUMER before you write") in the reverse direction: usually R8
  means read what you call; here it means read what calls YOU.
- The fix is single-source-of-truth: the engine owns the model, consumers REMOVE their fork (R7 --
  do not leave both; R8 -- do not fork a second model). Keep the consumer's advisory WARNING if it
  was operator-facing, but strip the recomputation.
- Prove it with a ratio test that cancels co-varying derates: consumerFactor (with vs without the
  input, all else equal) must equal the engine's SINGLE-derate factor, NOT its square. A
  `toBeCloseTo(engineFactor)` + `> engineFactor^2 + eps` pair fails red on the double-count.

Related: [[reference_oscar_sfc_runout_life_derate_2026_06_09]] (the engine fix) ·
[[feedback_run_full_affected_suite_before_green]] · R7 surface-conflicts / R8 read-before-write.
