#!/usr/bin/env node
/**
 * account-switch-preflight.mjs -- ZULU-ACCOUNT-CYCLE-MS0 / U-ACCT-PREFLIGHT
 * (slot:zulu, 2026-06-18). The READ-ONLY GO/NO-GO before arming the auto
 * account-switch. Answers: "if the switch fires right now, will it land on a
 * valid account, or will it overwrite a working login with a stale snapshot?"
 *
 * WHY THIS EXISTS (empirically verified 2026-06-18, not assumed):
 *   - claudeAiOauth has NO stable account-identity field -- only accessToken +
 *     refreshToken (both rotate), expiresAt, scopes, subscriptionType. So the
 *     coordinator cannot know WHICH of the 6 captured accounts is currently live.
 *   - readActiveAccount() reads an ACTIVE marker FILE that does not exist on this
 *     host -> returns null -> nextAccountInRotation(null, order) = order[0]. The
 *     rotation BLINDLY starts at account-1.
 *   - The live refresh token matched NONE of the 6 snapshots, and all 6 snapshots'
 *     access tokens expired 4 days ago. So a blind first swap could OVERWRITE the
 *     working fresh live credential with a stale 4-day-old snapshot -> auth break.
 * This validator surfaces that as a hard NO-GO instead of letting the operator arm
 * a chain that silently degrades the live login (R12 fail-loud; "autonomous no
 * matter what" must mean the switch actually WORKS, not just that it fires).
 *
 * IDENTITY (best available): match the live claudeAiOauth.refreshToken to a
 * snapshot's -> that snapshot is the current account. refreshToken is the most
 * stable field (accessToken rotates ~8h). If no refresh match, try accessToken (a
 * match there is definitive-current; a miss means the current account cannot be
 * identified from the snapshots).
 *
 * SECURITY: this reads credential files but NEVER returns or logs a token VALUE.
 * Tokens are compared only via internal sha256 fingerprints; the report carries
 * account names + grades + ages + booleans -- never a token, never a fingerprint.
 *
 *   node scripts/account-switch-preflight.mjs            # human GO/NO-GO report
 *   node scripts/account-switch-preflight.mjs --json
 *   node scripts/account-switch-preflight.mjs --fix-active   # write ACTIVE if current is identified
 */

import fsDefault from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";
import {
  resolveLiveCredentialPath,
  credentialSnapshotPath,
  readRotationOrder,
  readActiveAccount,
  writeActiveAccount,
  nextAccountInRotation,
  DEFAULT_ACCOUNTS_ROOT,
} from "./lib/claude-account-lib.mjs";

export const DEFAULT_STALE_CAPTURE_DAYS = 7;  // a capture older than this MAY have a rotated refresh token
export const EXPIRING_SOON_MS = 60 * 60 * 1000; // access token within 1h of expiry
const DAY_MS = 24 * 60 * 60 * 1000;

// ============================== PURE CORE ==============================

function sha256(s) { return createHash("sha256").update(String(s)).digest("hex"); }

/**
 * Fingerprint a parsed credential doc. Returns ONLY non-secret derivations
 * (sha256 of the tokens for internal comparison + the expiry + flags). NEVER
 * returns a raw token. PURE.
 * @returns {{valid:boolean, hasAccess:boolean, hasRefresh:boolean,
 *            accessFp:string|null, refreshFp:string|null, expiresAt:number|null,
 *            subscriptionType:string|null}}
 */
export function credFingerprint(credJson) {
  const o = credJson && typeof credJson === "object" && credJson.claudeAiOauth && typeof credJson.claudeAiOauth === "object"
    ? credJson.claudeAiOauth : null;
  if (!o) return { valid: false, hasAccess: false, hasRefresh: false, accessFp: null, refreshFp: null, expiresAt: null, subscriptionType: null };
  const access = typeof o.accessToken === "string" && o.accessToken ? o.accessToken : null;
  const refresh = typeof o.refreshToken === "string" && o.refreshToken ? o.refreshToken : null;
  const exp = Number(o.expiresAt);
  return {
    valid: !!refresh, // a snapshot is usable for re-auth ONLY if it has a refresh token
    hasAccess: !!access,
    hasRefresh: !!refresh,
    accessFp: access ? sha256(access) : null,
    refreshFp: refresh ? sha256(refresh) : null,
    expiresAt: Number.isFinite(exp) ? exp : null,
    subscriptionType: typeof o.subscriptionType === "string" ? o.subscriptionType : null,
  };
}

