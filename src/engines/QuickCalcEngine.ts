/**
 * QuickCalcEngine — Instant manufacturing calculations
 *
 * Provides the 10 most common CNC calculations as fast, pure functions.
 * No dispatcher overhead, no hook chain, no cadence side effects.
 * Designed for inline use in slash commands and quick lookups.
 *
 * Token savings: Avoids full dispatcher call chain for simple calcs.
 *
 * @version 1.0.0
 */

export interface RPMResult {
  rpm: number;
  formula: string;
}

export interface FeedResult {
  feed_ipm: number;
  feed_mmmin: number;
  formula: string;
}

export interface MRRResult {
  mrr_in3min: number;
  mrr_cm3min: number;
  formula: string;
}

export interface SurfaceSpeedResult {
  sfm: number;
  mmin: number;
}

export interface ChipLoadResult {
  chipload_in: number;
  chipload_mm: number;
}

export class QuickCalcEngine {

  /**
   * RPM from surface speed and diameter.
   * RPM = (SFM × 3.82) / D_inches  or  RPM = (Vc × 1000) / (π × D_mm)
   */
  rpm(surfaceSpeed: number, diameter: number, metric = false): RPMResult {
    if (metric) {
      const rpm = Math.round((surfaceSpeed * 1000) / (Math.PI * diameter));
      return { rpm, formula: `RPM = (${surfaceSpeed} × 1000) / (π × ${diameter}) = ${rpm}` };
    }
    const rpm = Math.round((surfaceSpeed * 3.8197) / diameter);
    return { rpm, formula: `RPM = (${surfaceSpeed} × 3.82) / ${diameter} = ${rpm}` };
  }

  /**
   * Feed rate from RPM, chip load, and number of flutes.
   * F = RPM × fz × z
   */
  feedRate(rpm: number, chipLoad: number, flutes: number, metric = false): FeedResult {
    const feed = rpm * chipLoad * flutes;
    return {
      feed_ipm: metric ? feed / 25.4 : feed,
      feed_mmmin: metric ? feed : feed * 25.4,
      formula: `F = ${rpm} × ${chipLoad} × ${flutes} = ${feed.toFixed(2)}`
    };
  }

  /**
   * Material removal rate.
   * MRR = WOC × DOC × Feed
   */
  mrr(woc: number, doc: number, feedRate: number, metric = false): MRRResult {
    const mrr = woc * doc * feedRate;
    return {
      mrr_in3min: metric ? mrr / 16387.064 : mrr,
      mrr_cm3min: metric ? mrr / 1000 : mrr * 16.387064,
      formula: `MRR = ${woc} × ${doc} × ${feedRate} = ${mrr.toFixed(2)}`
    };
  }

  /**
   * Surface speed from RPM and diameter.
   * SFM = (π × D × RPM) / 12  or  Vc = (π × D × RPM) / 1000
   */
  surfaceSpeed(rpm: number, diameter: number, metric = false): SurfaceSpeedResult {
    if (metric) {
      const mmin = (Math.PI * diameter * rpm) / 1000;
      return { sfm: mmin * 3.2808, mmin };
    }
    const sfm = (Math.PI * diameter * rpm) / 12;
    return { sfm, mmin: sfm / 3.2808 };
  }

  /**
   * Chip load from feed rate, RPM, and flutes.
   * fz = Feed / (RPM × z)
   */
  chipLoad(feedRate: number, rpm: number, flutes: number, metric = false): ChipLoadResult {
    const cl = feedRate / (rpm * flutes);
    return {
      chipload_in: metric ? cl / 25.4 : cl,
      chipload_mm: metric ? cl : cl * 25.4
    };
  }

  /**
   * Tap drill diameter for metric threads.
   * D_drill = D_major - pitch
   */
  tapDrill(majorDia: number, pitch: number): { drill_mm: number; drill_in: number } {
    const drill_mm = majorDia - pitch;
    return { drill_mm, drill_in: Math.round(drill_mm / 25.4 * 10000) / 10000 };
  }

  /**
   * Cutting time for a given distance and feed rate.
   * T = L / F
   */
  cuttingTime(distance: number, feedRate: number): { time_min: number; time_sec: number } {
    const time_min = distance / feedRate;
    return { time_min, time_sec: time_min * 60 };
  }

  /**
   * Scallop height for ball nose end mill.
   * h = R - sqrt(R² - (step/2)²)
   */
  scallopHeight(toolRadius: number, stepover: number): { height: number; formula: string } {
    const halfStep = stepover / 2;
    if (halfStep > toolRadius) return { height: toolRadius, formula: "stepover > diameter, full scallop" };
    const height = toolRadius - Math.sqrt(toolRadius * toolRadius - halfStep * halfStep);
    return {
      height: Math.round(height * 10000) / 10000,
      formula: `h = ${toolRadius} - √(${toolRadius}² - (${stepover}/2)²) = ${height.toFixed(4)}`
    };
  }

  /**
   * Thread pitch from TPI (threads per inch).
   */
  threadPitch(tpi: number): { pitch_mm: number; pitch_in: number } {
    const pitch_in = 1 / tpi;
    return { pitch_mm: pitch_in * 25.4, pitch_in };
  }

  /**
   * Power required for a cut (horsepower).
   * HP = MRR × unit_power_factor
   * Typical factors: Aluminum=0.25, Steel=1.0, Stainless=1.5, Ti=1.2, Cast Iron=0.7
   */
  cuttingPower(mrr_in3min: number, material: "aluminum" | "steel" | "stainless" | "titanium" | "cast_iron" | "custom", customFactor?: number): { hp: number; kw: number } {
    const factors: Record<string, number> = {
      aluminum: 0.25, steel: 1.0, stainless: 1.5, titanium: 1.2, cast_iron: 0.7
    };
    const factor = material === "custom" ? (customFactor || 1.0) : (factors[material] || 1.0);
    const hp = mrr_in3min * factor;
    return { hp: Math.round(hp * 100) / 100, kw: Math.round(hp * 0.7457 * 100) / 100 };
  }
}

export const quickCalcEngine = new QuickCalcEngine();
