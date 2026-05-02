/**
 * Fusion360MillTurnBridgeEngine — Fusion 360 mill-turn machine + spindle handoff
 *
 * Catalogs Fusion 360's mill-turn machine archetypes (sub-spindle pickup,
 * twin-spindle synchronization, B-axis live tooling) and provides the
 * sub-spindle handoff descriptor + thread cycle parameter envelope helpers.
 *
 * Sister engine: MastercamMillTurnBridge (same shape, Mastercam-specific).
 *
 * @module engines/Fusion360MillTurnBridgeEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM-FUSION-MILLTURN-01
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const SpindleConfigSchema = z.enum([
  "single_spindle",
  "twin_spindle_pickup",
  "twin_spindle_synchronized",
  "single_with_subspindle",
  "single_with_b_axis",
]);
export type SpindleConfig = z.infer<typeof SpindleConfigSchema>;

export const MillTurnArchetypeSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_]+$/, "id must be snake_case"),
  display_name: z.string().min(1),
  vendor: z.string().min(1),
  spindle_config: SpindleConfigSchema,
  has_b_axis: z.boolean(),
  has_y_axis: z.boolean(),
  has_live_tooling: z.boolean(),
  max_workpiece_dia_mm: z.number().positive(),
  max_workpiece_length_mm: z.number().positive(),
  notes: z.string().min(1),
});
export type MillTurnArchetype = z.infer<typeof MillTurnArchetypeSchema>;

export const SubspindleHandoffSchema = z.object({
  source_spindle: z.enum(["main", "sub"]),
  target_spindle: z.enum(["main", "sub"]),
  pickup_distance_mm: z.number().positive(),
  pickup_feed_mmpm: z.number().positive(),
  synchronize_rpm: z.boolean(),
  cutoff_after_pickup: z.boolean(),
});
export type SubspindleHandoff = z.infer<typeof SubspindleHandoffSchema>;

export const ThreadCycleParamsSchema = z.object({
  major_diameter_mm: z.number().positive(),
  pitch_mm: z.number().positive(),
  thread_length_mm: z.number().positive(),
  starts: z.number().int().min(1).max(8),
  /** Standard half-angle for Unified threads = 30°; ACME = 14.5°; metric = 30°. */
  half_angle_deg: z.number().min(5).max(45),
  is_internal: z.boolean(),
});
export type ThreadCycleParams = z.infer<typeof ThreadCycleParamsSchema>;

// ── Catalog (8 archetypes) ──────────────────────────────────────────────────

