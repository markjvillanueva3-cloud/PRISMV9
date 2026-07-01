/**
 * Tests for ZuluWaveSchedulerEngine -- multi-wave DAG scheduler for Hermes fan-out.
 *
 * Coverage: reference DAGs (linear chain, diamond, parallel leaves, single node,
 * empty), cycle->error, adversarial (self-dep, missing dep, duplicate ids, NaN /
 * Infinity / oversize / non-array completed sets), and structural invariants
 * (exactly-one-wave, wave-k-after-deps-in-earlier-waves, incremental drain == full
 * partition). Plus a dispatcher round-trip CONTRACT block (engine-level assertions
 * the live chat's sessionDispatcher case bodies will wrap).
 */

import { describe, it, expect } from "vitest";
import {
  ZuluWaveSchedulerEngine,
  WaveSchedulePlanSchema,
  zuluWaveSchedulerEngine,
  type WaveSchedulePlan,
  type GovernedWaveExecution,
} from "../engines/ZuluWaveSchedulerEngine.js";
import type {
  FanoutPlanRequest,
  SlotCandidate,
  AgentAssignment,
} from "../engines/HermesParallelFanoutPlannerEngine.js";
import type { SlotSoul } from "../engines/SoulFrontmatterReaderEngine.js";
import type { DelegationContract } from "../engines/ZuluDelegationContractEngine.js";
import type { BackPressureSignal, PressureLevel } from "../engines/ZuluAdaptiveBackPressureEngine.js";

/**
 * Build a valid Subtask. depends_on defaults to []; size_hint/domain are required by
 * SubtaskSchema so we supply stable defaults the scheduler ignores.
 */
function st(
  subtask_id: string,
  depends_on: string[] = [],
): { subtask_id: string; description: string; domain: string; depends_on: string[]; size_hint: "short" | "medium" | "large" } {
  return {
    subtask_id,
    description: `work for ${subtask_id}`,
    domain: "mill",
    depends_on,
    size_hint: "medium",
  };
}

function plan(parent_task_id: string, subtasks: ReturnType<typeof st>[]): WaveSchedulePlan {
  return { parent_task_id, subtasks } as WaveSchedulePlan;
}

