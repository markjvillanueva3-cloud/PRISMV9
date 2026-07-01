#!/usr/bin/env node
// cad-pipeline-coverage-scorer.mjs
// META artifact for /forge-audit-v2 CAD-PIPELINE-AUDIT-2026-05-20.
// Re-runnable: scores each CAD platform across the 9-stage
// print-to-inspection pipeline by counting engines, dispatcher
// action mentions, and test files on disk.
// Read-only. Pure fs scan. No deps.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.argv.find((a) => a.startsWith("--root="))?.slice(7) ?? "H:/prism");
const ENGINES_DIR = join(ROOT, "mcp-server/src/engines");
const DISPATCHERS_DIR = join(ROOT, "mcp-server/src/tools/dispatchers");
const TESTS_DIR = join(ROOT, "mcp-server/src/__tests__");

// bridgeKind: "socket" = TCP/HTTP live bridge (independent process driving);
//             "in-host" = runs inside the host app via plugin/automation;
//             "none" = no live driving wired.
// Per 2026-05-20 peer-review: HyperMillInHostRunnerEngine is NOT a socket bridge
// equivalent to Fusion360LiveBridgeEngine — call it what it is.
const PLATFORMS = [
  { id: "fusion360",  label: "Fusion 360",              pat: /^Fusion360/,       tok: "fusion360",  liveBridge: "Fusion360LiveBridgeEngine.ts",   bridgeKind: "socket",  autodeskMcp: true  },
  { id: "mastercam",  label: "Mastercam",               pat: /^Mastercam/,       tok: "mastercam",  liveBridge: null,                             bridgeKind: "none",    autodeskMcp: false },
  { id: "hypermill",  label: "HyperMill (+HyperCAD-S)", pat: /^Hyper(Mill|CAD)/, tok: "hypermill",  liveBridge: "HyperMillInHostRunnerEngine.ts", bridgeKind: "in-host", autodeskMcp: false },
  { id: "solidworks", label: "SolidWorks",              pat: /^SolidWorks/,      tok: "solidworks", liveBridge: null,                             bridgeKind: "none",    autodeskMcp: false },
  { id: "inventor",   label: "Inventor",                pat: /^Inventor/,        tok: "inventor",   liveBridge: null,                             bridgeKind: "none",    autodeskMcp: true  },
  { id: "cadquery",   label: "CadQuery (headless STEP)",pat: /^CadQuery/,        tok: "cadquery",   liveBridge: null,                             bridgeKind: "none",    autodeskMcp: false },
];

const STAGES = [
  { id: "PRINT_INTAKE", label: "Print upload (PDF/picture)",
    engineRegex: /^(BlueprintVisionOCR|PrintReading|PrintLibrary|PrintToGeometry|TurningPrintIntake|LathePrintIngest)/,
    tokens: ["blueprint_extract", "print_to_geometry", "pdf_blueprint", "blueprint_to_"] },
  { id: "CAD_GEN", label: "CAD generation (3D model from print)",
    engineRegex: /^(PrintTo|CadQuery|CADClass|CADSystemRouter|BlueprintToAllCAD)/,
    tokens: ["print_to_fusion360","print_to_mastercam","print_to_solidworks","print_to_inventor","print_to_esprit","blueprint_to_3d_model","blueprint_to_cadquery_script","cadquery_execute_script","cad_print_to_cad"] },
  { id: "CAM_TRANSFER", label: "Transfer to CAM (hyperMILL focus)",
    engineRegex: /^(PrintToHyperMill|HyperMillPPP|HyperMillCycleParameterPipeline|HyperMillSchemaUnifier|CADCAMHandoff)/,
    tokens: ["print_to_hypermill", "cad_cam_handoff", "hypermill_ppp"] },
  { id: "SETUP_GEN", label: "Auto setup gen per machine",
    engineRegex: /^(MachineEnvelopeGuard|ShopConfiguration|MachineCapability|FixtureDesign|WorkholdingSelector|SetupTransition|SetupSelection|LathePrintSetupSelection)/,
    tokens: ["machine_select","fixture_design","workholding_recommend","setup_select"] },
  { id: "CAM_PROG", label: "CAM program (w/ PRISM toolpath injection)",
    engineRegex: /^(HyperMillStrategy|HyperMillCycleDefaults|HyperMillMultiAxis|MillingPrintToProgram|TurningPrintToProgram|MillPrintToProgram|WEDMPrintToProgram|MultiAxisPrintToProgram|CrossCamRecommender|Toolpath|HyperMillBladeRoughing|HyperMillMoldCycle|HyperMillSecondaryOpsSequencer)/,
    tokens: ["hypermill_strategy","toolpath_generate","cross_cam_recommend","mill_print_to_program","turning_print_to_program"] },
  { id: "SIMULATE", label: "Simulation (hyperMILL sim)",
    engineRegex: /^(HyperMillSafetyHooks|HyperMillCollisionCheck|FiveAxis|Simulation|Toolpath.*Sim|VericutExport|NcSimul|CollisionCheck|StockRemoval)/,
    tokens: ["simulate","collision_check_full","stock_remove","vericut_export","ncsimul_export"] },
  { id: "POST_PROCESS", label: "Master post processor (or per-machine perfect post)",
    engineRegex: /^(MasterPost|OkumaOSP|OkumaB250|HurcoV11|MitsubishiMV1200R|PostProcessor|MillingPostProcessor|LathePostProcessor|FiveAxisPost)/,
    tokens: ["master_post_route","post_process","post_generate","lathe_masterpost"] },
  { id: "SETUP_SHEET", label: "Generate setup sheet",
    engineRegex: /^(SetupSheet|HyperMillSetupSheetBridge|WEDMSetupSheet)/,
    tokens: ["setup_sheet","setup_sheet_generate"] },
  { id: "INSPECTION", label: "Inspection report (measurement-tool-aware)",
    engineRegex: /^(FirstArticleInspection|TurningInspection|WetRunSampleInspection|CMM(Path|Import|History)|FAI|ProbeRoutine|InspectionPlan)/,
    tokens: ["cmm_plan","fai_run","inspection_plan","probe_routine_generate"] },
];

