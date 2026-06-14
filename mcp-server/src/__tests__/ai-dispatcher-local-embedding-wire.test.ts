/**
 * prism_ai local_embedding_* wiring test
 * ======================================
 * INDIA-AI-ORPHAN-WIRE unit 2 (bravo, 2026-06-11): wires the dispatcher-DARK
 * `LocalEmbeddingEngine` (the india-AI-core zero-service ONNX MiniLM embedding
 * backbone; 3 consumers, all themselves dispatcher-dark) into prism_ai via
 * `local_embedding_status` + `local_embedding_similarity`.
 *
 * `cosineSimilarity` is pure deterministic math over caller-supplied vectors, so
 * every assertion is an exact known value (1, 0, -1, 1/sqrt(2)) or engine-parity.
 * `embed()` (model-loading) is intentionally NOT wired, so this test never loads
 * the ONNX model -- it exercises only readiness + the cosine primitive.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { localEmbeddingEngine } from "../engines/LocalEmbeddingEngine.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerAIReasoningDispatcher(fakeServer);
  return { handler };
}

async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

// The dispatcher wraps the case result in a {success, data: slimResponse(result)} envelope,
// so the case payload is under `.data`.
describe("prism_ai local_embedding_* (INDIA-AI-ORPHAN-WIRE unit 2)", () => {
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer().handler;
  });

  // ---- HAPPY 1: status reports the engine's live readiness + model (parity) ----
  it("local_embedding_status matches the engine's live isLoaded()/getModel()", async () => {
    const r = await call(handler, "local_embedding_status");
    expect(r.data.success).toBe(true);
    expect(r.data.loaded).toBe(localEmbeddingEngine.isLoaded());
    expect(r.data.model).toBe(localEmbeddingEngine.getModel());
  });

  // ---- HAPPY 2: identical vectors -> cosine exactly 1 ----
  it("local_embedding_similarity of identical vectors is exactly 1", async () => {
    const r = await call(handler, "local_embedding_similarity", { a: [1, 0, 0], b: [1, 0, 0] });
    expect(r.data.success).toBe(true);
    expect(r.data.similarity).toBeCloseTo(1, 12);
  });

  // ---- HAPPY 3: orthogonal -> 0, opposite -> -1, 45deg -> 1/sqrt(2) (known cosines) ----
  it("local_embedding_similarity returns exact known cosines (orthogonal=0, opposite=-1, 45deg=0.7071)", async () => {
    const ortho = await call(handler, "local_embedding_similarity", { a: [1, 0], b: [0, 1] });
    expect(ortho.data.similarity).toBeCloseTo(0, 12);
    const opposite = await call(handler, "local_embedding_similarity", { a: [1, 0], b: [-1, 0] });
    expect(opposite.data.similarity).toBeCloseTo(-1, 12);
    const fortyfive = await call(handler, "local_embedding_similarity", { a: [1, 0], b: [1, 1] });
    expect(fortyfive.data.similarity).toBeCloseTo(Math.SQRT1_2, 12); // 1/sqrt(2) = 0.70710678...
  });

  // ---- HAPPY 4: dispatcher equals direct engine call exactly (parity) ----
  it("local_embedding_similarity equals the engine's cosineSimilarity() exactly", async () => {
    const a = [0.2, 0.5, -0.3, 0.8];
    const b = [0.7, -0.1, 0.4, 0.2];
    const direct = localEmbeddingEngine.cosineSimilarity(a, b);
    const r = await call(handler, "local_embedding_similarity", { a, b });
    expect(r.data.similarity).toBe(direct);
  });

  // ---- ADVERSARIAL 1: length mismatch is rejected with a specific error (not a crash, not NaN) ----
  it("local_embedding_similarity rejects mismatched vector lengths", async () => {
    const r = await call(handler, "local_embedding_similarity", { a: [1, 2], b: [1, 2, 3] });
    expect(r.data.success).toBe(false);
    expect(r.data.error).toContain("length mismatch");
  });

  // ---- ADVERSARIAL 2: a non-finite/non-number element is rejected (would silently produce NaN) ----
  it("local_embedding_similarity rejects a non-number element instead of returning NaN", async () => {
    const r = await call(handler, "local_embedding_similarity", { a: [1, "x"], b: [1, 2] });
    expect(r.data.success).toBe(false);
    expect(r.data.error).toContain("finite numbers");
  });

  // ---- ADVERSARIAL 3: empty vectors are rejected ----
  it("local_embedding_similarity rejects empty vectors", async () => {
    const r = await call(handler, "local_embedding_similarity", { a: [], b: [] });
    expect(r.data.success).toBe(false);
    expect(r.data.error).toContain("non-empty");
  });
});
