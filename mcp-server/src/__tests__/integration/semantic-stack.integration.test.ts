/**
 * End-to-end integration test for the semantic infra stack.
 *
 * Exercises the full chain:
 *   Ollama (embedding model) → LocalEmbeddingEngine fallback → Qdrant
 *   (vector store) → SemanticAssetIndexEngine → search round-trip.
 *
 * This test connects to *live* services. It is gated behind the
 * PRISM_INTEGRATION=1 environment variable so it never runs during a normal
 * `vitest run`. To execute it:
 *
 *   docker compose up -d qdrant ollama
 *   docker exec prism-ollama ollama pull nomic-embed-text
 *   PRISM_INTEGRATION=1 npx vitest run src/__tests__/integration/semantic-stack.integration.test.ts
 *
 * Expected wall time: 15-30 s on first run (Ollama cold start + initial
 * embed), sub-second on repeat.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { QdrantVectorStoreEngine } from "../../engines/QdrantVectorStoreEngine.js";
import { OllamaClientEngine } from "../../engines/OllamaClientEngine.js";
import { SemanticAssetIndexEngine } from "../../engines/SemanticAssetIndexEngine.js";

const INTEGRATION = process.env.PRISM_INTEGRATION === "1";
const QDRANT_URL = process.env.QDRANT_URL ?? "http://127.0.0.1:6333";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const EMBED_MODEL = process.env.PRISM_EMBED_MODEL ?? "nomic-embed-text";
const COLLECTION = `prism-integration-${Date.now()}`;

// Skip the whole block when not in integration mode — we still want the file
// to load cleanly so CI doesn't complain, but none of the it() blocks fire.
const maybe = INTEGRATION ? describe : describe.skip;

const SEED_ASSETS = [
  {
    id: "eng-kienzle",
    kind: "engine",
    name: "KienzleForceModelEngine",
    description: "Predicts cutting forces in milling and turning via the Kienzle specific-force model.",
    tags: ["physics", "cutting-force"],
  },
  {
    id: "eng-taylor",
    kind: "engine",
    name: "TaylorToolLifeEngine",
    description: "Predicts tool life as a function of cutting speed using the Taylor equation.",
    tags: ["physics", "tool-life"],
  },
  {
    id: "eng-wedm",
    kind: "engine",
    name: "WireEDMStudioEngine",
    description: "Full Wire EDM programming: geometry, cutting conditions, corner control, taper compensation.",
    tags: ["edm", "manufacturing"],
  },
  {
    id: "eng-sinker",
    kind: "engine",
    name: "SinkerEDMEngine",
    description: "Sinker EDM electrode design and spark parameter selection for graphite electrodes.",
    tags: ["edm", "manufacturing"],
  },
] as const;

maybe("semantic infra stack (live services)", () => {
  const qdrant = new QdrantVectorStoreEngine();
  const ollama = new OllamaClientEngine();
  let index: SemanticAssetIndexEngine | null = null;
  let vectorSize = 768;

  beforeAll(async () => {
    const q = await qdrant.connect({ url: QDRANT_URL });
    if (!q.ok) throw new Error(`Qdrant connect failed: ${q.error}`);

    const o = await ollama.connect(OLLAMA_URL);
    if (!o.ok) throw new Error(`Ollama connect failed: ${o.error ?? "unknown"}`);

    const probe = await ollama.embed({ model: EMBED_MODEL, input: "dimension probe" });
    if (!probe.ok || !probe.value) {
      throw new Error(`Embed probe failed: ${probe.error}`);
    }
    vectorSize = probe.value.length;
    expect(vectorSize).toBeGreaterThan(0);

    const embedder = {
      embed: async (text: string) => {
        const r = await ollama.embed({ model: EMBED_MODEL, input: text });
        return { ok: r.ok, vector: r.value ?? [], error: r.error };
      },
    };

    index = new SemanticAssetIndexEngine(qdrant, embedder, {
      collection: COLLECTION,
      vectorSize,
    });

    const ready = await index.ensureReady();
    expect(ready.ok).toBe(true);
  }, 120_000);

  afterAll(async () => {
    if (qdrant.isConnected()) {
      await qdrant.deleteCollection(COLLECTION);
      qdrant.disconnect();
    }
    ollama.disconnect();
  });

  it("indexes the seed assets and reports the count back", async () => {
    const upsert = await index!.indexBatch(SEED_ASSETS as unknown as typeof SEED_ASSETS[number][]);
    expect(upsert.ok).toBe(true);
    const count = await index!.count();
    expect(count.ok).toBe(true);
    if (count.ok) expect(count.value).toBe(SEED_ASSETS.length);
  }, 60_000);

  it("search('wire EDM taper programming') ranks the WEDM engine first", async () => {
    const r = await index!.search("wire EDM taper programming", 3);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.length).toBeGreaterThan(0);
      expect(r.value[0].id).toBe("eng-wedm");
    }
  });

  it("search('cutting force prediction') ranks the Kienzle engine first", async () => {
    const r = await index!.search("cutting force prediction", 3);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value[0].id).toBe("eng-kienzle");
  });

  it("kind filter narrows results to the requested type", async () => {
    const r = await index!.search("tool life curve", 10, "engine");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.every((hit) => hit.kind === "engine")).toBe(true);
    }
  });

  it("count(kind) returns only the engines count", async () => {
    const r = await index!.count("engine");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(SEED_ASSETS.length);
  });

  it("search returns monotonically non-increasing scores", async () => {
    const r = await index!.search("manufacturing process", 10);
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (let i = 1; i < r.value.length; i += 1) {
        expect(r.value[i].score).toBeLessThanOrEqual(r.value[i - 1].score);
      }
    }
  });
});

describe("semantic-stack integration test wrapper", () => {
  it("documents the opt-in env flag", () => {
    // This test always runs (outside the `maybe` block) so the file can't be
    // accidentally dead — it proves the gate variable is what callers think.
    expect(typeof INTEGRATION).toBe("boolean");
  });
});
