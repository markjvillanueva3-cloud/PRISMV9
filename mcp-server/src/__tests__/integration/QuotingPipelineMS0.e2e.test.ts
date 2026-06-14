/**
 * QuotingPipelineMS0 E2E integration test — QUOTING-PIPELINE-MS0 / U-QP12
 *
 * Wires the 6 new bridge engines (U-QP02..U-QP07) end-to-end against
 * synthetic-but-realistic OCR-text fixtures. R12-honest:
 *   - These fixtures are SYNTHETIC OCR TEXT, not real JPGs. Real JPG fixtures
 *     from JM Die _PART LIBRARY/ are out of MS0 scope (named here so the test
 *     is explicit about what it does + does not cover).
 *   - The OCR boundary is upstream (ImageOCRPipelineEngine accepts simulatedText);
 *     these fixtures are the equivalent of "what upstream OCR would emit if it
 *     read a real JM Die print / Sandvik insert box / Haas service tag".
 *
 * The test proves the pipeline assembles correctly. Real-photo OCR accuracy is
 * U-QP12-MS1 (when an OCR backend is wired) — see envelope.
 *
 * @milestone QUOTING-PIPELINE-MS0/U-QP12-E2E-INTEGRATION
 * @author slot:charlie /goal-13 iter6, 2026-05-24
 */
import { describe, it, expect } from "vitest";
import { cameraIntakeRouterEngine } from "../../engines/CameraIntakeRouterEngine.js";
import { insertBoxToCatalogBridgeEngine } from "../../engines/InsertBoxToCatalogBridgeEngine.js";
import { machineServiceTagOCREngine } from "../../engines/MachineServiceTagOCREngine.js";
import { machinePartsBOMResolverEngine } from "../../engines/MachinePartsBOMResolverEngine.js";
import { vendorRealtimePricingClientEngine } from "../../engines/VendorRealtimePricingClientEngine.js";
import { LiveChatRouterEngine } from "../../engines/LiveChatRouterEngine.js";

// ─── Synthetic-but-realistic fixtures (OCR-text equivalent of camera capture) ──
const FIXTURE_BLUEPRINT_TEXT = `
DRAWING NO 12345-REV-B
SCALE 2:1   TOLERANCE ±0.05
drawn by JMR    checked by GFA
MATERIAL: 4140 HRC 28-32
Ø12.7mm  Ø19.05mm  Ø25.4mm  M6×1.0
⌖0.02 datum A   ⏥0.01 surface B
THIRD ANGLE PROJECTION
`.trim();

const FIXTURE_INSERT_BOX_TEXT = `
SANDVIK CoroTurn
CNMG120408-PM
4325 grade
Carbide insert — 10/box
Made in Sweden
`.trim();

const FIXTURE_SERVICE_TAG_TEXT = `
HAAS Automation Inc
Model VF-2
S/N: 1098761
Spindle HP: 30
Voltage 230 3-phase
Mfg Date 2024-08
`.trim();

const VENDOR_CACHE = {
  mcmaster: {
    "VACTRA-2": { unit_price_usd: 28.50, lead_time_days: 1, source: "csv" as const },
    "COOL-SYN-5G": { unit_price_usd: 75.00, lead_time_days: 2, source: "csv" as const },
  },
  "haas-oem": {
    "DRAWBAR-VF2": { unit_price_usd: 540.00, lead_time_days: 14, source: "csv" as const },
  },
};