/**
 * Identify the current account by matching the live fingerprint against snapshots.
 * refreshToken first (stable), then accessToken (volatile but definitive on match).
 * PURE.
 * @param {{accessFp,refreshFp}} liveFp
 * @param {Array<{name, fp:{accessFp,refreshFp}}>} snapshots
 * @returns {{account:string|null, method:"refresh"|"access"|"none"}}
 */
export function identifyCurrent(liveFp, snapshots) {
  if (!liveFp) return { account: null, method: "none" };
  if (liveFp.refreshFp) {
    const m = snapshots.find((s) => s.fp && s.fp.refreshFp && s.fp.refreshFp === liveFp.refreshFp);
    if (m) return { account: m.name, method: "refresh" };
  }
  if (liveFp.accessFp) {
    const m = snapshots.find((s) => s.fp && s.fp.accessFp && s.fp.accessFp === liveFp.accessFp);
    if (m) return { account: m.name, method: "access" };
  }
  return { account: null, method: "none" };
}

/** Whole days from `whenMs` to `nowMs` (>=0), or null if unparseable. PURE. */
export function daysAgo(whenMs, nowMs) {
  const w = Number(whenMs);
  if (!Number.isFinite(w) || !Number.isFinite(nowMs)) return null;
  return Math.max(0, (nowMs - w) / DAY_MS);
}

/** Classify an access token's freshness vs now. PURE. */
export function classifyAccess(expiresAt, nowMs) {
  const e = Number(expiresAt);
  if (!Number.isFinite(e)) return "unknown";
  if (e <= nowMs) return "expired";
  if (e - nowMs <= EXPIRING_SOON_MS) return "expiring-soon";
  return "fresh";
}

/**
 * Grade the rotation readiness. PURE. RED blocks an auto-arm.
 * @param {object} a
 * @param {string|null} a.currentAccount    identified current (or null)
 * @param {string} a.identifyMethod
 * @param {Array<{name, fp, expiresAt, capturedAt}>} a.snapshots   all captured (fp from credFingerprint)
 * @param {string[]} a.order                rotation order (account names)
 * @param {number} a.nowMs
 * @param {object} [a.thresholds]           { staleCaptureDays }
 * @returns {{grade, reasons[], recommendations[], nextTarget, distinctAccounts,
 *            orderHealthy:boolean, accounts:[...] }}
 */
