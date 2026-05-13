#!/usr/bin/env node
// tier: T4
/**
 * discipline-expert-inject.mjs — UserPromptSubmit hook
 *
 * Detects the discipline/domain of the task and injects PhD-level expertise:
 * - Core principles
 * - Key techniques/frameworks
 * - Common pitfalls to avoid
 * - Quality criteria
 * - Reference standards
 *
 * 18 disciplines: System Architecture, Software Dev, ML, AI, Deep Learning,
 * Engineering, Machining, Physics, Mathematics, Legal, Business Management,
 * Shop Management, Lean/Six Sigma/Kaizen, Accounting, Quoting, Sales,
 * Web Design, UI/UX
 *
 * FIRES ON: UserPromptSubmit
 * BLOCKING: never — adds context only
 *
 * RATE-LIMITED: injects at most once per 5 minutes per detected discipline
 * bucket. The directive is ~300 tokens per discipline × up to 2 disciplines
 * = 600 tokens on every prompt without limiting, which dominated session
 * context in long iterative builds.
 */
import { shouldSkipHook as _hp_shouldSkip } from "../helpers/hook-profile.mjs";
import fs from "node:fs";
import { join as _rateJoin, dirname as _rateDirname } from "node:path";
import _rateOs from "node:os";



function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}
const _RATE_WINDOW_MS = 5 * 60 * 1000;
const _RATE_FILE = _rateJoin(_rateOs.tmpdir(), "prism-hook-state", "discipline-expert-inject.last.json");
function _loadRate() { try { return JSON.parse(_rateRead(_RATE_FILE, "utf8")); } catch { return {}; } }
function _saveRate(s) {
  try {
    const dir = _rateDirname(_RATE_FILE);
    if (!_rateExists(dir)) _rateMkdir(dir, { recursive: true });
    _rateWrite(_RATE_FILE, JSON.stringify(s));
  } catch { /* ignore */ }
}

// ============================================================================
// DISCIPLINE DEFINITIONS
// ============================================================================

