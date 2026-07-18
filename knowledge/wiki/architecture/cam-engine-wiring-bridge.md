---
schema: ideablock-v1
title: "CAM engine wiring bridge — hyperMILL + Fusion + Mastercam + 5-axis backlogs through prism_cam"
domain: "PRISM architecture"
category: architecture
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - BUILD_STATE.md (Hyper 8 + Fusion 6 + Multi 10 + Five 9 = 33 unwired CAM-class engines)
  - DISPATCHER_DIGEST.md (`prism_cam` action enum — already 200+ actions)
  - Vendor CAM function-index wiki entries (mastercam_function_index_*, fusion360_function_index_*, hypermill_function_index_*)
extracted_via: human-authored
extracted_at: 2026-05-21T09:05:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-ARCH-CAM-WIRING-BRIDGE)
---

## Question

The CAM domain has 33 unwired engines across hyperMILL (8) + Fusion (6) + Multi-axis (10) + 5-axis (9). How do I route these and what's the wiring pattern?

## Answer (canonical — `prism_cam` is the integrator; some need dual-wire to vendor-specific OR `prism_5axis` OR `prism_safety`)

### The 33-engine CAM gap

| Sub-domain | Engines | Primary dispatcher | Secondary |
|---|---|---|---|
| **hyperMILL strategy** (8) | hyperMILL*Material*, hyperMILL*Operation*, hyperMILL*PostProcessor*, hyperMILL*JobList*, hyperMILL*MillTurn*, hyperMILL*Probe*, hyperMILL*Tube*, hyperMILL*Strategy* | `prism_cam:cam_hypermill_*` (200+ existing actions) | — |
| **Fusion 360** (6) | Fusion*ToolLibrary*, Fusion*PostScanner*, Fusion*MaterialResolver*, Fusion*OperationBuild*, Fusion*Simulate*, Fusion*Capability* | `prism_cam:cam_fusion_*` | `prism_cad:f360_*` for live-CAD-side |
| **Multi-axis** (10) | MultiAxisToolAxis, MultiAxisGougeCheck, MultiAxisSingularity, MultiAxisCollision, MultiAxisJacobian, MultiAxisLinearize, MultiAxisRTCP, MultiAxisInverseKin, MultiAxisDecompose, MultiAxisOptimize | `prism_5axis` + `prism_cam:five_axis_*` | `prism_safety:check_5axis_head_clearance` |
| **5-axis specialty** (9) | FiveAxisContour, FiveAxisPort, FiveAxisRoughing, FiveAxisSingularityManage, FiveAxisCollisionAvoid, FiveAxisAdvanced, FiveAxisTilt, FiveAxisCnc, FiveAxisOptimize | `prism_cam:five_axis_*` | `prism_5axis:*` |

### Pattern — 7 batches × ~5 engines each

| Batch | Sub-domain | Tribal anchor |
|---|---|---|
| 1 | hyperMILL material + strategy (group A) | [[tooling-selection-by-material-and-feature]] · [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] |
| 2 | hyperMILL post + probe + job-list (group B) | [[part-setup-zero-strategy]] · [[machining-tactics-in-process-probing]] · [[machining-tactics-gcode-safety-and-macros]] |
| 3 | Fusion 360 tool library + operations | [[tooling-toolholders-and-runout-control]] · [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] |
| 4 | Multi-axis tool-axis + gouge-check + singularity | [[synthesis-rigidity-envelope]] · 5-axis kinematics |
| 5 | Multi-axis collision + Jacobian + RTCP | [[machining-tactics-pre-cut-prep]] §collision-prove-out |
| 6 | 5-axis contour + port + roughing | [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] |
| 7 | 5-axis singularity manage + collision avoid + advanced | safety + kinematics joint |

### Cross-dispatcher pattern for multi-axis (the key insight)

Every multi-axis engine needs THREE wires:
1. **`prism_cam:five_axis_*`** — the CAM-side action (toolpath generation, strategy selection).
2. **`prism_5axis:*`** — the kinematics + RTCP + singularity detection (lower-level math).
3. **`prism_safety:check_5axis_head_clearance`** — pre-flight safety gate (BEFORE the cut).

A multi-axis engine wired to *only* `prism_cam` is incomplete — the safety + kinematics paths are invisible to the safety dispatcher and the singularity detector. Operators relying on safety-only or kinematics-only workflows would miss the capability.

