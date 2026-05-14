#!/usr/bin/env node
/**
 * handoff-staleness.mjs — CLEANUP-MS0 / U-CLEANUP-G1
 *
 * A READ-ONLY fleet-hygiene audit. Two reports, one sweep:
 *
 *   1. HANDOFF audit — cross-references every
 *      `state/shared/handoffs/HANDOFF-<chatId>-<topic>.md` against the live
 *      slot table in `state/shared/chat-slots.json`. A handoff is flagged
 *      "dead-owner" when its chatId is held by a slot whose heartbeat is
 *      stale (the actionable case: a fleet slot occupied by a corpse). The
 *      common "no-slot" case (a past chat that ended cleanly) is counted but
 *      not alarmed. Handoffs are context — this audit NEVER moves or deletes
 *      them.
 *
 *   2. STALE-CLAIM report — scans `mcp-server/data/claims/<MILESTONE>/claim.json`
 *      and flags every milestone claim whose most recent heartbeat is older
 *      than --stale-hours (default 4h). This is REPORT-ONLY — it does not
 *      release anything. Releasing milestone claims is already owned by
 *      `.claude/scripts/reap-stale-claims.mjs` (the established reaper:
 *      dry-run by default, `--apply` to delete, 5-min doctrine threshold).
 *      Per the PRISM duplication-guard doctrine this audit does NOT build a
 *      second reaper; it surfaces the stale claims so an operator (or a
 *      wired cron) can run `reap-stale-claims.mjs --apply`.
 *
 * WHY READ-ONLY: G1 originally specced an "auto-release claims >4h old" half.
 * A pre-write survey found `reap-stale-claims.mjs` already reaps the exact
 * same directory. Shipping a second reaper with different semantics
 * (rename-vs-unlink, 4h-vs-5min) on shared coordination state read by commit
 * guards and other hooks would be a duplication-guard violation and a
 * multi-host blast-radius risk (a cross-host claim cannot be safely released
 * on heartbeat-age alone — see golf-slot-takeover.mjs's cross-host skip).
 * So G1 reports; the existing reaper releases. The gap (reap-stale-claims.mjs
 * is currently unwired and reads only the `heartbeat_at` snake_case field,
 * missing the `lastHeartbeat` camelCase claims) is logged as a follow-up, not
 * silently papered over.
 *
 * Why 4h for the report: a live chat rewrites its claim heartbeat on
 * essentially every turn. Four hours of silence is not "a slow chat" — it is
 * a corpse. (reap-stale-claims.mjs's 5-min doctrine threshold is for active
 * reaping; this audit's wider 4h window is deliberately conservative so the
 * report only surfaces claims that are unambiguously abandoned.)
 *
 * Schema tolerance: the claims directory carries TWO field conventions —
 * camelCase (`lastHeartbeat` / `claimedAt`, written by the /checkin fleet
 * path) and snake_case (`heartbeat_at` / `claimed_at`, written by the
 * roadmap-claim path). This audit reads BOTH so a snake_case claim is not
 * silently classified "unreadable".
 *
 * Failure modes covered:
 *   - chat-slots.json missing/malformed → handoffs classified "no-slot"
 *     (empty slot table), claims still reported.
 *   - handoffs dir missing → zero handoffs, claims still reported.
 *   - claims dir missing → zero claims, handoffs still audited.
 *   - individual claim.json malformed → counted "unreadable", sweep continues.
 *   - claim.json with no parseable heartbeat → counted "unknown-heartbeat",
 *     never flagged stale (we cannot prove it stale).
 *   - top-level non-directory entries in the claims root (ACTIVE_CLAIM.json,
 *     .gitkeep) → skipped by the isDirectory() filter.
 *
 * CLI:
 *   node .claude/helpers/handoff-staleness.mjs
 *     [--slots <path>]     default: state/shared/chat-slots.json
 *     [--handoffs <dir>]   default: state/shared/handoffs
 *     [--claims <dir>]     default: mcp-server/data/claims
 *     [--stale-hours <n>]  default: 4
 *     [--json]             emit the full structured result as JSON
 *
 * Exit codes:
 *   0 — sweep completed (advisory; stale findings do NOT change the code)
 *   2 — bad args (unknown flag / missing value)
 *
 * @see scripts/golf-slot-takeover.mjs        — sibling read-then-decide pattern
 * @see .claude/scripts/reap-stale-claims.mjs — the established claim reaper
 * @see scripts/system-health/10-stale-handoff-sweep.ps1 — 30-min cadence wrapper
 * @see U-CLEANUP-G1
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

// Repo root is derived from this file's own location (.claude/helpers/<this>)
// rather than hardcoded. A scheduled hygiene job whose defaults silently sweep
// nothing on a host where the repo lives somewhere other than H:/prism is a
// worse failure than one that crashes (R12: fail loud). PRISM_REPO_ROOT
// overrides the derivation; the canonical H:/prism is only the last-resort
// fallback. Individual paths stay overridable via --slots/--handoffs/--claims.
function deriveRepoRoot() {
  try {
    return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  } catch {
    return "H:/prism";
  }
}
const REPO = process.env.PRISM_REPO_ROOT || deriveRepoRoot();
const DEFAULT_SLOTS = join(REPO, "state/shared/chat-slots.json");
const DEFAULT_HANDOFFS = join(REPO, "state/shared/handoffs");
const DEFAULT_CLAIMS = join(REPO, "mcp-server/data/claims");
const DEFAULT_STALE_HOURS = 4;
const SCHEMA_VERSION = 1;
const MS_PER_HOUR = 3_600_000;

// HANDOFF-<chatId>-<topic>.md — chatId is the `claude-<hex>` instance id the
// per-agent-handoff helper keys on. Topic-keyed (HANDOFF-audit-hooks-…) and
// slot-keyed (HANDOFF-golf-…) handoffs do not carry a chatId and are counted
// separately as "unkeyed" rather than force-fit to this pattern.
const HANDOFF_CHATID_RE = /^HANDOFF-(claude-[0-9a-f]+)-.+\.md$/i;

// ── arg parse ────────────────────────────────────────────────────────────────
export function parseArgs(argv) {
  const out = {
    slots: DEFAULT_SLOTS,
    handoffs: DEFAULT_HANDOFFS,
    claims: DEFAULT_CLAIMS,
    staleHours: DEFAULT_STALE_HOURS,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") { out.json = true; continue; }
    if (a === "--slots") { if (argv[i + 1] == null) return { _error: "--slots needs a value" }; out.slots = argv[++i]; continue; }
    if (a === "--handoffs") { if (argv[i + 1] == null) return { _error: "--handoffs needs a value" }; out.handoffs = argv[++i]; continue; }
    if (a === "--claims") { if (argv[i + 1] == null) return { _error: "--claims needs a value" }; out.claims = argv[++i]; continue; }
    if (a === "--stale-hours") {
      const v = Number(argv[i + 1]);
      if (argv[i + 1] == null || !Number.isFinite(v) || v <= 0) return { _error: "--stale-hours needs a positive number" };
      out.staleHours = v; i++; continue;
    }
    return { _error: `unknown arg: ${a}` };
  }
  return out;
}

// ── pure helpers ─────────────────────────────────────────────────────────────

/** Parse + JSON-decode a file. Returns null on missing/unreadable/malformed. */
export function readJsonSafe(path) {
  if (!existsSync(path)) return null;
  let raw;
  try { raw = readFileSync(path, "utf-8"); }
  catch { return null; }
  try { return JSON.parse(raw); }
  catch { return null; }
}

