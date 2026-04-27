/**
 * QdrantEmbedderInjection.test.ts
 *
 * Verifies INTEL-OLLAMA-OBSIDIAN-MS0/P0-U01 deliverables:
 *  1. createOllamaEmbedder builds a working Embedder
 *  2. Real Ollama call returns 768-dim vectors (skipped if Ollama down)
 *  3. setEmbedder + getInstance idempotency
 *  4. Adversarial inputs (NaN, Infinity, empty, oversize) are rejected
 *  5. SessionStart hook smoke test (real stdin payload)
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P0-U01
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  QdrantMemoryEngineSingleton,
  DEFAULT_EMBED_MODEL,
  EXPECTED_EMBED_DIM,
  MAX_EMBED_INPUT_CHARS,
} from "../engines/QdrantMemoryEngineSingleton.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HOOK_PATH = resolve(__dirname, "../../../.claude/hooks/embedder-inject-qdrant.mjs");
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

/** Tiny health probe used to skip Ollama-dependent tests cleanly. */
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

describe("QdrantMemoryEngineSingleton — embedder injection (P0-U01)", () => {
  beforeEach(() => {
    QdrantMemoryEngineSingleton.reset();
  });
  afterEach(() => {
    QdrantMemoryEngineSingleton.reset();
  });

  describe("createOllamaEmbedder — input validation", () => {
    it("rejects bad host", () => {
      expect(() =>
        QdrantMemoryEngineSingleton.createOllamaEmbedder({ host: "not-a-url" }),
      ).toThrow(/invalid Ollama host/);
    });

    it("rejects empty model name", () => {
      expect(() =>
        QdrantMemoryEngineSingleton.createOllamaEmbedder({ model: "" }),
      ).toThrow(/invalid Ollama model/);
    });

    it("rejects negative timeout", () => {
      expect(() =>
        QdrantMemoryEngineSingleton.createOllamaEmbedder({ timeoutMs: -1 }),
      ).toThrow(/invalid timeoutMs/);
    });

    it("rejects NaN timeout", () => {
      expect(() =>
        QdrantMemoryEngineSingleton.createOllamaEmbedder({ timeoutMs: Number.NaN }),
      ).toThrow(/invalid timeoutMs/);
    });

    it("returns a function with valid options", () => {
      const fn = QdrantMemoryEngineSingleton.createOllamaEmbedder();
      expect(typeof fn).toBe("function");
    });
  });

  describe("createOllamaEmbedder — runtime validation", () => {
    it("rejects empty string input", async () => {
      const fn = QdrantMemoryEngineSingleton.createOllamaEmbedder();
      await expect(fn("")).rejects.toThrow(/non-empty/);
    });

    it("rejects non-string input", async () => {
      const fn = QdrantMemoryEngineSingleton.createOllamaEmbedder();
      // @ts-expect-error testing runtime guard
      await expect(fn(42)).rejects.toThrow(/must be string/);
    });

    it("rejects oversize input", async () => {
      const fn = QdrantMemoryEngineSingleton.createOllamaEmbedder();
      const huge = "x".repeat(MAX_EMBED_INPUT_CHARS + 1);
      await expect(fn(huge)).rejects.toThrow(/too long/);
    });

    it("surfaces network errors with descriptive message", async () => {
      // Port 1 reliably refuses connections; we expect a network error.
      const fn = QdrantMemoryEngineSingleton.createOllamaEmbedder({
        host: "http://127.0.0.1:1",
        timeoutMs: 500,
      });
      await expect(fn("hello")).rejects.toThrow(/Ollama embed network error|HTTP/);
    });
  });

  describe("getInstance — singleton semantics", () => {
    it("returns the same instance across calls", () => {
      const a = QdrantMemoryEngineSingleton.getInstance();
      const b = QdrantMemoryEngineSingleton.getInstance();
      expect(a).toBe(b);
    });

    it("auto-injects an embedder on first access", () => {
      QdrantMemoryEngineSingleton.getInstance();
      expect(QdrantMemoryEngineSingleton.hasEmbedder()).toBe(true);
    });

    it("setEmbedder(null) marks embedder as not injected", () => {
      QdrantMemoryEngineSingleton.getInstance();
      QdrantMemoryEngineSingleton.setEmbedder(null);
      expect(QdrantMemoryEngineSingleton.hasEmbedder()).toBe(false);
    });

    it("setEmbedder allows test override before getInstance", () => {
      const stub: (text: string) => Promise<number[]> = async () =>
        new Array(EXPECTED_EMBED_DIM).fill(0.1);
      QdrantMemoryEngineSingleton.setEmbedder(stub);
      expect(QdrantMemoryEngineSingleton.hasEmbedder()).toBe(true);
    });

    it("reset() clears state — next getInstance re-injects", () => {
      QdrantMemoryEngineSingleton.getInstance();
      QdrantMemoryEngineSingleton.reset();
      expect(QdrantMemoryEngineSingleton.hasEmbedder()).toBe(false);
      QdrantMemoryEngineSingleton.getInstance();
      expect(QdrantMemoryEngineSingleton.hasEmbedder()).toBe(true);
    });
  });

  describe("Live Ollama embed — real call", () => {
    it("produces a 768-dim finite vector for valid text", async () => {
      const reachable = await ollamaReachable();
      if (!reachable) {
        console.warn(`[skip] Ollama unreachable at ${OLLAMA_HOST} or model ${DEFAULT_EMBED_MODEL} not pulled`);
        return;
      }
      const fn = QdrantMemoryEngineSingleton.createOllamaEmbedder({ host: OLLAMA_HOST });
      const vec = await fn("hello world");
      expect(vec).toHaveLength(EXPECTED_EMBED_DIM);
      for (const v of vec) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }, 30_000);

    it("yields different vectors for unrelated inputs (sanity)", async () => {
      const reachable = await ollamaReachable();
      if (!reachable) return;
      const fn = QdrantMemoryEngineSingleton.createOllamaEmbedder({ host: OLLAMA_HOST });
      const a = await fn("steel hardness 45 HRC");
      const b = await fn("the cat sat on the mat");
      expect(a).toHaveLength(EXPECTED_EMBED_DIM);
      expect(b).toHaveLength(EXPECTED_EMBED_DIM);
      // Cosine similarity should be < 1 (not identical).
      let dot = 0, na = 0, nb = 0;
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
    it("exits 0 with valid stdin payload (Ollama up)", async () => {
      const reachable = await ollamaReachable();
      if (!reachable) {
        console.warn("[skip] Ollama unreachable — hook exit code is environment-dependent");
        return;
      }
      const stdin = JSON.stringify({
        hook_event_name: "SessionStart",
        session_id: "test-session-p0u01",
        cwd: "H:/prism",
      });
      const result = spawnSync(process.execPath, [HOOK_PATH], {
        input: stdin,
        encoding: "utf8",
        timeout: 10_000,
      });
      expect(result.status).toBe(0);
    });

    it("exits 0 with empty stdin (does not break sessions)", () => {
      const result = spawnSync(process.execPath, [HOOK_PATH], {
        input: "",
        encoding: "utf8",
        timeout: 5_000,
      });
      // Hook must never abort a session; non-zero would block startup.
      expect(result.status).toBe(0);
    });
  });
});
