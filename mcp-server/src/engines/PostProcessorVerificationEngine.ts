/**
 * PostProcessorVerificationEngine — Output G-code validation
 *
 * Controller grammar validation, travel limit verification,
 * feed/speed sanity checking, sequence validation,
 * backplot reconstruction and path deviation check.
 *
 * @module PostProcessorVerificationEngine
 */

export interface VerificationInput {
  gcode: string;
  controller?: string;
  machine_limits?: {
    max_rpm?: number;
    max_feed_mm_min?: number;
    work_volume?: { x: number; y: number; z: number };
  };
  tolerance_mm?: number;
}

export interface VerificationIssue {
  line: number;
  severity: "critical" | "warning" | "info";
  rule: string;
  message: string;
  fix?: string;
}

export interface BackplotPoint {
  x: number; y: number; z: number;
  type: "rapid" | "linear" | "arc";
}

export interface VerificationResult {
  valid: boolean;
  issues: VerificationIssue[];
  summary: {
    total_lines: number;
    cutting_lines: number;
    rapid_lines: number;
    tool_changes: number;
    unique_tools: number;
    max_rpm_found: number;
    max_feed_found: number;
  };
  grammar_ok: boolean;
  travel_ok: boolean;
  feed_speed_ok: boolean;
  sequence_ok: boolean;
  backplot?: BackplotPoint[];
}

class PostProcessorVerificationEngineImpl {

  /**
   * Run full verification suite on G-code output
   */
  verify(input: VerificationInput): VerificationResult {
    const lines = input.gcode.split(/\r?\n/);
    const issues: VerificationIssue[] = [];
    const backplot: BackplotPoint[] = [];

    let maxRpm = 0, maxFeed = 0;
    let cuttingLines = 0, rapidLines = 0, toolChanges = 0;
    const toolSet = new Set<number>();
    let currentX = 0, currentY = 0, currentZ = 0;
    let currentRpm = 0, currentFeed = 0;
    let currentTool = 0;
    let hasWorkOffset = false;
    let hasSafeStart = false;
    let lastMoveWasRapid = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("(") || line.startsWith(";") ||
          line === "%" || line.startsWith("O")) continue;

      const lineNum = i + 1;

      // ── Grammar checks ──

      // Check for Heidenhain format
      const isHeidenhain = line.startsWith("BEGIN PGM") ||
        line.startsWith("END PGM") || line.startsWith("TOOL CALL") ||
        line.startsWith("L ") || line.startsWith("CYCL ");

      if (!isHeidenhain) {
        // ISO format checks
        if (/G[0-9]/.test(line) && line.includes("G90") && line.includes("G17")) {
          hasSafeStart = true;
        }
        if (/G5[4-9]|G54\.1/.test(line)) hasWorkOffset = true;

        // Check for invalid G codes (basic)
        const gCodes = line.match(/G(\d+\.?\d*)/g);
        if (gCodes) {
          for (const gc of gCodes) {
            const num = parseFloat(gc.slice(1));
            if (num > 99 && num < 200 && ![100, 154, 187].includes(num)) {
              issues.push({
                line: lineNum, severity: "warning",
                rule: "GRAM-001", message: `Unusual G code: ${gc}`,
              });
            }
          }
        }
      }

      // ── Tool change tracking ──
      const toolMatch = line.match(/T(\d+)/);
      if (toolMatch) {
        const tn = parseInt(toolMatch[1]);
        if (tn !== currentTool) {
          toolChanges++;
          currentTool = tn;
          toolSet.add(tn);
        }
      }
      if (/M6\b/.test(line)) {
        // Tool change without T code on same line
        if (!toolMatch && currentTool === 0) {
          issues.push({
            line: lineNum, severity: "warning",
            rule: "SEQ-001", message: "M6 without preceding T code",
          });
        }
      }

      // ── Spindle tracking ──
      const sMatch = line.match(/S(\d+\.?\d*)/);
      if (sMatch) {
        currentRpm = parseFloat(sMatch[1]);
        maxRpm = Math.max(maxRpm, currentRpm);
        if (input.machine_limits?.max_rpm && currentRpm > input.machine_limits.max_rpm) {
          issues.push({
            line: lineNum, severity: "critical",
            rule: "LIMIT-001",
            message: `RPM ${currentRpm} exceeds machine max ${input.machine_limits.max_rpm}`,
            fix: `S${input.machine_limits.max_rpm}`,
          });
        }
      }

      // ── Feed tracking ──
      const fMatch = line.match(/F(\d+\.?\d*)/);
      if (fMatch) {
        currentFeed = parseFloat(fMatch[1]);
        maxFeed = Math.max(maxFeed, currentFeed);
        if (input.machine_limits?.max_feed_mm_min && currentFeed > input.machine_limits.max_feed_mm_min) {
          issues.push({
            line: lineNum, severity: "critical",
            rule: "LIMIT-002",
            message: `Feed ${currentFeed} exceeds machine max ${input.machine_limits.max_feed_mm_min}`,
            fix: `F${input.machine_limits.max_feed_mm_min}`,
          });
        }
        if (currentFeed <= 0) {
          issues.push({
            line: lineNum, severity: "critical",
            rule: "FEED-001", message: "Zero or negative feed rate",
          });
        }
      }

