#!/usr/bin/env node
/**
 * chat-bus-reap.mjs — Sweep zombie chat-bus state.
 *
 * Removes presence files whose claudeParentPid is dead, and claim files
 * owned by zombie sessions. Safe to run on demand or periodically.
 *
 * Liveness probe: process.kill(pid, 0) — ESRCH = dead.
 *
 * Usage:
 *   node H:/prism/.claude/helpers/chat-bus-reap.mjs              # reap
 *   node H:/prism/.claude/helpers/chat-bus-reap.mjs --dry-run    # report only
 *   node H:/prism/.claude/helpers/chat-bus-reap.mjs --json       # machine-readable
 */

import * as fs from "node:fs";
import * as path from "node:path";

const CHAT_BUS_ROOT = "H:/prism/state/shared/chat-bus";
const PRESENCE_DIR = path.join(CHAT_BUS_ROOT, "presence");
const CLAIMS_DIR = path.join(CHAT_BUS_ROOT, "claims");

// Heartbeat older than this with no parent PID → treat as zombie too.
const LEGACY_STALE_MS = 30 * 60 * 1000;

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const JSON_OUT = args.has("--json");

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function listDirSafe(p) {
  try {
    return fs.readdirSync(p);
  } catch {
    return [];
  }
}

function isPidAlive(pid) {
  if (!pid || !Number.isFinite(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    if (e?.code === "ESRCH") return false;
    return true;
  }
}

function classifySession(presence) {
  // Returns: "alive" | "zombie" | "stale-legacy"
  if (!presence) return "zombie";
  if (Number.isFinite(presence.claudeParentPid) && presence.claudeParentPid > 0) {
    return isPidAlive(presence.claudeParentPid) ? "alive" : "zombie";
  }
  // Legacy record without parent PID — use stricter staleness gate.
  const ts = Date.parse(presence.ts);
  if (!Number.isFinite(ts)) return "zombie";
  return Date.now() - ts > LEGACY_STALE_MS ? "stale-legacy" : "alive";
}

const liveSessions = new Set();
const reapedPresence = [];
const reapedClaims = [];

// Pass 1: classify presence files.
for (const f of listDirSafe(PRESENCE_DIR)) {
  const fp = path.join(PRESENCE_DIR, f);
  const p = readJsonSafe(fp);
  if (!p || !p.sessionId) {
    if (!DRY) try { fs.unlinkSync(fp); } catch {}
    reapedPresence.push({ file: f, reason: "malformed" });
    continue;
  }
  const status = classifySession(p);
  if (status === "alive") {
    liveSessions.add(p.sessionId);
  } else {
    if (!DRY) try { fs.unlinkSync(fp); } catch {}
    reapedPresence.push({
      file: f,
      sessionId: p.sessionId,
      reason: status,
      parentPid: p.claudeParentPid ?? null,
      ageMin: p.ts ? Math.round((Date.now() - Date.parse(p.ts)) / 60000) : null,
    });
  }
}

// Pass 2: reap claims owned by zombies.
for (const f of listDirSafe(CLAIMS_DIR)) {
  const fp = path.join(CLAIMS_DIR, f);
  const c = readJsonSafe(fp);
  if (!c || !c.sessionId) continue;
  const expMs = Date.parse(c.expiresAt);
  const expired = Number.isFinite(expMs) && expMs < Date.now();
  if (!liveSessions.has(c.sessionId) || expired) {
    if (!DRY) try { fs.unlinkSync(fp); } catch {}
    reapedClaims.push({
      file: f,
      sessionId: c.sessionId,
      path: c.path,
      reason: expired ? "expired" : "zombie-owner",
      expMin: Math.round((Date.parse(c.expiresAt) - Date.now()) / 60000),
    });
  }
}

const summary = {
  dryRun: DRY,
  liveSessions: [...liveSessions].sort(),
  reapedPresence,
  reapedClaims,
  counts: {
    live: liveSessions.size,
    reapedPresence: reapedPresence.length,
    reapedClaims: reapedClaims.length,
  },
};

if (JSON_OUT) {
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
} else {
  const verb = DRY ? "Would reap" : "Reaped";
  process.stdout.write(`chat-bus-reap: ${summary.counts.live} live | ${verb} ${summary.counts.reapedPresence} presence + ${summary.counts.reapedClaims} claims\n`);
  if (summary.counts.live > 0) {
    process.stdout.write(`  Live: ${summary.liveSessions.join(", ")}\n`);
  }
  for (const r of reapedPresence) {
    const tag = r.parentPid ? `pid=${r.parentPid}` : `legacy ${r.ageMin}m`;
    process.stdout.write(`  - presence ${r.sessionId} [${r.reason}, ${tag}]\n`);
  }
  for (const r of reapedClaims) {
    process.stdout.write(`  - claim ${r.sessionId} -> ${r.path} [${r.reason}]\n`);
  }
}
