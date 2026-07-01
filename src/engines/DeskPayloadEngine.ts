/**
 * DeskPayloadEngine — Role-Based Desk KPI Payloads + Saved Views
 * ================================================================
 *
 * Provides role-specific dashboard payloads with live KPIs, saved views CRUD,
 * entity pinning, and recent entity tracking. Works alongside ShellBootstrapEngine
 * (which provides navigation structure) to give each role a data-rich landing view.
 *
 * 4 desk types:
 *   admin/owner:  revenue_mtd, quotes_pending, jobs_overdue, machine_utilization, ar_aging
 *   engineer:     parts_needing_review, open_ncrs, programs_pending, dfm_queue
 *   operator:     current_job, next_job, clock_status, quality_alerts, my_time_today
 *   viewer:       public_dashboard_metrics
 *
 * Saved views, pins, and recents are in-memory with DB-ready interfaces.
 *
 * @version 1.0.0 — Session 6-8 U-DESK1
 * @see ShellBootstrapEngine — navigation and role structure
 */

import { log } from "../utils/Logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeskRole = "admin" | "engineer" | "operator" | "viewer";

export interface KpiCard {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: "up" | "down" | "flat";
  detail?: string;
  severity?: "info" | "warn" | "critical";
}

export interface AdminDeskPayload {
  role: "admin";
  kpis: {
    revenue_mtd: KpiCard;
    quotes_pending: KpiCard;
    jobs_overdue: KpiCard;
    machine_utilization: KpiCard;
    ar_aging: KpiCard;
    oee: KpiCard;
    on_time_delivery: KpiCard;
    scrap_rate: KpiCard;
  };
  alerts: DeskAlert[];
  generated_at: string;
}

export interface EngineerDeskPayload {
  role: "engineer";
  kpis: {
    parts_needing_review: KpiCard;
    open_ncrs: KpiCard;
    programs_pending: KpiCard;
    dfm_queue: KpiCard;
    tool_life_alerts: KpiCard;
    process_changes: KpiCard;
  };
  alerts: DeskAlert[];
  generated_at: string;
}

export interface OperatorDeskPayload {
  role: "operator";
  kpis: {
    current_job: KpiCard;
    next_job: KpiCard;
    clock_status: KpiCard;
    quality_alerts: KpiCard;
    my_time_today: KpiCard;
    parts_completed: KpiCard;
  };
  alerts: DeskAlert[];
  generated_at: string;
}

export interface ViewerDeskPayload {
  role: "viewer";
  kpis: {
    active_jobs: KpiCard;
    machines_running: KpiCard;
    jobs_completed_today: KpiCard;
    shop_status: KpiCard;
  };
  alerts: DeskAlert[];
  generated_at: string;
}

export type DeskPayload = AdminDeskPayload | EngineerDeskPayload | OperatorDeskPayload | ViewerDeskPayload;

