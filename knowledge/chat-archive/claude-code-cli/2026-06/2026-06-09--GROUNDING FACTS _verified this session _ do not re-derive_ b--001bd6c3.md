---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "GROUNDING FACTS (verified this session — do not re-derive, build on these): - Ha"
date: "2026-06-09"
first_ts: "2026-06-09T18:44:10.086Z"
last_ts: "2026-06-09T18:45:39.343Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_bb2026cd-2f4/agent-aa7a104f35b09227d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# GROUNDING FACTS (verified this session — do not re-derive, build on these): - Ha

> **claude-code-cli** | 2026-06-09 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_bb2026cd-2f4/agent-aa7a104f35b09227d.jsonl`

## Transcript

### User | 2026-06-09T18:44:10.086Z


GROUNDING FACTS (verified this session — do not re-derive, build on these):
- Hardware: RTX PRO 6000 Blackwell 96GB VRAM, 127GB RAM, Ryzen 9 9950X3D. GPU torch stack LIVE (H:/Tools/python-gpu).
- Ollama roster (verified live): gpt-oss:120b(~65GB, native tool_calls), gpt-oss:20b(~14GB, native tool_calls), qwen2.5-coder:32b(~37GB@16K, text-only/no structured tool_calls), qwen2.5-coder:1.5b, qwen2.5vl:7b, qwen3-vl:8b, llama3.2-vision:11b, moondream:1.8b, nomic-embed-text(768-dim). qwen2.5-coder:7b is ABSENT. Co-residency: 20b+32b co-reside warm; 120b CANNOT co-reside with 32b.
- RTK = v0.40.0, a THIRD-PARTY Rust binary at C:/Users/wompu/bin/rtk.exe (+ H:/.claude/bin/rtk.exe). NO source in this repo. Subcommands incl: smart (2-line HEURISTIC summary), summary (HEURISTIC), test, gain, hook (processors for Gemini/Copilot CLI). RTK summarization is regex/heuristic, NOT LLM-backed. Current measured savings: ~467K tokens (934 hits / 806 misses), the dominant token-economy substrate.
- PRISM already owns: scripts/lib/ollama-coresidency.mjs (U9: keepAliveFor/applyHints/withHardReasonLock mutex), scripts/ollama-codegen.mjs (U6), scripts/ollama-build-loop.mjs (U7 Opus-tail review gate), scripts/ollama-capability-probe.mjs (U10), scripts/ask-ollama.mjs (OLLAMA-EXPAND: viz/summarize/explain/triage modes), mcp-server/src/engines/OllamaTaskOffloaderEngine.ts (the CANONICAL task->model router: classifyTask/selectModel, KEEP_ON_CLAUDE_PATTERNS). RTK hooks: rtk-prefix-reminder, rtk-auto-suggest, rtk-fraction-tune, pre-tool-bash-rtk-enforce, posttool-rtk-adoption-measure, stop-rtk-fraction-recalibrate, rtk-savings-ledger.
- CONSTRAINT: slot/bravo worktree only (H:/prism-slot-bravo). No merge to main (gated). No editing the RTK binary (external). No child_process in new .mjs (security hook). Safety: G-code/physics/feed-speed/units NEVER route to local LLM (always cloud Claude). R8 dedup is mandatory — any "upgrade" must NOT fork OllamaTaskOffloaderEngine or the existing ollama/* scripts
... [+37727 chars truncated]

### Assistant | 2026-06-09T18:44:32.463Z

I'll synthesize the four investigator reports into a single dependency-ordered build plan. Let me first reconcile the key tension between them before writing the plan.

The four reports converge on a critical finding I need to honor: the "upgrade RTK" goal splits cleanly into (a) **RTK itself = external, untouchable, no LLM mode coming** and (b) **the real win = PRISM-side hardware-roster fixes + a companion compressor**. There's a sharp disagreement I must resolve: Investigator 2 proposes a net-new `ollama-compress-output.mjs` stdin wrapper, while the dedup investigator (4) says the LLM-compressor must EXTEND the existing offload-nudge path, not stand up a parallel compressor. R8 sides with #4 — but #2's stdin-filter insight is real (no existing asset consumes a pipe). I'll reconcile: the compressor is a thin stdin filter that REUSES `callLocalModel`, not a new router/engine.

Let me verify two load-bearing facts before finalizing.

### Assistant | 2026-06-09T18:44:32.942Z

[tool_use: Bash]

### Assistant | 2026-06-09T18:44:33.054Z

[tool_use: Bash]

### User | 2026-06-09T18:44:41.985Z

[tool_result] /h/prism-slot-bravo
ls: cannot access 'scripts/ask-ollama.mjs': No such file or directory
mcp-server/src/engines/OllamaTaskOffloaderEngine.ts
---route hook default model + config read---
62:    name: "qwen2.5-coder:7b",
69:    name: "qwen2.5-coder:14b",

### User | 2026-06-09T18:44:42.483Z

[tool_result] === route-pretooluse default model line ===
30: *   PRISM_OLLAMA_ROUTE_MODEL         → model for the auto summary (default qwen2.5-coder:7b)
36: *     { "mode": "auto" | "suggest", "minKb": >=8, "model": "qwen2.5-coder:7b" }
379:  const model = env.PRISM_OLLAMA_ROUTE_MODEL || config.model || "qwen2.5-coder:7b";
=== offload-enforce default model ===
25://        PRISM_OLLAMA_OFFLOAD_DISABLE=1 (off 
... [+305 chars truncated]

### Assistant | 2026-06-09T18:45:39.343Z

Both load-bearing facts confirmed: `ask-ollama.mjs` is ABSENT in bravo (so any compressor importing it needs a sync-first prerequisite), the OffloaderEngine roster is stale (`qwen2.5-coder:7b/:14b`), the route hook defaults to the absent `qwen2.5-coder:7b`, the offload-enforce hook is already correct (`gpt-oss:20b`), and `ollama-route-config.json` does not exist. Plan synthesized below.

---

# UPGRADE PLAN — "upgrade systems for new PC + upgrade RTK via LLM/hardware leap" (slot/bravo)

## Honest framing first (R12)
**"Upgrade RTK" reduces to: you cannot touch RTK.** It is a third-party Rust binary (`C:/Users/wompu/bin/rtk.exe`), no source in this repo, and upstream has **no LLM mode and none is on the roadmap** (heuristic-only through dev-0.43.0-rc, changelog-verified). The genuine win is twofold and entirely PRISM-side: **(A) the Ollama offload substrate is stale-on-arrival for this hardware** — the canonical router lists 4 absent/retired models and the live route hook defaults to an absent model, so the 96GB Blackwell box offloads ~0% today; **(B) the real "LLM-backed RTK upgrade" is a companion compressor that runs on RTK's residue**, not a change to RTK. Fix A first (it's why offloads are zero), then B.

## ALREADY DONE — do NOT rebuild
- **`ollama-offload-enforce.mjs` is already hardware-correct** — defaults to `gpt-oss:20b` (verified L108). No edit; the 30% target was mis-pinned here (its candidate volume is tiny: 4 broad Greps in 9972 fires).
- **The model router is NOT to be forked** — `OllamaTaskOffloaderEngine.ts` + `ollama-cost-router.mjs` + `ollama-task-offloader.mjs` already form one wired router locus (this is the exact pair whose duplication caused the U8 deletion). Every roster fix edits these in place.
- **Heuristic output compression already exists** — `dsl-output-compressor.mjs` (regex). The LLM compressor EXTENDS the offload path; it does not stand up a 2nd compressor.
- **RTK savings substrate already works** — ~467K tokens saved. RTK-side wins
... [+7063 chars truncated]