describe("ZuluWaveSchedulerEngine.allWaves -- reference DAGs", () => {
  it("linear chain a->b->c->d yields 4 single-node waves in order", () => {
    const p = plan("chain", [st("a"), st("b", ["a"]), st("c", ["b"]), st("d", ["c"])]);
    const part = ZuluWaveSchedulerEngine.allWaves(p);
    expect(part.wave_count).toBe(4);
    expect(part.total_subtasks).toBe(4);
    expect(part.waves.map((w) => w.subtask_ids)).toEqual([["a"], ["b"], ["c"], ["d"]]);
    expect(part.waves.map((w) => w.index)).toEqual([0, 1, 2, 3]);
  });

  it("diamond a->{b,c}->d yields 3 waves: [a],[b,c],[d]", () => {
    const p = plan("diamond", [
      st("a"),
      st("b", ["a"]),
      st("c", ["a"]),
      st("d", ["b", "c"]),
    ]);
    const part = ZuluWaveSchedulerEngine.allWaves(p);
    expect(part.wave_count).toBe(3);
    expect(part.waves[0].subtask_ids).toEqual(["a"]);
    expect(part.waves[1].subtask_ids.sort()).toEqual(["b", "c"]);
    expect(part.waves[2].subtask_ids).toEqual(["d"]);
  });

  it("parallel leaves (no deps) all land in a single wave 0", () => {
    const p = plan("leaves", [st("a"), st("b"), st("c"), st("d"), st("e")]);
    const part = ZuluWaveSchedulerEngine.allWaves(p);
    expect(part.wave_count).toBe(1);
    expect(part.waves[0].subtask_ids).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("single node yields one wave with that node", () => {
    const part = ZuluWaveSchedulerEngine.allWaves(plan("single", [st("only")]));
    expect(part.wave_count).toBe(1);
    expect(part.waves[0].subtask_ids).toEqual(["only"]);
    expect(part.total_subtasks).toBe(1);
  });

  it("empty plan is valid and yields zero waves", () => {
    const part = ZuluWaveSchedulerEngine.allWaves(plan("empty", []));
    expect(part.wave_count).toBe(0);
    expect(part.total_subtasks).toBe(0);
    expect(part.waves).toEqual([]);
  });

  it("wide-then-narrow: 3 leaves feeding 1 join => waves [a,b,c],[d]", () => {
    const p = plan("join", [st("a"), st("b"), st("c"), st("d", ["a", "b", "c"])]);
    const part = ZuluWaveSchedulerEngine.allWaves(p);
    expect(part.wave_count).toBe(2);
    expect(part.waves[0].subtask_ids).toEqual(["a", "b", "c"]);
    expect(part.waves[1].subtask_ids).toEqual(["d"]);
  });
});

describe("ZuluWaveSchedulerEngine.allWaves -- cycle detection (never infinite loop)", () => {
  it("2-cycle a<->b throws a named cycle error", () => {
    // self-dep is caught earlier, so a true cycle needs >=2 nodes referencing each other
    const p = plan("cycle2", [st("a", ["b"]), st("b", ["a"])]);
    expect(() => ZuluWaveSchedulerEngine.allWaves(p)).toThrow(/cycle/i);
  });

  it("3-cycle a->b->c->a throws naming all 3 stuck subtasks", () => {
    const p = plan("cycle3", [st("a", ["c"]), st("b", ["a"]), st("c", ["b"])]);
    let msg = "";
    try {
      ZuluWaveSchedulerEngine.allWaves(p);
    } catch (e) {
      msg = String((e as Error).message);
    }
    expect(msg).toMatch(/cycle detected/i);
    expect(msg).toContain("a");
    expect(msg).toContain("b");
    expect(msg).toContain("c");
    expect(msg).toContain("3 subtask");
  });

  it("cycle behind a valid prefix: leaf schedules then the cycle is detected", () => {
    // root has no deps (wave 0), but x<->y form a cycle reachable only after root
    const p = plan("mixed", [st("root"), st("x", ["y", "root"]), st("y", ["x"])]);
    let msg = "";
    try {
      ZuluWaveSchedulerEngine.allWaves(p);
    } catch (e) {
      msg = String((e as Error).message);
    }
    expect(msg).toMatch(/cycle detected/i);
    // names the cycle members, not the already-scheduled root
    expect(msg).toContain("x");
    expect(msg).toContain("y");
    expect(msg).not.toContain("root");
  });
});

describe("ZuluWaveSchedulerEngine -- adversarial / malformed input", () => {
  it("self-dependency throws on both methods", () => {
    const p = plan("selfdep", [st("a", ["a"])]);
    expect(() => ZuluWaveSchedulerEngine.allWaves(p)).toThrow(/depends on itself/);
    expect(() => ZuluWaveSchedulerEngine.computeWaveN(p, [])).toThrow(/depends on itself/);
  });

  it("dependency on an unknown id throws naming the missing id", () => {
    const p = plan("missingdep", [st("a"), st("b", ["ghost"])]);
    expect(() => ZuluWaveSchedulerEngine.allWaves(p)).toThrow(/unknown ghost/);
  });

  it("duplicate subtask_id throws", () => {
    const p = plan("dup", [st("a"), st("a")]);
    expect(() => ZuluWaveSchedulerEngine.allWaves(p)).toThrow(/duplicate subtask_id a/);
  });

  it("oversize plan (>200 subtasks) is rejected by the schema", () => {
    const big = Array.from({ length: 201 }, (_, i) => st(`n${i}`));
    expect(() => ZuluWaveSchedulerEngine.allWaves(plan("big", big))).toThrow();
  });

  it("computeWaveN ignores NaN / Infinity / non-string completed ids without throwing", () => {
    const p = plan("adv", [st("a"), st("b", ["a"])]);
    const completed = [NaN, Infinity, -Infinity, null, undefined, 42, {}, "a"] as unknown as string[];
    const nw = ZuluWaveSchedulerEngine.computeWaveN(p, completed);
    // only the valid "a" is honored => b becomes ready, a is filtered as completed
    expect(nw.ready).toEqual(["b"]);
    expect(nw.blocked).toEqual([]);
    expect(nw.done).toBe(false);
  });

  it("computeWaveN tolerates a completedIds that is not an array", () => {
    const p = plan("notarr", [st("a")]);
    const nw = ZuluWaveSchedulerEngine.computeWaveN(p, "a" as unknown as string[]);
    // a string is not Array.isArray => treated as empty => "a" is ready
    expect(nw.ready).toEqual(["a"]);
  });

  it("completed id outside the plan is ignored (resume-from-larger-fanout safe)", () => {
    const p = plan("foreign", [st("a"), st("b", ["a"])]);
    const nw = ZuluWaveSchedulerEngine.computeWaveN(p, ["some-other-fanout-task"]);
    expect(nw.ready).toEqual(["a"]); // foreign id did NOT satisfy b's dep
    expect(nw.blocked).toEqual(["b"]);
  });
});

describe("ZuluWaveSchedulerEngine.computeWaveN -- incremental driver", () => {
  it("empty completed set returns wave 0 leaves (matches allWaves wave 0)", () => {
    const p = plan("diamond", [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])]);
    const nw = ZuluWaveSchedulerEngine.computeWaveN(p, []);
    expect(nw.ready).toEqual(["a"]);
    expect(nw.blocked.sort()).toEqual(["b", "c", "d"]);
    expect(nw.done).toBe(false);
    const part = ZuluWaveSchedulerEngine.allWaves(p);
    expect(nw.ready).toEqual(part.waves[0].subtask_ids);
  });

  it("partial completion unlocks the next ready batch", () => {
    const p = plan("diamond", [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])]);
    const nw = ZuluWaveSchedulerEngine.computeWaveN(p, ["a"]);
    expect(nw.ready.sort()).toEqual(["b", "c"]);
    expect(nw.blocked).toEqual(["d"]); // d still needs both b and c
    expect(nw.done).toBe(false);
  });

  it("all-but-last completed leaves the final join ready", () => {
    const p = plan("diamond", [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])]);
    const nw = ZuluWaveSchedulerEngine.computeWaveN(p, ["a", "b", "c"]);
    expect(nw.ready).toEqual(["d"]);
    expect(nw.blocked).toEqual([]);
    expect(nw.done).toBe(false);
  });

  it("fully completed => done with empty ready and blocked", () => {
    const p = plan("diamond", [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])]);
    const nw = ZuluWaveSchedulerEngine.computeWaveN(p, ["a", "b", "c", "d"]);
    expect(nw.ready).toEqual([]);
    expect(nw.blocked).toEqual([]);
    expect(nw.done).toBe(true);
  });

  it("empty plan is immediately done", () => {
    const nw = ZuluWaveSchedulerEngine.computeWaveN(plan("empty", []), []);
    expect(nw.done).toBe(true);
    expect(nw.ready).toEqual([]);
    expect(nw.blocked).toEqual([]);
  });

  it("a cycle stalls computeWaveN (ready empty, blocked non-empty, not done) -- no throw", () => {
    // computeWaveN is the safe incremental step; it does NOT throw on a cycle,
    // it surfaces the stall so the caller escalates to allWaves for the named error.
    const p = plan("cycle2", [st("a", ["b"]), st("b", ["a"])]);
    const nw = ZuluWaveSchedulerEngine.computeWaveN(p, []);
    expect(nw.ready).toEqual([]);
    expect(nw.blocked.sort()).toEqual(["a", "b"]);
    expect(nw.done).toBe(false);
  });
});

