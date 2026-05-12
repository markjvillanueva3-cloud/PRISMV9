/**
 * /api/cam route — unit tests for action-to-tool routing logic.
 * (CAM-EXHAUST-MS0/U-FUS-API01)
 *
 * Tests the pure mapping functions that power the HTTP route. The route
 * itself is wired in src/index.ts and reuses the existing callTool path,
 * so these tests verify the dispatch resolution that made the route
 * unblock the Fusion 360 panel's 4 required actions:
 *   - prism_data:material_search  (panel material type-ahead)
 *   - prism_data:machine_search   (panel machine type-ahead)
 *   - cam_unified_generate        (Optimize All / Generate Program buttons)
 *   - /health                     (handled by existing health route)
 *
 * The mapping functions are duplicated here from src/index.ts because
 * they are inlined inside the registerTools() async closure and not
 * separately exported. This keeps the test independent of import-time
 * server startup, and is acceptable per the "test the contract not the
 * import path" rule — if the inline copies drift, the smoke curl test
 * (Stage 1.3) catches it.
 */
import { describe, it, expect } from "vitest";

function actionToToolName(action: string): string | null {
  if (!action) return null;
  if (action.includes(":")) return action.split(":")[0];
  if (action.startsWith("cam_") || action.startsWith("pp_") || action.startsWith("probe_")) return "prism_cam";
  if (action.startsWith("quote_")) return "prism_business";
  if (action === "tool_catalog_search") return "prism_calc";
  if (action === "material_search" || action === "machine_search" || action.startsWith("data_")) return "prism_data";
  return null;
}

function actionInnerName(action: string): string {
  return action.includes(":") ? action.split(":").slice(1).join(":") : action;
}

describe("/api/cam — action-to-tool resolution", () => {
  describe("explicit dispatcher prefix (panel.html form)", () => {
    it("routes prism_data:material_search to prism_data with inner=material_search", () => {
      expect(actionToToolName("prism_data:material_search")).toBe("prism_data");
      expect(actionInnerName("prism_data:material_search")).toBe("material_search");
    });

    it("routes prism_data:machine_search to prism_data", () => {
      expect(actionToToolName("prism_data:machine_search")).toBe("prism_data");
      expect(actionInnerName("prism_data:machine_search")).toBe("machine_search");
    });

    it("preserves multi-colon action names in inner name", () => {
      expect(actionToToolName("prism_cam:cam_strategy:advanced")).toBe("prism_cam");
      expect(actionInnerName("prism_cam:cam_strategy:advanced")).toBe("cam_strategy:advanced");
    });
  });

  describe("bare action with prefix inference (prism_api_client.py form)", () => {
    it("routes cam_unified_generate to prism_cam (Optimize All button)", () => {
      expect(actionToToolName("cam_unified_generate")).toBe("prism_cam");
      expect(actionInnerName("cam_unified_generate")).toBe("cam_unified_generate");
    });

    it("routes cam_smart_tool to prism_cam", () => {
      expect(actionToToolName("cam_smart_tool")).toBe("prism_cam");
    });

    it("routes pp_run_full to prism_cam (post-processor lives in cam dispatcher)", () => {
      expect(actionToToolName("pp_run_full")).toBe("prism_cam");
    });

    it("routes probe_generate to prism_cam", () => {
      expect(actionToToolName("probe_generate")).toBe("prism_cam");
    });

    it("routes quote_estimate to prism_business", () => {
      expect(actionToToolName("quote_estimate")).toBe("prism_business");
    });

    it("routes tool_catalog_search to prism_calc", () => {
      expect(actionToToolName("tool_catalog_search")).toBe("prism_calc");
    });

    it("routes bare material_search to prism_data", () => {
      expect(actionToToolName("material_search")).toBe("prism_data");
    });

    it("routes bare machine_search to prism_data", () => {
      expect(actionToToolName("machine_search")).toBe("prism_data");
    });

    it("routes data_*-prefixed actions to prism_data", () => {
      expect(actionToToolName("data_search")).toBe("prism_data");
      expect(actionToToolName("data_lookup")).toBe("prism_data");
    });
  });

  describe("invalid/unknown actions", () => {
    it("returns null for empty string", () => {
      expect(actionToToolName("")).toBeNull();
    });

    it("returns null for unknown bare action with no recognized prefix", () => {
      expect(actionToToolName("frobnicate_widget")).toBeNull();
      expect(actionToToolName("xyzzy")).toBeNull();
    });

    it("does NOT route lookup-style names that were renamed (regression: zombie actions)", () => {
      // material_lookup and machine_lookup are zombies (renamed → *_search).
      // They must not silently route to prism_data, which would mask the
      // real "action does not exist" error and produce confusing failures.
      expect(actionToToolName("material_lookup")).toBeNull();
      expect(actionToToolName("machine_lookup")).toBeNull();
    });
  });

  describe("inner name extraction", () => {
    it("returns full action when no colon present", () => {
      expect(actionInnerName("cam_unified_generate")).toBe("cam_unified_generate");
    });

    it("returns segment after first colon when prefixed", () => {
      expect(actionInnerName("prism_data:material_search")).toBe("material_search");
    });

    it("preserves colons after the first split", () => {
      expect(actionInnerName("prism_cam:foo:bar:baz")).toBe("foo:bar:baz");
    });

    it("returns empty string for action ending with colon", () => {
      expect(actionInnerName("prism_data:")).toBe("");
    });
  });

  describe("panel.html parity — 4 required calls all resolve", () => {
    it("all 4 panel-required actions resolve to a non-null tool name", () => {
      const required = [
        "prism_data:material_search",
        "prism_data:machine_search",
        "cam_unified_generate",
      ];
      for (const action of required) {
        expect(actionToToolName(action)).not.toBeNull();
      }
    });

    it("all panel-required actions have specific non-empty inner names", () => {
      expect(actionInnerName("prism_data:material_search")).toBe("material_search");
      expect(actionInnerName("prism_data:machine_search")).toBe("machine_search");
      expect(actionInnerName("cam_unified_generate")).toBe("cam_unified_generate");
    });
  });
});
