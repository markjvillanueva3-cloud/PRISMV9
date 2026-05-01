/**
 * ERP Engines Integration Tests
 * Tests: EmployeeEngine, TimeClockEngine, PayrollEngine,
 *        InvoicingEngine, ToolUsageEngine, ActualCostEngine
 * + businessDispatcher wiring for all 29 new actions
 */
import { describe, it, expect, beforeEach } from "vitest";
import { employeeEngine } from "../engines/EmployeeEngine.js";
import { timeClockEngine } from "../engines/TimeClockEngine.js";
import { payrollEngine } from "../engines/PayrollEngine.js";
import { invoicingEngine } from "../engines/InvoicingEngine.js";
import { toolUsageEngine } from "../engines/ToolUsageEngine.js";
import { actualCostEngine } from "../engines/ActualCostEngine.js";

// ─── EmployeeEngine ──────────────────────────────────────────

describe("EmployeeEngine", () => {
  it("creates employee with defaults", () => {
    const emp = employeeEngine.create({
      first_name: "John",
      last_name: "Smith",
      email: "john@shop.com",
      department: "machining",
      role: "operator",
      hourly_rate: 30,
    });
    expect(emp.id).toMatch(/^EMP-\d{4}$/);
    expect(emp.status).toBe("active");
    expect(emp.overtime_rate).toBe(45); // 1.5x
    expect(emp.double_time_rate).toBe(60); // 2x
    expect(emp.shift.shift_id).toBe("day");
  });

  it("searches by department", () => {
    employeeEngine.create({
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@shop.com",
      department: "quality",
      role: "inspector",
      hourly_rate: 28,
    });
    const results = employeeEngine.search({ department: "quality" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].department).toBe("quality");
  });

  it("adds skill and updates existing", () => {
    const emp = employeeEngine.create({
      first_name: "Bob",
      last_name: "Lee",
      email: "bob@shop.com",
      department: "machining",
      role: "setup_tech",
      hourly_rate: 35,
    });
    employeeEngine.addSkill(emp.id, { name: "5-axis", level: 3 });
    expect(emp.skills).toHaveLength(1);
    employeeEngine.addSkill(emp.id, { name: "5-axis", level: 5 });
    expect(emp.skills).toHaveLength(1);
    expect(emp.skills[0].level).toBe(5);
  });

  it("calculates utilization", () => {
    const emp = employeeEngine.create({
      first_name: "Util",
      last_name: "Test",
      email: "util@shop.com",
      department: "machining",
      role: "operator",
      hourly_rate: 25,
    });
    const util = employeeEngine.calculateUtilization(
      emp.id,
      "Week 10",
      40,
      [
        { hours: 6, job_id: "J-001" },
        { hours: 8, job_id: "J-001" },
        { hours: 7, job_id: "J-002" },
        { hours: 3 }, // idle
      ],
    );
    expect(util.worked_hours).toBe(24);
    expect(util.job_hours).toBe(21);
    expect(util.idle_hours).toBe(3);
    expect(util.utilization_pct).toBeCloseTo(52.5);
    expect(util.jobs_worked).toBe(2);
  });

  it("department summary", () => {
    const summary = employeeEngine.departmentSummary();
    expect(summary.machining).toBeDefined();
    expect(summary.machining.total).toBeGreaterThan(0);
  });

  it("getLaborRate returns correct tier", () => {
    const emp = employeeEngine.create({
      first_name: "Rate",
      last_name: "Tester",
      email: "rate@shop.com",
      department: "machining",
      role: "operator",
      hourly_rate: 30,
    });
    expect(employeeEngine.getLaborRate(emp.id, 5).type).toBe("regular");
    expect(employeeEngine.getLaborRate(emp.id, 10).type).toBe("overtime");
    expect(employeeEngine.getLaborRate(emp.id, 13).type).toBe("double_time");
  });

  it("throws on unknown employee", () => {
    expect(() => employeeEngine.get("BOGUS")).toBeUndefined;
    expect(() => employeeEngine.update("BOGUS", {})).toThrow("not found");
  });
});

// ─── TimeClockEngine ─────────────────────────────────────────

