---
name: reference-ollama-generation-down-gpu-contention-2026-06-10
description: "Ollama GENERATION (/api/generate, /api/chat) is intermittently DOWN/aborting fleet-wide under GPU contention even though /api/tags reports healthy — gpt-oss:120b (65GB) + 8+ concurrent fleet /loop sessions + OCR saturate the 96GB Blackwell GPU. This THROTTLES the 'Ollama-for-grunt' operating directive: hit 3x in one delta session (archetype labeler x2 abort, galaxy-synthesis-refresh deferred 9 galaxies incl cad/cam). Fix = P3 pre-warm + request queue + concurrency cap (fleet-infra)."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.677Z
aliases: reference_ollama_generation_down_gpu_contention_2026_06_10
---


# Ollama generation DOWN under fleet GPU contention (2026-06-10)

Observed live across THREE delta-session tasks on 2026-06-10:
1. `cad-ollama-archetype-label.mjs --force --limit 1` — the `/api/generate` call to qwen2.5-coder:32b (and gpt-oss:120b) **aborted at the timeout** ("This operation was aborted"), even after bumping TIMEOUT_MS 30s->120s -> degraded to rule-based fallback every slug.
2. `galaxy-synthesis-refresh.mjs --galaxy cad/cam` — reported `synthesis model resolved -> gpt-oss:120b` then **`⚠ 9 galaxies are stale but ollama generation is DOWN — deferred (re-run when up): ai-training, blueprint-vision, bug-hunting, business, cad, cam, compliance-safety, knowledge-conversion, speed-feed`**. The brain fold-in did NOT happen.
3. `mine-galaxy-transcripts.mjs` ran but most transcripts were `skipped(exists)`; the few it mined took 77-216s each (slow generation).

**Key distinction:** `/api/tags` (model LISTING) returns healthy/instant — so health checks PASS — but `/api/generate` / `/api/chat` (actual INFERENCE) abort or hang. A health probe on `/api/tags` is NOT a generation-availability probe.

**Root cause:** the 96GB Blackwell GPU is saturated. `gpt-oss:120b` alone is ~65GB resident; with 8-10 concurrent fleet `/loop` sessions (golf, india, sfc, doc-drift, CAM closed-loop, etc.) + blueprint-OCR batches all issuing generation requests, Ollama queues/evicts/aborts. Loading a second large model (e.g. qwen2.5-coder:32b @ 20GB) on top can exceed VRAM.

**Impact:** the operator's standing directive "utilize Ollama for grunt work with our strongest models" ([[feedback_utilize_ollama_for_efficiency]]) is currently BOTTLENECKED. Anything that routes generation to local Ollama degrades to fallback or defers. The closed-loop-CAD goal depends on Ollama for OCR/labeling/synthesis grunt — so this is a goal-level blocker, not a one-off.

**Fix (roadmap P3 — fleet-infra, not delta-CAD-local):**
- **Pre-warm** the chosen model once before a batch (one throwaway generate) so the first real call isn't paying cold-load.
- **Request queue + concurrency cap** so N fleet sessions don't all hit `/api/generate` simultaneously (serialize, or cap parallel generations).
- **Model-tier discipline:** reserve gpt-oss:120b for low-volume deep synthesis; route high-volume grunt (labeling/classify) to a smaller resident model (qwen2.5-coder:1.5b/32b) sized to co-reside.
- **Generation-availability probe** (not just `/api/tags`): a tiny `/api/generate` with a 5s budget before committing a batch to the LLM path; fall back deterministically if it fails.

Owners: fleet GPU scheduling is golf/india/sierra territory; delta consumes it. Delta's own scripts already fall back gracefully (archetype labeler) — the systemic fix is fleet-level.

See [[feedback_workflow_concurrency_and_local_routing_2026_06_08]] (bound concurrency + prefer Blackwell) · [[feedback_build_for_blackwell_hardware]] (utilization not capacity) · the A1/U-A1B commits.
