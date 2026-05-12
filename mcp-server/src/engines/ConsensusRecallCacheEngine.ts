/**
 * ConsensusRecallCacheEngine — short-circuit fan-out when an identical prompt
 * already has a persisted consensus artifact in the wiki second-brain.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-RECALL-CACHE.
 *
 * Why this exists
 * ---------------
 * Every consensus call costs ~$0.30 of Codex/Grok tokens + 30-60s wall time.
 * If a session asked the same question yesterday and persisted the answer,
 * re-fanning out is pure waste. This engine:
 *
 *   1. Hashes the incoming prompt (same normalization as
 *      ConsensusObsidianPersistenceEngine — single source of truth on hash).
 *   2. Looks for `<wikiRoot>/consensus/<sha8>.md`.
 *   3. If present and not stale (default 7-day TTL), parses the frontmatter +
 *      reconstructs a synthetic ConsensusResult with `cached:true`.
 *   4. Returns null on miss — caller falls through to live fan-out.
 *
 * The synthetic result preserves recommendation, agreement_score, voters,
 * mean_factuality so downstream code (router, neural feed) sees the cached
 * value as if it were live. The `cached` flag lets callers distinguish
 * cache-hits in telemetry.
 *
 * Pure I/O — no network. Cache is the wiki itself; no extra index needed.
 *
 * @module engines/ConsensusRecallCacheEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { consensusObsidianPersistenceEngine } from "./ConsensusObsidianPersistenceEngine.js";

export interface RecallOptions {
  /** Override wiki root (tests). Default env PRISM_WIKI_ROOT or H:/prism/knowledge/wiki. */
  wikiRoot?: string;
  /** Max age in milliseconds. Older artifacts are ignored. Default 7 days. */
  ttlMs?: number;
  /** Honor freshness even if frontmatter recommendation is "accept"? Default true. */
  enforceTtl?: boolean;
}

export interface CachedConsensus {
  cached: true;
  promptHash: string;
  sha8: string;
  wikiPath: string;
  ageMs: number;
  recommendation: "accept" | "review" | "escalate";
  agreementScore: number;
  modelVoters: string[];
  meanFactuality: number | null;
  /** Reconstructed answer body extracted from the markdown. */
  answer: string | null;
  /** The full markdown body for callers that want everything. */
  body: string;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Read env at CALL time (not module-load time) so tests can override after import. */
function getDefaultWikiRoot(): string {
  return process.env.PRISM_WIKI_ROOT ?? "H:/prism/knowledge/wiki";
}

export class ConsensusRecallCacheEngine {
  /**
   * Look for a cached consensus artifact for this exact prompt. Returns null
   * on miss. Returns a CachedConsensus on hit.
   */
  recall(prompt: string, opts: RecallOptions = {}): CachedConsensus | null {
    if (typeof prompt !== "string" || prompt.length === 0) return null;

    const wikiRoot = opts.wikiRoot ?? getDefaultWikiRoot();
    const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    const enforceTtl = opts.enforceTtl !== false;

    const promptHash = consensusObsidianPersistenceEngine.hashPrompt(prompt);
    const sha8 = promptHash.slice(0, 8);
    const wikiPath = path.join(wikiRoot, "consensus", `${sha8}.md`);

    if (!fs.existsSync(wikiPath)) return null;

    let body: string;
    let stat: fs.Stats;
    try {
      stat = fs.statSync(wikiPath);
      body = fs.readFileSync(wikiPath, "utf-8");
    } catch {
      return null;
    }

    const ageMs = Date.now() - stat.mtimeMs;
    if (enforceTtl && ageMs > ttlMs) return null;

    const fm = this.parseFrontmatter(body);
    return {
      cached: true,
      promptHash,
      sha8,
      wikiPath,
      ageMs,
      recommendation: this.parseRecommendation(fm.recommendation),
      agreementScore: this.parseNumber(fm.agreement_score, 0),
      modelVoters: this.parseList(fm.model_voters),
      meanFactuality: fm.mean_factuality === "null" || fm.mean_factuality === undefined
        ? null
        : this.parseNumber(fm.mean_factuality, NaN),
      answer: this.extractAnswer(body),
      body,
    };
  }

  /**
   * Reward score for a cached entry — used by the neural feedback engine to
   * decide whether to surface this entry in future retrieval. Composite of
   * recommendation strength, agreement, and recency decay.
   */
  scoreCached(c: CachedConsensus): number {
    const recScore = c.recommendation === "accept" ? 1.0 : c.recommendation === "review" ? 0.5 : 0.1;
    const agreementClamped = Math.max(0, Math.min(1, c.agreementScore));
    const ageDays = c.ageMs / (24 * 60 * 60 * 1000);
    const recencyDecay = Math.exp(-ageDays / 14); // half-life ~14 days
    return Number((recScore * agreementClamped * recencyDecay).toFixed(4));
  }

  // ---- frontmatter parsing ----

  private parseFrontmatter(body: string): Record<string, string> {
    const out: Record<string, string> = {};
    if (!body.startsWith("---\n")) return out;
    const end = body.indexOf("\n---\n", 4);
    if (end === -1) return out;
    const yaml = body.slice(4, end);
    for (const line of yaml.split("\n")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();
      out[key] = val;
    }
    return out;
  }

  private parseRecommendation(v: string | undefined): "accept" | "review" | "escalate" {
    if (v === "accept" || v === "review" || v === "escalate") return v;
    return "review";
  }

  private parseNumber(v: string | undefined, fallback: number): number {
    if (v === undefined) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  private parseList(v: string | undefined): string[] {
    if (!v) return [];
    // Format from persistence engine: ["a", "b", "c"]
    const trimmed = v.trim();
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];
    const inner = trimmed.slice(1, -1).trim();
    if (inner.length === 0) return [];
    return inner.split(",").map((s) => s.trim().replace(/^"(.+)"$/, "$1"));
  }

  /**
   * Extract the consensus answer block from the markdown. Looks for
   * `## Consensus answer\n\n```\n...\n```` and returns the inner text.
   */
  private extractAnswer(body: string): string | null {
    const marker = "## Consensus answer\n\n```\n";
    const start = body.indexOf(marker);
    if (start === -1) return null;
    const fenceStart = start + marker.length;
    const fenceEnd = body.indexOf("\n```", fenceStart);
    if (fenceEnd === -1) return null;
    return body.slice(fenceStart, fenceEnd);
  }
}

export const consensusRecallCacheEngine = new ConsensusRecallCacheEngine();
