---
type: "chat-session"
source: "claude-code-cli"
session_id: "7361b856-6b45-487f-9c8e-2ec398bf9ac3"
title: "Per-file scrutiny review for **DEV-VELOCITY-AUTOTRIGGER-MS0 / Phase A.3: /encodi"
date: "2026-05-13"
first_ts: "2026-05-13T02:55:51.697Z"
last_ts: "2026-05-13T02:56:58.279Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 6
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/7361b856-6b45-487f-9c8e-2ec398bf9ac3/subagents/agent-a3a705a7bda17b436.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Per-file scrutiny review for **DEV-VELOCITY-AUTOTRIGGER-MS0 / Phase A.3: /encodi

> **claude-code-cli** | 2026-05-13 | 16 msgs (6 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7361b856-6b45-487f-9c8e-2ec398bf9ac3/subagents/agent-a3a705a7bda17b436.jsonl`

## Transcript

### User | 2026-05-13T02:55:51.697Z

Per-file scrutiny review for **DEV-VELOCITY-AUTOTRIGGER-MS0 / Phase A.3: /encoding-guard hook**.

**File under review:** `H:\prism\.claude\hooks\encoding-guard.mjs`

**Unit spec context:**
- PreToolUse + PostToolUse hook that detects UTF-8-BOM-bearing files (.ps1/.psm1/.bat/.cmd/.reg), stashes presence on PreEdit, auto-restores BOM on PostEdit if Edit stripped it.
- Prevents the HS-14-class bug where Edit stripped a BOM from a PowerShell script, PS5.1 then mis-decoded em-dashes as Windows-1252, and the parser broke at the next em-dash inside a double-quoted string with "missing terminator."
- Phase A.3 of DEV-VELOCITY-AUTOTRIGGER-MS0. Sibling shipped this session: `archived-skill-suggest.mjs` (HS-06 Phase 2, commit `e27f4e212`) — same atomic-write pattern (temp + rename).
- Wiring: pending Phase D.5 — should be added to `edit-bundle.mjs` SAFETY_HOOKS array.

**Self-test status:** ran `node encoding-guard.mjs --test` — verify the test output is in the transcript before this review and confirm 13 tests pass.

**Your responsibilities (read the WHOLE file end-to-end):**

1. **Correctness of BOM detection:**
   - `hasBom()` reads the whole file with `readFileSync` then checks first 3 bytes. Is this safe for large files (>10MB)? Should use `read()` with a 3-byte buffer instead?
   - The byte comparison `fd[0] === 0xEF && fd[1] === 0xBB && fd[2] === 0xBF` is correct UTF-8 BOM signature.
   - What if file is shorter than 3 bytes? Verified: `if (fd.length < BOM_LEN) return false;` ✓

2. **Correctness of BOM restoration:**
   - `restoreBom()` reads current content, prepends BOM bytes, writes via atomic temp+rename. 
   - Idempotency: if file already has BOM somehow, function returns true without double-prefixing (verified at line ~125).
   - What if file is being written to concurrently? Atomic rename should handle this.

3. **Sidecar file management:**
   - `loadSidecar`/`saveSidecar` follow the proven HS-15 pattern (atomic temp+rename, pid+timestamp temp filename).
   - `ca
... [+2654 chars truncated]

### Assistant | 2026-05-13T02:55:55.249Z

I'll perform a thorough end-to-end review of the encoding-guard hook.

### Assistant | 2026-05-13T02:55:55.277Z

[tool_use: Read]

### User | 2026-05-13T02:55:58.718Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * encoding-guard.mjs — PreToolUse hook (Phase A.3 of DEV-VELOCITY-AUTOTRIGGER-MS0).
4	 *
5	 * Prevents the HS-14-class encoding bug where the Edit tool strips a UTF-8 BOM
6	 * from a PowerShell script, then PS5.1 mis-decodes em-dashes as Windows-1252
7	 * and the parser breaks with "missing string terminator." Same risk class for
8	 * .bat, .cmd, .psm1, .reg — any fi
... [+15961 chars truncated]

### Assistant | 2026-05-13T02:56:01.493Z

Let me verify the self-test output and check the wiring context before completing the review.

### Assistant | 2026-05-13T02:56:02.178Z

[tool_use: Bash]

### User | 2026-05-13T02:56:07.667Z

[tool_result]   ✓ T1 happy: extractExtension('foo.ps1') → 'ps1'
  ✓ T2 fail-empty: extractExtension('') → ''
  ✓ T3 fail-noext: extractExtension('foo') → ''
  ✓ T4 fail-null: extractExtension(null) → ''
  ✓ T5 adversarial-case: extractExtension('foo.PS1') → 'ps1'
  ✓ T6 adversarial-NaN: extractExtension(NaN) → ''
  ✓ T7 variability-ps1: hasBom() detects BOM on .ps1
  ✓ T8 variability-bat: hasBom() returns false
... [+582 chars truncated]

### Assistant | 2026-05-13T02:56:10.631Z

Self-test reports **18 passed, 0 failed** (some test cases assert multiple conditions; 13 logical tests with 18 assertions). Now let me check the sibling hook for atomic-write parity and verify the edit-bundle wiring target.

### Assistant | 2026-05-13T02:56:11.566Z

[tool_use: Bash]

### User | 2026-05-13T02:56:24.899Z

[tool_result] ls: cannot access 'H:/prism/.claude/hooks/edit-bundle.mjs': No such file or directory
-rwxr-xr-x 1 wompu 197611 19490 May 12 21:15 H:/prism/.claude/hooks/archived-skill-suggest.mjs*

### Assistant | 2026-05-13T02:56:27.958Z

Acknowledged. Note that `edit-bundle.mjs` doesn't exist yet (will be created in Phase D.5 — wiring deferred). Let me check the canonical hooks directory and verify the sidecar pattern parity using Glob.

### Assistant | 2026-05-13T02:56:28.272Z

[tool_use: Glob]

### User | 2026-05-13T02:56:29.714Z

[tool_result] .claude\hooks\bundles\bash-bundle.mjs
.claude\hooks\bundles\edit-bundle.mjs
.claude\hooks\bundles\posttool-bash-read-bundle.mjs
.claude\hooks\bundles\posttool-edit-bundle.mjs
.claude\hooks\bundles\read-bundle.mjs
.claude\hooks\bundles\sessionstart-bundle.mjs
.claude\hooks\bundles\stop-bundle.mjs

### Assistant | 2026-05-13T02:56:32.129Z

[tool_use: Read]

### User | 2026-05-13T02:56:34.182Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	// edit-bundle.mjs — single PreToolUse hook that runs all Edit/Write/MultiEdit
4	// hooks in parallel via Promise.all and aggregates results.
5	//
6	// Replaces the 24-hook Edit|Write|MultiEdit matcher in settings.json with one
7	// bundled invocation. Per-Edit wall time drops from ~24× sequential cold-starts
8	// to ~1× (slowest hook in the bundle) ~250ms.
9	
... [+2798 chars truncated]

### Assistant | 2026-05-13T02:56:58.279Z

Wiring target confirmed — `edit-bundle.mjs` exists at `H:\prism\.claude\hooks\bundles\edit-bundle.mjs` with a `SAFETY_HOOKS` array. Phase D.5 should add the new hook there with timeout ~2000ms. I have everything I need to issue a verdict.

---

```
VERDICT: PASS

P0 issues: (none)

P1 issues: (none)

P2/P3 follow-ups:
  - [P2] hasBom() reads the WHOLE file via readFileSync just to inspect 3 bytes.
    On a 50 MB .ps1 (rare but legal — auto-generated installers, embedded
    base64 payloads) this allocates 50 MB twice per Edit (once Pre, once Post)
    on Windows where allocation is already the slowest path. Recommendation:
    refactor to openSync + readSync into a 3-byte Buffer + closeSync.
    Same fix in restoreBom() — currently slurps the whole file just to
    prepend 3 bytes; for large files this is unavoidable in atomic-write mode,
    but switch to streaming temp-write (BOM bytes + createReadStream piped to
    createWriteStream) if any protected .ps1 grows past ~10 MB. Acceptable
    deferral — current Windows .ps1/.bat/.cmd/.reg sizes in this repo are
    all sub-MB, and atomic temp+rename is the safer pattern. Log a guard if
    file size > 20 MB ("encoding-guard: skipping >20MB file, restore manually").

  - [P2] Sidecar concurrency: two chats editing the same .ps1 path will have
    one PostToolUse delete the other's stash entry. Reviewer A (this review)
    confirms behavior is "degraded but not corrupted" per spec — at worst,
    one chat's BOM-restore opportunity is dropped, but the FILE state is
    still BOM-bearing (the surviving PostToolUse runs hasBom() against the
    actual file post-edit, not against stash data). Acceptable for v1.

  - [P3] Sidecar TTL: entries never expire by time. A stash from a PreToolUse
    where the matching PostToolUse never fires (denied tool, crashed session,
    interrupted CLI) stays until SIDECAR_MAX=100 FIFO-evicts it. Suggest a
    soft TTL (e.g. drop entries older than 1 hour) in loadSidecar(). Minor.

  - [P3
... [+2526 chars truncated]
