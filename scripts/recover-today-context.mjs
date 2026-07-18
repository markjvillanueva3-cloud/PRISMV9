#!/usr/bin/env node
/**
 * recover-today-context.mjs -- CONTEXT-RECOVERY-MS0 (slot:tango, 2026-06-10)
 *
 * Operator directive: "inject context from all sessions for each chat slot into
 * each individual current chat slot ... they've all compacted multiple times but
 * I think some of them have lost context on some tasks ... just sessions from today."
 *
 * Each active chat slot has (today) ONE main transcript JSONL that has compacted
 * 0..N times IN PLACE -- the live context window rolled up the pre-compaction
 * history, but the JSONL on disk still holds every compaction summary verbatim.
 * Claude Code writes each /compact (or auto-compact) as a `user` record with
 * `isCompactSummary:true` whose content begins "This session is being continued
 * from a previous conversation that ran out of context. ... Summary:". Those
 * summaries ARE the context the window lost. This tool harvests them (plus the
 * operator's verbatim directives + today's commits) into a per-slot recovery
 * file that the slot's chat reads on relaunch (surfaced by the resume-path
 * injector in session-start-auto-resume.mjs).
 *
 * DETERMINISTIC by design -- no LLM. The compaction summaries are already curated
 * prose; paraphrasing them through a model would risk hallucinating recovered
 * context (R12). Verbatim extraction is the honest recovery.
 *
 * Usage:
 *   node scripts/recover-today-context.mjs --all                 # every active slot
 *   node scripts/recover-today-context.mjs --slot alpha          # one slot
 *   node scripts/recover-today-context.mjs --slot alpha --dry    # print, don't write
 *   [--date YYYY-MM-DD]  override "today" (default: local today)
 *   [--out-dir DIR]      default state/shared/context-recovery
 *
 * Output: state/shared/context-recovery/<slot>-TODAY-<date>.md  (markdown -> ASCII-guard exempt)
 */
"use strict";

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import { execFileSync } from "node:child_process";

const PRISM_ROOT = "H:/prism";
const SLOTS_FILE = path.join(PRISM_ROOT, "state/shared/chat-slots.json");
const PROJECTS_DIR = path.join(os.homedir(), ".claude/projects/H--prism");
const DEFAULT_OUT_DIR = path.join(PRISM_ROOT, "state/shared/context-recovery");

// Bounds so a runaway 158MB transcript can't produce a multi-MB recovery file.
const MAX_SUMMARIES = 6;           // most-recent compaction summaries to include (older ones are transitively covered)
const MAX_SUMMARY_BYTES = 8000;    // per included summary; over this we keep head+tail (both Primary Request AND Pending Tasks/Next Step)
const MAX_DIRECTIVES = 50;         // most-recent operator asks
const MAX_DIRECTIVE_LEN = 320;     // chars per directive
const MAX_FILE_BYTES = 150000;     // backstop cap on the emitted recovery file

const SLOT_NAME_RE = /^[a-z][a-z0-9_-]{0,32}$/i;

function parseArgs(argv) {
  const a = { slots: [], all: false, dry: false, date: null, outDir: DEFAULT_OUT_DIR };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--all") a.all = true;
    else if (t === "--dry") a.dry = true;
    else if (t === "--slot" && argv[i + 1]) {
      // Gate argv slots with the SAME SLOT_NAME_RE that activeSlots() applies to
      // chat-slots.json keys. Without this an attacker/typo `--slot ../../x` would
      // reach path.join()'d write + unlinkSync (traversal) and the new RegExp()
      // below (metachar crash). Reject invalid names loudly, never silently write.
      const v = argv[++i].toLowerCase();
      if (SLOT_NAME_RE.test(v)) a.slots.push(v);
      else process.stderr.write(`recover-today-context: ignoring invalid --slot '${v}' (must match ${SLOT_NAME_RE})\n`);
    }
    else if (t === "--date" && argv[i + 1]) a.date = argv[++i];
    else if (t === "--out-dir" && argv[i + 1]) a.outDir = argv[++i];
  }
  return a;
}

