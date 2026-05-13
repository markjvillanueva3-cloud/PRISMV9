#!/usr/bin/env node
/**
 * bootstrap-golf.mjs — U-CLEANUP-A6 bootstrap for the 7th "golf" hygiene chat.
 *
 * Idempotent first-run setup for the golf slot. Creates required directories,
 * seeds empty registry/budget/owned-paths files with explicit schemaVersion,
 * adds .gitignore patterns for transient state, and handles two corner cases
 * surfaced in spec ITERATION 4 (R3-UU1):
 *
 *   1. Fresh-clone 0-byte coordination.db — if coordination.db is present but
 *      empty (someone accidentally committed an empty file), unlink + leave
 *      regeneration to CoordinationStoreEngine's WAL init on first claim.
 *
 *   2. Accidentally tracked coordination.db — if the SQLite file is in the
 *      git index, run `git rm --cached coordination.db` so future commits
 *      stop fighting fleet state. Logs intent; user must commit the removal.
 *
 * Idempotency guarantees:
 *   - Re-running this script produces no diffs on the second run.
 *   - Files only get re-seeded if absent OR if existing schemaVersion < 1
 *     (forward-compat: schema bumps will reseed; rolling back is manual).
 *   - .gitignore additions are append-only with deduping check.
 *
 * Usage:
 *   node scripts/bootstrap-golf.mjs                # apply
 *   node scripts/bootstrap-golf.mjs --dry-run      # report intent only
 *   node scripts/bootstrap-golf.mjs --verbose      # report every check
 *
 * Exit codes:
 *   0 = success (every step succeeded OR was already idempotent no-op)
 *   1 = at least one step failed; check stderr for `step=... reason=...`
 *
 * Spec: state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md (Subsystem A.A6)
 * Envelope: mcp-server/data/milestones/CLEANUP-MS0.json (U-CLEANUP-A6)
 *
 * EXECUTION CONSTRAINT (main-tree-only):
 *   This script writes state/shared/golf-*.json and state/shared/.cron-locks/.
 *   Those paths are blocked from worktrees by hook-cross-worktree-block.mjs.
 *   Therefore: bootstrap MUST run from the main tree (H:/prism). The E2
 *   /golf-bootstrap skill that calls this script (CLEANUP-MS0 U-CLEANUP-E2)
 *   must NOT be invoked from a forked worktree — the firewall will block it.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync, unlinkSync, appendFileSync, renameSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";

// ─── CLI args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const argSet = new Set(args);
const DRY_RUN = argSet.has("--dry-run");
const VERBOSE = argSet.has("--verbose") || argSet.has("-v");
const rootFlagIdx = args.indexOf("--root");
const ROOT_OVERRIDE = rootFlagIdx >= 0 && args[rootFlagIdx + 1] ? args[rootFlagIdx + 1] : null;

// ─── Configuration ───────────────────────────────────────────────────────

const REPO_ROOT = ROOT_OVERRIDE || "H:/prism";
const STATE_DIR = join(REPO_ROOT, "state", "shared");
const SCRIPTS_DIR = join(REPO_ROOT, "scripts");
const CRON_LOCKS_DIR = join(STATE_DIR, ".cron-locks");
const GITIGNORE_PATH = join(REPO_ROOT, ".gitignore");
const COORDINATION_DB = join(STATE_DIR, "coordination.db");

const SCHEMA_VERSION = 1;

const SEEDS = [
  {
    path: join(STATE_DIR, "golf-owned-paths.json"),
    content: {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: null, // populated by G11 regenerator
      generator: "scripts/regen-golf-owned-paths.mjs (U-CLEANUP-G11)",
      ownedPaths: [
        "state/shared/dashboards/",
        "state/shared/bug-attribution-ledger.jsonl",
        "state/shared/peer-audit-ticks.jsonl",
        "state/shared/system-viz/staging/",
        "state/shared/AGENT_CHAT.jsonl",
        "state/shared/HOOK_HEALTH_DIGEST.md",
        "state/shared/WIRING-CANDIDATES-DASHBOARD.md",
        "state/shared/WIKI_LINT_REPORT.md",
        "state/shared/DISPATCHER_CAPACITY.md",
        "state/shared/JSONL_CONSUMER_AUDIT.md",
        "state/shared/MEMORY_GARDEN_REPORT.md",
        "state/shared/SKILL_UTILIZATION_REPORT.md",
        "state/shared/HOOK_UTILIZATION_REPORT.md",
        "state/shared/CLAUDE_MD_DRIFT_REPORT.md",
        "state/shared/GSD_FRESHNESS_REPORT.md",
        "state/shared/AWARENESS_HEALTH_DASHBOARD.md",
        "state/shared/SYSTEM_VIZ_LIVEDIFF.md",
        "state/shared/golf-envelope-mutations.jsonl",
        "state/shared/system-viz-headline-history.jsonl",
      ],
    },
  },
  {
    path: join(STATE_DIR, "golf-token-budget.json"),
    content: {
      schemaVersion: SCHEMA_VERSION,
      // Per Agent-B P1 #3 (2026-05-13 review): leave dayKey/lastReset null so
      // G15 activity-gate stamps them on first observation. Avoids the
      // 23:59:59-UTC race where bootstrap seeds "today" but G15 then treats
      // the budget as stale ≤1s later when UTC rolls.
      dayKeyUTC: null,
      consumed: 0,
      capacity: 800000, // R3-VER5: 800K Sonnet tokens/day budget
      lastReset: null,
      resetTimezone: "UTC",
    },
  },
  {
    path: join(STATE_DIR, "golf-cron-registry.json"),
    content: {
      schemaVersion: SCHEMA_VERSION,
      crons: [], // populated by E2 /golf-bootstrap skill at golf-chat SessionStart
      lockfileDir: ".cron-locks",
      timeBasis: "UTC",
    },
  },
];

const GITIGNORE_ADDITIONS = [
  "",
  "# CLEANUP-MS0 (golf hygiene chat) — transient state, never commit",
  "state/shared/coordination.db",
  "state/shared/coordination.db-wal",
  "state/shared/coordination.db-shm",
  "state/shared/.cron-locks/*.lock",
  "state/shared/.watchdog-last-poll.iso",
  "state/shared/golf-token-budget.json",
  "state/shared/.peer-audit-cache.json",
  "state/shared/.envelope-drift-last.json",
];

// ─── Logging ─────────────────────────────────────────────────────────────

const REPORT = { steps: [], errors: [] };

function recordStep(name, action, detail = "") {
  REPORT.steps.push({ step: name, action, detail });
  if (VERBOSE || action === "error") {
    const stream = action === "error" ? process.stderr : process.stdout;
    stream.write(`[bootstrap-golf] step=${name} action=${action}${detail ? ` ${detail}` : ""}\n`);
  }
}

function recordError(name, reason) {
  REPORT.errors.push({ step: name, reason });
  recordStep(name, "error", `reason="${reason}"`);
}

// ─── Steps ───────────────────────────────────────────────────────────────

function ensureDir(path, label) {
  try {
    if (existsSync(path)) {
      // Per Agent-B P1 #1: if `path` exists but is a FILE (not a directory),
      // bail loudly. mkdirSync+gitkeep further down would throw ENOTDIR with
      // no useful diagnostic; we surface the collision here.
      const st = statSync(path);
      if (!st.isDirectory()) {
        recordError(label, `path-collision: ${path} exists as ${st.isFile() ? "regular file" : "non-directory entry"}; manual repair required`);
        return false;
      }
      recordStep(label, "exists");
      return true;
    }
    if (DRY_RUN) {
      recordStep(label, "would-create", `path=${path}`);
      return true;
    }
    mkdirSync(path, { recursive: true });
    recordStep(label, "created", `path=${path}`);
    return true;
  } catch (err) {
    recordError(label, err.message);
    return false;
  }
}

// Atomic JSON write via tmp + rename (Agent-B P1 #4 — race-safe on Windows
// where appendFileSync/writeFileSync are non-atomic at >512 byte payloads
// and two-chat parallel-bootstrap could otherwise interleave bytes).
function atomicWriteFile(path, content) {
  const tmpPath = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmpPath, content);
  renameSync(tmpPath, path); // atomic same-volume rename on NTFS
}

function ensureFile(path, contentString, label) {
  try {
    if (existsSync(path)) {
      // Forward-compat: if existing file has schemaVersion < SCHEMA_VERSION, reseed.
      try {
        const existing = JSON.parse(readFileSync(path, "utf-8"));
        const existingVer = Number(existing.schemaVersion) || 0;
        if (existingVer >= SCHEMA_VERSION) {
          recordStep(label, "exists", `schemaVersion=${existingVer}`);
          return true;
        }
        if (DRY_RUN) {
          recordStep(label, "would-upgrade", `from=v${existingVer} to=v${SCHEMA_VERSION}`);
          return true;
        }
        // schema upgrade path: backup then overwrite
        const backup = path + `.v${existingVer}.bak`;
        writeFileSync(backup, readFileSync(path));
        atomicWriteFile(path, contentString);
        recordStep(label, "upgraded", `from=v${existingVer} to=v${SCHEMA_VERSION} backup=${backup}`);
        return true;
      } catch {
        // Existing file is not parseable JSON — leave it alone, log warning
        recordStep(label, "exists-unparseable", `path=${path} (skipping; manual repair required)`);
        return true;
      }
    }
    if (DRY_RUN) {
      recordStep(label, "would-seed", `path=${path}`);
      return true;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contentString);
    recordStep(label, "seeded", `path=${path}`);
    return true;
  } catch (err) {
    recordError(label, err.message);
    return false;
  }
}

function appendGitignore() {
  const label = "gitignore";
  try {
    let existing = "";
    if (existsSync(GITIGNORE_PATH)) existing = readFileSync(GITIGNORE_PATH, "utf-8");
    // Dedup: if the marker comment is already present, skip the whole block.
    const marker = "# CLEANUP-MS0 (golf hygiene chat)";
    if (existing.includes(marker)) {
      recordStep(label, "exists", "marker block already present");
      return true;
    }
    const addition = GITIGNORE_ADDITIONS.join("\n") + "\n";
    if (DRY_RUN) {
      recordStep(label, "would-append", `${GITIGNORE_ADDITIONS.length - 1} pattern lines`);
      return true;
    }
    appendFileSync(GITIGNORE_PATH, addition);
    recordStep(label, "appended", `${GITIGNORE_ADDITIONS.length - 1} pattern lines`);
    return true;
  } catch (err) {
    recordError(label, err.message);
    return false;
  }
}

function handleCoordinationDb() {
  const label = "coordination-db";
  try {
    // Case 1: file does not exist → nothing to do (CoordinationStoreEngine will create on first claim)
    if (!existsSync(COORDINATION_DB)) {
      recordStep(label, "absent", "engine will create on first claim");
      return true;
    }
    // Case 2: file exists but is 0-byte → corrupted (committed-empty case from R3-UU1)
    const sz = statSync(COORDINATION_DB).size;
    if (sz === 0) {
      if (DRY_RUN) {
        recordStep(label, "would-unlink-zero-byte", `size=0 path=${COORDINATION_DB}`);
      } else {
        unlinkSync(COORDINATION_DB);
        recordStep(label, "unlinked-zero-byte", "WAL init on next claim will recreate");
      }
    } else {
      recordStep(label, "valid", `size=${sz}`);
    }

    // Case 3: file is tracked in git → emit suggestion (don't auto-rm, side effects matter)
    let tracked = false;
    try {
      const out = execSync(`git -C "${REPO_ROOT}" ls-files state/shared/coordination.db`, {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 5000,
      }).trim();
      tracked = out.length > 0;
    } catch {
      // git command failed → assume not tracked
    }
    if (tracked) {
      if (DRY_RUN) {
        recordStep(label, "would-rm-cached", "coordination.db is tracked — would run: git rm --cached state/shared/coordination.db");
      } else {
        try {
          execSync(`git -C "${REPO_ROOT}" rm --cached state/shared/coordination.db`, {
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 5000,
          });
          recordStep(label, "untracked", "git rm --cached coordination.db (commit the removal to finalize)");
        } catch (err) {
          recordError(label, `git rm --cached failed: ${err.message}`);
        }
      }
    }
    return true;
  } catch (err) {
    recordError(label, err.message);
    return false;
  }
}

// ─── Orchestrator ────────────────────────────────────────────────────────

function run() {
  recordStep("bootstrap", "start", DRY_RUN ? "(dry-run)" : "(apply)");

  // 1. Ensure .cron-locks/ directory + .gitkeep
  ensureDir(CRON_LOCKS_DIR, "cron-locks-dir");
  const gitkeepPath = join(CRON_LOCKS_DIR, ".gitkeep");
  if (!existsSync(gitkeepPath) && !DRY_RUN) {
    try {
      writeFileSync(gitkeepPath, "");
      recordStep("cron-locks-gitkeep", "seeded");
    } catch (err) {
      recordError("cron-locks-gitkeep", err.message);
    }
  } else if (existsSync(gitkeepPath)) {
    recordStep("cron-locks-gitkeep", "exists");
  } else {
    recordStep("cron-locks-gitkeep", "would-seed");
  }

  // 2. Seed registry files
  for (const seed of SEEDS) {
    const label = `seed-${seed.path.split(/[/\\]/).pop()}`;
    ensureFile(seed.path, JSON.stringify(seed.content, null, 2) + "\n", label);
  }

  // 3. .gitignore additions
  appendGitignore();

  // 4. coordination.db corner cases
  handleCoordinationDb();

  recordStep("bootstrap", "complete", `steps=${REPORT.steps.length} errors=${REPORT.errors.length}`);

  // Always emit summary to stdout (for cron consumers)
  const summary = {
    schemaVersion: SCHEMA_VERSION,
    dryRun: DRY_RUN,
    ok: REPORT.errors.length === 0,
    stepCount: REPORT.steps.length,
    errorCount: REPORT.errors.length,
    errors: REPORT.errors,
  };
  process.stdout.write(JSON.stringify(summary) + "\n");

  process.exit(REPORT.errors.length === 0 ? 0 : 1);
}

run();
