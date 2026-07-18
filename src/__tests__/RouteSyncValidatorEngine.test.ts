/**
 * RouteSyncValidatorEngine.test.ts — Tests for AUTO-4 Route Sync Validation
 */

import { describe, it, expect } from "vitest";
import { routeSyncValidatorEngine } from "../engines/RouteSyncValidatorEngine.js";

describe("RouteSyncValidatorEngine", () => {
  describe("scan()", () => {
    it("returns a RouteSyncReport with valid structure", async () => {
      const report = await routeSyncValidatorEngine.scan();
      expect(report).toBeDefined();
      expect(report.timestamp).toBeTruthy();
      expect(report.total_routes).toBeGreaterThan(0);
      expect(report.sync_score).toBeGreaterThanOrEqual(0);
      expect(report.sync_score).toBeLessThanOrEqual(1);
      expect(report.target_score).toBe(0.90);
      expect(Array.isArray(report.by_route_file)).toBe(true);
      expect(Array.isArray(report.orphaned_route_list)).toBe(true);
      expect(Array.isArray(report.orphaned_client_list)).toBe(true);
      expect(Array.isArray(report.matched)).toBe(true);
      expect(Array.isArray(report.warnings)).toBe(true);
    });

    it("counts are internally consistent", async () => {
      const report = await routeSyncValidatorEngine.scan();
      expect(report.matched_pairs + report.orphaned_routes).toBe(report.total_routes);
      expect(report.matched_pairs + report.orphaned_clients).toBe(report.total_client_fns);
      expect(report.orphaned_route_list.length).toBe(report.orphaned_routes);
      expect(report.orphaned_client_list.length).toBe(report.orphaned_clients);
      expect(report.matched.length).toBe(report.matched_pairs);
    });

    it("gap equals target minus sync_score", async () => {
      const report = await routeSyncValidatorEngine.scan();
      const expectedGap = Math.round((report.target_score - report.sync_score) * 1000) / 1000;
      expect(report.gap).toBe(expectedGap);
    });

    it("route endpoints have required fields", async () => {
      const report = await routeSyncValidatorEngine.scan();
      for (const r of report.orphaned_route_list.slice(0, 5)) {
        expect(r.file).toBeTruthy();
        expect(["GET", "POST", "PUT", "DELETE", "PATCH"]).toContain(r.method);
        expect(r.path).toBeTruthy();
        expect(r.line).toBeGreaterThan(0);
      }
    });

    it("matched pairs have valid match quality", async () => {
      const report = await routeSyncValidatorEngine.scan();
      for (const pair of report.matched.slice(0, 5)) {
        expect(["exact", "partial", "inferred"]).toContain(pair.match_quality);
        expect(pair.route).toBeDefined();
        expect(pair.client).toBeDefined();
      }
    });

    it("per-route-file summary sums correctly", async () => {
      const report = await routeSyncValidatorEngine.scan();
      const sumEndpoints = report.by_route_file.reduce((s, f) => s + f.total_endpoints, 0);
      expect(sumEndpoints).toBe(report.total_routes);
    });
  });

  describe("summary()", () => {
    it("returns a human-readable string", () => {
      const summary = routeSyncValidatorEngine.summary();
      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);
    });
  });
});
