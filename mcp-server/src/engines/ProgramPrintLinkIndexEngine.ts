/**
 * ProgramPrintLinkIndexEngine — composite program↔print link index.
 *
 * MS-PRINT-PROGRAM-LOOP / U-PPL-D1 (Track D)
 *
 * COMPOSITION (does NOT fork BlueprintProgramJoinEngine):
 *
 *   BlueprintProgramJoinEngine (loadJoinIndex / programForPrint / printForProgram)
 *   = the BLUEPRINT-side seed: every blueprint page → search for matching programs
 *   = ships in U-DOCU-04, produces the v6 join JSONL with 73,876 rows
 *
 *   THIS engine layers two augmentations on top:
 *
 *   (1) Enhanced JM-Die PN normalizer — strips the WILD customer-suffixed forms
 *       the parent normalizer misses:
 *         T8047D3 ITW           → 8047D3       (strip customer suffix " ITW",
 *                                                strip leading single-letter
 *                                                customer-prefix "T" before digits)
 *         C2500-2497 SCREWS     → 2500-2497    (strip " SCREWS", strip "C" prefix)
 *         9082526 AGRATI        → 9082526      (strip " AGRATI")
 *         BU-1365-0000-002 TFI  → 1365-0000-002 (strip " TFI", strip "BU-" prefix)
 *       Plus shop-floor descriptors: SETUP / SIDE-A / SIDE-B / REWORK / OP10 (extends the
 *       parent's `-OPn` regex to also handle space-separated "OP10").
 *
 *   (2) Program-side seed — every .MIN / .mcx / .ipt / .iam / .f3d / .SLDPRT filename
 *       in the archive that has NO entry in `joinIndex.byProgramPath` is fed to the
 *       enhanced extractor; any resulting normalized PN that EXISTS in
 *       `joinIndex.byNormalizedPN` produces a NEW link the blueprint-side seed missed.
 *       (Most missed because the program filename uses a customer-prefixed form the
 *       blueprint side never saw.) The new link is added to the in-memory composite
 *       index but NOT written back to the v6 JSONL — the producer owns that file.
 *
 * FAIL-LOUD policy (CLAUDE.md R12):
 *   - loadLinkIndex propagates BlueprintProgramJoinEngine.loadJoinIndex's throws on a
 *     missing / zero-row / corrupt join file. A success-shaped empty index is silently
 *     wrong.
 *   - coverageReport walks the on-disk archive index AND the join row set, emitting
 *     BOTH a join-side confidence breakdown AND a disk-side orphan list (programs on
 *     disk with NO entry in byProgramPath + no enhanced-normalizer rescue).
 *
 * PATH SAFETY (CLAUDE.md security rail):
 *   - A program path coming from the v6 JSONL (Python-emitted) is untrusted user data;
 *     before any disk-touching downstream uses the path, callers should clamp it via
 *     `isPathUnderAllowedRoot` (re-exported from JMDieArchiveBackAnnotationEngine).
 *     This engine itself is pure-transform — it only consumes paths as opaque strings.
 *
 * THIS ENGINE IS PURE TRANSFORM. All I/O delegates to BlueprintProgramJoinEngine.
 */

import {
  type BlueprintRef,
  type JoinIndex,
  type JoinIndexProgramRef,
  type LoadJoinIndexOptions,
  type MatchConfidence,
  type PrintForProgramResult,
  type ProgramForPrintResult,
  type TrainingCandidateProgram,
  type V6MatchConfidence,
  extractPartNumberCandidates as parentExtractCandidates,
  loadJoinIndex,
  normalizePartNumber as parentNormalizePN,
  normalizeProgramPathKey,
  printForProgram as parentPrintForProgram,
  programForPrint as parentProgramForPrint,
} from "./BlueprintProgramJoinEngine.js";

// ============================================================================
// TYPES — public
// ============================================================================

/** Program file extensions that count as "program-equivalent" for program-side seeding. */
export const PROGRAM_EQUIVALENT_EXTENSIONS: ReadonlySet<string> = new Set([
  ".min", ".mcx", ".mcam", ".mcam-mill", ".mcam-lathe",
  ".nc", ".ncm", ".tap", ".eia", ".spf", ".mpf", ".pim",
  ".ipt", ".iam", ".f3d", ".f3z", ".sldprt", ".sldasm",
  ".prt", ".catpart", ".step", ".stp", ".iges", ".igs",
]);

