/**
 * viz-domain-coverage.mjs — single-source engine-domain coverage for the
 * system-viz L5 layer.
 *
 * VIZ-COVERAGE-MS0 / U-VIZ-COVERAGE-FIX
 * --------------------------------------------------------------------------
 * generate-system-viz.mjs used to carry a hand-edited `domainsBuiltIn` array
 * of ~24 engine domains with HARDCODED engine counts. Those counts drifted
 * from reality — the viz headline and BUILD_STATE.json reported different
 * wired-engine figures for the same metric. Two surfaces, one metric, two
 * answers. (See CLAUDE.md "## Recent regressions" for the recorded delta.)
 *
 * This module is the ONE place the L5 layer derives its domain breakdown,
 * straight from BUILD_STATE.COVERAGE_BY_DOMAIN.rows — the canonical
 * per-domain table computed by build-state-snapshot.mjs::computeCoverageByDomain.
 *
 * The viz surfaces the top-N domains (DEFAULT_TOP_N=40) by engine count plus
 * one aggregated "rest" bucket — so L5 renders 41 domain nodes (up from the
 * legacy 24), and the sum of every L5 node equals the BUILD_STATE total
 * EXACTLY — no domain is dropped, none is double-counted. The conservation
 * invariant (sum(top) + rest === coverage) is what the test suite enforces.
 *
 * INTEGRATION NOTE: BUILD_STATE's #1 domain is literally named "Other" (the
 * unwired-residual bucket). It becomes the L5 node id `eng.other`. The viz's
 * legacy hand-rolled `eng.other` residual-catchall MUST be removed when this
 * module is wired in, or two nodes share that id. This module's own rest
 * bucket (`eng.miscdomains`) is the replacement catchall.
 */

/** Default count of named domain nodes the viz surfaces at L5. */
export const DEFAULT_TOP_N = 40;

/** Id the viz uses for the aggregated "everything past top-N" L5 node. */
export const REST_DOMAIN_NAME = "MiscDomains";

/** Coerce any value to a finite non-negative integer (NaN/neg/undefined → 0). */
function toCount(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Integer percentage wired/total, 0 when total is 0 (never NaN). */
function pct(wired, total) {
  return total > 0 ? Math.round((wired / total) * 100) : 0;
}

/**
 * Normalize a raw BUILD_STATE coverage row into a clean record. Counts pass
 * through verbatim (only coerced to safe non-negative integers) so the L5
 * layer mirrors BUILD_STATE.COVERAGE_BY_DOMAIN.rows exactly — that faithful
 * mirroring IS the single-source-of-truth guarantee this module exists for.
 * Only `coverage_pct` is recomputed, so the displayed percentage can never
 * disagree with the displayed counts.
 */
function normalizeRow(r) {
  const total = toCount(r.total);
  const wired = toCount(r.wired);
  const unwired = toCount(r.unwired);
  return {
    domain: String(r.domain),
    total,
    wired,
    unwired,
    coverage_pct: pct(wired, total),
  };
}

/** Sum a list of normalized rows into a single {total,wired,unwired} record. */
function aggregate(rows) {
  return rows.reduce(
    (s, r) => ({
      total: s.total + r.total,
      wired: s.wired + r.wired,
      unwired: s.unwired + r.unwired,
    }),
    { total: 0, wired: 0, unwired: 0 },
  );
}

/**
 * Compute the system-viz L5 engine-domain coverage from a BUILD_STATE
 * COVERAGE_BY_DOMAIN.rows array.
 *
 * @param {Array<{domain:string,total:number,wired:number,unwired:number,coverage_pct?:number}>} rows
 *        BUILD_STATE.COVERAGE_BY_DOMAIN.rows — may be undefined/empty.
 * @param {number} [topN=DEFAULT_TOP_N] how many named domain nodes to surface.
 * @returns {{
 *   top: Array<{domain:string,total:number,wired:number,unwired:number,coverage_pct:number}>,
 *   rest: ({domain:string,total:number,wired:number,unwired:number,coverage_pct:number,domainCount:number}|null),
 *   coverage: {total:number,wired:number,unwired:number,coverage_pct:number,domains:number}
 * }}
 *   `top` — top-N domains by engine count, descending.
 *   `rest` — every remaining domain aggregated into one bucket (null when
 *            no domains spill past top-N).
 *   `coverage` — the canonical aggregate over EVERY row (the single source
 *            of truth for the viz's headline coverage number).
 *
 * Conservation invariant (enforced by the test suite):
 *   sum(top.total) + (rest?.total ?? 0) === coverage.total   (same for wired)
 */
export function computeDomainCoverage(rows, topN = DEFAULT_TOP_N) {
  const clean = (Array.isArray(rows) ? rows : [])
    .filter((r) => r && typeof r.domain === "string" && r.domain.length > 0)
    .map(normalizeRow);

  // Canonical aggregate over EVERY domain — no top-N truncation. This is the
  // figure the viz headline must match BUILD_STATE on.
  const agg = aggregate(clean);
  const coverage = {
    total: agg.total,
    wired: agg.wired,
    unwired: agg.unwired,
    coverage_pct: pct(agg.wired, agg.total),
    domains: clean.length,
  };

  // Rank by engine count so the viz surfaces the heaviest domains. Ties broken
  // by domain name for deterministic output across runs.
  const ranked = [...clean].sort(
    (a, b) => b.total - a.total || a.domain.localeCompare(b.domain),
  );
  const n = Math.max(0, Math.floor(Number(topN) || 0));
  const top = ranked.slice(0, n);
  const restRows = ranked.slice(n);

  let rest = null;
  if (restRows.length > 0) {
    const r = aggregate(restRows);
    rest = {
      domain: REST_DOMAIN_NAME,
      total: r.total,
      wired: r.wired,
      unwired: r.unwired,
      coverage_pct: pct(r.wired, r.total),
      domainCount: restRows.length,
    };
  }

  return { top, rest, coverage };
}
