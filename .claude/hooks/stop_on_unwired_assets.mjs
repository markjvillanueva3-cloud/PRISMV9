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

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
// Changed-file discovery (transcript-scoped -- no git shell-out)
// ----------------------------------------------------------------
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

/**
 * Decide whether a module is TYPE-ONLY -- it exports ONLY TS types/interfaces
 * (`export type`, `export interface`, `export type { ... } from`) and therefore erases
 * to ZERO runtime JavaScript. Such a file (e.g. a conventionally-named `IFooEngine.ts`
 * re-export) has no runtime to wire OR test, so demanding >=10 `it()` cases for it is a
 * false-positive. Cloned (clone-don't-fork, R15) from scripts/audit-unwired-engines.mjs's
 * isTypeOnlyModule -- the SIBLING orphan detector that classifies such files TYPE-ONLY
 * (U-AUDIT-TYPE-ONLY 2026-06-22). checkEngineWired already escapes them via the
 * "no singleton export (data module)" path; checkEngineTested needs this parallel escape.
 * CONSERVATIVE (R12 -- never wrongly demand a test of a real engine): true ONLY when the
 * comment-stripped source has a POSITIVE type-export AND zero runtime-export signals (any
 * const/let/var/function/class/default/enum, a value `export {}`/`export *`, or CJS = false).
 * @param {string} rawSrc full module source
 * @returns {boolean} true iff the module exports only types (zero runtime JS)
 */
