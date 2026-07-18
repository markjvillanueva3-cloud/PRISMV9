/**
 * HealthEngine — companion test
 * ==============================
 * WIRE-UNWIRED-MS0/U-WIRE-HEALTH-ENGINE
 *
 * Verifies the prism_infra surface (sys_health_* actions) backed by the
 * HealthEngine singleton — system liveness / readiness / component-status
 * health checks with score aggregation and history.
 *
 * Wired (read-only):
 *   - sys_health_check      → healthEngine.check()
 *   - sys_health_liveness   → healthEngine.liveness()
 *   - sys_health_readiness  → healthEngine.readiness()
 *   - sys_health_components → healthEngine.listComponents()
 *   - sys_health_history    → healthEngine.getHistory(limit?)
 *
 * registerComponent / unregisterComponent / setVersion / clear are NOT
 * exposed via MCP — registration needs an in-process HealthChecker callback.
 * They are exercised here only to seed fixtures.
 *
 * Every assertion compares against a concrete expected value (R9). No
 * `.toBeDefined()` / `.toBeUndefined()` line-end stubs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  HealthEngine,
  healthEngine,
  type HealthChecker,
} from "../engines/HealthEngine.js";

/** Build a HealthChecker that always returns the given status. */
function fixedChecker(status: "healthy" | "degraded" | "unhealthy" | "unknown", message?: string): HealthChecker {
  return () => ({ status, message });
}

