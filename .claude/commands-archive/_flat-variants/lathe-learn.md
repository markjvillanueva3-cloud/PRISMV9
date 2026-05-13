---
policy:
  tier: 1
  triggers:
    - "lathe-learn"
---
# /lathe-learn — Lathe Knowledge Extraction

Extract tribal knowledge and patterns from turning programs, operator notes, and shop floor experience.

## Usage
```
/lathe-learn [source-path] [--type program|video|pdf|notes]
```

## MCP Action
```
prism_knowledge:lathe_knowledge_extract
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (extracts knowledge patterns)
- **Advisor**: Opus 4.6, `max_uses: 2`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse source material (.MIN files, videos, PDFs)
2. Extract turning parameter patterns
3. Identify tribal knowledge tips
4. Cross-reference with physics models
5. Add to PRISM tribal knowledge

## Source Types
- **program**: Extract from .MIN or G-code (feed overrides, dwell, approach)
- **video**: Transcribe and extract setup/operation knowledge
- **pdf**: Extract from manufacturer/application guides
- **notes**: Parse operator setup notes

## Output
- Extracted tribal tips
- Pattern library additions
- Playbook rule proposals
- Knowledge graph updates

## Related
- `/pdf-learn` — PDF extraction
- `/video-learn` — Video extraction
- `/shop-knowledge` — General shop floor knowledge
