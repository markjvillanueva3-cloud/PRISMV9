import { describe, it, expect, vi, afterEach } from "vitest";
import { ollamaClientEngine } from "../engines/OllamaClientEngine.js";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

/**
 * Dispatcher round-trip E2E for the HERMES-AUTONOMOUS-DRIVER RUNNER
 * (U-HERMES-DRIVE-RUNNER-WIRE, slot:zulu). The R15-WIRE proof that
 * prism_session:autonomous_drive actually routes to HermesAutonomousDriveRunnerEngine
 * THROUGH the dispatcher, the safety gate is enforced at the dispatcher boundary, and a
 * real Ollama-backed executor is wired. The orchestration logic is unit-tested with a
 * mock executor in HermesAutonomousDriveRunnerEngine.test.ts; THESE drive the WIRING +
 * gate + Ollama-failure mapping by stubbing the Ollama singleton the case lazy-imports
 * (same module instance) -- so the suite never depends on a running daemon.
 */

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}>;

function captureHandler(): McpHandler {
  let handler: McpHandler | null = null;
  const server = {
    tool(_name: string, _description: string, _schema: Record<string, unknown>, cb: McpHandler) {
      handler = cb;
    },
  };
  registerSessionDispatcher(server as unknown as Parameters<typeof registerSessionDispatcher>[0]);
  if (!handler) throw new Error("registerSessionDispatcher did not register a handler");
  return handler;
}

async function invoke(
  handler: McpHandler,
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  const raw = (result as { content: Array<{ text: string }> }).content[0]?.text ?? "";
  return JSON.parse(raw);
}

const stp = (id: string, deps: string[] = []) => ({
  subtask_id: id,
  description: `task ${id}`,
  domain: "mill",
  depends_on: deps,
  size_hint: "short",
});

type GenReturn = Awaited<ReturnType<typeof ollamaClientEngine.generate>>;

describe("prism_session:autonomous_drive -- gated runner round-trip", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PRISM_HERMES_AUTONOMOUS_DRIVE;
  });

  it("gate OFF (default): refuses to execute -- Ollama is NEVER called", async () => {
    delete process.env.PRISM_HERMES_AUTONOMOUS_DRIVE;
    const gen = vi.spyOn(ollamaClientEngine, "generate");
    const handler = captureHandler();
    const r = await invoke(handler, "autonomous_drive", { subtasks: [stp("a"), stp("b", ["a"])] });
    expect(r.success).toBe(true);
    const result = r.result as { ran: boolean; gated: boolean; reason: string };
    expect(result.ran).toBe(false);
    expect(result.gated).toBe(true);
    expect(result.reason).toMatch(/gated-off/);
    expect(gen).not.toHaveBeenCalled(); // the safety gate truly blocks execution through the dispatcher
  });

  it("gate ON (gate:true): drives the DAG via Ollama and completes (one Ollama call per subtask)", async () => {
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(true);
    const gen = vi
      .spyOn(ollamaClientEngine, "generate")
      .mockResolvedValue({ ok: true, value: "did it", wallMs: 5 } as GenReturn);
    const handler = captureHandler();
    const r = await invoke(handler, "autonomous_drive", { gate: true, subtasks: [stp("a"), stp("b", ["a"])] });
    expect(r.success).toBe(true);
    const result = r.result as { ran: boolean; gated: boolean; aggregate: { status: string; completed: number } };
    expect(result.ran).toBe(true);
    expect(result.gated).toBe(false);
    expect(result.aggregate.status).toBe("complete");
    expect(result.aggregate.completed).toBe(2);
    expect(gen).toHaveBeenCalledTimes(2);
  });

  it("gate ON + Ollama failure -> subtask fails -> bounded status failed (maxRetries:0)", async () => {
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(true);
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({
      ok: false,
      error: "daemon down",
      wallMs: 5,
    } as GenReturn);
    const handler = captureHandler();
    const r = await invoke(handler, "autonomous_drive", {
      gate: true,
      bounds: { maxRetries: 0 },
      subtasks: [stp("a")],
    });
    expect(r.success).toBe(true);
    const result = r.result as { ran: boolean; aggregate: { status: string; failed: number } };
    expect(result.ran).toBe(true);
    expect(result.aggregate.status).toBe("failed"); // Ollama failure -> subtask failure -> permanent
    expect(result.aggregate.failed).toBe(1);
  });

  it("gate via env PRISM_HERMES_AUTONOMOUS_DRIVE=1: runs without the gate param", async () => {
    process.env.PRISM_HERMES_AUTONOMOUS_DRIVE = "1";
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(true);
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({ ok: true, value: "ok", wallMs: 5 } as GenReturn);
    const handler = captureHandler();
    const r = await invoke(handler, "autonomous_drive", { subtasks: [stp("a")] });
    const result = r.result as { ran: boolean; aggregate: { completed: number } };
    expect(result.ran).toBe(true);
    expect(result.aggregate.completed).toBe(1);
  });

  it("gate ON + Ollama connect FAILS -> fail-loud envelope, no execution", async () => {
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(false);
    vi.spyOn(ollamaClientEngine, "connect").mockResolvedValue({
      ok: false,
      error: "ECONNREFUSED",
      wallMs: 1,
    } as Awaited<ReturnType<typeof ollamaClientEngine.connect>>);
    const gen = vi.spyOn(ollamaClientEngine, "generate");
    const handler = captureHandler();
    const r = await invoke(handler, "autonomous_drive", { gate: true, subtasks: [stp("a")] });
    expect(r.success).toBe(true);
    const result = r.result as { ran: boolean; reason: string };
    expect(result.ran).toBe(false); // a down daemon does NOT silently burn the retry budget
    expect(result.reason).toMatch(/ollama-connect-failed/);
    expect(gen).not.toHaveBeenCalled(); // connect failure short-circuits BEFORE any generate
  });
});
