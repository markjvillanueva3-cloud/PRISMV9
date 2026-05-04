/**
 * OllamaEmbedderFactory.test.ts
 *
 * Verifies INTEL-OLLAMA-OBSIDIAN-MS0/P0-U01 deliverables:
 *  1. createOllamaEmbedder validates host/model/timeout up-front
 *  2. Runtime validation rejects empty/oversize/non-string inputs
 *  3. Real Ollama call returns 768-dim finite vectors (skipped if Ollama down)
 *  4. ensureQdrantEmbedder is idempotent + injects into the singleton
 *  5. resetEmbedderInstall clears state (test isolation)
 *  6. SessionStart hook smoke-test exits 0 even with empty stdin
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P0-U01
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createOllamaEmbedder,
  ensureQdrantEmbedder,
  resetEmbedderInstall,
  DEFAULT_EMBED_MODEL,
  EXPECTED_EMBED_DIM,
  MAX_EMBED_INPUT_CHARS,
} from "../engines/OllamaEmbedderFactory.js";
import { qdrantMemoryEngine } from "../engines/QdrantMemoryEngine.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOK_PATH = resolve(HERE, "..", "..", "..", ".claude", "hooks", "embedder-inject-qdrant.mjs");
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

async function ollamaReachable(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2_000);
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    return (data.models ?? []).some((m) => m.name.startsWith(DEFAULT_EMBED_MODEL));
  } catch {
    return false;
  }
}

describe("createOllamaEmbedder — factory-time validation", () => {
  it("rejects malformed host URL", () => {
    expect(() => createOllamaEmbedder({ host: "not-a-url" })).toThrow(/invalid Ollama host/);
  });

  it("rejects non-http protocol", () => {
    expect(() => createOllamaEmbedder({ host: "ftp://example.com" })).toThrow(/invalid Ollama host/);
  });

  it("rejects empty model name", () => {
    expect(() => createOllamaEmbedder({ model: "" })).toThrow(/invalid Ollama model/);
  });

  it("rejects negative timeout", () => {
    expect(() => createOllamaEmbedder({ timeoutMs: -1 })).toThrow(/invalid timeoutMs/);
  });

  it("rejects NaN timeout", () => {
    expect(() => createOllamaEmbedder({ timeoutMs: Number.NaN })).toThrow(/invalid timeoutMs/);
  });

  it("returns a callable Embedder for valid inputs", () => {
    const fn = createOllamaEmbedder();
    expect(typeof fn).toBe("function");
  });
});

describe("createOllamaEmbedder — call-time validation", () => {
  it("rejects empty string", async () => {
    const fn = createOllamaEmbedder();
    await expect(fn("")).rejects.toThrow(/non-empty/);
  });

  it("rejects non-string input", async () => {
    const fn = createOllamaEmbedder();
    // @ts-expect-error testing runtime guard against type-erased callers
    await expect(fn(42)).rejects.toThrow(/must be string/);
  });

  it("rejects oversize input", async () => {
    const fn = createOllamaEmbedder();
    const huge = "x".repeat(MAX_EMBED_INPUT_CHARS + 1);
    await expect(fn(huge)).rejects.toThrow(/too long/);
  });

  it("surfaces network errors with descriptive prefix", async () => {
    // Port 1 reliably refuses connections.
    const fn = createOllamaEmbedder({ host: "http://127.0.0.1:1", timeoutMs: 500 });
    await expect(fn("hello")).rejects.toThrow(/network error|HTTP/);
  });
});

describe("ensureQdrantEmbedder — singleton install latch", () => {
  beforeEach(() => {
    resetEmbedderInstall();
  });
  afterEach(() => {
    resetEmbedderInstall();
  });

  it("first call returns true (installed) and engine reports embedder available via remember/recall", async () => {
    const stub = async (): Promise<number[]> => new Array(EXPECTED_EMBED_DIM).fill(0.1);
    const installed = ensureQdrantEmbedder({ embedder: stub });
    expect(installed).toBe(true);
    // Indirect verification: remember should now NOT fail with "embedder not configured".
    // We use a non-network kind path; the failure is upstream (Qdrant unreachable in tests),
    // but the failure must NOT be the embedder one.
    const r = await qdrantMemoryEngine.remember({
      kind: "tip",
      id: "test-install-latch",
      text: "smoke",
    });
    if (!r.ok) {
      expect(r.error).not.toMatch(/embedder not configured/);
    }
  });

  it("second call returns false (idempotent)", () => {
    const stub = async (): Promise<number[]> => new Array(EXPECTED_EMBED_DIM).fill(0.0);
    expect(ensureQdrantEmbedder({ embedder: stub })).toBe(true);
    expect(ensureQdrantEmbedder({ embedder: stub })).toBe(false);
  });

  it("resetEmbedderInstall clears latch and unsets the engine embedder", async () => {
    const stub = async (): Promise<number[]> => new Array(EXPECTED_EMBED_DIM).fill(0.0);
    ensureQdrantEmbedder({ embedder: stub });
    resetEmbedderInstall();
    // Use a kind that's in MEMORY_KINDS so the failure must come from the
    // embedder check, not an upstream "unknown kind" rejection.
    const r = await qdrantMemoryEngine.recall({ kind: "tip", query: "anything" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/embedder not configured/);
  });
});

describe("Live Ollama embed — real network call", () => {
  it("produces a 768-dim finite vector for valid text", async () => {
    const reachable = await ollamaReachable();
    if (!reachable) {
      console.warn(`[skip] Ollama unreachable at ${OLLAMA_HOST} or model ${DEFAULT_EMBED_MODEL} not pulled`);
      return;
    }
    const fn = createOllamaEmbedder({ host: OLLAMA_HOST });
    const vec = await fn("hello world");
    expect(vec).toHaveLength(EXPECTED_EMBED_DIM);
    for (const v of vec) expect(Number.isFinite(v)).toBe(true);
  }, 30_000);

  it("yields different vectors for unrelated inputs (cosine sim < 0.99)", async () => {
    const reachable = await ollamaReachable();
    if (!reachable) return;
    const fn = createOllamaEmbedder({ host: OLLAMA_HOST });
    const a = await fn("steel hardness 45 HRC");
    const b = await fn("the cat sat on the mat");
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const cosSim = dot / (Math.sqrt(na) * Math.sqrt(nb));
    expect(cosSim).toBeLessThan(0.99);
  }, 30_000);
});

describe("SessionStart hook smoke test", () => {
  it("exits 0 with empty stdin (must never block session)", () => {
    const result = spawnSync(process.execPath, [HOOK_PATH], {
      input: "",
      encoding: "utf8",
      timeout: 5_000,
    });
    expect(result.status).toBe(0);
  });

  it("exits 0 with valid SessionStart stdin payload (Ollama up)", async () => {
    const reachable = await ollamaReachable();
    if (!reachable) {
      console.warn("[skip] Ollama unreachable — hook exit code is environment-dependent");
      return;
    }
    const stdin = JSON.stringify({
      hook_event_name: "SessionStart",
      session_id: "test-p0u01",
      cwd: "H:/prism-iooms0",
    });
    const result = spawnSync(process.execPath, [HOOK_PATH], {
      input: stdin,
      encoding: "utf8",
      timeout: 10_000,
    });
    expect(result.status).toBe(0);
  });

  it("exits 0 with malformed stdin (does not break sessions)", () => {
    const result = spawnSync(process.execPath, [HOOK_PATH], {
      input: "{not json",
      encoding: "utf8",
      timeout: 5_000,
    });
    expect(result.status).toBe(0);
  });
});
