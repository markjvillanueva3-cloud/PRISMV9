/**
 * stress-battery-generative-judged.mjs -- the GENERATIVE battery (summarize/explain x easy/med/hard)
 * graded by the LLM-JUDGE instead of keyword-overlap. Reuses the EXACT same cases + prompts as
 * stress-battery-generative.mjs (clone-don't-fork: one source of truth for the texts + required
 * facts), swapping only the SYNC keyword `verify` for the ASYNC judgeFactCapture. Registered as the
 * `generative-judged` battery; run on a FLEET-IDLE GPU (the judge is a 32b call per case).
 *
 * This exists to fix the keyword metric's HARD-tier brittleness: a strong model's correct PARAPHRASE
 * scores a false 0% under substring matching but PASSES under the semantic judge. Compare a
 * `generative` run (keyword) vs a `generative-judged` run (judge) to see the brittleness resolve.
 *
 * Self-test (run-as-main): grades a synthetic good/bad output with an INJECTED deterministic judge
 * (no network) so verify() wiring is proven without a GPU:
 *   node H:/prism/scripts/lib/stress-battery-generative-judged.mjs
 * Expected: SELFTEST OK n/n
 */

import { BATTERY as GENERATIVE } from "./stress-battery-generative.mjs";
import { judgeFactCapture } from "./stress-judge.mjs";

// Clone each generative task; keep id/prompt/cases/difficulty, replace verify with the LLM-judge over
// the SAME `must` facts. id/category get a `-judged` suffix so a mixed run stays attributable.
export const BATTERY = GENERATIVE.map((t) => ({
  id: `${t.id}-judged`,
  category: `${t.category}-judged`,
  difficulty: t.difficulty,
  cases: t.cases,
  prompt: t.prompt,
  // ASYNC verify: the runner awaits it (ollama-stress-test.mjs runTaskOnModel). The judge reads the
  // output + the required facts and returns PASS/FAIL on SEMANTIC capture (paraphrase counts).
  verify: async (out, c) => judgeFactCapture(out, c.must),
}));

// ---------------------------------------------------------------------------
// Self-test: prove the verify wiring grades good PASS / bad FAIL with an INJECTED judge (no network).
// The injected judge is a deterministic stand-in (covers-all-facts heuristic) -- this tests the
// BATTERY WIRING (async verify shape + must-passing), NOT the real model (that needs the GPU run).
// ---------------------------------------------------------------------------
async function selfTest() {
  // BATTERY.verify uses the DEFAULT (network) judge, so for an OFFLINE self-test we re-grade each
  // case through judgeFactCapture with an INJECTED deterministic judge -- proving the async verify
  // shape + must-passing without a GPU. The real model run is the live `generative-judged` sweep.
  const { judgeFactCapture: jfc } = await import("./stress-judge.mjs");
  let pass = 0, total = 0;
  for (const t of BATTERY) {
    for (const c of t.cases) {
      total += 1;
      const good = c.must.map((g) => g[0]).join(" ; ");
      const bad = c.must.slice(0, -1).map((g) => g[0]).join(" ; ") || "(none)";
      // Inject a judge that returns PASS iff every required fact-group's first synonym is in the output.
      const callFn = (_model, prompt) => {
        const m = prompt.match(/OUTPUT TO GRADE:\n([\s\S]*?)\n\nReason/);
        const out = (m ? m[1] : "").toLowerCase();
        const ok = c.must.every((g) => g.some((s) => out.includes(String(s).toLowerCase())));
        return Promise.resolve(ok ? "FAIL? no -- final: PASS" : "FAIL");
      };
      const goodOk = (await jfc(good, c.must, { callFn })) === true;
      const badOk = (await jfc(bad, c.must, { callFn })) === false;
      if (goodOk && badOk) pass += 1;
      else process.stderr.write(`  FAIL ${t.id}: good=${goodOk} bad=${badOk}\n`);
    }
  }
  process.stdout.write(`SELFTEST ${pass === total ? "OK" : "FAILED"} ${pass}/${total}\n`);
  return pass === total;
}

const invokedDirectly = (() => {
  try {
    return (process.argv[1] || "").replace(/\\/g, "/").endsWith("stress-battery-generative-judged.mjs");
  } catch {
    return false;
  }
})();
if (invokedDirectly) selfTest().then((ok) => process.exit(ok ? 0 : 1));
