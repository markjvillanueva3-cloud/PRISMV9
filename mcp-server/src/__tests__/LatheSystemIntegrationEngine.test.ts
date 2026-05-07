/**
 * LatheSystemIntegrationEngine Tests
 *
 * U-LTH60: Unified system integration layer
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheSystemIntegrationEngine } from "../engines/LatheSystemIntegrationEngine.js";

describe("LatheSystemIntegrationEngine", () => {
  beforeEach(() => {
    latheSystemIntegrationEngine.clearAll();
  });

  describe("Job Integration", () => {
    it("creates integrated job", () => {
      const job = latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        part_number: "SHAFT-001",
        quantity: 100,
      });

      expect(job.job_id).toBe("JOB-001");
      expect(job.workflow_stage).toBe("quote_request");
      expect(job.overall_status).toBe("on_track");
      expect(job.quote).toBeNull();
      expect(job.order).toBeNull();
    });

    it("attaches quote to job", () => {
      const job = latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        part_number: "SHAFT-001",
        quantity: 100,
      });

      const updated = latheSystemIntegrationEngine.attachQuote(job.job_id, {
        quote_id: "QUO-001",
        unit_price: 15.00,
        total_price: 1500.00,
        margin_pct: 28,
        status: "sent",
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(updated).not.toBeNull();
      expect(updated!.quote).not.toBeNull();
      expect(updated!.workflow_stage).toBe("quote_generated");
    });

    it("attaches order to job", () => {
      const job = latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        part_number: "SHAFT-001",
        quantity: 100,
      });

      const updated = latheSystemIntegrationEngine.attachOrder(job.job_id, {
        order_id: "ORD-001",
        po_number: "PO-12345",
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: "confirmed",
        priority: "normal",
      });

      expect(updated!.order).not.toBeNull();
      expect(updated!.workflow_stage).toBe("order_received");
    });

    it("updates production status", () => {
      const job = latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        part_number: "SHAFT-001",
        quantity: 100,
      });

      const updated = latheSystemIntegrationEngine.updateProduction(job.job_id, {
        machine_id: "LB-3000",
        scheduled_start: new Date().toISOString(),
        actual_start: new Date().toISOString(),
        progress_pct: 50,
        cycle_time_actual: 5.2,
        setup_time_actual: 45,
        status: "in_progress",
      });

      expect(updated!.production).not.toBeNull();
      expect(updated!.workflow_stage).toBe("production_running");
    });

    it("updates quality metrics", () => {
      const job = latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        part_number: "SHAFT-001",
        quantity: 100,
      });

      const updated = latheSystemIntegrationEngine.updateQuality(job.job_id, {
        inspections_count: 10,
        passed_count: 9,
        failed_count: 1,
        fpy_pct: 90,
        cpk_avg: 1.45,
        nc_count: 1,
      });

      expect(updated!.quality).not.toBeNull();
      expect(updated!.quality!.fpy_pct).toBe(90);
    });

    it("flags job at risk when quality issues", () => {
      const job = latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        part_number: "SHAFT-001",
        quantity: 100,
      });

      const updated = latheSystemIntegrationEngine.updateQuality(job.job_id, {
        inspections_count: 10,
        passed_count: 7,
        failed_count: 3,
        fpy_pct: 70,
        cpk_avg: 0.9,
        nc_count: 3,
      });

      expect(updated!.overall_status).toBe("at_risk");
    });

    it("updates delivery status", () => {
      const job = latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        part_number: "SHAFT-001",
        quantity: 100,
      });

      const updated = latheSystemIntegrationEngine.updateDelivery(job.job_id, {
        delivery_id: "DEL-001",
        ship_date: new Date().toISOString(),
        tracking_number: "1Z999AA10123456784",
        carrier: "UPS",
        status: "shipped",
        delay_days: 0,
      });

      expect(updated!.delivery).not.toBeNull();
      expect(updated!.workflow_stage).toBe("shipped");
    });

    it("marks job delayed when delivery delayed", () => {
      const job = latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        part_number: "SHAFT-001",
        quantity: 100,
      });

      const updated = latheSystemIntegrationEngine.updateDelivery(job.job_id, {
        delivery_id: "DEL-001",
        ship_date: null,
        tracking_number: null,
        carrier: "UPS",
        status: "delayed",
        delay_days: 3,
      });

      expect(updated!.overall_status).toBe("delayed");
    });

    it("updates financial status", () => {
      const job = latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        part_number: "SHAFT-001",
        quantity: 100,
      });

      const updated = latheSystemIntegrationEngine.updateFinancial(job.job_id, {
        quoted_price: 1500,
        actual_cost: 1000,
        actual_revenue: 1500,
        actual_margin_pct: 33.3,
        variance_pct: 0,
        invoice_status: "paid",
      });

      expect(updated!.financial).not.toBeNull();
      expect(updated!.workflow_stage).toBe("payment_received");
      expect(updated!.overall_status).toBe("completed");
    });
  });

  describe("Queries", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        const job = latheSystemIntegrationEngine.createIntegratedJob({
          job_id: `JOB-${i}`,
          customer_id: i % 2 === 0 ? "CUST-A" : "CUST-B",
          customer_name: i % 2 === 0 ? "Customer A" : "Customer B",
          part_number: `PART-${i}`,
          quantity: 50,
        });

        if (i < 3) {
          latheSystemIntegrationEngine.updateFinancial(job.job_id, {
            quoted_price: 1000,
            actual_cost: 700,
            actual_revenue: 1000,
            actual_margin_pct: 30,
            variance_pct: 0,
            invoice_status: "paid",
          });
        } else if (i < 5) {
          latheSystemIntegrationEngine.updateQuality(job.job_id, {
            inspections_count: 10,
            passed_count: 7,
            failed_count: 3,
            fpy_pct: 70,
            cpk_avg: 0.9,
            nc_count: 3,
          });
        }
      }
    });

    it("retrieves jobs by status", () => {
      const completed = latheSystemIntegrationEngine.getJobsByStatus("completed");
      const atRisk = latheSystemIntegrationEngine.getJobsByStatus("at_risk");

      expect(completed.length).toBe(3);
      expect(atRisk.length).toBe(2);
    });

    it("retrieves jobs by customer", () => {
      const custA = latheSystemIntegrationEngine.getJobsByCustomer("CUST-A");
      const custB = latheSystemIntegrationEngine.getJobsByCustomer("CUST-B");

      expect(custA.length).toBe(5);
      expect(custB.length).toBe(5);
    });

    it("retrieves active jobs", () => {
      const active = latheSystemIntegrationEngine.getActiveJobs();

      expect(active.length).toBe(7);
    });
  });

  describe("System Health", () => {
    it("performs health check with healthy system", () => {
      for (let i = 0; i < 5; i++) {
        latheSystemIntegrationEngine.createIntegratedJob({
          job_id: `JOB-${i}`,
          customer_id: "CUST-001",
          customer_name: "Acme",
          part_number: `PART-${i}`,
          quantity: 50,
        });
      }

      const health = latheSystemIntegrationEngine.performHealthCheck();

      expect(health.overall_status).toBe("healthy");
      expect(health.components.length).toBeGreaterThan(0);
      expect(health.metrics.active_jobs).toBe(5);
    });

    it("detects degraded system with at-risk jobs", () => {
      const job = latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme",
        part_number: "PART-001",
        quantity: 50,
      });

      latheSystemIntegrationEngine.updateQuality(job.job_id, {
        inspections_count: 10,
        passed_count: 7,
        failed_count: 3,
        fpy_pct: 70,
        cpk_avg: 0.9,
        nc_count: 3,
      });

      const health = latheSystemIntegrationEngine.performHealthCheck();

      expect(health.overall_status).toBe("degraded");
      expect(health.metrics.jobs_at_risk).toBe(1);
    });

    it("includes component status", () => {
      latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme",
        part_number: "PART-001",
        quantity: 50,
      });

      const health = latheSystemIntegrationEngine.performHealthCheck();

      expect(health.components.some((c) => c.name === "Production")).toBe(true);
      expect(health.components.some((c) => c.name === "Delivery")).toBe(true);
      expect(health.components.some((c) => c.name === "Financial")).toBe(true);
      expect(health.components.some((c) => c.name === "Quality")).toBe(true);
    });
  });

  describe("Job Timeline", () => {
    it("generates job timeline", () => {
      const job = latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme",
        part_number: "SHAFT-001",
        quantity: 100,
      });

      latheSystemIntegrationEngine.attachQuote(job.job_id, {
        quote_id: "QUO-001",
        unit_price: 15,
        total_price: 1500,
        margin_pct: 28,
        status: "accepted",
        valid_until: new Date().toISOString(),
      });

      const timeline = latheSystemIntegrationEngine.getJobTimeline(job.job_id);

      expect(timeline).not.toBeNull();
      expect(timeline!.events.length).toBeGreaterThanOrEqual(2);
      expect(timeline!.milestones.length).toBe(5);
    });

    it("includes milestones with status", () => {
      const job = latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme",
        part_number: "SHAFT-001",
        quantity: 100,
      });

      latheSystemIntegrationEngine.attachQuote(job.job_id, {
        quote_id: "QUO-001",
        unit_price: 15,
        total_price: 1500,
        margin_pct: 28,
        status: "accepted",
        valid_until: new Date().toISOString(),
      });

      const timeline = latheSystemIntegrationEngine.getJobTimeline(job.job_id);

      const quoteMilestone = timeline!.milestones.find((m) => m.name === "Quote Sent");
      expect(quoteMilestone!.status).toBe("completed");

      const paymentMilestone = timeline!.milestones.find((m) => m.name === "Payment Received");
      expect(paymentMilestone!.status).toBe("pending");
    });

    it("returns null for unknown job", () => {
      const timeline = latheSystemIntegrationEngine.getJobTimeline("UNKNOWN");
      expect(timeline).toBeNull();
    });
  });

  describe("Events", () => {
    it("records events for job actions", () => {
      const job = latheSystemIntegrationEngine.createIntegratedJob({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme",
        part_number: "SHAFT-001",
        quantity: 100,
      });

      latheSystemIntegrationEngine.attachQuote(job.job_id, {
        quote_id: "QUO-001",
        unit_price: 15,
        total_price: 1500,
        margin_pct: 28,
        status: "sent",
        valid_until: new Date().toISOString(),
      });

      const events = latheSystemIntegrationEngine.getRecentEvents();

      expect(events.length).toBe(2);
      expect(events.some((e) => e.event_type === "job_created")).toBe(true);
      expect(events.some((e) => e.event_type === "quote_attached")).toBe(true);
    });

    it("returns recent events sorted by timestamp", () => {
      for (let i = 0; i < 5; i++) {
        latheSystemIntegrationEngine.createIntegratedJob({
          job_id: `JOB-${i}`,
          customer_id: "CUST-001",
          customer_name: "Acme",
          part_number: `PART-${i}`,
          quantity: 50,
        });
      }

      const events = latheSystemIntegrationEngine.getRecentEvents(3);

      expect(events.length).toBe(3);
    });
  });

  describe("Summary Reports", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        const job = latheSystemIntegrationEngine.createIntegratedJob({
          job_id: `JOB-${i}`,
          customer_id: "CUST-001",
          customer_name: "Acme",
          part_number: `PART-${i}`,
          quantity: 50,
        });

        latheSystemIntegrationEngine.attachQuote(job.job_id, {
          quote_id: `QUO-${i}`,
          unit_price: 20,
          total_price: 1000 + i * 100,
          margin_pct: 25,
          status: "accepted",
          valid_until: new Date().toISOString(),
        });

        if (i < 5) {
          latheSystemIntegrationEngine.updateFinancial(job.job_id, {
            quoted_price: 1000 + i * 100,
            actual_cost: 700 + i * 50,
            actual_revenue: 1000 + i * 100,
            actual_margin_pct: 25 + i,
            variance_pct: 0,
            invoice_status: "paid",
          });
        }
      }
    });

    it("generates summary report", () => {
      const report = latheSystemIntegrationEngine.generateSummaryReport();

      expect(report.total_jobs).toBe(10);
      expect(report.by_status).toBeDefined();
      expect(report.by_stage).toBeDefined();
    });

    it("calculates financial summary", () => {
      const report = latheSystemIntegrationEngine.generateSummaryReport();

      expect(report.financial_summary.total_quoted).toBeGreaterThan(0);
      expect(report.financial_summary.total_revenue).toBeGreaterThan(0);
      expect(report.financial_summary.avg_margin_pct).toBeGreaterThan(0);
    });

    it("breaks down jobs by status", () => {
      const report = latheSystemIntegrationEngine.generateSummaryReport();

      expect(report.by_status["completed"]).toBe(5);
      expect(report.by_status["on_track"]).toBe(5);
    });
  });
});
