/**
 * LatheOllamaIntegrationEngine Tests
 *
 * U-LTH73: Ollama deployment and integration for LoRA models
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheOllamaIntegrationEngine } from "../engines/LatheOllamaIntegrationEngine.js";

describe("LatheOllamaIntegrationEngine", () => {
  beforeEach(() => {
    latheOllamaIntegrationEngine.setConfig({
      model_name: "lathe-lora",
      gguf_path: "models/lathe-merged/lathe-lora-q4_k_m.gguf",
      temperature: 0.3,
      num_ctx: 4096,
    });
  });

  describe("Configuration", () => {
    it("sets and gets config", () => {
      latheOllamaIntegrationEngine.setConfig({
        model_name: "custom-model",
        temperature: 0.5,
      });

      const config = latheOllamaIntegrationEngine.getConfig();

      expect(config.model_name).toBe("custom-model");
      expect(config.temperature).toBe(0.5);
    });

    it("has sensible defaults", () => {
      const config = latheOllamaIntegrationEngine.getConfig();

      expect(config.top_p).toBe(0.9);
      expect(config.top_k).toBe(40);
      expect(config.ollama_host).toBe("http://localhost:11434");
    });

    it("has system prompt", () => {
      const config = latheOllamaIntegrationEngine.getConfig();

      expect(config.system_prompt).toContain("LatheLoRA");
      expect(config.system_prompt).toContain("G-code");
    });
  });

  describe("Modelfile Generation", () => {
    it("generates Modelfile", () => {
      const modelfile = latheOllamaIntegrationEngine.generateModelfile();

      expect(modelfile).toContain("FROM");
      expect(modelfile).toContain("SYSTEM");
      expect(modelfile).toContain("PARAMETER");
    });

    it("includes gguf path", () => {
      latheOllamaIntegrationEngine.setConfig({
        gguf_path: "custom/path.gguf",
      });

      const modelfile = latheOllamaIntegrationEngine.generateModelfile();

      expect(modelfile).toContain("custom/path.gguf");
    });

    it("includes base model when set", () => {
      latheOllamaIntegrationEngine.setConfig({
        base_model: "llama3:8b",
        gguf_path: "",
      });

      const modelfile = latheOllamaIntegrationEngine.generateModelfile();

      expect(modelfile).toContain("FROM llama3:8b");
    });

    it("includes parameters", () => {
      latheOllamaIntegrationEngine.setConfig({
        temperature: 0.4,
        top_p: 0.85,
      });

      const modelfile = latheOllamaIntegrationEngine.generateModelfile();

      expect(modelfile).toContain("temperature 0.4");
      expect(modelfile).toContain("top_p 0.85");
    });

    it("includes stop sequences", () => {
      const modelfile = latheOllamaIntegrationEngine.generateModelfile();

      expect(modelfile).toContain('stop "M30"');
    });

    it("includes template", () => {
      const modelfile = latheOllamaIntegrationEngine.generateModelfile();

      expect(modelfile).toContain("TEMPLATE");
    });

    it("includes license", () => {
      const modelfile = latheOllamaIntegrationEngine.generateModelfile();

      expect(modelfile).toContain("LICENSE");
      expect(modelfile).toContain("JM Die");
    });
  });

  describe("CLI Commands", () => {
    it("generates create command", () => {
      const cmd = latheOllamaIntegrationEngine.getCreateCommand();

      expect(cmd).toBe("ollama create lathe-lora -f Modelfile");
    });

    it("generates run command", () => {
      const cmd = latheOllamaIntegrationEngine.getRunCommand();

      expect(cmd).toBe("ollama run lathe-lora");
    });

    it("generates list command", () => {
      const cmd = latheOllamaIntegrationEngine.getListCommand();

      expect(cmd).toBe("ollama list");
    });

    it("generates show command", () => {
      const cmd = latheOllamaIntegrationEngine.getShowCommand();

      expect(cmd).toBe("ollama show lathe-lora");
    });

    it("generates delete command", () => {
      const cmd = latheOllamaIntegrationEngine.getDeleteCommand();

      expect(cmd).toBe("ollama rm lathe-lora");
    });

    it("generates pull command", () => {
      const cmd = latheOllamaIntegrationEngine.getPullCommand("llama3:8b");

      expect(cmd).toBe("ollama pull llama3:8b");
    });
  });

  describe("API URL Generation", () => {
    it("generates API URL", () => {
      const url = latheOllamaIntegrationEngine.getApiUrl("generate");

      expect(url).toBe("http://localhost:11434/api/generate");
    });

    it("uses custom host", () => {
      latheOllamaIntegrationEngine.setConfig({
        ollama_host: "http://192.168.1.100:11434",
      });

      const url = latheOllamaIntegrationEngine.getApiUrl("tags");

      expect(url).toBe("http://192.168.1.100:11434/api/tags");
    });
  });

  describe("Request Building", () => {
    it("builds generate request", () => {
      const request = latheOllamaIntegrationEngine.buildGenerateRequest(
        "Generate lathe program"
      );

      expect(request.prompt).toContain("### Instruction:");
      expect(request.prompt).toContain("Generate lathe program");
      expect(request.prompt).toContain("### Response:");
    });

    it("includes input when provided", () => {
      const request = latheOllamaIntegrationEngine.buildGenerateRequest(
        "Generate program",
        "Customer: ALCOA"
      );

      expect(request.prompt).toContain("### Input:");
      expect(request.prompt).toContain("Customer: ALCOA");
    });

    it("includes options", () => {
      const request = latheOllamaIntegrationEngine.buildGenerateRequest("Test");

      expect(request.options?.temperature).toBe(0.3);
    });

    it("sets stream to false", () => {
      const request = latheOllamaIntegrationEngine.buildGenerateRequest("Test");

      expect(request.stream).toBe(false);
    });
  });

  describe("Response Parsing", () => {
    it("parses response", () => {
      const response = {
        model: "lathe-lora",
        created_at: "2024-01-01T00:00:00Z",
        response: "O0001\nG28 U0 W0\nM30",
        done: true,
        eval_count: 50,
        eval_duration: 500_000_000,
      };

      const result = latheOllamaIntegrationEngine.parseResponse(response);

      expect(result.gcode).toContain("O0001");
      expect(result.tokens_generated).toBe(50);
      expect(result.model).toBe("lathe-lora");
    });

    it("calculates tokens per second", () => {
      const response = {
        model: "lathe-lora",
        created_at: "2024-01-01T00:00:00Z",
        response: "O0001\nM30",
        done: true,
        eval_count: 100,
        eval_duration: 1_000_000_000,
      };

      const result = latheOllamaIntegrationEngine.parseResponse(response);

      expect(result.tokens_per_second).toBe(100);
    });

    it("adds M30 if missing", () => {
      const response = {
        model: "lathe-lora",
        created_at: "2024-01-01T00:00:00Z",
        response: "O0001\nG28 U0 W0",
        done: true,
      };

      const result = latheOllamaIntegrationEngine.parseResponse(response);

      expect(result.gcode).toContain("M30");
    });
  });

  describe("cURL Examples", () => {
    it("generates generate curl", () => {
      const curl = latheOllamaIntegrationEngine.getCurlGenerate("Test prompt");

      expect(curl).toContain("curl -X POST");
      expect(curl).toContain("/api/generate");
      expect(curl).toContain("lathe-lora");
    });

    it("generates list curl", () => {
      const curl = latheOllamaIntegrationEngine.getCurlList();

      expect(curl).toContain("/api/tags");
    });

    it("generates show curl", () => {
      const curl = latheOllamaIntegrationEngine.getCurlShow();

      expect(curl).toContain("/api/show");
      expect(curl).toContain("lathe-lora");
    });
  });

  describe("Python Client", () => {
    it("generates Python client", () => {
      const client = latheOllamaIntegrationEngine.generatePythonClient();

      expect(client).toContain("#!/usr/bin/env python3");
      expect(client).toContain("import requests");
      expect(client).toContain("def generate");
    });

    it("includes model name", () => {
      const client = latheOllamaIntegrationEngine.generatePythonClient();

      expect(client).toContain("lathe-lora");
    });

    it("includes list_models function", () => {
      const client = latheOllamaIntegrationEngine.generatePythonClient();

      expect(client).toContain("def list_models");
    });

    it("includes main example", () => {
      const client = latheOllamaIntegrationEngine.generatePythonClient();

      expect(client).toContain('if __name__ == "__main__"');
      expect(client).toContain("ALCOA");
    });
  });

  describe("Deployment Script", () => {
    it("generates deployment script", () => {
      const script = latheOllamaIntegrationEngine.generateDeployScript();

      expect(script).toContain("#!/usr/bin/env bash");
      expect(script).toContain("ollama create");
    });

    it("includes error handling", () => {
      const script = latheOllamaIntegrationEngine.generateDeployScript();

      expect(script).toContain("set -e");
      expect(script).toContain("exit 1");
    });

    it("includes verification", () => {
      const script = latheOllamaIntegrationEngine.generateDeployScript();

      expect(script).toContain("ollama show");
    });
  });

  describe("Validation", () => {
    it("validates valid config", () => {
      const result = latheOllamaIntegrationEngine.validateConfig();

      expect(result.valid).toBe(true);
    });

    it("rejects invalid model name", () => {
      latheOllamaIntegrationEngine.setConfig({ model_name: "INVALID NAME!" });
      const result = latheOllamaIntegrationEngine.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("model_name"))).toBe(true);
    });

    it("requires gguf_path or base_model", () => {
      latheOllamaIntegrationEngine.setConfig({
        gguf_path: "",
        base_model: undefined,
      });
      const result = latheOllamaIntegrationEngine.validateConfig();

      expect(result.valid).toBe(false);
    });

    it("warns on high temperature", () => {
      latheOllamaIntegrationEngine.setConfig({ temperature: 0.9 });
      const result = latheOllamaIntegrationEngine.validateConfig();

      expect(result.warnings.some(w => w.includes("temperature"))).toBe(true);
    });

    it("warns on low num_ctx", () => {
      latheOllamaIntegrationEngine.setConfig({ num_ctx: 256 });
      const result = latheOllamaIntegrationEngine.validateConfig();

      expect(result.warnings.some(w => w.includes("num_ctx"))).toBe(true);
    });
  });

  describe("Health Check", () => {
    it("generates health check script", () => {
      const script = latheOllamaIntegrationEngine.getHealthCheckScript();

      expect(script).toContain("#!/usr/bin/env bash");
      expect(script).toContain("curl");
      expect(script).toContain("ollama list");
    });

    it("checks model availability", () => {
      const script = latheOllamaIntegrationEngine.getHealthCheckScript();

      expect(script).toContain("lathe-lora");
      expect(script).toContain("grep -q");
    });

    it("tests generation", () => {
      const script = latheOllamaIntegrationEngine.getHealthCheckScript();

      expect(script).toContain("Testing generation");
      expect(script).toContain("/api/generate");
    });
  });
});
