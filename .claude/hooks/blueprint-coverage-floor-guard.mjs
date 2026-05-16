#!/usr/bin/env node
// tier: T0
/**
 * blueprint-coverage-floor-guard.mjs — Stop hook (BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U5)
 *
 * BLOCKS Stop if a session changed extraction-path code without re-running U7's
 * coverage audit. MINIMAL_ALLOWLIST: bypasses PRISM_HOOK_PROFILE so a "minimal"
 * profile chat cannot accidentally suppress this enforcement.
 *
 * RULE:
 *   1. Detect "did this session touch the blueprint-extraction path?" by
 *      examining the working-tree diff (HEAD vs current files) for files
 *      matching EXTRACTION_PATH_PATTERNS.
 *   2. If yes AND audit-marker `BLUEPRINT_COVERAGE_AUDIT.json` is missing or
 *      stale (mtime >24h or older than the newest touched file) → BLOCK with
 *      instructions to run the U8 audit + cite the touched file list.
 *   3. If no → silent allow.
 *
 * GRACEFUL DEGRADATION:
 *   U7 (BlueprintExtractionRAGEngine) and U8 (BlueprintCoverageAuditEngine) are
 *   not yet shipped (sister units in the same milestone). When the audit
 *   producer doesn't exist yet, blocking would be cruel — operators can't run
 *   what isn't built. Detection ladder:
 *     a. Marker file exists                       → enforce freshness gate
 *     b. Marker file missing AND U8 engine exists → block with "run audit"
 *     c. Marker file missing AND U8 engine missing → emit DEFERRED advisory
 *        (continue:true), tracked in coverage-floor-defer.jsonl so close-out
 *        accounting sees the open debt.
 *
 * BLOCK PROTOCOL (mirrors scrutinize-before-stop):
 *   First MAX_BLOCKS_PER_SESSION attempts: emit decision:"block" with the fix
 *   command. After ceiling reached: allow Stop with a loud warning so the chat
 *   does not infinite-loop on stuck sessions (same escape-hatch pattern as the
 *   3-way scrutiny gate at .claude/scripts/scrutiny-3way.mjs).
 *
 * UNIVERSAL: in MINIMAL_ALLOWLIST (`.claude/helpers/hook-profile.mjs`) — even
 *   `PRISM_HOOK_PROFILE=minimal` cannot disable. Operator emergency override is
 *   `PRISM_BLUEPRINT_COVERAGE_FLOOR_BYPASS=1` (single-call, logged to the
 *   bypasses JSONL — auditable).
 *
 * KNOBS:
 *   PRISM_BLUEPRINT_COVERAGE_FLOOR_DISABLE=1   — full disable (emergency only,
 *                                                  logged)
 *   PRISM_BLUEPRINT_COVERAGE_FLOOR_BYPASS=1    — one-shot bypass (logged)
 *   PRISM_BLUEPRINT_COVERAGE_FLOOR_MAX_AGE_HR=N — audit staleness threshold
 *                                                  (default 24; min 1)
 *   PRISM_BLUEPRINT_COVERAGE_FLOOR_BLOCK_LIMIT=N — max blocks before forced
 *                                                  clear (default 3)
 *   PRISM_BLUEPRINT_COVERAGE_FLOOR_REPO=path   — override repo root
 *
 * Adopted Stop-block pattern from scrutinize-before-stop (3-of-3 ledger).
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { shouldSkipHook } from "../helpers/hook-profile.mjs";

const HOOK_NAME = "blueprint-coverage-floor-guard";

/**
 * Resolve repo root via `git rev-parse --show-toplevel` so the hook works
 * correctly when invoked from any of the canonical slot worktrees
 * (`H:/prism-slot-alpha`, ..., `H:/prism-slot-lima`) per the conflict-fork
 * rule in CLAUDE.md. Falls back to `CLAUDE_PROJECT_DIR` env var, then to the
 * main tree at `H:/prism` only as a last resort. Failure to derive returns
 * the H:/prism default — same behavior as before this fix.
 */
