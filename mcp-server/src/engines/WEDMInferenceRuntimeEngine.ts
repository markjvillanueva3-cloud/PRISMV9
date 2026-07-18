/**
 * WEDMInferenceRuntimeEngine — WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0 U-WCTP-INFERENCE
 * ============================================================================
 *
 * Closes iter13 strategic-gap item #9 — the runtime scaffolding side. The
 * actual GPU-side Python inference (Unsloth / Ollama-served adapter) runs
 * out-of-process, but PRISM needs a fail-loud TypeScript-side runtime that:
 *
 *   1. Tracks which trained adapter (if any) is registered as 'current'
 *      — file path on disk + version + capability metadata
 *   2. Gates the wizard's print-to-program path so it can ASK the runtime
 *      "is a trained model available?" before delegating
 *   3. Exposes a generate(prompt) API that EITHER returns a structured
 *      'not loaded' fail-loud OR delegates to the external runtime via
 *      a registered handler (Ollama / direct Python / future MCP bridge)
 *
 * The engine itself is pure — no I/O, no fetch. Callers (the dispatcher
 * action or a future Ollama bridge) inject the external generate-handler
 * via setGenerateHandler(). This keeps the engine trivially testable +
 * lets the inference runtime swap backends (Ollama / vLLM / TGI / direct
 * Python) without touching the engine.
 *
 * @module engines/WEDMInferenceRuntimeEngine
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WedmAdapterRegistration {
  adapter_version: string;
  adapter_path: string;
  registered_at: string;
  /** Outcome count at the time of registration — pairs with retrain-trigger checkpoint. */
  outcomes_at_registration: number;
  /** Capability tags — what instruction families the adapter was trained on. */
  trained_families: string[];
  /** Validation metrics from the training run. */
  metrics: WedmAdapterMetrics;
}

export interface WedmAdapterMetrics {
  /** Final training loss. */
  final_loss: number | null;
  /** Validation accuracy on held-out Alpaca pairs (0..1). */
  validation_accuracy: number | null;
  /** Recast / Ra / MRR prediction error medians (∅ when not measured). */
  recast_err_um: number | null;
  ra_err_um: number | null;
  mrr_err_pct: number | null;
}

export interface WedmInferenceStatus {
  loaded: boolean;
  reason: string;
  adapter: WedmAdapterRegistration | null;
  /** True if a generate-handler is wired (external runtime is reachable). */
  handler_registered: boolean;
  /** Suggested operator actions when loaded=false. */
  next_actions: string[];
}

export interface WedmGenerateRequest {
  prompt: string;
  /** Optional context: instruction family hint, customer hint, controller dialect. */
  context?: {
    instruction_family?: string;
    customer?: string;
    controller?: string;
  };
  /** Generation budget — caller passes to handler. */
  max_new_tokens?: number;
  temperature?: number;
}

export interface WedmGenerateResult {
  ok: boolean;
  output: string;
  adapter_version: string | null;
  /** Reason populated on failure or partial-fail. */
  reason: string;
  /** Token usage if the external handler reports it. */
  tokens?: { input: number; output: number };
}

/** Caller-injected external runtime — Ollama, vLLM, direct Python, etc. */
export type WedmGenerateHandler = (req: WedmGenerateRequest) => Promise<{
  output: string;
  tokens?: { input: number; output: number };
}>;

// ============================================================================
// ENGINE
// ============================================================================

class WEDMInferenceRuntimeEngine {
  private adapter: WedmAdapterRegistration | null = null;
  private handler: WedmGenerateHandler | null = null;

