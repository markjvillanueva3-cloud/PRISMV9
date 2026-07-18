// scripts/lib/galaxy-memory-watch.test.mjs — U-GCF-COMPACT hermetic test suite (node:test).
// Run: node --test scripts/lib/galaxy-memory-watch.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifySize,
  assessGalaxy,
  buildWatchModel,
  renderWatch,
  measureGalaxies,
  loadCardHealth,
  watch,
  GALAXY_WARN_BYTES,
  GALAXY_CRITICAL_BYTES,
} from "./galaxy-memory-watch.mjs";

// ── classifySize ────────────────────────────────────────────────────────────────
test("classifySize: ok / warn / critical at the per-galaxy budget boundaries", () => {
  assert.equal(classifySize(0), "ok");
  assert.equal(classifySize(GALAXY_WARN_BYTES - 1), "ok");
  assert.equal(classifySize(GALAXY_WARN_BYTES), "warn");
  assert.equal(classifySize(GALAXY_CRITICAL_BYTES - 1), "warn");
  assert.equal(classifySize(GALAXY_CRITICAL_BYTES), "critical");
  assert.equal(classifySize(87177), "critical"); // the real quoting outlier
});

test("classifySize: NaN / negative / non-number → unknown; custom thresholds honored", () => {
  assert.equal(classifySize(NaN), "unknown");
  assert.equal(classifySize(-5), "unknown");
  assert.equal(classifySize("big"), "unknown");
  assert.equal(classifySize(5000, { warnBytes: 4000, criticalBytes: 9000 }), "warn");
});

// ── assessGalaxy (candidacy signal) ──────────────────────────────────────────────
test("assessGalaxy: critical size → candidate with ceiling reason", () => {
  const a = assessGalaxy({ galaxy: "quoting", bytes: 87177 }, { hasDelta: false });
  assert.equal(a.isCandidate, true);
  assert.equal(a.sizeStatus, "critical");
  assert.ok(a.reasons.some((r) => /ceiling/.test(r)));
  assert.ok(a.reasons.some((r) => /no domain delta/.test(r)));
});

test("assessGalaxy: ok size + has-delta → NOT a candidate", () => {
  const a = assessGalaxy({ galaxy: "ai-training", bytes: 4746 }, { hasDelta: true });
  assert.equal(a.isCandidate, false);
  assert.equal(a.reasons.length, 0);
});

test("assessGalaxy: ok size + NO delta → candidate (the post-processor case)", () => {
  const a = assessGalaxy({ galaxy: "post-processor", bytes: 8106 }, { hasDelta: false });
  assert.equal(a.isCandidate, true);
  assert.equal(a.sizeStatus, "ok");
  assert.deepEqual(a.reasons, ["card has no domain delta (verbose brain ate the 1KB card budget)"]);
});

// FAIL-ON-REVERT: a 1KB card being TRUNCATED is its normal mode — truncation must NEVER flag candidacy.
// (The first cut used cardTruncated → 32/34 false candidates. This guards the regression.)
test("assessGalaxy: truncation is NOT a candidacy signal — only size/no-delta are", () => {
  // even if a caller passes a (now-ignored) truncated flag, an ok-size has-delta galaxy stays clean
  const a = assessGalaxy({ galaxy: "g", bytes: 5000 }, { hasDelta: true, truncated: true });
  assert.equal(a.isCandidate, false, "truncated-but-has-delta must NOT be a compaction candidate");
});

test("assessGalaxy: no digest data (hasDelta undefined) → no-delta NOT inferred", () => {
  const a = assessGalaxy({ galaxy: "g", bytes: 3000 }, {}); // size ok, no health → clean
  assert.equal(a.cardNoDelta, false);
  assert.equal(a.isCandidate, false);
});

