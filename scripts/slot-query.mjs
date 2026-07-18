#!/usr/bin/env node
// scripts/slot-query.mjs — unified slot-keyed lookup, sorted by recency
//
// Answers "pull tasks/sessions for slot <X>" deterministically from 5 sources:
//   1. Current binding         — state/shared/chat-slots.json
//   2. Active claim            — state/shared/slot-task-claims.json
//   3. Per-slot queue          — state/shared/slot-task-queues.json
//   4. Recent handoffs         — state/shared/handoffs/HANDOFF-*-<slot>-*.md (mtime desc)
//   5. Recent commits          — git log --grep=slot:<name> (date desc)
//
// Every section is filtered by exact slot name + sorted by most-recent date.
//
// CLI:
//   node scripts/slot-query.mjs <slot> [--json] [--limit N] [--since 14d]
//                               [--section binding|claim|queue|handoffs|commits|all]
//
// Exit codes: 0 ok / 2 usage / 3 io-error

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT          = "H:/prism";
const SLOTS_FILE    = `${ROOT}/state/shared/chat-slots.json`;
const CLAIMS_FILE   = `${ROOT}/state/shared/slot-task-claims.json`;
const QUEUE_FILE    = `${ROOT}/state/shared/slot-task-queues.json`;
const HANDOFFS_DIR  = `${ROOT}/state/shared/handoffs`;

const GIT_LOG_TIMEOUT_MS = 30_000;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 100;
const DEFAULT_SINCE = "14d";
const SUBJECT_MAX_CHARS = 80;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const HOURS_BEFORE_DAYS = 48;
const MS_PER_MINUTE = 60_000;

const VALID_SLOTS = new Set([
  "alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india",
  "juliett","kilo","lima","mike","november","oscar","papa","quebec","romeo",
  "sierra","tango","uniform","victor","whiskey","xray","yankee","zulu",
]);

export function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

// ── pure helpers (exported for test) ────────────────────────────────────────

export function bindingForSlot(slotsJson, slot) {
  if (!slotsJson || !slotsJson.slots) return null;
  const entry = slotsJson.slots[slot];
  if (!entry || typeof entry !== "object") return null;
  return {
    chatId: entry.chatId || null,
    status: entry.status || null,
    topic: entry.topic || null,
    activity: entry.activity || null,
    branch: entry.branch || null,
    pid: entry.pid || null,
    host: entry.host || null,
    claimedAt: entry.claimedAt || null,
    lastHeartbeat: entry.lastHeartbeat || null,
    terminalWindowId: entry.terminalWindowId || null,
  };
}

export function claimsForSlot(claimsJson, slot) {
  if (!claimsJson) return [];
  const list = Array.isArray(claimsJson.claims)
    ? claimsJson.claims
    : Object.values(claimsJson.claims || {});
  return list
    .filter(c => c && c.slot === slot)
    .sort((a, b) => Date.parse(b.claimedAt || b.startedAt || 0)
                  - Date.parse(a.claimedAt || a.startedAt || 0));
}

export function queueForSlot(queueJson, slot) {
  if (!queueJson || !queueJson.queues) return [];
  return Array.isArray(queueJson.queues[slot]) ? queueJson.queues[slot] : [];
}

// Filename forms: HANDOFF-claude-<id>-<slot>-<topic>.md  OR  HANDOFF-<slot>-<task>.md (golf).
// Both contain literal "-<slot>-". Robust against archive suffixes (.archive.YYYY-MM-DD).
export function handoffMatchesSlot(filename, slot) {
  if (typeof filename !== "string" || !filename.startsWith("HANDOFF-")) return false;
  return filename.includes(`-${slot}-`);
}

