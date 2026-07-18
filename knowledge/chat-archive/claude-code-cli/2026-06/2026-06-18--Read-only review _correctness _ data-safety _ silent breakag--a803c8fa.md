---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Read-only review (correctness / data-safety / silent breakage). Grade PASS or FA"
date: "2026-06-18"
first_ts: "2026-06-18T16:08:46.125Z"
last_ts: "2026-06-18T16:10:58.806Z"
cwd: "H:\\prism-slot-india"
messages: 30
user_msgs: 11
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-afea7bb926581c90d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Read-only review (correctness / data-safety / silent breakage). Grade PASS or FA

> **claude-code-cli** | 2026-06-18 | 30 msgs (11 user / 19 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-afea7bb926581c90d.jsonl`

## Transcript

### User | 2026-06-18T16:08:46.125Z

Read-only review (correctness / data-safety / silent breakage). Grade PASS or FAIL with file:line.

CONTEXT: slot:india. New deterministic galaxy-tagger that recovers DROPPED galaxy attribution in the LoRA training corpus (state/shared/lora/fleet-lora-combined.jsonl). 917/1336 rows were untagged; the tagger derives the galaxy from the row's source + instruction (bridge-reasoning instruction names the galaxy; cad-* source -> cad; outcome-bus dispatcher -> galaxy; cross-cutting vault-feedback/wiki-canonical -> 'fleet'). DRY-RUN validated: 917 newly tagged, 0 still-untagged, sensible distribution (fleet +595, cad +133, speed-feed +17, every galaxy gets bridge rows). 7/7 unit tests pass.

FILES (read end-to-end):
- H:/prism/scripts/tag-lora-corpus-galaxies.mjs
- H:/prism/scripts/tag-lora-corpus-galaxies.test.mjs

VERIFY:
1. deriveGalaxy CORRECTNESS: the regex `about the PRISM ([a-z0-9][a-z0-9-]*) galaxy` -- does it correctly + safely extract the galaxy slug (no over/under-match)? The dispatcher map + cad-prefix + cross-cutting-source logic -- correct precedence (most-specific first: bridge-instruction > cad-source > dispatcher > cross-cutting)? Any row that gets a WRONG galaxy?
2. DATA SAFETY of --apply: it does fs.copyFileSync(corpus, corpus+".bak") THEN rewrites. Confirm: (a) the backup happens BEFORE the overwrite; (b) the rewrite preserves ALL rows + ALL existing fields (only ADDS r.galaxy; JSON.stringify(r) round-trips the full row); (c) malformed lines are skipped on parse -- could --apply DROP malformed rows (data loss) since parseRows silently skips them and the rewrite emits only parsed rows? This is the key risk: if any line fails JSON.parse, --apply would LOSE it. Flag if so.
3. IDEMPOTENCY: re-running skips already-tagged rows (r.galaxy||r.domain check). Confirm a 2nd --apply is a no-op (no double-tag, no corruption).
4. Does it ever OVERWRITE an existing galaxy tag? (It should only tag rows lacking galaxy/domain.)
5. HONESTY: unknown -> null (left untagged)
... [+192 chars truncated]

### Assistant | 2026-06-18T16:08:49.874Z

I'll read both files end-to-end to verify the galaxy-tagger logic and the critical data-safety concerns.

### Assistant | 2026-06-18T16:08:50.662Z

[tool_use: Read]

### Assistant | 2026-06-18T16:08:50.808Z

[tool_use: Read]

### User | 2026-06-18T16:08:51.923Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * tag-lora-corpus-galaxies.mjs -- recover DROPPED galaxy attribution in the fleet LoRA combined
4	 * corpus (slot:india 2026-06-18). The per-galaxy "<512 pairs/galaxy" LoRA blocker is largely a
5	 * TAGGING-LOSS bug, not data scarcity: 917/1336 rows in state/shared/lora/fleet-lora-combined.jsonl
6	 * carry NO galaxy field, and ~322 of those are galaxy-SPECIFIC pairs 
... [+6627 chars truncated]

### User | 2026-06-18T16:08:52.089Z

[tool_result] 1	// Tests for tag-lora-corpus-galaxies.mjs -- deterministic galaxy-tag recovery for the LoRA corpus.
2	// Run: node --test scripts/tag-lora-corpus-galaxies.test.mjs
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import { deriveGalaxy, galaxyDistribution } from "./tag-lora-corpus-galaxies.mjs";
6	
7	test("deriveGalaxy -- bridge-reasoning: extracts the galaxy named
... [+3033 chars truncated]

### Assistant | 2026-06-18T16:08:54.766Z

Now let me verify the critical #2c concern: whether the corpus contains malformed lines that would be silently dropped on `--apply`. Let me inspect the actual corpus file and trace the producer that writes it.

### Assistant | 2026-06-18T16:08:56.722Z

[tool_use: Bash]

### Assistant | 2026-06-18T16:08:59.794Z

[tool_use: Bash]

### User | 2026-06-18T16:09:00.847Z

[tool_result] total newline-terminated lines: 1336

### User | 2026-06-18T16:09:04.513Z

[tool_result] {
  "totalLines": 1337,
  "nonEmpty": 1336,
  "parsed": 1336,
  "malformed": 0,
  "bad": []
}

### Assistant | 2026-06-18T16:09:07.841Z

The current corpus has 0 malformed lines, so `--apply` would not drop anything *today*. But the risk is real for future runs. Let me confirm the round-trip preserves all fields and check whether any existing rows carry fields that could be lost, plus verify the regex precedence concerns.

### Assistant | 2026-06-18T16:09:11.758Z

[tool_use: Bash]

### User | 2026-06-18T16:09:15.571Z

[tool_result] all field keys: advisory, galaxy, input, instruction, output, source, weight
rows with galaxy: 419 | rows with domain: 0
sources:
  vault-galaxy-synthesis-lora: 407
  vault-feedback-lora: 313
  wiki-canonical-pairs: 282
  bridge-reasoning-lora: 184
  cad-ground-truth-feature-priors: 71
  cad-fix-training-corrections: 29
  cad-dimension-radii: 16
  vault-galaxy-aisynergy-lora: 12
  outcome-bus-reco
... [+46 chars truncated]

### Assistant | 2026-06-18T16:09:19.234Z

Now let me verify the precedence concerns and check the actual bridge-reasoning / outcome-bus / vault-galaxy-synthesis instruction shapes to spot any wrong-galaxy assignment. Note `vault-galaxy-synthesis-lora` (407 rows) and `vault-galaxy-aisynergy-lora` (12) are NOT in any rule — they'd stay untagged unless they already carry a galaxy.

### Assistant | 2026-06-18T16:09:25.004Z

[tool_use: Bash]

### User | 2026-06-18T16:09:29.476Z

[tool_result] source | already-tagged | untagged
  vault-feedback-lora: tagged=0 untagged=313
  vault-galaxy-synthesis-lora: tagged=407 untagged=0
  vault-galaxy-aisynergy-lora: tagged=12 untagged=0
  bridge-reasoning-lora: tagged=0 untagged=184
  wiki-canonical-pairs: tagged=0 untagged=282
  outcome-bus-recommendations: tagged=0 untagged=11
  cad-fix-training-corrections: tagged=0 untagged=29
  cad-ground-trut
... [+2034 chars truncated]

### Assistant | 2026-06-18T16:09:43.556Z

The data confirms: all 419 already-tagged rows come from `vault-galaxy-synthesis-lora` (407) + `vault-galaxy-aisynergy-lora` (12), and they have 0 untagged — so the tagger never touches them (idempotency safe). All rule-target sources are 100% untagged, so no existing tag is at risk of overwrite. Let me now run the actual dry-run and a simulated `--apply` round-trip on a copy to empirically verify field preservation and the malformed-drop behavior.

### Assistant | 2026-06-18T16:09:50.239Z

[tool_use: Bash]

### User | 2026-06-18T16:09:54.269Z

[tool_result] newly-derived distribution:
  fleet: 595
  cad: 133
  speed-feed: 17
  ai-training: 7
  academy: 6
  agent-orchestration: 6
  discovery: 6
  fleet-hygiene: 6
  hermes-zulu: 6
  lathe: 6
  mill: 6
  post-processor: 6
  quoting: 6
  wedm: 6
  backend-helper: 5
  blueprint-vision: 5
  bug-hunting: 5
  business: 5
  cad-fusion-live: 5
  cam: 5
  compliance-safety: 5
  corpus-aggregation: 5
  database-
... [+385 chars truncated]

### Assistant | 2026-06-18T16:09:58.584Z

The dry-run matches the claimed distribution (917 newly tagged: 595 fleet + 133 cad + 17 speed-feed + bridge rows across every galaxy + outcome-bus). Round-trip preserves all fields and only adds `galaxy`. Now let me empirically test the malformed-line-drop risk on `--apply` by creating an isolated copy with a deliberately malformed line and running `--apply` against it.

### Assistant | 2026-06-18T16:10:02.376Z

[tool_use: Bash]

### User | 2026-06-18T16:10:07.144Z

[tool_result] before=1336 withbad=1338
AFTER apply: corpus=1336  bak=1338
==> rows DROPPED by apply = 2

### Assistant | 2026-06-18T16:10:13.277Z

Empirically confirmed: `--apply` with malformed lines present DROPS them. The 2-line malformed file shrank from 1338 to 1336 — the backup (`.bak`) preserves the original 1338, but the live corpus loses the unparseable rows silently. This is the #2c silent-data-loss risk, latent today (0 malformed) but a real footgun on any future corpus that has a torn/non-JSON line.

Now let me close the remaining verification on regex precedence and the over/under-match concern for the bridge regex.

### Assistant | 2026-06-18T16:10:23.557Z

[tool_use: Bash]

### User | 2026-06-18T16:10:27.839Z

[tool_result] OK  bridge non-greedy stop at space: got="speed-feed" exp="speed-feed"
OK  bridge with comma immediately: got="cad" exp="cad"
OK  bridge UPPERCASE galaxy in text: got="cad" exp="cad"
OK  cad-source precedence when no bridge: got="cad" exp="cad"
OK  dispatcher wins only if no bridge+no cad: got="cam" exp="cam"
OK  cross-cutting only if nothing else: got="fleet" exp="fleet"
OK  dispatcher with trail
... [+255 chars truncated]

### Assistant | 2026-06-18T16:10:33.128Z

All precedence and regex-boundary cases pass. The bridge regex `[a-z0-9][a-z0-9-]*` correctly stops at the space before `galaxy` (no over-match into the rest of the sentence) and preserves hyphenated slugs. Precedence is bridge > cad-source > dispatcher > cross-cutting, exactly as designed. The cad-source-wins-over-dispatcher case is intentionally correct (a cad-source row with a `PRISM mill` instruction is still cad data by construction).

Let me run the unit tests to confirm the 7/7 claim and check the `.bak` clobber concern (a 2nd `--apply` overwrites the first backup).

### Assistant | 2026-06-18T16:10:33.645Z

[tool_use: Bash]

### User | 2026-06-18T16:10:37.737Z

[tool_result] # tests 7
# suites 0
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 61.367

### Assistant | 2026-06-18T16:10:58.806Z

7/7 tests pass. Idempotency is structurally sound: the second `--apply` re-parses the (now-tagged) corpus, the `if (r.galaxy || r.domain) continue` skips every row, and the rewrite is byte-identical to the input — no double-tag, no corruption. The only side effect of a 2nd run is that `.bak` gets clobbered with the already-tagged content (minor: the original pre-tag backup is lost on re-run, but the corpus is unchanged so there's nothing to recover).

I have completed all verification. Here is my verdict.

---

VERDICT: PASS

summary: The tagger is correct, honest, and idempotent on the real corpus — dry-run reproduces the claimed 917 newly-tagged / 0-still-untagged distribution, all 419 pre-tagged rows (vault-galaxy-synthesis/aisynergy) are 100% skipped so no existing tag is ever overwritten, the round-trip preserves every field and only adds `r.galaxy`, and precedence (bridge > cad-source > dispatcher > cross-cutting) holds on every adversarial boundary case. The one genuine silent-failure path — `--apply` dropping any line that fails `JSON.parse` — is empirically real but currently latent (0 malformed lines today) and a backup is taken first, so it is P2, not a blocker.

findings:
- [P2] `H:/prism/scripts/tag-lora-corpus-galaxies.mjs:79-87,95,117` — `parseRows` silently swallows malformed lines (`catch { /* skip */ }`), and `--apply` rewrites only the parsed rows, so any future torn/non-JSON line is DROPPED from the live corpus on apply (empirically reproduced: a 1338-line file with 2 bad lines was rewritten to 1336). Latent now (verified 0 malformed across all 1336 rows) and the `.bak` taken at line 116 *before* the overwrite preserves the original, so it is recoverable — but it is a silent loss the operator won't see. Fix: count `parsedRows` vs `nonEmptyLines` and, on `--apply`, refuse-and-fail-loud (R12) if any line failed to parse, or echo a `WARNING: N malformed lines will be dropped` before rewriting. The backup-before-overwrite ordering (line 116 then 117)
... [+1748 chars truncated]
