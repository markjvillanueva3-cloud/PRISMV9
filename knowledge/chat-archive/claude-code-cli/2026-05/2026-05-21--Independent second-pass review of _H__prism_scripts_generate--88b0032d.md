---
type: "chat-session"
source: "claude-code-cli"
session_id: "88b0032d-0552-493b-a189-33c54e0904e9"
title: "Independent second-pass review of `H:/prism/scripts/generate-link-audit-features"
date: "2026-05-21"
first_ts: "2026-05-21T14:47:30.031Z"
last_ts: "2026-05-21T14:49:32.132Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 7
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/88b0032d-0552-493b-a189-33c54e0904e9/subagents/agent-a1381cb7a1aeba2f1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Independent second-pass review of `H:/prism/scripts/generate-link-audit-features

> **claude-code-cli** | 2026-05-21 | 16 msgs (7 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/88b0032d-0552-493b-a189-33c54e0904e9/subagents/agent-a1381cb7a1aeba2f1.jsonl`

## Transcript

### User | 2026-05-21T14:47:30.031Z

Independent second-pass review of `H:/prism/scripts/generate-link-audit-features.mjs` (just created — read the whole file end-to-end). This is iter 6 of an echo /loop /goal synergize milestone. The generator reads `state/shared/.knowledge-link-audit.json` (~680KB, schemaVersion 1.0.0) and emits a system-viz augmentation file with one ghost roost + N broken-link children for `/system-viz` visualization.

Spec it must satisfy:
1. Pure-core (`brokenLinkNodeId` + `generate`) hermetic-testable; `main` is I/O shell.
2. Deterministic — same input twice → identical output (FNV-1a hash deterministic across Node versions).
3. topN clamped to [0, 200]; NaN/negative → 0.
4. Hostile-payload safe — fail-soft on missing stats / non-array broken / NaN counts.
5. Idempotency offloaded to merge-augmentations.mjs (it skips existing ids).
6. Knob `PRISM_LINK_AUDIT_VIZ_TOPN`.
7. Exit codes 0/1/2.

