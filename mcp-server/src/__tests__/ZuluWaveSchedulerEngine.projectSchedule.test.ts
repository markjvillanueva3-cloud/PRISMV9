/**
 * ZuluWaveSchedulerEngine.projectGovernedSchedule -- the C1 full governed multi-wave projection
 * (U-WAVE-PROJECT-SCHEDULE, slot:bravo). governedNextWave returns ONE governed wave; this projects
 * the COMPLETE run in one call (simulating all-dispatched-succeeds) and returns a drains/stalled
 * FEASIBILITY verdict -- the upfront check a runtime executor runs BEFORE spawning any agent.
 *
 * Real reference-value tests: exact wave membership, dispatch counts, and the drains/stalled split.
 * They fail on real regressions (a lost overflow subtask, a missed governance stall, a double
 * dispatch). Authority model (same as governedNextWave): domain_filter "work" matches every
 * "work for <id>" description -> authorized; refuse_list vetoes; an absent soul fails closed.
 */
import { describe, it, expect } from "vitest";
import { ZuluWaveSchedulerEngine } from "../engines/ZuluWaveSchedulerEngine.js";
import type { FanoutPlanRequest, SlotCandidate } from "../engines/HermesParallelFanoutPlannerEngine.js";
import type { SlotSoul } from "../engines/SoulFrontmatterReaderEngine.js";

const st = (subtask_id: string, depends_on: string[] = []) => ({
  subtask_id, description: `work for ${subtask_id}`, domain: "mill", depends_on, size_hint: "short" as const,
});
const cand = (slot: string, primary_domain: string | null, score = 5): SlotCandidate =>
  ({ slot, hermes_role: "specialist", primary_domain, score } as SlotCandidate);
const freq = (subtasks: ReturnType<typeof st>[], candidates: SlotCandidate[], max_parallel = 5): FanoutPlanRequest =>
  ({ parent_task_id: "exec", subtasks, candidates, max_parallel } as FanoutPlanRequest);
const soul = (over: Partial<SlotSoul>): SlotSoul =>
  ({ hermes_role: "specialist", domain_filter: "", refuse_list: [], ...over } as unknown as SlotSoul);
const souls = (m: Record<string, SlotSoul | null>) => new Map<string, SlotSoul | null>(Object.entries(m));

const mills = [cand("alpha", "mill"), cand("bravo", "mill"), cand("charlie", "mill")];
const allAuth = () => souls({
  alpha: soul({ domain_filter: "work" }), bravo: soul({ domain_filter: "work" }), charlie: soul({ domain_filter: "work" }),
});
const diamond = () => [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])];
const dispatchedIds = (s: ReturnType<typeof ZuluWaveSchedulerEngine.projectGovernedSchedule>) =>
  s.waves.flatMap((w) => w.wave_assignments.map((a) => a.subtask_id));

