#!/usr/bin/env node
/**
 * tribal-obsidian-mirror.mjs
 *
 * Registers the user's Obsidian vault as a 5th source corpus for the
 * tribal embed index. Walks `*.md` files inside the vault and feeds
 * each one through L1's --add subcommand.
 *
 * Vault discovery (in order):
 *   1. --vault <path> CLI arg (highest priority, explicit)
 *   2. OBSIDIAN_VAULT env var
 *   3. state/shared/system-viz/obsidian-augmentation.json:vaultPath
 *   4. common Windows paths: H:/Obsidian, C:/Users/wompu/Documents/Obsidian Vault
 *   5. skip-with-warning if none found
 *
 * Usage:
 *   node tribal-obsidian-mirror.mjs                # walk + add all
 *   node tribal-obsidian-mirror.mjs --vault X      # explicit path
 *   node tribal-obsidian-mirror.mjs --dry-run      # show what would happen
 *   node tribal-obsidian-mirror.mjs --since 1d     # only files modified in last N days
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PRISM = "H:/prism";
const L1 = `${PRISM}/.claude/scripts/tribal-embed-index.mjs`;
const AUGMENT_JSON = `${PRISM}/state/shared/system-viz/obsidian-augmentation.json`;
const COMMON_PATHS = [
  "H:/Obsidian",
  "C:/Users/wompu/Documents/Obsidian Vault",
  "C:/Users/wompu/Obsidian",
];

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      opts[k] = v;
    }
  }
  return opts;
}

function discoverVault(cliVault) {
  if (cliVault && typeof cliVault === "string") {
    if (fs.existsSync(cliVault)) return { path: cliVault, source: "--vault" };
    return { path: null, source: `--vault ${cliVault} (not found)` };
  }
  if (process.env.OBSIDIAN_VAULT && fs.existsSync(process.env.OBSIDIAN_VAULT)) {
    return { path: process.env.OBSIDIAN_VAULT, source: "OBSIDIAN_VAULT env" };
  }
  if (fs.existsSync(AUGMENT_JSON)) {
    try {
      const j = JSON.parse(fs.readFileSync(AUGMENT_JSON, "utf8"));
      if (j.vaultPath && fs.existsSync(j.vaultPath)) {
        return { path: j.vaultPath, source: "obsidian-augmentation.json" };
      }
    } catch { /* fall through */ }
  }
  for (const p of COMMON_PATHS) {
    if (fs.existsSync(p)) return { path: p, source: `common: ${p}` };
  }
  return { path: null, source: "not found" };
}

function parseSince(spec) {
  if (!spec || spec === true) return null;
  const m = String(spec).match(/^(\d+)\s*([dhm]?)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = (m[2] || "d").toLowerCase();
  const ms = unit === "h" ? n * 3600_000
           : unit === "m" ? n * 60_000
           : n * 86_400_000;
  return Date.now() - ms;
}

function walkMd(root, modifiedAfter) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === ".obsidian" || e.name === ".trash" || e.name.startsWith("node_modules")) continue;
        stack.push(p);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        if (modifiedAfter !== null) {
          try {
            const st = fs.statSync(p);
            if (st.mtimeMs < modifiedAfter) continue;
          } catch { continue; }
        }
        out.push(p);
      }
    }
  }
  return out;
}

const opts = parseArgs();
const { path: vault, source } = discoverVault(opts.vault);

if (!vault) {
  console.error(`[skip] obsidian vault not found (${source})`);
  console.error(`       set OBSIDIAN_VAULT env var or pass --vault <path>`);
  process.exit(0); // soft skip — never fail
}

const since = parseSince(opts.since);
const dryRun = !!opts["dry-run"];

console.log(`OBSIDIAN MIRROR`);
console.log(`Vault:   ${vault}`);
console.log(`Source:  ${source}`);
console.log(`Since:   ${since ? new Date(since).toISOString() : "(all)"}`);
console.log(`Mode:    ${dryRun ? "DRY RUN" : "live"}`);

const files = walkMd(vault, since);
console.log(`Found:   ${files.length} markdown files\n`);

if (dryRun) {
  for (const f of files.slice(0, 20)) console.log(`  ${f}`);
  if (files.length > 20) console.log(`  ... and ${files.length - 20} more`);
  process.exit(0);
}

let added = 0, failed = 0;
for (let i = 0; i < files.length; i++) {
  const f = files[i];
  const r = spawnSync(process.execPath, [L1, "--add", f], {
    encoding: "utf8", timeout: 30_000,
  });
  if (r.status === 0) {
    added++;
    if ((i + 1) % 25 === 0) console.log(`  processed ${i + 1}/${files.length}`);
  } else {
    failed++;
    if (failed <= 3) console.error(`  [fail] ${f}: ${(r.stderr || "").slice(0, 120)}`);
  }
}
console.log(`\nDone. added/updated=${added} failed=${failed}`);
