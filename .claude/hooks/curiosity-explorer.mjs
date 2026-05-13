#!/usr/bin/env node
// tier: T4
/**
 * curiosity-explorer.mjs — U-AI05 Curiosity-Driven Explorer
 *
 * Maintains a queue of unexplored paths, unknown territories, and
 * potential improvements. Injects exploration suggestions on SessionStart.
 *
 * Creates compounding exploration pressure over time.
 */

import * as fs from "fs";
import * as path from "path";

const CURIOSITY_QUEUE_FILE = "H:/prism/mcp-server/data/state/CURIOSITY_QUEUE.json";
const PREDICTIONS_FILE = "H:/prism/mcp-server/data/state/WORLD_SIM_PREDICTIONS.jsonl";
const MAX_QUEUE_SIZE = 50;
const MAX_AGE_DAYS = 7;

function loadQueue() {
  try {
    if (fs.existsSync(CURIOSITY_QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(CURIOSITY_QUEUE_FILE, "utf-8"));
    }
  } catch {
    // Start fresh
  }
  return {
    schemaVersion: 1,
    items: [],
    explored: [],
    lastUpdate: null,
  };
}

function saveQueue(queue) {
  try {
    const dir = path.dirname(CURIOSITY_QUEUE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    queue.lastUpdate = new Date().toISOString();
    fs.writeFileSync(CURIOSITY_QUEUE_FILE, JSON.stringify(queue, null, 2));
  } catch {
    // Ignore
  }
}

function extractCuriosityItems() {
  const items = [];

  // 1. Check for high-uncertainty predictions (explore uncertain areas)
  try {
    if (fs.existsSync(PREDICTIONS_FILE)) {
      const content = fs.readFileSync(PREDICTIONS_FILE, "utf-8");
      const predictions = content.trim().split("\n").filter(Boolean).map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      }).filter(Boolean);

      // Find predictions with moderate probability (uncertain)
      const uncertain = predictions.filter(
        (p) => p.willSucceed > 0.3 && p.willSucceed < 0.7
      );

      if (uncertain.length > 5) {
        items.push({
          id: `uncertain-${Date.now()}`,
          type: "uncertainty",
          text: `${uncertain.length} operations had uncertain outcomes (30-70% confidence)`,
          priority: 2,
          addedAt: new Date().toISOString(),
          source: "prediction-analysis",
        });
      }
    }
  } catch {
    // Ignore
  }

  // 2. Check for engine gaps (engines without tests)
  try {
    const enginesDir = "H:/prism/mcp-server/src/engines";
    const testsDir = "H:/prism/mcp-server/src/__tests__";

    if (fs.existsSync(enginesDir) && fs.existsSync(testsDir)) {
      const engines = fs.readdirSync(enginesDir).filter((f) => f.endsWith("Engine.ts"));
      const tests = fs.readdirSync(testsDir).filter((f) => f.includes(".test."));

      const testNames = new Set(tests.map((t) => t.replace(/\.test\.(ts|js)$/, "")));
      const untestedEngines = engines.filter((e) => {
        const baseName = e.replace(".ts", "");
        return !testNames.has(baseName);
      });

      if (untestedEngines.length > 0) {
        items.push({
          id: `untested-${Date.now()}`,
          type: "coverage-gap",
          text: `${untestedEngines.length} engines may lack dedicated tests`,
          priority: 3,
          addedAt: new Date().toISOString(),
          source: "coverage-scan",
          details: untestedEngines.slice(0, 5),
        });
      }
    }
  } catch {
    // Ignore
  }

  // 3. Check for stale state files (data that hasn't been updated)
  try {
    const stateDir = "H:/prism/mcp-server/data/state";
    if (fs.existsSync(stateDir)) {
      const now = Date.now();
      const staleFiles = fs.readdirSync(stateDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => ({
          name: f,
          age: now - fs.statSync(path.join(stateDir, f)).mtimeMs,
        }))
        .filter((f) => f.age > 7 * 24 * 60 * 60 * 1000) // >7 days
        .slice(0, 5);

      if (staleFiles.length > 0) {
        items.push({
          id: `stale-state-${Date.now()}`,
          type: "staleness",
          text: `${staleFiles.length} state files haven't been updated in >7 days`,
          priority: 4,
          addedAt: new Date().toISOString(),
          source: "staleness-check",
          details: staleFiles.map((f) => f.name),
        });
      }
    }
  } catch {
    // Ignore
  }

  return items;
}

function pruneOldItems(queue) {
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  queue.items = queue.items.filter((item) => {
    const age = now - new Date(item.addedAt).getTime();
    return age < maxAge;
  });

  // Keep queue size bounded
  if (queue.items.length > MAX_QUEUE_SIZE) {
    queue.items = queue.items
      .sort((a, b) => a.priority - b.priority)
      .slice(0, MAX_QUEUE_SIZE);
  }

  return queue;
}

function mergeNewItems(queue, newItems) {
  // Deduplicate by type+source
  const existingKeys = new Set(queue.items.map((i) => `${i.type}:${i.source}`));

  for (const item of newItems) {
    const key = `${item.type}:${item.source}`;
    if (!existingKeys.has(key)) {
      queue.items.push(item);
      existingKeys.add(key);
    }
  }

  return queue;
}

function selectExplorationTarget(queue) {
  if (queue.items.length === 0) return null;

  // Weighted random selection favoring high priority
  const weights = queue.items.map((item) => 1 / item.priority);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < queue.items.length; i++) {
    random -= weights[i];
    if (random <= 0) return queue.items[i];
  }

  return queue.items[0];
}

async function main() {
  // Load existing queue
  let queue = loadQueue();

  // Prune old items
  queue = pruneOldItems(queue);

  // Extract new curiosity items
  const newItems = extractCuriosityItems();

  // Merge new items
  queue = mergeNewItems(queue, newItems);

  // Save updated queue
  saveQueue(queue);

  // Select exploration target
  const target = selectExplorationTarget(queue);

  if (target && queue.items.length >= 3) {
    console.log(JSON.stringify({
      systemMessage: `[Curiosity] ${queue.items.length} unexplored items. Suggestion: ${target.text}`,
    }));
  }
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
