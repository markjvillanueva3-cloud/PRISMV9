/**
 * cam-upgraded-reference-profile.mjs — extract the PHYSICS-OPTIMAL reference targets from
 * the PRISM_UPGRADED .nc corpus (H:/PRISM/JM DIE/CNC LATHE/<customer>/PRISM_UPGRADED/<machine>/*.nc).
 *
 * Each upgraded file carries structured headers (one block per JM machine variant, LTH-02..07)
 * computed by UltimateSpeedFeedEngine: iso_group, material, RPM (+confidence), feedrate mm/min,
 * depthOfCut mm, effective SFM, rigidity, optimize_for. These are the "what really optimized
 * programs look like" GROUND TRUTH the /goal wants the system to learn from — the optimal side
 * of the observed-vs-optimal comparison (observed comes from cam-corpus-profile.mts).
 *
 * Read-only, pure header parsing (no engine import). Bounded sample for speed.
 *   cd mcp-server && node scripts/cam-upgraded-reference-profile.mjs [customersToScan] [filesPerCustomer]
 */
import * as fs from "fs";
import * as path from "path";

const LATHE_ROOT = "H:/PRISM/JM DIE/CNC LATHE";
const MAX_CUSTOMERS = parseInt(process.argv[2] || "60", 10);
const FILES_PER_CUST = parseInt(process.argv[3] || "2", 10);

const HDR = {
  machineId: /machineId:\s*(LTH-\d+)/,
  machineModel: /machineModel:\s*([^\s)]+)/,
  material: /material:\s*([^\s)]+)/,
  iso: /iso_group:\s*([A-Z])/,
  rpm: /RPM:\s*(\d+)\s+confidence=([\d.]+)/,
  feed: /feedrate:\s*([\d.]+)\s*mm\/min/,
  doc: /depthOfCut:\s*([\d.]+)\s*mm/,
  sfm: /effective SFM:\s*(\d+)/,
  opt: /optimize_for=(\w+)/,
  rigidity: /rigidity=(\w+)/,
  tool: /tool=([^,\s)]+)/,
};

function stats(xs) {
  if (!xs.length) return { n: 0 };
  const s = [...xs].sort((a, b) => a - b);
  return { n: s.length, min: s[0], median: s[Math.floor(s.length / 2)], max: s[s.length - 1] };
}

function parseBlocks(text) {
  // Split on the upgrade-header delimiter; each chunk is one machine variant's physics block.
  const recs = [];
  for (const chunk of text.split(/=== PRISM JM-Die Lathe Upgrade/).slice(1)) {
    const head = chunk.slice(0, 1200); // headers are short; bound the scan
    const g = (re, i = 1) => { const m = head.match(re); return m ? m[i] : null; };
    const rpm = head.match(HDR.rpm);
    const rec = {
      machineId: g(HDR.machineId), machineModel: g(HDR.machineModel),
      material: g(HDR.material), iso: g(HDR.iso),
      rpm: rpm ? +rpm[1] : null, rpm_conf: rpm ? +rpm[2] : null,
      feed_mm_min: g(HDR.feed) ? +g(HDR.feed) : null,
      doc_mm: g(HDR.doc) ? +g(HDR.doc) : null,
      sfm: g(HDR.sfm) ? +g(HDR.sfm) : null,
      optimize_for: g(HDR.opt), rigidity: g(HDR.rigidity), tool: g(HDR.tool),
    };
    if (rec.sfm != null || rec.rpm != null) recs.push(rec);
  }
  return recs;
}

function main() {
  let customers = [];
  try { customers = fs.readdirSync(LATHE_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); }
  catch (e) { console.log(JSON.stringify({ error: `lathe root unreadable: ${e.message}` })); return; }

  const recs = [];
  let filesRead = 0, customersWithUpgrade = 0;
  for (const cust of customers.slice(0, MAX_CUSTOMERS)) {
    const up = path.join(LATHE_ROOT, cust, "PRISM_UPGRADED");
    let machines = [];
    try { machines = fs.readdirSync(up, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); }
    catch { continue; }
    customersWithUpgrade++;
    let taken = 0;
    outer: for (const m of machines) {
      let ncs = [];
      try { ncs = fs.readdirSync(path.join(up, m)).filter((f) => /\.nc$/i.test(f)); } catch { continue; }
      for (const nc of ncs) {
        if (taken >= FILES_PER_CUST) break outer;
        try {
          const t = fs.readFileSync(path.join(up, m, nc), "utf-8");
          recs.push(...parseBlocks(t));
          filesRead++; taken++;
        } catch { /* skip unreadable */ }
      }
    }
  }

  // Aggregate physics-optimal targets by ISO group (+material) and by machine model.
  const byIso = {};
  for (const r of recs) {
    if (!r.iso) continue;
    const k = `${r.iso}/${r.material ?? "?"}`;
    (byIso[k] ??= { sfm: [], rpm: [], feed: [], doc: [] });
    if (r.sfm != null) byIso[k].sfm.push(r.sfm);
    if (r.rpm != null) byIso[k].rpm.push(r.rpm);
    if (r.feed_mm_min != null) byIso[k].feed.push(r.feed_mm_min);
    if (r.doc_mm != null) byIso[k].doc.push(r.doc_mm);
  }
  const isoSummary = {};
  for (const [k, v] of Object.entries(byIso)) {
    isoSummary[k] = { sfm: stats(v.sfm), rpm: stats(v.rpm), feed_mm_min: stats(v.feed), doc_mm: stats(v.doc) };
  }
  const optTally = {}, rigTally = {}, machineTally = {};
  for (const r of recs) {
    if (r.optimize_for) optTally[r.optimize_for] = (optTally[r.optimize_for] ?? 0) + 1;
    if (r.rigidity) rigTally[r.rigidity] = (rigTally[r.rigidity] ?? 0) + 1;
    if (r.machineModel) machineTally[r.machineModel] = (machineTally[r.machineModel] ?? 0) + 1;
  }

  console.log(JSON.stringify({
    corpus: "PRISM_UPGRADED (.nc physics-optimal reference)",
    customersScanned: Math.min(customers.length, MAX_CUSTOMERS),
    customersWithUpgrade, filesRead, physicsBlocks: recs.length,
    optimalByIsoMaterial: isoSummary,   // the physics-optimal targets to match
    optimize_for_tally: optTally,
    rigidity_tally: rigTally,
    machineModels: machineTally,
  }, null, 2));
}

main();
