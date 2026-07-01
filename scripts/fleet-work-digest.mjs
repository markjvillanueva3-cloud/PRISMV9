#!/usr/bin/env node
/**
 * fleet-work-digest.mjs -- one COMPACT cross-fleet "what every chat built / shipped /
 * is working on now" digest, so any chat slot can know the whole fleet's state from
 * ~35 lines instead of reading 26 x ~215-line consolidated handoffs (the token blowup).
 *
 * THE GAP (operator, 2026-06-15): PRISM already has fleet-status.mjs (live activity/topic
 * per slot), per-slot consolidated handoffs (215 lines each), and the galaxy MASTER-DIGEST
 * (per-DOMAIN, not per-chat-current-work). What was missing: a single token-cheap digest
 * combining, per slot -- WORKING ON NOW (chat-slots topic/activity) + BUILT/SHIPPED recently
 * (commit subjects on the slot's branch, already shaped `[SCOPE]/U-ID: title`). This script
 * is that aggregator. It is the "aggregate-once" half of aggregate-once -> inject-compact
 * (fleet-work-digest-inject.mjs) -> drill-down-on-demand (slot-query.mjs <slot>).
 *
 * Token math: this digest is ~35 lines (~800 tokens) injected at SessionStart + on keyword,
 * vs 26 x 215-line handoffs (~150k tokens). Regeneration is amortized to a throttled detached
 * Stop hook (fleet-work-digest-stop.mjs) -- NOT done per-turn by each chat.
 *
 * Usage:
 *   node scripts/fleet-work-digest.mjs build     # write state/shared/FLEET-WORK-DIGEST.md
 *   node scripts/fleet-work-digest.mjs print     # build + print to stdout (no write)
 *   node scripts/fleet-work-digest.mjs --json     # summary JSON {path,bytes,activeCount,idleCount} (no write)
 * Knobs:
 *   PRISM_FLEET_WORK_DIGEST_DISABLE=1   -> build is a silent no-op (returns null)
 *   PRISM_FLEET_WORK_DIGEST_WINDOW_H=N  -> "shipped" lookback window in hours (default 24)
 *   PRISM_FLEET_WORK_DIGEST_MAXUNITS=N  -> max unit-ids listed per slot line (default 4)
 *
 * Exit: 0 success / 1 read failure. Pure helpers are exported for node:test
 * (scripts/fleet-work-digest.test.mjs -- run with `node --test`, not vitest).
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync, mkdirSync, renameSync } from "node:fs";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const HELPER_PATH = resolve(REPO_ROOT, ".claude", "helpers", "chat-slots.mjs");
const OUT_FILE = resolve(REPO_ROOT, "state", "shared", "FLEET-WORK-DIGEST.md");

const DEFAULT_WINDOW_H = 24;
const DEFAULT_MAX_UNITS = 4;
// A slot line never exceeds this many chars (keeps the digest compact + predictable).
const MAX_LINE = 118;
// Per-field truncation budgets (sum stays within MAX_LINE for the live fleet).
const NOW_W = 34;   // "now: <topic/activity>"
const LAST_W = 40;  // "last: <commit subject>"

// ---- pure helpers (no IO -- vitest exercises these directly) -------------------------------

/**
 * Extract the U-ID from a `[SCOPE]/U-ID: title` (or `[MAIN] [SCOPE]/U-ID: title`) commit
 * subject. Returns the unit id (e.g. "U-PSA01") or null when the subject isn't unit-shaped.
 * PRISM commit convention -- see CLAUDE.md "Commit format: [SCOPE]/U-ID: title".
 */
export function parseUnitId(subject) {
  if (typeof subject !== "string") return null;
  // Allow an optional leading [MAIN]/[MAIN-FORCE] tag, then [SCOPE]/U-ID.
  const m = subject.match(/\/(U-[A-Z0-9][A-Z0-9-]*)\s*:/i);
  return m ? m[1].toUpperCase() : null;
}

/** Truncate to width with a trailing ellipsis marker (ASCII "~" to stay codepage-safe). */
export function trunc(s, w) {
  s = String(s ?? "");
  return s.length <= w ? s : s.slice(0, Math.max(1, w - 1)) + "~";
}

/**
 * Classify a slot as ACTIVE (worth a dedicated digest line) vs idle.
 * Active = currently alive/stale (a live or recently-live chat) OR it shipped >=1 unit
 * within the window (so a slot that just finished + went idle still shows its fresh work).
 */
export function isActiveSlot(s) {
  if (!s || typeof s !== "object") return false;
  const liveish = s.status === "alive" || s.status === "stale";
  const shipped = Array.isArray(s.shippedUnits) && s.shippedUnits.length > 0;
  return Boolean(liveish || shipped);
}

/** Short status token for the digest. */
function statusToken(status) {
  switch (status) {
    case "alive": return "LIVE";
    case "stale": return "stale";
    case "crashed": return "CRASH";
    default: return "idle";
  }
}

