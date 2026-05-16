// course-mapper-lib.mjs
// Pure (no I/O) transforms that convert MIT OCW course metadata into
// TribalCourseNode objects consumable by prism_knowledge:tribal_search /
// tribal_suggest and emittable into the /system-viz graph as L4a nodes.
//
// Composition contract:
//   - classifySchool / classifyDomain reused from tribal-graph-clusters.mjs
//     (no fork — same L0-L8 taxonomy)
//   - confidence pinned to METADATA_CONFIDENCE_DEFAULT (0.6) for metadata-only
//     entries; iter 4+ extraction lifts to FULL_TEXT_CONFIDENCE_DEFAULT.
//
// All functions here are pure — no fs/network/random/Date.now() side effects
// (except buildCourseNode which takes `now` as opt arg for testability).

import {
  classifyDomain,
  classifySchool,
  schoolChain,
  normalizeTip,
} from "./tribal-graph-clusters.mjs";

// ──────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────

export const NODE_KIND = "course-tribal";
export const PROVENANCE_SOURCE_DEFAULT = "mit-ocw";
export const METADATA_CONFIDENCE_DEFAULT = 0.6;
export const SYLLABUS_CONFIDENCE_DEFAULT = 0.75;
export const FULL_TEXT_CONFIDENCE_DEFAULT = 0.85;
export const EXTRACTION_LEVEL_METADATA = "metadata-only";
export const EXTRACTION_LEVEL_SYLLABUS = "syllabus";
export const EXTRACTION_LEVEL_FULL = "full-text";
export const COURSE_LAYER_BAND = "L4a";

// MIT department prefix → discipline hint (used as fallback when category absent)
const MIT_DEPT_DISCIPLINE = Object.freeze({
  "1":   "civil",          // Civil/Environmental Eng
  "2":   "mechanical",     // Mechanical Eng
  "3":   "materials",      // Materials Science
  "4":   "architecture",
  "5":   "chemistry",
  "6":   "eecs",           // Electrical Eng / Computer Science
  "7":   "biology",
  "8":   "physics",
  "9":   "neuroscience",   // Brain & Cognitive Sci
  "10":  "chem_eng",
  "11":  "urban_planning",
  "12":  "earth_sci",
  "14":  "economics",
  "15":  "management",
  "16":  "aerospace",
  "17":  "political_sci",
  "18":  "math",
  "20":  "bio_eng",
  "21":  "humanities",
  "22":  "nuclear_eng",
  "24":  "philosophy",
});

// Course-category → tribal-knowledge keyword bag (for repBag seeding)
const CATEGORY_KEYWORD_BAG = Object.freeze({
  manufacturing:           ["manufacturing", "machining", "production", "cnc", "shop"],
  algorithms:              ["algorithm", "complexity", "data-structure", "graph", "search"],
  optimization:            ["optimization", "linear-program", "convex", "gradient", "constraint"],
  machine_learning:        ["machine-learning", "neural", "model", "training", "inference"],
  ml_ai:                   ["machine-learning", "ai", "neural", "model", "inference"],
  statistics_probability:  ["statistics", "probability", "bayes", "distribution", "estimator"],
  statistics:              ["statistics", "probability", "estimator"],
  control_dynamics:        ["control", "dynamics", "pid", "feedback", "state-space"],
  control:                 ["control", "feedback", "pid"],
  signal_processing:       ["signal", "fft", "filter", "transform", "fourier"],
  signal:                  ["signal", "fft", "filter"],
  graphics_geometry:       ["graphics", "geometry", "render", "mesh", "transform"],
  cad_graphics:            ["cad", "geometry", "mesh", "transform"],
  materials:               ["material", "metal", "alloy", "strength", "fatigue"],
  databases:               ["database", "sql", "transaction", "index", "query"],
  security:                ["security", "crypto", "auth", "vulnerability", "attack"],
  human_factors:           ["ergonomics", "ui", "interaction", "cognitive"],
  systems_engineering:     ["system", "requirement", "architecture", "verification"],
  systems:                 ["system", "architecture"],
  parallel_computing:      ["parallel", "concurrent", "thread", "race", "lock"],
  software_engineering:    ["software", "design", "test", "refactor", "pattern"],
});

