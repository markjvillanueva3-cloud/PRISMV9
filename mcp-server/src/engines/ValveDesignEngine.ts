/**
 * ValveDesignEngine — Industrial valve sizing and selection
 *
 * Models: ISA/IEC Cv equation (Q = Cv×√(ΔP/SG)), valve authority,
 *         choked flow (critical pressure drop), noise prediction
 * References: ISA-75.01, IEC 60534, Fisher Control Valve Handbook
 * Safety: Cavitation, flashing, noise limits
 */

export type ValveType = "globe" | "butterfly" | "ball" | "gate"
  | "plug" | "diaphragm";
export type FlowMedia = "water" | "steam" | "air" | "oil" | "gas";

export interface ValveDesignInput {
  flow_rate_m3_h: number;
  inlet_pressure_bar: number;
  outlet_pressure_bar: number;
  fluid?: FlowMedia;
  fluid_temp_C?: number;               // default 20
  fluid_sg?: number;                    // default 1.0
  valve_type?: ValveType;
  pipe_size_mm?: number;                // default auto-sized
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ValveDesignResult {
  cv_required: AtomicValue;
  cv_selected: AtomicValue;
  valve_size_mm: AtomicValue;
  percent_opening_pct: AtomicValue;
  velocity_m_s: AtomicValue;
  pressure_drop_bar: AtomicValue;
  fl_factor: AtomicValue;
  cavitation_index: AtomicValue;
  noise_dBA: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const FL_VALUES: Record<ValveType, number> = {
  globe: 0.90, butterfly: 0.70, ball: 0.60,
  gate: 0.85, plug: 0.85, diaphragm: 0.80,
};

const STD_VALVE_SIZES = [15, 20, 25, 32, 40, 50, 65, 80, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600];

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ValveDesignEngine {
  calculate(input: ValveDesignInput): ValveDesignResult {
    const {
      flow_rate_m3_h: Q,
      inlet_pressure_bar: P1,
      outlet_pressure_bar: P2,
      fluid = "water",
      fluid_temp_C: T = 20,
      fluid_sg: SG = 1.0,
      valve_type = "globe",
    } = input;

    const recs: string[] = [];
    const dP = P1 - P2;
    const Fl = FL_VALUES[valve_type];

    // Cv calculation (ISA): Cv = Q / (N1 × √(dP/SG))
    // N1 = 0.0865 for Q in m³/h, dP in bar
    const N1 = 0.0865;
    const CvReq = Q / (N1 * Math.sqrt(Math.max(dP, 0.01) / SG));

    // Check for choked flow
    // Critical pressure drop: dP_choked = Fl² × (P1 - Pv)
    const Pv = fluid === "water" ? 0.02 + T * 0.001 : 0; // vapor pressure bar (simplified)
    const dP_choked = Fl * Fl * (P1 - Pv);
    const isChoked = dP > dP_choked;

    // Select valve size from standard sizes
    // Cv capacity roughly: Cv_full ≈ 20 × (d_mm/25)²
    let selectedSize = input.pipe_size_mm;
    let CvSelected = 0;
    if (!selectedSize) {
      for (const s of STD_VALVE_SIZES) {
        CvSelected = 20 * Math.pow(s / 25, 2);
        if (CvSelected >= CvReq * 1.25) { // 25% margin
          selectedSize = s;
          break;
        }
      }
      if (!selectedSize) {
        selectedSize = STD_VALVE_SIZES[STD_VALVE_SIZES.length - 1];
        CvSelected = 20 * Math.pow(selectedSize / 25, 2);
      }
    } else {
      CvSelected = 20 * Math.pow(selectedSize / 25, 2);
    }

    // Percent opening
    const pctOpen = Math.min((CvReq / CvSelected) * 100, 100);

    // Pipe velocity
    const pipeArea = Math.PI * selectedSize * selectedSize / 4 / 1e6; // m²
    const velocity = (Q / 3600) / pipeArea;

    // Cavitation index: σ = (P1 - Pv) / dP
    const sigma = (P1 - Pv) / Math.max(dP, 0.01);

    // Noise prediction (simplified IEC 60534-8-3)
    // SPL ≈ 10×log10(dP×Q/Cv) + 80 dBA
    const noise = 10 * Math.log10(Math.max(dP * Q, 1)) + 60;

    const isSafe = !isChoked && sigma > 1.5 && pctOpen > 20 && pctOpen < 80;

    if (isChoked) {
      recs.push(`Choked flow — actual dP ${dP.toFixed(1)}bar exceeds critical ${dP_choked.toFixed(1)}bar`);
    }
    if (sigma < 2.0) {
      recs.push(`Low cavitation index σ=${sigma.toFixed(2)} — risk of cavitation damage`);
    }
    if (pctOpen < 20) {
      recs.push(`Valve only ${pctOpen.toFixed(0)}% open — oversized, select smaller valve`);
    }
    if (pctOpen > 80) {
      recs.push(`Valve ${pctOpen.toFixed(0)}% open — undersized, limited rangeability`);
    }
    if (noise > 85) {
      recs.push(`Predicted noise ${noise.toFixed(0)}dBA exceeds 85dBA — add attenuator or trim`);
    }
    if (velocity > 6 && fluid === "water") {
      recs.push(`High velocity ${velocity.toFixed(1)}m/s — erosion risk, increase pipe size`);
    }
    if (recs.length === 0) {
      recs.push(`Valve sizing nominal — Cv=${CvReq.toFixed(1)}, ${selectedSize}mm ${valve_type}, ${pctOpen.toFixed(0)}% open`);
    }

    return {
      cv_required: mkAv(Math.round(CvReq * 10) / 10, "Cv", CvReq * 0.05, "isa_75_01"),
      cv_selected: mkAv(Math.round(CvSelected * 10) / 10, "Cv", CvSelected * 0.05, "catalog_size"),
      valve_size_mm: mkAv(selectedSize, "mm", 0, "standard_size"),
      percent_opening_pct: mkAv(Math.round(pctOpen * 10) / 10, "%", pctOpen * 0.05, "cv_ratio"),
      velocity_m_s: mkAv(Math.round(velocity * 100) / 100, "m/s", velocity * 0.05, "continuity"),
      pressure_drop_bar: mkAv(Math.round(dP * 100) / 100, "bar", dP * 0.03, "input"),
      fl_factor: mkAv(Fl, "dimensionless", 0.02, "valve_type_ref"),
      cavitation_index: mkAv(Math.round(sigma * 100) / 100, "ratio", sigma * 0.10, "pressure_ratio"),
      noise_dBA: mkAv(Math.round(noise), "dBA", noise * 0.10, "iec_60534"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const valveDesignEngine = new ValveDesignEngine();
