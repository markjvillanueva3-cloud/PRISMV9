// scripts/lib/claude-account-lib.mjs
//
// Pure helpers for ZULU-ACCOUNT-CYCLE-MS0 — manage H:/.claude-accounts/
// (per-account credential snapshots + manifests, sibling tree to
// .claude-profiles/). Consumed by U1 (capture handler), U2 (.ps1 swap),
// U3 (slash command), U5 (95% watchdog), U6 (zulu coordinator).
//
// Pure-core / injected-readers: every IO arg is explicit so callers and
// tests share the same code path without process.cwd() shenanigans.

import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

export const SCHEMA = "claude-account-v1";
export const SCHEMA_VERSION = "1.0.0";
export const ACCOUNT_NAME_RE = /^account-([1-9][0-9]?)$/;
export const ACCOUNT_LABEL_RE = /^[A-Za-z0-9_.\- ]{1,64}$/;
export const DEFAULT_ACCOUNTS_ROOT = "H:/.claude-accounts";

// Notes are sanitized to printable ASCII + space — blocks ANSI escapes,
// control chars, and NUL bytes that would inject through PowerShell
// Write-Host (R12 fail-loud / P0-2 from 2026-05-23 scrutiny).
const NOTES_MAX_LEN = 512;
const NOTES_ALLOWED_RE = /^[\x20-\x7e]*$/; // printable ASCII (incl. space)

function sanitizeNotes(notes) {
  const s = notes == null ? "" : String(notes);
  if (s.length > NOTES_MAX_LEN) {
    throw new Error(`notes too long (${s.length} > ${NOTES_MAX_LEN})`);
  }
  if (!NOTES_ALLOWED_RE.test(s)) {
    throw new Error("notes must be printable ASCII (no control chars, no ANSI escapes)");
  }
  return s;
}

