#!/usr/bin/env node
// tier: T4
/**
 * stop_on_open_claim.mjs — Tier 6 Stop Hook
 * Prevents exit when claims are held without completion record.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CLAIMS_DIR = process.env.PRISM_MCP_LOCKS_DIR || "H:/prism/mcp-server/data/locks";
const WORK_CLAIMS_FILE = process.env.PRISM_WORK_CLAIMS_FILE || "H:/prism/state/shared/WORK_CLAIMS.json";
const ROADMAP_CLAIMS_FILE = process.env.PRISM_ROADMAP_CLAIMS_FILE || "H:/prism/state/shared/ACTIVE_ROADMAP_CLAIMS.json";
const CLAIM_TTL_MS = Number(process.env.PRISM_STOP_CLAIM_TTL_MS || 2 * 60 * 60 * 1000);
const DRY_RUN = process.env.PRISM_STOP_CLAIM_DRY_RUN === "1";

function currentSessionIds() {
  const host = os.hostname();
  return new Set([
    `session-${process.pid}-${host}`,
    `session-${process.ppid || process.pid}-${host}`,
    `${host.slice(0, 8)}-${process.pid}`,
    `${host.slice(0, 8)}-${process.ppid || process.pid}`,
    `pid-${process.pid}`,
    `pid-${process.ppid || process.pid}`,
  ]);
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  if (DRY_RUN) return;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  } catch {
    // Stop hooks should surface warnings, not break user exit.
  }
}

function ageMs(value) {
  if (typeof value === "number") return Date.now() - value;
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? Date.now() - parsed : Number.POSITIVE_INFINITY;
}

function isFresh(value) {
  return ageMs(value) < CLAIM_TTL_MS;
}

function claimHolder(claim) {
  return String(claim?.by || claim?.holder || claim?.session_id || claim?.sessionId || claim?.terminalId || "");
}

function claimLabel(claim, fallback) {
  return String(
    claim?.resource ||
    claim?.file_path ||
    claim?.milestoneId ||
    claim?.unitId ||
    claim?.unit ||
    fallback
  );
}

function readMcpLocks() {
  if (!fs.existsSync(CLAIMS_DIR)) return [];
  return fs.readdirSync(CLAIMS_DIR)
    .filter((f) => f.endsWith(".lock"))
    .map((f) => {
      const data = readJson(path.join(CLAIMS_DIR, f), null);
      if (!data) return null;
      const status = data.status || "claimed";
      const fresh = isFresh(data.claimedAt || data.claimed_at || data.at);
      if (fresh && status === "claimed") {
        return {
          source: "mcp-lock",
          holder: claimHolder(data) || "unknown",
          label: claimLabel(data, f),
        };
      }
      return null;
    })
    .filter(Boolean);
}

function readAndReleaseWorkClaims(sessionIds) {
  if (!fs.existsSync(WORK_CLAIMS_FILE)) return { open: [], released: 0 };

  const registry = readJson(WORK_CLAIMS_FILE, { claims: {} });
  const claims = registry.claims && typeof registry.claims === "object" ? registry.claims : {};
  const open = [];
  let released = 0;

  for (const [key, claim] of Object.entries(claims)) {
    if (!isFresh(claim?.at || claim?.claimedAt || claim?.updatedAt)) continue;

    const holder = claimHolder(claim);
    if (sessionIds.has(holder)) {
      delete claims[key];
      released++;
      continue;
    }

    open.push({
      source: "work-claim",
      holder: holder || "unknown",
      label: claimLabel(claim, key),
    });
  }

  if (released > 0) {
    registry.claims = claims;
    registry.updatedAt = new Date().toISOString();
    writeJson(WORK_CLAIMS_FILE, registry);
  }

  return { open, released };
}

function readRoadmapClaims(sessionIds) {
  if (!fs.existsSync(ROADMAP_CLAIMS_FILE)) return [];

  const registry = readJson(ROADMAP_CLAIMS_FILE, { claims: [] });
  const claims = Array.isArray(registry.claims) ? registry.claims : [];
  return claims
    .filter((claim) => {
      const status = String(claim.status || "active");
      if (!["active", "claimed", "compacted"].includes(status)) return false;
      if (!isFresh(claim.heartbeatAt || claim.claimedAt || claim.at)) return false;
      return !sessionIds.has(claimHolder(claim));
    })
    .map((claim) => ({
      source: "roadmap-claim",
      holder: claimHolder(claim) || "unknown",
      label: claimLabel(claim, claim.claimId || "roadmap-claim"),
    }));
}

function drainStdin() {
  // Drain hook input synchronously - async iteration can hang indefinitely
  try {
    if (!process.stdin.isTTY) {
      fs.readFileSync(0, "utf-8");
    }
  } catch {
    // ignore - stdin may be empty or closed
  }
}

async function main() {
  drainStdin();

  try {
    const sessionIds = currentSessionIds();
    const workClaims = readAndReleaseWorkClaims(sessionIds);
    const openClaims = [
      ...readMcpLocks(),
      ...workClaims.open,
      ...readRoadmapClaims(sessionIds),
    ];

    if (openClaims.length > 0) {
      const examples = openClaims
        .slice(0, 4)
        .map((c) => `${c.source}:${c.label} by ${c.holder}`)
        .join(", ");
      console.log(JSON.stringify({
        continue: true,
        systemMessage: `warn — ${openClaims.length} open claim(s) still active: ${examples}. Coordinate before starting overlapping work.${workClaims.released ? ` Released ${workClaims.released} current-session work claim(s).` : ""}`,
      }));
    } else {
      const released = workClaims.released ? ` Released ${workClaims.released} current-session work claim(s)` : "";
      console.log(JSON.stringify({
        continue: true,
        systemMessage: `pass${released}`,
      }));
    }
  } catch {
    console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ continue: true, systemMessage: "pass" })));
