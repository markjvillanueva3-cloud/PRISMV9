/**
 * actionTelemetry.test.ts -- unit tests for logActionTelemetry (shared dispatcher latency/usage telemetry).
 *
 * Verifies the JSONL contract every dispatcher (calc, quoting, ...) relies on: correct fields,
 * append semantics (the per-query "counter" is line-count per action), optional dispatcher tag,
 * and the never-throw guarantee (telemetry must NEVER crash a dispatcher). Hermetic via the
 * filePath DI param (U-QP-TELEMETRY-WIRE) -- no homedir writes.
 */
import { describe, it, expect, afterEach } from "vitest";
import { readFileSync, existsSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { logActionTelemetry } from "../utils/actionTelemetry.js";

const tmpRoots: string[] = [];
function freshPath(): string {
  const dir = join(tmpdir(), `prism-telemetry-test-${Date.now()}-${process.pid}-${tmpRoots.length}`);
  tmpRoots.push(dir);
  return join(dir, "action-latency.jsonl");
}
afterEach(() => {
  for (const d of tmpRoots.splice(0)) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
  }
});
function readEntries(p: string): any[] {
  return readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

describe("logActionTelemetry", () => {
  it("writes a JSONL entry with the full contract (action, latency_ms, success, dispatcher, timestamp)", () => {
    const p = freshPath();
    logActionTelemetry("fair_market_value", 42, true, "prism_quoting", p);
    const e = readEntries(p);
    expect(e).toHaveLength(1);
    expect(e[0].action).toBe("fair_market_value");
    expect(e[0].latency_ms).toBe(42);
    expect(e[0].success).toBe(true);
    expect(e[0].dispatcher).toBe("prism_quoting");
    expect(typeof e[0].timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(e[0].timestamp))).toBe(false);
  });

  it("appends -- N calls produce N lines (per-query usage counter = line-count per action)", () => {
    const p = freshPath();
    logActionTelemetry("gcode_cycle_time", 10, true, "prism_quoting", p);
    logActionTelemetry("gcode_cycle_time", 12, true, "prism_quoting", p);
    logActionTelemetry("fair_market_value", 5, false, "prism_quoting", p);
    const e = readEntries(p);
    expect(e).toHaveLength(3);
    expect(e.filter((x) => x.action === "gcode_cycle_time")).toHaveLength(2);
    expect(e.find((x) => x.action === "fair_market_value").success).toBe(false);
  });

  it("omits the dispatcher field when not provided", () => {
    const p = freshPath();
    logActionTelemetry("camera_intake_route", 7, true, undefined, p);
    const e = readEntries(p);
    expect(e[0]).not.toHaveProperty("dispatcher");
    expect(e[0].action).toBe("camera_intake_route");
  });

  it("records a failed action with success:false (adversarial: failure path is observable)", () => {
    const p = freshPath();
    logActionTelemetry("unknown_action", 0, false, "prism_quoting", p);
    const e = readEntries(p);
    expect(e[0].success).toBe(false);
    expect(e[0].latency_ms).toBe(0);
  });

  it("NEVER throws when the target path is unwritable (telemetry must not crash a dispatcher)", () => {
    // Parent of the target is an existing FILE -> mkdir/append must fail internally and be swallowed.
    const blocker = join(tmpdir(), `prism-telemetry-blocker-${Date.now()}-${process.pid}`);
    tmpRoots.push(blocker);
    writeFileSync(blocker, "i am a file, not a dir");
    const badPath = join(blocker, "nested", "action-latency.jsonl");
    expect(() => logActionTelemetry("x", 1, true, "prism_quoting", badPath)).not.toThrow();
    expect(existsSync(badPath)).toBe(false);
  });
});
