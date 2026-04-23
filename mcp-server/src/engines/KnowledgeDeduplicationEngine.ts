/**
 * KnowledgeDeduplicationEngine — Cosine Similarity Dedup for Knowledge Tips
 *
 * Detects duplicate and near-duplicate tips before storing in TribalKnowledgeEngine.
 * Uses TF-IDF vectorization with cosine similarity for text comparison.
 *
 * Thresholds:
 * - similarity > 0.85 → DUPLICATE (merge metadata, don't create new)
 * - similarity 0.65–0.85 → RELATED (link as "see also")
 * - similarity < 0.65 → NOVEL (store as new tip)
 *
 * @milestone LEARN-MS0 U-LEARN03
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DeduplicationResult {
  is_duplicate: boolean;
  is_related: boolean;
  similarity_score: number;
  existing_tip_id: string | null;
  existing_tip_title: string | null;
  action_taken: "skip_duplicate" | "link_related" | "store_new";
  related_tips: Array<{ id: string; title: string; similarity: number }>;
}

export interface DeduplicationConfig {
  duplicate_threshold?: number;   // default 0.85
  related_threshold?: number;     // default 0.65
  max_related?: number;           // default 5
}

// ============================================================================
// TF-IDF IMPLEMENTATION
// ============================================================================

/** Tokenize text into normalized words. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/** Common English stop words to exclude from TF-IDF. */
const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can",
  "her", "was", "one", "our", "out", "has", "have", "had", "been",
  "its", "from", "this", "that", "with", "will", "would", "there",
  "their", "what", "about", "which", "when", "make", "like", "time",
  "just", "know", "take", "come", "could", "than", "look", "only",
  "into", "year", "some", "them", "then", "also", "after", "use",
  "two", "how", "way", "who", "get", "may", "said", "each", "tell",
  "does", "set", "want", "very", "your", "more", "should", "using",
]);

/** Compute term frequency for a document. */
function computeTF(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  // Normalize by document length
  const len = tokens.length || 1;
  for (const [term, count] of freq) {
    freq.set(term, count / len);
  }
  return freq;
}

/** Compute IDF from a corpus of documents. */
function computeIDF(corpus: Map<string, number>[]): Map<string, number> {
  const docCount = corpus.length || 1;
  const df = new Map<string, number>();
  for (const doc of corpus) {
    for (const term of doc.keys()) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log(docCount / count) + 1);
  }
  return idf;
}

/** Compute cosine similarity between two sparse vectors. */
function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, valA] of a) {
    const valB = b.get(term) || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
  }
  for (const valB of b.values()) {
    normB += valB * valB;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

// ============================================================================
// ENGINE
// ============================================================================

class KnowledgeDeduplicationEngineImpl {

  /**
   * Check if a new tip is a duplicate or related to existing tips.
   * @param newText - The new tip text to check
   * @param existingTips - Array of existing tip texts with IDs
   * @param config - Deduplication thresholds
   */
  check(
    newText: string,
    existingTips: Array<{ id: string; title: string; body: string }>,
    config?: DeduplicationConfig,
  ): DeduplicationResult {
    const dupThreshold = config?.duplicate_threshold ?? 0.85;
    const relatedThreshold = config?.related_threshold ?? 0.65;
    const maxRelated = config?.max_related ?? 5;

    if (!newText || newText.trim().length === 0) {
      return {
        is_duplicate: false, is_related: false, similarity_score: 0,
        existing_tip_id: null, existing_tip_title: null,
        action_taken: "store_new", related_tips: [],
      };
    }

    if (existingTips.length === 0) {
      return {
        is_duplicate: false, is_related: false, similarity_score: 0,
        existing_tip_id: null, existing_tip_title: null,
        action_taken: "store_new", related_tips: [],
      };
    }

    // Tokenize all documents
    const newTokens = tokenize(newText);
    const existingTokenized = existingTips.map(t => ({
      id: t.id,
      title: t.title,
      tokens: tokenize(t.body),
    }));

    // Build corpus TF
    const newTF = computeTF(newTokens);
    const existingTFs = existingTokenized.map(e => computeTF(e.tokens));

    // Compute IDF across corpus (including new doc)
    const allTFs = [newTF, ...existingTFs];
    const idf = computeIDF(allTFs);

    // Compute TF-IDF vectors
    const newVec = new Map<string, number>();
    for (const [term, tf] of newTF) {
      newVec.set(term, tf * (idf.get(term) || 1));
    }

    // Compare against each existing tip
    const similarities: Array<{ id: string; title: string; similarity: number }> = [];
    for (let i = 0; i < existingTFs.length; i++) {
      const existVec = new Map<string, number>();
      for (const [term, tf] of existingTFs[i]) {
        existVec.set(term, tf * (idf.get(term) || 1));
      }
      const sim = cosineSimilarity(newVec, existVec);
      similarities.push({ id: existingTokenized[i].id, title: existingTokenized[i].title, similarity: sim });
    }

    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);

    const best = similarities[0];
    const bestScore = best?.similarity ?? 0;

    if (bestScore >= dupThreshold) {
      return {
        is_duplicate: true, is_related: false, similarity_score: bestScore,
        existing_tip_id: best.id, existing_tip_title: best.title,
        action_taken: "skip_duplicate",
        related_tips: similarities.filter(s => s.similarity >= relatedThreshold).slice(0, maxRelated),
      };
    }

    if (bestScore >= relatedThreshold) {
      return {
        is_duplicate: false, is_related: true, similarity_score: bestScore,
        existing_tip_id: best.id, existing_tip_title: best.title,
        action_taken: "link_related",
        related_tips: similarities.filter(s => s.similarity >= relatedThreshold).slice(0, maxRelated),
      };
    }

    return {
      is_duplicate: false, is_related: false, similarity_score: bestScore,
      existing_tip_id: null, existing_tip_title: null,
      action_taken: "store_new",
      related_tips: similarities.filter(s => s.similarity >= relatedThreshold).slice(0, maxRelated),
    };
  }

  /**
   * Batch check multiple tips against existing corpus.
   */
  batchCheck(
    newTexts: Array<{ text: string; id?: string }>,
    existingTips: Array<{ id: string; title: string; body: string }>,
    config?: DeduplicationConfig,
  ): Array<DeduplicationResult & { input_index: number }> {
    return newTexts.map((item, idx) => ({
      ...this.check(item.text, existingTips, config),
      input_index: idx,
    }));
  }
}

export const knowledgeDeduplicationEngine = new KnowledgeDeduplicationEngineImpl();