// ── buildWatchModel ───────────────────────────────────────────────────────────
test("buildWatchModel: ranks candidates by severity then bytes desc; worst aggregated", () => {
  const galaxies = [
    { galaxy: "quoting", bytes: 87177 },   // critical
    { galaxy: "post-processor", bytes: 8106 }, // ok size, no-delta
    { galaxy: "fleet-hygiene", bytes: 11588 }, // ok size, has-delta → not candidate
    { galaxy: "big-warn", bytes: 13000 },   // warn
  ];
  const health = { quoting: { hasDelta: false }, "post-processor": { hasDelta: false }, "fleet-hygiene": { hasDelta: true }, "big-warn": { hasDelta: true } };
  const m = buildWatchModel({ galaxies, health });
  assert.equal(m.galaxyCount, 4);
  assert.equal(m.worst, "critical");
  assert.equal(m.candidateCount, 3); // quoting, big-warn, post-processor (fleet-hygiene clean)
  assert.deepEqual(m.candidates.map((c) => c.galaxy), ["quoting", "big-warn", "post-processor"]);
  // all[] sorted by bytes desc
  assert.deepEqual(m.all.map((c) => c.galaxy), ["quoting", "big-warn", "fleet-hygiene", "post-processor"]);
});

test("buildWatchModel: all-healthy → worst ok, zero candidates", () => {
  const m = buildWatchModel({ galaxies: [{ galaxy: "a", bytes: 1000 }, { galaxy: "b", bytes: 2000 }], health: { a: { hasDelta: true }, b: { hasDelta: true } } });
  assert.equal(m.worst, "ok");
  assert.equal(m.candidateCount, 0);
});

test("buildWatchModel: non-array galaxies → fail-soft empty", () => {
  const m = buildWatchModel({ galaxies: null });
  assert.equal(m.galaxyCount, 0);
  assert.equal(m.candidateCount, 0);
});

// ── renderWatch ─────────────────────────────────────────────────────────────────
test("renderWatch: lists ranked candidates + escapes pipes; empty → 'None' message", () => {
  const m = buildWatchModel({ galaxies: [{ galaxy: "quoting", bytes: 87177 }], health: { quoting: { hasDelta: false } } });
  const md = renderWatch(m, { generatedAt: "2026-05-31T00:00:00.000Z" });
  assert.ok(md.includes("🔴 CRITICAL"));
  assert.ok(md.includes("quoting"));
  assert.ok(md.includes("| galaxy | bytes | size | card | why |"));
  const empty = renderWatch(buildWatchModel({ galaxies: [{ galaxy: "a", bytes: 100 }], health: { a: { hasDelta: true } } }), {});
  assert.ok(/None/.test(empty));
});

// ── measureGalaxies (hermetic) ──────────────────────────────────────────────────
test("measureGalaxies: injected readdir/stat; skips dirs without MEMORY.md; fail-soft", () => {
  const dirs = [
    { name: "alpha", isDirectory: () => true },
    { name: "no-mem", isDirectory: () => true },
    { name: "file.ts", isDirectory: () => false },
  ];
  const sizes = { "alpha/MEMORY.md": 4000 };
  const rows = measureGalaxies({
    enginesDir: "/eng",
    readdirImpl: () => dirs,
    statImpl: (f) => { const key = f.replace(/\\/g, "/").replace("/eng/", ""); if (key in sizes) return { size: sizes[key] }; throw new Error("ENOENT"); },
  });
  assert.deepEqual(rows, [{ galaxy: "alpha", bytes: 4000 }]); // no-mem skipped, file.ts not a dir
});

test("measureGalaxies: readdir throws → [] (fail-soft, never throws)", () => {
  assert.deepEqual(measureGalaxies({ enginesDir: "/x", readdirImpl: () => { throw new Error("boom"); } }), []);
});

// ── loadCardHealth (fail-soft merge) ─────────────────────────────────────────────
test("loadCardHealth: merges INDEX salience + DIGEST hasDelta", () => {
  const files = {
    "/idx": JSON.stringify({ cards: [{ galaxy: "q", salience: 7.6 }, { galaxy: "t", salience: 4 }] }),
    "/dig": JSON.stringify({ ranked: [{ galaxy: "q", topFact: null }, { galaxy: "t", topFact: "real fact" }] }),
  };
  const h = loadCardHealth({ readImpl: (f) => files[f] ?? null, indexPath: "/idx", digestJsonPath: "/dig" });
  assert.equal(h.q.salience, 7.6);
  assert.equal(h.q.hasDelta, false); // topFact null → no delta
  assert.equal(h.t.hasDelta, true);
});

