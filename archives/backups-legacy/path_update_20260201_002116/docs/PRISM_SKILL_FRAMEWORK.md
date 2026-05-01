# PRISM SUPERPOWERS SKILL FRAMEWORK
## Master Architecture for AI-Assisted Manufacturing Intelligence Development
### Version 1.0 | SP.0.1 Deliverable | January 24, 2026

---

# PART 1: EXECUTIVE OVERVIEW

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                         PRISM SUPERPOWERS SKILL FRAMEWORK                                  ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║   PURPOSE: Define the complete architecture for PRISM's AI skill system                   ║
║                                                                                           ║
║   ┌─────────────────────────────────────────────────────────────────────────────────┐     ║
║   │  EXISTING SKILLS:     59  (Domain knowledge, expert roles, references)          │     ║
║   │  SUPERPOWERS SKILLS:  42  (Development workflow, app guidance, anti-patterns)   │     ║
║   │  TOTAL SKILLS:       101  (Complete manufacturing intelligence coverage)        │     ║
║   └─────────────────────────────────────────────────────────────────────────────────┘     ║
║                                                                                           ║
║   TWO-TIER ARCHITECTURE:                                                                  ║
║   ══════════════════════                                                                  ║
║                                                                                           ║
║   TIER 1: Battle-Ready Prompt (~625 tokens)                                               ║
║           • Always loaded, zero extra cost                                                ║
║           • Activation triggers ("Use 4-phase debugging")                                 ║
║           • Quick reference, always-on reminders                                          ║
║                     │                                                                     ║
║                     ▼                                                                     ║
║   TIER 2: Detailed Skills (30-150KB each)                                                 ║
║           • Loaded on-demand when triggered                                               ║
║           • Step-by-step methodology                                                      ║
║           • Examples, edge cases, anti-patterns                                           ║
║                                                                                           ║
║   BENEFIT: Prompt says WHAT → Skills explain HOW                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

# PART 2: TWO-TIER ARCHITECTURE

## 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PRISM SKILL ARCHITECTURE                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ╔═══════════════════════════════════════════════════════════════════════════════════╗  │
│  ║  TIER 1: BATTLE-READY PROMPT (Always Active)                                      ║  │
│  ║  ─────────────────────────────────────────────────────────────────────────────    ║  │
│  ║  • Session start protocol (state file, IN_PROGRESS check)                         ║  │
│  ║  • Skill activation triggers (keywords → skill names)                             ║  │
│  ║  • Defensive gates (validate paths, read-before-write)                            ║  │
│  ║  • Predictive protocols (buffer zones, complexity estimation)                     ║  │
│  ║  • Recovery triggers (compaction, interruption)                                   ║  │
│  ║  • 10 Commandments (guiding principles)                                           ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════════╝  │
│                                      │                                                  │
│                                      │ TRIGGERS                                         │
│                                      ▼                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  TIER 2: SKILL LIBRARY (Loaded On-Demand)                                         │  │
│  │  ─────────────────────────────────────────────────────────────────────────────    │  │
│  │                                                                                   │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                  │  │
│  │  │ DEVELOPMENT │ │ APPLICATION │ │   DOMAIN    │ │    ANTI-   │                  │  │
│  │  │   WORKFLOW  │ │  GUIDANCE   │ │  EXPERTISE  │ │  PATTERNS  │                  │  │
│  │  │  (SP.1-2)   │ │  (SP.4-5)   │ │ (Existing)  │ │   (SP.3)   │                  │  │
│  │  ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤                  │  │
│  │  │ brainstorm  │ │ material-   │ │ materials   │ │ anti-      │                  │  │
│  │  │ planning    │ │ guide       │ │ machines    │ │ extraction │                  │  │
│  │  │ execution   │ │ speed-feed  │ │ tools       │ │ anti-      │                  │  │
│  │  │ review      │ │ tool-select │ │ G-code      │ │ wiring     │                  │  │
│  │  │ debugging   │ │ troubleshoot│ │ physics     │ │ anti-state │                  │  │
│  │  │ verification│ │ quality     │ │ experts     │ │ anti-test  │                  │  │
│  │  │ handoff     │ │ cost        │ │ references  │ │            │                  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘                  │  │
│  │                                                                                   │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                                  │
│                                      │ COMPOSE                                          │
│                                      ▼                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  SKILL COMPOSITION ENGINE                                                         │  │
│  │  ─────────────────────────────────────────────────────────────────────────────    │  │
│  │  • Combines 1-3 skills for complex tasks                                          │  │
│  │  • Resolves conflicts (precedence rules)                                          │  │
│  │  • Tracks evidence requirements across skills                                     │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Tier Responsibilities

| Aspect | Tier 1 (Prompt) | Tier 2 (Skills) |
|--------|-----------------|-----------------|
| **Size** | ~625 tokens | 30-150KB each |
| **Loading** | Always present | On-demand |
| **Content** | Triggers, reminders | Full methodology |
| **Depth** | "What to do" | "How to do it" |
| **Examples** | None | Extensive |
| **Anti-patterns** | Mentioned | Detailed with failures |
| **Updates** | Rare (prompt change) | Frequent (skill files) |

## 2.3 Activation Flow

```
USER REQUEST
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ TIER 1: Pattern Match in Prompt                                 │
│ ─────────────────────────────────────────────────────────────── │
│ "debug" → prism-sp-debugging                                    │
│ "extract" → prism-sp-extraction                                 │
│ "material" → prism-material-template + prism-sp-materials       │
│ "speed/feed" → prism-product-calculators + prism-app-speed-feed │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ SKILL LOADER                                                    │
│ ─────────────────────────────────────────────────────────────── │
│ view("/mnt/skills/user/prism-[skill]/SKILL.md")                 │
│ → Read COMPLETE skill before acting                             │
│ → If multiple skills: load in priority order                    │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ EXECUTE WITH SKILL GUIDANCE                                     │
│ ─────────────────────────────────────────────────────────────── │
│ → Follow skill's step-by-step process                           │
│ → Collect required evidence                                     │
│ → Check anti-patterns to avoid                                  │
│ → Verify completion per skill's criteria                        │
└─────────────────────────────────────────────────────────────────┘
```

---

# PART 3: COMPLETE SKILL TAXONOMY

