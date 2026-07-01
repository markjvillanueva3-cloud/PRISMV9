#!/usr/bin/env node
// task-freshness-gate.mjs — TASK-FRESHNESS-GATE-MS0/U-TFG01 (2026-05-18)
// tier: T1
//
// PreToolUse(Bash) gate enforcing CLAUDE.md doctrine R13: a task generated
// before recent fleet activity may already be shipped / rescoped / invalid.
// This hook intercepts `slot-task-claim.mjs claim --unit <MS::U-ID>` — the
// moment a chat commits to building a unit — and BLOCKS the claim when the
// unit's source is stale relative to fleet activity, forcing a re-check.
//
// Runs INSIDE bash-bundle.mjs (BASH_HOOKS). Protocol: read stdin JSON, write
// JSON stdout. `{decision:"block",reason}` → bundle denies the tool call;
// empty/no-op → allow. NEVER throws — fail-open is the law (R12: surface
// uncertainty, but the gate's OWN bug must not wedge a legitimate claim).
//
// Clear a stale block: re-run the claim with the `--ack-stale` token after a
// manual re-check (peer chat-bus / /master-index / slot-task-claim list), OR
// one-shot `PRISM_TASK_FRESHNESS_BYPASS=1` (audited to JSONL). Either writes a
// 30-min ack stamp so the loop doesn't re-prompt every iteration.
//
// Knobs: PRISM_TASK_FRESHNESS_GATE_DISABLE=1 (full off) ·
//   PRISM_TASK_FRESHNESS_BYPASS=1 (one-shot, logged) ·
//   PRISM_TASK_FRESHNESS_STALE_HRS · _PEER_COMMITS_TRIGGER · _ACK_TTL_MIN ·
//   PRISM_TASK_FRESHNESS_VERBOSE=1 (telemetry every fire).

import fs from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import { isatty } from "node:tty";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const BYPASS_LOG = path.join(PRISM_ROOT, "state/shared/task-freshness-gate-bypasses.jsonl");
const ERROR_LOG = path.join(PRISM_ROOT, "state/shared/task-freshness-gate-errors.jsonl");
const TELEMETRY_LOG = path.join(PRISM_ROOT, "state/shared/task-freshness-gate-telemetry.jsonl");
const HELPER_URL = new URL("../helpers/task-freshness.mjs", import.meta.url);

// Match only the COMMIT-point: `slot-task-claim(.mjs)? ... claim`. Heartbeat
// re-claims (--phase with an existing same-owner claim) are NOT re-gated; the
// helper/gate only fires on the FIRST claim of a unit by a chat.
const CLAIM_RE = /slot-task-claim(?:\.mjs)?\b[^\n]*\bclaim\b/;
// Canonical MILESTONE::U-ID grammar — mirrors slot-task-claim.mjs UNIT_ID_RE
// exactly (KEEP-IN-SYNC). Used to fail-closed on a malformed/quote-mangled
// --unit so a hard gate can't be quote-evaded into a silent fail-open.
const UNIT_ID_RE = /^[A-Z][A-Z0-9_-]{1,80}::[A-Za-z0-9_+.-]{1,80}$/;

