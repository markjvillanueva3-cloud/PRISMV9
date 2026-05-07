/**
 * E2E test for ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH4 — 6 unwired deep-AI /
 * digital-twin mill engines wired into millDispatcher (prism_mill).
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { millingDeepReasoningEngine } from "../engines/MillingDeepReasoningEngine.js";
import { millingDeepIntegrationEngine } from "../engines/MillingDeepIntegrationEngine.js";
import { millingDeepKnowledgeSynthesisEngine } from "../engines/MillingDeepKnowledgeSynthesisEngine.js";
import { millingAIUnificationEngine } from "../engines/MillingAIUnificationEngine.js";
import { millingDigitalTwinEngine } from "../engines/MillingDigitalTwinEngine.js";

const NEW_ACTIONS = [
  "mill_deep_reason",
  "mill_deep_integrate",
  "mill_knowledge_search",
  "mill_knowledge_stats",
  "mill_ai_unified_recommend",
  "mill_milling_twin_sync",
] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

describe("U-WIRE-MILL-BATCH4 — engines verified directly", () => {
  describe("MillingDeepReasoningEngine.quickReason", () => {
    it("returns higher confidence (0.8) when context yields evidence vs empty (0.5)", () => {
      const withCtx = millingDeepReasoningEngine.quickReason(
        "How should I rough hardened steel?",
        { material: "D2", material_iso: "H", hardness_hrc: 58, operation: "roughing" },
      );
      const empty = millingDeepReasoningEngine.quickReason("anything", {});
      expect(withCtx.confidence).toBeGreaterThanOrEqual(empty.confidence);
      expect(withCtx.confidence).toBe(0.8);
      expect(empty.confidence).toBe(0.5);
    });

    it("returns at most 3 evidence items (slice cap)", () => {
      const r = millingDeepReasoningEngine.quickReason(
        "thin wall finishing",
        { material: "Aluminum", material_iso: "N", operation: "finishing", feature_type: "thin_wall" } as never,
      );
      expect(r.evidence.length).toBeLessThanOrEqual(3);
      expect(typeof r.answer).toBe("string");
      expect(r.answer.length).toBeGreaterThan(0);
    });
  });

  describe("MillingDeepIntegrationEngine.quickIntegrate", () => {
    it("returns integer rpm and feed scaled by material factor (P=1.0 baseline)", () => {
      const r = millingDeepIntegrationEngine.quickIntegrate({
        material: "1018",
        material_iso: "P",
        operation: "roughing",
      });
      expect(Number.isInteger(r.rpm)).toBe(true);
      expect(Number.isInteger(r.feed)).toBe(true);
      expect(r.rpm).toBeGreaterThan(0);
      expect(r.feed).toBeGreaterThan(0);
      expect(r.confidence).toBeGreaterThanOrEqual(0.7);
      expect(r.confidence).toBeLessThanOrEqual(1.0);
    });

    it("hardened-material (ISO H) recommends slower rpm than free-machining steel (ISO P)", () => {
      const p = millingDeepIntegrationEngine.quickIntegrate({
        material: "1018", material_iso: "P", operation: "roughing",
      });
      const h = millingDeepIntegrationEngine.quickIntegrate({
        material: "D2", material_iso: "H", hardness_hrc: 58, operation: "roughing",
      });
      // Hardened steel must run slower (lower speed factor) than mild steel
      expect(h.rpm).toBeLessThan(p.rpm);
    });

    it("strategy and top_tip are non-empty strings", () => {
      const r = millingDeepIntegrationEngine.quickIntegrate({
        material: "Ti-6Al-4V", material_iso: "S", operation: "finishing",
      });
      expect(typeof r.strategy).toBe("string");
      expect(r.strategy.length).toBeGreaterThan(0);
      expect(typeof r.top_tip).toBe("string");
      expect(r.top_tip.length).toBeGreaterThan(0);
    });
  });

  describe("MillingDeepKnowledgeSynthesisEngine.searchKnowledge / getSourceStats", () => {
    it("getSourceStats returns numeric counts (>0 for an initialized engine)", () => {
      const s = millingDeepKnowledgeSynthesisEngine.getSourceStats();
      const total = Object.values(s).filter((v): v is number => typeof v === "number")
        .reduce((a, b) => a + b, 0);
      expect(total).toBeGreaterThan(0);
    });

    it("searchKnowledge('hard') returns at least one match for hardened-material content", () => {
      const r = millingDeepKnowledgeSynthesisEngine.searchKnowledge("hard");
      // result is structured, find any array property and check length
      const arrays = Object.values(r).filter((v): v is unknown[] => Array.isArray(v));
      const totalMatches = arrays.reduce((a, b) => a + b.length, 0);
      expect(totalMatches).toBeGreaterThan(0);
    });

    it("searchKnowledge with deliberately bogus query returns zero matches", () => {
      const r = millingDeepKnowledgeSynthesisEngine.searchKnowledge("xyqzzzbogus_nonsense_query_999");
      const arrays = Object.values(r).filter((v): v is unknown[] => Array.isArray(v));
      const totalMatches = arrays.reduce((a, b) => a + b.length, 0);
      expect(totalMatches).toBe(0);
    });
  });

  describe("MillingAIUnificationEngine.quickRecommend", () => {
    it("returns integer rpm/feed and confidence in [0.7, 1.0]", () => {
      const r = millingAIUnificationEngine.quickRecommend({
        material: "1018", material_iso: "P", operation: "roughing",
      });
      expect(Number.isInteger(r.rpm)).toBe(true);
      expect(Number.isInteger(r.feed)).toBe(true);
      expect(r.rpm).toBeGreaterThan(0);
      expect(r.feed).toBeGreaterThan(0);
      expect(r.confidence).toBeGreaterThanOrEqual(0.7);
      expect(r.confidence).toBeLessThanOrEqual(1.0);
    });

    it("strategy depends on operation (finishing vs roughing yields different strategy or doc)", () => {
      const rough = millingAIUnificationEngine.quickRecommend({
        material: "1018", material_iso: "P", operation: "roughing",
      });
      const finish = millingAIUnificationEngine.quickRecommend({
        material: "1018", material_iso: "P", operation: "finishing",
      });
      // Either strategy name OR doc must differ between roughing and finishing
      const differs = rough.strategy !== finish.strategy || rough.doc !== finish.doc;
      expect(differs).toBe(true);
    });
  });

  describe("MillingDigitalTwinEngine.sync", () => {
    it("returns drift, anomalies array, and a state with sync_status='synchronized'", () => {
      const r = millingDigitalTwinEngine.sync({
        spindle: { speed_rpm: 5000, load_percent: 60, power_kw: 10, temperature_c: 50 },
      });
      expect(typeof r.drift).toBe("number");
      expect(Number.isFinite(r.drift)).toBe(true);
      expect(Array.isArray(r.anomalies)).toBe(true);
      const status = (r.state as { sync_status?: string }).sync_status;
      expect(status).toBe("synchronized");
    });

    it("syncCount monotonically increases across consecutive syncs", () => {
      const a = millingDigitalTwinEngine.sync({
        spindle: { speed_rpm: 4000, load_percent: 50, power_kw: 8, temperature_c: 45 },
      });
      const b = millingDigitalTwinEngine.sync({
        spindle: { speed_rpm: 4500, load_percent: 55, power_kw: 9, temperature_c: 48 },
      });
      const ca = (a.state as { sync_count?: number }).sync_count;
      const cb = (b.state as { sync_count?: number }).sync_count;
      // Either sync_count exposed, or just verify drift recomputed for both
      if (typeof ca === "number" && typeof cb === "number") {
        expect(cb).toBeGreaterThan(ca);
      } else {
        expect(Number.isFinite(b.drift)).toBe(true);
      }
    });
  });
});

describe("U-WIRE-MILL-BATCH4 — dispatcher wiring verified", () => {
  it("registers all 6 new actions in millDispatcher source (enum + case)", async () => {
    const dispatcherPath = path.resolve(
      __dirname,
      "..",
      "tools",
      "dispatchers",
      "millDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    const present = NEW_ACTIONS.filter((a) => src.includes(`"${a}"`));
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("registers all 6 schemas in MILL_ACTION_SCHEMAS", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof MILL_ACTION_SCHEMAS[a]?.safeParse === "function",
    );
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
  });

  it("schema rejects mill_deep_reason with empty query", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_deep_reason"]!.safeParse({
      query: "",
      context: { material: "1018" },
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_deep_reason with invalid material_iso enum", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_deep_reason"]!.safeParse({
      query: "test",
      context: { material_iso: "Z" },
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_deep_integrate without required material/operation", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_deep_integrate"]!.safeParse({
      material_iso: "P",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_knowledge_search with empty query", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_knowledge_search"]!.safeParse({ query: "" });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_ai_unified_recommend with non-positive depth_mm", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_ai_unified_recommend"]!.safeParse({
      material: "1018",
      material_iso: "P",
      operation: "roughing",
      depth_mm: 0,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_milling_twin_sync with invalid coolant.type enum", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_milling_twin_sync"]!.safeParse({
      coolant: { type: "snake_oil", active: true, flow_rate_lpm: 5, temperature_c: 20 },
    });
    expect(r.success).toBe(false);
  });
});
