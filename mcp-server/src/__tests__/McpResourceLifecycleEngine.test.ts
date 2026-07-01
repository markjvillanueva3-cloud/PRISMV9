/** McpResourceLifecycleEngine tests — HMPI10. */
import { describe, it, expect } from "vitest";
import { McpResourceLifecycleEngine, type McpResource } from "../engines/McpResourceLifecycleEngine.js";

const T0 = "2026-05-24T13:00:00.000Z";
const T10 = "2026-05-24T13:00:10.000Z";

const mk = (over: Partial<McpResource> = {}): McpResource =>
  McpResourceLifecycleEngine.validate({
    resource_id: "r1",
    uri: "file:///x.txt",
    kind: "file",
    state: "requested",
    ...over,
  });

describe("McpResourceLifecycleEngine — happy path", () => {
  it("validate parses a minimal requested resource", () => {
    const r = mk();
    expect(r.state).toBe("requested");
    expect(r.resource_id).toBe("r1");
  });

  it("beginLoad: requested → loading", () => {
    const r = McpResourceLifecycleEngine.beginLoad(mk());
    expect(r.state).toBe("loading");
  });

  it("markReady: loading → ready with size + loaded_at", () => {
    let r = McpResourceLifecycleEngine.beginLoad(mk());
    r = McpResourceLifecycleEngine.markReady(r, 1024, T10);
    expect(r.state).toBe("ready");
    expect(r.size_bytes).toBe(1024);
    expect(r.loaded_at).toBe(T10);
  });

  it("revoke: ready → revoked", () => {
    let r = McpResourceLifecycleEngine.beginLoad(mk());
    r = McpResourceLifecycleEngine.markReady(r, 100, T10);
    r = McpResourceLifecycleEngine.revoke(r);
    expect(r.state).toBe("revoked");
  });

  it("markFailed from loading sets failure_reason", () => {
    let r = McpResourceLifecycleEngine.beginLoad(mk());
    r = McpResourceLifecycleEngine.markFailed(r, "timeout");
    expect(r.state).toBe("failed");
    expect(r.failure_reason).toBe("timeout");
  });

  it("markFailed from requested (skipped loading) is allowed", () => {
    const r = McpResourceLifecycleEngine.markFailed(mk(), "denied");
    expect(r.state).toBe("failed");
    expect(r.failure_reason).toBe("denied");
  });
});

describe("McpResourceLifecycleEngine — invalid transitions", () => {
  it("beginLoad from non-requested throws", () => {
    const r = McpResourceLifecycleEngine.beginLoad(mk());
    expect(() => McpResourceLifecycleEngine.beginLoad(r)).toThrow();
  });

  it("markReady from non-loading throws", () => {
    expect(() => McpResourceLifecycleEngine.markReady(mk(), 1, T10)).toThrow();
  });

  it("revoke from non-ready throws", () => {
    expect(() => McpResourceLifecycleEngine.revoke(mk())).toThrow();
    const loading = McpResourceLifecycleEngine.beginLoad(mk());
    expect(() => McpResourceLifecycleEngine.revoke(loading)).toThrow();
  });

  it("markFailed from ready throws (terminal)", () => {
    let r = McpResourceLifecycleEngine.beginLoad(mk());
    r = McpResourceLifecycleEngine.markReady(r, 10, T10);
    expect(() => McpResourceLifecycleEngine.markFailed(r, "x")).toThrow();
  });
});

describe("McpResourceLifecycleEngine — schema rejection", () => {
  it("rejects empty resource_id", () => {
    expect(() => McpResourceLifecycleEngine.validate({ ...mk(), resource_id: "" })).toThrow();
  });

  it("rejects unknown kind", () => {
    expect(() => McpResourceLifecycleEngine.validate({ ...mk(), kind: "weird" as never })).toThrow();
  });

  it("rejects negative size_bytes", () => {
    expect(() =>
      McpResourceLifecycleEngine.validate({ ...mk(), size_bytes: -1 }),
    ).toThrow();
  });

  it("renderResource shows state tag + id + kind", () => {
    let r = McpResourceLifecycleEngine.beginLoad(mk());
    r = McpResourceLifecycleEngine.markReady(r, 2048, T10);
    const md = McpResourceLifecycleEngine.renderResource(r);
    expect(md.includes("[MCP-RES READY]")).toBe(true);
    expect(md.includes("r1")).toBe(true);
    expect(md.includes("kind=file")).toBe(true);
    expect(md.includes("size=2048B")).toBe(true);
  });
});
