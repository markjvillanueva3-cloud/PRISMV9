/**
 * PRISM Data Enhancement Tools
 * ============================
 */

export const dataEnhancementTools = [
  {
    name: 'prism_material_add',
    description: 'Add new material to USER layer',
    inputSchema: {
      type: 'object',
      required: ['material'],
      properties: {
        material: { type: 'object', description: 'Material data following schema' },
        layer: { type: 'string', enum: ['USER', 'LEARNED'] },
        validate: { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'prism_material_enhance',
    description: 'Add parameters to existing material',
    inputSchema: {
      type: 'object',
      required: ['material_id', 'enhancements'],
      properties: {
        material_id: { type: 'string' },
        enhancements: { type: 'object' },
        source: { type: 'string' },
      },
    },
  },
  {
    name: 'prism_material_correct',
    description: 'Correct erroneous material data with audit trail',
    inputSchema: {
      type: 'object',
      required: ['material_id', 'corrections', 'reason'],
      properties: {
        material_id: { type: 'string' },
        corrections: { type: 'object' },
        reason: { type: 'string' },
        evidence: { type: 'string' },
      },
    },
  },
  {
    name: 'prism_material_import',
    description: 'Bulk import materials from CSV/JSON/Excel',
    inputSchema: {
      type: 'object',
      required: ['source'],
      properties: {
        source: { type: 'string' },
        format: { type: 'string', enum: ['json', 'csv', 'excel'] },
        mapping: { type: 'object' },
        validate_all: { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'prism_machine_add',
    description: 'Add new machine to database',
    inputSchema: {
      type: 'object',
      required: ['machine'],
      properties: {
        machine: { type: 'object' },
        layer: { type: 'string', enum: ['ENHANCED', 'LEVEL5'] },
      },
    },
  },
  {
    name: 'prism_machine_enhance',
    description: 'Enhance machine with additional specs',
    inputSchema: {
      type: 'object',
      required: ['machine_id', 'enhancements'],
      properties: {
        machine_id: { type: 'string' },
        enhancements: { type: 'object' },
      },
    },
  },
  {
    name: 'prism_machine_import_cad',
    description: 'Import machine CAD model for LEVEL5 kinematics',
    inputSchema: {
      type: 'object',
      required: ['machine_id', 'cad_file'],
      properties: {
        machine_id: { type: 'string' },
        cad_file: { type: 'string' },
        extract_kinematics: { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'prism_tool_add',
    description: 'Add cutting tool to database',
    inputSchema: {
      type: 'object',
      required: ['tool'],
      properties: {
        tool: { type: 'object' },
      },
    },
  },
  {
    name: 'prism_alarm_add',
    description: 'Add controller alarm to database',
    inputSchema: {
      type: 'object',
      required: ['alarm'],
      properties: {
        alarm: { type: 'object' },
      },
    },
  },
  {
    name: 'prism_alarm_enhance',
    description: 'Add fix procedure to existing alarm',
    inputSchema: {
      type: 'object',
      required: ['alarm_id'],
      properties: {
        alarm_id: { type: 'string' },
        detailed_fix: { type: 'array' },
        related_alarms: { type: 'array' },
      },
    },
  },
  {
    name: 'prism_fixture_add',
    description: 'Add fixture to database',
    inputSchema: {
      type: 'object',
      required: ['fixture'],
      properties: {
        fixture: { type: 'object' },
      },
    },
  },
  {
    name: 'prism_formula_add',
    description: 'Add formula to database',
    inputSchema: {
      type: 'object',
      required: ['formula'],
      properties: {
        formula: { type: 'object' },
      },
    },
  },
];

export default dataEnhancementTools;
