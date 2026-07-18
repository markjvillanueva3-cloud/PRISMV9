/**
 * SFC combinatorial CITED-DATA source -- resolves a real, provenance-bearing
 * (vc, fz) reference for a combinatorial cell, or returns UNRESOLVED. It NEVER
 * fabricates a value: every number it emits came from a provider and carries its
 * source; a miss is `resolved:false` with `vc_mpm/fz_mm = null`, never a silent
 * default. (Pairs with the U-CSFH-05 gates' silent-default detector.)
 *
 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-03-DB-ACCESSORS (slot:oscar, 2026-06-10).
 *
 * SCOPE THIS SLICE: the **romeo vendor-catalog** provider
 * (`SpeedFeedCatalogJoinerEngine`, in-tree) is wired + verified against real data.
 * It returns metric `vc_mpm`/`fz_mm` directly, so there is no unit-conversion risk.
 * The **shop-proven** provider (`ShopToolLibraryEngine`) and the **juliett**
 * holder/machine/workholding sources are the NEXT slice (U-CSFH-03b): shop tools
 * carry a `unit` field (JM Die is INCH) so consuming `surfaceSpeed`/`feedPerTooth`
 * needs a real SFM->m/min + in->mm conversion through `physics/unit-conversions`
 * -- wiring them as a "reader that silently skips everything" would be the exact
 * fake-reader anti-pattern, so they are deferred explicitly, NOT stubbed here.
 * The `VendorCatalogProvider` interface is extensible: adding the next provider is
 * a new field + a new cascade branch, no rewrite. [SCOPED per R13/R15.]
 *
 * Pure RESOLVER (deterministic given its providers; the providers do the I/O), so
 * it lives in `src/data/` with the CSFH harness family (axes/validity/gates)
 * rather than `src/engines/` -- it stays out of the engine orphan-block until the
 * DRIVER (U-CSFH-06) + dispatcher-wire (U-CSFH-10) bring the family into the
 * dispatcher graph. No physics constants here (it cites, never computes).
 */
import type { ISOGroup } from "./sfc-combinatorial-axes.js";
import {
  SpeedFeedCatalogJoinerEngine,
  type SpeedFeedCatalogMatch,
  type SpeedFeedCatalogLookupInput,
} from "../engines/SpeedFeedCatalogJoinerEngine.js";

/** Where a cited row came from (or that nothing did). */
export type DataSource = "vendor_catalog" | "unresolved";

/** The identifying context the data source needs to cite a row for a cell. */
export interface DataSourceCellQuery {
  iso_group: ISOGroup;
  diameter_mm?: number;
  /**
   * The romeo vendor-catalog lookup needs BOTH a manufacturer and a tool
   * id/series. When either is absent the vendor provider is SKIPPED (recorded in
   * errors) -- it is never invented to force a match.
   */
  manufacturer?: string;
  tool_id_or_series?: string;
}

/** A resolved cited row, or an explicit unresolved (vc/fz null). */
export interface CitedDataRow {
  resolved: boolean;
  /** null when unresolved -- NEVER a fabricated number. */
  vc_mpm: number | null;
  fz_mm: number | null;
  provenance: {
    source: DataSource;
    detail: string;
    /** 0 when unresolved. */
    confidence: number;
    /**
     * "tool_specific" = the series matched (exact / exact_no_diameter /
     * series_prefix) so the cited vc/fz are for THIS tool -- fair-benchmark-grade.
     * "none" = unresolved (incl. a manufacturer-population median that was
     * downgraded because it is NOT a tool-specific citation).
     */
    citation_quality: "tool_specific" | "none";
    catalog?: SpeedFeedCatalogMatch["source_catalog"];
    match_tier?: SpeedFeedCatalogMatch["match_tier"];
  };
  /** Provider skips / errors encountered (fail-loud record; never swallowed). */
  errors: string[];
}

/**
 * Minimal provider contract -- the real romeo engine satisfies it; a test injects
 * a fake. NOTE: the real `SpeedFeedCatalogJoinerEngine.lookup` accepts `unknown`
 * and re-validates via Zod internally, so a malformed input (e.g. an out-of-enum
 * iso_group forced past the type) throws a ZodError -- which `resolveCell` catches
 * and records in `errors[]`. Callers need not pre-validate.
 */
