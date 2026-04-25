/**
 * groundTruthRegistryEngine.test.ts — CAD-GROUND-TRUTH-MS0/U-CGT08
 *
 * Validates index construction, query API, JM Die path inference,
 * complexity tiering, and manifest persistence/load round-trip.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  GroundTruthRegistryEngine,
  groundTruthRegistryEngine,
  RegistryManifestSchema,
  inferCustomerAndMachine,
  inferComplexity,
  MACHINE_CATEGORIES,
  COMPLEXITY_TIERS,
} from "../engines/GroundTruthRegistryEngine.js";

let engine: GroundTruthRegistryEngine;
let tmpRoot: string;

beforeEach(() => {
  engine = new GroundTruthRegistryEngine();
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cgt08-"));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

// ── Fixture builders ────────────────────────────────────────────────────────

function writeBundle(
  outRoot: string,
  fileId: string,
  bundle: Record<string, unknown>,
  featureCount?: number,
): void {
  const dir = path.join(outRoot, fileId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "bundle.json"),
    JSON.stringify({
      fileId,
      bundleDir: dir,
      ...bundle,
    }, null, 2),
  );
  if (featureCount !== undefined) {
    const features = Array.from({ length: featureCount }, (_, i) => ({
      id: `f${i}`,
      type: "Body",
      name: `f${i}`,
    }));
    fs.writeFileSync(
      path.join(dir, "feature-tree.json"),
      JSON.stringify({ features }),
    );
  }
}

function alcoaLatheBundle(fileId: string, featureCount = 3) {
  return {
    fileId,
    sourcePath: `H:/PRISM/JM DIE/CNC LATHE/ALCOA/${fileId}.MIN`,
    format: ".MIN",
    featureCount,
    bundle: {
      sourcePath: `H:/PRISM/JM DIE/CNC LATHE/ALCOA/${fileId}.MIN`,
      format: ".MIN",
      status: "ok",
      stages: {
        featureTree: { ok: true, signature: "f".repeat(64) },
        dimensionalSig: {
          ok: true,
          signature: "d".repeat(64),
          envelopeM: 0.05,
        },
        step: { ok: true },
        screenshots: { ok: true },
      },
    },
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("inferCustomerAndMachine — JM Die paths", () => {
  it("recognizes CNC LATHE under JM DIE → customer + lathe", () => {
    const r = inferCustomerAndMachine(
      "H:/PRISM/JM DIE/CNC LATHE/ALCOA/PART-001.MIN",
    );
    expect(r.customer).toBe("ALCOA");
    expect(r.machineCategory).toBe("lathe");
  });

  it("recognizes CNC MILL → mill", () => {
    const r = inferCustomerAndMachine(
      "H:/PRISM/JM DIE/CNC MILL/ITW/x.mcx-8",
    );
    expect(r.machineCategory).toBe("mill");
    expect(r.customer).toBe("ITW");
  });

  it("recognizes WIRE EDM → wedm", () => {
    const r = inferCustomerAndMachine(
      "H:/PRISM/JM DIE/WIRE EDM/OPTIMAS/d.NC",
    );
    expect(r.machineCategory).toBe("wedm");
    expect(r.customer).toBe("OPTIMAS");
  });

  it("recognizes Sinker EDM under JM DIE → edm", () => {
    const r = inferCustomerAndMachine(
      "H:/PRISM/JM DIE/SINKER EDM/HOLO-KROME/p.dat",
    );
    expect(r.machineCategory).toBe("edm");
    expect(r.customer).toBe("HOLO-KROME");
  });

  it("handles backslash Windows paths (case insensitive)", () => {
    const r = inferCustomerAndMachine(
      "H:\\PRISM\\jm die\\cnc lathe\\sfs\\part.MIN",
    );
    expect(r.customer).toBe("SFS");
    expect(r.machineCategory).toBe("lathe");
  });

  it("falls back to UNKNOWN/other when path doesn't match conventions", () => {
    const r = inferCustomerAndMachine("/some/random/path/x.step");
    expect(r.customer).toBe("UNKNOWN");
    expect(r.machineCategory).toBe("other");
  });
});

describe("inferComplexity — tiering heuristic", () => {
  it("≤5 features = simple regardless of envelope", () => {
    expect(inferComplexity(0, 0.001)).toBe("simple");
    expect(inferComplexity(5, 5.0)).toBe("simple");
  });

  it("6..20 features = medium when envelope is small", () => {
    expect(inferComplexity(10, 0.05)).toBe("medium");
    expect(inferComplexity(20, 0.299)).toBe("medium");
  });

  it("medium feature count + large envelope (>0.3 m) bumps to complex", () => {
    expect(inferComplexity(15, 0.5)).toBe("complex");
  });

  it(">20 features = complex always", () => {
    expect(inferComplexity(50, 0.001)).toBe("complex");
    expect(inferComplexity(21, undefined)).toBe("complex");
  });
});

describe("buildIndex — corpus scan", () => {
  it("indexes 3 ALCOA lathe bundles into byCustomer + byMachine", () => {
    writeBundle(tmpRoot, "P1", alcoaLatheBundle("P1").bundle, 3);
    writeBundle(tmpRoot, "P2", alcoaLatheBundle("P2", 8).bundle, 8);
    writeBundle(tmpRoot, "P3", alcoaLatheBundle("P3").bundle, 3);
    const stats = engine.buildIndex(tmpRoot);
    expect(stats.total).toBe(3);
    expect(engine.size()).toBe(3);
    expect(engine.findByCustomer("ALCOA").length).toBe(3);
    expect(engine.findByCustomer("alcoa").length).toBe(3); // case-insensitive
    expect(engine.findByMachineCategory("lathe").length).toBe(3);
    expect(stats.byMachineCategory.lathe).toBe(3);
    expect(stats.byCustomer.ALCOA).toBe(3);
  });

  it("skips bundles with status != ok by default; includes them when opted in", () => {
    writeBundle(tmpRoot, "OK1", alcoaLatheBundle("OK1").bundle, 3);
    writeBundle(tmpRoot, "F1", {
      sourcePath: "H:/PRISM/JM DIE/CNC LATHE/ALCOA/F1.MIN",
      format: ".MIN",
      status: "failed",
      stages: { step: { ok: false } },
    });
    expect(engine.buildIndex(tmpRoot).total).toBe(1);
    const all = engine.buildIndex(tmpRoot, { includeNonOk: true });
    expect(all.total).toBe(2);
    expect(all.byStatus.failed).toBe(1);
  });

  it("ignores _checkpoints/ and other underscore-prefixed dirs", () => {
    writeBundle(tmpRoot, "P1", alcoaLatheBundle("P1").bundle, 3);
    fs.mkdirSync(path.join(tmpRoot, "_checkpoints"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, "_checkpoints", "x.json"),
      "{}",
    );
    fs.mkdirSync(path.join(tmpRoot, "_tmp-scratch"), { recursive: true });
    expect(engine.buildIndex(tmpRoot).total).toBe(1);
  });

  it("skips directories with no bundle.json (no false entries)", () => {
    fs.mkdirSync(path.join(tmpRoot, "EMPTY"), { recursive: true });
    writeBundle(tmpRoot, "P1", alcoaLatheBundle("P1").bundle, 3);
    expect(engine.buildIndex(tmpRoot).total).toBe(1);
  });

  it("skips bundle.json that fails schema parse (corrupt data)", () => {
    fs.mkdirSync(path.join(tmpRoot, "BAD"), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, "BAD", "bundle.json"), "not json");
    writeBundle(tmpRoot, "OK1", alcoaLatheBundle("OK1").bundle, 3);
    expect(engine.buildIndex(tmpRoot).total).toBe(1);
  });

  it("throws when outputRoot does not exist", () => {
    expect(() =>
      engine.buildIndex(path.join(tmpRoot, "missing")),
    ).toThrow(/does not exist/);
    expect(() => engine.buildIndex("")).toThrow(/non-empty string/);
  });
});

describe("query API — exit-criterion sample", () => {
  beforeEach(() => {
    // ALCOA lathe: 12 simple, 4 medium, 2 complex
    for (let i = 0; i < 18; i++) {
      const fc = i < 12 ? 3 : i < 16 ? 12 : 25;
      writeBundle(
        tmpRoot,
        `ALCOA-${String(i).padStart(3, "0")}`,
        alcoaLatheBundle(`ALCOA-${String(i).padStart(3, "0")}`, fc).bundle,
        fc,
      );
    }
    // ITW mill: 5 simple
    for (let i = 0; i < 5; i++) {
      writeBundle(tmpRoot, `ITW-${i}`, {
        sourcePath: `H:/PRISM/JM DIE/CNC MILL/ITW/ITW-${i}.mcx-8`,
        format: ".mcx-8",
        status: "ok",
        stages: {
          featureTree: { ok: true },
          dimensionalSig: { ok: true, envelopeM: 0.02 },
          step: { ok: true },
          screenshots: { ok: true },
        },
      }, 2);
    }
    engine.buildIndex(tmpRoot);
  });

  it("returns 10-file ALCOA lathe sample in <100 ms with limit honored", () => {
    const start = Date.now();
    const sample = engine.query(
      { customer: "ALCOA", machineCategory: "lathe", status: "ok" },
      { limit: 10, sortBy: "fileId" },
    );
    const elapsed = Date.now() - start;
    expect(sample.length).toBe(10);
    expect(elapsed).toBeLessThan(100);
    expect(sample.every((e) => e.customer === "ALCOA")).toBe(true);
    expect(sample.every((e) => e.machineCategory === "lathe")).toBe(true);
    // sorted ascending by fileId
    expect(sample[0]?.fileId).toBe("ALCOA-000");
    expect(sample[9]?.fileId).toBe("ALCOA-009");
  });

  it("findByComplexity buckets entries correctly", () => {
    expect(engine.findByComplexity("simple").length).toBe(12 + 5); // ALCOA + ITW
    expect(engine.findByComplexity("medium").length).toBe(4);
    expect(engine.findByComplexity("complex").length).toBe(2);
  });

  it("findByFormat partitions by extension", () => {
    expect(engine.findByFormat(".MIN").length).toBe(18);
    expect(engine.findByFormat(".mcx-8").length).toBe(5);
    expect(engine.findByFormat(".unknown").length).toBe(0);
  });

  it("findByFileId returns the single entry or null", () => {
    expect(engine.findByFileId("ALCOA-007")?.machineCategory).toBe("lathe");
    expect(engine.findByFileId("missing")).toBeNull();
  });

  it("compound query returns intersection only", () => {
    const millOnly = engine.query({ machineCategory: "mill" });
    expect(millOnly.length).toBe(5);
    expect(millOnly.every((e) => e.customer === "ITW")).toBe(true);

    const alcoaComplex = engine.query({
      customer: "ALCOA",
      complexity: "complex",
    });
    expect(alcoaComplex.length).toBe(2);
  });

  it("sortBy=featureCount orders ascending", () => {
    const sorted = engine.query(
      { customer: "ALCOA" },
      { sortBy: "featureCount", limit: 18 },
    );
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.featureCount).toBeGreaterThanOrEqual(
        sorted[i - 1]!.featureCount,
      );
    }
  });
});

describe("manifest persistence", () => {
  it("dumpManifest then loadManifest reproduces stats + queries", async () => {
    writeBundle(tmpRoot, "P1", alcoaLatheBundle("P1", 3).bundle, 3);
    writeBundle(tmpRoot, "P2", alcoaLatheBundle("P2", 12).bundle, 12);
    engine.buildIndex(tmpRoot);
    const manifestPath = path.join(tmpRoot, "_index", "registry.json");
    await engine.dumpManifest(manifestPath);
    expect(fs.existsSync(manifestPath)).toBe(true);

    const fresh = new GroundTruthRegistryEngine();
    const loaded = await fresh.loadManifest(manifestPath);
    expect(RegistryManifestSchema.safeParse(loaded).success).toBe(true);
    expect(fresh.size()).toBe(2);
    expect(fresh.findByCustomer("ALCOA").length).toBe(2);
    expect(fresh.getStats().byCustomer.ALCOA).toBe(2);
  });

  it("dumpManifest before buildIndex throws", async () => {
    await expect(
      engine.dumpManifest(path.join(tmpRoot, "x.json")),
    ).rejects.toThrow(/before buildIndex/);
  });

  it("loadManifest rejects malformed JSON with structured error", async () => {
    const badPath = path.join(tmpRoot, "bad.json");
    fs.writeFileSync(badPath, '{"schemaVersion":"9.9.9"}');
    await expect(engine.loadManifest(badPath)).rejects.toThrow(
      /manifest invalid/,
    );
  });

  it("validate ok=true for fresh manifest, ok=false for malformed", () => {
    writeBundle(tmpRoot, "P1", alcoaLatheBundle("P1", 3).bundle, 3);
    engine.buildIndex(tmpRoot);
    const manifest = {
      schemaVersion: "1.0.0" as const,
      outputRoot: tmpRoot,
      builtAt: new Date().toISOString(),
      entries: [],
      stats: {
        total: 0,
        byFormat: {},
        byCustomer: {},
        byMachineCategory: {},
        byComplexity: {},
        byStatus: {},
      },
    };
    expect(engine.validate(manifest).ok).toBe(true);
    const bad = engine.validate({ schemaVersion: "1.0.0" });
    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(2);
  });
});

describe("metadata + constants", () => {
  it("singleton schemaVersion is 1.0.0", () => {
    expect(groundTruthRegistryEngine.schemaVersion).toBe("1.0.0");
  });

  it("MACHINE_CATEGORIES + COMPLEXITY_TIERS are stable enums", () => {
    expect(MACHINE_CATEGORIES).toContain("lathe");
    expect(MACHINE_CATEGORIES).toContain("mill");
    expect(MACHINE_CATEGORIES).toContain("wedm");
    expect(MACHINE_CATEGORIES).toContain("edm");
    expect(MACHINE_CATEGORIES).toContain("other");
    expect(COMPLEXITY_TIERS).toEqual(["simple", "medium", "complex"]);
  });
});
