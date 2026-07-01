#!/usr/bin/env node
// cimco-jm-combo-reconcile.mjs (U-PP-CIMCO-COMBO-WRITE follow-up, slot:echo 2026-06-26)
//
// Reconciles the 15-machine JM fleet (state/shared/cimco/jm-fleet-sim-map.json) against the LIVE
// CIMCO Edit 2026 Setup combo catalogs captured by `PrismCimcoUI.exe --op list-combo`:
//   - state/shared/cimco/cimco2026-machine-combo.json  (cid 14307 "Machine setup:", 86 machines)
//   - state/shared/cimco/cimco2026-control-combo.json   (cid 14639 "Control Type:",  95 controllers)
//
// For each JM machine it answers the three questions a `set-combo` per-machine sim load needs:
//   1. MACHINE: is the sim-map's cimcoMatch.displayName a REAL entry in the machine combo? -> {found,index}
//      (an exact combo index means `--op set-combo --cid 14307 --to "<displayName>"` will load it)
//   2. CONTROL: which Control Type entry fits the JM controller_family + type (mill->Milling / lathe->Turning)?
//      -> {name,index} (so `--op set-combo --cid 14639 --to "<control>"` selects the right NC dialect parser)
//   3. UNITS: cimcoMatch.unit vs JM's INCH convention -> a 25.4x scale-error flag (UNITS-FIRST safety rail).
//
// Emits state/shared/cimco/jm-combo-reconcile.{json,md}. Pure read+match (no CIMCO, no network) -> safe to
// re-run any time the catalogs or sim-map change. The catalogs are re-captured via the two list-combo calls.
//
// Usage: node scripts/cimco-jm-combo-reconcile.mjs [--json]
import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const CIMCO = path.join(ROOT, "state/shared/cimco");
const jsonOnly = process.argv.includes("--json");

function readJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

// list-combo emits {ok,op,cid,count,current,options:[{index,text}]}; fail loud if a catalog is an error envelope.
function loadCatalog(file, cid) {
  const j = readJson(path.join(CIMCO, file));
  if (!j.ok || !Array.isArray(j.options)) {
    throw new Error(`${file}: not a valid list-combo catalog (ok=${j.ok}); re-capture via PrismCimcoUI.exe --op list-combo --cid ${cid}`);
  }
  return j.options; // [{index,text}]
}

// Normalize for matching: lowercase + replace any non-ASCII run (the degree symbol ° reads back from CIMCO's
// MSAA as the mojibake � in the captured catalog -- e.g. "45° AB" in the sim-map vs "45� AB" in the combo)
// with a single space, then collapse whitespace. So a degree-bearing 5-axis machine still resolves honestly.
function norm(s) {
  return (s || "").toLowerCase().replace(/[^\x20-\x7e]+/g, " ").replace(/\s+/g, " ").trim();
}
// Exact (normalized) match first, then a UNIQUE normalized substring -- mirrors the driver's ResolveComboTarget
// (which matches raw text), with the added non-ASCII normalization so the reconcile verdict is honest about a
// machine whose ONLY mismatch is the degree-symbol encoding (flagged separately as needs-index-for-set-combo).
function resolveInCombo(options, name) {
  if (!name) return { found: false, reason: "no name to match" };
  const t = norm(name);
  const asciiClean = norm(name) === name.toLowerCase().replace(/\s+/g, " ").trim(); // true if name had no non-ASCII
  const exact = options.find((o) => norm(o.text) === t);
  if (exact) {
    const rawExact = exact.text.trim().toLowerCase() === name.trim().toLowerCase();
    return { found: true, index: exact.index, text: exact.text, how: rawExact ? "exact" : "exact-normalized", needsIndexForSetCombo: !rawExact };
  }
  const subs = options.filter((o) => norm(o.text).includes(t));
  if (subs.length === 1) return { found: true, index: subs[0].index, text: subs[0].text, how: "unique-substring", needsIndexForSetCombo: !asciiClean };
  if (subs.length === 0) return { found: false, reason: "no combo entry matches" };
  return { found: false, reason: `ambiguous: ${subs.length} entries contain the name`, candidates: subs.map((s) => s.text) };
}

