// scripts/hermes-dream-cycle-synth.test.mjs
// Tests for U-GALAXY-MS1-B1-HMEMV04 dream-cycle synthesis.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractKeywords,
  jaccard,
  listAllMemos,
  findConnections,
  clusterByMemo,
  synthesizeDreamMarkdown,
  run,
  runGalaxyCascade,
} from "./hermes-dream-cycle-synth.mjs";

// Reference implementation of the ORIGINAL naive O(n²) all-pairs scan, kept in
// the test ONLY to prove the blocked findConnections yields the identical result
// (R9 — the optimization must not change behavior, only complexity).
function naiveFindConnections(memos, { minJaccard = 0.15, topKKeywords = 20, maxConnections = 200 } = {}) {
  const indexed = memos.map(m => ({ memo: m, keywords: extractKeywords(m.content, topKKeywords) }));
  const out = [];
  for (let i = 0; i < indexed.length; i++) {
    for (let j = i + 1; j < indexed.length; j++) {
      const sim = jaccard(indexed[i].keywords, indexed[j].keywords);
      if (sim < minJaccard) continue;
      out.push({
        a: { name: indexed[i].memo.name, type: indexed[i].memo.type },
        b: { name: indexed[j].memo.name, type: indexed[j].memo.type },
        jaccard: sim,
        shared: [...indexed[i].keywords].filter(x => indexed[j].keywords.has(x)).sort(),
      });
    }
  }
  out.sort((x, y) => y.jaccard - x.jaccard);
  return out.slice(0, maxConnections);
}

function makeFakeFs(layout) {
  return {
    readdirSync(dir) {
      const norm = dir.replace(/\\/g, "/");
      const prefix = norm.endsWith("/") ? norm : norm + "/";
      const names = new Set();
      for (const p of Object.keys(layout)) {
        if (p.startsWith(prefix)) {
          const rest = p.slice(prefix.length);
          if (!rest.includes("/")) names.add(rest);
        }
      }
      if (names.size === 0) {
        const err = new Error(`ENOENT: ${dir}`);
        err.code = "ENOENT";
        throw err;
      }
      return [...names];
    },
    readFileSync(file, _enc) {
      const norm = file.replace(/\\/g, "/");
      const entry = layout[norm];
      if (!entry) throw Object.assign(new Error(`ENOENT: ${file}`), { code: "ENOENT" });
      return entry;
    },
    writeFileSync(file, content, _enc) {
      layout[file.replace(/\\/g, "/")] = content;
    },
    mkdirSync(_dir, _opts) {},
  };
}

// ───────────── extractKeywords ─────────────

describe("extractKeywords", () => {
  it("returns top-K most frequent words as a Set", () => {
    const s = extractKeywords("kienzle kienzle kienzle mill mill spindle", 10);
    assert.equal(s.has("kienzle"), true);
    assert.equal(s.has("mill"), true);
    assert.equal(s.has("spindle"), true);
  });

  it("filters stop-words", () => {
    const s = extractKeywords("the and is mill kienzle the the the", 5);
    assert.equal(s.has("the"), false);
    assert.equal(s.has("and"), false);
    assert.equal(s.has("mill"), true);
    assert.equal(s.has("kienzle"), true);
  });

  it("respects k cap (set size ≤ k)", () => {
    const s = extractKeywords("alpha beta gamma delta epsilon zeta eta theta iota kappa", 3);
    assert.equal(s.size, 3);
  });

  it("returns empty Set for empty input", () => {
    assert.equal(extractKeywords("", 10).size, 0);
  });

  it("normalizes to lowercase + ignores tokens shorter than 3 chars", () => {
    const s = extractKeywords("MILL Mill mill a b cn cnc", 10);
    assert.equal(s.has("mill"), true);
    assert.equal(s.has("MILL"), false);
    assert.equal(s.has("a"), false);
    assert.equal(s.has("cnc"), true);
  });
});

// ───────────── jaccard ─────────────

