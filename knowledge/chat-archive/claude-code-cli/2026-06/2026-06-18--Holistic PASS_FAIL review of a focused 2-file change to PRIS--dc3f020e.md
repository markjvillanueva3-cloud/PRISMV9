---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Holistic PASS/FAIL review of a focused 2-file change to PRISM's vault-link-docto"
date: "2026-06-18"
first_ts: "2026-06-18T04:19:45.929Z"
last_ts: "2026-06-18T04:21:24.328Z"
cwd: "H:\\prism-slot-sierra"
messages: 24
user_msgs: 9
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-afcae4bc934f8b055.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Holistic PASS/FAIL review of a focused 2-file change to PRISM's vault-link-docto

> **claude-code-cli** | 2026-06-18 | 24 msgs (9 user / 15 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-afcae4bc934f8b055.jsonl`

## Transcript

### User | 2026-06-18T04:19:45.929Z

Holistic PASS/FAIL review of a focused 2-file change to PRISM's vault-link-doctor (slot:sierra, SIERRA-VAULT-OPS/U-VAULT-LINK-DERANK). Read BOTH files end-to-end:
- H:\prism\scripts\vault-link-doctor.mjs
- H:\prism\scripts\vault-link-doctor.test.mjs

WHAT THE CHANGE DOES (the contract to verify against):
The tool classifies every broken [[wikilink]] as HEALABLE (unique slug rematch → safe auto-rewrite) / DANGLING / NON_NOTE. Previously, a broken slug matching >1 candidate note was always DANGLING+ambiguous (never auto-picked). The change adds a CANONICAL-PREFERENCE DERANK in `classifyBrokenTarget`: when >1 candidate, it drops candidates under known MIRROR/STUB subdirs (`galaxies/`, `triplet-stubs/`, `_legacy-root/` via `isMirrorStub`/`MIRROR_STUB_SUBDIR_RE`); if EXACTLY ONE canonical remains, it becomes HEALABLE→canonical (flagged `deranked:true`); otherwise it stays ambiguous DANGLING but reports the deranked (canonical-only) rival pool. A `derankedHeals` counter was added to diagnose() for honest reporting.

WHY (measured, live vault): the 169 ambiguous broken links were 74 mirror-collisions (a canonical memo + a by-design galaxy/legacy/course-stub mirror sharing a basename slug) + 95 genuine ambiguities (mostly same-dir wiki formula `x-quote.md` vs `xquote.md` slug-variants, a generator bug the derank deliberately does NOT touch). After the change: ambiguous 169→95 (verified live), healable +74 (derankedHeals:74), all 27 tests pass.

VERIFY RIGOROUSLY (grade P0/P1/P2, PASS or FAIL):
1. Correctness of the derank: does it ONLY fire when exactly 1 canonical remains? Could it ever heal to a WRONG target (a coincidental non-mirror slug-match)? Compare to the pre-existing unique-slug HEALABLE risk — is the new risk strictly bounded by the same invariant or does it introduce new wrong-heal surface?
2. `MIRROR_STUB_SUBDIR_RE` precision: segment-boundary anchoring (must match `galaxies/` as a path segment, never a prefix like `galaxiesreport/`); Windows backslash normaliz
... [+1061 chars truncated]

### Assistant | 2026-06-18T04:19:49.591Z

I'll review both files end-to-end, then verify against the contract.

### Assistant | 2026-06-18T04:19:50.509Z

[tool_use: Read]

### Assistant | 2026-06-18T04:19:50.514Z

[tool_use: Read]

### User | 2026-06-18T04:19:55.028Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/vault-link-doctor.mjs
3	//
4	// Link-graph DOCTOR for the PRISM Obsidian vault (H:/prism/knowledge): diagnose
5	// every BROKEN [[wikilink]] (an authored link whose target does not resolve to a
6	// note), CLASSIFY it, and SAFELY heal only the high-confidence tier.
7	//
8	// WHY: the vault has ~19.6K broken link instances across ~14.8K notes, which is
9	// the ro
... [+22712 chars truncated]

### User | 2026-06-18T04:19:55.035Z

[tool_result] 1	// Tests for scripts/vault-link-doctor.mjs -- the broken-wikilink classifier+healer.
2	// Pure-function units + a hermetic real-FS vault (tmp) exercising diagnose() +
3	// applyHeals() on real file IO, with mutation-proof rewrite assertions (a mass
4	// vault mutator must never corrupt a note).
5	
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	import { mkdtempSy
... [+19989 chars truncated]

### Assistant | 2026-06-18T04:19:58.736Z

Both files are read end-to-end. Let me verify the navigator contract that this change depends on — specifically `normalizeKey`, `basenameIndex` shape, and `extractWikilinks` — since the derank's correctness rests on what `basenameIndex` actually contains.

### Assistant | 2026-06-18T04:19:59.250Z

[tool_use: Read]

### User | 2026-06-18T04:20:01.648Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/obsidian-vault-navigator.mjs
3	//
4	// Filesystem-native NAVIGATION surface for the PRISM Obsidian vault
5	// (H:/prism/knowledge). Gives Claude Code (this CLI) and any PRISM chat the
6	// equivalent of every Obsidian *navigation* core-plugin -- WITHOUT needing the
7	// Obsidian GUI app running (the Local REST API at :27123 is usually DOWN in the
8	// headless fl
... [+27948 chars truncated]

### Assistant | 2026-06-18T04:20:05.878Z

I have the full contract. Let me verify the test suite actually passes and the "27 tests" / "derankedHeals:74" claims hold, and check the final-return reachability concern.

### Assistant | 2026-06-18T04:20:06.341Z

[tool_use: Bash]

### User | 2026-06-18T04:20:12.149Z

[tool_result]   ...
# Subtest: applyHeals: a per-file write error is fail-soft (other files still heal)
ok 24 - applyHeals: a per-file write error is fail-soft (other files still heal)
  ---
  duration_ms: 2.8703
  ...
# Subtest: stripCode: blanks fenced + inline code, preserves length; non-string -> ''
ok 25 - stripCode: blanks fenced + inline code, preserves length; non-string -> ''
  ---
  duration_ms: 0.102
... [+528 chars truncated]

### Assistant | 2026-06-18T04:20:17.041Z

All 27 pass, 0 skip/only. Now let me verify the live-vault claims (`derankedHeals:74`, ambiguous 169→95) since the contract asserts measured numbers, and confirm the diff matches what's described.

### Assistant | 2026-06-18T04:20:18.938Z

[tool_use: Bash]

### Assistant | 2026-06-18T04:20:19.866Z

[tool_use: Bash]

### User | 2026-06-18T04:20:30.616Z

[tool_result]   "brokenInstances": 6647,
  "healable": 154,
  "derankedHeals": 74,
  "dangling": 6493,
  "ambiguous": 95,

### User | 2026-06-18T04:20:34.330Z

[tool_result]  scripts/vault-link-doctor.mjs      |  49 +++++++++++++++---
 scripts/vault-link-doctor.test.mjs | 100 ++++++++++++++++++++++++++++++++++++-
 2 files changed, 141 insertions(+), 8 deletions(-)
---STATUS---
 M scripts/vault-link-doctor.mjs
 M scripts/vault-link-doctor.test.mjs

### Assistant | 2026-06-18T04:20:36.891Z

Live numbers confirm the contract exactly: `derankedHeals:74`, `ambiguous:95`. Let me inspect the precise diff to verify nothing else changed beyond the derank, and check the pre-change ambiguous count claim (169) via the git base.

### Assistant | 2026-06-18T04:20:37.583Z

[tool_use: Bash]

### User | 2026-06-18T04:20:40.890Z

[tool_result] diff --git a/scripts/vault-link-doctor.mjs b/scripts/vault-link-doctor.mjs
index 30e598c789..3168401a9f 100644
--- a/scripts/vault-link-doctor.mjs
+++ b/scripts/vault-link-doctor.mjs
@@ -29,8 +29,10 @@
 // Three classes per broken target:
 //   HEALABLE  -- resolves to EXACTLY ONE note by a stronger match than the
 //                navigator uses (slug-normalized basename/title/alias), high
-//  
... [+6602 chars truncated]

### Assistant | 2026-06-18T04:20:46.286Z

The diff is exactly as described — surgical, additive, no behavioral change to existing paths. Now let me verify the two subtle correctness concerns the contract raised.

**Concern A — the "unreachable" final `return { cls: "DANGLING" }`** (line 157): After `if (cands.length > 1) { ... }`, the only remaining case is `cands.length === 0` (set existed but all entries were the self-note, filtered out at line 144). That IS reachable. Let me confirm that path is exercised — test at line 69 ("self-heal") covers `set.size===1` self-filter, but I want to confirm the `cands.length===0`-after-derank fall-through.

Let me trace the new derank branch's exhaustiveness and the `cands.length===0` reachability precisely.

### Assistant | 2026-06-18T04:20:47.396Z

[tool_use: Read]

### User | 2026-06-18T04:20:48.425Z

[tool_result] 138	export function classifyBrokenTarget(target, fromRel, slugIndex) {
139	  if (isNonNote(target)) return { cls: "NON_NOTE" };
140	  const s = slugify(target);
141	  if (!s) return { cls: "DANGLING" };
142	  const set = slugIndex.get(s);
143	  if (!set || set.size === 0) return { cls: "DANGLING" };
144	  const cands = [...set].filter((r) => r !== fromRel); // exclude self
145	  if (cands.length =
... [+1016 chars truncated]

### Assistant | 2026-06-18T04:21:24.328Z

I have everything needed to render a rigorous verdict. Let me work through each contract item against the verified code.

**1. Derank correctness — bounded heal risk.** The new HEALABLE only fires at line 153 when `canonical.length === 1` (exactly one non-mirror candidate). The heal target is a real, slug-equal note (`slugify(target) === slugify(noteKey)`, line 140-142). This is the *exact same invariant* as the pre-existing unique-slug heal (line 145): "exactly one non-self slug-equal candidate." The derank does not relax the slug-equality requirement — it only removes mirror-stub duplicates from the candidate pool. A coincidental non-mirror slug-collision cannot be healed because two non-mirror canonicals → `canonical.length===2` → stays DANGLING (verified by the test at test:128 "derank removes mirror noise but KEEPS a genuine 2-canonical ambiguity"). The new wrong-heal surface is strictly: "a galaxies/triplet-stubs/_legacy-root copy that is actually the *better* target than the canonical." Given the derank only fires when the canonical is unique, the heal points to the canonical basename — which Obsidian resolves to a real note. No new unbounded risk. **Bounded by the same invariant.** PASS.

**2. `MIRROR_STUB_SUBDIR_RE` precision** (line 103). `/(^|\/)(galaxies|triplet-stubs|_legacy-root)\//` — segment-anchored on both sides: requires either start-of-string or `/` before, and a mandatory `/` after. `galaxiesreport/x.md` cannot match (no `/` after `galaxies`), verified by test:82. Windows backslashes normalized via `.replace(/\\/g,"/")` at line 107, verified by test:79. No prefix over-match. PASS.

**3. Still-ambiguous honesty** (line 154-155). When `canonical.length===0` → `pool=cands` (all mirrors), reported count = `cands.length`, surfaced pool = `cands`. When `canonical.length>1` → `pool=canonical`, count = `canonical.length`, surfaced pool = `canonical`. In both cases `candidates` (the count) exactly equals `cands`/`pool` (the surfaced array) length — diagn
... [+5006 chars truncated]
