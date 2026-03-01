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

/* ------------------------------------------------------------------ */
/* TemplateBrowser                                                      */
/* ------------------------------------------------------------------ */

describe("TemplateBrowser", () => {
  it("renders operation templates grouped by category", () => {
    render(<TemplateBrowser onGenerate={vi.fn()} />);
    expect(screen.getByText("Facing")).toBeInTheDocument();
    // "Drilling" appears as both category header and operation name
    expect(screen.getAllByText("Drilling").length).toBeGreaterThanOrEqual(1);
  });

  it("shows category group headers", () => {
    render(<TemplateBrowser onGenerate={vi.fn()} />);
    expect(screen.getByText("Milling")).toBeInTheDocument();
    // "Drilling" appears as both category header and operation name
    expect(screen.getAllByText("Drilling").length).toBeGreaterThanOrEqual(1);
  });

  it("filters templates by search text", () => {
    render(<TemplateBrowser onGenerate={vi.fn()} />);
    const search = screen.getByLabelText("Filter templates");
    fireEvent.change(search, { target: { value: "facing" } });
    expect(screen.getByText("Facing")).toBeInTheDocument();
    expect(screen.queryByText("Drilling")).not.toBeInTheDocument();
  });

  it("shows empty message when search has no matches", () => {
    render(<TemplateBrowser onGenerate={vi.fn()} />);
    const search = screen.getByLabelText("Filter templates");
    fireEvent.change(search, { target: { value: "xyz_nonexistent" } });
    expect(screen.getByText("No templates match")).toBeInTheDocument();
  });

  it("shows parameter form when template is selected", () => {
    render(<TemplateBrowser controller="fanuc" onGenerate={vi.fn()} />);
    // Click the Drilling operation (not the category header)
    const drillingElements = screen.getAllByText("Drilling");
    const drillingButton = drillingElements.find((el) => el.closest("button"));
    fireEvent.click(drillingButton!);
    expect(screen.getByText("depth")).toBeInTheDocument();
    expect(screen.getByText("Generate G-Code")).toBeInTheDocument();
  });

  it("shows 'Select a controller first' when no controller", () => {
    render(<TemplateBrowser onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByText("Facing"));
    expect(screen.getByText("Select a controller first")).toBeInTheDocument();
  });

  it("deselects template when clicking it again", () => {
    render(<TemplateBrowser controller="fanuc" onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByText("Facing"));
    expect(screen.getByText("Generate G-Code")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Facing"));
    expect(screen.queryByText("Generate G-Code")).not.toBeInTheDocument();
  });

  it("calls ppgApi.template and onGenerate on generate click", async () => {
    mockPpgApiTemplate.mockResolvedValue({ gcode: "G00 X0 Y0", line_count: 1, template_name: "facing", warnings: [] });
    const onGenerate = vi.fn();
    render(<TemplateBrowser controller="fanuc" onGenerate={onGenerate} />);
    fireEvent.click(screen.getByText("Facing"));
    fireEvent.click(screen.getByText("Generate G-Code"));

    await waitFor(() => {
      expect(mockPpgApiTemplate).toHaveBeenCalledWith({
        controller: "fanuc",
        template: "facing",
        params: {},
      });
      expect(onGenerate).toHaveBeenCalledWith("G00 X0 Y0");
    });
  });

  it("shows error when generation fails", async () => {
    mockPpgApiTemplate.mockRejectedValue(new Error("Template error"));
    render(<TemplateBrowser controller="fanuc" onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByText("Facing"));
    fireEvent.click(screen.getByText("Generate G-Code"));

    await waitFor(() => {
      expect(screen.getByText("Template error")).toBeInTheDocument();
    });
  });

  it("shows param count badge on template items", () => {
    render(<TemplateBrowser onGenerate={vi.fn()} />);
    // Facing has 0 params → "0p", Drilling has 1 param → "1p"
    expect(screen.getByText("0p")).toBeInTheDocument();
    expect(screen.getByText("1p")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* OperationBuilder                                                     */
/* ------------------------------------------------------------------ */

describe("OperationBuilder", () => {
  it("shows empty state message", () => {
    render(<OperationBuilder onGenerate={vi.fn()} />);
    expect(screen.getByText(/Add operations to build/)).toBeInTheDocument();
  });

  it("shows add operation dropdown", () => {
    render(<OperationBuilder onGenerate={vi.fn()} />);
    expect(screen.getByLabelText("Add operation")).toBeInTheDocument();
  });

  it("adds an operation card when selected from dropdown", () => {
    render(<OperationBuilder controller="fanuc" onGenerate={vi.fn()} />);
    const select = screen.getByLabelText("Add operation");
    fireEvent.change(select, { target: { value: "facing" } });
    expect(screen.getByText("facing")).toBeInTheDocument();
    expect(screen.getByText("Generate Program (1 ops)")).toBeInTheDocument();
  });

  it("shows move up/down and remove buttons on operation cards", () => {
    render(<OperationBuilder controller="fanuc" onGenerate={vi.fn()} />);
    const select = screen.getByLabelText("Add operation");
    fireEvent.change(select, { target: { value: "facing" } });
    expect(screen.getByLabelText("Move up")).toBeInTheDocument();
    expect(screen.getByLabelText("Move down")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove")).toBeInTheDocument();
  });

  it("removes an operation when remove is clicked", () => {
    render(<OperationBuilder controller="fanuc" onGenerate={vi.fn()} />);
    const select = screen.getByLabelText("Add operation");
    fireEvent.change(select, { target: { value: "facing" } });
    expect(screen.getByText("facing")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Remove"));
    expect(screen.getByText(/Add operations to build/)).toBeInTheDocument();
  });

  it("shows 'Select a controller' when none provided", () => {
    render(<OperationBuilder onGenerate={vi.fn()} />);
    const select = screen.getByLabelText("Add operation");
    fireEvent.change(select, { target: { value: "facing" } });
    expect(screen.getByText("Select a controller")).toBeInTheDocument();
  });

  it("calls ppgApi.program on generate click", async () => {
    mockPpgApiProgram.mockResolvedValue({
      gcode: "O0001\nG00 X0\nM30", line_count: 3, tool_changes: 1,
      estimated_time_sec: 10, warnings: [],
    });
    const onGenerate = vi.fn();
    render(<OperationBuilder controller="fanuc" onGenerate={onGenerate} />);
    const select = screen.getByLabelText("Add operation");
    fireEvent.change(select, { target: { value: "facing" } });
    fireEvent.click(screen.getByText("Generate Program (1 ops)"));

    await waitFor(() => {
      expect(mockPpgApiProgram).toHaveBeenCalled();
      expect(onGenerate).toHaveBeenCalledWith("O0001\nG00 X0\nM30");
    });
  });

  it("shows error on program generation failure", async () => {
    mockPpgApiProgram.mockRejectedValue(new Error("Program gen failed"));
    render(<OperationBuilder controller="fanuc" onGenerate={vi.fn()} />);
    const select = screen.getByLabelText("Add operation");
    fireEvent.change(select, { target: { value: "facing" } });
    fireEvent.click(screen.getByText("Generate Program (1 ops)"));

    await waitFor(() => {
      expect(screen.getByText("Program gen failed")).toBeInTheDocument();
    });
  });
});

/* ------------------------------------------------------------------ */
/* GcodeDiff                                                            */
/* ------------------------------------------------------------------ */

describe("GcodeDiff", () => {
  it("shows controller selector dropdowns", () => {
    render(
      <GcodeDiff gcode="G00 X0" controllers={mockControllers} />,
    );
    expect(screen.getByLabelText("Controller A")).toBeInTheDocument();
    expect(screen.getByLabelText("Controller B")).toBeInTheDocument();
  });

  it("shows compare button", () => {
    render(
      <GcodeDiff gcode="G00 X0" controllers={mockControllers} />,
    );
    expect(screen.getByText("Compare")).toBeInTheDocument();
  });

  it("disables compare when controllers not selected", () => {
    render(
      <GcodeDiff gcode="G00 X0" controllers={mockControllers} />,
    );
    expect(screen.getByText("Compare")).toBeDisabled();
  });

  it("shows empty state text", () => {
    render(
      <GcodeDiff gcode="G00 X0" controllers={mockControllers} />,
    );
    expect(
      screen.getByText("Select two controllers and click Compare"),
    ).toBeInTheDocument();
  });

  it("calls ppgApi.compare and shows diff editor", async () => {
    mockPpgApiCompare.mockResolvedValue({
      results: [
        { controller: "fanuc", gcode: "G00 X0 (FANUC)", line_count: 1 },
        { controller: "siemens", gcode: "G0 X0 ;SIEMENS", line_count: 1 },
      ],
    });
    render(
      <GcodeDiff gcode="G00 X0" controllers={mockControllers} />,
    );
    fireEvent.change(screen.getByLabelText("Controller A"), { target: { value: "fanuc" } });
    fireEvent.change(screen.getByLabelText("Controller B"), { target: { value: "siemens" } });
    fireEvent.click(screen.getByText("Compare"));

    await waitFor(() => {
      expect(mockPpgApiCompare).toHaveBeenCalled();
      expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
    });
  });

  it("shows diff statistics after comparison", async () => {
    mockPpgApiCompare.mockResolvedValue({
      results: [
        { controller: "fanuc", gcode: "G00 X0\nG01 Z-5", line_count: 2 },
        { controller: "siemens", gcode: "G0 X0\nG1 Z-5", line_count: 2 },
      ],
    });
    render(
      <GcodeDiff gcode="G00 X0" controllers={mockControllers} />,
    );
    fireEvent.change(screen.getByLabelText("Controller A"), { target: { value: "fanuc" } });
    fireEvent.change(screen.getByLabelText("Controller B"), { target: { value: "siemens" } });
    fireEvent.click(screen.getByText("Compare"));

    await waitFor(() => {
      expect(screen.getByText("2 lines (A)")).toBeInTheDocument();
      expect(screen.getByText("2 lines (B)")).toBeInTheDocument();
      expect(screen.getByText("2 changed")).toBeInTheDocument();
    });
  });

  it("shows error when comparison fails", async () => {
    mockPpgApiCompare.mockRejectedValue(new Error("Compare failed"));
    render(
      <GcodeDiff gcode="G00 X0" controllers={mockControllers} />,
    );
    fireEvent.change(screen.getByLabelText("Controller A"), { target: { value: "fanuc" } });
    fireEvent.change(screen.getByLabelText("Controller B"), { target: { value: "siemens" } });
    fireEvent.click(screen.getByText("Compare"));

    await waitFor(() => {
      expect(screen.getByText("Compare failed")).toBeInTheDocument();
    });
  });
});

/* ------------------------------------------------------------------ */
/* GcodeEditor                                                          */
/* ------------------------------------------------------------------ */

describe("GcodeEditor", () => {
  it("renders Monaco editor mock", () => {
    render(<GcodeEditor value="G00 X0 Y0" onChange={vi.fn()} />);
    expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
  });

  it("passes value to the editor", () => {
    render(<GcodeEditor value="G01 Z-5.0 F200" onChange={vi.fn()} />);
    const textarea = screen.getByTestId("monaco-textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("G01 Z-5.0 F200");
  });

  it("calls onChange when content changes", () => {
    const onChange = vi.fn();
    render(<GcodeEditor value="" onChange={onChange} />);
    fireEvent.change(screen.getByTestId("monaco-textarea"), {
      target: { value: "G00 X10 Y20" },
    });
    expect(onChange).toHaveBeenCalledWith("G00 X10 Y20");
  });
});
