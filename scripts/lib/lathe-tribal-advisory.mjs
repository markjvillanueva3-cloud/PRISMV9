#!/usr/bin/env node
/**
 * lathe-tribal-advisory.mjs -- slot:whiskey [KIENZLE: tribal knowledge factored into the closed loop]
 * ==========================================================================
 * PURE lexical matcher: given the maxed lathe tribal corpus (free-text extracted-tips from
 * vendor catalogs / Okuma+Siemens manuals) and a generated program's op-types + material,
 * surface the top-N RELEVANT shop tips for that part. This delivers the 694-tip corpus into
 * the closed-loop per-part context -- the operator's "machining efficiency factored in WITH
 * tribal knowledge" (advisory surfacing; it never alters physics/safety params -- that deeper
 * adjustment path is the structured-signal unit in
 * [[reference_whiskey_tribal_not_in_generation_gap_2026_06_26]]).
 *
 * The tips are free-text with a `topic` field (Safety, Tapping, Threading, ...). We score by
 * keyword overlap between (topic + tip text) and the part's op-type keywords + material tokens.
 *
 * Pure (no I/O) + exported for direct unit testing.
 */

// Op-type -> matching keywords. Covers the TurningOpType taxonomy (od/id/face/groove/thread/part/drill).
const OP_KEYWORDS = {
  od_rough: ["turn", "turning", "rough", "roughing", "od", "outer"],
  od_finish: ["turn", "turning", "finish", "finishing", "od", "surface"],
  od_thread: ["thread", "threading", "pitch", "tap", "tapping"],
  id_rough: ["bore", "boring", "internal", "id"],
  id_finish: ["bore", "boring", "internal", "id", "finish"],
  bore_rough: ["bore", "boring", "internal", "id"],
  bore_finish: ["bore", "boring", "internal", "id", "finish"],
  face_rough: ["face", "facing"],
  face_finish: ["face", "facing", "finish"],
  groove: ["groove", "grooving", "slot"],
  groove_finish: ["groove", "grooving"],
  thread_single_point: ["thread", "threading", "pitch", "tap", "tapping"],
  thread_insert: ["thread", "threading", "insert", "tap", "tapping"],
  part_off: ["part", "parting", "cutoff", "cut-off", "blade"],
  drill: ["drill", "drilling", "hole"],
  center_drill: ["center", "drill", "spot"],
  bore: ["bore", "boring", "internal", "id"],
  taper: ["taper", "angle"],
  knurl: ["knurl", "knurling"],
};

/** Build the query keyword set from a part's op-types + material name (deduped, lowercased). */
export function buildQueryKeywords(opTypes, materialName) {
  const kw = new Set();
  for (const op of opTypes || []) {
    for (const k of OP_KEYWORDS[op] || []) kw.add(k);
  }
  for (const tok of String(materialName || "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3)) {
    kw.add(tok);
  }
  return [...kw];
}

/**
 * Top-N tribal tips relevant to a part's ops + material.
 * @param {Array<{tip?:string, topic?:string, source?:string}>} tips  extracted-tip corpus entries
 * @param {{opTypes?:string[], materialName?:string}} ctx
 * @param {number} topN
 * @returns {Array<{tip:string, topic:string, source:string, score:number}>}
 */
export function relevantTips(tips, ctx, topN = 3) {
  const keywords = buildQueryKeywords(ctx?.opTypes, ctx?.materialName);
  if (keywords.length === 0) return [];
  // WORD-BOUNDARY regexes (not substring) so short tokens never false-match inside words --
  // `od` must not hit "meth-od"/"pr-od-uct", `id` must not hit "flu-id-s"/"gu-id-elines". [scrutiny P2]
  const kwRes = keywords.map((kw) => new RegExp("\\b" + kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i"));
  const scored = [];
  for (const t of tips || []) {
    if (!t || typeof t.tip !== "string" || !t.tip.trim()) continue;
    const topic = String(t.topic || "");
    const text = t.tip;
    let score = 0;
    for (const re of kwRes) {
      if (re.test(topic)) score += 2; // topic match weighted higher (it's the tip's classifier)
      if (re.test(text)) score += 1;
    }
    if (score > 0) {
      scored.push({ tip: t.tip, topic: t.topic || "", source: basename(t.source), score });
    }
  }
  // Highest score first; stable tie-break by shorter tip (more specific) then alpha for determinism.
  scored.sort((a, b) => b.score - a.score || a.tip.length - b.tip.length || a.tip.localeCompare(b.tip));
  // De-dup identical tip text (same advice extracted from multiple catalogs).
  const seen = new Set();
  const out = [];
  for (const s of scored) {
    const key = s.tip.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= topN) break;
  }
  return out;
}

function basename(p) {
  if (!p) return "";
  return String(p).replace(/\\/g, "/").split("/").pop();
}
