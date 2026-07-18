---
name: wiki-index-entries-must-use-em-dash-separator-or-wiki-precheck-silently-skips-them
description: "A new entry appended to knowledge/wiki/index.md is SILENTLY SKIPPED by the wiki-precheck-inject injector unless the separator after [[name]] is an EM-DASH (U+2014), not an ASCII hyphen. The parser regex at wiki-precheck-inject.mjs:129 is /^- \\[\\[name\\]\\]\\s*<EMDASH>\\s*(desc).../ -- a ' - ' entry fails the match and is dropped, so it never surfaces on keyword match even though it is physically present in the index. Verify auto-invoke with a LIVE injector run, not by checking the entry exists."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.454Z
aliases: feedback_wiki_index_entries_need_emdash_separator
---


**Operator/fleet lesson (caught 2026-06-09, slot papa, GALAXY-ENRICH; R15 behavioral validation).**

Registering a wiki entry for auto-invoke (so `wiki-precheck-inject.mjs` surfaces it on a UserPromptSubmit keyword match) requires the entry line in `knowledge/wiki/index.md` to match the parser regex exactly:

```
/^- \[\[([^\]]+)\]\]\s*—\s*(.+?)(?:\s*\|\s*category:([\w-]+))?(?:\s*\|.*?source:([^\s|]+))?\s*$/
```

The separator between `[[name]]` and the description **MUST be an EM-DASH (U+2014, the `—` in the regex)** -- an ASCII hyphen ` - ` fails the match and the entry is **silently skipped** (`if (!m) continue;`). The description tokens are what the BM25 scorer ranks on (`tokenize(name + " " + desc)`), so a skipped entry never surfaces even when the prompt strongly matches its keywords.

**The trap:** appending the entry makes `grep -c foundations knowledge/wiki/index.md` report it present -- "looks fine". But it does NOT auto-invoke. I shipped 14 foundations entries with ` - ` (because the generating `.mjs` is ascii-guarded and can't carry a literal em-dash), confirmed they were "in the index", and claimed "auto-invoked across 3 paths". A LIVE injector run proved all 14 were invisible.

**How to apply:**
- **Generating index entries from a `.mjs` script** (ascii-guarded): emit the em-dash via `String.fromCharCode(0x2014)`, NOT a literal `-`. Source stays ascii-clean; output markdown carries the char the parser needs.
- **Match the existing entry shape exactly:** `- [[slug]] <EMDASH> <description with keywords> | category:X | ... | source:path`. Description carries the BM25 keywords; no `|` inside the description (it ends the desc capture).
- **VALIDATE auto-invoke behaviorally (R15), never structurally:** `echo '{"prompt":"<domain keywords>"}' | portable-node .claude/hooks/wiki-precheck-inject.mjs` and confirm the entry appears in `additionalContext`. Clear the `/tmp` corpus cache (keyed on index.md mtime) if a fresh edit doesn't show up. "Entry exists in the file" != "entry auto-invokes".
- This is the same recurring class as [[reference_wiki_recall_index_stale_2026_05_18]] (new wikis absent from the recall index). When you add ANY wiki entry for recall, live-test it.

Fix shipped: `scripts/register-foundations-in-wiki-index.mjs` re-emits em-dash-delimited + self-corrects its prior malformed block (commit `8b2394bf1a`). Live-validated: GD&T/Cpk/ADDIE queries now surface the matching foundations #1.

Related: [[reference_wiki_recall_index_stale_2026_05_18]] - [[reference_galaxy_enrichment_program_2026_06_09]] - [[feedback_always_update_wiki_on_bug_finding]].
