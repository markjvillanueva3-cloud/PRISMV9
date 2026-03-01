import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ControllerSelector from "../../components/ppg/ControllerSelector";
import GcodePreview from "../../components/ppg/GcodePreview";
import ValidationPanel from "../../components/ppg/ValidationPanel";
import OptimizeDownload from "../../components/ppg/OptimizeDownload";
import TemplateBrowser from "../../components/ppg/TemplateBrowser";
import OperationBuilder from "../../components/ppg/OperationBuilder";
import GcodeDiff from "../../components/ppg/GcodeDiff";
import GcodeEditor from "../../components/ppg/GcodeEditor";
import { PpgProvider } from "../../contexts/PpgContext";
import type { PpgControllerInfo } from "../../types/ppg";

/* ------------------------------------------------------------------ */
/* Mock the PPG hooks                                                  */
/* ------------------------------------------------------------------ */

const mockControllers: PpgControllerInfo[] = [
  { id: "fanuc", name: "Fanuc 0i-F", manufacturer: "Fanuc", capabilities: ["3-axis", "canned-cycles"] },
  { id: "haas", name: "Haas NGC", manufacturer: "Haas", capabilities: ["3-axis"] },
  { id: "siemens", name: "Siemens 840D", manufacturer: "Siemens", capabilities: ["5-axis", "TCPM"] },
  { id: "mazak", name: "Mazak Smooth", manufacturer: "Mazak", capabilities: ["turning"] },
];

const mockValidateExecute = vi.fn();
const mockValidateReset = vi.fn();
const mockOptimizeExecute = vi.fn();
const mockOptimizeReset = vi.fn();

// Mock Monaco Editor — doesn't work in jsdom
vi.mock("@monaco-editor/react", () => ({
  default: ({ value, onChange, loading }: { value: string; onChange?: (v: string) => void; loading?: React.ReactNode }) => (
    <div data-testid="monaco-editor">
      <textarea
        data-testid="monaco-textarea"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {loading}
    </div>
  ),
  DiffEditor: ({ original, modified }: { original: string; modified: string }) => (
    <div data-testid="monaco-diff-editor">
      <pre data-testid="diff-original">{original}</pre>
      <pre data-testid="diff-modified">{modified}</pre>
    </div>
  ),
}));

// Mock ppgApi for components that call it directly
const mockPpgApiTemplate = vi.fn();
const mockPpgApiProgram = vi.fn();
const mockPpgApiCompare = vi.fn();

