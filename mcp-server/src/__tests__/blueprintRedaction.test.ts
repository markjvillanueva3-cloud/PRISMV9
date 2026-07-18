// mcp-server/src/__tests__/blueprintRedaction.test.ts
//
// U-APP-REDACT-LIB -- privacy-critical coverage for the shared blueprint customer-identity redactor.
// A false NEGATIVE here leaks a JM customer's identity on an exported/shared drawing, so the suite
// weights adversarial leak cases + the over-redaction guard (full-118 names that are common words).

import { describe, it, expect } from "vitest";
import {
  MASK,
  CORE_CUSTOMER_NAMES,
  CORE_CUSTOMER_PATTERNS,
  PART_NUMBER_PATTERNS,
  ANONYMIZATION_PATTERNS,
  CUSTOMER_IDENTITY_KEYS,
  buildCustomerPatterns,
  getAllCustomerNames,
  applyAnonymizationPatterns,
  redactText,
  redactExtraction,
  looksLikeMaterialGrade,
  redactionRegions,
} from "../engines/blueprint-vision/blueprintRedaction.js";

describe("blueprintRedaction -- free-text customer scrub (CORE)", () => {
  it("masks every CORE customer name, case-insensitively", () => {
    for (const name of CORE_CUSTOMER_NAMES) {
      const r = redactText(`MADE FOR ${name} INC`);
      expect(r.text).not.toContain(name);
      expect(r.text).toContain(MASK);
    }
    // mixed case
    expect(redactText("part for Alcoa division").text).toBe(`part for ${MASK} division`);
    expect(redactText("alcoa").text).toBe(MASK);
  });

  it("is separator-tolerant: HOLO-KROME / HOLO KROME / HOLOKROME all masked", () => {
    expect(redactText("HOLO-KROME").text).toBe(MASK);
    expect(redactText("HOLO KROME").text).toBe(MASK);
    expect(redactText("HOLOKROME").text).toBe(MASK);
    expect(redactText("for CONTINENTAL_MIDLAND today").text).toBe(`for ${MASK} today`);
  });

  it("WORD-BOUNDARY: does not over-mask a customer substring inside another word", () => {
    // "WHITWORTH" contains "ITW"; "SFSX" contains "SFS" -- \b...\b must NOT match these.
    expect(redactText("WHITWORTH THREAD").text).toBe("WHITWORTH THREAD");
    expect(redactText("SFSX BOLT").text).toBe("SFSX BOLT");
  });

  it("masks part numbers (both shapes)", () => {
    expect(redactText("PN ABC-1234 here").text).toBe(`PN ${MASK} here`);
    expect(redactText("PN 12345-AB here").text).toBe(`PN ${MASK} here`);
  });

  it("returns an audit of what was matched", () => {
    const r = redactText("FOR ALCOA PART ABC-1234");
    const types = r.redactions.map((x) => x.type).sort();
    expect(types).toEqual(["customer-text", "part-number"]);
  });

  it("OVER-REDACTION GUARD: default mode does NOT mask common-word / short-acronym customers in free text", () => {
    // these are JM customers but ALSO common drawing words / acronyms; the distinctive-tier guard MUST
    // leave them intact so legit notes survive (they are still caught on the structured-field path).
    expect(redactText("ACME THREAD 1/2-13").text).toBe("ACME THREAD 1/2-13");
    expect(redactText("ELECTRODE GAP NOTE").text).toBe("ELECTRODE GAP NOTE");
    expect(redactText("AIR BLOW REQUIRED").text).toBe("AIR BLOW REQUIRED");
    expect(redactText("USE ATF FLUID").text).toBe("USE ATF FLUID");                   // 3-char acronym (fluid)
    expect(redactText("SHIP TO NORTHEAST DOCK").text).toBe("SHIP TO NORTHEAST DOCK"); // geographic ship-to word
    expect(redactText("CFC COATING").text).toBe("CFC COATING");                       // <=3-char non-CORE acronym
  });

  it("DEFAULT (distinctive) masks distinctive non-CORE registry customers in free text (P1 leak fix)", () => {
    // SEMBLEX / TOPURA / STALCOP are distinctive single-word registry customers -> masked by default.
    expect(redactText("RUN FOR SEMBLEX").text).toBe(`RUN FOR ${MASK}`);
    expect(redactText("part for TOPURA AMERICA").text).toBe(`part for ${MASK} AMERICA`);
    expect(redactText("STALCOP JOB").text).toBe(`${MASK} JOB`);
  });

  it("aggressive mode ALSO masks common-word customers (opt-in, over-redaction accepted)", () => {
    expect(redactText("ACME THREAD").text).toBe("ACME THREAD");                          // default: preserved
    expect(redactText("ACME THREAD", { aggressive: true }).text).toBe(`${MASK} THREAD`); // aggressive: masked
  });

  it("audit omits cleartext by default; includes it only with auditCleartext (P2 fix)", () => {
    // default audit carries NO cleartext (safe to log) -- exact shape, not a presence check
    expect(redactText("FOR ALCOA").redactions).toEqual([{ type: "customer-text" }]);
    expect(redactText("FOR ALCOA", { auditCleartext: true }).redactions).toEqual([{ type: "customer-text", match: "ALCOA" }]);
  });

  it("empty / non-string input is safe", () => {
    expect(redactText("").text).toBe("");
    expect(redactText(null).text).toBe("");
    expect(redactText(undefined).text).toBe("");
    expect(redactText(42).text).toBe("42");
  });
});

