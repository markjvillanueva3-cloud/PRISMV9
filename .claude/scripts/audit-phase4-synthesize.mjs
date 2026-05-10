#!/usr/bin/env node
// audit-phase4-synthesize.mjs
// Phase 4 — synthesis: emit AUDIT-LATEST.{json,md} + audit-overlay.json + AUDIT-DELTA.md
//
// Reads:
//   - phase0_awareness.json       (cached awareness)
//   - phase2_crossdomain.json     (bridges, cycles, doctrine, dead-code)
//   - agent-findings-v{N}/ tree   (phase 1 substitute on first ship)
//   - audit-baseline.json         (delta source)
//   - CODE_SYSTEM_INDEX.json      (shortcode resolution)
//   - knowledge/wiki/index.md     (prior-art dedup)
//
// Spec §95-105.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "H:/prism";
const SHARED = join(ROOT, "state/shared");
const VIZ = join(SHARED, "system-viz");
const ARGS = process.argv.slice(2);

function flagValue(name) {
  const i = ARGS.indexOf(name);
  return i >= 0 && i < ARGS.length - 1 ? ARGS[i + 1] : null;
}
const VERBOSE = ARGS.includes("--verbose");
const FINDINGS_DIR = flagValue("--findings-dir") || join(VIZ, "agent-findings-v3");
const BASELINE_PATH = flagValue("--baseline") || join(SHARED, "audit-baseline.json");

function log(...m) { if (VERBOSE) console.log("[ph4]", ...m); }
function readJsonOrNull(p) {
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

// ── load inputs ─────────────────────────────────────────────────────────────
const awareness = readJsonOrNull(join(VIZ, "phase0_awareness.json")) || {};
const phase2 = readJsonOrNull(join(VIZ, "phase2_crossdomain.json")) || {};
const codeIndex = readJsonOrNull(
  join(ROOT, "mcp-server/data/docs/CODE_SYSTEM_INDEX.json"),
) || { reverse: {} };
const wikiIndexText = (() => {
  const p = join(ROOT, "knowledge/wiki/index.md");
  return existsSync(p) ? readFileSync(p, "utf8") : "";
})();
const wikiSlugs = new Set(
  (wikiIndexText.match(/^- \[\[([^\]]+)\]\]/gm) || []).map((l) =>
    l.replace(/^- \[\[/, "").replace(/\]\].*$/, "").toLowerCase(),
  ),
);

// ── per-domain v3 findings (phase 1 substitute) ─────────────────────────────
function loadFindings() {
  if (!existsSync(FINDINGS_DIR)) return { perDomain: [], totals: {} };
  const files = readdirSync(FINDINGS_DIR).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_"),
  );
  const perDomain = [];
  for (const f of files) {
    const j = readJsonOrNull(join(FINDINGS_DIR, f));
    if (!j) continue;
    perDomain.push({
      domain: j.domain || f.replace(/\.json$/, ""),
      agent: j.agent || "v3-singleton",
      confidence: j.confidence || 0,
      gaps: j.gaps || [],
      conflicts: j.conflicts || [],
      opportunities: j.opportunities || [],
      dead_code: j.dead_code || [],
      memory_proposals: j.obsidian_memory_proposed || [],
      recommended_unit: j.recommended_next_unit || null,
    });
  }
  const totals = {
    domains: perDomain.length,
    gaps: perDomain.reduce((s, d) => s + d.gaps.length, 0),
    conflicts: perDomain.reduce((s, d) => s + d.conflicts.length, 0),
    opportunities: perDomain.reduce((s, d) => s + d.opportunities.length, 0),
    dead_code: perDomain.reduce((s, d) => s + d.dead_code.length, 0),
    memory_proposals: perDomain.reduce((s, d) => s + d.memory_proposals.length, 0),
    avgConfidence: perDomain.length
      ? +(perDomain.reduce((s, d) => s + d.confidence, 0) / perDomain.length).toFixed(3)
      : 0,
  };
  log(`findings: ${totals.domains} domains, ${totals.gaps} gaps, ${totals.dead_code} dead`);
  return { perDomain, totals };
}

