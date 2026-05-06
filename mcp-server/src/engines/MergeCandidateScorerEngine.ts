/**
 * MergeCandidateScorerEngine — score peer-only assets from
 * PeerRepoSignatureEngine output to surface high-value merge candidates
 * for review (P16-U02 → P16-U03).
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P16-U02.
 *
 * Why this exists
 * ---------------
 * P16-U01 produced per-peer signature JSONs with `unique_to_peer` sets:
 * each set lists assets present in that peer but NOT in canonical PRISM.
 * 41 peers × ~0-57 unique engines apiece = a large, noisy backlog.
 *
 * This engine ranks the backlog so a human reviewer can focus on the
 * best candidates. Heuristics:
 *   1. **Peer cardinality** — how many peers carry this asset?
 *      (high = battle-tested across multiple shops)
 *   2. **Infra-name signal** — does the basename match infrastructure
 *      vocabulary (registry, hook, gate, audit, sync, monitor, classifier)?
 *      vs. domain-specific signal (already filtered upstream by
 *      PeerRepoSignatureEngine.isMachiningSpecific).
 *   3. **Asset kind weight** — hooks > skills > engines > dispatchers > scripts
 *      (hooks are usually pure infra; engines often carry domain logic)
 *   4. **Lane filter** — assets present in the "lead" peer (typically the
 *      caller's own iooms0 lane) are deprioritized because they will land
 *      via the lane's natural branch merge anyway.
 *
 * Pure functions; no fs I/O. The driver
 * (scripts/peer-repo-merge-candidates.mjs) reads the signature JSONs and
 * feeds in PerRepoUniques records.
 *
 * @module engines/MergeCandidateScorerEngine
 */

import type { PerRepoUniques } from "./PeerRepoSignatureEngine.js";

const INFRA_NAME_FRAGMENTS = [
  "registry", "audit", "sync", "monitor", "classifier", "router",
  "gate", "guard", "ledger", "memory", "session", "consensus",
  "scheduler", "queue", "worker", "throttle", "rate-limit", "ratelimit",
  "token", "bridge", "exporter", "importer", "ingest", "extractor",
  "embedder", "encoder", "decoder", "wiring", "dispatcher", "schema",
  "snapshot", "checkpoint", "rollback", "migration", "migrator",
  "telemetry", "observability", "metric", "drift", "regression",
  "consolidation", "reasoner", "orchestrator",
];

const DOMAIN_LATE_FILTER = [
  "thread", "drill", "ream", "tap", "groove", "bore", "turn",
  "mill", "lathe", "wedm", "grind", "hob", "broach",
];

const KIND_WEIGHTS: Record<MergeAssetKind, number> = {
  hook: 1.0,
  skill: 0.85,
  dispatcher: 0.8,
  engine: 0.7,
  script: 0.5,
};

export type MergeAssetKind = "engine" | "dispatcher" | "hook" | "skill" | "script";

export interface AssetEntry {
  kind: MergeAssetKind;
  name: string;       // basename without extension
  peers: string[];    // repo_root list — sorted, deduped
  peer_count: number; // peers.length
}

export interface ScoredAsset extends AssetEntry {
  /** 0…1 — fraction of peer name fragments that look like infra. */
  infra_score: number;
  /** Final composite ranking score; higher = better candidate. */
  score: number;
  /** True if asset is ALSO present in the lead-lane peer (will merge naturally). */
  in_lead_lane: boolean;
  /** Provenance — which peer's signature first surfaced this asset. */
  first_seen_in: string;
}

export interface ScoringConfig {
  /** Lead-lane repo (e.g. "H:/prism-iooms0") whose findings will merge naturally. */
  leadLane?: string;
  /** Filter out assets with score below this threshold. */
  minScore?: number;
  /** Cap the candidate list. */
  topN?: number;
}

export interface CandidateReport {
  totalAssets: number;
  scoredAssets: number;
  candidates: ScoredAsset[];
  byKind: Record<MergeAssetKind, number>;
}

