#!/usr/bin/env node
// tier: T3
/**
 * rgs-outcome-record-stop.mjs — Stop hook
 *
 * Closes the RGS tool-plan feedback loop by appending outcome records to
 * state/shared/roadmap-tool-plan-outcomes.jsonl after every session Stop.
 *
 * Algorithm:
 *   1. Read roadmap-tool-plan-picked.jsonl (if missing → no-op).
 *   2. Gather signals: last-30 commit bodies, scrutiny ledger, revert detection.
 *   3. Call pure extractOutcomes() from scripts/lib/rgs-plan-outcome.mjs.
 *   4. Append new records (dedup on {unitKey,outcome}).
 *   5. ALWAYS emit {continue:true,suppressOutput:true} — never blocks Stop.
 *
 * Knob: PRISM_RGS_OUTCOME_RECORD_DISABLE=1 → immediate no-op.
 *
 * Test-injection env vars (hermetic tests only — never set in production):
 *   PRISM_RGS_PICKED_PATH   — override default picked.jsonl path
 *   PRISM_RGS_OUTCOMES_PATH — override default outcomes.jsonl path
 *   PRISM_RGS_TEST_COMMITS  — newline-separated fake commit bodies (skips git)
 *   PRISM_RGS_TEST_REVERTS  — newline-separated fake revert subjects (skips git)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

// Derive the repo root from this hook's own location (<root>/.claude/hooks/),
// overridable via PRISM_ROOT for hermetic tests / non-default checkouts.
const PRISM_ROOT =
  process.env.PRISM_ROOT ??
  path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");

const PICKED_PATH =
  process.env.PRISM_RGS_PICKED_PATH ??
  path.join(PRISM_ROOT, "state/shared/roadmap-tool-plan-picked.jsonl");

const OUTCOMES_PATH =
  process.env.PRISM_RGS_OUTCOMES_PATH ??
  path.join(PRISM_ROOT, "state/shared/roadmap-tool-plan-outcomes.jsonl");

const SCRUTINY_LEDGER_PATH = path.join(
  PRISM_ROOT,
  "mcp-server/data/state/SCRUTINY_LEDGER.json"
);

const OUTCOME_LIB_PATH = path.join(
  PRISM_ROOT,
  "scripts/lib/rgs-plan-outcome.mjs"
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of recent commit bodies to gather. */
const COMMIT_LOOKBACK = 30;

/** Regex to detect revert/rollback in commit subjects. */
const REVERT_RE = /revert|rollback/i;

