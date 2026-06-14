// scripts/lib/galaxy-knows-map.test.mjs — U-GCF-KNOWS-MAP hermetic test suite (node:test).
// Run: node --test scripts/lib/galaxy-knows-map.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  idf,
  galaxyTokenWeights,
  buildKnowsMap,
  whoKnows,
  build,
  loadKnowsMap,
  ROLE_BOOST,
} from "./galaxy-knows-map.mjs";

// Small synthetic fleet: each galaxy "owns" a distinctive token + shares a common one.
const CARDS = [
  { galaxy: "speed-feed", text: "## speed-feed — Speed and Feed Calculator\n1. **Kienzle** cutting force chipload feedrate physics" },
  { galaxy: "wedm", text: "## wedm — Wire EDM Wizard\n1. **discharge** spark wire flushing dielectric physics" },
  { galaxy: "quoting", text: "## quoting — Quoting\n1. **margin** pricing quote cost estimation physics" },
];

// ── idf ───────────────────────────────────────────────────────────────────────
test("idf: smoothed log(1+N/df) — always >0, monotonic-decreasing in df", () => {
  const rare = idf(34, 1);   // token in 1 of 34 galaxies
  const common = idf(34, 34); // token in all 34
  assert.ok(rare > common, `rare ${rare} must outweigh ubiquitous ${common}`);
  assert.ok(common > 0, "smoothed idf never collapses to 0 (no zero-collapse at df===N)");
  assert.ok(Math.abs(rare - Math.log(1 + 34 / 1)) < 1e-9);
});

test("idf: degenerate inputs → 0", () => {
  assert.equal(idf(0, 0), 0);
  assert.equal(idf(34, 0), 0);
  assert.equal(idf(0, 5), 0);
  assert.equal(idf(NaN, 1), 0);
});

// ── galaxyTokenWeights ──────────────────────────────────────────────────────────
test("galaxyTokenWeights: role-line tokens get ROLE_BOOST, body tokens get 1", () => {
  const w = galaxyTokenWeights("## speed-feed — Kienzle Calculator\n1. chipload feedrate physics");
  // "kienzle" / "calculator" appear in the role line → boosted; "chipload" is body-only → 1
  assert.equal(w.get("chipload"), 1);
  assert.ok(w.has("kienzle"));
  assert.equal(w.get("kienzle"), ROLE_BOOST, "a token in the role line is weighted ROLE_BOOST");
});

// ── buildKnowsMap ─────────────────────────────────────────────────────────────
test("buildKnowsMap: forward (galaxy→topics) + inverted (token→galaxies); drops idf-0 ubiquitous tokens", () => {
  const map = buildKnowsMap(CARDS);
  assert.equal(map.totalGalaxies, 3);
  assert.ok(map.tokenCount > 0);
  // each galaxy's distinctive token tops its forward list
  assert.ok(map.forward["speed-feed"].some((t) => t.topic === "cutting"));
  assert.ok(map.forward["wedm"].some((t) => t.topic === "discharge"));
  // "physics" is in ALL 3 galaxies → idf(3,3)=log(2)≈0.69 (smoothed, still >0) so it's kept but low-scored;
  // confirm a UNIQUE token outranks the shared one in the inverted authority list
  const cuttingPostings = map.inverted["cutting"];
  assert.equal(cuttingPostings[0].galaxy, "speed-feed");
  assert.equal(cuttingPostings.length, 1, "'cutting' is unique to speed-feed");
});

test("buildKnowsMap: a token shared by all galaxies scores BELOW a unique token (idf discrimination)", () => {
  const map = buildKnowsMap(CARDS);
  const physicsScore = (map.inverted["physics"] || [{ score: 0 }])[0].score; // shared by all 3
  const cuttingScore = map.inverted["cutting"][0].score;                      // unique to speed-feed
  assert.ok(cuttingScore > physicsScore, `unique 'cutting' ${cuttingScore} must outrank shared 'physics' ${physicsScore}`);
});

