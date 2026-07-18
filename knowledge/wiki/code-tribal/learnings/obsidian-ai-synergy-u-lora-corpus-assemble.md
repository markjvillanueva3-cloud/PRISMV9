# OBSIDIAN-AI-SYNERGY/U-LORA-CORPUS-ASSEMBLE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-LORA-CORPUS-ASSEMBLE (slot:india): manifest-consuming fleet LoRA corpus assembler -- closes the vault->manifest->trainer dead-end

**Commit:** `85614c389459` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T08:52:15-05:00
**Tags:** obsidian-ai-synergy, u-lora-corpus-assemble, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-LORA-CORPUS-ASSEMBLE (slot:india): manifest-consuming fleet LoRA corpus assembler -- closes the vault->manifest->trainer dead-end

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-LORA-CORPUS-ASSEMBLE (slot:india): manifest-consuming fleet LoRA corpus assembler -- closes the vault->manifest->trainer dead-end

iter-3 reconnaissance proved the chain dead-ended: vault-to-lora-dataset.mjs
PRODUCED datasets and build-fleet-training-corpus-inventory.mjs REGISTERED them,
but NOTHING consumed the manifest to assemble a training set. This is that
consumer.

scripts/assemble-fleet-lora-corpus.mjs reads fleet-training-corpus-inventory.json,
unions every PRESENT kind:'lora-training-jsonl' source into ONE deduped, weighted,
staged corpus -> state/shared/lora/fleet-lora-combined.jsonl + .stats.json. Trust
weighting (R7): advisory/LLM-distilled synthesis @0.5, verified doctrine/params
@1.0; each row carries {weight,source,advisory} so a trainer never blends the two.
Staging contract mirrors export-ledger-lora.mjs: read-only assembly + a
training_ready row-floor flag (>=1000); the GPU fine-tune is the explicit
downstream operator step. Output is schema-compatible with the existing
U-LORA-MASTER-CORPUS-TRAINER splitter (JSONL -> stratified train/val), so they
compose -- assembler is NOT an orphan.

LIVE: 2 present sources -> 746 rows (245 verified @1.0 + 501 advisory @0.5), 0
dups, 0 invalid, training_ready false (746<1000; cam-master missing on this host
would clear it). 13/13 hermetic tests (injected readImpl/inventory) + live R15
scan. Pure-ASCII. Fail-loud on absent manifest (R12), fail-soft per-source read
error (no total loss).
```

## Files touched (3)
- scripts/assemble-fleet-lora-corpus.mjs      | Bin 0 -> 9309 bytes
- scripts/assemble-fleet-lora-corpus.test.mjs | 179 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 179 insertions(+)

## Lessons surfaced in commit body
- tilled synthesis @0.5, verified doctrine/params

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 85614c389459`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-AI-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._