## 3.1 Skill Categories Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              101 SKILLS BY CATEGORY                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  EXISTING SKILLS (59)                    SUPERPOWERS SKILLS (42)                        │
│  ════════════════════                    ═══════════════════════                        │
│                                                                                         │
│  Core Development .......... 9          SP Development Workflow ... 8   (SP.1)         │
│  Monolith Navigation ....... 3          SP Specialized Dev ....... 12   (SP.2)         │
│  Materials System .......... 5          SP Anti-Patterns/Diagrams . 8   (SP.3)         │
│  Session Management ........ 4          SP App Workflows ......... 12   (SP.4)         │
│  Quality & Validation ...... 6          SP App Assistance ........ 10   (SP.5)         │
│  Code & Architecture ....... 6                                                          │
│  Context Management ........ 4          [Infrastructure components                      │
│  Knowledge Base ............ 2           created in SP.6 but not                        │
│  AI Expert Roles .......... 10           counted as skills]                             │
│  Reference Skills .......... 9                                                          │
│  Utility ................... 1                                                          │
│  ─────────────────────────────          ─────────────────────────────                   │
│  TOTAL: 59                              TOTAL: 42 (+8 infrastructure)                   │
│                                                                                         │
│  GRAND TOTAL: 101 SKILLS                                                                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Existing Skills (59) - Detailed Registry

### Core Development (9)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| E01 | prism-development | ~25KB | Core protocols, 10 Commandments | "develop", "build", "create" |
| E02 | prism-state-manager | ~20KB | Session state, CURRENT_STATE.json | "state", "session", "resume" |
| E03 | prism-extractor | ~35KB | Module extraction from monolith | "extract", "pull from" |
| E04 | prism-auditor | ~25KB | Verify extraction completeness | "audit", "verify", "check" |
| E05 | prism-utilization | ~30KB | 100% wiring enforcement | "wire", "connect", "utilize" |
| E06 | prism-consumer-mapper | ~25KB | Database→Consumer wiring | "map consumers", "who uses" |
| E07 | prism-hierarchy-manager | ~20KB | CORE→ENHANCED→USER→LEARNED | "layers", "hierarchy" |
| E08 | prism-swarm-orchestrator | ~30KB | Multi-agent parallel work | "parallel", "multi-agent" |
| E09 | prism-python-tools | ~25KB | Batch processing, automation | "batch", "automate", "script" |

### Monolith Navigation (3)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| E10 | prism-monolith-index | ~40KB | Pre-mapped line numbers | "find in monolith", "line number" |
| E11 | prism-monolith-navigator | ~30KB | Navigate 986K-line source | "navigate source", "search code" |
| E12 | prism-extraction-index | ~20KB | Track extraction progress | "extraction status", "what's extracted" |

### Materials System (5)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| E13 | prism-material-template | ~45KB | 127-parameter templates | "material", "127 parameters" |
| E14 | prism-material-templates | ~35KB | Category-specific templates | "category template", "steel template" |
| E15 | prism-material-lookup | ~25KB | Property lookup by ID | "look up material", "find property" |
| E16 | prism-physics-formulas | ~50KB | Kienzle, Johnson-Cook, Taylor | "Kienzle", "Johnson-Cook", "Taylor" |
| E17 | prism-physics-reference | ~40KB | Physics constants/equations | "physics constant", "equation" |

### Session Management (4)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| E18 | prism-session-handoff | ~20KB | End-of-session documentation | "end session", "handoff" |
| E19 | prism-session-buffer | ~15KB | Context preservation | "context", "preserve" |
| E20 | prism-task-continuity | ~20KB | Resume interrupted work | "resume", "continue", "pick up" |
| E21 | prism-planning | ~25KB | Multi-session planning | "plan", "roadmap", "schedule" |

### Quality & Validation (6)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| E22 | prism-validator | ~30KB | Input/output validation | "validate", "check input" |
| E23 | prism-verification | ~25KB | Code/data verification | "verify", "confirm correct" |
| E24 | prism-quality-gates | ~35KB | Stage gate checks | "gate", "stage check" |
| E25 | prism-tdd | ~30KB | Test-driven development | "test", "TDD" |
| E26 | prism-review | ~25KB | Code/design review | "review", "code review" |
| E27 | prism-debugging | ~40KB | Troubleshooting issues | "debug", "fix", "error" |

### Code & Architecture (6)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| E28 | prism-coding-patterns | ~45KB | PRISM coding standards | "code", "pattern", "standard" |
| E29 | prism-algorithm-selector | ~35KB | Choose right algorithm | "algorithm", "which approach" |
| E30 | prism-dependency-graph | ~25KB | Module dependencies | "dependency", "imports" |
| E31 | prism-tool-selector | ~20KB | Pick right tool | "which tool", "best tool" |
| E32 | prism-unit-converter | ~30KB | Unit conversion utilities | "convert", "units", "metric" |
| E33 | prism-large-file-writer | ~25KB | Writing files >1000 lines | "large file", ">1000 lines" |

### Context Management (4)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| E34 | prism-context-dna | ~20KB | Context compression | "compress context", "summarize" |
| E35 | prism-context-pressure | ~15KB | Manage context limits | "context limit", "running out" |
| E36 | prism-quick-start | ~15KB | Fast session startup | "quick start", "fast resume" |
| E37 | prism-category-defaults | ~25KB | Default values by category | "defaults", "standard values" |

### Knowledge Base (2)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| E38 | prism-knowledge-base | ~60KB | 220+ MIT/Stanford courses | "MIT course", "algorithm", "research" |
| E39 | prism-error-recovery | ~35KB | Error handling patterns | "recover", "error handling" |

### AI Expert Roles (10)
| ID | Skill | Size | Domain | Triggers |
|----|-------|------|--------|----------|
| E40 | prism-expert-cad-expert | ~40KB | CAD modeling, DFM | "CAD", "model", "DFM" |
| E41 | prism-expert-cam-programmer | ~45KB | Toolpath strategies | "CAM", "toolpath" |
| E42 | prism-expert-master-machinist | ~50KB | 40+ years troubleshooting | "machining problem", "shop floor" |
| E43 | prism-expert-materials-scientist | ~45KB | Metallurgy, heat treatment | "metallurgy", "heat treat" |
| E44 | prism-expert-mathematics | ~40KB | Matrix operations, numerical | "matrix", "numerical" |
| E45 | prism-expert-mechanical-engineer | ~45KB | Stress, deflection, FEA | "stress", "deflection", "FEA" |
| E46 | prism-expert-post-processor | ~40KB | G-code generation | "post", "G-code generation" |
| E47 | prism-expert-quality-control | ~35KB | SPC, Cp/Cpk, inspection | "SPC", "Cp/Cpk", "inspection" |
| E48 | prism-expert-quality-manager | ~35KB | ISO, PPAP, audit | "ISO", "PPAP", "audit" |
| E49 | prism-expert-thermodynamics | ~40KB | Heat transfer, thermal | "thermal", "heat", "temperature" |

