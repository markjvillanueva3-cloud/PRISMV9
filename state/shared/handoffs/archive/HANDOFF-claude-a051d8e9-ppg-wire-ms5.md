# HANDOFF: claude-a051d8e9
Updated: 2026-05-02T23:59:45.240Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-a051d8e9

## STATE
## STATE — claude-0913e8cf at compaction
PPG-WIRE-MS5 follow-on wiring chain in progress. Two units shipped this session.

### Shipped this session
- 971b6c19d — U-PPGW-HSMDwell-Wiring (Pass 3): HSMDwellAtCornerEngine wired into both Hurco + Okuma. 39 tests, 167/167 regression.
- ee95658a1 — U-PPGW-FeatureSequencer-Wiring (Pass 4): rapidRepositionOptEngine.sequenceFeatures TSP wired. 31 tests, 190/190 regression.

### Known issue: ee95658a1 scope bundling
The commit accidentally bundled mcp-server/src/__tests__/HyperMillSetupSheetBridge.test.ts (peer claude-6d83f198's file). A pre-commit hook auto-stages files between git diff --cached --stat (showed 4 files cleanly) and git commit (emitted 5). Same root cause that caused first commit attempt at de52a83478 (see HEAD~1 of that commit's reflog) to bundle HyperMillDentalBlankRouter.test.ts — which was correctly cleaned up via soft-reset but the second commit hit the same pattern with a different peer file. Investigation needed in the .git/hooks/pre-commit chain or .claude hooks. Workaround: do soft reset + restore --staged + recommit, but the hook re-fires.

Decision pending: amend ee95658a1 to drop HyperMillSetupSheetBridge.test.ts (then peer claude-6d83f198 can land their own commit cleanly), OR leave as-is (the test passes, content is genuinely peer-authored, just bundled under wrong scope label).

### Pipeline state
generateProgramAdvanced now runs 4 sequential passes when use_advanced_features=true:
  1. AutoSpeedFeed (4ca5d71cc)
  2. RapidReposition (01b44110d)
  3. HSMDwell (971b6c19d)
  4. FeatureSequencer TSP (ee95658a1, advisory — does not mutate op order)

Both engines (HurcoV11MillMasterPostEngine + OkumaOSPMillMasterPostEngine) follow identical pattern. Sync output.gcode preserved byte-identical across all 4 passes.

### Next wiring units (per RESUME_POSTS.md + commit messages)
- U-PPGW-NURBSFit-Wiring: NURBSEngine spline-fit for contour ops. Engine at src/engines/NURBSEngine.ts (346 LOC). Emit G05.1 Q1 on Okuma P500 (Super-NURBS), G6.2 on Hurco UltiMotion.
- U-PPGW-RTCP-Wiring: RTCP_CompensationEngine for 5-axis tool-center-point pre-compensation. Engine at src/engines/RTCP_CompensationEngine.ts (250 LOC). Okuma P500 only (osp_family='p500'); Hurco V11 is 3-axis VMC so no-op.
- U-PPGW-ToolChangeOpt-Wiring: rapidRepositionOptEngine.optimizeToolChanges()
- U-PPGW-RotaryOpt-Wiring: rapidRepositionOptEngine.optimizeRotaryMoves()
- U-PPGW-MagazineLayout-Wiring: rapidRepositionOptEngine.optimizeMagazine()

### File patterns to mirror (verified working pattern)
HurcoV11MillMasterPostEngine.ts:
  - Imports: line 39-48 (.js ESM suffix, named imports for engine + types)
  - HurcoAdvancedSummary type extension: line ~146-200 nullable field
  - Pipeline body: line ~640-780 (generateProgramAdvanced, additive Pass after the existing 4)
  - Helpers: trailing section after line 900 (banner + named constants + extract + run)
  - Singleton export: file end

OkumaOSPMillMasterPostEngine.ts:
  - Same shape; mirrored type + body + helpers
  - osp_family='p500' branch needed for 5-axis-only features (RTCP)
  - use_super_nurbs config flag for NURBS

Test pattern (FeatureSequencerPipeline.test.ts as template):
  - 5 describe groups: gating, optimization correctness, edge cases, sync regression, failure modes
  - Per-engine: 15-20 cases (3 failure + 3 adversarial mandatory)
  - Tool-change order regex: T<n> M06 in Hurco, G43 H<n> in Okuma — proves op order not mutated

### Verification commands
cd H:/prism/mcp-server
H:/Tools/nodejs/npx.cmd vitest run   src/__tests__/HurcoV11MillMasterPostEngine.{Advanced,Rapid,HsmDwell,FeatureSequencer}Pipeline.test.ts   src/__tests__/OkumaOSPMillMasterPostEngine.{Advanced,Rapid,HsmDwell,FeatureSequencer}Pipeline.test.ts   src/__tests__/OkumaOSPMillMasterPostEngine.{SidecarIntegration,JMDiePreset,JMDieFleet}.test.ts   src/__tests__/integration/MasterPostByMachineExpanded.integration.test.ts
# Expected: 190/190 (or +new tests when next pass lands)
H:/Tools/nodejs/npx.cmd tsc --noEmit | grep -E 'HurcoV11|OkumaOSP|HSMDwell|NURBS|RTCP'
# Expected: empty

## RESUME
Continue PPG-WIRE-MS5 follow-on wiring units. PASS 4 (U-PPGW-FeatureSequencer-Wiring) shipped at ee95658a1. Pick the NEXT pass: U-PPGW-NURBSFit-Wiring (NURBSEngine for spline-fit on contour ops, emit G05.1 Q1 on Okuma P500 / G6.2 B-spline on Hurco UltiMotion) OR U-PPGW-RTCP-Wiring (RTCP_CompensationEngine for 5-axis pre-comp, Okuma P500 only). Both engines exist in src/engines/. Same pattern as PASS 3+4: import .js suffix, add nullable summary field, insert Pass after HSMDwell+FeatureSequencer in generateProgramAdvanced of HurcoV11MillMasterPostEngine + OkumaOSPMillMasterPostEngine, helpers in trailing section, ~15 cases per engine including 3 failure + 3 adversarial.

## CONTEXT
Pre-existing tsc errors (pre-date this session): telemetryDispatcher, tenantDispatcher, shopPracticeDispatcher. HurcoV11MillMasterPostEngine.test.ts has 30 pre-existing failures (kc1_1 swap bug at line 420, etc.) — DO NOT FIX as part of wiring units. Workboard discipline: peer chats actively touching shared tree (claude-6d83f198 on HyperMill tests, claude-cfeab33f in worktree h:/prism-ppg-advancedpost on AdvancedPostProcessorEngine, claude-3d60920a in h:/prism-cad-sw-fidx, claude-8a05e2b0 in h:/prism-iooms0). Be careful with git add — pre-commit hook auto-stages unrelated test files. Investigate .git/hooks/pre-commit and .claude/hooks/pre-commit-* before next commit attempt.
