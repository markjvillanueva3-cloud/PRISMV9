---
type: "chat-session"
source: "claude-code-cli"
session_id: "16769ed0-dcdd-41c8-9cc5-58b633f8a1d5"
title: "Review commit `1c6abe2878` on branch `cad-fusion-live-ms0` (PRISM repo at H:/pri"
date: "2026-06-20"
first_ts: "2026-06-20T04:07:27.744Z"
last_ts: "2026-06-20T04:08:30.516Z"
cwd: "H:\\prism"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/16769ed0-dcdd-41c8-9cc5-58b633f8a1d5/subagents/agent-afc200a0131592a30.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Review commit `1c6abe2878` on branch `cad-fusion-live-ms0` (PRISM repo at H:/pri

> **claude-code-cli** | 2026-06-20 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/16769ed0-dcdd-41c8-9cc5-58b633f8a1d5/subagents/agent-afc200a0131592a30.jsonl`

## Transcript

### User | 2026-06-20T04:07:27.744Z

Review commit `1c6abe2878` on branch `cad-fusion-live-ms0` (PRISM repo at H:/prism). It is the ONLY thing in scope. Run `git -C H:/prism show 1c6abe2878 --stat` then `git -C H:/prism show 1c6abe2878` to see the full diff.

The change: added an `opts.strict` parameter to `pickLoadedChatModel` in `scripts/lib/ollama-loaded-chat-model.mjs`, plus 5 new tests in `scripts/lib/ollama-loaded-chat-model.test.mjs`.

Intent to verify:
1. The 2-arg call form is BYTE-IDENTICAL in behavior (default strict=false must preserve the prior any-loaded-chat-model fallback). The prompt-rewriter (`.claude/hooks/prompt-rewriter-ollama.mjs`) calls it 2-arg — confirm it is unaffected.
2. strict:true must DROP the "first loaded chat-capable" fallback (return null when no preference member is loaded) but KEEP the preference-loop and the exclusion-first vision/embed gate.
3. The new tests genuinely encode that intent (real reference values, not stubs) — especially that strict refuses a non-preferred chat model and a vision model is never returned under either mode.

Read both files end-to-end. Grade PASS or FAIL. Report any P0/P1 with file:line. Be concise — this is a small, additive, tested change. Do NOT review scripts/ask-ollama.* (out of scope, uncommitted peer work).

### Assistant | 2026-06-20T04:07:31.104Z

I'll review commit `1c6abe2878`. Let me start by examining the diff and reading both files end to end.

### Assistant | 2026-06-20T04:07:32.073Z

[tool_use: Bash]

### Assistant | 2026-06-20T04:07:32.283Z

[tool_use: Bash]

### User | 2026-06-20T04:07:36.848Z

[tool_result] commit 1c6abe2878e3300446288e18a8f47726014bdfec
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 19 23:03:07 2026 -0500

    [MAIN-FORCE] [TOKEN-EFFICIENCY-INJECT]/U-LOADED-CHAT-STRICT-OPTION (slot:alpha): strict-preference gate on pickLoadedChatModel for quality-sensitive loaded-first offload selection
    
    Adds an opts.strict flag (default false = byte-identical fo
... [+928 chars truncated]

### User | 2026-06-20T04:07:36.921Z

[tool_result] commit 1c6abe2878e3300446288e18a8f47726014bdfec
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 19 23:03:07 2026 -0500

    [MAIN-FORCE] [TOKEN-EFFICIENCY-INJECT]/U-LOADED-CHAT-STRICT-OPTION (slot:alpha): strict-preference gate on pickLoadedChatModel for quality-sensitive loaded-first offload selection
    
    Adds an opts.strict flag (default false = byte-identical fo
... [+5799 chars truncated]

### Assistant | 2026-06-20T04:07:39.277Z

Now let me read both files end to end to verify the surrounding contract.

### Assistant | 2026-06-20T04:07:39.813Z

[tool_use: Read]

### Assistant | 2026-06-20T04:07:39.884Z

[tool_use: Read]

### User | 2026-06-20T04:07:40.905Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ollama-loaded-chat-model.mjs' was already read 2s ago in this session and is unchanged (mtime 1781927529582). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-20T04:07:41.465Z

[tool_result] 1	/**
2	 * ollama-loaded-chat-model.test.mjs -- reference-value oracle for the loaded-chat-model picker
3	 * (slot:alpha 2026-06-19). Reference values are the REAL 17-model install set on the live
4	 * Blackwell host (`/api/tags` 2026-06-19), so a wrong family/vision regex is caught against
5	 * actual names, not invented ones.
6	 *
7	 * node:test.  Run: node H:/prism/scripts/lib/ollama-loaded-cha
... [+6157 chars truncated]

### Assistant | 2026-06-20T04:07:45.002Z

The `.mjs` file was already loaded into my context from the `git show` (full file body is short and the diff shows the complete function). Let me read the full `.mjs` to confirm the parts outside the diff hunk, since I need to see the whole file end to end including `isChatCapable` and any other exports.

### Assistant | 2026-06-20T04:07:46.422Z

[tool_use: Read]

### Assistant | 2026-06-20T04:07:46.893Z

[tool_use: Read]

### User | 2026-06-20T04:07:48.324Z

[tool_result] 1	// tier: T4
2	// ollama-loaded-chat-model.mjs (slot:alpha 2026-06-19, TOKEN-EFFICIENCY-INJECT)
3	//
4	// Pick the best ALREADY-LOADED chat-capable Ollama model from an /api/ps model list, for
5	// hooks/scripts that must stay inside a tight wall-clock budget and therefore must NOT trigger
6	// a cold-load. This is DISTINCT from resolveSynthesisModel (host-aware-synthesis-model.mjs),
7	// which p
... [+2637 chars truncated]

### User | 2026-06-20T04:07:48.694Z

[tool_result] 78	  for (const n of loaded) {
79	    if (isChatCapable(n)) return n;
80	  }
81	  return null;
82	}
83	

### Assistant | 2026-06-20T04:07:50.912Z

I now have the complete `.mjs` file (lines 1-83) and the complete test file (lines 1-115). Let me verify the consumer claim — that the prompt-rewriter calls it 2-arg and is unaffected.

### Assistant | 2026-06-20T04:07:52.201Z

[tool_use: Grep]

### User | 2026-06-20T04:07:57.542Z

[tool_result] knowledge\memories\reference\reference_ollama_chat_model_select_fix_2026_06_19.md:17:[Omitted long matching line]
knowledge\wiki\code-tribal\learnings\token-efficiency-inject-u-rewriter-chatmodel-select.md:23:still excluded) + pickLoadedChatModel(loaded, preference) (preference-first, then first loaded
knowledge\wiki\code-tribal\learnings\token-efficiency-inject-u-rewriter-chatmodel-select.md:51:-
... [+1999 chars truncated]

### Assistant | 2026-06-20T04:08:00.447Z

The grep confirms the consumer contract. Let me read the two prompt-rewriter call sites in context to confirm they are strictly 2-arg (and thus default `strict=false`, fully unaffected).

### Assistant | 2026-06-20T04:08:00.924Z

[tool_use: Read]

### User | 2026-06-20T04:08:02.797Z

[tool_result] 160	  // the 100% rewriter skip rate observed 2026-05-24 + 2026-05-27 + 2026-05-28.
161	  if (LOADED_MODEL_ONLY) {
162	    try {
163	      const ps = await ollamaFetch("/api/ps", { method: "GET" }, signal);
164	      const loaded = (ps?.models || []).map((m) => m?.name || m?.model).filter(Boolean);
165	      // Pick the best LOADED chat-capable model (preference-first, then any loaded chat model).
... [+1417 chars truncated]

### Assistant | 2026-06-20T04:08:30.516Z

I have everything I need. Both call sites in the prompt-rewriter (`prompt-rewriter-ollama.mjs:169` and `:184`) are strictly 2-arg, so they take the default `opts = {}` → `strict = false`. Let me verify the logic and tests against the three intents.

## Verification

**Intent 1 — 2-arg form byte-identical.**
The signature is `pickLoadedChatModel(loadedNames, preference = [], opts = {})` (`ollama-loaded-chat-model.mjs:64`). With a 2-arg call, `opts` defaults to `{}`, so `strict = !!(opts && opts.strict)` → `!!(undefined)` → `false` (`:65`). With `strict=false` the new `if (strict) return null;` guard at `:77` is skipped, so control flows exactly as before into the any-loaded fallback loop (`:78-80`). The two consumer call sites — `prompt-rewriter-ollama.mjs:169` (`pickLoadedChatModel(loaded, MODEL_PREFERENCE)`) and `:184` (`pickLoadedChatModel(installed, MODEL_PREFERENCE)`) — are both 2-arg. Behavior is unchanged. PASS.

**Intent 2 — strict:true drops fallback, keeps preference-loop + exclusion-first gate.**
The preference loop (`:73-75`) runs *before* the `if (strict) return null` guard (`:77`), so the preference-first path is preserved under strict. The guard sits *after* the preference loop and *before* the any-loaded fallback (`:78-80`), so strict drops exactly step 2 and nothing else. The exclusion-first vision/embed gate lives inside `isChatCapable` (`:43-48`, `NON_CHAT_RE` checked before `CHAT_FAMILY_RE`), which is called in *both* the preference loop (`:74`) and the fallback loop (`:79`) — strict does not bypass it, because the only path that returns a name under strict is the preference loop, which itself requires `isChatCapable(want)`. So a vision model can never be returned even if it were placed in the preference list. PASS.

**Intent 3 — tests encode the intent with real values, not stubs.**
- `:90` strict + preference member loaded → returns `"qwen2.5-coder:32b"` (real reference value, the preferred hit survives).
- `:95` strict + only non-preferred chat
... [+2984 chars truncated]
