import { persistenceBridge } from "../db/PersistenceBridge.js";

/**
 * PurchaseOrderEngine — Purchase order lifecycle, receiving, 3-way match, AP tracking.
 * Closes the spending loop: PO → Receive → Invoice Match → Payment.
 *
 * U-XWIRE3: Exposes a receive-hook so ToolUsageEngine can register a callback
 * for auto-restock on PO receive without creating a circular dependency.
 */

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  supplier_name: string;
  status: 'draft' | 'submitted' | 'approved' | 'partially_received' | 'received' | 'invoiced' | 'paid' | 'cancelled';
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  line_items: POLineItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  payment_terms: string;
  notes?: string;
  linked_jobs: string[];
}

export interface POLineItem {
  id: string;
  description: string;
  part_number?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total: number;
  category: 'raw_material' | 'cutting_tool' | 'workholding' | 'consumable' | 'machine_part' | 'service' | 'other';
  job_id?: string;
}

export interface ReceivingRecord {
  id: string;
  po_id: string;
  received_at: string;
  received_by: string;
  line_items: { line_id: string; quantity_received: number; condition: 'good' | 'damaged' | 'wrong_item'; notes?: string }[];
  packing_slip?: string;
}

export interface ThreeWayMatch {
  po_id: string;
  po_total: number;
  receiving_total: number;
  invoice_total: number;
  quantity_match: boolean;
  price_match: boolean;
  overall_match: boolean;
  discrepancies: { field: string; po_value: number; invoice_value: number; diff: number }[];
}

export interface APAgingSummary {
  total_payable: number;
  current: number;
  over_30: number;
  over_60: number;
  over_90: number;
  by_supplier: { supplier: string; amount: number; oldest_days: number }[];
}

class PurchaseOrderEngine {
  private orders: Map<string, PurchaseOrder> = new Map();
  private receivings: Map<string, ReceivingRecord[]> = new Map();
  private nextId = 1;

  // U-XWIRE3: Receive callbacks — engines register hooks to react to PO receiving
  // without creating circular imports. ToolUsageEngine uses this for auto-restock.
  private _receiveHooks: Array<(po: PurchaseOrder, rec: ReceivingRecord) => void> = [];
  onReceive(hook: (po: PurchaseOrder, rec: ReceivingRecord) => void): void {
    this._receiveHooks.push(hook);
  }

  createOrder(params: {
    supplier_id: string;
    supplier_name: string;
    line_items: Omit<POLineItem, 'id' | 'quantity_received' | 'total'>[];
    payment_terms?: string;
    tax_rate?: number;
    notes?: string;
    linked_jobs?: string[];
  }): PurchaseOrder {
    const id = `PO-${String(this.nextId++).padStart(5, '0')}`;
    const items: POLineItem[] = params.line_items.map((li, i) => ({
      ...li,
      id: `${id}-L${i + 1}`,
      quantity_received: 0,
      total: li.quantity_ordered * li.unit_price,
    }));
    const subtotal = items.reduce((s, li) => s + li.total, 0);
    const taxRate = params.tax_rate ?? 0.08;
    const po: PurchaseOrder = {
      id,
      supplier_id: params.supplier_id,
      supplier_name: params.supplier_name,
      status: 'draft',
      created_at: new Date().toISOString(),
      line_items: items,
      subtotal,
      tax: subtotal * taxRate,
      shipping: 0,
      total: subtotal * (1 + taxRate),
      payment_terms: params.payment_terms ?? 'Net 30',
      notes: params.notes,
      linked_jobs: params.linked_jobs ?? [],
    };
    this.orders.set(id, po);
    persistenceBridge.persist("purchase_orders", id, po as any);
    return po;
  }

  approveOrder(po_id: string, approved_by: string): PurchaseOrder {
    const po = this.orders.get(po_id);
    if (!po) throw new Error(`PO ${po_id} not found`);
    if (po.status !== 'draft' && po.status !== 'submitted') throw new Error(`Cannot approve PO in status ${po.status}`);
    po.status = 'approved';
    po.approved_by = approved_by;
    po.approved_at = new Date().toISOString();
    persistenceBridge.persist("purchase_orders", po_id, po as any);
    return po;
  }

