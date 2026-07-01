---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e4f7b91-a514-49d3-8b1f-e20eb12ba4c7"
title: "Adversarial OOM-safety review of an UNCOMMITTED change in H:/prism. Run `git -C "
date: "2026-06-25"
first_ts: "2026-06-25T02:14:12.893Z"
last_ts: "2026-06-25T02:14:41.932Z"
cwd: "H:\\prism"
messages: 11
user_msgs: 4
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/5e4f7b91-a514-49d3-8b1f-e20eb12ba4c7/subagents/agent-a52bcd84e24ce8b4b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Adversarial OOM-safety review of an UNCOMMITTED change in H:/prism. Run `git -C 

> **claude-code-cli** | 2026-06-25 | 11 msgs (4 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5e4f7b91-a514-49d3-8b1f-e20eb12ba4c7/subagents/agent-a52bcd84e24ce8b4b.jsonl`

## Transcript

### User | 2026-06-25T02:14:12.893Z

Adversarial OOM-safety review of an UNCOMMITTED change in H:/prism. Run `git -C H:/prism diff -- mcp-server/src/engines/OllamaCapabilityProbeEngine.ts mcp-server/src/__tests__/OllamaCapabilityProbeEngine.test.ts` to see it.

CONTEXT: `#computeRunnable` in OllamaCapabilityProbeEngine.ts decided a model is "runnable" iff `nominal vramGB*MIB_PER_GB <= gpu.freeMiB`. This dropped an ALREADY-RESIDENT (/api/ps loaded) model whose nominal > free, collapsing the octopus 2-voice panel to 1. The fix adds `residentIds.has(m.id) || needMiB <= gpu.freeMiB`.

YOUR JOB — prove or DISPROVE OOM-safety on the SHARED 96GB Blackwell GPU (~6 other live chats):
1. Is `gpu.freeMiB` ALWAYS already `total - loaded - reserve` (so a resident model's VRAM is already subtracted)? Read `#correctFreeVram` + the win32 vs non-win32 paths. If on SOME path freeMiB does NOT subtract loaded VRAM, crediting residency could double-spend -> construct that scenario.
2. Can the fix EVER cause the runnable set to imply loading models whose COMBINED new VRAM exceeds free? (Resident models cost 0; non-residents still gated by nominal<=free. But if TWO non-resident models each individually fit free but not together, was that already a pre-existing issue or does the fix worsen it?)
3. Does `residentIds` (built from `loadedModels.map(l=>l.id)`, /api/ps names) reliably match catalog `m.id`? Any id-form mismatch (`:latest`, digest suffix) that would mis-credit or fail-to-credit?
Grade PASS or FAIL with file:line. State the exact VRAM accounting invariant and whether it holds. Do NOT edit.

### Assistant | 2026-06-25T02:14:15.810Z

I'll review this OOM-safety change. Let me start by reading the diff and the engine code.

### Assistant | 2026-06-25T02:14:16.723Z

[tool_use: Bash]

### User | 2026-06-25T02:14:21.102Z

[tool_result] diff --git a/mcp-server/src/__tests__/OllamaCapabilityProbeEngine.test.ts b/mcp-server/src/__tests__/OllamaCapabilityProbeEngine.test.ts
index 8e552a51eb..427e3a2fe2 100644
--- a/mcp-server/src/__tests__/OllamaCapabilityProbeEngine.test.ts
+++ b/mcp-server/src/__tests__/OllamaCapabilityProbeEngine.test.ts
@@ -107,6 +107,39 @@ describe("OllamaCapabilityProbeEngine", () => {
     expect(snap.warning
... [+4353 chars truncated]

### Assistant | 2026-06-25T02:14:24.910Z

Now let me read the full engine file to understand the VRAM accounting, especially `#correctFreeVram` and the win32 vs non-win32 paths.

### Assistant | 2026-06-25T02:14:25.138Z

[tool_use: Read]

### User | 2026-06-25T02:14:26.238Z

[tool_result] 1	/**
2	 * OllamaCapabilityProbeEngine — BLACKWELL-AI-MS0 / U-CAP-PROBE (keystone)
3	 *
4	 * The single RUNTIME AUTHORITY for "what can this host actually run right now."
5	 *
6	 * `ModelRoutingEngine` is a deliberately PURE scorer — its header states it does
7	 * NO network I/O and requires the caller to supply a `RoutingContext`
8	 * (`hardware` + `backendUp`). Nothing detected those from the li
... [+25372 chars truncated]

### Assistant | 2026-06-25T02:14:30.399Z

Now I have the full engine. Let me verify the key invariant claims. First, let me confirm the `m.id` form used in the catalog and how `loadedModels.map(l => l.id)` and `/api/ps` names relate. Let me read the catalog definition and the test fixtures.

### Assistant | 2026-06-25T02:14:31.409Z

[tool_use: Bash]

### User | 2026-06-25T02:14:41.286Z

[tool_result] 51:  id: string;
52:  backend: Backend;
56:  vramGB: number;
109:  backend: Backend | null;
115:  fallbacks: Array<{ backend: Backend; model: string; expectedCostUSD: number }>;
137:    id: "qwen2.5-coder:32b",
138:    backend: "ollama",
140:    vramGB: 20, // Q4_K_M ~19.9GB resident
158:    id: "qwen3-vl:8b",
159:    backend: "ollama",
161:    vramGB: 6,
178:  // + real vramGB happens via U-BW-CA
... [+1986 chars truncated]

### Assistant | 2026-06-25T02:14:41.932Z

You've hit your session limit · resets 10:30pm (America/Chicago)
