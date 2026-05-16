// course-mapper-lib.test.mjs
// Run: node --test H:/prism/scripts/lib/course-mapper-lib.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  NODE_KIND,
  PROVENANCE_SOURCE_DEFAULT,
  METADATA_CONFIDENCE_DEFAULT,
  SYLLABUS_CONFIDENCE_DEFAULT,
  FULL_TEXT_CONFIDENCE_DEFAULT,
  EXTRACTION_LEVEL_METADATA,
  EXTRACTION_LEVEL_SYLLABUS,
  EXTRACTION_LEVEL_FULL,
  COURSE_LAYER_BAND,
  parseCourseSlug,
  deptPrefix,
  deriveTagsFromCourse,
  buildCourseNodeId,
  buildCourseNode,
  nodesFromCatalog,
  nodesFromIndex,
  mergeCourseNodes,
  toGraphNode,
  edgesFromCourseNode,
  mergeIntoGraph,
} from "./course-mapper-lib.mjs";

const FIXED_NOW = "2026-05-16T01:00:00.000Z";

// ──────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("exposes the documented values", () => {
    assert.equal(NODE_KIND, "course-tribal");
    assert.equal(PROVENANCE_SOURCE_DEFAULT, "mit-ocw");
    assert.equal(METADATA_CONFIDENCE_DEFAULT, 0.6);
    assert.equal(SYLLABUS_CONFIDENCE_DEFAULT, 0.75);
    assert.equal(FULL_TEXT_CONFIDENCE_DEFAULT, 0.85);
    assert.equal(COURSE_LAYER_BAND, "L4a");
  });
});

// ──────────────────────────────────────────────────────────────────────────
// parseCourseSlug
// ──────────────────────────────────────────────────────────────────────────

