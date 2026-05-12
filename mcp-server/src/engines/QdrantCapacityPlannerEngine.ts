/**
 * QdrantCapacityPlannerEngine — Pre-flight disk/RAM estimator for ingestions
 *
 * Phase 0.25.7 U-FIX2 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Before the
 * tool catalog (95,608 points) or the JM DIE program corpus (36,929 records)
 * goes into Qdrant, we want a pre-flight answer: "is there enough disk?
 * enough RAM for HNSW?" Running out mid-ingestion corrupts state and wastes
 * hours. This engine is the calculator that the ingestion script calls
 * BEFORE it touches the vector store.
 *
 * Model:
 *   per-vector bytes   = vectorDim × bytesPerComponent (4 float32, 1 int8)
 *   payload bytes      = payloadAvgBytes (caller-supplied estimate)
 *   overhead per point = 128 bytes (id + struct framing, Qdrant docs)
 *   hnsw RAM overhead  = payload + 2 × M × edgeBytes × points  (M=16 typical)
 *
 * Capacity result returns a `ok | tight | insufficient` decision, the exact
 * numbers used, and the caller's safety headroom so an ingestion hook can
 * `abort + notify` before touching Qdrant.
 *
 * No I/O. Disk + RAM free-space inputs are caller-supplied (tests drive
 * them deterministically; production reads via Node `fs.statfs` or similar).
 *
 * @module engines/QdrantCapacityPlannerEngine
 * @milestone PP-0.25.7-U-FIX2
 */

export type PrecisionKind = "float32" | "float16" | "int8";

export type CapacityDecision = "ok" | "tight" | "insufficient";

export interface CollectionPlanInput {
  /** Existing points already in the collection (0 for a fresh one). */
  existingPoints: number;
  /** Points that will be added by this ingestion. */
  addingPoints: number;
  vectorDim: number;
  precision: PrecisionKind;
  /** Average payload size in bytes per point (compressed on-disk). */
  payloadAvgBytes: number;
  /** HNSW M parameter; higher → faster search, more RAM. */
  hnswM?: number;
}

export interface HostAvailability {
  diskFreeMB: number;
  ramFreeMB: number;
}

export interface CapacityThresholds {
  /** Require at least this much free after ingestion to call it `ok`. */
  diskHeadroomMB: number;
  ramHeadroomMB: number;
  /** Below this headroom → `tight` (warn). Must be ≤ diskHeadroomMB. */
  diskTightHeadroomMB: number;
  ramTightHeadroomMB: number;
}

export const DEFAULT_CAPACITY_THRESHOLDS: CapacityThresholds = Object.freeze({
  diskHeadroomMB: 2048,
  ramHeadroomMB: 1024,
  diskTightHeadroomMB: 512,
  ramTightHeadroomMB: 256,
});

export interface CapacityBreakdown {
  vectorBytesPerPoint: number;
  payloadBytesPerPoint: number;
  overheadBytesPerPoint: number;
  bytesPerPointTotal: number;
  totalPoints: number;
  diskRequiredMB: number;
  ramRequiredMB: number;
  hnswEdgeBytes: number;
}

export interface CapacityReport {
  decision: CapacityDecision;
  breakdown: CapacityBreakdown;
  host: HostAvailability;
  thresholds: CapacityThresholds;
  shortfallDiskMB: number;
  shortfallRamMB: number;
  headroomDiskMB: number;
  headroomRamMB: number;
  rationale: string[];
}

const BYTES_PER_COMPONENT: Record<PrecisionKind, number> = {
  float32: 4,
  float16: 2,
  int8: 1,
};

const OVERHEAD_BYTES_PER_POINT = 128; // id + struct framing (Qdrant docs)
const HNSW_EDGE_BYTES = 4; // 32-bit integer id per edge
const BYTES_PER_MB = 1024 * 1024;

export class QdrantCapacityPlannerEngine {
  private thresholds: CapacityThresholds;

  constructor(thresholds: CapacityThresholds = DEFAULT_CAPACITY_THRESHOLDS) {
    this.validateThresholds(thresholds);
    this.thresholds = thresholds;
  }

  setThresholds(thresholds: CapacityThresholds): void {
    this.validateThresholds(thresholds);
    this.thresholds = thresholds;
  }

  getThresholds(): CapacityThresholds {
    return this.thresholds;
  }

