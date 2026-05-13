// tier: T4
/**
 * nim-embed-bridge.mjs - NeMo Retriever embedding NIM client
 *
 * GPU-accelerated text embeddings via nv-embedqa-e5-v5 (1024-dim).
 * Replaces CPU sentence-transformers / OpenAI text-embedding-3 in PRISM
 * RAG pipelines for ~20x speedup on small-batch lookups.
 *
 * EXPORTS
 *   isEmbedAvailable() -> Promise<boolean>
 *   embed(input, opts) -> { success, embedding(s), error, latencyMs, dim }
 *
 * CONFIG (env)
 *   NIM_EMBED_URL     default http://127.0.0.1:8010/v1
 *   NIM_EMBED_MODEL   default nvidia/nv-embedqa-e5-v5
 *
 * USAGE
 *   const r = await embed("query string");
 *   r.embedding;           // Float32Array length 1024 — single input
 *   const r2 = await embed(["a", "b", "c"]);
 *   r2.embeddings;         // Float32Array[] length 3 — batch input
 */

const EMBED_URL = (process.env.NIM_EMBED_URL || "http://127.0.0.1:8010/v1").replace(/\/$/, "");
const DEFAULT_MODEL = process.env.NIM_EMBED_MODEL || "nvidia/nv-embedqa-e5-v5";

let availCache = { ok: null, ts: 0 };
const AVAIL_TTL_MS = 60_000;
const AVAIL_PROBE_TIMEOUT_MS = 1500;

export async function isEmbedAvailable() {
  const now = Date.now();
  if (availCache.ok !== null && now - availCache.ts < AVAIL_TTL_MS) return availCache.ok;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), AVAIL_PROBE_TIMEOUT_MS);
  let ok = false;
  try {
    const r = await fetch(`${EMBED_URL}/models`, { signal: ctl.signal });
    ok = r.ok;
  } catch { /* unreachable */ }
  finally { clearTimeout(t); }
  availCache = { ok, ts: now };
  return ok;
}

export function resetEmbedAvailabilityCache() {
  availCache = { ok: null, ts: 0 };
}

/**
 * Embed text(s). Accepts string OR string[]. Returns appropriate shape.
 * `inputType: "query" | "passage"` follows E5 convention — query for
 * search inputs, passage for documents being indexed.
 */
export async function embed(input, opts = {}) {
  const started = Date.now();
  const isBatch = Array.isArray(input);
  const inputs = isBatch ? input : [input];
  const model = opts.model || DEFAULT_MODEL;
  const inputType = opts.inputType || "query";
  const timeoutMs = opts.timeoutMs ?? 5000;

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`${EMBED_URL}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: inputs,
        input_type: inputType,
        encoding_format: "float",
      }),
      signal: ctl.signal,
    });
    const text = await r.text();
    if (!r.ok) {
      return {
        success: false,
        error: `nim-embed http ${r.status} ${text.slice(0, 200)}`,
        latencyMs: Date.now() - started,
      };
    }
    const data = JSON.parse(text);
    const vecs = data?.data?.map(d => Float32Array.from(d.embedding)) ?? [];
    const dim = vecs[0]?.length ?? 0;
    const latencyMs = Date.now() - started;
    if (isBatch) {
      return { success: true, embeddings: vecs, dim, latencyMs, backend: "nim-embed", model };
    }
    return { success: true, embedding: vecs[0], dim, latencyMs, backend: "nim-embed", model };
  } catch (e) {
    return {
      success: false,
      error: e?.name === "AbortError" ? "timeout" : (e?.message || String(e)),
      latencyMs: Date.now() - started,
    };
  } finally {
    clearTimeout(t);
  }
}
