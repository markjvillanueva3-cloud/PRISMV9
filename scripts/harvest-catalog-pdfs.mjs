#!/usr/bin/env node
/**
 * harvest-catalog-pdfs.mjs — manufacturer-catalog-PDF vendor harvester (VENDOR-NETWORK-MS0, slot:charlie).
 *
 * Turns the PDF catalogs PRISM actually has on disk (H:/PRISM/Resources/MANUFACTURER_CATALOGS
 * + OKUMA MULTUS PDFS + PDF) into clean vendor-directory records keyed for the downstream
 * merge in scripts/build-vendor-directory.mjs (loadVendorSources -> merge by vendor_id).
 *
 * Each PDF filename is mapped (heuristically) to the manufacturer that publishes it. We emit ONE
 * record per DISTINCT manufacturer found across the scanned tree (a maker with 8 Sandvik/Kennametal
 * volumes collapses to a single vendor record). source_tag = "resources-catalog".
 *
 * R12 / no-fabrication: a record is `verified:true` + a real https website ONLY when that maker was
 * confirmed via a web search the harvester author actually ran (see CONFIRMED_VENDORS below — every
 * URL there was seen in a live WebSearch result, not guessed). Any filename whose maker cannot be
 * confidently named, or whose site was not confirmed, is emitted with website:null + verified:false
 * + a `notes` saying it needs verification. We NEVER invent a company name or a URL.
 *
 * Pure exports (no I/O, importable + unit-tested):
 *   vendorFromCatalogFilename(filename) -> clean maker name | null
 *   classifyCatalogCategory(filename)   -> category-vocab string[]
 *   buildCatalogSeed(filenames)         -> records[]  (one per distinct maker)
 *
 * CLI:
 *   node scripts/harvest-catalog-pdfs.mjs                       # scan defaults, emit to default out
 *   node scripts/harvest-catalog-pdfs.mjs --dir <d> [--dir <d2>...] --out <file>
 *   node scripts/harvest-catalog-pdfs.mjs --dry-run            # print records, do not write
 */
import { readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// CONFIRMED vendors — name (canonical) -> { website, vendor_type, reach, regions, pricing_access, has_api }
// Every website here was seen in a live WebSearch result during authoring (R12). Keys are the
// canonical maker names returned by vendorFromCatalogFilename(); a confirmed entry sets verified:true.
// ---------------------------------------------------------------------------
const CONFIRMED_VENDORS = {
  "BIG Daishowa":            { website: "https://www.bigdaishowa.com/en", vendor_type: "supplier", reach: "global", regions: ["US", "JP", "EU"], pricing_access: "catalog", has_api: false },
  "REGO-FIX":                { website: "https://us.rego-fix.com/en", vendor_type: "supplier", reach: "global", regions: ["US", "CH", "EU"], pricing_access: "catalog", has_api: false },
  "Guhring":                 { website: "https://guhring.com/", vendor_type: "supplier", reach: "global", regions: ["US", "DE"], pricing_access: "catalog", has_api: false },
  "EMUGE-FRANKEN":           { website: "https://www.emuge-franken-group.com/de/en/", vendor_type: "supplier", reach: "global", regions: ["US", "DE"], pricing_access: "catalog", has_api: false },
  "Allied Machine & Engineering": { website: "https://www.alliedmachine.com/", vendor_type: "supplier", reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  "M.A. Ford":               { website: "https://www.maford.com/", vendor_type: "supplier", reach: "global", regions: ["US", "EU"], pricing_access: "catalog", has_api: false },
  "OSG":                     { website: "https://osgtool.com/", vendor_type: "supplier", reach: "global", regions: ["US", "JP"], pricing_access: "catalog", has_api: false },
  "KYOCERA SGS Precision Tools": { website: "https://www.kyocera-sgstool.com/", vendor_type: "supplier", reach: "global", regions: ["US", "JP", "EU"], pricing_access: "catalog", has_api: false },
  "Sandvik Coromant":        { website: "https://www.sandvik.coromant.com/", vendor_type: "supplier", reach: "global", regions: ["US", "SE", "EU"], pricing_access: "catalog", has_api: false },
  "Kennametal":              { website: "https://www.kennametal.com/", vendor_type: "supplier", reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false },
  "Korloy":                  { website: "https://www.korloy.com/", vendor_type: "supplier", reach: "global", regions: ["KR", "US"], pricing_access: "catalog", has_api: false },
  "Tungaloy":                { website: "https://tungaloy.com/", vendor_type: "supplier", reach: "global", regions: ["JP", "US"], pricing_access: "catalog", has_api: false },
  "Sumitomo Electric Carbide": { website: "https://sumicarbide.com/", vendor_type: "supplier", reach: "global", regions: ["US", "JP"], pricing_access: "catalog", has_api: false },
  "ISCAR":                   { website: "https://www.iscar.com/", vendor_type: "supplier", reach: "global", regions: ["IL", "US"], pricing_access: "catalog", has_api: false },
  "Ingersoll Cutting Tools": { website: "https://www.ingersoll-imc.com/", vendor_type: "supplier", reach: "global", regions: ["US", "DE"], pricing_access: "catalog", has_api: false },
  "Walter":                  { website: "https://www.walter-tools.com/", vendor_type: "supplier", reach: "global", regions: ["DE", "US"], pricing_access: "catalog", has_api: false },
  "Global CNC Industries":   { website: "https://www.globalcnc.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  "Orange Vise":             { website: "https://www.orangevise.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  "Accupro":                 { website: "https://www.mscdirect.com/products/accupro-brand", vendor_type: "reseller", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "MSC Industrial Supply house brand (not a standalone maker)" },
  "Rapidkut":                { website: "https://catalogs.rapidkut.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  "Paul Horn (Horn USA)":    { website: "https://www.hornusa.com/", vendor_type: "supplier", reach: "global", regions: ["US", "DE"], pricing_access: "quote", has_api: false },
  "Carmex":                  { website: "https://carmex.com/", vendor_type: "supplier", reach: "global", regions: ["IL", "US", "EU"], pricing_access: "catalog", has_api: false },
  "Mikron Tool":             { website: "https://us.mikrontool.com/", vendor_type: "supplier", reach: "global", regions: ["CH", "US", "EU"], pricing_access: "catalog", has_api: false },
  "Dixi Polytool":           { website: "https://dixipolytool.ch/", vendor_type: "supplier", reach: "global", regions: ["CH", "US", "EU"], pricing_access: "catalog", has_api: false },
  "Applitec":                { website: "https://www.applitec-tools.com/", vendor_type: "supplier", reach: "global", regions: ["CH", "US", "EU"], pricing_access: "catalog", has_api: false },
  "Louis Belet":             { website: "https://www.louisbelet.ch/", vendor_type: "supplier", reach: "global", regions: ["CH", "EU"], pricing_access: "catalog", has_api: false },
  "Fraisa":                  { website: "https://www.fraisa.com/", vendor_type: "supplier", reach: "global", regions: ["CH", "US", "DE", "EU"], pricing_access: "catalog", has_api: false },
  "Zecha":                   { website: "https://zecha.de/", vendor_type: "supplier", reach: "global", regions: ["DE", "US", "EU"], pricing_access: "catalog", has_api: false },
  "Schwanog":                { website: "https://www.schwanog.com/", vendor_type: "supplier", reach: "global", regions: ["DE", "US", "EU"], pricing_access: "catalog", has_api: false },
  "Vergnano":                { website: "https://vergnano.com/", vendor_type: "supplier", reach: "global", regions: ["IT", "EU", "US"], pricing_access: "catalog", has_api: false },
  "Mimatic":                 { website: "https://www.mimatic.de/", vendor_type: "supplier", reach: "global", regions: ["DE", "EU"], pricing_access: "catalog", has_api: false },
  "Izar":                    { website: "https://www.izartool.com/", vendor_type: "supplier", reach: "global", regions: ["ES", "EU"], pricing_access: "catalog", has_api: false },
  "Somta Tools":             { website: "https://www.somta.co.za/", vendor_type: "supplier", reach: "global", regions: ["ZA", "EU", "US"], pricing_access: "catalog", has_api: false },
  "HAM Praezision":          { website: "https://ham-tools.com/", vendor_type: "supplier", reach: "global", regions: ["DE", "EU", "US"], pricing_access: "catalog", has_api: false },
  "LMT Tools":               { website: "https://www.lmt-tools.com/", vendor_type: "supplier", reach: "global", regions: ["DE", "EU", "US"], pricing_access: "catalog", has_api: false },
  "Sutton Tools":            { website: "https://www.suttontools.com/", vendor_type: "supplier", reach: "global", regions: ["AU", "EU", "US"], pricing_access: "catalog", has_api: false },
  "Magafor":                 { website: "https://magafor.eu/", vendor_type: "supplier", reach: "global", regions: ["FR", "EU", "US"], pricing_access: "catalog", has_api: false },
  "Internal Tool":           { website: "https://internaltool.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  "Redline Tools":           { website: "https://www.redlinetools.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  "Hertel":                  { website: "https://www.mscdirect.com/", vendor_type: "supplier", reach: "national", regions: ["US", "DE"], pricing_access: "catalog", has_api: false, notes: "Historic German carbide manufacturer brand; today MSC Industrial's exclusive professional brand (distinct from Kennametal's current lineup) — S/F data is the current MSC Hertel brand" },
  "Kodiak Cutting Tools":    { website: "https://www.kodiakcuttingtools.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  "Industrial Tooling Corporation (ITC)": { website: "https://www.itc-ltd.co.uk/", vendor_type: "supplier", reach: "global", regions: ["GB", "EU", "US"], pricing_access: "catalog", has_api: false, notes: "UK solid-carbide milling/turning/boring + tapping/threading + microtools; Harvey Performance Company brand (sibling to Harvey Tool, distinct UK product line + own cutting-data sheets)" },
  "CGS Tool":                { website: "https://www.cgstool.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US Made-in-USA solid-carbide end mills — full catalog + 6 per-series speeds/feeds sheets (GP/Ferocious-3X/HV-Beast/VMAX/EF-5/Storm)" },
  "Tru-Edge":                { website: "https://www.tru-edge.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false },
  "Hannibal Carbide Tool":   { website: "https://www.hannibalcarbide.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US carbide-tipped + solid-carbide reamers/drills/counterbores/end-mills; multiple dedicated S/F docs (reaming, keyseat)" },
  "Toolmex":                 { website: "https://www.toolmex.com/", vendor_type: "supplier", reach: "national", regions: ["US", "PL"], pricing_access: "catalog", has_api: false, notes: "TMX cutting tools (drills/reamers/taps/end-mills) + comprehensive technical reference w/ S/F" },
  "Scientific Cutting Tools": { website: "https://sct-usa.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (family-owned 1963) thread mills / port tools / custom; thread-milling S/F" },
  "Balax":                   { website: "https://www.balax.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US forming + cutting taps ('least-cost tapped hole'); pre-tap hole size + tapping speed/torque recommendations" },
  "Regal Cutting Tools":     { website: "https://regalcuttingtools.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (since 1955; acquired National Twist Drill 1985) drills/taps/dies/reamers/end-mills incl. Triple Crown; full catalog has Tap Speed Table + Drill Cutting Speeds + Spotting/Royal Drill S/F charts (own site hotlink-protected; pulled via productivity.com distributor mirror)" },
  "Greenfield Industries":   { website: "https://www.gfii.com/", vendor_type: "supplier", reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "Parent of Cleveland / Chicago-Latrobe / Cle-Line / Greenfield Threading / Bassett / Vermont Tap / Putnam — drills/taps/dies/reamers/end-mills; Top-Eastern group (world's largest twist-drill maker). Cleveland Application Catalog carries S/F application data" },
  "Viking Drill & Tool":     { website: "http://www.vikingdrill.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US HSS drills/taps/dies/annular-cutters/burrs (NAS 907); sibling brand Norseman shares the product line; dedicated Drill + Tap feeds/speeds reference" },
  "Severance Tool":          { website: "https://severancetools.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (Saginaw MI, since 1931) HSS + carbide specialty: Midget Mills, Chatterless Countersinks, center reamers, rotary files/burs; per-tool material/application guidance" },
  "Champion Cutting Tool":   { website: "https://www.championcuttingtool.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US HSS taps/dies, Brute Platinum + XL annular cutters, HSS end mills/drills; Product Line Catalog 2023" },
  "Drillco Cutting Tools":   { website: "https://drillco-inc.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (family-owned since 1978) drills/taps/dies/reamers/burs/annular-cutters/countersinks/end-mills in HSS/Cobalt/Solid-Carbide; full catalog carries Drill + 710-Series + Annular + End Mill feeds/speeds + tap-drill charts (own-site hotlink-protected; pulled via technitoolinc.com distributor mirror)" },
  "KEO Cutters":             { website: "https://www.archcuttingtools.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US toolroom/die line (now Arch Cutting Tools-KEO): combined drill & countersinks, Kounterbores, countersinks, center reamers, deburring tools, drills, end mills/milling cutters; catalog has countersink/counterbore RPM recommendations (pulled via irp-cdn distributor mirror)" },
  // (Emuge-Franken already tracked at line ~42 as canonical "EMUGE-FRANKEN" — R33 pulled Catalogue 520 as an AUGMENT, no new wiring)
  "Weldon Tool":             { website: "https://heritagecutter.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (Cleveland OH; now Heritage Cutter / Dauphin Precision Tool) HSS+carbide end mills, Crest-Kut/Bulldog roughers, keyseat / T-slot / corner-rounding / single-angle cutters; catalog carries Speed & Feed Data for conventional + Crest-Kut/Bulldog end mills + suggested cutting speeds (pulled via technitoolinc.com mirror). NOTE: 'Weldon' is also the flat-shank standard — rule anchors on 'weldon tool' to avoid mis-classing other makers' weldon-shank files" },
  "Sowa Tool (GS Tooling)":  { website: "https://www.sowatool.com/", vendor_type: "supplier", reach: "national", regions: ["US","CA"], pricing_access: "catalog", has_api: false, notes: "Canadian/US distributor + house cutting-tool brand GS Tooling: carbide + HSS/HSCO end mills (GP/ball/rougher/corner-radius/tapered), threading taps, drills; Master Catalogue + per-line GS catalogs carry a dedicated Speeds & Feeds section (parent-group: 4 cutting-tool PDFs wired as ONE maker; toolholding/workholding/measuring/vise lines excluded as non-S/F)" },
  "Hougen":                  { website: "https://hougen.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (invented the annular/Rotabroach cutter 1974) annular cutters / hole-making + portable mag drills; dedicated Cutter Speed & Feeds Formulas + annular Cutter-Chart + 2025 full catalog (own-site /wp-content/uploads, discovery-Workflow-verified); die-shop hole-making relevant" },
  "Triumph Twist Drill":     { website: "https://www.walter.com/us/category/Brands/TRIUMPH", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US HSS+cobalt twist drills (jobber/mechanic/screw-machine/S&D/aircraft), ThunderBit, taps, reamers, annular cutters; now under Walter Surface Technologies — own-site PDFs dead, pulled via carbideprocessors.com mirror; catalog has feed-per-rev S/F tables by dia range + deep-hole reduction chart" },
  "Besly Cutting Tools":     { website: "https://www.besly.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US HSS taps (cut & form) / threading dies / drills / end mills / gages; End Mill catalog carries 'Recommended Cutting Feeds & Speeds' chart + Machining Formulas (pulled via technitoolinc.com mirror); die-shop tapping relevant" },
  "Reiff & Nestor":          { website: "https://www.rntap.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US taps (HSS standard/special, spiral-point, spiral-flute, thread-forming), dies, Nu-trix thread restorers, pipe taps (NPT/NPTF/BSPT); full catalog has Tap Recommendations for Classes 2B & 3B + dimensions; die-shop tapping/threading core" },
  "Super Tool":              { website: "https://www.supertoolinc.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US countersinks / counterbores / combined drill-countersinks / drills / reamers / keyseat / T-slot / dovetail cutters; THREE dedicated S/F charts (drilling, reaming, counterbore — carbide-tipped, SFM/feed incl. dry-vs-coolant) + 2023 catalog; high die-shop relevance (drilling/reaming/counterboring/countersinking)" },
  "Whitney Tool":            { website: "https://www.whitneytool.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US counterbores (cap-screw + interchangeable-pilot) / combined drill-countersinks / Woodruff-keyseat / T-slot / dovetail / chamfer cutters / tapered end mills; main catalog has 'Whitney Suggested Cutting Speeds' S/F section + TaperEnd spec sheet (mold-making); die-shop counterboring/keyseat relevant" },
  "Lavallee & Ide":          { website: "https://lavallee-ide.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (Michigan) reamer specialist — world's largest intermediate-decimal-size reamer range (.0001-inch steps): chucking, Silver & Deming, stub screw-machine, production-length, extra-long, solid-carbide & carbide-tipped, taper-pin, aligning/bridge/car reamers; reaming = core die-hole-finishing op (catalog is dimension-dense; oscar verifies S/F-table presence)" },
  "Jarvis Cutting Tools":    { website: "https://www.jarviscuttingtools.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (family-owned since 1901) — largest privately-owned tap maker in North America: taps (Spiralock / Jarflo form / combo / API / pipe / multi-lead / in-die), combination tap-drills + tap-reamers, drills, thread mills, rotary files; Standard Product Catalog + Mills catalog carry tapping/milling cutting data — peak die-shop tapping/threading relevance (3 cutting-tool PDFs = ONE maker; main catalog via browser-discovered 2025/02 wp-content path)" },
  "Morse Cutting Tools":     { website: "https://www.morsecuttingtools.com/", vendor_type: "supplier", reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (New Bedford MA, since 1864) broad HSS/cobalt/carbide line — drills (jobber/screw-machine/S&D/taper/parabolic SHEARDRILL), taps, dies, reamers, end mills, countersinks, annular cutters; Master Catalog carries dedicated Speeds & Feeds sections (Carbide / HP Cobalt Parabolic / HSS & Cobalt / Miniature / SHEARDRILL) + a standalone HSS-&-Cobalt-Drill S/F chart; 3 PDFs = ONE maker (master + S/F chart + metric carbide); anchored 'morse cutting' NOT bare morse (Morse-taper shank standard) (new maker R39, 2026-05-31)" },
  "Precision Twist Drill":   { website: "https://www.dormerpramet.com/", vendor_type: "supplier", reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (Crystal Lake IL) twist-drill maker — stub/jobber/mechanic/S&D reduced-shank HSS R10 (RH) + L10 (LH) drills, taps, dies, reamers, end mills, burs; now a Dormer Pramet MRO brand (with Union Butterfield + Dormer); legacy PTD/Union-Butterfield letter-keyed speeds chart + feed-per-rev table long regarded as reliable; MRO catalog pulled via Weber Supply distributor (new maker R39, 2026-05-31)" },
  "MAPAL":                   { website: "https://mapal.com/", vendor_type: "supplier", reach: "global", regions: ["DE", "US"], pricing_access: "catalog", has_api: false, notes: "German precision rotating-tool maker — reaming, fine/actuated boring, solid-carbide drills, deep-hole drills, countersinking, combined drill-reamers; peak die hole-finishing relevance. Bore-Machining master catalog 93.5MB + Tritan drill-reamer; geometry/dimensions/application data (S/F via online configurator/c-Com, no single published chart — oscar likely MEDIUM) (new maker R40, 2026-05-31)" },
  "Union Butterfield":       { website: "https://www.dormerpramet.com/", vendor_type: "supplier", reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US taps/dies/dienuts/reamers/drills/end-mills — the historical letter-keyed tap-speeds reference; now a Dormer Pramet brand. PEAK die relevance (tapping/thread-cutting/reaming). UB-branded Product Selector catalog via directools mirror (dormerpramet hotlink-walled); thread/dimensional data (new maker R40, 2026-05-31)" },
  "Komet":                   { website: "https://cuttingtools.ceratizit.com/", vendor_type: "supplier", reach: "global", regions: ["DE", "US"], pricing_access: "catalog", has_api: false, notes: "German precision rotating-tool maker (KOMET GROUP / DIHART, now CERATIZIT) — fine/precision boring (MicroKom hi.flex), reaming (DIHART Reamax TS / Monomax / PCD), solid drilling, threading (KometJEL). PEAK die relevance (precision boring + reaming). DIHART Reaming Catalog carries vc/feed guideline tables by ISO group; via AHB + Ekstrom-Carlson mirrors (CERATIZIT own-site SPA-walled) (new maker R40, 2026-05-31)" },
  "Star Cutter":             { website: "https://starcutter.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (Farmington Hills MI, since 1927; sold via Star-SU LLC) — solid-carbide drills, custom carbide reamers (SRT Super Round Tool), single-flute & solid-carbide gundrills/deep-hole drills, gear hobs/shaper cutters, end mills, PCD reaming/milling/boring + 5-axis cutter-grinders; die-relevant reaming/deep-hole/PCD. Round-Tools + SFGD-Express + GCT brochures; geometry/dimensions (S/F consultative, no public chart). Anchored 'star cutter'/'star su' NOT bare star (matches 'Started') (new maker R40, 2026-05-31)" },
  "Drill Masters-Eldorado Tool": { website: "https://dmetool.com/", vendor_type: "supplier", reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (Milford CT) — Eldorado Tool (since 1948) merged with Drill Masters 2002; one of the world's largest deep-hole/gundrilling cutting-tool makers — single/two-flute gundrills (.039in-3.000in, 800+ stock), pull-bore reamers, Opti-Flo/Eldo-Loc detachable-tip + indexable gundrills. Die-relevant (deep cooling/ejector-line holes). Master catalog has a dedicated Gundrill Speeds & Feeds section (pp.23-24) + 2025 price/spec book; via productivity.com mirror + own-site (new maker R40, 2026-05-31)" },
  "F&D Tool":                { website: "https://fdtool.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (Lunenburg/Greenfield MA) HSS & carbide cutting tools — plain/side/slab milling cutters, slitting saws, Woodruff & keyseat cutters, arbors, screw-machine tools; die-relevant (keyseats/slots/side-milling). Master Catalog #75 (43.4MB, complete) carries geometry/dimensions + embedded SFM/feed guidance (no dedicated chart); via technitool mirror (own-site offers only a .zip) (new maker R40, 2026-05-31)" },
  "Microcut":                { website: "https://www.microcutusa.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (Kingston MA) special-application solid-carbide MICRO cutting tools — micro end mills (2/3/4/5-flute square & ball, hi-helix, roughers, long-reach), micro drills (#92 .0079in up, AlTiN NANO), drill mills, keyseat/thread/double-angle/dovetail/chamfer/engraving cutters, spotting drills/countersinks. Standalone maker. Handbook MC77-11 carries SUGGESTED SPEEDS & FEEDS tables (SFM/RPM/IPM by material) — HAS S/F; die-relevant micro mold/die features (new maker R41, 2026-05-31)" },
  "Richards Micro Tool":     { website: "https://www.richardsmicrotool.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (Plymouth MA, since 1961) precision miniature/micro tools .004-.500in — square/ball/corner-radius miniature end mills, micro drills (incl. circuit-board), countersinks, reamers, routers, tapered rib cutters; HSS/Cobalt/Carbide + AlTiN/PCD/DLC. ARCH Global Precision brand but retains its own RMT-numbered catalog with a full END MILL + DRILL SPEEDS & FEEDS section (~25-material SFM + IPT-by-diameter) — HAS S/F; die/mold micro-machining (new maker R41, 2026-05-31)" },
  "Ultra-Tool International": { website: "https://www.ultra-tool.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (Ontario CA, Tool Alliance group, ISO 9001) high-performance solid-carbide ROUND tools — end mills (GP/HP/micro), drills, reamers, keyseat cutters, radius/corner-radius, engraving, routers, burrs. Dedicated own-site Ultra2020Tech S/F guide (SFM=RPM x Dia x .262, uncoated-baseline w/ SmoothCoat uplift) — HAS S/F; die/mold carbide milling/reaming/keyseat (new maker R41, 2026-05-31)" },
  "Advent Tool":             { website: "https://adventtoolusa.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (Antioch/Lake Villa IL, since 1974) standalone maker of thread mills / form mills / spline & gear mills / broaching — solid-carbide + replaceable-insert thread mills, GT inserted thread mills, indexable shell mills, face grooving, xtra-length internal thread mills. 2019 catalog has a real cutting-data chart (Material/Machinability/SFM/chipload-per-flute + worked RPM examples + sample NC thread-milling programs) — HAS S/F; PEAK die threading relevance (new maker R41, 2026-05-31)" },
  "Gorilla Mill (CGC Tools)": { website: "https://gorillamill.com/", vendor_type: "supplier", reach: "national", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US (CGC Tools / Carbide Grinding Co., Waukesha WI, since 1974) aggressive variable-helix/variable-index solid-carbide end mills (Gorilla Mill/Phenom/Sasquatch/Silverback/Knuckledragger/Baboon/6-flute Kong/Missing Link thread mills/Lemur chamfer) + GMX/GDX-coated solid-carbide drills; rated tool steels & hardened to ~55 Rc. 2013 master catalog has S/F tables (SFM/RPM/IPM/CLPT by material) — HAS S/F; die/mold hardened-steel milling. cgc NOT cgs (CGS Tool is a separate tracked maker) (new maker R41, 2026-05-31)" },
  "BIG Kaiser":              { website: "https://www.bigkaiser.com/", vendor_type: "supplier", reach: "global", regions: ["US", "CH", "JP"], pricing_access: "catalog", has_api: false, notes: "Precision-tooling brand of BIG DAISHOWA group — precision boring heads (EWN/EWB/EWE fine, SW rough), modular tooling systems, + Sphinx solid-carbide drills/reamers/micro-mills. Dedicated cutting_data_catalog (vc m/min by ISO group, feed-per-rev, formulas, CBN/PCD insert data) — HAS S/F; die-relevant single-point fine boring + carbide drilling/reaming of die details (new maker R41, 2026-05-31)" },
  "Criterion":               { website: "https://www.alliedmachine.com/", vendor_type: "supplier", reach: "global", regions: ["US"], pricing_access: "catalog", has_api: false, notes: "US modular boring systems brand of Allied Machine & Engineering (formerly Criterion Machine Works) — boring heads (CB micro-adjust, Cri-Bore, Large Cri-Bore, CBER, MBS finish), boring bars, threading/burnishing/reaming heads. DISTINCT Criterion-branded catalogs from Allied's spade-drill line (like Triumph/Walter). Cutting-data tables (SFM/IPR/RPM by material, nose radius) — HAS S/F; die-relevant precision ID boring of die plates/blocks (new maker R41, 2026-05-31)" },
  "Mitsubishi Materials":    { website: "https://www.mmc-carbide.com/", vendor_type: "supplier", reach: "global", regions: ["JP", "US", "EU"], pricing_access: "catalog", has_api: false, notes: "MAJOR Japanese cutting-tool maker (MMC Carbide) — solid-carbide + indexable drills/end mills, turning/milling inserts, threading, grooving, boring, reaming; MC5000/MC6000/MC7000/MP9000 grades. C009E Turning catalog (49MB) explains the TOOL NAVI cutting-speed system (Taylor VcT^n=C + per-material hardness coefficients) — HAS S/F methodology; die-relevant drilling/milling/boring. Anchored mitsubishi-materials/carbide NOT bare mitsubishi (Mitsubishi Electric FA/EDM is a DIFFERENT company) (new maker R42, 2026-05-31)" },
  // Software / machine-builder makers (from the PDF/ software-manual dir)
  "Autodesk":                { website: "https://www.autodesk.com/", vendor_type: "service", reach: "global", regions: ["US"], pricing_access: "quote", has_api: true, categories: ["cam-software"], notes: "Fusion 360 / Inventor HSM CAM software publisher" },
  "Mastercam":               { website: "https://www.mastercam.com/", vendor_type: "service", reach: "global", regions: ["US"], pricing_access: "quote", has_api: false, categories: ["cam-software"], notes: "CNC Software, LLC (Sandvik) — Mastercam CAD/CAM" },
  "OPEN MIND (hyperMILL)":   { website: "https://www.openmind-tech.com/en/", vendor_type: "service", reach: "global", regions: ["DE", "US"], pricing_access: "quote", has_api: false, categories: ["cam-software"], notes: "hyperMILL / hyperCAD-S CAD/CAM" },
  "Okuma":                   { website: "https://www.okuma.com/", vendor_type: "machine-builder", reach: "global", regions: ["JP", "US"], pricing_access: "quote", has_api: false, categories: ["machine-builder", "controls", "automation"], notes: "MULTUS machine + machine-software manuals (Okuma site not re-confirmed this run — name from filename context)", unverifiedSite: true },
};

// ---------------------------------------------------------------------------
// Filename -> canonical maker name. Ordered most-specific-first. Each rule's `match` is a regex
// tested against the lower-cased basename (no extension); `name` is the canonical maker.
// Cryptic vendor-specific catalog codes (GC_ = Sandvik Coromant brand code; the 2018.1 family is
// the Coromant 2018 catalog set; the "Master Catalog 2018 Vol N" titles are Kennametal's exact
// catalog titles) are mapped from filename evidence, then gated by CONFIRMED_VENDORS for verified:true.
// ---------------------------------------------------------------------------
const NAME_RULES = [
  { match: /big\s*daishowa/, name: "BIG Daishowa" },
  { match: /rego[-\s]?fix/, name: "REGO-FIX" },
  { match: /\bguhring\b/, name: "Guhring" },
  { match: /\bemuge\b/, name: "EMUGE-FRANKEN" },
  { match: /\bampc\b/, name: "Allied Machine & Engineering" },          // Allied Master Product Catalog
  { match: /ma[_\s]?ford/, name: "M.A. Ford" },
  { match: /\bosg\b/, name: "OSG" },
  { match: /\bsgs[_\s]/, name: "KYOCERA SGS Precision Tools" },
  { match: /korloy/, name: "Korloy" },
  { match: /tungaloy/, name: "Tungaloy" },
  { match: /sumitomo/, name: "Sumitomo Electric Carbide" },
  { match: /\biscar\b/, name: "ISCAR" },
  { match: /ingersoll/, name: "Ingersoll Cutting Tools" },
  { match: /\bwalter\b/, name: "Walter" },
  { match: /global[-\s]?cnc/, name: "Global CNC Industries" },
  { match: /orange[_\s]?vise/, name: "Orange Vise" },
  { match: /accupro/, name: "Accupro" },
  { match: /rapidkut/, name: "Rapidkut" },
  { match: /\bhorn\b/, name: "Paul Horn (Horn USA)" },   // Paul Horn — precision grooving/threading/Swiss-turning
  { match: /carmex/, name: "Carmex" },                    // Carmex — threading/grooving/Swiss (new maker, 2026-05-30)
  { match: /\bmikron\b(?![-_\s]*(mill|machining))/, name: "Mikron Tool" },  // Swiss micro-drilling/milling (CrazyDrill/CrazyMill); lookahead avoids GF "Mikron Mill" machine builder (new maker, 2026-05-30)
  { match: /dixi[-_\s]?polytool|\bdixi\b/, name: "Dixi Polytool" },         // Dixi Polytool — Swiss micro-precision cutting tools (new maker, 2026-05-30)
  { match: /applitec/, name: "Applitec" },                                 // Applitec — Swiss Swiss-turning inserts (new maker, 2026-05-30)
  { match: /louis[-_\s]?belet|louisbelet/, name: "Louis Belet" },          // Louis Bélet — Swiss micro cutting tools, watchmaking/medical (new maker, 2026-05-30)
  { match: /\bfraisa\b/, name: "Fraisa" },                                 // Fraisa — Swiss milling/drilling/threading, high-performance cutters (new maker, 2026-05-30)
  { match: /\bzecha\b/, name: "Zecha" },                                   // Zecha — German precision microtools, die/mould/graphite-electrode (new maker, 2026-05-30)
  { match: /schwanog/, name: "Schwanog" },                                 // Schwanog — German form-tool/grooving systems for Swiss/screw machines (new maker, 2026-05-30)
  { match: /vergnano/, name: "Vergnano" },                                 // Vergnano — Italian taps/thread-mills/end-mills/drills/hobs (new maker, 2026-05-30)
  { match: /mimatic/, name: "Mimatic" },                                   // Mimatic — German driven/cross-working tools for Swiss/turning machines (new maker, 2026-05-30)
  { match: /\bizar\b/, name: "Izar" },                                     // Izar — Spanish HSS/carbide drills/taps/reamers/end-mills (new maker, 2026-05-30)
  { match: /\bsomta\b/, name: "Somta Tools" },                             // Somta Tools — South African HSS/carbide drills/taps/end-mills (new maker, 2026-05-30)
  { match: /\bham\b/, name: "HAM Praezision" },                            // HAM Präzision — German solid-carbide milling/drilling + inserts; \b-anchored (won't fire on "birmingham") (new maker, 2026-05-30)
  { match: /\blmt\b/, name: "LMT Tools" },                                 // LMT Tools (Fette threading / Onsrud routing / solid-carbide milling+drilling, German group); \b-anchored (won't fire on substrings like "filmtape") (new maker, 2026-05-30)
  { match: /\bsutton\b/, name: "Sutton Tools" },                           // Sutton Tools — Australian HSS/carbide drills/taps/end-mills/reamers + application S/F guides; \b-anchored, distinct from Somta (new maker, 2026-05-30)
  { match: /\bmagafor/, name: "Magafor" },                                 // Magafor — French center drills / NC spot drills / countersinks / carbide drills; leading-\b only (matches "magafor259..." upstream name too); distinct 7-char brand token, won't fire on "imagaforge" (new maker, 2026-05-30)
  { match: /internal[-_\s]?tool/, name: "Internal Tool" },                 // Internal Tool Inc — US solid-carbide end mills, dedicated speeds/feeds chart (new maker, 2026-05-31)
  { match: /\bredline\b/, name: "Redline Tools" },                         // Redline Tools — US carbide end mills, general-purpose S/F chart (new maker, 2026-05-31)
  { match: /\bhertel\b/, name: "Hertel" },                                 // Hertel — historic German carbide brand (MSC exclusive), solid-carbide milling S/F; \b-anchored, distinct token (new maker, 2026-05-31)
  { match: /\bkodiak\b/, name: "Kodiak Cutting Tools" },                    // Kodiak Cutting Tools — US carbide end mills, full catalog w/ machining data; \b-anchored, distinct token (new maker, 2026-05-31)
  { match: /\bitc\b/, name: "Industrial Tooling Corporation (ITC)" },       // ITC — UK milling/turning/boring + tapping/threading, Harvey Performance brand; \bitc\b BOTH-side-anchored (won't fire on "switch"/"pitch"/"stitch" — itc there has no word boundary) (new maker, 2026-05-31)
  { match: /\bcgs\b/, name: "CGS Tool" },                                   // CGS Tool — US Made-in-USA solid-carbide end mills + 6 per-series S/F sheets; \bcgs\b BOTH-side-anchored 3-letter token (new maker, 2026-05-31)
  { match: /tru[-_\s]?edge/, name: "Tru-Edge" },                            // Tru-Edge — US solid-carbide end mills, feeds/speeds by Brinell hardness (new maker, 2026-05-31)
  { match: /hannibal/, name: "Hannibal Carbide Tool" },                     // Hannibal Carbide Tool — US carbide reamers/drills/end-mills + dedicated S/F docs (new maker, 2026-05-31)
  { match: /toolmex/, name: "Toolmex" },                                    // Toolmex (TMX) — US/PL cutting tools + technical reference w/ S/F (new maker, 2026-05-31)
  { match: /scientific[-_\s]?cutting/, name: "Scientific Cutting Tools" },  // Scientific Cutting Tools (SCT) — US thread mills / port tools (new maker, 2026-05-31)
  { match: /\bbalax\b/, name: "Balax" },                                    // Balax — US forming + cutting taps ('least-cost tapped hole'); \b-anchored distinct token (new maker, 2026-05-31)
  { match: /\bregal\b/, name: "Regal Cutting Tools" },                      // Regal Cutting Tools — US drills/taps/dies/reamers/end-mills + S/F charts; \b-anchored distinct token (new maker, 2026-05-31)
  { match: /greenfield/, name: "Greenfield Industries" },                   // Greenfield Industries — parent of Cleveland/Chicago-Latrobe/Cle-Line/Bassett/Greenfield-Threading; all local files greenfield-prefixed (new maker, 2026-05-31)
  { match: /\bviking\b/, name: "Viking Drill & Tool" },                     // Viking Drill & Tool — US HSS drills/taps (sibling Norseman); \b-anchored distinct token (new maker, 2026-05-31)
  { match: /severance/, name: "Severance Tool" },                           // Severance Tool — US Midget Mills / Chatterless Countersinks / reamers / burs (new maker, 2026-05-31)
  { match: /\bchampion\b/, name: "Champion Cutting Tool" },                 // Champion Cutting Tool — US HSS taps/dies + Brute Platinum/XL annular cutters; \b-anchored (new maker, 2026-05-31)
  { match: /\bdrillco\b/, name: "Drillco Cutting Tools" },                  // Drillco Cutting Tools — US drills/taps/dies/reamers/countersinks (since 1978); \b-anchored, generic "drill" token can't bleed into "drillco" (no boundary before "co") (new maker, 2026-05-31)
  { match: /\bkeo\b/, name: "KEO Cutters" },                                // KEO Cutters (Arch Cutting Tools-KEO) — US countersinks/Kounterbores/combined-drill-csk/reamers; 3-letter token, both-side \b-anchored + collision-guarded (no fire on makeover/keokuk/weko) (new maker, 2026-05-31)
  // (Emuge `\bemuge\b` rule already exists at line ~113 → "EMUGE-FRANKEN"; R33 augment needs no new rule — first-match wins)
  { match: /weldon[-_\s]?tool/, name: "Weldon Tool" },                      // Weldon Tool (Heritage Cutter) — US end mills/keyseat/T-slot cutters; anchored on "weldon tool" NOT bare \bweldon\b (the generic flat-shank standard "Weldon shank" appears in many makers' files) (new maker, 2026-05-31)
  { match: /\bsowa\b/, name: "Sowa Tool (GS Tooling)" },                    // Sowa Tool / GS Tooling — Canadian/US carbide+HSS end mills/taps/drills; \b-anchored distinct token; 4 cutting-tool catalogs = ONE maker (new maker, 2026-05-31)
  { match: /\bhougen\b/, name: "Hougen" },                                  // Hougen — US annular/Rotabroach hole-making cutters; \b-anchored distinct token (new maker R36, 2026-05-31)
  { match: /triumph[-_\s]?twist/, name: "Triumph Twist Drill" },            // Triumph Twist Drill (Walter) — US HSS/cobalt drills/taps/reamers; anchored "triumph twist" NOT bare \btriumph\b (new maker R36, 2026-05-31)
  { match: /\bbesly\b/, name: "Besly Cutting Tools" },                      // Besly Cutting Tools — US taps/dies/drills/end-mills; \b-anchored distinct token (new maker R36, 2026-05-31)
  { match: /reiff[-_\s]?nestor/, name: "Reiff & Nestor" },                  // Reiff & Nestor — US taps/dies/thread tools; anchored "reiff nestor" (new maker R36, 2026-05-31)
  { match: /super[-_\s]?tool/, name: "Super Tool" },                        // Super Tool — US countersinks/counterbores/combined-drill-csk/keyseat; matches supertool/super-tool/super tool (new maker R36, 2026-05-31)
  { match: /whitney[-_\s]?tool/, name: "Whitney Tool" },                    // Whitney Tool — US counterbores/combined-drill-csk/keyseat/tapered-endmills; anchored "whitney tool" NOT bare \bwhitney\b (place/surname) (new maker R36, 2026-05-31)
  { match: /lavallee/, name: "Lavallee & Ide" },                            // Lavallee & Ide — US reamer specialist (intermediate-decimal sizes); distinct token (new maker R37, 2026-05-31)
  { match: /\bjarvis\b/, name: "Jarvis Cutting Tools" },                    // Jarvis Cutting Tools — US largest privately-owned tap maker (since 1901); \b-anchored distinct token; 3 cutting-tool PDFs = ONE maker (new maker R38, 2026-05-31)
  { match: /morse[-_\s]?cutting/, name: "Morse Cutting Tools" },            // Morse Cutting Tools — US broad HSS/cobalt/carbide drills/taps/dies/reamers/endmills; anchored "morse cutting" NOT bare \bmorse\b (Morse-taper shank standard appears in many drill catalogs) (new maker R39, 2026-05-31)
  { match: /precision[-_\s]?twist/, name: "Precision Twist Drill" },        // Precision Twist Drill (PTD, now Dormer Pramet) — US twist drills/taps/reamers; anchored "precision twist" — mutually exclusive with triumph[-_\s]?twist (new maker R39, 2026-05-31)
  { match: /\bmapal\b/, name: "MAPAL" },                                    // MAPAL — German precision reaming/fine-boring/drilling/countersinking; \b-anchored distinct token (new maker R40, 2026-05-31)
  { match: /union[-_\s]?butterfield|\bbutterfield\b/, name: "Union Butterfield" }, // Union Butterfield — US taps/dies/reamers (Dormer Pramet brand); anchored on distinctive "butterfield" (new maker R40, 2026-05-31)
  { match: /\bkomet\b/, name: "Komet" },                                    // Komet — German precision boring/reaming (DIHART, now CERATIZIT); \b-anchored distinct token (new maker R40, 2026-05-31)
  { match: /star[-_\s]?cutter|star[-_\s]?su\b/, name: "Star Cutter" },       // Star Cutter (Star-SU) — US reamers/carbide-drills/gundrills/PCD; anchored "star cutter"/"star su" NOT bare \bstar\b (which matches "Started" in InventorHSM-Getting-Started) (new maker R40, 2026-05-31)
  { match: /eldorado|drill[-_\s]?masters/, name: "Drill Masters-Eldorado Tool" }, // Drill Masters-Eldorado Tool — US deep-hole/gundrilling; both tokens distinctive (new maker R40, 2026-05-31)
  { match: /\bf[-_\s]?and[-_\s]?d[-_\s]?tool\b|\bfandd\b|\bf[_&]d[-_\s]?tool\b/, name: "F&D Tool" }, // F&D Tool — US milling-cutters/Woodruff-keyseat/slitting-saws; anchored on full "f-and-d-tool"/"f&d-tool" NOT bare letters (new maker R40, 2026-05-31)
  { match: /\bmicrocut\b/, name: "Microcut" },                              // Microcut — US micro solid-carbide drills/endmills/reamers; \b-anchored (new maker R41, 2026-05-31)
  { match: /richards[-_\s]?micro/, name: "Richards Micro Tool" },           // Richards Micro Tool (RMT, ARCH brand w/ own catalog) — US micro tools; anchored "richards micro" (new maker R41, 2026-05-31)
  { match: /ultra[-_\s]?tool/, name: "Ultra-Tool International" },          // Ultra-Tool International — US carbide round tools; anchored "ultra tool" NOT bare \bultra\b (new maker R41, 2026-05-31)
  { match: /advent[-_\s]?tool/, name: "Advent Tool" },                      // Advent Tool — US thread/form/spline mills; anchored "advent tool" NOT bare \badvent\b (new maker R41, 2026-05-31)
  { match: /gorilla[-_\s]?mill|\bcgc[-_\s]?tools?\b/, name: "Gorilla Mill (CGC Tools)" }, // Gorilla Mill (CGC Tools) — US aggressive carbide endmills; cgc NOT cgs (CGS Tool is a separate tracked maker) (new maker R41, 2026-05-31)
  { match: /big[-_\s]?kaiser/, name: "BIG Kaiser" },                        // BIG Kaiser — precision boring heads + Sphinx carbide (BIG DAISHOWA); anchored "big kaiser" NOT bare \bkaiser\b (new maker R41, 2026-05-31)
  { match: /\bcriterion\b/, name: "Criterion" },                           // Criterion — modular boring systems (Allied Machine brand, distinct boring line + own catalogs); \b-anchored (new maker R41, 2026-05-31)
  { match: /mitsubishi[-_\s]?(materials|carbide)/, name: "Mitsubishi Materials" }, // Mitsubishi Materials (MMC Carbide) — Japanese cutting tools; anchored materials/carbide NOT bare mitsubishi (Mitsubishi Electric FA/EDM is a separate company) (new maker R42, 2026-05-31)
  // Kennametal — exact 2018 Master Catalog volume titles (Turning Vol 1 / Rotating Vol 2)
  { match: /master\s*catalog\s*2018\s*vol/, name: "Kennametal" },
  // Sandvik Coromant — GC_ brand-code catalogs + the 2018.1 catalog family + "Tooling Systems News"
  { match: /^gc_\d{4}/, name: "Sandvik Coromant" },
  { match: /^(milling|threading|turning)\s*2018\.1$/, name: "Sandvik Coromant" },
  { match: /tooling\s*systems\s*news\s*2018/, name: "Sandvik Coromant" },
  // Software / machine-software manuals (PDF dir)
  { match: /fusion\s*360|inventor\s*hsm/, name: "Autodesk" },
  { match: /mastercam/, name: "Mastercam" },
  { match: /hyper(mill|cad)/, name: "OPEN MIND (hyperMILL)" },
  { match: /\bokuma\b|multus/, name: "Okuma" },
  // Makers deliberately pulled into the corpus (U-VDN-CATALOG-PULL) — real companies, not invented.
  // Placed AFTER the anchored Sandvik (^gc_) / Kennametal (master catalog 2018 vol) brand-code rules so a
  // GC_2023_helical_*.pdf resolves to Sandvik, not "Helical Solutions" (most-specific-first contract, line 67).
  { match: /harvey[-_\s]?tool|\bharvey\b/, name: "Harvey Tool" },
  { match: /\bhelical\b/, name: "Helical Solutions" },
  { match: /niagara/, name: "Niagara Cutter" },
  { match: /lakeshore/, name: "Lakeshore Carbide" },
  { match: /data[-_\s]?flute/, name: "Data Flute" },
  { match: /cobra[-_\s]?carbide/, name: "Cobra Carbide" },
  { match: /\byg[-_\s]?1\b|dream[-_\s]?drill/, name: "YG-1" },
  // Round-3 pulled / known cutting-tool makers (also curated in build-vendor-directory CURATED_SUPPLIERS).
  { match: /fullerton/, name: "Fullerton Tool" },
  { match: /\bimco\b|metalmorphosis/, name: "IMCO Carbide" },
  { match: /garr[-_\s]?tool|\bgarr\b/, name: "Garr Tool" },
  { match: /\bmelin\b/, name: "Melin Tool" },
  { match: /micro[-_\s]?100/, name: "Micro 100" },
  { match: /destiny[-_\s]?tool|\bdestiny\b/, name: "Destiny Tool" },
  { match: /maritool/, name: "MariTool" },
  { match: /greenleaf/, name: "Greenleaf" },
  { match: /conical[-_\s]?tool/, name: "Conical Tool" },
  { match: /\bvargus\b/, name: "Vargus" },
  { match: /kyocera(?!.*\bsgs\b)/, name: "Kyocera Precision Tools" },
  { match: /tool[-_\s]?flo\b/, name: "Tool-Flo" },
  { match: /\bvortex\b/, name: "Vortex Tool" },
  { match: /robb\s?jack/, name: "RobbJack" },
  { match: /performance[-_\s]?micro|\bpmt[-_\s]/, name: "Performance Micro Tool" },
];

// Generic/unrecognizable tokens that must NOT be treated as a maker name on their own.
const UNRECOGNIZABLE = [
  /^solid\s*end\s*mills$/, /^turning[_\s]catalog/, /^tooling\s*systems$/, /^catalog_c\d/,
  /^flash[_\s]solid/, /^metalmorphosis/, /^yu25/, /^zeni\s*catalog/, /^zk1\d/, /^camfix/,
  /^automation[_\s]center/, /^installation/, /^sql[_\s]/, /^synchronization/, /^tool[_\s]builder/,
  /^virtual\s*machining/, /^\d+$/,
];

/** Strip a catalog filename down to a canonical maker name. Returns null if unrecognizable.
 *  Heuristic: drop extension, strip years / volumes / part codes / language tags, then match
 *  the NAME_RULES table. Filename evidence wins over the noisy tail.
 *  @param {string} filename basename (with or without .pdf) or a full path
 *  @returns {string|null}
 */
export function vendorFromCatalogFilename(filename) {
  if (typeof filename !== "string" || !filename.trim()) return null;
  const base = basename(filename).replace(/\.pdf$/i, "");
  const lc = base.toLowerCase().trim();
  // 1) strongest signal: explicit maker token anywhere in the filename
  for (const rule of NAME_RULES) {
    if (rule.match.test(lc)) return rule.name;
  }
  // 2) ZK / EMUGE-style: the EMUGE token may sit mid-string (handled above); fall through.
  // 3) the cleaned residue — strip years, "vol N", part/rev codes, language/region tags, units
  let clean = base
    .replace(/\.pdf$/i, "")
    .replace(/\b(19|20)\d{2}(?:[-_/](19|20)?\d{2,4})?\b/g, " ")     // years / year ranges
    .replace(/\bvol(?:ume)?\.?\s*\d+\b/gi, " ")                       // vol N
    .replace(/\bpart\s*\d+\b/gi, " ")                                 // part N
    .replace(/\brev[\s.]?[a-z0-9]+\b/gi, " ")                         // rev A
    .replace(/\bv\d+(?:\.\d+)*\b/gi, " ")                             // v26.1
    .replace(/\b(english|metric|inch|us[-_]?en|deg?b?|katalog|catalog(ue)?|full|reduced|for|web|final|interactiveweb)\b/gi, " ")
    .replace(/[_\-]+/g, " ")
    .replace(/[^a-z0-9& ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const cleanLc = clean.toLowerCase();
  // re-run rules on cleaned residue (e.g. a maker token surfaced after code-stripping)
  for (const rule of NAME_RULES) {
    if (rule.match.test(cleanLc)) return rule.name;
  }
  // 4) reject generic / unrecognizable residues
  for (const re of UNRECOGNIZABLE) {
    if (re.test(cleanLc)) return null;
  }
  // 5) hash-prefixed or empty residue -> unrecognizable
  if (!clean || /^[0-9a-f]{6,}$/i.test(cleanLc) || clean.length < 2) return null;
  // 6) residue is a short product-line phrase, not a maker -> reject (we never invent a company)
  return null;
}

/** Category vocab from the OUTPUT RECORD CONTRACT. */
const CAT = {
  TOOLING: "tooling-consumable",
  MATERIAL: "material",
  MACHINE: "machine-builder",
  HOLDER: "tool-holder",
  FIXTURING: "fixturing",
  COOLANT: "coolant-lubricant",
  CONTROLS: "controls",
  CAM: "cam-software",
  AUTOMATION: "automation",
  ADDITIVE: "additive",
  INSPECTION: "inspection-quality",
  MACHINE_SHOP: "machine-shop",
  MISC: "misc",
};

/** Classify a catalog filename into the category vocab (may return several).
 *  turning / milling / drilling / end mills / inserts -> tooling-consumable
 *  holder / chuck / collet / toolholding / tooling systems -> tool-holder
 *  vise / fixture / workholding -> fixturing
 *  cam / mastercam / hypermill / fusion / hsm -> cam-software
 *  Always non-empty (falls back to ["misc"]).
 *  @param {string} filename
 *  @returns {string[]}
 */
export function classifyCatalogCategory(filename) {
  if (typeof filename !== "string") return [CAT.MISC];
  // normalize separators to spaces so word-boundary (\b) tests work across _ and - delimiters
  // (e.g. "orange_vise_catalog" -> "orange vise catalog"; otherwise `_` is a \w char and \bvise\b misses)
  const lc = basename(filename).toLowerCase().replace(/[_\-]+/g, " ");
  const cats = new Set();
  if (/\bvise\b|\bfixture|workholding|pallet|\bjaws?\b/.test(lc)) cats.add(CAT.FIXTURING);
  if (/holder|chuck|collet|toolholding|tooling\s*systems|powrgrip|\ber\d|\bhsk\b|\bcat\d/.test(lc)) cats.add(CAT.HOLDER);
  if (/turning|milling|drilling|\bdrill\b|grooving|threading|end\s*mill|endmill|insert|reamer|\btap\b|cutting|\bflute|cutter|machining\s*guide/.test(lc)) cats.add(CAT.TOOLING);
  // "carbide" is a MATERIAL (also used for holders/collets/blanks) — only a cutting-tool signal when NO
  // holder/fixturing context, else a "carbide shrink holder" catalog would leak into the SFC work-list.
  if (/carbide/.test(lc) && !cats.has(CAT.HOLDER) && !cats.has(CAT.FIXTURING)) cats.add(CAT.TOOLING);
  if (/mastercam|hyper(mill|cad)|fusion|inventor\s*hsm|\bcam[-_\s]|\bhsm\b/.test(lc)) cats.add(CAT.CAM);
  if (/automation/.test(lc)) cats.add(CAT.AUTOMATION);
  if (/macro|\bsql\b|database|controller/.test(lc)) cats.add(CAT.CONTROLS);
  if (/multus|machining\s*center|\bvmc\b|machine/.test(lc)) cats.add(CAT.MACHINE);
  if (/inspection|metrolog|gauge|gage|cmm/.test(lc)) cats.add(CAT.INSPECTION);
  if (cats.size === 0) cats.add(CAT.MISC);
  return [...cats];
}

/** Default category fallback per vendor_type when no filename signal matched. */
function typeDefaultCategory(vendorType) {
  switch (vendorType) {
    case "machine-builder": return [CAT.MACHINE];
    case "service":         return [CAT.CAM];
    case "reseller":        return [CAT.TOOLING];
    case "marketplace":     return [CAT.MISC];
    default:                return [CAT.TOOLING];
  }
}

/** Build one clean record per distinct maker from a list of catalog filenames (or paths).
 *  Files mapping to the same maker collapse to one record; categories union across all that
 *  maker's catalogs. Unrecognizable filenames -> one record EACH with name from the raw stem,
 *  website:null, verified:false, notes "needs verification" (so the directory still sees the
 *  catalog asset exists without inventing a maker identity).
 *  @param {string[]} filenames
 *  @returns {object[]}  records honoring the OUTPUT RECORD CONTRACT
 */
export function buildCatalogSeed(filenames) {
  if (!Array.isArray(filenames)) return [];
  /** @type {Map<string, {name:string, catalogs:string[], cats:Set<string>, recognized:boolean}>} */
  const byMaker = new Map();
  for (const f of filenames) {
    if (typeof f !== "string" || !f.trim()) continue;
    const stem = basename(f).replace(/\.pdf$/i, "").trim();
    const maker = vendorFromCatalogFilename(f);
    const cats = classifyCatalogCategory(f);
    if (maker) {
      const e = byMaker.get(maker) || { name: maker, catalogs: [], cats: new Set(), recognized: true };
      e.catalogs.push(basename(f));
      for (const c of cats) e.cats.add(c);
      byMaker.set(maker, e);
    } else {
      // keep the asset visible but DO NOT invent a company — key by the file stem itself
      const key = `__unrecognized__:${stem.toLowerCase()}`;
      const e = byMaker.get(key) || { name: stem, catalogs: [], cats: new Set(), recognized: false };
      e.catalogs.push(basename(f));
      for (const c of cats) e.cats.add(c);
      byMaker.set(key, e);
    }
  }

  const records = [];
  for (const e of byMaker.values()) {
    const conf = e.recognized ? CONFIRMED_VENDORS[e.name] : undefined;
    const vendorType = conf?.vendor_type || "supplier";
    // categories: prefer filename signal; if confirmed entry forces categories (software), union them
    let categories = [...e.cats];
    if (conf?.categories) categories = [...new Set([...categories, ...conf.categories])];
    if (categories.length === 0) categories = typeDefaultCategory(vendorType);

    const noteParts = [];
    noteParts.push(`catalogs on disk: ${e.catalogs.length} (${e.catalogs.slice(0, 4).join("; ")}${e.catalogs.length > 4 ? "; ..." : ""})`);
    if (conf?.notes) noteParts.push(conf.notes);

    let website = null;
    let verified = false;
    if (conf && !conf.unverifiedSite) {
      website = conf.website;
      verified = true;
    } else if (conf && conf.unverifiedSite) {
      // maker is named with confidence but the site URL wasn't confirmed THIS run -> keep null/false
      website = null;
      verified = false;
      noteParts.push("maker named from filename; website needs verification");
    } else if (!e.recognized) {
      noteParts.push("maker not identifiable from filename — needs human verification before any RFQ");
    } else {
      // recognized name but no confirmed entry -> still must not assert a URL
      noteParts.push("maker named from filename; website needs verification");
    }

    records.push({
      name: e.name,
      website,
      vendor_type: vendorType,
      categories,
      reach: conf?.reach || "unknown",
      regions: conf?.regions || [],
      pricing_access: conf?.pricing_access || "catalog",
      has_api: conf?.has_api ?? false,
      verified,
      source_tag: "resources-catalog",
      notes: noteParts.join(" | "),
    });
  }
  // stable sort: verified first, then by name
  records.sort((a, b) => (Number(b.verified) - Number(a.verified)) || a.name.localeCompare(b.name));
  return records;
}

// ---------------------------------------------------------------------------
// CLI machinery (only runs when invoked directly)
// ---------------------------------------------------------------------------

/** Recursively collect every .pdf under `dir` (returns absolute paths). Fail-soft on unreadable. */
export function scanPdfsRecursive(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...scanPdfsRecursive(full));
    } else if (ent.isFile() && /\.pdf$/i.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

function parseArgs(argv) {
  const dirs = [];
  let out = null;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dir") { dirs.push(argv[++i]); }
    else if (a === "--out") { out = argv[++i]; }
    else if (a === "--dry-run") { dryRun = true; }
  }
  return { dirs, out, dryRun };
}

function main() {
  const SLOT_ROOT = process.env.PRISM_SLOT_ROOT || "H:/prism-slot-charlie";
  const RES_ROOT = process.env.PRISM_RESOURCES_ROOT || "H:/PRISM/Resources";
  const { dirs, out, dryRun } = parseArgs(process.argv.slice(2));
  const scanDirs = dirs.length
    ? dirs
    : [
        join(RES_ROOT, "MANUFACTURER_CATALOGS"),
        join(RES_ROOT, "OKUMA MULTUS PDFS"),
        join(RES_ROOT, "PDF"),
      ];
  const outPath = out || join(SLOT_ROOT, "state/shared/quoting/vendor-sources/catalog-vendors.jsonl");

  const allPdfs = [];
  for (const d of scanDirs) {
    if (!existsSync(d)) { process.stderr.write(`[skip] not present: ${d}\n`); continue; }
    const found = scanPdfsRecursive(d);
    process.stderr.write(`[scan] ${found.length} pdf(s) under ${d}\n`);
    allPdfs.push(...found);
  }

  const records = buildCatalogSeed(allPdfs);
  const lines = records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : "");

  if (dryRun) {
    process.stdout.write(lines);
    process.stderr.write(`\n[dry-run] ${records.length} record(s) from ${allPdfs.length} pdf(s)\n`);
    return;
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines, "utf8");
  const verified = records.filter((r) => r.verified).length;
  process.stderr.write(`[done] wrote ${records.length} record(s) (${verified} verified) -> ${outPath}\n`);
}

// invokedDirectly guard
if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  main();
}