// A command that merely MENTIONS the claim invocation inside a quoted string
// — `echo '{"command":"...slot-task-claim.mjs claim --unit X::Y..."}'`, a grep,
// a cat, a test harness, or this gate's own smoke — is NOT a real claim and
// must not be gated (found in live integration: the gate blocked its own
// verification commands). Real claim invocations are never quoted: `node
// .../slot-task-claim.mjs claim --unit X` has the executable+subcommand
// unquoted. So strip single/double/backtick-quoted regions, THEN test
// CLAIM_RE. The flag() parser still reads --unit/--chatId from the ORIGINAL
// command (unit IDs are space-free per slot-task-claim's UNIT_ID_RE), so a
// legitimately quoted --unit value is unaffected.
function stripQuoted(s) {
  return String(s)
    .replace(/'[^']*'/g, " ")
    .replace(/"[^"]*"/g, " ")
    .replace(/`[^`]*`/g, " ");
}
function isRealClaimInvocation(cmd) {
  return CLAIM_RE.test(stripQuoted(cmd));
}

function readStdin() {
  try {
    if (isatty(0)) return "";
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

// Emit + exit. Empty object → bundle treats as no-op (allow). Block uses the
// `{decision:"block",reason}` shape the bundle maps to permissionDecision:deny.
//
// CRITICAL (scrutiny P0): a BUNDLED sub-hook signals a block via stdout JSON
// ONLY. hook-runner.mjs detects `parsed.decision==="block"` and never reads
// the child exit code; the BUNDLE re-derives the outward exit-2 to Claude
// itself. Siblings (commit-ownership-guard.mjs / git-add-lane-guard.mjs) emit
// the block JSON and exit 0. A sub-hook that `process.exit(2)`s in the stdout
// write-callback risks the documented Windows pipe-truncation race — the
// ~1.5KB reason is killed before flush, the bundle sees empty stdout,
// parsed===null, and a STALE claim is SILENTLY ALLOWED (the exact gate-bypass
// class). So: always exit 0; the JSON payload is the only block signal.
function emit(obj) {
  let exited = false;
  const done = () => {
    if (exited) return;
    exited = true;
    process.exit(0);
  };
  try {
    process.stdout.write(JSON.stringify(obj || {}) + "\n", done);
  } catch {
    return done();
  }
  setTimeout(done, 2000).unref?.();
}

function appendJsonl(file, rec) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(rec) + "\n");
  } catch {
    /* logging must never block the gate */
  }
}

// Own-claim skip (scrutiny P2): the gate is a decision point at FIRST claim,
// not a recurring tax. The autonomous /loop heartbeats the SAME unit it's
// actively building (CLAIM_RE matches `...claim...` incl. --phase heartbeats);
// once the 30-min ack TTL expires mid-build a still-stale unit would re-block
// an in-progress build. If this chatId already holds a NON-EXPIRED claim on
// this unit, it is provably past the freshness decision point — silent allow.
// This is what makes the file-header "heartbeat re-claims are NOT re-gated"
// promise actually true. Fail-open: any read error → fall through to the gate.
function ownsActiveClaim(chatId, unitId) {
  try {
    const store = JSON.parse(
      fs.readFileSync(path.join(PRISM_ROOT, "state/shared/slot-task-claims.json"), "utf8")
    );
    const c = store && store.claims && store.claims[unitId];
    if (!c || c.chatId !== chatId || !c.expiresAt) return false;
    const exp = Date.parse(c.expiresAt);
    return Number.isFinite(exp) && exp > Date.now();
  } catch {
    return false;
  }
}

// Strip ONE layer of matching surrounding quotes. Without this, a claim that
// quotes its value — `--unit "MS::U-ID"` — captures the quote chars into the
// id, classifyTaskSource's strict ^[A-Z]...$ regex rejects it, and the gate
// silently fails open: a "hard gate" trivially evaded by quoting --unit.
// `name` is always a hardcoded literal — no RegExp injection surface.
function unquote(v) {
  if (typeof v !== "string") return v;
  const m = v.match(/^(['"`])([\s\S]*)\1$/);
  return m ? m[2] : v;
}
function flag(cmd, name) {
  // --name value | --name="value" | --name='value' | bare presence (true).
  // [^\s]+ for bare values; a quoted group also captures internal spaces
  // (defensive — PRISM unit ids are space-free but the parser shouldn't rely
  // on that to stay correct).
  const eq = cmd.match(new RegExp(`--${name}=(?:(['"\`])([\\s\\S]*?)\\1|([^\\s]+))`));
  if (eq) return unquote(eq[2] !== undefined ? eq[2] : eq[3]);
  const sp = cmd.match(new RegExp(`--${name}\\s+(?:(['"\`])([\\s\\S]*?)\\1|([^\\s]+))`));
  if (sp) return unquote(sp[2] !== undefined ? sp[2] : sp[3]);
  return new RegExp(`--${name}(?:\\s|$)`).test(cmd) ? true : null;
}

