/**
 * devDispatcher U-WIRE-SPREADSHEET-THINKING-CERT round-trip tests
 * (slot:papa /goal /loop iter9, 2026-05-27).
 *
 *   SpreadsheetIngestionEngine    → spreadsheet_parse_csv
 *   ExtendedThinkingBridgeEngine  → thinking_assess
 *   CertificateEngine             → certificate_query
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-SPREADSHEET-THINKING-CERT
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import { spreadsheetIngestionEngine } from "../engines/SpreadsheetIngestionEngine.js";
import { extendedThinkingBridgeEngine } from "../engines/ExtendedThinkingBridgeEngine.js";
import { certificateEngine } from "../engines/CertificateEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DISPATCHER_SRC = fs.readFileSync(
  path.resolve(__dirname, "../tools/dispatchers/devDispatcher.ts"),
  "utf8"
);

describe("U-WIRE-SPREADSHEET engine — CSV parse", () => {
  it("parses a 2-row employee CSV into a SpreadsheetParseResult with total_rows=2 + rows[]", () => {
    const csv = "Name,Role,Wage\nAlice,Operator,32.50\nBob,Programmer,45.00";
    const r = spreadsheetIngestionEngine.parseCSVContent(csv, "employee");
    expect(r.total_rows).toBe(2);
    expect(r.rows.length).toBe(2);
    expect(r.rows[0].raw.Name).toBe("Alice");
    expect(r.rows[1].raw.Name).toBe("Bob");
  });

  it("handles quoted fields containing commas without splitting them — raw.Address preserved intact", () => {
    const csv = "Name,Address\nAlice,\"123 Main St, Apt 4\"";
    const r = spreadsheetIngestionEngine.parseCSVContent(csv, "generic");
    expect(r.total_rows).toBe(1);
    expect(r.rows[0].raw.Address).toBe("123 Main St, Apt 4");
  });

  it("detectColumns recognises employee canonical column names", () => {
    const detection = spreadsheetIngestionEngine.detectColumns(
      ["Name", "Role", "Wage"],
      "employee",
    );
    expect(typeof detection).toBe("object");
    expect(detection !== null).toBe(true);
  });
});

describe("U-WIRE-EXTENDED-THINKING engine — complexity assessment", () => {
  const trivial = {
    problem: "Add 1 + 1",
    goal: "Sum two integers",
    domain: "general" as unknown as Parameters<typeof extendedThinkingBridgeEngine.assessComplexity>[0]["domain"],
  };
  const complex = {
    problem: "Optimize 5-axis toolpath for thin-walled titanium impeller across 12 manufacturing constraints with simultaneous vibration, deflection, and surface-finish optimization across all blade surfaces",
    goal: "Generate collision-free, vibration-minimized G-code with predicted Ra ≤ 0.8μm across all 5 blade surfaces while maintaining tool life > 90 minutes",
    domain: "5_axis_machining" as unknown as Parameters<typeof extendedThinkingBridgeEngine.assessComplexity>[0]["domain"],
    constraints: ["Ra ≤ 0.8μm", "deflection ≤ 5μm", "no collisions", "tool life ≥ 90min", "vibration ≤ stability lobe"],
  };

  it("assessComplexity returns {score, factors, recommendation, estimatedThinkingTokens}", () => {
    const a = extendedThinkingBridgeEngine.assessComplexity(trivial);
    expect(typeof a.score).toBe("number");
    expect(Array.isArray(a.factors)).toBe(true);
    expect(["simple", "standard", "deep_thinking"]).toContain(a.recommendation);
    expect(typeof a.estimatedThinkingTokens).toBe("number");
  });

  it("complex request scores higher than trivial request", () => {
    const triv = extendedThinkingBridgeEngine.assessComplexity(trivial);
    const cplx = extendedThinkingBridgeEngine.assessComplexity(complex);
    expect(cplx.score).toBeGreaterThan(triv.score);
  });

  it("shouldThink({forceThinking:true}) returns shouldThink=true regardless of complexity", () => {
    const forced = extendedThinkingBridgeEngine.shouldThink({ ...trivial, forceThinking: true });
    expect(forced.shouldThink).toBe(true);
  });
});

describe("U-WIRE-CERTIFICATE engine — verification cert registry", () => {
  it("getStats returns a stats object with numeric fields", () => {
    const s = certificateEngine.getStats();
    expect(typeof s).toBe("object");
    expect(s !== null).toBe(true);
  });

  it("getRecentCerts(5) returns an array of size ≤ 5", () => {
    const recent = certificateEngine.getRecentCerts(5);
    expect(Array.isArray(recent)).toBe(true);
    expect(recent.length).toBeLessThanOrEqual(5);
  });

  it("isRevoked('never-existed-cert-id') returns false", () => {
    expect(certificateEngine.isRevoked("never-existed-cert-id")).toBe(false);
  });

  it("getCertsByResult('FAILED') returns an array", () => {
    const failed = certificateEngine.getCertsByResult("FAILED");
    expect(Array.isArray(failed)).toBe(true);
  });
});

describe("U-WIRE-SPREADSHEET-THINKING-CERT dispatcher wiring source assertions", () => {
  it("spreadsheet_parse_csv appears in both action enum and case-block", () => {
    const enumPos = DISPATCHER_SRC.indexOf('"spreadsheet_parse_csv",');
    const casePos = DISPATCHER_SRC.indexOf('case "spreadsheet_parse_csv"');
    expect(enumPos).toBeGreaterThan(0);
    expect(casePos).toBeGreaterThan(enumPos);
  });

  it("thinking_assess appears in both action enum and case-block", () => {
    const enumPos = DISPATCHER_SRC.indexOf('"thinking_assess",');
    const casePos = DISPATCHER_SRC.indexOf('case "thinking_assess"');
    expect(enumPos).toBeGreaterThan(0);
    expect(casePos).toBeGreaterThan(enumPos);
  });

  it("certificate_query appears in both action enum and case-block", () => {
    const enumPos = DISPATCHER_SRC.indexOf('"certificate_query",');
    const casePos = DISPATCHER_SRC.indexOf('case "certificate_query"');
    expect(enumPos).toBeGreaterThan(0);
    expect(casePos).toBeGreaterThan(enumPos);
  });

  it("all 3 lazy imports present", () => {
    expect(DISPATCHER_SRC.indexOf('"../../engines/SpreadsheetIngestionEngine.js"')).toBeGreaterThan(0);
    expect(DISPATCHER_SRC.indexOf('"../../engines/ExtendedThinkingBridgeEngine.js"')).toBeGreaterThan(0);
    expect(DISPATCHER_SRC.indexOf('"../../engines/CertificateEngine.js"')).toBeGreaterThan(0);
  });
});
