/**
 * sales-tax-rates.ts — US sales/use tax rate table for the PRISM ERP (galaxy:business, slot:hotel).
 *
 * Imported by SalesUseTaxEngine — NEVER inline a tax rate in engine code (financial-invariant /
 * anti-pattern #1: jurisdiction-specific + changes over time; a stale inlined rate = wrong tax =
 * real liability). This module is the single source of truth.
 *
 * ⚠ HONESTY: these are a SNAPSHOT of combined state(+local) general-merchandise rates as published
 * by each state's Dept. of Revenue, effective the dates shown. Sales-tax rates change and are
 * NEXUS-, address-, and product-taxability-specific. Before filing, RECONCILE against the live
 * state DOR rate for the exact ship-to address. This table is sized for JM Die's actual footprint
 * (Michigan HQ + common Midwest ship-to states); extend per nexus. Do NOT treat as authoritative
 * for jurisdictions not listed — SalesUseTaxEngine THROWS on an unknown jurisdiction (silent 0%
 * would be under-collection, a liability), forcing an explicit add here.
 *
 * Source: state DOR published rates 2024-2025. schemaVersion bumps on any rate change + add a
 * migration note. Citizens: SalesUseTaxEngine.
 */

export interface SalesTaxJurisdiction {
  /** combined state(+local) rate as a decimal fraction, e.g. 0.06 = 6% */
  rate: number;
  label: string;
  /** ISO date the rate became effective (snapshot provenance) */
  effectiveDate: string;
  /** authoritative source to reconcile against before filing */
  source: string;
  notes?: string;
}

export const SALES_TAX_RATES_SCHEMA_VERSION = "1.0.0";

/**
 * Keyed by an uppercase jurisdiction code. State-only keys are the 2-letter postal code;
 * local-combined keys use `<STATE>-<LOCALITY>` (e.g. IL-COOK).
 */
export const SALES_TAX_RATES: Readonly<Record<string, SalesTaxJurisdiction>> = Object.freeze({
  MI: { rate: 0.06, label: "Michigan (state, no local sales tax)", effectiveDate: "1994-05-01", source: "Michigan Dept. of Treasury", notes: "JM Die HQ state. MI has NO local sales tax — 6% flat statewide." },
  IL: { rate: 0.0625, label: "Illinois (state base)", effectiveDate: "1990-01-01", source: "Illinois Dept. of Revenue", notes: "State base only; most addresses have additional local tax — use IL-<locality> where known." },
  "IL-COOK": { rate: 0.1025, label: "Illinois — Cook County / Chicago (combined)", effectiveDate: "2016-01-01", source: "Illinois Dept. of Revenue", notes: "Chicago combined rate; one of the highest US combined rates." },
  OH: { rate: 0.0575, label: "Ohio (state base)", effectiveDate: "2013-09-01", source: "Ohio Dept. of Taxation", notes: "State base; counties add 0.75-2.25%." },
  IN: { rate: 0.07, label: "Indiana (statewide, no local)", effectiveDate: "2008-04-01", source: "Indiana Dept. of Revenue", notes: "7% flat statewide; no local sales tax." },
  WI: { rate: 0.05, label: "Wisconsin (state base)", effectiveDate: "1982-05-01", source: "Wisconsin Dept. of Revenue", notes: "State base 5%; most counties add 0.5%." },
});

/** GL liability account sales tax COLLECTED credits to (until remitted). Minimal seed — the full
 *  chart-of-accounts is a Phase-4 deliverable (QUICKBOOKS-PARITY-PLAN.md); this is the one account
 *  SalesUseTaxEngine posts to. */
export const SALES_TAX_PAYABLE_ACCOUNT = Object.freeze({ number: "2200", name: "Sales Tax Payable", type: "liability" as const });

/** Resolve a jurisdiction rate or throw (never silently 0 — that is under-collection). */
export function getSalesTaxRate(jurisdiction: string): SalesTaxJurisdiction {
  const key = String(jurisdiction || "").trim().toUpperCase();
  const j = SALES_TAX_RATES[key];
  if (!j) {
    throw new Error(
      `[sales-tax] unknown jurisdiction "${jurisdiction}" — not in SALES_TAX_RATES. ` +
        `Add it (with state DOR source + effectiveDate) before taxing; a silent 0% would under-collect (liability). ` +
        `Known: ${Object.keys(SALES_TAX_RATES).join(", ")}.`
    );
  }
  return j;
}
