// scripts/lib/galaxy-rollup.test.mjs — U-GCF-ROLLUP hermetic test suite (node:test).
// Run: node --test scripts/lib/galaxy-rollup.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  extractTopFact,
  compactFact,
  rankGalaxies,
  loadIndex,
  buildDigestModel,
  renderDigest,
  rollup,
  DEFAULT_INDEX_PATH,
  DEFAULT_MAX_BYTES,
} from "./galaxy-rollup.mjs";

// ── fixtures ────────────────────────────────────────────────────────────────────
// A realistic card: header → 4-axis master-brain boilerplate → numbered domain facts (mirrors a real
// salience-ON card, e.g. token-optimization.card.md).
const CARD_TOKEN = [
  "## token-optimization — Token Optimization + Efficiency Hunting + Obsidian",
  "- > First compliant exemplar of `MASTER-BRAIN-TEMPLATE.md`.",
  "- **UP (pull from master):** `MEMORY.md` — recall: `prism_memory:semantic_search query=\"token\"`",
  "- **DOWN (push to master):** write `<type>_alpha_<topic>.md`",
  "- **MASTER-INDEX edge:** master `MEMORY.md` carries `[galaxy:token-optimization]`",
  "- **Last master-sync:** 2026-05-28",
  "1. **Token economy** — gate expensive ops on TokenAwarenessEngine zone (GREEN/YELLOW/RED).",
  "2. **Efficiency hunting** — route before grep; ollama before claude.",
  "**Paths:** mcp-server/src/engines/token-optimization/MEMORY.md",
].join("\n");

// A backfilled card using the SHORTER link wording ("UP (pull):") + a `-` bulleted first fact.
const CARD_BACKFILLED = [
  "## tango — Algorithm / Engine / Pipeline Discovery",
  "- **UP (pull):** `MEMORY.md` — recall: `prism_memory:semantic_search query=\"tango\"`",
  "- **DOWN (push):** write `<type>_tango_<topic>.md`",
  "- **MASTER-INDEX edge:** master `MEMORY.md` carries `[galaxy:tango]` (wired 2026-05-29)",
  "- **Last master-sync:** 2026-05-29",
  "- **Discovery** — DuplicationGuard THROWS on dup; master-index search-first before Grep.",
].join("\n");

const CARD_ONLY_BOILERPLATE = [
  "## empty-galaxy — Nothing Yet",
  "- **UP (pull):** recall",
  "- **DOWN (push):** push",
  "- **Last master-sync:** 2026-05-29",
].join("\n");

// ── extractTopFact ────────────────────────────────────────────────────────────
test("extractTopFact: skips all master-brain boilerplate, returns first domain fact (numbered)", () => {
  assert.equal(
    extractTopFact(CARD_TOKEN),
    "**Token economy** — gate expensive ops on TokenAwarenessEngine zone (GREEN/YELLOW/RED).",
  );
});

test("extractTopFact: handles the SHORTER 'UP (pull):' wording + `-` bulleted fact", () => {
  assert.equal(
    extractTopFact(CARD_BACKFILLED),
    "**Discovery** — DuplicationGuard THROWS on dup; master-index search-first before Grep.",
  );
});

test("extractTopFact: card with only header + boilerplate → null (honest, no delta)", () => {
  assert.equal(extractTopFact(CARD_ONLY_BOILERPLATE), null);
});

test("extractTopFact: strips a leading ordered marker (regression — '1. ' must not leak)", () => {
  const fact = extractTopFact("## g — r\n5. real fact here");
  assert.equal(fact, "real fact here"); // FAIL-ON-REVERT: a regex that forgot \d+\. would yield "5. real fact here"
});

test("extractTopFact: skips pre-header preamble lines", () => {
  assert.equal(extractTopFact("preamble noise\nmore noise\n## g — r\n- the fact"), "the fact");
});

test("extractTopFact: empty / null / whitespace / header-only → null", () => {
  assert.equal(extractTopFact(""), null);
  assert.equal(extractTopFact(null), null);
  assert.equal(extractTopFact("   \n  \n"), null);
  assert.equal(extractTopFact("## g — r"), null);
});

// FAIL-ON-REVERT: the real quoting-card bug — the UP/DOWN bullets WRAP onto continuation lines
// ("- — recall: …", "- `C:/…/` → fed to …") that a per-line prefix match misses. The block ends at
// "Last master-sync", so the delta is the first fact AFTER it — never the wrapped fragment.
const CARD_WRAPPED = [
  "## quoting — per-domain working brain",
  "- > Cloned from `MASTER-BRAIN-TEMPLATE.md`.",
  "- **UP (pull from master):** `MEMORY.md`",
  "- — recall: `prism_memory:semantic_search query=\"quote pricing\"`",
  "- **DOWN (push to master):** write `<type>_charlie_<topic>.md` →",
  "- `C:/Users/.../memory/` → fed to `knowledge/memories/`",
  "- **MASTER-INDEX edge:** master `MEMORY.md` carries `[galaxy:quoting]`",
  "- **Last master-sync:** 2026-05-28",
  "1. **Margin math** — apply DocuStrata pricing tiers per process.",
].join("\n");

