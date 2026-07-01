#!/usr/bin/env node
// tier: T3
/**
 * edit-consumer-advisory.mjs — Awareness deliverable #5 (slot:bravo, 2026-06-11).
 *
 * PostToolUse:Edit ADVISORY (never blocks) that surfaces the REAL file-level
 * importers (downstream consumers) of an edited mcp-server/src source file, so
 * the agent's NEXT action is informed by the blast radius it just created
 * ("you edited FooEngine.ts — A, B, C import it; did you update them?").
 *
 * WHY a fresh ripgrep source instead of the existing impact hooks (R8 + R12):
 *   - dep-graph-impact.mjs is a SILENT NO-OP — it reads
 *     mcp-server/data/state/dependency-graph.json, which DOES NOT EXIST on this
 *     host, so it returns undefined on every edit (never fires). It also BLOCKS
 *     (decision:block) rather than advises, and is PreTool.
 *   - pre-edit-impact-analyzer.mjs is DISABLED (token-redux short-circuit) AND
 *     its "impact" was a fabricated heuristic (importedByCount = isEngine ? 3:1),
 *     never a real consumer lookup (R9 false-signal).
 *   - signature-drift-detector.mjs keys on content-hash drift via a pre-built
 *     ENGINE_USAGE_INDEX.json (same dead-index risk), a different axis.
 * This hook computes REAL importers at edit-time with ripgrep — no pre-built
 * graph dependency, so it can never silently no-op from a missing index.
 *
 * Relevance gate (keeps it quiet — fires on a small slice of edits):
 *   - Edit/Write/MultiEdit only; .ts/.tsx under mcp-server/src only.
 *   - skips test files (.test./.spec./__tests__) and generic barrels (index.ts).
 *   - only emits when importerCount >= MIN_IMPORTERS (default 3 — low blast
 *     radius is not worth a nudge).
 * Throttle: per-file cooldown sidecar (default 10 min) — never re-advise the
 *   same file within the window, even across chats (shared sidecar).
 *
 * Knobs:
 *   PRISM_EDIT_CONSUMER_ADVISORY_DISABLE=1     — off entirely
 *   PRISM_EDIT_CONSUMER_ADVISORY_COOLDOWN_MS=N — per-file cooldown (default 600000)
 *   PRISM_EDIT_CONSUMER_ADVISORY_MIN_IMPORTERS=N (default 3)
 *   PRISM_EDIT_CONSUMER_ADVISORY_TOPN=N        — max importers listed (default 8)
 *
 * Output shape: { continue:true, hookSpecificOutput:{ hookEventName:"PostToolUse",
 *   additionalContext:"<advisory>" } }. PostToolUse cannot block; this only adds
 * context. Fail-open everywhere (any error -> { continue:true }).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const DEFAULT_COOLDOWN_MS = 10 * 60 * 1000; // 10 min
export const DEFAULT_MIN_IMPORTERS = 3;
export const DEFAULT_TOPN = 8;
export const COOLDOWN_PATH = "H:/prism/state/edit-consumer-advisory-cooldown.json";
export const SRC_ROOT = "H:/prism";
const SRC_REL = "mcp-server/src";

function intFromEnv(env, key, dflt, { min = 0 } = {}) {
  const raw = env && env[key];
  if (raw == null || raw === "") return dflt;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min) return dflt;
  return n;
}

export function cooldownMsFromEnv(env) {
  return intFromEnv(env, "PRISM_EDIT_CONSUMER_ADVISORY_COOLDOWN_MS", DEFAULT_COOLDOWN_MS, { min: 0 });
}
export function minImportersFromEnv(env) {
  return intFromEnv(env, "PRISM_EDIT_CONSUMER_ADVISORY_MIN_IMPORTERS", DEFAULT_MIN_IMPORTERS, { min: 1 });
}
export function topNFromEnv(env) {
  return intFromEnv(env, "PRISM_EDIT_CONSUMER_ADVISORY_TOPN", DEFAULT_TOPN, { min: 1 });
}

function normSlashes(p) {
  return String(p || "").replace(/\\/g, "/");
}

export function basenameNoExt(filePath) {
  const p = normSlashes(filePath);
  const base = p.slice(p.lastIndexOf("/") + 1);
  return base.replace(/\.(tsx?|jsx?)$/, "");
}

/** True iff this is a source file whose consumers are worth surfacing. */
export function isRelevantFile(filePath) {
  const p = normSlashes(filePath);
  if (!p) return false;
  if (!/\.(ts|tsx)$/.test(p)) return false;
  if (!p.includes(`/${SRC_REL}/`) && !p.endsWith(`/${SRC_REL}`)) return false;
  if (p.includes("/__tests__/") || p.includes(".test.") || p.includes(".spec.")) return false;
  const base = basenameNoExt(p);
  // Generic barrels / entrypoints have noisy, uninformative importer sets.
  if (base === "index" || base === "types" || base === "constants") return false;
  return true;
}

/** Per-file cooldown: returns true if we advised this file within cooldownMs. */
export function shouldThrottle(filePath, cooldownState, nowMs, cooldownMs) {
  if (cooldownMs <= 0) return false;
  const key = normSlashes(filePath);
  const last = cooldownState && cooldownState[key];
  if (typeof last !== "number") return false;
  return (nowMs - last) < cooldownMs;
}

/** ripgrep pattern matching `from "...<base>"` and `from "...<base>.js"`. */
export function buildRgPattern(baseNoExt) {
  // Escape regex-significant chars in the basename (defensive; engine names are
  // alnum but be safe). Match an import specifier ending in the basename.
  const esc = baseNoExt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `from\\s+['"][^'"]*\\b${esc}(\\.js)?['"]`;
}

