#!/usr/bin/env node
/**
 * jm-shop-knowledge-to-vault.mjs -- the JM-documents -> Obsidian-vault bridge.
 *
 * The shop's real document corpus is classified in
 * mcp-server/data/jm-die-database/tables/files.jsonl (each file tagged with
 * customer / machine / kind). That knowledge sat in a DB silo -- it did NOT
 * flow into the Obsidian vault brain that powers master-index recall, the
 * memory-inject hooks, and downstream PRISM features / frontend.
 *
 * This bridge DISTILLS files.jsonl into a vault knowledge note
 * (knowledge/memories/reference/reference_jm_shop_function_profile.md) so the
 * brain LEARNS how the shop functions: machine utilization, work-kind mix,
 * machine x kind cross-tab, and the busiest customers. The note becomes a
 * first-class graph node (generate-memories-atomic) + a memory-inject hit, so
 * any chat / feature / the frontend can recall "how JM Die actually runs."
 *
 * Re-runnable: rerun after the corpus is re-indexed to refresh the profile.
 *   node scripts/jm-shop-knowledge-to-vault.mjs           # write the note
 *   node scripts/jm-shop-knowledge-to-vault.mjs --json     # stats only, no write
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FILES_JSONL = path.join(ROOT, "mcp-server", "data", "jm-die-database", "tables", "files.jsonl");
const OUT_NOTE = path.join(ROOT, "knowledge", "memories", "reference", "reference_jm_shop_function_profile.md");
const OUT_PROFILE = path.join(ROOT, "state", "shared", "jm-shop-profile.json");
// Frontend-served copy (Vite serves public/* at the web root) so the web app can
// fetch('/jm-shop-profile.json') at runtime to order machine workflows by real usage.
const OUT_PROFILE_WEB = path.join(ROOT, "mcp-server", "web", "public", "jm-shop-profile.json");

// Customer-field tokens that are tooling/CAM folders, not real customers (R12:
// the files.jsonl `customer` is folder-derived and noisy; jm-die-profile.ts is
// the canonical 118-customer source).
const CUSTOMER_NOISE = /MCAM|MASTERCAM|hyperCAD|hyperMILL|POSTS AND MACHINES|TRAINING|^JM$|^jm$|USB|BACKUP|TEMP|^NEW |UNTITLED/i;

// The business/order-flow document corpus (sales orders, quotes, prints, packing
// slips) -- the BUSINESS dimension of how the shop functions, complementing
// files.jsonl's MANUFACTURING dimension (machine/kind).
const DOCS_JSONL = path.join(ROOT, "mcp-server", "data", "jm-die-database", "tables", "documents.jsonl");

function tally(map, key) { if (key) map.set(key, (map.get(key) || 0) + 1); }
function topN(map, n) { return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n); }

/**
 * Aggregate documents.jsonl into the business/order-flow dimension. Pure given a
 * path; fail-soft -> {ok:false} if absent (documents are optional; the profile
 * still builds from files.jsonl alone).
 */
function aggregateDocuments(docsPath = DOCS_JSONL) {
  if (!fs.existsSync(docsPath)) return { ok: false, reason: "documents-jsonl-missing" };
  const role = new Map();
  let records = 0, parseErrors = 0, minDate = null, maxDate = null;
  for (const line of fs.readFileSync(docsPath, "utf8").split("\n")) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch { parseErrors++; continue; }
    records++;
    tally(role, o.role);
    const d = o.doc_date || null;
    if (d && /^\d{4}/.test(d)) { if (!minDate || d < minDate) minDate = d; if (!maxDate || d > maxDate) maxDate = d; }
  }
  return { ok: true, records, parseErrors, role: topN(role, 14), dateRange: { min: minDate, max: maxDate } };
}

/** Aggregate files.jsonl into shop-function stats. Pure given a path. */
function aggregate(filesPath = FILES_JSONL) {
  if (!fs.existsSync(filesPath)) return { ok: false, reason: "files-jsonl-missing", path: filesPath };
  const machine = new Map(), kind = new Map(), customer = new Map();
  const machineKind = new Map();    // "machine|kind" -> count
  const customerMachine = new Map(); // "customer|machine" -> count (real customers only)
  let records = 0, parseErrors = 0;
  for (const line of fs.readFileSync(filesPath, "utf8").split("\n")) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch { parseErrors++; continue; }
    records++;
    tally(machine, o.machine);
    tally(kind, o.kind);
    const realCustomer = o.customer && !CUSTOMER_NOISE.test(o.customer) ? o.customer : null;
    if (realCustomer) tally(customer, realCustomer);
    if (o.machine && o.kind) tally(machineKind, `${o.machine}|${o.kind}`);
    if (realCustomer && o.machine) tally(customerMachine, `${realCustomer}|${o.machine}`);
  }
  return {
    ok: true, records, parseErrors,
    machine: topN(machine, 20), kind: topN(kind, 10),
    customer: topN(customer, 15), customerCount: customer.size,
    machineKind: topN(machineKind, 24),
    customerMachine: topN(customerMachine, 30),
  };
}

