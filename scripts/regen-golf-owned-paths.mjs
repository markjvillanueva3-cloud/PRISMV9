#!/usr/bin/env node
/**
 * regen-golf-owned-paths.mjs — U-CLEANUP-G11
 *
 * Single source of truth for the golf-slot write allowlist. Regenerates two
 * artifacts from one canonical registry:
 *
 *   1. state/shared/golf-owned-paths.json       — structured, human-readable.
 *      Seeded (partially) by bootstrap-golf.mjs (U-CLEANUP-A6); this script
 *      makes it canonical + complete and populates `generatedAt`.
 *
 *   2. state/shared/.golf-allowlist-regex.txt   — a single compiled regex on
 *      the first non-comment line. Consumed by golf-slot-write-allowlist.mjs
 *      (the A5 PreToolUse hook) at hook-load time. When this file is present
 *      and parseable, A5 uses ONLY this regex; its inline FALLBACK_ALLOW is the
 *      backup. Therefore the compiled regex MUST be a superset of A5's
 *      FALLBACK_ALLOW or golf chats silently lose write access — the test
 *      `regenGolfOwnedPaths.test.ts` imports `_internals.FALLBACK_ALLOW` from
 *      the A5 hook and asserts that invariant on every run.
 *
 * Why one script: the allowlist exists in two shapes (JSON path-list for
 * humans + audit tools; regex for the hot-path hook). Hand-syncing two shapes
 * drifts. CANONICAL_REGISTRY below is the only place a path is declared; both
 * artifacts derive from it deterministically.
 *
 * Derivation inputs:
 *   - CANONICAL_REGISTRY   — the authoritative list (mirrors A5 FALLBACK_ALLOW).
 *   - state/shared/dashboards/  — scanned so the JSON's `discoveredDashboards`
 *     reflects what actually exists (informational; the `dashboards/` dir glob
 *     in the registry covers every file under it regardless of the scan).
 *
 * Idempotency:
 *   - golf-owned-paths.json: `generatedAt` is only re-stamped when the semantic
 *     content (ownedPaths / allowlistRegex / discoveredDashboards) changes.
 *     A no-op re-run produces a byte-identical file → no git diff.
 *   - .golf-allowlist-regex.txt: timestamp-free; written only when the regex
 *     string changes.
 *
 * Invoked by:
 *   - scripts/close-out-milestone.mjs (regen step, non-fatal — A5 degrades to
 *     FALLBACK_ALLOW if this file is stale).
 *   - operator: `node scripts/regen-golf-owned-paths.mjs`
 *
 * Usage:
 *   node scripts/regen-golf-owned-paths.mjs              # apply (atomic writes)
 *   node scripts/regen-golf-owned-paths.mjs --dry-run    # report intent, no writes
 *   node scripts/regen-golf-owned-paths.mjs --check      # exit 1 if on-disk drifted
 *   node scripts/regen-golf-owned-paths.mjs --json       # machine-readable summary
 *   node scripts/regen-golf-owned-paths.mjs --root <dir> # sandbox root override
 *   node scripts/regen-golf-owned-paths.mjs --verbose
 *
 * Exit codes:
 *   0 = success (applied, dry-run, or --check found no drift)
 *   1 = IO error, OR --check found drift
 *
 * Spec: state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md (Subsystem G.G11)
 * Envelope: mcp-server/data/milestones/CLEANUP-MS0.json (U-CLEANUP-G11)
 */

