/**
 * QuotingEngine — R14-MS2
 *
 * SAFETY CLASSIFICATION: STANDARD (financial, not physical safety)
 *
 * Cost estimation and quoting product composing:
 *   - Speed/feed calculation (Vc → RPM, fz → feed rate)
 *   - Taylor tool life model (T = (C/Vc)^(1/n))
 *   - Multi-pass strategy (roughing + finishing passes)
 *   - Cost rollup (machine + tool + material + setup + overhead)
 *
 * MCP actions:
 *   quote_job       — Full job quote with cost breakdown
 *   quote_compare   — Compare quotes across materials/machines/strategies
 *   quote_batch     — Batch economics (setup amortization, optimal batch size)
 *   quote_breakdown — Detailed cost breakdown for a single operation
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QuoteInput {
  material: string;
  operations?: Array<{
    type: string;
    diameter?: number;
    depth?: number;
    width?: number;
    length?: number;
    tolerance?: number;
    toolDiameter?: number;
    flutes?: number;
    toolCost?: number;
  }>;
  batchSize?: number;
  shopRate?: number;       // $/hr (default 85)
  setupTime?: number;      // minutes (default 30)
  machine?: string;
  overheadPct?: number;    // % of direct costs (default 20)
  // Material property overrides
  kc1_1?: number;          // Kienzle specific cutting force
  mc?: number;             // Kienzle exponent
  taylorC?: number;        // Taylor constant
  taylorN?: number;        // Taylor exponent
  vcRough?: number;        // Roughing cutting speed m/min
  vcFinish?: number;       // Finishing cutting speed m/min
  fzRough?: number;        // Roughing feed per tooth mm
  fzFinish?: number;       // Finishing feed per tooth mm
}

export interface CostBreakdown {
  machineCost: number;
  toolCost: number;
  materialCost: number;
  setupCost: number;
  overheadCost: number;
  totalPerPart: number;
  totalBatch: number;
}

export interface OperationCost {
  name: string;
  time: number;       // minutes
  cost: number;       // $
  tool: string;
  toolLife: number;    // minutes
  partsPerEdge: number;
}

export interface QuoteResult {
  quote: {
    perPart: number;
    perBatch: number;
    batchSize: number;
    currency: string;
  };
  breakdown: CostBreakdown;
  operations: OperationCost[];
  alternatives?: Array<{
    description: string;
    saving: number;
    tradeoff: string;
  }>;
  confidence: number;
}

// ─── Material Defaults ──────────────────────────────────────────────────────

interface MaterialDefaults {
  kc1_1: number; mc: number; taylorC: number; taylorN: number;
  vcRough: number; vcFinish: number; fzRough: number; fzFinish: number;
  densityGCm3: number; costPerKg: number;
}

const MATERIAL_DEFAULTS: Record<string, MaterialDefaults> = {
  steel:     { kc1_1: 1800, mc: 0.25, taylorC: 250, taylorN: 0.25, vcRough: 150, vcFinish: 200, fzRough: 0.12, fzFinish: 0.06, densityGCm3: 7.85, costPerKg: 1.20 },
  aluminum:  { kc1_1: 700,  mc: 0.23, taylorC: 600, taylorN: 0.28, vcRough: 400, vcFinish: 500, fzRough: 0.15, fzFinish: 0.08, densityGCm3: 2.70, costPerKg: 3.50 },
  stainless: { kc1_1: 2200, mc: 0.22, taylorC: 180, taylorN: 0.22, vcRough: 100, vcFinish: 140, fzRough: 0.10, fzFinish: 0.05, densityGCm3: 8.00, costPerKg: 4.00 },
  titanium:  { kc1_1: 1500, mc: 0.21, taylorC: 80,  taylorN: 0.20, vcRough: 50,  vcFinish: 70,  fzRough: 0.08, fzFinish: 0.04, densityGCm3: 4.50, costPerKg: 25.0 },
  cast_iron: { kc1_1: 1100, mc: 0.26, taylorC: 300, taylorN: 0.27, vcRough: 120, vcFinish: 160, fzRough: 0.14, fzFinish: 0.07, densityGCm3: 7.20, costPerKg: 0.80 },
  brass:     { kc1_1: 600,  mc: 0.20, taylorC: 500, taylorN: 0.30, vcRough: 300, vcFinish: 400, fzRough: 0.15, fzFinish: 0.08, densityGCm3: 8.50, costPerKg: 6.00 },
  inconel:   { kc1_1: 2800, mc: 0.20, taylorC: 40,  taylorN: 0.18, vcRough: 25,  vcFinish: 35,  fzRough: 0.06, fzFinish: 0.03, densityGCm3: 8.20, costPerKg: 40.0 },
};

function getMaterialDefaults(material: string): MaterialDefaults {
  const m = material.toLowerCase();
  for (const [key, def] of Object.entries(MATERIAL_DEFAULTS)) {
    if (m.includes(key) || key.includes(m)) return def;
  }
  if (m.includes("alloy") || m.includes("4140") || m.includes("1045") || m.includes("4340")) return MATERIAL_DEFAULTS.steel;
  if (m.includes("6061") || m.includes("7075") || m.includes("2024")) return MATERIAL_DEFAULTS.aluminum;
  if (m.includes("304") || m.includes("316") || m.includes("17-4")) return MATERIAL_DEFAULTS.stainless;
  if (m.includes("ti-6") || m.includes("grade 5")) return MATERIAL_DEFAULTS.titanium;
  if (m.includes("718") || m.includes("625")) return MATERIAL_DEFAULTS.inconel;
  return MATERIAL_DEFAULTS.steel; // safe default
}

// ─── Operation Defaults ─────────────────────────────────────────────────────

interface OpDefaults {
  toolDiam: number; flutes: number; toolCost: number;
  cuttingLength: number; depth: number; width: number;
  isRoughing: boolean; passes: number;
}

function getOpDefaults(op: { type: string; diameter?: number; depth?: number; width?: number; length?: number; toolDiameter?: number; flutes?: number; toolCost?: number }): OpDefaults {
  const t = op.type.toLowerCase();
  const toolDiam = op.toolDiameter ?? op.diameter ?? 12;
  const flutes = op.flutes ?? (t.includes("drill") || t.includes("tap") ? 2 : 4);
  const toolCost = op.toolCost ?? (toolDiam > 20 ? 80 : toolDiam > 10 ? 45 : 25);
  const length = op.length ?? 100;
  const depth = op.depth ?? (t.includes("drill") ? 20 : t.includes("face") ? 1.5 : 5);
  const width = op.width ?? (t.includes("slot") ? toolDiam : t.includes("face") ? toolDiam * 3 : toolDiam * 0.5);
  const isRoughing = t.includes("rough") || t.includes("drill") || t.includes("slot") || t.includes("pocket");
  const passes = t.includes("drill") ? 1 : t.includes("face") ? 1 : Math.ceil(depth / (toolDiam * (isRoughing ? 1.0 : 0.2)));

  return { toolDiam, flutes, toolCost, cuttingLength: length, depth, width, isRoughing, passes };
}

// ─── Core Calculations ──────────────────────────────────────────────────────

function round2(n: number): number { return Math.round(n * 100) / 100; }

function calcOperationCost(
  op: { type: string; diameter?: number; depth?: number; width?: number; length?: number; toolDiameter?: number; flutes?: number; toolCost?: number },
  mat: MaterialDefaults,
  input: QuoteInput,
  shopRate: number,
): OperationCost {
  const d = getOpDefaults(op);
  const vc = d.isRoughing ? (input.vcRough ?? mat.vcRough) : (input.vcFinish ?? mat.vcFinish);
  const fz = d.isRoughing ? (input.fzRough ?? mat.fzRough) : (input.fzFinish ?? mat.fzFinish);
  const rpm = Math.min(Math.round((vc * 1000) / (Math.PI * d.toolDiam)), 15000);
  const feedRate = rpm * d.flutes * fz;

  // Cycle time: cutting + rapid retract
  const cuttingTime = d.passes * (d.cuttingLength / Math.max(feedRate, 1)); // minutes
  const rapidTime = d.passes * 0.05; // minutes per retract
  const cycleTime = cuttingTime + rapidTime;

  // Taylor tool life: T = (C/Vc)^(1/n)
  const tayC = input.taylorC ?? mat.taylorC;
  const tayN = input.taylorN ?? mat.taylorN;
  const toolLife = Math.max(1, Math.min(480, Math.pow(tayC / Math.max(vc, 1), 1 / Math.max(tayN, 0.01))));
  const partsPerEdge = Math.max(1, Math.floor(toolLife / Math.max(cycleTime, 0.01)));

  // Cost
  const machineCost = (cycleTime / 60) * shopRate;
  const toolingCost = d.toolCost / partsPerEdge;
  const cost = round2(machineCost + toolingCost);

  return {
    name: op.type,
    time: round2(cycleTime),
    cost,
    tool: `D${d.toolDiam} ${d.flutes}FL`,
    toolLife: round2(toolLife),
    partsPerEdge,
  };
}

// ─── Engine Implementation ──────────────────────────────────────────────────

class QuotingEngineImpl {

  /** Full job quote with cost breakdown. */
  quoteJob(input: QuoteInput): QuoteResult {
    if (!input || !input.material) {
      return {
        quote: { perPart: 0, perBatch: 0, batchSize: 1, currency: "USD" },
        breakdown: { machineCost: 0, toolCost: 0, materialCost: 0, setupCost: 0, overheadCost: 0, totalPerPart: 0, totalBatch: 0 },
        operations: [],
        confidence: 0,
      };
    }

    const mat = getMaterialDefaults(input.material);
    const shopRate = input.shopRate ?? 85;
    const batchSize = input.batchSize ?? 1;
    const setupTime = input.setupTime ?? 30;
    const overheadPct = input.overheadPct ?? 20;

    // Default operations if none provided
    const ops = input.operations?.length
      ? input.operations
      : [{ type: "facing", depth: 1, length: 100 }, { type: "roughing", depth: 5, length: 100 }, { type: "finishing", depth: 0.3, length: 100 }];

    // Calculate each operation
    const opCosts: OperationCost[] = ops.map((op) => calcOperationCost(op, mat, input, shopRate));

    // Aggregate
    const totalMachineTime = opCosts.reduce((s, o) => s + o.time, 0);
    const machineCost = round2((totalMachineTime / 60) * shopRate);
    const toolCost = round2(opCosts.reduce((s, o) => {
      const d = getOpDefaults(ops[opCosts.indexOf(o)]);
      return s + d.toolCost / o.partsPerEdge;
    }, 0));

    // Material cost estimate (rough: bounding box volume × density × $/kg)
    const maxLen = Math.max(...ops.map((o) => o.length ?? 100));
    const maxWidth = Math.max(...ops.map((o) => o.width ?? 50));
    const maxDepth = Math.max(...ops.map((o) => o.depth ?? 10));
    const volumeCm3 = (maxLen / 10) * (maxWidth / 10) * ((maxDepth + 10) / 10); // with stock allowance
    const materialCost = round2(volumeCm3 * mat.densityGCm3 / 1000 * mat.costPerKg);

    const setupCost = round2((setupTime / 60) * shopRate / batchSize);
    const directCost = machineCost + toolCost + materialCost + setupCost;
    const overheadCost = round2(directCost * overheadPct / 100);
    const totalPerPart = round2(directCost + overheadCost);
    const totalBatch = round2(totalPerPart * batchSize);

    const breakdown: CostBreakdown = {
      machineCost, toolCost, materialCost, setupCost, overheadCost, totalPerPart, totalBatch,
    };

    // Generate alternatives
    const alternatives: Array<{ description: string; saving: number; tradeoff: string }> = [];
    if (batchSize < 10) {
      const setupAt10 = round2((setupTime / 60) * shopRate / 10);
      const saving = round2(setupCost - setupAt10);
      if (saving > 0.5) {
        alternatives.push({
          description: `Increase batch to 10 pieces`,
          saving,
          tradeoff: "Higher inventory, lower per-part setup cost",
        });
      }
    }
    if (mat === MATERIAL_DEFAULTS.stainless || mat === MATERIAL_DEFAULTS.titanium || mat === MATERIAL_DEFAULTS.inconel) {
      alternatives.push({
        description: "Use coated carbide insert (TiAlN)",
        saving: round2(toolCost * 0.3),
        tradeoff: "Higher tool cost but 40-60% longer tool life",
      });
    }
    if (totalMachineTime > 10) {
      alternatives.push({
        description: "Optimize toolpaths with trochoidal milling",
        saving: round2(machineCost * 0.15),
        tradeoff: "Longer program, more consistent tool load",
      });
    }

    // Confidence based on how much info we have
    let confidence = 0.5; // base
    if (input.operations?.length) confidence += 0.15;
    if (input.kc1_1 || input.taylorC) confidence += 0.15;
    if (input.shopRate) confidence += 0.10;
    if (input.setupTime) confidence += 0.10;
    confidence = Math.min(confidence, 0.95);

    return {
      quote: { perPart: totalPerPart, perBatch: totalBatch, batchSize, currency: "USD" },
      breakdown,
      operations: opCosts,
      alternatives,
      confidence: round2(confidence),
    };
  }

  /** Compare quotes across materials/machines/strategies. */
  compareQuotes(scenarios: QuoteInput[]): any {
    if (!scenarios?.length) return { error: "No scenarios provided", scenarios: [] };

    const results = scenarios.map((s, i) => ({
      scenario: i + 1,
      material: s.material,
      batchSize: s.batchSize ?? 1,
      result: this.quoteJob(s),
    }));

    results.sort((a, b) => a.result.quote.perPart - b.result.quote.perPart);

    const cheapest = results[0];
    return {
      scenarios: results.map((r) => ({
        ...r,
        rank: results.indexOf(r) + 1,
        savingVsWorst: round2(results[results.length - 1].result.quote.perPart - r.result.quote.perPart),
      })),
      recommendation: {
        bestScenario: cheapest.scenario,
        material: cheapest.material,
        perPart: cheapest.result.quote.perPart,
        confidence: cheapest.result.confidence,
      },
    };
  }

  /** Batch economics: how per-part cost varies with batch size. */
  batchEconomics(input: QuoteInput, batchSizes: number[]): any {
    if (!input?.material) return { error: "Material required" };
    const sizes = batchSizes?.length ? batchSizes : [1, 5, 10, 25, 50, 100, 250, 500];

    const points = sizes.map((bs) => {
      const q = this.quoteJob({ ...input, batchSize: bs });
      return {
        batchSize: bs,
        perPart: q.quote.perPart,
        perBatch: q.quote.perBatch,
        setupPerPart: q.breakdown.setupCost,
        marginImprovement: 0,
      };
    });

    // Calculate marginal improvement
    for (let i = 1; i < points.length; i++) {
      const saving = points[i - 1].perPart - points[i].perPart;
      const extraParts = points[i].batchSize - points[i - 1].batchSize;
      points[i].marginImprovement = round2(saving / Math.max(extraParts, 1) * 100);
    }

    // Find optimal batch: where marginal improvement drops below threshold
    let optimalIdx = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].marginImprovement > 0.01) optimalIdx = i;
      else break;
    }

    return {
      material: input.material,
      curve: points,
      optimal: {
        batchSize: points[optimalIdx].batchSize,
        perPart: points[optimalIdx].perPart,
        reason: "Marginal improvement flattens beyond this point",
      },
      setupAmortization: {
        setupTimeMin: input.setupTime ?? 30,
        shopRate: input.shopRate ?? 85,
        fullSetupCost: round2(((input.setupTime ?? 30) / 60) * (input.shopRate ?? 85)),
      },
    };
  }

  /** Detailed cost breakdown for a single operation. */
  operationBreakdown(operation: any, materialStr: string): any {
    if (!operation || !materialStr) return { error: "Operation and material required" };
    const mat = getMaterialDefaults(materialStr);
    const shopRate = 85;
    const opCost = calcOperationCost(operation, mat, { material: materialStr }, shopRate);
    const d = getOpDefaults(operation);

    const vc = d.isRoughing ? mat.vcRough : mat.vcFinish;
    const fz = d.isRoughing ? mat.fzRough : mat.fzFinish;
    const rpm = Math.min(Math.round((vc * 1000) / (Math.PI * d.toolDiam)), 15000);
    const feedRate = Math.round(rpm * d.flutes * fz);

    return {
      operation: opCost,
      cuttingParameters: {
        cuttingSpeed: vc,
        rpm,
        feedPerTooth: fz,
        tableFeed: feedRate,
        depthOfCut: d.depth / d.passes,
        widthOfCut: d.width,
      },
      tooling: {
        diameter: d.toolDiam,
        flutes: d.flutes,
        cost: d.toolCost,
        taylorLife: opCost.toolLife,
        partsPerEdge: opCost.partsPerEdge,
      },
      material: {
        name: materialStr,
        kc1_1: mat.kc1_1,
        taylorC: mat.taylorC,
        taylorN: mat.taylorN,
        density: mat.densityGCm3,
        costPerKg: mat.costPerKg,
      },
      passStrategy: {
        passes: d.passes,
        isRoughing: d.isRoughing,
        cuttingLength: d.cuttingLength,
      },
    };
  }
}

// ─── Singleton + action dispatcher ──────────────────────────────────────────

export const quotingEngine = new QuotingEngineImpl();

export function executeQuotingAction(action: string, params: Record<string, any> = {}): any {
  switch (action) {
    case "quote_job":
      return quotingEngine.quoteJob(params as QuoteInput);
    case "quote_compare":
      return quotingEngine.compareQuotes(params.scenarios ?? []);
    case "quote_batch":
      return quotingEngine.batchEconomics(params as QuoteInput, params.batch_sizes ?? [1, 10, 50, 100]);
    case "quote_breakdown":
      return quotingEngine.operationBreakdown(params.operation, params.material ?? "");
    default:
      return { error: `Unknown QuotingEngine action: ${action}` };
  }
}
