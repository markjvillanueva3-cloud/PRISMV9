import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Assessment from "../../components/learning/Assessment";
import KnowledgeSearch from "../../components/learning/KnowledgeSearch";
import MaterialWizard from "../../components/learning/MaterialWizard";
import ToolWizard from "../../components/learning/ToolWizard";
import MachineWizard from "../../components/learning/MachineWizard";
import LearningDashboard from "../../pages/LearningDashboard";
import LearningPath from "../../components/learning/LearningPath";
import ProgressTracker from "../../components/learning/ProgressTracker";
import DigitalTwin from "../../components/learning/DigitalTwin";
import { LearningProvider } from "../../contexts/LearningContext";
// Types available for future use in more detailed integration tests

// Mock the learning API
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

function wrap(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <LearningProvider>{ui}</LearningProvider>
    </MemoryRouter>,
  );
}

// Mock data kept minimal — tests focus on rendering and interaction

describe("Assessment", () => {
  it("renders domain selection step", () => {
    wrap(<Assessment />);
    expect(screen.getByText("Skill Assessment")).toBeTruthy();
    expect(screen.getByText("CAD Design")).toBeTruthy();
    expect(screen.getByText("CAM Programming")).toBeTruthy();
    expect(screen.getByText("Shop Practice")).toBeTruthy();
    expect(screen.getByText("Machine Operation")).toBeTruthy();
  });

  it("enables continue when domains selected", () => {
    wrap(<Assessment />);
    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByText("CAD Design"));
    expect(continueBtn).toHaveProperty("disabled", false);
  });

  it("navigates through steps", () => {
    wrap(<Assessment />);
    fireEvent.click(screen.getByText("CAD Design"));
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("Manufacturing experience")).toBeTruthy();
  });
});

describe("KnowledgeSearch", () => {
  it("renders search interface", () => {
    wrap(<KnowledgeSearch />);
    expect(screen.getByText("Knowledge Search")).toBeTruthy();
    expect(screen.getByPlaceholderText(/Search for machining/)).toBeTruthy();
    expect(screen.getByText("Knowledge Base")).toBeTruthy();
    // "Tribal Knowledge" appears as both a tab button and a source option
    expect(screen.getAllByText("Tribal Knowledge").length).toBeGreaterThanOrEqual(1);
  });

  it("disables search with empty query", () => {
    wrap(<KnowledgeSearch />);
    const searchBtn = screen.getByRole("button", { name: "Search" });
    expect(searchBtn).toHaveProperty("disabled", true);
  });

  it("switches between tabs", () => {
    wrap(<KnowledgeSearch />);
    // Use getAllByText since "Tribal Knowledge" appears in both tab and source dropdown
    const tribalButtons = screen.getAllByText("Tribal Knowledge");
    fireEvent.click(tribalButtons[0]);
    // Domain/source filters should hide on tribal tab
    expect(screen.queryByText("All Domains")).toBeNull();
  });
});

describe("MaterialWizard", () => {
  it("renders requirements form", () => {
    wrap(<MaterialWizard />);
    expect(screen.getByText("Material Selection")).toBeTruthy();
    expect(screen.getByText("Application")).toBeTruthy();
    expect(screen.getByText("Material Family")).toBeTruthy();
    expect(screen.getByText("Find Materials")).toBeTruthy();
  });

  it("has material family dropdown options", () => {
    wrap(<MaterialWizard />);
    const select = screen.getAllByRole("combobox")[0];
    expect(select).toBeTruthy();
  });
});

describe("ToolWizard", () => {
  it("renders operation selection", () => {
    wrap(<ToolWizard />);
    expect(screen.getByText("Tool Selection")).toBeTruthy();
    expect(screen.getByText("Operation *")).toBeTruthy();
    expect(screen.getByText("Find Tools")).toBeTruthy();
  });

  it("disables submit without operation", () => {
    wrap(<ToolWizard />);
    expect(screen.getByText("Find Tools")).toHaveProperty("disabled", true);
  });
});

describe("MachineWizard", () => {
  it("renders requirement inputs", () => {
    wrap(<MachineWizard />);
    expect(screen.getByText("Machine Selection")).toBeTruthy();
    expect(screen.getByText("Part Envelope (mm)")).toBeTruthy();
    expect(screen.getByText("Required Operations")).toBeTruthy();
  });

  it("toggles operation buttons", () => {
    wrap(<MachineWizard />);
    const millingBtn = screen.getByText("Milling");
    fireEvent.click(millingBtn);
    expect(millingBtn.className).toContain("border-blue-500");
    fireEvent.click(millingBtn);
    expect(millingBtn.className).not.toContain("border-blue-500");
  });
});

describe("LearningDashboard", () => {
  it("renders dashboard elements", () => {
    wrap(<LearningDashboard />);
    expect(screen.getByText("Learning Dashboard")).toBeTruthy();
    expect(screen.getByText("Quick Actions")).toBeTruthy();
    expect(screen.getByText("Take Assessment")).toBeTruthy();
    expect(screen.getByText("Browse Knowledge")).toBeTruthy();
  });
});

describe("LearningPath", () => {
  it("renders header", () => {
    wrap(<LearningPath />);
    expect(screen.getByText("Learning Path")).toBeTruthy();
    expect(screen.getByText(/personalized journey/)).toBeTruthy();
  });
});

describe("ProgressTracker", () => {
  it("renders loading state", () => {
    wrap(<ProgressTracker />);
    // Component fires progress.execute() on mount, showing loading state
    expect(screen.getByText("Loading progress...")).toBeTruthy();
  });
});

describe("DigitalTwin", () => {
  it("renders controls", () => {
    wrap(<DigitalTwin />);
    expect(screen.getByText("Digital Twin")).toBeTruthy();
    // Component fires twin.execute() on mount, so button shows "..." while loading
    expect(screen.getByRole("button", { name: "..." })).toBeTruthy();
    expect(screen.getByText("Auto-refresh")).toBeTruthy();
  });
});
