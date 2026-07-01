/**
 * PostLibraryCatalogEngine -- real reference-value and algebraic-invariant tests
 *
 * Engine: PostLibraryCatalogEngineImpl (exported as postLibraryCatalogEngine singleton)
 * Public surface:
 *   - process(CatalogInput) -> CatalogSearchResult | PostCatalogEntry | { facets }
 *   - addPosts(PostCatalogEntry[]) -> void
 *
 * SEED_CATALOG at module load = 19 entries (all source:"prism_native").
 * Counted from source:
 *   fanuc-generic-3ax, fanuc-5ax-tcp, fanuc-lathe,
 *   siemens-840d-3ax, siemens-840d-5ax, siemens-turning,
 *   haas-ngc-mill, haas-5ax, haas-lathe,
 *   mazak-smooth-mill, mazak-integrex,
 *   okuma-osp-mill, okuma-lathe,
 *   heidenhain-tnc640-mill,
 *   brother-speedio,
 *   doosan-fanuc-mill,
 *   hurco-max5-mill,
 *   fanuc-robocut-wedm, sodick-wedm
 */

import { describe, it, expect } from "vitest";
import {
  postLibraryCatalogEngine,
  type PostCatalogEntry,
  type CompatibilityScore,
  type CatalogSearchResult,
} from "../engines/PostLibraryCatalogEngine.js";
import type { MachineContext } from "../engines/PostProcessorPipelineEngine.js";

// ---------------------------------------------------------------------------
// Named constants (anti magic-number)
// ---------------------------------------------------------------------------
const SEED_TOTAL = 19;
const FANUC_VENDOR_COUNT = 4;  // Fanuc, Fanuc, Fanuc, Fanuc (not Doosan/Sodick)
const SIEMENS_VENDOR_COUNT = 3;
const HAAS_VENDOR_COUNT = 3;
const WIRE_EDM_COUNT = 2;
const FIVE_AXIS_MACHINE_TYPE_COUNT = 4; // posts where machine_types includes "5axis":
// fanuc-5ax-tcp, siemens-840d-5ax, haas-5ax, heidenhain-tnc640-mill
// mazak-integrex has axes=5 but machine_types=["mill_turn","lathe","mill"] -- no "5axis" tag
const FIVE_AXIS_AXES_COUNT = 5; // posts where axes field >= 5:
// fanuc-5ax-tcp, siemens-840d-5ax, haas-5ax, heidenhain-tnc640-mill, mazak-integrex
const FANUC_CTRL_COUNT = 6;    // fanuc-generic-3ax, fanuc-5ax-tcp, fanuc-lathe, doosan-fanuc-mill, fanuc-robocut-wedm, sodick-wedm
const SIEMENS_CTRL_COUNT = 3;
const AXES_4_OR_MORE = 7;      // 2 wire_edm (axes=4) + 5 five-axis (axes=5)
const DEFAULT_LIMIT = 50;
const SCORE_MAX = 100;
const SCORE_CONTROLLER_EXACT = 40;
const SCORE_CONTROLLER_FANUC_FAMILY = 20;
const SCORE_AXES_EXACT = 20;
const SCORE_AXES_PARTIAL = 10;
const SCORE_VENDOR_EXACT = 10;
const SCORE_RECENCY_PRISM_NATIVE = 10;
const SCORE_RECENCY_CPS = 5;
const SCORE_RECENCY_COMMUNITY = 3;
const SCORE_FEATURE_NO_MACHINE_FEATURES = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<PostCatalogEntry> & { id: string }): PostCatalogEntry {
  return {
    name: overrides.id,
    description: "test post",
    source: "cps",
    vendor: "TestVendor",
    controller: "fanuc",
    machine_types: ["mill"],
    axes: 3,
    capabilities: ["tool_length_comp"],
    tags: ["test"],
    ...overrides,
  };
}

