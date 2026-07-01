#!/usr/bin/env node
/**
 * harvest-imts-exhibitors.mjs — IMTS exhibitor harvester for the quoting vendor directory (slot:charlie).
 *
 * IMTS (International Manufacturing Technology Show, McCormick Place Chicago, biennial / even years —
 * 2018, 2022, 2024; 2020 cancelled for COVID) is the largest manufacturing-technology trade show in
 * North America (~1,737 exhibitors in 2024). Its exhibitors ARE the universe of manufacturing
 * suppliers, machine builders, tool/workholding makers, metrology, CAM software, automation and
 * additive vendors — exactly the directory the quoting engine wants to RFQ against.
 *
 * This emits clean per-vendor records keyed for the directory merge (build-vendor-directory.mjs joins
 * on a normalized vendor_id later — DEDUP IS NOT THIS SCRIPT'S JOB). Output record contract:
 *   {name, website|null, vendor_type, categories[], reach, regions[], pricing_access, has_api,
 *    verified, source_tag:"imts", notes?}
 *
 * R12 / no-fabrication: every SEED entry below is a REAL exhibitor confirmed by web search of IMTS
 * 2024 / 2022 / 2018 rosters + press coverage (AMT, Modern Machine Shop, the imts.com directory, and
 * each company's own IMTS announcement). websites are the company's canonical https domain confirmed
 * by those sources. `verified:true` is set only where the company identity AND domain were both
 * confirmed; `verified:false` (+ a notes string) marks the handful where the company is confirmed as
 * an exhibitor but the exact domain still warrants human verification (anti-bot 403 blocked a direct
 * fetch). NEVER invent a company or a URL.
 *
 * Pure exports (unit-tested, no I/O):
 *   - classifyImtsCategory(text)  IMTS product-category text  -> our category vocab token
 *   - parseExhibitorRow(raw)      a directory row {company,website,categories,booth} -> output record
 *   - buildImtsSeed(rows)         rows[] -> records[] (defaults to the embedded SEED)
 *
 * CLI:
 *   node scripts/harvest-imts-exhibitors.mjs                       # embedded seed -> default out
 *   node scripts/harvest-imts-exhibitors.mjs --in rows.jsonl       # parse external rows (JSON or JSONL)
 *   node scripts/harvest-imts-exhibitors.mjs --out path.jsonl      # override output path
 *   node scripts/harvest-imts-exhibitors.mjs --dry-run             # print record count, no write
 *
 * fullHarvestPath (complete ~1,800-exhibitor pull): see FULL_HARVEST_PATH at the bottom.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_TAG = "imts";

// --- category vocabulary (matches build-vendor-directory.mjs + the output contract) ----------------
export const CATEGORY_VOCAB = [
  "tooling-consumable", "material", "machine-builder", "tool-holder", "fixturing",
  "coolant-lubricant", "controls", "cam-software", "automation", "additive",
  "inspection-quality", "machine-shop", "misc",
];

const VENDOR_TYPES = ["supplier", "machine-builder", "service", "reseller", "marketplace", "machine-shop"];
const REACH_LEVELS = ["global", "national", "regional", "local"];
const PRICING_ACCESS = ["api", "catalog", "quote", "unknown"];

/**
 * classifyImtsCategory — map an IMTS product-category string (as the directory labels them) to our
 * category vocabulary. Order matters: more specific phrases are tested before broad fallbacks
 * (e.g. "tool holder" before "tool"; "metalworking fluid" before "material"). Returns "misc" for
 * anything unrecognized rather than guessing.
 */