vi.mock("../../api/ppg", () => ({
  ppgApi: {
    template: (...args: unknown[]) => mockPpgApiTemplate(...args),
    program: (...args: unknown[]) => mockPpgApiProgram(...args),
    compare: (...args: unknown[]) => mockPpgApiCompare(...args),
    generate: vi.fn(),
    validate: vi.fn(),
    optimize: vi.fn(),
    getControllers: vi.fn(),
    getOperations: vi.fn(),
  },
}));

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
      { id: "drilling", name: "Drilling", category: "Drilling", params: [{ name: "depth", type: "number", required: true }] },
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
    reset: mockValidateReset,
  }),
  usePpgOptimize: () => ({
    data: null,
    loading: false,
    error: null,
    execute: mockOptimizeExecute,
    reset: mockOptimizeReset,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */
/* ControllerSelector                                                  */
/* ------------------------------------------------------------------ */

describe("ControllerSelector", () => {
  it("renders all controllers grouped by manufacturer", () => {
    render(<ControllerSelector onChange={vi.fn()} />);
    expect(screen.getByText("Fanuc 0i-F")).toBeInTheDocument();
    expect(screen.getByText("Siemens 840D")).toBeInTheDocument();
    expect(screen.getByText("Haas NGC")).toBeInTheDocument();
    expect(screen.getByText("Mazak Smooth")).toBeInTheDocument();
  });

  it("shows manufacturer group headers", () => {
    render(<ControllerSelector onChange={vi.fn()} />);
    expect(screen.getByText("Fanuc")).toBeInTheDocument();
    expect(screen.getByText("Siemens")).toBeInTheDocument();
  });

  it("filters controllers by search text", () => {
    render(<ControllerSelector onChange={vi.fn()} />);
    const search = screen.getByLabelText("Filter controllers");
    fireEvent.change(search, { target: { value: "siemens" } });
    expect(screen.getByText("Siemens 840D")).toBeInTheDocument();
    expect(screen.queryByText("Fanuc 0i-F")).not.toBeInTheDocument();
  });

  it("calls onChange when a controller is selected", () => {
    const onChange = vi.fn();
    render(<ControllerSelector onChange={onChange} />);
    fireEvent.click(screen.getByText("Fanuc 0i-F"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: "fanuc", name: "Fanuc 0i-F" }),
    );
  });

  it("deselects when clicking the active controller", () => {
    const onChange = vi.fn();
    render(<ControllerSelector value="fanuc" onChange={onChange} />);
    fireEvent.click(screen.getByText("Fanuc 0i-F"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("highlights the selected controller", () => {
    render(<ControllerSelector value="siemens" onChange={vi.fn()} />);
    const btn = screen.getByText("Siemens 840D").closest("button");
    expect(btn).toHaveAttribute("aria-selected", "true");
  });

  it("shows empty message when search has no matches", () => {
    render(<ControllerSelector onChange={vi.fn()} />);
    const search = screen.getByLabelText("Filter controllers");
    fireEvent.change(search, { target: { value: "nonexistent" } });
    expect(
      screen.getByText("No controllers match your search"),
    ).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* GcodePreview                                                        */
/* ------------------------------------------------------------------ */

describe("GcodePreview", () => {
  const sampleGcode = [
    "%",
    "O0001",
    "T01 M06",
    "G54 G90",
    "M08",
    "G00 X0 Y0",
    "G01 Z-5.0 F200",
    "M09",
    "M30",
    "%",
  ].join("\n");

  it("shows empty message when no gcode", () => {
    render(<GcodePreview gcode="" />);
    expect(
      screen.getByText(/No G-code to preview/),
    ).toBeInTheDocument();
  });

  it("renders section labels for gcode", () => {
    render(<GcodePreview gcode={sampleGcode} />);
    expect(screen.getAllByText("Program Start").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Tool Change")).toBeInTheDocument();
    expect(screen.getAllByText("Coolant").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Program End")).toBeInTheDocument();
  });

  it("shows line count", () => {
    render(<GcodePreview gcode={sampleGcode} />);
    expect(screen.getByText("10 lines")).toBeInTheDocument();
  });

  it("shows tool count", () => {
    render(<GcodePreview gcode={sampleGcode} />);
    expect(screen.getByText("1 tool")).toBeInTheDocument();
  });

  it("shows controller badge when provided", () => {
    render(<GcodePreview gcode={sampleGcode} controller="fanuc" />);
    expect(screen.getByText("fanuc")).toBeInTheDocument();
  });

  it("has copy and download buttons", () => {
    render(<GcodePreview gcode={sampleGcode} />);
    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* ValidationPanel                                                     */
/* ------------------------------------------------------------------ */

describe("ValidationPanel", () => {
  it("shows empty state when no validation run", () => {
    render(
      <ValidationPanel gcode="G00 X0 Y0" controller="fanuc" />,
    );
    expect(
      screen.getByText(/Click Validate to check/),
    ).toBeInTheDocument();
  });

  it("disables validate button when no controller", () => {
    render(<ValidationPanel gcode="G00 X0 Y0" />);
    const btn = screen.getByText("Validate");
    expect(btn).toBeDisabled();
  });

  it("disables validate button when no gcode", () => {
    render(<ValidationPanel gcode="" controller="fanuc" />);
    const btn = screen.getByText("Validate");
    expect(btn).toBeDisabled();
  });

  it("shows select controller hint when none selected", () => {
    render(<ValidationPanel gcode="G00 X0 Y0" />);
    expect(
      screen.getByText("Select a controller first"),
    ).toBeInTheDocument();
  });

  it("calls execute on validate click", () => {
    render(
      <ValidationPanel gcode="G00 X0 Y0" controller="fanuc" />,
    );
    fireEvent.click(screen.getByText("Validate"));
    expect(mockValidateExecute).toHaveBeenCalledWith({
      gcode: "G00 X0 Y0",
      controller: "fanuc",
    });
  });
});

/* ------------------------------------------------------------------ */
/* OptimizeDownload                                                    */
/* ------------------------------------------------------------------ */

describe("OptimizeDownload", () => {
  it("shows empty state text", () => {
    render(
      <OptimizeDownload
        gcode="G00 X0"
        onOptimized={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Optimize to merge rapids/),
    ).toBeInTheDocument();
  });

  it("disables optimize when no gcode", () => {
    render(
      <OptimizeDownload gcode="" onOptimized={vi.fn()} />,
    );
    const btn = screen.getByText("Optimize");
    expect(btn).toBeDisabled();
  });

  it("calls execute on optimize click", () => {
    render(
      <OptimizeDownload
        gcode="G00 X0 Y0"
        controller="fanuc"
        onOptimized={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Optimize"));
    expect(mockOptimizeExecute).toHaveBeenCalledWith({
      gcode: "G00 X0 Y0",
      controller: "fanuc",
    });
  });

  it("shows correct file extension for controller", () => {
    render(
      <OptimizeDownload
        gcode="G00 X0"
        controller="siemens"
        onOptimized={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Download .mpf/),
    ).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* PpgContext                                                           */
/* ------------------------------------------------------------------ */

describe("PpgContext", () => {
  it("provides context without crashing", () => {
    const { container } = render(
      <PpgProvider>
        <div data-testid="child">Context works</div>
      </PpgProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(container).toBeTruthy();
  });
});
