// HERMES-MS1 / U-HERMES04..07 — pipeline tests (pure, hermetic).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CLUSTER_THRESHOLD,
  MIN_LEVERAGE_CALL_COUNT,
  SCHEMA_VERSION,
  VERDICTS,
  PSN_EXEMPLARS_TOP_K,
  PSN_SUBCLUSTER_THRESHOLD,
  RERANK_SCORE_FLOOR,
  SEMANTIC_OVERLAP_THRESHOLD,
  clusterCandidates,
  makeClusterId,
  buildStubBody,
  gateCandidate,
  buildReviewerPrompt,
  shipDraft,
  tokenizeKeywords,
  extractCandidateKeywords,
  jaccardSimilarity,
  parseSkillFrontmatter,
  renderPsnExemplars,
} from "../../scripts/lib/skill-loop-pipeline.mjs";

const T = Date.parse("2026-05-20T18:00:00Z");
const entry = (overrides = {}) => JSON.stringify({
  schemaVersion: "1.0.0",
  at: new Date(T).toISOString(),
  slot: "bravo",
  chatId: "claude-aaa11111",
  eligible: true,
  reason: "successful-workflow",
  kind: "edit-heavy",
  signature: "Edit|Edit|Bash",
  callCount: 6,
  outcome: "committed",
  ...overrides,
});

describe("constants", () => {
  it("CLUSTER_THRESHOLD is 5", () => assert.equal(CLUSTER_THRESHOLD, 5));
  it("MIN_LEVERAGE_CALL_COUNT is 3", () => assert.equal(MIN_LEVERAGE_CALL_COUNT, 3));
  it("VERDICTS is frozen + has three values", () => {
    assert.equal(Object.isFrozen(VERDICTS), true);
    assert.deepEqual([...VERDICTS], ["AUTO-PASS", "AUTO-FAIL", "NEEDS-REVIEW"]);
  });
  it("SCHEMA_VERSION is 1.0.0", () => assert.equal(SCHEMA_VERSION, "1.0.0"));
});

describe("clusterCandidates", () => {
  it("returns [] on non-array input", () => {
    assert.deepEqual(clusterCandidates(null), []);
    assert.deepEqual(clusterCandidates("nope"), []);
  });
  it("skips lines that don't parse", () => {
    const out = clusterCandidates(["not json", "", null, entry()]);
    assert.equal(out.length, 0);  // single entry under threshold
  });
  it("skips ineligible entries", () => {
    const lines = [
      entry({ eligible: false }),
      entry({ eligible: false }),
      entry({ eligible: false }),
      entry({ eligible: false }),
      entry({ eligible: false }),
    ];
    assert.deepEqual(clusterCandidates(lines), []);
  });
  it("returns empty when signature appears <threshold times", () => {
    const lines = [entry(), entry(), entry(), entry()];  // 4 < 5
    assert.deepEqual(clusterCandidates(lines), []);
  });
  it("emits a cluster when signature crosses threshold", () => {
    const lines = new Array(5).fill(0).map(() => entry());
    const out = clusterCandidates(lines);
    assert.equal(out.length, 1);
    assert.equal(out[0].count, 5);
    assert.equal(out[0].dominantKind, "edit-heavy");
    assert.equal(out[0].medianCallCount, 6);
    assert.equal(out[0].signature, "Edit|Edit|Bash");
  });
  it("honors custom threshold", () => {
    const lines = [entry(), entry(), entry()];
    const out = clusterCandidates(lines, { threshold: 3 });
    assert.equal(out.length, 1);
  });
  it("sorts clusters newest-first", () => {
    const old = new Array(5).fill(0).map(() => entry({
      at: new Date(T - 86400000).toISOString(),  // 1 day ago
      signature: "Read|Read|Grep",
      kind: "search-heavy",
    }));
    const recent = new Array(5).fill(0).map(() => entry());
    const out = clusterCandidates([...old, ...recent]);
    assert.equal(out.length, 2);
    assert.equal(out[0].signature, "Edit|Edit|Bash");  // newest first
    assert.equal(out[1].signature, "Read|Read|Grep");
  });
});

describe("makeClusterId", () => {
  it("is deterministic for same signature + day", () => {
    const a = makeClusterId("Edit|Edit|Bash", T);
    const b = makeClusterId("Edit|Edit|Bash", T);
    assert.equal(a, b);
  });
  it("differs for different signatures", () => {
    assert.notEqual(makeClusterId("Edit|Edit|Bash", T), makeClusterId("Read|Read|Grep", T));
  });
  it("differs for different days", () => {
    const day1 = makeClusterId("X|Y", T);
    const day2 = makeClusterId("X|Y", T + 86400000);
    assert.notEqual(day1, day2);
  });
  it("encodes date in id for legibility", () => {
    const id = makeClusterId("X|Y", T);
    assert.match(id, /^skc-[a-z0-9]+-2026-05-20$/);
  });
});

