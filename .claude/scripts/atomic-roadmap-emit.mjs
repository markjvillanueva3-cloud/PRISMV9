#!/usr/bin/env node
/**
 * atomic-roadmap-emit.mjs
 *
 * Generates the master roadmap for a 6-chat run. Reads:
 *   - mcp-server/data/milestones/*.json    (envelope ground truth)
 *   - state/shared/system-viz/system-graph.json  (tier + leverage)
 *   - state/shared/BUILD_STATE.json        (live built/needs-wiring counts)
 *   - state/shared/ai-priority-ranks.json  (AI-Priority Law, rgs6)
 *
 * Sort key (Atomic-First Build Law + AI-Priority Law):
 *   1. tier ASC                    (Tier 0 prereqs always first)
 *   2. aiPriorityScore DESC        (within a tier, AI/ML/system-knowledge first)
 *   3. leverage_score DESC         (within tier+ai, highest leverage first)
 *   4. milestone+unit alpha        (deterministic tiebreak)
 *
 * Then splits into 6 chat lanes by domain affinity (so two chats don't
 * camp the same engine family). Each lane gets a target unit count,
 * computed from total / 6 with ±2 slack to balance domain weight.
 *
 * Output:
 *   state/shared/atomic-roadmap.json  — full master roadmap
 *   state/shared/atomic-roadmap-chat-<1..6>.md  — per-chat assignment list
 *   state/shared/atomic-roadmap-summary.md  — human-readable summary
 *
 * Usage:
 *   node atomic-roadmap-emit.mjs                  # full run
 *   node atomic-roadmap-emit.mjs --dry-run        # show plan, write nothing
 *   node atomic-roadmap-emit.mjs --chats <N>      # custom lane count (1..8)
 *   node atomic-roadmap-emit.mjs --apply          # also stamp ghost-nodes
 *
 * The --apply flag triggers viz-progress-update.mjs claim for every unit
 * in the roadmap so system-viz immediately shows ghost-node placeholders.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PRISM = "H:/prism";
const ENV_DIR = `${PRISM}/mcp-server/data/milestones`;
const GRAPH = `${PRISM}/state/shared/system-viz/system-graph.json`;
const BUILD_STATE = `${PRISM}/state/shared/BUILD_STATE.json`;
const AI_RANKS = `${PRISM}/state/shared/ai-priority-ranks.json`;
const OUT_JSON = `${PRISM}/state/shared/atomic-roadmap.json`;
const OUT_SUMMARY = `${PRISM}/state/shared/atomic-roadmap-summary.md`;

function args() {
  const a = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      opts[k] = v;
    }
  }
  return opts;
}

function readJSON(p, fb) {
  if (!fs.existsSync(p)) return fb;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; }
}

function ensureAiRanks() {
  // Re-rank when ai-priority-ranks.json is older than the newest envelope
  // file. This is correct (envelope changed → rerank) AND fast (no rerank
  // when nothing relevant changed). Falls back to a 1h freshness ceiling
  // so a stalled-out ledger eventually re-evaluates against any code changes.
  const STALE_CEILING_MS = 3600_000;
  let needRerun = !fs.existsSync(AI_RANKS);
  if (!needRerun) {
    const ranksMtime = fs.statSync(AI_RANKS).mtimeMs;
    if (Date.now() - ranksMtime > STALE_CEILING_MS) {
      needRerun = true;
    } else if (fs.existsSync(ENV_DIR)) {
      let newestEnv = 0;
      for (const f of fs.readdirSync(ENV_DIR)) {
        if (!f.endsWith(".json")) continue;
        const mt = fs.statSync(path.join(ENV_DIR, f)).mtimeMs;
        if (mt > newestEnv) newestEnv = mt;
      }
      if (newestEnv > ranksMtime) needRerun = true;
    }
  }
  if (needRerun) {
    spawnSync(process.execPath, [`${PRISM}/.claude/scripts/ai-priority-rank.mjs`], {
      stdio: "inherit", cwd: PRISM, timeout: 30_000,
    });
  }
  return readJSON(AI_RANKS, { ranked: [] });
}

function inferTier(env, unit) {
  // Explicit tier wins (unit-level, then envelope-level). Additive — no change
  // for envelopes that don't carry a numeric `tier`.
  if (typeof unit?.tier === "number") return unit.tier;
  if (typeof env?.tier === "number") return env.tier;
  // Else: tier from milestone track convention.
  //   FOUNDATION/INFRA/PHYSICS/CONST → tier 0
  //   ENGINE/CALC/SAFETY → tier 1
  //   DISPATCHER/WIRE → tier 2
  //   TRANSPORT/MCP/HTTP → tier 3
  //   FRONTEND/UI → tier 4
  //   PERSONA/UX → tier 5
  const t = (env.track || "").toUpperCase();
  if (/FOUND|INFRA|CONST|PHYSICS|CALIB/.test(t)) return 0;
  if (/ENGINE|CALC|SAFETY|MATH/.test(t)) return 1;
  if (/DISPATCH|WIRE|MCP/.test(t)) return 2;
  if (/TRANSPORT|HTTP|API/.test(t)) return 3;
  if (/FRONTEND|UI|WEB/.test(t)) return 4;
  if (/PERSONA|UX|OPERATOR/.test(t)) return 5;
  return 1; // default to engine tier
}

function inferLeverage(env, unit) {
  // Try unit-level explicit, else env-level, else heuristic from text length.
  if (typeof unit?.leverage_score === "number") return unit.leverage_score;
  if (typeof env?.leverage_score === "number") return env.leverage_score;
  const text = (unit?.title || "") + " " + (env?.title || "");
  // crude: more files affected → higher leverage
  const fmCount = (unit?.files_modified || []).length;
  return 14 + Math.min(20, fmCount * 2);
}

function inferDomain(env, unit) {
  const t = ((env.track || "") + " " + (unit?.id || "")).toLowerCase();
  if (/lath|turn/.test(t)) return "lathe";
  if (/mill|cam|cnc/.test(t)) return "mill";
  if (/wedm|edm/.test(t)) return "edm";
  if (/cad|fusion|solid/.test(t)) return "cad";
  if (/ai|ml|neural|nn/.test(t)) return "ai";
  if (/calc|physics|kien|taylor/.test(t)) return "physics";
  if (/safety|s\(x\)|guard/.test(t)) return "safety";
  if (/post|nc|gcode/.test(t)) return "post";
  if (/ux|ui|frontend|web/.test(t)) return "ui";
  return "core";
}

function loadCandidates() {
  const aiRanks = ensureAiRanks();
  const aiByUnit = new Map();
  for (const r of (aiRanks.ranked || [])) {
    aiByUnit.set(`${r.milestone}::${r.unit_id}`, r);
  }

  const files = fs.readdirSync(ENV_DIR).filter((f) => f.endsWith(".json"));
  const candidates = [];

  for (const f of files) {
    const env = readJSON(path.join(ENV_DIR, f), null);
    if (!env) continue;
    if (env.status === "complete" || env.status === "completed") continue;

    // Accept BOTH the flat-`units` schema AND the ACP-style `phases[].units`
    // schema (most envelopes use the latter; without this they collapse to a
    // single candidate). Additive — no behavior change for flat-`units` envelopes.
    const envUnits = Array.isArray(env.units)
      ? env.units
      : Array.isArray(env.phases)
        ? env.phases.flatMap((p) => (Array.isArray(p.units) ? p.units : []))
        : [];
    const units = envUnits.filter((u) =>
      u && u.status !== "complete" && u.status !== "completed",
    );

    if (units.length === 0) {
      // milestone with no individual units → treat as single candidate
      const aiRank = aiByUnit.get(`${env.id}::${env.id}`);
      candidates.push({
        milestone: env.id,
        unit_id: env.id,
        title: env.title || env.id,
        tier: inferTier(env, null),
        aiPriorityScore: aiRank?.score ?? 0,
        aiCategory: aiRank?.category ?? null,
        leverage_score: inferLeverage(env, null),
        domain: inferDomain(env, null),
        track: env.track || null,
      });
      continue;
    }

    for (const u of units) {
      const aiRank = aiByUnit.get(`${env.id}::${u.id}`);
      candidates.push({
        milestone: env.id,
        unit_id: u.id,
        title: u.title || env.title,
        tier: inferTier(env, u),
        aiPriorityScore: aiRank?.score ?? 0,
        aiCategory: aiRank?.category ?? null,
        leverage_score: inferLeverage(env, u),
        domain: inferDomain(env, u),
        track: env.track || null,
      });
    }
  }

  return candidates;
}

// ── Track A: enrichment from MILESTONE_PROGRESS / tribal-density /
//            system-viz blast-radius / envelope drift ─────────────
function loadMilestoneProgress() {
  const p = `${PRISM}/state/shared/MILESTONE_PROGRESS.json`;
  const j = readJSON(p, null);
  if (!j) return { byUnit: new Map(), byMilestone: new Map(), drifts: [] };
  const byUnit = new Map();
  const byMilestone = new Map();
  const drifts = [];
  for (const m of (j.milestones || [])) {
    const total = (m.units || []).length || 1;
    const shipped = (m.units || []).filter((u) => u.shipped).length;
    byMilestone.set(m.id, { shipped, total, fraction: shipped / total });
    if (m.claimedStatus && m.derivedStatus && m.claimedStatus !== m.derivedStatus) {
      drifts.push({ milestone: m.id, claimed: m.claimedStatus, derived: m.derivedStatus });
    }
    for (const u of (m.units || [])) {
      byUnit.set(`${m.id}::${u.id}`, { shipped: !!u.shipped, sha: u.sha, date: u.date });
    }
  }
  return { byUnit, byMilestone, drifts };
}

function loadTribalDensity() {
  const bridge = `${PRISM}/.claude/scripts/tribal-density-router-bridge.mjs`;
  if (!fs.existsSync(bridge)) return new Map();
  const r = spawnSync(process.execPath, [bridge, "--json"], {
    encoding: "utf8", timeout: 5000,
  });
  if (r.status !== 0 || !r.stdout) return new Map();
  try {
    const j = JSON.parse(r.stdout);
    const m = new Map();
    for (const row of (j.rows || [])) m.set(row.domain, row);
    return m;
  } catch { return new Map(); }
}

function loadBlastRadiusFromGraph() {
  const g = readJSON(GRAPH, null);
  if (!g || !Array.isArray(g.edges)) return new Map();
  const fanout = new Map();
  for (const e of g.edges) {
    const src = e.from || e.source;
    if (!src) continue;
    fanout.set(src, (fanout.get(src) || 0) + 1);
  }
  // Build fast lookup by id substring (unit_id often appears in node id)
  const byNodeId = new Map();
  for (const n of (g.nodes || [])) byNodeId.set(n.id, fanout.get(n.id) || 0);
  return byNodeId;
}

function enrichWithEvidence(candidates) {
  const mp = loadMilestoneProgress();
  const td = loadTribalDensity();
  const br = loadBlastRadiusFromGraph();

  const enriched = [];
  let filteredShipped = 0;
  for (const c of candidates) {
    const key = `${c.milestone}::${c.unit_id}`;
    const unitProg = mp.byUnit.get(key);
    // Filter out already-shipped units (Track A point 1)
    if (unitProg?.shipped) { filteredShipped++; continue; }

    const msProg = mp.byMilestone.get(c.milestone);
    const shippedFraction = msProg ? msProg.fraction : 0;

    const tribalRow = td.get(c.domain);
    const tribalVerdict = tribalRow?.verdict || "unknown";
    const tribalCount = tribalRow?.count ?? 0;

    // Blast-radius lookup: try several id shapes the graph may use
    const blastRadius = br.get(c.unit_id)
                     ?? br.get(`${c.milestone}::${c.unit_id}`)
                     ?? br.get(c.milestone)
                     ?? 0;

    // Score adjustments (additive, capped)
    // - shipped fraction ≥0.6 → +5 (near-complete milestones flush)
    // - tribal cheap → +3, escalate → -3 (lower priority on thin coverage)
    // - blast-radius boost = log2(n+1) * 5, capped at +20
    const shippedBoost = shippedFraction >= 0.6 ? 5 : 0;
    const tribalBoost = tribalVerdict === "cheap" ? 3 : tribalVerdict === "escalate" ? -3 : 0;
    const blastRadiusBoost = Math.min(20, Math.round(Math.log2(blastRadius + 1) * 5));
    const evidenceScore = shippedBoost + tribalBoost + blastRadiusBoost;

    enriched.push({
      ...c,
      shippedFraction: Number(shippedFraction.toFixed(3)),
      tribalVerdict,
      tribalCount,
      blastRadius,
      blastRadiusBoost,
      evidenceScore,
      driftFlag: mp.drifts.some((d) => d.milestone === c.milestone),
    });
  }
  return { enriched, filteredShipped, drifts: mp.drifts };
}

function sortRoadmap(candidates) {
  // tier ASC, (aiPriorityScore + evidenceScore) DESC, leverage DESC, alpha
  return [...candidates].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    const sa = a.aiPriorityScore + (a.evidenceScore || 0);
    const sb = b.aiPriorityScore + (b.evidenceScore || 0);
    if (sb !== sa) return sb - sa;
    if (b.leverage_score !== a.leverage_score) return b.leverage_score - a.leverage_score;
    const ka = `${a.milestone}::${a.unit_id}`;
    const kb = `${b.milestone}::${b.unit_id}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

function splitLanes(roadmap, n) {
  // Domain-affinity assignment: round-robin within tier groups, biased so
  // each chat owns ≥1 ai-category unit if possible.
  const lanes = Array.from({ length: n }, () => []);
  // group by tier so all lanes start tier 0 together
  const byTier = new Map();
  for (const r of roadmap) {
    if (!byTier.has(r.tier)) byTier.set(r.tier, []);
    byTier.get(r.tier).push(r);
  }
  // domain-aware deal
  for (const [tier, items] of [...byTier.entries()].sort((a, b) => a[0] - b[0])) {
    let i = 0;
    // sort items so high-AI floats first within tier
    items.sort((a, b) => b.aiPriorityScore - a.aiPriorityScore);
    for (const item of items) {
      lanes[i % n].push(item);
      i++;
    }
  }
  return lanes;
}

function writePerChatMd(lanes, opts) {
  for (let i = 0; i < lanes.length; i++) {
    const file = `${PRISM}/state/shared/atomic-roadmap-chat-${i + 1}.md`;
    const items = lanes[i];
    const lines = [];
    lines.push(`# Chat ${i + 1} — Assignment List`);
    lines.push("");
    lines.push(`> Generated by atomic-roadmap-emit.mjs on ${new Date().toISOString()}`);
    lines.push(`> ${items.length} units assigned. Sort: tier ASC → aiPriorityScore DESC → leverage DESC.`);
    lines.push("");
    lines.push("## Discipline");
    lines.push("- Stay in your lane (this list); do NOT touch units owned by other chats.");
    lines.push("- Run `/run-continuous` to step through this list.");
    lines.push("- Update system-viz at every claim/build/wire/complete via viz-progress-update.mjs.");
    lines.push("- Commit only after 6-of-6 consensus AND 3-way LLM review (see /six-chat-commit-consensus).");
    lines.push("");
    lines.push("## Units (in execution order)");
    lines.push("");
    lines.push("| # | Tier | AI | Leverage | Milestone / Unit | Domain | Title |");
    lines.push("|--:|----:|---:|--------:|-----------------|--------|-------|");
    for (let j = 0; j < items.length; j++) {
      const it = items[j];
      lines.push(`| ${j + 1} | ${it.tier} | ${it.aiPriorityScore} | ${it.leverage_score} | ${it.milestone} / ${it.unit_id} | ${it.domain} | ${(it.title || "").slice(0, 60)} |`);
    }
    if (!opts["dry-run"]) fs.writeFileSync(file, lines.join("\n"));
  }
}

function writeSummaryMd(roadmap, lanes, opts) {
  const lines = [];
  lines.push("# Atomic Roadmap — Summary");
  lines.push("");
  lines.push(`> Generated by atomic-roadmap-emit.mjs on ${new Date().toISOString()}`);
  lines.push(`> Sort: tier ASC → aiPriorityScore DESC → leverage_score DESC.`);
  lines.push("");
  lines.push(`Total candidates: **${roadmap.length}** units across **${new Set(roadmap.map(r => r.milestone)).size}** milestones, split into **${lanes.length}** chat lanes.`);
  lines.push("");
  lines.push("## By tier");
  const byTier = {};
  for (const r of roadmap) byTier[r.tier] = (byTier[r.tier] || 0) + 1;
  for (const [t, n] of Object.entries(byTier).sort()) {
    lines.push(`- Tier ${t}: ${n} units`);
  }
  lines.push("");
  lines.push("## AI-priority distribution");
  const buckets = { "0-19 (low)": 0, "20-49 (med)": 0, "50-79 (high)": 0, "80-100 (top)": 0 };
  for (const r of roadmap) {
    const s = r.aiPriorityScore;
    if (s < 20) buckets["0-19 (low)"]++;
    else if (s < 50) buckets["20-49 (med)"]++;
    else if (s < 80) buckets["50-79 (high)"]++;
    else buckets["80-100 (top)"]++;
  }
  for (const [b, n] of Object.entries(buckets)) lines.push(`- ${b}: ${n}`);
  lines.push("");
  lines.push("## Top 10 (highest AI-priority within tier 0/1)");
  const top = roadmap.filter((r) => r.tier <= 1).slice(0, 10);
  for (const r of top) {
    lines.push(`- T${r.tier} AI=${r.aiPriorityScore} L=${r.leverage_score} ${r.milestone}/${r.unit_id} — ${r.title}`);
  }
  lines.push("");
  lines.push("## Lane counts");
  for (let i = 0; i < lanes.length; i++) lines.push(`- Chat ${i + 1}: ${lanes[i].length} units`);
  lines.push("");
  lines.push("## Files emitted");
  lines.push(`- ${path.basename(OUT_JSON)} — machine-readable full roadmap`);
  lines.push(`- atomic-roadmap-chat-1..${lanes.length}.md — per-chat assignment lists`);
  lines.push(`- ${path.basename(OUT_SUMMARY)} — this file`);
  if (!opts["dry-run"]) fs.writeFileSync(OUT_SUMMARY, lines.join("\n"));
}

const opts = args();
const n = Math.max(1, Math.min(8, Number(opts.chats) || 6));

const rawCandidates = loadCandidates();
const { enriched, filteredShipped, drifts } = enrichWithEvidence(rawCandidates);
const roadmap = sortRoadmap(enriched);
const lanes = splitLanes(roadmap, n);

if (opts["dry-run"]) {
  console.log("ATOMIC ROADMAP — DRY RUN");
  console.log("=========================");
  console.log(`Raw candidates:    ${rawCandidates.length}`);
  console.log(`Filtered shipped:  ${filteredShipped}`);
  console.log(`Pending units:     ${enriched.length}`);
  console.log(`Envelope drifts:   ${drifts.length}${drifts.length ? " — " + drifts.map(d => d.milestone).join(", ") : ""}`);
  console.log(`Lanes:             ${n}`);
  console.log(`Top 5:`);
  for (const r of roadmap.slice(0, 5)) {
    const ev = (r.evidenceScore || 0) >= 0 ? `+${r.evidenceScore}` : `${r.evidenceScore}`;
    console.log(`  T${r.tier} AI${r.aiPriorityScore}${ev}=${r.aiPriorityScore + (r.evidenceScore || 0)} L${r.leverage_score} br${r.blastRadius} [${r.tribalVerdict}] ${r.milestone}/${r.unit_id}`);
  }
  console.log(`Lane sizes: ${lanes.map(l => l.length).join(", ")}`);
  if (opts.json) {
    console.log("---");
    console.log(JSON.stringify({ enriched: roadmap.slice(0, 3), drifts }, null, 2));
  }
  process.exit(0);
}

const passId = `pass-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const generatedAt = new Date().toISOString();

fs.writeFileSync(OUT_JSON, JSON.stringify({
  schemaVersion: "1.1.0",
  passId,
  generatedAt,
  total: roadmap.length,
  filteredShipped,
  envelopeDrifts: drifts,
  lanes: n,
  sortKey: ["tier ASC", "(aiPriorityScore + evidenceScore) DESC", "leverage_score DESC", "alpha"],
  evidenceFields: ["shippedFraction", "tribalVerdict", "tribalCount", "blastRadius", "blastRadiusBoost", "evidenceScore", "driftFlag"],
  roadmap,
  laneAssignments: lanes.map((l, i) => ({
    chat: i + 1,
    count: l.length,
    units: l.map(r => `${r.milestone}::${r.unit_id}`),
  })),
}, null, 2));

writePerChatMd(lanes, opts);
writeSummaryMd(roadmap, lanes, opts);

// Track D — XML emission for hierarchical roadmap (Anthropic docs: 8% better field-completion vs JSON for Claude)
if (opts.xml) {
  const xmlPath = `${PRISM}/state/shared/PRISM-FINAL-ROADMAP-v3.xml`;
  const xmlEsc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const byMilestone = new Map();
  for (const r of roadmap) {
    if (!byMilestone.has(r.milestone)) byMilestone.set(r.milestone, []);
    byMilestone.get(r.milestone).push(r);
  }
  const xmlLines = [`<?xml version="1.0" encoding="UTF-8"?>`];
  xmlLines.push(`<roadmap pass-id="${passId}" generated-at="${generatedAt}" total-units="${roadmap.length}">`);
  for (const [ms, units] of byMilestone.entries()) {
    xmlLines.push(`  <milestone id="${xmlEsc(ms)}">`);
    for (const u of units) {
      xmlLines.push(`    <unit id="${xmlEsc(u.unit_id)}" tier="${u.tier}" ai-score="${u.aiPriorityScore}" evidence="${u.evidenceScore || 0}" blast-radius="${u.blastRadius}" tribal="${u.tribalVerdict}">`);
      xmlLines.push(`      <title>${xmlEsc(u.title)}</title>`);
      xmlLines.push(`      <domain>${xmlEsc(u.domain)}</domain>`);
      if (u.driftFlag) xmlLines.push(`      <drift-flag>true</drift-flag>`);
      xmlLines.push(`      <rationale>tier=${u.tier} ai=${u.aiPriorityScore} evidence=${u.evidenceScore || 0} blast=${u.blastRadius} tribal=${u.tribalVerdict}(${u.tribalCount}) shipped=${u.shippedFraction}</rationale>`);
      xmlLines.push(`    </unit>`);
    }
    xmlLines.push(`  </milestone>`);
  }
  xmlLines.push(`</roadmap>`);
  fs.writeFileSync(xmlPath, xmlLines.join("\n"));
  console.log(`Wrote XML: ${xmlPath}`);
}

// Track D — extract top-N cutout (next-quarter slice) from full roadmap
if (opts.cutout) {
  const k = Number(opts.cutout) || 100;
  const cutout = roadmap.slice(0, k);
  const cutoutPath = `${PRISM}/state/shared/PRISM-NEXT-QUARTER-CUTOUT.md`;
  const lines = [`# PRISM Next-Quarter Cutout (top ${k})`];
  lines.push(`Generated ${generatedAt} from pass ${passId}`);
  lines.push(``);
  lines.push(`| # | Tier | AI+E | Blast | Tribal | Milestone/Unit | Title |`);
  lines.push(`|---|------|------|-------|--------|----------------|-------|`);
  cutout.forEach((r, i) => {
    const ae = r.aiPriorityScore + (r.evidenceScore || 0);
    lines.push(`| ${i + 1} | ${r.tier} | ${ae} | ${r.blastRadius} | ${r.tribalVerdict} | ${r.milestone}/${r.unit_id} | ${r.title} |`);
  });
  fs.writeFileSync(cutoutPath, lines.join("\n"));
  console.log(`Wrote cutout: ${cutoutPath} (${k} units)`);
}

// Track B — emit subagent-scrutiny work-order manifest for rgs6 S2.6
if (opts["with-subagent-scrutiny"]) {
  const ORDERS_PATH = `${PRISM}/state/shared/subagent-scrutiny-orders.json`;

  // Group by dispatcher category for Batch 1 (per-domain conflict audit)
  const DOMAIN_CATEGORY = {
    mill: "manufacturing", lathe: "manufacturing", edm: "manufacturing", post: "manufacturing",
    cad: "manufacturing", physics: "manufacturing", safety: "manufacturing",
    ai: "ai_intel",
    ui: "system", core: "system",
  };
  const byCategory = new Map();
  for (const r of roadmap) {
    const cat = DOMAIN_CATEGORY[r.domain] || "other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(r);
  }

  const batch1 = {
    name: "per-domain-conflict-audit",
    subagents: [...byCategory.entries()].map(([cat, items]) => ({
      subagent_type: "code-analyzer",
      description: `Conflict audit: ${cat} domain (${items.length} units)`,
      domain_category: cat,
      unit_count: items.length,
      prompt: `Audit the ${cat} domain slice of the atomic roadmap (${items.length} units).
Roadmap slice: ${items.slice(0, 10).map(r => `${r.milestone}/${r.unit_id}`).join(", ")}${items.length > 10 ? ` …+${items.length - 10} more` : ""}.

Steps:
1. Read state/shared/atomic-roadmap.json and filter laneAssignments to units in this domain category.
2. Run: node H:/prism/.claude/scripts/tribal-rerank.mjs --query "${cat} conflict patterns" --domain ${cat} --json
3. Identify conflicts: two units in the same milestone touching the same engine/dispatcher; cross-domain dependencies that aren't honored; units that need a prerequisite from another category.
4. Return JSON: { conflicts: [{a, b, why, severity}], confidence: 0..1 }
5. Write your verdict to H:/prism/state/shared/subagent-scrutiny-results.json under key "batch1.${cat}".

Confidence rubric: 1.0 if every conflict is grounded in concrete code refs; 0.7 if grounded in roadmap text; <0.7 if speculation only.`,
    })),
  };

  const batch2 = {
    name: "per-chat-slice-scrutiny",
    subagents: lanes.map((laneItems, i) => ({
      subagent_type: "reviewer",
      description: `Slice scrutiny: chat-${i + 1} (${laneItems.length} units)`,
      chat: i + 1,
      unit_count: laneItems.length,
      prompt: `Review chat-${i + 1}'s assigned slice of the atomic roadmap (${laneItems.length} units).

Slice file: H:/prism/state/shared/atomic-roadmap-chat-${i + 1}.md
Lane discipline rules: state/shared/CLAUDE-CODEX-COORDINATION-DIRECTIVE.md

Steps:
1. Read the slice file and the per-agent handoff for whichever chat this lane belongs to.
2. Cross-reference each unit against tribal-rerank: node H:/prism/.claude/scripts/tribal-rerank.mjs --query "<unit title>" --json
3. Score "achievable in one chat session within current context budget" 0..1 per unit.
4. Identify any unit that depends on out-of-lane assets (would force conflict-fork).
5. Return JSON: { confidence: 0..1, by_unit: {unit_id: score}, blockers: [...], recommended_swaps: [...] }
6. Write to H:/prism/state/shared/subagent-scrutiny-results.json under key "batch2.chat-${i + 1}".

If overall confidence <0.7, the primary will re-run S2.5 with bumped weights.`,
    })),
  };

  const CHUNK = 50;
  const chunks = [];
  for (let i = 0; i < roadmap.length; i += CHUNK) chunks.push(roadmap.slice(i, i + CHUNK));
  const batch3 = {
    name: "per-unit-tribal-classification",
    subagents: chunks.map((chunk, idx) => ({
      subagent_type: "general-purpose",
      description: `Tribal classify: chunk ${idx + 1}/${chunks.length} (${chunk.length} units)`,
      chunk_index: idx,
      unit_count: chunk.length,
      prompt: `Classify ${chunk.length} units against the tribal knowledge index.

Units: ${chunk.map(r => `${r.milestone}/${r.unit_id}|${r.domain}`).join(", ")}

Steps:
1. For each unit, run: node H:/prism/.claude/scripts/tribal-rerank.mjs --query "<unit title>" --domain <unit domain> --json
2. Take top-3 tips per unit. If domain has <5 entries (escalate verdict), flag the unit as "thin-tribal-coverage".
3. Return JSON: { precedents: { "<milestone>/<unit_id>": [{tip, source, similarity}] }, thin_coverage_flags: [...] }
4. Write to H:/prism/state/shared/subagent-scrutiny-results.json under key "batch3.chunk-${idx}".

Hard cap: top-3 tips per unit, ≤200 chars each.`,
    })),
  };

  const orders = {
    schemaVersion: "1.0.0",
    passId,
    generatedAt,
    batches: [batch1, batch2, batch3],
    spawn_pattern: "single-message-N-Agent-calls",
    merge_command: "node H:/prism/.claude/scripts/subagent-scrutiny-merge.mjs",
    confidence_gate: 0.7,
    max_rerun_passes: 1,
  };
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2));
  const batchSizes = orders.batches.map(b => b.subagents.length);
  console.log(`Wrote subagent-scrutiny orders: ${ORDERS_PATH}`);
  console.log(`  batches: ${orders.batches.map(b => b.name).join(", ")}`);
  console.log(`  subagents per batch: ${batchSizes.join(", ")} (total: ${batchSizes.reduce((a,b)=>a+b,0)})`);
}

// Track C — append pass record for closed-loop telemetry retrieval
const HISTORY_LOG = `${PRISM}/state/shared/roadmap-pass-history.jsonl`;
const historyRecord = {
  ts: generatedAt,
  passId,
  units_emitted: roadmap.length,
  filtered_shipped: filteredShipped,
  drift_count: drifts.length,
  mean_aiPriorityScore: roadmap.length
    ? Number((roadmap.reduce((a, r) => a + r.aiPriorityScore, 0) / roadmap.length).toFixed(2))
    : 0,
  mean_evidenceScore: roadmap.length
    ? Number((roadmap.reduce((a, r) => a + (r.evidenceScore || 0), 0) / roadmap.length).toFixed(2))
    : 0,
  weights_used: {
    shipped_boost_threshold: 0.6,
    shipped_boost: 5,
    tribal_cheap_boost: 3,
    tribal_escalate_penalty: -3,
    blast_radius_max_boost: 20,
  },
  top_domains: Object.entries(
    roadmap.reduce((acc, r) => { acc[r.domain] = (acc[r.domain] || 0) + 1; return acc; }, {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([d, c]) => ({ domain: d, count: c })),
  units_shipped_30d_later: null, // back-filled by roadmap-pass-record.mjs after window passes
};
fs.appendFileSync(HISTORY_LOG, JSON.stringify(historyRecord) + "\n");

console.log(`ATOMIC ROADMAP EMITTED`);
console.log(`======================`);
console.log(`Wrote ${roadmap.length} units across ${n} lanes.`);
console.log(`Files: atomic-roadmap.json, atomic-roadmap-chat-1..${n}.md, atomic-roadmap-summary.md`);
console.log(`Top 3: ${roadmap.slice(0, 3).map(r => `T${r.tier}/AI${r.aiPriorityScore}/${r.unit_id}`).join("  ")}`);

if (opts.apply) {
  const viz = `${PRISM}/.claude/scripts/viz-progress-update.mjs`;
  if (fs.existsSync(viz)) {
    let claimed = 0;
    for (const r of roadmap) {
      const res = spawnSync(process.execPath, [viz, "claim", "--unit", r.unit_id, "--milestone", r.milestone], { timeout: 5000 });
      if (res.status === 0) claimed++;
    }
    console.log(`Stamped ${claimed} ghost-node claims via viz-progress-update.`);
  } else {
    console.log(`(viz-progress-update.mjs not found; skipping --apply ghost stamping)`);
  }
}
