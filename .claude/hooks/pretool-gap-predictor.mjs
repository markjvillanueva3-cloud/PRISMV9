#!/usr/bin/env node
// tier: T4
/**
 * pretool-gap-predictor.mjs — PreToolUse Write|Edit hook
 *
 * Per U-FORE-03 spec: scans in-flight file content against the 15 commonly
 * missed patterns BEFORE the tool call lands, surfacing severity-4+ findings
 * as hook context so Claude can fix gaps before writing.
 *
 * Non-blocking — even severity-5 findings advise, never deny. The build-guard
 * + completeness hooks already hard-block known-bad patterns; this hook is
 * early warning only.
 *
 * Time-budgeted — hard-kills at 250 ms. Skips non-TS/JS files.
 *
 * @module hooks/pretool-gap-predictor
 */

import * as fs from "node:fs";
import * as path from "node:path";

const TIME_BUDGET_MS = 250;

// Inline minimal detector — mirrors CommonlyMissedPatternsRegistry detectors
// for the severity-4+ cases. Full registry runs via prism_dev:gap_predict.
const INLINE_DETECTORS = [
  { id: "not_implemented_throw", sev: 5, msg: "throw new Error('not implemented') stub",
    rx: /throw\s+new\s+Error\(\s*["'`]not\s+implemented/i },
  { id: "inline_physics_constant", sev: 5, msg: "inline Kienzle/Taylor constant — use physics/constants.ts",
    rx: /\bkc1_1\b\s*[:=]\s*\d|\btaylor_c\s*[:=]\s*\d/i },
  { id: "toBeDefined_only", sev: 5, msg: "test uses only toBeDefined() — add real assertions",
    rx: /\.test\.ts$/ },
  { id: "only_left_in_tests", sev: 5, msg: ".only() will skip other tests on CI",
    rx: /\b(it|describe|test)\.only\b/ },
  { id: "silent_catch", sev: 4, msg: "empty catch block — log, rethrow, or typed failure",
    rx: /\bcatch\s*\([^)]*\)\s*\{\s*\}/ },
  { id: "await_in_for_loop", sev: 4, msg: "await in .forEach(async) — await is ignored",
    rx: /\.forEach\s*\(\s*async\b/ },
];

function detect(filePath, content) {
  const hits = [];
  for (const d of INLINE_DETECTORS) {
    // toBeDefined_only needs a secondary check
    if (d.id === "toBeDefined_only") {
      if (!d.rx.test(filePath)) continue;
      if (
        /toBeDefined\s*\(\)/.test(content) &&
        !/toBe\s*\(|toEqual\s*\(|toMatch\s*\(|toThrow\s*\(/.test(content)
      ) {
        hits.push(d);
      }
      continue;
    }
    if (d.id === "only_left_in_tests") {
      if (!/\.test\.ts$/.test(filePath)) continue;
      if (d.rx.test(content)) hits.push(d);
      continue;
    }
    if (d.rx.test(content)) hits.push(d);
  }
  return hits;
}

function formatMessage(hits, filePath) {
  const lines = [
    `🔍 GAP PREDICTOR — ${hits.length} severity-4+ finding(s) in ${path.basename(filePath)}:`,
  ];
  for (const h of hits.slice(0, 5)) {
    const icon = h.sev === 5 ? "🔴" : "🟠";
    lines.push(`  ${icon} [sev ${h.sev}] ${h.id}: ${h.msg}`);
  }
  if (hits.length > 5) {
    lines.push(`  … +${hits.length - 5} more (run prism_dev:gap_predict for full report)`);
  }
  lines.push(`  Fix before writing — or run prism_dev:gap_predict after for full 15-pattern scan.`);
  return lines.join("\n");
}

async function main() {
  const killer = setTimeout(() => {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }, TIME_BUDGET_MS);

  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, "utf8"));
  } catch {
    clearTimeout(killer);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const { tool_name, tool_input } = input;
  if (!["Write", "Edit", "MultiEdit"].includes(tool_name)) {
    clearTimeout(killer);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = tool_input?.file_path;
  if (!filePath || !/\.(ts|tsx|js|mjs)$/.test(filePath)) {
    clearTimeout(killer);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // For Write: content is in tool_input.content
  // For Edit: we look at the new_string
  // For MultiEdit: join all new_strings
  let content = "";
  if (tool_name === "Write") {
    content = tool_input?.content || "";
  } else if (tool_name === "Edit") {
    content = tool_input?.new_string || "";
  } else if (tool_name === "MultiEdit") {
    const edits = tool_input?.edits || [];
    content = edits.map((e) => e.new_string || "").join("\n");
  }

  if (!content) {
    clearTimeout(killer);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const hits = detect(filePath, content);
  clearTimeout(killer);

  if (hits.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  console.log(
    JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: formatMessage(hits, filePath), } })
  );
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
