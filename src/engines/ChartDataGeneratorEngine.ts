/**
 * ChartDataGeneratorEngine — Manufacturing Intelligence Layer
 *
 * Generates structured chart data for visualization:
 * - Pareto charts (80/20 analysis)
 * - Waterfall charts (cumulative cost/time breakdown)
 * - Control charts (X-bar, individuals, moving range + Nelson rules)
 * - Stability lobe charts (chatter envelope)
 * - Histogram charts (with spec limits + normal curve)
 *
 * Actions: chart_pareto, chart_waterfall, chart_control,
 *          chart_stability_lobe, chart_histogram
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ParetoChartInput {
  categories: Array<{ name: string; value: number }>;
}

export interface ParetoChartResult {
  bars: Array<{ name: string; value: number; cumulative_pct: number }>;
  line: Array<{ x: number; cumulative_pct: number }>;
  threshold_80_index: number;
}

export interface WaterfallChartInput {
  start: number;
  steps: Array<{ name: string; value: number }>;
}

export interface WaterfallChartResult {
  bars: Array<{
    name: string;
    start_y: number;
    end_y: number;
    value: number;
    type: "increase" | "decrease" | "total";
  }>;
}

export interface ControlChartInput {
  data: number[];
  subgroup_size?: number;
  chart_type?: "xbar" | "individuals" | "moving_range";
}

export interface NelsonViolation {
  rule: number;
  indices: number[];
}

export interface ControlChartResult {
  points: Array<{ index: number; value: number }>;
  center_line: number;
  ucl: number;
  lcl: number;
  out_of_control: number[];
  nelson_violations: NelsonViolation[];
}

export interface StabilityLobeChartInput {
  lobes: Array<{ rpm: number; depth_mm: number }>;
}

export interface StabilityLobeChartResult {
  curves: Array<{
    lobe_number: number;
    points: Array<{ rpm: number; depth: number }>;
  }>;
  envelope: Array<{ rpm: number; min_stable_depth: number }>;
}

export interface HistogramChartInput {
  data: number[];
  bins?: number;
  spec_limits?: { lsl?: number; usl?: number };
}

export interface HistogramChartResult {
  bars: Array<{
    bin_start: number;
    bin_end: number;
    count: number;
    in_spec: boolean;
  }>;
  mean: number;
  std_dev: number;
  normal_curve?: Array<{ x: number; y: number }>;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ChartDataGeneratorEngine {
  /**
   * Pareto chart — sorted descending with cumulative % line.
   * Marks the 80% threshold index.
   */
  paretoChart(input: ParetoChartInput): ParetoChartResult {
    const sorted = [...input.categories].sort((a, b) => b.value - a.value);
    const total = sorted.reduce((s, c) => s + c.value, 0);

    if (total === 0) {
      return { bars: [], line: [], threshold_80_index: -1 };
    }

    let cumulative = 0;
    let threshold_80_index = -1;
    const bars: ParetoChartResult["bars"] = [];
    const line: ParetoChartResult["line"] = [];

    for (let i = 0; i < sorted.length; i++) {
      cumulative += sorted[i].value;
      const cumulative_pct = Math.round((cumulative / total) * 10000) / 100;
      bars.push({
        name: sorted[i].name,
        value: sorted[i].value,
        cumulative_pct,
      });
      line.push({ x: i, cumulative_pct });
      if (threshold_80_index === -1 && cumulative_pct >= 80) {
        threshold_80_index = i;
      }
    }

    return { bars, line, threshold_80_index };
  }

  /**
   * Waterfall chart — shows cumulative effect of positive/negative steps.
   * Adds a "Total" bar at the end.
   */
  waterfallChart(input: WaterfallChartInput): WaterfallChartResult {
    const bars: WaterfallChartResult["bars"] = [];
    let running = input.start;

    // Starting bar
    bars.push({
      name: "Start",
      start_y: 0,
      end_y: input.start,
      value: input.start,
      type: "total",
    });

    for (const step of input.steps) {
      const start_y = running;
      running += step.value;
      bars.push({
        name: step.name,
        start_y: Math.round(start_y * 100) / 100,
        end_y: Math.round(running * 100) / 100,
        value: step.value,
        type: step.value >= 0 ? "increase" : "decrease",
      });
    }

    // Total bar
    bars.push({
      name: "Total",
      start_y: 0,
      end_y: Math.round(running * 100) / 100,
      value: Math.round(running * 100) / 100,
      type: "total",
    });

    return { bars };
  }

  /**
   * Control chart with Nelson rule violation detection.
   * Supports X-bar, individuals, and moving range chart types.
   *
   * Nelson Rules implemented:
   *  1: Point beyond 3σ
   *  2: 9 consecutive points on same side of CL
   *  3: 6 consecutive points steadily increasing or decreasing
   *  4: 14 consecutive points alternating up/down
   *  5: 2 of 3 consecutive points beyond 2σ (same side)
   *  6: 4 of 5 consecutive points beyond 1σ (same side)
   *  7: 15 consecutive points within 1σ (hugging)
   *  8: 8 consecutive points beyond 1σ (both sides, no points in zone C)
   */
  controlChart(input: ControlChartInput): ControlChartResult {
    const { data } = input;
    const chartType = input.chart_type ?? "individuals";
    const subgroupSize = input.subgroup_size ?? 5;

    if (data.length < 2) {
      return {
        points: data.map((v, i) => ({ index: i, value: v })),
        center_line: data[0] ?? 0,
        ucl: 0,
        lcl: 0,
        out_of_control: [],
        nelson_violations: [],
      };
    }

    let plotData: number[];
    let center_line: number;
    let sigma: number;

    if (chartType === "xbar") {
      // X-bar chart: compute subgroup means
      const numSG = Math.floor(data.length / subgroupSize);
      const sgMeans: number[] = [];
      const sgRanges: number[] = [];

      for (let i = 0; i < numSG; i++) {
        const sg = data.slice(i * subgroupSize, (i + 1) * subgroupSize);
        sgMeans.push(sg.reduce((s, v) => s + v, 0) / sg.length);
        sgRanges.push(Math.max(...sg) - Math.min(...sg));
      }

      const d2Table: Record<number, number> = {
        2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326,
        6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078,
      };
      const d2 = d2Table[Math.min(subgroupSize, 10)] ?? 2.326;
      const rBar = sgRanges.reduce((s, v) => s + v, 0) / sgRanges.length;

      plotData = sgMeans;
      center_line = sgMeans.reduce((s, v) => s + v, 0) / sgMeans.length;
      sigma = rBar / (d2 * Math.sqrt(subgroupSize));
    } else if (chartType === "moving_range") {
      // Moving range chart
      const mrs: number[] = [];
      for (let i = 1; i < data.length; i++) {
        mrs.push(Math.abs(data[i] - data[i - 1]));
      }
      plotData = mrs;
      center_line = mrs.reduce((s, v) => s + v, 0) / mrs.length;
      // D4 for n=2 = 3.267, D3 = 0
      sigma = center_line / 3.267 * 3; // UCL = D4 * MR_bar ≈ 3.267 * MR_bar
      // Actually for MR chart: UCL = D4 * MR_bar, sigma = UCL/3
      sigma = (3.267 * center_line) / 3;
    } else {
      // Individuals chart
      plotData = [...data];
      center_line = data.reduce((s, v) => s + v, 0) / data.length;
      // Estimate sigma from moving range
      const mrs: number[] = [];
      for (let i = 1; i < data.length; i++) {
        mrs.push(Math.abs(data[i] - data[i - 1]));
      }
      const mrBar = mrs.length > 0 ? mrs.reduce((s, v) => s + v, 0) / mrs.length : 0;
      sigma = mrBar / 1.128; // d2 for n=2
    }

    const ucl = Math.round((center_line + 3 * sigma) * 10000) / 10000;
    const lcl = Math.round((center_line - 3 * sigma) * 10000) / 10000;
    const cl = Math.round(center_line * 10000) / 10000;

    const points = plotData.map((v, i) => ({
      index: i,
      value: Math.round(v * 10000) / 10000,
    }));

    // Out of control: beyond UCL/LCL
    const out_of_control = plotData
      .map((v, i) => (v > center_line + 3 * sigma || v < center_line - 3 * sigma ? i : -1))
      .filter((i) => i >= 0);

    // Nelson rule detection
    const nelson_violations = this.detectNelsonRules(plotData, center_line, sigma);

    return { points, center_line: cl, ucl, lcl, out_of_control, nelson_violations };
  }

  /**
   * Stability lobe chart — groups lobe points into curves and computes envelope.
   */
  stabilityLobeChart(input: StabilityLobeChartInput): StabilityLobeChartResult {
    const { lobes } = input;
    if (lobes.length === 0) {
      return { curves: [], envelope: [] };
    }

    // Sort by RPM
    const sorted = [...lobes].sort((a, b) => a.rpm - b.rpm);

    // Detect lobe boundaries: significant depth jumps indicate new lobe
    const curves: StabilityLobeChartResult["curves"] = [];
    let currentCurve: Array<{ rpm: number; depth: number }> = [];
    let lobeNum = 0;

    for (let i = 0; i < sorted.length; i++) {
      const point = { rpm: sorted[i].rpm, depth: sorted[i].depth_mm };
      if (currentCurve.length > 0) {
        const prev = currentCurve[currentCurve.length - 1];
        const depthJump = Math.abs(point.depth - prev.depth);
        const avgDepth = (Math.abs(point.depth) + Math.abs(prev.depth)) / 2 || 1;
        // New lobe if depth jumps by >50% or RPM gap is large
        if (depthJump / avgDepth > 0.5 || point.rpm - prev.rpm > (sorted[sorted.length - 1].rpm - sorted[0].rpm) / 5) {
          curves.push({ lobe_number: lobeNum, points: currentCurve });
          currentCurve = [];
          lobeNum++;
        }
      }
      currentCurve.push(point);
    }
    if (currentCurve.length > 0) {
      curves.push({ lobe_number: lobeNum, points: currentCurve });
    }

    // Envelope: minimum stable depth at each RPM
    const rpmMap = new Map<number, number>();
    for (const lobe of sorted) {
      const existing = rpmMap.get(lobe.rpm);
      if (existing === undefined || lobe.depth_mm < existing) {
        rpmMap.set(lobe.rpm, lobe.depth_mm);
      }
    }

    const envelope = [...rpmMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rpm, depth]) => ({
        rpm,
        min_stable_depth: Math.round(depth * 1000) / 1000,
      }));

    return { curves, envelope };
  }

  /**
   * Histogram chart with optional spec limits and normal curve overlay.
   */
  histogramChart(input: HistogramChartInput): HistogramChartResult {
    const { data, spec_limits } = input;
    if (data.length === 0) {
      return { bars: [], mean: 0, std_dev: 0 };
    }

    const mean = data.reduce((s, v) => s + v, 0) / data.length;
    const ss = data.reduce((s, v) => s + (v - mean) ** 2, 0);
    const std_dev = data.length > 1 ? Math.sqrt(ss / (data.length - 1)) : 0;

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const numBins = input.bins ?? Math.max(Math.ceil(Math.log2(data.length) + 1), 5);
    const range = maxVal - minVal || 1;
    const binWidth = range / numBins;

    const bars: HistogramChartResult["bars"] = [];
    for (let i = 0; i < numBins; i++) {
      const bin_start = Math.round((minVal + i * binWidth) * 10000) / 10000;
      const bin_end = Math.round((minVal + (i + 1) * binWidth) * 10000) / 10000;
      const count = data.filter((v) =>
        i === numBins - 1 ? v >= bin_start && v <= bin_end : v >= bin_start && v < bin_end
      ).length;

      let in_spec = true;
      if (spec_limits) {
        const binCenter = (bin_start + bin_end) / 2;
        if (spec_limits.lsl !== undefined && binCenter < spec_limits.lsl) in_spec = false;
        if (spec_limits.usl !== undefined && binCenter > spec_limits.usl) in_spec = false;
      }

      bars.push({ bin_start, bin_end, count, in_spec });
    }

    // Normal curve overlay
    let normal_curve: Array<{ x: number; y: number }> | undefined;
    if (std_dev > 0) {
      normal_curve = [];
      const curvePoints = 50;
      const xMin = mean - 4 * std_dev;
      const xMax = mean + 4 * std_dev;
      const dx = (xMax - xMin) / curvePoints;
      const scale = data.length * binWidth; // scale to histogram counts

      for (let i = 0; i <= curvePoints; i++) {
        const x = xMin + i * dx;
        const z = (x - mean) / std_dev;
        const y = (scale / (std_dev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
        normal_curve.push({
          x: Math.round(x * 10000) / 10000,
          y: Math.round(y * 10000) / 10000,
        });
      }
    }

    return {
      bars,
      mean: Math.round(mean * 10000) / 10000,
      std_dev: Math.round(std_dev * 10000) / 10000,
      normal_curve,
    };
  }

  // ============================================================================
  // NELSON RULES (private)
  // ============================================================================

  private detectNelsonRules(data: number[], cl: number, sigma: number): NelsonViolation[] {
    const violations: NelsonViolation[] = [];
    const n = data.length;
    if (n < 2 || sigma <= 0) return violations;

    // Rule 1: Point beyond 3σ
    const r1Indices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (Math.abs(data[i] - cl) > 3 * sigma) r1Indices.push(i);
    }
    if (r1Indices.length > 0) violations.push({ rule: 1, indices: r1Indices });

    // Rule 2: 9 consecutive on same side of CL
    for (let i = 0; i <= n - 9; i++) {
      const allAbove = data.slice(i, i + 9).every((v) => v > cl);
      const allBelow = data.slice(i, i + 9).every((v) => v < cl);
      if (allAbove || allBelow) {
        const indices = Array.from({ length: 9 }, (_, j) => i + j);
        violations.push({ rule: 2, indices });
        break; // report first occurrence
      }
    }

    // Rule 3: 6 consecutive steadily increasing or decreasing
    for (let i = 0; i <= n - 6; i++) {
      let increasing = true;
      let decreasing = true;
      for (let j = 1; j < 6; j++) {
        if (data[i + j] <= data[i + j - 1]) increasing = false;
        if (data[i + j] >= data[i + j - 1]) decreasing = false;
      }
      if (increasing || decreasing) {
        violations.push({ rule: 3, indices: Array.from({ length: 6 }, (_, j) => i + j) });
        break;
      }
    }

    // Rule 4: 14 consecutive alternating up/down
    for (let i = 0; i <= n - 14; i++) {
      let alternating = true;
      for (let j = 1; j < 14; j++) {
        const prevDir = data[i + j - 1] > data[i + j - 2 >= 0 ? i + j - 2 : i + j - 1] ? 1 : -1;
        const currDir = data[i + j] > data[i + j - 1] ? 1 : -1;
        if (j >= 2 && prevDir === currDir) {
          alternating = false;
          break;
        }
      }
      if (alternating) {
        violations.push({ rule: 4, indices: Array.from({ length: 14 }, (_, j) => i + j) });
        break;
      }
    }

    // Rule 5: 2 of 3 consecutive beyond 2σ (same side)
    for (let i = 0; i <= n - 3; i++) {
      const pts = data.slice(i, i + 3);
      const above2 = pts.filter((v) => v > cl + 2 * sigma).length;
      const below2 = pts.filter((v) => v < cl - 2 * sigma).length;
      if (above2 >= 2 || below2 >= 2) {
        violations.push({ rule: 5, indices: [i, i + 1, i + 2] });
        break;
      }
    }

    // Rule 6: 4 of 5 consecutive beyond 1σ (same side)
    for (let i = 0; i <= n - 5; i++) {
      const pts = data.slice(i, i + 5);
      const above1 = pts.filter((v) => v > cl + sigma).length;
      const below1 = pts.filter((v) => v < cl - sigma).length;
      if (above1 >= 4 || below1 >= 4) {
        violations.push({ rule: 6, indices: Array.from({ length: 5 }, (_, j) => i + j) });
        break;
      }
    }

    // Rule 7: 15 consecutive within 1σ (hugging center line)
    for (let i = 0; i <= n - 15; i++) {
      const allWithin = data.slice(i, i + 15).every((v) => Math.abs(v - cl) < sigma);
      if (allWithin) {
        violations.push({ rule: 7, indices: Array.from({ length: 15 }, (_, j) => i + j) });
        break;
      }
    }

    // Rule 8: 8 consecutive beyond 1σ (either side, none in zone C)
    for (let i = 0; i <= n - 8; i++) {
      const allBeyond1 = data.slice(i, i + 8).every((v) => Math.abs(v - cl) > sigma);
      if (allBeyond1) {
        violations.push({ rule: 8, indices: Array.from({ length: 8 }, (_, j) => i + j) });
        break;
      }
    }

    return violations;
  }
}

// Singleton
export const chartDataGeneratorEngine = new ChartDataGeneratorEngine();
