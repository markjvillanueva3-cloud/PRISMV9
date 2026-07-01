// PipelineIRExecutorEngine.test.ts -- PIPELINE-IR-MS0/U-PIR03.
// Real execution scenarios via an injected mock invoker (no live MCP). Exact assertions.
import { describe, it, expect } from "vitest";
import { PipelineIRExecutorEngine, resolvePath, type StageInvoker } from "../engines/PipelineIRExecutorEngine.js";

const st = (id: string, extra: Record<string, unknown> = {}) => ({ id, dispatcher: "d", action: id, dependsOn: [], ...extra });

describe("resolvePath", () => {
  it("resolves dotted paths + array indices; undefined on missing hop", () => {
    const o = { result: { value: 7 }, features: [{ k: "a" }, { k: "b" }] };
    expect(resolvePath(o)).toBe(o);
    expect(resolvePath(o, "result.value")).toBe(7);
    expect(resolvePath(o, "features.1.k")).toBe("b");
    expect(resolvePath(o, "result.nope")).toBe(undefined);
    expect(resolvePath(o, "a.b.c")).toBe(undefined);
    expect(resolvePath(null, "x")).toBe(undefined);
  });
});

describe("PipelineIRExecutorEngine -- happy path + ref flow", () => {
  it("executes stages in topo order and flows outputs through refs", async () => {
    const seen: { action: string; params: Record<string, unknown> }[] = [];
    const invoke: StageInvoker = (_d, action, params) => {
      seen.push({ action, params });
      if (action === "extract") return { material: "4140", count: 3 };
      if (action === "calc") return { rpm: 1200 };
      return { ok: true };
    };
    const ir = {
      id: "p",
      stages: [
        st("extract", { action: "extract" }),
        st("calc", { action: "calc", dependsOn: ["extract"], params: { mat: { ref: { stage: "extract", path: "material" } } } }),
        st("emit", { action: "emit", dependsOn: ["calc"], params: { rpm: { ref: { stage: "calc", path: "rpm" } } } }),
      ],
    };
    const r = await PipelineIRExecutorEngine.execute(ir, invoke);
    expect(r.ok).toBe(true);
    if (r.phase !== "run") throw new Error("expected run phase");
    expect(r.executed).toEqual(["extract", "calc", "emit"]);
    expect(seen.find((c) => c.action === "calc")!.params.mat).toBe("4140"); // ref resolved
    expect(seen.find((c) => c.action === "emit")!.params.rpm).toBe(1200);
    expect(r.outputs.extract).toEqual({ material: "4140", count: 3 });
    expect(r.failed).toEqual([]);
    expect(r.skipped).toEqual([]);
  });
});

describe("PipelineIRExecutorEngine -- condition gate", () => {
  it("skips a stage whose condition resolves falsy (and runs the rest)", async () => {
    const invoke: StageInvoker = () => ({ ok: true });
    const ir = {
      id: "p",
      stages: [st("a"), st("gated", { condition: { value: false }, dependsOn: ["a"] }), st("c", { dependsOn: ["a"] })],
    };
    const r = await PipelineIRExecutorEngine.execute(ir, invoke);
    if (r.phase !== "run") throw new Error("run");
    expect(r.skipped).toEqual(["gated"]);
    expect(r.executed).toEqual(["a", "c"]);
  });

  it("runs a stage whose condition resolves truthy via an upstream ref", async () => {
    const invoke: StageInvoker = (_d, action) => (action === "a" ? { go: true } : { ok: true });
    const ir = {
      id: "p",
      stages: [st("a"), st("gated", { condition: { ref: { stage: "a", path: "go" } }, dependsOn: ["a"] })],
    };
    const r = await PipelineIRExecutorEngine.execute(ir, invoke);
    if (r.phase !== "run") throw new Error("run");
    expect(r.executed).toEqual(["a", "gated"]);
    expect(r.skipped).toEqual([]);
  });
});