export function resolveRepoRoot(env = process.env, runner = execSync) {
  if (env.PRISM_BLUEPRINT_COVERAGE_FLOOR_REPO) {
    return env.PRISM_BLUEPRINT_COVERAGE_FLOOR_REPO;
  }
  try {
    const out = runner("git rev-parse --show-toplevel", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 4000,
    });
    if (typeof out === "string") {
      const trimmed = out.trim();
      if (trimmed) return trimmed.replace(/\\/g, "/");
    }
  } catch {
    // Fall through to env / default
  }
  if (env.CLAUDE_PROJECT_DIR) return env.CLAUDE_PROJECT_DIR.replace(/\\/g, "/");
  return DEFAULT_REPO_ROOT;
}

const DEFAULT_REPO_ROOT = "H:/prism";
const DEFAULT_MAX_AGE_HR = 24;
const DEFAULT_BLOCK_LIMIT = 3;
const MIN_MAX_AGE_HR = 1;

const AUDIT_MARKER_REL = "state/shared/BLUEPRINT_COVERAGE_AUDIT.json";
const DEFER_LOG_REL = "state/shared/coverage-floor-defer.jsonl";
const BYPASS_LOG_REL = "state/shared/coverage-floor-bypasses.jsonl";
const BLOCK_LEDGER_REL = "state/shared/.coverage-floor-blocks.json";
const U8_ENGINE_REL = "mcp-server/src/engines/BlueprintCoverageAuditEngine.ts";

/**
 * Globs (regex form) of files that count as "extraction-path". A diff against
 * any of these triggers the audit-freshness gate. Order matters only for
 * documentation — the matcher uses `Array.some`.
 *
 * Patterns are intentionally engine-name-based (not directory-based) so that a
 * future rename of `mcp-server/src/engines/` doesn't silently exempt all
 * extraction work.
 */
const EXTRACTION_PATH_PATTERNS = [
  /mcp-server\/src\/engines\/PDFBlueprint[A-Za-z]+Engine\.ts$/i,
  /mcp-server\/src\/engines\/BlueprintVision[A-Za-z]*Engine\.ts$/i,
  /mcp-server\/src\/engines\/BlueprintOCR[A-Za-z]*Engine\.ts$/i,
  /mcp-server\/src\/engines\/BlueprintExtraction[A-Za-z]*Engine\.ts$/i,
  /mcp-server\/src\/engines\/BlueprintCorpus[A-Za-z]*Engine\.ts$/i,
  /mcp-server\/src\/engines\/BlueprintLoRA[A-Za-z]*Engine\.ts$/i,
  /mcp-server\/src\/engines\/BlueprintCoverage[A-Za-z]*Engine\.ts$/i,
  /mcp-server\/src\/engines\/ImageOCR[A-Za-z]*Engine\.ts$/i,
  /mcp-server\/src\/engines\/GDTCallout[A-Za-z]*Engine\.ts$/i,
  /mcp-server\/src\/engines\/GDTStackupEngine\.ts$/i,
  /mcp-server\/src\/engines\/GroundTruth(Registry|Validation)Engine\.ts$/i,
  /mcp-server\/src\/engines\/PRISMEnhancedGDT[A-Za-z]*Engine\.ts$/i,
  /mcp-server\/src\/engines\/PRISMGDTFCFParser[A-Za-z]*Engine\.ts$/i,
];

function clampInt(raw, fallback, min) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  if (typeof min === "number" && n < min) return min;
  return n;
}