function uniqTmp(base) {
  return `${base}.tmp-${process.pid}-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

export function resolveLiveCredentialPath({ home = homedir() } = {}) {
  return join(home, ".claude", ".credentials.json");
}

export function accountDir(accountName, { accountsRoot = DEFAULT_ACCOUNTS_ROOT } = {}) {
  if (!ACCOUNT_NAME_RE.test(accountName)) {
    throw new Error(`invalid account name '${accountName}' (must match ${ACCOUNT_NAME_RE})`);
  }
  return join(accountsRoot, accountName);
}

export function manifestPath(accountName, opts = {}) {
  return join(accountDir(accountName, opts), "manifest.json");
}

export function credentialSnapshotPath(accountName, opts = {}) {
  return join(accountDir(accountName, opts), ".credentials.json");
}

export function buildManifest({
  name,
  label,
  rotationPosition,
  liveCredentialPath,
  accountsRoot = DEFAULT_ACCOUNTS_ROOT,
  capturedAt = new Date().toISOString(),
  notes = "",
}) {
  if (!ACCOUNT_NAME_RE.test(name)) {
    throw new Error(`invalid account name '${name}'`);
  }
  if (!ACCOUNT_LABEL_RE.test(label)) {
    throw new Error(`invalid label '${label}' (allowed: A-Za-z0-9_.- and space, 1-64 chars)`);
  }
  const pos = Number(rotationPosition);
  if (!Number.isInteger(pos) || pos < 1 || pos > 99) {
    throw new Error(`invalid rotation_position '${rotationPosition}' (must be integer 1..99)`);
  }
  if (!liveCredentialPath || typeof liveCredentialPath !== "string") {
    throw new Error("liveCredentialPath required");
  }
  return {
    $schema: SCHEMA,
    schemaVersion: SCHEMA_VERSION,
    name,
    label,
    credential_file: join(accountsRoot, name, ".credentials.json").replace(/\\/g, "/"),
    // captured_from_live_path is a SNAPSHOT-TIME record (whose homedir we
    // captured from). NOT authoritative — the swap script (U2) must resolve
    // the live path at runtime via resolveLiveCredentialPath(). Renamed from
    // `live_credential_path` per 2026-05-23 P1-4 scrutiny finding.
    captured_from_live_path: liveCredentialPath.replace(/\\/g, "/"),
    settings_env_delta: "settings-env.json",
    rotation_position: pos,
    captured_at: capturedAt,
    last_used_at: null,
    last_5h_window_start_at: null,
    notes: sanitizeNotes(notes),
  };
}

export function readManifest(accountName, opts = {}) {
  const p = manifestPath(accountName, opts);
  if (!existsSync(p)) return null;
  let raw;
  try {
    raw = readFileSync(p, "utf8");
  } catch (e) {
    throw new Error(`failed to read ${p}: ${e.message}`);
  }
  let j;
  try {
    j = JSON.parse(raw);
  } catch (e) {
    throw new Error(`malformed manifest ${p}: ${e.message}`);
  }
  if (j && j.$schema !== SCHEMA) {
    throw new Error(`manifest ${p} has unexpected $schema='${j.$schema}' (want '${SCHEMA}')`);
  }
  return j;
}

export function writeManifest(accountName, manifest, opts = {}) {
  const dir = accountDir(accountName, opts);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const target = manifestPath(accountName, opts);
  const tmp = uniqTmp(target);
  const body = JSON.stringify(manifest, null, 2) + "\n";
  writeFileSync(tmp, body, "utf8");
  try {
    renameSync(tmp, target);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* orphan cleanup best-effort */ }
    throw e;
  }
  return target;
}

// captureCredentials never touches `live_credential_path` (the source path).
// It only writes into H:/.claude-accounts/<name>/. The swap script (U2) is
// the only thing allowed to overwrite the live path.
export function captureCredentials({
  accountName,
  label,
  rotationPosition,
  accountsRoot = DEFAULT_ACCOUNTS_ROOT,
  home = homedir(),
  source = undefined,
  overwrite = false,
  notes = "",
  now = () => new Date(),
}) {
  const srcPath = source || resolveLiveCredentialPath({ home });
  if (!existsSync(srcPath)) {
    throw new Error(`source credential file not found: ${srcPath} (login to Claude Code first)`);
  }
  const srcStat = statSync(srcPath);
  if (!srcStat.isFile()) {
    throw new Error(`source credential path is not a regular file: ${srcPath}`);
  }
  if (srcStat.size === 0) {
    throw new Error(`source credential file is empty: ${srcPath}`);
  }
  // Read as Buffer (not utf8 string) to keep the OAuth bundle off the V8
  // string-intern heap. Body goes straight from disk → buffer → atomic
  // write. Single short-lived utf8 view is only used for JSON.parse.
  const srcBuf = readFileSync(srcPath);
  try {
    JSON.parse(srcBuf.toString("utf8"));
  } catch (e) {
    throw new Error(`source credential file is not valid JSON: ${srcPath} — ${e.message}`);
  }
  const srcSha = createHash("sha256").update(srcBuf).digest("hex");

  const dir = accountDir(accountName, { accountsRoot });
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const destCred = credentialSnapshotPath(accountName, { accountsRoot });
  if (existsSync(destCred) && !overwrite) {
    throw new Error(`account '${accountName}' already has a captured credential (pass overwrite:true to replace)`);
  }
  const credTmp = uniqTmp(destCred);
  writeFileSync(credTmp, srcBuf);
  try {
    renameSync(credTmp, destCred);
  } catch (e) {
    try { unlinkSync(credTmp); } catch { /* orphan cleanup best-effort */ }
    throw e;
  }
  // Best-effort POSIX-mode hardening. On Windows this maps to a partial ACL
  // tightening (Node uses SetFileAttributes under the hood); operator must
  // ALSO run `icacls H:\.claude-accounts /inheritance:r /grant:r
  // "%USERNAME%:(OI)(CI)F"` once per machine for full coverage.
  try { chmodSync(destCred, 0o600); } catch { /* non-fatal on platforms without chmod */ }

  const manifest = buildManifest({
    name: accountName,
    label,
    rotationPosition,
    liveCredentialPath: srcPath,
    accountsRoot,
    capturedAt: now().toISOString(),
    notes,
  });
  const manifestFile = writeManifest(accountName, manifest, { accountsRoot });

  return {
    accountDir: dir.replace(/\\/g, "/"),
    credentialFile: destCred.replace(/\\/g, "/"),
    manifestFile: manifestFile.replace(/\\/g, "/"),
    manifest,
    bytesCopied: srcBuf.length,
    sha256: srcSha,
  };
}

// ------------------------------------------------------------------
// Atomic marker accessors — shared by U2 (.ps1 via `node -e`) and U6 (.mjs).
// Both consumers MUST go through these so the on-disk contract stays single-
// sourced (P1-1 from 2026-05-23 scrutiny).
// ------------------------------------------------------------------

export const ACTIVE_MARKER_FILE = "ACTIVE";
export const LAST_SWITCH_FILE = "LAST_SWITCH.json";
export const ROTATION_ORDER_FILE = "ROTATION_ORDER.json";
export const SWAP_LOCK_FILE = "account-swap-in-progress.lock";

