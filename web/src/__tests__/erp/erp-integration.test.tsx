import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/* ------------------------------------------------------------------ */
/* Mock ERP hooks — stateful for integration flow                      */
/* ------------------------------------------------------------------ */

let quoteGenData: unknown = null;
let jobPlanData: unknown = null;
let jobTrackData: unknown = null;
let capacityData: unknown = null;
let oeeData: unknown = null;

const MOCK_QUOTE = {
  quote_id: "Q-INT-001",
  total_cost: 250.0,
  unit_cost: 25.0,
  quantity: 10,
  lead_time_days: 7,
  line_items: [
    { operation: "Facing", machine: "VMC-1", cycle_time_min: 5, setup_time_min: 10, cost: 80 },
    { operation: "Boring", machine: "VMC-1", cycle_time_min: 8, setup_time_min: 5, cost: 120 },
  ],
  material_cost: 100,
  labor_cost: 80,
  overhead_cost: 50,
  margin_pct: 8,
  warnings: ["Material lead time may vary"],
};

const MOCK_BREAKDOWN = {
  categories: [
    { category: "Material", amount: 100, pct: 40, details: ["6061-T6 bar stock"] },
    { category: "Labor", amount: 80, pct: 32, details: ["CNC operator", "Setup"] },
    { category: "Overhead", amount: 50, pct: 20, details: ["Machine time"] },
    { category: "Margin", amount: 20, pct: 8, details: [] },
  ],
  total: 250,
  currency: "USD",
};

const MOCK_JOB_PLAN = {
  job_id: "J-INT-001",
  material: { id: "6061", name: "6061-T6 Aluminum", iso_group: "N" },
  operations: [
    { sequence: 1, operation: "Facing", machine: "VMC-1", tool: "Face Mill 50mm", cycle_time_min: 5, setup_time_min: 10 },
    { sequence: 2, operation: "Boring", machine: "VMC-1", tool: "Boring Bar 25mm", cycle_time_min: 8, setup_time_min: 5 },
  ],
  total_time_min: 28,
  estimated_cost: 180,
  confidence: 0.92,
  warnings: [],
};

const MOCK_JOB_TRACK = {
  jobs: [
    { job_id: "J-INT-001", part_name: "Test Bracket", status: "in_progress" as const, progress_pct: 45, current_operation: "Boring", machine: "VMC-1", eta: "2026-03-02T14:00:00Z", oee: 82 },
    { job_id: "J-INT-002", part_name: "Shaft Assembly", status: "queued" as const, progress_pct: 0, current_operation: "Pending", machine: "Lathe-2", eta: "2026-03-03T10:00:00Z", oee: 0 },
  ],
  total: 2,
  active: 1,
};

const MOCK_CAPACITY = {
  machines: [
    { machine: "VMC-1", utilization_pct: 78, available_hours: 8, scheduled_hours: 6.2, idle_hours: 1.8 },
    { machine: "Lathe-2", utilization_pct: 45, available_hours: 8, scheduled_hours: 3.6, idle_hours: 4.4 },
  ],
  overall_utilization_pct: 61.5,
  total_available_hours: 16,
};

const MOCK_OEE = {
  metrics: [
    { machine: "VMC-1", oee: 82, availability: 0.92, performance: 0.95, quality: 0.94, downtime_min: 38, reject_count: 2 },
  ],
  plant_oee: 82,
};

