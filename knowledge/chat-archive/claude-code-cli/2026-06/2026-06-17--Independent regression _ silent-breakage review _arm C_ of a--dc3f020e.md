---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Independent regression + silent-breakage review (arm C) of a vault broken-wikili"
date: "2026-06-17"
first_ts: "2026-06-17T17:45:47.276Z"
last_ts: "2026-06-17T17:50:20.963Z"
cwd: "H:\\prism-slot-sierra"
messages: 59
user_msgs: 21
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-aba602b6493ac7a59.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Independent regression + silent-breakage review (arm C) of a vault broken-wikili

> **claude-code-cli** | 2026-06-17 | 59 msgs (21 user / 38 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-aba602b6493ac7a59.jsonl`

## Transcript

### User | 2026-06-17T17:45:47.276Z

Independent regression + silent-breakage review (arm C) of a vault broken-wikilink mass-healer. You MAY run `cd H:/prism && node --test scripts/vault-link-doctor.test.mjs` and `node scripts/vault-link-doctor.mjs --samples 6` (dry-run, safe -- NO --apply). Read both files. Grade PASS or FAIL with file:line.

FILES:
1. H:/prism/scripts/vault-link-doctor.mjs
2. H:/prism/scripts/vault-link-doctor.test.mjs

It rewrites up to 12,566 live notes (--apply). Hunt SPECIFICALLY for silent-corruption + edge cases:
- The diagnose() vs applyHeals() CONSISTENCY: diagnose() slices raw to 512KB before extractWikilinks; applyHeals() reads the full file and calls rewriteLinks on the WHOLE text. For a note >512KB, diagnose might map a heal whose offset is <512KB but rewriteLinks runs on the full file -- is that safe (it should be, rewriteLinks re-scans), or could it heal a DIFFERENT occurrence past 512KB? Assess.
- rewriteLinks regex `/(!?)\[\[([^\]\r\n]{1,256})\]\]/g` + codeRanges offset check: is the offset passed to inAnyRange the offset of the WHOLE match (including the optional `!`)? Could an embed `![[x]]` inside code be missed (offset off-by-one)? Trace.
- codeRanges: fenced ``` then inline ` -- could overlapping/nested code spans cause inAnyRange to miss a link? The ranges are sorted by start but NOT merged -- does inAnyRange handle overlaps correctly (it breaks when a[0]>pos)?
- slug COLLISION: two distinct notes with the same slug -> buildSlugIndex puts both in the set -> classifyBrokenTarget sees >1 candidate -> DANGLING (not healed). Good. But what if the SOURCE note itself shares the slug with the one real target? The self-exclusion `r !== fromRel` -- correct?
- applyHeals atomicity: temp `${full}.tmp.${pid}` + rename. If two concurrent doctor runs (two chats) collide on pid -- unlikely but note. The sync-lock check is vault-global (one lock) -- correct gate.
- Idempotency: after --apply, re-diagnose must show 0 healable (proven by a test). Confirm the logic guarantees it (
... [+357 chars truncated]

### Assistant | 2026-06-17T17:45:49.376Z

I'll start by reading both files in full, then run the test suite and dry-run.

### Assistant | 2026-06-17T17:45:50.287Z

[tool_use: Read]

### Assistant | 2026-06-17T17:45:50.302Z

[tool_use: Read]

### User | 2026-06-17T17:45:51.028Z

[tool_result] read-once-guard: 'H:\prism\scripts\vault-link-doctor.mjs' was already read 15s ago in this session and is unchanged (mtime 1781717996043). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T17:45:51.972Z

[tool_result] read-once-guard: 'H:\prism\scripts\vault-link-doctor.test.mjs' was already read 15s ago in this session and is unchanged (mtime 1781718293817). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T17:45:54.200Z

The files were already read into my context. Let me work from that content. Let me run the test suite and dry-run in parallel.

### Assistant | 2026-06-17T17:45:55.150Z

[tool_use: Bash]

### Assistant | 2026-06-17T17:45:55.835Z

[tool_use: Bash]

### User | 2026-06-17T17:45:58.741Z

[tool_result]   ...
# Subtest: rewriteLinks: heals every occurrence of the same target
ok 10 - rewriteLinks: heals every occurrence of the same target
  ---
  duration_ms: 0.6512
  ...
# Subtest: rewriteLinks: empty heals / non-string -> no-op
ok 11 - rewriteLinks: empty heals / non-string -> no-op
  ---
  duration_ms: 0.1059
  ...
# Subtest: diagnose: classifies HEALABLE / DANGLING / NON_NOTE with real counts

... [+850 chars truncated]

### User | 2026-06-17T17:46:08.301Z

[tool_result] [vault-link-doctor] notes=69453 brokenLinks=19366 (in 14761 notes)
  HEALABLE  12635 (65.2%) -- unique high-confidence rematch -> safe rewrite (12566 notes)
  DANGLING  6728 (34.7%) -- no/ambiguous candidate (152 ambiguous); never rewritten
  NON_NOTE  3 (0.0%) -- .base/external/asset; not a note defect
  HEALABLE sample:
    feedback_commit_prefix_main_on_shared_tree.md: [[reference-slot-reclaim-
... [+1417 chars truncated]

### Assistant | 2026-06-17T17:46:11.294Z

Both pass: 15/15 tests, dry-run reports 12,635 healable on a 69,453-note vault, no crash/hang. Now let me read both files carefully — the read-once guard says they're already in context, but I want to verify I have the actual content. Let me grep the key functions to trace the specific concerns.

### Assistant | 2026-06-17T17:46:12.869Z

[tool_use: Grep]

### User | 2026-06-17T17:46:13.820Z

[tool_result] 59:export function slugify(s) {
79:export function buildSlugIndex(basenameIndex) {
99:export function classifyBrokenTarget(target, fromRel, slugIndex) {
128:function inAnyRange(pos, ranges) {
142:export function rewriteLinks(text, heals) {
166:export function diagnose(vaultRoot = DEFAULT_VAULT, io = {}) {
216:export function applyHeals(report, vaultRoot = DEFAULT_VAULT, io = {}) {

### Assistant | 2026-06-17T17:46:15.400Z

Let me read the core functions in detail to trace the specific concerns.

### Assistant | 2026-06-17T17:46:16.036Z

[tool_use: Read]

### User | 2026-06-17T17:46:17.143Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/vault-link-doctor.mjs
3	//
4	// Link-graph DOCTOR for the PRISM Obsidian vault (H:/prism/knowledge): diagnose
5	// every BROKEN [[wikilink]] (an authored link whose target does not resolve to a
6	// note), CLASSIFY it, and SAFELY heal only the high-confidence tier.
7	//
8	// WHY: the vault has ~19.6K broken link instances across ~14.8K notes, which is
9	// the ro
... [+7744 chars truncated]

### Assistant | 2026-06-17T17:46:19.641Z

Now let me read the diagnose() and applyHeals() functions in detail.

### Assistant | 2026-06-17T17:46:20.453Z

[tool_use: Read]

### User | 2026-06-17T17:46:21.454Z

[tool_result] 165	
166	export function diagnose(vaultRoot = DEFAULT_VAULT, io = {}) {
167	  const { readFileImpl = fs.readFileSync } = io;
168	  const model = buildVaultModel(vaultRoot, io);
169	  const slugIndex = buildSlugIndex(model.basenameIndex);
170	  const report = {
171	    vaultRoot, notes: model.notes.size,
172	    brokenInstances: 0, notesWithBroken: 0,
173	    healable: 0, dangling: 0, nonNote: 0, a
... [+5724 chars truncated]

### Assistant | 2026-06-17T17:46:23.761Z

Now I have the full source. Let me check the test file content and the navigator's `extractWikilinks`/`normalizeKey` to trace consistency between diagnose and applyHeals.

### Assistant | 2026-06-17T17:46:24.280Z

[tool_use: Read]

### User | 2026-06-17T17:46:24.920Z

[tool_result] read-once-guard: 'H:\prism\scripts\vault-link-doctor.test.mjs' was already read 49s ago in this session and is unchanged (mtime 1781718293817). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T17:46:27.060Z

The guard claims the test file is in my context, but I don't actually have its content yet. Let me bypass the cache to read it, plus the navigator's key functions.

### Assistant | 2026-06-17T17:46:28.017Z

[tool_use: Bash]

### Assistant | 2026-06-17T17:46:29.405Z

[tool_use: Grep]

### User | 2026-06-17T17:46:32.545Z

[tool_result] // Tests for scripts/vault-link-doctor.mjs -- the broken-wikilink classifier+healer.
// Pure-function units + a hermetic real-FS vault (tmp) exercising diagnose() +
// applyHeals() on real file IO, with mutation-proof rewrite assertions (a mass
// vault mutator must never corrupt a note).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, w
... [+9147 chars truncated]

### User | 2026-06-17T17:46:34.548Z

[tool_result] 67:export function extractWikilinks(text) {
68-  if (typeof text !== "string" || !text) return [];
69-  const out = [];
70-  \ Bounded inner class ([^\]\r\n], capped length): a wikilink target is a single
71-  // line with no `]` and is short, so this matches every real link yet CANNOT
72-  // backtrack across a `[`-dense unclosed run -- keeping extraction O(n) on huge /
73-  // adversarial / corp
... [+2471 chars truncated]

### Assistant | 2026-06-17T17:46:40.355Z

I now have everything I need to trace the specific concerns. Let me verify a few critical edge cases empirically. First, the key consistency question: `extractWikilinks` regex is `!?\[\[...\]\]` (no capture group for the bang), while `rewriteLinks` regex is `(!?)\[\[...\]\]`. The crucial question is whether `extractWikilinks` and `rewriteLinks` produce the SAME target keys. Let me trace the offset/embed concern and the alias-in-extractWikilinks-vs-classify edge.

Let me check one subtle thing: in `diagnose`, `dedupKey = normalizeKey(target)` where `target` from `extractWikilinks` has already had `|alias` and `#heading` stripped and is `.trim()`ed. In `rewriteLinks`, the key is `normalizeKey(target.trim())` where target is `inner.slice(0, cut)`. Let me verify these match for an aliased link, and check the offset-of-match-with-bang concern.

### Assistant | 2026-06-17T17:46:50.807Z

[tool_use: Bash]

### User | 2026-06-17T17:46:54.320Z

[tool_result] embed-in-inline-code count (expect 0): 0
embed-outside-code (expect 1, ! preserved): "text ![[canonical]] outside code"
aliased+heading heal: "[[Canonical Note|display]] and [[Canonical Note#head]]"
codeRanges: [[0,28],[0,2],[12,24],[25,27]]
inside offset 13 outside offset 29
heal (inside must be skipped, outside healed): {"text":"```\nlet x = `[[inside]]`\n```\n[[b]]","count":1}

### Assistant | 2026-06-17T17:47:00.384Z

Key results so far:
- Embed `![[x]]` inside inline code → correctly skipped (count 0).
- Embed outside code → `!` preserved, healed correctly.
- Aliased/heading targets → key matches, only target swapped.
- Overlapping code spans: `codeRanges` produces `[[0,28],[0,2],[12,24],[25,27]]` (unsorted-looking but actually sorted by start: 0,0,12,25). The inline-code regex matched INSIDE the fence too (12-24, 25-27 are subspans of fence 0-28). `inAnyRange` correctly skipped `[[inside]]` at offset 13 (inside range [0,28] AND [12,24]) and healed `[[outside]]` at 29. 

Now let me probe the critical `inAnyRange` overlap/break-early concern more adversarially, plus the 512KB diagnose-vs-apply consistency, and the bang-offset boundary case.

### Assistant | 2026-06-17T17:47:14.505Z

[tool_use: Bash]

### User | 2026-06-17T17:47:18.330Z

[tool_result] ranges: [[0,4]] link at 5
heal (link NOT in code -> healed): {"text":"`ab`x[[z]]","count":1}
ranges2: [[0,4],[11,15]] link at 5
heal2 (between spans -> healed): {"text":"`ab` [[z]] `cd`","count":1}
big-file heals both occurrences (expect 2): 2

### Assistant | 2026-06-17T17:47:24.978Z

All correct. The 512KB consistency point is now clear and safe: heals are keyed by `normalizeKey(target)`, so any occurrence of that exact target (whether <512KB or >512KB) heals to the same canonical destination. There's no risk of healing a "different occurrence" wrongly — a different target with a different normKey isn't in the heal map.

Now let me probe the one genuinely subtle break-early scenario: can `inAnyRange`'s `break` skip a containing range? The ranges are sorted by start but NOT merged. The break happens when `a > pos`. Since ranges are sorted ascending by start, once a range starts after `pos`, all subsequent also start after `pos` and can't contain `pos`. But a containing range must have `start <= pos`, so it appears BEFORE the break point. This is correct. Let me construct the hardest adversarial case: a fence containing inline spans, where the inline subspan is sorted AFTER another span that starts later.

### Assistant | 2026-06-17T17:47:36.585Z

[tool_use: Bash]

### User | 2026-06-17T17:47:40.823Z

[tool_result] ranges: [[0,28],[0,2],[11,17],[25,27],[27,34]]
k1@ 4 k2@ 18 k3@ 38
heal (only k3 outside code): {"text":"```\n[[k1]] `code` [[k2]]\n``` and `xx` [[c]]","count":1}
diag healable: 1 (code occurrence not double-counted? dedup by normKey)
applied files/links: 1 1
after: "---\n---\nlive [[reference_x_2026]] but code `[[reference-x-2026]]` stays"
re-diagnose healable (expect 0 -- idempotent): 1
code occ
... [+34 chars truncated]

### Assistant | 2026-06-17T17:47:49.341Z

I found a real issue. Let me look closely at this last result:

- `diagnose` reports `healable: 1` for the note (it dedupes by normKey, so the live link and the code-embedded link with the same target collapse to one heal entry).
- `applyHeals` heals the live link, leaves the code-embedded one broken (correct surgical behavior).
- **BUT re-diagnose reports `healable: 1` again, NOT 0.** This BREAKS the idempotency guarantee.

The reason: `diagnose` does NOT skip code spans. It runs `extractWikilinks` over the whole (512KB-sliced) raw text, which still finds `[[reference-x-2026]]` inside the inline code. After healing, the live link is now `[[reference_x_2026]]` (resolves, not broken), but the code-embedded `[[reference-x-2026]]` is still broken and still HEALABLE-classified. So a second `--apply` will find it healable, `rewriteLinks` will correctly skip it (code-protected), `count===0`, no write — but `diagnose` keeps reporting it as healable forever.

This is a **non-converging diagnosis / false-positive healable count**, not data corruption. The note is never wrongly mutated. But it violates the idempotency claim the test asserts. Let me confirm the test only covers the no-code case and verify this is a genuine gap, then check whether it causes any write-side harm (e.g., a tmp file written then count===0).

### Assistant | 2026-06-17T17:47:58.374Z

[tool_use: Bash]

### User | 2026-06-17T17:48:02.272Z

[tool_result] healable (phantom -- target only in code): 1
healByNote has codeonly.md: true
applied files/links (expect 0/0): 0 0
feedback dir files (no .tmp leftover): [ 'codeonly.md' ]
note unchanged: true
re-diagnose healable (non-converging -> still 1): 1

### Assistant | 2026-06-17T17:48:08.547Z

Confirmed and bounded. The write side is clean: `applyHeals` line 228 `if (count === 0 || text === raw) continue;` correctly guards — no tmp file written, no corruption, no junk left. The harm is purely a **reporting/idempotency defect**: `diagnose` over-counts HEALABLE (counts links that live only inside code, which `applyHeals` will never touch), and the count never converges to 0 on re-runs. This is a P2 (R12 honesty: the dry-run number `12,635 healable` overstates what `--apply` can actually heal; and the idempotency test passes only because its fixture has no code-embedded links).

Let me quantify how many of the real 12,635 are this phantom class, and verify the remaining concerns (slug self-exclusion, lock gate, atomicity pid, floating promises, ASCII).

### Assistant | 2026-06-17T17:48:17.706Z

[tool_use: Bash]

### User | 2026-06-17T17:48:18.661Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 74848 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 220s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-
... [+521 chars truncated]

### Assistant | 2026-06-17T17:48:21.313Z

That's an unrelated MCP-bridge advisory, not a failure of my command — it intercepted stdout. Let me re-run.

### Assistant | 2026-06-17T17:48:25.180Z

[tool_use: Bash]

### User | 2026-06-17T17:48:34.452Z

[tool_result] diagnose.healable (reported): 12635
sum of healByNote entries: 12635
actually-rewritable links: 12642
PHANTOM (mapped but in-code, never healed): -7
notes that will NOT converge on re-diagnose: 6

### Assistant | 2026-06-17T17:48:42.102Z

Interesting and important nuance. The phantom is NEGATIVE (-7): `rewriteLinks` actually heals 7 MORE links than `diagnose` counted, and 6 notes won't converge. This reveals TWO directional inconsistencies between `diagnose` and `applyHeals`:

1. **`diagnose` dedupes by normKey per note** (line 186 `seen.has(dedupKey)`), counting each distinct target once. `rewriteLinks` heals **every occurrence** of that target. So a note with the same healable target appearing live twice → diagnose counts 1, applyHeals heals 2. That accounts for the +7 (multiple live occurrences). That direction is benign (more healing than reported — correct behavior).

2. **The 6 non-converging notes** are the code-embedded-target ones I found: diagnose counts a healable target that only/also appears in code, applyHeals skips the code copy. Re-diagnose still sees it.

So the real picture: `diagnose.healable` is an approximate count that does NOT equal the rewrite count in either direction. Let me confirm the 6 non-converging notes are exactly the code-embedded case and not something worse (e.g., a target that resolves nowhere after rewrite).

### Assistant | 2026-06-17T17:48:52.182Z

[tool_use: Bash]

### User | 2026-06-17T17:49:04.053Z

[tool_result] feedback_use_wiki_links_in_memories.md | mapped 1 healed 0 | missed keys: kienzlecoefficients
reference_u_psn_aliases_frontmatter_2026_05_23.md | mapped 1 healed 0 | missed keys: feedback-psn-definition
reference_u_db_bridge_03_ext_2026_05_26.md | mapped 1 healed 0 | missed keys: catalog-unified-query-engine
reference_u_psn_aliases_frontmatter_2026_05_23.md | mapped 1 healed 0 | missed keys: feedb
... [+265 chars truncated]

### Assistant | 2026-06-17T17:49:10.326Z

This confirms the non-convergence is real on the live vault, and reveals the missed targets are wikilinks inside code spans (these are memory/wiki notes that DOCUMENT wikilink syntax inside backticks, e.g. `feedback_use_wiki_links_in_memories.md` literally shows `[[KienzleCoefficients]]` as a code example). On these 6 notes, `--apply` heals 0 links, leaves the note byte-identical (the count===0 guard prevents any write), but `diagnose` will keep reporting them as healable on every subsequent run.

Now let me close out the remaining checklist items: slug self-exclusion (verified by test at line "no self-heal"), the pid-collision atomicity, floating promises (top-level await), ASCII-only, and `.only`/`.skip`.

### Assistant | 2026-06-17T17:49:14.650Z

[tool_use: Bash]

### User | 2026-06-17T17:49:19.032Z

[tool_result] === .only/.skip in test ===
NONE (good)
=== non-ASCII bytes in mjs ===
grep: -P supports only unibyte and UTF-8 locales
NONE (good)
=== non-ASCII bytes in test ===
grep: -P supports only unibyte and UTF-8 locales
NONE (good)
=== top-level await / floating promise ===
46:const NAV = await import(pathToFileURL("H:/prism/scripts/obsidian-vault-navigator.mjs").href);
=== pid in tmp name ===
230:    co
... [+304 chars truncated]

### Assistant | 2026-06-17T17:49:21.357Z

The grep `-P` failed on locale (not a real result). Let me verify ASCII-only properly with node, and double-check the lock-gate / pid concerns.

### Assistant | 2026-06-17T17:49:23.882Z

[tool_use: Bash]

### User | 2026-06-17T17:49:28.159Z

[tool_result] scripts/vault-link-doctor.mjs pure ASCII
scripts/vault-link-doctor.test.mjs pure ASCII

### Assistant | 2026-06-17T17:49:38.273Z

Both files pure ASCII. Now let me reason through the remaining concerns to finalize:

**Atomicity / pid collision:** `tmp = ${full}.tmp.${process.pid}` (line 230). Two concurrent doctor runs are two separate node processes → different PIDs → no tmp collision. The bigger gate is the vault-global `SYNC_LOCK` check (line 222) — but it's checked ONCE before the loop and never re-checked. There's a TOCTOU window: if the memory-sync feed acquires the lock AFTER `applyHeals` reads `lockHeld=false` but DURING the multi-thousand-file loop, the doctor keeps writing while the sync writes. But the doctor uses atomic temp+rename per file, and the sync lock is for the doctor to defer to the sync — this is a soft coordination, low severity. Also two concurrent doctor runs aren't gated against each other at all (no doctor-own lock), but rename is atomic and they'd produce identical output (idempotent target), so a race is benign. Let me confirm the lock is NOT re-checked mid-loop and note it.

One more: the `git status` showed `mcp-server/data/state/SCRUTINY_LEDGER.json` is untracked — this script isn't in the session diff per the task framing, but my job is the two named files. Let me do a final check on the `diagnose` MAX_FILE slice interacting with `extractWikilinks` truncation (a link straddling the 512KB boundary).

### Assistant | 2026-06-17T17:49:45.800Z

[tool_use: Bash]

### User | 2026-06-17T17:49:50.306Z

[tool_result] sliced ends with: "ZZZZZZZ[[str"
links found in slice (truncated link dropped): []
links in full: [ 'straddle-link' ]

### Assistant | 2026-06-17T17:50:20.963Z

The 512KB boundary straddle is safe/consistent: `diagnose` under-reports a link straddling the boundary (it's dropped from the slice), but since it never enters `healByNote`, `applyHeals` never heals it either. Conservative and consistent — no corruption, just a missed heal on >512KB notes (which is the intended "skip corpus dumps" behavior anyway).

I have everything I need. Let me finalize my verdict.

---

VERDICT: PASS

summary: The healer is genuinely safe against silent corruption — every write path is guarded (`applyHeals:228` `count===0||text===raw` skips no-op writes; atomic temp+rename; fail-soft catch; global sync-lock gate), and `diagnose`/`applyHeals` are key-consistent (both heal by `normalizeKey(target)`, so a >512KB note, a boundary straddle, or a multi-occurrence target can never heal a *wrong* target — at worst a heal is conservatively skipped). 15/15 tests pass, dry-run cleanly processes the 69,453-note vault (12,635 healable, no hang). The only real defect I found is a non-converging / over-stated HEALABLE *count* (a reporting/idempotency gap, not data damage) — P2.

findings:
- [P2] `scripts/vault-link-doctor.mjs:177-205` (diagnose) vs `:142-159` (rewriteLinks) — **Idempotency/R12 count gap: `diagnose` does NOT skip code spans, but `applyHeals` (via `rewriteLinks`) does.** A wikilink that appears only/also inside a fenced or inline code span (common in the vault's own how-to notes, e.g. `feedback_use_wiki_links_in_memories.md` shows `[[KienzleCoefficients]]` as a backtick example) is classified HEALABLE and added to `healByNote`, but `rewriteLinks` correctly refuses to touch it. Verified live: 6 notes never converge — `diagnose` reports them healable on every re-run forever, so the dry-run banner "HEALABLE 12635 … safe rewrite" over-states what `--apply` can actually heal, and the test's idempotency assertion (`r2.healable === 0`) only passes because its fixture has no code-embedded links. No corruption (the `count===0` write guard holds; no tmp
... [+3559 chars truncated]