      // ── Move tracking + backplot ──
      const xMatch = line.match(/X(-?\d+\.?\d*)/);
      const yMatch = line.match(/Y(-?\d+\.?\d*)/);
      const zMatch = line.match(/Z(-?\d+\.?\d*)/);

      if (xMatch) currentX = parseFloat(xMatch[1]);
      if (yMatch) currentY = parseFloat(yMatch[1]);
      if (zMatch) currentZ = parseFloat(zMatch[1]);

      const isRapid = /G0\b|G00\b/.test(line) || (isHeidenhain && line.includes("FMAX"));
      const isCut = /G1\b|G01\b/.test(line) || /G2\b|G02\b|G3\b|G03\b/.test(line) ||
                    (isHeidenhain && /^L /.test(line) && !line.includes("FMAX"));

      if (isRapid) {
        rapidLines++;
        lastMoveWasRapid = true;
      }
      if (isCut) {
        cuttingLines++;
        // Check: cutting without spindle
        if (currentRpm === 0 && !isHeidenhain) {
          issues.push({
            line: lineNum, severity: "warning",
            rule: "SEQ-002", message: "Cutting move with no spindle running",
          });
        }
        // Check: cutting without feed
        if (currentFeed === 0 && !fMatch) {
          issues.push({
            line: lineNum, severity: "warning",
            rule: "SEQ-003", message: "Cutting move with no feed defined",
          });
        }
        lastMoveWasRapid = false;
      }

      // Backplot
      if (isRapid || isCut) {
        backplot.push({
          x: currentX, y: currentY, z: currentZ,
          type: isRapid ? "rapid" : /G[23]\b|G0[23]\b/.test(line) ? "arc" : "linear",
        });
      }

      // ── Travel limit check ──
      if (input.machine_limits?.work_volume) {
        const wv = input.machine_limits.work_volume;
        if (Math.abs(currentX) > wv.x / 2) {
          issues.push({
            line: lineNum, severity: "critical",
            rule: "TRAVEL-001",
            message: `X${currentX} outside work volume (±${wv.x / 2}mm)`,
          });
        }
        if (Math.abs(currentY) > wv.y / 2) {
          issues.push({
            line: lineNum, severity: "critical",
            rule: "TRAVEL-002",
            message: `Y${currentY} outside work volume (±${wv.y / 2}mm)`,
          });
        }
        if (currentZ < -wv.z || currentZ > wv.z) {
          issues.push({
            line: lineNum, severity: "critical",
            rule: "TRAVEL-003",
            message: `Z${currentZ} outside work volume (0 to -${wv.z}mm)`,
          });
        }
      }
    }

    // ── Sequence validation ──
    if (!hasSafeStart && !lines.some(l => l.includes("BEGIN PGM"))) {
      issues.push({
        line: 1, severity: "warning",
        rule: "SEQ-010", message: "No safe start block (G90 G17 G21) detected",
      });
    }

    const grammarOk = !issues.some(i => i.rule.startsWith("GRAM") && i.severity === "critical");
    const travelOk = !issues.some(i => i.rule.startsWith("TRAVEL"));
    const feedSpeedOk = !issues.some(i =>
      (i.rule.startsWith("LIMIT") || i.rule.startsWith("FEED")) && i.severity === "critical"
    );
    const sequenceOk = !issues.some(i => i.rule.startsWith("SEQ") && i.severity === "critical");

    return {
      valid: !issues.some(i => i.severity === "critical"),
      issues,
      summary: {
        total_lines: lines.length,
        cutting_lines: cuttingLines,
        rapid_lines: rapidLines,
        tool_changes: toolChanges,
        unique_tools: toolSet.size,
        max_rpm_found: maxRpm,
        max_feed_found: maxFeed,
      },
      grammar_ok: grammarOk,
      travel_ok: travelOk,
      feed_speed_ok: feedSpeedOk,
      sequence_ok: sequenceOk,
      backplot,
    };
  }

  /**
   * Reconstruct toolpath from G-code (backplot) and verify against original
   */
  backplotVerify(
    gcode: string,
    originalPoints: Array<{ x: number; y: number; z: number }>,
    tolerance_mm: number = 0.001
  ): { match: boolean; max_deviation_mm: number; deviations: Array<{ index: number; dev_mm: number }> } {
    const result = this.verify({ gcode });
    const bp = result.backplot ?? [];

    const deviations: Array<{ index: number; dev_mm: number }> = [];
    let maxDev = 0;

    const compareLen = Math.min(bp.length, originalPoints.length);
    for (let i = 0; i < compareLen; i++) {
      const dev = Math.sqrt(
        (bp[i].x - originalPoints[i].x) ** 2 +
        (bp[i].y - originalPoints[i].y) ** 2 +
        (bp[i].z - originalPoints[i].z) ** 2
      );
      if (dev > tolerance_mm) {
        deviations.push({ index: i, dev_mm: +dev.toFixed(6) });
      }
      maxDev = Math.max(maxDev, dev);
    }

    return {
      match: deviations.length === 0,
      max_deviation_mm: +maxDev.toFixed(6),
      deviations,
    };
  }
}

export const postProcessorVerificationEngine = new PostProcessorVerificationEngineImpl();
export { PostProcessorVerificationEngineImpl };
