/**
 * KnowledgeGapAwarenessEngine — U-FORE-11 (PSAU-FORESIGHT)
 * ==========================================================
 *
 * "You don't know what you don't know" — scans a proposed implementation
 * against the repo's existing engines, formulas, tribal tips, and
 * related docs. Surfaces prior-art the developer probably forgot about
 * so they can reuse instead of reinvent.
 *
 * Strategy (no RAG stack required — all signals local):
 *   - Token-overlap score against engine file names + JSDoc first lines
 *   - Pattern match against a canonical-reference lookup
 *     (kc1.1 Kienzle, Taylor, SLD, Brammertz, ISO 286, etc.)
 *   - File-path heuristics (physics/, registries/, knowledge/)
 *
 * Integrates with DuplicationGuardEngine + master-index-search-gate.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface KnowledgeGapQuery {
  intent: string;
  keywords?: string[];
  domain?: string;
}

export interface PriorArtItem {
  id: string;
  kind: "engine" | "formula" | "tribal" | "doc" | "registry";
  relevance: number; // 0-1
  path?: string;
  summary: string;
  matchedKeywords: string[];
}

export interface KnowledgeGapReport {
  intent: string;
  items: PriorArtItem[];
  topRelevance: number;
  relevantCount: number;
  threshold: number;
  warning: string | null;
}

const RELEVANCE_THRESHOLD = 0.5;
const HIGH_RELEVANCE = 0.7;
const MAX_RESULTS = 20;
const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "into", "this", "that",
  "engine", "create", "build", "new", "implement", "add",
]);

// Canonical formulas / constants — surfaces these when the query keywords overlap.
const CANONICAL_REFERENCES: Array<{ id: string; keywords: string[]; summary: string; path: string }> = [
  {
    id: "Kienzle kc1.1 force model",
    keywords: ["cutting", "force", "kienzle", "kc", "chip", "mill", "turn"],
    summary: "Fc = kc1.1 * ap * fz^(1-mc) — import kc1.1 + mc from src/physics/constants.ts (P=1800, M=2100, K=1100, N=700, S=2800, H=3200)",
    path: "mcp-server/src/physics/constants.ts",
  },
  {
    id: "Taylor tool-life equation",
    keywords: ["tool", "life", "taylor", "wear", "vb", "cutting", "speed"],
    summary: "T = (C / Vc)^(1/n) — Taylor C/n constants live in src/physics/constants.ts; use TaylorToolLifeEngine.",
    path: "mcp-server/src/engines/TaylorToolLifeEngine.ts",
  },
  {
    id: "Altintas SLD (stability lobes)",
    keywords: ["chatter", "stability", "lobes", "sld", "frf", "regenerative"],
    summary: "Altintas SLD — axial depth vs. spindle speed stability boundary. See ChatterPredictionEngine + RegenerativeChatterEngine.",
    path: "mcp-server/src/engines/ChatterPredictionEngine.ts",
  },
  {
    id: "Brammertz surface roughness",
    keywords: ["surface", "roughness", "finish", "ra", "brammertz", "feed"],
    summary: "Ra = (fz^2 / 8 * r_ε) + C_BUE — Brammertz nose-radius model; import from src/physics/constants.ts.",
    path: "mcp-server/src/engines/SurfaceFinishEngine.ts",
  },
  {
    id: "ISO 286 fits + tolerances",
    keywords: ["tolerance", "fit", "iso", "286", "h7", "g6", "clearance"],
    summary: "ISO 286 hole/shaft fit tables — use ToleranceEngine.iso286Lookup() rather than hard-coding deviations.",
    path: "mcp-server/src/engines/ToleranceEngine.ts",
  },
  {
    id: "Merchant shear-plane / chip formation",
    keywords: ["chip", "shear", "merchant", "rake", "friction", "formation"],
    summary: "Merchant's circle + Lee-Shaffer model for chip-forming forces. See ChipFormationEngine.",
    path: "mcp-server/src/engines/ChipFormationEngine.ts",
  },
  {
    id: "Johnson-Cook flow stress",
    keywords: ["flow", "stress", "johnson", "cook", "plastic", "temperature"],
    summary: "σ = [A + B·ε^n][1 + C·ln(ε̇/ε̇₀)][1 − T*^m] — use JohnsonCookEngine.",
    path: "mcp-server/src/engines/JohnsonCookEngine.ts",
  },
];

export class KnowledgeGapAwarenessEngine {
  readonly name = "KnowledgeGapAwarenessEngine";

  constructor(private readonly repoRoot: string = process.cwd()) {}

  /**
   * Scan the repo for prior-art relevant to the proposed implementation.
   *
   * @param query Intent string + optional keywords + optional domain hint.
   * @returns Up to 20 prior-art items ranked by relevance.
   */
  scan(query: KnowledgeGapQuery): KnowledgeGapReport {
    this.assertQuery(query);
    const keywords = this.extractKeywords(query);
    const items: PriorArtItem[] = [];

    items.push(...this.matchCanonicalReferences(keywords));
    items.push(...this.matchEngineFiles(keywords));

    // Sort by relevance desc, dedupe by id, cap at MAX_RESULTS
    items.sort((a, b) => b.relevance - a.relevance);
    const seen = new Set<string>();
    const unique: PriorArtItem[] = [];
    for (const it of items) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      unique.push(it);
      if (unique.length >= MAX_RESULTS) break;
    }
    const relevantCount = unique.filter((it) => it.relevance >= RELEVANCE_THRESHOLD).length;
    const topRelevance = unique[0]?.relevance ?? 0;
    const warning = relevantCount >= 5
      ? `Found ${relevantCount} high-relevance prior-art items — review before reimplementing.`
      : relevantCount === 0
        ? "No strong prior-art matches — this may be genuinely novel, or consider rephrasing the query."
        : null;

    return {
      intent: query.intent,
      items: unique,
      topRelevance,
      relevantCount,
      threshold: RELEVANCE_THRESHOLD,
      warning,
    };
  }

  /**
   * True if the query has ≥ N matches at ≥ HIGH_RELEVANCE.
   * Used by build-create-detector to refuse a 'create' intent that's
   * clearly duplicating existing work.
   */
  hasHighRelevancePriorArt(query: KnowledgeGapQuery, minMatches = 3): boolean {
    const r = this.scan(query);
    return r.items.filter((it) => it.relevance >= HIGH_RELEVANCE).length >= minMatches;
  }

  /**
   * Render a short plain-language summary.
   */
  summarize(report: KnowledgeGapReport): string {
    const lines: string[] = [];
    lines.push(
      `Knowledge gap scan for "${report.intent}" — ${report.items.length} candidates, ${report.relevantCount} at ≥${(report.threshold * 100).toFixed(0)}% relevance`
    );
    if (report.warning) lines.push(`  ${report.warning}`);
    for (const it of report.items.slice(0, 5)) {
      lines.push(`  [${(it.relevance * 100).toFixed(0)}%] ${it.kind}: ${it.id}`);
      if (it.summary) lines.push(`        ${it.summary}`);
    }
    return lines.join("\n");
  }

  // ─── Private ──────────────────────────────────────────────────────

  private extractKeywords(query: KnowledgeGapQuery): string[] {
    const raw = [
      ...(query.intent ?? "").split(/\s+/),
      ...(query.keywords ?? []),
      query.domain ?? "",
    ].join(" ");
    const tokens = raw
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[^A-Za-z0-9]+/g, " ")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w));
    return Array.from(new Set(tokens));
  }

  private matchCanonicalReferences(keywords: string[]): PriorArtItem[] {
    if (keywords.length === 0) return [];
    const out: PriorArtItem[] = [];
    for (const ref of CANONICAL_REFERENCES) {
      const matched = ref.keywords.filter((k) => keywords.includes(k));
      if (matched.length === 0) continue;
      const relevance = Math.min(1, matched.length / Math.max(keywords.length, ref.keywords.length));
      out.push({
        id: ref.id,
        kind: "formula",
        relevance: Math.max(relevance, HIGH_RELEVANCE),
        path: ref.path,
        summary: ref.summary,
        matchedKeywords: matched,
      });
    }
    return out;
  }

  private matchEngineFiles(keywords: string[]): PriorArtItem[] {
    if (keywords.length === 0) return [];
    const dir = path.join(this.repoRoot, "mcp-server", "src", "engines");
    if (!fs.existsSync(dir)) return [];
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return [];
    }
    const out: PriorArtItem[] = [];
    for (const f of entries) {
      if (!/Engine\.ts$/.test(f)) continue;
      const id = f.replace(/\.ts$/, "");
      const candidate = this.tokenize(id);
      const matched = keywords.filter((k) => candidate.includes(k));
      if (matched.length === 0) continue;
      const relevance = matched.length / Math.max(keywords.length, candidate.length);
      out.push({
        id,
        kind: "engine",
        relevance,
        path: `mcp-server/src/engines/${f}`,
        summary: `Existing engine with overlap on: ${matched.join(", ")}`,
        matchedKeywords: matched,
      });
    }
    return out;
  }

  private tokenize(name: string): string[] {
    return name
      .replace(/Engine$/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  }

  private assertQuery(query: unknown): asserts query is KnowledgeGapQuery {
    if (!query || typeof query !== "object") {
      throw new Error("KnowledgeGapAwarenessEngine.scan: query must be an object");
    }
    const rec = query as Partial<KnowledgeGapQuery>;
    if (typeof rec.intent !== "string" || rec.intent.trim() === "") {
      throw new Error("KnowledgeGapAwarenessEngine.scan: query.intent required");
    }
  }
}

export const knowledgeGapAwarenessEngine = new KnowledgeGapAwarenessEngine();