export function classifyImtsCategory(text) {
  if (text == null) return "misc";
  const t = String(text).toLowerCase().trim();
  if (t === "") return "misc";

  // tool-holders / presetting / collet chucks (test BEFORE generic "tool" / cutting tool)
  if (/tool\s*hold|toolhold|collet|shrink[\s-]*fit|arbor|presett|tool\s*present|er\s*chuck|powrgrip|hsk|capto/.test(t))
    return "tool-holder";
  // workholding / fixturing. NB: leading \b on vise/vice catches "vise(s)"/"vice(s)" but NOT the
  // embedded "vice" in "service"/"device" (no word boundary precedes it there).
  if (/workhold|work\s*hold|fixtur|\bvise|\bvice|chuck|clamp|zero[\s-]*point|pallet|rotary\s*table|indexer|magnet.*hold|vacuum.*hold/.test(t))
    return "fixturing";
  // metalworking fluids / coolant / lubricant (BEFORE "material")
  if (/metalworking\s*flu|cutting\s*flu|coolant|lubric|grinding\s*flu|liquid\s*tool|cutting\s*oil|sump/.test(t))
    return "coolant-lubricant";
  // cutting tools / abrasives / consumables
  if (/cutting\s*tool|end\s*?mill|drill|insert|carbide|abrasiv|grinding\s*wheel|tap\b|reamer|tooling|consumable|hole\s*making|milling\s*cutter/.test(t))
    return "tooling-consumable";
  // CNC controls / drives. NB: probing/probe is metrology — handled by inspection-quality below, NOT here.
  if (/\bcnc\s*control|machine\s*control|\bcontrol(s|ler)\b|sinumerik|fanuc\s*control|servo|drive\b|spindle\s*control/.test(t))
    return "controls";
  // CAD / CAM / software
  if (/cad\s*\/?\s*cam|cad-cam|\bcam\b|\bcad\b|software|programm|simulation|digital\s*twin|nesting|toolpath/.test(t))
    return "cam-software";
  // metrology / inspection / quality (incl. probing — a probe is a metrology sensor, not a CNC control)
  if (/metrolog|inspect|\bcmm\b|measur|gaug|gage|scann(er|ing)|quality\s*assur|\bqa\b|surface\s*finish|optical.*measur|vision\s*system|probing|probe\b/.test(t))
    return "inspection-quality";
  // automation / robotics
  if (/automat|robot|cobot|gantry|bar\s*feed|load\/?unload|gripper|pallet\s*pool|material\s*handl|lights[\s-]*out|conveyor/.test(t))
    return "automation";
  // additive
  if (/additive|3d\s*print|powder\s*bed|directed\s*energy|\bded\b|\bslm\b|\bdmls\b|binder\s*jet|metal\s*powder|laser\s*sinter/.test(t))
    return "additive";
  // machine tools / builders
  if (/machine\s*tool|machining\s*cent|vertical\s*mill|horizontal\s*mill|\bvmc\b|\bhmc\b|lathe|turning\s*cent|grinder|\bedm\b|swiss|five[\s-]*axis\s*machine|\bmill\b/.test(t))
    return "machine-builder";
  // raw material / metal stock
  if (/\bmaterial\b|metal\s*stock|bar\s*stock|tool\s*steel|alloy|titanium|aluminum|stainless|\bsteel\b|plate\b|round\s*stock/.test(t))
    return "material";
  // contract manufacturing / job shop / service providers
  if (/contract\s*manufactur|job\s*shop|machine\s*shop|service\s*provider|heat\s*treat|coating\s*service|outside\s*process/.test(t))
    return "machine-shop";

  return "misc";
}

/**
 * inferVendorType — derive vendor_type from explicit field, else from the resolved categories.
 */
function inferVendorType(raw, categories) {
  if (raw && typeof raw.vendor_type === "string" && VENDOR_TYPES.includes(raw.vendor_type))
    return raw.vendor_type;
  if (categories.includes("machine-builder")) return "machine-builder";
  if (categories.includes("machine-shop")) return "machine-shop";
  if (categories.length === 1 && categories[0] === "cam-software") return "supplier";
  return "supplier";
}

const isHttps = (u) => typeof u === "string" && /^https:\/\/[^\s]+\.[^\s]+/i.test(u.trim());

/**
 * parseExhibitorRow — map a single IMTS-directory row to the output record.
 *   raw = { company, website, categories: string|string[], booth?, vendor_type?, reach?, regions?,
 *           pricing_access?, has_api?, verified?, notes? }
 * `categories` may be a single IMTS label or an array of them; each is classified then de-duped.
 * Returns null for a row with no usable company name (fail-safe, never emits a blank vendor).
 */