/** Local-midnight epoch for the target date (default: today). */
function dayWindow(dateStr) {
  let d;
  if (dateStr) {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error(`--date must be YYYY-MM-DD, got: ${dateStr}`);
    d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  } else {
    const now = new Date();
    d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const start = d.getTime();
  return { start, end: start + 86400000, iso: ymd(d) };
}
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function activeSlots() {
  const data = JSON.parse(fs.readFileSync(SLOTS_FILE, "utf-8"));
  return Object.entries(data.slots || {})
    .filter(([s, v]) => v && v.chatId && SLOT_NAME_RE.test(s))
    .map(([s, v]) => [s, String(v.chatId).replace(/^claude-/, "").toLowerCase()]);
}

/** First ~8KB of a file (cheap slot-attribution scan). */
function head(fp) {
  try {
    const fd = fs.openSync(fp, "r");
    const b = Buffer.alloc(8000);
    const n = fs.readSync(fd, b, 0, 8000, 0);
    fs.closeSync(fd);
    return b.toString("utf8", 0, n);
  } catch { return ""; }
}

/**
 * Resolve every TODAY *.jsonl FILE (never the <uuid>/ sidechain subdirs) that
 * belongs to a slot: (a) basename starts with the slot's current chatId prefix,
 * or (b) the head contains /checkin-<slot> | /startup-<slot> | (slot:<slot>).
 * Newest first.
 */
function todayTranscriptsForSlot(slot, prefix, win) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true }); } catch { return out; }
  // Escape the slot before interpolation -- defense-in-depth even though callers
  // are SLOT_NAME_RE-gated (activeSlots keys + the --slot argv guard), so a stray
  // metachar can never throw a RegExp SyntaxError here.
  const esc = slot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tag = new RegExp(`/(?:checkin|startup)-${esc}\\b|\\(slot:${esc}\\b`);
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith(".jsonl")) continue;
    const fp = path.join(PROJECTS_DIR, ent.name);
    let st;
    try { st = fs.statSync(fp); } catch { continue; }
    if (st.mtimeMs < win.start || st.mtimeMs >= win.end) continue;
    const base = ent.name.slice(0, -6).toLowerCase();
    const byPrefix = prefix && base.startsWith(prefix);
    const byTag = tag.test(head(fp));
    if (byPrefix || byTag) out.push({ fp, name: ent.name, mtimeMs: st.mtimeMs, sizeMb: st.size / 1048576 });
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function cleanDirective(s) {
  if (typeof s !== "string") return null;
  // Prefer the operator's words inside a /command wrapper.
  const argM = s.match(/<command-args>([\s\S]*?)<\/command-args>/);
  if (argM) s = argM[1];
  s = s.replace(/<command-[a-z-]+>[\s\S]*?<\/command-[a-z-]+>/g, " ");
  s = s.replace(/<\/?[a-z-]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (/^\[Request interrupted/i.test(s)) return null;
  if (/^system-reminder/i.test(s)) return null;
  if (/^Caveat:/i.test(s)) return null;
  if (s.length < 3) return null;
  return s.length > MAX_DIRECTIVE_LEN ? s.slice(0, MAX_DIRECTIVE_LEN) + " ..." : s;
}

/** Stream one JSONL, returning { summaries[], directives[], lastTodo, lines }. */
async function mineTranscript(fp) {
  const summaries = [];
  const directives = [];
  let lastTodo = null;
  let lines = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(fp), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    lines++;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== "user" && o.type !== "assistant") continue;
    const content = o.message && o.message.content;
    if (o.type === "user") {
      if (typeof content !== "string") continue; // tool_result arrays -> skip
      if (o.isCompactSummary) {
        // Keep the full body; head+tail elision happens at render so we preserve
        // BOTH the Primary-Request head AND the Pending-Tasks/Next-Step tail.
        summaries.push({ ts: o.timestamp || "", body: content.trim() });
      } else {
        const d = cleanDirective(content);
        if (d) directives.push(d);
      }
    } else if (Array.isArray(content)) {
      for (const b of content) {
        if (b && b.type === "tool_use" && b.name === "TodoWrite" && b.input && Array.isArray(b.input.todos)) {
          lastTodo = b.input.todos;
        }
      }
    }
  }
  return { summaries, directives, lastTodo, lines };
}

