#!/usr/bin/env node
// ZULU-ORCHESTRATOR-MS0 / U-ZULU02 — sweep CLI (the body).
//
// One pass over every opt-in chat slot: read pressure (CHO02), make decision
// (CHO01), resolve the target HWND by the stable `PRISM <slot>` window caption
// (G1b / U-ZM1-05 — title-based, not PID-based), and — for executable plans —
// SendKeys the slash + follow-up /checkin-<slot> backend-dev-priority directive
// (U-CHO04 + U-ZULU05) into the target PowerShell window with a 5s stagger.
//
// Knobs (cascade in this order — most specific wins):
//   PRISM_ZULU_DISABLE=1       — hard off; no slots eligible.
//   PRISM_ZULU_DRY_RUN=1       — gate every plan to dry-run (PS -Confirm:$false).
//   PRISM_SENDKEYS_DISABLE=1    — PS script self-aborts; lib also pre-downgrades.
//   PRISM_ZULU_LOG=<path>      — override log path (default state/shared/zulu-orchestrator-log.jsonl).
//   PRISM_ZULU_STAGGER_MS=N    — override default 5000ms stagger (clamp ≥5000).
//   PRISM_ZULU_SLOTS_FILE=<p>  — override chat-slots.json path (tests).
//   PRISM_ZULU_SELF_SLOT=<n>   — explicitly name this chat's slot (skip planning it).
//
// Flags:
//   --once         single sweep, exit (default).
//   --dry-run      force gate=dry-run for this sweep regardless of opt-in maturity.
//   --slot <name>  scope sweep to a single slot (operator debugging).
//   --json         emit the per-slot summary as JSON instead of plain text.
//
// R12: every failure path is named in the JSONL log; the CLI never throws
// out — exit code 0 even when individual slots fail; exit 1 only on argv /
// global config errors (e.g. unreadable chat-slots.json).

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { decideClearOrCompact } from "./lib/chat-orchestrator-decisions.mjs";
// U-HRP04 — RAG-as-policy: when a historical-decisions corpus is present, the
// sweep computes the policy hint from it and threads it through to the log via
// the slot's awareness fingerprint. Pure-core import; safe to add — no I/O
// performed unless ragPolicyDecision is actually called (callers below pass
// rerank=null today so the call returns null fast).
import { ragPolicyDecision } from "./lib/zulu-rag-policy.mjs";
import { readChatPressure } from "./lib/chat-token-watch.mjs";
// G1b / U-ZM1-05 — HWND resolution by WINDOW TITLE, not PID. chat-slots `pid`
// is ephemeral and routinely no longer owns a window. Each chat window caption
// deterministically leads with `PRISM <slot>` (rename-window-intercept.mjs's
// composeSlotTitle + slot-tab-boot.ps1's boot caption), so the orchestrator
// resolves on that STABLE slot identity — not the volatile, often-absent
// `topic` (the prior `hwnd:title-missing` root cause). Windows are enumerated
// ONCE per sweep, not once per slot. resolve-hwnd.mjs (PID-based) is retained
// for any other consumer.
import { enumerateWindows, matchWindowsByTitle } from "./lib/resolve-hwnd-by-title.mjs";
// U-ZM2-01 — UIA-based WT tab focus. For the tabbed-fleet topology (one WT
// window, many tabs) EnumWindows cannot expose per-tab HWNDs, so we ALSO try
// UI Automation. UIA succeeds when there is a unique TabItem matching the
// slot (case-insensitive, bare or `PRISM <slot>`) AND the resulting tab is
// single-pane. The matchWindowsByTitle path remains as the fallback for
// legacy separate-window deployments (one window per chat).
import { focusWtTabBySlot } from "./lib/wt-tab-focus.mjs";
import {
  DEFAULT_STAGGER_MS,
  DEFAULT_COMPACT_WAIT_MS,
  DEFAULT_PRECOMPACT_WAIT_MS,
  pickActionableSlots,
  summarizeSweepEligibility,
  planSlotAction,
  formatLogEntry,
  slotInCooldown,
  verifyCooldownActuation,
  staggerAfterLine,
} from "./lib/zulu-orchestrator-lib.mjs";
import { lookupSlot as awarenessLookupSlot } from "./lib/zulu-awareness-consumer.mjs";
import { applyOptInToSlotsDoc } from "./lib/zulu-opt-in.mjs";

