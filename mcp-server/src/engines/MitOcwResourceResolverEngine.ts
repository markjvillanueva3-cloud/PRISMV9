/**
 * MitOcwResourceResolverEngine — derives the canonical MIT-OCW URL set for a
 * course, given its course-id + term. Pure-function URL resolver — does NOT
 * fetch; callers wrap the returned URLs with Playwright (per
 * [[feedback_playwright_for_online_sources]]) to actually pull the resources.
 *
 * Separation of concerns: this engine knows MIT-OCW's URL structure. The
 * caller knows the fetcher (Playwright MCP). This keeps the engine pure +
 * testable + deterministic — networking concerns stay at invocation time.
 *
 * MIT-OCW URL grammar (verified against ocw.mit.edu 2026-05-23):
 *   Base:        https://ocw.mit.edu/courses/<dept>-<num>-<slug>-<termSlug>/
 *   Lec notes:   <base>/pages/lecture-notes/
 *   Assignments: <base>/pages/assignments/
 *   Exams:       <base>/pages/exams/
 *   Videos:      <base>/pages/video-galleries/ (or /video-lectures/)
 *   Syllabus:    <base>/pages/syllabus/
 *   Resources:   <base>/pages/related-resources/
 *
 * @milestone MIT-COURSE-INTEGRATION/U-MIT-OCW-RESOURCE-RESOLVER
 * @slot india
 * @date 2026-05-23
 */

export type ResourcePageKind =
  | "syllabus"
  | "lecture_notes"
  | "assignments"
  | "exams"
  | "video_galleries"
  | "video_lectures"
  | "related_resources"
  | "readings"
  | "projects";

export interface ResolveInput {
  /** MIT course id, e.g. "2.830", "6.S191", "18.06SC", "2.830J" (J for joint). */
  courseId: string;
  /** Optional course title (drives the URL slug). E.g. "Linear Algebra". */
  title?: string;
  /** Optional term slug, e.g. "spring-2008", "fall-2015". */
  term?: string;
  /**
   * Optional cross-listing slug, e.g. "sma-6303" (Singapore-MIT Alliance),
   * "ec-s06" (Edgerton Center), "wgs-150" (Women's & Gender Studies).
   * Joint courses (those with a J suffix on courseId) frequently include
   * the cross-listing as an extra slug fragment between title and term in
   * the canonical OCW URL — e.g.
   *   2.830J + sma-6303 → 2-830j-...-sma-6303-spring-2008
   * Discovered 2026-05-23 via live extraction (slot:india U-MIT-LIVE-EXTRACT).
   */
  crossListing?: string;
  /** Optional override of pages to resolve. Defaults to the canonical set. */
  pages?: ResourcePageKind[];
}

export interface ResolvedResource {
  kind: ResourcePageKind;
  url: string;
}

export interface ResolveResult {
  courseId: string;
  baseUrl: string;
  slug: string;
  resources: ResolvedResource[];
  warnings: string[];
}

const DEFAULT_PAGES: ResourcePageKind[] = [
  "syllabus",
  "lecture_notes",
  "assignments",
  "exams",
  "video_galleries",
  "video_lectures",
  "related_resources",
  "readings",
  "projects",
];

const PAGE_PATH: Record<ResourcePageKind, string> = {
  syllabus: "pages/syllabus",
  lecture_notes: "pages/lecture-notes",
  assignments: "pages/assignments",
  exams: "pages/exams",
  video_galleries: "pages/video-galleries",
  video_lectures: "pages/video-lectures",
  related_resources: "pages/related-resources",
  readings: "pages/readings",
  projects: "pages/projects",
};

const BASE_HOST = "https://ocw.mit.edu";

// Course-id pattern: digits.digits[letter(s)] optionally followed by a J for
// joint courses, e.g. 2.830, 6.S191, 18.100A, 16.852J. Reject obvious junk
// but accept the full MIT catalog grammar.
const COURSE_ID_RE = /^[0-9]{1,3}\.[0-9A-Za-z]{1,8}j?$/i;

// Term slug grammar: <season>-<year> where season ∈ {spring, summer, fall, january-iap, winter}
const TERM_RE = /^(?:spring|summer|fall|january-iap|winter)-[0-9]{4}$/;

function slugifyTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isFiniteAndString(x: unknown): x is string {
  return typeof x === "string" && x.length > 0;
}

