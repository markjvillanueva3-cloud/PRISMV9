#!/usr/bin/env node
// tier: T0
/**
 * goal-complete-gate.mjs
 *
 * Stop-hook HARD GATE on Anthropic's built-in `/goal` slash command.
 *
 * User directive (2026-05-13): "add the closeout-audit slash command to the
 * /goal slash command so the task cant be considered /goal complete until the
 * audit is ran".
 *
 * /goal is a built-in Anthropic command (no .md skill file). This hook
 * detects /goal invocation in the session transcript at Stop time and
 * enforces the close-out-audit gate before allowing the session to stop.
 *
 * Logic:
 *   1. Parse transcript_path from stdin event
 *   2. Scan last ~5000 lines for `<command-name>/goal</command-name>` markers
 *   3. If /goal NOT invoked → approve (no-op, fast path)
 *   4. If /goal invoked AND state/shared/CLOSE-OUT-CANDIDATES.json missing OR
 *      mtime >2h → BLOCK with instruction to run /close-out-audit
 *   5. If audit fresh AND has surfaced candidates → verify each candidate
 *      unit_id appears in a recent commit body OR in
 *      state/shared/CLOSE-OUT-DEFERRED.md → BLOCK if any untriaged
 *   6. Otherwise → approve
 *
 * Bypass: PRISM_GOAL_GATE_AUDIT_BYPASS=1 (logged to
 *   state/shared/goal-gate-bypasses.jsonl with caller PID + timestamp).
 *
 * Disable entirely: PRISM_GOAL_GATE_DISABLE=1.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const REPO = "H:/prism";
const CANDIDATES_JSON = path.join(REPO, "state/shared/CLOSE-OUT-CANDIDATES.json");
const DEFERRED_MD = path.join(REPO, "state/shared/CLOSE-OUT-DEFERRED.md");
const BYPASS_LOG = path.join(REPO, "state/shared/goal-gate-bypasses.jsonl");

const STALE_HOURS_DEFAULT = 2;
const TRANSCRIPT_TAIL_BYTES = 256 * 1024; // last 256 KB — enough for many turns
const COMMIT_SCAN_WINDOW = 30; // last N commits to scan for unit-id mentions

function disabled() {
  return process.env.PRISM_GOAL_GATE_DISABLE === "1";
}

function staleHours() {
  const n = parseFloat(process.env.PRISM_GOAL_GATE_STALE_HRS || String(STALE_HOURS_DEFAULT));
  return Number.isFinite(n) && n > 0 ? n : STALE_HOURS_DEFAULT;
}

function bypassed() {
  return process.env.PRISM_GOAL_GATE_AUDIT_BYPASS === "1";
}

async function readStdinJson() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { buf += chunk; });
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(buf || "{}")); }
      catch { resolve({}); }
    });
    process.stdin.on("error", () => resolve({}));
    // Safety: never block the hook chain.
    setTimeout(() => resolve({}), 300);
  });
}

function readTranscriptTail(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return "";
    const stat = fs.statSync(transcriptPath);
    const size = stat.size;
    const startByte = Math.max(0, size - TRANSCRIPT_TAIL_BYTES);
    const fd = fs.openSync(transcriptPath, "r");
    try {
      const buf = Buffer.alloc(size - startByte);
      fs.readSync(fd, buf, 0, buf.length, startByte);
      return buf.toString("utf8");
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return "";
  }
}

function goalWasInvoked(transcriptTail) {
  if (!transcriptTail) return false;
  // Anthropic's built-in slash commands appear in the transcript with this
  // marker shape (seen in this session for /clear, /mcp, /effort, /checkin):
  //   <command-name>/goal</command-name>
  // We match permissively for safety.
  return /<command-name>\/?goal<\/command-name>/i.test(transcriptTail);
}

function readAudit() {
  try {
    if (!fs.existsSync(CANDIDATES_JSON)) return { ok: false, missing: true };
    const stat = fs.statSync(CANDIDATES_JSON);
    const ageMs = Date.now() - stat.mtimeMs;
    const ageHours = ageMs / (1000 * 60 * 60);
    const data = JSON.parse(fs.readFileSync(CANDIDATES_JSON, "utf8"));
    // Schema lock — if the audit doesn't carry the expected shape, refuse to
    // silently approve. The audit is the gate's source of truth; an unexpected
    // shape means we cannot verify triage and MUST block.
    if (!data || typeof data !== "object" || !Array.isArray(data.results)) {
      return { ok: false, schemaInvalid: true, error: "CLOSE-OUT-CANDIDATES.json missing required `results` array" };
    }
    return { ok: true, ageHours, data };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

function listCandidateUnitIds(auditData) {
  const out = new Set();
  const results = Array.isArray(auditData && auditData.results) ? auditData.results : [];
  for (const r of results) {
    const cands = Array.isArray(r && r.candidates) ? r.candidates : [];
    for (const c of cands) {
      if (c && c.unit_id) out.add(String(c.unit_id));
    }
  }
  return out;
}

function recentCommitsBody() {
  try {
    // Use execSync with strict cwd + timeout; failure → empty (don't block).
    const raw = execSync(`git -C "${REPO}" log -n ${COMMIT_SCAN_WINDOW} --format=%B%x00`, {
      timeout: 5000,
      encoding: "utf8",
    });
    return raw;
  } catch {
    return "";
  }
}

function readDeferredLog() {
  try {
    if (!fs.existsSync(DEFERRED_MD)) return "";
    return fs.readFileSync(DEFERRED_MD, "utf8");
  } catch {
    return "";
  }
}

function logBypass(reason) {
  try {
    fs.mkdirSync(path.dirname(BYPASS_LOG), { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      pid: process.pid,
      reason,
      transcript: process.env.CLAUDE_TRANSCRIPT_PATH || null,
    };
    fs.appendFileSync(BYPASS_LOG, JSON.stringify(entry) + "\n");
  } catch {
    // never throw from a hook
  }
}

function block(reason, instructions) {
  const payload = {
    decision: "block",
    reason: `[goal-complete-gate] ${reason}`,
    systemMessage: instructions,
  };
  process.stdout.write(JSON.stringify(payload));
}

function approve() {
  // Stop-hook default approve = empty/no decision. Emit nothing so other
  // Stop hooks in the chain can fire normally.
  process.stdout.write(JSON.stringify({ decision: "approve" }));
}

/**
 * F9 — accept /goal when this session's /loop ended with iter >= target.
 * Reads `state/shared/loop-state/loop-<sid>.json` written by
 * `.claude/helpers/loop-state.mjs`. Returns { ok, reason } where ok=true
 * means the loop genuinely met its target and /goal should clear.
 */
