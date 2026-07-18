/**
 * IntelligenceAmplificationDispatch wiring test — WIRE-INTAMP-MS0/U-WIRE-INTAMP
 *
 * Behavioral test asserting the engine is wired into prism_intelligence via the
 * 3 dispatcher actions (ia_amplify, ia_get_source, ia_list_sources). Verifies:
 *   - dispatcher adapter routes actions to the correct engine method
 *   - schema rejects malformed input
 *   - real value assertions: known sources resolve, query-relevance scoring
 *     promotes the right source for keyword queries, depth multiplier behaves,
 *     includeAssetTypes filter restricts the result set
 *   - unknown actions and missing required params fail loud
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  intelligenceAmplificationDispatch,
  intelligenceAmplificationEngine,
} from "../engines/IntelligenceAmplificationEngine.js";
import { ACTION_INTELLIGENCE_SCHEMAS } from "../schemas/intelligenceActionSchemas.js";

type SchemaMap = Record<
  string,
  { safeParse: (x: unknown) => { success: boolean } }
>;

describe("IntelligenceAmplificationDispatch (WIRE-INTAMP-MS0)", () => {
  beforeEach(() => {
    intelligenceAmplificationEngine.reset();
  });

  describe("schema registration", () => {
    it("registers ia_amplify schema in ACTION_INTELLIGENCE_SCHEMAS", () => {
      const schemas = ACTION_INTELLIGENCE_SCHEMAS as SchemaMap;
      // Schema must be a real Zod schema (callable safeParse), not a placeholder.
      expect(typeof schemas.ia_amplify?.safeParse).toBe("function");
      expect(typeof schemas.ia_get_source?.safeParse).toBe("function");
      expect(typeof schemas.ia_list_sources?.safeParse).toBe("function");
    });

    it("ia_amplify schema rejects empty query", () => {
      const schemas = ACTION_INTELLIGENCE_SCHEMAS as SchemaMap;
      const parsed = schemas.ia_amplify.safeParse({ query: "" });
      expect(parsed.success).toBe(false);
    });

    it("ia_amplify schema accepts well-formed payload", () => {
      const schemas = ACTION_INTELLIGENCE_SCHEMAS as SchemaMap;
      const parsed = schemas.ia_amplify.safeParse({
        query: "cutting force for AISI 1045",
        depth: "deep",
        includeAssetTypes: ["formula", "tribal"],
      });
      expect(parsed.success).toBe(true);
    });

    it("ia_get_source schema rejects missing id", () => {
      const schemas = ACTION_INTELLIGENCE_SCHEMAS as SchemaMap;
      const parsed = schemas.ia_get_source.safeParse({});
      expect(parsed.success).toBe(false);
    });

    it("ia_amplify schema rejects invalid depth", () => {
      const schemas = ACTION_INTELLIGENCE_SCHEMAS as SchemaMap;
      const parsed = schemas.ia_amplify.safeParse({
        query: "x",
        depth: "extremely-deep",
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("ia_amplify routing", () => {
    it("routes query through amplify() and returns AmplifiedResponse shape", async () => {
      const result = (await intelligenceAmplificationDispatch("ia_amplify", {
        query: "cutting force calculation",
      })) as {
        answer: string;
        confidence: number;
        supportingAssets: { id: string; type: string; contribution: string }[];
        amplificationLevel: number;
      };
      expect(typeof result.answer).toBe("string");
      expect(result.answer.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.supportingAssets)).toBe(true);
      expect(result.supportingAssets.length).toBeGreaterThan(0);
      expect(result.amplificationLevel).toBeGreaterThan(0);
      expect(result.amplificationLevel).toBeLessThanOrEqual(1);
    });

    it("promotes Kienzle for 'force' queries (engine scoring contract)", async () => {
      const result = (await intelligenceAmplificationDispatch("ia_amplify", {
        query: "what is the cutting force on a finishing pass",
      })) as { supportingAssets: { id: string }[] };
      expect(result.supportingAssets[0].id).toBe("kienzle");
    });

    it("promotes Taylor for 'tool' queries", async () => {
      const result = (await intelligenceAmplificationDispatch("ia_amplify", {
        query: "predict tool life under current spindle load",
      })) as { supportingAssets: { id: string }[] };
      const ids = result.supportingAssets.map((a) => a.id);
      expect(ids).toContain("taylor");
    });

    it("promotes SLD for 'stability' queries", async () => {
      const result = (await intelligenceAmplificationDispatch("ia_amplify", {
        query: "stability lobe analysis to avoid chatter",
      })) as { supportingAssets: { id: string }[] };
      const ids = result.supportingAssets.map((a) => a.id);
      expect(ids).toContain("sld");
    });

    it("depth=deep yields higher amplificationLevel than depth=shallow", async () => {
      const shallow = (await intelligenceAmplificationDispatch("ia_amplify", {
        query: "cutting parameters",
        depth: "shallow",
      })) as { amplificationLevel: number };
      const deep = (await intelligenceAmplificationDispatch("ia_amplify", {
        query: "cutting parameters",
        depth: "deep",
      })) as { amplificationLevel: number };
      expect(deep.amplificationLevel).toBeGreaterThan(shallow.amplificationLevel);
    });

    it("includeAssetTypes filter restricts sources to allowed types only", async () => {
      const result = (await intelligenceAmplificationDispatch("ia_amplify", {
        query: "tribal knowledge thin wall workholding",
        includeAssetTypes: ["tribal"],
      })) as { supportingAssets: { id: string; type: string }[] };
      expect(result.supportingAssets.length).toBeGreaterThan(0);
      for (const asset of result.supportingAssets) {
        expect(asset.type).toBe("tribal");
      }
    });

    it("rejects missing query with a fail-loud error", async () => {
      await expect(
        intelligenceAmplificationDispatch("ia_amplify", {}),
      ).rejects.toThrow(/query/);
    });

    it("rejects non-string query with a fail-loud error", async () => {
      await expect(
        intelligenceAmplificationDispatch("ia_amplify", { query: 42 }),
      ).rejects.toThrow(/query/);
    });
  });

  describe("ia_get_source routing", () => {
    it("returns the Kienzle source object for id='kienzle'", async () => {
      const src = (await intelligenceAmplificationDispatch("ia_get_source", {
        id: "kienzle",
      })) as { id: string; type: string; content: string };
      expect(src).not.toBeNull();
      expect(src.id).toBe("kienzle");
      expect(src.type).toBe("formula");
      expect(src.content).toContain("kc1");
    });

    it("returns null for an unknown source id", async () => {
      const src = await intelligenceAmplificationDispatch("ia_get_source", {
        id: "definitely-not-a-real-source",
      });
      expect(src).toBeNull();
    });

    it("rejects missing id with a fail-loud error", async () => {
      await expect(
        intelligenceAmplificationDispatch("ia_get_source", {}),
      ).rejects.toThrow(/id/);
    });
  });

  describe("ia_list_sources routing", () => {
    it("returns the full loaded source catalog (>=8 sources)", async () => {
      const sources = (await intelligenceAmplificationDispatch(
        "ia_list_sources",
        {},
      )) as { id: string; type: string }[];
      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBeGreaterThanOrEqual(8);
      const ids = sources.map((s) => s.id);
      expect(ids).toContain("kienzle");
      expect(ids).toContain("taylor");
      expect(ids).toContain("sld");
    });

    it("returns sources spanning every documented type (formula, tribal, MIT, JM Die, engine, algorithm)", async () => {
      const sources = (await intelligenceAmplificationDispatch(
        "ia_list_sources",
        {},
      )) as { type: string }[];
      const types = new Set(sources.map((s) => s.type));
      expect(types.has("formula")).toBe(true);
      expect(types.has("tribal")).toBe(true);
      expect(types.has("mit")).toBe(true);
      expect(types.has("jmdie")).toBe(true);
      expect(types.has("engine")).toBe(true);
      expect(types.has("algorithm")).toBe(true);
    });
  });

  describe("unknown action handling", () => {
    it("throws fail-loud on an unknown action name", async () => {
      await expect(
        intelligenceAmplificationDispatch("ia_definitely_not_an_action", {}),
      ).rejects.toThrow(/unknown action/);
    });
  });
});
