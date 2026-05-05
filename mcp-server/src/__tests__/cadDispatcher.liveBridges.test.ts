/**
 * Round-trip dispatcher tests for solidworks_live_* + esprit_live_* actions
 * (CAD-COMPLETE-MS0/U-CADC-PRINT-LIVE-WIRE01)
 *
 * Engine-level tests (SolidWorksLiveBridgeEngine.test.ts +
 * EspritLiveBridgeEngine.test.ts) cover http/com paths via DI stubs. This
 * file exercises the dispatcher schema + action enum + lazy import wiring,
 * which only the real singleton sees — so we test mock mode + validate +
 * modes (the three actions safe to invoke without a live CAD app).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && res.success === false) return res;
  const content = res.content as Array<{ type: string; text: string }> | undefined;
  const text = content?.[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

const SAMPLE_VBA = 'Sub Main\n    Debug.Print "ok"\nEnd Sub\n';
const SAMPLE_VB = 'Imports Esprit\nModule M\n  Sub Main()\n  End Sub\nEnd Module\n';

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

// ─────────────────────────────────────────────────────────────────────────────
// SolidWorks Live — round-trip via dispatcher
// ─────────────────────────────────────────────────────────────────────────────

describe("cadDispatcher — solidworks_live_* round-trip", () => {
  it("solidworks_live_modes returns v1.1.0 with 3 modes", async () => {
    const r = await invoke("solidworks_live_modes");
    expect(r.success).toBe(true);
    expect(r.version).toBe("1.1.0");
    const modes = r.modes as string[];
    expect([...modes].sort()).toEqual(["com", "http", "mock"]);
  });

  it("solidworks_live_validate accepts mock config", async () => {
    const r = await invoke("solidworks_live_validate", { config: { mode: "mock" } });
    expect(r.success).toBe(true);
    expect(r.ok).toBe(true);
  });

  it("solidworks_live_validate rejects http without endpoint", async () => {
    const r = await invoke("solidworks_live_validate", { config: { mode: "http" } });
    expect(r.success).toBe(true);
    expect(r.ok).toBe(false);
    expect(String(r.error)).toMatch(/endpoint required/);
  });

  it("solidworks_live_execute mock path returns ok:true with synthetic metrics", async () => {
    const r = await invoke("solidworks_live_execute", {
      script: SAMPLE_VBA,
      config: { mode: "mock" },
    });
    expect(r.success).toBe(true);
    expect(r.ok).toBe(true);
    const metrics = r.metrics as Record<string, unknown>;
    expect(metrics.volumeMm3).toBe(15_000);
  });

  it("solidworks_live_execute supports `mode` shorthand (no full config)", async () => {
    const r = await invoke("solidworks_live_execute", {
      script: SAMPLE_VBA,
      mode: "mock",
    });
    expect(r.success).toBe(true);
    expect(r.ok).toBe(true);
  });

  it("solidworks_live_execute http with bogus endpoint surfaces transport error", async () => {
    // Real fetch fires; we want it to FAIL fast on a bogus host. Short timeout
    // keeps the test under a few seconds even if DNS hangs.
    const r = await invoke("solidworks_live_execute", {
      script: SAMPLE_VBA,
      config: {
        mode: "http",
        endpoint: "http://127.0.0.1:1/sw/exec",
        timeoutMs: 500,
      },
    });
    expect(r.success).toBe(false);
    expect(r.ok).toBe(false);
    // Either ECONNREFUSED, DNS, or abort — all are valid transport failures
    expect(String(r.error)).toMatch(/SolidWorksLiveBridge/);
  }, 10_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// Esprit Live — round-trip via dispatcher
// ─────────────────────────────────────────────────────────────────────────────

describe("cadDispatcher — esprit_live_* round-trip", () => {
  it("esprit_live_modes returns v1.1.0 with 3 modes", async () => {
    const r = await invoke("esprit_live_modes");
    expect(r.success).toBe(true);
    expect(r.version).toBe("1.1.0");
    const modes = r.modes as string[];
    expect([...modes].sort()).toEqual(["com", "http", "mock"]);
  });

  it("esprit_live_validate accepts mock config", async () => {
    const r = await invoke("esprit_live_validate", { config: { mode: "mock" } });
    expect(r.success).toBe(true);
    expect(r.ok).toBe(true);
  });

  it("esprit_live_validate rejects com without comShimPath", async () => {
    const r = await invoke("esprit_live_validate", { config: { mode: "com" } });
    expect(r.success).toBe(true);
    expect(r.ok).toBe(false);
    expect(String(r.error)).toMatch(/comShimPath required/);
  });

  it("esprit_live_execute mock path returns ok:true with Esprit-branded metrics", async () => {
    const r = await invoke("esprit_live_execute", {
      script: SAMPLE_VB,
      config: { mode: "mock" },
    });
    expect(r.success).toBe(true);
    expect(r.ok).toBe(true);
    const metrics = r.metrics as Record<string, unknown>;
    // Esprit's mock volume differs from SW's
    expect(metrics.volumeMm3).toBe(8_000);
  });

  it("esprit_live_execute com with nonexistent shim rejected before spawn", async () => {
    const r = await invoke("esprit_live_execute", {
      script: SAMPLE_VB,
      config: {
        mode: "com",
        comShimPath: "C:\\definitely\\does\\not\\exist\\shim.vbs",
        timeoutMs: 500,
      },
    });
    expect(r.success).toBe(false);
    expect(r.ok).toBe(false);
    expect(String(r.error)).toMatch(/does not exist/);
  });
});
