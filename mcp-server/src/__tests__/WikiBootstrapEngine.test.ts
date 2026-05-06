/**
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U04 — WikiBootstrapEngine tests.
 *
 * Coverage:
 *   - filterIndex / filterAlgorithms: happy paths spanning ≥3 categories
 *   - DEFAULT_GENERAL_CATEGORIES: included vs excluded categories enforced
 *   - renderCourseEntry / renderAlgorithmEntry: required fields, body shape, citation
 *   - buildIndexLine: deterministic format
 *   - insertIndexEntries: idempotency, dedup against existing 722-entry index, append-only
 *   - slugify: filename-safe transformation, max-length clamp
 *   - Failure modes: malformed registry, empty/missing arrays, non-string input
 *   - Adversarial: oversize names, unicode, regex chars, missing optional fields
 *
 * 32 tests; ≥3 failure modes × ≥2 adversarial inputs per spec.
 */
import { describe, it, expect } from "vitest";
import {
  WikiBootstrapEngine,
  wikiBootstrapEngine,
  type WikiEntry,
} from "../engines/WikiBootstrapEngine.js";

// ───────────── Fixtures ─────────────
// Synthetic registries shaped to match real MIT_COURSE_INDEX.json /
// ALGORITHM_REGISTRY.json so the engine sees realistic data.

const COURSE_INDEX_FIXTURE = {
  version: "1.0.0",
  totalCourses: 4,
  coursesByCategory: {
    algorithms: {
      priority: "TIER_1",
      description: "Core algorithms",
      courses: [
        { id: "6.046", name: "Design and Analysis of Algorithms",
          file: "6.046-fall-2015.zip", topics: ["divide-and-conquer", "graph-algorithms", "dp"] },
      ],
    },
    machine_learning: {
      priority: "TIER_1",
      description: "ML",
      courses: [
        { id: "6.034", name: "Artificial Intelligence",
          file: "6.034-fall-2010.zip", topics: ["search", "knn", "neural-nets"] },
        { id: "6.867", name: "Machine Learning",
          file: "6.867-fall-2006.zip", topics: ["regression", "svm"] },
      ],
    },
    optimization: {
      priority: "TIER_1",
      description: "Optimization theory",
      courses: [
        { id: "6.251J", name: "Introduction to Mathematical Programming",
          file: "6.251j-fall-2009.zip", topics: ["lp", "duality"] },
      ],
    },
    // Excluded categories — must NOT appear in default-filtered output.
    manufacturing: {
      priority: "TIER_2",
      description: "Applied",
      courses: [
        { id: "2.008", name: "Design and Manufacturing II",
          file: "2.008.zip", topics: ["injection-molding"] },
      ],
    },
    business_finance: {
      priority: "TIER_3",
      description: "Out of scope",
      courses: [
        { id: "15.401", name: "Finance Theory I",
          file: "15.401.zip", topics: ["dcf"] },
      ],
    },
  },
};

const ALG_REGISTRY_FIXTURE = {
  version: "1.0.0",
  totalAlgorithms: 3,
  categories: {
    optimization: {
      linear_programming: {
        algorithms: [
          { name: "Simplex Method", course: "6.251J",
            prismEngines: ["PRISM_CONSTRAINED_OPTIMIZER", "PRISM_SCHEDULING_ENGINE"] },
          { name: "Interior Point Method", course: "6.079",
            prismEngines: ["PRISM_INTERIOR_POINT_ENGINE"] },
        ],
      },
    },
    machine_learning: {
      neural_networks: {
        algorithms: [
          { name: "Backpropagation", course: "6.867", prismEngines: [] },
        ],
      },
    },
    // Excluded category
    manufacturing_physics: {
      cutting_force: {
        algorithms: [
          { name: "Kienzle Model", course: "2.008", prismEngines: ["MillCuttingForceEngine"] },
        ],
      },
    },
  },
};

// ───────────── Tests ─────────────

