/**
 * Tests — CADFallbackRoutingEngine (CAD-COMPLETE-MS0 / U-AI-01)
 */
import { describe, it, expect } from "vitest";
import {
  CADFallbackRoutingEngine,
  cadFallbackRoutingEngine,
  type CADAppProfile,
} from "../engines/CADFallbackRoutingEngine.js";

/** A router seeded with three CAD apps. */
function seeded() {
  const e = new CADFallbackRoutingEngine();
  e.registerMany([
    { appId: "fusion", priority: 10, capabilities: ["extrude", "assembly"] },
    { appId: "hypermill", priority: 8, capabilities: ["extrude", "toolpath"] },
    { appId: "solidworks", priority: 6, capabilities: ["extrude", "assembly", "sheet_metal"] },
  ]);
  return e;
}

describe("CADFallbackRoutingEngine — registry", () => {
  it("lists apps ranked by priority descending", () => {
    expect(seeded().listApps().map((a) => a.appId)).toEqual(["fusion", "hypermill", "solidworks"]);
  });

  it("register replaces an existing app", () => {
    const e = seeded();
    e.register({ appId: "fusion", priority: 1, capabilities: [] });
    expect(e.listApps()[0].appId).toBe("hypermill");
  });

  it("unregister removes an app", () => {
    const e = seeded();
    expect(e.unregister("hypermill")).toBe(true);
    expect(e.listApps().map((a) => a.appId)).toEqual(["fusion", "solidworks"]);
  });

  it("reset clears the registry", () => {
    const e = seeded();
    e.reset();
    expect(e.listApps()).toHaveLength(0);
  });

  it("register rejects an empty appId", () => {
    expect(() => new CADFallbackRoutingEngine().register({ appId: "", priority: 1, capabilities: [] })).toThrow();
  });
});

describe("CADFallbackRoutingEngine — preferred routing", () => {
  it("routes to the preferred app when it is available + capable", () => {
    const d = seeded().route({ preferredApp: "fusion", capability: "extrude" });
    expect(d.ok).toBe(true);
    expect(d.selectedApp).toBe("fusion");
    expect(d.routeType).toBe("preferred");
  });

  it("does not route to the preferred app when it lacks the capability", () => {
    const d = seeded().route({ preferredApp: "fusion", capability: "sheet_metal" });
    expect(d.selectedApp).toBe("solidworks");
    expect(d.routeType).toBe("fallback");
  });
});

describe("CADFallbackRoutingEngine — fallback routing", () => {
  it("reroutes to the next-best app when the preferred is unavailable", () => {
    const d = seeded().route({ preferredApp: "fusion", unavailable: ["fusion"] });
    expect(d.ok).toBe(true);
    expect(d.selectedApp).toBe("hypermill");
    expect(d.routeType).toBe("fallback");
  });

  it("skips multiple unavailable apps down the priority order", () => {
    const d = seeded().route({ preferredApp: "fusion", unavailable: ["fusion", "hypermill"] });
    expect(d.selectedApp).toBe("solidworks");
  });

  it("reroutes when the preferred app is not registered at all", () => {
    const d = seeded().route({ preferredApp: "catia" });
    expect(d.selectedApp).toBe("fusion");
    expect(d.routeType).toBe("fallback");
    expect(d.reasoning.some((r) => r.includes("not registered"))).toBe(true);
  });

  it("picks the highest-priority eligible app when no preferred is named", () => {
    const d = seeded().route({});
    expect(d.selectedApp).toBe("fusion");
    expect(d.routeType).toBe("fallback");
  });

  it("honours the capability filter when choosing a fallback", () => {
    const d = seeded().route({ capability: "toolpath" });
    expect(d.selectedApp).toBe("hypermill");
  });

  it("never selects a disabled app", () => {
    const e = seeded();
    e.register({ appId: "fusion", priority: 10, capabilities: ["extrude"], enabled: false });
    const d = e.route({ preferredApp: "fusion" });
    expect(d.selectedApp).toBe("hypermill");
  });
});

describe("CADFallbackRoutingEngine — no route", () => {
  it("returns ok=false when every capable app is unavailable", () => {
    const d = seeded().route({
      capability: "extrude",
      unavailable: ["fusion", "hypermill", "solidworks"],
    });
    expect(d.ok).toBe(false);
    expect(d.selectedApp).toBeNull();
    expect(d.routeType).toBe("none");
  });

  it("returns ok=false when no app has the required capability", () => {
    const d = seeded().route({ capability: "5_axis_simultaneous" });
    expect(d.ok).toBe(false);
    expect(d.routeType).toBe("none");
  });

  it("returns ok=false when the registry is empty", () => {
    const d = new CADFallbackRoutingEngine().route({ preferredApp: "fusion" });
    expect(d.ok).toBe(false);
    expect(d.reason).toMatch(/registered/i);
  });
});

describe("CADFallbackRoutingEngine — stateless mode + ranking", () => {
  it("routes over an inline app list, ignoring the registry", () => {
    const e = new CADFallbackRoutingEngine(); // empty registry
    const apps: CADAppProfile[] = [
      { appId: "a", priority: 1, capabilities: ["x"] },
      { appId: "b", priority: 9, capabilities: ["x"] },
    ];
    const d = e.route({ capability: "x" }, apps);
    expect(d.selectedApp).toBe("b");
  });

  it("breaks priority ties by registration order (stable)", () => {
    const e = new CADFallbackRoutingEngine();
    e.registerMany([
      { appId: "first", priority: 5, capabilities: [] },
      { appId: "second", priority: 5, capabilities: [] },
    ]);
    expect(e.route({}).selectedApp).toBe("first");
  });

  it("exports a shared singleton", () => {
    expect(cadFallbackRoutingEngine).toBeInstanceOf(CADFallbackRoutingEngine);
  });
});
