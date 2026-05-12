/**
 * SpreadsheetIngestionEngine tests — INGEST-MS1 / U-EMP01
 *
 * Tests CSV parsing, header auto-detection, employee data mapping,
 * normalization, and bulk import via EmployeeEngine.
 */

import { describe, it, expect } from "vitest";
import { spreadsheetIngestionEngine } from "../engines/SpreadsheetIngestionEngine.js";

// ── SAMPLE CSV DATA ────────────────────────────────────────────────────

const EMPLOYEE_CSV = `First Name,Last Name,Email,Department,Role,Hire Date,Hourly Rate,Notes
John,Smith,john.smith@jmdie.com,Machining,Operator,01/15/2015,32.00,Lathe specialist
Jane,Doe,jane.doe@jmdie.com,Quality,Inspector,03/20/2018,28.00,CMM certified
Bob,Johnson,bob.j@jmdie.com,Programming,Programmer,06/01/2010,45.00,Mastercam expert
Alice,Williams,alice.w@jmdie.com,Management,Manager,09/12/2005,55.00,Owner
Mike,Brown,mike.b@jmdie.com,Machining,Setup Tech,11/30/2019,35.00,Wire EDM setup
`;

const FULL_NAME_CSV = `Name,Dept,Title,Rate,Hired
John Smith,CNC,Machinist,32.00,2015-01-15
Jane Doe,QC,Inspector,28.00,2018-03-20
Bob Johnson,Engineering,Programmer,45.00,2010-06-01
`;

const WEIRD_HEADERS_CSV = `fname,lname,e-mail,area,position,doh,wage
Tom,Jones,tom@jmdie.com,shop floor,op,01/01/2020,30
`;

const MINIMAL_CSV = `Name,Rate
John Smith,32
Jane Doe,28
`;

