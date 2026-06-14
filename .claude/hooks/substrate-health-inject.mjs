#!/usr/bin/env node
/**
 * .claude/hooks/substrate-health-inject.mjs
 *
 * SessionStart hook — surfaces `scripts/declared-vs-actual.mjs` drift in
 * every chat's SessionStart context bundle. The substrate-health gate I
 * shipped earlier today only runs inside /forge7 §Phase 0.2; this hook
 * extends its reach to EVERY session so chats learn about dormancy without
 * explicit invocation.
 *
 * Wiring lens (Synergy #1 from the 2026-05-19 audit): touches scripts +
 * hooks + awareness + startup. Closes the gap where today's bug class
 * (typo'd `prism-mcp-server` enable list, missing `prism_safe`) was
 * invisible to every existing audit until manually checked.
 *
 * Discipline:
 *   - ADVISORY only, NEVER blocking — emits additionalContext + exits 0
 *     on any error
 *   - Cache at state/shared/.cache/substrate-health-last.json, TTL 2h
 *     so we don't re-run the (sub-second) script per session but DO
 *     catch fresh drift on the next cache miss
 *   - Subprocess spawn with 8s timeout — if declared-vs-actual.mjs hangs
 *     (e.g. mid-edit of a settings file), we don't hang SessionStart
 *   - Fail-soft on every error class — no inject is better than a
 *     crashed inject
 *
 * Knobs:
 *   PRISM_SUBSTRATE_HEALTH_INJECT=0  — disable entirely
 *   PRISM_SUBSTRATE_HEALTH_TTL_MS=N  — override cache TTL (default 7200000)
 *
 * Stdin: standard SessionStart JSON envelope (ignored — we just inject)
 * Stdout: hookSpecificOutput.additionalContext payload
 *
 * Exit: always 0 (advisory)
 */

// tier: T2
// SessionStart hook — substrate-health drift digest injector
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// PRISM_ROOT: env override first (peer-hook convention, e.g. awareness-snapshot-inject),
// then the H: pin from `feedback_h_drive_master.md`. existsSync(SCRIPT_PATH) is the
// downstream gate — a wrong root still fails closed (returns null, never blocks).
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/PRISM";
const SCRIPT_PATH = path.join(PRISM_ROOT, "scripts/declared-vs-actual.mjs");
const CACHE_DIR = path.join(PRISM_ROOT, "state/shared/.cache");
const CACHE_FILE = path.join(CACHE_DIR, "substrate-health-last.json");
const DEFAULT_TTL_MS = 7200000;   // 2h
const SCRIPT_TIMEOUT_MS = 8000;   // ceiling on subprocess hang
const MAX_CACHE_BYTES = 1_000_000; // 1MB cap on cache reads (hostile-payload class)

function emit(additionalContext) {
  // Always exit 0, always JSON envelope. Empty additionalContext = no-op.
  const payload = additionalContext
    ? { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } }
    : {};
  process.stdout.write(JSON.stringify(payload) + "\n");
  process.exit(0);
}

function readCache(ttlMs) {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const st = statSync(CACHE_FILE);
    // Hostile-payload guard: if the cache file is suspiciously large (corruption
    // or an attacker-controlled write), refuse to load. The real digest report
    // is consistently ~10-50 KB; anything past 1 MB is wrong.
    if (st.size > MAX_CACHE_BYTES) return null;
    const ageMs = Date.now() - st.mtimeMs;
    if (ageMs > ttlMs) return null;
    const j = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (!j || typeof j !== "object" || !j.summary) return null;
    return { report: j, ageMs };
  } catch {
    return null;
  }
}

