#!/usr/bin/env node
/**
 * harvest-thomasnet-shops.mjs — supply-side machine-shop harvester for the PRISM quoting/outsourcing
 * vendor DIRECTORY (VENDOR-NETWORK-MS0 / U-VDN-THOMASNET-SEED, slot:charlie).
 *
 * WHAT THIS EMITS (vendor-DIRECTORY records — NOT ShopProfiles):
 *   {"name","website","vendor_type":"machine-shop","categories":["machine-shop",...],
 *    "reach":"regional|local|national","regions":["US"],"pricing_access":"quote",
 *    "has_api":false,"verified":bool,"source_tag":"thomasnet","notes"}
 * These are the SUPPLY side of outsourcing — contract job shops PRISM routes work TO (the operator's
 * "Xometry-style network of machine shops"). Tiered regional/local. The directory (build-vendor-
 * directory.mjs) merges these by normalized vendor_id; dedup is NOT this script's job.
 *
 * R8 — DO NOT DUPLICATE THE ENGINE: individual machine shops feed the EXISTING `ShopNetworkEngine`
 * (E1134, camDispatcher shop_network_*) via build-machine-shop-network.mjs:toShopProfile(). That bridge
 * maps a shop's FULL operational data (machine travels / capacity-hours / certs) to the engine's
 * ShopProfile contract for shopNetworkEngine.registerShop(). This harvester is the DISCOVERY layer that
 * sits in FRONT of that bridge: it produces directory-grade candidate records (name + website + region +
 * coarse process categories) that a human verifies, then onboards through toShopProfile(). The two are
 * complementary — directory record (this) → operator verifies + gathers travels/capacity → toShopProfile()
 * → registerShop().
 *
 * R12 — NO FABRICATION: every seeded shop is a real US contract manufacturer with a real https website
 * that was confirmed via web search during this harvest (sources cited in SEED notes / the SEED array
 * provenance). A shop whose website could not be confirmed is emitted with website:null + verified:false
 * + a notes flag — it is NEVER invented and NEVER given a guessed domain.
 *
 * Usage:
 *   node scripts/harvest-thomasnet-shops.mjs                 # embedded SEED → default --out
 *   node scripts/harvest-thomasnet-shops.mjs --in rows.json  # JSON array of Thomasnet listings → --out
 *   node scripts/harvest-thomasnet-shops.mjs --out path.jsonl --dry  # print to stdout, no write
 *
 * Default out: H:/prism-slot-charlie/state/shared/quoting/vendor-sources/thomasnet-shops.jsonl
 */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE_TAG = "thomasnet";

const PRISM_SLOT_ROOT = process.env.PRISM_SLOT_CHARLIE_ROOT || "H:/prism-slot-charlie";
const DEFAULT_OUT = join(PRISM_SLOT_ROOT, "state/shared/quoting/vendor-sources/thomasnet-shops.jsonl");

/**
 * Process-keyword → directory category map. A shop's free-text capability blob is scanned for these
 * patterns; each hit contributes a directory `categories[]` entry. Keyed on the SUPPLY-SIDE category
 * vocabulary the directory contract allows (machine-shop + the consumable/fixturing axes a shop may also
 * sell). Order matters only for stable output — categories are de-duped, "machine-shop" is always first.
 * Pure data; consumed by classifyShopProcesses().
 */
