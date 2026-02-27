/**
 * ProbeRoutineEngine — Manufacturing Intelligence Layer
 *
 * Generates CMM and on-machine probing routines from GD&T specs.
 * Composes MeasurementIntegrationEngine + GD&T interpretation.
 *
 * Actions: probe_generate, probe_gdt_interpret, probe_report
 */

// ============================================================================
// TYPES
// ============================================================================

export type GDTCallout =
  | "position" | "flatness" | "cylindricity" | "circularity"
  | "perpendicularity" | "parallelism" | "angularity"
  | "total_runout" | "circular_runout" | "profile_surface"
  | "profile_line" | "concentricity" | "symmetry";

export interface GDTSpec {
  id: string;
  callout: GDTCallout;
  tolerance_mm: number;
  datum_refs?: string[];             // e.g., ["A", "B", "C"]
  mmc?: boolean;                     // maximum material condition
  feature_type: "hole" | "surface" | "cylinder" | "slot" | "boss" | "plane";
  nominal: {
    x_mm?: number; y_mm?: number; z_mm?: number;
    diameter_mm?: number;
    length_mm?: number;
  };
}

export interface ProbeMove {
  type: "approach" | "measure" | "retract" | "move" | "datum_touch";
  x?: number; y?: number; z?: number;
  feed_rate_mmmin: number;
  description: string;
}

export interface ProbeRoutine {
  id: string;
  gdt_spec_id: string;
  description: string;
  moves: ProbeMove[];
  estimated_time_sec: number;
  points_measured: number;
  datum_alignment: string[];
  notes: string[];
}

export interface GDTInterpretation {
  callout: GDTCallout;
  zone_type: string;                 // "cylindrical", "planar", "annular", etc.
  tolerance_zone_description: string;
  min_measurement_points: number;
  datum_requirements: string;
  mmc_bonus?: string;
}

export interface ProbeReport {
  feature_id: string;
  nominal: Record<string, number>;
  measured: Record<string, number>;
  deviation_mm: number;
  tolerance_mm: number;
  within_spec: boolean;
  percent_of_tolerance: number;
}

// ============================================================================
// GDT INTERPRETATION
// ============================================================================

const GDT_RULES: Record<GDTCallout, { zone: string; minPoints: number; desc: (tol: number) => string }> = {
  position: { zone: "cylindrical", minPoints: 4, desc: t => `Cylindrical zone Ø${t}mm centered on true position` },
  flatness: { zone: "planar", minPoints: 9, desc: t => `Two parallel planes ${t}mm apart` },
  cylindricity: { zone: "annular_3d", minPoints: 12, desc: t => `Two coaxial cylinders ${t}mm apart` },
  circularity: { zone: "annular_2d", minPoints: 8, desc: t => `Two concentric circles ${t}mm apart in any cross-section` },
  perpendicularity: { zone: "planar_or_cyl", minPoints: 6, desc: t => `Zone ${t}mm wide perpendicular to datum` },
  parallelism: { zone: "planar", minPoints: 6, desc: t => `Two planes ${t}mm apart parallel to datum` },
  angularity: { zone: "planar", minPoints: 6, desc: t => `Zone ${t}mm wide at basic angle to datum` },
  total_runout: { zone: "annular", minPoints: 16, desc: t => `Full indicator movement ≤${t}mm over entire surface` },
  circular_runout: { zone: "annular", minPoints: 8, desc: t => `FIM ≤${t}mm at each cross-section` },
  profile_surface: { zone: "bilateral", minPoints: 25, desc: t => `Bilateral zone ${t}mm total around nominal surface` },
  profile_line: { zone: "bilateral_2d", minPoints: 12, desc: t => `Bilateral zone ${t}mm total around nominal line` },
  concentricity: { zone: "spherical", minPoints: 8, desc: t => `Spherical zone Ø${t}mm at datum axis` },
  symmetry: { zone: "planar", minPoints: 8, desc: t => `Two planes ${t}mm apart centered on datum` },
};

// ============================================================================
// PROBE PATH GENERATION
// ============================================================================

