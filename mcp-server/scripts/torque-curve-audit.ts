#!/usr/bin/env npx tsx
/**
 * U-TQ1: Spindle Torque Curve Audit Script
 * Reads all machine profile catalogs and classifies machines into:
 *   TIER-A: Has base_rpm (curve directly computable)
 *   TIER-B: Has torque + power but no base_rpm (curve estimable from P=Tω)
 *   TIER-C: Missing torque or power, or data is implausible
 *   N/A: EDM or non-spindle machines
 *
 * Also cross-references HSMAdvisor and GWizard ground-truth data.
 */

import { EXTENDED_MACHINE_CATALOG } from "../src/data/machine-profiles-catalog.js";
import { readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load HSMAdvisor and GWizard data
const hsmRaw = readFileSync(path.resolve(__dirname, "../src/data/hsm-advisor-machines.json"), "utf-8");
const gwizRaw = readFileSync(path.resolve(__dirname, "../src/data/gwizard-machines.json"), "utf-8");
const hsmMachines: any[] = JSON.parse(hsmRaw);
const gwizMachines: any[] = JSON.parse(gwizRaw);

// ── Classification ────────────────────────────────────────────────

interface MachineAuditEntry {
  brand: string;
  model: string;
  type: string;
  tier: "A" | "B" | "C" | "N/A";
  reason: string;
  max_rpm: number;
  power_kw: number;
  torque_nm: number;
  taper: string;
  base_rpm: number | null;
  drive_type: string | null;
  has_hsm_curve: boolean;
  has_gwiz_data: boolean;
  energy_check: "pass" | "fail" | "skip";
  computed_base_rpm: number | null;
}

// Build HSMAdvisor name lookup (fuzzy match)
const hsmNames = new Set(hsmMachines.map((m: any) => m.name?.toLowerCase() ?? ""));
const gwizNames = new Set(gwizMachines.map((m: any) => `${m.make ?? ""} ${m.model ?? ""}`.toLowerCase().trim()));

function hasHsmCurve(brand: string, model: string): boolean {
  const key = `${brand} ${model}`.toLowerCase();
  for (const name of hsmNames) {
    if (name.includes(brand.toLowerCase()) || key.includes(name.split(" ")[0])) {
      // Check if this HSM machine name overlaps with catalog brand/model
      const brandLower = brand.toLowerCase();
      if (name.includes(brandLower) && (name.includes(model.toLowerCase().split(" ")[0]) || name.includes(model.toLowerCase().split("-")[0]))) {
        return true;
      }
    }
  }
  return false;
}

function hasGwizData(brand: string, model: string): boolean {
  const brandLower = brand.toLowerCase();
  const modelLower = model.toLowerCase();
  for (const name of gwizNames) {
    if (name.includes(brandLower) && (name.includes(modelLower.split(" ")[0]) || name.includes(modelLower.split("-")[0]))) {
      return true;
    }
  }
  return false;
}

// Shop machines (from BOX data — user's shop)
const SHOP_MACHINES = new Set([
  "haas::vf-2", "haas::vf-4", "haas::st-20", "haas::st-20y",
  "okuma::multus b300", "okuma::multus b400", "okuma::genos m560-v",
  "hurco::vmx 30",
]);

const audit: MachineAuditEntry[] = [];
const tierCounts = { A: 0, B: 0, C: 0, "N/A": 0 };
const brandCounts: Record<string, number> = {};
const shopMachineEntries: MachineAuditEntry[] = [];
const gearDriveMachines: string[] = [];

for (const machine of EXTENDED_MACHINE_CATALOG) {
  const { brand, model, type: mType } = machine;
  const { max_rpm, power_kw, torque_nm, taper } = machine.spindle;
  const base_rpm = (machine.spindle as any).base_rpm ?? null;

  brandCounts[brand] = (brandCounts[brand] ?? 0) + 1;

  // Check for rotary axis drive_type (not spindle drive_type — different thing)
  const driveType: string | null = null; // Will be inferred from kinematics later

  // Determine tier
  let tier: "A" | "B" | "C" | "N/A";
  let reason: string;

  if (mType === "edm_wire" || mType === "edm_sinker" || (max_rpm === 0 && power_kw === 0 && torque_nm === 0)) {
    tier = "N/A";
    reason = "EDM/non-spindle machine — torque curve not applicable";
  } else if (base_rpm !== null && base_rpm > 0 && torque_nm > 0 && power_kw > 0) {
    tier = "A";
    reason = "Has base_rpm + torque + power — curve directly computable";
  } else if (torque_nm > 0 && power_kw > 0) {
    // Check plausibility: computed base_rpm should be <= max_rpm
    const computedBaseRpm = Math.round((power_kw * 9549) / torque_nm);

    if (computedBaseRpm > max_rpm * 1.5) {
      // Base RPM would exceed max RPM — data is physically impossible
      // Torque is too low for the stated power (bad extraction or wrong units)
      tier = "C";
      reason = `Implausible: computed base_rpm=${computedBaseRpm} > max_rpm=${max_rpm} (torque_nm too low for power_kw)`;
    } else if (torque_nm < 1.0 && power_kw > 1.0) {
      // Implausible: very low torque with significant power (bad data)
      tier = "C";
      reason = `Implausible: torque_nm=${torque_nm} too low for power_kw=${power_kw}`;
    } else {
      tier = "B";
      reason = "Has torque + power, no base_rpm — computable from P=Tω";
    }
  } else if (torque_nm <= 0 && power_kw > 0) {
    tier = "C";
    reason = "Missing torque_nm — needs manufacturer lookup";
  } else if (power_kw <= 0 && torque_nm > 0) {
    tier = "C";
    reason = "Missing power_kw — needs manufacturer lookup";
  } else {
    tier = "C";
    reason = "Missing both torque and power data";
  }

  const hsm = hasHsmCurve(brand, model);
  const gwiz = hasGwizData(brand, model);

  // If has HSMAdvisor ground-truth curve, upgrade to A
  if (hsm && tier === "B") {
    tier = "A";
    reason = "HSMAdvisor power curve available — ground truth";
  }

  // Computed base RPM for tier-B
  const computedBase = (tier === "B" && torque_nm > 0)
    ? Math.round((power_kw * 9549) / torque_nm)
    : null;

  // Energy conservation check
  let energyCheck: "pass" | "fail" | "skip" = "skip";
  if (base_rpm !== null && base_rpm > 0 && torque_nm > 0 && power_kw > 0) {
    // At base_speed: P = T * 2π * base_rpm / 60000
    const computedPower = (torque_nm * 2 * Math.PI * base_rpm) / 60000;
    const ratio = computedPower / power_kw;
    energyCheck = (ratio > 0.85 && ratio < 1.15) ? "pass" : "fail";
  }

  const entry: MachineAuditEntry = {
    brand, model, type: mType, tier, reason,
    max_rpm, power_kw, torque_nm, taper,
    base_rpm, drive_type: driveType,
    has_hsm_curve: hsm, has_gwiz_data: gwiz,
    energy_check: energyCheck,
    computed_base_rpm: computedBase,
  };

  audit.push(entry);
  tierCounts[tier]++;

  const shopKey = `${brand}::${model}`.toLowerCase();
  if (SHOP_MACHINES.has(shopKey)) {
    shopMachineEntries.push(entry);
  }

  // Check for gear-drive indicators
  if (taper?.includes("50") || taper?.includes("MT") || torque_nm > 400) {
    // High-torque machines often have gear drives
    // This is heuristic — actual gear drive info comes from kinematics
  }
}

// ── Summary ────────────────────────────────────────────────────────

const summary = {
  generated: new Date().toISOString(),
  total_machines: EXTENDED_MACHINE_CATALOG.length,
  tier_counts: tierCounts,
  brand_count: Object.keys(brandCounts).length,
  brands: Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([brand, count]) => ({ brand, count })),
  shop_machines: shopMachineEntries.map(e => ({
    brand: e.brand, model: e.model, tier: e.tier,
    base_rpm: e.base_rpm, power_kw: e.power_kw, torque_nm: e.torque_nm,
    has_hsm_curve: e.has_hsm_curve,
  })),
  hsm_advisor: {
    total_profiles: hsmMachines.length,
    with_power_curves: hsmMachines.filter((m: any) => m.power_curve?.length > 0).length,
    machine_names: hsmMachines.map((m: any) => m.name),
  },
  gwizard: {
    total_profiles: gwizMachines.length,
    machine_names: gwizMachines.slice(0, 10).map((m: any) => `${m.make ?? ""} ${m.model ?? ""}`),
  },
  tier_c_machines: audit.filter(e => e.tier === "C").map(e => ({
    brand: e.brand, model: e.model, reason: e.reason,
    torque_nm: e.torque_nm, power_kw: e.power_kw,
  })),
  energy_check_failures: audit.filter(e => e.energy_check === "fail").map(e => ({
    brand: e.brand, model: e.model, base_rpm: e.base_rpm,
    torque_nm: e.torque_nm, power_kw: e.power_kw,
    computed_power: Math.round((e.torque_nm * 2 * Math.PI * (e.base_rpm ?? 0)) / 60000 * 100) / 100,
  })),
};