function fanucMachine(overrides: Partial<MachineContext> = {}): MachineContext {
  return {
    machine_id: "test-machine",
    brand: "Fanuc",
    model: "0i",
    controller: "fanuc",
    axes: 3,
    travel_x: 500,
    travel_y: 400,
    travel_z: 300,
    spindle_power_kw: 11,
    spindle_max_rpm: 8000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Happy path: search with empty query returns all seed posts
// ---------------------------------------------------------------------------

describe("search -- happy path", () => {
  it("returns all 19 seed posts on empty query", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: {},
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(SEED_TOTAL);
    expect(result.posts).toHaveLength(SEED_TOTAL);
  });

  it("posts array contains required structural fields for every entry", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: {},
    })) as CatalogSearchResult;

    for (const post of result.posts) {
      expect(typeof post.id).toBe("string");
      expect(post.id.length).toBeGreaterThan(0);
      expect(Array.isArray(post.machine_types)).toBe(true);
      expect(post.machine_types.length).toBeGreaterThan(0);
      expect(Array.isArray(post.capabilities)).toBe(true);
      expect(Array.isArray(post.tags)).toBe(true);
      expect(typeof post.axes).toBe("number");
      expect(post.axes).toBeGreaterThanOrEqual(3);
    }
  });

  it("facets aggregate correctly for all seed posts", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: {},
    })) as CatalogSearchResult;

    const { facets } = result;

    // All 19 seed entries are prism_native
    expect(facets.sources["prism_native"]).toBe(SEED_TOTAL);
    expect(facets.sources["cps"]).toBeUndefined();

    expect(facets.vendors["Fanuc"]).toBe(FANUC_VENDOR_COUNT);
    expect(facets.vendors["Siemens"]).toBe(SIEMENS_VENDOR_COUNT);
    expect(facets.vendors["Haas"]).toBe(HAAS_VENDOR_COUNT);

    // Mill machine_type appears across many entries -- at least 10
    expect(facets.machine_types["mill"]).toBeGreaterThanOrEqual(10);
    expect(facets.machine_types["lathe"]).toBeGreaterThanOrEqual(5);
    expect(facets.machine_types["wire_edm"]).toBe(WIRE_EDM_COUNT);
  });
});

// ---------------------------------------------------------------------------
// Happy path: filter by vendor (case-insensitive substring)
// ---------------------------------------------------------------------------

describe("search -- vendor filter", () => {
  it("filters by exact vendor name case-insensitively", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { vendor: "siemens" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(SIEMENS_VENDOR_COUNT);
    expect(result.posts).toHaveLength(SIEMENS_VENDOR_COUNT);
    for (const p of result.posts) {
      expect(p.vendor.toLowerCase()).toBe("siemens");
    }
  });

  it("filters by partial vendor name substring", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { vendor: "haas" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(HAAS_VENDOR_COUNT);
    for (const p of result.posts) {
      expect(p.vendor.toLowerCase()).toContain("haas");
    }
  });

  it("returns 0 matches for nonexistent vendor", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { vendor: "NONEXISTENT_VENDOR_XYZ" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(0);
    expect(result.posts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Happy path: filter by controller family
// ---------------------------------------------------------------------------

describe("search -- controller filter", () => {
  it("returns only fanuc-controller posts", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { controller: "fanuc" },
    })) as CatalogSearchResult;

    // fanuc controller: fanuc-generic-3ax, fanuc-5ax-tcp, fanuc-lathe,
    //   doosan-fanuc-mill, fanuc-robocut-wedm, sodick-wedm = 6
    expect(result.total_matches).toBe(FANUC_CTRL_COUNT);
    for (const p of result.posts) {
      expect(p.controller).toBe("fanuc");
    }
  });

  it("returns only siemens-controller posts", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { controller: "siemens" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(SIEMENS_CTRL_COUNT);
    for (const p of result.posts) {
      expect(p.controller).toBe("siemens");
    }
  });
});

// ---------------------------------------------------------------------------
// Happy path: filter by machine type
// ---------------------------------------------------------------------------

describe("search -- machine_type filter", () => {
  it("returns only wire_edm posts", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { machine_type: "wire_edm" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(WIRE_EDM_COUNT);
    for (const p of result.posts) {
      expect(p.machine_types).toContain("wire_edm");
    }
    const ids = result.posts.map(p => p.id);
    expect(ids).toContain("fanuc-robocut-wedm");
    expect(ids).toContain("sodick-wedm");
  });

  it("returns 5-axis posts (machine_type=5axis)", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { machine_type: "5axis" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(FIVE_AXIS_MACHINE_TYPE_COUNT);
    for (const p of result.posts) {
      expect(p.machine_types).toContain("5axis");
    }
  });

  it("returns lathe posts -- all contain lathe in machine_types", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { machine_type: "lathe" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBeGreaterThanOrEqual(5);
    for (const p of result.posts) {
      expect(p.machine_types).toContain("lathe");
    }
  });
});

// ---------------------------------------------------------------------------
// Happy path: filter by axes (>= semantics)
// ---------------------------------------------------------------------------

describe("search -- axes filter", () => {
  it("axes>=5 returns only 5-axis-capable posts", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { axes: 5 },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(FIVE_AXIS_AXES_COUNT);
    for (const p of result.posts) {
      expect(p.axes).toBeGreaterThanOrEqual(5);
    }
  });

  it("axes>=3 returns all 19 seed posts (all have axes>=3)", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { axes: 3 },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(SEED_TOTAL);
  });

  it("axes>=4 returns exactly posts with 4 or 5 axes", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { axes: 4 },
    })) as CatalogSearchResult;

    // 2 wire_edm (axes=4) + 5 five-axis (axes=5) = 7
    expect(result.total_matches).toBe(AXES_4_OR_MORE);
    for (const p of result.posts) {
      expect(p.axes).toBeGreaterThanOrEqual(4);
    }
  });
});

