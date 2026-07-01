#!/usr/bin/env node
// scripts/sync-claude-accounts-to-hermes.mjs
//
// Push captured Claude account credentials (H:/.claude-accounts/account-N, the
// ZULU-ACCOUNT-CYCLE vault) into Hermes credential_pool.anthropic so Hermes rotates
// across all of them, and set active_provider=anthropic. This is the "active on
// Hermes" half of the 6-account goal; it pairs with the existing
// switch-claude-account.mjs (the "switchable in Claude Code CLI" half). Reuses the
// tested claude-account-lib (no duplicate vault logic).
//
// SAFETY: DRY-RUN by default; --apply to write. Backs up Hermes auth.json first.
// Atomic write (temp + rename). Upserts by TOKEN (never duplicates an existing pool
// entry). Skips accounts whose snapshot has no token. Fails loud on a missing auth.json.
//
// Usage:
//   node scripts/sync-claude-accounts-to-hermes.mjs                 # dry-run plan
//   node scripts/sync-claude-accounts-to-hermes.mjs --apply
//   node scripts/sync-claude-accounts-to-hermes.mjs --hermes-auth <p> --accounts-root <p>   # test hooks

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEFAULT_ACCOUNTS_ROOT, listAccounts, credentialSnapshotPath } from "./lib/claude-account-lib.mjs";

export function readJSON(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { throw new Error(`malformed JSON ${p}: ${e.message}`); }
}
function ts() { return new Date().toISOString().replace(/[:.]/g, "-"); }

// Pure planner: given vault accounts + the current hermes auth object, return the upsert plan.
export function planSync(vaultAccounts, hermesAuth) {
  const pool = (hermesAuth && hermesAuth.credential_pool && hermesAuth.credential_pool.anthropic) || [];
  const existingTokens = new Set(pool.map(e => e.access_token).filter(Boolean));
  const add = [];
  const skip = [];
  for (const a of vaultAccounts) {
    if (!a.token) { skip.push({ name: a.name, reason: "no token in snapshot" }); continue; }
    if (existingTokens.has(a.token)) { skip.push({ name: a.name, reason: "already in pool" }); continue; }
    add.push(a);
  }
  return { add, skip, poolSizeBefore: pool.length, poolSizeAfter: pool.length + add.length };
}

// Build a pool entry in the existing Hermes shape (auth_type oauth).
export function buildPoolEntry(a, priority) {
  return {
    id: String(a.name).replace("account-", "cc"),
    label: `cc:${a.label || a.name}`,
    auth_type: "oauth",
    priority,
    source: "sync-claude-accounts-to-hermes",
    access_token: a.token,
    refresh_token: a.refresh || "",
    last_status: "ok",
    last_status_at: null,
    expires_at_ms: a.expiresAt || 0,
    request_count: 0,
  };
}

function loadVaultAccounts(accountsRoot) {
  const out = [];
  for (const a of listAccounts({ accountsRoot })) {
    const cred = readJSON(credentialSnapshotPath(a.name, { accountsRoot }));
    const o = (cred && cred.claudeAiOauth) || {};
    out.push({
      name: a.name,
      label: (a.manifest && a.manifest.label) || a.name,
      token: o.accessToken || "",
      refresh: o.refreshToken || "",
      expiresAt: o.expiresAt || 0,
    });
  }
  return out;
}

function main(argv) {
  const apply = argv.includes("--apply");
  const haIdx = argv.indexOf("--hermes-auth");
  const hermesAuthPath = haIdx >= 0 ? argv[haIdx + 1] : path.join(os.homedir(), "AppData", "Local", "hermes", "auth.json");
  const arIdx = argv.indexOf("--accounts-root");
  const accountsRoot = arIdx >= 0 ? argv[arIdx + 1] : DEFAULT_ACCOUNTS_ROOT;

  const vault = loadVaultAccounts(accountsRoot);
  const auth = readJSON(hermesAuthPath);
  if (!auth) { console.error(`ERROR: no Hermes auth.json at ${hermesAuthPath}`); process.exit(1); }
  const plan = planSync(vault, auth);

  console.log(`vault accounts: ${vault.length} | hermes anthropic pool: ${plan.poolSizeBefore} -> ${plan.poolSizeAfter}`);
  for (const a of plan.add) console.log(`  + ${a.name} (${a.label}) tok ...${a.token.slice(-6)}`);
  for (const s of plan.skip) console.log(`  - ${s.name}: ${s.reason}`);
  console.log(`active_provider: ${auth.active_provider} -> anthropic`);

  if (!apply) { console.log("\nDRY-RUN (default). Re-run with --apply to write."); return; }

  const bdir = path.join(accountsRoot, ".hermes-sync-backups", ts());
  fs.mkdirSync(bdir, { recursive: true });
  fs.copyFileSync(hermesAuthPath, path.join(bdir, "auth.json"));

  auth.credential_pool = auth.credential_pool || {};
  const pool = auth.credential_pool.anthropic = auth.credential_pool.anthropic || [];
  let prio = pool.reduce((m, e) => Math.max(m, (typeof e.priority === "number" ? e.priority : -1)), -1);
  for (const a of plan.add) pool.push(buildPoolEntry(a, ++prio));
  auth.active_provider = "anthropic";

  const tmp = `${hermesAuthPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(auth, null, 2));
  JSON.parse(fs.readFileSync(tmp, "utf8"));
  fs.renameSync(tmp, hermesAuthPath);
  console.log(`\nAPPLIED: +${plan.add.length} into pool (now ${pool.length}); active_provider=anthropic; backup ${bdir}`);
}

const invoked = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("sync-claude-accounts-to-hermes.mjs");
if (invoked) main(process.argv.slice(2));
