/**
 * R3-MS4-T1: Batch Campaign Runner
 *
 * Orchestrates batch execution of CampaignEngine across the full material
 * library (6,346 materials across 7 ISO groups). Generates synthetic operation
 * results using simplified Kienzle/Taylor models inline, feeds them to
 * createCampaign(), and persists per-batch results to campaign-results/.
 *
 * Usage:
 *   npx tsx tests/r3/batch-campaign-runner.ts
 *   npx tsx tests/r3/batch-campaign-runner.ts --resume   (skip completed batches)
 */

import * as fs from "fs";
import * as path from "path";
import {
  createCampaign,
  type CampaignConfig,
  type CampaignMaterial,
  type CampaignOperation,
  type OperationResult,
  type CampaignResult,
} from "../../src/engines/CampaignEngine.js";

// ============================================================
// === Constants
// ============================================================

const BATCH_SIZE = 10;
const MATERIALS_BASE = "C:/PRISM/data/materials";
const RESULTS_DIR = path.join(import.meta.dirname, "campaign-results");
const STATE_FILE = path.join(import.meta.dirname, "CAMPAIGN_STATE.json");

/** ISO group directories mapped to their canonical single-letter group code */
const ISO_GROUP_DIRS: Record<string, string> = {
  P_STEELS: "P",
  M_STAINLESS: "M",
  K_CAST_IRON: "K",
  N_NONFERROUS: "N",
  S_SUPERALLOYS: "S",
  H_HARDENED: "H",
  X_SPECIALTY: "X",
};

/** Default physics constants per ISO group (X falls back to P defaults) */
const ISO_DEFAULTS: Record<string, {
  kc1_1: number; mc: number; taylorC: number; taylorN: number; vc: number;
}> = {
  P: { kc1_1: 1800, mc: 0.25, taylorC: 300, taylorN: 0.25, vc: 180 },
  M: { kc1_1: 2200, mc: 0.26, taylorC: 200, taylorN: 0.22, vc: 120 },
  K: { kc1_1: 1100, mc: 0.24, taylorC: 400, taylorN: 0.27, vc: 200 },
  N: { kc1_1: 700,  mc: 0.23, taylorC: 800, taylorN: 0.30, vc: 300 },
  S: { kc1_1: 2800, mc: 0.28, taylorC: 100, taylorN: 0.20, vc:  50 },
  H: { kc1_1: 3200, mc: 0.30, taylorC: 150, taylorN: 0.22, vc:  80 },
  X: { kc1_1: 1800, mc: 0.25, taylorC: 300, taylorN: 0.25, vc: 180 },
};

/** Standard operations template (cutting_speed_m_min filled per ISO group at runtime) */
// prettier-ignore
const STANDARD_OPS_TEMPLATE: CampaignOperation[] = [
  { sequence: 1, feature: "face",   tool_diameter_mm: 50,  tool_type: "facemill",    cutting_speed_m_min: 0, feed_per_tooth_mm: 0.15, axial_depth_mm: 2,  radial_depth_mm: 40,  coolant: "flood" },
  { sequence: 2, feature: "pocket", tool_diameter_mm: 16,  tool_type: "endmill",     cutting_speed_m_min: 0, feed_per_tooth_mm: 0.08, axial_depth_mm: 5,  radial_depth_mm: 8,   coolant: "flood" },
  { sequence: 3, feature: "drill",  tool_diameter_mm: 8.5, tool_type: "drill",       cutting_speed_m_min: 0, feed_per_tooth_mm: 0.12, axial_depth_mm: 25,                        coolant: "tsc"   },
  { sequence: 4, feature: "thread", tool_diameter_mm: 12,  tool_type: "thread_mill", cutting_speed_m_min: 0, feed_per_tooth_mm: 0.05, axial_depth_mm: 15,                        coolant: "flood" },
  { sequence: 5, feature: "bore",   tool_diameter_mm: 20,  tool_type: "boring_bar",  cutting_speed_m_min: 0, feed_per_tooth_mm: 0.10, axial_depth_mm: 30, radial_depth_mm: 0.5, coolant: "flood" },
];

const MACHINE = { name: "Haas VF-4SS", max_spindle_rpm: 12000, max_power_kw: 22.4, max_torque_nm: 122 };
const CONSTRAINTS = { max_tool_changes: 10, max_cycle_time_min: 60, target_tool_life_min: 15 };

// ============================================================
// === Types
// ============================================================

interface CampaignState {
  campaign_id: string; started_at: string; total_materials: number; total_batches: number;
  completed_batch_ids: string[]; current_batch: string | null; error_count: number;
  quarantined_materials: string[]; pass_count: number; warning_count: number;
  fail_count: number; last_update: string;
}

