/**
 * LatheCustomerOrderLifecycleEngine Tests
 *
 * U-LTH51: Customer order lifecycle management
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheCustomerOrderLifecycleEngine,
  type Customer,
  type OrderStatus,
} from "../engines/LatheCustomerOrderLifecycleEngine.js";

describe("LatheCustomerOrderLifecycleEngine", () => {
  const sampleCustomer: Omit<Customer, "id"> = {
    name: "ALCOA Corporation",
    contact_name: "John Smith",
    email: "john.smith@alcoa.com",
    phone: "555-123-4567",
    address: {
      street: "123 Industrial Blvd",
      city: "Pittsburgh",
      state: "PA",
      zip: "15219",
      country: "USA",
    },
    payment_terms: "net_30",
    credit_limit: 50000,
    current_balance: 0,
    tier: "preferred",
  };

  beforeEach(() => {
    latheCustomerOrderLifecycleEngine.clearAll();
  });

  describe("Customer Management", () => {
    it("creates customer with generated ID", () => {
      const customer = latheCustomerOrderLifecycleEngine.createCustomer(sampleCustomer);

      expect(customer.id).toMatch(/^CUST-/);
      expect(customer.name).toBe("ALCOA Corporation");
      expect(customer.tier).toBe("preferred");
    });

    it("retrieves customer by ID", () => {
      const created = latheCustomerOrderLifecycleEngine.createCustomer(sampleCustomer);
      const retrieved = latheCustomerOrderLifecycleEngine.getCustomer(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe(created.name);
    });

    it("returns null for unknown customer", () => {
      const retrieved = latheCustomerOrderLifecycleEngine.getCustomer("UNKNOWN-ID");
      expect(retrieved).toBeNull();
    });

    it("updates customer fields", () => {
      const customer = latheCustomerOrderLifecycleEngine.createCustomer(sampleCustomer);
      const updated = latheCustomerOrderLifecycleEngine.updateCustomer(customer.id, {
        credit_limit: 75000,
        tier: "strategic",
      });

      expect(updated?.credit_limit).toBe(75000);
      expect(updated?.tier).toBe("strategic");
      expect(updated?.name).toBe("ALCOA Corporation");
    });

    it("gets all customers", () => {
      latheCustomerOrderLifecycleEngine.createCustomer(sampleCustomer);
      latheCustomerOrderLifecycleEngine.createCustomer({
        ...sampleCustomer,
        name: "Boeing",
      });

      const all = latheCustomerOrderLifecycleEngine.getAllCustomers();
      expect(all.length).toBe(2);
    });
  });

  describe("Order Management", () => {
    let customerId: string;

    beforeEach(() => {
      const customer = latheCustomerOrderLifecycleEngine.createCustomer(sampleCustomer);
      customerId = customer.id;
    });

    it("creates order with line items", () => {
      const order = latheCustomerOrderLifecycleEngine.createOrder(
        customerId,
        [
          { part_number: "PART-001", description: "Shaft Assembly", quantity: 100, unit_price: 25 },
          { part_number: "PART-002", description: "Bushing", quantity: 200, unit_price: 10 },
        ],
        { due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() }
      );

      expect(order).not.toBeNull();
      expect(order?.order_id).toMatch(/^ORD-/);
      expect(order?.line_items.length).toBe(2);
      expect(order?.subtotal).toBe(4500);
      expect(order?.status).toBe("rfq_received");
    });

    it("calculates extended prices", () => {
      const order = latheCustomerOrderLifecycleEngine.createOrder(
        customerId,
        [{ part_number: "PART-001", description: "Test", quantity: 50, unit_price: 12.50 }],
        { due_date: "2026-05-01" }
      );

      expect(order?.line_items[0].extended_price).toBe(625);
    });

    it("generates unique line IDs", () => {
      const order = latheCustomerOrderLifecycleEngine.createOrder(
        customerId,
        [
          { part_number: "A", description: "A", quantity: 1, unit_price: 1 },
          { part_number: "B", description: "B", quantity: 1, unit_price: 1 },
        ],
        { due_date: "2026-05-01" }
      );

      expect(order?.line_items[0].line_id).toContain("-L01");
      expect(order?.line_items[1].line_id).toContain("-L02");
    });

    it("returns null for unknown customer", () => {
      const order = latheCustomerOrderLifecycleEngine.createOrder(
        "UNKNOWN",
        [{ part_number: "X", description: "X", quantity: 1, unit_price: 1 }],
        { due_date: "2026-05-01" }
      );

      expect(order).toBeNull();
    });

    it("retrieves orders by customer", () => {
      latheCustomerOrderLifecycleEngine.createOrder(
        customerId,
        [{ part_number: "A", description: "A", quantity: 1, unit_price: 100 }],
        { due_date: "2026-05-01" }
      );
      latheCustomerOrderLifecycleEngine.createOrder(
        customerId,
        [{ part_number: "B", description: "B", quantity: 1, unit_price: 200 }],
        { due_date: "2026-05-15" }
      );

      const orders = latheCustomerOrderLifecycleEngine.getOrdersByCustomer(customerId);
      expect(orders.length).toBe(2);
    });

    it("retrieves orders by status", () => {
      const order = latheCustomerOrderLifecycleEngine.createOrder(
        customerId,
        [{ part_number: "A", description: "A", quantity: 1, unit_price: 100 }],
        { due_date: "2026-05-01" }
      );

      const rfqOrders = latheCustomerOrderLifecycleEngine.getOrdersByStatus("rfq_received");
      expect(rfqOrders.length).toBe(1);
      expect(rfqOrders[0].order_id).toBe(order?.order_id);
    });
  });

  describe("Status Transitions", () => {
    let orderId: string;

    beforeEach(() => {
      const customer = latheCustomerOrderLifecycleEngine.createCustomer(sampleCustomer);
      const order = latheCustomerOrderLifecycleEngine.createOrder(
        customer.id,
        [{ part_number: "A", description: "A", quantity: 10, unit_price: 50 }],
        { due_date: "2026-05-01" }
      );
      orderId = order!.order_id;
    });

    it("transitions through valid states", () => {
      const transitions: OrderStatus[] = [
        "quoted",
        "quote_accepted",
        "order_confirmed",
        "scheduled",
        "in_production",
        "quality_check",
        "ready_to_ship",
      ];

      for (const status of transitions) {
        const result = latheCustomerOrderLifecycleEngine.transitionOrder(orderId, status);
        expect(result.success).toBe(true);
        expect(result.order?.status).toBe(status);
      }
    });

    it("rejects invalid transitions", () => {
      const result = latheCustomerOrderLifecycleEngine.transitionOrder(
        orderId,
        "shipped"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid transition");
    });

    it("records transition history", () => {
      latheCustomerOrderLifecycleEngine.transitionOrder(orderId, "quoted", {
        user_id: "USER-001",
        notes: "Quote sent to customer",
      });

      const timeline = latheCustomerOrderLifecycleEngine.getOrderTimeline(orderId);
      expect(timeline.length).toBe(1);
      expect(timeline[0].from_status).toBe("rfq_received");
      expect(timeline[0].to_status).toBe("quoted");
      expect(timeline[0].user_id).toBe("USER-001");
    });

    it("returns valid transitions for current state", () => {
      const valid = latheCustomerOrderLifecycleEngine.getValidTransitions(orderId);
      expect(valid).toContain("quoted");
      expect(valid).toContain("cancelled");
      expect(valid).not.toContain("shipped");
    });

    it("allows cancellation from most states", () => {
      latheCustomerOrderLifecycleEngine.transitionOrder(orderId, "quoted");
      const result = latheCustomerOrderLifecycleEngine.transitionOrder(orderId, "cancelled");

      expect(result.success).toBe(true);
      expect(result.order?.status).toBe("cancelled");
    });
  });

  describe("Shipment Management", () => {
    let orderId: string;
    let lineId: string;

    beforeEach(() => {
      const customer = latheCustomerOrderLifecycleEngine.createCustomer(sampleCustomer);
      const order = latheCustomerOrderLifecycleEngine.createOrder(
        customer.id,
        [{ part_number: "A", description: "Part A", quantity: 100, unit_price: 25 }],
        { due_date: "2026-05-01" }
      );
      orderId = order!.order_id;
      lineId = order!.line_items[0].line_id;

      // Progress order to ready_to_ship
      ["quoted", "quote_accepted", "order_confirmed", "scheduled", "in_production", "quality_check", "ready_to_ship"].forEach((status) => {
        latheCustomerOrderLifecycleEngine.transitionOrder(orderId, status as OrderStatus);
      });
    });

    it("creates shipment for order", () => {
      const shipment = latheCustomerOrderLifecycleEngine.createShipment(orderId, {
        carrier: "UPS",
        tracking_number: "1Z999AA10123456784",
        ship_date: new Date().toISOString(),
        estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        weight_lbs: 25.5,
        items: [{ line_id: lineId, quantity: 100 }],
      });

      expect(shipment).not.toBeNull();
      expect(shipment?.shipment_id).toMatch(/^SHIP-/);
      expect(shipment?.carrier).toBe("UPS");
      expect(shipment?.status).toBe("pending");
    });

    it("updates line item status on shipment", () => {
      latheCustomerOrderLifecycleEngine.createShipment(orderId, {
        carrier: "FedEx",
        tracking_number: "123456789",
        ship_date: new Date().toISOString(),
        estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        weight_lbs: 10,
        items: [{ line_id: lineId, quantity: 100 }],
      });

      const order = latheCustomerOrderLifecycleEngine.getOrder(orderId);
      expect(order?.line_items[0].status).toBe("shipped");
    });

    it("updates shipment status", () => {
      const shipment = latheCustomerOrderLifecycleEngine.createShipment(orderId, {
        carrier: "UPS",
        tracking_number: "ABC123",
        ship_date: new Date().toISOString(),
        estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        weight_lbs: 15,
        items: [{ line_id: lineId, quantity: 100 }],
      });

      const updated = latheCustomerOrderLifecycleEngine.updateShipmentStatus(
        shipment!.shipment_id,
        "delivered",
        new Date().toISOString()
      );

      expect(updated?.status).toBe("delivered");
      expect(updated?.actual_delivery).toBeTruthy();
    });

    it("retrieves shipments by order", () => {
      latheCustomerOrderLifecycleEngine.createShipment(orderId, {
        carrier: "UPS",
        tracking_number: "111",
        ship_date: new Date().toISOString(),
        estimated_delivery: new Date().toISOString(),
        weight_lbs: 5,
        items: [{ line_id: lineId, quantity: 50 }],
      });

      const shipments = latheCustomerOrderLifecycleEngine.getShipmentsByOrder(orderId);
      expect(shipments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Invoice Management", () => {
    let orderId: string;
    let customerId: string;

    beforeEach(() => {
      const customer = latheCustomerOrderLifecycleEngine.createCustomer(sampleCustomer);
      customerId = customer.id;
      const order = latheCustomerOrderLifecycleEngine.createOrder(
        customerId,
        [{ part_number: "A", description: "Part", quantity: 10, unit_price: 100 }],
        { due_date: "2026-05-01" }
      );
      orderId = order!.order_id;
    });

    it("creates invoice from order", () => {
      const invoice = latheCustomerOrderLifecycleEngine.createInvoice(orderId);

      expect(invoice).not.toBeNull();
      expect(invoice?.invoice_id).toMatch(/^INV-/);
      expect(invoice?.total).toBe(1000);
      expect(invoice?.balance_due).toBe(1000);
      expect(invoice?.status).toBe("draft");
    });

    it("calculates due date from payment terms", () => {
      const invoice = latheCustomerOrderLifecycleEngine.createInvoice(orderId);

      const invoiceDate = new Date(invoice!.invoice_date);
      const dueDate = new Date(invoice!.due_date);
      const daysDiff = Math.round((dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBe(30); // net_30
    });

    it("records payment and updates balance", () => {
      const invoice = latheCustomerOrderLifecycleEngine.createInvoice(orderId);
      const updated = latheCustomerOrderLifecycleEngine.recordPayment(invoice!.invoice_id, {
        date: new Date().toISOString(),
        amount: 500,
        method: "check",
        reference: "CHK-12345",
      });

      expect(updated?.amount_paid).toBe(500);
      expect(updated?.balance_due).toBe(500);
      expect(updated?.status).toBe("partial");
    });

    it("marks invoice paid when fully paid", () => {
      const invoice = latheCustomerOrderLifecycleEngine.createInvoice(orderId);
      const updated = latheCustomerOrderLifecycleEngine.recordPayment(invoice!.invoice_id, {
        date: new Date().toISOString(),
        amount: 1000,
        method: "wire",
        reference: "WIRE-001",
      });

      expect(updated?.balance_due).toBe(0);
      expect(updated?.status).toBe("paid");
    });

    it("retrieves invoices by customer", () => {
      latheCustomerOrderLifecycleEngine.createInvoice(orderId);

      const invoices = latheCustomerOrderLifecycleEngine.getInvoicesByCustomer(customerId);
      expect(invoices.length).toBe(1);
    });

    it("retrieves invoices by status", () => {
      latheCustomerOrderLifecycleEngine.createInvoice(orderId);

      const drafts = latheCustomerOrderLifecycleEngine.getInvoicesByStatus("draft");
      expect(drafts.length).toBe(1);
    });
  });

  describe("Lifecycle Metrics", () => {
    beforeEach(() => {
      const customer = latheCustomerOrderLifecycleEngine.createCustomer(sampleCustomer);

      // Create multiple orders in various states
      for (let i = 0; i < 5; i++) {
        const order = latheCustomerOrderLifecycleEngine.createOrder(
          customer.id,
          [{ part_number: `PART-${i}`, description: "Part", quantity: 10, unit_price: 100 }],
          { due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() }
        );

        if (i < 2) {
          latheCustomerOrderLifecycleEngine.transitionOrder(order!.order_id, "quoted");
        }
        if (i < 1) {
          latheCustomerOrderLifecycleEngine.transitionOrder(order!.order_id, "quote_accepted");
        }
      }
    });

    it("calculates total orders", () => {
      const metrics = latheCustomerOrderLifecycleEngine.getLifecycleMetrics();
      expect(metrics.total_orders).toBe(5);
    });

    it("breaks down orders by status", () => {
      const metrics = latheCustomerOrderLifecycleEngine.getLifecycleMetrics();

      expect(metrics.orders_by_status.rfq_received).toBe(3);
      expect(metrics.orders_by_status.quoted).toBe(1);
      expect(metrics.orders_by_status.quote_accepted).toBe(1);
    });

    it("calculates average order value", () => {
      const metrics = latheCustomerOrderLifecycleEngine.getLifecycleMetrics();
      expect(metrics.average_order_value).toBe(1000);
    });
  });

  describe("Full Lifecycle Flow", () => {
    it("completes full order lifecycle", () => {
      // Create customer
      const customer = latheCustomerOrderLifecycleEngine.createCustomer(sampleCustomer);

      // Create order
      const order = latheCustomerOrderLifecycleEngine.createOrder(
        customer.id,
        [{ part_number: "SHAFT-001", description: "Drive Shaft", quantity: 25, unit_price: 150 }],
        { due_date: "2026-05-15", po_number: "PO-12345", priority: "high" }
      );
      expect(order?.status).toBe("rfq_received");

      // Progress through lifecycle
      const statuses: OrderStatus[] = [
        "quoted",
        "quote_accepted",
        "order_confirmed",
        "scheduled",
        "in_production",
        "quality_check",
        "ready_to_ship",
      ];

      for (const status of statuses) {
        const result = latheCustomerOrderLifecycleEngine.transitionOrder(order!.order_id, status);
        expect(result.success).toBe(true);
      }

      // Create shipment
      const shipment = latheCustomerOrderLifecycleEngine.createShipment(order!.order_id, {
        carrier: "UPS Ground",
        tracking_number: "1Z999AA1234567890",
        ship_date: new Date().toISOString(),
        estimated_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        weight_lbs: 45,
        items: [{ line_id: order!.line_items[0].line_id, quantity: 25 }],
      });
      expect(shipment?.status).toBe("pending");

      // Mark shipped
      latheCustomerOrderLifecycleEngine.transitionOrder(order!.order_id, "shipped");

      // Mark delivered
      latheCustomerOrderLifecycleEngine.updateShipmentStatus(
        shipment!.shipment_id,
        "delivered",
        new Date().toISOString()
      );
      latheCustomerOrderLifecycleEngine.transitionOrder(order!.order_id, "delivered");

      // Create invoice
      const invoice = latheCustomerOrderLifecycleEngine.createInvoice(order!.order_id);
      expect(invoice?.total).toBe(3750);

      latheCustomerOrderLifecycleEngine.transitionOrder(order!.order_id, "invoiced");

      // Record payment
      latheCustomerOrderLifecycleEngine.recordPayment(invoice!.invoice_id, {
        date: new Date().toISOString(),
        amount: 3750,
        method: "ach",
        reference: "ACH-98765",
      });

      latheCustomerOrderLifecycleEngine.transitionOrder(order!.order_id, "paid");
      latheCustomerOrderLifecycleEngine.transitionOrder(order!.order_id, "closed");

      // Verify final state
      const finalOrder = latheCustomerOrderLifecycleEngine.getOrder(order!.order_id);
      expect(finalOrder?.status).toBe("closed");
      expect(finalOrder?.history.length).toBe(12);
    });
  });
});
