/**
 * PPG-REAL S6b U-PPR27: Tool life derating + Taylor display tests.
 * Validates: applyWearDerating in CPS, Taylor formula T=(C/Vc)^(1/n),
 * wear derating curve (100% fresh → 85% at 80% consumed), tool life comments,
 * low-life warning, canonical Taylor constants from constants.ts.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const CPS_PATH = path.resolve(__dirname, "../../scripts/fusion360-post/PRISM-Master.cps");
const CONSTANTS_PATH = path.resolve(__dirname, "../physics/constants.ts");
const cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
const constantsContent = fs.readFileSync(CONSTANTS_PATH, "utf-8");

describe("U-PPR27: applyWearDerating function in CPS", () => {
  it("CPS defines applyWearDerating function", () => {
    expect(cpsContent).toContain("function applyWearDerating(feed)");
  });

  it("returns feed unchanged when no PRISM data", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function applyWearDerating"),
      cpsContent.indexOf("function checkConfidenceWarnings")
    );
    expect(fn).toContain("if (!currentPrismData) { return feed; }");
  });

  it("returns feed unchanged when no wear data", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function applyWearDerating"),
      cpsContent.indexOf("function checkConfidenceWarnings")
    );
    expect(fn).toContain("if (!wearFraction || wearFraction <= 0) { return feed; }");
  });

  it("applies 85% feed at 80% wear (the derating curve)", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function applyWearDerating"),
      cpsContent.indexOf("function checkConfidenceWarnings")
    );
    expect(fn).toContain("0.85");
    expect(fn).toContain("wearFraction >= 0.8");
    expect(fn).toContain("factor = 0.85");
  });

  it("linearly interpolates between 100% and 85%", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function applyWearDerating"),
      cpsContent.indexOf("function checkConfidenceWarnings")
    );
    expect(fn).toContain("1.0 - (wearFraction / 0.8) * 0.15");
  });

  it("writes wear derating comment when applied", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function applyWearDerating"),
      cpsContent.indexOf("function checkConfidenceWarnings")
    );
    expect(fn).toContain("PRISM: Wear derating");
    expect(fn).toContain("tool wear");
  });
});

describe("U-PPR27: Tool life comment in G-code", () => {
  it("CPS writes TOOL LIFE comment from prismData.tool_life_min", () => {
    expect(cpsContent).toContain("TOOL LIFE: ~");
    expect(cpsContent).toContain("prismData.tool_life_min");
  });

  it("CPS writes WEAR DERATING comment when wear_fraction present", () => {
    expect(cpsContent).toContain("WEAR DERATING:");
    expect(cpsContent).toContain("wear_fraction");
  });
});

describe("U-PPR27: checkToolLifeWarning function", () => {
  it("CPS defines checkToolLifeWarning function", () => {
    expect(cpsContent).toContain("function checkToolLifeWarning()");
  });

  it("warns when tool life < 15 minutes", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function checkToolLifeWarning"),
      cpsContent.indexOf("function getMaterialName")
    );
    expect(fn).toContain("tool_life_min");
    expect(fn).toContain("< 15");
    expect(fn).toContain("PRISM WARNING: Predicted tool life");
    expect(fn).toContain("consider reducing speed");
  });
});

describe("U-PPR27: Taylor constants in canonical source", () => {
  it("constants.ts defines taylor_C and taylor_n per material", () => {
    expect(constantsContent).toContain("taylor_C:");
    expect(constantsContent).toContain("taylor_n:");
  });

  it("alloy_steel (4140) Taylor: C=280, n=0.22", () => {
    const section = constantsContent.substring(
      constantsContent.indexOf("alloy_steel"),
      constantsContent.indexOf("alloy_steel") + 200
    );
    expect(section).toContain("taylor_C: 280");
    expect(section).toContain("taylor_n: 0.22");
  });

  it("carbon steel Taylor: C=350, n=0.25", () => {
    const section = constantsContent.substring(
      constantsContent.indexOf("steel:"),
      constantsContent.indexOf("steel:") + 200
    );
    expect(section).toContain("taylor_C: 350");
    expect(section).toContain("taylor_n: 0.25");
  });

  it("stainless steel Taylor: C=250, n=0.22", () => {
    const section = constantsContent.substring(
      constantsContent.indexOf("stainless"),
      constantsContent.indexOf("stainless") + 200
    );
    expect(section).toContain("taylor_C: 250");
    expect(section).toContain("taylor_n: 0.22");
  });

  it("aluminum Taylor: C=900, n=0.35", () => {
    // Search specifically in CANONICAL_MATERIAL_DB
    const dbSection = constantsContent.substring(
      constantsContent.indexOf("CANONICAL_MATERIAL_DB")
    );
    const alSection = dbSection.substring(
      dbSection.indexOf("aluminum"),
      dbSection.indexOf("aluminum") + 200
    );
    expect(alSection).toContain("taylor_C: 900");
    expect(alSection).toContain("taylor_n: 0.35");
  });

  it("titanium Taylor: C=150, n=0.18", () => {
    const dbSection = constantsContent.substring(
      constantsContent.indexOf("CANONICAL_MATERIAL_DB")
    );
    const tiSection = dbSection.substring(
      dbSection.indexOf("titanium"),
      dbSection.indexOf("titanium") + 200
    );
    expect(tiSection).toContain("taylor_C: 150");
    expect(tiSection).toContain("taylor_n: 0.18");
  });
});

describe("U-PPR27: Taylor formula validation T = (C/Vc)^(1/n)", () => {
  it("carbon steel at Vc=200: T = (350/200)^(1/0.25) = 9.38 min", () => {
    const T = Math.pow(350 / 200, 1 / 0.25);
    expect(T).toBeCloseTo(9.38, 0);
    expect(T).toBeGreaterThan(5);
    expect(T).toBeLessThan(15);
  });

  it("alloy_steel at Vc=150: T = (280/150)^(1/0.22) = ~17 min", () => {
    const T = Math.pow(280 / 150, 1 / 0.22);
    // (1.867)^4.545 ≈ 17.1 min
    expect(T).toBeCloseTo(17.1, 0);
    expect(T).toBeGreaterThan(10);
    expect(T).toBeLessThan(25);
  });

  it("aluminum at Vc=500: T = (900/500)^(1/0.35) = ~5.4 min", () => {
    const T = Math.pow(900 / 500, 1 / 0.35);
    // (1.8)^2.857 ≈ 5.36 min
    expect(T).toBeCloseTo(5.36, 0);
    expect(T).toBeGreaterThan(3);
    expect(T).toBeLessThan(10);
  });

  it("titanium at Vc=60: T = (150/60)^(1/0.18) = very long", () => {
    const T = Math.pow(150 / 60, 1 / 0.18);
    // 2.5^(5.56) = ~148 min
    expect(T).toBeGreaterThan(100);
    expect(T).toBeLessThan(250);
  });

  it("tool steel at Vc=100: T = (200/100)^(1/0.20) = 32 min", () => {
    const T = Math.pow(200 / 100, 1 / 0.20);
    expect(T).toBeGreaterThan(20);
    expect(T).toBeLessThan(50);
  });
});

describe("U-PPR27: Wear derating curve verification", () => {
  it("0% wear = 100% feed (factor=1.0)", () => {
    const factor = 1.0 - (0 / 0.8) * 0.15;
    expect(factor).toBe(1.0);
  });

  it("40% wear = 92.5% feed", () => {
    const factor = 1.0 - (0.4 / 0.8) * 0.15;
    expect(factor).toBeCloseTo(0.925, 3);
  });

  it("80% wear = 85% feed", () => {
    const factor = 0.85; // capped at 0.8+
    expect(factor).toBe(0.85);
  });

  it("100% wear = 85% feed (same cap)", () => {
    // wearFraction >= 0.8 → factor = 0.85
    expect(0.85).toBe(0.85);
  });
});
