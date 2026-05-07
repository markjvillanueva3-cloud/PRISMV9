/**
 * LatheLoRAInferenceGatewayEngine Tests
 * LATHE-LORA-MS0 U-LLR22: Inference gateway with load balancing
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAInferenceGatewayEngine, type InferenceRequest } from "../engines/LatheLoRAInferenceGatewayEngine.js";

describe("LatheLoRAInferenceGatewayEngine", () => {
  beforeEach(() => {
    latheLoRAInferenceGatewayEngine.reset();
  });

  describe("setConfig / getConfig", () => {
    it("has sensible defaults", () => {
      const config = latheLoRAInferenceGatewayEngine.getConfig();

      expect(config.strategy).toBe("least_connections");
      expect(config.cache_enabled).toBe(true);
      expect(config.cache_ttl_seconds).toBe(300);
      expect(config.max_retries).toBe(2);
      expect(config.timeout_ms).toBe(30000);
    });

    it("allows config updates", () => {
      latheLoRAInferenceGatewayEngine.setConfig({
        strategy: "round_robin",
        rate_limit_rpm: 120,
      });

      const config = latheLoRAInferenceGatewayEngine.getConfig();
      expect(config.strategy).toBe("round_robin");
      expect(config.rate_limit_rpm).toBe(120);
    });
  });

  describe("registerEndpoint / getEndpoint", () => {
    it("registers endpoint with defaults", () => {
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "gpu-1",
        name: "LatheLoRA-7B",
        url: "http://gpu-1:11434",
        weight: 1,
        active: true,
        max_connections: 10,
        capabilities: ["physics", "safety"],
      });

      const endpoint = latheLoRAInferenceGatewayEngine.getEndpoint("gpu-1");

      expect(endpoint).toBeDefined();
      expect(endpoint?.current_connections).toBe(0);
      expect(endpoint?.avg_latency_ms).toBe(0);
      expect(endpoint?.error_rate).toBe(0);
    });

    it("returns undefined for unknown endpoint", () => {
      expect(latheLoRAInferenceGatewayEngine.getEndpoint("unknown")).toBeUndefined();
    });
  });

  describe("removeEndpoint", () => {
    it("removes registered endpoint", () => {
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "gpu-1",
        name: "Test",
        url: "http://test",
        weight: 1,
        active: true,
        max_connections: 10,
        capabilities: [],
      });

      expect(latheLoRAInferenceGatewayEngine.removeEndpoint("gpu-1")).toBe(true);
      expect(latheLoRAInferenceGatewayEngine.getEndpoint("gpu-1")).toBeUndefined();
    });
  });

  describe("listEndpoints", () => {
    it("lists only active endpoints", () => {
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "active",
        name: "Active",
        url: "http://active",
        weight: 1,
        active: true,
        max_connections: 10,
        capabilities: [],
      });
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "inactive",
        name: "Inactive",
        url: "http://inactive",
        weight: 1,
        active: false,
        max_connections: 10,
        capabilities: [],
      });

      const endpoints = latheLoRAInferenceGatewayEngine.listEndpoints();

      expect(endpoints.length).toBe(1);
      expect(endpoints[0].id).toBe("active");
    });
  });

  describe("setEndpointActive", () => {
    it("toggles endpoint active state", () => {
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "gpu-1",
        name: "Test",
        url: "http://test",
        weight: 1,
        active: true,
        max_connections: 10,
        capabilities: [],
      });

      latheLoRAInferenceGatewayEngine.setEndpointActive("gpu-1", false);

      expect(latheLoRAInferenceGatewayEngine.listEndpoints().length).toBe(0);
    });
  });

  describe("route", () => {
    beforeEach(() => {
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "gpu-1",
        name: "GPU 1",
        url: "http://gpu-1",
        weight: 2,
        active: true,
        max_connections: 10,
        capabilities: ["physics"],
      });
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "gpu-2",
        name: "GPU 2",
        url: "http://gpu-2",
        weight: 1,
        active: true,
        max_connections: 10,
        capabilities: ["safety"],
      });
    });

    it("returns null when no endpoints available", () => {
      latheLoRAInferenceGatewayEngine.reset();

      const result = latheLoRAInferenceGatewayEngine.route({
        id: "req-1",
        prompt: "test",
      });

      expect(result).toBeNull();
    });

    it("routes to endpoint with required capabilities", () => {
      const result = latheLoRAInferenceGatewayEngine.route({
        id: "req-1",
        prompt: "test",
        require_physics: true,
      });

      expect(result).not.toBeNull();
      expect(result?.endpoint.capabilities).toContain("physics");
    });

    it("includes fallback endpoints", () => {
      const result = latheLoRAInferenceGatewayEngine.route({
        id: "req-1",
        prompt: "test",
      });

      expect(result?.fallbacks.length).toBeGreaterThan(0);
    });

    it("uses round-robin strategy", () => {
      latheLoRAInferenceGatewayEngine.setConfig({ strategy: "round_robin" });

      const result1 = latheLoRAInferenceGatewayEngine.route({ id: "1", prompt: "a" });
      const result2 = latheLoRAInferenceGatewayEngine.route({ id: "2", prompt: "b" });

      expect(result1?.endpoint.id).not.toBe(result2?.endpoint.id);
    });

    it("uses least-connections strategy", () => {
      latheLoRAInferenceGatewayEngine.setConfig({ strategy: "least_connections" });
      latheLoRAInferenceGatewayEngine.acquireConnection("gpu-1");
      latheLoRAInferenceGatewayEngine.acquireConnection("gpu-1");

      const result = latheLoRAInferenceGatewayEngine.route({ id: "1", prompt: "test" });

      expect(result?.endpoint.id).toBe("gpu-2");
    });
  });

  describe("validateRequest", () => {
    it("validates required fields", () => {
      const result = latheLoRAInferenceGatewayEngine.validateRequest({});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Prompt is required");
    });

    it("validates prompt length", () => {
      const result = latheLoRAInferenceGatewayEngine.validateRequest({
        prompt: "a".repeat(33000),
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("32000"))).toBe(true);
    });

    it("validates temperature range", () => {
      const result = latheLoRAInferenceGatewayEngine.validateRequest({
        prompt: "test",
        temperature: 3.0,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("Temperature"))).toBe(true);
    });

    it("validates max_tokens range", () => {
      const result = latheLoRAInferenceGatewayEngine.validateRequest({
        prompt: "test",
        max_tokens: 10000,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("max_tokens"))).toBe(true);
    });

    it("returns sanitized request on success", () => {
      const result = latheLoRAInferenceGatewayEngine.validateRequest({
        prompt: "  Calculate speed and feed  ",
      });

      expect(result.valid).toBe(true);
      expect(result.sanitized?.prompt).toBe("Calculate speed and feed");
      expect(result.sanitized?.temperature).toBe(0.7);
      expect(result.sanitized?.max_tokens).toBe(2048);
    });
  });

  describe("checkCache / cacheResponse", () => {
    it("returns null on cache miss", () => {
      const result = latheLoRAInferenceGatewayEngine.checkCache({
        id: "req-1",
        prompt: "test",
      });

      expect(result).toBeNull();
    });

    it("caches and retrieves response", () => {
      const request: InferenceRequest = {
        id: "req-1",
        prompt: "Calculate SFM for 4140",
      };

      latheLoRAInferenceGatewayEngine.cacheResponse(request, {
        id: "resp-1",
        request_id: "req-1",
        model_id: "lathe-lora",
        content: "350-400 SFM",
        tokens_used: 50,
        latency_ms: 200,
        cached: false,
        metadata: { finish_reason: "stop" },
      });

      const cached = latheLoRAInferenceGatewayEngine.checkCache(request);

      expect(cached).not.toBeNull();
      expect(cached?.cached).toBe(true);
      expect(cached?.content).toBe("350-400 SFM");
    });

    it("respects cache_enabled config", () => {
      latheLoRAInferenceGatewayEngine.setConfig({ cache_enabled: false });

      latheLoRAInferenceGatewayEngine.cacheResponse(
        { id: "1", prompt: "test" },
        {
          id: "r1",
          request_id: "1",
          model_id: "m",
          content: "response",
          tokens_used: 10,
          latency_ms: 100,
          cached: false,
          metadata: { finish_reason: "stop" },
        }
      );

      expect(latheLoRAInferenceGatewayEngine.checkCache({ id: "1", prompt: "test" })).toBeNull();
    });
  });

  describe("checkRateLimit", () => {
    it("allows requests within limit", () => {
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "gpu-1",
        name: "Test",
        url: "http://test",
        weight: 1,
        active: true,
        max_connections: 10,
        capabilities: [],
      });

      const result = latheLoRAInferenceGatewayEngine.checkRateLimit("gpu-1");

      expect(result.allowed).toBe(true);
      expect(result.wait_ms).toBe(0);
    });

    it("blocks requests over limit", () => {
      latheLoRAInferenceGatewayEngine.setConfig({ rate_limit_rpm: 2 });

      latheLoRAInferenceGatewayEngine.checkRateLimit("gpu-1");
      latheLoRAInferenceGatewayEngine.checkRateLimit("gpu-1");
      const result = latheLoRAInferenceGatewayEngine.checkRateLimit("gpu-1");

      expect(result.allowed).toBe(false);
      expect(result.wait_ms).toBeGreaterThan(0);
    });
  });

  describe("recordCompletion", () => {
    it("updates endpoint metrics", () => {
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "gpu-1",
        name: "Test",
        url: "http://test",
        weight: 1,
        active: true,
        max_connections: 10,
        capabilities: [],
      });
      latheLoRAInferenceGatewayEngine.acquireConnection("gpu-1");

      latheLoRAInferenceGatewayEngine.recordCompletion("gpu-1", 250, true);

      const endpoint = latheLoRAInferenceGatewayEngine.getEndpoint("gpu-1");
      expect(endpoint?.avg_latency_ms).toBeGreaterThan(0);
      expect(endpoint?.current_connections).toBe(0);
    });

    it("updates error rate on failure", () => {
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "gpu-1",
        name: "Test",
        url: "http://test",
        weight: 1,
        active: true,
        max_connections: 10,
        capabilities: [],
      });

      latheLoRAInferenceGatewayEngine.recordCompletion("gpu-1", 500, false);

      const endpoint = latheLoRAInferenceGatewayEngine.getEndpoint("gpu-1");
      expect(endpoint?.error_rate).toBeGreaterThan(0);
    });
  });

  describe("acquireConnection", () => {
    it("increments connection count", () => {
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "gpu-1",
        name: "Test",
        url: "http://test",
        weight: 1,
        active: true,
        max_connections: 2,
        capabilities: [],
      });

      expect(latheLoRAInferenceGatewayEngine.acquireConnection("gpu-1")).toBe(true);
      expect(latheLoRAInferenceGatewayEngine.getEndpoint("gpu-1")?.current_connections).toBe(1);
    });

    it("rejects when at max connections", () => {
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "gpu-1",
        name: "Test",
        url: "http://test",
        weight: 1,
        active: true,
        max_connections: 1,
        capabilities: [],
      });

      latheLoRAInferenceGatewayEngine.acquireConnection("gpu-1");
      expect(latheLoRAInferenceGatewayEngine.acquireConnection("gpu-1")).toBe(false);
    });
  });

  describe("generateClientCode", () => {
    beforeEach(() => {
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "gpu-1",
        name: "LatheLoRA-7B",
        url: "http://localhost:11434",
        weight: 1,
        active: true,
        max_connections: 10,
        capabilities: [],
      });
    });

    it("generates Python client code", () => {
      const code = latheLoRAInferenceGatewayEngine.generateClientCode("python");

      expect(code).toContain("import requests");
      expect(code).toContain("def lathe_lora_inference");
      expect(code).toContain("LatheLoRA-7B");
    });

    it("generates TypeScript client code", () => {
      const code = latheLoRAInferenceGatewayEngine.generateClientCode("typescript");

      expect(code).toContain("async function");
      expect(code).toContain("fetch");
      expect(code).toContain("Promise<string>");
    });

    it("generates curl commands", () => {
      const code = latheLoRAInferenceGatewayEngine.generateClientCode("curl");

      expect(code).toContain("curl -X POST");
      expect(code).toContain("/api/generate");
    });
  });

  describe("getStats", () => {
    it("returns gateway statistics", () => {
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "gpu-1",
        name: "Test",
        url: "http://test",
        weight: 1,
        active: true,
        max_connections: 10,
        capabilities: [],
      });

      const stats = latheLoRAInferenceGatewayEngine.getStats();

      expect(stats.total_endpoints).toBe(1);
      expect(stats.active_endpoints).toBe(1);
      expect(stats.total_connections).toBe(0);
      expect(stats.cache_size).toBe(0);
    });
  });

  describe("clearCache", () => {
    it("clears cache and returns count", () => {
      latheLoRAInferenceGatewayEngine.cacheResponse(
        { id: "1", prompt: "test" },
        {
          id: "r1",
          request_id: "1",
          model_id: "m",
          content: "response",
          tokens_used: 10,
          latency_ms: 100,
          cached: false,
          metadata: { finish_reason: "stop" },
        }
      );

      const cleared = latheLoRAInferenceGatewayEngine.clearCache();

      expect(cleared).toBe(1);
      expect(latheLoRAInferenceGatewayEngine.getStats().cache_size).toBe(0);
    });
  });

  describe("reset", () => {
    it("resets all state", () => {
      latheLoRAInferenceGatewayEngine.setConfig({ strategy: "round_robin" });
      latheLoRAInferenceGatewayEngine.registerEndpoint({
        id: "gpu-1",
        name: "Test",
        url: "http://test",
        weight: 1,
        active: true,
        max_connections: 10,
        capabilities: [],
      });

      latheLoRAInferenceGatewayEngine.reset();

      expect(latheLoRAInferenceGatewayEngine.getConfig().strategy).toBe("least_connections");
      expect(latheLoRAInferenceGatewayEngine.listEndpoints().length).toBe(0);
    });
  });
});
