# /grinder-learn — Grinding Knowledge Extraction

Extract tribal knowledge and patterns from grinding programs, wheel specifications, and operator experience.

## Usage
```
/grinder-learn [source-path] [--type program|wheel_spec|pdf|notes]
```

## MCP Action
```
prism_knowledge:grinder_knowledge_extract
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (extracts knowledge patterns)
- **Advisor**: Opus 4.6, `max_uses: 2`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse source material
2. Extract grinding parameter patterns
3. Identify wheel selection best practices
4. Cross-reference with thermal models
5. Add to PRISM tribal knowledge

## Source Types
- **program**: Extract patterns from grinding programs
- **wheel_spec**: Extract from wheel manufacturer specs
- **pdf**: Extract from grinding application guides
- **notes**: Parse operator dressing/setup notes

## Output
- Extracted tribal tips
- Wheel selection rules
- Thermal limit correlations
- Knowledge graph updates

## Related
- `/pdf-learn` — PDF extraction
- `/shop-knowledge` — General shop floor knowledge
