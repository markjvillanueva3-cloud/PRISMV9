/**
 * PRISM MCP Server - Effort Tier Configuration
 * Type-safe, exhaustive mapping of dispatcher actions to reasoning depth.
 * 
 * SAFETY RULE: Unknown actions default to 'max' (deepest reasoning).
 * In safety-critical systems, over-reasoning is safe; under-reasoning is dangerous.
 * 
 * @module config/effortTiers
 * @safety CRITICAL — Controls reasoning depth for safety calculations.
 */

export const EFFORT_LEVELS = ['max', 'high', 'medium', 'low'] as const;
export type EffortLevel = typeof EFFORT_LEVELS[number];

/**
 * Union type of all known dispatcher actions.
 * Adding an action here WITHOUT adding to EFFORT_MAP causes a compile error.
 * This is INTENTIONAL — forces conscious effort-level decisions.
 */
export type ActionName =
  // MAX — Lives depend on correctness
  | 'safety' | 'cutting_force' | 'speed_feed' | 'tool_life' | 'spindle_speed'
  | 'ralph_loop' | 'ralph_assess' | 'omega_compute'
  | 'toolpath' | 'strategy_select' | 'pfp_analyze'
  // HIGH — Data retrieval with reasoning
  | 'material_get' | 'material_search' | 'alarm_decode' | 'thread_specs' | 'tap_drill' | 'gcode'
  | 'knowledge_search' | 'code_search' | 'brainstorm' | 'plan'
  | 'swarm_execute' | 'scrutinize'
  // MEDIUM — Operational tasks
  | 'build' | 'skill_find_for_task' | 'hook_coverage' | 'hook_register'
  | 'agent_execute' | 'nl_hook_create' | 'compliance_check'
  | 'pattern_scan' | 'generate_hook' | 'list_templates' | 'auto_plan'
  // LOW — Pure reads/writes
  | 'health' | 'list' | 'stats' | 'bridge_health' | 'context_monitor_check'
  | 'state_save' | 'state_load' | 'todo_update' | 'file_read' | 'file_write'
  | 'task_list' | 'task_init' | 'memory_store' | 'memory_recall' | 'gsd_quick'
  | 'lkg_status' | 'swarm_status' | 'swarm_patterns' | 'list_agents'
  | 'get_anomalies' | 'record_event' | 'script_list' | 'skill_stats_v2'
  | 'skill_load' | 'quick' | 'status';

/**
 * Exhaustive effort mapping. The 'satisfies' keyword ensures every ActionName has an entry.
 * Missing an action = TypeScript compile error, not a silent runtime default.
 */
export const EFFORT_MAP: Record<ActionName, EffortLevel> = {
  // MAX — Safety-critical calculations and quality gates
  safety: 'max',
  cutting_force: 'max',
  speed_feed: 'max',
  tool_life: 'max',
  spindle_speed: 'max',
  ralph_loop: 'max',
  ralph_assess: 'max',
  omega_compute: 'max',
  toolpath: 'max',
  strategy_select: 'max',
  pfp_analyze: 'max',

  // HIGH — Data retrieval with reasoning
  material_get: 'high',
  material_search: 'high',
  alarm_decode: 'high',
  thread_specs: 'high',
  tap_drill: 'high',
  gcode: 'high',
  knowledge_search: 'high',
  code_search: 'high',
  brainstorm: 'high',
  plan: 'high',
  swarm_execute: 'high',
  scrutinize: 'high',

  // MEDIUM — Operational tasks
  build: 'medium',
  skill_find_for_task: 'medium',
  hook_coverage: 'medium',
  hook_register: 'medium',
  agent_execute: 'medium',
  nl_hook_create: 'medium',
  compliance_check: 'medium',
  pattern_scan: 'medium',
  generate_hook: 'medium',
  list_templates: 'medium',
  auto_plan: 'medium',

  // LOW — Pure reads/writes/status checks
  health: 'low',
  list: 'low',
  stats: 'low',
  bridge_health: 'low',
  context_monitor_check: 'low',
  state_save: 'low',
  state_load: 'low',
  todo_update: 'low',
  file_read: 'low',
  file_write: 'low',
  task_list: 'low',
  task_init: 'low',
  memory_store: 'low',
  memory_recall: 'low',
  gsd_quick: 'low',
  lkg_status: 'low',
  swarm_status: 'low',
  swarm_patterns: 'low',
  list_agents: 'low',
  get_anomalies: 'low',
  record_event: 'low',
  script_list: 'low',
  skill_stats_v2: 'low',
  skill_load: 'low',
  quick: 'low',
  status: 'low',
} satisfies Record<ActionName, EffortLevel>;

/**
 * Runtime effort resolver with safe fallback.
 * Returns 'max' for unknown actions — over-reasoning is safe, under-reasoning is dangerous.
 */
export function getEffort(action: string): EffortLevel {
  if (action in EFFORT_MAP) return EFFORT_MAP[action as ActionName];
  console.error(`[PRISM] Unknown action "${action}" — defaulting to MAX (safety-critical fallback)`);
  return 'max';
}

/**
 * Boot-time action audit.
 * Logs warnings for any registered actions not in EFFORT_MAP.
 * Run once at server startup for visibility.
 */
export function auditEffortMap(registeredActions: string[]): void {
  const mapped = new Set(Object.keys(EFFORT_MAP));
  for (const action of registeredActions) {
    if (!mapped.has(action)) {
      console.warn(`[PRISM BOOT] Action "${action}" has no effort mapping — will default to MAX`);
    }
  }
}