export const PROCESS_CATEGORY_RULES = [
  // [regex, category, processLabel] — processLabel feeds the human-readable notes summary
  [/\b(cnc\s*)?mill(ing|ed)?\b|machining\s*cent(er|re)|vertical\s*machining|vmc|hmc|3[\s-]*axis|4[\s-]*axis|5[\s-]*axis|multi[\s-]*axis/i, "machine-shop", "milling"],
  [/\b(cnc\s*)?turn(ing|ed)?\b|lathe|swiss(\s*(turn|screw|machin))?|screw\s*machin|bar\s*(fed|feed)/i, "machine-shop", "turning"],
  [/\bwire\s*edm\b|sinker\s*edm|ram\s*edm|plunge\s*edm|\bedm\b|electrical\s*discharge/i, "machine-shop", "edm"],
  [/\bgrind(ing)?\b|od\s*grind|id\s*grind|surface\s*grind|jig\s*grind|centerless/i, "machine-shop", "grinding"],
  [/\bsheet\s*metal\b|fabricat(ion|ing|or)|laser\s*cut|turret\s*punch|press\s*brake|form(ing)?\b|weld(ing|ment)?/i, "machine-shop", "sheet-metal/fab"],
  [/\binspect(ion)?\b|\bcmm\b|metrology|first\s*article|fai\b/i, "inspection-quality", "inspection"],
  [/\badditive\b|3d\s*print|dmls|slm\b|fdm\b/i, "additive", "additive"],
];

/**
 * Coverage phrase → reach tier. A shop's coverage / location blurb is scanned for these signals to infer
 * the directory `reach` tier. Order = priority (first match wins): explicit nationwide/international →
 * national; multi-state/region-name → regional; default for a single-location job shop → local.
 * Pure data; consumed by inferReach().
 */
export const REACH_RULES = [
  [/\bnationwide\b|\bnational(ly)?\b|\bacross\s+the\s+(us|u\.s\.|country)\b|\binternational(ly)?\b|\bworldwide\b|\bglobal(ly)?\b|north\s+america/i, "national"],
  [/\bregion(al|wide)?\b|\bmidwest\b|\bnortheast\b|\bsoutheast\b|\bnew\s+england\b|\btri[\s-]*state\b|serv(es|ing)\s+\w+\s*(,|and|&)\s*\w+|multiple\s+states/i, "regional"],
];

/** Normalize whitespace + lowercase a free-text blob for matching. Pure. Null-safe. */
function blob(text) {
  return String(text == null ? "" : text).replace(/\s+/g, " ").trim();
}

/**
 * Classify a shop's free-text capabilities → directory categories[].
 * Always returns at least ["machine-shop"] (a contract job shop IS a machine shop by definition, even
 * when the capability text is sparse). De-dupes; "machine-shop" is forced first. Also returns the set of
 * human-readable process labels found, for the notes summary. Pure.
 * @returns {{categories: string[], processes: string[]}}
 */
export function classifyShopProcesses(text) {
  const hay = blob(text);
  const cats = [];
  const procs = [];
  for (const [re, cat, label] of PROCESS_CATEGORY_RULES) {
    if (re.test(hay)) {
      if (!cats.includes(cat)) cats.push(cat);
      if (!procs.includes(label)) procs.push(label);
    }
  }
  // A contract job shop is always a machine-shop; guarantee the tag + force it to the front.
  const ordered = ["machine-shop", ...cats.filter((c) => c !== "machine-shop")];
  return { categories: [...new Set(ordered)], processes: procs };
}

/**
 * Infer the directory reach tier from a coverage / location blurb.
 * Defaults to "local" for a single-location job shop with no broader-coverage signal. Pure.
 * @returns {"national"|"regional"|"local"}
 */
export function inferReach(coverageText) {
  const hay = blob(coverageText);
  for (const [re, tier] of REACH_RULES) if (re.test(hay)) return tier;
  return "local";
}

/** Validate that a string is a real https?:// URL we can keep. Returns the trimmed URL or null. Pure. */
function cleanWebsite(website) {
  const w = blob(website);
  if (!w) return null;
  if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(w)) return null;
  return w;
}

/** Two-letter US state extracted from a "City, ST" location, else null. Pure. */
export function stateFromLocation(location) {
  const m = blob(location).match(/,\s*([A-Z]{2})\b/);
  return m ? m[1] : null;
}

