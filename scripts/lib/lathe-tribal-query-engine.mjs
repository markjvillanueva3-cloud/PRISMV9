// Lathe tribal-query engine — implements U-LATHE-TRIBAL-QUERY-DISPATCHER
// Design memo: reference_lathe_tribal_query_dispatcher_design_2026_05_27
// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
// See scripts/lib/README-whiskey-lathe.md for full engine + test catalog.
//
// Two-tier search:
//   Tier 1: exact-match index lookup over vendor_grades hard constraints
//   Tier 2: keyword/Jaccard scan over body+tags for free-text "topic" queries
//
// Tier 3 (semantic embedding) is deferred until NN/GNN gate clears (PSN leg #10 UNGRADED).

function isoGroupLetter(query) {
  // "P" / "P-30" → "P"; null/undefined → null
  if (!query) return null;
  return String(query).trim()[0].toUpperCase();
}

function tokenize(text) {
  if (!text || typeof text !== "string") return new Set();
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9-]+/)
      .filter(t => t.length >= 2)
  );
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function vendorGradeMatchesFilters(g, q) {
  if (q.vendor && g.vendor !== q.vendor) return false;
  if (q.insert_geometry && g.geometry !== q.insert_geometry) return false;
  if (q.coating !== undefined && q.coating !== null) {
    if (g.coating !== q.coating) return false;
  }
  if (q.iso_group) {
    const letter = isoGroupLetter(q.iso_group);
    const fits = (g.iso_group_fit || []).some(f => f.startsWith(letter));
    if (!fits) return false;
  }
  // operation filter — vendor_grades don't carry operation directly;
  // implicit fit: roughing/finishing apply to most grades, so accept unless geometry rules out
  return true;
}

function vendorGradeToHit(g, score) {
  return {
    kind: "vendor_grade",
    content: `${g.vendor} ${g.grade} (${g.insertAnsi || "n/a"}) — ISO ${(g.iso_group_fit || []).join("/")}`,
    tags: [
      ...(g.iso_group_fit || []),
      g.geometry ? `geom-${g.geometry}` : null,
      g.coating ? `coating-${g.coating}` : null,
      `vendor-${g.vendor}`
    ].filter(Boolean),
    source: { vendor: g.vendor, grade: g.grade },
    relevance_score: score,
    vendor_grade_payload: {
      ansi: g.insertAnsi,
      vendor: g.vendor,
      grade: g.grade,
      geometry: g.geometry,
      coating: g.coating,
      suggested_vc_sfm: g.suggestedVcSfm,
      suggested_fz_ipr: g.suggestedFzIpr,
      life_minutes_at_target_vc: g.lifeMinutesAtTargetVc,
      iso_group_fit: g.iso_group_fit
    }
  };
}

function videoToHit(v, score) {
  return {
    kind: "video_segment",
    content: v.title || v.body?.slice(0, 200) || "(no content)",
    tags: v.tags || [],
    source: { video_id: v.video_id, segment_count: v.segments },
    relevance_score: score
  };
}

function tribalToHit(t, score) {
  return {
    kind: "tribal_tip",
    content: t.body || "(empty)",
    tags: t.tags || [],
    source: { tribal_id: t.id },
    relevance_score: score
  };
}

export function createTribalQueryEngine(corpus) {
  if (!corpus || typeof corpus !== "object") {
    throw new Error("createTribalQueryEngine: corpus is required");
  }
  const vendor_grades = corpus.vendor_grades || [];
  const video_segments = corpus.video_segments || [];
  const tribal_tips = corpus.tribal_tips || [];
  // Reject completely-empty corpus (configuration error per R12)
  if (vendor_grades.length === 0 && video_segments.length === 0 && tribal_tips.length === 0) {
    throw new Error("createTribalQueryEngine: corpus is empty — at least one of vendor_grades/video_segments/tribal_tips required");
  }

  const totalCorpusSize = vendor_grades.length + video_segments.length + tribal_tips.length;

  function query(q) {
    const t0 = performance.now();
    const topK = typeof q.top_k === "number" && q.top_k > 0 ? q.top_k : 5;
    const hits = [];

    // Tier 1: exact-match index lookup for vendor_grades
    if (q.iso_group || q.operation || q.vendor || q.insert_geometry || q.coating) {
      for (const g of vendor_grades) {
        if (vendorGradeMatchesFilters(g, q)) {
          // base score 0.85 for hard-constraint match
          hits.push(vendorGradeToHit(g, 0.85));
        }
      }
    }

    // Tier 2: keyword/Jaccard scan over body+tags
    if (q.topic) {
      const queryTokens = tokenize(q.topic);
      for (const v of video_segments) {
        const corpusTokens = tokenize((v.body || "") + " " + (v.tags || []).join(" "));
        const score = jaccard(queryTokens, corpusTokens);
        if (score > 0) hits.push(videoToHit(v, score));
      }
      for (const t of tribal_tips) {
        const corpusTokens = tokenize((t.body || "") + " " + (t.tags || []).join(" "));
        const score = jaccard(queryTokens, corpusTokens);
        if (score > 0) hits.push(tribalToHit(t, score));
      }
      // Also consider vendor-grades by their searchable text
      for (const g of vendor_grades) {
        const text = `${g.vendor} ${g.grade} ${g.insertAnsi || ""} ${(g.iso_group_fit || []).join(" ")} ${g.coating || ""}`;
        const corpusTokens = tokenize(text);
        const score = jaccard(queryTokens, corpusTokens);
        if (score > 0 && !hits.find(h => h.kind === "vendor_grade" && h.vendor_grade_payload?.grade === g.grade)) {
          hits.push(vendorGradeToHit(g, score));
        }
      }
    }

    // Sort + top-K
    hits.sort((a, b) => b.relevance_score - a.relevance_score);
    const trimmed = hits.slice(0, topK);

    const confidence = trimmed.length === 0
      ? 0
      : trimmed.reduce((s, h) => s + h.relevance_score, 0) / trimmed.length;

    return {
      hits: trimmed,
      total_corpus_size: totalCorpusSize,
      query_latency_ms: Math.round((performance.now() - t0) * 1000) / 1000,
      confidence: Math.max(0, Math.min(1, confidence))
    };
  }

  return { query };
}
