/**
 * PPMachineVectorEncoderEngine — PP-AGI-MS1
 *
 * Maps machine kinematic profiles to dense 40-dimensional feature vectors
 * capturing topology, capabilities, accuracy, and performance. Enables:
 *   - Machine similarity search: find closest machine to a new/unknown one
 *   - Machine transfer: apply G-code patterns from similar machines
 *   - Machine clustering: group by behavior across manufacturers
 *   - Capability gap analysis: what makes machines different
 *
 * CONSUMES PostProcessorMachineKinematicsEngine data (910+ machines,
 * 20 topology types, 5 way types, 5 build quality tiers).
 *
 * NOT a kinematics engine — does not compute DH matrices, inverse kinematics,
 * RTCP, or motion profiles. Those are handled by KinematicsEngine,
 * MultiAxisKinematicEngine, InverseKinematicsSolverEngine, etc.
 *
 * Embedding dimensions (40 total):
 *   [0..4]   topology category (vmc/hmc/lathe/5axis/other)
 *   [5]      axis count normalized (/5)
 *   [6..8]   workplane (horizontal/vertical/vertical-ram)
 *   [9..13]  way type (box/linear/hydrostatic/air/linear-motor)
 *   [14..18] build quality tier (production→metrology)
 *   [19..21] travel norms (X, Y, Z / 1500mm)
 *   [22..23] rotary capability (A_deg/360, C_deg/360)
 *   [24]     table area normalized
 *   [25]     max work load normalized
 *   [26..29] spindle (RPM, power, torque, coolant-through)
 *   [30..31] dynamics (rapid rate, accel)
 *   [32..33] accuracy (positioning, repeatability — log scale)
 *   [34..35] collision data flag, work volume
 *   [36..39] type flags (5axis, lathe, EDM, grinder)
 *
 * References: PP-AGI-MAXOUT-ROADMAP Phase 0 MS1
 * @module PPMachineVectorEncoderEngine
 */

import {
  postProcessorMachineKinematicsEngine,
} from "./PostProcessorMachineKinematicsEngine.js";

// ── Constants ─────────────────────────────────────────────────────────

export const MACHINE_EMBEDDING_DIM = 40;

const TOPO_MAP: Record<string, number> = {
  "vmc-3axis": 0, "vmc-3axis-gantry": 0, "vmc-4axis": 0,
  "hmc-3axis": 1, "hmc-4axis": 1,
  "lathe-2axis": 2, "lathe-live-tool": 2, "lathe-twin-spindle": 2, "swiss-type": 2,
  "5axis-table-table": 3, "5axis-head-head": 3, "5axis-mixed": 3, "mill-turn-b-axis": 3,
  "wire-edm-4axis": 4, "wire-edm-5axis": 4, "sinker-edm": 4,
  "surface-grinder": 4, "cylindrical-grinder": 4, "jig-grinder": 4,
  "gantry-large-format": 0, "micro-machining": 3,
};

const WAY_MAP: Record<string, number> = {
  "box-way": 0, "linear-rolling": 1, "hydrostatic": 2, "air-bearing": 3, "linear-motor": 4,
};

const TIER_MAP: Record<string, number> = {
  "production": 0, "precision": 1, "high-precision": 2, "ultra-precision": 3, "metrology-grade": 4,
};

const WORKPLANE_MAP: Record<string, number> = {
  "horizontal": 0, "vertical": 1, "vertical-ram": 2,
};

const DIM_NAMES: string[] = [
  "topo_vmc", "topo_hmc", "topo_lathe", "topo_5axis", "topo_other",
  "axis_count_norm",
  "plane_horizontal", "plane_vertical", "plane_vertical_ram",
  "way_box", "way_linear", "way_hydrostatic", "way_air", "way_linear_motor",
  "tier_production", "tier_precision", "tier_high_prec", "tier_ultra_prec", "tier_metrology",
  "travel_x_norm", "travel_y_norm", "travel_z_norm",
  "rotary_a_norm", "rotary_c_norm",
  "table_area_norm", "load_capacity_norm",
  "spindle_rpm_norm", "spindle_power_norm", "spindle_torque_norm", "coolant_through",
  "rapid_rate_norm", "rapid_accel_norm",
  "accuracy_pos_norm", "accuracy_rep_norm",
  "has_collision_data", "work_volume_norm",
  "is_5axis", "is_lathe", "is_edm", "is_grinder",
];

