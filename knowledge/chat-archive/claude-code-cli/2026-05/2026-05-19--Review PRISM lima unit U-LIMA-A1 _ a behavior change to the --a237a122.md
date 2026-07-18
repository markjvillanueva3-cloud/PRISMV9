---
type: "chat-session"
source: "claude-code-cli"
session_id: "a237a122-8a9b-4e80-a633-3b9f74b85866"
title: "Review PRISM lima unit U-LIMA-A1 — a behavior change to the Ollama task offloade"
date: "2026-05-19"
first_ts: "2026-05-19T17:30:37.363Z"
last_ts: "2026-05-19T17:31:49.113Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/a237a122-8a9b-4e80-a633-3b9f74b85866/subagents/agent-a9eef6f82e5af36af.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Review PRISM lima unit U-LIMA-A1 — a behavior change to the Ollama task offloade

> **claude-code-cli** | 2026-05-19 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a237a122-8a9b-4e80-a633-3b9f74b85866/subagents/agent-a9eef6f82e5af36af.jsonl`

## Transcript

### User | 2026-05-19T17:30:37.363Z

Review PRISM lima unit U-LIMA-A1 — a behavior change to the Ollama task offloader. Two files:

MODIFIED: H:/prism/.claude/hooks/ollama-task-offloader.mjs
NEW: H:/prism/.claude/hooks/__tests__/ollama-task-offloader-autoexec.test.mjs

CONTEXT:
- ollama-task-offloader.mjs is a UserPromptSubmit hook (advisory, never blocking). It classifies the prompt, and for offloadable tasks injects `additionalContext` text suggesting Ollama offload.
- The HIGH-ROI-SKILL-ROUTING-AUDIT found offload rate stuck at ~8% vs 30% target — the old suggestion text was too vague ("the prompt-rewriter-ollama hook may already handle this. Or manually: ask Claude to delegate").
- A1's change: for SAFE_AUTOEXEC categories (explanation/summary/git_summary/documentation), `buildOffloadDirective()` now emits an IMPERATIVE directive naming a concrete `node scripts/ask-ollama.mjs <mode> <file>` command + "do NOT re-derive". Other categories keep the soft suggestion.
- R12 design note in the code: the hook does NOT itself call Ollama (a UserPromptSubmit hook has no file context + a sync network call would block every prompt) — "auto-execute" means handing Claude a ready-to-run command.

VERIFY:
1. CORRECTNESS — `buildOffloadDirective` is pure (no I/O)? The SAFE_AUTOEXEC Map maps category→ask-ollama mode correctly? `ask-ollama.mjs` (H:/prism/scripts/ask-ollama.mjs) actually has `explain`/`summarize`/`triage` file-modes — confirm the modes named in the directive are real.
2. R12 HONESTY — is the "auto-execute" framing honest? The roster unit said "auto-execute"; this implementation emits a directive rather than calling Ollama. Is the code's R12 comment block an accurate, non-misleading description of what was actually built? Or is this a scope-dodge dressed up as a safety decision?
3. THE DIRECTIVE TEXT — read the actual `⚡ AUTO-OFFLOAD` directive string. Is it likely to actually change Claude's behavior (lift offload adoption), or is it just a louder version of the same ignorable suggestion? Does the `<f
... [+916 chars truncated]

### Assistant | 2026-05-19T17:30:49.699Z

I'll review both files now.

### Assistant | 2026-05-19T17:30:50.487Z

[tool_use: Read]

### Assistant | 2026-05-19T17:30:51.387Z

[tool_use: Read]

### Assistant | 2026-05-19T17:30:51.392Z

[tool_use: Read]

### User | 2026-05-19T17:31:09.706Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+28104 chars truncated]

### User | 2026-05-19T17:31:13.886Z

[tool_result] 1	// node:test coverage for ollama-task-offloader buildOffloadDirective() —
2	// U-LIMA-A1 (safe-category auto-offload directive).
3	//
4	// vitest is broken on this repo (pre-existing vite-transform bug); node --test
5	// is the working path. Run:
6	//   node --test .claude/hooks/__tests__/ollama-task-offloader-autoexec.test.mjs
7	//
8	// Scope: the SAFE_AUTOEXEC categories (explanation/summary/g
... [+5205 chars truncated]

### User | 2026-05-19T17:31:16.166Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+5379 chars truncated]

### Assistant | 2026-05-19T17:31:49.113Z

Confirmed `FILE_MODES = {"summarize", "explain", "triage"}` in ask-ollama.mjs line 78. The SAFE_AUTOEXEC Map names only `explain` and `summarize` — both real file-modes. PASS on item 1's mode-reality check.

## REVIEW VERDICT: PASS

**1. CORRECTNESS — PASS.** `buildOffloadDirective` (lines 361-382) is pure: no I/O, deterministic. SAFE_AUTOEXEC maps explanation/documentation→`explain`, summary/git_summary→`summarize` — both confirmed real `FILE_MODES` in ask-ollama.mjs:78. No typo'd mode.

**2. R12 HONESTY — PASS.** The comment block (lines 343-348) is accurate, not a scope-dodge. A UserPromptSubmit hook genuinely has no file context (only `payload.prompt`) and a sync fetch would block every prompt. Emitting a directive Claude runs is the correct architecture, not a dodge. The framing "Claude still owns execution" is honest.

**3. DIRECTIVE TEXT — PASS with P2.** Materially stronger than the soft text: imperative verb, concrete runnable command, explicit "do NOT re-derive", quantified savings. The `<file>` placeholder requiring substitution is correct — the hook *can't* know the file, and forcing Claude to fill it is honest. P2: line 367 `node scripts/ask-ollama.mjs` is repo-root-relative; if Claude's cwd is a slot worktree (`H:/prism-slot-<x>`) the relative path still resolves (worktrees share the tree layout), so acceptable — but an absolute path would be more robust.

**4. SAFETY PRE-GATE — PASS (load-bearing, verified).** `SAFETY_PRE.test()` runs at classifyPrompt line 308, returning `{offloadable:false, category:"safety_physics"}` BEFORE the OFFLOADABLE_PATTERNS loop (line 315). "explain the kienzle coefficients" → `normalizeForSafety` → `\bkienzle\b` matches → returns at 309. It can never reach SAFE_AUTOEXEC. Homoglyph + invisible-char normalization closes bypass vectors. Solid.

**5. recordOllamaEvent DOUBLE-COUNT — PASS, not a bug.** The `auto-exec-directive` event (lines 524-528) uses `decision: "suggest"`, same as the `"injected"` event (line 503). The dash
... [+834 chars truncated]
