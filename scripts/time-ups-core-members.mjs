#!/usr/bin/env node
// time-ups-core-members.mjs -- per-member wall-clock profile of ups-core-bundle
// (HARNESS-EFFICIENCY-MS0 P2 diagnostic; rerun after adding members or changing budgets).
// Runs every SUB_HOOKS member once with a synthetic prompt payload at full parallelism
// and prints elapsed ms sorted desc, so slow poles are visible before they cost prompts.
import { runHook } from "../.claude/hooks/bundles/lib/hook-runner.mjs";
import { SUB_HOOKS } from "../.claude/hooks/bundles/ups-core-bundle.mjs";

const payload = JSON.stringify({
  session_id: "profile-ups-core",
  prompt: "profile run: optimize the lathe toolpath for the dovetail part",
  cwd: "H:/prism",
});

const results = await Promise.all(SUB_HOOKS.map(async (s) => {
  const r = await runHook(s.path, payload, s.timeout || 3000);
  return { hook: s.path.split("/").pop(), elapsed: r.elapsed, timedOut: r.timedOut, emitted: !!r.parsed };
}));
results.sort((a, b) => b.elapsed - a.elapsed);
const total = results.reduce((n, r) => n + r.elapsed, 0);
console.log(JSON.stringify({
  members: results.length,
  sumMs: total,
  timedOut: results.filter((r) => r.timedOut).map((r) => r.hook),
  slowest12: results.slice(0, 12),
}, null, 2));
