// npx vitest run src/__tests__/holder-categorization.test.ts
// Real-value assertions on the canonical CAM-agnostic holder taper × contact-type axis.
// Corrected per adversarial review: BCV=CAT (not BT), *_bigplus taper field is the dominant signal.
import { describe, it, expect } from "vitest";
import {
  CAT_TAPER_SIZES, BT_TAPER_SIZES, SK_TAPER_SIZES,
  HOLDER_CONTACT_TYPES, HOLDER_INTERFACE_FAMILIES,
  HolderCategorySchema, normalizeHolderDesignation, categorizeHolder,
} from "../data/holder-categorization.js";

describe("taper-size taxonomy (only sizes present in HOLDER_DB — no fabricated CAT35/BT60)", () => {
  it("CAT/BT/SK size lists match the engine DB exactly", () => {
    expect([...CAT_TAPER_SIZES]).toEqual([30, 40, 45, 50, 60]);
    expect([...BT_TAPER_SIZES]).toEqual([30, 35, 40, 45, 50]);
    expect([...SK_TAPER_SIZES]).toEqual([30, 40, 50]);
  });
});

describe("normalizeHolderDesignation — taper size axis", () => {
  it("every CAT size → {CAT, size, taper_only}", () => {
    for (const s of CAT_TAPER_SIZES) {
      expect(normalizeHolderDesignation(`CAT${s}`)).toEqual({
        interface: "CAT", taperSize: s, formSize: null, contactType: "taper_only", matched: `CAT${s}`,
      });
    }
  });
  it("every BT size → {BT, size, taper_only} (incl. the BT35 the DB carries but CAT does not)", () => {
    for (const s of BT_TAPER_SIZES) {
      expect(normalizeHolderDesignation(`BT${s}`)).toEqual({
        interface: "BT", taperSize: s, formSize: null, contactType: "taper_only", matched: `BT${s}`,
      });
    }
  });
  it("SK steep family → SK/taper_only", () => {
    expect(normalizeHolderDesignation("SK40")).toEqual({
      interface: "SK", taperSize: 40, formSize: null, contactType: "taper_only", matched: "SK40",
    });
  });
});

describe("normalizeHolderDesignation — contact-type axis (BIG-PLUS designations)", () => {
  it("BBT40 → BT + dual_contact_big_plus (BIG-PLUS on a BT taper)", () => {
    expect(normalizeHolderDesignation("BBT40")).toEqual({
      interface: "BT", taperSize: 40, formSize: null, contactType: "dual_contact_big_plus", matched: "BBT40",
    });
  });
  it("BCV50 → CAT + dual_contact_big_plus (BIG-PLUS on a CAT taper — corrected from the holders.json mislabel)", () => {
    expect(normalizeHolderDesignation("BCV50")).toEqual({
      interface: "CAT", taperSize: 50, formSize: null, contactType: "dual_contact_big_plus", matched: "BCV50",
    });
  });
  it("CV40 → CAT + taper_only (V-flange shorthand for CAT)", () => {
    expect(normalizeHolderDesignation("CV40")).toEqual({
      interface: "CAT", taperSize: 40, formSize: null, contactType: "taper_only", matched: "CV40",
    });
  });
  it("longest-prefix, start-anchored: BBT/BCV resolve to dual, NOT to bare BT/CV taper_only", () => {
    expect(normalizeHolderDesignation("BBT40")!.contactType).toBe("dual_contact_big_plus");
    expect(normalizeHolderDesignation("BCV40")!.interface).toBe("CAT");
    expect(normalizeHolderDesignation("BCV40")!.contactType).toBe("dual_contact_big_plus");
    // and the inverse: a bare BT40 must stay taper_only (no BIG-PLUS leakage backwards)
    expect(normalizeHolderDesignation("BT40")!.contactType).toBe("taper_only");
  });
});

describe("normalizeHolderDesignation — inherently-dual interfaces", () => {
  it("HSK-A63 → {HSK, taperSize null, formSize A63, inherently_dual}", () => {
    expect(normalizeHolderDesignation("HSK-A63")).toEqual({
      interface: "HSK", taperSize: null, formSize: "A63", contactType: "inherently_dual", matched: "HSKA63",
    });
  });
  it("CAPTO-C6 and bare C6 both → {CAPTO, formSize C6, inherently_dual}", () => {
    expect(normalizeHolderDesignation("CAPTO-C6")).toEqual({
      interface: "CAPTO", taperSize: null, formSize: "C6", contactType: "inherently_dual", matched: "C6",
    });
    expect(normalizeHolderDesignation("C6")).toEqual({
      interface: "CAPTO", taperSize: null, formSize: "C6", contactType: "inherently_dual", matched: "C6",
    });
  });
  it("KM63 / PSC63 → inherently_dual with form size", () => {
    expect(normalizeHolderDesignation("KM63")).toEqual({
      interface: "KM", taperSize: null, formSize: "KM63", contactType: "inherently_dual", matched: "KM63",
    });
    expect(normalizeHolderDesignation("PSC63")).toEqual({
      interface: "PSC", taperSize: null, formSize: "PSC63", contactType: "inherently_dual", matched: "PSC63",
    });
  });
});

