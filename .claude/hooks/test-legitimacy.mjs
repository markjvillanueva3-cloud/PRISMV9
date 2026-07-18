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
  detectShallowCriticalTest,
} from "../helpers/lib/test-legitimacy-core.mjs";

// UNCONDITIONAL placeholder patterns -- unambiguous fake-test smells that block
// on ANY occurrence, even inside an Edit fragment (a tautological assertion /
// .skip / .only is never legitimate regardless of the rest of the file).
// Verified against the live 6,499-file corpus: 48 pre-existing files trip these
// and every one is a genuine violation (zero false positives).
const PLACEHOLDER_PATTERNS = [
  { re: /expect\(true\)\.toBe\(true\)/, label: "tautological true assertion" },
  { re: /expect\(1\)\.toBe\(1\)/, label: "tautological numeric assertion" },
  { re: /it\s*\(['"]\s*should\s+(?:work|pass)\s*['"]\s*,\s*\(\)\s*=>\s*\{\s*\}\s*\)/, label: "empty should-work/should-pass test" },
  { re: /\b(?:describe|it|test)\.skip\s*\(/, label: "skipped test" },
  { re: /\.only\s*\(/, label: "focused .only test" },
];

// Weak presence-only assertion (.toBeDefined() / .toBeTruthy() etc. with no
// argument, at end of line). A SINGLE such line is NOT a fake test -- a real
// test with 50 reference-value assertions plus one smoke check is legitimate.
// The fake-test signal is FILE-LEVEL DOMINANCE: the file does NOTHING but
// presence checks. Blocking on any single occurrence false-positived 1,806 of
// 1,821 real test files (~99% FP) in the live corpus; the dominance rule (weak
// present AND zero strong assertions) blocks only the ~15 genuine pure-stub
// files. (calibrated 2026-06-23 slot:alpha -- measured, see commit body.)
const WEAK_PRESENCE_RE = /\.to(?:BeDefined|BeTruthy|BeUndefined|BeFalsy)\s*\(\s*\)\s*;?\s*$/m;
// Any real assertion form exempts the file from the presence-only stub block.
// Non-global on purpose -- used only with .test() (a /g flag makes .test()
// stateful via lastIndex and would intermittently miss).
const STRONG_ASSERTION_RE = /\.(?:toEqual|toBe|toMatchObject|toStrictEqual|toContain|toContainEqual|toMatch|toHaveLength|toBeCloseTo|toBeGreaterThan|toBeGreaterThanOrEqual|toBeLessThan|toBeLessThanOrEqual|toThrow|toThrowError|toHaveBeenCalled|toHaveBeenCalledWith|toHaveProperty|toBeInstanceOf|toBeNull|toBeNaN|toHaveReturned)\b/;

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

// Best-effort read of the on-disk file. For an Edit/MultiEdit the hook only
// receives the changed fragment, not the whole file -- so to judge file-level
// dominance we combine the existing on-disk content with the incoming fragment.
// Fails open to "" (a missing file means a fresh Write, where content IS full).
function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, "utf8"); } catch { return ""; }
}

// The content used for FILE-LEVEL checks (presence-only dominance). For a Write
// the incoming content is the full file. For Edit/MultiEdit, splice the fragment
// onto the current on-disk file so strong assertions already present count --
// adding one `.toBeDefined()` smoke line to a real test must NOT block.
function effectiveFullContent(tool, input, fragment) {
  if (tool === "Write") return fragment;
  const filePath = input.file_path || input.path;
  const existing = filePath ? readFileSafe(filePath) : "";
  return existing ? `${existing}\n${fragment}` : fragment;
}

function analyzeTestContent(filePath, content, fullContent = content) {
  const reasons = [];

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.re.test(content)) {
      reasons.push(`placeholder test pattern: ${pattern.label}`);
    }
  }

  // Presence-only stub: the file does nothing but weak presence checks. Judged
  // on the WHOLE file (fullContent), not a fragment -- a single smoke assertion
  // alongside real assertions is legitimate; a file with ONLY presence checks
  // verifies nothing real.
  if (WEAK_PRESENCE_RE.test(fullContent) && !STRONG_ASSERTION_RE.test(fullContent)) {
    reasons.push(
      "all-presence-only stub: weak .toBeDefined()/.toBeTruthy() assertion(s) with NO strong assertion (toEqual/toBe/toThrow/...) in the file -- it verifies nothing real",
    );
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

export default async function testLegitimacy({ tool, input } = {}) {
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) return { allow: true };
  const inp = input || {};
  const filePath = inp.file_path || inp.path;
  if (!filePath || !isTestFile(filePath)) return { allow: true };

  const content = contentFromInput(tool, inp);
  const fullContent = effectiveFullContent(tool, inp, content);
  const reasons = analyzeTestContent(filePath, content, fullContent);
  if (reasons.length > 0) {
    return {
      allow: false,
      message: `TEST LEGITIMACY: ${path.basename(filePath)} is not valid coverage. ${reasons.slice(0, 4).join("; ")}. Write real assertions against real behavior.`,
    };
  }
  const shallow = detectShallowCriticalTest({ filePath, content: fullContent });
  if (shallow.advise) {
    // Non-blocking RIGOR advisory (never blocks) -- see test-legitimacy-core.mjs.
    return { allow: true, advisory: `TEST RIGOR ADVISORY -- ${path.basename(filePath)}: ${shallow.reason}` };
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

  const fullContent = effectiveFullContent(tool, input, content);
  const reasons = analyzeTestContent(filePath, content, fullContent);
  if (reasons.length > 0) {
    // PreToolUse block contract: {decision:"block", reason:"..."}.
    // {continue:false, message:} is silently dropped.
    console.log(JSON.stringify({
      decision: "block",
      reason: `TEST LEGITIMACY GATE — BLOCKED\n\n${path.basename(filePath)} is not valid coverage:\n${reasons.slice(0, 6).map((reason) => `- ${reason}`).join("\n")}\n\nWrite real assertions against real behavior. Synthetic loops, placeholder assertions, and mocked critical-domain SUTs do not count.`,
    }));
    return;
  }

  // Non-blocking RIGOR advisory -- nudge a thin critical-domain test toward
  // failure-mode + adversarial coverage. NEVER blocks (the regex layer cannot
  // separate a thin regression-lock from a thin stub; the AI judge decides).
  const shallow = detectShallowCriticalTest({ filePath, content: fullContent });
  if (shallow.advise) {
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `TEST RIGOR ADVISORY -- ${path.basename(filePath)}: ${shallow.reason}`,
      },
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
