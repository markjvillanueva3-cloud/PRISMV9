/**
 * MachinePartsBOMResolverEngine — QUOTING-PIPELINE-MS0 / U-QP05
 *
 * Takes a {make, model, serial} tuple from MachineServiceTagOCREngine and
 * resolves to a parts BOM (consumables + wear items + service parts) with
 * per-part vendor adapter routing for downstream U-QP06 pricing.
 *
 * Per R12 fail-loud: unknown make/model → return empty BOM with explicit reason.
 * NEVER fabricate parts for an unrecognized machine.
 *
 * @milestone QUOTING-PIPELINE-MS0/U-QP05-MACHINE-PARTS-BOM-RESOLVER
 * @author slot:charlie /goal-13 iter3, 2026-05-24
 */

export interface BOMResolverInput {
  make: string | null;
  model: string | null;
  serial?: string | null;
}

export interface BOMItem {
  /** Generic part role — caller uses to filter / group */
  role: "consumable" | "wear_part" | "service_part" | "spare";
  description: string;
  /** Vendor-agnostic SKU (where known) */
  generic_sku: string | null;
  /** Recommended vendor adapter (for U-QP06 pricing lookup) */
  vendor_adapter: string;
  /** Typical replacement interval (months — null if event-driven) */
  replacement_interval_months: number | null;
}

export interface BOMResult {
  resolved: boolean;
  make: string | null;
  model: string | null;
  bom: BOMItem[];
  reason?: string;
}

/** Vendor-adapter routing per machine builder family. Lower-case key. */
const VENDOR_ADAPTER_BY_MAKE: Record<string, string> = {
  haas: "haas-oem",
  okuma: "okuma-oem",
  mazak: "mazak-oem",
  doosan: "doosan-oem",
  hurco: "hurco-oem",
  "dmg mori": "dmg-mori-oem",
  "mori seiki": "dmg-mori-oem",
  makino: "makino-oem",
  fanuc: "fanuc-parts",
  sodick: "sodick-oem",
  agie: "agie-oem",
  charmilles: "agie-oem",
  "roku-roku": "roku-roku-oem",
  brother: "brother-oem",
};

/** Family-typed canonical BOM templates. */
const MILL_BOM: BOMItem[] = [
  { role: "consumable", description: "Way oil — Mobil Vactra No.2 (ISO 32)", generic_sku: "VACTRA-2", vendor_adapter: "mcmaster", replacement_interval_months: 1 },
  { role: "consumable", description: "Coolant concentrate (semi-synthetic, 5gal)", generic_sku: "COOL-SYN-5G", vendor_adapter: "mcmaster", replacement_interval_months: 3 },
  { role: "consumable", description: "Air-line filter element", generic_sku: "AIR-FLT-04", vendor_adapter: "mcmaster", replacement_interval_months: 6 },
  { role: "wear_part", description: "Spindle drawbar belleville washer pack", generic_sku: null, vendor_adapter: "oem", replacement_interval_months: 24 },
  { role: "wear_part", description: "Axis way wipers (X/Y/Z, 1 set)", generic_sku: null, vendor_adapter: "oem", replacement_interval_months: 18 },
  { role: "service_part", description: "Spindle taper cleaning kit", generic_sku: "TAPER-CLN-KIT", vendor_adapter: "mcmaster", replacement_interval_months: null },
];
const LATHE_BOM: BOMItem[] = [
  { role: "consumable", description: "Way oil — Mobil Vactra No.2", generic_sku: "VACTRA-2", vendor_adapter: "mcmaster", replacement_interval_months: 1 },
  { role: "consumable", description: "Coolant concentrate (semi-synthetic, 5gal)", generic_sku: "COOL-SYN-5G", vendor_adapter: "mcmaster", replacement_interval_months: 3 },
  { role: "wear_part", description: "Chuck jaw set (3-jaw, soft)", generic_sku: null, vendor_adapter: "oem", replacement_interval_months: null },
  { role: "wear_part", description: "Turret indexer pawl spring kit", generic_sku: null, vendor_adapter: "oem", replacement_interval_months: 36 },
  { role: "service_part", description: "Hydraulic chuck pressure gauge", generic_sku: "HYD-GAUGE-3K", vendor_adapter: "mcmaster", replacement_interval_months: null },
];
const WIRE_EDM_BOM: BOMItem[] = [
  { role: "consumable", description: "Brass EDM wire 0.25mm (10kg spool)", generic_sku: "WIRE-BRASS-025-10KG", vendor_adapter: "edm-supplies", replacement_interval_months: null },
  { role: "consumable", description: "Dielectric water filter (1µm)", generic_sku: "DIE-FLT-1U", vendor_adapter: "edm-supplies", replacement_interval_months: 2 },
  { role: "consumable", description: "Resin DI cartridge", generic_sku: "RESIN-DI-LG", vendor_adapter: "edm-supplies", replacement_interval_months: 4 },
  { role: "wear_part", description: "Wire guide (upper) — match machine series", generic_sku: null, vendor_adapter: "oem", replacement_interval_months: 6 },
  { role: "wear_part", description: "Wire guide (lower) — match machine series", generic_sku: null, vendor_adapter: "oem", replacement_interval_months: 6 },
  { role: "wear_part", description: "Power contact set (upper + lower)", generic_sku: null, vendor_adapter: "oem", replacement_interval_months: 12 },
];
const SINKER_EDM_BOM: BOMItem[] = [
  { role: "consumable", description: "Dielectric oil — EDM Fluid 200 (5gal)", generic_sku: "EDM-FLUID-200-5G", vendor_adapter: "edm-supplies", replacement_interval_months: null },
  { role: "consumable", description: "Dielectric filter cartridge (10µm)", generic_sku: "DIE-FLT-10U", vendor_adapter: "edm-supplies", replacement_interval_months: 3 },
  { role: "wear_part", description: "Graphite electrode blank stock (per program)", generic_sku: null, vendor_adapter: "edm-supplies", replacement_interval_months: null },
];

