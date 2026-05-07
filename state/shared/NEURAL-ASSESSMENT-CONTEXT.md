# PRISM XPROC-NEURAL — Optimization Assessment Context

**Purpose:** Briefing doc for 5-way review (3 Claude + Codex + Gemini) of how
fully the PRISM neural-network stack utilizes ecosystem assets.

**Branch state @ HEAD `b7558cd41`** on `cad-fusion-live-ms0`:
- 47/47 XPROC-NEURAL engines on disk (Tiers 1-12)
- 161 xproc_* dispatcher actions, dual-wired into `prism_intelligence` AND `prism_ai` (CI-enforced symmetry)
- T1-02 = pure-JS MLP `32 → 16 → 3` with Xavier init + SGD-momentum
  (NO Adam, NO BatchNorm, NO dropout, NO residual connections, NO attention)
- E2E convergence test passes 11/11 on synthetic shop-floor data

---

## What's on H: drive that the network could be using

### Test-shop assets (`H:/prism/JM DIE/`)
- 24,545 production NC files across 100+ customers (ITW, Alcoa, Optimas, SFS, Holo-Krome)
- Real shop-floor outcome history (production ran, parts shipped, scrap, rework)
- Customer-specific tribal preferences (which feed/speed each shop runs)
- 21 machines across mill / lathe / WEDM / sinker / grinder / welder

### Knowledge wiki (`H:/prism/knowledge/wiki/`)
- 722-entry catalog (575 engines + 90 dispatchers + 57 memories)
- `concepts/`, `entities/`, `decisions/`, `patterns/`, `trajectories/`,
  `lessons/`, `code-tribal/`, `architecture/`, `software-engineering/`, `ux-design/`
- 3,700+ tribal tips (PRISMSelfAwarenessEngine.searchTribalKnowledge)
- 296 experiential playbook rules (searchPlaybookRules)

### Memories (`C:/Users/wompu/.claude/projects/H--prism/memory/`)
- `feedback_*.md` — corrections + validations from prior conversations
- `user_*.md` — operator profile, multi-terminal workflow
- `project_*.md` — current milestones, CAD bridge, etc.
- `reference_*.md` — pointers to external systems

### Resources/ folder (`H:/prism/Resources/`)
- Custom CAM post-processors mid-modification (Mastercam, hyperMILL, etc.)
- Reference NC programs, controller manuals, material datasheets

### Master indexes
- `PRISM-INVENTORY-LATEST.md` — 3146 engines / 96 dispatchers / 7042 actions
- `mcp-server/data/docs/ENGINE_DIGEST.md` (stale since 2026-04-22)
- `mcp-server/data/docs/DISPATCHER_DIGEST.md`
- `mcp-server/data/state/BASELINE_INVENTORY.json`
- `state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md`
- `state/shared/PRISM_SHARED_INDEX_SURFACES.md`

### Physics constants (`mcp-server/src/physics/constants.ts`)
- Kienzle kc1.1 per ISO group (P=1800, M=2100, K=1100, N=700, S=2800, H=3200)
- Taylor C, n exponents per material
- Material density, modulus, hardness, thermal conductivity tables
- Johnson-Cook flow stress params
- Tool wear, deflection, thermal coupling constants

### Existing physics engines (potentially feature-extractable)
- KienzleForceModel, CuttingForceEngine, StochasticCuttingForce (force prediction)
- ChatterStabilityLobeEngine, RegenerativeChatter, DampingOptimization (stability)
- ToolWearProgression, AdvancedWearPhysics, StochasticToolLife Weibull (wear)
- ToolDeflection, PartDeflection, BoringBarDeflection (deflection)
- CuttingTemperature, ThermalWearCoupling RK4 ODE, CryogenicCutting (thermal)
- SurfaceFinishPredictor, SurfaceIntegrity, ResidualStress (surface)
- 40 CAM bridges (per-CAM strategy engines for 18 CAM systems)

### Cross-domain reasoning
- `CrossDisciplinaryDeepLearningEngine` (15 scientific domains, 120+ formulas)
- `prismCreativeReasoningEngine.explore(problem, "optimal")` for cross-domain synthesis
- Ollama qwen2.5-coder:7b + Docker batch-processor for offload

---

## What the neural network actually consumes

