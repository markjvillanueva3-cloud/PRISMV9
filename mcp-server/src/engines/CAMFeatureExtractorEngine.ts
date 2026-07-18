/**
 * CAMFeatureExtractorEngine — U-CAM-ML-02
 * ========================================
 *
 * Parses CAM/NC programs from the JM Die corpus into a unified FeatureVector
 * schema used by PHASE-ML-TRAIN (baseline regressor + LoRA adapters).
 *
 * Parser dispatch by extension:
 *   .MIN, .min        → parseOkumaProgram (full ASCII parse)
 *   .mcx-8, .MCX      → parseMastercamBinary (graceful degrade, size heuristic)
 *   other             → parsed_ok: false with descriptive warning
 *
 * This engine does NOT train models. It produces normalized feature vectors
 * that subsequent units (U-CAM-ML-03 split, U-CAM-ML-04 baseline, U-CAM-ML-05
 * LoRA) consume.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-ML-TRAIN U-CAM-ML-02.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ─── Types ──────────────────────────────────────────────────────────

export type CAMSystemTag =
  | "mastercam"
  | "hypermill"
  | "fusion360"
  | "inventor-hsm"
  | "solidcam"
  | "okuma_native"
  | "unknown";

export type GCodeDialect = "fanuc" | "okuma" | "siemens" | "heidenhain" | "unknown";

export interface FeatureVector {
  program_id: string;
  source_path: string;
  cam_system: CAMSystemTag;
  /** Confidence in the cam_system label: "header_match" > "extension" > "fallback". Added by U-CAM-ML-02-CLASSIFIER 2026-04-21. */
  cam_system_confidence?: "header_match" | "extension" | "fallback";
  /** Evidence supporting the cam_system label (e.g. matched header token). */
  cam_system_evidence?: string;
  machine_type: string;
  customer: string;
  part_hint: string | null;
  lines_of_code: number;
  tool_count: number;
  tool_changes: number;
  ops_by_strategy: {
    profile: number;
    pocket: number;
    drill: number;
    thread: number;
    face: number;
    bore: number;
    other: number;
  };
  detected_materials: string[];
  estimated_spindle_range_rpm: [number, number];
  estimated_feed_range_mm_min: [number, number];
  /**
   * Native feed-per-rev range (raw G95 F-values). DENSE in a constant-surface-speed
   * (G96) shop where `estimated_feed_range_mm_min` is fundamentally sparse — it is the
   * CORRECT cutting-condition target for this corpus (see CAM-FIRST-TRAIN-METRICS.md
   * mm/rev finding). Unit-TAGGED (`feed_per_rev_unit`) so in/rev (JM inch/G20) and
   * mm/rev (G21) are never silently mixed (the 25.4x mislabel class). Absent when no
   * G95 feed-per-rev value was present. Added U-CAM-FEED-PER-REV.
   */
  estimated_feed_range_per_rev?: [number, number];
  /** Unit of `estimated_feed_range_per_rev` — resolved from G20/G21; "unknown" when neither declared. */
  feed_per_rev_unit?: "in/rev" | "mm/rev" | "unknown";
  g_code_dialect_hint: GCodeDialect;
  has_m98_subroutine: boolean;
  has_g41_g42_cutter_comp: boolean;
  has_g83_peck_drill: boolean;
  has_g71_g72_lathe_cycle: boolean;
  parsed_ok: boolean;
  parse_warnings: string[];
}

export interface BatchExtractResult {
  schemaVersion: 1;
  extracted_at: string;
  sample_size: number;
  vectors: FeatureVector[];
  statistics: {
    total_programs: number;
    parsed_ok_count: number;
    parsed_ok_rate: number;
    by_cam_system: Record<string, number>;
    by_machine_type: Record<string, number>;
    g_code_dialects: Record<string, number>;
  };
}

// ─── Constants ──────────────────────────────────────────────────────

const EMPTY_OPS = (): FeatureVector["ops_by_strategy"] => ({
  profile: 0, pocket: 0, drill: 0, thread: 0, face: 0, bore: 0, other: 0,
});

const JM_DIE_ROOT_DEFAULT = "H:/PRISM/JM DIE";

