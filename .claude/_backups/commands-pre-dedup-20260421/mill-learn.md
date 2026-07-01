# /mill-learn — Mill Knowledge Extraction

Extract tribal knowledge and patterns from milling programs, operator notes, and shop floor experience.

## Usage
```
/mill-learn [source-path] [--type program|video|pdf|operator_notes]
```

## MCP Action
```
prism_knowledge:mill_knowledge_extract
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (extracts knowledge patterns)
- **Advisor**: Opus 4.6, `max_uses: 2`, `caching: {"type": "ephemeral", "ttl": "5m"}`
- **When Sonnet should call advisor**: (1) after pattern extraction, (2) before committing to tribal knowledge base

## What it does
1. Parse source material (G-code, video, PDF, notes)
2. Extract machining patterns via PatternExtractionEngine
3. Identify tribal knowledge tips via TribalKnowledgeExtractionEngine
4. Cross-reference with existing knowledge base
5. Validate extracted knowledge against physics
6. Add to PRISM tribal knowledge with attribution

## Source Types
- **program**: Extract patterns from G-code (feed overrides, dwell times, approach strategies)
- **video**: Transcribe and extract setup/operation knowledge
- **pdf**: Extract from manuals, application notes, tech reports
- **operator_notes**: Parse handwritten or typed operator notes

## Output
- Extracted tribal tips with confidence scores
- Pattern library additions
- Playbook rule proposals
- Knowledge graph updates

## Related
- `/pdf-learn` — PDF-specific extraction
- `/video-learn` — Video-specific extraction
- `/shop-knowledge` — General shop floor knowledge
