/**
 * LocalEmbeddingEngine — In-process embeddings via @xenova/transformers
 *
 * Phase external-infra. Runs Xenova's ONNX-backed MiniLM (or any feature-
 * extraction model) entirely in the Node process so PRISM's awareness and
 * semantic-similarity stack has a zero-service embeddings backend. The
 * Ollama/Qdrant path is still the production option for bigger models; this
 * engine is the always-available fallback that runs in the MCP server with
 * no external daemon.
 *
 * Model files are downloaded on first use and cached in
 * `mcp-server/data/transformers-cache/`. You can change the model by passing
 * a different `model` argument to `load()`.
 *
 * @module engines/LocalEmbeddingEngine
 * @milestone PP-INFRA-LOCAL-EMBED
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pipeline = (input: string | string[], opts?: Record<string, unknown>) => Promise<any>;

export interface LoadOptions {
  model?: string;
  cacheDir?: string;
}

export interface EmbedResult {
  ok: boolean;
  vector: number[];
  model: string;
  wallMs: number;
  error: string | null;
}

export const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";
export const DEFAULT_DIM = 384;

export class LocalEmbeddingEngine {
  private pipeline: Pipeline | null = null;
  private model = DEFAULT_MODEL;
  private loading: Promise<void> | null = null;

  async load(options: LoadOptions = {}): Promise<boolean> {
    const model = options.model ?? DEFAULT_MODEL;
    if (this.pipeline && model === this.model) return true;

    if (this.loading) {
      await this.loading;
      return this.pipeline !== null && this.model === model;
    }

    this.loading = (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = (await import("@xenova/transformers")) as any;
        if (options.cacheDir) {
          mod.env.cacheDir = options.cacheDir;
        } else {
          // Default cache to a project-local path so docker volumes can persist it.
          mod.env.cacheDir = "mcp-server/data/transformers-cache";
        }
        mod.env.allowLocalModels = true;
        // `pipeline()` returns a callable task-specific helper.
        const p: Pipeline = await mod.pipeline("feature-extraction", model, {
          quantized: true,
        });
        this.pipeline = p;
        this.model = model;
      } catch {
        this.pipeline = null;
      } finally {
        this.loading = null;
      }
    })();

    await this.loading;
    return this.pipeline !== null;
  }

  isLoaded(): boolean {
    return this.pipeline !== null;
  }

  getModel(): string {
    return this.model;
  }

  async embed(text: string): Promise<EmbedResult> {
    const started = Date.now();
    this.validateText(text);
    if (!this.pipeline) {
      const loaded = await this.load();
      if (!loaded) {
        return {
          ok: false,
          vector: [],
          model: this.model,
          wallMs: Date.now() - started,
          error: "failed to load local embedding model",
        };
      }
    }
    try {
      // mean-pooled normalized sentence embedding
      const out = await this.pipeline!(text, { pooling: "mean", normalize: true });
      const vector = Array.from(out?.data ?? []);
      if (vector.length === 0) {
        return {
          ok: false,
          vector: [],
          model: this.model,
          wallMs: Date.now() - started,
          error: "empty embedding",
        };
      }
      return {
        ok: true,
        vector: vector.map((v) => (typeof v === "number" ? v : Number(v))),
        model: this.model,
        wallMs: Date.now() - started,
        error: null,
      };
    } catch (e) {
      return {
        ok: false,
        vector: [],
        model: this.model,
        wallMs: Date.now() - started,
        error: (e as Error)?.message ?? String(e),
      };
    }
  }

  async embedBatch(texts: readonly string[]): Promise<EmbedResult[]> {
    if (!Array.isArray(texts) || texts.length === 0) throw new Error("texts must be non-empty array");
    const out: EmbedResult[] = [];
    for (const t of texts) out.push(await this.embed(t));
    return out;
  }

  /** Cosine similarity between two already-normalized vectors. */
  cosineSimilarity(a: readonly number[], b: readonly number[]): number {
    if (!Array.isArray(a) || !Array.isArray(b)) throw new Error("a and b must be arrays");
    if (a.length === 0 || b.length === 0) throw new Error("vectors must be non-empty");
    if (a.length !== b.length) throw new Error("vector length mismatch");
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / Math.sqrt(na * nb);
  }

  unload(): void {
    this.pipeline = null;
    this.model = DEFAULT_MODEL;
  }

  private validateText(text: string): void {
    if (typeof text !== "string") throw new Error("text must be string");
    if (text.length === 0) throw new Error("text must be non-empty");
    if (text.length > 20_000) throw new Error("text too long for a single embedding call");
  }
}

export const localEmbeddingEngine = new LocalEmbeddingEngine();