function checkLoopTargetMet(sessionId) {
  try {
    if (!sessionId) return { ok: false, reason: "no_session_id" };
    const fs = require("node:fs");
    const path = `H:/prism/state/shared/loop-state/loop-${sessionId}.json`;
    if (!fs.existsSync(path)) return { ok: false, reason: "no_loop_state" };
    const raw = fs.readFileSync(path, "utf-8");
    const state = JSON.parse(raw);
    if (state.status !== "ended") return { ok: false, reason: `loop_status=${state.status}` };
    const iter = Number(state.iter || 0);
    const target = Number(state.target || 0);
    if (target > 0 && iter >= target) {
      return { ok: true, reason: `loop ended iter ${iter}/${target}` };
    }
    return { ok: false, reason: `loop iter ${iter} < target ${target}` };
  } catch (e) {
    return { ok: false, reason: `error: ${e.message}` };
  }
}

async function main() {
  if (disabled()) return approve();
  const event = await readStdinJson();
  const transcriptPath = event && (event.transcript_path || event.transcriptPath);
  const tail = readTranscriptTail(transcriptPath);
  if (!goalWasInvoked(tail)) return approve(); // fast path — most chats never invoke /goal

  // /goal WAS invoked — apply the gate
  if (bypassed()) {
    logBypass("PRISM_GOAL_GATE_AUDIT_BYPASS=1");
    return approve();
  }

  // F9 — loop-target-met accept path. If this session ran a /loop that
  // ended with iter>=target, accept that as completion (alongside the
  // existing close-out-audit triage path). Disabled by
  // PRISM_GOAL_GATE_LOOP_ACCEPT_DISABLE=1.
  if (process.env.PRISM_GOAL_GATE_LOOP_ACCEPT_DISABLE !== "1") {
    const loopAccept = checkLoopTargetMet(event && event.session_id);
    if (loopAccept.ok) {
      process.stderr.write(`[goal-complete-gate] loop-target-met accept: ${loopAccept.reason}\n`);
      return approve();
    }
  }

  const audit = readAudit();
  const STALE_HRS = staleHours();

  if (!audit.ok) {
    return block(
      audit.missing ? "audit report missing" : `audit unreadable: ${audit.error}`,
      [
        "Before /goal can clear, run the close-out audit:",
        "",
        "    node H:/prism/scripts/audit-close-out-candidates.mjs",
        "",
        "Or invoke the skill: /close-out-audit",
        "",
        `Why: a /goal-complete declaration touched the session but ${audit.missing ? "no audit report exists" : "the audit report is unreadable"}. Per CLAUDE.md §GOAL-COMPLETE GATE, the audit is required so silent close-out debt is surfaced before the session ends.`,
        "",
        "Bypass (operator only): set PRISM_GOAL_GATE_AUDIT_BYPASS=1 and try again. Bypass is logged to state/shared/goal-gate-bypasses.jsonl.",
      ].join("\n"),
    );
  }

  if (audit.ageHours > STALE_HRS) {
    return block(
      `audit report stale (${audit.ageHours.toFixed(1)}h > ${STALE_HRS}h)`,
      [
        `The close-out audit report at state/shared/CLOSE-OUT-CANDIDATES.json is ${audit.ageHours.toFixed(1)} hours old (threshold: ${STALE_HRS}h).`,
        "",
        "Refresh it before /goal clears:",
        "",
        "    node H:/prism/scripts/audit-close-out-candidates.mjs",
        "",
        "Knob: PRISM_GOAL_GATE_STALE_HRS=N (default 2).",
      ].join("\n"),
    );
  }

  const candidateIds = listCandidateUnitIds(audit.data);
  if (candidateIds.size === 0) {
    return approve(); // audit fresh, no candidates surfaced — clean clear
  }

  // Verify each surfaced candidate has been triaged. Triage = unit_id appears
  // in (a) any of the last N commit bodies, OR (b) state/shared/CLOSE-OUT-DEFERRED.md
  const commitsText = recentCommitsBody();
  const deferredText = readDeferredLog();
  const untriaged = [];
  for (const id of candidateIds) {
    const re = new RegExp(`\\b${id.replace(/[-/.+]/g, "\\$&")}\\b`);
    if (!re.test(commitsText) && !re.test(deferredText)) untriaged.push(id);
  }

  if (untriaged.length > 0) {
    return block(
      `${untriaged.length} surfaced close-out candidate(s) untriaged: ${untriaged.slice(0, 5).join(", ")}${untriaged.length > 5 ? " …" : ""}`,
      [
        `The close-out audit surfaced ${candidateIds.size} candidate unit(s); ${untriaged.length} have not been triaged in any recent commit OR in state/shared/CLOSE-OUT-DEFERRED.md.`,
        "",
        "For each untriaged candidate (`" + untriaged.slice(0, 10).join("`, `") + "`):",
        "  (a) Close it: envelope edit + regen + commit referencing the unit_id, OR",
        "  (b) Defer it: append a line to state/shared/CLOSE-OUT-DEFERRED.md naming the unit_id + reason, OR",
        "  (c) Reject it as false-positive: append a line to state/shared/CLOSE-OUT-DEFERRED.md naming the unit_id + 'false-positive: <reason>'",
        "",
        "Then /goal can clear. Bypass: PRISM_GOAL_GATE_AUDIT_BYPASS=1 (logged).",
      ].join("\n"),
    );
  }

  // All candidates triaged
  approve();
}

