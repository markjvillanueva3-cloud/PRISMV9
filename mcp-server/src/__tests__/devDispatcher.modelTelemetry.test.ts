/**
 * INTEL-OLLAMA-OBSIDIAN-MS0/P23 — dispatcher wiring tests
 *
 * Round-trips ModelTelemetryEngine (P23-U01) + router-adaptation-status
 * (P23-U02) through the `prism_dev` MCP tool's handler. Uses a fake MCP
 * server that captures the registered handler closure so we can invoke
 * it directly without standing up a transport.
 *
 * Why round-trip (not just engine-direct): codex / wire scrutiny rejects
 * "source-grep verified" wiring claims — the handler must demonstrably
 * accept the action, decode params, call the engine, and return the
 * canonical {success, data} shape.
 */

import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const ownedDirs = new Set<string>();

function makeFixtureDir(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `prism-devdisp-${label}-${process.pid}-`));
  ownedDirs.add(dir);
  return dir;
}

afterEach(() => {
  for (const dir of ownedDirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  ownedDirs.clear();
});

/** Fake MCP server that captures `tool(name, desc, schema, handler)` calls. */
type RegisteredTool = {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
};

function makeFakeServer(): { server: { tool: (...args: unknown[]) => void }; tools: RegisteredTool[] } {
  const tools: RegisteredTool[] = [];
  const server = {
    tool: (...args: unknown[]) => {
      tools.push({
        name: args[0] as string,
        description: args[1] as string,
        schema: args[2] as Record<string, unknown>,
        handler: args[3] as RegisteredTool["handler"],
      });
    },
  };
  return { server, tools };
}

async function buildPrismDevHandler(): Promise<RegisteredTool["handler"]> {
  const { server, tools } = makeFakeServer();
  const { registerDevDispatcher } = await import("../tools/dispatchers/devDispatcher.js");
  registerDevDispatcher(server as never);
  const dev = tools.find((t) => t.name === "prism_dev");
  if (!dev) throw new Error("registerDevDispatcher did not register a tool named 'prism_dev'");
  return dev.handler;
}

/** Parse the canonical {content:[{type:"text", text:"<json>"}]} envelope. */
function parsePayload(response: { content: Array<{ type: string; text: string }> }): Record<string, unknown> {
  const text = response.content?.[0]?.text ?? "";
  return JSON.parse(text);
}

// ── model_telemetry_log + model_telemetry_report round-trip ───────────────

describe("prism_dev:model_telemetry_log + model_telemetry_report", () => {
  it("logs a single telemetry call through the dispatcher and reads it back via report action", async () => {
    const dir = makeFixtureDir("log-report");
    const jsonl = path.join(dir, "model-telemetry.jsonl");
    process.env.PRISM_MODEL_TELEMETRY_PATH = jsonl;

    try {
      const handler = await buildPrismDevHandler();

      // Reset any singleton state from a prior test run.
      const { modelTelemetryEngine } = await import("../engines/ModelTelemetryEngine.js");
      // Force the singleton to point at our temp path by clearing + re-importing isn't trivial;
      // instead, use the engine's own reset to clear the live file at the env-pointed path.
      modelTelemetryEngine.reset();

      const logResp = await handler({
        action: "model_telemetry_log",
        params: {
          model: "ollama-7b",
          backend: "ollama",
          taskKind: "code",
          promptTokens: 500,
          completionTokens: 200,
          latencyMs: 850,
          outcome: "ok",
        },
      });
      const logBody = parsePayload(logResp);
      expect(logBody.success).toBe(true);
      const data = logBody.data as Record<string, unknown>;
      const entry = data.entry as Record<string, unknown>;
      expect(entry.model).toBe("ollama-7b");
      expect(entry.outcome).toBe("ok");
      expect(entry.latencyMs).toBe(850);
      expect(entry.schemaVersion).toBe(1);

      const reportResp = await handler({
        action: "model_telemetry_report",
        params: { recentLimit: 5 },
      });
      const reportBody = parsePayload(reportResp);
      expect(reportBody.success).toBe(true);
      const reportData = reportBody.data as Record<string, unknown>;
      const stats = reportData.stats as { totalCalls: number; byModel: Record<string, { calls: number; latencyP50Ms: number; latencyMaxMs: number }> };
      expect(stats.totalCalls).toBe(1);
      expect(stats.byModel["ollama-7b"].calls).toBe(1);
      expect(stats.byModel["ollama-7b"].latencyP50Ms).toBe(850);
      expect(stats.byModel["ollama-7b"].latencyMaxMs).toBe(850);
      const recent = reportData.recent as Array<{ model: string }>;
      expect(recent).toHaveLength(1);
      expect(recent[0].model).toBe("ollama-7b");

      modelTelemetryEngine.reset();
    } finally {
      delete process.env.PRISM_MODEL_TELEMETRY_PATH;
    }
  });

  it("rejects invalid telemetry log input through the dispatcher (Zod parse fail)", async () => {
    const dir = makeFixtureDir("log-reject");
    const jsonl = path.join(dir, "model-telemetry.jsonl");
    process.env.PRISM_MODEL_TELEMETRY_PATH = jsonl;
    try {
      const handler = await buildPrismDevHandler();
      const resp = await handler({
        action: "model_telemetry_log",
        params: { model: "", promptTokens: -1, completionTokens: 0, latencyMs: 100 },
      });
      const body = parsePayload(resp);
      expect(body.success).toBe(false);
      expect(body.error).toBe("invalid_input");
      expect(typeof body.detail).toBe("string");
    } finally {
      delete process.env.PRISM_MODEL_TELEMETRY_PATH;
    }
  });

  it("model_telemetry_purge rejects negative olderThanMs", async () => {
    const dir = makeFixtureDir("purge-reject");
    const jsonl = path.join(dir, "model-telemetry.jsonl");
    process.env.PRISM_MODEL_TELEMETRY_PATH = jsonl;
    try {
      const handler = await buildPrismDevHandler();
      const resp = await handler({
        action: "model_telemetry_purge",
        params: { olderThanMs: -100 },
      });
      const body = parsePayload(resp);
      expect(body.success).toBe(false);
      expect(body.error).toBe("invalid_olderThanMs");
      expect(body.value).toBe(-100);
    } finally {
      delete process.env.PRISM_MODEL_TELEMETRY_PATH;
    }
  });
});

// ── router_adaptation_status round-trip ──────────────────────────────────

describe("prism_dev:router_adaptation_status", () => {
  it("returns canonical adaptation-state paths in the response shape", async () => {
    const handler = await buildPrismDevHandler();
    const resp = await handler({ action: "router_adaptation_status", params: {} });
    const body = parsePayload(resp);
    expect(body.success).toBe(true);
    // The `data.paths` block is always present (constructed unconditionally
    // in the dispatcher). `state` and `recent` may be slimmed when null/empty
    // by the response slimmer — so we only assert the always-present keys.
    const data = body.data as Record<string, unknown>;
    const paths = data.paths as { state: string; log: string };
    expect(typeof paths.state).toBe("string");
    expect(typeof paths.log).toBe("string");
    expect(paths.state.endsWith("router-adaptation-state.json")).toBe(true);
    expect(paths.log.endsWith("router-adaptation.jsonl")).toBe(true);
  });

  it("returns parsed adaptation state and tail of recent decisions when files exist", async () => {
    // Inject the fixture files into the canonical path that the dispatcher reads.
    // We back up + restore the existing state files so we don't corrupt the project.
    const { PATHS } = await import("../constants.js");
    const stateDir = path.join(PATHS.MCP_SERVER, "data", "state");
    const statePath = path.join(stateDir, "router-adaptation-state.json");
    const logPath = path.join(stateDir, "router-adaptation.jsonl");
    fs.mkdirSync(stateDir, { recursive: true });

    let stateBackup: string | null = null;
    let logBackup: string | null = null;
    try {
      if (fs.existsSync(statePath)) stateBackup = fs.readFileSync(statePath, "utf8");
      if (fs.existsSync(logPath)) logBackup = fs.readFileSync(logPath, "utf8");

      fs.writeFileSync(statePath, JSON.stringify({
        schemaVersion: 1,
        generatedAt: "2026-05-13T00:00:00.000Z",
        state: {
          "test-only-model": {
            effectiveLatencyMs: 1234,
            excludedFromSafety: false,
            reason: "dispatcher round-trip test",
            appliedAt: "2026-05-13T00:00:00.000Z",
          },
        },
      }, null, 2), "utf8");

      const decisions = [
        { ts: "2026-05-13T00:00:00.000Z", schemaVersion: 1, model: "test-only-model", action: "update-latency", reason: "set" },
        { ts: "2026-05-13T00:01:00.000Z", schemaVersion: 1, model: "other-model", action: "demote-safety", reason: "high failures" },
      ];
      fs.writeFileSync(logPath, decisions.map((d) => JSON.stringify(d)).join("\n") + "\n", "utf8");

      const handler = await buildPrismDevHandler();
      const resp = await handler({ action: "router_adaptation_status", params: { recentLimit: 10 } });
      const body = parsePayload(resp);
      expect(body.success).toBe(true);

      const data = body.data as Record<string, unknown>;
      const state = data.state as { schemaVersion: number; state: Record<string, { effectiveLatencyMs: number; reason: string }> };
      expect(state.schemaVersion).toBe(1);
      expect(state.state["test-only-model"].effectiveLatencyMs).toBe(1234);
      expect(state.state["test-only-model"].reason).toBe("dispatcher round-trip test");

      const recent = data.recent as Array<{ model: string; action: string }>;
      expect(recent.length).toBe(2);
      expect(recent[0].model).toBe("test-only-model");
      expect(recent[1].action).toBe("demote-safety");
    } finally {
      // Restore prior state.
      if (stateBackup !== null) fs.writeFileSync(statePath, stateBackup, "utf8");
      else if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
      if (logBackup !== null) fs.writeFileSync(logPath, logBackup, "utf8");
      else if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
    }
  });

  it("tolerates a malformed JSONL line in the adaptation log without throwing", async () => {
    const { PATHS } = await import("../constants.js");
    const stateDir = path.join(PATHS.MCP_SERVER, "data", "state");
    const logPath = path.join(stateDir, "router-adaptation.jsonl");
    fs.mkdirSync(stateDir, { recursive: true });

    let logBackup: string | null = null;
    try {
      if (fs.existsSync(logPath)) logBackup = fs.readFileSync(logPath, "utf8");

      fs.writeFileSync(logPath, [
        JSON.stringify({ ts: "2026-05-13T00:00:00.000Z", model: "good", action: "update-latency" }),
        "this is not json {{{",
        JSON.stringify({ ts: "2026-05-13T00:01:00.000Z", model: "good2", action: "demote-safety" }),
      ].join("\n") + "\n", "utf8");

      const handler = await buildPrismDevHandler();
      const resp = await handler({ action: "router_adaptation_status", params: { recentLimit: 10 } });
      const body = parsePayload(resp);
      expect(body.success).toBe(true);
      const data = body.data as Record<string, unknown>;
      const recent = data.recent as Array<Record<string, unknown>>;
      expect(recent.length).toBe(3);
      expect(recent[0].model).toBe("good");
      expect(recent[1].malformed).toBe(true);
      expect(recent[2].model).toBe("good2");
    } finally {
      if (logBackup !== null) fs.writeFileSync(logPath, logBackup, "utf8");
      else if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
    }
  });
});
