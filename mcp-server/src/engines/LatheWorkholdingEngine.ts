/**
 * LATHE-PRO-MS3, U-LPS04..U-LPS07
 * LatheWorkholdingEngine — Turning-Specific Workholding Intelligence
 *
 * Covers 4 units:
 * U-LPS04: Jaw selection intelligence — decision tree for 6 jaw types
 * U-LPS05: Thin-wall clamping deformation — trilobe distortion model
 * U-LPS06: Specialty workholding — face driver, expanding mandrel, between-centers, magnetic
 * U-LPS07: Stock form handling — bar, forging, casting, hex, tube
 *
 * Physics:
 * - Clamping safety: F_clamp >= SF × F_resultant / (μ × n_jaws × cos(α))
 *   where SF = 2.5 (ISO 10218), μ = friction, n_jaws = 3 or 6, α = jaw angle
 * - Trilobe distortion (thin ring in 3-jaw chuck):
 *   δ = F × R³ / (E × I) where I = b × t³ / 12 (thin ring section)
 *   F = radial jaw force, R = mean ring radius, t = wall thickness, b = jaw contact width
 *   Reference: Nee & Tao, "Analysis of thin-walled workpiece deformation in 3-jaw chuck"
 * - Expanding mandrel (Lame equation):
 *   p_contact = Δ_interference × E / (r_bore × ((r_o²+r_i²)/(r_o²-r_i²) + ν))
 *   T_capacity = p × μ × 2π × r_bore × L_contact × r_bore
 * - Face driver torque: T = F_axial × μ × r_mean × n_pins
 * - Hex bar 3-point contact: F_jaw = F_clamp / 3, contact at flat midpoints
 *
 * Reference: DIN 6350, Machinery's Handbook 31st Ed., ISO 10218
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type JawType = "hard_od" | "hard_id" | "soft_od" | "soft_id" | "collet" | "pie_jaw" | "6_jaw";
export type SpecialtyType = "face_driver" | "expanding_mandrel" | "between_centers" | "magnetic_chuck";
export type StockForm = "bar" | "forging" | "casting" | "hex_bar" | "tube" | "pre_machined";

export interface JawSelectionInput {
  /** Part OD at grip location in mm */
  grip_diameter_mm: number;
  /** Part ID at grip location in mm (0 if solid) */
  bore_id_mm?: number;
  /** Wall thickness in mm (computed if omitted) */
  wall_thickness_mm?: number;
  /** Tightest tolerance on part in mm */
  tolerance_mm?: number;
  /** Required surface finish Ra in µm */
  surface_finish_ra_um?: number;
  /** Batch quantity */
  batch_size?: number;
  /** Stock form */
  stock_form?: StockForm;
  /** Material name (for friction/modulus lookup) */
  material?: string;
  /** Cutting force resultant in N */
  cutting_force_n?: number;
  /** Is part ferrous (for magnetic chuck) */
  is_ferrous?: boolean;
  /** Part length in mm */
  part_length_mm?: number;
}

export interface JawSelectionResult {
  recommended_jaw: JawType;
  justification: string[];
  alternatives: Array<{ jaw: JawType; reason: string }>;
  clamping_force_n: number;
  safety_factor: number;
  bore_program_needed: boolean;
  warnings: string[];
}

export interface TrilobeInput {
  /** Part OD in mm */
  od_mm: number;
  /** Part ID in mm (through bore) */
  id_mm: number;
  /** Jaw contact width in mm (axial) */
  jaw_width_mm?: number;
  /** Young's modulus in GPa */
  youngs_modulus_gpa?: number;
  /** Total jaw clamping force in N (all 3 jaws combined) */
  clamp_force_n: number;
  /** Part tolerance in mm (for deformation acceptance) */
  tolerance_mm?: number;
  /** Material name for modulus lookup */
  material?: string;
}

export interface TrilobeResult {
  /** Max radial distortion at jaw contact in µm */
  delta_um: number;
  /** Deformation as fraction of tolerance */
  deformation_to_tolerance_ratio: number;
  /** Is distortion within acceptable limit (< tolerance/2) */
  acceptable: boolean;
  /** Minimum ejection force in N */
  min_ejection_force_n: number;
  /** Maximum safe clamping force before exceeding tolerance/2 distortion */
  max_safe_force_n: number;
  /** Is there a safe clamping window? */
  has_safe_window: boolean;
  /** Recommended action if no safe window */
  recommendation: string;
  /** Detailed values for debugging */
  details: {
    wall_thickness_mm: number;
    mean_radius_mm: number;
    moment_of_inertia_mm4: number;
    per_jaw_force_n: number;
  };
}

