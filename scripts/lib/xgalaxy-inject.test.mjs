// scripts/lib/xgalaxy-inject.test.mjs — U-GCF-XGALAXY-INJECT (GALAXY-CONTEXT-FEDERATION-MS0).
// Hermetic node:test. Run: node --test scripts/lib/xgalaxy-inject.test.mjs
//
// Coverage: pure scorers (parseCardRole/scoreCard/selectCrossGalaxyCards/renderXGalaxyInject),
// I/O (loadCardsFromIndex via injected + real fs), orchestrator (every reason branch + knobs +
// throw-path), and 2 CLI subprocess oracles. Real-value assertions + fail-on-revert guards.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  parseCardRole,
  scoreCard,
  selectCrossGalaxyCards,
  renderXGalaxyInject,
  loadCardsFromIndex,
  maybeInjectCrossGalaxy,
  DEFAULT_K,
  DEFAULT_THRESHOLD,
  DEFAULT_MAX_BYTES,
} from "./xgalaxy-inject.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "..", "xgalaxy-inject.mjs");

// Synthetic card corpus (deterministic, no real-FS dependency for pure tests).
const CARDS = [
  { galaxy: "token-optimization", text: "## token-optimization — Token Optimization And Efficiency\n- rtk ollama cache context budget routing" },
  { galaxy: "database-expansion", text: "## database-expansion — Persistence Stores\n- qdrant sqlite jsonl persistence atomic-write schema migration versioning" },
  { galaxy: "discovery", text: "## discovery — Discovery And Anti-Duplication\n- duplication guard master-index orphan coverage audit search" },
  { galaxy: "mill", text: "## mill — Milling Wizard\n- kienzle taylor cutting force spindle vmc deflection" },
];

// ── parseCardRole ──────────────────────────────────────────────────────────────
test("parseCardRole — extracts role after em-dash header", () => {
  assert.equal(parseCardRole("## database-expansion — Persistence Stores\n- x"), "Persistence Stores");
});
test("parseCardRole — hyphen and en-dash separators both work", () => {
  assert.equal(parseCardRole("## g - Role Hyphen"), "Role Hyphen");
  assert.equal(parseCardRole("## g – Role EnDash"), "Role EnDash");
});
test("parseCardRole — header with no separator → empty", () => {
  assert.equal(parseCardRole("## just-a-galaxy\n- fact"), "");
});
test("parseCardRole — empty / null / non-string → empty", () => {
  assert.equal(parseCardRole(""), "");
  assert.equal(parseCardRole(null), "");
  assert.equal(parseCardRole(undefined), "");
  assert.equal(parseCardRole(42), "");
});

// ── scoreCard ───────────────────────────────────────────────────────────────────
test("scoreCard — full overlap → similarity 1.0", () => {
  const r = scoreCard(["qdrant", "schema", "migration"], CARDS[1].text);
  assert.equal(r.matched, 3);
  assert.equal(r.similarity, 1);
});
test("scoreCard — role-line hit weighs ROLE_BOOST× a body hit", () => {
  // role = "Persistence Stores" → role token "persistence"; body has "qdrant" (not in role).
  // "persistence" hits the role line → +2; "qdrant" hits body only → +1; total score 3, matched 2.
  const r = scoreCard(["persistence", "qdrant"], CARDS[1].text);
  assert.equal(r.matched, 2);
  assert.equal(r.score, 3); // 2 (role) + 1 (body)
});
test("scoreCard — no overlap → zero", () => {
  const r = scoreCard(["nonexistenttokenxyz"], CARDS[1].text);
  assert.equal(r.matched, 0);
  assert.equal(r.similarity, 0);
  assert.equal(r.score, 0);
});
test("scoreCard — empty query tokens → zero (no divide-by-zero)", () => {
  const r = scoreCard([], CARDS[1].text);
  assert.equal(r.similarity, 0);
  assert.equal(r.matched, 0);
});
test("scoreCard — partial overlap → fractional similarity", () => {
  const r = scoreCard(["qdrant", "kienzle"], CARDS[1].text); // only qdrant hits db card
  assert.equal(r.matched, 1);
  assert.equal(r.similarity, 0.5);
});