describe("blueprintRedaction -- redactExtraction (structured app mechanism)", () => {
  const extraction = {
    title_block: { customer: "ACME", company: "ITW SHAKEPROOF", material: "4140", part_number: "ABC-1234", scale: "1:1" },
    notes: ["MADE FOR ALCOA", "0.5 DIA THRU", "DEBURR ALL EDGES"],
    dimensions: [{ value_mm: 12.7, type: "diameter" }],
  };

  it("masks customer-identity FIELDS wholesale -- even a common-word customer like ACME", () => {
    const { extraction: red } = redactExtraction(extraction);
    const tb = red.title_block as Record<string, unknown>;
    expect(tb.customer).toBe(MASK);        // ACME the CUSTOMER is masked via the field (not name-match)
    expect(tb.company).toBe(MASK);
    expect(tb.part_number).toBe(MASK);
    expect(tb.material).toBe("4140");      // non-identity field preserved
    expect(tb.scale).toBe("1:1");
  });

  it("scrubs free-text notes with CORE patterns; preserves legit dimension notes", () => {
    const { extraction: red } = redactExtraction(extraction);
    const notes = red.notes as string[];
    expect(notes[0]).toBe(`MADE FOR ${MASK}`); // only the customer name ALCOA is masked, "MADE FOR" preserved
    expect(notes[1]).toBe("0.5 DIA THRU");     // legit dim note untouched
    expect(notes[2]).toBe("DEBURR ALL EDGES");
  });

  it("does NOT mutate the input (deep copy)", () => {
    const before = JSON.stringify(extraction);
    redactExtraction(extraction);
    expect(JSON.stringify(extraction)).toBe(before);
    expect((extraction.title_block as { customer: string }).customer).toBe("ACME");
  });

  it("preserves non-string leaf values (numbers/booleans/null)", () => {
    const { extraction: red } = redactExtraction({ a: 12.7, b: true, c: null, d: { customer: "ITW" } });
    expect(red.a).toBe(12.7);
    expect(red.b).toBe(true);
    expect(red.c).toBe(null);
    expect((red.d as { customer: string }).customer).toBe(MASK);
  });

  it("ADVERSARIAL LEAK: a customer name nested in a deep notes array must NOT survive", () => {
    const deep = { sections: [{ blocks: [{ text: "drawing for itw shakeproof co" }] }] };
    const { extraction: red, redactions } = redactExtraction(deep);
    const leaked = JSON.stringify(red).toLowerCase().includes("itw");
    expect(leaked).toBe(false);
    expect(redactions.some((r) => r.type === "customer-text")).toBe(true);
  });

  it("records an audit with field paths for masked identity fields", () => {
    const { redactions } = redactExtraction(extraction);
    const fields = redactions.filter((r) => r.type === "customer-field").map((r) => r.field);
    expect(fields).toContain("title_block.customer");
    expect(fields).toContain("title_block.company");
  });

  it("P1 LEAK FIX: masks a distinctive customer in a NON-identity free-text field + extended identity keys", () => {
    const { extraction: red } = redactExtraction({
      title_block: { drawing_title: "FIXTURE FOR SEMBLEX", buyer: "TOPURA", work_order: "WO-5521", material: "4140" },
      notes: ["RUN FOR STALCOP"],
    });
    const tb = red.title_block as Record<string, unknown>;
    expect(tb.drawing_title).toBe(`FIXTURE FOR ${MASK}`); // distinctive customer in a non-identity field -> scrubbed
    expect(tb.buyer).toBe(MASK);                          // extended identity key -> masked wholesale
    expect(tb.work_order).toBe(MASK);                     // extended identity key -> masked wholesale
    expect(tb.material).toBe("4140");                     // legit field preserved
    expect((red.notes as string[])[0]).toBe(`RUN FOR ${MASK}`);
  });

  it("P1 OVER-REDACTION FIX: a hyphenated material grade passes through verbatim + registers ZERO redactions", () => {
    // "AISI-1045"/"SAE-4340"/"AL-6061"/"SS-304"/"C-1018" match the part-number shape [A-Z]{1,4}-\d{3,6}
    // but are MATERIAL GRADES, not part numbers -> scrubbing them corrupts a legit field AND false-flags a
    // clean PII-free part as redact-eligible (over-redaction). The NON_PII_VALUE_KEYS exemption fixes both.
    for (const grade of ["AISI-1045", "SAE-4340", "AL-6061", "SS-304", "C-1018"]) {
      const { extraction: red, redactions } = redactExtraction({
        title_block: { material: grade, revision: "REV-A", units: "in", scale: "1:2" },
        dimensions: [{ value_mm: 10, type: "linear" }],
      });
      const tb = red.title_block as Record<string, unknown>;
      expect(tb.material).toBe(grade);   // preserved verbatim, NOT MASK
      expect(redactions.length).toBe(0); // a clean PII-free part registers zero redactions
    }
  });

  it("over-redaction guard does NOT weaken identity masking: a real customer alongside a material grade is still masked", () => {
    // the exemption is scoped to non-identity spec keys -- a genuine customer/part-number still masks.
    const { extraction: red, redactions } = redactExtraction({
      title_block: { customer: "SEMBLEX", material: "AISI-1045", part_number: "XY-9981" },
    });
    const tb = red.title_block as Record<string, unknown>;
    expect(tb.customer).toBe(MASK);       // identity still masked
    expect(tb.part_number).toBe(MASK);    // identity still masked
    expect(tb.material).toBe("AISI-1045"); // material grade preserved despite the hyphen shape
    expect(redactions.length).toBeGreaterThan(0);
  });

  it("P1 UNDER-REDACTION FIX (3-of-3 arm C): an EMBEDDED customer name / part number in a spec field IS still masked", () => {
    // a blanket spec-key pass-through would LEAK a customer name in a mislabeled spec value -- the
    // dangerous direction. The value-aware protectGrades masks embedded PII while preserving a clean grade.
    const { extraction: red, redactions } = redactExtraction({
      title_block: {
        material: "4140 PER ITW SPEC",     // embedded CORE customer -> masked
        finish: "ANODIZE FOR OPTIMAS",      // embedded CORE customer -> masked
        coating: "ZINC PLATE PER SEMBLEX",  // embedded distinctive customer -> masked
        material_spec: "STEEL ABC-1234",    // embedded real part number (non-material prefix) -> masked
        grade: "AISI-1045",                 // clean material grade -> preserved
      },
    });
    const tb = red.title_block as Record<string, unknown>;
    expect(tb.material).toContain(MASK);
    expect(tb.material).not.toMatch(/ITW/i);
    expect(tb.finish).not.toMatch(/OPTIMAS/i);
    expect(tb.coating).not.toMatch(/SEMBLEX/i);
    expect(tb.material_spec).toContain(MASK);          // a real embedded part number is still masked
    expect(tb.material_spec).not.toMatch(/ABC-1234/);
    expect(tb.grade).toBe("AISI-1045");                // clean grade preserved (no over-redaction)
    expect(redactions.length).toBeGreaterThan(0);
  });

  it("a spec field whose WHOLE value is a customer name is masked (not passed through verbatim)", () => {
    const { extraction: red } = redactExtraction({ title_block: { finish: "ITW", size: "ALCOA" } });
    const tb = red.title_block as Record<string, unknown>;
    expect(tb.finish).toBe(MASK);   // whole-value customer -> masked
    expect(tb.size).toBe(MASK);
  });
});

