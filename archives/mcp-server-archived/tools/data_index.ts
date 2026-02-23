/**
 * PRISM Data Access Tools
 * =======================
 * MCP tool definitions for data retrieval
 */

export const dataAccessTools = [
  {
    name: 'prism_material_get',
    description: 'Get material by ID or name with full 127-parameter detail',
    inputSchema: {
      type: 'object',
      required: ['identifier'],
      properties: {
        identifier: { type: 'string', description: 'Material ID or common name' },
        fields: { type: 'array', items: { type: 'string' }, description: 'Specific fields to return' },
        layer: { type: 'string', enum: ['CORE', 'ENHANCED', 'USER', 'LEARNED'] },
      },
    },
  },
  {
    name: 'prism_material_search',
    description: 'Search materials by ISO group, category, hardness, or machinability',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free text search' },
        iso_group: { type: 'string', enum: ['P', 'M', 'K', 'N', 'S', 'H', 'X'] },
        category: { type: 'string' },
        hardness_min: { type: 'number' },
        hardness_max: { type: 'number' },
        machinability_min: { type: 'number' },
        limit: { type: 'integer', default: 20 },
      },
    },
  },
  {
    name: 'prism_material_compare',
    description: 'Compare multiple materials side-by-side',
    inputSchema: {
      type: 'object',
      required: ['material_ids'],
      properties: {
        material_ids: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 },
        properties: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'prism_machine_get',
    description: 'Get CNC machine by ID or model',
    inputSchema: {
      type: 'object',
      required: ['identifier'],
      properties: {
        identifier: { type: 'string' },
        layer: { type: 'string', enum: ['BASIC', 'CORE', 'ENHANCED', 'LEVEL5'] },
      },
    },
  },
  {
    name: 'prism_machine_search',
    description: 'Search machines by manufacturer, type, or specifications',
    inputSchema: {
      type: 'object',
      properties: {
        manufacturer: { type: 'string' },
        type: { type: 'string' },
        controller: { type: 'string' },
        min_x_travel: { type: 'number' },
        min_spindle_rpm: { type: 'number' },
        limit: { type: 'integer', default: 20 },
      },
    },
  },
  {
    name: 'prism_tool_get',
    description: 'Get cutting tool by ID',
    inputSchema: {
      type: 'object',
      required: ['tool_id'],
      properties: {
        tool_id: { type: 'string' },
      },
    },
  },
  {
    name: 'prism_tool_search',
    description: 'Search cutting tools by type, diameter, or material compatibility',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        diameter_min: { type: 'number' },
        diameter_max: { type: 'number' },
        material: { type: 'string' },
        material_groups: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'prism_alarm_decode',
    description: 'Decode CNC controller alarm code with causes and quick fix',
    inputSchema: {
      type: 'object',
      required: ['code'],
      properties: {
        code: { type: 'string', description: 'Alarm code (e.g., PS0001, 100)' },
        controller: { type: 'string', description: 'Controller family (auto-detect if omitted)' },
      },
    },
  },
  {
    name: 'prism_alarm_search',
    description: 'Search alarms by keyword, controller, or category',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        controller: { type: 'string' },
        category: { type: 'string' },
        severity: { type: 'string' },
      },
    },
  },
  {
    name: 'prism_fixture_get',
    description: 'Get fixture/workholding by ID',
    inputSchema: {
      type: 'object',
      required: ['fixture_id'],
      properties: {
        fixture_id: { type: 'string' },
      },
    },
  },
  {
    name: 'prism_formula_get',
    description: 'Get manufacturing formula by ID',
    inputSchema: {
      type: 'object',
      required: ['formula_id'],
      properties: {
        formula_id: { type: 'string' },
      },
    },
  },
  {
    name: 'prism_gcode_lookup',
    description: 'Look up G-code or M-code with controller variations',
    inputSchema: {
      type: 'object',
      required: ['code'],
      properties: {
        code: { type: 'string' },
        controller: { type: 'string' },
      },
    },
  },
  {
    name: 'prism_post_get',
    description: 'Get post processor configuration',
    inputSchema: {
      type: 'object',
      required: ['post_id'],
      properties: {
        post_id: { type: 'string' },
      },
    },
  },
  {
    name: 'prism_standard_lookup',
    description: 'Look up manufacturing standard (ISO, ANSI, etc.)',
    inputSchema: {
      type: 'object',
      required: ['standard'],
      properties: {
        standard: { type: 'string' },
      },
    },
  },
  {
    name: 'prism_cross_reference',
    description: 'Cross-reference material/tool/machine compatibility',
    inputSchema: {
      type: 'object',
      properties: {
        material_id: { type: 'string' },
        tool_id: { type: 'string' },
        machine_id: { type: 'string' },
        operation: { type: 'string' },
      },
    },
  },
];

export default dataAccessTools;