/** A program-side seed link — a program path the v6 join missed that the enhanced normalizer rescues. */
export interface ProgramSeedLink {
  program_path: string;
  program_filename: string;
  /** Raw PN extracted from the filename (before enhanced normalization). */
  raw_candidate: string;
  /** Normalized PN that matched into joinIndex.byNormalizedPN. */
  matched_normalized_pn: string;
  /** Confidence of the rescue: "filename_exact" when raw filename token == joined PN; "filename_loose" when it took the enhanced normalizer to bridge. */
  match_kind: "filename_exact" | "filename_loose";
}

/** Composite index — parent JoinIndex + program-side seed augmentations. */
export interface ProgramPrintLinkIndex {
  joinIndex: JoinIndex;
  /** program-path-key → seed links (programs the blueprint-side seed missed, rescued by enhanced normalizer). */
  seedLinksByPath: Map<string, ProgramSeedLink[]>;
  /** normalized PN → seed links (reverse index). */
  seedLinksByPN: Map<string, ProgramSeedLink[]>;
  stats: {
    /** Carried through from joinIndex.stats. */
    joinRows: number;
    /** Carried through from joinIndex.stats. */
    tripleRows: number;
    /** Carried through from joinIndex.stats. */
    programPaths: number;
    /** Total program file paths fed into the program-side seed (length of inputProgramPaths). */
    seedProgramsScanned: number;
    /** Program paths the v6 join already had — skipped (no seed needed). */
    seedAlreadyJoined: number;
    /** Program paths with NO filename candidates (empty / no extension / unparsable). */
    seedNoCandidates: number;
    /** New links the enhanced normalizer produced (programs not in v6 join but PN was). */
    seedNewLinks: number;
    /** Program paths still orphan after seeding (no PN candidate matched the join). */
    seedStillOrphan: number;
    /** Build wall-time of the program-side seed in ms. */
    seedBuildMs: number;
    /** Composite build wall-time (load + seed). */
    loadedAt: number;
  };
}

export interface LoadLinkIndexOptions extends LoadJoinIndexOptions {
  /**
   * Optional list of program file paths to feed the program-side seed. When omitted, the
   * composite index is built with `seedLinksByPath` empty — operators wire the program list
   * from `jm-die-index-v2.json` via callers (see coverageReport's `inputProgramPaths`).
   */
  inputProgramPaths?: readonly string[];
}

export interface LookupResult {
  found: boolean;
  query: string;
  /** Where the hit(s) came from. */
  sources: Array<"join_v6" | "training_triple" | "program_seed">;
  /** Carried through from parent programForPrint when this is a print→programs lookup. */
  programs?: JoinIndexProgramRef[];
  /** Carried through from parent programForPrint. */
  blueprints?: BlueprintRef[];
  /** Carried through from parent programForPrint. */
  training_programs?: TrainingCandidateProgram[];
  /** Carried through from parent printForProgram when this is a program→prints lookup. */
  links?: PrintForProgramResult["links"];
  /** New from the program-side seed. */
  seed_links: ProgramSeedLink[];
  /** Best-known confidence — null if no v6 match (training-triple-only or seed-only hits). */
  match_confidence: V6MatchConfidence | null;
}

export interface CoverageReport {
  generated_at: string;
  join_stats: {
    rows: number;
    confidence_breakdown: Record<MatchConfidence | "garbage", number>;
    /**
     * Count of v6 join rows whose `match_confidence` value was NOT one of the 5 known
     * values (exact/loose/ambiguous/miss/garbage). FAIL-LOUD signal — a positive value
     * means the v6 producer emitted a value this engine's breakdown doesn't track;
     * the value drifted and the engine needs an update.
     */
    confidence_unknown: number;
    program_paths_with_link: number;
    training_triples: number;
  };
  seed_stats: ProgramPrintLinkIndex["stats"];
  /**
   * Disk-side gap: counts only (NOT the full path list — 38K paths blows the response payload).
   * Operators wanting the path list invoke JMDieArchiveBackAnnotationEngine.generateGapReport
   * which writes them to disk.
   */
  disk_side: {
    archive_paths_scanned: number;
    in_v6_join: number;
    rescued_by_seed: number;
    /** Programs still missing a print pointer — the FAIL-LOUD orphan count from the envelope brief. */
    still_orphan: number;
    orphan_rate_pct: number;
  };
}

