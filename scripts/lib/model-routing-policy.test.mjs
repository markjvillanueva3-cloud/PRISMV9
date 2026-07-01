// scripts/lib/model-routing-policy.test.mjs
// Tests for U-MODEL-ROUTE-POLICY: per-prompt verdict fusing tier-router + capability matrix.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ollamaSafeClassModels, routePrompt, routeCloudLongContext, BATTERY_TO_CLASS, modelCostRank } from "./model-routing-policy.mjs";

// A matrix shaped like ollama-capability-probe.mjs output.
const MATRIX = {
  models: ["small", "big"],
  matrix: {
    "classify-enum": { category: "classification", models: { small: { pass: 1, total: 3, rate: 0.33 }, big: { pass: 3, total: 3, rate: 1.0 } } },
    "boolean-judgment": { category: "classification", models: { small: { pass: 2, total: 3, rate: 0.67 }, big: { pass: 3, total: 3, rate: 1.0 } } },
    "extract-number": { category: "extraction", models: { small: { pass: 3, total: 3, rate: 1.0 }, big: { pass: 3, total: 3, rate: 1.0 } } },
    "json-extract": { category: "extraction", models: { small: { pass: 3, total: 3, rate: 1.0 }, big: { pass: 3, total: 3, rate: 1.0 } } },
  },
};

describe("ollamaSafeClassModels", () => {
  it("a class is safe only when ALL its battery tasks clear the bar on a model", () => {
    const safe = ollamaSafeClassModels(MATRIX, 1.0);
    // classify needs BOTH classify-enum AND boolean-judgment at 100%: only 'big' clears both
    assert.equal(safe.get("classify"), "big");
    // extract needs extract-number AND json-extract at 100%: 'small' clears both -> first-qualifying
    assert.equal(safe.get("extract"), "small");
  });
  it("threshold gates membership", () => {
    const strict = ollamaSafeClassModels(MATRIX, 1.0);
    assert.ok(strict.has("classify"));
    // raise impossible -> nothing
    assert.equal(ollamaSafeClassModels(MATRIX, 1.01).size, 0);
  });
  it("adversarial: null / malformed matrix -> empty map (no throw)", () => {
    assert.doesNotThrow(() => {
      assert.equal(ollamaSafeClassModels(null).size, 0);
      assert.equal(ollamaSafeClassModels({}).size, 0);
      assert.equal(ollamaSafeClassModels({ matrix: {} }).size, 0);
    });
  });

  // REGRESSION ORACLE (U-ALPHA-OLLAMA-CHEAPEST-MODEL-SELECT 2026-06-25): when a class is proven 100%
  // by BOTH a small and a large model, the CHEAPEST must be chosen REGARDLESS of roster/matrix order.
  // The prior `best = best || model` picked first-in-order -> with the big model listed first it
  // routed mechanical work to the needlessly-large model (wasting the VRAM the offload exists to save).
  // This fixture lists 32b FIRST so it FAILS on the old code (returns 32b) and PASSES on the fix (1.5b).
  it("picks the CHEAPEST proven model even when the large one is listed first (the fix)", () => {
    const bigFirst = {
      models: ["qwen2.5-coder:32b", "qwen2.5-coder:1.5b"],
      matrix: {
        "extract-number": { category: "extraction", models: {
          "qwen2.5-coder:32b": { pass: 3, total: 3, rate: 1.0 },
          "qwen2.5-coder:1.5b": { pass: 3, total: 3, rate: 1.0 },
        } },
        "json-extract": { category: "extraction", models: {
          "qwen2.5-coder:32b": { pass: 3, total: 3, rate: 1.0 },
          "qwen2.5-coder:1.5b": { pass: 3, total: 3, rate: 1.0 },
        } },
      },
    };
    assert.equal(ollamaSafeClassModels(bigFirst, 1.0).get("extract"), "qwen2.5-coder:1.5b");
  });

  it("a smaller model that FAILS the class is not chosen over a larger PROVEN one (proof gates cost)", () => {
    // 1.5b is cheaper but only 67% on json-extract -> does NOT clear the class; 32b proven both -> wins.
    const m = {
      models: ["qwen2.5-coder:1.5b", "qwen2.5-coder:32b"],
      matrix: {
        "extract-number": { category: "extraction", models: {
          "qwen2.5-coder:1.5b": { pass: 3, total: 3, rate: 1.0 },
          "qwen2.5-coder:32b": { pass: 3, total: 3, rate: 1.0 },
        } },
        "json-extract": { category: "extraction", models: {
          "qwen2.5-coder:1.5b": { pass: 2, total: 3, rate: 0.67 },
          "qwen2.5-coder:32b": { pass: 3, total: 3, rate: 1.0 },
        } },
      },
    };
    assert.equal(ollamaSafeClassModels(m, 1.0).get("extract"), "qwen2.5-coder:32b");
  });

  it("MoE-vs-dense: param tag picks the smaller (gpt-oss:20b over deepseek-r1:32b)", () => {
    const m = {
      models: ["deepseek-r1:32b", "gpt-oss:20b"],
      matrix: {
        "classify-enum": { category: "classification", models: {
          "deepseek-r1:32b": { pass: 3, total: 3, rate: 1.0 },
          "gpt-oss:20b": { pass: 3, total: 3, rate: 1.0 },
        } },
        "boolean-judgment": { category: "classification", models: {
          "deepseek-r1:32b": { pass: 3, total: 3, rate: 1.0 },
          "gpt-oss:20b": { pass: 3, total: 3, rate: 1.0 },
        } },
      },
    };
    assert.equal(ollamaSafeClassModels(m, 1.0).get("classify"), "gpt-oss:20b");
  });

  it("unparseable-size models (no :Nb suffix) keep first-seen order -> no regression vs old behavior", () => {
    // the original fixture uses non-realistic 'small'/'big' (both rank Infinity) -> stable first-seen.
    assert.equal(ollamaSafeClassModels(MATRIX, 1.0).get("extract"), "small");
  });
});

