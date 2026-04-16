/**
 * SemanticSimilarityGuardEngine — Semantic Duplicate Detection
 *
 * Phase 0.2 from AGI proximity plan. Provides embedding-based dedup
 * using term weighting and cosine similarity on JSDoc + method signatures.
 *
 * Uses local TF-IDF-style term weighting (no external models required).
 * For Phase 0.19, can be upgraded to use MiniLM embeddings via Ollama.
 *
 * @module engines/SemanticSimilarityGuardEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ============================================================================
// TYPES
// ============================================================================

export interface SemanticCheckResult {
  isDuplicate: boolean;
  similarity: number;
  matchedAsset?: string;
  matchedPath?: string;
  explanation: string;
  zone: "green" | "yellow" | "red"; // green = proceed, yellow = review, red = block
}

export interface AssetSignature {
  name: string;
  path: string;
  terms: Map<string, number>; // term → TF-IDF weight
  methodSignatures: string[];
  jsdocSummary: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIMILARITY_THRESHOLD_RED = 0.85; // Block
const SIMILARITY_THRESHOLD_YELLOW = 0.70; // Review

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "to", "of", "in",
  "for", "on", "with", "at", "by", "from", "as", "into", "through",
  "during", "before", "after", "above", "below", "between", "under",
  "this", "that", "these", "those", "it", "its", "and", "or", "but",
  "if", "then", "else", "when", "where", "which", "who", "what",
  "return", "returns", "param", "params", "async", "await", "export",
  "import", "const", "let", "var", "function", "class", "interface",
  "type", "void", "string", "number", "boolean", "any", "unknown",
]);

// Manufacturing domain terms get boosted weight (for relevance ranking)
const DOMAIN_BOOST_TERMS = new Set([
  "force", "cutting", "speed", "feed", "spindle", "tool", "wear", "life",
  "surface", "finish", "roughness", "chatter", "vibration", "deflection",
  "thermal", "temperature", "coolant", "chip", "material", "steel",
  "aluminum", "titanium", "carbide", "insert", "holder", "lathe", "mill",
  "edm", "grinding", "turning", "milling", "boring", "drilling", "threading",
  "grooving", "parting", "cnc", "gcode", "program", "toolpath", "cam", "cad",
  "machining", "physics", "algorithm", "calculation", "prediction", "simulation",
]);

// ============================================================================
// CACHE STATE
// ============================================================================

let SIGNATURE_CACHE: Map<string, AssetSignature> | null = null;
let IDF_CACHE: Map<string, number> | null = null;
let CACHE_LOADED_AT = 0;
const CACHE_TTL_MS = 300000; // 5 minutes

// ============================================================================
// ENGINE
// ============================================================================

export class SemanticSimilarityGuardEngine {
  private baseDir: string;

  constructor() {
    const thisFile = fileURLToPath(import.meta.url);
    this.baseDir = path.resolve(path.dirname(thisFile), "..", "..");
    log.info("[SemanticSimilarity] Initialized — semantic duplicate detection");
  }

  // ============================================================================
  // MAIN API
  // ============================================================================

  /**
   * Check if proposed content is semantically similar to existing assets
   * Uses cosine similarity on TF-IDF weighted term vectors
   */
  async checkSimilarity(
    proposedName: string,
    proposedDescription: string,
    proposedContent?: string
  ): Promise<SemanticCheckResult> {
    const signatures = await this.loadSignatures();

    // Build signature for proposed asset
    const proposedTerms = this.extractTerms(
      `${proposedName} ${proposedDescription} ${proposedContent || ""}`
    );
    const proposedTfIdf = this.computeTfIdf(proposedTerms);

    // Find most similar existing asset
    let maxSimilarity = 0;
    let matchedAsset: AssetSignature | null = null;

    for (const [, signature] of signatures) {
      const similarity = this.cosineSimilarity(proposedTfIdf, signature.terms);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        matchedAsset = signature;
      }
    }

    // Determine zone
    let zone: "green" | "yellow" | "red";
    let explanation: string;

    if (maxSimilarity >= SIMILARITY_THRESHOLD_RED) {
      zone = "red";
      explanation = `BLOCKED: ${Math.round(maxSimilarity * 100)}% semantic similarity to "${matchedAsset?.name}". ` +
        `This appears to be a duplicate. Use existing asset or extend it instead.`;
    } else if (maxSimilarity >= SIMILARITY_THRESHOLD_YELLOW) {
      zone = "yellow";
      explanation = `REVIEW: ${Math.round(maxSimilarity * 100)}% semantic similarity to "${matchedAsset?.name}". ` +
        `Consider extending existing asset instead of creating new.`;
    } else {
      zone = "green";
      explanation = `PROCEED: No significant semantic overlap found (highest ${Math.round(maxSimilarity * 100)}%).`;
    }

    return {
      isDuplicate: zone === "red",
      similarity: maxSimilarity,
      matchedAsset: matchedAsset?.name,
      matchedPath: matchedAsset?.path,
      explanation,
      zone,
    };
  }

  /**
   * Hard check that throws on duplicate (for use in hooks)
   */
  async mustNotBeSimilar(
    proposedName: string,
    proposedDescription: string,
    proposedContent?: string
  ): Promise<void> {
    const result = await this.checkSimilarity(proposedName, proposedDescription, proposedContent);

    if (result.zone === "red") {
      throw new Error(
        `[SEMANTIC SIMILARITY BLOCK] Cannot create "${proposedName}" — ` +
        `${Math.round(result.similarity * 100)}% similar to "${result.matchedAsset}" ` +
        `at ${result.matchedPath}. Use existing asset instead.`
      );
    }
  }

  /**
   * Get similarity score between two pieces of content
   */
  computeSimilarity(content1: string, content2: string): number {
    const terms1 = this.extractTerms(content1);
    const terms2 = this.extractTerms(content2);
    const tfidf1 = this.computeTfIdf(terms1);
    const tfidf2 = this.computeTfIdf(terms2);
    return this.cosineSimilarity(tfidf1, tfidf2);
  }

  /**
   * Register a new asset's signature (call after successful creation)
   */
  async registerAsset(
    name: string,
    assetPath: string,
    description: string,
    content: string
  ): Promise<void> {
    const signatures = await this.loadSignatures();

    const terms = this.extractTerms(`${name} ${description} ${content}`);
    const tfidf = this.computeTfIdf(terms);
    const methods = this.extractMethodSignatures(content);

    signatures.set(name.toLowerCase(), {
      name,
      path: assetPath,
      terms: tfidf,
      methodSignatures: methods,
      jsdocSummary: this.extractJsDoc(content),
    });

    // Persist to cache file
    await this.persistSignatures(signatures);
    log.info(`[SemanticSimilarity] Registered signature for ${name}`);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async loadSignatures(): Promise<Map<string, AssetSignature>> {
    if (SIGNATURE_CACHE && Date.now() - CACHE_LOADED_AT < CACHE_TTL_MS) {
      return SIGNATURE_CACHE;
    }

    log.info("[SemanticSimilarity] Loading signatures...");
    const signatures = new Map<string, AssetSignature>();
    const idfCounts = new Map<string, number>();

    // Load from cache file
    const cachePath = path.join(this.baseDir, "data", "state", "SEMANTIC_SIGNATURES.json");
    try {
      if (fs.existsSync(cachePath)) {
        const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
        for (const [key, sig] of Object.entries(cached.signatures || {})) {
          const signature = sig as any;
          signatures.set(key, {
            ...signature,
            terms: new Map(Object.entries(signature.terms || {})),
          });
        }
        IDF_CACHE = new Map(Object.entries(cached.idf || {}));
      }
    } catch (err) {
      log.warn(`[SemanticSimilarity] Could not load cache: ${err}`);
    }

    // If cache is empty, build from engines directory
    if (signatures.size === 0) {
      await this.buildSignaturesFromEngines(signatures, idfCounts);
    }

    SIGNATURE_CACHE = signatures;
    CACHE_LOADED_AT = Date.now();

    log.info(`[SemanticSimilarity] Loaded ${signatures.size} signatures`);
    return signatures;
  }

  private async buildSignaturesFromEngines(
    signatures: Map<string, AssetSignature>,
    idfCounts: Map<string, number>
  ): Promise<void> {
    const enginesDir = path.join(this.baseDir, "src", "engines");
    try {
      const files = fs.readdirSync(enginesDir)
        .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts"))
        .slice(0, 200); // Limit initial load for performance

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(enginesDir, file), "utf-8");
          const name = file.replace(".ts", "");
          const terms = this.extractTerms(`${name} ${content}`);
          const tfidf = this.computeTfIdfRaw(terms, idfCounts, signatures.size);

          signatures.set(name.toLowerCase(), {
            name,
            path: `src/engines/${file}`,
            terms: tfidf,
            methodSignatures: this.extractMethodSignatures(content),
            jsdocSummary: this.extractJsDoc(content),
          });

          // Update IDF counts
          for (const term of terms.keys()) {
            idfCounts.set(term, (idfCounts.get(term) || 0) + 1);
          }
        } catch {
          // Skip files that can't be read
        }
      }

      // Recompute TF-IDF with final IDF values
      const totalDocs = signatures.size;
      IDF_CACHE = new Map();
      for (const [term, count] of idfCounts) {
        IDF_CACHE.set(term, Math.log(totalDocs / (1 + count)));
      }

      // Persist initial cache
      await this.persistSignatures(signatures);
    } catch (err) {
      log.warn(`[SemanticSimilarity] Failed to build signatures: ${err}`);
    }
  }

  private async persistSignatures(signatures: Map<string, AssetSignature>): Promise<void> {
    const cachePath = path.join(this.baseDir, "data", "state", "SEMANTIC_SIGNATURES.json");

    const serializable: Record<string, any> = {};
    for (const [key, sig] of signatures) {
      serializable[key] = {
        ...sig,
        terms: Object.fromEntries(sig.terms),
      };
    }

    const content = {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      signatures: serializable,
      idf: IDF_CACHE ? Object.fromEntries(IDF_CACHE) : {},
    };

    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(cachePath, JSON.stringify(content));
  }

  private extractTerms(text: string): Map<string, number> {
    const terms = new Map<string, number>();

    // Tokenize: split on non-alphanumeric, convert to lowercase
    const tokens = text.toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(t => t.length >= 2 && !STOP_WORDS.has(t));

    // Count term frequency
    for (const token of tokens) {
      const count = terms.get(token) || 0;
      terms.set(token, count + 1);
    }

    return terms;
  }

  private computeTfIdf(terms: Map<string, number>): Map<string, number> {
    const tfidf = new Map<string, number>();
    const totalTerms = Array.from(terms.values()).reduce((a, b) => a + b, 0);

    for (const [term, count] of terms) {
      const tf = count / totalTerms;
      const idf = IDF_CACHE?.get(term) ?? 1.5; // Default IDF for unseen terms
      let weight = tf * idf;

      // Boost domain-specific terms
      if (DOMAIN_BOOST_TERMS.has(term)) {
        weight *= 2.0;
      }

      tfidf.set(term, weight);
    }

    return tfidf;
  }

  private computeTfIdfRaw(
    terms: Map<string, number>,
    idfCounts: Map<string, number>,
    totalDocs: number
  ): Map<string, number> {
    const tfidf = new Map<string, number>();
    const totalTerms = Array.from(terms.values()).reduce((a, b) => a + b, 0);

    for (const [term, count] of terms) {
      const tf = count / totalTerms;
      const docCount = idfCounts.get(term) || 0;
      const idf = Math.log((totalDocs + 1) / (docCount + 1));
      let weight = tf * idf;

      if (DOMAIN_BOOST_TERMS.has(term)) {
        weight *= 2.0;
      }

      tfidf.set(term, weight);
    }

    return tfidf;
  }

  private cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    // Compute dot product
    for (const [term, weight1] of vec1) {
      const weight2 = vec2.get(term) || 0;
      dotProduct += weight1 * weight2;
      norm1 += weight1 * weight1;
    }

    // Add remaining terms from vec2 to norm2
    for (const [, weight2] of vec2) {
      norm2 += weight2 * weight2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private extractMethodSignatures(content: string): string[] {
    const signatures: string[] = [];
    const methodPattern = /(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?/g;

    let match;
    while ((match = methodPattern.exec(content)) !== null) {
      if (!["if", "for", "while", "switch", "catch", "constructor"].includes(match[1])) {
        signatures.push(match[0].trim());
      }
    }

    return signatures.slice(0, 20); // Limit to 20 methods
  }

  private extractJsDoc(content: string): string {
    const jsdocPattern = /\/\*\*[\s\S]*?\*\//;
    const match = content.match(jsdocPattern);
    return match ? match[0].slice(0, 500) : "";
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const semanticSimilarityGuardEngine = new SemanticSimilarityGuardEngine();