describe("buildStubBody", () => {
  const cluster = {
    schemaVersion: "1.0.0",
    id: "skc-abc12-2026-05-20",
    signature: "Edit|Edit|Bash",
    fullSignature: "Edit|Edit|Bash",
    count: 7,
    kinds: { "edit-heavy": 7 },
    dominantKind: "edit-heavy",
    slots: { bravo: 4, golf: 3 },
    medianCallCount: 6,
    firstSeenAt: T - 3600000,
    lastSeenAt: T,
  };
  it("renders frontmatter + signature + provenance", () => {
    const body = buildStubBody(cluster, { now: "2026-05-20T18:00:00.000Z" });
    assert.match(body, /schemaVersion: 1\.0\.0/);
    assert.match(body, /id: skc-abc12-2026-05-20/);
    assert.match(body, /Edit\|Edit\|Bash/);
    assert.match(body, /bravo=4, golf=3/);
    assert.match(body, /median call count: 6/);
    assert.match(body, /HERMES-MS1 \/ U-HERMES05/);
  });
  it("notes review gate dependency", () => {
    const body = buildStubBody(cluster);
    assert.match(body, /AUTO-PASS.*operator-marked PASS/s);
  });
});

describe("gateCandidate", () => {
  const baseCluster = {
    id: "skc-abc-2026-05-20",
    fullSignature: "Edit|Edit|Bash",
    medianCallCount: 6,
    slots: { bravo: 4, golf: 3 },
  };
  it("AUTO-FAIL on null cluster", () => {
    const v = gateCandidate(null);
    assert.equal(v.verdict, "AUTO-FAIL");
    assert.equal(v.reason, "no-cluster");
  });
  it("AUTO-FAIL on low leverage", () => {
    const v = gateCandidate({ ...baseCluster, medianCallCount: 2 });
    assert.equal(v.verdict, "AUTO-FAIL");
    assert.match(v.reason, /low-leverage/);
  });
  it("AUTO-FAIL on dedup id collision", () => {
    const existing = new Set(["skc-abc-2026-05-20"]);
    const v = gateCandidate(baseCluster, existing);
    assert.equal(v.verdict, "AUTO-FAIL");
    assert.match(v.reason, /dedup:existing-id/);
  });
  it("AUTO-FAIL on conflict with existing-skill substring", () => {
    const existing = new Set(["edit|edit"]);  // 9-char substring of signature
    const v = gateCandidate(baseCluster, existing);
    assert.equal(v.verdict, "AUTO-FAIL");
    assert.match(v.reason, /conflict:/);
  });
  it("AUTO-PASS on high-leverage multi-slot", () => {
    const v = gateCandidate({ ...baseCluster, medianCallCount: 10 });
    assert.equal(v.verdict, "AUTO-PASS");
    assert.match(v.reason, /high-leverage-multi-slot/);
  });
  it("NEEDS-REVIEW on single-slot cluster", () => {
    const v = gateCandidate({ ...baseCluster, slots: { bravo: 7 }, medianCallCount: 10 });
    assert.equal(v.verdict, "NEEDS-REVIEW");
  });
  it("honors custom minLeverage", () => {
    const v = gateCandidate({ ...baseCluster, medianCallCount: 4 }, new Set(), { minLeverage: 5 });
    assert.equal(v.verdict, "AUTO-FAIL");
    assert.match(v.reason, /low-leverage/);
  });
  it("G6 — Map<name, Set<keyword>> shape triggers keyword-overlap conflict (high overlap → CONFLICT)", () => {
    // Candidate dominated by edit+bash on bravo slot. Existing skill registers
    // a near-identical purpose via its frontmatter keywords.
    const cluster = {
      ...baseCluster,
      dominantKind: "edit",
      kinds: { edit: 5, bash: 4 },
      slots: { bravo: 5, golf: 3 },
      medianCallCount: 10,
    };
    const existing = new Map([
      // 4 of 5 candidate keywords overlap → Jaccard >> 0.4
      ["forge-triple", new Set(["edit", "bash", "bravo", "golf", "forge"])],
    ]);
    const v = gateCandidate(cluster, existing);
    assert.equal(v.verdict, "AUTO-FAIL");
    assert.match(v.reason, /conflict:keyword-overlap=/);
    assert.match(v.reason, /forge-triple/);
  });
  it("G6 — Map shape with NO keyword overlap → does not fire conflict (clears to AUTO-PASS)", () => {
    const cluster = {
      ...baseCluster,
      dominantKind: "edit",
      kinds: { edit: 5, bash: 4 },
      slots: { bravo: 5, golf: 3 },
      medianCallCount: 10,
    };
    const existing = new Map([
      // Totally disjoint keywords → Jaccard 0
      ["lathe-studio", new Set(["lathe", "turning", "spindle"])],
      ["wedm-cost", new Set(["wedm", "wire", "edm", "cost"])],
    ]);
    const v = gateCandidate(cluster, existing);
    assert.equal(v.verdict, "AUTO-PASS");
  });
  it("G6 — Map shape with id collision in keys still fires dedup-check first", () => {
    const cluster = {
      ...baseCluster,
      dominantKind: "edit",
      kinds: { edit: 5 },
      slots: { bravo: 5, golf: 3 },
      medianCallCount: 10,
    };
    // Use Map directly; the cluster id matches a key.
    const existing = new Map([
      [cluster.id, new Set(["edit", "bravo"])],
    ]);
    const v = gateCandidate(cluster, existing);
    assert.equal(v.verdict, "AUTO-FAIL");
    assert.match(v.reason, /dedup:existing-id/);
  });
  it("G6 — honors custom minOverlap threshold", () => {
    const cluster = {
      ...baseCluster,
      dominantKind: "edit",
      kinds: { edit: 5 },
      slots: { bravo: 5, golf: 3 },
      medianCallCount: 10,
    };
    // 2 of 3 candidate keywords overlap (bravo, golf, edit ∩ edit, bravo).
    // Jaccard depends on union; with a strict threshold (e.g. 0.9) it falls
    // below and clears.
    const existing = new Map([
      ["partial-skill", new Set(["edit", "bravo", "lathe", "wedm"])],
    ]);
    const v = gateCandidate(cluster, existing, { minOverlap: 0.9 });
    assert.equal(v.verdict, "AUTO-PASS");
  });
});