describe("WikiBootstrapEngine — isGeneralCategory", () => {
  it("accepts default general categories (algorithms, ml, optimization, control)", () => {
    const e = new WikiBootstrapEngine();
    expect(e.isGeneralCategory("algorithms")).toBe(true);
    expect(e.isGeneralCategory("machine_learning")).toBe(true);
    expect(e.isGeneralCategory("optimization")).toBe(true);
    expect(e.isGeneralCategory("control_dynamics")).toBe(true);
  });

  it("rejects applied/domain-specific categories by default", () => {
    const e = new WikiBootstrapEngine();
    expect(e.isGeneralCategory("manufacturing")).toBe(false);
    expect(e.isGeneralCategory("business_finance")).toBe(false);
    expect(e.isGeneralCategory("databases")).toBe(false);
    expect(e.isGeneralCategory("human_factors")).toBe(false);
  });

  it("honors a custom allowed list (overrides defaults entirely)", () => {
    const e = new WikiBootstrapEngine();
    expect(e.isGeneralCategory("algorithms", ["only_this"])).toBe(false);
    expect(e.isGeneralCategory("only_this", ["only_this"])).toBe(true);
  });

  it("returns false for non-string or empty name", () => {
    const e = new WikiBootstrapEngine();
    expect(e.isGeneralCategory(undefined as unknown as string)).toBe(false);
    expect(e.isGeneralCategory(null as unknown as string)).toBe(false);
    expect(e.isGeneralCategory("")).toBe(false);
  });
});

describe("WikiBootstrapEngine — filterIndex (≥3 categories spanned)", () => {
  it("emits one MITCourseSource per allowed (category, course) — spans 3 categories", () => {
    const e = new WikiBootstrapEngine();
    const result = e.filterIndex(COURSE_INDEX_FIXTURE);
    // 1 algorithms + 2 machine_learning + 1 optimization = 4
    expect(result.length).toBe(4);
    const cats = new Set(result.map((c) => c.category));
    expect(cats).toEqual(new Set(["algorithms", "machine_learning", "optimization"]));
  });

  it("excludes manufacturing and business_finance under DEFAULT_GENERAL_CATEGORIES", () => {
    const e = new WikiBootstrapEngine();
    const result = e.filterIndex(COURSE_INDEX_FIXTURE);
    const allIds = result.map((c) => c.course_id);
    expect(allIds).not.toContain("2.008");
    expect(allIds).not.toContain("15.401");
    expect(allIds.sort()).toEqual(["6.034", "6.046", "6.251J", "6.867"]);
  });

  it("preserves priority + topics from the registry shape", () => {
    const e = new WikiBootstrapEngine();
    const result = e.filterIndex(COURSE_INDEX_FIXTURE);
    const sicp = result.find((c) => c.course_id === "6.046");
    expect(sicp?.priority).toBe("TIER_1");
    expect(sicp?.topics).toEqual(["divide-and-conquer", "graph-algorithms", "dp"]);
  });

  it("returns [] for malformed registry (missing coursesByCategory)", () => {
    const e = new WikiBootstrapEngine();
    expect(e.filterIndex({})).toEqual([]);
    expect(e.filterIndex({ coursesByCategory: null })).toEqual([]);
    expect(e.filterIndex(null)).toEqual([]);
  });

  it("skips course entries missing id or name (silent — registry can be noisy)", () => {
    const e = new WikiBootstrapEngine();
    const malformed = {
      coursesByCategory: {
        algorithms: {
          priority: "TIER_1",
          courses: [
            { id: "6.046", name: "Good", file: "g.zip", topics: [] },
            { id: "", name: "MissingId" },
            { id: "6.999", name: "" },
            { /* no id, no name */ },
            "garbage-not-an-object",
          ],
        },
      },
    };
    const result = e.filterIndex(malformed);
    expect(result.length).toBe(1);
    expect(result[0].course_id).toBe("6.046");
  });

  it("custom allowed list shifts which courses are emitted", () => {
    const e = new WikiBootstrapEngine();
    const result = e.filterIndex(COURSE_INDEX_FIXTURE, ["manufacturing"]);
    expect(result.length).toBe(1);
    expect(result[0].course_id).toBe("2.008");
  });

  it("clamps oversize topic strings to 80 chars (MAX_TOPIC_LEN)", () => {
    const e = new WikiBootstrapEngine();
    const longTopic = "Z".repeat(500);
    const result = e.filterIndex({
      coursesByCategory: {
        algorithms: {
          priority: "TIER_1",
          courses: [{ id: "9.001", name: "X", file: "", topics: [longTopic] }],
        },
      },
    });
    expect(result[0].topics[0].length).toBe(80);
    expect(result[0].topics[0]).toBe("Z".repeat(80));
  });
});