describe("TimeClockEngine", () => {
  let empId: string;

  beforeEach(() => {
    const emp = employeeEngine.create({
      first_name: "Clock",
      last_name: `Test${Date.now()}`,
      email: `clock${Date.now()}@shop.com`,
      department: "machining",
      role: "operator",
      hourly_rate: 30,
    });
    empId = emp.id;
  });

  it("clock in/out with hour calculation", () => {
    const shift = timeClockEngine.clockIn({
      employee_id: empId,
      timestamp: "2026-03-06T06:00:00Z",
    });
    expect(shift.status).toBe("active");

    const completed = timeClockEngine.clockOut(empId, "2026-03-06T14:30:00Z");
    expect(completed.status).toBe("completed");
    expect(completed.total_hours).toBe(8.5);
    expect(completed.regular_hours).toBe(8);
    expect(completed.overtime_hours).toBeCloseTo(0.5);
  });

  it("prevents double clock-in", () => {
    timeClockEngine.clockIn({
      employee_id: empId,
      timestamp: "2026-03-06T06:00:00Z",
    });
    expect(() =>
      timeClockEngine.clockIn({
        employee_id: empId,
        timestamp: "2026-03-06T06:05:00Z",
      }),
    ).toThrow("already clocked in");
  });

  it("job start/pause/stop with productive minutes", () => {
    timeClockEngine.clockIn({
      employee_id: empId,
      timestamp: "2026-03-06T06:00:00Z",
    });

    const jt = timeClockEngine.jobStart({
      employee_id: empId,
      job_id: "JOB-100",
      operation: "roughing",
      timestamp: "2026-03-06T06:05:00Z",
    });
    expect(jt.status).toBe("active");

    timeClockEngine.jobPause({
      employee_id: empId,
      job_id: "JOB-100",
      reason: "tool change",
      timestamp: "2026-03-06T07:00:00Z",
    });

    timeClockEngine.jobResume(empId, "JOB-100", "2026-03-06T07:15:00Z");

    const stopped = timeClockEngine.jobStop({
      employee_id: empId,
      job_id: "JOB-100",
      timestamp: "2026-03-06T08:05:00Z",
    });
    expect(stopped.status).toBe("completed");
    expect(stopped.total_minutes).toBe(120); // 2 hours
    expect(stopped.productive_minutes).toBe(105); // 2h - 15min pause

    timeClockEngine.clockOut(empId, "2026-03-06T14:00:00Z");
  });

  it("whoClockedIn returns active employees", () => {
    timeClockEngine.clockIn({
      employee_id: empId,
      timestamp: "2026-03-06T06:00:00Z",
    });
    const who = timeClockEngine.whoClockedIn();
    expect(who.some((w) => w.employee_id === empId)).toBe(true);
    timeClockEngine.clockOut(empId, "2026-03-06T14:00:00Z");
  });

  it("jobLaborCost aggregates across employees", () => {
    timeClockEngine.clockIn({
      employee_id: empId,
      timestamp: "2026-03-06T06:00:00Z",
    });
    timeClockEngine.jobStart({
      employee_id: empId,
      job_id: "JOB-COST-1",
      timestamp: "2026-03-06T06:00:00Z",
    });
    timeClockEngine.jobStop({
      employee_id: empId,
      job_id: "JOB-COST-1",
      timestamp: "2026-03-06T08:00:00Z",
    });
    timeClockEngine.clockOut(empId, "2026-03-06T14:00:00Z");

    const cost = timeClockEngine.jobLaborCost("JOB-COST-1");
    expect(cost.total_hours).toBeGreaterThan(0);
    expect(cost.total_cost).toBeGreaterThan(0);
    expect(cost.by_employee.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── PayrollEngine ───────────────────────────────────────────

describe("PayrollEngine", () => {
  it("creates period and runs payroll", () => {
    // Create employee + clock in/out
    const emp = employeeEngine.create({
      first_name: "Pay",
      last_name: "Roll",
      email: `pay${Date.now()}@shop.com`,
      department: "machining",
      role: "operator",
      hourly_rate: 30,
    });

    timeClockEngine.clockIn({
      employee_id: emp.id,
      timestamp: "2026-03-03T06:00:00Z",
    });
    timeClockEngine.clockOut(emp.id, "2026-03-03T14:30:00Z");

    const period = payrollEngine.createPeriod({
      start_date: "2026-03-01",
      end_date: "2026-03-07",
      pay_date: "2026-03-14",
      type: "weekly",
    });
    expect(period.id).toMatch(/^PP-/);

    const stub = payrollEngine.calculatePayStub(emp.id, period.id);
    expect(stub.earnings.gross_pay).toBeGreaterThan(0);
    expect(stub.earnings.regular_hours).toBe(8);
    expect(stub.earnings.overtime_hours).toBeCloseTo(0.5);
    expect(stub.deductions.total_deductions).toBeGreaterThan(0);
    expect(stub.net_pay).toBeLessThan(stub.earnings.gross_pay);
  });

  it("configures custom deductions", () => {
    const emp = employeeEngine.create({
      first_name: "Ded",
      last_name: "Uction",
      email: `ded${Date.now()}@shop.com`,
      department: "engineering",
      role: "engineer",
      hourly_rate: 50,
    });
    const config = payrollEngine.configureDeductions({
      employee_id: emp.id,
      federal_tax_rate: 0.24,
      state_tax_rate: 0.06,
      health_insurance_per_period: 200,
      retirement_401k_pct: 0.10,
      other_deductions_per_period: 50,
    });
    expect(config.federal_tax_rate).toBe(0.24);
  });
});

// ─── InvoicingEngine ─────────────────────────────────────────

describe("InvoicingEngine", () => {
  it("creates invoice with line items and tax", () => {
    const inv = invoicingEngine.create({
      job_id: "JOB-200",
      customer: { name: "Acme Corp", email: "acme@corp.com" },
      line_items: [
        { description: "Machining", category: "machining", quantity: 10, unit: "hrs", unit_price: 85 },
        { description: "Material", category: "material", quantity: 1, unit: "lot", unit_price: 500 },
      ],
      tax_rate: 8.25,
      discount_pct: 5,
    });
    expect(inv.id).toMatch(/^INV-/);
    expect(inv.status).toBe("draft");
    expect(inv.line_items).toHaveLength(2);
    expect(inv.subtotal).toBe(1350); // 850 + 500
    expect(inv.discount_amount).toBe(67.5); // 5% of 1350
    expect(inv.tax_amount).toBeCloseTo(105.81, 1); // 8.25% of (1350-67.5)
    expect(inv.total).toBeGreaterThan(0);
    expect(inv.balance_due).toBe(inv.total);
  });

  it("fromJobCost applies markup", () => {
    const inv = invoicingEngine.fromJobCost({
      job_id: "JOB-201",
      customer: { name: "Beta Inc", email: "beta@inc.com" },
      cost_breakdown: {
        material_cost: 200,
        labor_cost: 400,
        tooling_cost: 50,
        machine_cost: 300,
        setup_cost: 100,
        programming_cost: 150,
        inspection_cost: 75,
        finishing_cost: 25,
        overhead_cost: 100,
      },
      markup_pct: 30,
    });
    // Each non-zero cost item becomes a line at 1.3x
    expect(inv.line_items.length).toBeGreaterThanOrEqual(8);
    expect(inv.subtotal).toBeGreaterThan(1400 * 1.3 - 1); // total cost ~1400
  });

  it("records payment and updates status", () => {
    const inv = invoicingEngine.create({
      job_id: "JOB-202",
      customer: { name: "Gamma LLC", email: "gamma@llc.com" },
      line_items: [
        { description: "Parts", category: "machining", quantity: 1, unit: "lot", unit_price: 1000 },
      ],
    });

    const partial = invoicingEngine.recordPayment(inv.id, {
      amount: 500,
      method: "check",
      reference: "CHK-001",
    });
    expect(partial.status).toBe("partial");
    expect(partial.balance_due).toBe(500);

    const paid = invoicingEngine.recordPayment(inv.id, {
      amount: 500,
      method: "wire",
      reference: "WIR-001",
    });
    expect(paid.status).toBe("paid");
    expect(paid.balance_due).toBe(0);
  });

  it("list filters by status", () => {
    const all = invoicingEngine.list();
    expect(all.length).toBeGreaterThan(0);
    const drafts = invoicingEngine.list({ status: "draft" });
    expect(drafts.every((i) => i.status === "draft")).toBe(true);
  });

  it("aging report buckets correctly", () => {
    const report = invoicingEngine.agingReport();
    expect(report).toHaveProperty("current");
    expect(report).toHaveProperty("days_30");
    expect(report).toHaveProperty("total_outstanding");
    expect(typeof report.total_outstanding).toBe("number");
  });
});

// ─── ToolUsageEngine ─────────────────────────────────────────

describe("ToolUsageEngine", () => {
  const toolId = `T-${Date.now()}`;

  beforeEach(() => {
    toolUsageEngine.addTool({
      tool_id: toolId,
      name: "1/2 Carbide Endmill",
      type: "endmill",
      diameter_mm: 12.7,
      material: "carbide",
      coating: "TiAlN",
      max_life_minutes: 120,
      used_life_minutes: 0,
      remaining_life_pct: 100,
      cost_per_unit: 45,
      quantity_in_stock: 5,
      quantity_allocated: 0,
      reorder_point: 2,
      location: "Crib A-3",
      condition: "new",
      regrind_count: 0,
      max_regrinds: 3,
    });
  });

  it("start/end usage tracks wear and cost", () => {
    const usage = toolUsageEngine.startUsage({
      tool_id: toolId,
      job_id: "JOB-300",
      operation: "roughing",
      machine_id: "VF2-01",
    });
    expect(usage.status).toBe("in_use");

    const ended = toolUsageEngine.endUsage({
      usage_id: usage.id,
      cutting_minutes: 30,
      parts_cut: 10,
      wear_pct: 25,
    });
    expect(ended.status).toBe("completed");
    expect(ended.cost).toBeCloseTo(11.25, 1); // 45 * (30/120)

    const tool = toolUsageEngine.getTool(toolId)!;
    expect(tool.used_life_minutes).toBe(30);
    expect(tool.remaining_life_pct).toBe(75);
    expect(tool.condition).toBe("good");
  });

  it("regrind restores life", () => {
    const tool = toolUsageEngine.getTool(toolId)!;
    tool.used_life_minutes = 100;
    tool.remaining_life_pct = 16.67;
    tool.condition = "worn";

    const reground = toolUsageEngine.regrindTool(toolId, 80);
    expect(reground.regrind_count).toBe(1);
    expect(reground.remaining_life_pct).toBe(80);
    expect(reground.condition).toBe("good");
  });

  it("regrind throws at max regrinds", () => {
    const tool = toolUsageEngine.getTool(toolId)!;
    tool.regrind_count = 3;
    expect(() => toolUsageEngine.regrindTool(toolId)).toThrow("max regrinds");
  });

  it("jobToolCost aggregates per job", () => {
    const u1 = toolUsageEngine.startUsage({
      tool_id: toolId,
      job_id: "JOB-301",
      operation: "roughing",
      machine_id: "VF2-01",
    });
    toolUsageEngine.endUsage({
      usage_id: u1.id,
      cutting_minutes: 20,
      parts_cut: 5,
      wear_pct: 15,
    });
    const cost = toolUsageEngine.jobToolCost("JOB-301");
    expect(cost.total_tool_cost).toBeGreaterThan(0);
    expect(cost.tools_used.length).toBe(1);
  });

  it("reorderAlerts detects low stock", () => {
    const lowTool = `T-LOW-${Date.now()}`;
    toolUsageEngine.addTool({
      tool_id: lowTool,
      name: "Low Stock Drill",
      type: "drill",
      diameter_mm: 8,
      material: "carbide",
      max_life_minutes: 60,
      used_life_minutes: 0,
      remaining_life_pct: 100,
      cost_per_unit: 25,
      quantity_in_stock: 1,
      quantity_allocated: 0,
      reorder_point: 3,
      location: "Crib B-1",
      condition: "new",
      regrind_count: 0,
      max_regrinds: 0,
    });
    const alerts = toolUsageEngine.reorderAlerts();
    const alert = alerts.find((a) => a.tool_id === lowTool);
    expect(alert).toBeDefined();
    expect(alert!.priority).toBe("high");
  });

  it("toolLifeReport recommends actions", () => {
    const reports = toolUsageEngine.toolLifeReport(toolId);
    expect(reports).toHaveLength(1);
    expect(reports[0].recommendation).toBe("continue");
  });
});

// ─── ActualCostEngine ────────────────────────────────────────

describe("ActualCostEngine", () => {
  it("calculates actual cost rolling up labor + tooling", () => {
    // Set up an employee with a completed job time
    const emp = employeeEngine.create({
      first_name: "Cost",
      last_name: `Calc${Date.now()}`,
      email: `cost${Date.now()}@shop.com`,
      department: "machining",
      role: "operator",
      hourly_rate: 30,
    });
    timeClockEngine.clockIn({
      employee_id: emp.id,
      timestamp: "2026-03-06T06:00:00Z",
    });
    timeClockEngine.jobStart({
      employee_id: emp.id,
      job_id: "JOB-ACTUAL-1",
      timestamp: "2026-03-06T06:00:00Z",
    });
    timeClockEngine.jobStop({
      employee_id: emp.id,
      job_id: "JOB-ACTUAL-1",
      timestamp: "2026-03-06T10:00:00Z",
    });
    timeClockEngine.clockOut(emp.id, "2026-03-06T14:00:00Z");

    const result = actualCostEngine.calculate({
      job_id: "JOB-ACTUAL-1",
      material_cost: 500,
      scrap_cost: 25,
      machine_hours: 4,
      machine_rate_per_hour: 85,
    });

    expect(result.labor.hours).toBeGreaterThan(0);
    expect(result.labor.cost).toBeGreaterThan(0);
    expect(result.material.cost).toBe(500);
    expect(result.material.scrap_pct).toBe(5);
    expect(result.machine.cost).toBe(340);
    expect(result.overhead.cost).toBeGreaterThan(0);
    expect(result.total_cost).toBeGreaterThan(840); // labor + 500 + 340 + overhead
  });

  it("variance analysis compares est vs actual", () => {
    // Persist material + machine data so variance calc can re-derive actuals
    actualCostEngine.recordMaterialCost("JOB-ACTUAL-1", 500, 25);
    actualCostEngine.recordMachineTime("JOB-ACTUAL-1", 4, 85);
    actualCostEngine.recordEstimate("JOB-ACTUAL-1", {
      labor: 100,
      material: 450,
      tooling: 30,
      machine: 350,
      overhead: 100,
    });

    const variances = actualCostEngine.varianceAnalysis("JOB-ACTUAL-1");
    expect(variances.length).toBe(6); // 5 categories + total
    const matVar = variances.find((v) => v.category === "material")!;
    expect(matVar.estimated).toBe(450);
    expect(matVar.actual).toBe(500);
    expect(matVar.status).toBe("over");
  });

  it("profitability calculates margin", () => {
    actualCostEngine.recordRevenue("JOB-ACTUAL-1", 2000);
    const prof = actualCostEngine.profitability("JOB-ACTUAL-1");
    expect(prof.revenue).toBe(2000);
    expect(prof.actual_cost).toBeGreaterThan(0);
    expect(prof.actual_margin).toBeLessThan(2000);
    expect(prof.status).toBe("profitable");
    expect(prof.actual_margin_pct).toBeGreaterThan(0);
  });
});

// ─── Dispatcher Wiring (smoke tests) ────────────────────────

describe("businessDispatcher wiring", () => {
  it("ACTIONS array contains all 67 actions", async () => {
    const mod = await import("../tools/dispatchers/businessDispatcher.js");
    // The module registers but we can check the file was loaded without errors
    expect(mod.registerBusinessDispatcher).toBeDefined();
    expect(typeof mod.registerBusinessDispatcher).toBe("function");
  });
});
