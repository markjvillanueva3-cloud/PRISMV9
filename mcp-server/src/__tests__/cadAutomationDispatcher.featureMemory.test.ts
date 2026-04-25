/**
 * cadAutomationDispatcher.featureMemory.test.ts — U-CADC28 dispatcher E2E
 *
 * Drives the four `feature_memory_*` actions through the real
 * `prism_cad_automation` dispatcher (no engine-singleton shortcut). Verifies
 * action-enum membership, schema rejection on bad input, record→query→lookup
 * round-trip, and global stats rollup.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env["PRISM_CAD_MOCK"] = "1";

import {
  registerCadAutomationDispatcher,
  CAD_AUTOMATION_ACTIONS,
} from "../tools/dispatchers/cadAutomationDispatcher.js";
import { cadFeatureMemoryEngine } from "../engines/CADFeatureMemoryEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(
      name: string,
      description: string,
      schema: unknown,
      handler: CapturedTool["handler"],
    ) {
      tools.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(action: string, params: Record<string, unknown> = {}) {
  // Dispatcher returns either an MCP envelope { content: [...] } for normal
  // results, or a direct dispatcherError envelope { success: false, error, ... }
  // when validateActionParams rejects input before the case switch runs.
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && Array.isArray((res as { content?: unknown[] }).content)) {
    const arr = (res as { content: Array<{ text?: string }> }).content;
    const text = arr[0]?.text ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadAutomationDispatcher(server as unknown as Parameters<typeof registerCadAutomationDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad_automation");
  if (!tool) throw new Error("prism_cad_automation tool was not registered");
  handler = tool.handler;
});

beforeEach(async () => {
  // Repoint the singleton at a fresh temp file per test so dispatcher routes
  // to a clean slate; reset() drops in-memory state too.
  const tmp = join(
    tmpdir(),
    `cadFeatureMemory_disp_${Date.now()}_${Math.random().toString(36).slice(2)}.json`,
  );
  cadFeatureMemoryEngine.setMemoryPath(tmp);
  cadFeatureMemoryEngine.reset();
  await fs.rm(tmp, { force: true });
});

describe("cadAutomationDispatcher — U-CADC28 feature memory wiring", () => {
  it("exposes the 4 feature_memory_* actions in CAD_AUTOMATION_ACTIONS", () => {
    const actions = CAD_AUTOMATION_ACTIONS as readonly string[];
    expect(actions).toContain("feature_memory_record");
    expect(actions).toContain("feature_memory_query");
    expect(actions).toContain("feature_memory_lookup");
    expect(actions).toContain("feature_memory_stats");
  });

  it("records via the dispatcher and returns the canonical entry shape", async () => {
    const out = await invoke("feature_memory_record", {
      feature_type: "extrude",
      parameters: { depth: 10, draft: 0 },
      outcome: "success",
      gen_time_ms: 12,
      persist: false,
    });
    expect(out["feature_type"]).toBe("extrude");
    expect(out["success_count"]).toBe(1);
    expect(out["failure_count"]).toBe(0);
    expect(out["total_attempts"]).toBe(1);
    expect(out["success_rate"]).toBe(1);
    expect(typeof out["id"]).toBe("string");
    expect((out["id"] as string).startsWith("extrude:")).toBe(true);
  });

  it("query returns the just-recorded entry with similarity ≈ 1", async () => {
    await invoke("feature_memory_record", {
      feature_type: "fillet",
      parameters: { radius: 3 },
      outcome: "success",
      gen_time_ms: 5,
      persist: false,
    });
    const result = await invoke("feature_memory_query", {
      feature_type: "fillet",
      parameters: { radius: 3 },
      topK: 5,
    });
    expect(result["count"]).toBe(1);
    const matches = result["matches"] as Array<Record<string, unknown>>;
    expect(matches[0]["feature_type"]).toBe("fillet");
    expect(matches[0]["similarity"] as number).toBeGreaterThan(0.99);
    expect(matches[0]["success_rate"]).toBe(1);
  });

  it("lookup by id round-trips through the dispatcher", async () => {
    const recorded = await invoke("feature_memory_record", {
      feature_type: "hole",
      parameters: { diameter: 6, depth: 12 },
      outcome: "success",
      gen_time_ms: 8,
      persist: false,
    });
    const id = recorded["id"] as string;
    const lookup = await invoke("feature_memory_lookup", { id });
    expect(lookup["found"]).toBe(true);
    const entry = lookup["entry"] as Record<string, unknown>;
    expect(entry["id"]).toBe(id);
    expect(entry["feature_type"]).toBe("hole");
  });

  it("lookup returns found=false for unknown id", async () => {
    const out = await invoke("feature_memory_lookup", { id: "nope:00000000" });
    expect(out["found"]).toBe(false);
    // engine returns entry=null; slimResponse strips null fields, so on the
    // wire the property is absent rather than explicitly null.
    expect(out).not.toHaveProperty("entry");
  });

  it("stats reflects all recorded attempts globally", async () => {
    await invoke("feature_memory_record", {
      feature_type: "extrude",
      parameters: { depth: 1 },
      outcome: "success",
      gen_time_ms: 1,
      persist: false,
    });
    await invoke("feature_memory_record", {
      feature_type: "extrude",
      parameters: { depth: 2 },
      outcome: "failure",
      gen_time_ms: 1,
      persist: false,
      error_pattern: "boom",
    });
    await invoke("feature_memory_record", {
      feature_type: "fillet",
      parameters: { radius: 1 },
      outcome: "success",
      gen_time_ms: 1,
      persist: false,
    });
    const stats = await invoke("feature_memory_stats", {});
    expect(stats["total_entries"]).toBe(3);
    expect(stats["total_attempts"]).toBe(3);
    expect(stats["global_success_rate"] as number).toBeCloseTo(2 / 3, 6);
    const byType = stats["by_feature_type"] as Array<Record<string, unknown>>;
    const extrude = byType.find((b) => b["feature_type"] === "extrude");
    expect(extrude).not.toBe(undefined);
    expect((extrude as Record<string, unknown>)["entry_count"]).toBe(2);
  });

  it("dispatcher schema rejects record() with NaN parameters", async () => {
    const out = await invoke("feature_memory_record", {
      feature_type: "extrude",
      parameters: { depth: NaN },
      outcome: "success",
      gen_time_ms: 1,
      persist: false,
    });
    // The dispatcher returns an error envelope (success=false) when
    // validateActionParams rejects input. Both shapes are acceptable;
    // we only require that no successful record came back.
    expect(out["success_count"]).toBe(undefined);
    const hasError =
      out["success"] === false ||
      typeof out["error"] === "string" ||
      typeof out["errorMessage"] === "string";
    expect(hasError).toBe(true);
  });

  it("dispatcher schema rejects record() with empty feature_type", async () => {
    const out = await invoke("feature_memory_record", {
      feature_type: "",
      parameters: {},
      outcome: "success",
      gen_time_ms: 1,
      persist: false,
    });
    expect(out["success_count"]).toBe(undefined);
    const hasError =
      out["success"] === false ||
      typeof out["error"] === "string" ||
      typeof out["errorMessage"] === "string";
    expect(hasError).toBe(true);
  });

  it("dispatcher persist=true writes file to disk and survives a re-load via stats", async () => {
    const tmp = join(
      tmpdir(),
      `cadFeatureMemory_persist_${Date.now()}_${Math.random().toString(36).slice(2)}.json`,
    );
    cadFeatureMemoryEngine.setMemoryPath(tmp);
    cadFeatureMemoryEngine.reset();

    await invoke("feature_memory_record", {
      feature_type: "loft",
      parameters: { sections: 4 },
      outcome: "success",
      gen_time_ms: 7,
      persist: true,
    });

    // File now exists on disk; dropping in-memory state and loading via stats
    // must rehydrate the entry.
    cadFeatureMemoryEngine.reset();
    const stats = await invoke("feature_memory_stats", {});
    expect(stats["total_entries"]).toBe(1);
    expect(stats["global_success_rate"]).toBe(1);

    await fs.rm(tmp, { force: true });
  });
});
