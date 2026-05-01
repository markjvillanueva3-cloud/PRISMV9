/**
 * emit-roadmap-canvas.ts — one-shot emitter for the
 * `knowledge/wiki/roadmap.canvas` deliverable (P3-U03).
 *
 * Run via tsx:
 *   node_modules/.bin/tsx mcp-server/scripts/emit-roadmap-canvas.ts
 *
 * Reads `mcp-server/data/roadmap-index.json`, generates the canvas via
 * RoadmapCanvasGeneratorEngine, and writes to
 * `knowledge/wiki/roadmap.canvas` (relative to repo root). Prints a
 * summary line to stdout for CI / commit-log capture.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { roadmapCanvasGeneratorEngine } from "../src/engines/RoadmapCanvasGeneratorEngine.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROADMAP_INDEX = resolve(HERE, "..", "data", "roadmap-index.json");
const OUTPUT = resolve(HERE, "..", "..", "knowledge", "wiki", "roadmap.canvas");

const { result, written } = roadmapCanvasGeneratorEngine.generateFromFile(
  ROADMAP_INDEX,
  OUTPUT
);

const summary = {
  paginated: result.paginated,
  totalBytes: result.totalBytes,
  warnings: result.warnings,
  stats: result.stats,
  written,
};
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