test("extractTopFact: wrapped link bullets — returns the fact AFTER 'Last master-sync', not '— recall:'", () => {
  const fact = extractTopFact(CARD_WRAPPED);
  assert.equal(fact, "**Margin math** — apply DocuStrata pricing tiers per process.");
  assert.ok(!/recall:/.test(fact), "must NOT leak the wrapped UP-recall continuation");
  assert.ok(!/fed to/.test(fact), "must NOT leak the wrapped DOWN-path continuation");
});

test("extractTopFact: wrapped block that truncates before any domain fact → null (honest no-delta)", () => {
  const truncated = CARD_WRAPPED.split("\n").slice(0, 8).join("\n") + "\n…[card truncated]";
  assert.equal(extractTopFact(truncated), null); // the real quoting/post-processor case
});

test("extractTopFact: fallback path (no master-sync) skips a bare continuation fragment", () => {
  // a malformed card with no "Last master-sync" line — fallback must still skip the "— recall:" fragment
  assert.equal(extractTopFact("## g — r\n- — recall: noise\n- **Real** — the fact"), "**Real** — the fact");
});

// ── compactFact ─────────────────────────────────────────────────────────────────
test("compactFact: collapses whitespace, escapes table pipes", () => {
  assert.equal(compactFact("a   b\nc\t| d"), "a b c \\| d");
});

test("compactFact: caps length at a word boundary with an ellipsis", () => {
  const long = "word ".repeat(60).trim(); // ~300 chars
  const out = compactFact(long, 40);
  assert.ok(out.length <= 40, `len ${out.length}`);
  assert.ok(out.endsWith("…"));
  assert.ok(!out.includes("  "));
});

test("compactFact: empty / non-string → ''", () => {
  assert.equal(compactFact(""), "");
  assert.equal(compactFact(null), "");
  assert.equal(compactFact(42), "");
});

// ── rankGalaxies ──────────────────────────────────────────────────────────────
test("rankGalaxies: sorts by salience desc, ties broken by galaxy name asc", () => {
  const r = rankGalaxies([
    { galaxy: "b", salience: 5 },
    { galaxy: "a", salience: 9 },
    { galaxy: "d", salience: 5 },
    { galaxy: "c", salience: 5 },
  ]);
  assert.deepEqual(r.map((x) => x.galaxy), ["a", "b", "c", "d"]);
});

test("rankGalaxies: cards missing finite salience sort LAST but are KEPT (complete digest)", () => {
  const r = rankGalaxies([
    { galaxy: "has", salience: 3 },
    { galaxy: "none" },
    { galaxy: "nan", salience: NaN },
  ]);
  assert.equal(r.length, 3);
  assert.equal(r[0].galaxy, "has");
  assert.deepEqual(r.slice(1).map((x) => x.galaxy).sort(), ["nan", "none"]);
});

test("rankGalaxies: non-array / entries without galaxy → fail-soft filter", () => {
  assert.deepEqual(rankGalaxies(null), []);
  assert.deepEqual(rankGalaxies("nope"), []);
  assert.deepEqual(rankGalaxies([{ salience: 1 }, null, { galaxy: 5 }]), []);
});

// ── loadIndex ─────────────────────────────────────────────────────────────────
test("loadIndex: fail-soft on null / garbage / non-object / missing-cards", () => {
  assert.deepEqual(loadIndex({ readImpl: () => null }), { cards: [] });
  assert.deepEqual(loadIndex({ readImpl: () => "{not json" }), { cards: [] });
  assert.deepEqual(loadIndex({ readImpl: () => "42" }), { cards: [] });
  const coerced = loadIndex({ readImpl: () => JSON.stringify({ schemaVersion: "1.2.0" }) });
  assert.deepEqual(coerced.cards, []); // missing cards array coerced to []
  assert.equal(coerced.schemaVersion, "1.2.0");
});

test("loadIndex: valid INDEX parses through", () => {
  const idx = loadIndex({ readImpl: () => JSON.stringify({ cards: [{ galaxy: "x", salience: 1 }] }) });
  assert.equal(idx.cards.length, 1);
  assert.equal(idx.cards[0].galaxy, "x");
});

