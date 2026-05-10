#!/usr/bin/env node
// aggregate-agent-findings.mjs — fold per-domain v3 scrutiny JSONs into a single envelope.
//
// Input:  H:/prism/state/shared/system-viz/agent-findings-v3/<domain>.json (excluding _ prefix)
// Output:
//   H:/prism/state/shared/system-viz/agent-findings-v3/_AGGREGATE.json
//   H:/prism/state/shared/system-viz/agent-findings-v3/_AGGREGATE.md
//
// Schema (per-input):
// { schemaVersion, domain, agent, scrutinizedAt, summary, stage_coverage,
//   confidence, gaps[], conflicts[], opportunities[], dead_code[],
//   obsidian_memory_proposed[], recommended_next_unit, _provenance? }
//
// Aggregate adds:
// - all_gaps / all_conflicts / all_opportunities / all_dead_code each tagged with `domain` source
// - obsidian_memory_proposed flattened with domain prefix on filename to avoid collision
// - stats: domain_count, avg_confidence, stage_coverage_distribution, total_<thing>_count
// - cross-domain conflicts: groups by .what containing same engine path
// - recommended_units list (one per domain)

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = "H:/prism/state/shared/system-viz/agent-findings-v3";
const ARGS = new Set(process.argv.slice(2));
const VERBOSE = ARGS.has("--verbose");

function log(...m) { if (VERBOSE) console.log(...m); }

function loadDomains() {
  const files = readdirSync(ROOT)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => !f.startsWith("_"));
  const out = [];
  for (const f of files) {
    try {
      const raw = readFileSync(join(ROOT, f), "utf8");
      const obj = JSON.parse(raw);
      if (!obj.domain) obj.domain = basename(f, ".json");
      out.push({ file: f, ...obj });
    } catch (e) {
      console.warn(`! skip ${f}: ${e.message}`);
    }
  }
  return out.sort((a, b) => a.domain.localeCompare(b.domain));
}

function tag(arr, key, domain) {
  return (arr || []).map((x) => ({ domain, ...x }));
}

function groupCrossDomainConflicts(allGaps, allConflicts) {
  // Heuristic: any path-like token appearing in evidence of >1 domain's gaps
  // OR any engine name appearing in conflicts.ours/theirs of >1 domain.
  const pathDomain = new Map(); // path → Set<domain>
  for (const g of allGaps) {
    for (const ev of g.evidence || []) {
      const pathOnly = ev.split(":")[0].trim();
      if (!pathOnly.includes("/")) continue;
      if (!pathDomain.has(pathOnly)) pathDomain.set(pathOnly, new Set());
      pathDomain.get(pathOnly).add(g.domain);
    }
  }
  const cross = [];
  for (const [path, domains] of pathDomain.entries()) {
    if (domains.size > 1) {
      cross.push({ path, domains: [...domains].sort() });
    }
  }
  return cross.sort((a, b) => b.domains.length - a.domains.length).slice(0, 25);
}

function buildAggregate(domains) {
  const allGaps = domains.flatMap((d) => tag(d.gaps, "gaps", d.domain));
  const allConflicts = domains.flatMap((d) => tag(d.conflicts, "conflicts", d.domain));
  const allOpportunities = domains.flatMap((d) => tag(d.opportunities, "opportunities", d.domain));
  const allDeadCode = domains.flatMap((d) => tag(d.dead_code, "dead_code", d.domain));

  const memoryProposals = [];
  for (const d of domains) {
    for (const m of d.obsidian_memory_proposed || []) {
      memoryProposals.push({
        ...m,
        sourceDomain: d.domain,
        // Don't rename filenames; downstream merge script can dedupe
      });
    }
  }

  const recommendedUnits = domains
    .filter((d) => d.recommended_next_unit)
    .map((d) => ({ domain: d.domain, unit: d.recommended_next_unit }));

  const confidences = domains.map((d) => Number(d.confidence) || 0).filter((v) => v > 0);
  const avgConfidence = confidences.length
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0;

  const stageCoverage = {};
  for (const d of domains) {
    const s = d.stage_coverage || "unknown";
    stageCoverage[s] = (stageCoverage[s] || 0) + 1;
  }

  const highLeverageOpportunities = allOpportunities.filter((o) => o.leverage === "high");

  return {
    schemaVersion: "1.0.0",
    aggregateOf: "agent-findings-v3",
    aggregatedAt: new Date().toISOString(),
    sourceCount: domains.length,
    domains: domains.map((d) => ({
      domain: d.domain,
      agent: d.agent,
      stage_coverage: d.stage_coverage,
      confidence: d.confidence,
      summary: d.summary,
      recommended_next_unit: d.recommended_next_unit,
      gaps_n: (d.gaps || []).length,
      conflicts_n: (d.conflicts || []).length,
      opportunities_n: (d.opportunities || []).length,
      dead_code_n: (d.dead_code || []).length,
      memories_proposed_n: (d.obsidian_memory_proposed || []).length,
    })),
    stats: {
      total_gaps: allGaps.length,
      total_conflicts: allConflicts.length,
      total_opportunities: allOpportunities.length,
      total_dead_code: allDeadCode.length,
      total_memories_proposed: memoryProposals.length,
      high_leverage_opportunities: highLeverageOpportunities.length,
      avg_confidence: Number(avgConfidence.toFixed(3)),
      stage_coverage_distribution: stageCoverage,
    },
    cross_domain_conflicts: groupCrossDomainConflicts(allGaps, allConflicts),
    high_leverage_opportunities: highLeverageOpportunities,
    recommended_units_by_domain: recommendedUnits,
    all_gaps: allGaps,
    all_conflicts: allConflicts,
    all_opportunities: allOpportunities,
    all_dead_code: allDeadCode,
    memory_proposals: memoryProposals,
  };
}

