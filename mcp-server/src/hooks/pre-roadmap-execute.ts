/**
 * Pre-Roadmap-Execute Hook
 * Fires BEFORE any roadmap unit is executed.
 * Validates entry conditions, dependencies, tools, skills.
 *
 * Event: roadmap.unit.pre_execute
 * Priority: 1 (runs first)
 */

import { z } from 'zod';
import { RoadmapUnit, RoadmapEnvelope } from '../schemas/roadmapSchema.js';

// Types
type Unit = z.infer<typeof RoadmapUnit>;
type Envelope = z.infer<typeof RoadmapEnvelope>;

export interface PositionTracker {
  roadmap_id: string;
  current_unit: string;
  last_completed_unit: string | null;
  units_completed: number;
  total_units: number;
  percent_complete: number;
  status: 'IN_PROGRESS' | 'GATE_PENDING' | 'COMPLETE' | 'BLOCKED';
  history: Array<{ unit_id: string; completed_at: string; build_status: boolean }>;
}

export interface PreExecuteResult {
  proceed: boolean;
  blockers: string[];
}

// Known tool prefixes (32 dispatchers)
const KNOWN_TOOL_PREFIXES = [
  'prism_omega', 'prism_ralph', 'prism_dev', 'prism_sp', 'prism_guard',
  'prism_session', 'prism_skill_script', 'prism_knowledge', 'prism_hook',
  'prism_validate', 'prism_intelligence', 'prism_prompt', 'prism_mfg',
  'prism_memory', 'prism_health', 'prism_metrics', 'prism_cost',
  'prism_cadence', 'prism_config', 'prism_state', 'prism_model',
  'prism_safety', 'prism_cli', 'prism_tool', 'prism_admin',
  'prism_checkpoint', 'prism_auth', 'prism_telemetry', 'prism_circuit',
  'prism_rate', 'prism_audit', 'prism_cache', 'prism_debug'
];

/**
 * Validate that a unit is ready to execute.
 * Checks: entry conditions, dependencies, tools, skills.
 */
export function validatePreExecution(
  unit: Unit,
  position: PositionTracker,
  roadmap: Envelope
): PreExecuteResult {
  const blockers: string[] = [];

  // 1. Check entry conditions
  // Entry conditions are strings -- we can't auto-evaluate them,
  // but we can check they exist
  if (!unit.entry_conditions || unit.entry_conditions.length === 0) {
    blockers.push(`Unit ${unit.id}: no entry conditions defined`);
  }

  // 2. Check dependencies are COMPLETE in position
  if (unit.dependencies && unit.dependencies.length > 0) {
    const completedIds = new Set(position.history.map(h => h.unit_id));
    for (const depId of unit.dependencies) {
      if (!completedIds.has(depId)) {
        blockers.push(`Unit ${unit.id}: dependency ${depId} not yet completed`);
      }
    }
  }

  // 3. Check tools exist (validate against known prefixes)
  if (unit.tools && unit.tools.length > 0) {
    for (const toolRef of unit.tools) {
      const toolName = toolRef.tool;
      const isKnown = KNOWN_TOOL_PREFIXES.some(prefix => toolName.startsWith(prefix));
      const isDesktopCommander = toolName.toLowerCase().includes('desktop commander');
      if (!isKnown && !isDesktopCommander) {
        blockers.push(`Unit ${unit.id}: unknown tool "${toolName}"`);
      }
    }
  }

  // 4. Check skills exist (basic validation -- skill IDs should be non-empty strings)
  if (unit.skills && unit.skills.length > 0) {
    for (const skillId of unit.skills) {
      if (!skillId || skillId.trim() === '') {
        blockers.push(`Unit ${unit.id}: empty skill reference`);
      }
    }
  }

  // 5. Check position status
  if (position.status === 'BLOCKED') {
    blockers.push(`Roadmap ${position.roadmap_id} is in BLOCKED status`);
  }
  if (position.status === 'GATE_PENDING') {
    blockers.push(`Roadmap ${position.roadmap_id} has a pending phase gate -- run gate before continuing`);
  }

  return {
    proceed: blockers.length === 0,
    blockers
  };
}

/** Hook metadata for registration */
export const hookMeta = {
  id: 'pre-roadmap-execute',
  event: 'roadmap.unit.pre_execute',
  handler: validatePreExecution,
  enabled: true,
  priority: 1,
  description: 'Validates entry conditions, deps, tools, skills before unit execution'
};
