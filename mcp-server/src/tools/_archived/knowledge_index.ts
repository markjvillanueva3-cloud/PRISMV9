/** PRISM Knowledge Tools */
export const knowledgeTools = [
  { name: 'prism_skill_list', description: 'List available skills', inputSchema: { type: 'object', properties: { category: { type: 'string' }, search: { type: 'string' } } } },
  { name: 'prism_skill_load', description: 'Load skill content', inputSchema: { type: 'object', required: ['skill_name'], properties: { skill_name: { type: 'string' }, section: { type: 'string' } } } },
  { name: 'prism_skill_search', description: 'Search skill content', inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, limit: { type: 'integer' } } } },
  { name: 'prism_module_list', description: 'List extracted modules', inputSchema: { type: 'object', properties: { category: { type: 'string' } } } },
  { name: 'prism_module_load', description: 'Load module content', inputSchema: { type: 'object', required: ['module_name'], properties: { module_name: { type: 'string' } } } },
  { name: 'prism_module_search', description: 'Search module content', inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string' } } } },
  { name: 'prism_knowledge_query', description: 'Query knowledge base', inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, kb: { type: 'string' } } } },
  { name: 'prism_algorithm_lookup', description: 'Look up algorithm details', inputSchema: { type: 'object', required: ['algorithm'], properties: { algorithm: { type: 'string' } } } },
  { name: 'prism_pattern_lookup', description: 'Look up design pattern', inputSchema: { type: 'object', required: ['pattern'], properties: { pattern: { type: 'string' } } } },
  { name: 'prism_example_get', description: 'Get code example', inputSchema: { type: 'object', required: ['topic'], properties: { topic: { type: 'string' }, language: { type: 'string' } } } },
];
export default knowledgeTools;
