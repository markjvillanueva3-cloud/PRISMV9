/** PRISM AI/ML Tools */
export const aimlTools = [
  { name: 'prism_optimizer_select', description: 'Select optimal optimizer', inputSchema: { type: 'object', required: ['problem_type'], properties: { problem_type: { type: 'string' }, constraints: { type: 'array' }, objectives: { type: 'array' } } } },
  { name: 'prism_optimizer_run', description: 'Run optimization', inputSchema: { type: 'object', required: ['optimizer', 'objective'], properties: { optimizer: { type: 'string' }, objective: { type: 'object' }, constraints: { type: 'array' }, max_iterations: { type: 'integer' } } } },
  { name: 'prism_ml_predict', description: 'Make ML prediction', inputSchema: { type: 'object', required: ['model', 'features'], properties: { model: { type: 'string' }, features: { type: 'object' } } } },
  { name: 'prism_ml_train', description: 'Train ML model', inputSchema: { type: 'object', required: ['model_type', 'training_data'], properties: { model_type: { type: 'string' }, training_data: { type: 'array' }, hyperparameters: { type: 'object' } } } },
  { name: 'prism_bayesian_update', description: 'Update Bayesian model', inputSchema: { type: 'object', required: ['prior', 'evidence'], properties: { prior: { type: 'object' }, evidence: { type: 'object' } } } },
  { name: 'prism_xai_explain', description: 'Explain model prediction', inputSchema: { type: 'object', required: ['model', 'prediction'], properties: { model: { type: 'string' }, prediction: { type: 'object' } } } },
  { name: 'prism_ensemble_predict', description: 'Ensemble prediction', inputSchema: { type: 'object', required: ['models', 'features'], properties: { models: { type: 'array' }, features: { type: 'object' }, aggregation: { type: 'string' } } } },
  { name: 'prism_pattern_match', description: 'Pattern matching', inputSchema: { type: 'object', required: ['pattern', 'data'], properties: { pattern: { type: 'object' }, data: { type: 'array' } } } },
];
export default aimlTools;