// ──────────────────────────────────────────────────────────────────────────
// Pure helpers
// ──────────────────────────────────────────────────────────────────────────

/**
 * Parse "6.046j-spring-2015" → { courseId: "6.046j", term: "spring-2015" }.
 * Returns { courseId, term } with term="" when not present.
 */
export function parseCourseSlug(slug) {
  if (typeof slug !== "string") {
    return { courseId: "", term: "" };
  }
  const trimmed = slug.trim();
  // Term pattern: spring|fall|summer|winter|january|iap + 4-digit year
  const m = trimmed.match(/^(.+?)-(spring|fall|summer|winter|january|iap)-(\d{4})$/i);
  if (m) {
    return { courseId: m[1], term: `${m[2].toLowerCase()}-${m[3]}` };
  }
  return { courseId: trimmed, term: "" };
}

/**
 * Extract the MIT department prefix from a course id ("6.046j" → "6").
 * Returns "" when the id doesn't start with digits.
 */
export function deptPrefix(courseId) {
  if (typeof courseId !== "string") return "";
  const m = courseId.match(/^(\d+)/);
  return m ? m[1] : "";
}

/**
 * Derive a tag bag for the course from courseId, title, and category.
 * Pure + deterministic — same input always produces the same sorted set.
 * Returns: array of unique lowercased tags, sorted ASC.
 */
export function deriveTagsFromCourse(course) {
  const tags = new Set();
  const addAll = (xs) => { for (const x of xs) if (x && typeof x === "string") tags.add(x.toLowerCase()); };

  const cat = (course?.category || course?.subjectArea || "other").toLowerCase();
  if (CATEGORY_KEYWORD_BAG[cat]) addAll(CATEGORY_KEYWORD_BAG[cat]);

  // Department-level tag
  const dept = deptPrefix(course?.courseId || course?.id || "");
  const disc = MIT_DEPT_DISCIPLINE[dept];
  if (disc) tags.add(disc);

  // Title token extraction (length >= 4 chars, alpha only, lowercased)
  const title = String(course?.title || "");
  for (const tok of title.toLowerCase().split(/[^a-z]+/)) {
    if (tok.length >= 4 && !STOP_WORDS.has(tok)) tags.add(tok);
  }

  // prismMapping entries become tags. Sanitize for hostile inputs — strip
  // all non [a-z0-9_-] and trim leading/trailing dashes so unicode/control
  // chars in upstream JSON can't contaminate the embedding signal.
  if (Array.isArray(course?.prismMapping)) {
    for (const m of course.prismMapping) {
      if (typeof m !== "string") continue;
      const clean = m.toLowerCase().replace(/_/g, "-").replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (clean.length > 0) tags.add(clean);
    }
  }
  return [...tags].sort();
}

// Lightweight stop-word list for title token filtering. Aim is to exclude
// connectives that produce uninformative embedding tokens — NOT a full NLP
// stop-list. Sorted alphabetically for diff-friendliness.
const STOP_WORDS = new Set([
  "an", "and", "are", "but", "for", "from", "into", "introduction", "its",
  "not", "the", "this", "their", "they", "these", "those", "to", "with",
]);

/**
 * Build a deterministic stable id for a course node.
 * "course:mit:6.046j-spring-2015" — collision-proof, lowercase, kebab.
 */
export function buildCourseNodeId(courseSlug, source = PROVENANCE_SOURCE_DEFAULT) {
  const slug = String(courseSlug || "").toLowerCase().trim();
  const src = String(source || PROVENANCE_SOURCE_DEFAULT).toLowerCase().trim();
  if (!slug) throw new Error("buildCourseNodeId: courseSlug required");
  return `course:${src}:${slug}`;
}