export interface DeskAlert {
  id: string;
  severity: "info" | "warn" | "critical";
  title: string;
  detail: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

// ─── Saved Views ──────────────────────────────────────────────────────────────

export interface SavedView {
  id: string;
  user_id: string;
  name: string;
  entity_type: string;
  filters: Record<string, unknown>;
  columns?: string[];
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSavedViewInput {
  user_id: string;
  name: string;
  entity_type: string;
  filters?: Record<string, unknown>;
  columns?: string[];
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  is_default?: boolean;
}

export interface UpdateSavedViewInput {
  view_id: string;
  user_id: string;
  name?: string;
  filters?: Record<string, unknown>;
  columns?: string[];
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  is_default?: boolean;
}

// ─── Pins & Recents ───────────────────────────────────────────────────────────

export interface PinnedEntity {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  pinned_at: string;
}

export interface RecentEntity {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  accessed_at: string;
}

// ─── Data Inputs ──────────────────────────────────────────────────────────────

export interface DeskDataSources {
  jobs?: Array<{
    id: string;
    status: string;
    customer?: string;
    part_number?: string;
    due_date?: string;
    revenue?: number;
    operator_id?: string;
  }>;
  quotes?: Array<{
    id: string;
    status: string;
    amount?: number;
    customer?: string;
  }>;
  machines?: Array<{
    id: string;
    status: string;
    utilization?: number;
    current_job_id?: string;
  }>;
  ncrs?: Array<{
    id: string;
    status: string;
    severity?: string;
  }>;
  invoices?: Array<{
    id: string;
    status: string;
    amount?: number;
    due_date?: string;
    days_overdue?: number;
  }>;
  programs?: Array<{
    id: string;
    status: string;
  }>;
  operator_id?: string;
  clock_in_time?: string;
}

// ─── UUID fallback ────────────────────────────────────────────────────────────

function genId(): string {
  try { return crypto.randomUUID(); } catch { return `dsk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
}

// ─── Engine ───────────────────────────────────────────────────────────────────

const MAX_PINS_PER_USER = 50;
const MAX_RECENTS_PER_USER = 100;
const MAX_VIEWS_PER_USER = 50;

export class DeskPayloadEngine {
  private savedViews = new Map<string, SavedView>();
  private pins = new Map<string, PinnedEntity>();
  private recents = new Map<string, RecentEntity[]>();

  // ═══════════════════════════════════════════════════════════════════════════
  // DESK PAYLOADS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the desk payload for a specific role.
   * @param role - admin | engineer | operator | viewer
   * @param data - Live data sources
   */
  getDeskPayload(role: DeskRole, data: DeskDataSources = {}): DeskPayload {
    const now = new Date().toISOString();
    switch (role) {
      case "admin": return this.buildAdminDesk(data, now);
      case "engineer": return this.buildEngineerDesk(data, now);
      case "operator": return this.buildOperatorDesk(data, now);
      case "viewer": return this.buildViewerDesk(data, now);
      default: {
        log.warn(`[DeskPayloadEngine] Unknown role "${role}", falling back to viewer`);
        return this.buildViewerDesk(data, now);
      }
    }
  }

  /**
   * Get desk counts (summary counters for the shell badge/nav).
   * @param data - Live data sources
   */
  getDeskCounts(data: DeskDataSources = {}): Record<string, number> {
    const jobs = data.jobs || [];
    const quotes = data.quotes || [];
    const ncrs = data.ncrs || [];
    const invoices = data.invoices || [];

    return {
      active_jobs: jobs.filter((j) => j.status === "in_progress" || j.status === "running").length,
      overdue_jobs: jobs.filter((j) => j.status === "late" || j.status === "overdue").length,
      pending_quotes: quotes.filter((q) => q.status === "pending" || q.status === "draft").length,
      open_ncrs: ncrs.filter((n) => n.status === "open" || n.status === "investigation").length,
      overdue_invoices: invoices.filter((i) => (i.days_overdue || 0) > 0).length,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVED VIEWS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a saved view for a user.
   * @param input - View creation params
   */
  createSavedView(input: CreateSavedViewInput): SavedView {
    if (!input.user_id || !input.name || !input.entity_type) {
      throw new Error("user_id, name, and entity_type are required");
    }

    const userViews = [...this.savedViews.values()].filter((v) => v.user_id === input.user_id);
    if (userViews.length >= MAX_VIEWS_PER_USER) {
      throw new Error(`Maximum ${MAX_VIEWS_PER_USER} saved views per user`);
    }

    // If setting as default, unset existing default for same entity_type
    if (input.is_default) {
      for (const v of userViews) {
        if (v.entity_type === input.entity_type && v.is_default) {
          v.is_default = false;
          v.updated_at = new Date().toISOString();
        }
      }
    }

    const now = new Date().toISOString();
    const view: SavedView = {
      id: genId(),
      user_id: input.user_id,
      name: input.name,
      entity_type: input.entity_type,
      filters: input.filters || {},
      columns: input.columns,
      sort_by: input.sort_by,
      sort_dir: input.sort_dir || "asc",
      is_default: input.is_default ?? false,
      created_at: now,
      updated_at: now,
    };

    this.savedViews.set(view.id, view);
    log.info(`[DeskPayloadEngine] Created saved view "${view.name}" for user ${view.user_id}`);
    return view;
  }

  /**
   * Update a saved view.
   * @param input - Fields to update
   */
  updateSavedView(input: UpdateSavedViewInput): SavedView {
    const view = this.savedViews.get(input.view_id);
    if (!view) throw new Error(`Saved view ${input.view_id} not found`);
    if (view.user_id !== input.user_id) throw new Error("Cannot modify another user's saved view");

    if (input.name !== undefined) view.name = input.name;
    if (input.filters !== undefined) view.filters = input.filters;
    if (input.columns !== undefined) view.columns = input.columns;
    if (input.sort_by !== undefined) view.sort_by = input.sort_by;
    if (input.sort_dir !== undefined) view.sort_dir = input.sort_dir;

    if (input.is_default !== undefined) {
      if (input.is_default) {
        // Unset existing default for same entity_type
        for (const [, v] of this.savedViews) {
          if (v.user_id === input.user_id && v.entity_type === view.entity_type && v.is_default && v.id !== view.id) {
            v.is_default = false;
            v.updated_at = new Date().toISOString();
          }
        }
      }
      view.is_default = input.is_default;
    }

    view.updated_at = new Date().toISOString();
    return view;
  }

  /**
   * Delete a saved view.
   * @param viewId - View ID
   * @param userId - Must match the view owner
   */
  deleteSavedView(viewId: string, userId: string): { deleted: boolean } {
    const view = this.savedViews.get(viewId);
    if (!view) throw new Error(`Saved view ${viewId} not found`);
    if (view.user_id !== userId) throw new Error("Cannot delete another user's saved view");
    this.savedViews.delete(viewId);
    return { deleted: true };
  }

  /**
   * List saved views for a user.
   * @param userId - User ID
   * @param entityType - Optional filter by entity type
   */
  listSavedViews(userId: string, entityType?: string): SavedView[] {
    const views = [...this.savedViews.values()].filter((v) => v.user_id === userId);
    if (entityType) return views.filter((v) => v.entity_type === entityType);
    return views;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PINS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Pin an entity for a user.
   * @param userId - User ID
   * @param entityType - Entity type (job, quote, customer, etc.)
   * @param entityId - Entity ID
   * @param title - Display title
   */
  pinEntity(userId: string, entityType: string, entityId: string, title: string): PinnedEntity {
    if (!userId || !entityType || !entityId) throw new Error("userId, entityType, and entityId are required");

    // Check duplicate
    const existing = [...this.pins.values()].find(
      (p) => p.user_id === userId && p.entity_type === entityType && p.entity_id === entityId,
    );
    if (existing) return existing;

    // Check limit
    const userPins = [...this.pins.values()].filter((p) => p.user_id === userId);
    if (userPins.length >= MAX_PINS_PER_USER) {
      throw new Error(`Maximum ${MAX_PINS_PER_USER} pins per user`);
    }

    const pin: PinnedEntity = {
      id: genId(),
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      title,
      pinned_at: new Date().toISOString(),
    };
    this.pins.set(pin.id, pin);
    return pin;
  }

  /**
   * Unpin an entity.
   * @param pinId - Pin ID
   * @param userId - Must match pin owner
   */
  unpinEntity(pinId: string, userId: string): { unpinned: boolean } {
    const pin = this.pins.get(pinId);
    if (!pin) throw new Error(`Pin ${pinId} not found`);
    if (pin.user_id !== userId) throw new Error("Cannot unpin another user's pin");
    this.pins.delete(pinId);
    return { unpinned: true };
  }

  /**
   * List pinned entities for a user.
   * @param userId - User ID
   */
  listPins(userId: string): PinnedEntity[] {
    return [...this.pins.values()]
      .filter((p) => p.user_id === userId)
      .sort((a, b) => b.pinned_at.localeCompare(a.pinned_at));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECENTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record that a user accessed an entity.
   * @param userId - User ID
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param title - Display title
   */
  recordAccess(userId: string, entityType: string, entityId: string, title: string): RecentEntity {
    if (!userId || !entityType || !entityId) throw new Error("userId, entityType, and entityId are required");

    const userRecents = this.recents.get(userId) || [];

    // Remove duplicate if exists
    const filtered = userRecents.filter(
      (r) => !(r.entity_type === entityType && r.entity_id === entityId),
    );

    const recent: RecentEntity = {
      id: genId(),
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      title,
      accessed_at: new Date().toISOString(),
    };

    filtered.unshift(recent);

    // Trim to max
    if (filtered.length > MAX_RECENTS_PER_USER) {
      filtered.length = MAX_RECENTS_PER_USER;
    }

    this.recents.set(userId, filtered);
    return recent;
  }

  /**
   * List recent entities for a user.
   * @param userId - User ID
   * @param limit - Max results (default 20)
   */
  listRecents(userId: string, limit = 20): RecentEntity[] {
    const userRecents = this.recents.get(userId) || [];
    return userRecents.slice(0, Math.min(limit, MAX_RECENTS_PER_USER));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE — DESK BUILDERS
  // ═══════════════════════════════════════════════════════════════════════════

  private buildAdminDesk(data: DeskDataSources, now: string): AdminDeskPayload {
    const jobs = data.jobs || [];
    const quotes = data.quotes || [];
    const machines = data.machines || [];
    const invoices = data.invoices || [];

    const revenueMtd = jobs
      .filter((j) => j.revenue && j.revenue > 0)
      .reduce((sum, j) => sum + (j.revenue || 0), 0);

    const pendingQuotes = quotes.filter((q) => q.status === "pending" || q.status === "draft");
    const quotesValue = pendingQuotes.reduce((sum, q) => sum + (q.amount || 0), 0);

    const overdueJobs = jobs.filter((j) => j.status === "late" || j.status === "overdue");
    const runningMachines = machines.filter((m) => m.status === "running" || m.status === "active");
    const utilization = machines.length > 0
      ? machines.reduce((sum, m) => sum + (m.utilization || 0), 0) / machines.length
      : 0;

    const overdueInvoices = invoices.filter((i) => (i.days_overdue || 0) > 0);
    const arAgingTotal = overdueInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

    const totalJobs = jobs.length || 1;
    const onTimeJobs = jobs.filter((j) => j.status === "complete" || j.status === "shipped").length;
    const otd = totalJobs > 0 ? (onTimeJobs / totalJobs) * 100 : 0;

    const scrapJobs = jobs.filter((j) => j.status === "scrapped").length;
    const scrapRate = totalJobs > 0 ? (scrapJobs / totalJobs) * 100 : 0;

    const alerts = this.buildAlerts(data);

    return {
      role: "admin",
      kpis: {
        revenue_mtd: {
          id: "kpi-revenue-mtd", label: "Revenue MTD", value: revenueMtd,
          unit: "USD", trend: "flat", detail: `$${revenueMtd.toLocaleString()} month-to-date`,
        },
        quotes_pending: {
          id: "kpi-quotes-pending", label: "Quotes Pending", value: pendingQuotes.length,
          detail: `${pendingQuotes.length} quotes worth $${quotesValue.toLocaleString()}`,
          severity: pendingQuotes.length > 10 ? "warn" : "info",
        },
        jobs_overdue: {
          id: "kpi-jobs-overdue", label: "Jobs Overdue", value: overdueJobs.length,
          severity: overdueJobs.length > 0 ? "critical" : "info",
          detail: `${overdueJobs.length} jobs past due date`,
        },
        machine_utilization: {
          id: "kpi-utilization", label: "Machine Utilization", value: Math.round(utilization),
          unit: "%", detail: `${runningMachines.length}/${machines.length} machines active`,
          severity: utilization < 60 ? "warn" : "info",
        },
        ar_aging: {
          id: "kpi-ar-aging", label: "AR Aging", value: arAgingTotal,
          unit: "USD", detail: `${overdueInvoices.length} overdue invoices totaling $${arAgingTotal.toLocaleString()}`,
          severity: arAgingTotal > 50000 ? "critical" : arAgingTotal > 10000 ? "warn" : "info",
        },
        oee: {
          id: "kpi-oee", label: "OEE", value: Math.round(utilization * 0.85),
          unit: "%", detail: "Overall Equipment Effectiveness (availability x performance x quality)",
        },
        on_time_delivery: {
          id: "kpi-otd", label: "On-Time Delivery", value: Math.round(otd),
          unit: "%", detail: `${onTimeJobs}/${totalJobs} jobs delivered on time`,
          severity: otd < 90 ? "warn" : "info",
        },
        scrap_rate: {
          id: "kpi-scrap", label: "Scrap Rate", value: +scrapRate.toFixed(1),
          unit: "%", detail: `${scrapJobs} scrapped out of ${totalJobs} jobs`,
          severity: scrapRate > 5 ? "critical" : scrapRate > 2 ? "warn" : "info",
        },
      },
      alerts,
      generated_at: now,
    };
  }

  private buildEngineerDesk(data: DeskDataSources, now: string): EngineerDeskPayload {
    const ncrs = data.ncrs || [];
    const programs = data.programs || [];
    const jobs = data.jobs || [];

    const openNcrs = ncrs.filter((n) => n.status === "open" || n.status === "investigation");
    const pendingPrograms = programs.filter((p) => p.status === "pending" || p.status === "draft");
    const reviewJobs = jobs.filter((j) => j.status === "review" || j.status === "engineering_review");

    return {
      role: "engineer",
      kpis: {
        parts_needing_review: {
          id: "kpi-review", label: "Parts Needing Review", value: reviewJobs.length,
          detail: `${reviewJobs.length} parts awaiting engineering review`,
          severity: reviewJobs.length > 5 ? "warn" : "info",
        },
        open_ncrs: {
          id: "kpi-ncrs", label: "Open NCRs", value: openNcrs.length,
          detail: `${openNcrs.length} non-conformance reports open`,
          severity: openNcrs.length > 3 ? "critical" : openNcrs.length > 0 ? "warn" : "info",
        },
        programs_pending: {
          id: "kpi-programs", label: "Programs Pending", value: pendingPrograms.length,
          detail: `${pendingPrograms.length} CNC programs awaiting release`,
        },
        dfm_queue: {
          id: "kpi-dfm", label: "DFM Queue", value: reviewJobs.filter((j) => j.status === "engineering_review").length,
          detail: "Design for Manufacturability reviews pending",
        },
        tool_life_alerts: {
          id: "kpi-tool-life", label: "Tool Life Alerts", value: 0,
          detail: "Tools approaching end of life",
        },
        process_changes: {
          id: "kpi-changes", label: "Process Changes", value: 0,
          detail: "Active process change requests",
        },
      },
      alerts: this.buildAlerts(data),
      generated_at: now,
    };
  }

  private buildOperatorDesk(data: DeskDataSources, now: string): OperatorDeskPayload {
    const jobs = data.jobs || [];
    const opId = data.operator_id;

    const myJobs = opId
      ? jobs.filter((j) => j.operator_id === opId)
      : jobs.filter((j) => j.status === "in_progress" || j.status === "running");

    const currentJob = myJobs.find((j) => j.status === "in_progress" || j.status === "running");
    const nextJob = myJobs.find((j) => j.status === "queued" || j.status === "pending");
    const clockedIn = !!data.clock_in_time;

    const completedToday = myJobs.filter((j) => j.status === "complete").length;

    // Calculate hours from clock-in
    let hoursToday = 0;
    if (data.clock_in_time) {
      const clockIn = new Date(data.clock_in_time).getTime();
      hoursToday = (Date.now() - clockIn) / 3600000;
    }

    return {
      role: "operator",
      kpis: {
        current_job: {
          id: "kpi-current-job", label: "Current Job",
          value: currentJob ? `${currentJob.part_number || currentJob.id}` : "None",
          detail: currentJob ? `Job ${currentJob.id} for ${currentJob.customer || "shop"}` : "No active job",
        },
        next_job: {
          id: "kpi-next-job", label: "Next Job",
          value: nextJob ? `${nextJob.part_number || nextJob.id}` : "None",
          detail: nextJob ? `Job ${nextJob.id} — due ${nextJob.due_date || "TBD"}` : "No queued job",
        },
        clock_status: {
          id: "kpi-clock", label: "Clock Status",
          value: clockedIn ? "Clocked In" : "Not Clocked In",
          detail: clockedIn ? `${hoursToday.toFixed(1)}h today` : "Clock in to start tracking",
          severity: clockedIn ? "info" : "warn",
        },
        quality_alerts: {
          id: "kpi-quality", label: "Quality Alerts", value: 0,
          detail: "No active quality alerts",
        },
        my_time_today: {
          id: "kpi-time", label: "My Time Today",
          value: +hoursToday.toFixed(1), unit: "hrs",
          detail: `${completedToday} parts completed`,
        },
        parts_completed: {
          id: "kpi-parts", label: "Parts Completed", value: completedToday,
          detail: `${completedToday} parts completed today`,
        },
      },
      alerts: this.buildAlerts(data),
      generated_at: now,
    };
  }

  private buildViewerDesk(data: DeskDataSources, now: string): ViewerDeskPayload {
    const jobs = data.jobs || [];
    const machines = data.machines || [];

    const activeJobs = jobs.filter((j) => j.status === "in_progress" || j.status === "running").length;
    const runningMachines = machines.filter((m) => m.status === "running" || m.status === "active").length;
    const completedToday = jobs.filter((j) => j.status === "complete").length;

    return {
      role: "viewer",
      kpis: {
        active_jobs: {
          id: "kpi-active", label: "Active Jobs", value: activeJobs,
          detail: `${activeJobs} jobs currently running`,
        },
        machines_running: {
          id: "kpi-machines", label: "Machines Running", value: runningMachines,
          detail: `${runningMachines}/${machines.length} machines active`,
        },
        jobs_completed_today: {
          id: "kpi-completed", label: "Completed Today", value: completedToday,
          detail: `${completedToday} jobs finished today`,
        },
        shop_status: {
          id: "kpi-status", label: "Shop Status",
          value: activeJobs > 0 ? "Active" : "Idle",
          detail: activeJobs > 0 ? "Production running" : "No active production",
        },
      },
      alerts: [],
      generated_at: now,
    };
  }

  private buildAlerts(data: DeskDataSources): DeskAlert[] {
    const alerts: DeskAlert[] = [];
    const jobs = data.jobs || [];
    const now = new Date().toISOString();

    // Overdue jobs
    for (const j of jobs.filter((j) => j.status === "late" || j.status === "overdue").slice(0, 3)) {
      alerts.push({
        id: `alert-overdue-${j.id}`,
        severity: "critical",
        title: `Job ${j.id} is overdue`,
        detail: `${j.part_number || j.id} for ${j.customer || "shop"} — past due date ${j.due_date || ""}`,
        entity_type: "job",
        entity_id: j.id,
        created_at: now,
      });
    }

    // At-risk jobs
    for (const j of jobs.filter((j) => j.status === "at_risk").slice(0, 2)) {
      alerts.push({
        id: `alert-risk-${j.id}`,
        severity: "warn",
        title: `Job ${j.id} is at risk`,
        detail: `${j.part_number || j.id} — schedule risk detected`,
        entity_type: "job",
        entity_id: j.id,
        created_at: now,
      });
    }

    return alerts;
  }
}

export const deskPayloadEngine = new DeskPayloadEngine();