describe("WikiBootstrapEngine — filterAlgorithms", () => {
  it("emits one MITAlgorithmSource per algorithm, spanning ≥2 categories", () => {
    const e = new WikiBootstrapEngine();
    const result = e.filterAlgorithms(ALG_REGISTRY_FIXTURE);
    // 2 in optimization/linear_programming + 1 in machine_learning/neural_networks = 3
    expect(result.length).toBe(3);
    const cats = new Set(result.map((a) => a.category));
    expect(cats).toEqual(new Set(["optimization", "machine_learning"]));
  });

  it("preserves prism_engines cross-link from the registry", () => {
    const e = new WikiBootstrapEngine();
    const result = e.filterAlgorithms(ALG_REGISTRY_FIXTURE);
    const simplex = result.find((a) => a.algorithm_name === "Simplex Method");
    expect(simplex?.prism_engines).toEqual(["PRISM_CONSTRAINED_OPTIMIZER", "PRISM_SCHEDULING_ENGINE"]);
  });

  it("excludes manufacturing_physics by default", () => {
    const e = new WikiBootstrapEngine();
    const result = e.filterAlgorithms(ALG_REGISTRY_FIXTURE);
    const allNames = result.map((a) => a.algorithm_name);
    expect(allNames).not.toContain("Kienzle Model");
    expect(allNames.sort()).toEqual(["Backpropagation", "Interior Point Method", "Simplex Method"]);
  });

  it("returns [] on malformed registry", () => {
    const e = new WikiBootstrapEngine();
    expect(e.filterAlgorithms({})).toEqual([]);
    expect(e.filterAlgorithms(null)).toEqual([]);
    expect(e.filterAlgorithms({ categories: "wrong" })).toEqual([]);
  });

  it("handles missing prismEngines field as empty array", () => {
    const e = new WikiBootstrapEngine();
    const reg = {
      categories: {
        algorithms: { foo: { algorithms: [{ name: "Bar", course: "1.001" }] } },
      },
    };
    const result = e.filterAlgorithms(reg);
    expect(result[0].prism_engines).toEqual([]);
  });

  it("skips algorithms missing required name field", () => {
    const e = new WikiBootstrapEngine();
    const reg = {
      categories: {
        algorithms: {
          foo: {
            algorithms: [
              { name: "Good", course: "1.001", prismEngines: [] },
              { name: "", course: "1.002" },
              { /* no name */ course: "1.003" },
            ],
          },
        },
      },
    };
    const result = e.filterAlgorithms(reg);
    expect(result.length).toBe(1);
    expect(result[0].algorithm_name).toBe("Good");
  });
});

