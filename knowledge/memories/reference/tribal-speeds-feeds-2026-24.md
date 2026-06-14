---
type: tribal-consolidation
topic: speeds_feeds
iso_week: 2026-24
cluster_size: 511
cluster_size_synthesized: 10
aggregate_confidence: 87.9
tags: ["document-learned", "doc:doc-hypermill-hypermill-2d-3d", "operation:milling", "formula", "doc:cnc-fundamentals-autodesk", "stainless", "work-hardening", "304"]
materials: ["M", "K", "N", "P", "S", "H"]
operations: ["pocket", "profile", "face", "drill", "milling", "drilling", "tapping", "roughing"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: speeds_feeds — 2026-24

_511 tips clustered on 'speeds_feeds' with mean confidence 87.9/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (10)

### 1. Stainless 304 work hardening prevention

- **id:** `tk-001` · **confidence:** 95/100 · **usage:** 47
- **source:** operator:senior_machinist
- **tags:** stainless, work-hardening, 304, 316, material:M, material:304 Stainless

Never dwell in the cut with 304/316 stainless. Use climb milling, positive rake angles, and maintain constant chip load. If you hear the pitch change, you've already work-hardened the surface — increase speed 15% and take a fresh cut below …

### 2. Cast iron dry machining advantage

- **id:** `tk-007` · **confidence:** 92/100 · **usage:** 35
- **source:** operator:tooling_engineer
- **tags:** cast-iron, dry-cutting, coolant, material:K, material:Cast Iron

Gray cast iron machines BETTER dry than with coolant. The graphite flakes act as a natural lubricant. Adding flood coolant creates a thermal shock that cracks carbide inserts. Use compressed air only for chip clearing.

### 3. Aluminum face mill chatter fix

- **id:** `tk-006` · **confidence:** 85/100 · **usage:** 22
- **source:** operator:hsm_specialist
- **tags:** aluminum, chatter, face-mill, high-speed, material:N, material:Aluminum

If you get chatter face-milling aluminum, before reducing speed: try INCREASING speed to 15000+ RPM with high feed. The light cuts at high speed often eliminate resonance that occurs at mid-range RPMs. Also check that your face mill has une…

### 4. RPM formula with 3.82 constant derivation

- **id:** `TK-DL-cnc-fundamentals-autodesk-001` · **confidence:** 95/100 · **usage:** 0
- **source:** document:cnc-fundamentals-autodesk
- **tags:** rpm, sfm, formula, speed-calculation, 3.82-constant, document-learned

RPM = (SFM × 3.82) / Diameter(inches). The constant 3.82 = 12/π, converting surface feet per minute to revolutions. For metric: RPM = (SMM × 318.31) / Diameter(mm). This is the foundational speed calculation for all milling and drilling ope…

### 5. Feed rate formula: IPM = RPM × IPR × Flutes

- **id:** `TK-DL-cnc-fundamentals-autodesk-002` · **confidence:** 95/100 · **usage:** 0
- **source:** document:cnc-fundamentals-autodesk
- **tags:** feed-rate, ipm, chip-load, formula, document-learned, doc:cnc-fundamentals-autodesk

Feed(IPM) = RPM × ChipLoad(IPR) × NumberOfFlutes. For tapping: Feed(IPM) = RPM / TPI. Always calculate feed AFTER determining RPM. If calculated RPM exceeds machine maximum, use max RPM in the feed calculation to maintain proper chip load.

### 6. Enable vector fine interpolation

- **id:** `TK-DL-doc-hypermill-hypermill-2d-3d-082` · **confidence:** 95/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-2d-3d
- **tags:** vector_fine_interpolation, document-learned, doc:doc-hypermill-hypermill-2d-3d

Default is enabled; set maximum permissible angle change for machine movements.

### 7. Limit vertical stepdown for material allowance

- **id:** `TK-DL-doc-hypermill-hypermill-2d-3d-588` · **confidence:** 95/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-2d-3d
- **tags:** vertical_stepdown, allowance, document-learned, doc:doc-hypermill-hypermill-2d-3d

Set the number of machining planes and remaining material allowance.

### 8. Calculate negative stock allowances carefully

- **id:** `TK-DL-doc-hypermill-hypermill-2d-3d-589` · **confidence:** 95/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-2d-3d
- **tags:** negative_stock, document-learned, doc:doc-hypermill-hypermill-2d-3d, tool:bull_nose_endmill

Ensure the sum of negative stock allowance and tool corner radius does not become negative.

### 9. Use horizontal stepover for infeed control

- **id:** `TK-DL-doc-hypermill-hypermill-2d-3d-590` · **confidence:** 95/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-2d-3d
- **tags:** horizontal_stepover, document-learned, doc:doc-hypermill-hypermill-2d-3d

Specify the infeed length dimension or factor of tool diameter.

### 10. Using minimum G0 distance

- **id:** `TK-DL-doc-hypermill-hypermill-2d-3d-669` · **confidence:** 95/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-2d-3d
- **tags:** minimum G0 distance, traverse, document-learned, doc:doc-hypermill-hypermill-2d-3d

Defines the maximum distance between two machining surfaces, which can be traversed without tool contact.

## Common Threads

Top tags across the cluster: `document-learned`, `doc:doc-hypermill-hypermill-2d-3d`, `operation:milling`, `formula`, `doc:cnc-fundamentals-autodesk`, `stainless`, `work-hardening`, `304`.

## Sources Cited

- document:doc-hypermill-hypermill-2d-3d (5)
- document:cnc-fundamentals-autodesk (2)
- operator:senior_machinist (1)
- operator:tooling_engineer (1)
- operator:hsm_specialist (1)

## Citations

- [[tk-001]]
- [[tk-007]]
- [[tk-006]]
- [[TK-DL-cnc-fundamentals-autodesk-001]]
- [[TK-DL-cnc-fundamentals-autodesk-002]]
- [[TK-DL-doc-hypermill-hypermill-2d-3d-082]]
- [[TK-DL-doc-hypermill-hypermill-2d-3d-588]]
- [[TK-DL-doc-hypermill-hypermill-2d-3d-589]]
- [[TK-DL-doc-hypermill-hypermill-2d-3d-590]]
- [[TK-DL-doc-hypermill-hypermill-2d-3d-669]]

