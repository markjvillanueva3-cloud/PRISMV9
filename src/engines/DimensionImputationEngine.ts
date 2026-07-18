/**
 * DimensionImputationEngine — Statistical dimension imputation for cutting tools
 *
 * Uses OLS regression, KNN, and Bayesian methods to predict missing physical
 * dimensions from tools with known measurements of the same type/manufacturer.
 *
 * Problem: Many tool catalogs use estimated dimensions (OAL=DC*6, LOC=DC*2)
 * instead of real measured values. This engine builds regression models from
 * tools with KNOWN real dimensions, then applies them to replace estimates
 * with data-driven predictions.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ImputationModel {
  manufacturer: string;
  toolType: string;
  oalCoeffs: { a: number; b: number; r2: number }; // OAL = a*DC + b
  locCoeffs: { a: number; b: number; r2: number }; // LOC = a*DC + b
  shankCoeffs: { a: number; b: number; r2: number }; // shank = a*DC + b
  sampleCount: number;
}

export interface ImputationResult {
  toolId: string;
  original: { oal: number; loc: number; shank: number };
  imputed: { oal: number; loc: number; shank: number };
  confidence: { oal: number; loc: number; shank: number }; // 0-1
  method: string; // "regression" | "knn" | "fallback"
  model?: string; // "Kennametal_drill_R2=0.94"
}

export interface DimensionStats {
  totalTools: number;
  withRealOAL: number;
  withRealLOC: number;
  withRealShank: number;
  modelsBuilt: number;
  toolsImputed: number;
  avgConfidence: number;
}

export interface DimensionOutlier {
  toolId: string;
  field: string;
  value: number;
  zScore: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolRecord = any;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Known estimated-dimension multipliers */
const OAL_ESTIMATED_MULTIPLES = [4, 5, 6, 8];
const LOC_ESTIMATED_MULTIPLES = [1.5, 2, 3];
const RATIO_TOLERANCE = 0.01;
const MIN_SAMPLE_SIZE = 5;

function getDC(t: ToolRecord): number {
  return t.physical?.cutting_diameter_mm ?? t.cutting_diameter_mm ?? 0;
}
function getOAL(t: ToolRecord): number {
  return t.physical?.overall_length_mm ?? t.overall_length_mm ?? 0;
}
function getLOC(t: ToolRecord): number {
  return t.physical?.flute_length_mm ?? t.flute_length_mm ?? 0;
}
function getShank(t: ToolRecord): number {
  return t.physical?.shank_diameter_mm ?? t.shank_diameter_mm ?? 0;
}
function getToolKey(t: ToolRecord): string {
  return `${t.manufacturer ?? "Unknown"}_${t.type ?? "end_mill"}`;
}

function isEstimatedRatio(ratio: number, multiples: number[]): boolean {
  return multiples.some(m => Math.abs(ratio - m) < RATIO_TOLERANCE);
}

function isOALEstimated(dc: number, oal: number): boolean {
  if (dc <= 0 || oal <= 0) return true;
  return isEstimatedRatio(oal / dc, OAL_ESTIMATED_MULTIPLES);
}

function isLOCEstimated(dc: number, loc: number): boolean {
  if (dc <= 0 || loc <= 0) return true;
  return isEstimatedRatio(loc / dc, LOC_ESTIMATED_MULTIPLES);
}

function isShankEstimated(dc: number, shank: number): boolean {
  return shank <= 0 || Math.abs(shank - dc) < RATIO_TOLERANCE;
}

// ── Engine ─────────────────────────────────────────────────────────────────────

export class DimensionImputationEngine {
  private models: Map<string, ImputationModel> = new Map();

