/**
 * JMDiePostProcessorLearningEngine — FEATURE-GAP-AUDIT-MS0 / U-GAP-POST-JMDIE-LEARNING
 *
 * Learns post-processor enhancement patterns from JM Die's PRISM-modified
 * Fusion 360 / HSMWorks `.cps` post-processors (Haas / Hurco / Okuma / Roku-Roku).
 *
 * Each `.cps` is a post-processor SOURCE file (declarative globals + a
 * `properties = {}` block + JavaScript). JM Die hand-modified the stock
 * Autodesk posts with PRISM / AI / iMachining enhancements. This engine parses
 * the corpus and extracts the learnable enhancement patterns so PRISM can
 * recommend the same enhancements when generating new post-processors.
 *
 * REAL parsing — every field is read from the actual `.cps` source. There is
 * no fabricated data and no randomness (contrast `JMDieProgramLearningEngine`,
 * whose `loadPatterns()` is a `Math.random()` stub for a different corpus).
 *
 * Sibling engine in `prism_knowledge`: `JMDIEPatternAnalyzer` learns from JM
 * Die G-code *programs*; this engine learns from the post-processor *sources*.
 *
 * @module engines/JMDiePostProcessorLearningEngine
 */

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { log } from "../utils/Logger.js";

/** A single parsed `.cps` post-processor source file. */
export interface PostProcessorProfile {
  /** Basename of the `.cps` file. */
  file: string;
  /** File size in bytes (0 when parsed from a content string). */
  sizeBytes: number;
  /** Controller family inferred from the filename. */
  controllerFamily: "haas" | "hurco" | "okuma" | "roku-roku" | "unknown";
  /** Human-readable machine label derived from the filename. */
  machine: string;
  /** Process type from `capabilities` / filename keywords. */
  processType: "mill" | "lathe" | "mill-turn" | "unknown";
  /** `vendor = "..."` global, or null if absent. */
  vendor: string | null;
  /** First `description = "..."` global, or null if absent. */
  description: string | null;
  /** `extension = "..."` global (output NC file extension), or null. */
  extension: string | null;
  /** `certificationLevel = N` global, or null if absent. */
  certificationLevel: number | null;
  /** Autodesk `FORKID {...}` identifier, or null if absent. */
  forkId: string | null;
  /** `$Revision: ... $` marker text, or null if absent. */
  revision: string | null;
  /** Names of the keys in the `properties = {}` block. */
  properties: string[];
  /** Count of configurable properties. */
  propertyCount: number;
  /** Detected PRISM / AI enhancement marker ids. */
  enhancements: string[];
  /**
   * Distinct G/M dialect codes referenced anywhere in the source — emitted
   * code, format strings, and header-comment dialect documentation all count
   * toward the controller fingerprint. Capped at `MAX_CONTROLLER_CODES`, sorted.
   */
  controllerCodes: string[];
}

/** A learned pattern: an enhancement consistently applied within a family. */
export interface LearnedPattern {
  id: string;
  controllerFamily: string;
  enhancement: string;
  /** Number of posts in the family carrying this enhancement. */
  support: number;
  /** Total posts in the family. */
  familySize: number;
  /** support / familySize, in [0,1]. */
  confidence: number;
  recommendation: string;
}

/** Aggregate corpus learned from the full `.cps` set. */
export interface PostProcessorCorpus {
  schemaVersion: string;
  /** Directory the corpus was read from. */
  sourceDir: string;
  profileCount: number;
  profiles: PostProcessorProfile[];
  /** enhancement id → number of posts carrying it. */
  enhancementFrequency: Record<string, number>;
  /** controllerFamily → roll-up. */
  byControllerFamily: Record<
    string,
    { count: number; machines: string[]; enhancements: string[] }
  >;
  /** Learned per-family enhancement patterns (confidence ≥ threshold). */
  patterns: LearnedPattern[];
  /** Set when the corpus could not be read (e.g. directory absent). */
  warning?: string;
}

