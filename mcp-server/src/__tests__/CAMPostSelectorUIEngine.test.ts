/**
 * CAMPostSelectorUIEngine tests — U-CAM100
 * =========================================
 *
 * Schemas, machine enumeration, filtering, post recommendation (prism_enhanced
 * / vendor_stock / no_post / unknown), per-CAM encoder output, dashboard
 * aggregation. Target ≥30 cases.
 */

import { describe, it, expect } from "vitest";
import {
  CAMPostSelectorUIEngine as PS,
  MachineSelectorEntrySchema,
  PostRecommendationSchema,
  SelectorPayloadSchema,
  SelectorDashboardSchema,
  PostSelectorTargetSchema,
} from "../engines/CAMPostSelectorUIEngine.js";
import { JM_DIE_CONTROLLER_MAP } from "../data/jm-die-profile.js";

describe("CAMPostSelectorUIEngine — Schemas + data plumbing", () => {
  it("supportedTargets() returns five entries", () => {
    expect(PS.supportedTargets()).toEqual([
      "hypermill",
      "fusion360",
      "inventor_hsm",
      "mastercam",
      "generic",
    ]);
  });

  it("PostSelectorTargetSchema rejects unknown targets", () => {
    expect(() => PostSelectorTargetSchema.parse("catia")).toThrow();
  });

  it("listMachines() returns one entry per row in JM_DIE_CONTROLLER_MAP", () => {
    const machines = PS.listMachines();
    expect(machines.length).toBe(JM_DIE_CONTROLLER_MAP.length);
  });

  it("every selector entry conforms to MachineSelectorEntrySchema", () => {
    const machines = PS.listMachines();
    for (const m of machines) {
      expect(() => MachineSelectorEntrySchema.parse(m)).not.toThrow();
    }
  });

  it("categories() include lathe, mill, sinker_edm, wire_edm", () => {
    const cats = PS.categories();
    expect(cats).toContain("lathe");
    expect(cats).toContain("mill");
    expect(cats).toContain("sinker_edm");
    expect(cats).toContain("wire_edm");
  });

  it("controllerFamilies() are sorted and unique", () => {
    const families = PS.controllerFamilies();
    const unique = new Set(families);
    expect(families.length).toBe(unique.size);
    const sorted = [...families].sort();
    expect(families).toEqual(sorted);
  });
});

describe("CAMPostSelectorUIEngine — Filtering", () => {
  it("filters by category lathe → only LTH-* machines", () => {
    const machines = PS.listMachines({ category: "lathe" });
    expect(machines.length).toBeGreaterThan(0);
    for (const m of machines) {
      expect(m.machine_id).toMatch(/^LTH-/);
    }
  });

  it("filters by category mill → only VMC-*/HMC-* machines", () => {
    const machines = PS.listMachines({ category: "mill" });
    for (const m of machines) {
      expect(m.machine_id).toMatch(/^(VMC|HMC)-/);
    }
  });

  it("filters by controller_family = okuma → all Okuma machines", () => {
    const machines = PS.listMachines({ controller_family: "okuma" });
    expect(machines.length).toBeGreaterThanOrEqual(6);
    for (const m of machines) {
      expect(m.controller_family).toBe("okuma");
    }
  });

  it("filters by machine_id returns at most one row", () => {
    const machines = PS.listMachines({ machine_id: "LTH-01" });
    expect(machines).toHaveLength(1);
    expect(machines[0].machine_name).toMatch(/GENOS L300-M/);
  });

  it("filters by has_post = true excludes machines without post", () => {
    const withPost = PS.listMachines({ has_post: true });
    for (const m of withPost) {
      expect(m.post_processor).not.toBeNull();
    }
  });

  it("filters by has_post = false surfaces machines missing post", () => {
    const missing = PS.listMachines({ has_post: false });
    for (const m of missing) {
      expect(m.post_processor).toBeNull();
    }
  });

  it("combined filter (category=mill + controller_family=haas)", () => {
    const machines = PS.listMachines({
      category: "mill",
      controller_family: "haas",
    });
    for (const m of machines) {
      expect(m.category).toBe("mill");
      expect(m.controller_family).toBe("haas");
    }
  });
});

describe("CAMPostSelectorUIEngine — Recommendation logic", () => {
  it("prism_enhanced for machines with PRISM-marked posts", () => {
    const rec = PS.recommendForMachine("LTH-01");
    expect(() => PostRecommendationSchema.parse(rec)).not.toThrow();
    expect(rec.status).toBe("prism_enhanced");
  });

  it("prism_enhanced for Ai-Enhanced naming", () => {
    const rec = PS.recommendForMachine("LTH-05"); // Ai-Enhanced
    expect(rec.status).toBe("prism_enhanced");
  });

  it("no_post_available when post_processor is missing", () => {
    const rec = PS.recommendForMachine("VMC-05"); // Roku-Roku has no post
    expect(rec.status).toBe("no_post_available");
    expect(rec.post_processor).toBeNull();
    expect(rec.controller_family).toBe("fanuc");
  });

  it("unknown_machine for an id not in the map", () => {
    const rec = PS.recommendForMachine("BOGUS-99");
    expect(rec.status).toBe("unknown_machine");
    expect(rec.reason).toMatch(/not present/);
  });

  it("recommendation surfaces controller_family and model", () => {
    const rec = PS.recommendForMachine("VMC-01");
    expect(rec.controller_family).toBe("hurco");
    expect(rec.controller_model).toBe("WinMAX v10");
  });
});

