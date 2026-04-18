/**
 * LatheSystemIntegrationEngine — Unified System Integration Layer
 *
 * U-LTH60: Integrates all P5 engines into cohesive system
 * Provides unified API for Quote→Order→Production→Delivery→Payment flow
 *
 * @module engines/LatheSystemIntegrationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface IntegratedJob {
  job_id: string;
  customer_id: string;
  customer_name: string;
  part_number: string;
  quantity: number;
  quote: QuoteSummary | null;
  order: OrderSummary | null;
  production: ProductionSummary | null;
  quality: QualitySummary | null;
  delivery: DeliverySummary | null;
  financial: FinancialSummary | null;
  workflow_stage: string;
  overall_status: "on_track" | "at_risk" | "delayed" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface QuoteSummary {
  quote_id: string;
  unit_price: number;
  total_price: number;
  margin_pct: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  valid_until: string;
}

export interface OrderSummary {
  order_id: string;
  po_number: string;
  due_date: string;
  status: string;
  priority: string;
}

export interface ProductionSummary {
  machine_id: string | null;
  scheduled_start: string | null;
  actual_start: string | null;
  progress_pct: number;
  cycle_time_actual: number;
  setup_time_actual: number;
  status: "pending" | "scheduled" | "in_progress" | "complete";
}

export interface QualitySummary {
  inspections_count: number;
  passed_count: number;
  failed_count: number;
  fpy_pct: number;
  cpk_avg: number | null;
  nc_count: number;
}

export interface DeliverySummary {
  delivery_id: string | null;
  ship_date: string | null;
  tracking_number: string | null;
  carrier: string | null;
  status: "pending" | "shipped" | "delivered" | "delayed";
  delay_days: number;
}

export interface FinancialSummary {
  quoted_price: number;
  actual_cost: number;
  actual_revenue: number;
  actual_margin_pct: number;
  variance_pct: number;
  invoice_status: "not_invoiced" | "invoiced" | "partial" | "paid";
}

export interface SystemHealthCheck {
  timestamp: string;
  overall_status: "healthy" | "degraded" | "critical";
  components: Array<{
    name: string;
    status: "healthy" | "warning" | "error";
    message: string;
  }>;
  metrics: {
    active_jobs: number;
    jobs_at_risk: number;
    pending_quotes: number;
    pending_shipments: number;
    overdue_invoices: number;
  };
}

export interface IntegrationEvent {
  event_id: string;
  event_type: string;
  job_id: string;
  source_system: string;
  timestamp: string;
  data: Record<string, unknown>;
  processed: boolean;
}

export interface JobTimeline {
  job_id: string;
  events: Array<{
    timestamp: string;
    event_type: string;
    description: string;
    source: string;
  }>;
  milestones: Array<{
    name: string;
    planned_date: string;
    actual_date: string | null;
    status: "pending" | "completed" | "overdue";
  }>;
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheSystemIntegrationEngine {
  private jobs: Map<string, IntegratedJob> = new Map();
  private events: Map<string, IntegrationEvent> = new Map();

  // --------------------------------------------------------------------------
  // Job Integration
  // --------------------------------------------------------------------------

  createIntegratedJob(params: {
    job_id: string;
    customer_id: string;
    customer_name: string;
    part_number: string;
    quantity: number;
  }): IntegratedJob {
    const now = new Date().toISOString();

    const job: IntegratedJob = {
      job_id: params.job_id,
      customer_id: params.customer_id,
      customer_name: params.customer_name,
      part_number: params.part_number,
      quantity: params.quantity,
      quote: null,
      order: null,
      production: null,
      quality: null,
      delivery: null,
      financial: null,
      workflow_stage: "quote_request",
      overall_status: "on_track",
      created_at: now,
      updated_at: now,
    };

    this.jobs.set(params.job_id, job);

    this.recordEvent({
      event_type: "job_created",
      job_id: params.job_id,
      source_system: "integration",
      data: { customer_id: params.customer_id, part_number: params.part_number },
    });

    return job;
  }

  attachQuote(jobId: string, quote: QuoteSummary): IntegratedJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.quote = quote;
    job.workflow_stage = "quote_generated";
    job.updated_at = new Date().toISOString();

    this.jobs.set(jobId, job);

    this.recordEvent({
      event_type: "quote_attached",
      job_id: jobId,
      source_system: "quoting",
      data: { quote_id: quote.quote_id, total_price: quote.total_price },
    });

    return job;
  }

  attachOrder(jobId: string, order: OrderSummary): IntegratedJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.order = order;
    job.workflow_stage = "order_received";
    job.updated_at = new Date().toISOString();

    this.jobs.set(jobId, job);

    this.recordEvent({
      event_type: "order_attached",
      job_id: jobId,
      source_system: "orders",
      data: { order_id: order.order_id, po_number: order.po_number },
    });

    return job;
  }

  updateProduction(jobId: string, production: ProductionSummary): IntegratedJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.production = production;

    if (production.status === "in_progress") {
      job.workflow_stage = "production_running";
    } else if (production.status === "complete") {
      job.workflow_stage = "production_complete";
    } else if (production.status === "scheduled") {
      job.workflow_stage = "job_scheduled";
    }

    job.updated_at = new Date().toISOString();
    this.jobs.set(jobId, job);

    this.recordEvent({
      event_type: "production_updated",
      job_id: jobId,
      source_system: "production",
      data: { status: production.status, progress_pct: production.progress_pct },
    });

    return job;
  }

  updateQuality(jobId: string, quality: QualitySummary): IntegratedJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.quality = quality;

    if (quality.failed_count > 0 && quality.fpy_pct < 90) {
      job.overall_status = "at_risk";
    }

    job.updated_at = new Date().toISOString();
    this.jobs.set(jobId, job);

    this.recordEvent({
      event_type: "quality_updated",
      job_id: jobId,
      source_system: "quality",
      data: { fpy_pct: quality.fpy_pct, nc_count: quality.nc_count },
    });

    return job;
  }

  updateDelivery(jobId: string, delivery: DeliverySummary): IntegratedJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.delivery = delivery;

    if (delivery.status === "shipped") {
      job.workflow_stage = "shipped";
    } else if (delivery.status === "delivered") {
      job.workflow_stage = "delivered";
    } else if (delivery.status === "delayed") {
      job.overall_status = "delayed";
    }

    job.updated_at = new Date().toISOString();
    this.jobs.set(jobId, job);

    this.recordEvent({
      event_type: "delivery_updated",
      job_id: jobId,
      source_system: "delivery",
      data: { status: delivery.status, delay_days: delivery.delay_days },
    });

    return job;
  }

  updateFinancial(jobId: string, financial: FinancialSummary): IntegratedJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.financial = financial;

    if (financial.invoice_status === "paid") {
      job.workflow_stage = "payment_received";
      job.overall_status = "completed";
    } else if (financial.invoice_status === "invoiced") {
      job.workflow_stage = "invoiced";
    }

    job.updated_at = new Date().toISOString();
    this.jobs.set(jobId, job);

    this.recordEvent({
      event_type: "financial_updated",
      job_id: jobId,
      source_system: "financial",
      data: { actual_margin_pct: financial.actual_margin_pct, invoice_status: financial.invoice_status },
    });

    return job;
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  getJob(jobId: string): IntegratedJob | null {
    return this.jobs.get(jobId) || null;
  }

  getJobsByStatus(status: IntegratedJob["overall_status"]): IntegratedJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.overall_status === status);
  }

  getJobsByCustomer(customerId: string): IntegratedJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.customer_id === customerId);
  }

  getJobsByWorkflowStage(stage: string): IntegratedJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.workflow_stage === stage);
  }

  getActiveJobs(): IntegratedJob[] {
    return Array.from(this.jobs.values()).filter(
      (j) => j.overall_status !== "completed" && j.overall_status !== "cancelled"
    );
  }

  // --------------------------------------------------------------------------
  // System Health
  // --------------------------------------------------------------------------

  performHealthCheck(): SystemHealthCheck {
    const jobs = Array.from(this.jobs.values());
    const activeJobs = jobs.filter(
      (j) => j.overall_status !== "completed" && j.overall_status !== "cancelled"
    );
    const atRiskJobs = jobs.filter((j) => j.overall_status === "at_risk");
    const pendingQuotes = jobs.filter((j) => j.quote && j.quote.status === "sent");
    const pendingShipments = jobs.filter(
      (j) => j.delivery && j.delivery.status === "pending"
    );
    const overdueInvoices = jobs.filter(
      (j) => j.financial && j.financial.invoice_status === "invoiced"
    );

    const components: SystemHealthCheck["components"] = [];

    if (atRiskJobs.length === 0) {
      components.push({ name: "Production", status: "healthy", message: "All jobs on track" });
    } else if (atRiskJobs.length <= 2) {
      components.push({
        name: "Production",
        status: "warning",
        message: `${atRiskJobs.length} jobs at risk`,
      });
    } else {
      components.push({
        name: "Production",
        status: "error",
        message: `${atRiskJobs.length} jobs at risk - intervention needed`,
      });
    }

    const delayedJobs = jobs.filter((j) => j.overall_status === "delayed");
    if (delayedJobs.length === 0) {
      components.push({ name: "Delivery", status: "healthy", message: "No delays" });
    } else {
      components.push({
        name: "Delivery",
        status: "warning",
        message: `${delayedJobs.length} jobs delayed`,
      });
    }

    const lowMarginJobs = jobs.filter(
      (j) => j.financial && j.financial.actual_margin_pct < 15
    );
    if (lowMarginJobs.length === 0) {
      components.push({ name: "Financial", status: "healthy", message: "Margins healthy" });
    } else {
      components.push({
        name: "Financial",
        status: "warning",
        message: `${lowMarginJobs.length} jobs with low margins`,
      });
    }

    const qualityIssues = jobs.filter((j) => j.quality && j.quality.nc_count > 0);
    if (qualityIssues.length === 0) {
      components.push({ name: "Quality", status: "healthy", message: "No NCs pending" });
    } else {
      components.push({
        name: "Quality",
        status: "warning",
        message: `${qualityIssues.length} jobs with quality issues`,
      });
    }

    const hasError = components.some((c) => c.status === "error");
    const hasWarning = components.some((c) => c.status === "warning");

    return {
      timestamp: new Date().toISOString(),
      overall_status: hasError ? "critical" : hasWarning ? "degraded" : "healthy",
      components,
      metrics: {
        active_jobs: activeJobs.length,
        jobs_at_risk: atRiskJobs.length,
        pending_quotes: pendingQuotes.length,
        pending_shipments: pendingShipments.length,
        overdue_invoices: overdueInvoices.length,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Timeline
  // --------------------------------------------------------------------------

  getJobTimeline(jobId: string): JobTimeline | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const jobEvents = Array.from(this.events.values())
      .filter((e) => e.job_id === jobId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((e) => ({
        timestamp: e.timestamp,
        event_type: e.event_type,
        description: this.getEventDescription(e),
        source: e.source_system,
      }));

    const milestones = this.generateMilestones(job);

    return {
      job_id: jobId,
      events: jobEvents,
      milestones,
    };
  }

  private getEventDescription(event: IntegrationEvent): string {
    switch (event.event_type) {
      case "job_created":
        return `Job created for ${event.data.part_number}`;
      case "quote_attached":
        return `Quote ${event.data.quote_id} attached ($${event.data.total_price})`;
      case "order_attached":
        return `Order ${event.data.order_id} received (PO: ${event.data.po_number})`;
      case "production_updated":
        return `Production ${event.data.status} (${event.data.progress_pct}% complete)`;
      case "quality_updated":
        return `Quality: ${event.data.fpy_pct}% FPY, ${event.data.nc_count} NCs`;
      case "delivery_updated":
        return `Delivery ${event.data.status}`;
      case "financial_updated":
        return `Invoice ${event.data.invoice_status}, margin ${event.data.actual_margin_pct}%`;
      default:
        return event.event_type;
    }
  }

  private generateMilestones(job: IntegratedJob): JobTimeline["milestones"] {
    const milestones: JobTimeline["milestones"] = [];

    milestones.push({
      name: "Quote Sent",
      planned_date: job.created_at,
      actual_date: job.quote ? job.created_at : null,
      status: job.quote ? "completed" : "pending",
    });

    milestones.push({
      name: "Order Received",
      planned_date: job.created_at,
      actual_date: job.order ? job.updated_at : null,
      status: job.order ? "completed" : "pending",
    });

    milestones.push({
      name: "Production Complete",
      planned_date: job.order?.due_date || job.created_at,
      actual_date: job.production?.status === "complete" ? job.updated_at : null,
      status: job.production?.status === "complete" ? "completed" : "pending",
    });

    milestones.push({
      name: "Shipped",
      planned_date: job.order?.due_date || job.created_at,
      actual_date: job.delivery?.ship_date || null,
      status: job.delivery?.status === "shipped" || job.delivery?.status === "delivered"
        ? "completed"
        : "pending",
    });

    milestones.push({
      name: "Payment Received",
      planned_date: job.order?.due_date || job.created_at,
      actual_date: job.financial?.invoice_status === "paid" ? job.updated_at : null,
      status: job.financial?.invoice_status === "paid" ? "completed" : "pending",
    });

    return milestones;
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  private recordEvent(params: Omit<IntegrationEvent, "event_id" | "timestamp" | "processed">): IntegrationEvent {
    const eventId = `EVT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const event: IntegrationEvent = {
      ...params,
      event_id: eventId,
      timestamp: new Date().toISOString(),
      processed: true,
    };

    this.events.set(eventId, event);
    return event;
  }

  getRecentEvents(limit: number = 50): IntegrationEvent[] {
    return Array.from(this.events.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // --------------------------------------------------------------------------
  // Summary Reports
  // --------------------------------------------------------------------------

  generateSummaryReport(): {
    total_jobs: number;
    by_status: Record<string, number>;
    by_stage: Record<string, number>;
    financial_summary: {
      total_quoted: number;
      total_revenue: number;
      avg_margin_pct: number;
    };
  } {
    const jobs = Array.from(this.jobs.values());

    const byStatus: Record<string, number> = {};
    const byStage: Record<string, number> = {};

    for (const job of jobs) {
      byStatus[job.overall_status] = (byStatus[job.overall_status] || 0) + 1;
      byStage[job.workflow_stage] = (byStage[job.workflow_stage] || 0) + 1;
    }

    const jobsWithFinancial = jobs.filter((j) => j.financial);
    const totalQuoted = jobs
      .filter((j) => j.quote)
      .reduce((sum, j) => sum + (j.quote?.total_price || 0), 0);
    const totalRevenue = jobsWithFinancial.reduce(
      (sum, j) => sum + (j.financial?.actual_revenue || 0),
      0
    );
    const avgMargin = jobsWithFinancial.length > 0
      ? jobsWithFinancial.reduce((sum, j) => sum + (j.financial?.actual_margin_pct || 0), 0) /
          jobsWithFinancial.length
      : 0;

    return {
      total_jobs: jobs.length,
      by_status: byStatus,
      by_stage: byStage,
      financial_summary: {
        total_quoted: Math.round(totalQuoted * 100) / 100,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        avg_margin_pct: Math.round(avgMargin * 10) / 10,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  clearAll(): void {
    this.jobs.clear();
    this.events.clear();
  }
}

export const latheSystemIntegrationEngine = new LatheSystemIntegrationEngine();
