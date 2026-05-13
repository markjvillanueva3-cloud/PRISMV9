#!/usr/bin/env node
// tier: T4
/**
 * work-broadcast.mjs — Cross-Session Work Broadcasting
 *
 * On SessionStart, reads current position and broadcasts to shared state.
 * Other sessions can see what work is in progress to avoid collisions.
 *
 * Fixes coordination gap where sessions don't know each other's work.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const WORK_REGISTRY_FILE = "H:/prism/state/shared/ACTIVE_WORK_REGISTRY.json";
const POSITION_FILE = "H:/prism/state/CURRENT_POSITION.md";
const ROADMAP_INDEX = "H:/prism/mcp-server/data/roadmap-index.json";
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

function getSessionId() {
  const hostname = os.hostname();
  const pid = process.ppid || process.pid;
  return `${hostname}-${pid}`;
}

function loadRegistry() {
  try {
    if (fs.existsSync(WORK_REGISTRY_FILE)) {
      return JSON.parse(fs.readFileSync(WORK_REGISTRY_FILE, "utf-8"));
    }
  } catch {
    // Start fresh
  }
  return {
    schemaVersion: 2,
    sessions: {},
    lastCleanup: null,
  };
}

function saveRegistry(registry) {
  try {
    const dir = path.dirname(WORK_REGISTRY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(WORK_REGISTRY_FILE, JSON.stringify(registry, null, 2));
  } catch {
    // Ignore
  }
}

function getCurrentPosition() {
  try {
    if (fs.existsSync(POSITION_FILE)) {
      const content = fs.readFileSync(POSITION_FILE, "utf-8");
      const match = content.match(/\*\*Phase:\*\*\s*(.+)/);
      if (match) return match[1].trim();
    }
  } catch {
    // Ignore
  }
  return null;
}

function getActiveUnitsFromRoadmap() {
  try {
    if (!fs.existsSync(ROADMAP_INDEX)) return [];

    const roadmap = JSON.parse(fs.readFileSync(ROADMAP_INDEX, "utf-8"));
    const active = (roadmap.milestones || [])
      .filter((m) => m.status === "in_progress" || m.status === "active")
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        title: m.title?.slice(0, 50),
        units: `${m.completed_units || 0}/${m.total_units || "?"}`,
      }));

    return active;
  } catch {
    return [];
  }
}

function cleanupStaleSessions(registry) {
  const now = Date.now();
  const sessions = registry.sessions || {};
  let cleaned = 0;

  for (const [sessionId, session] of Object.entries(sessions)) {
    const lastSeen = new Date(session.lastSeen || 0).getTime();
    if (now - lastSeen > STALE_THRESHOLD_MS) {
      delete sessions[sessionId];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    registry.lastCleanup = new Date().toISOString();
  }

  return cleaned;
}

function getOtherActiveWork(registry, mySessionId) {
  const others = [];
  const now = Date.now();

  for (const [sessionId, session] of Object.entries(registry.sessions || {})) {
    if (sessionId === mySessionId) continue;

    const lastSeen = new Date(session.lastSeen || 0).getTime();
    const age = now - lastSeen;

    // Only show sessions active in last 10 minutes
    if (age < 10 * 60 * 1000 && session.currentWork) {
      others.push({
        session: sessionId,
        work: session.currentWork,
        minutesAgo: Math.round(age / 60000),
      });
    }
  }

  return others;
}

async function main() {
  const sessionId = getSessionId();
  const registry = loadRegistry();

  // Cleanup stale sessions
  const cleaned = cleanupStaleSessions(registry);

  // Get current work
  const position = getCurrentPosition();
  const activeUnits = getActiveUnitsFromRoadmap();

  // Register this session
  registry.sessions[sessionId] = {
    lastSeen: new Date().toISOString(),
    currentWork: position || "exploring",
    activeUnits: activeUnits.map((u) => u.id),
    hostname: os.hostname(),
  };

  // Save updated registry
  saveRegistry(registry);

  // Check what others are doing
  const others = getOtherActiveWork(registry, sessionId);

  // Build message
  const parts = [];

  if (cleaned > 0) {
    parts.push(`cleaned ${cleaned} stale sessions`);
  }

  if (others.length > 0) {
    const otherWork = others.map((o) => `${o.session.split("-")[1]}: ${o.work}`).join(", ");
    parts.push(`Other sessions: ${otherWork}`);
  }

  if (activeUnits.length > 0) {
    parts.push(`Active: ${activeUnits.map((u) => u.id).join(", ")}`);
  }

  if (parts.length > 0) {
    console.log(JSON.stringify({
      systemMessage: `[WorkBroadcast] ${parts.join(" | ")}`,
    }));
  }
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