import { existsSync, readFileSync, writeFileSync, renameSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// ─── CLI args ────────────────────────────────────────────────────────────

const ARGV = process.argv.slice(2);
const ARGSET = new Set(ARGV);
const DRY_RUN = ARGSET.has("--dry-run");
const CHECK = ARGSET.has("--check");
const JSON_OUT = ARGSET.has("--json");
const VERBOSE = ARGSET.has("--verbose") || ARGSET.has("-v");
const HELP = ARGSET.has("--help") || ARGSET.has("-h");
const rootIdx = ARGV.indexOf("--root");
const ROOT_OVERRIDE = rootIdx >= 0 && ARGV[rootIdx + 1] ? ARGV[rootIdx + 1] : null;

// ─── Configuration ───────────────────────────────────────────────────────

const REPO_ROOT = ROOT_OVERRIDE || "H:/prism";
const JSON_RELPATH = "state/shared/golf-owned-paths.json";
const REGEX_RELPATH = "state/shared/.golf-allowlist-regex.txt";
const DASHBOARDS_RELPATH = "state/shared/dashboards";
const SCHEMA_VERSION = 1;
const GENERATOR = "scripts/regen-golf-owned-paths.mjs (U-CLEANUP-G11)";
const DASHBOARD_SCAN_CAP = 2000; // guard against a pathological dashboards/ tree

/**
 * CANONICAL_REGISTRY — the single authoritative declaration of every path the
 * golf hygiene chat may write. Mirrors `FALLBACK_ALLOW` in
 * .claude/hooks/golf-slot-write-allowlist.mjs (A5). If you add an entry here,
 * the regenerated regex grants golf access; the superset test guards against
 * accidentally narrowing relative to A5's inline fallback.
 *
 * kind:
 *   "file" — exact repo-relative path        → ^<esc>$
 *   "dir"  — anything under the dir           → ^<esc-dir>/.+   (trailing / stripped)
 *   "glob" — `<dir>/` + `*` + `<suffix>`      → ^<esc-dir>/.+<esc-suffix>$
 */
export const CANONICAL_REGISTRY = [
  // ── Dashboards: any file under the dashboards/ tree ──
  { path: "state/shared/dashboards/", kind: "dir", note: "all golf-authored dashboards" },

  // ── Ledger JSONLs (append-only audit streams golf owns) ──
  { path: "state/shared/bug-attribution-ledger.jsonl", kind: "file", note: "regression attribution ledger" },
  { path: "state/shared/peer-audit-ticks.jsonl", kind: "file", note: "B6 peer-audit tick stream" },
  { path: "state/shared/wiki-inject-misses.jsonl", kind: "file", note: "wiki recall-miss telemetry" },
  { path: "state/shared/golf-envelope-mutations.jsonl", kind: "file", note: "golf envelope-write audit trail" },
  { path: "state/shared/system-viz-headline-history.jsonl", kind: "file", note: "system-viz headline deltas" },
  { path: "state/shared/DR_DRILL_LEDGER.jsonl", kind: "file", note: "G14 disaster-recovery drill ledger" },

  // ── Chat bus (shared communication channel) ──
  { path: "state/shared/AGENT_CHAT.jsonl", kind: "file", note: "fleet chat bus" },

  // ── Reports + dashboards (root state/shared) ──
  { path: "state/shared/JSONL_CONSUMER_AUDIT.md", kind: "file", note: "jsonl consumer audit" },
  { path: "state/shared/HOOK_HEALTH_DIGEST.md", kind: "file", note: "hook health digest" },
  { path: "state/shared/WIRING-CANDIDATES-DASHBOARD.md", kind: "file", note: "wiring candidates dashboard" },
  { path: "state/shared/WIKI_LINT_REPORT.md", kind: "file", note: "F6 wiki lint report" },
  { path: "state/shared/DISPATCHER_CAPACITY.md", kind: "file", note: "dispatcher capacity report" },
  { path: "state/shared/MEMORY_GARDEN_REPORT.md", kind: "file", note: "memory garden report" },
  { path: "state/shared/SKILL_UTILIZATION_REPORT.md", kind: "file", note: "skill utilization report" },
  { path: "state/shared/HOOK_UTILIZATION_REPORT.md", kind: "file", note: "hook utilization report" },
  { path: "state/shared/CLAUDE_MD_DRIFT_REPORT.md", kind: "file", note: "CLAUDE.md drift report" },
  { path: "state/shared/GSD_FRESHNESS_REPORT.md", kind: "file", note: "GSD freshness scan report" },
  { path: "state/shared/AWARENESS_HEALTH_DASHBOARD.md", kind: "file", note: "awareness health dashboard" },
  { path: "state/shared/SYSTEM_VIZ_LIVEDIFF.md", kind: "file", note: "system-viz live diff" },

  // ── Golf-owned config + transient state ──
  { path: "state/shared/golf-owned-paths.json", kind: "file", note: "this file (G11 output)" },
  { path: "state/shared/golf-token-budget.json", kind: "file", note: "golf daily token budget" },
  { path: "state/shared/golf-cron-registry.json", kind: "file", note: "E2 golf cron registry" },
  { path: "state/shared/golf-allowlist-regex.txt", kind: "file", note: "legacy non-dot regex name" },
  { path: "state/shared/.golf-allowlist-regex.txt", kind: "file", note: "the regex file (G11 output)" },
  { path: "state/shared/.envelope-drift-last.json", kind: "file", note: "F2 envelope-drift last hash" },
  { path: "state/shared/.watchdog-last-poll.iso", kind: "file", note: "watchdog last-poll timestamp" },
  { path: "state/shared/.peer-audit-cache.json", kind: "file", note: "peer-audit cache" },
  { path: "state/shared/.cron-locks/*.lock", kind: "glob", note: "golf cron lockfiles" },

  // ── System-viz staging dir (C3 writes here, F5 merges to live graph) ──
  { path: "state/shared/system-viz/staging/", kind: "dir", note: "C3 viz-add-node staging" },

  // ── Operational logs under mcp-server/data/state/ (read-only MCP logs) ──
  { path: "mcp-server/data/state/*.log", kind: "glob", note: "MCP operational logs" },
];

// ─── Pure helpers (exported for tests — no I/O) ──────────────────────────

/** Escape regex metacharacters in a literal path fragment. `/` is intentionally
 *  left unescaped — it is not special in a RegExp built via `new RegExp(str)`. */
export function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Convert one CANONICAL_REGISTRY entry to its regex *body* (the part after the
 *  leading `^`). Throws on a malformed entry rather than emitting a silent
 *  non-matching pattern. */
export function registryEntryToRegexBody(entry) {
  if (!entry || typeof entry.path !== "string" || !entry.path) {
    throw new Error(`registry entry missing path: ${JSON.stringify(entry)}`);
  }
  const { path: p, kind } = entry;
  if (kind === "file") {
    return `${escapeRe(p)}$`;
  }
  if (kind === "dir") {
    const base = p.replace(/\/+$/, ""); // strip trailing slash(es)
    if (!base) throw new Error(`dir entry resolves to empty base: ${p}`);
    return `${escapeRe(base)}/.+`;
  }
  if (kind === "glob") {
    const star = p.indexOf("*");
    if (star < 0) throw new Error(`glob entry has no '*': ${p}`);
    if (p.indexOf("*", star + 1) >= 0) throw new Error(`glob entry has >1 '*': ${p}`);
    const dirPart = p.slice(0, star);
    const suffixPart = p.slice(star + 1);
    return `${escapeRe(dirPart)}.+${escapeRe(suffixPart)}$`;
  }
  throw new Error(`unknown registry kind "${kind}" for ${p}`);
}

/** Compile the full allowlist regex *string* from a registry. Shape:
 *  `^(?:body1|body2|...)`. Each file body self-anchors with `$`; dir/glob
 *  bodies intentionally match a prefix. */
export function compileAllowlistRegexString(registry = CANONICAL_REGISTRY) {
  if (!Array.isArray(registry) || registry.length === 0) {
    throw new Error("registry must be a non-empty array");
  }
  const bodies = registry.map(registryEntryToRegexBody);
  return `^(?:${bodies.join("|")})`;
}

/** Convenience: compile to a live RegExp (also validates the string compiles). */
export function compileAllowlistRegex(registry = CANONICAL_REGISTRY) {
  return new RegExp(compileAllowlistRegexString(registry));
}

/** Recursively list files under `state/shared/dashboards/`, returned as sorted
 *  repo-relative forward-slash paths. Missing dir → []. Capped to guard against
 *  a pathological tree. */
export function scanDashboards(repoRoot) {
  const root = join(repoRoot, DASHBOARDS_RELPATH);
  if (!existsSync(root)) return [];
  const out = [];
  const walk = (abs) => {
    if (out.length >= DASHBOARD_SCAN_CAP) return;
    let entries;
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch {
      return; // unreadable subtree → skip, don't crash
    }
    for (const e of entries) {
      if (out.length >= DASHBOARD_SCAN_CAP) return;
      const childAbs = join(abs, e.name);
      if (e.isDirectory()) {
        walk(childAbs);
      } else if (e.isFile()) {
        out.push(relative(repoRoot, childAbs).split(sep).join("/"));
      }
    }
  };
  walk(root);
  return out.sort();
}

/** Build the golf-owned-paths.json object. `generatedAt` is supplied by the
 *  caller so idempotency logic can preserve a prior timestamp on a no-op run. */
export function buildOwnedPathsObject({ registry = CANONICAL_REGISTRY, discoveredDashboards = [], generatedAt }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: generatedAt ?? null,
    generator: GENERATOR,
    ownedPaths: registry.map((e) => e.path),
    allowlistRegex: compileAllowlistRegexString(registry),
    discoveredDashboards,
  };
}

