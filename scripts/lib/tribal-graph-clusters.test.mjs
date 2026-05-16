// Tests for tribal-graph-clusters.mjs
// Run: node --test scripts/lib/tribal-graph-clusters.test.mjs
// (vitest harness is broken per reference_ollama_cost_routing — using node:test)

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeToken,
  splitComposite,
  normalizeTip,
  jaccard,
  tipBag,
  classifyDomain,
  classifySchool,
  extractSignature,
  clusterByJaccard,
  aggregateLevel,
  dedupeTips,
  schoolChain,
  SCHOOL_TAXONOMY,
  DOMAIN_TAXONOMY,
  DISCIPLINE_TAXONOMY,
  GALAXY_TAXONOMY,
  UNIVERSE_ID,
} from "./tribal-graph-clusters.mjs";

// ============================================================================
// normalizeToken
// ============================================================================

test("normalizeToken: lowercases + collapses spaces", () => {
  assert.equal(normalizeToken("Hello WORLD"), "hello world");
  assert.equal(normalizeToken("  multi   space  "), "multi space");
});

test("normalizeToken: strips punctuation but keeps : _ . -", () => {
  assert.equal(normalizeToken("Material:304 Stainless!"), "material:304 stainless");
  assert.equal(normalizeToken("L:D"), "l:d");
  assert.equal(normalizeToken("0.001-inch"), "0.001-inch");
  assert.equal(normalizeToken("snake_case"), "snake_case");
});

test("normalizeToken: handles null/undefined/non-string", () => {
  assert.equal(normalizeToken(null), "");
  assert.equal(normalizeToken(undefined), "");
  assert.equal(normalizeToken(42), "42");
});

// ============================================================================
// splitComposite
// ============================================================================

test("splitComposite: splits pipe-separated categories", () => {
  assert.deepEqual(splitComposite("speeds_feeds | toolpath | workholding"), ["speeds_feeds", "toolpath", "workholding"]);
});

test("splitComposite: handles empty/null/single", () => {
  assert.deepEqual(splitComposite(""), []);
  assert.deepEqual(splitComposite(null), []);
  assert.deepEqual(splitComposite("solo"), ["solo"]);
});

test("splitComposite: lowercases and trims", () => {
  assert.deepEqual(splitComposite("  Speeds_Feeds  |  TOOLPATH  "), ["speeds_feeds", "toolpath"]);
});

// ============================================================================
// jaccard
// ============================================================================

test("jaccard: identical sets = 1", () => {
  assert.equal(jaccard(["a", "b", "c"], ["a", "b", "c"]), 1);
});

test("jaccard: disjoint sets = 0", () => {
  assert.equal(jaccard(["a", "b"], ["c", "d"]), 0);
});

test("jaccard: half overlap = 1/3", () => {
  // {a,b} ∩ {b,c} = {b}; ∪ = {a,b,c}; J = 1/3
  assert.equal(jaccard(["a", "b"], ["b", "c"]), 1 / 3);
});

test("jaccard: both empty = 0 (not NaN)", () => {
  assert.equal(jaccard([], []), 0);
  assert.equal(jaccard(new Set(), new Set()), 0);
});

test("jaccard: accepts Sets and Arrays interchangeably", () => {
  assert.equal(jaccard(new Set(["x", "y"]), ["x", "y"]), 1);
});

test("jaccard: superset case", () => {
  // {a} ∩ {a,b,c} = {a}; ∪ = {a,b,c}; J = 1/3
  assert.equal(jaccard(["a"], ["a", "b", "c"]), 1 / 3);
});

// ============================================================================
// normalizeTip
// ============================================================================