describe("blueprintRedaction -- looksLikeMaterialGrade (part-number-shape vs material grade)", () => {
  it("TRUE for material grades that share the part-number shape", () => {
    for (const g of ["AISI-1045", "SAE-4340", "AL-6061", "SS-304", "C-1018", "UNS-3160", "CR-1018"]) {
      expect(looksLikeMaterialGrade(g)).toBe(true);
    }
    expect(looksLikeMaterialGrade("ss-304")).toBe(true);        // case-insensitive
    expect(looksLikeMaterialGrade("  AISI-1045  ")).toBe(true); // trimmed
  });

  it("FALSE for real part numbers (non-material prefix) + 5-6 digit tokens + non-matching shapes", () => {
    // ABC/XY/D/PART/FOO are not material prefixes; AISI-10456 has 5 digits (-> part number, not a grade);
    // MS (Military-Standard part prefix) + HR/CD (process abbreviations) are deliberately excluded.
    for (const p of ["ABC-1234", "XY-9981", "D-12345", "AISI-10456", "PART-001", "FOO-12345", "MS-1010", "HR-1018", "CD-1018", "ITW", "4140", ""]) {
      expect(looksLikeMaterialGrade(p)).toBe(false);
    }
    expect(looksLikeMaterialGrade(undefined)).toBe(false); // never throws on non-string
    expect(looksLikeMaterialGrade(1045)).toBe(false);
  });
});

