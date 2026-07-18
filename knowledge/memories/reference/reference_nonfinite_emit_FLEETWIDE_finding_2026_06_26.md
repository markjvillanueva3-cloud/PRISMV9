---
name: reference-nonfinite-emit-fleetwide-finding-2026-06-26
description: "MAJOR FINDING 2026-06-26 (slot:echo): the non-finite (NaN/Infinity) coordinate-EMIT bug class is FLEET-WIDE -- a definitive audit found ~41 clean engines emitting axis-word coord tokens with NO finite guard, spanning echo/foxtrot/whiskey/kilo (post/mill/lathe/CAM/probing/EDM/threading). Needs a cross-galaxy CAMPAIGN, not a solo grind. Proven fix pattern + per-galaxy distribution + false-positive caveat inside."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.665Z
aliases: reference_nonfinite_emit_FLEETWIDE_finding_2026_06_26
---


# Non-finite coordinate-EMIT bug class is FLEET-WIDE (2026-06-26 definitive audit, slot:echo)

After completing the post-processor sweep ([[reference_post_nonfinite_emit_sweep_complete_2026_06_26]], 9 engines), a **definitive** audit over ALL `mcp-server/src/engines/*.ts` for `lines.push(\`...X${...}` axis-word emits + `formatCoord(` with a `Number.isFinite` guard count surfaced **~41 MORE clean engines that emit coordinate tokens with ZERO finite guard**. The bug class is NOT post-processor-specific -- it is fleet-wide across every G-code emitter.

**The class (recap):** a non-finite (NaN / +-Infinity) numeric field -> `.toFixed()` / `formatCoord` -> literal `XNaN`/`ZInfinity`/`FNaN` the CNC control rejects. `||`/`??` fallbacks miss Infinity. A derived value can inherit it or spin an unbounded loop.

**Real + verified vulnerable (spot-checked):** `EDMPostProcessGCodeEngine` (43 real coord sites across nested profile/pass/contour/depth/tab loops; raw `formatCoord(pt.x/i/j, uv.u/v)`). Many others by emit-count: `TurningProgramAssemblerEngine` (34), `MillingPrintToProgramEngine` (39), `MillOnMachineProbeCycleEngine` (19), `ProbeRoutineEngine` (17), `MultiProcessCAMBridgeEngine` (14), `MillTurnCAMEngine` (13), `MillTurnSwissPipelineEngine` (12), `ThreadingPipelineEngine` (10), `SoftJawBoringGCodeEngine` (9), `MultiAxisPrintToProgramEngine` (8), `PPOkumaSubSpindleSyncEngine` (8), `LatheSwissPostGeneratorEngine` (7), `TurningOffsetCompensationEngine` (7), `ProductionToolpathEngine` (7), `LaserWaterjetPostExtension` (7), + ~25 more.

**FALSE-POSITIVE caveat (verify each, do NOT trust the count):** an `emit=1` hit is often a REPORT/display line, not executable G-code -- e.g. `PostValidationReportEngine` emits `Work Volume: X${...} Y${...} Z${...} mm` (a machine-spec display, harmless). `CrossCAMPostEngine` was a confirmed analyzer false-positive (`parseFloat(metric.toFixed())`). Spot-verify each candidate emits a REAL motion/coordinate token before guarding.

**CROSS-GALAXY -- distribute, do NOT grind solo (R8 domain ownership):** the real ones span multiple galaxies and editing another galaxy's core engine as echo would collide:
- **echo (post):** EDMPostProcessGCode, EDMProgramAssembler, LathePostGeneratorDialect, LatheSwissPostGenerator, CNCProgramAssembler, GCodeTemplate, ProgramStructure, AdvancedPostProcessor, TurningProgramAssembler
- **foxtrot (mill):** MillingPrintToProgram, MillOnMachineProbeCycle, MultiAxisPrintToProgram
- **whiskey (lathe):** TurningOffsetCompensation, EccentricTurning, LatheOnMachineProbeCycle, LiveTurretCAxis, PPOkumaSubSpindleSync, SoftJawBoringGCode
- **kilo (CAM):** MillTurnCAM, MultiProcessCAMBridge, BatchCAM, CAMKernel, ScalableCAMOrchestrator, ProductionToolpath, HolePatternPipeline, EndToEndPipeline
- **probing/threading (cross):** ProbeRoutine, ProbingProgram, ProbeMacroGenerator, MillTurnSwissPipeline, ThreadingPipeline, ThreadMilling, LaserWaterjetPostExtension

**Proven fix pattern (apply per engine):** detect non-finite at the emit boundary -> warn loudly + skip-move / halt-op / omit-token, NEVER silently substitute a wrong-but-valid coord. For a multi-site engine prefer ONE main-loop field-guard (OkumaB250/PPOkumaTurning style) or a `formatCoord` chokepoint + per-op validation. BYTE-IDENTICAL for finite. Test asserts `/[XYZUVIJ...](NaN|Infinity)/` absent (NOT bare "NaN"). See the 9 shipped exemplars in [[reference_post_nonfinite_emit_sweep_complete_2026_06_26]].

**RECOMMENDATION:** run this as a distributed cross-galaxy campaign (each galaxy slot sweeps its own engines using the proven pattern) OR a single systematic sweep in a FRESH focused session -- NOT a tired solo grind at the tail of a long session (43-site nested-loop engines like EDMPostProcessGCode are error-prone when context is exhausted). Operator decision needed on how to tackle. Audit command: `grep -rlE 'lines\.push\(\`[^\`]*\b[XYZ]\$\{' mcp-server/src/engines/*.ts` cross-referenced with a `Number.isFinite` guard count + `git status` clean filter. [[feedback_never_claim_absence_without_deep_search]] · [[feedback_all_means_all]]
