/**
 * MicroEDMEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates parameters for micro-EDM operations: micro-hole drilling,
 * micro-milling, and micro-wire EDM. Feature sizes from 10µm to 500µm.
 *
 * Models: minimum electrode size, gap control, electrode wear compensation,
 * surface integrity at micro-scale, and process stability.
 *
 * Actions: micro_edm_calc, micro_edm_electrode, micro_edm_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type MicroEDMProcess = "micro_drill" | "micro_mill" | "micro_wire" | "micro_sinker";

export interface MicroEDMInput {
  process: MicroEDMProcess;
  feature_size_um: number;             // target feature dimension
  depth_um: number;                    // feature depth
  workpiece_material: string;
  electrode_diameter_um?: number;      // for drill/sinker
  wire_diameter_um?: number;           // for wire (typically 20-50µm)
  target_accuracy_um: number;
  target_surface_finish_Ra_um: number;
}

export interface MicroEDMResult {
  recommended_electrode_um: number;
  spark_gap_um: number;
  discharge_energy_uJ: number;         // microjoules
  pulse_on_ns: number;
  pulse_off_ns: number;
  feed_rate_um_per_min: number;
  electrode_wear_compensation_pct: number;
  aspect_ratio: number;
  max_achievable_aspect_ratio: number;
  estimated_time_min: number;
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MicroEDMEngine {
  calculate(input: MicroEDMInput): MicroEDMResult {
    // Spark gap at micro scale (much smaller than conventional)
    const gapUm = input.target_surface_finish_Ra_um < 0.5 ? 2 : input.target_surface_finish_Ra_um < 1.0 ? 4 : 8;

    // Electrode diameter
    let electrodeUm: number;
    if (input.process === "micro_drill" || input.process === "micro_sinker") {
      electrodeUm = input.electrode_diameter_um || (input.feature_size_um - 2 * gapUm);
    } else if (input.process === "micro_wire") {
      electrodeUm = input.wire_diameter_um || 30;
    } else {
      electrodeUm = input.feature_size_um * 0.3; // micro-milling tool
    }

    // Discharge energy (microjoules — very low for micro-EDM)
    const energyUJ = input.target_surface_finish_Ra_um < 0.5 ? 0.5
      : input.target_surface_finish_Ra_um < 1.0 ? 2.0
      : 10.0;

    // Pulse timing (nanoseconds)
    const pulseOn = energyUJ < 1 ? 50 : energyUJ < 5 ? 200 : 1000;
    const pulseOff = pulseOn * 3; // 3:1 off:on ratio typical for micro-EDM

    // Feed rate
    const baseFeed = input.process === "micro_drill" ? 5 : input.process === "micro_wire" ? 2 : 1;
    const feedRate = baseFeed * (energyUJ / 2); // µm/min

    // Electrode wear compensation
    // Micro-EDM has higher wear ratio than conventional
    const wearPct = input.process === "micro_drill" ? 30 : input.process === "micro_mill" ? 50 : 15;

    // Aspect ratio
    const aspectRatio = input.depth_um / input.feature_size_um;
    const maxAspect = input.process === "micro_drill" ? 20
      : input.process === "micro_wire" ? 100
      : 5;

    // Time estimate
    const timeMin = input.depth_um / feedRate;

    // Recommendations
    const recs: string[] = [];
    if (aspectRatio > maxAspect) {
      recs.push(`Aspect ratio ${aspectRatio.toFixed(1)} exceeds max ${maxAspect} for ${input.process} — consider alternative process`);
    }
    if (electrodeUm < 20) {
      recs.push("Electrode <20µm — fragile; use WEDG (wire electro-discharge grinding) for electrode fabrication");
    }
    if (input.feature_size_um < 50) {
      recs.push("Feature <50µm — requires RC-pulse generator, not transistor; verify machine capability");
    }
    if (input.process === "micro_drill" && wearPct > 25) {
      recs.push("High electrode wear — use electrode wear compensation (EWC) with uniform wear method");
    }
    if (recs.length === 0) {
      recs.push("Micro-EDM parameters within achievable range — proceed with test cuts");
    }

    return {
      recommended_electrode_um: Math.round(electrodeUm),
      spark_gap_um: gapUm,
      discharge_energy_uJ: energyUJ,
      pulse_on_ns: pulseOn,
      pulse_off_ns: pulseOff,
      feed_rate_um_per_min: Math.round(feedRate * 100) / 100,
      electrode_wear_compensation_pct: wearPct,
      aspect_ratio: Math.round(aspectRatio * 10) / 10,
      max_achievable_aspect_ratio: maxAspect,
      estimated_time_min: Math.round(timeMin * 10) / 10,
      recommendations: recs,
    };
  }
}

export const microEDMEngine = new MicroEDMEngine();
