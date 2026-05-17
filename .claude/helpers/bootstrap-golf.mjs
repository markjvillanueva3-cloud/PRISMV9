#!/usr/bin/env node
// tier: T0
/**
 * bootstrap-golf.mjs — idempotent bootstrap for golf-slot state.
 *
 * Shipped under CLEANUP-MS0/U-CLEANUP-A6.
 *
 * What this does:
 *   1. Create state/shared/.cron-locks/ if missing (lockfile dir for golf cron registry).
 *   2. Seed empty shells of three golf JSON state files when MISSING ONLY:
 *      - state/shared/golf-owned-paths.json     (regen-golf-owned-paths.mjs populates)
 *      - state/shared/golf-token-budget.json    (golf-token-budget runtime populates)
 *      - state/shared/golf-cron-registry.json   (U-CLEANUP-E2 populates)
 *      Schemas mirror the canonical populated forms exactly.
 *   3. Detect a 0-byte coordination.db (corrupt SQLite shell from an aborted
 *      H8 first-touch) and unlink it + its WAL/SHM sidecars so the next H8
 *      caller (CoordinationStoreEngine) creates fresh. Healthy DBs untouched.
 *   4. Verify the six golf entries are present in .gitignore; REPORT missing
 *      (never mutate .gitignore — those entries are stable since 2026-05-13
 *      and a peer rewriting them is the only legitimate edit path).
 *
 * What this DOES NOT do:
 *   - Overwrite populated state files (re-seed only when empty/missing).
 *   - Touch healthy coordination.db files (file size > 0 = trust).
 *   - Mutate .gitignore (advisory only — emits a recovery hint instead).
 *   - Import any PRISM engine (.claude/helpers can't resolve H8 SQLite reliably;
 *     pure node only, per CLAUDE.md HOOK-SYNERGY-MS0 §H8 note).
 *   - git rm --cached anything (the envelope spec mentioned this for a "first
 *     run" — today's .gitignore is already correct + tracked-state is clean;
 *     manual operator call if ever needed).
 *
 * CLI:
 *   node .claude/helpers/bootstrap-golf.mjs                  default: seed missing, exit 0|3
 *   node .claude/helpers/bootstrap-golf.mjs --check          probe only, never mutate
 *   node .claude/helpers/bootstrap-golf.mjs --json           machine-readable output
 *   node .claude/helpers/bootstrap-golf.mjs --force          re-seed even when populated (DANGEROUS — clobbers)
 *   node .claude/helpers/bootstrap-golf.mjs --check --json   audit pipeline
 *
 * Exit codes:
 *   0  all clean OR seeded missing pieces successfully
 *   2  --check mode and gaps detected (auditor signals "operator action needed")
 *   3  bootstrap attempted but a filesystem write failed (genuine breakage)
 *
 * SAFETY:
 *   --force is the only path that overwrites a populated file. Operator must
 *   pass it explicitly; the default path never clobbers.
 */

import { readFileSync, writeFileSync, renameSync, existsSync, statSync, mkdirSync, unlinkSync } from "node:fs";
import { join, relative } from "node:path";

// ── Canonical paths (sourced from filesystem reality, not envelope-spec rumor) ──

const REPO_ROOT = "H:/prism";
const STATE_SHARED = join(REPO_ROOT, "state/shared");
const CRON_LOCKS_DIR = join(STATE_SHARED, ".cron-locks");
const OWNED_PATHS_JSON = join(STATE_SHARED, "golf-owned-paths.json");
const TOKEN_BUDGET_JSON = join(STATE_SHARED, "golf-token-budget.json");
const CRON_REGISTRY_JSON = join(STATE_SHARED, "golf-cron-registry.json");
const COORD_DB = join(STATE_SHARED, "coordination.db");
const COORD_DB_WAL = join(STATE_SHARED, "coordination.db-wal");
const COORD_DB_SHM = join(STATE_SHARED, "coordination.db-shm");
const GITIGNORE = join(REPO_ROOT, ".gitignore");

