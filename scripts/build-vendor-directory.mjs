#!/usr/bin/env node
/**
 * build-vendor-directory.mjs — Vendor & Distributor Network seed (VENDOR-NETWORK-MS0, slot:charlie).
 *
 * U-VDN-SEED (+ a curated slice of U-VDN-CATALOG). Builds the quoting-facing vendor/distributor
 * directory by merging TWO sources, keyed on a normalized vendor_id so it JOINs cleanly with the
 * peer sources when they land:
 *   1. charlie's `jm-vendor-cost-index.json` (174 vendors JM actually buys from + $10M spend +
 *      per-category unit-cost priors) — the proven-supplier seed.
 *   2. a CURATED catalog of the major manufacturing suppliers/distributors (real websites +
 *      categories + region + pricing-access flag) — the "all possible vendors" expansion.
 *
 * JOIN-ready for the peers (do NOT fork their data — merge on vendor_id):
 *   - hotel `mcp-server/data/state/jm-die-vendor-registry.json` (business master: bill-line counts,
 *     item categories, date range — NO dollars by hotel's financial-invariant doctrine). Merged when
 *     present (absent on main pre-golf-merge → graceful skip).
 *   - hotel `DistributorSearchEngine` (live tool/material distributor search) — the future query layer.
 *
 * R12 provenance: JM spend figures are charlie's A/P unit-cost extraction (qty>1 rows prove the
 * last decimal is per-UNIT cost, not extended — e.g. 54 soldered parts × $4.25 = $229.50). Hotel's
 * ERP master deliberately abstains from dollars pending QuickBooks reconciliation; the directory
 * carries spend tagged `spend_source: charlie-ap-extraction` + `advisory: true`. Contacts/regions on
 * curated entries are advisory + mustHumanVerify before any customer-facing RFQ.
 *
 * Usage:
 *   node scripts/build-vendor-directory.mjs                 # build from defaults
 *   node scripts/build-vendor-directory.mjs --out-dir <dir> --cost-index <json> --hotel-registry <json>
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const OUT_DIR = join(PRISM_ROOT, "state/shared/quoting");
const COST_INDEX = join(PRISM_ROOT, "state/shared/quoting/jm-vendor-cost-index.json");
const HOTEL_REGISTRY = join(PRISM_ROOT, "mcp-server/data/state/jm-die-vendor-registry.json");
const VENDOR_SOURCES_DIR = join(PRISM_ROOT, "state/shared/quoting/vendor-sources");

/** Load every harvested vendor-source JSONL (imts / resources-catalog / thomasnet) → flat records[].
 *  Each line is a curated-shape record. Malformed lines are skipped (fail-soft, counted by caller). */
export function loadVendorSources(dir) {
  if (!dir || !existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".jsonl")) continue;
    let text;
    try { text = readFileSync(join(dir, f), "utf8"); } catch { continue; }
    for (const line of text.split(/\r?\n/)) {
      const s = line.trim();
      if (!s) continue;
      try { const r = JSON.parse(s); if (r && r.name) out.push(r); } catch { /* skip malformed */ }
    }
  }
  return out;
}

// Spend categories shared with the A/P cost-basis ingest (ingest-jm-vendor-ap.mjs).
const CATEGORIES = ["outside-process", "material", "tooling-consumable", "overhead-utility", "freight-shipping", "inspection-quality", "misc"];

/**
 * CURATED manufacturing supplier/distributor catalog — the "all possible vendors" expansion seed.
 * Real, well-known industrial suppliers with verifiable public websites. pricing_access:
 *   "api"     — programmatic price/availability (punchout / REST) available
 *   "catalog" — published catalog / web product pages, no live API
 *   "quote"   — RFQ-only (contact a rep — routes to U-VDN-MESSAGING)
 * regions: coarse coverage. has_api gates the U-VDN-INVENTORY-PRICING live-feed wiring.
 * ADVISORY + mustHumanVerify — websites are public; contact/pricing must be human-validated before use.
 */
