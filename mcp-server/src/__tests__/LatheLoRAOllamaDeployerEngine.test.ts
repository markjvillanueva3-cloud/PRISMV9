/**
 * LatheLoRAOllamaDeployerEngine Tests
 * LATHE-LORA-MS0 U-LLR21: Ollama deployment
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAOllamaDeployerEngine, type OllamaModelConfig } from "../engines/LatheLoRAOllamaDeployerEngine.js";

describe("LatheLoRAOllamaDeployerEngine", () => {
  beforeEach(() => {
    latheLoRAOllamaDeployerEngine.reset();
  });

  describe("setEndpoint / getEndpoint", () => {
    it("defaults to localhost:11434", () => {
      expect(latheLoRAOllamaDeployerEngine.getEndpoint()).toBe("http://localhost:11434");
    });

    it("allows custom endpoint", () => {
      latheLoRAOllamaDeployerEngine.setEndpoint("http://gpu-server:11434");
      expect(latheLoRAOllamaDeployerEngine.getEndpoint()).toBe("http://gpu-server:11434");
    });
  });

  describe("generateModelfile", () => {
    it("generates modelfile with GGUF path", () => {
      const config: OllamaModelConfig = {
        name: "lathe-lora-7b",
        gguf_path: "/models/lathe-lora-7b-Q4_K_M.gguf",
      };

      const modelfile = latheLoRAOllamaDeployerEngine.generateModelfile(config);

      expect(modelfile).toContain("FROM /models/lathe-lora-7b-Q4_K_M.gguf");
      expect(modelfile).toContain("TEMPLATE");
      expect(modelfile).toContain("SYSTEM");
      expect(modelfile).toContain("PARAMETER temperature");
    });

    it("includes custom system prompt", () => {
      const config: OllamaModelConfig = {
        name: "test-model",
        gguf_path: "/models/test.gguf",
        system_prompt: "You are a custom lathe assistant.",
      };

      const modelfile = latheLoRAOllamaDeployerEngine.generateModelfile(config);

      expect(modelfile).toContain("You are a custom lathe assistant.");
    });

    it("includes custom parameters", () => {
      const config: OllamaModelConfig = {
        name: "test-model",
        gguf_path: "/models/test.gguf",
        parameters: {
          temperature: 0.3,
          top_p: 0.95,
          num_ctx: 8192,
        },
      };

      const modelfile = latheLoRAOllamaDeployerEngine.generateModelfile(config);

      expect(modelfile).toContain("PARAMETER temperature 0.3");
      expect(modelfile).toContain("PARAMETER top_p 0.95");
      expect(modelfile).toContain("PARAMETER num_ctx 8192");
    });

    it("includes stop sequences", () => {
      const config: OllamaModelConfig = {
        name: "test-model",
        gguf_path: "/models/test.gguf",
        parameters: {
          stop: ["<|end|>", "<|user|>"],
        },
      };

      const modelfile = latheLoRAOllamaDeployerEngine.generateModelfile(config);

      expect(modelfile).toContain('PARAMETER stop "<|end|>"');
      expect(modelfile).toContain('PARAMETER stop "<|user|>"');
    });

    it("includes license if provided", () => {
      const config: OllamaModelConfig = {
        name: "test-model",
        gguf_path: "/models/test.gguf",
        license: "MIT License - For CNC lathe applications only.",
      };

      const modelfile = latheLoRAOllamaDeployerEngine.generateModelfile(config);

      expect(modelfile).toContain("LICENSE");
      expect(modelfile).toContain("MIT License");
    });
  });

  describe("prepareDeployment", () => {
    it("returns deployment commands", () => {
      const config: OllamaModelConfig = {
        name: "lathe-lora-7b",
        gguf_path: "/models/lathe-lora.gguf",
      };

      const result = latheLoRAOllamaDeployerEngine.prepareDeployment(config);

      expect(result.success).toBe(true);
      expect(result.model_name).toBe("lathe-lora-7b");
      expect(result.ollama_name).toBe("lathe-lora-7b");
      expect(result.status).toBe("pending");
      expect(result.commands.some(c => c.includes("ollama create"))).toBe(true);
      expect(result.commands.some(c => c.includes("ollama list"))).toBe(true);
      expect(result.commands.some(c => c.includes("ollama run"))).toBe(true);
    });

    it("sanitizes model name", () => {
      const config: OllamaModelConfig = {
        name: "LatheLoRA 7B (Fine-tuned)",
        gguf_path: "/models/test.gguf",
      };

      const result = latheLoRAOllamaDeployerEngine.prepareDeployment(config);

      expect(result.ollama_name).toBe("lathelora-7b-fine-tuned");
    });
  });

  describe("registerDeployment / getDeployment", () => {
    it("registers and retrieves deployment", () => {
      const config: OllamaModelConfig = {
        name: "lathe-lora-7b",
        gguf_path: "/models/test.gguf",
      };

      latheLoRAOllamaDeployerEngine.registerDeployment(config, { status: "ready" });
      const deployment = latheLoRAOllamaDeployerEngine.getDeployment("lathe-lora-7b");

      expect(deployment).toBeDefined();
      expect(deployment?.status).toBe("ready");
      expect(deployment?.ollama_model_name).toBe("lathe-lora-7b");
      expect(deployment?.endpoint).toContain("/api/generate");
    });

    it("returns undefined for unknown deployment", () => {
      expect(latheLoRAOllamaDeployerEngine.getDeployment("nonexistent")).toBeUndefined();
    });
  });

  describe("listDeployments", () => {
    it("lists all deployments", () => {
      latheLoRAOllamaDeployerEngine.registerDeployment(
        { name: "model-1", gguf_path: "/m1.gguf" },
        { status: "ready" }
      );
      latheLoRAOllamaDeployerEngine.registerDeployment(
        { name: "model-2", gguf_path: "/m2.gguf" },
        { status: "building" }
      );

      const deployments = latheLoRAOllamaDeployerEngine.listDeployments();

      expect(deployments.length).toBe(2);
    });
  });

  describe("generateInferenceRequest", () => {
    it("generates inference request body", () => {
      latheLoRAOllamaDeployerEngine.registerDeployment(
        { name: "lathe-lora", gguf_path: "/test.gguf" },
        { status: "ready" }
      );

      const request = latheLoRAOllamaDeployerEngine.generateInferenceRequest(
        "lathe-lora",
        "What speed for 4140 steel?",
        { temperature: 0.5 }
      );

      expect(request.url).toContain("/api/generate");
      expect(request.method).toBe("POST");
      expect(request.body.model).toBe("lathe-lora");
      expect(request.body.prompt).toBe("What speed for 4140 steel?");
      expect((request.body.options as Record<string, unknown>).temperature).toBe(0.5);
    });
  });

  describe("generateChatRequest", () => {
    it("generates multi-turn chat request", () => {
      const messages = [
        { role: "user" as const, content: "What is CSS?" },
        { role: "assistant" as const, content: "Constant Surface Speed..." },
        { role: "user" as const, content: "How do I program it?" },
      ];

      const request = latheLoRAOllamaDeployerEngine.generateChatRequest(
        "lathe-lora",
        messages,
        { stream: true }
      );

      expect(request.url).toContain("/api/chat");
      expect(request.body.messages).toEqual(messages);
      expect(request.body.stream).toBe(true);
    });
  });

  describe("generateVerificationTest", () => {
    it("generates verification prompts and curl commands", () => {
      latheLoRAOllamaDeployerEngine.registerDeployment(
        { name: "lathe-lora", gguf_path: "/test.gguf" },
        { status: "ready" }
      );

      const test = latheLoRAOllamaDeployerEngine.generateVerificationTest("lathe-lora");

      expect(test.prompts.length).toBe(3);
      expect(test.prompts[0].expected_contains).toContain("SFM");
      expect(test.curl_commands.length).toBe(3);
      expect(test.curl_commands[0]).toContain("curl");
    });
  });

  describe("updateMetrics", () => {
    it("updates deployment metrics", () => {
      latheLoRAOllamaDeployerEngine.registerDeployment(
        { name: "model", gguf_path: "/test.gguf" },
        { status: "ready" }
      );

      const updated = latheLoRAOllamaDeployerEngine.updateMetrics("model", {
        load_time_ms: 1200,
        tokens_per_second: 45,
      });

      expect(updated).toBe(true);

      const deployment = latheLoRAOllamaDeployerEngine.getDeployment("model");
      expect(deployment?.metrics?.load_time_ms).toBe(1200);
      expect(deployment?.metrics?.tokens_per_second).toBe(45);
    });

    it("returns false for unknown model", () => {
      expect(latheLoRAOllamaDeployerEngine.updateMetrics("unknown", {})).toBe(false);
    });
  });

  describe("markFailed", () => {
    it("marks deployment as failed", () => {
      latheLoRAOllamaDeployerEngine.registerDeployment(
        { name: "model", gguf_path: "/test.gguf" },
        { status: "ready" }
      );

      latheLoRAOllamaDeployerEngine.markFailed("model", "Out of memory");

      const deployment = latheLoRAOllamaDeployerEngine.getDeployment("model");
      expect(deployment?.status).toBe("failed");
    });
  });

  describe("removeDeployment", () => {
    it("returns removal commands", () => {
      latheLoRAOllamaDeployerEngine.registerDeployment(
        { name: "model", gguf_path: "/test.gguf" },
        { status: "ready" }
      );

      const result = latheLoRAOllamaDeployerEngine.removeDeployment("model");

      expect(result.success).toBe(true);
      expect(result.commands.some(c => c.includes("ollama rm"))).toBe(true);
      expect(latheLoRAOllamaDeployerEngine.getDeployment("model")).toBeUndefined();
    });

    it("returns failure for unknown model", () => {
      const result = latheLoRAOllamaDeployerEngine.removeDeployment("unknown");
      expect(result.success).toBe(false);
    });
  });

  describe("generateDockerConfig", () => {
    it("generates docker-compose for deployments", () => {
      latheLoRAOllamaDeployerEngine.registerDeployment(
        { name: "model-1", gguf_path: "/models/m1.gguf" },
        { status: "ready" }
      );
      latheLoRAOllamaDeployerEngine.registerDeployment(
        { name: "model-2", gguf_path: "/models/m2.gguf" },
        { status: "ready" }
      );

      const config = latheLoRAOllamaDeployerEngine.generateDockerConfig(["model-1", "model-2"]);

      expect(config).toContain("version:");
      expect(config).toContain("ollama/ollama");
      expect(config).toContain("11434:11434");
      expect(config).toContain("nvidia");
      expect(config).toContain("healthcheck");
    });
  });

  describe("getSummary", () => {
    it("returns formatted summary", () => {
      latheLoRAOllamaDeployerEngine.registerDeployment(
        { name: "model-1", gguf_path: "/m1.gguf" },
        { status: "ready" }
      );
      latheLoRAOllamaDeployerEngine.registerDeployment(
        { name: "model-2", gguf_path: "/m2.gguf" },
        { status: "failed" }
      );

      const summary = latheLoRAOllamaDeployerEngine.getSummary();

      expect(summary).toContain("Total: 2");
      expect(summary).toContain("Ready: 1");
      expect(summary).toContain("Failed: 1");
      expect(summary).toContain("[READY] model-1");
      expect(summary).toContain("[FAILED] model-2");
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      latheLoRAOllamaDeployerEngine.setEndpoint("http://custom:11434");
      latheLoRAOllamaDeployerEngine.registerDeployment(
        { name: "model", gguf_path: "/test.gguf" },
        { status: "ready" }
      );

      latheLoRAOllamaDeployerEngine.reset();

      expect(latheLoRAOllamaDeployerEngine.getEndpoint()).toBe("http://localhost:11434");
      expect(latheLoRAOllamaDeployerEngine.listDeployments().length).toBe(0);
    });
  });
});
