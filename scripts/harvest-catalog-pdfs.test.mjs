#!/usr/bin/env node
/**
 * harvest-catalog-pdfs.test.mjs — real-value assertions for the catalog-PDF vendor harvester.
 * Run: node --test scripts/harvest-catalog-pdfs.test.mjs < /dev/null   (closed stdin)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  vendorFromCatalogFilename,
  classifyCatalogCategory,
  buildCatalogSeed,
} from "./harvest-catalog-pdfs.mjs";

// ---------------------------------------------------------------------------
// vendorFromCatalogFilename — real example filenames from H:/PRISM/Resources/MANUFACTURER_CATALOGS
// ---------------------------------------------------------------------------
test("vendorFromCatalogFilename: BIG Daishowa with volume tail", () => {
  assert.equal(
    vendorFromCatalogFilename("BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf"),
    "BIG Daishowa"
  );
});

test("vendorFromCatalogFilename: AMPC code -> Allied Machine & Engineering", () => {
  assert.equal(vendorFromCatalogFilename("AMPC_US-EN.pdf"), "Allied Machine & Engineering");
});

test("vendorFromCatalogFilename: Kennametal exact master-catalog title (Vol 1 Turning)", () => {
  assert.equal(
    vendorFromCatalogFilename("Master Catalog 2018 Vol. 1 Turning Tools English Inch.pdf"),
    "Kennametal"
  );
});

test("vendorFromCatalogFilename: Sandvik Coromant GC_ brand code", () => {
  assert.equal(vendorFromCatalogFilename("GC_2023-2024_US_Milling.pdf"), "Sandvik Coromant");
});

test("vendorFromCatalogFilename: REGO-FIX catalogue with year", () => {
  assert.equal(vendorFromCatalogFilename("REGO-FIX Catalogue 2026 ENGLISH.pdf"), "REGO-FIX");
});

test("vendorFromCatalogFilename: EMUGE token mid-string with rev/code noise", () => {
  assert.equal(
    vendorFromCatalogFilename("ZK12023_DEGB RevA EMUGE Katalog 160.pdf"),
    "EMUGE-FRANKEN"
  );
});

test("vendorFromCatalogFilename: lowercase guhring + product line", () => {
  assert.equal(vendorFromCatalogFilename("guhring tool holders.pdf"), "Guhring");
});

test("vendorFromCatalogFilename: korloy lower with line word", () => {
  assert.equal(vendorFromCatalogFilename("korloy turning.pdf"), "Korloy");
});

test("vendorFromCatalogFilename: hash-prefixed Orange Vise", () => {
  assert.equal(
    vendorFromCatalogFilename("543f80b8_2016_orange_vise_catalog.pdf"),
    "Orange Vise"
  );
});

test("vendorFromCatalogFilename: whiskey-fetch sumitomo grade chart", () => {
  assert.equal(
    vendorFromCatalogFilename("uploaded/whiskey-fetch-2026-05-26/sumitomo-ac8000p.pdf"),
    "Sumitomo Electric Carbide"
  );
});

test("vendorFromCatalogFilename: full path basename is used (Walter)", () => {
  assert.equal(
    vendorFromCatalogFilename("H:/PRISM/Resources/MANUFACTURER_CATALOGS/uploaded/whiskey-fetch-2026-05-26/walter-tigertec-gold-wpp.pdf"),
    "Walter"
  );
});

test("vendorFromCatalogFilename: software manual -> Mastercam", () => {
  assert.equal(vendorFromCatalogFilename("Mastercam-Basics-Tutorial.pdf"), "Mastercam");
});

test("vendorFromCatalogFilename: hyperMILL manual -> OPEN MIND", () => {
  assert.equal(vendorFromCatalogFilename("hyperMILL_Manual-en.pdf"), "OPEN MIND (hyperMILL)");
});

test("vendorFromCatalogFilename: unrecognizable generic product-line returns null", () => {
  assert.equal(vendorFromCatalogFilename("Solid End Mills.pdf"), null);
  assert.equal(vendorFromCatalogFilename("TURNING_CATALOG_PART 1.pdf"), null);
  assert.equal(vendorFromCatalogFilename("catalog_c010b_full.pdf"), null);
});

test("vendorFromCatalogFilename: U-VDN-CATALOG-PULL makers map to canonical names (not raw slugs)", () => {
  // Regression: before the NAME_RULES additions these fell to __unrecognized__ raw stems
  // ("cobra-carbide", "yg1") with category misc → orphaned from the SFC extraction manifest.
  assert.equal(vendorFromCatalogFilename("cobra-carbide.pdf"), "Cobra Carbide");
  assert.equal(vendorFromCatalogFilename("data-flute.pdf"), "Data Flute");
  assert.equal(vendorFromCatalogFilename("lakeshore-carbide.pdf"), "Lakeshore Carbide");
  assert.equal(vendorFromCatalogFilename("yg1.pdf"), "YG-1");
  assert.equal(vendorFromCatalogFilename("harvey-tool-fall-2022-catalog.pdf"), "Harvey Tool");
  assert.equal(vendorFromCatalogFilename("niagara-cutter-metric-series.pdf"), "Niagara Cutter");
  assert.equal(vendorFromCatalogFilename("helical-machining-guidebook.pdf"), "Helical Solutions");
});

test("vendorFromCatalogFilename: round-3 pulled makers map to canonical names (match CURATED_SUPPLIERS)", () => {
  assert.equal(vendorFromCatalogFilename("fullerton-tool.pdf"), "Fullerton Tool");
  assert.equal(vendorFromCatalogFilename("fullerton-tool-r3-2.pdf"), "Fullerton Tool");
  assert.equal(vendorFromCatalogFilename("imco-carbide.pdf"), "IMCO Carbide");
  assert.equal(vendorFromCatalogFilename("garr-tool.pdf"), "Garr Tool");
  assert.equal(vendorFromCatalogFilename("micro-100.pdf"), "Micro 100");
  assert.equal(vendorFromCatalogFilename("destiny-tool.pdf"), "Destiny Tool");
  assert.equal(vendorFromCatalogFilename("maritool-catalog.pdf"), "MariTool");
  assert.equal(vendorFromCatalogFilename("kyocera.pdf"), "Kyocera Precision Tools");
  assert.equal(vendorFromCatalogFilename("robbjack.pdf"), "RobbJack");
  assert.equal(vendorFromCatalogFilename("vortex-tool.pdf"), "Vortex Tool");
  assert.equal(vendorFromCatalogFilename("tool-flo-threading.pdf"), "Tool-Flo");
  // the kyocera rule's negative lookahead defers an SGS-branded file to the existing SGS rule
  assert.equal(vendorFromCatalogFilename("SGS_2020_catalog.pdf"), "KYOCERA SGS Precision Tools");
});

test("vendorFromCatalogFilename: round-5 pulled makers (Horn S/F + Carmex) map to canonical names", () => {
  // Horn name MUST match its CURATED_SUPPLIERS entry exactly ("Paul Horn (Horn USA)") so the
  // directory merge dedupes the pulled catalogs onto the curated vendor instead of forking "Horn".
  assert.equal(vendorFromCatalogFilename("horn-turning-cutting-data.pdf"), "Paul Horn (Horn USA)");
  assert.equal(vendorFromCatalogFilename("horn-grooving-stechdrehen-catalog.pdf"), "Paul Horn (Horn USA)");
  assert.equal(vendorFromCatalogFilename("carmex-metric-catalog-2021.pdf"), "Carmex");
  assert.equal(vendorFromCatalogFilename("carmex-cmt-threading-inch.pdf"), "Carmex");
  // \bhorn\b is word-anchored — must not fire on an unrelated substring
  assert.notEqual(vendorFromCatalogFilename("thornton-misc.pdf"), "Paul Horn (Horn USA)");
});

test("vendorFromCatalogFilename: round-6 pulled makers (Mikron Tool + Dixi Polytool) map to canonical names", () => {
  // Names MUST match their CURATED_SUPPLIERS entries exactly ("Mikron Tool", "Dixi Polytool")
  // so the directory merge dedupes the pulled catalogs onto the curated vendor.
  assert.equal(vendorFromCatalogFilename("mikron-toolbook-2024-2027.pdf"), "Mikron Tool");
  assert.equal(vendorFromCatalogFilename("mikron-titanium-drilling.pdf"), "Mikron Tool");
  assert.equal(vendorFromCatalogFilename("mikron-crazymill-cool-micro.pdf"), "Mikron Tool");
  assert.equal(vendorFromCatalogFilename("dixi-polytool-main-catalog-en.pdf"), "Dixi Polytool");
  assert.equal(vendorFromCatalogFilename("dixi-polytool-aerospace-en.pdf"), "Dixi Polytool");
  // Negative-lookahead guard: a GF "Mikron Mill" / "Mikron Machining" MACHINE-builder catalog
  // must NOT be mislabeled as the Mikron Tool cutting-tool company (conservative-name discipline).
  assert.notEqual(vendorFromCatalogFilename("mikron-mill-p800-machining-center.pdf"), "Mikron Tool");
  assert.notEqual(vendorFromCatalogFilename("mikron-machining-vce-1000.pdf"), "Mikron Tool");
});

test("vendorFromCatalogFilename: round-7 pulled makers (Applitec + Louis Belet) map to canonical names", () => {
  // Canonical names are ASCII ("Louis Belet", not "Louis Bélet") to match CURATED_SUPPLIERS exactly
  // (TS/JSON ASCII discipline) so the directory merge dedupes the pulled catalogs onto the curated vendor.
  assert.equal(vendorFromCatalogFilename("applitec-general-catalogue-2025-27.pdf"), "Applitec");
  assert.equal(vendorFromCatalogFilename("applitec-turn-line.pdf"), "Applitec");
  assert.equal(vendorFromCatalogFilename("louis-belet-full-catalogue-en.pdf"), "Louis Belet");
  assert.equal(vendorFromCatalogFilename("louis-belet-expert-titanium-en.pdf"), "Louis Belet");
  assert.equal(vendorFromCatalogFilename("louisbelet-technical-infos.pdf"), "Louis Belet");
});

test("vendorFromCatalogFilename: round-8 pulled maker (Fraisa milling) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("fraisa-sx-high-performance-milling.pdf"), "Fraisa");
  assert.equal(vendorFromCatalogFilename("fraisa-xfeed-h-hardened.pdf"), "Fraisa");
  assert.equal(vendorFromCatalogFilename("fraisa-mfc-multifunctional.pdf"), "Fraisa");
});

test("vendorFromCatalogFilename: round-10 pulled maker (Zecha die/mould microtools) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("zecha-fraser-micro-cutting-tools.pdf"), "Zecha");
  assert.equal(vendorFromCatalogFilename("zecha-graphite-catalog.pdf"), "Zecha");
  assert.equal(vendorFromCatalogFilename("zecha-steel-catalog.pdf"), "Zecha");
});

test("vendorFromCatalogFilename: round-11 pulled makers (Schwanog + Vergnano) map to canonical names", () => {
  assert.equal(vendorFromCatalogFilename("schwanog-profile-milling.pdf"), "Schwanog");
  assert.equal(vendorFromCatalogFilename("schwanog-id-grooving-turning.pdf"), "Schwanog");
  assert.equal(vendorFromCatalogFilename("vergnano-general-catalogue-en.pdf"), "Vergnano");
  assert.equal(vendorFromCatalogFilename("vergnano-jis-taps-en.pdf"), "Vergnano");
  assert.equal(vendorFromCatalogFilename("vergnano-drills-punte.pdf"), "Vergnano");
});

test("vendorFromCatalogFilename: round-12 pulled maker (Mimatic driven tools) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("mimatic-catalog-2014-2021-en.pdf"), "Mimatic");
});

test("vendorFromCatalogFilename: round-13 pulled makers (Izar + Somta) map to canonical names", () => {
  assert.equal(vendorFromCatalogFilename("izar-industrial-catalog-2026.pdf"), "Izar");
  assert.equal(vendorFromCatalogFilename("izar-milling-cutters-inch.pdf"), "Izar");
  assert.equal(vendorFromCatalogFilename("somta-e3plus-main-catalogue.pdf"), "Somta Tools");
  assert.equal(vendorFromCatalogFilename("somta-multi-purpose-drill-ranges.pdf"), "Somta Tools");
});

test("vendorFromCatalogFilename: round-14 pulled maker (HAM Präzision) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("ham-praezision-catalogue-2024.pdf"), "HAM Praezision");
  assert.equal(vendorFromCatalogFilename("ham-nirodrill-stainless.pdf"), "HAM Praezision");
  // \bham\b is word-anchored — must NOT fire on an unrelated substring like "birmingham"
  assert.notEqual(vendorFromCatalogFilename("birmingham-misc.pdf"), "HAM Praezision");
});

test("vendorFromCatalogFilename: round-15 pulled maker (LMT Tools — Fette/Onsrud DE group) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("lmt-carbideline.pdf"), "LMT Tools");
  assert.equal(vendorFromCatalogFilename("lmt-end-milling.pdf"), "LMT Tools");
  assert.equal(vendorFromCatalogFilename("lmt-vhm-fraeser-solid-carbide-mill.pdf"), "LMT Tools");
  // \blmt\b is word-anchored — must NOT fire on a substring like "filmtape" (contains l-m-t but no word boundary)
  assert.notEqual(vendorFromCatalogFilename("filmtape-misc.pdf"), "LMT Tools");
});

test("vendorFromCatalogFilename: round-16 pulled maker (Sutton Tools — AU drills/taps/endmills) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("sutton-carbide-endmills.pdf"), "Sutton Tools");
  assert.equal(vendorFromCatalogFilename("sutton-application-guide.pdf"), "Sutton Tools");
  assert.equal(vendorFromCatalogFilename("sutton-taps-din.pdf"), "Sutton Tools");
  // must NOT collide with the similarly-named Somta Tools
  assert.notEqual(vendorFromCatalogFilename("somta-e3plus-main-catalogue.pdf"), "Sutton Tools");
});

test("vendorFromCatalogFilename: round-17 pulled maker (Magafor — FR center drills / countersinks / carbide drills) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("magafor-catalog-259.pdf"), "Magafor");
  assert.equal(vendorFromCatalogFilename("Magafor259_ex_ld.pdf"), "Magafor");
  // \bmagafor\b is word-anchored — must NOT fire on an unrelated substring
  assert.notEqual(vendorFromCatalogFilename("imagaforge-misc.pdf"), "Magafor");
});

test("vendorFromCatalogFilename: round-19 pulled makers (Internal Tool / Redline Tools / Hertel — US/DE end-mill S/F charts) map to canonical names", () => {
  // Internal Tool Inc — US solid-carbide end mills (dedicated speeds/feeds chart)
  assert.equal(vendorFromCatalogFilename("internal-tool-speeds-feeds.pdf"), "Internal Tool");
  assert.equal(vendorFromCatalogFilename("internal_tool_sf.pdf"), "Internal Tool");
  // Redline Tools — US carbide end mills
  assert.equal(vendorFromCatalogFilename("redline-tools-carbide-endmill-sf.pdf"), "Redline Tools");
  // Hertel — MSC-exclusive carbide brand, solid-carbide milling S/F
  assert.equal(vendorFromCatalogFilename("hertel-solid-carbide-milling-sf.pdf"), "Hertel");
  // \b-anchored — must NOT fire on unrelated substrings
  assert.notEqual(vendorFromCatalogFilename("borderline-misc.pdf"), "Redline Tools");
  assert.notEqual(vendorFromCatalogFilename("hertelstrasse-map.pdf"), "Hertel");  // \bhertel\b won't match "hertelstrasse"
});

test("vendorFromCatalogFilename: round-20 pulled maker Kodiak (NEW) + Niagara full-catalog augment map to canonical names", () => {
  // Kodiak Cutting Tools — US carbide end mills (NEW maker)
  assert.equal(vendorFromCatalogFilename("kodiak-cutting-tools-catalog.pdf"), "Kodiak Cutting Tools");
  // Niagara augment: the existing /niagara/ rule must classify the distributor-mirrored full catalog
  assert.equal(vendorFromCatalogFilename("niagara-cutter-n04032-full-catalog.pdf"), "Niagara Cutter");
  // \bkodiak\b is word-anchored — must NOT fire on an unrelated substring
  assert.notEqual(vendorFromCatalogFilename("kodiakville-directory.pdf"), "Kodiak Cutting Tools");
});

test("vendorFromCatalogFilename: round-21 ITC (NEW) + M.A. Ford augment map to canonical names; \\bitc\\b is collision-safe", () => {
  const ITC = "Industrial Tooling Corporation (ITC)";
  // ITC — UK milling/turning/boring + tapping/threading (NEW maker)
  assert.equal(vendorFromCatalogFilename("itc-product-catalogue-issue18.pdf"), ITC);
  assert.equal(vendorFromCatalogFilename("itc-cyber-series-cutting-data.pdf"), ITC);
  assert.equal(vendorFromCatalogFilename("itc-tapping-threading-catalogue.pdf"), ITC);
  // CRITICAL: \bitc\b is a 3-letter token — must NOT fire on substrings where "itc" lacks word boundaries
  assert.notEqual(vendorFromCatalogFilename("switch-panel-guide.pdf"), ITC);   // sw[itc]h — no boundaries
  assert.notEqual(vendorFromCatalogFilename("pitch-diameter-chart.pdf"), ITC); // p[itc]h — no boundaries
  assert.notEqual(vendorFromCatalogFilename("stitching-machine.pdf"), ITC);    // st[itc]hing — no boundaries
  // M.A. Ford augment: existing ma[_\s]?ford rule must classify the new S/F + master-catalog files
  assert.equal(vendorFromCatalogFilename("maford-countersinks-speeds-feeds.pdf"), "M.A. Ford");
  assert.equal(vendorFromCatalogFilename("maford-2020-master-catalog.pdf"), "M.A. Ford");
});

test("vendorFromCatalogFilename: round-22 pulled makers (CGS Tool / Tru-Edge — US end-mill S/F) map to canonical names; \\bcgs\\b collision-safe", () => {
  // CGS Tool — US Made-in-USA solid-carbide end mills (NEW maker)
  assert.equal(vendorFromCatalogFilename("cgs-tool-catalog-2026.pdf"), "CGS Tool");
  assert.equal(vendorFromCatalogFilename("cgs-vmax-speeds-feeds.pdf"), "CGS Tool");
  assert.equal(vendorFromCatalogFilename("cgs-ferocious-3x-speeds-feeds.pdf"), "CGS Tool");
  // Tru-Edge — US solid-carbide end mills (NEW maker)
  assert.equal(vendorFromCatalogFilename("tru-edge-endmill-feeds-speeds.pdf"), "Tru-Edge");
  // CRITICAL: \bcgs\b is a 3-letter token — must NOT fire where "cgs" lacks word boundaries
  assert.notEqual(vendorFromCatalogFilename("micgserver-log.pdf"), "CGS Tool");   // mi[cgs]erver — no boundaries
  assert.notEqual(vendorFromCatalogFilename("abcgschart.pdf"), "CGS Tool");       // ab[cgs]chart — no boundaries
});

test("vendorFromCatalogFilename: round-24 pulled makers (Hannibal / Toolmex / Scientific Cutting Tools — US drill/reamer/thread-mill S/F) map to canonical names", () => {
  // Hannibal Carbide Tool — US carbide reamers/drills (NEW maker)
  assert.equal(vendorFromCatalogFilename("hannibal-reaming-speeds-feeds.pdf"), "Hannibal Carbide Tool");
  assert.equal(vendorFromCatalogFilename("hannibal-keyseat-speeds-feeds.pdf"), "Hannibal Carbide Tool");
  // Toolmex (TMX) — US/PL cutting tools (NEW maker)
  assert.equal(vendorFromCatalogFilename("toolmex-cutting-tools-tech-reference.pdf"), "Toolmex");
  // Scientific Cutting Tools (SCT) — US thread mills (NEW maker)
  assert.equal(vendorFromCatalogFilename("scientific-cutting-tools-catalog-2024.pdf"), "Scientific Cutting Tools");
  // anchored — must NOT fire on unrelated substrings
  assert.notEqual(vendorFromCatalogFilename("cannibalism-essay.pdf"), "Hannibal Carbide Tool"); // no "hannibal"
});

test("vendorFromCatalogFilename: round-25 pulled maker Balax (US forming/cutting taps) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("balax-tap-catalog-2016.pdf"), "Balax");
  // \bbalax\b is word-anchored — must NOT fire on an unrelated substring
  assert.notEqual(vendorFromCatalogFilename("unbalaxed-load.pdf"), "Balax");
});

test("vendorFromCatalogFilename: round-26 pulled maker Regal Cutting Tools (US drills/taps/dies + S/F charts) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("regal-cutting-tools-full-catalog.pdf"), "Regal Cutting Tools");
  // \bregal\b is word-anchored — must NOT fire on an unrelated substring
  assert.notEqual(vendorFromCatalogFilename("kregaltd-misc.pdf"), "Regal Cutting Tools");
});

test("vendorFromCatalogFilename: round-27 Greenfield Industries (parent of Cleveland/Chicago-Latrobe/Cle-Line/Bassett) — all brand catalogs map to the one canonical name", () => {
  assert.equal(vendorFromCatalogFilename("greenfield-cleveland-drilling-2025.pdf"), "Greenfield Industries");
  assert.equal(vendorFromCatalogFilename("greenfield-chicago-latrobe-2024.pdf"), "Greenfield Industries");
  assert.equal(vendorFromCatalogFilename("greenfield-cle-line-2023.pdf"), "Greenfield Industries");
  assert.equal(vendorFromCatalogFilename("greenfield-bassett-2022.pdf"), "Greenfield Industries");
  assert.equal(vendorFromCatalogFilename("greenfield-fast-tap-2025.pdf"), "Greenfield Industries");
});

test("vendorFromCatalogFilename: round-28 Viking Drill & Tool (US HSS drills/taps) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("viking-drill-full-catalog.pdf"), "Viking Drill & Tool");
  assert.equal(vendorFromCatalogFilename("viking-taps-dies.pdf"), "Viking Drill & Tool");
  // \bviking\b is word-anchored — must NOT fire on an unrelated substring
  assert.notEqual(vendorFromCatalogFilename("vikingrad-misc.pdf"), "Viking Drill & Tool");
});

test("vendorFromCatalogFilename: round-29 Severance Tool (US Midget Mills/countersinks/reamers) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("severance-tool-full-catalog.pdf"), "Severance Tool");
});

test("vendorFromCatalogFilename: round-30 Champion Cutting Tool (US taps/annular cutters) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("champion-cutting-tool-catalog-2023.pdf"), "Champion Cutting Tool");
  // \bchampion\b is word-anchored — must NOT fire on an unrelated substring
  assert.notEqual(vendorFromCatalogFilename("championship-bracket.pdf"), "Champion Cutting Tool");
});

test("vendorFromCatalogFilename: round-31 Drillco Cutting Tools (US drills/taps/dies/reamers) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("drillco-product-catalog.pdf"), "Drillco Cutting Tools");
  assert.equal(vendorFromCatalogFilename("drillco-tech-feeds-speeds-2019.pdf"), "Drillco Cutting Tools");
  // \bdrillco\b is word-anchored — the generic "drill" token must NOT bleed in, and unrelated drill makers must NOT match
  assert.notEqual(vendorFromCatalogFilename("drill-bit-decimal-chart.pdf"), "Drillco Cutting Tools");
  assert.notEqual(vendorFromCatalogFilename("viking-drill-catalog.pdf"), "Drillco Cutting Tools");
});

test("vendorFromCatalogFilename: round-32 KEO Cutters (US countersinks/Kounterbores) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("keo-cutters-catalog.pdf"), "KEO Cutters");
  // \bkeo\b is a 3-letter token, both-side word-anchored — must NOT fire on a substring of another word
  assert.notEqual(vendorFromCatalogFilename("makeover-tooling-guide.pdf"), "KEO Cutters");
  assert.notEqual(vendorFromCatalogFilename("keokuk-supplier-map.pdf"), "KEO Cutters");
  assert.notEqual(vendorFromCatalogFilename("weko-spray-lube.pdf"), "KEO Cutters");
});

test("vendorFromCatalogFilename: round-33 Emuge AUGMENT — Catalogue 520 maps to the EXISTING canonical EMUGE-FRANKEN (not a new maker)", () => {
  // R33 caught that Emuge was already tracked (EMUGE-FRANKEN, rule line ~113). The R33-pulled
  // Catalogue 520 is an AUGMENT, classified by the pre-existing \bemuge\b rule — no new wiring.
  assert.equal(vendorFromCatalogFilename("emuge-catalog-520.pdf"), "EMUGE-FRANKEN");
  // the pre-existing on-disk catalog still classifies to the same canonical
  assert.equal(vendorFromCatalogFilename("ZK12023_DEGB RevA EMUGE Katalog 160.pdf"), "EMUGE-FRANKEN");
  // \bemuge\b is word-anchored — must NOT fire on an unrelated substring
  assert.notEqual(vendorFromCatalogFilename("home-guide-catalog.pdf"), "EMUGE-FRANKEN");
});

test("vendorFromCatalogFilename: round-34 Weldon Tool (US end mills/keyseat cutters) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("weldon-tool-catalog.pdf"), "Weldon Tool");
  // CRITICAL collision guard: "Weldon shank" is a generic flat-shank standard used by EVERY end-mill
  // maker, so the rule anchors on "weldon tool" — another maker's weldon-shank file must NOT map here.
  assert.notEqual(vendorFromCatalogFilename("garr-weldon-shank-endmills.pdf"), "Weldon Tool");
  assert.notEqual(vendorFromCatalogFilename("fraisa-weldon-flat-shank.pdf"), "Weldon Tool");
});

test("vendorFromCatalogFilename: round-35 Sowa Tool / GS Tooling (carbide+HSS end mills/taps) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("sowa-master-catalogue.pdf"), "Sowa Tool (GS Tooling)");
  assert.equal(vendorFromCatalogFilename("sowa-carbide-endmills.pdf"), "Sowa Tool (GS Tooling)");
  assert.equal(vendorFromCatalogFilename("sowa-threading-taps.pdf"), "Sowa Tool (GS Tooling)");
  // \bsowa\b is word-anchored — must NOT fire on an unrelated substring
  assert.notEqual(vendorFromCatalogFilename("kosowa-parts.pdf"), "Sowa Tool (GS Tooling)");
});

test("vendorFromCatalogFilename: round-36 batch (6 die-relevant makers via discovery Workflow) maps to canonical names", () => {
  assert.equal(vendorFromCatalogFilename("hougen-speed-feed-formulas.pdf"), "Hougen");
  assert.equal(vendorFromCatalogFilename("hougen-catalog-2025.pdf"), "Hougen");
  assert.equal(vendorFromCatalogFilename("triumph-twist-drill-catalog.pdf"), "Triumph Twist Drill");
  assert.equal(vendorFromCatalogFilename("besly-taps-dies-catalog.pdf"), "Besly Cutting Tools");
  assert.equal(vendorFromCatalogFilename("besly-endmill-catalog.pdf"), "Besly Cutting Tools");
  assert.equal(vendorFromCatalogFilename("reiff-nestor-catalog-2013.pdf"), "Reiff & Nestor");
  assert.equal(vendorFromCatalogFilename("supertool-drilling-feeds-speeds.pdf"), "Super Tool");
  assert.equal(vendorFromCatalogFilename("supertool-catalog-2023.pdf"), "Super Tool");
  assert.equal(vendorFromCatalogFilename("whitney-tool-catalog.pdf"), "Whitney Tool");
  // collision guards — anchored tokens must NOT fire on substrings / generic words
  assert.notEqual(vendorFromCatalogFilename("triumphant-quarterly-results.pdf"), "Triumph Twist Drill"); // bare "triumph" insufficient — needs "twist"
  assert.notEqual(vendorFromCatalogFilename("whitney-houston-biography.pdf"), "Whitney Tool");           // "whitney" w/o "tool"
});

test("vendorFromCatalogFilename: round-37 Lavallee & Ide (US reamer specialist) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("lavallee-ide-reamer-catalog.pdf"), "Lavallee & Ide");
  // distinct token — must NOT fire on a generic reamer chart from another maker
  assert.notEqual(vendorFromCatalogFilename("reamer-general-speed-chart.pdf"), "Lavallee & Ide");
});

test("vendorFromCatalogFilename: round-38 Jarvis Cutting Tools (US tap maker, combo tools) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("jarvis-standard-catalog-2023.pdf"), "Jarvis Cutting Tools");
  assert.equal(vendorFromCatalogFilename("jarvis-mills-catalog-2019.pdf"), "Jarvis Cutting Tools");
  assert.equal(vendorFromCatalogFilename("jarvis-form-taps-2020.pdf"), "Jarvis Cutting Tools");
  // \bjarvis\b is word-anchored — must NOT fire on a substring of another word
  assert.notEqual(vendorFromCatalogFilename("jarvisburg-supplier-map.pdf"), "Jarvis Cutting Tools");
});

test("vendorFromCatalogFilename: round-39 Morse Cutting Tools (broad HSS line, company-anchored) maps to canonical name", () => {
  assert.equal(vendorFromCatalogFilename("morse-cutting-tools-2019-catalog.pdf"), "Morse Cutting Tools");
  assert.equal(vendorFromCatalogFilename("morse-cutting-tools-drills-speeds-feeds.pdf"), "Morse Cutting Tools");
  assert.equal(vendorFromCatalogFilename("morse-cutting-tools-metric-2022.pdf"), "Morse Cutting Tools");
  // anchored on "morse cutting" — must NOT fire on the Morse-taper shank standard that appears in many drill catalogs
  assert.notEqual(vendorFromCatalogFilename("morse-taper-shank-drills.pdf"), "Morse Cutting Tools");
  assert.notEqual(vendorFromCatalogFilename("drill-blank-morse-taper-chart.pdf"), "Morse Cutting Tools");
});

test("vendorFromCatalogFilename: round-39 Precision Twist Drill (PTD) maps to canonical name + mutually exclusive with Triumph Twist Drill", () => {
  assert.equal(vendorFromCatalogFilename("precision-twist-drill-mro-catalog.pdf"), "Precision Twist Drill");
  // precision[-_\s]?twist and triumph[-_\s]?twist must NOT cross-claim each other's files
  assert.notEqual(vendorFromCatalogFilename("precision-twist-drill-mro-catalog.pdf"), "Triumph Twist Drill");
  assert.notEqual(vendorFromCatalogFilename("triumph-twist-drill-catalog.pdf"), "Precision Twist Drill");
  assert.equal(vendorFromCatalogFilename("triumph-twist-drill-catalog.pdf"), "Triumph Twist Drill");
});

test("vendorFromCatalogFilename: round-40 batch (MAPAL/Union Butterfield/Komet/Star Cutter/Eldorado/F&D) maps to canonical names", () => {
  assert.equal(vendorFromCatalogFilename("mapal-bore-machining-catalog.pdf"), "MAPAL");
  assert.equal(vendorFromCatalogFilename("mapal-tritan-drill-reamer-2024.pdf"), "MAPAL");
  assert.equal(vendorFromCatalogFilename("union-butterfield-catalog-2025.pdf"), "Union Butterfield");
  assert.equal(vendorFromCatalogFilename("komet-dihart-reaming-catalog.pdf"), "Komet");
  assert.equal(vendorFromCatalogFilename("komet-microkom-hiflex-brochure.pdf"), "Komet");
  assert.equal(vendorFromCatalogFilename("star-cutter-round-tools-brochure.pdf"), "Star Cutter");
  assert.equal(vendorFromCatalogFilename("star-cutter-gct-section.pdf"), "Star Cutter");
  assert.equal(vendorFromCatalogFilename("drill-masters-eldorado-tool-catalog.pdf"), "Drill Masters-Eldorado Tool");
  assert.equal(vendorFromCatalogFilename("drill-masters-eldorado-price-book-2025.pdf"), "Drill Masters-Eldorado Tool");
  assert.equal(vendorFromCatalogFilename("f-and-d-tool-catalog-75.pdf"), "F&D Tool");
});

test("vendorFromCatalogFilename: round-40 collision guards (star-cutter anchored, NOT bare 'star'; komet/mapal distinct)", () => {
  // bare "star" must NOT fire — it appears inside "Started" in the Autodesk InventorHSM-Getting-Started.pdf software manual
  assert.notEqual(vendorFromCatalogFilename("InventorHSM-Getting-Started.pdf"), "Star Cutter");
  assert.notEqual(vendorFromCatalogFilename("hsm-getting-started-guide.pdf"), "Star Cutter");
  // "star" alone (a different hypothetical "star tool" maker) must not be claimed by the star-cutter/star-su anchor
  assert.notEqual(vendorFromCatalogFilename("star-abrasives-grinding.pdf"), "Star Cutter");
  // Eldorado/Drill-Masters both routes to the one canonical name; neither bleeds into a generic "drill" catalog
  assert.notEqual(vendorFromCatalogFilename("generic-drill-chart.pdf"), "Drill Masters-Eldorado Tool");
  // F&D anchored on the full token, not a stray "d-tool" / "f" substring
  assert.notEqual(vendorFromCatalogFilename("end-mill-tool-guide.pdf"), "F&D Tool");
});

test("vendorFromCatalogFilename: round-41 batch (Microcut/Richards Micro/Ultra-Tool/Advent/Gorilla Mill/BIG Kaiser/Criterion) maps to canonical names", () => {
  assert.equal(vendorFromCatalogFilename("microcut-handbook-catalog.pdf"), "Microcut");
  assert.equal(vendorFromCatalogFilename("richards-micro-tool-catalog.pdf"), "Richards Micro Tool");
  assert.equal(vendorFromCatalogFilename("ultra-tool-tech-speeds-feeds.pdf"), "Ultra-Tool International");
  assert.equal(vendorFromCatalogFilename("ultra-tool-master-catalog.pdf"), "Ultra-Tool International");
  assert.equal(vendorFromCatalogFilename("advent-tool-catalog-2019.pdf"), "Advent Tool");
  assert.equal(vendorFromCatalogFilename("advent-tool-spline-milling.pdf"), "Advent Tool");
  assert.equal(vendorFromCatalogFilename("gorilla-mill-catalog-2013.pdf"), "Gorilla Mill (CGC Tools)");
  assert.equal(vendorFromCatalogFilename("big-kaiser-cutting-data-catalog.pdf"), "BIG Kaiser");
  assert.equal(vendorFromCatalogFilename("big-kaiser-tooling-solutions-2018.pdf"), "BIG Kaiser");
  assert.equal(vendorFromCatalogFilename("criterion-boring-cutting-data.pdf"), "Criterion");
});

test("vendorFromCatalogFilename: round-41 collision guards (cgc!=cgs; ultra/advent/criterion anchored)", () => {
  // Gorilla Mill anchors on "cgc tools" — must NOT collide with the separately-tracked CGS Tool
  assert.notEqual(vendorFromCatalogFilename("cgs-tool-catalog.pdf"), "Gorilla Mill (CGC Tools)");
  assert.equal(vendorFromCatalogFilename("gorilla-mill-catalog-2013.pdf"), "Gorilla Mill (CGC Tools)");
  // ultra[-_\s]?tool requires "tool" after "ultra" — bare "ultra" (e.g. ultrasonic) must not fire
  assert.notEqual(vendorFromCatalogFilename("ultrasonic-cleaner-manual.pdf"), "Ultra-Tool International");
  // advent[-_\s]?tool requires "tool" after — bare "advent" must not fire
  assert.notEqual(vendorFromCatalogFilename("advent-calendar-promo.pdf"), "Advent Tool");
  // criterion is \b-anchored and distinct
  assert.notEqual(vendorFromCatalogFilename("design-criteria-sheet.pdf"), "Criterion");
});

test("vendorFromCatalogFilename: round-42 Mitsubishi Materials (MMC) maps to canonical name + NOT Mitsubishi Electric FA/EDM", () => {
  assert.equal(vendorFromCatalogFilename("mitsubishi-materials-turning-c009e.pdf"), "Mitsubishi Materials");
  assert.equal(vendorFromCatalogFilename("mitsubishi-carbide-rotating-catalog.pdf"), "Mitsubishi Materials");
  // anchored on materials/carbide — must NOT fire on Mitsubishi Electric FA / EDM controller docs (a different company)
  assert.notEqual(vendorFromCatalogFilename("mitsubishi-electric-fa-edm-manual.pdf"), "Mitsubishi Materials");
  assert.notEqual(vendorFromCatalogFilename("mitsubishi-fa-m700-controller.pdf"), "Mitsubishi Materials");
});

test("vendorFromCatalogFilename: empty / non-string -> null", () => {
  assert.equal(vendorFromCatalogFilename(""), null);
  assert.equal(vendorFromCatalogFilename("   "), null);
  assert.equal(vendorFromCatalogFilename(null), null);
  assert.equal(vendorFromCatalogFilename(undefined), null);
  assert.equal(vendorFromCatalogFilename(42), null);
});

// ---------------------------------------------------------------------------
// classifyCatalogCategory
// ---------------------------------------------------------------------------
test("classifyCatalogCategory: turning catalog -> tooling-consumable", () => {
  assert.deepEqual(classifyCatalogCategory("korloy turning.pdf"), ["tooling-consumable"]);
});

test("classifyCatalogCategory: tool holders -> tool-holder", () => {
  assert.deepEqual(classifyCatalogCategory("guhring tool holders.pdf"), ["tool-holder"]);
});

test("classifyCatalogCategory: vise -> fixturing", () => {
  assert.deepEqual(classifyCatalogCategory("543f80b8_2016_orange_vise_catalog.pdf"), ["fixturing"]);
});

test("classifyCatalogCategory: mastercam tutorial -> cam-software", () => {
  assert.deepEqual(classifyCatalogCategory("Mastercam-Basics-Tutorial.pdf"), ["cam-software"]);
});

test("classifyCatalogCategory: tooling systems news -> tool-holder", () => {
  const cats = classifyCatalogCategory("Tooling Systems News 2018 English MetricInch.pdf");
  assert.ok(cats.includes("tool-holder"), `expected tool-holder in ${JSON.stringify(cats)}`);
});

test("classifyCatalogCategory: no signal -> misc fallback (always non-empty)", () => {
  assert.deepEqual(classifyCatalogCategory("catalog_c010b_full.pdf"), ["misc"]);
  assert.deepEqual(classifyCatalogCategory(null), ["misc"]);
});

test("classifyCatalogCategory: carbide/flute/cutter keywords -> tooling-consumable (S/F-bearing)", () => {
  // Regression: these cutting-tool catalogs were mis-tagged misc → excluded from the
  // SFC manifest (isSpeedFeedBearing requires tooling-consumable).
  assert.ok(classifyCatalogCategory("cobra-carbide.pdf").includes("tooling-consumable"));
  assert.ok(classifyCatalogCategory("lakeshore-carbide.pdf").includes("tooling-consumable"));
  assert.ok(classifyCatalogCategory("data-flute.pdf").includes("tooling-consumable"));
  assert.ok(classifyCatalogCategory("niagara-cutter-metric-series.pdf").includes("tooling-consumable"));
  assert.ok(classifyCatalogCategory("yg1-dream-drill.pdf").includes("tooling-consumable"));
});

test("classifyCatalogCategory: carbide on a HOLDER catalog does NOT add tooling-consumable (no SFC leak)", () => {
  // "carbide" is a material descriptor — a carbide shrink-fit HOLDER is not a cutting tool.
  const cats = classifyCatalogCategory("big-daishowa-carbide-shrink-holder.pdf");
  assert.ok(cats.includes("tool-holder"), `expected tool-holder in ${JSON.stringify(cats)}`);
  assert.ok(!cats.includes("tooling-consumable"), `carbide-holder must NOT be S/F-bearing: ${JSON.stringify(cats)}`);
  // a real cutting tool whose name includes carbide still classifies as tooling
  assert.ok(classifyCatalogCategory("cobra-carbide.pdf").includes("tooling-consumable"));
});

test("classifyCatalogCategory: 'machining guide' -> tooling-consumable (OSG regression)", () => {
  // Regression: OSG's HSM guide ("...high-speed-machining-guide...") fell through to misc because
  // "machining guide" was not a TOOLING signal — the same orphaning class as the carbide fix above.
  // One S/F-bearing catalog is enough to flip the aggregate OSG maker record to tooling-consumable.
  assert.ok(classifyCatalogCategory("osg-high-speed-machining-guide.pdf").includes("tooling-consumable"));
});

test("classifyCatalogCategory: bare 'tooling solutions/systems' is NOT S/F-bearing (holder-leak guard)", () => {
  // Conservative: "Tooling Solutions" / "Tooling Systems" is holder-maker language (BIG Daishowa /
  // BIG Kaiser newsletters). It must NOT alone flip a record to tooling-consumable, or holder/boring
  // makers leak into the SFC work-queue. (Soul refuse: non-conservative filter.)
  assert.ok(!classifyCatalogCategory("BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf").includes("tooling-consumable"));
  const ts = classifyCatalogCategory("Tooling Systems.pdf");
  assert.ok(!ts.includes("tooling-consumable"), `tooling-systems must not be S/F-bearing: ${JSON.stringify(ts)}`);
});

test("classifyCatalogCategory: 'machining center' stays a MACHINE (no tooling false-positive)", () => {
  // The new bare-'tooling' / 'machining guide' rule must NOT bleed onto machine-tool catalogs:
  // a "machining center" is the machine, not a cutting tool — it must not become S/F-bearing.
  const cats = classifyCatalogCategory("okuma-genos-machining-center.pdf");
  assert.ok(cats.includes("machine-builder"), `expected machine-builder in ${JSON.stringify(cats)}`);
  assert.ok(!cats.includes("tooling-consumable"), `machining center must NOT be S/F-bearing: ${JSON.stringify(cats)}`);
});

test("vendorFromCatalogFilename: anchored Sandvik brand-code wins over generic helical rule (ordering)", () => {
  // GC_ is Sandvik Coromant's brand code; a helical-flute milling catalog must NOT become "Helical Solutions".
  assert.equal(vendorFromCatalogFilename("GC_2023_helical_milling.pdf"), "Sandvik Coromant");
  // the generic helical rule still resolves when no anchored rule matches
  assert.equal(vendorFromCatalogFilename("helical-machining-guidebook.pdf"), "Helical Solutions");
});

// ---------------------------------------------------------------------------
// buildCatalogSeed — record contract + dedup-by-maker + R12 verified gating
// ---------------------------------------------------------------------------
test("buildCatalogSeed: collapses multiple Sandvik GC_ files into ONE record", () => {
  const recs = buildCatalogSeed([
    "GC_2023-2024_US_Milling.pdf",
    "GC_2023-2024_US_Drilling.pdf",
    "GC_2023-2024_G_Turning-Grooving.pdf",
  ]);
  const sandvik = recs.filter((r) => r.name === "Sandvik Coromant");
  assert.equal(sandvik.length, 1, "three GC_ catalogs must collapse to one maker record");
  // categories unioned across milling+drilling+turning
  assert.ok(sandvik[0].categories.includes("tooling-consumable"));
  assert.equal(sandvik[0].source_tag, "resources-catalog");
});

test("buildCatalogSeed: confirmed maker -> verified true + real https website", () => {
  const [rec] = buildCatalogSeed(["BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf"]);
  assert.equal(rec.name, "BIG Daishowa");
  assert.equal(rec.verified, true);
  assert.equal(rec.website, "https://www.bigdaishowa.com/en");
  assert.ok(rec.website.startsWith("https://"));
  assert.equal(rec.vendor_type, "supplier");
  assert.equal(rec.has_api, false);
  assert.deepEqual(rec.regions, ["US", "JP", "EU"]);
});

test("buildCatalogSeed: Accupro is reseller (MSC house brand), not supplier", () => {
  const [rec] = buildCatalogSeed(["Accupro 2013.pdf"]);
  assert.equal(rec.name, "Accupro");
  assert.equal(rec.vendor_type, "reseller");
  assert.equal(rec.verified, true);
});

test("buildCatalogSeed: Autodesk software -> cam-software category + has_api true", () => {
  const [rec] = buildCatalogSeed(["Fusion360-CAM-Programming-Guide.pdf"]);
  assert.equal(rec.name, "Autodesk");
  assert.equal(rec.vendor_type, "service");
  assert.ok(rec.categories.includes("cam-software"));
  assert.equal(rec.has_api, true);
});

test("buildCatalogSeed: unrecognizable file -> record kept, website null, verified false", () => {
  const [rec] = buildCatalogSeed(["catalog_c010b_full.pdf"]);
  assert.equal(rec.website, null);
  assert.equal(rec.verified, false);
  assert.equal(rec.source_tag, "resources-catalog");
  assert.ok(/needs (human )?verification/i.test(rec.notes), `notes must flag verification: ${rec.notes}`);
  // we never invent a company: name is the literal file stem
  assert.equal(rec.name, "catalog_c010b_full");
});

test("buildCatalogSeed: every emitted record honors the contract shape", () => {
  const recs = buildCatalogSeed([
    "BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf",
    "Solid End Mills.pdf",
    "korloy turning.pdf",
  ]);
  assert.ok(recs.length >= 3);
  const VENDOR_TYPES = new Set(["supplier", "machine-builder", "service", "reseller", "marketplace", "machine-shop"]);
  const REACH = new Set(["global", "national", "regional", "local", "unknown"]);
  const PRICING = new Set(["api", "catalog", "quote", "unknown"]);
  for (const r of recs) {
    assert.equal(typeof r.name, "string");
    assert.ok(r.name.length > 0);
    assert.ok(r.website === null || /^https:\/\//.test(r.website), `website must be null or https: ${r.website}`);
    assert.ok(VENDOR_TYPES.has(r.vendor_type), `bad vendor_type ${r.vendor_type}`);
    assert.ok(Array.isArray(r.categories) && r.categories.length > 0);
    assert.ok(REACH.has(r.reach), `bad reach ${r.reach}`);
    assert.ok(Array.isArray(r.regions));
    assert.ok(PRICING.has(r.pricing_access), `bad pricing_access ${r.pricing_access}`);
    assert.equal(typeof r.has_api, "boolean");
    assert.equal(typeof r.verified, "boolean");
    assert.equal(r.source_tag, "resources-catalog");
    // R12: verified true IFF a real website is present
    if (r.verified) assert.ok(r.website && r.website.startsWith("https://"), "verified record must carry an https site");
    if (!r.website) assert.equal(r.verified, false, "no website => must not be verified");
  }
});

test("buildCatalogSeed: empty / non-array input -> []", () => {
  assert.deepEqual(buildCatalogSeed([]), []);
  assert.deepEqual(buildCatalogSeed(null), []);
  assert.deepEqual(buildCatalogSeed("nope"), []);
});
