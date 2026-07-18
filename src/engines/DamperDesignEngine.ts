/**
 * DamperDesignEngine — HVAC damper sizing and pressure drop
 *
 * Models: Damper authority (α = ΔPd/(ΔPd+ΔPs)), velocity through blade,
 *         leakage class (AMCA 500D), torque for actuation
 * References: ASHRAE Handbook, AMCA 500D
 * Safety: Velocity limits, leakage class, blade stress
 */

export type DamperType = "parallel_blade" | "opposed_blade" | "round" | "butterfly";
export type LeakageClass = "I" | "II" | "III";

export interface DamperDesignInput {
  airflow_m3_h: number;
  duct_width_mm?: number;           // auto-sized from flow
  duct_height_mm?: number;
  upstream_pressure_Pa?: number;     // default 250
  damper_type?: DamperType;
  leakage_class?: LeakageClass;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface DamperDesignResult {
  damper_width_mm: AtomicValue;
  damper_height_mm: AtomicValue;
  face_velocity_m_s: AtomicValue;
  pressure_drop_Pa: AtomicValue;
  damper_authority: AtomicValue;
  actuator_torque_Nm: AtomicValue;
  leakage_rate_L_s_m2: AtomicValue;
  free_area_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

const LEAK_RATES: Record<LeakageClass, number> = { I: 4, II: 10, III: 40 }; // L/s/m² at 250Pa

export class DamperDesignEngine {
  calculate(input: DamperDesignInput): DamperDesignResult {
    const {
      airflow_m3_h: Qh,
      upstream_pressure_Pa: Pup = 250,
      damper_type = "opposed_blade",
      leakage_class = "II",
    } = input;

    const recs: string[] = [];
    const Q = Qh / 3600; // m³/s

    // Size damper from flow (target 5-8 m/s face velocity)
    let W = input.duct_width_mm;
    let H = input.duct_height_mm;
    if (!W || !H) {
      const targetV = 6; // m/s
      const area = Q / targetV; // m²
      const side = Math.sqrt(area) * 1000;
      const stdSizes = [200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000];
      W = W ?? (stdSizes.find(s => s >= side) ?? stdSizes[stdSizes.length - 1]);
      H = H ?? W;
    }

    const faceArea = (W / 1000) * (H / 1000);
    const faceV = Q / faceArea;

    // Free area (blade obstruction)
    const freeAreaPct = damper_type === "butterfly" ? 90
      : damper_type === "round" ? 85
      : damper_type === "opposed_blade" ? 80 : 82;

    // Pressure drop: ΔP = ζ × ρ/2 × v² (fully open)
    const zeta = damper_type === "opposed_blade" ? 1.5
      : damper_type === "parallel_blade" ? 1.2
      : damper_type === "butterfly" ? 0.8 : 1.0;
    const rho = 1.2;
    const dP = zeta * rho / 2 * faceV * faceV;

    // Damper authority
    const authority = dP / (dP + Pup);

    // Actuator torque: T ≈ k × W × H² × ΔP (simplified)
    const k = damper_type === "opposed_blade" ? 0.6e-6 : 0.5e-6;
    const torque = k * W * H * H * (dP + Pup) / 1000;
    const torqueMin = 4; // minimum Nm
    const actTorque = Math.max(torque, torqueMin);

    // Leakage
    const leakRate = LEAK_RATES[leakage_class] * Math.sqrt(Pup / 250);

    const isSafe = faceV <= 12 && faceV >= 2;

    if (faceV > 10) recs.push(`High face velocity ${faceV.toFixed(1)}m/s — noise and erosion risk`);
    if (faceV < 3) recs.push(`Low face velocity ${faceV.toFixed(1)}m/s — oversized damper`);
    if (authority < 0.3) recs.push(`Low authority ${(authority * 100).toFixed(0)}% — poor control, increase damper ΔP`);
    if (authority > 0.7) recs.push(`High authority ${(authority * 100).toFixed(0)}% — excessive pressure loss`);
    if (recs.length === 0) recs.push(`Damper nominal — ${W}×${H}mm, ${faceV.toFixed(1)}m/s, α=${(authority * 100).toFixed(0)}%`);

    return {
      damper_width_mm: mkAv(W, "mm", 0, "duct_sizing"),
      damper_height_mm: mkAv(H, "mm", 0, "duct_sizing"),
      face_velocity_m_s: mkAv(Math.round(faceV * 10) / 10, "m/s", faceV * 0.05, "flow_area"),
      pressure_drop_Pa: mkAv(Math.round(dP), "Pa", dP * 0.12, "loss_coefficient"),
      damper_authority: mkAv(Math.round(authority * 100) / 100, "ratio", authority * 0.10, "pressure_ratio"),
      actuator_torque_Nm: mkAv(Math.round(actTorque * 10) / 10, "Nm", actTorque * 0.15, "blade_force"),
      leakage_rate_L_s_m2: mkAv(Math.round(leakRate * 10) / 10, "L/s/m²", leakRate * 0.20, "amca_class"),
      free_area_pct: mkAv(freeAreaPct, "%", 3, "blade_geometry"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const damperDesignEngine = new DamperDesignEngine();