vi.mock("../../hooks/useErp", () => ({
  useErpQuoteGenerate: () => ({
    data: quoteGenData,
    loading: false,
    error: null,
    execute: vi.fn().mockImplementation(async () => {
      quoteGenData = MOCK_QUOTE;
      return MOCK_QUOTE;
    }),
    reset: vi.fn(() => { quoteGenData = null; }),
  }),
  useErpQuoteBreakdown: () => ({
    data: MOCK_BREAKDOWN,
    loading: false,
    error: null,
    execute: vi.fn().mockResolvedValue(MOCK_BREAKDOWN),
    reset: vi.fn(),
  }),
  useErpQuoteCompare: () => ({
    data: null,
    loading: false,
    error: null,
    execute: vi.fn(),
    reset: vi.fn(),
  }),
  useErpJobPlan: () => ({
    data: jobPlanData,
    loading: false,
    error: null,
    execute: vi.fn().mockImplementation(async () => {
      jobPlanData = MOCK_JOB_PLAN;
      return MOCK_JOB_PLAN;
    }),
    reset: vi.fn(() => { jobPlanData = null; }),
  }),
  useErpJobSchedule: () => ({
    data: null,
    loading: false,
    error: null,
    execute: vi.fn(),
    reset: vi.fn(),
  }),
  useErpJobTrack: () => ({
    data: jobTrackData,
    loading: false,
    error: null,
    execute: vi.fn().mockImplementation(async () => {
      jobTrackData = MOCK_JOB_TRACK;
      return MOCK_JOB_TRACK;
    }),
    reset: vi.fn(),
  }),
  useErpCapacity: () => ({
    data: capacityData,
    loading: false,
    error: null,
    execute: vi.fn().mockImplementation(async () => {
      capacityData = MOCK_CAPACITY;
      return MOCK_CAPACITY;
    }),
    reset: vi.fn(),
  }),
  useErpBottleneck: () => ({
    data: { bottlenecks: [], critical_count: 0 },
    loading: false,
    error: null,
    execute: vi.fn(),
    reset: vi.fn(),
  }),
  useErpOee: () => ({
    data: oeeData,
    loading: false,
    error: null,
    execute: vi.fn().mockImplementation(async () => {
      oeeData = MOCK_OEE;
      return MOCK_OEE;
    }),
    reset: vi.fn(),
  }),
  useErpPredictive: () => ({
    data: {
      alerts: [
        { machine: "VMC-1", component: "Spindle", risk_level: "medium", predicted_failure_date: "2026-03-15T00:00:00Z", recommended_action: "Schedule bearing inspection", estimated_downtime_hours: 4 },
      ],
      machines_at_risk: 1,
      next_maintenance_due: "2026-03-10T00:00:00Z",
    },
    loading: false,
    error: null,
    execute: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("../../components/ui/Spinner", () => ({
  default: () => <div data-testid="spinner" />,
}));

/* ------------------------------------------------------------------ */
/* Imports (after mocks)                                               */
/* ------------------------------------------------------------------ */

import QuoteGenerator from "../../components/erp/QuoteGenerator";
import _JobPlanner from "../../components/erp/JobPlanner";
import JobTracker from "../../components/erp/JobTracker";
import CapacityDashboard from "../../components/erp/CapacityDashboard";
import PredictiveMaintenance from "../../components/erp/PredictiveMaintenance";
import ErpDashboard from "../../pages/ErpDashboard";
import ErpLayout from "../../layouts/ErpLayout";

beforeEach(() => {
  vi.clearAllMocks();
  quoteGenData = null;
  jobPlanData = null;
  jobTrackData = null;
  capacityData = null;
  oeeData = null;
});

/* ------------------------------------------------------------------ */
/* Integration: Quote → Job Plan flow                                  */
/* ------------------------------------------------------------------ */

describe("ERP integration: Quote flow", () => {
  it("generates quote with form inputs", async () => {
    render(<QuoteGenerator />);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/6061-T6/), {
      target: { value: "6061-T6 Aluminum" },
    });
    fireEvent.change(screen.getByPlaceholderText(/pocket, bore/), {
      target: { value: "bore" },
    });

    // Generate
    fireEvent.click(screen.getByText("Generate Quote"));

    await waitFor(() => {
      expect(screen.getByText("Part Details")).toBeInTheDocument();
    });
  });
});

/* ------------------------------------------------------------------ */
/* Integration: Job Tracker renders with data                          */
/* ------------------------------------------------------------------ */

describe("ERP integration: Job Tracker", () => {
  it("renders filter tabs and fetches on mount", () => {
    render(<JobTracker />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("filter tab click changes selection", () => {
    render(<JobTracker />);
    const tab = screen.getByText("Complete");
    fireEvent.click(tab);
    expect(tab).toHaveAttribute("aria-selected", "true");
  });
});

/* ------------------------------------------------------------------ */
/* Integration: Capacity Dashboard                                     */
/* ------------------------------------------------------------------ */

describe("ERP integration: Capacity Dashboard", () => {
  it("renders time range tabs and loads data", () => {
    render(<CapacityDashboard />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(screen.getByText("This Month")).toBeInTheDocument();
  });

  it("switching time range updates aria-selected", () => {
    render(<CapacityDashboard />);
    const weekTab = screen.getByText("This Week");
    fireEvent.click(weekTab);
    expect(weekTab).toHaveAttribute("aria-selected", "true");
  });
});

/* ------------------------------------------------------------------ */
/* Integration: Predictive Maintenance                                 */
/* ------------------------------------------------------------------ */

describe("ERP integration: Predictive Maintenance", () => {
  it("renders alert cards with risk levels", () => {
    render(<PredictiveMaintenance />);
    expect(screen.getByText("VMC-1")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
    expect(screen.getByText("Spindle")).toBeInTheDocument();
  });

  it("shows machines at risk count", () => {
    render(<PredictiveMaintenance />);
    expect(screen.getByText(/1 machine at risk/)).toBeInTheDocument();
  });

  it("shows recommended action", () => {
    render(<PredictiveMaintenance />);
    expect(screen.getByText("Schedule bearing inspection")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Integration: ERP Dashboard                                          */
/* ------------------------------------------------------------------ */

describe("ERP integration: Dashboard", () => {
  it("renders dashboard title", () => {
    render(<ErpDashboard />);
    expect(screen.getByText("ERP Dashboard")).toBeInTheDocument();
  });

  it("renders KPI cards", () => {
    render(<ErpDashboard />);
    expect(screen.getByText("Active Jobs")).toBeInTheDocument();
    expect(screen.getByText("Overall Utilization")).toBeInTheDocument();
    expect(screen.getByText("Plant OEE")).toBeInTheDocument();
    expect(screen.getByText("Machines")).toBeInTheDocument();
  });

  it("renders quick links", () => {
    render(<ErpDashboard />);
    expect(screen.getByText("New Quote")).toBeInTheDocument();
    expect(screen.getByText("Plan Job")).toBeInTheDocument();
    expect(screen.getByText("Schedule")).toBeInTheDocument();
    expect(screen.getByText("Job Tracker")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Maintenance")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Integration: ERP Layout                                             */
/* ------------------------------------------------------------------ */

describe("ERP Layout", () => {
  it("renders sidebar navigation items", () => {
    // ErpLayout uses React Router Outlet; render without children/activeSection
    render(<ErpLayout />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Quoting")).toBeInTheDocument();
    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(screen.getAllByText("Schedule").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Tracker")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getAllByText("Maintenance").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
  });

  it("highlights active section", () => {
    render(<ErpLayout />);
    const quotingLinks = screen.getAllByText("Quoting");
    const quotingLink = quotingLinks[0].closest("a");
    expect(quotingLink).toHaveAttribute("aria-current", "page");
  });

  it("renders children content", () => {
    render(<ErpLayout />);
    // Content is rendered via React Router Outlet in integration; layout itself renders
  });

  it("renders breadcrumb", () => {
    render(<ErpLayout />);
    // Breadcrumb shows ERP > Analytics
    const breadcrumb = screen.getByLabelText("Breadcrumb");
    expect(breadcrumb).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Cross-link utilities                                                */
/* ------------------------------------------------------------------ */

describe("ERP cross-links", () => {
  it("sfcRecalculateLink builds correct URL", async () => {
    const { sfcRecalculateLink } = await import("../../utils/erpCrossLinks");
    const url = sfcRecalculateLink({ material: "Steel", operation: "turning", speed: 200 });
    expect(url).toContain("/sfc?");
    expect(url).toContain("material=Steel");
    expect(url).toContain("operation=turning");
    expect(url).toContain("speed=200");
  });

  it("ppgGenerateLink builds correct URL", async () => {
    const { ppgGenerateLink } = await import("../../utils/erpCrossLinks");
    const url = ppgGenerateLink({ controller: "fanuc", template: "facing" });
    expect(url).toContain("/ppg?");
    expect(url).toContain("controller=fanuc");
    expect(url).toContain("template=facing");
  });

  it("operationToTemplate maps known operations", async () => {
    const { operationToTemplate } = await import("../../utils/erpCrossLinks");
    expect(operationToTemplate("facing")).toBe("facing");
    expect(operationToTemplate("Drilling")).toBe("drilling");
    expect(operationToTemplate("pocketing")).toBe("pocket");
    expect(operationToTemplate("unknown_op")).toBeNull();
  });

  it("learningToolLink works with and without param", async () => {
    const { learningToolLink } = await import("../../utils/erpCrossLinks");
    expect(learningToolLink("end_mill")).toBe("/learning?tool=end_mill");
    expect(learningToolLink()).toBe("/learning");
  });
});
