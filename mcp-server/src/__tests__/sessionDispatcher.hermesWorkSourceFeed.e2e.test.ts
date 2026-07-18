import { describe, it, expect } from "vitest";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

/**
 * Dispatcher round-trip E2E for HermesWorkSourceFeederEngine
 * (U-BRAVO-WORKSOURCE-FEED-WIRE, slot:bravo). The R15-WIRE proof that
 * prism_session:hermes_work_source_feed actually routes to HermesWorkSourceFeederEngine.toSubtasks
 * THROUGH the dispatcher -- the classification / claim-dedup / malformed-drop logic is unit-tested
 * exhaustively in HermesWorkSourceFeederEngine.test.ts; THESE drive the WIRING (routing + result
 * shape + the dispatcher-boundary error map on a thrown malformed request). The engine was an
 * orphan (0 consumers) until this action; its siblings (hermes_fanout_plan / autonomous_drive)
 * were already wired to prism_session, so this closes the input-stage gap of the fan-out pipeline.
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
): Promise<{ json: Record<string, unknown>; isError: boolean }> {
  const result = await handler({ action, params });
  const raw = result.content[0]?.text ?? "";
  return { json: JSON.parse(raw), isError: Boolean(result.isError) };
}

const row = (over: Record<string, unknown> = {}) => ({
  unit_id: "U-DEMO-1",
  title: "wire the FrobEngine to prism_calc",
  source: "wiring",
  ...over,
});

describe("prism_session:hermes_work_source_feed -- work-source feeder round-trip (WIRING proof)", () => {
  it("routes a valid request to toSubtasks and returns classified subtasks", async () => {
    const handler = captureHandler();
    const { json, isError } = await invoke(handler, "hermes_work_source_feed", {
      request: {
        sources: [
          row({ unit_id: "U-A", title: "refactor the toolpath planner", source: "roadmap" }),
          row({ unit_id: "U-B", title: "summarize the Okuma dwell wiki page", source: "research" }),
        ],
        maxUnits: 8,
      },
    });
    expect(isError).toBe(false);
    expect(json.success).toBe(true);
    const res = json.result as {
      subtasks: Array<{ subtask: { subtask_id: string }; risk: string; executor_lane: string; posture: string }>;
      consideredCount: number;
    };
    // Proof the ENGINE ran (not a stub): 2 rows in -> 2 classified subtasks out, ids preserved.
    expect(res.consideredCount).toBe(2);
    expect(res.subtasks).toHaveLength(2);
    expect(res.subtasks.map((s) => s.subtask.subtask_id).sort()).toEqual(["U-A", "U-B"]);
    // research row -> read-only/local/plan ; roadmap code-title -> code/cloud/draft (classify reached).
    const byId = Object.fromEntries(res.subtasks.map((s) => [s.subtask.subtask_id, s]));
    expect(byId["U-B"].risk).toBe("read-only");
    expect(byId["U-B"].executor_lane).toBe("local");
    expect(byId["U-A"].risk).toBe("code");
  });

  it("excludes a peer-held claim through the dispatcher (never races a live slot)", async () => {
    const handler = captureHandler();
    const { json } = await invoke(handler, "hermes_work_source_feed", {
      request: {
        sources: [row({ unit_id: "U-HELD" }), row({ unit_id: "U-FREE" })],
        heldClaims: ["U-HELD"],
      },
    });
    const res = json.result as {
      subtasks: Array<{ subtask: { subtask_id: string } }>;
      excludedClaimed: number;
    };
    expect(res.excludedClaimed).toBe(1);
    expect(res.subtasks.map((s) => s.subtask.subtask_id)).toEqual(["U-FREE"]);
  });

  it("surfaces the SAFETY classification through the dispatcher (plan-only, never a draft)", async () => {
    const handler = captureHandler();
    const { json } = await invoke(handler, "hermes_work_source_feed", {
      request: {
        sources: [row({ unit_id: "U-SAFE", title: "adjust the Kienzle spindle-load safety gate", source: "roadmap" })],
      },
    });
    const res = json.result as { subtasks: Array<{ risk: string; posture: string; reason: string }> };
    expect(res.subtasks[0].risk).toBe("safety");
    expect(res.subtasks[0].posture).toBe("plan"); // safety is ALWAYS plan-only -- no autonomous draft.
  });

  it("maps the engine's thrown error (non-object request) to a dispatcher error, not a silent pass", async () => {
    const handler = captureHandler();
    // toSubtasks throws on a non-object request; the dispatcher outer catch -> dispatcherError,
    // which surfaces the failure in the BODY as success:false + the throw message (R12 fail-loud;
    // this dispatcher signals errors via the JSON body, not the MCP isError flag -- 0 isError refs).
    const { json } = await invoke(handler, "hermes_work_source_feed", {
      request: "not-an-object",
    });
    expect(json.success).toBe(false);
    expect(String(json.error)).toMatch(/must be an object/);
  });
});