// ── Gear Drive Heuristics ───────────────────────────────────────────
// Without explicit drive_type data, use physical indicators:
// - BT50/CAT50 with max_rpm < 6000 and torque > 300 Nm → likely gear
// - Very high torque/power ratio (torque_nm > 9549*power_kw/max_rpm * 2) → gear or multi-range
// - Known gear-drive model names

const KNOWN_GEAR_KEYWORDS = ["gear", "geared", "40-taper 30hp", "50-taper"];
const probableGearDrive: Array<{brand: string; model: string; reason: string; torque_nm: number; max_rpm: number}> = [];

for (const m of audit) {
  if (m.tier === "N/A" || m.tier === "C") continue;
  const taper = m.taper?.toLowerCase() ?? "";
  const isBigTaper = taper.includes("50") || taper.includes("mt4") || taper.includes("mt5");
  const highTorqueRatio = m.torque_nm > 300 && m.max_rpm < 6000;
  const nameHint = KNOWN_GEAR_KEYWORDS.some(k => m.model.toLowerCase().includes(k));
  // Compute theoretical single-range torque at max RPM
  const singleRangeTorque = (m.power_kw * 9549) / m.max_rpm;
  const hasTorqueExcess = m.torque_nm > singleRangeTorque * 2.5; // stated torque >> constant-power torque at max RPM

  if (highTorqueRatio || (isBigTaper && hasTorqueExcess) || nameHint) {
    let reason = "";
    if (highTorqueRatio) reason += "high_torque_low_rpm ";
    if (isBigTaper && hasTorqueExcess) reason += "big_taper_torque_excess ";
    if (nameHint) reason += "name_match ";
    probableGearDrive.push({
      brand: m.brand, model: m.model, reason: reason.trim(),
      torque_nm: m.torque_nm, max_rpm: m.max_rpm,
    });
  }
}