function pct(n, total) { return total ? ((n / total) * 100).toFixed(1) : "0.0"; }

/** Render the vault knowledge note (pure). */
function renderNote(stats, now, docStats = null) {
  if (!stats.ok) {
    return `---\nname: reference_jm_shop_function_profile\ndescription: JM shop-function profile -- SOURCE MISSING (${stats.reason}). Re-run jm-shop-knowledge-to-vault.mjs after building the JM database.\nmetadata:\n  type: reference\n---\n\nfiles.jsonl not found at ${stats.path}. Build it via the JM ingestion pipeline, then rerun.\n`;
  }
  const t = stats.records;
  const machineLines = stats.machine.map(([m, c]) => `- **${m}** -- ${c.toLocaleString()} files (${pct(c, t)}%)`).join("\n");
  const kindLines = stats.kind.map(([k, c]) => `- **${k}** -- ${c.toLocaleString()} (${pct(c, t)}%)`).join("\n");
  const custLines = stats.customer.map(([k, c]) => `- ${k} -- ${c.toLocaleString()}`).join("\n");
  const xtab = stats.machineKind.map(([mk, c]) => { const [m, k] = mk.split("|"); return `- ${m} x ${k}: ${c.toLocaleString()}`; }).join("\n");
  const cmLines = (stats.customerMachine || []).slice(0, 15).map(([key, c]) => { const [cu, m] = key.split("|"); return `- ${cu} -> ${m}: ${c.toLocaleString()}`; }).join("\n");
  let businessBlock = "";
  if (docStats?.ok) {
    const dt = docStats.records;
    const roleLines = docStats.role.map(([r, c]) => `- **${r}** -- ${c.toLocaleString()} (${pct(c, dt)}%)`).join("\n");
    const dr = docStats.dateRange || {};
    businessBlock = `
## Business / order-flow (how work ENTERS the shop)
${roleLines}

**Read:** ${dt.toLocaleString()} business documents${dr.min ? ` spanning ${dr.min} -> ${dr.max}` : ""}. The
SALES_ORDER + CLOSED_ORDER + QUOTE + PACKING_SLIP volume is the real order pipeline; PRINT docs
are the incoming part geometry. PRISM quoting / scheduling / ERP features should model JM as an
active job-shop with this order cadence.
`;
  }
  return `---
name: reference_jm_shop_function_profile
description: How JM Die actually functions -- machine utilization, work-kind mix, machine x kind cross-tab, busiest customers -- distilled from the ${t.toLocaleString()}-file classified corpus (files.jsonl). Auto-generated bridge; the vault's learned model of the test shop.
metadata:
  type: reference
---

# JM Die -- shop-function profile (learned from the document corpus)

> Auto-distilled by \`scripts/jm-shop-knowledge-to-vault.mjs\` from
> \`mcp-server/data/jm-die-database/tables/files.jsonl\` (${t.toLocaleString()} classified
> files). This is the vault's *learned model of how the shop runs* -- recall it before
> reasoning about JM machines, work mix, or customers. Re-run to refresh.

## Machine utilization (what the shop runs most)
${machineLines}

**Read:** JM is a **lathe-dominant** shop; Okuma and Wire EDM are the next pillars.
PRISM speed/feed, post-processor, and CAM defaults for JM should bias to these.

## Work-kind mix
${kindLines}

**Read:** the corpus is overwhelmingly **G-code programs + CAM projects** -- JM is a
production-programming shop, not a CAD-authoring shop. CAD is the minority.

## Machine x kind (where each kind of work happens)
${xtab}

## Busiest customers (folder-derived, noise-filtered)
${custLines}

> **R12 caveat:** the \`customer\` field is folder-derived and noisy -- ${stats.customerCount.toLocaleString()}
> distinct tokens after filtering tooling/CAM/training folders. The **canonical** customer
> list (118) lives in \`mcp-server/src/data/jm-die-profile.ts\`; treat the above as a
> volume signal, not a clean customer roster.

## Customer x machine (who runs where -- top pairs)
${cmLines}
${businessBlock}
## How PRISM features + the frontend should use this
- **Speed/feed + CAM defaults:** weight toward lathe + Okuma + Wire EDM (the shop's real mix).
- **Frontend/UI:** surface lathe/Okuma/WEDM workflows first; CAD authoring is secondary for JM.
- **Quoting / scheduling:** the work mix (G-code + CAM) reflects a re-run / production shop.

## Provenance
- records parsed: ${t.toLocaleString()} (parse errors: ${stats.parseErrors})
- source: \`mcp-server/data/jm-die-database/tables/files.jsonl\`
- regenerate: \`node scripts/jm-shop-knowledge-to-vault.mjs\`
`;
}

