#!/usr/bin/env node
/**
 * priority-queue.mjs — runtime API over ROADMAP-CONSOLIDATED priority queue.
 *
 * Spec: PRIORITY-QUEUE-MS0 (slot juliett, forge7, 2026-05-16).
 *
 * Consumed by Stop hooks (stop-auto-pickup-next.mjs in particular) to suggest
 * the next-best unit for a chat to take. Uses the same `classifyUnit` from
 * scripts/generate-priority-queue-features.mjs so visualization + pickup share
 * one classifier (no drift).
 *
 * Pickup order:
 *   1. backend-dev units (priority 0)
 *   2. bridge units (priority 1)
 *   3. app-functionality (priority 2)
 *   tiebreaker: milestone asc, unit_id asc, title asc.
 *
 * Pure functions are exported for testability; CLI: `node priority-queue.mjs
 * --pick [--slot <name>] [--exclude <id,id>]` prints the next unit.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyUnit } from "../../scripts/generate-priority-queue-features.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "../..");

const CONSOLIDATED_PATH = path.join(ROOT, "state/shared/specs/ROADMAP-CONSOLIDATED.json");
const PROGRESS_PATH = path.join(ROOT, "state/shared/MILESTONE_PROGRESS.json");
const CHAT_SLOTS_PATH = path.join(ROOT, "state/shared/chat-slots.json");

function readJsonSafe(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

/** Collect every remaining unit from the consolidated inventory (matches the generator). */
export function collectUnits(inventory) {
  const out = [];
  for (const u of (Array.isArray(inventory?.pending_units) ? inventory.pending_units : [])) {
    out.push({ ...u, _source: "pending" });
  }
  for (const u of (Array.isArray(inventory?.unconsolidated_prose) ? inventory.unconsolidated_prose : [])) {
    out.push({ ...u, _source: "unconsolidated-prose" });
  }
  const bridge = inventory && inventory.bridge_units ? inventory.bridge_units : {};
  for (const u of (Array.isArray(bridge.wiring) ? bridge.wiring : [])) {
    out.push({ unit_id: u.id, milestone: "BRIDGE-WIRING", title: u.title, source: "bridge", suggested_domain: u.domain, _source: "bridge-wiring", intent: u.intent });
  }
  for (const u of (Array.isArray(bridge.deep_integration) ? bridge.deep_integration : [])) {
    out.push({ unit_id: u.id, milestone: "BRIDGE-DEEP", title: u.title, source: "bridge", _source: "bridge-deep", intent: u.intent });
  }
  return out;
}

/** Build the set of unit-ids already shipped (from MILESTONE_PROGRESS). */
export function buildShippedIds(progress) {
  const out = new Set();
  const mp = progress && progress.milestones ? Object.values(progress.milestones) : [];
  for (const ms of mp) for (const u of (Array.isArray(ms.units) ? ms.units : [])) {
    if (u && u.shipped && u.id) out.add(String(u.id).trim().toUpperCase());
  }
  return out;
}

/** Build the set of unit-ids currently claimed by other active slots. */
export function buildClaimedIds(slots) {
  const out = new Set();
  const bag = slots && slots.slots && typeof slots.slots === "object" ? slots.slots : {};
  for (const state of Object.values(bag)) {
    if (state && typeof state === "object") {
      // chat-slots state.topic / state.activity may carry a unit reference; we
      // don't reliably resolve unit_ids from slot topics, so this is a soft
      // filter — strict claim filtering happens at commit time via the
      // commit-ownership-guard hook. Reserved for future when slots carry unit_id.
      const t = String(state.topic || "").toUpperCase();
      const m = t.match(/\b(U-[A-Z0-9-]+)\b/);
      if (m) out.add(m[1]);
    }
  }
  return out;
}

/**
 * Pure: return units eligible for pickup, sorted by priority then milestone/id/title.
 * `excludeIds` is a set of unit-ids to omit (already-shipped, claimed elsewhere).
 */
