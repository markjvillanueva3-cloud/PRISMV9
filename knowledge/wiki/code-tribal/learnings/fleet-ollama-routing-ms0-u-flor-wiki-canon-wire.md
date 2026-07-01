# FLEET-OLLAMA-ROUTING-MS0/U-FLOR-WIKI-CANON-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR-WIKI-CANON-WIRE (slot:tango): flip LoRA trainingReady with REAL wiki data -- 856 -> 1138 rows. The 282-row wiki-canonical-pairs.jsonl ('wikis across all galaxies' instruction-tuning signal, producer wiki-canonical-to-training-pairs.mjs) was DORMANT: it uses the {prompt,completion} schema but the assembler's parseAlpacaJsonl only accepted {instruction,output} -> 0 consumable. Added pure normalizeAlpacaRow accepting BOTH conventions (native wins; prompt->instruction, completion->output; rejects empty) -- general robustness, any prompt/completion source now lands (R15 apply-to-all). Registered wiki-canonical-pairs as a lora-training-jsonl source (advisory weight 0.5 -- deterministically extracted, down-weighted vs hand-authored doctrine). LIVE: 856->1138 rows, 282 added 0-dedup 0-invalid, trainingReady false->TRUE (floor 1000), 34/34 galaxies. Unblocks india's GPU fine-tune with a wiki-inclusive corpus. 24/24 tests (6 new: alias-accept, native-no-regression, native-wins-precedence, reject-empty, adversarial-non-object, mixed-file).

**Commit:** `5ffc77fb35e6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T01:05:59-05:00
**Tags:** fleet-ollama-routing-ms0, u-flor-wiki-canon-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR-WIKI-CANON-WIRE (slot:tango): flip LoRA trainingReady with REAL wiki data -- 856 -> 1138 rows. The 282-row wiki-canonical-pairs.jsonl ('wikis across all galaxies' instruction-tuning signal, producer wiki-canonical-to-training-pairs.mjs) was DORMANT: it uses the {prompt,completion} schema but the assembler's parseAlpacaJsonl only accepted {instruction,output} -> 0 consumable. Added pure normalizeAlpacaRow accepting BOTH conventions (native wins; prompt->instruction, completion->output; rejects empty) -- general robustness, any prompt/completion source now lands (R15 apply-to-all). Registered wiki-canonical-pairs as a lora-training-jsonl source (advisory weight 0.5 -- deterministically extracted, down-weighted vs hand-authored doctrine). LIVE: 856->1138 rows, 282 added 0-dedup 0-invalid, trainingReady false->TRUE (floor 1000), 34/34 galaxies. Unblocks india's GPU fine-tune with a wiki-inclusive corpus. 24/24 tests (6 new: alias-accept, native-no-regression, native-wins-precedence, reject-empty, adversarial-non-object, mixed-file).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR-WIKI-CANON-WIRE (slot:tango): flip LoRA trainingReady with REAL wiki data -- 856 -> 1138 rows. The 282-row wiki-canonical-pairs.jsonl ('wikis across all galaxies' instruction-tuning signal, producer wiki-canonical-to-training-pairs.mjs) was DORMANT: it uses the {prompt,completion} schema but the assembler's parseAlpacaJsonl only accepted {instruction,output} -> 0 consumable. Added pure normalizeAlpacaRow accepting BOTH conventions (native wins; prompt->instruction, completion->output; rejects empty) -- general robustness, any prompt/completion source now lands (R15 apply-to-all). Registered wiki-canonical-pairs as a lora-training-jsonl source (advisory weight 0.5 -- deterministically extracted, down-weighted vs hand-authored doctrine). LIVE: 856->1138 rows, 282 added 0-dedup 0-invalid, trainingReady false->TRUE (floor 1000), 34/34 galaxies. Unblocks india's GPU fine-tune with a wiki-inclusive corpus. 24/24 tests (6 new: alias-accept, native-no-regression, native-wins-precedence, reject-empty, adversarial-non-object, mixed-file).
```

## Files touched (4)
- scripts/assemble-fleet-lora-corpus.mjs            | 40 ++++++++++++++++++++++++++++++----------
- scripts/assemble-fleet-lora-corpus.test.mjs       | 54 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/build-fleet-training-corpus-inventory.mjs | 14 ++++++++++++++
- 3 files changed, 98 insertions(+), 10 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5ffc77fb35e6`
- Milestone envelope: `mcp-server/data/milestones/FLEET-OLLAMA-ROUTING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._