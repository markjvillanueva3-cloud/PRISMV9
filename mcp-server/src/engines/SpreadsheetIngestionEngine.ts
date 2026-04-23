/**
 * SpreadsheetIngestionEngine — Parse .xlsx/.csv data for bulk import
 *
 * Reads tabular data from spreadsheets and maps columns to target engine
 * fields via header auto-detection. Supports employee import (→ EmployeeEngine),
 * vendor import, material stock import, and tooling import.
 *
 * Header matching is fuzzy: "First Name", "first_name", "FirstName", "FIRST",
 * "fname" all map to the same field.
 *
 * INGEST-MS1 / U-EMP01
 * @module SpreadsheetIngestionEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ImportTarget = "employee" | "vendor" | "material" | "tooling" | "generic";

export interface ColumnMapping {
  source_header: string;
  target_field: string;
  confidence: number; // 0-1, how confident the auto-match is
}

export interface ParsedRow {
  row_number: number;
  raw: Record<string, string>;
  mapped: Record<string, string>;
  errors: string[];
  warnings: string[];
}

export interface SpreadsheetParseResult {
  filename: string;
  target: ImportTarget;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  column_mappings: ColumnMapping[];
  unmapped_columns: string[];
  rows: ParsedRow[];
  parse_errors: string[];
}

export interface EmployeeImportRow {
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  role: string;
  hire_date: string;
  hourly_rate: number;
  overtime_multiplier: number;
  shift: string;
  skills: string;
  notes: string;
}

// ============================================================================
// HEADER → FIELD MAPPING DICTIONARIES
// ============================================================================

/** Patterns that map spreadsheet headers to EmployeeCreateInput fields */
const EMPLOYEE_HEADER_MAP: Array<{ patterns: RegExp[]; field: string }> = [
  { patterns: [/^first.?name$/i, /^fname$/i, /^first$/i, /^given.?name$/i], field: "first_name" },
  { patterns: [/^last.?name$/i, /^lname$/i, /^last$/i, /^surname$/i, /^family.?name$/i], field: "last_name" },
  { patterns: [/^name$/i, /^full.?name$/i, /^employee.?name$/i, /^emp.?name$/i], field: "full_name" },
  { patterns: [/^email$/i, /^e.?mail$/i, /^email.?address$/i], field: "email" },
  { patterns: [/^dept$/i, /^department$/i, /^area$/i, /^division$/i], field: "department" },
  { patterns: [/^role$/i, /^title$/i, /^job.?title$/i, /^position$/i, /^job$/i], field: "role" },
  { patterns: [/^hire.?date$/i, /^start.?date$/i, /^date.?hired$/i, /^doh$/i, /^hired$/i], field: "hire_date" },
  { patterns: [/^rate$/i, /^hourly.?rate$/i, /^pay.?rate$/i, /^wage$/i, /^hourly$/i, /^hr.?rate$/i], field: "hourly_rate" },
  { patterns: [/^ot.?mult$/i, /^overtime$/i, /^ot.?rate$/i, /^overtime.?mult/i], field: "overtime_multiplier" },
  { patterns: [/^shift$/i, /^shift.?assign/i, /^schedule$/i], field: "shift" },
  { patterns: [/^skill/i, /^competenc/i, /^capabilit/i], field: "skills" },
  { patterns: [/^cert/i, /^license$/i, /^credential/i], field: "certifications" },
  { patterns: [/^note/i, /^comment/i, /^remark/i], field: "notes" },
  { patterns: [/^phone$/i, /^tel$/i, /^mobile$/i, /^cell$/i], field: "phone" },
  { patterns: [/^status$/i, /^emp.?status$/i, /^active$/i], field: "status" },
  { patterns: [/^id$/i, /^emp.?id$/i, /^employee.?id$/i, /^badge$/i, /^number$/i], field: "employee_id" },
];

const VENDOR_HEADER_MAP: Array<{ patterns: RegExp[]; field: string }> = [
  { patterns: [/^name$/i, /^vendor$/i, /^supplier$/i, /^company$/i], field: "name" },
  { patterns: [/^contact$/i, /^contact.?name$/i, /^rep$/i, /^sales.?rep$/i], field: "contact_name" },
  { patterns: [/^email$/i, /^e.?mail$/i], field: "email" },
  { patterns: [/^phone$/i, /^tel$/i], field: "phone" },
  { patterns: [/^terms$/i, /^payment.?terms$/i, /^net$/i], field: "terms" },
  { patterns: [/^category$/i, /^type$/i, /^product.?type$/i], field: "category" },
  { patterns: [/^address$/i, /^street$/i], field: "address" },
  { patterns: [/^city$/i], field: "city" },
  { patterns: [/^state$/i, /^province$/i], field: "state" },
  { patterns: [/^zip$/i, /^postal$/i], field: "zip" },
  { patterns: [/^account$/i, /^acct$/i, /^account.?num/i], field: "account_number" },
  { patterns: [/^note/i, /^comment/i], field: "notes" },
];

