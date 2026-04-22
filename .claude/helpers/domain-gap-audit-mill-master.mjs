#!/usr/bin/env node
/**
 * Domain-completeness audit for MILL-MASTER.
 *
 * The structural scrutinizer only scores unit hygiene; it says nothing about
 * whether the ROADMAP COVERS the milling domain. This script runs a keyword
 * sweep organized by axis. For each axis we classify terms:
 *
 *   STRONG    — ≥ 3 unit hits (well-covered)
 *   PARTIAL   — 1-2 hits (shallow coverage, verify intent)
 *   MISSING   — 0 hits (candidate gap — either add a unit or record explicit waiver)
 *
 * Output is a gap report sorted by severity. This is NOT a score-gate — it is
 * a signal for human review. The author picks which "MISSING" items to absorb
 * into the envelope vs. defer as out-of-scope.
 */
import fs from "node:fs";

const ENV_FILE = "H:/prism/mcp-server/data/milestones/MILL-MASTER.json";
const REPORT_FILE = "H:/prism/mcp-server/data/milestones/MILL-MASTER.domain-audit.json";

const env = JSON.parse(fs.readFileSync(ENV_FILE, "utf8"));

// Build corpus: all unit blobs lowercased
const corpus = [];
for (const p of env.phases) {
  for (const u of (p.units || [])) {
    const blob = [u.id, u.title || "", u.description || "", JSON.stringify(u.steps || []), JSON.stringify(u.deliverables || [])].join(" ").toLowerCase();
    corpus.push({ phase: p.id, unit: u.id, blob });
  }
}

const hits = (term) => corpus.filter((c) => c.blob.includes(term.toLowerCase()));