// Material tokens we detect inside comments. Case-insensitive.
const MATERIAL_TOKENS = [
  "M2", "D2", "S7", "A2", "H13", "O1", "P20", "4140", "4340", "1018", "1045",
  "304", "316", "17-4", "INCONEL", "TITANIUM", "TI-6AL-4V", "6061", "7075",
  "BRASS", "COPPER", "CARBIDE", "GRAPHITE", "TOOL STEEL", "STEEL", "ALUMINUM",
];

// Strategy keyword → ops_by_strategy bucket
const STRATEGY_KEYWORDS: Array<[RegExp, keyof FeatureVector["ops_by_strategy"]]> = [
  [/\bTHREAD/i, "thread"],
  [/\bTAP\b/i, "thread"],
  [/\bDRILL/i, "drill"],
  [/\bPECK/i, "drill"],
  [/\bBORE/i, "bore"],
  [/\bRBORE/i, "bore"],
  [/\bFACE/i, "face"],
  [/\bFC\.|\bFC\b|\bFCMILL/i, "face"],
  [/\bPOCKET/i, "pocket"],
  [/\bPOCK\.|POCK\b/i, "pocket"],
  [/\bPROF|\bCONTOUR|\bOD RGH|\bOD FIN|\bID RGH|\bID FIN|\bTURN/i, "profile"],
  [/\bGROOVE/i, "profile"],
];

// ─── Engine ─────────────────────────────────────────────────────────

export class CAMFeatureExtractorEngine {
  readonly name = "CAMFeatureExtractorEngine";
  private readonly jmDieRoot: string;

  constructor(jmDieRoot: string = JM_DIE_ROOT_DEFAULT) {
    this.jmDieRoot = jmDieRoot;
  }

  /** Extract features from a single program. Accepts absolute path or corpus-relative. */
  extractOne(programPath: string): FeatureVector {
    const absPath = this.resolvePath(programPath);
    const ext = path.extname(absPath);
    const base: Omit<FeatureVector, "lines_of_code" | "tool_count" | "tool_changes"
      | "ops_by_strategy" | "detected_materials" | "estimated_spindle_range_rpm"
      | "estimated_feed_range_mm_min" | "g_code_dialect_hint" | "has_m98_subroutine"
      | "has_g41_g42_cutter_comp" | "has_g83_peck_drill" | "has_g71_g72_lathe_cycle"
      | "parsed_ok" | "parse_warnings"> = {
      program_id: this.hashPath(absPath),
      source_path: this.corpusRelative(absPath),
      cam_system: this.inferCAMSystem(ext),
      machine_type: this.inferMachineType(absPath),
      customer: this.inferCustomer(absPath),
      part_hint: this.inferPartHint(absPath),
    };

    if (ext.toLowerCase() === ".min") {
      return this.parseOkumaProgram(absPath, base);
    }
    if (ext === ".mcx-8" || ext === ".MCX") {
      return this.parseMastercamBinary(absPath, base);
    }
    // Unknown extension — emit an empty-but-valid vector with a warning
    return {
      ...base,
      cam_system_confidence: "fallback",
      cam_system_evidence: `unrecognized extension "${ext}"`,
      lines_of_code: 0,
      tool_count: 0,
      tool_changes: 0,
      ops_by_strategy: EMPTY_OPS(),
      detected_materials: [],
      estimated_spindle_range_rpm: [0, 0],
      estimated_feed_range_mm_min: [0, 0],
      g_code_dialect_hint: "unknown",
      has_m98_subroutine: false,
      has_g41_g42_cutter_comp: false,
      has_g83_peck_drill: false,
      has_g71_g72_lathe_cycle: false,
      parsed_ok: false,
      parse_warnings: [`Unsupported extension "${ext}" — parser not available in U-CAM-ML-02 (ancillary file, not a CAM program)`],
    };
  }

