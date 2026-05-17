/**
 * CAMScenarioGeneratorEngine — U-CAMTEST08 (also satisfies U-CAMTEST09..13)
 * ==========================================================================
 *
 * PHASE-8: Single generic scenario generator that powers every PHASE-8
 * scenario unit (U-CAMTEST08 2D pockets, U-CAMTEST09 2D contours,
 * U-CAMTEST10 drilling + threading, U-CAMTEST11 3D surfaces, U-CAMTEST12
 * 5-axis, U-CAMTEST13 turning). Earlier per-category engines were planned
 * but the 3x rule applied: every category-specific generator would have
 * been a near-clone of this one, differing only in (categories, hosts,
 * stress profile). One engine + per-category convenience wrappers is
 * the honest answer.
 *
 * Output shape exactly matches the in-host runner ScenarioDescriptorSchema
 * defined in {HyperMill,Fusion360,InventorHSM,Mastercam}InHostRunnerEngine.
 * The runners call ScenarioDescriptorSchema.parse(...) on entry, so any
 * generator drift is caught at scenario boundary.
 *
 * Honest scoping: every (part, slot, host) combination respects
 * part.preferred_hosts — we don't fabricate scenarios for hosts that
 * can't even open the part. Turning parts are mill-turn-only by their
 * own catalog declaration, so they only land on Mastercam + hyperMILL.
 *
 * Per-category counts (calm baseline, host-filtered against part):
 *   pocket_2d   3 parts × 9 slots × 4 hosts = 108
 *   contour_2d  3 parts × 9 slots × 4 hosts = 108
 *   drilling    2 parts × 9 slots × 4 hosts =  72
 *   threading   1×9×4 + 1×9×2 (multi-start mill-turn-only) = 54
 *   surface_3d  3 parts × 9 slots × 4 hosts = 108
 *   multi_axis  3×9×3 + 1×9×4 (impeller/undercut/hub on 3, fillet on 4) = 117
 *   turning     3 parts × 9 slots × 2 hosts =  54
 *   ----------------------------------------------------- TOTAL = 621
 *
 * @module engines/CAMScenarioGeneratorEngine
 * @milestone CAM-EXHAUST-MS0 U-CAMTEST08 (also U-CAMTEST09..13)
 */

import { z } from "zod";
import {
  FixturePartCatalogEngine,
  type FixtureCategory,
  type FixtureHost,
} from "./FixturePartCatalogEngine.js";
import {
  StockWorkholdingCatalogEngine,
  type StockMaterialSlot,
} from "./StockWorkholdingCatalogEngine.js";
import {
  MaterialToolMatrixEngine,
} from "./MaterialToolMatrixEngine.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const StressProfileSchema = z.enum(["calm", "stress_bands", "deliberate_hard_stop"]);
export type StressProfile = z.infer<typeof StressProfileSchema>;

/**
 * Mirrors the ScenarioDescriptorSchema declared in every in-host runner
 * engine (Hyper / Fusion / Inventor / Mastercam). Kept independent here so
 * a generator drift surfaces as a runner-side parse error rather than a
 * silent type widening.
 */
export const GeneratedScenarioSchema = z.object({
  scenario_id: z.string().min(1),
  category: z.enum([
    "pocket_2d", "contour_2d", "drilling", "threading",
    "surface_3d", "multi_axis", "turning",
  ]),
  host: z.enum(["fusion360", "hypermill", "inventor_hsm", "mastercam"]),
  part_id: z.string().min(1),
  stock_id: z.string().min(1),
  material_id: z.string().min(1),
  tool_id: z.string().min(1),
  slot_id: z.string().regex(/^M[123]T[123]$/),
  expected_frame_count: z.number().int().positive(),
  expected_band_transitions: z.number().int().nonnegative(),
  deliberate_hard_stop: z.boolean(),
  latency_p99_budget_ms: z.number().positive(),
  stress_profile: StressProfileSchema,
});
export type GeneratedScenario = z.infer<typeof GeneratedScenarioSchema>;