// Domain taxonomy — 15 axes
const AXES = {
  "A1 — Milling operations & strategies": [
    "face mill", "peripheral mill", "shell mill", "fly cut", "end mill ball", "end mill bull", "end mill square", "end mill tapered",
    "slot drill", "t-slot", "dovetail", "woodruff", "polygon",
    "plunge rough", "ramp entry", "helical entry", "trochoidal", "adaptive clear", "hsm", "high-feed", "waveform mill", "morph spiral",
    "constant-z", "waterline", "scallop", "pencil mill", "rest machin", "flowline", "projection toolpath", "parallel finish",
    "3+2 indexed", "swarf", "flank mill", "sturz", "barrel tool",
    "thread mill", "gear hob", "gear shape", "involute",
    "drilling peck", "chip break", "gun drill", "bta drill", "skiving",
    "single-point boring", "back-bore", "line-bore", "step-bore",
    "reaming", "tapping rigid", "tapping floating", "cold-form tap", "roll tap",
    "engraving", "chamfer", "deburr on-machine",
    "4th axis indexed", "4th axis continuous", "tombstone jump",
    "trunnion", "head/head", "table/table", "head/table", "swivel head",
  ],
  "A2 — Cutting physics & models": [
    "kienzle", "merchant", "oxley", "zorev", "coulomb",
    "johnson-cook", "zerilli-armstrong", "follansbee",
    "usui wear", "takeyama", "archard", "kramer tool life",
    "komanduri-hou", "jaeger moving", "blok flash",
    "altintas", "budak", "semi-discretization", "sld stability",
    "timoshenko", "euler-bernoulli", "shell thin-wall",
    "brammertz surface", "astakhov", "recht shear",
    "ulutan residual", "mittal",
    "albrecht edge",
    "plowing", "size effect", "minimum uncut chip",
    "quadrant reversal", "cogging", "servo following error",
    "generating cut", "form cut",
  ],
  "A3 — Master AI cross-system": [
    "prismmasterorchestrator", "master orchestrator facade",
    "cross-domain reasoning", "mill ↔ lathe", "mill-lathe unified", "cross-domain kb",
    "session memory", "cross-chat persist",
    "goal-state inference",
    "multi-agent coordination",
    "router learning", "router policy",
    "cold-start bootstrap", "warm-start",
    "master safety envelope", "master veto",
    "human-in-the-loop escalation",
    "ethical override", "kill switch",
    "adversarial prompt defense",
    "constitutional ai",
    "tier routing", "haiku sonnet opus",
    "escalation policy",
  ],
  "A4 — CAD/CAM-specific ML": [
    "text-to-cad", "mesh completion", "point cloud encoder",
    "cam intent recognition", "programmer intent",
    "tool selection recommender", "feed/speed recommender",
    "strategy recommender", "engagement-aware strategy",
    "g-code transformer", "gcode transformer",
    "g-code verifier", "gcode classifier",
    "part similarity retrieval", "clip embedding part",
    "acoustic chatter detection", "current signature chatter", "vision chip detection",
    "rul remaining useful life", "wear prediction",
    "toolpath rl", "reinforcement toolpath",
    "parameter recovery", "tribal + physics hybrid",
    "few-shot adaptation", "new material few-shot",
    "conformal prediction", "ensemble uq",
    "active learning labeler",
    "ewc continual", "replay buffer continual",
  ],
  "A5 — Machine brands & controllers": [
    "fanuc 30i", "fanuc 31i", "fanuc 32i",
    "heidenhain tnc640", "heidenhain itnc530",
    "siemens 840d", "siemens 828d",
    "okuma osp-p300", "okuma osp-p500",
    "mazak smooth", "mazatrol",
    "haas ngc",
    "mitsubishi m800", "mitsubishi m80",
    "centroid", "hurco winmax",
    "prototrak", "tormach",
    "beckhoff twincat", "power automation",
    "hermle", "matsuura", "kitamura", "grob", "heller", "huron", "starrag", "mikron", "yasda", "niigata",
    "doosan puma mill", "hyundai wia",
    "dmg mori dmu", "makino d/v",
    "tornos deco", "citizen cincom", "star sw", "tsugami",
  ],
  "A6 — Machine dynamics & cal": [
    "servo cascade tune", "bode margin",
    "backlash comp", "ball-screw wear",
    "quadrant reversal spike",
    "thermal growth per-axis",
    "iso 230-1", "iso 230-6",
    "volumetric error comp", "volumetric calibration",
    "ball-bar", "renishaw qc20",
    "laser tracker", "api tracker",
    "squareness", "straightness", "angular error",
  ],
  "A7 — Coolant & lubrication": [
    "mql oil/water", "mql nozzle",
    "ln2 nozzle", "lco2 nozzle", "cryo frost",
    "high-pressure 1000psi", "high-pressure 2500psi", "high-pressure 5000psi",
    "vane pump", "screw pump", "piston pump",
    "biocide", "tramp oil",
    "refractometer",
    "mos2 coating", "graphite lubric",
    "through-tool coolant", "thru-spindle coolant",
    "sintered porous cool",
  ],
  "A8 — Fixtures & workholding": [
    "3-jaw self-centering", "4-jaw independent", "6-jaw",
    "collet chuck", "hydraulic chuck", "pneumatic chuck",
    "angle-lock vise", "dual-station vise", "5-axis vise",
    "schunk vero-s", "jergens ball-lock", "erowa", "system 3r",
    "electro magnetic chuck", "permanent magnet chuck",
    "vacuum checker", "tacky mat",
    "rigidax", "hot-melt wax",
    "toe clamp", "strap clamp", "step-block",
    "soft jaw", "full-form jaw",
    "topology-optimized fixture", "am-printed fixture", "3d-printed fixture",
  ],
  "A9 — Safety & compliance": [
    "iso 13849", "pl a", "pl b", "pl c", "pl d", "pl e",
    "iec 61508", "sil 1", "sil 2", "sil 3",
    "iso 13850",
    "iso 14119",
    "ansi b11.19",
    "nfpa 79",
    "osha 29 cfr 1910",
    "machinery directive 2006/42",
    "ce marking", "ukca",
    "atex", "explosive atmosphere",
    "ul 508a", "csa c22.2",
  ],
  "A10 — Quality & inspection": [
    "roundness iso 6318", "cylindricity iso 12181",
    "ra", "rz", "rt", "rp", "rv", "rq", "rsk", "rku",
    "sa", "sz", "areal surface",
    "abbott-firestone",
    "gage r&r 10%", "gage r&r 30%",
    "gum uncertainty", "jcgm 100",
    "iso 17025 lab",
    "ppap level",
    "nadcap ac7114",
    "as9102",
    "dye penetrant", "magnetic particle", "ultrasonic ndt", "eddy current", "x-ray ct",
    "marposs",
  ],
  "A11 — Cost & business": [
    "full absorption", "direct labor", "marginal cost",
    "oee avail", "teep loading",
    "drum-buffer-rope", "theory of constraints",
    "takt time", "kanban pull",
    "make-vs-buy",
    "currency hedge",
    "letter of credit", "net 30", "2/10 net 30",
    "warranty accrual",
    "rework cost allocation",
    "capacity-constrained schedule",
  ],
  "A12 — Sustainability": [
    "iso 14001", "iso 50001",
    "ghg protocol", "scope 1", "scope 2", "scope 3",
    "cdp report",
    "sbti near-term", "sbti net-zero",
    "tcfd",
    "wri water",
    "tnfd biodiversity",
    "iso 45001", "sa8000",
    "conflict minerals", "3tg dodd-frank",
    "rohs", "reach regulation", "prop 65",
  ],
  "A13 — Workforce": [
    "isa-95 role",
    "nims level 1", "nims level 2", "nims level 3",
    "ipc-a-610",
    "aws d1.1",
    "crane osha", "forklift osha",
    "confined-space", "respirator fit",
    "rula", "reba", "niosh lifting",
  ],
  "A14 — Cybersecurity": [
    "nist csf 2.0", "cis controls",
    "spiffe", "spire",
    "cyberark", "beyondtrust",
    "crowdstrike", "sentinelone", "defender atp",
    "splunk", "sentinel siem", "elastic siem",
    "honeypot deception",
    "dragos", "claroty", "nozomi", "armis",
    "industrial dmz", "microsegmentation",
  ],
  "A15 — Docs & knowledge mgmt": [
    "sop work-instruction",
    "iso 9001 document control",
    "ecn engineering change", "ecr engineering change",
    "training matrix",
    "fmea design", "fmea process",
    "apqp control plan",
    "dfmea", "pfmea",
  ],
  "A16 — JM Die core: Die & mold": [
    "die cavity", "mold core",
    "conformal cooling", "3d-printed mold",
    "ejector pin", "ejector layout",
    "mirror finish", "diamond polish",
    "edm electrode overburn",
    "parting line", "witness line",
    "runner gate", "sprue",
    "slide lifter", "split core",
    "draft angle",
    "undercut 5-axis",
    "weld-repair die", "blend repair",
    "tool stone", "die stoning",
    "shut-off surface",
  ],
  "A17 — Specialty ops (micro, thread-mill, high-feed, etc.)": [
    "micromilling", "micro-tool", "needle tool",
    "air-bearing spindle", "40k rpm", "60k rpm",
    "size effect physics", "minimum chip thickness",
    "thread-mill authoring", "npt thread", "acme thread", "trapezoidal thread",
    "high-feed mill", "high-feed authoring",
    "wave-form authoring",
    "helical interpolation",
    "spiral bore",
  ],
  "A18 — Scale / observability / cost-gov": [
    "load test concurrent", "throughput test",
    "latency budget", "p99 latency",
    "rate limit", "token budget cap",
    "cost governance",
    "opentelemetry mill", "tracing mill",
    "sli slo mill",
    "error budget",
    "chaos fault injection",
  ],
};

