/**
 * Tests for OllamaClientEngine (PP-INFRA-OLLAMA)
 *
 * Covers input validation, not-connected behaviour, and host parsing.
 * Real network calls are left to an integration suite.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  OllamaClientEngine,
  ollamaClientEngine,
} from "../engines/OllamaClientEngine.js";

describe("OllamaClientEngine (offline / validation)", () => {
  let engine: OllamaClientEngine;

  beforeEach(() => {
    engine = new OllamaClientEngine();
  });

  describe("connect()", () => {
    it("rejects empty host", async () => {
      await expect(() => engine.connect("")).rejects.toThrow(/host/);
    });

    it("rejects non-http(s) host", async () => {
      await expect(() => engine.connect("ws://localhost:11434")).rejects.toThrow(/http/);
    });

    it("accepts default host and records it", async () => {
      const r = await engine.connect();
      expect(r.ok).toBe(true);
      expect(engine.isConnected()).toBe(true);
      expect(engine.getHost()).toBe("http://localhost:11434");
    });

    it("accepts a custom host", async () => {
      const r = await engine.connect("http://my-ollama:11434");
      expect(r.ok).toBe(true);
      expect(engine.getHost()).toBe("http://my-ollama:11434");
    });
  });

  describe("operations without connection", () => {
    it("listModels returns not-connected error", async () => {
      const r = await engine.listModels();
      expect(r.ok).toBe(false);
      expect(r.error).toContain("not connected");
    });

    it("generate returns not-connected error", async () => {
      const r = await engine.generate({ model: "llama3", prompt: "hi" });
      expect(r.ok).toBe(false);
    });

    it("chat returns not-connected error", async () => {
      const r = await engine.chat({
        model: "llama3",
        messages: [{ role: "user", content: "hi" }],
      });
      expect(r.ok).toBe(false);
    });

    it("embed returns not-connected error", async () => {
      const r = await engine.embed({ model: "m", input: "x" });
      expect(r.ok).toBe(false);
    });

    it("all offline results report a non-negative wallMs", async () => {
      const r = await engine.embed({ model: "m", input: "x" });
      expect(r.wallMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("input validation", () => {
    beforeEach(async () => {
      await engine.connect();
    });

    it("generate rejects empty model or prompt", async () => {
      await expect(() => engine.generate({ model: "", prompt: "x" })).rejects.toThrow(/model/);
      await expect(() => engine.generate({ model: "m", prompt: "" })).rejects.toThrow(/prompt/);
    });

    it("chat rejects empty model or messages", async () => {
      await expect(() =>
        engine.chat({ model: "", messages: [{ role: "user", content: "x" }] })
      ).rejects.toThrow(/model/);
      await expect(() => engine.chat({ model: "m", messages: [] })).rejects.toThrow(/messages/);
    });

    it("chat rejects invalid role or empty content", async () => {
      await expect(() =>
        engine.chat({
          model: "m",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messages: [{ role: "bogus" as any, content: "hi" }],
        })
      ).rejects.toThrow(/role/);
      await expect(() =>
        engine.chat({ model: "m", messages: [{ role: "user", content: "" }] })
      ).rejects.toThrow(/content/);
    });

    it("embed rejects empty model or input", async () => {
      await expect(() => engine.embed({ model: "", input: "x" })).rejects.toThrow(/model/);
      await expect(() => engine.embed({ model: "m", input: "" })).rejects.toThrow(/input/);
    });

    it("rejects temperature outside [0, 2]", async () => {
      await expect(() =>
        engine.generate({ model: "m", prompt: "x", temperature: 2.5 })
      ).rejects.toThrow(/temperature/);
    });

    it("rejects non-positive maxTokens", async () => {
      await expect(() =>
        engine.generate({ model: "m", prompt: "x", maxTokens: 0 })
      ).rejects.toThrow(/maxTokens/);
    });
  });

  describe("lifecycle", () => {
    it("disconnect clears the client", async () => {
      await engine.connect();
      engine.disconnect();
      expect(engine.isConnected()).toBe(false);
    });
  });

  describe("module singleton", () => {
    it("exports an instance", () => {
      expect(ollamaClientEngine).toBeInstanceOf(OllamaClientEngine);
    });
  });
});
