#!/usr/bin/env node
/**
 * scripts/declared-vs-actual.mjs
 *
 * Substrate-health measurement — surfaces drift between what PRISM settings
 * DECLARE (enabled MCP servers, env vars, user-vs-project keys, hook wiring)
 * and what is ACTUALLY configured on disk.
 *
 * Designed against the 2026-05-19 bug class: `enabledMcpjsonServers` listed
 * `prism-mcp-server` (typo'd name), `prism_safe` missing from the enable list,
 * and several env keys were empty scaffolding (`SUPABASE_*=""`). The system
 * loaded MCP via the trust-dialog implicit allow, masking the drift for weeks.
 *
 * Pure core (every section is a pure function over inputs) + injected readers
 * so tests are hermetic. The `main()` wires real readers.
 *
 * Consumers:
 *   /forge7 §Phase 0.2     — BLOCKS on dormant_declared_not_configured
 *   /forge-audit-v2 §6A    — required META artifact for substrate audits
 *   standalone CLI         — operator-runnable for ad-hoc health check
 *
 * Exit codes:
 *   0  no blocking drift (default), or no drift at all (--strict)
 *   1  blocking drift detected (default), or any drift (--strict)
 *   2  reader error (settings.json malformed, fs error)
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = "1.0.0";
const TYPO_MAX_DISTANCE = 4;          // Levenshtein cutoff for "this looks like a typo of"
const PRISM_ROOT_WALK_MAX_DEPTH = 6;  // safety cap on parent-directory walk

// ─── Pure core ────────────────────────────────────────────────────────────

/**
 * Compare settings.json `enabledMcpjsonServers` against `.mcp.json` keys.
 *
 * @param {string[]} declared   - enabledMcpjsonServers
 * @param {string[]} configured - keys of mcpServers in .mcp.json
 * @returns {{
 *   declared_in_settings: string[],
 *   configured_in_mcp_json: string[],
 *   dormant_declared_not_configured: string[],
 *   dormant_configured_not_declared: string[],
 *   typo_candidates: Array<{declared:string, candidate:string, distance:number}>
 * }}
 */
export function getMcpDrift(declared, configured) {
  const declaredArr = Array.isArray(declared) ? declared : [];
  const configuredArr = Array.isArray(configured) ? configured : [];
  const declaredSet = new Set(declaredArr);
  const configuredSet = new Set(configuredArr);

  const dormantDeclaredNotConfigured = [...declaredSet].filter(
    (k) => !configuredSet.has(k)
  );
  const dormantConfiguredNotDeclared = [...configuredSet].filter(
    (k) => !declaredSet.has(k)
  );

  // Typo candidates: a declared key with no exact match in configured, but
  // close enough (Levenshtein <= 4) that a near-match exists. Surfaces names
  // like "prims" → "prism" or "claude_flow" → "claude-flow". Will NOT flag
  // "prism-mcp-server" → "prism" because that's a different name, not a
  // typo (distance 11). Such cases land in dormant_declared_not_configured
  // which is the blocking signal.
  const typoCandidates = [];
  for (const d of dormantDeclaredNotConfigured) {
    let best = null;
    for (const c of configuredArr) {
      const dist = levenshtein(d, c);
      if (dist <= TYPO_MAX_DISTANCE && (best === null || dist < best.distance)) {
        best = { declared: d, candidate: c, distance: dist };
      }
    }
    if (best) typoCandidates.push(best);
  }

  return {
    declared_in_settings: [...declaredArr],
    configured_in_mcp_json: [...configuredArr],
    dormant_declared_not_configured: dormantDeclaredNotConfigured,
    dormant_configured_not_declared: dormantConfiguredNotDeclared,
    typo_candidates: typoCandidates,
  };
}

/**
 * Find env keys whose value is an empty string ("scaffolded").
 * Empty strings mask the "set vs unset" distinction: `if (process.env.X)` reads
 * them as falsy, but `if ("X" in process.env)` reads them as set. The
 * 2026-05-19 Supabase/Figma class of drift.
 *
 * @param {Record<string, unknown>} envObj
 * @returns {string[]} sorted list of empty-string keys
 */
export function findScaffoldedEmpty(envObj) {
  if (!envObj || typeof envObj !== "object") return [];
  const keys = [];
  for (const [k, v] of Object.entries(envObj)) {
    if (v === "") keys.push(k);
  }
  return keys.sort();
}

/**
 * Diff two settings JSON objects key-by-key.
 *
 * Surfaces only first-level structural difference. For nested objects the
 * value diff is summarized (no full structural diff — keeps output scannable).
 *
 * @param {object} userJson
 * @param {object} projectJson
 * @returns {{
 *   keys_only_in_user: string[],
 *   keys_only_in_project: string[],
 *   value_diffs: Array<{key:string, user:unknown, project:unknown}>
 * }}
 */