function listEngines() {
  if (!existsSync(ENGINES_DIR)) return [];
  return readdirSync(ENGINES_DIR).filter((f) => f.endsWith(".ts"));
}
function listTests() {
  if (!existsSync(TESTS_DIR)) return [];
  const out = [];
  function walk(dir) {
    for (const ent of readdirSync(dir)) {
      const p = join(dir, ent);
      try {
        if (statSync(p).isDirectory()) walk(p);
        else if (ent.endsWith(".test.ts")) out.push(ent);
      } catch { /* skip */ }
    }
  }
  walk(TESTS_DIR);
  return out;
}
function readDispatcher(name) {
  const p = join(DISPATCHERS_DIR, name);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
}

function scoreCell(platform, stage, ctx) {
  const stageEngines = ctx.engines.filter((f) => stage.engineRegex.test(f));
  const intersect = stageEngines.filter((f) => platform.pat.test(f));
  const shared = stageEngines.filter((f) => !PLATFORMS.some((p) => p.pat.test(f)));
  // Named PrintTo<Platform>Bridge — strongest single signal.
  const bridge = ctx.engines.find((f) => {
    const low = f.toLowerCase();
    return low === `printto${platform.id}bridge.ts` || low === `printto${platform.id}.ts` || low.startsWith(`printto${platform.id.replace(/-/g, "")}bridge`);
  });
  let actionHits = 0;
  for (const tok of stage.tokens) {
    const re = new RegExp("[\"'`]" + tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\"'`]", "g");
    actionHits += (ctx.cad.match(re) || []).length + (ctx.cam.match(re) || []).length;
  }
  const testHits = ctx.tests.filter((t) => {
    const low = t.toLowerCase();
    if (!low.includes(platform.id) && !low.includes(platform.tok)) return false;
    return stage.tokens.some((x) => low.includes(x.replace(/_/g, "")));
  }).length;
  // Raw score (legacy — file-count breadth).
  const score = (bridge ? 3 : 0) + intersect.length * 2 + shared.length * 0.5 + actionHits * 0.25 + testHits * 0.5;
  // Normalized score (peer-review 2026-05-20 fix): cap intersect contribution
  // at 5 engines (10 points) and shared at 4 engines (2 points) so a platform
  // with 60 engines doesn't tower over one with 18 purely by file count. This
  // is the fair-ranking number; raw stays for back-compat / drift detection.
  const cappedIntersect = Math.min(intersect.length, 5) * 2;
  const cappedShared = Math.min(shared.length, 4) * 0.5;
  const normalizedScore = (bridge ? 3 : 0) + cappedIntersect + cappedShared + Math.min(actionHits, 8) * 0.25 + Math.min(testHits, 8) * 0.5;
  // Platform-specific evidence flag: was ANY platform-specific signal present
  // for this stage (intersect engine OR named bridge OR platform-tokened
  // action)? Distinguishes "this platform actually integrates this stage"
  // from "some unrelated engine covers this stage." Closes the peer-review
  // missed finding: 9/9 coverage was tautological under shared-engine credit.
  const platformSpecificActionHits = stage.tokens
    .filter((tok) => tok.toLowerCase().includes(platform.id) || tok.toLowerCase().includes(platform.tok))
    .reduce((sum, tok) => {
      const re = new RegExp("[\"'`]" + tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\"'`]", "g");
      return sum + (ctx.cad.match(re) || []).length + (ctx.cam.match(re) || []).length;
    }, 0);
  const hasPlatformEvidence = Boolean(bridge) || intersect.length > 0 || platformSpecificActionHits > 0;
  return {
    score: Number(score.toFixed(2)),
    normalizedScore: Number(normalizedScore.toFixed(2)),
    bridge: bridge ?? null,
    intersectCount: intersect.length,
    intersectExamples: intersect.slice(0, 3),
    sharedCount: shared.length,
    actionHits,
    platformSpecificActionHits,
    testHits,
    hasPlatformEvidence,
  };
}

