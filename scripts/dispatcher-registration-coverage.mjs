#!/usr/bin/env node
/**
 * dispatcher-registration-coverage -- find dispatcher register functions that are
 * EXPORTED (registerXDispatcher in src/tools/dispatchers/*.ts) but never CALLED in
 * src/index.ts. Such a dispatcher's MCP tool is DORMANT (built but unexposed).
 * Formalizes the ad-hoc path-scan diff that found prism_algorithm,
 * prism_unwired_bridge, and 5 earlier dormant dispatchers this session, so future
 * drift is caught automatically instead of re-discovered by hand.
 *
 * DISCOVERY-EFFICIENCY/U-DISPATCHER-REGISTRATION-COVERAGE (slot:tango, 2026-06-15).
 *
 * DISTINCT from the /dispatcher-coverage SKILL: that skill pivots
 * ENGINE_WIRING_INDEX.json on the dispatcher axis (engines-per-dispatcher heatmap)
 * and ASSUMES the dispatcher is registered. THIS tool checks the index.ts
 * registration layer -- the gap where a dispatcher exists in code but its tool is
 * never exposed, which the engine-fan-out view cannot see. Sibling of
 * scripts/algorithm-dispatcher-coverage.mjs (same pure-core + CLI shape).
 *
 * Pure-node fs scan (no external process -- robust on Windows). Classifies each
 * dormant dispatcher so the report is directly actionable:
 *   - safety-sensitive (machine / security): do NOT blind-register -- needs
 *     operator/owner intent before exposing a machine-control / security tool.
 *   - cross-lane (cad / cam): domain-owned -- surface to delta / kilo.
 *   - candidate: read-only / in-lane -- verify safe, then register.
 *
 * Usage: node scripts/dispatcher-registration-coverage.mjs [--dispatchers <dir>] [--index <path>] [--json]
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DEFAULT_DISPATCHERS = join(REPO_ROOT, "mcp-server", "src", "tools", "dispatchers");
const DEFAULT_INDEX = join(REPO_ROOT, "mcp-server", "src", "index.ts");

// Safety-sensitive dispatcher bases -- exposing these has real-world risk; never
// auto-register without explicit owner/operator intent.
const SAFETY_BASES = new Set(["machine", "security"]);
// Cross-lane (domain-owned) bases -> the slot that owns the decision to expose.
const CROSS_LANE_OWNERS = { cadautomation: "delta", camfunction: "kilo", cad: "delta", cam: "kilo" };

/** Strip a `//` line comment from a single line (keeps everything before it). */
function uncomment(line) {
  const i = line.indexOf("//");
  return i >= 0 ? line.slice(0, i) : line;
}

/** Remove all `//` line comments from a source blob (line by line). */
function stripLineComments(src) {
  return src.split("\n").map(uncomment).join("\n");
}

/**
 * List every exported register*Dispatcher function across the dispatchers dir.
 * Returns [{regName, base, file, toolName}]. Commented-out exports are ignored.
 */
