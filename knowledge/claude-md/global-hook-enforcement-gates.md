---
source: global
section: HOOK ENFORCEMENT GATES
slug: hook-enforcement-gates
indexed_at: 2026-04-28T00:49:50.585Z
---

## HOOK ENFORCEMENT GATES

### HARD BLOCKS (cannot bypass)
| Hook | Blocks |
|------|--------|
| `code-completeness-gate.mjs` | TODO, FIXME, empty catch, stubs |
| `duplication-hard-block.mjs` | Exact duplicate assets |
| `anti-pattern-detector.mjs` | Security issues (eval, injection) |
| `test-legitimacy.mjs` | Placeholder tests |

### WARNINGS (should fix)
| Hook | Warns On |
|------|----------|
| `complexity-gate.mjs` | >50 lines, >4 nesting, >10 cyclomatic |
| `type-safety-checker.mjs` | `any` types, double assertions |
| `performance-pattern-detector.mjs` | O(n²) loops, Date in loops |
| `naming-convention-enforcer.mjs` | Non-standard names |

### AUTO-INJECT (contextual)
| Hook | Injects When |
|------|--------------|
| `reference-value-injector.mjs` | Kienzle/Taylor/ISO keywords |
| `claudemd-ollama-enforcer.mjs` | Every prompt (3-5 relevant rules) |
| `discipline-expert-inject.mjs` | Domain keywords detected |
| `error-pattern-memory.mjs` | Known error patterns |

---