// ── shortcode resolution ────────────────────────────────────────────────────
function resolveShortcode(path) {
  if (!path) return "";
  // codeIndex.reverse keys are repo-relative POSIX paths
  const norm = path.replace(/\\/g, "/").replace(/^.*?(mcp-server\/)/, "$1");
  return codeIndex.reverse?.[norm] || "";
}

// ── wiki precheck ───────────────────────────────────────────────────────────
function isInWiki(text) {
  if (!text || wikiSlugs.size === 0) return false;
  const t = text.toLowerCase();
  // Token match: any wiki slug whose tokens all appear in text
  for (const slug of wikiSlugs) {
    const tokens = slug.split(/[_\-\s]+/).filter((x) => x.length > 3);
    if (tokens.length >= 2 && tokens.every((tok) => t.includes(tok))) return true;
  }
  return false;
}

// ── overlay computation ─────────────────────────────────────────────────────
// We need raw nodes from system-graph for full-fidelity coloring.
// Phase 0 cached only orphan IDs and counts; for color we need {testCount,
// totalKnowledgeBytes, inbound, outbound} per node. Cheap: re-read once here.
function loadGraphForOverlay() {
  const p = join(VIZ, "system-graph.json");
  if (!existsSync(p)) return null;
  log(`loading graph for overlay (${(statSync(p).size / 1e6).toFixed(1)}MB)`);
  return JSON.parse(readFileSync(p, "utf8"));
}

function computeOverlay(graph, deadCodeIds, bridgeNodeIds) {
  const inbound = new Map();
  for (const e of graph.edges) {
    inbound.set(e.to, (inbound.get(e.to) || 0) + 1);
  }
  const stats = { green: 0, yellow: 0, red: 0, blue: 0, uncolored: 0 };
  const nodes = [];

  for (const n of graph.nodes) {
    const inEdges = inbound.get(n.id) || 0;
    const tested = (n.awareness?.testCount || 0) > 0;
    const documented = (n.knowledge?.totalKnowledgeBytes || 0) > 0;
    const importance = n.awareness?.svi || 0;
    const path =
      n.path ||
      n.file ||
      (n.id?.includes("/") ? n.id : null) ||
      "";

    let color = null;
    let reason = "";

    if (bridgeNodeIds.has(n.id)) {
      color = "blue";
      reason = "intra-domain pair shares hub but no direct edge — bridge candidate";
    } else if (
      inEdges === 0 &&
      importance > 0 &&
      n.layer !== "L0" && // personas don't need inbound
      n.subgroup !== "concepts" &&
      n.subgroup !== "doctrine"
    ) {
      color = "red";
      reason = "orphan (zero inbound edges, importance>0)";
    } else if (deadCodeIds.has(n.id)) {
      color = "red";
      reason = "agent-flagged dead-code candidate";
    } else if (inEdges > 0 && tested && documented) {
      color = "green";
      reason = "wired + tested + documented";
    } else if (inEdges > 0) {
      const missing = [];
      if (!tested) missing.push("tests");
      if (!documented) missing.push("docs");
      color = "yellow";
      reason = `wired, missing: ${missing.join(",")}`;
    } else {
      stats.uncolored++;
      continue;
    }

    stats[color]++;
    nodes.push({
      nodeId: n.id,
      color,
      reason,
      shortcode: resolveShortcode(path),
      domain: n.subgroup || n.layer || "other",
      importance: +importance.toFixed(3),
    });
  }
  return { stats, nodes };
}