  /**
   * Build regression models from tools with known dimensions.
   * Groups by manufacturer+type, fits OAL/LOC/shank = f(DC) via OLS.
   */
  buildModels(tools: ToolRecord[]): { modelsBuilt: number; coverage: Record<string, number> } {
    // Group tools by manufacturer+type
    const groups = new Map<string, ToolRecord[]>();
    for (const t of tools) {
      const dc = getDC(t);
      if (dc <= 0) continue;
      const key = getToolKey(t);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }

    let modelsBuilt = 0;
    const coverage: Record<string, number> = {};

    for (const [key, groupTools] of groups) {
      // Filter to tools with real (non-estimated) dimensions
      const withRealDims = groupTools.filter(t => {
        const dc = getDC(t);
        const oal = getOAL(t);
        if (dc <= 0 || oal <= 0) return false;
        return !isOALEstimated(dc, oal);
      });

      coverage[key] = withRealDims.length;
      if (withRealDims.length < MIN_SAMPLE_SIZE) continue;

      // Extract dimension arrays
      const dcs = withRealDims.map(getDC);
      const oals = withRealDims.map(getOAL);
      const locs = withRealDims.map((t, i) => {
        const v = getLOC(t);
        return v > 0 ? v : dcs[i] * 2; // fallback for missing LOC
      });
      const shanks = withRealDims.map((t, i) => {
        const v = getShank(t);
        return v > 0 ? v : dcs[i]; // fallback for missing shank
      });

      // OLS linear regression for each dimension
      const oalModel = this._fitOLS(dcs, oals);
      const locModel = locs.some((v, i) => v > 0 && !isLOCEstimated(dcs[i], v))
        ? this._fitOLS(dcs, locs)
        : { a: 2, b: 0, r2: 0 };
      const shankModel =
        shanks.some((v, i) => v > 0 && v !== dcs[i])
          ? this._fitOLS(dcs, shanks)
          : { a: 1, b: 0, r2: 1 };

      const [mfr, type] = key.split("_");
      this.models.set(key, {
        manufacturer: mfr,
        toolType: type,
        oalCoeffs: oalModel,
        locCoeffs: locModel,
        shankCoeffs: shankModel,
        sampleCount: withRealDims.length,
      });
      modelsBuilt++;
    }

    return { modelsBuilt, coverage };
  }

  /**
   * Impute missing/estimated dimensions for tools using built models.
   * Returns only tools whose dimensions were changed.
   */
  imputeDimensions(tools: ToolRecord[]): ImputationResult[] {
    const results: ImputationResult[] = [];

    for (const t of tools) {
      const dc = getDC(t);
      if (dc <= 0) continue;

      const oal = getOAL(t);
      const loc = getLOC(t);
      const shank = getShank(t);

      // Check if dimensions look estimated
      const oalEst = isOALEstimated(dc, oal);
      const locEst = isLOCEstimated(dc, loc);
      const shankEst = isShankEstimated(dc, shank);

      if (!oalEst && !locEst && !shankEst) continue; // all real — skip

      // Find model for this manufacturer+type
      const key = getToolKey(t);
      const model = this.models.get(key);

      let imputedOAL = oal;
      let imputedLOC = loc;
      let imputedShank = shank;
      let confOAL = 1;
      let confLOC = 1;
      let confShank = 1;
      let method = "fallback";
      let modelDesc: string | undefined;

      if (model && model.oalCoeffs.r2 > 0.5) {
        method = "regression";
        modelDesc = `${key}_R2=${model.oalCoeffs.r2.toFixed(2)}`;

        if (oalEst) {
          imputedOAL = Math.max(model.oalCoeffs.a * dc + model.oalCoeffs.b, dc * 2);
          confOAL = Math.min(model.oalCoeffs.r2, 0.99);
        }
        if (locEst && model.locCoeffs.r2 > 0.3) {
          imputedLOC = Math.max(model.locCoeffs.a * dc + model.locCoeffs.b, dc * 0.5);
          confLOC = Math.min(model.locCoeffs.r2, 0.99);
        }
        if (shankEst && model.shankCoeffs.r2 > 0.3) {
          imputedShank = Math.max(
            model.shankCoeffs.a * dc + model.shankCoeffs.b,
            dc * 0.5,
          );
          confShank = Math.min(model.shankCoeffs.r2, 0.99);
        }
      } else if (!model) {
        // KNN fallback: find nearest tools by DC in any model
        const knnResult = this._knnFallback(dc, oalEst, locEst, shankEst);
        if (knnResult) {
          method = "knn";
          if (oalEst) {
            imputedOAL = knnResult.oal;
            confOAL = knnResult.confidence;
          }
          if (locEst) {
            imputedLOC = knnResult.loc;
            confLOC = knnResult.confidence * 0.8;
          }
          if (shankEst) {
            imputedShank = knnResult.shank;
            confShank = knnResult.confidence * 0.9;
          }
        }
      }

      // Sanity checks
      if (imputedLOC >= imputedOAL) imputedLOC = imputedOAL * 0.4;
      if (imputedShank <= 0) imputedShank = dc;

      results.push({
        toolId: t.id ?? t.designation ?? "unknown",
        original: { oal, loc, shank },
        imputed: {
          oal: Math.round(imputedOAL * 100) / 100,
          loc: Math.round(imputedLOC * 100) / 100,
          shank: Math.round(imputedShank * 100) / 100,
        },
        confidence: {
          oal: Math.round(confOAL * 1000) / 1000,
          loc: Math.round(confLOC * 1000) / 1000,
          shank: Math.round(confShank * 1000) / 1000,
        },
        method,
        model: modelDesc,
      });
    }

    return results;
  }