// ============================================================================
// ENHANCED JM-DIE PN NORMALIZER
// ============================================================================

/**
 * Customer suffix tokens JM Die appends after a SPACE in part numbers — these typically
 * indicate the end customer (ITW, AGRATI, …) or a fastener-style descriptor (SCREWS).
 * The set is the JM-Die customer roster (see knowledge/wiki/reference/jm-die-profile.md)
 * plus the generic fastener descriptors that appear in the corpus.
 *
 * MUST be uppercase. Match is case-insensitive at apply time.
 *
 * Future: pull from `jm-die-profile.ts` once that file exposes a canonical customer list
 * (it currently exposes folder paths; the suffix list is a superset because some customers
 * appear ONLY as PN-suffix tokens, never as folder names).
 */
export const JM_DIE_CUSTOMER_SUFFIXES: readonly string[] = [
  "ITW", "ALCOA", "AGRATI", "TFI", "OPTIMAS", "SFS", "HOLO-KROME", "HOLOKROME",
  "FASTENAL", "PENN", "INFASTECH", "ARCONIC", "STANLEY", "EMHART",
  "SCREWS", "BOLTS", "NUTS", "RIVETS", "PINS",
];

/**
 * Shop-floor descriptors that follow the PN (separated by space OR dash) and indicate
 * a setup / side / op-number / rework variant rather than a different part. Stripped to
 * collapse setup variants of the same PN to one normalized key.
 */
export const SHOP_FLOOR_SUFFIX_PATTERNS: readonly RegExp[] = [
  /[\s-]+SETUP[A-Z0-9]*$/i,
  /[\s-]+SIDE-[AB]$/i,
  /[\s-]+SIDE[AB]$/i,
  /[\s-]+REWORK$/i,
  /[\s-]+OP\d+$/i, // SPACE-separated "OP10" — parent regex only handles dash-separated
];

/**
 * Single-letter customer prefix at the very start, immediately before a digit. JM-Die
 * filename convention encodes the customer with a leading letter: T (Titan), C (Caterpillar
 * line), W (Westinghouse). Stripped ONLY when followed by a digit AND the remainder is
 * ≥{@link MIN_PN_REMAINDER_LENGTH} chars — otherwise we'd corrupt legit PN prefixes (like "T8" being a real part code).
 */
const CUSTOMER_PREFIX_LETTER_RE = /^([A-Z])(?=\d)/i;

/**
 * Multi-letter customer prefix (BU-, JC-, etc) at the start, terminated by a dash before
 * a digit. Stripped ONLY when the remainder is ≥{@link MIN_PN_REMAINDER_LENGTH} chars.
 */
const CUSTOMER_PREFIX_MULTI_RE = /^([A-Z]{2,3})-(?=\d)/i;

/**
 * Minimum remainder length (chars) required AFTER stripping a customer prefix before the
 * strip is accepted. Empirical: 3-char PNs collide so heavily across the corpus that
 * aggressive prefix-stripping creates more false-positive matches than it rescues. 4 chars
 * preserves real 4-digit-and-up JM-Die part numbers while dropping the over-collision risk.
 *
 * Tuning knob (HOT) — changing this affects the entire program-side seed yield. Run
 * `prism_dev:program_print_link_coverage` before and after to measure impact.
 */
export const MIN_PN_REMAINDER_LENGTH = 4;