const CATALOG_RAW: MillTurnArchetype[] = [
  {
    id: "mazak_integrex_i200_st",
    display_name: "Mazak Integrex i-200ST",
    vendor: "Mazak",
    spindle_config: "twin_spindle_synchronized",
    has_b_axis: true,
    has_y_axis: true,
    has_live_tooling: true,
    max_workpiece_dia_mm: 658,
    max_workpiece_length_mm: 1519,
    notes: "Twin-spindle mill-turn with B-axis. Mazatrol Smart NOT G-code-compatible — use EIA mode for Fusion posts.",
  },
  {
    id: "mazak_integrex_e1060v",
    display_name: "Mazak Integrex e-1060V/8",
    vendor: "Mazak",
    spindle_config: "single_with_b_axis",
    has_b_axis: true,
    has_y_axis: true,
    has_live_tooling: true,
    max_workpiece_dia_mm: 1000,
    max_workpiece_length_mm: 6000,
    notes: "Large-format mill-turn vertical layout. B-axis ±120°.",
  },
  {
    id: "doosan_puma_smx_2100sb",
    display_name: "Doosan Puma SMX 2100SB",
    vendor: "DN Solutions (Doosan)",
    spindle_config: "twin_spindle_pickup",
    has_b_axis: true,
    has_y_axis: true,
    has_live_tooling: true,
    max_workpiece_dia_mm: 580,
    max_workpiece_length_mm: 1530,
    notes: "Twin-spindle pickup mill-turn. Sub-spindle synchronization needs explicit M-codes.",
  },
  {
    id: "okuma_multus_b300",
    display_name: "Okuma Multus B300",
    vendor: "Okuma",
    spindle_config: "single_with_b_axis",
    has_b_axis: true,
    has_y_axis: true,
    has_live_tooling: true,
    max_workpiece_dia_mm: 580,
    max_workpiece_length_mm: 1500,
    notes: "OSP G145 = Okuma's TCP equivalent. C-axis live tooling on main + sub.",
  },
  {
    id: "nakamura_tome_super_nty3",
    display_name: "Nakamura-Tome Super NTY3",
    vendor: "Nakamura-Tome",
    spindle_config: "twin_spindle_synchronized",
    has_b_axis: false,
    has_y_axis: true,
    has_live_tooling: true,
    max_workpiece_dia_mm: 305,
    max_workpiece_length_mm: 660,
    notes: "Triple-turret mill-turn with synchronized spindles. Y-axis on all 3 turrets.",
  },
  {
    id: "haas_ds30y",
    display_name: "Haas DS-30Y",
    vendor: "Haas Automation",
    spindle_config: "twin_spindle_pickup",
    has_b_axis: false,
    has_y_axis: true,
    has_live_tooling: true,
    max_workpiece_dia_mm: 343,
    max_workpiece_length_mm: 660,
    notes: "Dual-spindle Y-axis lathe. Spindle synchronization via G198/G199 macros.",
  },
  {
    id: "doosan_lynx_2100lsy",
    display_name: "Doosan Lynx 2100LSY",
    vendor: "DN Solutions (Doosan)",
    spindle_config: "single_with_subspindle",
    has_b_axis: false,
    has_y_axis: true,
    has_live_tooling: true,
    max_workpiece_dia_mm: 320,
    max_workpiece_length_mm: 535,
    notes: "Single main with sub-spindle pickup. Y-axis live tooling for cross-drilling.",
  },
  {
    id: "hardinge_quest_gt27_sp",
    display_name: "Hardinge Quest GT27 SP",
    vendor: "Hardinge",
    spindle_config: "single_spindle",
    has_b_axis: false,
    has_y_axis: false,
    has_live_tooling: false,
    max_workpiece_dia_mm: 200,
    max_workpiece_length_mm: 660,
    notes: "Bar-fed precision lathe. No live tooling — turning only. Best for high-volume small parts.",
  },
];

function buildCatalog(): { byId: Map<string, MillTurnArchetype>; ordered: readonly MillTurnArchetype[] } {
  const byId = new Map<string, MillTurnArchetype>();
  const ordered: MillTurnArchetype[] = [];
  for (const raw of CATALOG_RAW) {
    const parsed = MillTurnArchetypeSchema.parse(raw);
    if (byId.has(parsed.id)) throw new Error(`Fusion360MillTurnBridge: duplicate id "${parsed.id}"`);
    Object.freeze(parsed);
    byId.set(parsed.id, parsed);
    ordered.push(parsed);
  }
  Object.freeze(ordered);
  return { byId, ordered };
}

const { byId: CATALOG_BY_ID, ordered: CATALOG_ORDERED } = buildCatalog();

// ── Engine ───────────────────────────────────────────────────────────────────

export class Fusion360MillTurnBridgeEngine {
  static readonly EXPECTED_TOTAL = 8;

  static list(): MillTurnArchetype[] {
    return CATALOG_ORDERED.map(m => m);
  }

  static lookup(id: string): MillTurnArchetype | null {
    return CATALOG_BY_ID.get(id) ?? null;
  }

  static mustLookup(id: string): MillTurnArchetype {
    const m = CATALOG_BY_ID.get(id);
    if (!m) throw new Error(`Fusion360MillTurnBridge: unknown archetype id "${id}"`);
    return m;
  }

