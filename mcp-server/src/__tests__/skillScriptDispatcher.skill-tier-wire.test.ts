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