/** Match an entire trailing suffix token after a space — captures the suffix for stripping. */
function buildCustomerSuffixRegex(suffixes: readonly string[]): RegExp {
  // Escape each suffix (only hyphens in the list as special regex chars).
  const escaped = suffixes
    .map((s) => s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&"))
    .join("|");
  return new RegExp(`\\s+(?:${escaped})$`, "i");
}

const CUSTOMER_SUFFIX_RE = buildCustomerSuffixRegex(JM_DIE_CUSTOMER_SUFFIXES);

/**
 * Enhanced PN normalizer that handles the wild JM-Die forms.
 *
 * Pipeline (idempotent — applies until fixed point):
 *   1. Trim + uppercase
 *   2. Strip trailing customer suffix (" ITW" / " AGRATI" / " TFI" / " SCREWS")
 *   3. Strip trailing shop-floor descriptors (" SETUP" / " SIDE-A" / " OP10" / " REWORK")
 *   4. Strip leading multi-letter customer prefix ("BU-" / "JC-") when before a digit
 *      AND the remainder is ≥4 chars
 *   5. Strip leading single-letter customer prefix ("T" / "C" / "W") when immediately
 *      before a digit AND the remainder is ≥4 chars
 *   6. Hand off to parent normalizePartNumber for L-/M-/G- prefix, -OPn, material code,
 *      rev letter stripping
 *
 * Returns "" on falsy / whitespace-only input.
 *
 * @example
 *   normalizeJMDiePN("T8047D3 ITW")          // → "8047D3" (parent's material-code RE requires
 *                                            //   leading dash, so D3 stays attached)
 *   normalizeJMDiePN("C2500-2497 SCREWS")    // → "2500-2497"
 *   normalizeJMDiePN("9082526 AGRATI")       // → "9082526"
 *   normalizeJMDiePN("BU-1365-0000-002 TFI") // → "1365-0000-002"
 *   normalizeJMDiePN("L-2845-D2.MIN")        // → "2845" (parent strips -D2 because of leading dash)
 *   normalizeJMDiePN("")                     // → ""
 */
export function normalizeJMDiePN(raw: string): string {
  if (typeof raw !== "string") return "";
  let s = raw.trim().toUpperCase();
  if (s.length === 0) return "";

  // Step 1 — strip a trailing program/CAD file extension if one is present. The parent
  // normalizer's extension-handling lives in `extractPartNumberCandidates`, not in
  // `normalizePartNumber` — so a raw filename like `L-2845-D2.MIN` would otherwise survive
  // the parent's normalization with `.MIN` still attached. This step makes the enhanced
  // normalizer a true drop-in for raw filename inputs as well as already-extracted PNs.
  s = s.replace(/\.[A-Z0-9]+$/i, "");

  // Loop to fixed point — stripping one suffix can expose another.
  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(CUSTOMER_SUFFIX_RE, "");
    for (const re of SHOP_FLOOR_SUFFIX_PATTERNS) {
      s = s.replace(re, "");
    }
    s = s.trim();
  }

  // Strip multi-letter prefix before single-letter — "BU-" must be tried before "B"
  // would consume the "B" alone leaving "U-1365" which is wrong.
  const multiMatch = s.match(CUSTOMER_PREFIX_MULTI_RE);
  if (multiMatch && s.length - multiMatch[0].length >= MIN_PN_REMAINDER_LENGTH) {
    s = s.slice(multiMatch[0].length);
  } else {
    const singleMatch = s.match(CUSTOMER_PREFIX_LETTER_RE);
    if (singleMatch && s.length - singleMatch[0].length >= MIN_PN_REMAINDER_LENGTH) {
      s = s.slice(singleMatch[0].length);
    }
  }

  // Hand off to parent for the rest (L-/M-/G- prefix, -OPn, material code, rev letter).
  return parentNormalizePN(s);
}

/**
 * Extract JM-Die part-number candidates from a program filename — superset of the parent
 * extractor with two additional candidate sources:
 *
 *   (a) The filename minus a trailing customer-suffix token (" ITW", " AGRATI", …) —
 *       so a filename like "T8047D3 ITW.MIN" produces candidates ["T8047D3 ITW", "T8047D3",
 *       "8047", "8047D3"] instead of only the parent extractor's ["T8047D3 ITW", "8047"].
 *   (b) The leading-prefix-stripped form ("8047D3" from "T8047D3") so a join row with
 *       PN "8047D3" hits even when the filename retains the customer prefix.
 *
 * All candidates are deduped + uppercase. Empty inputs return [].
 */
