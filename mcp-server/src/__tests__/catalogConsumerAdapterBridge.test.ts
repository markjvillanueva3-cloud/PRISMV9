/**
 * catalogConsumerAdapterBridge.test.ts — U-DB-BRIDGE-CONSUMERS.
 *
 * Tests all 8 consumer categories the work order names:
 *   speedfeed / post / masterpost / mill_wizard / lathe_wizard /
 *   wedm_wizard / quoting / cadcam
 *
 * Verifies per-consumer extras + dispatcher contract + ok-flag semantics.
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-BRIDGE-CONSUMERS (slot juliett, 2026-05-25)
 */

import { describe, it, expect } from "vitest";
import { ACTION_INTELLIGENCE_SCHEMAS } from "../schemas/intelligenceActionSchemas.js";
import {
  CONSUMERS, PER_CONSUMER_MAX,
  CatalogConsumerAdapterEngine, catalogConsumerAdapter,
} from "../engines/CatalogConsumerAdapterEngine.js";

// ----------------------------------------------------------------------------
// Schema + enumeration sanity.
// ----------------------------------------------------------------------------

describe("U-DB-BRIDGE-CONSUMERS constants", () => {
  it("CONSUMERS contains exactly the 8 categories named in the work order", () => {
    const expected = ["speedfeed","post","masterpost","mill_wizard","lathe_wizard","wedm_wizard","quoting","cadcam"];
    expect([...CONSUMERS].sort()).toEqual([...expected].sort());
    expect(CONSUMERS.length).toBe(8);
  });

  it("PER_CONSUMER_MAX defines a max for every CONSUMER", () => {
    for (const c of CONSUMERS) {
      expect(typeof PER_CONSUMER_MAX[c]).toBe("number");
      expect(PER_CONSUMER_MAX[c]).toBeGreaterThanOrEqual(1);
      expect(PER_CONSUMER_MAX[c]).toBeLessThanOrEqual(50);
    }
  });

  it("singleton is an instance of the class", () => {
    expect(catalogConsumerAdapter).toBeInstanceOf(CatalogConsumerAdapterEngine);
  });
});

