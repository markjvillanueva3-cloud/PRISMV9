---
name: reference_delta_fusion_isolation_and_live_bridge_2026_06_01
description: Two Fusion instances did NOT isolate delta from kilo — a delta sketch via :18365 leaked to :18361/:18362 (one shared active doc). Root cause: PRISMBridgeCAD.py hardcoded PORT=18362 + SO_REUSEADDR cross-routing. FIX applied: PORT now reads PRISM_BRIDGE_CAD_PORT env (needs operator re-Run per instance). ALSO shipped U-CADTP-LIVE-BRIDGE: real-HTTP runCandidate client + the live closed-loop PROVEN over a contract-faithful mock bridge (9/9).
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.084Z
aliases: reference_delta_fusion_isolation_and_live_bridge_2026_06_01
---


# Fusion multi-instance isolation FAILED + live-bridge closed-loop shipped (slot:delta, 2026-06-01)

## Isolation finding (operator launched a 2nd Fusion so delta+kilo "each use their own")
**It did NOT isolate.** Verified: delta POSTed an empty nonce sketch via :18365 and `timeline_count` jumped
3→5 on ALL of :18361 (kilo CAM), :18362 (CAD), :18365 — the CAD mutation leaked to kilo's ports = ONE shared
active document. (+2 jump ⇒ kilo was mutating concurrently → active collision.) Both Fusion PIDs (6176=3395MB
original, 24736=1052MB new) listen on all 3 ports via the add-in's SO_REUSEADDR; Windows routes all ports to
one process's active doc. `is_saved` field on :18365 /status was a red herring (non-deterministic routing).
ROOT CAUSE: deployed `PRISMBridgeCAD.py` line 62 hardcoded `PORT = 18362`; two instances' add-ins bind
overlapping ports → cross-route. **Claiming a port does NOT prevent collision.**

## FIX applied (this session) — needs operator re-Run to take effect
`C:/Users/wompu/AppData/.../PRISMBridgeCAD/PRISMBridgeCAD.py` line 62 →
`PORT = int(os.environ.get("PRISM_BRIDGE_CAD_PORT", "18362"))`. Safe/additive (unchanged when env unset; running
bridge unaffected until re-Run; AST-verified parses). **Operator action to get true isolation:** (1) launch
delta's dedicated Fusion APPLICATION (separate document) with env `PRISM_BRIDGE_CAD_PORT=18365` set BEFORE
starting Fusion / clicking Run on the add-in; (2) keep kilo's instance on default (CAM 18361 / CAD 18362); (3)
confirm the two are separate APPS (each its own active doc), not one app's processes. Then delta drives :18365,
kilo :18361, no leak. (Optional belt+suspenders: set the ThreadingHTTPServer `allow_reuse_address=False` so a
same-port double-bind fails loud instead of shadow-routing — not required if ports are distinct.) Posted to
chat bus delta→kilo,operator topic `fusion-instance-isolation-VERIFIED-BROKEN` (2026-06-01T03:00Z). Left a
benign empty probe sketch 'Sketch3' on the shared doc.

## SHIPPED — U-CADTP-LIVE-BRIDGE (commit 779a65d573) — the live half of the closed loop
`scripts/lib/cad-fusion-live-bridge.mjs`: `makeFetchImpl(port)` (real-HTTP fetchImpl matching course-lib's
`(path,{method,body})→{httpStatus,json}`), `readLiveModel`→normalizeModel, `makeRunCandidate(cfg)`→the
harness's `runCandidate(params)→model`. **PROVES the closed loop**: the test wires the REAL runConvergenceLoop +
REAL diffModels + REAL HTTP to an in-process mock bridge and CONVERGES to a confirmed `match` at iter 4 (9/9
tests). Both reviewers PASS + independently read the deployed PRISMBridgeCAD.py and confirmed the mock is a
contract-faithful twin (array bbox, volume_mm3 cm³→mm³, /new=fresh doc, success envelope) — avoided the
"hermetic fakes don't prove wiring" trap. The ONLY gap to live is the server behind `makeFetchImpl(port)`:
point it at a real isolated bridge port and it runs LIVE cycles unchanged.

## LIVE-CLEAN INVARIANT (reviewer-B, doc'd in the lib) — mock can't catch it
On the REAL bridge `/extrude operation:"new"` ADDS a body (NewBodyFeatureOperation); only a `/new`-FIRST course
(documents.add → fresh empty doc) OR a non-null resetFn keeps each candidate at 1 body. The mock's /extrude
REPLACES, so it shows 1 body even with no reset — never rely on the mock to catch a missing reset live.

## The session's correction-core arc (3 prior units, this session)
U-CADTP-GEOM-DIFF (a0060e7119) + U-CADTP-CONVERGENCE-HARNESS (a2b780e225) + U-CADTP-LIVE-BRIDGE (779a65d573) =
metric + loop + live transport = the full autonomous replicate-to-100% engine, all verified. Live cycles
gated ONLY on Fusion isolation (operator). Pairs with [[reference_delta_geom_diff_and_channel_lesson_2026_05_31]]
+ [[reference_delta_cad_training_pipeline_2026_05_31]].
