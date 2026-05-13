---
policy:
  tier: 1
  triggers:
    - "sinker-learn"
---
# /sinker-learn — Sinker EDM Knowledge Extraction

Extract tribal knowledge and patterns from sinker EDM programs, electrode designs, and operator experience.

## Usage
```
/sinker-learn [source-path] [--type program|electrode|pdf|notes]
```

## MCP Action
```
prism_knowledge:sinker_knowledge_extract
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (extracts knowledge patterns)
- **Advisor**: Opus 4.6, `max_uses: 2`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse source material (programs, electrode CAD, PDFs)
2. Extract discharge parameter patterns
3. Identify electrode design best practices
4. Cross-reference with physics models
5. Add to PRISM tribal knowledge

## Source Types
- **program**: Extract patterns from EDM programs
- **electrode**: Extract design patterns from electrode CAD
- **pdf**: Extract from manufacturer/application notes
- **notes**: Parse operator setup notes

## Output
- Extracted tribal tips
- Electrode design rules
- Parameter correlation data
- Knowledge graph updates

## Related
- `/pdf-learn` — PDF extraction
- `/shop-knowledge` — General shop floor knowledge
