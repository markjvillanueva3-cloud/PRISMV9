/**
 * REM-MS4: Architecture Evolution Tests
 * ======================================
 * U00: Dual hook system documentation (M-020)
 * U01: FFT chatter detection (M-019, M-022)
 * U02: TF-IDF knowledge search (M-021)
 * U03: Sensor interface + registry TTL (M-023, M-025)
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const SRC = path.resolve(__dirname, "..");

describe("REM-MS4-U00: Dual Hook System Documentation", () => {
  it("M-020: HookEngine has architecture documentation", () => {
    const src = fs.readFileSync(path.join(SRC, "engines/HookEngine.ts"), "utf8");
    expect(src).toContain("DUAL hook system");
    expect(src).toContain("HookExecutor");
  });

  it("M-020: HookExecutor has cross-reference", () => {
    const src = fs.readFileSync(path.join(SRC, "engines/HookExecutor.ts"), "utf8");
    expect(src).toContain("HookEngine");
    expect(src).toContain("dual-system");
  });
});

describe("REM-MS4-U01: FFT Chatter Detection", () => {
  it("M-022: MachineConnectivityEngine has DFT frequency analysis", () => {
    const src = fs.readFileSync(path.join(SRC, "engines/MachineConnectivityEngine.ts"), "utf8");
    expect(src).toContain("magnitude");
    expect(src).toContain("Math.cos");
    expect(src).toContain("Math.sin");
    expect(src).toContain("toothPassFreq");
  });

  it("M-019: Chatter detection uses both FFT and variance", () => {
    const src = fs.readFileSync(path.join(SRC, "engines/MachineConnectivityEngine.ts"), "utf8");
    expect(src).toContain("fftChatter");
    expect(src).toContain("varianceChatter");
    // Both methods contribute to final decision
    expect(src).toMatch(/chatterDetected\s*=\s*fftChatter\s*\|\|\s*varianceChatter/);
  });
});

describe("REM-MS4-U02: TF-IDF Knowledge Search", () => {
  it("M-021: KnowledgeQueryEngine has TF-IDF scoring", () => {
    const src = fs.readFileSync(path.join(SRC, "engines/KnowledgeQueryEngine.ts"), "utf8");
    expect(src).toContain("TF-IDF");
    expect(src).toContain("idfCache");
    expect(src).toContain("cosineSim");
  });

  it("M-021: Stop words are defined for tokenization", () => {
    const src = fs.readFileSync(path.join(SRC, "engines/KnowledgeQueryEngine.ts"), "utf8");
    expect(src).toContain("STOP_WORDS");
    expect(src).toContain("tokenize");
  });

  it("M-021: IDF index builds from all 9 registries", () => {
    const src = fs.readFileSync(path.join(SRC, "engines/KnowledgeQueryEngine.ts"), "utf8");
    // Check that buildIdfIndex references all registries
    expect(src).toContain("materialRegistry.list()");
    expect(src).toContain("machineRegistry.list()");
    expect(src).toContain("toolRegistry.list()");
    expect(src).toContain("alarmRegistry.list()");
    expect(src).toContain("formulaRegistry.list()");
    expect(src).toContain("skillRegistry.list()");
    expect(src).toContain("scriptRegistry.list()");
    expect(src).toContain("agentRegistry.list()");
    expect(src).toContain("hookRegistry.list()");
  });

  it("M-021: Positional bonus preserved for exact matches", () => {
    const src = fs.readFileSync(path.join(SRC, "engines/KnowledgeQueryEngine.ts"), "utf8");
    expect(src).toContain("positionalBonus");
    // Exact match gets highest bonus
    expect(src).toMatch(/nameLower === queryLower.*[\r\n]+.*positionalBonus = 0\.4/);
  });

  it("M-021: ensureIdfIndex called before search", () => {
    const src = fs.readFileSync(path.join(SRC, "engines/KnowledgeQueryEngine.ts"), "utf8");
    expect(src).toContain("await this.ensureIdfIndex()");
  });
});

describe("REM-MS4-U03: Sensor Interface + Registry TTL", () => {
  it("M-023: SensorDataProvider interface exists", () => {
    const src = fs.readFileSync(path.join(SRC, "engines/PredictiveMaintenanceEngine.ts"), "utf8");
    expect(src).toContain("interface SensorDataProvider");
    expect(src).toContain("listMachines");
    expect(src).toContain("getMachineInfo");
    expect(src).toContain("getSensorData");
  });

  it("M-023: registerSensorProvider and clearSensorProvider exported", () => {
    const src = fs.readFileSync(path.join(SRC, "engines/PredictiveMaintenanceEngine.ts"), "utf8");
    expect(src).toContain("export function registerSensorProvider");
    expect(src).toContain("export function clearSensorProvider");
    expect(src).toContain("export function hasSensorProvider");
  });

  it("M-023: getMachineData tries real provider before fallback", () => {
    const src = fs.readFileSync(path.join(SRC, "engines/PredictiveMaintenanceEngine.ts"), "utf8");
    expect(src).toContain("activeSensorProvider");
    expect(src).toContain("getMachineData");
    // Falls back to SIMULATED_MACHINES
    expect(src).toMatch(/Fallback.*simulated/i);
  });

  it("M-023: Dispatcher reports data_source for transparency", () => {
    const src = fs.readFileSync(path.join(SRC, "engines/PredictiveMaintenanceEngine.ts"), "utf8");
    expect(src).toContain('data_source: dataSource');
    expect(src).toMatch(/real_sensor.*simulation|simulation.*real_sensor/);
  });

  it("M-025: BaseRegistry has TTL support", () => {
    const src = fs.readFileSync(path.join(SRC, "registries/BaseRegistry.ts"), "utf8");
    expect(src).toContain("ttlMs");
    expect(src).toContain("loadedAt");
    expect(src).toContain("setTtl");
    expect(src).toContain("isStale");
  });

  it("M-025: ensureInitialized checks TTL expiration", () => {
    const src = fs.readFileSync(path.join(SRC, "registries/BaseRegistry.ts"), "utf8");
    expect(src).toContain("TTL expired");
    // Re-initializes on staleness
    expect(src).toMatch(/this\.initialized = false/);
    expect(src).toMatch(/this\.items\.clear\(\)/);
  });
});