interface LoadedMaterial {
  id: string;
  name: string;
  iso_group: string;
  hardness_hb?: number;
  kc1_1?: number;
  mc?: number;
  taylorC?: number;
  taylorN?: number;
}

// ============================================================
// === Material Loading
// ============================================================

/**
 * Reads all JSON files from the materials registry and extracts material data.
 * Handles hardness from mechanical.hardness.brinell and physics from kienzle/taylor.
 */
function loadMaterialsFromRegistry(): LoadedMaterial[] {
  const materials: LoadedMaterial[] = [];
  const seen = new Set<string>();

  for (const [dirName, isoCode] of Object.entries(ISO_GROUP_DIRS)) {
    const dirPath = path.join(MATERIALS_BASE, dirName);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
      } catch {
        continue;
      }

      const rawMaterials = parsed.materials as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(rawMaterials)) continue;

      for (let i = 0; i < rawMaterials.length; i++) {
        const m = rawMaterials[i];
        const name = (m.name as string) ?? `${dirName}_${file}_${i}`;
        // Build a stable ID: slugify the name + index
        const baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        let id = baseId;
        let suffix = 0;
        while (seen.has(id)) {
          suffix++;
          id = `${baseId}_${suffix}`;
        }
        seen.add(id);

        // Resolve ISO group from material field first, fall back to dir code
        const rawGroup = ((m.iso_group as string) ?? isoCode).toUpperCase().charAt(0);
        const isoGroup = ["P", "M", "K", "N", "S", "H"].includes(rawGroup) ? rawGroup : "P";

        // Hardness: mechanical.hardness.brinell or physical.hardness.brinell
        let hardness: number | undefined;
        const mech = m.mechanical as Record<string, unknown> | undefined;
        const mechHard = mech?.hardness as Record<string, unknown> | undefined;
        if (typeof mechHard?.brinell === "number") hardness = mechHard.brinell;
        if (hardness === undefined) {
          const phys = m.physical as Record<string, unknown> | undefined;
          const physHard = phys?.hardness as Record<string, unknown> | undefined;
          if (typeof physHard?.brinell === "number") hardness = physHard.brinell;
        }

        // Physics: kienzle and taylor constants
        const kienzle = m.kienzle as Record<string, unknown> | undefined;
        const taylor = m.taylor as Record<string, unknown> | undefined;

        materials.push({
          id,
          name,
          iso_group: isoGroup,
          hardness_hb: hardness !== undefined ? Math.round(hardness) : undefined,
          kc1_1: typeof kienzle?.kc1_1 === "number" ? kienzle.kc1_1 : undefined,
          mc: typeof kienzle?.mc === "number" ? kienzle.mc : undefined,
          taylorC: typeof taylor?.C === "number" ? taylor.C : undefined,
          taylorN: typeof taylor?.n === "number" ? taylor.n : undefined,
        });
      }
    }
  }

  return materials;
}

// ============================================================
// === Operation Result Generation (Simplified Physics)
// ============================================================

/**
 * Generates OperationResult[] for a single material using simplified
 * Kienzle/Taylor models. No external imports — all computation inline.
 */