describe("ZuluWaveSchedulerEngine -- structural invariants", () => {
  // A moderately complex DAG exercised for the partition invariants.
  const complex = plan("complex", [
    st("a"),
    st("b"),
    st("c", ["a"]),
    st("d", ["a", "b"]),
    st("e", ["c"]),
    st("f", ["c", "d"]),
    st("g", ["e", "f"]),
  ]);

  it("INVARIANT: every subtask appears in EXACTLY one wave", () => {
    const part = ZuluWaveSchedulerEngine.allWaves(complex);
    const seen = new Map<string, number>();
    for (const w of part.waves) {
      for (const id of w.subtask_ids) seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    // every id present exactly once
    expect(seen.size).toBe(complex.subtasks.length);
    for (const [, count] of seen) expect(count).toBe(1);
    // wave sizes sum to total
    const sum = part.waves.reduce((acc, w) => acc + w.subtask_ids.length, 0);
    expect(sum).toBe(part.total_subtasks);
  });

  it("INVARIANT: a subtask in wave k has ALL deps in waves < k", () => {
    const part = ZuluWaveSchedulerEngine.allWaves(complex);
    const waveOf = new Map<string, number>();
    part.waves.forEach((w) => w.subtask_ids.forEach((id) => waveOf.set(id, w.index)));
    for (const s of complex.subtasks) {
      const k = waveOf.get(s.subtask_id)!;
      for (const dep of s.depends_on) {
        expect(waveOf.get(dep)!).toBeLessThan(k);
      }
    }
  });

  it("INVARIANT: replaying allWaves through computeWaveN drains the identical partition", () => {
    const part = ZuluWaveSchedulerEngine.allWaves(complex);
    const completed: string[] = [];
    const replay: string[][] = [];
    // simulate completing one wave at a time
    for (let guard = 0; guard < 100; guard++) {
      const nw = ZuluWaveSchedulerEngine.computeWaveN(complex, completed);
      if (nw.done) break;
      expect(nw.ready.length).toBeGreaterThan(0); // acyclic => always progress
      replay.push([...nw.ready].sort());
      completed.push(...nw.ready);
    }
    expect(replay.length).toBe(part.wave_count);
    part.waves.forEach((w, i) => {
      expect([...w.subtask_ids].sort()).toEqual(replay[i]);
    });
  });
});

describe("ZuluWaveSchedulerEngine -- schema + render + singleton", () => {
  it("WaveSchedulePlanSchema rejects an empty parent_task_id", () => {
    expect(() =>
      WaveSchedulePlanSchema.parse({ parent_task_id: "", subtasks: [] }),
    ).toThrow();
  });

  it("WaveSchedulePlanSchema accepts an empty subtasks array", () => {
    const parsed = WaveSchedulePlanSchema.parse({ parent_task_id: "ok", subtasks: [] });
    expect(parsed.subtasks).toEqual([]);
  });

  it("renderPartition emits a compact one-line summary with per-wave sizes", () => {
    const part = ZuluWaveSchedulerEngine.allWaves(
      plan("diamond", [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])]),
    );
    const s = ZuluWaveSchedulerEngine.renderPartition(part);
    expect(s).toContain("[WAVES 3]");
    expect(s).toContain("diamond");
    expect(s).toContain("w0=1");
    expect(s).toContain("w1=2");
    expect(s).toContain("w2=1");
  });

  it("renderNextWave reflects done vs next", () => {
    const p = plan("chain", [st("a"), st("b", ["a"])]);
    expect(ZuluWaveSchedulerEngine.renderNextWave(ZuluWaveSchedulerEngine.computeWaveN(p, []))).toContain("[WAVE NEXT]");
    expect(ZuluWaveSchedulerEngine.renderNextWave(ZuluWaveSchedulerEngine.computeWaveN(p, ["a", "b"]))).toContain("[WAVE DONE]");
  });

  it("singleton alias points at the same class", () => {
    expect(zuluWaveSchedulerEngine).toBe(ZuluWaveSchedulerEngine);
  });
});

describe("ZuluWaveSchedulerEngine -- dispatcher round-trip CONTRACT (pending live wiring)", () => {
  // The live chat wires sessionDispatcher actions `compute_wave_n` / `schedule_wave`.
  // We cannot import an UNWIRED dispatcher action (the z.enum would reject it and a
  // .skip is hook-blocked), so these assert the exact ENGINE-LEVEL contract the
  // dispatcher case bodies will wrap. When the live chat wires:
  //   case "schedule_wave":  return ok({ success:true, partition: ZuluWaveSchedulerEngine.allWaves(p.plan) });
  //   case "compute_wave_n": return ok({ success:true, next: ZuluWaveSchedulerEngine.computeWaveN(p.plan, p.completed_ids ?? []) });
  // these same expectations hold round-tripped through prism_session.
  const wirePlan: WaveSchedulePlan = plan("rt", [st("a"), st("b", ["a"])]);

  it("schedule_wave contract: allWaves(plan).wave_count === 2 for a->b", () => {
    const partition = ZuluWaveSchedulerEngine.allWaves(wirePlan);
    expect(partition.wave_count).toBe(2);
    expect(partition.waves[0].subtask_ids).toEqual(["a"]);
    expect(partition.waves[1].subtask_ids).toEqual(["b"]);
  });

  it("compute_wave_n contract: computeWaveN(plan, ['a']).ready === ['b']", () => {
    const next = ZuluWaveSchedulerEngine.computeWaveN(wirePlan, ["a"]);
    expect(next.ready).toEqual(["b"]);
    expect(next.done).toBe(false);
  });
});

// ---- nextWaveAssignments: the executable-wave bridge (wave-N slot assignments) ----
// computeWaveN gives WHICH ids are ready; this gives WHO runs each -- the missing
// piece that makes wave_2+ dispatchable (plan() only ever assigned wave-1 leaves).

const cand = (slot: string, primary_domain: string | null, score = 5): SlotCandidate => ({
  slot,
  hermes_role: "specialist",
  primary_domain,
  score,
});

const freq = (
  subtasks: ReturnType<typeof st>[],
  candidates: SlotCandidate[],
  max_parallel = 5,
): FanoutPlanRequest =>
  ({ parent_task_id: "exec", subtasks, candidates, max_parallel } as FanoutPlanRequest);