/** Today's commit subjects authored by this slot (best-effort, fail-soft). */
function todayCommits(slot, win) {
  try {
    const out = execFileSync("git", [
      "-C", PRISM_ROOT, "log",
      `--since=${win.iso} 00:00:00`,
      "--grep", `(slot:${slot})`,
      "--pretty=format:%h %s",
      "-i",
    ], { encoding: "utf-8", timeout: 20000, maxBuffer: 4 * 1024 * 1024 });
    return out.split(/\r?\n/).filter(Boolean).slice(0, 40);
  } catch { return []; }
}

function dedupeKeepRecent(arr, max) {
  const seen = new Set();
  const out = [];
  for (let i = arr.length - 1; i >= 0 && out.length < max; i--) {
    const k = arr[i].slice(0, 80).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(arr[i]);
  }
  return out; // most-recent first
}

/** Keep a long summary readable while preserving BOTH ends (Primary Request head + Pending-Tasks/Next-Step tail). */
function elideSummary(body) {
  if (Buffer.byteLength(body, "utf8") <= MAX_SUMMARY_BYTES) return body;
  const headN = Math.floor(MAX_SUMMARY_BYTES * 0.6);
  const tailN = MAX_SUMMARY_BYTES - headN;
  const dropped = body.length - headN - tailN;
  return body.slice(0, headN) + `\n\n...[${dropped} chars elided from the middle]...\n\n` + body.slice(body.length - tailN);
}

