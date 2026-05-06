/**
 * WikiBootstrapEngine — bootstrap the PRISM wiki with general-physics / ML
 * entries derived from the MIT OCW course registries
 * (`MIT_COURSE_INDEX.json`, `ALGORITHM_REGISTRY.json`) that the
 * MITCourse* engines already load.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U04.
 *
 * Why this exists
 * ---------------
 * MITCourseRegistryEngine + MITCourseKnowledgeEngine + MITCourseIntegrationEngine
 * already load 225 courses and 285 algorithms in-memory, but those are runtime
 * structures — Claude can query them via dispatcher actions, but they don't
 * surface as navigable wiki/ pages with citation footers. P14-U04 closes that
 * gap by transforming the registries into per-course / per-algorithm markdown
 * entries plus an index extension.
 *
 * Scope filter
 * ------------
 * Only "general" categories — math/CS/ML fundamentals applicable across
 * domains, NOT shop-floor / CAM-specific applied content (those live in
 * domain-specific engines and would be redundant in a general wiki). The
 * default `DEFAULT_GENERAL_CATEGORIES` set is documented and overridable
 * per call so the test fixture can verify both inclusion and exclusion paths.
 *
 * Pure functions; no fs I/O. The driver script (scripts/wiki-bootstrap-mit.mjs)
 * does the disk reads + writes.
 *
 * @module engines/WikiBootstrapEngine
 */

const SLUG_NON_ALNUM_RE = /[^a-z0-9]+/g;
const SLUG_LEADING_TRAILING_DASH_RE = /^-+|-+$/g;
const MAX_SLUG_LEN = 80;
const MAX_TITLE_LEN = 200;
const MAX_TOPIC_LEN = 80;
const MAX_INDEX_DESCRIPTION_LEN = 240;

export type WikiEntryKind = "concept" | "algorithm" | "course";

export interface MITCourseSource {
  category: string;
  /** TIER_1 / TIER_2 / TIER_3 — pulled from coursesByCategory[cat].priority */
  priority: string;
  course_id: string;
  course_name: string;
  /** zip filename for traceability */
  course_file: string;
  topics: string[];
}

export interface MITAlgorithmSource {
  category: string;
  /** e.g. "linear_programming" — sub-bucket inside the category */
  subcategory: string;
  algorithm_name: string;
  /** Course this algorithm is taught in (e.g. "6.251J") */
  course_id: string;
  /** Engines from algorithm-registry that already wire this algorithm */
  prism_engines: string[];
}

export interface WikiEntry {
  /** Stable id used as filename + in wiki/index.md */
  id: string;
  /** Display title */
  title: string;
  kind: WikiEntryKind;
  /** Markdown body, including a citation footer line */
  body: string;
  citation: {
    course_id: string;
    course_name: string;
    topic: string;
  };
  /** Cross-references to PRISM engines that already implement this concept */
  related_engines: string[];
}

export class WikiBootstrapEngine {
  /**
   * Categories considered "general" — math, CS, ML, control fundamentals.
   * Applied/domain-specific categories (manufacturing, business_finance,
   * databases, security, human_factors, materials) are excluded by default
   * because they're either shop-floor-applied or out of scope for a general
   * wiki. Override per call via the `allowed` argument.
   */
  static readonly DEFAULT_GENERAL_CATEGORIES: readonly string[] = Object.freeze([
    "algorithms",
    "optimization",
    "machine_learning",
    "statistics_probability",
    "control_dynamics",
    "signal_processing",
    "numerical_methods",
    "parallel_computing",
  ]);

  /** Predicate: is this category in the allowed set? */
  isGeneralCategory(name: string, allowed?: readonly string[]): boolean {
    if (typeof name !== "string" || name.length === 0) return false;
    const list = allowed && allowed.length > 0 ? allowed : WikiBootstrapEngine.DEFAULT_GENERAL_CATEGORIES;
    return list.includes(name);
  }

