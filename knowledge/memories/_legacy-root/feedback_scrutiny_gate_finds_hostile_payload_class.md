---
name: feedback_scrutiny_gate_finds_hostile_payload_class
description: The 2-arm per-file scrutiny gate (CLAUDE.md §PER-FILE SCRUTINY GATE) has a strong track record of catching one specific bug class — hostile-payload safety on LLM-emitted JSON — that single-reviewer flow misses. Plan for it when shipping any LLM-consumer engine.
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.071Z
aliases: feedback_scrutiny_gate_finds_hostile_payload_class
---


# Per-file scrutiny gate catches the hostile-LLM-payload bug class

When an engine consumes LLM-emitted JSON (e.g. structured-output extraction), the **Arm B independent second-pass reviewer** reliably surfaces a class of bugs the first reviewer misses: parsing logic that "looks fine" on benign output but is exploitable when the model emits adversarial concatenation, unbalanced braces, or refusal text.

**Why:** Arm A focuses on the happy-path contract + convention adherence (schema completeness, Zod best practices, naming). Arm B is explicitly instructed to attack what Arm A didn't catch. With LLM-input engines the dominant unsafe surface is the parser, and Arm B is wired to find it.

**Concrete pattern from 2026-05-15 E1 ship (IdeaBlockExtractorEngine):**
- Initial `tryParseJson` used `s.slice(firstBrace, lastBrace + 1)` to extract a JSON object from LLM prose. Arm A passed it (looked fine).
- Arm B flagged: `{"blocks":[]}garbage{"blocks":[real]}` → slice yields invalid concat → parse fails → falls into repair → repair MIGHT succeed but in many cases silently drops the real blocks returning `ok:true blocks:[]` (looks identical to "no claims found").
- Fix: depth-aware brace matcher walking left-to-right, respecting strings + escapes; first parseable object with `blocks` array wins. Test added.

**How to apply:**
1. For ANY engine that calls an LLM with structured-output expectations: pre-commit to the per-file scrutiny gate. Don't rely on single-reviewer.
2. Write Arm B's prompt EXPLICITLY with "what Arm A is unlikely to catch" + name the categories: hostile-payload safety, dead-enum-value reachability, silent-fail vs surface-fail, NFC/collision invariants, security on inputs from the LLM.
3. Budget 2× reviewer-agent cost per file. Worth it for any engine on the LLM-input boundary — way cheaper than catching the hostile-payload class in production via a confused operator filing a "where did my blocks go" bug.
4. If Arm B PASSes with no findings on an LLM-consumer engine, push back — that's suspicious for this class.

Sister memo: [[feedback_parallel_scrutiny_per_file]] (the gate doctrine itself). Sister reference: [[reference_e1_ideablock_extractor_2026_05_15]] (the concrete case).


## Related
[[engines/IdeaBlockExtractorEngine|IdeaBlockExtractorEngine]] • [[skills/collision|/collision]]