---
name: reference_kilo_cam_strategy_class_map_2026_05_28
description: Cross-vendor CAM strategy equivalence classes — same physics, different vendor names
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.634Z
aliases: reference_kilo_cam_strategy_class_map_2026_05_28
---


2026-05-28 (slot:kilo): same-physics-class strategy equivalences across CAM systems (the tribal knowledge behind cross-CAM transfer). Authoritative source is `CAM_VENDOR_REGISTRY.json` + `CAMCrossSystemTranslatorEngine`; this is the human-readable map.

- **High-efficiency adaptive roughing** (constant radial engagement, trochoidal motion, deep DOC): Mastercam *Dynamic Mill / OptiRough* ≈ hyperMILL *MAXX Machining rough* ≈ Fusion *Adaptive Clearing* ≈ SolidCAM *iMachining* ≈ PowerMill *Vortex* ≈ Esprit *ProfitMilling*.
- **Rest roughing** (re-machine leftover from a larger tool): near-universal "rest machining" / "rest material" — same intent, watch the stock-model lineage.
- **Waterline / Z-level finishing** (constant-Z passes on steep walls): Mastercam *Waterline* ≈ hyperMILL *Z-level finishing* ≈ Fusion *Contour* ≈ PowerMill *Constant Z*.
- **Scallop / constant-cusp** (3D offset for shallow surfaces): Mastercam *Scallop* ≈ Fusion *Scallop/Steep-and-Shallow* ≈ PowerMill *Steep and Shallow*.
- **Pencil / corner** (re-machine internal corners): broadly "pencil" across vendors.
- **5-axis swarf** (flank-milling ruled surfaces) and **multi-axis contour** (tool-axis along a guide curve): map carefully — tilt-limit + singularity behavior differs per kinematics; always re-validate with `cam_multiaxis_recommend` + machine envelope.

Rule: transfer the PHYSICS CLASS, then re-derive parameters per target machine — never copy parameter values across vendors blind.
