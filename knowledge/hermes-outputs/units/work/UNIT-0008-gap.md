# UNIT-0008 -- Minimum Chip Thickness and Size Effect -- GAP ANALYSIS
_Analyst: oscar (speed-feed domain expert) - 2026-07-02 - evidence-cited per R12; citations Grep-verified against calcDispatcher.ts this session._

## Existing coverage
The size-effect + minimum-chip-thickness physics is broadly built + wired:

- **Kienzle size effect**: `kienzle_size_effect` action (`calcDispatcher.ts:6225`, enum `:863`) -- the specific-cutting-force rise as chip thickness falls (the size effect proper).
- **Micro-milling size effect**: `micro_milling_size_effect_calc` (`:10916`, enum `:1257`).
- **Chip thinning (the operational face of minimum chip thickness)**: `chip_thinning` (`:1570`), `chip_thinning_compensation` (`:9255`), `chip_thinning_lookup` (`:3084`); `chip_thickness_analyze` / `ball_nose_chip` / `round_insert_chip` (enum `:766`); `AdvancedChipThicknessEngine.ts`.
- **Ploughing regime**: ploughing force surfaced in `wear_force_correction` output (`:223` `ploughing_N` + `is_excessive`).
- **Live SFC advisory**: `ProductEngine.productSFC` (~:1133) already emits a chip-thinning advisory below 50% radial engagement -- mean chip thickness vs programmed fz, with a chip-thinning feed-compensation suggestion (Altintas engagement-angle path, physics-reviewer-adjudicated).

## Real gaps
1. **Explicit minimum-chip-thickness h_min threshold**: the ratio h_min/r_edge (typically ~0.2-0.35 of the edge radius) below which the tool PLOUGHS instead of cuts is covered IMPLICITLY (chip-thinning + ploughing force) but not surfaced as a single named `minimum_chip_thickness` advisory with the edge-radius input. Thin naming/exposure gap, not a physics gap.
2. **Edge-radius (r_edge) as a first-class input**: the size effect scales with h/r_edge; r_edge is referenced in orchestrators but the SFC page does not take it as an explicit input (edge-prep lever, cross-ref UNIT-0012 gap #2). Enrichment gap.
3. **"<X% error on measured micro-milling chips"**: unvalidatable in-repo (no chip-metrology dataset); re-base on the classifier/size-effect invariant (specific force rises monotonically as h falls) which the sweep oracle can already check.

## Verdict
**already-covered** (extend only for the explicit h_min exposure)

## Recommended next action
Do NOT build a size-effect or chip-thickness engine -- both exist wired + tested. If prioritized, add a thin `minimum_chip_thickness` advisory that takes edge_radius + programmed chip thickness and flags the ploughing regime (h < ~0.25*r_edge) with the recommended minimum fz to clear it, reusing AdvancedChipThicknessEngine + the existing chip-thinning path -- WITH uncertainty. Add the size-effect monotonicity invariant (specific cutting force strictly increases as h decreases) to the exhaustive sweep oracle so it is continuously validated. Declare chip-metrology as an operator data dependency.

## ROI
**3/10** -- the physics is done + wired; the only delta is a named h_min advisory + an edge-radius input, low effort and modest incremental value over the existing chip-thinning advisory.
