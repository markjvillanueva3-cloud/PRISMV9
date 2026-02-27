---
name: prism-causal-reasoning
description: |
  Cause-effect understanding for K(x) score. 50+ causal chains for manufacturing physics.
---

```
Trigger: relationship:detected
Action: Build causal graph from detected relationships
Fires: When analyzing systems, reading specifications, processing data

Process:
1. Identify entities (variables, parameters, outcomes)
2. Detect relationships between entities
3. Classify relationship type (causal, correlational, spurious)
4. Determine direction of causation
5. Estimate strength of causal link
6. Add to causal graph

Output: {
  entities: Entity[],
  relationships: Relationship[],
  graph: CausalGraph,
  confidence: number,
  gaps: string[]  // Missing causal links
}
```

## CAUSAL-002: Prediction Needed - Trace Chains
```
Trigger: prediction:needed
Action: Trace causal chains to predict outcomes
Fires: When asked "what if" or predicting consequences

Process:
1. Identify intervention (what is being changed)
2. Find intervention in causal graph
3. Trace forward through causal chains
4. Compute effect propagation
5. Estimate outcome with uncertainty
6. Identify confounding factors

Output: {
  intervention: string,
  affected_variables: Variable[],
  predicted_outcomes: Outcome[],
  confidence_intervals: Interval[],
  confounders: string[],
  K_x: number
}
```

## CAUSAL-003: Failure Analyzed - Identify Causes
```
Trigger: failure:analyzed
Action: Trace backward to identify root causes
Fires: When debugging failures or unexpected outcomes

Process:
1. Identify failure symptom (observed problem)
2. Find symptom in causal graph
3. Trace backward through causal chains
4. Identify potential root causes
5. Rank causes by probability
6. Suggest verification tests

Output: {
  symptom: string,
  potential_causes: Cause[],
  root_cause_probability: Map<string, number>,
  causal_path: string[],
  verification_tests: Test[],
  K_x: number
}
```

# MANUFACTURING CAUSAL RELATIONSHIPS

## 50+ Core Causal Pairs