/**
 * Find files under mcp-server/src that import the edited file.
 * @param runRg injected (pattern, root) -> { status, stdout } so tests don't spawn.
 * @returns string[] of importer paths (relative to root), excluding self + tests.
 */
export function findImporters(filePath, { runRg, root = SRC_ROOT } = {}) {
  const base = basenameNoExt(filePath);
  if (!base) return [];
  const pattern = buildRgPattern(base);
  let out;
  try {
    out = runRg(pattern, root);
  } catch {
    return [];
  }
  if (!out || out.status !== 0 || !out.stdout) return [];
  const selfNorm = normSlashes(filePath);
  const seen = new Set();
  const importers = [];
  for (const lineRaw of String(out.stdout).split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line) continue;
    const n = normSlashes(line);
    // git grep / rg print paths relative to root (cwd); normalize + de-dupe.
    if (!/\.(ts|tsx)$/.test(n)) continue; // git grep sees all tracked files; keep TS only
    if (n.includes("/__tests__/") || n.includes(".test.") || n.includes(".spec.")) continue;
    if (selfNorm.endsWith(n) || n.endsWith(selfNorm) || selfNorm.includes(n)) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    importers.push(n);
  }
  return importers;
}

/**
 * Default importer-search runner (live path only; tests inject a stub).
 * Uses `git grep` rather than ripgrep: git is guaranteed present in this repo
 * and reliably Node-spawnable, whereas `rg` is NOT on the system PATH that
 * spawnSync sees on this host (it only resolves inside an interactive shell) —
 * spawning "rg" would ENOENT and silently return zero importers, the exact
 * silent-no-op failure this hook was built to avoid (R12).
 *   -l = files-with-matches, -I = skip binary, -P = PCRE (so \s / \b / (\.js)?
 *   in the pattern work). Pathspec limits to mcp-server/src.
 * git grep exit codes: 0 = matches, 1 = no matches, >1 = error.
 */
function defaultRunRg(pattern, root) {
  const res = spawnSync("git", ["grep", "-l", "-I", "-P", pattern, "--", SRC_REL], { windowsHide: true,
    cwd: root,
    encoding: "utf-8",
    timeout: 2500,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (res.error) throw res.error;
  if (res.status === 1) return { status: 0, stdout: "" }; // no matches
  if (res.status !== 0) return { status: 0, stdout: "" }; // error -> fail-open empty
  return { status: 0, stdout: res.stdout || "" };
}

export function assembleAdvisory(filePath, importers, { topN = DEFAULT_TOPN } = {}) {
  const base = basenameNoExt(filePath);
  const shown = importers.slice(0, topN);
  const more = importers.length - shown.length;
  const lines = [];
  lines.push(`## Edit blast-radius: ${base} has ${importers.length} importer(s)`);
  for (const imp of shown) lines.push(`  - ${imp}`);
  if (more > 0) lines.push(`  ...and ${more} more`);
  lines.push(`Verify these consumers still compile + behave after your change (Karpathy R8). Advisory only.`);
  return lines.join("\n");
}

export function loadCooldown(path = COOLDOWN_PATH) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

export function saveCooldown(state, path = COOLDOWN_PATH) {
  try {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmp = `${path}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify(state, null, 0));
    renameSync(tmp, path); // atomic-ish replace
  } catch {
    /* fail-open: cooldown is best-effort */
  }
}

/**
 * Pure decision core. Returns { emit, response, newCooldownState }.
 * newCooldownState is non-null only when the caller should persist it.
 */
export function evaluate({ stdin, env = {}, cooldownState = {}, nowMs, runRg, root = SRC_ROOT } = {}) {
  const pass = { emit: false, response: { continue: true }, newCooldownState: null };
  if (env.PRISM_EDIT_CONSUMER_ADVISORY_DISABLE === "1") return pass;

  let payload;
  try {
    payload = typeof stdin === "string" ? JSON.parse(stdin) : stdin;
  } catch {
    return pass;
  }
  if (!payload) return pass;

  const tool = payload.tool_name || payload.tool || "";
  if (!["Edit", "Write", "MultiEdit"].includes(tool)) return pass;
  const ti = payload.tool_input || payload.params || {};
  const filePath = ti.file_path || ti.path || "";
  if (!isRelevantFile(filePath)) return pass;

  const cooldownMs = cooldownMsFromEnv(env);
  if (shouldThrottle(filePath, cooldownState, nowMs, cooldownMs)) return pass;

  const importers = findImporters(filePath, { runRg, root });
  const minImporters = minImportersFromEnv(env);
  if (importers.length < minImporters) return pass;

  const advisory = assembleAdvisory(filePath, importers, { topN: topNFromEnv(env) });
  const nextState = { ...cooldownState, [normSlashes(filePath)]: nowMs };
  return {
    emit: true,
    response: {
      continue: true,
      hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: advisory },
    },
    newCooldownState: nextState,
  };
}

function main() {
  let stdin = "";
  try {
    stdin = readFileSync(0, "utf-8");
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const cooldownState = loadCooldown();
  const result = evaluate({
    stdin,
    env: process.env,
    cooldownState,
    nowMs: Date.now(),
    runRg: defaultRunRg,
  });
  if (result.newCooldownState) saveCooldown(result.newCooldownState);
  process.stdout.write(JSON.stringify(result.response));
}

// isDirect guard — only run main() when executed directly, not when imported by tests.
const isDirect = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] || "").href;
  } catch {
    return false;
  }
})();
if (isDirect) {
  try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
}
