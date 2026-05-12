/**
 * ConsensusQuorumEngine — Dynamic N-of-M quorum from change classification.
 *
 * Milestone: OCTOPUS-NEURAL-MS0 / U-OCN05.
 *
 * Job: classify a diff (file paths + commit subject + optional patch content)
 * into one of six categories and emit the right scrutiny quorum.
 *
 *   safety-critical → 5-of-5 (all 5 tentacles, no exceptions)
 *   major           → 3-of-3 (the existing PRISM default)
 *   mixed           → 3-of-3 (when signals span domains)
 *   minor           → 2-of-3 (lightweight: codex + claude-a + claude-b but only 2 must pass)
 *   test-only       → 1-of-1 (claude-a only)
 *   docs-only       → 1-of-1 (claude-a only)
 *   unknown         → 3-of-3 (safety-net: when in doubt, escalate to the default gate)
 *
 * Safety-net escalation: when ANY safety-critical signal fires the engine
 * returns 5-of-5 regardless of how few files the diff touches. Hidden-physics
 * edits inside an otherwise small diff are the most common ledger-poisoning
 * adversarial case the spec calls out, so the classifier is biased toward
 * over-counting safety hits, not under-counting.
 *
 * Oversized diffs: > MAX_FILES_FOR_FAST_PATH triggers an additional 'mixed'
 * tag, which kicks any non-safety result up to 3-of-3 minimum.
 *
 * This engine is a pure function over diff metadata — no I/O, no LLM calls.
 * It exists as the policy layer between scrutiny-3way.mjs (which currently
 * always runs 3-of-3) and the actual quorum gate.
 *
 * Integration path (deliberately deferred to a downstream unit):
 *   `.claude/scripts/scrutiny-3way.mjs` should query this engine before
 *   dispatching agents. The atomized spec lists that edit as step-3 of U-OCN05,
 *   but touching the live scrutiny script in mid-build trades correctness for
 *   meta-risk (a bug in this engine would tank every scrutiny pass). Wire-up
 *   should land as its own unit once the engine has accumulated production
 *   traffic via the prism_safety:quorum_required dispatcher action.
 *
 * @module engines/ConsensusQuorumEngine
 * @milestone OCTOPUS-NEURAL-MS0/U-OCN05
 */

export type DiffCategory = "safety-critical" | "major" | "mixed" | "minor" | "test-only" | "docs-only" | "unknown";

export interface DiffFile {
  /** Repo-relative path (forward slashes). */
  path: string;
  /** Added / removed line counts (optional — used as size signals). */
  addedLines?: number;
  removedLines?: number;
  /** Optional patch content for content-pattern signal matching. */
  patch?: string;
}

export interface DiffInput {
  files: DiffFile[];
  /** Commit subject line (often carries the [SCOPE]/U-ID tag — informative). */
  commitSubject?: string;
}

export interface QuorumDecision {
  category: DiffCategory;
  /** Required passing tentacles (e.g. 5 for 5-of-5, 2 for 2-of-3). */
  recommendedN: number;
  /** Total tentacle pool (e.g. 5 for 5-of-5, 3 for 2-of-3). */
  recommendedM: number;
  /** Concrete tentacle ids for the recommended pool. */
  tentacles: string[];
  rationale: string;
  /** Which classification signals fired (for traceability + tribal-tip ingest). */
  signals: string[];
  /** True if the safety-net pushed the result up from a less-strict category. */
  escalated: boolean;
  /** The pre-escalation category (informational when escalated=true). */
  rawCategory: DiffCategory;
  /** Files counted in the classification (after any cap). */
  fileCount: number;
  /** True when the diff exceeded MAX_FILES_FOR_FAST_PATH and was treated as 'mixed'-or-stricter. */
  oversized: boolean;
}

// ── Classification thresholds & path / content patterns ───────────────────────

/** Above this file count the diff is automatically treated as 'mixed' at minimum. */
const MAX_FILES_FOR_FAST_PATH = 100;
/** A diff with ≥ this many files is classified as 'major' even without engine-path hits. */
const MAJOR_FILE_COUNT_FLOOR = 10;
/** Above this file count we tag oversized=true but still classify; the safety-net keeps everything ≥ 3-of-3. */
const MINOR_MAX_FILES = 5;

/** Path patterns whose mere appearance triggers safety-critical (regardless of patch content). */
const SAFETY_CRITICAL_PATH_PATTERNS: RegExp[] = [
  /(^|\/)src\/physics\/constants\.ts$/i,
  /(^|\/)src\/physics\//i,
  /(^|\/)src\/(engines|algorithms)\/.*Safety.*\.ts$/i,
  /(^|\/)src\/(engines|algorithms)\/.*Kienzle.*\.ts$/i,
  /(^|\/)src\/(engines|algorithms)\/.*Taylor.*\.ts$/i,
  /(^|\/)src\/(engines|algorithms)\/.*Collision.*\.ts$/i,
  /(^|\/)src\/hooks\/(crossFieldPhysics|materialSanity|machineLimitGuard)\.ts$/i,
  /(^|\/)src\/data\/jm-die-profile\.ts$/i,
];

