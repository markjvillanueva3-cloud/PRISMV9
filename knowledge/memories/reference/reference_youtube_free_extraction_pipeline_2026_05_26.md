---
name: youtube-free-extraction-pipeline-2026-05-26
description: $0 YouTube → PRISM tribal/wiki extraction pipeline. yt-dlp auto-subs → Ollama qwen2.5-coder → TribalKnowledgeEngine + LLM-Wiki. Replaces paid Whisper/Claude-Vision path. Live-tested on Dapra Corp machining videos.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.076Z
aliases: reference_youtube_free_extraction_pipeline_2026_05_26
---


# YouTube FREE extraction pipeline (2026-05-26, slot:victor)

`scripts/youtube-free-extract.mjs` — $0 YouTube → PRISM tribal-knowledge / wiki ingestion. Closes the gap where existing `VideoLearningEngine` required `OPENAI_API_KEY` (Whisper) + `ANTHROPIC_API_KEY` (Vision) for every video.

## Why it exists

`mcp-server/src/engines/VideoLearningEngine.ts`:
- `transcribeAudio()` line 247 — requires `OPENAI_API_KEY` ($0.006/min)
- `analyzeKeyframes()` line 434 — requires `ANTHROPIC_API_KEY` (~$0.04 per Haiku-Vision batch)

~95% of public YouTube content (including the entire Dapra Corp channel) already has free auto-generated captions. Paying for transcription is waste.

## Architecture

```
YouTube URL or "ytsearch5:dapra machining"
       ↓
yt-dlp --write-auto-subs --write-subs --sub-langs en.*,en --sub-format vtt
       --skip-download --no-warnings --no-playlist --ignore-errors
       --no-abort-on-error --print-json
       ↓ ($0, instant — VTT auto-captions)
parseVtt(vttText) — W3C WebVTT (w3.org/TR/webvtt1) + YouTube auto-caption quirks
                    (inline <hh:mm:ss.mmm> word-timing tags, overlapping cues)
       ↓
chunkTranscript(transcript, 8000 chars) — fits Ollama 8K context window
       ↓
Ollama POST /api/generate (qwen2.5-coder:7b, temp 0.15, keep_alive 10m)
       ↓ ($0, ~5s/chunk on warm model)
parseTipsFromLlm(rawText) — lenient JSON extraction, ```json fence-stripping,
                            category whitelist, confidence clamping, dedupe
       ↓
tipsToKnowledgeTips(parsed, meta) — KnowledgeTip[] with source/provenance
       ↓
TribalKnowledgeEngine.ingest(tips) — U-TK01 content-dedup
       ↓ (fallback if engine not built: JSON dump to state/shared/youtube-extraction/<id>-tips-fallback.json)
+ writeWikiEntry → knowledge/wiki/code-tribal/youtube-<id>.md (LLM-Wiki schema)
+ appendWikiLog → knowledge/wiki/log.md
+ writeExtractionArtifact → state/shared/youtube-extraction/<id>.json
```

## Live test result (Dapra Corp, 2026-05-26)

| Video | Channel | Duration | Tips | Latency | Cost |
|---|---|---|---|---|---|
| `y2yZ-Ql6eyo` "Deep Pocket Finishing with a Back Draft Cutter" | DAPRA | 103s | 6 | ~9s end-to-end | $0.00 |
| `HS50Q-EWtdU` "Tips for 3D Finishing of Sloped Part Surfaces with a Ball Nose" | DAPRA | 62s | 2 | (batch) | $0.00 |
| `_1i0mlRMGJs` (third search hit) | — | — | 0 (no en subs) | graceful skip | $0.00 |
| **Batch total (ytsearch3:dapra cnc milling tips)** | — | — | **8 tips** | **17s** | **$0.00** |

Tip quality (sample): `tk-yt-y2yZ-Ql6eyo-001` confidence 90%, category `tooling`, body "Use a backdraft or bullnose cutter for deep pockets with tapered walls. Solid carbide end mills are suitable for shallow, straight-walled pockets." — verbatim machining tribal wisdom with timestamp anchor for replay.

## Reputable external sources (all $0)

- **yt-dlp** (github.com/yt-dlp/yt-dlp) — Python module, pre-installed on PRISM Win11 host (`python -m yt_dlp`, v2026.03.17)
- **WebVTT** W3C standard (w3.org/TR/webvtt1) — the subtitle format YouTube emits
- **Ollama** (ollama.com) — local LLM, 8 models resident incl. `qwen2.5-coder:7b`, `qwen2.5vl:7b`, `llama3.2-vision:11b`, `nomic-embed-text:latest`
- **PRISM TribalKnowledgeEngine** — content-dedup ingestion (U-TK01)

## Usage

```bash
# Single video
node H:/prism/scripts/youtube-free-extract.mjs "https://www.youtube.com/watch?v=y2yZ-Ql6eyo"