export function extractJMDieCandidates(filename: string): string[] {
  if (typeof filename !== "string" || filename.length === 0) return [];
  // Start with parent's candidates (handles L-/M-/G- prefix, extension stripping, digits-only).
  const cands = new Set<string>(parentExtractCandidates(filename));

  // Strip extension once for the JM-Die-specific augmentations.
  const noExt = filename.replace(/\.[A-Za-z0-9]+$/, "").toUpperCase();
  cands.add(noExt);

  // Customer-suffix-stripped form.
  const noSuffix = noExt.replace(CUSTOMER_SUFFIX_RE, "").trim();
  if (noSuffix.length > 0 && noSuffix !== noExt) {
    cands.add(noSuffix);
    // Recurse parent extractor on the cleaned form to pick up digits-only tokens.
    for (const c of parentExtractCandidates(noSuffix)) cands.add(c);
  }

  // Customer-prefix-stripped form.
  const multiPrefix = noSuffix.match(CUSTOMER_PREFIX_MULTI_RE);
  if (multiPrefix && noSuffix.length - multiPrefix[0].length >= MIN_PN_REMAINDER_LENGTH) {
    cands.add(noSuffix.slice(multiPrefix[0].length));
  } else {
    const singlePrefix = noSuffix.match(CUSTOMER_PREFIX_LETTER_RE);
    if (singlePrefix && noSuffix.length - singlePrefix[0].length >= MIN_PN_REMAINDER_LENGTH) {
      cands.add(noSuffix.slice(singlePrefix[0].length));
    }
  }

  cands.delete("");
  return [...cands];
}

// ============================================================================
// PROGRAM-SIDE SEED
// ============================================================================

function programPathExtension(p: string): string {
  const m = p.match(/\.[A-Za-z0-9]+$/);
  return m ? m[0].toLowerCase() : "";
}