export function listHandoffs(dir, slot, limit, statImpl, readdirImpl) {
  const _readdir = readdirImpl || (d => fs.readdirSync(d));
  const _stat = statImpl || (p => fs.statSync(p));
  let names;
  try { names = _readdir(dir); }
  catch { return []; }
  const matched = [];
  for (const name of names) {
    if (!handoffMatchesSlot(name, slot)) continue;
    let mtimeMs;
    try { mtimeMs = _stat(`${dir}/${name}`).mtimeMs; }
    catch { continue; }
    matched.push({ name, mtimeMs, mtime: new Date(mtimeMs).toISOString() });
  }
  matched.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return matched.slice(0, limit);
}

// Parse "14d" / "30d" / "7d" / "2026-05-01" relative-or-absolute since spec.
export function normalizeSince(spec) {
  if (!spec || typeof spec !== "string") return "14 days ago";
  const m = spec.trim().match(/^(\d+)d$/i);
  if (m) return `${m[1]} days ago`;
  return spec; // pass through ISO-date / git relative
}

function gitLogSlotCommits(slot, sinceSpec, limit) {
  try {
    const out = execFileSync(
      "git",
      ["-C", ROOT, "log",
        `--grep=slot:${slot}`,
        `--since=${sinceSpec}`,
        `-n`, String(limit),
        `--pretty=%H%x09%ad%x09%s`,
        `--date=iso-strict`],
      { encoding: "utf8", timeout: GIT_LOG_TIMEOUT_MS }
    );
    return out
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(line => {
        const [sha, date, ...subj] = line.split("\t");
        return { sha: sha.slice(0, 10), date, subject: subj.join("\t") };
      });
  } catch {
    return [];
  }
}

// ── orchestrator (pure, injected I/O) ──────────────────────────────────────

export function buildReport(slot, opts = {}) {
  const rawLimit = (typeof opts.limit === "number" && Number.isFinite(opts.limit)) ? opts.limit : DEFAULT_LIMIT;
  const limit = Math.max(1, Math.min(MAX_LIMIT, rawLimit));
  const since = normalizeSince(opts.since || DEFAULT_SINCE);
  const sections = new Set(opts.sections || ["binding","claim","queue","handoffs","commits"]);

  const slotsJson  = sections.has("binding") ? readJsonSafe(SLOTS_FILE)  : null;
  const claimsJson = sections.has("claim")   ? readJsonSafe(CLAIMS_FILE) : null;
  const queueJson  = sections.has("queue")   ? readJsonSafe(QUEUE_FILE)  : null;

  const report = { ok: true, slot, sinceSpec: since, limit };

  if (sections.has("binding")) {
    report.binding = bindingForSlot(slotsJson, slot);
  }
  if (sections.has("claim")) {
    report.claims = claimsForSlot(claimsJson, slot).slice(0, limit);
  }
  if (sections.has("queue")) {
    const all = queueForSlot(queueJson, slot);
    report.queueTotal = all.length;
    report.queueEligible = all.filter(e => {
      const s = (e.status || "").toLowerCase();
      return s !== "shipped" && s !== "completed" && s !== "done" && !e.completed_at;
    }).slice(0, limit);
  }
  if (sections.has("handoffs")) {
    report.handoffs = listHandoffs(HANDOFFS_DIR, slot, limit);
  }
  if (sections.has("commits")) {
    report.commits = gitLogSlotCommits(slot, since, limit);
  }
  return report;
}

// ── renderer ────────────────────────────────────────────────────────────────

function fmtAge(iso) {
  if (!iso) return "—";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return iso;
  const m = Math.floor(ms / MS_PER_MINUTE);
  if (m < MINUTES_PER_HOUR) return `${m}m ago`;
  const h = Math.floor(m / MINUTES_PER_HOUR);
  if (h < HOURS_BEFORE_DAYS) return `${h}h ago`;
  return `${Math.floor(h / HOURS_PER_DAY)}d ago`;
}

