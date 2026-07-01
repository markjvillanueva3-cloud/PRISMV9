---
name: reference_delta_cad_gen_false_fail_learning_signal_2026_06_26
description: CAD text->gen closed-loop learning signal was 100% false-fail -- cad-analyze-step.mjs was referenced everywhere but never built; fixed by building it
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.541Z
aliases: reference_delta_cad_gen_false_fail_learning_signal_2026_06_26
---


**Bug (slot:delta, 2026-06-26, commit ee9cbb03de):** the text->CAD generation lane's closed-loop
TRAINING SIGNAL was uniformly FALSE-`fail` for EVERY generation -- including the 63/63 canonically-valid
STEPs. `scripts/cad-text-to-cadquery.mjs:344` (executeStaged) spawns `node scripts/cad-analyze-step.mjs
<step>` and uses its EXIT CODE as `analysisExit`; `classifyGenerationOutcome` maps `executed:true +
analysisExit===0 -> "pass"`, else `"fail"`. But `cad-analyze-step.mjs` was **referenced everywhere**
(that line, the `delta-cad-awareness-inject` hook, TOOLBELT.md, PATHS.md) yet **NEVER BUILT** (no git
history; the cad galaxy CLAUDE.md even flagged it "do NOT exist"). So the spawn hit MODULE_NOT_FOUND ->
exit 1, empty stdout -> every gen recorded `learningSignal:"fail"` into the CADTrialErrorLearningEngine
ledger. The closed-loop outcome feedback the CAD model learns from was 100% poisoned.

**Why silent:** the canonical corpus validator (`cad-gen-validate-check.py` via `cad-gen-validate.mjs`)
said 63/63 VALID -- so the STEPs were genuinely good; only the inline learning-signal analyzer was
missing. Two different "validators" disagreed; the one feeding training was broken. (Surfaced while
investigating why results.jsonl showed `status:"error"`/`executed:false` on specs whose STEPs validate.)

**Fix (R5/R8 reuse, not reinvent):** built the real `cad-analyze-step.mjs` -- validity verdict delegates
to the WORKING `cad-gen-validate-check.py` (cadquery re-import; "valid" now means the SAME thing in all
three places), plus pure STEP-text inspection (schema/unit/entity-count/coord-range/circle-radii/manifold).
Exit contract 0=valid manifold solid / 1=invalid|parse-fail / 2=usage. LIVE-proven: a real valid v-block
STEP returns exit 0 (valid, solids 1) -> learning signal flips false-fail -> correct-pass. 13/13 hermetic
tests (injected runPy/readImpl/existsImpl). 2-arm scrutiny PASS (0 P0/P1).

**Reusable lesson:** a referenced-but-never-built helper that a pipeline spawns by literal path fails
SILENTLY in the safe-looking direction (a missing analyzer that gates on exit code makes everything
"fail", not "crash") -- so a 100%-broken training signal can hide behind a green corpus validator. When
a closed-loop ledger shows a uniform outcome (all-fail / all-pass), suspect the SIGNAL SOURCE, not the
data. Before trusting an exit-code-as-signal integration, confirm the spawned target EXISTS + returns the
expected code on a known-good input. Sibling of [[reference_delta_cad_gen_loop_fixes_2026_06_26]] ·
[[reference_delta_cad_gen_worklist_expand_wave2_2026_06_26]].

**BLAST-RADIUS cleaned (commit 1b9e342132):** the false-fail bug had been poisoning the ledger itself
-- `mcp-server/data/state/cad-failure-ledger.jsonl` held 118 of 123 records as CERTAIN false-fails (every
`fail` predates the analyzer's existence; the gen reverse-arrow `loadLearnedRisk` READS this to steer
generation, so it was steering away from EVERYTHING). Built `scripts/cad-ledger-quarantine.mjs` (REVERSIBLE:
backup + quarantine-sidecar + atomic rewrite + brain-clobber guards -- fail-loud read, backup-verify,
keep==0/>10%-unparseable REFUSE, post-write count verify). Cutoff = analyzer-fix commit time
(2026-06-26T07:48:31Z); a `fail` before it is certainly false (dry-run: 0 post-cutoff fails). Applied:
ledger 123 -> 5 trustworthy (4 pass + 1 real error). 9/9 tests; 2-arm scrutiny PASS. **LESSON: when you
fix a signal SOURCE, also clean the corrupt HISTORY it already wrote into any consumer's store -- a fixed
emitter does not un-poison the ledger downstream consumers already read.** Distinct from india's
`cad-fix-training-ledger.jsonl` (corrections) -- R8 dedup-checked.

**Noted follow-ups (separate, downstream of U-MERGE-SLOT-DELTA):** (1) gen exports STEPs in mm not the
JM inch convention (coordRange +/-50.8 for a 2-inch cube) -- T2 dim/unit fidelity; (2) the inline
validator's 60s timeout could narrowly false-fail a slow-importing valid STEP (P2, safe direction).