test("normalizeTip: rich engine-source shape -> canonical", () => {
  const raw = {
    id: "tk-001",
    title: "Stainless 304 work hardening prevention",
    body: "Never dwell in the cut with 304/316 stainless. Use climb milling.",
    tags: ["stainless", "work-hardening", "304", "material:M"],
    material_groups: ["M"],
    operation_types: ["pocket", "profile"],
    confidence: 95,
    source: "operator:senior_machinist",
    domain: "shop_floor",
    subcategory: "chip_load",
    knowledge_type: "anti_pattern",
    usage_count: 47,
    created_at: "2024-01-15",
  };
  const out = normalizeTip(raw);
  assert.equal(out.id, "tk-001");
  assert.equal(out.confidence, 0.95, "confidence 95 normalized to 0.95");
  assert.deepEqual(out.material_groups, ["M"]);
  assert.equal(out.knowledge_type, "anti_pattern");
  assert.equal(out.usage_count, 47);
  assert.ok(out.tags.includes("stainless"));
  assert.ok(out.tags.includes("material:m"), "tags lowercased");
});

test("normalizeTip: compact hyperMILL-extracted shape -> canonical", () => {
  const raw = {
    id: "hm-tip-hhw17i",
    content: "hyperMILL Contour Milling: Milling open and closed contours.",
    domain: "2D Milling",
    source: "hypermill/extracted",
    keywords: ["speed"],
    confidence: 0.85,
    sha256: "6af12f670d27adae",
  };
  const out = normalizeTip(raw);
  assert.equal(out.id, "hm-tip-hhw17i");
  assert.equal(out.confidence, 0.85);
  assert.equal(out.body, raw.content, "content -> body");
  assert.ok(out.tags.includes("speed"), "keywords -> tags");
  assert.equal(out.material_groups.length, 0);
});

test("normalizeTip: rejects non-ISO material groups", () => {
  const out = normalizeTip({ id: "x", material_groups: ["M", "P", "ZZZ", "x"] });
  assert.deepEqual(out.material_groups, ["M", "P"]);
});

test("normalizeTip: clamps invalid confidence", () => {
  assert.equal(normalizeTip({ id: "a", confidence: -5 }).confidence, 0);
  assert.equal(normalizeTip({ id: "b", confidence: 9000 }).confidence, 1);
  assert.equal(normalizeTip({ id: "c", confidence: "0.7" }).confidence, 0.7);
  assert.equal(normalizeTip({ id: "d", confidence: NaN }).confidence, 0.5, "NaN -> default 0.5");
  assert.equal(normalizeTip({ id: "e" }).confidence, 0.5, "missing -> default 0.5");
});

test("normalizeTip: synthesizes id when missing", () => {
  const out = normalizeTip({ content: "no id" });
  assert.ok(out.id.startsWith("unknown-") || out.id.length > 0);
});

test("normalizeTip: returns frozen object (immutability invariant)", () => {
  const out = normalizeTip({ id: "frozen-test" });
  assert.ok(Object.isFrozen(out));
});

// ============================================================================
// tipBag
// ============================================================================

test("tipBag: includes prefixed material / op / machine / category", () => {
  const tip = normalizeTip({
    id: "t1",
    tags: ["climb"],
    material_groups: ["M"],
    operation_types: ["slot"],
    machine_ids: ["haas-vf2"],
    category: "speeds_feeds",
    subcategory: "chip_load",
    knowledge_type: "anti_pattern",
  });
  const bag = tipBag(tip);
  assert.ok(bag.has("climb"));
  assert.ok(bag.has("mat:M"));
  assert.ok(bag.has("op:slot"));
  assert.ok(bag.has("mach:haas-vf2"));
  assert.ok(bag.has("cat:speeds_feeds"));
  assert.ok(bag.has("sub:chip_load"));
  assert.ok(bag.has("kt:anti_pattern"));
});

test("tipBag: empty tip returns empty Set", () => {
  const tip = normalizeTip({ id: "empty" });
  assert.equal(tipBag(tip).size, 0);
});

test("tipBag: splits composite category", () => {
  const tip = normalizeTip({ id: "comp", category: "speeds_feeds | toolpath" });
  const bag = tipBag(tip);
  assert.ok(bag.has("cat:speeds_feeds"));
  assert.ok(bag.has("cat:toolpath"));
});

// ============================================================================
// classifyDomain
// ============================================================================

test("classifyDomain: mill tip with operation hints", () => {
  const tip = normalizeTip({ id: "m1", operation_types: ["slotting", "pocketing"] });
  const out = classifyDomain(tip);
  assert.ok(out.includes("M_mill"));
});