/**
 * Build the machine-readable shop-function signal (the frontend/feature consumer
 * artifact). The web app orders machine workflows by `machines` (descending file
 * volume = how much the shop actually runs each).
 */
function buildShopProfile(stats, now, docStats = null) {
  if (!stats.ok) return { ok: false, reason: stats.reason };
  const t = stats.records;
  const machineKind = {};
  for (const [key, c] of stats.machineKind) { const [m, k] = key.split("|"); (machineKind[m] ||= {})[k] = c; }
  const profile = {
    schemaVersion: "1.1.0",
    generatedAt: now,
    ok: true,
    source: "mcp-server/data/jm-die-database/tables/files.jsonl",
    totalFiles: t,
    machines: stats.machine.map(([id, files]) => ({ id, files, pct: Number(pct(files, t)) })),
    kinds: stats.kind.map(([id, files]) => ({ id, files, pct: Number(pct(files, t)) })),
    machineKind,
    topCustomers: stats.customer.map(([id, files]) => ({ id, files })),
    customerMachine: stats.customerMachine.map(([key, files]) => { const [customer, machine] = key.split("|"); return { customer, machine, files }; }),
    note: "JM shop-function signal. Frontend orders machine workflows by `machines` (descending). R12: `topCustomers` is folder-noisy volume, not the canonical roster (jm-die-profile.ts = 118).",
  };
  // Business/order-flow dimension (optional -- present only if documents.jsonl exists).
  if (docStats?.ok) {
    const dt = docStats.records;
    profile.business = {
      totalDocuments: dt,
      dateRange: docStats.dateRange,
      documentRoles: docStats.role.map(([id, count]) => ({ id, count, pct: Number(pct(count, dt)) })),
      source: "mcp-server/data/jm-die-database/tables/documents.jsonl",
    };
  }
  return profile;
}

/**
 * Is the generated profile stale relative to its sources? True when the profile
 * is absent OR any source (files.jsonl / documents.jsonl) is newer than it. Lets
 * a cheap `--if-stale` cadence skip the full re-aggregation when nothing changed.
 */
function isStale(profilePath = OUT_PROFILE, sources = [FILES_JSONL, DOCS_JSONL]) {
  let profileMtime;
  try { profileMtime = fs.statSync(profilePath).mtimeMs; } catch { return true; } // absent -> stale
  for (const src of sources) {
    try { if (fs.statSync(src).mtimeMs > profileMtime) return true; } catch { /* missing source -> ignore */ }
  }
  return false;
}

export { aggregate, aggregateDocuments, renderNote, buildShopProfile, isStale, CUSTOMER_NOISE };

if (process.argv[1]?.endsWith("jm-shop-knowledge-to-vault.mjs")) {
  if (process.argv.includes("--if-stale") && !isStale()) {
    console.log("[jm-shop-vault] profile is fresh (sources unchanged) -- skipping regen");
    process.exit(0);
  }
  const stats = aggregate();
  if (process.argv.includes("--json")) { console.log(JSON.stringify(stats, null, 2)); process.exit(stats.ok ? 0 : 1); }
  if (!stats.ok) { console.error(`[jm-shop-vault] source missing: ${stats.path}`); process.exit(1); }
  const now = new Date().toISOString();
  const docStats = aggregateDocuments();
  const note = renderNote(stats, now, docStats);
  fs.mkdirSync(path.dirname(OUT_NOTE), { recursive: true });
  fs.writeFileSync(OUT_NOTE, note);
  // The machine-readable shop-function signal the frontend / features consume.
  const profile = buildShopProfile(stats, now, docStats);
  const profileJson = JSON.stringify(profile, null, 2);
  fs.mkdirSync(path.dirname(OUT_PROFILE), { recursive: true });
  fs.writeFileSync(OUT_PROFILE, profileJson);
  console.log(`[jm-shop-vault] wrote ${OUT_NOTE}`);
  console.log(`[jm-shop-vault] wrote ${OUT_PROFILE} (frontend signal)`);
  // Publish to the frontend public dir too (fail-soft: web app may be absent).
  try {
    if (fs.existsSync(path.dirname(path.dirname(OUT_PROFILE_WEB)))) {
      fs.mkdirSync(path.dirname(OUT_PROFILE_WEB), { recursive: true });
      fs.writeFileSync(OUT_PROFILE_WEB, profileJson);
      console.log(`[jm-shop-vault] wrote ${OUT_PROFILE_WEB} (served to web app)`);
    }
  } catch (e) { console.error(`[jm-shop-vault] web publish skipped: ${e.message}`); }
  console.log(`  records: ${stats.records.toLocaleString()} | machines: ${stats.machine.length} | kinds: ${stats.kind.length} | customers(filtered): ${stats.customerCount.toLocaleString()}`);
}
