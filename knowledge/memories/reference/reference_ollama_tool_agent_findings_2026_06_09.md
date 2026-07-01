---
name: reference_ollama_tool_agent_findings_2026_06_09
description: "Hard-won findings building the local gpt-oss tool-calling read/search agent (U5b) + auto-offload enforcement hook (U5c): which models do Ollama native tool-calling, the git-grep BRE gotcha, and the broad-query convergence limit"
type: reference
galaxy: hermes-zulu
source: prism-memory
synced: 2026-06-27T20:30:46.683Z
aliases: reference_ollama_tool_agent_findings_2026_06_09
---


# Local Ollama tool-calling agent + offload enforcement — findings (2026-06-09, slot:bravo)

Built `scripts/ollama-tool-agent.mjs` (U5b, commit 3499f5f20f) + `.claude/hooks/ollama-offload-enforce.mjs` (U5c, d807d46f44) on slot/bravo. Live-validated findings:

## 1. Which models do Ollama NATIVE tool-calling (`/api/chat` `tools`) — VERIFIED LIVE
- **gpt-oss:120b** ✅ structured `tool_calls` (36s cold). **gpt-oss:20b** ✅ (29s).
- **qwen2.5-coder:32b** ❌ — it TEXT-EMITS the call as a JSON string in `message.content`, NO structured `tool_calls`. So a tool-loop driver MUST be the **gpt-oss family**, not the coder model (building the loop on qwen-coder silently breaks). Probe: POST `/api/chat` with a `tools` array + a prompt that forces a call; check `j.message.tool_calls`.

## 2. git grep needs `-E` (the "Unmatched ( or \(" gotcha)
LLM-emitted search patterns contain regex metachars (`(`, `|`, `+`). `git grep` defaults to BASIC regex (BRE) and throws `fatal: Unmatched ( or \(`. Use `git grep -E` (extended). (Chose `git grep`/`git ls-files` over `rg` because `rg` is NOT on the `execFileSync` PATH in the node hook env, and git is guaranteed present + searches tracked files = skips node_modules.)

## 3. Broad-query convergence limit (the honest ceiling)
gpt-oss:20b in an 8-iter tool-loop **converges fast on TARGETED symbols** (rare token → 5 iters → confident, correct, 0 Claude tokens) but **LOOPS on broad/common tokens** (e.g. "runAgent" everywhere → 8 iters, never concludes, even when the final iteration omits tools to force an answer → returns empty). Root: 20b can't synthesize over many hits. Mitigation built: force terminal answer on last iter + ignore phantom tool_calls when none offered + a "stop once found, don't enumerate" prompt steer — none make 20b answer a broad query it can't. **The agent's value is TARGETED lookups; broad queries correctly fall back to Claude (confident:false).** For harder convergence set `PRISM_OLLAMA_OFFLOAD_MODEL=gpt-oss:120b` (stronger, slower).

## 4. Enforcement design (safe-by-construction)
The offload-enforce hook is **default-advise (0 latency), opt-in-enforce** (`PRISM_OLLAMA_OFFLOAD_ENFORCE=1`). A ~30s local agent call per search would wreck interactivity if always-on, so enforcement is deliberate. Confidence-gate → raw-tool fallback means a low-conf/looping local answer NEVER silently replaces the real tool. Scoped to Grep|Glob (search); Read offload stays with `ollama-route-pretooluse` (no double-handling); coding-task offload is U6 (unbuilt). **Never auto-substitute a Read of an edit-target file** (need exact bytes) — the gate excludes sensitive/exact paths.

## 5. The go-live gap (process)
All of U5b/U5c is on **slot/bravo (isolated, 2783 behind main)** — it is NOT live in the session until **merged to main + the hook wired in settings.json**. The live session runs from the main tree; a hook in settings.json calling `scripts/ollama-tool-agent.mjs` fails until that file is in main. Plan: `state/shared/specs/OLLAMA-AUTORUN-BUILDLOOP-PLAN-2026-06-09.md`. Hardware/VRAM constraints: [[reference_ollama_blackwell_vram_constraints_2026_06_09]]. Infra: [[reference_infra_nim_drop_ollama_2026_06_09]].
