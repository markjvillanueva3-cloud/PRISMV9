import { describe, it, expect } from "vitest";
import { unwrapDispatcherEnvelope } from "../routes/dispatcher-envelope.js";

/**
 * The shared peel for prism_business's { type:"text", text:"<json>" } slimResponse.
 * These lock the exact behavior the 3 route consumers (business.ts / erp.ts /
 * hotel-portal.ts) depend on -- a change that breaks any case dead-panels a surface.
 */
describe("unwrapDispatcherEnvelope", () => {
  it("peels a { type:'text', text } envelope to its inner JSON object", () => {
    const env = { type: "text", text: JSON.stringify({ success: true, data: [{ id: "H-1" }] }) };
    const out = unwrapDispatcherEnvelope<{ success: boolean; data: unknown[] }>(env);
    expect(out.success).toBe(true);
    expect(out.data).toEqual([{ id: "H-1" }]);
    // the raw envelope keys must NOT survive
    expect((out as Record<string, unknown>).type).toBeUndefined();
    expect((out as Record<string, unknown>).text).toBeUndefined();
  });

  it("peels an envelope whose inner JSON is a bare array", () => {
    const env = { type: "text", text: JSON.stringify(["machinist", "owner"]) };
    expect(unwrapDispatcherEnvelope(env)).toEqual(["machinist", "owner"]);
  });

  it("peels an envelope whose inner JSON is a primitive", () => {
    expect(unwrapDispatcherEnvelope({ type: "text", text: "42" })).toBe(42);
    expect(unwrapDispatcherEnvelope({ type: "text", text: "true" })).toBe(true);
  });

  it("passes through an already-parsed { success, data } object unchanged", () => {
    const parsed = { success: true, data: { role: "machinist" } };
    expect(unwrapDispatcherEnvelope(parsed)).toBe(parsed);
  });

  it("passes through a bare array unchanged (not an envelope)", () => {
    const arr = [{ id: "V-001" }];
    expect(unwrapDispatcherEnvelope(arr)).toBe(arr);
  });

  it("passes through a dispatcherError { success:false, error } unchanged (so isCallToolError still catches it)", () => {
    const err = { success: false, error: "vendor_id required" };
    expect(unwrapDispatcherEnvelope(err)).toBe(err);
  });

  it("passes through a bare { error } unchanged", () => {
    const err = { error: "unknown tool" };
    expect(unwrapDispatcherEnvelope(err)).toBe(err);
  });

  it("returns the raw envelope when the inner text is malformed JSON (surfaced, not swallowed)", () => {
    const bad = { type: "text", text: "{not valid json" };
    expect(unwrapDispatcherEnvelope(bad)).toBe(bad);
  });

  it("does not peel when type is not 'text'", () => {
    const notText = { type: "image", text: "{}" };
    expect(unwrapDispatcherEnvelope(notText)).toBe(notText);
  });

  it("does not peel when text is not a string", () => {
    const noText = { type: "text", text: { nested: true } };
    expect(unwrapDispatcherEnvelope(noText)).toBe(noText);
  });

  it("passes through null / undefined / primitives unchanged", () => {
    expect(unwrapDispatcherEnvelope(null)).toBe(null);
    expect(unwrapDispatcherEnvelope(undefined)).toBe(undefined);
    expect(unwrapDispatcherEnvelope(7)).toBe(7);
    expect(unwrapDispatcherEnvelope("plain")).toBe("plain");
  });
});