function renderRecovery(slot, win, sessions, mined, commits) {
  const L = [];
  L.push(`# CONTEXT RECOVERY -- slot \`${slot}\` -- ${win.iso}`);
  L.push("");
  L.push(`> Auto-generated by \`scripts/recover-today-context.mjs\` (CONTEXT-RECOVERY-MS0).`);
  L.push(`> Your live window compacted ${mined.summaries.length} time(s) today and lost the earlier detail.`);
  L.push(`> Everything below is VERBATIM from today's transcript(s) -- read it before continuing so no in-flight task is dropped.`);
  L.push("");
  L.push(`**Source sessions (${sessions.length}):** ` + sessions.map(s => `${s.name.slice(0, 8)} (${s.sizeMb.toFixed(0)}MB)`).join(", "));
  L.push("");

  if (commits.length) {
    L.push(`## Commits shipped today (slot:${slot}) -- ${commits.length}`);
    L.push("");
    for (const c of commits) L.push(`- ${c}`);
    L.push("");
  }

  const dirs = dedupeKeepRecent(mined.directives, MAX_DIRECTIVES);
  if (dirs.length) {
    L.push(`## Operator directives today (verbatim, most-recent first) -- ${dirs.length}`);
    L.push("");
    for (const d of dirs) L.push(`- ${d}`);
    L.push("");
  }

  if (mined.lastTodo && mined.lastTodo.length) {
    L.push(`## Last task list state -- ${mined.lastTodo.length} item(s)`);
    L.push("");
    for (const t of mined.lastTodo) {
      const status = t.status || "?";
      const subj = t.subject || t.content || t.activeForm || JSON.stringify(t).slice(0, 80);
      L.push(`- [${status}] ${subj}`);
    }
    L.push("");
  }

  if (mined.summaries.length) {
    const total = mined.summaries.length;
    const recent = mined.summaries.slice(-MAX_SUMMARIES); // most-recent N, still chronological
    const offset = total - recent.length;
    const note = total > MAX_SUMMARIES
      ? ` (showing the ${MAX_SUMMARIES} most-recent of ${total}; older compactions are transitively covered by these)`
      : "";
    L.push(`## Compaction summaries -- chronological${note}`);
    L.push("");
    L.push(`Verbatim roll-ups your live window dropped. The newest is closest to where you are now; earlier ones hold detail later summaries compressed away.`);
    L.push("");
    recent.forEach((s, i) => {
      L.push(`### Compaction ${offset + i + 1} of ${total}${s.ts ? ` (${s.ts})` : ""}`);
      L.push("");
      L.push(elideSummary(s.body));
      L.push("");
    });
  } else {
    L.push(`## No compaction summaries found`);
    L.push("");
    L.push(`This slot's today-session has not compacted -- its live window still holds the full day. No detail was lost.`);
    L.push("");
  }

  let text = L.join("\n");
  if (Buffer.byteLength(text, "utf8") > MAX_FILE_BYTES) {
    text = text.slice(0, MAX_FILE_BYTES) + "\n\n...[recovery file truncated at cap -- oldest compaction detail dropped]";
  }
  return text;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const win = dayWindow(args.date);
  const active = activeSlots();
  const activeMap = new Map(active);
  let targets;
  if (args.all) targets = active.map(([s]) => s);
  else if (args.slots.length) targets = args.slots;
  else {
    process.stderr.write("recover-today-context: pass --all or --slot <name>\n");
    process.exit(2);
  }

  if (!args.dry) fs.mkdirSync(args.outDir, { recursive: true });

  const report = [];
  for (const slot of targets) {
    const prefix = activeMap.get(slot) || null;
    const sessions = todayTranscriptsForSlot(slot, prefix, win);
    if (!sessions.length) {
      report.push(`${slot}: NO today-session found (skipped, no file written)`);
      continue;
    }
    // Merge all of the slot's today transcripts (usually 1).
    const merged = { summaries: [], directives: [], lastTodo: null, lines: 0 };
    for (const s of sessions.slice().reverse()) { // oldest first -> chronological summaries
      const m = await mineTranscript(s.fp);
      merged.summaries.push(...m.summaries);
      merged.directives.push(...m.directives);
      if (m.lastTodo) merged.lastTodo = m.lastTodo;
      merged.lines += m.lines;
    }
    // No IN-PLACE compaction today -> the live window still holds the full day,
    // nothing was lost -> no recovery needed. Remove any stale file from a prior
    // run so re-runs stay clean, and skip (the resume hook then injects nothing
    // for this slot, which is correct: there is nothing to recover).
    if (!merged.summaries.length) {
      const stale = path.join(args.outDir, `${slot}-TODAY-${win.iso}.md`);
      try { if (!args.dry && fs.existsSync(stale)) fs.unlinkSync(stale); } catch { /* ignore */ }
      report.push(`${slot}: ${sessions.length} session(s), 0 compactions -> nothing lost (no file written)`);
      continue;
    }
    const commits = todayCommits(slot, win);
    const text = renderRecovery(slot, win, sessions, merged, commits);
    const outFile = path.join(args.outDir, `${slot}-TODAY-${win.iso}.md`);
    if (args.dry) {
      process.stdout.write(`\n===== ${slot} (${outFile}) =====\n${text.slice(0, 1400)}\n...[dry: ${Buffer.byteLength(text)}B total]\n`);
    } else {
      fs.writeFileSync(outFile, text, "utf-8");
    }
    report.push(`${slot}: ${sessions.length} session(s), ${merged.summaries.length} compaction summaries, ${dedupeKeepRecent(merged.directives, MAX_DIRECTIVES).length} directives, ${commits.length} commits -> ${Buffer.byteLength(text)}B`);
  }

  process.stdout.write(`\nrecover-today-context (${win.iso}):\n`);
  for (const r of report) process.stdout.write(`  ${r}\n`);
  process.stdout.write(`  out-dir: ${args.outDir}${args.dry ? " (DRY -- nothing written)" : ""}\n`);
}

main().catch((e) => {
  process.stderr.write(`recover-today-context FAILED: ${e && e.stack ? e.stack : e}\n`);
  process.exit(1);
});