  /** Extract features from a batch sampled from the corpus index. */
  extractBatch(
    sampleSize: number = 100,
    corpusIndexPath: string = "H:/PRISM/mcp-server/data/state/JM_DIE_CORPUS_INDEX.json"
  ): BatchExtractResult {
    let programs: Array<{ path: string; extension: string }> = [];
    try {
      const idx = JSON.parse(fs.readFileSync(corpusIndexPath, "utf-8"));
      programs = idx.programs ?? [];
    } catch (err) {
      return {
        schemaVersion: 1,
        extracted_at: new Date().toISOString(),
        sample_size: 0,
        vectors: [],
        statistics: this.emptyStats(),
      };
    }

    // Stratified sample: favor .MIN and .mcx-8 to test both parsers
    const byExt = new Map<string, typeof programs>();
    for (const p of programs) {
      const arr = byExt.get(p.extension) ?? [];
      arr.push(p);
      byExt.set(p.extension, arr);
    }
    const sample: typeof programs = [];
    const minPrograms = byExt.get(".MIN") ?? [];
    const minVariant = byExt.get(".min") ?? [];
    const mcx8 = byExt.get(".mcx-8") ?? [];
    const mcx = byExt.get(".MCX") ?? [];

    // 45% .MIN + .min, 30% .mcx-8, 15% .MCX, 10% other
    const takeFrom = (arr: typeof programs, n: number) => {
      const step = Math.max(1, Math.floor(arr.length / Math.max(1, n)));
      const out: typeof programs = [];
      for (let i = 0; i < arr.length && out.length < n; i += step) out.push(arr[i]);
      return out;
    };
    sample.push(...takeFrom([...minPrograms, ...minVariant], Math.floor(sampleSize * 0.45)));
    sample.push(...takeFrom(mcx8, Math.floor(sampleSize * 0.30)));
    sample.push(...takeFrom(mcx, Math.floor(sampleSize * 0.15)));
    // Top up with any remaining from the rest
    const rest = programs.filter(
      (p) => p.extension !== ".MIN" && p.extension !== ".min"
        && p.extension !== ".mcx-8" && p.extension !== ".MCX"
    );
    sample.push(...takeFrom(rest, sampleSize - sample.length));

    const vectors: FeatureVector[] = [];
    for (const p of sample.slice(0, sampleSize)) {
      try {
        vectors.push(this.extractOne(p.path));
      } catch (err) {
        // Never let a single bad file kill the batch
        vectors.push(this.errorVector(p.path, err));
      }
    }

    return {
      schemaVersion: 1,
      extracted_at: new Date().toISOString(),
      sample_size: vectors.length,
      vectors,
      statistics: this.computeStats(vectors),
    };
  }

  // ─── Parsers ──────────────────────────────────────────────────────

  private parseOkumaProgram(
    absPath: string,
    base: Pick<FeatureVector, "program_id" | "source_path" | "cam_system" | "machine_type" | "customer" | "part_hint">
  ): FeatureVector {
    const warnings: string[] = [];
    let text = "";
    try {
      text = fs.readFileSync(absPath, "utf-8");
    } catch (err) {
      return {
        ...base,
        cam_system: "okuma_native",
        lines_of_code: 0,
        tool_count: 0,
        tool_changes: 0,
        ops_by_strategy: EMPTY_OPS(),
        detected_materials: [],
        estimated_spindle_range_rpm: [0, 0],
        estimated_feed_range_mm_min: [0, 0],
        g_code_dialect_hint: "unknown",
        has_m98_subroutine: false,
        has_g41_g42_cutter_comp: false,
        has_g83_peck_drill: false,
        has_g71_g72_lathe_cycle: false,
        parsed_ok: false,
        parse_warnings: [`Read error: ${err instanceof Error ? err.message : String(err)}`],
      };
    }

    const lines = text.split(/\r?\n/);
    if (lines.length === 0 || text.trim().length === 0) {
      warnings.push("Empty file");
    }

    const ops = EMPTY_OPS();
    const tools = new Set<string>();
    let tool_changes = 0;
    const spindleRPM: number[] = [];
    const feeds: number[] = [];
    const materials = new Set<string>();
    // Feed/spindle MODE state for CORRECT mm/min feed extraction (U-CAM-FEED-EXTRACT-FIX,
    // 2026-05-31). Okuma lathe (.MIN): G94=feed/min (mm/min), G95=feed/rev (mm/rev — the
    // common turning default); G96=constant-surface-speed (S is surface speed, NOT rpm),
    // G97=direct rpm. The target field is mm/min, so a G95 feed must be converted
    // mm/min = F(mm/rev) * rpm, and rpm is only known under G97. Pushing a raw G95 value
    // into an mm/min field was a ~1000x units error; we now convert when determinable and
    // SKIP (never fabricate) when units are ambiguous (G96 CSS / unknown mode).
    let feedMode: "G94" | "G95" | null = null;
    let spindleMode: "G96" | "G97" | null = null;
    let lastRpm = 0;
    let feedsSkippedAmbiguous = 0;
    const feedsPerRev: number[] = [];           // raw G95 feed-per-rev — the CSS shop's dense feed target
    let programUnit: "in" | "mm" | null = null; // G20/G21 — tags the per-rev unit (prevents 25.4x mislabel)

    let has_m98 = false;
    let has_g41_g42 = false;
    let has_g83 = false;
    let has_g71_g72 = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Comments inside (...) — extract for operation + material tags
      const commentMatch = line.match(/\(([^)]*)\)/);
      if (commentMatch) {
        const cmt = commentMatch[1];
        let matchedStrategy = false;
        for (const [pat, bucket] of STRATEGY_KEYWORDS) {
          if (pat.test(cmt)) {
            ops[bucket] += 1;
            matchedStrategy = true;
            break;
          }
        }
        if (!matchedStrategy && /\b(ROUGH|FINISH|CUT)\b/i.test(cmt)) ops.other += 1;

        const cmtUpper = cmt.toUpperCase();
        for (const mat of MATERIAL_TOKENS) {
          if (cmtUpper.includes(mat)) materials.add(mat);
        }
      }

