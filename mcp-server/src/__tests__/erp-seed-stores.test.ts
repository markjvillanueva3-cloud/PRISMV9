/**
 * erp-seed-stores.test.ts — DB-COVERAGE-GAPFILL-MS0/U-ERP01
 * =========================================================
 *
 * Verifies the three P0 ERP front-end seed stores created under
 * mcp-server/data/state/ render-ready and schema-faithful:
 *   - invoices.json        (frontend Invoice interface — web/src/api/types.ts)
 *   - employees.json       (frontend Employee interface — web/src/api/types.ts)
 *   - general-ledger.json  (GeneralLedgerEngine LedgerState — src/engines/GeneralLedgerEngine.ts)
 *
 * These tests encode INTENT (R9): each store must parse, carry a schemaVersion,
 * hold at least the expected record count, and every record must carry the exact
 * fields its consumer reads. The general-ledger test additionally enforces the
 * load-bearing double-entry invariant (Σdebits === Σcredits) — a real behavioral
 * assertion that fails the moment a transaction is mis-keyed.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const STATE_DIR = resolve(__dirname, "../../data/state");

function readJson(name: string): any {
  const raw = readFileSync(resolve(STATE_DIR, name), "utf-8");
  return JSON.parse(raw);
}

// Status / enum domains the consumers actually switch on.
const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue"];
const EMPLOYEE_STATUSES = ["active", "inactive", "on_leave", "terminated"];
const CLEARANCE_LEVELS = ["shop_floor", "lead", "hr_manager", "admin"];
const GL_SOURCES = [
  "manual",
  "invoice",
  "payment",
  "purchase",
  "payroll",
  "wip_to_cogs",
  "depreciation",
  "adjustment",
];
const GL_ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"];

describe("ERP seed store: invoices.json", () => {
  const doc = readJson("invoices.json");

  it("parses and carries a numeric schemaVersion of 1", () => {
    expect(doc.schemaVersion).toBe(1);
  });

  it("holds at least 20 invoices under the `invoices` key", () => {
    expect(Array.isArray(doc.invoices)).toBe(true);
    expect(doc.invoices.length).toBeGreaterThanOrEqual(20);
  });

  it("every invoice carries the exact fields InvoicesPage.tsx reads", () => {
    for (const inv of doc.invoices) {
      expect(typeof inv.id).toBe("string");
      expect(typeof inv.job_id).toBe("string");
      expect(typeof inv.customer_name).toBe("string");
      expect(typeof inv.date).toBe("string");
      expect(typeof inv.due_date).toBe("string");
      expect(Array.isArray(inv.line_items)).toBe(true);
      expect(typeof inv.subtotal).toBe("number");
      expect(typeof inv.tax).toBe("number");
      expect(typeof inv.total).toBe("number");
      expect(Array.isArray(inv.payments)).toBe(true);
      expect(typeof inv.balance_due).toBe("number");
      expect(INVOICE_STATUSES).toContain(inv.status);
    }
  });

  it("each line item carries description/quantity/unit_price/total and total === quantity*unit_price", () => {
    for (const inv of doc.invoices) {
      for (const li of inv.line_items) {
        expect(typeof li.description).toBe("string");
        expect(typeof li.quantity).toBe("number");
        expect(typeof li.unit_price).toBe("number");
        expect(typeof li.total).toBe("number");
        expect(Math.round(li.quantity * li.unit_price * 100) / 100).toBe(li.total);
      }
    }
  });

  it("invoice arithmetic holds: subtotal == Σline totals, total == subtotal+tax, balance_due == total − Σpayments", () => {
    for (const inv of doc.invoices) {
      const lineSum = Math.round(inv.line_items.reduce((s: number, li: any) => s + li.total, 0) * 100) / 100;
      expect(lineSum).toBe(inv.subtotal);
      expect(Math.round((inv.subtotal + inv.tax) * 100) / 100).toBe(inv.total);
      const paid = inv.payments.reduce((s: number, p: any) => s + p.amount, 0);
      expect(Math.round((inv.total - paid) * 100) / 100).toBe(inv.balance_due);
    }
  });

  it("paid invoices have a zero balance_due", () => {
    for (const inv of doc.invoices) {
      if (inv.status === "paid") {
        expect(inv.balance_due).toBe(0);
      }
    }
  });
});

describe("ERP seed store: employees.json", () => {
  const doc = readJson("employees.json");

  it("parses and carries a numeric schemaVersion of 1", () => {
    expect(doc.schemaVersion).toBe(1);
  });

  it("holds at least 18 employees under the `employees` key", () => {
    expect(Array.isArray(doc.employees)).toBe(true);
    expect(doc.employees.length).toBeGreaterThanOrEqual(18);
  });

  it("spans at least 6 distinct departments", () => {
    const depts = new Set(doc.employees.map((e: any) => e.department));
    expect(depts.size).toBeGreaterThanOrEqual(6);
  });

  it("every employee carries the exact fields EmployeeDirectoryPage.tsx reads", () => {
    for (const emp of doc.employees) {
      expect(typeof emp.id).toBe("string");
      expect(typeof emp.first_name).toBe("string");
      expect(typeof emp.last_name).toBe("string");
      expect(typeof emp.department).toBe("string");
      expect(typeof emp.role).toBe("string");
      expect(typeof emp.hire_date).toBe("string");
      expect(Array.isArray(emp.skills)).toBe(true);
      expect(Array.isArray(emp.certifications)).toBe(true);
      expect(EMPLOYEE_STATUSES).toContain(emp.status);
      expect(CLEARANCE_LEVELS).toContain(emp.clearance_level);
      // labor_rates is read as employee.labor_rates?.regular in the page
      expect(typeof emp.labor_rates.regular).toBe("number");
      expect(typeof emp.labor_rates.overtime).toBe("number");
      expect(typeof emp.labor_rates.double_time).toBe("number");
      // auth_user_id is string | null in the interface
      expect(emp.auth_user_id === null || typeof emp.auth_user_id === "string").toBe(true);
    }
  });

  it("labor rate multipliers are consistent (overtime = 1.5x regular, double_time = 2.0x regular)", () => {
    for (const emp of doc.employees) {
      expect(Math.round(emp.labor_rates.overtime * 100) / 100).toBe(
        Math.round(emp.labor_rates.regular * 1.5 * 100) / 100,
      );
      expect(Math.round(emp.labor_rates.double_time * 100) / 100).toBe(
        Math.round(emp.labor_rates.regular * 2.0 * 100) / 100,
      );
    }
  });

  it("each certification carries a name; expires (when present) is a string", () => {
    for (const emp of doc.employees) {
      for (const cert of emp.certifications) {
        expect(typeof cert.name).toBe("string");
        if (cert.expires !== undefined) {
          expect(typeof cert.expires).toBe("string");
        }
      }
    }
  });
});

describe("ERP seed store: general-ledger.json", () => {
  const doc = readJson("general-ledger.json");

  it("parses and carries a numeric schemaVersion of 1", () => {
    expect(doc.schemaVersion).toBe(1);
  });

  it("holds a chart of accounts of at least 50 accounts", () => {
    expect(Array.isArray(doc.chart_of_accounts)).toBe(true);
    expect(doc.chart_of_accounts.length).toBeGreaterThanOrEqual(50);
  });

  it("holds at least 40 journal entries with the LedgerState envelope", () => {
    expect(Array.isArray(doc.journal_entries)).toBe(true);
    expect(doc.journal_entries.length).toBeGreaterThanOrEqual(40);
    expect(typeof doc.next_entry_seq).toBe("number");
    expect(typeof doc.updated_at).toBe("string");
  });

  it("every account carries id/name/type/normal_balance/category with a valid type and normal_balance", () => {
    for (const acct of doc.chart_of_accounts) {
      expect(typeof acct.id).toBe("string");
      expect(typeof acct.name).toBe("string");
      expect(typeof acct.category).toBe("string");
      expect(GL_ACCOUNT_TYPES).toContain(acct.type);
      expect(["debit", "credit"]).toContain(acct.normal_balance);
    }
  });

  it("chart of accounts covers all five account types", () => {
    const types = new Set(doc.chart_of_accounts.map((a: any) => a.type));
    for (const t of GL_ACCOUNT_TYPES) {
      expect(types.has(t)).toBe(true);
    }
  });

  it("every journal entry carries id/date/description/source/lines and references known accounts", () => {
    const accountIds = new Set(doc.chart_of_accounts.map((a: any) => a.id));
    for (const entry of doc.journal_entries) {
      expect(typeof entry.id).toBe("string");
      expect(typeof entry.date).toBe("string");
      expect(typeof entry.description).toBe("string");
      expect(GL_SOURCES).toContain(entry.source);
      expect(Array.isArray(entry.lines)).toBe(true);
      expect(entry.lines.length).toBeGreaterThanOrEqual(2);
      for (const line of entry.lines) {
        expect(accountIds.has(line.account_id)).toBe(true);
        expect(typeof line.debit).toBe("number");
        expect(typeof line.credit).toBe("number");
        // mirror the engine's per-line contract: never both-sided, never zero-zero
        expect(line.debit > 0 && line.credit > 0).toBe(false);
        expect(line.debit === 0 && line.credit === 0).toBe(false);
      }
    }
  });

  it("EVERY journal entry balances: Σdebits === Σcredits (double-entry invariant)", () => {
    for (const entry of doc.journal_entries) {
      const debits = Math.round(entry.lines.reduce((s: number, l: any) => s + l.debit, 0) * 100) / 100;
      const credits = Math.round(entry.lines.reduce((s: number, l: any) => s + l.credit, 0) * 100) / 100;
      expect(debits).toBe(credits);
    }
  });

  it("the ledger as a whole balances: total debits === total credits", () => {
    let totalDebits = 0;
    let totalCredits = 0;
    for (const entry of doc.journal_entries) {
      for (const line of entry.lines) {
        totalDebits += line.debit;
        totalCredits += line.credit;
      }
    }
    expect(Math.round(totalDebits * 100) / 100).toBe(Math.round(totalCredits * 100) / 100);
  });
});
