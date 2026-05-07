#!/usr/bin/env node
// Basic structural validation of MILL-MASTER envelope.
import fs from "node:fs";

const env = JSON.parse(fs.readFileSync("H:/prism/mcp-server/data/milestones/MILL-MASTER.json", "utf8"));
const idx = JSON.parse(fs.readFileSync("H:/prism/mcp-server/data/roadmap-index.json", "utf8"));

const errors = [];
const warn = [];

// Envelope required fields
for (const k of ["id", "version", "title", "brief", "created_at", "phases", "total_units", "total_sessions"]) {
  if (env[k] == null) errors.push(`envelope missing ${k}`);
}
if (!/^\d+\.\d+\.\d+$/.test(env.version || "")) errors.push(`envelope.version not semver: ${env.version}`);
if (!Array.isArray(env.phases) || env.phases.length < 1) errors.push("envelope.phases empty");

// Per-phase
let totalUnits = 0;
for (const p of env.phases || []) {
  for (const k of ["id", "title", "description", "sessions", "primary_role", "primary_model", "units", "gate"]) {
    if (p[k] == null) errors.push(`phase ${p.id} missing ${k}`);
  }
  if (!Array.isArray(p.units) || p.units.length < 1) errors.push(`phase ${p.id} has no units`);
  totalUnits += (p.units || []).length;
  // gate checks
  if (p.gate) {
    if (p.gate.omega_floor == null) errors.push(`phase ${p.id} gate missing omega_floor`);
    if (p.gate.safety_floor == null) errors.push(`phase ${p.id} gate missing safety_floor`);
  }
  // Units
  const seen = new Set();
  for (const u of p.units || []) {
    for (const k of ["id", "title", "phase", "sequence", "role", "role_name", "model", "effort"]) {
      if (u[k] == null) errors.push(`unit ${p.id}/${u.id || "<noid>"} missing ${k}`);
    }
    if (typeof u.effort !== "number" || u.effort < 0 || u.effort > 100) errors.push(`unit ${u.id} effort out of range: ${u.effort}`);
    if (!/^R[1-8]$/.test(u.role || "")) errors.push(`unit ${u.id} invalid role ${u.role}`);
    if (seen.has(u.id)) errors.push(`duplicate unit id in phase ${p.id}: ${u.id}`);
    seen.add(u.id);
    if (u.phase !== p.id) errors.push(`unit ${u.id} phase mismatch: ${u.phase} != ${p.id}`);
  }
}

if (totalUnits !== env.total_units) errors.push(`total_units mismatch: claimed ${env.total_units}, actual ${totalUnits}`);

// Index check
const entry = (idx.milestones || []).find((m) => m.id === "MILL-MASTER");
if (!entry) errors.push("MILL-MASTER not in roadmap-index.json");
else {
  if (entry.total_units !== totalUnits) warn.push(`index total_units ${entry.total_units} vs envelope ${totalUnits}`);
  if (entry.envelope_path !== "milestones/MILL-MASTER.json") errors.push(`index envelope_path wrong: ${entry.envelope_path}`);
}

// Supersession check
const SUPERSEDED = ["CAMX-MS6", "CAMX-MS9", "CAMX-V17-P0B", "F360-REV-MS9", "LATHE-PRO-MS6a", "ELEC-PIPE-MS1", "RES-MS19", "RES-MS23"];
for (const id of SUPERSEDED) {
  const m = (idx.milestones || []).find((x) => x.id === id);
  if (!m) warn.push(`supersedes target not found in index: ${id}`);
  else if (m.superseded_by !== "MILL-MASTER") errors.push(`${id} not flagged superseded_by MILL-MASTER`);
}

console.log(`Phases:            ${env.phases.length}`);
console.log(`Total units:       ${totalUnits}`);
console.log(`Sessions estimate: ${env.total_sessions}`);
console.log(`Superseded count:  ${SUPERSEDED.length}`);
console.log(`Errors:            ${errors.length}`);
console.log(`Warnings:          ${warn.length}`);
if (errors.length) {
  console.log("\n✗ ERRORS:");
  for (const e of errors) console.log("  - " + e);
  process.exit(1);
}
if (warn.length) {
  console.log("\n⚠ WARNINGS:");
  for (const w of warn) console.log("  - " + w);
}
console.log("\n✓ MILL-MASTER envelope structurally valid");
