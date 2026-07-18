#!/usr/bin/env node
/**
 * decompose-units.js — Generate unit arrays for all milestones in roadmap-index.json
 *
 * Strategy:
 * 1. Read envelope files (data/milestones/*.json) for detailed unit data
 * 2. Read roadmap markdown for milestone unit descriptions
 * 3. Auto-generate units for any remaining milestones based on title + total_units
 * 4. Write updated roadmap-index.json
 */
const fs = require("fs");
const path = require("path");

const RI_PATH = path.join(__dirname, "../data/roadmap-index.json");
const MILESTONES_DIR = path.join(__dirname, "../data/milestones");
const ROADMAP_PATH = path.join(__dirname, "../../PRISM-UNIFIED-ROADMAP-v2.md");

// Load roadmap index
const ri = JSON.parse(fs.readFileSync(RI_PATH, "utf-8"));

// Stats
let fromEnvelope = 0, fromRoadmap = 0, autoGen = 0, alreadyHad = 0, skipped = 0;

// ==========================================
// PHASE 1: Extract units from envelope files
// ==========================================
const envelopeUnits = {}; // msId -> units[]

if (fs.existsSync(MILESTONES_DIR)) {
  const files = fs.readdirSync(MILESTONES_DIR).filter(f => f.endsWith(".json"));
  for (const file of files) {
    try {
      const env = JSON.parse(fs.readFileSync(path.join(MILESTONES_DIR, file), "utf-8"));
      if (!env.id) continue;

      // Collect units from all phases
      const units = [];
      if (env.phases && Array.isArray(env.phases)) {
        for (const phase of env.phases) {
          if (phase.units && Array.isArray(phase.units)) {
            for (const u of phase.units) {
              units.push({
                id: u.id,
                title: u.title || u.description || `Unit ${u.id}`,
                status: u.status || "not_started"
              });
            }
          }
        }
      }
      // Some envelopes have units at top level
      if (env.units && Array.isArray(env.units)) {
        for (const u of env.units) {
          units.push({
            id: u.id,
            title: u.title || u.description || `Unit ${u.id}`,
            status: u.status || "not_started"
          });
        }
      }

      if (units.length > 0) {
        envelopeUnits[env.id] = units;
      }
    } catch (e) {
      // Skip malformed envelopes
    }
  }
}

console.log(`Envelope files scanned: ${Object.keys(envelopeUnits).length} milestones with units`);

// ==========================================
// PHASE 2: Extract units from roadmap markdown
// ==========================================
const roadmapUnits = {}; // msId -> units[]

