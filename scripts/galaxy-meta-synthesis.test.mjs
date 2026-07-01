// Tests for galaxy-meta-synthesis.mjs (L2/L3 hierarchical compounding).
// Hermetic: pure helpers, injected fs. Vectors use the int8 pack format so the
// real cosine path runs.

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  loadSynthesisVectors,
  affinityEdges,
  clusterByAffinity,
  loadSynthesisTexts,
  buildClusterPrompt,
  parseClusterNaming,
  detectDoctrineCandidates,
  buildMetaDoc,
  buildDoctrineDoc,
  writeFileAtomic,
  parseArgs,
  degenerateClusterLimit,
  detectExplicitModelOverride,
  detectExplicitThreshold,
  autoTuneThreshold,
  resolveNamingModel,
  NAMING_FALLBACK_MODELS,
  resolveModel,
} from "./galaxy-meta-synthesis.mjs";
import { packInt8 } from "./lib/memory-index-search-lib.mjs";

// Build an embeddings-sidecar record for a galaxy from a float vector.
// NOTE: packInt8 returns { b64, norm, dim }; the sidecar stores the base64 under
// the record's `vec` field (that is what loadSynthesisVectors unpacks).
function rec(galaxy, floatVec) {
  const { b64, norm } = packInt8(floatVec);
  return { key: `patterns/${galaxy}_synthesis`, name: `${galaxy}_synthesis`, namespace: "patterns", vec: b64, norm };
}

describe("loadSynthesisVectors", () => {
  it("extracts only patterns/<g>_synthesis records, skips the _meta doc + non-patterns", () => {
    const sidecar = { records: [
      rec("mill", [1, 0, 0]),
      rec("cad", [0, 1, 0]),
      { key: "patterns/_meta_synthesis", name: "_meta_synthesis", vec: packInt8([1, 1, 1]).b64, norm: packInt8([1, 1, 1]).norm },
      { key: "reference/foo", name: "foo", vec: packInt8([1, 0, 0]).b64, norm: 1 },
    ] };
    const v = loadSynthesisVectors(sidecar);
    assert.deepEqual(v.map((x) => x.galaxy).sort(), ["cad", "mill"]);
  });
  it("tolerates a malformed/empty sidecar", () => {
    assert.deepEqual(loadSynthesisVectors({}), []);
    assert.deepEqual(loadSynthesisVectors({ records: "x" }), []);
    assert.deepEqual(loadSynthesisVectors(null), []);
  });
});

describe("affinityEdges + clusterByAffinity (deterministic structure)", () => {
  // Three near-orthogonal directions → two tight pairs + one singleton.
  const vectors = loadSynthesisVectors({ records: [
    rec("a", [1, 0, 0]),
    rec("a2", [0.99, 0.1, 0]),   // ~parallel to a
    rec("b", [0, 1, 0]),
    rec("b2", [0.05, 0.99, 0]),  // ~parallel to b
    rec("lonely", [0, 0, 1]),    // orthogonal to all
  ] });

  it("emits an edge only above threshold", () => {
    const e = affinityEdges(vectors, 0.9);
    const pairs = e.map((x) => [x.a, x.b].sort().join("-")).sort();
    assert.ok(pairs.includes("a-a2"), "near-parallel a,a2 should edge");
    assert.ok(pairs.includes("b-b2"), "near-parallel b,b2 should edge");
    assert.ok(!pairs.some((p) => p.includes("lonely")), "orthogonal vector edges nothing");
  });

  it("connected-components → 2 clusters + 1 singleton", () => {
    const edges = affinityEdges(vectors, 0.9);
    const { clusters, singletons } = clusterByAffinity(vectors, edges);
    assert.equal(clusters.length, 2);
    assert.deepEqual(clusters.map((c) => c.length).sort(), [2, 2]);
    assert.deepEqual(singletons, ["lonely"]);
  });

  it("transitive closure merges a chain a-b-c into ONE cluster", () => {
    const chain = loadSynthesisVectors({ records: [
      rec("x", [1, 0, 0]), rec("y", [0.96, 0.28, 0]), rec("z", [0.85, 0.52, 0]),
    ] });
    // x~y and y~z but x≁z — connected components still merges all three.
    const edges = affinityEdges(chain, 0.9);
    const { clusters } = clusterByAffinity(chain, edges);
    assert.equal(clusters.length, 1);
    assert.deepEqual(clusters[0], ["x", "y", "z"]);
  });

  it("largest cluster first (deterministic order)", () => {
    const vs = loadSynthesisVectors({ records: [
      rec("p", [1, 0, 0]), rec("p2", [0.99, 0.05, 0]), rec("p3", [0.98, 0.1, 0]),
      rec("q", [0, 1, 0]), rec("q2", [0.02, 0.99, 0]),
    ] });
    const { clusters } = clusterByAffinity(vs, affinityEdges(vs, 0.9));
    assert.equal(clusters[0].length, 3, "the 3-member cluster sorts before the 2-member");
  });
});

