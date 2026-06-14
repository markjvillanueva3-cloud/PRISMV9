/**
 * Tests for CameraIntakeRouterEngine — QUOTING-PIPELINE-MS0 / U-QP02.
 * Strict assertions against concrete route classes — no toBeDefined / toBeTruthy stubs.
 * Coverage floor: 4 image classes × happy + 4 failure modes + 3 adversarial + 3 spanning + tie-breaker + evidence.
 */
import { describe, it, expect } from "vitest";
import { CameraIntakeRouterEngine, type CameraIntakeInput } from "../engines/CameraIntakeRouterEngine.js";

const eng = new CameraIntakeRouterEngine();

describe("CameraIntakeRouterEngine.classify — happy path per route", () => {
  it("blueprint: drawing with title block + GD&T + dim → route=blueprint, confidence>0.30", () => {
    const c = eng.classify({
      text: "DRAWING NO 12345-REV-B  SCALE 2:1  TOLERANCE ±0.05  drawn by JMR  Ø12.7mm  ⌖0.02 datum A",
      extractedData: { measurements: ["12.7mm", "0.05mm", "0.02mm"], partNumbers: ["12345-REV-B"], numbers: [], dates: [], toolCodes: [] },
      ocrConfidence: 0.92,
    });
    expect(c.route).toBe("blueprint");
    expect(c.confidence).toBeGreaterThan(0.30);
    expect(c.candidates.length).toBe(4);
  });

  it("insert-box: ISO 1832 designation + Sandvik brand → route=insert-box", () => {
    const c = eng.classify({
      text: "SANDVIK CoroTurn CNMG120408-PM  4325 grade  Carbide insert",
      extractedData: { partNumbers: ["CNMG120408-PM"], toolCodes: ["CNMG-120408"], numbers: [], dates: [], measurements: [] },
      ocrConfidence: 0.88,
    });
    expect(c.route).toBe("insert-box");
    expect(c.confidence).toBeGreaterThan(0.30);
  });

  it("tool-body: shank + end mill keywords + multiple tool codes → route=tool-body", () => {
    const c = eng.classify({
      text: "Iscar Indexable End Mill, Ø shank 25mm, 3-flute face mill body, taper shank",
      extractedData: { toolCodes: ["EM-25-3F", "FM-50-4F"], partNumbers: [], numbers: [], dates: [], measurements: [] },
      ocrConfidence: 0.85,
    });
    expect(c.route).toBe("tool-body");
    expect(c.confidence).toBeGreaterThan(0.30);
  });

  it("machine-service-tag: Haas + S/N + Model → route=machine-service-tag", () => {
    const c = eng.classify({
      text: "HAAS Automation Inc  Model VF-2  S/N: 1098761  Spindle HP: 30  Voltage: 230V 3-phase",
      extractedData: { numbers: [], dates: [], measurements: [], toolCodes: [], partNumbers: [] },
      ocrConfidence: 0.90,
    });
    expect(c.route).toBe("machine-service-tag");
    expect(c.confidence).toBeGreaterThan(0.30);
  });
});

describe("CameraIntakeRouterEngine.classify — failure modes (R12 fail-loud)", () => {
  it("empty text → route=unknown with reason=empty-or-missing-text, confidence=0", () => {
    const c = eng.classify({ text: "" });
    expect(c.route).toBe("unknown");
    expect(c.reason).toBe("empty-or-missing-text");
    expect(c.confidence).toBe(0);
    expect(c.candidates.length).toBe(0);
  });

  it("whitespace-only text → route=unknown reason=empty-or-missing-text", () => {
    const c = eng.classify({ text: "   \n\t  " });
    expect(c.route).toBe("unknown");
    expect(c.reason).toBe("empty-or-missing-text");
  });

  it("noise text with no route features → route=unknown with reason", () => {
    const c = eng.classify({ text: "lorem ipsum dolor sit amet consectetur adipiscing" });
    expect(c.route).toBe("unknown");
    expect(c.reason).toMatch(/no-route-features-matched|below-min-confidence/);
  });

  it("missing input object → route=unknown reason=empty-or-missing-text (no crash)", () => {
    // @ts-expect-error testing runtime guard
    const c = eng.classify(null);
    expect(c.route).toBe("unknown");
    expect(c.reason).toBe("empty-or-missing-text");
  });
});

