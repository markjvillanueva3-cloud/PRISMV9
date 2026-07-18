#!/usr/bin/env node
/**
 * cad-assembly.mjs -- render / alter an EQUATION-BASED PARAMETRIC ASSEMBLY (slot:delta, U-CAD-ASSEMBLY). The
 * assembly-making arm of the operator's variable-template directive: a shared driving-variable set drives
 * every component's dimensions AND placement through fit + position EQUATIONS. Change one variable and the
 * whole assembly recomputes.
 *
 *   node scripts/cad-assembly.mjs <name> [--set var=val ...] [--spec] [--exec]
 *   node scripts/cad-assembly.mjs --list
 *
 * Assemblies: shaft-bushing-housing, bolt-circle-plate, two-plate-standoff.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { renderAssemblyScript, alterAssembly, assemblySpec, hasAssembly, assemblyNames, ASSEMBLY_TEMPLATES } from "./lib/cad-parametric-assembly.mjs";

function parseArgs(argv) {
  const overrides = {}; const flags = new Set(); const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--set") { const kv = argv[++i] || ""; const eq = kv.indexOf("="); if (eq < 0) throw new Error(`--set expects k=v, got '${kv}'`); overrides[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim(); }
    else if (a.startsWith("--")) flags.add(a.slice(2));
    else positional.push(a);
  }
  return { name: positional[0], overrides, flags };
}

function executeStep(code) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "asmcli-"));
  const py = path.join(dir, "m.py"), st = path.join(dir, "m.step");
  fs.writeFileSync(py, code);
  try {
    execFileSync(process.env.PRISM_PYTHON || "H:/Tools/python/python.exe", [py], { env: { ...process.env, OUTPUT_STEP: st }, timeout: 60000, stdio: "pipe" });
    return { ok: true, bytes: fs.statSync(st).size };
  } catch (e) { return { ok: false, err: String(e?.message ?? e).slice(0, 160) }; }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function main() {
  let parsed;
  try { parsed = parseArgs(process.argv.slice(2)); } catch (e) { console.error(`[cad-assembly] ${e.message}`); process.exit(2); }
  const { name, overrides, flags } = parsed;
  if (flags.has("list") || !name) {
    console.error("parametric assemblies:");
    for (const n of assemblyNames()) console.error(`  ${n.padEnd(24)} ${ASSEMBLY_TEMPLATES[n].desc}`);
    process.exit(name ? 0 : 2);
  }
  if (!hasAssembly(name)) { console.error(`[cad-assembly] unknown assembly '${name}' (see --list)`); process.exit(1); }

  let values;
  try { values = alterAssembly(name, overrides).values; } catch (e) { console.error(`[cad-assembly] ${e.message}`); process.exit(1); }

  if (flags.has("spec")) { process.stdout.write(JSON.stringify(assemblySpec(name, values), null, 2) + "\n"); return; }
  const code = renderAssemblyScript(name, values);
  process.stdout.write(code + "\n");
  if (flags.has("exec")) {
    const r = executeStep(code);
    console.error(r.ok ? `[exec ${name}] assembly STEP ${r.bytes} bytes` : `[exec] FAILED: ${r.err}`);
  }
}

main();
