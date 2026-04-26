# AI-Augmented Claude Enhancement Architecture

## Overview

PRISM's internal AI/ML/reasoning engines can augment Claude's capabilities through three integration points:

1. **Pre-prompt hooks** — Inject context/recommendations before Claude processes user input
2. **MCP actions** — Real-time reasoning invocations during task execution
3. **Post-session learning** — Feed outcomes back to learning engines

---

## 1. Pre-Prompt Augmentation (Hooks)

### Existing Hooks (Active)
| Hook | Purpose | Fires On |
|------|---------|----------|
| `ai-deep-intelligence.mjs` | Injects complete AI capability inventory (55+ commands, triggers) | SessionStart |
| `ai-system-router-inject.mjs` | Routes task to optimal backend (Opus/Ollama/Docker) | UserPromptSubmit |
| `ai-feature-recommend.mjs` | Recommends relevant engines for task | UserPromptSubmit |
| `local-compute-intent.mjs` | Detects local LLM/batch intent, starts Ollama/Docker | UserPromptSubmit |
| `ai-reasoning-inject.mjs` | Injects reasoning patterns for complex tasks | UserPromptSubmit |

### New Hooks to Build
| Hook | Purpose | Integration |
|------|---------|-------------|
| `session-learning-feedback.mjs` | Captures task success/failure for learning | Stop |
| `reasoning-pattern-suggest.mjs` | Suggests reasoning approach (deductive/inductive/analogical) | PreToolUse |
| `physics-formula-inject.mjs` | Auto-injects relevant physics formulas for calculations | UserPromptSubmit |

---

## 2. Real-Time MCP Actions

### Core AI Dispatchers
```
prism_ai        — 45+ actions (deep_reason, deep_learn, deep_logic, extended_think)
prism_intelligence — 50+ actions (physics_validate, ml_predict, pattern_match)
prism_calc      — 200+ actions (manufacturing physics calculations)
```

### Key Actions for Claude Enhancement
```typescript
// Deep reasoning before complex decisions
prism_ai.deep_reason({ problem, context, mode: "multi_path" })

// Physics validation for manufacturing claims
prism_intelligence.physics_validate({ formula, inputs, expected })

// Route task to optimal backend
prism_intelligence.ai_route({ task: "engine building" })
// → { primary: "claude-opus", fallback: ["claude-sonnet"], reason: "..." }

// Pattern search in tribal knowledge
prism_intelligence.search_tribal({ query: "thin wall machining" })

// Extended thinking for complex tradeoffs
prism_ai.extended_think({ problem, aspects: ["cost", "time", "quality", "risk"] })
```

### Invocation Strategy
Claude should invoke these actions at key decision points:
1. **Before creating new code** → `prism_intelligence.dedup_check`
2. **Before physics calculations** → `prism_calc.get_formula` + validate
3. **For complex tradeoffs** → `prism_ai.extended_think`
4. **For unknown domains** → `prism_intelligence.search_tribal`

---

## 3. Post-Session Learning

### Feedback Loop
```
┌─────────────────────────────────────────────────────────────┐
│  Claude Session                                             │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐                   │
│  │ Task 1  │ → │ Task 2  │ → │ Task 3  │  → Session End     │
│  └────┬────┘   └────┬────┘   └────┬────┘        │           │
│       │             │             │             ▼           │
│       ▼             ▼             ▼     ┌──────────────┐    │
│  [outcome]     [outcome]     [outcome]  │ Stop Hook    │    │
│                                         │ session-learn│    │
└─────────────────────────────────────────┴──────┬───────┘────┘
                                                 │
                                                 ▼
                                    ┌────────────────────────┐
                                    │ OutcomeCaptureBus      │
                                    │ - task_id              │
                                    │ - success/fail         │
                                    │ - approach_used        │
                                    │ - time_taken           │
                                    │ - tokens_spent         │
                                    └────────────┬───────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────┐
                    │                            │                    │
                    ▼                            ▼                    ▼
        ┌───────────────────┐    ┌───────────────────┐   ┌───────────────────┐
        │ ErrorPatternMemory│    │ SuccessPatternBank│   │ TokenEconomyEngine│
        │ (error→fix pairs) │    │ (approach→outcome)│   │ (cost optimization)│
        └───────────────────┘    └───────────────────┘   └───────────────────┘
```

### Learning Engines to Wire
| Engine | Purpose | Current State |
|--------|---------|---------------|
| `ErrorPatternMemoryEngine` | Tracks error→fix pairs | Active (hook wired) |
| `SuccessPatternBankEngine` | Records successful approaches | TO BUILD |
| `TokenEconomyEngine` | Optimizes token spending | Active |
| `SessionLearningEngine` | Cross-session pattern recognition | TO BUILD |
| `ApproachEffectivenessEngine` | Measures approach success rates | TO BUILD |

---

## 4. Engine Inventory (Available Today)

### Reasoning Engines
```
CAMAGIReasoningEngine        — CAM-specific AGI reasoning
CausalReasoningEngine        — Causal inference chains
TemporalReasoningEngine      — Time-sequence reasoning
MultiAssetReasoningEngine    — Cross-asset reasoning
```

### Deep Learning Engines
```
FusionDeepLearningEngine     — Fusion 360 pattern learning
MastercamDeepLearningEngine  — Mastercam pattern learning
MillDeepLearningEngine       — Milling pattern learning
PostProcessorDeepLearningEngine — Post-processor learning
```

### Intelligence Engines
```
DeepAIIntelligenceEngine     — Chain/tree/multi-path thinking
AIFeatureAutoRegistryEngine  — Auto-discovers AI features
AISystemRouterEngine         — Routes to optimal AI backend
PRISMSelfAwarenessEngine     — Self-knowledge + capability index
```