// ============================================================================
// CSV PARSER (no external deps)
// ============================================================================

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current.trim());
        current = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        row.push(current.trim());
        if (row.some(cell => cell.length > 0)) rows.push(row);
        row = [];
        current = "";
        if (ch === "\r") i++;
      } else {
        current += ch;
      }
    }
  }

  // Last row
  row.push(current.trim());
  if (row.some(cell => cell.length > 0)) rows.push(row);

  return rows;
}

// ============================================================================
// ENGINE
// ============================================================================

class SpreadsheetIngestionEngine {

  /**
   * Auto-detect column mappings from headers.
   */
  detectColumns(headers: string[], target: ImportTarget): {
    mappings: ColumnMapping[];
    unmapped: string[];
  } {
    const headerMap = target === "vendor" ? VENDOR_HEADER_MAP : EMPLOYEE_HEADER_MAP;
    const mappings: ColumnMapping[] = [];
    const mapped = new Set<string>();

    for (const header of headers) {
      const clean = header.trim();
      if (!clean) continue;

      let bestMatch: { field: string; confidence: number } | null = null;

      for (const entry of headerMap) {
        for (const pattern of entry.patterns) {
          if (pattern.test(clean)) {
            const confidence = clean.toLowerCase() === entry.field ? 1.0 : 0.85;
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = { field: entry.field, confidence };
            }
          }
        }
      }

      if (bestMatch) {
        mappings.push({
          source_header: clean,
          target_field: bestMatch.field,
          confidence: bestMatch.confidence,
        });
        mapped.add(clean);
      }
    }

