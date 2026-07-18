---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Regression/silent-breakage review of PRISM SIERRA-VAULT-OPS/U-VAULT-LINK-SEPVARI"
date: "2026-06-18"
first_ts: "2026-06-18T10:08:55.405Z"
last_ts: "2026-06-18T10:11:26.070Z"
cwd: "H:\\prism-slot-sierra"
messages: 34
user_msgs: 12
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-ab8f5e1ab698a0c95.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Regression/silent-breakage review of PRISM SIERRA-VAULT-OPS/U-VAULT-LINK-SEPVARI

> **claude-code-cli** | 2026-06-18 | 34 msgs (12 user / 22 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-ab8f5e1ab698a0c95.jsonl`

## Transcript

### User | 2026-06-18T10:08:55.405Z

Regression/silent-breakage review of PRISM SIERRA-VAULT-OPS/U-VAULT-LINK-SEPVARIANT. Read both files end-to-end:

1. H:/prism/scripts/vault-link-doctor.mjs (new `preferKebabVariant` helper + a branch in `classifyBrokenTarget` + docstring/summary-line updates)
2. H:/prism/scripts/vault-link-doctor.test.mjs (1 updated test + 2 new tests)

WHAT CHANGED + WHY: The vault link-doctor heals broken `[[wikilinks]]` by slug. When a slug matches >1 candidate it's ambiguous (never auto-healed). The existing mirror/stub derank drops `galaxies/|triplet-stubs/|_legacy-root/` copies. This adds a SECOND derank: a generated-wiki collision where the same logical note exists in the SAME directory under two basenames differing ONLY by separator placement (e.g. `formula-...-additive-quote.md` vs `...-additivequote.md` -- both slugify identically). `preferKebabVariant` returns the unique most-separated candidate IFF all candidates share dir AND separator-stripped basename; else null. The branch runs AFTER the mirror derank, only when >1 canonical remains. EVIDENCE: all 80 such live pairs were verified (both files exist, the kebab/more-separated form is the larger/canonical one). LIVE RESULT: ambiguous broken links dropped 95->15; 29/29 tests pass.

VERIFY (cite file:line):
- SAFETY: `preferKebabVariant` returns null (stays ambiguous, never auto-picks) for: cross-dir/category dups (same basename, different dir), genuinely different notes, and ties at the max separator count. Confirm it can NEVER return a candidate that isn't a true same-dir separator-variant of the others. Could it ever heal a link to the WRONG file?
- The branch placement: it runs only inside `cands.length > 1` after `canonical.length === 1` already returned. Confirm it does not change the existing mirror-derank behavior, the single-candidate path, or the all-mirror (empty canonical) path.
- `sepCount` counts `[-_]`; `sepNorm` strips `[-_\s]`. Edge: a basename with spaces, a `.MD` uppercase ext, windows backslashes (the n
... [+574 chars truncated]

### Assistant | 2026-06-18T10:08:58.262Z

I'll review both files end-to-end, focusing on silent breakage and the "heals to the wrong file" risk.

### Assistant | 2026-06-18T10:08:58.742Z

[tool_use: Read]

### Assistant | 2026-06-18T10:08:58.933Z

[tool_use: Read]

### User | 2026-06-18T10:08:59.797Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/vault-link-doctor.mjs
3	//
4	// Link-graph DOCTOR for the PRISM Obsidian vault (H:/prism/knowledge): diagnose
5	// every BROKEN [[wikilink]] (an authored link whose target does not resolve to a
6	// note), CLASSIFY it, and SAFELY heal only the high-confidence tier.
7	//
8	// WHY: the vault has ~19.6K broken link instances across ~14.8K notes, which is
9	// the ro
... [+25187 chars truncated]

### User | 2026-06-18T10:09:00.663Z

[tool_result] 1	// Tests for scripts/vault-link-doctor.mjs -- the broken-wikilink classifier+healer.
2	// Pure-function units + a hermetic real-FS vault (tmp) exercising diagnose() +
3	// applyHeals() on real file IO, with mutation-proof rewrite assertions (a mass
4	// vault mutator must never corrupt a note).
5	
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	import { mkdtempSy
... [+22012 chars truncated]

### Assistant | 2026-06-18T10:09:05.521Z

Both files read end-to-end. Let me trace the load-bearing claim: that `preferKebabVariant` can NEVER return a candidate that isn't a true same-dir separator-variant, and check `extractWikilinks`/`normalizeKey` behavior since the heal target shape depends on them.

### Assistant | 2026-06-18T10:09:05.614Z

[tool_use: Read]

### User | 2026-06-18T10:09:06.731Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/obsidian-vault-navigator.mjs
3	//
4	// Filesystem-native NAVIGATION surface for the PRISM Obsidian vault
5	// (H:/prism/knowledge). Gives Claude Code (this CLI) and any PRISM chat the
6	// equivalent of every Obsidian *navigation* core-plugin -- WITHOUT needing the
7	// Obsidian GUI app running (the Local REST API at :27123 is usually DOWN in the
8	// headless fl
... [+27948 chars truncated]

### Assistant | 2026-06-18T10:09:11.182Z

I now have the full picture. Let me trace the critical adversarial paths in `preferKebabVariant` and the heal-to-wrong-file risk, plus verify the test mappings against `rewriteLinks` behavior.

Let me run the test suite to confirm the claimed 29/29 and check the `slugify`/`normalizeKey` interaction on the live edge cases.

### Assistant | 2026-06-18T10:09:11.848Z

[tool_use: Bash]

### User | 2026-06-18T10:09:15.497Z

[tool_result]   ...
# Subtest: diagnose: a broken link ONLY inside code is NOT HEALABLE (converges with apply)
ok 28 - diagnose: a broken link ONLY inside code is NOT HEALABLE (converges with apply)
  ---
  duration_ms: 2.6829
  ...
# Subtest: applyHeals: backupDir snapshots the ORIGINAL before mutating (reversibility)
ok 29 - applyHeals: backupDir snapshots the ORIGINAL before mutating (reversibility)
  ---
  
... [+129 chars truncated]

### Assistant | 2026-06-18T10:09:20.315Z

29/29 pass confirmed. Now let me adversarially probe `preferKebabVariant` edge cases and the heal-target shape concern. The key risk: `rewriteLinks` rewrites the link to `path.basename(to)` (the new basename) — but if the two separator-variant basenames slugify identically, does rewriting to the kebab basename actually un-break the link, or could it still resolve back to the wrong file via the navigator?

### Assistant | 2026-06-18T10:09:28.895Z

[tool_use: Bash]

### User | 2026-06-18T10:09:32.562Z

[tool_result] dot-in-basename              -> "wiki/f/v1.2-quote.md"  slugsEqual: true
uppercase .MD                -> "wiki/f/a-b-c.MD"  slugsEqual: true
win backslash                -> null  slugsEqual: true
spaces-vs-dash same dir      -> "wiki/f/a-b-quote.md"  slugsEqual: true
foo-bar vs foobar            -> "wiki/f/foo-bar.md"  slugsEqual: true
leading/trailing dash        -> "wiki/f/-a-b-.md"  slugsEqual:
... [+115 chars truncated]

### Assistant | 2026-06-18T10:09:35.756Z

Two findings surface here. Let me dig into both: the windows-backslash returning null, and the root-no-dir returning null.

### Assistant | 2026-06-18T10:09:40.971Z

[tool_use: Bash]

### User | 2026-06-18T10:09:43.703Z

[tool_result] Exit code 1
file:///H:/prism/[eval1]:6
const norm = (x) => String(x).replace(/\/g, "/");
                                      ^^^^^^^^

SyntaxError: missing ) after argument list
    at compileSourceTextModule (node:internal/modules/esm/utils:338:16)
    at ModuleLoader.eval (node:internal/modules/esm/loader:212:18)
    at node:internal/process/execution:68:24
    at asyncRunEntryPointWit
... [+265 chars truncated]

### Assistant | 2026-06-18T10:09:45.352Z

Shell escaping mangled the backslashes. Let me use a temp file instead.

### Assistant | 2026-06-18T10:09:49.885Z

[tool_use: Bash]

### User | 2026-06-18T10:09:52.680Z

[tool_result] Exit code 1
file:///C:/Users/wompu/AppData/Local/Temp/probe.mjs:3
const norm = (x) => String(x).replace(/\/g, "/");
                                      ^^^^^^^^

SyntaxError: missing ) after argument list
    at compileSourceTextModule (node:internal/modules/esm/utils:338:16)
    at ModuleLoader.moduleStrategy (node:internal/modules/esm/translators:102:18)
    at #translate (node:internal
... [+203 chars truncated]

### Assistant | 2026-06-18T10:09:55.324Z

The heredoc still routed through a path that ate the backslashes (temp lives on C:). Let me write the probe to a repo-local file with the Write tool to avoid shell/heredoc mangling.

### Assistant | 2026-06-18T10:09:58.974Z

[tool_use: Bash]

### User | 2026-06-18T10:10:02.924Z

[tool_result] ---- WIN BACKSLASH ----
base: wiki\f\a-b-quote sepCount: 2
base: wiki\f\a-bquote sepCount: 1
result: wiki\f\a-b-quote.md
---- ROOT NO-DIR ----
result: null

### Assistant | 2026-06-18T10:10:10.589Z

That clarifies it: my earlier probe had its own backslash-mangling bug, not the function. The real `preferKebabVariant` **does** handle windows backslashes correctly (norm converts them). The "null" I saw earlier was an artifact of my broken probe string. Good — the docstring claim that `norm()` handles `\\` is verified true.

Now the genuinely important findings:

1. **Root-dir case returns null** — `dirOf("a-b-quote.md")` → `"a-b-quote.md".replace(/\/[^/]*$/, "")` = `"a-b-quote.md"` (no slash to strip, returns whole string), while `dirOf("a-bquote.md")` = `"a-bquote.md"`. These differ, so `dirOf(r)===d0` fails → null. This is **safe-but-conservative**: a root-level pair never heals. The vault notes are always under subdirs, so this is irrelevant in practice but correctly fails closed.

Now the central adversarial question — **does healing to the kebab basename actually un-break the link, or does it stay broken (non-convergent) or worse, resolve to the wrong file?** Let me verify against the real navigator resolution, since both basenames slugify identically but `rewriteLinks` writes the literal kebab basename.

### Assistant | 2026-06-18T10:10:19.330Z

[tool_use: Bash]

### User | 2026-06-18T10:10:22.729Z

[tool_result] healable: 1 derankedHeals: 1 ambiguous: 0
heal target: wiki/formulas/formula-x-additive-quote.md
after rewrite: "[[formula-x-additive-quote]]"
re-diagnose healable: 0 brokenInstances: 0

### Assistant | 2026-06-18T10:10:29.625Z

End-to-end convergence confirmed: the link is rewritten to the exact kebab basename `[[formula-x-additive-quote]]`, which the navigator then resolves directly (0 broken, 0 healable on re-diagnose). The heal is convergent and lands on the kebab file, not the variant.

Now the most important adversarial probe — **the "heals to wrong file" scenario**. The claim is `preferKebabVariant` only fires when candidates are same-dir AND same sepNorm basename. But there's a subtle case: what if a slug collides across THREE files — two genuine sep-variants of note A plus an unrelated note B in the same dir that happens to slugify the same? Let me also test the cross-dir mirror interaction and whether `isMirrorStub` deranking could leave a poisoned canonical set.

### Assistant | 2026-06-18T10:10:41.484Z

[tool_use: Bash]

### User | 2026-06-18T10:10:44.894Z

[tool_result] A (one differs in sepNorm): null
B (3-way all sepNorm-equal, unique max): wiki/f/a-b-c.md
C classify: HEALABLE wiki/f/formula-x-quote.md
D (picks by sepCount, blind to size): wiki/f/big-stub-quote.md

### Assistant | 2026-06-18T10:10:54.867Z

All safety guards confirmed. Case A correctly returns null when one candidate has a different sepNorm (the genuine-different-note guard works). Case C confirms the link's slug always equals the candidate slug (it can never heal to a file with an unrelated slug). 

The one residual observation is Case D: the selection is by `sepCount`, **blind to file size/content**. The code trusts the documented invariant "kebab/more-separated = the larger canonical file" which was verified live over all 80 pairs (2026-06-18). This is a data assumption, not a code-enforced guarantee. But it is bounded and reversible — let me confirm the reversibility path holds (backup-before-mutate) and that both files surviving means even a wrong pick is recoverable, and that the link merely points to a different-but-real same-logical-note file.

Let me do a final check on the one thing that would make this a P1: whether `preferKebabVariant`'s winner could ever be a file that is NOT in the original candidate set (it returns from `cands.filter(...)`, so it's always a member — safe), and confirm the branch placement doesn't perturb the existing deranked single-canonical path.

### Assistant | 2026-06-18T10:10:55.891Z

[tool_use: Read]

### User | 2026-06-18T10:10:56.942Z

[tool_result] 178	  if (cands.length === 1) return { cls: "HEALABLE", to: cands[0], candidates: 1 };
179	  if (cands.length > 1) {
180	    // CANONICAL-PREFERENCE DERANK: a slug that collides ONLY because a known mirror/stub
181	    // copy (galaxies/, triplet-stubs/, _legacy-root/) shares it is not a genuine ambiguity --
182	    // drop the mirror copies and prefer the canonical. If EXACTLY ONE canonical remai
... [+1025 chars truncated]

### Assistant | 2026-06-18T10:11:26.070Z

Branch placement fully verified. The control flow is:

- `cands.length === 1` → returns at line 178 (single-candidate path **untouched**).
- `canonical.length === 1` → returns at line 186 (existing mirror-derank path **untouched**; new code is strictly after).
- `canonical.length > 1` → the NEW branch (189-192) runs; on null it falls through to the unchanged ambiguous path (193-194).
- `canonical.length === 0` (all-mirror) → skips both `=== 1` and `> 1`, falls to line 193 with `pool = cands` (all-mirror empty-canonical path **untouched**).

The new branch is purely additive and only intercepts a case that was previously DANGLING-ambiguous. `preferKebabVariant` returns a member of `cands` or null — it can never fabricate a target. The 80 pairs move from ambiguous → HEALABLE; reversibility is guaranteed by the backup-before-mutate in `applyHeals` (line 358-362, CLI always passes a `backupDir`).

I have everything needed for the verdict.

---

VERDICT: PASS

summary: The separator-variant collapse is correctly additive — it intercepts only the previously-DANGLING `canonical.length > 1` case and is unreachable for the single-candidate, single-canonical-derank, and all-mirror paths, all of which return before or fall through unchanged (verified by control-flow trace at vault-link-doctor.mjs:178-194 and by the 29/29 passing tests). `preferKebabVariant` can never heal to a wrong file in the slug sense: every candidate already shares the link's slug (it came from `slugIndex.get(s)`), the winner is always a member of the input `cands` (it returns from `cands.filter(...)`), and the same-dir + same-sepNorm `every()` guard (line 136) rejects cross-dir dups, genuine different-notes, and sepNorm-mismatched 3rd files, while the `winners.length === 1` guard (line 140) returns null on ties. End-to-end I confirmed the heal is convergent (rewrites to the exact kebab basename, which the navigator then resolves to 0 broken / 0 healable on re-diagnose) and reversible (backup-before-mutat
... [+2931 chars truncated]
