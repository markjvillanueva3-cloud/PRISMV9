/**
 * StabilityRPMRewriterEngine — SLD-aware spindle speed optimizer for G-code
 *
 * Scans G-code for S (spindle speed) commands, cross-references with
 * stability lobe diagram data to find the nearest stable pocket, and
 * rewrites RPM values to avoid chatter while maximizing MRR.
 *
 * Uses: SpindleHarmonicsQualityEngine data, tooth-passing frequency model,
 * and optional machine-specific SLD measurements.
 *
 * Novel: Post-processing SLD optimization — no CAM software does this.
 *
 * @module StabilityRPMRewriterEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StabilityLobe {
  rpm: number;
  maxDoc_mm: number;  // Maximum stable depth of cut at this RPM
}

export interface SLDConfig {
  lobes: StabilityLobe[];              // SLD data points (sorted by RPM)
  toolFlutes: number;
  currentDoc_mm: number;               // Actual axial depth of cut
  rpmSearchRange?: number;             // ±% to search around current RPM. Default 20
  preferHigherRPM?: boolean;           // Default true — favor productivity
  minRPM?: number;                     // Machine minimum RPM
  maxRPM?: number;                     // Machine maximum RPM
  feedPerTooth_mm?: number;            // If provided, adjust F when RPM changes
}

export interface RPMRewriteResult {
  gcode: string;
  changes: RPMChange[];
  stats: {
    totalSCommands: number;
    rewrittenCount: number;
    avgRPMShift: number;
    chatterRisk: string;  // "none" | "low" | "medium" | "high"
  };
}

export interface RPMChange {
  lineNumber: number;
  original: string;
  rewritten: string;
  originalRPM: number;
  newRPM: number;
  reason: string;
  stableDoc_mm: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class StabilityRPMRewriterEngineImpl {

  /**
   * Rewrite spindle speeds in G-code to avoid chatter based on SLD data.
   */
  rewrite(gcode: string, config: SLDConfig): RPMRewriteResult {
    const lines = gcode.split("\n");
    const changes: RPMChange[] = [];
    const outputLines: string[] = [];

    const searchRange = config.rpmSearchRange ?? 20;
    const preferHigh = config.preferHigherRPM !== false;
    const minRPM = config.minRPM ?? 0;
    const maxRPM = config.maxRPM ?? 99999;

    let totalS = 0;
    let totalShift = 0;
    let modalFeed: number | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const lineNum = i + 1;

      // Track modal feed
      const fMatch = trimmed.match(/F(\d+\.?\d*)/i);
      if (fMatch) modalFeed = parseFloat(fMatch[1]);

      // Find S commands
      const sMatch = trimmed.match(/S(\d+)/i);
      if (!sMatch) {
        outputLines.push(line);
        continue;
      }

      totalS++;
      const currentRPM = parseInt(sMatch[1]);

      // Check if current RPM is stable
      const stableDoc = this._interpolateMaxDoc(config.lobes, currentRPM);
      if (stableDoc >= config.currentDoc_mm) {
        // Already stable
        outputLines.push(line);
        continue;
      }

      // Find nearest stable RPM
      const newRPM = this._findStableRPM(
        config.lobes, config.currentDoc_mm, currentRPM,
        searchRange, preferHigh, minRPM, maxRPM
      );

      if (newRPM == null || newRPM === currentRPM) {
        // No stable RPM found in range — add warning comment
        outputLines.push(line);
        changes.push({
          lineNumber: lineNum, original: trimmed,
          rewritten: trimmed, originalRPM: currentRPM, newRPM: currentRPM,
          reason: `WARNING: No stable RPM found within ±${searchRange}% of ${currentRPM}`,
          stableDoc_mm: stableDoc,
        });
        continue;
      }

      // Rewrite S value
      let rewritten = trimmed.replace(/S\d+/i, `S${newRPM}`);

      // Adjust feed if feedPerTooth provided
      if (config.feedPerTooth_mm && modalFeed != null) {
        const newFeed = Math.round(config.feedPerTooth_mm * config.toolFlutes * newRPM);
        rewritten = rewritten.replace(/F\d+\.?\d*/i, `F${newFeed}`);
        if (!rewritten.match(/F\d/i)) {
          rewritten += ` F${newFeed}`;
        }
      }

      outputLines.push(rewritten);
      totalShift += Math.abs(newRPM - currentRPM);
      changes.push({
        lineNumber: lineNum, original: trimmed, rewritten,
        originalRPM: currentRPM, newRPM,
        reason: `Shifted to stable pocket: ${currentRPM}→${newRPM} RPM (maxDoc=${this._interpolateMaxDoc(config.lobes, newRPM).toFixed(1)}mm at ${newRPM}RPM)`,
        stableDoc_mm: this._interpolateMaxDoc(config.lobes, newRPM),
      });
    }

    const rewrittenCount = changes.filter(c => c.newRPM !== c.originalRPM).length;
    const avgShift = rewrittenCount > 0 ? totalShift / rewrittenCount : 0;
    const riskLevel = this._assessChatterRisk(config, changes);

    return {
      gcode: outputLines.join("\n"),
      changes: changes.filter(c => c.newRPM !== c.originalRPM || c.reason.includes("WARNING")),
      stats: {
        totalSCommands: totalS,
        rewrittenCount,
        avgRPMShift: Math.round(avgShift),
        chatterRisk: riskLevel,
      },
    };
  }

  /**
   * Analyze G-code for chatter risk without modifying it.
   */
  analyzeChatterRisk(gcode: string, config: SLDConfig): {
    rpmValues: { rpm: number; lineNumber: number; stable: boolean; maxDoc: number }[];
    overallRisk: string;
    unstableCount: number;
  } {
    const lines = gcode.split("\n");
    const rpmValues: { rpm: number; lineNumber: number; stable: boolean; maxDoc: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const sMatch = lines[i].match(/S(\d+)/i);
      if (sMatch) {
        const rpm = parseInt(sMatch[1]);
        const maxDoc = this._interpolateMaxDoc(config.lobes, rpm);
        rpmValues.push({
          rpm, lineNumber: i + 1,
          stable: maxDoc >= config.currentDoc_mm,
          maxDoc,
        });
      }
    }

    const unstable = rpmValues.filter(r => !r.stable).length;
    const total = rpmValues.length;
    const risk = total === 0 ? "none"
      : unstable === 0 ? "none"
      : unstable / total < 0.25 ? "low"
      : unstable / total < 0.5 ? "medium"
      : "high";

    return { rpmValues, overallRisk: risk, unstableCount: unstable };
  }

  /**
   * Generate SLD data from analytical model (simplified single-DOF).
   * Returns lobe data usable by rewrite().
   */
  generateAnalyticalSLD(params: {
    naturalFrequency_Hz: number;
    dampingRatio: number;
    stiffness_Nmm: number;
    specificCuttingForce_Nmm2: number;
    toolFlutes: number;
    rpmMin: number;
    rpmMax: number;
    rpmStep?: number;
  }): StabilityLobe[] {
    const { naturalFrequency_Hz: fn, dampingRatio: zeta, stiffness_Nmm: k,
            specificCuttingForce_Nmm2: Kc, toolFlutes: N,
            rpmMin, rpmMax, rpmStep = 100 } = params;

    const lobes: StabilityLobe[] = [];

    for (let rpm = rpmMin; rpm <= rpmMax; rpm += rpmStep) {
      const fTooth = (rpm * N) / 60;  // tooth passing frequency
      const r = fTooth / fn;          // frequency ratio

      // SDOF transfer function magnitude
      const realG = (1 - r * r) / ((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
      const imagG = (-2 * zeta * r) / ((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
      const magG = Math.sqrt(realG ** 2 + imagG ** 2);

      // Stability limit (Altintas formulation)
      const blim = magG > 1e-10 ? -1 / (2 * Kc * N * magG / k) : 100;
      const maxDoc = Math.max(0.1, Math.abs(blim));

      lobes.push({ rpm, maxDoc_mm: Math.min(maxDoc, 50) }); // cap at 50mm
    }

    return lobes;
  }

  // -------------------------------------------------------------------------
  // Interpolation
  // -------------------------------------------------------------------------

  private _interpolateMaxDoc(lobes: StabilityLobe[], rpm: number): number {
    if (lobes.length === 0) return Infinity;
    if (lobes.length === 1) return lobes[0].maxDoc_mm;

    // Find bracketing lobes
    const sorted = [...lobes].sort((a, b) => a.rpm - b.rpm);
    if (rpm <= sorted[0].rpm) return sorted[0].maxDoc_mm;
    if (rpm >= sorted[sorted.length - 1].rpm) return sorted[sorted.length - 1].maxDoc_mm;

    for (let i = 0; i < sorted.length - 1; i++) {
      if (rpm >= sorted[i].rpm && rpm <= sorted[i + 1].rpm) {
        const t = (rpm - sorted[i].rpm) / (sorted[i + 1].rpm - sorted[i].rpm);
        return sorted[i].maxDoc_mm + t * (sorted[i + 1].maxDoc_mm - sorted[i].maxDoc_mm);
      }
    }
    return sorted[sorted.length - 1].maxDoc_mm;
  }

  private _findStableRPM(
    lobes: StabilityLobe[], doc: number, currentRPM: number,
    searchPercent: number, preferHigh: boolean, minRPM: number, maxRPM: number
  ): number | null {
    const low = Math.max(minRPM, Math.round(currentRPM * (1 - searchPercent / 100)));
    const high = Math.min(maxRPM, Math.round(currentRPM * (1 + searchPercent / 100)));

    let bestRPM: number | null = null;
    let bestScore = -Infinity;

    // Search in 50 RPM increments
    for (let rpm = low; rpm <= high; rpm += 50) {
      const maxDoc = this._interpolateMaxDoc(lobes, rpm);
      if (maxDoc >= doc) {
        // Stable at this RPM — score by proximity and direction preference
        const proximity = 1 - Math.abs(rpm - currentRPM) / (high - low + 1);
        const dirBonus = preferHigh && rpm >= currentRPM ? 0.2 : 0;
        const score = proximity + dirBonus + (maxDoc - doc) * 0.01; // Favor higher stability margin
        if (score > bestScore) {
          bestScore = score;
          bestRPM = rpm;
        }
      }
    }

    return bestRPM;
  }

  private _assessChatterRisk(config: SLDConfig, changes: RPMChange[]): string {
    if (changes.length === 0) return "none";
    const warnings = changes.filter(c => c.reason.includes("WARNING"));
    if (warnings.length > 0) return "high";
    const bigShifts = changes.filter(c => Math.abs(c.newRPM - c.originalRPM) > c.originalRPM * 0.1);
    if (bigShifts.length > changes.length * 0.5) return "medium";
    return "low";
  }
}

export const stabilityRPMRewriter = new StabilityRPMRewriterEngineImpl();