# Batch via search
node H:/prism/scripts/youtube-free-extract.mjs "ytsearch5:dapra machining"

# Transcript-only (skip Ollama)
node H:/prism/scripts/youtube-free-extract.mjs <url> --transcript-only

# Skip TribalEngine ingest (artifact JSON only)
node H:/prism/scripts/youtube-free-extract.mjs <url> --no-ingest --no-wiki

# Override model
node H:/prism/scripts/youtube-free-extract.mjs <url> --model qwen2.5-coder:14b
```

Env overrides:
- `PRISM_PYTHON` — Python executable path
- `OLLAMA_URL` — default `http://127.0.0.1:11434`

## Test status

`scripts/youtube-free-extract.test.mjs` — 58 hermetic tests across 11 suites, **58/58 PASS in 555ms** (node --test). Covers WebVTT parse + YouTube auto-caption quirks (inline word-timing tags, overlapping-cue dedupe, HTML entities), chunk packing, prompt construction (every valid category enumerated, "NEVER invent numeric values" guard), LLM-output lenient JSON parse + truncation + clamping, KnowledgeTip mapping (sequential IDs, confidence-percentage conversion, source-replay string, provenance bundle), URL parsing (all 5 YouTube URL forms + 11-char ID exactness), CLI arg parse, summary formatting (`$0 cost` invariant surfaced).

## Bridge to existing PRISM surface

Future wiring (U-VIDEO-FREE-WIRE):
- `/video-learn youtube <url>` skill → route through this script first (free path)
- `VideoLearningEngine.transcribeAudio()` → fallthrough to `youtube-free-extract.fetchSubtitles()` when `OPENAI_API_KEY` absent
- Knowledge dispatcher `learn_video_pipeline_run` → expose free path as a sibling action

## Related

- [[feedback_use_lima_pypdf_page_extractor]] — sibling FREE-extraction discipline (PDFs)
- [[feedback_ollama_token_routing]] — Ollama-first routing per global doctrine
- [[reference_ollama_pipeline_ms0_2026_05_15]] — ollama-pipeline infrastructure
- [[tribalknowledgeengine]] — ingestion target (line 1343 `ingest()`)
- [[video-learn]] — paid-path video skill, still default until U-VIDEO-FREE-WIRE
- [[feedback_playwright_for_online_sources]] — counterpart for browser scraping

## Files shipped

- `H:/prism/scripts/youtube-free-extract.mjs` (~720 lines, 14 exports, spawn-based for security)
- `H:/prism/scripts/youtube-free-extract.test.mjs` (~370 lines, 58 hermetic tests)
- `H:/prism/knowledge/wiki/lessons/youtube-free-extraction.md` (doctrine + ops guide)
- `H:/prism/knowledge/wiki/code-tribal/youtube-y2yZ-Ql6eyo.md` (first live-test entry)
- `H:/prism/knowledge/wiki/code-tribal/youtube-HS50Q-EWtdU.md` (second live-test entry)
- `H:/prism/state/shared/youtube-extraction/*.json` (audit artifacts)
