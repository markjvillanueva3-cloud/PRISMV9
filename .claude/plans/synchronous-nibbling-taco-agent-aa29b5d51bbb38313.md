# HM-REV Turning/Mill-Turn Coverage Evaluation Plan

## Task
Score PRISM's hyperMILL turning/mill-turn coverage across 6 categories and propose skills to generate.

## Evidence Gathered
- HyperMillStrategyEngine: 5 turning strategies (Roughing, Contour Parallel, Finishing, Groove/Plunging, Thread Cutting)
- HyperMillCycleCatalogEngine: 18 MT: cycles including B-Axis, Roll, Part Transfer
- HyperMillCycleDefaultsEngine: 7 turning/millturn_grooving cycles with full param defaults
- HyperMillSafetyHooks: validateTurningHPM (round inserts for HPM only)
- TurningPrintToProgramEngine: Full OD/ID/face/groove/thread/bore/parting pipeline + insert selection
- SinglePointThreadEngine: Full pass planning (5 infeed methods), safety-critical
- PartingGroovingEngine: Parting + grooving with CSS, blade selection, peck grooving
- BoringBarDeflectionEngine: Full cantilever physics, L/D limits, dampened bar selection
- MillTurnCAMEngine: C-axis, Y-axis, sub-spindle transfer, multi-channel sync, bar management
- MillTurnSwissPipelineEngine: Guide bushing deflection, B-axis, gang slide, bar feeder, 6 Swiss machine profiles
- LatheCollisionZoneEngine: 10 lathe-specific safety checks
- LathePostProcessorEngine: 4 controllers, G70-G76 canned cycles, TNRC, CSS
- HyperMillThreadStandardEngine: ISO Metric + ANSI Unified full tables (BSP/DIN/JIS/GB stubs empty)
- ToolpathStrategyRegistry: ~40 turning strategies across roughing/finishing/grooving/threading/parting
- Kennametal turning catalog: 4000+ inserts (CNMG, CNGG, etc.) with shape/chipbreaker/cornerRad
- No hyperMILL-specific turning skill exists in /h/prism/.claude/skills/
- hypermill-3d-strategy-guide skill does NOT exist (despite being listed in MEMORY as available)
- HyperMillStrategyEngine is NOT wired into TurningPrintToProgramEngine or MillTurnSwissPipelineEngine (no cross-import)
- HyperMillCycleDefaultsEngine has NO turning_face cycle (only hmTrnr, hmTrnf, hmTrnl, hmTrnp, hmTrnbr, hmFgv*, hmGrv*)
- HyperMillStrategyEngine GeometryType has NO turning_face (gap vs cycle catalog which has Finish Turning, Rough Turning etc.)
- LathePostProcessorEngine has NO hyperMILL post dialect (only fanuc/haas/mazak/okuma)

## Scoring Summary
1. External Turning: 72/100
2. Internal Boring: 68/100
3. Threading: 75/100
4. Grooving/Parting: 70/100
5. Mill-Turn Operations: 65/100
6. Swiss-Type: 60/100

## Skills to Generate
1. hypermill-turning-setup — setup turning job in hyperMILL (stock, workplane, tool assignment)
2. hypermill-turning-cycles — cycle selection guide for MT: category cycles
3. hypermill-millturn-sync — C/Y-axis, sub-spindle, part transfer, multi-channel
4. hypermill-swiss-guide — Swiss-type guide bushing, gang slide, bar feeder in hyperMILL context
5. hypermill-thread-turning — thread turning cycles, insert selection, HPM validation
6. hypermill-groove-parting — grooving/parting cycles (OD/ID/face groove) with blade selection
