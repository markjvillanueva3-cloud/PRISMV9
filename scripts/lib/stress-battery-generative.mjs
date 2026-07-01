/**
 * stress-battery-generative.mjs -- GENERATIVE-mode capability battery for Ollama stress-testing.
 * Consumed by scripts/ollama-stress-test.mjs runTierSweep (pass as tasks: BATTERY), registered in
 * scripts/ollama-stress-expanded-run.mjs as the "generative" battery.
 *
 * WHY THIS EXISTS (the named gap):
 *   The 6 existing batteries (reasoning/jsonschema/mfgdomain/instruction/codegen/longcontext) grade
 *   by EXACT-MATCH on a single canonical answer. But ask-ollama's PRODUCTION offload modes
 *   (summarize / explain / triage) are GENERATIVE -- their quality is a MEASUREMENT, not an exact
 *   match (reference_ollama_executor_selection_architecture_2026_06_25). This battery measures
 *   generative quality via REFERENCE-OVERLAP: a model's free-text output must COVER the essential
 *   key facts of the input. Stratified by DIFFICULTY (easy/medium/hard) so the matrix shows the
 *   FRONTIER -- the hardest generative task each model handles before quality collapses. That
 *   stratified table is the unblocker for routing a generative offload to the cheapest-SUFFICIENT
 *   model rather than always the biggest.
 *
 * METRIC (deterministic, defensible -- NOT exact-match, NOT an LLM-judge dependency):
 *   verify() passes iff the output COVERS every required fact-group. Each fact-group is a list of
 *   accepted synonyms; the group is "covered" when >=1 synonym appears in the normalized output.
 *   ALL groups must be covered -> the summary/explanation retained the essential content. A model
 *   that drops a key fact (the failure mode that matters for offload) fails the case. This is a
 *   recall-of-essential-facts proxy: it cannot reward fluent-but-wrong text, only fact coverage.
 *
 * Self-test (run-as-main) -- proves the metric grades a known-good output PASS and a known-bad
 * (fact-dropping) output FAIL for every case, so verify() is real (R9, no stub):
 *   node H:/prism/scripts/lib/stress-battery-generative.mjs
 * Expected: SELFTEST OK n/n
 */

import { norm } from "./ollama-capability-battery.mjs";

/**
 * Does `out` COVER every required fact-group? Each group is an array of accepted synonyms; a group
 * is covered when at least one synonym is a substring of the normalized lowercased output. ALL
 * groups must be covered. Pure -> unit-testable without a model.
 * @param {string} out  the model's free-text output
 * @param {string[][]} groups  required fact-groups (each: synonyms, any one satisfies the group)
 * @returns {boolean}
 */
export function coversFacts(out, groups) {
  const t = norm(out).toLowerCase();
  if (!t) return false;
  if (!Array.isArray(groups) || groups.length === 0) return false;
  return groups.every((syns) =>
    Array.isArray(syns) && syns.some((s) => typeof s === "string" && s.length > 0 && t.includes(s.toLowerCase())),
  );
}

// ---------------------------------------------------------------------------
// Battery -- summarize + explain, each stratified easy/medium/hard.
// `difficulty` is metadata for the matrix (the runner ignores unknown fields).
// ---------------------------------------------------------------------------

