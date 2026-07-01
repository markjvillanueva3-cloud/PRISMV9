---
name: reference_galaxy_mine_ollama_saturation_2026_06_11
description: Concurrent galaxy transcript mines saturate Ollama and stall — serialize them; hermes-zulu mine partial (9/35) + resumable
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.586Z
aliases: reference_galaxy_mine_ollama_saturation_2026_06_11
---


**Finding (slot:bravo, 2026-06-11):** running `scripts/mine-galaxy-transcripts.mjs` for a galaxy **while 3+ peer-slot galaxy mines are already running saturates the local Ollama server and stalls ALL of them.** Observed: launched `--galaxy hermes-zulu --limit 30`; with 4 concurrent mines all queuing on `gpt-oss:20b` (the MAP model), the map/reduce calls starved — 4 sessions in the first ~25 min (146s -> 145s -> 65s -> 295s, *slowing*), then **zero new sessions in the next ~20 min** (effective stall). A direct `ask-ollama.mjs` call also timed out at 180s during this window. `curl :11434/api/ps` showed only `gpt-oss:20b` + `nomic-embed-text` loaded, serializing all 4 mines.

**Lesson:** galaxy transcript mining is Ollama-bound, not Claude-bound. The fleet should **serialize** galaxy mines (one galaxy at a time), not fan them out concurrently — concurrent mines are slower in aggregate AND stall individually. A coordination lock (or a single fleet-level mine queue) would fix this; today there is none, so each slot's mine competes. This is fleet-hygiene/golf territory.

**R14 action taken:** the stalled hermes-zulu mine (node 115348 + nohup wrapper) was killed once it went ~20 min with no progress — a hung job hogging saturated Ollama is a reap target, NOT useful in-flight work. Killing it also freed Ollama for the 3 peer mines (fleet-positive). Peer mines were left untouched (targeted kill by `--galaxy hermes-zulu` in cmdline).

**Mine status (resumable):** `state/shared/galaxy-transcript-mining/hermes-zulu/` holds **9 of ~35** target digests; `_SYNTHESIS.md` + `knowledge/memories/reference/reference_hermes-zulu_transcript_synthesis.md` are still the 2026-06-09 versions (synthesis only runs after ALL sessions mine). **To finish:** re-run `node scripts/mine-galaxy-transcripts.mjs --galaxy hermes-zulu --limit 30 --synth-model gpt-oss:120b` WHEN Ollama has headroom (peer mines done) — it skips the 9 already-mined and completes the rest, then refreshes the synthesis + vault memo. Do NOT re-launch it concurrently with other galaxy mines.

Also: a double-background mistake — `nohup ... &` *inside* a `run_in_background:true` Bash — detaches the real node child so the harness completion notification fires for the launcher shell, not the work. Launch long detached jobs via ONE backgrounding mechanism, not both. See [[feedback_close_background_tasks_at_stop]].
