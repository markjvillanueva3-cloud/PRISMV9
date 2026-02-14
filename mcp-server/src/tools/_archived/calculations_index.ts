/**
 * PRISM Calculation Tools
 * =======================
 */

export const calculationTools = [
  { name: 'prism_formula_calc', description: 'Execute a formula calculation', inputSchema: { type: 'object', required: ['formula_id', 'inputs'], properties: { formula_id: { type: 'string' }, inputs: { type: 'object' }, units: { type: 'object' } } } },
  { name: 'prism_speed_feed', description: 'Calculate optimal speed and feed', inputSchema: { type: 'object', required: ['material_id', 'tool_id', 'operation'], properties: { material_id: { type: 'string' }, tool_id: { type: 'string' }, machine_id: { type: 'string' }, operation: { type: 'string' }, doc: { type: 'number' }, woc: { type: 'number' }, optimize_for: { type: 'string' } } } },
  { name: 'prism_cutting_force', description: 'Calculate cutting forces (Kienzle)', inputSchema: { type: 'object', required: ['material_id', 'doc', 'feed'], properties: { material_id: { type: 'string' }, doc: { type: 'number' }, feed: { type: 'number' }, rake_angle: { type: 'number' }, wear_factor: { type: 'number' } } } },
  { name: 'prism_tool_life', description: 'Predict tool life (Taylor)', inputSchema: { type: 'object', required: ['material_id', 'tool_id', 'cutting_speed'], properties: { material_id: { type: 'string' }, tool_id: { type: 'string' }, cutting_speed: { type: 'number' }, feed: { type: 'number' }, doc: { type: 'number' } } } },
  { name: 'prism_thermal_calc', description: 'Calculate cutting temperature', inputSchema: { type: 'object', required: ['material_id', 'cutting_speed', 'feed'], properties: { material_id: { type: 'string' }, cutting_speed: { type: 'number' }, feed: { type: 'number' }, doc: { type: 'number' }, coolant: { type: 'string' } } } },
  { name: 'prism_cycle_time', description: 'Estimate machining cycle time', inputSchema: { type: 'object', required: ['operations'], properties: { operations: { type: 'array' }, machine_id: { type: 'string' }, tool_changes: { type: 'integer' } } } },
  { name: 'prism_cost_estimate', description: 'Estimate machining cost', inputSchema: { type: 'object', required: ['cycle_time', 'machine_id'], properties: { cycle_time: { type: 'number' }, machine_id: { type: 'string' }, tool_costs: { type: 'array' }, material_cost: { type: 'number' }, setup_time: { type: 'number' }, quantity: { type: 'integer' } } } },
  { name: 'prism_stability_lobe', description: 'Generate stability lobe diagram', inputSchema: { type: 'object', required: ['tool_id', 'machine_id'], properties: { tool_id: { type: 'string' }, machine_id: { type: 'string' }, material_id: { type: 'string' }, rpm_range: { type: 'array' } } } },
  { name: 'prism_deflection_calc', description: 'Calculate tool deflection', inputSchema: { type: 'object', required: ['tool_id', 'cutting_force', 'overhang'], properties: { tool_id: { type: 'string' }, cutting_force: { type: 'number' }, overhang: { type: 'number' } } } },
  { name: 'prism_surface_finish', description: 'Predict achievable surface finish', inputSchema: { type: 'object', required: ['tool_id', 'feed_per_rev'], properties: { tool_id: { type: 'string' }, feed_per_rev: { type: 'number' }, material_id: { type: 'string' } } } },
  { name: 'prism_chip_load', description: 'Calculate chip load parameters', inputSchema: { type: 'object', required: ['feed_rate', 'rpm', 'flutes'], properties: { feed_rate: { type: 'number' }, rpm: { type: 'number' }, flutes: { type: 'integer' } } } },
  { name: 'prism_power_consumption', description: 'Calculate spindle power consumption', inputSchema: { type: 'object', required: ['material_id', 'mrr'], properties: { material_id: { type: 'string' }, mrr: { type: 'number' }, efficiency: { type: 'number' } } } },
];

export { handleCalculation } from './handlers.js';
export default calculationTools;
