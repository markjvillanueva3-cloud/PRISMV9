/**
 * audit-jm-cam-libraries.mjs
 * [JM-FUSION-TOOLS]/U-CAM-AUDIT (slot:romeo, operator-directed continuous gap-find loop, 2026-06-18).
 *
 * The DURABLE MECHANISM behind the operator's spec task #5: "autonomously in continuous loops to
 * fill gaps, find errors, fix conflicts" across the Fusion / Mastercam / hyperMILL JM tool libraries.
 * Re-runnable; deterministic; reads ONLY the real generated artifacts (R12 -- no fabrication).
 *
 * WHAT IT CHECKS (per CAM library it discovers under state/shared/jm-fusion-tools/**):
 *   D1 FIELD COMPLETENESS   -- every tool has the collision/holder geometry fields filled
 *                              (diameter, flute_length, OAL, shank, flutes, holder{gauge,body,projection}).
 *   D2 UNIT SANITY          -- geometry inside plausible mfg ranges; OAL>flute; flags the 25.4x scale
 *                              anomaly class (a metric value mis-emitted into an inch field or vice versa).
 *   D3 PHYSICAL PLAUSIBILITY -- cutting_data within safe bounds; the 1xD-LOC axial ceiling (ap<=2.6xD for
 *                              milling -- snap hazard above 3xD); radial WOC ae<=diameter; NaN/Infinity.
 *   D4 ISO/MATERIAL COVERAGE -- each tool covers the expected ISO groups (P,M,K,N,S,H).
 *   D5 CROSS-CAM CONSISTENCY -- the SAME tool's geometry agrees between the mcam JSON and the
 *                              independently-generated Fusion CSV (different generators => real divergence
 *                              surfaces here, e.g. a holder/length mismatch between two fold scripts).
 *   D6 CONFLICTS/DUPLICATES  -- duplicate tool_number within a file; duplicate part_number (info).
 *
 * SCOPE HONESTY (R12): the .hmt.sql is generated from the SAME PRISMTool list as its sibling .mcam-tools
 * in one exporter run, and its Tools-table dbl_param column semantics are TYPE-DEPENDENT (doc vs code
 * diverge per HyperMillToolExportEngine.ts:25-32). So hmt gets a STRUCTURAL check only (insert counts /
 * non-empty / count-parity vs the mcam), NOT a fragile dbl_param geometry re-parse. Deep geometry audit
 * runs on the unambiguous mm-native mcam JSON + the 173-col Fusion CSV.
 *
 * Bounds below are AUDIT SANITY GATES (geometric/range), NOT physics constants -- no Kienzle/Taylor/
 * material values are inlined; cutting-data plausibility is range-checked, not recomputed.
 *
 * Run: node mcp-server/scripts/audit-jm-cam-libraries.mjs [--json] [--root <dir>]
 * Out: state/shared/jm-fusion-tools/CAM-AUDIT-FINDINGS.{json,md}
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, realpathSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

// Run-as-main guard: importing this module (e.g. from the invariant test) must NOT trigger
// file discovery / report writes -- only a direct `node audit-jm-cam-libraries.mjs` invocation does.
const isMain = (() => {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();

const ROOT_DEFAULT = "H:/prism/state/shared/jm-fusion-tools";
const rootArg = process.argv.indexOf("--root");
const ROOT = rootArg >= 0 ? process.argv[rootArg + 1] : ROOT_DEFAULT;
const JSON_ONLY = process.argv.includes("--json");

// ---- AUDIT SANITY BOUNDS (geometric/range gates, mm; NOT physics constants) ----
export const B = {
  DIA: [0.1, 100],          // 0.004in .. ~4in cutting diameter
  OAL: [3, 600],            // overall length
  FLUTE: [0.1, 450],        // length of cut
  SHANK: [0.1, 80],
  SHANK_GROSS: 100,         // shank > 100mm (>~4in) = a gross 25.4x scale error (P0), not a mild out-of-range (P2)
  GAUGE: [1, 1200],         // tool-assembly gauge (holder + protrusion)
  BODY: [1, 300],           // holder body diameter
  VC: [3, 2500],            // surface speed m/min
  FZ: [0.0002, 3],          // feed per tooth mm
  RPM: [1, 250000],
  FEED: [0.05, 200000],     // mm/min
  AXIAL_MAX_X: 2.6,         // ap <= 2.6 x D (covers trochoidal 2.5 baseline); >3xD = P0 snap hazard
  AXIAL_P0_X: 3.0,
  AE_MAX_RATIO: 1.02,       // radial WOC <= diameter (+2% rounding); >1.05 = P0
  AE_P0_RATIO: 1.05,
};
export const ISO_EXPECTED = ["P", "M", "K", "N", "S", "H"];
const MILLING_TYPES = new Set(["endmill", "ballmill", "bullmill", "radiusmill", "chamfer", "facemill", "slotmill"]);

const findings = [];
let stats = { files: 0, toolsAudited: 0, mcamFiles: 0, hmtFiles: 0, fusionCsvFiles: 0 };

function add(sev, file, dim, toolRef, message, extra) {
  findings.push({ severity: sev, file: basename(file), dim, toolRef: toolRef ?? null, message, ...(extra || {}) });
}
const finite = (n) => typeof n === "number" && Number.isFinite(n);
const num = (v) => { const n = typeof v === "number" ? v : parseFloat(v); return Number.isFinite(n) ? n : NaN; };
const outOf = (n, [lo, hi]) => !finite(n) || n < lo || n > hi;

// ---------- CSV (Fusion 173-col, quote-aware) ----------
function parseLine(l) {
  const o = []; let c = "", q = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (ch === '"') { if (q && l[i + 1] === '"') { c += '"'; i++; } else q = !q; }
    else if (ch === "," && !q) { o.push(c); c = ""; }
    else c += ch;
  }
  o.push(c);
  return o;
}
function loadFusionCsv(file) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/).filter((x) => x.length);
  if (lines.length < 2) return null;
  const H = parseLine(lines[0]);
  const colIdx = (needle) => H.findIndex((h) => h.toLowerCase().includes(needle.toLowerCase()));
  const C = {
    desc: colIdx("Description ("), dia: colIdx("Diameter (tool_diameter)"),
    flute: colIdx("Flute Length"), oal: colIdx("Overall Length (tool_overallLength"),
    nFlutes: colIdx("Number of Flutes"), unit: colIdx("Unit ("), gauge: colIdx("Tool Assembly Gauge Length"),
  };
  const rows = lines.slice(1).map(parseLine).filter((r) => r.length >= H.length - 2);
  return { H, C, rows };
}

// ---------- pure per-tool audit core (TESTABLE -- no file I/O, no globals) ----------
// Audits an array of mcam-shape tools; returns { findings, byPart }. The file-based wrapper
// (auditMcam) just reads the JSON then delegates here, so the invariant test exercises the
// exact same logic the CLI runs (R9 -- the test fails when a real check regresses).
export function auditToolList(tools, fileLabel) {
  const out = [];
  const file = fileLabel; // alias so the loop's add(sev, file, dim, ...) calls read naturally
  const add = (sev, _file, dim, toolRef, message, extra) => out.push({ severity: sev, file: fileLabel, dim, toolRef: toolRef ?? null, message, ...(extra || {}) });
  const seenNum = new Map(), seenPart = new Map(), byPart = new Map();
  for (const t of tools) {
    const ref = t.part_number || t.id || String(t.tool_number);
    byPart.set(String(t.part_number || t.id).trim(), t);

    // D6 duplicates
    if (t.tool_number != null) {
      if (seenNum.has(t.tool_number)) add("P1", file, "D6-dup", ref, `duplicate tool_number ${t.tool_number} (also #${seenNum.get(t.tool_number)})`);
      else seenNum.set(t.tool_number, ref);
    }
    const pk = String(t.part_number || "").trim();
    if (pk) { if (seenPart.has(pk)) add("info", file, "D6-dup", ref, `duplicate part_number "${pk}"`); else seenPart.set(pk, ref); }

    // D1 completeness + D2 unit sanity
    const dia = num(t.diameter_mm), fl = num(t.flute_length_mm), oal = num(t.overall_length_mm), sh = num(t.shank_diameter_mm), nf = num(t.flutes);
    // Lathe/turning/grooving/boring tools have NO milling "flute length" -- a missing flute on them is
    // correct, not a defect. Skip the flute-required checks for those types (false-positive removal).
    const noFlute = /boring|turning|groov|parting/.test(String(t.type || "").toLowerCase());
    if (!finite(dia) || dia <= 0) add("P0", file, "D1-complete", ref, `diameter_mm missing/<=0 (${t.diameter_mm})`);
    else if (outOf(dia, B.DIA)) add("P0", file, "D2-unit", ref, `diameter_mm ${dia} outside [${B.DIA}] -- possible 25.4x scale error`, { value: dia });
    if (noFlute) {
      if (finite(fl) && fl > 0 && outOf(fl, B.FLUTE)) add("P2", file, "D2-unit", ref, `non-flute (${t.type}) tool carries flute_length ${fl} out of range`);
    } else if (!finite(fl) || fl <= 0) add("P1", file, "D1-complete", ref, `flute_length_mm missing/<=0 (${t.flute_length_mm})`);
    else if (outOf(fl, B.FLUTE)) add("P1", file, "D2-unit", ref, `flute_length_mm ${fl} outside [${B.FLUTE}]`);
    if (!finite(oal) || oal <= 0) add("P1", file, "D1-complete", ref, `overall_length_mm missing/<=0 (${t.overall_length_mm})`);
    else if (outOf(oal, B.OAL)) add("P1", file, "D2-unit", ref, `overall_length_mm ${oal} outside [${B.OAL}]`);
    if (!noFlute && finite(oal) && finite(fl) && oal > 0 && fl > 0 && oal < fl) add("P0", file, "D2-unit", ref, `OAL ${oal} < flute_length ${fl} (impossible geometry)`);
    if (!finite(sh) || sh <= 0) add("P2", file, "D1-complete", ref, `shank_diameter_mm missing/<=0 (${t.shank_diameter_mm})`);
    else if (sh > B.SHANK_GROSS) add("P0", file, "D2-unit", ref, `shank_diameter_mm ${sh} > ${B.SHANK_GROSS}mm -- gross 25.4x scale error (CAM will reject)`, { value: sh });
    else if (outOf(sh, B.SHANK)) add("P2", file, "D2-unit", ref, `shank_diameter_mm ${sh} outside [${B.SHANK}]`);
    if (!finite(nf) || nf < 1) add("P2", file, "D1-complete", ref, `flutes missing/<1 (${t.flutes})`);

    // D1 holder (collision geometry)
    const h = t.holder;
    if (!h || typeof h !== "object") add("P1", file, "D1-holder", ref, "holder object missing (collision geometry incomplete)");
    else {
      const g = num(h.gauge_length_mm), bd = num(h.body_diameter_mm), pj = num(h.projection_mm);
      if (!finite(g) || g <= 0) add("P1", file, "D1-holder", ref, `holder.gauge_length_mm missing/<=0 (${h.gauge_length_mm})`);
      else if (outOf(g, B.GAUGE)) add("P2", file, "D2-unit", ref, `holder.gauge_length_mm ${g} outside [${B.GAUGE}]`);
      if (!finite(bd) || bd <= 0) add("P2", file, "D1-holder", ref, `holder.body_diameter_mm missing/<=0 (${h.body_diameter_mm})`);
      else if (outOf(bd, B.BODY)) add("P2", file, "D2-unit", ref, `holder.body_diameter_mm ${bd} outside [${B.BODY}]`);
      if (!finite(pj) || pj < 0) add("P2", file, "D1-holder", ref, `holder.projection_mm missing/<0 (${h.projection_mm})`);
    }

    // D3 cutting-data plausibility + D4 ISO coverage
    const cd = Array.isArray(t.cutting_data) ? t.cutting_data : [];
    if (!cd.length) add("P1", file, "D4-iso", ref, "no cutting_data (0 ISO groups)");
    const groups = new Set();
    const isMill = MILLING_TYPES.has(String(t.type || "").toLowerCase());
    for (const c of cd) {
      const g = String(c.iso_group || "").toUpperCase();
      if (g) groups.add(g);
      const vc = num(c.vc_mpm), fz = num(c.fz_mm), ap = num(c.ap_mm), ae = num(c.ae_mm), rpm = num(c.rpm), feed = num(c.feed_mmpm);
      for (const [k, v] of [["vc_mpm", c.vc_mpm], ["fz_mm", c.fz_mm], ["ap_mm", c.ap_mm], ["ae_mm", c.ae_mm], ["rpm", c.rpm], ["feed_mmpm", c.feed_mmpm]]) {
        const n = num(v);
        if (v != null && !finite(n)) add("P0", file, "D3-cut", ref, `${g}:${k} non-finite (${v})`);
      }
      if (finite(vc) && outOf(vc, B.VC)) add("P1", file, "D3-cut", ref, `${g}: vc_mpm ${vc} outside [${B.VC}]`);
      if (finite(fz) && outOf(fz, B.FZ)) add("P1", file, "D3-cut", ref, `${g}: fz_mm ${fz} outside [${B.FZ}]`);
      if (finite(rpm) && outOf(rpm, B.RPM)) add("P1", file, "D3-cut", ref, `${g}: rpm ${rpm} outside [${B.RPM}]`);
      if (finite(feed) && outOf(feed, B.FEED)) add("P1", file, "D3-cut", ref, `${g}: feed_mmpm ${feed} outside [${B.FEED}]`);
      if (isMill && finite(ap) && finite(dia) && dia > 0) {
        if (ap > B.AXIAL_P0_X * dia) add("P0", file, "D3-axial", ref, `${g}: ap_mm ${ap} > ${B.AXIAL_P0_X}xD (${(ap / dia).toFixed(1)}xD) -- SNAP HAZARD`, { apX: +(ap / dia).toFixed(2) });
        else if (ap > B.AXIAL_MAX_X * dia) add("P1", file, "D3-axial", ref, `${g}: ap_mm ${ap} > ${B.AXIAL_MAX_X}xD (${(ap / dia).toFixed(1)}xD)`, { apX: +(ap / dia).toFixed(2) });
      }
      if (isMill && finite(ae) && finite(dia) && dia > 0) {
        if (ae > B.AE_P0_RATIO * dia) add("P0", file, "D3-radial", ref, `${g}: ae_mm ${ae} > diameter ${dia} (${(ae / dia).toFixed(2)}xD) -- WOC exceeds tool`, { aeX: +(ae / dia).toFixed(2) });
        else if (ae > B.AE_MAX_RATIO * dia) add("P2", file, "D3-radial", ref, `${g}: ae_mm ${ae} slightly > diameter ${dia}`);
      }
    }
    const missing = ISO_EXPECTED.filter((g) => !groups.has(g));
    if (cd.length && missing.length) add(missing.length >= 4 ? "P1" : "P2", file, "D4-iso", ref, `ISO coverage ${groups.size}/${ISO_EXPECTED.length} -- missing ${missing.join(",")}`);
  }

  // D7 LIBRARY-LEVEL UNIFORMITY (lost-catalog-data signal; ONE finding per library, never per-tool,
  // so it never spams). All tools sharing a single coating="uncoated" or one helix angle usually means
  // per-tool catalog attributes were not imported (affects speed/feed + tool selection). Verified-real
  // gap class (gap-hunt 2026-06-18). NOTE: holder.projection_mm < flute_length is deliberately NOT
  // flagged -- projection = max(OAL - gaugeLen, 10) models a SHORT/conservative stickout, which errs
  // toward CATCHING collisions (the safe direction); flagging it would falsely alarm ~81% of tools.
  if (tools.length > 50) {
    const coatings = new Set(tools.map((t) => String(t.coating || "").toLowerCase()).filter(Boolean));
    if (coatings.size === 1 && coatings.has("uncoated")) add("P2", file, "D7-uniformity", null, `ALL ${tools.length} tools coating="uncoated" -- likely lost catalog coating data (coated tools allow 30-80% higher vc)`);
    const helix = new Set(tools.map((t) => t.helix_angle_deg).filter((v) => v != null));
    if (helix.size === 1) add("P2", file, "D7-uniformity", null, `ALL ${tools.length} tools share helix_angle_deg=${[...helix][0]} -- likely a default, not per-tool catalog data`);
  }
  return { findings: out, byPart };
}

// ---------- mcam-tools (JSON, mm) file wrapper -- reads + delegates to the pure core ----------
function auditMcam(file) {
  stats.mcamFiles++;
  let d;
  try { d = JSON.parse(readFileSync(file, "utf8")); }
  catch (e) { add("P0", file, "parse", null, `mcam JSON parse failed: ${e.message}`); return null; }
  const tools = Array.isArray(d) ? d : d.tools || [];
  if (!tools.length) { add("P1", file, "structure", null, "0 tools in mcam library"); return { tools: [], byPart: new Map() }; }
  stats.toolsAudited += tools.length;
  const { findings: list, byPart } = auditToolList(tools, basename(file));
  for (const f of list) findings.push(f);
  return { tools, byPart };
}

// ---------- hmt structural check ----------
function auditHmt(file, expectTools) {
  stats.hmtFiles++;
  const sql = readFileSync(file, "utf8");
  // INSERT counts: tolerate the SQLite seed form `INSERT OR IGNORE INTO <table>` (GeometryClasses /
  // CuttingMaterials seed rows) -- a plain `INSERT INTO` regex misses it + falsely reports "0
  // GeometryClasses". A multi-row VALUES seed counts as one INSERT statement.
  const count = (re) => (sql.match(re) || []).length;
  const tools = count(/INSERT(?:\s+OR\s+IGNORE)?\s+INTO\s+Tools\b/g);
  const nc = count(/INSERT(?:\s+OR\s+IGNORE)?\s+INTO\s+NCTools\b/g);
  const geom = count(/INSERT(?:\s+OR\s+IGNORE)?\s+INTO\s+GeometryClasses\b/g);
  const mats = count(/INSERT(?:\s+OR\s+IGNORE)?\s+INTO\s+Materials\b/g);
  if (tools === 0) add("P0", file, "hmt-struct", null, "0 Tools inserts");
  if (geom === 0) add("P1", file, "hmt-struct", null, "0 GeometryClasses inserts");
  if (mats === 0) add("P1", file, "hmt-struct", null, "0 Materials inserts");
  if (nc !== tools) add("P1", file, "hmt-struct", null, `NCTools (${nc}) != Tools (${tools}) -- preset row mismatch`);
  if (expectTools != null && tools !== expectTools) add("P1", file, "hmt-struct", null, `Tools count ${tools} != sibling mcam count ${expectTools}`);
  return { tools, nc, geom, mats };
}

// ---------- D5 cross-CAM: mcam JSON vs Fusion CSV ----------
function crossCheck(file, mcam, csv) {
  if (!mcam || !csv || !mcam.byPart.size) return;
  let matched = 0, mismatched = 0;
  const TOL = 0.05; // mm (Fusion CSV is 4-dp inch -> mm round-trip ~0.0025mm; 0.05 is generous)
  for (const r of csv.rows) {
    const desc = (r[csv.C.desc] || "");
    // Fusion desc embeds the designation/part number; match by leading token against mcam part numbers.
    const key = desc.split("(")[0].trim();
    let t = mcam.byPart.get(key);
    if (!t) { for (const [pk, tt] of mcam.byPart) { if (pk && desc.includes(pk)) { t = tt; break; } } }
    if (!t) continue;
    matched++;
    const unit = (r[csv.C.unit] || "").toLowerCase();
    const toMm = unit.includes("inch") ? 25.4 : 1;
    const cDia = num(r[csv.C.dia]) * toMm, cFl = num(r[csv.C.flute]) * toMm, cOal = num(r[csv.C.oal]) * toMm;
    const cmp = (a, b, label) => {
      if (finite(a) && finite(b) && Math.abs(a - b) > Math.max(TOL, b * 0.02)) {
        mismatched++;
        add("P1", file, "D5-xcam", t.part_number || t.id, `${label} mismatch: Fusion ${a.toFixed(3)}mm vs mcam ${b.toFixed(3)}mm`);
      }
    };
    cmp(cDia, num(t.diameter_mm), "diameter");
    cmp(cFl, num(t.flute_length_mm), "flute_length");
    cmp(cOal, num(t.overall_length_mm), "OAL");
  }
  add("info", file, "D5-xcam", null, `cross-CAM matched ${matched} tools vs Fusion CSV, ${mismatched} geometry mismatch(es)`);
}

// ---------- discover + run ----------
function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
function main() {
const allFiles = existsSync(ROOT) ? walk(ROOT) : [];
const mcamFiles = allFiles.filter((f) => f.endsWith(".mcam-tools"));
const hmtFiles = allFiles.filter((f) => f.endsWith(".hmt.sql") || f.endsWith(".hmt"));
const fusionCsvs = allFiles.filter((f) => f.endsWith(".csv") && (f.includes("fusion") || f.includes("allconditions") || f.includes("ALL-families") || f.includes("FUSION")));
stats.fusionCsvFiles = fusionCsvs.length;
stats.files = mcamFiles.length + hmtFiles.length + fusionCsvs.length;

const mcamByDir = new Map();
for (const f of mcamFiles) { const m = auditMcam(f); mcamByDir.set(f, m); }
for (const f of hmtFiles) {
  const slash = Math.max(f.lastIndexOf("/"), f.lastIndexOf("\\"));
  const dir = f.slice(0, slash);
  const sib = [...mcamByDir.entries()].find(([mf]) => mf.startsWith(dir));
  auditHmt(f, sib ? sib[1]?.tools?.length ?? null : null);
}
// D5: pair each mcam with a fusion csv in the same dir (best-effort)
for (const [mf, m] of mcamByDir) {
  if (!m) continue;
  const dir = mf.slice(0, Math.max(mf.lastIndexOf("/"), mf.lastIndexOf("\\")));
  const csvFile = fusionCsvs.find((c) => c.startsWith(dir));
  if (csvFile) { const csv = loadFusionCsv(csvFile); if (csv) crossCheck(csvFile, m, csv); }
}

// ---------- report ----------
const order = { P0: 0, P1: 1, P2: 2, info: 3 };
findings.sort((a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file));
const counts = findings.reduce((o, f) => ((o[f.severity] = (o[f.severity] || 0) + 1), o), {});
const byDim = findings.reduce((o, f) => ((o[f.dim] = (o[f.dim] || 0) + 1), o), {});

const result = { generatedAt: null, root: ROOT, stats, counts, byDim, findings };
const OUT = join(ROOT, "CAM-AUDIT-FINDINGS.json");
writeFileSync(OUT, JSON.stringify(result, null, 2));

if (!JSON_ONLY) {
  const top = findings.filter((f) => f.severity === "P0" || f.severity === "P1").slice(0, 60);
  const md = [
    `# JM CAM Library Audit -- gap/error/conflict findings`,
    ``,
    `Root: \`${ROOT}\``,
    `Files: ${stats.mcamFiles} mcam - ${stats.hmtFiles} hmt - ${stats.fusionCsvFiles} fusion-csv - ${stats.toolsAudited} tools audited`,
    ``,
    `**Severity:** P0=${counts.P0 || 0} - P1=${counts.P1 || 0} - P2=${counts.P2 || 0} - info=${counts.info || 0}`,
    `**By dimension:** ${Object.entries(byDim).map(([k, v]) => `${k}=${v}`).join(" - ")}`,
    ``,
    `## Top P0/P1 findings (first 60)`,
    ``,
    ...(top.length ? top.map((f) => `- **${f.severity}** [${f.dim}] \`${f.file}\`${f.toolRef ? ` (${f.toolRef})` : ""}: ${f.message}`) : ["_None._"]),
  ].join("\n");
  writeFileSync(join(ROOT, "CAM-AUDIT-FINDINGS.md"), md);
  console.log(md);
  console.log(`\nFull findings: ${OUT}`);
}
}
if (isMain) main();