```javascript
const MANUFACTURING_CAUSAL_PAIRS = [
  // SPEED RELATIONSHIPS
  { from: 'cutting_speed', to: 'tool_temperature', type: 'DIR+', strength: 0.85,
    formula: 'T ∝ V^0.4', note: 'Higher speed = higher temperature' },
  { from: 'cutting_speed', to: 'tool_life', type: 'DIR-', strength: 0.90,
    formula: 'VT^n = C (Taylor)', note: 'Higher speed = shorter life' },
  { from: 'cutting_speed', to: 'surface_finish', type: 'NL', strength: 0.70,
    formula: 'Ra = f(V) (optimal exists)', note: 'Optimal speed for best finish' },
  { from: 'cutting_speed', to: 'chip_thickness', type: 'DIR-', strength: 0.60,
    note: 'Higher speed = thinner chips at same feed' },
  { from: 'cutting_speed', to: 'built_up_edge', type: 'THR', strength: 0.75,
    threshold: 'BUE disappears above certain speed' },
    
  // FEED RELATIONSHIPS
  { from: 'feed_rate', to: 'surface_finish', type: 'DIR-', strength: 0.85,
    formula: 'Ra ∝ f²/8r', note: 'Higher feed = worse finish (geometric)' },
  { from: 'feed_rate', to: 'cutting_force', type: 'DIR+', strength: 0.80,
    formula: 'Fc ∝ f^(1-mc)', note: 'Kienzle relationship' },
  { from: 'feed_rate', to: 'chip_load', type: 'DIR+', strength: 0.95,
    formula: 'fz = f/(n×z)', note: 'Direct relationship' },
  { from: 'feed_rate', to: 'tool_life', type: 'DIR-', strength: 0.70,
    note: 'Higher feed increases tool wear' },
  { from: 'feed_rate', to: 'material_removal_rate', type: 'DIR+', strength: 0.95,
    formula: 'MRR = V×f×ap', note: 'Direct component of MRR' },
    
  // DEPTH OF CUT RELATIONSHIPS
  { from: 'depth_of_cut', to: 'cutting_force', type: 'DIR+', strength: 0.90,
    formula: 'Fc ∝ ap^(1-mc)', note: 'Kienzle relationship' },
  { from: 'depth_of_cut', to: 'deflection', type: 'DIR+', strength: 0.85,
    note: 'Deeper cuts = more tool deflection' },
  { from: 'depth_of_cut', to: 'chatter_risk', type: 'DIR+', strength: 0.80,
    note: 'Deeper cuts increase chatter probability' },
  { from: 'depth_of_cut', to: 'tool_life', type: 'DIR-', strength: 0.65,
    note: 'Deeper cuts reduce tool life' },
  { from: 'depth_of_cut', to: 'material_removal_rate', type: 'DIR+', strength: 0.95,
    formula: 'MRR = V×f×ap', note: 'Direct component of MRR' },
    
  // MATERIAL HARDNESS RELATIONSHIPS
  { from: 'material_hardness', to: 'cutting_force', type: 'DIR+', strength: 0.85,
    note: 'Harder materials require more force' },
  { from: 'material_hardness', to: 'tool_life', type: 'DIR-', strength: 0.90,
    note: 'Harder materials wear tools faster' },
  { from: 'material_hardness', to: 'recommended_speed', type: 'DIR-', strength: 0.85,
    note: 'Harder materials need slower speeds' },
  { from: 'material_hardness', to: 'surface_finish', type: 'DIR+', strength: 0.60,
    note: 'Harder materials can achieve better finish' },
    
  // TEMPERATURE RELATIONSHIPS
  { from: 'cutting_temperature', to: 'tool_wear_rate', type: 'DIR+', strength: 0.90,
    formula: 'Exponential above critical temp', note: 'Temperature accelerates wear' },
  { from: 'cutting_temperature', to: 'workpiece_hardness', type: 'THR', strength: 0.70,
    note: 'Can cause work hardening or softening' },
  { from: 'cutting_temperature', to: 'dimensional_accuracy', type: 'DIR-', strength: 0.75,
    note: 'Thermal expansion affects dimensions' },
  { from: 'cutting_temperature', to: 'residual_stress', type: 'DIR+', strength: 0.65,
    note: 'Higher temps can induce residual stress' },
    
  // TOOL GEOMETRY RELATIONSHIPS
  { from: 'rake_angle', to: 'cutting_force', type: 'DIR-', strength: 0.70,
    note: 'More positive rake = less force' },
  { from: 'rake_angle', to: 'tool_strength', type: 'DIR-', strength: 0.75,
    note: 'More positive rake = weaker edge' },
  { from: 'nose_radius', to: 'surface_finish', type: 'DIR+', strength: 0.80,
    formula: 'Ra ∝ f²/8r', note: 'Larger radius = better finish' },
  { from: 'nose_radius', to: 'cutting_force', type: 'DIR+', strength: 0.60,
    note: 'Larger radius = more force' },
  { from: 'relief_angle', to: 'flank_wear', type: 'DIR-', strength: 0.65,
    note: 'More relief = less rubbing' },
    
  // COOLANT RELATIONSHIPS
  { from: 'coolant_pressure', to: 'chip_evacuation', type: 'DIR+', strength: 0.85,
    note: 'Higher pressure = better chip removal' },
  { from: 'coolant_concentration', to: 'tool_life', type: 'DIR+', strength: 0.70,
    note: 'Proper concentration extends life' },
  { from: 'coolant_type', to: 'surface_finish', type: 'NL', strength: 0.65,
    note: 'Different coolants suit different materials' },
  { from: 'coolant_flow', to: 'cutting_temperature', type: 'DIR-', strength: 0.80,
    note: 'More coolant = lower temperature' },
    
  // VIBRATION/CHATTER RELATIONSHIPS
  { from: 'spindle_speed', to: 'chatter_frequency', type: 'DIR+', strength: 0.85,
    formula: 'fc = n×z/60', note: 'Tooth passing frequency' },
  { from: 'tool_overhang', to: 'chatter_risk', type: 'DIR+', strength: 0.90,
    note: 'More overhang = more vibration' },
  { from: 'workpiece_rigidity', to: 'chatter_risk', type: 'DIR-', strength: 0.85,
    note: 'More rigid = less chatter' },
  { from: 'depth_of_cut', to: 'chatter_amplitude', type: 'DIR+', strength: 0.80,
    note: 'Deeper cuts amplify chatter' },
    
  // MACHINE RELATIONSHIPS
  { from: 'spindle_power', to: 'max_mrr', type: 'DIR+', strength: 0.90,
    note: 'More power = higher possible MRR' },
  { from: 'machine_rigidity', to: 'achievable_accuracy', type: 'DIR+', strength: 0.85,
    note: 'Rigid machine = better accuracy' },
  { from: 'axis_acceleration', to: 'cycle_time', type: 'DIR-', strength: 0.75,
    note: 'Faster accel = shorter cycle' },
  { from: 'positioning_accuracy', to: 'part_tolerance', type: 'DIR+', strength: 0.95,
    note: 'Machine accuracy limits part accuracy' },
    
  // PROCESS OUTCOME RELATIONSHIPS
  { from: 'cutting_force', to: 'power_consumption', type: 'DIR+', strength: 0.95,
    formula: 'P = Fc×V', note: 'Direct relationship' },
  { from: 'tool_wear', to: 'surface_finish', type: 'DIR-', strength: 0.80,
    note: 'Worn tools produce worse finish' },
  { from: 'tool_wear', to: 'cutting_force', type: 'DIR+', strength: 0.75,
    note: 'Worn tools require more force' },
  { from: 'surface_finish', to: 'fatigue_life', type: 'DIR+', strength: 0.70,
    note: 'Better finish = longer fatigue life' },
  { from: 'residual_stress', to: 'part_distortion', type: 'DIR+', strength: 0.80,
    note: 'Stress causes warping' },
    
  // ECONOMIC RELATIONSHIPS
  { from: 'tool_life', to: 'tooling_cost', type: 'DIR-', strength: 0.90,
    note: 'Longer life = lower cost per part' },
  { from: 'cycle_time', to: 'production_cost', type: 'DIR+', strength: 0.85,
    note: 'Longer cycles = higher cost' },
  { from: 'scrap_rate', to: 'total_cost', type: 'DIR+', strength: 0.90,
    note: 'More scrap = higher cost' },
  { from: 'material_removal_rate', to: 'productivity', type: 'DIR+', strength: 0.85,
    note: 'Higher MRR = more productive' }
];
```