describe("QuotingPipelineMS0 E2E — full pipeline integration (R12 SYNTHETIC TEXT fixtures)", () => {
  it("blueprint path: camera router → blueprint route, ≥0.30 confidence", () => {
    const cls = cameraIntakeRouterEngine.classify({ text: FIXTURE_BLUEPRINT_TEXT });
    expect(cls.route).toBe("blueprint");
    expect(cls.confidence).toBeGreaterThan(0.30);
  });

  it("insert-box path: camera router → insert-box → SANDVIK CNMG120408 catalog match → 3 compatible inserts", () => {
    const cls = cameraIntakeRouterEngine.classify({ text: FIXTURE_INSERT_BOX_TEXT });
    expect(cls.route).toBe("insert-box");
    const lookup = insertBoxToCatalogBridgeEngine.lookup({ text: FIXTURE_INSERT_BOX_TEXT });
    expect(lookup.catalog_match?.part_number).toContain("CNMG12040");
    expect(lookup.catalog_match?.vendor).toBe("Sandvik");
    expect(lookup.compatible_inserts.length).toBe(3);
  });

  it("service-tag path: camera router → service-tag → make=HAAS model=VF-2 serial=1098761 → BOM=6 → ≥1 OEM item priced from cache", () => {
    const cls = cameraIntakeRouterEngine.classify({ text: FIXTURE_SERVICE_TAG_TEXT });
    expect(cls.route).toBe("machine-service-tag");
    const tag = machineServiceTagOCREngine.extract({ text: FIXTURE_SERVICE_TAG_TEXT });
    expect(tag.success).toBe(true);
    expect(tag.fields.make).toBe("HAAS");
    expect(tag.fields.model).toBe("VF-2");
    expect(tag.fields.serial).toBe("1098761");
    const bom = machinePartsBOMResolverEngine.resolve({ make: tag.fields.make, model: tag.fields.model, serial: tag.fields.serial });
    expect(bom.resolved).toBe(true);
    expect(bom.bom.length).toBe(6);
    // Pick a consumable (mcmaster) and price it from the cache
    const wayOil = bom.bom.find((b) => b.vendor_adapter === "mcmaster");
    expect(wayOil?.generic_sku).toBe("VACTRA-2");
    const price = vendorRealtimePricingClientEngine.lookupPrice({
      adapter: "mcmaster", sku: wayOil!.generic_sku!, cachedPrices: VENDOR_CACHE,
    });
    expect(price.found).toBe(true);
    expect(price.unit_price_usd).toBe(28.50);
  });
});

describe("QuotingPipelineMS0 E2E — live chat session integration (U-QP07 + provenance)", () => {
  it("session open → turn (with fake TroubleshootingAssistant) → close round-trip carries citation provenance", async () => {
    const eng = new LiveChatRouterEngine();
    eng.setAssistantCallback(async (userText, history) => ({
      text: `[fake-assistant] understood: ${userText.slice(0, 40)} (history=${history.length})`,
      citations: [
        { source: "TroubleshootingAssistantEngine", relevance: 0.92, excerpt: "matched tribal tip #4521" },
        { source: "CAMTribalRAGEngine", relevance: 0.78 },
      ],
    }));
    const sess = eng.openSession();
    expect(sess.state).toBe("open");

    const reply = await eng.turn(sess.id, "my finishing pass is leaving 3.2 Ra — what changed?");
    expect(reply.role).toBe("assistant");
    expect(reply.text).toMatch(/\[fake-assistant\] understood/);
    expect(reply.citations?.length).toBe(2);
    expect(reply.citations?.[0].source).toBe("TroubleshootingAssistantEngine");
    expect(reply.citations?.[0].relevance).toBeCloseTo(0.92, 2);

    const closed = eng.closeSession(sess.id);
    expect(closed).toBe(true);
    // After close: another turn returns explicit error, not silent success
    const rejected = await eng.turn(sess.id, "follow-up");
    expect(rejected.text).toMatch(/\[error\] session is closed/);
  });
});

describe("QuotingPipelineMS0 E2E — R12 fail-loud on ambiguous OCR (no silent default)", () => {
  it("noise-only text → camera router returns unknown with explicit reason, NOT default-blueprint", () => {
    const cls = cameraIntakeRouterEngine.classify({ text: "lorem ipsum dolor sit amet" });
    expect(cls.route).toBe("unknown");
    expect(cls.reason).toMatch(/no-route-features-matched|below-min-confidence/);
  });

  it("unknown machine make → BOM resolver returns resolved=false with explicit reason", () => {
    const bom = machinePartsBOMResolverEngine.resolve({ make: "ACME-MFG", model: "X100" });
    expect(bom.resolved).toBe(false);
    expect(bom.reason).toMatch(/unknown-make/);
    expect(bom.bom.length).toBe(0);
  });

  it("vendor pricing for unknown SKU + no env key → found=false with explicit reason, no fabricated price", () => {
    const r = vendorRealtimePricingClientEngine.lookupPrice({ adapter: "misumi", sku: "UNKNOWN-XYZ" });
    expect(r.found).toBe(false);
    expect(r.unit_price_usd).toBeNull();
    expect(r.reason).toMatch(/no-api-key:MISUMI_API_KEY/);
  });
});
