#!/usr/bin/env node
/**
 * sfc-closed-loop-compare — OSCAR-SFC-9AXIS-MS0 / U-OSC-CLOSED-LOOP
 * =================================================================
 *
 * Drives the WIRED tri-vendor comparator (speed_feed_tri_compare) across a
 * representative matrix of (material x tool x operation) cells, comparing
 * PRISM's physics recommendation against the operator's LIVE vendor data:
 *   - G-Wizard toolcrib.csv   (41,210-row crib in %APPDATA%/GWizard.*)
 *   - HSMAdvisor settings_v2.xml (%APPDATA%/HSMAdvisor)
 *   - the 5 baseline vendor DBs (offline, always available)
 *
 * This is the closed-loop validation the operator asked for: SFC <-> HSMAdvisor
 * <-> G-Wizard. It emits a per-cell delta report + a per-system availability
 * summary so we can SEE where PRISM agrees / diverges from the incumbents on
 * real data — not "looks fine."
 *
 * Run:  npx tsx scripts/sfc-closed-loop-compare.mjs            (live vendor read)
 *       npx tsx scripts/sfc-closed-loop-compare.mjs --no-vendor (PRISM+baseline only)
 *       npx tsx scripts/sfc-closed-loop-compare.mjs --json     (machine output)
 *
 * NOTE: runs the engine SINGLETON directly (same code path the dispatcher
 * action invokes) because the MCP daemon is not required for an offline driver.
 *
 * @milestone OSCAR-SFC-9AXIS-MS0
 * @unit U-OSC-CLOSED-LOOP
 */

import { speedFeedTriComparatorEngine } from "../src/engines/SpeedFeedTriComparatorEngine.js";

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const NO_VENDOR = args.includes("--no-vendor");

/**
 * Representative comparison cells spanning ISO groups + operations. Each is a
 * real shop scenario; tool diameters are common JM-Die sizes. The cells span
 * P (steel), N (aluminum), M (stainless), S (titanium), K (cast iron), H
 * (hardened) so we see PRISM-vs-vendor behavior across the full material map.
 */
