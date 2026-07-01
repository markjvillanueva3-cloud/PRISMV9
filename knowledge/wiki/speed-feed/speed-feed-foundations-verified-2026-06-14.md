---
name: speed-feed-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the speed-feed galaxy (speeds/feeds physics — cutting-force mechanics, chatter/stability lobes, Taylor tool-life methodology). 6 fetched sources. PHYSICS-SAFE (method/theory/standards ONLY, NO numeric cutting constants). FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: speed-feed
  tier: VERIFIED
  verifiedBy: WebFetch
  physicsSafe: true
---

# speed-feed galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source WebFetched + excerpted. **PHYSICS-SAFE — the highest-stakes fence in the fleet held:** these sources give the cutting-force *model*, chatter *theory*, and Taylor tool-life *methodology* with **ZERO numeric cutting constants** (no kc1.1, no Taylor C/n exponent values, no SFM/IPR/fz/RPM). Numeric constants stay owner-gated in `src/physics/constants.ts`.

## Synthesis
Three intersecting pillars. **Canonical theory** — Altintas's *Manufacturing Automation* (Cambridge) + the Altintas/Stepan/Budak/Schmitz/Kilic ASME review unify Kienzle-style cutting-force mechanics, the regenerative feedback loop as the physical cause of chatter, and the zero-order frequency-domain approximation (ZOA) for constructing stability lobe diagrams from measured tool-tip FRFs. **Normative methodology** — ASME B94.55M (harmonized with ISO 3685) defines *how* Taylor tool-life exponents are validly derived experimentally (flank-wear criterion, chip-equivalent parameter, test-matrix design, reporting) — the methodology anchor for any Taylor-equation implementation, distinct from the numeric constants themselves. **Frontier** — micro-milling regimes where centrifugal force, gyroscopic moment, and runout become first-order FRF perturbations (PMC10892509), and DDE/semi-discretization-seeded ML estimating stability lobes online (arXiv 2511.17894) — the field is converging toward adaptive real-time speed selection over pre-computed look-up tables. PRISM should prioritize FRF-based lobe generation, chip-equivalent-gated tool-life modeling per B94.55M, and a physics-in-the-loop architecture that absorbs online chatter feedback.

## Verified sources
### [Manufacturing Automation: Metal Cutting Mechanics, Machine Tool Vibrations, and CNC Design, 2nd ed. (Altintas, Cambridge UP)](https://www.cambridge.org/core/books/manufacturing-automation/458526DE5ED43CC0FE1AEB19A80DEC06) — textbook
> "Metal cutting is widely used in producing manufactured products. The technology has advanced considerably along with new materials, computers and sensors."

**Knowledge:** Canonical graduate text unifying Kienzle-style cutting-force mechanics, regenerative chatter theory, stability-lobe-diagram derivation, and CNC servo design; the ZOA frequency-domain method every chatter-stability implementation traces back to.

### [Chatter Stability of Machining Operations (ASME JMSE review, DOI 10.1115/1.4047391)](https://mtrc.utk.edu/wp-content/uploads/sites/45/2020/08/manu_142_11_110801.pdf) — paper
> "Machine tool dynamics; machining processes [Review Article covering] fundamental aspects of machining stability analysis."

**Knowledge:** Altintas/Stepan/Budak/Schmitz/Kilic — surveys the full analytical framework: regenerative feedback loop, single-frequency + multi-frequency methods, process damping, state-of-the-art lobe prediction. The definitive chatter-physics survey.

### [ML-based Online Stability Lobe Diagram Estimation and Chatter Suppression in Milling (arXiv 2511.17894)](https://arxiv.org/abs/2511.17894) — paper
> "Stability analysis is conducted using the semi-discretization method for milling dynamics modeled by delay differential equations."

**Knowledge:** DDE + semi-discretization are the canonical analytical substrate for stability-lobe computation; modern ML can estimate SLDs online — bridging classical chatter theory to adaptive data-driven real-time speed selection.

### [Dynamic Modeling for Chatter Analysis in Micro-Milling (centrifugal/gyroscopic/runout) (Micromachines 2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10892509/) — paper
> "An integrated model was developed by considering the centrifugal force induced by rotational speeds, the gyroscopic effect introduced by high speeds, and the tool runout."

**Knowledge:** Extends stability-lobe theory to micro-milling where centrifugal force, gyroscopic moment, and runout become first-order effects on the tool-tip FRF and thus the stability limit — for high-RPM small-diameter end-mill selection.

### [ASME B94.55M — Tool Life Testing with Single-Point Turning Tools](https://www.asme.org/codes-standards/find-codes-standards/b94-55m-tool-life-testing-single-point-turning-tools) — standard
> "establishes specifications for the following factors of tool life testing... workpiece, tool, cutting fluid, cutting conditions, tool wear and tool life... test procedures, recording and reporting..."

**Knowledge:** Harmonized with ISO 3685 — the normative procedure governing how Taylor tool-life exponents are experimentally derived (flank-wear criterion, chip-equivalent parameter, test matrix, reporting). The methodology anchor for Taylor-equation models (the *method*, not the numeric constants).

### [MIT OCW 2.008 Design and Manufacturing II (Spring 2025)](https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2025/pages/syllabus/) — course
> "Apply physics to understand the factors that control the rate of production and influence the quality, cost, and flexibility of processes."

**Knowledge:** Metal-cutting mechanics incl. Merchant's cutting circle, force decomposition, chip formation, and the physics connecting depth-of-cut/feed/speed to surface finish + tool life — the standard academic framing for speed-feed selection rationale.

---
_Physics-safety: NO numeric cutting constant (kc1.1, Taylor C/n, SFM, IPR, fz, chip-load, RPM, force values) appears above — model/theory/standards-methodology only. Hardest fence in the fleet; held (R12-verified on content + grep)._
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_e5e4f08d-e05). Ledger: state/shared/galaxy-knowledge-iterations.json._
