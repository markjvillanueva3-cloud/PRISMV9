// Throwaway: run full Stage 4 + Stage 5 wizard pipeline on a real JM-Die .MIN program.
// Used iter148 to surface what the wizard recommends for a real Mazak EIA dialect program.

import fs from "node:fs";
import { parseBlocks, validateThreading } from "../lathe-quality-pipeline.mjs";
import { createBridge } from "./lathe-shop-tool-library-bridge.mjs";
import { createTribalQueryEngine } from "./lathe-tribal-query-engine.mjs";
import { createInsertSelector } from "./lathe-wizard-vendor-lookup.mjs";
import { runStage4_Reason } from "./lathe-training-loop-stage-4-reason.mjs";
import { runStage5_Generate } from "./lathe-training-loop-stage-5-generate.mjs";

const TARGET = process.argv[2] || "H:/PRISM/JM DIE/CNC LATHE/ALCOA/A0137471.MIN";

// Minimal fixtures — operator should replace with real shop tool-list + corpus
const SHOP_INVENTORY = {
  ALCOA: {
    "*": {
      T0101: { insertAnsi: "CNMG-432-PR", vendor: "Kennametal", grade: "KCM35", geometry: "C", iso_group_fit: ["P-30"], suggestedVcSfm: [350, 420], suggestedFzIpr: [0.008, 0.014], lifeMinutesAtTargetVc: 18, coating: "PVD-TiAlN" }
    }
  }
};
const CORPUS = {
  vendor_grades: [
    { vendor: "Kennametal", grade: "KCM35", insertAnsi: "CNMG-432-PR", geometry: "C", coating: "PVD-TiAlN", iso_group_fit: ["P-30"], suggestedVcSfm: [350, 420], suggestedFzIpr: [0.008, 0.014], lifeMinutesAtTargetVc: 18, best_application: "roughing" }
  ],
  video_segments: [{ video_id: "synthetic", title: "stub", body: "stub", tags: ["stub"] }],
  tribal_tips: []
};

const bridge = createBridge({ layer1: SHOP_INVENTORY });
const queryEngine = createTribalQueryEngine(CORPUS);
const selector = createInsertSelector({ queryEngine, bridge });
const engines = { bridge, queryEngine, selector };

const program = fs.readFileSync(TARGET, "utf8");
const blocks = parseBlocks(program);
const threadReport = validateThreading(program, { controller: "fanuc", iso_group: "P" });

// Build a programReport in the shape Stage 4 expects
const programReport = {
  parsed: {
    ok: true,
    operation_sequence: blocks.some(b => b.g === "G71") ? ["od_rough"] : ["facing"],
    g_codes: [...new Set(blocks.filter(b => b.g).map(b => b.g))].sort(),
    spindle_mode: blocks.some(b => b.g === "G96") ? "G96" : "G97",
    spindle_value: null,
    tool_blocks: blocks
      .filter(b => /^T\d+/.test((b.text || "").trim()))
      .map(b => {
        const m = b.text.trim().match(/^T(\d{2,6})/);
        return m ? { tool_number: parseInt(m[1].slice(0, 2), 10), offset: m[1].length >= 4 ? parseInt(m[1].slice(2, 4), 10) : null } : null;
      })
      .filter(Boolean)
  },
  threadIssues: threadReport.issues,
  currentScore: 44,  // operator-claimed baseline (iter7 ALCOA)
  toolsValidated: false
};

// Infer controller from path (Okuma_/Mazak_/Haas_/Fanuc_/Doosan_ folders)
const controllerFromPath = (() => {
  const norm = TARGET.toLowerCase();
  if (/okuma_/.test(norm)) return "okuma";
  if (/mazak_/.test(norm)) return "mazak";
  if (/haas_/.test(norm)) return "haas";
  if (/doosan_/.test(norm)) return "doosan";
  // Bare .MIN files default to mazak (JM-Die source dialect)
  if (/\.min$/i.test(norm)) return "mazak";
  return "fanuc";
})();

const partSpec = {
  customer: "ALCOA",
  iso_group: "P-30",
  material: "AISI-1045",
  operations: ["roughing"],
  controller: controllerFromPath
};

const reasonReport = runStage4_Reason(programReport, partSpec, engines);
const proposed = runStage5_Generate(program, reasonReport, { controller: "fanuc", iso_group: "P-30" });

console.log(JSON.stringify({
  target: TARGET,
  original_lines: program.split(/\r?\n/).length,
  original_chars: program.length,
  parsed_block_count: blocks.length,
  current_score: reasonReport.current_score,
  target_score: reasonReport.target_score,
  expected_delta_score: reasonReport.expected_delta_score,
  recommendation_count: reasonReport.improvement_recommendations.length,
  recommendations: reasonReport.improvement_recommendations.map(r => ({ category: r.category, severity: r.severity, lever: r.lever, delta: r.delta_score, what: r.what })),
  changes_applied_count: proposed.changes_applied.length,
  changes_applied: proposed.changes_applied,
  unapplied_count: proposed.unapplied_recommendations.length,
  estimated_new_score: proposed.estimated_new_score,
  needs_operator_review: proposed.needs_operator_review,
  proposed_lines: proposed.text.split(/\r?\n/).length,
  proposed_chars: proposed.text.length
}, null, 2));
