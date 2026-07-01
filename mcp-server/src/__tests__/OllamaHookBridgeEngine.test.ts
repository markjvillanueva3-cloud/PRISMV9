/**
 * OllamaHookBridgeEngine Tests
 *
 * Coverage:
 * - Happy path: query, status, configure
 * - Failure modes: timeout, connection error, invalid response, bad input
 * - Adversarial inputs: empty, oversize, special chars
 * - Configuration variants: different models, timeouts, hook types
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  OllamaHookBridgeEngine,
} from "../engines/OllamaHookBridgeEngine.js";

describe("OllamaHookBridgeEngine", () => {
  let engine: OllamaHookBridgeEngine;

  beforeEach(() => {
    OllamaHookBridgeEngine.resetInstance();
    engine = new OllamaHookBridgeEngine();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("instantiation", () => {
    it("creates instance with default baseUrl 127.0.0.1:11434 (IPv4 -- Windows IPv6-safe; honors OLLAMA_URL)", () => {
      // OLLAMA-FLEET-AUDIT P1-6: the default is now the IPv4 literal (not the
      // IPv6-ambiguous `localhost`, which on Windows resolves to ::1 first and
      // burns the 500ms hook budget on a DNS-then-TCP-fail), unless OLLAMA_URL
      // overrides. Pinning the fallback to the IPv4 literal still catches a
      // regression to `localhost` (this is not a tautology: revert the default
      // and config.baseUrl would be localhost while the RHS stays 127.0.0.1).
      const config = engine.getConfig();
      expect(config.baseUrl).toBe(process.env.OLLAMA_URL || "http://127.0.0.1:11434");
    });

    it("creates instance with default model qwen2.5-coder:32b", () => {
      // Post-2026-06-04 Blackwell retirement: 7b/14b were `ollama rm`'d; the
      // installed floor default is now the 32b coder.
      const config = engine.getConfig();
      expect(config.defaultModel).toBe("qwen2.5-coder:32b");
    });

    it("creates instance with default timeout 500ms for hook speed", () => {
      const config = engine.getConfig();
      expect(config.timeoutMs).toBe(500);
    });

    it("accepts custom baseUrl on construction", () => {
      const customEngine = new OllamaHookBridgeEngine({
        baseUrl: "http://custom:8080",
      });
      expect(customEngine.getConfig().baseUrl).toBe("http://custom:8080");
    });

    it("accepts custom model on construction", () => {
      const customEngine = new OllamaHookBridgeEngine({
        defaultModel: "llama3:8b",
      });
      expect(customEngine.getConfig().defaultModel).toBe("llama3:8b");
    });

    it("provides same singleton instance on repeated getInstance calls", () => {
      const instance1 = OllamaHookBridgeEngine.getInstance();
      const instance2 = OllamaHookBridgeEngine.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("provides new instance after resetInstance", () => {
      const instance1 = OllamaHookBridgeEngine.getInstance();
      OllamaHookBridgeEngine.resetInstance();
      const instance2 = OllamaHookBridgeEngine.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("configure", () => {
    it("updates baseUrl and returns new config", () => {
      const result = engine.configure({ baseUrl: "http://newhost:11434" });
      expect(result.baseUrl).toBe("http://newhost:11434");
      expect(engine.getConfig().baseUrl).toBe("http://newhost:11434");
    });

    it("updates timeoutMs to 2000 and persists", () => {
      const result = engine.configure({ timeoutMs: 2000 });
      expect(result.timeoutMs).toBe(2000);
      expect(engine.getConfig().timeoutMs).toBe(2000);
    });

    it("updates maxTokens to 200 and persists", () => {
      const result = engine.configure({ maxTokens: 200 });
      expect(result.maxTokens).toBe(200);
      expect(engine.getConfig().maxTokens).toBe(200);
    });

    it("throws Error for baseUrl without http prefix", () => {
      expect(() => engine.configure({ baseUrl: "not-a-url" })).toThrow(
        "Invalid baseUrl: must be a valid HTTP URL"
      );
    });

    it("throws Error for timeoutMs below 50", () => {
      expect(() => engine.configure({ timeoutMs: 10 })).toThrow(
        "Invalid timeoutMs: must be between 50 and 30000"
      );
    });

    it("throws Error for timeoutMs above 30000", () => {
      expect(() => engine.configure({ timeoutMs: 50000 })).toThrow(
        "Invalid timeoutMs: must be between 50 and 30000"
      );
    });

    it("throws Error for maxTokens of 0", () => {
      expect(() => engine.configure({ maxTokens: 0 })).toThrow(
        "Invalid maxTokens: must be between 1 and 4096"
      );
    });

    it("throws Error for maxTokens above 4096", () => {
      expect(() => engine.configure({ maxTokens: 10000 })).toThrow(
        "Invalid maxTokens: must be between 1 and 4096"
      );
    });
  });

  describe("getModelForHook", () => {
    it("returns gpt-oss:20b for grep_index hook type (speed tier)", () => {
      // BLACKWELL-MODEL-INTEGRATION-MS0 P2: speed-critical hooks → gpt-oss:20b.
      expect(engine.getModelForHook("grep_index")).toBe("gpt-oss:20b");
    });

    it("returns qwen3-coder:30b for ai_feature hook type (code tier)", () => {
      // U-FLOR-CODER-DEFAULT: code/quality hooks use the newer qwen3-coder:30b MoE.
      expect(engine.getModelForHook("ai_feature")).toBe("qwen3-coder:30b");
    });

    it("returns custom model after override configured", () => {
      engine.configure({ modelOverrides: { mcp_route: "codellama:7b" } });
      expect(engine.getModelForHook("mcp_route")).toBe("codellama:7b");
    });
  });

  describe("query - successful responses", () => {
    it("returns success=true and response text when Ollama responds", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "Use ENGINE_DIGEST.md first" }),
      } as Response);

      const result = await engine.query("Where should I look for engine info?");

      expect(result.success).toBe(true);
      expect(result.response).toBe("Use ENGINE_DIGEST.md first");
      expect(result.fallbackUsed).toBe(false);
    });

    it("uses ai_feature model (qwen3-coder:30b) when hookType=ai_feature", async () => {
      let capturedBody: string = "";
      vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
        capturedBody = options?.body as string;
        return { ok: true, json: async () => ({ response: "test" }) } as Response;
      });

      await engine.query("test", { hookType: "ai_feature" });

      // No live /api/tags cache seeded here → resolveInstalledModel passes the
      // configured ai_feature model (qwen3-coder:30b) through unchanged.
      const parsed = JSON.parse(capturedBody);
      expect(parsed.model).toBe("qwen3-coder:30b");
    });

    it("includes grep_index system prompt when hookType=grep_index", async () => {
      let capturedBody: string = "";
      vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
        capturedBody = options?.body as string;
        return { ok: true, json: async () => ({ response: "test" }) } as Response;
      });

      await engine.query("find controller", { hookType: "grep_index" });

      const parsed = JSON.parse(capturedBody);
      expect(parsed.prompt).toContain("code search assistant");
    });

    it("records latencyMs greater than or equal to 0", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "fast" }),
      } as Response);

      const result = await engine.query("test");

      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.latencyMs).toBeLessThan(5000);
    });

    it("trims whitespace from response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "  padded response  \n" }),
      } as Response);

      const result = await engine.query("test");

      expect(result.response).toBe("padded response");
    });
  });

  describe("query - failure modes", () => {
    it("returns fallbackUsed=true when connection refused", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("Connection refused")
      );

      const result = await engine.query("test");

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.error).toContain("Connection error");
      expect(result.response).toBeNull();
    });

    it("returns error containing 'timed out' when request aborted", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("The operation was aborted")
      );

      const result = await engine.query("test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("timed out");
    });

    it("returns error with status code when HTTP 500 returned", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      } as Response);

      const result = await engine.query("test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("500");
    });

    it("returns error from Ollama API error field", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: "Model not found: fake:model" }),
      } as Response);

      const result = await engine.query("test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Model not found");
    });

    it("returns null response when Ollama returns empty string", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "" }),
      } as Response);

      const result = await engine.query("test");

      expect(result.success).toBe(true);
      expect(result.response).toBeNull();
    });
  });

  describe("query - adversarial inputs", () => {
    it("rejects empty string prompt with Invalid prompt error", async () => {
      const result = await engine.query("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid prompt: must be non-empty string");
      expect(result.fallbackUsed).toBe(true);
    });

    it("rejects null prompt with Invalid prompt error", async () => {
      const result = await engine.query(null as unknown as string);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid prompt: must be non-empty string");
    });

    it("rejects 15000 character prompt with too long error", async () => {
      const oversizedPrompt = "x".repeat(15000);
      const result = await engine.query(oversizedPrompt);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Prompt too long: max 10000 characters");
    });

    it("handles prompt with quotes and newlines successfully", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "handled special chars" }),
      } as Response);

      const result = await engine.query('Test with "quotes" and \n newlines');

      expect(result.success).toBe(true);
      expect(result.response).toBe("handled special chars");
    });

    it("handles prompt with unicode and emoji successfully", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "unicode ok" }),
      } as Response);

      const result = await engine.query("测试 emoji 🚀 symbols €£¥");

      expect(result.success).toBe(true);
      expect(result.response).toBe("unicode ok");
    });
  });

  describe("status", () => {
    it("returns available=true when Ollama has models installed", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: "qwen2.5-coder:7b" }, { name: "llama3:8b" }],
        }),
      } as Response);

      const status = await engine.status();

      expect(status.available).toBe(true);
      expect(status.models).toContain("qwen2.5-coder:7b");
      expect(status.models).toContain("llama3:8b");
      expect(status.models.length).toBe(2);
    });

    it("returns available=false when no models installed", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      } as Response);

      const status = await engine.status();

      expect(status.available).toBe(false);
      expect(status.models.length).toBe(0);
    });

    it("returns available=false with error when connection refused", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("Connection refused")
      );

      const status = await engine.status();

      expect(status.available).toBe(false);
      expect(status.error).toContain("Connection failed");
    });

    it("returns baseUrl matching configured value", async () => {
      engine.configure({ baseUrl: "http://custom:8080" });
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("fail"));

      const status = await engine.status();

      expect(status.baseUrl).toBe("http://custom:8080");
    });

    it("returns lastCheckMs as non-negative number", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      } as Response);

      const status = await engine.status();

      expect(status.lastCheckMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("isAvailable", () => {
    it("returns true when models are available", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: "model1" }] }),
      } as Response);

      const available = await engine.isAvailable();

      expect(available).toBe(true);
    });

    it("returns false when no models available", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      } as Response);

      const available = await engine.isAvailable();

      expect(available).toBe(false);
    });

    it("uses cached result on second call within TTL", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: "model1" }] }),
      } as Response);

      await engine.isAvailable();
      const callCountAfterFirst = fetchSpy.mock.calls.length;

      const secondResult = await engine.isAvailable();

      expect(secondResult).toBe(true);
      expect(fetchSpy.mock.calls.length).toBe(callCountAfterFirst);
    });
  });

  describe("boundary conditions", () => {
    it("accepts timeout of exactly 50ms (minimum)", () => {
      engine.configure({ timeoutMs: 50 });
      expect(engine.getConfig().timeoutMs).toBe(50);
    });

    it("accepts timeout of exactly 30000ms (maximum)", () => {
      engine.configure({ timeoutMs: 30000 });
      expect(engine.getConfig().timeoutMs).toBe(30000);
    });

    it("accepts maxTokens of exactly 1 (minimum)", () => {
      engine.configure({ maxTokens: 1 });
      expect(engine.getConfig().maxTokens).toBe(1);
    });

    it("accepts maxTokens of exactly 4096 (maximum)", () => {
      engine.configure({ maxTokens: 4096 });
      expect(engine.getConfig().maxTokens).toBe(4096);
    });

    it("accepts prompt of exactly 10000 characters (maximum)", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "ok" }),
      } as Response);

      const maxPrompt = "x".repeat(10000);
      const result = await engine.query(maxPrompt);

      expect(result.success).toBe(true);
    });

    it("rejects prompt of 10001 characters", async () => {
      const tooLongPrompt = "x".repeat(10001);
      const result = await engine.query(tooLongPrompt);

      expect(result.success).toBe(false);
      expect(result.error).toContain("too long");
    });
  });
});
