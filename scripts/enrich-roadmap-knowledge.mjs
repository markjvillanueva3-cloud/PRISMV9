#!/usr/bin/env node
// enrich-roadmap-knowledge.mjs (v2) — add a `knowledge` block to each unit in
// roadmap-tool-plans.json: quickContext + acceptanceCriteria + prismAwareness +
// relatedSubsystems + resources.
//
// v2 fix: the real unit identity (title + acceptance) is resolved from the
// milestone envelopes under mcp-server/data/milestones. The RGS tool-planner
// `rationale` field describes why-these-tools, not what-the-unit-does, so v1
// (which seeded from rationale) produced meaningless quickContext. v2 seeds the
// master-index search with the real title.
//
// Pure derivation via master-index-search-lib (BM25, capped — never loads the
// 372MB raw graph). Idempotent; --force re-enriches; batched; atomic write.
//
// USAGE: node scripts/enrich-roadmap-knowledge.mjs [--batch=N] [--all] [--force] [--dry-run]

import { readFileSync, writeFileSync, renameSync, readdirSync } from "node:fs";
import { runMasterIndexSearch, runTribalSearch } from "./lib/master-index-search-lib.mjs";

const SIDECAR = "H:/prism/state/shared/roadmap-tool-plans.json";
const ENVELOPE_DIR = "H:/prism/mcp-server/data/milestones";
const KNOWLEDGE_SCHEMA = "2.0.0";
const DEFAULT_BATCH = 25;
const K_SEARCH = 20;
const TOP_AWARENESS = 6;
const TOP_RELATED = 8;
const TOP_RESOURCES = 8;
const LOW_CONF = 0.35;

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const ALL = args.includes("--all");
const FORCE = args.includes("--force");
const batchArg = args.find((a) => a.startsWith("--batch="));
const BATCH = ALL
  ? Infinity
  : batchArg
    ? Math.max(1, Number(batchArg.split("=")[1]) || DEFAULT_BATCH)
    : DEFAULT_BATCH;

