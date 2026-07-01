#!/usr/bin/env node
/**
 * generate-echo-viz-layers-features.mjs — system-viz augmentation: three
 * observability roosts from the ECHO-UNDONE survey (H2 + H3 + H5).
 *
 * Spec: state/shared/specs/ECHO-UNDONE-2026-05-18-19-COMPILATION.md
 *   H2 U-VIZ-TRIBAL-LAYER   — tribal-knowledge corpus, grouped by domain.
 *   H3 U-VIZ-AGENT-LAYER    — live chat-slot agents (who owns which topic).
 *   H5 U-HANDOFF-VIZ-LAYER  — active handoffs (slot → topic at a glance).
 *
 * Each layer emits one parent "roost" node (kind ghost-roost) under the
 * existing `ghost.planned_features` ghost roost, plus one child per item.
 * Output `state/shared/system-viz/echo-viz-layers-augmentation.json` is folded
 * into system-graph.json by scripts/merge-augmentations.mjs. Modeled on
 * generate-misc-tasks-features.mjs (the canonical augmentation pattern); the
 * generator is registered in scripts/regen-viz.mjs FAST[].
 *
 * Fail-soft: each layer's source is optional. A missing source skips ONLY that
 * layer — the other two still emit. All three missing → a valid augmentation
 * with zero new nodes (never crashes the regen pipeline).
 *
 * Idempotency: deterministic from the sources (sorted keys, no randomness).
 * merge-augmentations.mjs skips ids already in the graph, so re-merge never
 * duplicates a roost or child. `generatedAt` is the only volatile field —
 * matching every other generator.
 *
 * Usage:  node scripts/generate-echo-viz-layers-features.mjs
 * Exit:   0 ok · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";

/** Grandparent — the existing planned-features ghost roost (shared by all ghost roosts). */
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const CHILD_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 200;

/** Roost ids — stable, graph-unique. */
export const TRIBAL_ROOST_ID = "ghost.viz_tribal_layer";
export const AGENT_ROOST_ID = "ghost.viz_agent_layer";
export const HANDOFF_ROOST_ID = "ghost.viz_handoff_layer";

/** A handoff is "active" if touched within this many days. */
export const HANDOFF_ACTIVE_DAYS = 7;
/** Hard cap on handoff children so the layer can never bloat the graph. */
export const MAX_HANDOFF_CHILDREN = 80;
/** Heartbeat-age thresholds for agent liveness (ms). */
export const AGENT_LIVE_MS = 5 * 60 * 1000;
export const AGENT_STALE_MS = 30 * 60 * 1000;

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "echo-viz-layers-augmentation.json");
const TRIBAL_PATH = path.join(ROOT, "state/shared/tribal-embed-index.json");
const SLOTS_PATH = path.join(ROOT, "state/shared/chat-slots.json");
const HANDOFFS_DIR = path.join(ROOT, "state/shared/handoffs");

const clamp = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

// ───────────────────────── H2 — tribal layer ─────────────────────────

/**
 * Pure: build the tribal roost + one child per knowledge domain.
 * @param index parsed tribal-embed-index.json ({entries:[{domain,source,...}]})
 * @returns {newNodes[]}
 */
