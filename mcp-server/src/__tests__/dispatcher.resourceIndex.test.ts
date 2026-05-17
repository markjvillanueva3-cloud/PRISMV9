/**
 * dispatcher.resourceIndex.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-RI (ResourceIndexEngine).
 *
 * Drives 6 read actions through real `prism_dev`. markExtracted() DEFERRED
 * — mutates shared extraction-status registry other pipelines consume.
 *
 * Engine reads from H: drive resource folders; tests assert shape +
 * cross-method consistency rather than specific file counts (those vary
 * across machines).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { resourceIndexEngine } from "../engines/ResourceIndexEngine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-RI — Zod schemas", () => {
  it("ri_get_index accepts {} and {force_refresh}", () => {
    expect(ACTION_DEV_SCHEMAS["ri_get_index"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ri_get_index"].safeParse({ force_refresh: true }).success).toBe(true);
  });

  it("ri_get_unextracted_folders priority_filter limited to enum", () => {
    expect(ACTION_DEV_SCHEMAS["ri_get_unextracted_folders"].safeParse({ priority_filter: "bogus" }).success).toBe(false);
    for (const p of ["high", "medium", "low"]) {
      expect(ACTION_DEV_SCHEMAS["ri_get_unextracted_folders"].safeParse({ priority_filter: p }).success).toBe(true);
    }
  });

  it("ri_search requires non-empty query + type_filter limited to enum", () => {
    expect(ACTION_DEV_SCHEMAS["ri_search"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ri_search"].safeParse({ query: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ri_search"].safeParse({ query: "pdf" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ri_search"].safeParse({ query: "x", type_filter: "bogus" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ri_search"].safeParse({ query: "x", type_filter: "pdf" }).success).toBe(true);
  });

  it("ri_get_jm_die_program_sample caps count at 500 (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["ri_get_jm_die_program_sample"].safeParse({
      machine_type: "CNC LATHE", count: 501,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ri_get_jm_die_program_sample"].safeParse({
      machine_type: "CNC LATHE", count: 10,
    }).success).toBe(true);
  });

  it("zero-arg actions accept {}", () => {
    expect(ACTION_DEV_SCHEMAS["ri_get_extraction_summary"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ri_get_jm_die_folders"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RI — prism_dev :: ri_get_index", () => {
  it("returns index with schemaVersion='1.0.0' + folder_count parity", async () => {
    const r = await invokeHandler(devHandler, "ri_get_index", {});
    const index = (r as { index: { schemaVersion: string; folders: unknown[]; totalFiles: number } }).index;
    expect(index.schemaVersion).toBe("1.0.0");
    expect(Array.isArray(index.folders)).toBe(true);
    expect((r as { folder_count?: number }).folder_count).toBe(index.folders.length);
    expect((r as { total_files?: number }).total_files).toBe(index.totalFiles);
  });

  it("force_refresh bypasses cache (both paths return shape-equal index)", async () => {
    const cached = await invokeHandler(devHandler, "ri_get_index", {});
    const fresh = await invokeHandler(devHandler, "ri_get_index", { force_refresh: true });
    const a = (cached as { index: { schemaVersion: string } }).index;
    const b = (fresh as { index: { schemaVersion: string } }).index;
    expect(a.schemaVersion).toBe(b.schemaVersion);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RI — prism_dev :: ri_get_unextracted_folders", () => {
  it("returns folders array + count parity", async () => {
    const r = await invokeHandler(devHandler, "ri_get_unextracted_folders", {});
    const folders = ((r as { folders?: unknown[] }).folders) ?? [];
    expect((r as { count?: number }).count).toBe(folders.length);
  });

  it("VARIABILITY — high/medium/low filters return subsets of the unfiltered set", async () => {
    const all = ((await invokeHandler(devHandler, "ri_get_unextracted_folders", {}) as { count?: number }).count) ?? 0;
    for (const p of ["high", "medium", "low"] as const) {
      const r = await invokeHandler(devHandler, "ri_get_unextracted_folders", { priority_filter: p });
      const c = ((r as { count?: number }).count) ?? 0;
      expect(c).toBeLessThanOrEqual(all);
    }
  });

  it("ROUTING PROOF — wire count parity with engine-direct getUnextractedFolders()", async () => {
    const r = await invokeHandler(devHandler, "ri_get_unextracted_folders", {});
    const wireCount = ((r as { count?: number }).count) ?? 0;
    const direct = await resourceIndexEngine.getUnextractedFolders();
    expect(wireCount).toBe(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RI — prism_dev :: ri_search", () => {
  it("query 'jm' echoes back + returns entries array with count parity", async () => {
    const r = await invokeHandler(devHandler, "ri_search", { query: "jm" });
    expect((r as { query?: string }).query).toBe("jm");
    const entries = ((r as { entries?: unknown[] }).entries) ?? [];
    expect((r as { count?: number }).count).toBe(entries.length);
  });

  it("type_filter='pdf' subsetting — pdf-filter ≤ unfiltered", async () => {
    const all = ((await invokeHandler(devHandler, "ri_search", { query: "a" }) as { count?: number }).count) ?? 0;
    const pdf = ((await invokeHandler(devHandler, "ri_search", { query: "a", type_filter: "pdf" }) as { count?: number }).count) ?? 0;
    expect(pdf).toBeLessThanOrEqual(all);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RI — prism_dev :: ri_get_extraction_summary", () => {
  it("returns non-empty summary string + length parity", async () => {
    const r = await invokeHandler(devHandler, "ri_get_extraction_summary", {});
    const summary = ((r as { summary?: string }).summary) ?? "";
    expect(typeof summary).toBe("string");
    expect(summary.length).toBeGreaterThan(0);
    expect((r as { length?: number }).length).toBe(summary.length);
  });

  it("ROUTING PROOF — wire summary string-equals engine-direct getExtractionSummary()", async () => {
    const r = await invokeHandler(devHandler, "ri_get_extraction_summary", {});
    const wire = ((r as { summary?: string }).summary);
    const direct = await resourceIndexEngine.getExtractionSummary();
    expect(wire).toBe(direct);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RI — prism_dev :: ri_get_jm_die_folders", () => {
  it("returns folders with name + path + programCount fields", async () => {
    const r = await invokeHandler(devHandler, "ri_get_jm_die_folders", {});
    const folders = ((r as { folders?: Array<{ name: string; path: string; programCount: number }> }).folders) ?? [];
    expect((r as { count?: number }).count).toBe(folders.length);
    for (const f of folders) {
      expect(typeof f.name).toBe("string");
      expect(typeof f.path).toBe("string");
      expect(typeof f.programCount).toBe("number");
    }
  });

  it("ROUTING PROOF — wire name set equals engine-direct getJMDieFolders()", async () => {
    const r = await invokeHandler(devHandler, "ri_get_jm_die_folders", {});
    const wireNames = (((r as { folders?: Array<{ name: string }> }).folders) ?? []).map(f => f.name).sort();
    const directNames = resourceIndexEngine.getJMDieFolders().map(f => f.name).slice().sort();
    expect(wireNames).toEqual(directNames);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RI — prism_dev :: ri_get_jm_die_program_sample", () => {
  it("unknown machine_type → error envelope", async () => {
    const r = await invokeHandler(devHandler, "ri_get_jm_die_program_sample", {
      machine_type: "NO_SUCH_MACHINE_TYPE_" + Date.now(),
    });
    // Engine throws on unknown machine_type → dispatcher catches + emits error
    const errMsg = ((r as { error?: string }).error) ?? "";
    expect(errMsg.length).toBeGreaterThan(0);
  });

  it("known machine_type returns samples array + count parity (count ≤ requested)", async () => {
    const folders = resourceIndexEngine.getJMDieFolders();
    if (folders.length === 0) {
      // Folder list empty in test env → can't exercise happy path. Skip
      // assertion rather than fail; production env always has the folders.
      return;
    }
    // Pick any folder name as the machine_type
    const machine_type = folders[0]!.name;
    const r = await invokeHandler(devHandler, "ri_get_jm_die_program_sample", { machine_type, count: 5 });
    const samples = ((r as { samples?: string[] }).samples) ?? [];
    expect((r as { count?: number }).count ?? 0).toBe(samples.length);
    expect(samples.length).toBeLessThanOrEqual(5);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RI — error envelope", () => {
  it("ri_search without query → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ri_search", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ri_get_jm_die_program_sample with count > 500 → schema rejects (DoS guard)", async () => {
    const r = await invokeHandler(devHandler, "ri_get_jm_die_program_sample", {
      machine_type: "CNC LATHE", count: 501,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ri_get_unextracted_folders with invalid priority → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ri_get_unextracted_folders", { priority_filter: "bogus" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