/**
 * Build a TribalCourseNode from a single course metadata entry.
 * `now` is injectable for test reproducibility.
 *
 * Required `course` fields: courseId OR id (slug form). Everything else is
 * optional; missing values get safe defaults.
 */
export function buildCourseNode(course, opts = {}) {
  if (!course || typeof course !== "object") {
    throw new TypeError("buildCourseNode: course must be object");
  }
  const {
    source = PROVENANCE_SOURCE_DEFAULT,
    extractionLevel = EXTRACTION_LEVEL_METADATA,
    confidence = null, // null → derive from extractionLevel
    extractedFrom = "unknown",
    now = new Date().toISOString(),
  } = opts;

  // Slug: prefer explicit, else compose from courseId+term, else just courseId
  const slug = course.slug
    || course.id
    || (course.courseId && course.term ? `${course.courseId}-${course.term}` : course.courseId)
    || "";
  if (!slug) throw new Error("buildCourseNode: course must have slug / id / courseId");

  const parsed = parseCourseSlug(slug);
  const courseId = course.courseId || parsed.courseId;
  const term = course.term || parsed.term;

  const id = buildCourseNodeId(slug, source);
  const title = String(course.title || courseId || slug);
  const category = String(course.category || course.subjectArea || "other").toLowerCase();

  // Compose tag bag and rep bag (rep is a SET for downstream cosine + jaccard)
  const tags = deriveTagsFromCourse({ ...course, courseId });
  const repBag = new Set(tags);

  // Classify via tribal-graph-clusters helpers — feed a synthetic tip shape
  const tipForClassify = normalizeTip({
    id: id,
    title,
    body: `${title}. Category: ${category}. Dept ${deptPrefix(courseId)}.`,
    category,
    repBag: [...repBag],
  }, extractedFrom);

  // classifyDomain returns an ARRAY of domain codes (multi-domain support).
  // classifySchool returns a { code, score, matched } object. Different
  // shapes — extract correctly. Falsy / empty results fall back to the
  // uncategorized buckets so downstream schoolChain produces a valid
  // L5→L8 walk instead of leaving school/discipline/galaxy empty.
  const domainResult = classifyDomain(tipForClassify);
  const schoolResult = classifySchool(tipForClassify);
  const domain = Array.isArray(domainResult)
    ? (domainResult[0] || "X_unknown")
    : (domainResult?.code || domainResult || "X_unknown");
  const school = (schoolResult && typeof schoolResult === "object" && !Array.isArray(schoolResult))
    ? (schoolResult.code || "Z_uncategorized")
    : (schoolResult || "Z_uncategorized");
  // Preserve full multi-domain array for downstream consumers that benefit.
  const domains = Array.isArray(domainResult) ? domainResult.filter(d => typeof d === "string" && d.length > 0) : [domain];
  const chain = schoolChain(school);
  // chain = ["L5:<school>", "L6:<discipline>", "L7:<galaxy>", "L8:..."]
  const [l5, l6, l7] = chain;

  // Confidence: explicit → use; else derive from extraction level
  const finalConfidence = confidence != null
    ? confidence
    : (extractionLevel === EXTRACTION_LEVEL_FULL ? FULL_TEXT_CONFIDENCE_DEFAULT
       : extractionLevel === EXTRACTION_LEVEL_SYLLABUS ? SYLLABUS_CONFIDENCE_DEFAULT
       : METADATA_CONFIDENCE_DEFAULT);

  // prismMapping passthrough (array preferred; object accepted).
  // Filter reserved JS object keys (__proto__/constructor/prototype) so hostile
  // upstream JSON can't pollute downstream tags or emit dangling product:X edges.
  const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
  let prismMapping = [];
  if (Array.isArray(course.prismMapping)) {
    prismMapping = course.prismMapping.filter(k => typeof k === "string" && !RESERVED_KEYS.has(k));
  } else if (course.prismMapping && typeof course.prismMapping === "object") {
    prismMapping = Object.keys(course.prismMapping).filter(k => !RESERVED_KEYS.has(k));
  }

  return {
    id,
    kind: NODE_KIND,
    layerBand: COURSE_LAYER_BAND,
    source,
    title,
    courseId,
    term,
    category,
    domain,
    domains,    // full multi-domain array (classifyDomain returns multiple)
    school,
    discipline: l6 ? l6.replace(/^L6:/, "") : "",
    galaxy:     l7 ? l7.replace(/^L7:/, "") : "",
    prismMapping,
    tags,
    repBag,
    provenance: {
      extractedFrom,
      extractedAt: now,
      extractionLevel,
      confidence: finalConfidence,
    },
    embedding: null,         // populated by iter 4 (embedding pass)
    lateralWires: [],        // populated by iter 4 (cosine wires)
  };
}