  /**
   * Register a freshly trained adapter as the runtime's current model.
   * Called by the retrain-trigger checkpoint flow OR manually by the
   * operator after a GPU run.
   */
  registerAdapter(input: {
    adapter_version: string;
    adapter_path: string;
    outcomes_at_registration: number;
    trained_families: string[];
    metrics?: Partial<WedmAdapterMetrics>;
    timestamp?: string;
  }): WedmAdapterRegistration {
    if (!input.adapter_version || input.adapter_version.trim().length === 0) {
      throw new Error("adapter_version must be a non-empty string");
    }
    if (!input.adapter_path || input.adapter_path.trim().length === 0) {
      throw new Error("adapter_path must be a non-empty string");
    }
    if (input.outcomes_at_registration < 0 || !Number.isFinite(input.outcomes_at_registration)) {
      throw new Error(`outcomes_at_registration must be a non-negative finite number, got ${input.outcomes_at_registration}`);
    }
    if (!Array.isArray(input.trained_families) || input.trained_families.length === 0) {
      throw new Error("trained_families must be a non-empty array");
    }
    this.adapter = {
      adapter_version: input.adapter_version.trim(),
      adapter_path: input.adapter_path.trim(),
      registered_at: input.timestamp ?? new Date().toISOString(),
      outcomes_at_registration: Math.floor(input.outcomes_at_registration),
      trained_families: [...input.trained_families],
      metrics: {
        final_loss: input.metrics?.final_loss ?? null,
        validation_accuracy: input.metrics?.validation_accuracy ?? null,
        recast_err_um: input.metrics?.recast_err_um ?? null,
        ra_err_um: input.metrics?.ra_err_um ?? null,
        mrr_err_pct: input.metrics?.mrr_err_pct ?? null,
      },
    };
    return this.cloneAdapter(this.adapter);
  }

  /** Unregister the current adapter — falls back to fail-loud. */
  unregisterAdapter(): void {
    this.adapter = null;
  }

  /** Wire the external generate handler (Ollama / Python / future MCP). */
  setGenerateHandler(handler: WedmGenerateHandler | null): void {
    this.handler = handler;
  }

  /** Status query — wizards call this before delegating print-to-program. */
  status(): WedmInferenceStatus {
    if (!this.adapter) {
      return {
        loaded: false,
        reason: "No trained adapter registered — run wedm_lora_train_script on a GPU machine, then call registerAdapter",
        adapter: null,
        handler_registered: this.handler !== null,
        next_actions: [
          "Invoke wedm_retrain_status to confirm retrain readiness",
          "Generate train_wedm_lora.py via wedm_lora_train_script",
          "Run the script on a GPU machine (Unsloth + Qwen2.5-Coder-7B-bnb-4bit)",
          "Register the resulting adapter via wedm_inference_register_adapter",
        ],
      };
    }
    if (!this.handler) {
      return {
        loaded: false,
        reason: `Adapter ${this.adapter.adapter_version} registered but no generate-handler wired — inference offline`,
        adapter: this.cloneAdapter(this.adapter),
        handler_registered: false,
        next_actions: [
          "Wire an Ollama bridge handler via wedm_inference_register_handler",
          "OR start a local Python inference server and register its callback",
        ],
      };
    }
    return {
      loaded: true,
      reason: `Adapter ${this.adapter.adapter_version} ready — handler wired`,
      adapter: this.cloneAdapter(this.adapter),
      handler_registered: true,
      next_actions: [],
    };
  }

  /**
   * Generate a WEDM response — delegates to the registered handler if
   * loaded, otherwise fails loud with a structured WedmGenerateResult.
   */
  async generate(req: WedmGenerateRequest): Promise<WedmGenerateResult> {
    if (!req.prompt || req.prompt.trim().length === 0) {
      return {
        ok: false,
        output: "",
        adapter_version: this.adapter?.adapter_version ?? null,
        reason: "Empty prompt — generate requires non-empty prompt text",
      };
    }
    if (!this.adapter) {
      return {
        ok: false,
        output: "",
        adapter_version: null,
        reason: "No adapter registered — call registerAdapter after a successful retrain",
      };
    }
    if (!this.handler) {
      return {
        ok: false,
        output: "",
        adapter_version: this.adapter.adapter_version,
        reason: "Adapter registered but no generate-handler wired — inference runtime offline",
      };
    }
    try {
      const out = await this.handler(req);
      return {
        ok: true,
        output: out.output,
        adapter_version: this.adapter.adapter_version,
        reason: "ok",
        tokens: out.tokens,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        output: "",
        adapter_version: this.adapter.adapter_version,
        reason: `Handler threw: ${msg}`,
      };
    }
  }

  /** Defensive copy of the current adapter registration. */
  getAdapter(): WedmAdapterRegistration | null {
    return this.adapter ? this.cloneAdapter(this.adapter) : null;
  }

  /** Reset both adapter + handler — useful for tests. */
  reset(): void {
    this.adapter = null;
    this.handler = null;
  }

  private cloneAdapter(a: WedmAdapterRegistration): WedmAdapterRegistration {
    return {
      ...a,
      trained_families: [...a.trained_families],
      metrics: { ...a.metrics },
    };
  }
}

export const wedmInferenceRuntimeEngine = new WEDMInferenceRuntimeEngine();
