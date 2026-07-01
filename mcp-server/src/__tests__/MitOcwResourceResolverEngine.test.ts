/**
 * MitOcwResourceResolverEngine — comprehensive test suite
 *
 * Covers: happy path + 4 failure modes + 3 adversarial inputs + 4 spanning
 * course-code variability + batch + execute() dispatcher round-trip.
 * Every assertion checks a concrete value (no toBeDefined() stubs).
 *
 * Shipped 2026-05-23 (slot:india MIT-COURSE-INTEGRATION/U-MIT-OCW-RESOURCE-RESOLVER).
 */

import { describe, it, expect } from "vitest";
import {
  MitOcwResourceResolverEngine,
  mitOcwResourceResolverEngine,
} from "../engines/MitOcwResourceResolverEngine.js";
import type { ResolveInput, ResolveResult } from "../engines/MitOcwResourceResolverEngine.js";

describe("MitOcwResourceResolverEngine — core resolve()", () => {
  const eng = new MitOcwResourceResolverEngine();

  it("resolves canonical course (2.830 spring-2008) into full URL set", () => {
    const r = eng.resolve({
      courseId: "2.830",
      title: "Control of Manufacturing Processes",
      term: "spring-2008",
    });
    expect(r.courseId).toBe("2.830");
    expect(r.slug).toBe("2-830-control-of-manufacturing-processes-spring-2008");
    expect(r.baseUrl).toBe(
      "https://ocw.mit.edu/courses/2-830-control-of-manufacturing-processes-spring-2008",
    );
    expect(r.warnings).toHaveLength(0);
    expect(r.resources).toHaveLength(9);
    const kinds = r.resources.map((x) => x.kind);
    expect(kinds).toContain("syllabus");
    expect(kinds).toContain("lecture_notes");
    expect(kinds).toContain("video_galleries");
  });

  it("syllabus URL format is correct (base + /pages/syllabus/)", () => {
    const r = eng.resolve({
      courseId: "2.830",
      title: "Control of Manufacturing Processes",
      term: "spring-2008",
    });
    const syll = r.resources.find((x) => x.kind === "syllabus");
    expect(syll?.url).toBe(
      "https://ocw.mit.edu/courses/2-830-control-of-manufacturing-processes-spring-2008/pages/syllabus/",
    );
  });

  it("returns subset when pages override supplied", () => {
    const r = eng.resolve({
      courseId: "18.06",
      title: "Linear Algebra",
      term: "spring-2010",
      pages: ["syllabus", "video_lectures"],
    });
    expect(r.resources).toHaveLength(2);
    expect(r.resources[0].kind).toBe("syllabus");
    expect(r.resources[1].kind).toBe("video_lectures");
    expect(r.resources[1].url).toBe(
      "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/pages/video-lectures/",
    );
  });
});