  static listBySpindleConfig(cfg: SpindleConfig): MillTurnArchetype[] {
    const c = SpindleConfigSchema.parse(cfg);
    return CATALOG_ORDERED.filter(m => m.spindle_config === c);
  }

  /** Archetypes capable of full mill-turn (live tooling + Y-axis). */
  static listFullMillTurn(): MillTurnArchetype[] {
    return CATALOG_ORDERED.filter(m => m.has_live_tooling && m.has_y_axis);
  }

  /**
   * Validate a sub-spindle handoff envelope. Returns ok=false with reasons
   * when the handoff geometry / synchronization does not match the archetype.
   */
  static validateHandoff(args: { archetype_id: string; handoff: SubspindleHandoff }): { ok: boolean; reasons: string[] } {
    const arch = Fusion360MillTurnBridgeEngine.mustLookup(args.archetype_id);
    const h = SubspindleHandoffSchema.parse(args.handoff);
    const reasons: string[] = [];
    const hasSub = arch.spindle_config === "twin_spindle_pickup" ||
                   arch.spindle_config === "twin_spindle_synchronized" ||
                   arch.spindle_config === "single_with_subspindle";
    if (!hasSub) {
      reasons.push(`${arch.display_name} has no sub-spindle (config: ${arch.spindle_config})`);
    }
    if (h.synchronize_rpm && arch.spindle_config !== "twin_spindle_synchronized") {
      reasons.push(`Synchronize RPM requires twin_spindle_synchronized (have ${arch.spindle_config})`);
    }
    if (h.pickup_feed_mmpm > 5000) {
      reasons.push(`Pickup feed ${h.pickup_feed_mmpm} mm/min > 5000 mm/min safe limit`);
    }
    if (h.pickup_distance_mm > arch.max_workpiece_length_mm) {
      reasons.push(`Pickup distance ${h.pickup_distance_mm}mm exceeds machine length ${arch.max_workpiece_length_mm}mm`);
    }
    return { ok: reasons.length === 0, reasons };
  }

  /**
   * Compute thread depth + pass schedule for a turning thread cycle.
   * Returns total depth + pass list (each pass is depth-from-start).
   * Uses constant-volume pass scheduling (pass_n = total_depth × √(n/N)).
   */
  static threadPassSchedule(params: ThreadCycleParams, num_passes: number): {
    total_depth_mm: number;
    pass_depths_mm: number[];
  } {
    const p = ThreadCycleParamsSchema.parse(params);
    if (num_passes < 1 || num_passes > 30) throw new Error(`num_passes must be in [1, 30], got ${num_passes}`);
    // Total thread depth ≈ pitch × cos(half_angle) for symmetric threads.
    const halfRad = (p.half_angle_deg * Math.PI) / 180;
    const total_depth = p.pitch_mm * Math.cos(halfRad) * (p.is_internal ? 1.0 : 1.0);
    const pass_depths_mm: number[] = [];
    for (let i = 1; i <= num_passes; i++) {
      pass_depths_mm.push(total_depth * Math.sqrt(i / num_passes));
    }
    return { total_depth_mm: total_depth, pass_depths_mm };
  }

  static count(): number {
    return CATALOG_ORDERED.length;
  }

  static auditCatalog(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    if (CATALOG_ORDERED.length !== Fusion360MillTurnBridgeEngine.EXPECTED_TOTAL) {
      errors.push(`expected ${Fusion360MillTurnBridgeEngine.EXPECTED_TOTAL} archetypes, got ${CATALOG_ORDERED.length}`);
    }
    const ids = new Set<string>();
    for (const m of CATALOG_ORDERED) {
      if (ids.has(m.id)) errors.push(`duplicate id "${m.id}"`);
      ids.add(m.id);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const fusion360MillTurnBridgeEngine = Fusion360MillTurnBridgeEngine;