export function parseExhibitorRow(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = typeof raw.company === "string" ? raw.company.trim()
             : typeof raw.name === "string" ? raw.name.trim() : "";
  if (name === "") return null;

  // categories: classify each label, drop "misc" duplicates if a real category was found
  let labels = [];
  if (Array.isArray(raw.categories)) labels = raw.categories;
  else if (typeof raw.categories === "string") labels = raw.categories.split(/[;,|]/);
  let cats = [...new Set(labels.map(classifyImtsCategory))];
  const real = cats.filter((c) => c !== "misc");
  if (real.length > 0) cats = real; // keep "misc" only when nothing else classified
  if (cats.length === 0) cats = ["misc"];

  const categories = cats;
  const vendor_type = inferVendorType(raw, categories);

  const website = isHttps(raw.website) ? raw.website.trim() : null;

  const reach = REACH_LEVELS.includes(raw.reach) ? raw.reach : "national";
  const regions = Array.isArray(raw.regions) && raw.regions.length > 0 ? raw.regions : ["US"];
  const pricing_access = PRICING_ACCESS.includes(raw.pricing_access) ? raw.pricing_access : "quote";
  const has_api = raw.has_api === true;
  // verified is true only when explicitly asserted AND a real website is present.
  const verified = raw.verified === true && website !== null;

  const rec = {
    name, website, vendor_type, categories, reach, regions,
    pricing_access, has_api, verified, source_tag: SOURCE_TAG,
  };
  if (typeof raw.notes === "string" && raw.notes.trim() !== "") rec.notes = raw.notes.trim();
  else if (!verified && website === null) rec.notes = "exhibitor confirmed; website needs human verification";
  return rec;
}

/**
 * buildImtsSeed — run every row through parseExhibitorRow, dropping nulls. Defaults to embedded SEED.
 */
export function buildImtsSeed(rows = SEED) {
  return rows.map(parseExhibitorRow).filter((r) => r !== null);
}