const CELLS = [
  { label: "P / 4140 steel / 10mm 4FL carbide / roughing", material: { iso_group: "P", name: "4140 steel", hardness_hb: 200 }, tooling: { tool_diameter_mm: 10, flutes: 4, tool_material: "carbide" }, toolpath: { operation: "milling", cut_type: "roughing" } },
  { label: "N / 6061 alu / 6mm 3FL carbide / finishing", material: { iso_group: "N", name: "6061 aluminum" }, tooling: { tool_diameter_mm: 6, flutes: 3, tool_material: "carbide" }, toolpath: { operation: "milling", cut_type: "finishing" } },
  { label: "M / 304 SS / 8mm 4FL carbide / roughing", material: { iso_group: "M", name: "304 stainless", hardness_hb: 170 }, tooling: { tool_diameter_mm: 8, flutes: 4, tool_material: "carbide" }, toolpath: { operation: "milling", cut_type: "roughing" } },
  { label: "S / Ti-6Al-4V / 12mm 4FL carbide / roughing", material: { iso_group: "S", name: "Ti-6Al-4V", hardness_hrc: 36 }, tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" }, toolpath: { operation: "milling", cut_type: "roughing" } },
  { label: "K / gray iron / 16mm 4FL carbide / roughing", material: { iso_group: "K", name: "gray cast iron", hardness_hb: 200 }, tooling: { tool_diameter_mm: 16, flutes: 4, tool_material: "carbide" }, toolpath: { operation: "milling", cut_type: "roughing" } },
  { label: "H / D2 62HRC / 6mm 4FL carbide / finishing", material: { iso_group: "H", name: "D2 tool steel", hardness_hrc: 62 }, tooling: { tool_diameter_mm: 6, flutes: 4, tool_material: "carbide" }, toolpath: { operation: "milling", cut_type: "finishing" } },
];

function axisOrDash(axes, key) {
  return axes && typeof axes[key] === "number" ? axes[key].toFixed(1) : "—";
}

function run() {
  const rows = [];
  let prismOk = 0;
  let gwizardSeen = 0;
  let hsmSeen = 0;
  let baselineSeen = 0;

  for (const cell of CELLS) {
    const input = {
      material: cell.material,
      tooling: cell.tooling,
      toolpath: cell.toolpath,
      include_baseline: true,
      include_hsmadvisor: !NO_VENDOR,
      include_gwizard: !NO_VENDOR,
    };
    let res;
    try {
      res = speedFeedTriComparatorEngine.run(input);
    } catch (e) {
      rows.push({ cell: cell.label, error: e instanceof Error ? e.message : String(e) });
      continue;
    }
    const byName = Object.fromEntries(res.systems.map((s) => [s.system, s]));
    const prism = byName.prism;
    const baseline = byName.baseline;
    const hsm = byName.hsmadvisor;
    const gw = byName.gwizard;
    if (prism?.available) prismOk++;
    if (baseline?.available) baselineSeen++;
    if (hsm?.available) hsmSeen++;
    if (gw?.available) gwizardSeen++;

    // Honest external-vendor status: HSMAdvisor publishes only its one open
    // <Cut> (folded in but flagged aligned/not-aligned); G-Wizard's crib is
    // per-tool proven sfm (abstains if the matched tool has none). We surface
    // the alignment/abstention so a single unaligned advisory is never read
    // as a true per-material comparison (R12 — fail loud, don't imply).
    const hsmStatus = !hsm?.available
      ? `abstain (${hsm?.unavailable_reason ?? "n/a"})`
      : hsm.aligned
        ? `${axisOrDash(hsm.axes, "vc_mpm")} (tool-aligned)`
        : `${axisOrDash(hsm.axes, "vc_mpm")} (NOT aligned — advisory)`;
    const gwStatus = !gw?.available
      ? `abstain (${gw?.unavailable_reason ?? "n/a"})`
      : axisOrDash(gw.axes, "vc_mpm");

    rows.push({
      cell: cell.label,
      prism_vc: axisOrDash(prism?.axes, "vc_mpm"),
      baseline_vc: axisOrDash(baseline?.axes, "vc_mpm"),
      hsm: hsmStatus,
      gw: gwStatus,
      consensus: res.consensus ? res.consensus.vc_mpm.toFixed(1) : "—",
    });
  }

  const summary = {
    cells: CELLS.length,
    prism_available: prismOk,
    baseline_available: baselineSeen,
    hsmadvisor_available: hsmSeen,
    gwizard_available: gwizardSeen,
    vendor_mode: NO_VENDOR ? "offline (PRISM+baseline only)" : "live (G-Wizard + HSMAdvisor read from %APPDATA%)",
  };

  if (JSON_OUT) {
    console.log(JSON.stringify({ summary, rows }, null, 2));
    return;
  }

  console.log("\nSFC CLOSED-LOOP COMPARISON — PRISM x baseline x HSMAdvisor x G-Wizard");
  console.log("=".repeat(78));
  console.log(`mode: ${summary.vendor_mode}`);
  console.log(
    `availability: prism ${prismOk}/${CELLS.length} · baseline ${baselineSeen}/${CELLS.length} · ` +
      `hsmadvisor ${hsmSeen}/${CELLS.length} · gwizard ${gwizardSeen}/${CELLS.length}`,
  );
  console.log("-".repeat(78));
  console.log("Vc (m/min) per system:");
  for (const r of rows) {
    if (r.error) {
      console.log(`  ✗ ${r.cell}\n      ERROR: ${r.error}`);
      continue;
    }
    console.log(`  ${r.cell}`);
    console.log(`      PRISM ${r.prism_vc}  |  baseline ${r.baseline_vc}  |  consensus(externals) ${r.consensus}`);
    console.log(`      HSMAdvisor: ${r.hsm}`);
    console.log(`      G-Wizard:   ${r.gw}`);
  }
  console.log("=".repeat(78));
  console.log(
    "Reading: PRISM = physics recommendation; baseline = 5-vendor DB median; " +
      "HSMAdvisor/G-Wizard = live operator crib (per-tool proven, no material model — \n" +
      "  so they only weigh in when a crib tool matches the canonical cut). A large \n" +
      "  PRISM-vs-consensus gap on a cell is where calibration would learn.\n",
  );
}

run();
