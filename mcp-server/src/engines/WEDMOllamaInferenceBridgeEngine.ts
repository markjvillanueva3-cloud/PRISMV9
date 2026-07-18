/**
 * WEDMOllamaInferenceBridgeEngine — WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0 U-WCTP-OLLAMA-BRIDGE
 * ============================================================================
 *
 * iter22 — closes the closed loop end-to-end. iter21 shipped the
 * fail-loud inference runtime + injectable handler interface; this engine
 * provides the canonical default backend: a local Ollama bridge.
 *
 * Pure scaffolding — exposes 3 pure helpers + 1 handler factory:
 *
 *   - buildModelfile(adapter)           Generate Ollama Modelfile from a registered adapter
 *   - buildCreateCommand(name, mfPath)  Build the `ollama create` CLI invocation
 *   - buildHandler(opts)                Return a WedmGenerateHandler closure that fetches
 *                                       /api/generate against a local Ollama daemon
 *
 * The handler is a closure: it does NOT execute on construction, so the engine
 * is safe to unit-test without an Ollama daemon. The caller chooses when to
 * wire it into WEDMInferenceRuntimeEngine via setGenerateHandler().
 *
 * @module engines/WEDMOllamaInferenceBridgeEngine
 * @version 1.0.0
 */

import type {
  WedmAdapterRegistration,
  WedmGenerateHandler,
} from "./WEDMInferenceRuntimeEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface OllamaBridgeOptions {
  /** Ollama model name — typically "wedm-lora:v0.1.0" matching adapter_version. */
  modelName: string;
  /** Ollama daemon endpoint. Default: http://127.0.0.1:11434 */
  baseUrl?: string;
  /** Request timeout in ms — local Ollama generate can be slow. Default: 60000 */
  timeoutMs?: number;
  /** fetch implementation override for testability. Default: globalThis.fetch */
  fetchImpl?: typeof fetch;
}

export interface ModelfileInput {
  /** Base model — default is Qwen2.5-Coder-7B-bnb-4bit's Ollama-quantized form. */
  base_model?: string;
  /** Path to the GGUF or adapter file Ollama will mount. */
  adapter_path: string;
  /** System prompt — WEDM domain context. */
  system_prompt?: string;
  temperature?: number;
  top_p?: number;
  num_ctx?: number;
  stop?: string[];
}

export interface OllamaGenerateResponse {
  /** Ollama /api/generate completion body field. */
  response: string;
  /** Token counts when Ollama reports them. */
  prompt_eval_count?: number;
  eval_count?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_BASE_MODEL = "qwen2.5-coder:7b";
const DEFAULT_SYSTEM_PROMPT =
  "You are a wire-EDM CNC programming expert specializing in Mitsubishi FA-series machines. " +
  "Generate safe, verifiable G-code with explicit reasoning. " +
  "Prefer canonical shutdown sequence (M85→M83→M81→M21→M58→M02) and never emit M82 (Wire On) without a prior M78 (Power On).";

// ============================================================================
// ENGINE
// ============================================================================

class WEDMOllamaInferenceBridgeEngine {
  /**
   * Generate an Ollama Modelfile string from an inference-runtime adapter
   * registration. Pure — no I/O.
   */
  buildModelfile(adapter: WedmAdapterRegistration, opts?: ModelfileInput): string {
    if (!adapter.adapter_path || adapter.adapter_path.trim().length === 0) {
      throw new Error("adapter.adapter_path required to build Modelfile");
    }
    const base = (opts?.base_model ?? DEFAULT_BASE_MODEL).trim();
    const adapterPath = (opts?.adapter_path ?? adapter.adapter_path).trim();
    const systemPrompt = (opts?.system_prompt ?? DEFAULT_SYSTEM_PROMPT).trim();
    const temperature = opts?.temperature ?? 0.2;
    const topP = opts?.top_p ?? 0.9;
    const numCtx = opts?.num_ctx ?? 8192;
    const stop = opts?.stop ?? ["</output>", "<|im_end|>"];

    const lines: string[] = [];
    lines.push(`FROM ${base}`);
    lines.push(`ADAPTER ${adapterPath}`);
    lines.push(`PARAMETER temperature ${temperature}`);
    lines.push(`PARAMETER top_p ${topP}`);
    lines.push(`PARAMETER num_ctx ${numCtx}`);
    for (const s of stop) {
      lines.push(`PARAMETER stop ${JSON.stringify(s)}`);
    }
    lines.push(`SYSTEM ${JSON.stringify(systemPrompt)}`);
    lines.push(`# WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0/U-WCTP-OLLAMA-BRIDGE`);
    lines.push(`# adapter_version: ${adapter.adapter_version}`);
    lines.push(`# trained_families: ${adapter.trained_families.join(",")}`);
    return lines.join("\n") + "\n";
  }

  /**
   * Build the `ollama create` CLI invocation for a Modelfile on disk.
   * Pure — caller decides when to execute it.
   */
  buildCreateCommand(modelName: string, modelfilePath: string): string {
    if (!modelName || modelName.trim().length === 0) {
      throw new Error("modelName must be non-empty");
    }
    if (!modelfilePath || modelfilePath.trim().length === 0) {
      throw new Error("modelfilePath must be non-empty");
    }
    return `ollama create ${modelName.trim()} -f ${JSON.stringify(modelfilePath.trim())}`;
  }

  /**
   * Build a WedmGenerateHandler closure bound to a local Ollama model.
   * The closure is invoked by WEDMInferenceRuntimeEngine.generate(); it
   * does NOT fetch on construction, so unit tests can build + introspect
   * the handler without an Ollama daemon.
   */
  buildHandler(opts: OllamaBridgeOptions): WedmGenerateHandler {
    if (!opts.modelName || opts.modelName.trim().length === 0) {
      throw new Error("modelName must be non-empty");
    }
    const modelName = opts.modelName.trim();
    const baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new Error("No fetch implementation available — pass opts.fetchImpl");
    }

    return async (req) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const body = {
          model: modelName,
          prompt: req.prompt,
          stream: false,
          options: {
            temperature: req.temperature ?? 0.2,
            num_predict: req.max_new_tokens ?? 512,
          },
        };
        const res = await fetchImpl(`${baseUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Ollama /api/generate ${res.status} ${res.statusText}`);
        }
        const json = (await res.json()) as OllamaGenerateResponse;
        return {
          output: json.response ?? "",
          tokens: {
            input: json.prompt_eval_count ?? 0,
            output: json.eval_count ?? 0,
          },
        };
      } finally {
        clearTimeout(timer);
      }
    };
  }
}

export const wedmOllamaInferenceBridgeEngine = new WEDMOllamaInferenceBridgeEngine();