  /**
   * Walk MIT_COURSE_INDEX.coursesByCategory and emit one MITCourseSource per
   * allowed (category, course) pair. Malformed entries (missing id/name)
   * are skipped silently — the registries are large and noisy.
   */
  filterIndex(rawIndex: unknown, allowed?: readonly string[]): MITCourseSource[] {
    const out: MITCourseSource[] = [];
    if (!rawIndex || typeof rawIndex !== "object") return out;
    const idx = rawIndex as Record<string, unknown>;
    const byCat = idx.coursesByCategory;
    if (!byCat || typeof byCat !== "object") return out;
    for (const [category, raw] of Object.entries(byCat as Record<string, unknown>)) {
      if (!this.isGeneralCategory(category, allowed)) continue;
      if (!raw || typeof raw !== "object") continue;
      const bucket = raw as Record<string, unknown>;
      const priority = typeof bucket.priority === "string" ? bucket.priority : "UNKNOWN";
      const courses = bucket.courses;
      if (!Array.isArray(courses)) continue;
      for (const c of courses) {
        if (!c || typeof c !== "object") continue;
        const obj = c as Record<string, unknown>;
        const course_id = typeof obj.id === "string" ? obj.id : "";
        const course_name = typeof obj.name === "string" ? obj.name : "";
        const course_file = typeof obj.file === "string" ? obj.file : "";
        const topics = Array.isArray(obj.topics)
          ? obj.topics.filter((t): t is string => typeof t === "string").map((t) => t.slice(0, MAX_TOPIC_LEN))
          : [];
        if (course_id.length === 0 || course_name.length === 0) continue;
        out.push({ category, priority, course_id, course_name, course_file, topics });
      }
    }
    return out;
  }

  /**
   * Walk ALGORITHM_REGISTRY.categories and emit one MITAlgorithmSource per
   * algorithm in an allowed category. Shape is two-deep:
   *   category → subcategory → { algorithms: [{ name, course, prismEngines }] }.
   */
  filterAlgorithms(rawRegistry: unknown, allowed?: readonly string[]): MITAlgorithmSource[] {
    const out: MITAlgorithmSource[] = [];
    if (!rawRegistry || typeof rawRegistry !== "object") return out;
    const reg = rawRegistry as Record<string, unknown>;
    const cats = reg.categories;
    if (!cats || typeof cats !== "object") return out;
    for (const [category, sub] of Object.entries(cats as Record<string, unknown>)) {
      if (!this.isGeneralCategory(category, allowed)) continue;
      if (!sub || typeof sub !== "object") continue;
      for (const [subcategory, subRaw] of Object.entries(sub as Record<string, unknown>)) {
        if (!subRaw || typeof subRaw !== "object") continue;
        const algs = (subRaw as Record<string, unknown>).algorithms;
        if (!Array.isArray(algs)) continue;
        for (const a of algs) {
          if (!a || typeof a !== "object") continue;
          const obj = a as Record<string, unknown>;
          const algorithm_name = typeof obj.name === "string" ? obj.name : "";
          const course_id = typeof obj.course === "string" ? obj.course : "";
          const prism_engines = Array.isArray(obj.prismEngines)
            ? obj.prismEngines.filter((e): e is string => typeof e === "string")
            : [];
          if (algorithm_name.length === 0) continue;
          out.push({ category, subcategory, algorithm_name, course_id, prism_engines });
        }
      }
    }
    return out;
  }

  /**
   * Render a course entry. Body is a stable Markdown shape:
   *
   *   # MIT 6.001 — SICP
   *   **Category:** algorithms · **Priority:** TIER_1
   *   **Topics:** abstraction, recursion, ...
   *   ## Citation
   *   - **Course:** 6.001 — SICP
   *   - **File:** 6.001-spring-2005.zip
   *
   * id is `mit-{slug(course_id)}-{slug(course_name)}`; safe for filenames.
   */
  renderCourseEntry(course: MITCourseSource): WikiEntry {
    if (!course || typeof course !== "object" || course.course_id.length === 0) {
      throw new TypeError("WikiBootstrapEngine.renderCourseEntry: course requires non-empty course_id");
    }
    const slug = `mit-${this.slugify(course.course_id)}-${this.slugify(course.course_name)}`.slice(0, MAX_SLUG_LEN);
    const title = `MIT ${course.course_id} — ${course.course_name}`.slice(0, MAX_TITLE_LEN);
    const topicsLine = course.topics.length > 0 ? course.topics.join(", ") : "(no topics listed)";
    const body = [
      `# ${title}`,
      "",
      `**Category:** ${course.category} · **Priority:** ${course.priority}`,
      "",
      `**Topics:** ${topicsLine}`,
      "",
      "## Citation",
      `- **Course:** ${course.course_id} — ${course.course_name}`,
      `- **File:** ${course.course_file || "(not specified)"}`,
      "",
    ].join("\n");
    return {
      id: slug,
      title,
      kind: "course",
      body,
      citation: {
        course_id: course.course_id,
        course_name: course.course_name,
        topic: course.category,
      },
      related_engines: [],
    };
  }

