/** PRISM Geometry/CAD Tools */
export const geometryTools = [
  { name: 'prism_nurbs_eval', description: 'Evaluate NURBS curve/surface', inputSchema: { type: 'object', required: ['nurbs_data', 'parameter'], properties: { nurbs_data: { type: 'object' }, parameter: { type: 'array' } } } },
  { name: 'prism_collision_check', description: 'Check for collisions', inputSchema: { type: 'object', required: ['toolpath', 'machine_id'], properties: { toolpath: { type: 'array' }, machine_id: { type: 'string' }, workpiece: { type: 'object' } } } },
  { name: 'prism_mesh_generate', description: 'Generate mesh from geometry', inputSchema: { type: 'object', required: ['geometry'], properties: { geometry: { type: 'object' }, resolution: { type: 'number' } } } },
  { name: 'prism_step_parse', description: 'Parse STEP file', inputSchema: { type: 'object', required: ['file_path'], properties: { file_path: { type: 'string' } } } },
  { name: 'prism_toolpath_verify', description: 'Verify toolpath validity', inputSchema: { type: 'object', required: ['toolpath'], properties: { toolpath: { type: 'array' }, machine_id: { type: 'string' } } } },
  { name: 'prism_stock_simulate', description: 'Simulate material removal', inputSchema: { type: 'object', required: ['toolpath', 'stock'], properties: { toolpath: { type: 'array' }, stock: { type: 'object' }, tool_id: { type: 'string' } } } },
  { name: 'prism_feature_recognize', description: 'Recognize machining features', inputSchema: { type: 'object', required: ['geometry'], properties: { geometry: { type: 'object' } } } },
  { name: 'prism_csg_operation', description: 'Perform CSG operation', inputSchema: { type: 'object', required: ['operation', 'operands'], properties: { operation: { type: 'string' }, operands: { type: 'array' } } } },
];
export default geometryTools;