/**
 * Build nodes from a PRISM_COURSE_CATALOG.json shape.
 * The catalog.courses[] entries may have missing fields; tolerant.
 */
export function nodesFromCatalog(catalog, opts = {}) {
  const courses = catalog && Array.isArray(catalog.courses) ? catalog.courses : [];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < courses.length; i++) {
    const c = courses[i];
    if (!c || typeof c !== "object") continue;
    // Catalog entries may use `name` for the slug (observed at audit time)
    const slug = c.slug || c.id || c.name || c.courseId || "";
    if (!slug) continue;
    const id = buildCourseNodeId(slug, opts.source || PROVENANCE_SOURCE_DEFAULT);
    if (seen.has(id)) continue; // de-dupe identical entries
    seen.add(id);
    // No silent try/catch — buildCourseNode failures surface to caller per
    // R12 fail-loud. Pre-filter above already drops missing-slug entries.
    const node = buildCourseNode({ ...c, slug }, {
      ...opts,
      extractedFrom: opts.extractedFrom || "PRISM_COURSE_CATALOG.json",
    });
    out.push(node);
  }
  return out;
}

/**
 * Build nodes from MIT_COURSE_INDEX.json shape.
 * Index has coursesByCategory and may have `courses` keyed differently.
 * Tolerant of either shape.
 */
export function nodesFromIndex(index, opts = {}) {
  const out = [];
  const seen = new Set();
  // Invert prismMapping ONCE so each course gets its product-targets array.
  // MIT_COURSE_INDEX shape is {<product>: [<courseId>, ...]} — we need the
  // per-course-id reverse map to attach products to each visited course.
  const productsByCourseId = buildPrismMappingByCourseId(index?.prismMapping);

  const visit = (course, categoryHint) => {
    if (!course || typeof course !== "object") return;
    // Index courses use `id` for "6.001" and `name` for the human title.
    // `file` is the zip name ("6.001-spring-2005.zip") — strip .zip for slug.
    const fileSlug = typeof course.file === "string" ? course.file.replace(/\.zip$/i, "") : "";
    const slug = course.slug || fileSlug || course.id || course.courseId || "";
    if (!slug) return;
    const id = buildCourseNodeId(slug, opts.source || PROVENANCE_SOURCE_DEFAULT);
    if (seen.has(id)) return;
    seen.add(id);

    // Reverse-lookup of prismMapping. Course ids in mapping may be slightly
    // different from the file slug (e.g., "6.046J" vs "6.046j-spring-2015").
    // Match on either the raw id field or the courseId prefix (case-insensitive).
    const matchedProducts = lookupProductsForCourse(productsByCourseId, course.id || course.courseId || slug);

    try {
      const node = buildCourseNode(
        {
          ...course,
          slug,
          title: course.title || course.name,
          courseId: course.id || course.courseId,
          category: course.category || categoryHint,
          prismMapping: course.prismMapping || matchedProducts,
        },
        { ...opts, extractedFrom: opts.extractedFrom || "MIT_COURSE_INDEX.json" }
      );
      out.push(node);
    } catch { /* skip malformed */ }
  };

  // coursesByCategory may be (a) {cat: {priority,description,courses:[...]}}
  //                     or (b) {cat: [...]} (older shape we tolerated before)
  // Filter reserved JS keys to prevent prototype-pollution emission paths.
  const RESERVED_CAT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
  if (index?.coursesByCategory && typeof index.coursesByCategory === "object") {
    for (const [cat, val] of Object.entries(index.coursesByCategory)) {
      if (RESERVED_CAT_KEYS.has(cat)) continue;
      if (Array.isArray(val)) {
        for (const c of val) visit(typeof c === "string" ? { slug: c } : c, cat);
      } else if (val && typeof val === "object") {
        if (Array.isArray(val.courses)) {
          for (const c of val.courses) visit(typeof c === "string" ? { slug: c } : c, cat);
        } else {
          visit(val, cat);
        }
      }
    }
  }
  if (Array.isArray(index?.courses)) for (const c of index.courses) visit(c, null);
  return out;
}

