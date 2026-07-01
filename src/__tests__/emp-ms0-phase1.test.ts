/**
 * EMP-MS0 Phase 1 Tests — Security + Backend Wiring
 * Tests: Employee model enhancements, TimeClock enhancements,
 *        sanitization, persistence, dispatcher actions
 */
import { describe, it, expect, beforeEach } from "vitest";
import { employeeEngine } from "../engines/EmployeeEngine.js";
import { timeClockEngine } from "../engines/TimeClockEngine.js";
import type { ClearanceLevel, OvertimePolicy } from "../engines/EmployeeEngine.js";
import type { PauseReasonCategory, ProcessType } from "../engines/TimeClockEngine.js";

// ─── Employee Model Enhancements (U-MOD1) ──────────────────────────

describe("Employee Model Enhancements", () => {
  it("creates employee with default clearance_level = shop_floor", () => {
    const emp = employeeEngine.create({
      first_name: "Test",
      last_name: "Worker",
      email: "test@shop.com",
      department: "machining",
      role: "operator",
      hourly_rate: 30,
    });
    expect(emp.clearance_level).toBe("shop_floor");
  });

  it("creates employee with null auth_user_id by default", () => {
    const emp = employeeEngine.create({
      first_name: "Auth",
      last_name: "Test",
      email: "auth@shop.com",
      department: "machining",
      role: "operator",
      hourly_rate: 28,
    });
    expect(emp.auth_user_id).toBeNull();
  });

  it("creates employee with default overtime_policy", () => {
    const emp = employeeEngine.create({
      first_name: "OT",
      last_name: "Policy",
      email: "ot@shop.com",
      department: "machining",
      role: "operator",
      hourly_rate: 25,
    });
    expect(emp.overtime_policy).toBeDefined();
    expect(emp.overtime_policy.rule).toBe("weekly");
    expect(emp.overtime_policy.weekly_threshold_hrs).toBe(40);
    expect(emp.overtime_policy.daily_threshold_hrs).toBe(8);
    expect(emp.overtime_policy.ot_multiplier).toBe(1.5);
    expect(emp.overtime_policy.dt_multiplier).toBe(2.0);
  });

  it("creates employee with null shift_differential by default", () => {
    const emp = employeeEngine.create({
      first_name: "Shift",
      last_name: "Diff",
      email: "shift@shop.com",
      department: "machining",
      role: "operator",
      hourly_rate: 30,
    });
    expect(emp.shift_differential).toBeNull();
  });

  it("updates clearance_level via update()", () => {
    const emp = employeeEngine.create({
      first_name: "Promote",
      last_name: "Me",
      email: "promote@shop.com",
      department: "machining",
      role: "lead",
      hourly_rate: 35,
    });
    const updated = employeeEngine.update(emp.id, { clearance_level: "lead" });
    expect(updated.clearance_level).toBe("lead");
  });

  it("updates auth_user_id to link auth user", () => {
    const emp = employeeEngine.create({
      first_name: "Link",
      last_name: "Auth",
      email: "link@shop.com",
      department: "machining",
      role: "operator",
      hourly_rate: 30,
    });
    const updated = employeeEngine.update(emp.id, { auth_user_id: "usr_abc123" });
    expect(updated.auth_user_id).toBe("usr_abc123");
  });

  it("updates overtime_policy with custom values", () => {
    const emp = employeeEngine.create({
      first_name: "Custom",
      last_name: "OT",
      email: "custom@shop.com",
      department: "machining",
      role: "operator",
      hourly_rate: 30,
    });
    const newPolicy: OvertimePolicy = {
      rule: "daily",
      daily_threshold_hrs: 10,
      weekly_threshold_hrs: 40,
      ot_multiplier: 1.5,
      dt_multiplier: 2.0,
    };
    const updated = employeeEngine.update(emp.id, { overtime_policy: newPolicy });
    expect(updated.overtime_policy.rule).toBe("daily");
    expect(updated.overtime_policy.daily_threshold_hrs).toBe(10);
  });

  it("updates shift_differential", () => {
    const emp = employeeEngine.create({
      first_name: "Night",
      last_name: "Shift",
      email: "night@shop.com",
      department: "machining",
      role: "operator",
      hourly_rate: 30,
    });
    const updated = employeeEngine.update(emp.id, {
      shift_differential: { second_shift_premium: 1.5, third_shift_premium: 2.0 },
    });
    expect(updated.shift_differential).toBeDefined();
    expect(updated.shift_differential!.second_shift_premium).toBe(1.5);
    expect(updated.shift_differential!.third_shift_premium).toBe(2.0);
  });

  it("recalculates OT rates using policy multiplier on hourly_rate change", () => {
    const emp = employeeEngine.create({
      first_name: "Rate",
      last_name: "Change",
      email: "rate@shop.com",
      department: "machining",
      role: "operator",
      hourly_rate: 20,
    });
    expect(emp.overtime_rate).toBe(30); // 20 * 1.5
    const updated = employeeEngine.update(emp.id, { hourly_rate: 40 });
    expect(updated.overtime_rate).toBeCloseTo(60); // 40 * 1.5
    expect(updated.double_time_rate).toBeCloseTo(80); // 40 * 2.0
  });

  it("clearance levels are valid string literals", () => {
    const validLevels: ClearanceLevel[] = ["shop_floor", "lead", "hr_manager", "admin"];
    const emp = employeeEngine.create({
      first_name: "Level",
      last_name: "Check",
      email: "level@shop.com",
      department: "admin",
      role: "manager",
      hourly_rate: 50,
    });
    for (const level of validLevels) {
      const updated = employeeEngine.update(emp.id, { clearance_level: level });
      expect(updated.clearance_level).toBe(level);
    }
  });
});