const PRISM = "H:/prism";
const DEFAULT_SLOTS_FILE = process.env.PRISM_ZULU_SLOTS_FILE || `${PRISM}/state/shared/chat-slots.json`;
const DEFAULT_LOG_FILE = process.env.PRISM_ZULU_LOG || `${PRISM}/state/shared/zulu-orchestrator-log.jsonl`;
const LOOP_STATE_DIR = process.env.PRISM_ZULU_LOOP_DIR || `${PRISM}/state/shared/loop-state`;
const SENDKEYS_PS1 = `${PRISM}/.claude/helpers/send-keys-to-window.ps1`;
const HANDOFF_DIR = `${PRISM}/state/shared/handoffs`;
const LOCK_DIR = `${PRISM}/state/shared/.cron-locks`;
const SWEEP_LOCK = `${LOCK_DIR}/zulu-orchestrator-sweep.lock`;
// A sweep with several /compact (90s wait each) slots can legitimately run a
// few minutes; 15 min is well past any sane sweep yet finite, so a crashed
// holder's lock is always eventually reclaimable.
const SWEEP_LOCK_STALE_MS = 15 * 60 * 1000;
const MIN_STAGGER_MS = 5000;

function parseArgs(argv) {
  const args = { once: true, dryRun: false, slot: null, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--once") args.once = true;
    else if (a === "--json") args.json = true;
    else if (a === "--slot") args.slot = argv[++i];
  }
  return args;
}

function safeJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function appendLog(logFile, line) {
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, line + "\n", "utf8");
  } catch {
    // R12 fail-loud → stderr, never swallow.
    process.stderr.write(`[zulu] log-append-failed: ${logFile}\n`);
  }
}

function readLoopActive(sessionId, slot) {
  if (!sessionId && !slot) return false;
  const candidates = [];
  if (sessionId) {
    candidates.push(`loop-${sessionId}.json`);
    candidates.push(`loop-${sessionId.slice(0, 8)}.json`);
  }
  if (slot) candidates.push(`loop-${slot}.json`);
  for (const name of candidates) {
    const doc = safeJson(path.join(LOOP_STATE_DIR, name));
    if (doc && doc.status === "running") return true;
  }
  return false;
}

function staggerMs() {
  const raw = Number(process.env.PRISM_ZULU_STAGGER_MS);
  if (Number.isFinite(raw) && raw >= MIN_STAGGER_MS) return raw;
  return DEFAULT_STAGGER_MS;
}

// G3 — /compact-specific inter-line wait. /compact runs 20-60s+; the follow-up
// /checkin must not land mid-compaction. undefined env → the lib default.
function compactWaitMs() {
  const raw = Number(process.env.PRISM_ZULU_COMPACT_WAIT_MS);
  if (Number.isFinite(raw) && raw >= MIN_STAGGER_MS) return raw;
  return DEFAULT_COMPACT_WAIT_MS;
}

// G3 -- /precompact makes the MODEL author its handoff (slow ~30-60s); the
// follow-up /compact must not land mid-authoring. Knob: PRISM_ZULU_PRECOMPACT_WAIT_MS.
function precompactWaitMs() {
  const raw = Number(process.env.PRISM_ZULU_PRECOMPACT_WAIT_MS);
  if (Number.isFinite(raw) && raw >= MIN_STAGGER_MS) return raw;
  return DEFAULT_PRECOMPACT_WAIT_MS;
}

// G2 — real uncommitted-work signal for the decision. `git status --porcelain`
// in the PRISM tree; any output => dirty. Run once per sweep. Fail-soft to the
// conservative `true` (unknown => treat as "has work" => bias to /compact, not
// the discarding /clear). R12: failures are surfaced to stderr, never hidden.
// NOTE: on the shared H:/prism tree (thousands of uncommitted files) this is
// effectively always `true` — the real signal value only materializes when a
// slot runs in its own clean worktree. The conservative default keeps that
// saturated case safe (it never wrongly enables the discarding /clear).
function readGitDirty() {
  try {
    const r = spawnSync("git", ["-C", PRISM, "status", "--porcelain"], {
      encoding: "utf8", timeout: 30000, windowsHide: true, maxBuffer: 16 * 1024 * 1024,
    });
    if (r.error || r.signal || r.status !== 0) {
      process.stderr.write(
        `[zulu] git-dirty-check failed (${r.error?.message || r.signal || `exit-${r.status}`}); assuming dirty\n`,
      );
      return true;
    }
    return (r.stdout || "").trim().length > 0;
  } catch (e) {
    process.stderr.write(`[zulu] git-dirty-check threw: ${e?.message || e}; assuming dirty\n`);
    return true;
  }
}

