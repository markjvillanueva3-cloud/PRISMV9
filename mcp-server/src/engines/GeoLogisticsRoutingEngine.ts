/**
 * GeoLogisticsRoutingEngine.ts — PRISM networking-marketplace Phase-2 differentiator (galaxy:business,
 * slot:hotel). Ranks an RFQ shortlist on TOTAL LANDED COST + transit time, not the bare part price
 * competitors quote: a cheaper part from an overseas shop can lose to a pricier local shop once freight
 * and customs are added. This is the buyer-side moat — the true delivered cost, surfaced before award.
 *
 * Resolves a buyer↔supplier region pair to a freight zone (local / domestic / international), prices the
 * freight from the zone rate card (geo-logistics-rates.ts — never inlined), adds ad-valorem customs on
 * international routes, and emits an ordinal logistics score for the RFQ ranking criterion.
 *
 * FAIL-LOUD (R12): negative/NaN part value, weight, or quantity throws. Money is rounded to the cent.
 */

import { z } from "zod";
import {
  GEO_LOGISTICS_SCHEMA_VERSION,
  FREIGHT_ZONES,
  EXPEDITE_COST_MULTIPLIER,
  EXPEDITE_TRANSIT_FACTOR,
  CUSTOMS_DUTY_RATE,
  DEFAULT_PART_WEIGHT_KG,
  REGION_TO_CONTINENT,
  type FreightZone,
} from "../data/geo-logistics-rates.js";

const RouteInputSchema = z.object({
  fromRegion: z.string().min(1, "fromRegion (supplier) is required"),
  toRegion: z.string().min(1, "toRegion (buyer) is required"),
  quantity: z.number().int("quantity must be an integer").positive("quantity must be > 0").default(1),
  perPartWeightKg: z.number().finite().positive("perPartWeightKg must be > 0").optional(),
  sameMetro: z.boolean().default(false),
  expedite: z.boolean().default(false),
});
export type RouteInput = z.input<typeof RouteInputSchema>;

export interface FreightQuote {
  zone: FreightZone;
  shippingUsd: number;
  transitDays: number;
  customsApplies: boolean;
  totalWeightKg: number;
  expedite: boolean;
}

export interface LandedCost {
  partValueUsd: number;
  shippingUsd: number;
  customsDutyUsd: number;
  totalLandedUsd: number;
  quote: FreightQuote;
}

export class GeoLogisticsRoutingEngine {
  /** Round a USD amount to the cent (estimates; GL postings use the canonical half-even rounder). */
  static #cents(x: number): number {
    return Math.round(x * 100) / 100;
  }

  /**
   * Resolve a route's freight zone:
   *   - same metro (caller-asserted) → local (courier/pickup)
   *   - same region code (e.g. US→US) → domestic
   *   - any other region pair → international (cross-border customs), even within a continent.
   */
  static resolveZone(fromRegion: string, toRegion: string, sameMetro = false): FreightZone {
    if (sameMetro) return "local";
    if (fromRegion === toRegion) return "domestic";
    return "international";
  }

  /** Continent for a region code (or "UNKNOWN") — exposed for callers that want a coarser geography axis. */
  static continentOf(region: string): string {
    return REGION_TO_CONTINENT[region] ?? "UNKNOWN";
  }

  /** Price the freight for a route (zone rate card + weight + expedite). */
  static routeCost(input: RouteInput): FreightQuote {
    const p = RouteInputSchema.parse(input);
    const zone = GeoLogisticsRoutingEngine.resolveZone(p.fromRegion, p.toRegion, p.sameMetro);
    const rate = FREIGHT_ZONES[zone];
    const perPart = p.perPartWeightKg ?? DEFAULT_PART_WEIGHT_KG;
    const totalWeightKg = GeoLogisticsRoutingEngine.#cents(perPart * p.quantity);

    let shipping = rate.baseUsd + rate.perKgUsd * totalWeightKg;
    let transit = rate.transitDays;
    if (p.expedite) {
      shipping *= EXPEDITE_COST_MULTIPLIER;
      transit = Math.max(1, Math.ceil(transit * EXPEDITE_TRANSIT_FACTOR));
    }

    return {
      zone,
      shippingUsd: GeoLogisticsRoutingEngine.#cents(shipping),
      transitDays: transit,
      customsApplies: rate.customs,
      totalWeightKg,
      expedite: p.expedite,
    };
  }

  /**
   * Total landed cost = part value + freight + (ad-valorem customs duty on international routes).
   * @param input route + `partValueUsd` (the awarded/quoted price for the whole order).
   */
  static landedCost(input: RouteInput & { partValueUsd: number }): LandedCost {
    const partValueUsd = input.partValueUsd;
    if (typeof partValueUsd !== "number" || !Number.isFinite(partValueUsd) || partValueUsd < 0) {
      throw new Error(`GeoLogisticsRoutingEngine.landedCost: partValueUsd must be a finite >= 0 number`);
    }
    const quote = GeoLogisticsRoutingEngine.routeCost(input);
    const customsDutyUsd = quote.customsApplies
      ? GeoLogisticsRoutingEngine.#cents(partValueUsd * CUSTOMS_DUTY_RATE)
      : 0;
    const totalLandedUsd = GeoLogisticsRoutingEngine.#cents(
      partValueUsd + quote.shippingUsd + customsDutyUsd,
    );

    // Reconcile both ways (R12): the parts MUST sum to the whole, to the cent.
    const recomposed = GeoLogisticsRoutingEngine.#cents(partValueUsd + quote.shippingUsd + customsDutyUsd);
    if (recomposed !== totalLandedUsd) {
      throw new Error(
        `GeoLogisticsRoutingEngine.landedCost: landed-cost reconciliation gap ${recomposed} != ${totalLandedUsd}`,
      );
    }

    return { partValueUsd: GeoLogisticsRoutingEngine.#cents(partValueUsd), shippingUsd: quote.shippingUsd, customsDutyUsd, totalLandedUsd, quote };
  }

  /** Ordinal logistics-preference score in [0,1] for the RFQ ranking criterion (local > domestic > intl). */
  static logisticsScore(fromRegion: string, toRegion: string, sameMetro = false): number {
    return FREIGHT_ZONES[GeoLogisticsRoutingEngine.resolveZone(fromRegion, toRegion, sameMetro)].score;
  }

  static schemaVersion(): string {
    return GEO_LOGISTICS_SCHEMA_VERSION;
  }
}

export const geoLogisticsRoutingEngine = GeoLogisticsRoutingEngine;
