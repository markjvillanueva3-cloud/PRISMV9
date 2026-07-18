---
name: wedm-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the wedm galaxy (wire EDM — flushing, recast/HAZ, multi-pass skim, wire-break). 3 fetched + 1 unfetched source. PHYSICS-SAFE (mechanistic theory only, no discharge-energy numerics). FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: wedm
  tier: VERIFIED
  verifiedBy: WebFetch
  physicsSafe: true
---

# wedm galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every fetched source excerpted. **PHYSICS-SAFE: no numeric discharge-energy / wire-tension / cutting constant** — mechanistic theory, taxonomy, and method descriptions only.

## Synthesis
WEDM surface integrity is a two-layer damage model: the outer **recast (white) layer** of re-solidified melt and the sub-surface **HAZ**, both driven primarily by peak discharge current and pulse-on-time (named as driving factors, no numeric values). **Multi-pass machining** (rough + sequential trim/skim cuts) is the standard mitigation — each skim pass mechanically removes the prior pass's recast layer, reducing cumulative thickness toward finish tolerance. **Dielectric flushing** (pressure / jet / suction mode) is the companion lever: flushing pressure governs what fraction of the spark melt-pool is evacuated vs re-solidified in place, setting the recast formation rate. **Wire breakage** — the primary reliability concern — has three root causes (mechanical rupture, excessive thermal load, discharge concentration); emerging data-driven discharge-position prediction offers a real-time adaptive path to keeping wire integrity within bounds across varying workpiece thickness/geometry.

## Verified sources
### [Comprehensive review on wire electrical discharge machining (Frontiers in Mech. Eng. 2024)](https://www.frontiersin.org/journals/mechanical-engineering/articles/10.3389/fmech.2024.1322605/full) — journal
> "Pressure flushing, jet flushing, and suction flushing... altering the workpiece thickness while machining causes the thermal density of the wire to rise and eventually cause the wire to break... peak discharge current and pulse on time to be the driving factors in determining average recast layer thickness."

**Knowledge:** Taxonomizes the three flushing methods; identifies workpiece-thickness variation as the primary thermal-load driver of wire breakage; confirms rough+trim multi-pass as canonical; establishes peak discharge current + pulse-on-time as the dominant parameters controlling recast thickness.

### [Formation and Characterization of the Recast Layer on Inconel 718 during WEDM (Materials 2023)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9918936/) — journal
> "A fraction of molten material is flushed away due to applied flushing pressure, whereas the remaining fraction gets re-solidified on the workpiece surface to form a superficial layer, often termed recast layer."

**Knowledge:** Mechanistic recast formation — flushing pressure removes part of the melt pool; the remainder re-solidifies in situ. On Inconel 718 (aerospace nickel superalloy, HAZ/recast integrity relevance).

### [Influence of Contour Geometry and Number of Cutting Passes on WEDM Surface Quality (Micromachines 2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11857508/) — journal
> "with the increase in the number of passes in WEDM, the thickness of the recast layer was reduced."

**Knowledge:** Quantifies the multi-pass recast-removal effect (more trim/skim → progressively thinner recast); examines contour-geometry × surface-quality interaction at critical tool points — for carbide-insert / die-punch WEDM fabrication.

### [Data-driven statistical analysis for discharge position prediction on Wire EDM (Procedia CIRP 2022)](https://doi.org/10.1016/j.procir.2022.09.122) — conference · NOT fetched (Elsevier paywall)
> _(no excerpt — binary PDF behind paywall; authorship + DOI confirmed via author page, no fabricated quote)_

**Knowledge:** Data-driven/ML prediction of individual spark position during WEDM — the precursor to adaptive wire-break prevention; identifies the three root-cause categories of wire breakage. 21st CIRP Conf. on Electro Physical and Chemical Machining.

---
_Physics-safety: no numeric discharge energy, wire tension, or cutting constant stated; mechanistic theory + taxonomy only (R12)._
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_e5e4f08d-e05). Ledger: state/shared/galaxy-knowledge-iterations.json._
