#!/usr/bin/env node
// scripts/switch-claude-account.mjs — U2 of ZULU-ACCOUNT-CYCLE-MS0.
//
// Swaps a captured per-account credential into the live
// ~/.claude/.credentials.json so the NEXT Claude Code launch authenticates as
// that account — WITHOUT a fresh OAuth login. The inverse of
// capture-claude-credentials.mjs (U1). Supersedes the planned .ps1 (built in
// .mjs to share the tested claude-account-lib + node:test, R7).
//
// The swap takes effect on the next process launch; a running Claude Code
// cached its credential at startup. The staggered restart is the
// fleet-wake-sequencer's job — this script only swaps the file. The
// account-switch-restart-coordinator (U6) chains swap → staggered restart.
//
// Usage:
//   node scripts/switch-claude-account.mjs --account account-2 --apply
//   node scripts/switch-claude-account.mjs --next --apply        # next in ROTATION_ORDER
//   node scripts/switch-claude-account.mjs --account account-2    # DRY-RUN (default): show the plan
//   node scripts/switch-claude-account.mjs --list
//
// SAFETY: DRY-RUN by default — actuation requires --apply. Backs up the current
// live credential to .credentials.json.pre-swap-<ts> before overwriting
// (reversible). Fails LOUD if the captured credential is missing/empty/corrupt
// (NEVER installs a bad credential — that would brick `claude login`).

import {
  DEFAULT_ACCOUNTS_ROOT,
  activateAccount,
  listAccounts,
  nextAccountInRotation,
  readActiveAccount,
  readRotationOrder,
} from "./lib/claude-account-lib.mjs";

function parseArgs(argv) {
  const out = { account: null, next: false, apply: false, backup: true, by: "manual", trigger: "manual", accountsRoot: DEFAULT_ACCOUNTS_ROOT, listOnly: false, json: false, help: false, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--account") { out.account = argv[++i] ?? null; continue; }
    if (a === "--next") { out.next = true; continue; }
    if (a === "--apply") { out.apply = true; continue; }
    if (a === "--dry-run") { out.apply = false; continue; }
    if (a === "--no-backup") { out.backup = false; continue; }
    if (a === "--by") { out.by = argv[++i] ?? out.by; continue; }
    if (a === "--trigger") { out.trigger = argv[++i] ?? out.trigger; continue; }
    if (a === "--accounts-root") { out.accountsRoot = argv[++i] ?? out.accountsRoot; continue; }
    if (a === "--list" || a === "-l") { out.listOnly = true; continue; }
    if (a === "--json") { out.json = true; continue; }
    if (a === "--help" || a === "-h") { out.help = true; continue; }
    if (a.startsWith("--")) throw new Error(`unknown flag '${a}'`);
    out.positional.push(a);
  }
  // positional account-N (e.g. `switch-claude-account.mjs account-2`)
  if (!out.account && out.positional.length === 1) out.account = out.positional[0];
  return out;
}

function printHelp() {
  process.stdout.write(`switch-claude-account (U2) — swap a captured account credential into the live path

USAGE
  node scripts/switch-claude-account.mjs (--account account-N | --next) [--apply] [options]
  node scripts/switch-claude-account.mjs --list

TARGET
  --account account-N   Swap to this captured account
  --next                Swap to the next account after the ACTIVE one in ROTATION_ORDER.json

OPTIONS
  --apply               Actually perform the swap (DEFAULT is dry-run: plan only)
  --no-backup           Skip backing up the current live credential (NOT recommended)
  --by NAME             Who triggered the swap (audit; default 'manual')
  --trigger STR         Why (e.g. 'five-hour-90pct'; default 'manual')
  --accounts-root P     Override H:/.claude-accounts (test hook)
  --list, -l            List captured accounts + ACTIVE + rotation, then exit
  --json                Machine-readable output
  --help, -h

AFTER A SWAP
  Restart the chats so they pick up the new credential — the
  fleet-wake-sequencer does this in a staggered, token-gated order. The
  account-switch-restart-coordinator (U6) chains swap → staggered restart.
`);
}

