#!/usr/bin/env node
// task-freshness.mjs — TASK-FRESHNESS-GATE-MS0/U-TFG01 (2026-05-18)
//
// Pure, dependency-injectable core for the task-freshness gate (R13 doctrine).
// A task's ground truth is its generation timestamp. Before a chat commits to
// building a unit, this module answers: "was this task's source generated
// before recent fleet activity, such that it may already be shipped, rescoped,
// or invalidated?"
//
// Four task surfaces (verified field names against live data 2026-05-18):
//   - envelope   : mcp-server/data/milestones/<MS>.json     → `created_at`
//                  (+ the unit's OWN row in units[] carries `status` /
//                   `completed_at` — the STRONGEST stale signal: if the unit
//                   you're about to claim is already status:completed, that's
//                   an immediate ALREADY-SHIPPED block, no commit-count needed)
//   - audit-spec : state/shared/specs/*-AUDIT-*.md|json      → `generatedAt`
//                  or filename YYYY-MM-DD suffix
//   - inventory  : ROADMAP-CONSOLIDATED / MISC-TASKS / slot-task-queues
//                                                            → `generatedAt`
//   - handoff    : state/shared/handoffs/HANDOFF-*.md frontmatter `written_at`
//
// DESIGN: every function takes injected readers (readJson/statFile/gitLog/
// readChatBus/now) so the test suite is hermetic. Per the
// RGS-TOOL-AUTOINVOKE-MS1 lesson, the companion test ALSO ships one real-data
// E2E — hermetic fakes do not prove production wiring.
//
// FAIL-OPEN CONTRACT (R12): this module never throws to the caller for a
// resolution failure. classify/read return `unknown`/`null`; the GATE decides
// allow-on-unknown. The gate — not this core — owns the block decision.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const MILESTONES_DIR = path.join(PRISM_ROOT, "mcp-server/data/milestones");
const SPECS_DIR = path.join(PRISM_ROOT, "state/shared/specs");
const HANDOFFS_DIR = path.join(PRISM_ROOT, "state/shared/handoffs");
const CHAT_BUS = path.join(PRISM_ROOT, "state/shared/AGENT_CHAT.jsonl");
const ACK_DIR_DEFAULT = path.join(PRISM_ROOT, "state/shared/task-freshness-acks");

const UNIT_ID_RE = /^([A-Z][A-Z0-9_-]{1,80})::([A-Za-z0-9_+.-]{1,80})$/;
const DATE_SUFFIX_RE = /(\d{4}-\d{2}-\d{2})(?:\.[a-z]+)?$/;

// Envelope/inventory timestamp field candidates, most-authoritative first.
const TS_FIELDS = ["created_at", "createdAt", "generatedAt", "generated_at", "updated_at"];

const HOUR_MS = 3600 * 1000;

// ──────────────────────────────────────────────────────────────────────────
// default readers (production). All injectable.
// ──────────────────────────────────────────────────────────────────────────

function defaultReadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function defaultStatFile(p) {
  try {
    const s = fs.statSync(p);
    return { exists: true, mtimeMs: s.mtimeMs };
  } catch {
    return { exists: false, mtimeMs: 0 };
  }
}

function defaultReadText(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function defaultGitLog(args, timeoutMs) {
  try {
    const out = execFileSync("git", ["-C", PRISM_ROOT, ...args], { windowsHide: true,
      timeout: timeoutMs,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 8 * 1024 * 1024,
    });
    return out;
  } catch {
    return null; // timeout, not-a-repo, etc — fail-open
  }
}

function defaultReadChatBus(maxBytes) {
  try {
    const s = fs.statSync(CHAT_BUS);
    const start = Math.max(0, s.size - maxBytes);
    const fd = fs.openSync(CHAT_BUS, "r");
    const len = s.size - start;
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, start);
    fs.closeSync(fd);
    return buf.toString("utf8");
  } catch {
    return "";
  }
}

const DEFAULT_READERS = Object.freeze({
  readJson: defaultReadJson,
  statFile: defaultStatFile,
  readText: defaultReadText,
  gitLog: defaultGitLog,
  readChatBus: defaultReadChatBus,
  now: () => Date.now(),
});