describe("ZuluWaveSchedulerEngine.nextWaveAssignments -- executable wave-N slot assignments", () => {
  const diamond = () => [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])];
  const cands = () => [cand("alpha", "mill"), cand("bravo", "mill"), cand("charlie", "mill")];

  it("wave-1 (completed=[]) assigns only the leaf [a]; b,c,d blocked; not done", () => {
    const w = ZuluWaveSchedulerEngine.nextWaveAssignments(freq(diamond(), cands()), []);
    expect(w.wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);
    expect(w.wave_assignments[0].slot).toBe("alpha"); // highest-score first un-assigned
    expect(w.blocked.slice().sort()).toEqual(["b", "c", "d"]);
    expect(w.done).toBe(false);
    expect(w.overflow).toEqual([]);
    expect(w.unrouted).toEqual([]);
  });

  it("wave-2 (completed=[a]) assigns b,c to DISTINCT slots; d still blocked", () => {
    const w = ZuluWaveSchedulerEngine.nextWaveAssignments(freq(diamond(), cands()), ["a"]);
    expect(w.wave_assignments.map((a) => a.subtask_id).slice().sort()).toEqual(["b", "c"]);
    expect(new Set(w.wave_assignments.map((a) => a.slot)).size).toBe(2); // one agent per slot per wave
    expect(w.blocked).toEqual(["d"]);
    expect(w.done).toBe(false);
  });

  it("wave-3 (completed=[a,b,c]) assigns d; nothing blocked; not done", () => {
    const w = ZuluWaveSchedulerEngine.nextWaveAssignments(freq(diamond(), cands()), ["a", "b", "c"]);
    expect(w.wave_assignments.map((a) => a.subtask_id)).toEqual(["d"]);
    expect(w.blocked).toEqual([]);
    expect(w.done).toBe(false);
  });

  it("all completed -> empty wave, done=true (the terminal a driver loops to)", () => {
    const w = ZuluWaveSchedulerEngine.nextWaveAssignments(freq(diamond(), cands()), ["a", "b", "c", "d"]);
    expect(w.wave_assignments).toEqual([]);
    expect(w.blocked).toEqual([]);
    expect(w.done).toBe(true);
  });

  it("max_parallel caps the dispatch batch; extra ready leaves overflow (NOT dropped)", () => {
    const w = ZuluWaveSchedulerEngine.nextWaveAssignments(freq([st("x"), st("y"), st("z")], cands(), 2), []);
    expect(w.wave_assignments.length).toBe(2);
    expect(w.overflow.length).toBe(1);
    // every ready subtask is accounted for (assigned or overflow) -- none silently lost
    expect([...w.wave_assignments.map((a) => a.subtask_id), ...w.overflow].slice().sort()).toEqual(["x", "y", "z"]);
  });

  it("a ready subtask with no positive candidate is unrouted (surfaced, not dropped)", () => {
    const w = ZuluWaveSchedulerEngine.nextWaveAssignments(freq([st("a")], [cand("alpha", "mill", 0)]), []);
    expect(w.wave_assignments).toEqual([]);
    expect(w.unrouted).toEqual(["a"]);
    expect(w.done).toBe(false);
  });

  it("prefers a domain-matching candidate (reason=domain-match) over a higher-score off-domain one", () => {
    const lathe = { subtask_id: "t", description: "t", domain: "lathe", depends_on: [], size_hint: "medium" as const };
    const w = ZuluWaveSchedulerEngine.nextWaveAssignments(
      freq([lathe], [cand("alpha", "mill", 9), cand("whiskey", "lathe", 3)]),
      [],
    );
    expect(w.wave_assignments[0].slot).toBe("whiskey");
    expect(w.wave_assignments[0].reason).toBe("domain-match");
  });

  it("completed ids outside the plan are ignored (cannot spuriously satisfy a dep)", () => {
    const w = ZuluWaveSchedulerEngine.nextWaveAssignments(freq([st("a"), st("b", ["a"])], cands()), ["zzz-not-in-plan"]);
    expect(w.wave_assignments.map((x) => x.subtask_id)).toEqual(["a"]);
    expect(w.blocked).toEqual(["b"]); // b stays blocked -- the foreign id did not satisfy its dep
  });

  it("a dependency cycle STALLS: no ready/overflow/unrouted, blocked non-empty, !done", () => {
    const w = ZuluWaveSchedulerEngine.nextWaveAssignments(freq([st("a", ["b"]), st("b", ["a"])], cands()), []);
    expect(w.wave_assignments).toEqual([]);
    expect(w.overflow).toEqual([]);
    expect(w.unrouted).toEqual([]);
    expect(w.blocked.slice().sort()).toEqual(["a", "b"]);
    expect(w.done).toBe(false);
  });

  it("THROWS on a malformed plan (self-dep) -- same contract as plan()/computeWaveN", () => {
    expect(() => ZuluWaveSchedulerEngine.nextWaveAssignments(freq([st("a", ["a"])], cands()), [])).toThrow(/depends on itself/);
  });

  it("incrementally draining via nextWaveAssignments covers EXACTLY allWaves' partition", () => {
    const req = freq(diamond(), cands());
    const partition = ZuluWaveSchedulerEngine.allWaves(plan("exec", diamond()));
    const completed: string[] = [];
    const drained: string[][] = [];
    let guard = 0;
    while (guard++ < 10) {
      const w = ZuluWaveSchedulerEngine.nextWaveAssignments(req, completed);
      if (w.done) break;
      const ids = w.wave_assignments.map((a) => a.subtask_id); // no overflow/unrouted in this DAG
      drained.push(ids.slice().sort());
      completed.push(...ids);
    }
    expect(drained).toEqual(partition.waves.map((wv) => wv.subtask_ids.slice().sort()));
  });

  it("renderWaveExecution emits a compact dispatch summary", () => {
    const w = ZuluWaveSchedulerEngine.nextWaveAssignments(freq(diamond(), cands()), ["a"]);
    const s = ZuluWaveSchedulerEngine.renderWaveExecution(w);
    expect(s).toContain("[WAVE-EXEC]");
    expect(s).toContain("dispatch=2");
    expect(s).toContain("blocked=1");
  });
});

