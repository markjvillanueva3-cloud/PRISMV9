/**
 * VibrationDampeningEngine — Vibration Dampening Strategy Calculator
 *
 * Calculates vibration mitigation strategies:
 * - Tuned mass damper sizing (mass, spring rate, damping ratio)
 * - Boring bar dampening requirements by L/D
 * - Process damping effectiveness at low speed
 * - Dynamic stiffness improvement factor
 * - Chatter-free DOC increase from dampening
 * - Dampened vs undampened stability comparison
 *
 * Key physics: Tuned damper optimal mass ratio μ = m_d/m_s ≈ 0.02-0.05.
 * Optimal tuning: f_d = f_n/(1+μ), optimal damping: ζ_opt = √(3μ/8(1+μ)).
 * Dampened boring bars use tuned mass inside the bar, increasing
 * critical L/D from 4:1 to 7:1 or beyond.
 *
 * Reference: Den Hartog — Mechanical Vibrations,
 *            Sandvik Silent Tools technical guide,
 *            Kennametal dampened boring bar data
 *
 * Actions: vibration_dampening_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface VibrationDampeningInput {
  natural_frequency_hz?: number;
  tool_mass_kg?: number;
  bar_diameter_mm?: number;
  bar_length_mm?: number;
  bar_material?: "steel" | "carbide" | "dampened_steel" | "dampened_carbide";
  cutting_speed_mpm?: number;
  current_doc_mm?: number;
  damper_type?: "tuned_mass" | "viscoelastic" | "impact"
    | "process_damping";
  target_ld_ratio?: number;
}

export interface VibrationDampeningResult {
  ld_ratio: AtomicValue;
  critical_ld: AtomicValue;
  ld_ok: AtomicValue;
  optimal_mass_ratio: AtomicValue;
  damper_mass: AtomicValue;
  optimal_damping_ratio: AtomicValue;
  stiffness_improvement: AtomicValue;
  chatter_free_doc: AtomicValue;
  doc_increase_factor: AtomicValue;
  process_damping_effective: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Critical L/D ratios by bar material */
const CRITICAL_LD: Record<string, number> = {
  steel: 4,
  carbide: 6,
  dampened_steel: 7,
  dampened_carbide: 10,
};

/** Dynamic stiffness multiplier from dampening */
const STIFFNESS_MULT: Record<string, number> = {
  steel: 1.0,
  carbide: 2.5,
  dampened_steel: 5.0,
  dampened_carbide: 8.0,
};

/** Process damping speed threshold (below this, process damping helps) */
const PROCESS_DAMPING_SPEED_THRESHOLD = 80; // m/min

// ── Engine ─────────────────────────────────────────────────────────

export class VibrationDampeningEngine {
  calculate(input: VibrationDampeningInput): VibrationDampeningResult {
    const warnings: string[] = [];
    const barDia = input.bar_diameter_mm ?? 25;
    const barLen = input.bar_length_mm ?? 100;
    const barMat = input.bar_material ?? "steel";
    const speed = input.cutting_speed_mpm ?? 150;
    const currentDoc = input.current_doc_mm ?? 1;
    const damperType = input.damper_type ?? "tuned_mass";
    const natFreq = input.natural_frequency_hz ?? 500;

    // L/D ratio
    const ldRatio = barDia > 0 ? barLen / barDia : 99;
    const critLD = CRITICAL_LD[barMat] ?? 4;
    const ldOk = ldRatio <= critLD;

    // Tool mass estimate (kg) from dimensions
    const barVolume = Math.PI * Math.pow(barDia / 2000, 2) *
      (barLen / 1000); // m³
    const density = barMat.includes("carbide") ? 14500 : 7800;
    const toolMass = input.tool_mass_kg ?? barVolume * density;

    // Optimal mass ratio (Den Hartog)
    const mu = damperType === "tuned_mass" ? 0.03
      : damperType === "viscoelastic" ? 0.02
      : damperType === "impact" ? 0.01
      : 0;

    // Damper mass
    const damperMass = toolMass * mu;

    // Optimal damping ratio
    const zetaOpt = Math.sqrt(3 * mu / (8 * (1 + mu)));

    // Stiffness improvement from bar material
    const stiffMult = STIFFNESS_MULT[barMat] ?? 1;

    // Chatter-free DOC (proportional to stiffness)
    const baseDoc = currentDoc;
    const chatterFreeDoc = baseDoc * stiffMult;
    const docIncrease = stiffMult;

    // Process damping effectiveness
    const procDampEffective = speed < PROCESS_DAMPING_SPEED_THRESHOLD;

    // Warnings
    if (!ldOk) {
      const recMat = ldRatio <= 6 ? "carbide"
        : ldRatio <= 7 ? "dampened_steel"
        : "dampened_carbide";
      warnings.push(
        `L/D ${r1(ldRatio)} exceeds ${critLD}:1 limit for ${barMat} — ` +
        `consider ${recMat}`
      );
    }
    if (ldRatio > 10) {
      warnings.push(
        `L/D ${r1(ldRatio)} is extreme — ` +
        "even dampened bars may chatter, consider boring head approach"
      );
    }
    if (barMat === "steel" && ldRatio > 3.5) {
      warnings.push(
        "Steel bar approaching L/D limit — " +
        "reduce DOC or upgrade to carbide/dampened"
      );
    }
    if (procDampEffective && speed < PROCESS_DAMPING_SPEED_THRESHOLD) {
      if (barMat === "steel" || barMat === "carbide") {
        warnings.push(
          `Low cutting speed ${speed} m/min — ` +
          "process damping may stabilize cut without dampened bar"
        );
      }
    }
    if (damperType === "tuned_mass" && natFreq < 100) {
      warnings.push(
        "Very low natural frequency — " +
        "tuned damper may need large mass"
      );
    }

    return {
      ld_ratio: av(r2(ldRatio), "ratio", 0.1,
        `${barLen}mm / ${barDia}mm`),
      critical_ld: av(critLD, "ratio", 0,
        `${barMat} limit`),
      ld_ok: av(ldOk ? 1 : 0, ldOk ? "OK" : "EXCEEDED", 0,
        `${r1(ldRatio)} vs ${critLD}:1`),
      optimal_mass_ratio: av(r3(mu), "ratio", 0.005,
        `${damperType} typical value`),
      damper_mass: av(r3(damperMass), "kg", 0.01,
        `${r3(toolMass)}kg × ${mu}`),
      optimal_damping_ratio: av(r3(zetaOpt), "ratio", 0.01,
        "√(3μ/8(1+μ))"),
      stiffness_improvement: av(r1(stiffMult), "×", 0.2,
        `${barMat} vs steel baseline`),
      chatter_free_doc: av(r2(chatterFreeDoc), "mm", 0.1,
        `${currentDoc}mm × ${stiffMult}× stiffness`),
      doc_increase_factor: av(r1(docIncrease), "×", 0.2,
        "Dampened / undampened DOC ratio"),
      process_damping_effective: av(procDampEffective ? 1 : 0,
        procDampEffective ? "YES" : "NO", 0,
        `${speed} m/min vs ${PROCESS_DAMPING_SPEED_THRESHOLD} threshold`),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const vibrationDampeningEngine = new VibrationDampeningEngine();
