/**
 * devDispatcher.cost-telemetry-wire.test.ts
 *
 * COST-CASCADE-MS0/U-MULTI-AGENT-COST-TELEMETRY — round-trip wire test for
 * the `cost_telemetry_record` / `cost_telemetry_aggregate` actions that
 * expose MultiAgentCostTelemetryEngine through the `prism_dev` dispatcher.
 *
 * MultiAgentCostTelemetryEngine itself is exhaustively unit-tested in
 * MultiAgentCostTelemetryEngine.test.ts (21 cases, hermetic tmp paths).
 * This file verifies ONLY the wiring seam:
 *  - both actions are in the dispatcher z.enum + ACTION_DEV_SCHEMAS
 *  - the Zod schema validates/rejects input shape BEFORE the case runs
 *  - a valid request round-trips enum → schema → case → engine → response
 *  - the async `aggregate()` is correctly `await`ed inside the case (a
 *    missing await would surface as a Promise, not the {ok,...} envelope)
 *
 * Side-effect discipline: `beforeAll` redirects the ledger to a hermetic
 * tmp file via the engine's call-time `PRISM_COST_TELEMETRY_PATH` env
 * override, so the single valid `cost_telemetry_record` round-trip writes
 * to tmp — NEVER the shared prod ledger — and is deterministic in CI
 * regardless of the prod dir's writability. `afterAll` restores the env
 * and removes the tmp dir. The schema-rejection + aggregate assertions are
 * additionally side-effect-free by construction.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";

// Redirect the ledger to a hermetic tmp file via the engine's call-time
// env override so the round-trip `cost_telemetry_record` write does NOT
// touch the shared prod ledger (mcp-server/data/state/cost-telemetry.jsonl)
// and the test is deterministic in CI regardless of that dir's writability.
let tmpDir: string;
let prevEnv: string | undefined;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cost-tel-wire-"));
  prevEnv = process.env.PRISM_COST_TELEMETRY_PATH;
  process.env.PRISM_COST_TELEMETRY_PATH = path.join(
    tmpDir,
    "cost-telemetry.jsonl",
  );
});

afterAll(() => {
  if (prevEnv === undefined) delete process.env.PRISM_COST_TELEMETRY_PATH;
  else process.env.PRISM_COST_TELEMETRY_PATH = prevEnv;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

type Handler = (args: {
  action: string;
  params?: Record<string, unknown>;
}) => Promise<{ content?: Array<{ text?: string }> }>;

function createServer(): Promise<Handler> {
  let resolve!: (h: Handler) => void;
  const handlerPromise = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: unknown, fn: Handler) {
      resolve(fn);
    },
  };
  registerDevDispatcher(fakeServer as unknown as Parameters<typeof registerDevDispatcher>[0]);
  return handlerPromise;
}

async function call(
  handler: Handler,
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return r as unknown as Record<string, unknown>;
  }
}

describe("devDispatcher — cost-telemetry schema behavior", () => {
  it("validates a well-formed cost_telemetry_record (ollama $0 + null tokens)", () => {
    const parsed = ACTION_DEV_SCHEMAS.cost_telemetry_record.safeParse({
      tentacle: "ollama",
      taskClass: "summarize",
      inputTokens: null,
      outputTokens: null,
      latencyMs: 1200,
      costUSD: 0,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects cost_telemetry_record with a missing tentacle", () => {
    const parsed = ACTION_DEV_SCHEMAS.cost_telemetry_record.safeParse({
      taskClass: "summarize",
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      costUSD: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects cost_telemetry_record with a negative costUSD", () => {
    const parsed = ACTION_DEV_SCHEMAS.cost_telemetry_record.safeParse({
      tentacle: "claude",
      taskClass: "x",
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      costUSD: -0.01,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects cost_telemetry_record with a fractional token count", () => {
    const parsed = ACTION_DEV_SCHEMAS.cost_telemetry_record.safeParse({
      tentacle: "claude",
      taskClass: "x",
      inputTokens: 1.5,
      outputTokens: 1,
      latencyMs: 1,
      costUSD: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it("validates cost_telemetry_aggregate with a positive window", () => {
    const parsed = ACTION_DEV_SCHEMAS.cost_telemetry_aggregate.safeParse({
      windowHours: 24,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects cost_telemetry_aggregate with a non-positive window", () => {
    const parsed = ACTION_DEV_SCHEMAS.cost_telemetry_aggregate.safeParse({
      windowHours: 0,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("devDispatcher — cost-telemetry round-trip", () => {
  it("rejects an invalid cost_telemetry_record at the schema gate (no write)", async () => {
    const handler = await createServer();
    const res = await call(handler, "cost_telemetry_record", {
      taskClass: "x", // tentacle missing → validateActionParams rejects
      latencyMs: 1,
      costUSD: 0,
    });
    // dispatcher validation rejects before the case body — proves the
    // action is enum-wired AND schema-wired (a non-registered action would
    // hit the not_implemented default instead)
    const blob = JSON.stringify(res).toLowerCase();
    expect(blob).toMatch(/valid|error|required|invalid/);
    expect(blob).not.toContain("not_implemented");
  });

  it("a valid cost_telemetry_record round-trips enum→schema→case→engine", async () => {
    const handler = await createServer();
    const res = await call(handler, "cost_telemetry_record", {
      tentacle: "__wiretest__",
      taskClass: "wire_seam_probe",
      inputTokens: 7,
      outputTokens: 3,
      latencyMs: 42,
      costUSD: 0,
      meta: { test: "devDispatcher.cost-telemetry-wire" },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const v = res.value as Record<string, unknown>;
      expect(v.tentacle).toBe("__wiretest__");
      expect(v.taskClass).toBe("wire_seam_probe");
      expect(v.degraded).toBe(false);
      expect(typeof v.ts).toBe("string");
    }
  });

  it("cost_telemetry_aggregate round-trips + the async engine is awaited (envelope, not a Promise)", async () => {
    const handler = await createServer();
    const res = await call(handler, "cost_telemetry_aggregate", {
      windowHours: 1,
    });
    // If the case forgot `await`, JSON.stringify of a Promise → "{}" and
    // res.ok would be undefined. A real awaited CostAggregate has ok:true
    // plus the structured arrays + numeric totals.
    expect(res.ok).toBe(true);
    if (res.ok) {
      const v = res.value as Record<string, unknown>;
      expect(Array.isArray(v.byTentacle)).toBe(true);
      expect(Array.isArray(v.byTaskClass)).toBe(true);
      expect(typeof v.totalCalls).toBe("number");
      expect(typeof v.totalCostUSD).toBe("number");
      expect(v.windowHours).toBe(1);
    }
  });

  it("cost_telemetry_aggregate with a non-positive window is rejected at the schema gate", async () => {
    const handler = await createServer();
    const res = await call(handler, "cost_telemetry_aggregate", {
      windowHours: -5,
    });
    const blob = JSON.stringify(res).toLowerCase();
    expect(blob).toMatch(/valid|error|positive|invalid/);
    expect(blob).not.toContain("not_implemented");
  });
});