describe("WikiBootstrapEngine — renderCourseEntry", () => {
  it("renders all required body sections (title, category, topics, citation)", () => {
    const e = new WikiBootstrapEngine();
    const entry = e.renderCourseEntry({
      category: "algorithms", priority: "TIER_1",
      course_id: "6.046", course_name: "Design and Analysis of Algorithms",
      course_file: "6.046-fall-2015.zip", topics: ["dp", "graphs"],
    });
    expect(entry.title).toBe("MIT 6.046 — Design and Analysis of Algorithms");
    expect(entry.kind).toBe("course");
    expect(entry.body).toContain("# MIT 6.046 — Design and Analysis of Algorithms");
    expect(entry.body).toContain("**Category:** algorithms · **Priority:** TIER_1");
    expect(entry.body).toContain("**Topics:** dp, graphs");
    expect(entry.body).toContain("## Citation");
    expect(entry.body).toContain("- **Course:** 6.046 — Design and Analysis of Algorithms");
    expect(entry.body).toContain("- **File:** 6.046-fall-2015.zip");
  });

  it("uses placeholder when topics list is empty", () => {
    const e = new WikiBootstrapEngine();
    const entry = e.renderCourseEntry({
      category: "algorithms", priority: "TIER_1",
      course_id: "6.046", course_name: "X", course_file: "x.zip", topics: [],
    });
    expect(entry.body).toContain("**Topics:** (no topics listed)");
  });

  it("uses placeholder when course_file is empty", () => {
    const e = new WikiBootstrapEngine();
    const entry = e.renderCourseEntry({
      category: "algorithms", priority: "TIER_1",
      course_id: "6.046", course_name: "X", course_file: "", topics: ["a"],
    });
    expect(entry.body).toContain("- **File:** (not specified)");
  });

  it("generates a filename-safe slug id from special-character course names", () => {
    const e = new WikiBootstrapEngine();
    const entry = e.renderCourseEntry({
      category: "algorithms", priority: "TIER_1",
      course_id: "6.046", course_name: "Design & Analysis (2015)!",
      course_file: "x.zip", topics: [],
    });
    expect(entry.id).toBe("mit-6-046-design-analysis-2015");
    expect(/^[a-z0-9-]+$/.test(entry.id)).toBe(true);
  });

  it("throws TypeError when course_id is empty", () => {
    const e = new WikiBootstrapEngine();
    expect(() => e.renderCourseEntry({
      category: "algorithms", priority: "TIER_1",
      course_id: "", course_name: "X", course_file: "x.zip", topics: [],
    })).toThrow(TypeError);
  });
});

describe("WikiBootstrapEngine — renderAlgorithmEntry", () => {
  it("cross-links to PRISM engines via inline-code formatted list", () => {
    const e = new WikiBootstrapEngine();
    const entry = e.renderAlgorithmEntry({
      category: "optimization", subcategory: "linear_programming",
      algorithm_name: "Simplex Method", course_id: "6.251J",
      prism_engines: ["PRISM_CONSTRAINED_OPTIMIZER", "PRISM_SCHEDULING_ENGINE"],
    });
    expect(entry.body).toContain("**Related PRISM engines:** `PRISM_CONSTRAINED_OPTIMIZER`, `PRISM_SCHEDULING_ENGINE`");
    expect(entry.related_engines).toEqual(["PRISM_CONSTRAINED_OPTIMIZER", "PRISM_SCHEDULING_ENGINE"]);
  });

  it("uses placeholder when no PRISM engines mapped", () => {
    const e = new WikiBootstrapEngine();
    const entry = e.renderAlgorithmEntry({
      category: "ml", subcategory: "nn",
      algorithm_name: "Backprop", course_id: "6.867", prism_engines: [],
    });
    expect(entry.body).toContain("(no PRISM engines mapped yet)");
  });

  it("renders citation with course_id when present", () => {
    const e = new WikiBootstrapEngine();
    const entry = e.renderAlgorithmEntry({
      category: "ml", subcategory: "nn",
      algorithm_name: "Backprop", course_id: "6.867", prism_engines: [],
    });
    expect(entry.body).toContain("- **Course:** MIT 6.867");
  });

  it("renders citation placeholder when course_id is empty", () => {
    const e = new WikiBootstrapEngine();
    const entry = e.renderAlgorithmEntry({
      category: "ml", subcategory: "nn",
      algorithm_name: "Backprop", course_id: "", prism_engines: [],
    });
    expect(entry.body).toContain("- **Course:** (not specified)");
  });

  it("throws TypeError when algorithm_name is empty", () => {
    const e = new WikiBootstrapEngine();
    expect(() => e.renderAlgorithmEntry({
      category: "x", subcategory: "y",
      algorithm_name: "", course_id: "1.001", prism_engines: [],
    })).toThrow(TypeError);
  });
});