  plan(collection: CollectionPlanInput, host: HostAvailability): CapacityReport {
    this.validateCollection(collection);
    this.validateHost(host);

    const m = collection.hnswM ?? 16;
    const vectorBytesPerPoint = collection.vectorDim * BYTES_PER_COMPONENT[collection.precision];
    const payloadBytesPerPoint = Math.max(0, Math.ceil(collection.payloadAvgBytes));
    const overheadBytesPerPoint = OVERHEAD_BYTES_PER_POINT;
    const bytesPerPointTotal = vectorBytesPerPoint + payloadBytesPerPoint + overheadBytesPerPoint;
    const totalPoints = collection.existingPoints + collection.addingPoints;

    const diskBytes = bytesPerPointTotal * totalPoints;
    // HNSW keeps vectors + edges in memory; payload may be on-disk but some
    // is cached. Approximate RAM = vectors + 2·M·edgeBytes·points.
    const ramBytes =
      vectorBytesPerPoint * totalPoints + 2 * m * HNSW_EDGE_BYTES * totalPoints;

    const diskRequiredMB = Math.ceil(diskBytes / BYTES_PER_MB);
    const ramRequiredMB = Math.ceil(ramBytes / BYTES_PER_MB);

    const headroomDiskMB = host.diskFreeMB - diskRequiredMB;
    const headroomRamMB = host.ramFreeMB - ramRequiredMB;

    const rationale: string[] = [];
    rationale.push(
      `${totalPoints} points × ${bytesPerPointTotal}B = ${diskRequiredMB}MB disk, ${ramRequiredMB}MB RAM (M=${m})`
    );

    const diskDecision = this.classify(
      headroomDiskMB,
      this.thresholds.diskHeadroomMB,
      this.thresholds.diskTightHeadroomMB,
      "disk"
    );
    const ramDecision = this.classify(
      headroomRamMB,
      this.thresholds.ramHeadroomMB,
      this.thresholds.ramTightHeadroomMB,
      "ram"
    );
    rationale.push(diskDecision.note);
    rationale.push(ramDecision.note);

    const decision = worstDecision(diskDecision.band, ramDecision.band);
    return {
      decision,
      breakdown: {
        vectorBytesPerPoint,
        payloadBytesPerPoint,
        overheadBytesPerPoint,
        bytesPerPointTotal,
        totalPoints,
        diskRequiredMB,
        ramRequiredMB,
        hnswEdgeBytes: HNSW_EDGE_BYTES,
      },
      host,
      thresholds: this.thresholds,
      shortfallDiskMB: Math.max(0, -headroomDiskMB),
      shortfallRamMB: Math.max(0, -headroomRamMB),
      headroomDiskMB: Math.round(headroomDiskMB),
      headroomRamMB: Math.round(headroomRamMB),
      rationale,
    };
  }

  /**
   * Scale a ratio of the desired corpus so it fits within thresholds. Returns
   * `1` when the full corpus fits, a fractional value when the caller must
   * subsample, and `0` when no positive ingestion fits.
   */
  maxIngestFraction(collection: CollectionPlanInput, host: HostAvailability): number {
    this.validateCollection(collection);
    this.validateHost(host);
    if (collection.addingPoints <= 0) return 1;

    const lower = 0;
    const upper = 1;
    let result = 0;
    for (let lo = lower, hi = upper, iter = 0; iter < 30; iter += 1) {
      const mid = (lo + hi) / 2;
      const probe = this.plan(
        { ...collection, addingPoints: Math.floor(collection.addingPoints * mid) },
        host
      );
      if (probe.decision === "insufficient") {
        hi = mid;
      } else {
        result = mid;
        lo = mid;
      }
    }
    return round4(result);
  }

  // --- internals ---------------------------------------------------------

  private classify(
    headroomMB: number,
    okHeadroom: number,
    tightHeadroom: number,
    label: string
  ): { band: CapacityDecision; note: string } {
    if (headroomMB < 0) {
      return { band: "insufficient", note: `${label}: short by ${Math.abs(headroomMB)}MB` };
    }
    if (headroomMB < tightHeadroom) {
      return { band: "insufficient", note: `${label} headroom ${headroomMB}MB < tight floor ${tightHeadroom}MB` };
    }
    if (headroomMB < okHeadroom) {
      return { band: "tight", note: `${label} headroom ${headroomMB}MB < ok floor ${okHeadroom}MB` };
    }
    return { band: "ok", note: `${label} headroom ${headroomMB}MB (ok)` };
  }

  private validateCollection(c: CollectionPlanInput): void {
    if (!Number.isInteger(c.existingPoints) || c.existingPoints < 0) {
      throw new Error("existingPoints must be non-negative integer");
    }
    if (!Number.isInteger(c.addingPoints) || c.addingPoints < 0) {
      throw new Error("addingPoints must be non-negative integer");
    }
    if (!Number.isInteger(c.vectorDim) || c.vectorDim <= 0) {
      throw new Error("vectorDim must be positive integer");
    }
    if (!(c.precision in BYTES_PER_COMPONENT)) {
      throw new Error(`precision must be one of ${Object.keys(BYTES_PER_COMPONENT).join(", ")}`);
    }
    if (!Number.isFinite(c.payloadAvgBytes) || c.payloadAvgBytes < 0) {
      throw new Error("payloadAvgBytes must be non-negative finite number");
    }
    if (c.hnswM !== undefined) {
      if (!Number.isInteger(c.hnswM) || c.hnswM < 4 || c.hnswM > 64) {
        throw new Error("hnswM must be integer in [4, 64]");
      }
    }
  }

  private validateHost(h: HostAvailability): void {
    if (!(h.diskFreeMB >= 0)) throw new Error("diskFreeMB must be ≥ 0");
    if (!(h.ramFreeMB >= 0)) throw new Error("ramFreeMB must be ≥ 0");
  }

  private validateThresholds(t: CapacityThresholds): void {
    for (const [key, v] of Object.entries(t)) {
      if (!Number.isFinite(v) || v < 0) throw new Error(`${key} must be non-negative finite`);
    }
    if (t.diskTightHeadroomMB > t.diskHeadroomMB) {
      throw new Error("diskTightHeadroomMB must be ≤ diskHeadroomMB");
    }
    if (t.ramTightHeadroomMB > t.ramHeadroomMB) {
      throw new Error("ramTightHeadroomMB must be ≤ ramHeadroomMB");
    }
  }
}

function worstDecision(a: CapacityDecision, b: CapacityDecision): CapacityDecision {
  const rank: Record<CapacityDecision, number> = { ok: 0, tight: 1, insufficient: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const qdrantCapacityPlannerEngine = new QdrantCapacityPlannerEngine();