export interface FaceDriverInput {
  /** Axial force from tailstock/actuator in N */
  axial_force_n: number;
  /** Number of drive pins */
  n_pins?: number;
  /** Friction coefficient at pin/part interface */
  mu?: number;
  /** Mean radius of pin circle in mm */
  pin_circle_radius_mm: number;
  /** Required cutting torque in Nm */
  required_torque_nm?: number;
}

export interface FaceDriverResult {
  transmittable_torque_nm: number;
  safety_factor: number;
  is_adequate: boolean;
  notes: string[];
}

export interface ExpandingMandrelInput {
  /** Bore diameter in mm */
  bore_id_mm: number;
  /** Part OD in mm */
  od_mm: number;
  /** Mandrel OD (unexpanded) in mm */
  mandrel_od_mm: number;
  /** Diametral interference in mm */
  interference_mm?: number;
  /** Contact length in mm */
  contact_length_mm: number;
  /** Young's modulus in GPa */
  youngs_modulus_gpa?: number;
  /** Poisson's ratio */
  poisson_ratio?: number;
  /** Friction coefficient */
  mu?: number;
  /** Required cutting torque in Nm */
  required_torque_nm?: number;
  /** Material name */
  material?: string;
}

export interface ExpandingMandrelResult {
  contact_pressure_mpa: number;
  grip_torque_nm: number;
  safety_factor: number;
  is_adequate: boolean;
  bore_deformation_um: number;
  notes: string[];
}

export interface MagneticChuckInput {
  /** Holding force per unit area in N/cm² (from chuck spec) */
  holding_force_n_per_cm2?: number;
  /** Contact area in cm² */
  contact_area_cm2: number;
  /** Part is ferrous? */
  is_ferrous: boolean;
  /** Part thickness in mm (thin parts = lower holding) */
  part_thickness_mm: number;
  /** Required holding force in N */
  required_force_n?: number;
}

export interface MagneticChuckResult {
  holding_force_n: number;
  is_adequate: boolean;
  safety_factor: number;
  notes: string[];
}

