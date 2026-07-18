/**
 * A3ReportEngine.test.ts — HOTEL-ERP-WIRING/U-ERP-A3-REPORT
 *
 * Real reference-value tests on isolated `new A3ReportEngine()` instances for the A3 (PDCA one-pager)
 * CRUD store that backs prism_business a3_report_create/list/get (the Kienzle ERP A3 page).
 */
import { describe, it, expect } from "vitest";
import { A3ReportEngine } from "../engines/A3ReportEngine.js";

describe("A3ReportEngine — create", () => {
  it("creates a report with id, default draft status, timestamps", () => {
    const e = new A3ReportEngine();
    const r = e.create({ title: "Spindle stall on VMC-02", problem_statement: "3 stalls/shift on roughing" });
    expect(r.id).toBe("A3-00001");
    expect(r.title).toBe("Spindle stall on VMC-02");
    expect(r.problem_statement).toBe("3 stalls/shift on roughing");
    expect(r.status).toBe("draft");
    expect(r.countermeasures).toEqual([]);
    expect(r.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(r.updated_at).toBe(r.created_at);
  });

  it("requires a non-empty title (throws)", () => {
    const e = new A3ReportEngine();
    expect(() => e.create({ title: "  ", problem_statement: "x" })).toThrow(/title/);
  });

  it("requires a non-empty problem_statement (throws)", () => {
    const e = new A3ReportEngine();
    expect(() => e.create({ title: "x", problem_statement: "" })).toThrow(/problem_statement/);
  });

  it("falls back to draft on an invalid status; keeps a valid one", () => {
    const e = new A3ReportEngine();
    expect(e.create({ title: "a", problem_statement: "b", status: "bogus" as any }).status).toBe("draft");
    expect(e.create({ title: "a", problem_statement: "b", status: "in_progress" }).status).toBe("in_progress");
  });

  it("strips HTML/script tags out of free text (tags removed, field stored as plain text)", () => {
    const e = new A3ReportEngine();
    const r = e.create({ title: "Clean Title<script>alert(1)</script>", problem_statement: "ok<b>bold</b>" });
    expect(r.title).not.toMatch(/[<>]/); // no markup survives
    expect(r.title).toContain("Clean Title");
    expect(r.problem_statement).toBe("okbold"); // tags stripped, inner text kept
  });

  it("normalizes countermeasures (status defaults open, done preserved)", () => {
    const e = new A3ReportEngine();
    const r = e.create({
      title: "t", problem_statement: "p",
      countermeasures: [{ action: "Replace belt" }, { action: "Retrain op", status: "done", owner_employee_id: "EMP-1" }],
    });
    expect(r.countermeasures).toHaveLength(2);
    expect(r.countermeasures[0]).toMatchObject({ action: "Replace belt", status: "open" });
    expect(r.countermeasures[1]).toMatchObject({ action: "Retrain op", status: "done", owner_employee_id: "EMP-1" });
  });
});

describe("A3ReportEngine — list", () => {
  it("empty store -> data_available:false", () => {
    const e = new A3ReportEngine();
    const out = e.list();
    expect(out.data_available).toBe(false);
    expect(out.total).toBe(0);
    expect(out.reports).toHaveLength(0);
  });

  it("returns reports newest-first", () => {
    const e = new A3ReportEngine();
    const r1 = e.create({ title: "first", problem_statement: "p" });
    const r2 = e.create({ title: "second", problem_statement: "p" });
    const out = e.list();
    expect(out.data_available).toBe(true);
    expect(out.total).toBe(2);
    // A3-00002 created after A3-00001 -> newest first (id tiebreak when timestamps equal)
    expect(out.reports[0].id).toBe(r2.id);
    expect(out.reports[1].id).toBe(r1.id);
  });

  it("filters by status and by owner", () => {
    const e = new A3ReportEngine();
    e.create({ title: "a", problem_statement: "p", status: "complete", owner_employee_id: "EMP-1" });
    e.create({ title: "b", problem_statement: "p", status: "draft", owner_employee_id: "EMP-2" });
    expect(e.list({ status: "complete" }).total).toBe(1);
    expect(e.list({ status: "complete" }).reports[0].title).toBe("a");
    expect(e.list({ owner_employee_id: "EMP-2" }).total).toBe(1);
  });

  it("respects the limit (returned vs total)", () => {
    const e = new A3ReportEngine();
    e.create({ title: "a", problem_statement: "p" });
    e.create({ title: "b", problem_statement: "p" });
    e.create({ title: "c", problem_statement: "p" });
    const out = e.list({ limit: 2 });
    expect(out.total).toBe(3);
    expect(out.returned).toBe(2);
    expect(out.reports).toHaveLength(2);
  });
});

describe("A3ReportEngine — get", () => {
  it("returns the report when present", () => {
    const e = new A3ReportEngine();
    const r = e.create({ title: "findme", problem_statement: "p" });
    const got = e.get(r.id) as { id: string; title: string };
    expect(got.id).toBe(r.id);
    expect(got.title).toBe("findme");
  });

  it("returns {found:false} for a missing id (honest, not a throw)", () => {
    const e = new A3ReportEngine();
    const got = e.get("A3-99999") as { found: boolean; id: string };
    expect(got.found).toBe(false);
    expect(got.id).toBe("A3-99999");
  });
});