test("classifyDomain: WEDM tip via tags", () => {
  const tip = normalizeTip({ id: "e1", tags: ["wire-edm", "h-register"] });
  const out = classifyDomain(tip);
  assert.ok(out.includes("E_edm"));
});

test("classifyDomain: empty -> X_unknown", () => {
  const tip = normalizeTip({ id: "z1" });
  assert.deepEqual(classifyDomain(tip), ["X_unknown"]);
});

test("classifyDomain: multi-domain (chip thinning applies to mill AND lathe)", () => {
  const tip = normalizeTip({
    id: "mt1",
    tags: ["chip-thinning", "milling", "turning"],
    operation_types: ["slotting", "turning"],
  });
  const out = classifyDomain(tip);
  assert.ok(out.includes("M_mill"));
  assert.ok(out.includes("T_turn"));
});

// ============================================================================
// classifySchool
// ============================================================================

test("classifySchool: detects Kienzle force school", () => {
  const tip = normalizeTip({
    id: "k1",
    title: "Kienzle cutting force",
    body: "Using kc1.1 = 2100 for ISO M with specific cutting force formula.",
  });
  const out = classifySchool(tip);
  assert.equal(out.code, "A3_force_power");
});

test("classifySchool: detects Tlusty chatter school", () => {
  const tip = normalizeTip({
    id: "c1",
    body: "Stability lobe diagram from Tlusty's regenerative chatter analysis.",
  });
  const out = classifySchool(tip);
  assert.equal(out.code, "A4_dynamics");
});

test("classifySchool: detects Taylor tool life school", () => {
  const tip = normalizeTip({
    id: "t1",
    body: "Per Taylor equation VT^n = C, increasing speed shortens tool life predictably.",
  });
  const out = classifySchool(tip);
  assert.equal(out.code, "A2_tool_life");
});

test("classifySchool: detects lean TPS school", () => {
  const tip = normalizeTip({
    id: "l1",
    body: "Taiichi Ohno's Toyota Production System emphasizes muda elimination through kaizen.",
  });
  const out = classifySchool(tip);
  assert.equal(out.code, "C1_lean_tps");
});

test("classifySchool: falls back to Z_uncategorized for no matches", () => {
  const tip = normalizeTip({
    id: "u1",
    body: "Generic text with no school keywords whatsoever.",
  });
  const out = classifySchool(tip);
  assert.equal(out.code, "Z_uncategorized");
});

test("classifySchool: physics beats tribal in tie (earlier-taxonomy wins)", () => {
  // Both "kienzle" (A3) and "operator says" (G1) match; A3 must win because earlier in taxonomy.
  const tip = normalizeTip({
    id: "tie1",
    body: "Operator says the Kienzle formula gives 1850 N/mm^2 for 304SS",
  });
  const out = classifySchool(tip);
  assert.equal(out.code, "A3_force_power");
});

// ============================================================================
// extractSignature
// ============================================================================

test("extractSignature: speeds/feeds tip -> speed+feed outputs, material+op inputs", () => {
  const tip = normalizeTip({
    id: "s1",
    body: "For 304 SS slotting use SFM 350 with IPT 0.0015 and 1/4\" carbide end mill",
    material_groups: ["M"],
    operation_types: ["slotting"],
  });
  const sig = extractSignature(tip);
  assert.ok(sig.required_inputs.includes("material"));
  assert.ok(sig.required_inputs.includes("operation"));
  assert.ok(sig.required_inputs.includes("tool_dia"));
  assert.ok(sig.output_variables.includes("cutting_speed"));
  assert.ok(sig.output_variables.includes("feed_rate"));
});

test("extractSignature: safety tip -> safety_advisory output", () => {
  const tip = normalizeTip({
    id: "sa1",
    body: "Never reach into running machine. ANTI-PATTERN.",
    knowledge_type: "anti_pattern",
  });
  const sig = extractSignature(tip);
  assert.ok(sig.output_variables.includes("safety_advisory"));
});

test("extractSignature: empty body -> free_text_advisory fallback", () => {
  const tip = normalizeTip({ id: "ftt" });
  const sig = extractSignature(tip);
  assert.deepEqual(sig.output_variables, ["free_text_advisory"]);
});