/**
 * Invert a prismMapping object {<product>: [<courseId>, ...]} into a per-course
 * lookup: Map<lowercased-courseId, array-of-products>. Pure.
 */
export function buildPrismMappingByCourseId(prismMapping) {
  const out = new Map();
  if (!prismMapping || typeof prismMapping !== "object") return out;
  for (const [product, courseIds] of Object.entries(prismMapping)) {
    if (!Array.isArray(courseIds)) continue;
    for (const cid of courseIds) {
      if (typeof cid !== "string") continue;
      const key = cid.toLowerCase();
      if (!out.has(key)) out.set(key, []);
      out.get(key).push(product);
    }
  }
  return out;
}

/**
 * Look up products for a course id with case-insensitive + prefix matching.
 * "6.046j-spring-2015" matches the prismMapping entry "6.046J".
 */
export function lookupProductsForCourse(productsByCourseId, courseId) {
  if (!productsByCourseId || !courseId) return [];
  const key = String(courseId).toLowerCase();
  if (productsByCourseId.has(key)) return [...productsByCourseId.get(key)];
  // Prefix match: catalog slug "6.046j-spring-2015" → mapping key "6.046j"
  for (const [mkey, products] of productsByCourseId.entries()) {
    if (key.startsWith(mkey + "-") || key === mkey) return [...products];
  }
  return [];
}

/**
 * Merge two arrays of course nodes by id, with conflict resolution:
 *   - Higher confidence wins
 *   - Tie-break: more tags wins
 *   - Tie-break: lexicographic on extractedFrom (deterministic)
 * Returns a NEW array; inputs are not mutated.
 */
export function mergeCourseNodes(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    throw new TypeError("mergeCourseNodes: both args must be arrays");
  }
  const byId = new Map();
  const pick = (existing, incoming) => {
    const ec = existing.provenance?.confidence ?? 0;
    const ic = incoming.provenance?.confidence ?? 0;
    if (ic !== ec) return ic > ec ? incoming : existing;
    const et = existing.tags?.length ?? 0;
    const it = incoming.tags?.length ?? 0;
    if (it !== et) return it > et ? incoming : existing;
    const ef = existing.provenance?.extractedFrom ?? "";
    const inf = incoming.provenance?.extractedFrom ?? "";
    return inf < ef ? incoming : existing;
  };
  for (const n of a) if (n?.id) byId.set(n.id, n);
  for (const n of b) {
    if (!n?.id) continue;
    if (byId.has(n.id)) byId.set(n.id, pick(byId.get(n.id), n));
    else byId.set(n.id, n);
  }
  return [...byId.values()].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/**
 * Convert a TribalCourseNode into the graph-node shape consumed by
 * state/shared/system-viz/system-graph.json (key fields only). Pure.
 * The system-graph schema uses { id, kind, layer/layerBand, title, meta }.
 */
