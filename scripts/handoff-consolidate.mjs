#!/usr/bin/env node
/**
 * handoff-consolidate.mjs — per-slot open-threads merger.
 *
 * OBSIDIAN-BRAIN-FIX-MS0/U-OBF01 (2026-05-17, slot bravo claude-339c8ff7).
 *
 * Problem (proven live this session): per-agent handoffs are REPLACE-not-merge.
 * Each /compact writes a fresh HANDOFF-<base>-<slot>-<topic>.md carrying only
 * THIS session's `## RESUME`. The resume-read path (session-start-auto-resume →
 * per-agent-handoff read) resolves the NEWEST file for the instance. So when
 * session N+1 works a different topic, session N's still-unfinished RESUME is
 * never read again — it is orphaned by topic-drift. Confirmed: the entire
 * HTML-COMPANION → HTML-PRIMARY → MEMORY-SLOT-VIEW queue sat unread in
 * HANDOFF-claude-339c8ff7-bravo-html-stack.md for days because three later
 * sessions compacted under other topics and none re-stated it.
 *
 * Fix: maintain a per-SLOT consolidated file that ACCUMULATES every still-open
 * RESUME across all topic-drifted handoffs for that slot. The resume-read path
 * (U-OBF02) reads it IN ADDITION to the latest handoff, so unfinished work is
 * never silently dropped just because the next session's topic differed.
 *
 * Reconciliation (P1-4 folded in): a RESUME is removed from the consolidated
 * set ONLY when its work is POSITIVELY confirmed shipped — a unit id it names
 * appears in a git commit subject. Empty unit ids, no git, or any uncertainty
 * → KEEP. This is fail-PRESERVE (per [[reference_d3_conflict_resolution_2026_05_16]]
 * "fail-PRESERVE not fail-throw"): the cost of keeping a shipped thread one
 * cycle longer is a stale bullet; the cost of dropping an unshipped thread is
 * exactly the orphaning bug we are fixing. Asymmetric → never drop on doubt.
 *
 * Pure-core (no fs/process — unit-testable):
 *   extractResume(md) · isPlaceholderResume(s) · slotOfHandoffFilename(name)
 *   normalizeForDedup(s) · unitIdsInResume(s) · decideShipped(args)
 *   consolidate(args)
 * FS/CLI layer:
 *   readHandoffDir(dir) · loadGitSubjects(limit) · writeConsolidated(...) · main()
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const PRISM_ROOT = (process.env.PRISM_ROOT || "H:/prism").replace(/[/\\]+$/, "");
const HANDOFFS_DIR = `${PRISM_ROOT}/state/shared/handoffs`;
// Reviewer-B P1: the consolidated file MUST live OUTSIDE the HANDOFF-* glob
// namespace, or per-agent-handoff.mjs's mtime-sort fallbacks (slot-golf-newest,
// same-instance-newest, family-latest, global-latest — none of which exclude
// -CONSOLIDATED) will select it as the freshest handoff, find no `## RESUME`
// in its OPEN-THREAD body, and resume blind. Dedicated subdir = no collision.
const CONSOLIDATED_DIR = `${HANDOFFS_DIR}/consolidated`;

// Matches session-start-auto-resume.mjs MIN_RESUME_BODY_LEN semantics (8).
const MIN_RESUME_BODY_LEN = 8;
// Cap a single RESUME so a pathological handoff can't blow the consolidated file.
const MAX_RESUME_CHARS = 4000;
// Reviewer P2: bound consolidated growth — keep newest N open threads per slot,
// elide the rest with an explicit marker (never silently lose the count).
const MAX_OPEN_THREADS_PER_SLOT = 40;
// NATO work slots + golf hygiene. Read from chat-slots if available, else literal.
let SLOT_SET;
try {
  const m = await import("../.claude/helpers/chat-slots.mjs");
  SLOT_SET = new Set((m.SLOT_NAMES || []).map((s) => s.toLowerCase()));
} catch { /* fall through */ }
if (!SLOT_SET || SLOT_SET.size === 0) {
  SLOT_SET = new Set(["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett", "kilo", "lima", "mike"]);
}