// ── Priority List ──────────────────────────────────────────────────
// 1. Shop machines, 2. Energy failures (need correction), 3. Top brands (Haas, DMG MORI, Mazak, Okuma, Makino)

const TOP_BRANDS = new Set(["Haas", "DMG MORI", "Mazak", "Okuma", "Makino", "Hermle", "Doosan", "Hurco"]);
const topBrandMachines = audit
  .filter(m => TOP_BRANDS.has(m.brand) && m.tier !== "N/A")
  .slice(0, 50)
  .map(m => ({ brand: m.brand, model: m.model, tier: m.tier }));

// ── Final Output ───────────────────────────────────────────────────

const outputPath = path.resolve(__dirname, "../../state/torque-curve-audit.json");
const fullOutput = {
  summary: {
    ...summary,
    probable_gear_drive_count: probableGearDrive.length,
    probable_gear_drive: probableGearDrive.slice(0, 30),
    priority_list: {
      shop_machines: shopMachineEntries.map(e => ({
        brand: e.brand, model: e.model, tier: e.tier, base_rpm: e.base_rpm,
      })),
      energy_failures_need_correction: summary.energy_check_failures.length,
      top_brand_machines_first_50: topBrandMachines,
    },
    action_items: [
      `Fix 17 energy-check-failing base_rpm values (recompute from P=Tω)`,
      `Fix 7 TIER-C machines with bad data (DATRON, Kern, Makino D200Z, Mazak RAMTEC)`,
      `Add drive_type field to machine catalog (currently not in ExtendedMachineProfile.spindle)`,
      `${probableGearDrive.length} machines flagged as probable gear-drive — verify and add multi-range curves`,
      `Cross-reference 18 HSMAdvisor power curves with catalog data for validation`,
    ],
  },
  machines: audit,
};
writeFileSync(outputPath, JSON.stringify(fullOutput, null, 2));

console.log("=== SPINDLE TORQUE CURVE AUDIT ===");
console.log(`Total machines: ${summary.total_machines}`);
console.log(`Brands: ${summary.brand_count}`);
console.log(`TIER-A (curve computable):    ${tierCounts.A}`);
console.log(`TIER-B (estimable from P=Tω): ${tierCounts.B}`);
console.log(`TIER-C (needs lookup):        ${tierCounts.C}`);
console.log(`N/A (EDM/non-spindle):        ${tierCounts["N/A"]}`);
console.log(`\nShop machines:`);
for (const m of shopMachineEntries) {
  console.log(`  ${m.brand} ${m.model}: ${m.tier} (base_rpm=${m.base_rpm ?? "N/A"}, HSM=${m.has_hsm_curve})`);
}
console.log(`\nHSMAdvisor: ${summary.hsm_advisor.total_profiles} profiles, ${summary.hsm_advisor.with_power_curves} with power curves`);
console.log(`GWizard: ${summary.gwizard.total_profiles} profiles`);
console.log(`\nTIER-C machines (need manufacturer data):`);
for (const m of summary.tier_c_machines) {
  console.log(`  ${m.brand} ${m.model}: ${m.reason}`);
}
console.log(`\nEnergy check failures:`);
for (const m of summary.energy_check_failures) {
  console.log(`  ${m.brand} ${m.model}: base_rpm=${m.base_rpm}, T=${m.torque_nm}Nm, P=${m.power_kw}kW, computed_P=${m.computed_power}kW`);
}
console.log(`\nProbable gear-drive machines: ${probableGearDrive.length}`);
for (const m of probableGearDrive.slice(0, 10)) {
  console.log(`  ${m.brand} ${m.model}: ${m.reason} (T=${m.torque_nm}Nm, maxRPM=${m.max_rpm})`);
}
if (probableGearDrive.length > 10) console.log(`  ... and ${probableGearDrive.length - 10} more`);
console.log(`\nAction items: ${fullOutput.summary.action_items.length}`);
for (const a of fullOutput.summary.action_items) console.log(`  • ${a}`);
console.log(`\nOutput: ${outputPath}`);