/**
 * Per-post and corpus-wide enhancement-gap analysis (produced by `gapReport()`).
 */
export interface PostProcessorGapReport {
  schemaVersion: string;
  profileCount: number;
  /** Per-post gaps: family-consistent enhancements (≥ pattern threshold) the post lacks. */
  postGaps: {
    file: string;
    controllerFamily: string;
    machine: string;
    /** Count of enhancement markers this post carries. */
    enhancementCount: number;
    /** enhancementCount / total markers, in [0,1]. */
    valueScore: number;
    /** Family patterns (confidence ≥ threshold) absent from this post, sorted. */
    missingFamilyPatterns: string[];
  }[];
  /** Enhancement markers carried by fewer than half the posts — fleet-wide adoption gaps. */
  corpusWideGaps: {
    enhancement: string;
    /** presentIn / profileCount, in [0,1]. */
    coverage: number;
    presentIn: number;
    absentFrom: number;
  }[];
  /** Prioritized, human-readable enhancement recommendations. */
  recommendations: string[];
  /** Set when the corpus could not be read. */
  warning?: string;
}

const SCHEMA_VERSION = "1.0.0";
const CORPUS_THRESHOLD = 0.5; // an enhancement is a "pattern" at ≥50% family support
const MAX_CONTROLLER_CODES = 80;

/**
 * Curated enhancement markers. Each id is matched case-insensitively against
 * the raw `.cps` text. Markers were derived by reading the JM Die corpus
 * (Hurco: G05.3 / UltiMotion / sidecar / rigid tapping; Haas: dynamic depth
 * feed / iMachining / chip thinning / adaptive / deflection; Okuma: SSV /
 * load monitoring).
 */
const ENHANCEMENT_MARKERS: { id: string; patterns: RegExp[] }[] = [
  { id: "imachining_variable_feed", patterns: [/imachining/i] },
  { id: "ai_enhanced", patterns: [/ai[- ]enhanced/i, /enhanced edition/i] },
  { id: "prism_physics_integration", patterns: [/\bprism\b/i] },
  { id: "sidecar_json_export", patterns: [/sidecar/i] },
  { id: "chip_thinning_compensation", patterns: [/chip[- ]thinning/i] },
  { id: "adaptive_feed_control", patterns: [/adaptive feed/i, /3d adaptive/i] },
  { id: "dynamic_depth_feed", patterns: [/dynamic depth feed/i, /dynamic feed/i] },
  { id: "path_smoothing", patterns: [/\bsmoothing\b/i, /\bg05\.3\b/i, /ultimotion/i] },
  { id: "spindle_speed_variation", patterns: [/spindle speed variation/i, /\bssv\b/i] },
  { id: "rigid_tapping", patterns: [/rigid tap/i] },
  { id: "lookahead_optimization", patterns: [/look[- ]?ahead/i] },
  { id: "tool_deflection_analysis", patterns: [/deflection/i] },
  { id: "aggressiveness_control", patterns: [/aggressiveness/i] },
  { id: "load_monitoring", patterns: [/load monitor/i] },
  { id: "physics_data_integration", patterns: [/physics[- ]optimized/i, /physics data/i] },
];

/** Candidate corpus directories, tried in order. */
const SOURCE_CANDIDATES = [
  "H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS",
  path.resolve(process.cwd(), "..", "JM DIE", "PRISM MODIFIED POST PROCESSORS"),
  path.resolve(process.cwd(), "JM DIE", "PRISM MODIFIED POST PROCESSORS"),
];

/** Zod schema for the `queryByController` family argument. */
const ControllerFamilySchema = z
  .enum(["haas", "hurco", "okuma", "roku-roku", "unknown"])
  .describe("Controller family to filter post-processor profiles by");

/**
 * JMDiePostProcessorLearningEngine — pure static parsing engine.
 *
 * No singleton instance: parsing is deterministic and the only mutable state
 * is a corpus cache, cleared via `reset()`.
 */