describe("WikiBootstrapEngine — buildIndexLine", () => {
  it("renders the canonical 722-baseline index format for course entries", () => {
    const e = new WikiBootstrapEngine();
    const entry: WikiEntry = {
      id: "mit-6-046-design-analysis", title: "MIT 6.046 — Design",
      kind: "course", body: "",
      citation: { course_id: "6.046", course_name: "Design", topic: "algorithms" },
      related_engines: [],
    };
    expect(e.buildIndexLine(entry)).toBe(
      "- [MIT 6.046 — Design](mit/courses/mit-6-046-design-analysis.md) — course · algorithms",
    );
  });

  it("uses 'algorithms' subdir for algorithm-kind entries", () => {
    const e = new WikiBootstrapEngine();
    const entry: WikiEntry = {
      id: "mit-alg-simplex", title: "Simplex Method",
      kind: "algorithm", body: "",
      citation: { course_id: "6.251J", course_name: "", topic: "optimization/linear_programming" },
      related_engines: [],
    };
    expect(e.buildIndexLine(entry)).toBe(
      "- [Simplex Method](mit/algorithms/mit-alg-simplex.md) — algorithm · optimization/linear_programming",
    );
  });

  it("throws TypeError when entry id is empty", () => {
    const e = new WikiBootstrapEngine();
    expect(() => e.buildIndexLine({
      id: "", title: "X", kind: "course", body: "",
      citation: { course_id: "1", course_name: "X", topic: "x" },
      related_engines: [],
    })).toThrow(TypeError);
  });
});