/** Unit-id pattern for revert subject extraction. */
const UNIT_ID_RE = /(?:[\[/\s]|^)(U-[A-Z0-9][A-Z0-9-]*)/gm;

/** spawnSync git timeout. Must stay below the settings.json harness timeout
 *  for this hook so the git child is reaped cleanly before the hook is
 *  hard-killed (an orphaned git child otherwise leaks). */
const GIT_SPAWN_TIMEOUT_MS = 2500;

// ---------------------------------------------------------------------------
// Bootstrap — always-emit helper
// ---------------------------------------------------------------------------

/** Unconditionally emit the hook approval and exit cleanly. */
function approve(suppressOutput = true) {
  process.stdout.write(
    JSON.stringify({ continue: true, suppressOutput }) + "\n"
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Main (wrapped in try/catch so nothing ever throws past this boundary)
// ---------------------------------------------------------------------------

async function main() {
  // Knob: instant no-op
  if (process.env.PRISM_RGS_OUTCOME_RECORD_DISABLE === "1") {
    approve(true);
  }

  // Read stdin (Stop hook payload — we don't need its contents)
  let _stdinRaw = "";
  try {
    _stdinRaw = readFileSync(0, "utf-8");
  } catch {
    // stdin closed or unreadable — safe to proceed without it
  }

  // --- 1. Load picked events -----------------------------------------------
  if (!existsSync(PICKED_PATH)) {
    // No picked.jsonl → nothing to classify → no-op
    approve(true);
  }

  let pickedEvents = [];
  try {
    const raw = readFileSync(PICKED_PATH, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const rec = JSON.parse(trimmed);
        if (rec && rec.unitKey && Array.isArray(rec.predictedPipelines)) {
          pickedEvents.push({
            unitKey: rec.unitKey,
            sid: rec.sid ?? "",
            predictedPipelines: rec.predictedPipelines,
            tier: typeof rec.tier === "string" ? rec.tier : "",
            verdict: typeof rec.verdict === "string" ? rec.verdict : "",
          });
        }
      } catch {
        // skip malformed line
      }
    }
  } catch {
    // unreadable picked file → no-op
    approve(true);
  }

  if (pickedEvents.length === 0) {
    approve(true);
  }

  // --- 2. Gather signals ---------------------------------------------------

  // 2a. Commit bodies — test-injection or real git
  let commitBodies = [];
  if (process.env.PRISM_RGS_TEST_COMMITS !== undefined) {
    commitBodies = process.env.PRISM_RGS_TEST_COMMITS.split("\n").filter(Boolean);
  } else {
    try {
      const result = spawnSync(
        "git",
        ["-C", PRISM_ROOT, "log", `-${COMMIT_LOOKBACK}`, "--format=%B"],
        { encoding: "utf-8", timeout: GIT_SPAWN_TIMEOUT_MS }
      );
      if (result.status === 0 && result.stdout) {
        // git log --format=%B separates commits with blank lines; split on double-newline
        commitBodies = result.stdout
          .split(/\n{2,}/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } catch {
      // git unavailable → no commit signal; still classify (will → blocked)
    }
  }

  // 2b. Revert detection — test-injection or real git
  const revertedKeys = new Set();
  let revertSubjects = [];
  if (process.env.PRISM_RGS_TEST_REVERTS !== undefined) {
    revertSubjects = process.env.PRISM_RGS_TEST_REVERTS.split("\n").filter(Boolean);
  } else {
    try {
      const result = spawnSync(
        "git",
        ["-C", PRISM_ROOT, "log", "--since=24 hours ago", "--format=%s"],
        { encoding: "utf-8", timeout: GIT_SPAWN_TIMEOUT_MS }
      );
      if (result.status === 0 && result.stdout) {
        revertSubjects = result.stdout.split("\n").filter(Boolean);
      }
    } catch {
      // git unavailable → no revert signal
    }
  }
  for (const subject of revertSubjects) {
    if (!REVERT_RE.test(subject)) continue;
    for (const match of subject.matchAll(UNIT_ID_RE)) {
      revertedKeys.add(match[1]);
    }
  }

  // 2c. Scrutiny ledger (optional — missing file is fine)
  let scrutinyLedger = [];
  try {
    if (existsSync(SCRUTINY_LEDGER_PATH)) {
      const raw = JSON.parse(readFileSync(SCRUTINY_LEDGER_PATH, "utf-8"));
      // Ledger shape: { entries: { [sessionId]: LedgerEntry } }
      if (raw && raw.entries && typeof raw.entries === "object") {
        scrutinyLedger = Object.values(raw.entries);
      }
    }
  } catch {
    // ledger unreadable → proceed without it
  }

  // --- 3. Classify ---------------------------------------------------------
  let newOutcomes = [];
  try {
    // Dynamic import of pure lib (ESM)
    const { extractOutcomes } = await import(
      /* webpackIgnore: true */ pathToFileURL(OUTCOME_LIB_PATH).href
    );
    newOutcomes = extractOutcomes({
      scrutinyLedger,
      commitBodies,
      pickedEvents,
      revertedKeys,
    });
  } catch (err) {
    // lib unavailable or threw — degrade gracefully
    approve(true);
  }

  if (newOutcomes.length === 0) {
    approve(true);
  }

  // --- 4. Dedup + append ---------------------------------------------------
  // Load existing outcomes to build dedup set on {unitKey,outcome}
  const existingKeys = new Set();
  try {
    if (existsSync(OUTCOMES_PATH)) {
      const raw = readFileSync(OUTCOMES_PATH, "utf-8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const rec = JSON.parse(trimmed);
          if (rec && rec.unitKey && rec.outcome) {
            existingKeys.add(`${rec.unitKey}:${rec.outcome}`);
          }
        } catch {
          // skip
        }
      }
    }
  } catch {
    // unreadable outcomes file → treat as empty, overwrite gracefully
  }

  const toAppend = newOutcomes.filter(
    (r) => !existingKeys.has(`${r.unitKey}:${r.outcome}`)
  );

  if (toAppend.length > 0) {
    try {
      const lines = toAppend.map((r) => JSON.stringify(r)).join("\n") + "\n";
      writeFileSync(OUTCOMES_PATH, lines, { flag: "a" });
    } catch {
      // write failed — still approve Stop
    }
  }

  approve(true);
}

// ---------------------------------------------------------------------------
// Entry point — wrap everything so no unhandled rejection ever reaches Stop
// ---------------------------------------------------------------------------

main().catch(() => approve(true));
