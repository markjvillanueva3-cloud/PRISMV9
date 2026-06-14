/**
 * CoordinatorSwarmEngine tests — U-HAGI03 fan-out/synthesize swarm.
 * Real assertions against deterministic numerical / arithmetic outputs.
 */
import { describe, it, expect } from "vitest";
import { CoordinatorSwarmEngine, type SwarmTask } from "../engines/CoordinatorSwarmEngine.js";

const numericTasks = (ns: readonly number[]): SwarmTask[] =>
  ns.map((n) => ({ id: `n_${n}`, payload: { n } }));

const squareRunner = (t: SwarmTask) => {
  const n = (t.payload as { n: number }).n;
  return n * n;
};

describe("CoordinatorSwarmEngine.run — deterministic arithmetic", () => {
  it("square-runner over [2,3,4] returns [4,9,16] in id-correspondence order", async () => {
    const r = await CoordinatorSwarmEngine.run(numericTasks([2, 3, 4]), squareRunner);
    expect(r.subResults.map((s) => s.output)).toEqual([4, 9, 16]);
    expect(r.subResults.map((s) => s.id)).toEqual(["n_2", "n_3", "n_4"]);
    expect(r.summary.succeeded).toBe(3);
    expect(r.summary.failed).toBe(0);
  });

  it("synthesizer sums squares of [1..5] to 1+4+9+16+25=55", async () => {
    const r = await CoordinatorSwarmEngine.run(
      numericTasks([1, 2, 3, 4, 5]),
      squareRunner,
      { synthesizer: (sr) => sr.reduce((s, x) => s + (x.output as number ?? 0), 0) },
    );
    expect(r.synthesized).toBe(55);
  });

  it("async runner that triples produces [3,6,9] for inputs [1,2,3]", async () => {
    const r = await CoordinatorSwarmEngine.run(numericTasks([1, 2, 3]), async (t) => {
      await Promise.resolve();
      return (t.payload as { n: number }).n * 3;
    });
    expect(r.subResults.map((s) => s.output)).toEqual([3, 6, 9]);
  });
});

describe("CoordinatorSwarmEngine.run — bounded concurrency invariant", () => {
  it("at maxConcurrency=2 over 6 tasks, peak in-flight never exceeds 2", async () => {
    let inFlight = 0;
    let peak = 0;
    const r = await CoordinatorSwarmEngine.run(numericTasks([1, 2, 3, 4, 5, 6]), async (t) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((res) => setTimeout(res, 8));
      inFlight--;
      return (t.payload as { n: number }).n;
    }, { maxConcurrency: 2 });
    expect(peak).toBeLessThanOrEqual(2);
    expect(peak).toBeGreaterThanOrEqual(1);
    expect(r.summary.succeeded).toBe(6);
    expect(r.subResults.map((s) => s.output)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("CoordinatorSwarmEngine.run — R12 fail-soft on partial failure", () => {
  it("alternating fail/succeed runner records 3 fails + 2 succeeds over 5 tasks", async () => {
    const r = await CoordinatorSwarmEngine.run(numericTasks([0, 1, 2, 3, 4]), (t) => {
      const n = (t.payload as { n: number }).n;
      if (n % 2 === 0) throw new Error(`even_${n}`);
      return n * 10;
    });
    expect(r.summary.failed).toBe(3);
    expect(r.summary.succeeded).toBe(2);
    expect(r.subResults[0].error).toContain("even_0");
    expect(r.subResults[1].output).toBe(10);
    expect(r.subResults[3].output).toBe(30);
  });

  it("CoordinatorSwarmEngine.successes returns only the 2 succeeded sub-results", async () => {
    const r = await CoordinatorSwarmEngine.run(numericTasks([1, 2, 3, 4]), (t) => {
      const n = (t.payload as { n: number }).n;
      if (n > 2) throw new Error("hi");
      return n;
    });
    const succ = CoordinatorSwarmEngine.successes(r);
    expect(succ.map((s) => s.output)).toEqual([1, 2]);
    expect(CoordinatorSwarmEngine.failures(r).map((s) => s.id)).toEqual(["n_3", "n_4"]);
  });
});

describe("CoordinatorSwarmEngine.run — failure modes", () => {
  it("throws on non-array tasks input", async () => {
    await expect(CoordinatorSwarmEngine.run("not array" as never, () => 0)).rejects.toThrow(/array/);
  });

  it("throws on non-function runner", async () => {
    await expect(CoordinatorSwarmEngine.run([], null as never)).rejects.toThrow(/function/);
  });

  it("throws when task count exceeds hard ceiling 300 (Kimi-documented)", async () => {
    const big = Array.from({ length: 301 }, (_, i) => ({ id: `t_${i}`, payload: {} }));
    await expect(CoordinatorSwarmEngine.run(big, () => 0)).rejects.toThrow(/300/);
  });

  it("throws on maxConcurrency=0 (boundary)", async () => {
    await expect(
      CoordinatorSwarmEngine.run(numericTasks([1]), squareRunner, { maxConcurrency: 0 }),
    ).rejects.toThrow();
  });

  it("throws on negative / NaN maxConcurrency (adversarial)", async () => {
    await expect(
      CoordinatorSwarmEngine.run(numericTasks([1]), squareRunner, { maxConcurrency: -1 }),
    ).rejects.toThrow();
    await expect(
      CoordinatorSwarmEngine.run(numericTasks([1]), squareRunner, { maxConcurrency: NaN }),
    ).rejects.toThrow();
  });

  it("throws on malformed task missing id (Zod failure)", async () => {
    const bad = [{ payload: {} }] as never;
    await expect(CoordinatorSwarmEngine.run(bad, squareRunner)).rejects.toThrow();
  });
});

describe("CoordinatorSwarmEngine.run — boundary cases", () => {
  it("empty task list yields empty subResults and zero summary; runner never called", async () => {
    let calls = 0;
    const r = await CoordinatorSwarmEngine.run([], (t) => { calls++; return t; });
    expect(r.subResults).toEqual([]);
    expect(r.summary.total).toBe(0);
    expect(r.summary.avgDurationMs).toBe(0);
    expect(calls).toBe(0);
  });

  it("single-task swarm with synthesizer produces output and synthesized value", async () => {
    const r = await CoordinatorSwarmEngine.run(numericTasks([7]), squareRunner,
      { synthesizer: (sr) => sr[0].output });
    expect(r.subResults[0].output).toBe(49);
    expect(r.synthesized).toBe(49);
  });

  it("validateTask rejects oversize id at length 121 (boundary)", () => {
    expect(() => CoordinatorSwarmEngine.validateTask({ id: "x".repeat(121), payload: 0 })).toThrow();
  });

  it("validateTask accepts id at boundary length 120", () => {
    const t = CoordinatorSwarmEngine.validateTask({ id: "x".repeat(120), payload: 0 });
    expect(t.id).toHaveLength(120);
  });
});