// The six .gitignore lines that A4+A5+A6 collectively require. Order does not
// matter to git; presence does. We probe each substring.
export const REQUIRED_GITIGNORE_ENTRIES = [
  "state/shared/coordination.db",
  "state/shared/coordination.db-wal",
  "state/shared/coordination.db-shm",
  "state/shared/.cron-locks/*.lock",
  "state/shared/.watchdog-last-poll.iso",
  "state/shared/golf-token-budget.json",
];

// ── Empty-shell schemas (mirror the canonical populated forms) ───────────────

export function emptyOwnedPathsShell(nowIso = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    generator: "bootstrap-golf.mjs (A6 empty shell — regen via regen-golf-owned-paths.mjs G11)",
    ownedPaths: [],
    // Regex that matches NOTHING — a populated allowlist must REPLACE this.
    // `^$` would also match empty strings but path comparison never receives "".
    // We use a regex that cannot match any path: alternation of impossible literal.
    allowlistRegex: "^\\u0000$",
    discoveredDashboards: [],
  };
}

export function emptyTokenBudgetShell() {
  return {
    schemaVersion: 1,
    dayKeyUTC: null,
    consumed: 0,
    capacity: 800000,
    lastReset: null,
    resetTimezone: "UTC",
  };
}

export function emptyCronRegistryShell(nowIso = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    generator: "bootstrap-golf.mjs (A6 empty shell — populate manually per U-CLEANUP-E2)",
    lockfileDir: ".cron-locks",
    timeBasis: "UTC",
    notes:
      "Empty shell — no cron entries scheduled. Bootstrap seeds the file so " +
      "downstream consumers (golf-cron-scheduler) never fail on missing-file. " +
      "Populate by editing crons[] with {id,name,scheduleUtc,cronExpr,prompt,...}.",
    crons: [],
  };
}

// ── Atomic write (write to tmp + rename — survives interrupted writes) ───────

function atomicWriteJson(path, obj) {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  const body = JSON.stringify(obj, null, 2) + "\n";
  writeFileSync(tmp, body, "utf8");
  renameSync(tmp, path);
}

// ── Individual probes / actions ──────────────────────────────────────────────

function ensureCronLocksDir(actions, opts) {
  const exists = existsSync(CRON_LOCKS_DIR);
  let isDir = false;
  if (exists) {
    try { isDir = statSync(CRON_LOCKS_DIR).isDirectory(); } catch { isDir = false; }
  }
  if (exists && isDir) {
    actions.push({ target: ".cron-locks/", state: "ok", action: "none", reason: "directory exists" });
    return { ok: true, mutated: false };
  }
  if (exists && !isDir) {
    actions.push({
      target: ".cron-locks/",
      state: "broken",
      action: opts.check ? "would-fail" : "skipped",
      reason: "path exists but is NOT a directory — manual intervention needed (will not delete a non-dir)",
    });
    return { ok: false, mutated: false };
  }
  if (opts.check) {
    actions.push({ target: ".cron-locks/", state: "missing", action: "would-create" });
    return { ok: false, mutated: false };
  }
  try {
    mkdirSync(CRON_LOCKS_DIR, { recursive: true });
    actions.push({ target: ".cron-locks/", state: "created", action: "mkdir" });
    return { ok: true, mutated: true };
  } catch (err) {
    actions.push({
      target: ".cron-locks/",
      state: "error",
      action: "mkdir-failed",
      reason: err?.message || String(err),
    });
    return { ok: false, mutated: false };
  }
}

