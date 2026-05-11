#!/usr/bin/env node
/**
 * reparent-viz-categories.mjs — post-merge graph restructure.
 *
 * Runs after merge-augmentations.mjs + repair + dedup. Two restructures:
 *
 * 1) Catalogs by manufacturer. The Phase-3a/3b data atomizers parent every
 *    catalog file node directly under its *category* hub (datacat.tool_catalog,
 *    extract.hypermill, …). This script inserts a *manufacturer* tier:
 *      <category-hub> → <category-hub>.mfr_<mfr> → <file> → <record>
 *    The manufacturer is derived from the file name (sandvik / kennametal /
 *    emuge / guhring / osg / helical / … / hypermill / mastercam / nx / …).
 *    Existing file nodes are re-parented in place; the contains edge is rerouted.
 *
 * 2) JM-Die files by file type, programs sub-split by machine type. Reads
 *    mcp-server/data/jm-die-complete-catalog.json (by_extension + file_list with
 *    per-file {ext, machine_type}) and builds:
 *      jmdie.files                          (L7 hub)
 *        jmdie.files.<ext>                    (L8 — file-type node, fileCount)
 *          jmdie.files.<ext>.<machine_slug>     (L9 — machine-type sub-node, count;
 *                                                only for program extensions)
 *
 * Idempotent: re-derives the same parents / hub set every run. Writes
 * state/shared/system-viz/system-graph.json in place.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const JM_CATALOG = path.join(ROOT, "mcp-server", "data", "jm-die-complete-catalog.json");

const SLUG_NONALNUM = /[^a-z0-9._-]/g;
function slug(s) {
  return String(s).toLowerCase().replace(SLUG_NONALNUM, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

// Manufacturer detection from a data-file basename. Ordered — first hit wins.
// Returns { mfr, label } or null (file stays under its category hub).
const MFR_PATTERNS = [
  [/^sandvik/, "sandvik", "Sandvik Coromant"],
  [/^kennametal/, "kennametal", "Kennametal"],
  [/^emuge/, "emuge", "Emuge-Franken"],
  [/^guhring/, "guhring", "Guhring"],
  [/^osg/, "osg", "OSG"],
  [/^helical/, "helical", "Helical Solutions"],
  [/^indexable/, "indexable", "Indexable (generic)"],
  [/^ingersoll/, "ingersoll", "Ingersoll"],
  [/^sumitomo/, "sumitomo", "Sumitomo"],
  [/^tungaloy/, "tungaloy", "Tungaloy"],
  [/^widia/, "widia", "Widia"],
  [/^seco/, "seco", "Seco Tools"],
  [/^iscar/, "iscar", "Iscar"],
  [/^mitsubishi/, "mitsubishi", "Mitsubishi Materials"],
  [/^ampc/, "ampc", "AMPC"],
  [/^big-?daishowa/, "big_daishowa", "Big Daishowa"],
  [/^haimer/, "haimer", "Haimer"],
  [/^regofix/, "regofix", "Rego-Fix"],
  [/^mastercam/, "mastercam", "Mastercam"],
  [/^hypermill|^hypercad/, "hypermill", "hyperMILL / hyperCAD"],
  [/^nx-?cam|^nx-/, "nx", "Siemens NX"],
  [/^powermill/, "powermill", "PowerMill"],
  [/^solidcam/, "solidcam", "SolidCAM"],
  [/^edgecam/, "edgecam", "Edgecam"],
  [/^worknc/, "worknc", "WorkNC"],
  [/^tebis/, "tebis", "Tebis"],
  [/^cimatron/, "cimatron", "Cimatron"],
  [/^bobcad/, "bobcad", "BobCAD-CAM"],
  [/^camworks/, "camworks", "CAMWorks"],
  [/^surfcam/, "surfcam", "SurfCAM"],
  [/^gibbscam/, "gibbscam", "GibbsCAM"],
  [/^sprutcam/, "sprutcam", "SprutCAM"],
  [/^catia/, "catia", "CATIA"],
  [/^fusion/, "fusion360", "Fusion 360"],
  [/^freecad/, "freecad", "FreeCAD"],
  [/^solidworks/, "solidworks", "SolidWorks"],
  [/^inventor/, "inventor", "Autodesk Inventor"],
  [/^okuma/, "okuma", "Okuma"],
  [/^hurco/, "hurco", "Hurco"],
  [/^fanuc/, "fanuc", "Fanuc"],
  [/^haas/, "haas", "Haas"],
  [/^mazak/, "mazak", "Mazak"],
  [/^siemens/, "siemens", "Siemens"],
  [/^makino/, "makino", "Makino"],
  [/^global-cnc/, "global_cnc", "Global CNC (generic)"],
  [/^manufacturer-|^new-manufacturer-|^multi-manufacturer-/, "multi_vendor", "Multi-vendor"],
];
function mfrOf(basename) {
  const b = basename.toLowerCase();
  for (const [re, mfr, label] of MFR_PATTERNS) if (re.test(b)) return { mfr, label };
  return null;
}

// File extensions that denote CNC programs (get a machine-type sub-split).
const PROGRAM_EXTS = new Set([
  "min", "nc", "eia", "pgm", "ptp", "anc", "cnc", "mpf", "spf", "gcode", "tap",
  "iso", "o", "pim", "ufp", "h", "mpr", "lst", "ncf", "fnc", "cn", "ngc", "txt",
  "prg", "001", "002", "003",
]);

function main() {
  if (!fs.existsSync(GRAPH)) { console.error("graph-missing:", GRAPH); process.exit(2); }
  const G = JSON.parse(fs.readFileSync(GRAPH, "utf8"));
  const byId = new Map();
  for (const n of G.nodes) byId.set(n.id, n);
  G.edges = G.edges || [];
  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
  const edgeIdx = new Map();
  for (const e of G.edges) edgeIdx.set(edgeKey(e), e);
  function ensureNode(n) {
    if (byId.has(n.id)) return byId.get(n.id);
    byId.set(n.id, n); G.nodes.push(n); return n;
  }
  function ensureEdge(from, to, type, intensity) {
    const k = `${from}|${to}|${type}`;
    if (edgeIdx.has(k)) return false;
    const e = { from, to, type, status: "active", intensity };
    edgeIdx.set(k, e); G.edges.push(e); return true;
  }
  function dropEdge(from, to) {
    // remove any edge from→to regardless of type
    for (let i = G.edges.length - 1; i >= 0; i--) {
      const e = G.edges[i];
      if ((e.from || e.source) === from && (e.to || e.target) === to) {
        edgeIdx.delete(edgeKey(e));
        G.edges.splice(i, 1);
      }
    }
  }

  const stats = {
    catalogFilesReparented: 0, manufacturerHubs: 0, manufacturersSkipped: 0,
    jmFileTypeNodes: 0, jmMachineSubNodes: 0, jmTotalFiles: 0,
  };

  // ── 1) Catalogs by manufacturer ──────────────────────────────────────────
  // datacat_file (Phase 3b) and extract_file / boxextract_file (Phase 3a).
  const FILE_SUBGROUPS = new Set(["datacat_file", "extract_file", "boxextract_file"]);
  const mfrHubCreated = new Set();
  for (const n of G.nodes) {
    if (!FILE_SUBGROUPS.has(n.subgroup)) continue;
    if (!n.parent || !byId.has(n.parent)) continue;
    const catHub = byId.get(n.parent);
    // skip if already under a manufacturer hub
    if (catHub.subgroup === "datacat_manufacturer") continue;
    // derive manufacturer from the file basename
    const fileBase = (n.file ? path.basename(n.file).replace(/\.(ts|json)$/i, "") : n.id.split(".").pop()) || "";
    const m = mfrOf(fileBase);
    if (!m) { stats.manufacturersSkipped++; continue; }
    const mfrHubId = `${catHub.id}.mfr_${m.mfr}`;
    if (!mfrHubCreated.has(mfrHubId)) {
      mfrHubCreated.add(mfrHubId);
      const created = !byId.has(mfrHubId);
      ensureNode({
        id: mfrHubId, layer: catHub.layer || "L7",
        subgroup: "datacat_manufacturer",
        parent: catHub.id,
        label: m.label, status: "built",
        color: catHub.color || "#cbd5e1", size: 0.42, tier: 1,
        synthetic: true, manufacturer: m.mfr,
      });
      ensureEdge(catHub.id, mfrHubId, "contains", 0.18);
      if (created) stats.manufacturerHubs++;
    }
    // re-parent the file: drop cat→file edge, add mfr→file
    if (n.parent !== mfrHubId) {
      dropEdge(catHub.id, n.id);
      n.parent = mfrHubId;
      ensureEdge(mfrHubId, n.id, "contains", 0.16);
      stats.catalogFilesReparented++;
    }
  }

  // ── 2) JM-Die files by file type → machine type ─────────────────────────
  if (fs.existsSync(JM_CATALOG)) {
    let jm = null;
    try { jm = JSON.parse(fs.readFileSync(JM_CATALOG, "utf8")); } catch { jm = null; }
    if (jm && (jm.by_extension || jm.file_list)) {
      const hubId = "jmdie.files";
      ensureNode({
        id: hubId, layer: "L7", subgroup: "jmdie_files_hub",
        label: "JM-Die Files", status: "built",
        color: "#f97316", size: 0.6, tier: 1, synthetic: true,
        file: "mcp-server/data/jm-die-complete-catalog.json",
        totalFiles: jm.total_files || (jm.file_list ? jm.file_list.length : 0),
      });
      stats.jmTotalFiles = jm.total_files || (jm.file_list ? jm.file_list.length : 0);

      // ext → count  (and ext → {machine_type → count} for programs)
      const byExt = new Map();           // ext → count
      const extMachine = new Map();      // ext → Map(machineType → count)
      if (jm.by_extension && typeof jm.by_extension === "object") {
        for (const [ext, c] of Object.entries(jm.by_extension)) byExt.set(slug(ext.replace(/^\./, "")) || "noext", c);
      }
      if (Array.isArray(jm.file_list)) {
        for (const f of jm.file_list) {
          const ext = slug(String(f.ext || "").replace(/^\./, "")) || "noext";
          if (!byExt.has(ext)) byExt.set(ext, 0);
          byExt.set(ext, byExt.get(ext)); // keep by_extension count authoritative if present
          if (PROGRAM_EXTS.has(ext)) {
            const mt = slug(f.machine_type || "unknown") || "unknown";
            if (!extMachine.has(ext)) extMachine.set(ext, new Map());
            const mm = extMachine.get(ext);
            mm.set(mt, (mm.get(mt) || 0) + 1);
          }
        }
        // recompute byExt from file_list when by_extension was absent
        if (!jm.by_extension) {
          byExt.clear();
          for (const f of jm.file_list) {
            const ext = slug(String(f.ext || "").replace(/^\./, "")) || "noext";
            byExt.set(ext, (byExt.get(ext) || 0) + 1);
          }
        }
      }
      // emit file-type nodes (top 60 by count) + machine sub-nodes for programs
      const exts = [...byExt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60);
      for (const [ext, count] of exts) {
        const extId = `jmdie.files.${ext}`;
        const isProgram = PROGRAM_EXTS.has(ext);
        ensureNode({
          id: extId, layer: "L8", subgroup: "jmdie_filetype",
          parent: hubId, label: `.${ext}`, status: "built",
          color: isProgram ? "#fb923c" : "#fdba74",
          size: 0.24 + Math.min(0.22, Math.log10(1 + count) * 0.05), tier: 2,
          ext, fileCount: count, isProgram,
        });
        ensureEdge(hubId, extId, "contains", 0.18);
        stats.jmFileTypeNodes++;
        if (isProgram && extMachine.has(ext)) {
          for (const [mt, mc] of [...extMachine.get(ext).entries()].sort((a, b) => b[1] - a[1])) {
            const mtId = `jmdie.files.${ext}.${mt}`;
            ensureNode({
              id: mtId, layer: "L9", subgroup: "jmdie_filetype_machine",
              parent: extId, label: `${mt.replace(/_/g, " ")} (${mc})`, status: "built",
              color: "#fdba74", size: 0.13, tier: 3,
              ext, machineType: mt, fileCount: mc,
            });
            ensureEdge(extId, mtId, "contains", 0.12);
            stats.jmMachineSubNodes++;
          }
        }
      }
    }
  }

  fs.writeFileSync(GRAPH, JSON.stringify(G));
  console.log("reparented viz categories:");
  console.log(`  catalog files re-parented under manufacturer: ${stats.catalogFilesReparented}`);
  console.log(`  manufacturer hubs created:                    ${stats.manufacturerHubs}`);
  console.log(`  catalog files with no manufacturer match:     ${stats.manufacturersSkipped}`);
  console.log(`  JM-Die file-type nodes:                       ${stats.jmFileTypeNodes}`);
  console.log(`  JM-Die machine-type sub-nodes (programs):     ${stats.jmMachineSubNodes}`);
  console.log(`  JM-Die total files indexed:                   ${stats.jmTotalFiles}`);
  console.log(`  graph now: ${G.nodes.length} nodes / ${G.edges.length} edges`);
}

main();
