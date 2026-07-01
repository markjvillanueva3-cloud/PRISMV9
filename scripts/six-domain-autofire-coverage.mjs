#!/usr/bin/env node
// scripts/six-domain-autofire-coverage.mjs
//
// R15 VALIDATE leg for the SIX-DOMAIN auto-firing knowledge layer.
//
// The goal's "we don't need the data just sitting there -- it has to be usable
// when needed and logically pulled automatically" is delivered by six
// `scripts/lib/<d>-approach-knowledge.mjs` libs, each consumed by a per-domain
// UserPromptSubmit hook aggregated in `.claude/hooks/bundles/ups-domain-bundle.mjs`.
// This validator PROVES that layer works -- it is the cross-domain VALIDATE-on-
// live-data-with-numbers step that the per-domain commits never did as a unit.
//
// For each of the 6 goal domains (cad/cam/lathe/mill/post/wedm) it reports:
//   - operations taxonomy size
//   - verified gate count (confidence === "verified") vs total gates
//   - unverified-gap count = the specialist VERIFY BACKLOG (null = lib does not
//     track gaps as a first-class export -- reported honestly, never as 0)
//   - live-fire proof: fireForApproach({operations: all}) yields >=1 op + >=1 gate
//   - bundle-wired: the firing hook is registered in ups-domain-bundle
//
// READ-ONLY. Writes ONLY a staging report (never the live tribal index, never a
// domain lib). Importable: buildCoverage()/renderReport() are pure-ish (DI'd I/O).
//
// Run:   node scripts/six-domain-autofire-coverage.mjs [--json] [--out <path>]
// Test:  node scripts/six-domain-autofire-coverage.test.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

// domain -> { approach-knowledge lib, specialist slot, firing hook filename }.
// hook filenames verified against ups-domain-bundle.mjs (2026-06-30).
export const DOMAINS = Object.freeze([
  { key: "mill",  slot: "foxtrot", lib: "scripts/lib/mill-approach-knowledge.mjs",  hook: "foxtrot-mill-awareness-inject.mjs" },
  { key: "post",  slot: "echo",    lib: "scripts/lib/post-approach-knowledge.mjs",  hook: "echo-post-domain-inject.mjs" },
  { key: "cad",   slot: "delta",   lib: "scripts/lib/cad-approach-knowledge.mjs",   hook: "delta-cad-awareness-inject.mjs" },
  { key: "cam",   slot: "kilo",    lib: "scripts/lib/cam-approach-knowledge.mjs",   hook: "kilo-cam-context-inject.mjs" },
  { key: "wedm",  slot: "mike",    lib: "scripts/lib/wedm-approach-knowledge.mjs",  hook: "mike-wedm-context-inject.mjs" },
  { key: "lathe", slot: "whiskey", lib: "scripts/lib/lathe-approach-knowledge.mjs", hook: "whiskey-lathe-context-inject.mjs" },
]);

export const BUNDLE = ".claude/hooks/bundles/ups-domain-bundle.mjs";

const isObj = (x) => x && typeof x === "object";