export class JMDiePostProcessorLearningEngine {
  /** Cached corpus from the most recent `learn()` / `getCorpus()` call. */
  private static cache: PostProcessorCorpus | null = null;

  /** True when `dir` is an existing, readable directory. */
  private static isDir(dir: string): boolean {
    try {
      return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Resolve the `.cps` corpus directory.
   *
   * - With an explicit `dir`: that exact directory is honored — returned if it
   *   exists, else null. There is NO fallback to discovery (a caller that
   *   names a directory means *that* directory; silently substituting another
   *   would be a fail-loud violation).
   * - Without an argument: returns the first `SOURCE_CANDIDATES` entry that
   *   exists, or null when none is reachable (e.g. CI without the H: drive).
   */
  static resolveSourceDir(explicit?: string): string | null {
    if (explicit !== undefined) {
      return JMDiePostProcessorLearningEngine.isDir(explicit) ? explicit : null;
    }
    for (const dir of SOURCE_CANDIDATES) {
      if (JMDiePostProcessorLearningEngine.isDir(dir)) return dir;
    }
    return null;
  }

  /**
   * Blank out JavaScript line comments, block comments, and string literals
   * (single-quote, double-quote, and backtick template literals) from a
   * source slice so that brace-matching is not fooled by `{`/`}` inside them.
   * Stripped spans are replaced with spaces to preserve character indices.
   *
   * Regex literals are NOT stripped — Fusion 360 `properties = {}` blocks are
   * pure data (no regex), so a regex literal cannot leak braces into the
   * property-block brace scan in practice.
   */
  private static blankCommentsAndStrings(src: string): string {
    const out = src.split("");
    let i = 0;
    const n = src.length;
    while (i < n) {
      const c = src[i];
      const c2 = src[i + 1];
      if (c === "/" && c2 === "/") {
        while (i < n && src[i] !== "\n") out[i++] = " ";
        continue;
      }
      if (c === "/" && c2 === "*") {
        out[i++] = " ";
        out[i++] = " ";
        while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
          if (src[i] !== "\n") out[i] = " ";
          i++;
        }
        if (i < n) {
          out[i++] = " ";
          out[i++] = " ";
        }
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        const quote = c;
        out[i++] = " ";
        while (i < n && src[i] !== quote) {
          if (src[i] === "\\" && i + 1 < n) {
            out[i++] = " ";
          }
          if (i < n && src[i] !== "\n") out[i] = " ";
          if (i < n && src[i] !== "\n") i++;
          else if (i < n) i++;
        }
        if (i < n) out[i++] = " ";
        continue;
      }
      i++;
    }
    return out.join("");
  }

  /**
   * Extract the property names from a `properties = { ... }` block. Uses a
   * comment/string-blanked copy of the source for safe brace-matching, then
   * collects depth-1 `name: {` definitions.
   */
  private static extractProperties(content: string): string[] {
    const blanked = JMDiePostProcessorLearningEngine.blankCommentsAndStrings(content);
    const decl = /\bproperties\s*=\s*\{/.exec(blanked);
    if (!decl) return [];
    const open = decl.index + decl[0].length - 1; // index of the `{`
    let depth = 0;
    let close = -1;
    for (let i = open; i < blanked.length; i++) {
      if (blanked[i] === "{") depth++;
      else if (blanked[i] === "}") {
        depth--;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    if (close < 0) return [];
    const block = blanked.slice(open + 1, close);
    // Depth-1 property definitions look like `name: {` (each Fusion property
    // is an object). Tokenize `name: {`, `{`, `}` and record a name only when
    // it opens a property at the top level of the properties object.
    const names: string[] = [];
    let depth1 = 0;
    let m: RegExpExecArray | null;
    const tokenRe = /([A-Za-z_$][\w$]*)\s*:\s*\{|\{|\}/g;
    while ((m = tokenRe.exec(block)) !== null) {
      if (m[0] === "{") {
        depth1++;
      } else if (m[0] === "}") {
        depth1--;
      } else {
        if (depth1 === 0 && m[1]) names.push(m[1]);
        depth1++; // the `{` in `name: {` opens a new level
      }
    }
    return Array.from(new Set(names));
  }

  /** Infer the controller family from a `.cps` filename. */
  private static inferFamily(file: string): PostProcessorProfile["controllerFamily"] {
    const f = file.toLowerCase();
    if (f.includes("roku")) return "roku-roku";
    if (f.includes("haas")) return "haas";
    if (f.includes("hurco")) return "hurco";
    if (f.includes("okuma")) return "okuma";
    return "unknown";
  }

  /** Infer mill / lathe / mill-turn from `capabilities` + filename keywords. */
  private static inferProcessType(
    file: string,
    content: string,
  ): PostProcessorProfile["processType"] {
    const hasMill = /capabilities\s*=\s*[^;]*CAPABILITY_MILLING/.test(content);
    const hasTurn = /capabilities\s*=\s*[^;]*CAPABILITY_TURNING/.test(content);
    if (hasMill && hasTurn) return "mill-turn";
    if (hasMill) return "mill";
    if (hasTurn) return "lathe";
    const f = file.toLowerCase();
    if (f.includes("multus")) return "mill-turn";
    if (f.includes("lathe") || f.includes("lb3000") || /genos_l|l400/.test(f)) return "lathe";
    if (/vf2|vf-2|vm30|m460v|roku/.test(f)) return "mill";
    return "unknown";
  }

  /** Build a human-readable machine label from a filename. */
  private static machineLabel(file: string): string {
    let base = file.replace(/\.cps$/i, "");
    // Cut at the first enhancement-suffix marker.
    base = base.split(/\s*[-_]?\s*(?:ai[- ]enhanced|prism|enhanced|\()/i)[0];
    return base.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim() || file;
  }

  /**
   * Parse one `.cps` source string into a `PostProcessorProfile`. Pure — no
   * I/O — so it is the unit-test surface. `sizeBytes` is supplied by the
   * caller (0 when unknown).
   */
  static parseCpsContent(
    content: string,
    file: string,
    sizeBytes = 0,
  ): PostProcessorProfile {
    const safeContent = typeof content === "string" ? content : "";
    const grab = (re: RegExp): string | null => {
      const m = re.exec(safeContent);
      return m && m[1] != null ? m[1].trim() : null;
    };

    const certRaw = grab(/\bcertificationLevel\s*=\s*(\d+)/);
    const cert = certRaw != null ? Number(certRaw) : null;

    // Distinct G/M dialect codes (e.g. G05.3, M140, G84.2, G96).
    const codeSet = new Set<string>();
    const codeRe = /\b([GM]\d{1,3}(?:\.\d)?)\b/g;
    let cm: RegExpExecArray | null;
    while ((cm = codeRe.exec(safeContent)) !== null) {
      codeSet.add(cm[1].toUpperCase());
      // Stop collecting once the distinct set is comfortably larger than the
      // final cap — a real controller has far fewer than this many codes.
      if (codeSet.size >= MAX_CONTROLLER_CODES * 4) break;
    }
    const controllerCodes = Array.from(codeSet).sort().slice(0, MAX_CONTROLLER_CODES);

    // Enhancement markers.
    const enhancements: string[] = [];
    for (const marker of ENHANCEMENT_MARKERS) {
      if (marker.patterns.some((p) => p.test(safeContent))) enhancements.push(marker.id);
    }

    const properties = JMDiePostProcessorLearningEngine.extractProperties(safeContent);

    return {
      file,
      sizeBytes: Number.isFinite(sizeBytes) && sizeBytes >= 0 ? sizeBytes : 0,
      controllerFamily: JMDiePostProcessorLearningEngine.inferFamily(file),
      machine: JMDiePostProcessorLearningEngine.machineLabel(file),
      processType: JMDiePostProcessorLearningEngine.inferProcessType(file, safeContent),
      vendor: grab(/\bvendor\s*=\s*"([^"]*)"/),
      description: grab(/\bdescription\s*=\s*"([^"]*)"/),
      extension: grab(/\bextension\s*=\s*"([^"]*)"/),
      certificationLevel: cert != null && Number.isFinite(cert) ? cert : null,
      forkId: grab(/FORKID\s*\{([0-9A-Fa-f-]+)\}/),
      revision: grab(/\$Revision:\s*([^$]+?)\s*\$/),
      properties,
      propertyCount: properties.length,
      enhancements,
      controllerCodes,
    };
  }

  /**
   * Read + parse the full `.cps` corpus and aggregate it into a
   * `PostProcessorCorpus`. Never throws — an unreachable directory yields an
   * empty corpus with a `warning`.
   *
   * @param sourceDir Optional explicit corpus directory (overrides discovery).
   */
  static learn(sourceDir?: string): PostProcessorCorpus {
    const dir = JMDiePostProcessorLearningEngine.resolveSourceDir(sourceDir);
    if (!dir) {
      const empty: PostProcessorCorpus = {
        schemaVersion: SCHEMA_VERSION,
        sourceDir: sourceDir ?? SOURCE_CANDIDATES[0],
        profileCount: 0,
        profiles: [],
        enhancementFrequency: {},
        byControllerFamily: {},
        patterns: [],
        warning:
          "JM Die PRISM MODIFIED POST PROCESSORS directory not found — corpus unavailable.",
      };
      JMDiePostProcessorLearningEngine.cache = empty;
      return empty;
    }

    let files: string[] = [];
    try {
      files = fs
        .readdirSync(dir)
        .filter((f) => f.toLowerCase().endsWith(".cps"))
        .sort();
    } catch (err) {
      const empty: PostProcessorCorpus = {
        schemaVersion: SCHEMA_VERSION,
        sourceDir: dir,
        profileCount: 0,
        profiles: [],
        enhancementFrequency: {},
        byControllerFamily: {},
        patterns: [],
        warning: `Failed to read corpus directory: ${(err as Error).message}`,
      };
      JMDiePostProcessorLearningEngine.cache = empty;
      return empty;
    }

    const profiles: PostProcessorProfile[] = [];
    for (const file of files) {
      const full = path.join(dir, file);
      try {
        const content = fs.readFileSync(full, "utf8");
        const size = fs.statSync(full).size;
        profiles.push(
          JMDiePostProcessorLearningEngine.parseCpsContent(content, file, size),
        );
      } catch (err) {
        log.warn(`[JMDiePostProcLearning] skipped ${file}: ${(err as Error).message}`);
      }
    }

    const corpus = JMDiePostProcessorLearningEngine.aggregate(profiles, dir);
    JMDiePostProcessorLearningEngine.cache = corpus;
    log.info(
      `[JMDiePostProcLearning] learned ${corpus.profileCount} posts, ` +
        `${corpus.patterns.length} patterns from ${dir}`,
    );
    return corpus;
  }

  /**
   * Aggregate parsed profiles into a corpus. Pure — exposed so the dispatcher
   * (or tests) can aggregate an injected profile set without disk I/O.
   */
  static aggregate(profiles: PostProcessorProfile[], sourceDir: string): PostProcessorCorpus {
    const list = Array.isArray(profiles) ? profiles : [];
    const enhancementFrequency: Record<string, number> = {};
    const byControllerFamily: PostProcessorCorpus["byControllerFamily"] = {};

    for (const p of list) {
      for (const e of p.enhancements) {
        enhancementFrequency[e] = (enhancementFrequency[e] ?? 0) + 1;
      }
      const fam = (byControllerFamily[p.controllerFamily] ??= {
        count: 0,
        machines: [],
        enhancements: [],
      });
      fam.count++;
      if (!fam.machines.includes(p.machine)) fam.machines.push(p.machine);
      for (const e of p.enhancements) {
        if (!fam.enhancements.includes(e)) fam.enhancements.push(e);
      }
    }

    // Learned patterns: per family, enhancements at ≥ CORPUS_THRESHOLD support.
    const patterns: LearnedPattern[] = [];
    for (const [family, fam] of Object.entries(byControllerFamily)) {
      if (fam.count === 0) continue;
      const familyPosts = list.filter((p) => p.controllerFamily === family);
      const support: Record<string, number> = {};
      for (const p of familyPosts) {
        for (const e of p.enhancements) support[e] = (support[e] ?? 0) + 1;
      }
      for (const [enhancement, count] of Object.entries(support)) {
        const confidence = count / fam.count;
        if (confidence < CORPUS_THRESHOLD) continue;
        patterns.push({
          id: `${family}::${enhancement}`,
          controllerFamily: family,
          enhancement,
          support: count,
          familySize: fam.count,
          confidence: Math.round(confidence * 1000) / 1000,
          recommendation:
            `When generating a ${family} post-processor, apply ` +
            `"${enhancement}" — present in ${count}/${fam.count} JM Die ${family} posts.`,
        });
      }
    }
    patterns.sort(
      (a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id),
    );

    return {
      schemaVersion: SCHEMA_VERSION,
      sourceDir,
      profileCount: list.length,
      profiles: list,
      enhancementFrequency,
      byControllerFamily,
      patterns,
    };
  }

  /** Return the cached corpus, learning it on first access. */
  static getCorpus(): PostProcessorCorpus {
    return JMDiePostProcessorLearningEngine.cache ?? JMDiePostProcessorLearningEngine.learn();
  }

  /**
   * Profiles for one controller family. Invalid family input yields an empty
   * list rather than throwing.
   */
  static queryByController(family: string): PostProcessorProfile[] {
    const parsed = ControllerFamilySchema.safeParse(family);
    if (!parsed.success) return [];
    return JMDiePostProcessorLearningEngine.getCorpus().profiles.filter(
      (p) => p.controllerFamily === parsed.data,
    );
  }

  /**
   * Distinct enhancement catalog across the corpus, each with the posts that
   * carry it, sorted by descending frequency.
   */
  static getEnhancementCatalog(): { enhancement: string; count: number; posts: string[] }[] {
    const corpus = JMDiePostProcessorLearningEngine.getCorpus();
    return Object.entries(corpus.enhancementFrequency)
      .map(([enhancement, count]) => ({
        enhancement,
        count,
        posts: corpus.profiles
          .filter((p) => p.enhancements.includes(enhancement))
          .map((p) => p.file),
      }))
      .sort((a, b) => b.count - a.count || a.enhancement.localeCompare(b.enhancement));
  }

  /** Summary statistics over the corpus. */
  static getStats(): {
    schemaVersion: string;
    profileCount: number;
    families: Record<string, number>;
    processTypes: Record<string, number>;
    distinctEnhancements: number;
    patternCount: number;
    totalProperties: number;
    warning?: string;
  } {
    const corpus = JMDiePostProcessorLearningEngine.getCorpus();
    const families: Record<string, number> = {};
    const processTypes: Record<string, number> = {};
    let totalProperties = 0;
    for (const p of corpus.profiles) {
      families[p.controllerFamily] = (families[p.controllerFamily] ?? 0) + 1;
      processTypes[p.processType] = (processTypes[p.processType] ?? 0) + 1;
      totalProperties += p.propertyCount;
    }
    return {
      schemaVersion: corpus.schemaVersion,
      profileCount: corpus.profileCount,
      families,
      processTypes,
      distinctEnhancements: Object.keys(corpus.enhancementFrequency).length,
      patternCount: corpus.patterns.length,
      totalProperties,
      ...(corpus.warning ? { warning: corpus.warning } : {}),
    };
  }

  /**
   * Per-post and corpus-wide enhancement-gap analysis.
   *
   * For each post, `missingFamilyPatterns` lists enhancements its controller-
   * family siblings consistently carry — a learned `pattern` with confidence
   * ≥ `CORPUS_THRESHOLD` — that this post does not, i.e. the post has fallen
   * behind its own family. `corpusWideGaps` lists enhancement markers adopted
   * by fewer than half of all posts. `recommendations` ranks the highest-
   * leverage fixes (widest corpus gaps first, then per-post family gaps).
   *
   * Pure read over `getCorpus()` — no I/O, no mutation. Single-post families
   * naturally yield no per-post gap (a post cannot lag siblings it has none of).
   *
   * @returns the gap report; `warning` is set when the corpus is unreadable.
   */
  static gapReport(): PostProcessorGapReport {
    const corpus = JMDiePostProcessorLearningEngine.getCorpus();
    const { profileCount } = corpus;
    const markerTotal = ENHANCEMENT_MARKERS.length;

    const postGaps = corpus.profiles
      .map((p) => {
        const familyPatternEnhancements = corpus.patterns
          .filter(
            (pat) =>
              pat.controllerFamily === p.controllerFamily &&
              pat.confidence >= CORPUS_THRESHOLD,
          )
          .map((pat) => pat.enhancement);
        const missingFamilyPatterns = familyPatternEnhancements
          .filter((e) => !p.enhancements.includes(e))
          .sort();
        return {
          file: p.file,
          controllerFamily: p.controllerFamily,
          machine: p.machine,
          enhancementCount: p.enhancements.length,
          valueScore:
            markerTotal > 0
              ? Math.round((p.enhancements.length / markerTotal) * 100) / 100
              : 0,
          missingFamilyPatterns,
        };
      })
      .sort(
        (a, b) =>
          b.missingFamilyPatterns.length - a.missingFamilyPatterns.length ||
          a.valueScore - b.valueScore ||
          a.file.localeCompare(b.file),
      );

    const corpusWideGaps =
      profileCount > 0
        ? ENHANCEMENT_MARKERS.map((m) => {
            const presentIn = corpus.enhancementFrequency[m.id] ?? 0;
            return {
              enhancement: m.id,
              coverage: Math.round((presentIn / profileCount) * 100) / 100,
              presentIn,
              absentFrom: profileCount - presentIn,
            };
          })
            .filter((g) => g.coverage < CORPUS_THRESHOLD)
            .sort(
              (a, b) =>
                a.coverage - b.coverage ||
                a.enhancement.localeCompare(b.enhancement),
            )
        : [];

    const recommendations: string[] = [];
    for (const g of corpusWideGaps) {
      recommendations.push(
        `Roll out "${g.enhancement}" — only ${g.presentIn}/${profileCount} ` +
          `posts carry it (${Math.round(g.coverage * 100)}% coverage).`,
      );
    }
    for (const pg of postGaps) {
      if (pg.missingFamilyPatterns.length > 0) {
        recommendations.push(
          `Post "${pg.file}" lacks ${pg.missingFamilyPatterns.length} ` +
            `${pg.controllerFamily}-family enhancement(s) its siblings carry: ` +
            `${pg.missingFamilyPatterns.join(", ")}.`,
        );
      }
    }
    if (recommendations.length === 0) {
      recommendations.push(
        profileCount === 0
          ? corpus.warning ??
              "Post-processor corpus is empty — no gap analysis possible."
          : "No enhancement gaps detected — every post matches its family " +
              "patterns and corpus-wide adoption.",
      );
    }

    return {
      schemaVersion: corpus.schemaVersion,
      profileCount,
      postGaps,
      corpusWideGaps,
      recommendations,
      ...(corpus.warning ? { warning: corpus.warning } : {}),
    };
  }

  /** Clear the corpus cache (forces a fresh `learn()` on next access). */
  static reset(): void {
    JMDiePostProcessorLearningEngine.cache = null;
  }
}

export const jmDiePostProcessorLearningEngine = JMDiePostProcessorLearningEngine;
