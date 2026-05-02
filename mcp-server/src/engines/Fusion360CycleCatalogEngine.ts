/**
 * Fusion360CycleCatalogEngine — Complete Fusion 360 Toolpath Cycle Reference
 *
 * Encodes Fusion 360's toolpath catalog across 8 categories:
 *   drilling (8), 2d_milling (8), 3d_milling (12), 5axis (6),
 *   turning (7), probing (5), threading (3), sheet_metal (3)
 *   = 52 cycle entries total.
 *
 * Mirrors the shape of MastercamCycleCatalogEngine so the cross-CAM
 * ontology bridge can translate cycle codes between hosts. Sources:
 *   - Fusion 360 Manufacturing documentation (Manufacture workspace)
 *   - HSM Pro / HSMWorks legacy references (Fusion absorbed both)
 *   - Manufacturing Extension probing + 5-axis docs
 *
 * @engine Fusion360CycleCatalogEngine
 * @dispatcher camDispatcher
 * @actions cam_fusion360_cycle_catalog_list, cam_fusion360_cycle_catalog_search,
 *          cam_fusion360_cycle_catalog_lookup, cam_fusion360_cycle_catalog_stats,
 *          cam_fusion360_cycle_catalog_audit
 * @milestone CAM-EXHAUST-MS0 U-CAM-FUSION-CYCLES-01
 *
 * Sister engine: MastercamCycleCatalogEngine (same shape, different vendor).
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const Fusion360CycleCategorySchema = z.enum([
  "drilling",
  "2d_milling",
  "3d_milling",
  "5axis",
  "turning",
  "probing",
  "threading",
  "sheet_metal",
]);
export type Fusion360CycleCategory = z.infer<typeof Fusion360CycleCategorySchema>;

export const Fusion360CycleSchema = z.object({
  code: z.string().min(1).regex(/^[A-Z0-9]+:[A-Za-z0-9_]+$/, "code must be CATEGORY:Name"),
  displayName: z.string().min(1),
  category: Fusion360CycleCategorySchema,
  aliases: z.array(z.string().min(1)),
  gCodeCycles: z.array(z.string().min(1)),
  tribalTips: z.array(z.string().min(1)),
  /** Adaptive Clearing (HSM-derived high-efficiency) flag. */
  isAdaptive: z.boolean(),
  /** Manufacturing Extension only (e.g. probing, advanced 5-axis). */
  requiresMfgExt: z.boolean(),
  /** Mill-turn capable (used by mill-turn host filtering). */
  isMillTurn: z.boolean(),
});
export type Fusion360Cycle = z.infer<typeof Fusion360CycleSchema>;

// ── Catalog (52 cycles) ──────────────────────────────────────────────────────