export function getConfig(env = process.env) {
  return {
    repoRoot: resolveRepoRoot(env),
    maxAgeHr: clampInt(env.PRISM_BLUEPRINT_COVERAGE_FLOOR_MAX_AGE_HR, DEFAULT_MAX_AGE_HR, MIN_MAX_AGE_HR),
    blockLimit: clampInt(env.PRISM_BLUEPRINT_COVERAGE_FLOOR_BLOCK_LIMIT, DEFAULT_BLOCK_LIMIT, 1),
    disabled: env.PRISM_BLUEPRINT_COVERAGE_FLOOR_DISABLE === "1",
    bypassOnce: env.PRISM_BLUEPRINT_COVERAGE_FLOOR_BYPASS === "1",
    verbose: env.PRISM_BLUEPRINT_COVERAGE_FLOOR_VERBOSE === "1",
  };
}

/**
 * Clear the per-session block count from the ledger when the marker has gone
 * fresh — keeps the escape-hatch (block limit) honest across flap stale→fresh
 * →stale sequences. Without this, a long-running chat that addresses + retries
 * + drifts again would exhaust its 3-attempt budget against the second stale
 * window, even though it cleared the first.
 */
export function resetBlockCount(repoRoot, sessionId, fs = { existsSync, readFileSync, writeFileSync, mkdirSync }) {
  if (!sessionId) return false;
  const ledgerPath = join(repoRoot, BLOCK_LEDGER_REL).replace(/\\/g, "/");
  if (!fs.existsSync(ledgerPath)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
    if (parsed && typeof parsed === "object" && parsed.sessions && parsed.sessions[sessionId]) {
      delete parsed.sessions[sessionId];
      fs.mkdirSync(dirname(ledgerPath), { recursive: true });
      fs.writeFileSync(ledgerPath, JSON.stringify(parsed, null, 2), "utf8");
      return true;
    }
  } catch {
    // Best-effort — ledger reset on fresh is a hygiene step, not a gate.
  }
  return false;
}

/** Read JSON from stdin (5s timeout). */
async function readStdinJson(timeoutMs = 5000) {
  const chunks = [];
  let resolved = false;
  return await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
    process.stdin.on("error", () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve(null);
    });
  });
}

/**
 * Return the working-tree files changed since HEAD (or staged) inside the repo.
 * Excludes deletions (a deleted extraction file can't violate the audit since
 * there's nothing left to audit). On `git` failure, returns `null` — caller
 * treats null as "indeterminate", which is permissive (no block) since we
 * cannot prove the gate should fire.
 */
export function gitChangedFiles(repoRoot, runner = execSync) {
  try {
    const raw = runner(`git -C "${repoRoot}" status --porcelain --untracked-files=all`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 8000,
    });
    if (typeof raw !== "string") return null;
    const out = [];
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      // porcelain v1: "XY path", where X = index, Y = worktree, deletion = "D"
      const code = line.slice(0, 2);
      const path = line.slice(3).trim();
      if (!path) continue;
      // Skip pure deletions
      if (code.includes("D") && !code.includes("M") && !code.includes("A") && !code.includes("?")) {
        continue;
      }
      // Skip renames' old-path half ("R  oldpath -> newpath")
      const arrow = path.indexOf(" -> ");
      out.push(arrow >= 0 ? path.slice(arrow + 4).trim() : path);
    }
    return out;
  } catch {
    return null;
  }
}

/** Which of the changed files match an extraction-path pattern? */
export function findExtractionPathTouches(changedFiles, patterns = EXTRACTION_PATH_PATTERNS) {
  if (!Array.isArray(changedFiles)) return [];
  const touched = [];
  for (const f of changedFiles) {
    const normalized = String(f).replace(/\\/g, "/");
    if (patterns.some((p) => p.test(normalized))) {
      touched.push(normalized);
    }
  }
  return touched;
}

/**
 * Inspect the audit marker. Possible verdicts:
 *   - { state: "fresh", mtimeMs, ageHr }
 *   - { state: "stale", mtimeMs, ageHr }
 *   - { state: "missing" }
 */
