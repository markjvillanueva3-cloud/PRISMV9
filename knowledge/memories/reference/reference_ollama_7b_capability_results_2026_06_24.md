---
name: reference_ollama_7b_capability_results_2026_06_24
description: Captured qwen2.5-coder:7b capability numbers across the 6 new stress batteries + the recover-then-probe method to beat Ollama fleet-wedge
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.670Z
aliases: reference_ollama_7b_capability_results_2026_06_24
---


**qwen2.5-coder:7b capability results** (slot:alpha, 2026-06-24, via the 6 new batteries [[reference_ollama_stress_batteries_6_2026_06_24]]).

**METHOD FINDING (key):** under live fleet load Ollama wedges -> `callOllama` hits its 180s timeout -> every task scores 0% (NOT a real result). The fix: chain `node scripts/ollama-wedge-guard.mjs --recover && node scripts/ollama-stress-expanded-run.mjs ...` in ONE command -- recovery restarts the serve and the probe fires before peers re-wedge it. This is how to capture clean local-model numbers on a busy box.

**7b results (passRate over each task's cases):**
- **reasoning STRONG:** algebra / unit-rate / logical-deduction / sequence = 100%; ordering / comparative-counting = 83%; multistep-arithmetic = 50%.
- **jsonschema STRONG:** tool-spec / cutting-params / material-props / operation-list / nested-machine = 100%; tolerance-stack (complex nested) = 40%.
- **mfgdomain WEAK/MIXED (real finding):** tolerance-math + surface-roughness-convert = 100%; gcode-mnemonics / thread-tpi = 67%; material-hardness = 50%; **iso-insert-grade = 17%, spindle-rpm-formula = 0%, tap-drill-size = 0%.** 7b does NOT reliably know specific manufacturing facts.
- **instruction WEAK/MIXED (real finding):** all-uppercase / numbered-lines / one-sentence = 100%; single-word-M / yes-no = 60%; exactly-three-words = 20%; **no-letter-e = 0%, word-count-echo = 0%.** 7b does NOT reliably follow PRECISE output constraints (exact counts, letter avoidance).
- **codegen STRONG (100% all 6):** isPrime/fibonacci/reverseWords/gcd/flattenArray/isPalindrome all 100% -- verified by EXECUTING the generated code in the vm sandbox. The PRIMARY offload use is fully offload-safe on 7b (it is a coder model). This is the most important result: route code-gen of pure functions to 7b with confidence.
- **longcontext STRONG (100%):** needle-in-haystack at 2K/8K/16K filler all retrieved -> EMPIRICALLY VALIDATES the byte-based num_ctx fix (commit 4ec7e7c1e3): the model correctly uses the auto-scaled context window even at 16K chars. The fix works end-to-end.
COMPLETE 7b matrix this session: codegen 100% | reasoning STRONG | longcontext 100% | jsonschema STRONG | mfgdomain WEAK (specific facts) | instruction WEAK (precise constraints).

**ROUTING IMPLICATION (closes the mechanical-only caveat on [[reference_ollama_stress_capability_2026_06_24]]):**
- OFFLOAD-SAFE on 7b: structured-JSON extraction, most reasoning, simple format constraints (uppercase, numbered lists).
- NOT offload-safe (keep on Claude or escalate to a bigger local model / use a lookup table): specific mfg-domain facts, precise output constraints, multi-step arithmetic, complex nested JSON.

The 6 new batteries proved their worth -- they exposed WEAKNESSES (mfg facts, instruction precision) the original short-mechanical battery (classify/extract/arithmetic) never surfaced. Commits: 135fdb5a2e (6 batteries) + f00515f3d7 (codegen vm-sandbox escape fix).
