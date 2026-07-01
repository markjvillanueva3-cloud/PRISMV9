/**
 * ToolSearchSelect.test.tsx -- the SFC tool-search typeahead.
 * Verifies: no search below the min query length, debounced search against the tool
 * corpus, result rendering, and that picking a tool cascades the full option to the
 * consumer (which fills the orchestrator geometry fields). fetchToolSearch is mocked
 * so no live server is needed; fake timers drive the debounce.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ToolSearchSelect from "../components/sfc/ToolSearchSelect";
import { fetchToolSearch, type ToolSearchOption } from "../api/sfcReferenceCatalogs";

vi.mock("../api/sfcReferenceCatalogs", () => ({ fetchToolSearch: vi.fn() }));
const mockFetch = vi.mocked(fetchToolSearch);

const SAMPLE: ToolSearchOption[] = [
  { id: "EM-12", label: "12mm 4FL Endmill", detail: "12 mm · 4F · Endmill · AlTiN", diameterMm: 12, flutes: 4, coating: "AlTiN", helixDeg: 35, fluteLengthMm: 36, toolType: "endmill" },
  { id: "EM-10", label: "10mm 3FL Endmill", detail: "10 mm · 3F · Endmill", diameterMm: 10, flutes: 3, coating: "", helixDeg: null, fluteLengthMm: null, toolType: "endmill" },
];

beforeEach(() => {
  vi.useFakeTimers();
  mockFetch.mockReset();
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

function getInput(): HTMLInputElement {
  return screen.getByPlaceholderText(/Search tool catalog/i) as HTMLInputElement;
}

describe("ToolSearchSelect", () => {
  it("does NOT search for a query shorter than the minimum length", async () => {
    render(<ToolSearchSelect label="Tool" onSelect={vi.fn()} />);
    fireEvent.change(getInput(), { target: { value: "e" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("debounces (no call before the delay elapses)", async () => {
    mockFetch.mockResolvedValue({ options: SAMPLE, total: 2, hasMore: false });
    render(<ToolSearchSelect label="Tool" onSelect={vi.fn()} debounceMs={250} />);
    fireEvent.change(getInput(), { target: { value: "endmill" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(mockFetch).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(150); });
    expect(mockFetch).toHaveBeenCalledWith("endmill", 25);
  });

  it("renders results and cascades the FULL picked option to onSelect", async () => {
    mockFetch.mockResolvedValue({ options: SAMPLE, total: 2, hasMore: false });
    const onSelect = vi.fn();
    render(<ToolSearchSelect label="Tool" onSelect={onSelect} debounceMs={250} />);
    fireEvent.change(getInput(), { target: { value: "endmill" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });

    const result = screen.getByText("12mm 4FL Endmill");
    expect(result).toBeTruthy();
    expect(screen.getByText("10mm 3FL Endmill")).toBeTruthy();

    fireEvent.click(result);
    expect(onSelect).toHaveBeenCalledTimes(1);
    // The consumer receives the FULL option (diameter/flutes/coating/helix/flute-length),
    // which is what cascades into the orchestrator fields on the page.
    expect(onSelect).toHaveBeenCalledWith(SAMPLE[0]);
    expect(getInput().value).toBe("12mm 4FL Endmill");
  });

  it("surfaces a 'refine' hint when total exceeds the rendered page", async () => {
    mockFetch.mockResolvedValue({ options: SAMPLE, total: 4210, hasMore: true });
    render(<ToolSearchSelect label="Tool" onSelect={vi.fn()} debounceMs={250} />);
    fireEvent.change(getInput(), { target: { value: "drill" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    expect(screen.getByText(/4,210 matches/)).toBeTruthy();
  });
});