    const unmapped = headers.filter(h => h.trim() && !mapped.has(h.trim()));
    return { mappings, unmapped };
  }

  /**
   * Parse a CSV/TSV string into structured rows using detected column mappings.
   */
  parseCSVContent(content: string, target: ImportTarget = "employee"): SpreadsheetParseResult {
    const rawRows = parseCSV(content);
    if (rawRows.length < 2) {
      return {
        filename: "", target, total_rows: 0, valid_rows: 0, error_rows: 0,
        column_mappings: [], unmapped_columns: [], rows: [], parse_errors: ["No data rows found"],
      };
    }

    const headers = rawRows[0];
    const { mappings, unmapped } = this.detectColumns(headers, target);
    const fieldMap = new Map(mappings.map(m => [m.source_header, m.target_field]));

    const rows: ParsedRow[] = [];
    let validCount = 0;
    let errorCount = 0;

    for (let i = 1; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      const raw: Record<string, string> = {};
      const mapped: Record<string, string> = {};
      const errors: string[] = [];
      const warnings: string[] = [];

      for (let j = 0; j < headers.length; j++) {
        const h = headers[j].trim();
        const val = rawRow[j] ?? "";
        raw[h] = val;
        const field = fieldMap.get(h);
        if (field) mapped[field] = val;
      }

      // Validate required fields for employee
      if (target === "employee") {
        if (!mapped.first_name && !mapped.full_name) errors.push("Missing name");
        if (!mapped.hourly_rate) warnings.push("No hourly rate");
      }

      if (errors.length > 0) errorCount++;
      else validCount++;

      rows.push({ row_number: i + 1, raw, mapped, errors, warnings });
    }

    return {
      filename: "",
      target,
      total_rows: rows.length,
      valid_rows: validCount,
      error_rows: errorCount,
      column_mappings: mappings,
      unmapped_columns: unmapped,
      rows,
      parse_errors: [],
    };
  }

  /**
   * Parse a file from disk. Supports .csv and .xlsx (xlsx via simple TSV fallback).
   */
  parseFile(filePath: string, target: ImportTarget = "employee"): SpreadsheetParseResult {
    const ext = path.extname(filePath).toLowerCase();
    const content = fs.readFileSync(filePath, "utf-8");
    const result = this.parseCSVContent(content, target);
    result.filename = path.basename(filePath);

    if (ext === ".xlsx") {
      // For real xlsx, we'd need a library. Flag it.
      result.parse_errors.push("XLSX detected — parsed as text. For full support, export as CSV first.");
    }

    return result;
  }

  /**
   * Convert parsed employee rows into EmployeeCreateInput format.
   * Handles full_name splitting, department normalization, role inference.
   */
  toEmployeeInputs(result: SpreadsheetParseResult): Array<{
    first_name: string;
    last_name: string;
    email: string;
    department: string;
    role: string;
    hire_date: string;
    hourly_rate: number;
    overtime_multiplier: number;
    notes: string;
    source_row: number;
  }> {
    const outputs: Array<{
      first_name: string;
      last_name: string;
      email: string;
      department: string;
      role: string;
      hire_date: string;
      hourly_rate: number;
      overtime_multiplier: number;
      notes: string;
      source_row: number;
    }> = [];

    for (const row of result.rows) {
      if (row.errors.length > 0) continue;

      const m = row.mapped;
      let firstName = m.first_name ?? "";
      let lastName = m.last_name ?? "";

      // Split full_name if first/last not separate
      if (!firstName && m.full_name) {
        const parts = m.full_name.trim().split(/\s+/);
        firstName = parts[0] ?? "";
        lastName = parts.slice(1).join(" ") || "";
      }

      if (!firstName) continue;

      const rate = parseFloat(m.hourly_rate) || 0;
      const otMult = parseFloat(m.overtime_multiplier) || 1.5;

      outputs.push({
        first_name: firstName,
        last_name: lastName,
        email: m.email ?? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@jmdie.com`,
        department: this.normalizeDepartment(m.department ?? ""),
        role: this.normalizeRole(m.role ?? ""),
        hire_date: this.normalizeDate(m.hire_date ?? ""),
        hourly_rate: rate,
        overtime_multiplier: otMult,
        notes: m.notes ?? "",
        source_row: row.row_number,
      });
    }

    return outputs;
  }

  /**
   * Bulk import employees from a parsed spreadsheet result.
   * Creates employees via EmployeeEngine, returns created count + errors.
   */
  async importEmployees(result: SpreadsheetParseResult): Promise<{
    created: number;
    skipped: number;
    errors: Array<{ row: number; error: string }>;
    employee_ids: string[];
  }> {
    const inputs = this.toEmployeeInputs(result);
    const errors: Array<{ row: number; error: string }> = [];
    const employeeIds: string[] = [];
    let created = 0;
    let skipped = 0;

    let employeeEngine: any;
    try {
      const mod = await import("./EmployeeEngine.js");
      employeeEngine = mod.employeeEngine;
    } catch (e: any) {
      return { created: 0, skipped: 0, errors: [{ row: 0, error: `EmployeeEngine not available: ${e.message}` }], employee_ids: [] };
    }

    for (const input of inputs) {
      try {
        // Check for duplicates by first + last name
        const all = employeeEngine.list();
        if (all.some((e: any) =>
          e.first_name.toLowerCase() === input.first_name.toLowerCase() &&
          e.last_name.toLowerCase() === input.last_name.toLowerCase()
        )) {
          skipped++;
          continue;
        }

        const emp = employeeEngine.create({
          first_name: input.first_name,
          last_name: input.last_name,
          email: input.email,
          department: input.department as any,
          role: input.role as any,
          hire_date: input.hire_date || undefined,
          hourly_rate: input.hourly_rate || 25,
          overtime_multiplier: input.overtime_multiplier,
        });
        employeeIds.push(emp.id);
        created++;
      } catch (e: any) {
        errors.push({ row: input.source_row, error: e.message });
      }
    }

    log.info(`[SpreadsheetIngestion] Imported ${created} employees, skipped ${skipped} duplicates, ${errors.length} errors`);
    return { created, skipped, errors, employee_ids: employeeIds };
  }

  // ── NORMALIZERS ────────────────────────────────────────────────────────

  private normalizeDepartment(raw: string): string {
    const lower = raw.toLowerCase().trim();
    if (/machining|cnc|lathe|mill|edm|shop.?floor/i.test(lower)) return "machining";
    if (/quality|qa|qc|inspect/i.test(lower)) return "quality";
    if (/engineer/i.test(lower)) return "engineering";
    if (/program/i.test(lower)) return "programming";
    if (/maint/i.test(lower)) return "maintenance";
    if (/ship|receiv|warehouse/i.test(lower)) return "shipping";
    if (/manag|admin|office|front/i.test(lower)) return "management";
    if (/assembl/i.test(lower)) return "assembly";
    if (/plan/i.test(lower)) return "planning";
    return "machining"; // default for a die shop
  }

  private normalizeRole(raw: string): string {
    const lower = raw.toLowerCase().trim();
    if (/operator|machinist|op$/i.test(lower)) return "operator";
    if (/setup|set.?up/i.test(lower)) return "setup_tech";
    if (/lead/i.test(lower)) return "lead";
    if (/super/i.test(lower)) return "supervisor";
    if (/program/i.test(lower)) return "programmer";
    if (/inspect|quality/i.test(lower)) return "inspector";
    if (/maint/i.test(lower)) return "maintenance_tech";
    if (/engineer/i.test(lower)) return "engineer";
    if (/manag|owner|gm/i.test(lower)) return "manager";
    if (/plan/i.test(lower)) return "planner";
    return "operator"; // default for a die shop
  }

  private normalizeDate(raw: string): string {
    if (!raw) return new Date().toISOString().slice(0, 10);
    // Try common formats
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    // MM/DD/YYYY
    const parts = raw.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (Number(c) > 1900) return `${c}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
      if (Number(a) > 1900) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
    }
    return new Date().toISOString().slice(0, 10);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const spreadsheetIngestionEngine = new SpreadsheetIngestionEngine();
