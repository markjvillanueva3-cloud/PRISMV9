import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/* ------------------------------------------------------------------ */
/* Mock ERP hooks                                                      */
/* ------------------------------------------------------------------ */

const mockQuoteGenExecute = vi.fn();
const mockQuoteBreakExecute = vi.fn();
const mockQuoteCompareExecute = vi.fn();
const mockJobPlanExecute = vi.fn();
const mockJobTrackExecute = vi.fn();
const mockCapacityExecute = vi.fn();
const mockBottleneckExecute = vi.fn();
const mockOeeExecute = vi.fn();
const mockPredictiveExecute = vi.fn();

const hookState = (overrides = {}) => ({
  data: null,
  loading: false,
  error: null,
  execute: vi.fn(),
  reset: vi.fn(),
  ...overrides,
});

vi.mock("../../hooks/useErp", () => ({
  useErpQuoteGenerate: () => hookState({ execute: mockQuoteGenExecute }),
  useErpQuoteBreakdown: () => hookState({ execute: mockQuoteBreakExecute }),
  useErpQuoteCompare: () => hookState({ execute: mockQuoteCompareExecute }),
  useErpJobPlan: () => hookState({ execute: mockJobPlanExecute }),
  useErpJobSchedule: () => hookState(),
  useErpJobTrack: () => hookState({ execute: mockJobTrackExecute }),
  useErpCapacity: () => hookState({ execute: mockCapacityExecute }),
  useErpBottleneck: () => hookState({ execute: mockBottleneckExecute }),
  useErpOee: () => hookState({ execute: mockOeeExecute }),
  useErpPredictive: () => hookState({ execute: mockPredictiveExecute }),
}));

/* ------------------------------------------------------------------ */
/* Mock Spinner                                                        */
/* ------------------------------------------------------------------ */

vi.mock("../../components/ui/Spinner", () => ({
  default: () => <div data-testid="spinner" />,
}));

/* ------------------------------------------------------------------ */
/* Imports (after mocks)                                               */
/* ------------------------------------------------------------------ */

import QuoteGenerator from "../../components/erp/QuoteGenerator";
import JobPlanner from "../../components/erp/JobPlanner";
import JobTracker from "../../components/erp/JobTracker";
import CapacityDashboard from "../../components/erp/CapacityDashboard";
import PredictiveMaintenance from "../../components/erp/PredictiveMaintenance";
import Inventory from "../../components/erp/Inventory";

beforeEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */
/* QuoteGenerator                                                      */
/* ------------------------------------------------------------------ */