function rootFile(name, { accountsRoot = DEFAULT_ACCOUNTS_ROOT } = {}) {
  return join(accountsRoot, name);
}

export function readActiveAccount(opts = {}) {
  const p = rootFile(ACTIVE_MARKER_FILE, opts);
  if (!existsSync(p)) return null;
  const v = readFileSync(p, "utf8").trim();
  if (!v) return null;
  if (!ACCOUNT_NAME_RE.test(v)) {
    throw new Error(`ACTIVE marker has invalid value '${v}' (expected account-N)`);
  }
  return v;
}

export function writeActiveAccount(accountName, opts = {}) {
  if (!ACCOUNT_NAME_RE.test(accountName)) {
    throw new Error(`invalid account name '${accountName}'`);
  }
  const accountsRoot = opts.accountsRoot ?? DEFAULT_ACCOUNTS_ROOT;
  if (!existsSync(accountsRoot)) mkdirSync(accountsRoot, { recursive: true });
  const target = rootFile(ACTIVE_MARKER_FILE, { accountsRoot });
  const tmp = uniqTmp(target);
  writeFileSync(tmp, accountName + "\n", "utf8");
  try {
    renameSync(tmp, target);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* best-effort */ }
    throw e;
  }
  return target;
}

export function readRotationOrder(opts = {}) {
  const p = rootFile(ROTATION_ORDER_FILE, opts);
  if (!existsSync(p)) return null;
  let raw;
  try { raw = readFileSync(p, "utf8"); }
  catch (e) { throw new Error(`failed to read ${p}: ${e.message}`); }
  let j;
  try { j = JSON.parse(raw); }
  catch (e) { throw new Error(`malformed ${ROTATION_ORDER_FILE}: ${e.message}`); }
  if (!Array.isArray(j)) {
    throw new Error(`${ROTATION_ORDER_FILE} must be a JSON array of account names`);
  }
  for (const name of j) {
    if (!ACCOUNT_NAME_RE.test(name)) {
      throw new Error(`${ROTATION_ORDER_FILE} contains invalid entry '${name}'`);
    }
  }
  return j;
}

export function writeRotationOrder(order, opts = {}) {
  if (!Array.isArray(order)) {
    throw new Error("rotation order must be an array");
  }
  for (const name of order) {
    if (!ACCOUNT_NAME_RE.test(name)) {
      throw new Error(`invalid entry '${name}' in rotation order`);
    }
  }
  const accountsRoot = opts.accountsRoot ?? DEFAULT_ACCOUNTS_ROOT;
  if (!existsSync(accountsRoot)) mkdirSync(accountsRoot, { recursive: true });
  const target = rootFile(ROTATION_ORDER_FILE, { accountsRoot });
  const tmp = uniqTmp(target);
  writeFileSync(tmp, JSON.stringify(order, null, 2) + "\n", "utf8");
  try {
    renameSync(tmp, target);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* best-effort */ }
    throw e;
  }
  return target;
}

export function writeLastSwitch({ from, to, by, trigger, ts = new Date().toISOString() }, opts = {}) {
  if (!to || !ACCOUNT_NAME_RE.test(to)) {
    throw new Error(`invalid 'to' in writeLastSwitch: '${to}'`);
  }
  if (from && !ACCOUNT_NAME_RE.test(from)) {
    throw new Error(`invalid 'from' in writeLastSwitch: '${from}'`);
  }
  const record = {
    ts,
    from: from ?? null,
    to,
    by: String(by ?? "unknown"),
    trigger: String(trigger ?? "manual"),
  };
  const accountsRoot = opts.accountsRoot ?? DEFAULT_ACCOUNTS_ROOT;
  if (!existsSync(accountsRoot)) mkdirSync(accountsRoot, { recursive: true });
  const target = rootFile(LAST_SWITCH_FILE, { accountsRoot });
  const tmp = uniqTmp(target);
  writeFileSync(tmp, JSON.stringify(record, null, 2) + "\n", "utf8");
  try {
    renameSync(tmp, target);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* best-effort */ }
    throw e;
  }
  return record;
}

export function readLastSwitch(opts = {}) {
  const p = rootFile(LAST_SWITCH_FILE, opts);
  if (!existsSync(p)) return null;
  let raw;
  try { raw = readFileSync(p, "utf8"); }
  catch (e) { throw new Error(`failed to read ${p}: ${e.message}`); }
  try { return JSON.parse(raw); }
  catch (e) { throw new Error(`malformed ${LAST_SWITCH_FILE}: ${e.message}`); }
}

