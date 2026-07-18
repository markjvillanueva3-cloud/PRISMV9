# OBSIDIAN-AI-SYNERGY/U-TRIBAL-BLOB-READERS-SHARD-AWARE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-TRIBAL-BLOB-READERS-SHARD-AWARE (slot:india): hm-extraction HM-count read -> per-entry streamTribalEntries

**Commit:** `9dc88c59d6ea` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T15:25:05-05:00
**Tags:** obsidian-ai-synergy, u-tribal-blob-readers-shard-aware, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-TRIBAL-BLOB-READERS-SHARD-AWARE (slot:india): hm-extraction HM-count read -> per-entry streamTribalEntries

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-TRIBAL-BLOB-READERS-SHARD-AWARE (slot:india): hm-extraction HM-count read -> per-entry streamTribalEntries

Read the deleted monolith as a whole-file blob + ran 2 regexes on it (ENOENT now; the 503MB shards also exceed V8's 512MiB string cap, so a whole-blob read is impossible). Fixed: streamTribalEntries + the SAME 2 regexes applied to each entry's compact JSON -- per-entry counts SUM to the identical whole-blob total, O(1)-heap. LIVE default-heap: streams all 35000 entries; embed_index_hm_count honestly 0 -- the doc-hypermill source bucket is ABSENT from the current wiki/external shards (852 entries MENTION hypermill but 0 carry source:doc-hypermill / a source_file field; lost in the clobber = a re-embed concern, NOT a read bug). The OLD code CRASH-returned 0; this returns an honest, re-countable 0. Companion: audit-mill-psn-coverage.mjs _tribalBlob -> a streamed lightweight searchable blob (drops embeddings, ~10-30MB; .includes(engine) byte-preserved) live-validated 103/106 mill engines tribal-cited (was 0) -- applied on disk but UNTRACKED peer WIP, not committed here (task #14). node --check clean.
```

## Files touched (2)
- scripts/hm-extraction-coverage.mjs | 21 +++++++++++++++++----
- 1 file changed, 17 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9dc88c59d6ea`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-AI-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._