// ── selectCrossGalaxyCards ───────────────────────────────────────────────────────
test("select — ranks by score, excludes self", () => {
  const sel = selectCrossGalaxyCards({
    query: "qdrant schema migration persistence",
    selfGalaxy: "token-optimization",
    cards: CARDS,
  });
  assert.ok(sel.length >= 1);
  assert.equal(sel[0].galaxy, "database-expansion");
  assert.ok(sel.every((s) => s.galaxy !== "token-optimization"), "self must be excluded");
});
test("select — empty query → [] (NEVER broadcast)", () => {
  assert.deepEqual(selectCrossGalaxyCards({ query: "", cards: CARDS }), []);
});
test("select — all-stopword query → [] (no signal, never broadcast)", () => {
  assert.deepEqual(selectCrossGalaxyCards({ query: "the a of to is", cards: CARDS }), []);
});
test("select — no cards → []", () => {
  assert.deepEqual(selectCrossGalaxyCards({ query: "qdrant", cards: [] }), []);
});
test("select — threshold floor filters weak matches", () => {
  // a query where most tokens miss → similarity below a high threshold → excluded
  const sel = selectCrossGalaxyCards({
    query: "qdrant zzzaaa bbbccc dddeee",
    cards: CARDS,
    threshold: 0.5, // need ≥2 of 4 tokens; only qdrant hits db → 0.25 < 0.5
  });
  assert.equal(sel.length, 0);
});
test("select — top-K caps result count", () => {
  const sel = selectCrossGalaxyCards({
    query: "qdrant schema duplication guard cutting force migration audit",
    cards: CARDS,
    k: 1,
    threshold: 0, // accept any matched>0
  });
  assert.equal(sel.length, 1);
});
test("select — malformed card entries are skipped, not fatal", () => {
  const dirty = [null, { galaxy: "x" }, { text: "no galaxy" }, ...CARDS];
  const sel = selectCrossGalaxyCards({ query: "qdrant schema migration", cards: dirty, threshold: 0 });
  assert.ok(sel.length >= 1);
  assert.ok(sel.every((s) => typeof s.galaxy === "string" && typeof s.text === "string"));
});
test("select — tie-break is deterministic by galaxy name", () => {
  const tied = [
    { galaxy: "zeta", text: "## zeta — Z\n- alpha beta" },
    { galaxy: "alpha2", text: "## alpha2 — A\n- alpha beta" },
  ];
  const sel = selectCrossGalaxyCards({ query: "alpha beta", cards: tied, threshold: 0 });
  assert.equal(sel.length, 2);
  assert.equal(sel[0].galaxy, "alpha2"); // equal score+similarity → localeCompare asc
});
test("select — selfGalaxy unknown (empty) excludes nothing", () => {
  const sel = selectCrossGalaxyCards({ query: "rtk ollama cache", selfGalaxy: "", cards: CARDS, threshold: 0 });
  assert.ok(sel.some((s) => s.galaxy === "token-optimization"), "no self → token-optimization eligible");
});

// ── renderXGalaxyInject ──────────────────────────────────────────────────────────
test("render — empty selection → empty block", () => {
  const r = renderXGalaxyInject([]);
  assert.equal(r.text, "");
  assert.equal(r.count, 0);
  assert.equal(r.truncated, false);
});
test("render — single card includes header + disable knob mention", () => {
  const r = renderXGalaxyInject([{ galaxy: "database-expansion", text: CARDS[1].text }]);
  assert.equal(r.count, 1);
  assert.match(r.text, /Cross-galaxy context/);
  assert.match(r.text, /PRISM_GCF_XGALAXY_DISABLE/);
  assert.match(r.text, /database-expansion/);
});
test("render — byte cap stops adding cards (honest truncated flag)", () => {
  const big = [
    { galaxy: "a", text: "## a — A\n" + "x".repeat(900) },
    { galaxy: "b", text: "## b — B\n" + "y".repeat(900) },
    { galaxy: "c", text: "## c — C\n" + "z".repeat(900) },
  ];
  const r = renderXGalaxyInject(big, { maxBytes: 1200 }); // header+1 card fits, 2nd overflows
  assert.equal(r.count, 1);
  assert.equal(r.truncated, true);
  assert.ok(r.bytes <= 1200, `bytes ${r.bytes} must respect cap`);
});
test("render — never exceeds maxBytes even when first card overflows", () => {
  const huge = [{ galaxy: "a", text: "## a — A\n" + "x".repeat(5000) }];
  const r = renderXGalaxyInject(huge, { maxBytes: 300 });
  assert.ok(r.bytes <= 300, `bytes ${r.bytes} must respect cap`);
  assert.equal(r.truncated, true);
});