describe("U-DB-BRIDGE-CONSUMERS schema contract — catalog_resolve_for_consumer", () => {
  const schema = ACTION_INTELLIGENCE_SCHEMAS["catalog_resolve_for_consumer"];

  it("accepts minimal valid input for each of the 8 consumers", () => {
    for (const c of CONSUMERS) {
      const r = schema.safeParse({ consumer: c, material: "4140" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.consumer).toBe(c);
    }
  });

  it("FAILURE: rejects unknown consumer", () => {
    const r = schema.safeParse({ consumer: "kitchen_sink", material: "4140" });
    expect(r.success).toBe(false);
  });

  it("FAILURE: rejects missing material", () => {
    const r = schema.safeParse({ consumer: "quoting" });
    expect(r.success).toBe(false);
  });

  it("FAILURE: rejects empty material", () => {
    const r = schema.safeParse({ consumer: "quoting", material: "" });
    expect(r.success).toBe(false);
  });

  it("ADVERSARIAL: rejects non-string material", () => {
    const r = schema.safeParse({ consumer: "quoting", material: 42 });
    expect(r.success).toBe(false);
  });

  it("accepts machine_class for post/masterpost flows", () => {
    const r = schema.safeParse({ consumer: "masterpost", material: "4140", machine_class: "hurco_vmx30u" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.machine_class).toBe("hurco_vmx30u");
  });
});

// ----------------------------------------------------------------------------
// Per-consumer extras shape — proves all 8 wires deliver consumer-tuned data.
// ----------------------------------------------------------------------------

describe("U-DB-BRIDGE-CONSUMERS per-consumer extras shape (8-spanning)", () => {
  it("speedfeed: extras includes iso_emphasis + kc11_mpa + mc + machinability_index", async () => {
    const r = await catalogConsumerAdapter.resolve({ consumer: "speedfeed", material: "ZZZ_UNKNOWN" });
    expect(r.consumer).toBe("speedfeed");
    expect(Object.keys(r.extras).sort()).toEqual(["iso_emphasis", "kc11_mpa", "machinability_index", "mc"]);
  });

  it("post: extras includes machine_class + controller_hint", async () => {
    const r = await catalogConsumerAdapter.resolve({ consumer: "post", material: "ZZZ_UNKNOWN", machine_class: "haas_vf2" });
    expect(r.consumer).toBe("post");
    expect(r.extras.machine_class).toBe("haas_vf2");
    expect(r.extras.controller_hint).toBe("haas_ngc");
  });

  it("masterpost: controller_hint resolves hurco/okuma/mitsubishi families", async () => {
    const hurco = await catalogConsumerAdapter.resolve({ consumer: "masterpost", material: "X", machine_class: "Hurco_VMX30U" });
    const okuma = await catalogConsumerAdapter.resolve({ consumer: "masterpost", material: "X", machine_class: "Okuma_B250" });
    const mitsu = await catalogConsumerAdapter.resolve({ consumer: "masterpost", material: "X", machine_class: "Mitsubishi_MV1200R" });
    expect(hurco.extras.controller_hint).toBe("hurco_winmax");
    expect(okuma.extras.controller_hint).toBe("okuma_osp");
    expect(mitsu.extras.controller_hint).toBe("mitsubishi_meldas");
  });

  it("mill_wizard: extras.wizard_mode='mill' + default op_type='mill'", async () => {
    const r = await catalogConsumerAdapter.resolve({ consumer: "mill_wizard", material: "ZZZ_UNKNOWN" });
    expect(r.extras.wizard_mode).toBe("mill");
    expect(r.extras.op_type_default).toBe("mill");
  });

  it("lathe_wizard: extras.wizard_mode='lathe' + default op_type='turn'", async () => {
    const r = await catalogConsumerAdapter.resolve({ consumer: "lathe_wizard", material: "ZZZ_UNKNOWN" });
    expect(r.extras.wizard_mode).toBe("lathe");
    expect(r.extras.op_type_default).toBe("turn");
  });

  it("wedm_wizard: extras.wizard_mode='wedm' + default op_type='wedm'", async () => {
    const r = await catalogConsumerAdapter.resolve({ consumer: "wedm_wizard", material: "ZZZ_UNKNOWN" });
    expect(r.extras.wizard_mode).toBe("wedm");
    expect(r.extras.op_type_default).toBe("wedm");
  });

  it("quoting: extras includes coolants_count + density_g_cc + cost_per_kg", async () => {
    const r = await catalogConsumerAdapter.resolve({ consumer: "quoting", material: "ZZZ_UNKNOWN" });
    expect(r.consumer).toBe("quoting");
    expect(Object.keys(r.extras).sort()).toEqual(["coolants_count", "coolants_sample", "cost_per_kg", "density_g_cc"]);
    expect(typeof r.extras.coolants_count).toBe("number");
    expect(Array.isArray(r.extras.coolants_sample)).toBe(true);
  });

  it("cadcam: extras includes dfm_iso + gdtgeo_default_tolerance", async () => {
    const r = await catalogConsumerAdapter.resolve({ consumer: "cadcam", material: "ZZZ_UNKNOWN", iso_group: "P" });
    expect(r.consumer).toBe("cadcam");
    expect(r.extras.dfm_iso).toBe("P");
    expect(r.extras.gdtgeo_default_tolerance).toBe("medium");
  });
});

// ----------------------------------------------------------------------------
// Robustness — bad input never throws; clamping; per-consumer max enforcement.
// ----------------------------------------------------------------------------

describe("U-DB-BRIDGE-CONSUMERS robustness", () => {
  it("empty material → ok:false + warning + miss_reasons populated (no throw)", async () => {
    const r = await catalogConsumerAdapter.resolve({ consumer: "quoting", material: "" });
    expect(r.ok).toBe(false);
    expect(r.warning).toBe("material query is empty");
    expect(r.stats.miss_reasons).toContain("empty_material");
  });

  it("invalid consumer → ok:false + warning + miss_reasons populated", async () => {
    const r = await catalogConsumerAdapter.resolve({ consumer: "kitchen_sink" as any, material: "4140" });
    expect(r.ok).toBe(false);
    expect(r.warning).toContain("consumer must be one of");
    expect(r.stats.miss_reasons).toContain("invalid_consumer");
  });

  it("per-consumer default max is honored when caller omits override", async () => {
    const r = await catalogConsumerAdapter.resolve({ consumer: "post", material: "ZZZ_UNKNOWN" });
    expect(r.stats.max_per_catalog).toBe(PER_CONSUMER_MAX.post);
    expect(PER_CONSUMER_MAX.post).toBe(3);
  });

  it("caller max override 999 is clamped to MAX_PER_CATALOG_CEILING (50)", async () => {
    const r = await catalogConsumerAdapter.resolve({ consumer: "quoting", material: "ZZZ_UNKNOWN", max_per_catalog: 999 });
    expect(r.stats.max_per_catalog).toBe(50);
  });

  it("caller max override 0 is clamped to ≥1", async () => {
    const r = await catalogConsumerAdapter.resolve({ consumer: "quoting", material: "ZZZ_UNKNOWN", max_per_catalog: 0 });
    expect(r.stats.max_per_catalog).toBeGreaterThanOrEqual(1);
  });
});

// ----------------------------------------------------------------------------
// Anti-regression: ALL 6 DB-bridge actions live simultaneously on prism_intelligence.
// ----------------------------------------------------------------------------

describe("U-DB-BRIDGE-CONSUMERS wiring anti-regression", () => {
  it("ALL 5 prism_intelligence DB-bridge actions parse representative input — JULIETT-DB-BRIDGE-MS0 surface is live", () => {
    const liveBridgeActions = [
      "feature_store_query", "feature_store_put", "feature_store_stats", // U-DB-BRIDGE-05
      "catalog_unified_match",                                            // U-DB-BRIDGE-03
      "catalog_resolve_for_consumer",                                     // U-DB-BRIDGE-CONSUMERS
    ];
    const liveInputs: Record<string, any> = {
      "feature_store_query": { domain: "mill", feature_group: "g", entity_ids: ["e1"] },
      "feature_store_put": { domain: "mill", feature_group: "g", entity_id: "e1", event_ts: "2026-05-25T20:00:00.000Z", feature_values: {} },
      "feature_store_stats": {},
      "catalog_unified_match": { material: "test" },
      "catalog_resolve_for_consumer": { consumer: "quoting", material: "test" },
    };
    for (const a of liveBridgeActions) {
      const r = (ACTION_INTELLIGENCE_SCHEMAS as Record<string, any>)[a].safeParse(liveInputs[a]);
      expect(r.success).toBe(true);
    }
    expect(liveBridgeActions.length).toBe(5);
  });
});
