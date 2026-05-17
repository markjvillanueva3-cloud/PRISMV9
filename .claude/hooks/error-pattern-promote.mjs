#!/usr/bin/env node
// tier: T4
/**
 * error-pattern-promote.mjs — Stop hook.
 *
 * Watches ERROR_LEARN_LEDGER.jsonl. When the same error fingerprint appears
 * ≥THRESHOLD times within ROLLING_DAYS, drafts a lesson stub at
 * knowledge/wiki/lessons/auto-{fingerprint}.md so the failure mode gets
 * captured into wiki and a hook/skill can be designed to prevent recurrence.
 *
 * Idempotent: skips fingerprints with an existing auto-stub.
 *
 * Fail-safe: continueOnError. Never blocks Stop.
 * Disable: PRISM_ERROR_PROMOTE=0
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { shouldSkipMemo } from "./lib/error-pattern-memo-guard.mjs";

const LEDGER = "H:/prism/mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl";
const LESSONS_DIR = "H:/prism/knowledge/wiki/lessons";
const TELEMETRY = "H:/prism/mcp-server/data/state/hook-fire-counts.jsonl";
// Memo sidecar: skips the full ledger read+parse when the ledger is
// byte-identical (size+mtime) to the last run AND the last decision was a
// no-op. Decision logic + its load-bearing append-only assumption live in
// ./lib/error-pattern-memo-guard.mjs (pure, unit-tested).
const MEMO = "H:/prism/.claude/cache/error-pattern-promote-last.json";

function statLedger() {
  try { const s = statSync(LEDGER); return { size: s.size, mtimeMs: Math.floor(s.mtimeMs) }; }
  catch { return null; }
}
function readMemo() {
  try { return JSON.parse(readFileSync(MEMO, "utf8")); } catch { return null; }
}
function writeMemo(obj) {
  // Ensure the cache dir exists — otherwise writeFileSync ENOENTs forever and
  // the memo is a permanent unobservable no-op (the exact silent-failure class
  // the token-savings audit flagged). On any write failure, emit a one-time
  // telemetry signal so a disabled memo is observable, not silent (R12).
  try {
    mkdirSync(dirname(MEMO), { recursive: true });
    writeFileSync(MEMO, JSON.stringify(obj), "utf8");
  } catch (err) {
    tele("memo_write_failed", { err: String(err && err.code || err).slice(0, 40) });
  }
}

function tele(decision, extra) {
  try { appendFileSync(TELEMETRY, JSON.stringify({ ts: new Date().toISOString(), hook: "error-pattern-promote", decision, ...extra }) + "\n", "utf8"); } catch {}
}
const THRESHOLD = 3;
const ROLLING_DAYS = 7;
const SECONDS_PER_DAY = 86400;
const MS_PER_SECOND = 1000;
const MAX_RECENT_SAMPLES = 5;
const SAMPLE_PREVIEW_LEN = 200;
const SLUG_MAX_LEN = 60;

function drainStdin() { try { readFileSync(0, "utf8"); } catch {} }

function readLedger() {
  if (!existsSync(LEDGER)) return [];
  try {
    return readFileSync(LEDGER, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

function slug(s) {
  return String(s || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, SLUG_MAX_LEN) || "unknown";
}

// Stable grouping key. The ledger's `fingerprint` embeds the raw command
// (and `file_suffix` is command-polluted for Bash rows), so neither groups
// recurrences — same logical error from different commands stays unique and
// never reaches THRESHOLD. error_class+trigger is the clean discriminator;
// hook_id distinguishes HOOK_BLOCK rows. Falls back to tool, never command.
function stableKey(e) {
  const cls = e.error_class || e.tool || "unknown";
  const disc = e.trigger || e.hook_id || e.tool || "general";
  const key = e.hook_id ? `${cls}|${disc}|${e.hook_id}` : `${cls}|${disc}`;
  return key.toLowerCase();
}

function atomicWrite(path, content) {
  // wx flag = exclusive create; concurrent writes from other PIDs surface as EEXIST.
  // Treat EEXIST as "another chat already drafted this stub" — success, no-op.
  try {
    writeFileSync(path, content, { encoding: "utf8", flag: "wx" });
    return true;
  } catch (err) {
    if (err && err.code === "EEXIST") return false; // peer drafted first; not an error
    return false;
  }
}

function draftStub(fingerprint, occurrences) {
  const fp = slug(fingerprint);
  const path = `${LESSONS_DIR}/auto-${fp}.md`;
  if (existsSync(path)) return null;
  const recent = occurrences.slice(-MAX_RECENT_SAMPLES);
  const tools = [...new Set(occurrences.map(o => o.tool).filter(Boolean))];
  const classes = [...new Set(occurrences.map(o => o.error_class).filter(Boolean))];
  const sample = recent[recent.length - 1]?.snippet?.slice(0, SAMPLE_PREVIEW_LEN) || "(no snippet)";
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    "---",
    `title: Repeated error pattern — ${fingerprint}`,
    "category: lessons",
    `last_verified: ${today}`,
    "author: auto-promoted",
    "confidence: 0.5",
    `source: error-pattern-promote.mjs (n=${occurrences.length})`,
    "---",
    "",
    `# Repeated Error Pattern: \`${fingerprint}\``,
    "",
    `**Occurrences (last ${ROLLING_DAYS}d):** ${occurrences.length}`,
    `**Tools:** ${tools.join(", ") || "n/a"}`,
    `**Error classes:** ${classes.join(", ") || "n/a"}`,
    "",
    "## Sample",
    "```",
    sample,
    "```",
    "",
    "## Recent timestamps",
    ...recent.map(o => `- ${o.ts || "?"} · tool=\`${o.tool || "?"}\` · class=\`${o.error_class || "?"}\``),
    "",
    "## TODO — manual triage",
    "- [ ] Identify root cause (Claude side or tool side?)",
    "- [ ] Decide preventive: hook gate, skill rewrite, or doc fix",
    "- [ ] Promote to `patterns/` once fix lands; delete this auto-stub",
    "",
    "_Auto-generated by `error-pattern-promote.mjs`. Threshold: ≥" + THRESHOLD + " hits / " + ROLLING_DAYS + "d._",
    "",
  ].join("\n");
  return atomicWrite(path, lines) ? path : null;
}

function main() {
  drainStdin();
  if (process.env.PRISM_ERROR_PROMOTE === "0") { tele("disabled"); return out({}); }
  // Memo guard: if the ledger is byte-identical to the last run and that run
  // was a no-op, the grouping is provably still a no-op — skip the full
  // read+parse+group. Falls open: missing/corrupt memo, or a missing stat,
  // does the full work (no behavior change).
  const ledgerStat = statLedger();
  const memo = readMemo();
  if (shouldSkipMemo(memo, ledgerStat)) {
    tele("noop_unchanged_ledger", { memoDecision: memo.decision });
    return out({});
  }
  const events = readLedger();
  if (!events.length) { tele("noop_empty_ledger"); writeMemo({ ...ledgerStat, decision: "noop_empty_ledger" }); return out({}); }
  const cutoff = Date.now() - ROLLING_DAYS * SECONDS_PER_DAY * MS_PER_SECOND;
  const recent = events.filter(e => {
    // M1 fix: handle both ISO string and epoch-ms number timestamps.
    const t = typeof e.ts === "number" ? e.ts : Date.parse(e.ts || "");
    return Number.isFinite(t) && t >= cutoff;
  });
  const groups = Object.create(null);
  for (const e of recent) {
    const fp = stableKey(e);
    (groups[fp] ||= []).push(e);
  }
  if (!existsSync(LESSONS_DIR)) { try { mkdirSync(LESSONS_DIR, { recursive: true }); } catch {} }
  const promoted = [];
  let groupsAtThreshold = 0;
  let groupsAlreadyDrafted = 0;
  for (const [fp, occ] of Object.entries(groups)) {
    if (occ.length < THRESHOLD) continue;
    groupsAtThreshold += 1;
    const path = draftStub(fp, occ);
    if (path) promoted.push({ fingerprint: fp, count: occ.length, path });
    else groupsAlreadyDrafted += 1;
  }
  if (promoted.length) {
    tele("drafted", { count: promoted.length, fingerprints: promoted.map(p => p.fingerprint) });
    // decision !startsWith("noop") → next run will NOT skip via the memo
    // guard (correct: a draft round must re-evaluate in case more land).
    writeMemo({ ...ledgerStat, decision: "drafted" });
    out({ systemMessage: `error-pattern-promote: drafted ${promoted.length} lesson stub(s): ${promoted.map(p => p.fingerprint).join(", ")}` });
  } else if (groupsAtThreshold > 0) {
    // All threshold-meeting groups already have a stub — that's the
    // healthy steady state (hook keeps watching, no new patterns yet).
    // Distinct from noop_below_threshold so fleet telemetry doesn't
    // misread the hook as 'not catching errors' when it's actually
    // doing its job.
    tele("noop_all_drafted", { groupsAtThreshold, groupsAlreadyDrafted, recent: recent.length });
    writeMemo({ ...ledgerStat, decision: "noop_all_drafted" });
    out({});
  } else {
    tele("noop_below_threshold", { groups: Object.keys(groups).length, recent: recent.length });
    writeMemo({ ...ledgerStat, decision: "noop_below_threshold" });
    out({});
  }
}

function out(obj) { try { process.stdout.write(JSON.stringify({ continue: true, ...obj })); } catch {} }
try { main(); } catch { out({}); }