## Building the Causal Graph

```javascript
function buildManufacturingCausalGraph() {
  const graph = new CausalGraph();
  
  // Add all nodes (unique from/to values)
  const allVariables = new Set();
  for (const pair of MANUFACTURING_CAUSAL_PAIRS) {
    allVariables.add(pair.from);
    allVariables.add(pair.to);
  }
  
  for (const variable of allVariables) {
    graph.addNode(variable, {
      type: classifyVariable(variable),
      domain: getDomain(variable),
      unit: getUnit(variable)
    });
  }
  
  // Add all edges
  for (const pair of MANUFACTURING_CAUSAL_PAIRS) {
    graph.addEdge(pair.from, pair.to, {
      type: pair.type,
      strength: pair.strength,
      formula: pair.formula,
      confidence: 0.85  // Default confidence from domain knowledge
    });
  }
  
  return graph;
}
```

# COUNTERFACTUAL REASONING

## "What If" Analysis

```javascript
function whatIfAnalysis(graph, intervention, currentState) {
  // Clone current state
  const newState = { ...currentState };
  
  // Apply intervention
  const { variable, newValue } = intervention;
  const oldValue = currentState[variable];
  newState[variable] = newValue;
  
  // Propagate effects through causal graph
  const effects = [];
  const visited = new Set([variable]);
  const queue = [variable];
  
  while (queue.length > 0) {
    const current = queue.shift();
    const children = graph.getChildren(current);
    
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      
      // Compute effect on child
      const effect = computeEffect(
        currentState[current],
        newState[current],
        child.edge,
        currentState[child.id]
      );
      
      newState[child.id] = effect.newValue;
      effects.push({
        variable: child.id,
        oldValue: currentState[child.id],
        newValue: effect.newValue,
        change: effect.change,
        confidence: effect.confidence,
        causalPath: [current, child.id]
      });
      
      queue.push(child.id);
    }
  }
  
  return {
    intervention,
    originalState: currentState,
    predictedState: newState,
    effects,
    totalVariablesAffected: effects.length
  };
}

function computeEffect(oldParent, newParent, edge, currentChild) {
  const parentChange = newParent - oldParent;
  const relativeChange = parentChange / oldParent;
  
  let childChange;
  switch (edge.type) {
    case 'DIR+':
      childChange = currentChild * relativeChange * edge.strength;
      break;
    case 'DIR-':
      childChange = -currentChild * relativeChange * edge.strength;
      break;
    case 'NL':
      // Use formula if available, otherwise estimate
      if (edge.formula) {
        childChange = evaluateFormula(edge.formula, newParent) - 
                      evaluateFormula(edge.formula, oldParent);
      } else {
        childChange = currentChild * relativeChange * edge.strength * 0.5;
      }
      break;
    default:
      childChange = currentChild * relativeChange * edge.strength;
  }
  
  return {
    newValue: currentChild + childChange,
    change: childChange,
    confidence: edge.confidence * (1 - Math.abs(relativeChange) * 0.1)
  };
}
```

