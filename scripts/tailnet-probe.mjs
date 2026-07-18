#!/usr/bin/env node
/**
 * tailnet-probe.mjs -- READ-ONLY Tailscale tailnet detector.
 *
 * AGENTIC-SUBSTRATE-BRIDGE/U-TAILNET-PROBE (slot:bravo 2026-06-14). The SAFE FOUNDATION sub-unit
 * of the operator-authorized fleet-mesh (Task #6). Detects whether Tailscale is installed and, if
 * so, reports tailnet status + peers. STRICTLY READ-ONLY: the only command it ever runs is
 * `status --json`. It never runs any control verb (governance-gated; soul refuse_list:
 * unsafe-fleet-control-before-governance). Fleet CONTROL is a separate governance-gated unit.
 *
 * Security: uses execFileSync (execFile, NOT a shell) with a FIXED argument array and no caller
 * input -- zero command-injection surface. Matches the repo's standard child_process convention.
 *
 * State (2026-06-14): Tailscale 1.98.4 is installed but LOGGED OUT (login is an operator browser
 * step against their tailnet account). So a live run reports backendState NeedsLogin / logged-out
 * with 0 peers -- the honest current state. When the operator logs in + a 2nd host joins, the SAME
 * probe reports self + peers with zero code change. The prism_fleet_network mesh dispatcher is
 * DEFERRED until a live multi-host tailnet exists to validate against (R15).
 *
 * Pure helpers exported for tests: parseTailscaleStatus, findTailscaleBin, probeTailnet (DI exec).
 *
 * Usage:
 *   node scripts/tailnet-probe.mjs            # text
 *   node scripts/tailnet-probe.mjs --json     # machine-readable
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const STATUS_TIMEOUT_MS = 5000;
// Common Windows install paths (PATH name is tried separately as a fallback).
const TAILSCALE_CANDIDATES = [
  "C:/Program Files/Tailscale/tailscale.exe",
  "C:/Program Files (x86)/Tailscale/tailscale.exe",
];

/**
 * Pure: parse `tailscale status --json` text into a compact summary. Never throws.
 * @returns {{ok:true, backendState, self, peers, peerCount, onlinePeerCount} | {ok:false, reason}}
 */
export function parseTailscaleStatus(jsonText) {
  let j;
  try { j = JSON.parse(jsonText); } catch { return { ok: false, reason: "unparseable status json" }; }
  if (!j || typeof j !== "object") return { ok: false, reason: "empty status" };
  const self = j.Self
    ? { hostName: j.Self.HostName ?? null, online: !!j.Self.Online, os: j.Self.OS ?? null, tailscaleIPs: Array.isArray(j.Self.TailscaleIPs) ? j.Self.TailscaleIPs : [] }
    : null;
  const peerMap = j.Peer && typeof j.Peer === "object" ? j.Peer : {};
  const peers = Object.values(peerMap).map((p) => ({
    hostName: p?.HostName ?? null, online: !!p?.Online, os: p?.OS ?? null, lastSeen: p?.LastSeen ?? null,
  }));
  return {
    ok: true,
    backendState: j.BackendState || "unknown",
    self,
    peers,
    peerCount: peers.length,
    onlinePeerCount: peers.filter((p) => p.online).length,
  };
}

/** Find an installed tailscale binary among the file candidates, or null (PATH is tried separately). */
export function findTailscaleBin(candidates = TAILSCALE_CANDIDATES, fileExists = existsSync) {
  for (const c of candidates ?? []) {
    try { if (fileExists(c)) return c; } catch { /* skip unstattable */ }
  }
  return null;
}

/**
 * Probe the tailnet (READ-ONLY). Fail-soft: never throws.
 * DI: exec(bin, args) -> stdout string (throws if the binary is missing or the call fails).
 * @returns {{installed:false, reason, bin} | {installed:true, healthy:false, reason, bin} | {installed:true, healthy:true, bin, ...summary}}
 */
export function probeTailnet({ exec, candidates = TAILSCALE_CANDIDATES, fileExists = existsSync } = {}) {
  // READ-ONLY: status is the ONLY verb. Fixed args array, no caller input -> no injection surface.
  const run = exec || ((bin, args) => execFileSync(bin, args, { encoding: "utf8", timeout: STATUS_TIMEOUT_MS }));
  const bin = findTailscaleBin(candidates, fileExists) || "tailscale"; // fall back to PATH lookup
  let out;
  try {
    out = run(bin, ["status", "--json"]);
  } catch (e) {
    return { installed: false, reason: `tailscale not runnable: ${String((e && e.message) || e).slice(0, 140)}`, bin };
  }
  const parsed = parseTailscaleStatus(out);
  if (!parsed.ok) return { installed: true, healthy: false, reason: parsed.reason, bin };
  return { installed: true, healthy: true, bin, ...parsed };
}

/** Pure: render a probe result as a one-line text report. */
export function formatProbe(result) {
  const r = result || {};
  if (!r.installed) return `Tailscale: NOT installed on this host (${r.reason || "no binary"}). Probe ready for when it is installed.`;
  if (!r.healthy) return `Tailscale: installed (${r.bin}) but status unreadable -- ${r.reason}`;
  const selfH = r.self?.hostName || "?";
  const loggedOut = String(r.backendState).toLowerCase().includes("needslogin") || String(r.backendState).toLowerCase() === "stopped";
  const note = loggedOut ? " [logged out -- operator runs `tailscale up` to join the tailnet]" : "";
  return `Tailscale: ${r.backendState} | self=${selfH} | peers=${r.peerCount} (${r.onlinePeerCount} online)${note}`;
}

async function main() {
  const wantJson = process.argv.includes("--json");
  const result = probeTailnet();
  process.stdout.write((wantJson ? JSON.stringify(result, null, 2) : formatProbe(result)) + "\n");
}

const isMain = (() => {
  try { return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main().catch((e) => { process.stderr.write(String((e && e.message) || e) + "\n"); process.exitCode = 1; });
