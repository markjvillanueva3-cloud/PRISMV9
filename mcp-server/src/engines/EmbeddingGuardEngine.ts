/**
 * EmbeddingGuardEngine — Tiered cosine-similarity gate with injectable embedder
 *
 * Phase 0.16 U-OP13 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Complements the
 * existing TF-IDF-based SemanticSimilarityGuardEngine by evaluating the
 * three-band rule (green/yellow/red) against real sentence embeddings
 * produced by LocalEmbeddingEngine (or any injected embedder).
 *
 *   green  (< 0.70)            → pass
 *   yellow (0.70 ≤ c ≤ 0.85)   → warn + require justification
 *   red    (> 0.85)            → block
 *
 * Exact-name collisions are fast-pathed to red even when the embedder is
 * offline. If the embedder fails mid-check we degrade to yellow so a block
 * isn't silently lost — the caller still must justify, and a future run
 * with a working embedder can tighten or loosen the decision.
 *
 * @module engines/EmbeddingGuardEngine
 * @milestone PP-0.16-U-OP13
 */

export type GuardBand = "green" | "yellow" | "red";

export interface GuardCandidate {
  id: string;
  name: string;
  description: string;
}

export interface GuardReference {
  id: string;
  name: string;
  description: string;
  vector: number[];
}

export interface GuardConfig {
  yellowAt: number;
  redAt: number;
}

export const DEFAULT_EMBEDDING_GUARD_CONFIG: GuardConfig = Object.freeze({
  yellowAt: 0.70,
  redAt: 0.85,
});

export interface GuardEmbedder {
  embed(text: string): Promise<{ ok: boolean; vector: number[]; error: string | null }>;
}

export interface GuardMatch {
  reference: { id: string; name: string };
  similarity: number;
  band: GuardBand;
}

export interface GuardDecision {
  candidateId: string;
  band: GuardBand;
  topMatches: GuardMatch[];
  rationale: string;
  requiresJustification: boolean;
}

export class EmbeddingGuardEngine {
  private readonly references: GuardReference[] = [];
  private readonly embedder: GuardEmbedder;
  private config: GuardConfig;

  constructor(embedder: GuardEmbedder, config: GuardConfig = DEFAULT_EMBEDDING_GUARD_CONFIG) {
    if (!embedder || typeof embedder.embed !== "function") {
      throw new Error("embedder with embed(text) required");
    }
    this.validateConfig(config);
    this.embedder = embedder;
    this.config = config;
  }

  setConfig(config: GuardConfig): void {
    this.validateConfig(config);
    this.config = config;
  }

  getConfig(): GuardConfig {
    return this.config;
  }

  addReference(ref: GuardReference): void {
    this.validateReference(ref);
    if (this.references.some((r) => r.id === ref.id)) {
      throw new Error(`reference id '${ref.id}' already registered`);
    }
    this.references.push({ ...ref, vector: [...ref.vector] });
  }

  referenceCount(): number {
    return this.references.length;
  }

  clear(): void {
    this.references.length = 0;
  }

  async evaluate(candidate: GuardCandidate, topK = 3): Promise<GuardDecision> {
    this.validateCandidate(candidate);
    if (!Number.isInteger(topK) || topK <= 0) throw new Error("topK must be positive integer");

    const exact = this.references.find(
      (r) => r.name.trim().toLowerCase() === candidate.name.trim().toLowerCase()
    );
    if (exact) {
      return {
        candidateId: candidate.id,
        band: "red",
        topMatches: [{ reference: { id: exact.id, name: exact.name }, similarity: 1, band: "red" }],
        rationale: `exact name collision with '${exact.name}'`,
        requiresJustification: true,
      };
    }

    if (this.references.length === 0) {
      return {
        candidateId: candidate.id,
        band: "green",
        topMatches: [],
        rationale: "no registered references",
        requiresJustification: false,
      };
    }

    const embed = await this.embedder.embed(`${candidate.name}\n${candidate.description}`);
    if (!embed.ok || embed.vector.length === 0) {
      return {
        candidateId: candidate.id,
        band: "yellow",
        topMatches: [],
        rationale: `embedder unavailable (${embed.error ?? "unknown"}); defaulting to yellow`,
        requiresJustification: true,
      };
    }

    const scored = this.references
      .filter((r) => r.vector.length === embed.vector.length)
      .map((r) => {
        const sim = cosine(embed.vector, r.vector);
        return {
          reference: { id: r.id, name: r.name },
          similarity: round4(sim),
          band: this.bandFor(sim),
        };
      })
      .sort((a, b) => b.similarity - a.similarity);

    const top = scored.slice(0, topK);
    const maxBand = top.reduce<GuardBand>((worst, m) => worseBand(worst, m.band), "green");
    const rationale =
      top.length === 0
        ? "no reference vectors comparable (dimension mismatch)"
        : `top similarity ${top[0].similarity.toFixed(4)} vs '${top[0].reference.name}' → ${maxBand}`;

    return {
      candidateId: candidate.id,
      band: maxBand,
      topMatches: top,
      rationale,
      requiresJustification: maxBand !== "green",
    };
  }

  bandFor(similarity: number): GuardBand {
    if (similarity > this.config.redAt) return "red";
    if (similarity >= this.config.yellowAt) return "yellow";
    return "green";
  }

  // --- internals ---------------------------------------------------------

  private validateConfig(c: GuardConfig): void {
    if (!(c.yellowAt > 0 && c.yellowAt < 1)) throw new Error("yellowAt must be in (0, 1)");
    if (!(c.redAt > 0 && c.redAt < 1)) throw new Error("redAt must be in (0, 1)");
    if (c.redAt <= c.yellowAt) throw new Error("redAt must be > yellowAt");
  }

  private validateReference(r: GuardReference): void {
    if (!r.id || r.id.trim() === "") throw new Error("reference.id required");
    if (!r.name || r.name.trim() === "") throw new Error("reference.name required");
    if (!Array.isArray(r.vector) || r.vector.length === 0) throw new Error("reference.vector must be non-empty");
    for (const v of r.vector) {
      if (!Number.isFinite(v)) throw new Error("vector values must be finite");
    }
  }

  private validateCandidate(c: GuardCandidate): void {
    if (!c.id || c.id.trim() === "") throw new Error("candidate.id required");
    if (!c.name || c.name.trim() === "") throw new Error("candidate.name required");
    if (typeof c.description !== "string") throw new Error("candidate.description required");
  }
}

function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

function worseBand(a: GuardBand, b: GuardBand): GuardBand {
  const rank: Record<GuardBand, number> = { green: 0, yellow: 1, red: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