describe("loadSynthesisTexts", () => {
  it("strips frontmatter, headings, blockquotes; caps length", () => {
    const body = `---\nname: mill_synthesis\n---\n\n# mill — synthesis\n\n> advisory banner\n\nReal domain content about feeds and speeds.`;
    const t = loadSynthesisTexts(["mill"], "/p", { readFileImpl: () => body });
    assert.match(t.mill, /Real domain content about feeds and speeds/);
    assert.doesNotMatch(t.mill, /advisory banner/);
    assert.doesNotMatch(t.mill, /name: mill_synthesis/);
  });
  it("missing file → empty string (no throw)", () => {
    const t = loadSynthesisTexts(["nope"], "/p", { readFileImpl: () => { throw new Error("ENOENT"); } });
    assert.equal(t.nope, "");
  });
});

describe("buildClusterPrompt + parseClusterNaming", () => {
  it("prompt names every member and asks for the 3 labeled lines", () => {
    const p = buildClusterPrompt(["cad", "cam"], { cad: "cad stuff", cam: "cam stuff" });
    assert.match(p, /cad, cam/);
    assert.match(p, /META-PATTERN:/);
    assert.match(p, /CROSS-DOMAIN RULE:/);
    assert.match(p, /CONTRADICTION:/);
  });
  it("parses the 3 fields; NONE → empty", () => {
    const parsed = parseClusterNaming("META-PATTERN: shared toolpath model\nCROSS-DOMAIN RULE: always validate before post\nCONTRADICTION: NONE");
    assert.equal(parsed.metaPattern, "shared toolpath model");
    assert.equal(parsed.rule, "always validate before post");
    assert.equal(parsed.contradiction, "", "NONE maps to empty");
  });
  it("missing labels → empty fields (no throw)", () => {
    const parsed = parseClusterNaming("garbage with no labels");
    assert.deepEqual(parsed, { metaPattern: "", rule: "", contradiction: "" });
  });
});

describe("detectDoctrineCandidates (L3)", () => {
  it("only clusters with a RULE spanning ≥3 domains qualify", () => {
    const named = [
      { members: ["a", "b", "c", "d"], metaPattern: "mp", rule: "R1", contradiction: "" }, // 4 domains + rule → candidate
      { members: ["e", "f"], metaPattern: "mp", rule: "R2", contradiction: "" },             // rule but only 2 → no
      { members: ["g", "h", "i"], metaPattern: "mp", rule: "", contradiction: "" },          // 3 domains but no rule → no
    ];
    const c = detectDoctrineCandidates(named);
    assert.equal(c.length, 1);
    assert.deepEqual(c[0].members, ["a", "b", "c", "d"]);
  });
  it("sorts by domain count desc", () => {
    const named = [
      { members: ["a", "b", "c"], rule: "R", metaPattern: "" },
      { members: ["d", "e", "f", "g", "h"], rule: "R", metaPattern: "" },
    ];
    assert.equal(detectDoctrineCandidates(named)[0].members.length, 5);
  });
  it("degenerate mega-cluster is EXCLUDED via maxDomains (Reviewer-B P1 threshold-collapse guard)", () => {
    const named = [
      { members: ["a", "b", "c", "d", "e", "f", "g"], rule: "R", metaPattern: "" }, // 7 domains — degenerate
      { members: ["x", "y", "z"], rule: "R", metaPattern: "" },                       // 3 — legit
    ];
    // with a max of 4 (half of an 8-galaxy fleet), the 7-domain cluster is dropped
    const c = detectDoctrineCandidates(named, { maxDomains: 4 });
    assert.equal(c.length, 1);
    assert.deepEqual(c[0].members, ["x", "y", "z"], "the mega-cluster must NOT sort to the top as a doctrine candidate");
  });
});

