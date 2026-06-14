#!/usr/bin/env node
/**
 * run-hotel-domain-features.mjs — CLI runner for generate-hotel-domain-features.
 * Writes the augmentation JSON to state/shared/system-viz/ (VIZ_DIR ROOT) so that
 * merge-augmentations.mjs `loadOptional("hotel-domain-features.json")` (which reads
 * VIZ_DIR root, NOT staging/) actually picks it up. Was previously writing to
 * staging/ — a producer/consumer path mismatch that left the roost unrendered even
 * when run (U-VIZ-FAST-REGISTER-9, slot:sierra 2026-05-29).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generate, ROOT, SCHEMA_VERSION } from "./generate-hotel-domain-features.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = generate({});
// VIZ_DIR root (NOT staging/) — merge-augmentations loadOptional reads from here.
const augPath = path.join(ROOT, "state/shared/system-viz/hotel-domain-features.json");
fs.mkdirSync(path.dirname(augPath), { recursive: true });
fs.writeFileSync(augPath, JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...out, generatedAt: new Date().toISOString() }, null, 2));
console.log(
  `[hotel-domain-features] emitted ${out.newNodes.length} nodes (${out.stats.roostEmitted} roosts, ${out.stats.actions_classified} actions) -> ${augPath}`,
);
console.log(`[hotel-domain-features] by_axis: ${JSON.stringify(out.stats.by_axis)}`);
