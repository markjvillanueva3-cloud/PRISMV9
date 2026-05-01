#!/usr/bin/env node
/**
 * refresh-orphan-report.mjs — Generate orphan-report.json for stop_on_orphan_engine
 *
 * Reads UNWIRED_ENGINES_MANIFEST.json, categorizes engines for Stop-hook surfacing.
 * Priority picks (Phase C AGI wiring top 10) = severity "high".
 * Remaining ai-ml unwired = severity "medium".
 * Other categories = severity "low" (not surfaced by the 4h-fresh filter in stop hook).
 *
 * Run by inventory-refresh SessionStart hook. Safe to re-run; writes atomically.
 */
import fs from "node:fs";

const MANIFEST = "H:/prism/mcp-server/data/state/UNWIRED_ENGINES_MANIFEST.json";
const OUT = "H:/prism/mcp-server/data/state/orphan-report.json";

// Phase C top 10 AI engines (USSH-OPUS47-BOLSTER 4.7 re-raise)
const PRIORITY_PICKS = new Set([
  "ActiveLearningStrategyEngine",
  "AIAutoUtilizationEngine",
  "AICapabilityMaximizerEngine",
  "AIDecisionExplanationEngine",
  "AIDeepKnowledgeIntegrationEngine",
  "AIIntelligenceMaximizerEngine",
  "AISystemSynchronizerEngine",
  "AIGeneratedCodeApprovalGateEngine",
  "AIPhysicsOptimizationEngine",
  "AIResourceLearningEngine",
]);

function severityFor(engine) {
  if (PRIORITY_PICKS.has(engine.name)) return "high";
  if (engine.category === "ai-ml") return "medium";
  if (engine.category === "safety") return "high"; // safety unwired is always high
  return "low";
}

function main() {
  if (!fs.existsSync(MANIFEST)) {
    process.stderr.write(`Missing ${MANIFEST}\n`);
    process.exit(0); // non-fatal
  }
  const m = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const orphans = (m.unwiredList || []).map((e) => ({
    name: e.name,
    type: "engine",
    category: e.category,
    loc: e.loc,
    severity: severityFor(e),
    recommendedDispatcher: recommendDispatcher(e),
  }));

  const report = {
    schemaVersion: 1,
    timestamp: Date.now(),
    generatedAt: new Date().toISOString(),
    source: "refresh-orphan-report.mjs",
    sourceManifest: "UNWIRED_ENGINES_MANIFEST.json",
    totalOrphans: orphans.length,
    bySeverity: {
      high: orphans.filter((o) => o.severity === "high").length,
      medium: orphans.filter((o) => o.severity === "medium").length,
      low: orphans.filter((o) => o.severity === "low").length,
    },
    priorityPicks: [...PRIORITY_PICKS],
    orphans,
  };

  const tmp = OUT + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(report, null, 2), "utf8");
  fs.renameSync(tmp, OUT);
  process.stdout.write(`orphan-report: ${report.totalOrphans} engines (${report.bySeverity.high} high / ${report.bySeverity.medium} medium / ${report.bySeverity.low} low)\n`);
}

function recommendDispatcher(e) {
  const n = e.name.toLowerCase();
  if (e.category === "ai-ml" || n.startsWith("ai")) return "aiReasoningDispatcher";
  if (e.category === "wedm") return "edmDispatcher";
  if (e.category === "lathe") return "toolpathDispatcher";
  if (e.category === "mill") return "toolpathDispatcher";
  if (e.category === "cam") return "camDispatcher";
  if (e.category === "safety") return "guardDispatcher";
  if (e.category === "tooling") return "toolpathDispatcher";
  if (e.category === "quality") return "validateDispatcher";
  if (e.category === "controller") return "cncOpsDispatcher";
  if (e.category === "physics") return "calcDispatcher";
  if (e.category === "business") return "businessDispatcher";
  return null;
}

main();
