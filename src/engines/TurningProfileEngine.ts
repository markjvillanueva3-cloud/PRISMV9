/**
 * TurningProfileEngine — CK-MS10 U01
 *
 * Generates G70/G71 turning contour profiles from feature descriptions.
 * Supports OD, ID, face, and thread profiles with full physics.
 *
 * Physics:
 *   Chip load:    fn [mm/rev]
 *   Surface speed: Vc = π × D × N / 1000 [m/min]
 *   MRR:          Q = Vc × fn × ap [cm³/min]
 *   Force:        Fc = kc1.1 × fn^(1-mc) × ap (Kienzle)
 *   Ra:           Ra = fn² / (8 × r_nose) [µm] (Brammertz)
 */

import { log } from "../utils/Logger.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProfilePoint {
  X: number; // diameter [mm]
  Z: number; // axial position [mm]
  type: "rapid" | "linear" | "arc_cw" | "arc_ccw";
  I?: number; // arc center offset X
  K?: number; // arc center offset Z
  R?: number; // arc radius [mm]
  feed?: number; // override feed [mm/rev]
  comment?: string;
}

export interface TurningProfile {
  type: "OD" | "ID" | "Face" | "Thread";
  points: ProfilePoint[];
  stock_diameter_mm: number;
  finish_diameter_mm: number;
  length_mm: number;
  num_passes: number;
  doc_mm: number; // depth of cut per pass
  feed_mmrev: number;
  speed_rpm: number;
  surface_speed_mmin: number;
  mrr_cm3min: number;
  cutting_force_N: number;
  ra_predicted_um: number;
  warnings: string[];
}

export interface TurningFeature {
  type:
    | "cylinder"
    | "taper"
    | "radius"
    | "chamfer"
    | "groove"
    | "undercut"
    | "relief_groove"
    | "shoulder"
    | "face";
  diameter_mm: number;
  z_start_mm: number;
  z_end_mm: number;
  // taper
  taper_angle_deg?: number;
  // radius / fillet
  radius_mm?: number;
  // chamfer
  chamfer_mm?: number;
  // groove / undercut
  groove_width_mm?: number;
  groove_depth_mm?: number;
}

export interface ThreadSpec {
  type: "external" | "internal";
  nominal_diameter_mm: number;
  pitch_mm: number;
  length_mm: number;
  z_start_mm: number;
  thread_depth_mm?: number; // defaults: 0.6495 × pitch
  infeed_method?: "straight" | "flank" | "modified_flank";
  spring_passes?: number;
  first_pass_doc_mm?: number;
  controller?: "fanuc" | "haas" | "mazak" | "okuma";
}

export interface G76ThreadResult {
  g76_blocks: string[];
  num_passes: number;
  total_depth_mm: number;
  pitch_mm: number;
  minor_diameter_mm: number;
}

export interface GCodeOptions {
  controller?: "fanuc" | "haas" | "mazak" | "okuma";
  program_number?: number;
  sequence_start?: number;
  sequence_increment?: number;
  g71_p_label?: number; // N label of first finish pass
  g71_q_label?: number; // N label of last finish pass
  include_g70?: boolean;
  rpm_css?: boolean; // constant surface speed (G96)
  max_rpm?: number;
}

// ─── Material DB ─────────────────────────────────────────────────────────────

interface TurningMaterial {
  name: string;
  vc_mmin: number; // recommended surface speed
  fn_mmrev: number; // recommended feed
  kc11: number; // Kienzle kc1.1 [N/mm²]
  mc: number; // Kienzle exponent
  iso_group: string;
}