function buildMatrix() {
  const engines = listEngines();
  const tests = listTests();
  const ctx = {
    engines, tests,
    cam: readDispatcher("camDispatcher.ts"),
    cad: readDispatcher("cadDispatcher.ts"),
  };
  const matrix = {};
  const totals = {};
  for (const platform of PLATFORMS) {
    matrix[platform.id] = {};
    let total = 0;
    let normalizedTotal = 0;
    let withEvidence = 0;
    let withPlatformSpecificEvidence = 0;
    for (const stage of STAGES) {
      const cell = scoreCell(platform, stage, ctx);
      matrix[platform.id][stage.id] = cell;
      total += cell.score;
      normalizedTotal += cell.normalizedScore;
      if (cell.score > 0) withEvidence += 1;
      if (cell.hasPlatformEvidence) withPlatformSpecificEvidence += 1;
    }
    totals[platform.id] = {
      label: platform.label,
      totalScore: Number(total.toFixed(2)),
      normalizedTotalScore: Number(normalizedTotal.toFixed(2)),
      stagesWithEvidence: withEvidence,
      stagesWithPlatformSpecificEvidence: withPlatformSpecificEvidence,
      stageCount: STAGES.length,
      coveragePct: Math.round((withEvidence / STAGES.length) * 100),
      platformSpecificCoveragePct: Math.round((withPlatformSpecificEvidence / STAGES.length) * 100),
      bridgeKind: platform.bridgeKind,
      hasLiveBridge: Boolean(platform.liveBridge && engines.includes(platform.liveBridge)),
      autodeskMcp: platform.autodeskMcp,
    };
  }
  return { matrix, totals, ctx: { engineCount: engines.length, testCount: tests.length, generatedAt: new Date().toISOString() } };
}

function renderMarkdown(result) {
  const { matrix, totals, ctx } = result;
  const out = [];
  out.push("# CAD Pipeline Coverage Scorer baseline");
  out.push("");
  out.push("Generated: " + ctx.generatedAt);
  out.push("Engines scanned: " + ctx.engineCount + " | Tests scanned: " + ctx.testCount);
  out.push("");
  out.push("## Ranking (highest score = easiest end-to-end)");
  out.push("");
  out.push("| Rank | Platform | Raw | Normalized | Plat-specific stages | Bridge kind | Autodesk MCP |");
  out.push("|---|---|---|---|---|---|---|");
  // Rank by NORMALIZED score (peer-review fix) — raw score over-credits high-engine-count platforms.
  const ranked = Object.entries(totals).sort((a, b) => b[1].normalizedTotalScore - a[1].normalizedTotalScore);
  ranked.forEach(([, t], i) => {
    out.push("| " + (i + 1) + " | " + t.label + " | " + t.totalScore + " | **" + t.normalizedTotalScore + "** | " + t.stagesWithPlatformSpecificEvidence + "/" + t.stageCount + " | " + t.bridgeKind + " | " + (t.autodeskMcp ? "yes" : "no") + " |");
  });
  out.push("");
  out.push("## Per-stage matrix (cell = score)");
  out.push("");
  out.push("| Stage | " + PLATFORMS.map((p) => p.label).join(" | ") + " |");
  out.push("| " + ["---"].concat(PLATFORMS.map(() => "---")).join(" | ") + " |");
  for (const stage of STAGES) {
    const row = [stage.label];
    for (const p of PLATFORMS) {
      const c = matrix[p.id][stage.id];
      row.push(c.score + (c.bridge ? " B" : ""));
    }
    out.push("| " + row.join(" | ") + " |");
  }
  out.push("");
  out.push("Legend: B = named PrintTo<Platform>Bridge engine exists.");
  return out.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const result = buildMatrix();
  if (args.includes("--json")) { process.stdout.write(JSON.stringify(result, null, 2) + "\n"); return; }
  if (args.includes("--md"))   { process.stdout.write(renderMarkdown(result) + "\n"); return; }
  console.log("CAD Pipeline Coverage Scorer baseline");
  console.log("Engines: " + result.ctx.engineCount + " | Tests: " + result.ctx.testCount);
  console.log("");
  // Rank by NORMALIZED score (peer-review fix).
  const ranked = Object.entries(result.totals).sort((a, b) => b[1].normalizedTotalScore - a[1].normalizedTotalScore);
  ranked.forEach(([, t], i) => {
    console.log("  " + (i + 1) + ". " + t.label.padEnd(26) + " norm=" + String(t.normalizedTotalScore).padStart(6) + " raw=" + String(t.totalScore).padStart(7) + " plat-specific=" + t.stagesWithPlatformSpecificEvidence + "/" + t.stageCount + " bridge=" + t.bridgeKind);
  });
  console.log("");
  console.log("Run with --md or --json for full matrix.");
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) main();

export { buildMatrix, renderMarkdown, PLATFORMS, STAGES };
