#!/usr/bin/env node
// scripts/galaxy-edge-wire.mjs
//
// U-GBA09 — wire EVERY viable galaxy combination (operator directive 2026-05-29:
// "every viable galaxy combination not just one for each").
//
// Source of truth = the EDGES list below (the machine-readable form of
// state/shared/specs/GALAXY-COMBINATION-MATRIX-2026-05-29.md). Each edge is
// declared ONCE; the renderer emits it from BOTH endpoints' perspective, so the
// graph is SYMMETRIC by construction (no asymmetric bridges possible).
//
// Idempotent + additive: for each galaxy it only emits lines for viable partners
// NOT already mentioned in that galaxy's existing edge section(s) — never
// duplicates, never rewrites a peer's content. Inserts into an existing
// `## Related galaxies (PSN edges — symmetric)` section if present, else creates
// one before `## Cross-refs`, else appends.
//
// Default = DRY-RUN. Pass --apply to write. Report lists exactly which files
// changed so the caller commits explicit named files (absorption-safe — see
// reference_golf_pathspec_absorption_2026_05_29).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINES = path.resolve(__dirname, "..", "mcp-server/src/engines");
const APPLY = process.argv.includes("--apply");

// [a, b, dir, bridge]  dir: '>'=a produces→b consumes · '<>'=bidirectional
const EDGES = [
  // ---- manufacturing pipeline ----
  ["blueprint-vision", "cad", ">", "print/OCR → `cad_step_parse` / AGI-CAD-generate"],
  ["blueprint-vision", "quoting", ">", "print → auto-quote"],
  ["blueprint-vision", "cam", ">", "print → strategy input"],
  ["cad", "cam", ">", "`feature_recognize` → `cam_strategy_recommend`"],
  ["cad", "quoting", ">", "feature + DFM → auto-quote-from-print"],
  ["cad", "academy", ">", "CAD examples → training corpus"],
  ["cad", "ai-training", ">", "CAD-RAG / CAD-classifier → `xproc_kg_project_features`"],
  ["cam", "post-processor", ">", "`cam_strategy_recommend`→`toolpath_generate` → NCI/APT → post emit"],
  ["cam", "mill", ">", "`cam_strategy_recommend` (mill-keyed) → strategy"],
  ["cam", "lathe", ">", "`cam_strategy_recommend` (lathe/mill-turn) → strategy"],
  ["cam", "wedm", ">", "`cam_strategy_recommend` (wedm-keyed) → EDM feeder"],
  ["cam", "speed-feed", "<>", "`cam_speedfeed_compute` ↔ `ToolpathBlock`"],
  ["cam", "ai-training", ">", "transfer-domain strategy embeddings → GNN"],
  ["speed-feed", "mill", ">", "every mill cutting engine queries SFC"],
  ["speed-feed", "lathe", ">", "every lathe cutting engine queries SFC (CSS/IPR)"],
  ["speed-feed", "wedm", ">", "discharge-param baselines (wire tension/flush/power)"],
  ["speed-feed", "post-processor", ">", "feed/speed injected per NC block via `cam_speedfeed_compute`"],
  ["speed-feed", "ai-training", "<>", "LoRA-trained SFC models per-material"],
  ["speed-feed", "business", ">", "SFC subscription billing"],
  ["speed-feed", "academy", ">", "SFC training courses"],
  ["mill", "post-processor", ">", "toolpath → `MasterPostEngine` (vendor-specialized)"],
  ["lathe", "post-processor", ">", "toolpath → `LathePostProcessor*` / `MasterPostEngine`"],
  ["wedm", "post-processor", ">", "EDM-flavored G-code via `EDMPostProcessGCodeEngine`"],
  ["mill", "quality", ">", "predicted Cpk via `SurfaceFinishPredictionEngine`"],
  ["lathe", "quality", ">", "surface-finish Cpk pre-cut"],
  ["wedm", "quality", ">", "`EDMMonitorSurfaceIntegrityEngine` → SPC"],
  ["mill", "shop-floor", "<>", "`MachineLive*` spindle-load/override feedback"],
  ["lathe", "shop-floor", "<>", "live status → adaptive engines"],
  ["wedm", "shop-floor", "<>", "live discharge status → adaptive"],
  ["mill", "business", ">", "tool-life → `ERPToolInventoryEngine` reorder"],
  ["lathe", "business", ">", "`LatheActualCostReconciliationEngine` → job-cost"],
  ["wedm", "business", ">", "tool/wire-life → ERP reorder"],
  ["mill", "ai-training", "<>", "mill LoRA per-domain models"],
  ["lathe", "ai-training", "<>", "lathe LoRA per-domain models"],
  ["wedm", "ai-training", "<>", "wedm LoRA per-domain models"],
  ["mill", "lathe", "<>", "mill-turn `Fusion360MillTurnBridgeEngine` / `HyperMillMillTurnBridge`"],
  ["cam", "cad-fusion-live", "<>", "Fusion bridges + long-session pattern"],
  ["quoting", "business", ">", "accepted quote → `ERPWorkOrderEngine`; cost back-flow `ERPCostFeedbackEngine`"],
  ["quoting", "ai-training", ">", "quote-vs-actual reconciliation → learning"],
  ["post-processor", "pdf-corpus-mill", "<", "Haas/Mazak dialect mining feeds post knowledge"],
  ["post-processor", "frontend-app", ">", "G-code preview in web/mobile"],
  // ---- business / ops ----
  ["business", "quality", "<>", "`ERPQualityEngine` ingests SPC → customer/job records"],
  ["business", "shop-floor", "<>", "live machine status → ERP work-order updates"],
  ["business", "academy", "<>", "`EmployeeMachineDomainAcademyEngine` per-role curriculum"],
  ["business", "frontend-app", ">", "most dispatcher consumers (quoting/scheduling/ERP)"],
  ["quality", "compliance-safety", "<>", "Cpk + S(x) gates co-evaluate"],
  ["shop-floor", "compliance-safety", "<>", "live alarm propagation"],
  ["compliance-safety", "mill", ">", "S(x) gate on every mill output"],
  ["compliance-safety", "lathe", ">", "S(x) gate on every lathe output"],
  ["compliance-safety", "wedm", ">", "S(x) gate on every wedm output"],
  // ---- knowledge / training ----
  ["mit-curriculum", "knowledge-conversion", ">", "raw OCW source → 6-node router"],
  ["pdf-corpus", "knowledge-conversion", ">", "raw PDFs → 6-node router"],
  ["pdf-corpus", "pdf-corpus-mill", ">", "mill-specific extraction subset"],
  ["knowledge-conversion", "tribal-knowledge", ">", "Lane A → tribal tips"],
  ["knowledge-conversion", "academy", ">", "course-leaf conversions"],
  ["knowledge-conversion", "ai-training", ">", "ported algorithms/formulas → training"],
  ["corpus-aggregation", "academy", ">", "aggregated corpus → courses"],
  ["corpus-aggregation", "ai-training", ">", "aggregated corpus → training input"],
  ["corpus-aggregation", "tribal-knowledge", "<>", "tribal storage substrate"],
  ["tribal-knowledge", "post-processor", ">", "cited-tip pipeline output"],
  ["tribal-knowledge", "academy", ">", "training-material source"],
  ["academy", "ai-training", "<>", "academy outcomes ↔ training feedback"],
  // ---- dev-infra ----
  ["discovery", "wiring", ">", "`audit-unwired-engines.mjs` candidates → wiring closure"],
  ["discovery", "dormant-data", "<>", "orphan inventory overlap — dedupe"],
  ["discovery", "system-viz", "<", "discovery RUNS on the system-graph"],
  ["discovery", "agent-orchestration", ">", "findings → orchestrator routing"],
  ["wiring", "bug-hunting", ">", "romeo wires → uniform verifies route end-to-end"],
  ["wiring", "backend-helper", "<>", "co-design dispatcher signatures; TSC discipline"],
  ["wiring", "dormant-data", "<", "no-consumer findings → wiring backlog"],
  ["bug-hunting", "backend-helper", "<>", "green build baseline to spot drift against"],
  ["token-optimization", "system-viz", "<", "reads graph for token-waste hotspots"],
  ["token-optimization", "agent-orchestration", "<>", "multi-agent token cost coordination"],
  ["token-optimization", "fleet-hygiene", "<", "consumes reaper telemetry + rate-limit findings"],
  ["fleet-hygiene", "system-viz", ">", "queries graph for orphan/utilization classification"],
  ["fleet-hygiene", "hermes-zebra", "<>", "crashed-chat detection + subagent reap"],
  ["system-viz", "ai-training", ">", "seed-ghost ref-pool + node-embeddings → GNN tier-5"],
  // ---- hubs (explicit named edges; ↔ALL semantics noted in galaxy CLAUDE.md) ----
  ["agent-orchestration", "hermes-zebra", "<>", "agent-fleet orchestration peer"],
  ["agent-orchestration", "ai-training", ">", "per-task model routing"],
];

