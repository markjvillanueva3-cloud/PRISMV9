/**
 * vendor-catalog-policy.ts — ERP-side ingestion policy for charlie's VENDOR-NETWORK-MS0
 * vendor-source corpus (galaxy:business, slot:hotel).
 *
 * Charlie (quoting galaxy) wired three unified-schema vendor-source files into
 * `state/shared/quoting/vendor-sources/` via U-VDN-CATALOG-PULL:
 *   - catalog-vendors.jsonl   — cutting-tool resellers/makers (Guhring, Niagara, Fraisa, LMT, …)
 *   - imts-exhibitors.jsonl   — machine-tool builders + makers (Haas, Mazak, …)
 *   - thomasnet-shops.jsonl   — machining-service job shops (United CNC, Criterion Precision, …)
 *
 * This policy maps each `vendor_type` to the ERP subsystem that should consume it, and provides the
 * free-text → canonical-enum keyword maps the importer uses to lift a thomasnet shop's `notes`
 * ("processes: milling, turning · certs: ISO 9001, ITAR") into the marketplace capability vocabulary.
 *
 * The process / material / certification ENUMS are NOT redefined here — they are the single source of
 * truth in `supplier-capability-schema.ts` (R8: reuse the canonical vocabulary, never inline it). This
 * file only holds the *keyword→enum* lift tables + the vendor_type→ERP-role routing.
 */

import type { SupplierProcess, Certification } from "./supplier-capability-schema.js";

export const VENDOR_CATALOG_POLICY_SCHEMA_VERSION = "1.0.0";

/**
 * Canonical on-disk vendor-source files (charlie's VENDOR-NETWORK-MS0 output), repo-root-relative.
 * The importer's `loadFromDir` resolves these against a caller-supplied root (default: repo root).
 */
export const VENDOR_SOURCE_FILES = Object.freeze([
  "state/shared/quoting/vendor-sources/catalog-vendors.jsonl",
  "state/shared/quoting/vendor-sources/imts-exhibitors.jsonl",
  "state/shared/quoting/vendor-sources/thomasnet-shops.jsonl",
] as const);

/** The ERP subsystem a vendor maps to (drives which engine consumes it). */
export type ErpVendorRole =
  | "purchasing-vendor" // tool/consumable resellers + makers → purchasing directory + item master
  | "marketplace-supplier" // machining-service job shops → SupplierCapabilityProfile (RFQ matching)
  | "equipment-vendor"; // machine-tool builders → equipment/asset vendor list

/**
 * `vendor_type` → ERP role. Unknown/unspecified types default to {@link DEFAULT_ERP_VENDOR_ROLE}
 * (a procurable goods vendor) — the safe, non-marketplace bucket.
 */
export const VENDOR_TYPE_TO_ERP_ROLE: Readonly<Record<string, ErpVendorRole>> = Object.freeze({
  reseller: "purchasing-vendor",
  maker: "purchasing-vendor",
  "tooling-maker": "purchasing-vendor",
  distributor: "purchasing-vendor",
  "machine-shop": "marketplace-supplier",
  "job-shop": "marketplace-supplier",
  fabricator: "marketplace-supplier",
  "machine-builder": "equipment-vendor",
  "machine-tool-builder": "equipment-vendor",
});

/** Default ERP role for an unrecognised vendor_type (procurable goods, NOT a marketplace supplier). */
export const DEFAULT_ERP_VENDOR_ROLE: ErpVendorRole = "purchasing-vendor";

/**
 * Free-text process keyword (lower-cased, as seen in thomasnet `notes`) → canonical {@link SupplierProcess}.
 * NOTE: bare "edm" is mapped to "wedm" (wire-EDM is the marketplace default); an explicit "sinker"/"ram"
 * qualifier routes to "sinker_edm". Non-machining notes terms (inspection, assembly, plating, anodize)
 * have no process enum and are intentionally absent → dropped by the importer.
 */
export const PROCESS_KEYWORD_TO_ENUM: Readonly<Record<string, SupplierProcess>> = Object.freeze({
  milling: "mill",
  mill: "mill",
  turning: "turn",
  turn: "turn",
  lathe: "turn",
  "wire edm": "wedm",
  "wire-edm": "wedm",
  wedm: "wedm",
  edm: "wedm",
  "sinker edm": "sinker_edm",
  sinker: "sinker_edm",
  "ram edm": "sinker_edm",
  grinding: "grind",
  grind: "grind",
  swiss: "swiss",
  "swiss turning": "swiss",
  "5-axis": "5axis",
  "5 axis": "5axis",
  "5axis": "5axis",
  "five-axis": "5axis",
  waterjet: "waterjet",
  "water jet": "waterjet",
  laser: "laser",
  "laser cutting": "laser",
  "press brake": "brake_press",
  "brake press": "brake_press",
  forming: "brake_press",
});

/**
 * Free-text certification keyword (lower-cased) → canonical {@link Certification} code.
 * Non-canonical certs that appear in shop notes (ISO 13485, FDA registered, AS9120) are intentionally
 * absent → dropped (the marketplace cert axis is exactly the six AS9100/ITAR/CMMC/NADCAP/ISO9001 codes).
 */
export const CERT_KEYWORD_TO_CODE: Readonly<Record<string, Certification>> = Object.freeze({
  "iso 9001": "ISO9001",
  iso9001: "ISO9001",
  "iso-9001": "ISO9001",
  as9100: "AS9100",
  "as 9100": "AS9100",
  itar: "ITAR",
  "cmmc l1": "CMMC_L1",
  "cmmc level 1": "CMMC_L1",
  "cmmc l2": "CMMC_L2",
  "cmmc level 2": "CMMC_L2",
  cmmc: "CMMC_L2",
  nadcap: "NADCAP",
});
