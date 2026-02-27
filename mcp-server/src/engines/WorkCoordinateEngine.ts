/**
 * WorkCoordinateEngine — L2-P2-MS1 CAD/CAM Layer
 *
 * Manages Work Coordinate Systems (WCS): G54-G59, extended offsets.
 * Handles part setup, datum alignment, multi-part fixture coordination,
 * coordinate transformations between WCS and machine coordinates.
 *
 * Actions: wcs_create, wcs_transform, wcs_validate, wcs_multi_part
 */

// ============================================================================
// TYPES
// ============================================================================

export type WCSCode = "G54" | "G55" | "G56" | "G57" | "G58" | "G59" | string;

export interface WCSOffset {
  id: string;
  code: WCSCode;
  description: string;
  origin: { x: number; y: number; z: number };
  rotation_deg?: { a: number; b: number; c: number };
  part_id?: string;
  setup_id?: string;
}

export interface DatumPoint {
  id: string;
  name: string;                      // "A", "B", "C" or descriptive
  type: "surface" | "edge" | "hole" | "corner" | "center";
  position: { x: number; y: number; z: number };
  method: "probe" | "edge_finder" | "indicator" | "visual" | "fixture";
}

export interface WCSSetup {
  wcs: WCSOffset;
  datum_points: DatumPoint[];
  probe_sequence: string[];
  estimated_setup_time_min: number;
  notes: string[];
}

export interface CoordTransform {
  from_wcs: WCSCode;
  to_wcs: WCSCode;
  translation: { dx: number; dy: number; dz: number };
  rotation_deg: { da: number; db: number; dc: number };
}

export interface MultiPartSetup {
  fixture_id: string;
  parts: { part_id: string; wcs: WCSCode; offset: WCSOffset }[];
  total_parts: number;
  probe_points_per_part: number;
  total_setup_time_min: number;
}

export interface WCSValidation {
  valid: boolean;
  issues: string[];
  warnings: string[];
  duplicate_offsets: boolean;
  z_positive_up: boolean;
}

// ============================================================================
// STANDARD WCS DEFINITIONS
// ============================================================================

const STANDARD_WCS: WCSCode[] = ["G54", "G55", "G56", "G57", "G58", "G59"];

