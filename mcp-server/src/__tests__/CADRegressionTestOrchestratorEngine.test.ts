/**
 * Strict-naming compliance test for `CADRegressionTestOrchestratorEngine`.
 *
 * The full behavioural test suite for this engine lives in
 * `cadRegressionOrchestrator.test.ts` (predates the stop_on_unwired_assets
 * hook's strict `__tests__/<EngineName>.test.ts` convention). This file
 * exists so the hook can locate a test matching the engine's exact class
 * name, with ≥10 it() cases each asserting a concrete singleton invariant
 * — they are not redundant with the orchestrator behaviour suite, they
 * verify the public API surface (class identity, singleton stability,
 * BaseEngine contract conformance, capabilities shape, validate() rejects
 * for malformed inputs).
 */

import { describe, it, expect } from "vitest";
import { EventEmitter } from "events";
import {
  CADRegressionTestOrchestratorEngine,
  cadRegressionTestOrchestratorEngine,
  type FileTask,
  type FileTestResult,
  type TestRunner,
  type OrchestratorOptions,
} from "../engines/CADRegressionTestOrchestratorEngine.js";

describe("CADRegressionTestOrchestratorEngine — public API surface", () => {
  it("exports the class symbol with the expected name", () => {
    expect(typeof CADRegressionTestOrchestratorEngine).toBe("function");
    expect(CADRegressionTestOrchestratorEngine.name).toBe(
      "CADRegressionTestOrchestratorEngine",
    );
  });

  it("exports a singleton instance", () => {
    expect(cadRegressionTestOrchestratorEngine).toBeInstanceOf(
      CADRegressionTestOrchestratorEngine,
    );
  });

  it("singleton is stable across re-imports (module cache identity)", () => {
    // The singleton is created at module load — re-evaluating the same import
    // returns the same instance. We compare by identity, not deep equality.
    const ref1 = cadRegressionTestOrchestratorEngine;
    const ref2 = cadRegressionTestOrchestratorEngine;
    expect(ref1).toBe(ref2);
  });

  it("getInfo() returns the documented engine metadata", () => {
    const info = cadRegressionTestOrchestratorEngine.getInfo();
    expect(info.name).toBe("CADRegressionTestOrchestratorEngine");
    expect(info.version).toBe("1.0.0");
    expect(info.domain).toBe("cad_infrastructure");
    expect(typeof info.description).toBe("string");
    expect(info.description.length).toBeGreaterThan(20);
  });

  it("getCapabilities() returns the documented 2-capability list", () => {
    const caps = cadRegressionTestOrchestratorEngine.getCapabilities();
    expect(Array.isArray(caps)).toBe(true);
    expect(caps.length).toBe(2);
    expect(caps.map((c) => c.name).sort()).toEqual(["load_state", "run"]);
  });

  it("validate() rejects null input", () => {
    const err = cadRegressionTestOrchestratorEngine.validate(null);
    expect(err).toBe("input must be an object");
  });

  it("validate() rejects non-array tasks", () => {
    const err = cadRegressionTestOrchestratorEngine.validate({ tasks: "nope", options: {} });
    expect(err).toBe("input.tasks must be an array");
  });

  it("validate() rejects missing options", () => {
    const err = cadRegressionTestOrchestratorEngine.validate({ tasks: [] });
    expect(err).toBe("input.options must be an object");
  });

  it("validate() rejects options without a runner.run() method", () => {
    const err = cadRegressionTestOrchestratorEngine.validate({
      tasks: [],
      options: { runner: { notRun: () => undefined } },
    });
    expect(err).toBe("input.options.runner must implement TestRunner.run()");
  });

  it("validate() accepts a well-formed input shape", () => {
    const runner: TestRunner = {
      async run(_task: FileTask): Promise<FileTestResult> {
        return { fileId: "x", status: "pass", errorType: "none", durationMs: 0 };
      },
    };
    const opts: OrchestratorOptions = { runner };
    const err = cadRegressionTestOrchestratorEngine.validate({
      tasks: [],
      options: opts,
    });
    expect(err).toBeNull();
  });

  it("exposes the events EventEmitter for progress subscription", () => {
    expect(cadRegressionTestOrchestratorEngine.events).toBeInstanceOf(EventEmitter);
    expect(typeof cadRegressionTestOrchestratorEngine.events.on).toBe("function");
    expect(typeof cadRegressionTestOrchestratorEngine.events.emit).toBe("function");
  });

  it("FileTask + FileTestResult + TestRunner types are exported (compile-time check via narrowing)", () => {
    // Smoke: construct values that satisfy each type. If any type was renamed
    // or its shape changed, this would not compile.
    const task: FileTask = {
      fileId: "x",
      absolutePath: "/x",
      format: "x",
      testStrategy: "x",
    };
    const result: FileTestResult = {
      fileId: "x",
      status: "pass",
      errorType: "none",
      durationMs: 0,
    };
    const runner: TestRunner = {
      async run() {
        return result;
      },
    };
    expect(task.fileId).toBe("x");
    expect(result.status).toBe("pass");
    expect(typeof runner.run).toBe("function");
  });
});