/** Build the .golf-allowlist-regex.txt file content. Timestamp-free so a no-op
 *  re-run is byte-identical. A5 reads the first non-`#` line as the regex. */
export function buildRegexFileContent(regexString) {
  return [
    "# .golf-allowlist-regex.txt — golf-slot write allowlist",
    "# Consumed by .claude/hooks/golf-slot-write-allowlist.mjs (A5) at hook-load time.",
    `# GENERATED by ${GENERATOR} — do not hand-edit; edit CANONICAL_REGISTRY instead.`,
    "# A5 evaluates: customRegex.test(<repo-relative forward-slash path, rename-suffix stripped>).",
    regexString,
    "",
  ].join("\n");
}

/** Compare two JSON-able objects for semantic equality via canonical stringify. */
function semanticEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ─── I/O ─────────────────────────────────────────────────────────────────

function atomicWrite(absPath, content) {
  mkdirSync(dirname(absPath), { recursive: true }); // no-op when state/shared/ exists
  const tmp = `${absPath}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, content);
  renameSync(tmp, absPath); // atomic same-volume rename on NTFS/POSIX
}

function readFileOrNull(absPath) {
  try {
    return existsSync(absPath) ? readFileSync(absPath, "utf-8") : null;
  } catch {
    return null;
  }
}

// ─── Orchestrator ────────────────────────────────────────────────────────

function printHelp() {
  process.stdout.write(
    [
      "regen-golf-owned-paths.mjs — regenerate the golf-slot write allowlist (U-CLEANUP-G11)",
      "",
      "Usage:",
      "  node scripts/regen-golf-owned-paths.mjs            apply (atomic writes)",
      "  node scripts/regen-golf-owned-paths.mjs --dry-run  report intent, no writes",
      "  node scripts/regen-golf-owned-paths.mjs --check    exit 1 if on-disk drifted",
      "  node scripts/regen-golf-owned-paths.mjs --json     machine-readable summary",
      "  node scripts/regen-golf-owned-paths.mjs --root D   sandbox root override",
      "",
      "Outputs: state/shared/golf-owned-paths.json + state/shared/.golf-allowlist-regex.txt",
      "",
    ].join("\n"),
  );
}

export function run() {
  const report = {
    schemaVersion: SCHEMA_VERSION,
    ok: true,
    mode: DRY_RUN ? "dry-run" : CHECK ? "check" : "apply",
    root: REPO_ROOT,
    json: { path: JSON_RELPATH, action: "unchanged" },
    regex: { path: REGEX_RELPATH, action: "unchanged" },
    registryEntries: CANONICAL_REGISTRY.length,
    discoveredDashboards: 0,
    drift: false,
    errors: [],
  };

  try {
    const jsonAbs = join(REPO_ROOT, JSON_RELPATH);
    const regexAbs = join(REPO_ROOT, REGEX_RELPATH);

    // 1. Derive canonical content.
    const discoveredDashboards = scanDashboards(REPO_ROOT);
    report.discoveredDashboards = discoveredDashboards.length;
    const regexString = compileAllowlistRegexString(CANONICAL_REGISTRY);
    // Validate the regex actually compiles before we ever write it.
    new RegExp(regexString);

    // 2. JSON: preserve prior generatedAt iff semantic content is unchanged.
    const prevJsonRaw = readFileOrNull(jsonAbs);
    let prevJson = null;
    if (prevJsonRaw) {
      try {
        prevJson = JSON.parse(prevJsonRaw);
      } catch {
        prevJson = null; // unparseable → treat as absent, full regen
      }
    }
    // Idempotency: `generatedAt` is the ONLY field allowed to differ on an
    // otherwise-identical regeneration. Compare every other field against the
    // prev file directly; if they all match, preserve the prior timestamp so a
    // no-op re-run produces a byte-identical file.
    const candidate = buildOwnedPathsObject({ discoveredDashboards, generatedAt: null });
    const SEMANTIC_KEYS = ["schemaVersion", "generator", "ownedPaths", "allowlistRegex", "discoveredDashboards"];
    const pickSemantic = (o) => Object.fromEntries(SEMANTIC_KEYS.map((k) => [k, o == null ? undefined : o[k]]));
    const semanticUnchanged = prevJson != null && semanticEqual(pickSemantic(candidate), pickSemantic(prevJson));
    const generatedAt = semanticUnchanged && prevJson.generatedAt ? prevJson.generatedAt : new Date().toISOString();
    const jsonObj = buildOwnedPathsObject({ discoveredDashboards, generatedAt });
    const jsonContent = JSON.stringify(jsonObj, null, 2) + "\n";
    const jsonChanged = prevJsonRaw !== jsonContent;

    // 3. Regex file.
    const prevRegexRaw = readFileOrNull(regexAbs);
    const regexContent = buildRegexFileContent(regexString);
    const regexChanged = prevRegexRaw !== regexContent;

    report.drift = jsonChanged || regexChanged;

    if (CHECK) {
      report.json.action = jsonChanged ? "drift" : "unchanged";
      report.regex.action = regexChanged ? "drift" : "unchanged";
      report.ok = !report.drift;
    } else if (DRY_RUN) {
      report.json.action = jsonChanged ? "would-write" : "unchanged";
      report.regex.action = regexChanged ? "would-write" : "unchanged";
    } else {
      if (jsonChanged) {
        atomicWrite(jsonAbs, jsonContent);
        report.json.action = "written";
      }
      if (regexChanged) {
        atomicWrite(regexAbs, regexContent);
        report.regex.action = "written";
      }
    }

    if (VERBOSE) {
      process.stderr.write(`[regen-golf-owned-paths] mode=${report.mode} json=${report.json.action} regex=${report.regex.action} entries=${report.registryEntries} dashboards=${report.discoveredDashboards}\n`);
    }
  } catch (err) {
    report.ok = false;
    report.errors.push(err instanceof Error ? err.message : String(err));
  }

  return report;
}

function emit(report) {
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(report) + "\n");
    return;
  }
  process.stdout.write(`regen-golf-owned-paths: ${report.mode}\n`);
  process.stdout.write(`  ${JSON_RELPATH}: ${report.json.action}\n`);
  process.stdout.write(`  ${REGEX_RELPATH}: ${report.regex.action}\n`);
  process.stdout.write(`  registry entries: ${report.registryEntries} | dashboards discovered: ${report.discoveredDashboards}\n`);
  for (const e of report.errors) process.stdout.write(`  ✗ ${e}\n`);
  if (report.mode === "check") {
    process.stdout.write(report.drift ? "  ✗ drift detected — run without --check to regenerate\n" : "  ✓ no drift\n");
  } else if (report.ok) {
    process.stdout.write(`  ✓ ok${report.mode === "dry-run" ? " (preview, no writes)" : ""}\n`);
  }
}

// ─── Entry point (guarded so vitest import does not exec) ────────────────
// Exact path equality (matches the sibling convention in close-out-milestone.mjs)
// — not an endsWith() prefix test, which would mis-fire for a wrapper script
// whose basename happens to end with this filename.

const _invoked = process.argv[1] ? resolve(process.argv[1]) : "";
const _here = resolve(fileURLToPath(import.meta.url));
const _isMain = _invoked !== "" && _invoked === _here;

if (_isMain) {
  if (HELP) {
    printHelp();
    process.exit(0);
  }
  const report = run();
  emit(report);
  // Exit 1 on error OR on --check drift; 0 otherwise.
  process.exit(report.ok ? 0 : 1);
}