### Reference Skills (9)
| ID | Skill | Size | Content | Triggers |
|----|-------|------|---------|----------|
| E50 | prism-gcode-reference | 87KB | Complete G/M-code | "G-code", "M-code" |
| E51 | prism-fanuc-programming | 98KB | FANUC 0i/30i/31i | "Fanuc", "Fanuc macro" |
| E52 | prism-siemens-programming | 85KB | SINUMERIK 840D/828D | "Siemens", "Sinumerik" |
| E53 | prism-heidenhain-programming | 86KB | TNC 640/530 | "Heidenhain", "TNC" |
| E54 | prism-wiring-templates | 89KB | DB→Consumer patterns | "wire template", "consumer pattern" |
| E55 | prism-manufacturing-tables | 141KB | Speeds, feeds, Kienzle | "speed table", "feed table" |
| E56 | prism-product-calculators | 128KB | Speed/Feed, Tool Life | "calculate", "speed/feed calc" |
| E57 | prism-error-catalog | 123KB | Error codes 1000-9999 | "error code", "error lookup" |
| E58 | prism-api-contracts | 170KB | 93 gateway routes | "API", "interface", "contract" |

### Utility (1)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| E59 | prism-derivation-helpers | ~20KB | Formula derivation aids | "derive", "calculate from" |



## 3.3 Superpowers Skills (42) - Detailed Registry

### SP.1: Development Workflow (8 Skills)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| SP01 | prism-sp-brainstorm | ~35KB | Socratic design, chunked approval | "brainstorm", "design", "plan feature" |
| SP02 | prism-sp-planning | ~40KB | Exact paths, complete code, 2-5 min tasks | "plan tasks", "break down", "schedule" |
| SP03 | prism-sp-execution | ~30KB | Checkpoint execution, progress tracking | "execute", "implement", "build" |
| SP04 | prism-sp-review-spec | ~25KB | Specification compliance gate | "review spec", "does it match" |
| SP05 | prism-sp-review-quality | ~25KB | Code quality gate | "review quality", "code quality" |
| SP06 | prism-sp-debugging | ~50KB | 4-phase mandatory debugging | "debug", "fix bug", "troubleshoot" |
| SP07 | prism-sp-verification | ~30KB | Evidence-based completion | "verify", "prove done", "evidence" |
| SP08 | prism-sp-handoff | ~25KB | Session transitions | "handoff", "end session", "transition" |

### SP.2: Specialized Development (12 Skills)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| SP09 | prism-sp-extraction | ~40KB | Module extraction methodology | "extract module", "pull from monolith" |
| SP10 | prism-sp-materials | ~35KB | Materials database work | "material database", "add material" |
| SP11 | prism-sp-machines | ~35KB | Machine database work | "machine database", "add machine" |
| SP12 | prism-sp-engines | ~40KB | Engine extraction/creation | "engine", "algorithm implementation" |
| SP13 | prism-sp-wiring | ~30KB | Consumer wiring methodology | "wire consumers", "connect database" |
| SP14 | prism-sp-testing | ~35KB | Test creation methodology | "create tests", "test coverage" |
| SP15 | prism-sp-migration | ~35KB | Code migration methodology | "migrate", "move to new arch" |
| SP16 | prism-sp-documentation | ~25KB | Documentation standards | "document", "write docs" |
| SP17 | prism-sp-performance | ~30KB | Performance optimization | "optimize", "performance", "speed up" |
| SP18 | prism-sp-refactoring | ~25KB | Code refactoring methodology | "refactor", "clean up code" |
| SP19 | prism-sp-integration | ~30KB | System integration | "integrate", "connect systems" |
| SP20 | prism-sp-deployment | ~25KB | Deployment procedures | "deploy", "release", "ship" |

### SP.3: Anti-Patterns & Diagrams (8 Skills)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| SP21 | prism-sp-anti-extraction | ~25KB | Extraction mistakes to avoid | "extraction mistake", "don't extract" |
| SP22 | prism-sp-anti-wiring | ~25KB | Wiring mistakes to avoid | "wiring mistake", "don't wire" |
| SP23 | prism-sp-anti-state | ~20KB | State management anti-patterns | "state mistake", "don't manage state" |
| SP24 | prism-sp-anti-testing | ~20KB | Testing anti-patterns | "testing mistake", "bad test" |
| SP25 | prism-sp-diagrams-workflow | ~30KB | DOT workflow diagrams | "workflow diagram", "process flow" |
| SP26 | prism-sp-diagrams-decision | ~30KB | DOT decision trees | "decision diagram", "decision tree" |
| SP27 | prism-sp-diagrams-arch | ~25KB | DOT architecture diagrams | "architecture diagram", "system diagram" |
| SP28 | prism-sp-diagrams-data | ~25KB | DOT data flow diagrams | "data flow", "data diagram" |

### SP.4: Application Workflows (12 Skills)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| SP29 | prism-app-material-guide | ~45KB | Material selection guidance | "select material", "which material" |
| SP30 | prism-app-speed-feed | ~50KB | Speed/feed calculation guidance | "speed and feed", "calculate cutting" |
| SP31 | prism-app-tool-select | ~40KB | Tool selection guidance | "select tool", "which tool" |
| SP32 | prism-app-machine-setup | ~35KB | Machine setup guidance | "setup machine", "machine config" |
| SP33 | prism-app-toolpath | ~40KB | Toolpath strategy guidance | "toolpath", "cutting strategy" |
| SP34 | prism-app-troubleshoot | ~55KB | Machining troubleshooting | "troubleshoot machining", "fix chatter" |
| SP35 | prism-app-quality | ~45KB | Quality assurance guidance | "quality check", "inspection plan" |
| SP36 | prism-app-cost | ~35KB | Cost estimation guidance | "estimate cost", "quote job" |
| SP37 | prism-app-post-debug | ~40KB | Post processor debugging | "debug post", "fix G-code" |
| SP38 | prism-app-fixture | ~35KB | Fixture design guidance | "fixture", "workholding" |
| SP39 | prism-app-cycle-time | ~35KB | Cycle time optimization | "cycle time", "reduce time" |
| SP40 | prism-app-quotes | ~30KB | Quote generation guidance | "generate quote", "pricing" |

### SP.5: Application Assistance (10 Skills)
| ID | Skill | Size | Purpose | Triggers |
|----|-------|------|---------|----------|
| SP41 | prism-app-explain-physics | ~35KB | Physics explanation (XAI) | "explain physics", "why this force" |
| SP42 | prism-app-explain-recs | ~30KB | Recommendation explanation | "explain recommendation", "why suggest" |
| SP43 | prism-app-confidence | ~25KB | Confidence interval guidance | "confidence", "how sure" |
| SP44 | prism-app-alternatives | ~30KB | Alternative suggestions | "alternatives", "other options" |
| SP45 | prism-app-learning | ~25KB | Learning from feedback | "learn from", "improve from" |
| SP46 | prism-app-safety | ~35KB | Safety guidance | "safety", "danger", "warning" |
| SP47 | prism-app-documentation | ~30KB | User documentation | "document for user", "help text" |
| SP48 | prism-app-diagrams | ~35KB | User-facing diagrams | "show diagram", "visualize" |
| SP49 | prism-app-anti-machining | ~40KB | Machining mistakes to avoid | "machining mistake", "don't machine" |
| SP50 | prism-app-onboarding | ~25KB | User onboarding | "new user", "getting started" |

