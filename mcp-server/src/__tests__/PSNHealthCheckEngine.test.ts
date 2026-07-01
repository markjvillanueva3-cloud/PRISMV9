/** PSNHealthCheckEngine tests — HZD-PSN-01 (HZP-DASH-PSN-MS0). */
import { describe, it, expect } from "vitest";
import { PSNHealthCheckEngine, type LegInputs } from "../engines/PSNHealthCheckEngine.js";

const allHealthy = (): LegInputs => ({
  obsidian:   { memoryCount: 500, lastMemoryAgeMin: 30 },
  prismOs:    { actionCount: 45, lastInvocationAgeMin: 5 },
  wiki:       { entryCount: 720, brokenLinkPct: 0.5 },
  memories:   { indexSizeLines: 150, truncated: false },
  tribal:     { corpusEntryCount: 3900, domainsWithCoverage: 4 },
  systemViz:  { graphNodeCount: 110000, graphAgeMin: 30 },
  engines:    { built: 2700, wired: 2600, unwired: 100 },  // ~3.7% unwired
  algorithms: { count: 250 },
  formulas:   { constantsFileExists: true, inlinedViolations: 0 },
  nnGnn:      { auroc: 0.82, brier: 0.12, promoted: true },
  prismAi:    { engineCount: 7, memoCoveragePct: 85 },
});

describe("PSNHealthCheckEngine.check — happy path (all 11 legs green)", () => {
  it("all-healthy input produces 11 green / 0 amber/red/unknown", () => {
    const r = PSNHealthCheckEngine.check(allHealthy());
    expect(r.legs).toHaveLength(11);
    expect(r.summary.green).toBe(11);
    expect(r.summary.amber).toBe(0);
    expect(r.summary.red).toBe(0);
    expect(r.summary.unknown).toBe(0);
  });

  it("leg IDs are 1..11 and names are in canonical PSN order", () => {
    const r = PSNHealthCheckEngine.check(allHealthy());
    expect(r.legs.map(l => l.id)).toEqual([1,2,3,4,5,6,7,8,9,10,11]);
    expect(r.legs[0].name).toBe("Obsidian brain");
    expect(r.legs[5].name).toBe("System Viz");
    expect(r.legs[10].name).toBe("PRISM AI");
  });
});