export class MergeCandidateScorerEngine {
  /**
   * Aggregate per-peer unique-asset arrays into a single asset → peers map,
   * deduping the same `kind:name` pair across multiple peers.
   */
  buildAssetIndex(perRepo: readonly PerRepoUniques[]): AssetEntry[] {
    if (!Array.isArray(perRepo)) return [];
    const map = new Map<string, AssetEntry>();
    for (const r of perRepo) {
      if (!r || typeof r !== "object") continue;
      const repoRoot = typeof r.repo_root === "string" ? r.repo_root : "";
      const u = r.unique_to_peer;
      if (!u || typeof u !== "object") continue;
      this.collectKind(map, repoRoot, "engine", u.engines);
      this.collectKind(map, repoRoot, "dispatcher", u.dispatchers);
      this.collectKind(map, repoRoot, "hook", u.hooks);
      this.collectKind(map, repoRoot, "skill", u.skills);
      this.collectKind(map, repoRoot, "script", u.scripts);
    }
    const out: AssetEntry[] = [];
    for (const e of map.values()) {
      e.peers.sort();
      e.peer_count = e.peers.length;
      out.push(e);
    }
    out.sort((a, b) =>
      b.peer_count - a.peer_count
      || a.kind.localeCompare(b.kind)
      || a.name.localeCompare(b.name)
    );
    return out;
  }

  /**
   * Score a single asset entry. Pure function — does not depend on the
   * full backlog. Composite formula:
   *   score = (peer_count_norm * 0.5 + infra_score * 0.3 + kind_weight * 0.2)
   *           * lead_lane_penalty
   * where peer_count_norm is min(peer_count, 10) / 10 and lead_lane_penalty
   * is 0.5 when the lead lane already carries the asset, 1.0 otherwise.
   */
  scoreAsset(entry: AssetEntry, config: ScoringConfig = {}): ScoredAsset {
    const safe: AssetEntry = {
      kind: entry?.kind ?? "engine",
      name: entry?.name ?? "",
      peers: Array.isArray(entry?.peers) ? entry.peers : [],
      peer_count: typeof entry?.peer_count === "number" ? entry.peer_count : 0,
    };
    const infraScore = this.computeInfraScore(safe.name);
    const kindWeight = KIND_WEIGHTS[safe.kind] ?? 0.5;
    const peerCountNorm = Math.min(safe.peer_count, 10) / 10;
    const inLeadLane = typeof config.leadLane === "string" && config.leadLane.length > 0
      ? safe.peers.includes(config.leadLane)
      : false;
    const leadLanePenalty = inLeadLane ? 0.5 : 1.0;
    const composite = (peerCountNorm * 0.5 + infraScore * 0.3 + kindWeight * 0.2) * leadLanePenalty;
    return {
      ...safe,
      infra_score: infraScore,
      score: Number(composite.toFixed(4)),
      in_lead_lane: inLeadLane,
      first_seen_in: safe.peers[0] ?? "",
    };
  }

  /**
   * Compute a 0…1 score reflecting how "infrastructure-y" the basename
   * looks, based on INFRA_NAME_FRAGMENTS membership. Subtracts from the
   * score when DOMAIN_LATE_FILTER fragments leak through (defense in
   * depth — most domain assets already filtered upstream).
   */
  computeInfraScore(name: string): number {
    if (typeof name !== "string" || name.length === 0) return 0;
    const lower = name.toLowerCase();
    let hits = 0;
    for (const frag of INFRA_NAME_FRAGMENTS) {
      if (lower.includes(frag)) hits++;
    }
    let domainHits = 0;
    for (const frag of DOMAIN_LATE_FILTER) {
      if (lower.includes(frag)) domainHits++;
    }
    const raw = hits / 3; // 3 hits = full infra signal (cap at 1.0)
    return Math.max(0, Math.min(1, raw - domainHits * 0.25));
  }

