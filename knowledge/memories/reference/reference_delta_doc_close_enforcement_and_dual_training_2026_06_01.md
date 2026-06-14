---
name: reference_delta_doc_close_enforcement_and_dual_training_2026_06_01
description: Fusion document-close enforcement (no leaked windows) + dual-training fix ledger (print-reader + cad-gen train together) + dual-axis convergence gate (CAD<->CAD AND print<->print). Operator directives 2026-06-01. Live-proven: enforced cycle 3/3 converged + doc count 4->4 perfect no-leak, operator's DIE CASE part intact.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.083Z
aliases: reference_delta_doc_close_enforcement_and_dual_training_2026_06_01
---


# Doc-close enforcement + dual-training + dual-gate (slot:delta, 2026-06-01)

## Operator directive 1: auto-enforce Fusion doc close (no leaked windows / RAM/CPU/GPU waste)
ROOT CAUSE: deployed PRISMBridgeCAD `_new_document` calls `app.documents.add()` and NEVER closes the prior doc
→ every closed-loop candidate build leaks a window. My un-enforced live runs leaked ~20 docs. SHIPPED
`cad-fusion-doc-lifecycle.mjs` (23/23, commit 70c5df4976):
- `reapByPrefix(postExecute, prefix)` — bulk-close all docs with a name prefix in ONE /execute pass, iterating
  HIGH→LOW index (closing doesn't shift unvisited indices — the bug that made name-by-name reap report
  not-found after the first close), with in-Fusion active-guard + reactivation of a non-prefixed doc.
- HARD SAFETY (proven live): NEVER closes the ACTIVE doc, a protected-name doc, or a non-owned doc. The
  operator's `DIE CASE 2.940 X 3.75 .992 ID` (active+modified) survived every reap.
- `disposable:true` lets a loop-OWNED candidate be closed despite unsaved geometry (we discard it); the
  active-guard is NEVER bypassed. Empty prefix REFUSED (would close everything).
- Works via the bridge `/execute` sandbox (adsk+app pre-bound, doc.close() not blocked) → NO re-Run needed NOW.
- Live-cycle runner names each candidate `PRISM-DELTA-LOOP-<ts>-<n>` (via `/new` body.name) then reapByPrefix
  after the run. PROVEN: enforced cycle 3/3 converged + doc count 4→4 (perfect no-leak).
- CLI `scripts/cad-fusion-reap-leaked-docs.mjs [--port --prefix --dry]` drains a backlog (drained my 16 leaked).
- DURABLE: added native GET /documents + POST /close (prefix|names, force, active-guard, high→low) +
  PRISM_BRIDGE_CAD_PORT env-port to the deployed add-in; mirrored into repo at
  scripts/fusion-addins/PRISMBridgeCAD.py (commit 67f1ab2d6a). Takes effect on next bridge re-Run; the
  /execute reaper covers the running bridge meanwhile. AST-verified parses.

## Operator directive 2: dual comparison (CAD<->CAD AND print<->print)
Operator: "two comparisons, cad model to cad model AND print to print for double checking" + "generate new
print after drawing cad, check against previous first print." SHIPPED:
- `cad-fusion-dual-gate.mjs` (9/9, commit 987051b02f) — `runDualGate` converges ONLY when geom-diff verdict
  ===match AND comparePrints verdict===PASS. Catches the case geometry matches but the regenerated print
  DROPPED a feature (PMI loss). R8: REUSES the EXISTING `scripts/cad-print-compare.mjs` comparePrints (do NOT
  rebuild — it already compares the real print.json shape: bbox_3d_mm.size/hub_diameter/cylinder_count/
  bspline_count with ISO 2768-mK tol) + my diffModels. Threshold mirror PRINT_PASS_PCT=90 (P2: drift risk).
- `cad-fusion-spec-diff.mjs` (16/16) — print↔print comparator for DIMENSIONED/GD&T specs (the dropped-PMI
  catcher keyed by feature id). This is the IDEAL target for when xray emits dimensioned specs; the CURRENT
  pipeline print.json is a geom-feature summary, so comparePrints is what runs today.

## Operator directive 3: log fixes for DUAL training (print-reader + cad/cam together)
Operator: "log any fixes to prints and cad so we train print reading at the same time as cad/cam." SHIPPED
`cad-fix-training-ledger.mjs` (11/11, commit aa6a10e769): every fix = labeled example {domain:print|cad|cam,
kind, field, wrong, right, source, cycleId} → `state/shared/cad-fix-training-ledger.jsonl` with routing tags
trainsPrintReader/trainsCadGen/trainsCam. xray tails domain==print rows (OCR misreads + corrected ground
truth); india ingests all. `deriveFixesFromCompare` auto-converts failing print-compare checks (src=ground
truth=right, regen=wrong). R12: rejects a fix with no before/after OR a null ground truth (can't train toward
null) OR wrong===right. Posted xray/india/kilo coordination to AGENT_CHAT (dual-training-fix-ledger-LIVE).

## Multi-cycle + roundtrip orchestrator
`cad-fusion-roundtrip-orchestrator.mjs` (10/10, commit bf97d11fe1) — runCycles drives N replicate cycles +
ledgers convergence; reusable BOX strategy. Full convergence stack regression: 24(geom-diff)+13(harness)+
9(live-bridge)+10(orch)+16(spec-diff)+9(dual-gate)+23(doc-lifecycle)+11(fix-ledger) = 115 tests, 0 fail.
Pairs with [[reference_delta_live_closed_loop_proven_2026_06_01]] (the live proof) +
[[reference_delta_fusion_isolation_and_live_bridge_2026_06_01]].

## OPEN for next session
- print↔print on REAL xray OCR output: confirm with xray whether their emitted schema is the geom-feature
  summary (comparePrints) or dimensioned/GD&T (spec-diff); wire the live regen-print path (cad-training-loop.mjs
  step-3 is still a 0.2%-drift STUB — replace with real Fusion regen→reparse→print2).
- dual-gate not yet wired into the live loop (it's a tested pure lib; U-CADTP-DUAL-GATE-WIRE wires it in).
- freeform features (sweep/loft/spiral) still bridge-gated per [[reference_delta_cad_training_pipeline_2026_05_31]].