function generateProbePoints(spec: GDTSpec, rule: typeof GDT_RULES[GDTCallout]): ProbeMove[] {
  const moves: ProbeMove[] = [];
  const safeZ = (spec.nominal.z_mm || 0) + 10;
  const probeFeed = 300; // mm/min
  const rapidFeed = 3000;

  // Start with safe approach
  moves.push({ type: "move", z: safeZ, feed_rate_mmmin: rapidFeed, description: "Move to safe height" });

  if (spec.feature_type === "hole" || spec.feature_type === "cylinder" || spec.feature_type === "boss") {
    const cx = spec.nominal.x_mm || 0;
    const cy = spec.nominal.y_mm || 0;
    const r = (spec.nominal.diameter_mm || 20) / 2;
    const nPoints = Math.max(rule.minPoints, 4);
    const depthPoints = nPoints > 8 ? 3 : 2;
    const circlePoints = Math.ceil(nPoints / depthPoints);
    const depth = spec.nominal.length_mm || 20;

    for (let d = 0; d < depthPoints; d++) {
      const z = (spec.nominal.z_mm || 0) - (depth * d) / Math.max(depthPoints - 1, 1);
      moves.push({ type: "move", x: cx, y: cy, z: safeZ, feed_rate_mmmin: rapidFeed, description: `Position over feature, depth level ${d + 1}` });

      for (let i = 0; i < circlePoints; i++) {
        const angle = (2 * Math.PI * i) / circlePoints;
        const px = cx + r * Math.cos(angle) * 0.9; // approach from inside
        const mx = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle) * 0.9;
        const my = cy + r * Math.sin(angle);

        moves.push({ type: "approach", x: px, y: py, z, feed_rate_mmmin: probeFeed, description: `Approach point ${i + 1} at ${Math.round(angle * 180 / Math.PI)}°` });
        moves.push({ type: "measure", x: mx, y: my, z, feed_rate_mmmin: probeFeed / 2, description: `Measure point ${i + 1}` });
        moves.push({ type: "retract", x: px, y: py, z, feed_rate_mmmin: probeFeed, description: "Retract from surface" });
      }
    }
  } else {
    // Surface / plane measurement — grid pattern
    const cx = spec.nominal.x_mm || 0;
    const cy = spec.nominal.y_mm || 0;
    const cz = spec.nominal.z_mm || 0;
    const w = spec.nominal.length_mm || 50;
    const nPoints = Math.max(rule.minPoints, 9);
    const gridSize = Math.ceil(Math.sqrt(nPoints));

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = cx - w / 2 + (w * i) / Math.max(gridSize - 1, 1);
        const y = cy - w / 2 + (w * j) / Math.max(gridSize - 1, 1);

        moves.push({ type: "move", x, y, z: safeZ, feed_rate_mmmin: rapidFeed, description: `Move to grid point (${i + 1},${j + 1})` });
        moves.push({ type: "approach", x, y, z: cz + 2, feed_rate_mmmin: probeFeed, description: "Approach surface" });
        moves.push({ type: "measure", x, y, z: cz, feed_rate_mmmin: probeFeed / 2, description: `Measure point (${i + 1},${j + 1})` });
        moves.push({ type: "retract", x, y, z: safeZ, feed_rate_mmmin: probeFeed, description: "Retract" });
      }
    }
  }

  // Final safe retract
  moves.push({ type: "move", z: safeZ + 20, feed_rate_mmmin: rapidFeed, description: "Final retract to safe height" });

  return moves;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ProbeRoutineEngine {
  generate(spec: GDTSpec): ProbeRoutine {
    const rule = GDT_RULES[spec.callout] || GDT_RULES["position"];
    const moves = generateProbePoints(spec, rule);
    const measureMoves = moves.filter(m => m.type === "measure").length;

    // Estimate time: 2 sec per move on average
    const estimatedTime = moves.length * 2;

    const datumAlign = spec.datum_refs || [];
    const notes: string[] = [];
    if (spec.mmc) notes.push("MMC modifier — bonus tolerance available as feature departs from MMC size");
    if (measureMoves < rule.minPoints) notes.push(`Warning: ${measureMoves} points below recommended minimum of ${rule.minPoints}`);

    return {
      id: `PR-${spec.id}`,
      gdt_spec_id: spec.id,
      description: `${spec.callout} measurement for ${spec.feature_type}`,
      moves, estimated_time_sec: estimatedTime,
      points_measured: measureMoves,
      datum_alignment: datumAlign, notes,
    };
  }

  interpretGDT(callout: GDTCallout, tolerance_mm: number, datumRefs?: string[]): GDTInterpretation {
    const rule = GDT_RULES[callout] || GDT_RULES["position"];
    return {
      callout, zone_type: rule.zone,
      tolerance_zone_description: rule.desc(tolerance_mm),
      min_measurement_points: rule.minPoints,
      datum_requirements: datumRefs?.length ? `Requires datum(s): ${datumRefs.join(", ")}` : "No datum required (form control)",
    };
  }

  report(spec: GDTSpec, measured: Record<string, number>): ProbeReport {
    const nominal: Record<string, number> = {};
    if (spec.nominal.x_mm !== undefined) nominal.x = spec.nominal.x_mm;
    if (spec.nominal.y_mm !== undefined) nominal.y = spec.nominal.y_mm;
    if (spec.nominal.z_mm !== undefined) nominal.z = spec.nominal.z_mm;
    if (spec.nominal.diameter_mm !== undefined) nominal.diameter = spec.nominal.diameter_mm;

    let deviation = 0;
    if (spec.callout === "position" && nominal.x !== undefined && nominal.y !== undefined) {
      const dx = (measured.x || 0) - nominal.x;
      const dy = (measured.y || 0) - nominal.y;
      deviation = 2 * Math.sqrt(dx * dx + dy * dy); // diametral position error
    } else if (spec.callout === "flatness" || spec.callout === "parallelism") {
      deviation = measured.max_deviation || 0;
    } else if (spec.callout === "circularity" || spec.callout === "cylindricity") {
      deviation = (measured.max_radius || 0) - (measured.min_radius || 0);
    } else {
      deviation = measured.deviation || 0;
    }

    deviation = Math.abs(deviation);
    const pctTol = spec.tolerance_mm > 0 ? (deviation / spec.tolerance_mm) * 100 : 100;

    return {
      feature_id: spec.id,
      nominal, measured,
      deviation_mm: Math.round(deviation * 10000) / 10000,
      tolerance_mm: spec.tolerance_mm,
      within_spec: deviation <= spec.tolerance_mm,
      percent_of_tolerance: Math.round(pctTol * 10) / 10,
    };
  }
}

export const probeRoutineEngine = new ProbeRoutineEngine();
