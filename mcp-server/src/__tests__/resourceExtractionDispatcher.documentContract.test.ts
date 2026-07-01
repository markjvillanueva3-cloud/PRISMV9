/**
 * Round-trip wire test for prism_resource_extraction:document_extract_contract
 * (U-XRAY-DOCUMENT-EXTRACT-CONTRACT). Proves the office extraction -> versioned
 * DocumentExtractionContract chain THROUGH the dispatcher (enum entry + case + normalizer reachable as
 * an app surface). The normalizer's own logic is covered by DocumentExtractionContract.test.ts; this
 * proves the DISPATCHER contract: the producer guard + that the returned contract is schema-valid.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
const mockTool = vi.fn();
const mockServer = { tool: mockTool };
import { registerResourceExtractionDispatcher } from "../tools/dispatchers/resourceExtractionDispatcher.js";
import { DOCUMENT_EXTRACTION_CONTRACT_VERSION } from "../schemas/DocumentExtractionContract.js";

describe("prism_resource_extraction document_extract_contract (U-XRAY-DOCUMENT-EXTRACT-CONTRACT)", () => {
  let handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<any>;
  beforeEach(() => {
    mockTool.mockClear();
    registerResourceExtractionDispatcher(mockServer);
    handler = mockTool.mock.calls[0][3];
  });

  it("normalizes a full office ExtractionResult -> a versioned, schema-valid contract through the dispatcher", async () => {
    const res = await handler({
      action: "document_extract_contract",
      params: {
        extraction: {
          metadata: { path: "JM/tool-catalog.xlsx" },
          extractedData: { speeds: ["1200 rpm"], feeds: [], toolCodes: ["CNMG432"], partNumbers: [], materials: ["4140"] },
        },
      },
    });
    expect(res.valid).toBe(true);
    expect(res.contract.schemaVersion).toBe(DOCUMENT_EXTRACTION_CONTRACT_VERSION);
    expect(res.contract.doc_type).toBe("office");
    expect(res.contract.source).toBe("JM/tool-catalog.xlsx");
    expect(res.contract.entries).toHaveLength(3); // 1 speed + 1 tool_code + 1 material
    expect(res.contract.summary.n_needs_confirm).toBe(3); // regex extraction -> all need operator confirm
    expect(res.contract.summary.by_kind).toMatchObject({ speed: 1, tool_code: 1, material: 1 });
  });

  it("accepts a bare extractedData object (not only the full ExtractionResult)", async () => {
    const res = await handler({ action: "document_extract_contract", params: { extractedData: { toolCodes: ["WNMG080408"] } } });
    expect(res.valid).toBe(true);
    expect(res.contract.entries).toHaveLength(1);
    expect(res.contract.entries[0].kind).toBe("tool_code");
  });

  it("producer:ocr selects the OCR normalizer (image OCR -> contract through the dispatcher)", async () => {
    const res = await handler({
      action: "document_extract_contract",
      params: { producer: "ocr", ocr: { imagePath: "p.jpg", confidence: 0.9, extractedData: { measurements: ["12.7 mm"], toolCodes: ["CNMG432"], numbers: [], dates: [], partNumbers: [] } } },
    });
    expect(res.producer).toBe("ocr");
    expect(res.valid).toBe(true);
    expect(res.contract.doc_type).toBe("ocr");
    expect(res.contract.entries).toHaveLength(2); // measurement + tool_code
    expect(res.contract.summary.n_needs_confirm).toBe(0); // 0.9 >= 0.70
  });

  it("threads docType + confirmFloor overrides through the dispatcher", async () => {
    const res = await handler({
      action: "document_extract_contract",
      params: { extractedData: { materials: ["6061"] }, docType: "catalog", confirmFloor: 0.5, entryConfidence: 0.8 },
    });
    expect(res.contract.doc_type).toBe("catalog");
    expect(res.contract.entries[0].needs_confirm).toBe(false); // 0.8 >= 0.5
  });

  it("missing extraction -> descriptive error (no silent empty success)", async () => {
    const res = await handler({ action: "document_extract_contract", params: {} });
    expect(JSON.stringify(res).toLowerCase()).toContain("requires extraction");
  });
});

describe("prism_resource_extraction document_extract_route (U-XRAY-DOCUMENT-EXTRACT-ROUTER)", () => {
  let handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<any>;
  beforeEach(() => {
    mockTool.mockClear();
    registerResourceExtractionDispatcher(mockServer);
    handler = mockTool.mock.calls[0][3];
  });

  it("chains office extraction -> contract -> route: tool-crib + speed-feed eligible through the dispatcher", async () => {
    const c = await handler({
      action: "document_extract_contract",
      params: { extractedData: { toolCodes: ["CNMG432"], materials: ["4140"], speeds: ["1200 rpm"], feeds: [], partNumbers: [] } },
    });
    expect(c.valid).toBe(true);
    const res = await handler({ action: "document_extract_route", params: { contract: c.contract } });
    const plan = res.plan;
    expect(plan.schemaVersion).toBeTruthy();
    expect(plan.summary.n_eligible).toBe(4); // tool_crib_lookup+tool_catalog_lookup (tool_code) + speed_feed+material_price_lookup (material)
    expect(plan.summary.n_ineligible).toBe(1); // tribal_capture (no procedure/note in regex office output)
    const tc = plan.routes.find((r: any) => r.consumer === "tool_crib_lookup");
    expect(tc.action).toBe("tool_crib_inventory");
    expect(tc.payload.tool_codes).toEqual(["CNMG432"]);
  });

  it("chains documentLearning ingestion -> contract -> route: procedure/note -> tribal_capture (confirm-gated)", async () => {
    const c = await handler({
      action: "document_extract_contract",
      params: {
        producer: "doclearn",
        ingestion: {
          items: [
            { title: "Deburr sequence", body: "deburr all edges after milling", category: "procedure", confidence: 0.95 },
            { title: "Fixture note", body: "verify soft jaws seat", category: "workholding", confidence: 0.5 },
          ],
          source_attribution: "shop-manual.pdf",
        },
      },
    });
    expect(c.valid).toBe(true);
    expect(c.producer).toBe("doclearn");
    expect(c.contract.doc_type).toBe("manual");
    expect(c.contract.entries).toHaveLength(2);
    const res = await handler({ action: "document_extract_route", params: { contract: c.contract } });
    const tribal = res.plan.routes.find((r: any) => r.consumer === "tribal_capture");
    expect(tribal.eligible).toBe(true); // procedure + note kinds present
    expect(tribal.requires_confirmation).toBe(true); // the 0.5 tip is below the 0.70 floor -> gated
    expect(tribal.blocking_fields).toBe(1);
  });

  it("missing contract -> descriptive error", async () => {
    const res = await handler({ action: "document_extract_route", params: {} });
    expect(JSON.stringify(res).toLowerCase()).toContain("requires contract");
  });

  it("invalid contract (wrong schemaVersion) -> rejected, never routed", async () => {
    const res = await handler({ action: "document_extract_route", params: { contract: { schemaVersion: "9.9.9", doc_type: "office" } } });
    expect(JSON.stringify(res).toLowerCase()).toContain("invalid contract");
  });
});