// ---- governedNextWave: the C1 safety gate (ZuluFleetGovernorEngine per assignment) ----
// st()'s description is `work for <id>`, domain "mill". The governor checks the
// description as task_text with operation "assign". A SlotSoul minimal shape suffices:
// checkAuthority reads only refuse_list / domain_filter / hermes_role.
describe("ZuluWaveSchedulerEngine.governedNextWave -- per-assignment authority gate", () => {
  const diamond = () => [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])];
  const cands = () => [cand("alpha", "mill"), cand("bravo", "mill"), cand("charlie", "mill")];
  // Minimal SlotSoul -- the governor reads only these three fields (cast: the full
  // SlotSoul frontmatter has many more fields the authority check never touches).
  const soul = (over: Partial<SlotSoul>): SlotSoul =>
    ({ hermes_role: "specialist", domain_filter: "", refuse_list: [], ...over } as unknown as SlotSoul);
  const souls = (m: Record<string, SlotSoul | null>) => new Map<string, SlotSoul | null>(Object.entries(m));

  it("all slots authorized (domain_filter matches the description) -> all pass, vetoed empty", () => {
    // wave-1 assigns "a" to alpha; domain_filter "work" matches "work for a".
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], souls({ alpha: soul({ domain_filter: "work" }) }));
    expect(g.wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);
    expect(g.vetoed).toEqual([]);
  });

  it("refuse-list hit VETOES that assignment (refuse-rule-veto), not dispatched", () => {
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], souls({ alpha: soul({ refuse_list: ["work for a"] }) }));
    expect(g.wave_assignments).toEqual([]);
    expect(g.vetoed).toHaveLength(1);
    expect(g.vetoed[0]).toMatchObject({ subtask_id: "a", slot: "alpha" });
    expect(g.vetoed[0].reason).toMatch(/refuse-rule-veto/);
  });

  it("out-of-domain VETO (domain_filter set but does not match the task_text)", () => {
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], souls({ alpha: soul({ domain_filter: "lathe" }) }));
    expect(g.wave_assignments).toEqual([]);
    expect(g.vetoed.map((v) => v.subtask_id)).toEqual(["a"]);
  });

  it("FAIL-CLOSED: a slot with no soul in the map is vetoed (no-soul-resolved), never authorized", () => {
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], souls({}));
    expect(g.wave_assignments).toEqual([]);
    expect(g.vetoed).toHaveLength(1);
    expect(g.vetoed[0].reason).toMatch(/no-soul/);
  });

  it("orchestrator role with no domain_filter is authorized (governor rule 4)", () => {
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], souls({ alpha: soul({ hermes_role: "fleet-orchestrator", domain_filter: "" }) }));
    expect(g.wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);
    expect(g.vetoed).toEqual([]);
  });

  it("mixed verdict: the refused slot's assignment is vetoed, the rest dispatched (none dropped)", () => {
    // 3 ready leaves -> alpha,bravo,charlie each get exactly one (one agent per slot per wave).
    // Authorize alpha+bravo (domain "work"); refuse charlie ("work" hits "work for z") -> charlie's
    // assignment vetoed, the other two dispatched. Deterministic: tasks assign in input order to the
    // top un-assigned candidates (all mill/score 5), so x->alpha, y->bravo, z->charlie.
    const g = ZuluWaveSchedulerEngine.governedNextWave(
      freq([st("x"), st("y"), st("z")], cands()),
      [],
      souls({ alpha: soul({ domain_filter: "work" }), bravo: soul({ domain_filter: "work" }), charlie: soul({ refuse_list: ["work"] }) }),
    );
    expect(g.wave_assignments).toHaveLength(2);
    expect(g.vetoed).toHaveLength(1);
    expect(g.vetoed[0].slot).toBe("charlie");
    // dispatched + vetoed together cover all 3 ready leaves -- governance never silently drops one
    expect([...g.wave_assignments.map((a) => a.subtask_id), ...g.vetoed.map((v) => v.subtask_id)].sort()).toEqual(["x", "y", "z"]);
  });

  it("overflow / blocked / done pass through the gate unchanged (governance only gates dispatch)", () => {
    // 3 ready leaves, max_parallel 2 -> 2 assigned + 1 overflow; authorize both assigned.
    const g = ZuluWaveSchedulerEngine.governedNextWave(
      freq([st("x"), st("y"), st("z")], cands(), 2),
      [],
      souls({ alpha: soul({ domain_filter: "work" }), bravo: soul({ domain_filter: "work" }), charlie: soul({ domain_filter: "work" }) }),
    );
    expect(g.overflow).toHaveLength(1);
    expect(g.done).toBe(false);
    expect(g.wave_assignments.length + g.vetoed.length).toBe(2); // the 2 dispatched leaves were gated
  });

  it("ADVERSARIAL: a non-Map souls argument fails closed -> every assignment vetoed", () => {
    const g = ZuluWaveSchedulerEngine.governedNextWave(
      freq(diamond(), cands()),
      [],
      null as unknown as ReadonlyMap<string, SlotSoul | null>,
    );
    expect(g.wave_assignments).toEqual([]);
    expect(g.vetoed).toHaveLength(1);
  });

  it("THROWS on a malformed plan (self-dep) BEFORE any authority check -- same contract", () => {
    expect(() =>
      ZuluWaveSchedulerEngine.governedNextWave(freq([st("a", ["a"])], cands()), [], souls({ alpha: soul({ domain_filter: "work" }) })),
    ).toThrow(/depends on itself/);
  });

  it("terminal wave (all completed) -> empty assignments, empty vetoed, done=true", () => {
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), ["a", "b", "c", "d"], souls({ alpha: soul({ domain_filter: "work" }) }));
    expect(g.wave_assignments).toEqual([]);
    expect(g.vetoed).toEqual([]);
    expect(g.done).toBe(true);
  });
});

