/**
 * EmployeeInsertSideTrackerEngine — Per-insert corner/edge tracker.
 *
 * Carbide inserts have multiple usable corners (CNMG: 8, DCMT: 6, TPMR: 3,
 * SNMG: 8, TNMG: 3, RDMT: round w/ infinite indexable positions). Operators
 * rotate the insert as each corner wears out — running a fresh corner gets
 * full tool-life, running a worn corner cooks the surface finish and the
 * tool. This engine tracks WHICH CORNER on WHICH INSERT is currently
 * engaged for which part, accumulates per-corner runtime + part-count, and
 * surfaces rotation suggestions when a corner crosses its life threshold.
 *
 * Insert geometries (ISO standard corner counts):
 *   CNMG / SNMG / WNMG / CCMT  →  8 corners (4 per face × 2 faces — neg geo)
 *   DCMT / DNMG                →  6 corners (3 per face × 2 faces — neg geo)
 *   TPMR / TNMG / TCMT         →  3 corners (single side, positive geo)
 *   VBMT / VCGT / VBGT          →  4 corners (single side, 35° rhombic)
 *   RCMT / RPMT / round         →  ∞ rotation (treat as 12-position index)
 *
 * Hotel-soul invariants:
 *   - R12 fail-loud: invalid insert types / corners throw
 *   - PII-free: only employee_id (string) stored, no name/SSN/DOB
 *   - Object.frozen on every public return
 *   - Per-part isolation: insert assignment on part A doesn't leak to part B
 *
 * @module EmployeeInsertSideTrackerEngine
 * @milestone HOTEL/U-EMP-INSERT-SIDE-TRACKER (2026-05-25, slot:hotel iter7)
 */

// ─── Constants ────────────────────────────────────────────────
/** ISO insert-type → corner count lookup. */
const INSERT_CORNER_COUNT: Record<string, number> = {
  // 8-corner negative-geometry (double-sided 4 corners each face)
  CNMG: 8,
  SNMG: 8,
  WNMG: 8,
  CCMT: 8,
  // 6-corner negative-geometry
  DCMT: 6,
  DNMG: 6,
  // 4-corner rhombic
  VBMT: 4,
  VCGT: 4,
  VBGT: 4,
  // 3-corner positive-geometry single-sided
  TPMR: 3,
  TNMG: 3,
  TCMT: 3,
  // Round inserts — treat as 12-position rotation index
  RCMT: 12,
  RPMT: 12,
  // Mill inserts — standard square
  APKT: 4,
  APMT: 4,
  SEKT: 4,
  SEKR: 4,
};

/** Default corner-life threshold (parts cut before rotate-suggestion). */
const DEFAULT_PARTS_PER_CORNER = 25;
/** Default runtime threshold (minutes before rotate-suggestion). */
const DEFAULT_RUNTIME_PER_CORNER_MIN = 60;

// ─── Types ────────────────────────────────────────────────────

export interface CornerState {
  /** 1-indexed corner number (1..corner_count). */
  corner: number;
  /** Parts produced on this corner so far. */
  parts_cut: number;
  /** Total runtime (minutes) on this corner. */
  runtime_min: number;
  /** Wear classification — last reported by operator. */
  wear_status: "fresh" | "light_wear" | "moderate_wear" | "worn" | "rotated_out";
}

export interface InsertAssignment {
  /** Insert tag — physical insert id (e.g. "INS-2026-001"). */
  insert_tag: string;
  /** ISO insert type (CNMG, DCMT, etc.). */
  insert_type: string;
  /** Number of corners on this insert. */
  corner_count: number;
  /** Part id this insert is currently assigned to. */
  part_id: string;
  /** Currently-engaged corner (1..corner_count). */
  active_corner: number;
  /** Per-corner state (length = corner_count). */
  corners: ReadonlyArray<CornerState>;
  /** Employee who currently owns the insert. */
  employee_id: string;
  /** Optional ISO timestamp of assignment. */
  assigned_at: string;
}

export interface RotationSuggestion {
  insert_tag: string;
  current_corner: number;
  current_corner_state: CornerState;
  suggested_action: "continue" | "rotate" | "replace";
  next_corner: number | null;
  reason: string;
}