describe("normalizeHolderDesignation — robustness", () => {
  it("separator tolerance: 'bbt 40' == 'BBT-40' == 'bbt_40' (all canonicalize identically)", () => {
    const a = normalizeHolderDesignation("bbt 40");
    const b = normalizeHolderDesignation("BBT-40");
    const c = normalizeHolderDesignation("bbt_40");
    const expected = { interface: "BT", taperSize: 40, formSize: null, contactType: "dual_contact_big_plus", matched: "BBT40" };
    expect(a).toEqual(expected);
    expect(b).toEqual(expected);
    expect(c).toEqual(expected);
  });
  it("size-validity gate: CAT99 keeps family but yields taperSize=null (size not in the DB → not fabricated)", () => {
    expect(normalizeHolderDesignation("CAT99")).toEqual({
      interface: "CAT", taperSize: null, formSize: null, contactType: "taper_only", matched: "CAT99",
    });
  });
  it("unparseable / empty / non-string designations resolve to the null sentinel (never fabricates a family)", () => {
    expect(normalizeHolderDesignation("XYZ99")).toBe(null);
    expect(normalizeHolderDesignation("")).toBe(null);
    // @ts-expect-error adversarial non-string input
    expect(normalizeHolderDesignation(null)).toBe(null);
    // @ts-expect-error adversarial numeric input
    expect(normalizeHolderDesignation(42)).toBe(null);
  });
});

describe("categorizeHolder — dominant *_bigplus signal (P0-3: a dual-contact holder must NOT ship as taper_only)", () => {
  it("plain CAT40 record whose `taper` field is 'cat40_bigplus' → dual_contact_big_plus", () => {
    expect(categorizeHolder({ interface: "CAT40", taper: "cat40_bigplus" })).toMatchObject({
      interface: "CAT", taperSize: 40, contactType: "dual_contact_big_plus",
    });
  });
  it("BT40 record whose name says 'BIG-PLUS BT40' → dual_contact_big_plus", () => {
    expect(categorizeHolder({ interface: "BT40", name: "BIG-PLUS BT40" })).toMatchObject({
      interface: "BT", taperSize: 40, contactType: "dual_contact_big_plus",
    });
  });
  it("a 'dual-contact' description flips a steep family from taper_only → dual", () => {
    expect(categorizeHolder({ interface: "CAT50", description: "simultaneous taper and face (dual-contact)" }).contactType)
      .toBe("dual_contact_big_plus");
  });
  it("plain CAT40 with NO bigplus signal stays taper_only", () => {
    expect(categorizeHolder({ interface: "CAT40" }).contactType).toBe("taper_only");
  });
  it("HSK record stays inherently_dual even with a stray bigplus token (its design contact wins)", () => {
    expect(categorizeHolder({ interface: "HSK-A63", taper: "hsk_bigplus" }).contactType).toBe("inherently_dual");
  });
});

describe("categorizeHolder — discriminator, licensing, fail-loud safety", () => {
  it("same taper / different contact: CAT40 (taper_only) and BCV40 (dual) share family+size but split on contact", () => {
    const plain = categorizeHolder("CAT40");
    const bigplus = categorizeHolder("BCV40");
    expect(plain).toMatchObject({ interface: "CAT", taperSize: 40, contactType: "taper_only" });
    expect(bigplus).toMatchObject({ interface: "CAT", taperSize: 40, contactType: "dual_contact_big_plus" });
  });
  it("bigPlusLicensed is set ONLY from an explicit flag — a bigplus token does NOT infer a license", () => {
    expect(categorizeHolder({ interface: "CAT40", taper: "cat40_bigplus" }).bigPlusLicensed).toBe(undefined);
    expect(categorizeHolder({ interface: "CAT40", taper: "cat40_bigplus", bigPlusLicensed: true }).bigPlusLicensed).toBe(true);
  });
  it("unparseable designation → fail-loud {unknown, unknown, low} (a valid object, not a throw)", () => {
    expect(categorizeHolder("ZZZ")).toMatchObject({
      interface: "unknown", taperSize: null, contactType: "unknown", confidence: "low",
    });
  });
  it("unparseable designation BUT an out-of-band bigplus signal → still flags dual_contact_big_plus", () => {
    expect(categorizeHolder({ interface: "ZZZ", taper: "zzz_bigplus" })).toMatchObject({
      interface: "unknown", contactType: "dual_contact_big_plus", confidence: "low",
    });
  });
  it("string-form categorization across all families produces the expected concrete shapes", () => {
    const cases: [string, Partial<ReturnType<typeof categorizeHolder>>][] = [
      ["CAT40", { interface: "CAT", taperSize: 40, contactType: "taper_only", confidence: "high" }],
      ["BBT40", { interface: "BT", taperSize: 40, contactType: "dual_contact_big_plus", confidence: "high" }],
      ["BCV50", { interface: "CAT", taperSize: 50, contactType: "dual_contact_big_plus", confidence: "high" }],
      ["HSK-A63", { interface: "HSK", taperSize: null, formSize: "A63", contactType: "inherently_dual", confidence: "high" }],
      ["C6", { interface: "CAPTO", taperSize: null, formSize: "C6", contactType: "inherently_dual", confidence: "high" }],
      ["KM63", { interface: "KM", taperSize: null, contactType: "inherently_dual", confidence: "high" }],
      ["ZZZ", { interface: "unknown", taperSize: null, contactType: "unknown", confidence: "low" }],
    ];
    for (const [d, exp] of cases) expect(categorizeHolder(d)).toMatchObject(exp);
  });
  it("enum constants are stable (downstream switch/exhaustiveness depends on these literals)", () => {
    expect(Object.values(HOLDER_CONTACT_TYPES)).toEqual(["taper_only", "dual_contact_big_plus", "inherently_dual", "unknown"]);
    expect(HOLDER_INTERFACE_FAMILIES.CAT).toBe("CAT");
    expect(HOLDER_INTERFACE_FAMILIES.CAPTO).toBe("CAPTO");
    // the schema accepts a canonical categorize() result verbatim (round-trip integrity)
    const parsed = HolderCategorySchema.parse(categorizeHolder("BCV50"));
    expect(parsed).toMatchObject({ interface: "CAT", taperSize: 50, contactType: "dual_contact_big_plus" });
  });
});
