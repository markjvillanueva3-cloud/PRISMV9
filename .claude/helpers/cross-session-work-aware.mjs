#!/usr/bin/env node
/**
 * cross-session-work-aware.mjs — Prevents Duplicate Work Across Sessions
 *
 * FIRES ON: SessionStart, UserPromptSubmit
 *
 * This helper ensures ALL sessions are aware of:
 * 1. What other sessions are CURRENTLY working on
 * 2. What has been RECENTLY completed (last 24 hours)
 * 3. What engines/features are currently being created
 *
 * PREVENTS: Multiple sessions trying to build the same thing.
 */

import { promises as fs } from "node:fs";
import process from "node:process";

const WORK_REGISTRY = "H:/prism/state/shared/ACTIVE_WORK_REGISTRY.json";
const RECENT_COMPLETIONS = "H:/prism/state/shared/RECENT_COMPLETIONS.json";
const CREATION_LOCK = "H:/prism/state/shared/CREATION_LOCKS.json";

async function readJSON(path) {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function ensureDir(path) {
  const dir = path.substring(0, path.lastIndexOf("/"));
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // recursive mkdir is idempotent on existing dirs; swallowing covers
    // benign races across concurrent terminals. Real FS failures surface
    // at the subsequent writeFile call. See state/shared/HOOK_STATIC_AUDIT.json.
  }
}

async function writeJSON(filePath, data) {
  await ensureDir(filePath);
  // Atomic tmp+rename — prevents byte-interleaved reads when all 6 concurrent
  // chat sessions call registerCurrentWork() on the same registry files.
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await fs.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.rename(tmp, filePath);
  } catch (err) {
    try { await fs.unlink(tmp); } catch { /* tmp may not exist */ }
    throw err;
  }
}