// ------------------------------------------------------------------
// acquireSwapLock — `wx`-flag atomic create with stale-TTL eviction.
// Returns {release(), held:true, path, ts} on success; throws on contention.
// ------------------------------------------------------------------

export const DEFAULT_LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function acquireSwapLock({
  accountsRoot = DEFAULT_ACCOUNTS_ROOT,
  ttlMs = DEFAULT_LOCK_TTL_MS,
  by = "unknown",
  now = () => Date.now(),
} = {}) {
  if (!existsSync(accountsRoot)) mkdirSync(accountsRoot, { recursive: true });
  const lockPath = rootFile(SWAP_LOCK_FILE, { accountsRoot });

  // Stale-steal: if an existing lock is older than ttlMs, atomically replace it.
  if (existsSync(lockPath)) {
    let age = Infinity;
    try {
      const st = statSync(lockPath);
      age = now() - st.mtimeMs;
    } catch { /* treat unreadable lock as stealable */ }
    if (age <= ttlMs) {
      throw new Error(`swap lock held at ${lockPath} (age ${Math.round(age / 1000)}s; ttl ${Math.round(ttlMs / 1000)}s)`);
    }
    try { unlinkSync(lockPath); } catch { /* race-fine */ }
  }

  // `wx` = exclusive create; throws if any other process beat us to it.
  let fd;
  try {
    fd = openSync(lockPath, "wx");
  } catch (e) {
    throw new Error(`failed to acquire swap lock: ${e.message}`);
  }
  const ts = new Date().toISOString();
  const body = JSON.stringify({ ts, pid: process.pid, by }, null, 2) + "\n";
  try {
    writeSync(fd, body);
  } finally {
    closeSync(fd);
  }
  let released = false;
  return {
    held: true,
    path: lockPath,
    ts,
    release() {
      if (released) return false;
      released = true;
      try { unlinkSync(lockPath); return true; }
      catch { return false; }
    },
  };
}

// ------------------------------------------------------------------
// nextAccountInRotation — pure cycle step (U2/U6). Given the current active
// account + the ROTATION_ORDER array, returns the next account to swap to.
// null current → first in order; unknown current → first; wraps round-robin.
// ------------------------------------------------------------------
export function nextAccountInRotation(current, order) {
  if (!Array.isArray(order) || order.length === 0) return null;
  if (!current) return order[0];
  const i = order.indexOf(current);
  if (i === -1) return order[0];
  return order[(i + 1) % order.length];
}