function writeCacheAtomic(report) {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    const tmp = `${CACHE_FILE}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, JSON.stringify(report), "utf8");
    // Atomic rename — avoid partial-state visibility on concurrent reads
    renameSync(tmp, CACHE_FILE);
  } catch {
    // Best-effort cache write; never block on it
  }
}

function runScript() {
  if (!existsSync(SCRIPT_PATH)) return null;
  const r = spawnSync(process.execPath, [SCRIPT_PATH, "--json"], {
    cwd: PRISM_ROOT,
    encoding: "utf8",
    timeout: SCRIPT_TIMEOUT_MS,
    maxBuffer: 4 * 1024 * 1024,
  });
  // declared-vs-actual exits 0 (clean) or 1 (drift) — both produce valid JSON
  // exit 2 = reader error (no JSON). Accept stdout only when non-empty.
  if (r.error || !r.stdout) return null;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}

/**
 * Format the 2-3 line digest that goes into additionalContext.
 * Pure — no I/O.
 */
export function formatDigest(report, ageMs) {
  if (!report || !report.summary) return null;
  // Coerce undefined/null/string-falsy/-negative → 0; never let an "undefined"
  // string leak into the rendered digest (a hostile / malformed cached report
  // would otherwise display "drift undefined" or "⚠ undefined BLOCKING").
  const driftRaw = report.summary.drift_count;
  const blockingRaw = report.summary.blocking_count;
  const drift_count = Number.isFinite(driftRaw) && driftRaw >= 0 ? driftRaw : 0;
  const blocking_count =
    Number.isFinite(blockingRaw) && blockingRaw >= 0 ? blockingRaw : 0;
  // ok === true only when the producer explicitly asserts clean. Any other
  // truthy/falsy/string value falls through to the ⚠ branch (fail-loud R12).
  const status =
    report.summary.ok === true ? "✓ clean" : `⚠ ${blocking_count} BLOCKING`;
  // ageMs semantics:
  //   null       → script not run this turn (shouldn't reach here, but treat as fresh)
  //   0          → freshly run by this hook invocation
  //   > 0        → cache hit, N minutes old
  // Both null and 0 surface as "fresh" — the user only cares about staleness once
  // the cached digest has aged at least a minute.
  const ageLabel = ageMs == null || ageMs === 0
    ? "fresh"
    : `cached ${Math.floor(ageMs / 60000)}m ago`;
  const mcpDormant = report.mcp?.dormant_declared_not_configured || [];
  const envScaffold = report.env?.scaffolded_empty || [];
  const hookOrphan = report.hooks?.unwired_on_disk?.length || 0;

  const lines = [
    `## 🧪 Substrate health (declared-vs-actual ${report.schemaVersion || "?"}, ${ageLabel})`,
    `   ${status} · drift ${drift_count} · ${mcpDormant.length ? `MCP dormant: ${mcpDormant.join(", ")}` : "MCP clean"}` +
      (envScaffold.length ? ` · env empty: ${envScaffold.length}` : "") +
      (hookOrphan ? ` · ${hookOrphan} hooks orphan-on-disk` : ""),
    `   _Run \`node scripts/declared-vs-actual.mjs --text\` for the full report. Disable: PRISM_SUBSTRATE_HEALTH_INJECT=0_`,
  ];
  return lines.join("\n");
}

function main() {
  if (process.env.PRISM_SUBSTRATE_HEALTH_INJECT === "0") return emit(null);

  const ttlMs = Number(process.env.PRISM_SUBSTRATE_HEALTH_TTL_MS) || DEFAULT_TTL_MS;
  const cached = readCache(ttlMs);

  let report;
  let ageMs;
  if (cached) {
    report = cached.report;
    ageMs = cached.ageMs;
  } else {
    report = runScript();
    if (!report) return emit(null); // script unavailable or hung — silent skip
    writeCacheAtomic(report);
    ageMs = 0;
  }

  const digest = formatDigest(report, ageMs);
  if (!digest) return emit(null);
  emit(digest);
}

// Only auto-execute main() when invoked directly as a script, not when
// imported (so the test suite can exercise formatDigest hermetically without
// running spawnSync/cache I/O and without polluting stdout with the SessionStart
// JSON envelope).
//
// Windows is case-insensitive on disk but `===` is not — `H:/PRISM` and
// `h:/prism` resolve to the same file. `path.relative(a,b) === ''` uses the
// platform-correct comparator and handles backslash/slash mixing.
function isInvokedDirectly() {
  if (typeof process.argv[1] !== "string") return false;
  try {
    const here = fileURLToPath(import.meta.url);
    const argv = path.resolve(process.argv[1]);
    return path.relative(here, argv) === "";
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) {
  try {
    main();
  } catch {
    emit(null);
  }
}