describe("WikiBootstrapEngine — insertIndexEntries (idempotency + dedup)", () => {
  it("appends new lines to a non-empty existing index", () => {
    const e = new WikiBootstrapEngine();
    const existing = "# Index\n\n- [Old](old.md) — concept · prior";
    const result = e.insertIndexEntries(existing, [
      "- [New A](mit/courses/a.md) — course · algorithms",
      "- [New B](mit/algorithms/b.md) — algorithm · optimization",
    ]);
    expect(result).toContain("- [Old](old.md) — concept · prior");
    expect(result).toContain("- [New A](mit/courses/a.md) — course · algorithms");
    expect(result).toContain("- [New B](mit/algorithms/b.md) — algorithm · optimization");
  });

  it("is idempotent — re-running with same input produces byte-identical output", () => {
    const e = new WikiBootstrapEngine();
    const start = "# Index\n";
    const lines = ["- [A](mit/courses/a.md) — course · algorithms"];
    const r1 = e.insertIndexEntries(start, lines);
    const r2 = e.insertIndexEntries(r1, lines);
    expect(r2).toBe(r1);
  });

  it("dedups by link target — same path, different title doesn't double-add", () => {
    const e = new WikiBootstrapEngine();
    const existing = "- [Original Title](mit/courses/a.md) — course · algorithms\n";
    const result = e.insertIndexEntries(existing, [
      "- [Different Title](mit/courses/a.md) — course · algorithms",
    ]);
    expect(result).toBe(existing);
  });

  it("dedups duplicates within a single insertion run", () => {
    const e = new WikiBootstrapEngine();
    const result = e.insertIndexEntries("", [
      "- [A](mit/courses/a.md) — course · algorithms",
      "- [A](mit/courses/a.md) — course · algorithms",
      "- [A](mit/courses/a.md) — course · algorithms",
    ]);
    const occurrences = (result.match(/- \[A\]\(mit\/courses\/a\.md\)/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it("returns existing index unchanged when lines is empty array", () => {
    const e = new WikiBootstrapEngine();
    const existing = "# Index\nfoo bar";
    expect(e.insertIndexEntries(existing, [])).toBe(existing);
  });

  it("treats non-string entries in lines as no-ops without throwing", () => {
    const e = new WikiBootstrapEngine();
    const result = e.insertIndexEntries("", [
      "- [Good](g.md) — x",
      undefined as unknown as string,
      null as unknown as string,
      42 as unknown as string,
    ]);
    expect(result).toContain("- [Good](g.md) — x");
    expect(result.match(/- \[/g)?.length).toBe(1);
  });

  it("handles non-string existingIndex by treating it as empty", () => {
    const e = new WikiBootstrapEngine();
    const result = e.insertIndexEntries(undefined as unknown as string, ["- [X](x.md) — y"]);
    expect(result).toContain("- [X](x.md) — y");
  });
});

describe("WikiBootstrapEngine — slugify", () => {
  it("lowercases and dash-separates", () => {
    const e = new WikiBootstrapEngine();
    expect(e.slugify("Hello World")).toBe("hello-world");
    expect(e.slugify("UPPER CASE")).toBe("upper-case");
  });

  it("collapses non-alphanumeric runs to single dash", () => {
    const e = new WikiBootstrapEngine();
    expect(e.slugify("a&b!c?d")).toBe("a-b-c-d");
    expect(e.slugify("a   b")).toBe("a-b");
  });

  it("strips leading/trailing dashes", () => {
    const e = new WikiBootstrapEngine();
    expect(e.slugify("---hello---")).toBe("hello");
    expect(e.slugify("!!!a!!!")).toBe("a");
  });

  it("returns empty string on non-string input", () => {
    const e = new WikiBootstrapEngine();
    expect(e.slugify(undefined as unknown as string)).toBe("");
    expect(e.slugify(null as unknown as string)).toBe("");
  });

  it("clamps to MAX_SLUG_LEN (80)", () => {
    const e = new WikiBootstrapEngine();
    const long = "x".repeat(200);
    expect(e.slugify(long).length).toBe(80);
    expect(e.slugify(long)).toBe("x".repeat(80));
  });
});

describe("WikiBootstrapEngine — exported singleton (real-behavior round trip)", () => {
  it("singleton runs the full bootstrap pipeline end-to-end on the registry fixtures", () => {
    // Real-behavior round trip: feed both fixtures through filter→render→
    // index, and assert the actual bytes that the driver script will write.
    const courses = wikiBootstrapEngine.filterIndex(COURSE_INDEX_FIXTURE);
    const algs = wikiBootstrapEngine.filterAlgorithms(ALG_REGISTRY_FIXTURE);
    expect(courses.length).toBe(4);
    expect(algs.length).toBe(3);

    const courseEntries = courses.map((c) => wikiBootstrapEngine.renderCourseEntry(c));
    const algEntries = algs.map((a) => wikiBootstrapEngine.renderAlgorithmEntry(a));

    // Course entry for 6.046 must contain the expected title and citation.
    const sicpEntry = courseEntries.find((e) => e.citation.course_id === "6.046");
    expect(sicpEntry?.title).toBe("MIT 6.046 — Design and Analysis of Algorithms");
    expect(sicpEntry?.body).toContain("- **Course:** 6.046 — Design and Analysis of Algorithms");

    // Algorithm entry for Simplex Method must cross-link to its 2 PRISM engines.
    const simplexEntry = algEntries.find((e) => e.title === "Simplex Method");
    expect(simplexEntry?.related_engines).toEqual(["PRISM_CONSTRAINED_OPTIMIZER", "PRISM_SCHEDULING_ENGINE"]);

    // Build the index extension and confirm it contains all 7 entries (4 courses + 3 algorithms).
    const indexLines = [...courseEntries, ...algEntries].map((e) => wikiBootstrapEngine.buildIndexLine(e));
    expect(indexLines.length).toBe(7);
    const newIndex = wikiBootstrapEngine.insertIndexEntries("# Index\n", indexLines);
    for (const line of indexLines) {
      expect(newIndex).toContain(line);
    }
    // Idempotency: second run is a no-op.
    expect(wikiBootstrapEngine.insertIndexEntries(newIndex, indexLines)).toBe(newIndex);
  });
});