// ---------------------------------------------------------------------------
// Happy path: filter by capability (substring match)
// ---------------------------------------------------------------------------

describe("search -- capability filter", () => {
  it("filters posts that have tcp capability", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { capability: "tcp" },
    })) as CatalogSearchResult;

    // fanuc-5ax-tcp (has "tcp"), siemens-840d-5ax (has "tcp"), heidenhain-tnc640-mill (has "tcp"),
    // haas-5ax (has "tcpc" -- substring "tcp" matches via .includes("tcp")) = 4
    expect(result.total_matches).toBe(4);
    for (const p of result.posts) {
      const hasTcp = p.capabilities.some(c => c.toLowerCase().includes("tcp"));
      expect(hasTcp).toBe(true);
    }
  });

  it("filters posts with threading capability (substring, case-insensitive)", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { capability: "threading" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBeGreaterThanOrEqual(3);
    for (const p of result.posts) {
      const has = p.capabilities.some(c => c.toLowerCase().includes("threading"));
      expect(has).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Happy path: full-text search
// ---------------------------------------------------------------------------

describe("search -- full-text", () => {
  it("full-text search finds haas-5ax by name text 'haas umc'", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { text: "haas umc" },
    })) as CatalogSearchResult;

    // haas-5ax: name "Haas UMC 5-Axis"
    expect(result.total_matches).toBeGreaterThanOrEqual(1);
    const ids = result.posts.map(p => p.id);
    expect(ids).toContain("haas-5ax");
  });

  it("full-text search matches against tags: 'traori' matches siemens-840d-5ax only", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { text: "traori" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(1);
    expect(result.posts[0].id).toBe("siemens-840d-5ax");
  });

  it("full-text multi-term search (AND logic): siemens 5-axis returns only siemens entries", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { text: "siemens 5-axis" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBeGreaterThanOrEqual(1);
    for (const p of result.posts) {
      expect(p.vendor.toLowerCase()).toBe("siemens");
    }
  });

  it("full-text search with nonexistent term returns 0 results", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { text: "XYZNOMATCHTERM999" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(0);
    expect(result.posts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Happy path: limit
// ---------------------------------------------------------------------------

describe("search -- limit", () => {
  it("limit=1 returns exactly 1 post while total_matches = 19", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { limit: 1 },
    })) as CatalogSearchResult;

    expect(result.posts).toHaveLength(1);
    expect(result.total_matches).toBe(SEED_TOTAL);
  });

  it("limit=5 returns exactly 5 posts while total_matches = 19", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { limit: 5 },
    })) as CatalogSearchResult;

    expect(result.posts).toHaveLength(5);
    expect(result.total_matches).toBe(SEED_TOTAL);
  });

  it("default limit (50) returns all 19 seed posts (under default)", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: {},
    })) as CatalogSearchResult;

    // 19 < DEFAULT_LIMIT=50 so all should be returned
    expect(result.posts).toHaveLength(SEED_TOTAL);
    expect(SEED_TOTAL).toBeLessThan(DEFAULT_LIMIT);
  });
});

