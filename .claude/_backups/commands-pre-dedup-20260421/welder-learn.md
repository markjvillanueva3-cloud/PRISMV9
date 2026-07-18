# /welder-learn — Welding Knowledge Extraction

Extract tribal knowledge and patterns from welding programs, procedure specs, and welder experience.

## Usage
```
/welder-learn [source-path] [--type program|wps|pdf|notes]
```

## MCP Action
```
prism_knowledge:welder_knowledge_extract
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (extracts knowledge patterns)
- **Advisor**: Opus 4.6, `max_uses: 2`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse source material
2. Extract weld parameter patterns
3. Identify sequence best practices
4. Cross-reference with thermal models
5. Add to PRISM tribal knowledge

## Source Types
- **program**: Extract patterns from robot/CNC programs
- **wps**: Extract from Welding Procedure Specifications
- **pdf**: Extract from welding handbooks and guides
- **notes**: Parse welder setup/technique notes

## Output
- Extracted tribal tips
- Sequence rules
- Material-specific parameters
- Knowledge graph updates

## Related
- `/pdf-learn` — PDF extraction
- `/shop-knowledge` — General shop floor knowledge
