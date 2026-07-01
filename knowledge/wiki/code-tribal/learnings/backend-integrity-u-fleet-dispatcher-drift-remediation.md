# BACKEND-INTEGRITY/U-FLEET-DISPATCHER-DRIFT-REMEDIATION — [MAIN-FORCE] [BACKEND-INTEGRITY]/U-FLEET-DISPATCHER-DRIFT-REMEDIATION (slot:xray): fix 25 dispatcher->engine method-drift actions + patch the auditor (49->6) + recurrence-proof advisory hook

**Commit:** `d8b10229117e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T12:51:51-05:00
**Tags:** backend-integrity, u-fleet-dispatcher-drift-remediation, auto-distilled

## Subject
[MAIN-FORCE] [BACKEND-INTEGRITY]/U-FLEET-DISPATCHER-DRIFT-REMEDIATION (slot:xray): fix 25 dispatcher->engine method-drift actions + patch the auditor (49->6) + recurrence-proof advisory hook

## Body
```
[MAIN-FORCE] [BACKEND-INTEGRITY]/U-FLEET-DISPATCHER-DRIFT-REMEDIATION (slot:xray): fix 25 dispatcher->engine method-drift actions + patch the auditor (49->6) + recurrence-proof advisory hook

"do it all" (Ultracode): exhaustive fleet remediation of the dispatcher->engine method-drift class
surfaced by scripts/audit-dispatcher-engine-methods.mjs (49 MISSING across 9 dispatchers). A handler
calling engine.METHOD() where METHOD does not exist throws "is not a function" in production (tsc-blind,
getEngine() is any). Ran a per-dispatcher parallel remediation fleet (sonnet agents, verify-on-disk
before every fix, adversarial semantic-fit confirmation, real R9 tests, NEVER fake a domain capability).

OUTCOME -- of the 49 findings:
- 16 REAL renames/wrong-engine FIXED (verified on disk):
  cncOps (8): all <engine>.calculate() -> the engine's domain method (centerDrill/bore/counterbore/
    recommend/boreMill/knurl/groove|parting/linearRamp).
  edm (7): plan_passes/full_plan->plan; planWireManagement/calculateCornerCompensation/solveTaper->
    analyze; generateSetupSheet->named-export fn dynamic import. (1 truly-dark wedm_full_documentation
    -> structured spec-error, no engine exists -> owner mike.)
  feasibility (1): feasAnalysis.analyze->calculate. mill (1): trace_ledger.queryRecent->getRecent.
- 9 REAL capabilities IMPLEMENTED (self-contained, data-clear, tested):
  cam DFMFeedbackEngine.suggestImprovements/generateReport + NLPCAMParserEngine.parseWithContext/
    extractDimensions; HarvestPipelineEngine.startHarvest/getStatus/resumeHarvest (real lifecycle over
    the static state model); CADOperationTaxonomyEngine.generateCadQueryCode (operation->CadQuery snippet).
- 17 AUDITOR FALSE POSITIVES eliminated by PATCHING the auditor: it was blind to object-literal singleton
  exports (export const X = { compute, run }) -- it only saw class methods + inline m:fn forms. Added
  object-literal (shorthand + key:value) recognition + top-level function/const-arrow recognition + a
  comment-strip in methodsCalledOnVar (fixes the inference_orch.classify scope mis-attribution).
  iMachining.*/postLibrary.run/printReading.*/analysis.* are now correctly LIVE. 7 new auditor tests.
- 6 genuinely-dark mastercamStrategy.* SPEC'd to kilo (mcp-server/src/engines/cam/SPEC-mastercam-strategy-dark-methods.md).

RESULT: fleet auditor MISSING 49 -> 6 (the 6 are kilo's dark mastercamStrategy.*, correctly routed).
195 new R9 tests across 6 vitest suites (all pass), 16/16 auditor tests, 20/20 hook tests; tsc-clean
across every changed engine/dispatcher.

RECURRENCE-PROOF: new advisory Stop hook .claude/hooks/stop-dispatcher-method-drift-advisory.mjs
(ADVISORY-only, throttled >=1h, fail-open, imports scanDispatchers, PRISM_DISPATCHER_DRIFT_ADVISORY_DISABLE=1
kill switch) so this class surfaces at Stop going forward instead of accumulating silently. settings.json
wiring is a follow-up (mirror-sensitive). Memory reference_dispatcher_method_drift_fleet_audit_2026_06_24.
```

## Files touched (20)
- .../__tests__/stop-dispatcher-method-drift-advisory.test.mjs     | 296 +++++++++++++
- .claude/hooks/stop-dispatcher-method-drift-advisory.mjs          | 229 ++++++++++
- .../src/__tests__/CADOperationTaxonomyEngine-codegen.test.ts     | 234 ++++++++++
- .../src/__tests__/DFMFeedbackEngine.suggest-report.test.ts       | 258 +++++++++++
- mcp-server/src/__tests__/HarvestPipelineEngine-lifecycle.test.ts | 328 ++++++++++++++
- mcp-server/src/__tests__/NLPCAMParserEngine.context-dims.test.ts | 175 ++++++++
- mcp-server/src/__tests__/cncops-dispatcher-method-drift.test.ts  | 596 +++++++++++++++++++++++++
- mcp-server/src/__tests__/dispatcher-method-drift-fixes.test.ts   | 673 +++++++++++++++++++++++++++++
- mcp-server/src/engines/CADOperationTaxonomyEngine.ts             | 236 ++++++++++
- mcp-server/src/engines/DFMFeedbackEngine.ts                      |  81 ++++
_(+10 more)_

## Lessons surfaced in commit body
- wrong-engine FIXED (verified on disk):

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d8b10229117e`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-INTEGRITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._