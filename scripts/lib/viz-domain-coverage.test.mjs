/**
 * viz-domain-coverage.test.mjs — VIZ-COVERAGE-MS0 / U-VIZ-COVERAGE-FIX
 *
 * Enforces the single-source-of-truth contract between BUILD_STATE and the
 * system-viz L5 layer: every L5 domain node (top-N + the aggregated "rest"
 * bucket) must sum back to the canonical BUILD_STATE coverage figure — no
 * domain dropped, none double-counted.
 *
 * Run: node --test scripts/lib/viz-domain-coverage.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeDomainCoverage,
  DEFAULT_TOP_N,
  REST_DOMAIN_NAME,
} from "./viz-domain-coverage.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const BUILD_STATE_PATH = path.join(REPO_ROOT, "state", "shared", "BUILD_STATE.json");
const SYSTEM_GRAPH_PATH = path.join(
  REPO_ROOT,
  "state",
  "shared",
  "system-viz",
  "system-graph.json",
);

/** Sum the top + rest L5 nodes the way the viz renders them. */
function sumNodes({ top, rest }) {
  const all = rest ? [...top, rest] : [...top];
  return all.reduce(
    (s, d) => ({
      total: s.total + d.total,
      wired: s.wired + d.wired,
      unwired: s.unwired + d.unwired,
    }),
    { total: 0, wired: 0, unwired: 0 },
  );
}

// ---- synthetic fixtures -------------------------------------------------

test("conservation: top + rest sums to coverage (more domains than topN)", () => {
  const rows = Array.from({ length: 60 }, (_, i) => ({
    domain: `D${i}`,
    total: 100 - i,
    wired: 100 - i - (i % 5),
    unwired: i % 5,
  }));
  const r = computeDomainCoverage(rows, 40);
  assert.equal(r.top.length, 40);
  assert.ok(r.rest, "rest bucket must exist when domains exceed topN");
  assert.equal(r.rest.domainCount, 20);
  const s = sumNodes(r);
  assert.equal(s.total, r.coverage.total);
  assert.equal(s.wired, r.coverage.wired);
  assert.equal(s.unwired, r.coverage.unwired);
});

test("coverage aggregate equals a manual sum over every row", () => {
  const rows = [
    { domain: "Alpha", total: 10, wired: 7, unwired: 3 },
    { domain: "Beta", total: 20, wired: 20, unwired: 0 },
    { domain: "Gamma", total: 5, wired: 0, unwired: 5 },
  ];
  const r = computeDomainCoverage(rows, 40);
  assert.equal(r.coverage.total, 35);
  assert.equal(r.coverage.wired, 27);
  assert.equal(r.coverage.unwired, 8);
  assert.equal(r.coverage.coverage_pct, Math.round((27 / 35) * 100)); // 77
  assert.equal(r.coverage.domains, 3);
});

test("no rest bucket when domain count <= topN", () => {
  const rows = [
    { domain: "A", total: 3, wired: 3, unwired: 0 },
    { domain: "B", total: 2, wired: 1, unwired: 1 },
  ];
  const r = computeDomainCoverage(rows, 40);
  assert.equal(r.rest, null);
  assert.equal(r.top.length, 2);
  assert.equal(sumNodes(r).total, r.coverage.total);
});

test("top is ranked by engine count descending", () => {
  const rows = [
    { domain: "Small", total: 1, wired: 1, unwired: 0 },
    { domain: "Big", total: 99, wired: 50, unwired: 49 },
    { domain: "Mid", total: 40, wired: 40, unwired: 0 },
  ];
  const r = computeDomainCoverage(rows, 40);
  assert.deepEqual(
    r.top.map((d) => d.domain),
    ["Big", "Mid", "Small"],
  );
});

test("ties broken by domain name for deterministic output", () => {
  const rows = [
    { domain: "Zebra", total: 10, wired: 10, unwired: 0 },
    { domain: "Apple", total: 10, wired: 10, unwired: 0 },
  ];
  const a = computeDomainCoverage(rows, 1);
  const b = computeDomainCoverage(rows, 1);
  assert.equal(a.top[0].domain, "Apple"); // alphabetical tie-break
  assert.deepEqual(a, b); // fully deterministic
});