/** Patch-content patterns that flag safety-critical (e.g. naked Kienzle constants). */
const SAFETY_CRITICAL_CONTENT_PATTERNS: RegExp[] = [
  /\bkc1[._]1\s*[:=]/i,           // raw kc1.1 = ...
  /\btaylor[._]?(c|n|exponent)\b/i,
  /\b(maxAxisFeed|maxSpindlePower|maxSpindleSpeed)\s*[:=]/i,
  /\bSAFETY-CRITICAL\b/i,
];

/** Major-change path patterns (engines, dispatchers, schemas). */
const MAJOR_PATH_PATTERNS: RegExp[] = [
  /(^|\/)src\/engines\/[^/]+\.ts$/i,
  /(^|\/)src\/tools\/dispatchers\/[^/]+\.ts$/i,
  /(^|\/)src\/schemas\/[^/]+\.ts$/i,
  /(^|\/)src\/registries\/[^/]+\.ts$/i,
  /(^|\/)src\/algorithms\/[^/]+\.ts$/i,
];

/** Test-only path patterns (the diff is test-only iff ALL files match one of these). */
const TEST_PATH_PATTERNS: RegExp[] = [
  /(^|\/)__tests__\//i,
  /\.test\.[tj]s$/i,
  /\.spec\.[tj]s$/i,
];

/** Docs-only path patterns (the diff is docs-only iff ALL files match one of these). */
const DOCS_PATH_PATTERNS: RegExp[] = [
  /\.md$/i,
  /\.mdx$/i,
  /(^|\/)docs?\//i,
  /(^|\/)wiki\//i,
  /(^|\/)knowledge\//i,
  /(^|\/)README/i,
];

// ── Tentacle pool definitions ───────────────────────────────────────────────

const POOL_5_OF_5: string[] = ["codex", "claude-a", "claude-b", "kimi-k2", "gemini"];
const POOL_3_OF_3: string[] = ["codex", "claude-a", "claude-b"];
const POOL_1_OF_1: string[] = ["claude-a"];

export class ConsensusQuorumEngine {
  /**
   * Classify a diff and emit the recommended quorum. Pure function — no I/O.
   * Never throws on input shape oddities (missing patch, empty paths) so it
   * can run in the hot path of scrutiny-3way.mjs without becoming a failure
   * surface itself.
   */
  classify(diff: DiffInput): QuorumDecision {
    this.validate(diff);
    const files = diff.files;
    const fileCount = files.length;
    const oversized = fileCount > MAX_FILES_FOR_FAST_PATH;

    const signals: string[] = [];
    if (oversized) signals.push(`oversized:${fileCount}>${MAX_FILES_FOR_FAST_PATH}`);

    // Stage 1: safety-critical signal scan (highest precedence).
    const safetyHits = this.findSafetyCriticalHits(files);
    for (const h of safetyHits) signals.push(`safety:${h}`);

    // Stage 2: test-only / docs-only detection (must be UNIVERSAL across all files).
    const allTests = files.length > 0 && files.every((f) => TEST_PATH_PATTERNS.some((p) => p.test(f.path)));
    const allDocs = files.length > 0 && files.every((f) => DOCS_PATH_PATTERNS.some((p) => p.test(f.path)));
    if (allTests) signals.push("test-only");
    if (allDocs) signals.push("docs-only");

    // Stage 3: major-path hits (engines, dispatchers, schemas, algos).
    const majorHits = files.filter((f) => MAJOR_PATH_PATTERNS.some((p) => p.test(f.path)));
    if (majorHits.length > 0) signals.push(`major-paths:${majorHits.length}`);

    // Stage 4: raw category — first hit wins, in this precedence order.
    let rawCategory: DiffCategory;
    if (safetyHits.length > 0) rawCategory = "safety-critical";
    else if (allTests) rawCategory = "test-only";
    else if (allDocs) rawCategory = "docs-only";
    else if (majorHits.length > 0 || fileCount >= MAJOR_FILE_COUNT_FLOOR) rawCategory = "major";
    else if (this.isMixedSignal(files)) rawCategory = "mixed";
    else if (fileCount > 0 && fileCount <= MINOR_MAX_FILES) rawCategory = "minor";
    else rawCategory = "unknown";

    // Stage 5: safety-net escalation. Safety-critical never gets downgraded; other
    // categories may get pushed up when the diff is oversized or has commit-subject
    // safety markers we missed in the path/content scan.
    let category: DiffCategory = rawCategory;
    let escalated = false;
    const subjectSafetyHint = (diff.commitSubject ?? "").match(/SAFETY|PHYSICS|KIENZLE|TAYLOR|CONSTANT/i);
    if (subjectSafetyHint && category !== "safety-critical") {
      signals.push(`subject-hint:${subjectSafetyHint[0]}`);
      category = "safety-critical";
      escalated = true;
    }
    if (oversized && category !== "safety-critical") {
      if (category === "minor" || category === "test-only" || category === "docs-only") {
        category = "major";
        escalated = true;
      }
    }
    if (rawCategory === "unknown") {
      // safety-net: unknown defaults to major (3-of-3) — never trust an unclassified diff.
      category = "major";
      escalated = true;
    }

    // Stage 6: map category to quorum.
    const quorum = this.quorumFor(category);

    // Stage 7: rationale.
    const rationale = this.renderRationale(category, rawCategory, escalated, signals, fileCount, safetyHits, majorHits.length);

    return {
      category,
      recommendedN: quorum.n,
      recommendedM: quorum.m,
      tentacles: quorum.tentacles,
      rationale,
      signals,
      escalated,
      rawCategory,
      fileCount,
      oversized,
    };
  }