// ─── Engine ───────────────────────────────────────────────────

class EmployeeInsertSideTrackerEngine {
  private assignments: Map<string, InsertAssignment> = new Map();

  /**
   * Assign a fresh insert to a part. Initializes all corners to fresh state.
   *
   * @throws Error on unknown insert type / invalid corner index (R12 fail-loud)
   */
  assignInsert(args: {
    insert_tag: string;
    insert_type: string;
    part_id: string;
    starting_corner?: number;
    employee_id: string;
  }): InsertAssignment {
    if (!args.insert_tag || !args.insert_type || !args.part_id || !args.employee_id) {
      throw new Error(
        "EmployeeInsertSideTrackerEngine: insert_tag + insert_type + part_id + employee_id required",
      );
    }
    const upperType = args.insert_type.toUpperCase();
    const cornerCount = INSERT_CORNER_COUNT[upperType];
    if (cornerCount === undefined) {
      throw new Error(
        `EmployeeInsertSideTrackerEngine: unknown insert_type "${args.insert_type}" — supported: ${Object.keys(INSERT_CORNER_COUNT).join(", ")}`,
      );
    }
    const startCorner = args.starting_corner ?? 1;
    if (!Number.isInteger(startCorner) || startCorner < 1 || startCorner > cornerCount) {
      throw new Error(
        `EmployeeInsertSideTrackerEngine: starting_corner must be 1..${cornerCount} for ${upperType}, got ${startCorner}`,
      );
    }
    const corners: CornerState[] = [];
    for (let i = 1; i <= cornerCount; i++) {
      corners.push({ corner: i, parts_cut: 0, runtime_min: 0, wear_status: "fresh" });
    }
    const assignment: InsertAssignment = {
      insert_tag: args.insert_tag,
      insert_type: upperType,
      corner_count: cornerCount,
      part_id: args.part_id,
      active_corner: startCorner,
      corners: Object.freeze(corners.map((c) => Object.freeze(c))),
      employee_id: args.employee_id,
      assigned_at: new Date().toISOString(),
    };
    this.assignments.set(args.insert_tag, assignment);
    return Object.freeze({ ...assignment });
  }

  /**
   * Record wear on the active corner. Increments parts_cut + runtime_min.
   * Optionally updates wear_status (operator self-report).
   */
  recordWear(args: {
    insert_tag: string;
    parts_cut_delta?: number;
    runtime_min_delta?: number;
    wear_status?: CornerState["wear_status"];
  }): InsertAssignment {
    const a = this.assignments.get(args.insert_tag);
    if (!a) {
      throw new Error(`EmployeeInsertSideTrackerEngine: unknown insert_tag "${args.insert_tag}"`);
    }
    const partsDelta = args.parts_cut_delta ?? 0;
    const runtimeDelta = args.runtime_min_delta ?? 0;
    if (!Number.isFinite(partsDelta) || partsDelta < 0) {
      throw new Error("EmployeeInsertSideTrackerEngine: parts_cut_delta must be non-negative finite");
    }
    if (!Number.isFinite(runtimeDelta) || runtimeDelta < 0) {
      throw new Error("EmployeeInsertSideTrackerEngine: runtime_min_delta must be non-negative finite");
    }
    const corners = a.corners.map((c) => {
      if (c.corner !== a.active_corner) return { ...c };
      return {
        corner: c.corner,
        parts_cut: c.parts_cut + partsDelta,
        runtime_min: c.runtime_min + runtimeDelta,
        wear_status: args.wear_status ?? c.wear_status,
      };
    });
    const updated: InsertAssignment = {
      ...a,
      corners: Object.freeze(corners.map((c) => Object.freeze(c))),
    };
    this.assignments.set(args.insert_tag, updated);
    return Object.freeze({ ...updated });
  }