export function diffSettings(userJson, projectJson) {
  const u = (userJson && typeof userJson === "object") ? userJson : {};
  const p = (projectJson && typeof projectJson === "object") ? projectJson : {};
  const userKeys = new Set(Object.keys(u));
  const projectKeys = new Set(Object.keys(p));

  const onlyUser = [...userKeys].filter((k) => !projectKeys.has(k)).sort();
  const onlyProject = [...projectKeys].filter((k) => !userKeys.has(k)).sort();

  const valueDiffs = [];
  for (const k of userKeys) {
    if (!projectKeys.has(k)) continue;
    if (!deepEqual(u[k], p[k])) {
      valueDiffs.push({
        key: k,
        user: summarizeValue(u[k]),
        project: summarizeValue(p[k]),
      });
    }
  }

  return {
    keys_only_in_user: onlyUser,
    keys_only_in_project: onlyProject,
    value_diffs: valueDiffs,
  };
}

function summarizeValue(v) {
  if (v === null) return "null";
  if (typeof v === "string") return v.length > 60 ? v.slice(0, 60) + "…" : v;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return `array(${v.length} items)`;
  if (typeof v === "object") return `object(${Object.keys(v).length} keys)`;
  return String(v);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (typeof a === "object") {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    // Same length is necessary but not sufficient — verify every key in `a`
    // actually exists in `b` (reviewer P2: {a:1,c:2} vs {a:1,b:undef} would
    // otherwise compare equal because b[c] === undefined and undefined ===
    // would only re-enter via the typeof check).
    return ak.every((k) =>
      Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k])
    );
  }
  return false;
}

/**
 * Levenshtein edit distance. Two-row DP, O(min(m,n)) space.
 */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Audit hooks-on-disk vs hooks-wired-in-settings.
 *
 * @param {string[]} onDisk - basenames of *.mjs in hooks dir
 * @param {string[]} wired  - basenames extracted from settings.json hook commands
 */
export function auditHooks(onDisk, wired) {
  const onDiskArr = Array.isArray(onDisk) ? onDisk : [];
  const wiredArr = Array.isArray(wired) ? wired : [];
  const wiredSet = new Set(wiredArr);
  const onDiskSet = new Set(onDiskArr);
  const unwired = [...onDiskSet].filter((h) => !wiredSet.has(h)).sort();
  return {
    wired_count: wiredSet.size,
    on_disk_count: onDiskSet.size,
    unwired_on_disk: unwired,
  };
}

/**
 * Extract .mjs basenames from a settings.json `hooks` block.
 * Scans every command string for `<name>.mjs` substrings, dedupes, sorts.
 */
export function extractWiredHookBasenames(hooksBlock) {
  if (!hooksBlock || typeof hooksBlock !== "object") return [];
  const names = new Set();
  // Require a path-separator boundary (/ or \) immediately before the basename
  // to avoid matching `.mjs` substrings inside quoted args, comments, or
  // arbitrary echo strings (reviewer P1: hostile-input class — a command
  // containing `echo "fake.mjs"` must NOT register a phantom hook).
  const HOOK_NAME_RE = /[/\\]([A-Za-z0-9._-]+\.mjs)\b/g;
  for (const event of Object.keys(hooksBlock)) {
    const matchers = hooksBlock[event];
    if (!Array.isArray(matchers)) continue;
    for (const m of matchers) {
      const hooks = m?.hooks;
      if (!Array.isArray(hooks)) continue;
      for (const h of hooks) {
        const cmd = h?.command;
        if (typeof cmd !== "string") continue;
        let match;
        HOOK_NAME_RE.lastIndex = 0;
        while ((match = HOOK_NAME_RE.exec(cmd)) !== null) {
          names.add(match[1]);
        }
      }
    }
  }
  return [...names].sort();
}

/**
 * Aggregate pure-section outputs into the schema-versioned report.
 *
 * Blocking signals (for forge7 Phase 0.2 BLOCK gate):
 *   - dormant_declared_not_configured (declared an MCP server that .mcp.json
 *     doesn't know about — runtime will fail when something tries to use it)
 *
 * Advisory signals (count toward drift_count but don't block):
 *   - dormant_configured_not_declared (server is in .mcp.json but not enabled
 *     — usually intentional)
 *   - typo_candidates (advisory only)
 *   - env.scaffolded_empty (cleanup, not safety)
 *   - settings.drift (varies)
 *   - hooks.unwired_on_disk (informational)
 */
