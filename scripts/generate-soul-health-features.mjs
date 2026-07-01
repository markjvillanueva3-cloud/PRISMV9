#!/usr/bin/env node
/**
 * generate-soul-health-features.mjs — PSN/system-viz synergy for HSE01-08.
 *
 * Emits a `ghost.soul_health` augmentation feature file for system-viz that
 * surfaces fleet-wide soul state as roost nodes:
 *
 *   roost: ghost.soul_health
 *     children:
 *       - one node per slot (badged by domain-filter present, refuse-list size, role)
 *       - one node per fleet doctrine candidate (refusal held by majority)
 *       - one node per role-divergence (soul-consistency smells)
 *
 * Reads:  state/shared/slot-souls/<slot>.md (all souls)
 * Writes: state/shared/system-viz/augmentations/soul-health-features.json
 *
 * Registered in regen-viz.mjs FAST[] and merge-augmentations.mjs splice
 * (advisory follow-up — running the script standalone produces the file).
 *
 * Strictly read-only on souls; never mutates the .md files.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SOULS_DIR = join(REPO_ROOT, "state/shared/slot-souls");
const OUT_DIR = join(REPO_ROOT, "state/shared/system-viz/augmentations");
const OUT_FILE = join(OUT_DIR, "soul-health-features.json");

// Inline a minimal frontmatter parser (the engine import would require a build).
function parseFm(source, slotFromPath) {
  const re = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const m = source.match(re);
  if (!m) return null;
  const fmRaw = m[1];
  const fields = { slot: slotFromPath, refuse_list: [] };
  const lines = fmRaw.split(/\r?\n/);
  let curList = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.length) continue;
    if (curList && /^\s{2,}-\s+/.test(line)) {
      const item = line.replace(/^\s*-\s+/, "").trim();
      if (item.length > 0) curList.push(item);
      continue;
    }
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let value = kv[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value === "") {
      curList = [];
      fields[key] = curList;
    } else {
      fields[key] = value;
      curList = null;
    }
  }
  return fields;
}

function loadSouls() {
  if (!existsSync(SOULS_DIR)) return [];
  return readdirSync(SOULS_DIR)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((f) => {
      const slot = f.replace(/\.md$/, "");
      try {
        const src = readFileSync(join(SOULS_DIR, f), "utf8");
        return parseFm(src, slot);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function badge(soul) {
  const flags = [];
  if (!soul.refuse_list || soul.refuse_list.length === 0) flags.push("no-refuses");
  if (!soul.domain_filter) flags.push("untargeted");
  if (!soul.preferred_subagent_type) flags.push("no-preferred-subagent");
  if (!soul.escalation_path) flags.push("no-escalation");
  if (flags.length === 0) return "healthy";
  return flags.join(",");
}

function computeFleetDoctrine(souls) {
  const refMap = new Map();
  for (const s of souls) {
    for (const r of s.refuse_list || []) {
      const list = refMap.get(r) || [];
      if (!list.includes(s.slot)) list.push(s.slot);
      refMap.set(r, list);
    }
  }
  const threshold = Math.floor(souls.length / 2) + 1;
  return Array.from(refMap.entries())
    .filter(([, slots]) => slots.length >= threshold)
    .map(([refusal, slots]) => ({ refusal, slots, coverage_pct: Math.round((slots.length / souls.length) * 100) }))
    .sort((a, b) => b.slots.length - a.slots.length);
}

function buildFeatures(souls) {
  const features = [];
  const rootId = "ghost.soul_health";
  features.push({
    id: rootId,
    label: `Soul health (${souls.length} slots)`,
    layer: "L8",
    classification: "ghost",
    augmentation_source: "soul-health-features",
    metadata: { kind: "roost" },
  });

  // Per-slot node
  for (const s of souls) {
    const tag = badge(s);
    features.push({
      id: `ghost.soul_health.${s.slot}`,
      label: `${s.slot} — ${s.role || "?"} (${tag})`,
      layer: "L9",
      classification: tag === "healthy" ? "ghost" : "ghost-warn",
      parent: rootId,
      augmentation_source: "soul-health-features",
      metadata: {
        slot: s.slot,
        hermes_role: s.hermes_role,
        refuse_count: (s.refuse_list || []).length,
        has_filter: !!s.domain_filter,
        has_preferred_subagent: !!s.preferred_subagent_type,
        has_escalation: !!s.escalation_path,
        badge: tag,
      },
    });
  }

  // Fleet doctrine candidates
  const doctrine = computeFleetDoctrine(souls);
  if (doctrine.length > 0) {
    const dRoot = `${rootId}.doctrine`;
    features.push({
      id: dRoot,
      label: `Fleet doctrine candidates (${doctrine.length})`,
      layer: "L9",
      classification: "ghost",
      parent: rootId,
      augmentation_source: "soul-health-features",
      metadata: { kind: "roost", count: doctrine.length },
    });
    for (const d of doctrine) {
      features.push({
        id: `${dRoot}.${d.refusal}`,
        label: `${d.refusal} (${d.coverage_pct}% · ${d.slots.length} slots)`,
        layer: "L10",
        classification: "ghost",
        parent: dRoot,
        augmentation_source: "soul-health-features",
        metadata: { refusal: d.refusal, coverage_pct: d.coverage_pct, slots: d.slots },
      });
    }
  }

  return features;
}

function main() {
  const souls = loadSouls();
  if (souls.length === 0) {
    console.error("No souls found in", SOULS_DIR);
    process.exit(1);
  }
  const features = buildFeatures(souls);
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const out = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    source: "scripts/generate-soul-health-features.mjs",
    feature_count: features.length,
    features,
  };
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`✓ wrote ${features.length} soul-health features to ${OUT_FILE}`);
  console.log(`  ${souls.length} slot souls scanned; ${features.filter((f) => f.classification === "ghost-warn").length} unhealthy`);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("generate-soul-health-features.mjs")) {
  main();
}

export { parseFm, computeFleetDoctrine, buildFeatures };