const report = { generated_at: new Date().toISOString(), envelope_version: env.version, axes: {} };
let totalMissing = 0;
let totalPartial = 0;
let totalStrong = 0;

for (const [axis, terms] of Object.entries(AXES)) {
  const rows = terms.map((t) => {
    const h = hits(t);
    const cls = h.length === 0 ? "MISSING" : h.length <= 2 ? "PARTIAL" : "STRONG";
    if (cls === "MISSING") totalMissing++;
    if (cls === "PARTIAL") totalPartial++;
    if (cls === "STRONG") totalStrong++;
    return { term: t, hits: h.length, classification: cls, sample: h.slice(0, 3).map((x) => x.unit) };
  });
  const missing = rows.filter((r) => r.classification === "MISSING");
  const partial = rows.filter((r) => r.classification === "PARTIAL");
  const strong = rows.filter((r) => r.classification === "STRONG");
  report.axes[axis] = {
    total_terms: terms.length,
    strong: strong.length,
    partial: partial.length,
    missing: missing.length,
    missing_terms: missing.map((r) => r.term),
    partial_terms: partial.map((r) => ({ term: r.term, hits: r.hits, sample: r.sample })),
  };
}

report.summary = {
  total_axes: Object.keys(AXES).length,
  total_terms: Object.values(AXES).reduce((s, a) => s + a.length, 0),
  strong_total: totalStrong,
  partial_total: totalPartial,
  missing_total: totalMissing,
  coverage_pct: ((totalStrong + totalPartial) / (totalStrong + totalPartial + totalMissing) * 100).toFixed(1),
};

fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), "utf8");

console.log("Domain-completeness audit — MILL-MASTER v" + env.version);
console.log("=".repeat(64));
console.log(`Total terms:  ${report.summary.total_terms}`);
console.log(`Strong:       ${report.summary.strong_total}`);
console.log(`Partial:      ${report.summary.partial_total}`);
console.log(`Missing:      ${report.summary.missing_total}`);
console.log(`Coverage %:   ${report.summary.coverage_pct}%`);
console.log("");
console.log("By axis (missing-first):");
console.log("");
const axisSorted = Object.entries(report.axes).sort((a, b) => b[1].missing - a[1].missing);
for (const [axis, data] of axisSorted) {
  const barlen = Math.min(data.missing, 20);
  const bar = "█".repeat(barlen) + "░".repeat(Math.max(0, 20 - barlen));
  console.log(`  ${axis}`);
  console.log(`    ${bar} missing ${data.missing}/${data.total_terms}  (partial ${data.partial}, strong ${data.strong})`);
  if (data.missing > 0) {
    const sample = data.missing_terms.slice(0, 6).join(", ") + (data.missing_terms.length > 6 ? ` + ${data.missing_terms.length - 6} more` : "");
    console.log(`    ↳ missing: ${sample}`);
  }
  console.log("");
}
console.log(`Full report: ${REPORT_FILE}`);
