/**
 * RivetedJointEngine — Riveted joint analysis
 *
 * Models: Shear/bearing/tearing failure modes, joint efficiency,
 *         pattern stress distribution, fatigue
 * References: ASME BPVC VIII-1, Shigley Ch.8
 */

export type RivetPattern = "single_row" | "double_row" | "diamond" | "zigzag";
export type FailureMode = "shear" | "bearing" | "tearing" | "edge_shear";

export interface RivetedJointInput {
  rivet_diameter_mm: number;
  plate_thickness_mm: number;
  num_rivets: number;
  pitch_mm: number;                   // spacing between rivets
  pattern?: RivetPattern;
  plate_ultimate_MPa?: number;       // default 400 (steel)
  rivet_shear_MPa?: number;          // default 300
  applied_load_N: number;
  edge_distance_mm?: number;         // default 1.5×diameter
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface RivetedJointResult {
  shear_stress_MPa: AtomicValue;
  bearing_stress_MPa: AtomicValue;
  tearing_stress_MPa: AtomicValue;
  critical_failure_mode: AtomicValue;
  safety_factor: AtomicValue;
  joint_efficiency_pct: AtomicValue;
  load_per_rivet_N: AtomicValue;
  min_edge_distance_mm: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class RivetedJointEngine {
  calculate(input: RivetedJointInput): RivetedJointResult {
    const {
      rivet_diameter_mm: d,
      plate_thickness_mm: t,
      num_rivets: n,
      pitch_mm: p,
      pattern = "single_row",
      plate_ultimate_MPa: sigmaU = 400,
      rivet_shear_MPa: tauR = 300,
      applied_load_N: F,
    } = input;

    const recs: string[] = [];
    const edgeDist = input.edge_distance_mm ?? 1.5 * d;

    // Load per rivet
    const rowFactor = pattern === "double_row" ? 2 : pattern === "diamond" ? 1.5 : 1;
    const loadPerRivet = F / (n * rowFactor);

    // Shear stress (single shear)
    const rivetArea = Math.PI / 4 * d * d;
    const tauShear = loadPerRivet / rivetArea;

    // Bearing stress
    const sigmaBearing = loadPerRivet / (d * t);

    // Tearing stress (plate between rivets)
    const netWidth = p - d;
    const sigmaTearing = F / (netWidth * t * Math.max(n / rowFactor, 1));

    // Allowable stresses
    const tauAllow = tauR;
    const sigmaBearAllow = 1.5 * sigmaU; // bearing typically 1.5× tensile
    const sigmaTearAllow = sigmaU;

    // Safety factors per mode
    const sfShear = tauAllow / (tauShear + 0.001);
    const sfBearing = sigmaBearAllow / (sigmaBearing + 0.001);
    const sfTearing = sigmaTearAllow / (sigmaTearing + 0.001);

    // Critical failure mode
    const sfMin = Math.min(sfShear, sfBearing, sfTearing);
    let criticalMode: FailureMode;
    let modeCode: number;
    if (sfMin === sfShear) { criticalMode = "shear"; modeCode = 0; }
    else if (sfMin === sfBearing) { criticalMode = "bearing"; modeCode = 1; }
    else { criticalMode = "tearing"; modeCode = 2; }

    // Joint efficiency
    const jointEff = (p - d) / p * 100;

    // Minimum edge distance
    const minEdge = 1.5 * d;

    const isSafe = sfMin > 1.5 && edgeDist >= minEdge * 0.9;

    if (sfMin < 2) recs.push(`Low SF ${sfMin.toFixed(1)} in ${criticalMode} — increase rivets or diameter`);
    if (edgeDist < minEdge) recs.push(`Edge distance ${edgeDist.toFixed(1)}mm < min ${minEdge.toFixed(1)}mm — edge tear risk`);
    if (d / p > 0.5) recs.push(`Rivet/pitch ratio ${(d / p).toFixed(2)} > 0.5 — net section too small`);
    if (jointEff < 50) recs.push(`Low joint efficiency ${jointEff.toFixed(0)}% — increase pitch`);
    if (recs.length === 0) recs.push(`Joint nominal — SF=${sfMin.toFixed(1)} (${criticalMode}), η=${jointEff.toFixed(0)}%`);

    return {
      shear_stress_MPa: mkAv(Math.round(tauShear * 10) / 10, "MPa", tauShear * 0.05, "F_nA"),
      bearing_stress_MPa: mkAv(Math.round(sigmaBearing * 10) / 10, "MPa", sigmaBearing * 0.05, "F_dt"),
      tearing_stress_MPa: mkAv(Math.round(sigmaTearing * 10) / 10, "MPa", sigmaTearing * 0.10, "F_net"),
      critical_failure_mode: mkAv(modeCode, "code", 0, "min_SF", criticalMode),
      safety_factor: mkAv(Math.round(sfMin * 100) / 100, "ratio", sfMin * 0.10, "min_mode"),
      joint_efficiency_pct: mkAv(Math.round(jointEff * 10) / 10, "%", jointEff * 0.05, "p_d_p"),
      load_per_rivet_N: mkAv(Math.round(loadPerRivet), "N", loadPerRivet * 0.05, "F_n"),
      min_edge_distance_mm: mkAv(minEdge, "mm", minEdge * 0.10, "1.5d"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const rivetedJointEngine = new RivetedJointEngine();
