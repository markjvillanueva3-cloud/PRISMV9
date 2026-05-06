---
policy:
  tier: 1
  triggers:
    - "learn"
    - "learn from"
    - "ingest"
    - "extract from"
    - "read this pdf"
    - "watch this video"
---
# Learn — Unified Knowledge-Ingest Dispatcher

Single entry point for ingesting knowledge from any source format. Auto-detects input type (PDF / video / web URL / plain text / markdown / image / archive) and routes to the right specialised extractor.

## Args: $ARGUMENTS
- `<source>`: path or URL — required
- `--type=<type>`: override auto-detect (`pdf | video | url | text | markdown | image | archive`)
- `--target=<bucket>`: vault target (`tribal | formula | playbook | rule | concept | decision`)
- `--ollama=<model>`: override default extraction model (qwen2.5-coder:7b for text, llama3.2-vision:11b for image/PDF)
- `--dry-run`: run extraction; don't persist to vault or Qdrant

## Trigger policy
```yaml
policy:
  tier: 1
  triggers:
    - keyword:"learn from"
    - keyword:"ingest"
    - keyword:"extract from"
    - keyword:"read this PDF"
    - keyword:"watch this video"
```

## Routing logic (auto-detect)
1. **URL with scheme**: `youtube.com/...` → `/video-learn`; `github.com/.../*.pdf` → fetch then `/pdf-learn`; other URL → `/url-learn`
2. **Local path**: extension wins
   - `.pdf`             → `/pdf-learn`
   - `.mp4 .mov .webm`  → `/video-learn`
   - `.md .txt`         → `/text-learn`
   - `.png .jpg .jpeg`  → `/image-learn` (vision model required)
   - `.zip .7z .tar.gz` → `/archive-learn` (recursive walk)
3. **Folder path**: walk + dispatch each file by step 2
4. **Inline text** (no path/URL): `/text-learn --inline=...`
5. **Unknown**: ask user

## Routing table

| Type | Routes to | Engine | Vault target default |
|------|-----------|--------|----------------------|
| pdf      | `/pdf-learn`    | PDFExtractionEngine + Ollama   | `tribal`, `formula` |
| video    | `/video-learn`  | VideoTranscriptEngine + Ollama | `tribal`, `playbook` |
| url      | `/url-learn`    | WebFetchEngine + Ollama        | `concept`, `decision` |
| text     | `/text-learn`   | TextChunkEngine + Ollama       | `tribal`, `concept` |
| markdown | `/text-learn --markdown` | same as text          | `concept`, `decision` |
| image    | `/image-learn`  | VisionExtractionEngine (vision)| `tribal` (catalog images) |
| archive  | `/archive-learn`| ArchiveCrawlerEngine           | dispatched per inner file |

## Vault target buckets
- `tribal`     — operator rules-of-thumb, machine quirks, material gotchas
- `formula`    — equations with citations + units
- `playbook`   — multi-step procedures
- `rule`       — yes/no constraints (collision distances, coolant requirements)
- `concept`    — definitions, taxonomies, architecture notes
- `decision`   — ADR-style rationale + tradeoffs

`--target=` overrides the default; the routed extractor decides the actual bucket per chunk based on content classifier output.

## Pipeline shape (every routing path)
1. **Extract** — convert source to plain text + structure
2. **Chunk** — split by semantic boundary (paragraph / scene / function)
3. **Classify** — Ollama tags each chunk's bucket via classification prompt
4. **Embed** — nomic-embed-text 768-dim per chunk
5. **Persist** — write to `H:/prism/knowledge/wiki/<bucket>/...md` + upsert to Qdrant
6. **Index** — refresh `wiki/index.md` so `/qdrant-semantic-search --kind=wiki` picks it up

## Safety
- `--dry-run` is suggested for first ingest from a new source
- Each emitted vault entry carries `source: <path-or-url>` so future re-ingests hit the dedup key
- Vision-model invocations skip if `llama3.2-vision:11b` isn't pulled (ask user to run `/pull-multi-model-stack`)

## Related
- `/vault-ingest` — write side that doesn't extract (manual capture from session)
- `/wiki-query` — read side
- `/qdrant-semantic-search --kind=wiki` — programmatic search