// Build the per-domain coverage rows + a fleet rollup. I/O is dependency-injected
// so the test drives it without spawning. Fail-soft per domain: a broken lib
// yields ok:false with the error, never aborts the sweep.
export async function buildCoverage({ importImpl, readImpl } = {}) {
  const doImport = importImpl || ((p) => import(pathToFileURL(resolve(REPO, p)).href));
  const doRead =
    readImpl ||
    ((p) => {
      try {
        return readFileSync(resolve(REPO, p), "utf8");
      } catch {
        return "";
      }
    });

  const bundleText = doRead(BUNDLE);
  const rows = [];

  for (const d of DOMAINS) {
    const row = { key: d.key, slot: d.slot, hook: d.hook };
    try {
      const mod = await doImport(d.lib);

      const opsKey = Object.keys(mod).find((k) => /_OPERATIONS$/.test(k));
      const operations = Array.isArray(mod[opsKey]) ? mod[opsKey] : [];

      const internals = isObj(mod._internals) ? mod._internals : {};
      // verified-gate registry naming is NOT uniform across the 6 libs: most use
      // `GATES`, the lathe lib uses `GOTCHAS`. Bind either (NEVER mis-bind the
      // op-keyed TOOLING_REQUIREMENTS / OP_PATTERNS tables). Same "score the signal
      // wherever it appears" lesson as the enrichment-digest scoring fix.
      const REGISTRY_KEYS = ["GATES", "GOTCHAS"];
      const gatesObj = REGISTRY_KEYS.map((k) => internals[k]).find(isObj) || {};
      const gateVals = Object.values(gatesObj);
      const gatesTotal = gateVals.length;
      const gatesVerified = gateVals.filter((g) => isObj(g) && g.confidence === "verified").length;

      // unverified-gap export is first-class only on cam + wedm; for the others
      // report null (NOT 0) so "no backlog tracked" is never read as "no backlog".
      const gapsKey = Object.keys(mod).find((k) => /_UNVERIFIED_GAPS$/.test(k));
      const gapArr = gapsKey && Array.isArray(mod[gapsKey]) ? mod[gapsKey] : null;
      const unverifiedGaps = gapsKey ? (gapArr ? gapArr.length : 0) : null;
      // the ACTUAL gap items = the specialist verify worklist (real cited strings),
      // not just a count. null = lib exposes no first-class UNVERIFIED_GAPS export.
      const gapItems = gapArr ? gapArr.map((g) => String(g)) : null;

      let fired = { operations: [] };
      if (typeof mod.fireForApproach === "function") {
        try {
          fired = mod.fireForApproach({ operations }) || { operations: [] };
        } catch (e) {
          row.fireError = String((e && e.message) || e);
        }
      } else {
        row.fireError = "no fireForApproach export";
      }
      const firedOps = Array.isArray(fired.operations) ? fired.operations : [];
      // count knowledge across ALL array-valued fields on a fired op
      // (gates / gotchas / okumaDialect / landmines) -- field names vary by lib,
      // but every knowledge list is an array and `tooling` is an object (not counted).
      const firedGates = firedOps.reduce(
        (n, o) => n + (isObj(o) ? Object.values(o).filter(Array.isArray).reduce((a, arr) => a + arr.length, 0) : 0),
        0
      );
      const fires = firedOps.length > 0 && firedGates > 0;

      const bundleWired = !!bundleText && bundleText.includes(d.hook);

      Object.assign(row, {
        ok: true,
        operations: operations.length,
        gatesTotal,
        gatesVerified,
        unverifiedGaps,
        gapItems,
        firedOps: firedOps.length,
        firedGates,
        fires,
        bundleWired,
      });
    } catch (e) {
      Object.assign(row, { ok: false, error: String((e && e.message) || e), fires: false, bundleWired: false });
    }
    rows.push(row);
  }

  const num = (v) => (typeof v === "number" ? v : 0);
  const rollup = {
    domains: rows.length,
    allFire: rows.length > 0 && rows.every((r) => r.fires),
    allWired: rows.length > 0 && rows.every((r) => r.bundleWired),
    gatesTotalAll: rows.reduce((n, r) => n + num(r.gatesTotal), 0),
    gatesVerifiedTotal: rows.reduce((n, r) => n + num(r.gatesVerified), 0),
    verifyBacklog: rows.reduce((n, r) => n + (typeof r.unverifiedGaps === "number" ? r.unverifiedGaps : 0), 0),
    gapsUntracked: rows.filter((r) => r.unverifiedGaps === null && r.ok).map((r) => r.key),
  };

  return { rows, rollup };
}

const yn = (b) => (b ? "yes" : "NO");

