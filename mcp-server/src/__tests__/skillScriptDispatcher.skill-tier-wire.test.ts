/**
 * E2E wire test for HOOK-SYNERGY-MS0 follow-up — SkillTierRegistryEngine
 * wired into `prism_skill_script` as 5 actions:
 *   skill_tier_register · skill_tier_assign · skill_tier_classify_all
 *   skill_tier_list · skill_tier_size
 *
 * Verifies (a) all 5 actions are registered in both the dispatcher enum
 * AND have a case-label in the source, (b) all 5 schemas exist in
 * ACTION_SKILL_SCRIPT_SCHEMAS, (c) Zod boundary correctly rejects bad enums
 * + missing required fields, (d) snake_case `explicit_tier` flows through
 * cleanly (the dispatcher remaps to camelCase before calling the engine).
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";

const NEW_ACTIONS = [
  "skill_tier_register",
  "skill_tier_assign",
  "skill_tier_classify_all",
  "skill_tier_list",
  "skill_tier_size",
] as const;

describe("skill-tier wire — dispatcher source registration", () => {
  it("each new action appears at least twice in skillScriptDispatcher.ts (enum + case)", async () => {
    const dispatcherPath = path.resolve(
      __dirname, "..", "tools", "dispatchers", "skillScriptDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("dispatcher uses lazy imports for SkillTierRegistryEngine (no top-level static import)", async () => {
    const dispatcherPath = path.resolve(
      __dirname, "..", "tools", "dispatchers", "skillScriptDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    // Contract: never a top-level static import of the engine — would defeat the
    // lazy-load convention and slow MCP cold start.
    expect(src).not.toMatch(/^import[^;]*SkillTierRegistryEngine/m);
    // Contract: at least one `await import(...)` for the engine somewhere in the file.
    // Allows whitespace inside the call and any quote style — survives valid refactors.
    expect(src).toMatch(/await\s+import\(\s*["'`].*SkillTierRegistryEngine\.js["'`]\s*\)/);
  });

  it("dispatcher destructures the singleton (skillTierRegistryEngine), never instantiates a new instance", async () => {
    const dispatcherPath = path.resolve(
      __dirname, "..", "tools", "dispatchers", "skillScriptDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    // Singleton pattern: `const { skillTierRegistryEngine } = await import(...)`.
    // Per-call `new SkillTierRegistryEngine()` would silently lose all registered state.
    expect(src).toMatch(/\{\s*skillTierRegistryEngine\s*\}/);
    expect(src).not.toMatch(/new\s+SkillTierRegistryEngine\s*\(/);
  });
});

describe("skill-tier wire — schema map registration", () => {
  it("registers all 5 schemas in ACTION_SKILL_SCRIPT_SCHEMAS", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const map = ACTION_SKILL_SCRIPT_SCHEMAS as Record<string, { safeParse?: unknown }>;
    for (const a of NEW_ACTIONS) {
      expect(typeof map[a]?.safeParse).toBe("function");
    }
  });
});

describe("skill-tier wire — Zod validation: skill_tier_register", () => {
  it("accepts the minimal valid registration (command + description + triggers)", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_register"]!.safeParse({
      command: "/example",
      description: "example skill",
      triggers: ["example"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects when triggers is not an array", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_register"]!.safeParse({
      command: "/example",
      description: "example",
      triggers: "not-an-array",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid explicit_tier enum value", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_register"]!.safeParse({
      command: "/example",
      description: "example",
      triggers: [],
      explicit_tier: "expert",
    });
    expect(r.success).toBe(false);
  });

  it("accepts the three valid explicit_tier enum values", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    for (const tier of ["essential", "intermediate", "advanced"] as const) {
      const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_register"]!.safeParse({
        command: "/example",
        description: "example",
        triggers: [],
        explicit_tier: tier,
      });
      expect(r.success).toBe(true);
    }
  });

  it("dispatcher source remaps snake_case explicit_tier → camelCase explicitTier before calling the engine", async () => {
    const dispatcherPath = path.resolve(
      __dirname, "..", "tools", "dispatchers", "skillScriptDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    // The skill_tier_register case must read params.explicit_tier (canonical
    // dispatcher contract) and forward as explicitTier to the engine.
    expect(src).toMatch(/params\.explicit_tier/);
    expect(src).toMatch(/explicitTier:\s*params\.explicit_tier/);
  });

  it("rejects a negative invocation_count", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_register"]!.safeParse({
      command: "/example",
      description: "example",
      triggers: [],
      invocation_count: -1,
    });
    expect(r.success).toBe(false);
  });

  it("accepts invocation_count of 0", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_register"]!.safeParse({
      command: "/example",
      description: "example",
      triggers: [],
      invocation_count: 0,
    });
    expect(r.success).toBe(true);
  });

  it("rejects when command is missing", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_register"]!.safeParse({
      description: "example",
      triggers: [],
    });
    expect(r.success).toBe(false);
  });

  it("rejects when description is missing", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_register"]!.safeParse({
      command: "/example",
      triggers: [],
    });
    expect(r.success).toBe(false);
  });

  it("rejects when triggers is missing", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_register"]!.safeParse({
      command: "/example",
      description: "example",
    });
    expect(r.success).toBe(false);
  });
});

describe("skill-tier wire — Zod validation: skill_tier_assign", () => {
  it("accepts a valid assign request", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_assign"]!.safeParse({ command: "/example" });
    expect(r.success).toBe(true);
  });

  it("rejects assign with missing command", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_assign"]!.safeParse({});
    expect(r.success).toBe(false);
  });
});

describe("skill-tier wire — Zod validation: skill_tier_list", () => {
  it("accepts each valid tier enum value", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    for (const tier of ["essential", "intermediate", "advanced"] as const) {
      const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_list"]!.safeParse({ tier });
      expect(r.success).toBe(true);
    }
  });

  it("rejects an unknown tier name", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_list"]!.safeParse({ tier: "wizard" });
    expect(r.success).toBe(false);
  });

  it("rejects missing tier", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_list"]!.safeParse({});
    expect(r.success).toBe(false);
  });
});

describe("skill-tier wire — Zod validation: empty-payload actions", () => {
  it("accepts skill_tier_classify_all with no params", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_classify_all"]!.safeParse({});
    expect(r.success).toBe(true);
  });

  it("accepts skill_tier_size with no params", async () => {
    const { ACTION_SKILL_SCRIPT_SCHEMAS } = await import("../schemas/skillScriptActionSchemas.js");
    const r = ACTION_SKILL_SCRIPT_SCHEMAS["skill_tier_size"]!.safeParse({});
    expect(r.success).toBe(true);
  });
});

// ── In-process dispatcher round-trip ────────────────────────────────────────
// Drive the actual `registerSkillScriptDispatcher` registration through a mock
// MCP server that captures the handler closure, then call the handler with
// every action and parse the JSON response. This proves the 5 skill_tier_*
// cases route to the live singleton, validate Zod schemas, remap snake_case
// to camelCase, and return the documented response shapes.

type MockTool = {
  name: string;
  description: string;
  paramSchema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: { type: string; text: string }[];
  }>;
};

async function buildHandler(): Promise<MockTool["handler"]> {
  const captured: MockTool[] = [];
  const fakeServer = {
    tool(name: string, description: string, paramSchema: unknown, handler: MockTool["handler"]) {
      captured.push({ name, description, paramSchema, handler });
    },
  };
  const { registerSkillScriptDispatcher } = await import("../tools/dispatchers/skillScriptDispatcher.js");
  registerSkillScriptDispatcher(fakeServer as unknown as Parameters<typeof registerSkillScriptDispatcher>[0]);
  const tool = captured.find((t) => t.name === "prism_skill_script");
  if (!tool) throw new Error("prism_skill_script not registered by dispatcher");
  return tool.handler;
}

function parseResponse(out: unknown): Record<string, unknown> {
  // Success path: dispatcher returns the MCP content envelope `{content:[{type,text}]}`.
  // Error path: `dispatcherError(...)` returns a raw `{success:false,error,action,dispatcher,...}`
  // object, NOT wrapped in `content[]`. Handle both shapes so error round-trips
  // are observable from the test.
  if (out !== null && typeof out === "object") {
    const o = out as Record<string, unknown>;
    if (Array.isArray(o.content)) {
      const text = (o.content as { type: string; text: string }[])[0]?.text;
      if (typeof text === "string") return JSON.parse(text) as Record<string, unknown>;
    }
    return o;
  }
  throw new Error("unexpected response shape");
}

describe("skill-tier wire — in-process dispatcher round-trip", () => {
  it("skill_tier_register routes to the live engine and returns the canonical record + size", async () => {
    const handler = await buildHandler();
    const { skillTierRegistryEngine } = await import("../engines/SkillTierRegistryEngine.js");
    skillTierRegistryEngine.clear();
    const before = skillTierRegistryEngine.size();
    const out = await handler({
      action: "skill_tier_register",
      params: {
        command: "/roundtrip-dedup",
        description: "round-trip smoke",
        triggers: ["dedup"],
      },
    });
    const body = parseResponse(out);
    expect(body.success).toBe(true);
    expect(body.size).toBe(before + 1);
    expect(skillTierRegistryEngine.size()).toBe(before + 1);
    const reg = body.registered as { command: string; triggers: string[] };
    expect(reg.command).toBe("/roundtrip-dedup");
    expect(reg.triggers).toEqual(["dedup"]);
    skillTierRegistryEngine.clear();
  });

  it("skill_tier_register honors snake_case explicit_tier and remaps to camelCase explicitTier", async () => {
    const handler = await buildHandler();
    const { skillTierRegistryEngine } = await import("../engines/SkillTierRegistryEngine.js");
    skillTierRegistryEngine.clear();
    // Without explicit_tier, "/zzz-xenon" would land in advanced.
    // With explicit_tier="essential", the dispatcher must forward it so the engine
    // returns essential — proves the snake→camel remap happens in-flight.
    await handler({
      action: "skill_tier_register",
      params: {
        command: "/zzz-xenon",
        description: "explicit tier round-trip",
        triggers: ["xenon"],
        explicit_tier: "essential",
      },
    });
    const out = await handler({
      action: "skill_tier_assign",
      params: { command: "/zzz-xenon" },
    });
    const body = parseResponse(out);
    expect(body.success).toBe(true);
    const assignment = body.assignment as { tier: string; reason: string };
    expect(assignment.tier).toBe("essential");
    expect(assignment.reason).toBe("explicit tier set on registration");
    skillTierRegistryEngine.clear();
  });

  it("skill_tier_assign returns a TierAssignment for a registered command", async () => {
    const handler = await buildHandler();
    const { skillTierRegistryEngine } = await import("../engines/SkillTierRegistryEngine.js");
    skillTierRegistryEngine.clear();
    await handler({
      action: "skill_tier_register",
      params: { command: "/dedup-x", description: "x", triggers: [] },
    });
    const out = await handler({
      action: "skill_tier_assign",
      params: { command: "/dedup-x" },
    });
    const body = parseResponse(out);
    expect(body.success).toBe(true);
    const a = body.assignment as { command: string; tier: string };
    expect(a.command).toBe("/dedup-x");
    expect(a.tier).toBe("essential");
    skillTierRegistryEngine.clear();
  });

  it("skill_tier_classify_all returns total + per-tier counts + sorted assignments", async () => {
    const handler = await buildHandler();
    const { skillTierRegistryEngine } = await import("../engines/SkillTierRegistryEngine.js");
    skillTierRegistryEngine.clear();
    for (const cmd of ["/dedup-a", "/lathe-a", "/zzz-a"]) {
      await handler({
        action: "skill_tier_register",
        params: { command: cmd, description: cmd, triggers: [] },
      });
    }
    const out = await handler({ action: "skill_tier_classify_all", params: {} });
    const body = parseResponse(out);
    expect(body.success).toBe(true);
    expect(body.total).toBe(3);
    const byTier = body.byTier as Record<string, number>;
    expect(byTier.essential).toBe(1);
    expect(byTier.intermediate).toBe(1);
    expect(byTier.advanced).toBe(1);
    skillTierRegistryEngine.clear();
  });

  it("skill_tier_list returns only the requested tier with a matching count", async () => {
    const handler = await buildHandler();
    const { skillTierRegistryEngine } = await import("../engines/SkillTierRegistryEngine.js");
    skillTierRegistryEngine.clear();
    for (const cmd of ["/dedup-fast", "/dedup-slow", "/lathe-z"]) {
      await handler({
        action: "skill_tier_register",
        params: { command: cmd, description: cmd, triggers: [] },
      });
    }
    const out = await handler({
      action: "skill_tier_list",
      params: { tier: "essential" },
    });
    const body = parseResponse(out);
    expect(body.success).toBe(true);
    expect(body.tier).toBe("essential");
    expect(body.count).toBe(2);
    const list = body.list as { command: string }[];
    expect(list.map((l) => l.command).sort()).toEqual(["/dedup-fast", "/dedup-slow"]);
    skillTierRegistryEngine.clear();
  });

  it("skill_tier_size returns the live engine's current size", async () => {
    const handler = await buildHandler();
    const { skillTierRegistryEngine } = await import("../engines/SkillTierRegistryEngine.js");
    skillTierRegistryEngine.clear();
    expect(skillTierRegistryEngine.size()).toBe(0);
    await handler({
      action: "skill_tier_register",
      params: { command: "/size-probe", description: "x", triggers: [] },
    });
    const out = await handler({ action: "skill_tier_size", params: {} });
    const body = parseResponse(out);
    expect(body.success).toBe(true);
    expect(body.size).toBe(1);
    skillTierRegistryEngine.clear();
  });

  it("dispatcher rejects invalid params via Zod before reaching the engine (negative invocation_count)", async () => {
    const handler = await buildHandler();
    const { skillTierRegistryEngine } = await import("../engines/SkillTierRegistryEngine.js");
    skillTierRegistryEngine.clear();
    const before = skillTierRegistryEngine.size();
    const out = await handler({
      action: "skill_tier_register",
      params: {
        command: "/bad",
        description: "x",
        triggers: [],
        invocation_count: -42,
      },
    });
    const body = parseResponse(out);
    // dispatcherError returns a non-success envelope; engine must not be touched.
    expect(skillTierRegistryEngine.size()).toBe(before);
    expect(body.success === true).toBe(false);
    skillTierRegistryEngine.clear();
  });

  it("dispatcher surfaces the engine's 'unknown skill' error for an unregistered command", async () => {
    const handler = await buildHandler();
    const { skillTierRegistryEngine } = await import("../engines/SkillTierRegistryEngine.js");
    skillTierRegistryEngine.clear();
    const out = await handler({
      action: "skill_tier_assign",
      params: { command: "/ghost-command" },
    });
    const body = parseResponse(out);
    // dispatcherError catches the throw and wraps it; the contract is non-success.
    expect(body.success === true).toBe(false);
    const blob = JSON.stringify(body);
    expect(blob.toLowerCase().includes("unknown")).toBe(true);
  });
});
