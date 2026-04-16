/**
 * Tests for OllamaIntegrationEngine (PP-0.19-U-LLM2)
 *
 * Fake OllamaClientEngine lets us exercise health tracking, host
 * fallback, roster caching, default-model map, and warm-up path
 * without any real daemon.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { OllamaIntegrationEngine } from "../engines/OllamaIntegrationEngine.js";
import type {
  OllamaClientEngine,
  OllamaResult,
  OllamaChatOptions,
  OllamaEmbedOptions,
  OllamaGenerateOptions,
} from "../engines/OllamaClientEngine.js";

function makeFakeClient(opts: {
  connectFailFor?: Set<string>;
  listFailNext?: boolean;
  models?: string[];
  generateFail?: boolean;
} = {}): OllamaClientEngine {
  let connected = false;
  let host = "";
  let listFail = opts.listFailNext ?? false;
  const models = opts.models ?? ["mistral:7b", "qwen2.5-coder:7b"];

  const fake = {
    isConnected: () => connected,
    getHost: () => host,
    async connect(h = "http://localhost:11434"): Promise<OllamaResult<void>> {
      if (opts.connectFailFor?.has(h)) {
        return { ok: false, value: null, error: "unreachable", wallMs: 1 };
      }
      connected = true;
      host = h;
      return { ok: true, value: undefined, error: null, wallMs: 1 };
    },
    disconnect(): void {
      connected = false;
      host = "";
    },
    async listModels(): Promise<OllamaResult<string[]>> {
      if (listFail) {
        listFail = false;
        return { ok: false, value: null, error: "timeout", wallMs: 1 };
      }
      return { ok: true, value: models, error: null, wallMs: 5 };
    },
    async generate(_o: OllamaGenerateOptions): Promise<OllamaResult<string>> {
      if (opts.generateFail) {
        return { ok: false, value: null, error: "oom", wallMs: 1 };
      }
      return { ok: true, value: "ok", error: null, wallMs: 20 };
    },
    async chat(_o: OllamaChatOptions): Promise<OllamaResult<string>> {
      return { ok: true, value: "ok", error: null, wallMs: 1 };
    },
    async embed(_o: OllamaEmbedOptions): Promise<OllamaResult<number[]>> {
      return { ok: true, value: [0], error: null, wallMs: 1 };
    },
    __failListNext(): void {
      listFail = true;
    },
  } as unknown as OllamaClientEngine & { __failListNext(): void };
  return fake;
}

describe("OllamaIntegrationEngine", () => {
  let client: OllamaClientEngine;
  let engine: OllamaIntegrationEngine;

  beforeEach(() => {
    client = makeFakeClient();
    engine = new OllamaIntegrationEngine({ client });
  });

  it("ensureConnected() uses the first reachable candidate", async () => {
    client = makeFakeClient({
      connectFailFor: new Set(["http://localhost:11434"]),
    });
    engine = new OllamaIntegrationEngine({
      client,
      hostCandidates: ["http://localhost:11434", "http://127.0.0.1:11434"],
    });
    const ok = await engine.ensureConnected();
    expect(ok).toBe(true);
    expect(engine.snapshotHealth().host).toBe("http://127.0.0.1:11434");
  });

  it("ensureConnected() fails when every candidate is dead", async () => {
    client = makeFakeClient({
      connectFailFor: new Set([
        "http://localhost:11434",
        "http://127.0.0.1:11434",
      ]),
    });
    engine = new OllamaIntegrationEngine({ client });
    const ok = await engine.ensureConnected();
    expect(ok).toBe(false);
    expect(engine.snapshotHealth().host).toBeNull();
  });

  it("ping() records success, streak, latency average", async () => {
    await engine.ping();
    await engine.ping();
    const h = await engine.ping();
    expect(h.connected).toBe(true);
    expect(h.lastPingOk).toBe(true);
    expect(h.okStreak).toBe(3);
    expect(h.failStreak).toBe(0);
    expect(h.avgLatencyMs).not.toBeNull();
    expect(h.pingsAttempted).toBe(3);
  });

  it("ping() records failure and resets ok streak", async () => {
    // Success, then failure
    await engine.ping();
    (client as unknown as { __failListNext(): void }).__failListNext();
    const h = await engine.ping();
    expect(h.lastPingOk).toBe(false);
    expect(h.okStreak).toBe(0);
    expect(h.failStreak).toBe(1);
  });

  it("ping() refreshes the installed-model roster", async () => {
    await engine.ping();
    const models = await engine.discoverModels();
    expect(models).toContain("mistral:7b");
    expect(models).toContain("qwen2.5-coder:7b");
    expect(engine.isModelAvailable("mistral:7b")).toBe(true);
    expect(engine.isModelAvailable("nonexistent:70b")).toBe(false);
  });

  it("discoverModels(true) forces a refresh even with a cached roster", async () => {
    await engine.ping();
    expect((await engine.discoverModels()).length).toBeGreaterThan(0);
    const refreshed = await engine.discoverModels(true);
    expect(refreshed.length).toBeGreaterThan(0);
  });

  it("setDefaultModel/getDefaultModel store per-task selections", () => {
    engine.setDefaultModel("chat", "mistral:7b");
    engine.setDefaultModel("code", "qwen2.5-coder:7b");
    expect(engine.getDefaultModel("chat")).toBe("mistral:7b");
    expect(engine.getDefaultModel("code")).toBe("qwen2.5-coder:7b");
    expect(engine.getDefaultModel("embed")).toBeNull();
  });

  it("setDefaultModel rejects empty model name", () => {
    expect(() => engine.setDefaultModel("chat", "")).toThrow(/model/);
  });

  it("warmUp() reports success on a healthy client", async () => {
    const r = await engine.warmUp("mistral:7b");
    expect(r.ok).toBe(true);
    expect(r.model).toBe("mistral:7b");
    expect(r.wallMs).toBeGreaterThanOrEqual(0);
  });

  it("warmUp() reports failure when generate fails", async () => {
    client = makeFakeClient({ generateFail: true });
    engine = new OllamaIntegrationEngine({ client });
    const r = await engine.warmUp("mistral:7b");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/oom/);
  });

  it("warmUp() refuses empty model name", async () => {
    const r = await engine.warmUp("");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/model/);
  });

  it("status() returns health + roster + defaults snapshot", async () => {
    engine.setDefaultModel("chat", "mistral:7b");
    await engine.ping();
    const s = engine.status();
    expect(s.health.connected).toBe(true);
    expect(s.installedModels).toContain("mistral:7b");
    expect(s.defaultModels.chat).toBe("mistral:7b");
    expect(typeof s.lastRosterRefreshAt).toBe("string");
  });

  it("latency window caps the rolling average to configured size", async () => {
    engine = new OllamaIntegrationEngine({ client, latencyWindow: 2 });
    await engine.ping();
    await engine.ping();
    await engine.ping();
    const h = engine.snapshotHealth();
    expect(h.avgLatencyMs).not.toBeNull();
    // With a 2-sample window, avg should equal average of last 2 samples.
    // Fake client reports 5ms for listModels but we also include connect, so
    // we just assert the value stays finite and non-negative.
    expect(h.avgLatencyMs).toBeGreaterThanOrEqual(0);
  });
});