describe("PipelineIRExecutorEngine -- onError policies", () => {
  it("abort: a failing stage stops the run; downstream skipped", async () => {
    const invoke: StageInvoker = (_d, action) => { if (action === "boom") throw new Error("kaboom"); return { ok: true }; };
    const ir = { id: "p", stages: [st("a"), st("boom", { action: "boom", dependsOn: ["a"], onError: "abort" }), st("c", { dependsOn: ["boom"] })] };
    const r = await PipelineIRExecutorEngine.execute(ir, invoke);
    expect(r.ok).toBe(false);
    if (r.phase !== "run") throw new Error("run");
    expect(r.executed).toEqual(["a"]);
    expect(r.failed).toEqual(["boom"]);
    expect(r.skipped).toEqual(["c"]);
  });

  it("continue: a failing stage is recorded but the run proceeds", async () => {
    const invoke: StageInvoker = (_d, action) => { if (action === "boom") throw new Error("kaboom"); return { ok: true }; };
    const ir = { id: "p", stages: [st("a"), st("boom", { action: "boom", dependsOn: ["a"], onError: "continue" }), st("c", { dependsOn: ["a"] })] };
    const r = await PipelineIRExecutorEngine.execute(ir, invoke);
    if (r.phase !== "run") throw new Error("run");
    expect(r.executed).toEqual(["a", "c"]);
    expect(r.failed).toEqual(["boom"]);
    expect(r.skipped).toEqual([]);
    expect(r.ok).toBe(false); // a failure still marks the overall run not-ok
  });

  it("retry: succeeds on the 3rd attempt (retries=2)", async () => {
    let n = 0;
    const invoke: StageInvoker = () => { n++; if (n < 3) throw new Error("flaky"); return { ok: true, n }; };
    const ir = { id: "p", stages: [st("flaky", { action: "flaky", onError: "retry", retries: 2 })] };
    const r = await PipelineIRExecutorEngine.execute(ir, invoke);
    if (r.phase !== "run") throw new Error("run");
    expect(r.ok).toBe(true);
    expect(r.outcomes[0].attempts).toBe(3);
    expect(r.outcomes[0].status).toBe("ok");
    expect(n).toBe(3);
  });

  it("retry exhausted: fails after retries+1 attempts and aborts", async () => {
    let n = 0;
    const invoke: StageInvoker = () => { n++; throw new Error("always"); };
    const ir = { id: "p", stages: [st("dead", { action: "dead", onError: "retry", retries: 1 }), st("after", { dependsOn: ["dead"] })] };
    const r = await PipelineIRExecutorEngine.execute(ir, invoke);
    if (r.phase !== "run") throw new Error("run");
    expect(r.failed).toEqual(["dead"]);
    expect(r.outcomes.find((o) => o.stage === "dead")!.attempts).toBe(2); // retries(1)+1
    expect(r.skipped).toEqual(["after"]);
    expect(n).toBe(2);
  });
});

describe("PipelineIRExecutorEngine -- convert-phase failure", () => {
  it("returns phase=convert on a cyclic IR (never executes)", async () => {
    let called = false;
    const invoke: StageInvoker = () => { called = true; return {}; };
    const ir = { id: "p", stages: [st("a", { dependsOn: ["b"] }), st("b", { dependsOn: ["a"] })] };
    const r = await PipelineIRExecutorEngine.execute(ir, invoke);
    expect(r.ok).toBe(false);
    expect(r.phase).toBe("convert");
    if (r.phase === "convert") expect(r.convertErrors.some((e) => e.code === "cycle")).toBe(true);
    expect(called).toBe(false);
  });

  it("adversarial: null input -> convert-phase failure, no throw", async () => {
    const r = await PipelineIRExecutorEngine.execute(null, () => ({}));
    expect(r.ok).toBe(false);
    expect(r.phase).toBe("convert");
  });
});