export const GeneratorConfigSchema = z.object({
  categories: z.array(z.enum([
    "pocket_2d", "contour_2d", "drilling", "threading",
    "surface_3d", "multi_axis", "turning",
  ])).optional(),
  hosts: z.array(z.enum(["fusion360", "hypermill", "inventor_hsm", "mastercam"])).optional(),
  material_slot: z.enum([
    "alu_6061_t6", "steel_1018_crs", "tool_steel_d2",
    "inconel_718", "polymer_uhmw",
  ]).optional(),
  stress_profile: StressProfileSchema.default("calm"),
  expected_frame_count: z.number().int().positive().multipleOf(6).default(12),
  latency_p99_budget_ms: z.number().positive().default(100),
});
export type GeneratorConfig = z.infer<typeof GeneratorConfigSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_CATEGORIES: FixtureCategory[] = [
  "pocket_2d", "contour_2d", "drilling", "threading",
  "surface_3d", "multi_axis", "turning",
];

const ALL_HOSTS: FixtureHost[] = [
  "fusion360", "hypermill", "inventor_hsm", "mastercam",
];

const DEFAULT_MATERIAL_SLOT: StockMaterialSlot = "alu_6061_t6";

// ── Helpers ──────────────────────────────────────────────────────────────────

function stockSlotShort(slot: StockMaterialSlot): string {
  switch (slot) {
    case "alu_6061_t6":   return "6061";
    case "steel_1018_crs": return "1018";
    case "tool_steel_d2":  return "d2";
    case "inconel_718":    return "inconel718";
    case "polymer_uhmw":   return "uhmw";
  }
}