describe("jaccard", () => {
  it("identical sets → 1.0", () => {
    const a = new Set(["x", "y", "z"]);
    const b = new Set(["x", "y", "z"]);
    assert.equal(jaccard(a, b), 1);
  });

  it("disjoint sets → 0", () => {
    assert.equal(jaccard(new Set(["a", "b"]), new Set(["c", "d"])), 0);
  });

  it("50% overlap → 1/3 (|inter|=1, |union|=3)", () => {
    const v = jaccard(new Set(["a", "b"]), new Set(["b", "c"]));
    assert.equal(v.toFixed(4), "0.3333");
  });

  it("both empty → 0 (no NaN)", () => {
    assert.equal(jaccard(new Set(), new Set()), 0);
  });

  it("one empty → 0", () => {
    assert.equal(jaccard(new Set(["a"]), new Set()), 0);
    assert.equal(jaccard(new Set(), new Set(["a"])), 0);
  });
});

// ───────────── listAllMemos ─────────────

describe("listAllMemos", () => {
  it("returns empty array when no dirs exist", () => {
    assert.deepEqual(listAllMemos({ root: "/r", fsImpl: makeFakeFs({}) }), []);
  });

  it("collects from all 3 type dirs", () => {
    const fs = makeFakeFs({
      "/r/feedback/a.md": "# A",
      "/r/reference/b.md": "# B",
      "/r/project/c.md": "# C",
    });
    const memos = listAllMemos({ root: "/r", fsImpl: fs });
    assert.equal(memos.length, 3);
    const types = memos.map(m => m.type).sort();
    assert.deepEqual(types, ["feedback", "project", "reference"]);
  });

  it("skips non-.md files", () => {
    const fs = makeFakeFs({
      "/r/feedback/a.md": "# A",
      "/r/feedback/README.txt": "readme",
    });
    const memos = listAllMemos({ root: "/r", fsImpl: fs });
    assert.equal(memos.length, 1);
    assert.equal(memos[0].name, "a.md");
  });
});

// ───────────── findConnections ─────────────