export function gradePreflight({ currentAccount, identifyMethod, snapshots, order, nowMs, thresholds = {} }) {
  const staleCaptureDays = thresholds.staleCaptureDays ?? DEFAULT_STALE_CAPTURE_DAYS;
  const byName = new Map(snapshots.map((s) => [s.name, s]));
  const reasons = [];
  const recommendations = [];

  // Per-account health (no secrets).
  const accounts = snapshots.map((s) => {
    const capturedDaysAgo = daysAgo(s.capturedAt, nowMs);
    return {
      name: s.name,
      isCurrent: s.name === currentAccount,
      valid: !!(s.fp && s.fp.valid),
      hasRefresh: !!(s.fp && s.fp.hasRefresh),
      accessClass: classifyAccess(s.fp ? s.fp.expiresAt : null, nowMs),
      capturedDaysAgo: capturedDaysAgo == null ? null : Math.round(capturedDaysAgo * 10) / 10,
      inRotation: order.includes(s.name),
    };
  });

  // Distinct accounts among the ROTATION members (the ones that will be swapped to).
  const orderMembers = order.map((n) => byName.get(n)).filter(Boolean);
  const distinctRefresh = new Set(orderMembers.map((s) => s.fp && s.fp.refreshFp).filter(Boolean));
  const distinctAccounts = distinctRefresh.size;
  const orderInvalid = orderMembers.filter((s) => !(s.fp && s.fp.valid)); // missing refresh token => cannot re-auth
  const orderHealthy = order.length > 0 && orderInvalid.length === 0 && orderMembers.length === order.length;
  const nextTarget = nextAccountInRotation(currentAccount, order);

  let grade = "GREEN";
  const fail = (r) => { grade = "RED"; reasons.push(r); };
  const warn = (r) => { if (grade !== "RED") grade = "YELLOW"; reasons.push(r); };

  // --- RED conditions (a swap now is unsafe) ---
  if (!currentAccount) {
    fail("current live account is UNIDENTIFIABLE -- it matches no snapshot (refresh tokens rotate; there is no stable identity field). A blind first swap to order[0] could OVERWRITE the working login with a stale snapshot.");
    recommendations.push("Re-capture the CURRENT account now: `node scripts/capture-claude-credentials.mjs <account-N>` (overwrite) so its snapshot matches the live login, then re-run preflight.");
  }
  if (order.length === 0) {
    fail("ROTATION_ORDER is empty or missing -- nothing to rotate to.");
  } else if (distinctAccounts < 2) {
    fail(`only ${distinctAccounts} distinct account(s) in the rotation -- need >=2 for a switch to change anything.`);
  }
  if (order.length > 0 && orderInvalid.length > 0) {
    fail(`${orderInvalid.length} rotation member(s) have NO refresh token (cannot re-auth on launch): ${orderInvalid.map((s) => s.name).join(", ")}.`);
    recommendations.push("Re-capture the invalid account(s) after logging into each.");
  }
  const missingOrderSnap = order.filter((n) => !byName.has(n));
  if (missingOrderSnap.length > 0) {
    fail(`ROTATION_ORDER names accounts with no captured snapshot: ${missingOrderSnap.join(", ")}.`);
  }
  if (!nextTarget) {
    fail("no next rotation target resolves -- the rotation cannot advance.");
  }

  // --- YELLOW conditions (works, but degraded confidence) ---
  const staleCaptures = orderMembers.filter((s) => {
    const d = daysAgo(s.capturedAt, nowMs);
    return d != null && d > staleCaptureDays;
  });
  if (staleCaptures.length > 0) {
    warn(`${staleCaptures.length} rotation snapshot(s) captured > ${staleCaptureDays}d ago -- their refresh tokens MAY have rotated/expired (cannot verify offline): ${staleCaptures.map((s) => s.name).join(", ")}.`);
    recommendations.push("Periodically re-capture each account (login -> capture) so snapshots stay fresh; a swap to a rotated/expired refresh token will fail auth.");
  }
  const allExpiredAccess = orderMembers.length > 0 && orderMembers.every((s) => classifyAccess(s.fp ? s.fp.expiresAt : null, nowMs) === "expired");
  if (allExpiredAccess && grade !== "RED") {
    warn("every rotation snapshot's ACCESS token is expired -- a swap relies entirely on the refresh token still being valid on next launch (informational; refresh is normal, but combined with old captures it raises the auth-failure risk).");
  }

  if (grade === "GREEN" && reasons.length === 0) {
    reasons.push(`current=${currentAccount} (via ${identifyMethod}); ${distinctAccounts} distinct rotation accounts; next swap -> ${nextTarget}.`);
  }

  return { grade, reasons, recommendations, nextTarget, distinctAccounts, orderHealthy, accounts };
}

// ============================== I/O (injectable) ==============================

/** Read + parse a credential JSON. Missing/corrupt -> null (fail-soft). */
export function loadCred(path, _fs = fsDefault) {
  try { return JSON.parse(_fs.readFileSync(path, "utf8")); } catch { return null; }
}

/**
 * Run the full preflight against the live + captured credentials. Read-only
 * (unless fixActive && a current account is identified, which writes the ACTIVE
 * marker -- a safe corrective for the unset-marker gap).
 * @returns {object} report (NO token values, NO fingerprints)
 */
