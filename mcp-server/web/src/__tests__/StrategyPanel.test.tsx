/**
 * StrategyPanel.test.tsx — Strategy Selection Panel Tests
 * MILL-MASTER/P0-U04-STUDIO-PANELS
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StrategyPanel, MillingStrategy } from "../components/mill/StrategyPanel";

describe("StrategyPanel", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("renders empty state with add buttons", () => {
    render(<StrategyPanel selectedStrategies={[]} onStrategiesChange={mockOnChange} />);

    expect(screen.getByText("Milling Strategies")).toBeInTheDocument();
    expect(screen.getByText("+ Face Mill")).toBeInTheDocument();
    expect(screen.getByText("+ Roughing")).toBeInTheDocument();
    expect(screen.getByText("+ Finishing")).toBeInTheDocument();
  });

  it("adds strategy when button clicked", () => {
    render(<StrategyPanel selectedStrategies={[]} onStrategiesChange={mockOnChange} />);

    fireEvent.click(screen.getByText("+ Roughing"));

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const newStrategies = mockOnChange.mock.calls[0][0];
    expect(newStrategies).toHaveLength(1);
    expect(newStrategies[0].type).toBe("roughing");
    expect(newStrategies[0].sequence).toBe(1);
  });

  it("displays selected strategies with sequence numbers", () => {
    const strategies: MillingStrategy[] = [
      { id: "s1", type: "facing", name: "Face Mill", description: "Remove stock", sequence: 1 },
      { id: "s2", type: "roughing", name: "Roughing", description: "High MRR", sequence: 2, stepdown_mm: 3.0 },
    ];

    render(<StrategyPanel selectedStrategies={strategies} onStrategiesChange={mockOnChange} />);

    expect(screen.getByText("Face Mill")).toBeInTheDocument();
    expect(screen.getByText("Roughing")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("removes strategy when X clicked", () => {
    const strategies: MillingStrategy[] = [
      { id: "s1", type: "facing", name: "Face Mill", description: "Remove stock", sequence: 1 },
      { id: "s2", type: "roughing", name: "Roughing", description: "High MRR", sequence: 2 },
    ];

    render(<StrategyPanel selectedStrategies={strategies} onStrategiesChange={mockOnChange} />);

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const updated = mockOnChange.mock.calls[0][0];
    expect(updated).toHaveLength(1);
    expect(updated[0].type).toBe("roughing");
    expect(updated[0].sequence).toBe(1);
  });

  it("updates stepdown value via input", () => {
    const strategies: MillingStrategy[] = [
      { id: "s1", type: "roughing", name: "Roughing", description: "High MRR", sequence: 1, stepdown_mm: 3.0 },
    ];

    render(<StrategyPanel selectedStrategies={strategies} onStrategiesChange={mockOnChange} />);

    const input = screen.getByDisplayValue("3");
    fireEvent.change(input, { target: { value: "2.5" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const updated = mockOnChange.mock.calls[0][0];
    expect(updated[0].stepdown_mm).toBe(2.5);
  });

  it("updates stepover value via input", () => {
    const strategies: MillingStrategy[] = [
      { id: "s1", type: "hsm", name: "HSM", description: "High speed", sequence: 1, stepover_percent: 10 },
    ];

    render(<StrategyPanel selectedStrategies={strategies} onStrategiesChange={mockOnChange} />);

    const input = screen.getByDisplayValue("10");
    fireEvent.change(input, { target: { value: "8" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const updated = mockOnChange.mock.calls[0][0];
    expect(updated[0].stepover_percent).toBe(8);
  });

  it("displays ISO material group when provided", () => {
    render(
      <StrategyPanel
        selectedStrategies={[]}
        onStrategiesChange={mockOnChange}
        materialIsoGroup="P"
      />
    );

    expect(screen.getByText("ISO P")).toBeInTheDocument();
  });

  it("shows AI recommendation for single strategy", () => {
    const strategies: MillingStrategy[] = [
      { id: "s1", type: "roughing", name: "Roughing", description: "High MRR", sequence: 1 },
    ];

    render(<StrategyPanel selectedStrategies={strategies} onStrategiesChange={mockOnChange} />);

    expect(screen.getByText(/Consider adding a finishing pass/)).toBeInTheDocument();
  });

  it("shows cycle time estimate for multiple strategies", () => {
    const strategies: MillingStrategy[] = [
      { id: "s1", type: "facing", name: "Face", description: "Face", sequence: 1 },
      { id: "s2", type: "roughing", name: "Rough", description: "Rough", sequence: 2 },
      { id: "s3", type: "finishing", name: "Finish", description: "Finish", sequence: 3 },
    ];

    render(<StrategyPanel selectedStrategies={strategies} onStrategiesChange={mockOnChange} />);

    expect(screen.getByText(/3 strategies selected/)).toBeInTheDocument();
    expect(screen.getByText(/Estimated cycle:/)).toBeInTheDocument();
  });

  it("includes all 8 available strategy types", () => {
    render(<StrategyPanel selectedStrategies={[]} onStrategiesChange={mockOnChange} />);

    expect(screen.getByText("+ Face Mill")).toBeInTheDocument();
    expect(screen.getByText("+ Roughing")).toBeInTheDocument();
    expect(screen.getByText("+ Finishing")).toBeInTheDocument();
    expect(screen.getByText("+ HSM Roughing")).toBeInTheDocument();
    expect(screen.getByText("+ Trochoidal")).toBeInTheDocument();
    expect(screen.getByText("+ Adaptive Clearing")).toBeInTheDocument();
    expect(screen.getByText("+ Rest Machining")).toBeInTheDocument();
    expect(screen.getByText("+ Pencil Trace")).toBeInTheDocument();
  });

  it("generates unique IDs for each added strategy", () => {
    render(<StrategyPanel selectedStrategies={[]} onStrategiesChange={mockOnChange} />);

    fireEvent.click(screen.getByText("+ Roughing"));
    fireEvent.click(screen.getByText("+ Roughing"));

    const calls = mockOnChange.mock.calls;
    const firstId = calls[0][0][0].id;
    const secondCall = calls[1][0];
    const ids = secondCall.map((s: MillingStrategy) => s.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("strategies include default parameters from template", () => {
    render(<StrategyPanel selectedStrategies={[]} onStrategiesChange={mockOnChange} />);

    fireEvent.click(screen.getByText("+ Roughing"));

    const strategy = mockOnChange.mock.calls[0][0][0];
    expect(strategy.stepdown_mm).toBe(3.0);
    expect(strategy.stepover_percent).toBe(40);
    expect(strategy.leave_stock_mm).toBe(0.5);
  });
});