// ── buildDigestModel ────────────────────────────────────────────────────────────
test("buildDigestModel: ranked rows carry rank/salience/factors/role/topFact from injected cards", () => {
  const index = {
    schemaVersion: "1.2.0",
    generatedAt: "2026-05-31T00:00:00.000Z",
    accessFactor: { populated: true, rows: 100, source: "outcome-bus.jsonl" },
    cards: [
      { galaxy: "token-optimization", path: "/c/tok.md", salience: 7.46, salienceFactors: { recency: true, impact: true, access: true } },
      { galaxy: "tango", path: "/c/tango.md", salience: 4.0, salienceFactors: { recency: false, impact: true, access: false } },
    ],
  };
  const cardByPath = { "/c/tok.md": CARD_TOKEN, "/c/tango.md": CARD_BACKFILLED };
  const model = buildDigestModel({ index, readImpl: (f) => cardByPath[f] ?? null });
  assert.equal(model.galaxyCount, 2);
  assert.equal(model.salienceSchema, "1.2.0");
  assert.equal(model.accessFactor.source, "outcome-bus.jsonl");
  const [first, second] = model.ranked;
  assert.equal(first.galaxy, "token-optimization");
  assert.equal(first.rank, 1);
  assert.equal(first.salience, 7.46);
  assert.deepEqual(first.factors, ["recency", "impact", "access"]);
  assert.match(first.role, /Token Optimization/);
  assert.match(first.topFact, /Token economy/);
  // only truthy salienceFactors keys survive
  assert.deepEqual(second.factors, ["impact"]);
});

test("buildDigestModel: missing/unreadable card path → topFact null, role '' (galaxy still present)", () => {
  const index = { cards: [{ galaxy: "ghost", salience: 1 }, { galaxy: "broke", path: "/x", salience: 0.5 }] };
  const model = buildDigestModel({ index, readImpl: () => null });
  assert.equal(model.galaxyCount, 2);
  for (const r of model.ranked) { assert.equal(r.topFact, null); assert.equal(r.role, ""); }
});

test("buildDigestModel: missing salienceFactors → empty factors array", () => {
  const model = buildDigestModel({ index: { cards: [{ galaxy: "g", path: "/p", salience: 2 }] }, readImpl: () => CARD_TOKEN });
  assert.deepEqual(model.ranked[0].factors, []);
});

// ── renderDigest ────────────────────────────────────────────────────────────────
test("renderDigest: ≤maxBytes, contains every galaxy + the table header", () => {
  const model = {
    galaxyCount: 3,
    salienceSchema: "1.2.0",
    ranked: [
      { rank: 1, galaxy: "quoting", salience: 7.6, factors: ["recency", "impact", "access"], role: "Quoting", topFact: "**quote** — print to quote" },
      { rank: 2, galaxy: "tango", salience: 4.0, factors: ["impact"], role: "Discovery", topFact: null },
      { rank: 3, galaxy: "shop-floor", salience: null, factors: [], role: "", topFact: "x" },
    ],
  };
  const out = renderDigest(model, { maxBytes: DEFAULT_MAX_BYTES, generatedAt: "2026-05-31T00:00:00.000Z" });
  assert.ok(out.bytes <= DEFAULT_MAX_BYTES);
  assert.ok(out.text.includes("| # | galaxy | salience | factors | top delta |"));
  for (const g of ["quoting", "tango", "shop-floor"]) assert.ok(out.text.includes(g), `missing ${g}`);
  assert.ok(out.text.includes("_(no delta)_")); // null topFact rendered honestly
  assert.ok(out.text.includes("| 3 | shop-floor | — | — |")); // null salience + empty factors → em-dash
});

test("renderDigest: a fact containing a pipe is escaped (table integrity)", () => {
  const model = { ranked: [{ rank: 1, galaxy: "g", salience: 1, factors: [], role: "", topFact: "a | b | c" }] };
  const out = renderDigest(model, { generatedAt: "t" });
  assert.ok(out.text.includes("a \\| b \\| c"));
});

test("renderDigest: tiny maxBytes still respects the byte cap (truncation safe)", () => {
  const model = { ranked: Array.from({ length: 40 }, (_, i) => ({ rank: i + 1, galaxy: `g${i}`, salience: i, factors: [], role: "", topFact: "fact" })) };
  const out = renderDigest(model, { maxBytes: 200, generatedAt: "t" });
  assert.ok(out.bytes <= 200, `bytes ${out.bytes}`);
  assert.equal(out.truncated, true);
});

