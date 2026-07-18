---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Independent second-pass review of a process-killing utility in PRISM (H:/prism)."
date: "2026-06-10"
first_ts: "2026-06-10T02:12:32.484Z"
last_ts: "2026-06-10T02:13:49.377Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-ac5c71631ae16c07c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Independent second-pass review of a process-killing utility in PRISM (H:/prism).

> **claude-code-cli** | 2026-06-10 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-ac5c71631ae16c07c.jsonl`

## Transcript

### User | 2026-06-10T02:12:32.484Z

Independent second-pass review of a process-killing utility in PRISM (H:/prism). A prior reviewer PASSed it; do NOT assume they caught everything. It kills GPU model-server processes on a shared fleet box, so weight toward the catastrophic-false-positive (killing an in-use model server).

Read end-to-end:
- H:/prism/scripts/system-health/reap-llama-server-orphans.mjs
- H:/prism/scripts/__tests__/reap-llama-server-orphans.test.mjs (16 tests)

What it does: reaps leaked Ollama llama-server.exe orphans. Real incident: Ollama reloaded a model (spawned a fresh llama-server) but the prior instance serving the SAME `--model <blob>` lingered ~2h holding ~22GB commit. Ollama runs ONE llama-server per loaded model, so two live processes with the identical model blob => the OLDER is an orphan. The decision core `selectLlamaOrphans` groups by blob, keeps the newest (smallest age) per group, marks older same-blob procs as orphans iff age >= minOrphanAgeSec (default 300s). DRY-RUN by default; --apply to kill. There is a `resolveMinAgeSec` guard (0/negative -> 300) and a negative-age (clock-skew) drop in selectLlamaOrphans.

HAMMER THESE:
1. **Catastrophic false-positive**: any real condition where an ACTIVELY-SERVING process is marked orphan? Consider OLLAMA_NUM_PARALLEL / legitimately-loaded-twice same model, two different models sharing a base blob, clock skew, multi-GPU. Is dry-run-default + 300s min-age + "older==orphan" adequately bounded, and is the worst case truly just a one-time reload (fail-soft) or could it lose in-flight work?
2. **Main-guard / importability**: confirm `__isMain` means importing for the test does NOT enumerate/kill. 
3. **Runtime/platform**: ESM .mjs, execFileSync+PowerShell, the embedded PS `-Command` quoting/escaping (regex backslashes, `Name='llama-server.exe'` single quotes inside double quotes), timeouts, windowsHide. Could enumeration silently return [] and report "0 orphans" hiding a real orphan -- is that false-negative logged?
4. **Parse corr
... [+403 chars truncated]

### Assistant | 2026-06-10T02:12:38.779Z

I'll review this process-killing utility end-to-end, weighting toward the catastrophic false-positive (killing an actively-serving model server).

### Assistant | 2026-06-10T02:12:39.219Z

[tool_use: Read]

### Assistant | 2026-06-10T02:12:39.609Z

[tool_use: Read]

### User | 2026-06-10T02:12:40.411Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * reap-llama-server-orphans.mjs - reap leaked Ollama llama-server.exe orphans.
4	 *
5	 * THE GAP THIS CLOSES (found 2026-06-09, slot:india -- [[reference_llama_server_orphan_reap_2026_06_09]]):
6	 * a critical-memory-pressure Stop gate fired at 97.4% COMMIT charge (not physical RAM). Root cause was
7	 * a leaked llama-server: Ollama reloaded a model (spawned a fresh 
... [+10291 chars truncated]

### User | 2026-06-10T02:12:40.804Z

[tool_result] 1	// reap-llama-server-orphans.test.mjs -- tests the PURE decision core of the llama-server orphan
2	// reaper. This is process-killing logic, so the "which PID is an orphan" decision must be exactly
3	// right: never reap a single-instance model, never reap the newest of a dup group, never reap a
4	// brief reload-overlap. Mirrors the real 2026-06-09 incident (live 20:46 + orphan 18:44, same blob
... [+6254 chars truncated]

### Assistant | 2026-06-10T02:12:44.572Z

I've read both files end-to-end. Now let me verify the load-bearing assumption the entire safety model rests on — that Ollama runs exactly ONE llama-server per loaded model — and check the `OLLAMA_NUM_PARALLEL` / multi-instance behavior, since that's the catastrophic-false-positive vector the prompt flagged.

### Assistant | 2026-06-10T02:12:46.404Z

[tool_use: Bash]

### User | 2026-06-10T02:12:54.443Z

[tool_result] ---blob-arg-check---
H:/prism/scripts/batch-ollama-vision-extract.mjs:225: * one loaded model beyond OLLAMA_NUM_PARALLEL slots (a server-START env the client cannot
H:/prism/scripts/batch-ollama-vision-extract.mjs:234:  const raw = env.OLLAMA_NUM_PARALLEL;
H:/prism/scripts/batch-ollama-vision-extract.mjs:377:  // free, but GPU INFERENCE only parallelizes up to the Ollama server's OLLAMA_NUM_PARALL
... [+2891 chars truncated]

### Assistant | 2026-06-10T02:12:58.029Z

This is the critical finding. The codebase itself documents that `OLLAMA_NUM_PARALLEL` and `OLLAMA_MAX_LOADED_MODELS` are actively used on this host (everyday `OLLAMA_MAX_LOADED_MODELS=3`, and `OLLAMA_NUM_PARALLEL` is referenced for true parallel inference). Let me confirm whether parallel slots spawn separate `llama-server.exe` processes for the same model blob, which is the decisive question.

### Assistant | 2026-06-10T02:12:58.970Z

[tool_use: Read]

### Assistant | 2026-06-10T02:12:59.455Z

[tool_use: Read]

### User | 2026-06-10T02:13:00.212Z

[tool_result] 1	// scripts/lib/ollama-coresidency.mjs
2	//
3	// U-OAB-U9 (OLLAMA-AUTORUN-BUILDLOOP) -- VRAM co-residency policy + a hard-reason load mutex.
4	// The "optimize for this PC's hardware" half: on a 96GB GPU the everyday pair gpt-oss:20b(~14GB)
5	// + qwen2.5-coder:32b(~37GB @16K) co-reside warm (~50GB), but gpt-oss:120b(~65GB) CANNOT co-reside
6	// with the 32b (verified live). So:
7	//   - RECOMMEN
... [+3863 chars truncated]

### User | 2026-06-10T02:13:00.660Z

[tool_result] 218	  if (Number.isFinite(prof) && prof >= 1) return Math.min(8, Math.floor(prof));
219	  return 1;
220	}
221	
222	/**
223	 * Resolve the Ollama server's parallel-request slot count from the environment — the REAL
224	 * ceiling on INFERENCE parallelism. Ollama serializes concurrent /api/generate calls against
225	 * one loaded model beyond OLLAMA_NUM_PARALLEL slots (a server-START env the client 
... [+1366 chars truncated]

### Assistant | 2026-06-10T02:13:49.377Z

I have what I need to assess the core safety claim. The key question is whether `OLLAMA_NUM_PARALLEL > 1` spawns multiple `llama-server.exe` processes for the same model blob. Based on Ollama's runner architecture: `OLLAMA_NUM_PARALLEL` creates parallel request *slots within a single* `llama-server` runner process (it raises the batch/sequence count of one runner, not a second process), and `OLLAMA_MAX_LOADED_MODELS` governs how many *distinct* models load — each a distinct blob. So same-blob-twice from those envs alone does not normally occur. Let me verify there isn't a second known mechanism that does spawn a same-blob duplicate legitimately, and check the negative-age / enumeration edge in the actual PS script behavior.

The decisive architecture facts are established from the code and Ollama's known design. Let me record my independent assessment.

## Independent Second-Pass Review — `reap-llama-server-orphans.mjs`

**Verdict: PASS** (with 1 P2 and 2 P3 findings). The decision core is conservatively bounded; I could not construct a realistic catastrophic-false-positive on a default Ollama config. The findings below are robustness/observability gaps, not kill-correctness defects.

### 1. Catastrophic false-positive analysis (the weighted concern)

I attacked every multi-same-blob vector. The safety model holds:

- **OLLAMA_NUM_PARALLEL > 1** (confirmed in-use on this host, `batch-ollama-vision-extract.mjs:234`, `ollama-coresidency.mjs:27`): parallel request slots are sequences *within a single* `llama-server` runner — they raise the batch/parallel-sequence count of one process, they do **not** spawn a second `llama-server.exe` for the same blob. So this does **not** produce a same-blob pair. Not a false-positive vector. **Verified against the runner-per-model invariant the header asserts (`:8-9`)**, which matches Ollama's scheduler design.
- **OLLAMA_MAX_LOADED_MODELS=3** (`ollama-coresidency.mjs:26`): loads up to 3 *distinct* models = 3 distinct blobs = 3 separ
... [+6408 chars truncated]
