---
type: "chat-session"
source: "claude-code-cli"
session_id: "86373eb3-4ddb-4fe0-820b-a16ac7694943"
title: "In H:/prism, trace EXACTLY how a reference-pool seed file becomes reference ghos"
date: "2026-06-09"
first_ts: "2026-06-09T16:18:28.936Z"
last_ts: "2026-06-09T16:18:35.391Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--/86373eb3-4ddb-4fe0-820b-a16ac7694943/subagents/agent-afa76018f9ffbadb2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:48"
---

# In H:/prism, trace EXACTLY how a reference-pool seed file becomes reference ghos

> **claude-code-cli** | 2026-06-09 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--/86373eb3-4ddb-4fe0-820b-a16ac7694943/subagents/agent-afa76018f9ffbadb2.jsonl`

## Transcript

### User | 2026-06-09T16:18:28.936Z

In H:/prism, trace EXACTLY how a reference-pool seed file becomes reference ghosts that nn-graph-eval.mjs buildHoldout() can read. I'm building a new feeder (scripts/vault-to-gnn-refpool.mjs) that turns vault confirmed-wiring memories into high-confidence ghost.unwired-engine reference nodes, and I must emit them in the form that actually reaches the GNN eval — not an orphan file.

Read these and report the precise data flow with file:line:
1. scripts/nn-graph-retrain-lifecycle.mjs — does it ingest state/shared/nn-graph/reference-pool-seed-*.json? How? Does it merge the seed into the graph before calling buildHoldout, or pass it some other way? What CLI flag / env (e.g. --embedding-source, --seed-file)?
2. scripts/lib/nn-graph-eval.mjs buildHoldout() — it reads graph.nodes filtering kind==="ghost.unwired-engine" + isValidDispatcher(proposed_wiring) + confidence>=refMinConf (0.8). So the seed ghosts must be IN graph.nodes. WHERE does buildHoldout get its `graph` arg — from the 542MB system-graph.json, or from a smaller assembled graph the lifecycle builds?
3. The existing reference-pool-seed-2026-05-23.json — what is its EXACT top-level shape and per-entry shape (the array of seed entries)? Does anything actually consume it today, or is it dormant/orphan? grep for its filename across scripts/ and .claude/.
4. seed-ghost-from-unwired.mjs --apply writes ghost nodes directly into system-graph.json (atomicWrite). Is that the ONLY way ghosts enter the graph, or can a seed JSON be merged via merge-augmentations.mjs (does merge-augmentations read any ghost/refpool augmentation file)?

Bottom line I need: to make vault-derived reference ghosts reach buildHoldout, do I (a) write them into system-graph.json like seed-ghost-from-unwired --apply does, (b) emit an augmentation JSON that merge-augmentations folds in, or (c) emit a seed file that nn-graph-retrain-lifecycle ingests directly? Give the definitive answer with the file:line proof. Plain text.

### Assistant | 2026-06-09T16:18:35.391Z

Prompt is too long · the request is ~202908 tokens (limit 200000) but this conversation is only ~4837 tokens — the rest is system prompt, tool definitions, and attachment content. A single-exchange conversation cannot be compacted; reduce attached files/tools or start with less context.
