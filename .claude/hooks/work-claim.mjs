#!/usr/bin/env node
// tier: T1
/**
 * work-claim.mjs — Claim Work Before Starting
 *
 * PreToolUse hook for Write/Edit that posts to AGENT_CHAT when
 * starting work on a new file or milestone. Other sessions will
 * see this via cross-session-awareness.
 *
 * Also checks if someone else claimed the same work recently.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const AGENT_CHAT = process.env.PRISM_AGENT_CHAT || "H:/prism/state/shared/AGENT_CHAT.md";
const CLAIMS_FILE = process.env.PRISM_WORK_CLAIMS_FILE || "H:/prism/state/shared/WORK_CLAIMS.json";
const CLAIM_EXPIRY_MS = Number(process.env.PRISM_WORK_CLAIM_TTL_MS || 30 * 60 * 1000);
// HS-04: PIDs from dead local processes count as expired regardless of age.
// Avoids the "WorkClaim WARNING by self-yet-different-PID" alarm-fatigue case
// where a prior session crashed without releasing its claim.
function isClaimPidAlive(claim) {
  try {
    if (!claim || typeof claim.pid !== "number" || claim.pid <= 0) return true;
    const claimHost = String(claim.hostname || "").slice(0, 8);
    if (claimHost && claimHost !== os.hostname().slice(0, 8)) return true; // different machine — assume alive
    process.kill(claim.pid, 0); // throws ESRCH if dead
    return true;
  } catch (e) {
    return e?.code === "EPERM"; // EPERM = alive but not ours; ESRCH/other = dead
  }
}
const MAX_CHAT_LINES = 100;
const SIGNIFICANT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".json",
  ".js",
  ".md",
  ".mjs",
  ".ps1",
  ".py",
  ".sh",
  ".ts",
  ".tsx",
  ".toml",
  ".yaml",
  ".yml",
]);
const SIGNIFICANT_SEGMENTS = [
  "/.claude/",
  "/.codex/",
  "/mcp-server/",
  "/scripts/",
  "/src/",
  "/state/shared/",
];
const LOW_SIGNAL_RUNTIME_FILES = new Set([
  "AGENT_CHAT.md",
  "AGENT_CHAT.jsonl",
  "AGENT_WORKBOARD.md",
  "AGENT_WORKBOARD.json",
  "CLAIM_EVENTS.jsonl",
]);

function getSessionId() {
  const pid = process.ppid || process.pid;
  return `${os.hostname().slice(0, 8)}-${pid}`;
}

function loadClaims() {
  try {
    if (fs.existsSync(CLAIMS_FILE)) {
      const claims = JSON.parse(fs.readFileSync(CLAIMS_FILE, "utf-8"));
      if (!claims.claims || typeof claims.claims !== "object") {
        claims.claims = {};
      }
      return claims;
    }
  } catch {}
  return { claims: {}, schemaVersion: 2 };
}

function saveClaims(claims) {
  try {
    fs.mkdirSync(path.dirname(CLAIMS_FILE), { recursive: true });
    claims.schemaVersion = Math.max(Number(claims.schemaVersion || 1), 2);
    claims.updatedAt = new Date().toISOString();
    fs.writeFileSync(CLAIMS_FILE, JSON.stringify(claims, null, 2));
  } catch {}
}

function postToChat(message) {
  try {
    let content = "";
    if (fs.existsSync(AGENT_CHAT)) {
      content = fs.readFileSync(AGENT_CHAT, "utf-8");
    }

    const lines = content.split("\n");
    const timestamp = new Date().toISOString().slice(11, 19);
    const newLine = `- [${timestamp}] ${getSessionId()}: ${message}`;

    // Keep last N lines
    const filtered = lines.filter((l) => l.trim()).slice(-MAX_CHAT_LINES);
    filtered.push(newLine);

    fs.writeFileSync(AGENT_CHAT, `# Agent Chat\n\n${filtered.join("\n")}\n`);
  } catch {}
}

function normalizeSlashes(value) {
  return String(value || "").replace(/\\/g, "/");
}

function normalizeResource(filePath) {
  let normalized = normalizeSlashes(filePath).trim();
  if (!normalized) return "";

  if (/^[a-zA-Z]:\//.test(normalized)) {
    normalized = `${normalized[0].toUpperCase()}:${normalized.slice(2)}`;
  }

  const lower = normalized.toLowerCase();
  const prismIndex = lower.indexOf("/prism/");
  if (prismIndex >= 0) {
    normalized = `H:/PRISM/${normalized.slice(prismIndex + "/prism/".length)}`;
  }

  return normalized;
}

function basenameOfResource(resource) {
  return normalizeSlashes(resource).split("/").filter(Boolean).pop() || resource;
}

function isSignificantPath(filePath) {
  const resource = normalizeResource(filePath);
  if (!resource) return false;

  const base = basenameOfResource(resource);
  if (LOW_SIGNAL_RUNTIME_FILES.has(base) || base.endsWith(".log")) return false;

  const lower = resource.toLowerCase();
  const ext = path.extname(base).toLowerCase();
  return SIGNIFICANT_EXTENSIONS.has(ext) && SIGNIFICANT_SEGMENTS.some((segment) => lower.includes(segment));
}

function claimTime(claim) {
  const t = new Date(claim?.at || claim?.claimed_at || claim?.claimedAt || claim?.updatedAt || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

function checkAndClaim(resource) {
  const claims = loadClaims();
  const now = Date.now();
  const myId = getSessionId();
  const normalizedResource = normalizeResource(resource);
  const legacyResource = basenameOfResource(normalizedResource);

  // Clean expired claims (age OR dead-PID-on-same-host — HS-04).
  for (const [res, claim] of Object.entries(claims.claims)) {
    const at = claimTime(claim);
    if (!at || now - at > CLAIM_EXPIRY_MS || !isClaimPidAlive(claim)) {
      delete claims.claims[res];
    }
  }

  // Check both the new normalized key and the legacy basename key so older
  // sessions still get collision protection while the registry migrates.
  const existing = claims.claims[normalizedResource] || claims.claims[legacyResource];
  if (existing && existing.by !== myId) {
    // HS-04: if the conflicting claim's PID is dead on this machine, it's
    // not a real peer — drop it silently and take the claim ourselves.
    if (!isClaimPidAlive(existing)) {
      delete claims.claims[normalizedResource];
      delete claims.claims[legacyResource];
    } else {
      const age = Math.round((now - claimTime(existing)) / 60000);
      return { conflict: true, holder: existing.by, minutesAgo: age };
    }
  }

  // Claim by normalized path to avoid basename collisions across subsystems.
  const claim = {
    kind: "file",
    resource: normalizedResource,
    file_path: normalizedResource,
    basename: legacyResource,
    by: myId,
    session_id: myId,
    hostname: os.hostname(),
    pid: process.ppid || process.pid,
    at: new Date().toISOString(),
  };
  claims.claims[normalizedResource] = claim;
  if (legacyResource !== normalizedResource && claims.claims[legacyResource]?.by === myId) {
    delete claims.claims[legacyResource];
  }
  saveClaims(claims);

  return { conflict: false };
}

async function main() {
  const input = readStdinSafe();

  let data;
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const toolInput = data.tool_input || {};
  const filePath = toolInput.file_path || "";

  if (!isSignificantPath(filePath)) {
    process.exit(0);
  }

  const resource = normalizeResource(filePath);

  // Check claim
  const result = checkAndClaim(resource);

  if (result.conflict) {
    postToChat(`CONFLICT: ${basenameOfResource(resource)} claimed by ${result.holder} (${result.minutesAgo}m ago)`);
    console.log(JSON.stringify({
      additionalContext: `[WorkClaim] WARNING: ${resource} is being edited by ${result.holder} (${result.minutesAgo}m ago). Coordinate to avoid conflicts!`,
    }));
  } else {
    postToChat(`claiming ${resource}`);
  }
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
