#!/usr/bin/env node
/**
 * cam-pipeline-coverage-scorer.mjs — re-runnable CAM pipeline coverage scorer.
 *
 * Mirrors delta's `scripts/cad-pipeline-coverage-scorer.mjs` (CAD audit
 * methodology, 2026-05-20). Scores every (CAM platform × adaptive-pipeline-stage)
 * cell with raw + **normalized** score (engine-count cap so high-engine-count
 * platforms don't over-credit), tracks **bridgeKind** (`socket` / `in-host` /
 * `none`), tracks **hasPlatformEvidence** per cell (exposes delta's F7
 * tautology — shared engines make 9/9 coverage trivially true).
 *
 * Stages: the operator's 7-step adaptive-pipeline + 3 supporting stages.
 *
 * Usage:
 *   node scripts/cam-pipeline-coverage-scorer.mjs           # human MD output
 *   node scripts/cam-pipeline-coverage-scorer.mjs --json    # machine JSON
 *   node scripts/cam-pipeline-coverage-scorer.mjs --md      # MD only (file)
 *
 * Output: state/shared/specs/cam-pipeline-coverage-LATEST.{json,md}
 *
 * Doctrine: this is the META artifact backing the CAM audit. Re-runnable in
 * ~1 sec. Future audits diff against the baseline. Same 7-day cron cadence as
 * delta's CAD scorer.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ─── Repo paths ───────────────────────────────────────────────────────────

const REPO = "H:/prism-slot-kilo";
const ENGINE_DIR = join(REPO, "mcp-server/src/engines");
const DISP_DIR = join(REPO, "mcp-server/src/tools/dispatchers");
const TEST_DIR = join(REPO, "mcp-server/src/__tests__");
const OUT_JSON = join(REPO, "state/shared/specs/cam-pipeline-coverage-LATEST.json");
const OUT_MD = join(REPO, "state/shared/specs/cam-pipeline-coverage-LATEST.md");

// ─── CAM platforms (with bridge-kind + Autodesk MCP) ─────────────────────

const PLATFORMS = [
  { id: "hypermill", label: "HyperMill (+HyperCAD-S)", prefix: /^(Hyper(Mill|CAD))/i, bridgeKind: "in-host", autodeskMcp: false },
  { id: "mastercam", label: "Mastercam X8", prefix: /^Mastercam/i, bridgeKind: "none", autodeskMcp: false },
  { id: "fusion360", label: "Fusion 360", prefix: /^Fusion(360)?/i, bridgeKind: "socket", autodeskMcp: true },
  { id: "inventor", label: "Inventor HSM", prefix: /^Inventor/i, bridgeKind: "none", autodeskMcp: true },
  { id: "solidcam", label: "SolidCAM", prefix: /^SolidCAM/i, bridgeKind: "none", autodeskMcp: false },
  { id: "powermill", label: "PowerMill", prefix: /^PowerMill/i, bridgeKind: "none", autodeskMcp: false },
  { id: "nx", label: "NX CAM", prefix: /^(NX|Siemens)/i, bridgeKind: "none", autodeskMcp: false },
  { id: "esprit", label: "Esprit", prefix: /^Esprit/i, bridgeKind: "none", autodeskMcp: false },
];

// ─── 10-stage adaptive-pipeline contract ─────────────────────────────────

const STAGES = [
  { id: "PROGRAM_INTAKE", label: "Program intake (CAD→CAM handoff or existing CAM file)",
    sharedTokens: ["CADCorpus", "PrintToProgram", "PrintTo"], stageTokens: ["intake", "ingest"] },
  { id: "MACHINE_SELECT", label: "Machine selection (ERP + availability + capability)",
    sharedTokens: ["MachineSelect", "MachineCapability", "ERP", "ShopFloor", "Scheduling", "MachineHandbook"], stageTokens: ["select", "rank", "availab"] },
  { id: "STOCK_SIZE", label: "Stock size + allowance",
    sharedTokens: ["Stock"], stageTokens: ["size", "Optim", "select"] },
  { id: "WORKHOLDING_FIRSTOP", label: "Workholding (Kurt vise + soft-jaw + ROI clamping)",
    sharedTokens: ["Workholding", "Fixture", "Clamp"], stageTokens: ["intelligen", "viab", "retrofit", "force", "verifi"] },
  { id: "OP_SEQUENCE", label: "Operation order (interrupted-cut + air-cut + chip thickness)",
    sharedTokens: ["OperationSequenc", "Sequenc", "InterruptedCut", "AirCut", "ChipThinning", "IntelligentSequenc"], stageTokens: ["plan", "order", "detect", "compensat"] },
  { id: "TOOL_HOLDER_SELECT", label: "Tool + holder selection (ROI-aware)",
    sharedTokens: ["ToolHolder", "ToolSelect", "SmartTool", "Coating", "HolderOperationMatch"], stageTokens: ["select", "match", "rank"] },
  { id: "MACHINE_CAPABILITY_USE", label: "Use machine capabilities (taper / spindle / kinematics / envelope / controller / params)",
    sharedTokens: ["MachineCapability", "Spindle", "Kinematic", "MachineEnvelope", "ParameterOptim", "CAMParameter", "BanditParameter", "Controller"], stageTokens: ["surface", "intel", "guard", "tune", "encode"] },
  { id: "POST_EMIT", label: "Post-emit (optimized + cost-efficient + accurate + safe)",
    sharedTokens: ["PostProcessor", "MasterPost", "GCodeSafety", "PostEmitSafety", "PPSpindle", "PPMachine"], stageTokens: ["emit", "validate", "gate", "generat"] },
  { id: "SETUP_SHEET", label: "Setup sheet generation",
    sharedTokens: ["SetupSheet", "Setup"], stageTokens: ["generat", "sheet"] },
  { id: "CLOSED_LOOP_FEEDBACK", label: "Closed-loop feedback (outcome → corpus delta → retrain signal)",
    sharedTokens: ["OutcomeFeedback", "SelfLearning", "ToolpathTipRetriever", "TemplateApplicability", "ShopFloorCheckIn"], stageTokens: ["observe", "outcome", "retrain", "wire"] },
];

// ─── File enumeration ─────────────────────────────────────────────────────

function listEngines() {
  try {
    return readdirSync(ENGINE_DIR).filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  } catch { return []; }
}

function listDispatchers() {
  try {
    return readdirSync(DISP_DIR).filter(f => f.endsWith(".ts"));
  } catch { return []; }
}

function listTests() {
  try {
    return readdirSync(TEST_DIR).filter(f => f.endsWith(".test.ts"));
  } catch { return []; }
}

// ─── Scoring ──────────────────────────────────────────────────────────────

const ENGINE_CAP = 5;       // delta's F7 normalization cap on intersect engines
const SHARED_CAP = 4;       // delta's F7 normalization cap on shared engines
const DISPATCHER_TOKEN_CAP = 8;  // cap dispatcher-action-mention credit

function scoreCell(engines, dispActions, tests, platform, stage) {
  let intersectEngines = 0;
  let sharedEngines = 0;
  let platformDispatcherActions = 0;
  let testCount = 0;
  let hasPlatformEvidence = false;

  // Engine pass: per-platform-prefix + stage-token co-occurrence
  for (const f of engines) {
    const matchesPlatform = platform.prefix.test(f);
    const matchesStageShared = stage.sharedTokens.some(t => f.includes(t));
    const matchesStageTokens = stage.stageTokens.some(t => f.toLowerCase().includes(t.toLowerCase()));
    if (matchesPlatform && (matchesStageShared || matchesStageTokens)) {
      intersectEngines++;
      hasPlatformEvidence = true;
    } else if (matchesStageShared) {
      sharedEngines++;
    }
  }

  // Dispatcher pass: count platform-tokened mentions in dispatcher files (read file body)
  for (const f of Object.keys(dispActions)) {
    const content = dispActions[f];
    if (!content) continue;
    const platformHits = (content.match(platform.prefix) || []).length;
    if (platformHits > 0) {
      // Check if stage tokens also appear in same file (rough co-occurrence)
      const stageHit = stage.sharedTokens.some(t => content.toLowerCase().includes(t.toLowerCase()))
                    || stage.stageTokens.some(t => content.toLowerCase().includes(t.toLowerCase()));
      if (stageHit) {
        platformDispatcherActions += Math.min(platformHits, 5);
        hasPlatformEvidence = true;
      }
    }
  }

  // Test pass: per-platform tests at this stage
  for (const f of tests) {
    const matchesPlatform = platform.prefix.test(f);
    const matchesStage = stage.sharedTokens.some(t => f.includes(t))
                      || stage.stageTokens.some(t => f.toLowerCase().includes(t.toLowerCase()));
    if (matchesPlatform && matchesStage) {
      testCount++;
      hasPlatformEvidence = true;
    }
  }

  // Raw score: full credit
  const rawScore = intersectEngines * 2 + sharedEngines * 1.5
                 + platformDispatcherActions * 1 + testCount * 1.5;

  // Normalized: cap intersect + shared per delta's F7
  const normalized = Math.min(intersectEngines, ENGINE_CAP) * 2
                   + Math.min(sharedEngines, SHARED_CAP) * 1.5
                   + Math.min(platformDispatcherActions, DISPATCHER_TOKEN_CAP) * 1
                   + testCount * 1.5;

  return {
    rawScore: Math.round(rawScore * 100) / 100,
    normalizedScore: Math.round(normalized * 100) / 100,
    intersectEngines,
    sharedEngines,
    platformDispatcherActions,
    testCount,
    hasPlatformEvidence,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const writeMD = !args.includes("--json") || args.includes("--md");

  const engines = listEngines();
  const dispFiles = listDispatchers();
  const tests = listTests();

  // Pre-read dispatcher content for token scans (only ~10 files)
  const dispContent = {};
  for (const f of dispFiles) {
    try { dispContent[f] = readFileSync(join(DISP_DIR, f), "utf8"); }
    catch { dispContent[f] = ""; }
  }

  const matrix = {};
  const totals = {};

  for (const p of PLATFORMS) {
    matrix[p.id] = {};
    let rawTotal = 0;
    let normTotal = 0;
    let stagesWithEvidence = 0;
    let stagesWithPlatformEvidence = 0;
    for (const s of STAGES) {
      const cell = scoreCell(engines, dispContent, tests, p, s);
      matrix[p.id][s.id] = cell;
      rawTotal += cell.rawScore;
      normTotal += cell.normalizedScore;
      if (cell.rawScore > 0) stagesWithEvidence++;
      if (cell.hasPlatformEvidence) stagesWithPlatformEvidence++;
    }
    totals[p.id] = {
      label: p.label,
      bridgeKind: p.bridgeKind,
      autodeskMcp: p.autodeskMcp,
      rawTotalScore: Math.round(rawTotal * 100) / 100,
      normalizedTotalScore: Math.round(normTotal * 100) / 100,
      stagesWithEvidence,
      stagesWithPlatformSpecificEvidence: stagesWithPlatformEvidence,
      stageCount: STAGES.length,
    };
  }

  const report = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    enginesScanned: engines.length,
    dispatchersScanned: dispFiles.length,
    testsScanned: tests.length,
    stages: STAGES.map(s => ({ id: s.id, label: s.label })),
    platforms: PLATFORMS.map(p => ({ id: p.id, label: p.label, bridgeKind: p.bridgeKind, autodeskMcp: p.autodeskMcp })),
    totals,
    matrix,
    methodology: {
      scoring: "intersect_engines × 2 + shared_engines × 1.5 + dispatcher_tokens × 1 + tests × 1.5",
      normalization: `Caps applied per delta F7: intersect_engines ≤ ${ENGINE_CAP}, shared_engines ≤ ${SHARED_CAP}, dispatcher_tokens ≤ ${DISPATCHER_TOKEN_CAP}`,
      bridgeKindMeaning: "socket = independent-process driving; in-host = plugin requires host app running; none = no live driving",
      f7Tautology: "hasPlatformEvidence flag exposes when a cell shows coverage only via shared engines, not platform-specific ones",
    },
    caveats: [
      "Coverage = engine-file count + dispatcher-action mentions + test count; measures BREADTH of substrate, NOT runtime correctness.",
      "Normalization caps engine credit; still does not measure integration depth or operator-ready completeness.",
      "Static scan, not runtime probe. Runtime gate is the CAM-TEST-PLAYBOOK live-drive tier 2+.",
      "Bridge-kind tracking is per-platform metadata, not auto-detected from engine files — update PLATFORMS array when bridges land.",
    ],
  };

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  }

  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  if (writeMD) writeFileSync(OUT_MD, renderMD(report));

  if (!jsonMode) {
    console.log(`cam-pipeline-coverage-scorer: wrote ${OUT_JSON}`);
    console.log(`cam-pipeline-coverage-scorer: wrote ${OUT_MD}`);
    console.log(`Engines scanned: ${engines.length} | Dispatchers: ${dispFiles.length} | Tests: ${tests.length}`);
    console.log("");
    console.log("Ranking (normalized):");
    const ranked = [...PLATFORMS].sort((a, b) => totals[b.id].normalizedTotalScore - totals[a.id].normalizedTotalScore);
    for (const p of ranked) {
      const t = totals[p.id];
      console.log(`  ${t.label.padEnd(28)} norm=${String(t.normalizedTotalScore).padStart(7)}  raw=${String(t.rawTotalScore).padStart(7)}  platSpecific=${t.stagesWithPlatformSpecificEvidence}/${t.stageCount}  bridge=${t.bridgeKind}  mcp=${t.autodeskMcp ? "yes" : "no"}`);
    }
  }
}

function renderMD(r) {
  const ranked = [...r.platforms].sort((a, b) => r.totals[b.id].normalizedTotalScore - r.totals[a.id].normalizedTotalScore);
  const parts = [];
  parts.push("# CAM Pipeline Coverage Scorer baseline");
  parts.push("");
  parts.push(`Generated: ${r.generatedAt}`);
  parts.push(`Engines scanned: ${r.enginesScanned} | Dispatchers: ${r.dispatchersScanned} | Tests scanned: ${r.testsScanned}`);
  parts.push("");
  parts.push("## Ranking (highest normalized score = easiest end-to-end CAM)");
  parts.push("");
  parts.push("| Rank | Platform | Raw | Normalized | Plat-specific stages | Bridge kind | Autodesk MCP |");
  parts.push("|---|---|---|---|---|---|---|");
  ranked.forEach((p, i) => {
    const t = r.totals[p.id];
    parts.push(`| ${i + 1} | ${t.label} | ${t.rawTotalScore} | **${t.normalizedTotalScore}** | ${t.stagesWithPlatformSpecificEvidence}/${t.stageCount} | ${t.bridgeKind} | ${t.autodeskMcp ? "yes" : "no"} |`);
  });
  parts.push("");
  parts.push("## Per-stage matrix (cell shows normalized score; B = has platform-specific evidence)");
  parts.push("");
  const platCols = ranked.map(p => p.label).join(" | ");
  parts.push(`| Stage | ${platCols} |`);
  parts.push(`| --- | ${ranked.map(() => "---").join(" | ")} |`);
  for (const s of r.stages) {
    const cells = ranked.map(p => {
      const c = r.matrix[p.id][s.id];
      return `${c.normalizedScore}${c.hasPlatformEvidence ? " B" : ""}`;
    }).join(" | ");
    parts.push(`| ${s.label} | ${cells} |`);
  }
  parts.push("");
  parts.push("Legend: B = has platform-specific evidence (intersect engines / per-platform tests / dispatcher tokens at this stage).");
  parts.push("");
  parts.push("## Methodology");
  parts.push("");
  for (const [k, v] of Object.entries(r.methodology)) {
    parts.push(`- **${k}**: ${v}`);
  }
  parts.push("");
  parts.push("## Caveats");
  parts.push("");
  for (const c of r.caveats) parts.push(`- ${c}`);
  return parts.join("\n");
}

main();