      // Tool codes: Txxxxxx (T + 2-digit tool # + 2-digit offset + 2-digit wear)
      const toolMatch = line.match(/\bT(\d{2,6})\b/);
      if (toolMatch) {
        const toolId = toolMatch[1].slice(0, 2);
        if (!tools.has(toolId)) tools.add(toolId);
        tool_changes += 1;
      }

      // Feed/spindle MODE (Okuma) — detect BEFORE the feed value so same-block modes apply.
      if (/\bG94\b/.test(line)) feedMode = "G94";
      else if (/\bG95\b/.test(line)) feedMode = "G95";
      if (/\bG96\b/.test(line)) spindleMode = "G96";
      else if (/\bG97\b/.test(line)) spindleMode = "G97";
      if (/\bG20\b/.test(line)) programUnit = "in";        // inch (JM Okuma convention)
      else if (/\bG21\b/.test(line)) programUnit = "mm";   // metric

      // Strip inline comments so an "(F0.2)" note can't masquerade as a real feed/spindle word.
      const codePart = line.replace(/\([^)]*\)/g, " ");

      // Spindle: S after G50 / G96 / G97 / standalone S. S is rpm ONLY under G97 (or when the
      // mode is still unknown — matches the prior all-S behavior); under G96 it is a surface
      // speed, so it must NOT seed the rpm used to convert a G95 feed to mm/min.
      const spindleMatch = codePart.match(/\bS(\d+)/);
      if (spindleMatch) {
        const sval = parseInt(spindleMatch[1], 10);
        if (sval > 0 && sval < 100000) {
          spindleRPM.push(sval);                       // spindle range proxy (unchanged scope)
          lastRpm = spindleMode === "G96" ? 0 : sval;  // true rpm under G97 / unknown; CSS → rpm unknown
        }
      }

      // Feed: F + number. NOTE: no leading \b — an inline feed like "Z-1.5F0.15" has NO word
      // boundary between the digit and F, which silently dropped most feeds before
      // (U-CAM-FEED-EXTRACT-FIX). Emit mm/min by mode; skip when the units are ambiguous.
      // Number forms: 0.15, 1, 5.0, AND Okuma's leading-dot (.002) + trailing-dot (1.) notation —
      // the DOMINANT JM feed format that the prior /F(\d+(?:\.\d+)?)/ regex silently MISSED, which
      // (with the G96-CSS skip) is the real reason feed coverage was n≈6 (U-CAM-FEED-PER-REV).
      const feedMatch = codePart.match(/F(\d*\.\d+|\d+\.?)/);
      if (feedMatch) {
        const f = parseFloat(feedMatch[1]);
        if (f > 0 && f < 100000) {
          // G95 feed IS feed-per-rev by definition (independent of spindle mode) — capture
          // it as the dense native target even when CSS makes the mm/min conversion impossible.
          if (feedMode === "G95") {
            feedsPerRev.push(f);
          }
          if (feedMode === "G94") {
            feeds.push(f);                             // already mm/min
          } else if (feedMode === "G95" && lastRpm > 0) {
            feeds.push(f * lastRpm);                   // mm/rev * rpm = mm/min
          } else {
            feedsSkippedAmbiguous++;                   // G96-CSS / unknown mode → don't mislabel mm/min
          }
        }
      }

      // G-code flags
      if (/\bG41\b|\bG42\b/.test(line)) has_g41_g42 = true;
      if (/\bG83\b/.test(line)) has_g83 = true;
      if (/\bG71\b|\bG72\b|\bG73\b/.test(line)) has_g71_g72 = true;
      // Okuma uses G85/G87/G81 for repeat cycles — also indicates lathe cycle presence
      if (/\bG85\b|\bG87\b|\bG81\b/.test(line)) has_g71_g72 = true;

      // Subroutine calls
      if (/\/CALL\b|\/GOTO\b|\bM98\b|\bGOSUB\b/.test(line)) has_m98 = true;
    }

    const parsed_ok = lines.length > 0 && (tools.size > 0 || spindleRPM.length > 0 || feeds.length > 0);
    if (!parsed_ok && warnings.length === 0) {
      warnings.push("No tool/spindle/feed tokens found — file may not be a valid Okuma program");
    }
    // R12: surface WHY the feed target is empty rather than silently leaving [0,0].
    if (feedsSkippedAmbiguous > 0 && feeds.length === 0) {
      warnings.push(`${feedsSkippedAmbiguous} feed value(s) skipped — ambiguous units (G96 CSS or no G94/G95 mode + rpm); mm/min feed left empty rather than mislabeled. Native feed-per-rev captured in estimated_feed_range_per_rev (${feedsPerRev.length} value(s)).`);
    }
    // R12: feed-per-rev captured but G20/G21 not declared → tagged 'unknown' (don't assume inch silently).
    if (feedsPerRev.length > 0 && programUnit === null) {
      warnings.push(`${feedsPerRev.length} feed-per-rev value(s) tagged unit='unknown' (no G20/G21 in program; JM Okuma convention is inch). Resolve unit before cross-shop feed training to avoid a 25.4x mix.`);
    }

    // U-CAM-ML-02-CLASSIFIER: override extension-based cam_system when the
    // header contains a stronger CAM signal (e.g. a hyperMILL post banner).
    const headerOverride = this.inferCAMSystemFromHeader(text);
    const cam_system: CAMSystemTag = headerOverride ? headerOverride.tag : "okuma_native";
    const cam_system_confidence = headerOverride ? headerOverride.confidence : "extension";
    const cam_system_evidence = headerOverride ? headerOverride.evidence : "extension=.min";

    return {
      ...base,
      cam_system,
      cam_system_confidence,
      cam_system_evidence,
      lines_of_code: lines.length,
      tool_count: tools.size,
      tool_changes,
      ops_by_strategy: ops,
      detected_materials: Array.from(materials).sort(),
      estimated_spindle_range_rpm: spindleRPM.length > 0
        ? [Math.min(...spindleRPM), Math.max(...spindleRPM)]
        : [0, 0],
      estimated_feed_range_mm_min: feeds.length > 0
        ? [Math.min(...feeds), Math.max(...feeds)]
        : [0, 0],
      estimated_feed_range_per_rev: feedsPerRev.length > 0
        ? [Math.min(...feedsPerRev), Math.max(...feedsPerRev)]
        : undefined,
      feed_per_rev_unit: feedsPerRev.length > 0
        ? (programUnit === "mm" ? "mm/rev" : programUnit === "in" ? "in/rev" : "unknown")
        : undefined,
      g_code_dialect_hint: "okuma",
      has_m98_subroutine: has_m98,
      has_g41_g42_cutter_comp: has_g41_g42,
      has_g83_peck_drill: has_g83,
      has_g71_g72_lathe_cycle: has_g71_g72,
      parsed_ok,
      parse_warnings: warnings,
    };
  }

  private parseMastercamBinary(
    absPath: string,
    base: Pick<FeatureVector, "program_id" | "source_path" | "cam_system" | "machine_type" | "customer" | "part_hint">
  ): FeatureVector {
    // Mastercam .mcx-8 / .MCX are proprietary binary — we only extract file-size heuristics.
    // Full operation/tool parse requires the NET-Hook SDK (U-CAM89-EXTEND).
    let size = 0;
    try {
      size = fs.statSync(absPath).size;
    } catch {
      // swallow
    }
    // Rough heuristic: 10-50 KB per operation in Mastercam binaries
    const estimated_ops = Math.max(1, Math.min(20, Math.round(size / 30000)));
    return {
      ...base,
      cam_system: "mastercam",
      cam_system_confidence: "extension",
      cam_system_evidence: "extension=.mcx-8/.MCX",
      lines_of_code: 0,
      tool_count: 0,
      tool_changes: 0,
      ops_by_strategy: { ...EMPTY_OPS(), other: estimated_ops },
      detected_materials: [],
      estimated_spindle_range_rpm: [0, 0],
      estimated_feed_range_mm_min: [0, 0],
      g_code_dialect_hint: "unknown",
      has_m98_subroutine: false,
      has_g41_g42_cutter_comp: false,
      has_g83_peck_drill: false,
      has_g71_g72_lathe_cycle: false,
      parsed_ok: false,
      parse_warnings: [
        `Mastercam binary not decodable without NET-Hook SDK — file-size heuristic only (estimated ${estimated_ops} ops from ${size} bytes). Full parse deferred to U-CAM89-EXTEND.`,
      ],
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private resolvePath(p: string): string {
    if (path.isAbsolute(p)) return p;
    // Corpus index stores paths relative to JM DIE root (minus the "JM DIE/" prefix)
    const trimmed = p.replace(/^JM DIE[\\/]/i, "");
    return path.resolve(this.jmDieRoot, trimmed);
  }

  private corpusRelative(absPath: string): string {
    const root = path.resolve(this.jmDieRoot);
    const abs = path.resolve(absPath);
    if (abs.startsWith(root)) {
      return "JM DIE/" + abs.slice(root.length + 1).replace(/\\/g, "/");
    }
    return abs.replace(/\\/g, "/");
  }

  private hashPath(absPath: string): string {
    return crypto.createHash("sha256").update(absPath).digest("hex").slice(0, 16);
  }

  private inferCAMSystem(ext: string): CAMSystemTag {
    const e = ext.toLowerCase();
    if (e === ".min") return "okuma_native";
    if (e === ".mcx-8" || e === ".mcx") return "mastercam";
    return "unknown";
  }

  /**
   * U-CAM-ML-02-CLASSIFIER (2026-04-21) — Upgrade the cam_system label from
   * extension-only to header-aware. Inspects the first 4KB of an ASCII program
   * for CAM signatures. Used to override the extension-based default when a
   * more-specific generator is identified (e.g. a .NC file generated by
   * Mastercam has "(MASTERCAM X8 ...)" in its first block comment).
   *
   * Empirical finding on JM Die corpus: the 50-program .MIN sample had ZERO
   * Mastercam/hyperMILL signatures — JM Die's Okuma lathes run programs that
   * are genuinely Okuma-native ($filename.MIN% header + NAT op markers + no
   * CAM banner). So this override rarely fires on the current corpus, but
   * becomes important when the full 25,817-program harvest exposes .NC files
   * or other programs with real CAM banners.
   *
   * @returns override tag + confidence + evidence, or null if no override
   */
  inferCAMSystemFromHeader(
    header: string
  ): { tag: CAMSystemTag; confidence: "header_match"; evidence: string } | null {
    if (!header) return null;
    const upper = header.slice(0, 4096).toUpperCase();
    // Mastercam banner examples: "(MASTERCAM X8 )", "(MASTERCAM 2024 MILL)", "MASTERCAM MILL NC"
    if (/\bMASTERCAM\b/.test(upper)) {
      return { tag: "mastercam", confidence: "header_match", evidence: "MASTERCAM token in header" };
    }
    // hyperMILL banner examples: "(HYPERMILL )", "(HYPER-MILL)", "(OPEN MIND HYPERMILL)"
    if (/\bHYPER[\s\-_]?MILL\b/.test(upper) || /\bOPEN\s+MIND\b/.test(upper)) {
      return { tag: "hypermill", confidence: "header_match", evidence: "HYPERMILL or OPEN MIND token in header" };
    }
    // Fusion 360 banner: "(FUSION 360 POST VERSION ...)"
    if (/\bFUSION\s*360\b/.test(upper) || /\bADSK\.FUSION\b/.test(upper)) {
      return { tag: "fusion360", confidence: "header_match", evidence: "FUSION 360 token in header" };
    }
    // Inventor HSM banner: "(INVENTOR HSM POST ...)"
    if (/\bINVENTOR\s+HSM\b/.test(upper) || /\bHSMWORKS\b/.test(upper)) {
      return { tag: "inventor-hsm", confidence: "header_match", evidence: "INVENTOR HSM or HSMWORKS token in header" };
    }
    // SolidCAM banner: "(SOLIDCAM ...)"
    if (/\bSOLIDCAM\b/.test(upper)) {
      return { tag: "solidcam", confidence: "header_match", evidence: "SOLIDCAM token in header" };
    }
    return null;
  }

  private inferMachineType(absPath: string): string {
    const parts = this.corpusRelative(absPath).split("/");
    // JM DIE / <machine type> / [customer] / file
    if (parts.length >= 2 && parts[0] === "JM DIE") return parts[1].toUpperCase();
    return "UNKNOWN";
  }

  private inferCustomer(absPath: string): string {
    const parts = this.corpusRelative(absPath).split("/");
    if (parts.length >= 4) return parts[2];
    return "unknown";
  }

  private inferPartHint(absPath: string): string | null {
    const base = path.basename(absPath, path.extname(absPath));
    return base.length > 0 ? base : null;
  }

  private errorVector(sourcePath: string, err: unknown): FeatureVector {
    return {
      program_id: this.hashPath(sourcePath),
      source_path: sourcePath,
      cam_system: "unknown",
      machine_type: "UNKNOWN",
      customer: "unknown",
      part_hint: null,
      lines_of_code: 0,
      tool_count: 0,
      tool_changes: 0,
      ops_by_strategy: EMPTY_OPS(),
      detected_materials: [],
      estimated_spindle_range_rpm: [0, 0],
      estimated_feed_range_mm_min: [0, 0],
      g_code_dialect_hint: "unknown",
      has_m98_subroutine: false,
      has_g41_g42_cutter_comp: false,
      has_g83_peck_drill: false,
      has_g71_g72_lathe_cycle: false,
      parsed_ok: false,
      parse_warnings: [`Extraction error: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  private emptyStats(): BatchExtractResult["statistics"] {
    return {
      total_programs: 0,
      parsed_ok_count: 0,
      parsed_ok_rate: 0,
      by_cam_system: {},
      by_machine_type: {},
      g_code_dialects: {},
    };
  }

  private computeStats(vectors: FeatureVector[]): BatchExtractResult["statistics"] {
    const by_cam_system: Record<string, number> = {};
    const by_machine_type: Record<string, number> = {};
    const g_code_dialects: Record<string, number> = {};
    let parsed_ok_count = 0;
    for (const v of vectors) {
      if (v.parsed_ok) parsed_ok_count += 1;
      by_cam_system[v.cam_system] = (by_cam_system[v.cam_system] ?? 0) + 1;
      by_machine_type[v.machine_type] = (by_machine_type[v.machine_type] ?? 0) + 1;
      g_code_dialects[v.g_code_dialect_hint] = (g_code_dialects[v.g_code_dialect_hint] ?? 0) + 1;
    }
    return {
      total_programs: vectors.length,
      parsed_ok_count,
      parsed_ok_rate: vectors.length > 0 ? parsed_ok_count / vectors.length : 0,
      by_cam_system,
      by_machine_type,
      g_code_dialects,
    };
  }
}

export const camFeatureExtractorEngine = new CAMFeatureExtractorEngine();