const PLACEHOLDER_RX = [
  /^pre-?compact snapshot/i,
  /^\(?\s*no output\s*\)?$/i,
  /^continue working\b/i,
  /^resume\b\s*$/i,
  /^compacting\b/i,
  /^read (the )?per-agent handoff/i,
  /^n\/?a$/i,
  /^tbd$/i,
];

/** Extract the `## RESUME` body (up to the next `## ` heading or EOF). */
export function extractResume(md) {
  if (typeof md !== "string" || md.length === 0) return null;
  // Accept "## RESUME", "## RESUME_LOOP", and the precompact "**Resume directive:**"
  // shape. NB: JS regex has no \Z — use bare `$` WITHOUT /m so it anchors to
  // end-of-string (with /m it would wrongly stop at the first line end).
  // Reviewer-A P1: `\b` after RESUME fails on `## RESUME_LOOP` (`_` is a word
  // char) — that heading is what stop-force-loop-continue writes, so loop
  // RESUMEs were silently never consolidated. `RESUME[A-Z_]*\b` catches
  // RESUME, RESUME_LOOP, etc.
  const headRx = /(?:^|\n)##\s+RESUME[A-Z_]*\b[^\n]*\n([\s\S]*?)(?=\n##\s|$)/;
  let m = md.match(headRx);
  let body = m ? m[1] : null;
  if (body == null) {
    // Reviewer-B P2: also terminate on `\n<!--` so the 4096-byte HTML-comment
    // pad precompact-handoff appends can't bleed into the captured body.
    const alt = md.match(/\*\*Resume directive:\*\*\s*\n+([\s\S]*?)(?=\n##\s|\n\*\*[A-Z]|\n<!--|$)/);
    body = alt ? alt[1] : null;
  }
  if (body == null) return null;
  body = body.replace(/\r/g, "").trim();
  if (body.length > MAX_RESUME_CHARS) body = body.slice(0, MAX_RESUME_CHARS) + " …[truncated]";
  if (body.length < MIN_RESUME_BODY_LEN) return null;
  return body;
}

export function isPlaceholderResume(text) {
  if (typeof text !== "string") return true;
  const t = text.trim();
  if (t.length < MIN_RESUME_BODY_LEN) return true;
  return PLACEHOLDER_RX.some((rx) => rx.test(t));
}

/**
 * HANDOFF-<base>-<slot>-<topic>.md   → slot
 * HANDOFF-golf-<topic>.md            → "golf"
 * Returns null if no NATO slot token is present (never guess).
 */
export function slotOfHandoffFilename(name) {
  if (typeof name !== "string") return null;
  if (!/^HANDOFF-.+\.md$/.test(name)) return null;
  if (/-CONSOLIDATED\.md$/i.test(name)) return null; // never re-ingest our own output
  let stem = name.replace(/^HANDOFF-/, "").replace(/\.md$/, "");
  // golf is slot-keyed: HANDOFF-golf-<topic>.md
  if (/^golf(?:-|$)/i.test(stem)) return "golf";
  // Reviewer-A P1: parse the CANONICAL position, not "first NATO-looking
  // token" (a topic legitimately containing a NATO word, e.g.
  // `-alpha-release`, otherwise mis-routes the thread to the wrong slot —
  // itself an orphaning bug). Canonical: HANDOFF-[Claude-]claude-<id>-<slot>-<topic>.
  // slot = the dash-segment immediately after the chat id. Anything that
  // doesn't structurally match → null (skip, fail-SAFE — never mis-route).
  // Case-SENSITIVE: the double-prefix is literally `Claude-claude-` (capital
  // then lowercase). A case-insensitive strip would also eat the canonical
  // lowercase `claude-` and break every standard handoff.
  stem = stem.replace(/^Claude-/, "");
  const parts = stem.split("-");
  if (parts.length >= 3 && /^claude$/i.test(parts[0])) {
    const cand = (parts[2] || "").toLowerCase();
    if (SLOT_SET.has(cand)) return cand;
  }
  return null;
}

export function normalizeForDedup(text) {
  return String(text == null ? "" : text).toLowerCase().replace(/\s+/g, " ").trim();
}

/** Pull unit / scope tokens a RESUME claims it shipped or is working. */
export function unitIdsInResume(text) {
  if (typeof text !== "string") return [];
  const ids = new Set();
  for (const m of text.matchAll(/\bU-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g)) ids.add(m[0]);
  for (const m of text.matchAll(/\b[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)*-MS\d+\b/g)) ids.add(m[0]);
  return [...ids];
}

/**
 * POSITIVE-only shipped decision. shipped=true iff at least one named unit id
 * appears verbatim in a git commit subject. No ids OR no git subjects OR no
 * match → shipped=false (KEEP — fail-PRESERVE).
 */
export function decideShipped({ unitIds, gitSubjects }) {
  const ids = Array.isArray(unitIds) ? unitIds : [];
  const subs = Array.isArray(gitSubjects) ? gitSubjects : [];
  if (ids.length === 0 || subs.length === 0) return { shipped: false, matchedBy: null };
  for (const id of ids) {
    // Reviewer-A P0: a bare substring test drops UNSHIPPED threads via prefix
    // collision — `U-OBF01` would be "matched" by a commit naming `U-OBF010`
    // or `U-OBF01-FIXUP`, and PRISM ships U-X then U-X2/U-X-FIXUP/...-MS1
    // follow-ups constantly. That inverts fail-PRESERVE (the whole point of
    // this unit). Require a token boundary: id chars are [A-Za-z0-9-], so the
    // match must not be flanked by another id char.
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`(?:^|[^A-Za-z0-9-])${esc}(?![A-Za-z0-9-])`);
    for (const s of subs) {
      if (typeof s === "string" && rx.test(s)) return { shipped: true, matchedBy: id };
    }
  }
  return { shipped: false, matchedBy: null };
}

/**
 * Pure aggregator. handoffs: [{file, slot, mtimeMs, content}]. Groups by slot,
 * extracts non-placeholder RESUMEs, drops POSITIVE-shipped ones, dedups by
 * normalized text (newest wins), returns newest-first per slot.
 */
export function consolidate({ handoffs, gitSubjects, now }) {
  const nowMs = typeof now === "number" ? now : Date.now();
  const bySlot = {};
  const ordered = [...(handoffs || [])].sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0));
  for (const h of ordered) {
    const slot = h.slot;
    if (!slot || !SLOT_SET.has(slot)) continue;
    const resume = extractResume(h.content);
    if (!resume || isPlaceholderResume(resume)) continue;
    const unitIds = unitIdsInResume(resume);
    const { shipped, matchedBy } = decideShipped({ unitIds, gitSubjects });
    if (shipped) continue; // POSITIVELY shipped → safe to drop
    if (!bySlot[slot]) bySlot[slot] = { entries: [], seen: new Set() };
    // Reviewer P2: dedup on the FULL normalized text — a 400-char-prefix key
    // is fail-DROP (two genuinely-distinct threads that share the first 400
    // chars would collide and one is lost; this module must be fail-PRESERVE
    // everywhere). Full-string Set key is O(1) and exact.
    const key = normalizeForDedup(resume);
    if (bySlot[slot].seen.has(key)) continue; // exact dup, newest already kept
    bySlot[slot].seen.add(key);
    bySlot[slot].entries.push({
      resume,
      file: h.file,
      ageMs: Math.max(0, nowMs - (h.mtimeMs || nowMs)),
      unitIds,
      keptBecause: unitIds.length === 0 ? "no-unit-id (cannot confirm shipped)" : "no git ship match",
      shippedCheck: matchedBy,
    });
  }
  // Reviewer P2: bound per-slot growth. entries[] is already newest-first
  // (ordered was mtime-desc); keep the newest MAX, record how many were
  // elided so the renderer can state it explicitly (never silently lose
  // the count — R12).
  const slots = {};
  const elided = {};
  for (const [s, v] of Object.entries(bySlot)) {
    if (v.entries.length > MAX_OPEN_THREADS_PER_SLOT) {
      elided[s] = v.entries.length - MAX_OPEN_THREADS_PER_SLOT;
      slots[s] = v.entries.slice(0, MAX_OPEN_THREADS_PER_SLOT);
    } else {
      elided[s] = 0;
      slots[s] = v.entries;
    }
  }
  return { slots, elided, generatedAt: new Date(nowMs).toISOString() };
}