const SLOT = { cad: "delta", cam: "kilo", mill: "foxtrot", lathe: "whiskey", wedm: "mike", "speed-feed": "oscar", "post-processor": "echo", quoting: "charlie", business: "hotel", "ai-training": "india", "database-expansion": "juliett", "system-viz": "sierra", "fleet-hygiene": "golf", discovery: "tango", wiring: "romeo", "bug-hunting": "uniform", "backend-helper": "papa", "dormant-data": "victor", "token-optimization": "alpha", "blueprint-vision": "xray", academy: "lima", "frontend-app": "quebec", "hermes-zebra": "bravo/zebra" };

function partnersOf(g) {
  const out = [];
  for (const [a, b, dir, bridge] of EDGES) {
    if (a === g) out.push({ partner: b, role: dir === ">" ? "PRODUCES →" : dir === "<" ? "CONSUMES ←" : "↔", bridge });
    else if (b === g) out.push({ partner: a, role: dir === ">" ? "CONSUMES ←" : dir === "<" ? "PRODUCES →" : "↔", bridge });
  }
  return out;
}

function line({ partner, role, bridge }) {
  const slot = SLOT[partner] ? ` (${SLOT[partner]})` : "";
  return `- **${partner}${slot}** (\`engines/${partner}/\`) — ${role} ${bridge}. (symmetric ✓)`;
}

