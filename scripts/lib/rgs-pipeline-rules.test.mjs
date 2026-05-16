import { test } from "node:test";
import assert from "node:assert/strict";
import { matchPipelines, matchAgents } from "./rgs-pipeline-rules.mjs";

test("pdf/document text -> /pdf-learn", () => {
  assert.ok(matchPipelines({ title:"Ingest vendor PDF catalog", description:"parse document" }).some(x=>x.skill==="/pdf-learn"));
});

test("new engine+skill+hook -> /forge-triple", () => {
  assert.ok(matchPipelines({ title:"Create FooEngine + skill + hook", description:"" }).some(x=>x.skill==="/forge-triple"));
});

test("unwired/dispatcher wiring -> /wire-unwired", () => {
  assert.ok(matchPipelines({ title:"Wire BarEngine to dispatcher", description:"needs wiring" }).some(x=>x.skill==="/wire-unwired"));
});

test("physics/kienzle unit -> physics-reviewer agent", () => {
  assert.ok(matchAgents({ title:"Kienzle force model fix", description:"cutting force" }).includes("physics-reviewer"));
});

test("CONTRAPOSITIVE: pure-docs unit does NOT map to /forge-triple", () => {
  assert.equal(matchPipelines({ title:"Update README wording", description:"docs only" }).some(x=>x.skill==="/forge-triple"), false);
});

test("every unit gets >=1 pipeline (generic fallback when no keyword hits)", () => {
  assert.ok(matchPipelines({ title:"zxqv", description:"" }).length >= 1);
});

test("test/coverage unit -> test-team pipeline", () => {
  assert.ok(matchPipelines({ title:"Add vitest coverage for X", description:"test" }).some(x=>x.skill==="test-team"));
});

test("matchAgents returns [] for a plain unit with no review-triggering keywords", () => {
  assert.deepEqual(matchAgents({ title:"Update README wording", description:"docs" }), []);
});

// U-DOMAIN-RULES (RGS-TOOL-AUTOINVOKE-MS1) — domain branches + Wire-EDM-false-match fix

test("mill keyword -> /mill domain orchestrator", () => {
  assert.ok(matchPipelines({ title:"Multi-axis pocketing for ALCOA fixture", description:"3+2 milling job on the Haas TM" })
    .some(x => x.skill === "/mill"));
});

test("milling synonym still hits /mill (gerund form)", () => {
  assert.ok(matchPipelines({ title:"Optimize roughing milling strategy", description:"adaptive clearing" })
    .some(x => x.skill === "/mill"));
});

test("lathe keyword -> /lathe domain orchestrator", () => {
  assert.ok(matchPipelines({ title:"Lathe program for shaft", description:"OD turning + threading" })
    .some(x => x.skill === "/lathe"));
});

test("turning synonym still hits /lathe", () => {
  assert.ok(matchPipelines({ title:"Turning insert life prediction", description:"Weibull fit" })
    .some(x => x.skill === "/lathe"));
});

test("wedm keyword -> /wedm domain orchestrator", () => {
  assert.ok(matchPipelines({ title:"WEDM pass schedule optimization", description:"rough + 2 skim" })
    .some(x => x.skill === "/wedm"));
});

test("wire-edm spelled out still hits /wedm", () => {
  assert.ok(matchPipelines({ title:"Wire EDM corner physics fix", description:"taper compensation" })
    .some(x => x.skill === "/wedm"));
});

test("cam strategy keyword -> /cam-strategy", () => {
  assert.ok(matchPipelines({ title:"CAM strategy selection for thin-wall", description:"toolpath synth" })
    .some(x => x.skill === "/cam-strategy"));
});

test("cad keyword -> /cad-from-blueprint", () => {
  assert.ok(matchPipelines({ title:"CAD model from print", description:"feature extraction" })
    .some(x => x.skill === "/cad-from-blueprint"));
});

test("blueprint keyword still hits /cad-from-blueprint", () => {
  assert.ok(matchPipelines({ title:"Blueprint to STEP conversion", description:"OCR + reconstruct" })
    .some(x => x.skill === "/cad-from-blueprint"));
});

// CONTRAPOSITIVE — punch-list bug: "Wire EDM" units must NOT trip /wire-unwired
test("CONTRAPOSITIVE: 'Wire EDM' unit does NOT false-match /wire-unwired", () => {
  const matches = matchPipelines({ title:"Wire EDM program optimization", description:"pass schedule + flush" });
  assert.equal(matches.some(x => x.skill === "/wire-unwired"), false,
    "Wire EDM units must route to /wedm only — /wire-unwired is for dispatcher-wiring orphans");
});

// CONTRAPOSITIVE — a pure milling unit must NOT trip /wire-unwired (no wiring lang)
test("CONTRAPOSITIVE: pure milling unit does NOT trip /wire-unwired", () => {
  const matches = matchPipelines({ title:"Mill speed/feed for 4140", description:"chip-thinning tune" });
  assert.equal(matches.some(x => x.skill === "/wire-unwired"), false);
});

