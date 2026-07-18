import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LearningProvider, useLearningContext } from "../../contexts/LearningContext";
import LearningLayout from "../../layouts/LearningLayout";
import { RadarChart, BarChart, ProgressRing, Sparkline } from "../../components/charts";
import { buildSfcUrl, buildPpgUrl, buildKnowledgeUrl, buildAssessmentUrl } from "../../utils/crossLinks";

// Mock learning API
vi.mock("../../api/learning", () => ({
  learningApi: {
    assess: vi.fn(),
    plan: vi.fn(),
    progress: vi.fn(),
    recommend: vi.fn(),
    knowledgeSearch: vi.fn(),
    tribalSearch: vi.fn(),
    selectMaterial: vi.fn(),
    selectTool: vi.fn(),
    selectMachine: vi.fn(),
    twin: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Cross-links
// ---------------------------------------------------------------------------
describe("crossLinks", () => {
  it("buildSfcUrl encodes material", () => {
    expect(buildSfcUrl("4140 Steel")).toBe("/sfc?material=4140%20Steel");
  });

  it("buildPpgUrl encodes operation", () => {
    expect(buildPpgUrl("face_milling")).toBe("/ppg?operation=face_milling");
  });

  it("buildKnowledgeUrl with domain", () => {
    const url = buildKnowledgeUrl("chatter", "cam");
    expect(url).toContain("q=chatter");
    expect(url).toContain("domain=cam");
  });

  it("buildAssessmentUrl with domains", () => {
    expect(buildAssessmentUrl(["cad", "cam"])).toBe("/learning/assessment?domains=cad,cam");
  });

  it("buildAssessmentUrl without domains", () => {
    expect(buildAssessmentUrl()).toBe("/learning/assessment");
  });
});

// ---------------------------------------------------------------------------
// LearningContext
// ---------------------------------------------------------------------------
describe("LearningContext", () => {
  function ContextTester() {
    const ctx = useLearningContext();
    return (
      <div>
        <span data-testid="skills">{ctx.currentSkills.length}</span>
        <span data-testid="plan">{ctx.activePlanId ?? "none"}</span>
        <span data-testid="history">{ctx.searchHistory.length}</span>
        <button onClick={() => ctx.setActivePlan("plan-123")}>Set Plan</button>
        <button onClick={() => ctx.addSearchQuery("chatter")}>Add Search</button>
        <button onClick={() => ctx.reset()}>Reset</button>
      </div>
    );
  }

  it("provides default state", () => {
    render(
      <LearningProvider><ContextTester /></LearningProvider>,
    );
    expect(screen.getByTestId("skills").textContent).toBe("0");
    expect(screen.getByTestId("plan").textContent).toBe("none");
  });

  it("updates plan", () => {
    render(
      <LearningProvider><ContextTester /></LearningProvider>,
    );
    fireEvent.click(screen.getByText("Set Plan"));
    expect(screen.getByTestId("plan").textContent).toBe("plan-123");
  });

  it("adds search history", () => {
    render(
      <LearningProvider><ContextTester /></LearningProvider>,
    );
    fireEvent.click(screen.getByText("Add Search"));
    expect(screen.getByTestId("history").textContent).toBe("1");
  });

  it("resets state", () => {
    render(
      <LearningProvider><ContextTester /></LearningProvider>,
    );
    fireEvent.click(screen.getByText("Set Plan"));
    fireEvent.click(screen.getByText("Reset"));
    expect(screen.getByTestId("plan").textContent).toBe("none");
  });

  it("throws outside provider", () => {
    expect(() => {
      render(<ContextTester />);
    }).toThrow("useLearningContext must be used inside LearningProvider");
  });
});

// ---------------------------------------------------------------------------
// Chart components
// ---------------------------------------------------------------------------
describe("RadarChart", () => {
  it("renders SVG with data points", () => {
    const { container } = render(
      <RadarChart data={[
        { label: "CAD", value: 80 },
        { label: "CAM", value: 60 },
        { label: "Shop", value: 40 },
      ]} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    const polygons = container.querySelectorAll("polygon");
    // Grid levels (4) + data polygon (1) = 5
    expect(polygons.length).toBe(5);
  });
});

describe("BarChart", () => {
  it("renders bars for each data point", () => {
    const { container } = render(
      <BarChart data={[
        { label: "A", value: 50 },
        { label: "B", value: 80 },
      ]} />,
    );
    const rects = container.querySelectorAll("rect");
    expect(rects.length).toBe(2);
  });
});

describe("ProgressRing", () => {
  it("renders with label", () => {
    render(<ProgressRing value={75} label="Test" />);
    expect(screen.getByText("75%")).toBeTruthy();
    expect(screen.getByText("Test")).toBeTruthy();
  });

  it("handles max override", () => {
    render(<ProgressRing value={50} max={200} />);
    expect(screen.getByText("25%")).toBeTruthy();
  });
});

describe("Sparkline", () => {
  it("renders polyline for data", () => {
    const { container } = render(<Sparkline data={[10, 20, 30, 40]} />);
    expect(container.querySelector("polyline")).toBeTruthy();
  });

  it("returns null for insufficient data", () => {
    const { container } = render(<Sparkline data={[10]} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders fill when enabled", () => {
    const { container } = render(<Sparkline data={[10, 20, 30]} fill />);
    expect(container.querySelector("polygon")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// LearningLayout navigation
// ---------------------------------------------------------------------------
describe("LearningLayout", () => {
  it("renders navigation links", () => {
    render(
      <MemoryRouter initialEntries={["/learning"]}>
        <LearningLayout />
      </MemoryRouter>,
    );
    // Each label appears twice: desktop sidebar + mobile bottom nav
    expect(screen.getAllByText("Dashboard").length).toBe(2);
    expect(screen.getAllByText("Assessment").length).toBe(2);
    expect(screen.getAllByText("Learning Path").length).toBe(2);
    expect(screen.getAllByText("Progress").length).toBe(2);
    expect(screen.getAllByText("Knowledge").length).toBe(2);
    expect(screen.getAllByText("Material").length).toBe(2);
    expect(screen.getAllByText("Tool").length).toBe(2);
    expect(screen.getAllByText("Machine").length).toBe(2);
    expect(screen.getAllByText("Digital Twin").length).toBe(2);
  });
});
