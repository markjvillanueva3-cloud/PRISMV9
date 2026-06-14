/**
 * devDispatcher U-WIRE-CURIOSITY round-trip tests — CuriosityDrivenExplorerEngine.
 *
 * Validates the 2 curiosity_* actions wire correctly through prism_dev and
 * that the engine's score+rank+dedup behavior is observable end-to-end.
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-CURIOSITY
 */

import { describe, it, expect } from "vitest";
import { CuriosityDrivenExplorerEngine, DEFAULT_EXPLORER_WEIGHTS } from "../engines/CuriosityDrivenExplorerEngine.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DISPATCHER_SRC = fs.readFileSync(
  path.resolve(__dirname, "../tools/dispatchers/devDispatcher.ts"),
  "utf8"
);

describe("U-WIRE-CURIOSITY engine — singleton round-trip", () => {
  it("observe records a single observation + returns scored candidate with rationale", () => {
    const e = new CuriosityDrivenExplorerEngine();
    const c = e.observe({ kind: "never-accessed-asset", target: "OrphanEngine.ts" });
    expect(c).not.toBeNull();
    expect(c!.kind).toBe("never-accessed-asset");
    expect(c!.target).toBe("OrphanEngine.ts");
    expect(c!.score).toBe(DEFAULT_EXPLORER_WEIGHTS.base["never-accessed-asset"]);
    expect(["low", "medium", "high"]).toContain(c!.priority);
    expect(typeof c!.rationale).toBe("string");
    expect(c!.rationale.length).toBeGreaterThan(0);
  });

  it("observe is idempotent on same kind+target — second call returns null (dedup)", () => {
    const e = new CuriosityDrivenExplorerEngine();
    const c1 = e.observe({ kind: "unregistered-file", target: "stray.ts" });
    const c2 = e.observe({ kind: "unregistered-file", target: "stray.ts" });
    expect(c1).not.toBeNull();
    expect(c2).toBeNull();
    expect(e.size()).toBe(1);
  });

  it("observeBatch processes multiple observations + returns the added ones", () => {
    const e = new CuriosityDrivenExplorerEngine();
    const added = e.observeBatch([
      { kind: "never-accessed-asset", target: "A" },
      { kind: "zero-citation-tip", target: "B" },
      { kind: "orphan-route", target: "C" },
    ]);
    expect(added.length).toBe(3);
    expect(e.size()).toBe(3);
  });

  it("ageDays adds a positive bonus to score (proportional, capped)", () => {
    const e = new CuriosityDrivenExplorerEngine();
    const fresh = e.observe({ kind: "never-accessed-asset", target: "fresh", ageDays: 0 });
    const aged = e.observe({ kind: "never-accessed-asset", target: "aged", ageDays: 100 });
    expect(aged!.score).toBeGreaterThan(fresh!.score);
    expect(aged!.score - fresh!.score).toBeLessThanOrEqual(DEFAULT_EXPLORER_WEIGHTS.ageBonusCap + 0.0001);
  });

  it("rank returns top-K candidates ordered by score descending", () => {
    const e = new CuriosityDrivenExplorerEngine();
    e.observeBatch([
      { kind: "zero-citation-tip", target: "low-tip" },        // base=1
      { kind: "orphan-route", target: "high-route" },          // base=3
      { kind: "never-accessed-asset", target: "med-asset" },   // base=2
    ]);
    const top = e.rank(10);
    expect(top.length).toBe(3);
    expect(top[0].target).toBe("high-route");
    expect(top[0].score).toBeGreaterThanOrEqual(top[1].score);
    expect(top[1].score).toBeGreaterThanOrEqual(top[2].score);
  });

  it("rank(limit) honors the limit cap", () => {
    const e = new CuriosityDrivenExplorerEngine();
    for (let i = 0; i < 5; i++) {
      e.observe({ kind: "never-accessed-asset", target: `T${i}` });
    }
    const top = e.rank(3);
    expect(top.length).toBe(3);
  });
});

describe("U-WIRE-CURIOSITY dispatcher wiring source assertions", () => {
  it("action enum lists curiosity_observe_batch + case-block exists", () => {
    expect(DISPATCHER_SRC.includes('"curiosity_observe_batch"')).toBe(true);
    expect(DISPATCHER_SRC.includes("case \"curiosity_observe_batch\"")).toBe(true);
  });

  it("action enum lists curiosity_rank + case-block exists", () => {
    expect(DISPATCHER_SRC.includes('"curiosity_rank"')).toBe(true);
    expect(DISPATCHER_SRC.includes("case \"curiosity_rank\"")).toBe(true);
  });

  it("engine import is present via lazy import", () => {
    expect(DISPATCHER_SRC.includes('"../../engines/CuriosityDrivenExplorerEngine.js"')).toBe(true);
  });
});
