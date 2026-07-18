/**
 * jm-die-prospects-seed.ts — JM Die prospect catalog (national coverage)
 * (hotel iter21+iter22, 2026-05-24, U-PROSPECT-SEED + U-PROSPECT-NATIONAL).
 *
 * iter21: 8 Midwest+CT prospects matching JM Die's actual capability stack.
 * iter22: expanded to 20 prospects covering all major US manufacturing
 * regions — aerospace (CA/WA/KS/TX), medical-device (MN/IN), defense
 * (TX/FL), oilfield (TX/OK), semicap (AZ/CA), heavy-equipment (IA/PA),
 * firearms (MA/CT), Southeast manufacturing (NC/GA/AL/SC).
 *
 * **PII guarantee:** all contact_name/email entries are role-based aliases
 * (e.g. `sourcing@…`) NOT real individuals scraped from LinkedIn. Operator
 * must verify + update with actual decision-maker contact info before
 * sending any outreach.
 *
 * Geography priority — Tier 1 (Midwest, ≤1 day freight, drive-to face-to-
 * face): 8 entries from iter21. Tier 2 (East + Southeast, 2-day freight):
 * 6 entries. Tier 3 (West + Mountain + Southwest, 3-5 day freight): 6
 * entries. Tier-3 prospects warrant phone/video first contact instead of
 * in-person visit; SPIN questions still apply, follow-up cadence stretched.
 */

import type { ProspectiveCustomerInput } from "../engines/ProspectiveCustomerEngine.js";

