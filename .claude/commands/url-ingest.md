---
effort: medium
maxTurns: 12
---

# URL Ingest — Sandboxed HTML → tribal knowledge / formulas / wiki

Fetch a URL, route the response through the sandboxed `DefuddleIngestPipelineEngine`, and feed
the cleaned content into Ollama embedding + PRISM knowledge stores. This is the URL-only
counterpart to `/pdf-learn` — same downstream pipeline, but every input is treated as untrusted
HTML.

## Usage
- `/url-ingest <https://example.com/article>` — single URL
- `/url-ingest --batch <file-with-one-url-per-line>` — batched ingest with per-URL telemetry
- `/url-ingest --topic "<area>" <url>` — tag the resulting knowledge with an explicit topic
- `/url-ingest --dry-run <url>` — fetch + clean only, print stats, do NOT write to stores

## Args: $ARGUMENTS

## AI Engines Used
- **DefuddleIngestPipelineEngine** — Worker-thread sandbox: strips `<script>`/`<iframe>`/event handlers, redacts prompt-injection override phrases, caps input ≤4 MiB and output ≤256 KiB
- **OllamaEmbeddingEngine** — Vector embedding of the cleaned content for semantic recall
- **TribalKnowledgeAdvisorEngine** — Categorizes extracted text into tribal tips
- **DuplicationGuardEngine** — Skips already-ingested content by hash
- **WikiIngestRouterEngine** — Routes high-confidence extractions to `knowledge/wiki/`

## Procedure

### 1. Resolve and validate the URL
- Reject non-http(s) schemes outright.
- Honour the project's `robots.txt` cache (`prism_session:robots_check`).
- HEAD request: confirm `Content-Type` includes `text/html` or `application/xhtml+xml`.
  - If the response is a PDF (`application/pdf`), defer to `/pdf-learn` and exit.
  - If anything else, refuse — this skill ingests HTML only.

### 2. Fetch HTML
- GET with a 12 second timeout, max body 8 MiB.
- Capture: final URL after redirects, ETag / Last-Modified, raw byte count.
- Refuse if size > 8 MiB (the pipeline truncates at 5 MiB but we should not embed
  obviously-corrupted or decompression-bomb responses).

### 3. Clean + sandbox
Call `defuddleIngestPipelineEngine.cleanHtml(html, { url })`. The pipeline:
- Spawns a `worker_threads` worker whose `require` is allow-listed — fs / net /
  child_process / http / https / dns / tls / crypto / os / vm / process are all denied.
- Strips boilerplate, event handlers, javascript: URIs, iframe / object / embed.
- Redacts known prompt-injection overrides (returns `overrideRedactions` count).
- Hard caps input at 4 MiB and output at 256 KiB (returns `inputTruncated` / `outputTruncated`).
- Throws if any `<script>` residue is detected — DO NOT catch and embed raw text in that case.

Reject the URL if the engine throws. Log the residue list to `state/shared/AGENT_CHAT.md`
so peers can investigate adversarial content.

### 4. Deduplicate
- Hash `result.content` with the same scheme used by `prism_knowledge:tribal_capture`.
- Call `duplicationGuardEngine.checkBeforeCreating({ assetType: "url-ingest", proposedName: hash, ... })`.
- If duplicate, exit with `status: "duplicate"` and the prior ingest id.

### 5. Embed and route
- `prism_memory:semantic_index` against the cleaned content with metadata
  `{ source_url, title, wordCount, overrideRedactions }`.
- `prism_knowledge:tribal_capture` for short shop-floor-style snippets (<500 words).
- `WikiIngestRouterEngine.route()` for technical content suitable for the wiki.
- Always include the cleaning provenance in the metadata so any retrieved chunk is
  traceable back through the sandbox.

### 6. Report
Print one line per URL:
```
ingested  <url>  title="<...>"  words=<n>  redactions=<n>  truncated=<bool>  routed-to=<wiki|tribal|memory>
```
Plus a final summary: total URLs, total ingested, total dedup-skipped, total refused.

## Example Outputs
```
$ /url-ingest https://www.sandvik.coromant.com/en-us/knowledge/milling/coromill-390
ingested https://www.sandvik.coromant.com/.../coromill-390 title="CoroMill 390 — Versatile Shoulder Milling" words=312 redactions=0 truncated=false routed-to=tribal+memory
URL INGEST COMPLETE: 1 URL · 1 ingested · 0 duplicate · 0 refused
```

## Related Commands
- `/pdf-learn` — General document learner; auto-routes URL inputs through the same pipeline
- `/wiki-ingest` — Targeted wiki entry creation
- `/shop-knowledge` — Tribal knowledge tools
- `/dedup` — Pre-creation duplication scan

## Safety
- The pipeline NEVER reads the filesystem, opens sockets, or spawns processes inside the
  worker. The capability allow-list is asserted by `DefuddleIngestPipeline.test.ts`.
- Refuse to embed content where `scriptResidue.length > 0` (the engine throws). This is
  the last line of defence against script content reaching the embedding layer.
- Override redactions are reported but not silently discarded — every redaction is counted
  and surfaced in metadata.