describe("modelCostRank", () => {
  it("parses the param-size suffix as the cost (billions)", () => {
    assert.equal(modelCostRank("qwen2.5-coder:1.5b"), 1.5);
    assert.equal(modelCostRank("qwen2.5-coder:7b"), 7);
    assert.equal(modelCostRank("qwen2.5-coder:32b"), 32);
    assert.equal(modelCostRank("qwen3-coder:30b"), 30);
    assert.equal(modelCostRank("gpt-oss:120b"), 120);
    assert.equal(modelCostRank("deepseek-r1:14b"), 14);
  });
  it("reads ONLY the post-colon tag, so a decimal in the NAME is not mistaken for a size", () => {
    // qwen2.5-coder: the '2.5' in the name must NOT be parsed as 2.5b
    assert.equal(modelCostRank("qwen2.5-coder:32b"), 32);
  });
  it("ADVERSARIAL slice-guard: a name-decimal immediately FOLLOWED by b is still ignored (32, not 2.5)", () => {
    // a non-slicing whole-string regex would match the name's '2.5b' first -> 2.5 (WRONG); the
    // post-colon slice forces 32. This fixture FAILS if the lastIndexOf(":") slice is removed.
    assert.equal(modelCostRank("qwen2.5b-coder:32b"), 32);
  });
  it("MoE NxMb multiplier: mixtral:8x7b ranks 56 (8 experts x 7b), never the per-expert 7", () => {
    assert.equal(modelCostRank("mixtral:8x7b"), 56);
    // and a large MoE must rank ABOVE a dense 32b (56 > 32) so it is not mis-picked as cheapest
    assert.ok(modelCostRank("mixtral:8x7b") > modelCostRank("qwen2.5-coder:32b"));
  });
  it("tolerates a quant/variant suffix after the size (7b-instruct-q4 -> 7)", () => {
    assert.equal(modelCostRank("somemodel:7b-instruct-q4_K_M"), 7);
  });
  it("unparseable / non-string -> Infinity (deprioritized, never preferred over a known small model)", () => {
    assert.equal(modelCostRank("nomic-embed-text:latest"), Infinity);
    assert.equal(modelCostRank("llama3"), Infinity);
    assert.equal(modelCostRank(""), Infinity);
    assert.equal(modelCostRank(null), Infinity);
    assert.equal(modelCostRank(undefined), Infinity);
  });
  it("a cheaper model ranks strictly below a larger one (ordering invariant)", () => {
    assert.ok(modelCostRank("qwen2.5-coder:1.5b") < modelCostRank("qwen2.5-coder:7b"));
    assert.ok(modelCostRank("qwen2.5-coder:7b") < modelCostRank("qwen2.5-coder:14b"));
    assert.ok(modelCostRank("qwen3-coder:30b") < modelCostRank("qwen2.5-coder:32b"));
    assert.ok(modelCostRank("gpt-oss:20b") < modelCostRank("gpt-oss:120b"));
  });
});