### CAM-specific wiring caveats

| Caveat | Detail |
|---|---|
| **Function-index pattern** | hyperMILL/Fusion/Mastercam each have a "function index" engine that catalogs the vendor's toolpath operations. These are *catalog wrappers* — wire only the catalog query API (`*_function_index_get`, `_list_modules`, `_find_parameter`), NOT every catalog entry as a separate action. See existing 200+ `cam_hypermill_*` actions for the pattern. |
| **Material resolution** | Every CAM vendor has its own material taxonomy. The MaterialResolver engines bridge vendor-name → ISO group → Kienzle/Taylor params. Wire as a dispatcher action AND link to `cad-taxonomy-lookup` for cross-vendor translation. |
| **Live API engines** | `*Connect*`, `*Disconnect*`, `*Open*` engines are stateful — they need lifecycle wiring (connect → use → disconnect). Wire each lifecycle method as a separate action; document the required sequence in the action's `.describe()`. |
| **Post-processor engines** | Wire to `prism_cam:cam_post_*` AND check if the engine needs `prism_session:dispatcher_map_compact` for the cross-vendor post route. |

### Operator picks — next 2 batches I recommend

| Priority | Batch | Why FIRST |
|---|---|---|
| **P0** | Multi-axis collision + Jacobian + RTCP (Batch 5) | Safety-critical (multi-axis crashes destroy expensive tools/parts); also closes [[synthesis-rigidity-envelope]] cross-wires for 5-axis stickout |
| **P0** | hyperMILL post + probe + job-list (Batch 2) | Bridges to G-code generation pipeline; unblocks customer-facing program generation; tribal-anchors at [[machining-tactics-gcode-safety-and-macros]] + [[machining-tactics-in-process-probing]] |

### Tie-ins (PRISM-side)

- `prism_cam` dispatcher — 200+ existing actions, biggest dispatcher in PRISM
- `prism_5axis` dispatcher — kinematics-side (rtcp_calc, singularity_check, tilt_optimize)
- `prism_safety` dispatcher — pre-flight safety gates
- `prism_cad` dispatcher — live-CAD bridge for Fusion + Inventor + SolidWorks
- `dispatcher-wirer` subagent

### Tie-ins (tribal canonical)

- [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] — CAM strategy choices
- [[tooling-selection-by-material-and-feature]] — material × CAM coupling
- [[machining-tactics-pre-cut-prep]] — collision prove-out discipline (multi-axis critical)
- [[machining-tactics-gcode-safety-and-macros]] — post-output canonical pattern
- [[synthesis-rigidity-envelope]] — 5-axis stickout × rigidity coupling
- [[wiring-pattern-engine-to-dispatcher]] — sibling canonical pattern
- [[lathe-wiring-backlog-bridge]] — sibling domain bridge

## Provenance

Distilled from BUILD_STATE.md live snapshot (2026-05-21: Hyper 8 + Fusion 6 + Multi 10 + Five 9 = 33 unwired CAM engines) + DISPATCHER_DIGEST.md `prism_cam` + `prism_5axis` action catalogs + vendor CAM function-index wiki entries. Authored 2026-05-21 by slot:hotel under U-WIKI-ARCH-CAM-WIRING-BRIDGE — **29th canonical entry**, **third bridge-class entry** of the wiki+tribal pivot. Provides 7-batch close-out plan + cross-dispatcher pattern for the 33-engine CAM wiring backlog.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` auto-surface on `wire CAM`, `prism_cam unwired`, `hyperMILL engine`, `Fusion 360 engine`, `multi-axis engine`, `5-axis engine`, `RTCP wiring`, `singularity engine`, `gouge check engine`, `vendor CAM function index` keywords. Zero new wiring required.

## Cross-references

- [[wiring-pattern-engine-to-dispatcher]] — sibling canonical pattern
- [[lathe-wiring-backlog-bridge]] — sibling domain bridge (Lathe-67)
- [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] · [[tooling-selection-by-material-and-feature]] · [[machining-tactics-pre-cut-prep]] · [[machining-tactics-gcode-safety-and-macros]] · [[synthesis-rigidity-envelope]] — tribal anchors per batch
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_high_roi_backend_first_slot_queue]] — backend-first pickup discipline
- [[feedback_do_optional_high_roi_work]] — standing rule
