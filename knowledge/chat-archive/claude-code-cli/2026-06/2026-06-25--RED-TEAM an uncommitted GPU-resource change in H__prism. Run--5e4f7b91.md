---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e4f7b91-a514-49d3-8b1f-e20eb12ba4c7"
title: "RED-TEAM an uncommitted GPU-resource change in H:/prism. Run `git -C H:/prism di"
date: "2026-06-25"
first_ts: "2026-06-25T02:14:29.947Z"
last_ts: "2026-06-25T02:14:42.290Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/5e4f7b91-a514-49d3-8b1f-e20eb12ba4c7/subagents/agent-af20cc8c0be06bd66.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# RED-TEAM an uncommitted GPU-resource change in H:/prism. Run `git -C H:/prism di

> **claude-code-cli** | 2026-06-25 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5e4f7b91-a514-49d3-8b1f-e20eb12ba4c7/subagents/agent-af20cc8c0be06bd66.jsonl`

## Transcript

### User | 2026-06-25T02:14:29.947Z

RED-TEAM an uncommitted GPU-resource change in H:/prism. Run `git -C H:/prism diff -- mcp-server/src/engines/OllamaCapabilityProbeEngine.ts`. Your sole goal: try to CONSTRUCT a concrete scenario where this change causes a GPU OOM or a wrong "runnable" verdict on the shared 96GB Blackwell box.

The change: in `#computeRunnable`, a model is now runnable if `residentIds.has(m.id) || needMiB <= gpu.freeMiB` (was just `needMiB <= gpu.freeMiB`). `residentIds` = ids from `/api/ps` loaded models.

Attack angles to actually try (read the code to confirm/refute each):
- A model reported resident by /api/ps but with a TINY size_vram (partially offloaded to CPU/RAM) — does crediting it as "fully runnable in VRAM" over-promise? Where does the consensus engine actually LOAD it, and could ollama re-load it fully and OOM?
- Stale /api/ps vs current free (the probe reads both — are they from the same instant?).
- A model resident under one tag but the panel requests a different tag form.
- Does anything DOWNSTREAM treat `runnableModelIds` as "safe to load N of these concurrently" in a way the 0-marginal credit breaks?
If you find a real OOM/incorrectness path, describe it concretely with file:line and grade FAIL. If after genuine effort you cannot construct one, grade PASS and say why the residency credit is safe. Do NOT edit.

### Assistant | 2026-06-25T02:14:32.466Z

I'll red-team this GPU-resource change. Let me start by reading the diff and the full engine.

### Assistant | 2026-06-25T02:14:33.114Z

[tool_use: Bash]

### User | 2026-06-25T02:14:41.892Z

[tool_result] diff --git a/mcp-server/src/engines/OllamaCapabilityProbeEngine.ts b/mcp-server/src/engines/OllamaCapabilityProbeEngine.ts
index 77a3783878..ca215fabe6 100644
--- a/mcp-server/src/engines/OllamaCapabilityProbeEngine.ts
+++ b/mcp-server/src/engines/OllamaCapabilityProbeEngine.ts
@@ -233,10 +233,14 @@ export class OllamaCapabilityProbeEngine {
     }
 
     const hardware = this.#detectHardware(gpuC
... [+1625 chars truncated]

### Assistant | 2026-06-25T02:14:42.290Z

You've hit your session limit · resets 10:30pm (America/Chicago)