test("extractSignature: coolant + coating tips -> optional inputs", () => {
  const tip = normalizeTip({
    id: "co1",
    body: "With TiAlN coating and flood coolant, use L/D under 3.",
  });
  const sig = extractSignature(tip);
  assert.ok(sig.optional_inputs.includes("tool_coating"));
  assert.ok(sig.optional_inputs.includes("coolant_strategy"));
  assert.ok(sig.optional_inputs.includes("length_over_diameter"));
});

// ============================================================================
// clusterByJaccard (L0 -> L1)
// ============================================================================

test("clusterByJaccard: identical tags collapse to one cluster", () => {
  const tips = [
    normalizeTip({ id: "a", tags: ["x", "y", "z"] }),
    normalizeTip({ id: "b", tags: ["x", "y", "z"] }),
    normalizeTip({ id: "c", tags: ["x", "y", "z"] }),
  ];
  const out = clusterByJaccard(tips, { threshold: 0.5 });
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].members.sort(), ["a", "b", "c"]);
  assert.equal(out[0].level, 1);
  assert.equal(out[0].kind, "molecule");
});

test("clusterByJaccard: disjoint tags -> separate clusters", () => {
  const tips = [
    normalizeTip({ id: "a", tags: ["x", "y"] }),
    normalizeTip({ id: "b", tags: ["q", "r"] }),
  ];
  const out = clusterByJaccard(tips, { threshold: 0.3 });
  assert.equal(out.length, 2);
});

test("clusterByJaccard: empty-bag tips become singleton clusters", () => {
  const tips = [
    normalizeTip({ id: "empty1" }),
    normalizeTip({ id: "empty2" }),
  ];
  const out = clusterByJaccard(tips);
  assert.equal(out.length, 2, "empty bags MUST NOT collapse together");
});

test("clusterByJaccard: threshold gates merging", () => {
  // {a,b,c} ∩ {a,b,d} = {a,b}; ∪ = {a,b,c,d}; J = 0.5
  const tips = [
    normalizeTip({ id: "t1", tags: ["a", "b", "c"] }),
    normalizeTip({ id: "t2", tags: ["a", "b", "d"] }),
  ];
  // threshold=0.6 strictly excludes 0.5 -> separate
  let out = clusterByJaccard(tips, { threshold: 0.6 });
  assert.equal(out.length, 2, "0.5 < 0.6 -> separate clusters");

  // threshold=0.4 includes 0.5 -> merged
  out = clusterByJaccard(tips, { threshold: 0.4 });
  assert.equal(out.length, 1, "0.5 > 0.4 -> merged");
});

test("clusterByJaccard: rejects non-array input", () => {
  assert.throws(() => clusterByJaccard("not an array"), /must be an array/);
});

// ============================================================================
// aggregateLevel (L1 -> L2 -> ...)
// ============================================================================

test("aggregateLevel: identical L1 reps merge into one L2", () => {
  const l1 = [
    { id: "L1:0", level: 1, kind: "molecule", title: "x/y", members: ["a"], repBag: new Set(["x", "y"]) },
    { id: "L1:1", level: 1, kind: "molecule", title: "x/y", members: ["b"], repBag: new Set(["x", "y"]) },
  ];
  const out = aggregateLevel(l1, { threshold: 0.3, outLevel: 2, outKind: "cell" });
  assert.equal(out.length, 1);
  assert.equal(out[0].level, 2);
  assert.equal(out[0].kind, "cell");
  assert.deepEqual(out[0].members.sort(), ["L1:0", "L1:1"]);
});

test("aggregateLevel: emits monotonically increasing level", () => {
  const l1 = [{ id: "X", level: 1, kind: "molecule", title: "t", members: [], repBag: new Set(["a"]) }];
  const out = aggregateLevel(l1);
  assert.equal(out[0].level, 2, "default outLevel = nodes[0].level + 1");
});

// ============================================================================
// dedupeTips
// ============================================================================

test("dedupeTips: dedupes by id", () => {
  const tips = [
    normalizeTip({ id: "x", body: "different" }),
    normalizeTip({ id: "x", body: "stuff" }),
  ];
  const out = dedupeTips(tips);
  assert.equal(out.length, 1);
});

