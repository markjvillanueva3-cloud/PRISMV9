/**
 * ChipFormationPredictionEngine — Chip morphology, shear angle, and chip control
 *
 * Models: Merchant's circle (shear angle), Ernst-Merchant chip type classification,
 *         chip compression ratio, chip curl radius, BUE prediction
 * References: Merchant (1945), Shaw (2005), Astakhov (2006), Klocke (2011)
 * Safety: Continuous chips risk spindle/part wrapping; BUE causes surface defects
 */

// ─── Types ─────────────────────────────────────────────────────────

export type ChipType =
  | "continuous"
  | "lamellar"
  | "segmented"
  | "discontinuous"
  | "built_up_edge";

/** Material Ductility type definition.
 */
export type MaterialDuctility = "brittle" | "moderate" | "ductile" | "very_ductile";

/** Chip Formation Input configuration/data structure.
 */
export interface ChipFormationInput {
  cutting_speed_m_min: number;
  feed_mm_rev: number;                // or feed_per_tooth for milling
  depth_of_cut_mm: number;
  rake_angle_deg: number;             // tool rake angle (positive or negative)
  workpiece_hardness_hrc?: number;    // default 25
  workpiece_ductility?: MaterialDuctility;  // auto-estimated from hardness if absent
  workpiece_elongation_pct?: number;  // elongation at break
  friction_coefficient?: number;      // tool-chip friction (default 0.5)
  tool_has_chipbreaker?: boolean;     // tool has chipbreaker geometry
  tool_nose_radius_mm?: number;       // for chip curl estimation
  coolant_active?: boolean;           // coolant reduces BUE tendency
}

/** Atomic Value configuration/data structure.
 */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Chip Formation Result configuration/data structure.
 */
