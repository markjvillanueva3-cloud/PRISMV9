/**
 * DeepSeekInferenceEngine Tests
 * ==============================
 * Tests for DeepSeek V4 API client (LOCAL-LLM-MS0 Phase 1)
 */

import { describe, it, expect } from "vitest";
import {
  deepSeekInferenceEngine,
  DeepSeekGenerateInputSchema,
  DeepSeekHealthInputSchema,
  DeepSeekModelSchema,
} from "../engines/DeepSeekInferenceEngine.js";

describe("DeepSeekInferenceEngine", () => {
  describe("schema validation", () => {
    it("validates generate input with required prompt", () => {
      const result = DeepSeekGenerateInputSchema.safeParse({
        prompt: "Hello world",
      });
      expect(result.success).toBe(true);
    });

    it("rejects generate input without prompt", () => {
      const result = DeepSeekGenerateInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("validates model enum values", () => {
      expect(DeepSeekModelSchema.safeParse("flash").success).toBe(true);
      expect(DeepSeekModelSchema.safeParse("pro").success).toBe(true);
      expect(DeepSeekModelSchema.safeParse("invalid").success).toBe(false);
    });

    it("applies default values for generate input", () => {
      const result = DeepSeekGenerateInputSchema.parse({
        prompt: "Test prompt",
      });
      expect(result.model).toBe("flash");
      expect(result.temperature).toBe(0.3);
      expect(result.maxTokens).toBe(4096);
      expect(result.thinkingMode).toBe(false);
    });

    it("validates health input schema with optional fields", () => {
      const result = DeepSeekHealthInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("validates temperature bounds", () => {
      expect(
        DeepSeekGenerateInputSchema.safeParse({
          prompt: "test",
          temperature: 0,
        }).success
      ).toBe(true);
      expect(
        DeepSeekGenerateInputSchema.safeParse({
          prompt: "test",
          temperature: 2,
        }).success
      ).toBe(true);
      expect(
        DeepSeekGenerateInputSchema.safeParse({
          prompt: "test",
          temperature: 3,
        }).success
      ).toBe(false);
    });

    it("validates maxTokens bounds", () => {
      expect(
        DeepSeekGenerateInputSchema.safeParse({
          prompt: "test",
          maxTokens: 1,
        }).success
      ).toBe(true);
      expect(
        DeepSeekGenerateInputSchema.safeParse({
          prompt: "test",
          maxTokens: 32768,
        }).success
      ).toBe(true);
      expect(
        DeepSeekGenerateInputSchema.safeParse({
          prompt: "test",
          maxTokens: 50000,
        }).success
      ).toBe(false);
    });
  });

  describe("engine methods", () => {
    it("isConfigured returns false without API key", () => {
      const originalKey = process.env.DEEPSEEK_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;
      deepSeekInferenceEngine.reloadConfig();

      expect(deepSeekInferenceEngine.isConfigured()).toBe(false);

      if (originalKey) {
        process.env.DEEPSEEK_API_KEY = originalKey;
        deepSeekInferenceEngine.reloadConfig();
      }
    });

    it("estimateTokens returns reasonable approximation", () => {
      const shortText = "Hello";
      const longText = "A".repeat(400);

      expect(deepSeekInferenceEngine.estimateTokens(shortText)).toBeGreaterThan(0);
      expect(deepSeekInferenceEngine.estimateTokens(longText)).toBe(100);
    });

    it("getConfig returns config without exposing API key", () => {
      const config = deepSeekInferenceEngine.getConfig();

      expect(config).toHaveProperty("baseUrl");
      expect(config).toHaveProperty("models");
      expect(config).toHaveProperty("defaults");
      expect(config).toHaveProperty("apiKeyConfigured");
      expect(config).not.toHaveProperty("apiKey");
    });

    it("generate returns error when API key not configured", async () => {
      const originalKey = process.env.DEEPSEEK_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;
      deepSeekInferenceEngine.reloadConfig();

      const result = await deepSeekInferenceEngine.generate({
        prompt: "Test prompt",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("API key not configured");

      if (originalKey) {
        process.env.DEEPSEEK_API_KEY = originalKey;
        deepSeekInferenceEngine.reloadConfig();
      }
    });

    it("health returns error when API key not configured", async () => {
      const originalKey = process.env.DEEPSEEK_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;
      deepSeekInferenceEngine.reloadConfig();

      const result = await deepSeekInferenceEngine.health();

      expect(result.healthy).toBe(false);
      expect(result.apiKeyConfigured).toBe(false);
      expect(result.error).toBe("API key not configured");

      if (originalKey) {
        process.env.DEEPSEEK_API_KEY = originalKey;
        deepSeekInferenceEngine.reloadConfig();
      }
    });

    it("reloadConfig can toggle configuration state", () => {
      const originalKey = process.env.DEEPSEEK_API_KEY;

      delete process.env.DEEPSEEK_API_KEY;
      deepSeekInferenceEngine.reloadConfig();
      expect(deepSeekInferenceEngine.isConfigured()).toBe(false);

      if (originalKey) {
        process.env.DEEPSEEK_API_KEY = originalKey;
        deepSeekInferenceEngine.reloadConfig();
      }
    });
  });

  describe("context messages validation", () => {
    it("accepts valid context messages array", () => {
      const result = DeepSeekGenerateInputSchema.safeParse({
        prompt: "Continue the conversation",
        contextMessages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid role in context messages", () => {
      const result = DeepSeekGenerateInputSchema.safeParse({
        prompt: "test",
        contextMessages: [
          { role: "invalid", content: "Hello" },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("accepts system role in context messages", () => {
      const result = DeepSeekGenerateInputSchema.safeParse({
        prompt: "test",
        contextMessages: [
          { role: "system", content: "You are helpful" },
        ],
      });
      expect(result.success).toBe(true);
    });
  });
});