describe("blueprintRedaction -- customer-in-KEY leak (P2 scrutiny fix)", () => {
  it("ADVERSARIAL: a customer name used as an OBJECT KEY must NOT survive (per-customer map)", () => {
    const { extraction: red, redactions } = redactExtraction({ "ITW SHAKEPROOF": { qty: 5 }, "SEMBLEX": { qty: 2 } });
    const blob = JSON.stringify(red).toLowerCase();
    expect(blob.includes("itw")).toBe(false);
    expect(blob.includes("semblex")).toBe(false);
    expect(red[MASK]).toBeDefined();                          // a masked key now holds the first customer's value
    expect(redactions.some((r) => r.type === "customer-text")).toBe(true);
  });

  it("P1 fix: short-acronym / common-word customers ALSO masked as bare KEYS (full-registry, any tier)", () => {
    // ATF/PARKER/ACME are real JM customers the DISTINCTIVE free-text tier skips (acronym/common word) --
    // but a bare KEY that IS exactly one of them is unambiguous identity, so it must mask wholesale.
    const { extraction: red } = redactExtraction({ ATF: { qty: 1 }, PARKER: { qty: 2 }, ACME: { qty: 3 } });
    expect(Object.keys(red).every((k) => k.startsWith(MASK))).toBe(true);     // all three masked
    expect(JSON.stringify(red).toLowerCase()).not.toMatch(/atf|parker|acme/); // no identity survives
    expect(Object.values(red).map((v) => (v as { qty: number }).qty).sort()).toEqual([1, 2, 3]); // no value lost
  });

  it("collision-safe: two distinct customer KEYS do not silently drop a value", () => {
    const { extraction: red } = redactExtraction({ ITW: 1, ALCOA: 2 });
    const vals = Object.values(red).sort();
    expect(vals).toEqual([1, 2]);                             // BOTH values survive (no silent overwrite)
    expect(Object.keys(red).every((k) => k.startsWith(MASK))).toBe(true);
  });

  it("ordinary field-name keys are NOT mangled (they never match a customer-name pattern)", () => {
    const { extraction: red } = redactExtraction({ customer: "4140", material: "4140", notes: ["DEBURR"], qty: 3 });
    expect(Object.keys(red).sort()).toEqual(["customer", "material", "notes", "qty"]);
    expect(red.customer).toBe(MASK);                          // identity FIELD value still masked wholesale
    expect(red.material).toBe("4140");
  });
});