---

# PART 4: ACTIVATION RULES ENGINE

## 4.1 Trigger Pattern Matching

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              ACTIVATION RULES ENGINE                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  RULE 1: EXACT MATCH (Highest Priority)                                                 │
│  ═══════════════════════════════════════                                                │
│  User says "use prism-sp-debugging" → Load that exact skill                             │
│                                                                                         │
│  RULE 2: KEYWORD TRIGGERS (Primary)                                                     │
│  ═══════════════════════════════════════                                                │
│  Keywords in user request match skill triggers:                                         │
│  "debug this error" → "debug" + "error" → prism-sp-debugging                            │
│                                                                                         │
│  RULE 3: CONTEXT INFERENCE (Secondary)                                                  │
│  ═══════════════════════════════════════                                                │
│  No explicit trigger but context implies:                                               │
│  [Working on materials] + "add steel" → prism-sp-materials                              │
│                                                                                         │
│  RULE 4: TASK TYPE MAPPING (Fallback)                                                   │
│  ═══════════════════════════════════════                                                │
│  Task category maps to default skills:                                                  │
│  "Development" → prism-sp-execution + prism-coding-patterns                             │
│                                                                                         │
│  RULE 5: COMPOSITION (Complex Tasks)                                                    │
│  ═══════════════════════════════════════                                                │
│  Multiple triggers → Load multiple skills in priority order                             │
│  "extract and test material module" → prism-sp-extraction + prism-sp-testing            │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Trigger Precedence Matrix

| Precedence | Category | Example | Behavior |
|------------|----------|---------|----------|
| 1 (Highest) | Explicit skill name | "use prism-sp-debugging" | Load exact skill |
| 2 | Development workflow | "brainstorm", "debug", "verify" | Load SP.1 skill |
| 3 | Application guidance | "speed/feed", "troubleshoot" | Load SP.4-5 skill |
| 4 | Domain expertise | "Fanuc macro", "heat treatment" | Load existing expert skill |
| 5 | Anti-pattern mention | "what not to do", "mistakes" | Load SP.3 anti-pattern |
| 6 | General category | "materials", "machines" | Load domain + SP specialized |
| 7 (Lowest) | No match | Generic request | Use prompt guidance only |

## 4.3 Multi-Skill Loading Rules

```javascript
// SKILL LOADING ALGORITHM

function loadSkillsForTask(request, context) {
  const skills = [];
  
  // Step 1: Check for explicit skill mentions
  const explicitSkills = extractExplicitSkills(request);
  if (explicitSkills.length > 0) {
    skills.push(...explicitSkills);
  }
  
  // Step 2: Match keyword triggers
  const keywordMatches = matchTriggers(request, TRIGGER_DATABASE);
  skills.push(...keywordMatches);
  
  // Step 3: Add context-implied skills
  if (context.currentPhase === "extraction") {
    skills.push("prism-sp-extraction");
  }
  if (context.currentPhase === "materials") {
    skills.push("prism-sp-materials");
  }
  
  // Step 4: Add workflow skills for development tasks
  if (isDevelopmentTask(request)) {
    if (!skills.includes("prism-sp-execution")) {
      skills.push("prism-sp-execution");
    }
  }
  
  // Step 5: Deduplicate and limit to 3 primary skills
  const uniqueSkills = [...new Set(skills)];
  const primarySkills = uniqueSkills.slice(0, 3);
  
  // Step 6: Add anti-pattern skill if relevant
  const antiPattern = findRelevantAntiPattern(primarySkills);
  if (antiPattern) {
    primarySkills.push(antiPattern);
  }
  
  return primarySkills;
}
```

## 4.4 Skill Combination Matrix

| Primary Task | Skill 1 (Lead) | Skill 2 (Support) | Skill 3 (Reference) |
|--------------|----------------|-------------------|---------------------|
| Extract module | prism-sp-extraction | prism-monolith-index | prism-sp-anti-extraction |
| Add material | prism-sp-materials | prism-material-template | prism-physics-formulas |
| Debug issue | prism-sp-debugging | prism-error-catalog | prism-expert-master-machinist |
| Create test | prism-sp-testing | prism-tdd | prism-sp-anti-testing |
| Wire database | prism-sp-wiring | prism-consumer-mapper | prism-wiring-templates |
| Speed/feed calc | prism-app-speed-feed | prism-product-calculators | prism-manufacturing-tables |
| G-code work | prism-gcode-reference | prism-[controller]-programming | prism-expert-post-processor |
| Toolpath strategy | prism-app-toolpath | prism-expert-cam-programmer | prism-app-tool-select |
| Troubleshoot machining | prism-app-troubleshoot | prism-expert-master-machinist | prism-app-safety |
| End session | prism-sp-handoff | prism-session-handoff | prism-state-manager |



---

# PART 5: SKILL ANATOMY (Standard Structure)

## 5.1 Superpowers Skill Template

Every Superpowers skill MUST follow this structure:

```markdown
---
name: prism-sp-[name]
version: 1.0.0
category: [development-workflow | specialized-dev | anti-patterns | app-workflow | app-assistance]
size: ~[XX]KB
triggers: ["keyword1", "keyword2", "phrase"]
requires: [prerequisite skills if any]
provides: [capabilities this skill enables]
evidence_required: [list of evidence types needed for completion]
---

# SKILL NAME
## [Subtitle describing purpose]
### Version X.X | Created [Date]

---

# SECTION 1: OVERVIEW

## 1.1 Purpose
[What this skill accomplishes - 2-3 sentences]

## 1.2 When to Use
[Specific scenarios that trigger this skill]

## 1.3 Prerequisites
[What must be true before using this skill]

## 1.4 Outputs
[What this skill produces when complete]

---

# SECTION 2: THE PROCESS

## 2.1 Quick Reference (Checklist)
☐ Step 1: [Brief description]
☐ Step 2: [Brief description]
☐ Step 3: [Brief description]
...

## 2.2 Detailed Steps

### Step 1: [Name]
**Purpose:** [Why this step]
**Actions:**
1. [Specific action]
2. [Specific action]
**Verification:** [How to confirm step complete]

### Step 2: [Name]
[Same structure...]

---

# SECTION 3: EXAMPLES

## 3.1 Example 1: [Scenario Name]
**Context:** [Setup]
**Input:** [What was given]
**Process:** [How skill was applied]
**Output:** [What was produced]
**Evidence:** [How completion was verified]

## 3.2 Example 2: [Different Scenario]
[Same structure...]

---

# SECTION 4: ANTI-PATTERNS

## 4.1 Common Mistakes

### Mistake 1: [Name]
**What happens:** [Description of failure]
**Why it's wrong:** [Root cause]
**What to do instead:** [Correct approach]
**Detection:** [How to know you're making this mistake]

### Mistake 2: [Name]
[Same structure...]

---

# SECTION 5: EDGE CASES

## 5.1 [Edge Case 1]
**Scenario:** [Description]
**Challenge:** [What makes this difficult]
**Solution:** [How to handle]

---

# SECTION 6: EVIDENCE REQUIREMENTS

## 6.1 Required Evidence for "Done"
| Evidence Type | How to Capture | Example |
|---------------|----------------|---------|
| [Type 1] | [Method] | [Sample] |
| [Type 2] | [Method] | [Sample] |

## 6.2 Evidence Checklist
☐ [Evidence item 1]
☐ [Evidence item 2]
☐ [Evidence item 3]

---

# SECTION 7: INTEGRATION

## 7.1 Works With
| Skill | How They Combine |
|-------|------------------|
| [Skill 1] | [Integration pattern] |

## 7.2 Conflicts With
| Skill | Why | Resolution |
|-------|-----|------------|
| [Skill] | [Reason] | [How to resolve] |

---

# SECTION 8: QUICK REFERENCE CARD

[Condensed 10-15 line summary for rapid recall]
```

## 5.2 Section Requirements by Skill Type

| Skill Type | Required Sections | Optional Sections |
|------------|-------------------|-------------------|
| Development Workflow | 1-6, 8 | 7 |
| Specialized Development | 1-7, 8 | - |
| Anti-Pattern | 1, 4 (expanded), 6, 8 | 2, 3, 5 |
| App Workflow | 1-3, 5-6, 8 | 4, 7 |
| App Assistance | 1-3, 6, 8 | 4, 5, 7 |

## 5.3 Size Guidelines

| Skill Type | Target Size | Min | Max |
|------------|-------------|-----|-----|
| Development Workflow | 30-40KB | 25KB | 50KB |
| Specialized Development | 30-40KB | 25KB | 45KB |
| Anti-Pattern | 20-25KB | 15KB | 30KB |
| App Workflow | 35-50KB | 30KB | 55KB |
| App Assistance | 25-35KB | 20KB | 40KB |

---

# PART 6: EVIDENCE STANDARDS

## 6.1 Evidence Types Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              EVIDENCE TYPE HIERARCHY                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  LEVEL 1: EXISTENCE EVIDENCE (Minimum Required)                                         │
│  ═════════════════════════════════════════════════                                      │
│  • File exists at expected path (ls/list_directory)                                     │
│  • File size is non-zero and reasonable                                                 │
│  • Directory structure created                                                          │
│                                                                                         │
│  LEVEL 2: CONTENT EVIDENCE (Standard)                                                   │
│  ═════════════════════════════════════════════════                                      │
│  • Head/tail of file showing expected content                                           │
│  • Line count matches expectation                                                       │
│  • Key sections present (spot check)                                                    │
│  • JSON/code parses without error                                                       │
│                                                                                         │
│  LEVEL 3: VALIDATION EVIDENCE (Quality)                                                 │
│  ═════════════════════════════════════════════════                                      │
│  • All required fields populated                                                        │
│  • Values within valid ranges                                                           │
│  • Cross-references resolve                                                             │
│  • Schema validation passes                                                             │
│                                                                                         │
│  LEVEL 4: EXECUTION EVIDENCE (Functional)                                               │
│  ═════════════════════════════════════════════════                                      │
│  • Code runs without error                                                              │
│  • Test suite passes                                                                    │
│  • Integration works                                                                    │
│  • Performance meets targets                                                            │
│                                                                                         │
│  LEVEL 5: USER EVIDENCE (Acceptance)                                                    │
│  ═════════════════════════════════════════════════                                      │
│  • User confirms output is correct                                                      │
│  • User accepts deliverable                                                             │
│  • User signs off on completion                                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 6.2 Evidence Requirements by Task Type

| Task Type | Min Level | Required Evidence |
|-----------|-----------|-------------------|
| File creation | Level 2 | Path + size + head sample |
| Code writing | Level 3 | Parse check + structure validation |
| Database entry | Level 3 | Schema validation + range check |
| Module extraction | Level 4 | Runs + imports resolve |
| Wiring | Level 4 | All consumers connected + test |
| Bug fix | Level 4 | Repro steps fail then pass |
| Feature complete | Level 5 | User acceptance |

## 6.3 Evidence Capture Methods

```javascript
// EVIDENCE CAPTURE PATTERNS

// Level 1: Existence
async function captureExistenceEvidence(path) {
  const result = await listDirectory(path);
  return {
    level: 1,
    type: "existence",
    path: path,
    exists: result.success,
    timestamp: new Date().toISOString()
  };
}

// Level 2: Content
async function captureContentEvidence(path) {
  const head = await readFile(path, { lines: 10 });
  const tail = await readFile(path, { offset: -10 });
  const info = await getFileInfo(path);
  return {
    level: 2,
    type: "content",
    path: path,
    size: info.size,
    lineCount: info.lineCount,
    headSample: head,
    tailSample: tail,
    timestamp: new Date().toISOString()
  };
}

// Level 3: Validation
async function captureValidationEvidence(path, schema) {
  const content = await readFile(path);
  const parsed = JSON.parse(content);
  const validation = validateAgainstSchema(parsed, schema);
  return {
    level: 3,
    type: "validation",
    path: path,
    valid: validation.valid,
    errors: validation.errors,
    fieldCount: Object.keys(parsed).length,
    timestamp: new Date().toISOString()
  };
}

// Level 4: Execution
async function captureExecutionEvidence(testCommand) {
  const result = await executeCommand(testCommand);
  return {
    level: 4,
    type: "execution",
    command: testCommand,
    exitCode: result.exitCode,
    output: result.stdout,
    errors: result.stderr,
    duration: result.duration,
    timestamp: new Date().toISOString()
  };
}

// Level 5: User
function captureUserEvidence(userMessage) {
  return {
    level: 5,
    type: "user_acceptance",
    message: userMessage,
    accepted: userMessage.toLowerCase().includes("yes") || 
              userMessage.toLowerCase().includes("approved") ||
              userMessage.toLowerCase().includes("looks good"),
    timestamp: new Date().toISOString()
  };
}
```

## 6.4 Evidence Documentation Format