// ---------------------------------------------------------------------------------------------------
// SEED — REAL IMTS exhibitors (2024 unless noted; all biennial even-year shows).
// Confirmed by web search of imts.com directory + AMT / Modern Machine Shop / company IMTS press.
// reach: global (multi-continent footprint) | national (US-wide) | regional | local.
// verified:true only where company identity + canonical domain both confirmed; verified:false rows
// carry a notes explaining the residual human-verification need.
// ---------------------------------------------------------------------------------------------------
export const SEED = [
  // === Machine tool builders (Metal Removal Sector) =================================================
  { company: "Haas Automation", website: "https://www.haascnc.com", vendor_type: "machine-builder", categories: "Machine Tools", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true },
  { company: "Mazak", website: "https://www.mazakusa.com", vendor_type: "machine-builder", categories: "Machine Tools", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true },
  { company: "DMG Mori", website: "https://www.dmgmori.com", vendor_type: "machine-builder", categories: "Machine Tools", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true },
  { company: "Okuma", website: "https://www.okuma.com", vendor_type: "machine-builder", categories: "Machine Tools", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true },
  { company: "Makino", website: "https://www.makino.com", vendor_type: "machine-builder", categories: "Machine Tools", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true },
  { company: "DN Solutions (Doosan)", website: "https://www.dn-solutions.com", vendor_type: "machine-builder", categories: "Machine Tools", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true, notes: "formerly Doosan Machine Tools; IMTS 2022 booth #338900" },
  { company: "Hurco", website: "https://www.hurco.com", vendor_type: "machine-builder", categories: "Machine Tools", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true },
  { company: "Hwacheon Machinery America", website: "https://www.hwacheon.com", vendor_type: "machine-builder", categories: "Machining Centers", reach: "global", regions: ["US", "ASIA"], pricing_access: "quote", verified: false, notes: "IMTS 2022/2024 exhibitor; verify US site domain (hwacheon.com vs hwacheonamerica.com)" },
  { company: "Hardinge", website: "https://www.hardinge.com", vendor_type: "machine-builder", categories: "Turning, Grinding Machines", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true, notes: "IMTS 2022 booth #339100; Hauser jig grinders + workholding" },
  { company: "Methods Machine Tools", website: "https://www.methodsmachine.com", vendor_type: "reseller", categories: "Machine Tools", reach: "national", regions: ["US"], pricing_access: "quote", verified: true, notes: "US machine-tool distributor/integrator; Fanuc RoboDrill, Nakamura-Tome" },
  { company: "Hyundai WIA Machine America", website: "https://www.wiamachine.com", vendor_type: "machine-builder", categories: "Machine Tools", reach: "global", regions: ["US", "ASIA"], pricing_access: "quote", verified: true },
  { company: "Tornos Technologies US", website: "https://www.tornos.com", vendor_type: "machine-builder", categories: "Swiss Turning Machines", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true },
  { company: "Tormach", website: "https://tormach.com", vendor_type: "machine-builder", categories: "CNC Machines", reach: "national", regions: ["US"], pricing_access: "catalog", verified: true, notes: "single-phase CNC mills/lathes, PathPilot control" },
  { company: "Sodick", website: "https://www.sodick.com", vendor_type: "machine-builder", categories: "EDM Machines", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true },
  { company: "MC Machinery Systems (Mitsubishi EDM/Laser)", website: "https://www.mcmachinery.com", vendor_type: "machine-builder", categories: "EDM, Laser Machines", reach: "national", regions: ["US"], pricing_access: "quote", verified: true },
  { company: "GF Machining Solutions", website: "https://www.gfms.com", vendor_type: "machine-builder", categories: "EDM, Milling Machines", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true },

  // === Cutting tools / consumables (Tooling & Workholding Sector) ===================================
  { company: "Kennametal", website: "https://www.kennametal.com", vendor_type: "supplier", categories: "Cutting Tools", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true, notes: "IMTS 2024 booth #432324; KCP25C turning grade" },
  { company: "Sandvik Coromant", website: "https://www.sandvik.coromant.com", vendor_type: "supplier", categories: "Cutting Tools", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true },
  { company: "Iscar", website: "https://www.iscar.com", vendor_type: "supplier", categories: "Cutting Tools, Inserts", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true },
  { company: "Tungaloy-NTK America", website: "https://www.tungaloyamerica.com", vendor_type: "supplier", categories: "Cutting Tools, Boring Tools", reach: "global", regions: ["US", "ASIA"], pricing_access: "quote", verified: false, notes: "IMTS 2024 confirmed; verify US domain (tungaloyamerica.com vs tungaloy.com/us)" },
  { company: "Walter Tools", website: "https://www.walter-tools.com", vendor_type: "supplier", categories: "Cutting Tools", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true },
  { company: "Seco Tools", website: "https://www.secotools.com", vendor_type: "supplier", categories: "Cutting Tools", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true },
  { company: "OSG", website: "https://www.osgtool.com", vendor_type: "supplier", categories: "Taps, Drills, End Mills", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true },
  { company: "Mitsubishi Materials (Carbide)", website: "https://www.mitsubishicarbide.com", vendor_type: "supplier", categories: "Cutting Tools, Inserts", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true },
  { company: "Allied Machine and Engineering", website: "https://www.alliedmachine.com", vendor_type: "supplier", categories: "Hole Making, Cutting Tools", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true, notes: "IMTS 2024 booth #431436; Wohlhaupter 3ETECH+" },
  { company: "Harvey Tool", website: "https://www.harveytool.com", vendor_type: "supplier", categories: "End Mills, Specialty Cutting Tools", reach: "national", regions: ["US"], pricing_access: "catalog", verified: true },
  { company: "Guhring", website: "https://www.guhring.com", vendor_type: "supplier", categories: "Drills, Cutting Tools", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true },
  { company: "Norton | Saint-Gobain Abrasives", website: "https://www.nortonabrasives.com", vendor_type: "supplier", categories: "Abrasives, Grinding Wheels", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true },

  // === Tool holders / presetting (Tooling & Workholding) ============================================
  { company: "Haimer USA", website: "https://www.haimer-usa.com", vendor_type: "supplier", categories: "Tool Holders, Shrink Fit", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: false, notes: "IMTS 2024 booth #431510; verify US domain (haimer-usa.com vs haimer.com)" },
  { company: "BIG DAISHOWA", website: "https://www.bigdaishowa.com", vendor_type: "supplier", categories: "Tool Holders, Boring", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: false, notes: "IMTS 2024 booth #431610; formerly BIG KAISER; verify domain (bigdaishowa.com)" },
  { company: "Rego-Fix", website: "https://www.rego-fix.com", vendor_type: "supplier", categories: "Tool Holders, Collets", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true, notes: "PowRgrip toolholding; collaborated with Omega TMM at IMTS 2024" },
  { company: "Lyndex-Nikken", website: "https://www.lyndexnikken.com", vendor_type: "supplier", categories: "Tool Holders, Rotary Tables, Collets", reach: "national", regions: ["US"], pricing_access: "quote", verified: false, notes: "IMTS 2024 directory listed; verify domain (lyndexnikken.com)" },

  // === Workholding / fixturing =====================================================================
  { company: "Schunk", website: "https://schunk.com", vendor_type: "supplier", categories: "Workholding, Grippers", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true, notes: "IMTS 2024 booth #432010" },
  { company: "SMW Autoblok", website: "https://www.smwautoblok.com", vendor_type: "supplier", categories: "Chucks, Workholding, Zero-Point", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: false, notes: "IMTS 2024 booth #431617; WPS XL + e-motion; verify domain (smwautoblok.com)" },
  { company: "Kurt Workholding", website: "https://www.kurtworkholding.com", vendor_type: "supplier", categories: "Vises, Workholding", reach: "national", regions: ["US"], pricing_access: "catalog", verified: false, notes: "IMTS 2024 booth #432433; 5-axis vises; site 403-blocked, verify domain" },
  { company: "5th Axis", website: "https://www.5thaxis.com", vendor_type: "supplier", categories: "Vises, Workholding", reach: "national", regions: ["US"], pricing_access: "catalog", verified: false, notes: "IMTS 2024; LiteVise series; verify domain (5thaxis.com)" },
  { company: "Jergens Inc.", website: "https://www.jergensinc.com", vendor_type: "supplier", categories: "Workholding, Modular Fixturing", reach: "national", regions: ["US"], pricing_access: "catalog", verified: true, notes: "IMTS 2024 booth #432154; Zero Point System, 5-axis vises" },
  { company: "Samchully Workholding", website: "https://www.samchully.com", vendor_type: "supplier", categories: "Chucks, Rotary Tables, Steady Rests", reach: "global", regions: ["US", "ASIA"], pricing_access: "quote", verified: false, notes: "IMTS 2024 directory listed; verify US domain" },
  { company: "Abbott Workholding", website: "https://www.abbottworkholding.com", vendor_type: "supplier", categories: "Chuck Jaws, Workholding", reach: "national", regions: ["US"], pricing_access: "catalog", verified: false, notes: "IMTS 2024 directory listed; verify domain" },
  { company: "Fixtureworks", website: "https://www.fixtureworks.net", vendor_type: "supplier", categories: "Clamps, Fixturing Accessories", reach: "national", regions: ["US"], pricing_access: "catalog", verified: false, notes: "IMTS 2024 booth W-432377; verify domain (fixtureworks.net)" },
  { company: "HWR Workholding USA", website: "https://www.hwr-workholding.com", vendor_type: "supplier", categories: "Zero-Point Workholding, Chucks", reach: "national", regions: ["US"], pricing_access: "quote", verified: false, notes: "IMTS 2024 booth W-431579 (first time); SOLIDLine; verify domain" },
  { company: "Royal Products", website: "https://www.royalproducts.com", vendor_type: "supplier", categories: "Collet Chucks, Bar Feeders, Mist Collectors", reach: "national", regions: ["US"], pricing_access: "catalog", verified: false, notes: "IMTS 2024; Rota-Rack; verify domain (royalproducts.com)" },

  // === Metalworking fluids / coolant ===============================================================
  { company: "Blaser Swisslube", website: "https://www.blaser.com", vendor_type: "supplier", categories: "Metalworking Fluids", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true, notes: "IMTS 2024; Liquid Tool; Skytec for titanium" },
  { company: "Master Fluid Solutions", website: "https://www.masterfluidsolutions.com", vendor_type: "supplier", categories: "Metalworking Fluids, Coolant", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true, notes: "IMTS 2024 booth #431844; TRIM MicroSol" },
  { company: "Oelheld U.S.", website: "https://www.oelheld.com", vendor_type: "supplier", categories: "Cutting Fluids, EDM Dielectric, Filtration", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: false, notes: "IMTS 2024; N.A. reseller of Vomat filtration; verify US domain" },
  { company: "Jorgensen Conveyor and Filtration Solutions", website: "https://www.jorgensenconveyors.com", vendor_type: "supplier", categories: "Coolant Filtration, Conveyors", reach: "national", regions: ["US"], pricing_access: "quote", verified: false, notes: "IMTS 2024; EcoFilter80; verify domain" },

  // === CNC controls / probing ======================================================================
  { company: "Siemens", website: "https://www.siemens.com", vendor_type: "supplier", categories: "CNC Controls, Drives, CAD/CAM/CNC", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true, notes: "IMTS 2024; Sinumerik One; 50th anniversary of Sinumerik" },
  { company: "Heidenhain", website: "https://www.heidenhain.us", vendor_type: "supplier", categories: "CNC Controls, Encoders", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: false, notes: "IMTS 2024; TNC7 control + Acu-Rite; verify US domain (heidenhain.us vs heidenhain.com)" },
  { company: "FANUC America", website: "https://www.fanucamerica.com", vendor_type: "supplier", categories: "CNC Controls, Robots", reach: "global", regions: ["US"], pricing_access: "quote", verified: true, notes: "IMTS 2024; controllers, robots, explosion-proof cobot" },
  { company: "Mitsubishi Electric Automation", website: "https://us.mitsubishielectric.com", vendor_type: "supplier", categories: "CNC Controls, Automation", reach: "global", regions: ["US"], pricing_access: "quote", verified: false, notes: "IMTS 2024; CNC + automation; verify US automation domain" },
  { company: "Renishaw", website: "https://www.renishaw.com", vendor_type: "supplier", categories: "Probing, Metrology", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true, notes: "IMTS 2024 booth #134314; RMP24-micro probe, REVO, Renishaw Central" },

  // === CAD / CAM software ==========================================================================
  { company: "Autodesk", website: "https://www.autodesk.com", vendor_type: "supplier", categories: "CAD/CAM Software", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "api", has_api: true, verified: true, notes: "IMTS 2024; Fusion/PowerMill manufacturing software" },
  { company: "OPEN MIND Technologies (hyperMILL)", website: "https://www.openmind-tech.com", vendor_type: "supplier", categories: "CAM Software", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true, notes: "IMTS 2024; hyperMILL CAM; ORNL hybrid cell" },
  { company: "Verisurf Software", website: "https://www.verisurf.com", vendor_type: "supplier", categories: "Metrology Software, CAD/CAM Inspection", reach: "national", regions: ["US"], pricing_access: "quote", verified: false, notes: "IMTS 2024 exhibitor (AMT list); verify domain (verisurf.com)" },

  // === Metrology / inspection ======================================================================
  { company: "ZEISS Industrial Quality Solutions", website: "https://www.zeiss.com", vendor_type: "supplier", categories: "CMM, Metrology, CT", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true, notes: "IMTS 2024 booth #134302; O-INSPECT duo" },
  { company: "Mitutoyo America", website: "https://www.mitutoyo.com", vendor_type: "supplier", categories: "CMM, Precision Measuring", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true, notes: "IMTS 2024 booth #134117; Legex Takumi; 90th anniversary" },
  { company: "Hexagon Manufacturing Intelligence", website: "https://hexagon.com", vendor_type: "supplier", categories: "CMM, Metrology, CAM (ESPRIT)", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true, notes: "IMTS 2024 Quality Assurance; acquired ESPRIT CAM" },
  { company: "Creaform", website: "https://www.creaform3d.com", vendor_type: "supplier", categories: "3D Scanning, Metrology", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: false, notes: "IMTS 2024 booth #135258; verify domain (creaform3d.com)" },
  { company: "Easy CMM", website: "https://www.easycmm.com", vendor_type: "supplier", categories: "CMM Controllers, Metrology Software", reach: "national", regions: ["US"], pricing_access: "quote", verified: false, notes: "IMTS 2024; Chameleon retrofit controller, Mediator software; verify domain" },

  // === Automation / robotics =======================================================================
  { company: "Yaskawa America (Motoman)", website: "https://www.yaskawa.com", vendor_type: "supplier", categories: "Robots, Automation", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true, notes: "IMTS 2024; robot in ORNL hybrid cell" },
  { company: "Universal Robots", website: "https://www.universal-robots.com", vendor_type: "supplier", categories: "Cobots, Automation", reach: "global", regions: ["US", "EU", "ASIA"], pricing_access: "quote", verified: true, notes: "IMTS 2024; with Lights Out Mfg RoboWrench cell" },
  { company: "Fastems", website: "https://www.fastems.com", vendor_type: "supplier", categories: "Pallet Pools, CNC Automation", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true, notes: "IMTS 2024 booth #338966" },
  { company: "Erowa", website: "https://www.erowa.com", vendor_type: "supplier", categories: "Automation, Pallet Changers, Tooling", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: false, notes: "IMTS 2024; verify US domain (erowa.com)" },
  { company: "System 3R", website: "https://www.system3r.com", vendor_type: "supplier", categories: "Automation, Tooling, AMR", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: false, notes: "IMTS 2024; WorkPartner 1+; part of GF; verify domain" },
  { company: "VersaBuilt Robotics", website: "https://www.versabuilt.com", vendor_type: "supplier", categories: "CNC Automation, Robotics, Workholding", reach: "national", regions: ["US"], pricing_access: "quote", verified: false, notes: "IMTS exhibitor; Mill/Lathe automation + MultiGrip; site fetch timed out, verify domain" },
  { company: "Caron Engineering", website: "https://www.caroneng.com", vendor_type: "supplier", categories: "Tool Monitoring, Automation, Process Control", reach: "national", regions: ["US"], pricing_access: "quote", verified: true, notes: "IMTS 2024 booth #134742; TMAC, ToolConnect, DTect-IT" },
  { company: "Gimbel Automation", website: "https://www.gimbelautomation.com", vendor_type: "supplier", categories: "Robotic Grippers, Automation", reach: "national", regions: ["US"], pricing_access: "quote", verified: false, notes: "IMTS 2024 booth #236331 (first time); CNC Spindle Grippers; verify domain" },
  { company: "Copia Automation", website: "https://www.copia.io", vendor_type: "supplier", categories: "PLC Programming, Version Control", reach: "national", regions: ["US"], pricing_access: "quote", verified: false, notes: "IMTS 2024 booth #236313 (first time); Git-based PLC tooling; verify domain" },

  // === Additive manufacturing ======================================================================
  { company: "EOS North America", website: "https://www.eos.info", vendor_type: "supplier", categories: "Additive, Laser Powder Bed Fusion", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true, notes: "IMTS 2024 booth #432302" },
  { company: "Velo3D", website: "https://www.velo3d.com", vendor_type: "supplier", categories: "Additive, Metal 3D Printing", reach: "global", regions: ["US"], pricing_access: "quote", verified: false, notes: "IMTS 2024 AM Sector (laser powder bed fusion); verify domain" },
  { company: "3D Systems", website: "https://www.3dsystems.com", vendor_type: "supplier", categories: "Additive, 3D Printing", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true, notes: "IMTS 2024 AM Sector" },
  { company: "Nikon SLM Solutions", website: "https://www.nikon-slm-solutions.com", vendor_type: "supplier", categories: "Additive, Laser Powder Bed Fusion", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: false, notes: "IMTS 2024 (as SLM Solutions, now Nikon SLM); verify domain" },
  { company: "AddUp", website: "https://www.addupsolutions.com", vendor_type: "supplier", categories: "Additive, Metal 3D Printing", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: false, notes: "IMTS 2024 AM Sector; verify domain" },
  { company: "Xact Metal", website: "https://www.xactmetal.com", vendor_type: "supplier", categories: "Additive, Metal 3D Printing", reach: "national", regions: ["US"], pricing_access: "quote", verified: false, notes: "IMTS 2024 AM Sector; verify domain" },
  { company: "Formlabs", website: "https://www.formlabs.com", vendor_type: "supplier", categories: "Additive, SLA 3D Printing", reach: "global", regions: ["US", "EU"], pricing_access: "catalog", verified: true, notes: "IMTS 2024; Form 4 printer" },
  { company: "TRUMPF", website: "https://www.trumpf.com", vendor_type: "machine-builder", categories: "Laser, Additive, Machine Tools", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: true, notes: "IMTS 2024; laser powder bed fusion + laser machines" },
  { company: "Colibrium Additive (GE Aerospace)", website: "https://www.colibriumadditive.com", vendor_type: "supplier", categories: "Additive, Metal Powders", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: false, notes: "IMTS 2024 booth #433200 (first time); GE Aerospace company; verify domain" },
  { company: "Linde Advanced Material Technologies", website: "https://www.linde-amt.com", vendor_type: "supplier", categories: "Additive, Metal Powders, Gases", reach: "global", regions: ["US", "EU"], pricing_access: "quote", verified: false, notes: "IMTS 2024 booth #433116; TruForm powders; verify domain" },
  { company: "GKN Additive (Forecast 3D)", website: "https://www.forecast3d.com", vendor_type: "service", categories: "Additive Service Provider, Rapid Machining", reach: "national", regions: ["US"], pricing_access: "quote", verified: false, notes: "IMTS 2024 booth #433118; contract AM; verify domain" },

  // === MRO / distributors at IMTS ==================================================================
  { company: "MSC Industrial Supply", website: "https://www.mscdirect.com", vendor_type: "reseller", categories: "Tooling, Material, MRO", reach: "national", regions: ["US"], pricing_access: "api", has_api: true, verified: true, notes: "IMTS 2024; tooling in ORNL hybrid cell" },
];