// ───────────────────────────── FS / CLI layer ─────────────────────────────

export function readHandoffDir(dir = HANDOFFS_DIR, onlySlot = null) {
  if (!existsSync(dir)) return [];
  const want = onlySlot ? String(onlySlot).toLowerCase() : null;
  const out = [];
  for (const name of readdirSync(dir)) {
    const slot = slotOfHandoffFilename(name);
    if (!slot) continue;
    // Reviewer-B P1: when caller scopes to one slot, reject other slots by
    // FILENAME before the readFileSync — the read-path (session-start) call
    // is per-slot, so scanning+reading all ~300 files was the false-"cheap".
    if (want && slot !== want) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (!st.isFile()) continue;
    let content;
    try { content = readFileSync(full, "utf-8"); } catch { continue; }
    out.push({ file: name, slot, mtimeMs: st.mtimeMs, content });
  }
  return out;
}

export function loadGitSubjects(limit = 400) {
  try {
    const raw = execFileSync("git", ["-C", PRISM_ROOT, "log", "--format=%s", `-${limit}`], {
      encoding: "utf-8", timeout: 20000, stdio: ["ignore", "pipe", "ignore"],
    });
    return raw.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    // git unavailable → return [] → decideShipped keeps everything (fail-PRESERVE)
    return [];
  }
}