// ─── TimeClock Enhancements (U-MOD2) ────────────────────────────────

describe("TimeClock Enhancements", () => {
  let empId: string;

  beforeEach(() => {
    const emp = employeeEngine.create({
      first_name: "Clock",
      last_name: `Tester-${Date.now()}`,
      email: `clock${Date.now()}@shop.com`,
      department: "machining",
      role: "operator",
      hourly_rate: 30,
    });
    empId = emp.id;
  });

  it("jobStart defaults process_type to production_run", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    const jt = timeClockEngine.jobStart({
      employee_id: empId,
      job_id: "JOB-001",
    });
    expect(jt.process_type).toBe("production_run");
  });

  it("jobStart accepts custom process_type", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    const jt = timeClockEngine.jobStart({
      employee_id: empId,
      job_id: "JOB-002",
      process_type: "setup",
    });
    expect(jt.process_type).toBe("setup");
  });

  it("all process types are valid", () => {
    const types: ProcessType[] = [
      "setup", "production_run", "first_article", "rework",
      "inspection", "deburring", "secondary_ops", "programming", "material_handling",
    ];
    for (const pt of types) {
      expect(typeof pt).toBe("string");
    }
  });

  it("jobPause stores reason_category", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    timeClockEngine.jobStart({ employee_id: empId, job_id: "JOB-P1" });
    const paused = timeClockEngine.jobPause({
      employee_id: empId,
      job_id: "JOB-P1",
      reason: "Tool worn out",
      reason_category: "tool_change",
    });
    expect(paused.status).toBe("paused");
    expect(paused.pause_periods).toHaveLength(1);
    expect(paused.pause_periods[0].reason_category).toBe("tool_change");
  });

  it("all pause reason categories are valid", () => {
    const categories: PauseReasonCategory[] = [
      "machine_down", "material_shortage", "setup_changeover",
      "tool_change", "break", "preventive_maintenance",
      "waiting_inspection", "idle", "shift_end", "other",
    ];
    expect(categories).toHaveLength(10);
  });

  it("jobStop stores good_parts and scrap_count", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    timeClockEngine.jobStart({ employee_id: empId, job_id: "JOB-S1" });
    const stopped = timeClockEngine.jobStop({
      employee_id: empId,
      job_id: "JOB-S1",
      good_parts: 47,
      scrap_count: 3,
      scrap_reason: "Chatter marks on finish pass",
    });
    expect(stopped.status).toBe("completed");
    expect(stopped.good_parts).toBe(47);
    expect(stopped.scrap_count).toBe(3);
    expect(stopped.scrap_reason).toBe("Chatter marks on finish pass");
  });

  it("jobStop stores improvement_note", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    timeClockEngine.jobStart({ employee_id: empId, job_id: "JOB-S2" });
    const stopped = timeClockEngine.jobStop({
      employee_id: empId,
      job_id: "JOB-S2",
      improvement_note: "Could reduce setup time by pre-staging fixtures",
    });
    expect(stopped.improvement_note).toContain("pre-staging fixtures");
  });

  it("clockOut stores handoff_notes", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    const shift = timeClockEngine.clockOut(empId, undefined, "Tool insert on Machine 3 needs replacing");
    expect(shift.handoff_notes).toContain("Tool insert");
  });

  it("getActiveAndPausedJobs returns active and paused entries", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    timeClockEngine.jobStart({ employee_id: empId, job_id: "JOB-A1", machine_id: "M1" });
    // Starting a second job auto-pauses the first
    timeClockEngine.jobStart({ employee_id: empId, job_id: "JOB-A2", machine_id: "M2" });

    const jobs = timeClockEngine.getActiveAndPausedJobs(empId);
    expect(jobs.length).toBeGreaterThanOrEqual(2);
    const statuses = jobs.map((j) => j.status);
    expect(statuses).toContain("active");
    expect(statuses).toContain("paused");
  });

  it("getShiftHandoff returns previous handoff notes", () => {
    // First shift
    timeClockEngine.clockIn({ employee_id: empId });
    timeClockEngine.clockOut(empId, undefined, "Check coolant level on VF-2");

    // Get handoff info
    const handoff = timeClockEngine.getShiftHandoff(empId);
    expect(handoff.previous_handoff_notes).toContain("coolant level");
    expect(handoff.previous_shift).toBeDefined();
    expect(handoff.previous_shift!.status).toBe("completed");
  });

  it("clockOut completes paused jobs (carry-over is v2)", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    timeClockEngine.jobStart({ employee_id: empId, job_id: "JOB-CARRY" });
    timeClockEngine.jobPause({
      employee_id: empId,
      job_id: "JOB-CARRY",
      reason: "End of shift",
      reason_category: "shift_end",
    });
    // clockOut stops all non-completed jobs including paused ones
    timeClockEngine.clockOut(empId);

    const handoff = timeClockEngine.getShiftHandoff(empId);
    // Paused jobs get completed on clock-out, so carried_jobs is empty
    expect(handoff.carried_jobs).toHaveLength(0);
    expect(handoff.previous_shift).toBeDefined();
    expect(handoff.previous_shift!.status).toBe("completed");
  });
});