  /**
   * Build a ranked candidate report ready for human triage. Filters by
   * minScore + topN, computes by-kind histogram.
   */
  rankCandidates(perRepo: readonly PerRepoUniques[], config: ScoringConfig = {}): CandidateReport {
    const entries = this.buildAssetIndex(perRepo);
    const minScore = typeof config.minScore === "number" && Number.isFinite(config.minScore)
      ? config.minScore
      : 0.0;
    const scored: ScoredAsset[] = [];
    for (const e of entries) {
      const s = this.scoreAsset(e, config);
      if (s.score >= minScore) scored.push(s);
    }
    scored.sort((a, b) =>
      b.score - a.score
      || b.peer_count - a.peer_count
      || a.kind.localeCompare(b.kind)
      || a.name.localeCompare(b.name)
    );
    const topN = typeof config.topN === "number" && Number.isFinite(config.topN) && config.topN > 0
      ? config.topN
      : scored.length;
    const candidates = scored.slice(0, topN);
    const byKind: Record<MergeAssetKind, number> = {
      engine: 0, dispatcher: 0, hook: 0, skill: 0, script: 0,
    };
    for (const s of candidates) byKind[s.kind]++;
    return {
      totalAssets: entries.length,
      scoredAssets: scored.length,
      candidates,
      byKind,
    };
  }

  /**
   * Render a markdown triage doc from a candidate report, grouped by
   * asset kind. Stable output — given identical inputs always produces
   * identical bytes.
   */
  renderMarkdown(report: CandidateReport, config: ScoringConfig = {}, generatedAt = new Date().toISOString()): string {
    const lines: string[] = [];
    lines.push("# Peer-Repo Merge Candidates");
    lines.push("");
    lines.push(`**Generated:** ${generatedAt}`);
    lines.push(`**Lead lane:** \`${config.leadLane ?? "(none)"}\``);
    lines.push(`**Total peer-only assets:** ${report.totalAssets}`);
    lines.push(`**Scored above threshold:** ${report.scoredAssets}`);
    lines.push(`**Showing top:** ${report.candidates.length}`);
    lines.push("");
    lines.push("## By kind");
    lines.push("");
    lines.push(`- engines: ${report.byKind.engine}`);
    lines.push(`- dispatchers: ${report.byKind.dispatcher}`);
    lines.push(`- hooks: ${report.byKind.hook}`);
    lines.push(`- skills: ${report.byKind.skill}`);
    lines.push(`- scripts: ${report.byKind.script}`);
    lines.push("");
    const groups: MergeAssetKind[] = ["hook", "skill", "engine", "dispatcher", "script"];
    for (const kind of groups) {
      const items = report.candidates.filter((c) => c.kind === kind);
      if (items.length === 0) continue;
      lines.push(`## ${kind} candidates (${items.length})`);
      lines.push("");
      lines.push("| Score | Peers | Name | Infra | In lead lane | First seen in |");
      lines.push("|-------|-------|------|-------|--------------|---------------|");
      for (const c of items) {
        lines.push(`| ${c.score.toFixed(3)} | ${c.peer_count} | \`${c.name}\` | ${c.infra_score.toFixed(2)} | ${c.in_lead_lane ? "yes" : "no"} | \`${c.first_seen_in}\` |`);
      }
      lines.push("");
    }
    lines.push("## Triage instructions (P16-U03)");
    lines.push("");
    lines.push("1. Review top-N candidates manually; reject any with domain-coupled internals.");
    lines.push("2. For each accepted candidate: run `duplicationGuardEngine.checkBeforeCreating()`.");
    lines.push("3. Copy engine + tests + dispatcher wiring from highest-quality source peer.");
    lines.push("4. Add provenance comment citing source repo + commit SHA.");
    lines.push("");
    return lines.join("\n");
  }

  // ---- private helpers ----

  private collectKind(
    map: Map<string, AssetEntry>,
    repoRoot: string,
    kind: MergeAssetKind,
    arr: unknown,
  ): void {
    if (!Array.isArray(arr)) return;
    for (const raw of arr) {
      if (typeof raw !== "string" || raw.length === 0) continue;
      const key = `${kind}:${raw}`;
      const existing = map.get(key);
      if (existing) {
        if (!existing.peers.includes(repoRoot)) existing.peers.push(repoRoot);
      } else {
        map.set(key, { kind, name: raw, peers: [repoRoot], peer_count: 1 });
      }
    }
  }
}

export const mergeCandidateScorerEngine = new MergeCandidateScorerEngine();