const TURNING_MATERIAL_DB: Record<string, TurningMaterial> = {
  low_carbon_steel: {
    name: "Low Carbon Steel",
    vc_mmin: 250,
    fn_mmrev: 0.25,
    kc11: 1500,
    mc: 0.25,
    iso_group: "P",
  },
  medium_carbon_steel: {
    name: "Medium Carbon Steel",
    vc_mmin: 200,
    fn_mmrev: 0.2,
    kc11: 1700,
    mc: 0.26,
    iso_group: "P",
  },
  alloy_steel: {
    name: "Alloy Steel",
    vc_mmin: 160,
    fn_mmrev: 0.18,
    kc11: 1900,
    mc: 0.27,
    iso_group: "P",
  },
  stainless_steel: {
    name: "Stainless Steel (304)",
    vc_mmin: 180,
    fn_mmrev: 0.15,
    kc11: 2100,
    mc: 0.28,
    iso_group: "M",
  },
  cast_iron: {
    name: "Grey Cast Iron",
    vc_mmin: 200,
    fn_mmrev: 0.3,
    kc11: 1100,
    mc: 0.22,
    iso_group: "K",
  },
  aluminum: {
    name: "Aluminum Alloy",
    vc_mmin: 500,
    fn_mmrev: 0.3,
    kc11: 700,
    mc: 0.18,
    iso_group: "N",
  },
  brass: {
    name: "Brass",
    vc_mmin: 350,
    fn_mmrev: 0.25,
    kc11: 750,
    mc: 0.2,
    iso_group: "N",
  },
  titanium: {
    name: "Titanium (Ti-6Al-4V)",
    vc_mmin: 60,
    fn_mmrev: 0.12,
    kc11: 1800,
    mc: 0.3,
    iso_group: "S",
  },
  inconel: {
    name: "Inconel 718",
    vc_mmin: 40,
    fn_mmrev: 0.1,
    kc11: 2400,
    mc: 0.32,
    iso_group: "S",
  },
  hardened_steel: {
    name: "Hardened Steel (>45 HRC)",
    vc_mmin: 100,
    fn_mmrev: 0.08,
    kc11: 2600,
    mc: 0.3,
    iso_group: "H",
  },
  copper: {
    name: "Copper",
    vc_mmin: 400,
    fn_mmrev: 0.28,
    kc11: 800,
    mc: 0.19,
    iso_group: "N",
  },
  plastic: {
    name: "Plastic / Polymer",
    vc_mmin: 300,
    fn_mmrev: 0.15,
    kc11: 300,
    mc: 0.15,
    iso_group: "N",
  },
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export class TurningProfileEngine {
  // ── Physics helpers ────────────────────────────────────────────────────────

  private kienzleForce(
    kc11: number,
    mc: number,
    fn: number,
    ap: number
  ): number {
    return kc11 * Math.pow(fn, 1 - mc) * ap;
  }

  private brammertzRa(fn: number, r_nose: number): number {
    return (fn * fn) / (8 * r_nose);
  }

  private surfaceSpeed(diameter_mm: number, rpm: number): number {
    return (Math.PI * diameter_mm * rpm) / 1000;
  }

  private rpmFromVc(vc_mmin: number, diameter_mm: number): number {
    if (diameter_mm <= 0) return 0;
    return (1000 * vc_mmin) / (Math.PI * diameter_mm);
  }

  private mrr(vc_mmin: number, fn_mmrev: number, ap_mm: number): number {
    // Q = Vc × fn × ap [cm³/min]  (units: m/min × mm/rev × mm → × rpm... simplified)
    // MRR = Vc[mm/min] × fn[mm/rev] × ap[mm] / 1000 cm³/min
    return (vc_mmin * 1000 * fn_mmrev * ap_mm) / 1000;
  }

  private getMaterial(material_key: string): TurningMaterial {
    return (
      TURNING_MATERIAL_DB[material_key] ??
      TURNING_MATERIAL_DB["low_carbon_steel"]
    );
  }

  // ── Profile validation ─────────────────────────────────────────────────────

  private validateProfileForG71(
    points: ProfilePoint[],
    type: "OD" | "ID"
  ): string[] {
    const warnings: string[] = [];
    // G71 requires monotonically decreasing Z (cutting toward chuck)
    for (let i = 1; i < points.length; i++) {
      if (points[i].Z > points[i - 1].Z && points[i].type !== "rapid") {
        warnings.push(
          `Z reversal at point ${i}: Z${points[i - 1].Z.toFixed(3)} → Z${points[i].Z.toFixed(3)} — may cause G71 interference`
        );
      }
    }
    // Check for diameter reversals on OD (should be monotonically changing)
    for (let i = 2; i < points.length; i++) {
      const dX1 = points[i - 1].X - points[i - 2].X;
      const dX2 = points[i].X - points[i - 1].X;
      if (type === "OD" && dX1 > 0.1 && dX2 < -0.1) {
        warnings.push(
          `OD undercut detected at point ${i} — ensure relief groove is programmed separately`
        );
      }
    }
    return warnings;
  }

  // ── G-code generation ──────────────────────────────────────────────────────

  profileToGCode(profile: TurningProfile, options: GCodeOptions = {}): string[] {
    const ctrl = options.controller ?? "fanuc";
    const seqStart = options.sequence_start ?? 10;
    const seqInc = options.sequence_increment ?? 10;
    const pLabel = options.g71_p_label ?? seqStart + seqInc;
    const qLabel =
      options.g71_q_label ?? seqStart + seqInc * (profile.points.length + 1);
    const includeG70 = options.include_g70 ?? true;
    const maxRpm = options.max_rpm ?? 3000;

    const lines: string[] = [];
    let seq = seqStart;

    const n = () => {
      const s = `N${seq}`;
      seq += seqInc;
      return s;
    };

    // Program header
    if (options.program_number) {
      lines.push(`O${String(options.program_number).padStart(4, "0")}`);
    }

    // Speed / feed setup
    if (options.rpm_css) {
      lines.push(`${n()} G96 S${profile.surface_speed_mmin.toFixed(0)} M03`);
      lines.push(`${n()} G50 S${maxRpm}`);
    } else {
      lines.push(
        `${n()} G97 S${profile.speed_rpm.toFixed(0).replace(/\..*/, "")} M03`
      );
    }
    lines.push(
      `${n()} G95 F${profile.feed_mmrev.toFixed(3)} (feed per rev)`
    );

    // G71 roughing cycle
    const u_val = (profile.doc_mm * 2).toFixed(3); // U = radial DOC (diameter)
    const r_val = (profile.doc_mm * 0.5).toFixed(3); // R = retract
    const w_val = "0.050"; // W = axial finish stock
    const d_val = (profile.doc_mm).toFixed(3);

    if (ctrl === "fanuc" || ctrl === "haas") {
      lines.push(
        `${n()} G71 U${d_val} R${r_val}`
      );
      lines.push(
        `${n()} G71 P${pLabel} Q${qLabel} U${u_val} W${w_val} F${profile.feed_mmrev.toFixed(3)}`
      );
    } else if (ctrl === "mazak") {
      lines.push(
        `${n()} G71 P${pLabel} Q${qLabel} U${u_val} W${w_val} D${d_val} F${profile.feed_mmrev.toFixed(3)}`
      );
    } else if (ctrl === "okuma") {
      lines.push(
        `${n()} G71 P${pLabel} Q${qLabel} U${u_val} W${w_val} D${d_val} F${profile.feed_mmrev.toFixed(3)}`
      );
    }

    // Finish profile (P..Q block)
    // First point = P label
    let firstFinish = true;
    for (const pt of profile.points) {
      if (pt.type === "rapid") {
        if (firstFinish) {
          lines.push(
            `N${pLabel} G00 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${pt.comment ? " (" + pt.comment + ")" : ""}`
          );
          firstFinish = false;
          seq = pLabel + seqInc;
        } else {
          lines.push(
            `${n()} G00 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${pt.comment ? " (" + pt.comment + ")" : ""}`
          );
        }
      } else if (pt.type === "linear") {
        const fStr = pt.feed ? ` F${pt.feed.toFixed(3)}` : "";
        lines.push(
          `${n()} G01 X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${fStr}${pt.comment ? " (" + pt.comment + ")" : ""}`
        );
      } else if (pt.type === "arc_cw" || pt.type === "arc_ccw") {
        const gcode = pt.type === "arc_cw" ? "G02" : "G03";
        const iStr = pt.I !== undefined ? ` I${pt.I.toFixed(3)}` : "";
        const kStr = pt.K !== undefined ? ` K${pt.K.toFixed(3)}` : "";
        const rStr =
          pt.R !== undefined && pt.I === undefined
            ? ` R${pt.R.toFixed(3)}`
            : "";
        lines.push(
          `${n()} ${gcode} X${pt.X.toFixed(3)} Z${pt.Z.toFixed(3)}${iStr}${kStr}${rStr}${pt.comment ? " (" + pt.comment + ")" : ""}`
        );
      }
    }

    // Last point gets Q label — rewrite last line
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      const lastSeq = seq - seqInc;
      lines[lines.length - 1] = lastLine.replace(
        `N${lastSeq}`,
        `N${qLabel}`
      );
    }

    // G70 finishing cycle
    if (includeG70) {
      lines.push(`${n()} G70 P${pLabel} Q${qLabel}`);
    }

    lines.push(`${n()} M05`);
    lines.push(`${n()} M30`);

    return lines;
  }

  // ── OD Profile ────────────────────────────────────────────────────────────

  generateODProfile(
    features: TurningFeature[],
    stock_diameter_mm: number,
    material_key = "low_carbon_steel",
    nose_radius_mm = 0.8,
    num_passes = 5
  ): TurningProfile {
    const mat = this.getMaterial(material_key);
    const fn = mat.fn_mmrev;
    const rpm = this.rpmFromVc(mat.vc_mmin, stock_diameter_mm);
    const vc = this.surfaceSpeed(stock_diameter_mm, rpm);

    // Sort features by Z descending (start from face, move toward chuck)
    const sorted = [...features].sort((a, b) => b.z_start_mm - a.z_start_mm);

    const finish_d =
      sorted.reduce((min, f) => Math.min(min, f.diameter_mm), stock_diameter_mm);
    const length = sorted.reduce(
      (max, f) => Math.max(max, Math.abs(f.z_end_mm)),
      0
    );
    const doc = (stock_diameter_mm - finish_d) / (2 * num_passes);
    const ap = doc;
    const Fc = this.kienzleForce(mat.kc11, mat.mc, fn, ap);
    const ra = this.brammertzRa(fn, nose_radius_mm);
    const mrr = this.mrr(vc, fn, ap);

    const points: ProfilePoint[] = [];
    // Approach
    points.push({
      X: stock_diameter_mm + 2,
      Z: 2,
      type: "rapid",
      comment: "approach",
    });

    for (const feat of sorted) {
      if (feat.type === "cylinder") {
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm,
          type: "linear",
        });
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_end_mm,
          type: "linear",
        });
      } else if (feat.type === "taper" && feat.taper_angle_deg !== undefined) {
        const dz = Math.abs(feat.z_end_mm - feat.z_start_mm);
        const diam_end =
          feat.diameter_mm +
          2 * dz * Math.tan((feat.taper_angle_deg * Math.PI) / 180);
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm,
          type: "linear",
        });
        points.push({ X: diam_end, Z: feat.z_end_mm, type: "linear" });
      } else if (feat.type === "radius" && feat.radius_mm !== undefined) {
        // Approximate arc with G02/G03
        const r = feat.radius_mm;
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm,
          type: "arc_ccw",
          R: r,
          comment: `R${r}`,
        });
      } else if (feat.type === "chamfer" && feat.chamfer_mm !== undefined) {
        const c = feat.chamfer_mm;
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm,
          type: "linear",
          comment: `chamfer ${c}x45°`,
        });
        points.push({
          X: feat.diameter_mm + 2 * c,
          Z: feat.z_start_mm - c,
          type: "linear",
        });
      } else if (
        feat.type === "groove" &&
        feat.groove_width_mm !== undefined &&
        feat.groove_depth_mm !== undefined
      ) {
        const gw = feat.groove_width_mm;
        const gd = feat.groove_depth_mm;
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm,
          type: "linear",
          feed: fn * 0.3,
          comment: "groove approach",
        });
        points.push({
          X: feat.diameter_mm - 2 * gd,
          Z: feat.z_start_mm,
          type: "linear",
          feed: fn * 0.2,
          comment: "groove plunge",
        });
        points.push({
          X: feat.diameter_mm - 2 * gd,
          Z: feat.z_start_mm - gw,
          type: "linear",
          feed: fn * 0.15,
        });
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm - gw,
          type: "linear",
          feed: fn * 0.2,
          comment: "groove exit",
        });
      } else if (
        feat.type === "undercut" &&
        feat.groove_depth_mm !== undefined
      ) {
        const ud = feat.groove_depth_mm;
        const uw = feat.groove_width_mm ?? 3;
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm,
          type: "linear",
        });
        points.push({
          X: feat.diameter_mm - 2 * ud,
          Z: feat.z_start_mm,
          type: "linear",
          feed: fn * 0.15,
          comment: "undercut",
        });
        points.push({
          X: feat.diameter_mm - 2 * ud,
          Z: feat.z_start_mm - uw,
          type: "linear",
        });
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm - uw,
          type: "linear",
        });
      } else if (feat.type === "relief_groove") {
        const rw = feat.groove_width_mm ?? 2;
        const rd = feat.groove_depth_mm ?? 0.5;
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm,
          type: "linear",
        });
        points.push({
          X: feat.diameter_mm - 2 * rd,
          Z: feat.z_start_mm,
          type: "linear",
          feed: fn * 0.12,
          comment: "relief groove",
        });
        points.push({
          X: feat.diameter_mm - 2 * rd,
          Z: feat.z_start_mm - rw,
          type: "linear",
        });
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm - rw,
          type: "linear",
        });
      } else {
        // shoulder / generic
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm,
          type: "linear",
        });
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_end_mm,
          type: "linear",
        });
      }
    }

    const warnings = this.validateProfileForG71(points, "OD");

    log.debug("[TurningProfileEngine] OD profile generated", {
      features: features.length,
      points: points.length,
    });

    return {
      type: "OD",
      points,
      stock_diameter_mm,
      finish_diameter_mm: finish_d,
      length_mm: length,
      num_passes,
      doc_mm: doc,
      feed_mmrev: fn,
      speed_rpm: rpm,
      surface_speed_mmin: vc,
      mrr_cm3min: mrr,
      cutting_force_N: Fc,
      ra_predicted_um: ra,
      warnings,
    };
  }

  // ── ID Profile ────────────────────────────────────────────────────────────

  generateIDProfile(
    features: TurningFeature[],
    bore_diameter_mm: number,
    stock_bore_diameter_mm: number,
    material_key = "low_carbon_steel",
    nose_radius_mm = 0.4,
    num_passes = 4
  ): TurningProfile {
    const mat = this.getMaterial(material_key);
    const fn = mat.fn_mmrev * 0.7; // boring: reduced feed
    const rpm = this.rpmFromVc(mat.vc_mmin * 0.8, bore_diameter_mm);
    const vc = this.surfaceSpeed(bore_diameter_mm, rpm);

    const sorted = [...features].sort((a, b) => b.z_start_mm - a.z_start_mm);
    const length = sorted.reduce(
      (max, f) => Math.max(max, Math.abs(f.z_end_mm)),
      0
    );
    const doc = (bore_diameter_mm - stock_bore_diameter_mm) / (2 * num_passes);
    const ap = Math.abs(doc);
    const Fc = this.kienzleForce(mat.kc11, mat.mc, fn, ap);
    const ra = this.brammertzRa(fn, nose_radius_mm);
    const mrr = this.mrr(vc, fn, ap);

    const points: ProfilePoint[] = [];
    points.push({
      X: stock_bore_diameter_mm - 2,
      Z: 2,
      type: "rapid",
      comment: "bore approach",
    });

    for (const feat of sorted) {
      if (feat.type === "cylinder") {
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm,
          type: "linear",
        });
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_end_mm,
          type: "linear",
        });
      } else if (feat.type === "groove" && feat.groove_depth_mm !== undefined) {
        const gd = feat.groove_depth_mm;
        const gw = feat.groove_width_mm ?? 3;
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm,
          type: "linear",
        });
        points.push({
          X: feat.diameter_mm + 2 * gd,
          Z: feat.z_start_mm,
          type: "linear",
          feed: fn * 0.2,
          comment: "ID groove",
        });
        points.push({
          X: feat.diameter_mm + 2 * gd,
          Z: feat.z_start_mm - gw,
          type: "linear",
        });
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm - gw,
          type: "linear",
        });
      } else if (feat.type === "chamfer" && feat.chamfer_mm !== undefined) {
        const c = feat.chamfer_mm;
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm,
          type: "linear",
          comment: `ID chamfer ${c}x45°`,
        });
        points.push({
          X: feat.diameter_mm - 2 * c,
          Z: feat.z_start_mm - c,
          type: "linear",
        });
      } else {
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_start_mm,
          type: "linear",
        });
        points.push({
          X: feat.diameter_mm,
          Z: feat.z_end_mm,
          type: "linear",
        });
      }
    }

    const warnings = this.validateProfileForG71(points, "ID");
    if (bore_diameter_mm < 10) {
      warnings.push("Small bore diameter — verify boring bar clearance and minimum bore bar diameter");
    }

    return {
      type: "ID",
      points,
      stock_diameter_mm: stock_bore_diameter_mm,
      finish_diameter_mm: bore_diameter_mm,
      length_mm: length,
      num_passes,
      doc_mm: Math.abs(doc),
      feed_mmrev: fn,
      speed_rpm: rpm,
      surface_speed_mmin: vc,
      mrr_cm3min: mrr,
      cutting_force_N: Fc,
      ra_predicted_um: ra,
      warnings,
    };
  }

  // ── Face Profile ──────────────────────────────────────────────────────────

  generateFaceProfile(
    outer_diameter_mm: number,
    inner_diameter_mm = 0,
    face_length_mm = 2,
    material_key = "low_carbon_steel",
    nose_radius_mm = 0.8
  ): TurningProfile {
    const mat = this.getMaterial(material_key);
    const fn = mat.fn_mmrev * 0.8;
    const rpm = this.rpmFromVc(mat.vc_mmin, outer_diameter_mm);
    const vc = this.surfaceSpeed(outer_diameter_mm, rpm);
    const ap = face_length_mm;
    const Fc = this.kienzleForce(mat.kc11, mat.mc, fn, ap);
    const ra = this.brammertzRa(fn, nose_radius_mm);
    const mrr = this.mrr(vc, fn, ap);

    const points: ProfilePoint[] = [
      {
        X: outer_diameter_mm + 2,
        Z: face_length_mm + 0.5,
        type: "rapid",
        comment: "face approach",
      },
      {
        X: outer_diameter_mm,
        Z: face_length_mm + 0.5,
        type: "rapid",
      },
      {
        X: outer_diameter_mm,
        Z: 0,
        type: "linear",
        comment: "face cut",
      },
      {
        X: inner_diameter_mm,
        Z: 0,
        type: "linear",
      },
    ];

    return {
      type: "Face",
      points,
      stock_diameter_mm: outer_diameter_mm,
      finish_diameter_mm: inner_diameter_mm,
      length_mm: face_length_mm,
      num_passes: 1,
      doc_mm: face_length_mm,
      feed_mmrev: fn,
      speed_rpm: rpm,
      surface_speed_mmin: vc,
      mrr_cm3min: mrr,
      cutting_force_N: Fc,
      ra_predicted_um: ra,
      warnings: [],
    };
  }

  // ── Thread Profile (G76) ──────────────────────────────────────────────────

  generateThreadProfile(spec: ThreadSpec): G76ThreadResult {
    const ctrl = spec.controller ?? "fanuc";
    const pitch = spec.pitch_mm;
    const threadDepth = spec.thread_depth_mm ?? 0.6495 * pitch;
    const infeed = spec.infeed_method ?? "modified_flank";
    const springPasses = spec.spring_passes ?? 2;

    // Number of passes: first pass ≈ 30% of depth, decreasing
    const firstDoc = spec.first_pass_doc_mm ?? threadDepth * 0.3;
    const passes: number[] = [];
    let remaining = threadDepth;
    let doc = firstDoc;
    while (remaining > 0.01) {
      const d = Math.min(doc, remaining);
      passes.push(d);
      remaining -= d;
      doc = Math.max(doc * 0.7, 0.02); // reduce each pass
    }
    // Add spring passes
    for (let i = 0; i < springPasses; i++) {
      passes.push(0.0);
    }

    const minorDiameter =
      spec.type === "external"
        ? spec.nominal_diameter_mm - 2 * threadDepth
        : spec.nominal_diameter_mm + 2 * threadDepth;

    const g76Blocks: string[] = [];

    // G76 format: P (finish allowance, spring passes, angle), Q (min doc), R (finish allowance)
    const finishAllowance = 0.1;
    const minDocUm = 20; // 0.02 mm
    const threadAngle = 60; // standard UN/ISO

    // Encode P: finish-passes(2 digits) + spring-passes(2 digits) + angle(2 digits)
    const P_val = `01${String(springPasses).padStart(2, "0")}60`;

    if (ctrl === "fanuc" || ctrl === "haas") {
      g76Blocks.push(
        `G76 P${P_val} Q${minDocUm} R${finishAllowance.toFixed(3)}`
      );
      g76Blocks.push(
        `G76 X${minorDiameter.toFixed(3)} Z${(spec.z_start_mm - spec.length_mm).toFixed(3)} P${(threadDepth * 1000).toFixed(0)} Q${(firstDoc * 1000).toFixed(0)} F${pitch.toFixed(3)}`
      );
    } else if (ctrl === "mazak") {
      g76Blocks.push(`(THREAD CYCLE - MAZAK SMOOTH)`);
      g76Blocks.push(
        `G76 X${minorDiameter.toFixed(3)} Z${(spec.z_start_mm - spec.length_mm).toFixed(3)} I0.0 K${threadDepth.toFixed(3)} D${firstDoc.toFixed(3)} F${pitch.toFixed(3)} A60`
      );
    } else if (ctrl === "okuma") {
      g76Blocks.push(`(THREAD CYCLE - OKUMA)`);
      g76Blocks.push(
        `G76 X${minorDiameter.toFixed(3)} Z${(spec.z_start_mm - spec.length_mm).toFixed(3)} K${threadDepth.toFixed(3)} D${firstDoc.toFixed(3)} F${pitch.toFixed(3)}`
      );
    }

    // Infeed method comment
    const infeedComment: Record<string, string> = {
      straight: "straight plunge infeed",
      flank: "flank infeed 30°",
      modified_flank: "modified flank infeed 29°",
    };
    g76Blocks.unshift(
      `(THREAD M${spec.nominal_diameter_mm}x${pitch} - ${infeedComment[infeed] ?? infeed})`
    );

    log.debug("[TurningProfileEngine] Thread profile generated", {
      nominal: spec.nominal_diameter_mm,
      pitch,
      passes: passes.length,
    });

    return {
      g76_blocks: g76Blocks,
      num_passes: passes.length,
      total_depth_mm: threadDepth,
      pitch_mm: pitch,
      minor_diameter_mm: minorDiameter,
    };
  }
}

export const turningProfileEngine = new TurningProfileEngine();