async function getGitRecentWork() {
  // Parse recent commits to see what was worked on
  try {
    const { execSync } = await import("child_process");
    // Use relative date format that works on Windows
    const log = execSync("git log --oneline -20 --after=1.day.ago", {
      cwd: "H:/prism",
      encoding: "utf8",
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (!log) return [];

    return log.split("\n").map(line => {
      const match = line.match(/^(\w+)\s+(.+)$/);
      return match ? { hash: match[1], message: match[2] } : null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function extractWorkItems(commits) {
  const items = [];
  const patterns = [
    // Engine creation
    { pattern: /(\w+Engine)/g, type: "engine" },
    // Milestone work
    { pattern: /([A-Z]+-MS\d+[A-Za-z]?)/g, type: "milestone" },
    // Feature/capability
    { pattern: /(forge-triple|dedup|pdf-learn|video-learn)/gi, type: "command" },
    // Machine type
    { pattern: /(lathe|mill|edm|wire|turning)/gi, type: "domain" },
  ];

  for (const commit of commits) {
    for (const { pattern, type } of patterns) {
      const matches = commit.message.match(pattern) || [];
      for (const match of matches) {
        items.push({ type, name: match, commit: commit.hash, message: commit.message });
      }
    }
  }

  return items;
}

async function registerCurrentWork(prompt) {
  const registry = await readJSON(WORK_REGISTRY) || { active: [], updated: new Date().toISOString() };

  // Extract what this session is working on
  const workItems = [];

  // Check prompt for engine creation
  if (/create.*engine|forge.*engine|new.*engine/i.test(prompt)) {
    const engineMatch = prompt.match(/(\w+Engine|\w+\s+engine)/i);
    if (engineMatch) {
      workItems.push({ type: "engine_creation", name: engineMatch[1], session: process.ppid });
    }
  }

  // Check for milestone work
  const msMatch = prompt.match(/([A-Z]+-MS\d+[A-Za-z]?)/);
  if (msMatch) {
    workItems.push({ type: "milestone", name: msMatch[1], session: process.ppid });
  }

  // Check for domain work
  const domains = ["lathe", "mill", "edm", "wire", "turning", "threading", "grinding"];
  for (const domain of domains) {
    if (new RegExp(`\\b${domain}\\b`, "i").test(prompt)) {
      workItems.push({ type: "domain", name: domain, session: process.ppid });
    }
  }

  // Add to registry
  for (const item of workItems) {
    const exists = registry.active.find(a =>
      a.type === item.type && a.name.toLowerCase() === item.name.toLowerCase()
    );
    if (!exists) {
      registry.active.push({
        ...item,
        started: new Date().toISOString(),
      });
    }
  }

  // Cleanup old entries (older than 2 hours)
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  registry.active = registry.active.filter(a =>
    new Date(a.started).getTime() > twoHoursAgo
  );

  registry.updated = new Date().toISOString();
  await writeJSON(WORK_REGISTRY, registry);

  return workItems;
}

async function checkForDuplicateWork(prompt) {
  const registry = await readJSON(WORK_REGISTRY) || { active: [] };
  const warnings = [];

  // Check if someone is already working on what we want to do
  const promptLower = prompt.toLowerCase();

  for (const active of registry.active) {
    if (active.session === process.ppid) continue; // Skip our own work

    const nameLower = active.name.toLowerCase();

    if (active.type === "engine_creation" && promptLower.includes("engine")) {
      if (promptLower.includes(nameLower) || nameLower.includes(promptLower.split(" ")[0])) {
        warnings.push(`⚠️ SESSION ${active.session} is already creating ${active.name}!`);
      }
    }

    if (active.type === "milestone" && promptLower.includes(nameLower.toLowerCase())) {
      warnings.push(`⚠️ SESSION ${active.session} is already working on ${active.name}!`);
    }

    if (active.type === "domain" && promptLower.includes(nameLower)) {
      // Only warn if creating something
      if (/create|build|forge|new/i.test(prompt)) {
        warnings.push(`⚠️ SESSION ${active.session} is working on ${active.name} domain — check for overlap!`);
      }
    }
  }

  return warnings;
}

async function main() {
  const promptRaw = process.env.TOOL_INPUT_prompt || process.env.PROMPT || "";
  const isSessionStart = process.argv.includes("--session-start");

  const parts = [];

  // Get recent git work
  const recentCommits = await getGitRecentWork();
  const recentWork = extractWorkItems(recentCommits);

  // Check for duplicate work
  const warnings = await checkForDuplicateWork(promptRaw);

  // Register our current work
  if (promptRaw) {
    await registerCurrentWork(promptRaw);
  }

  // Read current registry
  const registry = await readJSON(WORK_REGISTRY) || { active: [] };

  // Build output
  if (warnings.length > 0) {
    parts.push("🚨 DUPLICATE WORK DETECTED:");
    parts.push(warnings.join("\n"));
    parts.push("");
  }

  if (registry.active.length > 0 && isSessionStart) {
    parts.push("📋 ACTIVE WORK ACROSS SESSIONS:");
    const uniqueActive = registry.active.slice(-5);
    for (const a of uniqueActive) {
      parts.push(`  • [${a.type}] ${a.name} (session ${a.session})`);
    }
    parts.push("");
  }

  if (recentWork.length > 0 && isSessionStart) {
    const engines = recentWork.filter(w => w.type === "engine");
    const milestones = recentWork.filter(w => w.type === "milestone");

    if (engines.length > 0) {
      parts.push(`RECENTLY CREATED ENGINES (24h): ${engines.map(e => e.name).join(", ")}`);
    }
    if (milestones.length > 0) {
      parts.push(`RECENTLY COMPLETED MILESTONES: ${milestones.map(m => m.name).join(", ")}`);
    }
    parts.push("");
  }

  // Add coordination reminder
  if (isSessionStart) {
    parts.push("CROSS-SESSION PROTOCOL:");
    parts.push("1. Check RECENT_COMPLETIONS before creating new engines");
    parts.push("2. Run /dedup before ANY creation task");
    parts.push("3. Use roadmap claims to prevent milestone overlap");
    parts.push("4. Register work intent via this session's chat");
  }

  if (parts.length > 0) {
    console.log(JSON.stringify({
      additionalContext: parts.join("\n"),
    }));
  } else {
    console.log(JSON.stringify({ continue: true }));
  }
}

main().catch(() => console.log(JSON.stringify({ continue: true })));
