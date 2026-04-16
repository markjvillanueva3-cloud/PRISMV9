/**
 * Tests for QdrantVectorStoreEngine (PP-INFRA-QDRANT)
 *
 * These cover validation + offline (not-connected) behaviour. An integration
 * suite that actually boots Qdrant lives separately under /integration.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  QdrantVectorStoreEngine,
  qdrantVectorStoreEngine,
} from "../engines/QdrantVectorStoreEngine.js";

describe("QdrantVectorStoreEngine (offline / validation)", () => {
  let engine: QdrantVectorStoreEngine;

  beforeEach(() => {
    engine = new QdrantVectorStoreEngine();
  });

  describe("connect()", () => {
    it("rejects missing url", async () => {
      await expect(() => engine.connect({ url: "" })).rejects.toThrow(/url/);
    });

    it("rejects non-http(s) url", async () => {
      await expect(() => engine.connect({ url: "ftp://x" })).rejects.toThrow(/http/);
    });

    it("rejects non-positive timeoutMs", async () => {
      await expect(() =>
        engine.connect({ url: "http://localhost:6333", timeoutMs: 0 })
      ).rejects.toThrow(/timeoutMs/);
    });

    it("accepts a valid url and marks the engine connected", async () => {
      const r = await engine.connect({ url: "http://localhost:6333" });
      expect(r.ok).toBe(true);
      expect(engine.isConnected()).toBe(true);
      expect(engine.getConnectionOptions()?.url).toBe("http://localhost:6333");
    });
  });

  describe("operations without connection", () => {
    it("ping returns not-connected error", async () => {
      const r = await engine.ping();
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("not connected");
    });

    it("listCollections returns not-connected error", async () => {
      const r = await engine.listCollections();
      expect(r.ok).toBe(false);
    });

    it("ensureCollection returns not-connected error", async () => {
      const r = await engine.ensureCollection({ name: "t", vectorSize: 384, distance: "Cosine" });
      expect(r.ok).toBe(false);
    });

    it("upsert returns not-connected error", async () => {
      const r = await engine.upsert("t", [{ id: 1, vector: [0.1, 0.2] }]);
      expect(r.ok).toBe(false);
    });

    it("search returns not-connected error", async () => {
      const r = await engine.search({ collection: "t", vector: [0.1, 0.2] });
      expect(r.ok).toBe(false);
    });

    it("count returns not-connected error", async () => {
      const r = await engine.count("t");
      expect(r.ok).toBe(false);
    });

    it("deleteCollection returns not-connected error", async () => {
      const r = await engine.deleteCollection("t");
      expect(r.ok).toBe(false);
    });
  });

  describe("parameter validation post-connect", () => {
    beforeEach(async () => {
      await engine.connect({ url: "http://localhost:6333" });
    });

    it("ensureCollection rejects empty name", async () => {
      await expect(() =>
        engine.ensureCollection({ name: "", vectorSize: 10, distance: "Cosine" })
      ).rejects.toThrow(/name/);
    });

    it("ensureCollection rejects non-positive vectorSize", async () => {
      await expect(() =>
        engine.ensureCollection({ name: "t", vectorSize: 0, distance: "Cosine" })
      ).rejects.toThrow(/vectorSize/);
    });

    it("ensureCollection rejects invalid distance", async () => {
      await expect(() =>
        engine.ensureCollection({
          name: "t",
          vectorSize: 10,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          distance: "Cosineish" as any,
        })
      ).rejects.toThrow(/distance/);
    });

    it("deleteCollection requires a non-empty name", async () => {
      const r = await engine.deleteCollection("");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/name/);
    });

    it("upsert rejects empty collection or empty points", async () => {
      const r1 = await engine.upsert("", [{ id: 1, vector: [0.1] }]);
      expect(r1.ok).toBe(false);
      const r2 = await engine.upsert("t", []);
      expect(r2.ok).toBe(false);
    });

    it("upsert rejects points with bad vectors or ids", async () => {
      await expect(() =>
        engine.upsert("t", [{ id: "", vector: [0.1] }])
      ).rejects.toThrow(/point\.id/);
      await expect(() =>
        engine.upsert("t", [{ id: 1, vector: [] }])
      ).rejects.toThrow(/vector/);
      await expect(() =>
        engine.upsert("t", [{ id: 1, vector: [NaN] }])
      ).rejects.toThrow(/finite/);
    });

    it("search rejects missing vector / empty collection / bad limit", async () => {
      await expect(() =>
        engine.search({ collection: "", vector: [0.1] })
      ).rejects.toThrow(/collection/);
      await expect(() =>
        engine.search({ collection: "t", vector: [] })
      ).rejects.toThrow(/vector/);
      await expect(() =>
        engine.search({ collection: "t", vector: [0.1], limit: 0 })
      ).rejects.toThrow(/limit/);
    });
  });

  describe("lifecycle", () => {
    it("disconnect clears state", async () => {
      await engine.connect({ url: "http://localhost:6333" });
      engine.disconnect();
      expect(engine.isConnected()).toBe(false);
      expect(engine.getConnectionOptions()).toBeNull();
    });
  });

  describe("module singleton", () => {
    it("exports an instance", () => {
      expect(qdrantVectorStoreEngine).toBeInstanceOf(QdrantVectorStoreEngine);
    });
  });
});