export function generateTribalLayer(index) {
  const entries = index && Array.isArray(index.entries) ? index.entries : [];
  if (entries.length === 0) return { newNodes: [], stats: { tribalDomains: 0, tribalEntries: 0 } };

  // Aggregate counts per domain and per source-within-domain (deterministic).
  const byDomain = new Map();
  for (const e of entries) {
    const dom = (e && typeof e.domain === "string" && e.domain.trim()) || "general";
    const src = (e && typeof e.source === "string" && e.source.trim()) || "?";
    let rec = byDomain.get(dom);
    if (!rec) { rec = { count: 0, sources: new Map() }; byDomain.set(dom, rec); }
    rec.count++;
    rec.sources.set(src, (rec.sources.get(src) || 0) + 1);
  }

  const newNodes = [{
    id: TRIBAL_ROOST_ID,
    label: "Tribal Knowledge Corpus",
    layer: ROOST_LAYER,
    ghost: true,
    status: "ghost",
    kind: "ghost-roost",
    parent: PLANNED_PARENT,
    info: `${entries.length} embedded knowledge entries across ${byDomain.size} domains — `
      + `feeds tribal-by-domain injection. Source: state/shared/tribal-embed-index.json.`,
  }];

  for (const dom of [...byDomain.keys()].sort()) {
    const rec = byDomain.get(dom);
    const srcBreakdown = [...rec.sources.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([s, n]) => `${s}:${n}`)
      .join(" ");
    newNodes.push({
      id: `ghost.tribal_dom.${dom}`,
      label: clamp(`tribal · ${dom} · ${rec.count} tips`, MAX_LABEL),
      layer: CHILD_LAYER,
      ghost: true,
      status: "ghost",
      kind: "tribal-domain",
      parent: TRIBAL_ROOST_ID,
      info: clamp(`${rec.count} tribal/knowledge entries in domain "${dom}". By source: ${srcBreakdown}.`, MAX_INFO),
    });
  }

  return { newNodes, stats: { tribalDomains: byDomain.size, tribalEntries: entries.length } };
}

// ───────────────────────── H3 — agent layer ─────────────────────────

/**
 * Pure: build the agent roost + one child per claimed chat-slot.
 * @param slotsDoc parsed chat-slots.json ({slots:{<name>:{chatId,...}}})
 * @param nowMs    clock injection for deterministic liveness classification
 * @returns {newNodes[]}
 */
export function generateAgentLayer(slotsDoc, nowMs = Date.now()) {
  const slots = slotsDoc && slotsDoc.slots && typeof slotsDoc.slots === "object" ? slotsDoc.slots : {};
  const names = Object.keys(slots).sort();
  const claimed = names.filter(n => slots[n] && typeof slots[n].chatId === "string" && slots[n].chatId);
  if (claimed.length === 0) return { newNodes: [], stats: { agentSlots: 0 } };

  let live = 0, stale = 0, crashed = 0;
  const children = [];
  for (const name of claimed) {
    const s = slots[name];
    const hb = Date.parse(s.lastHeartbeat || s.claimedAt || "");
    const ageMs = Number.isFinite(hb) ? Math.max(0, nowMs - hb) : Infinity;
    let liveness;
    if (ageMs <= AGENT_LIVE_MS) { liveness = "live"; live++; }
    else if (ageMs <= AGENT_STALE_MS) { liveness = "stale"; stale++; }
    else { liveness = "crashed"; crashed++; }
    const ageMin = Number.isFinite(ageMs) ? Math.round(ageMs / 60000) : -1;
    children.push({
      id: `ghost.agent.${name}`,
      label: clamp(`agent · ${name} · ${s.topic || "(no topic)"}`, MAX_LABEL),
      layer: CHILD_LAYER,
      ghost: true,
      status: "ghost",
      kind: "agent-slot",
      parent: AGENT_ROOST_ID,
      info: clamp(`[${liveness}${ageMin >= 0 ? ` · ${ageMin}m idle` : ""}] ${s.chatId} — `
        + `topic "${s.topic || "?"}", activity "${s.activity || "?"}", branch ${s.branch || "?"}.`, MAX_INFO),
    });
  }

  const roost = {
    id: AGENT_ROOST_ID,
    label: "Live Agents (chat-slot fleet)",
    layer: ROOST_LAYER,
    ghost: true,
    status: "ghost",
    kind: "ghost-roost",
    parent: PLANNED_PARENT,
    info: `${claimed.length} claimed chat-slots — ${live} live · ${stale} stale · ${crashed} crashed. `
      + `Who owns which topic. Source: state/shared/chat-slots.json.`,
  };
  return { newNodes: [roost, ...children], stats: { agentSlots: claimed.length, live, stale, crashed } };
}

// ───────────────────────── H5 — handoff layer ─────────────────────────

