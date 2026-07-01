#!/usr/bin/env npx tsx
/**
 * U-TQ2: Generate Torque Curves for All Machines
 *
 * Generates [{rpm, torque_Nm, power_kW}] arrays for every machine in the catalog.
 * Sources (in priority order):
 *   1. HSMAdvisor power curves (ground truth, 18 machines)
 *   2. Catalog base_rpm that passes energy conservation check
 *   3. Computed base_rpm from P = T × ω (for TIER-B machines)
 *
 * Output: src/data/machine-torque-curves.ts
 */

import { EXTENDED_MACHINE_CATALOG } from "../src/data/machine-profiles-catalog.js";
import { SPINDLE_CORRECTIONS } from "../src/data/machine-spindle-corrections.js";
import { readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Load external data ──────────────────────────────────────────────

const hsmMachines: any[] = JSON.parse(
  readFileSync(path.resolve(__dirname, "../src/data/hsm-advisor-machines.json"), "utf-8")
);

// ── Types ───────────────────────────────────────────────────────────

interface TorqueCurvePoint {
  rpm: number;
  torque_Nm: number;
  power_kW: number;
}

interface MachineTorqueCurve {
  machine_id: string;
  brand: string;
  model: string;
  source: "hsm_advisor" | "catalog_verified" | "computed_from_PT" | "taper_heuristic" | "skip";
  confidence: number; // 0-1
  base_speed_rpm: number;
  peak_torque_Nm: number;
  rated_power_kW: number;
  max_rpm: number;
  drive_type_inferred: "belt" | "direct" | "gear" | "integral" | "unknown";
  duty_note?: string;
  points: TorqueCurvePoint[];
}

// ── Helpers ─────────────────────────────────────────────────────────

function makeId(brand: string, model: string): string {
  return `${brand}_${model}`.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** Convert ft·lb to Nm */
function ftlbToNm(ftlb: number): number {
  return Math.round(ftlb * 1.3558 * 100) / 100;
}

/** Convert hp to kW */
function hpToKw(hp: number): number {
  return Math.round(hp * 0.7457 * 100) / 100;
}

/** Compute base speed from P and T: base_rpm = P_kW × 9549 / T_Nm */
function computeBaseRpm(power_kW: number, torque_Nm: number): number {
  if (torque_Nm <= 0) return 0;
  return Math.round((power_kW * 9549) / torque_Nm);
}

/** Energy conservation check: P ≈ T × 2π × base_rpm / 60000 */
function energyCheck(torque_Nm: number, base_rpm: number, power_kW: number): boolean {
  const computedP = (torque_Nm * 2 * Math.PI * base_rpm) / 60000;
  const ratio = computedP / power_kW;
  return ratio > 0.85 && ratio < 1.15;
}

/** Generate standard two-region curve with 10 points */
function generateTwoRegionCurve(
  base_rpm: number,
  max_rpm: number,
  peak_torque_Nm: number,
  rated_power_kW: number,
): TorqueCurvePoint[] {
  const points: TorqueCurvePoint[] = [];

  // Point 1: near zero RPM
  points.push({ rpm: 0, torque_Nm: peak_torque_Nm, power_kW: 0 });

  // Points 2-4: constant torque region (0 to base_speed)
  const ctSteps = [0.25, 0.5, 0.75, 1.0];
  for (const frac of ctSteps) {
    const rpm = Math.round(base_rpm * frac);
    if (rpm <= 0) continue;
    const power = Math.round((peak_torque_Nm * 2 * Math.PI * rpm) / 60000 * 1000) / 1000;
    points.push({ rpm, torque_Nm: peak_torque_Nm, power_kW: Math.min(power, rated_power_kW) });
  }

  // Points 5-9: constant power region (base_speed to max_rpm)
  const cpSteps = [1.5, 2.0, 3.0, 5.0];
  for (const mult of cpSteps) {
    const rpm = Math.round(base_rpm * mult);
    if (rpm >= max_rpm) break;
    const torque = Math.round((rated_power_kW * 9549) / rpm * 100) / 100;
    points.push({ rpm, torque_Nm: torque, power_kW: rated_power_kW });
  }

  // Point 10: at max_rpm
  if (max_rpm > base_rpm) {
    const torqueAtMax = Math.round((rated_power_kW * 9549) / max_rpm * 100) / 100;
    points.push({ rpm: max_rpm, torque_Nm: torqueAtMax, power_kW: rated_power_kW });
  }

  // Deduplicate by RPM
  const seen = new Set<number>();
  return points.filter(p => {
    if (seen.has(p.rpm)) return false;
    seen.add(p.rpm);
    return true;
  });
}

/** Infer drive type from taper and RPM characteristics */
function inferDriveType(
  taper: string,
  max_rpm: number,
  torque_Nm: number,
  power_kW: number,
  machineType: string,
): "belt" | "direct" | "gear" | "integral" | "unknown" {
  const t = taper?.toLowerCase() ?? "";
  const mType = machineType?.toLowerCase() ?? "";

  // High-speed with small taper → integral motor-in-spindle
  if (max_rpm >= 20000 && (t.includes("hsk-e") || t.includes("hsk-a") || t.includes("30"))) {
    return "integral";
  }
  // Direct drive typical for 10000-20000 RPM range with medium taper
  if (max_rpm >= 10000 && max_rpm < 20000 && (t.includes("hsk") || t.includes("40"))) {
    return "direct";
  }
  // Lathes with high torque → belt typically
  if (mType.includes("lathe") || mType.includes("turn") || mType.includes("swiss")) {
    return "belt";
  }
  // BT50/CAT50 with low RPM → likely gear
  if ((t.includes("50") || t.includes("mt4") || t.includes("mt5")) && max_rpm <= 6000) {
    return "gear";
  }
  // Standard BT40/CAT40 → belt
  if (t.includes("40") && max_rpm <= 12000) {
    return "belt";
  }
  return "unknown";
}

// ── Build HSMAdvisor lookup ─────────────────────────────────────────

interface HSMMatch {
  name: string;
  power_curve: Array<{rpm: number; hp: number; torque_ftlb: number}>;
  max_hp: number;
  max_rpm: number;
  max_torque_ftlb: number;
}

// Build fuzzy name matcher for HSMAdvisor
const hsmLookup: Map<string, HSMMatch> = new Map();
for (const m of hsmMachines) {
  if (!m.power_curve || m.power_curve.length === 0) continue;
  hsmLookup.set(m.name.toLowerCase(), m);
}

function findHsmMatch(brand: string, model: string): HSMMatch | null {
  const brandL = brand.toLowerCase();
  const modelL = model.toLowerCase();

  // Exact name matches
  const checks = [
    `${brandL} ${modelL}`,
    `haas vf2`, `haas vf-2`,
    `haas vf series`, `haas umc-750`,
    `okuma genos m560`, `okuma space turn lb3000`,
    `hurco vmx30`, `hurco vm10`,
  ];

  for (const [hsmName, data] of hsmLookup) {
    // Check if both brand and some part of model appear in HSM name
    if (hsmName.includes(brandL)) {
      // Try various model name fragments
      const modelParts = modelL.replace(/-/g, "").split(/[\s-]+/);
      for (const part of modelParts) {
        if (part.length >= 2 && hsmName.includes(part.replace(/-/g, ""))) {
          return data;
        }
      }
    }
  }

  // Specific known mappings
  const KNOWN_MAPS: Record<string, string> = {
    "haas_vf-2": "haas vf2",
    "haas_vf-4": "haas vf2", // VF-4 uses same spindle as VF-2
    "haas_umc-750": "haas umc-750 30 hp/12000 rpm direct drive",
    "haas_st-20": "generic lathe", // Use generic lathe as fallback
    "haas_st-20y": "generic lathe",
    "okuma_genos m560-v": "okuma genos m560-v",
    "okuma_lb3000 ex ii my": "okuma space turn lb3000 ex ii",
    "hurco_vmx 30": "hurcovmx30ui",
    "hurco_vm10u": "hurco vm10u",
  };

  const key = `${brandL}_${modelL}`;
  const mappedName = KNOWN_MAPS[key];
  if (mappedName) {
    for (const [hsmName, data] of hsmLookup) {
      if (hsmName.includes(mappedName) || mappedName.includes(hsmName)) {
        return data;
      }
    }
  }

  return null;
}

// ── Main: Generate curves ───────────────────────────────────────────

const curves: MachineTorqueCurve[] = [];
let countHsm = 0, countVerified = 0, countComputed = 0, countSkip = 0;

// Build corrections lookup
const correctionMap = new Map<string, typeof SPINDLE_CORRECTIONS[0]>();
for (const c of SPINDLE_CORRECTIONS) {
  correctionMap.set(`${c.brand.toLowerCase()}::${c.model.toLowerCase()}`, c);
}

for (const machine of EXTENDED_MACHINE_CATALOG) {
  const { brand, model } = machine;

  // Apply spindle corrections if available
  const correction = correctionMap.get(`${brand.toLowerCase()}::${model.toLowerCase()}`);
  const spindle = correction
    ? correction.corrected_spindle
    : machine.spindle;

  const max_rpm = spindle.max_rpm;
  const power_kw = spindle.power_kw;
  const torque_nm = spindle.torque_nm;
  const taper = spindle.taper;
  const catalogBaseRpm = (spindle as any).base_rpm ?? null;
  const machineId = makeId(brand, model);
  const correctionApplied = !!correction;

  // Skip EDM and zero-spindle machines
  if (machine.type === "edm_wire" || machine.type === "edm_sinker" ||
      (max_rpm === 0 && power_kw === 0 && torque_nm === 0)) {
    curves.push({
      machine_id: machineId, brand, model,
      source: "skip", confidence: 0,
      base_speed_rpm: 0, peak_torque_Nm: 0, rated_power_kW: 0, max_rpm: 0,
      drive_type_inferred: "unknown",
      duty_note: "EDM/non-spindle — no torque curve applicable",
      points: [],
    });
    countSkip++;
    continue;
  }

  // Skip implausible data (TIER-C)
  if (torque_nm <= 0 || power_kw <= 0) {
    curves.push({
      machine_id: machineId, brand, model,
      source: "skip", confidence: 0,
      base_speed_rpm: 0, peak_torque_Nm: torque_nm, rated_power_kW: power_kw, max_rpm,
      drive_type_inferred: "unknown",
      duty_note: "Missing torque or power data — needs manufacturer lookup",
      points: [],
    });
    countSkip++;
    continue;
  }

  const computedBase = computeBaseRpm(power_kw, torque_nm);
  if (computedBase > max_rpm * 1.5) {
    // Implausible data
    curves.push({
      machine_id: machineId, brand, model,
      source: "skip", confidence: 0,
      base_speed_rpm: 0, peak_torque_Nm: torque_nm, rated_power_kW: power_kw, max_rpm,
      drive_type_inferred: "unknown",
      duty_note: `Implausible: computed base_rpm=${computedBase} > max_rpm=${max_rpm}`,
      points: [],
    });
    countSkip++;
    continue;
  }

  const driveType = inferDriveType(taper, max_rpm, torque_nm, power_kw, machine.type);

  // Try HSMAdvisor match first (highest confidence)
  const hsmMatch = findHsmMatch(brand, model);
  if (hsmMatch && hsmMatch.power_curve?.length > 2) {
    // Convert HSMAdvisor imperial curve to metric
    const hsmPoints: TorqueCurvePoint[] = hsmMatch.power_curve.map((p: any) => ({
      rpm: Math.round(p.rpm),
      torque_Nm: Math.round(ftlbToNm(p.torque_ftlb) * 100) / 100,
      power_kW: Math.round(hpToKw(p.hp) * 100) / 100,
    }));

    // Find the knee point (last point where torque equals max torque)
    const maxTorque = Math.max(...hsmPoints.map(p => p.torque_Nm));
    let baseRpm = hsmPoints[0].rpm;
    for (let i = 1; i < hsmPoints.length; i++) {
      if (Math.abs(hsmPoints[i].torque_Nm - maxTorque) < 0.1) {
        baseRpm = hsmPoints[i].rpm;
      }
    }

    curves.push({
      machine_id: machineId, brand, model,
      source: "hsm_advisor", confidence: 0.95,
      base_speed_rpm: baseRpm,
      peak_torque_Nm: maxTorque,
      rated_power_kW: hpToKw(hsmMatch.max_hp),
      max_rpm: Math.round(hsmMatch.max_rpm),
      drive_type_inferred: driveType,
      duty_note: `HSMAdvisor ground truth — ${hsmMatch.power_curve.length} data points`,
      points: hsmPoints,
    });
    countHsm++;
    continue;
  }

  // Use catalog base_rpm if energy check passes (or correction provides base_rpm)
  if (catalogBaseRpm && catalogBaseRpm > 0 && energyCheck(torque_nm, catalogBaseRpm, power_kw)) {
    const points = generateTwoRegionCurve(catalogBaseRpm, max_rpm, torque_nm, power_kw);
    const corrNote = correctionApplied
      ? `Corrected from manufacturer data: ${correction!.source}`
      : "Catalog base_rpm passes energy conservation check (±15%)";
    curves.push({
      machine_id: machineId, brand, model,
      source: correctionApplied ? "catalog_verified" : "catalog_verified",
      confidence: correctionApplied ? correction!.confidence : 0.85,
      base_speed_rpm: catalogBaseRpm,
      peak_torque_Nm: torque_nm,
      rated_power_kW: power_kw,
      max_rpm,
      drive_type_inferred: driveType,
      duty_note: corrNote,
      points,
    });
    countVerified++;
    continue;
  }

  // Compute base_rpm from P=Tω (most common path — TIER-B)
  const baseRpm = computedBase;
  if (baseRpm > 0 && baseRpm <= max_rpm) {
    const points = generateTwoRegionCurve(baseRpm, max_rpm, torque_nm, power_kw);
    curves.push({
      machine_id: machineId, brand, model,
      source: "computed_from_PT", confidence: 0.70,
      base_speed_rpm: baseRpm,
      peak_torque_Nm: torque_nm,
      rated_power_kW: power_kw,
      max_rpm,
      drive_type_inferred: driveType,
      duty_note: catalogBaseRpm
        ? `Catalog base_rpm=${catalogBaseRpm} failed energy check — recomputed to ${baseRpm}`
        : "Computed from P_kW × 9549 / T_Nm",
      points,
    });
    countComputed++;
    continue;
  }

  // Fallback: skip (shouldn't normally reach here)
  curves.push({
    machine_id: machineId, brand, model,
    source: "skip", confidence: 0,
    base_speed_rpm: 0, peak_torque_Nm: torque_nm, rated_power_kW: power_kw, max_rpm,
    drive_type_inferred: driveType,
    duty_note: "Unable to compute valid torque curve",
    points: [],
  });
  countSkip++;
}

// ── Validation ──────────────────────────────────────────────────────

let validationFails = 0;
for (const c of curves) {
  if (c.points.length < 2) continue;
  // Check energy conservation at each point
  for (const p of c.points) {
    if (p.rpm <= 0) continue;
    const computedP = (p.torque_Nm * 2 * Math.PI * p.rpm) / 60000;
    const tolerance = c.source === "hsm_advisor" ? 0.20 : 0.05; // HSM data has measurement noise
    if (Math.abs(computedP - p.power_kW) / Math.max(p.power_kW, 0.01) > tolerance) {
      // Allow it at the base_speed transition point
      if (Math.abs(p.rpm - c.base_speed_rpm) < c.base_speed_rpm * 0.05) continue;
      validationFails++;
      if (validationFails <= 5) {
        console.log(`  WARN: ${c.brand} ${c.model} @ ${p.rpm}RPM: P_computed=${Math.round(computedP*100)/100}kW vs P_stated=${p.power_kW}kW`);
      }
    }
  }
}

// ── Output ──────────────────────────────────────────────────────────

console.log("=== TORQUE CURVE GENERATION ===");
console.log(`Total machines: ${EXTENDED_MACHINE_CATALOG.length}`);
console.log(`HSMAdvisor matched:     ${countHsm}`);
console.log(`Catalog verified:       ${countVerified}`);
console.log(`Computed from P=Tω:     ${countComputed}`);
console.log(`Skipped (EDM/bad data): ${countSkip}`);
console.log(`Validation warnings:    ${validationFails}`);

// Write TypeScript data file
const tsOutput = `/**
 * Machine Torque Curves — Auto-generated by scripts/generate-torque-curves.ts
 * Generated: ${new Date().toISOString()}
 *
 * Sources: HSMAdvisor power curves (${countHsm}), catalog base_rpm (${countVerified}),
 *          computed from P=Tω (${countComputed}), skipped (${countSkip})
 *
 * Total: ${curves.length} machines, ${curves.filter(c => c.points.length > 0).length} with valid curves
 */

export interface TorqueCurvePoint {
  rpm: number;
  torque_Nm: number;
  power_kW: number;
}

export interface MachineTorqueCurve {
  machine_id: string;
  brand: string;
  model: string;
  source: "hsm_advisor" | "catalog_verified" | "computed_from_PT" | "taper_heuristic" | "skip";
  confidence: number;
  base_speed_rpm: number;
  peak_torque_Nm: number;
  rated_power_kW: number;
  max_rpm: number;
  drive_type_inferred: "belt" | "direct" | "gear" | "integral" | "unknown";
  duty_note?: string;
  points: TorqueCurvePoint[];
}

/** Lookup map: machine_id → torque curve data */
export const MACHINE_TORQUE_CURVES: Record<string, MachineTorqueCurve> = {
${(() => {
  const seen = new Set<string>();
  return curves
    .filter(c => c.points.length > 0)
    .map(c => {
      let id = c.machine_id;
      if (seen.has(id)) {
        let suffix = 2;
        while (seen.has(`${id}_${suffix}`)) suffix++;
        id = `${id}_${suffix}`;
        c.machine_id = id;
      }
      seen.add(id);
      return `  "${id}": ${JSON.stringify(c)},`;
    })
    .join("\n");
})()}
};

/** Get torque curve by brand + model (fuzzy match) */
export function getTorqueCurve(brand: string, model: string): MachineTorqueCurve | undefined {
  const id = \`\${brand}_\${model}\`.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return MACHINE_TORQUE_CURVES[id];
}

/** Get available torque at a specific RPM by interpolating the curve */
export function torqueAtRpm(curve: MachineTorqueCurve, rpm: number): { torque_Nm: number; power_kW: number; region: string } {
  if (curve.points.length === 0) {
    return { torque_Nm: 0, power_kW: 0, region: "no_data" };
  }

  if (rpm <= 0) {
    return { torque_Nm: curve.peak_torque_Nm, power_kW: 0, region: "stall" };
  }

  // Find bounding points for interpolation
  const pts = curve.points;
  if (rpm <= pts[0].rpm) {
    return { torque_Nm: pts[0].torque_Nm, power_kW: pts[0].power_kW, region: "constant_torque" };
  }
  if (rpm >= pts[pts.length - 1].rpm) {
    // Field weakening beyond max RPM
    const lastPt = pts[pts.length - 1];
    const ratio = lastPt.rpm / rpm;
    return {
      torque_Nm: Math.round(lastPt.torque_Nm * ratio * 100) / 100,
      power_kW: Math.round(lastPt.power_kW * ratio * 100) / 100,
      region: "field_weakening",
    };
  }

  // Linear interpolation between bounding points
  for (let i = 0; i < pts.length - 1; i++) {
    if (rpm >= pts[i].rpm && rpm <= pts[i + 1].rpm) {
      const frac = (rpm - pts[i].rpm) / (pts[i + 1].rpm - pts[i].rpm);
      const torque = pts[i].torque_Nm + frac * (pts[i + 1].torque_Nm - pts[i].torque_Nm);
      const power = pts[i].power_kW + frac * (pts[i + 1].power_kW - pts[i].power_kW);
      const region = rpm <= curve.base_speed_rpm ? "constant_torque" : "constant_power";
      return {
        torque_Nm: Math.round(torque * 100) / 100,
        power_kW: Math.round(power * 100) / 100,
        region,
      };
    }
  }

  return { torque_Nm: 0, power_kW: 0, region: "error" };
}

/** Summary stats */
export const TORQUE_CURVE_STATS = {
  total: ${curves.length},
  with_curves: ${curves.filter(c => c.points.length > 0).length},
  hsm_advisor: ${countHsm},
  catalog_verified: ${countVerified},
  computed: ${countComputed},
  skipped: ${countSkip},
  generated: "${new Date().toISOString()}",
};
`;

const tsOutputPath = path.resolve(__dirname, "../src/data/machine-torque-curves.ts");
writeFileSync(tsOutputPath, tsOutput);
console.log(`\nTypeScript output: ${tsOutputPath}`);

// Also write JSON for state tracking
const jsonOutputPath = path.resolve(__dirname, "../../state/torque-curves-generated.json");
writeFileSync(jsonOutputPath, JSON.stringify({
  generated: new Date().toISOString(),
  stats: { total: curves.length, hsm: countHsm, verified: countVerified, computed: countComputed, skipped: countSkip },
  validation_warnings: validationFails,
}, null, 2));
console.log(`JSON stats: ${jsonOutputPath}`);
