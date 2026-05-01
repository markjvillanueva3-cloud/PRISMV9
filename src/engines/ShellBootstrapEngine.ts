/**
 * ShellBootstrapEngine — Operating-System Shell Backend
 * ======================================================
 *
 * Provides shell navigation, desk counts, role-filtered employee bootstraps,
 * and profile summaries for the PRISM operating-system shell.
 *
 * This engine backs the ShellBootstrapProvider and DeskProvider contracts
 * defined in web/src/features/operating-system/contracts.ts.
 *
 * @version 1.0.0 — Sprint C1
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeskCounts {
  inbox: number;
  approvals: number;
  atRisk: number;
  liveJobs: number;
}

export interface NavItem {
  id: string;
  label: string;
  to: string;
  description: string;
  countLabel?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export interface HomeModule {
  id: string;
  title: string;
  detail: string;
  to: string;
  countLabel?: string;
}

export interface AccessCard {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "slate" | "sky" | "emerald" | "amber" | "rose" | "violet";
}

export interface ShiftPriority {
  id: string;
  label: string;
  title: string;
  detail: string;
  to: string;
  badge?: string;
  tone: "slate" | "sky" | "emerald" | "amber" | "rose" | "violet";
}

export interface AttentionItem {
  id: string;
  label: string;
  title: string;
  detail: string;
  to: string;
  tone: "slate" | "sky" | "emerald" | "amber" | "rose" | "violet";
}

export interface HandoffNote {
  id: string;
  author: string;
  timestampLabel: string;
  detail: string;
  to?: string;
}

export interface RestrictedSurface {
  id: string;
  label: string;
  detail: string;
}

export interface HotJobRecord {
  jobId: string;
  partNumber: string;
  customer: string;
  dueDate: string;
  note: string;
  setBy: string;
  setAt: string;
}

export interface PinnedEntity {
  id: string;
  title: string;
  type: string;
  status: string;
  owner: string;
  detail: string;
  workspaceLabel: string;
  workspaceRoute: string;
  to: string;
  keywords: string[];
}

export interface ShellBootstrapResult {
  deskCounts: DeskCounts;
  pinnedEntities: PinnedEntity[];
  recentEntities: PinnedEntity[];
  shellNote: string;
}

export interface EmployeeProfileSummary {
  id: string;
  displayName: string;
  role: string;
  department: string;
  tagline: string;
}

export interface EmployeeShellBootstrapResult {
  profileId: string;
  employeeId: string;
  displayName: string;
  role: string;
  department: string;
  subtitle: string;
  homeModules: HomeModule[];
  navGroups: NavGroup[];
  accessCards: AccessCard[];
  shiftPriorities: ShiftPriority[];
  attentionItems: AttentionItem[];
  handoffNotes: HandoffNote[];
  restrictedSurfaces: RestrictedSurface[];
  hotJobs: HotJobRecord[];
  deskCounts: DeskCounts;
  pins: PinnedEntity[];
  recents: PinnedEntity[];
  policyNote: string;
}

// ─── Role Definitions ─────────────────────────────────────────────────────────

type RoleId = "machinist" | "programmer" | "lead" | "quality" | "manager" | "engineer";

interface RoleDefinition {
  id: RoleId;
  displayName: string;
  employeeId: string;
  department: string;
  tagline: string;
  subtitle: string;
}

const ROLE_DEFINITIONS: Record<RoleId, RoleDefinition> = {
  machinist: {
    id: "machinist",
    displayName: "Avery Stone",
    employeeId: "EMP-001",
    department: "Machining",
    tagline: "Touch-first floor view for cell-side operators",
    subtitle: "Touch-first floor view with only the work, checks, and learning a cell-side operator needs.",
  },
  programmer: {
    id: "programmer",
    displayName: "Jordan Vance",
    employeeId: "EMP-002",
    department: "Programming",
    tagline: "CAM strategy and program release focus",
    subtitle: "CAM strategy, toolpath verification, and program release workflow for CNC programmers.",
  },
  lead: {
    id: "lead",
    displayName: "Morgan Blake",
    employeeId: "EMP-003",
    department: "Machining",
    tagline: "Shift oversight with scheduling and priority control",
    subtitle: "Shift oversight with job priority, scheduling exceptions, and team coordination.",
  },
  quality: {
    id: "quality",
    displayName: "Casey Mercer",
    employeeId: "EMP-004",
    department: "Quality",
    tagline: "Inspection, SPC, and compliance tracking",
    subtitle: "Inspection planning, SPC monitoring, FAI tracking, and compliance management.",
  },
  manager: {
    id: "manager",
    displayName: "Riley Ashford",
    employeeId: "EMP-005",
    department: "Management",
    tagline: "Full visibility across jobs, finance, and capacity",
    subtitle: "Full shop visibility across jobs, quotes, finance, capacity, and strategic decisions.",
  },
  engineer: {
    id: "engineer",
    displayName: "Dakota Reeves",
    employeeId: "EMP-006",
    department: "Engineering",
    tagline: "DfM, process planning, and continuous improvement",
    subtitle: "DfM review, process planning, tooling optimization, and continuous improvement initiatives.",
  },
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ShellBootstrapEngine {
  /**
   * Get the shell bootstrap payload with desk counts, pinned/recent entities.
   * @param jobs - Active job records from ERP
   * @param approvalCount - Pending approval count
   */
  static getShellBootstrap(
    jobs: Array<{ id: string; status: string; customer?: string; part_number?: string; due_date?: string }> = [],
    approvalCount = 0,
  ): ShellBootstrapResult {
    const atRisk = jobs.filter((j) => j.status === "at_risk" || j.status === "late").length;
    const liveJobs = jobs.filter((j) => j.status === "in_progress" || j.status === "running").length;
    const inbox = jobs.filter((j) => j.status === "pending" || j.status === "new").length;

    const deskCounts: DeskCounts = {
      inbox: Math.max(inbox, 0),
      approvals: Math.max(approvalCount, 0),
      atRisk: Math.max(atRisk, 0),
      liveJobs: Math.max(liveJobs, 0),
    };

    const pinnedEntities = jobs.slice(0, 3).map((j) => ShellBootstrapEngine.jobToPinnedEntity(j));
    const recentEntities = jobs.slice(3, 6).map((j) => ShellBootstrapEngine.jobToPinnedEntity(j));

    return {
      deskCounts,
      pinnedEntities,
      recentEntities,
      shellNote: "Shell data served from PRISM backend. Pins, recents, and counts reflect live ERP state.",
    };
  }

  /**
   * List available employee role profiles.
   */
  static getEmployeeShellProfiles(): EmployeeProfileSummary[] {
    return Object.values(ROLE_DEFINITIONS).map((role) => ({
      id: role.id,
      displayName: role.displayName,
      role: role.id.charAt(0).toUpperCase() + role.id.slice(1),
      department: role.department,
      tagline: role.tagline,
    }));
  }

  /**
   * Get the full employee shell bootstrap for a given role profile.
   * @param profileId - Role profile ID (machinist, programmer, lead, quality, manager, engineer)
   * @param jobs - Active job records
   * @param hotJobs - Hot job records
   * @param approvalCount - Pending approval count
   */
  static getEmployeeShellBootstrap(
    profileId: string = "machinist",
    jobs: Array<{ id: string; status: string; customer?: string; part_number?: string; due_date?: string }> = [],
    hotJobs: HotJobRecord[] = [],
    approvalCount = 0,
  ): EmployeeShellBootstrapResult {
    const roleId = (profileId in ROLE_DEFINITIONS ? profileId : "machinist") as RoleId;
    const role = ROLE_DEFINITIONS[roleId];
    const bootstrap = ShellBootstrapEngine.getShellBootstrap(jobs, approvalCount);

    return {
      profileId: role.id,
      employeeId: role.employeeId,
      displayName: role.displayName,
      role: role.id.charAt(0).toUpperCase() + role.id.slice(1),
      department: role.department,
      subtitle: role.subtitle,
      homeModules: ShellBootstrapEngine.buildHomeModules(roleId, jobs),
      navGroups: ShellBootstrapEngine.buildNavGroups(roleId),
      accessCards: ShellBootstrapEngine.buildAccessCards(roleId, bootstrap.deskCounts),
      shiftPriorities: ShellBootstrapEngine.buildShiftPriorities(roleId, hotJobs, jobs),
      attentionItems: ShellBootstrapEngine.buildAttentionItems(roleId, jobs),
      handoffNotes: [],
      restrictedSurfaces: ShellBootstrapEngine.buildRestrictedSurfaces(roleId),
      hotJobs,
      deskCounts: bootstrap.deskCounts,
      pins: bootstrap.pinnedEntities,
      recents: bootstrap.recentEntities,
      policyNote: `Role-filtered view for ${role.department}. Some surfaces are restricted based on role permissions.`,
    };
  }

  // ─── Private Builders ─────────────────────────────────────────────────────

  private static jobToPinnedEntity(job: {
    id: string;
    status: string;
    customer?: string;
    part_number?: string;
  }): PinnedEntity {
    return {
      id: job.id,
      title: job.part_number || job.id,
      type: "Job",
      status: job.status,
      owner: job.customer || "Unknown",
      detail: `Job ${job.id} — ${job.status}`,
      workspaceLabel: "Jobs",
      workspaceRoute: "/jobs",
      to: `/jobs?focusId=${job.id}&focusType=job`,
      keywords: [job.id, job.part_number || "", job.customer || ""].filter(Boolean),
    };
  }

  private static buildHomeModules(
    roleId: RoleId,
    jobs: Array<{ id: string; status: string }>,
  ): HomeModule[] {
    const activeCount = jobs.filter((j) => j.status === "in_progress" || j.status === "running").length;
    const base: HomeModule[] = [
      {
        id: "my-jobs",
        title: "My active jobs",
        detail: "Current routed work with traveler posture and due-date focus.",
        to: "/jobs",
        countLabel: `${activeCount} active`,
      },
    ];

    const roleModules: Record<RoleId, HomeModule[]> = {
      machinist: [
        { id: "shop-clock", title: "Shop clock", detail: "Scan, check in, and move between timed tasks.", to: "/shop-clock", countLabel: "Ready now" },
        { id: "learning", title: "Recommended learning", detail: "Targeted lessons tied to current work.", to: "/learning", countLabel: "1 lesson" },
      ],
      programmer: [
        { id: "program-release", title: "Program release", detail: "Toolpath strategy, simulation, and release workflow.", to: "/program-release" },
        { id: "toolpath-advisor", title: "Toolpath advisor", detail: "CAM strategy ranking and optimization.", to: "/toolpath-advisor" },
      ],
      lead: [
        { id: "scheduling", title: "Scheduling", detail: "Shift scheduling with exception handling.", to: "/scheduling" },
        { id: "shop-clock", title: "Shop clock", detail: "Floor-wide clock and check-in overview.", to: "/shop-clock" },
      ],
      quality: [
        { id: "quality", title: "Quality management", detail: "SPC, FAI, and inspection queue.", to: "/quality" },
        { id: "reports", title: "Reports", detail: "Quality reports and compliance docs.", to: "/reports" },
      ],
      manager: [
        { id: "dashboard", title: "Dashboard", detail: "OEE, utilization, and shop KPIs.", to: "/dashboard" },
        { id: "quotes", title: "Quote builder", detail: "Active quotes and win/loss tracking.", to: "/quote-builder" },
        { id: "financial", title: "Financial analysis", detail: "Job profitability and cost tracking.", to: "/financial-analysis" },
      ],
      engineer: [
        { id: "calculator", title: "Speed & feed calculator", detail: "Physics-backed cutting parameters.", to: "/calculator" },
        { id: "what-if", title: "What-if analysis", detail: "Delta analysis across physics domains.", to: "/what-if" },
      ],
    };

    return [...base, ...(roleModules[roleId] || [])];
  }

  private static buildNavGroups(roleId: RoleId): NavGroup[] {
    const common: NavGroup = {
      id: "today",
      label: "Today",
      items: [
        { id: "today-jobs", label: "Jobs", to: "/jobs", description: "Active job dispatch view." },
      ],
    };

    const roleNav: Record<RoleId, NavGroup[]> = {
      machinist: [
        common,
        { id: "tools", label: "Tools", items: [
          { id: "shop-clock", label: "Shop Clock", to: "/shop-clock", description: "QR-driven clock and task switching." },
          { id: "learning", label: "Learning", to: "/learning", description: "Training and skill development." },
        ]},
      ],
      programmer: [
        common,
        { id: "programming", label: "Programming", items: [
          { id: "program-release", label: "Program Release", to: "/program-release", description: "Toolpath release workflow." },
          { id: "toolpath", label: "Toolpath Advisor", to: "/toolpath-advisor", description: "Strategy ranking." },
          { id: "calculator", label: "Calculator", to: "/calculator", description: "Speed & feed calculations." },
        ]},
      ],
      lead: [
        common,
        { id: "oversight", label: "Oversight", items: [
          { id: "scheduling", label: "Scheduling", to: "/scheduling", description: "Shift and machine scheduling." },
          { id: "shop-clock", label: "Shop Clock", to: "/shop-clock", description: "Floor-wide tracking." },
          { id: "safety", label: "Safety Monitor", to: "/safety-monitor", description: "Safety compliance dashboard." },
        ]},
      ],
      quality: [
        common,
        { id: "quality-tools", label: "Quality", items: [
          { id: "quality-mgmt", label: "Quality Management", to: "/quality", description: "SPC and inspection." },
          { id: "reports", label: "Reports", to: "/reports", description: "Quality reporting." },
        ]},
      ],
      manager: [
        common,
        { id: "business", label: "Business", items: [
          { id: "dashboard", label: "Dashboard", to: "/dashboard", description: "Shop KPIs and OEE." },
          { id: "quotes", label: "Quotes", to: "/quote-builder", description: "Quote management." },
          { id: "financial", label: "Financial", to: "/financial-analysis", description: "Profitability analysis." },
          { id: "customers", label: "Customers", to: "/customers", description: "Customer management." },
        ]},
      ],
      engineer: [
        common,
        { id: "engineering", label: "Engineering", items: [
          { id: "calculator", label: "Calculator", to: "/calculator", description: "Speed & feed physics." },
          { id: "what-if", label: "What-If", to: "/what-if", description: "Scenario analysis." },
          { id: "toolpath", label: "Toolpath Advisor", to: "/toolpath-advisor", description: "Strategy ranking." },
        ]},
      ],
    };

    return roleNav[roleId] || [common];
  }

  private static buildAccessCards(roleId: RoleId, counts: DeskCounts): AccessCard[] {
    return [
      { id: "ac-inbox", label: "Inbox", value: String(counts.inbox), detail: "Pending items requiring attention", tone: counts.inbox > 5 ? "amber" : "slate" },
      { id: "ac-approvals", label: "Approvals", value: String(counts.approvals), detail: "Items awaiting approval", tone: counts.approvals > 0 ? "sky" : "slate" },
      { id: "ac-risk", label: "At Risk", value: String(counts.atRisk), detail: "Jobs flagged for schedule risk", tone: counts.atRisk > 0 ? "rose" : "emerald" },
      { id: "ac-live", label: "Live Jobs", value: String(counts.liveJobs), detail: "Currently running jobs", tone: counts.liveJobs > 0 ? "emerald" : "slate" },
    ];
  }

  private static buildShiftPriorities(
    roleId: RoleId,
    hotJobs: HotJobRecord[],
    jobs: Array<{ id: string; status: string }>,
  ): ShiftPriority[] {
    const priorities: ShiftPriority[] = [];

    for (const hot of hotJobs.slice(0, 3)) {
      priorities.push({
        id: `sp-hot-${hot.jobId}`,
        label: "HOT",
        title: `${hot.partNumber} — ${hot.customer}`,
        detail: hot.note || `Priority job due ${hot.dueDate}`,
        to: `/jobs?focusId=${hot.jobId}&focusType=job`,
        badge: "Hot",
        tone: "rose",
      });
    }

    const atRisk = jobs.filter((j) => j.status === "at_risk" || j.status === "late").slice(0, 2);
    for (const j of atRisk) {
      priorities.push({
        id: `sp-risk-${j.id}`,
        label: "AT RISK",
        title: `Job ${j.id}`,
        detail: `Status: ${j.status} — requires immediate attention`,
        to: `/jobs?focusId=${j.id}&focusType=job`,
        tone: "amber",
      });
    }

    return priorities;
  }

  private static buildAttentionItems(
    roleId: RoleId,
    jobs: Array<{ id: string; status: string }>,
  ): AttentionItem[] {
    const items: AttentionItem[] = [];
    const blocked = jobs.filter((j) => j.status === "blocked");

    for (const j of blocked.slice(0, 3)) {
      items.push({
        id: `att-blocked-${j.id}`,
        label: "Blocked",
        title: `Job ${j.id} is blocked`,
        detail: "Resolve shortage or dependency to unblock this job.",
        to: `/jobs?focusId=${j.id}&focusType=job`,
        tone: "rose",
      });
    }

    return items;
  }

  private static buildRestrictedSurfaces(roleId: RoleId): RestrictedSurface[] {
    const restrictions: Record<RoleId, RestrictedSurface[]> = {
      machinist: [
        { id: "rs-finance", label: "Financial Analysis", detail: "Restricted to management and accounting roles." },
        { id: "rs-gl", label: "General Ledger", detail: "Restricted to management and accounting roles." },
        { id: "rs-customers", label: "Customer Management", detail: "Restricted to management and sales roles." },
      ],
      programmer: [
        { id: "rs-finance", label: "Financial Analysis", detail: "Restricted to management and accounting roles." },
        { id: "rs-gl", label: "General Ledger", detail: "Restricted to management and accounting roles." },
      ],
      lead: [
        { id: "rs-gl", label: "General Ledger", detail: "Restricted to management and accounting roles." },
      ],
      quality: [
        { id: "rs-finance", label: "Financial Analysis", detail: "Restricted to management and accounting roles." },
        { id: "rs-gl", label: "General Ledger", detail: "Restricted to management and accounting roles." },
      ],
      manager: [],
      engineer: [
        { id: "rs-gl", label: "General Ledger", detail: "Restricted to management and accounting roles." },
      ],
    };

    return restrictions[roleId] || [];
  }
}

export const shellBootstrapEngine = new ShellBootstrapEngine();
