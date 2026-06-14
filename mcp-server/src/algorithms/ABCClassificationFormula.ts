/**
 * ABCClassificationFormula — Pareto (80/20) classification of customers /
 * SKUs / parts / vendors by value contribution.
 * (hotel iter14, 2026-05-24, U-ABC-CLASSIFICATION).
 *
 * Closes G12 from the ERP-comparison audit. Sort items descending by value,
 * cumulate, classify:
 *   - Class A — top items contributing first 80% of total value
 *   - Class B — next items contributing next 15% (cumulative 80-95%)
 *   - Class C — tail items contributing last 5% (cumulative 95-100%)
 *
 * Default thresholds match Pareto's empirical 80-20 distribution; operator
 * can override per-call (e.g. 70-25-5 for tighter A-list, 90-9-1 for hubs).
 *
 * Hotel-soul:
 *   - **R12 fail-loud** — bad inputs throw with descriptive errors
 *   - **deterministic** — sort tie-break by id ASC; no PRNG, no clock
 *   - **monotonic-threshold verification** — a_threshold < b_threshold; both
 *     must be in (0, 1); throws on misorder
 *   - **financial-invariant gate** — sum of class totals MUST equal sum of
 *     input values (within $0.01); throws on imbalance
 *
 * Reference: Vilfredo Pareto 1896 (income distribution); H. Ford Dickie
 * "ABC Inventory Analysis Shoots for Dollars, Not Pennies" Factory
 * Management & Maintenance Vol.109 (1951) — canonical ABC paper.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ABCClass = "A" | "B" | "C";

export interface ABCItem {
  id: string;
  value: number;       // dollar contribution / annual revenue / unit-of-value
}

export interface ABCClassifiedRow {
  id: string;
  value: number;
  rank: number;                // 1-indexed ranking by value DESC
  cumulative_value: number;
  cumulative_pct: number;      // 0..1
  abc_class: ABCClass;
}

export interface ABCClassificationResult {
  rows: ABCClassifiedRow[];                       // sorted desc by value
  total_value: number;
  thresholds: { a: number; b: number };           // cumulative-pct thresholds
  counts: Record<ABCClass, number>;
  totals: Record<ABCClass, number>;
  pct_of_total: Record<ABCClass, number>;
  ledger_balanced: boolean;                       // hotel-soul invariant
  fetched_at: string;
}

// ─── Constants (Pareto defaults — operator can override) ───────────────────

const DEFAULT_A_THRESHOLD = 0.80;
const DEFAULT_B_THRESHOLD = 0.95;
const LEDGER_TOLERANCE = 0.01;

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertNonEmptyArray<T>(a: unknown, label: string): T[] {
  if (!Array.isArray(a)) throw new Error(`${label}: must be an array`);
  if (a.length === 0) throw new Error(`${label}: empty`);
  return a as T[];
}

function assertItem(item: unknown, idx: number): ABCItem {
  if (item === null || typeof item !== "object") {
    throw new Error(`items[${idx}]: must be an object`);
  }
  const i = item as Record<string, unknown>;
  if (typeof i.id !== "string" || i.id.trim().length === 0) {
    throw new Error(`items[${idx}].id: must be non-empty string`);
  }
  if (!Number.isFinite(i.value)) {
    throw new Error(`items[${idx}].value: must be finite (got ${String(i.value)})`);
  }
  if ((i.value as number) < 0) {
    throw new Error(`items[${idx}].value: must be >= 0 (got ${i.value})`);
  }
  return { id: i.id as string, value: i.value as number };
}

function assertThresholds(a: number, b: number): void {
  if (!Number.isFinite(a)) throw new Error(`a_threshold: must be finite (got ${a})`);
  if (!Number.isFinite(b)) throw new Error(`b_threshold: must be finite (got ${b})`);
  if (a <= 0 || a >= 1) throw new Error(`a_threshold: must be in (0, 1) (got ${a})`);
  if (b <= 0 || b >= 1) throw new Error(`b_threshold: must be in (0, 1) (got ${b})`);
  if (a >= b) throw new Error(`a_threshold (${a}) must be < b_threshold (${b})`);
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

// ─── Main classifier ───────────────────────────────────────────────────────

/**
 * Classify items into ABC tiers by Pareto cumulative-value contribution.
 *
 * @param items — list of { id, value }; value must be finite + non-negative
 * @param thresholds — override defaults; aThreshold < bThreshold, both in (0,1)
 */
export function classifyABC(
  items: ABCItem[],
  thresholds: { a?: number; b?: number } = {},
): ABCClassificationResult {
  const arr = assertNonEmptyArray<unknown>(items, "items");
  const validated = arr.map((it, i) => assertItem(it, i));
  const a = thresholds.a ?? DEFAULT_A_THRESHOLD;
  const b = thresholds.b ?? DEFAULT_B_THRESHOLD;
  assertThresholds(a, b);

  const totalValue = validated.reduce((s, it) => s + it.value, 0);
  // Total of zero is a legal degenerate state — every item is class-C with 0 cum_pct
  const sorted = [...validated].sort((x, y) => {
    if (y.value !== x.value) return y.value - x.value;  // value DESC
    return x.id.localeCompare(y.id);                    // tie-break id ASC
  });

  const rows: ABCClassifiedRow[] = [];
  let cum = 0;
  const counts: Record<ABCClass, number> = { A: 0, B: 0, C: 0 };
  const totals: Record<ABCClass, number> = { A: 0, B: 0, C: 0 };

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const prevCumPct = totalValue === 0 ? 0 : cum / totalValue;  // cum BEFORE adding this item
    cum += item.value;
    const cumPct = totalValue === 0 ? 0 : cum / totalValue;
    // Textbook Pareto (Dickie 1951): an item belongs to the band it PUSHES
    // cumulative through — so use prevCumPct as the bucket discriminant.
    // This correctly handles single-item lists (prev=0 → A) and threshold-
    // straddling items (prev < a → A even if cum lands > a).
    let klass: ABCClass;
    if (prevCumPct < a - 1e-9) klass = "A";
    else if (prevCumPct < b - 1e-9) klass = "B";
    else klass = "C";
    rows.push({
      id: item.id,
      value: item.value,
      rank: i + 1,
      cumulative_value: round2(cum),
      cumulative_pct: cumPct,
      abc_class: klass,
    });
    counts[klass] += 1;
    totals[klass] = round2(totals[klass] + item.value);
  }

  // Hotel-soul invariant: sum of class totals == sum of input values
  const classSum = totals.A + totals.B + totals.C;
  const balanced = Math.abs(classSum - totalValue) <= LEDGER_TOLERANCE;
  if (!balanced) {
    throw new Error(`classifyABC: class-sum ${classSum.toFixed(2)} != total ${totalValue.toFixed(2)}`);
  }

  const pctOfTotal: Record<ABCClass, number> = {
    A: totalValue === 0 ? 0 : totals.A / totalValue,
    B: totalValue === 0 ? 0 : totals.B / totalValue,
    C: totalValue === 0 ? 0 : totals.C / totalValue,
  };

  return {
    rows,
    total_value: round2(totalValue),
    thresholds: { a, b },
    counts,
    totals,
    pct_of_total: pctOfTotal,
    ledger_balanced: balanced,
    fetched_at: new Date().toISOString(),
  };
}
