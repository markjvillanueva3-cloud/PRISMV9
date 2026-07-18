/**
 * cadDispatcher.blueprintExtractContract.test.ts -- round-trip wire test for the
 * `blueprint_extract_contract` action (U-XRAY-EXTRACT-CONTRACT-WIRE). Invokes THROUGH prism_cad (not the
 * normalizers directly) to prove the ACTIONS enum + lazy import + switch case are coherent and the tested
 * BlueprintExtractionContract normalizers are reachable as an app surface. The normalizers' own logic
 * (units-first inch->mm, confidence, summary rollup) is covered exhaustively by
 * BlueprintExtractionContract.test.ts; this file proves the DISPATCHER contract: producer selection,
 * the exactly-one-of guard, and that the returned envelope is schema-valid.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";
import { BLUEPRINT_EXTRACTION_CONTRACT_VERSION } from "../schemas/BlueprintExtractionContract.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}
function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, _description: string, _schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, handler });
    },
  };
}
let handler: CapturedTool["handler"];
async function invoke(action: string, params: Record<string, unknown> = {}): Promise<any> {
  const res = (await handler({ action, params })) as any;
  if (res && res.success === false) return res;
  const text = res?.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return { __raw: text }; }
}

// minimal realistic producer shapes
const FUSED = {
  dimensions: [{ value_mm: 25.4, type: "diameter", agreement_confidence: 0.95, status: "corroborated", hallucination_candidate: false }],
  gdt: [{ symbol: "position", raw_text: "|POS|0.05|A|", confidence: 0.8, corroboration: 2, n_models: 2 }],
  notes: [], profiles: [], surface_finishes: [],
  summary: { n_models: 2 },
};
// Drawing2DExtractionEngine.ExtractionResult shape: dims carry their OWN {value, unit}
const DRAWING = {
  success: true,
  metadata: { path: "JM/ITW-500.dxf", units: "in" },
  dimensions: [
    { id: "d1", type: "diameter", value: 0.5, unit: "in", text: "0.500" }, // -> 12.7mm
    { id: "d2", type: "linear", value: 50, unit: "mm", text: "50" },
  ],
  annotations: ["BREAK ALL SHARP EDGES"],
  partInfo: { partNumber: "500-43050", revision: "C", material: "4140" },
};

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

describe("cadDispatcher blueprint_extract_contract (U-XRAY-EXTRACT-CONTRACT-WIRE app-facing normalize)", () => {
  it("fused producer -> a versioned, schema-valid mm contract through the dispatcher", async () => {
    const res = await invoke("blueprint_extract_contract", { fused: FUSED });
    expect(res.success).toBe(true);
    expect(res.data.producer).toBe("fused");
    expect(res.data.valid).toBe(true); // the normalizer output conforms to its own schema (round-trip proof)
    expect(res.data.errors ?? []).toEqual([]); // no validation errors (the empty [] is stripped by slimResponse)
    expect(res.data.contract.schemaVersion).toBe(BLUEPRINT_EXTRACTION_CONTRACT_VERSION);
    expect(res.data.contract.units).toBe("mm");
    expect(res.data.contract.dimensions).toHaveLength(1);
    expect(res.data.contract.dimensions[0].value_mm).toBe(25.4);
    expect(res.data.contract.gdt[0].value).toBe("|POS|0.05|A|"); // full FCF preserved
  });

  it("drawing producer -> UNITS-FIRST inch->mm conversion survives the dispatcher round-trip", async () => {
    const res = await invoke("blueprint_extract_contract", { drawing: DRAWING });
    expect(res.success).toBe(true);
    expect(res.data.producer).toBe("drawing");
    expect(res.data.valid).toBe(true);
    expect(res.data.contract.units).toBe("mm");
    const dia = res.data.contract.dimensions.find((d: any) => d.type === "diameter");
    expect(dia.value_mm).toBeCloseTo(12.7, 6); // 0.5in -> 12.7mm THROUGH prism_cad (not left as 0.5, not dropped)
    expect(res.data.contract.title_block.part_number).toBe("500-43050");
    expect(res.data.contract.notes[0].value).toBe("BREAK ALL SHARP EDGES");
  });

  it("NEITHER producer -> descriptive error (no silent empty success)", async () => {
    const res = await invoke("blueprint_extract_contract", {});
    expect(JSON.stringify(res).toLowerCase()).toContain("exactly one");
  });

  it("BOTH producers -> descriptive error (ambiguous producer rejected)", async () => {
    const res = await invoke("blueprint_extract_contract", { fused: FUSED, drawing: DRAWING });
    expect(JSON.stringify(res).toLowerCase()).toContain("exactly one");
  });

  it("threads confirmFloor + source + titleBlock opts through the dispatcher", async () => {
    const res = await invoke("blueprint_extract_contract", {
      fused: { dimensions: [{ value_mm: 9, type: "linear", agreement_confidence: 0.65 }], summary: { n_models: 2 } },
      confirmFloor: 0.6,
      source: "override.pdf",
      titleBlock: { customer: "ACME", units: "in" },
    });
    expect(res.success).toBe(true);
    expect(res.data.contract.confirm_floor).toBe(0.6);
    expect(res.data.contract.dimensions[0].needs_confirm).toBe(false); // 0.65 >= 0.6 floor
    expect(res.data.contract.source).toBe("override.pdf");
    expect(res.data.contract.title_block).toMatchObject({ customer: "ACME", units: "in" });
  });
});
