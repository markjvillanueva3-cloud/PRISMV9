#!/usr/bin/env node
/**
 * verify-hook-refs.mjs — SessionStart guardrail + H1 verify channel.
 *
 * Audits every hook registration in the Claude Code settings layers
 * (H:/.claude/settings.json, H:/PRISM/.claude/settings.json, .local.json)
 * for:
 *
 *   1. BROKEN_PATH       — hook command points to a script that does not exist
 *   2. DUPLICATE_TRIPLE  — same (event, matcher, command) registered more than once
 *   3. DUPLICATE_MATCHER — same (event, matcher) appears as multiple blocks
 *   4. INVALID_JSON      — settings file does not parse
 *   5. INDETERMINATE     — path uses an env-var/token that did not expand here (warning, not error)
 *
 * Modes (argv):
 *   (none)          audit all three settings layers, one-line summary to stdout, detail to stderr.
 *   --self-test     run the audit logic against synthetic in-memory fixtures covering the
 *                   variability axis (0 / 50 / 500 hooks × all-resolve / some-missing /
 *                   all-duplicate / env-var / relative). Exit 0 iff every assertion holds.
 *                   Does NOT read or write any real file.  ← H1's `verifies_via` channel.
 *   --json          emit `{ resolved, missing[], duplicates[], duplicateMatchers[], invalidJSON[],
 *                   indeterminate[] }` to stdout instead of the human summary.
 *   --file <path>   audit only the given settings file (repeatable).
 *   --quiet         suppress the stderr detail block (summary line only).
 *
 * Exit codes:
 *   0 — clean (or only INFO / INDETERMINATE findings) — and self-test passed
 *   1 — at least one BROKEN_PATH or INVALID_JSON (hooks will silently fail) — or self-test failed
 *   2 — DUPLICATE_TRIPLE or DUPLICATE_MATCHER (potential double-fire)
 *
 * Adversarial / failure handling (per HOOK-SYNERGY-MS0 U-H1.0 spec):
 *   - settings.json malformed → INVALID_JSON finding, exit 1 (never throws).
 *   - referenced path uses env-var ($HOME, ${HOME}, %USERPROFILE%, $env:NAME, ~) → expand
 *     against process.env; if it still contains an un-expanded token → INDETERMINATE (warning).
 *   - referenced path is relative (./x, ../x, foo/bar.mjs) → resolve against the repo root.
 *   - referenced script exists but is unreadable (permission) → INDETERMINATE (warning), not error.
 *   - hook command chains another hook → out of scope; this is a *static* reference checker, it
 *     only verifies the immediately-referenced script path resolves on disk.
 *
 * Designed to fit a 5s SessionStart budget. No subprocess spawns; no network.
 * Pure JSON parse + fs.existsSync/accessSync.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// ── repo root: this file lives at <repo>/.claude/scripts/verify-hook-refs.mjs ──
const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..", "..").split("\\").join("/");

const DEFAULT_SETTINGS_FILES = [
  "H:/.claude/settings.json",
  "H:/PRISM/.claude/settings.json",
  "H:/PRISM/.claude/settings.local.json",
];

// Drive-letter-absolute path token (Windows-style), what hook commands almost always use.
const ABS_SCRIPT_RE = /[A-Za-z]:[\\/][^\s"'`|;&]+\.(?:mjs|js|ts|cjs|mts|py|sh|ps1)/g;
// Relative / env-var / home-rooted script token. Kept deliberately conservative: must end in a
// known script extension AND look like a path (contains a slash, or starts with ~ / $ / %).
const REL_SCRIPT_RE =
  /(?:[~$%][^\s"'`|;&]*|\.{1,2}[\\/][^\s"'`|;&]*|[A-Za-z0-9_.-]+[\\/][^\s"'`|;&]*)\.(?:mjs|js|ts|cjs|mts|py|sh|ps1)/g;

// ── env-var expansion ───────────────────────────────────────────────────────
function expandEnv(p) {
  if (typeof p !== "string") return { path: p, unresolved: false };
  let s = p;
  // ~  → home
  if (s === "~" || s.startsWith("~/") || s.startsWith("~\\")) {
    s = os.homedir() + s.slice(1);
  }
  // $env:NAME (PowerShell)  → strip the "env:" namespace, treat NAME as a var
  s = s.replace(/\$env:([A-Za-z_][A-Za-z0-9_]*)/g, (_m, n) => process.env[n] ?? `$${n}`);
  // ${NAME} and $NAME (POSIX)
  s = s.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_m, n) => process.env[n] ?? `$\{${n}}`);
  s = s.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_m, n) => process.env[n] ?? `$${n}`);
  // %NAME% (Windows cmd)
  s = s.replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, (_m, n) => process.env[n] ?? `%${n}%`);
  const unresolved = /[$%]/.test(s) || s.includes("~");
  return { path: s, unresolved };
}

function normalizePath(p) {
  return String(p).split("\\").join("/");
}

// Classify a single referenced path token → "resolved" | "missing" | "indeterminate".
function classifyPath(rawToken) {
  const { path: expanded, unresolved } = expandEnv(rawToken);
  if (unresolved) return { kind: "indeterminate", path: normalizePath(expanded), reason: "unexpanded env-var token" };
  let norm = normalizePath(expanded);
  // resolve relatives against repo root
  if (!/^[A-Za-z]:\//.test(norm) && !norm.startsWith("/")) {
    norm = normalizePath(path.resolve(REPO_ROOT, norm));
  }
  let exists = false;
  try { exists = fs.existsSync(norm); } catch { exists = false; }
  if (!exists) return { kind: "missing", path: norm };
  // exists — check readability; unreadable is a warning, not a hard error
  try {
    fs.accessSync(norm, fs.constants.R_OK);
  } catch {
    return { kind: "indeterminate", path: norm, reason: "exists but not readable (permission)" };
  }
  return { kind: "resolved", path: norm };
}

function extractScriptTokens(cmd) {
  if (typeof cmd !== "string") return [];
  const out = new Set();
  for (const m of cmd.match(ABS_SCRIPT_RE) || []) out.add(m);
  for (const m of cmd.match(REL_SCRIPT_RE) || []) {
    // skip ones already captured as absolute (REL_SCRIPT_RE can also match a tail of an abs path)
    if (![...out].some((a) => a.endsWith(m) || a.includes(m))) out.add(m);
  }
  return [...out];
}

// ── core audit ──────────────────────────────────────────────────────────────
// `source` is either { file, json } (parsed) or { file, parseError } (malformed) or a string path.
function auditSource(source, findings) {
  let file, json;
  if (typeof source === "string") {
    file = source;
    let raw;
    try {
      raw = fs.readFileSync(file, "utf8");
    } catch (e) {
      if (e && e.code === "ENOENT") return; // optional layer, OK
      findings.invalidJSON.push({ file, error: `read failed: ${e.message}` });
      return;
    }
    try {
      json = JSON.parse(raw);
    } catch (e) {
      findings.invalidJSON.push({ file, error: e.message });
      return;
    }
  } else {
    file = source.file;
    if (source.parseError) {
      findings.invalidJSON.push({ file, error: source.parseError === true ? "synthetic parse error" : String(source.parseError) });
      return;
    }
    json = source.json;
  }

  const hooks = json && json.hooks;
  if (!hooks || typeof hooks !== "object") return;

  for (const event of Object.keys(hooks)) {
    const blocks = Array.isArray(hooks[event]) ? hooks[event] : [];
    const matcherSeen = new Map();
    const tripleSeen = new Map();
    for (const block of blocks) {
      const matcherKey = String(block && block.matcher != null ? block.matcher : "*");
      matcherSeen.set(matcherKey, (matcherSeen.get(matcherKey) || 0) + 1);
      const hookList = Array.isArray(block && block.hooks) ? block.hooks : [];
      for (const h of hookList) {
        const cmd = (h && h.command) || "";
        const tripleKey = `${event}::${matcherKey}::${cmd}`;
        tripleSeen.set(tripleKey, (tripleSeen.get(tripleKey) || 0) + 1);
        for (const tok of extractScriptTokens(cmd)) {
          const c = classifyPath(tok);
          if (c.kind === "resolved") {
            findings.resolved++;
          } else if (c.kind === "missing") {
            findings.brokenPaths.push({ file, event, matcher: matcherKey, missing: c.path, cmdHead: String(cmd).slice(0, 90) });
          } else {
            findings.indeterminate.push({ file, event, matcher: matcherKey, path: c.path, reason: c.reason, cmdHead: String(cmd).slice(0, 90) });
          }
        }
      }
    }
    for (const [key, count] of matcherSeen) {
      if (count > 1) findings.duplicateMatchers.push({ file, event, matcher: key, count });
    }
    for (const [key, count] of tripleSeen) {
      if (count > 1) {
        const parts = key.split("::");
        findings.duplicateTriples.push({ file, key, count, cmdHead: (parts[2] || "").slice(0, 80) });
      }
    }
  }
}

function newFindings() {
  return { resolved: 0, brokenPaths: [], invalidJSON: [], duplicateMatchers: [], duplicateTriples: [], indeterminate: [] };
}

function exitClass(f) {
  if (f.brokenPaths.length > 0 || f.invalidJSON.length > 0) return 1;
  if (f.duplicateMatchers.length > 0 || f.duplicateTriples.length > 0) return 2;
  return 0;
}

// ── self-test ───────────────────────────────────────────────────────────────
function selfTest() {
  const fails = [];
  const assert = (name, cond, detail) => { if (!cond) fails.push(`${name}${detail ? " — " + detail : ""}`); };

  const thisFileAbs = normalizePath(__filename);
  const thisFileRel = normalizePath(path.relative(REPO_ROOT, __filename)); // e.g. .claude/scripts/verify-hook-refs.mjs
  const ghostAbs = normalizePath(path.join(REPO_ROOT, ".claude/hooks/__verify_hook_refs_selftest_ghost__.mjs"));

  const mkBlocks = (n, cmd) => [{ matcher: "", hooks: Array.from({ length: n }, () => ({ type: "command", command: cmd })) }];

  // 1 — 0 hooks
  {
    const f = newFindings();
    auditSource({ file: "synthetic:empty", json: { hooks: {} } }, f);
    assert("0-hooks-empty", f.resolved === 0 && f.brokenPaths.length === 0 && exitClass(f) === 0);
  }
  // 2 — N resolving hooks (50)  — all point at this very file (absolute)
  {
    const f = newFindings();
    auditSource({ file: "synthetic:resolve50", json: { hooks: { PreToolUse: mkBlocks(50, `node "${thisFileAbs}" --pre`) } } }, f);
    // 50 identical (event,matcher,command) → also a duplicate-triple; resolved counts each occurrence
    assert("resolve-50", f.resolved === 50, `resolved=${f.resolved}`);
    assert("resolve-50-no-broken", f.brokenPaths.length === 0, `broken=${f.brokenPaths.length}`);
  }
  // 3 — some missing (12 broken, 3 ok) — distinct commands so no dup-triple noise
  {
    const f = newFindings();
    const blocks = [];
    for (let i = 0; i < 12; i++) blocks.push({ matcher: `m${i}`, hooks: [{ type: "command", command: `node "${ghostAbs}" --i=${i}` }] });
    for (let i = 0; i < 3; i++) blocks.push({ matcher: `ok${i}`, hooks: [{ type: "command", command: `node "${thisFileAbs}" --ok=${i}` }] });
    auditSource({ file: "synthetic:some-missing", json: { hooks: { Stop: blocks } } }, f);
    assert("some-missing-count", f.brokenPaths.length === 12, `broken=${f.brokenPaths.length}`);
    assert("some-missing-resolved", f.resolved === 3, `resolved=${f.resolved}`);
    assert("some-missing-exit1", exitClass(f) === 1);
  }
  // 4 — all duplicate triples (same event/matcher/command ×4)
  {
    const f = newFindings();
    auditSource({ file: "synthetic:dup-triple", json: { hooks: { PostToolUse: mkBlocks(4, `node "${thisFileAbs}" --dup`) } } }, f);
    assert("dup-triple-detected", f.duplicateTriples.length >= 1, `dups=${f.duplicateTriples.length}`);
    assert("dup-triple-exit2", exitClass(f) === 2);
  }
  // 5 — duplicate matchers (same (event,matcher) in 2 blocks)
  {
    const f = newFindings();
    auditSource({ file: "synthetic:dup-matcher", json: { hooks: { PreToolUse: [
      { matcher: "Edit", hooks: [{ type: "command", command: `node "${thisFileAbs}" --a` }] },
      { matcher: "Edit", hooks: [{ type: "command", command: `node "${thisFileAbs}" --b` }] },
    ] } } }, f);
    assert("dup-matcher-detected", f.duplicateMatchers.length === 1, `dupM=${f.duplicateMatchers.length}`);
    assert("dup-matcher-exit2", exitClass(f) === 2);
  }
  // 6 — malformed settings
  {
    const f = newFindings();
    auditSource({ file: "synthetic:bad-json", parseError: true }, f);
    assert("malformed-detected", f.invalidJSON.length === 1);
    assert("malformed-exit1", exitClass(f) === 1);
  }
  // 7 — env-var path, var SET (resolves) vs UNSET (indeterminate, not missing)
  {
    const probe = "__VHR_SELFTEST_DIR__";
    const dir = normalizePath(path.dirname(thisFileAbs));
    const base = path.basename(thisFileAbs);
    process.env[probe] = dir;
    const fSet = newFindings();
    auditSource({ file: "synthetic:envset", json: { hooks: { Stop: [{ matcher: "", hooks: [{ type: "command", command: `node $${probe}/${base}` }] }] } } }, fSet);
    assert("envvar-set-resolves", fSet.resolved === 1 && fSet.brokenPaths.length === 0, `resolved=${fSet.resolved} broken=${fSet.brokenPaths.length}`);
    delete process.env[probe];
    const fUnset = newFindings();
    auditSource({ file: "synthetic:envunset", json: { hooks: { Stop: [{ matcher: "", hooks: [{ type: "command", command: `node $${probe}/${base}` }] }] } } }, fUnset);
    assert("envvar-unset-indeterminate", fUnset.indeterminate.length === 1 && fUnset.brokenPaths.length === 0, `indet=${fUnset.indeterminate.length} broken=${fUnset.brokenPaths.length}`);
    assert("envvar-unset-exit0", exitClass(fUnset) === 0);
  }
  // 8 — relative path (this file, relative to repo root) resolves
  {
    const f = newFindings();
    auditSource({ file: "synthetic:relative", json: { hooks: { SessionStart: [{ matcher: "", hooks: [{ type: "command", command: `node ${thisFileRel}` }] }] } } }, f);
    assert("relative-resolves", f.resolved === 1 && f.brokenPaths.length === 0, `resolved=${f.resolved} broken=${f.brokenPaths.length}`);
  }
  // 9 — scale: 500 resolving hooks, must complete quickly + correctly
  {
    const t0 = Date.now();
    const f = newFindings();
    const blocks = Array.from({ length: 500 }, (_, i) => ({ matcher: `s${i}`, hooks: [{ type: "command", command: `node "${thisFileAbs}" --s=${i}` }] }));
    auditSource({ file: "synthetic:scale500", json: { hooks: { PostToolUse: blocks } } }, f);
    const ms = Date.now() - t0;
    assert("scale-500-resolved", f.resolved === 500, `resolved=${f.resolved}`);
    assert("scale-500-no-broken", f.brokenPaths.length === 0);
    assert("scale-500-fast", ms < 3000, `${ms}ms`);
  }

  const CASES = 9;
  if (fails.length === 0) {
    process.stdout.write(`verify-hook-refs: ✓ self-test passed (${CASES} cases)\n`);
    process.exit(0);
  }
  process.stdout.write(`verify-hook-refs: ✗ self-test FAILED (${fails.length} assertion(s))\n`);
  for (const x of fails) process.stderr.write(`  FAIL: ${x}\n`);
  process.exit(1);
}

// ── main ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const wantJSON = argv.includes("--json");
const quiet = argv.includes("--quiet");
if (argv.includes("--self-test")) selfTest();

const fileArgs = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--file" && argv[i + 1]) { fileArgs.push(argv[i + 1]); i++; }
}
const settingsFiles = fileArgs.length ? fileArgs : DEFAULT_SETTINGS_FILES;

const findings = newFindings();
for (const f of settingsFiles) auditSource(f, findings);

const broken = findings.brokenPaths.length;
const invalid = findings.invalidJSON.length;
const dupMatch = findings.duplicateMatchers.length;
const dupTriple = findings.duplicateTriples.length;
const indet = findings.indeterminate.length;

if (wantJSON) {
  process.stdout.write(JSON.stringify({
    repoRoot: REPO_ROOT,
    settingsFiles,
    resolved: findings.resolved,
    missing: findings.brokenPaths,
    duplicates: findings.duplicateTriples,
    duplicateMatchers: findings.duplicateMatchers,
    invalidJSON: findings.invalidJSON,
    indeterminate: findings.indeterminate,
    exitClass: exitClass(findings),
  }, null, 2) + "\n");
  process.exit(exitClass(findings));
}

if (broken === 0 && invalid === 0 && dupMatch === 0 && dupTriple === 0) {
  const tail = indet > 0 ? ` (${indet} indeterminate — env-var/permission, see stderr)` : "";
  process.stdout.write(`verify-hook-refs: ✓ all hook references resolve, no duplicates${tail}\n`);
  if (indet > 0 && !quiet) {
    process.stderr.write("\nINDETERMINATE findings (env-var not expanded here or unreadable — not a hard failure):\n");
    for (const f of findings.indeterminate) process.stderr.write(`  ${f.file} :: ${f.event}::${f.matcher} :: ${f.path} — ${f.reason}\n`);
  }
  process.exit(0);
}

const summary = [
  broken > 0 ? `${broken} broken path(s)` : null,
  invalid > 0 ? `${invalid} invalid JSON` : null,
  dupMatch > 0 ? `${dupMatch} dup matcher(s)` : null,
  dupTriple > 0 ? `${dupTriple} dup hook(s)` : null,
  indet > 0 ? `${indet} indeterminate` : null,
].filter(Boolean).join(", ");

process.stdout.write(`verify-hook-refs: ⚠ ${summary}\n`);

if (!quiet) {
  if (broken > 0) {
    process.stderr.write("\nBROKEN_PATH findings:\n");
    for (const f of findings.brokenPaths) process.stderr.write(`  ${f.file} :: ${f.event} :: missing ${f.missing}\n    cmd: ${f.cmdHead}\n`);
  }
  if (invalid > 0) {
    process.stderr.write("\nINVALID_JSON findings:\n");
    for (const f of findings.invalidJSON) process.stderr.write(`  ${f.file} :: ${f.error}\n`);
  }
  if (dupMatch > 0) {
    process.stderr.write("\nDUPLICATE_MATCHER findings (silent double-fire risk):\n");
    for (const f of findings.duplicateMatchers) process.stderr.write(`  ${f.file} :: ${f.event}::${f.matcher} appears ${f.count} times\n`);
  }
  if (dupTriple > 0) {
    process.stderr.write("\nDUPLICATE_TRIPLE findings (same hook registered twice):\n");
    for (const f of findings.duplicateTriples) process.stderr.write(`  ${f.key} (×${f.count})\n`);
  }
  if (indet > 0) {
    process.stderr.write("\nINDETERMINATE findings (env-var not expanded here or unreadable — not a hard failure):\n");
    for (const f of findings.indeterminate) process.stderr.write(`  ${f.file} :: ${f.event}::${f.matcher} :: ${f.path} — ${f.reason}\n`);
  }
}

process.exit(exitClass(findings));
