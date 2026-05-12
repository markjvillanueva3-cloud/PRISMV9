/**
 * OllamaClientEngine — Thin client around the `ollama` npm package
 *
 * Phase external-infra. Wraps Ollama's local LLM runtime so PRISM callers
 * can request chat completions, plain-text generation, and embeddings
 * without importing the Ollama SDK directly. The real daemon must be
 * running (either via `docker compose up -d ollama` or a host install);
 * this engine is a stateless HTTP client.
 *
 * No streaming in this first pass — everything buffers to a string. A
 * future `chatStream()` is trivial to add once a consumer needs it.
 *
 * @module engines/OllamaClientEngine
 * @milestone PP-INFRA-OLLAMA
 */

import type { Ollama } from "ollama";

export type OllamaRole = "system" | "user" | "assistant" | "tool";

export interface OllamaMessage {
  role: OllamaRole;
  content: string;
}

export interface OllamaGenerateOptions {
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaChatOptions {
  model: string;
  messages: readonly OllamaMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaEmbedOptions {
  model: string;
  input: string;
}

export interface OllamaResult<T> {
  ok: boolean;
  value: T | null;
  error: string | null;
  wallMs: number;
}

function success<T>(value: T, wallMs: number): OllamaResult<T> {
  return { ok: true, value, error: null, wallMs };
}

function failure<T>(error: string, wallMs: number): OllamaResult<T> {
  return { ok: false, value: null, error, wallMs };
}

export class OllamaClientEngine {
  private client: Ollama | null = null;
  private host = "http://localhost:11434";

  async connect(host = "http://localhost:11434"): Promise<OllamaResult<void>> {
    const started = Date.now();
    this.validateHost(host);
    try {
      // Dynamic import keeps module load cheap + lets tests stub it.
      const { Ollama: Ctor } = await import("ollama");
      this.client = new Ctor({ host });
      this.host = host;
      return success(undefined, Date.now() - started);
    } catch (e) {
      this.client = null;
      return failure((e as Error)?.message ?? String(e), Date.now() - started);
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  getHost(): string {
    return this.host;
  }

  async listModels(): Promise<OllamaResult<string[]>> {
    const started = Date.now();
    if (!this.client) return failure("not connected", Date.now() - started);
    try {
      const r = await this.client.list();
      const names = (r.models ?? []).map((m) => m.name).sort();
      return success(names, Date.now() - started);
    } catch (e) {
      return failure((e as Error)?.message ?? String(e), Date.now() - started);
    }
  }

  async generate(options: OllamaGenerateOptions): Promise<OllamaResult<string>> {
    const started = Date.now();
    this.validateGenerate(options);
    const runtimeOpts = this.mapOptions(options);
    if (!this.client) return failure("not connected", Date.now() - started);
    try {
      const r = await this.client.generate({
        model: options.model,
        prompt: options.prompt,
        system: options.system,
        stream: false,
        options: runtimeOpts,
      });
      return success(r.response ?? "", Date.now() - started);
    } catch (e) {
      return failure((e as Error)?.message ?? String(e), Date.now() - started);
    }
  }

  async chat(options: OllamaChatOptions): Promise<OllamaResult<string>> {
    const started = Date.now();
    this.validateChat(options);
    const runtimeOpts = this.mapOptions(options);
    if (!this.client) return failure("not connected", Date.now() - started);
    try {
      const r = await this.client.chat({
        model: options.model,
        messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        options: runtimeOpts,
      });
      return success(r.message?.content ?? "", Date.now() - started);
    } catch (e) {
      return failure((e as Error)?.message ?? String(e), Date.now() - started);
    }
  }

  async embed(options: OllamaEmbedOptions): Promise<OllamaResult<number[]>> {
    const started = Date.now();
    this.validateEmbed(options);
    if (!this.client) return failure("not connected", Date.now() - started);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await this.client.embeddings({ model: options.model, prompt: options.input });
      const vec: number[] = r.embedding ?? [];
      return success(vec, Date.now() - started);
    } catch (e) {
      return failure((e as Error)?.message ?? String(e), Date.now() - started);
    }
  }

  disconnect(): void {
    this.client = null;
  }

  // --- internals ---------------------------------------------------------

  private mapOptions(opts: { temperature?: number; maxTokens?: number }): Record<string, unknown> | undefined {
    const out: Record<string, unknown> = {};
    if (opts.temperature !== undefined) {
      if (!(opts.temperature >= 0 && opts.temperature <= 2)) throw new Error("temperature must be in [0, 2]");
      out.temperature = opts.temperature;
    }
    if (opts.maxTokens !== undefined) {
      if (!Number.isInteger(opts.maxTokens) || opts.maxTokens <= 0) throw new Error("maxTokens must be positive integer");
      out.num_predict = opts.maxTokens;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  private validateHost(host: string): void {
    if (!host || host.trim() === "") throw new Error("host required");
    if (!/^https?:\/\//.test(host)) throw new Error("host must start with http(s)://");
  }

  private validateGenerate(o: OllamaGenerateOptions): void {
    if (!o.model || o.model.trim() === "") throw new Error("model required");
    if (typeof o.prompt !== "string" || o.prompt.length === 0) throw new Error("prompt required");
  }

  private validateChat(o: OllamaChatOptions): void {
    if (!o.model || o.model.trim() === "") throw new Error("model required");
    if (!Array.isArray(o.messages) || o.messages.length === 0) throw new Error("messages must be non-empty");
    for (const m of o.messages) {
      if (!["system", "user", "assistant", "tool"].includes(m.role)) throw new Error("invalid message role");
      if (typeof m.content !== "string" || m.content.length === 0) throw new Error("message.content required");
    }
  }

  private validateEmbed(o: OllamaEmbedOptions): void {
    if (!o.model || o.model.trim() === "") throw new Error("model required");
    if (typeof o.input !== "string" || o.input.length === 0) throw new Error("input required");
  }
}

export const ollamaClientEngine = new OllamaClientEngine();
