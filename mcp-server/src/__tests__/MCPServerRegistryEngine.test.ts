/**
 * MCPServerRegistryEngine tests — HMPI01.
 */
import { describe, it, expect } from "vitest";
import {
  MCPServerRegistryEngine,
  type MCPServerManifest,
} from "../engines/MCPServerRegistryEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";
const mk = (id: string, over: Partial<MCPServerManifest> = {}): MCPServerManifest => ({
  server_id: id, name: id, endpoint: "stdio://x",
  transport: "stdio", tier: "internal",
  tool_names: ["x"], oauth_required: false, added_at: ISO,
  ...over,
});

describe("MCPServerRegistryEngine.register / deregister", () => {
  it("starts empty; register adds 1", () => {
    const s = MCPServerRegistryEngine.register(MCPServerRegistryEngine.empty(), mk("s1"));
    expect(s.servers).toHaveLength(1);
    expect(s.servers[0].server_id).toBe("s1");
  });

  it("throws on duplicate server_id", () => {
    const s = MCPServerRegistryEngine.register(MCPServerRegistryEngine.empty(), mk("dup"));
    expect(() => MCPServerRegistryEngine.register(s, mk("dup"))).toThrow(/duplicate/);
  });

  it("deregister removes the named server", () => {
    let s = MCPServerRegistryEngine.empty();
    s = MCPServerRegistryEngine.register(s, mk("a"));
    s = MCPServerRegistryEngine.register(s, mk("b"));
    s = MCPServerRegistryEngine.deregister(s, "a");
    expect(s.servers.map((x) => x.server_id)).toEqual(["b"]);
  });

  it("deregister throws when server_id not found", () => {
    expect(() => MCPServerRegistryEngine.deregister(MCPServerRegistryEngine.empty(), "missing")).toThrow(/not found/);
  });
});

describe("MCPServerRegistryEngine — query surfaces", () => {
  let registry = MCPServerRegistryEngine.empty();
  registry = MCPServerRegistryEngine.register(registry, mk("vendor1", {
    tier: "vendor", transport: "http", tool_names: ["github_pr_create"], oauth_required: true,
  }));
  registry = MCPServerRegistryEngine.register(registry, mk("comm1", {
    tier: "community", transport: "stdio", tool_names: ["xlsx_parse"], oauth_required: false,
  }));
  registry = MCPServerRegistryEngine.register(registry, mk("int1", {
    tier: "internal", transport: "stdio", tool_names: ["prism_calc"], oauth_required: false,
  }));

  it("findByTool returns servers exposing a given tool", () => {
    const hits = MCPServerRegistryEngine.findByTool(registry, "github_pr_create");
    expect(hits.map((s) => s.server_id)).toEqual(["vendor1"]);
  });

  it("filterByTier filters exactly", () => {
    const vendors = MCPServerRegistryEngine.filterByTier(registry, "vendor");
    expect(vendors.map((s) => s.server_id)).toEqual(["vendor1"]);
  });

  it("filterByTransport filters exactly", () => {
    const stdios = MCPServerRegistryEngine.filterByTransport(registry, "stdio");
    expect(stdios.map((s) => s.server_id).sort()).toEqual(["comm1", "int1"]);
  });

  it("findOAuthGated returns only oauth_required=true servers", () => {
    const oauth = MCPServerRegistryEngine.findOAuthGated(registry);
    expect(oauth.map((s) => s.server_id)).toEqual(["vendor1"]);
  });

  it("renderState shows all servers with tier+transport+oauth", () => {
    const md = MCPServerRegistryEngine.renderState(registry);
    expect(md.includes("[MCP-SERVERS] 3 registered")).toBe(true);
    expect(md.includes("vendor1")).toBe(true);
    expect(md.includes("[vendor/http]")).toBe(true);
    expect(md.includes("oauth=true")).toBe(true);
  });
});

describe("MCPServerRegistryEngine — validation", () => {
  it("renders empty banner", () => {
    expect(MCPServerRegistryEngine.renderState(MCPServerRegistryEngine.empty())).toBe("[MCP-SERVERS] (empty)");
  });

  it("rejects unknown transport (zod adversarial)", () => {
    expect(() => MCPServerRegistryEngine.register(MCPServerRegistryEngine.empty(), {
      ...mk("x"), transport: "carrier-pigeon" as never,
    })).toThrow();
  });

  it("rejects unknown tier (zod adversarial)", () => {
    expect(() => MCPServerRegistryEngine.register(MCPServerRegistryEngine.empty(), {
      ...mk("x"), tier: "yolo" as never,
    })).toThrow();
  });
});
