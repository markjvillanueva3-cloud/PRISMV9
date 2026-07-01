/**
 * FixedAssetDepreciationEngine — fixed-asset depreciation for the PRISM ERP (galaxy:business).
 *
 * QuickBooks-parity: the "Fixed Asset" depreciation function set. QB-PARITY-MS0 Phase-1 engine #2 —
 * the audit's thin-spot #3 (prior coverage = straight-line only via EquipmentAssetEngine). Adds the
 * tax-basis methods a US shop actually needs: MACRS (IRS Pub 946), 200%/150% declining-balance with
 * straight-line switch, sum-of-years-digits, units-of-production, and disposal gain/loss.
 *
 * PRISM synergy: shop machine tools (mill/lathe/wedm/grinder) are 7-yr MACRS property; this feeds
 * the GL depreciation expense + accumulated-depreciation contra-asset and the book-vs-tax basis split.
 *
 * Financial-invariant (business/GSD.md §2): IRS tables IMPORTED (depreciation-tables.ts), never
 * inlined; half-even rounding to the cent; never depreciate below salvage (book methods); MACRS
 * ignores salvage by statute; non-finite / non-positive inputs THROW (no silent coercion).
 */
// WIRE-EXEMPT: dispatcher wiring BLOCKED by worktree-dispatcher divergence (slot/hotel
// businessDispatcher is stale 441-action vs main 879; merging the worktree copy would clobber ~438
// main actions). Wire asset_depreciate_macrs / _straightline / _ddb / _syd / _units / _disposal into
// MAIN businessDispatcher.ts (additive) after this engine reaches main. See business/QUICKBOOKS-PARITY-PLAN.md.
import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import { getMacrsSchedule, DEPRECIATION_TABLES_SCHEMA_VERSION } from "../data/depreciation-tables.js";

export interface DepreciationYear {
  year: number;
  depreciation: number;
  accumulated: number;
  bookValue: number;
}
export interface DepreciationSchedule {
  method: string;
  cost: number;
  salvage: number;
  schedule: DepreciationYear[];
  totalDepreciation: number;
  ratesSchemaVersion?: string;
}

const BookInputSchema = z.object({
  cost: z.number().finite().positive(),
  salvage: z.number().finite().nonnegative().optional().default(0),
  lifeYears: z.number().int().positive(),
});

function assertSalvageBelowCost(cost: number, salvage: number): void {
  if (salvage >= cost) throw new Error(`[depreciation] salvage (${salvage}) must be < cost (${cost})`);
}

function buildSchedule(method: string, cost: number, salvage: number, perYear: number[]): DepreciationSchedule {
  let accumulated = 0;
  const schedule = perYear.map((dep, i) => {
    accumulated = roundCentsHalfEven(accumulated + dep);
    return { year: i + 1, depreciation: roundCentsHalfEven(dep), accumulated, bookValue: roundCentsHalfEven(cost - accumulated) };
  });
  return { method, cost, salvage, schedule, totalDepreciation: accumulated, ratesSchemaVersion: DEPRECIATION_TABLES_SCHEMA_VERSION };
}

export class FixedAssetDepreciationEngine {
  /** Straight-line: (cost − salvage) / life, evenly. */
  static straightLine(input: z.input<typeof BookInputSchema>): DepreciationSchedule {
    const { cost, salvage, lifeYears } = BookInputSchema.parse(input);
    assertSalvageBelowCost(cost, salvage);
    const annual = (cost - salvage) / lifeYears;
    return buildSchedule("straight-line", cost, salvage, Array.from({ length: lifeYears }, () => annual));
  }