describe("parseCourseSlug", () => {
  it("parses spring term", () => {
    assert.deepEqual(parseCourseSlug("6.046j-spring-2015"), { courseId: "6.046j", term: "spring-2015" });
  });

  it("parses fall term", () => {
    assert.deepEqual(parseCourseSlug("10.34-fall-2015"), { courseId: "10.34", term: "fall-2015" });
  });

  it("parses iap term", () => {
    assert.deepEqual(parseCourseSlug("18.06-iap-2020"), { courseId: "18.06", term: "iap-2020" });
  });

  it("handles missing term", () => {
    assert.deepEqual(parseCourseSlug("6.046j"), { courseId: "6.046j", term: "" });
  });

  it("handles trim + lowercase", () => {
    assert.deepEqual(parseCourseSlug(" 6.046J-Spring-2015 "), { courseId: "6.046J", term: "spring-2015" });
  });

  it("handles non-string", () => {
    assert.deepEqual(parseCourseSlug(null), { courseId: "", term: "" });
    assert.deepEqual(parseCourseSlug(42), { courseId: "", term: "" });
  });

  it("does NOT mis-parse hyphen-rich titles", () => {
    // "esd.342-spring-2006" — has multiple hyphens before term
    assert.deepEqual(parseCourseSlug("esd.342-spring-2006"), { courseId: "esd.342", term: "spring-2006" });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// deptPrefix
// ──────────────────────────────────────────────────────────────────────────

describe("deptPrefix", () => {
  it("extracts numeric prefix", () => {
    assert.equal(deptPrefix("6.046j"), "6");
    assert.equal(deptPrefix("10.34"), "10");
    assert.equal(deptPrefix("2.003"), "2");
  });

  it("handles letter-only prefix", () => {
    assert.equal(deptPrefix("esd.342"), "");
  });

  it("handles non-string", () => {
    assert.equal(deptPrefix(null), "");
    assert.equal(deptPrefix(42), "");
  });
});

// ──────────────────────────────────────────────────────────────────────────
// buildCourseNodeId
// ──────────────────────────────────────────────────────────────────────────

describe("buildCourseNodeId", () => {
  it("builds canonical id", () => {
    assert.equal(buildCourseNodeId("6.046j-spring-2015"), "course:mit-ocw:6.046j-spring-2015");
  });

  it("respects source", () => {
    assert.equal(buildCourseNodeId("c", "open-textbook"), "course:open-textbook:c");
  });

  it("lowercases and trims slug", () => {
    assert.equal(buildCourseNodeId("  6.046J-SPRING-2015  "), "course:mit-ocw:6.046j-spring-2015");
  });

  it("throws on empty slug", () => {
    assert.throws(() => buildCourseNodeId(""), /courseSlug required/);
    assert.throws(() => buildCourseNodeId(null), /courseSlug required/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// deriveTagsFromCourse
// ──────────────────────────────────────────────────────────────────────────

describe("deriveTagsFromCourse", () => {
  it("seeds from category keyword bag", () => {
    const tags = deriveTagsFromCourse({ courseId: "6.046j", category: "algorithms", title: "Algorithms" });
    assert.ok(tags.includes("algorithm"));
    assert.ok(tags.includes("complexity"));
  });

  it("adds department-derived tag", () => {
    const tags = deriveTagsFromCourse({ courseId: "2.003", category: "control", title: "Modeling" });
    assert.ok(tags.includes("mechanical"), `expected mechanical, got ${tags.join(",")}`);
  });

  it("extracts title tokens >= 4 chars, excludes stop-words", () => {
    const tags = deriveTagsFromCourse({ courseId: "x", category: "other", title: "Introduction to Algorithms with Trees" });
    assert.ok(tags.includes("algorithms"));
    assert.ok(tags.includes("trees"));
    assert.ok(!tags.includes("the"));
    assert.ok(!tags.includes("with"));
    assert.ok(!tags.includes("introduction")); // in stop-words
    assert.ok(!tags.includes("to"));
  });

  it("converts prismMapping entries to kebab-case tags", () => {
    const tags = deriveTagsFromCourse({
      courseId: "x", category: "other", title: "T",
      prismMapping: ["Speed_Feed_Calculator", "CAD_AI"],
    });
    assert.ok(tags.includes("speed-feed-calculator"));
    assert.ok(tags.includes("cad-ai"));
  });

  it("returns sorted unique array", () => {
    const tags = deriveTagsFromCourse({ courseId: "6", category: "algorithms", title: "Algorithm Algorithm" });
    assert.deepEqual([...tags].sort(), tags); // already sorted
    assert.equal(new Set(tags).size, tags.length); // unique
  });

  it("safe on null/missing input", () => {
    const t = deriveTagsFromCourse({});
    assert.ok(Array.isArray(t));
  });
});

// ──────────────────────────────────────────────────────────────────────────
// buildCourseNode
// ──────────────────────────────────────────────────────────────────────────

describe("buildCourseNode", () => {
  it("produces a full node from minimal input", () => {
    const node = buildCourseNode(
      { slug: "6.046j-spring-2015", title: "Design and Analysis of Algorithms", category: "algorithms" },
      { now: FIXED_NOW, extractedFrom: "TEST" },
    );
    assert.equal(node.id, "course:mit-ocw:6.046j-spring-2015");
    assert.equal(node.kind, NODE_KIND);
    assert.equal(node.layerBand, COURSE_LAYER_BAND);
    assert.equal(node.courseId, "6.046j");
    assert.equal(node.term, "spring-2015");
    assert.equal(node.category, "algorithms");
    assert.equal(node.title, "Design and Analysis of Algorithms");
    assert.equal(node.provenance.extractedAt, FIXED_NOW);
    assert.equal(node.provenance.extractedFrom, "TEST");
    assert.equal(node.provenance.confidence, METADATA_CONFIDENCE_DEFAULT);
    assert.equal(node.embedding, null);
    assert.deepEqual(node.lateralWires, []);
    // repBag is a Set in our shape (downstream cosine/jaccard consume it)
    assert.ok(node.repBag instanceof Set);
    assert.ok(node.repBag.size > 0);
    assert.ok(Array.isArray(node.tags));
  });

  it("confidence rises with extraction level", () => {
    const meta = buildCourseNode({ slug: "x", title: "T" }, { extractionLevel: EXTRACTION_LEVEL_METADATA, now: FIXED_NOW });
    const syl  = buildCourseNode({ slug: "x", title: "T" }, { extractionLevel: EXTRACTION_LEVEL_SYLLABUS, now: FIXED_NOW });
    const full = buildCourseNode({ slug: "x", title: "T" }, { extractionLevel: EXTRACTION_LEVEL_FULL,     now: FIXED_NOW });
    assert.ok(syl.provenance.confidence > meta.provenance.confidence);
    assert.ok(full.provenance.confidence > syl.provenance.confidence);
  });

  it("explicit confidence overrides extraction-level default", () => {
    const n = buildCourseNode({ slug: "x" }, { confidence: 0.42, now: FIXED_NOW });
    assert.equal(n.provenance.confidence, 0.42);
  });

  it("rejects non-object input", () => {
    assert.throws(() => buildCourseNode(null), /must be object/);
    assert.throws(() => buildCourseNode("string"), /must be object/);
  });

  it("rejects missing slug/id/courseId", () => {
    assert.throws(
      () => buildCourseNode({ title: "no-id" }),
      /must have slug \/ id \/ courseId/,
    );
  });

  it("prismMapping array passthrough", () => {
    const n = buildCourseNode(
      { slug: "x", prismMapping: ["Speed_Feed_Calculator", "CAD_AI"] },
      { now: FIXED_NOW },
    );
    assert.deepEqual(n.prismMapping, ["Speed_Feed_Calculator", "CAD_AI"]);
  });

  it("prismMapping object form → keys", () => {
    const n = buildCourseNode(
      { slug: "x", prismMapping: { Speed_Feed_Calculator: [], CAD_AI: [] } },
      { now: FIXED_NOW },
    );
    assert.deepEqual(n.prismMapping.sort(), ["CAD_AI", "Speed_Feed_Calculator"]);
  });

  it("assigns L5/L6/L7 via classifySchool/schoolChain", () => {
    const n = buildCourseNode(
      { slug: "x", category: "algorithms", title: "Algorithms" },
      { now: FIXED_NOW },
    );
    // discipline and galaxy must be non-empty strings (chain produces them)
    assert.ok(typeof n.discipline === "string" && n.discipline.length > 0);
    assert.ok(typeof n.galaxy === "string" && n.galaxy.length > 0);
    assert.ok(typeof n.school === "string");
  });
});

// ──────────────────────────────────────────────────────────────────────────
// nodesFromCatalog
// ──────────────────────────────────────────────────────────────────────────

describe("nodesFromCatalog", () => {
  it("emits one node per catalog course", () => {
    const catalog = {
      courses: [
        { name: "6.046j-spring-2015", title: "Algorithms", category: "algorithms" },
        { name: "2.003-spring-2005", title: "Dynamics", category: "control" },
      ],
    };
    const ns = nodesFromCatalog(catalog, { now: FIXED_NOW });
    assert.equal(ns.length, 2);
    assert.ok(ns.find(n => n.courseId === "6.046j"));
    assert.ok(ns.find(n => n.courseId === "2.003"));
  });

  it("de-dupes identical catalog entries", () => {
    const catalog = {
      courses: [
        { name: "x", title: "A" },
        { name: "x", title: "B" }, // same slug, would produce same id
      ],
    };
    const ns = nodesFromCatalog(catalog, { now: FIXED_NOW });
    assert.equal(ns.length, 1);
  });

  it("skips malformed entries silently (boundary)", () => {
    const catalog = {
      courses: [
        null,
        { title: "no slug" },
        { name: "ok" },
      ],
    };
    const ns = nodesFromCatalog(catalog, { now: FIXED_NOW });
    assert.equal(ns.length, 1);
  });

  it("returns [] on missing/bad catalog", () => {
    assert.deepEqual(nodesFromCatalog(null), []);
    assert.deepEqual(nodesFromCatalog({}), []);
    assert.deepEqual(nodesFromCatalog({ courses: "nope" }), []);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// nodesFromIndex
// ──────────────────────────────────────────────────────────────────────────

describe("nodesFromIndex", () => {
  it("emits from coursesByCategory (string entries become slugs)", () => {
    const idx = {
      coursesByCategory: {
        algorithms: ["6.046j-spring-2015"],
        control:    [{ slug: "2.003-spring-2005", title: "Dynamics" }],
      },
    };
    const ns = nodesFromIndex(idx, { now: FIXED_NOW });
    assert.equal(ns.length, 2);
    assert.ok(ns.find(n => n.courseId === "6.046j" && n.category === "algorithms"));
    assert.ok(ns.find(n => n.courseId === "2.003" && n.category === "control"));
  });

  it("category hint passes through only when course lacks own", () => {
    const idx = {
      coursesByCategory: {
        algorithms: [{ slug: "x", category: "manufacturing" /* own category wins */ }],
      },
    };
    const ns = nodesFromIndex(idx, { now: FIXED_NOW });
    assert.equal(ns[0].category, "manufacturing");
  });

  it("merges with index.courses array form", () => {
    const idx = {
      coursesByCategory: { algorithms: ["a"] },
      courses: [{ slug: "b" }],
    };
    const ns = nodesFromIndex(idx, { now: FIXED_NOW });
    assert.equal(ns.length, 2);
  });

  it("returns [] on empty input", () => {
    assert.deepEqual(nodesFromIndex({}), []);
    assert.deepEqual(nodesFromIndex(null), []);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// mergeCourseNodes
// ──────────────────────────────────────────────────────────────────────────

describe("mergeCourseNodes", () => {
  const mk = (id, conf, tags = [], from = "z") => ({
    id, tags, provenance: { confidence: conf, extractedFrom: from }
  });

  it("higher confidence wins on duplicate", () => {
    const a = mk("x", 0.6);
    const b = mk("x", 0.85);
    const m = mergeCourseNodes([a], [b]);
    assert.equal(m.length, 1);
    assert.equal(m[0].provenance.confidence, 0.85);
  });

  it("more-tags wins on confidence tie", () => {
    const a = mk("x", 0.6, ["t1"]);
    const b = mk("x", 0.6, ["t1", "t2"]);
    const m = mergeCourseNodes([a], [b]);
    assert.equal(m[0].tags.length, 2);
  });

  it("deterministic ordering by id ASC", () => {
    const m = mergeCourseNodes([mk("z", 0.6), mk("a", 0.6)], [mk("m", 0.6)]);
    assert.deepEqual(m.map(n => n.id), ["a", "m", "z"]);
  });

  it("rejects non-array args", () => {
    assert.throws(() => mergeCourseNodes("nope", []), /both args must be arrays/);
    assert.throws(() => mergeCourseNodes([], "nope"), /both args must be arrays/);
  });

  it("disjoint inputs produce union", () => {
    const m = mergeCourseNodes([mk("a", 0.6)], [mk("b", 0.6)]);
    assert.equal(m.length, 2);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// toGraphNode + edgesFromCourseNode + mergeIntoGraph
// ──────────────────────────────────────────────────────────────────────────

describe("toGraphNode", () => {
  it("flattens TribalCourseNode → graph-node shape", () => {
    const n = buildCourseNode({ slug: "x", title: "T", category: "algorithms" }, { now: FIXED_NOW });
    const g = toGraphNode(n);
    assert.equal(g.id, n.id);
    assert.equal(g.kind, n.kind);
    assert.equal(g.title, n.title);
    assert.equal(g.meta.category, "algorithms");
    assert.equal(g.meta.confidence, METADATA_CONFIDENCE_DEFAULT);
  });

  it("rejects non-object", () => {
    assert.throws(() => toGraphNode(null), /must be object/);
  });
});

describe("edgesFromCourseNode", () => {
  it("emits one edge per prismMapping entry", () => {
    const n = buildCourseNode(
      { slug: "x", prismMapping: ["Speed_Feed_Calculator", "CAD_AI"] },
      { now: FIXED_NOW },
    );
    const es = edgesFromCourseNode(n);
    assert.equal(es.length, 2);
    assert.equal(es[0].from, n.id);
    assert.equal(es[0].kind, "course-supports");
    assert.ok(typeof es[0].weight === "number");
  });

  it("kebab-case sanitizes target ids", () => {
    const n = buildCourseNode(
      { slug: "x", prismMapping: ["Speed Feed!"] },
      { now: FIXED_NOW },
    );
    const es = edgesFromCourseNode(n);
    assert.match(es[0].to, /^product:speed-feed-?$/);
  });

  it("empty / missing mapping → no edges", () => {
    assert.deepEqual(edgesFromCourseNode({}), []);
    assert.deepEqual(edgesFromCourseNode({ prismMapping: [] }), []);
  });
});

describe("mergeIntoGraph", () => {
  it("appends new nodes + edges", () => {
    const g0 = { nodes: [], edges: [] };
    const cn = buildCourseNode(
      { slug: "x", prismMapping: ["Speed_Feed_Calculator"] },
      { now: FIXED_NOW },
    );
    const { graph, stats } = mergeIntoGraph(g0, [cn]);
    assert.equal(stats.added, 1);
    assert.equal(stats.replaced, 0);
    assert.equal(stats.edgesAdded, 1);
    assert.equal(graph.nodes.length, 1);
    assert.equal(graph.edges.length, 1);
  });

  it("replaces existing nodes by id (newer wins)", () => {
    const cn = buildCourseNode({ slug: "x" }, { now: FIXED_NOW });
    const oldNode = { id: cn.id, kind: "stale", title: "old" };
    const { graph, stats } = mergeIntoGraph({ nodes: [oldNode], edges: [] }, [cn]);
    assert.equal(stats.added, 0);
    assert.equal(stats.replaced, 1);
    assert.equal(graph.nodes[0].kind, "course-tribal");
  });

  it("deduplicates edges by (from,to,kind)", () => {
    const cn = buildCourseNode({ slug: "x", prismMapping: ["A"] }, { now: FIXED_NOW });
    const existingEdge = { from: cn.id, to: "product:a", kind: "course-supports", weight: 0.5 };
    const { graph, stats } = mergeIntoGraph({ nodes: [], edges: [existingEdge] }, [cn]);
    assert.equal(stats.edgesAdded, 0);
    assert.equal(graph.edges.length, 1);
  });

  it("does not mutate input graph", () => {
    const g0 = { nodes: [], edges: [], meta: { unchanged: true } };
    const before = JSON.stringify(g0);
    const cn = buildCourseNode({ slug: "x" }, { now: FIXED_NOW });
    mergeIntoGraph(g0, [cn]);
    assert.equal(JSON.stringify(g0), before);
  });

  it("rejects non-object graph / non-array nodes", () => {
    assert.throws(() => mergeIntoGraph(null, []), /graph must be object/);
    assert.throws(() => mergeIntoGraph({}, "nope"), /courseNodes must be array/);
  });

  it("preserves graph metadata fields", () => {
    const g0 = { nodes: [], edges: [], meta: { totalCourses: 92 }, custom: "x" };
    const cn = buildCourseNode({ slug: "x" }, { now: FIXED_NOW });
    const { graph } = mergeIntoGraph(g0, [cn]);
    assert.equal(graph.meta.totalCourses, 92);
    assert.equal(graph.custom, "x");
  });

  it("ignores malformed input nodes", () => {
    const { graph, stats } = mergeIntoGraph({ nodes: [], edges: [] }, [null, { /* no id */ }, "string"]);
    assert.equal(stats.added, 0);
    assert.equal(graph.nodes.length, 0);
  });
});
