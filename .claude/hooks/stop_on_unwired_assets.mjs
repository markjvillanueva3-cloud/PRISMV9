#!/usr/bin/env node
// tier: T0
/**
 * stop_on_unwired_assets.mjs — Stop Hook
 * ========================================
 *
 * BLOCKS session termination when newly-built assets are not yet
 * wired to their logical endpoints. This catches the "built it but
 * never wired it" pattern that creates orphan stagnation.
 *
 * Checks performed (fast, git-diff-scoped — does not scan the full
 * codebase):
 *
 *   1. NEW ENGINE FILES (src/engines/*Engine.ts) must be imported
 *      by at least one dispatcher under src/tools/dispatchers/.
 *      The dispatcher must reference the exported singleton or a
 *      lazy-import of the module — proving the engine has a
 *      callable endpoint.
 *
 *   2. NEW ENGINE FILES must have a matching test file under
 *      src/__tests__/. Test file must contain ≥ 10 `it(` cases.
 *      Catches: engines shipped without real tests.
 *
 *   3. NEW ACTIONS ADDED to any dispatcher's `ACTIONS` enum must
 *      have a matching `case "action_name":` handler in the same
 *      file. Catches: "added to enum but forgot the handler" which
 *      makes the action silently fall through to default/Unknown.
 *
 *   4. NEW HOOK FILES (.claude/hooks/*.mjs) should be registered in
 *      .claude/settings.json. Warn if missing (non-blocking — user
 *      may be testing before wiring).
 *
 * Escape hatch: set PRISM_ALLOW_UNWIRED=1 in the environment or
 * put `// WIRE-EXEMPT: <reason>` as a comment in the engine file
 * (e.g. for pure data-carrier types that intentionally have no
 * dispatcher endpoint).
 *
 * The hook is defensive — if git is not accessible or the working
 * tree cannot be analyzed, it passes through. Never breaks a
 * session on infrastructure failure.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = "H:/prism";
const ENGINES_DIR = "mcp-server/src/engines";
const DISPATCHERS_DIR = "mcp-server/src/tools/dispatchers";
const TESTS_DIR = "mcp-server/src/__tests__";
const HOOKS_DIR = ".claude/hooks";
const SETTINGS_FILE = ".claude/settings.json";

// ----------------------------------------------------------------
// Input
// ----------------------------------------------------------------
async function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); }
    };
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", finish);
    // Defend against no-stdin invocation
    setTimeout(finish, 1500);
  });
}

// ----------------------------------------------------------------
// Git helpers (shell out sparingly, fail-open)
// ----------------------------------------------------------------
function git(args) {
  try {
    return execSync(`git -C ${REPO_ROOT} ${args}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 8000,
    });
  } catch {
    return "";
  }
}

function listChangedFiles(hookInput) {
  // Scope: ONLY files THIS chat edited via Write/Edit/MultiEdit tools.
  //
  // Background: with ~6 concurrent chats sharing the same git tree,
  // using `git diff HEAD` + untracked lists every chat's in-flight work
  // and causes Chat A's Stop hook to block on Chat B's engines. To
  // prevent cross-chat pollution we scope by THIS session's tool-use
  // history, which Claude writes to a per-session JSONL transcript.
  //
  // The transcript path is passed to us on stdin as `transcript_path`
  // (always present for Stop hooks). We tail it and collect file_path
  // from every Write / Edit / MultiEdit tool_use entry. That set is
  // PRECISELY what this chat modified — no bleed-over possible.
  //
  // Fallback: if the transcript is unreadable or has no tool_uses yet
  // (e.g. a chat that only ran Bash), we return empty → hook allows.
  // Never fail-block on missing transcript data.
  const out = new Set();
  const transcriptPath = hookInput && typeof hookInput.transcript_path === "string"
    ? hookInput.transcript_path
    : "";
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return out; // no scope → allow
  }

  let raw;
  try {
    raw = fs.readFileSync(transcriptPath, "utf8");
  } catch {
    return out;
  }

  const RELEVANT_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
  for (const line of raw.split("\n")) {
    if (!line || line.length < 10) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    // Transcript format: each line is a message. Assistant messages
    // may contain content[] with { type: "tool_use", name, input }.
    const content = entry?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!block || block.type !== "tool_use") continue;
      if (!RELEVANT_TOOLS.has(block.name)) continue;
      const input = block.input || {};
      const paths = [];
      if (typeof input.file_path === "string") paths.push(input.file_path);
      if (typeof input.notebook_path === "string") paths.push(input.notebook_path);
      if (Array.isArray(input.edits)) {
        for (const e of input.edits) {
          if (e && typeof e.file_path === "string") paths.push(e.file_path);
        }
      }
      for (const abs of paths) {
        // Normalize to repo-relative POSIX path. Only include files
        // under REPO_ROOT; anything outside is out of scope.
        const norm = abs.replace(/\\/g, "/");
        const rootPosix = REPO_ROOT.replace(/\\/g, "/").replace(/\/$/, "");
        let rel = norm;
        if (norm.toLowerCase().startsWith(rootPosix.toLowerCase() + "/")) {
          rel = norm.slice(rootPosix.length + 1);
        } else {
          continue; // outside repo — skip
        }
        // We don't know status (added / modified) from the transcript
        // alone, so infer: if the file now exists on disk, treat as A
        // for new-engine matching; checkEngineWired handles both.
        out.add(`A\t${rel}`);
      }
    }
  }
  return out;
}

// ----------------------------------------------------------------
// Analysis
// ----------------------------------------------------------------
function extractSingletonName(engineFileContent) {
  // Pattern: `export const fooEngine = new ...` or
  // `export const foo = new ...Engine...`
  const m = engineFileContent.match(/export\s+const\s+([a-zA-Z_][\w]*Engine)\s*=/);
  return m ? m[1] : null;
}

function isWireExempt(engineFileContent) {
  return /WIRE-EXEMPT:/i.test(engineFileContent);
}

function checkEngineWired(engineRelPath) {
  // Returns { wired: bool, reason, singleton }
  const full = path.join(REPO_ROOT, engineRelPath);
  if (!fs.existsSync(full)) {
    return { wired: true, reason: "file missing (possibly deleted)", singleton: "" };
  }
  const content = fs.readFileSync(full, "utf8");
  if (isWireExempt(content)) {
    return { wired: true, reason: "WIRE-EXEMPT marker", singleton: "" };
  }
  const singleton = extractSingletonName(content);
  if (!singleton) {
    // Engine without a standard singleton export — skip (pure data
    // module, not a callable endpoint).
    return { wired: true, reason: "no singleton export (data module)", singleton: "" };
  }
  // Search dispatchers for import of the singleton
  const dispatchersDir = path.join(REPO_ROOT, DISPATCHERS_DIR);
  if (!fs.existsSync(dispatchersDir)) {
    return { wired: true, reason: "dispatchers dir missing", singleton };
  }
  const dispatcherFiles = fs
    .readdirSync(dispatchersDir)
    .filter((f) => f.endsWith(".ts"));
  const moduleName = path.basename(engineRelPath).replace(/\.ts$/, "");

  for (const f of dispatcherFiles) {
    const body = fs.readFileSync(path.join(dispatchersDir, f), "utf8");
    // Match: import { xEngine } from ... OR await import("../../engines/XEngine.js")
    if (
      body.includes(`${singleton}`) ||
      body.includes(`/${moduleName}.js`) ||
      body.includes(`/${moduleName}"`)
    ) {
      return { wired: true, reason: `dispatcher ${f}`, singleton };
    }
  }
  return {
    wired: false,
    reason: `no dispatcher imports ${singleton} or ${moduleName}`,
    singleton,
  };
}

function collectTestFiles(dir) {
  // Recursively collect all .test.ts files under dir
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTestFiles(fullPath));
    } else if (entry.name.endsWith(".test.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

function checkEngineTested(engineRelPath) {
  const base = path.basename(engineRelPath).replace(/\.ts$/, "");
  // WIRE-EXEMPT marker exempts from BOTH wiring and test checks — the
  // documented escape hatch covers intentional library helpers and
  // placeholder stubs that would otherwise demand ceremonial tests.
  const full = path.join(REPO_ROOT, engineRelPath);
  if (fs.existsSync(full)) {
    const content = fs.readFileSync(full, "utf8");
    if (isWireExempt(content)) {
      return { tested: true, reason: "WIRE-EXEMPT marker", cases: 0 };
    }
  } else {
    // Engine file doesn't exist (deleted/renamed) — skip test check
    return { tested: true, reason: "file missing (stale transcript reference)", cases: 0 };
  }
  const testsDir = path.join(REPO_ROOT, TESTS_DIR);
  if (!fs.existsSync(testsDir)) {
    return { tested: false, reason: "no tests dir", cases: 0 };
  }
  // Recursively search __tests__ and subdirectories (e.g. __tests__/engines/)
  const allTestFiles = collectTestFiles(testsDir);
  const candidates = allTestFiles.filter((fullPath) => {
    const f = path.basename(fullPath).toLowerCase();
    return (
      f === `${base.toLowerCase()}.test.ts` ||
      f.startsWith(`${base.toLowerCase()}.`) ||
      f.includes(base.toLowerCase())
    );
  });
  if (candidates.length === 0) {
    return { tested: false, reason: `no matching test file for ${base}`, cases: 0 };
  }
  let totalCases = 0;
  for (const fullPath of candidates) {
    const body = fs.readFileSync(fullPath, "utf8");
    // Count `it(` occurrences as a proxy for test case count.
    const matches = body.match(/\bit\s*\(/g) || [];
    totalCases += matches.length;
  }
  if (totalCases < 10) {
    return {
      tested: false,
      reason: `only ${totalCases} test case(s) in ${path.basename(candidates[0])} — need ≥ 10`,
      cases: totalCases,
    };
  }
  return { tested: true, reason: `${totalCases} cases in ${path.basename(candidates[0])}`, cases: totalCases };
}

function checkDispatcherActionHandlers(dispatcherRelPath) {
  // For each action name in the file's ACTIONS enum, ensure a
  // corresponding handler exists in the file. Supports two patterns:
  //   1. switch/case: `case "action_name":`
  //   2. lookup table: `action_name:` as key in ACTION_HANDLERS object
  const full = path.join(REPO_ROOT, dispatcherRelPath);
  if (!fs.existsSync(full)) return { missing: [] };
  const body = fs.readFileSync(full, "utf8");

  // Extract all ACTIONS-style enums (robust to multiple in a file)
  const enumBlocks = [];
  const re = /(?:const\s+\w*ACTIONS\w*\s*=\s*\[([\s\S]*?)\]\s*as\s+const)/g;
  let m;
  while ((m = re.exec(body)) !== null) enumBlocks.push(m[1]);
  if (enumBlocks.length === 0) return { missing: [] };

  const actionNames = new Set();
  for (const block of enumBlocks) {
    const actionRe = /"([a-z][a-z0-9_]*)"/g;
    let a;
    while ((a = actionRe.exec(block)) !== null) actionNames.add(a[1]);
  }
  if (actionNames.size === 0) return { missing: [] };

  const missing = [];
  for (const name of actionNames) {
    // Pattern 1: switch/case handler
    const caseRe = new RegExp(`case\\s+["'\`]${name}["'\`]\\s*:`);
    // Pattern 2: ACTION_HANDLERS lookup table key (e.g., `action_name: handleFunc,`)
    // Matches: action_name: handleXxx OR action_name: async ... OR action_name: (params) =>
    const handlerRe = new RegExp(`\\b${name}\\s*:\\s*(handle[A-Z]|async\\s|\\()`);
    // Pattern 3: Plain object key assignment (e.g., `action_name: handleActionName`)
    const objKeyRe = new RegExp(`["'\`]?${name}["'\`]?\\s*:\\s*["'\`a-zA-Z_]`);
    if (!caseRe.test(body) && !handlerRe.test(body) && !objKeyRe.test(body)) {
      missing.push(name);
    }
  }
  return { missing };
}

function checkNewHookRegistered(hookRelPath) {
  // Hooks may be wired in EITHER the project-level settings (this repo) OR the
  // user-level settings (C:/Users/<user>/.claude/settings.json, mirrored to
  // H:/.claude/settings.json). Read all that exist and consider the hook
  // registered if it appears in any one — single-source-of-truth was a false
  // assumption; in practice both surfaces are load-bearing.
  const projectSettings = path.join(REPO_ROOT, SETTINGS_FILE);
  const userHomeC = process.env.USERPROFILE || process.env.HOME || "C:/Users/wompu";
  const userSettingsC = path.join(userHomeC, ".claude", "settings.json").replace(/\\/g, "/");
  const userSettingsH = "H:/.claude/settings.json";
  const candidates = [projectSettings, userSettingsC, userSettingsH];

  const base = path.basename(hookRelPath);
  let foundIn = null;
  for (const f of candidates) {
    if (!fs.existsSync(f)) continue;
    const body = fs.readFileSync(f, "utf8");
    if (body.includes(base)) {
      foundIn = f;
      break;
    }
  }
  return {
    registered: foundIn !== null,
    reason: foundIn ? `found in ${path.basename(path.dirname(foundIn)) === ".claude" ? path.basename(foundIn) : foundIn}` : "not referenced in any settings.json (project or user)",
  };
}

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------
async function main() {
  const hookInput = await readStdin();

  // Escape hatch
  if (process.env.PRISM_ALLOW_UNWIRED === "1") {
    console.log(JSON.stringify({ decision: "approve", reason: "PRISM_ALLOW_UNWIRED=1" }));
    return;
  }

  const changes = listChangedFiles(hookInput);
  if (changes.size === 0) {
    console.log(JSON.stringify({
      decision: "approve",
      reason: "no files edited by this chat (transcript-scoped)"
    }));
    return;
  }

  const newEngines = [];
  const changedDispatchers = new Set();
  const newHooks = [];

  for (const entry of changes) {
    const [status, ...rest] = entry.split("\t");
    const p = rest.join("\t");
    if (status === "D") continue; // deletions: not our concern
    // New engines (added) only — modifications of existing engines
    // are out of scope (they may have been wired long ago).
    if (
      status === "A" &&
      p.startsWith(ENGINES_DIR) &&
      p.endsWith("Engine.ts") &&
      !p.includes("__tests__/")
    ) {
      newEngines.push(p);
    }
    if (p.startsWith(DISPATCHERS_DIR) && p.endsWith(".ts")) {
      changedDispatchers.add(p);
    }
    if (status === "A" && p.startsWith(HOOKS_DIR) && p.endsWith(".mjs")) {
      newHooks.push(p);
    }
  }

  const violations = [];
  const warnings = [];

  // Check 1 + 2: new engines wired + tested
  for (const eng of newEngines) {
    const wired = checkEngineWired(eng);
    if (!wired.wired) {
      violations.push(`ORPHAN ENGINE: ${eng} — ${wired.reason}`);
    }
    const tested = checkEngineTested(eng);
    if (!tested.tested) {
      violations.push(`UNTESTED ENGINE: ${eng} — ${tested.reason}`);
    }
  }

  // Check 3: new actions in dispatcher enums must have handlers
  for (const disp of changedDispatchers) {
    const { missing } = checkDispatcherActionHandlers(disp);
    if (missing.length > 0) {
      violations.push(
        `UNHANDLED ACTIONS in ${disp}: ${missing.slice(0, 5).join(", ")}${
          missing.length > 5 ? " …(+" + (missing.length - 5) + " more)" : ""
        }`,
      );
    }
  }

  // Check 4: new hooks should be registered (warning only)
  for (const hk of newHooks) {
    const reg = checkNewHookRegistered(hk);
    if (!reg.registered) {
      warnings.push(`UNREGISTERED HOOK: ${hk} — ${reg.reason}`);
    }
  }

  if (violations.length === 0) {
    const note = warnings.length
      ? ` (warnings: ${warnings.length})`
      : "";
    console.log(
      JSON.stringify({
        decision: "approve",
        reason: `wiring audit clean — ${newEngines.length} new engine(s), ${changedDispatchers.size} dispatcher(s), ${newHooks.length} new hook(s)${note}`,
        warnings,
      }),
    );
    return;
  }

  const bullets = violations.map((v) => `  • ${v}`).join("\n");
  const warnLine = warnings.length
    ? `\n\nNon-blocking warnings:\n${warnings.map((w) => `  • ${w}`).join("\n")}`
    : "";
  const reason = `WIRING ENFORCEMENT — ${violations.length} unwired/unhandled/untested asset(s) detected:\n${bullets}${warnLine}\n\nFix:\n  • Engines: add lazy import + case handler in a dispatcher under src/tools/dispatchers/, or mark as '// WIRE-EXEMPT: <reason>' if intentional.\n  • Actions: every name in the ACTIONS enum must have a 'case "name":' handler in the same file.\n  • Tests: each engine needs a matching __tests__/<Name>.test.ts with ≥ 10 it() cases.\n\nEscape hatch: set PRISM_ALLOW_UNWIRED=1 to bypass this session only.`;

  console.log(JSON.stringify({ decision: "block", reason }));
}

main().catch((e) => {
  // Fail-open on infrastructure errors — we must never break a
  // legitimate stop on our own bugs.
  console.log(
    JSON.stringify({
      decision: "approve",
      reason: `stop_on_unwired_assets error (fail-open): ${e.message}`,
    }),
  );
});
