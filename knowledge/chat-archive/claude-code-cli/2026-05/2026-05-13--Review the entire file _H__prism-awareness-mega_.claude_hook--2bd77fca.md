---
type: "chat-session"
source: "claude-code-cli"
session_id: "2bd77fca-1eb0-4123-83b3-06c3943b62ba"
title: "Review the entire file `H:/prism-awareness-mega/.claude/hooks/claudemd-backflow."
date: "2026-05-13"
first_ts: "2026-05-13T20:22:34.938Z"
last_ts: "2026-05-13T20:23:14.794Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/2bd77fca-1eb0-4123-83b3-06c3943b62ba/subagents/agent-ac421025cfa66c4b2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review the entire file `H:/prism-awareness-mega/.claude/hooks/claudemd-backflow.

> **claude-code-cli** | 2026-05-13 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2bd77fca-1eb0-4123-83b3-06c3943b62ba/subagents/agent-ac421025cfa66c4b2.jsonl`

## Transcript

### User | 2026-05-13T20:22:34.938Z

Review the entire file `H:/prism-awareness-mega/.claude/hooks/claudemd-backflow.mjs` end-to-end as if you've never seen it.

**Unit:** KNOWLEDGE-VAULT-MS0 / U-VAULT03 (Boris back-flow hook pattern).

**Contract:**
- UserPromptSubmit hook that detects user correction phrases ("no, ...", "don't do X", "that's wrong", etc.) and appends a one-line bullet to `H:/prism/CLAUDE.md` under section `## §Recent regressions`, plus a structured entry to `state/shared/CLAUDE-MD-REGRESSIONS.jsonl`.
- High-precision triggers — accepts false negatives but ZERO tolerance for false positives (CLAUDE.md is the doctrine floor, any clutter taxes every future turn across 7 fleet chats).
- False-positive blockers: "don't worry", "no problem", "no, you're right", "wait until", literal `[NOT-REGRESSION]`.
- Concurrency: 7 fleet chats may fire simultaneously; uses single-line `appendFileSync` (<300 bytes ≪ PIPE_BUF=4096) — atomic without lock.
- Bloat guard: ≥50 entries in current calendar month → skip + advisory.
- Idempotency: same snippet recorded today already → skip (via JSONL dedup).
- Fail-safe: continueOnError, never blocks any prompt.
- Knobs: `PRISM_CLAUDEMD_BACKFLOW=0` (off), `PRISM_CLAUDEMD_BACKFLOW_PATH`, `PRISM_CLAUDEMD_BACKFLOW_JSONL`, `PRISM_CLAUDEMD_BACKFLOW_CAP`.

**Pure-function exports** (testable without I/O): `detectRegression`, `makeSnippet`, `countMonthlyEntries`, `prepareAppend`, `isDuplicateToday`.

Score against this rubric, flag P0/P1 findings, return PASS/FAIL with brief justification:
1. **Logic correctness** — do `detectRegression` triggers + false-positive blockers actually capture only real corrections? Walk through 6+ real example prompts mentally (incl. "don't worry", "no, you're right", "actually, let's do X", "that's wrong", "[NOT-REGRESSION] I see why you did Y", "stop here for now").
2. **Concurrency safety** — is `appendFileSync` truly atomic for the bullet payload? What if the JSONL append fails mid-write? What if two chats hit simultaneously?
3. **Adve
... [+1206 chars truncated]

### Assistant | 2026-05-13T20:22:48.418Z

I'll read the file end-to-end and review it against the rubric.

### Assistant | 2026-05-13T20:22:48.623Z

[tool_use: Read]

### User | 2026-05-13T20:22:52.931Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * claudemd-backflow.mjs — UserPromptSubmit hook
5	 *
6	 * Milestone: KNOWLEDGE-VAULT-MS0 / U-VAULT03 (Boris back-flow pattern).
7	 *
8	 * Doctrine: Boris #1 — "After ANY correction from the user, update CLAUDE.md
9	 * so you don't make that mistake again." This hook automates the back-flow:
10	 * when a UserPromptSubmit prompt looks like a correction, i
... [+17605 chars truncated]

### Assistant | 2026-05-13T20:23:14.794Z

VERDICT: PASS (with P1 fixes recommended before next fire)

Findings (severity-sorted):

- **P0 — makeSnippet regex is broken (line 186).** `/[ -]+/g` is a character class spanning ASCII 0x20–0x2D (space through hyphen), which strips `!"#$%&'()*+,-` from every snippet — including punctuation core to corrections ("don't", "won't", commas, etc.). The intended `[\x00-\x1f\x7f]` control-class is what the eslint-disable comment describes, but the literal source doesn't match it. Fix: replace with `replace(/[\x00-\x1f\x7f]+/g, " ")` then collapse whitespace.

- **P1 — `isMainModule` Windows path comparison is fragile (lines 407–413).** On Windows, `process.argv[1]` is `H:\prism-awareness-mega\...mjs` and `import.meta.url` is `file:///H:/prism-awareness-mega/...mjs` (note triple slash + drive). The current `"file://" + ...replace(/\\/g,"/")` produces `file://H:/...` (double slash, no leading slash before drive) — mismatch → returns `false` → `main()` never runs when invoked as a hook on Windows. Fix: use `import { fileURLToPath } from "node:url"; isMainModule = path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])`.

- **P1 — 250 KB `readFileSync(CLAUDE.md)` on every UserPromptSubmit (line 363).** Fires synchronously *before* the hook can emit `continue:true`, adding ~5–15 ms × 7 fleet chats × every prompt. `countMonthlyEntries` only needs the §Recent regressions section — read CLAUDE.md once into a module-level mtime-keyed cache, or read only the tail (e.g. last 32 KB) since new appends go to EOF.

- **P1 — JSONL append race vs. CLAUDE.md append is not transactional (lines 385 & 394).** If JSONL write succeeds and CLAUDE.md write throws, `isDuplicateToday` on the next fire will suppress the retry → silent loss. Either (a) append CLAUDE.md FIRST then JSONL, so dedup only suppresses after both succeeded, or (b) tag the JSONL entry with `mdAppended:true|false` and let dedup ignore `mdAppended:false` rows.

- **P1 — `prepareAppend` ISO timestamp trunc
... [+1583 chars truncated]