// ── Types ─────────────────────────────────────────────────────────────

export interface MachineEmbedding {
  machine_id: string;
  machine_name: string;
  brand: string;
  vector: number[];
  dimension: number;
}

export interface MachineSimilarityResult {
  machine_a: string;
  machine_b: string;
  cosine_similarity: number;
  euclidean_distance: number;
  shared_capabilities: string[];
  key_differences: string[];
}

export interface MachineNearestResult {
  query: string;
  neighbors: Array<{
    machine_id: string;
    machine_name: string;
    cosine_similarity: number;
  }>;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPMachineVectorEncoderEngine {
  private cache = new Map<string, MachineEmbedding>();

  /** Embed a single machine profile to a 40-dim vector. */
  embed(machineId: string): MachineEmbedding | null {
    const cached = this.cache.get(machineId);
    if (cached) return cached;

    const profile = postProcessorMachineKinematicsEngine.getMachineProfile(machineId);
    if (!profile) return null;

    const topology = postProcessorMachineKinematicsEngine.getTopology(profile.topologyId);
    const vec = this.profileToVector(profile, topology);

    const result: MachineEmbedding = {
      machine_id: profile.id,
      machine_name: profile.name,
      brand: profile.brand,
      vector: vec,
      dimension: MACHINE_EMBEDDING_DIM,
    };

    this.cache.set(machineId, result);
    return result;
  }

  /** Embed all representative machines. */
  embedAll(): MachineEmbedding[] {
    const machines = postProcessorMachineKinematicsEngine.getRepresentativeMachines();
    const results: MachineEmbedding[] = [];
    for (const m of machines) {
      const emb = this.embed(m.id);
      if (emb) results.push(emb);
    }
    return results;
  }

  /** Cosine similarity between two vectors. */
  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? dot / denom : 0;
  }

  /** Euclidean distance between two vectors. */
  euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const d = a[i] - b[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
  }

  /** Compare two machines: similarity + capability analysis. */
  compare(machineA: string, machineB: string): MachineSimilarityResult | null {
    const embA = this.embed(machineA);
    const embB = this.embed(machineB);
    if (!embA || !embB) return null;

    const shared: string[] = [];
    const diffs: string[] = [];

    for (let i = 0; i < MACHINE_EMBEDDING_DIM; i++) {
      const diff = Math.abs(embA.vector[i] - embB.vector[i]);
      if (diff < 0.01 && embA.vector[i] > 0.5) shared.push(DIM_NAMES[i]);
      else if (diff > 0.3) diffs.push(DIM_NAMES[i]);
    }

    return {
      machine_a: embA.machine_id,
      machine_b: embB.machine_id,
      cosine_similarity: round4(this.cosineSimilarity(embA.vector, embB.vector)),
      euclidean_distance: round4(this.euclideanDistance(embA.vector, embB.vector)),
      shared_capabilities: shared,
      key_differences: diffs,
    };
  }

  /** Find k nearest machines to a query machine. */
  findNearest(machineId: string, k = 5): MachineNearestResult | null {
    const query = this.embed(machineId);
    if (!query) return null;

    const all = this.embedAll();
    const scored = all
      .filter(e => e.machine_id !== query.machine_id)
      .map(e => ({
        machine_id: e.machine_id,
        machine_name: e.machine_name,
        cosine_similarity: round4(this.cosineSimilarity(query.vector, e.vector)),
      }))
      .sort((a, b) => b.cosine_similarity - a.cosine_similarity)
      .slice(0, k);

    return { query: query.machine_id, neighbors: scored };
  }

  /** Get human-readable dimension name. */
  dimensionName(index: number): string {
    return DIM_NAMES[index] ?? `dim_${index}`;
  }