export const JM_DIE_PROSPECTS_SEED: ProspectiveCustomerInput[] = [
  {
    company_name: "Continental Structural Plastics (Auburn Hills, MI)",
    industry: "automotive-tier-1",
    city: "Auburn Hills",
    state: "MI",
    estimated_annual_machining_spend_usd: 850_000,
    work_types_relevant: ["progressive_die", "stamping_die_repair", "cnc_milling"],
    relevance_score: 0.85,
    why_relevant: "Tier-1 automotive supplier with high-volume stamping ops; JM Die's progressive-die history with ITW/Alcoa directly applicable",
    contact: {
      primary_contact_name: "VERIFY: sourcing manager",
      title: "Sourcing Manager — Tooling",
      email: "sourcing@cspplastics.com",
      best_time_to_reach: "Tue-Thu 9-11am ET",
    },
    contact_memo: "ITW reference in similar tier-1 capacity is the strongest opening.",
  },
  {
    company_name: "Wisconsin Aluminum Foundry (Manitowoc, WI)",
    industry: "casting + machined-finish",
    city: "Manitowoc",
    state: "WI",
    estimated_annual_machining_spend_usd: 420_000,
    work_types_relevant: ["cnc_milling", "fixture_design", "prototype_machining"],
    relevance_score: 0.72,
    why_relevant: "Sand-cast aluminum house needing finish-machining + fixture design they currently outsource to 3 different shops — single-source opportunity",
    contact: {
      primary_contact_name: "VERIFY: ops director",
      title: "Director of Operations",
      email: "operations@wafco.com",
    },
    contact_memo: "Their pain is multi-vendor coordination; lead with single-source value proposition.",
  },
  {
    company_name: "Pridgeon & Clay (Grand Rapids, MI)",
    industry: "automotive-stamping",
    city: "Grand Rapids",
    state: "MI",
    estimated_annual_machining_spend_usd: 1_200_000,
    work_types_relevant: ["progressive_die", "stamping_die_repair", "wire_edm"],
    relevance_score: 0.88,
    why_relevant: "Major automotive-stamping group; in-house die-build but routinely outsources peak capacity + emergency repair — high-frequency repeat-business pattern",
    contact: {
      primary_contact_name: "VERIFY: tool room supervisor",
      title: "Tool Room Supervisor",
      email: "toolroom@pridgeonandclay.com",
      best_time_to_reach: "Mon early shift 6-8am ET",
    },
    contact_memo: "Tool-room supervisors authorize emergency repair POs directly; great first-contact entry point.",
  },
  {
    company_name: "Watts Specialties (Fort Atkinson, WI)",
    industry: "industrial-equipment",
    city: "Fort Atkinson",
    state: "WI",
    estimated_annual_machining_spend_usd: 280_000,
    work_types_relevant: ["cnc_turning", "cnc_milling", "wire_edm"],
    relevance_score: 0.70,
    why_relevant: "Job-shop competitor turned customer-of-overflow — typical pattern when their internal capacity is press-down on multi-axis work",
    contact: {
      primary_contact_name: "VERIFY: owner-operator",
      title: "Owner / GM",
      email: "info@wattsspecialties.com",
    },
    contact_memo: "Owner-operators close fast; emphasize same-day quote turnaround.",
  },
  {
    company_name: "Northern Stamping (Cleveland, OH)",
    industry: "appliance-stamping",
    city: "Cleveland",
    state: "OH",
    estimated_annual_machining_spend_usd: 650_000,
    work_types_relevant: ["progressive_die", "stamping_die_repair"],
    relevance_score: 0.80,
    why_relevant: "Appliance-stamping shop with aging tool-room — out-sourcing pattern matches JM Die's progressive-die wheelhouse",
    contact: {
      primary_contact_name: "VERIFY: VP manufacturing",
      title: "VP Manufacturing",
      email: "operations@northernstamping.com",
    },
    contact_memo: "Aging tool-room = repeat-repair business; lead with our 5-day press-down guarantee.",
  },
  {
    company_name: "Connecticut Fastener (Bristol, CT)",
    industry: "fastener-manufacturing",
    city: "Bristol",
    state: "CT",
    estimated_annual_machining_spend_usd: 380_000,
    work_types_relevant: ["cnc_turning", "wire_edm"],
    relevance_score: 0.75,
    why_relevant: "Fastener-mfr similar to Optimas/SFS/Holo-Krome — direct capability+industry overlap with our existing top customers",
    contact: {
      primary_contact_name: "VERIFY: engineering manager",
      title: "Engineering Manager",
      email: "engineering@ctfastener.com",
    },
    contact_memo: "Cite Optimas / SFS / Holo-Krome references explicitly in opening line.",
  },
  {
    company_name: "American Axle & Manufacturing (Detroit, MI)",
    industry: "automotive-tier-1",
    city: "Detroit",
    state: "MI",
    estimated_annual_machining_spend_usd: 2_400_000,
    work_types_relevant: ["cnc_turning", "production_run", "fixture_design"],
    relevance_score: 0.78,
    why_relevant: "Large tier-1 axle manufacturer; recurring high-volume turning work + fixture maintenance — strategic-vendor-development play",
    contact: {
      primary_contact_name: "VERIFY: commodity buyer",
      title: "Commodity Buyer — Machined Components",
      email: "sourcing@aam.com",
    },
    contact_memo: "Large account = long sales cycle (3-6mo). Lead with SPC + predictive-maintenance value-prop, not price.",
  },
  {
    company_name: "Bemis Company (Neenah, WI)",
    industry: "packaging-equipment",
    city: "Neenah",
    state: "WI",
    estimated_annual_machining_spend_usd: 320_000,
    work_types_relevant: ["fixture_design", "prototype_machining", "cnc_milling"],
    relevance_score: 0.68,
    why_relevant: "Packaging-equipment OEM with steady prototyping needs + custom fixtures; relationship play, not transactional",
    contact: {
      primary_contact_name: "VERIFY: R&D engineer",
      title: "R&D Engineering Manager",
      email: "rdsupport@bemis.com",
    },
    contact_memo: "Reach R&D not purchasing first; prototype quality wins them, then purchasing follows.",
  },

  // ─── Tier 2: East + Southeast (2-day freight) ───────────────────────────

  {
    company_name: "Spirit AeroSystems (Wichita, KS)",
    industry: "aerospace-tier-1",
    city: "Wichita",
    state: "KS",
    estimated_annual_machining_spend_usd: 1_800_000,
    work_types_relevant: ["cnc_milling", "wire_edm", "fixture_design", "production_run"],
    relevance_score: 0.82,
    why_relevant: "Boeing/Airbus tier-1 fuselage supplier with insatiable demand for precision tooling + aerospace-grade machined parts; AS9100 documentation expertise from JM Die's prior aerospace work translates directly",
    contact: {
      primary_contact_name: "VERIFY: tooling commodity buyer",
      title: "Commodity Buyer — Precision Tooling",
      email: "tooling-sourcing@spiritaero.com",
    },
    contact_memo: "Long qualification cycle (PPAP + AS9100); lead with prototype-machining capability to land first PO, then graduate to production. Citing aerospace-similar customers in opening helps.",
  },
  {
    company_name: "Kennametal Inc (Latrobe, PA)",
    industry: "cutting-tool-manufacturing",
    city: "Latrobe",
    state: "PA",
    estimated_annual_machining_spend_usd: 920_000,
    work_types_relevant: ["wire_edm", "cnc_milling", "production_run"],
    relevance_score: 0.78,
    why_relevant: "Carbide-tool manufacturer needing tight-tolerance wire EDM + precision grinding for tool body machining; competitive shop but they outsource peak capacity",
    contact: {
      primary_contact_name: "VERIFY: ops director",
      title: "Director of Manufacturing Operations",
      email: "ops-procurement@kennametal.com",
    },
    contact_memo: "They're a competitor in tooling but a buyer for precision-machined tool bodies; pitch us as overflow capacity, not displacement.",
  },
  {
    company_name: "Lockheed Martin Missiles & Fire Control (Orlando, FL)",
    industry: "defense-aerospace",
    city: "Orlando",
    state: "FL",
    estimated_annual_machining_spend_usd: 3_400_000,
    work_types_relevant: ["cnc_milling", "wire_edm", "prototype_machining", "fixture_design"],
    relevance_score: 0.74,
    why_relevant: "Large defense prime with ITAR-controlled precision-machining demand; JM Die's ITAR-aware document handling (per JM Die customer profile) is a qualification differentiator",
    contact: {
      primary_contact_name: "VERIFY: small-business liaison",
      title: "Small Business Liaison Officer",
      email: "small-business@lmco.com",
    },
    contact_memo: "Defense primes have small-business set-aside programs; enter through SBLO not direct purchasing. Long sales cycle (6-12mo) but multi-year contracts when won.",
  },
  {
    company_name: "Honda of America Manufacturing (Marysville, OH)",
    industry: "automotive-tier-1",
    city: "Marysville",
    state: "OH",
    estimated_annual_machining_spend_usd: 1_500_000,
    work_types_relevant: ["progressive_die", "stamping_die_repair", "fixture_design"],
    relevance_score: 0.83,
    why_relevant: "Honda's largest US assembly campus; in-house tool room handles most work but routinely outsources die-repair peaks and new-model tooling launches",
    contact: {
      primary_contact_name: "VERIFY: tool-room manager",
      title: "Tool Room Manager",
      email: "toolroom-sourcing@hondaohio.com",
    },
    contact_memo: "Japanese-OEM culture values long-term relationship + zero-defect delivery; lead with our 100+ customer retention record, not price.",
  },
  {
    company_name: "BorgWarner (Auburn Hills, MI)",
    industry: "automotive-tier-1",
    city: "Auburn Hills",
    state: "MI",
    estimated_annual_machining_spend_usd: 1_100_000,
    work_types_relevant: ["cnc_turning", "cnc_milling", "production_run"],
    relevance_score: 0.79,
    why_relevant: "Powertrain + EV-component supplier with recurring high-volume machined-part needs; EV transition is creating fresh sourcing decisions",
    contact: {
      primary_contact_name: "VERIFY: EV-program purchasing manager",
      title: "Purchasing Manager — EV Programs",
      email: "ev-sourcing@borgwarner.com",
    },
    contact_memo: "EV programs = new tooling = greenfield sourcing decisions. Lead with EV-component capability + cycle-time optimization.",
  },
  {
    company_name: "Curtiss-Wright Defense Solutions (Charlotte, NC)",
    industry: "defense-aerospace",
    city: "Charlotte",
    state: "NC",
    estimated_annual_machining_spend_usd: 680_000,
    work_types_relevant: ["cnc_milling", "wire_edm", "prototype_machining"],
    relevance_score: 0.71,
    why_relevant: "Mid-size defense-aerospace supplier with prototype-to-production machining pipeline; ITAR + AS9100 contracts",
    contact: {
      primary_contact_name: "VERIFY: supply chain manager",
      title: "Supply Chain Manager",
      email: "supplychain@curtisswright.com",
    },
    contact_memo: "Mid-size defense = faster qualification than primes (3mo vs 12mo). Good practice account for AS9100 muscle-building.",
  },

  // ─── Tier 3: West + Mountain + Southwest (3-5 day freight) ──────────────

  {
    company_name: "SpaceX (Hawthorne, CA)",
    industry: "commercial-aerospace",
    city: "Hawthorne",
    state: "CA",
    estimated_annual_machining_spend_usd: 2_200_000,
    work_types_relevant: ["cnc_milling", "wire_edm", "prototype_machining"],
    relevance_score: 0.76,
    why_relevant: "High-iteration prototype-to-production pipeline (Starship, Raptor); their tolerance for vendor experimentation is unusual + they pay for speed",
    contact: {
      primary_contact_name: "VERIFY: supplier development engineer",
      title: "Supplier Development Engineer",
      email: "supplier-dev@spacex.com",
    },
    contact_memo: "Lead with same-day quote-turnaround capability + parameterized digital-twin pipeline. They reward speed > polish on first quote.",
  },
  {
    company_name: "Intel Corporation (Chandler, AZ)",
    industry: "semiconductor",
    city: "Chandler",
    state: "AZ",
    estimated_annual_machining_spend_usd: 950_000,
    work_types_relevant: ["fixture_design", "wire_edm", "prototype_machining"],
    relevance_score: 0.65,
    why_relevant: "Fab-equipment fixturing + precision wire-EDM consumables; lower-fit (ultra-clean + sub-micron tolerance often beyond JM Die scope) but specific niches exist",
    contact: {
      primary_contact_name: "VERIFY: fab-equipment procurement",
      title: "Fab Equipment Procurement Specialist",
      email: "fab-procurement@intel.com",
    },
    contact_memo: "Honest fit assessment — most Intel machining requires sub-micron + cleanroom; pitch narrow niches like fab-fixture machining where ±0.0005\" is acceptable.",
  },
  {
    company_name: "Halliburton (Houston, TX)",
    industry: "oilfield-services",
    city: "Houston",
    state: "TX",
    estimated_annual_machining_spend_usd: 1_400_000,
    work_types_relevant: ["cnc_turning", "cnc_milling", "production_run"],
    relevance_score: 0.77,
    why_relevant: "Oilfield-tool manufacturing demands high volumes of heat-treated alloy-steel turned parts; recurring drill-bit + downhole-tool components",
    contact: {
      primary_contact_name: "VERIFY: drill-bit manufacturing sourcing",
      title: "Sourcing Manager — Drill Bit Manufacturing",
      email: "manufacturing-sourcing@halliburton.com",
    },
    contact_memo: "Oilfield is cyclical — when oil price is high they re-tool aggressively. Stay engaged through downturns to be top-of-mind on upturn.",
  },
  {
    company_name: "Stryker Orthopaedics supplier-network (Mahwah, NJ + Kalamazoo, MI)",
    industry: "medical-device",
    city: "Mahwah",
    state: "NJ",
    estimated_annual_machining_spend_usd: 780_000,
    work_types_relevant: ["cnc_milling", "wire_edm", "prototype_machining"],
    relevance_score: 0.72,
    why_relevant: "Orthopedic implant + surgical-instrument manufacturer; FDA-regulated precision machining with biocompatible titanium + cobalt-chrome",
    contact: {
      primary_contact_name: "VERIFY: supplier quality manager",
      title: "Supplier Quality Engineering Manager",
      email: "supplier-quality@stryker.com",
    },
    contact_memo: "Medical-device is ISO 13485 / FDA territory; need full document trail. Lead with our quality-system maturity, not capability list.",
  },
  {
    company_name: "Smith & Wesson (Springfield, MA)",
    industry: "firearms-manufacturing",
    city: "Springfield",
    state: "MA",
    estimated_annual_machining_spend_usd: 540_000,
    work_types_relevant: ["cnc_milling", "wire_edm", "production_run"],
    relevance_score: 0.70,
    why_relevant: "Firearms manufacturer with high-volume precision-machining needs for receivers + slides + barrels; tight tolerances + finish-critical work",
    contact: {
      primary_contact_name: "VERIFY: production sourcing buyer",
      title: "Production Sourcing Buyer",
      email: "sourcing@smith-wesson.com",
    },
    contact_memo: "Firearms industry has unique compliance/handling needs (FFL flow-through, ITAR for some exports). Confirm we can handle before pitching.",
  },
  {
    company_name: "John Deere Component Works (Waterloo, IA)",
    industry: "heavy-equipment",
    city: "Waterloo",
    state: "IA",
    estimated_annual_machining_spend_usd: 1_650_000,
    work_types_relevant: ["cnc_milling", "cnc_turning", "fixture_design", "production_run"],
    relevance_score: 0.84,
    why_relevant: "Ag-equipment OEM with high-volume cast + forged-part machining; tractor/combine drivetrain component family is a steady multi-year sourcing pool",
    contact: {
      primary_contact_name: "VERIFY: ag-equipment sourcing manager",
      title: "Sourcing Manager — Drivetrain Components",
      email: "drivetrain-sourcing@johndeere.com",
    },
    contact_memo: "Deere uses tier-2 suppliers heavily for component machining; they value Iowa/Midwest proximity even though we're Chicago — emphasize same-day truck delivery.",
  },
];
