/**
 * MonolithSurfaceFinishDatabaseEngine tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-SURFACE-FINISH-LOADER.
 */

import { describe, it, expect } from "vitest";
import {
  MonolithSurfaceFinishDatabaseEngine,
  monolithSurfaceFinishDatabaseEngine,
  RZ_TO_RA_FACTOR,
} from "../engines/MonolithSurfaceFinishDatabaseEngine.js";

const engine = monolithSurfaceFinishDatabaseEngine;

describe("MonolithSurfaceFinishDatabaseEngine — data integrity", () => {
  it("exports a singleton matching the class", () => {
    expect(engine).toBeInstanceOf(MonolithSurfaceFinishDatabaseEngine);
  });

  it("stats() returns 5 symbols + 12 N-grades + 6 applications = 23 total", () => {
    const s = engine.stats();
    expect(s.symbols).toBe(5);
    expect(s.n_grades).toBe(12);
    expect(s.applications).toBe(6);
    expect(s.total).toBe(23);
  });

  it("listSymbols returns 5 ISO drafting symbols", () => {
    expect(engine.listSymbols()).toHaveLength(5);
  });

  it("listNGrades returns 12 grades N1..N12", () => {
    const grades = engine.listNGrades().map((g) => g.grade).sort();
    expect(grades).toEqual([
      "N1", "N10", "N11", "N12", "N2", "N3", "N4", "N5", "N6", "N7", "N8", "N9",
    ]);
  });

  it("listApplications returns 6 application guides", () => {
    const apps = engine.listApplications().map((a) => a.application).sort();
    expect(apps).toEqual([
      "bearing", "castSurface", "generalMachined", "roughMachined", "seal", "slideways",
    ]);
  });

  it("N7 carries the canonical Ra=1.6μm (turning/milling)", () => {
    const n7 = engine.getNGrade("N7");
    expect(n7?.ra_um).toBe(1.6);
    expect(n7?.ra_uin).toBe(63);
    expect(n7?.process).toMatch(/turning|milling/i);
  });

  it("N1 has Ra=0.025μm (superfinishing tier)", () => {
    expect(engine.getNGrade("N1")?.ra_um).toBe(0.025);
  });

  it("N12 has Ra=50μm (sand casting tier)", () => {
    expect(engine.getNGrade("N12")?.ra_um).toBe(50.0);
  });

  it("application 'bearing' → N4 grade (Ra=0.2μm)", () => {
    const b = engine.getApplication("bearing");
    expect(b?.grade).toBe("N4");
    expect(b?.ra_um).toBe(0.2);
  });

  it("symbol basicSymbol = '√' (machining required)", () => {
    expect(engine.getSymbol("basicSymbol")?.symbol).toBe("√");
  });

  it("RZ_TO_RA_FACTOR = 4 (monolith approximation)", () => {
    expect(RZ_TO_RA_FACTOR).toBe(4);
  });
});

describe("MonolithSurfaceFinishDatabaseEngine — parseCallout()", () => {
  it("parses 'Ra 1.6' callout", () => {
    const r = engine.parseCallout("Ra 1.6");
    expect(r.parameter).toBe("Ra");
    expect(r.value).toBe(1.6);
    expect(r.unit).toBe("μm");
    expect(r.grade).toBe("N7");
  });

  it("parses 'Ra1.6' without space", () => {
    const r = engine.parseCallout("Ra1.6");
    expect(r.parameter).toBe("Ra");
    expect(r.value).toBe(1.6);
  });

  it("parses 'Rz 6.3' and computes Ra equivalent (Rz/4)", () => {
    const r = engine.parseCallout("Rz 6.3");
    expect(r.parameter).toBe("Rz");
    expect(r.value).toBe(6.3);
    expect(r.raEquivalent).toBeCloseTo(6.3 / 4, 5);
  });

  it("parses 'N7' grade callout (resolves to Ra+process)", () => {
    const r = engine.parseCallout("N7");
    expect(r.parameter).toBe("Ra");
    expect(r.grade).toBe("N7");
    expect(r.value).toBe(1.6);
    expect(r.process).toMatch(/turning|milling/i);
  });

  it("parses '32 µin' micro-inch callout", () => {
    const r = engine.parseCallout("32 µin");
    expect(r.parameter).toBe("Ra");
    expect(r.value).toBe(32);
    expect(r.unit).toBe("μin");
    expect(r.value_um).toBeCloseTo(0.8128, 4);  // 32 * 0.0254
  });

  it("returns empty-fields result on unrecognized callout (no throw)", () => {
    const r = engine.parseCallout("garbage");
    expect(r.raw).toBe("garbage");
    expect(r.parameter).toBeNull();
    expect(r.value).toBeNull();
  });

  it("returns empty result on empty / non-string input", () => {
    expect(engine.parseCallout("").parameter).toBeNull();
    expect(engine.parseCallout(null as unknown as string).parameter).toBeNull();
  });
});