describe("ZuluWaveSchedulerEngine.projectGovernedSchedule -- full governed projection (C1 core)", () => {
  it("HAPPY: a fully-authorized diamond DRAINS in 3 waves; all 4 subtasks dispatch exactly once", () => {
    const s = ZuluWaveSchedulerEngine.projectGovernedSchedule(freq(diamond(), mills), allAuth());
    expect(s.drains).toBe(true);
    expect(s.stalled).toEqual([]);
    expect(s.dispatched_count).toBe(4);
    expect(s.total_subtasks).toBe(4);
    expect(s.wave_count).toBe(3);
    expect(s.waves[0].wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);
    expect(s.waves[1].wave_assignments.map((a) => a.subtask_id).sort()).toEqual(["b", "c"]);
    expect(s.waves[2].wave_assignments.map((a) => a.subtask_id)).toEqual(["d"]);
    const all = dispatchedIds(s);
    expect(new Set(all).size).toBe(all.length);            // no subtask dispatched twice
    expect(all.sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("CYCLE: a dependency cycle THROWS (same contract as allWaves -- never an infinite loop)", () => {
    const cyclic = freq([st("a", ["b"]), st("b", ["a"])], mills);
    expect(() => ZuluWaveSchedulerEngine.projectGovernedSchedule(cyclic, allAuth())).toThrow(/cycle/i);
  });

  it("GOVERNANCE STALL: a refuse_list veto mid-chain dispatches the earlier subtask, then STALLS the vetoed one + its dependents", () => {
    // chain a->b->c; the only mill slot (alpha) is authorized for "work" but refuses "work for b".
    const chain = freq([st("a"), st("b", ["a"]), st("c", ["b"])], [cand("alpha", "mill")]);
    const s = ZuluWaveSchedulerEngine.projectGovernedSchedule(chain, souls({ alpha: soul({ domain_filter: "work", refuse_list: ["work for b"] }) }));
    expect(s.drains).toBe(false);
    expect(s.dispatched_count).toBe(1);                    // only a dispatched
    expect(s.waves[0].wave_assignments.map((a) => a.subtask_id)).toEqual(["a"]);
    expect(s.stalled.sort()).toEqual(["b", "c"]);          // b vetoed, c blocked on b -> both un-completable
  });

  it("FAIL-CLOSED: an empty souls map authorizes nothing -> the whole DAG stalls (drains:false, 0 dispatched)", () => {
    const s = ZuluWaveSchedulerEngine.projectGovernedSchedule(freq(diamond(), mills), souls({}));
    expect(s.drains).toBe(false);
    expect(s.dispatched_count).toBe(0);
    expect(s.wave_count).toBe(0);
    expect(s.stalled.sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("OVERFLOW DRAINS: 3 parallel leaves at max_parallel=1 fully drain over 3 single-dispatch waves (overflow re-offered, never lost)", () => {
    const leaves = freq([st("a"), st("b"), st("c")], mills, 1);
    const s = ZuluWaveSchedulerEngine.projectGovernedSchedule(leaves, allAuth());
    expect(s.drains).toBe(true);
    expect(s.stalled).toEqual([]);
    expect(s.dispatched_count).toBe(3);
    expect(s.wave_count).toBe(3);
    s.waves.forEach((w) => expect(w.wave_assignments.length).toBe(1)); // max_parallel=1 -> one dispatch per wave
    expect(dispatchedIds(s).sort()).toEqual(["a", "b", "c"]);           // all three eventually dispatch
  });

  it("MINIMAL: a single authorized subtask drains in exactly one wave", () => {
    const s = ZuluWaveSchedulerEngine.projectGovernedSchedule(freq([st("solo")], mills), allAuth());
    expect(s.drains).toBe(true);
    expect(s.wave_count).toBe(1);
    expect(s.dispatched_count).toBe(1);
    expect(s.waves[0].wave_assignments.map((a) => a.subtask_id)).toEqual(["solo"]);
  });

  it("renderProjectedSchedule distinguishes DRAINS from STALLED", () => {
    const drained = ZuluWaveSchedulerEngine.projectGovernedSchedule(freq([st("solo")], mills), allAuth());
    expect(ZuluWaveSchedulerEngine.renderProjectedSchedule(drained)).toMatch(/SCHEDULE DRAINS/);
    const stalledS = ZuluWaveSchedulerEngine.projectGovernedSchedule(freq([st("solo")], mills), souls({}));
    expect(ZuluWaveSchedulerEngine.renderProjectedSchedule(stalledS)).toMatch(/SCHEDULE STALLED/);
  });

  it("renderProjectedSchedule tolerates a SLIMMED schedule (empty waves/stalled DROPPED) without throwing", () => {
    // A dispatcher response runs slimResponse() which drops empty arrays, so a round-tripped
    // fully-drained schedule arrives with stalled (and possibly waves) ABSENT. The renderer must
    // treat a missing array as empty -- pre-fix it did `s.stalled.length` and threw on the round-trip.
    const slimmed = { parent_task_id: "exec", dispatched_count: 4, total_subtasks: 4, drains: true, wave_count: 3 } as unknown as Parameters<typeof ZuluWaveSchedulerEngine.renderProjectedSchedule>[0];
    const out = ZuluWaveSchedulerEngine.renderProjectedSchedule(slimmed);
    expect(out).toMatch(/SCHEDULE DRAINS/);
    expect(out).toMatch(/dispatched=4\/4/);
  });
});
