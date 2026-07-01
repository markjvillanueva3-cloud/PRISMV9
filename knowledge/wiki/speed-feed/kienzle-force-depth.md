---
name: kienzle-force-depth
description: Kienzle specific-cutting-force model in depth — orthogonal vs oblique cutting, the Fc/Ff/Fp three-component force decomposition, and the kc1.1/mc structure by ISO group. PHYSICS-SAFE: symbolic relations only; numeric kc1.1/mc values stay owner-gated in src/physics/constants.ts. slot:oscar.
metadata:
  node_type: wiki
  type: architecture
  galaxy: speed-feed
  physicsSafe: true
---

# Kienzle force model in depth — orthogonal → oblique, and the Fc/Ff/Fp decomposition

> **PHYSICS-SAFE.** This entry gives the *model structure* only. Every numeric specific-cutting-force value (kc1.1 per ISO group) and exponent (mc) is **owner-gated** in `mcp-server/src/physics/constants.ts` (`CANONICAL_KIENZLE`) — never re-published in the wiki. Companion to the foundations layer ([[speed-feed-foundations-verified-2026-06-14]]); fills the oblique-cutting + force-decomposition gap that the foundations entry (orthogonal/Merchant only) does not cover.

## 1 — The Kienzle law

The engineering form used across PRISM's SFC core:

```
Fc = kc1.1 · ap · fz^(1 − mc)
```

- **Fc** — main (tangential) cutting force, acting along the cutting velocity Vc.
- **kc1.1** — the *specific* cutting force at a reference undeformed chip thickness of 1 mm and 1 mm width (units of pressure, MPa). A material property by ISO machining group.
- **mc** — the Kienzle rise exponent: the slope of log(kc) vs log(h) on the Kienzle line. It captures the **size effect** — kc rises as the chip gets thinner because the ploughing/edge-radius share of the work grows. Equivalently, the *instantaneous* specific force is `kc = kc1.1 · h^(−mc)`.
- **ap** — depth of engagement; **fz** ≈ the undeformed chip thickness `h` at 90° lead (when the lead/approach angle κr ≠ 90° or radial engagement ae < D/2, the **chip-thinning** correction applies first — see [[speed-feed-advanced-techniques]]).

The size-effect term is *why* light finishing passes see a higher specific force than heavy roughing, and why chip-thinning must be resolved before the force is computed.

## 2 — kc1.1 / mc structure by ISO group (qualitative)

kc1.1 scales with the material's resistance to shear and its work-hardening tendency; mc with how strongly the size effect bites. Qualitatively, the **hardened (H)** and **superalloy (S)** groups carry the highest specific cutting force, **steels (P)** and **stainless (M)** sit in the middle, **cast iron (K)** lower, and **non-ferrous (N, aluminium/brass)** the lowest. The exact ranked table and the per-group mc values are the owner-gated numbers in `CANONICAL_KIENZLE` (`src/physics/constants.ts`) — resolve them there, never inline them here or in an engine.

> **Landmine (R12):** do not assume the ordering from memory — read `CANONICAL_KIENZLE`. An inline divergence already shipped a 4× tool-life error to the customer page once (`ProductEngine` inline-kc, `4ad8a0116b`).

## 3 — Orthogonal cutting (the 2-D idealisation)

Orthogonal cutting (cutting edge ⟂ to Vc, inclination λs = 0) is the textbook model the foundations layer covers via **Merchant**: the shear-angle relation

```
φ = π/4 + γ/2 − β/2
```

(φ = shear-plane angle, γ = rake angle, β = friction angle) closes the force circle so the cutting and thrust forces follow from the shear-flow stress and the chip geometry. Orthogonal theory yields **two** in-plane force components (cutting + thrust) and is the right model for a broaching tooth, a parting blade, or a tube-end turned with a 90° lead.

## 4 — Oblique cutting (the 3-D reality) — the gap this entry fills

Real milling and turning edges are **oblique**: the inclination angle λs (cutting-edge inclination, a.k.a. helix contribution on a mill) is ≠ 0. Two consequences the orthogonal model cannot express:

