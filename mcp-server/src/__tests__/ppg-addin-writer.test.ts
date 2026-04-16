/**
 * PPG-REAL S6a U-PPR24: PRISM Operation Writer tests.
 * Validates: adsk.cam API usage, comment preservation, parameter names,
 * NO getGlobalParameter, NO document attributes, undo tracking.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const WRITER_PATH = path.resolve(
  __dirname,
  "../../scripts/fusion360-prism-addin/prism_operation_writer.py"
);

const writerContent = fs.readFileSync(WRITER_PATH, "utf-8");

describe("U-PPR24: PRISM Operation Writer module structure", () => {
  it("prism_operation_writer.py exists and is substantial", () => {
    expect(fs.existsSync(WRITER_PATH)).toBe(true);
    expect(writerContent.length).toBeGreaterThan(3000);
  });

  it("defines PRISMOperationWriter class", () => {
    expect(writerContent).toContain("class PRISMOperationWriter");
  });

  it("defines OperationWriteResult class", () => {
    expect(writerContent).toContain("class OperationWriteResult");
  });

  it("defines BatchWriteResult class", () => {
    expect(writerContent).toContain("class BatchWriteResult");
  });
});

describe("U-PPR24: CORRECT adsk.cam API usage", () => {
  it("uses operation.parameters.itemByName for spindle speed", () => {
    expect(writerContent).toContain("tool_spindleSpeed");
    expect(writerContent).toContain("itemByName");
    expect(writerContent).toContain(".expression");
  });

  it("uses operation.parameters.itemByName for feed rate", () => {
    expect(writerContent).toContain("tool_feedCutting");
    expect(writerContent).toContain("itemByName");
  });

  it("sets RPM via expression string (e.g., '8500 rpm')", () => {
    expect(writerContent).toContain("rpm");
    expect(writerContent).toContain('expression');
    // Check that it formats RPM as expression
    expect(writerContent).toContain("int(round(sf_result.rpm))");
  });

  it("sets feed via expression string with units", () => {
    expect(writerContent).toContain("mm/min");
    expect(writerContent).toContain("in/min");
  });

  it("defines all Fusion 360 CAM parameter name constants", () => {
    expect(writerContent).toContain('PARAM_SPINDLE_SPEED = "tool_spindleSpeed"');
    expect(writerContent).toContain('PARAM_FEED_CUTTING = "tool_feedCutting"');
    expect(writerContent).toContain('PARAM_FEED_ENTRY = "tool_feedEntry"');
    expect(writerContent).toContain('PARAM_FEED_PLUNGE = "tool_feedPlunge"');
  });
});

describe("U-PPR24: FORBIDDEN API patterns", () => {
  it("does NOT use getGlobalParameter", () => {
    const lines = writerContent.split("\n");
    for (const line of lines) {
      if (line.includes("getGlobalParameter") && !line.trim().startsWith("#")) {
        // Only allowed in comments explaining why NOT to use it
        expect(
          line.includes("does NOT") ||
            line.includes("wrong") ||
            line.includes("NOT use") ||
            line.includes("scored 32/100")
        ).toBe(true);
      }
    }
  });

  it("does NOT use design.rootComponent.attributes.add", () => {
    const lines = writerContent.split("\n");
    for (const line of lines) {
      if (
        line.includes("rootComponent.attributes") &&
        !line.trim().startsWith("#")
      ) {
        expect(
          line.includes("wrong") || line.includes("NOT") || line.includes("does not")
        ).toBe(true);
      }
    }
  });

  it("does NOT use document-level attributes", () => {
    // Active code should not contain document.attributes
    const codeLines = writerContent
      .split("\n")
      .filter((l) => !l.trim().startsWith("#") && !l.trim().startsWith('"""'));
    const usesDocAttr = codeLines.some(
      (l) => l.includes("document.attributes") || l.includes("activeDocument.attributes")
    );
    expect(usesDocAttr).toBe(false);
  });
});

describe("U-PPR24: Comment preservation", () => {
  it("preserves existing operation comments by default", () => {
    expect(writerContent).toContain("preserve_comments=True");
  });

  it("handles write_sf_to_operation with preserve_comments parameter", () => {
    const sig = writerContent.substring(
      writerContent.indexOf("def write_sf_to_operation"),
      writerContent.indexOf("def write_sf_to_operation") + 200
    );
    expect(sig).toContain("preserve_comments");
  });

  it("appends PRISM JSON to existing comment (not replaces)", () => {
    expect(writerContent).toContain("preserve_existing");
    expect(writerContent).toContain("existing.rstrip()");
    expect(writerContent).toContain("+ prism_json");
  });

  it("replaces only PRISM portion if already present", () => {
    expect(writerContent).toContain("PRISM_COMMENT_MARKER");
    expect(writerContent).toContain("prism_idx");
    // Verifies brace-counting to find end of existing PRISM JSON
    expect(writerContent).toContain("brace_count");
  });
});

describe("U-PPR24: Physics data in comments", () => {
  it("writes PRISM JSON via to_comment_json() format", () => {
    expect(writerContent).toContain("to_comment_json");
    expect(writerContent).toContain('{"prism":');
  });

  it("writes via operation notes property (preferred)", () => {
    expect(writerContent).toContain("operation.notes");
  });

  it("falls back to operation_comment parameter", () => {
    expect(writerContent).toContain("operation_comment");
  });
});

describe("U-PPR24: Undo tracking", () => {
  it("records original RPM before overwriting", () => {
    expect(writerContent).toContain("original_rpm");
    expect(writerContent).toContain("_read_param_value(params, PARAM_SPINDLE_SPEED)");
  });

  it("records original feed before overwriting", () => {
    expect(writerContent).toContain("original_feed");
    expect(writerContent).toContain("_read_param_value(params, PARAM_FEED_CUTTING)");
  });

  it("records original comment before overwriting", () => {
    expect(writerContent).toContain("original_comment");
    expect(writerContent).toContain("_read_comment(operation)");
  });
});

describe("U-PPR24: Batch writing", () => {
  it("has write_all_operations for full CAM workspace", () => {
    expect(writerContent).toContain("def write_all_operations(self, cam, sf_results_map)");
  });

  it("iterates setups and operations", () => {
    expect(writerContent).toContain("cam.setups.count");
    expect(writerContent).toContain("setup.operations.count");
    expect(writerContent).toContain("cam.setups.item(si)");
    expect(writerContent).toContain("setup.operations.item(oi)");
  });

  it("has write_sequential for flat operation lists", () => {
    expect(writerContent).toContain("def write_sequential(self, operations_list, sf_results_list)");
  });

  it("returns BatchWriteResult with success/failure counts", () => {
    expect(writerContent).toContain("success_count");
    expect(writerContent).toContain("failed_count");
    expect(writerContent).toContain("total_operations");
  });
});

describe("U-PPR24: Error handling", () => {
  it("handles missing parameters gracefully", () => {
    expect(writerContent).toContain("params is None");
    expect(writerContent).toContain('"Operation has no parameters"');
  });

  it("catches exceptions per operation (doesn't abort batch)", () => {
    expect(writerContent).toContain("except Exception as e");
    expect(writerContent).toContain("str(e)");
  });

  it("supports metric and imperial unit systems", () => {
    expect(writerContent).toContain("unit_system");
    expect(writerContent).toContain('"metric"');
    expect(writerContent).toContain('"imperial"');
    expect(writerContent).toContain("/ 25.4");
  });
});

describe("U-PPR24: adsk module import safety", () => {
  it("handles missing adsk module gracefully (for testing outside Fusion)", () => {
    expect(writerContent).toContain("try:");
    expect(writerContent).toContain("import adsk.core");
    expect(writerContent).toContain("import adsk.cam");
    expect(writerContent).toContain("except ImportError");
    expect(writerContent).toContain("_HAS_ADSK");
  });
});
