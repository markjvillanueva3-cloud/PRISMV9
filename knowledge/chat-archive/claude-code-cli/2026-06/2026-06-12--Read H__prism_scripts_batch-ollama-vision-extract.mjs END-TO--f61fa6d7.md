---
type: "chat-session"
source: "claude-code-cli"
session_id: "f61fa6d7-ca17-4439-b131-ead206c9010a"
title: "Read H:/prism/scripts/batch-ollama-vision-extract.mjs END-TO-END (the full file)"
date: "2026-06-12"
first_ts: "2026-06-12T16:13:53.327Z"
last_ts: "2026-06-12T16:14:49.339Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/f61fa6d7-ca17-4439-b131-ead206c9010a/subagents/workflows/wf_eaeb1510-cf4/agent-a4d7f07bda5f11cef.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# Read H:/prism/scripts/batch-ollama-vision-extract.mjs END-TO-END (the full file)

> **claude-code-cli** | 2026-06-12 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f61fa6d7-ca17-4439-b131-ead206c9010a/subagents/workflows/wf_eaeb1510-cf4/agent-a4d7f07bda5f11cef.jsonl`

## Transcript

### User | 2026-06-12T16:13:53.327Z

Read H:/prism/scripts/batch-ollama-vision-extract.mjs END-TO-END (the full file). You are verifying whether it can run UNATTENDED NIGHTLY as a job in PRISM's ollama-night-batch lane (spawned as: node scripts/batch-ollama-vision-extract.mjs <flags>, cwd H:/prism, no shell, no stdin, killed at a timeout).

Report in PLAIN TEXT exactly these sections:
CLI: the exact no-interaction invocation you VERIFIED from the argv parsing (flags that make it run a bounded batch; say "default no-arg run" if that works). If it REQUIRES args you cannot derive from the file, say so.
STDIN: does any code path read stdin or prompt? (yes/no + line)
WRITES: every file/dir it writes, and classify each as OWN-ARTIFACT (its own output/staging file), APPEND-ONLY log, or LIVE-INDEX-MUTATION (rewrites a shared index/corpus like tribal-embed-index, wiki index, embeddings store). PRISM doctrine HARD-REJECTS unattended LIVE-INDEX-MUTATION (the 2026-06-10 tribal clobber).
RUNTIME: is the run bounded (caps, limits, batch sizes)? Resumable/idempotent on kill? Does it spawn detached children (rejected) ?
OLLAMA: which models/endpoints it calls; behavior when Ollama is down (fail-loud/fail-soft/hang).
VERDICT: one of NIGHT-SAFE (give the exact suggested cmd array + timeoutMs), NIGHT-SAFE-WITH-FLAG (name the flag, e.g. a --limit or --no-X needed for safety), or UNSAFE (one-line reason).
Be adversarial: a wrong NIGHT-SAFE verdict can destroy a knowledge index at 3am.

### Assistant | 2026-06-12T16:13:57.229Z

I'll read the file end-to-end before making any determination.

### Assistant | 2026-06-12T16:13:57.412Z

[tool_use: Read]

### User | 2026-06-12T16:14:11.597Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/batch-ollama-vision-extract.mjs
3	//
4	// U-PSGB-XRAY-BATCH (#6) — resumable overnight batch vision-OCR runner.
5	//
6	// Orchestrates run-ollama-vision-extract.mjs over a worklist of blueprint PDFs,
7	// designed to run UNATTENDED overnight when the chat fleet is down and the GPU
8	// is uncontended (the live-pilot blocker this session was fleet GPU+CPU
9	// sat
... [+23588 chars truncated]

### Assistant | 2026-06-12T16:14:49.339Z

CLI: node scripts/batch-ollama-vision-extract.mjs --worklist <paths.txt> [options]
The script REQUIRES --worklist <file> (line 345: exits 3 if missing, exits 2 if file not found or empty). There is NO default no-arg run. You must supply a worklist file. All other flags are optional.

Recommended bounded nightly invocation (verified from parseArgs lines 319-341):
  node scripts/batch-ollama-vision-extract.mjs --worklist <absolute-path-to-worklist.txt> --time-budget-min 360 --limit 500 --max-pages 8 --part-class unknown --assume-units in --preprocess --checkpoint state/shared/blueprint-ocr-checkpoint.jsonl

STDIN: No. Line 183 spawns children with stdio: ["ignore", "pipe", "pipe"] — stdin explicitly ignored for children. No readline, no prompt, no process.stdin reference anywhere in the file.

WRITES:
1. state/shared/blueprint-ocr-checkpoint.jsonl (default, overridable via --checkpoint) — APPEND-ONLY log. Line 309: appendImpl(args.checkpoint, ...) appends one JSON record per completed print. mkdirSync ensures the parent dir exists (line 351). Never truncates or rewrites this file.
2. --summary <file> (optional, only if flag is passed) — OWN-ARTIFACT. Line 395: writeFileSync overwrites the summary JSON with the run stats. Safe: it is a single-run output file, not a shared corpus index.
3. No writes to tribal-embed-index, wiki index, embeddings store, or any shared living index. The script calls the single-print runner (run-ollama-vision-extract.mjs) as a subprocess — whether that child mutates a shared index depends on that child's behavior, which is NOT visible in this file.

CRITICAL CAVEAT on WRITES: The spawned subprocess is scripts/run-ollama-vision-extract.mjs (line 46, SINGLE_RUNNER). This batch script has no visibility into what that child writes. If run-ollama-vision-extract.mjs performs LIVE-INDEX-MUTATION (e.g. appending to tribal-embed-index.json, wiki index, or embeddings), that mutation happens unattended at scale across every print in the worklist. You m
... [+3563 chars truncated]