/**
 * Anchored instance-token patterns, ordered most-specific first. Both the
 * instance AND the topic of a real handoff filename can contain dashes, so a
 * naive "split on first dash" mis-attributes every UUID- or hostname-bearing
 * instance. Each pattern captures (1)=instance (2)=topic; first match wins.
 *
 * Real forms observed in state/shared/handoffs/:
 *   HANDOFF-Agent@DESKTOP-N7MI1VB_<uuid>-<topic>.md     (host has dashes)
 *   HANDOFF-Agent@DESKTOP-N7MI1VB_pid-<n>-<topic>.md
 *   HANDOFF-Claude-<8-4-4-4-12 uuid>-<topic>.md         (uuid has dashes)
 *   HANDOFF-claude-<8+ hex>-<topic>.md                  (short id, no dash)
 *   HANDOFF-<slot>-<topic>.md                           (bare NATO slot)
 */
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const HANDOFF_INSTANCE_PATTERNS = [
  new RegExp(`^(Agent@[^_]+_${UUID})-(.+)$`, "i"),   // Agent@<host>_<uuid>
  new RegExp(`^(Agent@[^_]+_pid-\\d+)-(.+)$`, "i"),  // Agent@<host>_pid-<n>
  new RegExp(`^([Cc]laude-${UUID})-(.+)$`, "i"),     // Claude-<uuid>   (before short-hex)
  new RegExp(`^([Cc]laude-[0-9a-f]+)-(.+)$`, "i"),   // claude-<shorthex>
];

/**
 * Parse a HANDOFF filename into {instance, topic}. Returns null for any name
 * that is not `HANDOFF-*.md`. A topicless `HANDOFF-<instance>.md` yields
 * topic "(untopiced)".
 */
export function parseHandoffName(filename) {
  const base = String(filename || "").replace(/\.md$/i, "");
  const m = base.match(/^HANDOFF-(.+)$/i);
  if (!m) return null;
  const rest = m[1];
  for (const pat of HANDOFF_INSTANCE_PATTERNS) {
    const cm = rest.match(pat);
    if (cm) return { instance: cm[1], topic: cm[2] };
  }
  // Fallback: bare-slot form — instance is a single dash-free token.
  const dash = rest.indexOf("-");
  if (dash > 0) return { instance: rest.slice(0, dash), topic: rest.slice(dash + 1) };
  return { instance: rest, topic: "(untopiced)" };
}

/**
 * Injective node-id slug from a handoff filename. The filename is OS-unique;
 * `@` is expanded (not collapsed) so distinct files never collide to one id.
 */
export function handoffNodeId(filename) {
  const base = String(filename || "").replace(/\.md$/i, "").toLowerCase();
  return "ghost.handoff." + base.replace(/@/g, "_at_").replace(/[^a-z0-9._-]/g, "_");
}

/**
 * Pure: build the handoff roost + one child per active handoff.
 * @param files  array of {name, mtimeMs} for state/shared/handoffs/HANDOFF-*.md
 * @param nowMs  clock injection
 * @returns {newNodes[]}
 */
export function generateHandoffLayer(files, nowMs = Date.now()) {
  const list = Array.isArray(files) ? files : [];
  const windowMs = HANDOFF_ACTIVE_DAYS * 24 * 60 * 60 * 1000;
  const active = list
    .filter(f => f && typeof f.name === "string" && Number.isFinite(f.mtimeMs) && (nowMs - f.mtimeMs) <= windowMs)
    .sort((a, b) => b.mtimeMs - a.mtimeMs || a.name.localeCompare(b.name));
  if (active.length === 0) return { newNodes: [], stats: { handoffsActive: 0, handoffsTotal: list.length } };

  const capped = active.slice(0, MAX_HANDOFF_CHILDREN);
  const children = [];
  const seen = new Set();
  for (const f of capped) {
    const parsed = parseHandoffName(f.name);
    if (!parsed) continue;
    // node id from the (OS-unique) filename — injective, dedupe defensively.
    const id = handoffNodeId(f.name);
    if (seen.has(id)) continue;
    seen.add(id);
    const ageMin = Math.round((nowMs - f.mtimeMs) / 60000);
    children.push({
      id,
      label: clamp(`handoff · ${parsed.instance} · ${parsed.topic}`, MAX_LABEL),
      layer: CHILD_LAYER,
      ghost: true,
      status: "ghost",
      kind: "handoff",
      parent: HANDOFF_ROOST_ID,
      info: clamp(`${parsed.instance} → topic "${parsed.topic}" — updated ${ageMin}m ago. File: ${f.name}.`, MAX_INFO),
    });
  }

  const roost = {
    id: HANDOFF_ROOST_ID,
    label: "Active Handoffs (slot → topic)",
    layer: ROOST_LAYER,
    ghost: true,
    status: "ghost",
    kind: "ghost-roost",
    parent: PLANNED_PARENT,
    info: `${active.length} handoffs touched in the last ${HANDOFF_ACTIVE_DAYS}d`
      + `${active.length > capped.length ? ` (showing ${capped.length})` : ""}`
      + ` of ${list.length} total. Source: state/shared/handoffs/.`,
  };
  return {
    newNodes: [roost, ...children],
    stats: { handoffsActive: active.length, handoffsShown: capped.length, handoffsTotal: list.length },
  };
}