### T1-02 NeuralLearningEngine (the only ML-trained thing on disk)
- **Architecture**: 32-input MLP → 16 hidden tanh → 3 softmax output classes
- **Inputs (32 features)**: Hashed categorical (material/tool/op/machine/customer/quality_tier) + 7 numerics (tool_diameter_mm, depth_of_cut_mm, workpiece_thickness_mm, target_ra_um, spindle_rpm, feed_rate_mm_min, cutting_speed_m_min) + zero-padded slack
- **Output classes**: `success` / `failure` / `operator_override`
- **Training data source**: `CrossProcessOutcomeStore` (in-memory event ledger, max ~10K events)
- **Optimizer**: SGD with momentum 0.9, lr 0.01, batch 32, epochs configurable
- **Loss**: Cross-entropy
- **Init**: Xavier (Glorot) uniform
- **NO**: dropout, BatchNorm, LayerNorm, residual/skip connections, attention,
  Adam/AdamW, learning rate scheduling, weight decay, label smoothing,
  data augmentation, early stopping, checkpointing during training

### What the network does NOT consume
- ❌ JM Die's 24,545 production NC programs (no parser → outcome event flow)
- ❌ Wiki's 3,700 tribal tips (no embedding + retrieval-augmented prediction)
- ❌ Memories (no learned-feedback ingestion)
- ❌ Existing physics engines (no Kienzle/Taylor/chatter outputs as features)
- ❌ Sensor streams (no spindle load, vibration, thermal, audio integration despite T10-02/03/04 fusion engines existing on this branch)
- ❌ CAM strategy engines (no toolpath features)
- ❌ Cross-disciplinary deep learning (no formula composition)
- ❌ Material/Taylor constants (no physics-informed features)

### Tier 2-12 engines that EXIST but aren't wired to the live training pipeline
- T2 Memory & Replay (4 engines): episodic memory, prioritized replay, sampler, semantic linker — NOT consumed by T1-02 training
- T3 Online Learning & Drift (4 engines): online MLP updater, drift detector,
  shift handler, EWC memory preservation — NOT triggered by outcome events
- T4 RL (4 engines): reward shaper, policy gradient, Q-learning, bandit — NOT
  receiving rewards from operator overrides / safety vetoes
- T5 Bayesian (4): Bayesian MLP, conformal prediction, deep ensemble,
  calibration auditor — NOT wrapping T1-02 predictions
- T6 Federated (4): FedAvg, secure agg, drift-aware fed, scheduler — NOT
  aggregating across multiple shops (only one shop in scope: JM Die)
- T7 Meta (4): MAML-Lite, ProtoNet, learned LR, hyperparameter tuner — NOT
  meta-training across material/machine clusters
- T8 Neuro-Symbolic (4): symbolic constraint enforcer, rule extracted neural,
  safety verifier, formula-neural ensemble — NOT enforcing physics envelopes
  on T1-02 outputs
- T9 Causal (4): causal graph learner, do-calculus, counterfactual, mediation
  — NOT building causal DAG over outcome events
- T10 Multi-modal Fusion (4): vision/timeseries/audio/modality dropout — NOT
  receiving blueprint OCR / sensor / microphone inputs
- T11 Active Learning (4): uncertainty sampler, novelty detector, curiosity
  exploration, Bayesian DOE — NOT selecting next experiment
- T12 Master Orchestration (2): tier router, hierarchical neural orchestrator
  — NOT routing queries through the tier stack

### What the test harness proves
- Synthetic 3-class dataset with hand-engineered separability
- 100 records per class, 80/20 train/val split
- Loss reduces ≥30% in 30 epochs
- Train accuracy >60%, val accuracy >50%, gen gap <35%
- Determinism, no mode collapse, softmax invariant
- Per-class centroid argmax correctly

### What the test harness does NOT prove
- Real shop-floor data integration
- Physics-informed feature usefulness
- Calibration on real predictions
- Multi-shop generalization
- Drift detection on actual time-evolving distributions
- RL from operator overrides
- Causal effects vs correlations
- Multi-modal fusion benefit

---

## Operational rules in `H:/prism/CLAUDE.md` and `~/.claude/CLAUDE.md`

- **Omega target = 1.0** for all milestones (user explicit)
- **Always build, never skip** — gap analyses must build every identified engine
- **Wire to all consumers** — reasoning engines belong on `prism_intelligence` AND `prism_ai`
- **No physics-constant inlining** — import from `src/physics/constants.ts`
- **Karpathy discipline** — classify, technique, edge cases, failure modes, then code
- **Operator-in-the-loop unconditional** — no autonomous shop-floor action without approval
- **Tiered safety gates**: shop-floor Ω≥0.95, S(x)≥0.98 (five-sigma);
  production Ω≥0.90; sim Ω≥0.70

---

## The question the 5 reviewers must answer

**Are we fully utilizing everything in the PRISM ecosystem to make the
neural network optimal? If not, what are the highest-leverage gaps?**

Each reviewer takes a different angle (see invocation prompts).
