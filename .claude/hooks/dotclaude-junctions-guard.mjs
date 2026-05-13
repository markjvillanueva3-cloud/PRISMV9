#!/usr/bin/env node
// tier: T4
/**
 * dotclaude-junctions-guard.mjs — SessionStart verification for ~/.claude subfolder junctions.
 *
 * Verifies every shareable subfolder in ~/.claude/ is junctioned to H:\.claude\<subfolder>.
 * Blocks the session (exit 1, continueOnError:false) if any drift is detected — matching
 * the enforcement pattern of the AppData junction guard.
 *
 * Read-only. Does NOT auto-repair.
 */

import { appendFileSync, existsSync, lstatSync, mkdirSync, readlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const JUNCTION_DIRS = [
  "commands", "agents", "hooks", "skills", "rules",
  "plans", "plugins", "helpers", "bin",
  // NOTE: "projects" intentionally excluded — contains PC-specific conversation data
];

const DRIFT_LOG = "H:\\PRISM\\mcp-server\\data\\state\\dotclaude-junctions-drift.jsonl";
const REMEDIATION = "Run: node H:\\PRISM\\.claude\\helpers\\dotclaude-junctions-setup.mjs";

const C_ROOT = join(homedir(), ".claude");
const H_ROOT = "H:\\.claude";

function norm(s) {
  return String(s).replace(/^\\\\\?\\/, "").replace(/\/+/g, "\\").replace(/\\+$/, "").toLowerCase();
}

function logDrift(record) {
  try {
    mkdirSync(dirname(DRIFT_LOG), { recursive: true });
    appendFileSync(DRIFT_LOG, JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n");
  } catch { /* non-fatal */ }
}

function checkOne(subdir) {
  const cPath = join(C_ROOT, subdir);
  const hPath = join(H_ROOT, subdir);
  if (!existsSync(cPath)) return { ok: false, subdir, reason: "missing on C:" };
  let st;
  try { st = lstatSync(cPath); }
  catch (e) { return { ok: false, subdir, reason: `lstat failed: ${e.message}` }; }
  if (!st.isSymbolicLink()) return { ok: false, subdir, reason: "real folder (not a junction)" };
  let link;
  try { link = readlinkSync(cPath); }
  catch (e) { return { ok: false, subdir, reason: `readlink failed: ${e.message}` }; }
  if (norm(link) !== norm(hPath)) {
    return { ok: false, subdir, reason: `points to "${link}", expected "${hPath}"` };
  }
  return { ok: true, subdir };
}

function main() {
  const failures = [];
  for (const subdir of JUNCTION_DIRS) {
    const r = checkOne(subdir);
    if (!r.ok) failures.push(r);
  }

  if (failures.length === 0) {
    process.stdout.write(`✓ ~/.claude junctions → H:\\.claude (${JUNCTION_DIRS.length} dirs)\n`);
    return;
  }

  logDrift({ failures });
  process.stderr.write(`\n✗ ~/.claude junctions guard FAILED (${failures.length}/${JUNCTION_DIRS.length} drifted)\n`);
  for (const f of failures) {
    process.stderr.write(`  - ${f.subdir}: ${f.reason}\n`);
  }
  process.stderr.write(`  Remediation: ${REMEDIATION}\n\n`);
  process.exit(1);
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