export const BATTERY = [
  // ===================== SUMMARIZE =====================
  {
    id: "summarize-easy",
    category: "generative-summarize",
    difficulty: "easy",
    cases: [
      {
        text:
          "[2026-06-25 09:14:02] Server started on port 3100. Loaded 312 engines. Health check OK. " +
          "Listening for MCP requests.",
        must: [["3100"], ["312", "engines"], ["start", "listen", "ready", "up"]],
      },
      {
        text:
          "Job JM-4471 completed: 50 parts of 1045 steel, 0 scrap, cycle time 2.3 min/part on VMC-03.",
        must: [["50", "fifty"], ["1045"], ["scrap", "0 scrap", "no scrap", "zero scrap"]],
      },
    ],
    prompt: (c) => `Summarize the following in ONE or TWO sentences, capturing the key facts.\n\n${c.text}`,
    verify: (out, c) => coversFacts(out, c.must),
  },
  {
    id: "summarize-medium",
    category: "generative-summarize",
    difficulty: "medium",
    cases: [
      {
        text:
          "Tool wear analysis for the Inconel 718 roughing pass: at 45 m/min cutting speed the carbide " +
          "insert reached 0.3 mm flank wear after 12 minutes, which is below the 0.4 mm wear limit. " +
          "Increasing speed to 60 m/min cut tool life to 6 minutes, exceeding the per-edge cost target. " +
          "Recommendation: hold 45 m/min and switch to a coated grade to extend life.",
        must: [["inconel", "718"], ["45 m", "45m", "45 meter"], ["coated", "coating", "grade"], ["wear", "tool life", "life"]],
      },
      {
        text:
          "Quote QT-9920 breakdown: material $420, machining 6.5 hr at $95/hr = $617.50, setup $180, " +
          "freight $65. Margin floor 28%. Final quoted price after margin: $1,780. Lead time 3 weeks.",
        must: [["1780", "1,780"], ["28", "margin"], ["3 week", "three week", "lead"], ["material", "machining", "setup"]],
      },
    ],
    prompt: (c) => `Summarize the following in TWO or THREE sentences, preserving the most important numbers and the recommendation/result.\n\n${c.text}`,
    verify: (out, c) => coversFacts(out, c.must),
  },
  {
    id: "summarize-hard",
    category: "generative-summarize",
    difficulty: "hard",
    cases: [
      {
        text:
          "Post-mortem (incident INC-204): the SFC deflection guard collapsed cutting speed Vc 2-7x to " +
          "'resolve' a deflection violation, but deflection is force-driven and INDEPENDENT of Vc, so the " +
          "cut published 2-7x too slow AND the violation persisted (under-protection). Root cause: the " +
          "proportional-reduction block scaled Vc for every failed check instead of routing each check to " +
          "its physically-effective lever. Fix: force-driven checks reduce feed-per-tooth fz by r^(1/(1-mc)); " +
          "only power (the sole true Vc lever) reduces Vc, and last. Parity probe page-vs-core divergence " +
          "fell from 2-7x to 1.0-1.33x; core now in-band for all 6 ISO groups.",
        // The SUBTLE essential fact (hard): Vc is independent of a force/deflection violation.
        must: [
          ["deflection"],
          ["independent", "not depend", "unrelated", "force-driven", "force driven"],
          ["feed", "fz", "feed-per-tooth", "feed per tooth"],
          ["in-band", "in band", "fixed", "resolved", "all 6", "iso"],
        ],
      },
      {
        text:
          "Incident: the GNN tier-5 wiring-inference deploy was gated OFF even though AUROC 0.808 passed " +
          "the 0.78 bar, because macro-F1 (0.439) and Brier (0.179) failed their gates. Calibration " +
          "analysis proved the Brier miss is NOT miscalibration (Murphy reliability only 0.0197 of 0.179) " +
          "-- it is irreducible refinement loss, so calibrating cannot help. BUT at the production " +
          "confidence gate (minConf 0.7) the emitted-set Brier is 0.041 with macro-F1 1.0 at 32% coverage, " +
          "so tier-5 is deploy-ready SELECTIVE: it abstains below the gate and defers to the LLM tier.",
        // SUBTLE fact: calibration WON'T help (refinement loss, not miscalibration) + selective-deploy works.
        must: [
          ["auroc", "0.808"],
          ["macro-f1", "macro f1", "brier"],
          ["calibration", "miscalibration", "irreducible", "refinement"],
          ["selective", "abstain", "minconf", "0.7", "coverage"],
        ],
      },
      {
        text:
          "The tribal brain was clobbered from 33,639 entries to 1 by a fail-OPEN read: when the 537MB " +
          "index crossed V8's 512MiB string-length cap, JSON.parse threw, and readIndex's catch returned " +
          "a fresh empty {entries:[]} ('starting fresh'). A subsequent --add then spliced one file and " +
          "writeIndex clobbered the 537MB brain to a 1-entry stub. The fix: readIndex FAILS LOUD when the " +
          "file exists but will not load (never empty-then-clobber), plus a writeIndex clobber-guard that " +
          "refuses a greater-than-50% shrink over a populated index.",
        // SUBTLE fact: the fail-OPEN catch returning empty is the destruction MECHANISM.
        must: [
          ["clobber", "33,639", "33639", "wiped"],
          ["fail-open", "fail open", "catch", "starting fresh", "returned empty"],
          ["v8", "512", "string cap", "string-length", "string length"],
          ["fail loud", "clobber-guard", "clobber guard", "shrink", "refuse"],
        ],
      },
    ],
    prompt: (c) =>
      `Summarize this engineering post-mortem in 2-3 sentences. You MUST state the ROOT CAUSE (why the original behaviour was wrong) and the FIX, not just that an incident occurred.\n\n${c.text}`,
    verify: (out, c) => coversFacts(out, c.must),
  },

  // ===================== EXPLAIN =====================
  {
    id: "explain-easy",
    category: "generative-explain",
    difficulty: "easy",
    cases: [
      {
        text: "function add(a, b) { return a + b; }",
        must: [["add", "sum", "adds", "addition"], ["return", "result", "gives"], ["two", "a and b", "arguments", "parameters"]],
      },
      {
        text: "G20 sets the CNC controller to program in inches.",
        must: [["g20"], ["inch"], ["unit", "program", "mode", "set"]],
      },
    ],
    prompt: (c) => `Explain what the following does, in one or two plain sentences.\n\n${c.text}`,
    verify: (out, c) => coversFacts(out, c.must),
  },
  {
    id: "explain-medium",
    category: "generative-explain",
    difficulty: "medium",
    cases: [
      {
        text:
          "Climb milling: the cutter rotation moves WITH the feed direction, so each tooth starts at maximum " +
          "chip thickness and exits at zero. This reduces tool rubbing and heat versus conventional milling, " +
          "extending tool life, but it requires a backlash-free machine because the cutter pulls into the work.",
        must: [
          ["climb"],
          ["chip", "thickness"],
          ["tool life", "wear", "heat", "rub"],
          ["backlash", "rigid", "pulls", "pull"],
        ],
      },
      {
        text:
          "G96 constant surface speed (CSS) commands the lathe to vary spindle RPM so the cutting speed " +
          "at the tool stays constant as the part diameter changes -- RPM rises as the tool feeds toward " +
          "center. It gives a consistent surface finish across the face, but RPM can spike dangerously " +
          "near center, so a G50 maximum-spindle-speed clamp is paired with it.",
        must: [
          ["g96", "css", "constant surface"],
          ["rpm", "spindle speed"],
          ["diameter", "center"],
          ["g50", "clamp", "limit", "cap"],
        ],
      },
    ],
    prompt: (c) => `Explain the key mechanism and the main trade-off described below, in 2-3 sentences.\n\n${c.text}`,
    verify: (out, c) => coversFacts(out, c.must),
  },
  {
    id: "explain-hard",
    category: "generative-explain",
    difficulty: "hard",
    cases: [
      {
        text:
          "The Kienzle force model computes specific cutting force as kc = kc1.1 * h^(-mc), where h is the " +
          "undeformed chip thickness and kc1.1 is the specific force at h=1mm. Because mc is between 0.2 and " +
          "0.3 for steel, kc RISES as chip thickness FALLS -- the size effect -- so very light feeds are " +
          "DISPROPORTIONATELY force-hungry per unit volume. Total cutting force Fc = kc * A, where A is the " +
          "chip cross-section ap*fz. Doubling feed therefore does NOT double Fc: the higher h lowers kc.",
        // SUBTLE essential facts (hard): the size effect (kc up as h down) and the non-linearity.
        must: [
          ["kienzle", "kc", "specific cutting force", "specific force"],
          ["chip thickness", "undeformed", "h "],
          ["size effect", "rises", "increase", "higher", "disproportion", "lower"],
          ["not double", "non-linear", "nonlinear", "does not", "doesn't"],
        ],
      },
      {
        text:
          "Climb vs conventional milling chip geometry: in climb milling the cutter rotation aligns WITH " +
          "the feed, so each tooth ENTERS at maximum chip thickness and exits at zero. Counter-intuitively " +
          "this puts LESS heat into the tool, because a cut that starts thick shears cleanly, whereas a " +
          "near-zero-thickness entry makes the edge PLOW/RUB through the work generating friction heat. " +
          "The catch: the cutter pulls the work into itself, so any table backlash lets the work lurch -- " +
          "climb milling REQUIRES a backlash-free (preloaded ballscrew) machine.",
        // SUBTLE fact: the thin-chip RUBBING/PLOWING is what generates heat (so thick-entry is cooler).
        must: [
          ["climb"],
          ["maximum", "max chip", "enters thick", "starts thick", "full thickness"],
          ["plow", "rub", "friction", "shear", "heat"],
          ["backlash", "ballscrew", "preload", "pulls"],
        ],
      },
      {
        text:
          "Constant surface speed (G96/CSS) on a lathe: the control continuously varies spindle RPM so the " +
          "SURFACE speed Vc = pi*D*RPM at the cutting edge stays constant as the tool moves to a smaller " +
          "diameter -- RPM must RISE as D falls. The subtlety: at the part center D approaches 0, so the " +
          "formula demands RPM approaching infinity; the spindle would dangerously over-speed, which is " +
          "exactly why CSS is ALWAYS paired with a G50 maximum-RPM clamp. Facing to center under pure CSS " +
          "without the clamp is a crash hazard.",
        // SUBTLE fact: RPM -> infinity as D -> 0 at center, hence the mandatory G50 clamp.
        must: [
          ["constant surface", "css", "g96"],
          ["rpm", "spindle"],
          ["diameter", "center", "smaller", "d falls", "d approaches"],
          ["g50", "clamp", "infinity", "over-speed", "overspeed", "limit"],
        ],
      },
    ],
    prompt: (c) =>
      `Explain the physics/engineering below in 2-3 sentences. You MUST capture the KEY MECHANISM and the most important SUBTLE or counter-intuitive point, not just a surface restatement.\n\n${c.text}`,
    verify: (out, c) => coversFacts(out, c.must),
  },
];

