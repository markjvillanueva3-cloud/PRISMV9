/**
 * WEDMProgramComparisonEngine — U-CAL18
 *
 * Compares PRISM-generated NC programs against real shop programs.
 * Parses both, extracts key parameters (offsets, feeds, E-codes, passes,
 * taper, tank commands), and produces a per-parameter deviation report
 * with an overall match score.
 *
 * Used by the calibration pipeline to validate PRISM output against
 * proven production programs.
 */
import { wireEDMProgramParserEngine, type WireEDMProgram } from "./WireEDMProgramParserEngine.js";

export interface ParameterDeviation {
  param: string;
  reference_value: number | string | boolean | null;
  prism_value: number | string | boolean | null;
  deviation_pct: number | null;
  match: boolean;
  notes: string;
}

export interface ComparisonResult {
  reference_filename: string;
  prism_filename: string;
  overall_score: number;
  parameter_count: number;
  matched_count: number;
  deviations: ParameterDeviation[];
  summary: string;
  reference_parsed: WireEDMProgram;
  prism_parsed: WireEDMProgram;
}

export class WEDMProgramComparisonEngine {
  private static readonly TOLERANCE_PCT = 20;

  compare(referenceNc: string, prismNc: string, refFilename = "reference.NC", prismFilename = "prism.NC"): ComparisonResult {
    const refParsed = wireEDMProgramParserEngine.parse(referenceNc, refFilename);
    const prismParsed = wireEDMProgramParserEngine.parse(prismNc, prismFilename);

    const deviations: ParameterDeviation[] = [];

    this.compareDialect(refParsed, prismParsed, deviations);
    this.comparePassCount(refParsed, prismParsed, deviations);
    this.compareOffsets(refParsed, prismParsed, deviations);
    this.compareFeeds(refParsed, prismParsed, deviations);
    this.compareECodes(refParsed, prismParsed, deviations);
    this.compareTaper(refParsed, prismParsed, deviations);
    this.compareWireSettings(refParsed, prismParsed, deviations);
    this.compareSafety(refParsed, prismParsed, deviations);

    const matchedCount = deviations.filter((d) => d.match).length;
    const score = deviations.length > 0 ? Math.round((matchedCount / deviations.length) * 100) : 100;

    const worstDeviations = deviations
      .filter((d) => !d.match)
      .slice(0, 3)
      .map((d) => d.param)
      .join(", ");

    return {
      reference_filename: refFilename,
      prism_filename: prismFilename,
      overall_score: score,
      parameter_count: deviations.length,
      matched_count: matchedCount,
      deviations,
      summary: matchedCount === deviations.length
        ? `All ${matchedCount} parameters match within tolerance`
        : `${matchedCount}/${deviations.length} match (${score}%). Issues: ${worstDeviations}`,
      reference_parsed: refParsed,
      prism_parsed: prismParsed,
    };
  }

  private compareDialect(ref: WireEDMProgram, prism: WireEDMProgram, out: ParameterDeviation[]): void {
    out.push({
      param: "dialect",
      reference_value: ref.dialect,
      prism_value: prism.dialect,
      deviation_pct: null,
      match: ref.dialect === prism.dialect || ref.dialect === "unknown" || prism.dialect === "unknown",
      notes: ref.dialect === prism.dialect ? "Dialect matches" : "Dialect mismatch — may cause post-processor issues",
    });
  }

  private comparePassCount(ref: WireEDMProgram, prism: WireEDMProgram, out: ParameterDeviation[]): void {
    const refCount = ref.passes.length;
    const prismCount = prism.passes.length;
    const match = refCount === prismCount;
    out.push({
      param: "pass_count",
      reference_value: refCount,
      prism_value: prismCount,
      deviation_pct: refCount > 0 ? Math.abs(prismCount - refCount) / refCount * 100 : null,
      match,
      notes: match ? "Pass count matches" : `Pass count differs: ${refCount} vs ${prismCount}`,
    });
  }

  private compareOffsets(ref: WireEDMProgram, prism: WireEDMProgram, out: ParameterDeviation[]): void {
    const refKeys = Object.keys(ref.offset_declarations);
    const prismKeys = Object.keys(prism.offset_declarations);

    for (const key of refKeys) {
      const refVal = ref.offset_declarations[parseInt(key, 10)];
      const prismVal = prism.offset_declarations[parseInt(key, 10)];
      if (prismVal === undefined) {
        out.push({
          param: `offset_H${key}`,
          reference_value: refVal,
          prism_value: null,
          deviation_pct: 100,
          match: false,
          notes: `Offset H${key} missing in PRISM output`,
        });
      } else {
        const devPct = refVal !== 0 ? Math.abs((prismVal - refVal) / refVal) * 100 : (prismVal === 0 ? 0 : 100);
        out.push({
          param: `offset_H${key}`,
          reference_value: refVal,
          prism_value: prismVal,
          deviation_pct: devPct,
          match: devPct <= WEDMProgramComparisonEngine.TOLERANCE_PCT,
          notes: devPct <= WEDMProgramComparisonEngine.TOLERANCE_PCT
            ? `Offset H${key} within ±${WEDMProgramComparisonEngine.TOLERANCE_PCT}%`
            : `Offset H${key} deviation ${devPct.toFixed(1)}%`,
        });
      }
    }
  }