describe("MonolithSurfaceFinishDatabaseEngine — findGrade()", () => {
  it("Ra 1.6 μm → N7 (exact match)", () => {
    expect(engine.findGrade(1.6, "μm")).toBe("N7");
  });

  it("Ra 0.025 μm → N1", () => {
    expect(engine.findGrade(0.025, "μm")).toBe("N1");
  });

  it("Ra 63 μin → N7 (converts to ~1.6 μm)", () => {
    expect(engine.findGrade(63, "μin")).toBe("N7");
  });

  it("Ra 1.5 μm → N7 (closest match, not exact)", () => {
    expect(engine.findGrade(1.5, "μm")).toBe("N7");
  });

  it("returns null on non-finite value", () => {
    expect(engine.findGrade(NaN, "μm")).toBeNull();
    expect(engine.findGrade(Infinity, "μm")).toBeNull();
  });

  it("returns null on non-string unit", () => {
    expect(engine.findGrade(1.6, 123 as unknown as string)).toBeNull();
  });
});

describe("MonolithSurfaceFinishDatabaseEngine — getRecommendedProcess()", () => {
  it("targetRa 0.15 μm → N4 (first grade with Ra ≥ 0.15)", () => {
    // Monolith semantic: returns FIRST grade where data.ra_um ≥ target.
    // N3=0.1 < 0.15 (insufficient), N4=0.2 ≥ 0.15 (first achievable).
    const r = engine.getRecommendedProcess(0.15);
    expect(r?.grade).toBe("N4");
    expect(r?.achievableRa).toBe(0.2);
  });

  it("targetRa 1.0 μm → N7 (first ≥ target; N7=1.6 ≥ 1.0)", () => {
    expect(engine.getRecommendedProcess(1.0)?.grade).toBe("N7");
  });

  it("targetRa 0.0 → N1 (highest finish)", () => {
    expect(engine.getRecommendedProcess(0)?.grade).toBe("N1");
  });

  it("targetRa > 50μm → null (no grade achievable)", () => {
    expect(engine.getRecommendedProcess(1000)).toBeNull();
  });

  it("returns null on negative target", () => {
    expect(engine.getRecommendedProcess(-1)).toBeNull();
  });

  it("returns null on NaN", () => {
    expect(engine.getRecommendedProcess(NaN)).toBeNull();
  });
});

describe("MonolithSurfaceFinishDatabaseEngine — convert()", () => {
  it("μm → μin (1 μm = 39.37 μin)", () => {
    expect(engine.convert(1, "μm", "μin")).toBeCloseTo(39.37, 1);
  });

  it("μin → μm (32 μin ≈ 0.8128 μm)", () => {
    expect(engine.convert(32, "μin", "μm")).toBeCloseTo(0.8128, 4);
  });

  it("Ra → Rz uses factor 4", () => {
    expect(engine.convert(1.6, "Ra", "Rz")).toBe(6.4);
  });

  it("Rz → Ra uses factor 4", () => {
    expect(engine.convert(6.4, "Rz", "Ra")).toBe(1.6);
  });

  it("unknown conversion returns input unchanged", () => {
    expect(engine.convert(1.6, "X", "Y")).toBe(1.6);
  });

  it("NaN input returns NaN (no throw)", () => {
    expect(Number.isNaN(engine.convert(NaN, "μm", "μin"))).toBe(true);
  });
});

describe("MonolithSurfaceFinishDatabaseEngine — search()", () => {
  it("finds N-grade by grade label", () => {
    const hits = engine.search("N7");
    expect(hits.some((h) => h._kind === "n_grade" && h.record.grade === "N7")).toBe(true);
  });

  it("finds application by name", () => {
    const hits = engine.search("bearing");
    expect(hits.some((h) => h._kind === "application")).toBe(true);
  });

  it("finds symbol by meaning text", () => {
    const hits = engine.search("machining");
    expect(hits.some((h) => h._kind === "symbol")).toBe(true);
  });

  it("returns [] on empty / non-string", () => {
    expect(engine.search("")).toEqual([]);
    expect(engine.search(null as unknown as string)).toEqual([]);
  });

  it("respects limit", () => {
    expect(engine.search("a", 2).length).toBeLessThanOrEqual(2);
  });
});

describe("MonolithSurfaceFinishDatabaseEngine — get* fail-soft", () => {
  it("getNGrade null on unknown grade", () => {
    expect(engine.getNGrade("ZZZ")).toBeNull();
    expect(engine.getNGrade("")).toBeNull();
  });

  it("getApplication null on unknown app", () => {
    expect(engine.getApplication("ZZZ")).toBeNull();
  });

  it("getSymbol null on unknown id", () => {
    expect(engine.getSymbol("ZZZ")).toBeNull();
  });
});