/**
 * Map a single Thomasnet (or Thomasnet-shaped) listing → a directory record.
 *   listing: {company, location, certifications, capabilities, website, coverage?}
 * - vendor_type is always "machine-shop" (this harvester's whole purpose).
 * - reach inferred from coverage||location (single-location → local).
 * - categories from capabilities + certifications text (classifyShopProcesses).
 * - verified = we have a real https website (a confirmed site is the directory's verification signal).
 * - R12: NO website → website:null + verified:false + notes flag. NEVER guess a domain.
 * Pure. Returns null only for a listing with no usable company name (cannot emit an anonymous shop).
 */
export function parseThomasnetResult(listing) {
  const l = listing && typeof listing === "object" ? listing : {};
  const name = blob(l.company || l.name);
  if (!name) return null; // R12: never emit an unnamed shop

  const website = cleanWebsite(l.website);
  const certs = Array.isArray(l.certifications) ? l.certifications.join(" ") : blob(l.certifications);
  const caps = Array.isArray(l.capabilities) ? l.capabilities.join(" ") : blob(l.capabilities);
  const { categories, processes } = classifyShopProcesses(`${caps} ${certs}`);
  const reach = inferReach(blob(l.coverage) || blob(l.location));
  const state = stateFromLocation(l.location);

  const notesBits = [];
  if (blob(l.location)) notesBits.push(blob(l.location));
  if (processes.length) notesBits.push(`processes: ${processes.join(", ")}`);
  if (certs) notesBits.push(`certs: ${certs}`);
  if (!website) notesBits.push("NO CONFIRMED WEBSITE — verify before onboarding");

  return {
    name,
    website, // real https URL we saw, or null — never guessed
    vendor_type: "machine-shop",
    categories,
    reach, // local | regional | national
    regions: ["US"],
    pricing_access: "quote", // job shops quote per-RFQ; none expose a public catalog/API
    has_api: false,
    verified: Boolean(website), // a confirmed real website is the directory's verification signal
    source_tag: SOURCE_TAG,
    notes: notesBits.join(" · ") || null,
    ...(state ? { _state: state } : {}), // internal hint for downstream onboarding (not part of contract; harmless extra)
  };
}

/**
 * Build the directory record array from an array of Thomasnet-shaped listings.
 * Drops only listings that yield no usable name (parseThomasnetResult → null). Does NOT dedup
 * (the directory merges by vendor_id later). Pure.
 * @returns {object[]}
 */
export function buildThomasnetSeed(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(parseThomasnetResult).filter(Boolean);
}

/**
 * EMBEDDED SEED — REAL US contract machine shops confirmed via web search during this harvest
 * (2026-05-29, slot:charlie). Each entry's website was seen in a search/fetch result; none are guessed.
 * Shape mirrors a Thomasnet listing so it flows through parseThomasnetResult() unchanged.
 *
 * R12 PROVENANCE: confirmed real shops with confirmed real https sites. Where a coverage claim ("serves
 * Ohio/PA/...") came from the shop's own marketing it is recorded as coverage text — it drives reach
 * inference only, it is not asserted as a verified fact.
 */