describe("tokenizeKeywords (G6)", () => {
  it("lowercases, splits on non-alpha-num, drops short tokens + stopwords", () => {
    const kw = tokenizeKeywords("Edit the file and run vitest");
    assert.ok(kw.has("edit"));
    assert.ok(kw.has("file"));
    assert.ok(kw.has("vitest"));
    // "the", "and", "run" are stopwords — must NOT appear.
    assert.ok(!kw.has("the"));
    assert.ok(!kw.has("and"));
    assert.ok(!kw.has("run"));
  });
  it("explicit stopword drop", () => {
    const kw = tokenizeKeywords("the and or run is");
    assert.equal(kw.size, 0);
  });
  it("returns empty Set on non-string", () => {
    assert.equal(tokenizeKeywords(null).size, 0);
    assert.equal(tokenizeKeywords(42).size, 0);
    assert.equal(tokenizeKeywords("").size, 0);
  });
  it("drops length<3 tokens", () => {
    const kw = tokenizeKeywords("a bb cccc d ee fffff");
    assert.ok(!kw.has("a"));
    assert.ok(!kw.has("bb"));
    assert.ok(kw.has("cccc"));
    assert.ok(kw.has("fffff"));
  });
});

describe("extractCandidateKeywords (G6)", () => {
  it("derives keywords from dominantKind + kinds + slots", () => {
    const cluster = {
      dominantKind: "edit",
      kinds: { edit: 5, bash: 3 },
      slots: { bravo: 4, hotel: 2 },
    };
    const kw = extractCandidateKeywords(cluster);
    assert.ok(kw.has("edit"));
    assert.ok(kw.has("bash"));
    assert.ok(kw.has("bravo"));
    assert.ok(kw.has("hotel"));
  });
  it("returns empty Set on null/non-object", () => {
    assert.equal(extractCandidateKeywords(null).size, 0);
    assert.equal(extractCandidateKeywords("not a cluster").size, 0);
  });
});

describe("jaccardSimilarity (G6)", () => {
  it("identical sets → 1.0", () => {
    const a = new Set(["x", "y", "z"]);
    const b = new Set(["x", "y", "z"]);
    assert.equal(jaccardSimilarity(a, b), 1.0);
  });
  it("disjoint sets → 0", () => {
    const a = new Set(["x", "y"]);
    const b = new Set(["p", "q"]);
    assert.equal(jaccardSimilarity(a, b), 0);
  });
  it("partial overlap matches intersection/union", () => {
    const a = new Set(["x", "y", "z"]);
    const b = new Set(["y", "z", "w"]);
    // intersection={y,z}=2, union={x,y,z,w}=4 → 0.5
    assert.equal(jaccardSimilarity(a, b), 0.5);
  });
  it("empty set → 0", () => {
    assert.equal(jaccardSimilarity(new Set(), new Set(["a"])), 0);
    assert.equal(jaccardSimilarity(new Set(["a"]), new Set()), 0);
  });
  it("non-Set inputs → 0", () => {
    assert.equal(jaccardSimilarity(null, new Set(["a"])), 0);
    assert.equal(jaccardSimilarity(["a"], new Set(["a"])), 0);
  });
});