  /** Clear the embedding cache. */
  invalidate(): void {
    this.cache.clear();
  }

  // ── Private ──────────────────────────────────────────────────────────

  private profileToVector(profile: any, topology: any): number[] {
    const v = new Array<number>(MACHINE_EMBEDDING_DIM).fill(0);

    // [0..4] topology category one-hot
    const topoIdx = TOPO_MAP[topology?.category ?? ""] ?? 4;
    v[topoIdx] = 1;

    // [5] axis count
    v[5] = clamp01((topology?.axes ?? 3) / 5);

    // [6..8] workplane one-hot
    const wpIdx = WORKPLANE_MAP[topology?.workplane ?? "horizontal"] ?? 0;
    v[6 + wpIdx] = 1;

    // [9..13] way type one-hot
    const wayIdx = WAY_MAP[profile.wayTypeId ?? "linear-rolling"] ?? 1;
    v[9 + wayIdx] = 1;

    // [14..18] build quality tier one-hot
    const tierIdx = TIER_MAP[profile.buildQualityTier ?? "production"] ?? 0;
    v[14 + tierIdx] = 1;

    // [19..21] travel norms
    const t = profile.travels ?? {};
    v[19] = clamp01((t.X_mm ?? 0) / 1500);
    v[20] = clamp01((t.Y_mm ?? 0) / 1500);
    v[21] = clamp01((t.Z_mm ?? 0) / 1500);

    // [22..23] rotary capability
    v[22] = t.A_deg ? clamp01(t.A_deg / 360) : 0;
    v[23] = t.C_deg ? clamp01(t.C_deg / 360) : 0;

    // [24] table area
    const table = profile.tableSize_mm ?? {};
    const tableArea = (table.X ?? 0) * (table.Y ?? 0);
    v[24] = clamp01(tableArea / 2_000_000);

    // [25] work load
    v[25] = clamp01((profile.maxWorkLoad_kg ?? 0) / 5000);

    // [26..29] spindle
    const sp = profile.spindle ?? {};
    v[26] = clamp01((sp.maxRPM ?? 0) / 40000);
    v[27] = clamp01((sp.maxPower_kW ?? 0) / 50);
    v[28] = clamp01((sp.maxTorque_Nm ?? 0) / 500);
    v[29] = sp.coolantThrough ? 1 : 0;

    // [30..31] acceleration
    const acc = profile.accelerations ?? {};
    v[30] = clamp01((acc.rapidRate_m_min ?? 0) / 60);
    v[31] = clamp01((acc.rapidAccel_g ?? 0) / 3);

    // [32..33] accuracy (log scale)
    const accu = profile.accuracy ?? {};
    v[32] = clamp01(accuracyToNorm(accu.positioning_mm ?? 0.1));
    v[33] = clamp01(accuracyToNorm(accu.repeatability_mm ?? 0.1));

    // [34] collision envelope data
    v[34] = profile.collisionEnvelope ? 1 : 0;

    // [35] work volume (log10)
    const wv = profile.workVolume_mm3 ?? 0;
    v[35] = wv > 0 ? clamp01(Math.log10(wv) / 10) : 0;

    // [36..39] type flags
    const cat = topology?.category ?? "";
    v[36] = cat.includes("5axis") || cat.includes("mill-turn") ? 1 : 0;
    v[37] = cat.includes("lathe") || cat.includes("swiss") ? 1 : 0;
    v[38] = cat.includes("edm") ? 1 : 0;
    v[39] = cat.includes("grinder") ? 1 : 0;

    return v;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }

/** Convert accuracy in mm to 0-1 scale (log): 0.0001mm→1.0, 0.1mm→0.0 */
function accuracyToNorm(mm: number): number {
  if (mm <= 0 || mm >= 0.1) return 0;
  return clamp01(-Math.log10(mm) / 4);
}

// ── Singleton ─────────────────────────────────────────────────────────

export const ppMachineVectorEncoderEngine = new PPMachineVectorEncoderEngine();