// ------------------------------------------------------------------
// activateAccount — U2 credential swap. The ONLY function allowed to overwrite
// the live ~/.claude/.credentials.json. Atomically copies a captured vault
// credential into the live path so the NEXT Claude Code launch authenticates as
// that account. Backs the current live credential up first (reversible), writes
// the ACTIVE marker + LAST_SWITCH audit + manifest.last_used_at, all under the
// swap lock. Does NOT restart any chat — that is the staggered wake-sequencer's
// job; the coordinator (U6) chains swap → restart. The swap takes effect on the
// next process launch (a running Claude Code cached its credential at startup).
// ------------------------------------------------------------------
export function activateAccount({
  accountName,
  accountsRoot = DEFAULT_ACCOUNTS_ROOT,
  home = homedir(),
  by = "manual",
  trigger = "manual",
  backup = true,
  dryRun = false,
  now = () => new Date(),
  ttlMs = DEFAULT_LOCK_TTL_MS,
}) {
  if (!ACCOUNT_NAME_RE.test(accountName)) {
    throw new Error(`invalid account name '${accountName}' (must match ${ACCOUNT_NAME_RE})`);
  }
  const vaultCred = credentialSnapshotPath(accountName, { accountsRoot });
  if (!existsSync(vaultCred)) {
    throw new Error(`account '${accountName}' has no captured credential at ${vaultCred} — run capture-claude-credentials first`);
  }
  const st = statSync(vaultCred);
  if (!st.isFile() || st.size === 0) {
    throw new Error(`captured credential for '${accountName}' is empty or not a file: ${vaultCred}`);
  }
  const buf = readFileSync(vaultCred);
  try {
    JSON.parse(buf.toString("utf8"));
  } catch (e) {
    // Fail-loud: NEVER overwrite the live credential with a corrupt source —
    // that would brick `claude login` for the whole machine (R12).
    throw new Error(`captured credential for '${accountName}' is not valid JSON: ${vaultCred} — ${e.message}`);
  }
  const livePath = resolveLiveCredentialPath({ home });
  const sha = createHash("sha256").update(buf).digest("hex");
  let fromActive = null;
  try { fromActive = readActiveAccount({ accountsRoot }); } catch { fromActive = null; }

  // No-op guard: if this account is already ACTIVE and the live credential is
  // byte-identical to the vault snapshot, don't churn the file (avoids a
  // pointless restart trigger).
  let liveSame = false;
  if (existsSync(livePath)) {
    try {
      const liveSha = createHash("sha256").update(readFileSync(livePath)).digest("hex");
      liveSame = liveSha === sha;
    } catch { liveSame = false; }
  }
  if (fromActive === accountName && liveSame) {
    return { ok: true, noop: true, from: fromActive, to: accountName, reason: "already-active-and-identical", livePath: livePath.replace(/\\/g, "/") };
  }

  const plan = {
    from: fromActive,
    to: accountName,
    livePath: livePath.replace(/\\/g, "/"),
    vaultCred: vaultCred.replace(/\\/g, "/"),
    bytes: buf.length,
    sha256: sha,
    willBackup: backup && existsSync(livePath),
  };
  if (dryRun) {
    return { ok: true, dryRun: true, plan };
  }

  const lock = acquireSwapLock({ accountsRoot, ttlMs, by });
  try {
    // 1) Back up the current live credential BEFORE overwriting (reversible).
    let backupPath = null;
    if (backup && existsSync(livePath)) {
      const stamp = now().toISOString().replace(/[:.]/g, "-");
      backupPath = `${livePath}.pre-swap-${stamp}`;
      const bkpBuf = readFileSync(livePath);
      const bkpTmp = uniqTmp(backupPath);
      writeFileSync(bkpTmp, bkpBuf);
      try { renameSync(bkpTmp, backupPath); }
      catch (e) { try { unlinkSync(bkpTmp); } catch { /* best-effort */ } throw new Error(`failed to back up live credential before swap: ${e.message}`); }
    }
    // 2) Atomic overwrite of the live credential with the vault snapshot.
    const liveTmp = uniqTmp(livePath);
    writeFileSync(liveTmp, buf);
    try { renameSync(liveTmp, livePath); }
    catch (e) { try { unlinkSync(liveTmp); } catch { /* best-effort */ } throw new Error(`failed to install credential to ${livePath}: ${e.message}`); }
    try { chmodSync(livePath, 0o600); } catch { /* non-fatal */ }

    // 3) Update markers + audit.
    writeActiveAccount(accountName, { accountsRoot });
    try {
      const m = readManifest(accountName, { accountsRoot });
      if (m) { m.last_used_at = now().toISOString(); writeManifest(accountName, m, { accountsRoot }); }
    } catch { /* manifest update is best-effort; the swap already happened */ }
    const lastSwitch = writeLastSwitch({ from: fromActive, to: accountName, by, trigger, ts: now().toISOString() }, { accountsRoot });

    return {
      ok: true,
      from: fromActive,
      to: accountName,
      livePath: livePath.replace(/\\/g, "/"),
      backupPath: backupPath ? backupPath.replace(/\\/g, "/") : null,
      bytes: buf.length,
      sha256: sha,
      lastSwitch,
      // Caller (CLI / coordinator) restarts the chats AFTER this so they pick
      // up the new credential — the swap alone does not relaunch anything.
      restartRequired: true,
    };
  } finally {
    lock.release();
  }
}

export function listAccounts({ accountsRoot = DEFAULT_ACCOUNTS_ROOT } = {}) {
  if (!existsSync(accountsRoot)) return [];
  const entries = readdirSync(accountsRoot, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!ACCOUNT_NAME_RE.test(e.name)) continue;
    let manifest = null;
    const mf = manifestPath(e.name, { accountsRoot });
    if (existsSync(mf)) {
      try {
        manifest = readManifest(e.name, { accountsRoot });
      } catch (err) {
        manifest = { error: err.message };
      }
    }
    const hasCred = existsSync(credentialSnapshotPath(e.name, { accountsRoot }));
    out.push({
      name: e.name,
      hasManifest: !!manifest && !manifest.error,
      hasCredential: hasCred,
      manifest,
    });
  }
  out.sort((a, b) => {
    const ap = a.manifest?.rotation_position ?? 99;
    const bp = b.manifest?.rotation_position ?? 99;
    if (ap !== bp) return ap - bp;
    return a.name.localeCompare(b.name);
  });
  return out;
}