export interface ChipFormationResult {
  shear_angle_deg: AtomicValue;
  chip_compression_ratio: AtomicValue;
  chip_thickness_mm: AtomicValue;
  shear_strain: AtomicValue;
  chip_velocity_m_min: AtomicValue;
  chip_type: ChipType;
  chip_type_confidence: number;       // 0–1
  bue_risk: number;                   // 0–1
  chip_curl_radius_mm: AtomicValue;
  chip_breakability: "easy" | "moderate" | "difficult";
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/** BUE speed threshold by hardness range (m/min) — below this, BUE forms */
const BUE_SPEED_THRESHOLD = (hrc: number): number => {
  if (hrc <= 15) return 80;    // very soft → BUE up to 80 m/min
  if (hrc <= 25) return 50;    // mild steel
  if (hrc <= 35) return 30;    // medium steel
  if (hrc <= 45) return 15;    // alloy steel
  return 5;                    // hardened → almost no BUE
};

/** Estimate ductility from hardness */
const estimateDuctility = (hrc: number): MaterialDuctility => {
  if (hrc >= 55) return "brittle";
  if (hrc >= 40) return "moderate";
  if (hrc >= 25) return "ductile";
  return "very_ductile";
};

/** Segmentation criterion: specific energy threshold */
const SEGMENTATION_THRESHOLD = (hrc: number): number => {
  // Higher hardness → lower threshold for segmented chips
  // Based on Recht (1964) adiabatic shear criterion
  if (hrc >= 50) return 0.20;   // easily segmented
  if (hrc >= 40) return 0.35;
  if (hrc >= 30) return 0.50;
  return 0.70;                   // hard to segment
};

// ─── Engine ────────────────────────────────────────────────────────

/** Chip Formation Prediction Engine engine/manager.
 */
export class ChipFormationPredictionEngine {
  calculate(input: ChipFormationInput): ChipFormationResult {
    const {
      cutting_speed_m_min: Vc,
      feed_mm_rev: f,
      depth_of_cut_mm: ap,
      rake_angle_deg: gamma_deg,
      workpiece_hardness_hrc: hrc = 25,
      workpiece_elongation_pct: elong,
      friction_coefficient: mu = 0.5,
      tool_has_chipbreaker: hasBreaker = false,
      tool_nose_radius_mm: noseR,
      coolant_active: coolant = true,
    } = input;

    const recs: string[] = [];

    // Ductility: user-provided or estimated from hardness
    const ductility = input.workpiece_ductility ?? estimateDuctility(hrc);

    // ── 1. Friction angle (β) from Coulomb friction ──
    const beta_rad = Math.atan(mu);
    const beta_deg = beta_rad * (180 / Math.PI);

    // ── 2. Shear angle (φ) — Merchant's equation ──
    // φ = 45° + γ/2 − β/2 (Merchant's minimum energy criterion)
    const gamma_rad = (gamma_deg * Math.PI) / 180;
    const phi_deg = 45 + gamma_deg / 2 - beta_deg / 2;
    const phi_rad = (phi_deg * Math.PI) / 180;

    // Clamp shear angle to physical range (5° – 55°)
    const phi_clamped_deg = Math.max(5, Math.min(55, phi_deg));
    const phi_clamped_rad = (phi_clamped_deg * Math.PI) / 180;

    // ── 3. Chip compression ratio (r_c = h/h_c = sin(φ)/cos(φ-γ)) ──
    // r_c < 1 always (chip is thicker than uncut chip)
    // chip_ratio = t1/t2 = sin(φ)/cos(φ-γ)
    const cos_phi_gamma = Math.cos(phi_clamped_rad - gamma_rad);
    const chip_ratio = cos_phi_gamma > 0
      ? Math.sin(phi_clamped_rad) / cos_phi_gamma
      : 0.3;
    // Compression ratio = 1/chip_ratio (how much thicker the chip is)
    const compression_ratio = chip_ratio > 0 ? 1 / chip_ratio : 3;

    // ── 4. Chip thickness ──
    const h = f;  // uncut chip thickness ≈ feed (for turning)
    const h_c = h * compression_ratio;  // actual chip thickness

    // ── 5. Shear strain ──
    // γ_shear = cos(γ) / (sin(φ) × cos(φ-γ))
    const shear_strain = (cos_phi_gamma > 0 && Math.sin(phi_clamped_rad) > 0)
      ? Math.cos(gamma_rad) / (Math.sin(phi_clamped_rad) * cos_phi_gamma)
      : 2.0;

    // ── 6. Chip velocity ──
    // V_chip = V_c × sin(φ) / cos(φ-γ) = V_c × r_c
    const V_chip = Vc * chip_ratio;

    // ── 7. Chip type classification ──
    let chipType: ChipType;
    let confidence: number;

    const bueThreshold = BUE_SPEED_THRESHOLD(hrc);
    const segThreshold = SEGMENTATION_THRESHOLD(hrc);

    // BUE check: low speed + ductile material + no coolant boost
    const bueRisk = Vc < bueThreshold && (ductility === "ductile" || ductility === "very_ductile")
      ? Math.min(1.0, (bueThreshold - Vc) / bueThreshold * (coolant ? 0.6 : 1.0))
      : 0;

    /** If.
     * @param ductility - ductility
     * @returns void
     */
    if (ductility === "brittle") {
      chipType = "discontinuous";
      confidence = 0.85;
    } else if (bueRisk > 0.5) {
      chipType = "built_up_edge";
      confidence = Math.min(0.9, bueRisk);
    } else if (hrc >= 45 || (f > segThreshold && hrc >= 30)) {
      // High hardness or high feed → segmented
      chipType = "segmented";
      confidence = Math.min(0.85, 0.5 + (hrc - 30) / 40);
    } else if (hrc >= 35 || (f > segThreshold * 0.7)) {
      chipType = "lamellar";
      confidence = 0.65;
    } else {
      chipType = "continuous";
      confidence = 0.80;
    }

    // ── 8. Chip curl radius (empirical) ──
    // Smaller radius = tighter curl = better breaking
    // Curl radius increases with feed, decreases with nose radius
    const baseRadius = noseR ? noseR * 3 : 5;  // base curl radius
    const feedFactor = Math.max(0.5, f / 0.2);   // higher feed → tighter curl
    const curlRadius = baseRadius / feedFactor;
    /** If.
     * @param hasBreaker - has breaker
     * @returns void
     */
    if (hasBreaker) {
      // Chipbreaker typically reduces curl radius by 50–70%
    }
    const effectiveCurl = hasBreaker ? curlRadius * 0.4 : curlRadius;

    // ── 9. Chip breakability ──
    let breakability: "easy" | "moderate" | "difficult";
    /** If.
     * @param chipType - chip type
     * @returns void
     */
    if (chipType === "discontinuous" || chipType === "segmented") {
      breakability = "easy";
    } else if (hasBreaker || effectiveCurl < 3 || chipType === "lamellar") {
      breakability = "moderate";
    } else {
      breakability = "difficult";
    }

    // ── 10. Safety ──
    const isSafe = chipType !== "built_up_edge" && breakability !== "difficult";

    // ── 11. Recommendations ──
    /** If.
     * @param chipType - chip type
     * @returns void
     */
    if (chipType === "built_up_edge") {
      recs.push(
        `BUE risk ${(bueRisk * 100).toFixed(0)}% at Vc=${Vc} m/min — `
        + `increase speed above ${bueThreshold} m/min, use coated insert, `
        + `or apply coolant to prevent adhesion`
      );
    }

    /** If.
     * @param chipType - chip type
     * @returns void
     */
    if (chipType === "continuous" && !hasBreaker) {
      recs.push(
        `Continuous chips expected — use chipbreaker geometry, `
        + `increase feed to f>${(segThreshold * 0.7).toFixed(2)} mm/rev, `
        + `or use peck cycle for deep cuts`
      );
    }

    /** If.
     * @param breakability - breakability
     * @returns void
     */
    if (breakability === "difficult") {
      recs.push(
        `CHIP CONTROL: Difficult chip breaking — risk of bird-nesting. `
        + `Add chipbreaker, increase feed, or use high-pressure coolant`
      );
    }

    /** If.
     * @param chipType - chip type
     * @returns void
     */
    if (chipType === "segmented" && Vc > 200) {
      recs.push(
        `Segmented chips at high speed — acceptable for HSM, `
        + `monitor for vibration from periodic force variation`
      );
    }

    /** If.
     * @param gamma_deg - gamma_deg
     * @returns void
     */
    if (gamma_deg < -10) {
      recs.push(
        `Highly negative rake (${gamma_deg}°) — high compression ratio `
        + `${compression_ratio.toFixed(2)}, increased cutting forces and heat`
      );
    }

    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push(
        `Chip formation nominal — ${chipType} chips, `
        + `φ=${phi_clamped_deg.toFixed(1)}°, r_c=${compression_ratio.toFixed(2)}, `
        + `breakability: ${breakability}`
      );
    }