// ── loadCardsFromIndex (injected readImpl) ───────────────────────────────────────
test("loadCardsFromIndex — reads index + cards via injected readImpl", () => {
  const files = {
    "/idx.json": JSON.stringify({ cards: [{ galaxy: "g1", path: "/g1.md" }, { galaxy: "g2", path: "/g2.md" }] }),
    "/g1.md": "## g1 — One\n- fact",
    "/g2.md": "## g2 — Two\n- fact",
  };
  const got = loadCardsFromIndex({ indexPath: "/idx.json", readImpl: (f) => files[f] ?? null });
  assert.equal(got.length, 2);
  assert.deepEqual(got.map((c) => c.galaxy), ["g1", "g2"]);
});
test("loadCardsFromIndex — unreadable index → []", () => {
  assert.deepEqual(loadCardsFromIndex({ indexPath: "/missing.json", readImpl: () => null }), []);
});
test("loadCardsFromIndex — garbage JSON → []", () => {
  assert.deepEqual(loadCardsFromIndex({ indexPath: "/x", readImpl: () => "{not json" }), []);
});
test("loadCardsFromIndex — index without cards[] array → []", () => {
  assert.deepEqual(loadCardsFromIndex({ indexPath: "/x", readImpl: () => JSON.stringify({ count: 0 }) }), []);
});
test("loadCardsFromIndex — a single missing card file is skipped, not fatal", () => {
  const files = { "/idx.json": JSON.stringify({ cards: [{ galaxy: "g1", path: "/g1.md" }, { galaxy: "g2", path: "/gone.md" }] }), "/g1.md": "## g1 — One\n- f" };
  const got = loadCardsFromIndex({ indexPath: "/idx.json", readImpl: (f) => files[f] ?? null });
  assert.equal(got.length, 1);
  assert.equal(got[0].galaxy, "g1");
});

