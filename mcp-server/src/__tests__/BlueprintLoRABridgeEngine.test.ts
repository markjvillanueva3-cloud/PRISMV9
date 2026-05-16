/**
 * BlueprintLoRABridgeEngine.test.ts — BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U8
 * HARD RULE asserted: no customer names in exported LoRA bundles.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  BlueprintLoRABridgeEngine,
  blueprintLoRABridgeEngine,
  LORA_PROVIDERS,
  LORA_CONFIDENCE_TIERS,
  ANONYMIZATION_PATTERNS,
  DEFAULT_STAGING_DIR,
  OPERATOR_APPROVAL_MARKER,
  anonymizeCustomer,
  anonymizePartNumber,
  anonymizePath,
  anonymizeText,
  applyAnonymizationPatterns,
  formatBundleForProvider,
  type LoRATrainingPair,
  type LoRABridgeIO,
} from "../engines/BlueprintLoRABridgeEngine.js";

describe("LoRA constants", () => {
  it("LORA_PROVIDERS lists 4 supported providers", () => {
    expect(LORA_PROVIDERS).toEqual(["gemini-finetune", "openai-finetune", "modal", "local-lora"]);
  });
  it("LORA_CONFIDENCE_TIERS exposes 3 tiers", () => {
    expect(LORA_CONFIDENCE_TIERS).toEqual(["operator_verified", "ensemble_consensus", "single_backend"]);
  });
  it("ANONYMIZATION_PATTERNS covers spec customer names", () => {
    const text = "ALCOA and ITW and CONTINENTAL MIDLAND and OPTIMAS and SFS and HOLO-KROME and FASTENAL and JM DIE";
    const scrubbed = applyAnonymizationPatterns(text);
    expect(scrubbed).not.toMatch(/\bALCOA\b|\bITW\b|CONTINENTAL[\s_-]?MIDLAND|\bOPTIMAS\b|\bSFS\b|HOLO-?KROME|\bFASTENAL\b/);
  });
});

describe("LoRA anonymize helpers", () => {
  it("anonymizeCustomer maps any name to ANON-CUSTOMER", () => {
    expect(anonymizeCustomer("ALCOA")).toBe("ANON-CUSTOMER");
  });
  it("anonymizePartNumber maps any pn to ANON-PN", () => {
    expect(anonymizePartNumber("AB-001")).toBe("ANON-PN");
  });
  it("anonymizePath strips drive letter + adjacent customer dirs (consume-bug regression)", () => {
    const result = anonymizePath("H:\\PRISM\\JM DIE\\ALCOA\\AB-001\\file.pdf");
    expect(result).not.toMatch(/\bALCOA\b/);
    expect(result).not.toContain("H:");
  });
  it("anonymizeText applies all patterns", () => {
    const t = anonymizeText("Cust: ALCOA pn: AB-001 program: see ITW");
    expect(t).not.toMatch(/\bALCOA\b|\bITW\b/);
  });
});

describe("formatBundleForProvider", () => {
  const pairs: LoRATrainingPair[] = [{
    pairId: "p1", customer: "ANON-CUSTOMER", partNumber: "ANON-PN",
    pdfPath: "/CUSTOMER/CUSTOMER/file.pdf", extractionType: "linear",
    groundTruthValue: "1.000", context: "corpus + tribal",
  }];
  const set = { setId: "s1", pairs, confidenceTier: "operator_verified" as const, anonymized: true };
  it("openai-finetune emits JSONL with messages[]", () => {
    const body = formatBundleForProvider(set, "openai-finetune");
    const line = JSON.parse(body.trim());
    expect(Array.isArray(line.messages)).toBe(true);
    expect(line.messages[2]?.content).toBe("1.000");
  });
  it("gemini-finetune emits input_text/output_text", () => {
    const body = formatBundleForProvider(set, "gemini-finetune");
    expect(JSON.parse(body.trim()).output_text).toBe("1.000");
  });
  it("modal+local-lora emit prompt+completion", () => {
    const body = formatBundleForProvider(set, "modal");
    expect(JSON.parse(body.trim()).completion).toBe("1.000");
  });
});

describe("BlueprintLoRABridgeEngine engine", () => {
  let engine: BlueprintLoRABridgeEngine;
  let tmpRoot: string;
  beforeEach(() => {
    engine = new BlueprintLoRABridgeEngine();
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-u8-lora-"));
  });

  it("prepareTrainingSet anonymizes customer + part number + path", async () => {
    const io: LoRABridgeIO = {
      loadTrainingPairs: async () => [{
        pairId: "p1", customer: "ALCOA", partNumber: "AB-001",
        pdfPath: "H:/PRISM/JM DIE/ALCOA/AB-001/print.pdf",
        extractionType: "linear", groundTruthValue: "1.000",
        context: "see ITW corpus",
      }],
    };
    const result = await engine.prepareTrainingSet({ confidenceTier: "operator_verified", io });
    expect(result.anonymized).toBe(true);
    expect(result.pairs[0]?.customer).toBe("ANON-CUSTOMER");
    expect(result.pairs[0]?.partNumber).toBe("ANON-PN");
    expect(result.pairs[0]?.pdfPath).not.toContain("ALCOA");
    expect(result.pairs[0]?.context).not.toMatch(/\bITW\b/);
  });

  it("HARD RULE: customer names NEVER appear in exported bundle (regex coverage assertion)", async () => {
    const io: LoRABridgeIO = {
      loadTrainingPairs: async () => [
        { pairId: "p1", customer: "ALCOA", partNumber: "AB-1", pdfPath: "/JM DIE/ALCOA/AB-1.pdf", extractionType: "linear", groundTruthValue: "1.000", context: "see ITW" },
        { pairId: "p2", customer: "CONTINENTAL MIDLAND", partNumber: "CM-9", pdfPath: "/JM DIE/CONTINENTAL MIDLAND/CM-9.pdf", extractionType: "linear", groundTruthValue: "2.000", context: "HOLO-KROME corpus" },
        { pairId: "p3", customer: "OPTIMAS", partNumber: "OP-5", pdfPath: "/JM DIE/OPTIMAS/OP-5.pdf", extractionType: "thread_callout", groundTruthValue: "1/4-20", context: "FASTENAL" },
      ],
    };
    const set = await engine.prepareTrainingSet({ confidenceTier: "operator_verified", io });
    const body = formatBundleForProvider({ ...set }, "openai-finetune");
    const scrubbed = applyAnonymizationPatterns(body);
    expect(scrubbed).not.toMatch(/ALCOA|ITW|CONTINENTAL|OPTIMAS|SFS|HOLO-?KROME|FASTENAL/);
  });

  it("BLOCKED: write outside staging dir without operator marker", async () => {
    const io: LoRABridgeIO = {
      loadTrainingPairs: async () => [{ pairId: "p1", customer: "x", partNumber: "y", pdfPath: "/p", extractionType: "linear", groundTruthValue: "1", context: "" }],
    };
    const set = await engine.prepareTrainingSet({ confidenceTier: "operator_verified", io });
    const outsidePath = path.join(tmpRoot, "outside", "bundle.jsonl").replace(/\\/g, "/");
    await expect(
      engine.exportBundle({
        setId: set.setId, provider: "openai-finetune", outputPath: outsidePath,
        io: { fs: { existsSync: () => false, mkdirSync: () => undefined, writeFileSync: () => undefined as unknown as ReturnType<typeof fs.writeFileSync>, readFileSync: fs.readFileSync } },
      }),
    ).rejects.toThrow(/BLOCKED.*operator approval marker/i);
  });

  it("allowed: write outside staging dir WHEN operator marker present", async () => {
    const io: LoRABridgeIO = {
      loadTrainingPairs: async () => [{ pairId: "p1", customer: "x", partNumber: "y", pdfPath: "/p", extractionType: "linear", groundTruthValue: "1", context: "" }],
    };
    const set = await engine.prepareTrainingSet({ confidenceTier: "operator_verified", io });
    const outsideDir = path.join(tmpRoot, "outside").replace(/\\/g, "/");
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.writeFileSync(path.join(outsideDir, OPERATOR_APPROVAL_MARKER), "approved", "utf8");
    const outsidePath = path.join(outsideDir, "bundle.jsonl").replace(/\\/g, "/");
    const manifest = await engine.exportBundle({ setId: set.setId, provider: "openai-finetune", outputPath: outsidePath });
    expect(manifest.outputPath).toBe(outsidePath);
    expect(fs.existsSync(outsidePath)).toBe(true);
  });

  it("rejects invalid provider", async () => {
    const io: LoRABridgeIO = { loadTrainingPairs: async () => [] };
    const set = await engine.prepareTrainingSet({ confidenceTier: "operator_verified", io });
    await expect(
      engine.exportBundle({ setId: set.setId, provider: "BOGUS" as unknown as "openai-finetune", outputPath: "x" }),
    ).rejects.toThrow(/invalid provider/);
  });

  it("rejects unknown setId", async () => {
    await expect(
      engine.exportBundle({ setId: "missing", provider: "openai-finetune", outputPath: "x" }),
    ).rejects.toThrow(/unknown setId/);
  });

  it("rejects invalid confidenceTier", async () => {
    await expect(
      engine.prepareTrainingSet({ confidenceTier: "bogus" as unknown as "operator_verified", io: { loadTrainingPairs: async () => [] } }),
    ).rejects.toThrow(/invalid confidenceTier/);
  });

  it("rejects missing loadTrainingPairs injection", async () => {
    await expect(
      engine.prepareTrainingSet({ confidenceTier: "operator_verified" }),
    ).rejects.toThrow(/loadTrainingPairs/);
  });

  it("registerExternalEndpoint + getActiveBundles", () => {
    const ep = engine.registerExternalEndpoint({ bundleId: "b1", endpointURL: "https://api", providerType: "openai-finetune" });
    expect(ep.bundleId).toBe("b1");
    expect(engine.getActiveBundles().length).toBe(1);
  });

  it("registerExternalEndpoint rejects empty fields", () => {
    expect(() => engine.registerExternalEndpoint({ bundleId: "", endpointURL: "x", providerType: "modal" })).toThrow(/required/);
  });

  it("getExportHistory + clearState", async () => {
    const io: LoRABridgeIO = {
      loadTrainingPairs: async () => [{ pairId: "p", customer: "x", partNumber: "y", pdfPath: "/p", extractionType: "linear", groundTruthValue: "1", context: "" }],
    };
    const set = await engine.prepareTrainingSet({ confidenceTier: "operator_verified", io });
    await engine.exportBundle({
      setId: set.setId, provider: "openai-finetune",
      outputPath: path.join(DEFAULT_STAGING_DIR, "test.jsonl").replace(/\\/g, "/"),
      io: { fs: { existsSync: () => true, mkdirSync: () => undefined, writeFileSync: () => undefined as unknown as ReturnType<typeof fs.writeFileSync>, readFileSync: fs.readFileSync } },
    });
    expect(engine.getExportHistory().length).toBe(1);
    engine.clearState();
    expect(engine.getExportHistory().length).toBe(0);
  });

  it("singleton schemaVersion is 1.0.0", () => {
    expect(blueprintLoRABridgeEngine.schemaVersion).toBe("1.0.0");
  });
});
