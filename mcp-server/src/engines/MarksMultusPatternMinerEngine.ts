/**
 * MarksMultusPatternMinerEngine (E100)
 * ======================================
 *
 * Mines Mark's MULTUS programming patterns from Okuma .MIN G-code files.
 * Extracts macros (Okuma User Task), canned cycles (G71/G72/G73/G76),
 * tool usage (T codes), M codes, and feedrate patterns.
 *
 * Input: raw .MIN text or filesystem directory.
 * Output: classified pattern list with cross-references to programs.
 *
 * Semantic-hash dedup prevents the .MIN mining from producing duplicate
 * tribal tips (roadmap risk item).
 *
 * @module engines/MarksMultusPatternMinerEngine
 * @milestone LATHE-AWARE-HARDEN MS5 (U-LAT40)
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { log } from "../utils/Logger.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type PatternKind =
  | "macro_call"
  | "macro_definition"
  | "canned_cycle"
  | "tool_change"
  | "spindle_mode"
  | "coolant_mode"
  | "subprogram_call"
  | "conditional"
  | "probe";

export interface MultusPattern {
  kind: PatternKind;
  signature: string; // canonical form (e.g. "G71 P__ Q__ U__ W__ D__ F__")
  gcode_snippet: string; // original line
  line_number: number;
  source_file: string;
  frequency?: number; // populated after dedup
  semantic_hash: string;
  details?: Record<string, string | number>;
}

export interface MiningResult {
  source: string;
  total_lines: number;
  patterns: MultusPattern[];
  pattern_counts: Record<PatternKind, number>;
  unique_tools: number[];
  has_macros: boolean;
  has_conditional_logic: boolean;
  has_probing: boolean;
  generated_at: string;
}

export interface MiningOptions {
  /** Deduplicate by semantic_hash (default: true) */
  deduplicate?: boolean;
  /** Filter by pattern kinds */
  kinds?: PatternKind[];
}

// ── Pattern Detectors ──────────────────────────────────────────────────────

const MACRO_CALL_RE = /\bG65\s+P(\d+)\b/;
const MODAL_MACRO_RE = /\bG66\s+P(\d+)\b/;
const MACRO_DEF_RE = /\bO(\d{4,})\b/;
const CANNED_CYCLE_RE = /\b(G71|G72|G73|G74|G75|G76|G81|G82|G83|G84|G85|G87)\b/;
const TOOL_CHANGE_RE = /\bT(\d{2,4})\b/;
const SPINDLE_MODE_RE = /\b(G96|G97|G50)\s+S(\d+)/;
const COOLANT_MODE_RE = /\b(M7|M8|M9|M13|M53)\b/;
const SUBPROGRAM_CALL_RE = /\bM98\s+P(\d+)\b/;
const CONDITIONAL_RE = /\b(IF|WHILE|GOTO|EQ|NE|GT|LT|GE|LE)\b/;
const PROBE_RE = /\b(G31|G37\.\d|SKIP)\b/i;
const MACRO_VARIABLE_RE = /#\d{3,4}\s*=/;

function canonicalize(line: string): string {
  // Replace numeric values with __ to produce a canonical signature
  return line
    .replace(/[A-Z][-+]?\d+(\.\d+)?/g, (m) => m[0] + "__")
    .replace(/\s+/g, " ")
    .trim();
}

function semanticHash(signature: string, kind: PatternKind): string {
  return crypto
    .createHash("sha1")
    .update(`${kind}::${signature}`)
    .digest("hex")
    .slice(0, 16);
}

// ── Engine Implementation ──────────────────────────────────────────────────

class MarksMultusPatternMinerEngineImpl {
  /**
   * Mine patterns from raw .MIN text content.
   */
  mineText(content: string, sourceName = "in-memory"): MiningResult {
    const lines = content.split(/\r?\n/);
    const patterns: MultusPattern[] = [];
    const tools = new Set<number>();
    const counts: Record<PatternKind, number> = {
      macro_call: 0,
      macro_definition: 0,
      canned_cycle: 0,
      tool_change: 0,
      spindle_mode: 0,
      coolant_mode: 0,
      subprogram_call: 0,
      conditional: 0,
      probe: 0,
    };

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i]!;
      const line = raw.trim();
      if (line.length === 0 || line.startsWith("(") || line.startsWith(";")) {
        continue;
      }

      const detections: Array<{ kind: PatternKind; details?: Record<string, string | number> }> = [];

      let m: RegExpMatchArray | null;

      if ((m = line.match(MACRO_CALL_RE))) {
        detections.push({ kind: "macro_call", details: { program: `P${m[1]}` } });
      }
      if ((m = line.match(MODAL_MACRO_RE))) {
        detections.push({ kind: "macro_call", details: { program: `P${m[1]}`, modal: "true" } });
      }
      if (line.startsWith("O") && (m = line.match(MACRO_DEF_RE))) {
        detections.push({ kind: "macro_definition", details: { program: `O${m[1]}` } });
      }
      if ((m = line.match(CANNED_CYCLE_RE))) {
        detections.push({ kind: "canned_cycle", details: { cycle: m[1]! } });
      }
      if ((m = line.match(TOOL_CHANGE_RE))) {
        const t = parseInt(m[1]!, 10);
        tools.add(t);
        detections.push({ kind: "tool_change", details: { tool: t } });
      }
      if ((m = line.match(SPINDLE_MODE_RE))) {
        detections.push({
          kind: "spindle_mode",
          details: { mode: m[1]!, value: parseInt(m[2]!, 10) },
        });
      }
      if ((m = line.match(COOLANT_MODE_RE))) {
        detections.push({ kind: "coolant_mode", details: { code: m[1]! } });
      }
      if ((m = line.match(SUBPROGRAM_CALL_RE))) {
        detections.push({ kind: "subprogram_call", details: { program: `P${m[1]}` } });
      }
      if (CONDITIONAL_RE.test(line)) {
        detections.push({ kind: "conditional" });
      }
      if (PROBE_RE.test(line)) {
        detections.push({ kind: "probe" });
      }
      // Macro variable assignment is conditional logic (User Task)
      if (MACRO_VARIABLE_RE.test(line)) {
        detections.push({ kind: "conditional", details: { type: "variable_assignment" } });
      }