describe("QuoteGenerator", () => {
  it("renders wizard step indicator", () => {
    render(<QuoteGenerator />);
    expect(screen.getByText("Part Details")).toBeInTheDocument();
    expect(screen.getByText("Quote Review")).toBeInTheDocument();
    expect(screen.getByText("Compare")).toBeInTheDocument();
  });

  it("renders material and feature fields", () => {
    render(<QuoteGenerator />);
    expect(screen.getByPlaceholderText(/6061-T6/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/pocket, bore/)).toBeInTheDocument();
  });

  it("generate button is disabled when fields empty", () => {
    render(<QuoteGenerator />);
    const btn = screen.getByText("Generate Quote");
    expect(btn).toBeDisabled();
  });

  it("generate button enables when material and feature filled", () => {
    render(<QuoteGenerator />);
    fireEvent.change(screen.getByPlaceholderText(/6061-T6/), {
      target: { value: "Steel" },
    });
    fireEvent.change(screen.getByPlaceholderText(/pocket, bore/), {
      target: { value: "bore" },
    });
    expect(screen.getByText("Generate Quote")).not.toBeDisabled();
  });

  it("calls quoteGenerate and quoteBreakdown on generate", async () => {
    mockQuoteGenExecute.mockResolvedValue({
      quote_id: "Q1",
      total_cost: 100,
      unit_cost: 10,
      quantity: 10,
      lead_time_days: 5,
      line_items: [],
      material_cost: 40,
      labor_cost: 30,
      overhead_cost: 20,
      margin_pct: 10,
      warnings: [],
    });
    mockQuoteBreakExecute.mockResolvedValue({
      categories: [],
      total: 100,
      currency: "USD",
    });

    render(<QuoteGenerator />);
    fireEvent.change(screen.getByPlaceholderText(/6061-T6/), {
      target: { value: "Steel" },
    });
    fireEvent.change(screen.getByPlaceholderText(/pocket, bore/), {
      target: { value: "bore" },
    });
    fireEvent.click(screen.getByText("Generate Quote"));

    await waitFor(() => {
      expect(mockQuoteGenExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          material: "Steel",
          feature: "bore",
          quantity: 1,
        }),
      );
      expect(mockQuoteBreakExecute).toHaveBeenCalled();
    });
  });

  it("renders dimension inputs", () => {
    render(<QuoteGenerator />);
    expect(screen.getByText("length")).toBeInTheDocument();
    expect(screen.getByText("width")).toBeInTheDocument();
    expect(screen.getByText("height")).toBeInTheDocument();
  });

  it("remove dimension button works", () => {
    render(<QuoteGenerator />);
    const removeBtns = screen.getAllByLabelText(/Remove length/);
    expect(removeBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(removeBtns[0]);
    expect(screen.queryByLabelText("Remove length")).not.toBeInTheDocument();
  });

  it("quantity defaults to 1", () => {
    render(<QuoteGenerator />);
    const qtyInput = screen.getByDisplayValue("1");
    expect(qtyInput).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* JobPlanner                                                          */
/* ------------------------------------------------------------------ */

describe("JobPlanner", () => {
  it("renders planning form fields", () => {
    render(<JobPlanner />);
    expect(screen.getByPlaceholderText(/4140 Steel/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/shaft, flange/)).toBeInTheDocument();
    expect(screen.getByText("Plan Job")).toBeInTheDocument();
  });

  it("plan button is disabled when fields empty", () => {
    render(<JobPlanner />);
    expect(screen.getByText("Plan Job")).toBeDisabled();
  });

  it("plan button enables with material and feature", () => {
    render(<JobPlanner />);
    fireEvent.change(screen.getByPlaceholderText(/4140 Steel/), {
      target: { value: "Aluminum" },
    });
    fireEvent.change(screen.getByPlaceholderText(/shaft, flange/), {
      target: { value: "shaft" },
    });
    expect(screen.getByText("Plan Job")).not.toBeDisabled();
  });

  it("has priority selector with all options", () => {
    render(<JobPlanner />);
    const select = screen.getByDisplayValue("Normal");
    expect(select).toBeInTheDocument();
  });

  it("has deadline date picker", () => {
    render(<JobPlanner />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(1);
  });

  it("calls jobPlan execute on submit", async () => {
    mockJobPlanExecute.mockResolvedValue({
      job_id: "J1",
      material: { id: "al", name: "Aluminum", iso_group: "N" },
      operations: [],
      total_time_min: 30,
      estimated_cost: 50,
      confidence: 0.9,
      warnings: [],
    });

    render(<JobPlanner />);
    fireEvent.change(screen.getByPlaceholderText(/4140 Steel/), {
      target: { value: "Aluminum" },
    });
    fireEvent.change(screen.getByPlaceholderText(/shaft, flange/), {
      target: { value: "shaft" },
    });
    fireEvent.click(screen.getByText("Plan Job"));

    await waitFor(() => {
      expect(mockJobPlanExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          material: "Aluminum",
          feature: "shaft",
          priority: "normal",
        }),
      );
    });
  });
});

/* ------------------------------------------------------------------ */
/* JobTracker                                                          */
/* ------------------------------------------------------------------ */

describe("JobTracker", () => {
  it("renders filter tabs", () => {
    render(<JobTracker />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Queued")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.getByText("On Hold")).toBeInTheDocument();
  });

  it("calls jobTrack on mount", () => {
    render(<JobTracker />);
    expect(mockJobTrackExecute).toHaveBeenCalledWith({});
  });

  it("filter tab changes call execute with status", () => {
    render(<JobTracker />);
    fireEvent.click(screen.getByText("In Progress"));
    expect(mockJobTrackExecute).toHaveBeenCalledWith({
      status_filter: "in_progress",
    });
  });
});

/* ------------------------------------------------------------------ */
/* CapacityDashboard                                                   */
/* ------------------------------------------------------------------ */

describe("CapacityDashboard", () => {
  it("renders time range selectors", () => {
    render(<CapacityDashboard />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(screen.getByText("This Month")).toBeInTheDocument();
  });

  it("fetches all analytics on mount", () => {
    render(<CapacityDashboard />);
    expect(mockCapacityExecute).toHaveBeenCalledWith({ time_range: "day" });
    expect(mockBottleneckExecute).toHaveBeenCalledWith({ time_range: "day" });
    expect(mockOeeExecute).toHaveBeenCalledWith({ time_range: "day" });
  });

  it("changing time range re-fetches", () => {
    render(<CapacityDashboard />);
    fireEvent.click(screen.getByText("This Week"));
    expect(mockCapacityExecute).toHaveBeenCalledWith({ time_range: "week" });
  });
});

/* ------------------------------------------------------------------ */
/* PredictiveMaintenance                                               */
/* ------------------------------------------------------------------ */

describe("PredictiveMaintenance", () => {
  it("fetches predictive data on mount", () => {
    render(<PredictiveMaintenance />);
    expect(mockPredictiveExecute).toHaveBeenCalledWith({});
  });
});

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

describe("Inventory", () => {
  const tools = [
    { id: "t1", name: "End Mill 10mm", quantity: 5, location: "A1", condition: "good" as const, lastUsed: "2026-02-28" },
    { id: "t2", name: "Drill Bit 8mm", quantity: 2, location: "B2", condition: "worn" as const, lastUsed: "2026-02-27" },
  ];

  const materials = [
    { id: "m1", name: "6061-T6 Aluminum", stock: 50, unit: "kg", reorderPoint: 20, supplier: "MetalCorp" },
    { id: "m2", name: "4140 Steel", stock: 5, unit: "kg", reorderPoint: 10, supplier: "SteelCo" },
  ];

  it("renders tool and material tabs", () => {
    render(<Inventory tools={tools} materials={materials} />);
    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(screen.getByText("Materials")).toBeInTheDocument();
  });

  it("shows tools by default", () => {
    render(<Inventory tools={tools} materials={materials} />);
    expect(screen.getByText("End Mill 10mm")).toBeInTheDocument();
    expect(screen.getByText("Drill Bit 8mm")).toBeInTheDocument();
  });

  it("switches to materials tab", () => {
    render(<Inventory tools={tools} materials={materials} />);
    fireEvent.click(screen.getByText("Materials"));
    expect(screen.getByText("6061-T6 Aluminum")).toBeInTheDocument();
    expect(screen.getByText("4140 Steel")).toBeInTheDocument();
  });

  it("highlights low stock materials", () => {
    render(<Inventory tools={tools} materials={materials} />);
    fireEvent.click(screen.getByText("Materials"));
    // 4140 Steel has stock=5, reorderPoint=10 → low stock
    expect(screen.getByText("Low Stock")).toBeInTheDocument();
  });

  it("search filter works for tools", () => {
    render(<Inventory tools={tools} materials={materials} />);
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "drill" },
    });
    expect(screen.getByText("Drill Bit 8mm")).toBeInTheDocument();
    expect(screen.queryByText("End Mill 10mm")).not.toBeInTheDocument();
  });

  it("condition badges render correctly", () => {
    render(<Inventory tools={tools} materials={materials} />);
    expect(screen.getByText("good")).toBeInTheDocument();
    expect(screen.getByText("worn")).toBeInTheDocument();
  });

  it("shows empty state when no items", () => {
    render(<Inventory tools={[]} materials={[]} />);
    expect(screen.getByText("No tools in inventory")).toBeInTheDocument();
  });

  it("sortable column headers exist", () => {
    render(<Inventory tools={tools} materials={materials} />);
    expect(screen.getByText("Tool")).toBeInTheDocument();
    expect(screen.getByText("Qty")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Condition")).toBeInTheDocument();
  });
});
