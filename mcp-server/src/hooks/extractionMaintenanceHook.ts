/**
 * Extraction Maintenance Hook — Ensures extraction→ingestion→wiring pipeline is maintained
 *
 * This hook:
 *   1. Monitors for new extraction scripts
 *   2. Verifies extraction scripts follow the standard pattern
 *   3. Auto-registers new extraction types
 *   4. Validates ingestion wiring is complete
 *   5. Reports coverage gaps
 *
 * Add to .claude/hooks.json for CLI integration.
 *
 * @module hooks/extractionMaintenanceHook
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join, basename } from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface MaintenanceReport {
  extraction_scripts: {
    total: number;
    recognized: string[];
    unrecognized: string[];
  };
  ingestion: {
    state_file_exists: boolean;
    files_processed: number;
    pending_files: number;
    last_run: string;
  };
  wiring: {
    workflow_templates_loaded: number;
    tribal_tips_loaded: number;
    dispatchers_with_workflow_actions: string[];
    engines_with_workflow_integration: string[];
  };
  recommendations: string[];
  health_score: number;
}

// ============================================================================
// EXTRACTION SCRIPT PATTERNS
// ============================================================================

const RECOGNIZED_EXTRACTION_PATTERNS = [
  { pattern: /extract-hypermill-deep/, type: "hypermill-deep" },
  { pattern: /extract-hypermill-workflows/, type: "hypermill-workflows" },
  { pattern: /extract-hypermill-api/, type: "hypermill-api" },
  { pattern: /extract-hypercad-python/, type: "hypercad-python" },
  { pattern: /wire-hypermill/, type: "wire-hypermill" },
  { pattern: /extract-.*-deep/, type: "generic-deep" },
  { pattern: /extract-.*-api/, type: "generic-api" },
];

function classifyScript(filename: string): string | null {
  for (const { pattern, type } of RECOGNIZED_EXTRACTION_PATTERNS) {
    if (pattern.test(filename)) return type;
  }
  return null;
}

// ============================================================================
// CHECKERS
// ============================================================================

function checkExtractionScripts(): MaintenanceReport["extraction_scripts"] {
  const scriptsDir = join(process.cwd(), "scripts");
  const recognized: string[] = [];
  const unrecognized: string[] = [];

  if (existsSync(scriptsDir)) {
    const files = readdirSync(scriptsDir).filter(f => f.startsWith("extract-") || f.startsWith("wire-"));
    for (const file of files) {
      const type = classifyScript(file);
      if (type) {
        recognized.push(`${file} (${type})`);
      } else {
        unrecognized.push(file);
      }
    }
  }

  return {
    total: recognized.length + unrecognized.length,
    recognized,
    unrecognized,
  };
}

function checkIngestionState(): MaintenanceReport["ingestion"] {
  const stateFile = join(process.cwd(), "data/state/extraction-ingestion-state.json");
  let state = { last_run: "", files_processed: [], total_items_ingested: 0 };

  if (existsSync(stateFile)) {
    try {
      state = JSON.parse(readFileSync(stateFile, "utf-8"));
    } catch { /* corrupted */ }
  }

  // Count pending
  let pendingCount = 0;
  try {
    const { detectNewExtractions } = require("./extractionIngestionHook.js");
    pendingCount = detectNewExtractions().length;
  } catch { /* not available */ }

  return {
    state_file_exists: existsSync(stateFile),
    files_processed: state.files_processed?.length || 0,
    pending_files: pendingCount,
    last_run: state.last_run || "never",
  };
}

function checkWiring(): MaintenanceReport["wiring"] {
  const result = {
    workflow_templates_loaded: 0,
    tribal_tips_loaded: 0,
    dispatchers_with_workflow_actions: [] as string[],
    engines_with_workflow_integration: [] as string[],
  };

  // Check workflow templates
  const workflowDir = join(process.cwd(), "data/extracted-knowledge/hypermill-workflows");
  if (existsSync(workflowDir)) {
    const files = readdirSync(workflowDir).filter(f => f.endsWith(".json"));
    if (files.length > 0) {
      try {
        const latest = files.sort().reverse()[0];
        const data = JSON.parse(readFileSync(join(workflowDir, latest), "utf-8"));
        result.workflow_templates_loaded = data.workflows?.total || 0;
      } catch { /* corrupted */ }
    }
  }

  // Check auto-ingested tips
  const tipsFile = join(process.cwd(), "src/data/auto-ingested-tips.ts");
  if (existsSync(tipsFile)) {
    const content = readFileSync(tipsFile, "utf-8");
    const match = content.match(/AUTO_INGESTED_TIPS_COUNT\s*=\s*(\d+)/);
    if (match) {
      result.tribal_tips_loaded = parseInt(match[1], 10);
    }
  }

  // Check dispatcher wiring
  const dispatcherDir = join(process.cwd(), "src/tools/dispatchers");
  if (existsSync(dispatcherDir)) {
    const dispatchers = readdirSync(dispatcherDir).filter(f => f.endsWith("Dispatcher.ts"));
    for (const d of dispatchers) {
      const content = readFileSync(join(dispatcherDir, d), "utf-8");
      if (content.includes("workflow_suggest") || content.includes("WorkflowTemplateEngine")) {
        result.dispatchers_with_workflow_actions.push(d.replace(".ts", ""));
      }
    }
  }

  // Check engine integration
  const enginesWithIntegration = [
    "IntelligentSequencingEngine.ts",
    "PrintToProgramPipelineEngine.ts",
    "TribalKnowledgeEngine.ts",
    "WorkflowTemplateEngine.ts",
    "WorkflowIntegrationHelper.ts",
  ];
  const engineDir = join(process.cwd(), "src/engines");
  for (const eng of enginesWithIntegration) {
    if (existsSync(join(engineDir, eng))) {
      result.engines_with_workflow_integration.push(eng.replace(".ts", ""));
    }
  }

  return result;
}