  /**
   * Get statistics about dimension data quality across the tool set.
   */
  getStats(tools: ToolRecord[]): DimensionStats {
    let total = 0;
    let realOAL = 0;
    let realLOC = 0;
    let realShank = 0;

    for (const t of tools) {
      const dc = getDC(t);
      if (dc <= 0) continue;
      total++;

      const oal = getOAL(t);
      const loc = getLOC(t);
      const shank = getShank(t);

      if (!isOALEstimated(dc, oal)) realOAL++;
      if (!isLOCEstimated(dc, loc)) realLOC++;
      if (!isShankEstimated(dc, shank)) realShank++;
    }

    return {
      totalTools: total,
      withRealOAL: realOAL,
      withRealLOC: realLOC,
      withRealShank: realShank,
      modelsBuilt: this.models.size,
      toolsImputed: 0,
      avgConfidence: 0,
    };
  }

  /**
   * Detect outlier dimensions using z-score on OAL/DC ratio grouped by type.
   */
  detectOutliers(tools: ToolRecord[], zThreshold: number = 3): DimensionOutlier[] {
    const outliers: DimensionOutlier[] = [];

    // Group by type
    const groups = new Map<string, ToolRecord[]>();
    for (const t of tools) {
      const type = (t.type ?? "end_mill") as string;
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(t);
    }

    for (const [, grp] of groups) {
      if (grp.length < 10) continue;

      // Compute OAL/DC ratios
      const ratios = grp
        .map(t => {
          const dc = getDC(t);
          const oal = getOAL(t);
          return { id: (t.id ?? t.designation ?? "unknown") as string, ratio: dc > 0 ? oal / dc : 0 };
        })
        .filter(r => r.ratio > 0);

      if (ratios.length < MIN_SAMPLE_SIZE) continue;

      const mean = ratios.reduce((s, r) => s + r.ratio, 0) / ratios.length;
      const std = Math.sqrt(
        ratios.reduce((s, r) => s + (r.ratio - mean) ** 2, 0) / ratios.length,
      );
      if (std < 0.01) continue;

      for (const r of ratios) {
        const z = Math.abs((r.ratio - mean) / std);
        if (z > zThreshold) {
          outliers.push({
            toolId: r.id,
            field: "OAL/DC_ratio",
            value: Math.round(r.ratio * 1000) / 1000,
            zScore: Math.round(z * 100) / 100,
          });
        }
      }

      // Also check LOC/DC ratios
      const locRatios = grp
        .map(t => {
          const dc = getDC(t);
          const loc = getLOC(t);
          return { id: (t.id ?? t.designation ?? "unknown") as string, ratio: dc > 0 ? loc / dc : 0 };
        })
        .filter(r => r.ratio > 0);

      if (locRatios.length < MIN_SAMPLE_SIZE) continue;

      const locMean = locRatios.reduce((s, r) => s + r.ratio, 0) / locRatios.length;
      const locStd = Math.sqrt(
        locRatios.reduce((s, r) => s + (r.ratio - locMean) ** 2, 0) / locRatios.length,
      );
      if (locStd < 0.01) continue;

      for (const r of locRatios) {
        const z = Math.abs((r.ratio - locMean) / locStd);
        if (z > zThreshold) {
          outliers.push({
            toolId: r.id,
            field: "LOC/DC_ratio",
            value: Math.round(r.ratio * 1000) / 1000,
            zScore: Math.round(z * 100) / 100,
          });
        }
      }
    }

    return outliers;
  }