test("loadCardHealth: missing/garbage files → fail-soft empty-ish (size-only)", () => {
  assert.deepEqual(loadCardHealth({ readImpl: () => null }), {});
  assert.deepEqual(loadCardHealth({ readImpl: () => "{bad json" }), {});
});

// ── watch orchestrator (hermetic) ────────────────────────────────────────────────
function hermeticWatch(extra = {}) {
  const writes = {};
  const appends = {};
  const dirs = [{ name: "quoting", isDirectory: () => true }, { name: "ai-training", isDirectory: () => true }];
  const sizes = { "quoting/MEMORY.md": 87177, "ai-training/MEMORY.md": 4746 };
  const files = {
    "/idx": JSON.stringify({ cards: [{ galaxy: "quoting", salience: 7.6 }, { galaxy: "ai-training", salience: 5 }] }),
    "/dig": JSON.stringify({ ranked: [{ galaxy: "quoting", topFact: null }, { galaxy: "ai-training", topFact: "x" }] }),
  };
  const res = watch({
    roots: { enginesDir: "/eng", cardsDir: "/cards" },
    watchMdPath: "/cards/MEMORY-WATCH.md",
    watchJsonPath: "/cards/MEMORY-WATCH.json",
    historyPath: "/hist.jsonl",
    indexPath: "/idx",
    digestJsonPath: "/dig",
    readdirImpl: () => dirs,
    statImpl: (f) => { const k = f.replace(/\\/g, "/").replace("/eng/", ""); if (k in sizes) return { size: sizes[k] }; throw new Error("ENOENT"); },
    readImpl: (f) => files[f] ?? null,
    writeImpl: (f, d) => { writes[f] = d; },
    appendImpl: (f, d) => { appends[f] = (appends[f] || "") + d; },
    now: () => 1735689600000,
    ...extra,
  });
  return { res, writes, appends };
}

test("watch: writes MEMORY-WATCH.{md,json}, exitCode 1 (candidates present), quoting critical", () => {
  const { res, writes, appends } = hermeticWatch();
  assert.equal(res.ok, true);
  assert.equal(res.written, true);
  assert.equal(res.worst, "critical");
  assert.equal(res.candidateCount, 1); // quoting (critical+no-delta); ai-training clean
  assert.equal(res.exitCode, 1);
  assert.ok(writes["/cards/MEMORY-WATCH.md"]);
  const json = JSON.parse(writes["/cards/MEMORY-WATCH.json"]);
  assert.equal(json.schemaVersion, "1.0.0");
  assert.equal(json.candidates[0].galaxy, "quoting");
  assert.ok(appends["/hist.jsonl"]); // history appended
});

test("watch: SINGLE-WRITER GUARD — never writes a galaxy MEMORY.md nor INDEX.json", () => {
  const { writes } = hermeticWatch();
  for (const p of Object.keys(writes)) {
    assert.ok(!/MEMORY\.md$/i.test(p), `must not write a MEMORY.md — wrote ${p}`);
    assert.ok(!/INDEX\.json$/i.test(p), `must not write INDEX.json — wrote ${p}`);
  }
  assert.deepEqual(Object.keys(writes).sort(), ["/cards/MEMORY-WATCH.json", "/cards/MEMORY-WATCH.md"]);
});

test("watch: all-healthy fleet → exitCode 0", () => {
  const { res } = hermeticWatch({
    statImpl: (f) => { const k = f.replace(/\\/g, "/").replace("/eng/", ""); const s = { "quoting/MEMORY.md": 3000, "ai-training/MEMORY.md": 2000 }; if (k in s) return { size: s[k] }; throw new Error("ENOENT"); },
    readImpl: (f) => ({ "/idx": JSON.stringify({ cards: [] }), "/dig": JSON.stringify({ ranked: [{ galaxy: "quoting", topFact: "y" }, { galaxy: "ai-training", topFact: "z" }] }) }[f] ?? null),
  });
  assert.equal(res.worst, "ok");
  assert.equal(res.candidateCount, 0);
  assert.equal(res.exitCode, 0);
});