describe("degenerateClusterLimit", () => {
  it("is half the fleet, floored, but never below the doctrine minimum (3)", () => {
    assert.equal(degenerateClusterLimit(34), 17);
    assert.equal(degenerateClusterLimit(8), 4);
    assert.equal(degenerateClusterLimit(2), 3, "small fleets floor at DOCTRINE_MIN_DOMAINS");
  });
});

describe("buildMetaDoc + buildDoctrineDoc", () => {
  it("meta doc carries advisory markers + a section per cluster", () => {
    const doc = buildMetaDoc(
      [{ members: ["cad", "cam"], metaPattern: "mp", rule: "r", contradiction: "" }],
      ["lonely"],
      { threshold: 0.93, builtAt: "2026-05-29T00:00:00Z", model: "m" },
    );
    assert.match(doc, /advisoryOnly: true/);
    assert.match(doc, /mustHumanVerify: true/);
    assert.match(doc, /description: "\[auto-synth · verify\]/);
    assert.match(doc, /## cad · cam/);
    assert.match(doc, /Singletons \(no cross-domain pattern/);
  });
  it("unnamed cluster (ollama-down) gets a 'naming pending' note", () => {
    const doc = buildMetaDoc([{ members: ["a", "b"], metaPattern: "", rule: "", contradiction: "" }], [], { threshold: 0.93 });
    assert.match(doc, /naming pending/);
  });
  it("doctrine doc: empty candidates → explicit 'no candidates' (not blank)", () => {
    assert.match(buildDoctrineDoc([], { threshold: 0.93 }), /No doctrine candidates/);
  });
  it("doctrine doc: lists candidate rule + verify prompt", () => {
    const doc = buildDoctrineDoc([{ members: ["a", "b", "c"], rule: "R1", metaPattern: "mp" }], { threshold: 0.93 });
    assert.match(doc, /Candidate rule:\*\* R1/);
    assert.match(doc, /MUST HUMAN-VERIFY/);
  });
});

describe("writeFileAtomic + parseArgs", () => {
  it("writes via .tmp + rename, creates dir", () => {
    const renames = []; const dirs = [];
    writeFileAtomic("/d/out.md", "content", {
      writeImpl: () => {}, renameImpl: (f, t) => renames.push([f, t]), mkdirImpl: (d) => dirs.push(d), existsImpl: () => false,
    });
    assert.ok(renames[0][0].includes(".tmp."));
    assert.equal(renames[0][1], "/d/out.md");
    assert.ok(dirs.includes("/d"));
  });
  it("refuses empty content (R12)", () => {
    assert.throws(() => writeFileAtomic("/d/o.md", ""), /refusing to write empty/);
  });
  it("parseArgs: threshold clamped to [0.5, 0.999]", () => {
    assert.equal(parseArgs(["--threshold", "2"]).threshold, 0.999);
    assert.equal(parseArgs(["--threshold", "0.1"]).threshold, 0.5);
    assert.equal(parseArgs(["--dry-run", "--threshold", "0.94"]).dryRun, true);
    assert.equal(parseArgs(["--threshold", "0.94"]).threshold, 0.94);
  });
});

describe("detectExplicitModelOverride (host-aware model resolver wiring)", () => {
  it("returns the value when --model is present in RAW argv", () => {
    assert.equal(detectExplicitModelOverride(["--threshold", "0.93", "--model", "llama3.1:70b"]), "llama3.1:70b");
  });
  it("returns the DEFAULT model when --model explicitly passes the default (raw-argv distinguishes intent)", () => {
    // The whole reason we read raw argv: an explicit --model == DEFAULT_MODEL must
    // still be detected as an override, NOT mistaken for "no flag".
    assert.equal(detectExplicitModelOverride(["--model", "qwen2.5-coder:32b"]), "qwen2.5-coder:32b");
  });
  it("returns null when --model is absent", () => {
    assert.equal(detectExplicitModelOverride(["--dry-run", "--threshold", "0.94"]), null);
  });
  it("returns null when --model is the last token with no value", () => {
    assert.equal(detectExplicitModelOverride(["--dry-run", "--model"]), null);
  });
  it("ignores an empty/whitespace value", () => {
    assert.equal(detectExplicitModelOverride(["--model", "   "]), null);
  });
});

describe("resolveModel (explicit override · fallback · threading)", () => {
  it("(a) explicit --model overrides — passes the override straight to the resolver", async () => {
    let seen = null;
    const resolverFn = async (opts) => { seen = opts; return { model: opts.override, source: "override" }; };
    const { model, source } = await resolveModel({ argv: ["--model", "qwen2.5-coder:32b"], fallback: "qwen2.5-coder:32b", resolverFn });
    assert.equal(seen.override, "qwen2.5-coder:32b", "the raw --model value is forwarded as override");
    assert.equal(seen.fallback, "qwen2.5-coder:32b", "the script's DEFAULT_MODEL is forwarded as fallback");
    assert.equal(model, "qwen2.5-coder:32b");
    assert.equal(source, "override");
  });

  it("(b) fallback preserved when no --model and resolver yields the fallback (ollama down)", async () => {
    // Simulate ollama-down: resolver returns the conservative fallback, no override.
    const resolverFn = async ({ fallback, override }) => {
      assert.equal(override, null, "no --model in argv → override must be null");
      return { model: fallback, source: "fallback", reason: "no installed models (ollama down?)" };
    };
    const { model, source } = await resolveModel({ argv: ["--dry-run"], fallback: "qwen2.5-coder:32b", resolverFn });
    assert.equal(model, "qwen2.5-coder:32b", "DEFAULT_MODEL is the fallback when the resolver yields nothing better");
    assert.equal(source, "fallback");
  });

  it("(b2) fail-soft: resolver THROWS → degrades to the fallback, never crashes the run", async () => {
    const resolverFn = async () => { throw new Error("router exploded"); };
    const { model, source } = await resolveModel({ argv: [], fallback: "qwen2.5-coder:32b", resolverFn });
    assert.equal(model, "qwen2.5-coder:32b");
    assert.equal(source, "fallback");
  });

  it("(b3) resolver returns a malformed/empty model → falls back (no empty model threaded downstream)", async () => {
    const resolverFn = async ({ fallback }) => { void fallback; return { model: "", source: "router" }; };
    const { model } = await resolveModel({ argv: [], fallback: "qwen2.5-coder:32b", resolverFn });
    assert.equal(model, "qwen2.5-coder:32b", "an empty resolver model must not be threaded; fallback used");
  });

  it("(c) host-aware route (Blackwell 32B) is returned for downstream threading when no explicit flag", async () => {
    // On this host the real resolver yields 32b; assert the resolved model is the
    // ONE value main() threads into preflight + synthesizeViaOllama + the meta doc.
    const resolverFn = async ({ override }) => {
      assert.equal(override, null);
      return { model: "qwen2.5-coder:32b", source: "blackwell-best", tier: "best" };
    };
    const { model, source } = await resolveModel({ argv: ["--threshold", "0.93"], fallback: "qwen2.5-coder:32b", resolverFn });
    assert.equal(model, "qwen2.5-coder:32b", "the host-routed model is what gets threaded into every synthesis call");
    assert.equal(source, "blackwell-best");
  });

  it("structural wiring: main() threads the SAME resolved model into preflight + generation (source-level assert)", async () => {
    // The resolver returns ONE { model } that main() binds to `resolvedModel`; the
    // source must use that single binding for BOTH ollamaPreflight and
    // synthesizeViaOllama (so preflight & generation can never diverge). Assert the
    // wiring is structurally present (no lingering args.model in the LLM path).
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("./galaxy-meta-synthesis.mjs", import.meta.url), "utf8");
    assert.match(src, /resolveModel\(\{\s*argv: process\.argv\.slice\(2\), fallback: DEFAULT_MODEL\s*\}\)/, "resolved once in main()");
    assert.match(src, /resolveNamingModel\(\{[\s\S]*?preferred: resolvedModel/, "naming preflight starts from resolvedModel (falls back to a faster model only if it is cold/unavailable)");
    assert.match(src, /synthesizeViaOllama\(\{ prompt: buildClusterPrompt\(members, texts\), model: namingModel \}\)/, "generation uses namingModel (= resolvedModel, or a faster fallback when the best model is cold)");
    assert.doesNotMatch(src, /ollamaPreflight\(DEFAULT_OLLAMA_URL, args\.model\)/, "preflight must NOT use the un-resolved args.model");
    assert.doesNotMatch(src, /synthesizeViaOllama\(\{[^}]*model: args\.model/, "generation must NOT use the un-resolved args.model");
  });
});

describe("detectExplicitThreshold", () => {
  it("returns the parsed value when --threshold is passed", () => {
    assert.equal(detectExplicitThreshold(["--threshold", "0.96"]), 0.96);
  });
  it("clamps out-of-range values into [0.5, 0.999]", () => {
    assert.equal(detectExplicitThreshold(["--threshold", "2.5"]), 0.999);
    assert.equal(detectExplicitThreshold(["--threshold", "0.1"]), 0.5);
  });
  it("returns null when absent or non-numeric (-> main auto-tunes)", () => {
    assert.equal(detectExplicitThreshold(["--json"]), null);
    assert.equal(detectExplicitThreshold(["--threshold", "abc"]), null);
  });
});

describe("autoTuneThreshold", () => {
  // Injected clusterFn: collapses (one big cluster) below the boundary, splits above.
  const ladder = [0.90, 0.92, 0.93, 0.95, 0.97];
  // autoTuneThreshold calls clusterFn(vectors, edgesFn(vectors, t)) -- so pass the
  // threshold THROUGH as the "edges" arg here, letting the stub clusterFn react to it.
  const edgesFn = (_v, t) => t;
  it("picks the DENSEST non-collapse threshold (boundary of collapse)", () => {
    // t < 0.93 -> a cluster of 10 (> limit 7 = collapse); t >= 0.93 -> a cluster of 5 (ok)
    const clusterFn = (_v, t) => ({ clusters: t < 0.93 ? [Array(10).fill("x")] : [Array(5).fill("x")], singletons: [] });
    const r = autoTuneThreshold(Array(10).fill({ galaxy: "g" }), { ladder, limit: 7, edgesFn, clusterFn });
    assert.equal(r.threshold, 0.93, "first ascending non-collapse = densest cross-domain structure");
    assert.equal(r.maxCluster, 5);
    assert.match(r.reason, /densest non-collapse/);
  });
  it("falls back to the HIGHEST ladder threshold when EVERY threshold collapses (adversarial)", () => {
    const clusterFn = () => ({ clusters: [Array(99).fill("x")], singletons: [] }); // always collapses
    const r = autoTuneThreshold(Array(99).fill({ galaxy: "g" }), { ladder, limit: 7, edgesFn, clusterFn });
    assert.equal(r.threshold, 0.97, "all-collapse -> highest (most fragmented, safest)");
    assert.match(r.reason, /all-collapse fallback/);
  });
  it("returns the LOWEST ladder threshold when nothing collapses (sparse data, densest valid)", () => {
    const clusterFn = () => ({ clusters: [Array(2).fill("x")], singletons: [] }); // never collapses
    const r = autoTuneThreshold(Array(4).fill({ galaxy: "g" }), { ladder, limit: 7, edgesFn, clusterFn });
    assert.equal(r.threshold, 0.90, "no collapse anywhere -> the densest (lowest) threshold");
  });
  it("real path (affinityEdges + clusterByAffinity): returns a valid ladder threshold whose max cluster respects the limit", () => {
    const sidecar = { records: [
      rec("a", [1, 0, 0, 0]), rec("b", [1, 0, 0, 0]), rec("c", [1, 0, 0, 0]),
      rec("d", [0, 1, 0, 0]), rec("e", [0, 0, 1, 0]), rec("f", [0, 0, 0, 1]),
    ] };
    const vectors = loadSynthesisVectors(sidecar);
    assert.ok(vectors.length >= 2, "fixture must load real vectors");
    const r = autoTuneThreshold(vectors);
    assert.ok(r.threshold >= 0.90 && r.threshold <= 0.98, "threshold within the ladder range");
    assert.ok(r.maxCluster <= r.limit, "the chosen threshold must not collapse");
  });
});

describe("resolveNamingModel", () => {
  const up = (set) => (m) => Promise.resolve(set.has(m)); // preflightFn stub: only models in `set` are reachable
  it("preferred model reachable -> uses it, no fallback (happy)", async () => {
    const r = await resolveNamingModel({ preferred: "gpt-oss:120b", preflightFn: up(new Set(["gpt-oss:120b"])) });
    assert.deepEqual(r, { model: "gpt-oss:120b", up: true, fellBack: false });
  });
  it("preferred COLD/unavailable + no override -> falls back to the first reachable faster model (loop COMPLETES)", async () => {
    const r = await resolveNamingModel({ preferred: "gpt-oss:120b", preflightFn: up(new Set(["qwen2.5-coder:32b"])) });
    assert.equal(r.model, "qwen2.5-coder:32b");
    assert.equal(r.up, true);
    assert.equal(r.fellBack, true);
  });
  it("preferred cold + OPERATOR PINNED --model -> never substitutes (respects intent)", async () => {
    const r = await resolveNamingModel({ preferred: "gpt-oss:120b", hasOverride: true, preflightFn: up(new Set(["qwen2.5-coder:32b"])) });
    assert.deepEqual(r, { model: "gpt-oss:120b", up: false, fellBack: false });
  });
  it("EVERYTHING unreachable -> reports preferred + up:false (graceful: structural clusters emit unnamed)", async () => {
    const r = await resolveNamingModel({ preferred: "gpt-oss:120b", preflightFn: up(new Set()) });
    assert.deepEqual(r, { model: "gpt-oss:120b", up: false, fellBack: false });
  });
  it("missing preflightFn -> throws (contract)", async () => {
    await assert.rejects(() => resolveNamingModel({ preferred: "x" }), /preflightFn is required/);
  });
  it("fallback ladder is non-empty + excludes the preferred when iterating", async () => {
    assert.ok(NAMING_FALLBACK_MODELS.length >= 1);
    // preferred == first ladder entry, cold; must skip it and try the next reachable one
    const r = await resolveNamingModel({ preferred: NAMING_FALLBACK_MODELS[0], candidates: NAMING_FALLBACK_MODELS, preflightFn: up(new Set([NAMING_FALLBACK_MODELS[1]])) });
    assert.equal(r.model, NAMING_FALLBACK_MODELS[1]);
    assert.equal(r.fellBack, true);
  });
});
