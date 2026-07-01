---
name: lone-surrogate-api400-2026-06-10
description: "Anthropic 400 'The request body is not valid JSON: no low surrogate in string' = an UNPAIRED UTF-16 surrogate in the request body, caused by a naive str.slice(0,N) cutting mid-emoji (mid-surrogate-pair). Fix: scripts/lib/safe-truncate.mjs (stripLoneSurrogates + surrogate-safe truncation). bravo was hard-blocked by this (slot:golf, 2026-06-10)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.647Z
aliases: reference_lone_surrogate_api400_2026_06_10
---


# Lone-surrogate API 400 -- "no low surrogate in string" (slot:golf, 2026-06-10)

## Symptom
A chat (bravo) hard-blocks: EVERY request returns
`400 The request body is not valid JSON: no low surrogate in string: line 1 column N (char N-1)`.
"Keeps getting it" = the bad char is re-sent every request (in a per-prompt injection OR
stuck in the live transcript).

## Root cause
An UNPAIRED UTF-16 surrogate in the request body. A high surrogate (U+D800-DBFF) without a
following low surrogate (U+DC00-DFFF). Produced when code does a naive `str.slice(0, N)` /
`str.substring(0, N)` on emoji-heavy content -- `.slice` cuts at a UTF-16 CODE-UNIT boundary,
so a cut BETWEEN the two halves of a surrogate pair (mid-emoji) leaves a lone high surrogate.
KEY: a lone surrogate breaks the API EVEN through JSON.stringify -- well-formed stringify
emits `\ud83d` for a lone high surrogate, which is valid JSON *syntax* but Anthropic's strict
parser rejects it ("a \u high surrogate must be followed by a \u low surrogate"). So escaping
does NOT save you; the surrogate must be REMOVED from the content.

## Fix (shipped c1a50b7c99)
- `scripts/lib/safe-truncate.mjs`: `stripLoneSurrogates(s)` (Node20+ `String.prototype.toWellFormed()`
  with a regex fallback -> lone surrogate becomes U+FFFD), `hasLoneSurrogate(s)` (predicate),
  `clampUtf8`/`utf8Truncate` (byte-budget, surrogate-safe; promoted from galaxy-context-card.mjs),
  `safeTruncate(s, maxUnits, suffix)` (code-unit budget, never splits a pair). 12/12 node:test.
- Apply at BOTH the truncation site (use safeTruncate, never raw .slice on user/emoji content)
  AND the emit chokepoint (stripLoneSurrogates the final additionalContext string).
- `slot-soul-inject.mjs` was the confirmed naive truncator (line 68) -> fixed + live-validated.

## Diagnosis playbook
1. `hasLoneSurrogate(content)` over the candidate source files (handoffs/souls/slot files).
   If a STATIC file is poisoned -> clean it with stripLoneSurrogates + fix the producer.
2. If NO static file is poisoned (bravo's case: scanned 1033, zero hits) -> it is generated at
   truncation time OR is in the LIVE transcript. Unblock the blocked chat with `/compact`
   (re-summarizes, flushes the raw poisoned message).
3. `galaxy-context-card.mjs` already truncates safely (clampUtf8/utf8Truncate) -- the bug lives
   in the OTHER ~30 injectors that still do naive `.slice(0,N)`. Adopt safe-truncate fleet-wide.

## Apply
NEVER `str.slice(0, N)` / `.substring(0, N)` on emoji-heavy content destined for an API body
or a hook's additionalContext. Use `safeTruncate`/`utf8Truncate` and/or `stripLoneSurrogates`
from `scripts/lib/safe-truncate.mjs`. Verify with `hasLoneSurrogate`, NOT eyeballing.

## RECURRENCE + fleet chokepoint gap-closure (2026-06-11, slot:alpha, commit 83e5aa61d4)
Golf hard-blocked AGAIN today with the same 400 (char ~877K). The prior fix shipped the helper +
fixed ONE injector (slot-soul-inject) but explicitly flagged "~30 other injectors still do naive
.slice()" -- that gap fired. Closure (U-SURROGATE-CHOKEPOINT-FLEET): (1) **chokepoint** -- `dedupeOrMarker`
(injection-dedup-fs.mjs, the shared emit path for **28 hooks**) now `stripLoneSurrogates(block)` at
entry, BEFORE the DISABLE check (safety unconditional; hash on cleaned content keeps the dedup key
stable) -> 28 hooks safe with ONE edit; (2) **emit-wrap** the 4 highest-traffic standalone emoji
injectors that bypass dedup (slot-brief-inject [also had the literal naive `truncateBrief` slice],
chat-bus-inject, awareness-snapshot, master-index-precheck-inject); (3) **diagnostic** `scripts/scan-lone-surrogates.mjs`
scans any file/dir incl a live `.jsonl` transcript -> file+char-offset+hex of every lone surrogate.
+5 chokepoint tests (12/12 dedup-fs, 21/21 slot-brief). **Static scan was CLEAN** -> golf's poison is
LIVE-TRANSCRIPT, so the immediate unblock is **`/compact` IN golf** (this commit prevents regeneration
next turn). HONEST BOUND: no single universal chokepoint (366 inline emit sites); remaining standalone
injectors carry mostly non-emoji content (session-ids/hashes = no surrogates). NOT a process-count
issue -- distinct from the rate-limit/orphaned-loop diagnosis golf is reaping.