test("topN=0 aggregates every domain into rest", () => {
  const rows = [
    { domain: "A", total: 4, wired: 4, unwired: 0 },
    { domain: "B", total: 6, wired: 3, unwired: 3 },
  ];
  const r = computeDomainCoverage(rows, 0);
  assert.equal(r.top.length, 0);
  assert.ok(r.rest);
  assert.equal(r.rest.domain, REST_DOMAIN_NAME);
  assert.equal(r.rest.total, 10);
  assert.equal(r.rest.domainCount, 2);
  assert.equal(sumNodes(r).total, r.coverage.total);
});

test("empty / undefined / non-array rows yield a zeroed result", () => {
  for (const input of [[], undefined, null, "nonsense", 42]) {
    const r = computeDomainCoverage(input, 40);
    assert.deepEqual(r.coverage, {
      total: 0,
      wired: 0,
      unwired: 0,
      coverage_pct: 0,
      domains: 0,
    });
    assert.equal(r.top.length, 0);
    assert.equal(r.rest, null);
  }
});

test("malformed rows are dropped, not crashed on", () => {
  const rows = [
    { domain: "Good", total: 10, wired: 6, unwired: 4 },
    { domain: "", total: 5, wired: 5, unwired: 0 }, // empty domain
    { total: 5, wired: 5, unwired: 0 }, // missing domain
    null, // not an object
    { domain: 99, total: 5, wired: 5, unwired: 0 }, // non-string domain
  ];
  const r = computeDomainCoverage(rows, 40);
  assert.equal(r.coverage.domains, 1);
  assert.equal(r.coverage.total, 10);
});

test("NaN / negative / string counts coerce to safe non-negative integers", () => {
  const rows = [
    { domain: "Dirty", total: "12", wired: -3, unwired: NaN },
    { domain: "Float", total: 7.9, wired: 4.2, unwired: 3 },
  ];
  const r = computeDomainCoverage(rows, 40);
  // "12" -> 12, -3 -> 0, NaN -> 0  |  7.9 -> 7, 4.2 -> 4, 3 -> 3
  assert.equal(r.coverage.total, 12 + 7);
  assert.equal(r.coverage.wired, 0 + 4);
  assert.equal(r.coverage.unwired, 0 + 3);
});

test("coverage_pct never NaN when a domain has zero engines", () => {
  const rows = [{ domain: "Empty", total: 0, wired: 0, unwired: 0 }];
  const r = computeDomainCoverage(rows, 40);
  assert.equal(r.coverage.coverage_pct, 0);
  assert.equal(r.top[0].coverage_pct, 0);
});

test("coverage_pct recomputed from counts, not trusted from the row", () => {
  // row claims 99% but the counts say 50% — the lib must trust the counts.
  const rows = [{ domain: "Liar", total: 10, wired: 5, unwired: 5, coverage_pct: 99 }];
  const r = computeDomainCoverage(rows, 40);
  assert.equal(r.top[0].coverage_pct, 50);
});

test("default topN is 40", () => {
  assert.equal(DEFAULT_TOP_N, 40);
  const rows = Array.from({ length: 45 }, (_, i) => ({
    domain: `D${i}`,
    total: 45 - i,
    wired: 45 - i,
    unwired: 0,
  }));
  const r = computeDomainCoverage(rows); // no topN arg
  assert.equal(r.top.length, 40);
});

test("topN >= row count: every domain is in top, rest is null", () => {
  const rows = [
    { domain: "A", total: 9, wired: 9, unwired: 0 },
    { domain: "B", total: 4, wired: 2, unwired: 2 },
    { domain: "C", total: 1, wired: 0, unwired: 1 },
  ];
  // topN deliberately exceeds the row count
  const r = computeDomainCoverage(rows, 999);
  assert.equal(r.top.length, 3);
  assert.equal(r.rest, null);
  assert.equal(sumNodes(r).total, r.coverage.total);
  assert.equal(sumNodes(r).wired, r.coverage.wired);
});