1. **Chip flows sideways.** By **Stabler's chip-flow rule**, the chip-flow angle η_c ≈ λs. The chip no longer leaves in the plane normal to the edge; it sweeps along the rake at the inclination angle.
2. **A third force component appears.** The single tool force resolves into **three** orthogonal components:

| Component | Symbol | Direction | Driven by |
|---|---|---|---|
| Cutting / tangential | **Fc** | along Vc | the Kienzle law above; the power term (P = Fc·Vc) |
| Feed / axial | **Ff** | along the feed | rake + friction; sets feed-drive load |
| Passive / radial (thrust) | **Fp** | ⟂ to feed and Vc (back toward the workpiece) | inclination + lead angle; **drives tool/part deflection** |

The split between Ff and Fp is governed by the tool geometry — rake γ, inclination λs, and lead/approach angle κr — and by the material's friction behaviour. As κr → 0 (a near-axial lead) the radial share Fp grows; this is exactly why a large-lead facing tool deflects less than a small-lead profiling tool at the same Fc.

**Why Fp is load-bearing in SFC:** Fp is the force that feeds the deflection model (δ = Fp·L³ / 3EI) and the workholding-adequacy check. It is *force*-driven and **independent of cutting speed Vc** — the central result behind the Vc-collapse regression lesson ([[sfc-deflection-vc-lever]]): a deflection/force violation is relieved by reducing **fz** (which lowers Fc, hence Fp), never by collapsing Vc.

## 5 — How PRISM consumes this

- `SpeedFeedOrchestratorEngine` is the central hub; it resolves kc1.1/mc from the material registry (falling back to the canonical ISO-group default) and computes the Kienzle force inline. Its seed material table is **reconciled from `CANONICAL_KIENZLE` / `CANONICAL_MATERIAL_DB` in `src/physics/constants.ts` at module load** (`SpeedFeedOrchestratorEngine.ts:660-671`) — the canonical source is authoritative; the inline seed is never the source of truth.
- `prism_calc:cutting_force` is the dispatcher action for the main force; `prism_calc:helix_angle_force_decomposition` covers the oblique/helix force split; `prism_calc:tool_life` covers the Taylor leg.
- Force outputs carry uncertainty (`AtomicValue`/`OptimizedValue` with `{value, unit, confidence, source}`) — never a bare number, per the soul's *no-speed-feed-without-uncertainty* rule.

> Engine names, dispatcher action names, and field names above are stated by name only — verify any against the live source before relying on them in code (the fabrication failure mode caught in this entry's drafting: a sonnet draft invented an import, three dispatcher actions, and an output schema).

## 6 — Sources
- **Kienzle, O.** (1952) — *Die Bestimmung von Kräften und Leistungen an spanenden Werkzeugen und Werkzeugmaschinen*, VDI-Z 94 — the original specific-cutting-force law.
- **König, W. & Klocke, F.** — *Fertigungsverfahren Bd. 1: Drehen, Fräsen, Bohren* — canonical German cutting-force reference; the Kienzle-tradition force-decomposition treatment.
- **Altintas, Y.** — *Manufacturing Automation* (Cambridge UP, 2nd ed.) — oblique cutting mechanics, Stabler's rule, and the link from cutting-force coefficients to process dynamics.
- **Merchant, M. E.** (1945) — orthogonal shear-angle theory (the 2-D idealisation §3 extends from).
- **ISO 3685** — tool-life testing methodology (the experimental frame for deriving Taylor exponents; harmonised with ASME B94.55M, see [[speed-feed-foundations-verified-2026-06-14]]).

## Cross-refs
- Owner-gated constants: `mcp-server/src/physics/constants.ts` (`CANONICAL_KIENZLE`, `CANONICAL_TAYLOR`)
- Lever lesson: [[sfc-deflection-vc-lever]] (Fp drives deflection; reduce fz not Vc)
- Foundations / theory: [[speed-feed-foundations-verified-2026-06-14]] · [[speed-feed-advanced-techniques]]