  /**
   * Rotate to next available fresh/light-wear corner. If none, returns
   * suggestion to replace the insert.
   */
  rotate(args: { insert_tag: string }): InsertAssignment {
    const a = this.assignments.get(args.insert_tag);
    if (!a) {
      throw new Error(`EmployeeInsertSideTrackerEngine: unknown insert_tag "${args.insert_tag}"`);
    }
    // Mark current corner as rotated_out, find next fresh-ish corner.
    const corners = a.corners.map((c) => {
      if (c.corner === a.active_corner) return { ...c, wear_status: "rotated_out" as const };
      return { ...c };
    });
    const nextFresh = corners.find(
      (c) =>
        c.wear_status === "fresh" ||
        c.wear_status === "light_wear" ||
        c.wear_status === "moderate_wear",
    );
    if (!nextFresh) {
      throw new Error(
        `EmployeeInsertSideTrackerEngine: no usable corners remain on ${args.insert_tag} — replace the insert`,
      );
    }
    const updated: InsertAssignment = {
      ...a,
      active_corner: nextFresh.corner,
      corners: Object.freeze(corners.map((c) => Object.freeze(c))),
    };
    this.assignments.set(args.insert_tag, updated);
    return Object.freeze({ ...updated });
  }

  /**
   * Get rotation suggestion based on current corner state vs thresholds.
   */
  suggestRotation(args: {
    insert_tag: string;
    parts_per_corner_threshold?: number;
    runtime_per_corner_min_threshold?: number;
  }): RotationSuggestion {
    const a = this.assignments.get(args.insert_tag);
    if (!a) {
      throw new Error(`EmployeeInsertSideTrackerEngine: unknown insert_tag "${args.insert_tag}"`);
    }
    const partsThresh = args.parts_per_corner_threshold ?? DEFAULT_PARTS_PER_CORNER;
    const runtimeThresh = args.runtime_per_corner_min_threshold ?? DEFAULT_RUNTIME_PER_CORNER_MIN;
    const cur = a.corners.find((c) => c.corner === a.active_corner);
    if (!cur) {
      throw new Error(`EmployeeInsertSideTrackerEngine: active_corner ${a.active_corner} not found in corners list`);
    }
    let action: RotationSuggestion["suggested_action"] = "continue";
    let reason = `corner ${a.active_corner}/${a.corner_count}: ${cur.parts_cut}p / ${cur.runtime_min}min — within thresholds`;

    if (cur.wear_status === "worn" || cur.wear_status === "rotated_out") {
      action = "rotate";
      reason = `corner ${a.active_corner} marked ${cur.wear_status}`;
    } else if (cur.parts_cut >= partsThresh) {
      action = "rotate";
      reason = `corner ${a.active_corner} hit parts threshold (${cur.parts_cut} ≥ ${partsThresh})`;
    } else if (cur.runtime_min >= runtimeThresh) {
      action = "rotate";
      reason = `corner ${a.active_corner} hit runtime threshold (${cur.runtime_min}min ≥ ${runtimeThresh}min)`;
    }

    let nextCorner: number | null = null;
    if (action === "rotate") {
      const next = a.corners.find(
        (c) =>
          c.corner !== a.active_corner &&
          (c.wear_status === "fresh" ||
            c.wear_status === "light_wear" ||
            c.wear_status === "moderate_wear"),
      );
      if (next) {
        nextCorner = next.corner;
      } else {
        action = "replace";
        reason = `no usable corners remain on ${a.insert_tag} (${a.corner_count} corners all worn/rotated_out)`;
      }
    }

    return Object.freeze({
      insert_tag: a.insert_tag,
      current_corner: a.active_corner,
      current_corner_state: Object.freeze({ ...cur }),
      suggested_action: action,
      next_corner: nextCorner,
      reason,
    });
  }

  /** Get full current state of an insert assignment. */
  getStatus(insert_tag: string): InsertAssignment | null {
    const a = this.assignments.get(insert_tag);
    if (!a) return null;
    return Object.freeze({ ...a });
  }

  /** List all known insert types + their corner counts (defensive copy). */
  listInsertTypes(): ReadonlyArray<{ type: string; corners: number }> {
    return Object.freeze(
      Object.entries(INSERT_CORNER_COUNT).map(([type, corners]) => Object.freeze({ type, corners })),
    );
  }

  /** Reset state — test-only. */
  reset(): void {
    this.assignments.clear();
  }
}

export const employeeInsertSideTrackerEngine = new EmployeeInsertSideTrackerEngine();