export function listDispatcherExports(dir, readDir = readdirSync, readFile = (f) => readFileSync(f, "utf8")) {
  const out = [];
  let files;
  try { files = readDir(dir); } catch { return out; }
  for (const f of files) {
    if (!f.endsWith(".ts") || f.endsWith(".test.ts")) continue;
    let raw;
    try { raw = readFile(join(dir, f)); } catch { continue; }
    const txt = stripLineComments(raw);
    const reExport = /export\s+function\s+(register([A-Za-z0-9]+)Dispatcher)\s*\(/g;
    let m;
    while ((m = reExport.exec(txt)) !== null) {
      const regName = m[1];
      const base = m[2];
      // Match `.tool("prism_X"` regardless of the receiver -- some dispatchers
      // use `(server as any).tool(...)` / `(server as McpServer).tool(...)`, so
      // anchoring on `server.tool` would miss them (false "no tool name").
      const toolMatch = txt.match(/\.tool\(\s*["'](prism_[A-Za-z0-9_]+)["']/);
      out.push({ regName, base, file: f, toolName: toolMatch ? toolMatch[1] : null });
    }
  }
  return out;
}

/** Set of register*Dispatcher names actually CALLED (active, non-commented) in index.ts. */
export function listIndexRegistrations(indexPath, readFile = (f) => readFileSync(f, "utf8")) {
  const called = new Set();
  let raw;
  try { raw = readFile(indexPath); } catch { return called; }
  const re = /\b(register[A-Za-z0-9]+Dispatcher)\s*\(/g;
  for (const rawLine of raw.split("\n")) {
    const line = uncomment(rawLine);
    let m;
    while ((m = re.exec(line)) !== null) called.add(m[1]);
  }
  return called;
}

/** Lowercased text of every `//` comment in index.ts (the record of deliberate skips). */
export function extractIndexComments(indexPath, readFile = (f) => readFileSync(f, "utf8")) {
  let raw;
  try { raw = readFile(indexPath); } catch { return ""; }
  const parts = [];
  for (const line of raw.split("\n")) {
    const i = line.indexOf("//");
    if (i >= 0) parts.push(line.slice(i + 2));
  }
  return parts.join("\n").toLowerCase();
}

/**
 * Classify a dormant dispatcher for actionable routing. Pure.
 * @param {{collidesWith?: string[], documentedSkip?: boolean}} [opts]
 *   collidesWith = regNames of ACTIVE dispatchers already owning this tool name
 *   (duplicate tool name crashes boot). documentedSkip = index.ts carries a
 *   comment mentioning this dispatcher's tool name / register fn (an authoritative
 *   record of a deliberate skip -- usually a tool-name collision the SDK rejects).
 *   Either makes it a do-NOT-register, NOT a wiring candidate.
 */
export function classifyDispatcher(base, toolName, opts = {}) {
  const collidesWith = Array.isArray(opts.collidesWith) ? opts.collidesWith : [];
  if (opts.documentedSkip) {
    return { klass: "intentionally-skipped", owner: null, note: `index.ts documents a deliberate skip for ${toolName || base} -- do NOT register without re-reading that comment (usually a tool-name collision that crashes boot)` };
  }
  if (collidesWith.length) {
    return { klass: "superseded", owner: null, note: `tool name ${toolName} already owned by ${collidesWith.join(", ")} -- do NOT register (duplicate tool name crashes boot)` };
  }
  const key = String(base || "").toLowerCase();
  if (SAFETY_BASES.has(key) || /security|machine/.test(String(toolName || ""))) {
    return { klass: "safety-sensitive", owner: null, note: "do NOT blind-register (machine-control/security) -- needs operator/owner intent" };
  }
  if (CROSS_LANE_OWNERS[key]) {
    return { klass: "cross-lane", owner: CROSS_LANE_OWNERS[key], note: `domain-owned -- surface to ${CROSS_LANE_OWNERS[key]}` };
  }
  return { klass: "candidate", owner: null, note: "read-only / in-lane candidate -- verify safe, then register" };
}

/**
 * Compute dispatcher registration coverage.
 * @returns {{totalExports, registeredCount, dormantCount, coveragePct, dormant: object[]}}
 */
export function computeCoverage(opts = {}) {
  const dispatchersDir = opts.dispatchersDir || DEFAULT_DISPATCHERS;
  const indexPath = opts.indexPath || DEFAULT_INDEX;

  const exportsList = listDispatcherExports(dispatchersDir);
  const called = listIndexRegistrations(indexPath);
  const indexComments = extractIndexComments(indexPath);

  // Dedupe by regName (one logical dispatcher per register fn name).
  const byName = new Map();
  for (const e of exportsList) if (!byName.has(e.regName)) byName.set(e.regName, e);
  const all = [...byName.values()];

  // Tool names owned by ACTIVE (registered) dispatchers -- a dormant dispatcher
  // sharing one of these is superseded (registering it would crash boot on a
  // duplicate MCP tool name), NOT a wiring candidate.
  const registeredToolOwners = new Map();
  for (const e of all) {
    if (called.has(e.regName) && e.toolName) {
      if (!registeredToolOwners.has(e.toolName)) registeredToolOwners.set(e.toolName, []);
      registeredToolOwners.get(e.toolName).push(e.regName);
    }
  }

  const dormant = all
    .filter((e) => !called.has(e.regName))
    .map((e) => {
      const collidesWith = e.toolName ? (registeredToolOwners.get(e.toolName) || []) : [];
      const documentedSkip =
        (!!e.toolName && indexComments.includes(e.toolName.toLowerCase())) ||
        indexComments.includes(e.regName.toLowerCase());
      return { ...e, ...classifyDispatcher(e.base, e.toolName, { collidesWith, documentedSkip }) };
    })
    .sort((a, b) => (a.regName < b.regName ? -1 : a.regName > b.regName ? 1 : 0));
  const registeredCount = all.length - dormant.length;

  return {
    totalExports: all.length,
    registeredCount,
    dormantCount: dormant.length,
    coveragePct: all.length ? Math.round((registeredCount / all.length) * 100) : 0,
    dormant,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function runCLI(argv) {
  const a = { dispatchers: DEFAULT_DISPATCHERS, index: DEFAULT_INDEX, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dispatchers") a.dispatchers = argv[++i];
    else if (argv[i] === "--index") a.index = argv[++i];
    else if (argv[i] === "--json") a.json = true;
  }
  const r = computeCoverage({ dispatchersDir: a.dispatchers, indexPath: a.index });
  if (a.json) { console.log(JSON.stringify(r, null, 2)); return; }
  console.log(`dispatcher-registration coverage -- ${r.registeredCount}/${r.totalExports} registered (${r.coveragePct}%), ${r.dormantCount} dormant (exported but not called in index.ts)`);
  if (!r.dormant.length) { console.log("  (no dormant dispatchers -- every register*Dispatcher export is wired)"); return; }
  for (const klass of ["candidate", "cross-lane", "safety-sensitive", "superseded", "intentionally-skipped"]) {
    const group = r.dormant.filter((d) => d.klass === klass);
    if (!group.length) continue;
    console.log(`\n${klass.toUpperCase()}:`);
    for (const d of group) {
      console.log(`  ${d.toolName || "(no prism_ tool name)"}  [${d.regName} in ${d.file}]  -- ${d.note}`);
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCLI(process.argv.slice(2));
}