      const signature = canonicalize(line);
      for (const det of detections) {
        const hash = semanticHash(signature, det.kind);
        patterns.push({
          kind: det.kind,
          signature,
          gcode_snippet: line,
          line_number: i + 1,
          source_file: sourceName,
          semantic_hash: hash,
          details: det.details,
        });
        counts[det.kind]++;
      }
    }

    return {
      source: sourceName,
      total_lines: lines.length,
      patterns,
      pattern_counts: counts,
      unique_tools: [...tools].sort((a, b) => a - b),
      has_macros: counts.macro_call > 0 || counts.macro_definition > 0,
      has_conditional_logic: counts.conditional > 0,
      has_probing: counts.probe > 0,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Mine a single .MIN file from disk.
   */
  mineFile(filePath: string): MiningResult {
    if (!fs.existsSync(filePath)) {
      log.warn(`[MultusMiner] File not found: ${filePath}`);
      return this.emptyResult(filePath);
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return this.mineText(content, filePath);
  }

  /**
   * Mine all .MIN files in a directory (non-recursive).
   * Returns aggregated results with semantic-hash dedup.
   */
  mineDirectory(
    dirPath: string,
    options: MiningOptions = {}
  ): { aggregate: MiningResult; per_file: MiningResult[]; deduped: MultusPattern[] } {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      log.warn(`[MultusMiner] Directory not found: ${dirPath}`);
      return {
        aggregate: this.emptyResult(dirPath),
        per_file: [],
        deduped: [],
      };
    }

    const entries = fs.readdirSync(dirPath);
    const minFiles = entries.filter((f) => /\.min$/i.test(f));
    const per_file: MiningResult[] = [];

    for (const file of minFiles) {
      per_file.push(this.mineFile(path.join(dirPath, file)));
    }

    // Aggregate
    const allPatterns = per_file.flatMap((r) => r.patterns);
    const aggregatedCounts: Record<PatternKind, number> = {
      macro_call: 0,
      macro_definition: 0,
      canned_cycle: 0,
      tool_change: 0,
      spindle_mode: 0,
      coolant_mode: 0,
      subprogram_call: 0,
      conditional: 0,
      probe: 0,
    };
    const tools = new Set<number>();
    for (const r of per_file) {
      for (const k of Object.keys(aggregatedCounts) as PatternKind[]) {
        aggregatedCounts[k] += r.pattern_counts[k];
      }
      for (const t of r.unique_tools) tools.add(t);
    }

    let deduped = allPatterns;
    if (options.deduplicate !== false) {
      const map = new Map<string, MultusPattern>();
      for (const p of allPatterns) {
        const existing = map.get(p.semantic_hash);
        if (existing) {
          existing.frequency = (existing.frequency ?? 1) + 1;
        } else {
          map.set(p.semantic_hash, { ...p, frequency: 1 });
        }
      }
      deduped = [...map.values()];
    }
    if (options.kinds && options.kinds.length > 0) {
      const kindSet = new Set(options.kinds);
      deduped = deduped.filter((p) => kindSet.has(p.kind));
    }

    const aggregate: MiningResult = {
      source: dirPath,
      total_lines: per_file.reduce((sum, r) => sum + r.total_lines, 0),
      patterns: allPatterns,
      pattern_counts: aggregatedCounts,
      unique_tools: [...tools].sort((a, b) => a - b),
      has_macros: aggregatedCounts.macro_call > 0 || aggregatedCounts.macro_definition > 0,
      has_conditional_logic: aggregatedCounts.conditional > 0,
      has_probing: aggregatedCounts.probe > 0,
      generated_at: new Date().toISOString(),
    };

    return { aggregate, per_file, deduped };
  }

  private emptyResult(source: string): MiningResult {
    return {
      source,
      total_lines: 0,
      patterns: [],
      pattern_counts: {
        macro_call: 0,
        macro_definition: 0,
        canned_cycle: 0,
        tool_change: 0,
        spindle_mode: 0,
        coolant_mode: 0,
        subprogram_call: 0,
        conditional: 0,
        probe: 0,
      },
      unique_tools: [],
      has_macros: false,
      has_conditional_logic: false,
      has_probing: false,
      generated_at: new Date().toISOString(),
    };
  }

  getStats(): { supported_kinds: number; dedup_algorithm: string } {
    return { supported_kinds: 9, dedup_algorithm: "sha1-canonical-signature" };
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const marksMultusPatternMinerEngine = new MarksMultusPatternMinerEngineImpl();
export type { MarksMultusPatternMinerEngineImpl };
