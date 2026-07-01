#!/usr/bin/env node
// scripts/capture-claude-credentials.mjs — CLI handler for U1 of
// ZEBRA-ACCOUNT-CYCLE-MS0. Snapshots ~/.claude/.credentials.json into
// H:/.claude-accounts/<account-N>/ with a manifest. Reusable until the
// underlying OAuth refresh-token expires.
//
// Usage:
//   node scripts/capture-claude-credentials.mjs <account-N> <label> <rotation-position> [--notes "..."] [--overwrite] [--accounts-root H:/.claude-accounts]
//
// Examples:
//   node scripts/capture-claude-credentials.mjs account-1 home-pro 1
//   node scripts/capture-claude-credentials.mjs account-2 work-secondary 2 --notes "card on file: ending 4242"
//   node scripts/capture-claude-credentials.mjs account-3 spare 3 --overwrite
//
// The slash command `/capture-claude-credentials` wraps this script.

import { captureCredentials, DEFAULT_ACCOUNTS_ROOT, listAccounts, readRotationOrder, writeRotationOrder } from "./lib/claude-account-lib.mjs";

function parseArgs(argv) {
  const out = { positional: [], notes: "", overwrite: false, accountsRoot: DEFAULT_ACCOUNTS_ROOT, listOnly: false, help: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--notes") { out.notes = argv[++i] ?? ""; continue; }
    if (a === "--overwrite") { out.overwrite = true; continue; }
    if (a === "--accounts-root") { out.accountsRoot = argv[++i] ?? out.accountsRoot; continue; }
    if (a === "--list" || a === "-l") { out.listOnly = true; continue; }
    if (a === "--json") { out.json = true; continue; }
    if (a === "--help" || a === "-h") { out.help = true; continue; }
    if (a.startsWith("--")) {
      throw new Error(`unknown flag '${a}'`);
    }
    out.positional.push(a);
  }
  return out;
}

function printHelp() {
  process.stdout.write(`capture-claude-credentials — snapshot ~/.claude/.credentials.json into a per-account vault

USAGE
  node scripts/capture-claude-credentials.mjs <account-N> <label> <rotation-position> [options]
  node scripts/capture-claude-credentials.mjs --list

ARGS
  account-N            Account dir name (1..99) under H:/.claude-accounts/
  label                Operator-readable label, A-Za-z0-9_.- and space, 1-64 chars
  rotation-position    1..99, slot in ROTATION_ORDER.json cycle

OPTIONS
  --notes "..."        Optional operator note (printable ASCII, ≤512 chars)
  --overwrite          Replace an existing snapshot for this account
  --accounts-root P    Override H:/.claude-accounts (test/dev hook)
  --list, -l           List captured accounts and exit
  --json               Emit machine-readable JSON instead of human text
  --help, -h           Show this message

NOTES
  After capture, edit H:/.claude-accounts/ROTATION_ORDER.json (or re-run capture
  with new positions) to set the rotation cycle. Use scripts/switch-claude-account.ps1
  (U2 — pending) to flip the active account; /exit + relaunch Claude Code afterward.
`);
}

function fmtList(accounts) {
  if (accounts.length === 0) return "(no accounts captured yet)";
  const rows = ["pos  name        label                                cred  manifest"];
  for (const a of accounts) {
    const pos = a.manifest?.rotation_position ?? "—";
    const lbl = a.manifest?.label ?? "(no manifest)";
    rows.push(
      `${String(pos).padEnd(3)} ${a.name.padEnd(11)} ${String(lbl).slice(0, 36).padEnd(36)} ${a.hasCredential ? "yes" : "no "}  ${a.hasManifest ? "yes" : "no"}`,
    );
  }
  return rows.join("\n");
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    printHelp();
    process.exit(2);
  }
  if (opts.help) {
    printHelp();
    return;
  }
  if (opts.listOnly) {
    const accounts = listAccounts({ accountsRoot: opts.accountsRoot });
    if (opts.json) {
      process.stdout.write(JSON.stringify({ ok: true, accounts }, null, 2) + "\n");
    } else {
      process.stdout.write(fmtList(accounts) + "\n");
    }
    return;
  }
  if (opts.positional.length !== 3) {
    process.stderr.write(`error: expected 3 positional args (account-N, label, rotation-position); got ${opts.positional.length}\n`);
    printHelp();
    process.exit(2);
  }
  const [accountName, label, rotPosRaw] = opts.positional;
  const rotationPosition = Number(rotPosRaw);
  if (!Number.isInteger(rotationPosition) || rotationPosition < 1 || rotationPosition > 99) {
    process.stderr.write(`error: rotation-position must be an integer 1..99 (got '${rotPosRaw}')\n`);
    process.exit(2);
  }

  let result;
  try {
    result = captureCredentials({
      accountName,
      label,
      rotationPosition,
      accountsRoot: opts.accountsRoot,
      notes: opts.notes,
      overwrite: opts.overwrite,
    });
  } catch (e) {
    if (opts.json) {
      process.stdout.write(JSON.stringify({ ok: false, error: e.message }, null, 2) + "\n");
    } else {
      process.stderr.write(`error: ${e.message}\n`);
    }
    process.exit(1);
  }

  // Best-effort: extend ROTATION_ORDER.json if it exists and doesn't yet
  // contain this account. We do NOT create it from scratch — that's an
  // explicit operator decision (cycle ordering matters).
  let rotationUpdated = false;
  try {
    const order = readRotationOrder({ accountsRoot: opts.accountsRoot });
    if (Array.isArray(order) && !order.includes(accountName)) {
      const updated = [...order, accountName];
      writeRotationOrder(updated, { accountsRoot: opts.accountsRoot });
      rotationUpdated = true;
    }
  } catch (e) {
    if (opts.json) {
      process.stderr.write(`warning: failed to extend ROTATION_ORDER.json: ${e.message}\n`);
    }
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify({ ok: true, result, rotationUpdated }, null, 2) + "\n");
    return;
  }

  process.stdout.write(
    [
      `Captured: ${accountName} → ${result.accountDir}`,
      `  cred snapshot:   ${result.credentialFile}`,
      `  manifest:        ${result.manifestFile}`,
      `  bytes copied:    ${result.bytesCopied}`,
      `  sha256:          ${result.sha256}`,
      `  rotation pos:    ${rotationPosition}`,
      `  label:           ${label}`,
      rotationUpdated ? `  ROTATION_ORDER:  appended ${accountName}` : `  ROTATION_ORDER:  (no existing file or already present)`,
      "",
      "Next: edit ROTATION_ORDER.json if you want a different cycle order,",
      "      then use scripts/switch-claude-account.ps1 to activate (U2 pending).",
    ].join("\n") + "\n",
  );
}

main().catch((e) => {
  process.stderr.write(`fatal: ${e.stack || e.message}\n`);
  process.exit(1);
});