// REGRESSION GUARD — the original wiring assertion still passes (don't weaken)
test("REGRESSION: 'Wire BarEngine to dispatcher needs wiring' still hits /wire-unwired", () => {
  assert.ok(matchPipelines({ title:"Wire BarEngine to dispatcher", description:"needs wiring" })
    .some(x => x.skill === "/wire-unwired"),
    "structural wiring units must still hit /wire-unwired — the tightening cannot break the existing test");
});

// COMPOSITE — a single unit can hit multiple domain rules (mill + lathe for mill-turn)
test("mill-turn unit hits BOTH /mill and /lathe", () => {
  const matches = matchPipelines({ title:"Mill-turn program for Multus", description:"OD turning + live tooling milling" });
  const skills = matches.map(m => m.skill);
  assert.ok(skills.includes("/mill"), "mill-turn must hit /mill");
  assert.ok(skills.includes("/lathe"), "mill-turn must hit /lathe");
});

// EDGE — non-keyword English words must NOT trip mill (\b boundary discipline)
test("EDGE: 'milligrams' must NOT trip /mill", () => {
  // \bmill\b cannot match the prefix of 'milligrams' (no trailing word boundary after 'mill')
  assert.equal(matchPipelines({ title:"convert milligrams reading", description:"" })
    .some(x => x.skill === "/mill"), false);
});

// Polysemy guards added per Arm A scrutiny P0-1 (turning/Okuma over-fire).
test("POLYSEMY: 'a turning point in the project' must NOT trip /lathe", () => {
  assert.equal(matchPipelines({ title:"a turning point in the project", description:"" })
    .some(x => x.skill === "/lathe"), false,
    "bare 'turning' without manufacturing context is the English idiom, not lathe-domain");
});

test("POLYSEMY: 'Okuma operator manual update' must NOT trip /lathe", () => {
  // Okuma also makes HMCs/VMCs (MA-600, MB-46V, GENOS M460) and grinders —
  // bare 'okuma' is NOT a lathe-only signal.
  assert.equal(matchPipelines({ title:"Okuma operator manual update", description:"docs" })
    .some(x => x.skill === "/lathe"), false);
});

test("POLYSEMY: 'Okuma LB3000' MUST trip /lathe (paired with lathe model)", () => {
  // The fix must not over-correct — Okuma LB/LT/MULTUS are lathe-context tokens.
  assert.ok(matchPipelines({ title:"Okuma LB3000 post-processor", description:"OSP-P300" })
    .some(x => x.skill === "/lathe"));
});

test("POLYSEMY: 'drawing conclusions from data' must NOT trip /cad-from-blueprint", () => {
  // Arm A P1-2: \bdrawing\b is too broad — dropped from the rule (the other
  // CAD tokens cover legitimate intake).
  assert.equal(matchPipelines({ title:"drawing conclusions from data", description:"analysis" })
    .some(x => x.skill === "/cad-from-blueprint"), false);
});

test("POLYSEMY: 'drawing power from the spindle' must NOT trip /cad-from-blueprint", () => {
  assert.equal(matchPipelines({ title:"drawing power from the spindle", description:"motor load" })
    .some(x => x.skill === "/cad-from-blueprint"), false);
});

// Arm A P3-2: AGENT_RULES had the SAME wire-EDM false-match bug as the
// pipeline rule I just fixed three rules above. Apply the same exclusion.
test("AGENT-CONTRAPOSITIVE: 'Wire EDM corner physics fix' must NOT trip wiring-review-agent", () => {
  const agents = matchAgents({ title:"Wire EDM corner physics fix", description:"taper compensation" });
  assert.equal(agents.includes("wiring-review-agent"), false,
    "Wire EDM units must NOT route to the wiring-review-agent — same false-match class as the pipeline rule");
});

test("AGENT-CONTRAPOSITIVE: 'Wire EDM corner physics fix' MUST still hit physics-reviewer", () => {
  // The exclusion fix cannot weaken the physics-reviewer rule — physics terms
  // (force/thermal/feed/speed/kienzle/taylor) still route to physics-reviewer.
  const agents = matchAgents({ title:"Wire EDM corner physics fix", description:"taper compensation" });
  assert.ok(agents.includes("physics-reviewer"));
});

// Arm A P0-2: file docstring claims "mutation throws in strict mode" but
// Object.freeze is shallow — inner objects were mutable. Deep-freeze fix.
test("FREEZE-CONTRACT: mutating a returned rule's confidence must throw in strict mode", () => {
  "use strict";
  const result = matchPipelines({ title:"Multi-axis pocketing for ALCOA fixture", description:"" });
  assert.ok(result.length >= 1, "test pre-condition: matchPipelines returned at least one entry");
  assert.throws(
    () => { result[0].confidence = 999; },
    /Cannot assign to read only property/,
    "the file's docstring promises 'mutation throws in strict mode' — inner objects must be deep-frozen",
  );
});

test("FREEZE-CONTRACT: mutating the GENERIC_FALLBACK return must throw in strict mode", () => {
  "use strict";
  const result = matchPipelines({ title:"zxqv-nonsense-no-keyword", description:"" });
  assert.ok(result.length >= 1, "test pre-condition: generic fallback returned at least one entry");
  assert.throws(() => { result[0].confidence = 999; }, /Cannot assign to read only property/);
});