function renderConsolidated(slot, entries, generatedAt, elidedCount = 0) {
  const lines = [
    "---",
    `slot: ${slot}`,
    `kind: consolidated-handoff`,
    `generatedAt: ${generatedAt}`,
    `openThreads: ${entries.length}`,
    `elidedOlderThreads: ${elidedCount}`,
    "---",
    "",
    `# Consolidated open threads — slot ${slot}`,
    "",
    "> Auto-generated by `scripts/handoff-consolidate.mjs` (OBSIDIAN-BRAIN-FIX-MS0/U-OBF01).",
    "> Every RESUME below is from a topic-drifted handoff whose work is NOT git-confirmed-shipped.",
    "> The resume-read path reads this IN ADDITION to the latest handoff so cross-topic work is never orphaned.",
    "",
  ];
  if (entries.length === 0) {
    lines.push("_No open cross-topic threads — all prior RESUMEs are git-confirmed-shipped or placeholders._");
  }
  if (elidedCount > 0) {
    lines.push(`_+${elidedCount} older open thread(s) elided (cap ${MAX_OPEN_THREADS_PER_SLOT}); see source handoffs in state/shared/handoffs/._`);
    lines.push("");
  }
  entries.forEach((e, i) => {
    const ageH = (e.ageMs / 3600000).toFixed(1);
    lines.push(`## OPEN THREAD ${i + 1} — ${e.file} (${ageH}h old)`);
    lines.push(`_units: ${e.unitIds.length ? e.unitIds.join(", ") : "(none named)"} · kept: ${e.keptBecause}_`);
    lines.push("");
    lines.push(e.resume);
    lines.push("");
  });
  return lines.join("\n");
}

/**
 * Atomic write. Fail-soft: if the target is peer-locked / unwritable we DO NOT
 * throw and DO NOT clobber — we report ok:false so the caller logs and moves on.
 */
// HIGHVALUE-DISCOVERY #11b (2026-06-09, slot:alpha): the atomic write below
// unlinks its tmp on a CAUGHT failure, but a process KILLED between writeFileSync
// and renameSync (fleet-reaper / OOM under load on a long consolidate run) leaves
// the tmp behind — the catch never runs. 6 such orphans (0–29KB, 5–19d old) were
// found 2026-06-09. Sweep any "<slot>.md.tmp-<pid>-<ts>" older than the threshold
// so they self-clean on the next consolidate. The threshold is far beyond any
// in-flight write (<1s), so a concurrent peer's live tmp is never touched.
const STALE_TMP_MS = Number(process.env.PRISM_CONSOLIDATE_STALE_TMP_MS) || 60 * 60 * 1000; // 1h
export function sweepStaleTmpOrphans(dir, maxAgeMs = STALE_TMP_MS) {
  let removed = 0;
  let files;
  try { files = readdirSync(dir); } catch { return 0; }
  const now = Date.now();
  for (const f of files) {
    if (!/\.md\.tmp-\d+-\d+$/.test(f)) continue; // only our atomic-write temps
    const p = join(dir, f);
    try {
      // Clamp age at 0: statSync().mtimeMs carries sub-ms FRACTION while
      // Date.now() is integer ms, so a just-written file can read mtimeMs >
      // now → a raw `now - mtimeMs` goes slightly NEGATIVE and a maxAge=0
      // sweep would wrongly skip it. A file cannot have negative age; clamp.
      const ageMs = Math.max(0, now - statSync(p).mtimeMs);
      if (ageMs >= maxAgeMs) { unlinkSync(p); removed++; }
    } catch { /* best-effort — a peer may have just renamed it away */ }
  }
  return removed;
}

