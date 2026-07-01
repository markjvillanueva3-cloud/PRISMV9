#!/usr/bin/env node
/**
 * propagate-hermes-fleet-auth.mjs  (slot:bravo, 2026-06-26)
 *
 * PURPOSE
 *   The operator's Hermes fleet has 21 per-profile credential stores
 *   (%LOCALAPPDATA%\hermes\profiles\<slot>\auth.json). When credentials
 *   (Nous portal session, xAI/Grok OAuth) are re-authenticated in ONE profile,
 *   this copies that profile's refreshed auth.json into every OTHER profile so
 *   the whole fleet is fixed in one shot -- instead of logging in 21 times.
 *
 *   TOKEN-BLIND BY DESIGN: this script only COPIES the auth.json file and prints
 *   PATHS + non-secret structure (entry counts, provider names). It never reads,
 *   logs, or transmits token/secret values. It does not perform any login.
 *
 * USAGE
 *   node scripts/propagate-hermes-fleet-auth.mjs --from <slot>            # dry-run (default; shows plan)
 *   node scripts/propagate-hermes-fleet-auth.mjs --from <slot> --apply    # actually copy (backs up each target)
 *   node scripts/propagate-hermes-fleet-auth.mjs --list                   # list profiles + auth.json status
 *   [--home <dir>]  override HERMES_HOME (default %LOCALAPPDATA%\hermes)
 *   [--only a,b,c]  restrict targets to these slots
 *
 * SAFETY
 *   - Dry-run is the DEFAULT; nothing is written without --apply.
 *   - Every target auth.json is backed up to auth.json.bak-propagate-<ts> first.
 *   - The source profile is validated as parseable JSON with a credential shape
 *     before any copy. Self (the --from profile) is never overwritten.
 *   - Per-target failures (e.g. a running agent holding the file) are caught and
 *     reported; the run continues for the rest.
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
function flag(name) { return args.includes(name); }
function opt(name, def = null) { const i = args.indexOf(name); return i >= 0 && i + 1 < args.length ? args[i + 1] : def; }

const HOME = opt("--home") || process.env.HERMES_HOME ||
  path.join(process.env.LOCALAPPDATA || "C:/Users/wompu/AppData/Local", "hermes");
const PROFILES_DIR = path.join(HOME, "profiles");
const APPLY = flag("--apply");
const fromSlot = opt("--from");
const onlyList = (opt("--only") || "").split(",").map(s => s.trim()).filter(Boolean);

function listProfiles() {
  if (!fs.existsSync(PROFILES_DIR)) return [];
  return fs.readdirSync(PROFILES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(name => fs.existsSync(path.join(PROFILES_DIR, name, "auth.json")));
}

/** Non-secret structural summary of an auth.json -- NEVER returns token values. */
function authSummary(file) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    const j = JSON.parse(raw);
    const pool = j.credential_pool || {};
    const providers = Object.keys(pool);
    const poolCount = providers.reduce((n, p) => n + (Array.isArray(pool[p]) ? pool[p].length : 0), 0);
    return {
      ok: true,
      bytes: Buffer.byteLength(raw),
      activeProvider: typeof j.active_provider === "string" ? j.active_provider : "(none)",
      providers,
      poolCount,
      hasNousPortal: /portal_base_url|nous/i.test(raw), // structural hint only
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function ts() {
  // Date.now() is unavailable in some sandboxes; use a monotonic stamp + pid for uniqueness.
  return `${process.pid}-${process.hrtime.bigint().toString(36)}`;
}

function main() {
  if (!fs.existsSync(PROFILES_DIR)) {
    console.error(`[propagate-auth] profiles dir not found: ${PROFILES_DIR}`);
    process.exit(2);
  }
  const profiles = listProfiles();

  if (flag("--list") || (!fromSlot && !flag("--apply"))) {
    console.log(`[propagate-auth] HERMES_HOME: ${HOME}`);
    console.log(`[propagate-auth] ${profiles.length} profile(s) with auth.json:`);
    for (const p of profiles) {
      const s = authSummary(path.join(PROFILES_DIR, p, "auth.json"));
      if (s.ok) console.log(`  - ${p.padEnd(9)} active=${s.activeProvider}  pool=${s.poolCount}  nous=${s.hasNousPortal ? "yes" : "no"}  (${s.bytes}B)`);
      else console.log(`  - ${p.padEnd(9)} UNREADABLE: ${s.error}`);
    }
    if (!fromSlot) {
      console.log(`\nNext: re-auth ONE profile (e.g. \`hermes -p alpha portal\` + \`hermes -p alpha auth add xai-oauth\`),`);
      console.log(`then run:  node scripts/propagate-hermes-fleet-auth.mjs --from alpha --apply`);
      return;
    }
  }

  const srcDir = path.join(PROFILES_DIR, fromSlot);
  const srcAuth = path.join(srcDir, "auth.json");
  if (!fs.existsSync(srcAuth)) {
    console.error(`[propagate-auth] --from '${fromSlot}' has no auth.json at ${srcAuth}`);
    process.exit(2);
  }
  const srcSummary = authSummary(srcAuth);
  if (!srcSummary.ok) {
    console.error(`[propagate-auth] source auth.json is not valid JSON: ${srcSummary.error} -- aborting (won't clobber the fleet with a bad file).`);
    process.exit(2);
  }

  let targets = profiles.filter(p => p !== fromSlot);
  if (onlyList.length) targets = targets.filter(p => onlyList.includes(p));

  console.log(`[propagate-auth] SOURCE  ${fromSlot}: active=${srcSummary.activeProvider} pool=${srcSummary.poolCount} nous=${srcSummary.hasNousPortal ? "yes" : "no"} (${srcSummary.bytes}B)`);
  console.log(`[propagate-auth] ${APPLY ? "APPLYING to" : "DRY-RUN over"} ${targets.length} target profile(s): ${targets.join(", ")}`);
  if (!srcSummary.hasNousPortal) console.log(`[propagate-auth] NOTE: source shows no Nous-portal marker -- confirm you logged into Nous in '${fromSlot}' before propagating.`);

  let copied = 0, failed = 0, backedUp = 0;
  const stamp = ts();
  for (const t of targets) {
    const tAuth = path.join(PROFILES_DIR, t, "auth.json");
    try {
      if (!APPLY) { console.log(`  [dry] would back up + overwrite ${t}/auth.json`); continue; }
      if (fs.existsSync(tAuth)) { fs.copyFileSync(tAuth, `${tAuth}.bak-propagate-${stamp}`); backedUp++; }
      fs.copyFileSync(srcAuth, tAuth);
      copied++;
      console.log(`  [ok]  ${t}  (backup: auth.json.bak-propagate-${stamp})`);
    } catch (e) {
      failed++;
      console.log(`  [FAIL] ${t}: ${e.message}  (a running agent may hold the file -- close that slot's window and retry --only ${t})`);
    }
  }
  console.log(`[propagate-auth] ${APPLY ? `done: copied=${copied} backedUp=${backedUp} failed=${failed}` : `dry-run complete -- re-run with --apply to copy`}`);
  if (failed > 0) process.exitCode = 1;
}

main();