// ---------------------------------------------------------------------------
// Self-test (run-as-main): prove verify() grades a fact-covering output PASS and
// a fact-dropping output FAIL for every case -- the metric is real, not a stub.
// ---------------------------------------------------------------------------
function selfTest() {
  let pass = 0;
  let total = 0;
  for (const task of BATTERY) {
    for (const c of task.cases) {
      total += 1;
      // GOOD synthetic answer: concatenate one synonym from EVERY required group -> must PASS.
      const good = c.must.map((g) => g[0]).join(" ; ");
      // BAD synthetic answer: drop the LAST required group entirely -> must FAIL.
      const bad = c.must.slice(0, -1).map((g) => g[0]).join(" ; ") || "(empty)";
      const goodOk = task.verify(good, c) === true;
      const badOk = task.verify(bad, c) === false;
      if (goodOk && badOk) pass += 1;
      else process.stderr.write(`  FAIL ${task.id}: good=${goodOk} bad=${badOk}\n`);
    }
  }
  process.stdout.write(`SELFTEST ${pass === total ? "OK" : "FAILED"} ${pass}/${total}\n`);
  return pass === total;
}

const invokedDirectly = (() => {
  try {
    return (process.argv[1] || "").replace(/\\/g, "/").endsWith("stress-battery-generative.mjs");
  } catch {
    return false;
  }
})();
if (invokedDirectly) process.exit(selfTest() ? 0 : 1);
