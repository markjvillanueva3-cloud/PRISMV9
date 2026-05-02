/**
 * Fusion360MultiAxisEngine — Fusion 360 5-axis kinematic + indexing engine
 *
 * Catalogs the 5-axis kinematic configurations Fusion 360 supports + the
 * indexed work plane (3+2) primitives. Provides math helpers for tool
 * orientation, work-plane rotation matrices, and tilt-angle envelope checks.
 *
 * Sister engine: MastercamMultiAxisEngine (same shape, Mastercam-specific).
 *
 * @module engines/Fusion360MultiAxisEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM-FUSION-MULTIAXIS-01
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const KinematicTypeSchema = z.enum([
  "table_table_AC",     // A-axis on cradle, C-axis on rotary table inside cradle
  "table_table_BC",     // B-axis on cradle, C-axis inside
  "head_table_AC",      // A on tool head, C on table
  "head_table_BC",
  "head_head_AB",       // both rotary axes in spindle head (gimbal)
  "head_head_BC",
  "trunnion_AC",        // trunnion + table (Mazak-style)
  "trunnion_BC",
]);
export type KinematicType = z.infer<typeof KinematicTypeSchema>;

export const KinematicSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_]+$/, "id must be snake_case"),
  type: KinematicTypeSchema,
  display_name: z.string().min(1),
  primary_rotary: z.enum(["A", "B", "C"]),
  secondary_rotary: z.enum(["A", "B", "C"]),
  primary_min_deg: z.number(),
  primary_max_deg: z.number(),
  secondary_min_deg: z.number(),
  secondary_max_deg: z.number(),
  supports_tcp: z.boolean(),
  supports_simultaneous: z.boolean(),
  notes: z.string().min(1),
});
export type Kinematic = z.infer<typeof KinematicSchema>;

export const WCSPlaneSchema = z.object({
  origin_xyz_mm: z.tuple([z.number(), z.number(), z.number()]),
  normal_ijk: z.tuple([z.number(), z.number(), z.number()]),
  reference_dir_ijk: z.tuple([z.number(), z.number(), z.number()]),
});
export type WCSPlane = z.infer<typeof WCSPlaneSchema>;

export const ToolOrientationSchema = z.object({
  primary_angle_deg: z.number(),
  secondary_angle_deg: z.number(),
  tcp_active: z.boolean(),
});
export type ToolOrientation = z.infer<typeof ToolOrientationSchema>;

// ── Catalog (8 kinematic configurations) ────────────────────────────────────

const CATALOG_RAW: Kinematic[] = [
  {
    id: "table_table_ac_dmu_50",
    type: "table_table_AC",
    display_name: "DMU 50 / DMU 60 trunnion (A on cradle, C on table)",
    primary_rotary: "A",
    secondary_rotary: "C",
    primary_min_deg: -120,
    primary_max_deg: 120,
    secondary_min_deg: 0,
    secondary_max_deg: 360,
    supports_tcp: true,
    supports_simultaneous: true,
    notes: "DMU 50/60 standard trunnion. A-axis tilts ±120°, C-axis full rotation. TCP active via TRAORI (Siemens) or G43.4 (FANUC).",
  },
  {
    id: "table_table_bc_haas_umc",
    type: "table_table_BC",
    display_name: "Haas UMC-750 / UMC-1000 (B on cradle, C inside)",
    primary_rotary: "B",
    secondary_rotary: "C",
    primary_min_deg: -120,
    primary_max_deg: 120,
    secondary_min_deg: 0,
    secondary_max_deg: 360,
    supports_tcp: true,
    supports_simultaneous: true,
    notes: "Haas UMC trunnion. DWO (Dynamic Work Offsets) replaces manual rotation. Setting 30 must equal 22 for proper TWP positioning.",
  },
  {
    id: "head_head_ab_hermle_c42u",
    type: "head_head_AB",
    display_name: "Hermle C 42 U (head-head A+B gimbal)",
    primary_rotary: "A",
    secondary_rotary: "B",
    primary_min_deg: -110,
    primary_max_deg: 110,
    secondary_min_deg: -180,
    secondary_max_deg: 180,
    supports_tcp: true,
    supports_simultaneous: true,
    notes: "Hermle C 42 U head-head gimbal. Both rotary axes in spindle head — fastest 5-axis simultaneous response on the market.",
  },
  {
    id: "trunnion_ac_mazak_integrex",
    type: "trunnion_AC",
    display_name: "Mazak Integrex i-200ST (mill-turn trunnion)",
    primary_rotary: "A",
    secondary_rotary: "C",
    primary_min_deg: -90,
    primary_max_deg: 195,
    secondary_min_deg: 0,
    secondary_max_deg: 360,
    supports_tcp: true,
    supports_simultaneous: true,
    notes: "Integrex mill-turn. C-axis is the lathe spindle. Mazatrol Smart programs do not use TCP — set EIA mode for Fusion-generated G-code.",
  },
  {
    id: "head_table_ac_okuma_mu_5000",
    type: "head_table_AC",
    display_name: "Okuma MU-5000V / MU-6300V (head-table A+C)",
    primary_rotary: "A",
    secondary_rotary: "C",
    primary_min_deg: -110,
    primary_max_deg: 110,
    secondary_min_deg: 0,
    secondary_max_deg: 360,
    supports_tcp: true,
    supports_simultaneous: true,
    notes: "Okuma MU-V series. G145 = Okuma's TCP equivalent. Different param scheme than FANUC G43.4.",
  },
  {
    id: "table_table_ac_dmg_dmu_125",
    type: "table_table_AC",
    display_name: "DMG MORI DMU 125 P (large trunnion)",
    primary_rotary: "A",
    secondary_rotary: "C",
    primary_min_deg: -130,
    primary_max_deg: 130,
    secondary_min_deg: 0,
    secondary_max_deg: 360,
    supports_tcp: true,
    supports_simultaneous: true,
    notes: "Larger DMU envelope: ±130° A-axis. Big-part 5-axis machining (impellers, turbine blisks).",
  },
  {
    id: "head_head_bc_kitamura_hx",
    type: "head_head_BC",
    display_name: "Kitamura HX-series (B+C head-head)",
    primary_rotary: "B",
    secondary_rotary: "C",
    primary_min_deg: -100,
    primary_max_deg: 100,
    secondary_min_deg: -180,
    secondary_max_deg: 180,
    supports_tcp: true,
    supports_simultaneous: true,
    notes: "Mitsubishi M80 G43.4 controller. Option key required for TCP.",
  },
  {
    id: "trunnion_bc_doosan_smx",
    type: "trunnion_BC",
    display_name: "Doosan Puma SMX (mill-turn trunnion)",
    primary_rotary: "B",
    secondary_rotary: "C",
    primary_min_deg: -90,
    primary_max_deg: 90,
    secondary_min_deg: 0,
    secondary_max_deg: 360,
    supports_tcp: false,
    supports_simultaneous: true,
    notes: "Doosan SMX mill-turn. TCP not supported on standard config — pre-rotate via macros.",
  },
];

function buildCatalog(): { byId: Map<string, Kinematic>; ordered: readonly Kinematic[] } {
  const byId = new Map<string, Kinematic>();
  const ordered: Kinematic[] = [];
  for (const raw of CATALOG_RAW) {
    const parsed = KinematicSchema.parse(raw);
    if (byId.has(parsed.id)) throw new Error(`Fusion360MultiAxis: duplicate id "${parsed.id}"`);
    Object.freeze(parsed);
    byId.set(parsed.id, parsed);
    ordered.push(parsed);
  }
  Object.freeze(ordered);
  return { byId, ordered };
}

const { byId: CATALOG_BY_ID, ordered: CATALOG_ORDERED } = buildCatalog();

// ── Engine ───────────────────────────────────────────────────────────────────

export class Fusion360MultiAxisEngine {
  static readonly EXPECTED_TOTAL = 8;

  static list(): Kinematic[] {
    return CATALOG_ORDERED.map(k => k);
  }

  static lookup(id: string): Kinematic | null {
    return CATALOG_BY_ID.get(id) ?? null;
  }

  static mustLookup(id: string): Kinematic {
    const k = CATALOG_BY_ID.get(id);
    if (!k) throw new Error(`Fusion360MultiAxis: unknown kinematic id "${id}"`);
    return k;
  }

  static listByType(type: KinematicType): Kinematic[] {
    const t = KinematicTypeSchema.parse(type);
    return CATALOG_ORDERED.filter(k => k.type === t);
  }

  static listTcpCapable(): Kinematic[] {
    return CATALOG_ORDERED.filter(k => k.supports_tcp);
  }

  /**
   * Validate that a tool orientation is reachable on the kinematic.
   * Returns ok=false with reasons when angles fall outside the envelope.
   */
  static validateOrientation(args: {
    kinematic_id: string;
    orientation: ToolOrientation;
  }): { ok: boolean; reasons: string[] } {
    const k = Fusion360MultiAxisEngine.mustLookup(args.kinematic_id);
    const o = ToolOrientationSchema.parse(args.orientation);
    const reasons: string[] = [];
    if (o.primary_angle_deg < k.primary_min_deg || o.primary_angle_deg > k.primary_max_deg) {
      reasons.push(
        `${k.primary_rotary}-axis angle ${o.primary_angle_deg}° outside envelope [${k.primary_min_deg}, ${k.primary_max_deg}]`,
      );
    }
    if (o.secondary_angle_deg < k.secondary_min_deg || o.secondary_angle_deg > k.secondary_max_deg) {
      reasons.push(
        `${k.secondary_rotary}-axis angle ${o.secondary_angle_deg}° outside envelope [${k.secondary_min_deg}, ${k.secondary_max_deg}]`,
      );
    }
    if (o.tcp_active && !k.supports_tcp) {
      reasons.push(`TCP requested but ${k.display_name} does not support it`);
    }
    return { ok: reasons.length === 0, reasons };
  }

  /**
   * Compute the 3×3 rotation matrix for a 3+2 indexed plane defined by a
   * normal vector and reference direction. Used by the post-processor when
   * emitting CYCLE800 (Siemens) or G68.2 (FANUC) plane-rotation commands.
   * Returns a row-major 9-element array.
   */
  static planeRotationMatrix(plane: WCSPlane): number[] {
    const p = WCSPlaneSchema.parse(plane);
    const [nx, ny, nz] = p.normal_ijk;
    const [rx, ry, rz] = p.reference_dir_ijk;

    const nLen = Math.hypot(nx, ny, nz);
    const rLen = Math.hypot(rx, ry, rz);
    if (nLen === 0) throw new Error("planeRotationMatrix: normal_ijk magnitude is zero");
    if (rLen === 0) throw new Error("planeRotationMatrix: reference_dir_ijk magnitude is zero");

    // Z' = normalized normal
    const z = [nx / nLen, ny / nLen, nz / nLen];
    // X' = reference dir minus its projection on Z' (Gram-Schmidt), then normalize
    const refDot = rx * z[0] + ry * z[1] + rz * z[2];
    const xRaw = [rx - refDot * z[0], ry - refDot * z[1], rz - refDot * z[2]];
    const xLen = Math.hypot(xRaw[0], xRaw[1], xRaw[2]);
    if (xLen === 0) throw new Error("planeRotationMatrix: reference_dir parallel to normal — pick a non-collinear reference");
    const x = [xRaw[0] / xLen, xRaw[1] / xLen, xRaw[2] / xLen];
    // Y' = Z' × X'
    const y = [
      z[1] * x[2] - z[2] * x[1],
      z[2] * x[0] - z[0] * x[2],
      z[0] * x[1] - z[1] * x[0],
    ];

    return [
      x[0], y[0], z[0],
      x[1], y[1], z[1],
      x[2], y[2], z[2],
    ];
  }

  static count(): number {
    return CATALOG_ORDERED.length;
  }

  static auditCatalog(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    if (CATALOG_ORDERED.length !== Fusion360MultiAxisEngine.EXPECTED_TOTAL) {
      errors.push(`expected ${Fusion360MultiAxisEngine.EXPECTED_TOTAL} kinematics, got ${CATALOG_ORDERED.length}`);
    }
    const ids = new Set<string>();
    for (const k of CATALOG_ORDERED) {
      if (ids.has(k.id)) errors.push(`duplicate id "${k.id}"`);
      ids.add(k.id);
      if (k.primary_min_deg >= k.primary_max_deg) errors.push(`${k.id}: primary_min ≥ primary_max`);
      if (k.secondary_min_deg >= k.secondary_max_deg) errors.push(`${k.id}: secondary_min ≥ secondary_max`);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const fusion360MultiAxisEngine = Fusion360MultiAxisEngine;
