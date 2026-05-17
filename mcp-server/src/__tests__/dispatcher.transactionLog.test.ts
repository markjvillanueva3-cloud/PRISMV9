/**
 * dispatcher.transactionLog.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-TXNLOG dispatcher wiring.
 *
 * Drives 3 read-only TransactionLog state inspection actions through real
 * `prism_dev` (begin/record/checkpoint/rollback DEFERRED for safety review).
 *
 *   - transaction_active        → transactionLogEngine.getActiveTransaction()
 *   - transaction_is_in_tx      → transactionLogEngine.isInTransaction()
 *   - transaction_get_mutations → transactionLogEngine.getMutations(txId)
 *
 * NB: To prove getMutations round-trips end-to-end with real state, the test
 * begins/records a transaction directly on the singleton (engine-direct, not
 * through the dispatcher), then queries through the dispatcher. This proves
 * the dispatcher → engine wire works on a non-trivial path without exposing
 * the mutating actions through MCP.
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { transactionLogEngine } from "../engines/TransactionLogEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

afterEach(() => {
  // Clean up any in-flight transactions between tests so state leaks don't
  // poison the next assertion's isInTransaction check.
  if (transactionLogEngine.isInTransaction()) {
    transactionLogEngine.rollbackTransaction();
  }
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TXNLOG — Zod schemas", () => {
  it("transaction_active schema accepts {} (no params)", () => {
    const s = ACTION_DEV_SCHEMAS["transaction_active"];
    expect(s.safeParse({}).success).toBe(true);
  });

  it("transaction_is_in_tx schema accepts {} (no params)", () => {
    const s = ACTION_DEV_SCHEMAS["transaction_is_in_tx"];
    expect(s.safeParse({}).success).toBe(true);
  });

  it("transaction_get_mutations schema rejects empty (refine guard)", () => {
    const s = ACTION_DEV_SCHEMAS["transaction_get_mutations"];
    expect(s.safeParse({}).success).toBe(false);
  });

  it("transaction_get_mutations schema rejects empty strings (refine guard)", () => {
    const s = ACTION_DEV_SCHEMAS["transaction_get_mutations"];
    expect(s.safeParse({ tx_id: "", txId: "" }).success).toBe(false);
  });

  it("transaction_get_mutations schema accepts tx_id", () => {
    const s = ACTION_DEV_SCHEMAS["transaction_get_mutations"];
    expect(s.safeParse({ tx_id: "tx-abc123" }).success).toBe(true);
  });

  it("transaction_get_mutations schema accepts txId camelCase alias", () => {
    const s = ACTION_DEV_SCHEMAS["transaction_get_mutations"];
    expect(s.safeParse({ txId: "tx-abc123" }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TXNLOG — prism_dev :: transaction_is_in_tx", () => {
  it("idle engine → {in_transaction: false}", async () => {
    const r = await invokeHandler(devHandler, "transaction_is_in_tx", {});
    // slimResponse strips false-y values, so use inverse-check pattern:
    // either the field is absent (slimmed) OR it's explicitly false.
    const data = r as { in_transaction?: boolean };
    if (data.in_transaction !== undefined) {
      expect(data.in_transaction).toBe(false);
    }
    // Confirmed by engine-direct call (no wire dependency):
    expect(transactionLogEngine.isInTransaction()).toBe(false);
  });

  it("mid-transaction → {in_transaction: true}", async () => {
    transactionLogEngine.beginTransaction("test-correlation-xyz");
    const r = await invokeHandler(devHandler, "transaction_is_in_tx", {});
    const data = r as { in_transaction?: boolean };
    expect(data.in_transaction).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TXNLOG — prism_dev :: transaction_active", () => {
  it("idle engine → no active transaction (slimResponse may strip null field)", async () => {
    const r = await invokeHandler(devHandler, "transaction_active", {});
    const data = r as { transaction?: unknown; error?: string };
    // ROUTING PROOF: a failed call would set 'error' string; success path does not.
    expect("error" in data ? typeof data.error : "absent").toBe("absent");
    // slimResponse may strip null fields → use inverse-check:
    // either the field is absent (slimmed) OR it's explicitly null.
    const transactionVal = "transaction" in data ? data.transaction : null;
    expect(transactionVal).toBe(null);
    // Confirm via engine-direct (no wire dependency)
    expect(transactionLogEngine.getActiveTransaction()).toBe(null);
  });

  it("mid-transaction → returns the Transaction with our correlationId + txId", async () => {
    transactionLogEngine.beginTransaction("ROUTING-PROOF-corr-id-42");
    const r = await invokeHandler(devHandler, "transaction_active", {});
    const data = r as {
      transaction: {
        txId?: string;
        sessionId?: string;
        correlationId?: string;
        startedAt?: string;
        status?: string;
      } | null;
    };
    expect(data.transaction).not.toBe(null);
    // ROUTING PROOF: correlationId round-trips → dispatcher reached the real engine
    expect(data.transaction?.correlationId).toBe("ROUTING-PROOF-corr-id-42");
    // Transaction interface uses txId (not id) — must be a non-empty string
    expect(typeof data.transaction?.txId).toBe("string");
    expect((data.transaction?.txId ?? "").length).toBeGreaterThan(0);
    // Pending status on a freshly-started tx
    expect(data.transaction?.status).toBe("pending");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TXNLOG — prism_dev :: transaction_get_mutations", () => {
  it("missing tx_id → dispatcher returns {error, details} envelope (Zod refine guard)", async () => {
    const r = await invokeHandler(devHandler, "transaction_get_mutations", {});
    // devDispatcher returns {error: "Invalid params for...", details: <zod msg>}
    // on schema validation failure (no {success} wrapper — see devDispatcher.ts:303)
    const data = r as { error?: string; details?: string };
    expect(typeof data.error).toBe("string");
    expect(String(data.error ?? "")).toMatch(/invalid params for transaction_get_mutations/i);
    // Refine error message MUST mention the required field name
    expect(String(data.details ?? "")).toMatch(/tx_id|txId/i);
  });

  it("unknown tx_id → returns empty mutations array (engine semantic)", async () => {
    const r = await invokeHandler(devHandler, "transaction_get_mutations", {
      tx_id: "tx-does-not-exist-zzzz",
    });
    const data = r as { mutations?: unknown[] };
    // slimResponse strips empty arrays — undefined === empty here
    if (data.mutations !== undefined) {
      expect(Array.isArray(data.mutations)).toBe(true);
      expect(data.mutations.length).toBe(0);
    }
  });

  it("real tx with recorded mutations → returns the mutation list", async () => {
    const txId = transactionLogEngine.beginTransaction("test-mutations-roundtrip");
    transactionLogEngine.recordMutation(txId, {
      type: "write",
      path: "/tmp/test.txt",
      beforeHash: "sha-old",
      afterHash: "sha-new",
    });
    transactionLogEngine.recordMutation(txId, {
      type: "create",
      path: "/tmp/test2.txt",
      afterHash: "sha-fresh",
    });
    const r = await invokeHandler(devHandler, "transaction_get_mutations", { tx_id: txId });
    const data = r as { mutations?: Array<{ type?: string; target?: string }> };
    expect(Array.isArray(data.mutations)).toBe(true);
    expect((data.mutations ?? []).length).toBe(2);
    // ROUTING PROOF: engine maps {type:"write"} → file_modify, {type:"create"} → file_create
    const types = (data.mutations ?? []).map((op) => op.type);
    expect(types).toContain("file_modify");
    expect(types).toContain("file_create");
  });

  it("camelCase txId alias also works", async () => {
    const txId = transactionLogEngine.beginTransaction("test-camelcase-alias");
    transactionLogEngine.recordMutation(txId, {
      type: "write",
      path: "/tmp/a.txt",
      afterHash: "sha-a",
    });
    const r = await invokeHandler(devHandler, "transaction_get_mutations", { txId });
    const data = r as { mutations?: Array<unknown> };
    expect((data.mutations ?? []).length).toBe(1);
  });
});