// G9 — does `slot` have a FRESH handoff? A recent HANDOFF-*-<slot>-*.md means
// live cross-session state worth preserving => the decision biases to /compact
// over /clear. Stale/absent => no handoff signal. Fail-soft to false (R12:
// never claim a handoff we cannot verify; a false-positive would be the safe
// direction anyway). Window knob: PRISM_ZULU_HANDOFF_FRESH_HRS (default 6h).
function readHandoffFresh(slot) {
  if (typeof slot !== "string" || !/^[a-z]+$/i.test(slot)) return false;
  try {
    const rawHrs = Number(process.env.PRISM_ZULU_HANDOFF_FRESH_HRS);
    const hrs = Number.isFinite(rawHrs) && rawHrs > 0 ? rawHrs : 6;
    const cutoff = Date.now() - hrs * 3600 * 1000;
    const re = new RegExp(`^HANDOFF-.*-${slot}-.*\\.md$`, "i");
    for (const name of fs.readdirSync(HANDOFF_DIR)) {
      if (!re.test(name)) continue;
      try {
        if (fs.statSync(path.join(HANDOFF_DIR, name)).mtimeMs >= cutoff) return true;
      } catch { /* unstattable entry — skip */ }
    }
    return false;
  } catch {
    return false;
  }
}

// G8 — read the tail of the action log so the sweep can skip slots inside
// their post-action cooldown. Missing log (first run) → []. Never throws.
function readLogTail(logFile, maxLines) {
  try {
    const raw = fs.readFileSync(logFile, "utf8");
    const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
    return lines.slice(-maxLines);
  } catch {
    return [];
  }
}