function filenameFromPath(p: string): string {
  const idx = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

/**
 * Pure transform — given a JoinIndex and a list of candidate program paths, return the
 * new program-side links the enhanced normalizer rescues. Does NO disk I/O.
 *
 * Inputs are validated: non-string paths, empty paths, and non-program-equivalent
 * extensions are silently skipped (counted into the returned stats).
 */
export function buildProgramSeedAugmentation(
  joinIndex: JoinIndex,
  programPaths: readonly string[],
): {
  newLinks: ProgramSeedLink[];
  stats: {
    scanned: number;
    alreadyJoined: number;
    noCandidates: number;
    newLinks: number;
    stillOrphan: number;
    buildMs: number;
  };
} {
  const t0 = Date.now();
  const newLinks: ProgramSeedLink[] = [];
  let scanned = 0;
  let alreadyJoined = 0;
  let noCandidates = 0;
  let stillOrphan = 0;

  // Runtime guard — TypeScript's `readonly string[]` is compile-time only. A dispatcher
  // round-trip can deliver null/undefined/{}/a Promise from JSON-parsed payload and the
  // for-of below would throw "is not iterable". FAIL-SOFT: empty result with zeroed stats
  // is the documented "no inputs supplied" behavior — matches loadLinkIndex's no-paths path.
  if (!Array.isArray(programPaths)) {
    return {
      newLinks,
      stats: { scanned: 0, alreadyJoined: 0, noCandidates: 0, newLinks: 0, stillOrphan: 0, buildMs: 0 },
    };
  }

  for (const rawPath of programPaths) {
    if (typeof rawPath !== "string" || rawPath.length === 0) {
      noCandidates++;
      continue;
    }
    scanned++;
    const pathKey = normalizeProgramPathKey(rawPath);
    if (joinIndex.byProgramPath.has(pathKey)) {
      alreadyJoined++;
      continue;
    }
    const ext = programPathExtension(rawPath);
    if (ext.length > 0 && !PROGRAM_EQUIVALENT_EXTENSIONS.has(ext)) {
      noCandidates++;
      continue;
    }
    const filename = filenameFromPath(rawPath);
    const cands = extractJMDieCandidates(filename);
    if (cands.length === 0) {
      noCandidates++;
      continue;
    }

    let rescued = false;
    // Dedupe within a single program by matched_normalized_pn — extractJMDieCandidates
    // returns a SUPERSET of forms (e.g. {"T8047D3 ITW", "T8047D3", "8047D3"}) and they
    // can ALL normalize to the same join key "8047D3". Emit one link per (program, PN)
    // pair, preserving the strongest match_kind (filename_exact wins over filename_loose).
    // Distinct PNs from the same filename still produce distinct links.
    const emittedForThisProgram = new Map<string, "filename_exact" | "filename_loose">();
    for (const cand of cands) {
      const norm = normalizeJMDiePN(cand);
      if (norm.length === 0) continue;
      if (!joinIndex.byNormalizedPN.has(norm)) continue;
      const isExact = cand.toUpperCase() === norm;
      const newKind: "filename_exact" | "filename_loose" = isExact ? "filename_exact" : "filename_loose";
      const prior = emittedForThisProgram.get(norm);
      if (prior === undefined) {
        emittedForThisProgram.set(norm, newKind);
        newLinks.push({
          program_path: rawPath,
          program_filename: filename,
          raw_candidate: cand,
          matched_normalized_pn: norm,
          match_kind: newKind,
        });
        rescued = true;
      } else if (prior === "filename_loose" && newKind === "filename_exact") {
        // Upgrade the existing link's match_kind in place — keep `filename_exact` over
        // any prior `filename_loose` for the same (program, PN) pair.
        emittedForThisProgram.set(norm, newKind);
        const existing = newLinks.find(
          (l) => l.program_path === rawPath && l.matched_normalized_pn === norm,
        );
        if (existing) {
          existing.match_kind = newKind;
          existing.raw_candidate = cand;
        }
      }
    }
    if (!rescued) stillOrphan++;
  }

  return {
    newLinks,
    stats: {
      scanned,
      alreadyJoined,
      noCandidates,
      newLinks: newLinks.length,
      stillOrphan,
      buildMs: Date.now() - t0,
    },
  };
}

// ============================================================================
// COMPOSITE INDEX LOAD
// ============================================================================

/**
 * Load the composite link index — delegates to BlueprintProgramJoinEngine.loadJoinIndex
 * for the parent JoinIndex (which throws on missing / corrupt join file per its FAIL-LOUD
 * contract), then runs the program-side seed augmentation if `inputProgramPaths` is supplied.
 *
 * The returned composite is NOT cached at this layer — callers wanting a singleton should
 * hold the result themselves. (The parent's getJoinIndex still caches the JoinIndex, so
 * even repeated loadLinkIndex calls only stream the 60 MB JSONL once per mtime change.)
 */
export async function loadLinkIndex(
  options: LoadLinkIndexOptions = {},
): Promise<ProgramPrintLinkIndex> {
  const joinIndex = await loadJoinIndex(options);

  const seedLinksByPath = new Map<string, ProgramSeedLink[]>();
  const seedLinksByPN = new Map<string, ProgramSeedLink[]>();

  let seedStats: ProgramPrintLinkIndex["stats"];
  if (Array.isArray(options.inputProgramPaths) && options.inputProgramPaths.length > 0) {
    const { newLinks, stats } = buildProgramSeedAugmentation(joinIndex, options.inputProgramPaths);
    for (const link of newLinks) {
      const pathKey = normalizeProgramPathKey(link.program_path);
      const existingByPath = seedLinksByPath.get(pathKey);
      if (existingByPath) existingByPath.push(link);
      else seedLinksByPath.set(pathKey, [link]);

      const existingByPN = seedLinksByPN.get(link.matched_normalized_pn);
      if (existingByPN) existingByPN.push(link);
      else seedLinksByPN.set(link.matched_normalized_pn, [link]);
    }
    seedStats = {
      joinRows: joinIndex.stats.joinRows,
      tripleRows: joinIndex.stats.tripleRows,
      programPaths: joinIndex.stats.programPaths,
      seedProgramsScanned: stats.scanned,
      seedAlreadyJoined: stats.alreadyJoined,
      seedNoCandidates: stats.noCandidates,
      seedNewLinks: stats.newLinks,
      seedStillOrphan: stats.stillOrphan,
      seedBuildMs: stats.buildMs,
      loadedAt: Date.now(),
    };
  } else {
    seedStats = {
      joinRows: joinIndex.stats.joinRows,
      tripleRows: joinIndex.stats.tripleRows,
      programPaths: joinIndex.stats.programPaths,
      seedProgramsScanned: 0,
      seedAlreadyJoined: 0,
      seedNoCandidates: 0,
      seedNewLinks: 0,
      seedStillOrphan: 0,
      seedBuildMs: 0,
      loadedAt: Date.now(),
    };
  }

  return { joinIndex, seedLinksByPath, seedLinksByPN, stats: seedStats };
}

// ============================================================================
// LOOKUP API
// ============================================================================

/**
 * Resolve a program path to its print(s) — hits parent printForProgram (v6 join +
 * training triples) AND the program-side seed augmentation.
 */
export function lookupPrintForProgram(
  programPath: string,
  index: ProgramPrintLinkIndex,
): LookupResult {
  const parentResult: PrintForProgramResult = parentPrintForProgram(programPath, index.joinIndex);
  const pathKey = normalizeProgramPathKey(programPath ?? "");
  const seed = pathKey.length > 0 ? [...(index.seedLinksByPath.get(pathKey) ?? [])] : [];
  const sources: LookupResult["sources"] = [];
  // Single-pass classifier — capture the v6 link (for match_confidence) and detect
  // training-triple in one O(n) walk instead of three .some/.find passes.
  let v6Link: PrintForProgramResult["links"][number] | undefined;
  let hasTraining = false;
  for (const l of parentResult.links) {
    if (l.source === "join_v6") {
      if (!v6Link) v6Link = l;
    } else if (l.source === "training_triple") {
      hasTraining = true;
    }
  }
  if (v6Link) sources.push("join_v6");
  if (hasTraining) sources.push("training_triple");
  if (seed.length > 0) sources.push("program_seed");
  // ORDER STABILITY (test contract): sources elements are always emitted in the order
  // join_v6 → training_triple → program_seed, so downstream tests can assert sources[0].
  return {
    found: parentResult.found || seed.length > 0,
    query: programPath ?? "",
    sources,
    links: parentResult.links,
    seed_links: seed,
    // The cast is intentional: PrintForProgramResult's match_confidence is typed `string`
    // (parent emits `"triple:<n>"` for training-triple links). For v6 hits the value is
    // always a member of V6MatchConfidence — only v6Link feeds this branch, so the cast
    // is sound. Training-triple-only and seed-only hits return null.
    match_confidence: v6Link ? (v6Link.match_confidence as V6MatchConfidence) : null,
  };
}

/**
 * Resolve a part number to its programs — hits parent programForPrint (v6 join +
 * training triples) AND the program-side seed augmentation (which can have rescued
 * programs the v6 join missed for this exact PN).
 */
export function lookupProgramsForPrint(
  partNumber: string,
  index: ProgramPrintLinkIndex,
): LookupResult {
  // Try the enhanced normalizer first — falls back to parent for parent-handled forms.
  const norm = normalizeJMDiePN(partNumber ?? "");
  const parentResult: ProgramForPrintResult = parentProgramForPrint(partNumber, index.joinIndex);
  // Re-resolve via the enhanced normalizer if parent missed and the enhanced result differs.
  let effective = parentResult;
  if (!parentResult.found && norm.length > 0 && norm !== parentResult.part_number_normalized) {
    const enhanced = parentProgramForPrint(norm, index.joinIndex);
    if (enhanced.found) effective = enhanced;
  }

  const seed = norm.length > 0 ? [...(index.seedLinksByPN.get(norm) ?? [])] : [];
  const sources: LookupResult["sources"] = [];
  if (effective.source === "join_v6" || effective.source === "both") sources.push("join_v6");
  if (effective.source === "training_triple" || effective.source === "both") sources.push("training_triple");
  if (seed.length > 0) sources.push("program_seed");

  return {
    found: effective.found || seed.length > 0,
    query: partNumber ?? "",
    sources,
    programs: effective.programs,
    blueprints: effective.blueprints,
    training_programs: effective.training_programs,
    seed_links: seed,
    match_confidence: effective.match_confidence,
  };
}

// ============================================================================
// COVERAGE REPORT
// ============================================================================

export interface CoverageReportOptions {
  /** Optional list of archive program paths to compute the disk-side gap against. */
  archiveProgramPaths?: readonly string[];
}

/**
 * Generate a coverage report — confidence breakdown of the v6 join + seed augmentation
 * stats + disk-side gap (COUNTS ONLY; the full orphan path list lives in
 * JMDieArchiveBackAnnotationEngine.generateGapReport which writes to disk).
 *
 * Pure transform — no I/O. The archive path list (if supplied) is iterated once.
 */
export function coverageReport(
  index: ProgramPrintLinkIndex,
  options: CoverageReportOptions = {},
): CoverageReport {
  const confidence: Record<MatchConfidence | "garbage", number> = {
    exact: 0, loose: 0, ambiguous: 0, miss: 0, garbage: 0,
  };
  let confidenceUnknown = 0;
  for (const row of index.joinIndex.byNormalizedPN.values()) {
    const c = row.match_confidence;
    // Use Object.prototype.hasOwnProperty.call to avoid prototype-pollution false positives
    // from `in` on a plain object literal — and to FAIL-LOUD count any v6-producer-emitted
    // value outside the known 5-member set so a producer schema drift is observable.
    if (Object.prototype.hasOwnProperty.call(confidence, c)) {
      confidence[c]++;
    } else {
      confidenceUnknown++;
    }
  }

  let archiveScanned = 0;
  let inV6 = 0;
  let rescued = 0;
  let stillOrphan = 0;
  if (Array.isArray(options.archiveProgramPaths)) {
    for (const p of options.archiveProgramPaths) {
      // Trim-empty paths are not real archive entries — skipping the empty-string check
      // alone (length === 0) would let "  " through, normalize to "", and incorrectly
      // bump stillOrphan. The invariant in_v6 + rescued + stillOrphan === scanned is
      // load-bearing for downstream training-set sizing.
      if (typeof p !== "string" || p.trim().length === 0) continue;
      archiveScanned++;
      const key = normalizeProgramPathKey(p);
      if (index.joinIndex.byProgramPath.has(key)) inV6++;
      else if (index.seedLinksByPath.has(key)) rescued++;
      else stillOrphan++;
    }
  }

  const orphan_rate_pct =
    archiveScanned > 0 ? Math.round((stillOrphan / archiveScanned) * 10000) / 100 : 0;

  return {
    generated_at: new Date().toISOString(),
    join_stats: {
      rows: index.stats.joinRows,
      confidence_breakdown: confidence,
      confidence_unknown: confidenceUnknown,
      program_paths_with_link: index.stats.programPaths,
      training_triples: index.stats.tripleRows,
    },
    seed_stats: index.stats,
    disk_side: {
      archive_paths_scanned: archiveScanned,
      in_v6_join: inV6,
      rescued_by_seed: rescued,
      still_orphan: stillOrphan,
      orphan_rate_pct,
    },
  };
}

// ============================================================================
// CLASS WRAPPER + SINGLETON (PRISM convention)
// ============================================================================

/**
 * Class wrapper around the module-level functions. Methods delegate to the exported
 * functions so consumers can choose the surface they prefer.
 *
 * State: holds no instance state — the loaded ProgramPrintLinkIndex is returned from
 * loadLinkIndex and held by the caller. (The parent JoinIndex IS cached at the
 * BlueprintProgramJoinEngine module level.)
 */
export class ProgramPrintLinkIndexEngine {
  normalizeJMDiePN(raw: string): string {
    return normalizeJMDiePN(raw);
  }
  extractJMDieCandidates(filename: string): string[] {
    return extractJMDieCandidates(filename);
  }
  buildProgramSeedAugmentation(joinIndex: JoinIndex, programPaths: readonly string[]) {
    return buildProgramSeedAugmentation(joinIndex, programPaths);
  }
  async loadLinkIndex(options: LoadLinkIndexOptions = {}): Promise<ProgramPrintLinkIndex> {
    return loadLinkIndex(options);
  }
  lookupPrintForProgram(programPath: string, index: ProgramPrintLinkIndex): LookupResult {
    return lookupPrintForProgram(programPath, index);
  }
  lookupProgramsForPrint(partNumber: string, index: ProgramPrintLinkIndex): LookupResult {
    return lookupProgramsForPrint(partNumber, index);
  }
  coverageReport(index: ProgramPrintLinkIndex, options: CoverageReportOptions = {}): CoverageReport {
    return coverageReport(index, options);
  }
}

export const programPrintLinkIndexEngine = new ProgramPrintLinkIndexEngine();
