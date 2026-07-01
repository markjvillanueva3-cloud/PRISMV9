import { persistenceBridge } from "../db/PersistenceBridge.js";

/**
 * InvoicingEngine — Job-to-invoice generation, line items, tax,
 * payment terms, invoice status tracking, aging report.
 * Bridges job costing to accounting.
 */

export interface Invoice {
  id: string;
  job_id: string;
  customer: CustomerInfo;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  line_items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_pct: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  payment_terms: string;
  notes: string;
  payments: Payment[];
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = "draft" | "sent" | "viewed" | "partial" | "paid" | "overdue" | "void";

export interface CustomerInfo {
  name: string;
  company?: string;
  email: string;
  address?: string;
  phone?: string;
  tax_id?: string;
}

export interface LineItem {
  description: string;
  category: "material" | "labor" | "tooling" | "machining" | "setup" | "programming" | "inspection" | "finishing" | "other";
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

export interface Payment {
  date: string;
  amount: number;
  method: "check" | "wire" | "ach" | "credit_card" | "cash" | "other";
  reference: string;
  notes?: string;
}

export interface InvoiceCreateInput {
  job_id: string;
  customer: CustomerInfo;
  line_items: Omit<LineItem, "amount">[];
  tax_rate?: number;
  discount_pct?: number;
  payment_terms?: string;
  due_days?: number;
  notes?: string;
}

export interface InvoiceFromJobInput {
  job_id: string;
  customer: CustomerInfo;
  cost_breakdown: {
    material_cost: number;
    labor_cost: number;
    tooling_cost: number;
    machine_cost: number;
    setup_cost: number;
    programming_cost: number;
    inspection_cost: number;
    finishing_cost: number;
    overhead_cost: number;
  };
  markup_pct?: number; // default 25%
  tax_rate?: number;
  payment_terms?: string;
  due_days?: number;
}

export interface AgingReport {
  current: { count: number; total: number; invoices: string[] };
  days_30: { count: number; total: number; invoices: string[] };
  days_60: { count: number; total: number; invoices: string[] };
  days_90: { count: number; total: number; invoices: string[] };
  over_90: { count: number; total: number; invoices: string[] };
  total_outstanding: number;
}

class InvoicingEngine {
  private invoices: Map<string, Invoice> = new Map();
  private nextId = 1;

  /** Create an invoice with explicit line items. */
  create(input: InvoiceCreateInput): Invoice {
    const id = `INV-${String(this.nextId++).padStart(5, "0")}`;
    const now = new Date().toISOString();
    const invoiceDate = now.slice(0, 10);
    const dueDays = input.due_days ?? 30;
    const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().slice(0, 10);

    const lineItems: LineItem[] = input.line_items.map((li) => ({
      ...li,
      amount: round2(li.quantity * li.unit_price),
    }));

    const subtotal = round2(lineItems.reduce((s, li) => s + li.amount, 0));
    const discountPct = input.discount_pct ?? 0;
    const discountAmount = round2(subtotal * discountPct / 100);
    const taxable = subtotal - discountAmount;
    const taxRate = input.tax_rate ?? 0;
    const taxAmount = round2(taxable * taxRate / 100);
    const total = round2(taxable + taxAmount);

    const invoice: Invoice = {
      id,
      job_id: input.job_id,
      customer: input.customer,
      invoice_date: invoiceDate,
      due_date: dueDate,
      status: "draft",
      line_items: lineItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount_pct: discountPct,
      discount_amount: discountAmount,
      total,
      amount_paid: 0,
      balance_due: total,
      payment_terms: input.payment_terms ?? `Net ${dueDays}`,
      notes: input.notes ?? "",
      payments: [],
      created_at: now,
      updated_at: now,
    };

    this.invoices.set(id, invoice);
    persistenceBridge.persist("invoices", id, invoice as any);
    return invoice;
  }

  /** Create an invoice from job cost breakdown with markup. */
  fromJobCost(input: InvoiceFromJobInput): Invoice {
    const markup = (input.markup_pct ?? 25) / 100;
    const cb = input.cost_breakdown;

    const items: Omit<LineItem, "amount">[] = [];
    const addItem = (desc: string, cat: LineItem["category"], cost: number) => {
      if (cost > 0) {
        items.push({
          description: desc,
          category: cat,
          quantity: 1,
          unit: "lot",
          unit_price: round2(cost * (1 + markup)),
        });
      }
    };

    addItem("Raw material & stock", "material", cb.material_cost);
    addItem("Direct labor", "labor", cb.labor_cost);
    addItem("Tooling consumption", "tooling", cb.tooling_cost);
    addItem("Machine time", "machining", cb.machine_cost);
    addItem("Setup & fixturing", "setup", cb.setup_cost);
    addItem("CNC programming", "programming", cb.programming_cost);
    addItem("Quality inspection", "inspection", cb.inspection_cost);
    addItem("Finishing operations", "finishing", cb.finishing_cost);
    if (cb.overhead_cost > 0) {
      items.push({
        description: "Overhead & facility",
        category: "other",
        quantity: 1,
        unit: "lot",
        unit_price: round2(cb.overhead_cost * (1 + markup)),
      });
    }

    return this.create({
      job_id: input.job_id,
      customer: input.customer,
      line_items: items,
      tax_rate: input.tax_rate,
      payment_terms: input.payment_terms,
      due_days: input.due_days,
    });
  }