async function main() {
  // Kill switch — earliest possible exit, zero IO.
  if (process.env.PRISM_TASK_FRESHNESS_GATE_DISABLE === "1") return emit({});

  // Bound the helper's git budget for the bundle context. A PreToolUse gate
  // must be time-bounded: the bundle entry timeout is 5000ms, so cap git at
  // 3500ms (leaves headroom for dynamic import + the rare 2-call slow path).
  // An operator override of PRISM_TASK_FRESHNESS_GIT_TIMEOUT_MS is respected.
  if (!process.env.PRISM_TASK_FRESHNESS_GIT_TIMEOUT_MS) {
    process.env.PRISM_TASK_FRESHNESS_GIT_TIMEOUT_MS = "3500";
  }

  const raw = readStdin();
  if (!raw || !raw.trim()) return emit({});

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return emit({}); // unparseable stdin — not ours to block
  }

  const cmd =
    (payload &&
      payload.tool_input &&
      typeof payload.tool_input.command === "string" &&
      payload.tool_input.command) ||
    "";

  // FAST PATH: not a claim command → allow, before ANY filesystem/subprocess
  // work. Critical for fork-storm avoidance — this hook fires on every Bash.
  if (!cmd || !isRealClaimInvocation(cmd)) return emit({});

  const unitId = flag(cmd, "unit");
  if (!unitId || unitId === true) return emit({}); // claim w/o --unit: not gateable

  // FAIL-CLOSED on a malformed --unit (scrutiny P2 → hardened per user "hard
  // gate" directive). A real claim invocation whose --unit doesn't match the
  // canonical MS::U-ID grammar is either a quote-evasion attempt (e.g.
  // mismatched quotes `--unit "MS::U'` that flag()/unquote() can't normalise)
  // or a genuinely broken claim. Either way the gate must NOT silently
  // fail-open — that's the only residual way to suppress a hard gate. Block
  // and tell the operator to re-issue cleanly (slot-task-claim's own
  // space-free UNIT_ID_RE would reject it downstream anyway, so this is
  // strictly more informative than the silent no-op).
  if (!UNIT_ID_RE.test(unitId)) {
    const reason =
      `[task-freshness-gate] Refusing to gate-skip a claim with a malformed --unit: ` +
      `${JSON.stringify(unitId)}\n` +
      `  Expected canonical MILESTONE::U-ID (e.g. FEATURE-GAP-AUDIT-MS0::U-GAP-X).\n` +
      `  Re-issue the claim with an unquoted, well-formed --unit. A quoted or\n` +
      `  mismatched-quote --unit cannot be used to bypass the freshness gate.\n` +
      `  Kill switch: PRISM_TASK_FRESHNESS_GATE_DISABLE=1`;
    return emit({ decision: "block", reason, systemMessage: reason });
  }

  const cidRaw = flag(cmd, "chatId");
  const chatId =
    (cidRaw && cidRaw !== true && cidRaw) ||
    process.env.CLAUDE_SESSION_ID ||
    "unknown-chat";

  // Past the decision point: this chat already holds a live claim on the
  // unit (mid-build /loop heartbeat). Silent allow before any helper import.
  if (ownsActiveClaim(chatId, unitId)) return emit({});

  const ackStale = flag(cmd, "ack-stale") === true || flag(cmd, "ack-stale");
  const envBypass = process.env.PRISM_TASK_FRESHNESS_BYPASS === "1";

  // Bypass path — acknowledged. Write the 30-min stamp + audit the override.
  if (ackStale || envBypass) {
    try {
      const helper = await import(HELPER_URL.href);
      const ev = helper.evaluate(unitId);
      helper.writeAcknowledgment(chatId, unitId, ev.verdict, {
        ttlMs: (Number(process.env.PRISM_TASK_FRESHNESS_ACK_TTL_MIN) || 30) * 60 * 1000,
      });
      appendJsonl(BYPASS_LOG, {
        ts: new Date().toISOString(),
        pid: process.pid,
        chatId,
        unitId,
        reason: ackStale ? "--ack-stale token" : "PRISM_TASK_FRESHNESS_BYPASS=1",
        verdict: ev.verdict.severity,
        transcript: process.env.CLAUDE_TRANSCRIPT_PATH || null,
      });
    } catch (e) {
      appendJsonl(ERROR_LOG, { ts: new Date().toISOString(), unitId, phase: "bypass", err: String(e) });
    }
    return emit({}); // allow — chat acknowledged
  }

  let ev;
  try {
    const helper = await import(HELPER_URL.href);
    // Already-acknowledged within TTL → silent allow (loop-friendly).
    if (helper.acknowledgmentValid(chatId, unitId)) return emit({});
    ev = helper.evaluate(unitId);
  } catch (e) {
    // FAIL-OPEN: the gate's own failure must never block a real claim.
    appendJsonl(ERROR_LOG, {
      ts: new Date().toISOString(),
      unitId,
      chatId,
      phase: "evaluate",
      err: String(e && e.stack ? e.stack : e),
    });
    return emit({});
  }

  if (process.env.PRISM_TASK_FRESHNESS_VERBOSE === "1") {
    appendJsonl(TELEMETRY_LOG, {
      ts: new Date().toISOString(),
      chatId,
      unitId,
      kind: ev.taskRef.kind,
      genSource: ev.gen.source,
      stale: ev.verdict.stale,
      severity: ev.verdict.severity,
    });
  }

  if (!ev.verdict.stale) return emit({}); // FRESH — invisible green path

  // STALE — block with a structured re-check report.
  const v = ev.verdict;
  const a = ev.activity || {};
  const peers = (a.peerShips || [])
    .slice(0, 6)
    .map((p) => `    - ${p.slot}@${p.ts} ${p.unit}`)
    .join("\n");
  const reason =
    `[task-freshness-gate] Unit ${unitId} source is STALE (${v.severity}).\n` +
    `  Source kind: ${ev.taskRef.kind}` +
    (ev.taskRef.milestonePath ? ` (${ev.taskRef.milestonePath})` : "") +
    `\n  Generated: ${ev.gen.genIso || "unresolved"}` +
    (v.ageHrs != null ? `  (${v.ageHrs}h ago, anchor=${ev.gen.source})` : ` (anchor=${ev.gen.source})`) +
    `\n  Verdict: ${v.reason}` +
    `\n  Activity: ${a.summary || "n/a"}` +
    (peers ? `\n  Recent peer ship/claim events:\n${peers}` : "") +
    `\n  Threshold: stale_hrs=${v.threshold.staleHrs}, peer_commits_trigger=${v.threshold.peerCommitsTrigger}` +
    `\n\nRe-check protocol before building:` +
    `\n  1) git -C ${PRISM_ROOT} log --since="${ev.gen.genIso || ""}" --oneline   (peer activity)` +
    `\n  2) /master-index ${unitId.split("::")[1] || unitId}   (already shipped?)` +
    `\n  3) node ${PRISM_ROOT}/.claude/helpers/slot-task-claim.mjs list   (peer claims)` +
    `\n  4) Re-run the claim with the --ack-stale token (writes a 30-min stamp),` +
    `\n     or one-shot: PRISM_TASK_FRESHNESS_BYPASS=1 <same claim cmd>  (audited)` +
    `\n\nKill switch: PRISM_TASK_FRESHNESS_GATE_DISABLE=1`;

  return emit({ decision: "block", reason, systemMessage: reason });
}

main().catch((e) => {
  // Absolute last-resort fail-open. A thrown gate must not wedge the fleet.
  appendJsonl(ERROR_LOG, { ts: new Date().toISOString(), phase: "main", err: String(e && e.stack ? e.stack : e) });
  emit({});
});