test("counts pass through verbatim — total is NOT recomputed from wired+unwired", () => {
  // A row whose total disagrees with wired+unwired. BUILD_STATE rows are
  // internally consistent by construction, but the lib must mirror the
  // SOURCE faithfully — a future "tidy-up" that derives total from
  // wired+unwired would silently break single-source-of-truth.
  const rows = [{ domain: "Skew", total: 10, wired: 3, unwired: 2 }];
  const r = computeDomainCoverage(rows, 40);
  assert.equal(r.coverage.total, 10); // verbatim — not 3+2=5
  assert.equal(r.coverage.wired, 3);
  assert.equal(r.coverage.unwired, 2);
  assert.equal(r.top[0].total, 10);
  assert.equal(r.top[0].unwired, 2); // verbatim — not derived
});

test("duplicate domain names are kept as independent buckets, not merged", () => {
  const rows = [
    { domain: "Dup", total: 6, wired: 6, unwired: 0 },
    { domain: "Dup", total: 4, wired: 1, unwired: 3 },
  ];
  const r = computeDomainCoverage(rows, 40);
  assert.equal(r.coverage.domains, 2); // both counted — no dedup
  assert.equal(r.coverage.total, 10);
  assert.equal(r.coverage.wired, 7);
  assert.equal(r.top.length, 2);
  assert.equal(sumNodes(r).total, r.coverage.total);
});

test("emitted L5 node ids (eng.<domain>) are unique across top + rest", () => {
  // generate-system-viz turns each domain into id `eng.${domain.toLowerCase()}`.
  // The rest bucket is `eng.miscdomains`. This must never collide.
  const rows = Array.from({ length: 50 }, (_, i) => ({
    domain: `Dom${i}`,
    total: 50 - i,
    wired: 50 - i,
    unwired: 0,
  }));
  const r = computeDomainCoverage(rows, 40);
  const ids = [
    ...r.top.map((d) => `eng.${d.domain.toLowerCase()}`),
    ...(r.rest ? [`eng.${r.rest.domain.toLowerCase()}`] : []),
  ];
  assert.equal(new Set(ids).size, ids.length, "L5 node ids must be unique");
  assert.ok(ids.includes("eng.miscdomains"), "rest bucket id present");
});

// ---- real BUILD_STATE.json (single-source-of-truth integration) ---------

test("real BUILD_STATE: L5 nodes sum back to the COVERAGE_BY_DOMAIN total", (t) => {
  if (!fs.existsSync(BUILD_STATE_PATH)) {
    // BUILD_STATE is a generated artifact — surface its absence LOUDLY as a
    // skip (R12 fail-loud), never a silent return-as-pass that would hide an
    // unverified single-source-of-truth contract on a fresh checkout.
    t.skip("BUILD_STATE.json absent — run: node scripts/build-state-snapshot.mjs");
    return;
  }
  const bs = JSON.parse(fs.readFileSync(BUILD_STATE_PATH, "utf8"));
  const rows = bs.COVERAGE_BY_DOMAIN?.rows;
  assert.ok(Array.isArray(rows) && rows.length > 0, "BUILD_STATE must carry COVERAGE_BY_DOMAIN.rows");

  // manual sum straight off the raw rows — the figure the viz must match
  const raw = rows.reduce(
    (s, r) => ({
      total: s.total + (Number(r.total) || 0),
      wired: s.wired + (Number(r.wired) || 0),
      unwired: s.unwired + (Number(r.unwired) || 0),
    }),
    { total: 0, wired: 0, unwired: 0 },
  );

  const r = computeDomainCoverage(rows);
  assert.equal(r.coverage.total, raw.total, "viz coverage total must equal BUILD_STATE row sum");
  assert.equal(r.coverage.wired, raw.wired, "viz coverage wired must equal BUILD_STATE row sum");
  assert.equal(r.coverage.unwired, raw.unwired, "viz coverage unwired must equal BUILD_STATE row sum");

  // conservation: the L5 nodes the viz actually draws sum to the same figure
  const s = sumNodes(r);
  assert.equal(s.total, r.coverage.total);
  assert.equal(s.wired, r.coverage.wired);
  assert.equal(s.unwired, r.coverage.unwired);
});