// ── synthesize findings list with dedup ─────────────────────────────────────
function synthesizeFindings(findings, phase2) {
  const out = [];
  let suppressed = 0;
  let total = 0;

  for (const d of findings.perDomain) {
    for (const g of d.gaps) {
      total++;
      const desc = typeof g === "string" ? g : g.what || JSON.stringify(g);
      if (isInWiki(desc)) { suppressed++; continue; }
      out.push({
        kind: "gap",
        domain: d.domain,
        confidence: d.confidence,
        what: desc,
        evidence: g.evidence || [],
        impact: g.impact || g.severity || null,
      });
    }
    for (const c of d.conflicts) {
      total++;
      const desc = c.summary || c.what || c.title || JSON.stringify(c).slice(0, 200);
      if (isInWiki(desc)) { suppressed++; continue; }
      out.push({
        kind: "conflict", domain: d.domain, what: desc,
        between: c.between || c.files || [], rationale: c.rationale || null,
      });
    }
    for (const dc of d.dead_code) {
      total++;
      out.push({
        kind: "dead_code", domain: d.domain,
        path: dc.path, reason: dc.reason,
        shortcode: resolveShortcode(dc.path),
        deleteRequiresConsensus: true,
      });
    }
    for (const op of d.opportunities) {
      total++;
      const desc = typeof op === "string" ? op : op.what || op.title || JSON.stringify(op).slice(0, 200);
      if (isInWiki(desc)) { suppressed++; continue; }
      out.push({
        kind: "opportunity", domain: d.domain, what: desc,
        leverage: op.leverage || op.priority || null,
      });
    }
  }
  for (const v of phase2.doctrineViolations || []) {
    total++;
    out.push({
      kind: "doctrine", file: v.file, line: v.line, ruleId: v.ruleId,
      label: v.label, severity: v.severity, fix: v.fix,
      shortcode: resolveShortcode(v.file),
    });
  }
  return { findings: out, suppressed, total, dedupRate: total ? +(suppressed / total).toFixed(3) : 0 };
}

// ── markdown rendering ──────────────────────────────────────────────────────
function renderAuditMd(payload, overlay) {
  const lines = [];
  lines.push("# AUDIT-LATEST");
  lines.push(`Generated: ${payload.generatedAt}`);
  lines.push("");
  lines.push("## Stats");
  lines.push(`- Findings: ${payload.findings.length} (suppressed by wiki: ${payload.suppression.suppressed}, dedup rate: ${(payload.suppression.dedupRate * 100).toFixed(1)}%)`);
  lines.push(`- Domains scrutinized: ${payload.totals.domains}, avg confidence: ${payload.totals.avgConfidence}`);
  lines.push(`- Phase 2: bridges=${payload.phase2Stats.bridges} cycles=${payload.phase2Stats.cycles} doctrine=${payload.phase2Stats.doctrineViolations} dead=${payload.phase2Stats.deadCodeCandidates}`);
  lines.push(`- Overlay: green=${overlay.stats.green} yellow=${overlay.stats.yellow} red=${overlay.stats.red} blue=${overlay.stats.blue} uncolored=${overlay.stats.uncolored}`);
  lines.push("");

  const byKind = {};
  for (const f of payload.findings) (byKind[f.kind] ||= []).push(f);

  for (const kind of ["doctrine", "gap", "conflict", "dead_code", "opportunity"]) {
    if (!byKind[kind]?.length) continue;
    lines.push(`## ${kind.toUpperCase()} (${byKind[kind].length})`);
    for (const f of byKind[kind].slice(0, 50)) {
      const tag = f.shortcode ? `\`${f.shortcode}\` ` : "";
      const dom = f.domain ? `[${f.domain}] ` : "";
      const text = f.what || f.label || f.reason || JSON.stringify(f).slice(0, 200);
      lines.push(`- ${tag}${dom}${text}`);
    }
    if (byKind[kind].length > 50) lines.push(`- … +${byKind[kind].length - 50} more`);
    lines.push("");
  }
  return lines.join("\n");
}