test("dedupeTips: dedupes by body hash (different IDs, same body)", () => {
  const tips = [
    normalizeTip({ id: "a", body: "exact same body" }),
    normalizeTip({ id: "b", body: "exact same body" }),
  ];
  const out = dedupeTips(tips);
  assert.equal(out.length, 1, "same body collapses despite different IDs");
});

// ============================================================================
// schoolChain
// ============================================================================

test("schoolChain: Kienzle force -> subtractive_physics -> mfg_science -> universe", () => {
  const chain = schoolChain("A3_force_power");
  assert.deepEqual(chain, ["L5:A3_force_power", "L6:S1_subtractive_physics", "L7:G1_mfg_science", UNIVERSE_ID]);
});

test("schoolChain: lean TPS -> mfg_systems -> business_ops -> universe", () => {
  const chain = schoolChain("C1_lean_tps");
  assert.deepEqual(chain, ["L5:C1_lean_tps", "L6:S3_mfg_systems", "L7:G2_business_ops", UNIVERSE_ID]);
});

test("schoolChain: unknown school routes to unknown discipline + galaxy", () => {
  const chain = schoolChain("totally_made_up");
  assert.deepEqual(chain, ["L5:Z_uncategorized", "L6:S0_unknown", "L7:G3_unknown", UNIVERSE_ID]);
});

// ============================================================================
// Taxonomy structure invariants
// ============================================================================

test("taxonomy invariant: every school references an existing discipline", () => {
  for (const [code, spec] of Object.entries(SCHOOL_TAXONOMY)) {
    assert.ok(DISCIPLINE_TAXONOMY[spec.discipline], `school ${code} references non-existent discipline ${spec.discipline}`);
  }
});

test("taxonomy invariant: every discipline references an existing galaxy", () => {
  for (const [code, spec] of Object.entries(DISCIPLINE_TAXONOMY)) {
    assert.ok(GALAXY_TAXONOMY[spec.galaxy], `discipline ${code} references non-existent galaxy ${spec.galaxy}`);
  }
});

test("taxonomy invariant: every domain has all required hint arrays", () => {
  for (const [code, spec] of Object.entries(DOMAIN_TAXONOMY)) {
    assert.ok(Array.isArray(spec.tagHints), `domain ${code} missing tagHints`);
    assert.ok(Array.isArray(spec.opHints), `domain ${code} missing opHints`);
    assert.ok(Array.isArray(spec.domainHint), `domain ${code} missing domainHint`);
  }
});

// ============================================================================
// Arm B P0/P1 lock-in tests (2026-05-16 per-file scrutiny)
// ============================================================================

test("normalizeTip: empty-string id triggers synthesis (Arm B P0 — `??` would silently let `''` through)", () => {
  const out = normalizeTip({ id: "", body: "non-empty body for hash" });
  assert.ok(out.id.startsWith("unknown-"), `empty id MUST synthesize, got ${JSON.stringify(out.id)}`);
});

test("normalizeTip: missing-id synthesis is content-deterministic across calls (Arm B P1 — Math.random broke graph rebuild parity)", () => {
  const a = normalizeTip({ content: "X" }, "src.json");
  const b = normalizeTip({ content: "X" }, "src.json");
  assert.equal(a.id, b.id, "same content+source MUST yield same synth id");
  const c = normalizeTip({ content: "Y" }, "src.json");
  assert.notEqual(a.id, c.id, "different content MUST yield different id");
  const d = normalizeTip({ content: "X" }, "different-src.json");
  assert.notEqual(a.id, d.id, "different source MUST yield different id (avoid collisions across input files)");
});

test("normalizeTip: whitespace-only id triggers synthesis", () => {
  const out = normalizeTip({ id: "   ", body: "x" });
  assert.ok(out.id.startsWith("unknown-"), "whitespace-only id must synthesize, not pass through");
});

test("normalizeTip: id=0 is valid (NOT a synth trigger) — `??` semantics required", () => {
  // 0 is a legitimate id (numeric primary key from a database).
  // The fix must preserve falsy-but-non-empty-string ids — only "" must trigger synth.
  assert.equal(normalizeTip({ id: 0 }).id, "0");
  assert.equal(normalizeTip({ id: false }).id, "false");
});

