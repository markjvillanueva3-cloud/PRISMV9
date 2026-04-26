// WIRE-EXEMPT: tests in __tests__/engines/ragStackU-LEARN-04.test.ts
/**
 * JMDieProgramRAGEngine — U-LEARN-04
 * ====================================
 *
 * Hybrid retrieval over 22,721 JM Die CNC programs. Given a new quote or
 * part description, finds the most similar historical programs based on:
 * - Lexical matching (BM25): G-code tokens, tool numbers, material codes
 * - Semantic matching: Operation types, geometry features, process params
 *
 * Index Structure
 * ---------------
 * Builds a JSON index at data/state/JM_DIE_PROGRAM_RAG_INDEX.json with:
 * - vocabulary: unique tokens from all programs
 * - idf: inverse document frequency for BM25
 * - programs: sparse TF-IDF vectors + metadata per program
 *
 * Query Pipeline
 * --------------
 * 1. Tokenize query (G-code words, material, operation)
 * 2. BM25 score over sparse vectors
 * 3. Semantic boost from operation/material match
 * 4. Return top-k with retrieval scores
 *
 * @module engines/JMDieProgramRAGEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-04
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import {
  type RAGQueryInput,
  type RAGQueryResult,
  type RetrievalResult,
  RAGQueryInputSchema,
} from "../schemas/citationSchema.js";

// ─── Types ──────────────────────────────────────────────────────────────

export interface ProgramIndexEntry {
  program_id: string;
  source_path: string;
  program_number: string | null;
  customer: string;
  material: string | null;
  machine_type: "lathe" | "mill" | "wire_edm" | "sinker_edm" | "grinder" | "unknown";
  controller: string;
  tool_count: number;
  operation_types: string[];
  g_codes_used: string[];
  feature_vector: number[]; // Sparse: indices into vocabulary
  feature_weights: number[]; // Corresponding TF-IDF weights
  total_lines: number;
  cycle_time_sec: number | null;
}

export interface ProgramRAGIndex {
  schemaVersion: 1;
  generated_at: string;
  vocabulary: string[];
  idf: number[];
  programs: ProgramIndexEntry[];
  summary: {
    total_programs: number;
    total_vocab: number;
    per_customer_count: Record<string, number>;
    per_machine_count: Record<string, number>;
    avg_tools: number;
  };
}

export interface BuildIndexInput {
  programs: Array<{
    source_path: string;
    program_number: string | null;
    customer: string;
    material?: string;
    machine_type: "lathe" | "mill" | "wire_edm" | "sinker_edm" | "grinder" | "unknown";
    controller: string;
    tools: Array<{ tool_number: number; tool_type?: string }>;
    operations: Array<{ kind: string; g_codes: string[] }>;
    total_lines: number;
    cycle_time_sec?: number;
  }>;
  index_path?: string;
}

export interface FindSimilarInput {
  query: string;
  material?: string;
  machine_type?: string;
  operation_types?: string[];
  customer?: string;
  top_k?: number;
  min_score?: number;
}

// ─── BM25 Constants ─────────────────────────────────────────────────────

const BM25_K1 = 1.5;
const BM25_B = 0.75;

// ─── Tokenizer ──────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  // Extract G/M codes, tool numbers, materials, and general tokens
  const tokens: string[] = [];

  // G-codes: G00, G01, G02, etc.
  const gCodes = text.match(/G\d{1,3}/gi) ?? [];
  tokens.push(...gCodes.map(g => g.toUpperCase()));

  // M-codes: M03, M08, etc.
  const mCodes = text.match(/M\d{1,3}/gi) ?? [];
  tokens.push(...mCodes.map(m => m.toUpperCase()));

  // Tool numbers: T01, T1, etc.
  const tools = text.match(/T\d{1,4}/gi) ?? [];
  tokens.push(...tools.map(t => t.toUpperCase()));

  // Materials (common patterns)
  const materials = text.match(/\b(steel|aluminum|titanium|inconel|brass|copper|stainless|carbide|hss|d2|a2|m2|4140|4340|6061|7075|316|304|17-4|15-5)\b/gi) ?? [];
  tokens.push(...materials.map(m => `MAT_${m.toUpperCase()}`));

  // Operations
  const ops = text.match(/\b(rough|finish|face|turn|bore|drill|tap|thread|groove|part|contour|pocket|profile|slot)\b/gi) ?? [];
  tokens.push(...ops.map(o => `OP_${o.toUpperCase()}`));

  // General words (alphanumeric, length 2-15)
  const words = text.split(/[^a-zA-Z0-9]+/).filter(w => w.length >= 2 && w.length <= 15);
  tokens.push(...words.map(w => w.toUpperCase()));

  return tokens;
}

// ─── Engine ─────────────────────────────────────────────────────────────

export class JMDieProgramRAGEngine {
  private static index: ProgramRAGIndex | null = null;
  private static avgDocLength = 0;
  private static readonly INDEX_PATH = "data/state/JM_DIE_PROGRAM_RAG_INDEX.json";

  /**
   * Build the program RAG index from parsed programs.
   * @param input - Array of parsed program data
   * @returns Index summary
   */
  static buildIndex(input: BuildIndexInput): { success: boolean; summary: ProgramRAGIndex["summary"]; warnings: string[] } {
    const warnings: string[] = [];
    const vocabMap = new Map<string, number>(); // token -> index
    const docFreq = new Map<string, number>(); // token -> doc count
    const entries: ProgramIndexEntry[] = [];

    // First pass: build vocabulary and document frequencies
    for (const prog of input.programs) {
      const tokens = new Set<string>();

      // Add operation types and g-codes
      for (const op of prog.operations) {
        tokens.add(`OP_${op.kind.toUpperCase()}`);
        for (const g of op.g_codes) {
          tokens.add(g.toUpperCase());
        }
      }

      // Add tool types
      for (const tool of prog.tools) {
        tokens.add(`T${tool.tool_number}`);
        if (tool.tool_type) {
          tokens.add(`TOOL_${tool.tool_type.toUpperCase()}`);
        }
      }

      // Add material
      if (prog.material) {
        tokens.add(`MAT_${prog.material.toUpperCase()}`);
      }

      // Add machine type and controller
      tokens.add(`MACH_${prog.machine_type.toUpperCase()}`);
      tokens.add(`CTRL_${prog.controller.toUpperCase()}`);

      // Update vocabulary and doc frequencies
      for (const token of tokens) {
        if (!vocabMap.has(token)) {
          vocabMap.set(token, vocabMap.size);
        }
        docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
      }
    }

    // Compute IDF
    const N = input.programs.length;
    const vocabulary = Array.from(vocabMap.keys());
    const idf = vocabulary.map(token => {
      const df = docFreq.get(token) ?? 0;
      return Math.log((N - df + 0.5) / (df + 0.5) + 1);
    });

    // Second pass: build sparse TF-IDF vectors
    let totalTokens = 0;
    const perCustomer: Record<string, number> = {};
    const perMachine: Record<string, number> = {};

    for (const prog of input.programs) {
      const termFreq = new Map<number, number>();

      // Count term frequencies
      for (const op of prog.operations) {
        const opToken = `OP_${op.kind.toUpperCase()}`;
        const opIdx = vocabMap.get(opToken);
        if (opIdx !== undefined) {
          termFreq.set(opIdx, (termFreq.get(opIdx) ?? 0) + 1);
        }
        for (const g of op.g_codes) {
          const gIdx = vocabMap.get(g.toUpperCase());
          if (gIdx !== undefined) {
            termFreq.set(gIdx, (termFreq.get(gIdx) ?? 0) + 1);
          }
        }
      }

      for (const tool of prog.tools) {
        const tIdx = vocabMap.get(`T${tool.tool_number}`);
        if (tIdx !== undefined) {
          termFreq.set(tIdx, (termFreq.get(tIdx) ?? 0) + 1);
        }
      }

      if (prog.material) {
        const mIdx = vocabMap.get(`MAT_${prog.material.toUpperCase()}`);
        if (mIdx !== undefined) {
          termFreq.set(mIdx, (termFreq.get(mIdx) ?? 0) + 1);
        }
      }

      const machIdx = vocabMap.get(`MACH_${prog.machine_type.toUpperCase()}`);
      if (machIdx !== undefined) {
        termFreq.set(machIdx, (termFreq.get(machIdx) ?? 0) + 1);
      }

      const ctrlIdx = vocabMap.get(`CTRL_${prog.controller.toUpperCase()}`);
      if (ctrlIdx !== undefined) {
        termFreq.set(ctrlIdx, (termFreq.get(ctrlIdx) ?? 0) + 1);
      }

      // Build sparse vector
      const feature_vector: number[] = [];
      const feature_weights: number[] = [];
      const docLength = Array.from(termFreq.values()).reduce((a, b) => a + b, 0);
      totalTokens += docLength;

      for (const [idx, tf] of termFreq) {
        feature_vector.push(idx);
        // TF-IDF weight
        const tfidf = tf * idf[idx]!;
        feature_weights.push(tfidf);
      }

      const entry: ProgramIndexEntry = {
        program_id: `prog-${entries.length}`,
        source_path: prog.source_path,
        program_number: prog.program_number,
        customer: prog.customer,
        material: prog.material ?? null,
        machine_type: prog.machine_type,
        controller: prog.controller,
        tool_count: prog.tools.length,
        operation_types: [...new Set(prog.operations.map(o => o.kind))],
        g_codes_used: [...new Set(prog.operations.flatMap(o => o.g_codes))],
        feature_vector,
        feature_weights,
        total_lines: prog.total_lines,
        cycle_time_sec: prog.cycle_time_sec ?? null,
      };
      entries.push(entry);

      // Stats
      perCustomer[prog.customer] = (perCustomer[prog.customer] ?? 0) + 1;
      perMachine[prog.machine_type] = (perMachine[prog.machine_type] ?? 0) + 1;
    }

    this.avgDocLength = totalTokens / Math.max(1, N);

    const summary: ProgramRAGIndex["summary"] = {
      total_programs: entries.length,
      total_vocab: vocabulary.length,
      per_customer_count: perCustomer,
      per_machine_count: perMachine,
      avg_tools: entries.reduce((s, e) => s + e.tool_count, 0) / Math.max(1, entries.length),
    };

    this.index = {
      schemaVersion: 1,
      generated_at: new Date().toISOString(),
      vocabulary,
      idf,
      programs: entries,
      summary,
    };

    // Save to disk if path provided
    const indexPath = input.index_path ?? this.INDEX_PATH;
    try {
      const dir = path.dirname(indexPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(indexPath, JSON.stringify(this.index, null, 2));
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
      this.index = JSON.parse(data) as ProgramRAGIndex;

      // Compute avgDocLength
      let total = 0;
      for (const prog of this.index.programs) {
        total += prog.feature_weights.reduce((a, b) => a + b, 0);
      }
      this.avgDocLength = total / Math.max(1, this.index.programs.length);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find programs similar to the query.
   * @param input - Query parameters
   * @returns Ranked results with scores
   */
  static findSimilarPrograms(input: FindSimilarInput): RAGQueryResult {
    const start = performance.now();

    if (!this.index) {
      this.loadIndex();
    }

    if (!this.index || this.index.programs.length === 0) {
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

    // Add explicit filters as tokens
    if (input.material) {
      queryTokens.push(`MAT_${input.material.toUpperCase()}`);
    }
    if (input.machine_type) {
      queryTokens.push(`MACH_${input.machine_type.toUpperCase()}`);
    }
    for (const op of input.operation_types ?? []) {
      queryTokens.push(`OP_${op.toUpperCase()}`);
    }

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
        total_candidates: this.index.programs.length,
        search_time_ms: performance.now() - start,
        index_version: this.index.generated_at,
      };
    }

    // Score all programs using BM25
    const scores: Array<{ prog: ProgramIndexEntry; score: number }> = [];

    for (const prog of this.index.programs) {
      // Filter by customer if specified
      if (input.customer && prog.customer.toLowerCase() !== input.customer.toLowerCase()) {
        continue;
      }

      let score = 0;
      const docLength = prog.feature_weights.reduce((a, b) => a + b, 0);

      for (const [qIdx, qTf] of queryVector) {
        const docIdx = prog.feature_vector.indexOf(qIdx);
        if (docIdx >= 0) {
          const tf = prog.feature_weights[docIdx]!;
          const idfVal = this.index.idf[qIdx]!;

          // BM25 formula
          const numerator = tf * (BM25_K1 + 1);
          const denominator = tf + BM25_K1 * (1 - BM25_B + BM25_B * (docLength / this.avgDocLength));
          score += idfVal * (numerator / denominator) * qTf;
        }
      }

      // Semantic boost for exact material/machine match
      if (input.material && prog.material?.toLowerCase() === input.material.toLowerCase()) {
        score *= 1.5;
      }
      if (input.machine_type && prog.machine_type === input.machine_type) {
        score *= 1.3;
      }

      if (score >= minScore) {
        scores.push({ prog, score });
      }
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Take top-k
    const results: RetrievalResult[] = scores.slice(0, topK).map(({ prog, score }) => ({
      id: prog.program_id,
      score,
      source_type: "program" as const,
      title: prog.program_number ?? prog.source_path,
      excerpt: `Customer: ${prog.customer}, Material: ${prog.material ?? "unknown"}, Tools: ${prog.tool_count}, Ops: ${prog.operation_types.join(",")}`,
      metadata: {
        source_path: prog.source_path,
        customer: prog.customer,
        material: prog.material,
        machine_type: prog.machine_type,
        controller: prog.controller,
        tool_count: prog.tool_count,
        operation_types: prog.operation_types,
        cycle_time_sec: prog.cycle_time_sec,
      },
    }));

    return {
      query: input.query,
      results,
      total_candidates: this.index.programs.length,
      search_time_ms: performance.now() - start,
      index_version: this.index.generated_at,
    };
  }

  /**
   * Get current index stats.
   */
  static getIndexStats(): ProgramRAGIndex["summary"] | null {
    if (!this.index) {
      this.loadIndex();
    }
    return this.index?.summary ?? null;
  }

  /**
   * Engine self-awareness metadata.
   */
  static getSelfAwareness() {
    return {
      name: "JMDieProgramRAGEngine",
      version: "1.0.0",
      milestone: "U-LEARN-04",
      capabilities: [
        "buildIndex",
        "loadIndex",
        "findSimilarPrograms",
        "getIndexStats",
      ],
      description: "Hybrid BM25+semantic retrieval over 22,721 JM Die CNC programs",
      index_path: this.INDEX_PATH,
      index_loaded: this.index !== null,
    };
  }
}

export const jmDieProgramRAGEngine = JMDieProgramRAGEngine;