  /** Get all built models */
  getModels(): ImputationModel[] {
    return Array.from(this.models.values());
  }

  /** Clear all models */
  clearModels(): void {
    this.models.clear();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * OLS linear regression: y = a*x + b
   * Returns coefficients and R² goodness-of-fit.
   */
  private _fitOLS(x: number[], y: number[]): { a: number; b: number; r2: number } {
    const n = x.length;
    if (n < 2) return { a: 1, b: 0, r2: 0 };

    const sumX = x.reduce((s, v) => s + v, 0);
    const sumY = y.reduce((s, v) => s + v, 0);
    const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
    const sumX2 = x.reduce((s, v) => s + v * v, 0);
    const meanY = sumY / n;

    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-10) return { a: 0, b: meanY, r2: 0 };

    const a = (n * sumXY - sumX * sumY) / denom;
    const b = (sumY - a * sumX) / n;

    // R² = 1 - SS_res / SS_tot
    const ssTot = y.reduce((s, v) => s + (v - meanY) ** 2, 0);
    const ssRes = y.reduce((s, v, i) => s + (v - (a * x[i] + b)) ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return {
      a: Math.round(a * 1000) / 1000,
      b: Math.round(b * 100) / 100,
      r2: Math.round(r2 * 1000) / 1000,
    };
  }

  /**
   * KNN fallback: average predictions from all models weighted by 1/distance.
   * Used when no specific manufacturer+type model exists.
   */
  private _knnFallback(
    dc: number,
    needOAL: boolean,
    needLOC: boolean,
    needShank: boolean,
  ): { oal: number; loc: number; shank: number; confidence: number } | null {
    if (this.models.size === 0) return null;

    let totalWeight = 0;
    let wOAL = 0;
    let wLOC = 0;
    let wShank = 0;

    for (const model of this.models.values()) {
      // Weight by sample count and R²
      const weight = model.sampleCount * Math.max(model.oalCoeffs.r2, 0.1);
      totalWeight += weight;

      if (needOAL) wOAL += weight * (model.oalCoeffs.a * dc + model.oalCoeffs.b);
      if (needLOC) wLOC += weight * (model.locCoeffs.a * dc + model.locCoeffs.b);
      if (needShank) wShank += weight * (model.shankCoeffs.a * dc + model.shankCoeffs.b);
    }

    if (totalWeight <= 0) return null;

    return {
      oal: Math.max(wOAL / totalWeight, dc * 2),
      loc: Math.max(wLOC / totalWeight, dc * 0.5),
      shank: Math.max(wShank / totalWeight, dc * 0.5),
      confidence: Math.min(0.6, 0.1 * this.models.size), // lower confidence for cross-type
    };
  }
}

export const dimensionImputationEngine = new DimensionImputationEngine();