function renderDeltaMd(current, baseline) {
  const lines = [];
  lines.push("# AUDIT-DELTA");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  if (!baseline) {
    lines.push("_No baseline — first run; current snapshot becomes baseline._");
    return lines.join("\n");
  }
  const dGap = (current.findings.length) - (baseline.findings_count || 0);
  const dGreen = (current.overlayStats?.green || 0) - (baseline.overlay_stats?.green || 0);
  const dRed = (current.overlayStats?.red || 0) - (baseline.overlay_stats?.red || 0);
  lines.push(`- Findings: ${current.findings.length} (Δ ${dGap >= 0 ? "+" : ""}${dGap} vs baseline)`);
  lines.push(`- Green nodes: ${current.overlayStats?.green || 0} (Δ ${dGreen >= 0 ? "+" : ""}${dGreen})`);
  lines.push(`- Red orphans: ${current.overlayStats?.red || 0} (Δ ${dRed >= 0 ? "+" : ""}${dRed})`);
  lines.push("");
  lines.push("Baseline timestamp: " + (baseline.generatedAt || "unknown"));
  return lines.join("\n");
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  log("phase4: synthesis");
  const findings = loadFindings();
  const graph = loadGraphForOverlay();

  const deadCodeIds = new Set();
  for (const d of findings.perDomain)
    for (const dc of d.dead_code)
      if (dc.path) deadCodeIds.add(dc.path);
  for (const dc of phase2.deadCodeCandidates || []) deadCodeIds.add(dc.id);

  const bridgeNodeIds = new Set();
  for (const b of phase2.bridges || []) {
    bridgeNodeIds.add(b.a);
    bridgeNodeIds.add(b.b);
  }

  const overlay = graph
    ? computeOverlay(graph, deadCodeIds, bridgeNodeIds)
    : { stats: { green: 0, yellow: 0, red: 0, blue: 0, uncolored: 0 }, nodes: [] };

  const synth = synthesizeFindings(findings, phase2);

  const auditPayload = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    sourceAwareness: "state/shared/system-viz/phase0_awareness.json",
    findings: synth.findings,
    suppression: { suppressed: synth.suppressed, total: synth.total, dedupRate: synth.dedupRate },
    totals: findings.totals,
    phase2Stats: phase2.stats || {},
    overlayStats: overlay.stats,
    overlayPath: "state/shared/system-viz/audit-overlay.json",
  };

  // 1. AUDIT-LATEST.json (machine — rgs6 ingests)
  writeFileSync(join(SHARED, "AUDIT-LATEST.json"), JSON.stringify(auditPayload, null, 2));

  // 2. AUDIT-LATEST.md (human review)
  writeFileSync(join(SHARED, "AUDIT-LATEST.md"), renderAuditMd(auditPayload, overlay));

  // 3. audit-overlay.json ★ load-bearing
  const overlayDoc = {
    schemaVersion: "1.0.0",
    generatedAt: auditPayload.generatedAt,
    sourceAudit: "state/shared/AUDIT-LATEST.json",
    systemGraphSha: awareness.layers?.systemGraph?.sha || null,
    nodeCount: overlay.nodes.length,
    stats: overlay.stats,
    nodes: overlay.nodes,
  };
  writeFileSync(join(VIZ, "audit-overlay.json"), JSON.stringify(overlayDoc, null, 2));

  // 4. AUDIT-DELTA.md
  const baseline = readJsonOrNull(BASELINE_PATH);
  writeFileSync(join(SHARED, "AUDIT-DELTA.md"), renderDeltaMd(auditPayload, baseline));

  console.log(`phase4: emitted 4 artifacts`);
  console.log(
    `phase4: findings=${synth.findings.length} suppressed=${synth.suppressed} dedup=${(synth.dedupRate * 100).toFixed(1)}%`,
  );
  console.log(
    `phase4: overlay green=${overlay.stats.green} yellow=${overlay.stats.yellow} red=${overlay.stats.red} blue=${overlay.stats.blue}`,
  );
}

main().catch((e) => {
  console.error("phase4 failed:", e);
  process.exit(1);
});