const DISCIPLINES = {
  systemArchitecture: {
    name: 'System Architecture',
    triggers: ['architecture', 'system design', 'scalability', 'distributed', 'microservice', 'monolith', 'event-driven', 'cqrs', 'saga', 'api gateway', 'load balancer', 'high availability', 'fault tolerance', 'cap theorem'],
    expertise: {
      principles: [
        'Separation of concerns — each component has ONE job',
        'Design for failure — everything fails, plan for it',
        'Horizontal scaling > vertical scaling',
        'Stateless services enable elasticity',
        'Event sourcing for audit + replay capability',
      ],
      techniques: [
        'CQRS for read/write asymmetry',
        'Saga pattern for distributed transactions',
        'Circuit breaker for cascading failure prevention',
        'Bulkhead for isolation',
        'Strangler fig for legacy migration',
      ],
      pitfalls: [
        'Distributed monolith — microservices with tight coupling',
        'Premature optimization — scale when needed, not before',
        'Ignoring CAP theorem — pick 2 of 3 consciously',
        'Synchronous chains — one slow service blocks all',
        'No observability — can\'t debug what you can\'t see',
      ],
      quality: [
        'Latency p99 < 200ms for user-facing',
        'Availability 99.9% = 8.7 hours downtime/year',
        '99.99% = 52 minutes/year',
        'RTO/RPO defined for every service',
      ],
    },
  },

  softwareDevelopment: {
    name: 'Software Development',
    triggers: ['software', 'code', 'programming', 'refactor', 'debug', 'implement', 'develop', 'function', 'class', 'module', 'api', 'backend', 'frontend', 'fullstack'],
    expertise: {
      principles: [
        'SOLID — Single responsibility, Open-closed, Liskov, Interface segregation, Dependency inversion',
        'DRY — Don\'t Repeat Yourself (but 3x rule: duplicate until pattern emerges)',
        'YAGNI — You Aren\'t Gonna Need It',
        'KISS — Keep It Simple, Stupid',
        'Composition over inheritance',
      ],
      techniques: [
        'TDD for critical paths — Red, Green, Refactor',
        'Dependency injection for testability',
        'Strategy pattern for algorithm swapping',
        'Factory for object creation complexity',
        'Observer for decoupled event handling',
      ],
      pitfalls: [
        'Premature abstraction — wait for 3rd use case',
        'God objects — classes doing too much',
        'Stringly-typed code — use enums/types',
        'Null abuse — use Option/Maybe types',
        'Silent failures — fail fast and loud',
      ],
      quality: [
        'Cyclomatic complexity < 10 per function',
        'Test coverage > 80% for business logic',
        'No functions > 50 lines',
        'Max 3 levels of nesting',
      ],
    },
  },

  machineLearning: {
    name: 'Machine Learning',
    triggers: ['machine learning', 'ml', 'model', 'training', 'inference', 'dataset', 'feature', 'hyperparameter', 'overfitting', 'underfitting', 'cross-validation', 'sklearn', 'xgboost', 'random forest', 'regression', 'classification', 'clustering'],
    expertise: {
      principles: [
        'Garbage in, garbage out — data quality > model complexity',
        'Train/val/test split — NEVER leak test data',
        'Feature engineering > algorithm selection',
        'Simpler models generalize better (Occam\'s razor)',
        'Bias-variance tradeoff — balance underfitting vs overfitting',
      ],
      techniques: [
        'Cross-validation (k-fold, stratified) for robust evaluation',
        'Feature scaling (StandardScaler, MinMaxScaler) for distance-based models',
        'Regularization (L1/L2) to prevent overfitting',
        'Ensemble methods (bagging, boosting, stacking)',
        'SHAP/LIME for model interpretability',
      ],
      pitfalls: [
        'Data leakage — future data in training',
        'Class imbalance — use SMOTE, class weights, or stratified sampling',
        'Correlation ≠ causation',
        'Evaluating on training data',
        'Ignoring feature importance — black box models',
      ],
      quality: [
        'AUC-ROC > 0.8 for binary classification',
        'F1-score for imbalanced classes',
        'RMSE/MAE for regression',
        'Confusion matrix analysis for error types',
      ],
    },
  },

  artificialIntelligence: {
    name: 'Artificial Intelligence',
    triggers: ['artificial intelligence', 'ai', 'intelligent', 'reasoning', 'knowledge graph', 'expert system', 'nlp', 'computer vision', 'reinforcement learning', 'agent', 'planning', 'search algorithm', 'heuristic'],
    expertise: {
      principles: [
        'Intelligence = search + knowledge + learning',
        'Representation matters — right structure enables right reasoning',
        'Uncertainty is fundamental — probabilistic reasoning',
        'Embodiment hypothesis — intelligence needs interaction',
        'Symbol grounding — meaning from experience',
      ],
      techniques: [
        'A* for optimal pathfinding',
        'Monte Carlo Tree Search for game playing',
        'Bayesian networks for probabilistic reasoning',
        'Knowledge graphs for structured knowledge',
        'Reinforcement learning for sequential decision making',
      ],
      pitfalls: [
        'Brittleness — AI fails on distribution shift',
        'Reward hacking in RL',
        'Hallucination in generative models',
        'Adversarial vulnerability',
        'Alignment problem — optimizing wrong objective',
      ],
      quality: [
        'Benchmark against human performance',
        'Out-of-distribution testing',
        'Adversarial robustness evaluation',
        'Explainability requirements met',
      ],
    },
  },

  deepLearning: {
    name: 'Deep Learning',
    triggers: ['deep learning', 'neural network', 'transformer', 'cnn', 'rnn', 'lstm', 'attention', 'bert', 'gpt', 'embedding', 'backpropagation', 'gradient descent', 'pytorch', 'tensorflow', 'keras', 'batch normalization', 'dropout'],
    expertise: {
      principles: [
        'Depth enables hierarchical feature learning',
        'Attention is all you need — but compute scales quadratically',
        'Residual connections enable very deep networks',
        'Normalization stabilizes training',
        'Transfer learning > training from scratch',
      ],
      techniques: [
        'Adam optimizer for most cases',
        'Learning rate scheduling (warmup, cosine decay)',
        'Dropout + BatchNorm for regularization',
        'Data augmentation for limited data',
        'Mixed precision training for speed',
      ],
      pitfalls: [
        'Vanishing/exploding gradients — use proper initialization',
        'Mode collapse in GANs',
        'Catastrophic forgetting in continual learning',
        'Computational cost underestimation',
        'Not monitoring training curves',
      ],
      quality: [
        'Loss curve convergence (no oscillation)',
        'Train/val gap < 5% (no overfitting)',
        'Gradient norm monitoring',
        'Memory profiling for production',
      ],
    },
  },

  engineering: {
    name: 'Engineering (General)',
    triggers: ['engineer', 'design', 'specification', 'tolerance', 'stress', 'strain', 'fatigue', 'thermal', 'structural', 'mechanical', 'electrical', 'control system', 'feedback', 'pid'],
    expertise: {
      principles: [
        'Safety factor — design for 2-4x expected load',
        'Fail-safe design — failure leads to safe state',
        'Redundancy for critical systems',
        'Feedback control for stability',
        'Tolerance stack-up analysis',
      ],
      techniques: [
        'FEA (Finite Element Analysis) for stress/thermal',
        'FMEA (Failure Mode Effects Analysis)',
        'Root cause analysis (5 Whys, Ishikawa)',
        'Design of Experiments (DOE)',
        'Statistical tolerance analysis',
      ],
      pitfalls: [
        'Single point of failure',
        'Ignoring thermal expansion',
        'Resonance at operating frequency',
        'Material fatigue over time',
        'Corrosion in dissimilar metals',
      ],
      quality: [
        'Safety factor > 2 for static, > 4 for fatigue',
        'GD&T per ASME Y14.5',
        'Traceable material certs',
        'First article inspection (FAI)',
      ],
    },
  },

  machining: {
    name: 'Machining & Manufacturing',
    triggers: ['machining', 'cnc', 'mill', 'lathe', 'turning', 'cutting', 'toolpath', 'gcode', 'feed rate', 'spindle', 'surface finish', 'tool wear', 'chip', 'coolant', 'fixture', 'workholding', 'edm', 'grinding'],
    expertise: {
      principles: [
        'Rigidity is king — minimize deflection in entire system',
        'Chip evacuation prevents recutting',
        'Heat goes into chip (ideally) > tool > workpiece',
        'Tool life vs productivity tradeoff',
        'Process capability (Cpk) > 1.33 for production',
      ],
      techniques: [
        'Kienzle force model: Fc = kc1.1 × ap × fz^(1-mc)',
        'Taylor tool life: VT^n = C',
        'High-speed machining for aluminum (10,000+ RPM)',
        'Trochoidal milling for slots',
        'Climb milling for better finish',
      ],
      pitfalls: [
        'Chatter from regenerative vibration — check stability lobes',
        'Built-up edge at low speeds',
        'Work hardening in stainless/titanium',
        'Thermal growth during long cycles',
        'Inadequate chip breaking',
      ],
      quality: [
        'Surface finish Ra per drawing (0.8μm typical for ground)',
        'Dimensional tolerance IT6-IT8 for precision',
        'No burrs on critical edges',
        'SPC on critical dimensions',
      ],
    },
  },

  milling: {
    name: 'Milling Machinist',
    triggers: ['milling', 'mill', 'end mill', 'face mill', 'slot', 'pocket', 'contour', 'roughing', 'finishing', 'stepover', 'stepdown', 'radial engagement', 'axial depth', 'trochoidal', 'high speed machining', 'hsm', 'vmc', 'hmc', 'bridgeport'],
    expertise: {
      principles: [
        'Radial engagement controls heat — 10-15% for HSM, 50-70% for conventional',
        'Axial depth limited by tool deflection, not power',
        'Chip thinning requires feed compensation: fz_eff = fz × √(ae/D)',
        'Tool path strategy > tool selection > parameters',
        'Rigidity chain: spindle → holder → tool → workpiece → fixture → table',
      ],
      techniques: [
        'Trochoidal milling for slots: constant engagement, 3-5× deeper cuts',
        'High-efficiency milling (HEM): full flute depth, 10% stepover',
        'Climb milling default (conventional for poor rigidity only)',
        'Helical interpolation for holes > 1.5× tool diameter',
        'Rest machining with smaller tool for corners',
      ],
      pitfalls: [
        'Full-slot cutting destroys tools (radial engagement = 100%)',
        'Sharp internal corners impossible — use radius or relief',
        'Chip recutting in pockets without proper evacuation',
        'Chatter at specific spindle speeds — use stability lobes',
        'Ignoring tool runout (>0.001" kills insert life)',
      ],
      quality: [
        'Ra 32-63 μin (0.8-1.6 μm) for finish mill',
        'Wall perpendicularity <0.001"/inch',
        'Blend-free surfaces via constant scallop stepover',
        'No witness marks at tool entry/exit',
      ],
    },
  },

  lathe: {
    name: 'Lathe & Turning Machinist',
    triggers: ['lathe', 'turning', 'boring', 'facing', 'threading', 'grooving', 'parting', 'live tooling', 'swiss', 'cnc turning', 'okuma', 'haas st', 'mazak', 'citizen', 'star', 'c-axis', 'sub-spindle', 'bar feeder'],
    expertise: {
      principles: [
        'Nose radius compensation (G41/G42) affects finish and geometry',
        'Constant surface speed (G96) critical for facing operations',
        'Lead angle affects cutting forces and chip flow',
        'Overhang ratio <4:1 for boring bars (2.5:1 ideal)',
        'Chip control via feed/depth ratio and insert chipbreaker',
      ],
      techniques: [
        'Roughing: ap = 3-5mm, f = 0.3-0.5mm/rev for steel',
        'Finishing: ap = 0.25-0.5mm, f = 0.1-0.15mm/rev',
        'Threading: multiple passes, constant infeed or flank infeed',
        'Grooving: pecking for deep slots, anti-chip geometry',
        'Swiss: guide bushing support for L/D > 3:1',
      ],
      pitfalls: [
        'Chatter in boring from insufficient bar rigidity',
        'Built-up edge at low speeds (increase to >100 SFM)',
        'Work hardening 304/316SS — never dwell or rub',
        'Threading crash from incorrect pitch/lead setup',
        'Part pull-out from inadequate chuck pressure',
      ],
      quality: [
        'Ra 32-125 μin typical (better with wiper insert)',
        'Concentricity <0.001" for precision fits',
        'Thread pitch diameter within 2A/2B tolerance',
        'Taper <0.0005"/inch with proper alignment',
      ],
    },
  },

  wireEdm: {
    name: 'Wire EDM Machinist',
    triggers: ['wire edm', 'wedm', 'wire cut', 'wire erosion', 'brass wire', 'coated wire', 'stratified wire', 'flushing', 'recast', 'white layer', 'skim cut', 'taper cutting', 'sodick', 'fanuc robocut', 'mitsubishi', 'makino', 'agie', 'charmilles'],
    expertise: {
      principles: [
        'Material removal by spark erosion — no cutting forces',
        'Gap voltage × current × frequency = MRR',
        'Recast layer depth proportional to pulse energy',
        'Flushing removes debris — inadequate flushing = wire breaks',
        'Wire tension affects straightness and accuracy',
      ],
      techniques: [
        'Rough cut: 4-8 mm²/min MRR, leaves 0.15-0.2mm stock',
        'Skim cuts: progressively lower power, 3-5 passes for Ra<0.4μm',
        'Taper cutting: max 30° with standard wire',
        'Submerged cutting for tall parts (better flushing)',
        'Threaded dies: start hole + profile cut + relief',
      ],
      pitfalls: [
        'Wire breakage from poor flushing or contaminated water',
        'DC arcing in corners — add dwell or reduce power',
        'Recast layer microcracking — remove by skim cuts',
        'Thermal stress warping thin sections',
        'Part drop-off into tank (no tabs or glue)',
      ],
      quality: [
        'Ra 0.1-0.2 μm achievable with proper skim sequence',
        'Accuracy ±0.002mm with temperature control',
        'Recast layer <5μm after proper skim cuts',
        'No taper deviation >0.001mm/25mm height',
      ],
    },
  },

  sinkerEdm: {
    name: 'Sinker EDM Machinist',
    triggers: ['sinker edm', 'ram edm', 'die sinker', 'edm electrode', 'graphite electrode', 'copper electrode', 'orbiting', 'edm oil', 'dielectric', 'c-axis edm', 'sodick die sinker', 'makino edm', 'fanuc edm', 'charmilles', 'cavity'],
    expertise: {
      principles: [
        'Electrode wear ratio varies: graphite 1:1, copper 3:1 typical',
        'Negative polarity for roughing, positive for finishing (steel)',
        'Spark gap inversely proportional to power setting',
        'Flushing critical — jet, suction, or orbital motion',
        'Multiple electrodes: rough (OD), semi-finish, finish',
      ],
      techniques: [
        'Orbiting for uniform wear and better flushing (0.1-0.5mm radius)',
        'Vector orbiting: X-Y-Z combined motion patterns',
        'Jump flushing cycle: retract 2-5mm every 1-3 seconds',
        'Graphite for complex shapes, copper for fine detail/accuracy',
        'EDM texturing: low power, high frequency for matte surfaces',
      ],
      pitfalls: [
        'Electrode wear concentration at corners',
        'DC arcing damage from inadequate flushing',
        'Electrode deflection from flushing pressure',
        'Oil contamination affecting surface finish',
        'Ignoring electrode growth compensation',
      ],
      quality: [
        'VDI 12-24 typical surface finish',
        'Ra 0.2 μm achievable with proper parameters',
        'Accuracy ±0.005mm realistic, ±0.002mm with care',
        'Recast layer <10μm for injection molds',
      ],
    },
  },

  waterjet: {
    name: 'Waterjet Machinist',
    triggers: ['waterjet', 'water jet', 'abrasive waterjet', 'awj', 'garnet', 'omax', 'flow waterjet', 'wardjet', 'jet edge', 'water cutting', 'abrasive cutting', 'waterjet pierce', 'waterjet taper'],
    expertise: {
      principles: [
        'Abrasive does the cutting — water is the carrier',
        'Pressure (60-90 ksi) × flow rate = cutting energy',
        'Standoff distance affects kerf width and accuracy',
        'Traverse speed inversely proportional to thickness',
        'Taper inherent in abrasive waterjet — compensate or accept',
      ],
      techniques: [
        'Pierce: low pressure start, ramp up (prevents blowout)',
        'Dynamic waterjet: tilt head to compensate taper',
        'Quality levels Q1-Q5: Q1=sever (fastest), Q5=finish (slowest)',
        'Tab cutting: prevent part drop without tab cleanup',
        'Stack cutting: multiple thin sheets simultaneously',
      ],
      pitfalls: [
        'Delamination in composites — reduce pressure/speed',
        'Frosting on bottom surface (abrasive rebound)',
        'Jet lag in thick materials — slow down or accept taper',
        'Garnet recycling degrades cut quality',
        'Nozzle wear changes kerf — track and compensate',
      ],
      quality: [
        'Ra 125-250 μin typical (Q3-Q4 cuts)',
        'Accuracy ±0.003-0.005" realistic',
        'Taper 0.5-2° unless using dynamic head',
        'No heat-affected zone (major advantage)',
      ],
    },
  },

  laser: {
    name: 'Laser Machinist',
    triggers: ['laser cutting', 'laser', 'co2 laser', 'fiber laser', 'laser engraving', 'laser marking', 'assist gas', 'laser focus', 'trumpf', 'bystronic', 'mazak laser', 'amada laser', 'han\'s laser', 'ipg', 'kerf'],
    expertise: {
      principles: [
        'Fiber lasers: better for thin metal, lower operating cost',
        'CO2 lasers: better for thick metal, organics, plastics',
        'Assist gas: O2 for carbon steel (exothermic), N2 for stainless/aluminum',
        'Focus position relative to material surface critical',
        'Power density (W/mm²) determines cut vs engrave vs mark',
      ],
      techniques: [
        'Pierce: pulse pierce for thick material, continuous for thin',
        'Ramp power at corners to prevent overburn',
        'Common-line cutting for part-to-part nesting efficiency',
        'Lead-in/out: tangent approach for clean edge',
        'Beam diameter affects minimum feature size (typically 0.1mm)',
      ],
      pitfalls: [
        'Reflective materials (Cu, Al, brass) problematic for CO2',
        'Dross adhesion from incorrect gas pressure/focus',
        'Overburn at corners and small features',
        'Lens contamination from spatter (back-reflection risk)',
        'HAZ hardening in carbon steel edges',
      ],
      quality: [
        'Kerf width 0.1-0.3mm typical',
        'Ra 32-125 μin achievable',
        'Squareness <1° with proper focus',
        'Minimal burr with optimized parameters',
      ],
    },
  },

  postProcessor: {
    name: 'Post Processor Engineer',
    triggers: ['post processor', 'postprocessor', 'post', 'pp', 'gcode', 'g-code', 'nc output', 'machine code', 'fanuc post', 'siemens post', 'haas post', 'okuma post', 'heidenhain', 'mpost', 'cps', 'mastercam post', 'fusion post', 'catia post'],
    expertise: {
      principles: [
        'Post = CAM output → controller dialect translation',
        'Controller-specific: Fanuc vs Siemens vs Heidenhain syntax',
        'Machine kinematics affect 5-axis output (table-table, head-head, mixed)',
        'Safety: tool length comp, work offsets, retract planes',
        'Maintainability > cleverness in post code',
      ],
      techniques: [
        'JavaScript posts: use AST manipulation for complex transforms',
        'NCI parsing: record-by-record with state machine',
        'Modal tracking: remember G/M codes across blocks',
        'Variable substitution: #VAR for Fanuc, R-params for Siemens',
        'Subprogram output for repeated patterns (G65/M98)',
      ],
      pitfalls: [
        'Feed rate mode mismatch (G93/G94/G95)',
        'Coolant M-codes before spindle at speed',
        'Missing safe retracts between operations',
        'Arc output issues (R vs I/J/K, plane selection)',
        'Fixture offset confusion (G54-G59 vs G54.1 P#)',
      ],
      quality: [
        'DNC proven: runs on target machine without edits',
        'Consistent formatting: readable by operators',
        'Comments match CAM operation names',
        'All safety sequences present (tool length, retracts)',
      ],
    },
  },

  physics: {
    name: 'Physics',
    triggers: ['physics', 'force', 'energy', 'momentum', 'thermodynamics', 'heat transfer', 'fluid', 'dynamics', 'kinematics', 'quantum', 'relativity', 'electromagnetism', 'wave', 'particle'],
    expertise: {
      principles: [
        'Conservation laws — energy, momentum, mass, charge',
        'Symmetry → conservation (Noether\'s theorem)',
        'Dimensional analysis catches errors',
        'Order of magnitude estimates first',
        'Boundary conditions determine solutions',
      ],
      techniques: [
        'Free body diagrams for mechanics',
        'Energy methods (Lagrangian, Hamiltonian)',
        'Perturbation theory for small deviations',
        'Numerical integration (Runge-Kutta) for ODEs',
        'Finite element methods for PDEs',
      ],
      pitfalls: [
        'Sign errors in vectors',
        'Forgetting reference frame',
        'Ignoring friction/drag in real systems',
        'Linear approximation beyond valid range',
        'Unit conversion errors',
      ],
      quality: [
        'Units must balance on both sides',
        'Limiting cases check (v→0, t→∞)',
        'Conservation law verification',
        'Experimental validation within uncertainty',
      ],
    },
  },

  mathematics: {
    name: 'Mathematics',
    triggers: ['math', 'equation', 'proof', 'theorem', 'algorithm', 'optimization', 'linear algebra', 'calculus', 'differential', 'integral', 'probability', 'statistics', 'numerical', 'convergence'],
    expertise: {
      principles: [
        'Proof by construction > existence proof',
        'Check boundary cases and limits',
        'Numerical stability matters for computation',
        'Condition number indicates sensitivity',
        'Convergence rate determines practical utility',
      ],
      techniques: [
        'Newton-Raphson for root finding',
        'Gradient descent for optimization',
        'SVD for matrix analysis',
        'Monte Carlo for high-dimensional integration',
        'Dynamic programming for optimal substructure',
      ],
      pitfalls: [
        'Floating point precision loss',
        'Ill-conditioned matrices (condition number > 10^6)',
        'Local minima in non-convex optimization',
        'Divergence in iterative methods',
        'Off-by-one errors in indices',
      ],
      quality: [
        'Relative error < 1e-10 for double precision',
        'Convergence in O(log n) or better',
        'Numerical stability across input range',
        'Closed-form solution when possible',
      ],
    },
  },

  legal: {
    name: 'Legal / Compliance',
    triggers: ['legal', 'law', 'compliance', 'regulation', 'contract', 'liability', 'intellectual property', 'patent', 'copyright', 'trademark', 'gdpr', 'hipaa', 'itar', 'export control', 'terms of service', 'privacy'],
    expertise: {
      principles: [
        'Document everything — if it\'s not written, it didn\'t happen',
        'Assume adversarial interpretation of contracts',
        'Compliance is not optional — penalties are severe',
        'IP protection enables business value',
        'Privacy by design, not afterthought',
      ],
      techniques: [
        'Contract review checklist',
        'Compliance audit trail',
        'Data classification (public, internal, confidential, restricted)',
        'Access control based on need-to-know',
        'Retention policies with destruction schedules',
      ],
      pitfalls: [
        'Verbal agreements without written confirmation',
        'Assuming fair use without legal review',
        'Cross-border data transfer violations',
        'Export control on technical data',
        'Missing audit trails',
      ],
      quality: [
        'All contracts reviewed by counsel',
        'Compliance certifications current',
        'Data processing agreements in place',
        'Audit-ready documentation',
      ],
    },
  },

  businessManagement: {
    name: 'Business Management',
    triggers: ['business', 'management', 'strategy', 'operations', 'kpi', 'roi', 'profit', 'revenue', 'budget', 'forecast', 'stakeholder', 'decision', 'risk management', 'project management'],
    expertise: {
      principles: [
        'Cash flow is king — profitable companies can still fail',
        'What gets measured gets managed',
        'Opportunity cost of every decision',
        '80/20 rule (Pareto) for resource allocation',
        'Alignment of incentives drives behavior',
      ],
      techniques: [
        'SWOT analysis for strategic planning',
        'OKRs for goal alignment',
        'NPV/IRR for investment decisions',
        'Risk matrix (probability × impact)',
        'Balanced scorecard for performance',
      ],
      pitfalls: [
        'Vanity metrics vs actionable metrics',
        'Sunk cost fallacy — cut losses early',
        'Analysis paralysis — decide with 70% information',
        'Ignoring leading indicators',
        'Incentivizing wrong behaviors',
      ],
      quality: [
        'ROI > cost of capital',
        'Monthly variance analysis',
        'Risk register maintained',
        'Clear decision rights (RACI)',
      ],
    },
  },

  shopManagement: {
    name: 'Shop Management / Operations',
    triggers: ['shop', 'floor', 'production', 'scheduling', 'capacity', 'throughput', 'bottleneck', 'oee', 'downtime', 'setup', 'changeover', 'work order', 'traveler', 'operator'],
    expertise: {
      principles: [
        'Theory of Constraints — optimize the bottleneck',
        'OEE = Availability × Performance × Quality',
        'Setup time reduction enables smaller batches',
        'Visual management for instant status',
        'Standard work reduces variability',
      ],
      techniques: [
        'Gantt charts for scheduling',
        'Kanban for pull-based production',
        'SMED for quick changeover',
        '5S for workplace organization',
        'Andon for problem signaling',
      ],
      pitfalls: [
        'Optimizing non-bottleneck resources',
        'Large batch thinking (increases WIP)',
        'Hiding problems instead of surfacing',
        'Ignoring operator feedback',
        'Overloading capacity planning',
      ],
      quality: [
        'OEE > 85% world-class',
        'On-time delivery > 95%',
        'First pass yield > 98%',
        'Inventory turns > 12/year',
      ],
    },
  },

  leanSixSigma: {
    name: 'Lean / Six Sigma / Kaizen',
    triggers: ['lean', 'six sigma', 'kaizen', 'continuous improvement', 'waste', 'muda', 'value stream', 'dmaic', 'pdca', '5 why', 'root cause', 'poka-yoke', 'standard work', 'gemba', 'hoshin'],
    expertise: {
      principles: [
        '8 wastes: DOWNTIME (Defects, Overproduction, Waiting, Non-utilized talent, Transportation, Inventory, Motion, Extra processing)',
        'Go to gemba — see the actual place',
        'Respect for people — engage those doing the work',
        'Flow > batch processing',
        'Perfect is the enemy of better — iterate',
      ],
      techniques: [
        'Value stream mapping for waste identification',
        'DMAIC: Define, Measure, Analyze, Improve, Control',
        'PDCA: Plan, Do, Check, Act',
        'A3 problem solving (one-page)',
        'Control charts for process monitoring',
      ],
      pitfalls: [
        'Tool-driven vs problem-driven approach',
        'Ignoring cultural change required',
        'Point kaizen without system thinking',
        'Not sustaining improvements',
        'Blaming people for system problems',
      ],
      quality: [
        'Six Sigma = 3.4 DPMO',
        'Cpk > 1.33 capable, > 1.67 excellent',
        'Cycle time reduction measured',
        'Cost of poor quality tracked',
      ],
    },
  },

  accounting: {
    name: 'Accounting / Finance',
    triggers: ['accounting', 'finance', 'cost', 'revenue', 'margin', 'overhead', 'depreciation', 'amortization', 'balance sheet', 'income statement', 'cash flow', 'variance', 'budget', 'actual'],
    expertise: {
      principles: [
        'Accrual accounting — recognize when earned, not when paid',
        'Matching principle — expenses match related revenues',
        'Materiality — focus on significant amounts',
        'Conservatism — recognize losses early, gains when realized',
        'Consistency — same methods period to period',
      ],
      techniques: [
        'Job costing for custom manufacturing',
        'Activity-based costing for overhead allocation',
        'Variance analysis (price, volume, mix)',
        'Break-even analysis',
        'Contribution margin analysis',
      ],
      pitfalls: [
        'Overhead allocation distorting true cost',
        'Ignoring opportunity cost',
        'Mixing cash and accrual',
        'Not reconciling regularly',
        'Hidden costs (quality, warranty, rework)',
      ],
      quality: [
        'Monthly close within 5 days',
        'Reconciliations balanced',
        'Audit-ready documentation',
        'Variance explanations for > 5%',
      ],
    },
  },

  quoting: {
    name: 'Quoting / Estimating',
    triggers: ['quote', 'estimate', 'bid', 'rfq', 'pricing', 'cost estimate', 'should cost', 'markup', 'margin', 'lead time', 'delivery'],
    expertise: {
      principles: [
        'Quote accuracy = competitive advantage',
        'Include ALL costs — material, labor, overhead, setup, tooling, inspection',
        'Risk premium for unknowns',
        'Learning curve on repeat orders',
        'Customer lifetime value > single order',
      ],
      techniques: [
        'Parametric estimating for early stage',
        'Bottom-up costing for detailed quotes',
        'Should-cost analysis for negotiation',
        'Historical actuals for calibration',
        'Monte Carlo for uncertainty quantification',
      ],
      pitfalls: [
        'Underestimating setup/programming time',
        'Missing secondary operations',
        'Ignoring material yield/scrap',
        'Not accounting for inspection time',
        'Optimistic cycle times',
      ],
      quality: [
        'Quote accuracy within 10% of actual',
        'Win rate tracking by segment',
        'Post-job cost analysis',
        'Margin by customer/part family',
      ],
    },
  },

  sales: {
    name: 'Sales',
    triggers: ['sales', 'selling', 'customer', 'prospect', 'lead', 'pipeline', 'close', 'negotiation', 'value proposition', 'objection', 'relationship', 'account'],
    expertise: {
      principles: [
        'Understand customer\'s problem before proposing solution',
        'Sell value, not features — ROI focus',
        'Trust is prerequisite for everything',
        'No is better than maybe — qualify early',
        'Follow up is where deals are won/lost',
      ],
      techniques: [
        'SPIN selling: Situation, Problem, Implication, Need-payoff',
        'Challenger Sale: Teach, Tailor, Take Control',
        'BANT qualification: Budget, Authority, Need, Timeline',
        'Objection handling framework',
        'Reference selling with case studies',
      ],
      pitfalls: [
        'Talking more than listening',
        'Leading with price',
        'Not understanding decision process',
        'Ignoring non-decision-maker influencers',
        'Promising what you can\'t deliver',
      ],
      quality: [
        'Win rate > 25%',
        'Sales cycle length decreasing',
        'Customer satisfaction score > 4.5/5',
        'Repeat business > 60%',
      ],
    },
  },

  webDesign: {
    name: 'Web Design',
    triggers: ['web design', 'website', 'html', 'css', 'responsive', 'mobile first', 'accessibility', 'wcag', 'seo', 'landing page', 'wireframe', 'mockup', 'prototype'],
    expertise: {
      principles: [
        'Mobile-first responsive design',
        'Accessibility is not optional (WCAG 2.1 AA)',
        'Performance is a feature (< 3s load)',
        'Progressive enhancement',
        'Content is king — design serves content',
      ],
      techniques: [
        'CSS Grid + Flexbox for layout',
        'CSS custom properties for theming',
        'Lazy loading for images',
        'Critical CSS inline, rest deferred',
        'Semantic HTML for accessibility',
      ],
      pitfalls: [
        'Desktop-first then cramming into mobile',
        'Ignoring color contrast ratios',
        'Missing alt text on images',
        'Blocking render with external resources',
        'Layout shifts on load (CLS)',
      ],
      quality: [
        'Lighthouse score > 90',
        'Core Web Vitals in green',
        'WCAG 2.1 AA compliance',
        'Works without JavaScript (basic)',
      ],
    },
  },

  uiux: {
    name: 'UI/UX Design',
    triggers: ['ui', 'ux', 'user experience', 'user interface', 'usability', 'interaction', 'journey', 'persona', 'wireframe', 'prototype', 'user research', 'a/b test', 'heuristic'],
    expertise: {
      principles: [
        'User-centered design — design WITH users, not FOR them',
        'Consistency reduces cognitive load',
        'Feedback for every action',
        'Error prevention > error recovery',
        'Recognition over recall',
      ],
      techniques: [
        'User journey mapping',
        'Card sorting for information architecture',
        'Usability testing (5 users find 85% of issues)',
        'Heuristic evaluation (Nielsen\'s 10)',
        'A/B testing for optimization',
      ],
      pitfalls: [
        'Designing for yourself, not users',
        'Too many choices (Hick\'s Law)',
        'Buried critical actions',
        'Inconsistent interaction patterns',
        'Ignoring error states',
      ],
      quality: [
        'Task success rate > 90%',
        'Time on task decreasing',
        'Error rate < 5%',
        'System Usability Scale > 68',
      ],
    },
  },
};