// ---- C4 delegation pre-gate: a strictly-narrowing, fail-closed contract verdict composed
// BEFORE the governor verdict. Absent/empty gate -> byte-identical legacy behavior; a matching
// contract can only NARROW (governor-authorized -> vetoed), never widen a governor veto. ----
describe("ZuluWaveSchedulerEngine.governedNextWave -- C4 delegation pre-gate (strictly-narrowing)", () => {
  const soul = (over: Partial<SlotSoul>): SlotSoul =>
    ({ hermes_role: "specialist", domain_filter: "", refuse_list: [], ...over } as unknown as SlotSoul);
  const souls = (m: Record<string, SlotSoul | null>) => new Map<string, SlotSoul | null>(Object.entries(m));
  const diamond = () => [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])];
  const cands = () => [cand("alpha", "mill"), cand("bravo", "mill"), cand("charlie", "mill")];
  const NOW = Date.UTC(2026, 0, 1); // 2026-01-01
  const FUTURE = "2099-01-01T00:00:00.000Z";
  const PAST = "2000-01-01T00:00:00.000Z";

  // A minimal contract for (alpha, "assign", "mill"). evaluateDelegation reads only
  // grantee_slot / operations / galaxy_scope / deadline_utc / token_cap / tokens_used / revoked.
  const contract = (over: Partial<DelegationContract> = {}): DelegationContract =>
    ({
      id: "c-test",
      grantee_slot: "alpha",
      operations: ["assign"],
      galaxy_scope: "mill",
      deadline_utc: FUTURE,
      token_cap: null,
      tokens_used: 0,
      failure_semantics: "fail-closed",
      granted_by_slot: "zulu",
      granted_by_role: "fleet-orchestrator",
      granted_at_utc: "2026-01-01T00:00:00.000Z",
      revoked: false,
      revoked_at_utc: null,
      ...over,
    } as DelegationContract);

  // governor authorizes alpha: domain_filter "work" matches the "work for a" task_text. wave-1 = [a].
  const authAlpha = () => souls({ alpha: soul({ domain_filter: "work" }) });

  it("DENIED (matching but EXPIRED) VETOES a governor-authorized assignment -- fail-closed narrowing", () => {
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], authAlpha(), {
      contracts: [contract({ deadline_utc: PAST })],
      nowMs: NOW,
    });
    expect(g.wave_assignments).toEqual([]); // governor said yes; delegation denied -> moved to vetoed
    expect(g.vetoed.map((v) => v.subtask_id)).toEqual(["a"]);
    expect(g.vetoed[0].reason).toMatch(/^delegation-denied:/);
  });

  it("DENIED (REVOKED, future deadline) VETOES -- revocation overrides an unexpired deadline", () => {
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], authAlpha(), {
      contracts: [contract({ revoked: true, revoked_at_utc: "2026-01-01T00:00:00.000Z" })],
      nowMs: NOW,
    });
    expect(g.wave_assignments).toEqual([]);
    expect(g.vetoed.map((v) => v.subtask_id)).toEqual(["a"]);
    expect(g.vetoed[0].reason).toMatch(/^delegation-denied:/);
  });

  it("WITHIN-CONTRACT (active match) leaves the governor verdict intact -> authorized", () => {
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], authAlpha(), {
      contracts: [contract()],
      nowMs: NOW,
    });
    expect(g.wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);
    expect(g.vetoed).toEqual([]);
  });

  it("NO-CONTRACT (grantee-slot mismatch) is a no-op -> governor verdict intact", () => {
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], authAlpha(), {
      contracts: [contract({ grantee_slot: "whiskey" })], // does not name alpha
      nowMs: NOW,
    });
    expect(g.wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);
    expect(g.vetoed).toEqual([]);
  });

  it("NO-CONTRACT (galaxy mismatch) is a no-op -- a mill assignment is not matched by a lathe contract", () => {
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], authAlpha(), {
      contracts: [contract({ galaxy_scope: "lathe" })],
      nowMs: NOW,
    });
    expect(g.wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);
  });

  it("galaxy_scope '*' matches any domain -> active contract defers to governor (authorized)", () => {
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], authAlpha(), {
      contracts: [contract({ galaxy_scope: "*" })],
      nowMs: NOW,
    });
    expect(g.wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);
  });

  it("delegation CANNOT WIDEN: a governor-VETOED assignment stays vetoed even with an active contract", () => {
    // refuse_list ["work for a"] forces the governor to veto alpha; an active within-contract
    // delegation must NOT resurrect it. The veto reason is the GOVERNOR's, not delegation-denied
    // (a within-contract delegation defers entirely to the governor ceiling).
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], souls({ alpha: soul({ refuse_list: ["work for a"] }) }), {
      contracts: [contract()],
      nowMs: NOW,
    });
    expect(g.wave_assignments).toEqual([]);
    expect(g.vetoed.map((v) => v.subtask_id)).toEqual(["a"]);
    expect(g.vetoed[0].reason).not.toMatch(/^delegation-denied:/);
  });

  it("ABSENT gate === EMPTY-contracts gate === governor-only behavior (back-compat / default-on no-op)", () => {
    const base = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], authAlpha());
    const emptyGate = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], authAlpha(), { contracts: [], nowMs: NOW });
    expect(emptyGate.wave_assignments).toEqual(base.wave_assignments);
    expect(emptyGate.vetoed).toEqual(base.vetoed);
    expect(emptyGate.wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);
  });

  it("PER-ASSIGNMENT isolation: in a 2-slot wave, a contract denying ONE slot vetoes only that one", () => {
    // wave-2 (completed=[a]) assigns b->alpha, c->bravo. An EXPIRED contract scoped to bravo must
    // veto ONLY the bravo assignment; the alpha assignment (no matching contract) passes.
    const both = souls({ alpha: soul({ domain_filter: "work" }), bravo: soul({ domain_filter: "work" }) });
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), ["a"], both, {
      contracts: [contract({ grantee_slot: "bravo", deadline_utc: PAST })],
      nowMs: NOW,
    });
    expect(g.wave_assignments.map((a) => a.slot)).toEqual(["alpha"]);
    expect(g.vetoed.map((v) => v.slot)).toEqual(["bravo"]);
    expect(g.vetoed[0].reason).toMatch(/^delegation-denied:/);
  });

  it("at-cap token contract is NOT denied at the assign-gate (no tokens_pending charged) -> within-contract", () => {
    // The wave gate never pre-charges tokens (operation "assign", tokens_pending=0), so a contract
    // sitting AT its cap is still within-contract here. Token-cap enforcement is the per-action
    // check() path's responsibility, not the dispatch gate -- a documented invariant (R12).
    const g = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], authAlpha(), {
      contracts: [contract({ token_cap: 1000, tokens_used: 1000 })],
      nowMs: NOW,
    });
    expect(g.wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);
  });
});

