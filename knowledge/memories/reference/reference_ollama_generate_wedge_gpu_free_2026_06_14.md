---
name: ollama-generate-wedge-gpu-free-2026-06-14
description: 2026-06-14 (slot:bravo) -- Ollama can wedge on /api/generate at the SERVER level while the GPU is FREE and /api/embeddings still computes. Corrects an earlier-this-session "GPU saturated by peer vision model" misdiagnosis (R12). The fix (service restart) is operator-gated. Diagnose with nvidia-smi + /api/ps + /api/embeddings before claiming a cause.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.677Z
aliases: reference_ollama_generate_wedge_gpu_free_2026_06_14
---


2026-06-14 (slot:bravo). **Corrects a stale claim I made earlier this session** (R12): I asserted Ollama generate was "blocked because the GPU is saturated by a peer's resident qwen2.5vl:32b vision model." Re-verifying when the Stop hook pushed back proved that WRONG.

## The real state (verified live)
- `nvidia-smi`: **2247 MiB / 97887 MiB used, 0% util** -- GPU essentially IDLE.
- `/api/ps`: only `nomic-embed-text` (137M embeddings) resident -- the vision model is GONE; no generation model loaded; no peer mid-generate.
- `/api/tags`, `/api/ps`: respond instantly.
- `/api/embeddings` (nomic-embed): **returns a real vector instantly** -- the server CAN compute.
- `/api/generate`: **HANGS** -- tried `gpt-oss:20b` (120s) and `qwen2.5-coder:1.5b` (30s), both empty/timeout. A model-load that hangs on a free 96GB GPU = a server-level wedge (stuck generation runner / scheduler lock), NOT GPU saturation and NOT a cold-load delay.
- `ollama.exe` runs as a **Windows SERVICE** (PID 28864), not the "PRISM Ollama Serve" scheduled task (that name not found).

## Lesson / doctrine
1. **Never claim "GPU saturated" without `nvidia-smi`.** The headline symptom (generate hangs) has at least two causes -- GPU-full vs server-wedged -- and they need different fixes. Embeddings-work + generate-hangs + GPU-free => the generation runner is wedged, not the GPU.
2. **The fix is a service restart**, which doctrine sanctions for a wedged Ollama -- BUT the operator explicitly prohibited unilaterally restarting the shared Ollama service. With the original peer-vision reason void, it is still an **operator-gated** action (do not override a direct prohibition on an inferred "reason is gone"). Surface the precise diagnosis + unblock instead.
3. **Embeddings working = the RAG retrieval + CAG cold-anchor surfaces are FUNCTIONAL even while generate is wedged.** Only the final-answer SYNTHESIS (and synthesis-brain regen) needs generate. So generate-free AI work (RAG-corpus enrichment, embedding recall, cold-anchor) is still available -- proven this session: the galaxy-reasoning-bridge retrieves the new mill AI-Synergy section as the #1 RAG chunk for an AI query (`chunkMarkdown` + `retrieveTopK`, no generate).

## RESOLUTION (same session, operator-approved)
Asked the operator via AskUserQuestion (the prohibition was theirs to lift); they said **"Yes, restart now."** The launcher is the **"PRISM Ollama Serve" scheduled task** (NOT a Windows service; `Get-Service *ollama*` finds nothing -- `Get-ScheduledTask` does). Restart = `Stop-ScheduledTask` -> force-kill the lingering wedged `ollama.exe` -> `Start-ScheduledTask` (no elevation needed; task runs as the user from `%LOCALAPPDATA%\Programs\Ollama`). New pid came up; `/api/generate` returned `done:true` in 6.6s (was infinite hang). qwen2.5-coder:32b then produced real text in 19s.
**Note:** gpt-oss:* return an EMPTY `response` with a tiny `num_predict` (reasoning-channel eats the budget) -- not a wedge; use a non-thinking model (qwen2.5-coder:32b) or a larger num_predict to confirm liveness.
**Unblocked work then ran end-to-end:** galaxy-reasoning-bridge CAG+RAG over the 7 enriched owner galaxies -> grounded answers that cite the new AI-Synergy sections (mill answer cited "19 AI engines / PSN leg #10"; sources `[CLAUDE.md, retrieved-hybrid:5, ai-synergy-audit]`), emitting 7 fresh `bridge-reasoning-lora` pairs (115->122). Combined corpus 1312->1319, gate L=PASS.

-> [[reference_lora_galaxy_aisynergy_2026_06_14]] · [[feedback_never_claim_absence_without_deep_search]] · [[feedback_ollama_token_routing]]
