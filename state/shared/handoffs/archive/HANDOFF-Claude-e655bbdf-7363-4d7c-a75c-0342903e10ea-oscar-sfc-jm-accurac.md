---
session: Claude-e655bbdf-7363-4d7c-a75c-0342903e10ea
topic: oscar-sfc-jm-accuracy
slot: oscar
written_at: 2026-06-24T15:15:47.244Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: e655bbdf-7363-4d7c-a75c-0342903e10ea
status: active
---

# HANDOFF: Claude-e655bbdf-7363-4d7c-a75c-0342903e10ea
Updated: 2026-06-24T15:15:47.244Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: e655bbdf-7363-4d7c-a75c-0342903e10ea

## STATE
## SFC-JM-ACCURACY pipeline COMPLETE + scientifically corrected (slot:oscar) -- 13 units
PIPELINE: extract -> corpus(comment-material + JM stock-prior default) -> analyze -> physics-compare(Taylor Vc, clamp-aware, P<->H material-state sensitivity) -> refresh + cron f2f7fee3
LIVE 154,414 programs / ~1.17M ops / 0 err.
CAPSTONE FINDING (the honest answer to "test SFC vs JM programs"): JM stock is 93.7% TOOL STEEL (H) per QuickBooks (not carbon-steel P). The band is HARDNESS-STATE-dependent: annealed/soft lathe-roughing (unknown->P) = 88% conservative + 3% aggressive [operative]; hardened (unknown->H) = 45% cons + 30% in-band + 24% aggressive. Of all aggressive only 169 UNCLAMPED (rest G50-capped). => JM lathe runs conservative-to-in-band; ~169 unclamped over-speeds max to review; definitive band needs PER-OP HARDNESS STATE (not in programs).
Reports: state/shared/SFC-JM-{CORPUS-ANALYSIS,PHYSICS-COMPARE}.json. Memory reference_oscar_sfc_jm_accuracy_harness_2026_06_24.
KEY LESSONS (live-data caught all): (1) clamp-aware G50; (2) gate collision numbers behind material words; (3) default material from shop QuickBooks stock not generic P; (4) CSS-vs-Taylor for a die shop is hardness-state-dependent -- report the P<->H range, never a falsely-precise point.

## NEXT: per-op hardness state (mine heat-treat callouts/op-sequence) for a definitive band; then full speedFeedOrchestratorEngine.compute round-trip (tool geometry); wire pipeline to prism_dev action.
## FRONTEND (oscar OWNS): SFC unit tests PASS; e2e not run; whole-suite vitest exit255 (Three.js/WebGL, not OOM, cross-cutting). Out-of-domain fails: MillOptimizer(foxtrot)/LatheOptimizer(whiskey)/CAM-coverage(kilo).

## RESUME
SFC-JM-ACCURACY COMPLETE+corrected: JM=93.7% tool steel; lathe band hardness-state-dependent (annealed 88% conservative / hardened 24% aggr); 169 unclamped over-speeds. NEXT: per-op hardness-state mining for definitive band, then orchestrator round-trip. /checkin-oscar /loop /goal.

## CONTEXT