describe("MitOcwResourceResolverEngine — variability across course-id grammars", () => {
  const eng = new MitOcwResourceResolverEngine();

  it("handles letter-suffixed course id (6.S191) — lowercase normalization", () => {
    const r = eng.resolve({
      courseId: "6.S191",
      title: "Introduction to Deep Learning",
      term: "fall-2022",
    });
    expect(r.slug).toBe("6-s191-introduction-to-deep-learning-fall-2022");
    expect(r.baseUrl).toContain("/6-s191-");
  });

  it("handles joint-course suffix (16.852J)", () => {
    const r = eng.resolve({
      courseId: "16.852J",
      title: "Integrating the Lean Enterprise",
      term: "fall-2005",
    });
    expect(r.slug).toBe("16-852j-integrating-the-lean-enterprise-fall-2005");
  });

  it("handles multi-letter course id (18.100A)", () => {
    const r = eng.resolve({
      courseId: "18.100A",
      title: "Real Analysis",
      term: "fall-2012",
    });
    expect(r.slug).toBe("18-100a-real-analysis-fall-2012");
  });

  it("joint-course with crossListing produces correct slug (2.830J + sma-6303)", () => {
    // Real OCW URL: 2-830j-control-of-manufacturing-processes-sma-6303-spring-2008
    // Discovered 2026-05-23 via live extraction — bug fix for joint-course slug.
    const r = eng.resolve({
      courseId: "2.830J",
      title: "Control of Manufacturing Processes",
      crossListing: "sma-6303",
      term: "spring-2008",
    });
    expect(r.slug).toBe(
      "2-830j-control-of-manufacturing-processes-sma-6303-spring-2008",
    );
    expect(r.baseUrl).toBe(
      "https://ocw.mit.edu/courses/2-830j-control-of-manufacturing-processes-sma-6303-spring-2008",
    );
    expect(r.warnings).toHaveLength(0);
  });

  it("crossListing on non-joint course warns but emits sane slug", () => {
    const r = eng.resolve({
      courseId: "2.830", // no J
      title: "Control",
      crossListing: "sma-6303",
      term: "spring-2008",
    });
    expect(r.slug).toBe("2-830-control-sma-6303-spring-2008");
    expect(r.warnings.some((w) => /non-joint courseId/i.test(w))).toBe(true);
  });

  it("crossListing omitted on non-joint course produces canonical slug", () => {
    const r = eng.resolve({
      courseId: "18.06",
      title: "Linear Algebra",
      term: "spring-2010",
    });
    expect(r.slug).toBe("18-06-linear-algebra-spring-2010");
  });

  it("supports january-iap term (no warning)", () => {
    const r = eng.resolve({
      courseId: "2.670",
      title: "Mechanical Engineering Tools",
      term: "january-iap-2004",
    });
    expect(r.slug).toBe("2-670-mechanical-engineering-tools-january-iap-2004");
    expect(r.warnings).toHaveLength(0);
  });
});

describe("MitOcwResourceResolverEngine — failure modes (R12 fail-loud)", () => {
  const eng = new MitOcwResourceResolverEngine();

  it("throws on missing courseId", () => {
    expect(() => eng.resolve({ courseId: "" } as ResolveInput)).toThrow(
      /courseId required/i,
    );
  });

  it("throws on malformed courseId (no dot)", () => {
    expect(() => eng.resolve({ courseId: "garbage" } as ResolveInput)).toThrow(
      /does not match MIT-OCW grammar/i,
    );
  });

  it("throws on courseId with spaces", () => {
    expect(() => eng.resolve({ courseId: "2 830" } as ResolveInput)).toThrow(
      /does not match MIT-OCW grammar/i,
    );
  });

  it("throws on non-object input", () => {
    // @ts-expect-error testing runtime guard
    expect(() => eng.resolve(null)).toThrow(/input must be an object/i);
    // @ts-expect-error testing runtime guard
    expect(() => eng.resolve("course")).toThrow(/input must be an object/i);
  });

  it("warns (not throws) when term grammar drifts and uses verbatim", () => {
    const r = eng.resolve({
      courseId: "1.060",
      title: "Hydraulics",
      term: "weird-term-no-dash",
    });
    expect(r.warnings.some((w) => /term.*does not match/i.test(w))).toBe(true);
    expect(r.slug).toBe("1-060-hydraulics-weird-term-no-dash");
  });

  it("warns when title is missing (slug skips title segment)", () => {
    const r = eng.resolve({ courseId: "2.830", term: "spring-2008" });
    expect(r.warnings.some((w) => /title not provided/i.test(w))).toBe(true);
    expect(r.slug).toBe("2-830-spring-2008");
  });
});