```markdown
## EVIDENCE LOG: [Task Name]

### Summary
- **Task:** [Description]
- **Started:** [Timestamp]
- **Completed:** [Timestamp]
- **Evidence Level:** [1-5]
- **Status:** [VERIFIED | PARTIAL | FAILED]

### Evidence Items

#### E1: [File Creation]
- **Type:** Content (Level 2)
- **Path:** C:\PRISM REBUILD...\[file]
- **Size:** [X] bytes
- **Lines:** [Y]
- **Head Sample:**
  ```
  [First 5 lines]
  ```
- **Verified:** ✓

#### E2: [Validation]
- **Type:** Validation (Level 3)
- **Schema:** [Schema name]
- **Fields Valid:** [X/Y]
- **Errors:** None
- **Verified:** ✓

### Conclusion
[Summary of evidence supporting task completion]
```



---

# PART 7: COMPOSITION RULES

## 7.1 Skill Composition Principles

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              COMPOSITION PRINCIPLES                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRINCIPLE 1: SINGLE LEAD                                                               │
│  ═══════════════════════════════════════                                                │
│  Every task has ONE lead skill that owns the workflow.                                  │
│  Support skills provide data/guidance, but lead skill controls process.                 │
│                                                                                         │
│  PRINCIPLE 2: MAXIMUM THREE ACTIVE                                                      │
│  ═══════════════════════════════════════                                                │
│  No more than 3 skills actively guiding at once.                                        │
│  More than 3 → context overload → mistakes.                                             │
│                                                                                         │
│  PRINCIPLE 3: ANTI-PATTERN ALWAYS AVAILABLE                                             │
│  ═══════════════════════════════════════                                                │
│  For every task category, the relevant anti-pattern skill is implicitly loaded.         │
│  Check anti-patterns BEFORE executing critical steps.                                   │
│                                                                                         │
│  PRINCIPLE 4: EVIDENCE AGGREGATION                                                      │
│  ═══════════════════════════════════════                                                │
│  When multiple skills are composed, evidence requirements COMBINE.                      │
│  All skills' evidence requirements must be satisfied.                                   │
│                                                                                         │
│  PRINCIPLE 5: CONFLICT RESOLUTION                                                       │
│  ═══════════════════════════════════════                                                │
│  If skills give conflicting guidance:                                                   │
│  1. Safety skills win over all others                                                   │
│  2. Workflow skills win over domain skills                                              │
│  3. More specific skill wins over general                                               │
│  4. If still tied → ask user                                                            │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 7.2 Composition Patterns

### Pattern 1: Workflow + Domain + Reference
```
TASK: "Add a new steel material to the database"

LEAD:    prism-sp-materials (workflow - HOW to add)
SUPPORT: prism-material-template (domain - WHAT fields)
REFERENCE: prism-physics-formulas (data - WHERE values come from)

FLOW:
1. prism-sp-materials provides step-by-step process
2. prism-material-template provides 127-parameter structure
3. prism-physics-formulas provides Kienzle/Johnson-Cook values

EVIDENCE: All three skills' evidence requirements combined
```

### Pattern 2: Debug + Domain Expert + Error Catalog
```
TASK: "Fix chatter problem in machining simulation"

LEAD:    prism-sp-debugging (workflow - 4-phase process)
SUPPORT: prism-expert-master-machinist (domain - practical knowledge)
REFERENCE: prism-error-catalog (data - known error patterns)

FLOW:
1. prism-sp-debugging controls the 4-phase process
2. prism-expert-master-machinist provides machining insight
3. prism-error-catalog identifies known error patterns

EVIDENCE: Debug evidence + machining fix verified + error resolved
```

### Pattern 3: Extract + Navigate + Audit
```
TASK: "Extract physics engine from monolith"

LEAD:    prism-sp-extraction (workflow - extraction process)
SUPPORT: prism-monolith-index (navigation - line numbers)
AUDIT:   prism-auditor (verification - completeness check)

FLOW:
1. prism-monolith-index locates the module
2. prism-sp-extraction guides the extraction
3. prism-auditor verifies nothing was missed

EVIDENCE: Module extracted + all functions present + consumers identified
```

## 7.3 Composition Matrix

| Lead Skill | Compatible Supports | Incompatible With |
|------------|---------------------|-------------------|
| prism-sp-brainstorm | planning, any domain expert | execution, handoff |
| prism-sp-execution | any domain, any reference | brainstorm (must be done) |
| prism-sp-debugging | any expert, error-catalog | deployment (fix first) |
| prism-sp-extraction | monolith-index, auditor | deployment, migration |
| prism-sp-materials | material-template, physics | machine-specific skills |
| prism-sp-wiring | consumer-mapper, utilization | extraction (must complete) |
| prism-app-speed-feed | product-calculators, manufacturing-tables | abstract planning |
| prism-app-troubleshoot | expert-master-machinist, safety | deployment |

## 7.4 Composition Conflict Resolution

```javascript
// CONFLICT RESOLUTION ALGORITHM

function resolveConflict(skill1Guidance, skill2Guidance, context) {
  // Rule 1: Safety always wins
  if (skill1Guidance.category === "safety") return skill1Guidance;
  if (skill2Guidance.category === "safety") return skill2Guidance;
  
  // Rule 2: Workflow over domain
  if (skill1Guidance.type === "workflow" && skill2Guidance.type === "domain") {
    return skill1Guidance;
  }
  if (skill2Guidance.type === "workflow" && skill1Guidance.type === "domain") {
    return skill2Guidance;
  }
  
  // Rule 3: More specific wins
  if (skill1Guidance.specificity > skill2Guidance.specificity) {
    return skill1Guidance;
  }
  if (skill2Guidance.specificity > skill1Guidance.specificity) {
    return skill2Guidance;
  }
  
  // Rule 4: Ask user
  return {
    action: "ASK_USER",
    options: [skill1Guidance, skill2Guidance],
    question: `Conflicting guidance: "${skill1Guidance.action}" vs "${skill2Guidance.action}". Which should I follow?`
  };
}
```

---

# PART 8: INTEGRATION WITH BATTLE-READY PROTOCOL

