#!/usr/bin/env node
// tier: T2
// CAD-PIPELINE-WIRE-MS0/U-CAD-DESIGN-BOOK-SOURCES
//
// Catalog of legitimate, freely-available CAD design + machining training
// sources for AI training corpus expansion. Outputs URLs + topics + system
// hints. NEVER auto-downloads — the operator runs `--apply` on a per-URL
// basis to fetch (or hands the URL to the user-facing PDF ingest pipeline).
//
// Sources tier:
//   tier-1: Official vendor documentation (Autodesk help, SolidWorks help,
//           Mastercam help) — public, copyright-protected, fetch terms-of-use
//           require attribution and no redistribution
//   tier-2: OCW / academic open course material (MIT OCW, MIT 2.008 etc) —
//           CC-BY-NC-SA, freely redistributable with attribution
//   tier-3: Public-domain texts (NIST handbooks, USAF technical manuals,
//           legacy gov-published machining handbooks) — no restrictions
//   tier-4: Vendor-published whitepapers + technical bulletins — case-by-case
//
// Emits state/shared/cad-design-book-sources.json — feed into the PDF ingest
// pipeline (already wired via /pdf-learn skill).

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "..");
const OUT_PATH = resolve(REPO_ROOT, "state/shared/cad-design-book-sources.json");

const SOURCES = [
  // ── TIER-2: MIT OpenCourseWare (CC-BY-NC-SA) — already partially ingested ──
  {
    tier: 2,
    license: "CC-BY-NC-SA",
    system_hint: null,
    topic: "manufacturing-processes",
    title: "MIT 2.008 — Design and Manufacturing II",
    url: "https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2004/",
    notes: "Covers injection molding, machining process planning, GD&T. Foundational corpus for CAD→CAM intent.",
  },
  {
    tier: 2,
    license: "CC-BY-NC-SA",
    system_hint: null,
    topic: "cad-fundamentals",
    title: "MIT 2.007 — Design and Manufacturing I",
    url: "https://ocw.mit.edu/courses/2-007-design-and-manufacturing-i-spring-2009/",
    notes: "Parametric CAD modeling, sketch-to-solid workflows, assembly mate semantics.",
  },
  {
    tier: 2,
    license: "CC-BY-NC-SA",
    system_hint: null,
    topic: "geometric-modeling",
    title: "MIT 6.838 — Geometric Modeling",
    url: "https://ocw.mit.edu/courses/6-838-geometric-modeling-spring-2003/",
    notes: "NURBS, B-spline surfaces, BRep topology — directly relevant to STEP entity interpretation.",
  },
  {
    tier: 2,
    license: "CC-BY-NC-SA",
    system_hint: null,
    topic: "computer-aided-design",
    title: "MIT 2.972 — How and Why Machines Work",
    url: "https://ocw.mit.edu/courses/2-972-how-and-why-machines-work-spring-2009/",
    notes: "Mechanism design vocabulary used in assembly modeling.",
  },

  // ── TIER-1: Official vendor reference (public, attribution-required) ──
  {
    tier: 1,
    license: "Vendor-Documentation",
    system_hint: "fusion360",
    topic: "fusion360-help",
    title: "Autodesk Fusion 360 Help (official)",
    url: "https://help.autodesk.com/view/fusion360/ENU/",
    notes: "Per-feature parameter reference + workflow guides. Use for fusion360/{op}/{param}.md backfill where wiki entries are stubs.",
  },
  {
    tier: 1,
    license: "Vendor-Documentation",
    system_hint: "fusion360",
    topic: "fusion360-api",
    title: "Fusion 360 API & Scripts Reference",
    url: "https://help.autodesk.com/view/fusion360/ENU/?guid=GUID-A92A4B10-3781-4925-94C6-47DA85A4F65A",
    notes: "Python/JS API object model — enables programmatic part regen via cad_multi_system_produce_part.",
  },
  {
    tier: 1,
    license: "Vendor-Documentation",
    system_hint: "inventor",
    topic: "inventor-help",
    title: "Autodesk Inventor Help",
    url: "https://help.autodesk.com/view/INVNTOR/2024/ENU/",
    notes: "iFeature catalog, parametric sheet metal, weldments. Inventor=priority-5 in current order.",
  },
  {
    tier: 1,
    license: "Vendor-Documentation",
    system_hint: "solidworks",
    topic: "solidworks-help",
    title: "SolidWorks Web Help",
    url: "https://help.solidworks.com/HelpProducts.aspx",
    notes: "Per-version feature manager reference. Multi-version splits (2022/2023/2024) — pick latest the shop runs.",
  },
  {
    tier: 1,
    license: "Vendor-Documentation",
    system_hint: "solidworks",
    topic: "solidworks-api",
    title: "SolidWorks API & SDK Documentation",
    url: "https://help.solidworks.com/SearchHelp.aspx?versionID=33&isHelpPage=0&prod=API",
    notes: "COM/.NET API — feature regen primitives that map 1:1 to cad-params/solidworks/{op}/* wiki entries.",
  },
  {
    tier: 1,
    license: "Vendor-Documentation",
    system_hint: "mastercam",
    topic: "mastercam-help",
    title: "Mastercam Help (CNC Software, Inc.)",
    url: "https://help.mastercam.com/",
    notes: "Toolpath parameter reference. Spans 2020+ versions; AP-Series + Mill 3D + Lathe + Wire.",
  },
  {
    tier: 1,
    license: "Vendor-Documentation",
    system_hint: "hypercad",
    topic: "hypermill-docs",
    title: "OPEN MIND hyperMILL / hyperCAD-S documentation",
    url: "https://www.openmind-tech.com/en-us/products/cam-software-hypermill/documentation.html",
    notes: "hyperCAD-S is the CAD frontend bundled with hyperMILL. Priority-1 in current order. Per-feature PDFs.",
  },

  // ── TIER-3: Public-domain machining + engineering references ──
  {
    tier: 3,
    license: "Public-Domain",
    system_hint: null,
    topic: "machining-handbook",
    title: "Machinery's Handbook (older editions, pre-1928)",
    url: "https://archive.org/details/MachinerysHandbook2ndEdition1916",
    notes: "Industrial Press, pre-1928 = US public domain. Geometric dimensioning, thread tables, speed/feed nomographs.",
  },
  {
    tier: 3,
    license: "Public-Domain",
    system_hint: null,
    topic: "drafting-fundamentals",
    title: "Engineering Drawing — French (1947+)",
    url: "https://archive.org/details/engineeringdrawi00fren",
    notes: "Foundational orthographic projection + dimensioning conventions. Many editions free on archive.org.",
  },
  {
    tier: 3,
    license: "Public-Domain",
    system_hint: null,
    topic: "gd&t-fundamentals",
    title: "USAF / USN technical manuals — engineering drawing standards",
    url: "https://archive.org/search?query=subject%3A%22engineering+drawing%22+collection%3A%22pub_us-military%22",
    notes: "DoD-published manuals are public domain. GD&T pre-ASME Y14.5-1994 reference + manufacturing tolerance theory.",
  },
  {
    tier: 3,
    license: "Public-Domain",
    system_hint: null,
    topic: "metal-cutting-physics",
    title: "NIST Manufacturing Engineering Laboratory technical notes",
    url: "https://www.nist.gov/publications/search?k=manufacturing+CAD",
    notes: "Federal-publication public-domain. Process-physics baselines complementing Kienzle/Taylor (already in `mcp-server/src/physics/constants.ts`).",
  },
  {
    tier: 3,
    license: "Public-Domain",
    system_hint: null,
    topic: "step-file-spec",
    title: "ISO 10303-21 STEP file specification (informative)",
    url: "https://www.steptools.com/stds/step/IS_final_p21e3.html",
    notes: "Free informative spec. Direct relevance to step-feature-extract.mjs entity dictionary.",
  },
  {
    tier: 3,
    license: "Public-Domain",
    system_hint: null,
    topic: "brep-topology",
    title: "ISO 10303-42 BRep topology specification (informative)",
    url: "https://www.steptools.com/stds/step/",
    notes: "Authoritative BRep entity catalog (CARTESIAN_POINT, B_SPLINE_SURFACE_WITH_KNOTS, ADVANCED_FACE, MANIFOLD_SOLID_BREP, ...).",
  },

  // ── TIER-4: Vendor whitepapers + research papers ──
  {
    tier: 4,
    license: "Free-with-Registration",
    system_hint: "fusion360",
    topic: "generative-design",
    title: "Autodesk Generative Design whitepapers",
    url: "https://www.autodesk.com/solutions/generative-design",
    notes: "Topology optimization → CAD generation. Useful for AI-driven part regen training.",
  },
  {
    tier: 4,
    license: "Free-with-Registration",
    system_hint: null,
    topic: "feature-recognition",
    title: "Springer / Elsevier open-access feature recognition papers",
    url: "https://www.sciencedirect.com/search?qs=feature+recognition+CAD",
    notes: "Many open-access in CAD/CAE journals. Train AI on B-rep → semantic-feature mapping.",
  },
  {
    tier: 4,
    license: "Free",
    system_hint: null,
    topic: "grabcad-models",
    title: "GrabCAD community library (download CAD models)",
    url: "https://grabcad.com/library",
    notes: "User-licensed models. Use ONLY models with explicit redistribution license for training. The current regen-target Impeller turbine.stp / ROTOR SHAFT.STEP likely originated here.",
  },
];