export function buildReport({ mcp, env, settings, hooks, hostName, nowIso }) {
  const blocking = mcp?.dormant_declared_not_configured?.length || 0;

  const driftCount =
    (mcp?.dormant_declared_not_configured?.length || 0) +
    (mcp?.dormant_configured_not_declared?.length || 0) +
    (mcp?.typo_candidates?.length || 0) +
    (env?.scaffolded_empty?.length || 0) +
    (settings?.drift?.keys_only_in_user?.length || 0) +
    (settings?.drift?.keys_only_in_project?.length || 0) +
    (settings?.drift?.value_diffs?.length || 0) +
    (hooks?.unwired_on_disk?.length || 0);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: nowIso || new Date().toISOString(),
    host: hostName || "unknown",
    summary: {
      drift_count: driftCount,
      blocking_count: blocking,
      ok: blocking === 0,
    },
    mcp: mcp || null,
    env: env || null,
    settings: settings || null,
    hooks: hooks || null,
  };
}

// ─── I/O wrappers (injectable for tests) ──────────────────────────────────

export async function readJsonFile(filePath, readImpl = readFile) {
  let body;
  try {
    body = await readImpl(filePath, "utf8");
  } catch (e) {
    if (e?.code === "ENOENT") return null;
    throw new Error(`readJsonFile(${filePath}) failed: ${e?.message || e}`);
  }
  try {
    return JSON.parse(body);
  } catch (e) {
    throw new Error(
      `readJsonFile(${filePath}) JSON parse failed: ${e?.message || e}`
    );
  }
}

export async function listHookFiles(hooksDir, readdirImpl = readdir) {
  try {
    const entries = await readdirImpl(hooksDir);
    // `entries` may be either string[] (test mocks pass basenames) or
    // Dirent[]-like objects (real readdir with `{withFileTypes:true}` if a
    // caller chooses to). Handle both; default behavior is strings.
    return entries
      .map((e) => (typeof e === "string" ? e : e?.name))
      .filter((name) => typeof name === "string" && name.endsWith(".mjs"))
      .sort();
  } catch (e) {
    if (e?.code === "ENOENT") return [];
    throw new Error(`listHookFiles(${hooksDir}) failed: ${e?.message || e}`);
  }
}

// ─── runReport — wires section outputs into final report ───────────────────

export async function runReport(opts) {
  const userSettings = await readJsonFile(opts.userSettingsPath, opts.readImpl);
  const projectSettings = await readJsonFile(
    opts.projectSettingsPath,
    opts.readImpl
  );
  const mcpJson = await readJsonFile(opts.mcpJsonPath, opts.readImpl);

  const declared = userSettings?.enabledMcpjsonServers || [];
  const configured = mcpJson?.mcpServers
    ? Object.keys(mcpJson.mcpServers)
    : [];

  const mcp = getMcpDrift(declared, configured);

  const envEmptyUnion = new Set([
    ...findScaffoldedEmpty(userSettings?.env),
    ...findScaffoldedEmpty(projectSettings?.env),
  ]);
  const env = { scaffolded_empty: [...envEmptyUnion].sort() };

  const settingsDrift = diffSettings(userSettings || {}, projectSettings || {});
  const settings = {
    user_path: opts.userSettingsPath,
    project_path: opts.projectSettingsPath,
    drift: settingsDrift,
  };

  const hookFiles = await listHookFiles(opts.hooksDir, opts.readdirImpl);
  const wired = new Set([
    ...extractWiredHookBasenames(userSettings?.hooks),
    ...extractWiredHookBasenames(projectSettings?.hooks),
  ]);
  const hooks = auditHooks(hookFiles, [...wired]);

  return buildReport({
    mcp,
    env,
    settings,
    hooks,
    hostName: opts.hostName,
    nowIso: opts.nowIso,
  });
}

// ─── CLI ──────────────────────────────────────────────────────────────────