// ---------------------------------------------------------------------------------------------------
// fullHarvestPath — how a COMPLETE ~1,800-exhibitor pull works (this seed is a curated ~70-vendor slice).
// ---------------------------------------------------------------------------------------------------
export const FULL_HARVEST_PATH = {
  source: "IMTS official exhibitor directory (MapYourShow platform)",
  directoryUrl: "https://directory.imts.com/8_0/exhview/index.cfm",
  exhibitorListUrl: "https://www.imts.com/exhibitor/index.cfm",
  perExhibitorUrlPattern: "https://directory.imts.com/8_0/exhibitor/{EXHID}/{Company-Slug}",
  approxExhibitors: 1737, // IMTS 2024 official count (1,737 exhibiting companies)
  cadence: "biennial, even years (2018, 2022, 2024, 2026); 2020 cancelled (COVID)",
  steps: [
    "1. The directory runs on MapYourShow (directory.imts.com/8_0). Each exhibitor has a stable numeric ExhID and a /exhibitor/{ExhID}/{slug} detail page carrying: company name, product categories (IMTS' own taxonomy), booth, and an outbound company website link.",
    "2. Enumerate the full exhibitor index via the A-Z / category browse endpoints (directory.imts.com/8_0/explore/ + /floorplan filters). MapYourShow exposes a JSON-ish search endpoint (mapyourshow's /onlineFloorPlan/searchExhibitors) that returns paginated exhibitor stubs {ExhID, name, booth}; paginate until exhausted (~1,800 rows).",
    "3. For each ExhID, fetch the detail page and extract {company, website, categories[], booth}. The IMTS product-category labels map 1:1 through classifyImtsCategory() in this script.",
    "4. Feed each row through parseExhibitorRow() to emit a clean record. set verified:true only after confirming the outbound website resolves to a live company site (HEAD 200 + title match); leave verified:false + notes otherwise.",
    "5. Pipe rows in via --in <rows.jsonl> (one {company,website,categories,booth} per line) so this script does the classification + record shaping; the directory's build-vendor-directory.mjs then merges on normalized vendor_id.",
    "Politeness: respect robots.txt + throttle (the AMT/MapYourShow CDN rate-limits; many company sites 403 bot fetches). Historical 2018/2022 rosters are reachable by swapping the show-year directory path or via archived AMT post-show reports.",
  ],
  emitVia: "node scripts/harvest-imts-exhibitors.mjs --in <scraped-rows.jsonl> --out <imts-exhibitors.jsonl>",
};