/**
 * Render ONE compact slot line. Pure. Shape:
 *   ALPHA   [LIVE] now: <topic/activity> | shipped 3/24h: U-A,U-B,U-C | last: <subject>
 * Fields collapse gracefully when empty (no "now:" if idle, no "shipped" if none).
 */
export function buildSlotLine(s, opts = {}) {
  const maxUnits = Number.isFinite(opts.maxUnits) ? opts.maxUnits : DEFAULT_MAX_UNITS;
  const windowH = Number.isFinite(opts.windowH) ? opts.windowH : DEFAULT_WINDOW_H;
  const name = String(s.slot || "?").toUpperCase().padEnd(8);
  const st = `[${statusToken(s.status)}]`.padEnd(7);
  const parts = [];
  // WORKING ON NOW -- only when liveish; prefer topic, fall back to activity.
  if (s.status === "alive" || s.status === "stale") {
    const now = s.topic || s.activity || "(no topic)";
    parts.push(`now: ${trunc(now, NOW_W)}`);
  }
  // BUILT/SHIPPED in window.
  const units = Array.isArray(s.shippedUnits) ? s.shippedUnits : [];
  if (units.length) {
    const shown = units.slice(0, maxUnits).join(",");
    const more = units.length > maxUnits ? `+${units.length - maxUnits}` : "";
    parts.push(`shipped ${units.length}/${windowH}h: ${shown}${more}`);
  }
  // LAST built (newest commit subject, even if older than the window).
  if (s.lastSubject) parts.push(`last: ${trunc(s.lastSubject, LAST_W)}`);
  const body = parts.length ? parts.join(" | ") : "(no recent activity)";
  return trunc(`${name}${st} ${body}`, MAX_LINE);
}

/**
 * Compose the full digest markdown from per-slot models. Pure (timestamp passed in).
 * Active slots get a line each; idle slots collapse to a single name list.
 */
export function composeDigest(slots, opts = {}) {
  const windowH = Number.isFinite(opts.windowH) ? opts.windowH : DEFAULT_WINDOW_H;
  const tsIso = opts.tsIso || "(unknown)";
  const active = slots.filter(isActiveSlot);
  const idle = slots.filter((s) => !isActiveSlot(s));
  const lines = [];
  lines.push("# PRISM Fleet Work Digest");
  lines.push("");
  lines.push(`> What every chat slot is working on now + has built/shipped in the last ${windowH}h.`);
  lines.push(`> Generated ${tsIso} (auto, throttled regen). One compact picture so a chat knows the`);
  lines.push("> whole fleet without reading 26 handoffs. Drill into one slot: `node scripts/slot-query.mjs <slot>`.");
  lines.push("");
  lines.push(`## Active (${active.length})`);
  if (active.length === 0) {
    lines.push("_(no slots currently active or shipping)_");
  } else {
    for (const s of active) lines.push(buildSlotLine(s, opts));
  }
  lines.push("");
  if (idle.length) {
    lines.push(`## Idle (${idle.length})`);
    lines.push(idle.map((s) => String(s.slot)).join(", "));
  }
  lines.push("");
  lines.push("_Source: chat-slots (live topic/activity) + git log per slot branch (built/shipped). " +
    "Regen: `node scripts/fleet-work-digest.mjs build`. Disable: PRISM_FLEET_WORK_DIGEST_DISABLE=1._");
  return lines.join("\n") + "\n";
}

// ---- IO layer (injectable for tests) -------------------------------------------------------

/**
 * A branch name is SAFE to pass as a `git log <rev>` positional arg ONLY if it is a plain
 * branch name: starts with an alphanumeric and contains only word chars / dot / slash / dash.
 * This blocks git OPTION-INJECTION -- `state.branch` comes from chat-slots.json with no
 * validation, so a crafted/corrupted value like `--output=/path` would otherwise be parsed by
 * git as an option (arbitrary file write) since the rev is positional and execFileSync can't
 * use a `--` separator without turning the rev into a pathspec. Leading `-` is rejected here.
 * (Security fix, golf 2026-06-15 -- 3-of-3 arm-C P1.)
 */
export function isSafeBranch(b) {
  return typeof b === "string" && /^[A-Za-z0-9][\w./-]*$/.test(b);
}

/**
 * Recent commit subjects on a branch within the window, newest first.
 * Returns [] on an unsafe/missing branch or any git error (branch missing, not a repo,
 * timeout) -- fail-soft. `io.git` may be injected by tests; defaults to bounded execFileSync.
 */
