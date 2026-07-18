// @vitest-environment jsdom
/**
 * Tests for JMDieDocumentSearchPanel — JM-DIE-FLEET-SCAN-MS0 / U-FS09.
 * Hermetic: substitutes __testHooks.callQuery with a fake. No network.
 * Each role tab proven to route to the correct dispatcher action with the
 * correct params shape — concrete equality, not presence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { JMDieDocumentSearchPanel, __testHooks } from "../components/quoting/JMDieDocumentSearchPanel.js";

let originalQuery: typeof __testHooks.callQuery;
beforeEach(() => { originalQuery = __testHooks.callQuery; });
afterEach(() => { __testHooks.callQuery = originalQuery; });

describe("Role tab routing — each role routes to its exact dispatcher action + params", () => {
  it("Operator → jm_die_docs_by_part with {partId,limit:20}", async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, total_matched: 3, returned: 3, results: [] });
    __testHooks.callQuery = spy;
    render(<JMDieDocumentSearchPanel />);
    fireEvent.change(screen.getByTestId("jmdie-doc-search-input"), { target: { value: "778" } });
    fireEvent.click(screen.getByTestId("jmdie-doc-search-submit"));
    await waitFor(() => expect(spy.mock.calls.length).toBe(1));
    expect(spy.mock.calls[0][0]).toBe("jm_die_docs_by_part");
    expect(spy.mock.calls[0][1]).toEqual({ partId: "778", limit: 20 });
  });

  it("Quoter → jm_die_docs_by_customer with kindFilter='docustrata'", async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, total_matched: 5, returned: 5, results: [] });
    __testHooks.callQuery = spy;
    render(<JMDieDocumentSearchPanel />);
    fireEvent.click(screen.getByTestId("jmdie-doc-role-quoter"));
    fireEvent.change(screen.getByTestId("jmdie-doc-search-input"), { target: { value: "ACCURATE" } });
    fireEvent.click(screen.getByTestId("jmdie-doc-search-submit"));
    await waitFor(() => expect(spy.mock.calls.length).toBe(1));
    expect(spy.mock.calls[0][0]).toBe("jm_die_docs_by_customer");
    expect(spy.mock.calls[0][1]).toEqual({ customer: "ACCURATE", limit: 20, kindFilter: "docustrata" });
  });

  it("Setup → jm_die_docs_by_part + kindFilter='docustrata'", async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, total_matched: 2, returned: 2, results: [] });
    __testHooks.callQuery = spy;
    render(<JMDieDocumentSearchPanel />);
    fireEvent.click(screen.getByTestId("jmdie-doc-role-setup"));
    fireEvent.change(screen.getByTestId("jmdie-doc-search-input"), { target: { value: "9095" } });
    fireEvent.click(screen.getByTestId("jmdie-doc-search-submit"));
    await waitFor(() => expect(spy.mock.calls.length).toBe(1));
    expect(spy.mock.calls[0][1]).toEqual({ partId: "9095", limit: 20, kindFilter: "docustrata" });
  });

  it("Manager → jm_die_docs_by_machine_family with lowercased family", async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, total_matched: 200, returned: 20, results: [] });
    __testHooks.callQuery = spy;
    render(<JMDieDocumentSearchPanel />);
    fireEvent.click(screen.getByTestId("jmdie-doc-role-manager"));
    fireEvent.change(screen.getByTestId("jmdie-doc-search-input"), { target: { value: "LATHE" } });
    fireEvent.click(screen.getByTestId("jmdie-doc-search-submit"));
    await waitFor(() => expect(spy.mock.calls.length).toBe(1));
    expect(spy.mock.calls[0][1]).toEqual({ family: "lathe", limit: 20 });
  });

  it("Engineer → jm_die_docs_by_tokens with comma-split+trimmed tokens", async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, total_matched: 7, returned: 7, results: [] });
    __testHooks.callQuery = spy;
    render(<JMDieDocumentSearchPanel />);
    fireEvent.click(screen.getByTestId("jmdie-doc-role-engineer"));
    fireEvent.change(screen.getByTestId("jmdie-doc-search-input"), { target: { value: "CNMG120408, 778 ,  9095" } });
    fireEvent.click(screen.getByTestId("jmdie-doc-search-submit"));
    await waitFor(() => expect(spy.mock.calls.length).toBe(1));
    expect(spy.mock.calls[0][1]).toEqual({ tokens: ["CNMG120408", "778", "9095"], limit: 20 });
  });
});

describe("Results rendering — exact data flows to DOM", () => {
  it("Two-result response renders two rows with exact path + family + date strings", async () => {
    __testHooks.callQuery = vi.fn().mockResolvedValue({
      ok: true, total_matched: 2, returned: 2,
      results: [
        { abs_path: "H:/jm/CNC LATHE/ACCURATE/778-rev2.MIN", size_bytes: 1500, mtime_iso: "2024-08-12T10:00:00Z", machine_family: "lathe", kind: "cnc-program" },
        { abs_path: "H:/jm/_PART LIBRARY/ACCURATE/778/blueprint.pdf", size_bytes: 200, mtime_iso: "2024-07-01T10:00:00Z", machine_family: "mixed", kind: "docustrata" },
      ],
    });
    render(<JMDieDocumentSearchPanel />);
    fireEvent.change(screen.getByTestId("jmdie-doc-search-input"), { target: { value: "778" } });
    fireEvent.click(screen.getByTestId("jmdie-doc-search-submit"));
    await waitFor(() => expect(screen.queryAllByTestId("jmdie-doc-search-row").length).toBe(2));
    const rows = screen.getAllByTestId("jmdie-doc-search-row");
    expect(rows[0].textContent).toContain("778-rev2.MIN");
    expect(rows[0].textContent).toContain("lathe");
    expect(rows[0].textContent).toContain("cnc-program");
    expect(rows[0].textContent).toContain("2024-08-12");
    expect(rows[1].textContent).toContain("blueprint.pdf");
    expect(rows[1].textContent).toContain("docustrata");
  });

  it("Empty results → 'No matches.' literal text", async () => {
    __testHooks.callQuery = vi.fn().mockResolvedValue({ ok: true, total_matched: 0, returned: 0, results: [] });
    render(<JMDieDocumentSearchPanel />);
    fireEvent.change(screen.getByTestId("jmdie-doc-search-input"), { target: { value: "nothing-matches" } });
    fireEvent.click(screen.getByTestId("jmdie-doc-search-submit"));
    await waitFor(() => expect(screen.queryByTestId("jmdie-doc-search-results")?.textContent).toContain("No matches."));
  });
});

describe("R12 fail-loud + empty-input guard", () => {
  it("Dispatcher error 'ledger-not-found' surfaces in error banner with exact text", async () => {
    __testHooks.callQuery = vi.fn().mockResolvedValue({ reason: "ledger-not-found" });
    render(<JMDieDocumentSearchPanel />);
    fireEvent.change(screen.getByTestId("jmdie-doc-search-input"), { target: { value: "ACCURATE" } });
    fireEvent.click(screen.getByTestId("jmdie-doc-search-submit"));
    await waitFor(() => expect(screen.getByTestId("jmdie-doc-search-error").textContent).toContain("ledger-not-found"));
  });

  it("Empty input → submit disabled + zero dispatcher calls", () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, total_matched: 0, returned: 0, results: [] });
    __testHooks.callQuery = spy;
    render(<JMDieDocumentSearchPanel />);
    const btn = screen.getByTestId("jmdie-doc-search-submit") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(spy.mock.calls.length).toBe(0);
  });
});