/**
 * Extract the `claude-<hex>` chatId from a handoff filename, or null when the
 * file is topic-keyed / slot-keyed (no chatId in the name).
 * @param {string} filename
 * @returns {string|null}
 */
export function parseHandoffChatId(filename) {
  const m = String(filename || "").match(HANDOFF_CHATID_RE);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Read the most recent heartbeat timestamp from a claim/slot record, tolerant
 * of BOTH field conventions present in the live data:
 *   - camelCase: `lastHeartbeat` / `claimedAt`   (/checkin fleet path)
 *   - snake_case: `heartbeat_at` / `claimed_at`  (roadmap-claim path)
 * Preference order: a heartbeat field beats a claimed-at field (heartbeat is
 * the liveness signal; claimed-at is only the birth time fallback). Returns
 * the parsed epoch-ms, or NaN when no field yields a parseable date.
 * @param {object} rec
 * @returns {number}
 */
export function recordHeartbeatMs(rec) {
  if (!rec || typeof rec !== "object") return NaN;
  for (const key of ["lastHeartbeat", "heartbeat_at", "claimedAt", "claimed_at"]) {
    const v = rec[key];
    if (typeof v === "string" && v) {
      const ms = Date.parse(v);
      if (Number.isFinite(ms)) return ms;
    }
  }
  return NaN;
}

/**
 * Build chatId → { slot, lastHeartbeatMs, host, pid, fresh } from a parsed
 * chat-slots.json. `fresh` is true when the slot's heartbeat is within
 * staleMs of `now`. A null/malformed state yields an empty map.
 * @param {object|null} slotsJson
 * @param {number} now
 * @param {number} staleMs
 * @returns {Map<string, object>}
 */
export function indexSlotsByChatId(slotsJson, now, staleMs) {
  const map = new Map();
  const slots = slotsJson && typeof slotsJson === "object" ? slotsJson.slots : null;
  if (!slots || typeof slots !== "object") return map;
  for (const [slotName, slot] of Object.entries(slots)) {
    if (!slot || typeof slot !== "object" || typeof slot.chatId !== "string") continue;
    const hbMs = recordHeartbeatMs(slot);
    const hasHb = Number.isFinite(hbMs);
    map.set(slot.chatId.toLowerCase(), {
      slot: slotName,
      lastHeartbeatMs: hasHb ? hbMs : null,
      host: typeof slot.host === "string" ? slot.host : null,
      pid: Number.isInteger(slot.pid) ? slot.pid : null,
      fresh: hasHb ? (now - hbMs) <= staleMs : false,
    });
  }
  return map;
}

/**
 * Classify one handoff file against the slot index. Read-only — produces a
 * record, never touches the file.
 *   - "unkeyed"     : filename carries no chatId (topic/slot-keyed handoff)
 *   - "live-owner"  : chatId held by a slot with a fresh heartbeat
 *   - "dead-owner"  : chatId held by a slot whose heartbeat is stale
 *   - "no-slot"     : chatId not in the slot table at all (historical handoff)
 * Only "dead-owner" is actionable (a slot occupied by a corpse). "no-slot" is
 * the common, benign case — past chats whose sessions ended cleanly.
 */
export function classifyHandoff(filename, mtimeMs, slotIndex, now) {
  const chatId = parseHandoffChatId(filename);
  const ageHours = Number.isFinite(mtimeMs) ? (now - mtimeMs) / MS_PER_HOUR : null;
  if (chatId === null) {
    return { file: filename, chatId: null, status: "unkeyed", ageHours, actionable: false };
  }
  const slot = slotIndex.get(chatId);
  if (!slot) {
    return { file: filename, chatId, status: "no-slot", ageHours, actionable: false };
  }
  if (slot.fresh) {
    return { file: filename, chatId, status: "live-owner", slot: slot.slot, ageHours, actionable: false };
  }
  return { file: filename, chatId, status: "dead-owner", slot: slot.slot, ageHours, actionable: true };
}

/**
 * Evaluate one milestone claim for the staleness report. READ-ONLY — returns
 * a verdict, never mutates. A claim is "stale" iff its most recent heartbeat
 * (either field convention) is strictly older than staleMs. A claim with no
 * parseable heartbeat is "unknown-heartbeat" (NOT stale — unprovable). A
 * null/non-object claim is "unreadable".
 * @param {object} claim
 * @param {number} now
 * @param {number} staleMs
 * @returns {{ status: string, stale: boolean, heartbeatAgeHours: number|null, host: string|null }}
 */
export function evaluateClaim(claim, now, staleMs) {
  if (!claim || typeof claim !== "object") {
    return { status: "unreadable", stale: false, heartbeatAgeHours: null, host: null };
  }
  const host = typeof claim.host === "string" && claim.host ? claim.host : null;
  const hbMs = recordHeartbeatMs(claim);
  if (!Number.isFinite(hbMs)) {
    return { status: "unknown-heartbeat", stale: false, heartbeatAgeHours: null, host };
  }
  const ageHours = (now - hbMs) / MS_PER_HOUR;
  // Strict > : a claim exactly at the threshold is still fresh.
  if (now - hbMs > staleMs) {
    return { status: "stale", stale: true, heartbeatAgeHours: ageHours, host };
  }
  return { status: "fresh", stale: false, heartbeatAgeHours: ageHours, host };
}

/** List immediate subdirectories of `dir`. Returns [] on a missing dir. */
function listDirs(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch { return []; }
}

/** List files in `dir`. Returns [] on a missing dir. */
function listFiles(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
  } catch { return []; }
}

