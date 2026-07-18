#!/usr/bin/env node
/**
 * purge-stale-instances.mjs — Clean up stale agent instances
 *
 * Removes instances from AGENT_WORKBOARD.json that:
 * - Are older than 1 hour
 * - Have PIDs that no longer exist
 *
 * Run manually or on SessionStart to keep coordination state clean.
 */

import * as fs from "fs";
import { execSync } from "child_process";
import { writeAtomicSync } from "./atomic-write.mjs";

const WORKBOARD_JSON = "H:/prism/state/shared/AGENT_WORKBOARD.json";
const WORKBOARD_MD = "H:/prism/state/shared/AGENT_WORKBOARD.md";
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

function isPidAlive(pid) {
  try {
    const result = execSync(`tasklist //FI "PID eq ${pid}" 2>NUL`, { windowsHide: true, encoding: "utf-8" });
    return !result.includes("No tasks are running");
  } catch {
    return false;
  }
}

function loadWorkboard() {
  try {
    if (fs.existsSync(WORKBOARD_JSON)) {
      return JSON.parse(fs.readFileSync(WORKBOARD_JSON, "utf-8"));
    }
  } catch {
    // Ignore
  }
  return { instances: {} };
}

function saveWorkboard(workboard) {
  try {
    writeAtomicSync(WORKBOARD_JSON, JSON.stringify(workboard, null, 2));
  } catch {
    // Ignore
  }
}

function regenerateMarkdown(workboard) {
  const lines = ["# Agent Workboard", "", `Updated: ${new Date().toISOString()}`, ""];

  // Count families
  const families = {};
  for (const session of Object.values(workboard.instances || {})) {
    const family = session.family || "Unknown";
    families[family] = (families[family] || 0) + 1;
  }

  lines.push("## Agent Families", "");
  for (const [family, count] of Object.entries(families)) {
    lines.push(`- ${family}: ${count} instance(s)`);
  }
  lines.push("");

  // List active instances (limit to 20)
  const instances = Object.entries(workboard.instances || {})
    .sort((a, b) => new Date(b[1].lastUpdated || 0) - new Date(a[1].lastUpdated || 0))
    .slice(0, 20);

  for (const [id, session] of instances) {
    lines.push(`## ${id}`);
    lines.push(`- Family: ${session.family || "Unknown"}`);
    lines.push(`- Status: ${session.status || "unknown"}`);
    lines.push(`- Current: ${session.current || "not set"}`);
    lines.push(`- Last Updated: ${session.lastUpdated || "unknown"}`);
    lines.push("");
  }

  try {
    writeAtomicSync(WORKBOARD_MD, lines.join("\n"));
  } catch {
    // Ignore
  }
}

async function main() {
  const workboard = loadWorkboard();
  const now = Date.now();
  let purged = 0;
  let checked = 0;

  const instances = workboard.instances || {};
  const toRemove = [];

  for (const [sessionId, session] of Object.entries(instances)) {
    checked++;

    // Check age
    const lastUpdated = new Date(session.lastUpdated || 0).getTime();
    const age = now - lastUpdated;

    if (age > STALE_THRESHOLD_MS) {
      toRemove.push(sessionId);
      purged++;
      continue;
    }

    // Check PID if available
    const pidMatch = sessionId.match(/pid-(\d+)/);
    if (pidMatch) {
      const pid = parseInt(pidMatch[1], 10);
      if (!isPidAlive(pid)) {
        toRemove.push(sessionId);
        purged++;
      }
    }
  }

  // Remove stale instances
  for (const id of toRemove) {
    delete instances[id];
  }

  workboard.instances = instances;
  workboard.lastPurge = new Date().toISOString();
  workboard.purgedCount = purged;

  saveWorkboard(workboard);
  regenerateMarkdown(workboard);

  console.log(`Purged ${purged}/${checked} stale instances`);
}

main().catch(console.error);
