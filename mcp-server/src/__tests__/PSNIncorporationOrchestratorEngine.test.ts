/**
 * Tests for PSNIncorporationOrchestratorEngine.
 *
 * Real-behavior assertions (no toBeDefined() stubs per CLAUDE.md §SAFETY +
 * feedback_dont_soften_completeness_gates).
 *
 * Pure-fn engine with fs injection points — tests use temp envelope + temp
 * specs dir to verify behavior end-to-end.
 *
 * Author: charlie slot (claude-451f7328) /goal-7 iter3, 2026-05-23.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { PSNIncorporationOrchestratorEngine } from "../engines/PSNIncorporationOrchestratorEngine.js";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "psn-orch-test-"));
const ENV_PATH = path.join(TMP, "envelope.json");
const SPECS_DIR = path.join(TMP, "specs");

const TEST_ENVELOPE = {
  id: "TEST-PSN-MS0",
  phases: [
    { id: "P4-R1-NEURAL", units: ["U-N-01", "U-N-02"] },
    { id: "P8-R3-LEARNING", units: ["U-L-01"] },
    { id: "P9-R3-REASONING", units: ["U-R-01", "U-R-02"] },
    { id: "P1-R1-RETRIEVAL", units: ["U-RET-01"] }, // non-ML phase, should be filtered out
  ],
  unit_list: [
    { id: "U-N-01", title: "WEDMRecastEngine — wire-EDM recast prediction", status: "pending", cost: "M", legs: [10], note: "spark erosion" },
    { id: "U-N-02", title: "MillFeatureEngine — mill feature classification", status: "complete", cost: "S", legs: [10], note: "milling deep learn" },
    { id: "U-L-01", title: "LatheAdapterEngine — lathe LoRA adapter", status: "pending", cost: "M", legs: [10, 11], note: "lathe turning fine-tune" },
    { id: "U-R-01", title: "CADReasonerEngine — CAD blueprint reasoning", status: "pending", cost: "S", legs: [11], note: "blueprint drawing CoT" },
    { id: "U-R-02", title: "WEDMSafetyVerifierEngine — wire safety gate CoV", status: "pending", cost: "S", legs: [9, 11], note: "WEDM kerf safety_gate" },
    { id: "U-RET-01", title: "RetrievalEngine — irrelevant", status: "pending", cost: "S", legs: [3], note: "non-ML phase" },
  ],
};

beforeAll(() => {
  fs.writeFileSync(ENV_PATH, JSON.stringify(TEST_ENVELOPE, null, 2));
  fs.mkdirSync(SPECS_DIR, { recursive: true });
  // Pre-populate plans for 2 of the 4 eligible units
  fs.writeFileSync(path.join(SPECS_DIR, "U-N-01.md"), "# Plan for U-N-01\n");
  fs.writeFileSync(path.join(SPECS_DIR, "U-R-02.md"), "# Plan for U-R-02\n");
});

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

describe("PSNIncorporationOrchestratorEngine.listEligible", () => {
  it("returns only ML-phase units that are not complete", () => {
    const eng = new PSNIncorporationOrchestratorEngine({ envelopePath: ENV_PATH, specsDir: SPECS_DIR });
    const r = eng.listEligible();
    expect(r.envelopeId).toBe("TEST-PSN-MS0");
    expect(r.totalEligible).toBe(4); // U-N-01, U-L-01, U-R-01, U-R-02 (U-N-02 complete, U-RET-01 not in ML phase)
    expect(r.units.map((u) => u.id).sort()).toEqual(["U-L-01", "U-N-01", "U-R-01", "U-R-02"]);
  });

  it("exposes the canonical ML phase set", () => {
    const eng = new PSNIncorporationOrchestratorEngine({ envelopePath: ENV_PATH, specsDir: SPECS_DIR });
    const r = eng.listEligible();
    expect(new Set(r.mlPhases)).toEqual(new Set(["P4-R1-NEURAL", "P8-R3-LEARNING", "P9-R3-REASONING"]));
  });
});

describe("PSNIncorporationOrchestratorEngine.planCoverage", () => {
  it("counts plans on disk vs eligible units", () => {
    const eng = new PSNIncorporationOrchestratorEngine({ envelopePath: ENV_PATH, specsDir: SPECS_DIR });
    const r = eng.planCoverage();
    expect(r.totalEligible).toBe(4);
    expect(r.plansOnDisk).toBe(2);
    expect(r.withPlans.sort()).toEqual(["U-N-01", "U-R-02"]);
    expect(r.withoutPlans.sort()).toEqual(["U-L-01", "U-R-01"]);
  });

  it("handles missing specs dir gracefully", () => {
    const eng = new PSNIncorporationOrchestratorEngine({
      envelopePath: ENV_PATH,
      specsDir: path.join(TMP, "nonexistent-dir"),
    });
    const r = eng.planCoverage();
    expect(r.plansOnDisk).toBe(0);
    expect(r.withoutPlans.length).toBe(4);
  });
});

describe("PSNIncorporationOrchestratorEngine.pickForSlot", () => {
  it("charlie matches wire/WEDM/spark/safety_gate units", () => {
    const eng = new PSNIncorporationOrchestratorEngine({ envelopePath: ENV_PATH, specsDir: SPECS_DIR });
    const r = eng.pickForSlot("charlie");
    expect(r.slot).toBe("charlie");
    expect(r.matched.map((u) => u.id).sort()).toEqual(["U-N-01", "U-R-02"]);
    expect(r.unmatched).toBe(2);
  });

  it("bravo matches lathe/turning units", () => {
    const eng = new PSNIncorporationOrchestratorEngine({ envelopePath: ENV_PATH, specsDir: SPECS_DIR });
    const r = eng.pickForSlot("bravo");
    expect(r.matched.map((u) => u.id)).toEqual(["U-L-01"]);
  });

  it("delta matches CAD/blueprint units", () => {
    const eng = new PSNIncorporationOrchestratorEngine({ envelopePath: ENV_PATH, specsDir: SPECS_DIR });
    const r = eng.pickForSlot("delta");
    expect(r.matched.map((u) => u.id)).toEqual(["U-R-01"]);
  });

  it("unknown slot returns zero matches + full unmatched count", () => {
    const eng = new PSNIncorporationOrchestratorEngine({ envelopePath: ENV_PATH, specsDir: SPECS_DIR });
    const r = eng.pickForSlot("nonexistent-slot");
    expect(r.matched).toHaveLength(0);
    expect(r.unmatched).toBe(4);
  });

  it("slot match is case-insensitive", () => {
    const eng = new PSNIncorporationOrchestratorEngine({ envelopePath: ENV_PATH, specsDir: SPECS_DIR });
    const r = eng.pickForSlot("CHARLIE");
    expect(r.matched.length).toBe(2);
  });
});

describe("PSNIncorporationOrchestratorEngine.getUnit / readPlan", () => {
  it("getUnit returns full record by ID", () => {
    const eng = new PSNIncorporationOrchestratorEngine({ envelopePath: ENV_PATH, specsDir: SPECS_DIR });
    const u = eng.getUnit("U-N-01");
    expect(u).not.toBeNull();
    expect(u!.title).toBe("WEDMRecastEngine — wire-EDM recast prediction");
    expect(u!.cost).toBe("M");
  });

  it("getUnit returns null for unknown ID", () => {
    const eng = new PSNIncorporationOrchestratorEngine({ envelopePath: ENV_PATH, specsDir: SPECS_DIR });
    expect(eng.getUnit("U-NONEXISTENT")).toBeNull();
  });

  it("readPlan returns plan content when on disk", () => {
    const eng = new PSNIncorporationOrchestratorEngine({ envelopePath: ENV_PATH, specsDir: SPECS_DIR });
    const plan = eng.readPlan("U-N-01");
    expect(plan).toContain("# Plan for U-N-01");
  });

  it("readPlan returns null when plan missing", () => {
    const eng = new PSNIncorporationOrchestratorEngine({ envelopePath: ENV_PATH, specsDir: SPECS_DIR });
    expect(eng.readPlan("U-L-01")).toBeNull();
  });
});
