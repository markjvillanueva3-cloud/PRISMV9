---
name: prism-manufacturing-patterns
description: |
  Manufacturing-specific coding patterns, naming conventions, error hierarchy,
  and integration sequences for PRISM MCP server development.
  Extracted from: code-complete-integration, code-quality, code-master.
  Generic SE content removed (covered natively by Claude Code).
version: 2.0.0
triggers:
  - "prism naming"
  - "material parameter"
  - "error hierarchy"
  - "integration sequence"
  - "127 param"
  - "manufacturing pattern"
---

# PRISM Manufacturing Patterns
## Naming, Error Hierarchy & Integration Sequences

---

## 1. PRISM Material Parameter Naming (127-Parameter Schema)

```typescript
const material = {
  // Physical: adjective + noun
  yieldStrength: 275,           // MPa
  ultimateTensile: 485,         // MPa

  // Cutting: context + measurement
  kienzleK11: 1800,             // N/mm² — Kienzle specific cutting force
  kienzleMc: 0.25,              // dimensionless — Kienzle exponent

  // Thermal: thermal + noun
  thermalConductivity: 51.9,    // W/(m·K)

  // Flags: is/has/can + condition
  isAbrasive: false,
  hasChipBreaker: true,
  canHighSpeedMachine: true,

  // Indices: noun + Index/Rating
  machinabilityRating: 65,      // % relative to B1112
};
```

### Naming Convention Summary

```
MODULES:     PRISM_[CATEGORY]_[NAME]     → PRISM_MATERIALS_MASTER
FUNCTIONS:   verbNoun()                  → getMaterial(), calculateForce()
CONSTANTS:   UPPER_SNAKE_CASE            → MAX_RPM, DEFAULT_SAFETY_FACTOR
VARIABLES:   camelCase                   → materialId, toolDiameter
PRIVATE:     _prefixedCamelCase          → _internalCache, _validate()
EVENTS:      entity:action               → material:created, tool:updated
DISPATCHERS: verbNoun or nounVerb        → material_get, tool_search, alarm_decode
TYPES:       PascalCase                  → MaterialParams, CuttingResult, SafetyScore
```

---

## 2. PRISM Error Hierarchy

```typescript
class PRISMError extends Error {
  constructor(message, context, recoverable = false) {
    super(message);
    this.context = context;
    this.recoverable = recoverable;
  }
}

class DataQualityError extends PRISMError {
  constructor(msg, ctx) { super(msg, ctx, true); }  // recoverable — fallback to defaults
}

class PhysicsViolationError extends PRISMError {
  constructor(msg, ctx) { super(msg, ctx, false); } // NOT recoverable — physics is physics
}

class SafetyLimitError extends PRISMError {
  constructor(msg, ctx) {
    super(msg, ctx, false);
    safetyAudit.log(this); // ALWAYS log safety issues — no exceptions
  }
}
```

### Error Handling Pattern (Graceful Degradation)

```javascript
function calculateWithFallback(material, tool, machine) {
  try {
    return fullAICalculation(material, tool, machine);  // Primary
  } catch (aiError) {
    try {
      return physicsOnlyCalculation(material, tool, machine);  // Fallback 1
    } catch (physicsError) {
      try {
        return handbookLookup(material, tool);  // Fallback 2
      } catch (handbookError) {
        return {  // Fallback 3: Conservative defaults
          value: getConservativeDefault(material),
          confidence: 0.3,
          warning: 'Using conservative defaults - verify before use'
        };
      }
    }
  }
}
```

---

## 3. PRISM v9.0 Integration Sequence

```
PHASE 1: Foundation
├── Material schema validation
├── Database connection layer
└── Error handling framework

PHASE 2: Calculation Engines
├── Kienzle force model (kc1.1 × h^(1-mc) × b)
├── Taylor tool life (VT^n = C)
├── Johnson-Cook thermal
└── Surface finish prediction

PHASE 3: Database Integration
├── Material registry (1,047 materials, 127 params each)
├── Machine registry (824 machines)
├── Tool registry (44 manufacturers)
└── Cross-reference validation

PHASE 4: Consumer Wiring
├── calcDispatcher consumers (25 actions)
├── safetyDispatcher consumers (29 actions)
├── toolpathDispatcher consumers (8 actions)
└── intelligenceEngine consumers (11 actions — R3)

PHASE 5: Validation
├── Golden benchmark suite (150 tests)
├── Spot checks (6 ISO groups)
├── Edge cases (20 scenarios)
└── Omega quality gate (Ω ≥ 0.70)
```

---

## 4. Manufacturing-Specific Quality Rules

### Safety-Critical Code
- **100% branch coverage** for any code path producing cutting parameters
- **Bounds checking mandatory** on all physical values (speed, force, temperature)
- **Units always explicit** — never bare numbers for physical quantities
- **Result types over exceptions** — explicit success/failure, never silent errors
- **Validation at boundaries** — validate on input AND before output

### PRISM-Specific Code Review
```
PRISM-SPECIFIC CHECKS
□ All databases utilized? (10 Commandments #1 — if data exists, use it)
□ Confidence intervals provided?
□ Missing data handled gracefully (fallback chain)?
□ Safety limits respected (SAFETY_LIMITS enforced)?
□ Physics models appropriate for material group?
□ Units consistent throughout calculation chain?
```

### PRISM Performance Targets
- Single calculation: <500ms
- Batch (100 materials): <5 seconds
- Material lookup: <10ms
- No O(n²) or worse for hot paths

---

## 5. Database Consumer Requirements

```
╔═══════════════════════════════════════════════════════════════════╗
║  COMMANDMENT 1: IF IT EXISTS, USE IT EVERYWHERE                   ║
╠═══════════════════════════════════════════════════════════════════╣
║  Every database field must have minimum consumers:                ║
║  • Materials: 15+ consumers                                       ║
║  • Machines: 12+ consumers                                        ║
║  • Tools: 10+ consumers                                           ║
║  • NO orphan data allowed                                         ║
╚═══════════════════════════════════════════════════════════════════╝

Key Consumer Map:
PRISM_MATERIALS_MASTER → speed_feed, force, thermal, tool_life,
                          surface_finish, chatter, chip_formation,
                          coolant, coating, cost, cycle_time,
                          quoting, AI_pipeline, bayesian, XAI

PRISM_MACHINES_DATABASE → speed_feed, collision, post_processor,
                           chatter, cycle_time, cost

PRISM_TOOLS_DATABASE   → speed_feed, force, tool_life, deflection
```

---

## Source Skills Consolidated

| Original Skill | Lines | Retained Content |
|----------------|-------|-----------------|
| prism-code-complete-integration | 712 | Material naming, error hierarchy, integration sequence |
| prism-code-quality | 140 | Manufacturing quality rules, PRISM naming |
| prism-code-master (partial) | 628 | Naming conventions, consumer map, code quality checklist |
| **Total source** | **~1480** | |
| **This skill** | **~200** | **86% reduction** |

---

*Consolidated: 2026-02-21 | Per SKILL_AUDIT.md R2-MS5 recommendations*
