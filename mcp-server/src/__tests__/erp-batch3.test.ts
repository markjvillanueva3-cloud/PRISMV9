/**
 * Tests for ERP Batch 3 engines: HRCompliance, CustomerManagement, IntegrationAdapter
 */
import { describe, it, expect, beforeEach } from "vitest";
import { hrComplianceEngine } from "../engines/HRComplianceEngine.js";
import { customerManagementEngine } from "../engines/CustomerManagementEngine.js";
import { integrationAdapterEngine } from "../engines/IntegrationAdapterEngine.js";

// HR engine uses private state, so we test via the singleton
// Customer engine accumulates state, so order matters within describe blocks

describe("HRComplianceEngine", () => {
  it("lists default benefit plans", () => {
    const plans = hrComplianceEngine.listBenefitPlans();
    expect(plans.length).toBeGreaterThanOrEqual(7);
    expect(plans[0]).toHaveProperty("id");
    expect(plans[0]).toHaveProperty("name");
    expect(plans[0]).toHaveProperty("type");
  });

  it("enrolls employee in benefits", () => {
    const plans = hrComplianceEngine.listBenefitPlans();
    const enrollment = hrComplianceEngine.enrollEmployee("EMP-001", [plans[0].id, plans[2].id]);
    expect(enrollment.employee_id).toBe("EMP-001");
    expect(enrollment.plans).toHaveLength(2);
    expect(enrollment.total_employee_deduction).toBeGreaterThan(0);
    expect(enrollment.total_employer_cost).toBeGreaterThan(0);
  });

  it("retrieves enrollment", () => {
    const enrollment = hrComplianceEngine.getEnrollment("EMP-001");
    expect(enrollment).toBeDefined();
    expect(enrollment!.plans).toHaveLength(2);
  });

  it("initializes PTO based on tenure", () => {
    const pto = hrComplianceEngine.initializePTO("EMP-001", 3);
    expect(pto.employee_id).toBe("EMP-001");
    expect(pto.balances.length).toBeGreaterThanOrEqual(3);
    expect(pto.total_available).toBeGreaterThan(0);
    // 0-4 year tier
    const vacation = pto.balances.find((b) => b.type === "vacation");
    expect(vacation).toBeDefined();
    expect(vacation!.accrued).toBeCloseTo(3.08 * 26, 0);
  });

  it("initializes PTO with higher accrual for 10+ years", () => {
    const pto = hrComplianceEngine.initializePTO("EMP-SENIOR", 12);
    const vacation = pto.balances.find((b) => b.type === "vacation");
    expect(vacation!.accrued).toBeCloseTo(6.15 * 26, 0);
  });

  it("requests and approves PTO", () => {
    const req = hrComplianceEngine.requestPTO({
      employee_id: "EMP-001",
      type: "vacation",
      start_date: "2026-04-01",
      end_date: "2026-04-03",
      hours: 24,
    });
    expect(req.status).toBe("pending");
    expect(req.id).toMatch(/^PTO-/);

    const approved = hrComplianceEngine.approvePTO(req.id, "MGR-001");
    expect(approved.status).toBe("approved");
    expect(approved.approved_by).toBe("MGR-001");

    const balance = hrComplianceEngine.getPTOBalance("EMP-001");
    const vacation = balance!.balances.find((b) => b.type === "vacation");
    expect(vacation!.used).toBe(24);
  });

  it("rejects PTO exceeding balance", () => {
    expect(() =>
      hrComplianceEngine.requestPTO({
        employee_id: "EMP-001",
        type: "vacation",
        start_date: "2026-06-01",
        end_date: "2026-12-31",
        hours: 9999,
      })
    ).toThrow(/Insufficient/);
  });

  it("adds training record", () => {
    const rec = hrComplianceEngine.addTraining({
      employee_id: "EMP-001",
      course_name: "OSHA 10-Hour General Industry",
      category: "safety",
      completed_date: "2026-01-15",
      expiration_date: "2027-01-15",
      instructor: "Safety First Inc",
      score: 95,
    });
    expect(rec.id).toMatch(/^TR-/);
    expect(rec.status).toBe("completed");
  });

  it("gets training history", () => {
    const history = hrComplianceEngine.getTrainingHistory("EMP-001");
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].course_name).toBe("OSHA 10-Hour General Industry");
  });

  it("creates performance review with compensation change", () => {
    const review = hrComplianceEngine.createReview({
      employee_id: "EMP-001",
      reviewer_id: "MGR-001",
      review_date: "2026-03-01",
      period: "2025-H2",
      overall_rating: 4,
      categories: [
        { name: "Quality", rating: 4, comments: "Excellent work" },
        { name: "Productivity", rating: 4, comments: "Consistently meets targets" },
      ],
      goals: [
        { description: "Complete CNC training", status: "met" },
        { description: "Reduce scrap by 10%", status: "partially_met" },
      ],
      compensation_change: {
        type: "raise",
        amount: 2.50,
        effective_date: "2026-04-01",
      },
    });
    expect(review.id).toMatch(/^PR-/);
    expect(review.overall_rating).toBe(4);

    const comp = hrComplianceEngine.getCompensationHistory("EMP-001");
    expect(comp).toBeDefined();
    expect(comp!.history.length).toBeGreaterThanOrEqual(1);
    expect(comp!.current_rate).toBe(2.50);
  });

  it("gets compliance alerts", () => {
    const alerts = hrComplianceEngine.complianceAlerts();
    expect(Array.isArray(alerts)).toBe(true);
    // Each alert has required fields
    for (const a of alerts) {
      expect(a).toHaveProperty("type");
      expect(a).toHaveProperty("severity");
      expect(a).toHaveProperty("regulation");
    }
  });

  it("returns HR dashboard", () => {
    const dash = hrComplianceEngine.hrDashboard();
    expect(dash).toHaveProperty("total_enrolled");
    expect(dash).toHaveProperty("total_employer_benefit_cost");
    expect(dash).toHaveProperty("avg_pto_balance");
    expect(dash).toHaveProperty("training_compliance_pct");
    expect(dash).toHaveProperty("compliance_alerts");
    expect(dash.total_enrolled).toBeGreaterThan(0);
  });
});