export function inspectAuditMarker(repoRoot, maxAgeHr, fs = { existsSync, statSync }) {
  const markerPath = join(repoRoot, AUDIT_MARKER_REL).replace(/\\/g, "/");
  if (!fs.existsSync(markerPath)) return { state: "missing", markerPath };
  try {
    const s = fs.statSync(markerPath);
    const ageMs = Date.now() - s.mtimeMs;
    const ageHr = ageMs / 3_600_000;
    return {
      state: ageHr <= maxAgeHr ? "fresh" : "stale",
      mtimeMs: s.mtimeMs,
      ageHr,
      markerPath,
    };
  } catch {
    // statSync threw — treat as missing (safer to err on the block-side, but we
    // also can't infer staleness, so "missing" is the honest verdict)
    return { state: "missing", markerPath };
  }
}

/** Is U8 (the audit producer) shipped on disk? */
export function isU8EngineShipped(repoRoot, fs = { existsSync }) {
  const p = join(repoRoot, U8_ENGINE_REL).replace(/\\/g, "/");
  return fs.existsSync(p);
}

/** Read+bump block ledger. Returns new count. */
export function bumpBlockCount(repoRoot, sessionId, fs = { existsSync, readFileSync, writeFileSync, mkdirSync }) {
  const ledgerPath = join(repoRoot, BLOCK_LEDGER_REL).replace(/\\/g, "/");
  let ledger = { schemaVersion: 1, sessions: {} };
  if (fs.existsSync(ledgerPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
      if (parsed && typeof parsed === "object") ledger = parsed;
      if (!ledger.sessions || typeof ledger.sessions !== "object") ledger.sessions = {};
    } catch {
      // corrupted ledger — reset (loud no-op; the chat will see a fresh count
      // and pay the full block-limit budget again, which is fine).
    }
  }
  const key = sessionId || "anon";
  const entry = ledger.sessions[key] || { count: 0, firstBlockAt: null, lastBlockAt: null };
  entry.count = (entry.count || 0) + 1;
  if (!entry.firstBlockAt) entry.firstBlockAt = new Date().toISOString();
  entry.lastBlockAt = new Date().toISOString();
  ledger.sessions[key] = entry;
  try {
    fs.mkdirSync(dirname(ledgerPath), { recursive: true });
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), "utf8");
  } catch {
    // Persistence failure means we lose count across hook fires — degrade
    // permissively: the chat may exceed block-limit, but won't infinite-loop
    // since the limit logic still trips on each successful write.
  }
  return entry.count;
}