describe("MitOcwResourceResolverEngine — adversarial inputs", () => {
  const eng = new MitOcwResourceResolverEngine();

  it("rejects oversized courseId (>3 digits + 8 chars)", () => {
    expect(() => eng.resolve({ courseId: "12345.ABCDEFGHIJ" } as ResolveInput)).toThrow(
      /does not match MIT-OCW grammar/i,
    );
  });

  it("rejects courseId with injection chars (slash, quote)", () => {
    expect(() => eng.resolve({ courseId: "2.830/../etc" } as ResolveInput)).toThrow(
      /does not match MIT-OCW grammar/i,
    );
    expect(() => eng.resolve({ courseId: "2.830\"' OR '1'='1" } as ResolveInput)).toThrow(
      /does not match MIT-OCW grammar/i,
    );
  });

  it("title with HTML/script gets slugified safely (no injection in URL)", () => {
    const r = eng.resolve({
      courseId: "2.830",
      title: "<script>alert(1)</script>",
      term: "spring-2008",
    });
    expect(r.slug).not.toMatch(/[<>()]/);
    expect(r.slug).not.toContain("/");
    // The URL contains only safe slug chars + the canonical pages-path
    expect(r.baseUrl.startsWith("https://ocw.mit.edu/courses/")).toBe(true);
  });
});

describe("MitOcwResourceResolverEngine — batch + introspection", () => {
  const eng = new MitOcwResourceResolverEngine();

  it("batch resolves a mixed list (good + bad doesn't poison batch)", () => {
    const out = eng.resolveBatch([
      { courseId: "2.830", title: "Control", term: "spring-2008" },
      { courseId: "garbage" } as ResolveInput,
      { courseId: "6.S191", title: "DL", term: "fall-2022" },
    ]);
    expect(out).toHaveLength(3);
    expect((out[0].result as ResolveResult).courseId).toBe("2.830");
    expect(out[0].error).toBeUndefined();
    expect(out[1].error).toMatch(/does not match MIT-OCW grammar/i);
    expect(out[1].result).toBeUndefined();
    expect((out[2].result as ResolveResult).courseId).toBe("6.S191");
  });

  it("resolveBatch throws on non-array input", () => {
    // @ts-expect-error testing runtime guard
    expect(() => eng.resolveBatch("not array")).toThrow(/inputs must be an array/i);
  });

  it("defaultPages() returns 9 canonical kinds in stable order; result is a fresh slice", () => {
    const pages = eng.defaultPages();
    expect(pages).toEqual([
      "syllabus",
      "lecture_notes",
      "assignments",
      "exams",
      "video_galleries",
      "video_lectures",
      "related_resources",
      "readings",
      "projects",
    ]);
    pages.pop();
    expect(eng.defaultPages()).toHaveLength(9);
  });
});

describe("MitOcwResourceResolverEngine — execute() dispatcher round-trip", () => {
  it("mit_ocw_resolve_course_urls routes to resolve()", () => {
    const r = mitOcwResourceResolverEngine.execute("mit_ocw_resolve_course_urls", {
      courseId: "2.830",
      title: "Control",
      term: "spring-2008",
    }) as ResolveResult;
    expect(r.courseId).toBe("2.830");
    expect(r.resources).toHaveLength(9);
  });

  it("mit_ocw_resolve_batch routes to resolveBatch()", () => {
    const r = mitOcwResourceResolverEngine.execute("mit_ocw_resolve_batch", {
      courses: [
        { courseId: "2.830", title: "Control", term: "spring-2008" },
        { courseId: "6.S191", title: "DL", term: "fall-2022" },
      ],
    }) as Array<{ result?: ResolveResult; error?: string }>;
    expect(r).toHaveLength(2);
    expect(r[0].result?.courseId).toBe("2.830");
    expect(r[1].result?.courseId).toBe("6.S191");
  });

  it("mit_ocw_default_pages returns the 9-kind list", () => {
    const r = mitOcwResourceResolverEngine.execute("mit_ocw_default_pages", {}) as string[];
    expect(r).toEqual([
      "syllabus",
      "lecture_notes",
      "assignments",
      "exams",
      "video_galleries",
      "video_lectures",
      "related_resources",
      "readings",
      "projects",
    ]);
  });

  it("throws on unknown action (fail-loud R12)", () => {
    expect(() =>
      mitOcwResourceResolverEngine.execute("mit_ocw_does_not_exist", {}),
    ).toThrow(/unknown action/i);
  });
});