test("taxonomy invariant: nested taxonomy fields are deep-frozen (Arm B P0 — Object.freeze is shallow)", () => {
  assert.throws(() => { SCHOOL_TAXONOMY.A3_force_power.keywords.push("evil"); }, /read[- ]?only|extensible|frozen|Cannot/i);
  assert.throws(() => { DOMAIN_TAXONOMY.M_mill.label = "HIJACKED"; }, /read[- ]?only|assign|frozen|Cannot/i);
  assert.throws(() => { DOMAIN_TAXONOMY.M_mill.tagHints.push("evil"); }, /read[- ]?only|extensible|frozen|Cannot/i);
  assert.throws(() => { DISCIPLINE_TAXONOMY.S1_subtractive_physics.galaxy = "evil"; }, /read[- ]?only|assign|frozen|Cannot/i);
});

test("clusterByJaccard: bagFn errors are wrapped with tip-index attribution (Arm B P1)", () => {
  const tips = [
    normalizeTip({ id: "x1" }),
    normalizeTip({ id: "x2" }),
    normalizeTip({ id: "x3" }),
  ];
  const evil = (t) => { if (t.id === "x2") throw new Error("BANG"); return new Set(["a"]); };
  assert.throws(() => clusterByJaccard(tips, { bagFn: evil }), /bagFn threw on tip\[1\] id=x2: BANG/);
});

test("clusterByJaccard: bagFn returning non-Set is a clear TypeError (Arm B P1)", () => {
  const tips = [normalizeTip({ id: "y" })];
  assert.throws(() => clusterByJaccard(tips, { bagFn: () => ["a", "b"] }), /must return a Set/);
});

test("aggregateLevel: malformed node missing repBag is a clear TypeError with index attribution (Arm B P1 sister)", () => {
  const bad = [{ id: "n1", level: 1, kind: "molecule", title: "t", members: [] }]; // no repBag
  assert.throws(() => aggregateLevel(bad), /node\[0\] id=n1 missing valid repBag/);
});

test("normalizeTip: empty-everything raws MUST get distinct ids (Arm B P0-3)", () => {
  const a = normalizeTip({}, "", 0);
  const b = normalizeTip({}, "", 1);
  const c = normalizeTip({ foo: "ignored-field" }, "", 2);
  assert.notEqual(a.id, b.id, "empty raws at distinct indices MUST get distinct ids");
  assert.notEqual(a.id, c.id);
  assert.notEqual(b.id, c.id);
});

test("normalizeTip: separator-injection collision MUST NOT collide (Arm B P0-3)", () => {
  // Without a field separator: title+body = "foo"+"bar" = "foobar"
  // And                       title+body = "foob"+"ar" = "foobar"
  // The \x1f separator preserves field boundaries so these MUST hash differently.
  const a = normalizeTip({ title: "foo", body: "bar" }, "src");
  const b = normalizeTip({ title: "foob", body: "ar" }, "src");
  assert.notEqual(a.id, b.id, "title/body boundary MUST be preserved in content-hash fingerprint");
});

test("dedupeTips: three empty-everything tips MUST remain three tips (Arm B P0-3 canary)", () => {
  const tips = [
    normalizeTip({ foo: "x" }, "", 0),
    normalizeTip({ bar: "y" }, "", 1),
    normalizeTip({ baz: "z" }, "", 2),
  ];
  const out = dedupeTips(tips);
  assert.equal(out.length, 3, "empty-everything tips MUST NOT silently merge in dedupe");
});

test("normalizeTip: anonymous counter fallback when no indexHint AND empty fingerprint", () => {
  // indexHint omitted -> falls to module-level _anonCounter.
  // Two anonymous-empty calls MUST produce distinct ids.
  const a = normalizeTip({});
  const b = normalizeTip({});
  assert.ok(a.id.startsWith("unknown-noid-anon-"));
  assert.ok(b.id.startsWith("unknown-noid-anon-"));
  assert.notEqual(a.id, b.id, "anonymous empty raws must NOT collide on the same monotonic id");
});