describe("CustomerManagementEngine", () => {
  let custId: string;

  it("creates a customer", () => {
    const cust = customerManagementEngine.createCustomer({
      name: "Acme Manufacturing",
      company: "Acme Corp",
      contact_name: "John Smith",
      email: "john@acme.com",
      phone: "555-0100",
      address: { street: "123 Main St", city: "Springfield", state: "IL", zip: "62701" },
      credit_limit: 50000,
      payment_terms: "Net 30",
      pricing_tier: "preferred",
      discount_pct: 5,
      tax_exempt: false,
      tags: ["aerospace", "repeat"],
    });
    expect(cust.id).toMatch(/^CUST-/);
    expect(cust.status).toBe("active");
    expect(cust.current_balance).toBe(0);
    custId = cust.id;
  });

  it("gets customer by ID", () => {
    const cust = customerManagementEngine.getCustomer(custId);
    expect(cust).toBeDefined();
    expect(cust!.name).toBe("Acme Manufacturing");
  });

  it("updates customer", () => {
    const updated = customerManagementEngine.updateCustomer(custId, {
      credit_limit: 75000,
      notes: "Upgraded credit after review",
    });
    expect(updated.credit_limit).toBe(75000);
  });

  it("searches customers", () => {
    const results = customerManagementEngine.searchCustomers("acme");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].company).toBe("Acme Corp");
  });

  it("searches by tag", () => {
    const results = customerManagementEngine.searchCustomers("aerospace");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("lists customers with filter", () => {
    const all = customerManagementEngine.listCustomers();
    expect(all.length).toBeGreaterThanOrEqual(1);

    const preferred = customerManagementEngine.listCustomers({ tier: "preferred" });
    expect(preferred.length).toBeGreaterThanOrEqual(1);
  });

  it("checks credit", () => {
    const check = customerManagementEngine.checkCredit(custId, 30000);
    expect(check.approved).toBe(true);
    expect(check.available_credit).toBe(75000);

    const overLimit = customerManagementEngine.checkCredit(custId, 80000);
    expect(overLimit.approved).toBe(false);
    expect(overLimit.over_limit_by).toBe(5000);
  });

  it("logs communication", () => {
    const log = customerManagementEngine.logCommunication({
      customer_id: custId,
      date: "2026-03-01",
      type: "phone",
      subject: "Follow up on quote Q-2026-042",
      details: "Customer interested, wants revised pricing",
      logged_by: "sales-rep-1",
      follow_up_date: "2026-03-08",
    });
    expect(log.id).toMatch(/^COMM-/);
  });

  it("gets communication history", () => {
    const history = customerManagementEngine.getCommHistory(custId);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].subject).toContain("quote");
  });

  it("creates and updates sales opportunity", () => {
    const opp = customerManagementEngine.createOpportunity({
      customer_id: custId,
      description: "50-piece titanium bracket order",
      estimated_value: 25000,
      stage: "rfq_received",
      probability_pct: 30,
    });
    expect(opp.id).toMatch(/^OPP-/);
    expect(opp.stage).toBe("rfq_received");

    const updated = customerManagementEngine.updateOpportunity(opp.id, {
      stage: "won",
      probability_pct: 100,
      close_date: "2026-03-15",
    });
    expect(updated.stage).toBe("won");
  });

  it("gets sales pipeline", () => {
    const pipeline = customerManagementEngine.salesPipeline();
    expect(pipeline).toHaveProperty("stages");
    expect(pipeline).toHaveProperty("total_pipeline");
    expect(pipeline).toHaveProperty("weighted_pipeline");
    expect(pipeline).toHaveProperty("win_rate");
    expect(pipeline.total_pipeline).toBeGreaterThan(0);
  });

  it("records job and gets analytics", () => {
    customerManagementEngine.recordJobForCustomer(custId, 12000, 35, true);
    customerManagementEngine.recordJobForCustomer(custId, 8000, 28, true);

    const analytics = customerManagementEngine.customerAnalytics(custId);
    expect(analytics.total_revenue).toBe(20000);
    expect(analytics.total_jobs).toBe(2);
    expect(analytics.on_time_delivery_pct).toBe(100);
    expect(analytics.avg_job_value).toBe(10000);
  });

  it("gets top customers", () => {
    const top = customerManagementEngine.topCustomers(5);
    expect(top.length).toBeGreaterThanOrEqual(1);
    expect(top[0]).toHaveProperty("total_revenue");
  });
});

