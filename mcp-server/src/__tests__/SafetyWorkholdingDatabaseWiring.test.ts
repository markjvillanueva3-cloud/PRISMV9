/**
 * prism_safety — query_workholding_fixtures wiring verification.
 *
 * PSN-OCTOPUS-FLEET-SYNERGY (slot:bravo, 2026-06-03 dormant-engine activation;
 * closes U-DB-BRIDGE-03). Wires the previously-UNWIRED
 * MonolithWorkholdingDatabaseEngine (fixture-type + product catalog —
 * Kurt/Schunk/Lang/Mitee-Bite) onto prism_safety via query_workholding_fixtures.
 *
 * Invokes THROUGH the dispatcher (captures the handler registered on a mock MCP
 * server) — not just the engine singleton — per CLAUDE.md comprehensive build
 * floor. Coverage: enum membership + schema-map (wiring contract), all 5 query
 * modes against REAL catalog values (full / by-id / by-category / by-product /
 * by-manufacturer), and the not-found / empty-filter failure modes.
 */
import { describe, it, expect } from "vitest";
import { registerSafetyDispatcher } from "../tools/dispatchers/safetyDispatcher.js";
import { ACTION_SAFETY_SCHEMAS } from "../schemas/safetyActionSchemas.js";

const ACTION = "query_workholding_fixtures";

function captureRegistration(): { schema: any; handler: (a: { action: string; params?: any }) => Promise<any> } {
  let schema: any = null;
  let handler: any = null;
  const server = {
    tool(_name: string, _desc: string, s: any, h: any) {
      schema = s;
      handler = h;
    },
  };
  registerSafetyDispatcher(server);
  if (!handler) throw new Error("registerSafetyDispatcher did not register a handler");
  return { schema, handler };
}

async function invoke(action: string, params: Record<string, any>): Promise<any> {
  const { handler } = captureRegistration();
  const res = await handler({ action, params });
  const text = res?.content?.[0]?.text;
  expect(typeof text).toBe("string");
  return JSON.parse(text);
}

describe("prism_safety / query_workholding_fixtures — wiring contract", () => {
  it("action is a member of the dispatcher's z.enum (registered schema)", () => {
    const { schema } = captureRegistration();
    const options: string[] = schema?.action?.options ?? [];
    expect(options).toContain(ACTION);
  });

  it("Zod schema entry exists and accepts a fixtureTypeId query", () => {
    const sch = ACTION_SAFETY_SCHEMAS[ACTION];
    expect(typeof sch?.safeParse).toBe("function");
    expect(sch.safeParse({ fixtureTypeId: "vise" }).success).toBe(true);
  });
});

describe("prism_safety / query_workholding_fixtures — catalog query modes (real data)", () => {
  it("no key → full catalog: non-empty fixtureTypes + products", async () => {
    const r = await invoke(ACTION, {});
    expect(Array.isArray(r.fixtureTypes)).toBe(true);
    expect(Array.isArray(r.products)).toBe(true);
    expect(r.fixtureTypes.length).toBeGreaterThanOrEqual(7);
    expect(r.products.length).toBeGreaterThanOrEqual(5);
    // ids are materialized onto each record
    expect(r.fixtureTypes.every((f: any) => typeof f.id === "string")).toBe(true);
  });

  it("fixtureTypeId='vise' → the Machine Vise spec (category standard)", async () => {
    const r = await invoke(ACTION, { fixtureTypeId: "vise" });
    expect(r.fixtureType.id).toBe("vise");
    expect(r.fixtureType.name).toBe("Machine Vise");
    expect(r.fixtureType.category).toBe("standard");
    expect(r.fixtureType.typicalClampingForce.max).toBeGreaterThan(r.fixtureType.typicalClampingForce.min);
  });

  it("category='turning' → only turning fixtures, including the 3-jaw chuck", async () => {
    const r = await invoke(ACTION, { category: "turning" });
    expect(r.fixtureTypes.length).toBeGreaterThanOrEqual(2);
    expect(r.fixtureTypes.every((f: any) => f.category === "turning")).toBe(true);
    expect(r.fixtureTypes.map((f: any) => f.id)).toContain("chuck_3jaw");
  });

  it("productId='kurt_dl640' → the Kurt DL640 vise product spec", async () => {
    const r = await invoke(ACTION, { productId: "kurt_dl640" });
    expect(r.product.id).toBe("kurt_dl640");
    expect(r.product.manufacturer).toBe("Kurt");
    expect(r.product.model).toBe("DL640");
    expect(r.product.clampingForce).toBe(40000);
  });

  it("manufacturer='Kurt' → both Kurt products (DL640 + AngLock)", async () => {
    const r = await invoke(ACTION, { manufacturer: "Kurt" });
    expect(r.products.length).toBeGreaterThanOrEqual(2);
    expect(r.products.every((p: any) => p.manufacturer === "Kurt")).toBe(true);
    expect(r.products.map((p: any) => p.model)).toEqual(expect.arrayContaining(["DL640", "AngLock"]));
  });
});

describe("prism_safety / query_workholding_fixtures — failure & edge modes", () => {
  it("unknown fixtureTypeId → { fixtureType: null } with an explicit error, never throws", async () => {
    const r = await invoke(ACTION, { fixtureTypeId: "does_not_exist" });
    expect(r.fixtureType).toBeNull();
    expect(String(r.error)).toMatch(/unknown fixtureTypeId/i);
  });

  it("unknown productId → { product: null } with an explicit error", async () => {
    const r = await invoke(ACTION, { productId: "no_such_product" });
    expect(r.product).toBeNull();
    expect(String(r.error)).toMatch(/unknown productId/i);
  });

  it("manufacturer with no matches → empty products array, not an exception", async () => {
    const r = await invoke(ACTION, { manufacturer: "NonexistentVendorCo" });
    expect(Array.isArray(r.products)).toBe(true);
    expect(r.products.length).toBe(0);
  });
});
