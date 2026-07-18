---
name: reference-bravo-mill-orphan-reconciliation-2026-06-12
description: R12 reconciliation — a recon agent's "6 genuinely-orphaned mill engines" list was 5/6 WRONG; a live audit + per-engine grep proved only CounterfactualMillEngine is a true orphan, the 5 HyperMill*MappingEngine are WIRED-VIA-REGISTRY, and MillPrintToProgramEngine is a deprecation-stub. Mill backend wiring is ~89% / HIGH-ROI-unwired 0 — essentially closed.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.487Z
aliases: reference_bravo_mill_orphan_reconciliation_2026_06_12
---


**Finding (slot:bravo, 2026-06-12, R12 verification on the "close backend wiring" loop axis):**
the `MILL-ORPHAN-ENGINE-WIRING-PLAN-2026-06-12.md` target list came from a recon AGENT's dig,
which claimed 6 mill engines were "genuinely orphaned, zero dispatcher refs AND zero engine
consumers." A live `scripts/audit-unwired-engines.mjs` run (3754 engines, 64 UNWIRED) + a
per-engine `grep` CORRECTED it — **5 of the 6 were false positives**:

| Recon claim | Truth | Evidence |
|---|---|---|
| `CounterfactualMillEngine` orphan | **TRUE orphan** | refs only in itself + own test + 2 docs; in the 64-UNWIRED set (17KB real engine, `analyze(baseline)` API). |
| 5x `HyperMill*MappingEngine` orphan | **WIRED-VIA-REGISTRY** | all 5 imported by `registries/PhysicsMappingRegistry.ts:28-48`; NOT in the 64-UNWIRED set. |
| (audit-only) `MillPrintToProgramEngine` | **DEPRECATION stub** | size_kb:1; system-viz roost `ghost.priority.u-ppgm50` = "Deprecate MillPrintToProgramEngine stub". Referenced in millDispatcher but real logic is in `MillMasterOrchestratorFacadeEngine`. |

**Why the recon was wrong:** the audit script's "consumer" set includes **registries** (and, per
[[reference_audit_wired_via_engine_2026_06_10]], engine->engine consumption). An engine imported only
by a registry has no dispatcher/route ref and no orchestrator/singleton consumer, so a naive
"grep for dispatcher refs" reports it as orphaned — but it IS wired (the registry is the consumer).

**Bigger conclusion (cross-checked vs [[reference_mill_galaxy_complete_stale_audit_flags_2026_06_02]]):**
the mill-specific `scripts/mill-wiring-audit.mjs` already reported **119/134 wired (89%), HIGH-ROI
unwired: 0** (2026-06-02). So the operator's "make sure everything backend is wired" axis for MILL
is essentially CLOSED — the only genuine remaining items are 1 LOW-ROI what-if engine
(`CounterfactualMillEngine`) and 1 DEPRECATION (`MillPrintToProgramEngine` / U-PPGM50). Neither
justifies a heavy-context 217KB-`millDispatcher.ts` edit (R6 spiral risk); the corrected wiring plan
scopes `CounterfactualMillEngine` as a clean fresh-context unit (it also INLINES Kienzle/Taylor
constants at lines 81-95 — a `stop_on_inlined_constants` prereq to fix first, R13).

**Lesson (R12/R8):** never wire from an agent's orphan list — reconcile against a live audit run +
per-engine grep first. "Zero dispatcher refs" != "orphan" when registries/other-engines are consumers.
The corrected plan: `state/shared/specs/MILL-ORPHAN-ENGINE-WIRING-PLAN-2026-06-12.md`.
Related: [[reference_foxtrot_mill_wire_status_2026_06_11]] · [[reference_audit_wired_via_engine_2026_06_10]].