describe("findConnections", () => {
  it("two memos with shared keywords above threshold yield 1 connection", () => {
    const memos = [
      { name: "a.md", type: "feedback", content: "kienzle force mill spindle hsm" },
      { name: "b.md", type: "reference", content: "kienzle force mill spindle chip-load" },
    ];
    const cs = findConnections(memos, { minJaccard: 0.1, topKKeywords: 10 });
    assert.equal(cs.length, 1);
    assert.equal(cs[0].a.name, "a.md");
    assert.equal(cs[0].b.name, "b.md");
    assert.ok(cs[0].jaccard >= 0.5);
    assert.ok(cs[0].shared.includes("kienzle"));
    assert.ok(cs[0].shared.includes("mill"));
  });

  it("disjoint memos yield 0 connections", () => {
    const memos = [
      { name: "a.md", type: "feedback", content: "kienzle mill spindle" },
      { name: "b.md", type: "feedback", content: "quote customer pricing" },
    ];
    const cs = findConnections(memos, { minJaccard: 0.1 });
    assert.equal(cs.length, 0);
  });

  it("connections sorted by similarity descending", () => {
    const memos = [
      { name: "a.md", type: "feedback", content: "mill spindle hsm trochoidal kienzle" },
      { name: "b.md", type: "feedback", content: "mill spindle hsm trochoidal kienzle" },
      { name: "c.md", type: "feedback", content: "mill alone" },
    ];
    const cs = findConnections(memos, { minJaccard: 0.05 });
    assert.ok(cs.length >= 2);
    assert.ok(cs[0].jaccard >= cs[cs.length - 1].jaccard);
  });

  it("maxConnections caps the result list", () => {
    const memos = Array.from({ length: 10 }, (_, i) => ({
      name: `m${i}.md`,
      type: "feedback",
      content: "kienzle mill spindle hsm trochoidal",
    }));
    const cs = findConnections(memos, { minJaccard: 0.1, maxConnections: 5 });
    assert.equal(cs.length, 5);
  });

  it("empty corpus → empty connections", () => {
    assert.deepEqual(findConnections([]), []);
  });

  it("single-memo corpus → empty connections (no pair to match)", () => {
    assert.deepEqual(findConnections([{ name: "a.md", type: "feedback", content: "mill" }]), []);
  });

  // ── SCALE FIX (slot:bravo 2026-06-04): blocking must equal the naive O(n²) ──
  // result on a representative corpus, AND must not OOM at 11K-memo scale.
  it("blocking result equals a naive O(n²) reference on a representative corpus", () => {
    // Distinct, varied keyword sets with real partial overlaps (no degenerate
    // all-common keyword) so the df-cap never engages at this size.
    const vocab = ["kienzle", "taylor", "mill", "lathe", "wedm", "spindle", "chatter",
      "deflection", "thermal", "coolant", "feed", "speed", "wear", "surface", "fixture",
      "tolerance", "quote", "erp", "hermes", "obsidian"];
    const memos = Array.from({ length: 60 }, (_, i) => ({
      name: `m${i}.md`, type: "reference",
      // each memo = a sliding window of 6 vocab words → graded overlaps
      content: Array.from({ length: 6 }, (_, k) => vocab[(i + k) % vocab.length]).join(" "),
    }));
    // Compare with NO truncation (huge cap) so tie-breaking at a maxConnections
    // boundary can't create a spurious set difference — this isolates the
    // correctness of candidate generation + scoring.
    const opts = { minJaccard: 0.15, topKKeywords: 10, maxConnections: 1_000_000 };
    const naive = naiveFindConnections(memos, opts);
    const blocked = findConnections(memos, opts);
    const key = (c) => `${[c.a.name, c.b.name].sort().join("|")}@${c.jaccard.toFixed(4)}`;
    assert.deepEqual(new Set(blocked.map(key)), new Set(naive.map(key)),
      "blocking must yield the identical pair set + scores as the naive scan");
  });

  it("completes on an 11K-memo-scale corpus WITHOUT OOM (the nightly-task regression)", () => {
    // 12,000 memos past the live corpus size that OOM'd the naive O(n²) (62M
    // pairs / 4GB heap death). Realistic shape: ULTRA-COMMON boilerplate
    // ("prism","2026" in every memo — the df-cap must skip these or the giant
    // posting lists reintroduce the blow-up) + 400 topic CLUSTERS each with its
    // own discriminative vocabulary (df≈30 ≤ cap → intra-cluster pairs connect).
    const CLUSTERS = 400, PER = 30;
    const memos = [];
    for (let c = 0; c < CLUSTERS; c++) {
      for (let k = 0; k < PER; k++) {
        // cluster-specific discriminative keywords + per-memo unique filler
        memos.push({
          name: `big${c}_${k}.md`, type: "reference",
          content: `prism 2026 topic${c}a topic${c}b topic${c}c topic${c}d uniq${c}_${k}`,
        });
      }
    }
    assert.equal(memos.length, 12000);
    const cs = findConnections(memos, { minJaccard: 0.15, maxConnections: 200 });
    assert.ok(Array.isArray(cs), "returns an array");
    assert.ok(cs.length <= 200, "respects maxConnections cap");
    assert.ok(cs.length > 0, "surfaces real intra-cluster connections (df-cap skips only the boilerplate)");
    // every surfaced connection must be intra-cluster (same topic prefix)
    for (const conn of cs) {
      const ca = conn.a.name.split("_")[0], cb = conn.b.name.split("_")[0];
      assert.equal(ca, cb, "blocking only connects memos that truly share discriminative keywords");
    }
  });
});

// ───────────── clusterByMemo ─────────────