describe("HealthEngine", () => {
  beforeEach(() => {
    // clear() wipes registered components + history. startTime / version are
    // NOT reset by clear() — that is acceptable (uptime is monotonic).
    healthEngine.clear();
  });

  describe("check — scoring + overall status", () => {
    it("returns status='healthy', score=100 with all-healthy components", () => {
      healthEngine.registerComponent("db", fixedChecker("healthy"));
      healthEngine.registerComponent("cache", fixedChecker("healthy"));
      const report = healthEngine.check();
      expect(report.status).toEqual("healthy");
      expect(report.checks_passed).toEqual(2);
      expect(report.checks_failed).toEqual(0);
      expect(report.score_pct).toEqual(100);
      expect(report.components.length).toEqual(2);
    });

    it("returns status='degraded' when fewer than half the components fail", () => {
      // 1 of 3 failing → failed(1) < total(3)*0.5 → degraded
      healthEngine.registerComponent("a", fixedChecker("healthy"));
      healthEngine.registerComponent("b", fixedChecker("healthy"));
      healthEngine.registerComponent("c", fixedChecker("unhealthy"));
      const report = healthEngine.check();
      expect(report.status).toEqual("degraded");
      expect(report.checks_passed).toEqual(2);
      expect(report.checks_failed).toEqual(1);
      expect(report.score_pct).toEqual(67); // round(2/3*100)
    });

    it("returns status='unhealthy' when half or more components fail", () => {
      // 2 of 4 failing → failed(2) < total(4)*0.5(=2) is FALSE → unhealthy
      healthEngine.registerComponent("a", fixedChecker("healthy"));
      healthEngine.registerComponent("b", fixedChecker("healthy"));
      healthEngine.registerComponent("c", fixedChecker("unhealthy"));
      healthEngine.registerComponent("d", fixedChecker("unhealthy"));
      const report = healthEngine.check();
      expect(report.status).toEqual("unhealthy");
      expect(report.checks_failed).toEqual(2);
      expect(report.score_pct).toEqual(50);
    });

    it("returns status='healthy' score=100 when NO components are registered", () => {
      const report = healthEngine.check();
      expect(report.status).toEqual("healthy");
      expect(report.checks_passed).toEqual(0);
      expect(report.checks_failed).toEqual(0);
      expect(report.score_pct).toEqual(100); // total=0 → 100 by engine convention
      expect(report.components).toEqual([]);
    });

    it("a 'degraded'-status component counts as FAILED for scoring (only 'healthy' passes)", () => {
      healthEngine.registerComponent("a", fixedChecker("healthy"));
      healthEngine.registerComponent("b", fixedChecker("degraded"));
      const report = healthEngine.check();
      // 1 healthy, 1 degraded → passed=1, failed=1 → score 50, unhealthy
      // (failed(1) < total(2)*0.5(=1) is FALSE).
      expect(report.checks_passed).toEqual(1);
      expect(report.checks_failed).toEqual(1);
      expect(report.score_pct).toEqual(50);
    });

    it("a checker that throws is recorded as 'unhealthy' with the error message, not crashing the check", () => {
      healthEngine.registerComponent("ok", fixedChecker("healthy"));
      healthEngine.registerComponent("boom", () => {
        throw new Error("connection refused");
      });
      const report = healthEngine.check();
      const boom = report.components.find((c) => c.name === "boom");
      expect(boom?.status).toEqual("unhealthy");
      expect(boom?.message).toEqual("connection refused");
      expect(report.checks_failed).toEqual(1);
    });

    it("records component metadata + a non-negative response_time_ms + ISO last_check", () => {
      healthEngine.registerComponent("db", () => ({
        status: "healthy",
        message: "ok",
        metadata: { pool_size: 10 },
      }));
      const report = healthEngine.check();
      const db = report.components[0];
      expect(db.message).toEqual("ok");
      expect(db.metadata).toEqual({ pool_size: 10 });
      expect(db.response_time_ms >= 0).toEqual(true);
      expect(Number.isFinite(Date.parse(db.last_check))).toEqual(true);
    });

    it("includes a non-negative uptime_sec and the engine version string", () => {
      const report = healthEngine.check();
      expect(report.uptime_sec >= 0).toEqual(true);
      expect(typeof report.version).toEqual("string");
      expect(report.version.length > 0).toEqual(true);
    });
  });

  describe("check — history accumulation", () => {
    it("appends a history entry on every check(), capturing status + score + failed components", () => {
      // 3 components, 1 failing → failed(1) < total(3)*0.5(=1.5) → degraded.
      healthEngine.registerComponent("a", fixedChecker("healthy"));
      healthEngine.registerComponent("b", fixedChecker("healthy"));
      healthEngine.registerComponent("c", fixedChecker("unhealthy"));
      healthEngine.check();
      healthEngine.check();
      const hist = healthEngine.getHistory();
      expect(hist.length).toEqual(2);
      expect(hist[0].status).toEqual("degraded");
      expect(hist[0].score_pct).toEqual(67); // round(2/3*100)
      expect(hist[0].failed_components).toEqual(["c"]);
    });

    it("getHistory(limit) returns only the last `limit` entries", () => {
      healthEngine.registerComponent("a", fixedChecker("healthy"));
      for (let i = 0; i < 8; i++) healthEngine.check();
      expect(healthEngine.getHistory(3).length).toEqual(3);
      expect(healthEngine.getHistory().length).toEqual(8); // default 50 → all 8
    });
  });

  describe("liveness — always-true process probe", () => {
    it("returns alive=true with a non-negative uptime", () => {
      const live = healthEngine.liveness();
      expect(live.alive).toEqual(true);
      expect(live.uptime_sec >= 0).toEqual(true);
    });

    it("liveness is independent of component health (alive even with failing components)", () => {
      healthEngine.registerComponent("broken", fixedChecker("unhealthy"));
      expect(healthEngine.liveness().alive).toEqual(true);
    });
  });

  describe("readiness — every component must be ready", () => {
    it("ready=true when all components are healthy or degraded", () => {
      healthEngine.registerComponent("a", fixedChecker("healthy"));
      healthEngine.registerComponent("b", fixedChecker("degraded"));
      const r = healthEngine.readiness();
      expect(r.ready).toEqual(true);
      expect(r.components.length).toEqual(2);
      expect(r.components.every((c) => c.ready)).toEqual(true);
    });

    it("ready=false when ANY component is unhealthy", () => {
      healthEngine.registerComponent("a", fixedChecker("healthy"));
      healthEngine.registerComponent("b", fixedChecker("unhealthy"));
      const r = healthEngine.readiness();
      expect(r.ready).toEqual(false);
      const b = r.components.find((c) => c.name === "b");
      expect(b?.ready).toEqual(false);
    });

    it("a throwing checker is treated as not-ready", () => {
      healthEngine.registerComponent("boom", () => {
        throw new Error("down");
      });
      const r = healthEngine.readiness();
      expect(r.ready).toEqual(false);
      expect(r.components[0].ready).toEqual(false);
    });

    it("ready=true with no components registered (vacuous truth — every() of [])", () => {
      const r = healthEngine.readiness();
      expect(r.ready).toEqual(true);
      expect(r.components).toEqual([]);
    });

    it("'unknown'-status component is NOT ready (only healthy|degraded count)", () => {
      healthEngine.registerComponent("u", fixedChecker("unknown"));
      expect(healthEngine.readiness().ready).toEqual(false);
    });
  });

  describe("listComponents / register / unregister", () => {
    it("listComponents returns the names of all registered components", () => {
      healthEngine.registerComponent("alpha", fixedChecker("healthy"));
      healthEngine.registerComponent("beta", fixedChecker("healthy"));
      expect(healthEngine.listComponents().sort()).toEqual(["alpha", "beta"]);
    });

    it("unregisterComponent removes a component and returns true; false for unknown", () => {
      healthEngine.registerComponent("temp", fixedChecker("healthy"));
      expect(healthEngine.unregisterComponent("temp")).toEqual(true);
      expect(healthEngine.unregisterComponent("temp")).toEqual(false);
      expect(healthEngine.listComponents()).toEqual([]);
    });

    it("re-registering the same name replaces the checker (Map semantics)", () => {
      healthEngine.registerComponent("svc", fixedChecker("healthy"));
      healthEngine.registerComponent("svc", fixedChecker("unhealthy"));
      expect(healthEngine.listComponents()).toEqual(["svc"]);
      expect(healthEngine.check().status).toEqual("unhealthy");
    });
  });

  describe("setVersion", () => {
    it("setVersion changes the version reported by check()", () => {
      healthEngine.setVersion("9.9.9");
      expect(healthEngine.check().version).toEqual("9.9.9");
      // Restore default so other suites are unaffected (version not reset by clear()).
      healthEngine.setVersion("1.0.0");
    });
  });

  describe("clear", () => {
    it("clear() wipes registered components AND history", () => {
      healthEngine.registerComponent("a", fixedChecker("healthy"));
      healthEngine.check();
      healthEngine.clear();
      expect(healthEngine.listComponents()).toEqual([]);
      expect(healthEngine.getHistory()).toEqual([]);
    });
  });

  describe("class export — multi-instance isolation", () => {
    it("a new HealthEngine instance has its own component registry", () => {
      const local = new HealthEngine();
      local.registerComponent("local-only", fixedChecker("healthy"));
      expect(local.listComponents()).toEqual(["local-only"]);
      // Singleton was cleared in beforeEach and never got this component.
      expect(healthEngine.listComponents()).toEqual([]);
    });
  });

  describe("adversarial inputs", () => {
    it("handles a checker returning an empty result object gracefully", () => {
      // A checker MUST return { status } per the type, but verify a minimal
      // valid checker (status only, no message/metadata) doesn't break.
      healthEngine.registerComponent("minimal", () => ({ status: "healthy" }));
      const report = healthEngine.check();
      expect(report.components[0].message === undefined).toEqual(true);
      expect(report.status).toEqual("healthy");
    });

    it("getHistory(limit) with limit larger than history returns the whole history", () => {
      healthEngine.registerComponent("a", fixedChecker("healthy"));
      healthEngine.check();
      expect(healthEngine.getHistory(9999).length).toEqual(1);
    });
  });
});
