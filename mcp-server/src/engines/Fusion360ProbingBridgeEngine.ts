/**
 * Fusion360ProbingBridgeEngine — Fusion 360 probing operation catalog + safety
 *
 * Probing in Fusion 360 lives behind the Manufacturing Extension license.
 * This engine catalogs the supported probing operations + the macro vocabulary
 * Fusion outputs (Renishaw OMP-40 / Inspection Plus / Blum BG90 dialects),
 * and exposes the per-operation parameter envelopes the safety layer can
 * validate against.
 *
 * Sister engine: MastercamProbingBridge (same shape, Mastercam-specific).
 *
 * @module engines/Fusion360ProbingBridgeEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM-FUSION-PROBE-01
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const ProbeBrandSchema = z.enum([
  "renishaw_omp40",
  "renishaw_inspection_plus",
  "renishaw_omp600",
  "blum_bg90",
  "blum_tc60",
  "marposs_t60",
  "haimer_3d_taster",
  "generic_g31",
]);
export type ProbeBrand = z.infer<typeof ProbeBrandSchema>;

export const ProbeOperationKindSchema = z.enum([
  "wcs_origin",
  "single_surface",
  "boss_outer",
  "web_outer",
  "pocket_inner",
  "slot_inner",
  "bore_inner",
  "x_corner",
  "angle_align",
  "stock_size",
  "tool_length",
  "tool_diameter",
  "tool_breakage",
]);
export type ProbeOperationKind = z.infer<typeof ProbeOperationKindSchema>;

export const ProbeOperationSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_]+$/, "id must be snake_case"),
  kind: ProbeOperationKindSchema,
  display_name: z.string().min(1),
  fusion_cycle_code: z.string().min(1),
  macro_vocabulary: z.array(z.string().min(1)).min(1),
  required_axis_count: z.number().int().min(3).max(5),
  retract_min_mm: z.number().nonnegative(),
  feed_max_mmpm: z.number().positive(),
  fast_feed_max_mmpm: z.number().positive(),
  notes: z.string().min(1),
});
export type ProbeOperation = z.infer<typeof ProbeOperationSchema>;

// ── Catalog (13 operations) ─────────────────────────────────────────────────

const CATALOG_RAW: ProbeOperation[] = [
  {
    id: "probe_wcs_4side",
    kind: "wcs_origin",
    display_name: "Probe WCS (4-side find)",
    fusion_cycle_code: "PROBE:WCS",
    macro_vocabulary: ["O9810", "O9811", "G65 P9810", "G65 P9811"],
    required_axis_count: 3,
    retract_min_mm: 5,
    feed_max_mmpm: 600,
    fast_feed_max_mmpm: 3000,
    notes: "Probes 4 sides of a feature to set part zero. Renishaw default macro O9810.",
  },
  {
    id: "probe_single_surface",
    kind: "single_surface",
    display_name: "Probe Single Surface",
    fusion_cycle_code: "PROBE:Surface",
    macro_vocabulary: ["O9811", "G65 P9811", "G31"],
    required_axis_count: 3,
    retract_min_mm: 5,
    feed_max_mmpm: 600,
    fast_feed_max_mmpm: 3000,
    notes: "Single-axis probing — most common WCS Z-set. G31 skip-cycle.",
  },
  {
    id: "probe_boss_outer",
    kind: "boss_outer",
    display_name: "Probe Boss (Outer)",
    fusion_cycle_code: "PROBE:Boss",
    macro_vocabulary: ["O9814"],
    required_axis_count: 3,
    retract_min_mm: 5,
    feed_max_mmpm: 600,
    fast_feed_max_mmpm: 3000,
    notes: "Centers tool on a raised circular boss feature.",
  },
  {
    id: "probe_web_outer",
    kind: "web_outer",
    display_name: "Probe Web (Outer)",
    fusion_cycle_code: "PROBE:Boss",
    macro_vocabulary: ["O9812"],
    required_axis_count: 3,
    retract_min_mm: 5,
    feed_max_mmpm: 600,
    fast_feed_max_mmpm: 3000,
    notes: "Centers tool on a raised rectangular web feature.",
  },
  {
    id: "probe_pocket_inner",
    kind: "pocket_inner",
    display_name: "Probe Pocket (Inner)",
    fusion_cycle_code: "PROBE:Pocket",
    macro_vocabulary: ["O9815"],
    required_axis_count: 3,
    retract_min_mm: 5,
    feed_max_mmpm: 600,
    fast_feed_max_mmpm: 3000,
    notes: "Centers tool inside a closed pocket.",
  },
  {
    id: "probe_slot_inner",
    kind: "slot_inner",
    display_name: "Probe Slot (Inner)",
    fusion_cycle_code: "PROBE:Slot",
    macro_vocabulary: ["O9813"],
    required_axis_count: 3,
    retract_min_mm: 5,
    feed_max_mmpm: 600,
    fast_feed_max_mmpm: 3000,
    notes: "Locates slot center; useful for re-fixturing.",
  },
  {
    id: "probe_bore_inner",
    kind: "bore_inner",
    display_name: "Probe Bore (Inner)",
    fusion_cycle_code: "PROBE:Pocket",
    macro_vocabulary: ["O9814"],
    required_axis_count: 3,
    retract_min_mm: 5,
    feed_max_mmpm: 600,
    fast_feed_max_mmpm: 3000,
    notes: "Same macro family as boss but probes inside diameter.",
  },
  {
    id: "probe_x_corner",
    kind: "x_corner",
    display_name: "Probe X Corner",
    fusion_cycle_code: "PROBE:WCS",
    macro_vocabulary: ["O9810"],
    required_axis_count: 3,
    retract_min_mm: 5,
    feed_max_mmpm: 600,
    fast_feed_max_mmpm: 3000,
    notes: "Probes 2 surfaces at 90° to set X+Y zero.",
  },
  {
    id: "probe_angle_align",
    kind: "angle_align",
    display_name: "Probe Angle Align",
    fusion_cycle_code: "PROBE:Surface",
    macro_vocabulary: ["O9843"],
    required_axis_count: 4,
    retract_min_mm: 5,
    feed_max_mmpm: 600,
    fast_feed_max_mmpm: 3000,
    notes: "Two-point probing to determine workpiece rotation about Z.",
  },
  {
    id: "probe_stock_size",
    kind: "stock_size",
    display_name: "Probe Stock Size",
    fusion_cycle_code: "PROBE:Surface",
    macro_vocabulary: ["O9811", "O9812"],
    required_axis_count: 3,
    retract_min_mm: 5,
    feed_max_mmpm: 600,
    fast_feed_max_mmpm: 3000,
    notes: "Probes stock dimensions — used by Adaptive Clearing for true stock model.",
  },
  {
    id: "probe_tool_length",
    kind: "tool_length",
    display_name: "Probe Tool Length",
    fusion_cycle_code: "PROBE:Surface",
    macro_vocabulary: ["O9851", "O9852"],
    required_axis_count: 3,
    retract_min_mm: 5,
    feed_max_mmpm: 300,
    fast_feed_max_mmpm: 1500,
    notes: "Table-mounted tool setter. Lower fast-feed than work probing.",
  },
  {
    id: "probe_tool_diameter",
    kind: "tool_diameter",
    display_name: "Probe Tool Diameter",
    fusion_cycle_code: "PROBE:Surface",
    macro_vocabulary: ["O9853"],
    required_axis_count: 3,
    retract_min_mm: 5,
    feed_max_mmpm: 300,
    fast_feed_max_mmpm: 1500,
    notes: "Table tool setter measures cutter diameter via spinning probe pass.",
  },
  {
    id: "probe_tool_breakage",
    kind: "tool_breakage",
    display_name: "Probe Tool Breakage",
    fusion_cycle_code: "PROBE:Surface",
    macro_vocabulary: ["O9854", "O9858"],
    required_axis_count: 3,
    retract_min_mm: 5,
    feed_max_mmpm: 300,
    fast_feed_max_mmpm: 1500,
    notes: "Quick check between operations — fault if probe trip is unexpected.",
  },
];

// ── Frozen catalog ───────────────────────────────────────────────────────────

function buildCatalog(): { byId: Map<string, ProbeOperation>; ordered: readonly ProbeOperation[] } {
  const byId = new Map<string, ProbeOperation>();
  const ordered: ProbeOperation[] = [];
  for (const raw of CATALOG_RAW) {
    const parsed = ProbeOperationSchema.parse(raw);
    if (byId.has(parsed.id)) throw new Error(`Fusion360ProbingBridge: duplicate id "${parsed.id}"`);
    Object.freeze(parsed.macro_vocabulary);
    Object.freeze(parsed);
    byId.set(parsed.id, parsed);
    ordered.push(parsed);
  }
  Object.freeze(ordered);
  return { byId, ordered };
}

const { byId: CATALOG_BY_ID, ordered: CATALOG_ORDERED } = buildCatalog();

// ── Engine ───────────────────────────────────────────────────────────────────

export class Fusion360ProbingBridgeEngine {
  static readonly EXPECTED_TOTAL = 13;

  static list(): ProbeOperation[] {
    return CATALOG_ORDERED.map(p => p);
  }

  static lookup(id: string): ProbeOperation | null {
    return CATALOG_BY_ID.get(id) ?? null;
  }

  static mustLookup(id: string): ProbeOperation {
    const p = CATALOG_BY_ID.get(id);
    if (!p) throw new Error(`Fusion360ProbingBridge: unknown probe operation id "${id}"`);
    return p;
  }

  static listByKind(kind: ProbeOperationKind): ProbeOperation[] {
    const k = ProbeOperationKindSchema.parse(kind);
    return CATALOG_ORDERED.filter(p => p.kind === k);
  }

  /** Operations that need a 4-axis-or-better machine. */
  static listMultiAxis(): ProbeOperation[] {
    return CATALOG_ORDERED.filter(p => p.required_axis_count >= 4);
  }

  /** Tool-setter operations only (length / diameter / breakage). */
  static listToolSetter(): ProbeOperation[] {
    return CATALOG_ORDERED.filter(p =>
      p.kind === "tool_length" || p.kind === "tool_diameter" || p.kind === "tool_breakage"
    );
  }

  /**
   * Validate a probing parameter set against the catalog envelope.
   * Returns triggered: true with detail when feed/retract is outside spec.
   */
  static validateProbeParams(args: {
    operation_id: string;
    retract_mm: number;
    feed_mmpm: number;
    fast_feed_mmpm: number;
  }): { ok: boolean; reasons: string[] } {
    const op = Fusion360ProbingBridgeEngine.mustLookup(args.operation_id);
    const reasons: string[] = [];
    if (args.retract_mm < op.retract_min_mm) {
      reasons.push(`retract ${args.retract_mm}mm < required ${op.retract_min_mm}mm for ${op.display_name}`);
    }
    if (args.feed_mmpm > op.feed_max_mmpm) {
      reasons.push(`probing feed ${args.feed_mmpm} mm/min > max ${op.feed_max_mmpm} for ${op.display_name}`);
    }
    if (args.fast_feed_mmpm > op.fast_feed_max_mmpm) {
      reasons.push(`fast feed ${args.fast_feed_mmpm} mm/min > max ${op.fast_feed_max_mmpm} for ${op.display_name}`);
    }
    return { ok: reasons.length === 0, reasons };
  }

  static count(): number {
    return CATALOG_ORDERED.length;
  }

  static auditCatalog(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    if (CATALOG_ORDERED.length !== Fusion360ProbingBridgeEngine.EXPECTED_TOTAL) {
      errors.push(`expected ${Fusion360ProbingBridgeEngine.EXPECTED_TOTAL} probe ops, got ${CATALOG_ORDERED.length}`);
    }
    const ids = new Set<string>();
    for (const p of CATALOG_ORDERED) {
      if (ids.has(p.id)) errors.push(`duplicate id "${p.id}"`);
      ids.add(p.id);
    }
    // Every kind should have ≥1 representative.
    const kinds = new Set(CATALOG_ORDERED.map(p => p.kind));
    for (const k of ProbeOperationKindSchema.options) {
      if (!kinds.has(k)) errors.push(`probe kind "${k}" has no representative`);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const fusion360ProbingBridgeEngine = Fusion360ProbingBridgeEngine;