export function isTypeOnlyModule(rawSrc) {
  if (!rawSrc) return false;
  // Strip block comments (line-start anchored) + whole line/JSDoc-asterisk lines, so a
  // commented runtime export cannot flip the verdict and a commented type export cannot fake one.
  const code = rawSrc
    .replace(/^\s*\/\*[\s\S]*?\*\//gm, "")
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return !(t.startsWith("//") || t.startsWith("*"));
    })
    .join("\n");
  const RUNTIME_EXPORT =
    /\bexport\s+(?:default|const|let|var|async\s+function|function|abstract\s+class|class|enum)\b/;
  // Value named/star re-export -- `export {` / `export *`. `export type {` / `export type *`
  // do NOT match (the `type` keyword sits between `export` and the `{`/`*`).
  const VALUE_REEXPORT = /\bexport\s*\{|\bexport\s+\*/;
  const CJS_EXPORT = /\bmodule\.exports\b|\bexports\.[A-Za-z_$]/;
  if (RUNTIME_EXPORT.test(code) || VALUE_REEXPORT.test(code) || CJS_EXPORT.test(code)) return false;
  return /\bexport\s+(?:type|interface)\b/.test(code);
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
    // A type-only `*Engine.ts` (e.g. an `IFooEngine.ts` re-export of `export type { ... }`)
    // erases to zero runtime JS -- there is no runtime to test, so demanding >=10 it() cases
    // is a false-positive (parallels checkEngineWired's "no singleton -> data module" escape +
    // the sibling audit's TYPE-ONLY class, U-AUDIT-TYPE-ONLY).
    if (isTypeOnlyModule(content)) {
      return { tested: true, reason: "type-only module (exports only TS types; no runtime to test)", cases: 0 };
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

/**
 * Pure detector (no disk access -- exported for unit testing).
 *
 * Given a dispatcher file's text, returns the list of action names declared in
 * its `*ACTIONS*` enums that have NO handler. An action is "handled" by ANY of:
 *
 *   1. switch/case            -- `case "action_name":`
 *   2. lookup-table key       -- `action_name: handleFn` / `: async` / `: (`
 *   3. plain object key       -- `action_name: <value>`
 *   4. array-membership route -- the action is a member of a `FOO_ACTIONS` array
 *      that the file uses as a dispatch guard: `FOO_ACTIONS.includes(action)`
 *      (or the cast form `(FOO_ACTIONS as readonly string[]).includes(action)`).
 *      This is the DYNAMIC-DISPATCH pattern: the dispatcher forwards the whole
 *      action string to a sub-engine that owns the per-action switch. The action
 *      is genuinely routed -- it does NOT fall through to default/Unknown -- so it
 *      is handled.
 *   5. equality dispatch      -- `if (action === "action_name")` / `else if` /
 *      a `action === "action_name" ? ...` ternary. Some dispatchers route via an
 *      if/else-if equality chain instead of a switch. Strict `===` only (both
 *      operand orders); `!==`/`!=` negative guards are deliberately NOT matched
 *      (they do not mean the action is handled).
 *
 * Pattern 4 was previously unrecognized, so EVERY `.includes()`-routing
 * dispatcher produced false positives (e.g. machineLiveDispatcher's 21
 * dynamically-routed MACHINE_ACTIONS reported as UNHANDLED). This is the third
 * valid-handler pattern, sibling to the table-driven map detection added earlier
 * (reference_audit_unwired_engines_table_driven_action_map_detection). It does
 * NOT soften the gate: a genuine orphan (in the enum, no case / no handler-key /
 * no `.includes` guard) is still reported. See regression 2026-06-11 +
 * reference_stop_unwired_assets_false_positive_2026_05_23.
 */
export function findUnhandledActions(rawBody) {
  // Strip comments first: a commented-out `.includes(` / `case` / handler-key
  // must NEVER count as a real handler (a commented dispatch guard must not
  // clear a genuine orphan). Block comments, then line comments.
  //
  // The line-comment strip requires `//` at line-start or after whitespace, so a
  // URL scheme (`http://`, `mqtt://` -- `//` preceded by `:`) is NOT mistaken
  // for a comment. Without this guard, a `case` sharing a line with a URL string
  // could be eaten -> a real handler hidden -> a genuine orphan FALSELY cleared
  // (the dangerous direction; caught in per-file scrutiny 2026-06-11). The
  // capture `$1` preserves the leading whitespace/line-start.
  // Block-comment strip: a `/*` is a real comment open ONLY when NOT preceded by
  // `*` or `/`. A glob/regex string literal like "**/*.MIN" or a regex `/a\d*/`
  // contains a spurious `/*` (in `*/*`) that the old greedy-paired strip treated
  // as a comment open -> it then ran to the NEXT `*/` (often a regex `\d*/` many
  // lines later), SWALLOWING real `case "x":` handlers in between -> those actions
  // falsely reported UNHANDLED -> the Stop gate could BLOCK any session editing
  // such a dispatcher (live: ppDispatcher's "**/*.MIN" at L6279 ate its pp_label_*
  // cases). The negative lookbehind `(?<![*/])` skips those artifact `/*`s; a real
  // comment is essentially never preceded by `*`/`/` (that would be `*/*` / `//*`).
  // RESIDUAL EDGE (accepted): a REAL comment whose `/*` is immediately adjacent to
  // a preceding `*`/`/` (e.g. `a*//*c*/`) is left UNstripped -- if it contained a
  // commented-out handler for an otherwise-orphan action that orphan would be
  // falsely cleared. Pathological + zero occurrences across all 119 live
  // dispatchers (the only `*/`-then-`/*` adjacency in the corpus is the glob this
  // fixes). Fully solving the comment-vs-string-vs-regex ambiguity needs a real
  // tokenizer, deliberately out of scope for this single-regex hardening.
  // (2026-06-19 slot:golf; sibling of the equality-dispatch + array-dispatch fixes.)
  const body = rawBody
    .replace(/(?<![*/])\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");

  // Capture each `const NAME_ACTIONS = [ ... ] as const` WITH its NAME.
  const arrays = []; // { name, members: string[] }
  const enumRe = /const\s+(\w*ACTIONS\w*)\s*=\s*\[([\s\S]*?)\]\s*as\s+const/g;
  let m;
  while ((m = enumRe.exec(body)) !== null) {
    const arrName = m[1];
    const members = [];
    const memberRe = /"([a-z][a-z0-9_]*)"/g;
    let a;
    while ((a = memberRe.exec(m[2])) !== null) members.push(a[1]);
    arrays.push({ name: arrName, members });
  }
  if (arrays.length === 0) return [];

  // An array NAME is a "dispatch guard" iff the file calls `NAME.includes(`,
  // allowing the `(NAME as readonly string[]).includes(` cast form. The members
  // of a guard array are routed via array-membership dispatch -> handled.
  const routed = new Set();
  for (const { name: arrName, members } of arrays) {
    const guardRe = new RegExp(
      `\\b${arrName}\\b\\s*(?:as\\s+readonly\\s+string\\[\\]\\s*\\))?\\s*\\.includes\\s*\\(`,
    );
    if (guardRe.test(body)) {
      for (const member of members) routed.add(member);
    }
  }

  // Union of all declared action names across every enum.
  const actionNames = new Set();
  for (const { members } of arrays) for (const member of members) actionNames.add(member);
  if (actionNames.size === 0) return [];

  const missing = [];
  for (const name of actionNames) {
    if (routed.has(name)) continue; // Pattern 4: array-membership dispatch
    // Pattern 1: switch/case handler
    const caseRe = new RegExp(`case\\s+["'\`]${name}["'\`]\\s*:`);
    // Pattern 2: ACTION_HANDLERS lookup table key (action_name: handleXxx / async / ( )
    const handlerRe = new RegExp(`\\b${name}\\s*:\\s*(handle[A-Z]|async\\s|\\()`);
    // Pattern 3: plain object key assignment (action_name: <value>)
    const objKeyRe = new RegExp(`["'\`]?${name}["'\`]?\\s*:\\s*["'\`a-zA-Z_]`);
    // Pattern 5: equality dispatch -- `if (action === "name")` / `else if` / a
    // `action === "name" ? ...` ternary. Some dispatchers route via an if/else-if
    // equality chain rather than a switch -- the action IS handled. STRICT `===`
    // only (both operand orders): a bare `==` substring also lives inside `!==`,
    // and `!==`/`!=` are NEGATIVE guards that do NOT mean the action is handled --
    // matching them would FALSELY clear a real orphan (the dangerous direction).
    // `===` is never a substring of `!==`, so this is safe. (false-positive fixed
    // 2026-06-19 slot:golf: materialProcessingDispatcher's coating_select* +
    // intelligenceDispatcher's if/else-if actions read as UNHANDLED while routed.)
    const eqRe = new RegExp(`===\\s*["'\`]${name}["'\`]|["'\`]${name}["'\`]\\s*===`);
    if (!caseRe.test(body) && !handlerRe.test(body) && !objKeyRe.test(body) && !eqRe.test(body)) {
      missing.push(name);
    }
  }
  return missing;
}

function checkDispatcherActionHandlers(dispatcherRelPath) {
  // For each action name in the file's ACTIONS enum, ensure a handler exists.
  // Supports switch/case, lookup-table, plain-object-key, AND array-membership
  // dispatch (FOO_ACTIONS.includes(action) -> forwarded to a sub-engine). Full
  // contract + rationale in findUnhandledActions().
  const full = path.join(REPO_ROOT, dispatcherRelPath);
  if (!fs.existsSync(full)) return { missing: [] };
  const body = fs.readFileSync(full, "utf8");
  return { missing: findUnhandledActions(body) };
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

// Run main() only when invoked directly as the hook (not when imported by a
// test for the exported `findUnhandledActions`). Fail-safe: if the guard itself
// errs, default to RUNNING so the gate is never silently disabled.
function isDirectInvocation() {
  try {
    return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return true;
  }
}

if (isDirectInvocation()) {
  main().catch((e) => {
    // Fail-open on infrastructure errors -- we must never break a
    // legitimate stop on our own bugs.
    console.log(
      JSON.stringify({
        decision: "approve",
        reason: `stop_on_unwired_assets error (fail-open): ${e.message}`,
      }),
    );
  });
}