  /** Declining balance (factor=2 → 200% DDB) switching to straight-line when SL ≥ DB; floored at salvage. */
  static decliningBalance(input: z.input<typeof BookInputSchema> & { factor?: number }): DepreciationSchedule {
    const { cost, salvage, lifeYears } = BookInputSchema.parse(input);
    const factor = input.factor ?? 2;
    if (!Number.isFinite(factor) || factor <= 0) throw new Error(`[depreciation] factor must be a positive finite number, got ${factor}`);
    assertSalvageBelowCost(cost, salvage);
    const rate = factor / lifeYears;
    const perYear: number[] = [];
    let book = cost;
    for (let y = 1; y <= lifeYears; y++) {
      const remainingYears = lifeYears - y + 1;
      const dbDep = book * rate;
      const slDep = (book - salvage) / remainingYears; // straight-line on remaining depreciable basis
      let dep = Math.max(dbDep, slDep); // switch to SL once it yields more (standard MACRS-style switch)
      if (book - dep < salvage) dep = book - salvage; // never depreciate below salvage
      if (dep < 0) dep = 0;
      perYear.push(dep);
      book -= dep;
    }
    return buildSchedule(`declining-balance-${factor * 100}%`, cost, salvage, perYear);
  }

  /** MACRS GDS half-year convention (IRS Pub 946). Salvage ignored by statute. */
  static macrs(input: { cost: number; recoveryYears: number }): DepreciationSchedule {
    if (!Number.isFinite(input?.cost) || input.cost <= 0) throw new Error(`[depreciation] MACRS cost must be positive finite, got ${input?.cost}`);
    const table = getMacrsSchedule(input.recoveryYears); // throws on unknown class
    return buildSchedule(`MACRS-GDS-${input.recoveryYears}yr-HY`, input.cost, 0, table.map((f) => input.cost * f));
  }

  /** Sum-of-years-digits. */
  static sumOfYearsDigits(input: z.input<typeof BookInputSchema>): DepreciationSchedule {
    const { cost, salvage, lifeYears } = BookInputSchema.parse(input);
    assertSalvageBelowCost(cost, salvage);
    const digits = (lifeYears * (lifeYears + 1)) / 2;
    const base = cost - salvage;
    const perYear = Array.from({ length: lifeYears }, (_, i) => (base * (lifeYears - i)) / digits);
    return buildSchedule("sum-of-years-digits", cost, salvage, perYear);
  }

  /** Units of production for one period. */
  static unitsOfProduction(input: { cost: number; salvage?: number; totalUnits: number; unitsThisPeriod: number }): {
    method: string; depreciation: number; perUnit: number;
  } {
    const cost = input.cost, salvage = input.salvage ?? 0;
    if (!Number.isFinite(cost) || cost <= 0) throw new Error(`[depreciation] cost must be positive finite`);
    if (!Number.isFinite(input.totalUnits) || input.totalUnits <= 0) throw new Error(`[depreciation] totalUnits must be positive finite`);
    if (!Number.isFinite(input.unitsThisPeriod) || input.unitsThisPeriod < 0) throw new Error(`[depreciation] unitsThisPeriod must be non-negative finite`);
    assertSalvageBelowCost(cost, salvage);
    const perUnit = (cost - salvage) / input.totalUnits;
    return { method: "units-of-production", perUnit: roundCentsHalfEven(perUnit), depreciation: roundCentsHalfEven(perUnit * input.unitsThisPeriod) };
  }

  /** Disposal: book value + gain/loss on sale. */
  static disposal(input: { cost: number; accumulatedDepreciation: number; salePrice: number }): {
    bookValue: number; gainLoss: number; type: "gain" | "loss" | "none";
  } {
    const { cost, accumulatedDepreciation, salePrice } = input;
    for (const [k, v] of Object.entries({ cost, accumulatedDepreciation, salePrice })) {
      if (!Number.isFinite(v)) throw new Error(`[depreciation] disposal.${k} must be finite, got ${v}`);
    }
    if (accumulatedDepreciation > cost) throw new Error(`[depreciation] accumulatedDepreciation (${accumulatedDepreciation}) cannot exceed cost (${cost})`);
    const bookValue = roundCentsHalfEven(cost - accumulatedDepreciation);
    const gainLoss = roundCentsHalfEven(salePrice - bookValue);
    return { bookValue, gainLoss, type: gainLoss > 0 ? "gain" : gainLoss < 0 ? "loss" : "none" };
  }
}

export const fixedAssetDepreciationEngine = FixedAssetDepreciationEngine;
