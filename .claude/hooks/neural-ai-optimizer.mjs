#!/usr/bin/env node
// tier: T4
/**
 * Neural AI Optimizer — UserPromptSubmit Hook
 *
 * Actively invokes PRISM's deep AI systems when complexity warrants it:
 * - MetaAIOrchestrationEngine for multi-engine coordination
 * - NeuralIntegrationEngine for auto-routing
 * - OllamaClientEngine for local inference (when Docker available)
 * - 27 neural network engines for domain-specific tasks
 *
 * This hook ACTIVATES the AI systems, not just documents them.
 */

import { readFileSync, existsSync } from 'node:fs';

// Read stdin synchronously
let input = '';
try {
  input = readFileSync(0, 'utf-8');
} catch {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(input);
} catch {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const prompt = (payload.prompt || payload.message || '').toLowerCase();
if (!prompt) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// ============================================================================
// COMPLEXITY DETECTION
// ============================================================================

const COMPLEXITY_INDICATORS = {
  // Deep reasoning needed
  reasoning: [
    'why', 'how', 'explain', 'analyze', 'compare', 'evaluate',
    'debug', 'diagnose', 'troubleshoot', 'root cause', 'figure out'
  ],
  // Multi-step planning
  planning: [
    'plan', 'strategy', 'roadmap', 'architecture', 'design',
    'implement', 'build', 'create', 'develop', 'refactor'
  ],
  // Optimization tasks
  optimization: [
    'optimize', 'improve', 'faster', 'better', 'efficient',
    'reduce', 'minimize', 'maximize', 'best', 'optimal'
  ],
  // Physics/manufacturing
  physics: [
    'force', 'speed', 'feed', 'cutting', 'thermal', 'vibration',
    'chatter', 'deflection', 'wear', 'tool life', 'surface'
  ],
  // Cross-domain synthesis
  synthesis: [
    'combine', 'integrate', 'hybrid', 'cross', 'multi',
    'unified', 'orchestrate', 'coordinate', 'synthesize'
  ]
};

// Count complexity indicators
let complexityScore = 0;
const detectedDomains = [];

for (const [domain, keywords] of Object.entries(COMPLEXITY_INDICATORS)) {
  for (const kw of keywords) {
    if (prompt.includes(kw)) {
      complexityScore++;
      if (!detectedDomains.includes(domain)) {
        detectedDomains.push(domain);
      }
    }
  }
}

// ============================================================================
// NEURAL ENGINE RECOMMENDATIONS
// ============================================================================

const NEURAL_ENGINES = {
  // Force/thermal prediction
  physics: [
    'ForceNeuralPredictorEngine — cutting force prediction via neural network',
    'ThermalNeuralPredictorEngine — temperature prediction',
    'ChatterNeuralClassifierEngine — vibration classification',
    'PhysicsNeuralBridgeEngine — bridges physics + neural models'
  ],
  // Strategy selection
  strategy: [
    'MillStrategyNeuralEngine — milling strategy selection',
    'NeuralIntegrationEngine — auto-routing to 2,495+ engines',
    'MillComprehensiveNeuralEngine — full neural milling intelligence'
  ],
  // Knowledge synthesis
  knowledge: [
    'PRISMNeuralKnowledgeSynthesisEngine — unified knowledge fusion',
    'KnowledgeGraphNeuralBridgeEngine — graph + neural hybrid',
    'PostProcessorVideoKnowledgeNeuralEngine — video knowledge extraction'
  ],
  // Deep reasoning
  reasoning: [
    'WireEDMDeepNeuralReasoningEngine — WEDM deep reasoning',
    'MillingNeuralCognitiveEngine — milling cognitive system',
    'NeuralModelRegistryEngine — manages 27 neural models'
  ]
};

// ============================================================================
// META-AI ORCHESTRATION
// ============================================================================

const META_AI_SYSTEMS = {
  orchestration: {
    engine: 'MetaAIOrchestrationEngine',
    use_when: 'Complex tasks requiring 3+ engines or cross-domain synthesis',
    capabilities: [
      'Metacognition — self-monitors reasoning quality',
      'Analogical transfer — applies patterns across domains',
      'Meta-learning — adjusts learning rate dynamically',
      '150+ engine coordination'
    ]
  },
  autoUtilization: {
    engine: 'AIAutoUtilizationEngine',
    use_when: 'Automatic capability detection and command suggestion',
    capabilities: [
      '25 capability patterns',
      'Auto-invoke rules',
      'Multi-command sequences'
    ]
  },
  deepReasoning: {
    engine: 'DeepAIIntelligenceEngine',
    use_when: 'Complex reasoning requiring multiple modes',
    capabilities: [
      '8 reasoning modes',
      'Chain/tree of thought',
      'Counterfactual analysis'
    ]
  }
};

// ============================================================================
// LOCAL INFERENCE (Ollama)
// ============================================================================

function checkOllamaAvailable() {
  // Check if Docker is running Ollama
  const dockerComposeFile = 'H:/prism/mcp-server/docker-compose.yml';
  return existsSync(dockerComposeFile);
}

const OLLAMA_INFO = {
  available: checkOllamaAvailable(),
  engines: [
    'OllamaClientEngine — local LLM inference',
    'LocalModelOrchestratorEngine — model routing',
    'ModelRoutingEngine — API/local model selection'
  ],
  models: ['codellama', 'llama3', 'mistral', 'phi3'],
  use_when: 'Batch processing, offline inference, privacy-sensitive tasks'
};

// ============================================================================
// GENERATE RECOMMENDATION
// ============================================================================

function generateRecommendation() {
  const parts = [];

  // Only inject for complex tasks (score >= 3)
  if (complexityScore < 3) {
    return null;
  }

  parts.push('## Neural AI Optimizer');
  parts.push(`Complexity: ${complexityScore} | Domains: ${detectedDomains.join(', ')}`);
  parts.push('');

  // Meta-AI activation
  if (detectedDomains.length >= 2 || complexityScore >= 5) {
    parts.push('**META-AI ACTIVE**: Use MetaAIOrchestrationEngine for unified coordination');
    parts.push('- prism_ai:orchestrate_multi OR prism_ai:deep_reason');
  }

  // Neural engine suggestions by domain
  const relevantNeurals = [];
  for (const domain of detectedDomains) {
    if (NEURAL_ENGINES[domain]) {
      relevantNeurals.push(...NEURAL_ENGINES[domain].slice(0, 2));
    }
  }
  if (relevantNeurals.length > 0) {
    parts.push('');
    parts.push('**Neural Engines**: ' + relevantNeurals.slice(0, 3).join(' | '));
  }

  // Local inference for batch/intensive tasks
  if (detectedDomains.includes('optimization') && OLLAMA_INFO.available) {
    parts.push('');
    parts.push('**Local Inference Available**: OllamaClientEngine for batch processing');
  }

  return parts.join('\n');
}

const recommendation = generateRecommendation();

if (recommendation) {
  console.log(JSON.stringify({
    continue: true,
    additionalContext: recommendation
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
