# Knowledge-Augmented Reasoning (KAR) System v2

## Overview

The KAR system enhances Claude's reasoning capabilities by automatically injecting relevant knowledge from PRISM's extensive knowledge base when domain-specific prompts are detected.

**Hook File:** `.claude/helpers/knowledge-augmented-reasoning-v2.mjs`
**Trigger:** UserPromptSubmit
**Timeout:** 3000ms

## Knowledge Sources

### 1. MIT Course Library (225 courses)
- **Location:** `resources/MIT COURSES/`
- **Index:** `MIT_COURSE_INDEX.json`
- **Coverage:** Software engineering, algorithms, optimization, ML/AI, manufacturing, control systems, signal processing, CAD/graphics, materials, databases, security, human factors, systems engineering, numerical methods

**Key Course Mappings:**
| PRISM Engine | Relevant Courses |
|--------------|------------------|
| Speed_Feed_Calculator | 2.810, 6.079, 6.867, 6.046J |
| Force_Calculator | 2.810, 2.003, 3.11 |
| Chatter_Prediction | 2.032, 6.011, 2.004 |
| Bayesian_Optimizer | 6.867, 6.041, 15.097 |
| Neural_Network_Engine | 6.867, 9.520 |
| Collision_Engine | 6.837, 6.838, 6.046J |

### 2. Algorithm Registry (285 algorithms)
- **Location:** `resources/MIT COURSES/ALGORITHM_REGISTRY.json`
- **Coverage:** 87.8% of PRISM engines mapped to academic algorithms
- **Categories:**
  - Optimization (LP, NLP, metaheuristics, multi-objective, DP)
  - Machine Learning (supervised, unsupervised, neural nets, Bayesian, RL)
  - Signal Processing (FFT, wavelets, Kalman)
  - Graph Algorithms (Dijkstra, A*, max-flow)
  - Manufacturing Physics (Kienzle, Taylor, SLD, thermal)
  - Geometry/CAD (NURBS, collision detection, mesh operations)
  - Scheduling (job shop, dispatching rules, CPM)

### 3. Cross-Disciplinary Formulas
- **Location:** `resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/`
- **Files:**
  - `PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js` (158KB)
  - `PRISM_ADVANCED_CROSS_DOMAIN_v1.js` (33KB)
  - `PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js` (128KB)
- **Coverage:** Physics (thermodynamics, fluid dynamics, quantum-inspired), biology, economics, information theory, chemistry, electrical engineering, operations research, chaos theory

### 4. Video-Learned Knowledge (69+ transcripts)
- **Location:** `data/video-learned/transcripts/`
- **Registry:** `data/video-learned/learning-registry.json`
- **Sources:**
  - Haas Automation tips (speeds/feeds calculations)
  - Okuma/Gosiger training
  - Mitsubishi WEDM procedures
  - Fanuc Manual Guide training
  - Mazak Mazatrol programming
  - Siemens Sinumerik training
  - DMU50 walkthrough
  - Doosan/Hurco training

### 5. Tribal Knowledge (4,493+ tips)
- **Location:** `state/tribal_captured_tips.json`
- **Categories:** Tagged by domain (die, punch, cold-heading, carbide, etc.)

### 6. JM Die Program Archive (36,929 files)
- **Location:** `JM DIE/`
- **Content:**
  - CNC Lathe programs (.MIN)
  - Mastercam files (.mcx-8, .MCX)
  - Wire EDM programs
  - Mill programs (Haas, Hurco, Okuma, Roku-Roku)
- **Context:** Cold heading die shop for fastener industry

## Detected Domains