test("watch: no galaxies → exitCode 2 reason no-galaxies", () => {
  const res = watch({ roots: { enginesDir: "/eng" }, readdirImpl: () => [], statImpl: () => ({ size: 0 }) });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "no-galaxies");
  assert.equal(res.exitCode, 2);
});

test("watch: disabled knob → no-op exit 0", () => {
  const prev = process.env.PRISM_GCF_COMPACT_DISABLE;
  process.env.PRISM_GCF_COMPACT_DISABLE = "1";
  try {
    const { res, writes } = hermeticWatch({ writeImpl: () => { throw new Error("must not write"); } });
    assert.equal(res.disabled, true);
    assert.equal(res.exitCode, 0);
    assert.deepEqual(Object.keys(writes), []);
  } finally {
    if (prev === undefined) delete process.env.PRISM_GCF_COMPACT_DISABLE; else process.env.PRISM_GCF_COMPACT_DISABLE = prev;
  }
});

test("watch: write-error is fail-soft (exit 2, never throws)", () => {
  const res = hermeticWatch({ writeImpl: () => { throw new Error("disk full"); } }).res;
  assert.equal(res.ok, false);
  assert.equal(res.reason, "write-error");
  assert.equal(res.exitCode, 2);
});

test("watch: null / non-object opts never throws (HERMETIC — disable knob = zero real IO)", () => {
  // The type-guard coerces null/non-object → {}; verify under the disable knob so the early return fires
  // BEFORE any fs write (a bare watch(null) would fall through to real fs — that must never be a test's IO).
  const prev = process.env.PRISM_GCF_COMPACT_DISABLE;
  process.env.PRISM_GCF_COMPACT_DISABLE = "1";
  try {
    for (const bad of [null, "nope", 42, undefined]) {
      let r;
      assert.doesNotThrow(() => { r = watch(bad); });
      assert.equal(r.disabled, true); // coerced to {}, disable branch returned before touching the filesystem
    }
  } finally {
    if (prev === undefined) delete process.env.PRISM_GCF_COMPACT_DISABLE; else process.env.PRISM_GCF_COMPACT_DISABLE = prev;
  }
});

test("watch: garbage option FIELDS tolerated hermetically (fully-injected no-op IO, no throw)", () => {
  let r;
  assert.doesNotThrow(() => {
    r = watch({
      roots: { enginesDir: "/eng", cardsDir: "/c" },
      readdirImpl: () => [{ name: "g", isDirectory: () => true }],
      statImpl: () => ({ size: 5000 }),
      readImpl: () => null,            // no INDEX/DIGEST → size-only
      writeImpl: () => {}, appendImpl: () => {}, // NO real IO
      warnBytes: "bad", criticalBytes: null, now: "notfn", // garbage fields → fall back to defaults
    });
  });
  assert.equal(r.ok, true);            // garbage thresholds fell back to defaults; 5000B = ok
  assert.equal(r.candidateCount, 0);
});

// ── LIVE soft integration ────────────────────────────────────────────────────────
test("LIVE: real fleet run flags quoting as a critical compaction candidate", () => {
  const res = watch({ writeImpl: () => {}, appendImpl: () => {} }); // don't touch real sidecars/history
  if (!res.ok && res.reason === "no-galaxies") { console.log("  (skipped — no live engines dir)"); return; }
  assert.equal(res.ok, true);
  assert.ok(res.galaxyCount >= 1);
  // quoting (87 KB) must be present as a critical candidate on the live fleet
  if (res.candidates.length) {
    const q = res.candidates.find((c) => c.galaxy === "quoting");
    if (q) assert.equal(q.sizeStatus, "critical");
  }
});