  // ---- internals ----

  private validate(diff: DiffInput): void {
    if (!diff || typeof diff !== "object") throw new Error("DiffInput required");
    if (!Array.isArray(diff.files)) throw new Error("diff.files must be an array");
    for (const f of diff.files) {
      if (!f || typeof f !== "object") throw new Error("each file must be an object");
      if (typeof f.path !== "string" || f.path.length === 0) throw new Error("file.path must be a non-empty string");
    }
  }

  /** Returns the matched path patterns + (optionally) the patch-content signature. */
  private findSafetyCriticalHits(files: DiffFile[]): string[] {
    const hits: string[] = [];
    for (const f of files) {
      for (const p of SAFETY_CRITICAL_PATH_PATTERNS) {
        if (p.test(f.path)) { hits.push(`path:${f.path}`); break; }
      }
      if (f.patch) {
        for (const p of SAFETY_CRITICAL_CONTENT_PATTERNS) {
          if (p.test(f.patch)) { hits.push(`content:${p.source.slice(0, 40)} in ${f.path}`); break; }
        }
      }
    }
    return hits;
  }

  /**
   * "Mixed" = diff spans both engine-tier paths and ancillary (test/docs/config)
   * paths in the same commit. We use this as a hint to bump non-major work up to
   * major when the change isn't crisply confined to one domain.
   */
  private isMixedSignal(files: DiffFile[]): boolean {
    const hasEngine = files.some((f) => MAJOR_PATH_PATTERNS.some((p) => p.test(f.path)));
    const hasTests = files.some((f) => TEST_PATH_PATTERNS.some((p) => p.test(f.path)));
    const hasDocs = files.some((f) => DOCS_PATH_PATTERNS.some((p) => p.test(f.path)));
    const hasConfig = files.some((f) => /\.(json|ya?ml|toml|env)$/i.test(f.path));
    // Mixed iff ≥ 2 of {engine, tests, docs, config} categories present.
    const present = [hasEngine, hasTests, hasDocs, hasConfig].filter(Boolean).length;
    return present >= 2 && !files.every((f) => MAJOR_PATH_PATTERNS.some((p) => p.test(f.path)));
  }

  private quorumFor(category: DiffCategory): { n: number; m: number; tentacles: string[] } {
    switch (category) {
      case "safety-critical": return { n: 5, m: 5, tentacles: POOL_5_OF_5 };
      case "major":           return { n: 3, m: 3, tentacles: POOL_3_OF_3 };
      case "mixed":           return { n: 3, m: 3, tentacles: POOL_3_OF_3 };
      case "minor":           return { n: 2, m: 3, tentacles: POOL_3_OF_3 };
      case "test-only":       return { n: 1, m: 1, tentacles: POOL_1_OF_1 };
      case "docs-only":       return { n: 1, m: 1, tentacles: POOL_1_OF_1 };
      case "unknown":         return { n: 3, m: 3, tentacles: POOL_3_OF_3 };
    }
  }

  private renderRationale(
    category: DiffCategory,
    rawCategory: DiffCategory,
    escalated: boolean,
    signals: string[],
    fileCount: number,
    safetyHits: string[],
    majorHits: number,
  ): string {
    const parts: string[] = [];
    parts.push(`Classification: ${category}${escalated ? ` (escalated from ${rawCategory})` : ""}`);
    parts.push(`Diff: ${fileCount} files`);
    if (safetyHits.length > 0) parts.push(`Safety hits: ${safetyHits.length}`);
    if (majorHits > 0) parts.push(`Major-path hits: ${majorHits}`);
    if (signals.length > 0) parts.push(`Signals: [${signals.slice(0, 8).join(", ")}${signals.length > 8 ? ", …" : ""}]`);
    return parts.join(" | ");
  }
}

export const consensusQuorumEngine = new ConsensusQuorumEngine();
