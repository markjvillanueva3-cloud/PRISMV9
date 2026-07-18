---
name: reference_ollama_chat_live_healthy_2026_06_21
description: "P0-U01 (COMBO-EFFICIENCY-MS0 'Revive Ollama') is STALE-RESOLVED as of 2026-06-21 live probe (slot:india). The month-old (2026-05-25) 'Ollama DOWN / /api/chat 100% skip' diagnosis no longer holds: daemon UP, 17 models available, /api/chat -> qwen2.5-coder:32b returns 'OK' in <25s, session telemetry shows ~177k tokens offloaded this session. The AI-offload substrate the standing directive relies on ('utilize ollama offloading') is HEALTHY. Do NOT re-chase a daemon revival."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.671Z
aliases: reference_ollama_chat_live_healthy_2026_06_21
---


**CONTEXT:** slot:india autonomous /loop, fresh post-compact window 2026-06-21. After re-verifying FIXES (gated) + WIRINGS (0) rungs, descended to the BACKLOG rung (`BUILD_STATE.NEEDS_BUILDING.top_pending_units`). The ONLY india-relevant unit in the top-24 was **P0-U01 (COMBO-EFFICIENCY-MS0): "Diagnose + revive Ollama /api/chat (currently 100% skip)"**. Investigated it per task-freshness rule (spec is a month old) before acting.

**LIVE PROBE (2026-06-21, this host DESKTOP-N7MI1VB):**
- `curl /api/tags` -> **17 models** available incl. qwen2.5-coder:{32b,14b,7b,1.5b}, qwen3-coder:30b, gpt-oss:{120b,20b}, deepseek-r1:{32b,14b}, qwen3-vl/qwen2.5vl families, llama3.2-vision:11b.
- `curl /api/chat -d '{model:"qwen2.5-coder:32b", messages:[OK test], stream:false}'` -> returned **"OK"** in <25s (cold-load + infer). **`/api/chat` WORKS.**
- Session telemetry (PSN savings headline): rewriter 349 hits / 1745 misses (~17% offload rate), **~177,108 tokens offloaded this session**. (Offload is OCCURRING — below the 30% target but that is a *tuning* question, NOT a daemon-health question.)

**CONCLUSION (R12 freshness correction):** the COMBO-EFFICIENCY-MS0 spec (`state/shared/specs/2026-05-25-COMBO-EFFICIENCY-MS0.md` line 23) marks Ollama "🔴 DOWN / /api/chat 100% skip" — that is a **month-stale** snapshot. As of 2026-06-21 the daemon is UP and /api/chat is responsive. **P0-U01 ("Revive Ollama", a 30-min ops/diagnostic task: `ollama ps`/`nvidia-smi`/restart) is effectively resolved** — there is nothing to revive. (COMBO-EFFICIENCY-MS0 is **alpha's** milestone, so india does not unilaterally close the unit; this memory records the live-verified state so it is not re-chased and so the offload dashboard / spec can be reconciled by the owner.)

**WHY THIS MATTERS for the standing directive:** the directive mandates "utilize ollama offloading" as a primary substrate. This confirms it is LIVE and available (17 models, working /api/chat, 177k saved/session) — the fallback ladder (Ollama -> Sonnet-agent -> Opus) starts from a HEALTHY first rung, not a dead one.

**REMAINING (separate, NOT this finding):** rewriter offload rate ~17% vs 30% target = the "low-confidence-calibrated skip" tuning question. The spec says "No softening of PRISM_REWRITER_HEALTH_FLOOR -- fix the root cause." That is a distinct alpha/token-optimization-domain investigation (why the rewriter's confidence gate skips ~83% when Ollama is healthy), NOT a daemon revival. Not chased this window.

**SIBLINGS:** [[reference_fleet_test_sweep_triage_2026_06_21]] (the other R12 freshness correction this window — a fabricated test-reds triage). Both are instances of: a prior-session/spec snapshot went stale or wrong; re-verify live before acting (task-freshness + R12).
