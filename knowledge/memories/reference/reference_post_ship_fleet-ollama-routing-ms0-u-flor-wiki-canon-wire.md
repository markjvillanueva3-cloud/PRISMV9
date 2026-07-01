---
name: reference_post_ship_fleet-ollama-routing-ms0-u-flor-wiki-canon-wire
description: Auto-distilled learnings from shipping FLEET-OLLAMA-ROUTING-MS0/U-FLOR-WIKI-CANON-WIRE (commit 5ffc77fb3). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.859Z
aliases: reference_post_ship_fleet-ollama-routing-ms0-u-flor-wiki-canon-wire
---


# FLEET-OLLAMA-ROUTING-MS0/U-FLOR-WIKI-CANON-WIRE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR-WIKI-CANON-WIRE (slot:tango): flip LoRA trainingReady with REAL wiki data -- 856 -> 1138 rows. The 282-row wiki-canonical-pairs.jsonl ('wikis across all galaxies' instruction-tuning signal, producer wiki-canonical-to-training-pairs.mjs) was DORMANT: it uses the {prompt,completion} schema but the assembler's parseAlpacaJsonl only accepted {instruction,output} -> 0 consumable. Added pure normalizeAlpacaRow accepting BOTH conventions (native wins; prompt->instruction, completion->output; rejects empty) -- general robustness, any prompt/completion source now lands (R15 apply-to-all). Registered wiki-canonical-pairs as a lora-training-jsonl source (advisory weight 0.5 -- deterministically extracted, down-weighted vs hand-authored doctrine). LIVE: 856->1138 rows, 282 added 0-dedup 0-invalid, trainingReady false->TRUE (floor 1000), 34/34 galaxies. Unblocks india's GPU fine-tune with a wiki-inclusive corpus. 24/24 tests (6 new: alias-accept, native-no-regression, native-wins-precedence, reject-empty, adversarial-non-object, mixed-file).

**Shipped:** 2026-06-11T01:05:59-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[fleet-ollama-routing-ms0-u-flor-wiki-canon-wire]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._