  /** Update invoice status. */
  updateStatus(invoiceId: string, status: InvoiceStatus): Invoice {
    const inv = this.invoices.get(invoiceId);
    if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
    inv.status = status;
    inv.updated_at = new Date().toISOString();
    persistenceBridge.persist("invoices", invoiceId, inv as any);
    return inv;
  }

  /** Record a payment against an invoice. */
  recordPayment(invoiceId: string, payment: Omit<Payment, "date"> & { date?: string }): Invoice {
    const inv = this.invoices.get(invoiceId);
    if (!inv) throw new Error(`Invoice ${invoiceId} not found`);

    const pmt: Payment = {
      ...payment,
      date: payment.date ?? new Date().toISOString().slice(0, 10),
    };
    inv.payments.push(pmt);
    inv.amount_paid = round2(inv.payments.reduce((s, p) => s + p.amount, 0));
    inv.balance_due = round2(inv.total - inv.amount_paid);
    inv.status = inv.balance_due <= 0 ? "paid" : "partial";
    inv.updated_at = new Date().toISOString();
    persistenceBridge.persist("invoices", invoiceId, inv as any);
    return inv;
  }

  /** Get invoice by ID. */
  get(id: string): Invoice | undefined {
    return this.invoices.get(id);
  }

  /** List invoices with optional filters. */
  list(filters?: {
    status?: InvoiceStatus;
    customer_name?: string;
    job_id?: string;
  }): Invoice[] {
    let results = Array.from(this.invoices.values());
    if (filters?.status) results = results.filter((i) => i.status === filters.status);
    if (filters?.customer_name) {
      const q = filters.customer_name.toLowerCase();
      results = results.filter((i) => i.customer.name.toLowerCase().includes(q));
    }
    if (filters?.job_id) results = results.filter((i) => i.job_id === filters.job_id);
    return results;
  }

  /** Generate accounts receivable aging report. */
  agingReport(): AgingReport {
    const now = Date.now();
    const report: AgingReport = {
      current: { count: 0, total: 0, invoices: [] },
      days_30: { count: 0, total: 0, invoices: [] },
      days_60: { count: 0, total: 0, invoices: [] },
      days_90: { count: 0, total: 0, invoices: [] },
      over_90: { count: 0, total: 0, invoices: [] },
      total_outstanding: 0,
    };

    for (const inv of this.invoices.values()) {
      if (inv.status === "paid" || inv.status === "void") continue;
      if (inv.balance_due <= 0) continue;

      const dueDate = new Date(inv.due_date).getTime();
      const daysOverdue = Math.max(0, Math.floor((now - dueDate) / 86400000));

      let bucket: keyof Pick<AgingReport, "current" | "days_30" | "days_60" | "days_90" | "over_90">;
      if (daysOverdue === 0) bucket = "current";
      else if (daysOverdue <= 30) bucket = "days_30";
      else if (daysOverdue <= 60) bucket = "days_60";
      else if (daysOverdue <= 90) bucket = "days_90";
      else bucket = "over_90";

      report[bucket].count++;
      report[bucket].total = round2(report[bucket].total + inv.balance_due);
      report[bucket].invoices.push(inv.id);
      report.total_outstanding = round2(report.total_outstanding + inv.balance_due);

      // Mark overdue
      if (daysOverdue > 0 && inv.status !== "overdue" && inv.status !== "partial") {
        inv.status = "overdue";
        persistenceBridge.persist("invoices", inv.id, inv as any);
      }
    }

    return report;
  }

  /** Revenue summary by customer. */
  revenueByCustomer(): { customer: string; invoices: number; total: number; paid: number; outstanding: number }[] {
    const map = new Map<string, { invoices: number; total: number; paid: number; outstanding: number }>();

    for (const inv of this.invoices.values()) {
      if (inv.status === "void") continue;
      const key = inv.customer.name;
      const entry = map.get(key) ?? { invoices: 0, total: 0, paid: 0, outstanding: 0 };
      entry.invoices++;
      entry.total += inv.total;
      entry.paid += inv.amount_paid;
      entry.outstanding += inv.balance_due;
      map.set(key, entry);
    }

    return Array.from(map.entries())
      .map(([customer, data]) => ({
        customer,
        invoices: data.invoices,
        total: round2(data.total),
        paid: round2(data.paid),
        outstanding: round2(data.outstanding),
      }))
      .sort((a, b) => b.total - a.total);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const invoicingEngine = new InvoicingEngine();
export { InvoicingEngine };

// ─── Persistence Bridge Registration ────────────────────────────────────────
persistenceBridge.registerMap({
  entity: "invoices",
  getMap: () => (invoicingEngine as any).invoices as Map<string, any>,
  keyField: "id",
});
