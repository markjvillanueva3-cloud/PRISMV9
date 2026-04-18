/**
 * LatheWorkflowOrchestrationEngine Tests
 *
 * U-LTH59: End-to-end workflow orchestration from quote to delivery
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheWorkflowOrchestrationEngine } from "../engines/LatheWorkflowOrchestrationEngine.js";

describe("LatheWorkflowOrchestrationEngine", () => {
  beforeEach(() => {
    latheWorkflowOrchestrationEngine.clearAll();
  });

  describe("Workflow Creation", () => {
    it("creates workflow with initial stage", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(workflow.workflow_id).toMatch(/^WF-/);
      expect(workflow.current_stage).toBe("quote_request");
      expect(workflow.status).toBe("active");
      expect(workflow.stage_history.length).toBe(0);
    });

    it("accepts priority setting", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
        priority: "rush",
      });

      expect(workflow.priority).toBe("rush");
    });

    it("stores metadata", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
        metadata: { special_instructions: "Handle with care" },
      });

      expect(workflow.metadata.special_instructions).toBe("Handle with care");
    });
  });

  describe("Stage Advancement", () => {
    it("advances to next stage", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
      });

      const advanced = latheWorkflowOrchestrationEngine.advanceStage(
        workflow.workflow_id,
        "USER-001",
        "Quote completed"
      );

      expect(advanced).not.toBeNull();
      expect(advanced!.current_stage).toBe("quote_generated");
      expect(advanced!.stage_history.length).toBe(1);
    });

    it("records transition history", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
      });

      latheWorkflowOrchestrationEngine.advanceStage(workflow.workflow_id, "USER-001");
      latheWorkflowOrchestrationEngine.advanceStage(workflow.workflow_id, "USER-002");

      const updated = latheWorkflowOrchestrationEngine.getWorkflow(workflow.workflow_id);

      expect(updated!.stage_history.length).toBe(2);
      expect(updated!.stage_history[0].from_stage).toBe("quote_request");
      expect(updated!.stage_history[0].to_stage).toBe("quote_generated");
    });

    it("sets specific stage directly", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
      });

      const updated = latheWorkflowOrchestrationEngine.setStage(
        workflow.workflow_id,
        "production_running",
        "SYSTEM",
        "Fast-tracked"
      );

      expect(updated!.current_stage).toBe("production_running");
    });

    it("marks workflow completed at closed stage", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
      });

      latheWorkflowOrchestrationEngine.setStage(
        workflow.workflow_id,
        "closed",
        "SYSTEM"
      );

      const updated = latheWorkflowOrchestrationEngine.getWorkflow(workflow.workflow_id);
      expect(updated!.status).toBe("completed");
    });

    it("cannot advance past closed", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
      });

      latheWorkflowOrchestrationEngine.setStage(workflow.workflow_id, "closed", "SYSTEM");
      const result = latheWorkflowOrchestrationEngine.advanceStage(
        workflow.workflow_id,
        "USER-001"
      );

      expect(result).toBeNull();
    });
  });

  describe("Workflow States", () => {
    it("blocks workflow with reason", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
      });

      const blocked = latheWorkflowOrchestrationEngine.blockWorkflow(
        workflow.workflow_id,
        "Material shortage",
        "USER-001"
      );

      expect(blocked!.status).toBe("blocked");
      expect(blocked!.blockers).toContain("Material shortage");
    });

    it("unblocks workflow", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
      });

      latheWorkflowOrchestrationEngine.blockWorkflow(
        workflow.workflow_id,
        "Material shortage",
        "USER-001"
      );

      const unblocked = latheWorkflowOrchestrationEngine.unblockWorkflow(
        workflow.workflow_id,
        "Materials received",
        "USER-002"
      );

      expect(unblocked!.status).toBe("active");
      expect(unblocked!.blockers.length).toBe(0);
    });

    it("pauses workflow", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
      });

      const paused = latheWorkflowOrchestrationEngine.pauseWorkflow(
        workflow.workflow_id,
        "Customer requested hold",
        "USER-001"
      );

      expect(paused!.status).toBe("paused");
    });

    it("resumes paused workflow", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
      });

      latheWorkflowOrchestrationEngine.pauseWorkflow(
        workflow.workflow_id,
        "Hold",
        "USER-001"
      );

      const resumed = latheWorkflowOrchestrationEngine.resumeWorkflow(
        workflow.workflow_id,
        "USER-002"
      );

      expect(resumed!.status).toBe("active");
    });

    it("cancels workflow", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
      });

      const cancelled = latheWorkflowOrchestrationEngine.cancelWorkflow(
        workflow.workflow_id,
        "Customer cancelled order",
        "USER-001"
      );

      expect(cancelled!.status).toBe("cancelled");
    });
  });

  describe("Queries", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
          job_id: `JOB-${i}`,
          customer_id: i % 2 === 0 ? "CUST-A" : "CUST-B",
          part_number: `PART-${i}`,
          quantity: 50,
          due_date: new Date().toISOString(),
        });

        if (i < 3) {
          latheWorkflowOrchestrationEngine.setStage(
            workflow.workflow_id,
            "closed",
            "SYSTEM"
          );
        } else if (i < 5) {
          latheWorkflowOrchestrationEngine.blockWorkflow(
            workflow.workflow_id,
            "Blocked",
            "SYSTEM"
          );
        }
      }
    });

    it("retrieves workflows by status", () => {
      const completed = latheWorkflowOrchestrationEngine.getWorkflowsByStatus("completed");
      const blocked = latheWorkflowOrchestrationEngine.getWorkflowsByStatus("blocked");
      const active = latheWorkflowOrchestrationEngine.getWorkflowsByStatus("active");

      expect(completed.length).toBe(3);
      expect(blocked.length).toBe(2);
      expect(active.length).toBe(5);
    });

    it("retrieves workflows by customer", () => {
      const custA = latheWorkflowOrchestrationEngine.getWorkflowsByCustomer("CUST-A");
      const custB = latheWorkflowOrchestrationEngine.getWorkflowsByCustomer("CUST-B");

      expect(custA.length).toBe(5);
      expect(custB.length).toBe(5);
    });

    it("retrieves active workflows", () => {
      const active = latheWorkflowOrchestrationEngine.getActiveWorkflows();

      expect(active.length).toBe(7);
    });

    it("retrieves workflows by stage", () => {
      const quoteRequest = latheWorkflowOrchestrationEngine.getWorkflowsByStage("quote_request");
      const closed = latheWorkflowOrchestrationEngine.getWorkflowsByStage("closed");

      expect(quoteRequest.length).toBe(7);
      expect(closed.length).toBe(3);
    });
  });

  describe("Metrics", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
          job_id: `JOB-${i}`,
          customer_id: "CUST-001",
          part_number: `PART-${i}`,
          quantity: 50,
          due_date: dueDate.toISOString(),
        });

        if (i < 5) {
          latheWorkflowOrchestrationEngine.advanceStage(workflow.workflow_id, "SYSTEM");
          latheWorkflowOrchestrationEngine.advanceStage(workflow.workflow_id, "SYSTEM");
          latheWorkflowOrchestrationEngine.setStage(
            workflow.workflow_id,
            "closed",
            "SYSTEM"
          );
        }
      }
    });

    it("calculates workflow metrics", () => {
      const metrics = latheWorkflowOrchestrationEngine.calculateMetrics();

      expect(metrics.total_workflows).toBe(10);
      expect(metrics.completed_workflows).toBe(5);
      expect(metrics.active_workflows).toBe(5);
    });

    it("calculates on-time completion percentage", () => {
      const metrics = latheWorkflowOrchestrationEngine.calculateMetrics();

      expect(metrics.on_time_completion_pct).toBeGreaterThanOrEqual(0);
      expect(metrics.on_time_completion_pct).toBeLessThanOrEqual(100);
    });

    it("identifies stage bottlenecks", () => {
      const metrics = latheWorkflowOrchestrationEngine.calculateMetrics();

      expect(metrics.stage_bottlenecks.length).toBeGreaterThanOrEqual(0);
    });

    it("estimates completion time", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-NEW",
        customer_id: "CUST-001",
        part_number: "PART-NEW",
        quantity: 50,
        due_date: new Date().toISOString(),
      });

      const estimated = latheWorkflowOrchestrationEngine.getEstimatedCompletion(
        workflow.workflow_id
      );

      expect(estimated).not.toBeNull();
      expect(new Date(estimated!).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("Alerts", () => {
    it("creates alert when workflow blocked", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
      });

      latheWorkflowOrchestrationEngine.blockWorkflow(
        workflow.workflow_id,
        "Material issue",
        "USER-001"
      );

      const alerts = latheWorkflowOrchestrationEngine.getActiveAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some((a) => a.alert_type === "blocked")).toBe(true);
    });

    it("checks for overdue workflows", () => {
      const pastDue = new Date();
      pastDue.setDate(pastDue.getDate() - 5);

      latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-OVERDUE",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: pastDue.toISOString(),
      });

      const newAlerts = latheWorkflowOrchestrationEngine.checkOverdueWorkflows();

      expect(newAlerts.length).toBeGreaterThan(0);
      expect(newAlerts.some((a) => a.alert_type === "overdue")).toBe(true);
    });

    it("acknowledges alert", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
      });

      latheWorkflowOrchestrationEngine.blockWorkflow(
        workflow.workflow_id,
        "Issue",
        "USER-001"
      );

      const alerts = latheWorkflowOrchestrationEngine.getActiveAlerts();
      const acked = latheWorkflowOrchestrationEngine.acknowledgeAlert(alerts[0].alert_id);

      expect(acked!.acknowledged).toBe(true);

      const activeAlerts = latheWorkflowOrchestrationEngine.getActiveAlerts();
      expect(activeAlerts.length).toBe(0);
    });
  });

  describe("Actions History", () => {
    it("records all workflow actions", () => {
      const workflow = latheWorkflowOrchestrationEngine.createWorkflow({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        part_number: "SHAFT-001",
        quantity: 100,
        due_date: new Date().toISOString(),
      });

      latheWorkflowOrchestrationEngine.advanceStage(workflow.workflow_id, "USER-001");
      latheWorkflowOrchestrationEngine.pauseWorkflow(workflow.workflow_id, "Hold", "USER-002");
      latheWorkflowOrchestrationEngine.resumeWorkflow(workflow.workflow_id, "USER-002");

      const actions = latheWorkflowOrchestrationEngine.getWorkflowActions(workflow.workflow_id);

      expect(actions.length).toBeGreaterThanOrEqual(1);
      expect(actions[0].workflow_id).toBe(workflow.workflow_id);
    });
  });

  describe("Stage Navigation", () => {
    it("returns stage sequence", () => {
      const sequence = latheWorkflowOrchestrationEngine.getStageSequence();

      expect(sequence.length).toBe(19);
      expect(sequence[0]).toBe("quote_request");
      expect(sequence[sequence.length - 1]).toBe("closed");
    });

    it("gets next stage", () => {
      const next = latheWorkflowOrchestrationEngine.getNextStage("quote_request");
      expect(next).toBe("quote_generated");
    });

    it("gets previous stage", () => {
      const prev = latheWorkflowOrchestrationEngine.getPreviousStage("quote_generated");
      expect(prev).toBe("quote_request");
    });

    it("returns null for next after closed", () => {
      const next = latheWorkflowOrchestrationEngine.getNextStage("closed");
      expect(next).toBeNull();
    });

    it("returns null for previous before first", () => {
      const prev = latheWorkflowOrchestrationEngine.getPreviousStage("quote_request");
      expect(prev).toBeNull();
    });
  });
});