export function writeConsolidated(slot, entries, opts = {}) {
  // Reviewer-B P1: write OUTSIDE the HANDOFF-* glob namespace so no mtime-sort
  // fallback in per-agent-handoff.mjs can ever select this as a "handoff".
  // Filename has no HANDOFF- prefix at all → structurally unselectable.
  const dir = opts.dir || CONSOLIDATED_DIR;
  const generatedAt = opts.generatedAt || new Date().toISOString();
  const elidedCount = opts.elidedCount || 0;
  const file = join(dir, `${slot}.md`);
  let tmp = null;
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    sweepStaleTmpOrphans(dir); // #11b: self-clean killed-mid-write tmp orphans
    const payload = renderConsolidated(slot, entries, generatedAt, elidedCount);
    tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, payload, "utf-8");
    renameSync(tmp, file);
    return { ok: true, file, openThreads: entries.length };
  } catch (err) {
    // Reviewer-A P1: don't leak the tmp on the rename-failure (peer-lock /
    // EPERM / EBUSY) path — one orphan per failed run otherwise.
    if (tmp) { try { unlinkSync(tmp); } catch { /* best-effort */ } }
    return { ok: false, file, error: String((err && err.message) || err) };
  }
}

function main() {
  const args = process.argv.slice(2);
  const onlySlot = (() => {
    const i = args.indexOf("--slot");
    return i >= 0 && args[i + 1] ? args[i + 1].toLowerCase() : null;
  })();
  const dryRun = args.includes("--dry-run");
  const asJson = args.includes("--json");

  // Reviewer-B P1: scope the expensive dir-scan to the requested slot, and
  // skip the git-log subprocess entirely when that slot has no handoffs —
  // makes the session-start fresh-on-read call genuinely cheap (not the
  // full-fleet scan + git log -400 the old comment falsely claimed).
  const handoffs = readHandoffDir(HANDOFFS_DIR, onlySlot);
  const gitSubjects = handoffs.length > 0 ? loadGitSubjects() : [];
  const { slots, elided, generatedAt } = consolidate({ handoffs, gitSubjects, now: Date.now() });

  const results = [];
  const targetSlots = onlySlot ? [onlySlot] : Object.keys(slots);
  for (const slot of targetSlots) {
    const entries = slots[slot] || [];
    if (dryRun) {
      results.push({ slot, openThreads: entries.length, elided: (elided && elided[slot]) || 0, dryRun: true });
      continue;
    }
    const r = writeConsolidated(slot, entries, { generatedAt, elidedCount: (elided && elided[slot]) || 0 });
    if (!r.ok) process.stderr.write(`[handoff-consolidate] write failed slot=${slot}: ${r.error}\n`);
    results.push({ slot, ...r });
  }

  if (asJson) {
    process.stdout.write(JSON.stringify({ generatedAt, scanned: handoffs.length, gitSubjects: gitSubjects.length, results }, null, 2));
  } else {
    process.stdout.write(
      `handoff-consolidate: scanned ${handoffs.length} handoffs, ${gitSubjects.length} git subjects\n` +
      results.map((r) => `  ${r.slot}: ${r.openThreads ?? "?"} open thread(s)${r.dryRun ? " (dry-run)" : r.ok ? " → " + r.file : " FAILED"}`).join("\n") + "\n"
    );
  }
}

const isMain = (() => {
  try { return process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("handoff-consolidate.mjs"); }
  catch { return false; }
})();
if (isMain || (process.argv[1] && process.argv[1].endsWith("handoff-consolidate.mjs"))) main();