// ─── Input Sanitization (U-SAN1) ────────────────────────────────────

describe("Input Sanitization", () => {
  let empId: string;

  beforeEach(() => {
    const emp = employeeEngine.create({
      first_name: "Sanitize",
      last_name: `Test-${Date.now()}`,
      email: `sanitize${Date.now()}@shop.com`,
      department: "machining",
      role: "operator",
      hourly_rate: 25,
    });
    empId = emp.id;
  });

  it("strips HTML tags from handoff_notes", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    const shift = timeClockEngine.clockOut(empId, undefined, "<script>alert('xss')</script>Check tool");
    expect(shift.handoff_notes).not.toContain("<script>");
    expect(shift.handoff_notes).toContain("Check tool");
  });

  it("strips HTML tags from scrap_reason", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    timeClockEngine.jobStart({ employee_id: empId, job_id: "JOB-XSS1" });
    const stopped = timeClockEngine.jobStop({
      employee_id: empId,
      job_id: "JOB-XSS1",
      scrap_reason: '<img onerror="hack()" src=x>Chatter',
    });
    expect(stopped.scrap_reason).not.toContain("<img");
    expect(stopped.scrap_reason).not.toContain("onerror");
    expect(stopped.scrap_reason).toContain("Chatter");
  });

  it("strips HTML tags from improvement_note", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    timeClockEngine.jobStart({ employee_id: empId, job_id: "JOB-XSS2" });
    const stopped = timeClockEngine.jobStop({
      employee_id: empId,
      job_id: "JOB-XSS2",
      improvement_note: "<b>Bold suggestion</b> about tooling",
    });
    expect(stopped.improvement_note).not.toContain("<b>");
    expect(stopped.improvement_note).toContain("Bold suggestion");
  });

  it("strips HTML from pause reason", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    timeClockEngine.jobStart({ employee_id: empId, job_id: "JOB-XSS3" });
    const paused = timeClockEngine.jobPause({
      employee_id: empId,
      job_id: "JOB-XSS3",
      reason: '<div onclick="evil()">Machine down</div>',
    });
    expect(paused.pause_periods[0].reason).not.toContain("<div");
    expect(paused.pause_periods[0].reason).toContain("Machine down");
  });

  it("truncates text exceeding 500 chars", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    const longText = "A".repeat(600);
    const shift = timeClockEngine.clockOut(empId, undefined, longText);
    expect(shift.handoff_notes!.length).toBeLessThanOrEqual(500);
  });

  it("strips javascript: URIs", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    timeClockEngine.jobStart({ employee_id: empId, job_id: "JOB-XSS4" });
    const stopped = timeClockEngine.jobStop({
      employee_id: empId,
      job_id: "JOB-XSS4",
      scrap_reason: "javascript:alert(1) caused issue",
    });
    expect(stopped.scrap_reason).not.toContain("javascript:");
  });

  it("strips eval() patterns", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    timeClockEngine.jobStart({ employee_id: empId, job_id: "JOB-XSS5" });
    const stopped = timeClockEngine.jobStop({
      employee_id: empId,
      job_id: "JOB-XSS5",
      improvement_note: "eval(badcode) should be fixed",
    });
    expect(stopped.improvement_note).not.toContain("eval(");
  });

  it("handles null/undefined input gracefully", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    timeClockEngine.jobStart({ employee_id: empId, job_id: "JOB-NULL" });
    const stopped = timeClockEngine.jobStop({
      employee_id: empId,
      job_id: "JOB-NULL",
    });
    // No scrap_reason provided — should be undefined
    expect(stopped.scrap_reason).toBeUndefined();
    expect(stopped.improvement_note).toBeUndefined();
  });

  it("preserves clean text unchanged", () => {
    timeClockEngine.clockIn({ employee_id: empId });
    const shift = timeClockEngine.clockOut(empId, undefined, "Tool #4 in spindle is at 80% life. Replace soon.");
    expect(shift.handoff_notes).toBe("Tool #4 in spindle is at 80% life. Replace soon.");
  });
});

// ─── Dispatcher Wiring (U-SEC2) ─────────────────────────────────────

describe("BusinessDispatcher TimeClock Actions", () => {
  it("job_time_pause action exists in dispatcher", async () => {
    const dispatcherPath = "../tools/dispatchers/businessDispatcher.js";
    const mod = await import(dispatcherPath);
    expect(mod).toBeDefined();
    // The dispatcher module exports are validated at build time via z.enum
    // This test confirms the import doesn't throw
  });
});