// ---------------------------------------------------------------------------
// Happy path: source filter
// ---------------------------------------------------------------------------

describe("search -- source filter", () => {
  it("source=prism_native returns all 19 seed entries", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { source: "prism_native" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(SEED_TOTAL);
    for (const p of result.posts) {
      expect(p.source).toBe("prism_native");
    }
  });

  it("source=cps returns 0 results (no cps in seed)", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { source: "cps" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Happy path: detail retrieval
// ---------------------------------------------------------------------------

describe("detail -- happy path", () => {
  it("retrieves fanuc-generic-3ax with all concrete field values", async () => {
    const entry = (await postLibraryCatalogEngine.process({
      action: "detail",
      post_id: "fanuc-generic-3ax",
    })) as PostCatalogEntry;

    expect(entry.id).toBe("fanuc-generic-3ax");
    expect(entry.vendor).toBe("Fanuc");
    expect(entry.controller).toBe("fanuc");
    expect(entry.axes).toBe(3);
    expect(entry.machine_types).toEqual(["mill"]);
    expect(entry.capabilities).toContain("tool_length_comp");
    expect(entry.capabilities).toContain("rigid_tapping");
    expect(entry.source).toBe("prism_native");
  });

  it("retrieves siemens-840d-5ax with correct axes=5 and tcp/traori capabilities", async () => {
    const entry = (await postLibraryCatalogEngine.process({
      action: "detail",
      post_id: "siemens-840d-5ax",
    })) as PostCatalogEntry;

    expect(entry.id).toBe("siemens-840d-5ax");
    expect(entry.axes).toBe(5);
    expect(entry.capabilities).toContain("tcp");
    expect(entry.capabilities).toContain("traori");
    expect(entry.machine_types).toContain("5axis");
  });

  it("retrieves sodick-wedm: wire_edm machine type, axes=4, vendor=Sodick despite fanuc controller", async () => {
    const entry = (await postLibraryCatalogEngine.process({
      action: "detail",
      post_id: "sodick-wedm",
    })) as PostCatalogEntry;

    expect(entry.id).toBe("sodick-wedm");
    expect(entry.machine_types).toContain("wire_edm");
    expect(entry.axes).toBe(4);
    expect(entry.controller).toBe("fanuc");
    expect(entry.vendor).toBe("Sodick");
  });
});

// ---------------------------------------------------------------------------
// Happy path: list_facets action
// ---------------------------------------------------------------------------

describe("list_facets action", () => {
  it("returns object with 'facets' key containing all four facet categories", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "list_facets",
    })) as { facets: CatalogSearchResult["facets"] };

    expect(typeof result.facets).toBe("object");
    expect(typeof result.facets.vendors).toBe("object");
    expect(typeof result.facets.controllers).toBe("object");
    expect(typeof result.facets.machine_types).toBe("object");
    expect(typeof result.facets.sources).toBe("object");
  });

  it("facet vendor counts sum to exactly 19 (one per post)", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "list_facets",
    })) as { facets: CatalogSearchResult["facets"] };

    const vendorTotal = Object.values(result.facets.vendors).reduce((a, b) => a + b, 0);
    expect(vendorTotal).toBe(SEED_TOTAL);
  });

  it("facet sources total = 19 (all prism_native in seed)", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "list_facets",
    })) as { facets: CatalogSearchResult["facets"] };

    const sourceTotal = Object.values(result.facets.sources).reduce((a, b) => a + b, 0);
    expect(sourceTotal).toBe(SEED_TOTAL);
    expect(result.facets.sources["prism_native"]).toBe(SEED_TOTAL);
  });

  it("list_facets result does not have a 'posts' key (distinct from search result)", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "list_facets",
    })) as Record<string, unknown>;

    expect("posts" in result).toBe(false);
    expect("total_matches" in result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Happy path: compatibility scoring (the core algorithm)
// ---------------------------------------------------------------------------

describe("compatibility scoring -- algebraic invariants", () => {
  it("exact controller + exact axes + same vendor = correct per-component scores", async () => {
    const machine = fanucMachine({ brand: "Fanuc", controller: "fanuc", axes: 3 });
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      machine,
      query: {},
    })) as CatalogSearchResult;

    const post = result.posts.find(p => p.id === "fanuc-generic-3ax");
    if (!post || !post.score) throw new Error("fanuc-generic-3ax not found with score");
    const score = post.score as CompatibilityScore;

    // Controller exact match: 40
    expect(score.controller_pts).toBe(SCORE_CONTROLLER_EXACT);
    // Axes exact match (3==3): 20
    expect(score.axis_pts).toBe(SCORE_AXES_EXACT);
    // Vendor match (Fanuc == Fanuc): 10
    expect(score.vendor_pts).toBe(SCORE_VENDOR_EXACT);
    // Recency: prism_native = 10
    expect(score.recency_pts).toBe(SCORE_RECENCY_PRISM_NATIVE);
    // Total equals sum of parts
    expect(score.total).toBe(
      score.controller_pts + score.axis_pts + score.feature_pts + score.vendor_pts + score.recency_pts
    );
  });

  it("score total is always the arithmetic sum of the five component scores (invariant holds for all posts)", async () => {
    const machine = fanucMachine();
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      machine,
      query: {},
    })) as CatalogSearchResult;

    expect(result.posts.length).toBeGreaterThan(0);
    for (const post of result.posts) {
      if (!post.score) continue;
      const s = post.score;
      const expected = s.controller_pts + s.axis_pts + s.feature_pts + s.vendor_pts + s.recency_pts;
      expect(s.total).toBe(expected);
    }
  });

  it("score total is always between 0 and 100 inclusive for all posts", async () => {
    const machine = fanucMachine({ axes: 5, controller: "siemens", brand: "Siemens" });
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      machine,
      query: {},
    })) as CatalogSearchResult;

    expect(result.posts.length).toBeGreaterThan(0);
    for (const post of result.posts) {
      if (!post.score) continue;
      expect(post.score.total).toBeGreaterThanOrEqual(0);
      expect(post.score.total).toBeLessThanOrEqual(SCORE_MAX);
    }
  });

  it("controller mismatch (non-fanuc-family post vs siemens machine) gives 0 controller_pts", async () => {
    const machine = fanucMachine({ controller: "siemens", brand: "Siemens" });
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      machine,
      query: { controller: "heidenhain" },
    })) as CatalogSearchResult;

    // heidenhain is NOT in fanucLike; siemens machine is also NOT fanucLike
    expect(result.total_matches).toBeGreaterThan(0);
    for (const post of result.posts) {
      if (!post.score) continue;
      expect(post.score.controller_pts).toBe(0);
    }
  });

  it("Fanuc-family cross-match (haas post vs fanuc machine) gives 20 controller_pts", async () => {
    // haas controller is in the fanucLike list ["fanuc","haas","brother","doosan"]
    const machine = fanucMachine({ controller: "fanuc", brand: "ACME", axes: 3 });
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      machine,
      query: { vendor: "Haas", machine_type: "mill" },
    })) as CatalogSearchResult;

    const haasPost = result.posts.find(p => p.id === "haas-ngc-mill");
    if (!haasPost || !haasPost.score) throw new Error("haas-ngc-mill not found with score");
    // haas (fanucLike) vs fanuc (fanucLike) -> 20 pts, not 40
    expect(haasPost.score.controller_pts).toBe(SCORE_CONTROLLER_FANUC_FAMILY);
  });

  it("post axes > machine axes gives 10 axis_pts (partial credit, not exact)", async () => {
    // 5-axis post (fanuc-5ax-tcp) vs 3-axis machine -> post.axes(5) >= machine.axes(3) but != -> 10 pts
    const machine = fanucMachine({ axes: 3, controller: "fanuc", brand: "Fanuc" });
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      machine,
      query: { vendor: "Fanuc", machine_type: "5axis" },
    })) as CatalogSearchResult;

    const tcp = result.posts.find(p => p.id === "fanuc-5ax-tcp");
    if (!tcp || !tcp.score) throw new Error("fanuc-5ax-tcp not found with score");
    expect(tcp.score.axis_pts).toBe(SCORE_AXES_PARTIAL);
  });

  it("post axes < machine axes gives 0 axis_pts", async () => {
    // 3-axis post vs 5-axis machine: post.axes(3) < machine.axes(5) -> 0 pts
    const machine = fanucMachine({ axes: 5, controller: "fanuc", brand: "Fanuc" });
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      machine,
      query: {},
    })) as CatalogSearchResult;

    const generic = result.posts.find(p => p.id === "fanuc-generic-3ax");
    if (!generic || !generic.score) throw new Error("fanuc-generic-3ax not found with score");
    // 3-axis post vs 5-axis machine: post.axes(3) < machine.axes(5) -> 0
    expect(generic.score.axis_pts).toBe(0);
  });

  it("recency_pts: prism_native posts all score 10", async () => {
    const machine = fanucMachine();
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      machine,
      query: { vendor: "Fanuc", machine_type: "mill" },
    })) as CatalogSearchResult;

    expect(result.posts.length).toBeGreaterThan(0);
    for (const post of result.posts) {
      if (!post.score) continue;
      if (post.source === "prism_native") {
        expect(post.score.recency_pts).toBe(SCORE_RECENCY_PRISM_NATIVE);
      }
    }
  });

  it("compatibility action (explicit) sorts posts by score descending", async () => {
    const machine = fanucMachine({ controller: "fanuc", brand: "Fanuc", axes: 3 });
    const result = (await postLibraryCatalogEngine.process({
      action: "compatibility",
      query: {},
      machine,
    })) as CatalogSearchResult;

    const scores = result.posts
      .filter(p => p.score)
      .map(p => p.score!.total);

    expect(scores.length).toBeGreaterThan(1);
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  it("explanation array contains exactly 5 lines covering all scoring components", async () => {
    const machine = fanucMachine({ brand: "Fanuc", controller: "fanuc", axes: 3 });
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      machine,
      query: {},
    })) as CatalogSearchResult;

    const post = result.posts.find(p => p.id === "fanuc-generic-3ax");
    if (!post || !post.score) throw new Error("fanuc-generic-3ax not found with score");
    const score = post.score as CompatibilityScore;

    // 5 scoring dimensions -> 5 explanation lines
    expect(score.explanation).toHaveLength(5);
    const text = score.explanation.join(" ");
    expect(text).toContain("Controller");
    expect(text).toContain("Axes");
    expect(text).toContain("Features");
    expect(text).toContain("Vendor");
    expect(text).toContain("Source");
  });
});