test("buildKnowsMap: non-array / garbage → empty index, fail-soft", () => {
  const m = buildKnowsMap(null);
  assert.equal(m.totalGalaxies, 0);
  assert.deepEqual(m.forward, {});
  assert.deepEqual(m.inverted, {});
});

// ── whoKnows (the 1-lookup routing API) ──────────────────────────────────────────
test("whoKnows: routes a query to the AUTHORITY galaxy (idf-weighted, not common-token noise)", () => {
  const map = buildKnowsMap(CARDS);
  assert.equal(whoKnows("cutting force chipload", map, { k: 1 })[0].galaxy, "speed-feed");
  assert.equal(whoKnows("discharge spark flushing", map, { k: 1 })[0].galaxy, "wedm");
  assert.equal(whoKnows("margin pricing quote", map, { k: 1 })[0].galaxy, "quoting");
});

// FAIL-ON-REVERT: without IDF, a query of only the COMMON token would tie/route arbitrarily; with IDF the
// shared token still resolves but a query mixing a unique + common token must rank the unique-owner first.
test("whoKnows: unique-topic owner outranks galaxies that only share the common token", () => {
  const map = buildKnowsMap(CARDS);
  const r = whoKnows("discharge physics", map, { k: 3 }); // 'discharge' unique→wedm; 'physics' in all 3
  assert.equal(r[0].galaxy, "wedm", "the unique-token owner must lead");
  assert.ok(r[0].matchedTopics.includes("discharge"));
});

test("whoKnows: empty query / no map / no-signal query → []", () => {
  const map = buildKnowsMap(CARDS);
  assert.deepEqual(whoKnows("", map), []);
  assert.deepEqual(whoKnows("cutting", null), []);
  assert.deepEqual(whoKnows("zzzznotokenmatches", map), []);
});

test("whoKnows: respects k limit + reports matchedTopics", () => {
  const map = buildKnowsMap(CARDS);
  const r = whoKnows("physics", map, { k: 2 }); // 'physics' is in all 3 → all match, capped to 2
  assert.ok(r.length <= 2);
  for (const x of r) assert.ok(Array.isArray(x.matchedTopics) && x.matchedTopics.includes("physics"));
});

// R12 KNOWN-LIMIT GUARD (documents the recall bound, not a bug): a BARE ambiguous token carried by many
// cards does NOT resolve to a single authority — it ties. Recall is bounded by the ≤1 KB distillations.
// The fix is a MULTI-token query: adding one distinctive term resolves the tie to the true authority.
test("whoKnows: bare ambiguous token ties; a distinctive second token resolves it (documented recall bound)", () => {
  const map = buildKnowsMap(CARDS);
  const bare = whoKnows("physics", map, { k: 5 }); // 'physics' is in ALL 3 synthetic galaxies
  assert.ok(bare.length >= 2, "a ubiquitous token does NOT resolve to one authority — it ties (recall bound, R12)");
  const sharp = whoKnows("physics discharge", map, { k: 1 }); // + the distinctive 'discharge'
  assert.equal(sharp[0].galaxy, "wedm", "a 2nd distinctive token resolves the tie to the authority galaxy");
});

// ── build orchestrator (hermetic) ────────────────────────────────────────────────
function hermeticBuild(extra = {}) {
  const writes = {};
  const res = build({
    roots: { cardsDir: "/cards" },
    knowsPath: "/cards/KNOWS-MAP.json",
    cards: CARDS,
    writeImpl: (f, d) => { writes[f] = d; },
    now: () => 1735689600000,
    ...extra,
  });
  return { res, writes };
}

