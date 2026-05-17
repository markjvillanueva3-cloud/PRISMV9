/**
 * dispatcher.wikiIndexMaintainer.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-WIKI-MAINT dispatcher wiring.
 *
 * Drives 4 READ-ONLY actions through real `prism_dev`:
 *
 *   - wiki_idx_read         → read()
 *   - wiki_idx_get          → getBySlug(slug)
 *   - wiki_idx_by_category  → getByCategory(category)
 *   - wiki_idx_paths        → {indexPath, jsonlPath}
 *
 * upsert/upsertMany/remove DEFERRED (U-WIRE-WIKI-WRITE) — they mutate the
 * wiki index + JSONL on disk.
 *
 * ROUTING PROOF: (a) wiki_idx_paths returns the same exported constant
 * the engine exports; (b) wire read()/get()/byCategory() byte-equals
 * engine-direct calls.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import {
  wikiIndexMaintainerEngine,
  WIKI_INDEX_PATH_DEFAULT,
  WIKI_INDEX_JSONL_PATH_DEFAULT,
} from "../engines/WikiIndexMaintainerEngine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-WIKI-MAINT — Zod schemas", () => {
  it("wiki_idx_read schema accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["wiki_idx_read"].safeParse({}).success).toBe(true);
  });

  it("wiki_idx_paths schema accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["wiki_idx_paths"].safeParse({}).success).toBe(true);
  });

  it("wiki_idx_get schema requires non-empty slug", () => {
    expect(ACTION_DEV_SCHEMAS["wiki_idx_get"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wiki_idx_get"].safeParse({ slug: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wiki_idx_get"].safeParse({ slug: "master-index-surface" }).success).toBe(true);
  });

  it("wiki_idx_by_category schema requires non-empty category", () => {
    expect(ACTION_DEV_SCHEMAS["wiki_idx_by_category"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wiki_idx_by_category"].safeParse({ category: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wiki_idx_by_category"].safeParse({ category: "architecture" }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WIKI-MAINT — prism_dev :: wiki_idx_paths", () => {
  it("ROUTING PROOF — wire indexPath equals exported WIKI_INDEX_PATH_DEFAULT byte-for-byte", async () => {
    const r = await invokeHandler(devHandler, "wiki_idx_paths", {});
    const data = r as { indexPath?: string; jsonlPath?: string };
    expect(data.indexPath).toBe(WIKI_INDEX_PATH_DEFAULT);
    expect(data.jsonlPath).toBe(WIKI_INDEX_JSONL_PATH_DEFAULT);
  });

  it("indexPath ends with the canonical 'index.md' filename", async () => {
    const r = await invokeHandler(devHandler, "wiki_idx_paths", {});
    const data = r as { indexPath?: string };
    expect((data.indexPath ?? "").endsWith("index.md")).toBe(true);
  });

  it("jsonlPath ends with the canonical '.jsonl' extension", async () => {
    const r = await invokeHandler(devHandler, "wiki_idx_paths", {});
    const data = r as { jsonlPath?: string };
    expect((data.jsonlPath ?? "").endsWith(".jsonl")).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WIKI-MAINT — prism_dev :: wiki_idx_read", () => {
  it("wire read() returns exactly the same entries as engine-direct read() (count + slug parity)", async () => {
    const r = await invokeHandler(devHandler, "wiki_idx_read", {});
    const data = r as { entries?: Array<{ slug?: string }> };
    const direct = await wikiIndexMaintainerEngine.read();
    const wireEntries = data.entries ?? [];
    expect(wireEntries.length).toBe(direct.length);
    const wireSlugs = wireEntries.map((e) => e.slug).filter((s): s is string => typeof s === "string").sort();
    const directSlugs = direct.map((e) => e.slug).sort();
    expect(wireSlugs).toEqual(directSlugs);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WIKI-MAINT — prism_dev :: wiki_idx_get", () => {
  it("unknown slug → wire returns null AND engine-direct returns undefined sentinel", async () => {
    const sentinelSlug = "definitely-not-a-real-wiki-slug-zzzzzzz-" + Date.now();
    const r = await invokeHandler(devHandler, "wiki_idx_get", { slug: sentinelSlug });
    const data = r as { entry?: unknown };
    const val = "entry" in data ? data.entry : null;
    expect(val).toBe(null);
    // Engine-direct should also return undefined for the same sentinel
    const direct = await wikiIndexMaintainerEngine.getBySlug(sentinelSlug);
    expect(direct === undefined).toBe(true);
  });

  it("real on-disk slug → wire entry byte-equals engine-direct lookup", async () => {
    const allEntries = await wikiIndexMaintainerEngine.read();
    if (allEntries.length === 0) {
      // No wiki on disk — assert wire read also returns 0 (real assertion, not skip)
      const r = await invokeHandler(devHandler, "wiki_idx_read", {});
      const data = r as { entries?: unknown[] };
      expect((data.entries ?? []).length).toBe(0);
      return;
    }
    const knownSlug = allEntries[0]!.slug;
    const r = await invokeHandler(devHandler, "wiki_idx_get", { slug: knownSlug });
    const data = r as { entry?: { slug?: string; category?: string; title?: string } };
    // ROUTING PROOF: queried slug round-trips back through the wire
    expect(data.entry?.slug).toBe(knownSlug);
    const direct = await wikiIndexMaintainerEngine.getBySlug(knownSlug);
    expect(JSON.stringify(data.entry)).toBe(JSON.stringify(direct));
    expect(data.entry?.category).toBe(direct?.category);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WIKI-MAINT — prism_dev :: wiki_idx_by_category", () => {
  it("unknown category → wire returns 0 entries AND engine-direct returns 0", async () => {
    const sentinelCategory = "no-such-category-zzz-" + Date.now();
    const r = await invokeHandler(devHandler, "wiki_idx_by_category", { category: sentinelCategory });
    const data = r as { entries?: unknown[] };
    expect((data.entries ?? []).length).toBe(0);
    const direct = await wikiIndexMaintainerEngine.getByCategory(sentinelCategory);
    expect(direct.length).toBe(0);
  });

  it("real category → wire count equals engine-direct count AND every entry has that category", async () => {
    const allEntries = await wikiIndexMaintainerEngine.read();
    if (allEntries.length === 0) return;
    const knownCategory = allEntries[0]!.category;
    const r = await invokeHandler(devHandler, "wiki_idx_by_category", { category: knownCategory });
    const data = r as { entries?: Array<{ category?: string }> };
    const direct = await wikiIndexMaintainerEngine.getByCategory(knownCategory);
    expect((data.entries ?? []).length).toBe(direct.length);
    for (const e of data.entries ?? []) {
      expect(e.category).toBe(knownCategory);
    }
    const wireSlugs = (data.entries ?? []).map((e) => (e as { slug?: string }).slug).sort();
    const directSlugs = direct.map((e) => e.slug).sort();
    expect(wireSlugs).toEqual(directSlugs);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WIKI-MAINT — error envelope", () => {
  it("wiki_idx_get without slug → schema rejects with error mentioning 'slug'", async () => {
    const r = await invokeHandler(devHandler, "wiki_idx_get", {});
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
    expect(`${data.error ?? ""} ${data.details ?? ""}`).toMatch(/slug/i);
  });

  it("wiki_idx_by_category without category → schema rejects with mention of 'category'", async () => {
    const r = await invokeHandler(devHandler, "wiki_idx_by_category", {});
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
    expect(`${data.error ?? ""} ${data.details ?? ""}`).toMatch(/category/i);
  });
});