// ──────────────────────────────────────────────────────────────────────────
// classifyTaskSource — resolve a unitId to its source surface + path
// ──────────────────────────────────────────────────────────────────────────

export function classifyTaskSource(unitId, opts = {}) {
  const readers = { ...DEFAULT_READERS, ...opts };
  const m = String(unitId || "").match(UNIT_ID_RE);
  if (!m) {
    return { kind: "unknown", reason: "unitId did not match MS::U-ID grammar", unitId };
  }
  const [, milestone, unit] = m;
  const milestonePath = path.join(MILESTONES_DIR, `${milestone}.json`);
  const envStat = readers.statFile(milestonePath);

  if (!envStat.exists) {
    return {
      kind: "unknown",
      reason: `no envelope at ${milestonePath}`,
      unitId,
      milestone,
      unit,
    };
  }

  // An *-AUDIT-MS* / FEATURE-GAP-* envelope is backed by an audit spec whose
  // own mtime can be OLDER than a re-written envelope. The older of the two
  // governs (a re-serialized envelope must not mask a stale audit).
  // SECURITY (scrutiny P1): envelopes are fleet-shared + peer-writable. A
  // crafted `source_audit` (absolute, or relative with `../`) must NOT let a
  // hostile envelope point this stat/read outside PRISM_ROOT. Resolve and
  // assert containment; reject silently (fail-open — envelope ts still governs).
  let auditSpecPath = null;
  if (/(-AUDIT-|^FEATURE-GAP-|-PUNCHLIST-)/.test(milestone) || /GAP|AUDIT/.test(milestone)) {
    const env = readers.readJson(milestonePath);
    const srcAudit = env && (env.source_audit || env.sourceAudit);
    if (srcAudit && typeof srcAudit === "string") {
      const cand = path.resolve(
        path.isAbsolute(srcAudit) ? srcAudit : path.join(PRISM_ROOT, srcAudit)
      );
      const rootResolved = path.resolve(PRISM_ROOT);
      const contained =
        cand === rootResolved || cand.startsWith(rootResolved + path.sep);
      if (contained && readers.statFile(cand).exists) auditSpecPath = cand;
    }
  }

  return {
    kind: auditSpecPath ? "audit-spec" : "envelope",
    unitId,
    milestone,
    unit,
    milestonePath,
    auditSpecPath,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// readGenerationTimestamp — cascade to the authoritative gen time (ISO|null)
//   in-file ts field → filename date suffix → git first-touch → mtime → null
// Also surfaces the unit's OWN status row (already-shipped is the strongest
// possible stale signal — no commit math required).
// ──────────────────────────────────────────────────────────────────────────

// A gen anchor is TRUSTWORTHY only if it is a real recorded generation time.
// `file-mtime` is NOT — a re-serialized/touched envelope (most of the
// history-stripped envelopes per CLAUDE.md) has an mtime that says nothing
// about when the TASK was generated. `none` is obviously untrusted. The gate
// treats an untrusted anchor as conservative-stale (force a manual re-check)
// rather than spawning git against a meaningless date (fork-storm avoidance).
const TRUSTED_SOURCES = new Set([
  "audit-spec",
  "filename-date",
  "git-first-touch",
]);
function isTrustedSource(src) {
  return TRUSTED_SOURCES.has(src) || /^envelope\./.test(src || "");
}

export function readGenerationTimestamp(taskRef, opts = {}) {
  const readers = { ...DEFAULT_READERS, ...opts };
  const out = { genIso: null, source: "none", trusted: false, unitStatus: null, unitCompletedAt: null };
  const finalize = () => {
    out.trusted = isTrustedSource(out.source);
    return out;
  };
  if (!taskRef || taskRef.kind === "unknown") return finalize();

  const primaryPath = taskRef.milestonePath;
  const auditPath = taskRef.auditSpecPath;

  const env = readers.readJson(primaryPath);
  if (env) {
    // unit-level status — read the specific unit's row.
    const units = Array.isArray(env.units) ? env.units : [];
    const row = units.find(
      (u) => u && (u.id === taskRef.unit || u.unit_id === taskRef.unit)
    );
    if (row) {
      out.unitStatus = row.status || null;
      out.unitCompletedAt = row.completed_at || row.completedAt || null;
    }
    for (const f of TS_FIELDS) {
      if (env[f] && !Number.isNaN(Date.parse(env[f]))) {
        out.genIso = new Date(env[f]).toISOString();
        out.source = `envelope.${f}`;
        break;
      }
    }
  }

  // If audit-spec backs this envelope, take the OLDER of (envelope ts, audit ts).
  if (auditPath) {
    let auditIso = null;
    if (/\.json$/.test(auditPath)) {
      const aj = readers.readJson(auditPath);
      for (const f of TS_FIELDS) {
        if (aj && aj[f] && !Number.isNaN(Date.parse(aj[f]))) {
          auditIso = new Date(aj[f]).toISOString();
          break;
        }
      }
    }
    if (!auditIso) {
      const sm = auditPath.match(DATE_SUFFIX_RE);
      if (sm) auditIso = new Date(`${sm[1]}T00:00:00.000Z`).toISOString();
    }
    if (!auditIso) {
      const as = readers.statFile(auditPath);
      if (as.exists) auditIso = new Date(as.mtimeMs).toISOString();
    }
    if (auditIso) {
      if (!out.genIso || Date.parse(auditIso) < Date.parse(out.genIso)) {
        out.genIso = auditIso;
        out.source = "audit-spec";
      }
    }
  }

  if (out.genIso) return finalize();

  // filename date suffix on the primary path
  const fm = String(primaryPath).match(DATE_SUFFIX_RE);
  if (fm) {
    out.genIso = new Date(`${fm[1]}T00:00:00.000Z`).toISOString();
    out.source = "filename-date";
    return finalize();
  }

  // git first-touch of the envelope file
  const gl = readers.gitLog(
    ["log", "--diff-filter=A", "--format=%aI", "--", path.relative(PRISM_ROOT, primaryPath)],
    Number(process.env.PRISM_TASK_FRESHNESS_GIT_TIMEOUT_MS) || 8000
  );
  if (gl) {
    const lines = gl.trim().split(/\r?\n/).filter(Boolean);
    const first = lines[lines.length - 1];
    if (first && !Number.isNaN(Date.parse(first))) {
      out.genIso = new Date(first).toISOString();
      out.source = "git-first-touch";
      return finalize();
    }
  }

  // file mtime — last resort. UNTRUSTED anchor (see TRUSTED_SOURCES): a
  // touched/re-serialized envelope's mtime is not a real generation time.
  const st = readers.statFile(primaryPath);
  if (st.exists && st.mtimeMs > 0) {
    out.genIso = new Date(st.mtimeMs).toISOString();
    out.source = "file-mtime";
  }
  return finalize();
}

// ──────────────────────────────────────────────────────────────────────────
// countActivitySince — commits + envelope flips + peer ships since `sinceIso`
// ──────────────────────────────────────────────────────────────────────────

export function countActivitySince(sinceIso, opts = {}) {
  const readers = { ...DEFAULT_READERS, ...opts };
  // `unprovable` (scrutiny P0): when git is unavailable (timeout under the
  // documented fork-storm / 98% commit pressure) commitsCount stays 0, which
  // would make a genuinely-stale task look fresh. decideFreshness MUST see
  // this flag and refuse to certify freshness it could not actually compute.
  const result = { commitsCount: 0, envelopeFlips: 0, peerShips: [], unprovable: false, summary: "" };
  if (!sinceIso || Number.isNaN(Date.parse(sinceIso))) {
    result.summary = "since-date unparseable — activity unknown";
    return result;
  }
  const sinceMs = Date.parse(sinceIso);
  const nowMs = (readers.now || (() => Date.now()))();
  if (sinceMs > nowMs) {
    result.summary = "since-date in the future — treated as zero activity";
    return result;
  }

  const git = readers.gitLog(
    ["log", `--since=${sinceIso}`, "--format=%H %s"],
    Number(process.env.PRISM_TASK_FRESHNESS_GIT_TIMEOUT_MS) || 8000
  );
  if (git !== null) {
    const lines = git.trim().split(/\r?\n/).filter(Boolean);
    result.commitsCount = lines.length;
    result.envelopeFlips = lines.filter((l) =>
      /ENVELOPE|flip envelope|=completed|status=completed/i.test(l)
    ).length;
  } else {
    result.unprovable = true;
    result.summary = "git log unavailable (timeout/not-a-repo) — ";
  }

  // peer ships from the chat-bus tail (256KB window)
  const busTail = readers.readChatBus(256 * 1024);
  for (const ln of String(busTail).split(/\r?\n/)) {
    if (!ln.trim()) continue;
    let ev;
    try {
      ev = JSON.parse(ln);
    } catch {
      continue;
    }
    const ts = ev.ts || ev.timestamp;
    if (!ts || Number.isNaN(Date.parse(ts)) || Date.parse(ts) < sinceMs) continue;
    const type = ev.type || ev.kind || "";
    if (/unit-ship|unit-claim|close-out/.test(type) || /SHIPPED/.test(ev.message || "")) {
      result.peerShips.push({
        slot: ev.slot || ev.from || "?",
        unit: ev.unit || "?",
        ts,
      });
    }
  }
  result.summary +=
    `${result.commitsCount} commits, ${result.envelopeFlips} envelope flips, ` +
    `${result.peerShips.length} peer ship/claim events since ${sinceIso}`;
  return result;
}

// ──────────────────────────────────────────────────────────────────────────
// decideFreshness — the verdict. STALE (force a re-check) IFF any of:
//   (a) the unit's OWN envelope row is status:completed   → already-shipped
//   (b) genIso resolved but in the FUTURE (clock skew/bad) → gen-in-future
//   (c) gen anchor is UNTRUSTED (file-mtime/none) + activity
//                                                         → gen-anchor-untrusted
//   (d) activity could NOT be computed (git down)         → freshness-unprovable
//   (e) genIso unresolved AND intervening activity        → gen-unknown-*
//   (f) ageHrs > staleHrs                                 → stale-by-age
//   (g) ageHrs > 1 AND commitsCount >= peerTrig           → stale-by-activity
// (b)(c)(d) are the R12 anti-silent-pass guards: the gate must NOT certify a
// freshness it could not actually prove. The chat clears with --ack-stale
// after a manual re-check (one flag, 30-min TTL stamp).
// ──────────────────────────────────────────────────────────────────────────

export function decideFreshness({ gen, activity, thresholds, now }) {
  const sH = Number(thresholds?.staleHrs);
  const pT = Number(thresholds?.peerCommitsTrigger);
  const staleHrs = Number.isFinite(sH) ? sH : 24;
  const peerTrig = Number.isFinite(pT) ? pT : 5;
  const nowMs = typeof now === "number" ? now : Date.now();
  const a = activity || { commitsCount: 0, envelopeFlips: 0, peerShips: [], unprovable: false };
  const thr = { staleHrs, peerCommitsTrigger: peerTrig };

  // (a) strongest signal — the unit itself is already shipped.
  if (gen && gen.unitStatus && /^(completed|done|shipped|closed)$/i.test(gen.unitStatus)) {
    return {
      stale: true,
      severity: "already-shipped",
      ageHrs: null,
      reason: `unit envelope row is status:${gen.unitStatus}` +
        (gen.unitCompletedAt ? ` (completed_at ${gen.unitCompletedAt})` : ""),
      threshold: thr,
    };
  }

  // (e) generation time unresolved.
  if (!gen || !gen.genIso) {
    const hasActivity = a.commitsCount > 0 || a.peerShips.length > 0 || a.unprovable;
    return {
      stale: hasActivity,
      severity: hasActivity ? "gen-unknown-with-activity" : "gen-unknown-quiet",
      ageHrs: null,
      reason: hasActivity
        ? "generation time unresolved AND fleet activity present/unprovable — cannot prove freshness"
        : "generation time unresolved but no intervening activity — allowed",
      threshold: thr,
    };
  }

  const ageHrs = (nowMs - Date.parse(gen.genIso)) / HOUR_MS;

  // (b) future generation timestamp — negative age would silently read as
  // "fresh" (scrutiny P1-1). Clock skew or a corrupt/forward-dated envelope:
  // force a re-check rather than trust an impossible date.
  if (ageHrs < 0) {
    return {
      stale: true,
      severity: "gen-in-future",
      ageHrs: Math.round(ageHrs * 100) / 100,
      reason: `generation time ${gen.genIso} is in the future (age ${ageHrs.toFixed(1)}h) — cannot trust the anchor`,
      threshold: thr,
    };
  }

  // (c) untrusted anchor — file-mtime/none is not a real generation time
  // (scrutiny P1). Don't certify freshness off a meaningless date; the gate
  // also skips spawning git for this case (fork-storm avoidance in evaluate()).
  if (gen.trusted === false) {
    return {
      stale: true,
      severity: "gen-anchor-untrusted",
      ageHrs: Math.round(ageHrs * 100) / 100,
      reason: `gen anchor is '${gen.source}' (file-mtime/none) — not a recorded generation time; freshness unprovable`,
      threshold: thr,
    };
  }

  // (d) activity could not be computed (git unavailable — scrutiny P0).
  // Refusing here is the whole point of the gate: never silent-pass a
  // freshness we did not actually measure.
  if (a.unprovable) {
    return {
      stale: true,
      severity: "freshness-unprovable",
      ageHrs: Math.round(ageHrs * 100) / 100,
      reason: `activity since ${gen.genIso} could not be computed (git unavailable) — freshness cannot be certified`,
      threshold: thr,
    };
  }

  const byHours = ageHrs > staleHrs;
  const byCommits = ageHrs > 1 && a.commitsCount >= peerTrig;

  if (byHours || byCommits) {
    return {
      stale: true,
      severity: byHours ? "stale-by-age" : "stale-by-activity",
      ageHrs: Math.round(ageHrs * 100) / 100,
      reason:
        (byHours ? `age ${ageHrs.toFixed(1)}h > ${staleHrs}h threshold` : "") +
        (byHours && byCommits ? " AND " : "") +
        (byCommits ? `${a.commitsCount} commits since gen >= ${peerTrig} trigger` : ""),
      threshold: { staleHrs, peerCommitsTrigger: peerTrig },
    };
  }

  return {
    stale: false,
    severity: "fresh",
    ageHrs: Math.round(ageHrs * 100) / 100,
    reason: `age ${ageHrs.toFixed(1)}h within ${staleHrs}h, ${a.commitsCount} commits < ${peerTrig} trigger`,
    threshold: { staleHrs, peerCommitsTrigger: peerTrig },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// acknowledgment stamps — presence-of-valid-stamp grants the gate permission
// ──────────────────────────────────────────────────────────────────────────

function sanitize(s) {
  return String(s).replace(/::/g, "__").replace(/[^A-Za-z0-9_.-]/g, "_");
}

export function ackPath(chatId, unitId, stampDir = ACK_DIR_DEFAULT) {
  return path.join(stampDir, `${sanitize(chatId)}__${sanitize(unitId)}.json`);
}

export function acknowledgmentValid(chatId, unitId, opts = {}) {
  const readers = { ...DEFAULT_READERS, ...opts };
  const stampDir = opts.stampDir || ACK_DIR_DEFAULT;
  const p = ackPath(chatId, unitId, stampDir);
  const j = readers.readJson(p);
  if (!j || !j.expiresAt) return false;
  const exp = Date.parse(j.expiresAt);
  if (Number.isNaN(exp)) return false;
  const nowMs = (readers.now || (() => Date.now()))();
  return exp > nowMs;
}

export function writeAcknowledgment(chatId, unitId, freshnessReport, opts = {}) {
  const stampDir = opts.stampDir || ACK_DIR_DEFAULT;
  const ttlMs = Number(opts.ttlMs) || 30 * 60 * 1000;
  const nowMs = (opts.now || (() => Date.now()))();
  const p = ackPath(chatId, unitId, stampDir);
  const payload = {
    schemaVersion: 1,
    chatId,
    unitId,
    checkedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + ttlMs).toISOString(),
    freshness: freshnessReport || {},
  };
  try {
    fs.mkdirSync(stampDir, { recursive: true });
    const tmp = `${p}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
    fs.renameSync(tmp, p);
  } catch {
    return null; // fail-open: a write failure must not block the gate
  }
  return p;
}

// ──────────────────────────────────────────────────────────────────────────
// evaluate — one-call orchestrator the hook uses (classify→read→count→decide)
// ──────────────────────────────────────────────────────────────────────────

export function evaluate(unitId, opts = {}) {
  const taskRef = classifyTaskSource(unitId, opts);
  const gen = readGenerationTimestamp(taskRef, opts);
  // Only spend a git subprocess when the gen anchor is BOTH resolved AND
  // trustworthy. An untrusted anchor (file-mtime/none) short-circuits inside
  // decideFreshness as `gen-anchor-untrusted` regardless of activity — so
  // spawning `git log --since` here would be pure fork-storm waste under the
  // documented 98%-commit / Cygwin-fork-storm fleet state (scrutiny P1).
  const activity =
    gen.genIso && gen.trusted
      ? countActivitySince(gen.genIso, opts)
      : {
          commitsCount: 0,
          envelopeFlips: 0,
          peerShips: [],
          unprovable: false,
          summary: gen.genIso
            ? `gen anchor '${gen.source}' untrusted — activity spawn skipped`
            : "no gen date — activity skipped",
        };
  const verdict = decideFreshness({
    gen,
    activity,
    thresholds: {
      staleHrs: Number(process.env.PRISM_TASK_FRESHNESS_STALE_HRS) || 24,
      peerCommitsTrigger: Number(process.env.PRISM_TASK_FRESHNESS_PEER_COMMITS_TRIGGER) || 5,
    },
    now: (opts.now || (() => Date.now()))(),
  });
  return { taskRef, gen, activity, verdict };
}

// CLI: `node task-freshness.mjs ack --chatId C --unit U [--ttl-min N]`
//      `node task-freshness.mjs eval --unit U`
function isCli() {
  try {
    // fileURLToPath handles the Windows file:// leading-slash drive quirk
    // (/H:/...) that a bare new URL().pathname does not — same idiom as
    // slot-task-claim.mjs. A bare-pathname compare leaves the CLI dead on win32.
    return path.resolve(process.argv[1] || "") === path.resolve(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isCli()) {
  const argv = process.argv.slice(2);
  const sub = argv[0];
  const flag = (n) => {
    const i = argv.indexOf(`--${n}`);
    return i >= 0 ? argv[i + 1] : null;
  };
  if (sub === "ack") {
    const chatId = flag("chatId");
    const unit = flag("unit");
    if (!chatId || !unit) {
      process.stderr.write("usage: ack --chatId <C> --unit <MS::U-ID> [--ttl-min N]\n");
      process.exit(2);
    }
    const ev = evaluate(unit);
    const p = writeAcknowledgment(chatId, unit, ev.verdict, {
      ttlMs: (Number(flag("ttl-min")) || 30) * 60 * 1000,
    });
    process.stdout.write(JSON.stringify({ ok: !!p, ackPath: p, verdict: ev.verdict }) + "\n");
    process.exit(p ? 0 : 3);
  } else if (sub === "eval") {
    const unit = flag("unit");
    if (!unit) {
      process.stderr.write("usage: eval --unit <MS::U-ID>\n");
      process.exit(2);
    }
    process.stdout.write(JSON.stringify(evaluate(unit), null, 2) + "\n");
    process.exit(0);
  } else {
    process.stderr.write("subcommands: ack | eval\n");
    process.exit(2);
  }
}
