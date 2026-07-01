# /learn — Universal Learning Router

Route learning requests to the appropriate specialized learning skill based on source type.

## Usage
```
/learn [source-path-or-url]
```

## MCP Action
```
prism_knowledge:learn_route
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (routes to specialized learner)
- **Advisor**: Opus 4.6, `max_uses`: 1

## What it does
1. Analyze source type (PDF, video, web, program, notes)
2. Route to specialized learner:
   - PDF → `/pdf-learn`
   - Video → `/video-learn`
   - Web URL → web scraping + extraction
   - NC Program → `/mill-learn`, `/lathe-learn`, etc.
   - Notes → operator knowledge extraction
3. Return extracted knowledge with confidence scores

## Source Type Detection
- `.pdf` → PDF learning pipeline
- `.mp4`, `.mkv`, YouTube URL → Video learning
- `.MIN`, `.nc`, `.tap` → NC program pattern extraction
- `.txt`, `.md` → Operator notes parsing
- `http://`, `https://` → Web scraping

## Output
- Extracted tribal tips
- Formulas and parameters
- Procedures and best practices
- Knowledge graph updates

## Related
- `/pdf-learn` — PDF-specific learning
- `/video-learn` — Video-specific learning
- `/shop-knowledge` — Shop floor knowledge
- `/learn-everything` — Batch learning