function renderText(r) {
  const lines = [];
  lines.push(`slot=${r.slot}  since=${r.sinceSpec}  limit=${r.limit}`);
  lines.push("");
  if (r.binding !== undefined) {
    lines.push("── binding ─────────────────────────────");
    if (!r.binding) lines.push("  (no slot binding found)");
    else {
      lines.push(`  chatId:   ${r.binding.chatId}`);
      lines.push(`  status:   ${r.binding.status}  (heartbeat ${fmtAge(r.binding.lastHeartbeat)})`);
      lines.push(`  topic:    ${r.binding.topic || "—"}`);
      lines.push(`  branch:   ${r.binding.branch || "—"}`);
      lines.push(`  activity: ${r.binding.activity || "—"}`);
    }
    lines.push("");
  }
  if (r.claims !== undefined) {
    lines.push(`── active claims (${r.claims.length}) ───────────────────`);
    if (!r.claims.length) lines.push("  (none)");
    else for (const c of r.claims) {
      lines.push(`  ${c.unitId || c.unit_id || c.unit || "?"}  [${c.phase || c.status || "?"}]  ${fmtAge(c.claimedAt || c.startedAt)}`);
    }
    lines.push("");
  }
  if (r.queueEligible !== undefined) {
    lines.push(`── queue (eligible ${r.queueEligible.length} / total ${r.queueTotal}) ───`);
    if (!r.queueEligible.length) lines.push("  (queue empty or all shipped/blocked)");
    else for (const e of r.queueEligible) {
      lines.push(`  ${(e.unit_id || "?").padEnd(40)} [${e.wave || "?"} ${e.cost || "?"}]`);
    }
    lines.push("");
  }
  if (r.handoffs !== undefined) {
    lines.push(`── recent handoffs (${r.handoffs.length}) ─────────────────`);
    if (!r.handoffs.length) lines.push("  (none)");
    else for (const h of r.handoffs) {
      lines.push(`  ${fmtAge(h.mtime).padEnd(10)}  ${h.name}`);
    }
    lines.push("");
  }
  if (r.commits !== undefined) {
    lines.push(`── recent commits (${r.commits.length}) ──────────────────`);
    if (!r.commits.length) lines.push("  (none in window)");
    else for (const c of r.commits) {
      lines.push(`  ${c.sha}  ${fmtAge(c.date).padEnd(10)}  ${c.subject.slice(0, SUBJECT_MAX_CHARS)}`);
    }
  }
  return lines.join("\n");
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const a = argv.slice(2);
  const flags = new Set();
  const kv = {};
  const positional = [];
  for (let i = 0; i < a.length; i++) {
    const t = a[i];
    if (t === "--json") flags.add("json");
    else if (t === "--limit")   { kv.limit = parseInt(a[++i], 10); }
    else if (t === "--since")   { kv.since = a[++i]; }
    else if (t === "--section") { kv.section = a[++i]; }
    else if (t.startsWith("--")) {
      console.error(`unknown flag: ${t}`);
      process.exit(2);
    }
    else positional.push(t);
  }
  return { positional, flags, kv };
}

const isMain = (() => {
  try {
    return process.argv[1]
      && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url));
  } catch { return false; }
})();

if (isMain) {
  const { positional, flags, kv } = parseArgs(process.argv);
  const slot = (positional[0] || "").toLowerCase().trim();
  if (!slot) {
    console.error("Usage: slot-query.mjs <slot> [--json] [--limit N] [--since 14d] [--section binding|claim|queue|handoffs|commits|all]");
    process.exit(2);
  }
  if (!VALID_SLOTS.has(slot)) {
    console.error(`unknown slot '${slot}'. Valid: ${Array.from(VALID_SLOTS).join(", ")}`);
    process.exit(2);
  }
  const sections = (kv.section && kv.section !== "all")
    ? [kv.section]
    : ["binding","claim","queue","handoffs","commits"];
  for (const s of sections) {
    if (!["binding","claim","queue","handoffs","commits"].includes(s)) {
      console.error(`unknown section '${s}'`);
      process.exit(2);
    }
  }
  const report = buildReport(slot, { limit: kv.limit, since: kv.since, sections });
  if (flags.has("json")) console.log(JSON.stringify(report, null, 2));
  else console.log(renderText(report));
  process.exit(0);
}