  receiveGoods(params: {
    po_id: string;
    received_by: string;
    line_items: { line_id: string; quantity_received: number; condition?: 'good' | 'damaged' | 'wrong_item'; notes?: string }[];
    packing_slip?: string;
  }): ReceivingRecord {
    const po = this.orders.get(params.po_id);
    if (!po) throw new Error(`PO ${params.po_id} not found`);

    const rec: ReceivingRecord = {
      id: `RCV-${Date.now()}`,
      po_id: params.po_id,
      received_at: new Date().toISOString(),
      received_by: params.received_by,
      line_items: params.line_items.map((li) => ({
        line_id: li.line_id,
        quantity_received: li.quantity_received,
        condition: li.condition ?? 'good',
        notes: li.notes,
      })),
      packing_slip: params.packing_slip,
    };

    // Update PO line quantities
    for (const ri of params.line_items) {
      const poLine = po.line_items.find((l) => l.id === ri.line_id);
      if (poLine) {
        poLine.quantity_received += ri.quantity_received;
      }
    }

    const allReceived = po.line_items.every((l) => l.quantity_received >= l.quantity_ordered);
    const someReceived = po.line_items.some((l) => l.quantity_received > 0);
    po.status = allReceived ? 'received' : someReceived ? 'partially_received' : po.status;

    const existing = this.receivings.get(params.po_id) ?? [];
    existing.push(rec);
    this.receivings.set(params.po_id, existing);

    persistenceBridge.persist("purchase_orders", params.po_id, po as any);
    persistenceBridge.persistAppend("po_receivings", rec as any);

    // U-XWIRE3: Fire receive hooks (e.g., ToolUsageEngine auto-restock)
    for (const hook of this._receiveHooks) {
      try { hook(po, rec); } catch { /* cascade failure must not block PO receive */ }
    }

    return rec;
  }

  threeWayMatch(po_id: string, invoice_total: number, invoice_line_prices?: { line_id: string; price: number }[]): ThreeWayMatch {
    const po = this.orders.get(po_id);
    if (!po) throw new Error(`PO ${po_id} not found`);

    // Receiving total is the sum of received quantities at PO unit prices (no tax markup)
    const receiving_total = po.line_items.reduce((s, li) => s + (li.quantity_received * li.unit_price), 0);
    const discrepancies: ThreeWayMatch['discrepancies'] = [];

    // PO vs Invoice comparison
    if (Math.abs(po.total - invoice_total) > 0.01) {
      discrepancies.push({ field: 'total', po_value: po.total, invoice_value: invoice_total, diff: invoice_total - po.total });
    }

    // Receipt vs PO subtotal comparison (true 3-way: receipt leg vs PO)
    const receipt_vs_po_discrepancy = Math.abs(receiving_total - po.subtotal);
    if (receipt_vs_po_discrepancy > 0.01) {
      discrepancies.push({ field: 'receipt_vs_po_subtotal', po_value: po.subtotal, invoice_value: receiving_total, diff: receiving_total - po.subtotal });
    }

    // Receipt vs Invoice subtotal comparison (true 3-way: receipt leg vs Invoice)
    // Invoice total includes tax/shipping, so compare receipt to invoice for awareness
    const receipt_vs_invoice_discrepancy = Math.abs(receiving_total - invoice_total);
    if (receipt_vs_invoice_discrepancy > 0.01) {
      discrepancies.push({ field: 'receipt_vs_invoice', po_value: receiving_total, invoice_value: invoice_total, diff: invoice_total - receiving_total });
    }

    if (invoice_line_prices) {
      for (const ilp of invoice_line_prices) {
        const poLine = po.line_items.find((l) => l.id === ilp.line_id);
        if (poLine && Math.abs(poLine.unit_price - ilp.price) > 0.01) {
          discrepancies.push({ field: `line_${ilp.line_id}_price`, po_value: poLine.unit_price, invoice_value: ilp.price, diff: ilp.price - poLine.unit_price });
        }
      }
    }

    const quantity_match = po.line_items.every((l) => l.quantity_received >= l.quantity_ordered);
    const price_match = discrepancies.length === 0;
    // True 3-way match requires quantities received AND no price/total discrepancies across all three legs
    const receipt_match = receipt_vs_po_discrepancy <= 0.01;

    return {
      po_id,
      po_total: po.total,
      receiving_total,
      invoice_total,
      quantity_match,
      price_match,
      overall_match: quantity_match && price_match && receipt_match,
      discrepancies,
    };
  }