### Learning Engines
```
CAMFeatureLearningEngine     — Learns CAM feature patterns
CAMLoRAEngine / CAMLoRAAdapterTrainerEngine — LoRA fine-tuning
CADTrialErrorLearningEngine  — Learns from CAD failures
LatheLoRAReasoningEvaluatorEngine — Evaluates lathe reasoning
```

---

## 5. Implementation Roadmap

### Phase 1: Wire Existing Hooks (Now)
- [x] `ai-deep-intelligence.mjs` — SessionStart
- [x] `ai-system-router-inject.mjs` — UserPromptSubmit  
- [x] `ai-feature-recommend.mjs` — UserPromptSubmit
- [x] `local-compute-intent.mjs` — UserPromptSubmit
- [ ] Verify all hooks fire correctly

### Phase 2: Session Learning Loop (Next)
- [ ] Build `session-learning-feedback.mjs` Stop hook
- [ ] Wire to OutcomeCaptureBus
- [ ] Build SuccessPatternBankEngine
- [ ] Build SessionLearningEngine

### Phase 3: Real-Time Augmentation (After)
- [ ] Build `reasoning-pattern-suggest.mjs` PreToolUse hook
- [ ] Integrate with DeepAIIntelligenceEngine
- [ ] Add automatic physics formula injection
- [ ] Add tribal knowledge auto-search

### Phase 4: Cross-Session Intelligence (Future)
- [ ] Pattern recognition across sessions
- [ ] Personalized Claude behavior tuning
- [ ] Automatic capability evolution

---

## 6. Quick Start: How to Use Today

### In Any Session
```typescript
// 1. Check AI capabilities for task
prism_intelligence.recommend_features({ task: "build lathe cycle engine" })
// → Lists relevant engines, skills, MCP actions

// 2. Route to optimal backend
prism_intelligence.ai_route({ task: "batch process 500 programs" })
// → { primary: "docker-batch-processor", reason: "..." }

// 3. Deep reasoning for complex problems
prism_ai.deep_reason({
  problem: "How should we structure the new threading module?",
  mode: "tree_of_thought",
  aspects: ["maintainability", "performance", "extensibility"]
})

// 4. Search tribal knowledge
prism_intelligence.search_tribal({ query: "aluminum thin wall" })
// → Returns shop floor tips and playbook rules
```

### Via Hooks (Automatic)
The following fire automatically without Claude action:
- SessionStart → AI capability inventory injected
- UserPromptSubmit → Task routed, features recommended
- Stop → Session metrics captured

---

## 7. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLAUDE SESSION                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────────────────────────────────────┐   │
│  │ SessionStart │ ─► │ ai-deep-intelligence.mjs                     │   │
│  │ Hook         │    │ Injects: 55+ commands, triggers, engines     │   │
│  └──────────────┘    └──────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────┐    ┌──────────────────────────────────────────────┐   │
│  │ UserPrompt   │ ─► │ ai-system-router-inject.mjs                  │   │
│  │ Submit Hook  │    │ Routes: Opus vs Ollama vs Docker             │   │
│  └──────────────┘    │ ai-feature-recommend.mjs                     │   │
│         │            │ Recommends: relevant engines                  │   │
│         │            │ local-compute-intent.mjs                      │   │
│         │            │ Detects: embeddings, batch, inference intent  │   │
│         ▼            └──────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    MCP DISPATCHER LAYER                          │   │
│  │  prism_ai       prism_intelligence       prism_calc              │   │
│  │  ├─ deep_reason ├─ physics_validate      ├─ speed_feed           │   │
│  │  ├─ deep_learn  ├─ ai_route              ├─ cutting_force        │   │
│  │  ├─ deep_logic  ├─ search_tribal         ├─ deflection           │   │
│  │  └─ extended... ├─ recommend_features    └─ ...                  │   │
│  │                 └─ dedup_check                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                   │                                      │
│                                   ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      ENGINE LAYER                                 │   │
│  │  DeepAIIntelligenceEngine   AISystemRouterEngine                 │   │
│  │  PRISMSelfAwarenessEngine   AIFeatureAutoRegistryEngine          │   │
│  │  CAMAGIReasoningEngine      CausalReasoningEngine                │   │
│  │  ErrorPatternMemoryEngine   TokenEconomyEngine                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────┐    ┌──────────────────────────────────────────────┐   │
│  │ Stop Hook    │ ─► │ session-learning-feedback.mjs (TO BUILD)     │   │
│  │              │    │ Captures: outcomes, patterns, token spend     │   │
│  └──────────────┘    └──────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL AI BACKENDS                                  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────────┐          │
│  │ Ollama   │  │ Docker       │  │ PRISM MCP Server          │          │
│  │ codellama│  │ physics-agent│  │ (embedded in session)     │          │
│  │ deepseek │  │ batch-proc   │  │                           │          │
│  └──────────┘  └──────────────┘  └───────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Summary

PRISM's AI infrastructure can significantly enhance Claude through:

1. **Automatic context injection** via 5+ existing hooks
2. **Real-time reasoning** via 100+ MCP actions across 3 AI dispatchers
3. **Learning from outcomes** via OutcomeCaptureBus + learning engines (partially wired)

The architecture is already 60% complete. Key gaps:
- Session outcome → learning loop (Stop hook)
- SuccessPatternBankEngine (new engine)
- Cross-session pattern recognition (SessionLearningEngine)

Next action: Build `session-learning-feedback.mjs` Stop hook to close the learning loop.
