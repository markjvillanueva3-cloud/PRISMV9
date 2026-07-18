// Hermetic tests for U-LATHE-TRIBAL-QUERY-DISPATCHER
// Design memo: reference_lathe_tribal_query_dispatcher_design_2026_05_27
//
// Query the lathe tribal corpus (vendor grades + tribal tips + video segments + PDF pages)
// via structured filters + free-text + top-K ranking.
//
// 3-tier search:
//   Tier 1: exact-match index lookup (sub-millisecond)
//   Tier 2: keyword scan with Jaccard scoring (10-100ms)
//   Tier 3: semantic — DEFERRED until NN/GNN gate clears
//
// Run: node --test scripts/lib/lathe-tribal-query-engine.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTribalQueryEngine } from "./lathe-tribal-query-engine.mjs";

// ── Synthetic corpus (small, deterministic) ────────────────────────────────
const SYNTHETIC_CORPUS = {
  vendor_grades: [
    {
      vendor: "Kennametal",
      grade: "KCM35",
      insertAnsi: "CNMG-432-PR",
      geometry: "C",
      coating: "PVD-TiAlN",
      iso_group_fit: ["P-30", "M-25"],
      suggestedVcSfm: [350, 420],
      suggestedFzIpr: [0.008, 0.014],
      lifeMinutesAtTargetVc: 18
    },
    {
      vendor: "Sandvik",
      grade: "GC4325",
      insertAnsi: "DNMG-432-MF",
      geometry: "D",
      coating: "PVD-TiAlN",
      iso_group_fit: ["P-30"],
      suggestedVcSfm: [320, 400],
      suggestedFzIpr: [0.006, 0.012],
      lifeMinutesAtTargetVc: 22
    },
    {
      vendor: "Sumitomo",
      grade: "BNX10",
      insertAnsi: "CNMG-432",
      geometry: "C",
      coating: null,
      iso_group_fit: ["H-30", "H-35"],
      suggestedVcSfm: [400, 800],
      suggestedFzIpr: [0.003, 0.008],
      lifeMinutesAtTargetVc: 25
    }
  ],
  video_segments: [
    { video_id: "abc123", title: "G71 Roughing on Haas Lathe", body: "G71 stock removal cycle on the lathe roughing operation steel ISO-P", segments: 50, tags: ["g71", "roughing", "haas", "iso-p"] },
    { video_id: "xyz789", title: "Sub-spindle pickoff on Mazak", body: "sub-spindle pickoff back-work synchronization Mazak Mazatrol", segments: 80, tags: ["sub-spindle", "pickoff", "mazak"] }
  ],
  tribal_tips: [
    { id: "tip-1", body: "When threading stainless 304, use 6-pass G76 with finish at A29 infeed angle", tags: ["g76", "threading", "stainless", "iso-m"] }
  ]
};

describe("createTribalQueryEngine — factory", () => {
  it("returns an engine with required query API", () => {
    const engine = createTribalQueryEngine(SYNTHETIC_CORPUS);
    assert.equal(typeof engine.query, "function");
  });
});

describe("query — Tier 1 exact-match (hard constraints)", () => {
  const engine = createTribalQueryEngine(SYNTHETIC_CORPUS);

  it("iso_group=P + operation=roughing returns Kennametal+Sandvik vendor_grades", () => {
    const r = engine.query({ iso_group: "P", operation: "roughing", top_k: 5 });
    assert.ok(r.hits.length >= 2, "should match 2 ISO-P-30 grades");
    const grades = r.hits.filter(h => h.kind === "vendor_grade").map(h => h.vendor_grade_payload?.grade);
    assert.ok(grades.includes("KCM35"));
    assert.ok(grades.includes("GC4325"));
  });

  it("iso_group=H returns only Sumitomo BNX10 (hard-turning grade)", () => {
    const r = engine.query({ iso_group: "H", top_k: 5 });
    const vendor_grades = r.hits.filter(h => h.kind === "vendor_grade");
    assert.ok(vendor_grades.length >= 1);
    assert.ok(vendor_grades.some(h => h.vendor_grade_payload?.grade === "BNX10"));
  });

  it("vendor=Sandvik filter limits results to Sandvik grades", () => {
    const r = engine.query({ vendor: "Sandvik", top_k: 10 });
    for (const h of r.hits.filter(h => h.kind === "vendor_grade")) {
      assert.equal(h.vendor_grade_payload.vendor, "Sandvik");
    }
  });

  it("insert_geometry=C filter limits results to rhombic C-class inserts", () => {
    const r = engine.query({ insert_geometry: "C", top_k: 10 });
    const grades = r.hits.filter(h => h.kind === "vendor_grade");
    assert.ok(grades.length >= 1);
    for (const h of grades) {
      assert.equal(h.vendor_grade_payload.geometry, "C");
    }
  });
});

describe("query — Tier 2 keyword scan over body text", () => {
  const engine = createTribalQueryEngine(SYNTHETIC_CORPUS);

  it("topic='sub-spindle' returns the Mazak pickoff video", () => {
    const r = engine.query({ topic: "sub-spindle pickoff", top_k: 5 });
    const videos = r.hits.filter(h => h.kind === "video_segment");
    assert.ok(videos.length >= 1);
    assert.ok(videos.some(h => h.source?.video_id === "xyz789"));
  });

  it("topic='G71 roughing' returns the Haas G71 video", () => {
    const r = engine.query({ topic: "G71 roughing", top_k: 5 });
    const videos = r.hits.filter(h => h.kind === "video_segment");
    assert.ok(videos.some(h => h.source?.video_id === "abc123"));
  });
});

describe("query — top_k + response shape contract", () => {
  const engine = createTribalQueryEngine(SYNTHETIC_CORPUS);

  it("respects top_k=1", () => {
    const r = engine.query({ iso_group: "P", top_k: 1 });
    assert.equal(r.hits.length, 1);
  });

  it("response carries total_corpus_size + query_latency_ms + confidence", () => {
    const r = engine.query({ iso_group: "P", top_k: 5 });
    assert.equal(typeof r.total_corpus_size, "number");
    assert.equal(typeof r.query_latency_ms, "number");
    assert.equal(typeof r.confidence, "number");
    assert.ok(r.confidence >= 0 && r.confidence <= 1);
  });

  it("each hit carries relevance_score in [0,1] + source provenance", () => {
    const r = engine.query({ iso_group: "P", top_k: 5 });
    for (const h of r.hits) {
      assert.ok(["vendor_grade", "tribal_tip", "video_segment", "pdf_page"].includes(h.kind));
      assert.equal(typeof h.relevance_score, "number");
      assert.ok(h.relevance_score >= 0 && h.relevance_score <= 1);
      assert.equal(typeof h.content, "string");
      assert.ok(Array.isArray(h.tags));
    }
  });
});

describe("query — R12 fail-loud on empty corpus", () => {
  it("returns hits=[] + zero confidence when corpus has no matches (no silent default)", () => {
    const engine = createTribalQueryEngine(SYNTHETIC_CORPUS);
    const r = engine.query({ vendor: "NonexistentVendor", top_k: 5 });
    assert.equal(r.hits.length, 0);
    assert.equal(r.confidence, 0);
  });

  it("throws when corpus is absent (configuration error)", () => {
    assert.throws(() => createTribalQueryEngine(null), /corpus/i);
    assert.throws(() => createTribalQueryEngine({}), /corpus/i);
  });
});
