/**
 * Index Roadmap Outputs
 *
 * Scans a roadmap and catalogs all deliverables for tracking.
 * Can be run retroactively on any roadmap -- complete or partial.
 *
 * Pure utility module with no side effects. All functions accept
 * a validated RoadmapEnvelope and return analysis results.
 *
 * Exports:
 *   scanRoadmapDeliverables()  -- flat list of all deliverables with location context
 *   groupByType()              -- group deliverables by their type classification
 *   findOrphanedDeliverables() -- detect file paths in steps not tracked as deliverables
 *   indexRoadmapOutputs()      -- orchestrator returning full IndexResult
 *
 * @module scripts/index-roadmap-outputs
 */

import { z } from 'zod';
import {
  RoadmapEnvelope,
  RoadmapDeliverable,
  validateRoadmap,
} from '../schemas/roadmapSchema.js';

type Envelope = z.infer<typeof RoadmapEnvelope>;
type Deliverable = z.infer<typeof RoadmapDeliverable>;

// ─── Interfaces ───────────────────────────────────────────────────

/** A deliverable annotated with its location in the roadmap hierarchy. */
export interface DeliverableReport {
  /** Relative file path from project root. */
  path: string;
  /** Deliverable type classification (source, test, config, etc.). */
  type: string;
  /** The unit that produces this deliverable, e.g. "P1-U03". */
  unit_id: string;
  /** The phase containing the unit, e.g. "P1". */
  phase_id: string;
  /** Human-readable description of the deliverable. */
  description: string;
}

/** Summary result of indexing all roadmap outputs. */
export interface IndexResult {
  /** Total number of deliverables found across all units. */
  total: number;
  /** Count of deliverables grouped by type. */
  by_type: Record<string, number>;
  /** Full flat list of annotated deliverables. */
  deliverables: DeliverableReport[];
}

// ─── File Path Extraction ─────────────────────────────────────────

/**
 * Regex to extract file-like paths from free-text instruction strings.
 * Matches patterns like:
 *   src/foo/bar.ts
 *   .claude/agents/planner.md
 *   mcp-server/src/schemas/roadmapSchema.ts
 *
 * Requires at least one slash and a dot-extension to reduce false positives.
 */
const FILE_PATH_RE = /(?:^|\s|`|"|')([a-zA-Z0-9._\-/\\]+\/[a-zA-Z0-9._\-/\\]+\.[a-zA-Z0-9]+)/g;

/**
 * Extract candidate file paths from a text string using regex.
 *
 * @param text - Free-form text potentially containing file paths.
 * @returns Array of unique candidate file path strings.
 */
function extractFilePaths(text: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  // Reset lastIndex before iterating
  FILE_PATH_RE.lastIndex = 0;
  while ((match = FILE_PATH_RE.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return [...new Set(matches)];
}

// ─── Core Functions ───────────────────────────────────────────────

/**
 * Scan all phases, units, and deliverables in a roadmap, producing a flat
 * list of DeliverableReport entries with phase/unit context attached.
 *
 * @param roadmap - A validated RoadmapEnvelope.
 * @returns Flat array of all deliverables with location metadata.
 */
export function scanRoadmapDeliverables(roadmap: Envelope): DeliverableReport[] {
  const reports: DeliverableReport[] = [];

  for (const phase of roadmap.phases) {
    for (const unit of phase.units) {
      for (const deliverable of unit.deliverables) {
        reports.push({
          path: deliverable.path,
          type: deliverable.type,
          unit_id: unit.id,
          phase_id: phase.id,
          description: deliverable.description,
        });
      }
    }
  }

  return reports;
}

/**
 * Group an array of DeliverableReport entries by their type field.
 *
 * @param deliverables - Flat array of deliverable reports.
 * @returns Object keyed by type with arrays of matching deliverables.
 */
export function groupByType(
  deliverables: DeliverableReport[],
): Record<string, DeliverableReport[]> {
  const groups: Record<string, DeliverableReport[]> = {};

  for (const d of deliverables) {
    if (!groups[d.type]) {
      groups[d.type] = [];
    }
    groups[d.type].push(d);
  }

  return groups;
}

/**
 * Find file paths mentioned in step instructions that do not appear
 * in any unit's deliverables list. These are potential tracking gaps.
 *
 * Uses regex extraction on each step's instruction text, then checks
 * whether the extracted path exists in the set of known deliverable paths.
 *
 * @param roadmap - A validated RoadmapEnvelope.
 * @returns Array of file paths found in instructions but missing from deliverables.
 */
export function findOrphanedDeliverables(roadmap: Envelope): string[] {
  // Build set of all known deliverable paths
  const knownPaths = new Set<string>();
  for (const phase of roadmap.phases) {
    for (const unit of phase.units) {
      for (const deliverable of unit.deliverables) {
        knownPaths.add(deliverable.path);
      }
    }
  }

  // Collect all file paths mentioned in step instructions
  const mentionedPaths = new Set<string>();
  for (const phase of roadmap.phases) {
    for (const unit of phase.units) {
      for (const step of unit.steps) {
        const paths = extractFilePaths(step.instruction);
        for (const p of paths) {
          mentionedPaths.add(p);
        }
      }
    }
  }

  // Orphans: mentioned in steps but not tracked as deliverables
  const orphaned: string[] = [];
  for (const path of mentionedPaths) {
    if (!knownPaths.has(path)) {
      orphaned.push(path);
    }
  }

  return orphaned.sort();
}

/**
 * Orchestrate a full index of roadmap outputs. Scans deliverables,
 * groups by type, and computes summary counts.
 *
 * @param roadmap - A validated RoadmapEnvelope.
 * @returns IndexResult with total count, per-type counts, and full deliverables list.
 */
export function indexRoadmapOutputs(roadmap: Envelope): IndexResult {
  const deliverables = scanRoadmapDeliverables(roadmap);
  const grouped = groupByType(deliverables);

  const by_type: Record<string, number> = {};
  for (const [type, items] of Object.entries(grouped)) {
    by_type[type] = items.length;
  }

  return {
    total: deliverables.length,
    by_type,
    deliverables,
  };
}