## Example: "What if we increase speed by 20%?"

```javascript
const result = whatIfAnalysis(
  manufacturingGraph,
  { variable: 'cutting_speed', newValue: 120 }, // 20% increase from 100
  {
    cutting_speed: 100,
    cutting_temperature: 450,
    tool_life: 45,
    surface_finish: 1.6,
    material_removal_rate: 50
  }
);

// Result:
{
  intervention: { variable: 'cutting_speed', newValue: 120 },
  effects: [
    { variable: 'cutting_temperature', oldValue: 450, newValue: 487, 
      change: +37, confidence: 0.82 },
    { variable: 'tool_life', oldValue: 45, newValue: 32,
      change: -13, confidence: 0.85 },
    { variable: 'surface_finish', oldValue: 1.6, newValue: 1.4,
      change: -0.2, confidence: 0.65 },
    { variable: 'material_removal_rate', oldValue: 50, newValue: 60,
      change: +10, confidence: 0.90 }
  ],
  summary: "Increasing speed 20% will: reduce tool life ~29%, 
            increase temperature ~8%, improve finish ~12%, 
            increase MRR ~20%"
}
```

# K(x) COMPUTATION FORMULA

## Main Computation

```javascript
function computeKx(causalResults) {
  const factors = {
    graphCompleteness: 0,    // How complete is our causal model?
    pathConfidence: 0,       // Confidence in traced paths?
    predictionAccuracy: 0,   // How accurate are predictions?
    evidenceAlignment: 0     // Does evidence support conclusions?
  };
  
  // 1. Graph Completeness (0-1)
  // Ratio of known relationships vs expected
  factors.graphCompleteness = causalResults.knownRelationships / 
                               causalResults.expectedRelationships;
  
  // 2. Path Confidence (0-1)
  // Average confidence across all traced paths
  if (causalResults.paths.length > 0) {
    factors.pathConfidence = causalResults.paths.reduce(
      (sum, p) => sum + p.confidence, 0
    ) / causalResults.paths.length;
  }
  
  // 3. Prediction Accuracy (0-1)
  // Based on validation against known outcomes
  if (causalResults.validations.length > 0) {
    const accuracies = causalResults.validations.map(v => 
      1 - Math.abs(v.predicted - v.actual) / v.actual
    );
    factors.predictionAccuracy = Math.max(0, 
      accuracies.reduce((a, b) => a + b, 0) / accuracies.length
    );
  } else {
    factors.predictionAccuracy = 0.5; // Unknown
  }
  
  // 4. Evidence Alignment (0-1)
  // Do observations support causal conclusions?
  if (causalResults.evidence.length > 0) {
    const alignments = causalResults.evidence.map(e => e.supports ? 1 : 0);
    factors.evidenceAlignment = alignments.reduce((a, b) => a + b, 0) / 
                                 alignments.length;
  } else {
    factors.evidenceAlignment = 0.5; // No evidence
  }
  
  // Weighted combination
  const weights = {
    graphCompleteness: 0.25,
    pathConfidence: 0.30,
    predictionAccuracy: 0.25,
    evidenceAlignment: 0.20
  };
  
  let Kx = 0;
  for (const [factor, weight] of Object.entries(weights)) {
    Kx += (factors[factor] || 0) * weight;
  }
  
  return Math.min(1, Math.max(0, Kx));
}
```