function ensureSeedFile(actions, opts, label, path, shellFn) {
  const exists = existsSync(path);
  let size = -1;
  if (exists) {
    try { size = statSync(path).size; } catch { size = -1; }
  }

  // Populated case — never clobber unless --force
  if (exists && size > 0 && !opts.force) {
    actions.push({ target: label, state: "ok", action: "none", reason: `populated (${size}B)` });
    return { ok: true, mutated: false };
  }

  // --force on populated file
  if (exists && size > 0 && opts.force) {
    if (opts.check) {
      actions.push({ target: label, state: "ok", action: "would-clobber-force" });
      return { ok: false, mutated: false };
    }
    try {
      atomicWriteJson(path, shellFn());
      actions.push({ target: label, state: "clobbered", action: "write-empty-shell", reason: "--force given" });
      return { ok: true, mutated: true };
    } catch (err) {
      actions.push({ target: label, state: "error", action: "write-failed", reason: err?.message || String(err) });
      return { ok: false, mutated: false };
    }
  }

  // Missing or 0-byte case
  if (opts.check) {
    actions.push({
      target: label,
      state: exists ? "zero-byte" : "missing",
      action: "would-seed",
    });
    return { ok: false, mutated: false };
  }

  try {
    atomicWriteJson(path, shellFn());
    actions.push({
      target: label,
      state: "seeded",
      action: "write-empty-shell",
      reason: exists ? "previous file was 0-byte" : "did not exist",
    });
    return { ok: true, mutated: true };
  } catch (err) {
    actions.push({ target: label, state: "error", action: "write-failed", reason: err?.message || String(err) });
    return { ok: false, mutated: false };
  }
}

function inspectCoordinationDb(actions, opts) {
  if (!existsSync(COORD_DB)) {
    actions.push({
      target: "coordination.db",
      state: "missing",
      action: "none",
      reason: "absent — H8 CoordinationStoreEngine creates lazily on first use",
    });
    return { ok: true, mutated: false };
  }
  let size = -1;
  try { size = statSync(COORD_DB).size; } catch { size = -1; }
  if (size > 0) {
    actions.push({ target: "coordination.db", state: "ok", action: "none", reason: `healthy (${size}B)` });
    return { ok: true, mutated: false };
  }
  // 0-byte SQLite — corrupt shell, must be unlinked so H8 recreates clean.
  if (opts.check) {
    actions.push({ target: "coordination.db", state: "zero-byte", action: "would-unlink" });
    return { ok: false, mutated: false };
  }
  const unlinked = [];
  for (const p of [COORD_DB, COORD_DB_WAL, COORD_DB_SHM]) {
    if (!existsSync(p)) continue;
    try {
      unlinkSync(p);
      unlinked.push(relative(REPO_ROOT, p).replace(/\\/g, "/"));
    } catch (err) {
      actions.push({
        target: relative(REPO_ROOT, p).replace(/\\/g, "/"),
        state: "error",
        action: "unlink-failed",
        reason: err?.message || String(err),
      });
      return { ok: false, mutated: false };
    }
  }
  actions.push({
    target: "coordination.db",
    state: "rebuilt",
    action: "unlinked-corrupt-shell",
    reason: `removed ${unlinked.length} file(s): ${unlinked.join(", ")} — H8 will recreate on next open`,
  });
  return { ok: true, mutated: true };
}

