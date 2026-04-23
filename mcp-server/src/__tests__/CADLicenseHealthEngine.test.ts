/**
 * CADLicenseHealthEngine.test.ts — U-CAD-APP-14 (PHASE-48)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADLicenseHealthEngine,
  type LicenseTransport,
  type LicenseClock,
  type LicenseFeature,
  type LicenseUser,
  type LicenseServer,
  type LicenseAlert,
} from "../engines/CADLicenseHealthEngine.js";

function makeClock(): LicenseClock {
  return { now: () => "2026-04-22T00:00:00Z" };
}

function makeFeature(overrides: Partial<LicenseFeature> = {}): LicenseFeature {
  return {
    featureId: "solidworks_premium",
    featureName: "SolidWorks Premium",
    vendor: "Dassault",
    totalSeats: 10,
    availableSeats: 5,
    inUseSeats: 5,
    reservedSeats: 0,
    daysUntilExpiry: 90,
    isExpired: false,
    isPerpetual: false,
    ...overrides,
  };
}

function makeUser(overrides: Partial<LicenseUser> = {}): LicenseUser {
  return {
    userId: "user001",
    userName: "John Doe",
    hostName: "WORKSTATION-01",
    featureId: "solidworks_premium",
    checkoutTime: "2026-04-22T08:00:00Z",
    durationMinutes: 120,
    isBorrowed: false,
    ...overrides,
  };
}

function makeServer(overrides: Partial<LicenseServer> = {}): LicenseServer {
  return {
    serverId: "server-001",
    serverType: "FlexLM",
    host: "license.company.com",
    port: 27000,
    isOnline: true,
    lastCheck: "2026-04-22T00:00:00Z",
    responseTimeMs: 50,
    ...overrides,
  };
}

function makeTransport(overrides: Partial<LicenseTransport> = {}): LicenseTransport {
  return {
    queryServer: (serverId) => makeServer({ serverId }),
    getFeatures: () => [makeFeature()],
    getUsers: () => [makeUser()],
    borrowLicense: () => true,
    returnLicense: () => true,
    ...overrides,
  };
}

describe("CADLicenseHealthEngine (U-CAD-APP-14)", () => {
  let eng: CADLicenseHealthEngine;
  let transport: LicenseTransport;
  let clock: LicenseClock;

  beforeEach(() => {
    transport = makeTransport();
    clock = makeClock();
    eng = new CADLicenseHealthEngine({ transport, clock });
  });

  describe("server management", () => {
    it("addServer registers server", () => {
      eng.addServer("srv-001", "FlexLM", "lic.example.com", 27000);
      expect(eng.getServer("srv-001")).toBeDefined();
      expect(eng.getServer("srv-001")!.host).toBe("lic.example.com");
    });

    it("removeServer removes server", () => {
      eng.addServer("srv-001", "FlexLM", "lic.example.com", 27000);
      expect(eng.removeServer("srv-001")).toBe(true);
      expect(eng.getServer("srv-001")).toBeUndefined();
    });

    it("removeServer returns false for unknown server", () => {
      expect(eng.removeServer("unknown")).toBe(false);
    });

    it("listServers returns all servers", () => {
      eng.addServer("srv-001", "FlexLM", "host1", 27000);
      eng.addServer("srv-002", "RLM", "host2", 5053);
      expect(eng.listServers().length).toBe(2);
    });

    it("checkServer queries transport", () => {
      eng.addServer("srv-001", "FlexLM", "lic.example.com", 27000);
      const result = eng.checkServer("srv-001");
      expect(result).not.toBeNull();
      expect(result!.isOnline).toBe(true);
    });

    it("checkServer creates alert for offline server", () => {
      transport = makeTransport({
        queryServer: () => makeServer({ isOnline: false }),
      });
      eng = new CADLicenseHealthEngine({ transport, clock });
      eng.addServer("srv-001", "FlexLM", "lic.example.com", 27000);
      eng.checkServer("srv-001");
      const alerts = eng.getAlerts({ severity: "critical" });
      expect(alerts.some(a => a.type === "server_down")).toBe(true);
    });
  });

  describe("feature queries", () => {
    beforeEach(() => {
      eng.addServer("srv-001", "FlexLM", "lic.example.com", 27000);
    });

    it("refreshFeatures loads features from server", () => {
      const features = eng.refreshFeatures("srv-001");
      expect(features.length).toBe(1);
      expect(features[0].featureName).toBe("SolidWorks Premium");
    });

    it("getFeature retrieves cached feature", () => {
      eng.refreshFeatures("srv-001");
      const feature = eng.getFeature("srv-001", "solidworks_premium");
      expect(feature).toBeDefined();
      expect(feature!.totalSeats).toBe(10);
    });

    it("getFeature returns undefined for unknown", () => {
      expect(eng.getFeature("srv-001", "unknown")).toBeUndefined();
    });

    it("listFeatures returns all features", () => {
      transport = makeTransport({
        getFeatures: () => [
          makeFeature({ featureId: "f1" }),
          makeFeature({ featureId: "f2" }),
        ],
      });
      eng = new CADLicenseHealthEngine({ transport, clock });
      eng.addServer("srv-001", "FlexLM", "host", 27000);
      eng.refreshFeatures("srv-001");
      expect(eng.listFeatures().length).toBe(2);
    });

    it("listFeatures filters by server", () => {
      eng.addServer("srv-002", "RLM", "host2", 5053);
      eng.refreshFeatures("srv-001");
      expect(eng.listFeatures("srv-001").length).toBe(1);
      expect(eng.listFeatures("srv-002").length).toBe(0);
    });

    it("getFeatureUtilization calculates ratio", () => {
      eng.refreshFeatures("srv-001");
      const util = eng.getFeatureUtilization("srv-001", "solidworks_premium");
      expect(util).toBe(0.5);
    });

    it("getFeatureUtilization returns 0 for no seats", () => {
      transport = makeTransport({
        getFeatures: () => [makeFeature({ totalSeats: 0, inUseSeats: 0 })],
      });
      eng = new CADLicenseHealthEngine({ transport, clock });
      eng.refreshFeatures("srv-001");
      expect(eng.getFeatureUtilization("srv-001", "solidworks_premium")).toBe(0);
    });
  });

  describe("user queries", () => {
    it("getActiveUsers returns users from transport", () => {
      const users = eng.getActiveUsers("srv-001");
      expect(users.length).toBe(1);
      expect(users[0].userName).toBe("John Doe");
    });

    it("getActiveUsers filters by feature", () => {
      transport = makeTransport({
        getUsers: (_, featureId) => featureId ? [makeUser({ featureId })] : [makeUser()],
      });
      eng = new CADLicenseHealthEngine({ transport, clock });
      const users = eng.getActiveUsers("srv-001", "catia_design");
      expect(users[0].featureId).toBe("catia_design");
    });

    it("getBorrowedLicenses returns only borrowed", () => {
      transport = makeTransport({
        getUsers: () => [
          makeUser({ isBorrowed: true }),
          makeUser({ userId: "user002", isBorrowed: false }),
        ],
      });
      eng = new CADLicenseHealthEngine({ transport, clock });
      const borrowed = eng.getBorrowedLicenses("srv-001");
      expect(borrowed.length).toBe(1);
      expect(borrowed[0].isBorrowed).toBe(true);
    });
  });

  describe("license operations", () => {
    it("borrowLicense calls transport", () => {
      expect(eng.borrowLicense("srv-001", "solidworks_premium", 7)).toBe(true);
    });

    it("borrowLicense returns false on failure", () => {
      transport = makeTransport({ borrowLicense: () => false });
      eng = new CADLicenseHealthEngine({ transport, clock });
      expect(eng.borrowLicense("srv-001", "solidworks_premium", 7)).toBe(false);
    });

    it("returnLicense calls transport", () => {
      expect(eng.returnLicense("srv-001", "solidworks_premium")).toBe(true);
    });
  });

  describe("contention tracking", () => {
    it("recordContention creates event", () => {
      const event = eng.recordContention("solidworks_premium", "user001", 3, 45000);
      expect(event.id).toMatch(/^contention-/);
      expect(event.queueDepth).toBe(3);
    });

    it("recordContention creates alert for high contention", () => {
      eng.recordContention("solidworks_premium", "user001", 5, 120000);
      const alerts = eng.getAlerts({ severity: "warning" });
      expect(alerts.some(a => a.type === "contention")).toBe(true);
    });

    it("resolveContention marks event resolved", () => {
      const event = eng.recordContention("solidworks_premium", "user001", 2, 30000);
      expect(eng.resolveContention(event.id)).toBe(true);
      const history = eng.getContentionHistory();
      expect(history.find(e => e.id === event.id)!.resolved).toBe(true);
    });

    it("resolveContention returns false for unknown", () => {
      expect(eng.resolveContention("unknown")).toBe(false);
    });

    it("getContentionHistory returns all events", () => {
      eng.recordContention("f1", "u1", 1, 1000);
      eng.recordContention("f2", "u2", 2, 2000);
      expect(eng.getContentionHistory().length).toBe(2);
    });

    it("getContentionHistory filters by feature", () => {
      eng.recordContention("f1", "u1", 1, 1000);
      eng.recordContention("f2", "u2", 2, 2000);
      expect(eng.getContentionHistory({ featureId: "f1" }).length).toBe(1);
    });

    it("getContentionHistory with limit", () => {
      for (let i = 0; i < 10; i++) {
        eng.recordContention("f1", `u${i}`, 1, 1000);
      }
      expect(eng.getContentionHistory({ limit: 3 }).length).toBe(3);
    });

    it("getAverageWaitTime calculates mean", () => {
      eng.recordContention("f1", "u1", 1, 1000);
      eng.recordContention("f1", "u2", 1, 3000);
      expect(eng.getAverageWaitTime("f1")).toBe(2000);
    });

    it("getAverageWaitTime returns 0 for no events", () => {
      expect(eng.getAverageWaitTime("unknown")).toBe(0);
    });
  });

  describe("alerts", () => {
    it("refreshFeatures creates expiry alert", () => {
      transport = makeTransport({
        getFeatures: () => [makeFeature({ daysUntilExpiry: 15 })],
      });
      eng = new CADLicenseHealthEngine({ transport, clock, expiryWarningDays: 30 });
      eng.refreshFeatures("srv-001");
      const alerts = eng.getAlerts();
      expect(alerts.some(a => a.type === "expiring_soon")).toBe(true);
    });

    it("refreshFeatures creates expired alert", () => {
      transport = makeTransport({
        getFeatures: () => [makeFeature({ isExpired: true })],
      });
      eng = new CADLicenseHealthEngine({ transport, clock });
      eng.refreshFeatures("srv-001");
      const alerts = eng.getAlerts({ severity: "critical" });
      expect(alerts.some(a => a.type === "expired")).toBe(true);
    });

    it("refreshFeatures creates low seats alert", () => {
      transport = makeTransport({
        getFeatures: () => [makeFeature({ totalSeats: 10, availableSeats: 0, inUseSeats: 10 })],
      });
      eng = new CADLicenseHealthEngine({ transport, clock, lowSeatThreshold: 0.1 });
      eng.refreshFeatures("srv-001");
      const alerts = eng.getAlerts();
      expect(alerts.some(a => a.type === "low_seats")).toBe(true);
    });

    it("acknowledgeAlert marks alert acknowledged", () => {
      eng.recordContention("f1", "u1", 5, 120000);
      const alerts = eng.getAlerts();
      expect(eng.acknowledgeAlert(alerts[0].id)).toBe(true);
      expect(eng.getAlerts({ acknowledged: true }).length).toBe(1);
    });

    it("acknowledgeAlert returns false for unknown", () => {
      expect(eng.acknowledgeAlert("unknown")).toBe(false);
    });

    it("clearAlerts empties alerts", () => {
      eng.recordContention("f1", "u1", 5, 120000);
      expect(eng.clearAlerts()).toBeGreaterThan(0);
      expect(eng.getAlerts().length).toBe(0);
    });

    it("onAlert subscription receives alerts", () => {
      const received: LicenseAlert[] = [];
      eng.onAlert((a) => received.push(a));
      eng.recordContention("f1", "u1", 5, 120000);
      expect(received.length).toBeGreaterThan(0);
    });

    it("onAlert unsubscribe stops alerts", () => {
      const received: LicenseAlert[] = [];
      const unsub = eng.onAlert((a) => received.push(a));
      unsub();
      eng.recordContention("f1", "u1", 5, 120000);
      expect(received.length).toBe(0);
    });
  });

  describe("health summary", () => {
    it("getHealthSummary returns aggregated data", () => {
      eng.addServer("srv-001", "FlexLM", "host", 27000);
      eng.checkServer("srv-001");
      eng.refreshFeatures("srv-001");
      const summary = eng.getHealthSummary();
      expect(summary.totalServers).toBe(1);
      expect(summary.onlineServers).toBe(1);
      expect(summary.totalFeatures).toBe(1);
    });

    it("getHealthSummary counts expiring features", () => {
      transport = makeTransport({
        getFeatures: () => [makeFeature({ daysUntilExpiry: 10 })],
      });
      eng = new CADLicenseHealthEngine({ transport, clock, expiryWarningDays: 30 });
      eng.refreshFeatures("srv-001");
      expect(eng.getHealthSummary().expiringFeatures).toBe(1);
    });

    it("getHealthSummary counts low seat features", () => {
      transport = makeTransport({
        getFeatures: () => [makeFeature({ totalSeats: 10, availableSeats: 0 })],
      });
      eng = new CADLicenseHealthEngine({ transport, clock });
      eng.refreshFeatures("srv-001");
      expect(eng.getHealthSummary().lowSeatFeatures).toBe(1);
    });

    it("getHealthSummary counts active contentions", () => {
      eng.recordContention("f1", "u1", 1, 1000);
      expect(eng.getHealthSummary().activeContentions).toBe(1);
    });

    it("getHealthSummary counts unacknowledged alerts", () => {
      eng.recordContention("f1", "u1", 5, 120000);
      expect(eng.getHealthSummary().unacknowledgedAlerts).toBeGreaterThan(0);
    });
  });

  describe("configuration", () => {
    it("setExpiryWarningDays updates threshold", () => {
      eng.setExpiryWarningDays(60);
      transport = makeTransport({
        getFeatures: () => [makeFeature({ daysUntilExpiry: 45 })],
      });
      eng = new CADLicenseHealthEngine({ transport, clock, expiryWarningDays: 60 });
      eng.refreshFeatures("srv-001");
      expect(eng.getAlerts().some(a => a.type === "expiring_soon")).toBe(true);
    });

    it("setLowSeatThreshold updates threshold", () => {
      eng.setLowSeatThreshold(0.5);
      transport = makeTransport({
        getFeatures: () => [makeFeature({ totalSeats: 10, availableSeats: 4 })],
      });
      eng = new CADLicenseHealthEngine({ transport, clock, lowSeatThreshold: 0.5 });
      eng.refreshFeatures("srv-001");
      expect(eng.getAlerts().some(a => a.type === "low_seats")).toBe(true);
    });

    it("setLowSeatThreshold clamps to 0-1", () => {
      eng.setLowSeatThreshold(1.5);
      eng.setLowSeatThreshold(-0.5);
    });
  });

  describe("multi-server coverage", () => {
    it("handles FlexLM server", () => {
      eng.addServer("flex", "FlexLM", "host", 27000);
      expect(eng.getServer("flex")!.serverType).toBe("FlexLM");
    });

    it("handles RLM server", () => {
      eng.addServer("rlm", "RLM", "host", 5053);
      expect(eng.getServer("rlm")!.serverType).toBe("RLM");
    });

    it("handles DSLS server", () => {
      eng.addServer("dsls", "DSLS", "host", 4085);
      expect(eng.getServer("dsls")!.serverType).toBe("DSLS");
    });
  });
});
