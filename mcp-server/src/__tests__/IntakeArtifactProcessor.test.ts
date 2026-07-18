/**
 * IntakeArtifactProcessorEngine tests (hotel iter25).
 * Real-behavior assertions on pure parsers + routing + confidence gates.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  IntakeArtifactProcessorEngine,
  InMemoryToolingSink,
  InMemoryInventorySink,
  InMemoryPartSink,
  InMemoryReviewQueue,
  redactPII,
  parseTools,
  parseInventoryItems,
  parseParts,
  INVENTORY_CONFIDENCE_FLOOR,
  TOOLING_CONFIDENCE_FLOOR,
  PART_CONFIDENCE_FLOOR,
  MAX_PDF_TEXT_BYTES,
  type PdfTextExtractor,
} from "../engines/IntakeArtifactProcessorEngine.js";
import type { ExtractedArtifact } from "../engines/EmailPrintIntakeEngine.js";

function fakeExtractor(text: string): PdfTextExtractor {
  return { extract: async () => text };
}
function fakeArtifact(overrides: Partial<ExtractedArtifact> = {}): ExtractedArtifact {
  return {
    user_id: "user-vicky",
    message_id: "<m@x>",
    from_email: "customer@example.com",
    subject: "Updated print",
    filename: "drawing.pdf",
    extension: "pdf",
    size_bytes: 1024,
    sha256: "abc123",
    received_at: "2026-05-26T14:00:00.000Z",
    extracted_at: "2026-05-26T14:05:00.000Z",
    output_path: "user-vicky/2026-05-26/m_x/drawing.pdf",
    ...overrides,
  };
}

describe("redactPII", () => {
  it("redacts SSN-shape", () => {
    expect(redactPII("SSN 123-45-6789")).toBe("SSN ***-**-****");
  });
  it("redacts US phone (parens form)", () => {
    expect(redactPII("call (708) 343-0900")).toBe("call (***) ***-****");
  });
  it("redacts US phone (dash form)", () => {
    expect(redactPII("call 708-343-0900")).toBe("call ***-***-****");
  });
  it("redacts email addresses", () => {
    expect(redactPII("from user@example.com")).toBe("from ***@***");
  });
  it("leaves non-PII text untouched", () => {
    expect(redactPII("1/4 carbide end mill")).toBe("1/4 carbide end mill");
  });
});

describe("parseTools", () => {
  it("parses 4-flute carbide end mill with diameter + flute count + material", () => {
    const tools = parseTools("1/4 4-flute carbide end mill required");
    expect(tools).toHaveLength(1);
    expect(tools[0].category).toBe("end_mill");
    expect(tools[0].flute_count).toBe(4);
    expect(tools[0].material).toBe("carbide");
    expect(tools[0].diameter_in).toBeCloseTo(0.25, 4);
    expect(tools[0].diameter_mm).toBeCloseTo(6.35, 2);
    expect(tools[0].confidence).toBeGreaterThanOrEqual(0.92);
  });
  it("parses drill with fractional diameter", () => {
    const tools = parseTools("Use a 1/2 in drill");
    expect(tools).toHaveLength(1);
    expect(tools[0].category).toBe("drill");
    expect(tools[0].diameter_in).toBeCloseTo(0.5, 4);
    expect(tools[0].diameter_mm).toBeCloseTo(12.7, 2);
  });
  it("parses tap callout 1/4-20", () => {
    const tools = parseTools("Tap M6 / 1/4-20 tap on holes");
    const tap = tools.find((t) => t.category === "tap");
    expect(tap?.category).toBe("tap");
    expect(tap?.confidence).toBeGreaterThanOrEqual(0.90);
  });
  it("parses ISO insert codes", () => {
    const tools = parseTools("Use CNMG insert with DNMG backup");
    const inserts = tools.filter((t) => t.category === "insert");
    expect(inserts.length).toBeGreaterThanOrEqual(2);
    expect(inserts.map((i) => i.raw_text).sort()).toEqual(["CNMG", "DNMG"]);
  });
  it("dedupes identical tool spec across mentions", () => {
    const tools = parseTools("1/4 4-flute carbide end mill rough then 1/4 4-flute carbide end mill finish");
    expect(tools).toHaveLength(1);
  });
  it("returns empty array for text with no tool callouts", () => {
    expect(parseTools("Please review the attached drawing")).toEqual([]);
  });
});

describe("parseInventoryItems", () => {
  it("parses raw stock with qty + unit + material spec", () => {
    const items = parseInventoryItems("Need 12.5 lb 4140 round bar for next job");
    expect(items).toHaveLength(1);
    expect(items[0].category).toBe("raw_stock");
    expect(items[0].quantity).toBeCloseTo(12.5);
    expect(items[0].unit).toBe("lb");
    expect(items[0].material_spec).toBe("4140");
  });
  it("parses fastener with qty + size + type", () => {
    const items = parseInventoryItems("Order 10 pcs M6x20 socket head cap screw");
    expect(items).toHaveLength(1);
    expect(items[0].category).toBe("fastener");
    expect(items[0].quantity).toBe(10);
    expect(items[0].unit).toBe("ea");
  });
});

describe("parseParts", () => {
  it("parses PN + Rev", () => {
    const parts = parseParts("PN-12345 Rev B");
    expect(parts).toHaveLength(1);
    expect(parts[0].part_number).toBe("PN-12345");
    expect(parts[0].revision).toBe("B");
  });
  it("parses Drawing # form", () => {
    const parts = parseParts("Drawing: ABC-12345");
    expect(parts).toHaveLength(1);
    expect(parts[0].part_number).toBe("ABC-12345");
  });
  it("dedupes part number across mentions, keeping highest confidence", () => {
    const parts = parseParts("PN-99999 throughout and PN-99999 final");
    expect(parts).toHaveLength(1);
  });
});

describe("IntakeArtifactProcessorEngine — routing + confidence gates", () => {
  let tooling: InMemoryToolingSink;
  let inventory: InMemoryInventorySink;
  let parts: InMemoryPartSink;
  let review: InMemoryReviewQueue;

  beforeEach(() => {
    tooling = new InMemoryToolingSink();
    inventory = new InMemoryInventorySink();
    parts = new InMemoryPartSink();
    review = new InMemoryReviewQueue();
  });

  it("routes high-confidence tool to ToolingSink, NOT to ReviewQueue", async () => {
    const engine = new IntakeArtifactProcessorEngine(
      fakeExtractor("1/4 4-flute carbide end mill"),
      tooling, inventory, parts, review
    );
    const result = await engine.process(fakeArtifact(), new Uint8Array([1, 2, 3]));
    expect(result.tools_routed).toBe(1);
    expect(result.review_queue_count).toBe(0);
    expect(tooling.proposed).toHaveLength(1);
    expect(review.queued).toHaveLength(0);
  });

  it("routes raw_stock to InventorySink with material spec preserved", async () => {
    const engine = new IntakeArtifactProcessorEngine(
      fakeExtractor("12 lb 4140 round bar"),
      tooling, inventory, parts, review
    );
    const result = await engine.process(fakeArtifact(), new Uint8Array([1]));
    expect(result.inventory_routed).toBe(1);
    expect(inventory.proposed[0].item.material_spec).toBe("4140");
    expect(inventory.proposed[0].item.quantity).toBe(12);
  });

  it("routes part to PartSink when confidence ≥ floor", async () => {
    const engine = new IntakeArtifactProcessorEngine(
      fakeExtractor("PN-12345 Rev B"),
      tooling, inventory, parts, review
    );
    const result = await engine.process(fakeArtifact(), new Uint8Array([1]));
    expect(result.parts_routed).toBe(1);
    expect(parts.proposed[0].part.part_number).toBe("PN-12345");
  });

  it("skips non-PDF artifacts (CAD/picture handled by separate processors)", async () => {
    const engine = new IntakeArtifactProcessorEngine(
      fakeExtractor("1/4 4-flute carbide end mill"),
      tooling, inventory, parts, review
    );
    const result = await engine.process(
      fakeArtifact({ extension: "jpg", filename: "photo.jpg" }),
      new Uint8Array([1])
    );
    expect(result.tools_routed).toBe(0);
    expect(tooling.proposed).toHaveLength(0);
  });

  it("returns empty extraction on picture-only PDF (no text)", async () => {
    const engine = new IntakeArtifactProcessorEngine(
      fakeExtractor(""),
      tooling, inventory, parts, review
    );
    const result = await engine.process(fakeArtifact(), new Uint8Array([1]));
    expect(result.tools_routed).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it("captures pdf_extract_error fail-LOUD (does not throw)", async () => {
    const failingExtractor: PdfTextExtractor = {
      extract: async () => {
        throw new Error("pdf-parse failed");
      },
    };
    const engine = new IntakeArtifactProcessorEngine(
      failingExtractor, tooling, inventory, parts, review
    );
    const result = await engine.process(fakeArtifact(), new Uint8Array([1]));
    expect(result.errors[0]).toMatch(/pdf_extract_error.*pdf-parse failed/);
    expect(result.tools_routed).toBe(0);
  });

  it("refuses to process PDF > MAX_PDF_TEXT_BYTES (DoS guard)", async () => {
    const engine = new IntakeArtifactProcessorEngine(
      fakeExtractor("never reached"),
      tooling, inventory, parts, review
    );
    const huge = new Uint8Array(MAX_PDF_TEXT_BYTES + 1);
    const result = await engine.process(fakeArtifact(), huge);
    expect(result.errors[0]).toMatch(/pdf_too_large/);
    expect(result.tools_routed).toBe(0);
  });

  it("history_summary aggregates across multiple process() calls", async () => {
    const engine = new IntakeArtifactProcessorEngine(
      fakeExtractor("1/4 4-flute carbide end mill\nPN-99999 Rev A\n12 lb 4140 round bar"),
      tooling, inventory, parts, review
    );
    await engine.process(fakeArtifact({ sha256: "h1" }), new Uint8Array([1]));
    await engine.process(fakeArtifact({ sha256: "h2" }), new Uint8Array([2]));
    const sum = engine.history_summary();
    expect(sum.total_processed).toBe(2);
    expect(sum.total_tools_routed).toBe(2);
    expect(sum.total_inventory_routed).toBe(2);
    expect(sum.total_parts_routed).toBe(2);
  });

  it("PII in raw_text is redacted before routing", async () => {
    const engine = new IntakeArtifactProcessorEngine(
      fakeExtractor("Contact 708-343-0900 for the 1/4 4-flute carbide end mill order"),
      tooling, inventory, parts, review
    );
    await engine.process(fakeArtifact(), new Uint8Array([1]));
    expect(tooling.proposed).toHaveLength(1);
    expect(tooling.proposed[0].tool.raw_text).not.toContain("708-343-0900");
  });

  it("confidence floors are realistic — tooling ≥ 0.80, inventory ≥ 0.85, part ≥ 0.90", () => {
    expect(TOOLING_CONFIDENCE_FLOOR).toBe(0.80);
    expect(INVENTORY_CONFIDENCE_FLOOR).toBe(0.85);
    expect(PART_CONFIDENCE_FLOOR).toBe(0.90);
  });

  it("end-to-end: multi-entity PDF routes correctly", async () => {
    const text = `
      ECO-2026-005 from CUSTOMER-X
      PN-44444 Rev C — production order
      Need 25 lb 4340 round bar for fixture
      Tooling: 1/2 4-flute carbide end mill + 1/4 in drill
      Order 50 pcs M8x25 socket head cap screw
      Drawing: XYZ-9876
    `;
    const engine = new IntakeArtifactProcessorEngine(
      fakeExtractor(text), tooling, inventory, parts, review
    );
    const result = await engine.process(fakeArtifact(), new Uint8Array([1]));
    expect(result.tools_routed).toBeGreaterThanOrEqual(2); // end_mill + drill
    expect(result.inventory_routed).toBeGreaterThanOrEqual(2); // raw stock + fastener
    expect(result.parts_routed).toBeGreaterThanOrEqual(2); // PN-44444 + XYZ-9876
  });
});