const CATALOG_RAW: Fusion360Cycle[] = [
  // ── Drilling (8) ──
  {
    code: "DRILL:Drill", displayName: "Drilling", category: "drilling",
    aliases: ["Simple Drill", "Spot Drill"], gCodeCycles: ["G81"],
    tribalTips: ["Use for shallow holes L/D < 3", "Add 0.5 mm dwell at depth for blind-hole roundness"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "DRILL:CounterBore", displayName: "Counterbore", category: "drilling",
    aliases: ["Counter Bore", "C'bore"], gCodeCycles: ["G82"],
    tribalTips: ["G82 dwell controls bottom finish", "Set dwell ≥ 1 spindle revolution at bottom"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "DRILL:Peck", displayName: "Peck Drilling", category: "drilling",
    aliases: ["Deep Drill", "G83 Peck"], gCodeCycles: ["G83"],
    tribalTips: ["Use for L/D > 5", "Peck = 1.5×D for steel, 2×D for aluminum", "Through-spindle coolant +40% chip clearance"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "DRILL:ChipBreak", displayName: "Chip Break", category: "drilling",
    aliases: ["High Speed Peck", "G73"], gCodeCycles: ["G73"],
    tribalTips: ["Faster than full peck for 3 < L/D < 8", "Retract 0.5–1 mm between pecks"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "DRILL:Bore", displayName: "Boring", category: "drilling",
    aliases: ["Bore", "G85 Bore"], gCodeCycles: ["G85", "G86"],
    tribalTips: ["G85 retracts at feed (best surface)", "G86 retracts at rapid (faster, surface marks)"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "DRILL:HelicalBore", displayName: "Bore (Helical)", category: "drilling",
    aliases: ["Helical Bore", "Bore Mill"], gCodeCycles: [],
    tribalTips: ["Use end mill instead of boring bar", "Helical interpolation lets one tool bore many sizes"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "DRILL:Circular", displayName: "Circular Pocket", category: "drilling",
    aliases: ["Circular Mill", "Pocket Mill"], gCodeCycles: [],
    tribalTips: ["Helical entry preferred for pocket diameter > 2× tool diameter"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "DRILL:ProbeSurface", displayName: "Probe Surface (Drill Cycle)", category: "drilling",
    aliases: ["Probe Z"], gCodeCycles: ["G31"],
    tribalTips: ["Use Renishaw/Blum probe with skip-cycle G31"],
    isAdaptive: false, requiresMfgExt: true, isMillTurn: false,
  },

  // ── 2D Milling (8) ──
  {
    code: "MILL2D:Face", displayName: "Face", category: "2d_milling",
    aliases: ["Facing", "Top Face"], gCodeCycles: [],
    tribalTips: ["Step-over 70–80% of cutter dia for finish", "Climb mill for surface finish"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL2D:Adaptive", displayName: "2D Adaptive Clearing", category: "2d_milling",
    aliases: ["2D Adaptive", "Trochoidal Pocket"], gCodeCycles: [],
    tribalTips: ["Use 35% step-over with 100% axial engagement", "Allows 3–5× MRR over conventional pocket"],
    isAdaptive: true, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL2D:Pocket", displayName: "2D Pocket", category: "2d_milling",
    aliases: ["Pocket", "2D Pocket Clearing"], gCodeCycles: [],
    tribalTips: ["Helical entry for closed pockets", "Ramp entry for open pockets"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL2D:Contour", displayName: "2D Contour", category: "2d_milling",
    aliases: ["2D Profile", "Outline"], gCodeCycles: [],
    tribalTips: ["Lead-in/lead-out arcs prevent witness marks", "Multiple stepdowns for deep contours"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL2D:Slot", displayName: "Slot", category: "2d_milling",
    aliases: ["Keyway", "Slot Mill"], gCodeCycles: [],
    tribalTips: ["Use slotting end mill (3- or 4-flute) for full-width cuts"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL2D:Trace", displayName: "Trace", category: "2d_milling",
    aliases: ["Engrave Path", "Trace Path"], gCodeCycles: [],
    tribalTips: ["Use V-bit for engraving; use end mill for trace cuts"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL2D:Engrave", displayName: "Engrave", category: "2d_milling",
    aliases: ["V-Engrave"], gCodeCycles: [],
    tribalTips: ["V-bit angle determines stroke width; use 2D Adaptive for engraved pockets"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL2D:ThreadMill", displayName: "Thread Milling (2D)", category: "2d_milling",
    aliases: ["Thread Mill"], gCodeCycles: [],
    tribalTips: ["Climb thread mill for finish; conventional for roughing larger threads"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },

  // ── 3D Milling (12) ──
  {
    code: "MILL3D:AdaptiveClearing", displayName: "3D Adaptive Clearing", category: "3d_milling",
    aliases: ["3D Adaptive", "VoluMill"], gCodeCycles: [],
    tribalTips: ["Constant chip-load engagement", "Allows full flute depth at high feed"],
    isAdaptive: true, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL3D:PocketClearing", displayName: "3D Pocket Clearing", category: "3d_milling",
    aliases: ["3D Pocket", "Roughing Pocket"], gCodeCycles: [],
    tribalTips: ["Use for non-adaptive roughing on legacy controllers"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL3D:Parallel", displayName: "Parallel", category: "3d_milling",
    aliases: ["Parallel Finishing", "Raster"], gCodeCycles: [],
    tribalTips: ["Best for shallow surfaces", "Step-over ≤ 25% of ball nose dia for fine finish"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL3D:Contour", displayName: "Contour (3D)", category: "3d_milling",
    aliases: ["3D Contour", "Z-Level"], gCodeCycles: [],
    tribalTips: ["Best for steep walls", "Combine with parallel for full surface coverage"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL3D:Ramp", displayName: "Ramp", category: "3d_milling",
    aliases: ["3D Ramp"], gCodeCycles: [],
    tribalTips: ["Good for tapered walls"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL3D:Horizontal", displayName: "Horizontal", category: "3d_milling",
    aliases: ["Horizontal Finishing"], gCodeCycles: [],
    tribalTips: ["Detects + finishes flat horizontal surfaces only", "Pair with parallel for sloped regions"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL3D:Pencil", displayName: "Pencil", category: "3d_milling",
    aliases: ["Pencil Finishing", "Corner"], gCodeCycles: [],
    tribalTips: ["Cleans corner radii left by larger tools"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL3D:Scallop", displayName: "Scallop", category: "3d_milling",
    aliases: ["Constant Scallop", "Cusp"], gCodeCycles: [],
    tribalTips: ["Maintains constant cusp height across geometry", "Best on freeform surfaces"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL3D:Spiral", displayName: "Spiral", category: "3d_milling",
    aliases: ["3D Spiral"], gCodeCycles: [],
    tribalTips: ["Best for circular/round pockets and bosses"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL3D:Radial", displayName: "Radial", category: "3d_milling",
    aliases: ["Radial Finishing"], gCodeCycles: [],
    tribalTips: ["Best for circular features with center point"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL3D:MorphSpiral", displayName: "Morphed Spiral", category: "3d_milling",
    aliases: ["Morph Spiral"], gCodeCycles: [],
    tribalTips: ["Spirals between two boundary curves", "Smooth on irregular pockets"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "MILL3D:Project", displayName: "Project (3D)", category: "3d_milling",
    aliases: ["Project Onto Surface"], gCodeCycles: [],
    tribalTips: ["Projects 2D toolpath onto 3D surface", "Useful for engraving on curved parts"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },

  // ── 5-Axis (6) ──
  {
    code: "AX5:MultiAxisContour", displayName: "Multi-Axis Contour", category: "5axis",
    aliases: ["5-Axis Contour"], gCodeCycles: [],
    tribalTips: ["Tilts tool to maintain optimal cutting angle", "Reduces lead/lag forces on impellers"],
    isAdaptive: false, requiresMfgExt: true, isMillTurn: false,
  },
  {
    code: "AX5:Swarf", displayName: "Swarf", category: "5axis",
    aliases: ["Side-Milling 5-Axis"], gCodeCycles: [],
    tribalTips: ["Cuts with side of tool against ruled surfaces", "Max MRR on impeller blades + turbine vanes"],
    isAdaptive: false, requiresMfgExt: true, isMillTurn: false,
  },
  {
    code: "AX5:Adaptive", displayName: "5-Axis Adaptive", category: "5axis",
    aliases: ["5-Axis Adaptive Clearing"], gCodeCycles: [],
    tribalTips: ["Combines adaptive clearing with 5-axis tilt for undercuts"],
    isAdaptive: true, requiresMfgExt: true, isMillTurn: false,
  },
  {
    code: "AX5:Flow", displayName: "Flow", category: "5axis",
    aliases: ["5-Axis Flow", "Streamline"], gCodeCycles: [],
    tribalTips: ["Generates streamlines on freeform surfaces", "Excellent for blade fillets"],
    isAdaptive: false, requiresMfgExt: true, isMillTurn: false,
  },
  {
    code: "AX5:Rotary", displayName: "Rotary", category: "5axis",
    aliases: ["4-Axis Rotary"], gCodeCycles: [],
    tribalTips: ["Wraps cylindrical operations around the rotary axis", "Use for shaft engraving"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: true,
  },
  {
    code: "AX5:MultiAxisPocket", displayName: "Multi-Axis Pocket", category: "5axis",
    aliases: ["5-Axis Pocket"], gCodeCycles: [],
    tribalTips: ["Pocket clearing with rotary access", "Useful for undercut pockets"],
    isAdaptive: false, requiresMfgExt: true, isMillTurn: false,
  },

  // ── Turning (7) ──
  {
    code: "TURN:Profile", displayName: "Profile (Turning)", category: "turning",
    aliases: ["OD Profile", "Profile Turning"], gCodeCycles: ["G71"],
    tribalTips: ["G71 outer-profile cycle handles roughing automatically"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: true,
  },
  {
    code: "TURN:Face", displayName: "Face (Turning)", category: "turning",
    aliases: ["Facing"], gCodeCycles: ["G94"],
    tribalTips: ["Constant SFM (G96) gives best surface on faces"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: true,
  },
  {
    code: "TURN:Groove", displayName: "Groove", category: "turning",
    aliases: ["OD Groove", "Internal Groove"], gCodeCycles: ["G75"],
    tribalTips: ["Pecking grooves prevent insert chipping in tough materials"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: true,
  },
  {
    code: "TURN:Thread", displayName: "Thread (Turning)", category: "turning",
    aliases: ["OD Thread", "Single-Point Thread"], gCodeCycles: ["G76"],
    tribalTips: ["G76 multi-pass thread cycle handles depth scheduling automatically"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: true,
  },
  {
    code: "TURN:Part", displayName: "Part Off", category: "turning",
    aliases: ["Cut Off", "Parting"], gCodeCycles: [],
    tribalTips: ["Use parting blade with 0.5–2× insert width", "Lubricant flood improves chip evacuation"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: true,
  },
  {
    code: "TURN:Bore", displayName: "Bore (Turning)", category: "turning",
    aliases: ["ID Boring"], gCodeCycles: ["G72"],
    tribalTips: ["Use boring bar with anti-vibration tooling for L/D > 4"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: true,
  },
  {
    code: "TURN:SinglePointDrill", displayName: "Single-Point Drilling (Turning)", category: "turning",
    aliases: ["On-Center Drill"], gCodeCycles: [],
    tribalTips: ["Use for on-center drilling on lathe before tailstock setup"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: true,
  },

  // ── Probing (5) — Manufacturing Extension required ──
  {
    code: "PROBE:WCS", displayName: "Probe WCS", category: "probing",
    aliases: ["Set WCS", "Probe Origin"], gCodeCycles: ["G31"],
    tribalTips: ["Probes 4 axes to set part zero", "Use Renishaw OMP-40 for sub-2 µm repeatability"],
    isAdaptive: false, requiresMfgExt: true, isMillTurn: false,
  },
  {
    code: "PROBE:Surface", displayName: "Probe Surface", category: "probing",
    aliases: ["Probe Z"], gCodeCycles: ["G31"],
    tribalTips: ["Single-point probing for Z reference"],
    isAdaptive: false, requiresMfgExt: true, isMillTurn: false,
  },
  {
    code: "PROBE:Boss", displayName: "Probe Boss/Web", category: "probing",
    aliases: ["Probe Boss", "Probe Web"], gCodeCycles: ["G31"],
    tribalTips: ["Centers tool on a raised feature"],
    isAdaptive: false, requiresMfgExt: true, isMillTurn: false,
  },
  {
    code: "PROBE:Pocket", displayName: "Probe Pocket", category: "probing",
    aliases: ["Probe Pocket"], gCodeCycles: ["G31"],
    tribalTips: ["Centers tool inside a pocket or hole"],
    isAdaptive: false, requiresMfgExt: true, isMillTurn: false,
  },
  {
    code: "PROBE:Slot", displayName: "Probe Slot", category: "probing",
    aliases: ["Probe Slot"], gCodeCycles: ["G31"],
    tribalTips: ["Locates slot center; useful for re-fixturing"],
    isAdaptive: false, requiresMfgExt: true, isMillTurn: false,
  },

  // ── Threading (3) ──
  {
    code: "THREAD:Tap", displayName: "Tap", category: "threading",
    aliases: ["Rigid Tap"], gCodeCycles: ["G84"],
    tribalTips: ["Rigid tapping requires synchronized spindle/feed", "Use form taps for ductile materials"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "THREAD:TapChipBreak", displayName: "Tap (Chip Break)", category: "threading",
    aliases: ["Peck Tap"], gCodeCycles: ["G84.2"],
    tribalTips: ["Use for blind tapped holes in tough materials"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },
  {
    code: "THREAD:Mill", displayName: "Thread Mill (Cycle)", category: "threading",
    aliases: ["Thread Milling Cycle"], gCodeCycles: [],
    tribalTips: ["Single-point or multi-tooth thread mill", "Climb-cut for finish thread"],
    isAdaptive: false, requiresMfgExt: false, isMillTurn: false,
  },

  // ── Sheet Metal (3) — Fusion Manufacturing extension ──
  {
    code: "SHEET:Punch", displayName: "Punch", category: "sheet_metal",
    aliases: ["Punching"], gCodeCycles: [],
    tribalTips: ["Use turret-punch tooling library for tonnage calc"],
    isAdaptive: false, requiresMfgExt: true, isMillTurn: false,
  },
  {
    code: "SHEET:Notch", displayName: "Notch", category: "sheet_metal",
    aliases: ["Notching"], gCodeCycles: [],
    tribalTips: ["Single notching cycle for corner cleanup"],
    isAdaptive: false, requiresMfgExt: true, isMillTurn: false,
  },
  {
    code: "SHEET:Nibble", displayName: "Nibble", category: "sheet_metal",
    aliases: ["Nibbling"], gCodeCycles: [],
    tribalTips: ["Repeated punch operations to cut a profile"],
    isAdaptive: false, requiresMfgExt: true, isMillTurn: false,
  },
];

// ── Frozen catalog construction ──────────────────────────────────────────────

function buildCatalog(): { byCode: Map<string, Fusion360Cycle>; ordered: readonly Fusion360Cycle[] } {
  const byCode = new Map<string, Fusion360Cycle>();
  const ordered: Fusion360Cycle[] = [];
  for (const raw of CATALOG_RAW) {
    const parsed = Fusion360CycleSchema.parse(raw);
    if (byCode.has(parsed.code)) {
      throw new Error(`Fusion360CycleCatalog: duplicate cycle code "${parsed.code}"`);
    }
    Object.freeze(parsed.aliases);
    Object.freeze(parsed.gCodeCycles);
    Object.freeze(parsed.tribalTips);
    Object.freeze(parsed);
    byCode.set(parsed.code, parsed);
    ordered.push(parsed);
  }
  Object.freeze(ordered);
  return { byCode, ordered };
}

const { byCode: CATALOG_BY_CODE, ordered: CATALOG_ORDERED } = buildCatalog();

// ── Engine ───────────────────────────────────────────────────────────────────

export class Fusion360CycleCatalogEngine {
  static readonly EXPECTED_TOTAL = 52;

  static list(): Fusion360Cycle[] {
    return CATALOG_ORDERED.map(c => c);
  }

  static listByCategory(category: Fusion360CycleCategory): Fusion360Cycle[] {
    const cat = Fusion360CycleCategorySchema.parse(category);
    return CATALOG_ORDERED.filter(c => c.category === cat);
  }

  static lookup(code: string): Fusion360Cycle | null {
    return CATALOG_BY_CODE.get(code) ?? null;
  }

  static mustLookup(code: string): Fusion360Cycle {
    const c = CATALOG_BY_CODE.get(code);
    if (!c) throw new Error(`Fusion360CycleCatalog: unknown cycle code "${code}"`);
    return c;
  }

  /** Free-text search across displayName + aliases + code. Case-insensitive. */
  static search(query: string): Fusion360Cycle[] {
    const q = query.toLowerCase().trim();
    if (q.length === 0) return [];
    return CATALOG_ORDERED.filter(c =>
      c.displayName.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.aliases.some(a => a.toLowerCase().includes(q))
    );
  }

  /** Cycles that require Fusion 360 Manufacturing Extension license. */
  static listMfgExtOnly(): Fusion360Cycle[] {
    return CATALOG_ORDERED.filter(c => c.requiresMfgExt);
  }

  /** Adaptive Clearing cycles (the HSM-derived high-efficiency family). */
  static listAdaptive(): Fusion360Cycle[] {
    return CATALOG_ORDERED.filter(c => c.isAdaptive);
  }

  /** Mill-turn capable cycles. */
  static listMillTurn(): Fusion360Cycle[] {
    return CATALOG_ORDERED.filter(c => c.isMillTurn);
  }

  static count(): number {
    return CATALOG_ORDERED.length;
  }

  static countByCategory(): Record<Fusion360CycleCategory, number> {
    const out: Record<string, number> = {
      drilling: 0, "2d_milling": 0, "3d_milling": 0, "5axis": 0,
      turning: 0, probing: 0, threading: 0, sheet_metal: 0,
    };
    for (const c of CATALOG_ORDERED) out[c.category] += 1;
    return out as Record<Fusion360CycleCategory, number>;
  }

  static stats(): {
    total: number;
    by_category: Record<Fusion360CycleCategory, number>;
    adaptive_count: number;
    mfg_ext_count: number;
    mill_turn_count: number;
  } {
    return {
      total: CATALOG_ORDERED.length,
      by_category: Fusion360CycleCatalogEngine.countByCategory(),
      adaptive_count: Fusion360CycleCatalogEngine.listAdaptive().length,
      mfg_ext_count: Fusion360CycleCatalogEngine.listMfgExtOnly().length,
      mill_turn_count: Fusion360CycleCatalogEngine.listMillTurn().length,
    };
  }

  static auditCatalog(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    if (CATALOG_ORDERED.length !== Fusion360CycleCatalogEngine.EXPECTED_TOTAL) {
      errors.push(`expected ${Fusion360CycleCatalogEngine.EXPECTED_TOTAL} cycles, got ${CATALOG_ORDERED.length}`);
    }
    const seenCodes = new Set<string>();
    for (const c of CATALOG_ORDERED) {
      if (seenCodes.has(c.code)) errors.push(`duplicate code "${c.code}"`);
      seenCodes.add(c.code);
    }
    // Every category must have at least one cycle.
    const cats = new Set(CATALOG_ORDERED.map(c => c.category));
    for (const required of Fusion360CycleCategorySchema.options) {
      if (!cats.has(required)) errors.push(`category "${required}" has no cycles`);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const fusion360CycleCatalogEngine = Fusion360CycleCatalogEngine;