if (fs.existsSync(ROADMAP_PATH)) {
  const roadmap = fs.readFileSync(ROADMAP_PATH, "utf-8");

  // Pattern: milestone headers like "### PP-H0: Safety & M-Code Fixes" followed by "- U-XXX: description"
  const unitPattern = /^[-*]\s+(U-[A-Z0-9]+):\s+(.+)$/gm;
  // Pattern: milestone ID like "### CWEDM-MS0:" or "### PP-H0:"
  const msPattern = /^###\s+([A-Z0-9]+-(?:MS\d+[A-Z]?|H\d+|P\d+[A-Z]?))\b/gm;

  let currentMs = null;
  const lines = roadmap.split("\n");

  for (const line of lines) {
    // Check for milestone header
    const msMatch = line.match(/^###\s+([A-Z0-9]+-(?:MS[-]?\d+[A-Z]?|H\d+|P\d+[A-Z]?))\b/);
    if (msMatch) {
      currentMs = msMatch[1];
      if (!roadmapUnits[currentMs]) roadmapUnits[currentMs] = [];
    }

    // Check for unit line
    const unitMatch = line.match(/^[-*]\s+(U-[A-Z0-9]+):\s+(.+)$/);
    if (unitMatch && currentMs) {
      roadmapUnits[currentMs].push({
        id: unitMatch[1],
        title: unitMatch[2].trim(),
        status: "not_started"
      });
    }

    // Also handle "Session N (U-XXX..YYY): description" pattern
    const sessionMatch = line.match(/^[-*]\s+Session\s+\d+\s+\((U-[A-Z0-9]+)\.\.(\d+)\):\s+(.+)$/);
    if (sessionMatch && currentMs) {
      const prefix = sessionMatch[1].replace(/\d+$/, "");
      const startNum = parseInt(sessionMatch[1].match(/\d+$/)[0]);
      const endNum = parseInt(sessionMatch[2]);
      const desc = sessionMatch[3].trim();
      const parts = desc.split(/\s*\+\s*/);

      for (let i = startNum; i <= endNum; i++) {
        const partIdx = i - startNum;
        roadmapUnits[currentMs].push({
          id: `${prefix}${String(i).padStart(2, "0")}`,
          title: parts[partIdx] || `${desc} (part ${partIdx + 1})`,
          status: "not_started"
        });
      }
    }
  }
}

const rmCount = Object.entries(roadmapUnits).filter(([,u]) => u.length > 0).length;
console.log(`Roadmap markdown: ${rmCount} milestones with units`);

// ==========================================
// PHASE 3: Generate unit ID prefix from track
// ==========================================
function getUnitPrefix(msId, track) {
  // Try to derive from track
  const prefixMap = {
    "INGEST": "ING", "S0": "S0", "S1": "S1", "S2": "S2", "S3": "S3", "S4": "S4",
    "L0": "L0", "L1": "L1", "L2": "L2", "L3": "L3", "L4": "L4", "L5": "L5",
    "L6": "L6", "L7": "L7", "L8": "L8", "L9": "L9", "L10": "L10",
    "CC": "CC", "CC-EXT": "CCX", "CAMX": "CX", "CCM": "CCM",
    "CK": "CK", "CAMK": "CK2", "LATHE": "LAT", "LATHE-PRO": "LP",
    "MILL-HARD": "MH", "F360": "F3", "F360-AP": "FAP", "F360-FULL": "FF",
    "F360-REV": "FR", "HM-KC": "HK", "HM-PLG": "HP", "HM-REV": "HR",
    "BIZ": "BZ", "MF": "MF", "BP": "BP", "APPW": "AW",
    "QA": "QA", "BENCH": "BN", "ACP": "ACP", "MXU": "MX",
    "SCIMATH": "SM", "SCI": "SC", "PP": "PP", "PP-REV": "PR",
    "PP-MOAT": "PM", "CPL": "CPL", "PCCA": "PCA", "PPG-VAR": "PV",
    "LEARN": "LRN", "EIGC": "EG", "RES": "RES",
    "BOX": "BOX", "DB-EXP": "DBX", "WEDM": "WE", "WEDM-CAL": "WC",
    "ELEC-PIPE": "ELP", "SINKER-FULL": "SKF", "WIRE": "WR",
    "LASER-PIPE": "LSR", "WATER-PIPE": "WTP", "VID-EXT": "VE",
    "PDF-EXT": "PE", "ULT": "ULT", "PIPE": "PIP",
    "ARCH": "ARC", "SYS": "SYS", "FMERGE": "FM", "INFRA": "INF",
    "REM": "REM", "RT": "RT", "VAR": "VAR",
    "QS": "QS", "HBK": "HBK", "TC": "TC", "PROD": "PRD",
    "VL": "VL", "PB": "PB", "USF": "USF", "CLI": "CLI",
    "APP": "APP", "GAP": "GAP", "SIM": "SIM", "MCAT": "MCT",
    "EMP": "EMP", "TOKEN-OPT": "TOK", "CWEDM": "CWE",
    "CALC-HARDEN": "CH", "PIPELINE-VAR": "PLV", "BOX-AUDIT": "BA",
    "WEDM-100PCT": "W1P", "WEDM-LAUNCH": "WL", "WEDM-GAPFILL": "WGF",
    "WEDM-INT": "WI", "WEDM-HARDEN": "WH", "WEDM-CAL": "WCL",
    "PROD-GATE": "PG", "SCIMATH-WIRE": "SMW", "PPG-REAL": "PGR",
    "RX": "RX",
  };

  if (track && prefixMap[track]) return prefixMap[track];

  // Derive from milestone ID: take letters before -MS
  const base = msId.split("-MS")[0].replace(/-/g, "");
  return base.substring(0, 4).toUpperCase();
}

// ==========================================
// PHASE 4: Generate descriptive units from title
// ==========================================
function generateUnitsFromTitle(ms) {
  const { id, title, total_units, track, description } = ms;
  const count = Math.max(total_units || 2, 2);
  const prefix = getUnitPrefix(id, track);

  // Get a starting number offset based on ms index in its track
  const msNum = parseInt((id.match(/MS[-]?(\d+)/) || [, "0"])[1]) || 0;
  const baseNum = msNum * 10 + 1;

  const units = [];

  // Generate meaningful unit titles based on the milestone title and count
  const titleLower = title.toLowerCase();

  // Common decomposition patterns based on domain
  const patterns = getDecompositionPattern(titleLower, title, count, description);

  for (let i = 0; i < count; i++) {
    const unitNum = String(baseNum + i).padStart(2, "0");
    units.push({
      id: `U-${prefix}${unitNum}`,
      title: patterns[i] || `${title} — part ${i + 1}/${count}`,
      status: ms.status === "complete" ? "complete" : "not_started"
    });
  }

  return units;
}

function getDecompositionPattern(titleLower, title, count, description) {
  const desc = (description || "").toLowerCase();
  const combined = titleLower + " " + desc;

  // Engine/Dispatcher creation milestones
  if (combined.includes("engine") || combined.includes("dispatcher")) {
    const base = [
      `Design schema + interfaces for ${title}`,
      `Implement core engine logic`,
      `Wire to dispatcher with z.enum action list`,
      `Unit tests + integration validation`,
      `Documentation + hook wiring`,
      `Performance optimization + edge cases`
    ];
    return base.slice(0, count);
  }

  // Pipeline milestones
  if (combined.includes("pipeline")) {
    const base = [
      `Define pipeline stages + data flow for ${title}`,
      `Implement ingestion/input stage`,
      `Implement processing/transform stages`,
      `Implement output/export stage`,
      `Error handling + retry logic`,
      `Integration tests + benchmark`
    ];
    return base.slice(0, count);
  }

  // UI/Frontend milestones
  if (combined.includes("ui") || combined.includes("frontend") || combined.includes("dashboard") || combined.includes("page") || combined.includes("calculator")) {
    const base = [
      `Design UI components + layout for ${title}`,
      `Implement data fetching + state management`,
      `Build interactive controls + forms`,
      `Add visualization (charts/tables/displays)`,
      `Responsive design + accessibility`,
      `E2E testing + user flow validation`
    ];
    return base.slice(0, count);
  }

  // Test/QA/Audit milestones
  if (combined.includes("test") || combined.includes("audit") || combined.includes("validation") || combined.includes("verification") || combined.includes("qa") || combined.includes("hardening")) {
    const base = [
      `Audit existing coverage + identify gaps for ${title}`,
      `Write unit tests for core logic`,
      `Write integration tests for cross-engine flows`,
      `Edge case + boundary testing`,
      `Performance/regression benchmarks`,
      `Documentation + CI gate wiring`
    ];
    return base.slice(0, count);
  }

  // Database/Data milestones
  if (combined.includes("database") || combined.includes("data") || combined.includes("schema") || combined.includes("ingestion") || combined.includes("import") || combined.includes("inventory")) {
    const base = [
      `Define data schema + validation for ${title}`,
      `Implement data ingestion/import logic`,
      `Build query/retrieval interfaces`,
      `Data transformation + normalization`,
      `Index optimization + dedup`,
      `Integration tests + data integrity checks`
    ];
    return base.slice(0, count);
  }

  // CAM/CNC/Machining milestones
  if (combined.includes("cam") || combined.includes("cnc") || combined.includes("machining") || combined.includes("toolpath") || combined.includes("cutting") || combined.includes("speed") || combined.includes("feed")) {
    const base = [
      `Define strategy parameters + constraints for ${title}`,
      `Implement core computation engine`,
      `Wire material/tool/machine registry lookups`,
      `Physics validation (Kienzle/Taylor) + safety bounds`,
      `CAM system integration + post-processing`,
      `Shop-floor validation tests (JM Die data)`
    ];
    return base.slice(0, count);
  }

  // EDM milestones
  if (combined.includes("edm") || combined.includes("electrode") || combined.includes("sinker") || combined.includes("wire edm") || combined.includes("spark")) {
    const base = [
      `Define EDM parameters + technology tables for ${title}`,
      `Implement generator/power settings logic`,
      `Wire material pairing + gap calculations`,
      `Surface finish + MRR optimization`,
      `Safety interlocks + burn protection`,
      `Integration tests with JM Die EDM data`
    ];
    return base.slice(0, count);
  }

  // Learning/Knowledge milestones
  if (combined.includes("learn") || combined.includes("knowledge") || combined.includes("extraction") || combined.includes("training") || combined.includes("course")) {
    const base = [
      `Define extraction schema + sources for ${title}`,
      `Implement content parser/extractor`,
      `Build knowledge graph entries + relationships`,
      `Quality scoring + confidence tagging`,
      `Registry integration + search indexing`,
      `Validation tests + coverage metrics`
    ];
    return base.slice(0, count);
  }

  // Integration/Wiring milestones
  if (combined.includes("integration") || combined.includes("wiring") || combined.includes("bridge") || combined.includes("api") || combined.includes("route")) {
    const base = [
      `Define API contract + schema for ${title}`,
      `Implement endpoint handlers`,
      `Wire to backend engines/dispatchers`,
      `Error handling + validation middleware`,
      `Integration tests + contract tests`,
      `Documentation + OpenAPI spec`
    ];
    return base.slice(0, count);
  }

  // Business/Quoting/Cost milestones
  if (combined.includes("quote") || combined.includes("cost") || combined.includes("business") || combined.includes("erp") || combined.includes("invoice") || combined.includes("pricing")) {
    const base = [
      `Define business rules + formulas for ${title}`,
      `Implement calculation engine`,
      `Wire shop rates + material costs`,
      `Override/adjustment handling`,
      `Report generation + export`,
      `Integration tests with JM Die costing data`
    ];
    return base.slice(0, count);
  }

  // Safety milestones
  if (combined.includes("safety") || combined.includes("collision") || combined.includes("guard") || combined.includes("interlock")) {
    const base = [
      `Define safety constraints + limits for ${title}`,
      `Implement safety check engine`,
      `Wire to pipeline gates + hooks`,
      `Failure mode testing + edge cases`,
      `Documentation + operator warnings`,
      `Integration validation with live machine configs`
    ];
    return base.slice(0, count);
  }

  // Registry/Catalog milestones
  if (combined.includes("registry") || combined.includes("catalog") || combined.includes("library")) {
    const base = [
      `Define registry schema + entries for ${title}`,
      `Populate initial data set`,
      `Build search/filter/lookup API`,
      `Validation + dedup + conflict resolution`,
      `Integration with consuming engines`,
      `Coverage metrics + gap report`
    ];
    return base.slice(0, count);
  }

  // Performance/Optimization milestones
  if (combined.includes("performance") || combined.includes("optimization") || combined.includes("benchmark")) {
    const base = [
      `Baseline measurements for ${title}`,
      `Identify bottlenecks + hotspots`,
      `Implement optimizations`,
      `Regression benchmark suite`,
      `Validate improvements under load`,
      `Document results + guard against regression`
    ];
    return base.slice(0, count);
  }

  // Decomposition/Refactor milestones
  if (combined.includes("decompos") || combined.includes("refactor") || combined.includes("split") || combined.includes("migration")) {
    const base = [
      `Analyze current structure for ${title}`,
      `Design target architecture + migration path`,
      `Implement core refactoring`,
      `Update all consumers + references`,
      `Backward-compatibility verification`,
      `Test suite update + regression check`
    ];
    return base.slice(0, count);
  }

  // Default: generic but structured
  const base = [
    `Foundation: schema + interfaces for ${title}`,
    `Core implementation`,
    `Registry/dispatcher wiring`,
    `Test suite + validation`,
    `Integration + edge cases`,
    `Polish + documentation`
  ];
  return base.slice(0, count);
}

// ==========================================
// PHASE 5: Apply units to all milestones
// ==========================================
let globalUnitCounter = 0;

for (const ms of ri.milestones) {
  // Skip if already has units
  if (ms.units && ms.units.length > 0) {
    alreadyHad++;
    continue;
  }

  // Try envelope first (most detailed)
  if (envelopeUnits[ms.id]) {
    ms.units = envelopeUnits[ms.id];
    // Update total_units to match
    ms.total_units = ms.units.length;
    // Mark completed milestone units as complete
    if (ms.status === "complete") {
      ms.units.forEach(u => u.status = "complete");
      ms.completed_units = ms.units.length;
    }
    fromEnvelope++;
    globalUnitCounter += ms.units.length;
    continue;
  }

  // Try roadmap markdown
  if (roadmapUnits[ms.id] && roadmapUnits[ms.id].length > 0) {
    ms.units = roadmapUnits[ms.id];
    ms.total_units = ms.units.length;
    if (ms.status === "complete") {
      ms.units.forEach(u => u.status = "complete");
      ms.completed_units = ms.units.length;
    }
    fromRoadmap++;
    globalUnitCounter += ms.units.length;
    continue;
  }

  // Auto-generate from title + total_units
  if (ms.total_units && ms.total_units > 0) {
    ms.units = generateUnitsFromTitle(ms);
    if (ms.status === "complete") {
      ms.units.forEach(u => u.status = "complete");
      ms.completed_units = ms.units.length;
    }
    autoGen++;
    globalUnitCounter += ms.units.length;
    continue;
  }

  // Last resort: generate 2-4 units based on complexity estimate
  const estimatedUnits = ms.sessions ? Math.max(2, Math.min(6, parseInt(ms.sessions) * 2)) : 3;
  ms.total_units = estimatedUnits;
  ms.units = generateUnitsFromTitle(ms);
  if (ms.status === "complete") {
    ms.units.forEach(u => u.status = "complete");
    ms.completed_units = ms.units.length;
  }
  autoGen++;
  globalUnitCounter += ms.units.length;
}

// ==========================================
// PHASE 6: Deduplicate unit IDs globally
// ==========================================
const usedIds = new Set();
for (const ms of ri.milestones) {
  if (!ms.units) continue;
  for (const u of ms.units) {
    if (usedIds.has(u.id)) {
      // Add milestone suffix to make unique
      u.id = `${u.id}-${ms.id}`;
    }
    usedIds.add(u.id);
  }
}

// ==========================================
// PHASE 7: Update version + write
// ==========================================
ri.version = "10.0.0";
ri.title = ri.title.replace(/v\d+\.\d+\.\d+/, "v10.0.0");
ri.updated_at = new Date().toISOString().split("T")[0];

fs.writeFileSync(RI_PATH, JSON.stringify(ri, null, 2), "utf-8");

console.log("\n=== DECOMPOSITION COMPLETE ===");
console.log(`Already had units: ${alreadyHad}`);
console.log(`From envelope files: ${fromEnvelope}`);
console.log(`From roadmap markdown: ${fromRoadmap}`);
console.log(`Auto-generated: ${autoGen}`);
console.log(`Total units created: ${globalUnitCounter}`);
console.log(`Total milestones: ${ri.milestones.length}`);
console.log(`Written to: ${RI_PATH}`);
