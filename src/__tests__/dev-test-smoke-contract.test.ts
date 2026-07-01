import { describe, expect, it, vi } from "vitest";

vi.mock("../utils/atomicWrite.js", () => ({
  safeWriteSync: vi.fn(),
}));

import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { SMOKE_TESTS } from "../tests/smokeTests.js";

type RegisteredTool = {
  handler: (args: Record<string, any>, extra?: Record<string, any>) => Promise<any>;
};

function createMockServerWithRegisteredTools(): {
  server: any;
  registeredTools: Record<string, RegisteredTool>;
} {
  const registeredTools: Record<string, RegisteredTool> = {};
  const dispatchers = new Set(SMOKE_TESTS.map((test) => test.dispatcher));

  for (const dispatcher of dispatchers) {
    if (dispatcher === "prism_dev") continue;
    registeredTools[dispatcher] = {
      handler: async () => ({
        content: [{ type: "text", text: JSON.stringify({ ok: true }) }],
      }),
    };
  }

  const server = {
    _registeredTools: registeredTools,
    tool(name: string, _description: string, _schema: any, handler: RegisteredTool["handler"]) {
      registeredTools[name] = { handler };
    },
  };

  return { server, registeredTools };
}

async function callDevAction(
  registeredTools: Record<string, RegisteredTool>,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const response = await registeredTools.prism_dev.handler({ action, params }, {});
  const text = response?.content?.[0]?.text;
  return text ? JSON.parse(text) : response;
}

describe("prism_dev test_smoke contract", () => {
  it("runs smoke tests by default instead of only listing them", async () => {
    const { server, registeredTools } = createMockServerWithRegisteredTools();
    registerDevDispatcher(server);

    const result = await callDevAction(registeredTools, "test_smoke");

    expect(result.mode).toBe("run");
    expect(result.run_id).toMatch(/^SMOKE-/);
    expect(result.total).toBe(SMOKE_TESTS.length);
    expect(result.passed + result.failed + result.errors + result.skipped).toBe(result.total);
    expect(result.latest_results_path).toContain("state");
  });

  it("still supports explicit info mode for discovery-only callers", async () => {
    const { server, registeredTools } = createMockServerWithRegisteredTools();
    registerDevDispatcher(server);

    const result = await callDevAction(registeredTools, "test_smoke", { mode: "info" });

    expect(result.mode).toBe("info");
    expect(result.total_tests).toBe(SMOKE_TESTS.length);
    expect(result.run_options.run).toContain("default");
  });
});