describe("routePrompt", () => {
  it("OLLAMA: a matrix-proven mechanical class offloads to the proven model ($0)", () => {
    // 'extract' is matrix-proven -> a clearly-extract prompt routes to ollama
    const r = routePrompt({ prompt: "extract the bore diameter values from this text", matrix: MATRIX });
    assert.equal(r.engine, "ollama");
    assert.equal(r.taskClass, "extract");
    assert.match(r.reason, /matrix-proven/);
  });
  it("FABLE: deep planning stays on Claude top-think tier even with a matrix", () => {
    const r = routePrompt({ prompt: "brainstorm a plan to cover all angles for the routing system", matrix: MATRIX });
    assert.equal(r.engine, "claude");
    assert.equal(r.model, "fable");
  });
  it("SONNET: coding/build stays on Claude at the coding tier -- Sonnet (operator 2026-06-18, was opus)", () => {
    const r = routePrompt({ prompt: "implement the engine and wire the dispatcher", matrix: MATRIX });
    assert.equal(r.engine, "claude");      // stays on Claude (never offloaded for build)
    assert.equal(r.model, "sonnet");       // coding default tier (Opus is escalation-only for deep/novel)
  });
  it("NO MATRIX: a mechanical class falls back to the cheap Claude tier (not ollama)", () => {
    const r = routePrompt({ prompt: "extract the values from this text", matrix: null });
    assert.equal(r.engine, "claude"); // can't offload without proof
  });
  it("SAFETY: never offloads, always frontier Claude", () => {
    const r = routePrompt({ prompt: "validate the collision-force safety margin", matrix: MATRIX });
    assert.equal(r.engine, "claude");
    assert.equal(r.taskClass, "safety_critical");
  });
  it("SAFETY + cloud-trigger language: safety PRECEDES the cloud route -> frontier Claude, NEVER openrouter", () => {
    // R9 invariant (load-bearing now that the $0 cloud lane is live): a prompt that is BOTH
    // safety-critical AND carries deep-research/long-context phrasing must route to frontier
    // Claude, never the cloud model. routePrompt checks safety_critical BEFORE routeCloudLongContext
    // (model-routing-policy.mjs: safety returns ~L142, cloud route ~L148) -- this pins that ordering
    // so a future reorder (cloud above safety) goes RED instead of silently offloading safety to a
    // cloud LLM. The existing SAFETY test has no cloud words + the cloud tests have no safety words,
    // so neither catches a reorder; only a prompt with BOTH does.
    const p = "validate the collision-force safety margin using deep research across the entire long-context transcript history";
    // precondition: the fixture INDEPENDENTLY triggers the cloud route, so the safety guard is
    // load-bearing here (not incidentally null) -- if this ever stops being cloud-eligible the
    // test silently weakens, so assert it explicitly.
    assert.notEqual(routeCloudLongContext(p), null, "fixture must independently trigger the cloud route, else the safety-precedence assertion proves nothing");
    const r = routePrompt({ prompt: p, matrix: MATRIX });
    assert.equal(r.engine, "claude");              // NEVER the cloud engine
    assert.notEqual(r.engine, "openrouter");
    assert.equal(r.taskClass, "safety_critical");  // safety classification wins the precedence race
  });
  it("adversarial: empty/non-string prompt -> a valid claude verdict, no throw", () => {
    assert.doesNotThrow(() => {
      const r = routePrompt({ prompt: "", matrix: MATRIX });
      assert.equal(r.engine, "claude");
    });
  });
});

