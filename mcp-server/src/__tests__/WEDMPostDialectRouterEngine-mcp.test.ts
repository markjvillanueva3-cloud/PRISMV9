/**
 * U-P2PFS13: WEDMPostDialectRouterEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_post_dialect_route and wedm_list_controllers
 */
import { describe, it, expect } from "vitest";
import { wedmPostDialectRouterEngine } from "../engines/WEDMPostDialectRouterEngine.js";

describe("WEDMPostDialectRouterEngine MCP Wiring (U-P2PFS13)", () => {
  describe("getSupportedControllers()", () => {
    it("returns array of supported controllers", () => {
      const controllers = wedmPostDialectRouterEngine.getSupportedControllers();

      expect(Array.isArray(controllers)).toBe(true);
      expect(controllers.length).toBeGreaterThan(0);
      expect(controllers).toContain("mitsubishi_fa");
      expect(controllers).toContain("sodick_aq");
      expect(controllers).toContain("makino_u");
    });
  });

  describe("route()", () => {
    it("returns WEDMPostOutput for Mitsubishi controller", () => {
      const result = wedmPostDialectRouterEngine.route({
        controller: "mitsubishi_fa",
        thickness_mm: 25,
        operations: [
          { type: "profile", pass: "rough" },
        ],
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("controller");
      expect(result).toHaveProperty("dialect_name");
      expect(result).toHaveProperty("gcode_lines");
      expect(result).toHaveProperty("gcode_text");
      expect(result.controller).toBe("mitsubishi_fa");
    });

    it("returns WEDMPostOutput for Sodick controller", () => {
      const result = wedmPostDialectRouterEngine.route({
        controller: "sodick_aq",
        thickness_mm: 30,
        operations: [
          { type: "profile", pass: "rough" },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.controller).toBe("sodick_aq");
      expect(Array.isArray(result.gcode_lines)).toBe(true);
    });

    it("returns WEDMPostOutput for Makino controller", () => {
      const result = wedmPostDialectRouterEngine.route({
        controller: "makino_u",
        thickness_mm: 20,
        operations: [
          { type: "profile", pass: "skim1" },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.controller).toBe("makino_u");
    });

    it("handles multiple operations", () => {
      const result = wedmPostDialectRouterEngine.route({
        controller: "fanuc_robocut",
        thickness_mm: 25,
        operations: [
          { type: "profile", pass: "rough" },
          { type: "profile", pass: "skim1" },
          { type: "profile", pass: "skim2" },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.operation_count).toBe(3);
    });

    it("handles empty operations", () => {
      const result = wedmPostDialectRouterEngine.route({
        controller: "agie_cut",
        thickness_mm: 25,
        operations: [],
      });

      expect(result).toHaveProperty("success");
      expect(result.operation_count).toBe(0);
    });

    it("includes dialect-specific data", () => {
      const result = wedmPostDialectRouterEngine.route({
        controller: "sodick_al",
        thickness_mm: 25,
        operations: [
          { type: "profile", pass: "rough" },
        ],
      });

      expect(result).toHaveProperty("dialect_specific");
      expect(typeof result.dialect_specific).toBe("object");
    });

    it("includes warnings when applicable", () => {
      const result = wedmPostDialectRouterEngine.route({
        controller: "mitsubishi_mv",
        thickness_mm: 25,
        operations: [
          { type: "taper", pass: "rough", taper_angle_deg: 45 },
        ],
      });

      expect(result).toHaveProperty("warnings");
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});
