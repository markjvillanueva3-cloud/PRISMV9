/**
 * X12EdiSegmentParserFormula.test.ts — hotel iter20 / G6 close-out.
 * Verifies ISA envelope sniffing, GS group + ST transaction parsing,
 * structural-invariant gate (control number matching), R12 fail-loud.
 */

import { describe, it, expect } from "vitest";
import { parseX12Interchange, findSegments } from "../algorithms/X12EdiSegmentParserFormula.js";

// ── Reference 850 PO interchange (standard X12 fixture format) ────────────
// ISA must be exactly 106 chars (incl. trailing terminator).
// Element separator '*', segment terminator '~', sub-element ':'.
const ISA_LINE = "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *260315*1200*U*00401*000000123*0*P*:~";

const REFERENCE_850_PO = ISA_LINE +
  "GS*PO*SENDER*RECEIVER*20260315*1200*1*X*004010~" +
  "ST*850*0001~" +
  "BEG*00*NE*PO12345**20260315~" +
  "REF*CO*JM-DIE-PO-9921~" +
  "N1*ST*JM Die Company~" +
  "PO1*1*100*EA*12.75**VP*CNMG432~" +
  "PO1*2*50*EA*35.50**VP*CARB-EM-1/2~" +
  "CTT*2~" +
  "SE*8*0001~" +
  "GE*1*1~" +
  "IEA*1*000000123~";

describe("parseX12Interchange — reference 850 PO", () => {
  it("sniffs delimiters from ISA fixed-position bytes", () => {
    const r = parseX12Interchange(REFERENCE_850_PO);
    expect(r.delimiters.element_separator).toBe("*");
    expect(r.delimiters.sub_element_separator).toBe(":");
    expect(r.delimiters.segment_terminator).toBe("~");
  });

  it("extracts sender/receiver/control from ISA", () => {
    const r = parseX12Interchange(REFERENCE_850_PO);
    expect(r.sender_id).toBe("SENDER");
    expect(r.receiver_id).toBe("RECEIVER");
    expect(r.isa_control).toBe("000000123");
  });

  it("parses exactly 1 functional group with 1 transaction", () => {
    const r = parseX12Interchange(REFERENCE_850_PO);
    expect(r.groups.length).toBe(1);
    expect(r.groups[0].gs_id).toBe("PO");
    expect(r.groups[0].transactions.length).toBe(1);
    expect(r.groups[0].transactions[0].st_id).toBe("850");
  });

  it("transaction contains expected segments (ST through SE inclusive)", () => {
    const r = parseX12Interchange(REFERENCE_850_PO);
    const trans = r.groups[0].transactions[0];
    const tags = trans.segments.map(s => s.tag);
    expect(tags).toContain("ST");
    expect(tags).toContain("BEG");
    expect(tags).toContain("PO1");
    expect(tags).toContain("SE");
  });

  it("findSegments extracts all PO1 line items", () => {
    const r = parseX12Interchange(REFERENCE_850_PO);
    const po1s = findSegments(r.groups[0].transactions[0], "PO1");
    expect(po1s.length).toBe(2);
    // First PO1: line 1, qty 100, EA, $12.75
    expect(po1s[0].elements[0].value).toBe("1");
    expect(po1s[0].elements[1].value).toBe("100");
    expect(po1s[0].elements[3].value).toBe("12.75");
  });

  it("parses composite sub-elements via : separator", () => {
    const composite = ISA_LINE +
      "GS*PO*S*R*20260315*1200*1*X*004010~" +
      "ST*850*0001~" +
      "REF*CO*JM*Composite:Sub:Three~" +
      "SE*3*0001~" +
      "GE*1*1~IEA*1*000000123~";
    const r = parseX12Interchange(composite);
    const refSeg = findSegments(r.groups[0].transactions[0], "REF")[0];
    expect(refSeg.elements[2].sub_elements).toEqual(["Composite", "Sub", "Three"]);
  });
});

describe("parseX12Interchange — structural-invariant gate (hotel-soul)", () => {
  it("HOTEL-SOUL: throws when ISA control != IEA control (tampered envelope)", () => {
    const tampered = REFERENCE_850_PO.replace("IEA*1*000000123~", "IEA*1*000000999~");
    expect(() => parseX12Interchange(tampered)).toThrow(/control.*tampered or truncated/);
  });

  it("HOTEL-SOUL: throws when GS control != GE control", () => {
    const tampered = REFERENCE_850_PO.replace("GE*1*1~", "GE*1*999~");
    expect(() => parseX12Interchange(tampered)).toThrow(/functional group tampered/);
  });

  it("HOTEL-SOUL: throws when ST control != SE control", () => {
    const tampered = REFERENCE_850_PO.replace("SE*8*0001~", "SE*8*9999~");
    expect(() => parseX12Interchange(tampered)).toThrow(/transaction set tampered/);
  });
});

describe("parseX12Interchange — R12 fail-loud", () => {
  it("rejects empty input", () => {
    expect(() => parseX12Interchange("")).toThrow(/empty/);
  });

  it("rejects non-ISA start", () => {
    expect(() => parseX12Interchange("X".repeat(200))).toThrow(/must start with 'ISA'/);
  });

  it("rejects missing IEA trailer", () => {
    const noIEA = ISA_LINE + "GS*PO*S*R*20260315*1200*1*X*004010~ST*850*0001~SE*2*0001~GE*1*1~";
    expect(() => parseX12Interchange(noIEA)).toThrow(/last segment must be IEA/);
  });

  it("rejects too-short input", () => {
    expect(() => parseX12Interchange("ISA*00*~")).toThrow(/too short/);
  });

  it("rejects non-string input", () => {
    expect(() => parseX12Interchange(null as unknown as string)).toThrow(/must be a string/);
  });
});

describe("parseX12Interchange — empty groups handled", () => {
  it("returns 0 groups when GS/GE wholly absent (degenerate but valid envelope)", () => {
    const isaOnly = ISA_LINE + "IEA*0*000000123~";
    const r = parseX12Interchange(isaOnly);
    expect(r.groups.length).toBe(0);
    expect(r.isa_control).toBe("000000123");
  });
});