  /** Parse payment terms string (e.g. "Net 30", "Net 60") to extract days. Falls back to 30. */
  private parsePaymentTermsDays(terms: string): number {
    const match = terms.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 30;
  }

  /** Compute days overdue: days past the due date (created_at + payment_terms_days). */
  private computeDaysOverdue(po: PurchaseOrder, now: number): number {
    const termsDays = this.parsePaymentTermsDays(po.payment_terms);
    const createdMs = new Date(po.created_at).getTime();
    const dueDateMs = createdMs + termsDays * 86400000;
    return Math.max(0, Math.floor((now - dueDateMs) / 86400000));
  }

  getAPAging(): APAgingSummary {
    const now = Date.now();
    const bySupplier = new Map<string, { amount: number; oldest: number }>();

    for (const po of this.orders.values()) {
      if (po.status === 'received' || po.status === 'invoiced') {
        const daysOverdue = this.computeDaysOverdue(po, now);
        const existing = bySupplier.get(po.supplier_name) ?? { amount: 0, oldest: 0 };
        existing.amount += po.total;
        existing.oldest = Math.max(existing.oldest, daysOverdue);
        bySupplier.set(po.supplier_name, existing);
      }
    }

    let current = 0, over_30 = 0, over_60 = 0, over_90 = 0;
    for (const po of this.orders.values()) {
      if (po.status !== 'received' && po.status !== 'invoiced') continue;
      const daysOverdue = this.computeDaysOverdue(po, now);
      if (daysOverdue > 90) over_90 += po.total;
      else if (daysOverdue > 60) over_60 += po.total;
      else if (daysOverdue > 30) over_30 += po.total;
      else current += po.total;
    }

    return {
      total_payable: current + over_30 + over_60 + over_90,
      current, over_30, over_60, over_90,
      by_supplier: [...bySupplier.entries()].map(([supplier, data]) => ({
        supplier, amount: data.amount, oldest_days: data.oldest,
      })).sort((a, b) => b.amount - a.amount),
    };
  }

  getOrder(id: string): PurchaseOrder | undefined {
    return this.orders.get(id);
  }

  listOrders(filter?: { status?: string; supplier?: string }): PurchaseOrder[] {
    let result = [...this.orders.values()];
    if (filter?.status) result = result.filter((po) => po.status === filter.status);
    if (filter?.supplier) result = result.filter((po) => po.supplier_name.toLowerCase().includes(filter.supplier!.toLowerCase()));
    return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  spendByCategory(): { category: string; total: number; order_count: number }[] {
    const cats = new Map<string, { total: number; count: Set<string> }>();
    for (const po of this.orders.values()) {
      if (po.status === 'cancelled') continue;
      for (const li of po.line_items) {
        const existing = cats.get(li.category) ?? { total: 0, count: new Set() };
        existing.total += li.total;
        existing.count.add(po.id);
        cats.set(li.category, existing);
      }
    }
    return [...cats.entries()].map(([category, data]) => ({
      category, total: data.total, order_count: data.count.size,
    })).sort((a, b) => b.total - a.total);
  }
}

export const purchaseOrderEngine = new PurchaseOrderEngine();

// ─── Persistence Bridge Registration ────────────────────────────────────────
persistenceBridge.registerMap({
  entity: "purchase_orders",
  getMap: () => (purchaseOrderEngine as any).orders as Map<string, any>,
  keyField: "id",
});
