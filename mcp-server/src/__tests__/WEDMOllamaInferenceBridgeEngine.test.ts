import { describe, it, expect, vi } from "vitest";
import { wedmOllamaInferenceBridgeEngine } from "../engines/WEDMOllamaInferenceBridgeEngine.js";
import type { WedmAdapterRegistration } from "../engines/WEDMInferenceRuntimeEngine.js";

const ADAPTER: WedmAdapterRegistration = {
  adapter_version: "v0.1.0",
  adapter_path: "/models/wedm-lora/v0.1.0/adapter.safetensors",
  registered_at: "2026-05-27T18:00:00Z",
  outcomes_at_registration: 500,
  trained_families: ["program_generation", "shutdown_sequence", "fa10s_cascade"],
  metrics: {
    final_loss: 0.42,
    validation_accuracy: 0.83,
    recast_err_um: null,
    ra_err_um: null,
    mrr_err_pct: null,
  },
};

// ============================================================================
// buildModelfile
// ============================================================================

describe("WEDMOllamaInferenceBridgeEngine.buildModelfile", () => {
  it("HAPPY PATH: emits FROM/ADAPTER/PARAMETER/SYSTEM lines with safe defaults", () => {
    const mf = wedmOllamaInferenceBridgeEngine.buildModelfile(ADAPTER);
    expect(mf).toMatch(/^FROM qwen2.5-coder:7b/m);
    expect(mf).toMatch(/^ADAPTER \/models\/wedm-lora\/v0\.1\.0\/adapter\.safetensors/m);
    expect(mf).toMatch(/^PARAMETER temperature 0\.2$/m);
    expect(mf).toMatch(/^PARAMETER top_p 0\.9$/m);
    expect(mf).toMatch(/^PARAMETER num_ctx 8192$/m);
    expect(mf).toMatch(/^PARAMETER stop "<\/output>"$/m);
    expect(mf).toMatch(/^PARAMETER stop "<\|im_end\|>"$/m);
    expect(mf).toMatch(/^SYSTEM ".+wire-EDM.+"$/m);
  });

  it("HAPPY PATH: encodes adapter metadata as Modelfile comments", () => {
    const mf = wedmOllamaInferenceBridgeEngine.buildModelfile(ADAPTER);
    expect(mf).toMatch(/^# adapter_version: v0\.1\.0$/m);
    expect(mf).toMatch(/^# trained_families: program_generation,shutdown_sequence,fa10s_cascade$/m);
    expect(mf).toMatch(/^# WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0\/U-WCTP-OLLAMA-BRIDGE$/m);
  });

  it("HAPPY PATH: ends with newline so concatenation is safe", () => {
    const mf = wedmOllamaInferenceBridgeEngine.buildModelfile(ADAPTER);
    expect(mf.endsWith("\n")).toBe(true);
  });

  it("VARIABILITY: opts.base_model overrides the default", () => {
    const mf = wedmOllamaInferenceBridgeEngine.buildModelfile(ADAPTER, {
      base_model: "llama3.1:8b",
      adapter_path: ADAPTER.adapter_path,
    });
    expect(mf).toMatch(/^FROM llama3\.1:8b/m);
  });

  it("VARIABILITY: opts.adapter_path overrides the registration path", () => {
    const mf = wedmOllamaInferenceBridgeEngine.buildModelfile(ADAPTER, {
      adapter_path: "/alt/path/adapter.gguf",
    });
    expect(mf).toMatch(/^ADAPTER \/alt\/path\/adapter\.gguf$/m);
  });

  it("VARIABILITY: opts.temperature + opts.top_p + opts.num_ctx propagate", () => {
    const mf = wedmOllamaInferenceBridgeEngine.buildModelfile(ADAPTER, {
      adapter_path: ADAPTER.adapter_path,
      temperature: 0.7,
      top_p: 0.95,
      num_ctx: 16384,
    });
    expect(mf).toMatch(/^PARAMETER temperature 0\.7$/m);
    expect(mf).toMatch(/^PARAMETER top_p 0\.95$/m);
    expect(mf).toMatch(/^PARAMETER num_ctx 16384$/m);
  });

  it("VARIABILITY: opts.stop overrides default stop tokens", () => {
    const mf = wedmOllamaInferenceBridgeEngine.buildModelfile(ADAPTER, {
      adapter_path: ADAPTER.adapter_path,
      stop: ["%", "M02"],
    });
    expect(mf).toMatch(/^PARAMETER stop "%"$/m);
    expect(mf).toMatch(/^PARAMETER stop "M02"$/m);
    expect(mf).not.toMatch(/<\/output>/);
  });

  it("VARIABILITY: opts.system_prompt overrides the WEDM default", () => {
    const mf = wedmOllamaInferenceBridgeEngine.buildModelfile(ADAPTER, {
      adapter_path: ADAPTER.adapter_path,
      system_prompt: "Test prompt only.",
    });
    expect(mf).toMatch(/^SYSTEM "Test prompt only\."$/m);
    expect(mf).not.toMatch(/wire-EDM/);
  });

  it("FAILURE: throws when adapter.adapter_path is empty", () => {
    const bad = { ...ADAPTER, adapter_path: "" };
    expect(() => wedmOllamaInferenceBridgeEngine.buildModelfile(bad)).toThrow(/adapter_path required/i);
  });

  it("FAILURE: throws when adapter.adapter_path is whitespace-only", () => {
    const bad = { ...ADAPTER, adapter_path: "   " };
    expect(() => wedmOllamaInferenceBridgeEngine.buildModelfile(bad)).toThrow(/adapter_path required/i);
  });

  it("ADVERSARIAL: system prompt containing quotes is JSON-escaped", () => {
    const mf = wedmOllamaInferenceBridgeEngine.buildModelfile(ADAPTER, {
      adapter_path: ADAPTER.adapter_path,
      system_prompt: 'Quote " then backslash \\ then newline ends',
    });
    expect(mf).toMatch(/SYSTEM "Quote \\" then backslash \\\\ then newline ends"/);
  });
});

// ============================================================================
// buildCreateCommand
// ============================================================================

describe("WEDMOllamaInferenceBridgeEngine.buildCreateCommand", () => {
  it("HAPPY PATH: emits ollama create with quoted Modelfile path", () => {
    const cmd = wedmOllamaInferenceBridgeEngine.buildCreateCommand(
      "wedm-lora:v0.1.0",
      "/tmp/wedm.Modelfile",
    );
    expect(cmd).toBe('ollama create wedm-lora:v0.1.0 -f "/tmp/wedm.Modelfile"');
  });

  it("ADVERSARIAL: Modelfile path containing spaces is safely quoted", () => {
    const cmd = wedmOllamaInferenceBridgeEngine.buildCreateCommand(
      "wedm-lora:v0.1.0",
      "C:/Program Files/Ollama/wedm.Modelfile",
    );
    expect(cmd).toBe('ollama create wedm-lora:v0.1.0 -f "C:/Program Files/Ollama/wedm.Modelfile"');
  });

  it("FAILURE: throws on empty modelName", () => {
    expect(() => wedmOllamaInferenceBridgeEngine.buildCreateCommand("", "/p")).toThrow(/modelName/i);
  });

  it("FAILURE: throws on whitespace-only modelName", () => {
    expect(() => wedmOllamaInferenceBridgeEngine.buildCreateCommand("   ", "/p")).toThrow(/modelName/i);
  });

  it("FAILURE: throws on empty modelfilePath", () => {
    expect(() => wedmOllamaInferenceBridgeEngine.buildCreateCommand("m", "")).toThrow(/modelfilePath/i);
  });

  it("FAILURE: throws on whitespace-only modelfilePath", () => {
    expect(() => wedmOllamaInferenceBridgeEngine.buildCreateCommand("m", "   ")).toThrow(/modelfilePath/i);
  });
});

// ============================================================================
// buildHandler
// ============================================================================

describe("WEDMOllamaInferenceBridgeEngine.buildHandler", () => {
  it("FAILURE: throws on empty modelName", () => {
    expect(() => wedmOllamaInferenceBridgeEngine.buildHandler({ modelName: "" })).toThrow(/modelName/i);
  });

  it("FAILURE: throws on whitespace-only modelName", () => {
    expect(() => wedmOllamaInferenceBridgeEngine.buildHandler({ modelName: "   " })).toThrow(/modelName/i);
  });

  it("HAPPY PATH: returned closure POSTs to /api/generate with the bound model", async () => {
    const fakeFetch = vi.fn(async () => new Response(
      JSON.stringify({ response: "G01 X0 Y0", prompt_eval_count: 12, eval_count: 8 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    const handler = wedmOllamaInferenceBridgeEngine.buildHandler({
      modelName: "wedm-lora:v0.1.0",
      fetchImpl: fakeFetch as unknown as typeof fetch,
    });
    const result = await handler({ prompt: "Cut a circle" });
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    const call = fakeFetch.mock.calls[0];
    expect(call[0]).toBe("http://127.0.0.1:11434/api/generate");
    const init = call[1] as RequestInit;
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("wedm-lora:v0.1.0");
    expect(body.prompt).toBe("Cut a circle");
    expect(body.stream).toBe(false);
    expect(result.output).toBe("G01 X0 Y0");
    expect(result.tokens?.input).toBe(12);
    expect(result.tokens?.output).toBe(8);
  });

  it("HAPPY PATH: baseUrl trailing slash is normalized", async () => {
    const fakeFetch = vi.fn(async () => new Response(
      JSON.stringify({ response: "ok" }),
      { status: 200 },
    ));
    const handler = wedmOllamaInferenceBridgeEngine.buildHandler({
      modelName: "wedm-lora:v0.1.0",
      baseUrl: "http://10.0.0.5:11434/",
      fetchImpl: fakeFetch as unknown as typeof fetch,
    });
    await handler({ prompt: "p" });
    expect(fakeFetch.mock.calls[0][0]).toBe("http://10.0.0.5:11434/api/generate");
  });

  it("HAPPY PATH: temperature + max_new_tokens propagate to Ollama options", async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({ response: "" }), { status: 200 }));
    const handler = wedmOllamaInferenceBridgeEngine.buildHandler({
      modelName: "m",
      fetchImpl: fakeFetch as unknown as typeof fetch,
    });
    await handler({ prompt: "p", temperature: 0.7, max_new_tokens: 256 });
    const body = JSON.parse((fakeFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.options.temperature).toBe(0.7);
    expect(body.options.num_predict).toBe(256);
  });

  it("FAILURE: non-2xx Ollama response throws with status + statusText", async () => {
    const fakeFetch = vi.fn(async () => new Response("server error", { status: 503, statusText: "Service Unavailable" }));
    const handler = wedmOllamaInferenceBridgeEngine.buildHandler({
      modelName: "m",
      fetchImpl: fakeFetch as unknown as typeof fetch,
    });
    await expect(handler({ prompt: "p" })).rejects.toThrow(/503 Service Unavailable/);
  });

  it("ADVERSARIAL: missing response field defaults to empty string + zero tokens", async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    const handler = wedmOllamaInferenceBridgeEngine.buildHandler({
      modelName: "m",
      fetchImpl: fakeFetch as unknown as typeof fetch,
    });
    const result = await handler({ prompt: "p" });
    expect(result.output).toBe("");
    expect(result.tokens?.input).toBe(0);
    expect(result.tokens?.output).toBe(0);
  });

  it("VARIABILITY: opts.timeoutMs is honored — short timeout aborts a slow fetch", async () => {
    const fakeFetch = vi.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      }),
    );
    const handler = wedmOllamaInferenceBridgeEngine.buildHandler({
      modelName: "m",
      timeoutMs: 50,
      fetchImpl: fakeFetch as unknown as typeof fetch,
    });
    await expect(handler({ prompt: "p" })).rejects.toThrow(/aborted/);
  });
});
