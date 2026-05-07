/**
 * LathePostProcessorDialectValidatorEngine — LATHE-PROD-READY-MS0 U-LPR03
 *
 * Compares PRISM-generated lathe posts against actual JM Die .MIN samples
 * to validate structural parity and detect safety-critical divergences.
 *
 * Requirements:
 * - Diff ≥50 JM Die .MIN samples
 * - Structural parity ≥95%
 * - Zero safety-critical divergences
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR03
 */

import { z } from "zod";

export const DialectComparisonResultSchema = z.object({
  file_path: z.string(),
  reference_lines: z.number(),
  generated_lines: z.number(),
  structural_parity_percent: z.number(),
  matched_blocks: z.number(),
  divergent_blocks: z.number(),
  safety_critical_divergences: z.array(z.object({
    line_number: z.number(),
    reference_block: z.string(),
    generated_block: z.string(),
    category: z.enum(["spindle", "feed", "tool", "rapid", "coolant", "modal", "safety_zone"]),
    severity: z.enum(["critical", "major", "minor"]),
    description: z.string(),
  })),
  structural_divergences: z.array(z.object({
    line_number: z.number(),
    reference_block: z.string(),
    generated_block: z.string(),
    type: z.enum(["missing", "extra", "modified", "reordered"]),
  })),
  dialect_features: z.object({
    css_usage: z.boolean(),
    canned_cycles: z.array(z.string()),
    live_tooling: z.boolean(),
    sub_spindle: z.boolean(),
    c_axis: z.boolean(),
    y_axis: z.boolean(),
    bar_feeder: z.boolean(),
  }),
});

export const BatchValidationReportSchema = z.object({
  total_samples: z.number(),
  passed_samples: z.number(),
  failed_samples: z.number(),
  overall_parity_percent: z.number(),
  safety_critical_count: z.number(),
  samples: z.array(DialectComparisonResultSchema),
  summary: z.object({
    meets_95_parity: z.boolean(),
    zero_safety_divergences: z.boolean(),
    gate_passed: z.boolean(),
  }),
});

export type DialectComparisonResult = z.infer<typeof DialectComparisonResultSchema>;
export type BatchValidationReport = z.infer<typeof BatchValidationReportSchema>;

interface GCodeBlock {
  line_number: number;
  raw: string;
  g_codes: string[];
  m_codes: string[];
  addresses: Map<string, number>;
  comment: string | null;
}