describe("blueprintRedaction -- short-acronym contract boundary (documented tradeoff)", () => {
  it("a <4-char non-CORE acronym customer passes through FREE TEXT but is masked on the FIELD path", () => {
    // free text: distinctive-tier guard leaves the short acronym intact (avoids mangling legit notes)
    expect(redactText("USE ATF FLUID").text).toBe("USE ATF FLUID");
    // structured field: the identity-field value is masked WHOLESALE regardless of the name length
    expect((redactExtraction({ title_block: { customer: "ATF" } }).extraction.title_block as { customer: string }).customer).toBe(MASK);
  });
});

describe("blueprintRedaction -- redactionRegions (image mask)", () => {
  it("returns the title_block region bbox, ignores other kinds", () => {
    const out = redactionRegions({
      regions: [
        { bbox: [0.6, 0.85, 0.4, 0.15], region_kind: "title_block", confidence: 0.98, valid: true },
        { bbox: [0, 0, 0.5, 0.5], region_kind: "drawing_view", confidence: 0.9, valid: true },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].region_kind).toBe("title_block");
    expect(out[0].bbox).toEqual([0.6, 0.85, 0.4, 0.15]);
    expect(out[0].confidence).toBe(0.98);
  });

  it("accepts a bare regions array and skips invalid/low-trust title blocks", () => {
    const out = redactionRegions([
      { bbox: [0.6, 0.85, 0.4, 0.15], region_kind: "title_block" },
      { bbox: [0.1, 0.1, 0.2, 0.2], region_kind: "title_block", valid: false },     // explicitly invalid -> skip
      { bbox: [1, 2, 3], region_kind: "title_block" },                               // malformed bbox -> skip
      { region_kind: "title_block" },                                                // no bbox -> skip
    ]);
    expect(out).toHaveLength(1);
  });

  it("empty / malformed input -> []", () => {
    expect(redactionRegions(null)).toEqual([]);
    expect(redactionRegions({})).toEqual([]);
    expect(redactionRegions("nope")).toEqual([]);
  });
});

describe("blueprintRedaction -- back-compat with the LoRA engine", () => {
  it("ANONYMIZATION_PATTERNS = CORE customer + part-number patterns", () => {
    expect(ANONYMIZATION_PATTERNS.length).toBe(CORE_CUSTOMER_PATTERNS.length + PART_NUMBER_PATTERNS.length);
  });

  it("applyAnonymizationPatterns masks the spec names with [REDACTED] (the engine contract)", () => {
    const body = "PART FOR ALCOA / ITW / HOLO-KROME PN ABC-1234";
    const out = applyAnonymizationPatterns(body);
    expect(out).not.toMatch(/ALCOA|ITW|HOLO-?KROME/);
    expect(out).toContain("[REDACTED]");
  });

  it("buildCustomerPatterns skips empty/blank names (no \\b\\b catch-all)", () => {
    const pats = buildCustomerPatterns(["", "  ", "ITW"]);
    expect(pats).toHaveLength(1);
  });

  it("getAllCustomerNames is the de-duped CORE union registry and includes the core names", () => {
    const all = getAllCustomerNames();
    expect(new Set(all).size).toBe(all.length); // de-duped
    for (const n of CORE_CUSTOMER_NAMES) expect(all).toContain(n);
    expect(all.length).toBeGreaterThan(CORE_CUSTOMER_NAMES.length); // registry adds more
  });

  it("CUSTOMER_IDENTITY_KEYS covers the obvious identity fields", () => {
    for (const k of ["customer", "company", "vendor", "part_number", "drawing_number"]) {
      expect(CUSTOMER_IDENTITY_KEYS).toContain(k);
    }
  });
});