// ───────────────────────── composer ─────────────────────────

/**
 * Pure: compose all three layers into a single augmentation payload.
 * Each input may be null (source missing) — that layer is simply skipped.
 */
export function generate({ tribalIndex = null, slotsDoc = null, handoffFiles = null, nowMs = Date.now() } = {}) {
  const tribal = tribalIndex ? generateTribalLayer(tribalIndex) : { newNodes: [], stats: { tribalDomains: 0, tribalEntries: 0 } };
  const agent = slotsDoc ? generateAgentLayer(slotsDoc, nowMs) : { newNodes: [], stats: { agentSlots: 0 } };
  const handoff = handoffFiles ? generateHandoffLayer(handoffFiles, nowMs) : { newNodes: [], stats: { handoffsActive: 0, handoffsTotal: 0 } };

  return {
    newNodes: [...tribal.newNodes, ...agent.newNodes, ...handoff.newNodes],
    newEdges: [],
    stats: {
      tribal: tribal.stats,
      agent: agent.stats,
      handoff: handoff.stats,
      totalNodes: tribal.newNodes.length + agent.newNodes.length + handoff.newNodes.length,
    },
  };
}

// ───────────────────────── I/O wrapper ─────────────────────────

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return null; }
}

function loadHandoffFiles(dir) {
  let names;
  try { names = fs.readdirSync(dir); }
  catch { return null; }
  const out = [];
  for (const name of names) {
    if (!/^HANDOFF-.+\.md$/i.test(name)) continue;
    try {
      const st = fs.statSync(path.join(dir, name));
      out.push({ name, mtimeMs: st.mtimeMs });
    } catch { /* skip unreadable */ }
  }
  return out;
}

export function main() {
  const tribalIndex = loadJson(TRIBAL_PATH);
  const slotsDoc = loadJson(SLOTS_PATH);
  const handoffFiles = loadHandoffFiles(HANDOFFS_DIR);

  let result;
  try {
    const { newNodes, newEdges, stats } = generate({ tribalIndex, slotsDoc, handoffFiles });
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "tribal-embed-index.json + chat-slots.json + handoffs/",
      sourcesPresent: {
        tribal: tribalIndex != null,
        agent: slotsDoc != null,
        handoff: handoffFiles != null,
      },
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) {
    console.error(`FATAL: generate failed — ${e.message}`);
    return 2;
  }

  try {
    fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`FATAL: write failed — ${e.message}`);
    return 2;
  }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  tribal layer:   ${result.stats.tribal.tribalDomains} domains / ${result.stats.tribal.tribalEntries} entries`
    + `${result.sourcesPresent.tribal ? "" : " (source missing — skipped)"}`);
  console.log(`  agent layer:    ${result.stats.agent.agentSlots} slots`
    + `${result.sourcesPresent.agent ? "" : " (source missing — skipped)"}`);
  console.log(`  handoff layer:  ${result.stats.handoff.handoffsActive ?? 0} active`
    + `${result.sourcesPresent.handoff ? "" : " (source missing — skipped)"}`);
  console.log(`  total new nodes: ${result.newNodes.length}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