/** Reaper-recommendation line — surfaced only when the report found stale claims. */
function claimReaperHint(staleCount) {
  return staleCount > 0
    ? "run `.claude/scripts/reap-stale-claims.mjs --apply` to release these (this audit is read-only)"
    : null;
}

// ── orchestration ────────────────────────────────────────────────────────────
/**
 * Run the full read-only audit. Hooks let the test suite inject pure fakes for
 * the three discovery seams so the orchestration is exercised without a real
 * filesystem; with no hooks, the real `listDirs`/`listFiles`/`statSync` paths
 * run (and ARE exercised by the test suite against tmpdir fixtures).
 *
 * @param {ReturnType<typeof parseArgs>} opts
 * @param {object} [hooks]
 * @param {number}   [hooks.now]              clock override (default Date.now())
 * @param {function} [hooks.readJsonFn]       (path) => parsed | null
 * @param {function} [hooks.listHandoffsFn]   (dir) => [{ file, mtimeMs }]
 * @param {function} [hooks.listClaimsFn]     (dir) => [{ milestone, path, claim }]
 * @returns {object} structured result
 */
export function sweep(opts, hooks = {}) {
  const now = Number.isFinite(hooks.now) ? hooks.now : Date.now();
  const readJsonFn = hooks.readJsonFn || readJsonSafe;
  const staleMs = opts.staleHours * MS_PER_HOUR;

  const result = {
    schemaVersion: SCHEMA_VERSION,
    ok: true,
    generatedAt: new Date(now).toISOString(),
    staleHours: opts.staleHours,
    handoffs: { total: 0, unkeyed: 0, liveOwner: 0, noSlot: 0, deadOwner: 0, deadOwnerFiles: [] },
    claims: { total: 0, fresh: 0, unreadable: 0, unknownHeartbeat: 0, stale: 0, staleDetail: [] },
    claimReaperHint: null,
  };

  // ── 1. handoff audit ──
  const slotsJson = readJsonFn(opts.slots);
  const slotIndex = indexSlotsByChatId(slotsJson, now, staleMs);
  const handoffFiles = hooks.listHandoffsFn
    ? hooks.listHandoffsFn(opts.handoffs)
    : listFiles(opts.handoffs)
        .filter((f) => f.startsWith("HANDOFF-") && f.endsWith(".md"))
        .map((f) => {
          let mtimeMs = NaN;
          try { mtimeMs = statSync(join(opts.handoffs, f)).mtimeMs; } catch { /* unreadable → NaN age */ }
          return { file: f, mtimeMs };
        });
  for (const { file, mtimeMs } of handoffFiles) {
    const c = classifyHandoff(file, mtimeMs, slotIndex, now);
    result.handoffs.total++;
    if (c.status === "unkeyed") result.handoffs.unkeyed++;
    else if (c.status === "live-owner") result.handoffs.liveOwner++;
    else if (c.status === "no-slot") result.handoffs.noSlot++;
    else if (c.status === "dead-owner") {
      result.handoffs.deadOwner++;
      result.handoffs.deadOwnerFiles.push({
        file: c.file, chatId: c.chatId, slot: c.slot,
        ageHours: c.ageHours == null ? null : Math.round(c.ageHours * 10) / 10,
      });
    }
  }

  // ── 2. stale-claim report (read-only) ──
  const claimRecords = hooks.listClaimsFn
    ? hooks.listClaimsFn(opts.claims)
    : listDirs(opts.claims).map((milestone) => {
        const path = join(opts.claims, milestone, "claim.json");
        return { milestone, path, claim: readJsonFn(path) };
      }).filter((r) => r.claim !== null || existsSync(r.path));
  for (const rec of claimRecords) {
    result.claims.total++;
    const v = evaluateClaim(rec.claim, now, staleMs);
    const ageH = v.heartbeatAgeHours == null ? null : Math.round(v.heartbeatAgeHours * 10) / 10;
    if (v.status === "unreadable") { result.claims.unreadable++; continue; }
    if (v.status === "unknown-heartbeat") { result.claims.unknownHeartbeat++; continue; }
    if (!v.stale) { result.claims.fresh++; continue; }
    result.claims.stale++;
    result.claims.staleDetail.push({
      milestone: rec.milestone,
      chatId: rec.claim?.chatId ?? null,
      host: v.host,
      heartbeatAgeHours: ageH,
    });
  }

  result.claimReaperHint = claimReaperHint(result.claims.stale);
  return result;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function renderText(r) {
  const h = r.handoffs;
  const c = r.claims;
  const lines = [];
  lines.push(`handoff-staleness OK [AUDIT, read-only] stale>=${r.staleHours}h`);
  lines.push(`  handoffs: ${h.total} total — ${h.liveOwner} live-owner, ${h.noSlot} historical, ${h.unkeyed} unkeyed, ${h.deadOwner} DEAD-OWNER`);
  for (const d of h.deadOwnerFiles) {
    lines.push(`    ⚠ ${d.file} — slot ${d.slot} held by dead chat ${d.chatId} (handoff ${d.ageHours ?? "?"}h old)`);
  }
  lines.push(`  claims: ${c.total} total — ${c.fresh} fresh, ${c.stale} STALE, ${c.unreadable} unreadable, ${c.unknownHeartbeat} no-heartbeat`);
  for (const d of c.staleDetail) {
    lines.push(`    ⚠ ${d.milestone} — chat ${d.chatId ?? "?"}${d.host ? ` @${d.host}` : ""} (heartbeat ${d.heartbeatAgeHours ?? "?"}h stale)`);
  }
  if (r.claimReaperHint) lines.push(`  → ${r.claimReaperHint}`);
  return lines.join("\n");
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts._error) {
    process.stderr.write(`handoff-staleness: ${opts._error}\n`);
    process.exit(2);
  }
  const r = sweep(opts);
  if (opts.json) {
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
  } else {
    process.stdout.write(renderText(r) + "\n");
  }
  process.exit(0); // advisory: a stale finding never changes the exit code
}

// Run as a script only when invoked directly (not when imported by a test).
const invokedAsCli = (() => {
  try {
    return !!process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch { return false; }
})();
if (invokedAsCli) main();
