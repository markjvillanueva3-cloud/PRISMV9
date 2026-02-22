/**
 * ResponseFormatterEngine.ts — R8-MS1 Persona-Adaptive Response Formatting
 * =========================================================================
 *
 * Takes raw calculation/intelligence results and formats them for three
 * manufacturing personas:
 *
 *   Dave (machinist) — Imperial-first, setup-sheet style, practical warnings
 *   Sarah (programmer) — Dual-unit, strategy tables, chatter analysis, controller notes
 *   Mike (manager) — Cost breakdown, ROI, outsource comparison, risk factors
 *
 * Unit preference system detects imperial/metric from query language and
 * shows primary + secondary in parentheses.
 *
 * @version 1.0.0 — R8-MS1
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type Persona = "machinist" | "programmer" | "manager" | "auto";
export type UnitSystem = "imperial" | "metric" | "auto";

export interface FormatOptions {
  persona: Persona;
  units?: UnitSystem;
  /** Override query for persona/unit detection (when persona="auto") */
  query?: string;
  /** Batch size for cost calculations (manager persona) */
  batch_size?: number;
  /** Machine hourly rate for cost (default $150/hr) */
  machine_rate_per_hr?: number;
  /** Tool cost per insert/set */
  tool_cost?: number;
  /** Programming hours for the job */
  programming_hours?: number;
  /** Setup time in minutes */
  setup_time_min?: number;
}

export interface FormattedResponse {
  persona: Persona;
  units: UnitSystem;
  formatted: string;
  /** Structured sections for programmatic access */
  sections: FormattedSection[];
}

export interface FormattedSection {
  id: string;
  label: string;
  content: string;
}

// ─── Unit Conversion Helpers ────────────────────────────────────────────────

const MM_PER_INCH = 25.4;
const M_PER_FT = 0.3048;

/** Check if query has any explicit unit indicators */
function hasUnitIndicators(query: string): boolean {
  if (!query) return false;
  return /\b(inch|inches|thou|sfm|ipm|ipt|fpm|psi|mm\b|m\/min|mm\/rev|μm|bar\b|mpa\b)\b/i.test(query);
}

/** Detect unit preference from query language */
function detectUnits(query: string): UnitSystem {
  if (!query) return "metric";
  const imperial = /\b(inch|inches|thou|sfm|ipm|ipt|fpm|psi)\b/i.test(query);
  const metric = /\b(mm\b|m\/min|mm\/rev|μm|bar\b|mpa\b)/i.test(query);
  if (imperial && !metric) return "imperial";
  if (metric && !imperial) return "metric";
  return "metric"; // default
}

/** Format length: primary (secondary) */
function fmtLen(mm: number | undefined, primary: UnitSystem): string {
  if (mm === undefined || mm === null || isNaN(mm)) return "N/A";
  if (primary === "imperial") {
    const inch = mm / MM_PER_INCH;
    return `${fmtNum(inch, 3)}" (${fmtNum(mm, 2)} mm)`;
  }
  const inch = mm / MM_PER_INCH;
  return `${fmtNum(mm, 2)} mm (${fmtNum(inch, 3)}")`;
}

/** Format cutting speed: m/min or SFM */
function fmtSpeed(mPerMin: number | undefined, primary: UnitSystem): string {
  if (mPerMin === undefined || mPerMin === null || isNaN(mPerMin)) return "N/A";
  const sfm = mPerMin / M_PER_FT;
  if (primary === "imperial") {
    return `${fmtNum(sfm, 0)} SFM (${fmtNum(mPerMin, 0)} m/min)`;
  }
  return `${fmtNum(mPerMin, 0)} m/min (${fmtNum(sfm, 0)} SFM)`;
}

/** Format feed: mm/tooth or IPT */
function fmtFeedTooth(mmTooth: number | undefined, primary: UnitSystem): string {
  if (mmTooth === undefined || mmTooth === null || isNaN(mmTooth)) return "N/A";
  const ipt = mmTooth / MM_PER_INCH;
  if (primary === "imperial") {
    return `${fmtNum(ipt, 4)} IPT (${fmtNum(mmTooth, 3)} mm/tooth)`;
  }
  return `${fmtNum(mmTooth, 3)} mm/tooth (${fmtNum(ipt, 4)} IPT)`;
}