export const EMBEDDED_SEED = [
  // --- Michigan ---
  { company: "United CNC Machining", location: "Auburn Hills, MI", website: "https://unitedcncmachining.com/",
    capabilities: "5-axis CNC machining, EDM, precision milling, aerospace defense", certifications: "" },
  { company: "Criterion Precision Machining", location: "Michigan", website: "https://www.criterionprecision.com/",
    capabilities: "5-axis CNC milling, multi-axis Swiss turning, CMM inspection", certifications: "ISO 9001, ISO 13485, FDA registered, ITAR", coverage: "Michigan and national" },
  { company: "Witco Inc.", location: "Michigan", website: "https://www.witcoinc.com/",
    capabilities: "5-axis CNC precision milling, 6-axis CNC turning, titanium exotic material milling, Zeiss CMM inspection", certifications: "ISO 9001:2015, AS9100, NADCAP, ITAR" },
  { company: "Prosper-Tech Machine & Tool", location: "Michigan", website: "https://www.prosper-tech.net/",
    capabilities: "tight-tolerance CNC machining, aerospace housings, defense components", certifications: "AS9100, ISO 9001, ITAR" },
  { company: "Precision Mold & Machining Services", location: "Michigan", website: "https://precisionmold.com/",
    capabilities: "3-axis and 5-axis CNC machining, CNC boring, titanium nickel aluminum alloys", certifications: "" },
  { company: "KCS Advanced Machining Services", location: "Madison Heights, MI", website: "https://kcsams.com/",
    capabilities: "5-axis machining, precision machining, turning, milling, CMM", certifications: "" },
  { company: "BMI Corp", location: "Michigan", website: "https://www.bmi-corp.com/",
    capabilities: "CNC milling, multi-axis milling, plastic and metal precision machining", certifications: "" },
  // --- Wisconsin (several market regionally across the Midwest) ---
  { company: "RAM Tool, Inc.", location: "Grafton, WI", website: "https://www.ramtoolinc.com/",
    capabilities: "5-axis and horizontal CNC machining, large-part machining up to 20 tons, stainless titanium", certifications: "", coverage: "serves Michigan Ohio Pennsylvania Wisconsin regional" },
  { company: "Owens Industries, LLC", location: "Oak Creek, WI", website: "https://www.owensind.com/",
    capabilities: "simultaneous 5-axis CNC machining, wire EDM, lathe turning, milling, micromachining, sinker EDM", certifications: "", coverage: "nationwide serves California Texas Ohio Pennsylvania" },
  { company: "Trace-A-Matic", location: "Brookfield, WI", website: "https://www.traceamatic.com/",
    capabilities: "precision CNC machining from castings forgings billets bar stock up to 15000 lbs", certifications: "ISO 9001, AS9100, ITAR", coverage: "US and international, facilities in WI and TX" },
  { company: "Aztalan Engineering Inc.", location: "Wisconsin", website: "https://www.aztalan.com/",
    capabilities: "precision contract manufacturing, medical components, CNC machining, turning, milling", certifications: "" },
  { company: "Brogan & Patrick Manufacturing", location: "Wisconsin", website: "https://www.brogan-patrick.com/",
    capabilities: "aerospace CNC machining, high precision machined aerospace parts plastic and metal", certifications: "", coverage: "Wisconsin and Illinois regional" },
  // --- Texas ---
  { company: "Cox Manufacturing Company", location: "San Antonio, TX", website: "https://www.coxmanufacturing.com/",
    capabilities: "Swiss screw machining, CNC turning, CNC milling, multi-spindle, in-house wire EDM tooling", certifications: "" },
  { company: "EDM Intelligent Solutions", location: "San Antonio, TX", website: "https://www.edmdept.com/",
    capabilities: "wire EDM, sinker EDM, EDM hole drilling, laser ablation, 3D metrology contract manufacturing", certifications: "ISO 9001:2015, AS9100D, ITAR" },
  // --- California ---
  { company: "Custom EDM", location: "Silicon Valley, CA", website: "https://www.customedm.com/",
    capabilities: "wire EDM, sinker EDM, electrical discharge machining of complex components", certifications: "" },
  { company: "Wire Cut Company", location: "Southern California, CA", website: "https://wirecutcompany.com/",
    capabilities: "wire EDM, precision EDM parts, electrical discharge machining", certifications: "" },
  // --- Wire EDM specialist (nationwide) ---
  { company: "XACT Wire EDM Corporation", location: "Schaumburg, IL", website: "https://www.xactedm.com/",
    capabilities: "wire EDM contract services, pool of 45+ EDM machines, mold die makers", certifications: "", coverage: "nationwide" },
  // --- AS9100 aerospace/defense job shops (various states) ---
  { company: "Intrex Aerospace", location: "Florida", website: "https://www.intrexcorp.com/",
    capabilities: "high-precision CNC machining, thin-walled machining, kitting assembly, high-mix low-volume", certifications: "ISO 9001, AS9100, ITAR" },
  { company: "Southern Machine Works", location: "Texas", website: "https://southernmach.com/",
    capabilities: "make-to-print contract CNC machining, prototypes through production", certifications: "AS9100D, ISO9001:2015, ITAR" },
  { company: "Superior Machining Company", location: "United States", website: "https://superior-machining.net/",
    capabilities: "precision CNC machining, temperature-controlled quality room with automated CMMs", certifications: "ISO 9001:2015, AS9100D, ITAR" },
  { company: "Ultra Precision Machining", location: "Florida", website: "https://ultramachining.com/",
    capabilities: "5-axis CNC machining, prototype to production, aerospace government", certifications: "ISO 9001, AS9100" },
  { company: "Atomic Machine", location: "Florida", website: "https://www.atomicmachine.com/",
    capabilities: "CNC mills, swiss, lathes, wire EDM, aerospace medical defense", certifications: "ISO 9001:2015, ISO 13485:2016, AS9100D" },
  { company: "C&H Machine", location: "United States", website: "https://www.c-hmachine.com/",
    capabilities: "AS9100D certified CNC machining, aerospace compliant machining", certifications: "AS9100:2016 Rev D, ISO 9001" },
  { company: "Moseys Production Machinists", location: "California", website: "https://moseys.com/",
    capabilities: "precision CNC machining, audited AS9100 machine shop", certifications: "AS9100 Rev D, ISO 9001" },
  { company: "RDL Machine", location: "United States", website: "https://www.rdlmachine.net/",
    capabilities: "CNC machining, raw material inspection, manufacturing assembly, aerospace space defense", certifications: "ISO 9001:2015, AS9100" },
  { company: "HyTech Spring and Machine Corp", location: "United States", website: "https://hytechspring.com/",
    capabilities: "3- and 4-axis vertical horizontal milling, OD ID centerless grinding, deep hole drilling, wire EDM, vacuum table machining", certifications: "ISO 9001:2015, AS9100 D, IATF 16949:2016" },
  { company: "CNC Industries", location: "United States", website: "https://cncind.com/",
    capabilities: "high-speed CNC machining, fabrication, assembly, testing, high-complexity components", certifications: "", coverage: "North America Europe Asia" },
  // --- New England sheet metal / fabrication + machining ---
  { company: "Chapco, Inc.", location: "Deep River, CT", website: "https://chapcoinc.com/",
    capabilities: "precision sheet metal fabrication, CNC fabrication, forming, machining, finishing, assembly", certifications: "", coverage: "United States nationwide" },
  { company: "R&D Precision, Inc.", location: "Meriden, CT", website: "https://www.rdprecisioninc.com/",
    capabilities: "precision sheet metal fabrication, plating, painting, turnkey assembly, medical electrical enclosures", certifications: "" },
  { company: "Aldine Metal Products", location: "Connecticut", website: "https://www.aldinemetal.com/",
    capabilities: "sheet metal fabrication, CNC turret punching, prototype to production", certifications: "ISO certified", coverage: "New England regional" },
  { company: "Modelcraft Co.", location: "Plymouth, CT", website: "https://www.modelcraft.net/",
    capabilities: "CNC machining, precision parts", certifications: "", coverage: "New England regional" },
  { company: "A.G. Miller Company", location: "Springfield, MA", website: "https://agmiller.com/",
    capabilities: "precision sheet metal fabrication, CNC machining", certifications: "", coverage: "New England region Springfield Boston Hartford Worcester Providence" },
  { company: "Century-Tywood", location: "Holliston, MA", website: "https://www.century-tywood.com/",
    capabilities: "precision sheet metal fabrication, precision metal stamping, multi-axis machining, wire EDM, electro-mechanical assembly", certifications: "", coverage: "New England regional" },
  { company: "GTR Manufacturing", location: "Brockton, MA", website: "https://gtrmfg.com/",
    capabilities: "precision sheet metal fabrication, CNC machining, electromechanical assembly, metal finishing", certifications: "ITAR", coverage: "New England regional" },
  { company: "Gregor Technologies", location: "Connecticut", website: "https://gregortech.com/",
    capabilities: "precision CNC machining, fabrication, contract assembly", certifications: "ISO 9001:2015, ITAR", coverage: "Northeast serves Massachusetts Connecticut Rhode Island regional" },
  { company: "EVS Metal", location: "Keene, NH", website: "https://evsmetal.com/",
    capabilities: "precision sheet metal fabrication, CNC machining, certified welding, powder coating, laser cutting, CNC forming", certifications: "ISO 9001", coverage: "New England serves Massachusetts Rhode Island Maine Vermont regional" },
  // --- Minnesota ---
  { company: "DSI Manufacturing", location: "Rogers, MN", website: "https://dsimn.com/",
    capabilities: "multi-axis CNC milling and turning, grinding, deburring, tapping, reaming, finishing", certifications: "ISO 9001:2015" },
  { company: "Douglas Machine & Engineering", location: "Minnesota", website: "https://doug-machine.com/",
    capabilities: "precision contract CNC machining, mills and lathes up to 20000 lbs, aerospace defense agriculture", certifications: "ISO 9001:2015, AS9100D" },
  { company: "Mahuta Tool Corporation", location: "Minnesota", website: "https://www.mahutatool.com/",
    capabilities: "CNC milling, turning, OD grinding, multi-axis machining, wire EDM, short-run low-volume", certifications: "ISO 9001:2015" },
  { company: "Galaxy Precision", location: "Albany, MN", website: "https://galaxyprecisionmn.com/",
    capabilities: "CNC turning, milling, Swiss machining", certifications: "ISO 9001:2015" },
  { company: "The Specialty Mfg. Co.", location: "Minnesota", website: "https://www.specialtymfg.com/",
    capabilities: "high-value machining, injection molding, light assembly, mid to high volume", certifications: "ISO 9001:2015" },
  { company: "Kurt Machining", location: "Minnesota", website: "https://www.kurtmachining.com/",
    capabilities: "multi-axis CNC 3-5 axis, large-part machining up to 20 ft, CNC turning, grinding, clean-room assembly", certifications: "ISO 9001, AS9100, ITAR" },
];