// Map a JM controller_family + machine type to the CIMCO Control Type combo dialect name. CIMCO splits every
// vendor into Milling vs Turning; Haas's modern control is "Haas NGC". We build the expected display string,
// then resolve it against the live control combo (so a vendor CIMCO does not carry just fails closed, not silently).
function expectedControl(family, type) {
  const f = (family || "").toLowerCase();
  const millTurn = type === "lathe" ? "Turning" : "Milling"; // edm handled by caller (not sim-able)
  const VENDOR = {
    haas: "Haas NGC",
    okuma: "Okuma",
    fanuc: "Fanuc",
    mitsubishi: "Mitsubishi",
    siemens: "Siemens",
    mazak: "Mazak",
    heidenhain: "Heidenhain",
    hurco: "Hurco",
    brother: "Brother",
    fagor: "Fagor",
    centroid: "Centroid",
  };
  const vendor = VENDOR[f];
  if (!vendor) return { expect: null, note: `no CIMCO control mapping for family '${family}'` };
  // Hurco/Brother are milling-only in CIMCO; turning falls back generically.
  return { expect: `${vendor} ${millTurn}`, vendor, millTurn };
}

function main() {
  const simMap = readJson(path.join(CIMCO, "jm-fleet-sim-map.json"));
  if (!simMap || !Array.isArray(simMap.machines)) {
    throw new Error("jm-fleet-sim-map.json: missing .machines[] -- regenerate via scripts/cimco-jm-machine-map.mjs");
  }
  const machineCombo = loadCatalog("cimco2026-machine-combo.json", 14307);
  const controlCombo = loadCatalog("cimco2026-control-combo.json", 14639);

  const rows = [];
  for (const m of simMap.machines) {
    const id = m.machine_id;
    const name = m.machine_name;
    const type = m.type; // lathe | mill | edm | ...
    const family = m.controller_family;
    const cm = m.cimcoMatch;

    // EDM has no CIMCO mill/lathe sim machine -> route, do not reconcile a machine combo.
    if (type === "edm" || type === "wedm" || /edm/i.test(type || "")) {
      rows.push({ id, name, type, simMachine: "EDM-routed (no CIMCO mill/lathe sim)", machineFound: null, control: "n/a", controlFound: null, units: "n/a", fidelity: "edm-routed", actionable: false });
      continue;
    }

    const dispName = cm && cm.displayName;
    const mMatch = resolveInCombo(machineCombo, dispName);
    const ec = expectedControl(family, type);
    const cMatch = ec.expect ? resolveInCombo(controlCombo, ec.expect) : { found: false, reason: ec.note };

    // Units: jm-fleet-sim-map carries cm.unit (the .mcfg's unit). JM convention is INCH; a mm .mcfg on an inch
    // program is a 25.4x scale error -> flag it (UNITS-FIRST rail). unitsResolved=true means the map already cleared it.
    const unit = cm && cm.unit;
    const unitsRisk = unit && unit !== "inch" && !(cm && cm.unitsResolved) ? `RISK: .mcfg is ${unit}, JM is INCH (25.4x scale)` : (unit ? `${unit}${cm && cm.unitsResolved ? " (resolved)" : ""}` : "unknown");

    // Fidelity: vendor-exact (score>=0.6) vs generic template (the sim runs but on approximate kinematics).
    const score = cm && cm.score;
    const fidelity = !mMatch.found ? "machine-not-in-combo" : (score >= 0.6 ? "vendor-match" : "generic-template");

    rows.push({
      id, name, type,
      simMachine: dispName || "(none)",
      machineFound: mMatch.found ? mMatch.index : false,
      machineHow: mMatch.found ? mMatch.how : mMatch.reason,
      setComboBy: mMatch.found ? (mMatch.needsIndexForSetCombo ? `index ${mMatch.index} (name has non-ASCII -- use --to ${mMatch.index})` : "name") : "n/a",
      control: ec.expect || "(unmapped)",
      controlFound: cMatch.found ? cMatch.index : false,
      controlText: cMatch.found ? cMatch.text : (cMatch.reason || ec.note),
      units: unitsRisk,
      mcfgScore: score,
      fidelity,
      actionable: mMatch.found && cMatch.found, // set-combo can load BOTH machine + control today
    });
  }

  const simable = rows.filter((r) => r.fidelity !== "edm-routed");
  const summary = {
    total: rows.length,
    edmRouted: rows.filter((r) => r.fidelity === "edm-routed").length,
    machineLoadable: simable.filter((r) => r.machineFound !== false).length,
    controlLoadable: simable.filter((r) => r.controlFound !== false).length,
    fullyActionable: rows.filter((r) => r.actionable).length,
    vendorMatch: rows.filter((r) => r.fidelity === "vendor-match").length,
    genericTemplate: rows.filter((r) => r.fidelity === "generic-template").length,
    unitsRisk: rows.filter((r) => /RISK/.test(r.units)).length,
  };

  const out = {
    schemaVersion: "1.0.0",
    generatedBy: "scripts/cimco-jm-combo-reconcile.mjs",
    sourceMap: "state/shared/cimco/jm-fleet-sim-map.json",
    catalogs: { machine: "cimco2026-machine-combo.json", control: "cimco2026-control-combo.json", machineCount: machineCombo.length, controlCount: controlCombo.length },
    summary,
    rows,
  };
  fs.writeFileSync(path.join(CIMCO, "jm-combo-reconcile.json"), JSON.stringify(out, null, 2));

  // Markdown
  const md = [];
  md.push("# JM fleet <-> CIMCO 2026 combo reconciliation");
  md.push("");
  md.push(`> Generated by \`scripts/cimco-jm-combo-reconcile.mjs\` from \`jm-fleet-sim-map.json\` + the live`);
  md.push(`> \`cimco2026-{machine,control}-combo.json\` catalogs (${machineCombo.length} machines / ${controlCombo.length} controls,`);
  md.push(`> captured via \`PrismCimcoUI.exe --op list-combo\`). Each "machineFound"/"controlFound" index is directly`);
  md.push(`> loadable: \`PrismCimcoUI.exe --op set-combo --name "highlight syntax errors" --cid 14307 --to "<simMachine>" --persist\``);
  md.push(`> (machine) + \`--cid 14639 --to "<control>" --persist\` (controller). Pure read+match; re-run any time.`);
  md.push("");
  md.push(`**Summary:** ${summary.total} JM machines | ${summary.fullyActionable} fully set-combo-loadable today | ${summary.vendorMatch} vendor-exact | ${summary.genericTemplate} generic-template | ${summary.edmRouted} EDM-routed | ${summary.unitsRisk} units-RISK`);
  md.push("");
  md.push("| JM id | machine | type | CIMCO sim machine | mach idx | control | ctrl idx | units | fidelity |");
  md.push("|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) {
    const mi = r.machineFound === false ? "**MISS**" : (r.machineFound == null ? "-" : r.machineFound);
    const ci = r.controlFound === false ? "**MISS**" : (r.controlFound == null ? "-" : r.controlFound);
    md.push(`| ${r.id} | ${r.name} | ${r.type} | ${r.simMachine} | ${mi} | ${r.control} | ${ci} | ${r.units} | ${r.fidelity} |`);
  }
  md.push("");
  md.push("## Notes");
  md.push("- **vendor-match** = the sim-map found a vendor-specific CIMCO machine (score>=0.6); the over-travel/collision verdict is trustworthy.");
  md.push("- **generic-template** = a generic Cimco kinematic template (score<0.6); the sim RUNS but on approximate envelope -- author an exact vendor .mcfg from PRISM's machine model for full fidelity.");
  md.push("- **units RISK** = the .mcfg is metric while JM's convention is INCH; resolve before trusting any travel-limit verdict (25.4x scale-error guard, UNITS-FIRST rail).");
  md.push("- **EDM-routed** = wire/sinker EDM has no CIMCO mill/lathe sim machine; verified by the post-proof static arm + EDM-specific tooling instead.");
  fs.writeFileSync(path.join(CIMCO, "jm-combo-reconcile.md"), md.join("\n"));

  if (jsonOnly) { console.log(JSON.stringify(out, null, 2)); return; }
  console.log(`JM combo reconcile: ${summary.total} machines | ${summary.fullyActionable} fully set-combo-loadable | ${summary.vendorMatch} vendor-exact | ${summary.genericTemplate} generic | ${summary.edmRouted} EDM | ${summary.unitsRisk} units-RISK`);
  console.log(`written: ${path.join(CIMCO, "jm-combo-reconcile.json")} + .md`);
}

// Export the pure matchers for unit tests; run main() only as a CLI (not on import). Guard the empty
// argv[1] case explicitly: a bare `node -e`/dynamic import leaves argv[1] undefined, and endsWith("")
// is always true -- without this guard main() would run (and write its artifacts) on import.
export { norm, resolveInCombo, expectedControl };
const invokedPath = process.argv[1] ? process.argv[1].replace(/\\/g, "/") : "";
if (invokedPath && import.meta.url.endsWith(invokedPath)) {
  main();
}