// --- CLI -------------------------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { in: null, out: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in") args.in = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
  }
  return args;
}

function loadRows(inPath) {
  const txt = readFileSync(inPath, "utf8").trim();
  if (txt === "") return [];
  // Accept a JSON array, or JSONL (one object per line).
  if (txt.startsWith("[")) return JSON.parse(txt);
  return txt.split(/\r?\n/).filter((l) => l.trim() !== "").map((l) => JSON.parse(l));
}

function main() {
  const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism-slot-charlie";
  const args = parseArgs(process.argv.slice(2));
  const outPath = args.out || resolve(PRISM_ROOT, "state/shared/quoting/vendor-sources/imts-exhibitors.jsonl");

  const rows = args.in && existsSync(args.in) ? loadRows(args.in) : SEED;
  const records = buildImtsSeed(rows);

  if (args.dryRun) {
    const verifiedCount = records.filter((r) => r.verified).length;
    console.log(`[harvest-imts] ${records.length} records (${verifiedCount} verified) — dry run, no write`);
    return;
  }

  mkdirSync(dirname(outPath), { recursive: true });
  const jsonl = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
  writeFileSync(outPath, jsonl, "utf8");
  const verifiedCount = records.filter((r) => r.verified).length;
  console.log(`[harvest-imts] wrote ${records.length} records (${verifiedCount} verified, ${records.length - verifiedCount} need-verify) -> ${outPath}`);
}

// invokedDirectly guard (argv[1] is undefined under `node -e` / pure import — guard against it)
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
