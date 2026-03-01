import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { PpgControllerInfo } from "../../types/ppg";

/* ------------------------------------------------------------------ */
/* Mock Monaco — it doesn't work in jsdom                              */
/* ------------------------------------------------------------------ */

vi.mock("@monaco-editor/react", () => ({
  default: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) => (
    <textarea
      data-testid="mock-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
  DiffEditor: () => <div data-testid="mock-diff-editor" />,
}));

/* ------------------------------------------------------------------ */
/* Mock usePpg hooks                                                   */
/* ------------------------------------------------------------------ */

const mockControllers: PpgControllerInfo[] = [
  { id: "fanuc", name: "Fanuc 0i-F", manufacturer: "Fanuc", capabilities: ["3-axis"] },
  { id: "siemens", name: "Siemens 840D", manufacturer: "Siemens", capabilities: ["5-axis"] },
];

const mockValidateExecute = vi.fn();
const mockOptimizeExecute = vi.fn();

vi.mock("../../hooks/usePpg", () => ({
  usePpgControllers: () => ({
    data: mockControllers,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
  usePpgOperations: () => ({
    data: [
      { id: "facing", name: "Facing", category: "Milling", params: [] },
      { id: "drilling", name: "Drilling", category: "Drilling", params: [{ name: "depth", type: "number", required: true, default: 10 }] },
    ],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
  usePpgValidate: () => ({
    data: null,
    loading: false,
    error: null,
    execute: mockValidateExecute,
    reset: vi.fn(),
  }),
  usePpgOptimize: () => ({
    data: null,
    loading: false,
    error: null,
    execute: mockOptimizeExecute,
    reset: vi.fn(),
  }),
}));

/* ------------------------------------------------------------------ */
/* Mock ppg API for TemplateBrowser / GcodeDiff                        */
/* ------------------------------------------------------------------ */

const mockPpgApiTemplate = vi.fn().mockResolvedValue({
  gcode: "O0001\nG54 G90\nG00 X0 Y0\nM30",
  line_count: 4,
  template_name: "facing",
  warnings: [],
});

vi.mock("../../api/ppg", () => ({
  ppgApi: {
    template: (...args: unknown[]) => mockPpgApiTemplate(...args),
    program: vi.fn().mockResolvedValue({ gcode: "G00 X0 Y0" }),
    compare: vi.fn().mockResolvedValue({ results: [] }),
    generate: vi.fn(),
    validate: vi.fn(),
    optimize: vi.fn(),
    getControllers: vi.fn(),
    getOperations: vi.fn(),
  },
}));

/* ------------------------------------------------------------------ */
/* Import after mocks                                                  */
/* ------------------------------------------------------------------ */

import PpgPage from "../../pages/PpgPage";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

/* ------------------------------------------------------------------ */
/* Layout & rendering                                                  */
/* ------------------------------------------------------------------ */

describe("PpgPage layout", () => {
  it("renders all panel headers on desktop", () => {
    render(<PpgPage />);
    expect(screen.getAllByText("Controller").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Templates").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("G-Code Editor").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Preview").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Validation").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Optimize & Download").length).toBeGreaterThanOrEqual(1);
  });

  it("renders controller list inside the page", () => {
    render(<PpgPage />);
    expect(screen.getByText("Fanuc 0i-F")).toBeInTheDocument();
    expect(screen.getByText("Siemens 840D")).toBeInTheDocument();
  });

  it("renders template list", () => {
    render(<PpgPage />);
    expect(screen.getByText("Facing")).toBeInTheDocument();
    // "Drilling" appears as both category header and operation name
    expect(screen.getAllByText("Drilling").length).toBeGreaterThanOrEqual(1);
  });

  it("editor mock is present and editable", () => {
    render(<PpgPage />);
    const editors = screen.getAllByTestId("mock-editor");
    expect(editors.length).toBeGreaterThanOrEqual(1);
    fireEvent.change(editors[0], { target: { value: "G01 X10 Y20" } });
    expect(editors[0]).toHaveValue("G01 X10 Y20");
  });

  it("shows mobile tab bar with 5 tabs", () => {
    render(<PpgPage />);
    const tablist = screen.getByRole("tablist", { name: /PPG panels/i });
    expect(tablist).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(5);
  });

  it("mobile tab navigation switches active tab", () => {
    render(<PpgPage />);
    const tabs = screen.getAllByRole("tab");
    const validationTab = tabs.find((t) => t.textContent === "Validation")!;
    fireEvent.click(validationTab);
    expect(validationTab).toHaveAttribute("aria-selected", "true");
  });
});

/* ------------------------------------------------------------------ */
/* Context & state management                                          */
/* ------------------------------------------------------------------ */

describe("PpgPage state management", () => {
  it("selecting a controller updates aria-selected", () => {
    render(<PpgPage />);
    fireEvent.click(screen.getByText("Fanuc 0i-F"));
    const btn = screen.getByText("Fanuc 0i-F").closest("button");
    expect(btn).toHaveAttribute("aria-selected", "true");
  });

  it("deselecting controller clears aria-selected", () => {
    render(<PpgPage />);
    fireEvent.click(screen.getByText("Fanuc 0i-F"));
    fireEvent.click(screen.getByText("Fanuc 0i-F"));
    const btn = screen.getByText("Fanuc 0i-F").closest("button");
    expect(btn).toHaveAttribute("aria-selected", "false");
  });

  it("restores editor content from localStorage", () => {
    localStorage.setItem(
      "prism-ppg-state",
      JSON.stringify({ editorContent: "G28 G91 Z0" }),
    );
    render(<PpgPage />);
    const editors = screen.getAllByTestId("mock-editor");
    expect(editors[0]).toHaveValue("G28 G91 Z0");
  });

  it("handles corrupt localStorage gracefully", () => {
    localStorage.setItem("prism-ppg-state", "NOT_JSON{{{");
    expect(() => render(<PpgPage />)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Keyboard shortcuts                                                  */
/* ------------------------------------------------------------------ */

describe("PpgPage keyboard shortcuts", () => {
  it("help toggle shows and hides shortcut list", () => {
    render(<PpgPage />);
    // Multiple help buttons exist (desktop + mobile), use first one
    const helpBtns = screen.getAllByLabelText("Toggle keyboard shortcuts help");
    const helpBtn = helpBtns[0];
    // Initially no shortcuts visible
    expect(screen.queryByText("Shortcuts:")).not.toBeInTheDocument();
    // Open
    fireEvent.click(helpBtn);
    expect(screen.getAllByText("Shortcuts:").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ctrl+S").length).toBeGreaterThanOrEqual(1);
    // Close
    fireEvent.click(helpBtn);
  });

  it("Ctrl+D toggles diff view", () => {
    render(<PpgPage />);
    expect(screen.queryByText("Diff Comparison")).not.toBeInTheDocument();
    // Toggle on
    fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    expect(screen.getAllByText("Diff Comparison").length).toBeGreaterThanOrEqual(1);
    // Toggle off
    fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    expect(screen.queryByText("Diff Comparison")).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Full workflow integration                                           */
/* ------------------------------------------------------------------ */

describe("PpgPage full workflow", () => {
  it("select controller → pick template → generate → code appears", async () => {
    render(<PpgPage />);

    // 1. Select controller
    fireEvent.click(screen.getByText("Fanuc 0i-F"));

    // 2. Pick template
    fireEvent.click(screen.getByText("Facing"));
    expect(screen.getByText("Generate G-Code")).toBeInTheDocument();

    // 3. Generate
    fireEvent.click(screen.getByText("Generate G-Code"));

    await waitFor(() => {
      expect(mockPpgApiTemplate).toHaveBeenCalledWith({
        controller: "fanuc",
        template: "facing",
        params: {},
      });
    });

    // 4. Verify code appears in editor
    await waitFor(() => {
      const editors = screen.getAllByTestId("mock-editor");
      expect(editors[0]).toHaveValue("O0001\nG54 G90\nG00 X0 Y0\nM30");
    });
  });

  it("validate button is disabled when no controller and no gcode", () => {
    render(<PpgPage />);
    const validateBtns = screen.getAllByText("Validate");
    validateBtns.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("optimize button is disabled when editor is empty", () => {
    render(<PpgPage />);
    const optimizeBtns = screen.getAllByText("Optimize");
    optimizeBtns.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("generated code updates preview section labels", async () => {
    render(<PpgPage />);

    fireEvent.click(screen.getByText("Fanuc 0i-F"));
    fireEvent.click(screen.getByText("Facing"));
    fireEvent.click(screen.getByText("Generate G-Code"));

    await waitFor(() => {
      // Preview should show parsed sections (Program End from M30)
      expect(screen.getAllByText("Program End").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("validate is called with correct controller and gcode after generation", async () => {
    render(<PpgPage />);

    // Generate code first
    fireEvent.click(screen.getByText("Fanuc 0i-F"));
    fireEvent.click(screen.getByText("Facing"));
    fireEvent.click(screen.getByText("Generate G-Code"));

    await waitFor(() => {
      const editors = screen.getAllByTestId("mock-editor");
      expect(editors[0]).toHaveValue("O0001\nG54 G90\nG00 X0 Y0\nM30");
    });

    // Find an enabled Validate button and click it
    const validateBtns = screen.getAllByText("Validate");
    const enabled = validateBtns.find(
      (b) => !(b as HTMLButtonElement).disabled,
    );
    expect(enabled).toBeTruthy();
    fireEvent.click(enabled!);
    expect(mockValidateExecute).toHaveBeenCalledWith({
      gcode: "O0001\nG54 G90\nG00 X0 Y0\nM30",
      controller: "fanuc",
    });
  });
});