// Typical probe sequence by datum type
const PROBE_SEQUENCES: Record<DatumPoint["type"], string[]> = {
  surface: ["Approach surface", "Touch probe Z", "Record Z offset"],
  edge: ["Approach X edge", "Touch probe X", "Record X offset", "Approach Y edge", "Touch probe Y", "Record Y offset"],
  hole: ["Move over hole", "Probe X+", "Probe X-", "Calculate X center", "Probe Y+", "Probe Y-", "Calculate Y center"],
  corner: ["Approach X face", "Touch probe X", "Approach Y face", "Touch probe Y", "Record XY origin"],
  center: ["Probe 3-4 points on feature", "Calculate center", "Record XY origin"],
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class WorkCoordinateEngine {
  private offsets: WCSOffset[] = [];

  create(code: WCSCode, origin: { x: number; y: number; z: number }, description?: string, rotation_deg?: { a: number; b: number; c: number }): WCSOffset {
    const offset: WCSOffset = {
      id: `WCS-${code}-${Date.now().toString(36)}`,
      code,
      description: description || `Work coordinate ${code}`,
      origin,
      rotation_deg,
    };
    this.offsets.push(offset);
    return offset;
  }

  setupFromDatums(code: WCSCode, datums: DatumPoint[]): WCSSetup {
    const probeSteps: string[] = [];
    let setupTime = 2; // base setup time in minutes

    for (const d of datums) {
      const steps = PROBE_SEQUENCES[d.type] || PROBE_SEQUENCES["surface"];
      probeSteps.push(`--- Datum ${d.name} (${d.type}) ---`);
      probeSteps.push(...steps);
      setupTime += d.method === "probe" ? 1 : d.method === "edge_finder" ? 2 : 3;
    }

    const origin = datums.length > 0
      ? { x: datums[0].position.x, y: datums[0].position.y, z: datums[datums.length - 1].position.z }
      : { x: 0, y: 0, z: 0 };

    const wcs = this.create(code, origin, `Setup from ${datums.length} datums`);

    const notes: string[] = [];
    if (datums.length < 3) notes.push("Fewer than 3 datums — part orientation may be under-constrained");
    if (!datums.some(d => d.type === "surface")) notes.push("No surface datum — Z origin may be inaccurate");

    return {
      wcs,
      datum_points: datums,
      probe_sequence: probeSteps,
      estimated_setup_time_min: Math.round(setupTime),
      notes,
    };
  }

  transform(point: { x: number; y: number; z: number }, from: WCSOffset, to: WCSOffset): { x: number; y: number; z: number } {
    // Transform: subtract 'from' origin, add 'to' origin
    return {
      x: Math.round((point.x - from.origin.x + to.origin.x) * 10000) / 10000,
      y: Math.round((point.y - from.origin.y + to.origin.y) * 10000) / 10000,
      z: Math.round((point.z - from.origin.z + to.origin.z) * 10000) / 10000,
    };
  }

  coordTransform(fromCode: WCSCode, toCode: WCSCode): CoordTransform | null {
    const from = this.offsets.find(o => o.code === fromCode);
    const to = this.offsets.find(o => o.code === toCode);
    if (!from || !to) return null;

    return {
      from_wcs: fromCode,
      to_wcs: toCode,
      translation: {
        dx: Math.round((to.origin.x - from.origin.x) * 10000) / 10000,
        dy: Math.round((to.origin.y - from.origin.y) * 10000) / 10000,
        dz: Math.round((to.origin.z - from.origin.z) * 10000) / 10000,
      },
      rotation_deg: {
        da: (to.rotation_deg?.a || 0) - (from.rotation_deg?.a || 0),
        db: (to.rotation_deg?.b || 0) - (from.rotation_deg?.b || 0),
        dc: (to.rotation_deg?.c || 0) - (from.rotation_deg?.c || 0),
      },
    };
  }

  multiPartSetup(parts: Array<{ part_id: string; offset: { x: number; y: number; z: number } }>, fixtureId: string): MultiPartSetup {
    const partSetups: MultiPartSetup["parts"] = [];
    const availableCodes = [...STANDARD_WCS];

    for (let i = 0; i < parts.length; i++) {
      const code = i < availableCodes.length ? availableCodes[i] : `G54.1 P${i + 1}`;
      const wcs = this.create(code, parts[i].offset, `Part ${parts[i].part_id}`);
      partSetups.push({ part_id: parts[i].part_id, wcs: code, offset: wcs });
    }

    const probePerPart = 3; // typical: X, Y, Z
    const setupPerPart = 3; // minutes
    return {
      fixture_id: fixtureId,
      parts: partSetups,
      total_parts: parts.length,
      probe_points_per_part: probePerPart,
      total_setup_time_min: Math.round(parts.length * setupPerPart + 5), // +5 for fixture verification
    };
  }

  validate(): WCSValidation {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate codes
    const codes = this.offsets.map(o => o.code);
    const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
    const hasDupes = dupes.length > 0;
    if (hasDupes) issues.push(`Duplicate WCS codes: ${[...new Set(dupes)].join(", ")}`);

    // Check Z convention
    const zPositiveUp = this.offsets.every(o => o.origin.z <= 0 || o.origin.z === 0);
    if (!zPositiveUp && this.offsets.length > 0) {
      warnings.push("Some WCS origins have positive Z — verify Z+ is up convention");
    }

    // Check for very close origins (might be errors)
    for (let i = 0; i < this.offsets.length; i++) {
      for (let j = i + 1; j < this.offsets.length; j++) {
        const dx = this.offsets[i].origin.x - this.offsets[j].origin.x;
        const dy = this.offsets[i].origin.y - this.offsets[j].origin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5 && dist > 0) {
          warnings.push(`${this.offsets[i].code} and ${this.offsets[j].code} are only ${dist.toFixed(1)}mm apart — verify`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      duplicate_offsets: hasDupes,
      z_positive_up: zPositiveUp || this.offsets.length === 0,
    };
  }

  listOffsets(): WCSOffset[] {
    return [...this.offsets];
  }

  clear(): void {
    this.offsets = [];
  }
}

export const workCoordinateEngine = new WorkCoordinateEngine();
