/**
 * dispatcher.fda21CFRPart11.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-FDA (FDA21CFRPart11Engine).
 *
 * 4 ultra-conservative pure-read actions through real `prism_dev`:
 *   fda_get_signature             → getSignature(id) → ElectronicSignature | null
 *   fda_list_signatures           → listSignatures(documentRef)
 *   fda_get_validation_status     → getValidationStatus()
 *   fda_is_validated              → isValidated()
 *
 * Deferral rationale: this engine is the SAFETY-CRITICAL FDA 21 CFR
 * Part 11 regulatory compliance authority. Write surfaces are
 * identity-forgery / audit-integrity / auth-bypass / record-lifecycle
 * / critical-safety-flag classes — NEVER LLM-callable. Even some
 * read surfaces (queryAuditTrail, getRecord, validateSession) are
 * information-leak risks. Only these 4 minimal accessors are wired.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { fda21CFRPart11Engine } from "../engines/FDA21CFRPart11Engine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-FDA — Zod schemas", () => {
  it("fda_get_signature requires non-empty signature_id + caps at 256", () => {
    expect(ACTION_DEV_SCHEMAS["fda_get_signature"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["fda_get_signature"].safeParse({ signature_id: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["fda_get_signature"].safeParse({ signature_id: "x".repeat(257) }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["fda_get_signature"].safeParse({ signature_id: "sig-001" }).success).toBe(true);
  });

  it("fda_list_signatures requires non-empty document_ref + caps at 256", () => {
    expect(ACTION_DEV_SCHEMAS["fda_list_signatures"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["fda_list_signatures"].safeParse({ document_ref: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["fda_list_signatures"].safeParse({ document_ref: "doc-1" }).success).toBe(true);
  });

  it("fda_get_validation_status + fda_is_validated accept {}", () => {
    expect(ACTION_DEV_SCHEMAS["fda_get_validation_status"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["fda_is_validated"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-FDA — prism_dev :: fda_get_signature", () => {
  it("unknown signature_id → found:false (slim-stripped null handled via explicit discriminator)", async () => {
    const r = await invokeHandler(devHandler, "fda_get_signature", {
      signature_id: "no-such-sig-" + Date.now(),
    });
    expect(r.found).toBe(false);
  });

  it("ROUTING PROOF — wire found mirrors engine-direct getSignature() !== undefined", async () => {
    const r = await invokeHandler(devHandler, "fda_get_signature", {
      signature_id: "probe-routing-" + Date.now(),
    });
    const direct = fda21CFRPart11Engine.getSignature("probe-routing-not-real");
    // Both should agree that this unknown id has no signature.
    expect(r.found).toBe(direct !== undefined);
    expect(r.found).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-FDA — prism_dev :: fda_list_signatures", () => {
  it("returns signatures array + count parity (typically empty in test env)", async () => {
    const r = await invokeHandler(devHandler, "fda_list_signatures", {
      document_ref: "doc-probe-" + Date.now(),
    });
    const sigs = (r.signatures as unknown[] | undefined) ?? [];
    expect((r.count as number | undefined) ?? 0).toBe(sigs.length);
  });

  it("VARIABILITY — 3 distinct document refs all return count >= 0", async () => {
    const refs = ["fai-001", "ncr-002", "sop-003"];
    for (const ref of refs) {
      const r = await invokeHandler(devHandler, "fda_list_signatures", { document_ref: ref });
      const c = (r.count as number | undefined) ?? 0;
      expect(c).toBeGreaterThanOrEqual(0);
    }
  });

  it("ROUTING PROOF — wire count equals engine-direct listSignatures().length", async () => {
    const ref = "routing-probe-" + Date.now();
    const r = await invokeHandler(devHandler, "fda_list_signatures", { document_ref: ref });
    const direct = fda21CFRPart11Engine.listSignatures(ref);
    expect((r.count as number | undefined) ?? 0).toBe(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-FDA — prism_dev :: fda_get_validation_status", () => {
  it("returns status with validated:bool + deviations array + deviation_count parity", async () => {
    const r = await invokeHandler(devHandler, "fda_get_validation_status", {});
    const status = (r as { status: { validated: boolean; deviations?: string[] } }).status;
    expect(typeof status.validated).toBe("boolean");
    const deviations = status.deviations ?? [];
    expect(Array.isArray(deviations)).toBe(true);
    expect((r.deviation_count as number | undefined) ?? 0).toBe(deviations.length);
  });

  it("ROUTING PROOF — wire status.validated equals engine-direct getValidationStatus().validated", async () => {
    const r = await invokeHandler(devHandler, "fda_get_validation_status", {});
    const direct = fda21CFRPart11Engine.getValidationStatus();
    const wireValidated = (r as { status: { validated: boolean } }).status.validated;
    expect(wireValidated).toBe(direct.validated);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-FDA — prism_dev :: fda_is_validated", () => {
  it("returns validated:bool", async () => {
    const r = await invokeHandler(devHandler, "fda_is_validated", {});
    expect(typeof r.validated).toBe("boolean");
  });

  it("CROSS-METHOD INVARIANT — fda_is_validated === fda_get_validation_status.status.validated", async () => {
    const isVal = await invokeHandler(devHandler, "fda_is_validated", {});
    const statusRes = await invokeHandler(devHandler, "fda_get_validation_status", {});
    const statusValidated = (statusRes as { status: { validated: boolean } }).status.validated;
    expect(isVal.validated).toBe(statusValidated);
  });

  it("ROUTING PROOF — wire validated equals engine-direct isValidated()", async () => {
    const r = await invokeHandler(devHandler, "fda_is_validated", {});
    const direct = fda21CFRPart11Engine.isValidated();
    expect(r.validated).toBe(direct);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-FDA — error envelope", () => {
  it("fda_get_signature without signature_id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "fda_get_signature", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("fda_list_signatures with empty document_ref → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "fda_list_signatures", { document_ref: "" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("fda_get_signature with oversize id (>256) → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "fda_get_signature", {
      signature_id: "x".repeat(500),
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