  /**
   * Render an algorithm entry. Cross-links to the algorithm's PRISM engine
   * implementations so opening "Simplex Method" surfaces e.g.
   * `PRISM_CONSTRAINED_OPTIMIZER` and `PRISM_SCHEDULING_ENGINE`.
   */
  renderAlgorithmEntry(alg: MITAlgorithmSource): WikiEntry {
    if (!alg || typeof alg !== "object" || alg.algorithm_name.length === 0) {
      throw new TypeError("WikiBootstrapEngine.renderAlgorithmEntry: alg requires non-empty algorithm_name");
    }
    const slug = `mit-alg-${this.slugify(alg.algorithm_name)}`.slice(0, MAX_SLUG_LEN);
    const title = alg.algorithm_name.slice(0, MAX_TITLE_LEN);
    const enginesLine = alg.prism_engines.length > 0
      ? alg.prism_engines.map((e) => `\`${e}\``).join(", ")
      : "(no PRISM engines mapped yet)";
    const courseFooter = alg.course_id.length > 0
      ? `- **Course:** MIT ${alg.course_id}`
      : "- **Course:** (not specified)";
    const body = [
      `# ${title}`,
      "",
      `**Category:** ${alg.category} · ${alg.subcategory}`,
      "",
      `**Related PRISM engines:** ${enginesLine}`,
      "",
      "## Citation",
      courseFooter,
      "",
    ].join("\n");
    return {
      id: slug,
      title,
      kind: "algorithm",
      body,
      citation: {
        course_id: alg.course_id,
        course_name: "",
        topic: `${alg.category}/${alg.subcategory}`,
      },
      related_engines: [...alg.prism_engines],
    };
  }

  /**
   * Build a single wiki/index.md line. Format mirrors the existing 722-entry
   * index style: `- [Title](path) — kind · category`.
   */
  buildIndexLine(entry: WikiEntry): string {
    if (!entry || typeof entry !== "object" || entry.id.length === 0) {
      throw new TypeError("WikiBootstrapEngine.buildIndexLine: entry requires non-empty id");
    }
    const dirName = entry.kind === "course" ? "courses" : entry.kind === "algorithm" ? "algorithms" : "concepts";
    const description = `${entry.kind} · ${entry.citation.topic || ""}`.slice(0, MAX_INDEX_DESCRIPTION_LEN);
    return `- [${entry.title}](mit/${dirName}/${entry.id}.md) — ${description}`;
  }

  /**
   * Append new index lines, deduplicating against any line that already
   * uses the same `[…](link)` link target. Idempotent: re-running with
   * the same input produces the same output.
   *
   * Existing lines are preserved verbatim — no resort, no whitespace
   * normalization — so this is safe to call against a hand-curated index.
   */
  insertIndexEntries(existingIndex: string, lines: readonly string[]): string {
    const safeExisting = typeof existingIndex === "string" ? existingIndex : "";
    if (!Array.isArray(lines) || lines.length === 0) return safeExisting;
    const existingLineSet = new Set<string>();
    const existingLinkSet = new Set<string>();
    for (const l of safeExisting.split(/\r?\n/)) {
      const trimmed = l.trimEnd();
      existingLineSet.add(trimmed);
      const m = trimmed.match(/^\s*-\s*\[([^\]]+)\]\(([^)]+)\)/);
      if (m) existingLinkSet.add(m[2]);
    }
    const additions: string[] = [];
    const seenInRun = new Set<string>();
    for (const raw of lines) {
      if (typeof raw !== "string") continue;
      const trimmed = raw.trimEnd();
      if (trimmed.length === 0) continue;
      if (existingLineSet.has(trimmed) || seenInRun.has(trimmed)) continue;
      const m = trimmed.match(/^\s*-\s*\[([^\]]+)\]\(([^)]+)\)/);
      if (m && existingLinkSet.has(m[2])) continue;
      additions.push(trimmed);
      seenInRun.add(trimmed);
    }
    if (additions.length === 0) return safeExisting;
    const trimmed = safeExisting.replace(/\s+$/, "");
    const sep = trimmed.length === 0 ? "" : "\n";
    return trimmed + sep + "\n" + additions.join("\n") + "\n";
  }

  /**
   * URL/filename-safe slug. Lowercases, swaps non-alphanumeric runs for
   * single dashes, strips leading/trailing dashes, and clamps to MAX_SLUG_LEN.
   */
  slugify(text: string): string {
    if (typeof text !== "string") return "";
    return text
      .toLowerCase()
      .replace(SLUG_NON_ALNUM_RE, "-")
      .replace(SLUG_LEADING_TRAILING_DASH_RE, "")
      .slice(0, MAX_SLUG_LEN);
  }
}

export const wikiBootstrapEngine = new WikiBootstrapEngine();