function renderMarkdown(agg) {
  const L = [];
  L.push(`# v3 Agent Findings — Aggregate (${agg.sourceCount} domains)`);
  L.push("");
  L.push(`Aggregated: ${agg.aggregatedAt}`);
  L.push(`Avg confidence: ${agg.stats.avg_confidence}`);
  L.push("");
  L.push(`## Stats`);
  L.push("");
  L.push(`- Total gaps: **${agg.stats.total_gaps}**`);
  L.push(`- Total conflicts: **${agg.stats.total_conflicts}**`);
  L.push(`- Total opportunities: **${agg.stats.total_opportunities}** (high-leverage: ${agg.stats.high_leverage_opportunities})`);
  L.push(`- Total dead-code candidates: **${agg.stats.total_dead_code}**`);
  L.push(`- Memory proposals: **${agg.stats.total_memories_proposed}**`);
  L.push(`- Stage coverage: ${JSON.stringify(agg.stats.stage_coverage_distribution)}`);
  L.push("");
  L.push(`## Per-Domain Summary`);
  L.push("");
  L.push(`| Domain | Stage | Conf | Gaps | Conf. | Opp. | Dead | Mem | Next Unit |`);
  L.push(`|--------|-------|------|------|-------|------|------|-----|-----------|`);
  for (const d of agg.domains) {
    L.push(
      `| ${d.domain} | ${d.stage_coverage || "?"} | ${d.confidence ?? "?"} | ${d.gaps_n} | ${d.conflicts_n} | ${d.opportunities_n} | ${d.dead_code_n} | ${d.memories_proposed_n} | ${d.recommended_next_unit || "—"} |`
    );
  }
  L.push("");

  if (agg.cross_domain_conflicts.length) {
    L.push(`## Cross-Domain Conflicts (paths cited by ≥2 domains)`);
    L.push("");
    for (const c of agg.cross_domain_conflicts) {
      L.push(`- \`${c.path}\` — domains: ${c.domains.join(", ")}`);
    }
    L.push("");
  }

  if (agg.high_leverage_opportunities.length) {
    L.push(`## High-Leverage Opportunities`);
    L.push("");
    for (const o of agg.high_leverage_opportunities) {
      L.push(`- **${o.domain}**: ${o.what}${o.prereq ? ` _(prereq: ${o.prereq})_` : ""}`);
    }
    L.push("");
  }

  L.push(`## Recommended Next Units`);
  L.push("");
  for (const r of agg.recommended_units_by_domain) {
    L.push(`- ${r.domain} → \`${r.unit}\``);
  }
  L.push("");

  L.push(`## All Gaps (sorted by domain)`);
  L.push("");
  for (const g of agg.all_gaps) {
    L.push(`### [${g.domain}] ${g.what}`);
    L.push("");
    if (g.evidence?.length) {
      L.push(`**Evidence:**`);
      for (const e of g.evidence) L.push(`- \`${e}\``);
    }
    if (g.impact) L.push(`\n**Impact:** ${g.impact}`);
    if (g.suggested_unit) L.push(`\n**Unit:** \`${g.suggested_unit}\``);
    L.push("");
  }

  if (agg.memory_proposals.length) {
    L.push(`## Proposed Obsidian Memory Entries`);
    L.push("");
    for (const m of agg.memory_proposals) {
      L.push(`### \`${m.filename}\` (${m.type}) — from ${m.sourceDomain}`);
      L.push("");
      L.push(m.body);
      L.push("");
    }
  }

  return L.join("\n");
}

function main() {
  const domains = loadDomains();
  if (!domains.length) {
    console.error("no domain files found in", ROOT);
    process.exit(1);
  }
  log(`loaded ${domains.length} domains:`, domains.map((d) => d.domain).join(", "));

  const agg = buildAggregate(domains);
  const jsonPath = join(ROOT, "_AGGREGATE.json");
  const mdPath = join(ROOT, "_AGGREGATE.md");

  writeFileSync(jsonPath, JSON.stringify(agg, null, 2));
  writeFileSync(mdPath, renderMarkdown(agg));

  console.log(`wrote ${jsonPath}`);
  console.log(`wrote ${mdPath}`);
  console.log(`domains=${agg.sourceCount} gaps=${agg.stats.total_gaps} conflicts=${agg.stats.total_conflicts} opps=${agg.stats.total_opportunities} (high=${agg.stats.high_leverage_opportunities}) dead=${agg.stats.total_dead_code} mem=${agg.stats.total_memories_proposed} avgConf=${agg.stats.avg_confidence}`);
}

main();