// ---- C5 back-pressure throttle: load-shape an already-governed wave by per-slot pressure.
// NEVER vetoes (spec: advisory by default, never overrides governor authority); it only HOLDS
// a saturated slot's assignment so it is re-offered next wave. ----
describe("ZuluWaveSchedulerEngine.throttleWave -- C5 back-pressure (advisory; never vetoes)", () => {
  const asg = (subtask_id: string, slot: string): AgentAssignment => ({ subtask_id, slot, hermes_role: "specialist", score: 5, reason: "domain-match" });
  const gwave = (assignments: AgentAssignment[], over: Partial<GovernedWaveExecution> = {}): GovernedWaveExecution =>
    ({ parent_task_id: "p", wave_assignments: assignments, overflow: [], unrouted: [], blocked: [], done: false, vetoed: [], ...over });
  const sig = (slot: string, level: PressureLevel, over: Partial<BackPressureSignal> = {}): BackPressureSignal =>
    ({ slot, pressure_level: level, recommended_delay_ms: level === "blocked" ? 120_000 : 0, cause: `test-${level}`, escalate: level === "blocked", samples_considered: 3, windowMs: 300_000, advisory: true, ...over });
  const sigs = (m: Record<string, BackPressureSignal>) => new Map<string, BackPressureSignal>(Object.entries(m));

  it("ADVISORY (enforce false): holds NOTHING but surfaces a real (non-low) signal", () => {
    const t = ZuluWaveSchedulerEngine.throttleWave(gwave([asg("a", "alpha")]), sigs({ alpha: sig("alpha", "high") }), { enforce: false });
    expect(t.wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);
    expect(t.throttled).toEqual([]);
    expect(t.back_pressure.map((s) => s.slot)).toEqual(["alpha"]);
    expect(t.back_pressure[0].pressure_level).toBe("high");
  });

  it("ENFORCE + blocked: HOLDS the assignment (moved to throttled, NOT dispatched)", () => {
    const t = ZuluWaveSchedulerEngine.throttleWave(gwave([asg("a", "alpha")]), sigs({ alpha: sig("alpha", "blocked") }), { enforce: true });
    expect(t.wave_assignments).toEqual([]);
    expect(t.throttled.map((x) => x.subtask_id)).toEqual(["a"]);
    expect(t.throttled[0].pressure_level).toBe("blocked");
    expect(t.throttled[0].recommended_delay_ms).toBe(120_000);
  });

  it("NEVER VETOES: a held assignment goes to `throttled`, NOT `vetoed` (authority preserved)", () => {
    const t = ZuluWaveSchedulerEngine.throttleWave(
      gwave([asg("a", "alpha")], { vetoed: [{ subtask_id: "z", slot: "zulu", reason: "pre-existing" }] }),
      sigs({ alpha: sig("alpha", "blocked") }),
      { enforce: true },
    );
    expect(t.throttled.map((x) => x.subtask_id)).toEqual(["a"]);
    expect(t.vetoed.map((v) => v.subtask_id)).toEqual(["z"]); // "a" is NOT added to vetoed -- distinct concern
  });

  it("ENFORCE + high but default holdAtOrAbove=blocked: high is NOT held (only blocked holds)", () => {
    const t = ZuluWaveSchedulerEngine.throttleWave(gwave([asg("a", "alpha")]), sigs({ alpha: sig("alpha", "high") }), { enforce: true });
    expect(t.wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]); // high < blocked threshold -> dispatched
    expect(t.throttled).toEqual([]);
    expect(t.back_pressure[0].pressure_level).toBe("high"); // still surfaced
  });

  it("ENFORCE + holdAtOrAbove='high': a high slot IS held", () => {
    const t = ZuluWaveSchedulerEngine.throttleWave(gwave([asg("a", "alpha")]), sigs({ alpha: sig("alpha", "high") }), { enforce: true, holdAtOrAbove: "high" });
    expect(t.wave_assignments).toEqual([]);
    expect(t.throttled.map((x) => x.subtask_id)).toEqual(["a"]);
  });

  it("a slot with NO signal is dispatched even when enforcing (only signalled+saturated slots hold)", () => {
    const t = ZuluWaveSchedulerEngine.throttleWave(gwave([asg("a", "alpha"), asg("b", "bravo")]), sigs({ alpha: sig("alpha", "blocked") }), { enforce: true });
    expect(t.wave_assignments.map((a) => a.slot)).toEqual(["bravo"]); // bravo has no signal -> dispatched
    expect(t.throttled.map((x) => x.slot)).toEqual(["alpha"]);
  });

  it("UNDEFINED signals -> byte-identical pass-through (throttled:[], back_pressure:[])", () => {
    const base = gwave([asg("a", "alpha"), asg("b", "bravo")]);
    const t = ZuluWaveSchedulerEngine.throttleWave(base, undefined, { enforce: true });
    expect(t.wave_assignments).toEqual(base.wave_assignments);
    expect(t.throttled).toEqual([]);
    expect(t.back_pressure).toEqual([]);
  });

  it("a 'low' signal is NOT surfaced (back_pressure lists only real pressure)", () => {
    const t = ZuluWaveSchedulerEngine.throttleWave(gwave([asg("a", "alpha")]), sigs({ alpha: sig("alpha", "low") }), { enforce: false });
    expect(t.back_pressure).toEqual([]);
    expect(t.wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);
  });

  it("escalate flag propagates onto the throttled record (for the AGENT_CHAT escalation consumer)", () => {
    const t = ZuluWaveSchedulerEngine.throttleWave(gwave([asg("a", "alpha")]), sigs({ alpha: sig("alpha", "blocked", { escalate: true }) }), { enforce: true });
    expect(t.throttled[0].escalate).toBe(true);
  });

  it("PER-SLOT isolation: blocked slot held, low slot dispatched + not surfaced", () => {
    const t = ZuluWaveSchedulerEngine.throttleWave(
      gwave([asg("a", "alpha"), asg("b", "bravo")]),
      sigs({ alpha: sig("alpha", "blocked"), bravo: sig("bravo", "low") }),
      { enforce: true },
    );
    expect(t.wave_assignments.map((a) => a.slot)).toEqual(["bravo"]);
    expect(t.throttled.map((x) => x.slot)).toEqual(["alpha"]);
    expect(t.back_pressure.map((s) => s.slot)).toEqual(["alpha"]); // bravo "low" filtered out
  });
});

