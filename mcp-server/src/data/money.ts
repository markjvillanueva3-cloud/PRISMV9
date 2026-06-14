/**
 * money.ts — canonical monetary rounding for the PRISM ERP + networking marketplace (galaxy:business,
 * slot:hotel). Single source of truth for half-even (banker's) rounding to the cent.
 *
 * WHY THIS FILE EXISTS (the hoist): this primitive previously lived in `SalesUseTaxEngine` and ~24 engines
 * across the business + marketplace galaxies imported it cross-domain FROM A TAX ENGINE — an architectural
 * smell (a money rounder is not tax-specific). It is hoisted here so every consumer imports the shared
 * util and `SalesUseTaxEngine` is just one more consumer, not the owner. (No re-export shim left behind —
 * consumers import from `../data/money.js` directly.)
 *
 * FAIL-LOUD (R12): a non-finite amount THROWS — a NaN/Infinity must never silently coerce into a $ value.
 */

/**
 * Round to the cent using banker's rounding (round-half-to-even), sign-aware. A cent tie (…x.xx5) breaks
 * toward the EVEN cent, not always up — the financial-invariant default that avoids cumulative round-up
 * bias across many transactions. Throws on a non-finite input.
 */
export function roundCentsHalfEven(value: number): number {
  if (!Number.isFinite(value)) throw new Error(`[money] non-finite amount: ${value}`);
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value) * 100;
  const floor = Math.floor(abs);
  const diff = abs - floor;
  const EPS = 1e-9;
  let rounded: number;
  if (Math.abs(diff - 0.5) < EPS) rounded = floor % 2 === 0 ? floor : floor + 1; // ties → even
  else rounded = Math.round(abs);
  return (sign * rounded) / 100;
}