Reviewer-B weighting (independent / what A won't catch):
- Adversarial inputs: unicode in `link` field, prototype pollution via `b.link`/`b.from`, Symbol keys, NaN proliferation in `(brokenCount/total)*100`.
- FNV-1a hash quality at the sample sizes used (N=50 default, 200 max) — collision probability acceptable?
- Karpathy R12: this is a producer, generally should fail-loud. Verify the right errors crash and the right errors fall through. The `main()` returns 1/2 — but `generate()` (pure) never throws. Is that the right split?
- Idempotency claim: the merge step dedupes by `node.id`, but if the same audit is regenerated with `from` changed (e.g., a wiki rename), the `brokenLinkNodeId` changes → new node added, OLD node stays. Stale-node accumulation risk.
- Graph blast radius: 200 children per regen × 100 regens = 20K stale ghost nodes if dedupe-by-old-id never fires. Real concern?
- Label/info length caps: 80/120 chars — sufficient to prevent graph render breakage?
- The label includes `[[link]]` syntax — does that interact badly with anything downstream that might re-parse the label as a wi
... [+294 chars truncated]

### Assistant | 2026-05-21T14:47:50.994Z

I'll perform an independent second-pass review of the link-audit features generator.

### Assistant | 2026-05-21T14:47:51.468Z

[tool_use: Read]

### Assistant | 2026-05-21T14:47:52.206Z

[tool_use: Read]

### Assistant | 2026-05-21T14:47:52.218Z

[tool_use: Read]

### User | 2026-05-21T14:47:56.446Z

[tool_result] read-once-guard: 'H:\prism\scripts\generate-misc-tasks-features.mjs' was already read 7m ago in this session and is unchanged (mtime 1778937910095). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-21T14:47:56.455Z

[tool_result] read-once-guard: 'H:\prism\scripts\generate-link-audit-features.mjs' was already read 0s ago in this session and is unchanged (mtime 1779374515993). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-21T14:47:58.329Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1060 of 1638 total (32811 tokens, cap 25000). Call Read with offset=1061 limit=1060 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	#!/usr/bin/env node
2	/**
3	 * merge-augmentations.mjs — fold per-augmentation JSONs back into system-
... [+50154 chars truncated]

### Assistant | 2026-05-21T14:48:07.226Z

I have enough from the merge consumer pattern. Let me read the generator under review and the sibling exemplar.

### Assistant | 2026-05-21T14:48:07.738Z

[tool_use: Read]

### User | 2026-05-21T14:48:11.488Z

[tool_result] read-once-guard: 'H:\prism\scripts\generate-link-audit-features.mjs' was already read 16s ago in this session and is unchanged (mtime 1779374515993). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-21T14:48:16.775Z

[tool_use: Bash]

### Assistant | 2026-05-21T14:48:18.634Z

[tool_use: Bash]

### User | 2026-05-21T14:48:36.740Z

[tool_result]    1: #!/usr/bin/env node
   2: /**
   3:  * generate-link-audit-features.mjs — system-viz augmentation: the link-audit
   4:  * integrity roost.
   5:  *
   6:  * Spec: /goal synergy iter 6 (echo, 2026-05-21). Closes the visual surface
   7:  * for the iter-4 producer / iter-5 consumer pair:
   8:  *   - iter-4 [[reference_u_knowledge_link_audit_wire_2026_05_20]] writes
   9:  *     `state/shared
... [+9391 chars truncated]

### User | 2026-05-21T14:48:52.077Z

[tool_result] TOTAL LINES: 154
   1: #!/usr/bin/env node
   2: /**
   3:  * generate-misc-tasks-features.mjs — system-viz augmentation: the "misc tasks" roost.
   4:  *
   5:  * Spec: MISC-TASKS extraction (slot juliett, forge7, 2026-05-16).
   6:  *
   7:  * Reads `state/shared/specs/MISC-TASKS-INVENTORY.json` (produced by
   8:  * extract-misc-tasks.mjs) and emits a system-viz augmentation that adds:
   9:  *
... [+6630 chars truncated]

### Assistant | 2026-05-21T14:49:32.132Z

# Reviewer-B Independent Second-Pass: `generate-link-audit-features.mjs`

## Verdict: **PASS with P1 carveouts**

Pure-core split is clean, FNV-1a is the right primitive at N≤200, exit-code split (1=missing/2=runtime) matches sibling. But several adversarial gaps Reviewer A is unlikely to weight.

---

### P0 — none

### P1

1. **`generatedAt` breaks byte-determinism (line 181).** Spec #2 says "same input twice → identical output." `new Date().toISOString()` makes every run differ at the `generatedAt` field. Sibling `generate-misc-tasks-features.mjs:126` has the same flaw — *inherited bug*, not a regression — but the spec was explicit. Fix: gate behind `PRISM_FROZEN_TIME` env / inventory mtime fallback (pattern from `audit-close-out-candidates.mjs --frozen-time`).

2. **Stale-node accumulation is real (your concern, confirmed).** `brokenLinkNodeId` mixes `from_hash` into the id. When a wiki entry is renamed (`from` changes) the same broken `[[link]]` produces a NEW id. `merge-augmentations.mjs:961-966` only dedupes by id — it never REMOVES stale `ghost.broken_link.*` nodes. At 4136 broken links × weekly regen × renames → multi-thousand orphan ghost accumulation over months. **Mitigation: drop `from_hash` from id when `link` alone is unique enough, OR add a sweeper in merge that prunes `kind:"broken-link"` nodes not in current augmentation.** P1, not P0, because cap=200 bounds blast radius per regen.

3. **`linkPart` collision on unicode/symbol links.** Line 72 `replace(/[^a-z0-9_-]+/g, "-")` collapses every non-ASCII to `-`. `[[αβγ]]` and `[[δεζ]]` both → `linkPart="x"` (fallback). With `from_hash` they stay disjoint *only if* `from` differs. Two unicode-only links from the same source file → id collision → second skipped silently as "existing". Add a unicode-aware fallback (CRC over original `link`) before `|| "x"`.

### P2

4. **Label `[[${link}]]` (line 136) is literal wikilink syntax.** If anything downstream re-parses node labels for wiki backreferences (e.g., 
... [+2524 chars truncated]