test("generated system-graph.json: meta.coverage matches BUILD_STATE + L5 nodes", (t) => {
  // Acceptance criterion #4 — the GENERATED viz output must carry the
  // single-source coverage figure. Both inputs are generated artifacts;
  // skip loudly (not silently) if either is absent.
  if (!fs.existsSync(SYSTEM_GRAPH_PATH) || !fs.existsSync(BUILD_STATE_PATH)) {
    t.skip("system-graph.json or BUILD_STATE.json absent — run scripts/generate-system-viz.mjs");
    return;
  }
  const graph = JSON.parse(fs.readFileSync(SYSTEM_GRAPH_PATH, "utf8"));
  const bs = JSON.parse(fs.readFileSync(BUILD_STATE_PATH, "utf8"));
  // system-graph.json is a SHARED path: generate-system-viz.mjs (this lib's
  // consumer, schemaVersion "2.1.0") and regen-viz.mjs (the 372K-node merged
  // filesystem graph) both write it — last writer wins. Only assert when the
  // file currently holds the generate-system-viz product; otherwise skip
  // loudly (R12 — not a silent pass) naming why.
  if (graph?.schemaVersion !== "2.1.0") {
    t.skip(
      "system-graph.json currently holds a non-generate-system-viz product "
      + `(schemaVersion=${graph?.schemaVersion}) — run scripts/generate-system-viz.mjs to verify meta.coverage`,
    );
    return;
  }
  const cov = graph?.meta?.coverage;
  assert.ok(cov, "generate-system-viz graph must carry meta.coverage (VIZ-COVERAGE-MS0)");

  // meta.coverage must equal the lib's computation over BUILD_STATE rows.
  const expected = computeDomainCoverage(bs.COVERAGE_BY_DOMAIN?.rows ?? []).coverage;
  assert.equal(cov.total, expected.total, "meta.coverage.total != BUILD_STATE");
  assert.equal(cov.wired, expected.wired, "meta.coverage.wired != BUILD_STATE");
  assert.equal(cov.unwired, expected.unwired, "meta.coverage.unwired != BUILD_STATE");

  // The L5 domain nodes the viz draws must sum back to meta.coverage — no
  // hardcoded block, no double-counted catchall.
  const l5 = (graph.nodes ?? []).filter((n) => n.layer === "L5");
  const ids = l5.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length, "L5 node ids must be unique");
  const l5sum = l5.reduce(
    (s, n) => ({
      total: s.total + (Number(n.count) || 0),
      wired: s.wired + (Number(n.wired) || 0),
      unwired: s.unwired + (Number(n.unwired) || 0),
    }),
    { total: 0, wired: 0, unwired: 0 },
  );
  assert.equal(l5sum.total, cov.total, "L5 node total must sum to meta.coverage");
  assert.equal(l5sum.wired, cov.wired, "L5 node wired must sum to meta.coverage");
  assert.equal(l5sum.unwired, cov.unwired, "L5 node unwired must sum to meta.coverage");

  // Edge-connectivity guard — the L4→L5 dispatcher→engine-domain edges must
  // not all vanish. The new prefix taxonomy resolves fewer semantic tokens
  // than the old hand-curated one, but the layer must stay connected.
  const l4l5 = (graph.edges ?? []).filter(
    (e) => e.type === "lazy_import" && /^eng\./.test(String(e.to)),
  );
  assert.ok(
    l4l5.length > 0,
    "L4→L5 dispatcher→engine-domain edges must not all be lost",
  );
});
