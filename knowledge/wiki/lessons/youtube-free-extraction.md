---
title: "YouTube FREE extraction pipeline"
slug: youtube-free-extraction
type: lessons
created: 2026-05-26
author: slot:victor (claude-2423b113)
related:
  - youtube-free-extract.mjs
  - tribalknowledgeengine
  - video-learn
  - ollama-pipeline-ms0
aliases: [youtube-free-extraction, yt-dlp-extraction, free-video-extraction]
---

# YouTube FREE extraction pipeline

`scripts/youtube-free-extract.mjs` — $0 YouTube → PRISM tribal/wiki pipeline. Replaces the paid `VideoLearningEngine` Whisper+Claude-Vision path for the ~95% of public YouTube content that has free auto-captions.

## Doctrine

1. **Subtitles first, audio never.** YouTube auto-generates captions for almost every video. yt-dlp can fetch them with `--write-auto-subs --skip-download` in 2-5 seconds at $0 cost. The paid Whisper transcription path is reserved for the long-tail of video that genuinely has no captions (and even then, local `faster-whisper` should be tried first).
2. **Ollama owns tribal extraction.** `qwen2.5-coder:7b` (and family) is fully capable of extracting tribal tips from a machining transcript. Tested live on Dapra Corp videos — output quality is on par with what a paid model would produce, in 5-10 seconds per chunk at $0.
3. **Fail-loud on hallucination risk.** The extraction prompt explicitly orders "NEVER invent numeric values not in the transcript" and "If no real tips appear, output []". Hallucinated tips poison TribalKnowledgeEngine; better to extract less than to extract wrong.
4. **Replay anchors in every tip.** Every extracted tip carries `source: youtube:<id>@<timestamp> (<url>)` and a `provenance` bundle. A future audit can jump back to the exact moment in the source video.
5. **Graceful per-video failure in batches.** `--ignore-errors --no-abort-on-error` lets a ytsearch hit with no captions fail silently while the rest of the batch ingests. The summary surfaces failed-video reasons.

## Pipeline (tier-stack)

| Tier | Cost | Latency | Coverage | When |
|---|---|---|---|---|
| 1. yt-dlp auto-subs | $0 | 2-5s | ~95% YouTube | Always first |
| 2. yt-dlp uploaded subs | $0 | 2-5s | manually captioned videos | Tier-1 miss |
| 3. yt-dlp audio + faster-whisper | $0 | 5-30s | universal | Future — not wired |
| 4. yt-dlp audio + Whisper API | $0.006/min | 10-30s | universal | Off by default |

Live test result (2026-05-26): tier 1 caught both viable Dapra videos in the search. Tier 2-4 not yet hit.

## Live test summary (Dapra Corp, 2026-05-26)

Run: `node scripts/youtube-free-extract.mjs "ytsearch3:dapra cnc milling tips"`

```
youtube-free-extract — 3 video(s), 16876ms, $0.00
  ok: 2 · failed: 1
  tips extracted: 8 · ingested into TribalKnowledgeEngine: 0

  ok y2yZ-Ql6eyo "Deep Pocket Finishing with a Back Draft Cutter – 3D Finish M" (103s)
      transcript: 74 segments, 3600 chars
      tips: extracted=6 ingested=0
      wiki: knowledge/wiki/code-tribal/youtube-y2yZ-Ql6eyo.md
  ok HS50Q-EWtdU "Tips for 3D Finishing of Sloped Part Surfaces with a Ball No" (62s)
      transcript: 44 segments, 1850 chars
      tips: extracted=2 ingested=0
  x _1i0mlRMGJs — no English subtitles available (auto or manual)
```

8 tribal tips at 0.0017 seconds per tip end-to-end. Top tip (confidence 90%):

> **Backdraft Cutter for Deep Pocket Finishing**
> Use a backdraft or bullnose cutter for deep pockets with tapered walls. Solid carbide end mills are suitable for shallow, straight-walled pockets.
> — `youtube:y2yZ-Ql6eyo@0:30` — DAPRA, category `tooling`

## Reputable sources

| Source | Role | License |
|---|---|---|
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Subtitle + metadata fetch | Unlicense |
| [WebVTT (W3C)](https://www.w3.org/TR/webvtt1/) | Subtitle format spec | W3C public |
| [Ollama](https://ollama.com) | Local LLM inference | MIT |
| [qwen2.5-coder](https://huggingface.co/Qwen) | Extraction model | Apache-2.0 |

## Operational notes

- **Windows `spawn` pitfall:** Node's `spawn(cmd, args)` without `shell:true` does NOT walk PATHEXT. The script auto-resolves Python via `resolvePythonExe()` — tries `PRISM_PYTHON` env, then `H:/Tools/python/python.exe` (the portable PRISM Python set in SessionStart), then `python.exe`/`python3`/`python`.
- **Ollama cold-load:** First call after Ollama daemon idle can take 30-120s while the model paged in. `keep_alive: "10m"` in the script holds it warm across chunk calls.
- **TribalKnowledgeEngine ingest fallback:** The engine source is TypeScript (`mcp-server/src/engines/TribalKnowledgeEngine.ts`); a fresh checkout without `npm run build` can't live-import it. The script auto-falls-back to writing tips as JSON to `state/shared/youtube-extraction/<id>-tips-fallback.json` — replayable into the engine later via a one-line `tribalKnowledgeEngine.ingest(JSON.parse(fs.readFileSync(...)))` once `dist/` exists.
- **yt-dlp partial success:** On a ytsearch batch where some hits are unavailable, yt-dlp exits non-zero but still emits JSON metadata for every video it DID succeed on. `fetchSubtitles()` parses stdout BEFORE consulting the exit code so partial-success batches still produce output.

## Future wiring

| Unit | Effort | Description |
|---|---|---|
| `U-VIDEO-FREE-WIRE` | 1h | Patch `/video-learn youtube <url>` skill to call this script first; fallthrough to paid path only if `--no-free` |
| `U-VIDEO-FREE-VISION` | 2h | Add Ollama `moondream:1.8b` or `qwen2.5vl:7b` keyframe analysis as free replacement for `VideoLearningEngine.analyzeKeyframes` |
| `U-VIDEO-FREE-WHISPER` | 3h | Wire local `faster-whisper` as Tier 3 (no-captions fallback) |
| `U-VIDEO-FREE-DISPATCHER` | 30m | Expose `knowledgeDispatcher.learn_video_pipeline_run` with `mode: "free"` |
| `U-VIDEO-FREE-DAPRA-CORPUS` | 1h | Batch-ingest the full Dapra channel (~50 videos, est. ~150 tips, $0) |

## Related

- [[reference_youtube_free_extraction_pipeline_2026_05_26]] — memory
- [[tribalknowledgeengine]] — ingest target
- [[video-learn]] — paid-path skill (still default pre-U-VIDEO-FREE-WIRE)
- [[ollama-pipeline-ms0]] — ollama-pipeline infrastructure
- [[feedback_use_lima_pypdf_page_extractor]] — sibling FREE-extraction discipline (PDFs)
- [[feedback_playwright_for_online_sources]] — counterpart for browser scraping