export interface StockFormResult {
  stock_form: StockForm;
  workholding_recommendation: JawType | SpecialtyType;
  roughing_cycle: "G71" | "G72" | "G73";
  force_model: string;
  clamping_notes: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// MATERIAL PROPERTIES
// ═══════════════════════════════════════════════════════════════════════

interface MatProps {
  mu: number;           // friction vs steel jaw
  E_gpa: number;        // Young's modulus
  deformation_sensitive: boolean;
}

const MAT_DB: Record<string, MatProps> = {
  steel:     { mu: 0.20, E_gpa: 210, deformation_sensitive: false },
  stainless: { mu: 0.20, E_gpa: 193, deformation_sensitive: false },
  aluminum:  { mu: 0.15, E_gpa: 69,  deformation_sensitive: true },
  titanium:  { mu: 0.30, E_gpa: 114, deformation_sensitive: false },
  brass:     { mu: 0.15, E_gpa: 100, deformation_sensitive: true },
  cast_iron: { mu: 0.22, E_gpa: 170, deformation_sensitive: false },
  inconel:   { mu: 0.25, E_gpa: 205, deformation_sensitive: false },
  copper:    { mu: 0.15, E_gpa: 117, deformation_sensitive: true },
};

function getMat(name?: string): MatProps {
  if (!name) return MAT_DB.steel;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(MAT_DB)) {
    if (lower.includes(k)) return v;
  }
  return MAT_DB.steel;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

/** ISO 10218 minimum safety factor for clamping */
const SAFETY_FACTOR = 2.5;

/** Default cutting force if not provided (moderate turning) */
const DEFAULT_CUTTING_FORCE_N = 2000;

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class LatheWorkholdingEngine {

  // ── U-LPS04: Jaw Selection Intelligence ────────────────────────────

  /**
   * Select optimal jaw type for a turning workholding scenario.
   *
   * Decision tree priority:
   * 1. Thin wall → 6-jaw or collet (lowest deformation)
   * 2. Tight tolerance (< 0.02mm) → collet or soft jaw
   * 3. Stock form override (forging/casting → soft jaw, tube → collet/controlled)
   * 4. Surface finish requirement → soft jaw (no jaw marks)
   * 5. Batch size → collet for high volume (fast changeover)
   * 6. Default: hard jaw for general turning
   */
  selectJaw(input: JawSelectionInput): JawSelectionResult {
    const mat = getMat(input.material);
    const boreId = input.bore_id_mm ?? 0;
    const wallThickness = input.wall_thickness_mm ??
      (boreId > 0 ? (input.grip_diameter_mm - boreId) / 2 : input.grip_diameter_mm / 2);
    const wallRatio = wallThickness / input.grip_diameter_mm;
    const isThinWall = wallRatio < 0.08;
    const tolerance = input.tolerance_mm ?? 0.1;
    const batchSize = input.batch_size ?? 1;
    const stockForm = input.stock_form ?? "bar";
    const cuttingForce = input.cutting_force_n ?? DEFAULT_CUTTING_FORCE_N;
    const surfaceRa = input.surface_finish_ra_um ?? 3.2;

    const justification: string[] = [];
    const alternatives: Array<{ jaw: JawType; reason: string }> = [];
    const warnings: string[] = [];

    let selected: JawType = "hard_od";
    let boreProgramNeeded = false;

    // ── Decision tree ────────────────────────────────────────────────

    // 1. Thin wall
    if (isThinWall) {
      if (wallRatio < 0.04) {
        selected = "6_jaw";
        justification.push(`Very thin wall (${wallThickness.toFixed(1)}mm, ${(wallRatio * 100).toFixed(1)}% of OD) → 6-jaw to minimize trilobe`);
        alternatives.push({ jaw: "collet", reason: "Collet also distributes force evenly" });
      } else {
        selected = "collet";
        justification.push(`Thin wall (${wallThickness.toFixed(1)}mm) → collet for uniform grip`);
        alternatives.push({ jaw: "6_jaw", reason: "6-jaw for even better force distribution" });
      }
      warnings.push(`Thin wall risk: verify deformation with trilobe calculation`);
    }
    // 2. Tight tolerance
    else if (tolerance < 0.02) {
      selected = "soft_od";
      boreProgramNeeded = true;
      justification.push(`Tight tolerance (${tolerance}mm) → soft jaws bored to part OD for concentricity`);
      alternatives.push({ jaw: "collet", reason: "Collet for high repeatability if size matches" });
    }
    // 3. Stock form
    else if (stockForm === "forging" || stockForm === "casting") {
      selected = "soft_od";
      boreProgramNeeded = true;
      justification.push(`${stockForm} stock → soft jaws to grip irregular as-${stockForm} surface`);
    } else if (stockForm === "tube") {
      selected = "collet";
      justification.push("Tube stock → collet for controlled uniform pressure");
      warnings.push("Use reduced clamping pressure for thin-wall tube");
    } else if (stockForm === "hex_bar") {
      selected = "hard_od";
      justification.push("Hex bar → hard jaws with 3-point contact on flats");
    }
    // 4. Surface finish
    else if (surfaceRa < 0.8) {
      selected = "soft_od";
      boreProgramNeeded = true;
      justification.push(`Fine surface finish (Ra ${surfaceRa}µm) → soft jaws to avoid jaw marks`);
    }
    // 5. Batch size
    else if (batchSize > 100) {
      selected = "collet";
      justification.push(`High volume (${batchSize} pcs) → collet for fast changeover`);
      alternatives.push({ jaw: "hard_od", reason: "Hard jaw if collet size unavailable" });
    }
    // 6. Deformation-sensitive material
    else if (mat.deformation_sensitive) {
      selected = "soft_od";
      boreProgramNeeded = true;
      justification.push(`Soft material (${input.material}) → soft jaws to prevent jaw marks`);
    }
    // 7. Default
    else {
      justification.push("Standard part → hard jaws (fast, rigid, repeatable)");
    }

    // Internal grip if bore is large enough
    if (boreId > 20 && boreId > input.grip_diameter_mm * 0.5 && selected !== "collet") {
      alternatives.push({ jaw: "hard_id", reason: `Large bore (Ø${boreId}mm) allows internal expanding grip` });
    }

    // Compute clamping force
    const requiredForce = SAFETY_FACTOR * cuttingForce / (mat.mu * 3); // 3-jaw
    const clampForce = Math.max(requiredForce, 5000); // minimum practical

    return {
      recommended_jaw: selected,
      justification,
      alternatives,
      clamping_force_n: Math.round(clampForce),
      safety_factor: (clampForce * mat.mu * 3) / cuttingForce,
      bore_program_needed: boreProgramNeeded,
      warnings,
    };
  }

  // ── U-LPS05: Thin-Wall Clamping Deformation ───────────────────────

  /**
   * Calculate trilobe distortion for a thin-walled ring in a 3-jaw chuck.
   *
   * δ = F × R³ / (E × I)
   * where:
   *   F = radial force per jaw (total/3)
   *   R = mean radius = (OD + ID) / 4
   *   E = Young's modulus
   *   I = b × t³ / 12 (thin ring cross-section)
   *   b = jaw contact width (axial direction)
   *   t = wall thickness = (OD - ID) / 2
   *
   * Reference: Nee & Tao, J. Manufacturing Science & Engineering
   */
  calculateTrilobe(input: TrilobeInput): TrilobeResult {
    const mat = getMat(input.material);
    const E = (input.youngs_modulus_gpa ?? mat.E_gpa) * 1000; // GPa → MPa
    const od = input.od_mm;
    const id = input.id_mm;
    const t = (od - id) / 2; // wall thickness
    const R = (od + id) / 4; // mean radius
    const b = input.jaw_width_mm ?? 10; // default 10mm jaw contact width
    const tolerance = input.tolerance_mm ?? 0.05;

    // Moment of inertia of thin ring section
    const I = (b * Math.pow(t, 3)) / 12; // mm^4

    // Per-jaw radial force
    const perJawForce = input.clamp_force_n / 3;

    // Trilobe distortion: δ = F × R³ / (E × I)
    const delta_mm = (perJawForce * Math.pow(R, 3)) / (E * I);
    const delta_um = delta_mm * 1000;

    // Acceptable if distortion < tolerance/2 (on diameter, distortion is radial)
    const acceptable = delta_mm < tolerance / 2;
    const deformRatio = delta_mm / (tolerance / 2);

    // Minimum ejection force: F_eject = mass × g × SF (simplified)
    // More realistically: friction force to resist cutting force
    const minEjectionForce = 500; // N — minimum practical for part not to slip

    // Maximum safe force: back-calculate from δ_max = tolerance/2
    const maxSafeForce = (tolerance / 2 * E * I) / Math.pow(R, 3) * 3;

    const hasSafeWindow = maxSafeForce > minEjectionForce;

    let recommendation = "Clamping force within safe window";
    if (!hasSafeWindow) {
      recommendation = "NO SAFE WINDOW: Consider 6-jaw chuck, collet, or vacuum fixture to reduce trilobe";
    } else if (!acceptable) {
      recommendation = `Reduce clamping force to < ${Math.round(maxSafeForce)}N total, or switch to 6-jaw/collet`;
    }

    return {
      delta_um: Math.round(delta_um * 10) / 10,
      deformation_to_tolerance_ratio: Math.round(deformRatio * 100) / 100,
      acceptable,
      min_ejection_force_n: Math.round(minEjectionForce),
      max_safe_force_n: Math.round(maxSafeForce),
      has_safe_window: hasSafeWindow,
      recommendation,
      details: {
        wall_thickness_mm: Math.round(t * 100) / 100,
        mean_radius_mm: Math.round(R * 100) / 100,
        moment_of_inertia_mm4: Math.round(I * 1000) / 1000,
        per_jaw_force_n: Math.round(perJawForce),
      },
    };
  }

  // ── U-LPS06: Specialty Workholding ─────────────────────────────────

  /**
   * Face driver torque transmission.
   * T = F_axial × μ × r_mean × n_pins
   *
   * Reference: Schunk face driver catalog, Hainbuch technical guide
   */
  calculateFaceDriver(input: FaceDriverInput): FaceDriverResult {
    const nPins = input.n_pins ?? 4;
    const mu = input.mu ?? 0.25; // serrated pins typical
    const rMean = input.pin_circle_radius_mm / 1000; // mm → m for Nm
    const torque = input.axial_force_n * mu * rMean * nPins;

    const requiredTorque = input.required_torque_nm ?? torque * 0.5;
    const sf = torque / requiredTorque;

    return {
      transmittable_torque_nm: Math.round(torque * 100) / 100,
      safety_factor: Math.round(sf * 100) / 100,
      is_adequate: sf >= SAFETY_FACTOR,
      notes: [
        `${nPins} pins at Ø${(input.pin_circle_radius_mm * 2).toFixed(0)}mm circle`,
        `μ = ${mu} (${mu >= 0.3 ? "serrated" : mu >= 0.2 ? "carbide" : "smooth"} pins)`,
        `Axial force: ${input.axial_force_n}N`,
        sf < SAFETY_FACTOR ? `WARNING: SF=${sf.toFixed(1)} < ${SAFETY_FACTOR} — increase axial force or use serrated pins` : `SF=${sf.toFixed(1)} ≥ ${SAFETY_FACTOR} — adequate`,
      ],
    };
  }

  /**
   * Expanding mandrel grip — Lame thick-wall cylinder equations.
   *
   * Contact pressure: p = Δ × E / (r_bore × ((r_o²+r_i²)/(r_o²-r_i²) + ν))
   * Torque capacity: T = p × μ × 2π × r_bore × L × r_bore
   *
   * Reference: Lame equations for thick-walled cylinders, Machinery's Handbook
   */
  calculateExpandingMandrel(input: ExpandingMandrelInput): ExpandingMandrelResult {
    const mat = getMat(input.material);
    const E = (input.youngs_modulus_gpa ?? mat.E_gpa) * 1000; // GPa → MPa
    const nu = input.poisson_ratio ?? 0.3;
    const mu = input.mu ?? 0.15;

    const rBore = input.bore_id_mm / 2; // mm
    const rOuter = input.od_mm / 2; // mm
    const interference = input.interference_mm ?? 0.02; // default 20µm diametral
    const radialInterference = interference / 2;
    const L = input.contact_length_mm;

    // Lame: p = Δ_r × E / (r_bore × ((r_o²+r_i²)/(r_o²-r_i²) + ν))
    const ratio = (rOuter * rOuter + rBore * rBore) / (rOuter * rOuter - rBore * rBore);
    const p = (radialInterference * E) / (rBore * (ratio + nu)); // MPa

    // Torque: T = p × μ × 2π × r_bore × L × r_bore (mm² → m² conversion for Nm)
    const torque = p * mu * 2 * Math.PI * rBore * L * rBore / 1e6; // Nm

    const requiredTorque = input.required_torque_nm ?? torque * 0.4;
    const sf = torque / requiredTorque;

    // Bore deformation: radial expansion ≈ p × r_bore / E × (ratio + ν) → but we applied interference
    const boreDeformation = radialInterference * 2 * 1000; // µm (diametral)

    return {
      contact_pressure_mpa: Math.round(p * 100) / 100,
      grip_torque_nm: Math.round(torque * 100) / 100,
      safety_factor: Math.round(sf * 100) / 100,
      is_adequate: sf >= SAFETY_FACTOR,
      bore_deformation_um: Math.round(boreDeformation * 10) / 10,
      notes: [
        `Interference: ${interference}mm diametral → p = ${p.toFixed(1)} MPa`,
        `Contact: ${L}mm length at Ø${input.bore_id_mm}mm bore`,
        `Torque capacity: ${torque.toFixed(2)} Nm`,
        sf < SAFETY_FACTOR ? `WARNING: SF=${sf.toFixed(1)} < ${SAFETY_FACTOR} — increase interference or contact length` : "",
      ].filter(Boolean),
    };
  }

  /**
   * Magnetic chuck holding force calculation.
   * For ferrous parts only.
   */
  calculateMagneticChuck(input: MagneticChuckInput): MagneticChuckResult {
    if (!input.is_ferrous) {
      return {
        holding_force_n: 0,
        is_adequate: false,
        safety_factor: 0,
        notes: ["REJECTED: Part is not ferrous — magnetic chuck cannot hold non-ferrous materials"],
      };
    }

    const holdingPerCm2 = input.holding_force_n_per_cm2 ?? 80; // typical for permanent magnetic chuck
    let holdingForce = holdingPerCm2 * input.contact_area_cm2;

    // Thin parts lose holding force — approximately linear reduction below 10mm
    if (input.part_thickness_mm < 10) {
      const thicknessFactor = Math.max(0.3, input.part_thickness_mm / 10);
      holdingForce *= thicknessFactor;
    }

    const required = input.required_force_n ?? holdingForce * 0.3;
    const sf = holdingForce / required;

    return {
      holding_force_n: Math.round(holdingForce),
      is_adequate: sf >= SAFETY_FACTOR,
      safety_factor: Math.round(sf * 100) / 100,
      notes: [
        `Contact area: ${input.contact_area_cm2} cm²`,
        `Holding: ${Math.round(holdingForce)}N (${holdingPerCm2} N/cm²)`,
        input.part_thickness_mm < 10 ? `Thin part (${input.part_thickness_mm}mm) — holding force reduced` : "",
        sf < SAFETY_FACTOR ? "WARNING: Insufficient holding force — consider mechanical clamping" : "",
      ].filter(Boolean),
    };
  }

  // ── U-LPS07: Stock Form Handling ───────────────────────────────────

  /**
   * Get workholding and roughing recommendations based on stock form.
   */
  stockFormRecommendation(stockForm: StockForm, gripDiameter_mm: number, wallThickness_mm?: number): StockFormResult {
    switch (stockForm) {
      case "bar":
        return {
          stock_form: "bar",
          workholding_recommendation: "hard_od",
          roughing_cycle: "G71",
          force_model: "Standard 3-jaw force: F_clamp / (3 × cos(α))",
          clamping_notes: [
            "Standard bar stock in 3-jaw or collet",
            "Full OD contact — no force concentration concerns",
            "G71 stock removal for cylindrical roughing",
          ],
        };

      case "forging":
        return {
          stock_form: "forging",
          workholding_recommendation: "soft_od",
          roughing_cycle: "G73",
          force_model: "Soft jaw: F distributed over machined bore surface",
          clamping_notes: [
            "Forging skin irregular — MUST use soft jaws bored to near-net shape",
            "G73 pattern repeat follows near-net forging contour",
            "First pass removes scale — use conservative DOC and higher feed",
            "Verify jaw contact on as-forged surface before running",
          ],
        };

      case "casting":
        return {
          stock_form: "casting",
          workholding_recommendation: "soft_od",
          roughing_cycle: "G73",
          force_model: "Soft jaw: F distributed over machined bore surface",
          clamping_notes: [
            "Casting surface rough and irregular — soft jaws required",
            "G73 pattern repeat removes casting skin uniformly",
            "Watch for hard spots / sand inclusions on first pass",
            "Consider magnetic chuck if flat datum available",
          ],
        };

      case "hex_bar": {
        // 3-jaw grips hex at 3 flat midpoints — force model
        const s = gripDiameter_mm / 2; // hex flat-to-flat / 2
        return {
          stock_form: "hex_bar",
          workholding_recommendation: "hard_od",
          roughing_cycle: "G71",
          force_model: `Hex 3-point contact: each jaw on flat midpoint, contact width ≈ ${(s * 0.577).toFixed(1)}mm`,
          clamping_notes: [
            "3-jaw naturally centers hex stock (120° symmetry matches 3 flats)",
            "Each jaw contacts one flat — no point loading if jaws are wider than flat",
            "Verify jaw width covers hex flat to prevent edge contact",
            `Across-flats: ${gripDiameter_mm}mm → across-corners: ${(gripDiameter_mm * 1.155).toFixed(1)}mm`,
          ],
        };
      }

      case "tube": {
        const wt = wallThickness_mm ?? 3;
        const isThin = wt < gripDiameter_mm * 0.08;
        return {
          stock_form: "tube",
          workholding_recommendation: isThin ? "collet" : "hard_od",
          roughing_cycle: "G71",
          force_model: isThin
            ? "Collet uniform radial grip — no trilobe concentration"
            : "3-jaw with reduced pressure — monitor wall distortion",
          clamping_notes: [
            `Wall thickness: ${wt.toFixed(1)}mm (${(wt / gripDiameter_mm * 100).toFixed(1)}% of OD)`,
            isThin ? "THIN WALL — use collet or 6-jaw with controlled pressure" : "Moderate wall — 3-jaw OK with reduced pressure",
            "Consider internal mandrel support for heavy cuts",
            "Light DOC to prevent chatter on thin section",
          ],
        };
      }

      case "pre_machined":
        return {
          stock_form: "pre_machined",
          workholding_recommendation: "soft_od",
          roughing_cycle: "G71",
          force_model: "Soft jaw bored to pre-machined OD for concentricity",
          clamping_notes: [
            "Pre-machined stock — protect finished surfaces with soft jaws",
            "Bore soft jaws to pre-machined OD for concentricity",
            "Minimal material removal expected — may skip rough cycle",
          ],
        };

      default:
        return {
          stock_form: stockForm,
          workholding_recommendation: "hard_od",
          roughing_cycle: "G71",
          force_model: "Default 3-jaw grip",
          clamping_notes: ["Unknown stock form — defaulting to hard jaw / G71"],
        };
    }
  }
}

export const latheWorkholdingEngine = new LatheWorkholdingEngine();
