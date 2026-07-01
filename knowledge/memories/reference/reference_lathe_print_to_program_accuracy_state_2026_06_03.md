---
name: reference_lathe_print_to_program_accuracy_state_2026_06_03
description: "Honest state of print->lathe-program accuracy — UNMEASURED; generator adapter is a stub; existing \"100%\" is fake (synthetic mill plates)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.640Z
aliases: reference_lathe_print_to_program_accuracy_state_2026_06_03
---


PRISM print→lathe-program **roundtrip accuracy is UNMEASURED (0 real samples)** as of 2026-06-03 (slot:whiskey, WHISKEY-LATHE-ACCURACY-MS0). The work order "prove 100% accuracy for all JM lathe programs" cannot be honestly claimed today — the measurement apparatus does not yet exist for lathe (R12).

**Why (verified):**
- The headless lathe generator adapter is a **stub** — `mcp-server/src/engines/PipelineHarnessAdaptersEngine.ts:222` ("domain 'lathe' adapter not yet bound; only mill wired"). There is NO end-to-end print→lathe-program→Okuma-post→diff path.
- The only existing OCR "closed loop" (`scripts/ocr-closed-loop.mjs`) scores **synthetic rectangular MILL plates** (5 of them), never a turned part of revolution — so the "100%" is fake for lathe. The vision prompt has no turning mode.
- 4,173 real JM print↔program pairs ARE linked (`state/shared/blueprint-training-pairs.jsonl`, 76,205 rows) but were never OCR-scored.

**What IS real (Rung A — measured, `scripts/lathe-jmdie-param-accuracy-harness.mjs`, 800-prog stratified sample of the 16,558 .MIN corpus):**
- JM real-world parameter cloud: finish 0.0025 IPR / 151 SFM · rough 0.007 IPR / 250 SFM (G97 implied — artifact) · **artifact-free G96-literal SFM p50 = 200 [100–550]** · feed (IPR) is the trustworthy axis.
- Safety: **97.5% of G96(CSS) programs carry a G50 max-RPM cap**; 19 overspeed-risk programs (G96 w/o G50); caps p05–p95 600–1500 (one outlier 5000).
- PRISM's rough FEED envelope contains JM's band ✓ but PRISM SFM runs ~4–7× hotter than JM's conservative Okuma medians (calibrate vs g96sfm literals, not the implied aggregate).

**Top data-optimization fixes (from workflow cross-check, 5 parallel agents):**
1. Fix finish feed to be Ra-driven by inverting the Brammertz model PRISM already owns but only reports — `TurningPrintToProgramEngine.ts:688`, `f=sqrt(32*r*Ra/1000)`. Lands finish feed in JM's band by construction.
2. Add a JM shop-profile SFM override (NEVER mutate canonical `constants.ts` CANONICAL_KIENZLE tables).
3. Wire a CSS⇒G50 hard-fail validator (closes the 19 overspeed programs).

**The single most important NEXT BUILD STEP (next-rung, logical order R13):** build `LathePrintToProgramPipelineEngine.runFullPipeline()` — the missing orchestrator that chains the 6 existing-but-unchained lathe stage engines. Only then does the adapter (`makeLatheAdapter()` + `isBound("lathe")->true`) have something to wrap, and only then can a true roundtrip accuracy number exist. The real metric = structural+semantic diff (% deviation within JM empirical bands), NOT G-code byte-match.

**R12 phantom-pointer defect found:** `validateCSSCap` is referenced in `mcp-server/src/engines/lathe/CLAUDE.md` but exists in ZERO engine `.ts` files. Either implement it or correct the doc.

Full verdict: `state/shared/dashboards/lathe-print-to-program-accuracy-verdict.md`. Ground-truth cloud: `state/shared/dashboards/lathe-jmdie-param-accuracy.{json,md}`. Related: [[feedback_psn_definition]], [[reference_whiskey_lathe_soul_designation_2026_05_27]].
