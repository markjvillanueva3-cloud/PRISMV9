/**
 * blueprintRedactQuotingIntake.test.ts -- U-3VIEW-REDACT-WIRE
 *
 * Privacy-critical validation for the quoting CAD/print drop-box auto-redaction
 * path. A false negative here leaks a JM customer identity into a stored or quoted
 * print, so this test asserts the redaction lib actually masks known JM customer
 * names -- the exact contract the BlueprintQuotePage drop-box depends on.
 *
 * The drop-box calls prism_cad:blueprint_redact (-> redactText), which returns a
 * RedactTextResult { text: string, redactions: RedactionAudit[] }. The frontend reads
 * data.text.text (masked string) + data.text.redactions.length (count).
 */

import { describe, it, expect } from "vitest";
import { redactText, redactExtraction } from "../engines/blueprint-vision/blueprintRedaction.js";

describe("blueprint redaction -- quoting intake (privacy-critical)", () => {
  it("masks a known JM customer name in free text and preserves non-identity content", () => {
    const raw = "PART FOR ALCOA INC. JOB 4821\nCONTINENTAL MIDLAND tooling\nDO NOT SCALE DRAWING";
    const res = redactText(raw, { aggressive: true });
    // RedactTextResult shape: { text, redactions }.
    expect(typeof res.text).toBe("string");
    expect(Array.isArray(res.redactions)).toBe(true);
    // Must NOT leak the customer identities.
    expect(res.text).not.toContain("ALCOA");
    expect(res.text).not.toContain("CONTINENTAL MIDLAND");
    expect(res.text).toContain("[REDACTED]");
    // At least one redaction was recorded in the audit.
    expect(res.redactions.length).toBeGreaterThan(0);
    // Non-identity drawing text survives (no over-redaction of standard notes).
    expect(res.text).toContain("DO NOT SCALE DRAWING");
  });

  it("masks customer identity in a structured extraction", () => {
    const ex = { customer: "ALCOA", part_number: "AL-7788", dimensions: [{ nominal: 1.25 }] };
    const red = redactExtraction(ex as unknown, { aggressive: true });
    // The customer field is masked; the extraction object is still returned.
    expect(JSON.stringify(red)).not.toContain("ALCOA");
  });

  it("does not over-redact a clean print with no customer identity", () => {
    const raw = "GENERIC BRACKET\n.250 +/- .005\nMATERIAL: 6061-T6\nDEBURR ALL EDGES";
    const res = redactText(raw, { aggressive: true });
    // Nothing customer-identifying here -> no masks, content intact.
    expect(res.text).toContain("GENERIC BRACKET");
    expect(res.text).toContain("6061-T6");
  });

  it("handles empty input without throwing", () => {
    const res = redactText("", { aggressive: true });
    expect(res.text).toBe("");
    expect(res.redactions.length).toBe(0);
  });
});