// Fail-closed when the gate was supposed to enforce. The unconditional
// approve-on-error pattern silently bypasses the gate if /goal was invoked
// but the verification path crashed. To preserve safety, the error handler
// re-reads the transcript snippet from disk and, IF /goal was definitely
// invoked, BLOCKS with a "gate self-error" message so the operator can
// investigate. If /goal was NOT invoked, approve is still safe (the gate
// had nothing to enforce).
async function failClosedOnError(err) {
  let blockedOnGoal = false;
  try {
    // We may not have transcript_path here (stdin already consumed). Best
    // effort: re-read stdin failed already, so we have to approve unless we
    // can independently confirm /goal. Conservative default: BLOCK to fail
    // closed since this hook only fires at all if it was wired into Stop,
    // and a wired gate that errors should NOT silently let the session pass.
    blockedOnGoal = true;
  } catch { blockedOnGoal = true; }
  try {
    process.stderr.write(`[goal-complete-gate] error: ${err && err.message ? err.message : err}\n`);
  } catch { /* swallow */ }
  if (blockedOnGoal && !bypassed()) {
    block(
      "gate self-error — failing closed",
      [
        "The /goal close-out gate hit an internal error and is failing closed (safer than silently approving).",
        `Error: ${err && err.message ? err.message : String(err)}`,
        "",
        "To proceed:",
        "  1. Run `node H:/prism/scripts/audit-close-out-candidates.mjs` to refresh the audit report.",
        "  2. Read `state/shared/CLOSE-OUT-CANDIDATES.json` — confirm the schema has `results[]` with `candidates[]` entries.",
        "  3. Try Stop again.",
        "",
        "If the error persists: bypass with `PRISM_GOAL_GATE_AUDIT_BYPASS=1` (logged), OR disable with `PRISM_GOAL_GATE_DISABLE=1` and file an issue.",
      ].join("\n"),
    );
    return;
  }
  approve();
}

main().catch(failClosedOnError);