// ── rollup orchestrator (hermetic) ──────────────────────────────────────────────
function hermeticRollup(extra = {}) {
  const writes = {};
  const index = {
    schemaVersion: "1.2.0",
    cards: [
      { galaxy: "quoting", path: "/c/q.md", salience: 7.6, salienceFactors: { recency: true, impact: true, access: true } },
      { galaxy: "tango", path: "/c/t.md", salience: 4.0, salienceFactors: { impact: true } },
    ],
  };
  const cards = { "/c/q.md": "## quoting — Quoting\n1. **quote** — print to quote", "/c/t.md": CARD_BACKFILLED };
  const res = rollup({
    indexPath: "/idx.json",
    digestPath: "/out/MASTER-DIGEST.md",
    digestJsonPath: "/out/MASTER-DIGEST.json",
    readImpl: (f) => (f === "/idx.json" ? JSON.stringify(index) : cards[f] ?? null),
    writeImpl: (f, d) => { writes[f] = d; },
    now: () => 1735689600000, // fixed (Date.now stand-in) for deterministic generatedAt
    ...extra,
  });
  return { res, writes };
}

test("rollup: writes BOTH sidecars, returns written:true + correct galaxyCount + top ranking", () => {
  const { res, writes } = hermeticRollup();
  assert.equal(res.ok, true);
  assert.equal(res.written, true);
  assert.equal(res.reason, "written");
  assert.equal(res.galaxyCount, 2);
  assert.ok(writes["/out/MASTER-DIGEST.md"]);
  const json = JSON.parse(writes["/out/MASTER-DIGEST.json"]);
  assert.equal(json.schemaVersion, "1.0.0");
  assert.equal(json.ranked[0].galaxy, "quoting"); // highest salience first
  assert.equal(res.top[0].galaxy, "quoting");
});

test("rollup: SINGLE-WRITER GUARD — NEVER writes INDEX.json (multi-writer clobber regression)", () => {
  const { writes } = hermeticRollup();
  const paths = Object.keys(writes);
  assert.ok(paths.length === 2, `expected exactly 2 writes, got ${paths.length}`);
  for (const p of paths) {
    assert.ok(!/INDEX\.json$/i.test(p), `rollup must not write INDEX.json — wrote ${p}`);
  }
});

test("rollup: no-cards INDEX → written:false reason no-cards (never an empty digest)", () => {
  const res = rollup({ indexPath: "/i", readImpl: () => JSON.stringify({ cards: [] }), writeImpl: () => {} });
  assert.equal(res.ok, true);
  assert.equal(res.written, false);
  assert.equal(res.reason, "no-cards");
});

test("rollup: disabled knob → no-op disabled", () => {
  const prev = process.env.PRISM_GCF_ROLLUP_DISABLE;
  process.env.PRISM_GCF_ROLLUP_DISABLE = "1";
  try {
    const res = rollup({ indexPath: "/i", readImpl: () => JSON.stringify({ cards: [{ galaxy: "x", path: "/p", salience: 1 }] }), writeImpl: () => { throw new Error("must not write"); } });
    assert.equal(res.disabled, true);
    assert.equal(res.written, false);
  } finally {
    if (prev === undefined) delete process.env.PRISM_GCF_ROLLUP_DISABLE; else process.env.PRISM_GCF_ROLLUP_DISABLE = prev;
  }
});

test("rollup: write-error is fail-soft (reason write-error, never throws)", () => {
  const res = rollup({
    indexPath: "/i",
    readImpl: () => JSON.stringify({ cards: [{ galaxy: "x", path: "/p", salience: 1 }] }),
    writeImpl: () => { throw new Error("disk full"); },
  });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "write-error");
  assert.match(res.error, /disk full/);
});

test("rollup: null / garbage opts never throws", () => {
  assert.doesNotThrow(() => rollup(null));
  assert.doesNotThrow(() => rollup("nope"));
});

// ── LIVE soft integration (guards 'hermetic fakes don't prove wiring') ───────────
test("LIVE: real INDEX.json (if present) yields a complete, monotonic-nonincreasing ranking", () => {
  if (!fs.existsSync(DEFAULT_INDEX_PATH)) { console.log("  (skipped — no live INDEX.json)"); return; }
  const index = loadIndex({});
  if (!index.cards.length) { console.log("  (skipped — live INDEX has no cards)"); return; }
  const model = buildDigestModel({ index });
  assert.ok(model.galaxyCount >= 1);
  // ranking must be monotonic non-increasing on the finite-salience prefix
  let prev = Infinity;
  for (const r of model.ranked) {
    if (r.salience == null) break; // nulls are sorted last; stop at the first
    assert.ok(r.salience <= prev + 1e-9, `salience not monotonic: ${r.salience} > ${prev}`);
    prev = r.salience;
  }
  // a real render must respect the byte cap
  const out = renderDigest(model, {});
  assert.ok(out.bytes <= DEFAULT_MAX_BYTES);
});
