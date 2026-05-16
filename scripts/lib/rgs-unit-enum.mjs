/**
 * rgs-unit-enum.mjs
 * Enumerates every OPEN (not-yet-shipped) roadmap unit across all milestone envelopes.
 *
 * Real data shapes found (verified 2026-05-15):
 *   - 384 envelopes: envelope.phases[].units[]  (phases take precedence when BOTH present)
 *   - 254 envelopes: envelope.units[]           (top-level, no phases)
 *   -   7 envelopes: BOTH phases and top-level units → phases win
 *   -  56 envelopes: neither → skipped
 *   Total: 694 envelope files
 *
 * Progress shape: state/shared/MILESTONE_PROGRESS.json
 *   { milestones: [{ id, units: [{ id, shipped:bool }] }] }
 *
 * Composite key: `${envelope.id}::${unit.id}`  — synthesized, never read from a field.
 * "::" is collision-safe (no ":" chars in real envelope ids verified by survey).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

// ── Core pure function ────────────────────────────────────────────────────────

/**
 * @typedef {{ id:string, title:string, description:string, effort:number, dependencies:string[] }} UnitSpec
 * @typedef {{ id:string, phases?:Array<{units?:UnitSpec[]}>, units?:UnitSpec[] }} Envelope
 * @typedef {{ milestones: Array<{ id:string, units?: Array<{id:string, shipped:boolean}> }> }} Progress
 *
 * @param {{ envelopes: Record<string,Envelope>, progress: Progress }} opts
 * @returns {Array<{ key:string, milestone:string, unitId:string, title:string, description:string, effort:number, dependencies:string[] }>}
 */
export function enumerateOpenUnits({ envelopes, progress }) {
  // Build a fast lookup: milestoneId → Map<unitId, shipped:bool>
  const shippedMap = new Map();
  for (const ms of (progress.milestones ?? [])) {
    const unitMap = new Map();
    for (const u of (ms.units ?? [])) {
      unitMap.set(u.id, u.shipped === true);
    }
    shippedMap.set(ms.id, unitMap);
  }

  const result = [];

  for (const envelope of Object.values(envelopes)) {
    const msId = envelope.id;
    if (!msId) continue;

    // Collect units: phases[].units[] takes precedence over top-level units[]
    const units = collectUnits(envelope);
    if (units.length === 0) continue;

    const unitMap = shippedMap.get(msId) ?? new Map();

    for (const unit of units) {
      const unitId = unit.id;
      if (!unitId) continue;

      // Open = row missing entirely, OR shipped !== true
      const shipped = unitMap.has(unitId) ? unitMap.get(unitId) : false;
      if (shipped === true) continue;

      result.push({
        key:          `${msId}::${unitId}`,
        milestone:    msId,
        unitId,
        title:        unit.title       ?? "",
        description:  unit.description ?? "",
        effort:       unit.effort      ?? 0,
        dependencies: unit.dependencies ?? [],
      });
    }
  }

  return result;
}

/**
 * Collect all unit specs from an envelope.
 * Strategy: if envelope has non-empty phases[], gather units from every phase.
 * Otherwise fall back to top-level units[].
 * @param {Envelope} envelope
 * @returns {UnitSpec[]}
 */
function collectUnits(envelope) {
  const phases = envelope.phases;
  if (Array.isArray(phases) && phases.length > 0) {
    const units = [];
    for (const phase of phases) {
      if (Array.isArray(phase.units)) {
        units.push(...phase.units);
      }
    }
    // If phases existed but had no units at all, fall through to top-level
    if (units.length > 0) return units;
  }
  // Top-level units[] fallback
  if (Array.isArray(envelope.units)) {
    return envelope.units;
  }
  return [];
}

// ── File readers ─────────────────────────────────────────────────────────────

/**
 * Load all envelope JSON files from a directory.
 * Parse failures are warned to stderr and skipped — never throws.
 * @param {string} [dir] absolute or repo-relative path to milestones directory
 * @returns {Record<string, Envelope>}
 */
export function loadEnvelopes(dir = "mcp-server/data/milestones") {
  const absDir = path.isAbsolute(dir) ? dir : path.join(REPO_ROOT, dir);
  const envelopes = {};

  let files;
  try {
    files = fs.readdirSync(absDir);
  } catch (err) {
    process.stderr.write(`[rgs-unit-enum] Cannot read milestones dir ${absDir}: ${err.message}\n`);
    return envelopes;
  }

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const filePath = path.join(absDir, file);
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const envelope = JSON.parse(raw);
      if (envelope && typeof envelope.id === "string") {
        envelopes[envelope.id] = envelope;
      } else {
        // Envelope without an id field — use filename stem as fallback key
        const stem = file.replace(/\.json$/, "");
        process.stderr.write(`[rgs-unit-enum] Envelope in ${file} has no id field, using filename stem "${stem}"\n`);
        envelopes[stem] = { id: stem, ...envelope };
      }
    } catch (err) {
      process.stderr.write(`[rgs-unit-enum] Skipping ${file}: ${err.message}\n`);
    }
  }

  return envelopes;
}

/**
 * Load MILESTONE_PROGRESS.json.
 * Returns empty progress on missing/corrupt file — never throws.
 * @param {string} [p] absolute or repo-relative path
 * @returns {Progress}
 */
export function loadProgress(p = "state/shared/MILESTONE_PROGRESS.json") {
  const absPath = path.isAbsolute(p) ? p : path.join(REPO_ROOT, p);
  try {
    const raw = fs.readFileSync(absPath, "utf8");
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.milestones)) return data;
    process.stderr.write(`[rgs-unit-enum] MILESTONE_PROGRESS.json has unexpected shape, returning empty\n`);
    return { milestones: [] };
  } catch (err) {
    process.stderr.write(`[rgs-unit-enum] Cannot load progress from ${absPath}: ${err.message}\n`);
    return { milestones: [] };
  }
}