// ---------------------------------------------------------------------------
// Happy path: addPosts deduplication
// ---------------------------------------------------------------------------

describe("addPosts -- deduplication and catalog mutation", () => {
  it("addPosts inserts a new entry and it becomes retrievable via detail", async () => {
    postLibraryCatalogEngine.addPosts([
      makeEntry({ id: "test-cps-entry-unique-001", source: "cps", vendor: "TestVendorCPS" }),
    ]);

    const entry = (await postLibraryCatalogEngine.process({
      action: "detail",
      post_id: "test-cps-entry-unique-001",
    })) as PostCatalogEntry;

    expect(entry.id).toBe("test-cps-entry-unique-001");
    expect(entry.source).toBe("cps");
    expect(entry.vendor).toBe("TestVendorCPS");
  });

  it("addPosts ignores duplicate IDs -- first insertion wins", async () => {
    postLibraryCatalogEngine.addPosts([
      makeEntry({ id: "test-dedup-unique-002", vendor: "DedupVendorFirst" }),
    ]);
    postLibraryCatalogEngine.addPosts([
      makeEntry({ id: "test-dedup-unique-002", vendor: "DedupVendorSecond" }),
    ]);

    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { text: "test-dedup-unique-002" },
    })) as CatalogSearchResult;

    const matches = result.posts.filter(p => p.id === "test-dedup-unique-002");
    expect(matches).toHaveLength(1);
    expect(matches[0].vendor).toBe("DedupVendorFirst");
  });

  it("added cps entry scores 5 recency_pts vs prism_native at 10", async () => {
    postLibraryCatalogEngine.addPosts([
      makeEntry({
        id: "test-cps-recency-003",
        source: "cps",
        vendor: "CpsVendorRecencyTest",
        controller: "fanuc",
        axes: 3,
        machine_types: ["mill"],
      }),
    ]);

    const machine = fanucMachine({ brand: "CpsVendorRecencyTest" });
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      machine,
      query: { vendor: "CpsVendorRecencyTest" },
    })) as CatalogSearchResult;

    const cpsPost = result.posts.find(p => p.id === "test-cps-recency-003");
    if (!cpsPost || !cpsPost.score) throw new Error("test-cps-recency-003 not found with score");
    expect(cpsPost.score.recency_pts).toBe(SCORE_RECENCY_CPS);
  });

  it("added community entry scores 3 recency_pts", async () => {
    postLibraryCatalogEngine.addPosts([
      makeEntry({
        id: "test-community-recency-004",
        source: "community",
        vendor: "CommunityVendorXYZ",
        controller: "fanuc",
        axes: 3,
        machine_types: ["mill"],
      }),
    ]);

    const machine = fanucMachine({ brand: "CommunityVendorXYZ" });
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      machine,
      query: { vendor: "CommunityVendorXYZ" },
    })) as CatalogSearchResult;

    const communityPost = result.posts.find(p => p.id === "test-community-recency-004");
    if (!communityPost || !communityPost.score) throw new Error("test-community-recency-004 not found");
    expect(communityPost.score.recency_pts).toBe(SCORE_RECENCY_COMMUNITY);
  });
});