function generateOperationResults(
  material: LoadedMaterial,
  ops: CampaignOperation[],
): OperationResult[] {
  const defaults = ISO_DEFAULTS[material.iso_group] ?? ISO_DEFAULTS["P"];
  // Material-specific Kienzle constants used when available; Taylor uses ISO group defaults
  // for stable predictions (material Taylor C/n are calibrated for specific tool grades).
  const kc1_1 = material.kc1_1 ?? defaults.kc1_1;
  const mc = material.mc ?? defaults.mc;
  const taylorC = defaults.taylorC;
  const taylorN = defaults.taylorN;
  const vc = defaults.vc;

  return ops.map((op): OperationResult => {
    const D = op.tool_diameter_mm;
    const fz = op.feed_per_tooth_mm ?? 0.1;
    const ap = op.axial_depth_mm ?? D * 0.5;
    const ae = op.radial_depth_mm ?? D * 0.3;
    // Drills and boring bars have 2 flutes; facemills/thread mills have more
    const z = op.tool_type === "facemill" ? 6 : op.tool_type === "thread_mill" ? 3 : 2;
    const re = op.tool_type === "endmill" ? 0.4 : 0.8;

    // RPM = (Vc × 1000) / (π × D)
    const rpm = (vc * 1000) / (Math.PI * D);

    // Feed rate mm/min = RPM × fz × z
    const feedRate = rpm * fz * z;

    // MRR cm³/min = (feed_rate × ap × ae) / 1000
    const mrr = (feedRate * ap * ae) / 1000;

    // Kienzle specific cutting force (N/mm²): kc = kc1_1 × h^(-mc), h = fz (undeformed chip thickness)
    // Total tangential force (N): Fc = kc × ap × h  (ap = axial depth = chip width b)
    const h = Math.max(fz, 0.001);
    const kc = kc1_1 * Math.pow(h, -mc);
    const fc = kc * ap * h; // = kc1_1 × h^(1-mc) × ap

    // Power kW = Fc × Vc / (60 × 1000)
    const power = (fc * vc) / (60 * 1000);

    // Tool life min: T = (C / Vc)^(1/n)  [Taylor equation, ISO group defaults]
    const toolLife = Math.pow(taylorC / vc, 1 / taylorN);

    // Cycle time min = volume / (MRR cm³/min)  (convert MRR to mm³/min: ×1000)
    const volume = op.volume_mm3 ?? ap * (ae > 0 ? ae : D * 0.5) * D * 10;
    const safetyMrr = mrr > 0 ? mrr : 0.001;
    const cycleTime = volume / (safetyMrr * 1000);

    // Surface finish Ra μm = fz² / (8 × re) × 1000  (geometric model)
    const surfaceFinish = (fz * fz) / (8 * re) * 1000;

    const warnings: string[] = [];
    if (rpm > 12000) warnings.push(`RPM ${Math.round(rpm)} exceeds machine max 12000`);
    if (power > 22.4) warnings.push(`Power ${power.toFixed(1)} kW exceeds machine rating 22.4 kW`);
    if (toolLife < 15) warnings.push(`Tool life ${toolLife.toFixed(1)} min below target 15 min`);

    return {
      sequence: op.sequence,
      feature: op.feature,
      cutting_speed_m_min: vc,
      feed_rate_mm_min: Math.round(feedRate * 10) / 10,
      spindle_rpm: Math.round(rpm),
      mrr_cm3_min: Math.round(mrr * 100) / 100,
      cutting_force_n: Math.round(fc),
      tool_life_min: Math.round(toolLife * 100) / 100,
      cycle_time_min: Math.round(cycleTime * 1000) / 1000,
      surface_finish_ra: Math.round(surfaceFinish * 1000) / 1000,
      power_kw: Math.round(power * 100) / 100,
      warnings,
    };
  });
}

// ============================================================
// === Batch Execution
// ============================================================

/**
 * Runs a single campaign batch through createCampaign() and returns the result.
 * Materials with >2 operation failures are quarantined before submission.
 */
function runBatch(
  batchId: string,
  materials: LoadedMaterial[],
  ops: CampaignOperation[],
): { result: CampaignResult; quarantined: string[] } {
  const campaignMaterials: CampaignMaterial[] = [];
  const operationResults: OperationResult[][] = [];
  const quarantined: string[] = [];

  for (const mat of materials) {
    let opResults: OperationResult[];
    let failCount = 0;

    try {
      opResults = generateOperationResults(mat, ops);
      failCount = opResults.filter((r) => r.warnings.length > 2).length;
    } catch (err) {
      // Complete failure for this material — quarantine immediately
      quarantined.push(mat.id);
      continue;
    }

    // Quarantine protocol: >2 operation failures
    if (failCount > 2) {
      quarantined.push(mat.id);
      continue;
    }

    campaignMaterials.push({
      id: mat.id,
      name: mat.name,
      iso_group: mat.iso_group,
      hardness_hb: mat.hardness_hb,
    });
    operationResults.push(opResults);
  }

  if (campaignMaterials.length === 0) {
    // All materials were quarantined — return a synthetic empty result
    return {
      result: {
        name: batchId,
        created_at: new Date().toISOString(),
        material_count: 0,
        results: [],
        summary: {
          total_pass: 0, total_warning: 0, total_fail: 0, total_quarantine: quarantined.length,
          avg_cycle_time_min: 0, avg_safety_score: 0, quarantined_materials: quarantined,
        },
        warnings: ["All materials in batch were quarantined before campaign creation"],
      },
      quarantined,
    };
  }

  const config: CampaignConfig = {
    name: batchId,
    materials: campaignMaterials,
    operations: ops,
    machine: MACHINE,
    constraints: CONSTRAINTS,
  };

  const result = createCampaign(config, operationResults);
  return { result, quarantined };
}

// ============================================================
// === Results Persistence
// ============================================================