  private compareFeeds(ref: WireEDMProgram, prism: WireEDMProgram, out: ParameterDeviation[]): void {
    const refFeeds = ref.passes.filter((p) => p.feed_rate !== null).map((p) => p.feed_rate!);
    const prismFeeds = prism.passes.filter((p) => p.feed_rate !== null).map((p) => p.feed_rate!);

    const minLen = Math.min(refFeeds.length, prismFeeds.length);
    for (let i = 0; i < minLen; i++) {
      const devPct = refFeeds[i] !== 0 ? Math.abs((prismFeeds[i] - refFeeds[i]) / refFeeds[i]) * 100 : 0;
      out.push({
        param: `feed_pass_${i + 1}`,
        reference_value: refFeeds[i],
        prism_value: prismFeeds[i],
        deviation_pct: devPct,
        match: devPct <= WEDMProgramComparisonEngine.TOLERANCE_PCT,
        notes: devPct <= WEDMProgramComparisonEngine.TOLERANCE_PCT
          ? `Feed rate pass ${i + 1} within tolerance`
          : `Feed rate pass ${i + 1} deviation ${devPct.toFixed(1)}%`,
      });
    }
  }

  private compareECodes(ref: WireEDMProgram, prism: WireEDMProgram, out: ParameterDeviation[]): void {
    const refECodes = ref.passes.filter((p) => p.e_code).map((p) => p.e_code!);
    const prismECodes = prism.passes.filter((p) => p.e_code).map((p) => p.e_code!);

    const refSet = new Set(refECodes);
    const prismSet = new Set(prismECodes);

    const missing = [...refSet].filter((e) => !prismSet.has(e));
    const extra = [...prismSet].filter((e) => !refSet.has(e));

    out.push({
      param: "e_code_coverage",
      reference_value: refECodes.join(","),
      prism_value: prismECodes.join(","),
      deviation_pct: refSet.size > 0 ? (missing.length / refSet.size) * 100 : 0,
      match: missing.length === 0,
      notes: missing.length === 0
        ? "All reference E-codes present"
        : `Missing E-codes: ${missing.join(", ")}`,
    });
  }

  private compareTaper(ref: WireEDMProgram, prism: WireEDMProgram, out: ParameterDeviation[]): void {
    out.push({
      param: "taper_enabled",
      reference_value: ref.hasTaper,
      prism_value: prism.hasTaper,
      deviation_pct: null,
      match: ref.hasTaper === prism.hasTaper,
      notes: ref.hasTaper === prism.hasTaper ? "Taper mode matches" : "Taper mode mismatch",
    });

    if (ref.taper.angle_deg !== null && prism.taper.angle_deg !== null) {
      const devPct = ref.taper.angle_deg !== 0
        ? Math.abs((prism.taper.angle_deg - ref.taper.angle_deg) / ref.taper.angle_deg) * 100
        : 0;
      out.push({
        param: "taper_angle",
        reference_value: ref.taper.angle_deg,
        prism_value: prism.taper.angle_deg,
        deviation_pct: devPct,
        match: devPct <= WEDMProgramComparisonEngine.TOLERANCE_PCT,
        notes: devPct <= WEDMProgramComparisonEngine.TOLERANCE_PCT
          ? "Taper angle within tolerance"
          : `Taper angle deviation ${devPct.toFixed(1)}%`,
      });
    }
  }

  private compareWireSettings(ref: WireEDMProgram, prism: WireEDMProgram, out: ParameterDeviation[]): void {
    out.push({
      param: "auto_thread",
      reference_value: ref.wire_settings.has_auto_thread,
      prism_value: prism.wire_settings.has_auto_thread,
      deviation_pct: null,
      match: ref.wire_settings.has_auto_thread === prism.wire_settings.has_auto_thread,
      notes: ref.wire_settings.has_auto_thread === prism.wire_settings.has_auto_thread
        ? "Auto-thread setting matches"
        : "Auto-thread mismatch — verify M20/M21",
    });
  }

  private compareSafety(ref: WireEDMProgram, prism: WireEDMProgram, out: ParameterDeviation[]): void {
    out.push({
      param: "has_program_end",
      reference_value: ref.safety.has_program_end,
      prism_value: prism.safety.has_program_end,
      deviation_pct: null,
      match: ref.safety.has_program_end === prism.safety.has_program_end || prism.safety.has_program_end,
      notes: prism.safety.has_program_end ? "Program end (M02/M30) present" : "MISSING program end — CRITICAL",
    });

    out.push({
      param: "has_wire_stop",
      reference_value: ref.safety.has_wire_stop,
      prism_value: prism.safety.has_wire_stop,
      deviation_pct: null,
      match: ref.safety.has_wire_stop === prism.safety.has_wire_stop || prism.safety.has_wire_stop,
      notes: prism.safety.has_wire_stop ? "Wire stop present" : "MISSING wire stop",
    });
  }
}

export const wedmProgramComparisonEngine = new WEDMProgramComparisonEngine();
