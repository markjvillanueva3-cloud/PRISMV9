// cimco-launch-probe.mjs — loader/query API over state/shared/cimco/launch-surface.json.
//
// U-CIMCO-LAUNCH-PROBE (slot:echo, CIMCO-INTEGRATION-MS0). The launch-surface catalogs HOW a blind
// agent starts and drives the local CIMCO Edit 2026 install to prove a generated post:
//   - executables[]      : the verified exe inventory (path + role + sizeBytes)
//   - launchPatterns[]   : CLI launch templates, each honestly flagged verified vs needsLiveVerify
//   - integrationHook    : the External-Commands FILE-channel hook (blind-safe; PRISM-as-External-Command-1)
//   - licenseGate        : the simulation-verdict license/UIA gate (why blind proving is text-only today)
//
// This module is the single source of truth the CimcoVerificationBridgeEngine.launchSurface() method and
// the cimco-launch-probe.test.mjs suite both consume — parity is asserted in the engine test. The loader
// FAILS LOUD on a missing/corrupt catalog (a launch surface that silently returns {} would let a caller
// believe CIMCO is unreachable when the catalog is just absent). `verify()` checks each catalogued exe on
// disk and returns the missing list — it NEVER fabricates a present exe.
//
// Wiki: [[cimco-verification-simulation-integration]]. Data: state/shared/cimco/launch-surface.json.

import { readFileSync, existsSync, statSync } from "node:fs";
import { join, isAbsolute, resolve } from "node:path";

export const LAUNCH_SURFACE_PATH = "state/shared/cimco/launch-surface.json";

/** Load + validate the launch surface. THROWS on missing file / parse error / shape violation (fail-loud). */
export function loadLaunchSurface(path = LAUNCH_SURFACE_PATH) {
  if (!existsSync(path)) {
    throw new Error(`[cimco-launch-probe] launch surface not found at ${path} — run the probe author (U-CIMCO-LAUNCH-PROBE) or check the path; refusing to fabricate an empty surface.`);
  }
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`[cimco-launch-probe] launch surface at ${path} is not valid JSON: ${e.message}`);
  }
  validateLaunchSurface(doc);
  return doc;
}

/** Structural validation — fail loud on the shapes the query API depends on. */
export function validateLaunchSurface(doc) {
  if (!doc || typeof doc !== "object") throw new Error("[cimco-launch-probe] surface must be an object");
  if (!Array.isArray(doc.executables) || doc.executables.length === 0)
    throw new Error("[cimco-launch-probe] surface.executables must be a non-empty array");
  if (!Array.isArray(doc.launchPatterns) || doc.launchPatterns.length === 0)
    throw new Error("[cimco-launch-probe] surface.launchPatterns must be a non-empty array");
  if (!doc.installRoot || typeof doc.installRoot !== "string")
    throw new Error("[cimco-launch-probe] surface.installRoot must be a string");
  for (const e of doc.executables) {
    if (!e.id || !e.exe || typeof e.role !== "string")
      throw new Error(`[cimco-launch-probe] executable missing id/exe/role: ${JSON.stringify(e)}`);
  }
  for (const p of doc.launchPatterns) {
    if (!p.id || !p.template || typeof p.verified !== "boolean")
      throw new Error(`[cimco-launch-probe] launchPattern missing id/template/verified: ${JSON.stringify(p)}`);
  }
  return true;
}

/** Resolve a catalogued exe's path against the install root (relative entries join the root). */
export function exePath(exe, installRoot) {
  return isAbsolute(exe.exe) ? exe.exe : join(installRoot, exe.exe);
}

/**
 * Verify the catalogued install on disk. Returns { ok, installRootPresent, present[], missing[] }.
 * `rootOverride` lets a test point at a fixture install (default = the real relative installRoot).
 * NEVER fabricates a present exe — a missing file lands in `missing` with its resolved path.
 */