| Domain | Trigger Patterns | Injected Content |
|--------|------------------|------------------|
| **optimization** | optimi*, minimize, maximize, gradient, convergence | GradientDescent, Adam, LBFGS formulas |
| **neural_network** | neural, network, deep learning, backprop, activation | Backprop chain rule, activations |
| **transformer** | transformer, attention, encoder, decoder | Attention(Q,K,V), positional encoding |
| **bayesian** | bayesian, prior, posterior, likelihood, MCMC | Bayes rule, GP, acquisition functions |
| **reinforcement_learning** | reinforcement, q-learning, policy, reward | Q-learning, policy gradient, Bellman |
| **cutting_force** | force, kienzle, cutting, chip, power, torque | Kienzle Fc, chip thickness, power calc |
| **tool_life** | tool life, taylor, wear, flank, VB | Taylor equation, wear criteria |
| **thermal** | thermal, temperature, heat, coolant | Heat partition, Jaeger model |
| **chatter** | chatter, vibration, stability, lobe, SLD | SLD formula, regenerative chatter |
| **deflection** | deflection, stiffness, overhang, L/D | Cantilever δ=FL³/3EI, L/D rules |
| **surface_finish** | surface, finish, roughness, Ra, Rz | Theoretical Ra, BUE effect |
| **toolpath** | toolpath, CAM, strategy, pocket, adaptive | Cusp height, stepover, MRR |
| **post_processor** | post, G-code, NC, Fanuc, Siemens, Haas | G-code structure, canned cycles |
| **edm** | EDM, wire EDM, sinker, WEDM, electrode | Spark gap, wire offset |
| **threading** | thread, tap, pitch, helix, TPI | Pitch calc, tap feed rate |
| **statistics** | statistic, regression, CPK, SPC | Regression, Cpk, confidence |
| **scheduling** | schedul*, job shop, queue, bottleneck | Little's law, utilization |
| **geometry** | collision, geometry, NURBS, mesh, CSG | GJK, NURBS evaluation |
| **cold_heading** | cold head*, die, fastener, punch | Heading force, reduction |

## Injection Format

When domains are detected, KAR v2 injects:

```
KAR v2 | DOMAINS: [detected domains]
ALGORITHMS: [relevant algorithm names]
PRISM ENGINES: [mapped engine names]
KEY FORMULAS: [domain-specific formulas]
MIT COURSE REFS: [course IDs for deeper learning]
TRIBAL TIPS: [relevant shop floor tips]
VIDEO LEARNED: [extracted video knowledge]
JM DIE CONTEXT: [shop profile if relevant]
REASONING CHAIN: [step-by-step approach]
Cross-reference with PRISM registries for canonical constants.
```

## Example Output

**Prompt:** "Optimize cold heading die toolpath using neural network for tool wear prediction"

**Injection:**
```
KAR v2 | DOMAINS: optimization, neural_network, tool_life, cold_heading
ALGORITHMS: GradientDescent, AdamOptimizer, NeuralInference, Backpropagation, ExtendedTaylorModel, UsuiWearModel
PRISM ENGINES: PRISM_GRADIENT_DESCENT, PRISM_ADAM_OPTIMIZER, PRISM_NEURAL_NETWORK, PRISM_TAYLOR_TOOL_LIFE
KEY FORMULAS: GRADIENT DESCENT: θ = θ - α∇J(θ) | BACKPROP: δ_j = (∂E/∂o_j) × f'(net_j) | TAYLOR: VT^n = C
MIT COURSE REFS: 6.079, 6.252J, 6.867, 9.520, 2.810 (see resources/MIT COURSES/ for deep learning)
JM DIE CONTEXT: Cold heading die shop (36,929 programs). Materials: M2, D2, S7, A2 tool steels, tungsten carbide. Machines: 7 Okuma lathes, 2 Mitsubishi EDMs, 5 mills.
REASONING CHAIN: OPTIMIZATION: Define objective → Identify constraints → Choose algorithm → Validate convergence
Cross-reference with PRISM registries for canonical constants. Import physics from src/physics/constants.ts.
```

## Adding New Domains

To add a new domain to KAR v2:

1. Edit `.claude/helpers/knowledge-augmented-reasoning-v2.mjs`
2. Add entry to `DOMAIN_KNOWLEDGE` object:
```javascript
new_domain: {
  patterns: [/regex1/i, /regex2/i],
  algorithms: ["Algo1", "Algo2"],
  mitCourses: ["6.xxx", "15.xxx"],
  formulas: ["FORMULA: expression"],
  prismEngines: ["PRISM_ENGINE_NAME"],
  videoSources: ["video-knowledge.json"],  // optional
  jmDiePatterns: true,  // optional - enables JM Die context
  tribalTags: ["tag1", "tag2"],  // optional - for tribal tip matching
}
```
3. Test with: `echo '{"prompt": "your test"}' | node .claude/helpers/knowledge-augmented-reasoning-v2.mjs`

## Performance

- **Detection:** ~50ms (regex matching)
- **Knowledge loading:** ~100ms (cached after first load)
- **Total latency:** ~150-200ms per prompt
- **Timeout:** 3000ms (allows for file system access)

## Related Files

- **Hook Definition:** `mcp-server/data/docs/HOOK_DEFINITIONS_v20.md`
- **DSL Reference:** `.claude/DSL-QUICK-REFERENCE.md`
- **Baseline Inventory:** `mcp-server/data/state/BASELINE_INVENTORY.json`
- **Original KAR v1:** `.claude/helpers/knowledge-augmented-reasoning.mjs` (deprecated)