// Existing edge-section block text (used to detect already-declared partners).
function existingEdgeText(content) {
  const lines = content.split("\n");
  let buf = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^##+\s.*(Related galax|Cross-galaxy|Cross-refs)/i.test(lines[i]) || /Cross-galaxy edges/i.test(lines[i])) {
      for (let j = i + 1; j < lines.length && !/^##\s/.test(lines[j]); j++) buf.push(lines[j]);
    }
  }
  return buf.join("\n");
}

function main() {
  const galaxies = fs.readdirSync(ENGINES, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(ENGINES, d.name, "CLAUDE.md")))
    .map((d) => d.name);
  const report = { mode: APPLY ? "apply" : "dry-run", changed: [], skipped: [], errors: [] };

  for (const g of galaxies) {
    const partners = partnersOf(g);
    if (!partners.length) { report.skipped.push(`${g} (no matrix edges)`); continue; }
    const file = path.join(ENGINES, g, "CLAUDE.md");
    try {
      const content = fs.readFileSync(file, "utf8");
      const existing = existingEdgeText(content);
      // Missing = partner not already mentioned by name in any existing edge text.
      const missing = partners.filter((p) => !existing.includes(p.partner));
      // De-dup partners within this run (an edge could list a partner twice).
      const seen = new Set();
      const newLines = [];
      for (const p of missing) { if (!seen.has(p.partner)) { seen.add(p.partner); newLines.push(line(p)); } }
      if (!newLines.length) { report.skipped.push(`${g} (all ${partners.length} partners already declared)`); continue; }

      let updated;
      const hdr = "## Related galaxies (PSN edges — symmetric)";
      if (content.includes(hdr)) {
        // append missing lines into the existing gold section
        updated = content.replace(hdr + "\n", hdr + "\n" + newLines.join("\n") + "\n");
      } else if (/^## Cross-refs/m.test(content)) {
        updated = content.replace(/^## Cross-refs/m, hdr + "\n" + newLines.join("\n") + "\n\n## Cross-refs");
      } else {
        updated = content.replace(/\s*$/, "\n\n") + hdr + "\n" + newLines.join("\n") + "\n";
      }
      if (APPLY) fs.writeFileSync(file, updated, "utf8");
      report.changed.push({ galaxy: g, added: newLines.length, file: `mcp-server/src/engines/${g}/CLAUDE.md` });
    } catch (e) { report.errors.push({ galaxy: g, error: String(e && e.message || e) }); }
  }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n${report.mode}: ${report.changed.length} galaxies changed · ${report.skipped.length} skipped · ${report.errors.length} errors · total edges in matrix: ${EDGES.length}`);
  // emit the explicit file list for an absorption-safe commit
  if (report.changed.length) console.log("\nFILES:\n" + report.changed.map((c) => c.file).join(" "));
}

main();
