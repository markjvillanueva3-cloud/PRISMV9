---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "Deep-read the PRISM CLAUDE.md files and report what self-check + honesty + anti-"
date: "2026-06-08"
first_ts: "2026-06-08T16:36:44.576Z"
last_ts: "2026-06-08T16:38:28.603Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_4c9296d1-215/agent-a2482d95101e51b90.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# Deep-read the PRISM CLAUDE.md files and report what self-check + honesty + anti-

> **claude-code-cli** | 2026-06-08 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_4c9296d1-215/agent-a2482d95101e51b90.jsonl`

## Transcript

### User | 2026-06-08T16:36:44.576Z

Deep-read the PRISM CLAUDE.md files and report what self-check + honesty + anti-fabrication doctrine ACTUALLY exists (read contents, quote real lines + line numbers). Files to READ IN FULL: C:/Users/wompu/.claude/CLAUDE.md (global) and H:/prism/CLAUDE.md (project). Focus: (a) Is there a "## HONESTY RULES" / self-check / "I don't know license" / verification-before-write block? Quote it. (b) Is it within the first ~50-60 lines (Article 1/3 say honesty rules must be near top or Claude skims past)? (c) Does it define what "done" means + re-verify-tests-not-memory? (d) R12 fail-loud, R8 read-before-write, the Karpathy rules — quote the real text. Map each finding to Article 1 layer-1 and Article 3 layers 1-2. Report VERBATIM quotes with file:line, then a coverage verdict (COVERED / PARTIAL / MISSING) per article-layer. Do NOT summarize from titles — read the actual file bytes.

### Assistant | 2026-06-08T16:37:24.607Z

I'll read both CLAUDE.md files in full to analyze the honesty doctrine and self-check rules.

### Assistant | 2026-06-08T16:37:24.770Z

[tool_use: Read]

### Assistant | 2026-06-08T16:37:24.787Z

[tool_use: Read]

### User | 2026-06-08T16:37:27.639Z

[tool_result] 1	# PRISM Global CLAUDE.md — Operational Playbook v2.5
2	
3	> **Edit `C:\Users\<your-user>\.claude\settings.json` ONLY** — the `c-to-h-mirror` hook (`.claude/hooks/mirror-c-to-h.mjs`, INTEL-OLLAMA-OBSIDIAN-MS0/P6-U01, **wired into both settings.json 2026-05-15**) auto-replicates C: → H: on every Edit/Write/MultiEdit/NotebookEdit. One-way only; SHA-256 byte-equal skip; 2s throttle; excludes cache/l
... [+24241 chars truncated]

### User | 2026-06-08T16:37:35.180Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-201 of 544 total (57352 tokens, cap 25000). Call Read with offset=202 limit=201 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# PRISM — Manufacturing Intelligence Platform
2	
3	## EXPERT ROLE (ALWAYS ACTIVE)
4	<!-- DUPLICATE-CANDIDA
... [+43327 chars truncated]

### Assistant | 2026-06-08T16:37:49.992Z

I'll continue reading the project CLAUDE.md file to capture the full honesty doctrine and anti-fabrication rules.

### Assistant | 2026-06-08T16:37:49.992Z

[tool_use: Read]

### User | 2026-06-08T16:37:51.935Z

[tool_result] 202	   - **Agent B — independent second-pass `reviewer`**, weighted on what A is unlikely to catch: integration with already-built engines, hidden coupling, security, error budgets, naming/convention conformance, inlined constants, stub assertions.
203	   - Both agents read the **whole file end-to-end** (not split sections). Pass each agent: the absolute file path, the unit spec / contract they're
... [+26872 chars truncated]

### Assistant | 2026-06-08T16:38:28.603Z

Based on my deep read of both CLAUDE.md files, here is the detailed mapping of the honesty doctrine and anti-fabrication rules:

---

## HONESTY & ANTI-FABRICATION DOCTRINE — COVERAGE AUDIT

### **FILE 1: C:/Users/wompu/.claude/CLAUDE.md (Global)**

**SECTION: "HONESTY RULES" (Lines 40–45)**

**VERBATIM QUOTE:**
```
## HONESTY RULES (read every turn — anti-fabrication, src: rody @0x_rody + Karpathy system-prompt-learning, 2026-06-08)
> R12 is fail-loud on **build outcomes** ("tests pass" / "migration done"). This block covers **conversational fabrication** — the orthogonal gap. Kept ≤8 lines deliberately.
- **Verify a symbol before claiming it exists** — read its def / grep it / check the manifest. Before USING a symbol you haven't read this session, do the same — or mark the reference `// UNVERIFIED`. Never fabricate engine names, dispatcher actions, file:line, function signatures, errors, stack-traces, or API responses.
- **"I don't know" is an acceptable answer.** When you can't verify, say "I haven't verified this" explicitly and do not build on the unverified claim. A correct "I don't know" beats a confident guess. (Plan-mode-for->1-file is already covered by `enforce-plan-before-build.py` — no re-forge.)
- **Ask before adding an unseen library** — if a task wants a dependency never referenced in this repo, ask first.
```

**LOCATION:** Lines 40–45 (early in file, **within first 50 lines** ✓)

**COVERAGE vs. ARTICLES:**

| Article / Layer | Finding | Quote / Location | Verdict |
|---|---|---|---|
| **Article 1 Layer-1: "I don't know" license** | PRESENT | Line 43: `"I don't know" is an acceptable answer. When you can't verify, say "I haven't verified this" explicitly and do not build on the unverified claim.` | **COVERED** |
| **Article 1 Layer-1: Verification-before-claim** | PRESENT | Line 42: `Verify a symbol before claiming it exists — read its def / grep it / check the manifest. Before USING a symbol you haven't read this session, do the same — or mark the
... [+8213 chars truncated]
