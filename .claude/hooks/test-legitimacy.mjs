// tier: T0
import fs from "node:fs";
/**
 * test-legitimacy.mjs — Phase 1 Tier 5D Workflow Hook
 * Blocks placeholder tests with no real assertions.
 */

import * as path from "path";
import { fileURLToPath } from "node:url";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}
import {
  detectCriticalDomainViolation,
  detectSyntheticGeneration,
  detectTaskContextMismatch,
} from "../helpers/lib/test-legitimacy-core.mjs";

const PLACEHOLDER_PATTERNS = [
  { re: /expect\(true\)\.toBe\(true\)/, label: "tautological true assertion" },
  { re: /expect\(1\)\.toBe\(1\)/, label: "tautological numeric assertion" },
  { re: /\.to(?:BeDefined|BeTruthy|BeUndefined|BeFalsy)\s*\(\s*\)\s*;?\s*$/m, label: "weak presence-only assertion" },
  { re: /it\s*\(['"]\s*should\s+(?:work|pass)\s*['"]\s*,\s*\(\)\s*=>\s*\{\s*\}\s*\)/, label: "empty should-work/should-pass test" },
  { re: /\b(?:describe|it|test)\.skip\s*\(/, label: "skipped test" },
  { re: /\.only\s*\(/, label: "focused .only test" },
];

function isTestFile(filePath) {
  return filePath && (filePath.includes(".test.") || filePath.includes(".spec."));
}

function contentFromInput(tool, input) {
  if (tool === "Write") return input.content || "";
  if (tool === "Edit") return input.new_string || input.newString || "";
  if (tool === "MultiEdit") {
    return (input.edits || []).map((edit) => edit.new_string || edit.newString || "").join("\n");
  }
  return "";
}

function analyzeTestContent(filePath, content) {
  const reasons = [];

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.re.test(content)) {
      reasons.push(`placeholder test pattern: ${pattern.label}`);
    }
  }

  const synthetic = detectSyntheticGeneration(content);
  if (synthetic.suspicious) {
    const kinds = synthetic.findings.map((finding) => `${finding.kind}(${finding.count})`).join(", ");
    reasons.push(`synthetic mass-generation detected: ${kinds}`);
  }

  const critical = detectCriticalDomainViolation({ filePath, content });
  if (critical.block) {
    reasons.push(critical.reason);
  }

  const mismatch = detectTaskContextMismatch({ content });
  if (mismatch.mismatch) {
    reasons.push(mismatch.reason);
  }

  return reasons.filter(Boolean);
}

export default async function testLegitimacy({ tool, input }) {
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) return { allow: true };
  const filePath = input.file_path || input.path;
  if (!filePath || !isTestFile(filePath)) return { allow: true };

  const content = contentFromInput(tool, input);
  const reasons = analyzeTestContent(filePath, content);
  if (reasons.length > 0) {
    return {
      allow: false,
      message: `TEST LEGITIMACY: ${path.basename(filePath)} is not valid coverage. ${reasons.slice(0, 4).join("; ")}. Write real assertions against real behavior.`,
    };
  }
  return { allow: true };
}

export const metadata = { id: "test-legitimacy", phase: "1", tier: "5D", event: "PreToolWrite" };

async function main() {
  const raw = readStdinSafe();

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const tool = payload.tool_name || payload.toolName || payload.tool || "";
  const input = payload.tool_input || payload.toolInput || payload.input || {};
  const filePath = input.file_path || input.filePath || input.path || "";

  if (!["Write", "Edit", "MultiEdit"].includes(tool) || !isTestFile(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const content = contentFromInput(tool, input);
  if (!content) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const reasons = analyzeTestContent(filePath, content);
  if (reasons.length > 0) {
    // PreToolUse block contract: {decision:"block", reason:"..."}.
    // {continue:false, message:} is silently dropped.
    console.log(JSON.stringify({
      decision: "block",
      reason: `TEST LEGITIMACY GATE — BLOCKED\n\n${path.basename(filePath)} is not valid coverage:\n${reasons.slice(0, 6).map((reason) => `- ${reason}`).join("\n")}\n\nWrite real assertions against real behavior. Synthetic loops, placeholder assertions, and mocked critical-domain SUTs do not count.`,
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && path.resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  main().catch(() => {
    console.log(JSON.stringify({ continue: true }));
  });
}
