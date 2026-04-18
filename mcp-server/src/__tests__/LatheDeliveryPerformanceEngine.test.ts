/**
 * LatheDeliveryPerformanceEngine Tests
 *
 * U-LTH56: On-time delivery metrics, shipping management, performance analytics
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheDeliveryPerformanceEngine } from "../engines/LatheDeliveryPerformanceEngine.js";

describe("LatheDeliveryPerformanceEngine", () => {
  beforeEach(() => {
    latheDeliveryPerformanceEngine.clearAll();
  });

  describe("Delivery Management", () => {
    it("creates delivery record", () => {
      const delivery = latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        carrier: "UPS",
        line_items: [
          { part_number: "SHAFT-001", quantity: 100 },
        ],
      });

      expect(delivery.delivery_id).toMatch(/^DEL-/);
      expect(delivery.status).toBe("pending");
      expect(delivery.delay_days).toBe(0);
    });

    it("ships delivery with tracking", () => {
      const delivery = latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        carrier: "FedEx",
        line_items: [
          { part_number: "SHAFT-001", quantity: 100 },
        ],
      });

      const shipped = latheDeliveryPerformanceEngine.shipDelivery(
        delivery.delivery_id,
        "1Z999AA10123456784"
      );

      expect(shipped).not.toBeNull();
      expect(shipped!.status).toBe("shipped");
      expect(shipped!.tracking_number).toBe("1Z999AA10123456784");
      expect(shipped!.actual_ship_date).toBeDefined();
    });

    it("ships with partial quantities", () => {
      const delivery = latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: new Date().toISOString(),
        carrier: "UPS",
        line_items: [
          { part_number: "SHAFT-001", quantity: 100 },
        ],
      });

      const shipped = latheDeliveryPerformanceEngine.shipDelivery(
        delivery.delivery_id,
        "TRACK123",
        { "SHAFT-001": 75 }
      );

      expect(shipped!.line_items[0].shipped_quantity).toBe(75);
    });

    it("marks delivery as delivered", () => {
      const delivery = latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: new Date().toISOString(),
        carrier: "UPS",
        line_items: [],
      });

      latheDeliveryPerformanceEngine.shipDelivery(delivery.delivery_id, "TRACK123");
      const delivered = latheDeliveryPerformanceEngine.markDelivered(delivery.delivery_id);

      expect(delivered!.status).toBe("delivered");
      expect(delivered!.actual_delivery_date).toBeDefined();
    });

    it("calculates delay days correctly", () => {
      const promisedDate = new Date();
      promisedDate.setDate(promisedDate.getDate() - 3);

      const delivery = latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: promisedDate.toISOString(),
        carrier: "UPS",
        line_items: [],
      });

      latheDeliveryPerformanceEngine.shipDelivery(delivery.delivery_id, "TRACK123");
      const delivered = latheDeliveryPerformanceEngine.markDelivered(delivery.delivery_id);

      expect(delivered!.delay_days).toBeGreaterThanOrEqual(3);
    });

    it("marks delivery as delayed with reason", () => {
      const delivery = latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: new Date().toISOString(),
        carrier: "UPS",
        line_items: [],
      });

      const delayed = latheDeliveryPerformanceEngine.markDelayed(
        delivery.delivery_id,
        "Material shortage"
      );

      expect(delayed!.status).toBe("delayed");
      expect(delayed!.delay_reason).toBe("Material shortage");
    });

    it("retrieves deliveries by customer", () => {
      for (let i = 0; i < 5; i++) {
        latheDeliveryPerformanceEngine.createDelivery({
          order_id: `ORD-${i}`,
          customer_id: "CUST-001",
          customer_name: "Acme Corp",
          promised_date: new Date().toISOString(),
          carrier: "UPS",
          line_items: [],
        });
      }

      const deliveries = latheDeliveryPerformanceEngine.getDeliveriesByCustomer("CUST-001");
      expect(deliveries.length).toBe(5);
    });

    it("retrieves deliveries by status", () => {
      const d1 = latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: new Date().toISOString(),
        carrier: "UPS",
        line_items: [],
      });

      latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-002",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: new Date().toISOString(),
        carrier: "UPS",
        line_items: [],
      });

      latheDeliveryPerformanceEngine.shipDelivery(d1.delivery_id, "TRACK123");

      const pending = latheDeliveryPerformanceEngine.getDeliveriesByStatus("pending");
      const shipped = latheDeliveryPerformanceEngine.getDeliveriesByStatus("shipped");

      expect(pending.length).toBe(1);
      expect(shipped.length).toBe(1);
    });
  });

  describe("Metrics Calculation", () => {
    beforeEach(() => {
      const baseDate = new Date();
      for (let i = 0; i < 10; i++) {
        const promisedDate = new Date(baseDate);
        promisedDate.setDate(promisedDate.getDate() - i);

        const delivery = latheDeliveryPerformanceEngine.createDelivery({
          order_id: `ORD-${i}`,
          customer_id: "CUST-001",
          customer_name: "Acme Corp",
          promised_date: promisedDate.toISOString(),
          carrier: "UPS",
          line_items: [{ part_number: "PART-001", quantity: 10 }],
        });

        latheDeliveryPerformanceEngine.shipDelivery(delivery.delivery_id, `TRACK-${i}`);

        const deliveryDate = new Date(promisedDate);
        if (i % 3 === 0) {
          deliveryDate.setDate(deliveryDate.getDate() + 2);
        }

        latheDeliveryPerformanceEngine.markDelivered(delivery.delivery_id, deliveryDate.toISOString());
      }
    });

    it("calculates delivery metrics for period", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const metrics = latheDeliveryPerformanceEngine.calculateMetrics(
        startDate.toISOString(),
        new Date().toISOString()
      );

      expect(metrics.total_deliveries).toBeGreaterThanOrEqual(9);
      expect(metrics.on_time_pct).toBeGreaterThanOrEqual(0);
      expect(metrics.on_time_pct).toBeLessThanOrEqual(100);
    });

    it("calculates average delay days", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const metrics = latheDeliveryPerformanceEngine.calculateMetrics(
        startDate.toISOString(),
        new Date().toISOString()
      );

      expect(metrics.average_delay_days).toBeGreaterThanOrEqual(0);
    });

    it("calculates perfect order rate", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const metrics = latheDeliveryPerformanceEngine.calculateMetrics(
        startDate.toISOString(),
        new Date().toISOString()
      );

      expect(metrics.perfect_order_rate).toBeGreaterThanOrEqual(0);
      expect(metrics.perfect_order_rate).toBeLessThanOrEqual(100);
    });
  });

  describe("Customer Scoring", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        const promisedDate = new Date();
        promisedDate.setDate(promisedDate.getDate() - i);

        const delivery = latheDeliveryPerformanceEngine.createDelivery({
          order_id: `ORD-${i}`,
          customer_id: "CUST-001",
          customer_name: "Acme Corp",
          promised_date: promisedDate.toISOString(),
          carrier: "UPS",
          line_items: [],
        });

        latheDeliveryPerformanceEngine.shipDelivery(delivery.delivery_id, `TRACK-${i}`);
        latheDeliveryPerformanceEngine.markDelivered(delivery.delivery_id);
      }
    });

    it("calculates customer delivery score", () => {
      const score = latheDeliveryPerformanceEngine.getCustomerDeliveryScore("CUST-001");

      expect(score).not.toBeNull();
      expect(score!.total_orders).toBe(10);
      expect(score!.delivery_score).toBeGreaterThanOrEqual(0);
    });

    it("identifies delivery trend", () => {
      const score = latheDeliveryPerformanceEngine.getCustomerDeliveryScore("CUST-001");

      expect(["improving", "stable", "declining"]).toContain(score!.trend);
    });

    it("assigns risk level based on on-time percentage", () => {
      const score = latheDeliveryPerformanceEngine.getCustomerDeliveryScore("CUST-001");

      expect(["low", "medium", "high"]).toContain(score!.risk_level);
    });

    it("returns all customer scores sorted by delivery score", () => {
      for (let i = 0; i < 5; i++) {
        const delivery = latheDeliveryPerformanceEngine.createDelivery({
          order_id: `ORD-B-${i}`,
          customer_id: "CUST-002",
          customer_name: "Beta Inc",
          promised_date: new Date().toISOString(),
          carrier: "FedEx",
          line_items: [],
        });
        latheDeliveryPerformanceEngine.shipDelivery(delivery.delivery_id, `TRACK-B-${i}`);
        latheDeliveryPerformanceEngine.markDelivered(delivery.delivery_id);
      }

      const scores = latheDeliveryPerformanceEngine.getAllCustomerScores();

      expect(scores.length).toBe(2);
      expect(scores[0].delivery_score).toBeGreaterThanOrEqual(scores[1].delivery_score);
    });
  });

  describe("Carrier Performance", () => {
    beforeEach(() => {
      const carriers = ["UPS", "FedEx", "USPS"];
      for (let i = 0; i < 9; i++) {
        const carrier = carriers[i % 3];
        const delivery = latheDeliveryPerformanceEngine.createDelivery({
          order_id: `ORD-${i}`,
          customer_id: "CUST-001",
          customer_name: "Acme Corp",
          promised_date: new Date().toISOString(),
          carrier,
          line_items: [],
        });

        latheDeliveryPerformanceEngine.shipDelivery(delivery.delivery_id, `TRACK-${i}`);
        latheDeliveryPerformanceEngine.markDelivered(delivery.delivery_id);
      }
    });

    it("calculates carrier performance metrics", () => {
      const perf = latheDeliveryPerformanceEngine.getCarrierPerformance("UPS");

      expect(perf).not.toBeNull();
      expect(perf!.total_shipments).toBe(3);
      expect(perf!.on_time_pct).toBeGreaterThanOrEqual(0);
    });

    it("calculates performance score", () => {
      const perf = latheDeliveryPerformanceEngine.getCarrierPerformance("FedEx");

      expect(perf!.performance_score).toBeGreaterThan(0);
      expect(perf!.performance_score).toBeLessThanOrEqual(100);
    });

    it("returns all carrier performance sorted by score", () => {
      const performances = latheDeliveryPerformanceEngine.getAllCarrierPerformance();

      expect(performances.length).toBe(3);
      for (let i = 1; i < performances.length; i++) {
        expect(performances[i - 1].performance_score).toBeGreaterThanOrEqual(
          performances[i].performance_score
        );
      }
    });
  });

  describe("Delivery Forecasting", () => {
    it("forecasts delivery based on job progress", () => {
      const delivery = latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-FORECAST",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        carrier: "UPS",
        line_items: [],
      });

      const forecast = latheDeliveryPerformanceEngine.forecastDelivery("ORD-FORECAST", 50);

      expect(forecast).not.toBeNull();
      expect(forecast!.on_time_probability).toBeGreaterThan(0);
      expect(forecast!.predicted_ship_date).toBeDefined();
      expect(forecast!.predicted_delivery_date).toBeDefined();
    });

    it("identifies risk factors for tight deadlines", () => {
      const delivery = latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-TIGHT",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        carrier: "UPS",
        line_items: [],
      });

      const forecast = latheDeliveryPerformanceEngine.forecastDelivery("ORD-TIGHT", 20);

      expect(forecast!.risk_factors.length).toBeGreaterThan(0);
      expect(forecast!.recommended_actions.length).toBeGreaterThan(0);
    });

    it("returns null for unknown order", () => {
      const forecast = latheDeliveryPerformanceEngine.forecastDelivery("UNKNOWN", 50);
      expect(forecast).toBeNull();
    });
  });

  describe("Alert Management", () => {
    it("creates alert when delivery marked delayed", () => {
      const delivery = latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-ALERT",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: new Date().toISOString(),
        carrier: "UPS",
        line_items: [],
      });

      latheDeliveryPerformanceEngine.markDelayed(delivery.delivery_id, "Production delay");

      const alerts = latheDeliveryPerformanceEngine.getActiveAlerts();
      expect(alerts.length).toBe(1);
      expect(alerts[0].alert_type).toBe("delayed");
    });

    it("acknowledges alert with resolution", () => {
      const delivery = latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-ACK",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: new Date().toISOString(),
        carrier: "UPS",
        line_items: [],
      });

      latheDeliveryPerformanceEngine.markDelayed(delivery.delivery_id, "Delay reason");

      const alerts = latheDeliveryPerformanceEngine.getActiveAlerts();
      const acked = latheDeliveryPerformanceEngine.acknowledgeAlert(
        alerts[0].alert_id,
        "Expedited shipping arranged"
      );

      expect(acked!.acknowledged).toBe(true);
      expect(acked!.resolution).toBe("Expedited shipping arranged");
    });

    it("checks for at-risk deliveries", () => {
      const pastDue = new Date();
      pastDue.setDate(pastDue.getDate() - 2);

      latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-PASTDUE",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: pastDue.toISOString(),
        carrier: "UPS",
        line_items: [],
      });

      const newAlerts = latheDeliveryPerformanceEngine.checkAtRiskDeliveries();

      expect(newAlerts.length).toBeGreaterThan(0);
      expect(newAlerts.some((a) => a.alert_type === "delayed")).toBe(true);
    });

    it("sorts active alerts by severity", () => {
      const d1 = latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-1",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: new Date().toISOString(),
        carrier: "UPS",
        line_items: [],
      });

      const d2 = latheDeliveryPerformanceEngine.createDelivery({
        order_id: "ORD-2",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        promised_date: new Date().toISOString(),
        carrier: "UPS",
        line_items: [],
      });

      latheDeliveryPerformanceEngine["createAlert"]({
        delivery_id: d1.delivery_id,
        alert_type: "at_risk",
        severity: "low",
        message: "Low priority",
      });

      latheDeliveryPerformanceEngine["createAlert"]({
        delivery_id: d2.delivery_id,
        alert_type: "delayed",
        severity: "critical",
        message: "Critical delay",
      });

      const alerts = latheDeliveryPerformanceEngine.getActiveAlerts();

      expect(alerts[0].severity).toBe("critical");
    });
  });
});