export function toGraphNode(courseNode) {
  if (!courseNode || typeof courseNode !== "object") {
    throw new TypeError("toGraphNode: courseNode must be object");
  }
  return {
    id: courseNode.id,
    kind: courseNode.kind,
    layerBand: courseNode.layerBand,
    title: courseNode.title,
    meta: {
      source: courseNode.source,
      courseId: courseNode.courseId,
      term: courseNode.term,
      category: courseNode.category,
      domain: courseNode.domain,
      school: courseNode.school,
      discipline: courseNode.discipline,
      galaxy: courseNode.galaxy,
      tags: courseNode.tags,
      prismMapping: courseNode.prismMapping,
      confidence: courseNode.provenance?.confidence,
      extractionLevel: courseNode.provenance?.extractionLevel,
      extractedFrom: courseNode.provenance?.extractedFrom,
      extractedAt: courseNode.provenance?.extractedAt,
    },
  };
}

/**
 * Build edges from a course node to its prismMapping target nodes.
 * Edge shape matches system-graph.json: { from, to, kind, weight }.
 * Caller is responsible for filtering edges whose `to` id is not in the graph.
 */
export function edgesFromCourseNode(courseNode) {
  if (!courseNode || !Array.isArray(courseNode.prismMapping)) return [];
  const edges = [];
  for (const target of courseNode.prismMapping) {
    if (typeof target !== "string" || !target.trim()) continue;
    // Multiple plausible target id shapes (engine/product). Caller filters
    // against the actual graph. Emit ONE shape we know about (engine prefix);
    // unknown targets get a generic "product" prefix so the link can be
    // resolved by ID-rewriting downstream.
    edges.push({
      from: courseNode.id,
      to: `product:${target.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}`,
      kind: "course-supports",
      weight: courseNode.provenance?.confidence ?? 0.5,
    });
  }
  return edges;
}

/**
 * Pure merge of course nodes into a graph object.
 * Returns a SHALLOW-NEW graph (function does not mutate input during execution).
 *   - Existing nodes with matching id are REPLACED (newer wins)
 *   - New nodes are appended
 *   - Edges deduplicated by (from, to, kind)
 *
 * NOTE: shallow-new means `graph.meta` and any non-replaced node/edge objects
 * are shared by reference with the input. Callers that mutate `result.graph.meta`
 * will also mutate the input graph's meta. Deep-clone meta explicitly if you
 * need full isolation: `structuredClone(graph.meta)`.
 */
export function mergeIntoGraph(graph, courseNodes) {
  if (!graph || typeof graph !== "object") {
    throw new TypeError("mergeIntoGraph: graph must be object");
  }
  if (!Array.isArray(courseNodes)) {
    throw new TypeError("mergeIntoGraph: courseNodes must be array");
  }
  const nodes = Array.isArray(graph.nodes) ? graph.nodes.slice() : [];
  const edges = Array.isArray(graph.edges) ? graph.edges.slice() : [];
  const nodeIdx = new Map();
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i]?.id) nodeIdx.set(nodes[i].id, i);
  }
  const edgeKey = (e) => `${e.from}\x1f${e.to}\x1f${e.kind ?? ""}`;
  const edgeSet = new Set(edges.map(edgeKey));
  let added = 0, replaced = 0, edgesAdded = 0;
  for (const cn of courseNodes) {
    if (!cn || typeof cn !== "object" || typeof cn.id !== "string") continue;
    const gn = toGraphNode(cn);
    if (nodeIdx.has(cn.id)) {
      nodes[nodeIdx.get(cn.id)] = gn;
      replaced++;
    } else {
      nodeIdx.set(cn.id, nodes.length);
      nodes.push(gn);
      added++;
    }
    for (const e of edgesFromCourseNode(cn)) {
      const k = edgeKey(e);
      if (!edgeSet.has(k)) {
        edgeSet.add(k);
        edges.push(e);
        edgesAdded++;
      }
    }
  }
  return {
    graph: { ...graph, nodes, edges },
    stats: { added, replaced, edgesAdded, totalNodes: nodes.length, totalEdges: edges.length },
  };
}
