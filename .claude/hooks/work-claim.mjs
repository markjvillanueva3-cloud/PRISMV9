#!/usr/bin/env node
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

const AGENT_CHAT = "H:/prism/state/shared/AGENT_CHAT.md";
const CLAIMS_FILE = "H:/prism/state/shared/WORK_CLAIMS.json";
const CLAIM_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CHAT_LINES = 100;

function getSessionId() {
  const pid = process.ppid || process.pid;
  return `${os.hostname().slice(0, 8)}-${pid}`;
}

function loadClaims() {
  try {
    if (fs.existsSync(CLAIMS_FILE)) {
      return JSON.parse(fs.readFileSync(CLAIMS_FILE, "utf-8"));
    }
  } catch {}
  return { claims: {}, schemaVersion: 1 };
}

function saveClaims(claims) {
  try {
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

function checkAndClaim(resource) {
  const claims = loadClaims();
  const now = Date.now();
  const myId = getSessionId();

  // Clean expired claims
  for (const [res, claim] of Object.entries(claims.claims)) {
    if (now - new Date(claim.at).getTime() > CLAIM_EXPIRY_MS) {
      delete claims.claims[res];
    }
  }

  // Check if already claimed by someone else
  const existing = claims.claims[resource];
  if (existing && existing.by !== myId) {
    const age = Math.round((now - new Date(existing.at).getTime()) / 60000);
    return { conflict: true, holder: existing.by, minutesAgo: age };
  }

  // Claim it
  claims.claims[resource] = { by: myId, at: new Date().toISOString() };
  saveClaims(claims);

  return { conflict: false };
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let data;
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const toolInput = data.tool_input || {};
  const filePath = toolInput.file_path || "";

  // Only care about significant paths
  if (!filePath.includes("Engine") && !filePath.includes("Dispatcher") && !filePath.includes("settings")) {
    process.exit(0);
  }

  // Extract resource name
  const resource = filePath.split("/").pop().split("\\").pop();

  // Check claim
  const result = checkAndClaim(resource);

  if (result.conflict) {
    postToChat(`CONFLICT: ${resource} claimed by ${result.holder} (${result.minutesAgo}m ago)`);
    console.log(JSON.stringify({
      additionalContext: `[WorkClaim] WARNING: ${resource} is being edited by ${result.holder} (${result.minutesAgo}m ago). Coordinate to avoid conflicts!`,
    }));
  } else {
    postToChat(`claiming ${resource}`);
  }
}

main().catch(() => process.exit(0));
