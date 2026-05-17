/**
 * dispatcher.memorySync.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-MEMSYNC dispatcher wiring.
 *
 * Drives 2 read-only bundle-inspection actions through the real `prism_memory`:
 *   - memory_sync_list_bundles      → MemorySyncEngine.listBundles
 *   - memory_sync_bundle_metadata   → MemorySyncEngine.bundleMetadata
 *
 * Verifies (a) Zod schema rejects empty/missing inputs and (b) calls reach the
 * engine and produce real shapes (bundles array + count, metadata|null).
 *
 * The heavy export/import actions are NOT wired here — they touch Qdrant + write
 * sizable filesystem artifacts. Defer to a follow-up unit (U-WIRE-MEMSYNC-FULL).
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { registerMemoryDispatcher } from "../tools/dispatchers/memoryDispatcher.js";
import { ACTION_MEMORY_SCHEMAS } from "../schemas/memoryActionSchemas.js";

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

let memoryHandler: CapturedTool["handler"];
let tempBundlesDir: string;

beforeAll(() => {
  const srv = makeStubServer();
  registerMemoryDispatcher(srv as unknown as Parameters<typeof registerMemoryDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_memory");
  if (!t) throw new Error("prism_memory not registered");
  memoryHandler = t.handler;

  // Create a real temp dir for listBundles to scan (engine reads real fs)
  tempBundlesDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-memsync-test-"));
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MEMSYNC — Zod schema gates", () => {
  it("memory_sync_list_bundles schema rejects missing dir", () => {
    const s = ACTION_MEMORY_SCHEMAS["memory_sync_list_bundles"];
    expect(s.safeParse({}).success).toBe(false);
  });

  it("memory_sync_list_bundles schema rejects empty dir string", () => {
    const s = ACTION_MEMORY_SCHEMAS["memory_sync_list_bundles"];
    expect(s.safeParse({ dir: "" }).success).toBe(false);
  });

  it("memory_sync_list_bundles schema accepts a valid dir string", () => {
    const s = ACTION_MEMORY_SCHEMAS["memory_sync_list_bundles"];
    const r = s.safeParse({ dir: "/tmp/some/dir" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as { dir: string }).dir).toBe("/tmp/some/dir");
    }
  });

  it("memory_sync_bundle_metadata schema rejects empty object (refine guard)", () => {
    const s = ACTION_MEMORY_SCHEMAS["memory_sync_bundle_metadata"];
    expect(s.safeParse({}).success).toBe(false);
  });

  it("memory_sync_bundle_metadata schema rejects both keys empty (refine guard)", () => {
    const s = ACTION_MEMORY_SCHEMAS["memory_sync_bundle_metadata"];
    expect(s.safeParse({ src_path: "", srcPath: "" }).success).toBe(false);
  });

  it("memory_sync_bundle_metadata schema accepts src_path", () => {
    const s = ACTION_MEMORY_SCHEMAS["memory_sync_bundle_metadata"];
    const r = s.safeParse({ src_path: "/tmp/bundle.json" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as { src_path: string }).src_path).toBe("/tmp/bundle.json");
    }
  });

  it("memory_sync_bundle_metadata schema accepts srcPath (camelCase alias)", () => {
    const s = ACTION_MEMORY_SCHEMAS["memory_sync_bundle_metadata"];
    const r = s.safeParse({ srcPath: "/tmp/bundle.json" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as { srcPath: string }).srcPath).toBe("/tmp/bundle.json");
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MEMSYNC — prism_memory :: memory_sync_list_bundles", () => {
  it("empty temp directory → returns {bundles: [], count: 0}", async () => {
    const r = await invokeHandler(memoryHandler, "memory_sync_list_bundles", {
      dir: tempBundlesDir,
    });
    // Dispatcher wraps as {bundles, count} — slimResponse may strip empty arrays
    // and zero counts, so use inverse-check on bundles and lenient count check.
    const data = r as { bundles?: unknown[]; count?: number };
    // ROUTING PROOF: A failed call returns {success:false, error, action, dispatcher}
    expect("success" in data).toBe(false);
    expect("error" in data).toBe(false);
    // bundles[] may be stripped when empty
    if (data.bundles !== undefined) {
      expect(Array.isArray(data.bundles)).toBe(true);
      expect(data.bundles.length).toBe(0);
    }
    // count may be stripped when 0 (slimResponse), but if present must be 0
    if (data.count !== undefined) {
      expect(data.count).toBe(0);
    }
  });

  it("missing dir → dispatcher returns success:false envelope", async () => {
    const r = await invokeHandler(memoryHandler, "memory_sync_list_bundles", {});
    // Schema validation fails before dispatcher runs → returns error envelope
    expect((r as { success?: boolean }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MEMSYNC — prism_memory :: memory_sync_bundle_metadata", () => {
  it("non-existent bundle path → returns {metadata: null} (engine fail-soft)", async () => {
    const phantomPath = path.join(tempBundlesDir, "does-not-exist.json");
    const r = await invokeHandler(memoryHandler, "memory_sync_bundle_metadata", {
      src_path: phantomPath,
    });
    // ROUTING PROOF: dispatcher wraps {metadata}; failed call would be {success:false,...}
    const data = r as { metadata?: unknown };
    expect("success" in data).toBe(false);
    expect("error" in data).toBe(false);
    // Engine returns null for missing file → wrapped as {metadata: null}.
    // slimResponse may strip null fields, so check both shapes are acceptable.
    if ("metadata" in data) {
      expect(data.metadata).toBe(null);
    }
  });

  it("missing src_path AND srcPath → dispatcher returns success:false envelope", async () => {
    const r = await invokeHandler(memoryHandler, "memory_sync_bundle_metadata", {});
    expect((r as { success?: boolean }).success).toBe(false);
  });
});
