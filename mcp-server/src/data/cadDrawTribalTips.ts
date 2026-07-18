/**
 * Canonical CAD drawing tribal lessons -- the default corpus for CADTribalDrawInjectionEngine
 * (U-CADDRAW-TRIBAL-INJECT). Tracked src/data catalog (the state/shared/*.jsonl seed is gitignored,
 * so the propagating source of truth lives here). Callers may override with an inline corpus.
 *
 * Each tip is an operator lesson applied DURING drawing: surfaced per-feature by relevance to the
 * draw context (operation / featureType / query). Sourced from the slot:delta CAD galaxy CLAUDE.md
 * and reference memories.
 */

import type { CADTribalTip } from "../engines/CADTribalDrawInjectionEngine.js";

export const CAD_DRAW_TRIBAL_TIPS: CADTribalTip[] = [
  {
    id: "delta-tribal-001",
    slug: "step-periodic-bspline-blank-doc",
    kind: "failure-mode",
    consume: "cad-step emit / electrode generation",
    tip: "NEVER emit a closed-periodic B_SPLINE_CURVE_WITH_KNOTS with N+1 uniform knots all multiplicity 1 -- Fusion silently rejects it and opens a BLANK document (no error). Use the proven emitMultiPrismStep (polyline edges); for smoothness emit 6 RATIONAL_B_SPLINE arc patches (degree-2, weight 1,sqrt3/2,1). Lint code W3.",
    source: "slot:delta galaxy CLAUDE.md",
    domain: "cad",
  },
  {
    id: "delta-tribal-002",
    slug: "step-inch-unit-drift",
    kind: "failure-mode",
    consume: "cad-step emit",
    tip: "STEP defaults to mm; JM Die convention is INCH. Always set CONVERSION_BASED_UNIT('INCH')=25.4mm. Omitting it makes geometry 25.4x wrong with no error. Lint code W1.",
    source: "slot:delta galaxy CLAUDE.md",
    domain: "cad",
  },
  {
    id: "delta-tribal-003",
    slug: "archetype-match-before-scale",
    kind: "failure-mode",
    consume: "cad-replicate-from-template / electrode gen",
    tip: "Scaling a single-section reference (JM trilobe) to a two-section+blend target (EJOT) is geometrically wrong regardless of scale factors -- wrong archetype. Match the archetype FIRST, then generate parametrically. Never anisotropic-scale across archetypes.",
    source: "slot:delta galaxy CLAUDE.md",
    domain: "cad",
  },
  {
    id: "delta-tribal-004",
    slug: "topology-before-tolerance",
    kind: "doctrine",
    consume: "all cad mutation",
    tip: "Topology before tolerance: if the BRep is inconsistent the toleranced dimensions are noise. Verify faces/edges/vertices before any geometric mutation -- a feature-recognition error propagates straight into a bad toolpath. Never inline ISO 286 fit deviations (import from canonical tables). Never drop PMI/GD&T silently on import.",
    source: "slot:delta soul + galaxy CLAUDE.md",
    domain: "cad",
  },
  {
    id: "delta-tribal-005",
    slug: "sinker-edm-spark-gap",
    kind: "convention",
    consume: "electrode generation / cad->cam(kilo)",
    tip: "JM sinker-EDM electrode spark gap = -.003in total (-.0015/side). Undersize the electrode by the spark gap so the burned cavity matches print nominal after erosion. Bake the offset into the generated geometry, NOT a downstream step.",
    source: "reference_delta_jm_spark_gap_convention",
    domain: "cad",
  },
  {
    id: "delta-tribal-006",
    slug: "lint-step-before-ship",
    kind: "process",
    consume: "cad-step emit / VERIFY gate",
    tip: "Always run cad-step-lint on a generated .step before ship/handoff. A W3 (periodic bspline) or W1 (unit) or E1 (dangling) finding is a likely silent-failure regression; resolve before handing geometry to Fusion/Mastercam or the cad->cam edge.",
    source: "slot:delta U-DELTA-STEP-LINT",
    domain: "cad",
  },
  // Feature-placement design knowledge synthesized by a background Hermes/Grok-4.3 agent
  // (U-DELTA-CADGEN-FEATURE-KNOWLEDGE) to close the observed gap: text->gen got the part ENVELOPE
  // right (kernel 0% err) but under-counted features (a "bracket with two holes" generated 1 hole).
  {
    id: "delta-tribal-007",
    slug: "bracket-default-hole-pattern",
    kind: "design-rule",
    consume: "cad text->gen / feature placement",
    tip: "For mounting plates/brackets, default to a rectangular 2xN (or 2x2) hole array with holes inset ~1.5x diameter from the long edges and centered on the short edges, UNLESS a polar/bolt-circle layout is stated. Prevents the under-count failure (a 'two-hole bracket' generating only 1 hole).",
    source: "hermes/grok-4.3 ME-knowledge synth",
    domain: "cad",
  },
  {
    id: "delta-tribal-008",
    slug: "explicit-feature-count-symmetric",
    kind: "design-rule",
    consume: "cad text->gen / feature placement",
    tip: "When a description specifies a feature count ('two holes', 'four holes') WITHOUT coordinates, place EXACTLY that many, symmetric about the part centerlines, at >=2x-diameter edge distance with equal spacing -- the stated count is a hard requirement, never advisory.",
    source: "hermes/grok-4.3 ME-knowledge synth",
    domain: "cad",
  },
  {
    id: "delta-tribal-009",
    slug: "bolt-circle-vs-rect-grid",
    kind: "design-rule",
    consume: "cad text->gen / feature placement",
    tip: "Generate a bolt-circle (polar) hole array ONLY if 'circle', 'bolt circle', 'diameter', or an angular spacing appears in the description; otherwise use an axis-aligned rectangular grid. The wrong pattern is a topology error even when the hole COUNT is correct.",
    source: "hermes/grok-4.3 ME-knowledge synth",
    domain: "cad",
  },
  {
    id: "delta-tribal-010",
    slug: "feature-density-sanity",
    kind: "design-rule",
    consume: "cad text->gen / feature placement",
    tip: "Sanity-cap total feature count at ~1 hole/pocket per 15 mm of the longest bounding-box edge; reject an over-dense feature pattern on a small part as a likely misread of the description.",
    source: "hermes/grok-4.3 ME-knowledge synth",
    domain: "cad",
  },
];
