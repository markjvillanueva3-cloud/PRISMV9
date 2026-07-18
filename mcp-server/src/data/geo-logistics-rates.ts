/**
 * geo-logistics-rates.ts — freight-zone rate policy for GeoLogisticsRoutingEngine (galaxy:business,
 * slot:hotel; PRISM networking-marketplace Phase-2 differentiator).
 *
 * The marketplace ranks an RFQ shortlist on TOTAL LANDED COST (part price + freight + customs), not the
 * bare part price competitors quote. This file holds the zone rate card + region→continent map so the
 * engine never inlines a shipping rate or a duty rate.
 *
 * Model: a buyer↔supplier pair resolves to a freight zone — local (same metro, courier/pickup), domestic
 * (same region/country, LTL/parcel), or international (cross-region, ocean/air + customs). Rates are
 * order-of-magnitude parcel/LTL figures; every value is overridable by a caller-supplied rate card.
 *
 * Citation: parcel/LTL zone pricing (carrier zone tables 2-8); de-minimis + ad-valorem customs duty
 * (US HTS average ~3% MFN). Figures are illustrative defaults for ranking, NOT a customs-broker quote.
 */

export const GEO_LOGISTICS_SCHEMA_VERSION = "1.0.0";

/** Freight zone a buyer↔supplier route falls into (ordinal: local < domestic < international cost/time). */
export type FreightZone = "local" | "domestic" | "international";

/** Per-zone rate card. `score` is the ordinal logistics-preference signal in [0,1] for RFQ ranking. */
export interface ZoneRate {
  baseUsd: number;
  perKgUsd: number;
  transitDays: number;
  customs: boolean;
  score: number;
}

export const FREIGHT_ZONES: Readonly<Record<FreightZone, ZoneRate>> = Object.freeze({
  local: Object.freeze({ baseUsd: 25, perKgUsd: 1.5, transitDays: 1, customs: false, score: 1.0 }),
  domestic: Object.freeze({ baseUsd: 60, perKgUsd: 3.0, transitDays: 3, customs: false, score: 0.7 }),
  international: Object.freeze({ baseUsd: 180, perKgUsd: 8.0, transitDays: 9, customs: true, score: 0.3 }),
});

/** Expedited freight: cost multiplier + transit compression factor. */
export const EXPEDITE_COST_MULTIPLIER = 1.8;
export const EXPEDITE_TRANSIT_FACTOR = 0.5;

/** Ad-valorem customs duty applied to the part value on an international route (US HTS MFN average). */
export const CUSTOMS_DUTY_RATE = 0.03;

/** Default per-part shipping weight (kg) when the RFQ omits it. */
export const DEFAULT_PART_WEIGHT_KG = 0.5;

/** Region code → continent. Same continent + different region = still international (cross-border customs). */
export const REGION_TO_CONTINENT: Readonly<Record<string, string>> = Object.freeze({
  US: "NA",
  CA: "NA",
  MX: "NA",
  EU: "EU",
  DE: "EU",
  UK: "EU",
  FR: "EU",
  IT: "EU",
  ES: "EU",
  CH: "EU",
  ASIA: "ASIA",
  CN: "ASIA",
  JP: "ASIA",
  AU: "OCEANIA",
  ZA: "AFRICA",
});