describe("SpreadsheetIngestionEngine", () => {

  // ── COLUMN DETECTION ─────────────────────────────────────────────────

  describe("detectColumns", () => {
    it("detects standard employee headers", () => {
      const headers = ["First Name", "Last Name", "Email", "Department", "Role", "Hire Date", "Hourly Rate", "Notes"];
      const { mappings, unmapped } = spreadsheetIngestionEngine.detectColumns(headers, "employee");

      expect(mappings.length).toBe(8);
      expect(mappings.find(m => m.target_field === "first_name")).toBeDefined();
      expect(mappings.find(m => m.target_field === "last_name")).toBeDefined();
      expect(mappings.find(m => m.target_field === "email")).toBeDefined();
      expect(mappings.find(m => m.target_field === "department")).toBeDefined();
      expect(mappings.find(m => m.target_field === "role")).toBeDefined();
      expect(mappings.find(m => m.target_field === "hire_date")).toBeDefined();
      expect(mappings.find(m => m.target_field === "hourly_rate")).toBeDefined();
      expect(unmapped.length).toBe(0);
    });

    it("detects abbreviated headers", () => {
      const headers = ["fname", "lname", "dept", "title", "wage"];
      const { mappings } = spreadsheetIngestionEngine.detectColumns(headers, "employee");

      expect(mappings.find(m => m.target_field === "first_name")).toBeDefined();
      expect(mappings.find(m => m.target_field === "last_name")).toBeDefined();
      expect(mappings.find(m => m.target_field === "department")).toBeDefined();
      expect(mappings.find(m => m.target_field === "role")).toBeDefined();
      expect(mappings.find(m => m.target_field === "hourly_rate")).toBeDefined();
    });

    it("detects full name column", () => {
      const headers = ["Name", "Rate"];
      const { mappings } = spreadsheetIngestionEngine.detectColumns(headers, "employee");
      expect(mappings.find(m => m.target_field === "full_name")).toBeDefined();
      expect(mappings.find(m => m.target_field === "hourly_rate")).toBeDefined();
    });

    it("reports unmapped columns", () => {
      const headers = ["First Name", "Favorite Color", "Shoe Size"];
      const { unmapped } = spreadsheetIngestionEngine.detectColumns(headers, "employee");
      expect(unmapped).toContain("Favorite Color");
      expect(unmapped).toContain("Shoe Size");
    });

    it("detects vendor headers", () => {
      const headers = ["Vendor", "Contact", "Email", "Terms", "Category"];
      const { mappings } = spreadsheetIngestionEngine.detectColumns(headers, "vendor");
      expect(mappings.find(m => m.target_field === "name")).toBeDefined();
      expect(mappings.find(m => m.target_field === "contact_name")).toBeDefined();
      expect(mappings.find(m => m.target_field === "terms")).toBeDefined();
    });
  });

  // ── CSV PARSING ──────────────────────────────────────────────────────

  describe("parseCSVContent", () => {
    it("parses standard employee CSV", () => {
      const result = spreadsheetIngestionEngine.parseCSVContent(EMPLOYEE_CSV, "employee");
      expect(result.total_rows).toBe(5);
      expect(result.valid_rows).toBe(5);
      expect(result.error_rows).toBe(0);
      expect(result.column_mappings.length).toBe(8);
      expect(result.rows[0].mapped.first_name).toBe("John");
      expect(result.rows[0].mapped.last_name).toBe("Smith");
      expect(result.rows[0].mapped.hourly_rate).toBe("32.00");
    });

    it("parses full name CSV", () => {
      const result = spreadsheetIngestionEngine.parseCSVContent(FULL_NAME_CSV, "employee");
      expect(result.total_rows).toBe(3);
      expect(result.rows[0].mapped.full_name).toBe("John Smith");
    });

    it("parses weird headers", () => {
      const result = spreadsheetIngestionEngine.parseCSVContent(WEIRD_HEADERS_CSV, "employee");
      expect(result.total_rows).toBe(1);
      expect(result.rows[0].mapped.first_name).toBe("Tom");
      expect(result.rows[0].mapped.last_name).toBe("Jones");
    });

    it("handles empty content", () => {
      const result = spreadsheetIngestionEngine.parseCSVContent("", "employee");
      expect(result.total_rows).toBe(0);
      expect(result.parse_errors.length).toBeGreaterThan(0);
    });

    it("handles quoted CSV fields", () => {
      const csv = `Name,Notes\n"Smith, John","He said ""hello"""\n`;
      const result = spreadsheetIngestionEngine.parseCSVContent(csv, "employee");
      expect(result.rows[0].mapped.full_name).toBe("Smith, John");
      expect(result.rows[0].mapped.notes).toBe('He said "hello"');
    });
  });

  // ── EMPLOYEE CONVERSION ──────────────────────────────────────────────

  describe("toEmployeeInputs", () => {
    it("converts standard CSV to employee inputs", () => {
      const result = spreadsheetIngestionEngine.parseCSVContent(EMPLOYEE_CSV, "employee");
      const inputs = spreadsheetIngestionEngine.toEmployeeInputs(result);

      expect(inputs.length).toBe(5);
      expect(inputs[0].first_name).toBe("John");
      expect(inputs[0].last_name).toBe("Smith");
      expect(inputs[0].email).toBe("john.smith@jmdie.com");
      expect(inputs[0].department).toBe("machining");
      expect(inputs[0].role).toBe("operator");
      expect(inputs[0].hourly_rate).toBe(32.00);
    });

    it("splits full names into first + last", () => {
      const result = spreadsheetIngestionEngine.parseCSVContent(FULL_NAME_CSV, "employee");
      const inputs = spreadsheetIngestionEngine.toEmployeeInputs(result);

      expect(inputs[0].first_name).toBe("John");
      expect(inputs[0].last_name).toBe("Smith");
    });

    it("normalizes departments", () => {
      const result = spreadsheetIngestionEngine.parseCSVContent(FULL_NAME_CSV, "employee");
      const inputs = spreadsheetIngestionEngine.toEmployeeInputs(result);

      expect(inputs[0].department).toBe("machining"); // "CNC" → machining
      expect(inputs[1].department).toBe("quality");    // "QC" → quality
      expect(inputs[2].department).toBe("engineering"); // "Engineering" → engineering
    });

    it("normalizes roles", () => {
      const result = spreadsheetIngestionEngine.parseCSVContent(FULL_NAME_CSV, "employee");
      const inputs = spreadsheetIngestionEngine.toEmployeeInputs(result);

      expect(inputs[0].role).toBe("operator");    // "Machinist" → operator
      expect(inputs[1].role).toBe("inspector");    // "Inspector" → inspector
      expect(inputs[2].role).toBe("programmer");   // "Programmer" → programmer
    });

    it("handles minimal data with defaults", () => {
      const result = spreadsheetIngestionEngine.parseCSVContent(MINIMAL_CSV, "employee");
      const inputs = spreadsheetIngestionEngine.toEmployeeInputs(result);

      expect(inputs.length).toBe(2);
      expect(inputs[0].department).toBe("machining"); // default
      expect(inputs[0].role).toBe("operator");        // default
      expect(inputs[0].overtime_multiplier).toBe(1.5); // default
    });

    it("generates email from name when not provided", () => {
      const result = spreadsheetIngestionEngine.parseCSVContent(MINIMAL_CSV, "employee");
      const inputs = spreadsheetIngestionEngine.toEmployeeInputs(result);
      expect(inputs[0].email).toBe("john.smith@jmdie.com");
    });

    it("normalizes dates in multiple formats", () => {
      const csv = `Name,Hire Date\nA B,01/15/2015\nC D,2018-03-20\nE F,March 5 2020\n`;
      const result = spreadsheetIngestionEngine.parseCSVContent(csv, "employee");
      const inputs = spreadsheetIngestionEngine.toEmployeeInputs(result);
      expect(inputs[0].hire_date).toBe("2015-01-15");
      expect(inputs[1].hire_date).toBe("2018-03-20");
    });
  });

  // ── BULK IMPORT ──────────────────────────────────────────────────────

  describe("importEmployees", () => {
    it("creates employees from CSV data", async () => {
      const result = spreadsheetIngestionEngine.parseCSVContent(EMPLOYEE_CSV, "employee");
      const importResult = await spreadsheetIngestionEngine.importEmployees(result);

      expect(importResult.created).toBeGreaterThanOrEqual(1);
      expect(importResult.employee_ids.length).toBe(importResult.created);
    });

    it("skips duplicate employees on re-import", async () => {
      const dedupCSV = `First Name,Last Name,Hourly Rate\nUnique_DedupA,TestOnly,30\nUnique_DedupB,TestOnly,25\n`;
      const result = spreadsheetIngestionEngine.parseCSVContent(dedupCSV, "employee");

      // First import
      const first = await spreadsheetIngestionEngine.importEmployees(result);
      expect(first.created).toBe(2);

      // Second import — should skip both
      const second = await spreadsheetIngestionEngine.importEmployees(result);
      expect(second.skipped).toBe(2);
      expect(second.created).toBe(0);
    });
  });
});
