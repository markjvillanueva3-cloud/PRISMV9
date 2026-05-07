/**
 * Tests for AutoPrintToProgramBridgeEngine (engine-level coverage).
 */
import { describe, it, expect } from "vitest";
import {
  autoPrintToProgramBridgeEngine,
  AutoPrintToProgramBridgeEngine,
  ProcessType,
} from "../engines/AutoPrintToProgramBridgeEngine.js";

const dxf = `0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
0
90
4
70
1
10
0.0
20
0.0
10
10.0
20
0.0
10
10.0
20
10.0
10
0.0
20
10.0
0
ENDSEC
0
EOF`;

describe("AutoPrintToProgramBridgeEngine — routing", () => {
  it("auto-detects wire_edm for DXF input", async () => {
    const r = await autoPrintToProgramBridgeEngine.runAutoPipeline({
      content: dxf,
      format: "dxf",
      material_name: "D2",
    });
    expect(r.detected_process).toBe("wire_edm");
  });

  it("respects forced process_type", async () => {
    const r = await autoPrintToProgramBridgeEngine.runAutoPipeline({
      content: dxf,
      format: "dxf",
      process_type: "wire_edm",
      material_name: "A2",
    });
    expect(r.detected_process).toBe("wire_edm");
  });

  it("emits format_detection + process_detection stages", async () => {
    const r = await autoPrintToProgramBridgeEngine.runAutoPipeline({
      content: dxf,
      format: "dxf",
      material_name: "D2",
    });
    expect(r.stages_completed.some((s) => s.startsWith("format_detection"))).toBe(true);
    expect(r.stages_completed.some((s) => s.startsWith("process_detection"))).toBe(true);
  });

  it("routes wire_edm to WEDMPrintToProgramEngine", async () => {
    const r = await autoPrintToProgramBridgeEngine.runAutoPipeline({
      content: dxf,
      format: "dxf",
      material_name: "D2",
      stock_z_mm: 25,
    });
    expect(r.wedm_result).toBeDefined();
    expect(r.program_text).toBeDefined();
  });

  it("detects turning from text hints", async () => {
    const r = await autoPrintToProgramBridgeEngine.runAutoPipeline({
      content: "Lathe turning operation for shaft",
      format: "text",
      material_name: "4140",
    });
    expect(r.detected_process).toBe("turning");
  });

  it("detects milling as default for plain text", async () => {
    const r = await autoPrintToProgramBridgeEngine.runAutoPipeline({
      content: "Plain text with no process hint",
      format: "text",
      material_name: "4140",
    });
    expect(r.detected_process).toBe("milling");
  });

  it("ProcessType constant includes wire_edm", () => {
    expect(ProcessType.wire_edm).toBe("wire_edm");
  });

  it("engine class is instantiable", async () => {
    const e = new AutoPrintToProgramBridgeEngine();
    const r = await e.runAutoPipeline({
      content: dxf,
      format: "dxf",
      material_name: "D2",
    });
    expect(r.detected_format).toBe("dxf");
  });

  it("preserves stock_z_mm for WEDM thickness", async () => {
    const r = await autoPrintToProgramBridgeEngine.runAutoPipeline({
      content: dxf,
      format: "dxf",
      process_type: "wire_edm",
      material_name: "D2",
      stock_z_mm: 40,
    });
    expect(r.wedm_result?.setup_sheet).toBeDefined();
  });

  it("returns success=true for non-WEDM stubbed route", async () => {
    const r = await autoPrintToProgramBridgeEngine.runAutoPipeline({
      content: "Mill a pocket",
      format: "text",
      material_name: "4140",
    });
    expect(r.success).toBe(true);
  });
});
