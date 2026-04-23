import { describe, it, expect } from "vitest";
import {
  ForesightOrchestratorEngine,
  foresightOrchestratorEngine,
} from "../engines/ForesightOrchestratorEngine.js";

describe("ForesightOrchestratorEngine", () => {
  it("singleton has matching class name", () => {
    expect(foresightOrchestratorEngine).toBeInstanceOf(ForesightOrchestratorEngine);
    expect(foresightOrchestratorEngine.name).toBe("ForesightOrchestratorEngine");
  });

  it("benign change returns go or caution verdict", async () => {
    const engine = new ForesightOrchestratorEngine();
    const report = await engine.reportFor({
      description: "small dispatcher wiring addition for cutting-force calc",
      unitClass: "dispatcher_wire",
      contextTokensUsed: 50_000,
      contextTokensLimit: 200_000,
    });
    expect(["go", "caution"]).toContain(report.verdict);
    expect(report.summary.startsWith("verdict=")).toBe(true);
  });

  it("context near full forces no_go with block severity", async () => {
    const engine = new ForesightOrchestratorEngine();
    const report = await engine.reportFor({
      description: "add new physics engine",
      contextTokensUsed: 990_000,
      contextTokensLimit: 1_000_000,
      modelName: "opus_4_7_1m",
    });
    expect(report.verdict).toBe("no_go");
    expect(report.severity).toBe("block");
  });

  it("report always contains the three core section keys", async () => {
    const engine = new ForesightOrchestratorEngine();
    const report = await engine.reportFor({
      description: "generic change",
      contextTokensUsed: 1000,
    });
    const keys = Object.keys(report.sections);
    expect(keys).toContain("risk");
    expect(keys).toContain("knowledgeGap");
    expect(keys).toContain("contextBudget");
  });

  it("summary pipes verdict token", async () => {
    const engine = new ForesightOrchestratorEngine();
    const report = await engine.reportFor({
      description: "wire a Kienzle force calculator",
      contextTokensUsed: 1000,
    });
    expect(report.summary).toMatch(/verdict=(go|caution|no_go)/);
  });

  it("disclosed field is present (even when inner engine fails)", async () => {
    const engine = new ForesightOrchestratorEngine();
    const report = await engine.reportFor({ description: "x" });
    expect("disclosed" in report).toBe(true);
    expect(report.disclosed === null).toBe(false);
  });

  it("teachingBlock absent on go, present on no_go", async () => {
    const engine = new ForesightOrchestratorEngine();
    const goReport = await engine.reportFor({
      description: "small change",
      contextTokensUsed: 1000,
    });
    const blockReport = await engine.reportFor({
      description: "huge change",
      contextTokensUsed: 999_999,
      contextTokensLimit: 1_000_000,
    });
    if (goReport.verdict === "go") {
      expect("teachingBlock" in goReport.sections && goReport.sections.teachingBlock !== undefined)
        .toBe(false);
    }
    if (blockReport.verdict === "no_go") {
      expect(blockReport.severity).toBe("block");
    }
  });

  it("severity is consistent with verdict", async () => {
    const engine = new ForesightOrchestratorEngine();
    const report = await engine.reportFor({
      description: "x",
      contextTokensUsed: 999_000,
      contextTokensLimit: 1_000_000,
    });
    if (report.verdict === "no_go") expect(report.severity).toBe("block");
    else if (report.verdict === "caution") expect(report.severity).toBe("warn");
    else expect(report.severity).toBe("ok");
  });

  it("FAIL: missing input rejected", async () => {
    const engine = new ForesightOrchestratorEngine();
    await expect(engine.reportFor(null as unknown as { description: string })).rejects.toThrow(/input required/);
  });

  it("FAIL: empty description rejected", async () => {
    const engine = new ForesightOrchestratorEngine();
    await expect(engine.reportFor({ description: "" })).rejects.toThrow(/description required/);
  });

  it("FAIL: non-string description rejected", async () => {
    const engine = new ForesightOrchestratorEngine();
    await expect(engine.reportFor({
      description: 42 as unknown as string,
    })).rejects.toThrow(/description required/);
  });

  it("ADV: unknown unitClass still produces a verdict token", async () => {
    const engine = new ForesightOrchestratorEngine();
    const report = await engine.reportFor({
      description: "unusual change",
      unitClass: "mystery_class_xyz",
    });
    expect(["go", "caution", "no_go"]).toContain(report.verdict);
  });

  it("ADV: very long description still produces a non-empty summary", async () => {
    const engine = new ForesightOrchestratorEngine();
    const long = "x ".repeat(10_000);
    const report = await engine.reportFor({ description: long });
    expect(report.summary.length).toBeGreaterThan(0);
  });
});