/** Format feed rate: mm/min or IPM */
function fmtFeedRate(mmMin: number | undefined, primary: UnitSystem): string {
  if (mmMin === undefined || mmMin === null || isNaN(mmMin)) return "N/A";
  const ipm = mmMin / MM_PER_INCH;
  if (primary === "imperial") {
    return `${fmtNum(ipm, 1)} IPM (${fmtNum(mmMin, 0)} mm/min)`;
  }
  return `${fmtNum(mmMin, 0)} mm/min (${fmtNum(ipm, 1)} IPM)`;
}

/** Format RPM from Vc and diameter */
function calcRPM(vcMPerMin: number, diamMM: number): number {
  if (!vcMPerMin || !diamMM) return 0;
  return (vcMPerMin * 1000) / (Math.PI * diamMM);
}

/** Format a number to specified decimal places */
function fmtNum(val: number, decimals: number): string {
  if (isNaN(val)) return "N/A";
  return val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format time in minutes */
function fmtTime(min: number | undefined): string {
  if (min === undefined || min === null || isNaN(min)) return "N/A";
  if (min < 1) return `${fmtNum(min * 60, 0)} sec`;
  return `${fmtNum(min, 1)} min`;
}

/** Format force in N */
function fmtForce(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "N/A";
  const lbf = n * 0.2248;
  return `${fmtNum(n, 0)} N (${fmtNum(lbf, 0)} lbf)`;
}

/** Format temperature */
function fmtTemp(c: number | undefined): string {
  if (c === undefined || c === null || isNaN(c)) return "N/A";
  const f = c * 9 / 5 + 32;
  return `${fmtNum(c, 0)} °C (${fmtNum(f, 0)} °F)`;
}

/** Format surface roughness */
function fmtRa(ra: number | undefined, primary: UnitSystem): string {
  if (ra === undefined || ra === null || isNaN(ra)) return "N/A";
  const raInch = ra / 25.4; // μm to μin  (1 μm = ~39.37 μin)
  const raUin = ra * 39.37;
  if (primary === "imperial") {
    return `${fmtNum(raUin, 0)} μin (${fmtNum(ra, 2)} μm)`;
  }
  return `${fmtNum(ra, 2)} μm (${fmtNum(raUin, 0)} μin)`;
}

// ─── Persona Detection ──────────────────────────────────────────────────────

const PERSONA_PATTERNS = {
  machinist: {
    patterns: [/what speed/i, /what feed/i, /\brpm\b/i, /\bsfm\b/i, /\bipm\b/i,
      /chatter/i, /vibration/i, /squealing/i, /setup/i, /at the machine/i,
      /right now/i, /quick/i],
    weight: 1,
  },
  programmer: {
    patterns: [/strategy/i, /toolpath/i, /compare/i, /optimize/i, /cycle time/i,
      /g-?code/i, /\bcam\b/i, /fusion/i, /mastercam/i, /controller/i,
      /\bwhy\b/i, /tradeoff/i, /analysis/i, /\bvs\.?\b/i],
    weight: 1,
  },
  manager: {
    patterns: [/\bcost\b/i, /quote/i, /\brfq\b/i, /\bprice\b/i, /schedule/i,
      /utilization/i, /\broi\b/i, /\bbuy\b/i, /outsource/i, /capacity/i,
      /how many/i, /margin/i, /profit/i, /competitive/i, /batch/i, /volume/i],
    weight: 1,
  },
};

function detectPersona(query: string): Persona {
  if (!query) return "programmer"; // default
  const scores: Record<string, number> = { machinist: 0, programmer: 0, manager: 0 };
  for (const [persona, config] of Object.entries(PERSONA_PATTERNS)) {
    for (const p of config.patterns) {
      if (p.test(query)) scores[persona] += config.weight;
    }
  }
  // Query length heuristic: short = machinist, long/detailed = programmer
  if (query.length < 40) scores.machinist += 0.5;
  if (query.length > 120) scores.programmer += 0.5;

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (best[0][1] === 0) return "programmer"; // no matches → default
  return best[0][0] as Persona;
}

// ─── Extract Common Fields ──────────────────────────────────────────────────

interface CommonParams {
  material?: string;
  iso_group?: string;
  machine?: string;
  operation?: string;
  tool_type?: string;
  tool_diameter_mm?: number;
  flutes?: number;
  vc_m_min?: number;
  fz_mm?: number;
  ap_mm?: number;
  ae_mm?: number;
  feed_rate_mm_min?: number;
  rpm?: number;
  cutting_force_N?: number;
  tool_life_min?: number;
  cycle_time_min?: number;
  mrr_cm3_min?: number;
  ra_um?: number;
  rz_um?: number;
  deflection_mm?: number;
  temperature_C?: number;
  is_stable?: boolean;
  critical_depth_mm?: number;
  strategy?: string;
  coolant?: string;
  confidence?: number;
}

/** Extract common parameters from various result shapes */
function extractCommon(result: any): CommonParams {
  const p: CommonParams = {};
  if (!result || typeof result !== "object") return p;

  // Material
  p.material = result.material?.name ?? result.material;
  p.iso_group = result.material?.iso_group ?? result.iso_group;

  // Machine
  p.machine = result.machine?.name ?? result.machine;

  // Operation
  p.operation = result.operation ?? result.operations?.[0]?.type;

  // Tool
  p.tool_type = result.tool?.type ?? result.tool_type;
  p.tool_diameter_mm = result.tool?.diameter ?? result.tool_diameter_mm ?? result.diameter_mm;
  p.flutes = result.tool?.flutes ?? result.flutes ?? result.z;

  // Cutting parameters
  p.vc_m_min = result.cutting_speed ?? result.optimal_parameters?.cutting_speed
    ?? result.speed_feed?.vc ?? result.Vc ?? result.vc;
  p.fz_mm = result.feed_per_tooth ?? result.optimal_parameters?.feed_per_tooth
    ?? result.speed_feed?.fz ?? result.fz;
  p.ap_mm = result.axial_depth ?? result.optimal_parameters?.axial_depth
    ?? result.speed_feed?.ap ?? result.ap;
  p.ae_mm = result.radial_depth ?? result.optimal_parameters?.radial_depth
    ?? result.speed_feed?.ae ?? result.ae;

  // Derived
  if (p.vc_m_min && p.tool_diameter_mm) {
    p.rpm = calcRPM(p.vc_m_min, p.tool_diameter_mm);
  }
  if (p.fz_mm && p.rpm && p.flutes) {
    p.feed_rate_mm_min = p.fz_mm * p.flutes * p.rpm;
  }

  // Outcomes
  p.cutting_force_N = result.cutting_force_N ?? result.force_N
    ?? result.predicted_outcomes?.cutting_force_N;
  p.tool_life_min = result.tool_life_min ?? result.tool_life
    ?? result.predicted_outcomes?.tool_life;
  p.cycle_time_min = result.cycle_time?.total_min ?? result.total_time_min
    ?? result.cycle_time_min;
  p.mrr_cm3_min = result.mrr_cm3_min ?? result.mrr
    ?? result.predicted_outcomes?.mrr;
  p.ra_um = result.surface_finish?.Ra ?? result.Ra ?? result.ra_um;
  p.rz_um = result.surface_finish?.Rz ?? result.Rz;
  p.deflection_mm = result.deflection?.max_deflection_mm ?? result.deflection_mm;
  p.temperature_C = result.thermal?.max_temperature_C ?? result.temperature_C;
  p.is_stable = result.stability?.is_stable;
  p.critical_depth_mm = result.stability?.critical_depth_mm;
  p.strategy = result.strategy ?? result.recommended_strategy;
  p.coolant = result.coolant ?? result.coolant_type;
  p.confidence = result.confidence;

  return p;
}

// ─── Machinist (Dave) Formatter ─────────────────────────────────────────────

function formatMachinist(result: any, action: string, units: UnitSystem, opts: FormatOptions): FormattedResponse {
  const u = units === "auto" ? "imperial" : units; // Dave defaults imperial
  const p = extractCommon(result);
  const sections: FormattedSection[] = [];

  // Header
  const opLabel = (p.operation ?? action).replace(/_/g, " ").toUpperCase();
  const matLabel = p.material ?? "Unknown Material";
  const header = `SETUP SHEET - ${opLabel}, ${matLabel}`;
  const machineInfo = p.machine ? `Machine: ${p.machine}` : "";
  const toolInfo = p.tool_type
    ? `Tool: ${fmtLen(p.tool_diameter_mm, u).split(" ")[0]} ${p.flutes ?? "?"}-flute ${p.tool_type}`
    : "";
  const headerLine = [machineInfo, toolInfo].filter(Boolean).join(" | ");

  sections.push({ id: "header", label: "SETUP SHEET", content: `${header}\n${headerLine}` });

  // Cutting parameters
  if (p.vc_m_min || p.fz_mm || p.ap_mm) {
    const lines: string[] = [];
    if (p.rpm) lines.push(`Speed:   ${fmtNum(p.rpm, 0)} RPM (${fmtSpeed(p.vc_m_min, u).split(" (")[0]})`);
    if (p.feed_rate_mm_min) lines.push(`Feed:    ${fmtFeedRate(p.feed_rate_mm_min, u)}`);
    if (p.ap_mm) lines.push(`DOC:     ${fmtLen(p.ap_mm, u)}`);
    if (p.ae_mm) {
      const pct = p.tool_diameter_mm ? Math.round((p.ae_mm / p.tool_diameter_mm) * 100) : 0;
      lines.push(`WOC:     ${fmtLen(p.ae_mm, u)}${pct ? ` (${pct}% of diameter)` : ""}`);
    }
    if (p.strategy) lines.push(`Strategy: ${p.strategy}`);
    sections.push({ id: "params", label: "CUTTING PARAMETERS", content: lines.join("\n") });
  }

  // Coolant
  if (p.coolant || p.iso_group) {
    const coolantLine = p.coolant
      ? `Coolant: ${p.coolant}`
      : isSuperalloy(p.iso_group)
        ? "Coolant: Through-tool, HIGH PRESSURE (1000+ PSI if available)"
        : "Coolant: Flood recommended";
    sections.push({ id: "coolant", label: "COOLANT", content: coolantLine });
  }

  // Tool life & cycle time
  const outcomes: string[] = [];
  if (p.tool_life_min) outcomes.push(`Tool Life: ~${fmtTime(p.tool_life_min)} at these parameters`);
  if (p.cycle_time_min) outcomes.push(`Cycle Time: ~${fmtTime(p.cycle_time_min)} for this operation`);
  if (outcomes.length) sections.push({ id: "outcomes", label: "OUTCOMES", content: outcomes.join("\n") });

  // Practical notes
  const notes = generateMachinistNotes(p);
  if (notes.length) {
    sections.push({ id: "notes", label: "NOTES", content: notes.map(n => `* ${n}`).join("\n") });
  }

  const formatted = sections.map(s =>
    s.id === "header" ? s.content : `\n${s.label}:\n${s.content}`
  ).join("\n");

  return { persona: "machinist", units: u, formatted, sections };
}

function isSuperalloy(iso?: string): boolean {
  return iso === "S" || iso === "M";
}

function generateMachinistNotes(p: CommonParams): string[] {
  const notes: string[] = [];

  // Stability warning
  if (p.is_stable === false) {
    notes.push("CHATTER WARNING: Parameters are outside stability envelope. Reduce DOC or RPM.");
  } else if (p.is_stable === true && p.rpm) {
    notes.push(`Listen for chatter - if you hear it, drop to ${fmtNum(p.rpm * 0.88, 0)} RPM`);
  }

  // Material-specific
  if (p.iso_group === "S") {
    notes.push("Superalloy: work-hardens. Do NOT dwell or rub. Keep the tool moving.");
    if (p.tool_life_min) {
      notes.push(`Replace tool at ${fmtNum(p.tool_life_min, 0)} min regardless of appearance.`);
    }
  }
  if (p.iso_group === "M") {
    notes.push("Stainless: use sharp tools, avoid interrupted cuts where possible.");
  }
  if (p.iso_group === "H") {
    notes.push("Hardened material: use CBN or ceramic inserts. Minimize vibration.");
  }

  // Force warning
  if (p.cutting_force_N && p.cutting_force_N > 2000) {
    notes.push(`High cutting force (${fmtNum(p.cutting_force_N, 0)} N). Ensure workholding is adequate.`);
  }

  // Deflection warning
  if (p.deflection_mm && p.deflection_mm > 0.05) {
    notes.push(`Tool deflection ${fmtNum(p.deflection_mm, 3)} mm. Consider shorter tool or reduced DOC.`);
  }

  return notes;
}

// ─── Programmer (Sarah) Formatter ───────────────────────────────────────────

function formatProgrammer(result: any, action: string, units: UnitSystem, opts: FormatOptions): FormattedResponse {
  const u = units === "auto" ? "metric" : units; // Sarah defaults metric
  const p = extractCommon(result);
  const sections: FormattedSection[] = [];

  // Header
  const opLabel = (p.operation ?? action).replace(/_/g, " ").toUpperCase();
  const matLabel = p.material ?? "Unknown Material";
  const machineLabel = p.machine ?? "";
  const header = `JOB PLAN: ${opLabel} - ${matLabel}${machineLabel ? ` - ${machineLabel}` : ""}`;
  sections.push({ id: "header", label: "JOB PLAN", content: header });

  // Strategy analysis table (if we have enough data)
  if (p.strategy || p.cycle_time_min) {
    const stratLine = p.strategy
      ? `RECOMMENDED: ${p.strategy}${p.cycle_time_min ? ` (${fmtTime(p.cycle_time_min)} cycle)` : ""}`
      : "";
    sections.push({ id: "strategy", label: "STRATEGY ANALYSIS", content: stratLine });
  }

  // Cutting parameters (dual units)
  if (p.vc_m_min || p.fz_mm || p.ap_mm) {
    const lines: string[] = [];
    if (p.vc_m_min) lines.push(`Vc = ${fmtSpeed(p.vc_m_min, u)}`);
    if (p.fz_mm) lines.push(`fz = ${fmtFeedTooth(p.fz_mm, u)}`);
    if (p.ap_mm) lines.push(`ap = ${fmtLen(p.ap_mm, u)}`);
    if (p.ae_mm) {
      const pct = p.tool_diameter_mm ? Math.round((p.ae_mm / p.tool_diameter_mm) * 100) : 0;
      lines.push(`ae = ${fmtLen(p.ae_mm, u)}${pct ? ` | ${pct}% radial engagement` : ""}`);
    }
    if (p.rpm) lines.push(`N = ${fmtNum(p.rpm, 0)} RPM`);
    if (p.feed_rate_mm_min) lines.push(`Vf = ${fmtFeedRate(p.feed_rate_mm_min, u)}`);
    sections.push({ id: "params", label: "CUTTING PARAMETERS", content: lines.join(" | ") });
  }

  // Chatter / stability
  if (p.is_stable !== undefined) {
    const margin = p.critical_depth_mm && p.ap_mm
      ? fmtNum(p.critical_depth_mm / p.ap_mm, 2)
      : "N/A";
    const stable = p.is_stable ? "STABLE" : "UNSTABLE";
    const lines: string[] = [`Stability: ${stable} (margin: ${margin})`];
    if (!p.is_stable && p.rpm) {
      lines.push(`If borderline: RPM sweet spots at ${fmtNum(p.rpm * 0.88, 0)} and ${fmtNum(p.rpm * 1.15, 0)} RPM`);
    }
    sections.push({ id: "chatter", label: "CHATTER ANALYSIS", content: lines.join("\n") });
  }

  // Surface integrity
  if (p.ra_um || p.deflection_mm || p.temperature_C) {
    const lines: string[] = [];
    if (p.ra_um) lines.push(`Predicted Ra: ${fmtRa(p.ra_um, u)}`);
    if (p.rz_um) lines.push(`Predicted Rz: ${fmtRa(p.rz_um, u)}`);
    if (p.deflection_mm) lines.push(`Max deflection: ${fmtLen(p.deflection_mm, u)}`);
    if (p.temperature_C) lines.push(`Max temperature: ${fmtTemp(p.temperature_C)}`);
    sections.push({ id: "surface", label: "SURFACE INTEGRITY", content: lines.join("\n") });
  }

  // MRR
  if (p.mrr_cm3_min) {
    sections.push({
      id: "mrr",
      label: "MATERIAL REMOVAL RATE",
      content: `MRR = ${fmtNum(p.mrr_cm3_min, 2)} cm³/min (${fmtNum(p.mrr_cm3_min * 0.061, 2)} in³/min)`,
    });
  }

  // Force
  if (p.cutting_force_N) {
    sections.push({ id: "force", label: "CUTTING FORCE", content: `Fc = ${fmtForce(p.cutting_force_N)}` });
  }

  const formatted = sections.map(s =>
    s.id === "header" ? s.content : `\n${s.label}\n${s.content}`
  ).join("\n");

  return { persona: "programmer", units: u, formatted, sections };
}

// ─── Manager (Mike) Formatter ───────────────────────────────────────────────

function formatManager(result: any, action: string, units: UnitSystem, opts: FormatOptions): FormattedResponse {
  const u = units === "auto" ? "imperial" : units; // Mike defaults imperial
  const p = extractCommon(result);
  const sections: FormattedSection[] = [];

  // Header
  const opLabel = (p.operation ?? action).replace(/_/g, " ").toUpperCase();
  const matLabel = p.material ?? "Unknown Material";
  const machineLabel = p.machine ?? "";
  const header = `COST ANALYSIS: ${matLabel} ${opLabel}${machineLabel ? ` - ${machineLabel}` : ""}`;
  sections.push({ id: "header", label: "COST ANALYSIS", content: header });

  // Cost breakdown
  const rate = opts.machine_rate_per_hr ?? 150;
  const cycleMin = p.cycle_time_min ?? 0;
  const machineCost = (cycleMin / 60) * rate;
  const batch = opts.batch_size ?? 1;
  const toolCostPerInsert = opts.tool_cost ?? 0;
  const toolLifeMin = p.tool_life_min ?? 30;
  const partsPerTool = toolLifeMin > 0 && cycleMin > 0 ? toolLifeMin / cycleMin : 1;
  const toolCostPerPart = partsPerTool > 0 ? toolCostPerInsert / partsPerTool : 0;
  const progHours = opts.programming_hours ?? 0;
  const progCostPerPart = batch > 0 ? (progHours * rate) / batch : 0;
  const setupMin = opts.setup_time_min ?? 0;
  const setupCostPerPart = batch > 0 ? ((setupMin / 60) * rate) / batch : 0;
  const totalPerPart = machineCost + toolCostPerPart + progCostPerPart + setupCostPerPart;

  const costLines: string[] = [];
  costLines.push("Per-Part Cost Breakdown");
  if (cycleMin > 0) costLines.push(`  Machine time: ${fmtTime(cycleMin)} x $${fmtNum(rate, 0)}/hr = $${fmtNum(machineCost, 2)}`);
  if (toolCostPerInsert > 0) costLines.push(`  Tool cost: 1 set per ${fmtNum(partsPerTool, 1)} parts = $${fmtNum(toolCostPerPart, 2)}/part`);
  if (progHours > 0) costLines.push(`  Programming: ${fmtNum(progHours, 1)} hrs / batch of ${batch} = $${fmtNum(progCostPerPart, 2)}/part`);
  if (setupMin > 0) costLines.push(`  Setup: ${fmtTime(setupMin)} / batch of ${batch} = $${fmtNum(setupCostPerPart, 2)}/part`);
  if (totalPerPart > 0) {
    costLines.push(`  ------------------------------------`);
    costLines.push(`  TOTAL: $${fmtNum(totalPerPart, 2)}/part (at ${batch} quantity)`);
    if (batch > 1) {
      const bigBatch = batch * 4;
      const bigProgCost = (progHours * rate) / bigBatch;
      const bigSetupCost = ((setupMin / 60) * rate) / bigBatch;
      const bigTotal = machineCost + toolCostPerPart + bigProgCost + bigSetupCost;
      costLines.push(`  TOTAL: $${fmtNum(bigTotal, 2)}/part (at ${bigBatch} quantity - amortized programming)`);
    }
  }
  sections.push({ id: "cost", label: "COST BREAKDOWN", content: costLines.join("\n") });

  // Quote recommendation
  if (totalPerPart > 0) {
    const low = totalPerPart * 1.25;
    const high = totalPerPart * 1.35;
    sections.push({
      id: "quote",
      label: "QUOTE RECOMMENDATION",
      content: `Quote: $${fmtNum(low, 0)}-$${fmtNum(high, 0)}/part (25-35% margin)`,
    });
  }

  // Cycle time / throughput
  if (cycleMin > 0) {
    const partsPerHr = 60 / cycleMin;
    const lines = [
      `Cycle Time: ${fmtTime(cycleMin)}`,
      `Throughput: ${fmtNum(partsPerHr, 1)} parts/hr`,
    ];
    if (batch > 1) {
      lines.push(`Batch of ${batch}: ${fmtTime(cycleMin * batch + setupMin)} total`);
    }
    sections.push({ id: "throughput", label: "THROUGHPUT", content: lines.join("\n") });
  }

  // Risk factors
  const risks = generateManagerRisks(p, opts);
  if (risks.length) {
    sections.push({ id: "risks", label: "RISK FACTORS", content: risks.join("\n") });
  }

  // Key metrics summary
  if (p.tool_life_min || p.mrr_cm3_min) {
    const metrics: string[] = [];
    if (p.tool_life_min) metrics.push(`Tool Life: ${fmtTime(p.tool_life_min)}`);
    if (p.mrr_cm3_min) metrics.push(`MRR: ${fmtNum(p.mrr_cm3_min, 1)} cm³/min`);
    if (p.cutting_force_N) metrics.push(`Force: ${fmtNum(p.cutting_force_N, 0)} N`);
    sections.push({ id: "metrics", label: "KEY METRICS", content: metrics.join(" | ") });
  }

  const formatted = sections.map(s =>
    s.id === "header" ? s.content : `\n${s.label}\n${s.content}`
  ).join("\n");

  return { persona: "manager", units: u, formatted, sections };
}

function generateManagerRisks(p: CommonParams, opts: FormatOptions): string[] {
  const risks: string[] = [];

  if (p.iso_group === "S" || p.iso_group === "M") {
    risks.push("* Difficult material - budget 5% scrap rate for first batch");
  }
  if (p.is_stable === false) {
    risks.push("* Stability concern - may need parameter adjustment, adding setup time");
  }
  if (p.tool_life_min && p.tool_life_min < 15) {
    risks.push("* Short tool life - high tooling cost, frequent tool changes add cycle time");
  }
  if (p.deflection_mm && p.deflection_mm > 0.05) {
    risks.push("* Deflection risk - may need finish pass or shorter tools, adding cost");
  }
  if (p.confidence !== undefined && p.confidence < 0.7) {
    risks.push("* Low prediction confidence - recommend trial run before quoting");
  }

  return risks;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Format a calculation/intelligence result for a specific persona.
 *
 * @param result Raw engine result (from any PRISM calculation/intelligence action)
 * @param action The action name (e.g., "job_plan", "speed_feed", "quality_predict")
 * @param options Formatting options (persona, units, cost params)
 * @returns Persona-formatted response with structured sections
 */
export function formatForPersona(
  result: any,
  action: string,
  options: FormatOptions,
): FormattedResponse {
  const persona = options.persona === "auto"
    ? detectPersona(options.query ?? "")
    : options.persona;

  let units = options.units === "auto" || options.units === undefined
    ? detectUnits(options.query ?? "")
    : options.units;

  // If unit detection found no indicators (defaulted to metric),
  // use persona-appropriate default: machinist/manager → imperial, programmer → metric
  if ((options.units === "auto" || options.units === undefined) && !hasUnitIndicators(options.query ?? "")) {
    if (persona === "machinist" || persona === "manager") units = "imperial";
    // programmer stays metric (default)
  }

  switch (persona) {
    case "machinist":
      return formatMachinist(result, action, units, options);
    case "programmer":
      return formatProgrammer(result, action, units, options);
    case "manager":
      return formatManager(result, action, units, options);
    default:
      return formatProgrammer(result, action, units, options);
  }
}

/**
 * Detect persona from query text.
 * Exported for use by IntentDecompositionEngine and other callers.
 */
export { detectPersona, detectUnits };

/**
 * Dispatcher entry point for intelligenceDispatcher routing.
 */
export function responseFormatter(action: string, params: Record<string, any>): any {
  if (action !== "format_response") {
    throw new Error(`ResponseFormatterEngine: unknown action "${action}"`);
  }

  const { result: rawResult, source_action, persona, units, query,
    batch_size, machine_rate_per_hr, tool_cost,
    programming_hours, setup_time_min } = params;

  if (!rawResult) {
    throw new Error("ResponseFormatterEngine: 'result' parameter is required");
  }

  const formatted = formatForPersona(rawResult, source_action ?? "unknown", {
    persona: persona ?? "auto",
    units: units ?? "auto",
    query,
    batch_size,
    machine_rate_per_hr,
    tool_cost,
    programming_hours,
    setup_time_min,
  });

  return {
    persona: formatted.persona,
    units: formatted.units,
    formatted_text: formatted.formatted,
    sections: formatted.sections,
    section_count: formatted.sections.length,
  };
}