// ---------------------------------------------------------------------------
// Failure modes
// ---------------------------------------------------------------------------

describe("failure mode -- unknown action", () => {
  it("throws 'Unknown action' error for invalid action string", async () => {
    await expect(
      postLibraryCatalogEngine.process({
        action: "invalid_action" as "search",
      })
    ).rejects.toThrow("Unknown action");
  });
});

describe("failure mode -- detail with unknown post_id", () => {
  it("throws 'Post not found' for nonexistent post_id", async () => {
    await expect(
      postLibraryCatalogEngine.process({
        action: "detail",
        post_id: "does-not-exist-xyz-999",
      })
    ).rejects.toThrow("Post not found");
  });

  it("throws 'Post not found' when post_id is empty string", async () => {
    await expect(
      postLibraryCatalogEngine.process({
        action: "detail",
        post_id: "",
      })
    ).rejects.toThrow("Post not found");
  });
});

describe("failure mode -- search with impossible combined filters", () => {
  it("vendor=Siemens + machine_type=wire_edm returns 0 results and empty facets", async () => {
    // Siemens has no wire_edm posts in seed
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { vendor: "Siemens", machine_type: "wire_edm" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBe(0);
    expect(result.posts).toHaveLength(0);
    expect(Object.keys(result.facets.vendors)).toHaveLength(0);
    expect(Object.keys(result.facets.machine_types)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Adversarial inputs
// ---------------------------------------------------------------------------

describe("adversarial -- malformed and boundary inputs", () => {
  it("limit=0 returns 0 posts but total_matches reflects full catalog (>= SEED_TOTAL)", async () => {
    // NOTE: singleton is shared -- addPosts tests earlier in the suite added entries,
    // so the catalog has more than SEED_TOTAL by the time this test runs.
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { limit: 0 },
    })) as CatalogSearchResult;

    expect(result.posts).toHaveLength(0);
    // total_matches is computed before the limit slice -- must be >= SEED_TOTAL
    expect(result.total_matches).toBeGreaterThanOrEqual(SEED_TOTAL);
    // Structural invariant: posts array is empty despite non-zero total
    expect(result.total_matches).toBeGreaterThan(0);
  });

  it("full-text search with empty string matches ALL posts (every haystack includes empty string)", async () => {
    // split(/\s+/) on "" gives [""]; every haystack.includes("") is true
    // NOTE: singleton is shared -- catalog >= SEED_TOTAL after addPosts tests
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { text: "" },
    })) as CatalogSearchResult;

    expect(result.total_matches).toBeGreaterThanOrEqual(SEED_TOTAL);
    // Verify it matched everything that exists (posts length == total_matches since default limit=50)
    expect(result.posts).toHaveLength(result.total_matches);
  });

  it("full-text search with leading/trailing spaces trims via split (fanuc still found)", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { text: "  fanuc  " },
    })) as CatalogSearchResult;

    // split(/\s+/) on "  fanuc  " gives ["", "fanuc", ""] -- "" matches everything
    // so at least all fanuc-tagged posts match
    expect(result.total_matches).toBeGreaterThan(0);
  });

  it("compatibility with machine that has no coolant or atc gives exactly 10 feature_pts", async () => {
    // When machine has no coolant_types and no atc_capacity,
    // machineFeatures is empty -> featurePts = 10 (no-features partial-credit branch)
    const machine: MachineContext = {
      machine_id: "bare-machine",
      brand: "Fanuc",
      model: "bare",
      controller: "fanuc",
      axes: 3,
      travel_x: 300,
      travel_y: 200,
      travel_z: 200,
      spindle_power_kw: 7,
      spindle_max_rpm: 6000,
      // coolant_types and atc_capacity intentionally absent
    };

    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      machine,
      query: { vendor: "Fanuc", machine_type: "mill" },
    })) as CatalogSearchResult;

    expect(result.posts.length).toBeGreaterThan(0);
    for (const post of result.posts) {
      if (!post.score) continue;
      expect(post.score.feature_pts).toBe(SCORE_FEATURE_NO_MACHINE_FEATURES);
    }
  });

  it("addPosts with empty array does not change catalog size", async () => {
    const before = (await postLibraryCatalogEngine.process({
      action: "search",
      query: {},
    })) as CatalogSearchResult;

    postLibraryCatalogEngine.addPosts([]);

    const after = (await postLibraryCatalogEngine.process({
      action: "search",
      query: {},
    })) as CatalogSearchResult;

    expect(after.total_matches).toBe(before.total_matches);
  });

  it("very high limit returns all available posts without error", async () => {
    const HIGH_LIMIT = 9999;
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { limit: HIGH_LIMIT },
    })) as CatalogSearchResult;

    // posts.length is bounded by total_matches (can never exceed it)
    expect(result.posts.length).toBeLessThanOrEqual(result.total_matches);
    expect(result.total_matches).toBeGreaterThanOrEqual(SEED_TOTAL);
  });
});

