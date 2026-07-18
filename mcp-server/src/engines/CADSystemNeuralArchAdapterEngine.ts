/**
 * CADSystemNeuralArchAdapterEngine — CAD-COMPLETE-MS0/PHASE-31 U-CADC-NN04+NN05+NN06
 *
 * Per-CAD-system adapter layer for the Transformer/GNN/Diffusion/RL neural
 * architectures in NeuralCADGenerationEngine. Each supported CAD system
 * (Fusion 360, SolidWorks, Inventor) has its own feature-name vocabulary,
 * tolerance conventions, and BRep entity-id format. This adapter normalizes
 * the per-system FeatureSpec[] into the canonical FeatureSpec shape that the
 * shared neural backbone consumes, and reverses the mapping for outputs.
 *
 * Drains 3 priority CAD-system NN units in one engine (one adapter, multiple
 * CAD systems wired through it — PSN synergy pattern).
 *
 * Pure data + pure transforms. Injectable per-system rule packs.
 */

import type { FeatureSpec } from "./NeuralCADGenerationEngine.js";

// ── Supported CAD systems (matches user priority order) ─────────────────────

export const CADSystem = ["fusion360", "solidworks", "inventor"] as const;
export type CADSystem = (typeof CADSystem)[number];

// ── Per-system feature-name canonicalization rules ──────────────────────────
//
// Each CAD system uses its own native verb set for the same geometric op.
// The adapter maps native → canonical so the shared neural backbone trains
// once and serves all systems.

export interface CADSystemFeatureRules {
  readonly system: CADSystem;
  readonly featureNameMap: ReadonlyMap<string, string>; // native -> canonical
  readonly inverseFeatureNameMap: ReadonlyMap<string, string>; // canonical -> native
  readonly defaultUnit: "mm" | "inch";
  readonly entityIdPrefix: string;
}

function buildRules(
  system: CADSystem,
  pairs: ReadonlyArray<readonly [string, string]>,
  defaultUnit: "mm" | "inch",
  entityIdPrefix: string,
): CADSystemFeatureRules {
  const fwd = new Map<string, string>();
  const inv = new Map<string, string>();
  for (const [native, canonical] of pairs) {
    fwd.set(native, canonical);
    if (!inv.has(canonical)) inv.set(canonical, native);
  }
  return {
    system,
    featureNameMap: fwd,
    inverseFeatureNameMap: inv,
    defaultUnit,
    entityIdPrefix,
  };
}

export const FUSION_RULES: CADSystemFeatureRules = buildRules(
  "fusion360",
  [
    ["ExtrudeFeature",   "feature_extrude"],
    ["RevolveFeature",   "feature_revolve"],
    ["HoleFeature",      "feature_hole"],
    ["ThreadFeature",    "feature_thread"],
    ["FilletFeature",    "feature_fillet"],
    ["ChamferFeature",   "feature_chamfer"],
    ["PocketFeature",    "feature_pocket"],
    ["LoftFeature",      "feature_loft"],
  ],
  "mm",
  "fusion:",
);

export const SOLIDWORKS_RULES: CADSystemFeatureRules = buildRules(
  "solidworks",
  [
    ["Boss-Extrude",      "feature_extrude"],
    ["Revolve",           "feature_revolve"],
    ["Hole-Wizard",       "feature_hole"],
    ["Tap",               "feature_thread"],
    ["Fillet",            "feature_fillet"],
    ["Chamfer",           "feature_chamfer"],
    ["Cut-Extrude",       "feature_pocket"],
    ["Loft",              "feature_loft"],
  ],
  "inch", // SolidWorks default in JM Die's North American workflow
  "sw:",
);

export const INVENTOR_RULES: CADSystemFeatureRules = buildRules(
  "inventor",
  [
    ["Extrusion",         "feature_extrude"],
    ["Revolution",        "feature_revolve"],
    ["Hole",              "feature_hole"],
    ["Thread",            "feature_thread"],
    ["Fillet",            "feature_fillet"],
    ["Chamfer",           "feature_chamfer"],
    ["Pocket",            "feature_pocket"],
    ["Loft",              "feature_loft"],
  ],
  "inch",
  "iv:",
);

export const SYSTEM_RULES: ReadonlyMap<CADSystem, CADSystemFeatureRules> = Object.freeze(new Map<CADSystem, CADSystemFeatureRules>([
  ["fusion360",   FUSION_RULES],
  ["solidworks",  SOLIDWORKS_RULES],
  ["inventor",    INVENTOR_RULES],
]));

// ── Pure transforms ─────────────────────────────────────────────────────────

export function isSupportedSystem(s: string): s is CADSystem {
  return (CADSystem as ReadonlyArray<string>).includes(s);
}

export function getRules(system: CADSystem): CADSystemFeatureRules {
  const r = SYSTEM_RULES.get(system);
  if (!r) throw new Error(`unsupported CAD system: ${system}`);
  return r;
}

/**
 * Canonicalize per-system FeatureSpec[] → unified FeatureSpec[].
 * R12 fail-loud: unknown feature names raise — they must be added to the
 * mapping table, never silently passed through (silent passthrough would
 * train the neural backbone on bogus tokens).
 */
export function canonicalize(
  system: CADSystem,
  specs: ReadonlyArray<FeatureSpec>,
): ReadonlyArray<FeatureSpec> {
  const rules = getRules(system);
  return specs.map(s => {
    const canonical = rules.featureNameMap.get(s.type ?? "");
    if (!canonical) {
      throw new Error(`unknown ${system} feature name: ${s.type} (add to feature map)`);
    }
    return { ...s, type: canonical };
  });
}

/**
 * Inverse: canonical FeatureSpec[] → per-system FeatureSpec[] for output.
 * Used by the generator backend when producing native API calls.
 */
export function nativize(
  system: CADSystem,
  specs: ReadonlyArray<FeatureSpec>,
): ReadonlyArray<FeatureSpec> {
  const rules = getRules(system);
  return specs.map(s => {
    const native = rules.inverseFeatureNameMap.get(s.type ?? "");
    if (!native) {
      throw new Error(`canonical feature ${s.type} has no ${system} native mapping`);
    }
    return { ...s, type: native };
  });
}

export interface CADSystemAdapterSummary {
  schemaVersion: 1;
  supportedSystems: ReadonlyArray<CADSystem>;
  ruleCount: number;
  perSystemFeatureCount: ReadonlyMap<CADSystem, number>;
}

export class CADSystemNeuralArchAdapterEngine {
  systems(): ReadonlyArray<CADSystem> {
    return CADSystem;
  }
  rules(system: CADSystem): CADSystemFeatureRules {
    return getRules(system);
  }
  canonicalize(system: CADSystem, specs: ReadonlyArray<FeatureSpec>): ReadonlyArray<FeatureSpec> {
    return canonicalize(system, specs);
  }
  nativize(system: CADSystem, specs: ReadonlyArray<FeatureSpec>): ReadonlyArray<FeatureSpec> {
    return nativize(system, specs);
  }
  summary(): CADSystemAdapterSummary {
    const perSys = new Map<CADSystem, number>();
    for (const sys of CADSystem) {
      perSys.set(sys, getRules(sys).featureNameMap.size);
    }
    return {
      schemaVersion: 1,
      supportedSystems: CADSystem,
      ruleCount: SYSTEM_RULES.size,
      perSystemFeatureCount: perSys,
    };
  }
}

export const cadSystemNeuralArchAdapterEngine = new CADSystemNeuralArchAdapterEngine();
