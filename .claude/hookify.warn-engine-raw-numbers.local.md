---
name: warn-engine-raw-numbers
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: mcp-server/src/engines/[A-Z][A-Za-z]+Engine\.ts$
  - field: content
    operator: not_contains
    value: "AtomicValue"
---

**[warn-engine-raw-numbers]**
**Engine file does not reference AtomicValue - possible DSL violation.**

PRISM calculation engines must return `AtomicValue` objects, not raw numbers:

```typescript
interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}
```

- Every numeric result should be wrapped in AtomicValue with uncertainty and source citation
- Import the interface or define it locally (centralization pending)
- Safety-relevant values must include `warning` when limits are approached
- Exception: infrastructure/orchestration engines that don't perform calculations