function summarize(sources) {
  const tiers = sources.reduce((acc, s) => { acc[`tier-${s.tier}`] = (acc[`tier-${s.tier}`] ?? 0) + 1; return acc; }, {});
  const systems = sources.reduce((acc, s) => {
    const k = s.system_hint || "_general";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  return { totalSources: sources.length, tierBreakdown: tiers, systemBreakdown: systems };
}

function main() {
  const out = {
    schemaVersion: 1,
    builtAt: new Date().toISOString().slice(0, 10),
    purpose: "Cataloged sources for AI training corpus expansion. Operator-mediated download only — NEVER auto-fetch. Each source carries license tier + attribution requirements.",
    fetchProtocol: [
      "1. Review license tier before download (tier-1 vendor docs require attribution, no redistribution; tier-2 OCW CC-BY-NC-SA permits redistribution with attribution; tier-3 public-domain unrestricted).",
      "2. Use /pdf-learn skill to ingest downloaded PDFs into knowledge/wiki/architecture/extracts/.",
      "3. Tag extracted content with `source_url` + `license_tier` in frontmatter for downstream attribution.",
      "4. Do NOT redistribute tier-1 content — link to vendor URL instead.",
    ],
    ...summarize(SOURCES),
    sources: SOURCES,
    advisory_only: true,
    mustHumanVerify: true,
  };

  if (!existsSync(dirname(OUT_PATH))) mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`[cad-design-book-sources] wrote ${OUT_PATH}`);
  console.log(`  total=${out.totalSources}`);
  console.log(`  tiers=${JSON.stringify(out.tierBreakdown)}`);
  console.log(`  by-system=${JSON.stringify(out.systemBreakdown)}`);
  console.log(`\n  Run /pdf-learn against downloaded PDFs to feed extracts into wiki + tribal pipelines.`);
}

main();