describe("PSNHealthCheckEngine.check — per-leg thresholds", () => {
  it("Obsidian: 0 memories → red", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), obsidian: { memoryCount: 0, lastMemoryAgeMin: 0 } });
    expect(r.legs.find(l => l.name === "Obsidian brain")?.status).toBe("red");
  });

  it("Obsidian: memory exists but >24h old → amber", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), obsidian: { memoryCount: 100, lastMemoryAgeMin: 25 * 60 } });
    expect(r.legs.find(l => l.name === "Obsidian brain")?.status).toBe("amber");
  });

  it("PRISM OS: lastInvocation null → amber", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), prismOs: { actionCount: 45, lastInvocationAgeMin: null } });
    expect(r.legs.find(l => l.name === "PRISM OS")?.status).toBe("amber");
  });

  it("Wiki: 5%+ broken links → red", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), wiki: { entryCount: 700, brokenLinkPct: 6 } });
    expect(r.legs.find(l => l.name === "Wiki")?.status).toBe("red");
  });

  it("Wiki: 2-5% broken links → amber", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), wiki: { entryCount: 700, brokenLinkPct: 3 } });
    expect(r.legs.find(l => l.name === "Wiki")?.status).toBe("amber");
  });

  it("Tribal: <3 domains → amber", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), tribal: { corpusEntryCount: 3000, domainsWithCoverage: 2 } });
    expect(r.legs.find(l => l.name === "Tribal")?.status).toBe("amber");
  });

  it("System Viz: graph >6h old → amber", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), systemViz: { graphNodeCount: 100000, graphAgeMin: 7 * 60 } });
    expect(r.legs.find(l => l.name === "System Viz")?.status).toBe("amber");
  });

  it("Engines: >25% unwired → red", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), engines: { built: 1000, wired: 700, unwired: 300 } });
    expect(r.legs.find(l => l.name === "Engines")?.status).toBe("red");
  });

  it("Engines: 10-25% unwired → amber", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), engines: { built: 1000, wired: 850, unwired: 150 } });
    expect(r.legs.find(l => l.name === "Engines")?.status).toBe("amber");
  });

  it("Formulas: constants.ts missing → red", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), formulas: { constantsFileExists: false, inlinedViolations: 0 } });
    expect(r.legs.find(l => l.name === "Formulas")?.status).toBe("red");
  });

  it("Formulas: inlined-constant violations → red even with file present", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), formulas: { constantsFileExists: true, inlinedViolations: 3 } });
    expect(r.legs.find(l => l.name === "Formulas")?.status).toBe("red");
  });

  it("NN/GNN: AUROC null → red UNGRADED (today's actual state)", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), nnGnn: { auroc: null, brier: null, promoted: false } });
    const leg = r.legs.find(l => l.name === "NN/GNN");
    expect(leg?.status).toBe("red");
    expect(leg?.signal).toContain("UNGRADED");
  });

  it("NN/GNN: AUROC below gate → amber (model exists, not promoted)", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), nnGnn: { auroc: 0.65, brier: 0.20, promoted: false } });
    expect(r.legs.find(l => l.name === "NN/GNN")?.status).toBe("amber");
  });

  it("PRISM AI: memo coverage <50% → red", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), prismAi: { engineCount: 7, memoCoveragePct: 40 } });
    expect(r.legs.find(l => l.name === "PRISM AI")?.status).toBe("red");
  });

  it("PRISM AI: memo coverage 50-75% → amber (matches today's 42.9%-ish range)", () => {
    const r = PSNHealthCheckEngine.check({ ...allHealthy(), prismAi: { engineCount: 7, memoCoveragePct: 65 } });
    expect(r.legs.find(l => l.name === "PRISM AI")?.status).toBe("amber");
  });
});

describe("PSNHealthCheckEngine.check — missing inputs (R12 fail-soft)", () => {
  it("empty input → all 11 legs render unknown, never throws", () => {
    const r = PSNHealthCheckEngine.check({});
    expect(r.legs.every(l => l.status === "unknown")).toBe(true);
    expect(r.summary.unknown).toBe(11);
  });

  it("partial input → covered legs classify, missing legs render unknown", () => {
    const r = PSNHealthCheckEngine.check({
      obsidian: { memoryCount: 500, lastMemoryAgeMin: 10 },
      formulas: { constantsFileExists: true, inlinedViolations: 0 },
    });
    expect(r.legs.find(l => l.name === "Obsidian brain")?.status).toBe("green");
    expect(r.legs.find(l => l.name === "Formulas")?.status).toBe("green");
    expect(r.legs.find(l => l.name === "Wiki")?.status).toBe("unknown");
    expect(r.summary.green).toBe(2);
    expect(r.summary.unknown).toBe(9);
  });
});

describe("PSNHealthCheckEngine — validation + render", () => {
  it("negative memory count → zod throws (catches bad caller data)", () => {
    expect(() => PSNHealthCheckEngine.check({ obsidian: { memoryCount: -1, lastMemoryAgeMin: 0 } } as never)).toThrow();
  });

  it("broken link pct >100 → zod throws", () => {
    expect(() => PSNHealthCheckEngine.check({ wiki: { entryCount: 100, brokenLinkPct: 150 } } as never)).toThrow();
  });

  it("renderSummary shows counts in canonical format", () => {
    const r = PSNHealthCheckEngine.check(allHealthy());
    expect(PSNHealthCheckEngine.renderSummary(r)).toBe("[PSN-HEALTH] green=11 amber=0 red=0 unknown=0");
  });

  it("schema_version is the locked literal", () => {
    const r = PSNHealthCheckEngine.check({});
    expect(r.schema_version).toBe("psn-health-1.0.0");
  });

  it("generated_at is ISO-8601 parseable", () => {
    const r = PSNHealthCheckEngine.check({});
    expect(Number.isNaN(Date.parse(r.generated_at))).toBe(false);
  });
});