// Build a milestoneId::unitId -> {title, acceptance} index from every envelope.
function buildEnvelopeIndex() {
  const idx = new Map();
  let files = [];
  try {
    files = readdirSync(ENVELOPE_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return idx;
  }
  for (const f of files) {
    let env;
    try {
      env = JSON.parse(readFileSync(ENVELOPE_DIR + "/" + f, "utf8"));
    } catch {
      continue;
    }
    // A sidecar key is `<milestone>::<unitId>`, but the milestone token can be
    // the filename stem OR the envelope's internal id/milestone field — they
    // often differ. Index every unit under ALL candidate milestone tokens.
    const stem = f.replace(/\.json$/, "");
    const mids = [...new Set([stem, env.id, env.milestone, env.milestoneId].filter(Boolean).map(String))];
    // Envelope schema varies: some have a flat `units[]`, others nest units
    // under `phases[].units[]`. Mirror flattenEnvelopeUnits() from
    // scripts/lib/silent-close-out-drift.mjs (flat-first, phase-nested fallback).
    const flatUnits = Array.isArray(env.units) ? env.units : [];
    const phases = Array.isArray(env.phases) ? env.phases : [];
    const units =
      flatUnits.length > 0
        ? flatUnits
        : phases.flatMap((p) => (p && Array.isArray(p.units) ? p.units : []));
    for (const u of units) {
      if (!u || !u.id) continue;
      const title = String(u.title || u.name || u.subject || "").trim();
      const rawAccept = u.acceptance || u.acceptance_criteria || u.acceptanceCriteria || "";
      const rec = {
        title,
        acceptance: Array.isArray(rawAccept)
          ? rawAccept.slice(0, 4)
          : String(rawAccept || "").slice(0, 300),
      };
      for (const mid of mids) {
        const key = mid + "::" + u.id;
        // First writer wins, but prefer a record that actually has a title.
        if (!idx.has(key) || (!idx.get(key).title && rec.title)) idx.set(key, rec);
      }
    }
  }
  return idx;
}

function deriveKnowledge(unitId, plan, envIndex) {
  const env = envIndex.get(unitId) || null;
  const title = env && env.title ? env.title : "";
  // Seed from the real unit title (falls back to unitId only — never the RGS rationale).
  const seed = title ? unitId.split("::").pop() + " " + title : unitId.replace(/::/g, " ");

  let mi = { hits: [] };
  let tr = { hits: [] };
  try {
    mi = runMasterIndexSearch(seed, { k: K_SEARCH }) || { hits: [] };
  } catch {
    mi = { hits: [] };
  }
  try {
    tr = runTribalSearch(seed, { k: 8 }) || { hits: [] };
  } catch {
    tr = { hits: [] };
  }
  const hits = Array.isArray(mi.hits) ? mi.hits : [];
  const trHits = Array.isArray(tr.hits) ? tr.hits : [];

  // prismAwareness — built PRISM nodes related to this unit's real purpose.
  const prismAwareness = hits
    .filter((h) => h && h.status === "built")
    .slice(0, TOP_AWARENESS)
    .map((h) => ({ node: h.label || h.id, layer: h.layer || "L?", score: h.score || 0 }));

  // relatedSubsystems — node-name families this unit connects to. Honest naming:
  // the capped arch-graph fallback is layer-flat, so we group by node label, not layer.
  const seen = new Set();
  const relatedSubsystems = [];
  for (const h of hits) {
    if (!h || !h.label) continue;
    const fam = String(h.label).split(/[-_]/).slice(0, 2).join("-");
    if (seen.has(fam)) continue;
    seen.add(fam);
    relatedSubsystems.push(fam);
    if (relatedSubsystems.length >= TOP_RELATED) break;
  }

  // resources — wiki + memory + tribal references.
  const wiki = [];
  const memory = [];
  for (const h of hits) {
    if (!h) continue;
    for (const w of h.wiki || []) {
      if (wiki.length < TOP_RESOURCES && !wiki.includes(w)) wiki.push(w);
    }
    for (const m of h.memory || []) {
      if (memory.length < TOP_RESOURCES && !memory.includes(m)) memory.push(m);
    }
  }
  const tribal = trHits.slice(0, 5).map((t) => ({
    domain: t.domain || "general",
    title: String(t.title || "").slice(0, 120),
    path: t.path || t.id || "",
  }));

  // quickContext — the unit's real title is "what we are trying to do".
  const quickContext = title
    ? title
    : "Unit " + unitId + " — title not in any milestone envelope; consult roadmap-index.";

  // confidence — penalised when the unit could not be resolved to an envelope.
  let confidence = hits.length === 0 ? 0.2 : Math.min(1, 0.4 + hits.length * 0.03);
  if (!title) confidence = Math.min(confidence, 0.3);

  return {
    schema: KNOWLEDGE_SCHEMA,
    quickContext,
    acceptanceCriteria: env ? env.acceptance : "",
    envelopeResolved: Boolean(title),
    prismAwareness,
    relatedSubsystems,
    resources: { wiki, memory, tribal },
    confidence: Number(confidence.toFixed(2)),
    enrichedAt: new Date().toISOString(),
    enrichedBy: "enrich-roadmap-knowledge.mjs@2.0.0",
  };
}

function main() {
  let doc;
  try {
    doc = JSON.parse(readFileSync(SIDECAR, "utf8"));
  } catch (e) {
    console.error("FATAL: cannot read sidecar: " + e.message);
    process.exit(1);
  }
  const plans = (doc && doc.plans) || {};
  const allIds = Object.keys(plans);
  if (allIds.length === 0) {
    console.error("FATAL: sidecar has 0 plans");
    process.exit(1);
  }

  const envIndex = buildEnvelopeIndex();
  console.log("envelope index: " + envIndex.size + " units resolved from milestone envelopes");

  const pending = allIds.filter((id) => {
    if (!plans[id]) return false;
    if (FORCE) return true;
    const k = plans[id].knowledge;
    return !k || k.schema !== KNOWLEDGE_SCHEMA;
  });
  const already = allIds.length - pending.length;
  console.log(
    "sidecar: " + allIds.length + " units / " + already + " at schema " +
      KNOWLEDGE_SCHEMA + " / " + pending.length + " to (re)enrich",
  );
  if (pending.length === 0) {
    console.log("ALL UNITS ENRICHED at current schema — nothing to do");
    return;
  }

  const todo = pending.slice(0, BATCH);
  let done = 0;
  let lowConf = 0;
  let unresolved = 0;
  for (const id of todo) {
    const k = deriveKnowledge(id, plans[id] || {}, envIndex);
    if (k.confidence < LOW_CONF) lowConf++;
    if (!k.envelopeResolved) unresolved++;
    if (!DRY) plans[id].knowledge = k;
    done++;
  }
  console.log(
    "enriched " + done + " units this batch · " + lowConf + " low-confidence · " +
      unresolved + " not envelope-resolved · " + (pending.length - done) + " still pending",
  );

  if (DRY) {
    console.log("DRY-RUN — sidecar not written");
    return;
  }
  const nowEnriched = allIds.filter(
    (id) => plans[id] && plans[id].knowledge && plans[id].knowledge.schema === KNOWLEDGE_SCHEMA,
  ).length;
  doc.knowledgeEnrichment = {
    schema: KNOWLEDGE_SCHEMA,
    lastRun: new Date().toISOString(),
    enriched: nowEnriched,
    total: allIds.length,
    pct: Number(((nowEnriched / allIds.length) * 100).toFixed(1)),
  };
  const tmp = SIDECAR + ".tmp." + process.pid;
  writeFileSync(tmp, JSON.stringify(doc, null, 1));
  renameSync(tmp, SIDECAR);
  console.log(
    "wrote sidecar: " + nowEnriched + "/" + allIds.length + " at schema " +
      KNOWLEDGE_SCHEMA + " (" + doc.knowledgeEnrichment.pct + "%)",
  );
}

main();
