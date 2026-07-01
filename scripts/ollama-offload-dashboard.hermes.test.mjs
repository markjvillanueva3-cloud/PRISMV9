import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeHermesWorkLoop, renderHermesWorkLoop } from "./ollama-offload-dashboard.mjs";

const T = Date.UTC(2026, 5, 30, 18, 0, 0);
const DAY = "2026-06-30";

const wlRow = (over = {}) => ({ schemaVersion: "1.0.0", subtask_id: "U-X", domain: "mill", lane: "cloud", source: "roadmap", ok: true, agentOutput: "x".repeat(400), ...over });
const swRow = (over = {}) => ({ schemaVersion: "1.0.0", stampedAt: new Date(T).toISOString(), fired: true, agentsFired: 1, armed: true, ...over });

test("summarizeHermesWorkLoop HAPPY: counts agents, ok-rate, est tokens, domains, sweeps, today budget", () => {
  const wl = [wlRow(), wlRow({ ok: false, domain: "lathe" }), wlRow({ domain: "lathe" })];
  const sw = [swRow(), swRow({ fired: false, wouldFire: true, agentsFired: 0, armed: false })];
  const state = { budgetDay: DAY, dailyCallsUsed: 2, lastSweepMs: T };
  const h = summarizeHermesWorkLoop(wl, sw, state, T);
  assert.equal(h.agents, 3);
  assert.equal(h.okAgents, 2);
  assert.ok(Math.abs(h.okRate - 2 / 3) < 1e-9);
  // 3 rows * 400 chars / 4 = 300 output tokens; + 2 ok agents * 600 prompt est = 1500
  assert.equal(h.estOutputTokens, 300);
  assert.equal(h.estClaudeTokensSaved, 300 + 2 * 600);
  assert.deepEqual(h.byDomain, { mill: 1, lathe: 2 });
  assert.equal(h.sweeps, 2);
  assert.equal(h.firedSweeps, 1);
  assert.equal(h.wouldFireSweeps, 1);
  assert.equal(h.agentsViaSweep, 1);
  assert.equal(h.todaySpent, 2);
  assert.equal(h.armed, false); // last sweep row was the un-armed one
});

test("summarizeHermesWorkLoop BUDGET DAY GATE: yesterday's spend does not count as today's", () => {
  const h = summarizeHermesWorkLoop([], [], { budgetDay: "2026-06-29", dailyCallsUsed: 250, lastSweepMs: T }, T);
  assert.equal(h.todaySpent, 0); // stale day -> 0 today
});

test("summarizeHermesWorkLoop EMPTY: no rows -> zeros, okRate null, no throw", () => {
  const h = summarizeHermesWorkLoop([], [], {}, T);
  assert.equal(h.agents, 0);
  assert.equal(h.sweeps, 0);
  assert.equal(h.okRate, null);
  assert.equal(h.estClaudeTokensSaved, 0);
});

test("summarizeHermesWorkLoop ADVERSARIAL: null/garbage rows skipped, never throws", () => {
  const wl = [null, 42, "x", wlRow(), { ok: true }]; // only 2 are valid objects
  assert.doesNotThrow(() => summarizeHermesWorkLoop(wl, null, null, T));
  const h = summarizeHermesWorkLoop(wl, null, null, T);
  assert.equal(h.agents, 2);        // wlRow() + {ok:true}
  assert.equal(h.okAgents, 2);
  assert.equal(h.sweeps, 0);        // sweepRows null -> []
  assert.doesNotThrow(() => summarizeHermesWorkLoop());
});

test("renderHermesWorkLoop: empty -> 'no activity' line; populated -> proof lines", () => {
  const empty = renderHermesWorkLoop(summarizeHermesWorkLoop([], [], {}, T));
  assert.match(empty.join("\n"), /no Hermes work-loop activity/);
  const h = summarizeHermesWorkLoop([wlRow(), wlRow({ ok: false })], [swRow()], { budgetDay: DAY, dailyCallsUsed: 1 }, T);
  const lines = renderHermesWorkLoop(h).join("\n");
  assert.match(lines, /agents fired:\s+2/);
  assert.match(lines, /est off-Claude tokens:/);
  assert.match(lines, /50% ok/); // 1 of 2 ok
  assert.match(lines, /sweeps:\s+1/);
});
