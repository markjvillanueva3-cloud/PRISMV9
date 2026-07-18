// Throwaway: probe wizard against ONE real JM-Die .MIN program.
// Used iter145 to surface real-world parsing/validation issues before formal integration tests.

import fs from "node:fs";
import { parseBlocks, validateThreading } from "../lathe-quality-pipeline.mjs";

const TARGET = process.argv[2] || "H:/PRISM/JM DIE/CNC LATHE/ALCOA/A0137471.MIN";

const program = fs.readFileSync(TARGET, "utf8");
const blocks = parseBlocks(program);
const threadReport = validateThreading(program, { controller: "fanuc", iso_group: "P" });

const report = {
  program_path: TARGET,
  program_chars: program.length,
  program_lines: program.split(/\r?\n/).length,
  parsed_block_count: blocks.length,
  g_codes_present: [...new Set(blocks.filter(b => b.g).map(b => b.g))].sort(),
  t_blocks: blocks.filter(b => /^T\d+/.test((b.text || "").trim())).map(b => b.text.trim()).slice(0, 5),
  thread_block_count: threadReport.thread_block_count,
  thread_issues_count: threadReport.issues.length,
  thread_issues: threadReport.issues.slice(0, 5),
  all_threads_passed: threadReport.all_passed,
  first_5_lines: program.split(/\r?\n/).slice(0, 5)
};

console.log(JSON.stringify(report, null, 2));
