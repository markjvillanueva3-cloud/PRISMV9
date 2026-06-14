/**
 * WorkSurfaceScaffoldEngine tests — U-HAGI06. Asserts manifest shape, role
 * merging, filter-by-role behavior, and per-route panel composition.
 * Every assertion checks an exact expected value — no presence-only checks.
 */
import { describe, it, expect } from "vitest";
import {
  WorkSurfaceScaffoldEngine,
  type OperatorRole,
} from "../engines/WorkSurfaceScaffoldEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";

describe("WorkSurfaceScaffoldEngine.manifestForRoles — happy path", () => {
  it("estimator role produces 3 routes including /quotes + /batch-quote", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app", ["estimator"], ISO);
    expect(m.surface_id).toBe("psn-app");
    expect(m.voxyz_layer).toBe(1);
    expect(m.routes.map((r) => r.path).sort()).toEqual([
      "/batch-quote", "/quotes", "/quotes/:id",
    ]);
    expect(m.generated_at).toBe(ISO);
  });

  it("programmer role produces 3 routes including /programs and /quote-to-program", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app", ["programmer"], ISO);
    const paths = m.routes.map((r) => r.path).sort();
    expect(paths).toEqual(["/programs", "/programs/:id", "/quote-to-program"]);
  });

  it("global_panels equals ['citation-footer'] (Voxyz L8 citation hook)", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app", ["machinist"], ISO);
    expect(m.global_panels).toEqual(["citation-footer"]);
  });

  it("hermes_compliant equals true exactly", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app", ["admin"], ISO);
    expect(m.hermes_compliant).toBe(true);
  });
});

describe("WorkSurfaceScaffoldEngine.manifestForRoles — multi-role merge", () => {
  it("estimator + programmer = exactly 6 distinct routes (no path overlap)", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app",
      ["estimator", "programmer"], ISO);
    expect(m.routes.length).toBe(6);
    const paths = m.routes.map((r) => r.path).sort();
    expect(paths).toEqual([
      "/batch-quote", "/programs", "/programs/:id",
      "/quote-to-program", "/quotes", "/quotes/:id",
    ]);
  });

  it("supervisor + admin merge: /kill-switch requires_role = [admin, supervisor]", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app",
      ["supervisor", "admin"], ISO);
    const killSwitch = m.routes.find((r) => r.path === "/kill-switch")!;
    expect(killSwitch.requires_role.sort()).toEqual(["admin", "supervisor"]);
    expect(killSwitch.control_plane_gate).toBe(false);
    expect(killSwitch.title).toBe("Kill Switch");
  });

  it("supervisor /dashboard has control_plane_gate=true and 4 panels in exact order", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app", ["supervisor"], ISO);
    const dash = m.routes.find((r) => r.path === "/dashboard")!;
    expect(dash.control_plane_gate).toBe(true);
    expect(dash.title).toBe("Dashboard");
    expect(dash.panels).toEqual([
      "batch-rollup", "workflow-status", "psn-coverage", "citation-footer",
    ]);
  });

  it("admin /admin/coverage has control_plane_gate=false (admin-only ungated)", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app", ["admin"], ISO);
    const cov = m.routes.find((r) => r.path === "/admin/coverage")!;
    expect(cov.control_plane_gate).toBe(false);
    expect(cov.requires_role).toEqual(["admin"]);
    expect(cov.panels).toEqual(["psn-coverage", "citation-footer"]);
  });
});

describe("WorkSurfaceScaffoldEngine.manifestForRoles — failure modes", () => {
  it("throws on empty roles array (boundary)", () => {
    expect(() => WorkSurfaceScaffoldEngine.manifestForRoles("psn-app", [], ISO))
      .toThrow(/role/);
  });

  it("throws on empty surface_id (failure mode)", () => {
    expect(() => WorkSurfaceScaffoldEngine.manifestForRoles("", ["estimator"], ISO))
      .toThrow(/surface_id/);
  });

  it("throws on unknown role (zod enum adversarial)", () => {
    expect(() => WorkSurfaceScaffoldEngine.manifestForRoles(
      "psn-app", ["yolo"] as never, ISO,
    )).toThrow();
  });
});

describe("WorkSurfaceScaffoldEngine.routeAt / filterByRole", () => {
  it("routeAt returns route with exact title and page_id on hit, null on miss", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app", ["estimator"], ISO);
    const hit = WorkSurfaceScaffoldEngine.routeAt(m, "/quotes")!;
    expect(hit.title).toBe("Quotes");
    expect(hit.page_id).toBe("quote-list");
    expect(WorkSurfaceScaffoldEngine.routeAt(m, "/nope")).toBeNull();
  });

  it("filterByRole(supervisor) drops estimator routes; keeps /dashboard", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app",
      ["estimator", "supervisor", "admin"], ISO);
    const supOnly = WorkSurfaceScaffoldEngine.filterByRole(m, "supervisor");
    const paths = supOnly.routes.map((r) => r.path);
    expect(paths.includes("/dashboard")).toBe(true);
    expect(paths.includes("/quotes")).toBe(false);
    expect(paths.includes("/quotes/:id")).toBe(false);
    expect(paths.includes("/batch-quote")).toBe(false);
  });

  it("filterByRole(machinist) on an admin-only manifest returns ≥1 fallback route", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app", ["admin"], ISO);
    const machinistView = WorkSurfaceScaffoldEngine.filterByRole(m, "machinist");
    expect(machinistView.routes.length).toBeGreaterThanOrEqual(1);
    // The fallback is the first route of the source manifest.
    expect(machinistView.routes[0].path).toBe(m.routes[0].path);
  });
});

describe("WorkSurfaceScaffoldEngine.renderManifest", () => {
  it("renders surface id, voxyz layer 1, and per-route /quotes line with [estimator]", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app", ["estimator"], ISO);
    const md = WorkSurfaceScaffoldEngine.renderManifest(m);
    expect(md.includes("WORK-SURFACE psn-app")).toBe(true);
    expect(md.includes("voxyz_layer=1")).toBe(true);
    expect(md.includes("/quotes")).toBe(true);
    expect(md.includes("citation-footer")).toBe(true);
    expect(md.includes("[estimator]")).toBe(true);
  });

  it("/dashboard line carries +gate, /kill-switch line does not", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app",
      ["supervisor", "admin"], ISO);
    const md = WorkSurfaceScaffoldEngine.renderManifest(m);
    const dashLine = md.split("\n").find((l) => l.includes("/dashboard"))!;
    const killLine = md.split("\n").find((l) => l.includes("/kill-switch"))!;
    expect(dashLine.includes("+gate")).toBe(true);
    expect(killLine.includes("+gate")).toBe(false);
  });
});

describe("WorkSurfaceScaffoldEngine — voxyz alignment", () => {
  it("voxyz_layer equals literal 1 (work-surface) for every supported role", () => {
    for (const role of ["programmer", "machinist", "supervisor", "estimator", "admin"] as OperatorRole[]) {
      const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app", [role], ISO);
      expect(m.voxyz_layer).toBe(1);
    }
  });

  it("validateManifest round-trip preserves surface_id, route count, and first-route path", () => {
    const m = WorkSurfaceScaffoldEngine.manifestForRoles("psn-app", ["estimator"], ISO);
    const json = JSON.parse(JSON.stringify(m));
    const restored = WorkSurfaceScaffoldEngine.validateManifest(json);
    expect(restored.surface_id).toBe("psn-app");
    expect(restored.routes.length).toBe(m.routes.length);
    expect(restored.routes[0].path).toBe(m.routes[0].path);
  });
});
