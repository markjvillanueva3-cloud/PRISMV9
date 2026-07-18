# AI-SYSTEMS-LORA/U-LORA-WIKI-DOMAIN — [MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-WIKI-DOMAIN (slot:india): feed the curated per-domain wiki spine into LoRA

**Commit:** `29f08ee25817` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T17:01:30-05:00
**Tags:** ai-systems-lora, u-lora-wiki-domain, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-WIKI-DOMAIN (slot:india): feed the curated per-domain wiki spine into LoRA

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-WIKI-DOMAIN (slot:india): feed the curated per-domain wiki spine into LoRA

New feeder vault-wiki-to-lora-dataset.mjs turns PRISM's curated per-domain wiki
PROSE spine (knowledge/wiki/<galaxy>/*.md applied-practice/foundations/reference,
plus software-engineering/training) into advisory, galaxy-tagged Alpaca pairs --
one per LEAF section (### subsection, or ## with own prose; #### folds to parent).
LIVE: 2714 high-signal pairs across 43 domains (mill 163, software-engineering
408, wedm/lathe/cad/cam/post-proc/quoting/business/...), 0 dupes.

GAP (verified, not assumed): the 4 existing feeders never read the domain wiki --
vault-to-lora (feedback + galaxy-synthesis + ai-synergy MEMORY), vault-lessons-to
-lora (code-tribal/learnings failure->fix), wiki-canonical-to-training-pairs
(ideablock Q&A under code-tribal + architecture only). This feeder is DISJOINT: it
reads the curated domain dirs and EXCLUDES the machine-gen bulk (architecture ~36K
stubs / code-tribal / os / consensus) -- the volume-over-signal trap.

R15 WIRE: registered as vault-wiki-knowledge-lora in build-fleet-training-corpus
-inventory SOURCES (totalSources 28->29; inventory resolves rows=2714, present) ->
assemble-fleet-lora-corpus consumes it -> reaches the GPU fine-tune corpus (not an
orphan). Advisory-tagged + own dataset file + clobber-guard: never merges with the
hand-authored verified-feedback set.

Quality gates (R12, scrutiny arm-A P1 fixed): the prose-residue gate now strips
fenced code / wiki backlinks / inline-code / bare URLs before measuring (a shell
dump or a backlink wall no longer emits a junk pair), and SKIP_HEADING_RE drops
Owner-gate / References / Cross-refs / Related / Files changed / Live verification
/ Quick CLI usage footers -- removed 118 junk pairs (2832->2714); the Owner-gate
exclusion keeps owner-gated numeric/safety values out of training.

18/18 real tests (happy + 4 failure-mode + 2 adversarial + DI'd-fs walk +
collect/dedup invariants). Per-file 2-arm scrutiny PASS (arm B PASS; arm A P1
fixed + regression-tested).
```

## Files touched (4)
- scripts/build-fleet-training-corpus-inventory.mjs |  16 +++
- scripts/vault-wiki-to-lora-dataset.mjs            | 398 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/vault-wiki-to-lora-dataset.test.mjs       | 254 +++++++++++++++++++++++++++++++++++++++
- 3 files changed, 668 insertions(+)

## Lessons surfaced in commit body
- lessons-to

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 29f08ee25817`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-LORA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._