export class MitOcwResourceResolverEngine {
  /**
   * Resolve a course-id + optional title/term into the full canonical
   * MIT-OCW resource URL set.
   *
   * R12 fail-loud: throws on missing/malformed courseId. Missing title or
   * term degrade to a partial-slug URL (operator-visible via warnings).
   */
  resolve(input: ResolveInput): ResolveResult {
    if (!input || typeof input !== "object") {
      throw new Error("MitOcwResourceResolverEngine.resolve: input must be an object");
    }
    const { courseId, title, term, crossListing, pages } = input;

    if (!isFiniteAndString(courseId)) {
      throw new Error("MitOcwResourceResolverEngine.resolve: courseId required (non-empty string)");
    }
    if (!COURSE_ID_RE.test(courseId)) {
      throw new Error(
        `MitOcwResourceResolverEngine.resolve: courseId "${courseId}" does not match MIT-OCW grammar (expected <num>.<code>[j])`,
      );
    }

    const warnings: string[] = [];

    // Slug grammar: <courseId-dot-replaced-with-dash>-<title-slug>-<term>
    // e.g. "2-830-control-of-manufacturing-processes-spring-2008"
    const courseIdSlug = courseId.toLowerCase().replace(/\./g, "-");
    const titleSlug = isFiniteAndString(title) ? slugifyTitle(title) : "";
    if (!titleSlug) warnings.push("title not provided — slug may not match OCW canonical URL");

    let termSlug = "";
    if (isFiniteAndString(term)) {
      const lower = term.toLowerCase();
      if (!TERM_RE.test(lower)) {
        warnings.push(`term "${term}" does not match <season>-<year>; using verbatim`);
        termSlug = lower;
      } else {
        termSlug = lower;
      }
    } else {
      warnings.push("term not provided — slug may not match OCW canonical URL");
    }

    // Cross-listing slot — joint courses (J suffix on courseId) may carry
    // the SMA/Edgerton/etc. cross-listing as an extra slug fragment between
    // title and term. Discovered 2026-05-23 (slot:india U-MIT-LIVE-EXTRACT)
    // when 2.830J resolved to a 404 without "sma-6303" in the slug.
    let crossSlug = "";
    if (isFiniteAndString(crossListing)) {
      crossSlug = slugifyTitle(crossListing);
      // Warn (not throw) if the caller passed crossListing for a non-joint
      // course (no `j` suffix on courseId) — likely a usage mistake, but the
      // resolver still emits a sane slug so we don't break the caller.
      if (!courseId.toLowerCase().endsWith("j")) {
        warnings.push(
          `crossListing "${crossListing}" passed for non-joint courseId "${courseId}" (no J suffix) — extra slug fragment may not match OCW canonical URL`,
        );
      }
    }

    const slugParts = [courseIdSlug, titleSlug, crossSlug, termSlug].filter((p) => p.length > 0);
    const slug = slugParts.join("-");
    const baseUrl = `${BASE_HOST}/courses/${slug}`;

    const wantPages = Array.isArray(pages) && pages.length > 0 ? pages : DEFAULT_PAGES;
    const resources: ResolvedResource[] = wantPages.map((kind) => {
      const subpath = PAGE_PATH[kind];
      if (!subpath) {
        throw new Error(`MitOcwResourceResolverEngine.resolve: unknown page kind "${kind}"`);
      }
      return { kind, url: `${baseUrl}/${subpath}/` };
    });

    return { courseId, baseUrl, slug, resources, warnings };
  }

  /**
   * Batch resolve — same contract as `resolve()` over an array. Errors on
   * individual courses are captured into the result rather than thrown,
   * so a single bad course doesn't poison the batch.
   */
  resolveBatch(inputs: ResolveInput[]): Array<{ input: ResolveInput; result?: ResolveResult; error?: string }> {
    if (!Array.isArray(inputs)) {
      throw new Error("MitOcwResourceResolverEngine.resolveBatch: inputs must be an array");
    }
    return inputs.map((input) => {
      try {
        return { input, result: this.resolve(input) };
      } catch (e) {
        return { input, error: e instanceof Error ? e.message : String(e) };
      }
    });
  }

  /**
   * List the canonical page-kinds resolved by default. Useful for introspection.
   */
  defaultPages(): ResourcePageKind[] {
    return DEFAULT_PAGES.slice();
  }

  /**
   * Dispatcher execute wrapper — POST-ULT style routing.
   *  - mit_ocw_resolve_course_urls → resolve(params)
   *  - mit_ocw_resolve_batch       → resolveBatch(params.courses)
   *  - mit_ocw_default_pages       → defaultPages()
   */
  execute(action: string, params: any): unknown {
    const p = params ?? {};
    switch (action) {
      case "mit_ocw_resolve_course_urls":
        return this.resolve(p as ResolveInput);
      case "mit_ocw_resolve_batch":
        return this.resolveBatch((p.courses as ResolveInput[]) ?? []);
      case "mit_ocw_default_pages":
        return this.defaultPages();
      default:
        throw new Error(
          `MitOcwResourceResolverEngine.execute: unknown action "${action}"`,
        );
    }
  }
}

export const mitOcwResourceResolverEngine = new MitOcwResourceResolverEngine();