function main() {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); }
  catch (e) { process.stderr.write(`error: ${e.message}\n`); printHelp(); process.exit(2); }
  if (opts.help) { printHelp(); return; }

  if (opts.listOnly) {
    const accounts = listAccounts({ accountsRoot: opts.accountsRoot });
    let active = null, order = null;
    try { active = readActiveAccount({ accountsRoot: opts.accountsRoot }); } catch { active = null; }
    try { order = readRotationOrder({ accountsRoot: opts.accountsRoot }); } catch { order = null; }
    if (opts.json) { process.stdout.write(JSON.stringify({ ok: true, active, order, accounts }, null, 2) + "\n"); return; }
    process.stdout.write(`ACTIVE: ${active ?? "(none)"}\nROTATION_ORDER: ${order ? order.join(" -> ") : "(none)"}\n`);
    for (const a of accounts) {
      process.stdout.write(`  ${a.name.padEnd(11)} pos=${a.manifest?.rotation_position ?? "—"} cred=${a.hasCredential ? "yes" : "no"} label=${a.manifest?.label ?? "—"}\n`);
    }
    return;
  }

  // Resolve target: explicit --account, or --next from the rotation cycle.
  let target = opts.account;
  if (opts.next) {
    let order, active = null;
    try { order = readRotationOrder({ accountsRoot: opts.accountsRoot }); }
    catch (e) { process.stderr.write(`error: cannot read ROTATION_ORDER: ${e.message}\n`); process.exit(2); }
    if (!order || order.length === 0) { process.stderr.write(`error: --next requires a non-empty ROTATION_ORDER.json (none found at ${opts.accountsRoot})\n`); process.exit(2); }
    try { active = readActiveAccount({ accountsRoot: opts.accountsRoot }); } catch { active = null; }
    target = nextAccountInRotation(active, order);
  }
  if (!target) { process.stderr.write("error: no target — pass --account account-N or --next\n"); printHelp(); process.exit(2); }

  let result;
  try {
    result = activateAccount({
      accountName: target,
      accountsRoot: opts.accountsRoot,
      by: opts.by,
      trigger: opts.trigger,
      backup: opts.backup,
      dryRun: !opts.apply,
    });
  } catch (e) {
    if (opts.json) process.stdout.write(JSON.stringify({ ok: false, error: e.message }, null, 2) + "\n");
    else process.stderr.write(`error: ${e.message}\n`);
    process.exit(1);
  }

  if (opts.json) { process.stdout.write(JSON.stringify(result, null, 2) + "\n"); return; }
  if (result.noop) { process.stdout.write(`No-op: ${target} is already active and identical (no swap needed).\n`); return; }
  if (result.dryRun) {
    process.stdout.write([
      `DRY-RUN — would swap to ${result.plan.to} (from ${result.plan.from ?? "none"})`,
      `  live path:   ${result.plan.livePath}`,
      `  vault cred:  ${result.plan.vaultCred} (${result.plan.bytes} bytes)`,
      `  backup:      ${result.plan.willBackup ? "yes (pre-swap copy)" : "no"}`,
      ``,
      `Re-run with --apply to perform the swap, then restart the chats (fleet-wake-sequencer).`,
    ].join("\n") + "\n");
    return;
  }
  process.stdout.write([
    `Swapped active account: ${result.from ?? "none"} -> ${result.to}`,
    `  installed to: ${result.livePath} (${result.bytes} bytes)`,
    `  backup:       ${result.backupPath ?? "(none)"}`,
    ``,
    `NEXT: restart the chats so they pick up ${result.to} — staggered + token-gated:`,
    `  node scripts/fleet-wake-sequencer.mjs --apply   (or the coordinator chains this)`,
  ].join("\n") + "\n");
}

main();