export function appendJsonl(repoRoot, relPath, payload, fs = { mkdirSync, appendFileSync }) {
  const full = join(repoRoot, relPath).replace(/\\/g, "/");
  try {
    fs.mkdirSync(dirname(full), { recursive: true });
    fs.appendFileSync(full, JSON.stringify({ ts: new Date().toISOString(), ...payload }) + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Core decision function. Pure-ish — IO is injectable for tests.
 * Returns one of: {decision:"allow"}, {decision:"defer", reason, touched},
 *                  {decision:"block", reason, touched, blockCount}.
 */
export function decideStop(payload, opts = {}) {
  const cfg = opts.config || getConfig();
  const sessionId = payload?.session_id || payload?.sessionId || "";
  const runner = opts.execSync || execSync;
  const fs = opts.fs || { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, statSync };

  if (cfg.disabled) {
    if (opts.appendJsonl) {
      opts.appendJsonl(cfg.repoRoot, BYPASS_LOG_REL, { kind: "disabled", sessionId });
    } else {
      appendJsonl(cfg.repoRoot, BYPASS_LOG_REL, { kind: "disabled", sessionId }, fs);
    }
    return { decision: "allow", reason: "disabled_env_knob" };
  }
  if (cfg.bypassOnce) {
    if (opts.appendJsonl) {
      opts.appendJsonl(cfg.repoRoot, BYPASS_LOG_REL, { kind: "bypass_once", sessionId });
    } else {
      appendJsonl(cfg.repoRoot, BYPASS_LOG_REL, { kind: "bypass_once", sessionId }, fs);
    }
    return { decision: "allow", reason: "bypass_once" };
  }

  // 1. Determine touched extraction-path files
  const changed = opts.gitChangedFiles
    ? opts.gitChangedFiles(cfg.repoRoot)
    : gitChangedFiles(cfg.repoRoot, runner);
  if (changed === null) {
    // git unavailable — permissive (we cannot prove the gate should fire).
    // Recorded so close-out audits notice "git was broken during this stop".
    if (opts.appendJsonl) {
      opts.appendJsonl(cfg.repoRoot, DEFER_LOG_REL, { kind: "git_unavailable", sessionId });
    } else {
      appendJsonl(cfg.repoRoot, DEFER_LOG_REL, { kind: "git_unavailable", sessionId }, fs);
    }
    return { decision: "allow", reason: "git_unavailable" };
  }
  const touched = findExtractionPathTouches(changed);
  if (touched.length === 0) {
    return { decision: "allow", reason: "no_extraction_path_touch" };
  }

  // 2. Inspect audit marker
  const marker = opts.inspectAuditMarker
    ? opts.inspectAuditMarker(cfg.repoRoot, cfg.maxAgeHr)
    : inspectAuditMarker(cfg.repoRoot, cfg.maxAgeHr, fs);

  if (marker.state === "fresh") {
    // Hygiene: reset this session's block count so a future stale flap starts
    // from 0/blockLimit again, not exhausted budget. Without this the
    // escape-hatch semantics break for long-running chats that address audit
    // then drift again later in the same session.
    const resetter = opts.resetBlockCount || resetBlockCount;
    resetter(cfg.repoRoot, sessionId);
    return { decision: "allow", reason: "audit_fresh", marker, touched };
  }

  // 3. Audit missing or stale — graceful degradation
  const u8Shipped = opts.isU8EngineShipped
    ? opts.isU8EngineShipped(cfg.repoRoot)
    : isU8EngineShipped(cfg.repoRoot, fs);

  if (marker.state === "missing" && !u8Shipped) {
    // U8 not yet built — emit DEFERRED advisory so the operator + close-out
    // audit see the open debt, but allow Stop. This is the "be conservative
    // but not cruel" branch — operators can't run a tool that doesn't exist.
    if (opts.appendJsonl) {
      opts.appendJsonl(cfg.repoRoot, DEFER_LOG_REL, {
        kind: "audit_deferred_u8_missing",
        sessionId,
        touched,
      });
    } else {
      appendJsonl(
        cfg.repoRoot,
        DEFER_LOG_REL,
        { kind: "audit_deferred_u8_missing", sessionId, touched },
        fs
      );
    }
    return { decision: "defer", reason: "u8_not_shipped", marker, touched };
  }

  // 4. Active block path: marker stale OR (marker missing AND U8 shipped)
  const blockCount = opts.bumpBlockCount
    ? opts.bumpBlockCount(cfg.repoRoot, sessionId)
    : bumpBlockCount(cfg.repoRoot, sessionId, fs);

  if (blockCount > cfg.blockLimit) {
    // Escape hatch — same pattern as scrutiny-3way.mjs after MAX_BLOCKS reached.
    return {
      decision: "allow",
      reason: "block_limit_reached",
      marker,
      touched,
      blockCount,
      blockLimit: cfg.blockLimit,
    };
  }

  return {
    decision: "block",
    reason: marker.state === "stale" ? "audit_stale" : "audit_missing_u8_shipped",
    marker,
    touched,
    blockCount,
    blockLimit: cfg.blockLimit,
  };
}

/** Build the human-readable block message. */
export function formatBlockMessage(decision) {
  const lines = [];
  lines.push("⛔ BLUEPRINT COVERAGE FLOOR — Stop blocked");
  lines.push("");
  if (decision.reason === "audit_stale") {
    const age = decision.marker?.ageHr;
    lines.push(`  Coverage audit is STALE (age ${age?.toFixed(1) ?? "?"}h, marker mtime ${decision.marker?.mtimeMs ? new Date(decision.marker.mtimeMs).toISOString() : "unknown"}).`);
  } else if (decision.reason === "audit_missing_u8_shipped") {
    lines.push("  Coverage audit marker is MISSING but BlueprintCoverageAuditEngine is shipped.");
  } else {
    lines.push("  Coverage audit is not satisfied.");
  }
  lines.push("");
  lines.push("  This session touched extraction-path files:");
  for (const f of decision.touched.slice(0, 8)) lines.push(`    - ${f}`);
  if (decision.touched.length > 8) lines.push(`    … and ${decision.touched.length - 8} more`);
  lines.push("");
  lines.push("  To clear:");
  lines.push("    1. Re-run the coverage audit (U8):");
  lines.push("       node H:/prism/scripts/blueprint-coverage-audit.mjs");
  lines.push("       (writes state/shared/BLUEPRINT_COVERAGE_AUDIT.json)");
  lines.push("    2. Retry Stop.");
  lines.push("");
  lines.push(`  Block ${decision.blockCount}/${decision.blockLimit}.`);
  lines.push("");
  lines.push("  Emergency override: PRISM_BLUEPRINT_COVERAGE_FLOOR_BYPASS=1 (single call, logged).");
  return lines.join("\n");
}

/** Build the defer (non-blocking) advisory message. */
export function formatDeferMessage(decision) {
  return [
    "⚠️  BLUEPRINT COVERAGE FLOOR — DEFERRED",
    "",
    "  This session touched extraction-path files but the coverage audit",
    "  producer (BlueprintCoverageAuditEngine — U8 of BLUEPRINT-OCR-TRAINING-MS1)",
    "  is not yet shipped. Logged to state/shared/coverage-floor-defer.jsonl so",
    "  close-out accounting sees the open debt.",
    "",
    "  Touched files:",
    ...decision.touched.slice(0, 8).map((f) => `    - ${f}`),
    decision.touched.length > 8 ? `    … and ${decision.touched.length - 8} more` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  // MINIMAL_ALLOWLIST integration — even under PRISM_HOOK_PROFILE=minimal
  // this hook is enumerated in hook-profile.mjs MINIMAL_ALLOWLIST so the
  // shouldSkipHook call returns false. Under explicit PRISM_DISABLED_HOOKS
  // listing, it WILL skip — that's an operator-emergency override path,
  // documented in the doctrine header (top of file).
  if (shouldSkipHook(HOOK_NAME)) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    process.exit(0);
  }
  const cfg = getConfig();
  const payload = await readStdinJson();

  // Even with bad/no stdin, we can still run the decision (sessionId will
  // be empty, but the git-diff + marker checks work).
  let decision;
  try {
    decision = decideStop(payload || {});
  } catch (err) {
    // Never crash a Stop hook — that would make `continueOnError:false` block
    // EVERY stop, not just blueprint-touching ones. Fail open with a loud log.
    appendJsonl(
      cfg.repoRoot,
      DEFER_LOG_REL,
      { kind: "hook_internal_error", error: String(err?.message || err) }
    );
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    process.exit(0);
  }

  if (decision.decision === "allow") {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    process.exit(0);
  }

  if (decision.decision === "defer") {
    process.stdout.write(
      JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "Stop",
          additionalContext: formatDeferMessage(decision),
        },
      })
    );
    process.exit(0);
  }

  // decision.decision === "block"
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason: formatBlockMessage(decision),
    })
  );
  process.exit(0);
}

const isMain = (() => {
  try {
    const argv1 = process.argv[1] || "";
    return argv1.endsWith("blueprint-coverage-floor-guard.mjs");
  } catch {
    return false;
  }
})();
if (isMain) {
  void main().catch(() => process.exit(0));
}
