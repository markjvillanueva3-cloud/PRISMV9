// Throwaway batch runner: wizard across multiple JM-Die programs.
// Surfaces dialect cross-contamination, parsing failures, and per-program rec counts.
// Used iter163 to establish a cross-program quality baseline.

import fs from "node:fs";
import path from "node:path";
import { parseBlocks, validateThreading } from "../lathe-quality-pipeline.mjs";
import { createBridge } from "./lathe-shop-tool-library-bridge.mjs";
import { createTribalQueryEngine } from "./lathe-tribal-query-engine.mjs";
import { createInsertSelector } from "./lathe-wizard-vendor-lookup.mjs";
import { runStage4_Reason } from "./lathe-training-loop-stage-4-reason.mjs";
import { runStage5_Generate } from "./lathe-training-loop-stage-5-generate.mjs";

// Curated list — operator can extend by editing
const TARGETS = [
  "H:/PRISM/JM DIE/CNC LATHE/ALCOA/A0137471.MIN",
  "H:/PRISM/JM DIE/CNC LATHE/ALCOA/A100-A-0626.MIN",
  "H:/PRISM/JM DIE/CNC LATHE/ALCOA/A100-A-0627.MIN",
  "H:/PRISM/JM DIE/CNC LATHE/ITW/025-325218-01.MIN",
  "H:/PRISM/JM DIE/CNC LATHE/ACME/11-10715-0-A.MIN",
  "H:/PRISM/JM DIE/CNC LATHE/ACME/11-10715-0-B.MIN",
  "H:/PRISM/JM DIE/CNC LATHE/ACME/750-FEEDROLL-1065.MIN",
  "H:/PRISM/JM DIE/CNC LATHE/AGRATI/9075049 REV A.MIN",
  "H:/PRISM/JM DIE/CNC LATHE/ALCOA/PRISM_UPGRADED/Okuma_LB-3000EX/A0137471.nc",
  "H:/PRISM/JM DIE/CNC LATHE/ALCOA/PRISM_UPGRADED/Okuma_LB-3000EX/A100-A-0626.nc",
  "H:/PRISM/JM DIE/CNC LATHE/ALCOA/PRISM_UPGRADED/Okuma_GENOS_L300-M/A0137471.nc",
  "H:/PRISM/JM DIE/CNC LATHE/ALCOA/PRISM_UPGRADED/Okuma_Multus_B250II/A0137471.nc"
];

const T01_DEFAULT = { insertAnsi: "CNMG-432-PR", vendor: "Kennametal", grade: "KCM35", geometry: "C", iso_group_fit: ["P-30"], suggestedVcSfm: [350, 420], suggestedFzIpr: [0.008, 0.014], lifeMinutesAtTargetVc: 18, coating: "PVD-TiAlN" };
const SHOP_INVENTORY = {
  ALCOA:  { "*": { T0101: T01_DEFAULT } },
  ITW:    { "*": { T0101: T01_DEFAULT } },
  ACME:   { "*": { T0101: T01_DEFAULT } },
  AGRATI: { "*": { T0101: T01_DEFAULT } }
};
const CORPUS = {
  vendor_grades: [
    { vendor: "Kennametal", grade: "KCM35", insertAnsi: "CNMG-432-PR", geometry: "C", coating: "PVD-TiAlN", iso_group_fit: ["P-30"], suggestedVcSfm: [350, 420], suggestedFzIpr: [0.008, 0.014], lifeMinutesAtTargetVc: 18, best_application: "roughing" }
  ],
  video_segments: [{ video_id: "stub", title: "stub", body: "stub", tags: ["stub"] }],
  tribal_tips: []
};

function inferController(filepath) {
  const norm = filepath.toLowerCase();
  if (/okuma_/.test(norm)) return "okuma";
  if (/mazak_/.test(norm)) return "mazak";
  if (/haas_/.test(norm)) return "haas";
  if (/doosan_/.test(norm)) return "doosan";
  if (/\.min$/i.test(norm)) return "mazak";
  return "fanuc";
}

function inferCustomer(filepath) {
  const m = filepath.match(/CNC LATHE\/([^/]+)\//i);
  return m ? m[1].toUpperCase() : "UNKNOWN";
}

const bridge = createBridge({ layer1: SHOP_INVENTORY });
const queryEngine = createTribalQueryEngine(CORPUS);
const selector = createInsertSelector({ queryEngine, bridge });
const engines = { bridge, queryEngine, selector };

const results = [];
for (const target of TARGETS) {
  try {
    if (!fs.existsSync(target)) {
      results.push({ target: path.basename(target), error: "file not found" });
      continue;
    }
    const program = fs.readFileSync(target, "utf8");
    const blocks = parseBlocks(program);
    const threadReport = validateThreading(program, { controller: inferController(target), iso_group: "P" });
    const partSpec = {
      customer: inferCustomer(target),
      iso_group: "P-30",
      material: "AISI-1045",
      operations: ["roughing"],
      controller: inferController(target)
    };
    const programReport = {
      parsed: {
        ok: true,
        operation_sequence: [],
        g_codes: [...new Set(blocks.filter(b => b.g).map(b => b.g))].sort(),
        spindle_mode: blocks.some(b => b.g === "G96") ? "G96" : "G97",
        spindle_value: null,
        tool_blocks: blocks
          .filter(b => /^T\d+/.test((b.text || "").trim()))
          .map(b => {
            const m = b.text.trim().match(/^T(\d{2,6})/);
            return m ? { tool_number: parseInt(m[1].slice(0, 2), 10), offset: m[1].length >= 4 ? parseInt(m[1].slice(2, 4), 10) : null, text: b.text } : null;
          })
          .filter(Boolean)
      },
      threadIssues: threadReport.issues,
      currentScore: 44
    };
    const reasonReport = runStage4_Reason(programReport, partSpec, engines);
    const proposed = runStage5_Generate(program, reasonReport, { controller: partSpec.controller, iso_group: "P-30" });

    results.push({
      target: path.basename(target),
      customer: partSpec.customer,
      controller: partSpec.controller,
      lines: program.split(/\r?\n/).length,
      chars: program.length,
      proposed_chars: proposed.text.length,
      byte_exact: proposed.text.length === program.length,
      thread_count: threadReport.thread_block_count,
      thread_issues: threadReport.issues.length,
      recommendation_count: reasonReport.improvement_recommendations.length,
      rec_categories: [...new Set(reasonReport.improvement_recommendations.map(r => r.category))],
      changes_applied: proposed.changes_applied.length,
      unapplied: proposed.unapplied_recommendations.length
    });
  } catch (e) {
    results.push({ target: path.basename(target), error: e.message });
  }
}

console.log(JSON.stringify(results, null, 2));
console.log(`\nSUMMARY: ${results.filter(r => !r.error).length}/${TARGETS.length} programs processed cleanly.`);
console.log(`Byte-exact round-trips: ${results.filter(r => r.byte_exact).length}/${results.filter(r => !r.error).length}`);
console.log(`Total recommendations: ${results.filter(r => !r.error).reduce((s, r) => s + (r.recommendation_count || 0), 0)}`);
console.log(`Programs with changes auto-applied: ${results.filter(r => r.changes_applied > 0).length}`);