// ---------------------------------------------------------------------------
// Algebraic invariants: facets always agree with result set
// ---------------------------------------------------------------------------

describe("algebraic invariants -- facet consistency", () => {
  it("facet vendor counts match recomputed counts from the posts array", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { controller: "fanuc" },
    })) as CatalogSearchResult;

    const computed: Record<string, number> = {};
    for (const p of result.posts) {
      computed[p.vendor] = (computed[p.vendor] ?? 0) + 1;
    }

    expect(result.facets.vendors).toEqual(computed);
  });

  it("facet machine_types counts correctly fan out for multi-type posts (mazak-integrex)", async () => {
    // mazak-integrex has machine_types: ["mill_turn", "lathe", "mill"]
    // -- each type gets its own facet count
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { vendor: "Mazak" },
    })) as CatalogSearchResult;

    // 2 Mazak posts: mazak-smooth-mill (["mill"]) + mazak-integrex (["mill_turn","lathe","mill"])
    expect(result.facets.machine_types["mill"]).toBe(2);
    expect(result.facets.machine_types["mill_turn"]).toBe(1);
    expect(result.facets.machine_types["lathe"]).toBe(1);
  });

  it("source facet sum equals total_matches for any filtered result set", async () => {
    const result = (await postLibraryCatalogEngine.process({
      action: "search",
      query: { machine_type: "5axis" },
    })) as CatalogSearchResult;

    const sourceTotal = Object.values(result.facets.sources).reduce((a, b) => a + b, 0);
    expect(sourceTotal).toBe(result.total_matches);
    expect(result.total_matches).toBe(FIVE_AXIS_MACHINE_TYPE_COUNT);
  });
});