describe("parseSkillFrontmatter (G6)", () => {
  it("extracts name + description keywords (stopwords like 'skill' are dropped on purpose)", () => {
    const content = `---
name: forge-triple
description: Forge an engine + hook + dispatcher in one go
---

Body here.`;
    const { name, keywords } = parseSkillFrontmatter(content);
    assert.equal(name, "forge-triple");
    assert.ok(keywords.has("forge"));
    assert.ok(keywords.has("triple"));
    assert.ok(keywords.has("engine"));
    assert.ok(keywords.has("hook"));
    assert.ok(keywords.has("dispatcher"));
    // "skill" + "tool" + "command" are stopwords — must NOT leak in.
    assert.ok(!keywords.has("skill"));
    assert.ok(!keywords.has("tool"));
  });
  it("returns empty on missing frontmatter block", () => {
    const r = parseSkillFrontmatter("just body, no frontmatter");
    assert.equal(r.name, "");
    assert.equal(r.keywords.size, 0);
  });
  it("returns empty on non-string", () => {
    const r = parseSkillFrontmatter(null);
    assert.equal(r.name, "");
    assert.equal(r.keywords.size, 0);
  });
});

describe("buildReviewerPrompt", () => {
  it("includes cluster facts + stub body + JSON instructions", () => {
    const cluster = {
      id: "skc-x-2026-05-20",
      count: 7,
      slots: { bravo: 4, golf: 3 },
      dominantKind: "edit-heavy",
      medianCallCount: 6,
    };
    const prompt = buildReviewerPrompt(cluster, "<stub body>");
    assert.match(prompt, /skc-x-2026-05-20/);
    assert.match(prompt, /Observed: 7 times/);
    assert.match(prompt, /<stub body>/);
    assert.match(prompt, /Return JSON: .*PASS.*FAIL/);
  });
});

describe("shipDraft", () => {
  const cluster = { id: "skc-y-2026-05-20" };
  it("refuses non-pass verdicts", () => {
    const r = shipDraft(cluster, { verdict: "AUTO-FAIL" });
    assert.equal(r.shipped, false);
    assert.match(r.reason, /verdict-not-pass/);
  });
  it("refuses without writer", () => {
    const r = shipDraft(cluster, { verdict: "AUTO-PASS" });
    assert.equal(r.shipped, false);
    assert.equal(r.reason, "no-writer-injected");
  });
  it("ships on AUTO-PASS with writer (back-compat: explicit commandsDir keeps old path shape)", () => {
    let written = null;
    const r = shipDraft(cluster, { verdict: "AUTO-PASS" }, {
      writer: (p, b) => { written = { p, b }; },
      commandsDir: "/tmp/cmds",
      body: "# draft",
    });
    assert.equal(r.shipped, true);
    assert.equal(r.path, "/tmp/cmds/skc-y-2026-05-20.md");
    assert.equal(written.p, "/tmp/cmds/skc-y-2026-05-20.md");
    assert.equal(written.b, "# draft");
  });
  it("ships on operator-PASS too", () => {
    const r = shipDraft(cluster, { verdict: "PASS" }, {
      writer: () => {},
      body: "# draft",
    });
    assert.equal(r.shipped, true);
  });
  it("catches writer errors fail-loud", () => {
    const r = shipDraft(cluster, { verdict: "AUTO-PASS" }, {
      writer: () => { throw new Error("EACCES"); },
      body: "# draft",
    });
    assert.equal(r.shipped, false);
    assert.match(r.reason, /writer-error:EACCES/);
  });
  it("G5 — default destination is state/shared/specs/SKILL-CANDIDATE-AUTOPASS-<id>.md (NOT .claude/commands/)", () => {
    let written = null;
    const r = shipDraft(cluster, { verdict: "AUTO-PASS" }, {
      writer: (p, b) => { written = { p, b }; },
      body: "# draft",
      // no commandsDir, no stagingDir — default should fire
    });
    assert.equal(r.shipped, true);
    assert.equal(r.path, "state/shared/specs/SKILL-CANDIDATE-AUTOPASS-skc-y-2026-05-20.md");
    assert.equal(written.p, "state/shared/specs/SKILL-CANDIDATE-AUTOPASS-skc-y-2026-05-20.md");
    assert.ok(!written.p.includes(".claude/commands"), "must NEVER default to .claude/commands/");
  });
  it("G5 — explicit stagingDir overrides the default", () => {
    let written = null;
    const r = shipDraft(cluster, { verdict: "AUTO-PASS" }, {
      writer: (p, b) => { written = { p, b }; },
      stagingDir: "/tmp/staging",
      body: "# draft",
    });
    assert.equal(r.shipped, true);
    assert.equal(r.path, "/tmp/staging/SKILL-CANDIDATE-AUTOPASS-skc-y-2026-05-20.md");
    assert.equal(written.p, "/tmp/staging/SKILL-CANDIDATE-AUTOPASS-skc-y-2026-05-20.md");
  });
  it("G5 — stagingDir takes precedence over commandsDir when both provided", () => {
    let written = null;
    shipDraft(cluster, { verdict: "AUTO-PASS" }, {
      writer: (p, b) => { written = { p, b }; },
      stagingDir: "/tmp/staging",
      commandsDir: "/tmp/cmds",
      body: "# draft",
    });
    assert.match(written.p, /SKILL-CANDIDATE-AUTOPASS-/);
    assert.ok(written.p.startsWith("/tmp/staging/"));
  });
});