function inspectGitignore(actions) {
  let body;
  try { body = readFileSync(GITIGNORE, "utf8"); } catch (err) {
    actions.push({
      target: ".gitignore",
      state: "error",
      action: "read-failed",
      reason: err?.message || String(err),
    });
    return { ok: false, mutated: false };
  }
  const missing = REQUIRED_GITIGNORE_ENTRIES.filter((entry) => !body.includes(entry));
  if (missing.length === 0) {
    actions.push({
      target: ".gitignore",
      state: "ok",
      action: "none",
      reason: `${REQUIRED_GITIGNORE_ENTRIES.length} required entries present`,
    });
    return { ok: true, mutated: false };
  }
  actions.push({
    target: ".gitignore",
    state: "incomplete",
    action: "advisory-only",
    reason:
      `Missing ${missing.length} entr${missing.length === 1 ? "y" : "ies"}: ` +
      missing.join(", ") +
      " — bootstrap-golf.mjs does NOT mutate .gitignore (those entries are stable since 2026-05-13; " +
      "a peer rewriting them is the only legitimate edit path). Add them manually if absent.",
    missing,
  });
  return { ok: false, mutated: false };
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export function runBootstrap(opts = {}) {
  const o = {
    check: !!opts.check,
    force: !!opts.force,
    // For testability — allow injecting a frozen "now" so JSON output is reproducible.
    nowIso: opts.nowIso || new Date().toISOString(),
  };
  const actions = [];
  const results = {
    cronLocks: ensureCronLocksDir(actions, o),
    ownedPaths: ensureSeedFile(actions, o, "golf-owned-paths.json", OWNED_PATHS_JSON, () => emptyOwnedPathsShell(o.nowIso)),
    tokenBudget: ensureSeedFile(actions, o, "golf-token-budget.json", TOKEN_BUDGET_JSON, emptyTokenBudgetShell),
    cronRegistry: ensureSeedFile(actions, o, "golf-cron-registry.json", CRON_REGISTRY_JSON, () => emptyCronRegistryShell(o.nowIso)),
    coordDb: inspectCoordinationDb(actions, o),
    gitignore: inspectGitignore(actions),
  };

  const mutated = Object.values(results).some((r) => r.mutated);
  const anyError = actions.some((a) => a.state === "error");
  const anyGap = actions.some((a) =>
    a.state === "missing" || a.state === "zero-byte" || a.state === "incomplete" || a.state === "broken"
  );

  let exitCode;
  if (anyError && !o.check) exitCode = 3;
  else if (o.check && anyGap) exitCode = 2;
  else exitCode = 0;

  return {
    ok: exitCode === 0,
    exitCode,
    mode: o.check ? "check" : o.force ? "force" : "default",
    mutated,
    actions,
    summary: {
      total: actions.length,
      ok: actions.filter((a) => a.state === "ok").length,
      missing: actions.filter((a) => a.state === "missing").length,
      seeded: actions.filter((a) => a.state === "seeded").length,
      clobbered: actions.filter((a) => a.state === "clobbered").length,
      created: actions.filter((a) => a.state === "created").length,
      rebuilt: actions.filter((a) => a.state === "rebuilt").length,
      zeroByte: actions.filter((a) => a.state === "zero-byte").length,
      incomplete: actions.filter((a) => a.state === "incomplete").length,
      broken: actions.filter((a) => a.state === "broken").length,
      error: actions.filter((a) => a.state === "error").length,
    },
  };
}

// ── CLI entry ────────────────────────────────────────────────────────────────

function runCli() {
  const argv = process.argv.slice(2);
  const opts = {
    check: argv.includes("--check"),
    force: argv.includes("--force"),
  };
  if (opts.check && opts.force) {
    process.stderr.write("bootstrap-golf: --check and --force are mutually exclusive\n");
    process.exit(64); // EX_USAGE
  }
  const wantJson = argv.includes("--json");
  const result = runBootstrap(opts);

  if (wantJson) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(`bootstrap-golf — mode=${result.mode}, exit=${result.exitCode}\n`);
    for (const a of result.actions) {
      const glyph =
        a.state === "ok" ? "✓" :
        a.state === "created" || a.state === "seeded" || a.state === "rebuilt" || a.state === "clobbered" ? "+" :
        a.state === "missing" || a.state === "zero-byte" ? "?" :
        a.state === "incomplete" || a.state === "broken" ? "⚠" :
        a.state === "error" ? "✗" : "·";
      const reason = a.reason ? ` (${a.reason})` : "";
      process.stdout.write(`  ${glyph} ${a.target.padEnd(28)} ${a.state}${reason}\n`);
    }
    if (result.exitCode === 2) {
      process.stdout.write("\nGaps detected (--check mode). Re-run without --check to seed.\n");
    } else if (result.exitCode === 3) {
      process.stdout.write("\nBootstrap attempted but at least one filesystem write failed. Check filesystem permissions.\n");
    }
  }
  process.exit(result.exitCode);
}

// Run only when invoked directly (not when imported by tests).
const argv1 = process.argv[1] ? process.argv[1].replaceAll("\\", "/") : "";
const isMain =
  import.meta.url === `file://${argv1}` ||
  import.meta.url.endsWith(argv1.split("/").pop() || "__never__");
if (isMain) runCli();
