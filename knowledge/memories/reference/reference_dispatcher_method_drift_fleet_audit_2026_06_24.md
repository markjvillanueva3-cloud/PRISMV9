---
name: reference_dispatcher_method_drift_fleet_audit_2026_06_24
description: "scripts/audit-dispatcher-engine-methods.mjs (exists, bravo 2026-06-22) is UNWIRED -- 53 dispatcher->engine method-drift instances across 9 dispatchers, mostly dark capabilities, cross-domain"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.554Z
aliases: reference_dispatcher_method_drift_fleet_audit_2026_06_24
---


**Fleet dispatcher-engine method-drift audit (2026-06-24, slot xray)** -- discovered while fixing the resourceExtractionDispatcher drift ([[reference_xray_extract_dispatcher_repair_2026_06_24]]).

`scripts/audit-dispatcher-engine-methods.mjs` (bravo, `U-DISPATCHER-ENGINE-METHOD-AUDIT` 2026-06-22) is the canonical static detector for the class "a dispatcher handler calls `engine.METHOD()` where METHOD does not exist on the resolved engine -> throws `is not a function` at runtime; tsc is blind because getEngine() returns `any`." It WORKS (pure core + tests; caught camDispatcher's CK-MS11 probe drift on first run) -- but it is **NOT WIRED** to any Stop/CI gate, so drift silently accumulates. That is exactly why the 8-action resourceExtractionDispatcher drift shipped.

**Live run 2026-06-24: 53 MISSING across 107 dispatchers, in 9 files** (my resourceExtractionDispatcher fix VALIDATES clean -- `missing=0 live=16`):
| count | dispatcher | owning slot |
|---|---|---|
| 20 | camDispatcher.ts | kilo (CAM) |
| 8 | cncOpsDispatcher.ts | kilo/foxtrot |
| 7 | edmDispatcher.ts | mike (WEDM) |
| 5 | cadDispatcher.ts | xray/delta (CAD) |
| 4 | qualityDispatcher.ts | quality |
| 3 | ppDispatcher.ts | echo (post-proc) |
| 3 | resourceHarvesterDispatcher.ts | juliett/xray |
| 2 | millDispatcher.ts | foxtrot (mill) |
| 1 | feasibilityDispatcher.ts | kilo |

Most are **genuinely-dark capabilities** (the method was never implemented / the action is a dark facade), NOT simple renames -- verified for xray's 5: `cadRegistry`(=`universalCADIndexEngine`)`.scan/search/get/stats` are absent (engine has only `index()`); `cadTaxonomy.generateCadQueryCode` exists on neither cadTaxonomy NOR cadQueryGen (which has `generateScript`/`generateStepByStep`). A few ARE high-confidence renames the auditor flags advisory (verify semantically before re-pointing): camDispatcher `parseWithContext->parse`(0.77); edmDispatcher `plan_passes->plan`(0.81)/`full_plan->plan`(0.8); feasibilityDispatcher `analyze->analyzeRigidity`(0.95); resourceHarvesterDispatcher `startHarvest->saveHarvestState`(0.62).

**Actions:**
1. Run `node scripts/audit-dispatcher-engine-methods.mjs` (or `--json`) to get the live per-finding list with did-you-mean candidates. EXIT 1 when MISSING>0.
2. Each owning slot fixes its own dispatcher's MISSING (R7 -- cross-domain, don't solo-fix; dark capabilities need domain knowledge to implement vs re-point).
3. **RECURRENCE-PROOF (recommended, unbuilt):** wire the auditor as an ADVISORY Stop hook (it must NOT hard-block while 53 are open) so new drift is surfaced at ship time. Sibling of the wired `audit-dispatcher-ghost-actions` (action-has-no-handler) + `dispatcher-import-liveness` (imported name not exported) detectors.

**Progress (slot xray):** resourceExtractionDispatcher 8->0 (`8ef38b0be3`); cadDispatcher cad_registry 4 (`af53d5ce23`).

**FULL REMEDIATION COMPLETE (`d8b1022911`, "do it all"/Ultracode, 6-agent parallel fleet):** fleet auditor **49 -> 6**. Of the 49: **25 REAL drifts fixed/implemented** (16 renames: cncOps 8 all `.calculate`->domain method, edm 7 plan/analyze, feasibility 1 ->calculate, mill 1 queryRecent->getRecent; 9 capabilities: cam DFM/NLP 5, resourceHarvester lifecycle 3, cad generateCadQueryCode 1) -- 195 R9 tests. **17 AUDITOR FALSE POSITIVES** eliminated by PATCHING `audit-dispatcher-engine-methods.mjs` -- it was BLIND to object-literal singleton exports (`export const X = { compute, run }`) + had a call-window scope bug; added object-literal (shorthand + key:value) + top-level fn/const recognition + comment-strip (iMachining.*/postLibrary.run/printReading.*/analysis.*/inference_orch.classify now correctly LIVE). **6 genuinely-dark `mastercamStrategy.*` SPEC'd to kilo** (`engines/cam/SPEC-mastercam-strategy-dark-methods.md`) + 1 `wedm_full_documentation`->mike. **RECURRENCE-PROOF WIRED + LIVE:** `.claude/hooks/stop-dispatcher-method-drift-advisory.mjs` (advisory/throttled-1h/fail-open, `PRISM_DISPATCHER_DRIFT_ADVISORY_DISABLE=1`) is now Stop[7] in user-global settings.json -- live smoke returns `{continue:true, "Advisory: 6 ... drift"}`. **Lesson 2: a drift auditor with a parse blind spot (object-literal exports) had a 35% false-positive rate -- patch the DETECTOR'S coverage, not just the findings; verify every auditor finding on disk before "fixing" it (17 of 49 were not real).**

**Lesson:** a static-integrity auditor only protects the fleet if it RUNS -- an unwired detector lets the exact bug class it targets accumulate (53 instances). When you find a great audit tool, check it is WIRED, not just present (existence != working).