function stressFor(profile: StressProfile): { transitions: number; hardStop: boolean } {
  switch (profile) {
    case "calm":                 return { transitions: 0, hardStop: false };
    case "stress_bands":         return { transitions: 2, hardStop: false };
    case "deliberate_hard_stop": return { transitions: 4, hardStop: true };
  }
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CAMScenarioGeneratorEngine {
  static readonly ALL_CATEGORIES = ALL_CATEGORIES;
  static readonly ALL_HOSTS = ALL_HOSTS;

  /**
   * Generate scenarios for the requested (categories × hosts) cross-product,
   * filtered against each part's preferred_hosts. Defaults: all categories,
   * all hosts, calm stress, 12-frame expected count, 100 ms p99 budget,
   * 6061-T6 stock slot.
   */
  static generate(config: z.input<typeof GeneratorConfigSchema> = {}): GeneratedScenario[] {
    const cfg = GeneratorConfigSchema.parse(config);
    const cats = cfg.categories ?? ALL_CATEGORIES;
    const allowedHosts = cfg.hosts ?? ALL_HOSTS;
    const matSlot = cfg.material_slot ?? DEFAULT_MATERIAL_SLOT;
    const stress = stressFor(cfg.stress_profile);

    const out: GeneratedScenario[] = [];
    for (const cat of cats) {
      for (const part of FixturePartCatalogEngine.listByCategory(cat)) {
        const hostsForPart = part.preferred_hosts.filter(h => allowedHosts.includes(h));
        for (const slot of MaterialToolMatrixEngine.slots()) {
          const combo = MaterialToolMatrixEngine.getCombo(part.part_id, slot.slot_id);
          if (combo === null) continue;
          const stock_id = `stock_${part.part_id}_${stockSlotShort(matSlot)}`;
          // Validate that the stock setup actually exists (audit-time invariant).
          if (StockWorkholdingCatalogEngine.get(stock_id) === null) {
            throw new Error(`CAMScenarioGenerator: missing stock setup "${stock_id}"`);
          }
          for (const host of hostsForPart) {
            const scenario: GeneratedScenario = {
              scenario_id: `${host}_${part.part_id}_${slot.slot_id}_${cfg.stress_profile}`,
              category: cat,
              host,
              part_id: part.part_id,
              stock_id,
              material_id: combo.material_id,
              tool_id: combo.tool_id,
              slot_id: slot.slot_id,
              expected_frame_count: cfg.expected_frame_count,
              expected_band_transitions: stress.transitions,
              deliberate_hard_stop: stress.hardStop,
              latency_p99_budget_ms: cfg.latency_p99_budget_ms,
              stress_profile: cfg.stress_profile,
            };
            out.push(GeneratedScenarioSchema.parse(scenario));
          }
        }
      }
    }
    return out;
  }

  /** Convenience for U-CAMTEST08. 108 = 3 pocket parts × 9 slots × 4 hosts. */
  static generatePocket2D(): GeneratedScenario[] {
    return CAMScenarioGeneratorEngine.generate({ categories: ["pocket_2d"] });
  }

  /** Convenience for U-CAMTEST09. 108 = 3 contour parts × 9 slots × 4 hosts. */
  static generateContour2D(): GeneratedScenario[] {
    return CAMScenarioGeneratorEngine.generate({ categories: ["contour_2d"] });
  }

  /** Convenience for U-CAMTEST10. drilling (72) + threading (54) = 126. */
  static generateDrillingAndThreading(): GeneratedScenario[] {
    return CAMScenarioGeneratorEngine.generate({ categories: ["drilling", "threading"] });
  }

  /** Convenience for U-CAMTEST11. 108 = 3 surface parts × 9 slots × 4 hosts. */
  static generateSurface3D(): GeneratedScenario[] {
    return CAMScenarioGeneratorEngine.generate({ categories: ["surface_3d"] });
  }

  /** Convenience for U-CAMTEST12. 117 = 3×9×3 + 1×9×4 (per part preferred_hosts). */
  static generateMultiAxis(): GeneratedScenario[] {
    return CAMScenarioGeneratorEngine.generate({ categories: ["multi_axis"] });
  }

  /** Convenience for U-CAMTEST13. 54 = 3 turning parts × 9 slots × 2 hosts. */
  static generateTurning(): GeneratedScenario[] {
    return CAMScenarioGeneratorEngine.generate({ categories: ["turning"] });
  }

  /** Generate everything (621 scenarios at calm baseline). */
  static generateAll(): GeneratedScenario[] {
    return CAMScenarioGeneratorEngine.generate();
  }

  /** Predict the count without materializing the scenarios. Cheap pre-flight. */
  static predictCount(config: z.input<typeof GeneratorConfigSchema> = {}): number {
    const cfg = GeneratorConfigSchema.parse(config);
    const cats = cfg.categories ?? ALL_CATEGORIES;
    const allowedHosts = cfg.hosts ?? ALL_HOSTS;
    let total = 0;
    for (const cat of cats) {
      for (const part of FixturePartCatalogEngine.listByCategory(cat)) {
        const hostsForPart = part.preferred_hosts.filter(h => allowedHosts.includes(h));
        total += MaterialToolMatrixEngine.slots().length * hostsForPart.length;
      }
    }
    return total;
  }

  static auditGenerator(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    const all = CAMScenarioGeneratorEngine.generateAll();

    // Every scenario must round-trip the schema (already enforced inside
    // generate(), but we re-parse here as a defence-in-depth check).
    for (const s of all) {
      try { GeneratedScenarioSchema.parse(s); }
      catch (e) { errors.push(`schema parse failed for ${s.scenario_id}: ${(e as Error).message}`); }
    }

    // Predicted count should match materialized count exactly.
    const pred = CAMScenarioGeneratorEngine.predictCount();
    if (pred !== all.length) {
      errors.push(`predictCount ${pred} ≠ generateAll length ${all.length}`);
    }

    // No duplicate scenario_ids (calm-only baseline).
    const ids = new Set<string>();
    for (const s of all) {
      if (ids.has(s.scenario_id)) errors.push(`duplicate scenario_id "${s.scenario_id}"`);
      ids.add(s.scenario_id);
    }

    // Turning scenarios must only target mill-turn hosts.
    for (const s of all) {
      if (s.category === "turning" && s.host !== "mastercam" && s.host !== "hypermill") {
        errors.push(`turning scenario ${s.scenario_id} routed to non-mill-turn host ${s.host}`);
      }
    }

    return { ok: errors.length === 0, errors };
  }
}

export const camScenarioGeneratorEngine = CAMScenarioGeneratorEngine;