export function gitSubjects(branch, sinceIso, io = {}) {
  if (!isSafeBranch(branch)) return [];
  const runner = io.git || ((args) =>
    execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", timeout: 8000, stdio: ["ignore", "pipe", "ignore"] }));
  try {
    const out = runner(["log", branch, `--since=${sinceIso}`, "--no-merges", "--max-count=40", "--format=%s"]);
    return String(out).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** Newest commit subject on a branch regardless of age (for "last built"). Fail-soft. */
export function gitLastSubject(branch, io = {}) {
  if (!isSafeBranch(branch)) return null;
  const runner = io.git || ((args) =>
    execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", timeout: 8000, stdio: ["ignore", "pipe", "ignore"] }));
  try {
    const out = runner(["log", branch, "--no-merges", "--max-count=1", "--format=%s"]);
    const s = String(out).trim();
    return s || null;
  } catch {
    return null;
  }
}

/** Resolve the branch to inspect for a slot: live state.branch, else conventional slot/<name>. */
export function resolveBranch(slot, state) {
  const b = state && typeof state.branch === "string" ? state.branch.trim() : "";
  // Only trust a plain, option-injection-safe branch name; otherwise fall back to the
  // conventional slot/<name> (which is always safe). Guards the git log <rev> arg.
  if (isSafeBranch(b)) return b;
  return `slot/${slot}`;
}

/**
 * Build the per-slot work model array from a chat-slots snapshot + git history.
 * Pure-ish: all git access goes through `io` so tests inject a fake.
 */
export function buildModel(snapshot, opts = {}) {
  const windowH = Number.isFinite(opts.windowH) ? opts.windowH : DEFAULT_WINDOW_H;
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : null; // tests pass a fixed clock
  const sinceMs = nowMs != null ? nowMs - windowH * 3600 * 1000 : null;
  const sinceIso = sinceMs != null ? new Date(sinceMs).toISOString() : `${windowH}.hours.ago`;
  const io = opts.io || {};
  const slots = Array.isArray(snapshot.slots) ? snapshot.slots : [];
  return slots.map((row) => {
    const slot = row.slot;
    const state = row.state || null;
    const branch = resolveBranch(slot, state);
    const subjects = gitSubjects(branch, sinceIso, io);
    // A reverted unit is not "shipped" -- drop `revert: ...` / `Revert "..."` subjects from the
    // shipped-unit tally (lastSubject still shows the real newest commit, revert included).
    const shippedUnits = [...new Set(
      subjects.filter((s) => !/^revert[:\s"]/i.test(s)).map(parseUnitId).filter(Boolean),
    )];
    const lastSubject = subjects[0] || gitLastSubject(branch, io);
    return {
      slot,
      status: row.status || "idle",
      ageMs: row.ageMs ?? null,
      topic: state?.topic || null,
      activity: state?.activity || null,
      branch,
      shippedUnits,
      lastSubject: lastSubject || null,
    };
  });
}

/** Atomic write (tmp + rename) so a concurrent reader never sees a half-written digest. */
function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp.${process.pid}`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

/**
 * Full build: load chat-slots, gather git history, compose, write OUT_FILE.
 * Returns { ok, path, bytes, activeCount, idleCount, text } or { ok:false, reason }.
 * Honors PRISM_FLEET_WORK_DIGEST_DISABLE. Never throws.
 */
export async function buildDigest(opts = {}) {
  if (process.env.PRISM_FLEET_WORK_DIGEST_DISABLE === "1") {
    return { ok: false, reason: "disabled" };
  }
  const windowH = Number(process.env.PRISM_FLEET_WORK_DIGEST_WINDOW_H) || DEFAULT_WINDOW_H;
  const maxUnits = Number(process.env.PRISM_FLEET_WORK_DIGEST_MAXUNITS) || DEFAULT_MAX_UNITS;
  let snapshot;
  try {
    const helper = await import(`file://${HELPER_PATH.replace(/\\/g, "/")}`);
    snapshot = helper.getStatus();
  } catch (e) {
    return { ok: false, reason: `chat-slots load failed: ${e.message}` };
  }
  if (!snapshot || !snapshot.ok) return { ok: false, reason: "chat-slots getStatus not ok" };
  const model = buildModel(snapshot, { windowH, io: opts.io || {} });
  const tsIso = opts.tsIso || new Date().toISOString();
  const text = composeDigest(model, { windowH, maxUnits, tsIso });
  const active = model.filter(isActiveSlot).length;
  if (opts.write !== false) {
    try { atomicWrite(OUT_FILE, text); }
    catch (e) { return { ok: false, reason: `write failed: ${e.message}`, text }; }
  }
  return { ok: true, path: OUT_FILE, bytes: Buffer.byteLength(text), activeCount: active, idleCount: model.length - active, text };
}

// ---- main ----------------------------------------------------------------------------------

const __isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("/fleet-work-digest.mjs");
if (__isMain) {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const printOnly = args.includes("print");
  const r = await buildDigest({ write: !printOnly && !asJson });
  if (!r.ok) {
    if (r.reason === "disabled") { process.exit(0); }
    process.stderr.write(`fleet-work-digest: ${r.reason}\n`);
    process.exit(1);
  }
  if (asJson) process.stdout.write(JSON.stringify({ path: r.path, bytes: r.bytes, activeCount: r.activeCount, idleCount: r.idleCount }, null, 2) + "\n");
  else if (printOnly) process.stdout.write(r.text);
  else process.stdout.write(`fleet-work-digest: wrote ${r.path} (${r.bytes}b, ${r.activeCount} active / ${r.idleCount} idle)\n`);
  process.exit(0);
}