export const CURATED_SUPPLIERS = [
  // --- MRO / general industrial distributors (broad catalog, several with APIs) ---
  { name: "MSC Industrial Supply", website: "https://www.mscdirect.com", categories: ["tooling-consumable", "material", "misc"], regions: ["US"], pricing_access: "api", has_api: true },
  { name: "W.W. Grainger", website: "https://www.grainger.com", categories: ["tooling-consumable", "overhead-utility", "misc"], regions: ["US", "CA"], pricing_access: "api", has_api: true },
  { name: "McMaster-Carr", website: "https://www.mcmaster.com", categories: ["tooling-consumable", "material", "misc"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Fastenal", website: "https://www.fastenal.com", categories: ["tooling-consumable", "misc"], regions: ["US", "CA", "MX"], pricing_access: "api", has_api: true },
  { name: "Travers Tool", website: "https://www.travers.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Production Tool Supply", website: "https://www.pts-tools.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "KBC Tools & Machinery", website: "https://www.kbctools.com", categories: ["tooling-consumable"], regions: ["US", "CA"], pricing_access: "catalog", has_api: false },
  { name: "Zoro", website: "https://www.zoro.com", categories: ["tooling-consumable", "misc"], regions: ["US"], pricing_access: "catalog", has_api: false },
  // --- Cutting tool manufacturers (mostly quote/distributor; product catalogs online) ---
  { name: "Kennametal", website: "https://www.kennametal.com", categories: ["tooling-consumable"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Sandvik Coromant", website: "https://www.sandvik.coromant.com", categories: ["tooling-consumable"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Iscar", website: "https://www.iscar.com", categories: ["tooling-consumable"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Kyocera (SGS)", website: "https://www.kyocera-sgstool.com", categories: ["tooling-consumable"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Harvey Tool", website: "https://www.harveytool.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Helical Solutions", website: "https://www.helicaltool.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "OSG", website: "https://www.osgtool.com", categories: ["tooling-consumable"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Guhring", website: "https://www.guhring.com", categories: ["tooling-consumable"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Walter Tools", website: "https://www.walter-tools.com", categories: ["tooling-consumable"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Seco Tools", website: "https://www.secotools.com", categories: ["tooling-consumable"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Niagara Cutter", website: "https://www.niagaracutter.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Mitsubishi Materials", website: "https://www.mitsubishicarbide.com", categories: ["tooling-consumable"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "YG-1", website: "https://www.yg1.kr", categories: ["tooling-consumable"], regions: ["US", "ASIA"], pricing_access: "quote", has_api: false },
  // --- Round-3 catalog-pull cutting-tool makers (U-VDN-CATALOG-PULL 2026-05-29) ---
  { name: "Fullerton Tool", website: "https://www.fullertontool.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "IMCO Carbide", website: "https://www.imcousa.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Garr Tool", website: "https://www.garrtool.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Melin Tool", website: "https://www.endmill.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Micro 100", website: "https://www.micro100.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Destiny Tool", website: "https://www.destinytool.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Lakeshore Carbide", website: "https://www.lakeshorecarbide.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Cobra Carbide", website: "https://www.cobracarbide.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Data Flute", website: "https://www.dataflute.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "MariTool", website: "https://www.maritool.com", categories: ["tooling-consumable", "tool-holder"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Greenleaf", website: "https://www.greenleafcorporation.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Conical Tool", website: "https://conicaltool.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Vargus", website: "https://www.vargus.com", categories: ["tooling-consumable"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Kyocera Precision Tools", website: "https://kyoceraprecisiontools.com", categories: ["tooling-consumable"], regions: ["US", "ASIA"], pricing_access: "catalog", has_api: false },
  { name: "Tool-Flo", website: "https://www.toolflo.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Vortex Tool", website: "https://www.vortextool.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "RobbJack", website: "https://www.robbjack.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Performance Micro Tool", website: "https://www.pmtnow.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  // --- Metal / material suppliers ---
  { name: "Alro Steel", website: "https://www.alro.com", categories: ["material"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Ryerson", website: "https://www.ryerson.com", categories: ["material"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Online Metals", website: "https://www.onlinemetals.com", categories: ["material"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Metal Supermarkets", website: "https://www.metalsupermarkets.com", categories: ["material"], regions: ["US", "CA", "UK"], pricing_access: "quote", has_api: false },
  { name: "Cincinnati Tool Steel", website: "https://www.cincinnatitoolsteel.com", categories: ["material"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Carpenter Technology", website: "https://www.carpentertechnology.com", categories: ["material"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Crucible Industries", website: "https://www.crucible.com", categories: ["material"], regions: ["US"], pricing_access: "quote", has_api: false },
  // --- Outside processes (heat treat / coating / plating) ---
  { name: "Bodycote", website: "https://www.bodycote.com", categories: ["outside-process"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Oerlikon Balzers", website: "https://www.oerlikon.com/balzers", categories: ["outside-process"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "IonBond", website: "https://www.ionbond.com", categories: ["outside-process"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Paulo", website: "https://www.paulo.com", categories: ["outside-process"], regions: ["US"], pricing_access: "quote", has_api: false },
  // --- Abrasives / grinding ---
  { name: "Norton (Saint-Gobain Abrasives)", website: "https://www.nortonabrasives.com", categories: ["tooling-consumable"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "3M Abrasives", website: "https://www.3m.com", categories: ["tooling-consumable"], regions: ["US", "EU", "ASIA"], pricing_access: "catalog", has_api: false },
  // --- Workholding / fixturing ---
  { name: "Jergens", website: "https://www.jergensinc.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Schunk", website: "https://www.schunk.com", categories: ["tooling-consumable"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  // --- Fasteners ---
  { name: "Bossard", website: "https://www.bossard.com", categories: ["tooling-consumable", "misc"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  // --- JM high-spend suppliers, web-verified 2026-05-29 (U-VDN-CATALOG enrichment of the top JM-only
  //     vendors). vendor_id matches the JM A/P name → auto-JOIN-merges to source="both" with real spend.
  { name: "Rockform Carbide", website: "https://rockform.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Griggs Steel", website: "https://www.griggssteel.com", categories: ["material"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "SB Specialty Metals", website: "https://sb-specialty-metals.com", categories: ["material"], regions: ["US"], pricing_access: "quote", has_api: false },

  // ===== CATALOG EXPANSION 2026-05-29 (U-VDN-CATALOG: machines/tool-holders/fixturing/coolant/service/resellers/shop-network) =====

  // --- Machine tool builders (vendor_type: machine-builder; capital equipment, quote/dealer) ---
  { name: "Haas Automation", website: "https://www.haascnc.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Mazak", website: "https://www.mazakusa.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "DMG Mori", website: "https://www.dmgmori.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Okuma", website: "https://www.okuma.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Makino", website: "https://www.makino.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "DN Solutions (Doosan)", website: "https://www.dn-solutions.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Hurco", website: "https://www.hurco.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "FANUC America", website: "https://www.fanucamerica.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "MC Machinery (Mitsubishi EDM/Laser)", website: "https://www.mcmachinery.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Sodick", website: "https://www.sodick.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "GF Machining Solutions", website: "https://www.gfms.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Kitamura Machinery", website: "https://www.kitamura-machinery.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Matsuura", website: "https://www.matsuurausa.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Hermle", website: "https://www.hermle.de", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["EU", "US"], pricing_access: "quote", has_api: false },
  { name: "Brother (Speedio)", website: "https://www.brother-usa.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Tornos", website: "https://www.tornos.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["EU", "US"], pricing_access: "quote", has_api: false },
  { name: "Star CNC", website: "https://www.starcnc.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["US", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Studer (grinding)", website: "https://www.studer.com", vendor_type: "machine-builder", categories: ["machine-builder"], regions: ["EU", "US"], pricing_access: "quote", has_api: false },

  // --- Tool holders (vendor_type: supplier, category: tool-holder) ---
  { name: "BIG Daishowa (BIG Kaiser)", website: "https://us.bigdaishowa.com", vendor_type: "supplier", categories: ["tool-holder"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Haimer", website: "https://www.haimer-usa.com", vendor_type: "supplier", categories: ["tool-holder"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Lyndex-Nikken", website: "https://www.lyndexnikken.com", vendor_type: "supplier", categories: ["tool-holder"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Command Tooling Systems", website: "https://www.commandtool.com", vendor_type: "supplier", categories: ["tool-holder"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Rego-Fix", website: "https://www.rego-fix.com", vendor_type: "supplier", categories: ["tool-holder"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Techniks", website: "https://www.techniksusa.com", vendor_type: "supplier", categories: ["tool-holder"], regions: ["US"], pricing_access: "catalog", has_api: false },

  // --- Fixturing / workholding (vendor_type: supplier, category: fixturing) ---
  { name: "Kurt Workholding", website: "https://www.kurtworkholding.com", vendor_type: "supplier", categories: ["fixturing"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "5th Axis", website: "https://www.5thaxis.com", vendor_type: "supplier", categories: ["fixturing"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Mitee-Bite Products", website: "https://www.miteebite.com", vendor_type: "supplier", categories: ["fixturing"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Carr Lane Manufacturing", website: "https://www.carrlane.com", vendor_type: "supplier", categories: ["fixturing"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Vektek", website: "https://www.vektek.com", vendor_type: "supplier", categories: ["fixturing"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Chick Workholding Solutions", website: "https://www.chickworkholding.com", vendor_type: "supplier", categories: ["fixturing"], regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "SMW Autoblok", website: "https://www.smwautoblok.com", vendor_type: "supplier", categories: ["fixturing"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Hardinge", website: "https://www.hardinge.com", vendor_type: "supplier", categories: ["fixturing", "machine-builder"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },

  // --- Coolant / lubricant / metalworking fluids (vendor_type: supplier, category: coolant-lubricant) ---
  { name: "Blaser Swisslube", website: "https://www.blaser.com", vendor_type: "supplier", categories: ["coolant-lubricant"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Master Fluid Solutions (TRIM)", website: "https://www.masterfluidsolutions.com", vendor_type: "supplier", categories: ["coolant-lubricant"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Quaker Houghton", website: "https://www.quakerhoughton.com", vendor_type: "supplier", categories: ["coolant-lubricant"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Hangsterfer's Laboratories", website: "https://www.hangsterfers.com", vendor_type: "supplier", categories: ["coolant-lubricant"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Fuchs Lubricants", website: "https://www.fuchs.com", vendor_type: "supplier", categories: ["coolant-lubricant"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Rustlick (ITW)", website: "https://www.rustlick.com", vendor_type: "supplier", categories: ["coolant-lubricant"], regions: ["US"], pricing_access: "catalog", has_api: false },

  // --- Metrology / inspection (vendor_type: supplier/service, category: inspection-quality) ---
  { name: "Renishaw", website: "https://www.renishaw.com", vendor_type: "supplier", categories: ["inspection-quality"], regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Mitutoyo", website: "https://www.mitutoyo.com", vendor_type: "supplier", categories: ["inspection-quality"], regions: ["US", "EU", "ASIA"], pricing_access: "catalog", has_api: false },
  { name: "Zeiss Industrial Metrology", website: "https://www.zeiss.com/metrology", vendor_type: "supplier", categories: ["inspection-quality"], regions: ["US", "EU"], pricing_access: "quote", has_api: false },

  // --- Service companies (vendor_type: service — repair/retrofit/calibration/integration) ---
  { name: "Tri-Tech", website: null, vendor_type: "service", categories: ["service-company"], regions: ["US"], pricing_access: "quote", has_api: false, verified: false },
  { name: "Methods Machine Tools", website: "https://www.methodsmachine.com", vendor_type: "service", categories: ["service-company", "machine-builder"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Single Source Technologies", website: "https://www.singlesourcetech.com", vendor_type: "service", categories: ["service-company"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Ellison Technologies", website: "https://www.ellisontechnologies.com", vendor_type: "service", categories: ["service-company", "machine-builder"], regions: ["US"], pricing_access: "quote", has_api: false },

  // --- Resellers / broad industrial distributors (vendor_type: reseller) ---
  { name: "Motion Industries", website: "https://www.motionindustries.com", vendor_type: "reseller", categories: ["tooling-consumable", "misc"], regions: ["US", "CA"], pricing_access: "catalog", has_api: false },
  { name: "Applied Industrial Technologies", website: "https://www.applied.com", vendor_type: "reseller", categories: ["tooling-consumable", "misc"], regions: ["US", "CA", "MX"], pricing_access: "catalog", has_api: false },
  { name: "DGI Supply (a DoALL company)", website: "https://www.dgisupply.com", vendor_type: "reseller", categories: ["tooling-consumable", "material"], regions: ["US"], pricing_access: "catalog", has_api: false },

  // --- Outsourcing MARKETPLACES / network platforms (vendor_type: marketplace — ACCESS POINTS to a shop
  //     supply network, NOT individual shops. The actual machine shops in these networks live in the
  //     machine-shop-network registry, scripts/build-machine-shop-network.mjs). ---
  { name: "Xometry", website: "https://www.xometry.com", vendor_type: "marketplace", categories: ["machine-shop"], regions: ["US", "EU"], pricing_access: "api", has_api: true },
  { name: "Protolabs", website: "https://www.protolabs.com", vendor_type: "marketplace", categories: ["machine-shop"], regions: ["US", "EU"], pricing_access: "api", has_api: true },
  { name: "Fictiv", website: "https://www.fictiv.com", vendor_type: "marketplace", categories: ["machine-shop"], regions: ["US"], pricing_access: "api", has_api: true },
  { name: "Hubs (Protolabs Network)", website: "https://www.hubs.com", vendor_type: "marketplace", categories: ["machine-shop"], regions: ["US", "EU"], pricing_access: "api", has_api: true },
  { name: "MFG.com", website: "https://www.mfg.com", vendor_type: "marketplace", categories: ["machine-shop"], regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Thomasnet", website: "https://www.thomasnet.com", vendor_type: "marketplace", categories: ["machine-shop", "misc"], regions: ["US"], pricing_access: "catalog", has_api: false },

  // ===== CATALOG EXPANSION 3 (2026-05-29 — from H:/PRISM/Resources/MANUFACTURER_CATALOGS + IMTS-tier majors + regional dealers) =====

  // --- Cutting-tool makers found in the resources MANUFACTURER_CATALOGS (vendors previously missed) ---
  { name: "M.A. Ford", website: "https://www.maford.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Accupro", website: "https://www.mscdirect.com/accupro", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Ingersoll Cutting Tools", website: "https://www.ingersoll-imc.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Carmex", website: "https://carmex.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["IL", "US", "EU"], pricing_access: "catalog", has_api: false },
  { name: "Mikron Tool", website: "https://us.mikrontool.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["CH", "US", "EU"], pricing_access: "catalog", has_api: false },
  { name: "Dixi Polytool", website: "https://dixipolytool.ch", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["CH", "US", "EU"], pricing_access: "catalog", has_api: false },
  { name: "Applitec", website: "https://www.applitec-tools.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["CH", "US", "EU"], pricing_access: "catalog", has_api: false },
  { name: "Louis Belet", website: "https://www.louisbelet.ch", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["CH", "EU"], pricing_access: "catalog", has_api: false },
  { name: "Fraisa", website: "https://www.fraisa.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["CH", "US", "DE", "EU"], pricing_access: "catalog", has_api: false },
  { name: "Zecha", website: "https://zecha.de", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["DE", "US", "EU"], pricing_access: "catalog", has_api: false },
  { name: "Schwanog", website: "https://www.schwanog.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["DE", "US", "EU"], pricing_access: "catalog", has_api: false },
  { name: "Vergnano", website: "https://vergnano.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["IT", "EU", "US"], pricing_access: "catalog", has_api: false },
  { name: "Mimatic", website: "https://www.mimatic.de", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["DE", "EU"], pricing_access: "catalog", has_api: false },
  { name: "Izar", website: "https://www.izartool.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["ES", "EU"], pricing_access: "catalog", has_api: false },
  { name: "Somta Tools", website: "https://www.somta.co.za", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["ZA", "EU", "US"], pricing_access: "catalog", has_api: false },
  { name: "HAM Praezision", website: "https://ham-tools.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["DE", "EU", "US"], pricing_access: "catalog", has_api: false },
  { name: "LMT Tools", website: "https://www.lmt-tools.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["DE", "EU", "US"], pricing_access: "catalog", has_api: false },
  { name: "Sutton Tools", website: "https://www.suttontools.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["AU", "EU", "US"], pricing_access: "catalog", has_api: false },
  { name: "Magafor", website: "https://magafor.eu", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["FR", "EU", "US"], pricing_access: "catalog", has_api: false },
  { name: "Internal Tool", website: "https://internaltool.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Redline Tools", website: "https://www.redlinetools.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Hertel", website: "https://www.mscdirect.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US", "DE"], pricing_access: "catalog", has_api: false },
  { name: "Kodiak Cutting Tools", website: "https://www.kodiakcuttingtools.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Industrial Tooling Corporation (ITC)", website: "https://www.itc-ltd.co.uk", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["GB", "EU", "US"], pricing_access: "catalog", has_api: false },
  { name: "CGS Tool", website: "https://www.cgstool.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Tru-Edge", website: "https://www.tru-edge.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Hannibal Carbide Tool", website: "https://www.hannibalcarbide.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Toolmex", website: "https://www.toolmex.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US", "PL"], pricing_access: "catalog", has_api: false },
  { name: "Scientific Cutting Tools", website: "https://sct-usa.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Balax", website: "https://www.balax.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Regal Cutting Tools", website: "https://regalcuttingtools.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Greenfield Industries", website: "https://www.gfii.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Viking Drill & Tool", website: "http://www.vikingdrill.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Severance Tool", website: "https://severancetools.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Champion Cutting Tool", website: "https://www.championcuttingtool.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Drillco Cutting Tools", website: "https://drillco-inc.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "KEO Cutters", website: "https://www.archcuttingtools.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Weldon Tool", website: "https://heritagecutter.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Sowa Tool (GS Tooling)", website: "https://www.sowatool.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US", "CA"], pricing_access: "catalog", has_api: false },
  { name: "Hougen", website: "https://hougen.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Triumph Twist Drill", website: "https://www.walter.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Besly Cutting Tools", website: "https://www.besly.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Reiff & Nestor", website: "https://www.rntap.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Super Tool", website: "https://www.supertoolinc.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Whitney Tool", website: "https://www.whitneytool.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Lavallee & Ide", website: "https://lavallee-ide.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Jarvis Cutting Tools", website: "https://www.jarviscuttingtools.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Morse Cutting Tools", website: "https://www.morsecuttingtools.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Precision Twist Drill", website: "https://www.dormerpramet.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "MAPAL", website: "https://mapal.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["DE", "US"], pricing_access: "catalog", has_api: false },
  { name: "Union Butterfield", website: "https://www.dormerpramet.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Komet", website: "https://cuttingtools.ceratizit.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["DE", "US"], pricing_access: "catalog", has_api: false },
  { name: "Star Cutter", website: "https://starcutter.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Drill Masters-Eldorado Tool", website: "https://dmetool.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "F&D Tool", website: "https://fdtool.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Microcut", website: "https://www.microcutusa.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Richards Micro Tool", website: "https://www.richardsmicrotool.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Ultra-Tool International", website: "https://www.ultra-tool.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Advent Tool", website: "https://adventtoolusa.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Gorilla Mill (CGC Tools)", website: "https://gorillamill.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "BIG Kaiser", website: "https://www.bigkaiser.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US", "CH", "JP"], pricing_access: "catalog", has_api: false },
  { name: "Criterion", website: "https://www.alliedmachine.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Mitsubishi Materials", website: "https://www.mmc-carbide.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["JP", "US", "EU"], pricing_access: "catalog", has_api: false },
  { name: "Garant (Hoffmann Group)", website: "https://www.hoffmann-group.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["DE", "US"], pricing_access: "catalog", has_api: false },
  // Adjacent die-shop vendor categories (R43 directory-breadth, 2026-05-31) — "businesses we can add to the prism network" per /goal; directory-only (not cutting-tool catalog makers). Feeds hotel ERP procurement + quoting sourcing. Tool/die steel, workholding, metrology, coatings/heat-treat, die/mold components — all real major suppliers; build dedups vs JM-AP seeds by name.
  { name: "voestalpine Bohler-Uddeholm", website: "https://www.uddeholm.com", vendor_type: "supplier", categories: ["material"], reach: "global", regions: ["AT", "US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Carpenter Technology", website: "https://www.carpentertechnology.com", vendor_type: "supplier", categories: ["material"], reach: "global", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Crucible Industries", website: "https://www.crucible.com", vendor_type: "supplier", categories: ["material"], reach: "national", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Hudson Tool Steel", website: "https://www.hudsontoolsteel.com", vendor_type: "supplier", categories: ["material"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Diehl Tool Steel", website: "https://www.diehlsteel.com", vendor_type: "supplier", categories: ["material"], reach: "national", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Alro Steel", website: "https://www.alro.com", vendor_type: "supplier", categories: ["material"], reach: "national", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Ryerson", website: "https://www.ryerson.com", vendor_type: "supplier", categories: ["material"], reach: "national", regions: ["US"], pricing_access: "quote", has_api: true },
  { name: "Kurt Manufacturing", website: "https://www.kurtworkholding.com", vendor_type: "supplier", categories: ["fixturing"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Jergens", website: "https://www.jergensinc.com", vendor_type: "supplier", categories: ["fixturing"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Carr Lane Manufacturing", website: "https://www.carrlane.com", vendor_type: "supplier", categories: ["fixturing"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "5th Axis", website: "https://www.5thaxis.com", vendor_type: "supplier", categories: ["fixturing"], reach: "national", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Mitee-Bite Products", website: "https://www.miteebite.com", vendor_type: "supplier", categories: ["fixturing"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Mitutoyo", website: "https://www.mitutoyo.com", vendor_type: "supplier", categories: ["inspection-quality"], reach: "global", regions: ["JP", "US", "EU"], pricing_access: "catalog", has_api: false },
  { name: "L.S. Starrett", website: "https://www.starrett.com", vendor_type: "supplier", categories: ["inspection-quality"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Renishaw", website: "https://www.renishaw.com", vendor_type: "supplier", categories: ["inspection-quality"], reach: "global", regions: ["GB", "US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Hexagon Manufacturing Intelligence", website: "https://hexagonmi.com", vendor_type: "supplier", categories: ["inspection-quality"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Oerlikon Balzers", website: "https://www.oerlikon.com/balzers", vendor_type: "service", categories: ["outside-process"], reach: "global", regions: ["LI", "US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Bodycote", website: "https://www.bodycote.com", vendor_type: "service", categories: ["outside-process"], reach: "global", regions: ["GB", "US", "EU"], pricing_access: "quote", has_api: false },
  { name: "IonBond", website: "https://www.ionbond.com", vendor_type: "service", categories: ["outside-process"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Misumi", website: "https://us.misumi-ec.com", vendor_type: "supplier", categories: ["material", "fixturing"], reach: "global", regions: ["JP", "US"], pricing_access: "catalog", has_api: true },
  { name: "DME Company", website: "https://www.dme.net", vendor_type: "supplier", categories: ["material", "misc"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Progressive Components", website: "https://www.procomps.com", vendor_type: "supplier", categories: ["material", "misc"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  // R44 directory-breadth (2026-05-31) — coolant/abrasives/deburr-finishing/MRO businesses a die shop procures from; directory-only network vendors, build dedups by name vs JM-AP seeds.
  { name: "Blaser Swisslube", website: "https://www.blaser.com", vendor_type: "supplier", categories: ["coolant-lubricant"], reach: "global", regions: ["CH", "US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Master Fluid Solutions", website: "https://www.masterfluidsolutions.com", vendor_type: "supplier", categories: ["coolant-lubricant"], reach: "global", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "QualiChem", website: "https://www.qualichem.com", vendor_type: "supplier", categories: ["coolant-lubricant"], reach: "national", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Quaker Houghton", website: "https://www.quakerhoughton.com", vendor_type: "supplier", categories: ["coolant-lubricant"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Norton | Saint-Gobain Abrasives", website: "https://www.nortonabrasives.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US", "EU"], pricing_access: "catalog", has_api: false },
  { name: "3M Abrasive Systems", website: "https://www.3m.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Radiac Abrasives", website: "https://www.radiac.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Camel Grinding Wheels (CGW)", website: "https://www.cgwheels.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Heule Tool", website: "https://www.heule.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["CH", "US"], pricing_access: "catalog", has_api: false },
  { name: "Cogsdill Tool Products", website: "https://www.cogsdill.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Rosler", website: "https://www.rosler.com", vendor_type: "machine-builder", categories: ["machine-builder", "outside-process"], reach: "global", regions: ["DE", "US"], pricing_access: "quote", has_api: false },
  { name: "McMaster-Carr", website: "https://www.mcmaster.com", vendor_type: "marketplace", categories: ["misc"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "MSC Industrial Supply", website: "https://www.mscdirect.com", vendor_type: "marketplace", categories: ["misc", "tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: true },
  { name: "Sumitomo Electric Carbide", website: "https://www.sumicarbide.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Tungaloy", website: "https://www.tungaloyamerica.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Rapidkut", website: "https://www.rapidkut.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  // --- Workholding/fixturing found in the resources catalogs ---
  { name: "Orange Vise", website: "https://www.orangevise.com", vendor_type: "supplier", categories: ["fixturing"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  { name: "Global CNC", website: "https://www.globalcnc.com", vendor_type: "supplier", categories: ["tool-holder", "fixturing"], reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },

  // --- IMTS-tier cutting-tool makers (regular IMTS exhibitors) not yet listed ---
  { name: "Emuge-Franken", website: "https://www.emuge.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Mapal", website: "https://www.mapal.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Paul Horn (Horn USA)", website: "https://www.hornusa.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Ceratizit", website: "https://www.ceratizit.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Allied Machine & Engineering", website: "https://www.alliedmachine.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Dormer Pramet", website: "https://www.dormerpramet.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Korloy", website: "https://www.korloy.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "global", regions: ["US", "ASIA"], pricing_access: "quote", has_api: false },

  // --- CNC controls (IMTS majors) ---
  { name: "Heidenhain", website: "https://www.heidenhain.us", vendor_type: "supplier", categories: ["controls"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Siemens (Motion Control)", website: "https://www.siemens.com", vendor_type: "supplier", categories: ["controls"], reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Mitsubishi Electric Automation", website: "https://www.mitsubishielectric.com", vendor_type: "supplier", categories: ["controls"], reach: "global", regions: ["US", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Fagor Automation", website: "https://www.fagorautomation.com", vendor_type: "supplier", categories: ["controls"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },

  // --- CAM / CAD-CAM software (IMTS West Building regulars) ---
  { name: "Mastercam (CNC Software)", website: "https://www.mastercam.com", vendor_type: "supplier", categories: ["cam-software"], reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "Autodesk (Fusion / PowerMill)", website: "https://www.autodesk.com", vendor_type: "supplier", categories: ["cam-software"], reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "api", has_api: true },
  { name: "Hexagon Manufacturing Intelligence", website: "https://hexagon.com", vendor_type: "supplier", categories: ["cam-software", "inspection-quality"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "OPEN MIND (hyperMILL)", website: "https://www.openmind-tech.com", vendor_type: "supplier", categories: ["cam-software"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "SolidCAM", website: "https://www.solidcam.com", vendor_type: "supplier", categories: ["cam-software"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "CGTech (Vericut)", website: "https://www.cgtech.com", vendor_type: "supplier", categories: ["cam-software"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },

  // --- Metrology / inspection (IMTS Quality pavilion) ---
  { name: "Keyence", website: "https://www.keyence.com", vendor_type: "supplier", categories: ["inspection-quality"], reach: "global", regions: ["US", "ASIA"], pricing_access: "quote", has_api: false },
  { name: "FARO", website: "https://www.faro.com", vendor_type: "supplier", categories: ["inspection-quality"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },

  // --- Automation / pallet / bar feeders (IMTS automation) ---
  { name: "Fastems", website: "https://www.fastems.com", vendor_type: "supplier", categories: ["automation"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "System 3R", website: "https://www.system3r.com", vendor_type: "supplier", categories: ["automation", "fixturing"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Erowa", website: "https://www.erowa.com", vendor_type: "supplier", categories: ["automation", "fixturing"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "LNS America (bar feeders)", website: "https://www.lnsamerica.com", vendor_type: "supplier", categories: ["automation"], reach: "global", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Edge Technologies (bar feeders)", website: "https://www.edgetechnologies.com", vendor_type: "supplier", categories: ["automation"], reach: "national", regions: ["US"], pricing_access: "quote", has_api: false },

  // --- Additive (IMTS Additive pavilion) ---
  { name: "EOS", website: "https://www.eos.info", vendor_type: "machine-builder", categories: ["machine-builder", "additive"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "3D Systems", website: "https://www.3dsystems.com", vendor_type: "machine-builder", categories: ["machine-builder", "additive"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },
  { name: "Markforged", website: "https://www.markforged.com", vendor_type: "machine-builder", categories: ["machine-builder", "additive"], reach: "global", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Desktop Metal", website: "https://www.desktopmetal.com", vendor_type: "machine-builder", categories: ["machine-builder", "additive"], reach: "global", regions: ["US"], pricing_access: "quote", has_api: false },

  // --- Workholding (more IMTS) ---
  { name: "Lang Technik", website: "https://www.lang-technik.com", vendor_type: "supplier", categories: ["fixturing"], reach: "global", regions: ["US", "EU"], pricing_access: "quote", has_api: false },

  // --- Regional machine-tool dealers / distributors (sell the builders' machines + service; reach=regional) ---
  { name: "Gosiger", website: "https://www.gosiger.com", vendor_type: "service", categories: ["service-company", "machine-builder"], reach: "regional", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Hartwig", website: "https://www.hartwiginc.com", vendor_type: "service", categories: ["service-company", "machine-builder"], reach: "regional", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Productivity Inc", website: "https://www.productivity.com", vendor_type: "service", categories: ["service-company", "machine-builder"], reach: "regional", regions: ["US"], pricing_access: "quote", has_api: false },
  { name: "Morris Group", website: "https://www.morrisgroupinc.com", vendor_type: "service", categories: ["service-company", "machine-builder"], reach: "regional", regions: ["US"], pricing_access: "quote", has_api: false },
];

/** Normalize a vendor name → a stable JOIN key. Pure. */
export function normalizeVendorId(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\b(inc|llc|ltd|co|corp|company|incorporated|mfg|manufacturing|technologies|technology|industries|industrial|supply|tools?|products?|international)\b/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

/** Pick the dominant category from a {cat:count} histogram. Pure. */
export function topCategory(catHistogram) {
  const e = Object.entries(catHistogram || {});
  if (!e.length) return "misc";
  return e.sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Build a directory record from a JM cost-index vendor entry. Pure.
 * `v` = {count, spend, categories:{cat:n}, firstDate, lastDate}. Spend is charlie's A/P extraction.
 */
export function vendorRecordFromJm(name, v) {
  const cats = Object.keys(v?.categories || {}).filter((c) => CATEGORIES.includes(c));
  const primary = topCategory(v?.categories);
  return {
    vendor_id: normalizeVendorId(name),
    name,
    source: "jm-ap",
    vendor_type: "supplier", // a JM A/P vendor is something JM buys from; curated merge may refine
    reach: "unknown",        // national/regional/local/global — JM-name-only until enriched
    verified: false,         // JM-name-only until enriched/verified
    categories: cats.length ? cats : [primary],
    primary_category: primary,
    website: null,
    catalog_url: null,
    regions: [],
    pricing_access: "unknown",
    has_api: false,
    contacts: [],
    jm: {
      bill_lines: v?.count ?? 0,
      spend: v?.spend ?? null,
      spend_source: "charlie-ap-extraction",
      advisory: true,
      first_seen: v?.firstDate ?? null,
      last_seen: v?.lastDate ?? null,
    },
  };
}

/** Curated entry → directory record. Pure. */
export function vendorRecordFromCurated(c) {
  return {
    vendor_id: normalizeVendorId(c.name),
    name: c.name,
    source: "curated",
    vendor_type: c.vendor_type || "supplier", // supplier | distributor | reseller | machine-builder | service | machine-shop | marketplace
    reach: c.reach || "national", // global | national | regional | local — brand/distribution footprint
    verified: c.verified !== false && !!c.website, // a real website => verified unless explicitly flagged
    categories: Array.isArray(c.categories) ? c.categories : [],
    primary_category: (c.categories && c.categories[0]) || "misc",
    website: c.website || null,
    catalog_url: c.catalog_url || null,
    regions: Array.isArray(c.regions) ? c.regions : [],
    pricing_access: c.pricing_access || "unknown",
    has_api: !!c.has_api,
    source_tag: c.source_tag || null, // provenance: hand-curated (null) | imts | resources-catalog | thomasnet
    notes: c.notes || null,
    contacts: [],
    jm: null,
  };
}

/**
 * Merge two JM records that collapsed to the same vendor_id (e.g. "STAR ENGINEERING" +
 * "STAR ENGINEERING LLC" — a QuickBooks name-variant dup). Sums spend/bill-lines, unions categories,
 * widens the date range — NEVER silently drops one (R12: a bare Map.set would lose the first's spend).
 * Pure.
 */
export function mergeJmRecords(a, b) {
  const sumSpend = (a.jm?.spend || 0) + (b.jm?.spend || 0);
  const cats = [...new Set([...(a.categories || []), ...(b.categories || [])])];
  const dates = [a.jm?.first_seen, b.jm?.first_seen, a.jm?.last_seen, b.jm?.last_seen].filter(Boolean).sort();
  return {
    ...a,
    name: a.name.length <= b.name.length ? a.name : b.name, // shorter/canonical display name
    categories: cats,
    primary_category: (a.jm?.spend || 0) >= (b.jm?.spend || 0) ? a.primary_category : b.primary_category,
    jm: {
      bill_lines: (a.jm?.bill_lines || 0) + (b.jm?.bill_lines || 0),
      spend: sumSpend || null,
      spend_source: "charlie-ap-extraction",
      advisory: true,
      first_seen: dates[0] || null,
      last_seen: dates[dates.length - 1] || null,
      name_variants: [...new Set([...(a.jm?.name_variants || [a.name]), b.name])],
    },
  };
}

/** Merge a JM record + a curated record on the same vendor_id → one record carrying both. Pure. */
export function mergeRecords(jm, cur) {
  return {
    vendor_id: jm.vendor_id,
    name: cur.name || jm.name, // curated display name is canonical (proper-cased)
    source: "both",
    vendor_type: cur.vendor_type || jm.vendor_type, // curated type refines the JM "supplier" default
    reach: cur.reach && cur.reach !== "unknown" ? cur.reach : jm.reach,
    verified: cur.verified || jm.verified,
    categories: [...new Set([...(jm.categories || []), ...(cur.categories || [])])],
    primary_category: jm.primary_category, // JM spend reality wins for the dominant category
    website: cur.website || jm.website,
    catalog_url: cur.catalog_url || jm.catalog_url,
    regions: cur.regions && cur.regions.length ? cur.regions : jm.regions,
    pricing_access: cur.pricing_access !== "unknown" ? cur.pricing_access : jm.pricing_access,
    has_api: cur.has_api || jm.has_api,
    source_tag: cur.source_tag || jm.source_tag || null,
    notes: cur.notes || jm.notes || null,
    contacts: [...(jm.contacts || []), ...(cur.contacts || [])],
    jm: jm.jm,
  };
}

/**
 * Build the directory: JM seed ⊕ curated catalog, JOIN-keyed on vendor_id, optional hotel-registry
 * enrichment. Pure (takes pre-loaded data, no I/O). Returns { records[], stats }.
 */
export function buildDirectory({ costIndex, curated = CURATED_SUPPLIERS, hotelRegistry = null, extraSources = [] } = {}) {
  const byId = new Map();
  // 1. JM A/P seed
  const jmVendors = (costIndex && costIndex.vendors && typeof costIndex.vendors === "object") ? costIndex.vendors : {};
  for (const [name, v] of Object.entries(jmVendors)) {
    const rec = vendorRecordFromJm(name, v);
    const existing = byId.get(rec.vendor_id);
    // same-id JM vendor (name-variant dup) → merge, don't overwrite (R12: never silently drop spend)
    byId.set(rec.vendor_id, existing ? mergeJmRecords(existing, rec) : rec);
  }
  // 2. curated catalog — merge into matching JM vendor, else add
  for (const c of (Array.isArray(curated) ? curated : [])) {
    const cur = vendorRecordFromCurated(c);
    const existing = byId.get(cur.vendor_id);
    byId.set(cur.vendor_id, existing ? mergeRecords(existing, cur) : cur);
  }
  // 2b. harvested external sources (IMTS / resources-catalog / Thomasnet) — same JOIN-by-id merge.
  // Harvested-only records get source="harvested"; matches into existing vendors enrich them.
  for (const c of (Array.isArray(extraSources) ? extraSources : [])) {
    if (!c || typeof c !== "object" || !c.name) continue;
    const rec = vendorRecordFromCurated(c);
    rec.source = "harvested";
    const existing = byId.get(rec.vendor_id);
    byId.set(rec.vendor_id, existing ? mergeRecords(existing, rec) : rec);
  }
  // 3. hotel ERP registry enrichment (business master: bill-line counts, item categories, dates)
  let hotelMerged = 0;
  const hotelVendors = hotelRegistry && Array.isArray(hotelRegistry.vendors) ? hotelRegistry.vendors
    : hotelRegistry && hotelRegistry.vendors && typeof hotelRegistry.vendors === "object" ? Object.values(hotelRegistry.vendors)
    : [];
  for (const hv of hotelVendors) {
    const id = normalizeVendorId(hv.vendor || hv.name);
    const rec = byId.get(id);
    if (rec) {
      rec.erp_master = {
        bill_line_count: hv.billLineCount ?? null,
        qty_total_reported: hv.qtyTotalReported ?? null,
        item_categories: hv.itemCategories ?? null,
        first_bill_date: hv.firstBillDate ?? null,
        last_bill_date: hv.lastBillDate ?? null,
        source: "hotel-erp-registry",
      };
      hotelMerged++;
    }
  }
  const records = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  const bySource = {}, byCategory = {}, byPricing = {}, byType = {}, byReach = {}, bySourceTag = {};
  for (const r of records) {
    bySource[r.source] = (bySource[r.source] || 0) + 1;
    byCategory[r.primary_category] = (byCategory[r.primary_category] || 0) + 1;
    byPricing[r.pricing_access] = (byPricing[r.pricing_access] || 0) + 1;
    byType[r.vendor_type || "supplier"] = (byType[r.vendor_type || "supplier"] || 0) + 1;
    byReach[r.reach || "unknown"] = (byReach[r.reach || "unknown"] || 0) + 1;
    if (r.source_tag) bySourceTag[r.source_tag] = (bySourceTag[r.source_tag] || 0) + 1;
  }
  return {
    records,
    stats: {
      total: records.length,
      bySource, byCategory, byPricing, byType, byReach, bySourceTag,
      withWebsite: records.filter((r) => r.website).length,
      withApi: records.filter((r) => r.has_api).length,
      needsVerification: records.filter((r) => !r.verified && r.source !== "jm-ap").length,
      hotelMerged,
    },
  };
}

/** Render the directory digest. Pure. */
export function renderDirectoryMd(dir, generatedAtIso) {
  const s = dir.stats;
  const L = [];
  L.push("# VENDOR-DIRECTORY — manufacturing vendor/distributor directory (quoting galaxy)");
  L.push("");
  L.push(`> Generated ${generatedAtIso} · owner: slot:charlie (quoting) · VENDOR-NETWORK-MS0/U-VDN-SEED. Advisory + mustHumanVerify — websites public; contacts/pricing/regions validate before customer-facing RFQ.`);
  L.push("");
  L.push(`**${s.total} vendors** · sources: ${Object.entries(s.bySource).map(([k, v]) => `${k}=${v}`).join(" · ")} · ${s.withWebsite} with website · ${s.withApi} API-capable · ${s.needsVerification} need-verification · ${s.hotelMerged} hotel-ERP-merged`);
  L.push("");
  L.push("## By vendor type");
  L.push("| type | vendors | what |");
  L.push("|------|--------:|------|");
  const typeDesc = { supplier: "buy direct (material/tooling/coolant/holders/fixturing)", distributor: "stocking distributor", reseller: "broad industrial reseller", "machine-builder": "capital equipment (mill/lathe/EDM/grinder)", service: "repair / retrofit / calibration / integration", "machine-shop": "OUTSOURCING partner / overflow network" };
  for (const [t, n] of Object.entries(s.byType).sort((a, b) => b[1] - a[1])) L.push(`| ${t} | ${n} | ${typeDesc[t] || ""} |`);
  L.push("");
  L.push("## By reach (brand/distribution footprint)");
  L.push("| reach | vendors |");
  L.push("|-------|--------:|");
  for (const [r, n] of Object.entries(s.byReach || {}).sort((a, b) => b[1] - a[1])) L.push(`| ${r} | ${n} |`);
  L.push("");
  L.push("_national/global brands are curated here; **regional + local** shops/distributors populate via the Thomasnet harvest (U-VDN-THOMASNET-SEED) + onboarding — not fabricated (R12). Sources include H:/PRISM/Resources/MANUFACTURER_CATALOGS + IMTS exhibitor rosters (web-harvest, no roster in-repo)._");
  L.push("");
  L.push("## By primary category");
  L.push("| category | vendors |");
  L.push("|----------|--------:|");
  for (const [c, n] of Object.entries(s.byCategory).sort((a, b) => b[1] - a[1])) L.push(`| ${c} | ${n} |`);
  L.push("");
  L.push("## Pricing access");
  L.push("| access | vendors | meaning |");
  L.push("|--------|--------:|---------|");
  const mean = { api: "live price/availability (wire to vendor_realtime_price / quoting_mcmaster_quote)", catalog: "web product pages, no API", quote: "RFQ-only → U-VDN-MESSAGING", unknown: "JM-only, access TBD" };
  for (const [a, n] of Object.entries(s.byPricing).sort((x, y) => y[1] - x[1])) L.push(`| ${a} | ${n} | ${mean[a] || ""} |`);
  L.push("");
  L.push("## Curated catalog (the 'all possible vendors' expansion — API-capable first)");
  L.push("| vendor | category | pricing | website |");
  L.push("|--------|----------|---------|---------|");
  const curated = dir.records.filter((r) => r.source !== "jm-ap").sort((a, b) => (b.has_api - a.has_api) || a.name.localeCompare(b.name));
  for (const r of curated) L.push(`| ${r.name} | ${r.primary_category} | ${r.pricing_access} | ${r.website || "—"} |`);
  L.push("");
  L.push("## Next (VENDOR-NETWORK-MS0)");
  L.push("- U-VDN-CATALOG: web-research more suppliers (deep-research) appended to the curated seed.");
  L.push("- U-VDN-INVENTORY-PRICING: wire the `api`/`catalog` vendors to live price/availability.");
  L.push("- U-VDN-CONTACTS-REGIONAL: reps by region (coordinate hotel CRM).");
  L.push("- U-VDN-MESSAGING: contact-a-rep (own email OR PRISM account).");
  L.push("- JOIN: when hotel's `jm-die-vendor-registry.json` lands on main, --hotel-registry merges the ERP master (bill-line counts / item categories / dates).");
  return L.join("\n");
}

function loadJsonSafe(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out-dir") args.outDir = argv[++i];
    else if (argv[i] === "--cost-index") args.costIndex = argv[++i];
    else if (argv[i] === "--hotel-registry") args.hotelRegistry = argv[++i];
    else if (argv[i] === "--sources-dir") args.sourcesDir = argv[++i];
  }
  const outDir = args.outDir || OUT_DIR;
  const costIndexPath = args.costIndex || COST_INDEX;
  const hotelPath = args.hotelRegistry || HOTEL_REGISTRY;

  const costIndex = loadJsonSafe(costIndexPath);
  if (!costIndex) { console.error(`FAIL-LOUD: cost-index not readable at ${costIndexPath} — run ingest-jm-vendor-ap.mjs first`); return 3; }
  const hotelRegistry = existsSync(hotelPath) ? loadJsonSafe(hotelPath) : null;
  const extraSources = loadVendorSources(args.sourcesDir || VENDOR_SOURCES_DIR);

  const dir = buildDirectory({ costIndex, hotelRegistry, extraSources });
  if (dir.records.length === 0) { console.error("FAIL-LOUD: built 0 vendor records"); return 3; }

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const iso = new Date().toISOString().slice(0, 10);
  writeFileSync(join(outDir, "vendor-directory.jsonl"), dir.records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  writeFileSync(join(outDir, "vendor-directory-index.json"), JSON.stringify({ schemaVersion: "1.0.0", generatedAt: iso, stats: dir.stats }, null, 2));
  writeFileSync(join(outDir, "VENDOR-DIRECTORY.md"), renderDirectoryMd(dir, iso));

  console.log(`[build-vendor-directory] ${dir.stats.total} vendors · ${JSON.stringify(dir.stats.bySource)} · ${dir.stats.withWebsite} websites · ${dir.stats.withApi} API · ${dir.stats.hotelMerged} hotel-merged`);
  console.log(`  harvested sources: ${Object.keys(dir.stats.bySourceTag).length ? JSON.stringify(dir.stats.bySourceTag) : "(none — run the harvesters first)"} · loaded ${extraSources.length} source records`);
  console.log(`  → ${join(outDir, "vendor-directory.jsonl")}`);
  console.log(`  → ${join(outDir, "vendor-directory-index.json")}`);
  console.log(`  → ${join(outDir, "VENDOR-DIRECTORY.md")}`);
  if (!hotelRegistry) console.log(`  NOTE: hotel ERP registry absent at ${hotelPath} (pre-golf-merge) — re-run with --hotel-registry after merge to add the business master.`);
  return 0;
}

const invokedDirectly = (() => {
  try { return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
})();
if (invokedDirectly) { process.exit(main(process.argv.slice(2))); }