const SAFETY_CRITICAL_ADDRESSES = new Set(["S", "F", "T", "X", "Z", "G00", "G01", "M03", "M04", "M05", "M08", "M09"]);
const MODAL_GROUPS = {
  motion: ["G00", "G01", "G02", "G03"],
  plane: ["G17", "G18", "G19"],
  units: ["G20", "G21"],
  compensation: ["G40", "G41", "G42"],
  canned: ["G70", "G71", "G72", "G73", "G74", "G75", "G76", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
};

export class LathePostProcessorDialectValidatorEngine {

  static parseGCodeBlock(line: string, lineNumber: number): GCodeBlock {
    const comment_match = line.match(/\(([^)]*)\)/);
    const comment = comment_match ? comment_match[1] : null;
    const code_part = line.replace(/\([^)]*\)/g, "").trim();

    const g_codes: string[] = [];
    const m_codes: string[] = [];
    const addresses = new Map<string, number>();

    const g_matches = code_part.matchAll(/G(\d+\.?\d*)/gi);
    for (const m of g_matches) {
      g_codes.push(`G${m[1]}`);
    }

    const m_matches = code_part.matchAll(/M(\d+)/gi);
    for (const m of m_matches) {
      m_codes.push(`M${m[1]}`);
    }

    const addr_matches = code_part.matchAll(/([A-Z])(-?\d+\.?\d*)/gi);
    for (const m of addr_matches) {
      if (m[1] !== "G" && m[1] !== "M" && m[1] !== "N" && m[1] !== "O") {
        addresses.set(m[1], parseFloat(m[2]));
      }
    }

    return { line_number: lineNumber, raw: line.trim(), g_codes, m_codes, addresses, comment };
  }

  static parseProgram(content: string): GCodeBlock[] {
    const lines = content.split(/\r?\n/);
    const blocks: GCodeBlock[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith("%") && !line.startsWith("O")) {
        blocks.push(this.parseGCodeBlock(line, i + 1));
      }
    }

    return blocks;
  }

  static detectDialectFeatures(blocks: GCodeBlock[]): DialectComparisonResult["dialect_features"] {
    const features = {
      css_usage: false,
      canned_cycles: [] as string[],
      live_tooling: false,
      sub_spindle: false,
      c_axis: false,
      y_axis: false,
      bar_feeder: false,
    };

    const canned_set = new Set<string>();

    for (const block of blocks) {
      if (block.g_codes.includes("G96") || block.g_codes.includes("G97")) {
        features.css_usage = true;
      }

      for (const g of block.g_codes) {
        if (MODAL_GROUPS.canned.includes(g)) {
          canned_set.add(g);
        }
        if (g === "G12.1" || g === "G13.1" || g === "G137" || g === "G136") {
          features.c_axis = true;
        }
      }

      if (block.addresses.has("Y")) {
        features.y_axis = true;
      }

      if (block.addresses.has("C")) {
        features.c_axis = true;
      }

      for (const m of block.m_codes) {
        if (["M45", "M46", "M215", "M216"].includes(m)) {
          features.live_tooling = true;
        }
        if (["M24", "M25", "M80", "M81"].includes(m)) {
          features.sub_spindle = true;
        }
        if (["M27", "M28", "M29", "M30"].some(code => m.startsWith(code.slice(0, 2)))) {
          features.bar_feeder = true;
        }
      }
    }

    features.canned_cycles = Array.from(canned_set).sort();
    return features;
  }

  static compareBlocks(
    refBlock: GCodeBlock,
    genBlock: GCodeBlock
  ): { matches: boolean; safetyCritical: boolean; divergenceType: string | null } {
    const refGSet = new Set(refBlock.g_codes);
    const genGSet = new Set(genBlock.g_codes);
    const refMSet = new Set(refBlock.m_codes);
    const genMSet = new Set(genBlock.m_codes);

    let safetyCritical = false;
    let matches = true;
    let divergenceType: string | null = null;

    for (const g of refGSet) {
      if (!genGSet.has(g)) {
        matches = false;
        divergenceType = "modified";
        if (SAFETY_CRITICAL_ADDRESSES.has(g)) {
          safetyCritical = true;
        }
      }
    }

    for (const m of refMSet) {
      if (!genMSet.has(m)) {
        matches = false;
        divergenceType = "modified";
        if (SAFETY_CRITICAL_ADDRESSES.has(m)) {
          safetyCritical = true;
        }
      }
    }

    for (const [addr, refVal] of refBlock.addresses) {
      const genVal = genBlock.addresses.get(addr);
      if (genVal === undefined) {
        matches = false;
        divergenceType = "modified";
        if (SAFETY_CRITICAL_ADDRESSES.has(addr)) {
          safetyCritical = true;
        }
      } else if (SAFETY_CRITICAL_ADDRESSES.has(addr)) {
        const tolerance = addr === "S" ? 0.05 : addr === "F" ? 0.02 : 0.001;
        if (Math.abs(refVal - genVal) / Math.max(Math.abs(refVal), 0.001) > tolerance) {
          matches = false;
          safetyCritical = true;
          divergenceType = "modified";
        }
      }
    }

    return { matches, safetyCritical, divergenceType };
  }

  static compare(
    referencePath: string,
    referenceContent: string,
    generatedContent: string
  ): DialectComparisonResult {
    const refBlocks = this.parseProgram(referenceContent);
    const genBlocks = this.parseProgram(generatedContent);

    const safety_critical_divergences: DialectComparisonResult["safety_critical_divergences"] = [];
    const structural_divergences: DialectComparisonResult["structural_divergences"] = [];

    let matchedCount = 0;
    const minLen = Math.min(refBlocks.length, genBlocks.length);

    for (let i = 0; i < minLen; i++) {
      const comparison = this.compareBlocks(refBlocks[i], genBlocks[i]);

      if (comparison.matches) {
        matchedCount++;
      } else {
        if (comparison.safetyCritical) {
          safety_critical_divergences.push({
            line_number: refBlocks[i].line_number,
            reference_block: refBlocks[i].raw,
            generated_block: genBlocks[i].raw,
            category: this.categorizeSafetyDivergence(refBlocks[i], genBlocks[i]),
            severity: "critical",
            description: `Safety-critical divergence at line ${refBlocks[i].line_number}`,
          });
        }

        structural_divergences.push({
          line_number: refBlocks[i].line_number,
          reference_block: refBlocks[i].raw,
          generated_block: genBlocks[i].raw,
          type: comparison.divergenceType as "missing" | "extra" | "modified" | "reordered",
        });
      }
    }

    for (let i = minLen; i < refBlocks.length; i++) {
      structural_divergences.push({
        line_number: refBlocks[i].line_number,
        reference_block: refBlocks[i].raw,
        generated_block: "",
        type: "missing",
      });
    }

    for (let i = minLen; i < genBlocks.length; i++) {
      structural_divergences.push({
        line_number: genBlocks[i].line_number,
        reference_block: "",
        generated_block: genBlocks[i].raw,
        type: "extra",
      });
    }

    const totalBlocks = Math.max(refBlocks.length, genBlocks.length);
    const parity = totalBlocks > 0 ? (matchedCount / totalBlocks) * 100 : 100;

    return {
      file_path: referencePath,
      reference_lines: refBlocks.length,
      generated_lines: genBlocks.length,
      structural_parity_percent: Math.round(parity * 100) / 100,
      matched_blocks: matchedCount,
      divergent_blocks: structural_divergences.length,
      safety_critical_divergences,
      structural_divergences: structural_divergences.slice(0, 50),
      dialect_features: this.detectDialectFeatures(refBlocks),
    };
  }

  private static categorizeSafetyDivergence(
    ref: GCodeBlock,
    gen: GCodeBlock
  ): "spindle" | "feed" | "tool" | "rapid" | "coolant" | "modal" | "safety_zone" {
    if (ref.addresses.has("S") || gen.addresses.has("S")) return "spindle";
    if (ref.addresses.has("F") || gen.addresses.has("F")) return "feed";
    if (ref.addresses.has("T") || gen.addresses.has("T")) return "tool";
    if (ref.g_codes.includes("G00") || gen.g_codes.includes("G00")) return "rapid";
    if (ref.m_codes.some(m => ["M08", "M09"].includes(m))) return "coolant";
    return "modal";
  }

  static validateBatch(
    samples: Array<{ path: string; reference: string; generated: string }>
  ): BatchValidationReport {
    const results: DialectComparisonResult[] = [];
    let totalParity = 0;
    let safetyCriticalCount = 0;

    for (const sample of samples) {
      const result = this.compare(sample.path, sample.reference, sample.generated);
      results.push(result);
      totalParity += result.structural_parity_percent;
      safetyCriticalCount += result.safety_critical_divergences.length;
    }

    const overallParity = samples.length > 0 ? totalParity / samples.length : 100;
    const meets95 = overallParity >= 95;
    const zeroSafety = safetyCriticalCount === 0;

    return {
      total_samples: samples.length,
      passed_samples: results.filter(r => r.structural_parity_percent >= 95 && r.safety_critical_divergences.length === 0).length,
      failed_samples: results.filter(r => r.structural_parity_percent < 95 || r.safety_critical_divergences.length > 0).length,
      overall_parity_percent: Math.round(overallParity * 100) / 100,
      safety_critical_count: safetyCriticalCount,
      samples: results,
      summary: {
        meets_95_parity: meets95,
        zero_safety_divergences: zeroSafety,
        gate_passed: meets95 && zeroSafety,
      },
    };
  }
}

export const lathePostProcessorDialectValidatorEngine = LathePostProcessorDialectValidatorEngine;
