// WIRE-EXEMPT: tests in __tests__/engines/ragStackU-LEARN-04.test.ts
/**
 * TribalRAGEngine — U-LEARN-04
 * ==============================
 *
 * Generalized hybrid retrieval over ALL tribal knowledge (4,493+ tips).
 * Extends CAMTribalRAGEngine pattern to cover all domains:
 * - Machining tips (mill, lathe, grinder, EDM)
 * - Material tips (speeds/feeds per alloy)
 * - Tool tips (selection, wear, life)
 * - Process tips (workholding, coolant, chip control)
 * - Safety tips (collision avoidance, thermal limits)
 *
 * Features:
 * - Hybrid BM25 + TF-IDF retrieval
 * - Filter by material, operation, machine, symptom
 * - Multi-source aggregation (tips, playbook rules, formulas)
 *
 * @module engines/TribalRAGEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-04
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import {
  type RAGQueryInput,
  type RAGQueryResult,
  type RetrievalResult,
  type CitationSourceType,
} from "../schemas/citationSchema.js";

// ─── Types ──────────────────────────────────────────────────────────────

export interface TribalTipEntry {
  tip_id: string;
  source: string; // File or origin
  domain: "mill" | "lathe" | "wedm" | "sinker" | "grinder" | "welder" | "general";
  title: string;
  body: string;
  tags: string[];
  materials: string[];
  operations: string[];
  machines: string[];
  symptoms: string[];
  severity: "info" | "warning" | "critical";
  confidence: number;
  term_indices: number[];
  term_weights: number[];
}

export interface TribalRAGIndex {
  schemaVersion: 1;
  generated_at: string;
  vocabulary: string[];
  idf: number[];
  tips: TribalTipEntry[];
  summary: {
    total_tips: number;
    total_vocab: number;
    per_domain_count: Record<string, number>;
    per_severity_count: Record<string, number>;
  };
}

export interface AddTipInput {
  tip_id?: string;
  source: string;
  domain: TribalTipEntry["domain"];
  title: string;
  body: string;
  tags?: string[];
  materials?: string[];
  operations?: string[];
  machines?: string[];
  symptoms?: string[];
  severity?: "info" | "warning" | "critical";
  confidence?: number;
}

export interface TribalQueryInput {
  query: string;
  domain?: TribalTipEntry["domain"];
  material?: string;
  operation?: string;
  machine?: string;
  symptom?: string;
  severity?: "info" | "warning" | "critical";
  top_k?: number;
  min_score?: number;
}

// ─── BM25 Constants ─────────────────────────────────────────────────────

const BM25_K1 = 1.2;
const BM25_B = 0.75;

// ─── Tokenizer ──────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens: string[] = [];

  // Extract domain-specific patterns
  const materials = lower.match(/\b(steel|aluminum|titanium|inconel|brass|copper|stainless|carbide|hss|d2|a2|m2|4140|4340|6061|7075|316|304|17-4|15-5|hastelloy|monel|waspaloy)\b/g) ?? [];
  tokens.push(...materials.map(m => `MAT:${m}`));

  const operations = lower.match(/\b(rough|finish|face|turn|bore|drill|tap|thread|groove|part|contour|pocket|profile|slot|skim|flush|burn)\b/g) ?? [];
  tokens.push(...operations.map(o => `OP:${o}`));

  const machines = lower.match(/\b(lathe|mill|vmc|hmc|swiss|grinder|wedm|sinker|edm|cnc|okuma|haas|mazak|fanuc|mitsubishi|sodick|makino)\b/g) ?? [];
  tokens.push(...machines.map(m => `MACH:${m}`));

  const symptoms = lower.match(/\b(chatter|vibration|wear|breakage|buildup|burr|taper|runout|deflection|heat|discolor|rough|poor|bad|fail)\b/g) ?? [];
  tokens.push(...symptoms.map(s => `SYM:${s}`));

  // Physics terms
  const physics = lower.match(/\b(sfm|ipm|rpm|doc|woc|feed|speed|force|torque|power|temperature|pressure|stress|strain)\b/g) ?? [];
  tokens.push(...physics.map(p => `PHY:${p}`));

  // General words (filter stopwords)
  const stopwords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "and", "but", "if", "or", "because", "until", "while", "although", "though", "after", "before", "unless", "since", "this", "that", "these", "those", "it", "its"]);

  const words = lower.split(/[^a-z0-9]+/).filter(w => w.length >= 2 && w.length <= 20 && !stopwords.has(w));
  tokens.push(...words);

  return tokens;
}

// ─── Engine ─────────────────────────────────────────────────────────────

export class TribalRAGEngine {
  private static index: TribalRAGIndex | null = null;
  private static avgDocLength = 0;
  private static readonly INDEX_PATH = "data/state/TRIBAL_RAG_INDEX.json";

  /**
   * Build index from an array of tips.
   * @param tips - Array of tribal tips
   * @param indexPath - Optional output path
   * @returns Build result with summary
   */
  static buildIndex(tips: AddTipInput[], indexPath?: string): { success: boolean; summary: TribalRAGIndex["summary"]; warnings: string[] } {
    const warnings: string[] = [];
    const vocabMap = new Map<string, number>();
    const docFreq = new Map<string, number>();
    const entries: TribalTipEntry[] = [];

    // First pass: build vocabulary
    for (const tip of tips) {
      const text = `${tip.title} ${tip.body} ${(tip.tags ?? []).join(" ")} ${(tip.materials ?? []).join(" ")} ${(tip.operations ?? []).join(" ")}`;
      const tokens = new Set(tokenize(text));

      for (const token of tokens) {
        if (!vocabMap.has(token)) {
          vocabMap.set(token, vocabMap.size);
        }
        docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
      }
    }

    // Compute IDF
    const N = tips.length;
    const vocabulary = Array.from(vocabMap.keys());
    const idf = vocabulary.map(token => {
      const df = docFreq.get(token) ?? 0;
      return Math.log((N - df + 0.5) / (df + 0.5) + 1);
    });

    // Second pass: build sparse vectors
    let totalLength = 0;
    const perDomain: Record<string, number> = {};
    const perSeverity: Record<string, number> = {};

    for (let i = 0; i < tips.length; i++) {
      const tip = tips[i]!;
      const text = `${tip.title} ${tip.body} ${(tip.tags ?? []).join(" ")} ${(tip.materials ?? []).join(" ")} ${(tip.operations ?? []).join(" ")}`;
      const tokens = tokenize(text);

      const termFreq = new Map<number, number>();
      for (const token of tokens) {
        const idx = vocabMap.get(token);
        if (idx !== undefined) {
          termFreq.set(idx, (termFreq.get(idx) ?? 0) + 1);
        }
      }

      const term_indices: number[] = [];
      const term_weights: number[] = [];
      for (const [idx, tf] of termFreq) {
        term_indices.push(idx);
        term_weights.push(tf * idf[idx]!);
      }

      totalLength += tokens.length;

      const entry: TribalTipEntry = {
        tip_id: tip.tip_id ?? `tip-${i}`,
        source: tip.source,
        domain: tip.domain,
        title: tip.title,
        body: tip.body.slice(0, 500),
        tags: tip.tags ?? [],
        materials: tip.materials ?? [],
        operations: tip.operations ?? [],
        machines: tip.machines ?? [],
        symptoms: tip.symptoms ?? [],
        severity: tip.severity ?? "info",
        confidence: tip.confidence ?? 0.8,
        term_indices,
        term_weights,
      };
      entries.push(entry);

      perDomain[tip.domain] = (perDomain[tip.domain] ?? 0) + 1;
      perSeverity[entry.severity] = (perSeverity[entry.severity] ?? 0) + 1;
    }

    this.avgDocLength = totalLength / Math.max(1, N);

    const summary: TribalRAGIndex["summary"] = {
      total_tips: entries.length,
      total_vocab: vocabulary.length,
      per_domain_count: perDomain,
      per_severity_count: perSeverity,
    };

    this.index = {
      schemaVersion: 1,
      generated_at: new Date().toISOString(),
      vocabulary,
      idf,
      tips: entries,
      summary,
    };

    // Save to disk
    const outPath = indexPath ?? this.INDEX_PATH;
    try {
      const dir = path.dirname(outPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outPath, JSON.stringify(this.index, null, 2));
    } catch (err) {
      warnings.push(`Failed to save index: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { success: true, summary, warnings };
  }

  /**
   * Load index from disk.
   */
  static loadIndex(indexPath?: string): boolean {
    const p = indexPath ?? this.INDEX_PATH;
    try {
      if (!fs.existsSync(p)) return false;
      const data = fs.readFileSync(p, "utf-8");
      this.index = JSON.parse(data) as TribalRAGIndex;

      let total = 0;
      for (const tip of this.index.tips) {
        total += tip.term_weights.length;
      }
      this.avgDocLength = total / Math.max(1, this.index.tips.length);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Search for relevant tribal tips.
   * @param input - Query parameters
   * @returns Ranked results
   */
  static search(input: TribalQueryInput): RAGQueryResult {
    const start = performance.now();

    if (!this.index) {
      this.loadIndex();
    }

    if (!this.index || this.index.tips.length === 0) {
      return {
        query: input.query,
        results: [],
        total_candidates: 0,
        search_time_ms: performance.now() - start,
        index_version: null,
      };
    }

    const topK = input.top_k ?? 10;
    const minScore = input.min_score ?? 0;

    // Tokenize query
    const queryTokens = tokenize(input.query);

    // Add filter terms
    if (input.material) queryTokens.push(`MAT:${input.material.toLowerCase()}`);
    if (input.operation) queryTokens.push(`OP:${input.operation.toLowerCase()}`);
    if (input.machine) queryTokens.push(`MACH:${input.machine.toLowerCase()}`);
    if (input.symptom) queryTokens.push(`SYM:${input.symptom.toLowerCase()}`);

    // Build query vector
    const queryVector = new Map<number, number>();
    for (const token of queryTokens) {
      const idx = this.index.vocabulary.indexOf(token);
      if (idx >= 0) {
        queryVector.set(idx, (queryVector.get(idx) ?? 0) + 1);
      }
    }

    if (queryVector.size === 0) {
      return {
        query: input.query,
        results: [],
        total_candidates: this.index.tips.length,
        search_time_ms: performance.now() - start,
        index_version: this.index.generated_at,
      };
    }

    // Score all tips
    const scores: Array<{ tip: TribalTipEntry; score: number }> = [];

    for (const tip of this.index.tips) {
      // Apply filters
      if (input.domain && tip.domain !== input.domain) continue;
      if (input.severity && tip.severity !== input.severity) continue;

      let score = 0;
      const docLength = tip.term_weights.length;

      for (const [qIdx, qTf] of queryVector) {
        const docIdx = tip.term_indices.indexOf(qIdx);
        if (docIdx >= 0) {
          const tf = tip.term_weights[docIdx]!;
          const idfVal = this.index.idf[qIdx]!;

          // BM25
          const numerator = tf * (BM25_K1 + 1);
          const denominator = tf + BM25_K1 * (1 - BM25_B + BM25_B * (docLength / this.avgDocLength));
          score += idfVal * (numerator / denominator) * qTf;
        }
      }

      // Boost for material/operation/symptom matches
      if (input.material && tip.materials.some(m => m.toLowerCase().includes(input.material!.toLowerCase()))) {
        score *= 1.5;
      }
      if (input.operation && tip.operations.some(o => o.toLowerCase().includes(input.operation!.toLowerCase()))) {
        score *= 1.3;
      }
      if (input.symptom && tip.symptoms.some(s => s.toLowerCase().includes(input.symptom!.toLowerCase()))) {
        score *= 1.4;
      }

      // Severity boost for critical tips
      if (tip.severity === "critical") score *= 1.2;
      if (tip.severity === "warning") score *= 1.1;

      if (score >= minScore) {
        scores.push({ tip, score });
      }
    }

    // Sort and take top-k
    scores.sort((a, b) => b.score - a.score);

    const results: RetrievalResult[] = scores.slice(0, topK).map(({ tip, score }) => ({
      id: tip.tip_id,
      score,
      source_type: "tribal_tip" as CitationSourceType,
      title: tip.title,
      excerpt: tip.body.slice(0, 200),
      metadata: {
        source: tip.source,
        domain: tip.domain,
        tags: tip.tags,
        materials: tip.materials,
        operations: tip.operations,
        severity: tip.severity,
        confidence: tip.confidence,
      },
    }));

    return {
      query: input.query,
      results,
      total_candidates: this.index.tips.length,
      search_time_ms: performance.now() - start,
      index_version: this.index.generated_at,
    };
  }

  /**
   * Get index statistics.
   */
  static getIndexStats(): TribalRAGIndex["summary"] | null {
    if (!this.index) this.loadIndex();
    return this.index?.summary ?? null;
  }

  /**
   * Engine self-awareness.
   */
  static getSelfAwareness() {
    return {
      name: "TribalRAGEngine",
      version: "1.0.0",
      milestone: "U-LEARN-04",
      capabilities: ["buildIndex", "loadIndex", "search", "getIndexStats"],
      description: "Hybrid BM25+TF-IDF retrieval over 4,493+ tribal knowledge tips",
      index_path: this.INDEX_PATH,
      index_loaded: this.index !== null,
    };
  }
}

export const tribalRAGEngine = TribalRAGEngine;
