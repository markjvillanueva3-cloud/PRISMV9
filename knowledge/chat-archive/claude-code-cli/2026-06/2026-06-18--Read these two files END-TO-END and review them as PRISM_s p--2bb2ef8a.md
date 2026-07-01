---
type: "chat-session"
source: "claude-code-cli"
session_id: "2bb2ef8a-06f5-4b6f-8801-35a9db88efb7"
title: "Read these two files END-TO-END and review them as PRISM's per-file scrutiny arm"
date: "2026-06-18"
first_ts: "2026-06-18T01:41:56.948Z"
last_ts: "2026-06-18T01:43:41.566Z"
cwd: "H:\\prism"
messages: 27
user_msgs: 10
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-af8f98304feea498f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Read these two files END-TO-END and review them as PRISM's per-file scrutiny arm

> **claude-code-cli** | 2026-06-18 | 27 msgs (10 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-af8f98304feea498f.jsonl`

## Transcript

### User | 2026-06-18T01:41:56.948Z

Read these two files END-TO-END and review them as PRISM's per-file scrutiny arm A (analyst, weighted toward silent breakage, security, I/O correctness, error-budget completeness):

1. H:/prism/scripts/account-switch-preflight.mjs  (the module under review)
2. H:/prism/scripts/account-switch-preflight.test.mjs  (its test)

CONTEXT — what this is and why it exists:
- This is a READ-ONLY GO/NO-GO validator run BEFORE arming an automatic Claude-account credential switch. The auto-switch overwrites the live `~/.claude/.credentials.json` with a captured snapshot from `H:/.claude-accounts/account-N/`. If it fires blindly it could overwrite a working login with a stale snapshot.
- `gradePreflight` must return RED (block arming) when: the current live account is UNIDENTIFIABLE (matches no snapshot), <2 distinct rotation accounts, a rotation member lacks a refresh token, a rotation account has no snapshot, or no next target resolves. YELLOW (degraded but allowed) for stale captures or all-expired access tokens. GREEN otherwise.
- It depends on `scripts/lib/claude-account-lib.mjs` (resolveLiveCredentialPath, credentialSnapshotPath, readRotationOrder, readActiveAccount, writeActiveAccount, nextAccountInRotation).

HARD SECURITY REQUIREMENT (the #1 thing to verify): the module reads credential files but must NEVER return, log, or write a raw token VALUE, nor expose a sha256 token fingerprint in its report. Tokens are compared only via internal fingerprints; the report carries account names + grades + ages + booleans ONLY. Verify there is no code path (CLI human output, --json output, the returned report object, error messages, the --fix-active marker write) that could leak a token string or a fingerprint.

ALSO VERIFY:
- `credFingerprint.valid` correctly requires a refresh token (an account with no refresh token cannot re-authenticate, so it must be unusable for rotation).
- `identifyCurrent` matches refreshToken first (stable), then accessToken; a miss returns {account:null}.

... [+914 chars truncated]

### Assistant | 2026-06-18T01:41:59.343Z

I'll read both files end-to-end and trace every path adversarially.

### Assistant | 2026-06-18T01:42:00.289Z

[tool_use: Read]

### Assistant | 2026-06-18T01:42:00.327Z

[tool_use: Read]

### User | 2026-06-18T01:42:00.870Z

[tool_result] read-once-guard: 'H:\prism\scripts\account-switch-preflight.mjs' was already read 7m ago in this session and is unchanged (mtime 1781743918930). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T01:42:01.587Z

[tool_result] 1	// Tests for account-switch-preflight.mjs -- the READ-ONLY GO/NO-GO before arming
2	// the auto account-switch. Verifies the validator surfaces the empirically-found
3	// live state (current account UNIDENTIFIABLE -> RED) AND the healthy state (GREEN),
4	// plus every refusal branch. R9: each test fails if the grading logic changes.
5	//
6	// SECURITY: every fixture token is a generated FAKE val
... [+15959 chars truncated]

### Assistant | 2026-06-18T01:42:04.377Z

The module is in my context from a prior read but I need to verify the exact line numbers for citations. Let me re-read it fresh to get accurate line numbers, and also read the dependency lib.

### Assistant | 2026-06-18T01:42:05.316Z

[tool_use: Bash]

### Assistant | 2026-06-18T01:42:05.494Z

[tool_use: Read]

### User | 2026-06-18T01:42:06.070Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\claude-account-lib.mjs' was already read 7m ago in this session and is unchanged (mtime 1780589060071). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T01:42:09.170Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * account-switch-preflight.mjs -- ZULU-ACCOUNT-CYCLE-MS0 / U-ACCT-PREFLIGHT
     4	 * (slot:zulu, 2026-06-18). The READ-ONLY GO/NO-GO before arming the auto
     5	 * account-switch. Answers: "if the switch fires right now, will it land on a
     6	 * valid account, or will it overwrite a working login with a stale snapshot?"
     7	 *
     8	 * WHY TH
... [+17855 chars truncated]

### Assistant | 2026-06-18T01:42:11.861Z

The lib content is in my context from a prior read. Let me retrieve the specific functions I need to verify the contract — the dependency functions the module relies on.

### Assistant | 2026-06-18T01:42:13.144Z

[tool_use: Grep]

### User | 2026-06-18T01:42:16.230Z

[tool_result] 56:export function resolveLiveCredentialPath({ home = homedir() } = {}) {
57-  return join(home, ".claude", ".credentials.json");
58-}
59-
60-export function accountDir(accountName, { accountsRoot = DEFAULT_ACCOUNTS_ROOT } = {}) {
61-  if (!ACCOUNT_NAME_RE.test(accountName)) {
62-    throw new Error(`invalid account name '${accountName}' (must match ${ACCOUNT_NAME_RE})`);
63-  }
64-  return join(a
... [+4220 chars truncated]

### Assistant | 2026-06-18T01:42:22.075Z

I now have the full module, test, and the dependency contracts. Let me verify a few critical paths adversarially. First, the `__capturedAtMs` handling — line 247 reads `j && j.__capturedAtMs` from the credential file, but the manifest is the canonical source. Let me trace the YELLOW stale-capture and identifyCurrent edge cases carefully.

Let me check one subtle issue: in `runPreflight`, snapshots are built ONLY from `order` names (line 242-243), but `identifyCurrent` matches the live against these snapshots. If the live account's snapshot exists in the vault but is NOT in ROTATION_ORDER, it won't be enumerated. Let me verify the lib's `readRotationOrder` and whether there's an "any extras present" enumeration the docstring claims.

### Assistant | 2026-06-18T01:42:23.261Z

[tool_use: Grep]

### User | 2026-06-18T01:42:24.851Z

[tool_result] 81:  capturedAt = new Date().toISOString(),
110:    captured_at: capturedAt,
217:    capturedAt: now().toISOString(),

### Assistant | 2026-06-18T01:42:33.438Z

`__capturedAtMs` does not exist anywhere in the lib — confirming line 247's `j.__capturedAtMs` is always `undefined` (the credential file never carries it). The real value comes from the manifest loop (line 250-256). That's a harmless dead read but worth noting. Let me verify the comment at line 238 claiming "+ any extras present" — the code only uses `order` names, so the docstring overstates. Let me check the snapshot expiry classification path carefully for the `accessClass` in the report.

Let me trace the key adversarial concern: does `gradePreflight` line 198 `allExpiredAccess` use `s.fp.expiresAt`, and does the snapshot's `expiresAt` (line 247) correctly come from the fingerprint? Yes — line 247 sets `expiresAt: fp.expiresAt` and line 149/198 read `s.fp.expiresAt`. Consistent.

Now let me verify the security claim exhaustively — grep for every place a token or fingerprint could escape into output.

### Assistant | 2026-06-18T01:42:34.729Z

[tool_use: Grep]

### User | 2026-06-18T01:42:36.259Z

[tool_result] 9: *   - claudeAiOauth has NO stable account-identity field -- only accessToken +
10: *     refreshToken (both rotate), expiresAt, scopes, subscriptionType. So the
15: *   - The live refresh token matched NONE of the 6 snapshots, and all 6 snapshots'
16: *     access tokens expired 4 days ago. So a blind first swap could OVERWRITE the
22: * IDENTITY (best available): match the live claudeAiOauth.r
... [+3715 chars truncated]

### Assistant | 2026-06-18T01:42:46.288Z

Security trace is now exhaustive. The `fp` object (which contains `accessFp`/`refreshFp`) is constructed in snapshots (line 247) and the live (line 236), used internally by `identifyCurrent` and `gradePreflight`. Critically: the returned report (lines 276-288) spreads `...graded`, and `graded` returns `accounts` (line 207) — built at lines 142-153 — which carries ONLY `name, isCurrent, valid, hasRefresh, accessClass, capturedDaysAgo, inRotation`. No `fp`/`accessFp`/`refreshFp`. The snapshot objects with `fp` are NOT in the report. CLI output (line 314) emits only booleans/class. Security holds.

Now let me verify one boundary concern in the test: line 119-120 of the test asserts `classifyAccess(NOW + EXPIRING_SOON_MS - 1)` → "expiring-soon" and `NOW + EXPIRING_SOON_MS` → "expiring-soon" (boundary inclusive). Trace against module line 119: `if (e - nowMs <= EXPIRING_SOON_MS) return "expiring-soon"`. For `e = NOW + EXPIRING_SOON_MS`: `e - nowMs = EXPIRING_SOON_MS <= EXPIRING_SOON_MS` → true → "expiring-soon". Correct. But the test never asserts the `fresh` boundary at exactly `EXPIRING_SOON_MS + 1`. Minor coverage gap.

Let me verify the critical `distinctAccounts` logic against a subtle case: two rotation members sharing the SAME refresh token (a duplicate snapshot). Let me also confirm there's no double-counting issue with `daysAgo` returning fractional days and the YELLOW stale threshold.

### Assistant | 2026-06-18T01:42:47.225Z

[tool_use: Read]

### User | 2026-06-18T01:42:48.179Z

[tool_result] 1	// scripts/lib/claude-account-lib.mjs
2	//
3	// Pure helpers for ZULU-ACCOUNT-CYCLE-MS0 — manage H:/.claude-accounts/
4	// (per-account credential snapshots + manifests, sibling tree to
5	// .claude-profiles/). Consumed by U1 (capture handler), U2 (.ps1 swap),
6	// U3 (slash command), U5 (95% watchdog), U6 (zulu coordinator).
7	//
8	// Pure-core / injected-readers: every IO arg is explicit so ca
... [+1556 chars truncated]

### Assistant | 2026-06-18T01:42:59.369Z

I now have the full picture. The `readRotationOrder` validates account names with `ACCOUNT_NAME_RE` and `writeActiveAccount` writes atomically (tmp + rename). `nextAccountInRotation` returns `order[0]` when current is unknown/null. Let me verify one final concern — the duplicate-refresh-token case and whether `gradePreflight`'s `distinctAccounts` could mask a real problem, and trace the `--fix-active` write-only-active-marker guarantee.

The `_writeActive` (line 230, default `writeActiveAccount`) writes ONLY the ACTIVE_MARKER_FILE (lib line 264), never the live credential. The fix path (line 263) requires `id.account` to be truthy — only fires when current is identified. Confirmed read-only except the marker.

Let me do a final check on a real adversarial gap: the `runPreflight` snapshot enumeration only reads `order` names. If the live account IS captured in the vault but the operator forgot to add it to ROTATION_ORDER, `identifyCurrent` returns null → RED "UNIDENTIFIABLE" even though identity is knowable. Let me confirm the docstring vs code claim.

The module docstring at line 238 says "Enumerate captured snapshots from the rotation order **+ any extras present**" but line 242-243 only iterates `Array.from(new Set(order))`. There is NO enumeration of extra on-disk snapshots. This is a docstring/code drift. Let me verify whether the lib offers a directory-listing function the code should have used.

### Assistant | 2026-06-18T01:43:00.767Z

[tool_use: Grep]

### User | 2026-06-18T01:43:02.516Z

[tool_result] 18:  readdirSync,
19-  renameSync,
20-  statSync,
21-  unlinkSync,
--
545:export function listAccounts({ accountsRoot = DEFAULT_ACCOUNTS_ROOT } = {}) {
546-  if (!existsSync(accountsRoot)) return [];
547:  const entries = readdirSync(accountsRoot, { withFileTypes: true });
548-  const out = [];
549-  for (const e of entries) {
550-    if (!e.isDirectory()) continue;

### Assistant | 2026-06-18T01:43:41.566Z

Confirmed: `listAccounts()` EXISTS in the lib (line 545) and enumerates all on-disk account snapshots. The module's docstring (line 238) claims "+ any extras present" but the code (line 242-243) only uses `order` names — it does NOT call `listAccounts()`. This is a real code/doc divergence with a behavioral consequence I'll detail below.

I now have everything needed for a complete adversarial verdict. Let me finalize.

---

VERDICT: PASS

summary: The security contract holds under exhaustive tracing — no token value or fingerprint can reach the returned report, `--json` output, CLI human output, or the `--fix-active` marker write; the `fp` objects (carrying `accessFp`/`refreshFp`) stay internal and the `accounts[]` projection in the report carries only names/grades/booleans/ages. The grade precedence is correct (RED can never be downgraded by a later YELLOW `warn`), `credFingerprint.valid` correctly gates on refresh-token presence, `identifyCurrent` matches refresh-first then access with a clean null-miss, and `runPreflight` is read-only except the explicitly-guarded marker write. The only findings are a docstring/code divergence that overstates enumeration (P2) and two minor coverage/robustness gaps (P2) — none block arming and none are silent breakage.

findings:

- [P2] `scripts/account-switch-preflight.mjs:238` (+ enumeration at `:242-243`) — **Docstring/code divergence with a real behavioral edge.** The comment says "Enumerate captured snapshots from the rotation order **+ any extras present**," but the code only builds snapshots from `Array.from(new Set(order))`. It never calls the lib's `listAccounts()` (`claude-account-lib.mjs:545`, which exists and lists all on-disk snapshots). Consequence: if the live account IS captured in the vault but the operator forgot to add it to `ROTATION_ORDER`, `identifyCurrent` matches nothing → RED "UNIDENTIFIABLE," even though identity is actually knowable from the extra snapshot. This is the *safe* failure direction (it bloc
... [+5047 chars truncated]