describe("clusterByMemo", () => {
  it("inverts connection list into per-memo peer arrays", () => {
    const cs = [
      { a: { name: "a.md", type: "feedback" }, b: { name: "b.md", type: "feedback" }, jaccard: 0.5, shared: ["mill"] },
      { a: { name: "a.md", type: "feedback" }, b: { name: "c.md", type: "feedback" }, jaccard: 0.3, shared: ["spindle"] },
    ];
    const map = clusterByMemo(cs);
    assert.equal(map.size, 3);
    assert.equal(map.get("a.md").length, 2);
    assert.equal(map.get("b.md").length, 1);
    assert.equal(map.get("c.md").length, 1);
  });

  it("per-memo peer lists sorted by jaccard descending", () => {
    const cs = [
      { a: { name: "a.md", type: "feedback" }, b: { name: "b.md", type: "feedback" }, jaccard: 0.2, shared: [] },
      { a: { name: "a.md", type: "feedback" }, b: { name: "c.md", type: "feedback" }, jaccard: 0.8, shared: [] },
      { a: { name: "a.md", type: "feedback" }, b: { name: "d.md", type: "feedback" }, jaccard: 0.5, shared: [] },
    ];
    const map = clusterByMemo(cs);
    const peers = map.get("a.md");
    assert.equal(peers[0].peer, "c.md");
    assert.equal(peers[0].jaccard, 0.8);
    assert.equal(peers[1].peer, "d.md");
    assert.equal(peers[2].peer, "b.md");
  });

  it("empty connections → empty map", () => {
    assert.equal(clusterByMemo([]).size, 0);
  });
});

// ───────────── synthesizeDreamMarkdown ─────────────