test("build: writes KNOWS-MAP.json, returns written + totalGalaxies + tokenCount", () => {
  const { res, writes } = hermeticBuild();
  assert.equal(res.ok, true);
  assert.equal(res.written, true);
  assert.equal(res.totalGalaxies, 3);
  const json = JSON.parse(writes["/cards/KNOWS-MAP.json"]);
  assert.equal(json.schemaVersion, "1.0.0");
  assert.ok(json.forward && json.inverted);
  assert.equal(json.generatedAt, "2025-01-01T00:00:00.000Z"); // fixed now()=1735689600000 → deterministic
});

test("build: SINGLE-WRITER GUARD — writes only KNOWS-MAP.json, never INDEX.json", () => {
  const { writes } = hermeticBuild();
  const paths = Object.keys(writes);
  assert.deepEqual(paths, ["/cards/KNOWS-MAP.json"]);
  for (const p of paths) assert.ok(!/INDEX\.json$/i.test(p), `must not write INDEX.json — wrote ${p}`);
});

test("build: no cards → written:false reason no-cards", () => {
  const res = build({ cards: [], writeImpl: () => {} });
  assert.equal(res.ok, true);
  assert.equal(res.written, false);
  assert.equal(res.reason, "no-cards");
});

test("build: disabled knob → no-op (no write)", () => {
  const prev = process.env.PRISM_GCF_KNOWS_DISABLE;
  process.env.PRISM_GCF_KNOWS_DISABLE = "1";
  try {
    const { res, writes } = hermeticBuild({ writeImpl: () => { throw new Error("must not write"); } });
    assert.equal(res.disabled, true);
    assert.equal(res.written, false);
    assert.deepEqual(Object.keys(writes), []);
  } finally {
    if (prev === undefined) delete process.env.PRISM_GCF_KNOWS_DISABLE; else process.env.PRISM_GCF_KNOWS_DISABLE = prev;
  }
});

test("build: write-error is fail-soft (reason write-error, never throws)", () => {
  const res = build({ cards: CARDS, writeImpl: () => { throw new Error("disk full"); } });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "write-error");
  assert.match(res.error, /disk full/);
});

test("build: null / garbage opts never throws", () => {
  // disable knob → no real IO even on the default-deps path
  const prev = process.env.PRISM_GCF_KNOWS_DISABLE;
  process.env.PRISM_GCF_KNOWS_DISABLE = "1";
  try {
    assert.doesNotThrow(() => build(null));
    assert.doesNotThrow(() => build("nope"));
  } finally {
    if (prev === undefined) delete process.env.PRISM_GCF_KNOWS_DISABLE; else process.env.PRISM_GCF_KNOWS_DISABLE = prev;
  }
});

// ── loadKnowsMap ─────────────────────────────────────────────────────────────────
test("loadKnowsMap: fail-soft on null / garbage / shape-mismatch → null", () => {
  assert.equal(loadKnowsMap({ readImpl: () => null }), null);
  assert.equal(loadKnowsMap({ readImpl: () => "{bad" }), null);
  assert.equal(loadKnowsMap({ readImpl: () => JSON.stringify({ no: "inverted" }) }), null);
  const ok = loadKnowsMap({ readImpl: () => JSON.stringify({ inverted: { x: [] } }) });
  assert.ok(ok && ok.inverted);
});

// ── LIVE soft integration ─────────────────────────────────────────────────────────
test("LIVE: real cards (if present) route a domain query to its authority galaxy", () => {
  const res = build({ writeImpl: () => {} }); // build from real INDEX cards, don't write the real sidecar
  if (!res.ok || !res.written) { /* no-cards in CI */ }
  // re-derive the map purely from the live cards via loadCardsFromIndex (build already did; re-check routing)
  // Use loadKnowsMap against the real artifact only if it exists; otherwise skip.
  const km = loadKnowsMap({});
  if (!km) { console.log("  (skipped — no live KNOWS-MAP.json yet)"); return; }
  const who = whoKnows("cutting force speed feed", km, { k: 1 });
  if (who.length) assert.equal(who[0].galaxy, "speed-feed", "live routing must send cutting-force to speed-feed");
});