export function runPreflight({
  accountsRoot = DEFAULT_ACCOUNTS_ROOT,
  home = homedir(),
  nowMs,
  fixActive = false,
  thresholds = {},
  _fs = fsDefault,
  _writeActive = writeActiveAccount,
} = {}) {
  if (!Number.isFinite(nowMs)) throw new Error("runPreflight: nowMs (finite epoch ms) is required");

  const livePath = resolveLiveCredentialPath({ home });
  const liveJson = loadCred(livePath, _fs);
  const liveFp = liveJson ? credFingerprint(liveJson) : null;

  // Enumerate captured snapshots from the rotation order only. Identity is
  // matched against these, so a live account that is captured but NOT listed in
  // the order reads as UNIDENTIFIABLE -- the SAFE direction (it blocks an arm
  // rather than swapping to a wrong/stale account).
  let order = [];
  try { order = readRotationOrder({ accountsRoot }) || []; } catch { order = []; }
  // Build the snapshot set from order names (the rotation-relevant accounts).
  const names = Array.from(new Set(order));
  const snapshots = names.map((name) => {
    const p = credentialSnapshotPath(name, { accountsRoot });
    const j = loadCred(p, _fs);
    const fp = j ? credFingerprint(j) : { valid: false, hasAccess: false, hasRefresh: false, accessFp: null, refreshFp: null, expiresAt: null, subscriptionType: null };
    // capturedAt is sourced from the manifest below (the credential JSON carries
    // no capture timestamp); a missing manifest leaves it null -> excluded from
    // the stale-capture check (best-effort degrade).
    return { name, fp, expiresAt: fp.expiresAt, capturedAt: null };
  });
  // Captured-at age: prefer the manifest's captured_at (read separately, cheap).
  for (const s of snapshots) {
    try {
      const mp = credentialSnapshotPath(s.name, { accountsRoot }).replace(/\.credentials\.json$/, "manifest.json");
      const mj = loadCred(mp, _fs);
      if (mj && mj.captured_at) s.capturedAt = Date.parse(mj.captured_at);
    } catch { /* best-effort */ }
  }

  const id = identifyCurrent(liveFp, snapshots);
  let markerBefore = null;
  try { markerBefore = readActiveAccount({ accountsRoot }); } catch { markerBefore = null; }

  let fixedActive = null;
  if (fixActive && id.account) {
    try { _writeActive(id.account, { accountsRoot }); fixedActive = id.account; } catch { fixedActive = null; }
  }

  const graded = gradePreflight({
    currentAccount: id.account,
    identifyMethod: id.method,
    snapshots,
    order,
    nowMs,
    thresholds,
  });

  return {
    schemaVersion: "1.0.0",
    computedAt: new Date(nowMs).toISOString(),
    liveCredentialPresent: !!liveJson,
    liveValid: !!(liveFp && liveFp.valid),
    currentAccount: id.account,
    identifyMethod: id.method,
    activeMarker: markerBefore,
    activeMarkerWritten: fixedActive,
    rotationOrder: order,
    ...graded,
    safeToArm: graded.grade !== "RED",
  };
}

// ============================== CLI ==============================

function parseArgs(argv) {
  const a = { json: false, fixActive: false, staleCaptureDays: DEFAULT_STALE_CAPTURE_DAYS };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--json") a.json = true;
    else if (t === "--fix-active") a.fixActive = true;
    else if (t === "--stale-days") a.staleCaptureDays = Number(argv[++i]);
  }
  return a;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const r = runPreflight({ nowMs: Date.now(), fixActive: args.fixActive, thresholds: { staleCaptureDays: args.staleCaptureDays } });
  if (args.json) { process.stdout.write(JSON.stringify(r, null, 2) + "\n"); return; }
  const mark = r.grade === "GREEN" ? "GO" : r.grade === "YELLOW" ? "GO (degraded)" : "NO-GO";
  process.stdout.write(`[acct-preflight] ${r.grade}  (${mark})  safeToArm=${r.safeToArm}\n`);
  process.stdout.write(`  current account : ${r.currentAccount || "UNIDENTIFIABLE"}${r.currentAccount ? ` (via ${r.identifyMethod})` : ""}\n`);
  process.stdout.write(`  ACTIVE marker   : ${r.activeMarker || "(unset)"}${r.activeMarkerWritten ? ` -> wrote ${r.activeMarkerWritten}` : ""}\n`);
  process.stdout.write(`  rotation        : [${r.rotationOrder.join(", ")}] -> next swap ${r.nextTarget || "(none)"} | distinct=${r.distinctAccounts}\n`);
  for (const acc of r.accounts) {
    process.stdout.write(`    - ${acc.name}${acc.isCurrent ? " *CURRENT*" : ""}: refresh=${acc.hasRefresh ? "yes" : "NO"} access=${acc.accessClass} captured=${acc.capturedDaysAgo == null ? "?" : acc.capturedDaysAgo + "d"}ago\n`);
  }
  if (r.reasons.length) { process.stdout.write("  reasons:\n"); for (const x of r.reasons) process.stdout.write(`    - ${x}\n`); }
  if (r.recommendations.length) { process.stdout.write("  recommendations:\n"); for (const x of r.recommendations) process.stdout.write(`    * ${x}\n`); }
}

const __direct = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; }
})();
if (__direct) {
  try { main(); } catch (e) { process.stderr.write(`[acct-preflight] fatal: ${e?.stack || e}\n`); process.exit(1); }
}