// ============================================================================
// DETECTION LOGIC
// ============================================================================

function detectDisciplines(prompt) {
  const lower = prompt.toLowerCase();
  const detected = [];

  for (const [key, discipline] of Object.entries(DISCIPLINES)) {
    const matchCount = discipline.triggers.filter(t => lower.includes(t)).length;
    if (matchCount > 0) {
      detected.push({ key, discipline, matchCount });
    }
  }

  // Sort by match count descending
  detected.sort((a, b) => b.matchCount - a.matchCount);

  // Return top 2 disciplines
  return detected.slice(0, 2);
}

function formatExpertise(discipline) {
  const lines = [];
  const exp = discipline.expertise;

  lines.push(`### ${discipline.name} Expert Mode`);
  lines.push('');

  lines.push('**Core Principles:**');
  for (const p of exp.principles.slice(0, 3)) {
    lines.push(`  • ${p}`);
  }

  lines.push('');
  lines.push('**Key Techniques:**');
  for (const t of exp.techniques.slice(0, 3)) {
    lines.push(`  • ${t}`);
  }

  lines.push('');
  lines.push('**Pitfalls to Avoid:**');
  for (const p of exp.pitfalls.slice(0, 3)) {
    lines.push(`  ✗ ${p}`);
  }

  lines.push('');
  lines.push('**Quality Criteria:**');
  for (const q of exp.quality.slice(0, 2)) {
    lines.push(`  ✓ ${q}`);
  }

  return lines.join('\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  if (_hp_shouldSkip("discipline-expert-inject")) { console.log(JSON.stringify({ continue: true })); return; }
  const input = readStdinSafe();
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = payload.prompt || payload.message || '';

  // Skip if too short
  if (!prompt || prompt.length < 20) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const detected = detectDisciplines(prompt);

  if (detected.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Rate-limit: skip if we've injected this same discipline set recently.
  const _rateNow = Date.now();
  const _rateState = _loadRate();
  const _rateKey = detected.map((d) => d.discipline).sort().join("+");
  const _lastAt = _rateState[_rateKey] ?? 0;
  if (_rateNow - _lastAt < _RATE_WINDOW_MS) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  _rateState[_rateKey] = _rateNow;
  for (const k of Object.keys(_rateState)) {
    if (_rateNow - _rateState[k] > _RATE_WINDOW_MS * 10) delete _rateState[k];
  }
  _saveRate(_rateState);

  const lines = [];
  lines.push('━'.repeat(70));
  lines.push('DISCIPLINE EXPERT INJECTION');
  lines.push('━'.repeat(70));
  lines.push('');

  for (const d of detected) {
    lines.push(formatExpertise(d.discipline));
    lines.push('');
  }

  lines.push('Apply this expertise throughout the task.');
  lines.push('━'.repeat(70));

  console.log(JSON.stringify({
    continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: lines.join('\n'),
      }
    }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