describe("routeCloudLongContext (CLOUD-OVERFLOW-MS0)", () => {
  it("explicit 'use nemotron' -> cloud verdict, explicit=true", () => {
    const r = routeCloudLongContext("use nemotron to summarize this");
    assert.equal(r.engine, "openrouter");
    assert.equal(r.tier, "cloud-long-context");
    assert.equal(r.explicit, true);
    assert.equal(r.model, "nvidia/nemotron-3-super-120b-a12b:free");
  });
  it("implicit long-context deep-research -> cloud verdict, explicit=false", () => {
    const r = routeCloudLongContext("do deep research across the entire transcript history");
    assert.ok(r);
    assert.equal(r.explicit, false);
  });
  it("build keyword vetoes the implicit cloud route (Opus owns building)", () => {
    // build + an unambiguous longctx signal -> vetoed to null
    assert.equal(routeCloudLongContext("build a deep research feature"), null);
    assert.equal(routeCloudLongContext("rewrite the module using long-context analysis"), null);
  });
  it("deep-think/design verbs veto the implicit cloud route (Fable owns deep reasoning)", () => {
    assert.equal(routeCloudLongContext("design the architecture, do deep research first"), null);
    assert.equal(routeCloudLongContext("brainstorm with deep research across the codebase"), null);
  });
  it("ROUTINE read/summarize work does NOT trigger the cloud (no quality regression -- arm-C FAIL fix)", () => {
    // these previously regressed sonnet/fable -> cloud; must now stay null
    for (const p of [
      "review the whole module", "summarize the whole document", "read the entire log",
      "scan all logs", "digest the entire transcript", "analyze every file in the codebase",
      "review the entire function", "summarize this file",
    ]) {
      assert.equal(routeCloudLongContext(p), null, `routine prompt must not route to cloud: "${p}"`);
    }
  });
  it("a plain task with no long-context/cloud signal -> null", () => {
    assert.equal(routeCloudLongContext("fix the typo in the readme"), null);
    assert.equal(routeCloudLongContext(""), null);
    assert.equal(routeCloudLongContext(null), null);
  });
  it("incidental TOPIC mention of cloud/openrouter does NOT route to cloud (3-of-3 arm-A P1)", () => {
    // a directive verb is required; merely NAMING the cloud tier / openrouter must stay null
    assert.equal(routeCloudLongContext("fix the bug in the cloud tier handler"), null);
    assert.equal(routeCloudLongContext("deploy to the cloud tier"), null);
    assert.equal(routeCloudLongContext("update the openrouter model pricing table"), null);
    assert.equal(routeCloudLongContext("review the cloud model integration"), null);
  });
  it("a DIRECTIVE verb + name still routes explicit (use/route to/run on)", () => {
    assert.equal(routeCloudLongContext("use nemotron for this").explicit, true);
    assert.equal(routeCloudLongContext("route to openrouter").explicit, true);
    assert.equal(routeCloudLongContext("run on the nemotron model").explicit, true);
    assert.equal(routeCloudLongContext("switch to the cloud model").explicit, true);
  });
  it("shallow 'research all the X' no longer triggers cloud (3-of-3 P2)", () => {
    assert.equal(routeCloudLongContext("research all the customer records"), null);
    // but genuine scope phrases stay
    assert.ok(routeCloudLongContext("research across the codebase"));
    assert.ok(routeCloudLongContext("research the entire transcript history"));
  });
});

describe("routePrompt cloud tier ordering", () => {
  it("EXPLICIT cloud request beats the Ollama offload (operator named it)", () => {
    // 'extract ... values' is a matrix-proven ollama class, but the explicit nemotron ask wins
    const r = routePrompt({ prompt: "use nemotron to extract the values from this huge dump", matrix: MATRIX });
    assert.equal(r.engine, "openrouter");
    assert.equal(r.tier, "cloud-long-context");
  });
  it("IMPLICIT long-context is honored only AFTER ollama: a proven-mechanical class still offloads local", () => {
    // 'deep research' is an implicit longctx signal AND 'extract' is matrix-proven -> free-LOCAL
    // ollama must win over free-cloud (the implicit cloud verdict is held until after the ollama miss)
    const r = routePrompt({ prompt: "extract the bore diameter values via deep research", matrix: MATRIX });
    assert.equal(r.engine, "ollama");
  });
  it("IMPLICIT long-context research (non-mechanical) -> cloud", () => {
    const r = routePrompt({ prompt: "deep research across the whole codebase for race conditions", matrix: MATRIX });
    assert.equal(r.engine, "openrouter");
  });
  it("SAFETY beats even an explicit cloud request (never send safety to cloud)", () => {
    const r = routePrompt({ prompt: "use nemotron to validate the collision-force safety margin", matrix: MATRIX });
    assert.equal(r.engine, "claude");
    assert.equal(r.taskClass, "safety_critical");
  });
  it("a build task with no cloud signal stays on Claude (not cloud) at the Sonnet coding tier", () => {
    const r = routePrompt({ prompt: "implement the engine and wire the dispatcher", matrix: MATRIX });
    assert.equal(r.engine, "claude");          // build never routes to the cloud lane
    assert.notEqual(r.engine, "openrouter");
    assert.equal(r.model, "sonnet");           // coding default (operator 2026-06-18); was opus
  });
});

describe("BATTERY_TO_CLASS", () => {
  it("maps every battery task to a real class", () => {
    for (const cls of Object.values(BATTERY_TO_CLASS)) {
      assert.ok(["classify", "extract", "format"].includes(cls));
    }
  });
});
