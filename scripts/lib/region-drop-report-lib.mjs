// scripts/lib/region-drop-report-lib.mjs
//
// BLUEPRINT-VISION-OCR P1.5 -- pure aggregator over the per-page region-route drop diagnostics
// (rec.region_page_diags, emitted by validate-perfect-parts.mjs --region-route; classified by
// classifyRegionPageDrop in region-classify.mjs). Turns N seed runs of truetest-results.jsonl into a
// per-(part,page) CROSS-SEED verdict so the multi-seed region-route page-drop investigation is
// conclusive WITHOUT eyeballing raw JSONL.
//
// THE LOAD-BEARING READING (why N seeds): a single run cannot separate a systematic defect from VLM
// stochasticity. Across seeds:
//   - an attribution that is STABLE (same label every seed) is SYSTEMATIC -- the label says which:
//       merge_or_unit_dropped -> a CODE bug (the merge clique-representative dropped scoreable floor
//                                dims; collapsedSeen confirms via merge_stats.collapsed)  -> code_bug_suspect
//       floor_failed_regions_ran / extraction_failed -> the floor failed under load           -> host_suspect
//       blank_page                                    -> a genuine non-callout page            -> genuine_blank
//   - an attribution that VARIES across seeds is VLM variance                                  -> variance
// Pure (records in, report out) so it is unit-tested without a GPU.

// The four zero-scoreable-dim drop labels classifyRegionPageDrop can emit ("ok" is not a drop).
export const DROP_ATTRIBUTIONS = Object.freeze(["merge_or_unit_dropped", "blank_page", "floor_failed_regions_ran", "extraction_failed"]);

// Map a STABLE cross-seed attribution to the investigation bucket. "ok" (a page that read dims) and any
// unknown label fall to "ok" (not a drop to chase).
export function bucketForStableAttribution(attr) {
  if (attr === "merge_or_unit_dropped") return "code_bug_suspect";
  if (attr === "floor_failed_regions_ran" || attr === "extraction_failed") return "host_suspect";
  if (attr === "blank_page") return "genuine_blank";
  return "ok";
}

// The most frequent element of a non-empty array (first-seen wins ties). "unknown" for an empty array.
function modeOf(arr) {
  const counts = {};
  let best = arr.length ? arr[0] : "unknown";
  let bestN = 0;
  for (const a of arr) {
    counts[a] = (counts[a] || 0) + 1;
    if (counts[a] > bestN) { bestN = counts[a]; best = a; }
  }
  return best;
}

/**
 * Parse a truetest-results.jsonl text blob into an array of record objects. Fail-soft per line:
 * blank lines and unparseable lines are skipped (a single torn line never loses the whole run).
 *
 * @param {string} text  the .jsonl file contents
 * @returns {object[]}   the parsed record objects (order preserved)
 */
export function parseResultsJsonl(text) {
  if (typeof text !== "string" || !text) return [];
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try {
      const obj = JSON.parse(s);
      if (obj && typeof obj === "object") out.push(obj);
    } catch { /* skip a torn/partial line, keep the rest (R12: never drop a whole run over one line) */ }
  }
  return out;
}

/**
 * Aggregate per-page region-route drop diagnostics across N seed runs into a cross-seed verdict.
 *
 * @param {Array<{label?:string, records?:object[]}>} runs  one entry per seed run; records = parsed
 *   truetest-results.jsonl objects (each may carry region_page_diags + part_number)
 * @returns {{seedCount:number, pages:Array<object>, summary:object}}
 *   pages: per-(part,page) { key, part_number, page, seeds, stable, dominant, verdict, attributions, collapsedSeen }
 *   summary: { totalPages, byAttribution, codeBugSuspect, hostSuspect, genuineBlank, variance, ok }
 */
export function aggregateRegionDropDiags(runs) {
  const safeRuns = Array.isArray(runs) ? runs : [];
  // key "part::pN" -> { part_number, page, byLabel: Map(label -> {attribution, floor_scoreable, union_scoreable, collapsed}) }
  const pageMap = new Map();
  for (const run of safeRuns) {
    if (!run || typeof run !== "object") continue;
    const label = String(run.label != null ? run.label : "");
    const records = Array.isArray(run.records) ? run.records : [];
    for (const rec of records) {
      if (!rec || typeof rec !== "object") continue;
      const diags = Array.isArray(rec.region_page_diags) ? rec.region_page_diags : [];
      const pnRaw = rec.part_number != null ? String(rec.part_number) : "";
      const pn = pnRaw !== "" ? pnRaw : "(unknown)"; // empty part_number must not collide pages across parts

      for (const d of diags) {
        if (!d || typeof d !== "object") continue;
        const page = Number.isFinite(d.page) ? d.page : 0;
        const key = `${pn}::p${page}`;
        if (!pageMap.has(key)) pageMap.set(key, { part_number: pn, page, byLabel: new Map() });
        pageMap.get(key).byLabel.set(label, {
          attribution: typeof d.attribution === "string" ? d.attribution : "unknown",
          floor_scoreable: Number.isFinite(d.floor_scoreable) ? d.floor_scoreable : null,
          union_scoreable: Number.isFinite(d.union_scoreable) ? d.union_scoreable : null,
          collapsed: d.merge_stats && Number.isFinite(d.merge_stats.collapsed) ? d.merge_stats.collapsed : null,
        });
      }
    }
  }

  const pages = [];
  const byAttribution = {};
  const buckets = { code_bug_suspect: 0, host_suspect: 0, genuine_blank: 0, variance: 0, ok: 0 };
  for (const [key, v] of pageMap) {
    const labels = [...v.byLabel.keys()];
    const attrs = labels.map((l) => v.byLabel.get(l).attribution);
    for (const a of attrs) byAttribution[a] = (byAttribution[a] || 0) + 1;
    const stable = new Set(attrs).size === 1;
    const dominant = modeOf(attrs);
    const verdict = stable ? bucketForStableAttribution(dominant) : "variance";
    const collapsedSeen = labels.some((l) => {
      const c = v.byLabel.get(l).collapsed;
      return Number.isFinite(c) && c > 0;
    });
    buckets[verdict] += 1;
    // varianceChecked: a "stable" label is only meaningful when >=2 seeds could have disagreed. With a
    // single seed every page is vacuously stable -- the verdict is NOT trustworthy (R12). The CLI/JSON
    // consumer must treat verdicts on a page with varianceChecked=false as provisional.
    const varianceChecked = labels.length >= 2;
    pages.push({ key, part_number: v.part_number, page: v.page, seeds: labels.length, stable, varianceChecked, dominant, verdict, attributions: attrs, collapsedSeen });
  }
  pages.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  return {
    seedCount: safeRuns.length,
    pages,
    summary: {
      totalPages: pages.length,
      // provisional: fewer than minSeedsForConfidence (3) runs -> a "stable" verdict cannot reliably
      // separate a systematic defect from VLM variance (per the multi-seed-before-claim doctrine).
      minSeedsForConfidence: 3,
      provisional: safeRuns.length < 3,
      byAttribution,
      codeBugSuspect: buckets.code_bug_suspect,
      hostSuspect: buckets.host_suspect,
      genuineBlank: buckets.genuine_blank,
      variance: buckets.variance,
      ok: buckets.ok,
    },
  };
}