function classifyFamily(make: string, model: string | null): "mill" | "lathe" | "wire_edm" | "sinker_edm" | null {
  const mk = make.toLowerCase();
  const md = (model ?? "").toUpperCase();
  if (/SODICK|AGIE|CHARMILLES|ROBOFIL/.test(mk.toUpperCase()) || /AQ\d+|SLP/.test(md)) {
    return /SL|SLP/.test(md) ? "sinker_edm" : "wire_edm";
  }
  // Haas/Okuma/Mazak/Hurco etc — mill if model starts with VF/VM/VMX/MU/MA/MB; lathe if LB/ST/QT/INTEGREX/MULTUS
  if (/^(LB|ST|QT|INTEGREX|MULTUS|GENOS)/i.test(md)) return "lathe";
  if (/^(VF|VM|VMX|UMC|MU|MA|MB|VR|GR|HCN|VARIAXIS)/i.test(md)) return "mill";
  // Builder-only fallback
  if (/MAKINO|HURCO|HAAS|BROTHER|MATSUURA|KITAMURA|MORI/i.test(mk.toUpperCase())) return "mill";
  if (/OKUMA|DOOSAN|TSUGAMI/i.test(mk.toUpperCase())) return "lathe";
  return null;
}

function bomForFamily(family: "mill" | "lathe" | "wire_edm" | "sinker_edm", adapter: string): BOMItem[] {
  const base = family === "mill" ? MILL_BOM : family === "lathe" ? LATHE_BOM : family === "wire_edm" ? WIRE_EDM_BOM : SINKER_EDM_BOM;
  // Substitute OEM adapter routing
  return base.map((item) => (item.vendor_adapter === "oem" ? { ...item, vendor_adapter: adapter } : item));
}

export class MachinePartsBOMResolverEngine {
  resolve(input: BOMResolverInput): BOMResult {
    if (!input || typeof input.make !== "string" || input.make.trim().length === 0) {
      return {
        resolved: false,
        make: null,
        model: null,
        bom: [],
        reason: "missing-make",
      };
    }
    const mk = input.make.toLowerCase().trim();
    const adapter = VENDOR_ADAPTER_BY_MAKE[mk] ?? null;
    if (!adapter) {
      return {
        resolved: false,
        make: input.make,
        model: input.model,
        bom: [],
        reason: `unknown-make-no-vendor-adapter:${input.make}`,
      };
    }
    const family = classifyFamily(input.make, input.model);
    if (!family) {
      return {
        resolved: false,
        make: input.make,
        model: input.model,
        bom: [],
        reason: `make-known-but-family-unclassified-from-model:${input.model ?? "null"}`,
      };
    }
    return {
      resolved: true,
      make: input.make,
      model: input.model,
      bom: bomForFamily(family, adapter),
    };
  }
}

export const machinePartsBOMResolverEngine = new MachinePartsBOMResolverEngine();