function generateRecommendations(report: Partial<MaintenanceReport>): string[] {
  const recommendations: string[] = [];

  if (report.extraction_scripts?.unrecognized?.length) {
    recommendations.push(
      `${report.extraction_scripts.unrecognized.length} unrecognized extraction scripts — add patterns to RECOGNIZED_EXTRACTION_PATTERNS`
    );
  }

  if ((report.ingestion?.pending_files || 0) > 0) {
    recommendations.push(
      `${report.ingestion?.pending_files} pending extraction files — run prism_hook:run_ingestion`
    );
  }

  if ((report.wiring?.workflow_templates_loaded || 0) < 50) {
    recommendations.push(
      `Only ${report.wiring?.workflow_templates_loaded} workflow templates loaded — run extraction scripts`
    );
  }

  if ((report.wiring?.dispatchers_with_workflow_actions?.length || 0) < 2) {
    recommendations.push(
      `Workflow actions not fully wired — check knowledgeDispatcher and multiOpDispatcher`
    );
  }

  return recommendations;
}

function calculateHealthScore(report: MaintenanceReport): number {
  let score = 100;

  // Penalize for unrecognized scripts
  score -= report.extraction_scripts.unrecognized.length * 5;

  // Penalize for pending files
  score -= report.ingestion.pending_files * 3;

  // Penalize for missing workflow templates
  if (report.wiring.workflow_templates_loaded < 50) score -= 10;

  // Penalize for missing tribal tips
  if (report.wiring.tribal_tips_loaded < 100) score -= 10;

  // Penalize for missing dispatcher wiring
  if (report.wiring.dispatchers_with_workflow_actions.length < 2) score -= 15;

  // Penalize for missing engine integration
  if (report.wiring.engines_with_workflow_integration.length < 3) score -= 15;

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Run maintenance check and generate report.
 */
export function runMaintenanceCheck(): MaintenanceReport {
  log.info("[ExtractionMaintenance] Running maintenance check...");

  const extraction_scripts = checkExtractionScripts();
  const ingestion = checkIngestionState();
  const wiring = checkWiring();

  const partialReport = { extraction_scripts, ingestion, wiring };
  const recommendations = generateRecommendations(partialReport);

  const report: MaintenanceReport = {
    extraction_scripts,
    ingestion,
    wiring,
    recommendations,
    health_score: 0,
  };

  report.health_score = calculateHealthScore(report);

  log.info(`[ExtractionMaintenance] Health score: ${report.health_score}%`);
  if (recommendations.length > 0) {
    log.warn(`[ExtractionMaintenance] ${recommendations.length} recommendations`);
  }

  return report;
}

/**
 * Save maintenance report to file.
 */
export function saveMaintenanceReport(report: MaintenanceReport): string {
  const reportPath = join(process.cwd(), "data/state/extraction-maintenance-report.json");
  writeFileSync(reportPath, JSON.stringify({
    ...report,
    generated_at: new Date().toISOString(),
  }, null, 2));
  return reportPath;
}

/**
 * Get quick status.
 */
export function getQuickStatus(): {
  health_score: number;
  pending_ingestion: number;
  recommendations_count: number;
} {
  const report = runMaintenanceCheck();
  return {
    health_score: report.health_score,
    pending_ingestion: report.ingestion.pending_files,
    recommendations_count: report.recommendations.length,
  };
}

// ============================================================================
// HOOK REGISTRATION
// ============================================================================

export const extractionMaintenanceHook = {
  id: "extraction-maintenance",
  name: "Extraction Maintenance",
  description: "Ensures extraction→ingestion→wiring pipeline is maintained",
  event: "session-start",
  phase: "after",
  enabled: true,
  priority: 50,

  execute: runMaintenanceCheck,
  saveReport: saveMaintenanceReport,
  getStatus: getQuickStatus,
};