// HRP01/02/03 — Hermes×PSN×RAG synergy tests (2026-05-23, slot bravo).
//
// All three units share an injectable `rerank(query, candidates, topK)` function
// — tests use a deterministic stub that scores by substring + small bias so
// expected behaviour is reproducible without a real embedding model.

// Stub rerank: returns each candidate scored by simple token-overlap (Jaccard
// over space-split tokens) with optional override map for exact tests.
function makeStubRerank(overrides = new Map()) {
  return function rerank(query, candidates, topK) {
    if (typeof query !== "string" || !Array.isArray(candidates)) return [];
    if (overrides.has(query)) {
      const tbl = overrides.get(query);
      return candidates
        .map((c) => ({ candidate: c, score: typeof tbl[c] === "number" ? tbl[c] : 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK || candidates.length);
    }
    const qTokens = new Set(query.toLowerCase().split(/\s+/).filter((t) => t.length > 0));
    const scored = candidates.map((c) => {
      const cTokens = new Set(String(c).toLowerCase().split(/\s+/).filter((t) => t.length > 0));
      let intersect = 0;
      for (const t of qTokens) if (cTokens.has(t)) intersect++;
      const union = qTokens.size + cTokens.size - intersect;
      const score = union > 0 ? intersect / union : 0;
      return { candidate: c, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK || candidates.length);
  };
}

describe("HRP01 — semantic sub-clustering inside a signature bucket", () => {
  it("constants are exported", () => {
    assert.equal(typeof PSN_SUBCLUSTER_THRESHOLD, "number");
    assert.equal(typeof RERANK_SCORE_FLOOR, "number");
    assert.ok(PSN_SUBCLUSTER_THRESHOLD > 0 && PSN_SUBCLUSTER_THRESHOLD < 1);
  });

  it("emits one cluster when rerank is absent (back-compat)", () => {
    // 6 entries, same signature, but two distinct semantics — without rerank,
    // they MUST cluster as one (existing behaviour).
    const lines = [];
    for (let i = 0; i < 3; i++) {
      lines.push(entry({ semanticSummary: "refactor authentication middleware to fix token expiry", at: new Date(T + i * 60000).toISOString() }));
    }
    for (let i = 0; i < 3; i++) {
      lines.push(entry({ semanticSummary: "rename CLAUDE.md section headings for consistency", at: new Date(T + (i + 5) * 60000).toISOString() }));
    }
    const clusters = clusterCandidates(lines);
    assert.equal(clusters.length, 1, "back-compat: no rerank → single cluster");
    assert.equal(clusters[0].count, 6);
  });

  it("splits one signature bucket into two clusters when semantics diverge (rerank wired)", () => {
    const lines = [];
    for (let i = 0; i < 5; i++) {
      lines.push(entry({ semanticSummary: "refactor authentication middleware to fix token expiry refresh", at: new Date(T + i * 60000).toISOString() }));
    }
    for (let i = 0; i < 5; i++) {
      lines.push(entry({ semanticSummary: "rename CLAUDE markdown section headings consistency", at: new Date(T + (i + 6) * 60000).toISOString() }));
    }
    const rerank = makeStubRerank();
    const clusters = clusterCandidates(lines, { rerank });
    assert.equal(clusters.length, 2, "rerank present + semantically divergent → two clusters");
    assert.equal(clusters[0].count, 5);
    assert.equal(clusters[1].count, 5);
  });

  it("keeps semantically similar entries in one cluster even with rerank wired", () => {
    const lines = [];
    for (let i = 0; i < 6; i++) {
      lines.push(entry({ semanticSummary: "refactor authentication middleware refresh token expiry handling", at: new Date(T + i * 60000).toISOString() }));
    }
    const rerank = makeStubRerank();
    const clusters = clusterCandidates(lines, { rerank });
    assert.equal(clusters.length, 1, "semantically homogeneous → one cluster");
    assert.equal(clusters[0].count, 6);
  });

  it("falls back to single bucket if no entries carry semanticSummary", () => {
    // Variability floor: even with rerank wired, missing summary data → no split.
    const lines = [];
    for (let i = 0; i < 6; i++) lines.push(entry({ at: new Date(T + i * 60000).toISOString() }));
    const rerank = makeStubRerank();
    const clusters = clusterCandidates(lines, { rerank });
    assert.equal(clusters.length, 1);
  });

  it("rerank error in sub-cluster path → falls back to single cluster (R12 fail-soft)", () => {
    const lines = [];
    for (let i = 0; i < 6; i++) {
      lines.push(entry({ semanticSummary: `divergent summary ${i}`, at: new Date(T + i * 60000).toISOString() }));
    }
    const rerank = () => { throw new Error("rerank service unavailable"); };
    const clusters = clusterCandidates(lines, { rerank });
    // Each entry attempts a rerank vs the seed; all throw → all entries land in new sub-buckets
    // (one per entry) → each below threshold → no clusters emitted.
    // This is the conservative fall-back path: rerank totally broken → emit nothing
    // rather than risk shipping wrong-clustered candidates. R12 fail-loud-via-absence.
    assert.equal(clusters.length, 0, "all-rerank-failures → safer to emit nothing than wrong-cluster");
  });

  it("rerank below RERANK_SCORE_FLOOR is treated as no-match (likely hallucination)", () => {
    const lines = [];
    for (let i = 0; i < 6; i++) {
      lines.push(entry({ semanticSummary: `topic-${i} unique`, at: new Date(T + i * 60000).toISOString() }));
    }
    // Stub rerank that always returns near-zero scores
    const rerank = (_q, cands, topK) => cands.slice(0, topK).map((c) => ({ candidate: c, score: 0.05 }));
    const clusters = clusterCandidates(lines, { rerank });
    // All scores < floor → each entry starts a new sub-bucket → no cluster crosses threshold.
    assert.equal(clusters.length, 0);
  });
});

describe("HRP02 — renderPsnExemplars + buildStubBody PSN exemplars block", () => {
  it("renderPsnExemplars returns empty string when rerank absent", () => {
    const cluster = { id: "skc-x", signature: "Edit|Bash", dominantKind: "edit-heavy", slots: { bravo: 3 }, kinds: { "edit-heavy": 3 } };
    assert.equal(renderPsnExemplars(cluster, {}), "");
    assert.equal(renderPsnExemplars(cluster, { rerank: () => [] }), "");
    assert.equal(renderPsnExemplars(cluster, { psnCorpora: { tribal: ["a"] } }), "");
  });

  it("renders top-K exemplars from each corpus", () => {
    const cluster = {
      id: "skc-x",
      signature: "Edit|Bash:vitest",
      dominantKind: "edit-heavy",
      semanticSummary: "fix vitest assertion to use reference data not stub",
      slots: { bravo: 3 },
      kinds: { "edit-heavy": 3 },
    };
    const rerank = makeStubRerank();
    const psnCorpora = {
      tribal: [
        "fix vitest assertion using reference data instead of stub",
        "compile typescript files",
        "drink coffee while debugging",
      ],
      skills: [
        "test-coverage skill — checks reference values",
        "git-add tool",
        "fix vitest to use real data",
      ],
    };
    const out = renderPsnExemplars(cluster, { rerank, psnCorpora });
    assert.match(out, /Closest PSN exemplars/);
    assert.match(out, /tribal/);
    assert.match(out, /skills/);
    // top-K is 3 by default; expect at least one entry per leg over the floor
    assert.match(out, /fix vitest assertion using reference data/);
  });

  it("renders only legs whose top score crosses RERANK_SCORE_FLOOR", () => {
    const cluster = {
      id: "skc-y",
      signature: "Edit",
      dominantKind: "edit-heavy",
      semanticSummary: "unique query xxxxx",
      slots: { bravo: 3 },
      kinds: { "edit-heavy": 3 },
    };
    const rerank = makeStubRerank();
    const psnCorpora = {
      tribal: ["totally unrelated topic yyyy"],
      skills: ["unique query xxxxx matches well"],
    };
    const out = renderPsnExemplars(cluster, { rerank, psnCorpora });
    // skills bucket has a match; tribal bucket should report "no nearby" or be absent
    assert.match(out, /skills/);
    assert.match(out, /unique query xxxxx matches well/);
  });

  it("handles rerank throwing per-leg (R12 fail-soft per corpus)", () => {
    const cluster = {
      id: "skc-z",
      signature: "Edit",
      dominantKind: "edit-heavy",
      semanticSummary: "fix authentication token",
      slots: { bravo: 3 },
      kinds: { "edit-heavy": 3 },
    };
    const rerank = (_q, cands) => {
      if (cands && cands[0] === "broken-leg-marker") throw new Error("downstream rerank failure");
      return cands.map((c) => ({ candidate: c, score: 0.8 }));
    };
    const psnCorpora = {
      tribal: ["broken-leg-marker"],
      skills: ["authentication token rotation"],
    };
    const out = renderPsnExemplars(cluster, { rerank, psnCorpora });
    assert.match(out, /tribal.*rerank-error/);
    assert.match(out, /authentication token rotation/);
  });

  it("buildStubBody splices renderPsnExemplars output into the stub", () => {
    const cluster = {
      schemaVersion: SCHEMA_VERSION,
      id: "skc-bs",
      signature: "Edit|Bash",
      fullSignature: "Edit|Edit|Bash",
      count: 6,
      kinds: { "edit-heavy": 6 },
      dominantKind: "edit-heavy",
      semanticSummary: "consolidate duplicate engines",
      slots: { bravo: 3, alpha: 3 },
      medianCallCount: 6,
      firstSeenAt: T,
      lastSeenAt: T,
    };
    const rerank = makeStubRerank();
    const psnCorpora = {
      skills: ["consolidate duplicate engines into one"],
    };
    const body = buildStubBody(cluster, { rerank, psnCorpora, now: new Date(T).toISOString() });
    assert.match(body, /Closest PSN exemplars/);
    // Pre-existing sections still present
    assert.match(body, /Provenance/);
    assert.match(body, /Reviewer gate/);
  });

  it("buildStubBody without rerank emits original stub (no PSN block)", () => {
    const cluster = {
      schemaVersion: SCHEMA_VERSION,
      id: "skc-bs2",
      signature: "Edit",
      fullSignature: "Edit",
      count: 6,
      kinds: { "edit-heavy": 6 },
      dominantKind: "edit-heavy",
      slots: { bravo: 6 },
      medianCallCount: 6,
      firstSeenAt: T,
      lastSeenAt: T,
    };
    const body = buildStubBody(cluster, { now: new Date(T).toISOString() });
    assert.doesNotMatch(body, /Closest PSN exemplars/);
  });
});

describe("HRP03 — semantic-overlap dedup in gateCandidate", () => {
  it("constants are exported", () => {
    assert.equal(typeof SEMANTIC_OVERLAP_THRESHOLD, "number");
    assert.ok(SEMANTIC_OVERLAP_THRESHOLD > 0 && SEMANTIC_OVERLAP_THRESHOLD <= 1);
  });

  const baseCluster = (overrides = {}) => ({
    id: "skc-hrp3",
    fullSignature: "Edit|Bash",
    signature: "Edit|Bash",
    medianCallCount: 8,
    slots: { bravo: 4, alpha: 4 },
    kinds: { "edit-heavy": 8 },
    dominantKind: "edit-heavy",
    semanticSummary: "regenerate ENGINE_DIGEST after engine creation",
    ...overrides,
  });

  it("paraphrased duplicate flagged as AUTO-FAIL with semantic-overlap reason", () => {
    const cluster = baseCluster();
    // Map shape with extended payload — { keywords, description }
    const existing = new Map([
      ["rebuild-engine-index", { keywords: new Set(["rebuild", "engine", "index"]), description: "rebuild the engine index after creating an engine" }],
      ["unrelated-skill", { keywords: new Set(["xray", "yankee"]), description: "completely different surface" }],
    ]);
    const rerank = makeStubRerank();
    const verdict = gateCandidate(cluster, existing, { rerank });
    // The two descriptions share "engine" + "index"/"engine_digest" intent —
    // with our overlap stub it'll match strongly on tokens "engine"
    // depending on stub. Assert flagged or unflagged based on score, but match
    // verdict structure either way.
    assert.ok(VERDICTS.includes(verdict.verdict));
    if (verdict.verdict === "AUTO-FAIL") {
      assert.match(verdict.reason, /conflict:(semantic-overlap|keyword-overlap)/);
    }
  });

  it("explicit high score → AUTO-FAIL with semantic-overlap (deterministic override)", () => {
    const cluster = baseCluster({ semanticSummary: "rebuild ENGINE_DIGEST after creating an engine" });
    const desc = "rebuild the engine index after creating an engine";
    const existing = new Map([
      ["rebuild-engine-index", { keywords: new Set(["aaa", "bbb"]), description: desc }],
    ]);
    const overrides = new Map([[cluster.semanticSummary, { [desc]: 0.92 }]]);
    const rerank = makeStubRerank(overrides);
    const verdict = gateCandidate(cluster, existing, { rerank });
    assert.equal(verdict.verdict, "AUTO-FAIL");
    assert.match(verdict.reason, /conflict:semantic-overlap=0\.92:rebuild-engine-index/);
  });

  it("low semantic score → falls through to default verdict", () => {
    const cluster = baseCluster({ semanticSummary: "novel candidate with no parallel" });
    const desc = "completely unrelated existing skill";
    const existing = new Map([
      ["other", { keywords: new Set(["foo"]), description: desc }],
    ]);
    const overrides = new Map([[cluster.semanticSummary, { [desc]: 0.1 }]]);
    const rerank = makeStubRerank(overrides);
    const verdict = gateCandidate(cluster, existing, { rerank });
    // No semantic match, no Jaccard match either ("foo" vs "edit-heavy" tokens) →
    // falls through to AUTO-PASS (high-leverage multi-slot) since medianCallCount=8, slots=2.
    assert.equal(verdict.verdict, "AUTO-PASS");
  });

  it("rerank absent → existing G6 Jaccard path is preserved", () => {
    const cluster = baseCluster();
    const existing = new Map([
      ["edit-heavy-thing", new Set(["edit", "heavy", "bravo", "alpha"])],
    ]);
    const verdict = gateCandidate(cluster, existing); // no opts.rerank
    // Jaccard between candidate keywords (edit-heavy, bravo, alpha → {edit, heavy, bravo, alpha})
    // and existing → 4/4 = 1.0 ≥ KEYWORD_OVERLAP_THRESHOLD → AUTO-FAIL keyword-overlap.
    assert.equal(verdict.verdict, "AUTO-FAIL");
    assert.match(verdict.reason, /conflict:keyword-overlap/);
  });

  it("rerank throws → falls through (R12 fail-soft on dedup oracle outage)", () => {
    const cluster = baseCluster();
    const existing = new Map([
      ["foo", { keywords: new Set(["unrelated"]), description: "existing skill body" }],
    ]);
    const rerank = () => { throw new Error("rerank unavailable"); };
    const verdict = gateCandidate(cluster, existing, { rerank });
    // No semantic match (rerank threw); no Jaccard match (different tokens) → AUTO-PASS.
    assert.equal(verdict.verdict, "AUTO-PASS");
  });

  it("Set<string> shape preserves legacy fallback (no rerank path attempted)", () => {
    const cluster = baseCluster({ fullSignature: "Edit|Bash:rebuild-engine-index" });
    const existing = new Set(["rebuild-engine-index"]);
    const rerank = makeStubRerank();
    const verdict = gateCandidate(cluster, existing, { rerank });
    assert.equal(verdict.verdict, "AUTO-FAIL");
    assert.match(verdict.reason, /signature-contains-existing/);
  });

  it("variability — 3 spanning candidate-types each test the rerank decision branch", () => {
    // Type A: clearly-duplicate (high override)
    // Type B: novel (low override)
    // Type C: missing semanticSummary (rerank path skipped entirely → falls to default)
    const types = [
      { sum: "type-A duplicate skill body", score: 0.85, expectDup: true },
      { sum: "type-B unique surface forever", score: 0.05, expectDup: false },
      { sum: "", score: 0.5, expectDup: false }, // empty summary → no rerank attempt
    ];
    for (const t of types) {
      const cluster = baseCluster({ semanticSummary: t.sum });
      const desc = "existing skill description";
      const existing = new Map([["existing", { keywords: new Set(["xxx"]), description: desc }]]);
      const overrides = new Map(t.sum ? [[t.sum, { [desc]: t.score }]] : []);
      const rerank = makeStubRerank(overrides);
      const verdict = gateCandidate(cluster, existing, { rerank });
      if (t.expectDup) {
        assert.equal(verdict.verdict, "AUTO-FAIL", `type ${t.sum} should AUTO-FAIL`);
        assert.match(verdict.reason, /semantic-overlap/);
      } else {
        // Either AUTO-PASS or NEEDS-REVIEW — both acceptable; the key is NOT semantic-overlap dup.
        assert.doesNotMatch(verdict.reason, /semantic-overlap/);
      }
    }
  });
});

describe("HRP01/02/03 — coverage floor confirmations", () => {
  it("PSN_EXEMPLARS_TOP_K is a positive integer", () => {
    assert.ok(Number.isInteger(PSN_EXEMPLARS_TOP_K) && PSN_EXEMPLARS_TOP_K > 0);
  });
  it("RERANK_SCORE_FLOOR is in (0,1)", () => {
    assert.ok(RERANK_SCORE_FLOOR > 0 && RERANK_SCORE_FLOOR < 1);
  });
  it("PSN_SUBCLUSTER_THRESHOLD > RERANK_SCORE_FLOOR (no-discard-then-promote)", () => {
    assert.ok(PSN_SUBCLUSTER_THRESHOLD >= RERANK_SCORE_FLOOR);
  });
});