// G8 — cooldown override; undefined → slotInCooldown uses its lib default.
function cooldownFromEnv() {
  const raw = Number(process.env.PRISM_ZULU_COOLDOWN_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : undefined;
}

// Type the lines into the target window. Returns { ok, dryRun, chars, hwnd, error? }.
// We send each line as a SEPARATE PS invocation so a partial-failure on line 2
// (/checkin-...) doesn't double-fire line 1 (/compact). Stagger between lines.
async function sendLines(hwnd, lines, confirm) {
  const aggregate = { ok: true, dryRun: !confirm, chars: 0, hwnd, lineResults: [] };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const result = spawnSync(
      "powershell.exe",
      // U-ZM2-01: PowerShell's `-File` mode binds argv tokens as strings —
      // `-Confirm:$false` / `-Confirm:0` / `-Confirm:1` all reach the
      // [bool]$Confirm param as a string and fail conversion. The script's
      // default ($Confirm=$false) is the dry-run path, so we OMIT -Confirm
      // for dry-run and signal execute via env (PRISM_SENDKEYS_CONFIRM=1)
      // which the script reads internally without PS argv coercion.
      // While the 24 h opt-in grace runs, this is the only path exercised.
      [
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", SENDKEYS_PS1,
        "-Hwnd", String(hwnd),
        "-Text", line,
      ],
      {
        encoding: "utf8",
        timeout: 45000,
        env: { ...process.env, PRISM_SENDKEYS_CONFIRM: confirm ? "1" : "0" },
      },
    );
    let parsed = null;
    try { parsed = JSON.parse((result.stdout || "").trim()); } catch { /* keep null */ }
    const lineOk = parsed && parsed.ok === true;
    aggregate.lineResults.push({ line, ok: lineOk, parsed, exit: result.status });
    if (lineOk) aggregate.chars += parsed.chars || 0;
    if (!lineOk) {
      aggregate.ok = false;
      aggregate.error = parsed?.error || `ps-exit:${result.status}`;
      break;
    }
    if (i < lines.length - 1) {
      // G3 — wait keyed on the line JUST sent: a /compact line needs a long
      // window so the follow-up /checkin never lands mid-compaction.
      const waitMs = staggerAfterLine(line, {
        staggerMs: staggerMs(),
        compactWaitMs: compactWaitMs(),
        precompactWaitMs: precompactWaitMs(),
      });
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  return aggregate;
}

async function sweepOnce(opts) {
  const slotsDoc = safeJson(opts.slotsFile);
  if (!slotsDoc) {
    process.stderr.write(`[zulu] cannot read slots file: ${opts.slotsFile}\n`);
    return { ok: false, error: "no-slots-file", slots: [] };
  }

  // U-ZM1-02 — project the persistent per-slot opt-in policy onto the
  // in-memory slots doc. state/shared/zulu-opt-in.json is the single source
  // of truth for opt-in: it survives chat churn + full terminal restarts,
  // which a field on the per-chat SlotState would not (chat-slots.mjs:
  // freshState drops it on every fresh claim). pickActionableSlots() below
  // then reads entry.zuluOptIn unchanged. Fail-soft: a missing/corrupt
  // store leaves every entry zuluOptIn=false -> no slots eligible.
  try {
    applyOptInToSlotsDoc(slotsDoc);
  } catch (e) {
    process.stderr.write(`[zulu] opt-in projection failed: ${e?.message || e}\n`);
  }

  const env = { ...process.env };
  if (opts.cliDryRun) env.PRISM_ZULU_DRY_RUN = "1";

  // G8 — recent-action log + cooldown window, read once per sweep.
  const logLines = readLogTail(opts.logFile, 400);
  const cooldownMs = cooldownFromEnv();
  // U-ZULU-COMPACT-VERIFY grace override (ms); undefined -> lib default (3 min).
  const compactVerifyGraceMs = Number(process.env.PRISM_ZULU_COMPACT_VERIFY_GRACE_MS) || undefined;

  // G2 — real uncommitted-work signal, read once per sweep (shared by all slots).
  const gitDirty = readGitDirty();

  const picks = pickActionableSlots(slotsDoc, {
    selfSlot: opts.selfSlot,
    now: Date.now(),
  });

  const scoped = opts.slot ? picks.filter(p => p.slot === opts.slot) : picks;
  const summaries = [];

  // U-ZULU-SWEEP-HEARTBEAT (slot:zulu) -- liveness heartbeat. When NO slot is
  // actionable the per-slot loop below emits no log line, which froze the audit
  // log for days and read as "orchestrator DEAD" when it was alive + idle (every
  // opted-in slot fails the transient-entry.pid gate once the prior-session pids
  // expire). Emit ONE heartbeat naming WHY it idled, then short-circuit BEFORE the
  // costly window enumeration (each enumerateWindows() compiles C# via Add-Type
  // ~1-2s). Skipped under --slot scoping: a scoped miss is an expected per-slot
  // no-op, not fleet idleness, and would spam the log on every targeted call.
  if (scoped.length === 0 && !opts.slot) {
    const elig = summarizeSweepEligibility(slotsDoc, { selfSlot: opts.selfSlot });
    appendLog(opts.logFile, JSON.stringify({
      ts: new Date().toISOString(),
      slot: null,
      event: "sweep-heartbeat",
      decision: "idle",
      decisionReason: elig.reason,
      eligibleSlots: 0,
      optedIn: elig.optedIn,
      eligibility: elig,
      gate: opts.cliDryRun ? "dry-run" : "live",
    }));
    return { ok: true, slots: [], heartbeat: elig.reason };
  }

  // U-ZM1-05 -- enumerate top-level windows ONCE per sweep. Two reasons:
  //  (1) each enumerateWindows() spawn compiles C# via Add-Type (~1-2s); the
  //      old per-slot resolveHwndByTitle() meant N PowerShell spawns per sweep,
  //      which is the `hwnd:spawn-signal` (8s-timeout kill) source under load.
  //  (2) it lets the sweep detect the degenerate "whole fleet is tabs of one
  //      Windows Terminal window" topology, where EnumWindows sees a single WT
  //      HWND and per-chat title resolution is physically impossible (only the
  //      focused tab's caption is visible). That case is reported as the honest
  //      `hwnd:tabbed-fleet-occluded` diagnostic instead of N misleading
  //      `hwnd:no-match` lines that read like a transient.
  // Fail-soft: an enumeration error leaves `windowList` null and every slot
  // reports the enumeration error verbatim.
  const winEnum = enumerateWindows();
  const windowList = winEnum.ok ? winEnum.windows : null;
  const enumError = winEnum.ok ? null : (winEnum.error || "enum-failed");
  // A chat-slot caption deterministically leads with `PRISM <slot>`. If >1
  // chat is actionable but <=1 such caption exists, the fleet is collapsed
  // into a single tabbed WT window — title actuation cannot target a tab.
  // Uses `picks.length` (fleet-wide), not `scoped.length`: the topology is a
  // fleet fact independent of any `--slot` scoping, and `tabbedFleet` only
  // selects the diagnostic STRING — it never gates actuation.
  const prismCaptionCount = windowList
    ? windowList.filter((w) => /^prism\s/i.test(String((w && w.title) || "").trim())).length
    : 0;
  const tabbedFleet = windowList != null && picks.length > 1 && prismCaptionCount <= 1;

  for (let i = 0; i < scoped.length; i++) {
    const pick = scoped[i];

    // G8 — skip a slot still inside its post-action cooldown. Only a prior
    // successful EXECUTE starts a cooldown, so dry-run-only slots are never
    // skipped here. Cheap check ahead of the pressure I/O.
    const cd = slotInCooldown(logLines, pick.slot, { cooldownMs });
    if (cd.cooldown) {
      // U-ZULU-COMPACT-VERIFY (SENT != COMPACTED): the cooldown was started by a
      // resultOk SendKeys, but resultOk = keystrokes DISPATCHED, not that the chat
      // compacted (an occluded/wrong WT tab swallows them). Read the slot's CURRENT
      // pressure and verify the cooldown-starting actuation -- if the /compact never
      // landed (still critical past grace) the cooldown is FALSE: break it + re-
      // target. FAIL-SAFE: any error / ambiguous reading KEEPS the cooldown (never
      // re-fire /compact on an unknowable).
      let cooldownBroken = false;
      try {
        const cdSession = pick.entry?.chatId || pick.entry?.sessionId || null;
        const cdPressure = readChatPressure(cdSession, { slot: pick.slot });
        const verdict = verifyCooldownActuation(
          logLines, pick.slot, cdPressure?.pressureLevel ?? cdPressure?.level,
          { now: Date.now(), graceMs: compactVerifyGraceMs,
            // Break a cooldown ONLY on the AUTHORITATIVE sidecar zone -- never on the
            // byte-estimate fallback, which over-reports 'critical' on a stale sidecar
            // (the 2026-06-10/11 false-critical class). source comes from readChatPressure.
            authoritative: cdPressure?.source === "sidecar" },
        );
        if (verdict.outcome === "ineffective") {
          cooldownBroken = true;
          appendLog(
            opts.logFile,
            formatLogEntry(
              pick,
              { action: "noop", reason: "cooldown-broken:compact-ineffective" },
              null,
              { gate: "verify", reason: verdict.reason },
              { ok: false, error: "cooldown-broken-ineffective" },
              Date.now(),
            ),
          );
        }
      } catch { /* fail-safe: keep the cooldown */ }
      if (!cooldownBroken) {
        const cdDecision = {
          action: "noop",
          reason: `cooldown:${Math.round((cd.sinceMs || 0) / 1000)}s-since-action`,
        };
        const cdGate = { gate: "skip", reason: "cooldown" };
        appendLog(
          opts.logFile,
          formatLogEntry(pick, cdDecision, null, cdGate, { ok: false, error: "cooldown" }, Date.now()),
        );
        summaries.push({
          slot: pick.slot,
          pid: pick.pid,
          decision: "noop",
          reason: cdDecision.reason,
          gate: "skip",
          gateReason: "cooldown",
          resultOk: false,
          error: "cooldown",
          awareness: null,
        });
        continue;
      }
      // else: cooldown broken (compact never landed) -- fall through to re-read
      // pressure + re-target this still-critical slot.
    }

    const sessionId = pick.entry?.chatId || pick.entry?.sessionId || null;

    // Read pressure (CHO02) — failure → silent skip with log.
    let pressure = null;
    try { pressure = readChatPressure(sessionId, { slot: pick.slot }); }
    catch { /* pressure stays null; planSlotAction will name the error */ }

    // G13 — read awareness ONCE here, then use it twice: feed the queueLength
    // into the decision (the "implement what it learns" half — previously the
    // sweep consumed awareness ONLY for log enrichment, never decisions) AND
    // emit the fingerprint into the log below. Fail-soft to null.
    let fp = null;
    try { fp = awarenessLookupSlot(pick.slot); } catch { /* awareness missing */ }

    // U-HRP04 wire — compute the RAG policy hint when historical decisions are
    // available. Today no historical corpus is wired in (env.ZULU_HISTORICAL_DECISIONS
    // is the future hook); returns null fast. When the corpus lands, this
    // hint will be threaded through the awareness fingerprint into the log
    // entry as `ragPolicy` for operator review (advisory only — does NOT
    // override the existing decideClearOrCompact path).
    let ragPolicy = null;
    if (fp && process.env.ZULU_HISTORICAL_DECISIONS) {
      try {
        const corpus = JSON.parse(process.env.ZULU_HISTORICAL_DECISIONS);
        ragPolicy = ragPolicyDecision({
          fingerprint: JSON.stringify(fp),
          historicalDecisions: corpus,
          rerank: null, // wired-but-inactive until rerank dispatcher is exposed to scripts/
        });
      } catch { /* malformed corpus → ignore */ }
    }

    const plan = planSlotAction(pick, pressure || {}, {
      decideClearOrCompact,
      env,
      hasActiveLoop: readLoopActive(sessionId, pick.slot),
      // G9 — real per-slot handoff freshness (was hard-coded false).
      hasHandoff: readHandoffFresh(pick.slot),
      // G2 — real uncommitted-work signal (was hard-coded true in the lib).
      hasUncommittedCriticalWork: gitDirty,
      // G13 — pending queue length biases the decision toward /compact.
      slotQueueLength: typeof fp?.queueLength === "number" ? fp.queueLength : 0,
      // U-ZPSN01 — full awareness fingerprint feeds the SendKeys directive
      // text via buildAwarenessHint -> opts.extraHint in composeSendKeysText.
      // The orchestrator now sends a PSN-derived `[psn:domain=...,role=...,
      // queue=...,tribal=...]` metadata tag on every /checkin-<slot> line,
      // so the target chat starts with the slot's actual capability frame —
      // not just the static backend-dev priority filter. fp may be null when
      // zulu-awareness-index.json is absent; buildAwarenessHint returns ""
      // on null and the chat just gets the unchanged static directive.
      slotAwareness: fp ? { ...fp, ragPolicy } : fp,
    });

    // Decision + plan envelope:
    const decision = plan.decision || { action: "unknown", reason: plan.error };
    const gate = plan.gate || { gate: "skip", reason: plan.error || "no-gate" };
    let result = { ok: false, error: "not-executed" };

    if (plan.ok && plan.plan?.ok && gate.gate !== "skip") {
      // G1b / U-ZM1-05 / U-ZM2-01 — two-tier HWND resolution:
      //   Tier 1: UIA tab focus (the tabbed-fleet primitive). Single PS spawn
      //           per slot — finds + verifies + (when executing) selects the
      //           target tab; refuses on ambiguous/multi-pane. In dry-run mode
      //           the call is SIDE-EFFECT-FREE (no Select, no foreground) so
      //           the 24h opt-in grace never disturbs the operator.
      //   Tier 2: matchWindowsByTitle fallback for legacy separate-window
      //           deployments (and exercised when UIA reports `no-wt-process`).
      // A wrong HWND types /compact into the wrong chat — the SAFETY property
      // is preserved: only `ok:true` from either tier reaches sendLines.
      let hwndResult;
      const isDryRun = gate.gate !== "execute";
      const uia = focusWtTabBySlot(pick.slot, { dryRun: isDryRun });
      if (uia.ok) {
        hwndResult = { ok: true, hwnd: uia.hwnd, tabName: uia.tabName };
      } else if (uia.error === "no-wt-process") {
        // No WT window — fall through to the legacy title-window resolver.
        if (windowList == null) {
          hwndResult = { ok: false, error: `hwnd:${enumError}` };
        } else {
          const m = matchWindowsByTitle(windowList, `PRISM ${pick.slot}`);
          if (m.ok) {
            hwndResult = { ok: true, hwnd: m.hwnd };
          } else if (tabbedFleet && m.error === "no-match") {
            hwndResult = { ok: false, error: "hwnd:tabbed-fleet-occluded" };
          } else {
            hwndResult = { ok: false, error: `hwnd:${m.error}` };
          }
        }
      } else {
        // UIA returned a precise diagnostic (no-tab / ambiguous-tab /
        // pane-count <n> / ...). Propagate verbatim — that's the actionable
        // signal for the burn-in operator.
        hwndResult = { ok: false, error: `uia:${uia.error}` };
      }
      if (!hwndResult.ok) {
        result = { ok: false, error: hwndResult.error };
      } else {
        result = await sendLines(hwndResult.hwnd, plan.plan.lines, gate.gate === "execute");
      }
    } else if (plan.plan && plan.plan.ok === false) {
      result = { ok: false, error: plan.plan.error };
    }

    // U-AW01 + G13: re-use the fingerprint already read above for log enrichment.
    // The decision-flow consumer of the fingerprint is the planSlotAction call
    // above (slotQueueLength); this block is just observability.
    let awareness = null;
    if (fp) {
      try {
        awareness = {
          hermesRole: fp.hermesRole || "specialist",
          primaryDomain: Array.isArray(fp.domains) && fp.domains.length > 0 ? fp.domains[0] : null,
          queueLength: typeof fp.queueLength === "number" ? fp.queueLength : 0,
        };
      } catch { /* malformed fp — drop awareness for this slot */ }
    }

    const baseLog = JSON.parse(formatLogEntry(pick, decision, plan.plan, gate, result, Date.now()));
    if (awareness) baseLog.awareness = awareness;
    appendLog(opts.logFile, JSON.stringify(baseLog));

    summaries.push({
      slot: pick.slot,
      pid: pick.pid,
      decision: decision.action,
      reason: decision.reason || plan.error,
      gate: gate.gate,
      gateReason: gate.reason,
      resultOk: result.ok === true,
      error: result.error || null,
      awareness,
    });

    // Inter-slot stagger so we never SendKeys two windows back-to-back.
    if (i < scoped.length - 1 && gate.gate === "execute" && result.ok) {
      await new Promise(r => setTimeout(r, staggerMs()));
    }
  }

  return { ok: true, slots: summaries };
}

// P1 (G3 follow-up) — single-instance guard. With the 90s /compact waits a
// sweep can run past the 5-min scheduler interval; without this, the next
// scheduled run would start while the prior is still typing into windows —
// two zulu processes SendKeys-ing the same chats concurrently. The lock makes
// a second concurrent sweep cleanly SKIP (exit 0), never an error.
function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (e) { return Boolean(e && e.code === "EPERM"); } // EPERM => exists, not ours
}

function acquireSweepLock() {
  try { fs.mkdirSync(LOCK_DIR, { recursive: true }); } catch { /* ignore */ }
  const payload = JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() });
  try {
    fs.writeFileSync(SWEEP_LOCK, payload, { encoding: "utf8", flag: "wx" });
    return { ok: true };
  } catch (e) {
    if (!e || e.code !== "EEXIST") {
      // Cannot even create the lock — fail OPEN (run) rather than wedge the
      // orchestrator forever; surface it loudly (R12).
      process.stderr.write(`[zulu] lock-create failed (${e?.code || e}); proceeding without lock\n`);
      return { ok: true, unlocked: true };
    }
  }
  // Lock exists — steal it only if the holder is dead or the lock is stale.
  let held = null;
  try { held = JSON.parse(fs.readFileSync(SWEEP_LOCK, "utf8")); } catch { /* corrupt */ }
  const heldPid = held && Number(held.pid);
  const heldAt = held && Date.parse(held.startedAt || "");
  const stale = !Number.isFinite(heldAt) || (Date.now() - heldAt) > SWEEP_LOCK_STALE_MS;
  if (heldPid && isPidAlive(heldPid) && !stale) {
    return { ok: false, heldPid, heldAt: held?.startedAt || null };
  }
  try {
    fs.writeFileSync(SWEEP_LOCK, payload, { encoding: "utf8" });
    process.stderr.write(`[zulu] stole stale/dead sweep lock (was pid=${heldPid || "?"})\n`);
    return { ok: true, stolen: true };
  } catch (e) {
    process.stderr.write(`[zulu] lock-steal failed (${e?.code || e}); proceeding without lock\n`);
    return { ok: true, unlocked: true };
  }
}

