/**
 * CAMAutopopSchemaEngine.test.ts
 *
 * Tests the canonical-schema + 6-CAM mapping bridge engine.
 *
 * Coverage: CAM-AUTOPOP-CORE-MS0 (Phase 2 of L2-CAMX-EXHAUST roadmap).
 *
 * @see src/engines/CAMAutopopSchemaEngine.ts
 * @see data/cam-autopop/canonical-schemas.json
 * @see data/cam-autopop/cam-mapping-rules.json
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CAMAutopopSchemaEngine,
  type AutopopCAM,
  type AutopopEntity,
} from "../engines/CAMAutopopSchemaEngine.js";

const ENTITIES: readonly AutopopEntity[] = [
  "TOOL",
  "HOLDER",
  "FIXTURE",
  "MACHINE",
  "CAD_PART",
];
const CAMS: readonly AutopopCAM[] = [
  "fusion360",
  "hypermill",
  "mastercam",
  "inventor_hsm",
  "esprit",
  "solidcam",
];

describe("CAMAutopopSchemaEngine", () => {
  beforeEach(() => {
    CAMAutopopSchemaEngine.resetCachesForTesting();
  });

  describe("getCanonicalSchemaFile", () => {
    it("loads canonical-schemas.json with milestone CAM-AUTOPOP-CORE-MS0 and 5 entities", () => {
      const file = CAMAutopopSchemaEngine.getCanonicalSchemaFile();
      expect(file.schemaVersion).toBe("1.0.0");
      expect(file.metadata.milestone).toBe("CAM-AUTOPOP-CORE-MS0");
      expect(file.metadata.entityCount).toBe(5);
      expect(file.metadata.totalFieldCount).toBe(156);
      expect(Object.keys(file.entities).sort()).toEqual([
        "CAD_PART",
        "FIXTURE",
        "HOLDER",
        "MACHINE",
        "TOOL",
      ]);
    });

    it("declares 8 physics_links covering tool/holder/fixture/machine/CAD bridges", () => {
      const file = CAMAutopopSchemaEngine.getCanonicalSchemaFile();
      expect(file.metadata.physics_links.length).toBe(8);
      expect(file.metadata.physics_links).toContain("TOOL_GEOMETRY_KIENZLE_MAPPING");
      expect(file.metadata.physics_links).toContain("MACHINE_ENVELOPE_REACHABILITY");
      expect(file.metadata.physics_links).toContain("ISO13399_FIELD_NORMALIZATION");
    });
  });

  describe("listEntities", () => {
    it("returns all 5 canonical entity ids", () => {
      const entities = CAMAutopopSchemaEngine.listEntities();
      expect(entities.length).toBe(5);
      expect([...entities].sort()).toEqual([
        "CAD_PART",
        "FIXTURE",
        "HOLDER",
        "MACHINE",
        "TOOL",
      ]);
    });
  });

  describe("listCAMs", () => {
    it("returns all 6 target CAM systems with vendor + native format metadata", () => {
      const cams = CAMAutopopSchemaEngine.listCAMs();
      expect(cams.length).toBe(6);
      const ids = cams.map((c) => c.id).sort();
      expect(ids).toEqual([
        "esprit",
        "fusion360",
        "hypermill",
        "inventor_hsm",
        "mastercam",
        "solidcam",
      ]);
      const fusion = cams.find((c) => c.id === "fusion360");
      expect(fusion?.vendor).toBe("Autodesk");
      expect(fusion?.tool_format).toContain("Tool Library JSON");
      const hypermill = cams.find((c) => c.id === "hypermill");
      expect(hypermill?.vendor).toContain("OPEN MIND");
    });
  });

  describe("getCanonicalSchema", () => {
    it("TOOL has 38 fields across Identity / Type_Geometry / Material_Coating groups", () => {
      const schema = CAMAutopopSchemaEngine.getCanonicalSchema("TOOL");
      expect(schema?.fieldCount).toBe(38);
      expect(Object.keys(schema?.groups ?? {}).sort()).toEqual([
        "Identity",
        "Material_Coating",
        "Type_Geometry",
      ]);
      const idFields = schema?.groups.Identity?.fields.map((f) => f.name) ?? [];
      expect(idFields).toContain("tool_id");
      expect(idFields).toContain("vendor_brand");
      expect(idFields).toContain("iso13399_ref");
    });

    it("MACHINE has 36 fields with kinematics + envelope + spindle + magazine + post groups", () => {
      const schema = CAMAutopopSchemaEngine.getCanonicalSchema("MACHINE");
      expect(schema?.fieldCount).toBe(36);
      const groupNames = Object.keys(schema?.groups ?? {});
      expect(groupNames).toContain("Kinematics");
      expect(groupNames).toContain("Envelope");
      expect(groupNames).toContain("Spindle");
      expect(groupNames).toContain("Magazine");
      expect(groupNames).toContain("Post");
    });

    it("CAD_PART exposes mass-properties + GD&T extracted groups", () => {
      const schema = CAMAutopopSchemaEngine.getCanonicalSchema("CAD_PART");
      expect(schema?.fieldCount).toBe(28);
      const groupNames = Object.keys(schema?.groups ?? {});
      expect(groupNames).toContain("Mass_Properties");
      expect(groupNames).toContain("GDT_Extracted");
      const massFields = schema?.groups.Mass_Properties?.fields.map((f) => f.name) ?? [];
      expect(massFields).toContain("volume_mm3");
      expect(massFields).toContain("mass_kg");
      expect(massFields).toContain("centroid_xyz_mm");
    });

    it("returns null for unknown entity id (no throw)", () => {
      const schema = CAMAutopopSchemaEngine.getCanonicalSchema("UNKNOWN_ENTITY");
      expect(schema).toBeNull();
    });

    it("is case-insensitive on entity id (lowercase input → schema)", () => {
      const lower = CAMAutopopSchemaEngine.getCanonicalSchema("tool");
      const upper = CAMAutopopSchemaEngine.getCanonicalSchema("TOOL");
      expect(lower?.fieldCount).toBe(38);
      expect(lower?.fieldCount).toBe(upper?.fieldCount);
    });
  });

  describe("getMappingRule", () => {
    it("TOOL × hypermill is lossless (zero lossy fields, multi-layer coatings supported)", () => {
      const rule = CAMAutopopSchemaEngine.getMappingRule("TOOL", "hypermill");
      expect(rule).not.toBeNull();
      expect(rule?.native_format).toBe("vtl_htl_xml");
      expect(rule?.lossy_fields.length).toBe(0);
      expect(rule?.field_map.coating_layers).toContain("Coatings/Coating[]");
      expect(rule?.field_map.diameter_mm).toBe("Geometry/Diameter");
    });

    it("TOOL × fusion360 uses Autodesk Fusion JSON schema (geometry.DC for diameter)", () => {
      const rule = CAMAutopopSchemaEngine.getMappingRule("TOOL", "fusion360");
      expect(rule?.native_format).toBe("fusion_tool_library_json");
      expect(rule?.field_map.diameter_mm).toBe("geometry.DC");
      expect(rule?.field_map.length_overall_mm).toBe("geometry.OAL");
      expect(rule?.field_map.flute_count).toBe("geometry.NOF");
      expect(rule?.lossy_fields.length).toBeGreaterThan(0);
    });

    it("TOOL × inventor_hsm shares Fusion's Autodesk schema (identical key fields)", () => {
      const fusion = CAMAutopopSchemaEngine.getMappingRule("TOOL", "fusion360");
      const inventor = CAMAutopopSchemaEngine.getMappingRule("TOOL", "inventor_hsm");
      expect(inventor?.field_map.diameter_mm).toBe(fusion?.field_map.diameter_mm);
      expect(inventor?.field_map.length_overall_mm).toBe(fusion?.field_map.length_overall_mm);
      expect(inventor?.quirks.some((q) => q.toLowerCase().includes("autodesk"))).toBe(true);
    });

    it("MACHINE × hypermill is the most complete (zero lossy fields, RTCP variant explicit)", () => {
      const rule = CAMAutopopSchemaEngine.getMappingRule("MACHINE", "hypermill");
      expect(rule?.native_format).toBe("hypermill_mcf_xml");
      expect(rule?.lossy_fields.length).toBe(0);
      expect(rule?.field_map.rtcp_variant).toBe("Kinematics/RTCPVariant");
      expect(rule?.field_map.spindle_max_torque_Nm).toBe("Spindle/MaxTorque");
    });

    it("FIXTURE × fusion360 declares 9 lossy fields (no fixture library, perf fields lost)", () => {
      const rule = CAMAutopopSchemaEngine.getMappingRule("FIXTURE", "fusion360");
      expect(rule?.lossy_fields.length).toBe(9);
      expect(rule?.lossy_fields.some((f) => f.startsWith("clamp_force_N"))).toBe(true);
      expect(rule?.quirks.some((q) => q.includes("no first-class fixture library"))).toBe(true);
    });

    it("CAD_PART × solidcam delegates to host CAD (SW/Inventor)", () => {
      const rule = CAMAutopopSchemaEngine.getMappingRule("CAD_PART", "solidcam");
      expect(rule?.native_root.toLowerCase()).toContain("solidworks");
      expect(rule?.field_map.bbox_x_mm).toBe("HostCAD.BBox.X");
      expect(rule?.quirks.some((q) => q.toLowerCase().includes("host cad"))).toBe(true);
    });

    it("returns null for unknown entity (TOOLZ × fusion360)", () => {
      const rule = CAMAutopopSchemaEngine.getMappingRule("TOOLZ", "fusion360");
      expect(rule).toBeNull();
    });

    it("returns null for unknown CAM (TOOL × someothercam)", () => {
      const rule = CAMAutopopSchemaEngine.getMappingRule("TOOL", "someothercam");
      expect(rule).toBeNull();
    });
  });

  describe("listMappingRulesForEntity (cross-CAM diff)", () => {
    it("TOOL has rules for all 6 CAMs", () => {
      const list = CAMAutopopSchemaEngine.listMappingRulesForEntity("TOOL");
      expect(list?.length).toBe(6);
      const cams = list?.map((r) => r.cam).sort();
      expect(cams).toEqual([
        "esprit",
        "fusion360",
        "hypermill",
        "inventor_hsm",
        "mastercam",
        "solidcam",
      ]);
    });

    it("MACHINE has rules for all 6 CAMs (with hypermill being lossless)", () => {
      const list = CAMAutopopSchemaEngine.listMappingRulesForEntity("MACHINE");
      expect(list?.length).toBe(6);
      const hyper = list?.find((r) => r.cam === "hypermill");
      expect(hyper?.rule.lossy_fields.length).toBe(0);
    });

    it("returns null for unknown entity", () => {
      const list = CAMAutopopSchemaEngine.listMappingRulesForEntity("BOGUS");
      expect(list).toBeNull();
    });
  });

  describe("coverage matrix: every entity × every CAM has a rule", () => {
    it("5 entities × 6 CAMs = 30 mapping rules registered", () => {
      let total = 0;
      for (const entity of ENTITIES) {
        for (const cam of CAMS) {
          const rule = CAMAutopopSchemaEngine.getMappingRule(entity, cam);
          expect(rule).not.toBeNull();
          expect(rule?.native_format.length).toBeGreaterThan(0);
          expect(rule?.native_root.length).toBeGreaterThan(0);
          expect(Object.keys(rule?.field_map ?? {}).length).toBeGreaterThan(0);
          total += 1;
        }
      }
      expect(total).toBe(30);
    });
  });

  describe("dispatcher round-trip: 4 cam_autopop_* actions", () => {
    interface FakeServer { tool: unknown }
    type Handler = (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;

    async function captureHandler(): Promise<Handler> {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        registerCamDispatcher: (server: FakeServer) => void;
      };
      let captured: Handler | null = null;
      const fakeServer: FakeServer = {
        tool: (_n: string, _d: string, _s: unknown, h: Handler) => {
          captured = h;
        },
      };
      mod.registerCamDispatcher(fakeServer);
      if (!captured) throw new Error("camDispatcher did not register handler");
      return captured;
    }

    function unwrap<T>(raw: unknown): T {
      const r = raw as { content?: Array<{ text: string }> };
      if (r.content?.[0]?.text) return JSON.parse(r.content[0].text) as T;
      return raw as T;
    }

    it("cam_autopop_list_entities returns 5 entity ids", async () => {
      const handler = await captureHandler();
      const raw = await handler({ action: "cam_autopop_list_entities" });
      const result = unwrap<{ success: boolean; entities: string[] }>(raw);
      expect(result.success).toBe(true);
      expect(result.entities.length).toBe(5);
      expect(result.entities).toContain("TOOL");
      expect(result.entities).toContain("MACHINE");
    });

    it("cam_autopop_list_cams returns 6 CAMs with vendor metadata", async () => {
      const handler = await captureHandler();
      const raw = await handler({ action: "cam_autopop_list_cams" });
      const result = unwrap<{ success: boolean; cams: Array<{ id: string; vendor: string }> }>(raw);
      expect(result.success).toBe(true);
      expect(result.cams.length).toBe(6);
      const fusion = result.cams.find((c) => c.id === "fusion360");
      expect(fusion?.vendor).toBe("Autodesk");
    });

    it("cam_autopop_get_canonical_schema for HOLDER returns 28-field schema", async () => {
      const handler = await captureHandler();
      const raw = await handler({
        action: "cam_autopop_get_canonical_schema",
        params: { entity: "HOLDER" },
      });
      const result = unwrap<{ success: boolean; entity: string; schema: { fieldCount: number } }>(raw);
      expect(result.success).toBe(true);
      expect(result.entity).toBe("HOLDER");
      expect(result.schema.fieldCount).toBe(28);
    });

    it("cam_autopop_get_mapping_rule for TOOL × mastercam returns ToolManager XML bridge rule", async () => {
      const handler = await captureHandler();
      const raw = await handler({
        action: "cam_autopop_get_mapping_rule",
        params: { entity: "TOOL", cam: "mastercam" },
      });
      const result = unwrap<{
        success: boolean;
        entity: string;
        cam: string;
        rule: { native_format: string; field_map: Record<string, string> };
      }>(raw);
      expect(result.success).toBe(true);
      expect(result.entity).toBe("TOOL");
      expect(result.cam).toBe("mastercam");
      expect(result.rule.native_format).toBe("tools-9_binary");
      expect(result.rule.field_map.diameter_mm).toBe("Diameter");
    });

    it("camDispatcher ACTIONS includes all 4 cam_autopop_* action names", async () => {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        ACTIONS: string[];
      };
      expect(mod.ACTIONS).toContain("cam_autopop_get_canonical_schema");
      expect(mod.ACTIONS).toContain("cam_autopop_list_entities");
      expect(mod.ACTIONS).toContain("cam_autopop_list_cams");
      expect(mod.ACTIONS).toContain("cam_autopop_get_mapping_rule");
    });
  });
});