## 8.1 How Prompt and Skills Interact

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           PROMPT ↔ SKILL INTERACTION                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  BATTLE-READY PROMPT                           SKILL LIBRARY                            │
│  ══════════════════════                        ═════════════                            │
│                                                                                         │
│  ┌─────────────────────┐                      ┌─────────────────────┐                   │
│  │ Session Start       │─────────────────────▶│ prism-state-manager │                   │
│  │ "Read state first"  │                      │ prism-quick-start   │                   │
│  └─────────────────────┘                      └─────────────────────┘                   │
│                                                                                         │
│  ┌─────────────────────┐                      ┌─────────────────────┐                   │
│  │ Skill Triggers      │─────────────────────▶│ [Matched Skills]    │                   │
│  │ "debug → debugging" │                      │ Full methodology    │                   │
│  └─────────────────────┘                      └─────────────────────┘                   │
│                                                                                         │
│  ┌─────────────────────┐                      ┌─────────────────────┐                   │
│  │ Buffer Zones        │─────────────────────▶│ prism-sp-handoff    │                   │
│  │ "🔴15+ checkpoint"  │                      │ Detailed save proc  │                   │
│  └─────────────────────┘                      └─────────────────────┘                   │
│                                                                                         │
│  ┌─────────────────────┐                      ┌─────────────────────┐                   │
│  │ 4-Phase Debug       │─────────────────────▶│ prism-sp-debugging  │                   │
│  │ "Evidence→Root→..." │                      │ 50KB full process   │                   │
│  └─────────────────────┘                      └─────────────────────┘                   │
│                                                                                         │
│  ┌─────────────────────┐                      ┌─────────────────────┐                   │
│  │ Recovery Triggers   │─────────────────────▶│ prism-task-contin.  │                   │
│  │ "Compaction → ..."  │                      │ prism-error-recovery│                   │
│  └─────────────────────┘                      └─────────────────────┘                   │
│                                                                                         │
│  THE PROMPT IS THE INDEX                                                                │
│  THE SKILLS ARE THE CONTENT                                                             │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 8.2 Prompt Trigger → Skill Mapping

| Prompt Section | Triggers | Skills Loaded |
|----------------|----------|---------------|
| SESSION START | Every session | prism-state-manager (implicit) |
| "IN_PROGRESS? Resume" | Interrupted work | prism-task-continuity |
| "BRAINSTORM → approval" | New task | prism-sp-brainstorm |
| "4-Phase Debug" | "debug", "fix", "error" | prism-sp-debugging |
| "Validate paths" | File operations | prism-validator |
| "Checkpoint@yellow" | 9+ tool calls | prism-sp-handoff |
| "Recovery" | Compaction detected | prism-task-continuity, prism-error-recovery |
| Skill triggers section | Keywords matched | Corresponding skills |

## 8.3 Defensive Gates Enhanced by Skills

| Defensive Gate | Prompt Rule | Skill Enhancement |
|----------------|-------------|-------------------|
| Path validation | "Validate paths" | prism-validator: Full path validation rules |
| Read-before-write | "Read before overwrite" | prism-sp-execution: Verification checkpoints |
| Size estimation | "Chunk if >25KB" | prism-large-file-writer: Chunking strategies |
| Backup critical | "Backup critical" | prism-state-manager: Backup procedures |
| Evidence required | "Never claim done without proof" | prism-sp-verification: Evidence capture |

## 8.4 Superpowers Workflow Integration

```
PROMPT SAYS:                          SKILL PROVIDES:
════════════                          ═══════════════

"REQUEST→BRAINSTORM"         ────────▶ prism-sp-brainstorm
                                       • Socratic questioning
                                       • Chunked approval process
                                       • Alternative exploration
                                       
"→PLAN"                      ────────▶ prism-sp-planning
                                       • Task breakdown (2-5 min each)
                                       • Exact paths specification
                                       • Dependency mapping
                                       
"→EXECUTE(checkpoint)"       ────────▶ prism-sp-execution
                                       • Checkpoint protocol
                                       • Progress tracking
                                       • State updates
                                       
"→VERIFY(evidence)"          ────────▶ prism-sp-verification
                                       • Evidence capture methods
                                       • Level requirements
                                       • Documentation format
                                       
"→HANDOFF"                   ────────▶ prism-sp-handoff
                                       • State file updates
                                       • Session log creation
                                       • Next session prep
```

---

# PART 9: IMPLEMENTATION ROADMAP

## 9.1 Skill Creation Order

Phase 0 creates skills in dependency order:

```
WEEK 1-2: FOUNDATION (SP.0)
├── SP.0.1 ✓ Framework Architecture (THIS DOCUMENT)
├── SP.0.2   Skill Template Standards
├── SP.0.3   DOT Diagram Standards
└── SP.0.4   Evidence & Activation Rules

WEEK 3-4: CORE WORKFLOW (SP.1)
├── SP.1.1   prism-sp-brainstorm
├── SP.1.2   prism-sp-planning
├── SP.1.3   prism-sp-execution
├── SP.1.4   prism-sp-review-spec
├── SP.1.5   prism-sp-review-quality
├── SP.1.6   prism-sp-debugging
├── SP.1.7   prism-sp-verification
└── SP.1.8   prism-sp-handoff

WEEK 5-6: SPECIALIZED DEV (SP.2)
├── SP.2.1-4   extraction, materials, machines, engines
├── SP.2.5-8   wiring, testing, migration, documentation
└── SP.2.9-12  performance, refactoring, integration, deployment

WEEK 7-8: ANTI-PATTERNS & DIAGRAMS (SP.3)
├── SP.3.1-4   anti-extraction, anti-wiring, anti-state, anti-testing
└── SP.3.5-8   diagrams-workflow, decision, arch, data

WEEK 9-11: APP WORKFLOWS (SP.4)
├── SP.4.1-4   material-guide, speed-feed, tool-select, machine-setup
├── SP.4.5-8   toolpath, troubleshoot, quality, cost
└── SP.4.9-12  post-debug, fixture, cycle-time, quotes

WEEK 12-13: APP ASSISTANCE (SP.5)
├── SP.5.1-4   explain-physics, explain-recs, confidence, alternatives
├── SP.5.5-8   learning, safety, documentation, diagrams
└── SP.5.9-10  anti-machining, onboarding

WEEK 14: INFRASTRUCTURE (SP.6)
├── SP.6.1-4   activation-engine, evidence-capture, diagram-renderer, anti-registry
└── SP.6.5-10  composition-engine, tracker, context-analyzer, resolver, update, bridge

WEEK 15: TESTING (SP.7)
├── SP.7.1     Skill test framework
├── SP.7.2     Development skill tests
├── SP.7.3     Application skill tests
└── SP.7.4     Integration & pressure tests
```

## 9.2 Skill Dependencies

```
prism-sp-brainstorm
     │
     ▼
prism-sp-planning ──────────────────┐
     │                              │
     ▼                              ▼
prism-sp-execution ◀──────── prism-sp-review-spec
     │                              │
     │                              ▼
     │                       prism-sp-review-quality
     │                              │
     ▼                              │
prism-sp-verification ◀─────────────┘
     │
     ▼
prism-sp-handoff
     │
     ▼
prism-sp-debugging (can be invoked at any point)
```

## 9.3 Post-Creation Validation

Each skill must pass:

| Gate | Requirement | How to Test |
|------|-------------|-------------|
| G1: Structure | Follows template | Section checklist |
| G2: Size | Within bounds | File size check |
| G3: Triggers | Keywords defined | Trigger test |
| G4: Examples | ≥2 examples | Count check |
| G5: Anti-patterns | ≥3 mistakes | Count check |
| G6: Evidence | Requirements listed | Checklist present |
| G7: Integration | Works with prompt | Scenario test |



---

# PART 10: QUICK REFERENCE

## 10.1 Skill Loading Cheat Sheet

```
DEVELOPMENT TASKS:
  brainstorm/design    → prism-sp-brainstorm
  plan/schedule        → prism-sp-planning
  execute/implement    → prism-sp-execution
  review/check         → prism-sp-review-spec, prism-sp-review-quality
  debug/fix/error      → prism-sp-debugging
  verify/prove/done    → prism-sp-verification
  end/handoff/done     → prism-sp-handoff

EXTRACTION TASKS:
  extract/pull         → prism-sp-extraction + prism-monolith-index
  audit/verify extract → prism-auditor

MATERIAL TASKS:
  add material         → prism-sp-materials + prism-material-template
  material properties  → prism-physics-formulas + prism-material-lookup

MACHINE TASKS:
  add machine          → prism-sp-machines
  machine specs        → prism-expert-mechanical-engineer

WIRING TASKS:
  wire/connect         → prism-sp-wiring + prism-consumer-mapper
  utilization check    → prism-utilization

G-CODE TASKS:
  G-code/M-code        → prism-gcode-reference
  Fanuc                → prism-fanuc-programming
  Siemens              → prism-siemens-programming
  Heidenhain           → prism-heidenhain-programming
  post processor       → prism-expert-post-processor

APPLICATION TASKS:
  speed/feed           → prism-app-speed-feed + prism-product-calculators
  tool selection       → prism-app-tool-select
  troubleshoot         → prism-app-troubleshoot + prism-expert-master-machinist
  cost/quote           → prism-app-cost + prism-app-quotes
```

## 10.2 Evidence Quick Reference

```
LEVEL 1 (Existence):     File exists, non-zero size
LEVEL 2 (Content):       Head/tail sample, line count, parses OK
LEVEL 3 (Validation):    Schema valid, ranges OK, refs resolve
LEVEL 4 (Execution):     Runs, tests pass, integrates
LEVEL 5 (User):          User says "yes", "approved", "looks good"

MINIMUM BY TASK:
  File creation     → Level 2
  Code writing      → Level 3
  Database entry    → Level 3
  Module extraction → Level 4
  Bug fix           → Level 4
  Feature complete  → Level 5
```

## 10.3 Composition Quick Reference

```
MAX 3 SKILLS ACTIVE AT ONCE

PATTERN: Lead + Support + Reference

EXAMPLES:
  Debug:     prism-sp-debugging + prism-expert-master-machinist + prism-error-catalog
  Material:  prism-sp-materials + prism-material-template + prism-physics-formulas
  Extract:   prism-sp-extraction + prism-monolith-index + prism-auditor
  Speed:     prism-app-speed-feed + prism-product-calculators + prism-manufacturing-tables

CONFLICT RESOLUTION:
  Safety > Workflow > Specific > General > Ask User
```

## 10.4 Anti-Pattern Quick Reference

```
EXTRACTION:  prism-sp-anti-extraction
  • Don't extract without consumer mapping
  • Don't ignore dependencies
  • Don't skip verification

WIRING:      prism-sp-anti-wiring
  • Don't wire without testing
  • Don't assume connections work
  • Don't skip utilization check

STATE:       prism-sp-anti-state
  • Don't modify state without backup
  • Don't skip IN_PROGRESS check
  • Don't trust memory over file

TESTING:     prism-sp-anti-testing
  • Don't test happy path only
  • Don't skip edge cases
  • Don't ignore failures
```

## 10.5 Key Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Total Skills | 101 | 59 existing + 42 Superpowers |
| Existing Skills | 59 | Domain knowledge, experts, references |
| Superpowers Skills | 42 | Workflow, app guidance, anti-patterns |
| Skill Size Range | 15-170KB | Varies by type |
| Max Active Skills | 3 | Plus implicit anti-pattern |
| Evidence Levels | 5 | Existence → User acceptance |
| Trigger Keywords | 200+ | Across all skills |

---

# APPENDIX A: SKILL FILE NAMING CONVENTION

```
EXISTING SKILLS:
  prism-[category]-[name]
  Examples: prism-material-template, prism-expert-master-machinist

SUPERPOWERS DEVELOPMENT:
  prism-sp-[name]
  Examples: prism-sp-brainstorm, prism-sp-debugging

SUPERPOWERS APPLICATION:
  prism-app-[name]
  Examples: prism-app-speed-feed, prism-app-troubleshoot

ANTI-PATTERNS:
  prism-sp-anti-[topic]
  Examples: prism-sp-anti-extraction, prism-sp-anti-wiring
```

---

# APPENDIX B: DIRECTORY STRUCTURE

```
/mnt/skills/user/
├── prism-all-skills/           ← Consolidated skill index
│   └── SKILL.md
│
├── [59 existing skill folders]/
│   └── SKILL.md
│
└── [42 Superpowers skill folders - to be created]/
    └── SKILL.md

C:\\PRISM\_SKILLS\
├── PRISM_SKILL_FRAMEWORK.md    ← THIS DOCUMENT
├── SKILL_TEMPLATE.md           ← SP.0.2 deliverable
├── DOT_STANDARDS.md            ← SP.0.3 deliverable
├── EVIDENCE_STANDARDS.md       ← SP.0.4 deliverable
└── ACTIVATION_RULES.md         ← SP.0.4 deliverable
```

---

# APPENDIX C: RELATED DOCUMENTS

| Document | Purpose | Location |
|----------|---------|----------|
| PRISM_BATTLE_READY_PROMPT_v9.0.md | Tier 1 prompt reference | _DOCS\ |
| PRISM_PROJECT_SETTINGS_BATTLE_READY_v9.0.md | Token-optimized prompts | _DOCS\ |
| PRISM_v9_INTEGRATED_MASTER_ROADMAP.md | Full project roadmap | _DOCS\ |
| CURRENT_STATE.json | Session state tracking | Root |

---

# DOCUMENT METADATA

```
Document:     PRISM_SKILL_FRAMEWORK.md
Version:      1.0.0
Created:      2026-01-24
Session:      SP.0.1
Author:       Claude (PRISM Development)
Size:         ~45KB
Sections:     10 Parts + 3 Appendices

Purpose:      Define the complete architecture for PRISM's 
              101-skill AI-assisted development system

Supersedes:   None (first framework document)

Next:         SP.0.2 - Skill Template Standards
```

---

**END OF DOCUMENT**

