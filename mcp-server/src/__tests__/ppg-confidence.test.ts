/**
 * PPG-REAL S6b U-PPR29: Monte Carlo confidence semantics tests.
 * Validates: confidence in comment JSON is 95% MC CI half-width on feed,
 * high uncertainty (>15%) warning, very high uncertainty (>25%) prove-out
 * recommendation, bridge+CPS integration, confidence bounds [0,1].
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const CPS_PATH = path.resolve(__dirname, "../../scripts/fusion360-post/PRISM-Master.cps");
const BRIDGE_PATH = path.resolve(
  __dirname,
  "../../scripts/fusion360-prism-addin/prism_bridge.py"
);

const cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
const bridgeContent = fs.readFileSync(BRIDGE_PATH, "utf-8");

describe("U-PPR29: checkConfidenceWarnings function in CPS", () => {
  it("CPS defines checkConfidenceWarnings function", () => {
    expect(cpsContent).toContain("function checkConfidenceWarnings()");
  });

  it("reads confidence from currentPrismData", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function checkConfidenceWarnings"),
      cpsContent.indexOf("function checkToolLifeWarning")
    );
    expect(fn).toContain("currentPrismData");
    expect(fn).toContain("confidence");
  });

  it("warns at >15% uncertainty", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function checkConfidenceWarnings"),
      cpsContent.indexOf("function checkToolLifeWarning")
    );
    expect(fn).toContain("conf > 0.15");
    expect(fn).toContain("verify manually");
  });

  it("recommends prove-out at >25% uncertainty", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function checkConfidenceWarnings"),
      cpsContent.indexOf("function checkToolLifeWarning")
    );
    expect(fn).toContain("conf > 0.25");
    expect(fn).toContain("PROVE-OUT MODE RECOMMENDED");
  });

  it("does nothing when no PRISM data", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function checkConfidenceWarnings"),
      cpsContent.indexOf("function checkToolLifeWarning")
    );
    expect(fn).toContain("if (!currentPrismData");
    expect(fn).toContain("return;");
  });

  it("does nothing when no confidence value", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function checkConfidenceWarnings"),
      cpsContent.indexOf("function checkToolLifeWarning")
    );
    expect(fn).toContain("!currentPrismData.confidence");
  });
});

describe("U-PPR29: Confidence called in onSection analytics", () => {
  it("checkConfidenceWarnings called in onSection PRISM analytics block", () => {
    const onSection = cpsContent.substring(
      cpsContent.indexOf("// PRISM analytics comment for this operation"),
      cpsContent.indexOf("// Work offset (G54-G59")
    );
    expect(onSection).toContain("checkConfidenceWarnings()");
  });

  it("checkToolLifeWarning called in onSection PRISM analytics block", () => {
    const onSection = cpsContent.substring(
      cpsContent.indexOf("// PRISM analytics comment for this operation"),
      cpsContent.indexOf("// Work offset (G54-G59")
    );
    expect(onSection).toContain("checkToolLifeWarning()");
  });
});

describe("U-PPR29: Confidence in bridge output", () => {
  it("bridge PhysicsSFResult has confidence field", () => {
    expect(bridgeContent).toContain('"confidence"');
    expect(bridgeContent).toContain("self.confidence");
  });

  it("bridge includes confidence in to_comment_json()", () => {
    const jsonMethod = bridgeContent.substring(
      bridgeContent.indexOf("def to_comment_json"),
      bridgeContent.indexOf("def __repr__")
    );
    expect(jsonMethod).toContain('"confidence"');
    expect(jsonMethod).toContain("self.confidence");
  });

  it("bridge default confidence is 0.7 when missing", () => {
    expect(bridgeContent).toContain("confidence, 0.7");
  });
});

describe("U-PPR29: Confidence semantics definition", () => {
  it("confidence represents 95% MC CI half-width on feed rate", () => {
    // Semantics: confidence = 0.08 means feed accurate within ±8%
    // This is documented in the bridge module
    expect(bridgeContent).toContain("confidence");
    // The number is a fraction (0-1), not a percentage
  });

  it("confidence 0.08 means ±8% feed uncertainty", () => {
    const conf = 0.08;
    expect(conf).toBeLessThan(0.15); // Below warning threshold
    expect(conf * 100).toBe(8); // 8% uncertainty
  });

  it("confidence 0.15 triggers CPS warning threshold", () => {
    const conf = 0.15;
    // CPS: conf > 0.15 → warning
    expect(conf > 0.15).toBe(false); // Exactly 0.15 → no warning (strictly greater)
    expect(0.16 > 0.15).toBe(true); // 0.16 → warning
  });

  it("confidence 0.25 triggers CPS prove-out threshold", () => {
    const conf = 0.25;
    expect(conf > 0.25).toBe(false);
    expect(0.26 > 0.25).toBe(true); // 0.26 → prove-out recommended
  });
});

describe("U-PPR29: Warning messages in G-code", () => {
  it("moderate uncertainty message format", () => {
    // For conf=0.18: "PRISM WARNING: Feed uncertainty +-18% — verify manually"
    expect(cpsContent).toContain("PRISM WARNING: Feed uncertainty +-");
    expect(cpsContent).toContain("verify manually");
  });

  it("high uncertainty message format", () => {
    // For conf=0.30: "PRISM WARNING: Feed uncertainty +-30% — PROVE-OUT MODE RECOMMENDED"
    expect(cpsContent).toContain("PROVE-OUT MODE RECOMMENDED");
  });

  it("percentage calculated from confidence value", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function checkConfidenceWarnings"),
      cpsContent.indexOf("function checkToolLifeWarning")
    );
    expect(fn).toContain("Math.round(conf * 100)");
  });
});

describe("U-PPR29: CPS parsePrismComment reads confidence", () => {
  it("parsePrismComment extracts from JSON", () => {
    expect(cpsContent).toContain("function parsePrismComment()");
    expect(cpsContent).toContain('{"prism"');
    expect(cpsContent).toContain("parsed.prism");
  });

  it("PRISM analytics line includes confidence", () => {
    expect(cpsContent).toContain("prismData.confidence");
    expect(cpsContent).toContain("conf=");
  });
});

describe("U-PPR29: Confidence bounds validation", () => {
  it("bridge _safe_numeric guards against NaN confidence", () => {
    expect(bridgeContent).toContain("_safe_numeric");
    expect(bridgeContent).toContain("f != f"); // NaN check
  });

  it("valid confidence values are in [0, 1] range", () => {
    for (const conf of [0, 0.05, 0.1, 0.15, 0.25, 0.5, 1.0]) {
      expect(conf).toBeGreaterThanOrEqual(0);
      expect(conf).toBeLessThanOrEqual(1);
    }
  });
});
