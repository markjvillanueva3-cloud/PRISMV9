/**
 * LatheCustomerOrderLifecycleEngine — Customer Order Lifecycle Management
 *
 * U-LTH51: Tracks customer → order → quote → job → shipment → invoice lifecycle
 * Uses JobLifecycleEngine + OrderManagerEngine + CustomerManagementEngine + JobTravelerEngine patterns
 *
 * @module engines/LatheCustomerOrderLifecycleEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type OrderStatus =
  | "rfq_received"
  | "quoted"
  | "quote_accepted"
  | "order_confirmed"
  | "scheduled"
  | "in_production"
  | "quality_check"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "invoiced"
  | "paid"
  | "closed"
  | "cancelled";

export interface Customer {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  payment_terms: "net_15" | "net_30" | "net_45" | "net_60" | "cod" | "prepaid";
  credit_limit: number;
  current_balance: number;
  tier: "standard" | "preferred" | "strategic";
  notes?: string;
}

export interface Order {
  order_id: string;
  customer_id: string;
  quote_id?: string;
  po_number?: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  due_date: string;
  priority: "low" | "normal" | "high" | "rush";
  line_items: OrderLineItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  notes?: string;
  history: StatusChange[];
}

export interface OrderLineItem {
  line_id: string;
  part_number: string;
  description: string;
  quantity: number;
  unit_price: number;
  extended_price: number;
  job_id?: string;
  status: "pending" | "in_progress" | "complete" | "shipped";
}

export interface StatusChange {
  from_status: OrderStatus;
  to_status: OrderStatus;
  timestamp: string;
  user_id?: string;
  notes?: string;
}

export interface Shipment {
  shipment_id: string;
  order_id: string;
  carrier: string;
  tracking_number: string;
  ship_date: string;
  estimated_delivery: string;
  actual_delivery?: string;
  weight_lbs: number;
  items: Array<{ line_id: string; quantity: number }>;
  status: "pending" | "in_transit" | "delivered" | "exception";
}

export interface Invoice {
  invoice_id: string;
  order_id: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: "draft" | "sent" | "partial" | "paid" | "overdue" | "void";
  payments: Payment[];
}

export interface Payment {
  payment_id: string;
  date: string;
  amount: number;
  method: "check" | "ach" | "wire" | "credit_card" | "cash";
  reference: string;
}

export interface LifecycleMetrics {
  total_orders: number;
  orders_by_status: Record<OrderStatus, number>;
  average_lead_time_days: number;
  on_time_delivery_pct: number;
  average_order_value: number;
  revenue_this_month: number;
  outstanding_receivables: number;
}

// ============================================================================
// VALID TRANSITIONS
// ============================================================================

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  rfq_received: ["quoted", "cancelled"],
  quoted: ["quote_accepted", "rfq_received", "cancelled"],
  quote_accepted: ["order_confirmed", "quoted", "cancelled"],
  order_confirmed: ["scheduled", "cancelled"],
  scheduled: ["in_production", "order_confirmed", "cancelled"],
  in_production: ["quality_check", "scheduled"],
  quality_check: ["ready_to_ship", "in_production"],
  ready_to_ship: ["shipped", "quality_check"],
  shipped: ["delivered", "ready_to_ship"],
  delivered: ["invoiced"],
  invoiced: ["paid", "delivered"],
  paid: ["closed"],
  closed: [],
  cancelled: [],
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheCustomerOrderLifecycleEngine {
  private customers: Map<string, Customer> = new Map();
  private orders: Map<string, Order> = new Map();
  private shipments: Map<string, Shipment> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private orderCounter = 0;

  // --------------------------------------------------------------------------
  // Customer Management
  // --------------------------------------------------------------------------

  createCustomer(customer: Omit<Customer, "id">): Customer {
    const id = `CUST-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newCustomer: Customer = { ...customer, id };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  getCustomer(customerId: string): Customer | null {
    return this.customers.get(customerId) || null;
  }

  updateCustomer(customerId: string, updates: Partial<Omit<Customer, "id">>): Customer | null {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    const updated = { ...customer, ...updates };
    this.customers.set(customerId, updated);
    return updated;
  }

  getAllCustomers(): Customer[] {
    return Array.from(this.customers.values());
  }

  // --------------------------------------------------------------------------
  // Order Management
  // --------------------------------------------------------------------------

  createOrder(
    customerId: string,
    lineItems: Omit<OrderLineItem, "line_id" | "extended_price" | "status">[],
    options: {
      po_number?: string;
      quote_id?: string;
      due_date: string;
      priority?: "low" | "normal" | "high" | "rush";
      notes?: string;
    }
  ): Order | null {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    this.orderCounter++;
    const orderId = `ORD-${Date.now().toString(36)}-${this.orderCounter.toString().padStart(4, "0")}`;
    const now = new Date().toISOString();

    const items: OrderLineItem[] = lineItems.map((item, idx) => ({
      ...item,
      line_id: `${orderId}-L${(idx + 1).toString().padStart(2, "0")}`,
      extended_price: item.quantity * item.unit_price,
      status: "pending",
    }));

    const subtotal = items.reduce((sum, item) => sum + item.extended_price, 0);
    const tax = subtotal * 0.0; // Tax calculated separately
    const shipping = 0;

    const order: Order = {
      order_id: orderId,
      customer_id: customerId,
      quote_id: options.quote_id,
      po_number: options.po_number,
      status: "rfq_received",
      created_at: now,
      updated_at: now,
      due_date: options.due_date,
      priority: options.priority || "normal",
      line_items: items,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      shipping,
      total: Math.round((subtotal + tax + shipping) * 100) / 100,
      notes: options.notes,
      history: [],
    };

    this.orders.set(orderId, order);
    return order;
  }

  getOrder(orderId: string): Order | null {
    return this.orders.get(orderId) || null;
  }

  getOrdersByCustomer(customerId: string): Order[] {
    return Array.from(this.orders.values()).filter((o) => o.customer_id === customerId);
  }

  getOrdersByStatus(status: OrderStatus): Order[] {
    return Array.from(this.orders.values()).filter((o) => o.status === status);
  }

  getAllOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  // --------------------------------------------------------------------------
  // Status Transitions
  // --------------------------------------------------------------------------

  transitionOrder(
    orderId: string,
    toStatus: OrderStatus,
    options?: { user_id?: string; notes?: string }
  ): { success: boolean; order?: Order; error?: string } {
    const order = this.orders.get(orderId);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    const validNextStatuses = VALID_TRANSITIONS[order.status];
    if (!validNextStatuses.includes(toStatus)) {
      return {
        success: false,
        error: `Invalid transition from ${order.status} to ${toStatus}`,
      };
    }

    const change: StatusChange = {
      from_status: order.status,
      to_status: toStatus,
      timestamp: new Date().toISOString(),
      user_id: options?.user_id,
      notes: options?.notes,
    };

    order.history.push(change);
    order.status = toStatus;
    order.updated_at = change.timestamp;

    this.orders.set(orderId, order);
    return { success: true, order };
  }

  getValidTransitions(orderId: string): OrderStatus[] {
    const order = this.orders.get(orderId);
    if (!order) return [];
    return VALID_TRANSITIONS[order.status] || [];
  }

  // --------------------------------------------------------------------------
  // Shipment Management
  // --------------------------------------------------------------------------

  createShipment(
    orderId: string,
    shipmentData: Omit<Shipment, "shipment_id" | "order_id" | "status">
  ): Shipment | null {
    const order = this.orders.get(orderId);
    if (!order) return null;

    const shipmentId = `SHIP-${Date.now().toString(36)}`;
    const shipment: Shipment = {
      ...shipmentData,
      shipment_id: shipmentId,
      order_id: orderId,
      status: "pending",
    };

    this.shipments.set(shipmentId, shipment);

    // Update line item statuses
    for (const item of shipment.items) {
      const lineItem = order.line_items.find((li) => li.line_id === item.line_id);
      if (lineItem) {
        lineItem.status = "shipped";
      }
    }
    this.orders.set(orderId, order);

    return shipment;
  }

  updateShipmentStatus(
    shipmentId: string,
    status: Shipment["status"],
    actualDelivery?: string
  ): Shipment | null {
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) return null;

    shipment.status = status;
    if (actualDelivery) {
      shipment.actual_delivery = actualDelivery;
    }

    this.shipments.set(shipmentId, shipment);
    return shipment;
  }

  getShipmentsByOrder(orderId: string): Shipment[] {
    return Array.from(this.shipments.values()).filter((s) => s.order_id === orderId);
  }

  // --------------------------------------------------------------------------
  // Invoice Management
  // --------------------------------------------------------------------------

  createInvoice(orderId: string): Invoice | null {
    const order = this.orders.get(orderId);
    if (!order) return null;

    const customer = this.customers.get(order.customer_id);
    if (!customer) return null;

    const invoiceId = `INV-${Date.now().toString(36)}`;
    const invoiceDate = new Date();

    const paymentDays = {
      net_15: 15,
      net_30: 30,
      net_45: 45,
      net_60: 60,
      cod: 0,
      prepaid: 0,
    };
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + paymentDays[customer.payment_terms]);

    const invoice: Invoice = {
      invoice_id: invoiceId,
      order_id: orderId,
      customer_id: order.customer_id,
      invoice_date: invoiceDate.toISOString(),
      due_date: dueDate.toISOString(),
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      total: order.total,
      amount_paid: 0,
      balance_due: order.total,
      status: "draft",
      payments: [],
    };

    this.invoices.set(invoiceId, invoice);
    return invoice;
  }

  recordPayment(
    invoiceId: string,
    payment: Omit<Payment, "payment_id">
  ): Invoice | null {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) return null;

    const paymentRecord: Payment = {
      ...payment,
      payment_id: `PAY-${Date.now().toString(36)}`,
    };

    invoice.payments.push(paymentRecord);
    invoice.amount_paid += payment.amount;
    invoice.balance_due = Math.max(0, invoice.total - invoice.amount_paid);

    if (invoice.balance_due === 0) {
      invoice.status = "paid";
    } else if (invoice.amount_paid > 0) {
      invoice.status = "partial";
    }

    this.invoices.set(invoiceId, invoice);

    // Update customer balance
    const customer = this.customers.get(invoice.customer_id);
    if (customer) {
      customer.current_balance = Math.max(0, customer.current_balance - payment.amount);
      this.customers.set(customer.id, customer);
    }

    return invoice;
  }

  getInvoicesByCustomer(customerId: string): Invoice[] {
    return Array.from(this.invoices.values()).filter((i) => i.customer_id === customerId);
  }

  getInvoicesByStatus(status: Invoice["status"]): Invoice[] {
    return Array.from(this.invoices.values()).filter((i) => i.status === status);
  }

  // --------------------------------------------------------------------------
  // Metrics & Reporting
  // --------------------------------------------------------------------------

  getLifecycleMetrics(): LifecycleMetrics {
    const orders = Array.from(this.orders.values());
    const invoices = Array.from(this.invoices.values());

    const ordersByStatus: Record<OrderStatus, number> = {} as Record<OrderStatus, number>;
    for (const status of Object.keys(VALID_TRANSITIONS) as OrderStatus[]) {
      ordersByStatus[status] = orders.filter((o) => o.status === status).length;
    }

    const completedOrders = orders.filter((o) => o.status === "closed" || o.status === "paid");
    const leadTimes = completedOrders.map((o) => {
      const created = new Date(o.created_at).getTime();
      const updated = new Date(o.updated_at).getTime();
      return (updated - created) / (1000 * 60 * 60 * 24);
    });
    const avgLeadTime = leadTimes.length > 0
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      : 0;

    const deliveredOnTime = orders.filter((o) => {
      if (o.status !== "delivered" && o.status !== "invoiced" && o.status !== "paid" && o.status !== "closed") {
        return false;
      }
      return new Date(o.updated_at) <= new Date(o.due_date);
    });
    const onTimePct = completedOrders.length > 0
      ? (deliveredOnTime.length / completedOrders.length) * 100
      : 100;

    const avgOrderValue = orders.length > 0
      ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length
      : 0;

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const revenueThisMonth = invoices
      .filter((i) => i.status === "paid" && new Date(i.invoice_date) >= thisMonth)
      .reduce((sum, i) => sum + i.total, 0);

    const outstandingReceivables = invoices
      .filter((i) => i.status !== "paid" && i.status !== "void")
      .reduce((sum, i) => sum + i.balance_due, 0);

    return {
      total_orders: orders.length,
      orders_by_status: ordersByStatus,
      average_lead_time_days: Math.round(avgLeadTime * 10) / 10,
      on_time_delivery_pct: Math.round(onTimePct * 10) / 10,
      average_order_value: Math.round(avgOrderValue * 100) / 100,
      revenue_this_month: Math.round(revenueThisMonth * 100) / 100,
      outstanding_receivables: Math.round(outstandingReceivables * 100) / 100,
    };
  }

  getOrderTimeline(orderId: string): StatusChange[] {
    const order = this.orders.get(orderId);
    return order?.history || [];
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  clearAll(): void {
    this.customers.clear();
    this.orders.clear();
    this.shipments.clear();
    this.invoices.clear();
    this.orderCounter = 0;
  }
}

export const latheCustomerOrderLifecycleEngine = new LatheCustomerOrderLifecycleEngine();