describe("synthesizeDreamMarkdown", () => {
  it("renders frontmatter + top-connections + cluster-heads sections", () => {
    const md = synthesizeDreamMarkdown({
      date: "2026-05-27",
      totalMemos: 2,
      connections: [
        { a: { name: "a.md", type: "feedback" }, b: { name: "b.md", type: "feedback" }, jaccard: 0.5, shared: ["mill", "kienzle"] },
      ],
      cluster: new Map([
        ["a.md", [{ peer: "b.md", peerType: "feedback", jaccard: 0.5, shared: ["mill"] }]],
      ]),
      params: { minJaccard: 0.15, topKKeywords: 20, maxConnections: 200 },
    });
    assert.match(md, /^---\ntitle: "Hermes dream-cycle — 2026-05-27"/);
    assert.match(md, /## Top connections/);
    assert.match(md, /\[\[a\]\] ↔ \[\[b\]\]/);
    assert.match(md, /## Cluster heads/);
    assert.match(md, /U-GALAXY-MS1-B1-HMEMV04/);
    assert.match(md, /connection_count: 1/);
  });

  it("empty connections → 'no connections above threshold' placeholder", () => {
    const md = synthesizeDreamMarkdown({
      date: "2026-05-27",
      totalMemos: 0,
      connections: [],
      cluster: new Map(),
      params: { minJaccard: 0.15, topKKeywords: 20, maxConnections: 200 },
    });
    assert.match(md, /_\(no connections above threshold/);
    assert.match(md, /_\(no cluster heads/);
  });
});

// ───────────── run integration ─────────────

describe("run", () => {
  it("happy path: 3 memos with shared keywords → connections written + summary returned", () => {
    const fs = makeFakeFs({
      "/r/feedback/a.md": "# A\nkienzle mill spindle hsm trochoidal",
      "/r/feedback/b.md": "# B\nkienzle mill spindle hsm trochoidal",
      "/r/reference/c.md": "# C\nquote customer pricing erp payroll",
    });
    const r = run({ root: "/r", fsImpl: fs, date: "2026-05-27", out: "/out/dream.md" });
    assert.equal(r.ok, true);
    assert.equal(r.memo_count, 3);
    assert.ok(r.connection_count >= 1);
    assert.equal(r.date, "2026-05-27");
    const md = fs.readFileSync("/out/dream.md", "utf8");
    assert.match(md, /Hermes dream-cycle/);
    assert.match(md, /\[\[a\]\]/);
  });

  it("zero memos: still writes placeholder digest", () => {
    const fs = makeFakeFs({});
    const r = run({ root: "/r", fsImpl: fs, date: "2026-05-27", out: "/out/empty.md" });
    assert.equal(r.ok, true);
    assert.equal(r.memo_count, 0);
    assert.equal(r.connection_count, 0);
  });

  it("default date uses today's ISO date (YYYY-MM-DD)", () => {
    const fs = makeFakeFs({});
    const now = Date.parse("2026-05-27T15:00:00Z");
    const r = run({ root: "/r", fsImpl: fs, now, out: "/out/x.md" });
    assert.equal(r.date, "2026-05-27");
  });

  it("default output path = {root}/dreams/<date>.md", () => {
    const fs = makeFakeFs({});
    const r = run({ root: "/r", fsImpl: fs, date: "2026-05-27" });
    assert.match(r.path.replace(/\\/g, "/"), /\/r\/dreams\/2026-05-27\.md$/);
  });

  it("writeFileSync failure returns {ok:false, error}", () => {
    const fs = {
      readdirSync() { throw Object.assign(new Error("ENOENT"), { code: "ENOENT" }); },
      mkdirSync() {},
      writeFileSync() { throw new Error("EACCES"); },
    };
    const r = run({ root: "/r", fsImpl: fs, date: "2026-05-27", out: "/out/x.md" });
    assert.equal(r.ok, false);
    assert.match(r.error, /EACCES/);
  });
});

// ----- runGalaxyCascade (U-DREAM-GALAXY-CASCADE) -----

describe("runGalaxyCascade", () => {
  it("happy path: invokes the refresh script and reports ok", () => {
    const calls = [];
    const r = runGalaxyCascade({
      execImpl: (bin, args) => { calls.push({ bin, args }); },
      env: {},
      script: "/x/galaxy-synthesis-refresh.mjs",
      nodeBin: "/node",
    });
    assert.equal(r.ran, true);
    assert.equal(r.ok, true);
    assert.equal(r.exitCode, 0);
    // wired to the refresh script (the L1->L2 cascade host), not something else.
    assert.equal(calls.length, 1);
    assert.equal(calls[0].bin, "/node");
    assert.deepEqual(calls[0].args, ["/x/galaxy-synthesis-refresh.mjs"]);
  });

  it("knob PRISM_DREAM_GALAXY_CASCADE=0 disables (never spawns)", () => {
    let spawned = false;
    const r = runGalaxyCascade({
      execImpl: () => { spawned = true; },
      env: { PRISM_DREAM_GALAXY_CASCADE: "0" },
    });
    assert.equal(r.ran, false);
    assert.equal(r.skipped, "disabled");
    assert.equal(spawned, false);
  });

  it("adversarial: exit-3 (generation DOWN) is BENIGN, not a failure", () => {
    // galaxy-synthesis-refresh exit-3 = stale-but-generation-down -> deferred, benign.
    const r = runGalaxyCascade({
      execImpl: () => { throw Object.assign(new Error("Command failed"), { status: 3 }); },
      env: {},
    });
    assert.equal(r.ran, true);
    assert.equal(r.ok, true);
    assert.equal(r.benign, true);
    assert.equal(r.exitCode, 3);
  });

  it("failure: exit-1 (hard fail) is captured as ok:false but NEVER throws (fail-soft)", () => {
    let logged = "";
    const r = runGalaxyCascade({
      execImpl: () => { throw Object.assign(new Error("most regens failed"), { status: 1 }); },
      env: {},
      logImpl: (m) => { logged += m; },
    });
    assert.equal(r.ran, true);
    assert.equal(r.ok, false);
    assert.equal(r.exitCode, 1);
    assert.match(r.error, /most regens failed/);
    assert.match(logged, /non-fatal/);
  });

  it("adversarial: a thrown non-exit error (e.g. ENOENT) is swallowed -- the dream synth survives", () => {
    // The whole point: a cascade crash must NOT propagate and break the nightly dream synth.
    assert.doesNotThrow(() => {
      const r = runGalaxyCascade({
        execImpl: () => { throw new Error("ENOENT: refresh script missing"); },
        env: {},
      });
      assert.equal(r.ran, true);
      assert.equal(r.ok, false);
      assert.equal(r.exitCode, null);
      assert.match(r.error, /ENOENT/);
    });
  });
});