// ── loadCardsFromIndex (REAL fs round-trip) ──────────────────────────────────────
test("loadCardsFromIndex — real-fs e2e round-trip", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xgcf-"));
  try {
    const c1 = path.join(dir, "db.card.md");
    const c2 = path.join(dir, "disc.card.md");
    fs.writeFileSync(c1, "## database-expansion — Persistence\n- qdrant schema migration");
    fs.writeFileSync(c2, "## discovery — Discovery\n- duplication guard search");
    const idx = path.join(dir, "INDEX.json");
    fs.writeFileSync(idx, JSON.stringify({ cards: [{ galaxy: "database-expansion", path: c1 }, { galaxy: "discovery", path: c2 }] }));
    const got = loadCardsFromIndex({ indexPath: idx }); // DEFAULT real-fs readImpl
    assert.equal(got.length, 2);
    // and the whole pipeline end-to-end off the real index
    const res = maybeInjectCrossGalaxy({ query: "qdrant schema migration", galaxy: "token-optimization", indexPath: idx });
    assert.equal(res.reason, "injected");
    assert.equal(res.selected[0].galaxy, "database-expansion");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── maybeInjectCrossGalaxy (orchestrator + knobs + throw-path) ────────────────────
test("maybeInject — disabled knob → no-op", () => {
  process.env.PRISM_GCF_XGALAXY_DISABLE = "1";
  try {
    const r = maybeInjectCrossGalaxy({ query: "qdrant", cards: CARDS });
    assert.equal(r.reason, "disabled");
    assert.equal(r.injected, false);
  } finally { delete process.env.PRISM_GCF_XGALAXY_DISABLE; }
});
test("maybeInject — empty query → empty-query reason", () => {
  assert.equal(maybeInjectCrossGalaxy({ query: "   ", cards: CARDS }).reason, "empty-query");
});
test("maybeInject — null / no-arg call is graceful empty-query, never throws (opts guard)", () => {
  assert.equal(maybeInjectCrossGalaxy(null).reason, "empty-query");
  assert.equal(maybeInjectCrossGalaxy().reason, "empty-query");
  assert.equal(maybeInjectCrossGalaxy(42).reason, "empty-query");
});
test("maybeInject — no cards → no-cards reason", () => {
  assert.equal(maybeInjectCrossGalaxy({ query: "qdrant", cards: [] }).reason, "no-cards");
});
test("maybeInject — query with no match → no-match reason", () => {
  assert.equal(maybeInjectCrossGalaxy({ query: "zzzznotatokenanywhere", cards: CARDS }).reason, "no-match");
});
test("maybeInject — happy path injects + excludes self", () => {
  const r = maybeInjectCrossGalaxy({ query: "qdrant schema migration", galaxy: "token-optimization", cards: CARDS });
  assert.equal(r.reason, "injected");
  assert.ok(r.injected);
  assert.ok(r.text.includes("database-expansion"));
  assert.ok(r.selected.every((s) => s.galaxy !== "token-optimization"));
});
test("maybeInject — slot resolves to galaxy via galaxyForSlot (alpha→token-optimization, excluded)", () => {
  // alpha→token-optimization. A query that would hit token-optimization's card must NOT return it.
  const r = maybeInjectCrossGalaxy({ query: "rtk ollama cache qdrant schema", slot: "alpha", cards: CARDS });
  assert.equal(r.galaxy, "token-optimization");
  assert.ok(r.selected.every((s) => s.galaxy !== "token-optimization"), "alpha's own galaxy excluded");
});
test("maybeInject — env K + THRESHOLD overrides honored at call-time", () => {
  process.env.PRISM_GCF_XGALAXY_K = "1";
  process.env.PRISM_GCF_XGALAXY_THRESHOLD = "0";
  try {
    const r = maybeInjectCrossGalaxy({ query: "qdrant duplication kienzle", cards: CARDS });
    assert.equal(r.count, 1, "K=1 caps to one card");
  } finally {
    delete process.env.PRISM_GCF_XGALAXY_K;
    delete process.env.PRISM_GCF_XGALAXY_THRESHOLD;
  }
});
test("maybeInject — explicit opts.k/threshold beat env", () => {
  process.env.PRISM_GCF_XGALAXY_K = "1";
  try {
    const r = maybeInjectCrossGalaxy({ query: "qdrant duplication kienzle migration guard force", cards: CARDS, k: 3, threshold: 0 });
    assert.ok(r.count >= 2, "explicit k=3 overrides env K=1");
  } finally { delete process.env.PRISM_GCF_XGALAXY_K; }
});
test("maybeInject — internal throw is caught → error reason (fail-soft, never throws)", () => {
  const badCard = { galaxy: "x", get text() { throw new Error("boom"); } };
  const r = maybeInjectCrossGalaxy({ query: "qdrant", cards: [badCard] });
  assert.equal(r.reason, "error");
  assert.equal(r.injected, false);
  assert.match(r.error, /boom/);
});
test("maybeInject — defaults are the documented constants", () => {
  assert.equal(DEFAULT_K, 3);
  assert.equal(DEFAULT_THRESHOLD, 0.15);
  assert.equal(DEFAULT_MAX_BYTES, 3584);
});

// ── CLI subprocess oracles ───────────────────────────────────────────────────────
test("CLI — --json against a temp index emits parseable JSON, exit 0", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xgcf-cli-"));
  try {
    const c1 = path.join(dir, "db.card.md");
    fs.writeFileSync(c1, "## database-expansion — Persistence\n- qdrant schema migration versioning");
    const idx = path.join(dir, "INDEX.json");
    fs.writeFileSync(idx, JSON.stringify({ cards: [{ galaxy: "database-expansion", path: c1 }] }));
    const out = execFileSync(process.execPath, [CLI, "--json", "--galaxy", "token-optimization", "--query", "qdrant schema migration", "--index", idx], { encoding: "utf8" });
    const parsed = JSON.parse(out.trim());
    assert.equal(parsed.reason, "injected");
    assert.equal(parsed.selected[0].galaxy, "database-expansion");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test("CLI — DISABLE knob → reason disabled, exit 0", () => {
  const out = execFileSync(process.execPath, [CLI, "--json", "--query", "qdrant"], {
    encoding: "utf8",
    env: { ...process.env, PRISM_GCF_XGALAXY_DISABLE: "1" },
  });
  assert.equal(JSON.parse(out.trim()).reason, "disabled");
});