function saveBatchResults(batchId: string, result: CampaignResult): void {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  const filePath = path.join(RESULTS_DIR, `${batchId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf8");
}

/** Writes CAMPAIGN_STATE.json atomically using a temp-file rename pattern. */
function updateState(state: CampaignState): void {
  const tmp = STATE_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tmp, STATE_FILE);
}

function loadState(): CampaignState | null {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as CampaignState;
  } catch {
    return null;
  }
}

// === Helpers ============================================================

function formatBatchId(index: number): string {
  return `batch_${String(index).padStart(4, "0")}`;
}

function buildOpsForGroup(isoGroup: string): CampaignOperation[] {
  const vc = (ISO_DEFAULTS[isoGroup] ?? ISO_DEFAULTS["P"]).vc;
  return STANDARD_OPS_TEMPLATE.map((op) => ({
    ...op,
    cutting_speed_m_min: vc,
  }));
}

// ============================================================
// === Main Orchestrator
// ============================================================

async function main(): Promise<void> {
  const resume = process.argv.includes("--resume");

  console.log("=== PRISM Batch Campaign Runner R3-MS4-T1 ===");
  console.log(`Mode: ${resume ? "resume" : "fresh start"}`);
  console.log("Loading materials from registry...");

  const allMaterials = loadMaterialsFromRegistry();
  const totalMaterials = allMaterials.length;
  const totalBatches = Math.ceil(totalMaterials / BATCH_SIZE);

  console.log(`Loaded ${totalMaterials} materials — ${totalBatches} batches of ${BATCH_SIZE}`);

  // Load or create state
  let state: CampaignState;
  const existingState = loadState();

  if (resume && existingState) {
    state = existingState;
    console.log(`Resuming campaign ${state.campaign_id} — ${state.completed_batch_ids.length}/${totalBatches} batches already done`);
  } else {
    state = {
      campaign_id: `campaign_${Date.now()}`,
      started_at: new Date().toISOString(),
      total_materials: totalMaterials,
      total_batches: totalBatches,
      completed_batch_ids: [],
      current_batch: null,
      error_count: 0,
      quarantined_materials: [],
      pass_count: 0,
      warning_count: 0,
      fail_count: 0,
      last_update: new Date().toISOString(),
    };
    updateState(state);
  }

  // Ensure output directory exists
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const completedSet = new Set(state.completed_batch_ids);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchId = formatBatchId(batchIndex);

    if (completedSet.has(batchId)) {
      continue; // Already completed — skip
    }

    const start = batchIndex * BATCH_SIZE;
    const batchMaterials = allMaterials.slice(start, start + BATCH_SIZE);

    // Update state: mark current batch in progress
    state.current_batch = batchId;
    state.last_update = new Date().toISOString();
    updateState(state);

    // Use the first material's ISO group for cutting speed selection;
    // since batches are loaded sequentially from per-group files this is
    // representative. Mixed-group batches pick the first material's group.
    const dominantGroup = batchMaterials[0]?.iso_group ?? "P";
    const ops = buildOpsForGroup(dominantGroup);

    let result: CampaignResult;
    let quarantined: string[];

    try {
      ({ result, quarantined } = runBatch(batchId, batchMaterials, ops));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`  [ERROR] Batch ${batchId} failed: ${errMsg}`);
      state.error_count++;
      state.last_update = new Date().toISOString();
      updateState(state);
      continue;
    }

    // Accumulate state counters
    state.pass_count += result.summary.total_pass;
    state.warning_count += result.summary.total_warning;
    state.fail_count += result.summary.total_fail + result.summary.total_quarantine;
    state.quarantined_materials.push(...quarantined, ...result.summary.quarantined_materials);
    state.completed_batch_ids.push(batchId);
    state.current_batch = null;
    state.last_update = new Date().toISOString();

    // Save batch result file
    saveBatchResults(batchId, result);
    updateState(state);

    // Progress output
    const done = state.completed_batch_ids.length;
    const pct = ((done / totalBatches) * 100).toFixed(1);
    const qTotal = state.quarantined_materials.length;
    process.stdout.write(
      `\r  [${String(done).padStart(4, " ")}/${totalBatches}] ${pct}%` +
      `  pass=${state.pass_count}  warn=${state.warning_count}` +
      `  fail=${state.fail_count}  quarantine=${qTotal}  `,
    );
  }

  process.stdout.write("\n");

  // Final summary
  const elapsed = ((Date.now() - new Date(state.started_at).getTime()) / 1000).toFixed(1);
  const qUnique = [...new Set(state.quarantined_materials)].length;

  console.log("\n=== Campaign Complete ===");
  console.log(`Campaign ID  : ${state.campaign_id}`);
  console.log(`Total batches: ${state.completed_batch_ids.length}/${totalBatches}`);
  console.log(`Pass         : ${state.pass_count}`);
  console.log(`Warning      : ${state.warning_count}`);
  console.log(`Fail/QT      : ${state.fail_count}`);
  console.log(`Quarantined  : ${qUnique} unique materials`);
  console.log(`Errors       : ${state.error_count}`);
  console.log(`Elapsed      : ${elapsed}s`);
  console.log(`Results dir  : ${RESULTS_DIR}`);
  console.log(`State file   : ${STATE_FILE}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
