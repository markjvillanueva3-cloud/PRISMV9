---
name: reference_india_transcript_mine_2026_06_09
description: "scripts/mine-india-transcripts.mjs (U-MINE-INDIA) -- Ollama-mined india/PRISM-AI-systems transcript miner -> Obsidian vault synthesis. Maxed clone of hotel's miner: concurrent + 2-tier + cross-session synthesis + shrink-guarded vault feed."
type: reference
galaxy: ai-training
source: prism-memory
synced: 2026-06-09T17:46:05.971Z
aliases: reference_india_transcript_mine_2026_06_09
---


# India transcript miner (U-MINE-INDIA, slot:india 2026-06-09)

Operator directive: *"use ollama to read all india / PRISM-AI-systems (NN/GNN/LoRA/RAG/PSN/system-viz/deep-learning) session transcripts, synergize with the Obsidian vault, max out its potential."* Follows hotel's footsteps ([[reference_post_ship_hotel-transcript-mine-u-mine-hotel-transcripts]], `scripts/mine-hotel-transcripts.mjs`) — a clone of its reviewer-hardened pattern, generalized + maxed.

**Tool:** `scripts/mine-india-transcripts.mjs` (+ `.test.mjs`, 12 tests). Routes the heavy transcript read+summarize to LOCAL Ollama ($0 Claude tokens) on the Blackwell. Stream-parse JSONL (readline, never readFileSync — V8 cap) → conversational spine (user/assistant text, anchored noise-drop) → Ollama map-reduce → per-session digest (resumable, skip-if-exists) → `_COMBINED.md` → cross-session SYNTHESIS → `_SYNTHESIS.md` + Obsidian vault.

**Maxed beyond hotel:**
- DISCOVERY: india-slot UNION any AI-systems handoff topic (`INDIA_TOPIC_RE`), so AI work under any slot is captured. Keys off `HANDOFF-claude-<id>-<topic>.md` — a session with no topic-matching handoff is NOT discoverable (documented ceiling).
- CONCURRENCY: `makeLimiter(CONCURRENCY=4)` caps ALL Ollama calls to `OLLAMA_NUM_PARALLEL`; concurrent per-slice map cut a 5-slice transcript 124s→68s.
- 2-TIER: `--map-model gpt-oss:20b` (fast) / `--synth-model gpt-oss:120b` (frontier, fits 96GB).
- SYNTHESIS: merges all per-session digests into ONE deduplicated knowledge digest (## Shipped / Decisions / Directives / Open-threads / Findings / Metrics+gate), not concat.
- OBSIDIAN SYNERGY: writes `knowledge/memories/reference/reference_india_transcript_synthesis.md` (frontmatter'd) → tribal-embeddable + semantic-recallable.

**Two reviewer-P1 lessons (fixed + live-validated):**
1. **Coverage honesty (R12):** the mineable count is computed BEFORE `--limit` so every output reports `<mined> of <mineable>` — a `--limit 2` run must NOT print "2 of 2" (that masks ~2.4% of 84 mineable). Live: 128 discovered / 84 mineable / 44 no-transcript. See [[feedback_report_true_denominator_not_post_limit]] if promoted.
2. **Vault shrink-guard (the 2026-06-08 tribal-brain clobber class, [[reference_tribal_index_v8_string_cap_2026_06_08]]):** vault frontmatter carries `coverage_sessions`/`mineable_sessions`; `writeVaultMemory` refuses to clobber a larger-coverage synthesis with a smaller one unless `--force-vault`. A fixed-name `writeFileSync` without a shrink-guard is the silent-downgrade risk.

**MCP routing (directive "route through MCP"):** no `prism_ai:local_llm` dispatcher action exists today (verified) — direct Ollama is the current canonical local route (same as `ask-ollama.mjs`); the MCP action is a queued follow-up, NOT fabricated (R12).

**Full mine:** `node scripts/mine-india-transcripts.mjs` (no --limit) mines all 84 → 84-session vault synthesis (resumable). Re-run after new sessions. Usage: `[--limit N] [--map-model M] [--synth-model M] [--concurrency N] [--since YYYY-MM-DD] [--force] [--no-vault] [--force-vault]`.

**COMPLETED 2026-06-09 (U-MINE-INDIA-COMPLETE):** 84/84 mined; vault synthesis written (`coverage_sessions:84`, 10.8KB, 6 structured sections). Reaper-immune scheduled-task installer = `.claude/helpers/install-india-mine-task.ps1` (U-MINE-INDIA-TASK) for unattended/daily refresh.

**Reusable lesson — resumable passes beat the fleet-reaper (in-session):** a long full-corpus Ollama pass is REAPED (exit 255) under fleet load (the reaper kills long session-attached node, foreground OR run_in_background). The fix that does NOT need a scheduled task: make the job **resumable (skip-if-exists per unit)** + run it **foreground in repeated turns** — each pass advances monotonically (47->62->82->84 here) because done-units skip instantly, and the final near-all-skip pass survives to the expensive synthesis call. Foreground = no R14 orphan (dies with the turn). The scheduled task is still the right *unattended* mechanism; this is the *in-session* one. Generalizes to OCR-corpus / embed / any long local-LLM batch. See [[reference_xray_ocr_corpus_resumable_multipage_2026_06_08]] (same resumable-cursor pattern).

Related: [[reference_local_compute_synergy_state_2026_06_09]] (Ollama roster), [[feedback_build_for_blackwell_hardware]].