export function rankUnits(units, excludeIds) {
  const exc = excludeIds instanceof Set ? excludeIds : new Set(excludeIds || []);
  const norm = (s) => String(s || "").trim().toUpperCase();
  const eligible = units.filter((u) => {
    if (!u || u.looks_completed) return false;
    const id = norm(u.unit_id);
    if (id && exc.has(id)) return false;
    return true;
  });
  const decorated = eligible.map((u, i) => ({ u, c: classifyUnit(u), i }));
  decorated.sort((a, b) =>
    (a.c.priority - b.c.priority) ||
    String(a.u.milestone || "").localeCompare(String(b.u.milestone || "")) ||
    String(a.u.unit_id || "").localeCompare(String(b.u.unit_id || "")) ||
    String(a.u.title || "").localeCompare(String(b.u.title || "")) ||
    (a.i - b.i));
  return decorated.map((d) => ({ ...d.u, _category: d.c.category, _priority: d.c.priority, _color: d.c.color }));
}

/**
 * Convenience: load the consolidated inventory + progress + slots and return
 * the top-N ranked pickup candidates. Returns [] if inventory missing (caller
 * handles — typically advisory hooks).
 */
export function pickNextUnit({ slot, excludeIds = [], topN = 1 } = {}) {
  const inv = readJsonSafe(CONSOLIDATED_PATH);
  if (!inv) return [];
  const prog = readJsonSafe(PROGRESS_PATH);
  const slots = readJsonSafe(CHAT_SLOTS_PATH);
  const shipped = buildShippedIds(prog);
  const claimed = buildClaimedIds(slots);
  const exc = new Set([...shipped, ...claimed, ...excludeIds.map((x) => String(x).trim().toUpperCase())]);
  const ranked = rankUnits(collectUnits(inv), exc);
  return ranked.slice(0, Math.max(1, topN | 0));
}

/** High-level summary for dashboards / Stop hook advisory text. */
export function summarize() {
  const inv = readJsonSafe(CONSOLIDATED_PATH);
  if (!inv) return { ok: false, error: "inventory missing" };
  const units = collectUnits(inv);
  const decorated = units.map((u) => ({ ...u, _c: classifyUnit(u) }));
  const byCategory = decorated.reduce((o, d) => { o[d._c.category] = (o[d._c.category] || 0) + 1; return o; }, {});
  return { ok: true, total: units.length, byCategory };
}

// ─── CLI ─────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { pick: false, slot: null, exclude: [], topN: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pick") out.pick = true;
    else if (a === "--slot") out.slot = argv[++i];
    else if (a === "--exclude") out.exclude = String(argv[++i] || "").split(",").map((x) => x.trim()).filter(Boolean);
    else if (a === "--top") out.topN = Number(argv[++i]) || 1;
    else if (a === "--summary") out.summary = true;
    else if (a === "--json") out.json = true;
  }
  return out;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.summary) {
    const s = summarize();
    console.log(args.json ? JSON.stringify(s) : `total=${s.total} byCategory=${JSON.stringify(s.byCategory || {})}`);
    return s.ok ? 0 : 1;
  }
  if (args.pick) {
    const picks = pickNextUnit({ slot: args.slot, excludeIds: args.exclude, topN: args.topN });
    if (args.json) { console.log(JSON.stringify(picks, null, 2)); return picks.length ? 0 : 1; }
    if (!picks.length) { console.log("(no eligible unit found — inventory missing or all shipped/claimed)"); return 1; }
    for (const p of picks) {
      console.log(`${p.unit_id || "(no id)"} [${p._category} p${p._priority}] ${p.milestone || ""} — ${p.title || ""}`);
    }
    return 0;
  }
  console.log("usage: node priority-queue.mjs --pick [--slot <name>] [--top N] [--exclude id,id] [--json] | --summary [--json]");
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