export interface VendorCatalogProvider {
  lookup(input: SpeedFeedCatalogLookupInput): SpeedFeedCatalogMatch | null;
}

/**
 * Tiers that cite THIS specific tool/series (vs the manufacturer-population median
 * romeo falls back to as a last resort). Only these are emitted as `resolved` -- a
 * coarse population median is NOT fair-benchmark-grade for the comparison harness,
 * so a `manufacturer_iso` match is downgraded to unresolved.
 */
const TOOL_SPECIFIC_TIERS: ReadonlySet<SpeedFeedCatalogMatch["match_tier"]> = new Set([
  "exact",
  "exact_no_diameter",
  "series_prefix",
]);

export class SpeedFeedCombinatorialDataSourceEngine {
  constructor(private readonly vendorCatalog: VendorCatalogProvider) {}

  /** Wire the real in-tree romeo joiner (production path). */
  static withRealProviders(): SpeedFeedCombinatorialDataSourceEngine {
    return new SpeedFeedCombinatorialDataSourceEngine(new SpeedFeedCatalogJoinerEngine());
  }

  /**
   * Resolve a CITED (vc, fz) for one cell.
   * @param query - the cell's tool+material identifying context.
   * @returns a {@link CitedDataRow}: resolved with provenance, or unresolved with
   *   null vc/fz. A provider that throws is recorded in `errors[]` and the row
   *   stays unresolved -- the engine never returns a value it did not get from a
   *   provider (soul refuse: publishing a speed-feed without provenance).
   */
  resolveCell(query: DataSourceCellQuery): CitedDataRow {
    const errors: string[] = [];

    if (query.manufacturer && query.tool_id_or_series) {
      try {
        const match = this.vendorCatalog.lookup({
          manufacturer: query.manufacturer,
          tool_id_or_series: query.tool_id_or_series,
          iso_group: query.iso_group,
          diameter_mm: query.diameter_mm,
        });
        if (match && TOOL_SPECIFIC_TIERS.has(match.match_tier)) {
          return {
            resolved: true,
            vc_mpm: match.vc_mpm,
            fz_mm: match.fz_mm,
            provenance: {
              source: "vendor_catalog",
              detail: `${match.source_catalog}:${match.matched_series} (${match.match_tier})`,
              confidence: match.confidence,
              citation_quality: "tool_specific",
              catalog: match.source_catalog,
              match_tier: match.match_tier,
            },
            errors,
          };
        }
        if (match) {
          // Non-tool-specific tier (manufacturer_iso): a population median over ALL
          // the manufacturer's rows for this ISO group -- real catalog data but NOT a
          // citation for THIS tool. Benchmarking a tool-specific recommendation
          // against it would be unfair, so the coarse value is recorded (diagnostics)
          // and downgraded to unresolved -- never emitted as a vc/fz.
          errors.push(
            `vendor_catalog: only '${match.match_tier}' population-median available ` +
              `(${match.source_catalog}, vc~${match.vc_mpm.toFixed(0)} m/min, conf ${match.confidence.toFixed(2)}) ` +
              `-- too coarse for a tool-specific citation; downgraded to unresolved`,
          );
        } else {
          errors.push(`vendor_catalog: no match for ${query.manufacturer}/${query.tool_id_or_series} in ISO ${query.iso_group}`);
        }
      } catch (e) {
        errors.push(`vendor_catalog lookup threw: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      errors.push("vendor_catalog skipped: requires both manufacturer and tool_id_or_series");
    }

    return {
      resolved: false,
      vc_mpm: null,
      fz_mm: null,
      provenance: {
        source: "unresolved",
        detail: errors[errors.length - 1] ?? "no provider matched",
        confidence: 0,
        citation_quality: "none",
      },
      errors,
    };
  }

  /** Batch convenience -- one cited row per query, order-preserving. */
  resolveCells(queries: DataSourceCellQuery[]): CitedDataRow[] {
    return queries.map((q) => this.resolveCell(q));
  }
}