describe("IntegrationAdapterEngine", () => {
  const sampleTransactions = [
    { date: "2026-03-01", type: "Invoice", reference: "INV-001", description: "Machine parts", amount: 5000, account: "Accounts Receivable", category: "Revenue" },
    { date: "2026-03-02", type: "Payment", reference: "PMT-001", description: "Supplier payment", amount: -2500, account: "Accounts Payable", category: "COGS" },
    { date: "2026-03-03", type: "Invoice", reference: "INV-002", description: "Tooling order", amount: 3200, account: "Accounts Receivable", category: "Revenue" },
  ];

  it("exports QuickBooks IIF", () => {
    const result = integrationAdapterEngine.exportQuickBooksIIF(sampleTransactions);
    expect(result.format).toBe("QuickBooks IIF");
    expect(result.filename).toMatch(/^qb_export_.*\.iif$/);
    expect(result.record_count).toBe(3);
    expect(result.content).toContain("!TRNS");
    expect(result.content).toContain("ENDTRNS");
    expect(result.content).toContain("INV-001");
  });

  it("exports generic CSV", () => {
    const result = integrationAdapterEngine.exportCSV(sampleTransactions);
    expect(result.format).toBe("CSV");
    expect(result.filename).toMatch(/^export_.*\.csv$/);
    expect(result.record_count).toBe(3);
    expect(result.content).toContain("Date,Type,Reference");
    expect(result.content).toContain("Machine parts");
    expect(result.total_amount).toBe(10700); // abs sum
  });

  it("exports payroll tax summary", () => {
    const result = integrationAdapterEngine.exportPayrollTaxSummary({
      period: "2026-Q1",
      employees: [
        { name: "Jane Doe", ssn_last4: "1234", gross: 15000, federal_tax: 2250, state_tax: 750, social_security: 930, medicare: 217.5, net: 10852.5 },
        { name: "Bob Smith", ssn_last4: "5678", gross: 12000, federal_tax: 1800, state_tax: 600, social_security: 744, medicare: 174, net: 8682 },
      ],
    });
    expect(result.format).toBe("Payroll Tax CSV");
    expect(result.record_count).toBe(2);
    expect(result.total_amount).toBe(27000);
    expect(result.content).toContain("TOTALS");
    expect(result.content).toContain("Employer FICA Match");
    expect(result.content).toContain("Total Tax Liability");
  });

  it("reconciles bank statement", () => {
    const result = integrationAdapterEngine.reconcileBank({
      statement_date: "2026-02-28",
      bank_balance: 50000,
      book_balance: 48500,
      deposits_in_transit: [
        { date: "2026-02-27", amount: 3000, reference: "DEP-001" },
      ],
      outstanding_checks: [
        { date: "2026-02-25", amount: 1500, reference: "CHK-101" },
        { date: "2026-02-26", amount: 3000, reference: "CHK-102" },
      ],
      bank_charges: 0,
      interest_earned: 0,
    });
    expect(result.statement_date).toBe("2026-02-28");
    expect(result.adjusted_bank).toBe(48500); // 50000 + 3000 - 4500
    expect(result.adjusted_book).toBe(48500);
    expect(result.reconciled).toBe(true);
    expect(result.difference).toBe(0);
  });

  it("detects reconciliation mismatch", () => {
    const result = integrationAdapterEngine.reconcileBank({
      statement_date: "2026-02-28",
      bank_balance: 50000,
      book_balance: 49000,
      deposits_in_transit: [],
      outstanding_checks: [],
    });
    expect(result.reconciled).toBe(false);
    expect(result.difference).toBe(1000);
  });

  it("exports AR aging report", () => {
    const result = integrationAdapterEngine.exportARAging([
      { id: "INV-001", customer: "Acme Corp", date: "2026-01-15", due_date: "2026-02-14", total: 5000, paid: 0, balance: 5000 },
      { id: "INV-002", customer: "Beta LLC", date: "2026-03-01", due_date: "2026-03-31", total: 3000, paid: 1000, balance: 2000 },
    ]);
    expect(result.format).toBe("AR Aging CSV");
    expect(result.record_count).toBe(2);
    expect(result.total_amount).toBe(7000);
    expect(result.content).toContain("Aging Bucket");
    expect(result.content).toContain("Acme Corp");
  });

  it("lists supported formats", () => {
    const formats = integrationAdapterEngine.listFormats();
    expect(formats.length).toBe(6);
    const names = formats.map((f) => f.format);
    expect(names).toContain("QuickBooks IIF");
    expect(names).toContain("CSV");
    expect(names).toContain("Bank Reconciliation");
    expect(names).toContain("E2 Shop System");
  });
});