function releaseSweepLock() {
  try {
    const held = JSON.parse(fs.readFileSync(SWEEP_LOCK, "utf8"));
    if (held && Number(held.pid) === process.pid) fs.unlinkSync(SWEEP_LOCK);
  } catch { /* already gone / not ours — fine */ }
}

// loop-state.mjs reap is a fast ledger scan; 20s is generous headroom over the
// observed sub-second runtime even with a few hundred records.
const LOOP_REAP_TIMEOUT_MS = 20000;

/**
 * Loop-ledger self-maintenance (U-ZULU-LOOP-REAP, 2026-06-25, slot:zulu).
 *
 * The fleet's per-session loop-state records (state/shared/loop-state/*.json)
 * accumulate unbounded: `loop-state.mjs reap` (deletes finished loops >4h old,
 * flips still-`running` loops >4h to status:"stale") EXISTED but was never
 * scheduled, so 318 stale records had piled up -- 69 of them ghost-"running"
 * from crashed/compacted sessions that never called `end`. Piggyback the
 * existing zulu-orchestrator scheduled cadence so the ledger self-maintains.
 *
 * Fail-soft by construction: a reap error must NEVER break the sweep -- every
 * path returns a result object, none throws. `spawnFn` is injectable for tests.
 * Knob: PRISM_ZULU_LOOP_REAP_DISABLE=1.
 *
 * @returns {{ok:boolean, reaped?:number, skipped?:string, error?:string}}
 */