function autoDetectPrismRoot(startDir) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < PRISM_ROOT_WALK_MAX_DEPTH; i++) {
    if (existsSync(path.join(dir, ".mcp.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

function defaultPaths() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const prismRoot = process.env.PRISM_ROOT || autoDetectPrismRoot(here);
  const home = process.env.USERPROFILE || process.env.HOME || os.homedir();
  return {
    prismRoot,
    userSettingsPath: path.join(home, ".claude", "settings.json"),
    projectSettingsPath: path.join(prismRoot, ".claude", "settings.json"),
    mcpJsonPath: path.join(prismRoot, ".mcp.json"),
    hooksDir: path.join(prismRoot, ".claude", "hooks"),
    hostName: os.hostname(),
  };
}

function renderText(report) {
  const { mcp, env, settings, hooks, summary } = report;
  const lines = [];
  lines.push(
    `declared-vs-actual ${report.schemaVersion} — host ${report.host}`
  );
  lines.push(
    `  drift: ${summary.drift_count}  blocking: ${summary.blocking_count}  ok: ${summary.ok}`
  );
  lines.push("");
  lines.push("MCP:");
  lines.push(
    `  declared    (${mcp.declared_in_settings.length}): ${mcp.declared_in_settings.join(", ") || "—"}`
  );
  lines.push(
    `  configured  (${mcp.configured_in_mcp_json.length}): ${mcp.configured_in_mcp_json.join(", ") || "—"}`
  );
  if (mcp.dormant_declared_not_configured.length) {
    lines.push(
      `  ⚠ BLOCKING: declared but no .mcp.json entry: ${mcp.dormant_declared_not_configured.join(", ")}`
    );
  }
  if (mcp.dormant_configured_not_declared.length) {
    lines.push(
      `  · configured but not declared: ${mcp.dormant_configured_not_declared.join(", ")}`
    );
  }
  for (const t of mcp.typo_candidates) {
    lines.push(
      `  ⚠ TYPO? "${t.declared}" → "${t.candidate}" (distance ${t.distance})`
    );
  }
  lines.push("");
  lines.push(
    `env scaffolded-empty (${env.scaffolded_empty.length}): ${env.scaffolded_empty.join(", ") || "—"}`
  );
  lines.push("");
  lines.push("settings drift (user ↔ project):");
  lines.push(
    `  only in user:    ${settings.drift.keys_only_in_user.join(", ") || "—"}`
  );
  lines.push(
    `  only in project: ${settings.drift.keys_only_in_project.join(", ") || "—"}`
  );
  lines.push(`  value diffs:     ${settings.drift.value_diffs.length}`);
  lines.push("");
  lines.push(
    `hooks: ${hooks.wired_count} wired / ${hooks.on_disk_count} on disk / ${hooks.unwired_on_disk.length} orphan`
  );
  return lines.join("\n");
}

const KNOWN_FLAGS = new Set(["--json", "--text", "--strict", "--help", "-h"]);

/**
 * Write to stdout and set process.exitCode, then resolve when stdout has
 * drained. Avoids the Windows-pipe truncation class where
 * `process.exit(n)` after a sync `stdout.write` can kill the process
 * mid-flush (reviewer P0). Letting the event loop drain naturally is the
 * canonical Node fix.
 */
function exitAfterDrain(text, code) {
  return new Promise((resolve) => {
    process.exitCode = code;
    // The write callback fires after the buffer drains (or immediately if
    // it flushed synchronously); either way it's the canonical signal that
    // stdout is safe to abandon. Node will then exit naturally with exitCode.
    process.stdout.write(text, () => resolve());
  });
}

async function cli() {
  const rawArgs = process.argv.slice(2);
  // Fail-loud on unknown flags (reviewer P1: --strick typo would silently
  // skip strict mode under the previous Set-based parse).
  for (const a of rawArgs) {
    if (!KNOWN_FLAGS.has(a)) {
      process.stderr.write(
        `declared-vs-actual ERROR: unknown flag "${a}". Try --help.\n`
      );
      process.exitCode = 2;
      return;
    }
  }
  const args = new Set(rawArgs);
  const text = args.has("--text");
  const strict = args.has("--strict");
  const help = args.has("--help") || args.has("-h");

  if (help) {
    await exitAfterDrain(
      [
        "Usage: declared-vs-actual.mjs [--json|--text] [--strict]",
        "",
        "  --json    JSON output (default)",
        "  --text    human-readable summary",
        "  --strict  exit 1 on ANY drift (default: only blocking)",
        "  --help    this message",
        "",
        "Exit codes:",
        "  0 = clean (or no blocking drift)",
        "  1 = drift detected",
        "  2 = reader error or unknown flag",
      ].join("\n") + "\n",
      0
    );
    return;
  }

  try {
    const opts = defaultPaths();
    const report = await runReport(opts);

    const output = text
      ? renderText(report) + "\n"
      : JSON.stringify(report, null, 2) + "\n";

    const exitOnDrift = strict
      ? report.summary.drift_count > 0
      : report.summary.blocking_count > 0;
    await exitAfterDrain(output, exitOnDrift ? 1 : 0);
  } catch (e) {
    process.stderr.write(`declared-vs-actual ERROR: ${e.message}\n`);
    process.exitCode = 2;
  }
}

// Windows drive-letter casing varies by shell — `path.relative` returns ""
// for identical paths regardless of case (reviewer P1). Avoid raw string
// equality which would miss the case-mismatched-but-same-file scenario.
const invokedDirectly =
  process.argv[1] &&
  path.relative(
    path.resolve(process.argv[1]),
    fileURLToPath(import.meta.url)
  ) === "";
if (invokedDirectly) {
  // cli() sets process.exitCode and drains stdout — fire-and-forget OK
  void cli();
}
