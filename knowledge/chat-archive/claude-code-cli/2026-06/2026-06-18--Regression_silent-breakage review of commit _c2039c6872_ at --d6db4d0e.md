---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Regression/silent-breakage review of commit `c2039c6872` at H:/prism: `cd /h/pri"
date: "2026-06-18"
first_ts: "2026-06-18T14:51:54.807Z"
last_ts: "2026-06-18T14:54:00.466Z"
cwd: "H:\\prism"
messages: 42
user_msgs: 18
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-aaf5e992d387411bb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Regression/silent-breakage review of commit `c2039c6872` at H:/prism: `cd /h/pri

> **claude-code-cli** | 2026-06-18 | 42 msgs (18 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-aaf5e992d387411bb.jsonl`

## Transcript

### User | 2026-06-18T14:51:54.807Z

Regression/silent-breakage review of commit `c2039c6872` at H:/prism: `cd /h/prism && git show c2039c6872` (rtk git show) + Read scripts/zulu-build-loop.mjs + scripts/zulu-build-loop.test.mjs fully.

CONTEXT: this is the fleet-wide `PRISM Zulu Build Loop` cron (runs unattended, writes the build-pointer that gates the bravo builder chat). The change adds resolveSpec() spec-fallback + a fail-loud failed-ledger-row + a structured ledgerRecord().

HUNT FOR (cite file:line):
1. SILENT-BREAKAGE / SELF-DEFEAT: does the new resolveSpec FALLBACK ever MASK a genuinely-missing spec? (It falls back to the latest dated spec -- if the operator INTENDED a specific dated spec and it is gone, the cron now silently uses an older one. Is the viaFallback stderr log enough, or could this hide a real rotation error? Assess whether fallback-then-succeed is safer or more dangerous than fail-loud-always for this cron.)
2. FALLBACK CORRECTNESS: the configured path ITSELF matches the glob prefix; when configured is empty, the glob includes it -- does the iterate-from-latest skip the empty configured file and still find an older non-empty one? Trace tryRead returning null on empty -> continue.
3. STRUCTURED-LEDGER REGRESSION: any consumer of zulu-build-loop-log.jsonl that assumes the OLD field set / key order? (grep for readers of the ledger.) The added at/status/source/specViaFallback must not break an existing parser.
4. FAIL-LOUD PATH: on null-spec, is the failed row actually durable (appendLedger mkdir+append, best-effort try/catch) and does return 2 still propagate to the entrypoint process.exit(2)?
5. DATE/SORT EDGE: lexical sort of YYYY-MM-DD ISO names == chronological -- confirm no edge where a non-ISO-dated sibling (e.g. ...-CANDIDATES-FINAL.md) sorts AFTER a real date and gets wrongly picked as "latest".
6. Test hermeticity: the resolveSpec tests use real temp dirs (mkdtempSync) + rmSync cleanup in finally -- confirm no shared-state leakage between tests, no reliance on the real spec
... [+111 chars truncated]

### Assistant | 2026-06-18T14:51:58.223Z

I'll review commit c2039c6872 and trace the changes. Let me start by gathering the diff and reading the relevant files.

### Assistant | 2026-06-18T14:51:59.163Z

[tool_use: Bash]

### Assistant | 2026-06-18T14:51:59.633Z

[tool_use: Read]

### Assistant | 2026-06-18T14:51:59.680Z

[tool_use: Read]

### User | 2026-06-18T14:52:00.360Z

[tool_result] read-once-guard: 'H:\prism\scripts\zulu-build-loop.mjs' was already read 8s ago in this session and is unchanged (mtime 1781794097183). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T14:52:01.197Z

[tool_result] read-once-guard: 'H:\prism\scripts\zulu-build-loop.test.mjs' was already read 1s ago in this session and is unchanged (mtime 1781794212286). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T14:52:03.378Z

[tool_result] commit c2039c6872921a7df75ca90b3b83bf4f84214d02
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 09:51:25 2026 -0500

    [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-CRON-FAILLOUD (slot:bravo): zulu-build-loop spec-fallback + fail-loud ledger (overnight-workflows article upgrade)
    
    Article-grounded cron hardening (state/shared/articles/2026-06-09-mikenevermiss-overnigh
... [+17392 chars truncated]

### Assistant | 2026-06-18T14:52:06.915Z

The diff was provided but the full file wasn't read into context this session via Read (the guard says it was read but I don't have it — the guard tracks a prior read). Let me read the full file to verify the surrounding code, and trace consumers of the ledger.

### Assistant | 2026-06-18T14:52:07.371Z

[tool_use: Read]

### User | 2026-06-18T14:52:07.909Z

[tool_result] read-once-guard: 'H:\prism\scripts\zulu-build-loop.mjs' was already read 16s ago in this session and is unchanged (mtime 1781794097183). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T14:52:08.335Z

[tool_use: Grep]

### Assistant | 2026-06-18T14:52:08.512Z

[tool_use: Grep]

### User | 2026-06-18T14:52:20.765Z

[tool_result] Found 5 files
knowledge\memories\reference\reference_zulu_build_cron_git_grounded_2026_06_16.md
scripts\zulu-build-loop.mjs
scripts\lib\zulu-build-queue.test.mjs
scripts\lib\zulu-build-queue.mjs
knowledge\wiki\lessons\zulu-build-cron-git-grounded-shipped-detection.md

### User | 2026-06-18T14:52:20.821Z

[tool_result] Found 2 files
scripts\zulu-build-loop.mjs
.claude\helpers\install-zulu-build-loop-cron.ps1

### Assistant | 2026-06-18T14:52:24.210Z

The read-once guard is blocking me but I do have the full diff. Let me bypass the cache to read the complete file body (I need the parts NOT in the diff: `shapeDirective`, `buildQueueFromTexts` signature, the entrypoint `process.exit`), and check the ledger consumers and queue lib.

### Assistant | 2026-06-18T14:52:25.621Z

[tool_use: Bash]

### Assistant | 2026-06-18T14:52:26.097Z

[tool_use: Read]

### Assistant | 2026-06-18T14:52:26.447Z

[tool_use: Read]

### User | 2026-06-18T14:52:31.756Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * zulu-build-loop.mjs -- ZULU autonomous build-loop driver (slot:zulu, 2026-06-15,
     4	 * U-ZULU-BUILDLOOP INCR 2). The cron-safe orchestration tick for "autonomous
     5	 * continuous building".
     6	 *
     7	 * WHAT IT DOES each run:
     8	 *   1. Reads the capability spec + bravo brief (the Obsidian/specs build-queue sources).
     9	 *   2.
... [+11261 chars truncated]

### User | 2026-06-18T14:52:32.367Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\zulu-build-queue.mjs' was already read 33s ago in this session and is unchanged (mtime 1781789306365). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T14:52:33.674Z

[tool_result] 1	# install-zulu-build-loop-cron.ps1
2	# ZULU-BUILDLOOP (INCR 3) -- register a Windows Scheduled Task that fires
3	# scripts/zulu-build-loop.mjs every N minutes so the autonomous build queue stays
4	# continuously fresh: it recomputes the ranked PENDING queue (capability spec + bravo
5	# brief), Ollama-digests the next unit, and writes state/shared/zulu-build-loop-next.json
6	# for a gated builder
... [+4747 chars truncated]

### Assistant | 2026-06-18T14:52:37.482Z

I have the full file. Now let me verify the queue lib signature (does `buildQueueFromTexts` accept the 3rd `{gitLogText}` arg — note the diff added this but it's NOT mentioned in the commit message gaps), and check the ledger consumers + the inject hook that reads the pointer.

### Assistant | 2026-06-18T14:52:38.897Z

[tool_use: Bash]

### Assistant | 2026-06-18T14:52:40.310Z

[tool_use: Grep]

### Assistant | 2026-06-18T14:52:41.149Z

[tool_use: Grep]

### User | 2026-06-18T14:52:45.452Z

[tool_result] #!/usr/bin/env node
/**
 * zulu-build-queue.mjs -- pure build-queue reader/selector for the ZULU autonomous
 * build-loop orchestrator (slot:zulu, 2026-06-15, U-ZULU-BUILDLOOP INCR 1).
 *
 * WHY: the operator wants "autonomous continuous building". The build-loop driver
 * (INCR 2) needs to know WHAT to build next. This is the verifiable pure core (R13):
 * given the capability spec (C-units) + th
... [+2228 chars truncated]

### User | 2026-06-18T14:52:48.960Z

[tool_result] 79:export function parseShipped(briefText) {
95: * while C1-C8 were genuinely shipped, so parseShipped saw 0 and the pointer falsely
100: * recognized. Sibling lesson to the parseShipped prose-miscount regression: prove shipped
103:export function parseShippedFromCommits(gitLogText) {
104:  const text = String(gitLogText || "");
156: * Shipped ids are the UNION of the brief's "## SHIPPED" prose (p
... [+442 chars truncated]

### User | 2026-06-18T14:52:49.190Z

[tool_result] Found 4 files
scripts\zulu-build-loop.mjs
scripts\lib\zulu-build-pointer.test.mjs
scripts\lib\zulu-build-pointer.mjs
.claude\hooks\zulu-build-pointer-inject.mjs

### Assistant | 2026-06-18T14:52:55.639Z

The `buildQueueFromTexts(specText, briefText, opts)` 3rd-arg `{gitLogText}` is confirmed already supported in the queue lib (the loop simply now passes it — back-compat). Now I need to verify the ledger consumers (does any reader assume the OLD field set / key order?) and the pointer-inject hook (does it read the ledger or just the next.json?). Let me also check whether the failed-row ledger path can produce a malformed line that breaks a JSONL parser, and confirm there's no test for the `main()` gitLogText wiring.

### Assistant | 2026-06-18T14:52:57.046Z

[tool_use: Bash]

### Assistant | 2026-06-18T14:52:58.933Z

[tool_use: Grep]

### Assistant | 2026-06-18T14:52:59.755Z

[tool_use: Bash]

### User | 2026-06-18T14:53:02.114Z

[tool_result]      1	#!/usr/bin/env node
     2	// tier: T2
     3	// zulu-build-pointer-inject.mjs -- UserPromptSubmit
     4	//
     5	// ZULU-BUILDLOOP INCR 4 (slot:zulu, 2026-06-15). The CONSUMER half of the autonomous
     6	// build loop. INCR 1-3 (queue core + cron driver + scheduled task) keep
     7	// state/shared/zulu-build-loop-next.json continuously fresh with the next GATED build
     8	// unit fo
... [+5497 chars truncated]

### User | 2026-06-18T14:53:03.799Z

[tool_result] 26:  const next = d.next || {};
28:  const pending = Array.isArray(d.pending) ? d.pending : [];
44:  lines.push(`- pending (${typeof d.pendingCount === "number" ? d.pendingCount : pending.length}): ${pendingIds || "(none)"}`);
45:  lines.push(`- shipped: ${typeof d.doneCount === "number" ? d.doneCount : "?"} | gated/blocked: ${blocked.length ? blocked.join(", ") : "(none)"}`);
65:  const next = di
... [+13 chars truncated]

### User | 2026-06-18T14:53:08.879Z

[tool_result] export function parseShipped(briefText) {
  const text = String(briefText || "");
  const shipped = new Set();
  // Slice from the SHIPPED heading up to the next "## " heading (or end-of-text).
  const m = text.match(/##[^\n]*SHIPPED[\s\S]*?(?=\n##\s|$)/i);
  if (!m) return shipped;
  // Match C<n> only at a bullet-header start (after a "-"/"*" bullet + optional
  // "**" bold), never mid-line pro
... [+4417 chars truncated]

### Assistant | 2026-06-18T14:53:19.156Z

I now have the full picture. Key findings confirmed:

1. **Ledger consumer (`zulu-build-pointer-inject.mjs` + `zulu-build-pointer.mjs`)**: reads `zulu-build-loop-next.json` (the POINTER), NOT the ledger jsonl. The pointer is written by `atomicWriteJson` via `shapeDirective` — UNCHANGED by this commit (still has `next/pending/pendingCount/doneCount/blocked/blockedCount/note/sources`). The ledger jsonl has no programmatic reader in the repo (only the cron writes it; the install script just names the path). So the structured-ledger change is back-compat safe.

2. **`buildQueueFromTexts(spec.text, briefText, { gitLogText })`**: the 3rd arg is already supported (back-compat, `opts.gitLogText` optional). The git signal merge is sound.

3. **Fail-loud path**: `appendLedger` does mkdir+append best-effort, `return 2` propagates to `process.exit(code || 0)` → exit 2. Correct.

Let me verify two remaining edge concerns: (5) the lexical-sort edge — could a non-ISO-dated `.md` sibling under the glob prefix sort AFTER a real date, and (the un-requested but load-bearing concern) does any OTHER ledger reader exist outside `.mjs` (e.g. a dashboard/monitor in `.ts`/`.ps1`/`.py`)? Let me check both.

### Assistant | 2026-06-18T14:53:19.968Z

[tool_use: Grep]

### Assistant | 2026-06-18T14:53:21.431Z

[tool_use: Bash]

### User | 2026-06-18T14:53:26.578Z

[tool_result] .claude\helpers\install-zulu-build-loop-cron.ps1-93-Write-Host "  pointer  : H:/prism/state/shared/zulu-build-loop-next.json"
.claude\helpers\install-zulu-build-loop-cron.ps1:94:Write-Host "  ledger   : H:/prism/state/shared/zulu-build-loop-log.jsonl"
.claude\helpers\install-zulu-build-loop-cron.ps1-95-Write-Host "  SAFE     : maintains the next-build pointer only; never builds/commits (gated buil
... [+354 chars truncated]

### User | 2026-06-18T14:53:31.099Z

[tool_result] HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-15.md

### Assistant | 2026-06-18T14:54:00.466Z

I have everything needed to render a verdict.

**Verification summary of all 6 hunt items:**

1. **Ledger jsonl has NO programmatic reader anywhere in the repo** — only `zulu-build-loop.mjs` (writer) and the install `.ps1` (which just `Write-Host`s the path) reference `zulu-build-loop-log`. The actual consumer (`zulu-build-pointer-inject.mjs` → `zulu-build-pointer.mjs`) reads only the POINTER `next.json`, which `shapeDirective` produces UNCHANGED. So the structured-ledger change cannot break a parser — no parser exists. (Item 3 = clean.)

2. **Item 5 (sort edge): live specs dir has exactly ONE matching file** (`...-2026-06-15.md`). The commit message claims fallback to a "latest dated spec" but there is no second dated spec on disk — so on a rotation/rename of that single file, the fallback finds NOTHING and correctly returns null → fail-loud. The non-ISO-sibling-sorts-after-date concern: the glob filter is `startsWith(PREFIX) && endsWith(".md")`. A sibling like `...-CANDIDATES-FINAL.md` WOULD match the prefix+`.md` and, since `'F' (0x46) > '2' (0x32)`, sorts AFTER any `...-YYYY-` dated name and would be wrongly picked as "latest". This is a real latent edge but currently dormant (no such sibling exists) and only reachable via the fallback path (configured missing/empty) — a P2, not a P1.

3. **Items 2, 4, 6 all verified correct**: empty-configured → `tryRead` returns null → continue to fallback loop (test `configured present but EMPTY` proves it); `return 2` propagates through `process.exit(code || 0)`; tests use `mkdtempSync` + `rmSync` in `finally`, inject `specsDir`, never touch the real specs dir — fully hermetic.

One genuine self-defeat concern for Item 1 (silent-masking): for THIS cron specifically, fallback-then-succeed is **safer** than fail-loud-always, because the prior behavior was a silent phantom-drained (worse — a false "all done" that idles the builder). The fallback at least keeps a real queue flowing and the `viaFallback` stderr is captured in Tas
... [+2875 chars truncated]
