/**
 * HotelEmployeeHubPage — module-level smoke test (frontend G11+G12).
 * Verifies the default export is a React component + the page references
 * the expected backend actions from the api/hotelBusiness wrapper.
 *
 * Full interaction tests live in the e2e suite (Playwright) — this is the
 * compile-time + import-graph contract test.
 *
 * @milestone HOTEL/U-EMP-HUB-FRONTEND (2026-05-27, slot:hotel iter10 /goal Phase 3 frontend)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import HotelEmployeeHubPage from "../pages/HotelEmployeeHubPage";
import {
  domainAcademyReportPath,
  domainAcademyListAssignments,
  handoffList,
  handoffCounterpartyRespond,
} from "../api/hotelBusiness";

const PAGE_SRC = readFileSync(
  path.resolve(__dirname, "../pages/HotelEmployeeHubPage.tsx"),
  "utf-8",
);

describe("HotelEmployeeHubPage wiring", () => {
  it("default export is a function (React component)", () => {
    expect(typeof HotelEmployeeHubPage).toBe("function");
  });

  it("API wrappers for G11 + G12 are loadable", () => {
    expect(typeof domainAcademyReportPath).toBe("function");
    expect(typeof domainAcademyListAssignments).toBe("function");
    expect(typeof handoffList).toBe("function");
    expect(typeof handoffCounterpartyRespond).toBe("function");
  });

  it("page references both G11 + G12 backend dispatcher actions", () => {
    // G11 — academy
    expect(PAGE_SRC).toContain("domainAcademyReportPath");
    expect(PAGE_SRC).toContain("domainAcademyListAssignments");
    // G12 — handoff
    expect(PAGE_SRC).toContain("handoffList");
    expect(PAGE_SRC).toContain("handoffCounterpartyRespond");
  });

  it("includes the 10 machine domains + 8 Lean wastes (operator scope)", () => {
    for (const d of ["mill", "lathe", "swiss_lathe", "mill_turn", "wedm", "sinker_edm", "grinder", "honing", "carbide_polishing", "inspection"]) {
      expect(PAGE_SRC).toContain(`'${d}'`);
    }
    for (const w of ["defect", "overproduction", "waiting", "non_utilized_talent", "transportation", "inventory", "motion", "extra_processing"]) {
      expect(PAGE_SRC).toContain(`'${w}'`);
    }
  });

  it("renders 2 tabs (training + handoff)", () => {
    expect(PAGE_SRC).toContain("'training'");
    expect(PAGE_SRC).toContain("'handoff'");
    expect(PAGE_SRC).toContain("Training Progress");
    expect(PAGE_SRC).toContain("Handoff Inbox");
  });

  it("PII-free per hotel-soul: no SSN/full-name field references in source", () => {
    expect(PAGE_SRC).not.toContain("ssn");
    expect(PAGE_SRC).not.toContain("full_name");
    // employee_id is the canonical PII-free identifier
    expect(PAGE_SRC).toContain("employee_id");
  });
});