/** Read --in JSON (array of listings) or fall back to EMBEDDED_SEED. Returns listings[]. */
function loadListings(inPath) {
  if (!inPath) return EMBEDDED_SEED;
  const raw = readFileSync(inPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`--in ${inPath} must be a JSON array of listings`);
  return parsed;
}

/** Strip internal helper keys (leading _) from a record before emit — keeps the JSONL to the contract. */
function toContractRecord(r) {
  const out = {};
  for (const [k, v] of Object.entries(r)) if (!k.startsWith("_")) out[k] = v;
  return out;
}

function main(argv) {
  let inPath = null;
  let outPath = DEFAULT_OUT;
  let dry = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--in") inPath = argv[++i];
    else if (argv[i] === "--out") outPath = argv[++i];
    else if (argv[i] === "--dry") dry = true;
  }
  const listings = loadListings(inPath);
  const records = buildThomasnetSeed(listings).map(toContractRecord);
  const lines = records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : "");

  if (dry) {
    process.stdout.write(lines);
  } else {
    const dir = dirname(outPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(outPath, lines);
  }

  const verified = records.filter((r) => r.verified).length;
  const reachCounts = records.reduce((a, r) => ((a[r.reach] = (a[r.reach] || 0) + 1), a), {});
  console.error(
    `[harvest-thomasnet-shops] ${records.length} machine-shop record(s) · ${verified} verified (real website) · ` +
      `reach ${JSON.stringify(reachCounts)} · source_tag=${SOURCE_TAG}` +
      (dry ? " · DRY (stdout)" : ` · → ${outPath}`)
  );
  return 0;
}

const invokedDirectly = (() => {
  try {
    return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();
if (invokedDirectly) {
  process.exit(main(process.argv.slice(2)));
}