// ---- C1+C2 resumability: mergeCompleted / loopCheckpointState (survives /compact) ----
describe("ZuluWaveSchedulerEngine.mergeCompleted -- continuity merge for resumable wave loops", () => {
  it("merges prior + newly-completed, order-stable", () => {
    expect(ZuluWaveSchedulerEngine.mergeCompleted(["a"], ["b"])).toEqual(["a", "b"]);
  });
  it("dedups across prior and newly (a checkpoint replayed once is idempotent)", () => {
    expect(ZuluWaveSchedulerEngine.mergeCompleted(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });
  it("undefined / non-array inputs -> [] (a missing or corrupt continuity record never crashes resume)", () => {
    expect(ZuluWaveSchedulerEngine.mergeCompleted(undefined, undefined)).toEqual([]);
    expect(ZuluWaveSchedulerEngine.mergeCompleted("nope" as unknown as unknown[], ["a"])).toEqual(["a"]);
  });
  it("ADVERSARIAL: drops non-string / empty / duplicate ids from a tampered record", () => {
    expect(ZuluWaveSchedulerEngine.mergeCompleted(["a", 5, "", null, "a", "b"] as unknown[], ["b", "c"])).toEqual(["a", "b", "c"]);
  });
});

describe("ZuluWaveSchedulerEngine.loopCheckpointState -- the C2 checkpoint payload", () => {
  const cands = () => [cand("alpha", "mill"), cand("bravo", "mill"), cand("charlie", "mill")];
  const diamond = () => [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])];
  const soul = (over: Partial<SlotSoul>): SlotSoul =>
    ({ hermes_role: "specialist", domain_filter: "", refuse_list: [], ...over } as unknown as SlotSoul);
  const allAuth = () => new Map<string, SlotSoul | null>(Object.entries({
    alpha: soul({ domain_filter: "work" }), bravo: soul({ domain_filter: "work" }), charlie: soul({ domain_filter: "work" }),
  }));

  it("non-terminal wave -> phase 'wave-loop', completed_ids is the resume key, last_dispatch + pending_blocked surfaced", () => {
    const exec = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), [], allAuth());
    const s = ZuluWaveSchedulerEngine.loopCheckpointState([], exec);
    expect(s.phase).toBe("wave-loop");
    expect(s.completed_ids).toEqual([]);
    expect(s.last_dispatch).toEqual(["a"]);
    expect((s.pending_blocked as string[]).slice().sort()).toEqual(["b", "c", "d"]);
    expect(s.done).toBe(false);
  });

  it("terminal wave -> phase 'wave-loop-done', done=true (a resumer stops without recomputing)", () => {
    const exec = ZuluWaveSchedulerEngine.governedNextWave(freq(diamond(), cands()), ["a", "b", "c", "d"], allAuth());
    const s = ZuluWaveSchedulerEngine.loopCheckpointState(["a", "b", "c", "d"], exec);
    expect(s.phase).toBe("wave-loop-done");
    expect(s.done).toBe(true);
  });

  it("RESUMABILITY round-trip: a loop resumed from ONLY the checkpointed completed_ids advances correctly", () => {
    // Simulates a multi-wave build interrupted by /compact between every wave: only the C2 checkpoint
    // (its completed_ids) survives; we feed it back via mergeCompleted and prove the next wave is exact.
    const req = freq(diamond(), cands());
    const auth = allAuth();

    // wave 1: nothing done -> dispatch "a"; checkpoint completed_ids=[]
    const c0 = ZuluWaveSchedulerEngine.mergeCompleted(undefined, []);
    const w1 = ZuluWaveSchedulerEngine.governedNextWave(req, c0, auth);
    const ck1 = ZuluWaveSchedulerEngine.loopCheckpointState(c0, w1);
    expect(w1.wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);

    // /compact. resume from ck1 ONLY + "a" finished -> dispatch b,c
    const c1 = ZuluWaveSchedulerEngine.mergeCompleted(ck1.completed_ids as string[], ["a"]);
    const w2 = ZuluWaveSchedulerEngine.governedNextWave(req, c1, auth);
    expect(c1).toEqual(["a"]);
    expect(w2.wave_assignments.map((a) => a.subtask_id).slice().sort()).toEqual(["b", "c"]);

    // /compact. resume + b,c finished -> dispatch d -> then done
    const c2 = ZuluWaveSchedulerEngine.mergeCompleted(c1, ["b", "c"]);
    const w3 = ZuluWaveSchedulerEngine.governedNextWave(req, c2, auth);
    expect(w3.wave_assignments.map((a) => a.subtask_id)).toEqual(["d"]);
    const c3 = ZuluWaveSchedulerEngine.mergeCompleted(c2, ["d"]);
    const wDone = ZuluWaveSchedulerEngine.governedNextWave(req, c3, auth);
    expect(ZuluWaveSchedulerEngine.loopCheckpointState(c3, wDone).phase).toBe("wave-loop-done");
    expect(wDone.done).toBe(true);
  });
});