    return {
      shear_angle_deg: {
        value: Math.round(phi_clamped_deg * 10) / 10,
        unit: "°",
        uncertainty: 5.0,  // Merchant's equation ±5° typical
        source: "merchant_minimum_energy",
      },
      chip_compression_ratio: {
        value: Math.round(compression_ratio * 100) / 100,
        unit: "ratio",
        uncertainty: compression_ratio * 0.15,
        source: "merchant_shear_plane",
      },
      chip_thickness_mm: {
        value: Math.round(h_c * 1000) / 1000,
        unit: "mm",
        uncertainty: h_c * 0.20,
        source: "kinematic_chip_model",
      },
      shear_strain: {
        value: Math.round(shear_strain * 100) / 100,
        unit: "dimensionless",
        uncertainty: shear_strain * 0.15,
        source: "shear_plane_geometry",
      },
      chip_velocity_m_min: {
        value: Math.round(V_chip * 10) / 10,
        unit: "m/min",
        uncertainty: V_chip * 0.15,
        source: "continuity_equation",
      },
      chip_type: chipType,
      chip_type_confidence: Math.round(confidence * 100) / 100,
      bue_risk: Math.round(bueRisk * 100) / 100,
      chip_curl_radius_mm: {
        value: Math.round(effectiveCurl * 10) / 10,
        unit: "mm",
        uncertainty: effectiveCurl * 0.30,
        source: "empirical_curl_model",
        warning: effectiveCurl > 10 ? "Large curl radius — poor chip breaking" : undefined,
      },
      chip_breakability: breakability,
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

/** Chip Formation Prediction Engine constant.
 */
export const chipFormationPredictionEngine = new ChipFormationPredictionEngine();