export function verify(surface = loadLaunchSurface(), rootOverride) {
  const root = rootOverride || surface.installRoot;
  const present = [];
  const missing = [];
  for (const e of surface.executables) {
    const p = isAbsolute(e.exe) ? e.exe : join(root, e.exe);
    if (existsSync(p)) {
      let actualSize = null;
      try { actualSize = statSync(p).size; } catch { actualSize = null; }
      present.push({ id: e.id, exe: e.exe, path: p, role: e.role, sizeBytes: actualSize, sizeMatches: e.sizeBytes == null || actualSize === e.sizeBytes });
    } else {
      missing.push({ id: e.id, exe: e.exe, path: p, role: e.role });
    }
  }
  return {
    ok: missing.length === 0 && existsSync(resolve(root)),
    installRootPresent: existsSync(resolve(root)),
    installRoot: root,
    present,
    missing,
  };
}

/** The verified-only launch patterns (the ones a blind agent can rely on today). */
export function verifiedLaunchPatterns(surface = loadLaunchSurface()) {
  return surface.launchPatterns.filter((p) => p.verified === true && p.needsLiveVerify !== true);
}

/** Patterns that still require live-app confirmation (honest gap list). */
export function unverifiedLaunchPatterns(surface = loadLaunchSurface()) {
  return surface.launchPatterns.filter((p) => p.verified !== true || p.needsLiveVerify === true);
}

/** Look up an executable by id (e.g. "edit", "sim"). Returns null if absent. */
export function exeById(id, surface = loadLaunchSurface()) {
  return surface.executables.find((e) => e.id === id) || null;
}

/**
 * Render a concrete open command for a real NC file using the verified open-file pattern.
 * Returns { command, exePath, pattern } or throws if the open-file pattern is missing (fail-loud).
 */
export function openCommand(ncFilePath, surface = loadLaunchSurface()) {
  const pat = surface.launchPatterns.find((p) => p.id === "open-file");
  if (!pat) throw new Error("[cimco-launch-probe] no open-file launch pattern in surface");
  const edit = exeById("edit", surface);
  const ep = edit ? exePath(edit, surface.installRoot) : "CIMCOEdit.exe";
  return { command: `"${ep}" "${ncFilePath}"`, exePath: ep, pattern: pat.id };
}

/** Compact readiness summary for dashboards / dispatcher. */
export function launchSummary(surface = loadLaunchSurface(), rootOverride) {
  const v = verify(surface, rootOverride);
  return {
    schemaVersion: surface.schemaVersion,
    installRoot: v.installRoot,
    installPresent: v.ok,
    exeCount: surface.executables.length,
    exePresent: v.present.length,
    exeMissing: v.missing.map((m) => m.exe),
    verifiedPatterns: verifiedLaunchPatterns(surface).map((p) => p.id),
    needsLiveVerify: unverifiedLaunchPatterns(surface).map((p) => p.id),
    integrationHook: surface.integrationHook ? surface.integrationHook.id : null,
    integrationHookBlindSafe: !!(surface.integrationHook && surface.integrationHook.blindSafe),
    licenseGated: !!surface.licenseGate,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
function _main(argv) {
  const cmd = argv[0] || "summary";
  const surface = loadLaunchSurface();
  if (cmd === "summary") {
    process.stdout.write(JSON.stringify(launchSummary(surface), null, 2) + "\n");
  } else if (cmd === "verify") {
    const v = verify(surface);
    process.stdout.write(JSON.stringify(v, null, 2) + "\n");
    return v.ok ? 0 : 1;
  } else if (cmd === "patterns") {
    process.stdout.write(JSON.stringify({ verified: verifiedLaunchPatterns(surface), needsLiveVerify: unverifiedLaunchPatterns(surface) }, null, 2) + "\n");
  } else if (cmd === "hook") {
    process.stdout.write(JSON.stringify(surface.integrationHook, null, 2) + "\n");
  } else if (cmd === "open") {
    const f = argv[1];
    if (!f) { process.stderr.write("usage: cimco-launch-probe open <ncFilePath>\n"); return 2; }
    process.stdout.write(JSON.stringify(openCommand(f, surface), null, 2) + "\n");
  } else {
    process.stderr.write("usage: cimco-launch-probe <summary|verify|patterns|hook|open <file>>\n");
    return 2;
  }
  return 0;
}

const _argv1 = process.argv[1] || "";
if (_argv1.endsWith("cimco-launch-probe.mjs")) process.exit(_main(process.argv.slice(2)));