export function renderReport(cov, stamp = "") {
  const c = cov || {};
  const rows = Array.isArray(c.rows) ? c.rows : [];
  const r = c.rollup || {};
  const out = [];
  out.push("# SIX-DOMAIN auto-firing coverage -- live VALIDATE");
  out.push("");
  if (stamp) out.push(`> generated ${stamp}`);
  out.push("> Proves the per-domain approach-knowledge auto-firing layer (the \"pull automatically\"");
  out.push("> mechanism) fires for every goal domain. Read-only audit. Source of truth:");
  out.push("> scripts/lib/<d>-approach-knowledge.mjs + .claude/hooks/bundles/ups-domain-bundle.mjs.");
  out.push("");
  out.push("| domain | slot | ops | gates (verified/total) | verify-backlog | fires | bundle-wired |");
  out.push("|--------|------|-----|------------------------|----------------|-------|--------------|");
  for (const row of rows) {
    if (!row.ok) {
      out.push(`| ${row.key} | ${row.slot} | -- | ERROR: ${row.error || "?"} | -- | NO | ${yn(row.bundleWired)} |`);
      continue;
    }
    const backlog = row.unverifiedGaps === null ? "(not tracked)" : String(row.unverifiedGaps);
    const fireCell = row.fires ? `yes (${row.firedGates}g/${row.firedOps}op)` : `NO${row.fireError ? " " + row.fireError : ""}`;
    out.push(
      `| ${row.key} | ${row.slot} | ${row.operations} | ${row.gatesVerified}/${row.gatesTotal} | ${backlog} | ${fireCell} | ${yn(row.bundleWired)} |`
    );
  }
  out.push("");
  out.push("## Rollup");
  out.push(`- domains audited: **${r.domains}**`);
  out.push(`- all six fire live: **${yn(r.allFire)}**`);
  out.push(`- all six bundle-wired: **${yn(r.allWired)}**`);
  out.push(`- verified gates fleet-wide: **${r.gatesVerifiedTotal}/${r.gatesTotalAll}**`);
  out.push(`- specialist verify-backlog (tracked unverified gaps): **${r.verifyBacklog}**`);
  if (Array.isArray(r.gapsUntracked) && r.gapsUntracked.length) {
    out.push(`- gap-tracking NOT first-class on: **${r.gapsUntracked.join(", ")}** (apply cam/wedm UNVERIFIED_GAPS export pattern to close)`);
  }
  out.push("");

  // Verify-backlog WORKLIST: the actual cited gap items an owner confirms vs the source
  // before that knowledge can drive an auto-fired gate. Turns "backlog: N" into a checklist.
  const withItems = rows.filter((x) => Array.isArray(x.gapItems) && x.gapItems.length);
  if (withItems.length) {
    out.push("## Verify-backlog worklist (owner confirms each vs the cited source before it can drive a gate)");
    for (const x of withItems) {
      out.push(`### ${x.key} (${x.slot}) -- ${x.gapItems.length} unverified gap(s)`);
      for (const g of x.gapItems) out.push(`- [ ] ${g}`);
      out.push("");
    }
  }
  if (Array.isArray(r.gapsUntracked) && r.gapsUntracked.length) {
    out.push("## Untracked-gap domains");
    out.push(`No first-class UNVERIFIED_GAPS export on: **${r.gapsUntracked.join(", ")}**. Each domain's`);
    out.push("specialist (foxtrot/echo/delta/whiskey) should add one -- clone the cam/wedm pattern,");
    out.push("sourcing real items from the domain enrichment note (e.g. mill -> reference_mill_vault_enrichment_2026_06_29,");
    out.push("\"5 V / 10 U per the rollup\"). zulu ROUTES the worklist; the specialist CURATES the verified/unverified split.");
    out.push("");
  }
  return out.join("\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const outIdx = argv.indexOf("--out");
  const outPath = outIdx >= 0 ? argv[outIdx + 1] : "state/shared/staging/six-domain-autofire-coverage.md";

  const cov = await buildCoverage();
  let stamp = "";
  try {
    stamp = new Date().toISOString();
  } catch {
    stamp = "";
  }

  if (asJson) {
    process.stdout.write(JSON.stringify({ ...cov, generatedAt: stamp }, null, 2) + "\n");
    return;
  }

  const md = renderReport(cov, stamp);
  process.stdout.write(md + "\n");
  try {
    writeFileSync(resolve(REPO, outPath), md, "utf8");
    process.stdout.write(`\n[wrote] ${outPath}\n`);
  } catch (e) {
    process.stdout.write(`\n[warn] could not write ${outPath}: ${String((e && e.message) || e)}\n`);
  }

  // non-zero exit if the auto-firing guarantee is broken -- this is the gate value.
  if (!cov.rollup.allFire || !cov.rollup.allWired) process.exitCode = 1;
}

const invokedDirectly = (() => {
  try {
    return resolve(process.argv[1] || "") === resolve(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main().catch((e) => {
    process.stderr.write(String((e && e.stack) || e) + "\n");
    process.exitCode = 1;
  });
}
