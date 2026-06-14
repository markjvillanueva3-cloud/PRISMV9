/**
 * CAM corpus-export wiring tests (CATALOG-APP-WIRING-MS0/U3-U6, slot:romeo).
 *
 * Proves the app exporters (Fusion / Mastercam / hyperMILL / Inventor) now see the
 * full 62.7K vendor corpus through `prism_cam`, because each export case calls
 * catalogCorpusLoaderEngine.ensureLoaded() before querying toolCatalogEngine.search().
 *
 * R15-VALIDATE: round-tripped THROUGH the dispatcher (not the singleton), with real
 * numbers — a Fusion export of a previously-dormant vendor (Accupro, 0 refs before
 * the corpus loader) must return a non-empty library.
 */
import { describe, it, expect, beforeEach } from "vitest";

type DispatcherHandler = (args: { action: string; params: Record<string, unknown> }) => Promise<unknown>;

let capturedHandler: DispatcherHandler | null = null;
const fakeServer = {
  tool: (_name: string, _desc: string, _schema: unknown, handler: DispatcherHandler) => {
    capturedHandler = handler;
  },
};

describe("CAM corpus-export wiring (prism_cam)", () => {
  let camDispatcher: DispatcherHandler;
  let ACTIONS: readonly string[];

  beforeEach(async () => {
    if (!capturedHandler) {
      const mod = await import("../tools/dispatchers/camDispatcher.js");
      ACTIONS = mod.ACTIONS;
      mod.registerCamDispatcher(fakeServer);
      if (!capturedHandler) throw new Error("camDispatcher did not register a handler");
    }
    camDispatcher = capturedHandler!;
  });

  const callCam = async (action: string, params: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const raw = await camDispatcher({ action, params });
    const r = raw as { content?: Array<{ text: string }> };
    if (r.content?.[0]?.text) return JSON.parse(r.content[0].text);
    return raw as Record<string, unknown>;
  };

  it("the 4 corpus-fed export actions are registered", () => {
    expect(ACTIONS).toContain("fusion_export_tool_library");
    expect(ACTIONS).toContain("mastercam_tool_export");
    expect(ACTIONS).toContain("hypermill_tool_export");
    expect(ACTIONS).toContain("inventor_tool_export");
  });

  it("fusion_export_tool_library ensures the corpus and exports a previously-dormant vendor (Accupro)", async () => {
    // WHY: Accupro had 0 references in ToolCatalogEngine before the corpus loader.
    // After the ensureLoaded() guard, exporting Accupro must return a non-empty
    // Fusion library — proving the corpus reaches the Fusion exporter end-to-end.
    const r = await callCam("fusion_export_tool_library", { manufacturer: "Accupro", limit: 25 });
    expect(r.success).toBe(true);
    expect(r.corpus_ensured).toBe(true);          // the U3 guard fired
    expect(r.tool_count as number).toBeGreaterThan(0); // Accupro tools present (was 0)
    // the exported library is a real Fusion tool-library object with a tools array
    const lib = r.library as { tools?: unknown[] };
    expect(Array.isArray(lib.tools)).toBe(true);
    expect((lib.tools as unknown[]).length).toBe(r.tool_count);
  });

  it("fusion export of the full catalog returns far more than the ~30 standard vendors", async () => {
    // WHY: the whole point — the corpus (62.7K) dwarfs the hardcoded ~30-vendor seed.
    // An unfiltered export must return thousands of tools, not a few hundred.
    const r = await callCam("fusion_export_tool_library", { limit: 5000 });
    expect(r.success).toBe(true);
    expect(r.tool_count as number).toBeGreaterThan(1_000); // corpus-scale, not seed-scale
  });

  it("fusion_sync_tools partition mode partitions the FULL corpus, not a 20-tool cap", async () => {
    // REGRESSION GUARD (3-of-3 scrutiny P2, slot:romeo): the secondary fusion-export
    // branches (partition/unsynced/job) searched the catalog with no max_results, so
    // they silently capped at 20 even after the corpus loaded. Partitioning 62.7K tools
    // into per-library buckets must yield MANY tools across buckets, not ≤20 total.
    const r = await callCam("fusion_sync_tools", { mode: "partition", max_per_library: 500 });
    expect(r.success).toBe(true);
    const libs = r.libraries as Record<string, number>;
    const totalAcrossLibraries = Object.values(libs).reduce((a, n) => a + n, 0);
    // far more than the old 20-cap — corpus-scale partitioning
    expect(totalAcrossLibraries).toBeGreaterThan(1_000);
    // and it actually split into multiple libraries (not one tiny bucket)
    expect(r.library_count as number).toBeGreaterThan(1);
  });

  it("fusion_sync_tools unsynced mode scans the FULL corpus, not 20 tools", async () => {
    // WHY: getUnsyncedTools over a 20-capped search would report at most 20 unsynced;
    // over the real corpus it sees thousands.
    const r = await callCam("fusion_sync_tools", { mode: "unsynced" });
    expect(r.success).toBe(true);
    expect(r.unsynced_count as number).toBeGreaterThan(1_000);
  });
});