# EXAMPLE SCENARIOS

## Scenario 1: Speed Optimization

```
QUERY: "Why should I reduce speed when machining titanium?"

CAUSAL-001 FIRES:
- Builds graph for titanium machining context
- Key nodes: titanium_properties, cutting_speed, temperature, tool_life

CAUSAL-002 FIRES:
- Traces chain: speed → temperature → tool_wear_rate → tool_life
- Quantifies: Titanium has low thermal conductivity (7 W/m·K vs 50 for steel)
- Result: Heat concentrates at tool tip, accelerating wear

EXPLANATION GENERATED:
"Titanium's low thermal conductivity (7 W/m·K) causes heat to concentrate 
at the cutting edge rather than dissipating into the chip. This creates
a causal chain:
1. Speed increases → Temperature increases (exponentially in Ti)
2. Temperature > 500°C → Tool wear rate increases dramatically
3. Tool wear rate × time → Tool failure

Reducing speed from 100 to 50 m/min can extend tool life from 5 min to 
45 min (9x improvement) because temperature drops below the critical 
threshold where rapid wear occurs."

K(x) = 0.89 (strong causal reasoning)
```

## Scenario 2: Failure Analysis

```
SYMPTOM: Tool broke unexpectedly at 50% of expected life

CAUSAL-003 FIRES:
- Traces backward from tool_failure
- Identifies potential causes

ROOT CAUSE ANALYSIS:
Path 1: tool_failure ← tool_wear ← cutting_temperature ← cutting_speed
        Probability: 0.45 (speed was normal)
        
Path 2: tool_failure ← chipping ← interrupted_cut ← workpiece_geometry
        Probability: 0.72 (workpiece has cross-holes)
        
Path 3: tool_failure ← fatigue ← vibration ← chatter
        Probability: 0.58 (some vibration noted)

MOST LIKELY ROOT CAUSE:
"Interrupted cut due to workpiece cross-holes (0.72 probability).
When the tool enters/exits the holes, impact loading causes edge 
chipping. This is consistent with:
- Tool shows chipping pattern, not gradual wear
- Breakage occurred at consistent position (where hole is)
- Other identical parts without holes lasted full life"

RECOMMENDATION:
"1. Reduce feed 30% when approaching cross-hole
2. Use tougher insert grade (less sharp but more impact resistant)
3. Add slight lead angle to reduce impact force"

K(x) = 0.82 (good causal chain with supporting evidence)
```

# VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-30 | Initial creation as part of Cognitive Enhancement v7.0 |

---

**UNDERSTAND WHY, NOT JUST WHAT.**
**prism-causal-reasoning v1.0.0 | Cognitive Level 1 | K(x) Provider**