export function reapLoopLedger(env = process.env, spawnFn = spawnSync) {
  if (env.PRISM_ZULU_LOOP_REAP_DISABLE === "1") return { ok: false, skipped: "disabled" };
  try {
    const helper = path.join(PRISM, ".claude", "helpers", "loop-state.mjs");
    const r = spawnFn(process.execPath, [helper, "reap"], {
      encoding: "utf8",
      timeout: LOOP_REAP_TIMEOUT_MS,
      windowsHide: true,
    });
    if (!r || r.status !== 0) {
      // On a spawnSync timeout/launch-failure r.status is null and r.error holds
      // the precise reason (ETIMEDOUT/ENOENT) -- prefer it over generic stderr.
      const why = (
        r && r.error && r.error.message ? String(r.error.message)
          : r && r.stderr ? String(r.stderr)
            : "non-zero exit"
      ).trim().slice(0, 200);
      return { ok: false, error: why };
    }
    let reaped = 0;
    try {
      reaped = Number(JSON.parse(String(r.stdout || "{}").trim()).reaped) || 0;
    } catch {
      /* malformed stdout -- treat as 0 reaped; the reap subprocess still ran (ok) */
    }
    return { ok: true, reaped };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e).slice(0, 200) };
  }
}

async function main() {
  // Hard kill switch -- explicit honor before any I/O.
  if (process.env.PRISM_ZULU_DISABLE === "1") {
    process.stdout.write("zulu: disabled (PRISM_ZULU_DISABLE=1)\n");
    process.exit(0);
  }

  const args = parseArgs(process.argv);
  const opts = {
    slotsFile: DEFAULT_SLOTS_FILE,
    logFile: DEFAULT_LOG_FILE,
    cliDryRun: args.dryRun,
    selfSlot: process.env.PRISM_ZULU_SELF_SLOT || null,
    slot: args.slot,
  };

  // Loop-ledger self-maintenance (U-ZULU-LOOP-REAP) -- run BEFORE the lock so the
  // ledger is upkept even when a concurrent sweep holds the lock (ledger reap is
  // independent of the window-typing sweep). Fail-soft: never blocks the sweep.
  const loopReap = reapLoopLedger();

  // P1 -- single-instance guard: a prior sweep still typing into windows must
  // not be raced by this one. A held lock => clean skip (exit 0), not failure.
  const lock = acquireSweepLock();
  if (!lock.ok) {
    process.stdout.write(
      `zulu: prior sweep still running (pid=${lock.heldPid}, since ${lock.heldAt}); skipping` +
        (loopReap.ok && loopReap.reaped ? ` (loop-ledger reaped ${loopReap.reaped})` : "") + "\n",
    );
    process.exit(0);
  }

  let out;
  try {
    out = await sweepOnce(opts);
  } finally {
    if (!lock.unlocked) releaseSweepLock();
  }
  out.loopReap = loopReap;
  if (args.json) {
    process.stdout.write(JSON.stringify(out) + "\n");
  } else {
    if (loopReap.ok && loopReap.reaped > 0) {
      process.stdout.write(`zulu: loop-ledger reaped ${loopReap.reaped} stale record(s)\n`);
    }
    if (!out.ok) {
      process.stdout.write(`zulu: ${out.error}\n`);
      process.exit(1);
    }
    if (out.slots.length === 0) {
      process.stdout.write("zulu: no opt-in slots (set slots[name].zuluOptIn=true)\n");
    }
    for (const s of out.slots) {
      process.stdout.write(
        `slot=${s.slot} pid=${s.pid} decision=${s.decision} gate=${s.gate} ok=${s.resultOk}` +
        (s.error ? ` err=${s.error}` : "") + "\n",
      );
    }
  }
  process.exit(0);
}

// Only run when invoked directly (not when imported by tests).
const __file = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__file)) {
  main().catch((e) => {
    process.stderr.write(`[zulu] uncaught: ${e?.stack || e}\n`);
    process.exit(1);
  });
}

export { sweepOnce, parseArgs, sendLines, staggerMs };