describe("CameraIntakeRouterEngine.classify — adversarial inputs", () => {
  it("NaN ocrConfidence → still classifies on text features; blueprint text → blueprint route", () => {
    const c = eng.classify({
      text: "DRAWING NO 999  SCALE 1:1  Ø10mm  Ø20mm  Ø30mm  tolerance ±0.05",
      ocrConfidence: NaN,
    });
    expect(c.route).toBe("blueprint");
    expect(c.confidence).toBeGreaterThan(0);
  });

  it("Infinity ocrConfidence → still classifies; service-tag text → service-tag route", () => {
    const c = eng.classify({
      text: "HAAS Model VF-2 S/N: 1098761 Spindle HP 30",
      ocrConfidence: Infinity,
    });
    expect(c.route).toBe("machine-service-tag");
    expect(c.confidence).toBeGreaterThan(0);
  });

  it("oversized text (10K chars) does not crash; SANDVIK CNMG signal still routed to insert-box", () => {
    const filler = "X".repeat(10000);
    const c = eng.classify({
      text: `SANDVIK CNMG120408 ${filler}`,
    });
    expect(c.route).toBe("insert-box");
  });
});

describe("CameraIntakeRouterEngine.classify — tie-breaker specificity rule", () => {
  it("near-tie blueprint vs insert-box → more-specific insert-box wins (specificity rule)", () => {
    const c = eng.classify({
      text: "rev a SANDVIK CNMG120408 sheet 1 of 1",
      extractedData: { partNumbers: ["CNMG120408"], numbers: [], dates: [], measurements: [], toolCodes: [] },
    });
    expect(c.route).toBe("insert-box");
  });

  it("service-tag features outweigh blueprint shell → service-tag route, not blueprint", () => {
    const c = eng.classify({
      text: "MAZAK INTEGREX i-200 S/N: 2026-A123 sheet 2 of 2 SCALE 1:1",
    });
    expect(c.route).toBe("machine-service-tag");
  });
});

describe("CameraIntakeRouterEngine.classify — spanning machine classes (R12 variability)", () => {
  it("Haas VF mill service tag → machine-service-tag", () => {
    const c = eng.classify({ text: "HAAS Automation S/N: 1098761 Model VF-4 Spindle HP 40" });
    expect(c.route).toBe("machine-service-tag");
  });

  it("Sodick wire-EDM service tag → machine-service-tag", () => {
    const c = eng.classify({ text: "SODICK AQ327L S/N: SD-7891 Serial Number Mfg date 2026-04" });
    expect(c.route).toBe("machine-service-tag");
  });

  it("Hurco mill service tag → machine-service-tag", () => {
    const c = eng.classify({ text: "HURCO VM-1 Model VM-1 Serial No 56781 Voltage 230" });
    expect(c.route).toBe("machine-service-tag");
  });
});

describe("CameraIntakeRouterEngine.classify — evidence + provenance for U-QP07 chat-router", () => {
  it("chosen candidate's matched[] cites the specific signals that fired", () => {
    const c = eng.classify({
      text: "HAAS Model VF-2 S/N: 1098761 Spindle HP 30",
    });
    expect(c.route).toBe("machine-service-tag");
    const chosen = c.candidates.find((e) => e.route === "machine-service-tag");
    expect(chosen?.route).toBe("machine-service-tag");
    expect(chosen?.matched.some((m) => m === "builder:haas")).toBe(true);
    expect(chosen?.matched.includes("pattern:serial")).toBe(true);
    expect(chosen?.matched.includes("pattern:model")).toBe(true);
  });

  it("confidence is downscaled by OCR quality signal — hi quality > lo quality, same route", () => {
    const text = "DRAWING NO 12345 SCALE 1:1 Ø10mm Ø20mm Ø30mm tolerance ±0.05";
    const hi = eng.classify({ text, ocrConfidence: 0.95 });
    const lo = eng.classify({ text, ocrConfidence: 0.30 });
    expect(hi.route).toBe("blueprint");
    expect(lo.route).toBe("blueprint");
    expect(hi.confidence).toBeGreaterThan(lo.confidence);
  });

  it("all 4 routes always evaluated and sorted by rawScore descending", () => {
    const c = eng.classify({
      text: "DRAWING NO 12345  Ø10mm  Ø20mm  Ø30mm",
    });
    expect(c.candidates.length).toBe(4);
    const scores = c.candidates.map((e) => e.rawScore);
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });
});

describe("CameraIntakeRouterEngine.routeOnly — convenience API", () => {
  it("returns identical route + confidence values as classify() for known input", () => {
    const input: CameraIntakeInput = { text: "SANDVIK CNMG120408 carbide insert" };
    const full = eng.classify(input);
    const slim = eng.routeOnly(input);
    expect(slim.route).toBe(full.route);
    expect(slim.route).toBe("insert-box");
    expect(slim.confidence).toBe(full.confidence);
  });
});