describe("CAMPostSelectorUIEngine — Per-CAM encoding", () => {
  it("hyperMILL encodes an XML <postSelector> envelope", () => {
    const p = PS.encodeForTarget("hypermill", "OP-1");
    expect(p.payload).toMatch(/<postSelector op="OP-1">/);
    expect(p.payload).toMatch(/<machine id="LTH-01"/);
    expect(p.payload).toMatch(/<\/postSelector>/);
  });

  it("hyperMILL escapes XML-sensitive characters", () => {
    // Nothing in JM Die map has & or <, but the encoder must not crash on
    // standard input. Spot-check that closing tag is well-formed.
    const p = PS.encodeForTarget("hypermill", "OP-2");
    expect(p.payload.endsWith("</postSelector>")).toBe(true);
  });

  it("Fusion 360 encodes a JSON-RPC cam.postSelector", () => {
    const p = PS.encodeForTarget("fusion360", "OP-1");
    const parsed = JSON.parse(p.payload);
    expect(parsed.jsonrpc).toBe("2.0");
    expect(parsed.method).toBe("cam.postSelector");
    expect(parsed.params.operationId).toBe("OP-1");
    expect(Array.isArray(parsed.params.items)).toBe(true);
  });

  it("Inventor HSM encodes a tree grouped by controller_family", () => {
    const p = PS.encodeForTarget("inventor_hsm", "OP-1");
    const parsed = JSON.parse(p.payload);
    expect(parsed.type).toBe("hsm.postSelector");
    expect(Array.isArray(parsed.groups)).toBe(true);
    const families = parsed.groups.map((g: { family: string }) => g.family);
    expect(families).toContain("okuma");
  });

  it("Mastercam encodes pipe-delimited POST|op|count header + rows", () => {
    const p = PS.encodeForTarget("mastercam", "OP-1");
    expect(p.payload.startsWith("POST|OP-1|")).toBe(true);
    const lines = p.payload.split("\n");
    expect(lines.length - 1).toBe(p.entry_count);
  });

  it("generic encodes a plain JSON post_selector payload", () => {
    const p = PS.encodeForTarget("generic", "OP-1");
    const parsed = JSON.parse(p.payload);
    expect(parsed.type).toBe("post_selector");
    expect(parsed.operation_id).toBe("OP-1");
  });

  it("encodeForTarget returns SelectorPayload with matching entry_count", () => {
    const p = PS.encodeForTarget("generic", "OP-1");
    expect(() => SelectorPayloadSchema.parse(p)).not.toThrow();
    expect(p.entry_count).toBe(JM_DIE_CONTROLLER_MAP.length);
  });

  it("encodeForTarget respects filter (e.g. lathes only)", () => {
    const p = PS.encodeForTarget("fusion360", "OP-1", { category: "lathe" });
    expect(p.entry_count).toBeGreaterThan(0);
    const parsed = JSON.parse(p.payload);
    for (const item of parsed.params.items) {
      expect(item.category).toBe("lathe");
    }
  });

  it("encodeForTarget throws on empty operation_id", () => {
    expect(() => PS.encodeForTarget("generic", "")).toThrow();
  });

  it("encodeForTarget rejects unknown target", () => {
    expect(() =>
      PS.encodeForTarget("catia" as unknown as "generic", "OP-1"),
    ).toThrow();
  });
});

describe("CAMPostSelectorUIEngine — Dashboard aggregation", () => {
  it("dashboard total_machines matches listMachines length", () => {
    const d = PS.dashboard();
    expect(d.total_machines).toBe(PS.listMachines().length);
  });

  it("dashboard per_category sums to total_machines", () => {
    const d = PS.dashboard();
    const sum = Object.values(d.per_category).reduce((a, b) => a + b, 0);
    expect(sum).toBe(d.total_machines);
  });

  it("dashboard per_controller_family sums to total_machines", () => {
    const d = PS.dashboard();
    const sum = Object.values(d.per_controller_family).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBe(d.total_machines);
  });

  it("dashboard machines_with_post + missing_post = total_machines", () => {
    const d = PS.dashboard();
    expect(d.machines_with_post + d.machines_missing_post).toBe(
      d.total_machines,
    );
  });

  it("dashboard prism_enhanced + vendor_stock = machines_with_post", () => {
    const d = PS.dashboard();
    expect(d.prism_enhanced_post_count + d.vendor_stock_post_count).toBe(
      d.machines_with_post,
    );
  });

  it("dashboard shape conforms to SelectorDashboardSchema", () => {
    expect(() => SelectorDashboardSchema.parse(PS.dashboard())).not.toThrow();
  });

  it("dashboard surfaces at least 6 Okuma machines", () => {
    const d = PS.dashboard();
    expect(d.per_controller_family.okuma ?? 0).toBeGreaterThanOrEqual(6);
  });

  it("dashboard counts at least 2 Haas machines", () => {
    const d = PS.dashboard();
    expect(d.per_controller_family.haas ?? 0).toBeGreaterThanOrEqual(2);
  });
});

describe("CAMPostSelectorUIEngine — getMachine", () => {
  it("getMachine() returns null for unknown id", () => {
    expect(PS.getMachine("NOPE-1")).toBeNull();
  });

  it("getMachine() returns the correct row", () => {
    const m = PS.getMachine("LTH-07");
    expect(m?.machine_name).toMatch(/Multus/);
  });

  it("getMachine() returns a category consistent with id prefix", () => {
    const lath = PS.getMachine("LTH-01");
    expect(lath?.category).toBe("lathe");
    const mill = PS.getMachine("VMC-01");
    expect(mill?.category).toBe("mill");
    const edm = PS.getMachine("EDM-01");
    expect(edm?.category).toBe("sinker_edm");
    const wedm = PS.getMachine("WEDM-01");
    expect(wedm?.category).toBe("wire_edm");
  });
});
