---
schema_version: 1.0.0
kind: consensus_run
prompt_hash: d9adcac04ad8918204b5f7df1fd0977e7b18e5e9869b07346f7c244960cbb76d
sha8: d9adcac0
ts: 2026-06-10T08:44:33.934Z
task_type: auto-userprompt
source_session: b5de5424-ef1f-447a-a3f1-e5a8ce2cad24
mode: compare
recommendation: escalate
agreement_score: 0.058
success_count: 2
total_latency_ms: 18645
model_voters: ["qwen2.5-coder:32b"]
mean_factuality: null
tags: [consensus, auto-userprompt, escalate]
---

# Consensus Run `d9adcac0`

**Recommendation:** `escalate` · **Agreement:** `0.058` · **Voters:** `qwen2.5-coder:32b`

## Prompt

```
<task-notification>
<task-id>wd8rguas8</task-id>
<tool-use-id>toolu_01TpuLyi7jptFcu7hiHB7cXT</tool-use-id>
<output-file>C:\Users\wompu\AppData\Local\Temp\claude\H--prism\5648b928-57ba-41f8-8cc6-1b6fb8dfee9f\tasks\wd8rguas8.output</output-file>
<status>completed</status>
<summary>Dynamic workflow "Exhaustive fleet-wide discovery + classification of stale Ollama-model and host-spec drift in LIVE docs (slash commands, galaxy docs, gsd/wiki, scripts, doctrine memories) for papa to verify+apply" completed</summary>
<result>{"synthesis":"This is the decisive evidence. The live scrutiny script at line 151 already uses `qwen2.5-coder:32b` as the preflight default — the `deepseek-r1:14b` at line 152 is only a stale code comment fragment (\"deepseek-r1 reasoning takes time\"). The `feedback_scrutiny_3of3_readonly.md:25` doctrine line is genuine live drift: it tells an operator the preflight model is `deepseek-r1:14b` when the actual default is `qwen2.5-coder:32b`.\n\nI now have everything verified. Producing the synthesis.\n\n## CONFIRMED FIXES (deduped, adversarially verified)\n\nHIGH | .claude/helpers/fleet-reaper-host-presets.mjs:39 | OLD: room for a 7B resident model and 90% mem floor | NEW: room for a 32B resident model and 90% mem floor | runtime preset description contradicts the live model value on line 40 (`qwen2.5-coder:32b`); operator reading the preset registry sees the wrong resident-model size\nHIGH | .claude/helpers/fleet-reaper-host-presets.mjs:63 | OLD: tighter RAM — 3B resident, 85% mem floor | NEW: tighter RAM — 32B resident, 85% mem floor | same: line 64 actual value is `qwen2.5-coder:32b`; \"3B resident\" is retired and contradicts live code\nMED | .claude/commands/ask-local.md:21 | OLD: `qwen2.5-coder:3b` | NEW: `qwen2.5-coder:32b` | live skill doc names retired :3b as the local offload model an operator will pull/run\nMED | .claude/commands/autopilot.md:98 | OLD: Ollama: codellama/deepseek | NEW: Ollama: qwen2.5-coder:32b | codellama + deepseek-coder retired 2026-06-04; live routing table\nMED | .claude/commands/autopilot-full.md:76 | OLD: Ollama local `qwen2.5-coder:7b` | NEW: Ollama local `qwen2.5-coder:32b` | retired :7b in live offload routing table\nMED | .claude/commands/autopilot-full.md:122 | OLD: to local `qwen2.5-coder:7b` (NOT Claude) | NEW: to local `qwen2.5-coder:32b` (NOT Claude) | retired :7b in live offload doctrine line\nMED | .claude/commands/forge.md:97 | OLD: Ollama: codellama/deepseek | NEW: Ollama: qwen2.5-coder:32b | codellama + deepseek-coder retired; live routing table\nMED | .claude/commands/forge2.md:165 | OLD: qwen2.5-coder:14b for ai_feature/code_explain, qwen2.5-coder:7b for grep_index/mcp_route | NEW: qwen2.5-coder:32b for ai_feature/code_explain, qwen2.5-coder:1.5b for grep_index/mcp_route | retired :14b + :7b in live prewarm config\nMED | .claude/commands/forge2.md:261 | OLD: qwen2.5-coder:14b for code, deepseek-r1:14b for reasoning | NEW: qwen2.5-coder:32b for code, gpt-oss:120b for reasoning | retired :14b + deepseek-r1:14b in live model list\nMED | .claude/commands/local-health.md:13 | OLD: Is qwen2.5-coder:7b loaded/available? | NEW: Is qwen2.5-coder:32b loaded/available? | live health-probe checks for a retired model — would falsely report \"preferred model missing\"\nMED | .claude/commands/local-health.md:50 | OLD: ollama pull qwen2.5-coder:7b | NEW: ollama pull qwen2.5-coder:32b | live remediation step pulls a retired model\nMED | .claude/commands/fleet-reaper-home.md:3 | OLD: home: RTX 4080-class 16GB → qwen2.5-coder:7b resident, 2GB GPU floor | NEW: home: RTX 4080-class 16GB → qwen2.5-coder:1.5b resident, 2GB GPU floor | :7b retired (keep the 4080 home-tier label — it is a documented preset class, not this host; see DEMOTED note on home-tier hardware)\nMED | .claude/commands/fleet-reaper-home.md:84 | OLD: home (qwen2.5-coder:7b | NEW: home (qwen2.5-coder:1.5b | retired :7b in live tier-model description\nMED | .claude/commands/fleet-reaper-home.md:118 | OLD: qwen2.5-coder:32b on blackwell, qwen2.5-coder:7b on home | NEW: qwen2.5-coder:32b on blackwell, qwen2.5-coder:1.5b on home | retired :7b in live tier-model line\nMED | .claude/commands/fleet-reaper-home.md:154 | OLD: | qwen2.5-coder:32b | qwen2.5-coder:7b | resident model sized to VRAM | NEW: | qwen2.5-coder:32b | qwen2.5-coder:1.5b | resident model sized to VRAM | retired :7b in live knob default table\nMED | .claude/commands/fleet-reaper-work.md:3 | OLD: qwen2.5-coder:3b resident | NEW: qwen2.5-coder:1.5b resident | retired :3b in live work-preset description\nMED | .claude/commands/fleet-reaper-work.md:104 | OLD: typically qwen2.5-coder:3b | NEW: typically qwen2.5-coder:1.5b | retired :3b in live work-tier doc\nMED | .claude/commands/fleet-reaper-work.md:144 | OLD: | qwen2.5-coder:3b | fits comfortably in ~8GB VRAM | NEW: | qwen2.5-coder:1.5b | fits comfortably in ~8GB VRAM | retired :3b in live knob default table\nMED | .claude/commands/COMMANDS_DIGEST.md:260 | OLD: home 16GB → qwen2.5-coder:7b | NEW: home 16GB → qwen2.5-coder:1.5b | auto-generated digest inheriting fleet-reaper-home :7b retirement (regenerate from source preferred, but the stale string is operator-facing now)\nMED | .claude/commands/COMMANDS_DIGEST.md:261 | OLD: qwen2.5-coder:3b re… | NEW: qwen2.5-coder:1.5b re… | auto-generated digest inheriting fleet-reaper-work :3b retirement\nMED | mcp-server/src/engines/fleet-hygiene/CLAUDE.md:48 | OLD: 128GB / RTX 4080S, usually &lt;55% mem | NEW: 128GB / RTX PRO 6000 Blackwell, usually &lt;55% mem | stale host hardware; 4080S retired 2026-06-04, this is THIS box (canonical = RTX PRO 6000 Blackwell). Bibryam-cascade galaxy sentinel — operator-facing\nMED | mcp-server/src/engines/fleet-hygiene/MEMORY.md:114 | OLD: 128GB RAM / RTX 4080S 16GB | NEW: 128GB RAM / RTX PRO 6000 Blackwell 96GB | stale host hardware spec for THIS box; 16GB → 96GB VRAM\nMED | knowledge/memories/feedback/feedback_scrutiny_3of3_readonly.md:25 | OLD: The optional Ollama pre-flight (deepseek-r1:14b) | NEW: The optional Ollama pre-flight (qwen2.5-coder:32b) | live doctrine names retired deepseek-r1:14b; the actual script default (`scrutiny-3way.mjs:151`) is already `qwen2.5-coder:32b` — doc contradicts live runtime\nLOW | .claude/helpers/commit-reviewer-dispatch.mjs:30 | OLD: qwen2.5-coder:7b classifies | NEW: qwen2.5-coder:32b classifies | stale code comment naming retired model (verify the runtime model var separately before any behavior claim)\nLOW | .claude/helpers/commit-reviewer-dispatch.mjs:548 | OLD: Asks qwen2.5-coder:7b for {severity, confidence, | NEW: Asks qwen2.5-coder:32b for {severity, confidence, | stale docstring naming retired model\nLOW | .claude/helpers/prism-awareness-bundle.mjs:30 | OLD: '{model:\"deepseek-r1:14b\", system:$sys, prompt:$p, stream:false}' | NEW: '{model:\"gpt-oss:120b\", system:$sys, prompt:$p, stream:false}' | example curl in a header comment names retired reasoning model (it is an `e.g.` curl, but the model id is the single load-bearing token and is retired → fix the id, keep the example)\nLOW | .claude/helpers/prompt-rewrite-test.mjs:76 | OLD: ollama pull qwen2.5-coder:7b | NEW: ollama pull qwen2.5-coder:32b | probe-output suggestion string names retired model in a pull hint\n\n## DEMOTED (proposed FIX -&gt; actually LEAVE)\n\nknowledge/memories/patterns/backend-helper_synthesis.md:31 | LEAVE — auto-synth provenance. Header is `[auto-synth · verify]`, `advisoryOnly:true`, `synthesizedAt: 2026-06-09`, `synthesizedFrom: 9`. Per the synthesis-self-heal rule, this file regenerates from source memories; editing the synthesized output is wrong-layer. Moreover the file ALREADY self-corrects: line 34 (\"Cascade defaults lagging behind hardware — default cascade actions still reference retired small-GPU models; they must be overridden for the 96 GB Blackwell environment\") and line 59 acknowledge the retirement. The `:14b` cite is a stale-source artifact that will drop on next synth, not live operator doctrine.\nknowledge/memories/patterns/backend-helper_synthesis.md:56 | LEAVE — same auto-synth provenance file; same self-correcting context (lines 34/59/72). Fix at source memory `reference_local_llm_routing` if anywhe...[truncated]
```

## Consensus answer

```
The task is completed with a detailed synthesis of confirmed fixes and demoted items, ensuring alignment between documentation and live code/models.
```

## Per-model responses

### qwen2.5-coder:32b (ollama) — ok

- latency: 9234ms · tokens: n/a

```
The task is completed with a detailed synthesis of confirmed fixes and demoted items, ensuring alignment between documentation and live code/models.
```

### gpt-oss:20b (ollama) — ok

- latency: 8793ms · tokens: n/a

```
**Key take‑aways**

| Severity | File / Line | Old | New |
|----------|-------------|-----|-----|
| **HIGH** | `.claude/helpers/fleet-reaper-host-presets.mjs` (39, 63) | 7 B/3 B resident models | 32 B resident model |
| | `feedback_scrutiny_3of3_readonly.md:25` | deepseek‑r1:14b | qwen2.5‑coder:32b |
| **MED** | Multiple command docs (`ask-local`, `autopilot*`, `forge*`, `local-health`, `fleet-reaper-*`) | :7 B / :3 B models, deepseek‑r1 | 32 B or 1.5 B models, qwen2.5‑coder |
| **MED** | `mcp-server/src/engines/fleet-hygiene/*` | RTX 4080S specs | RTX PRO 6000 Blackwell (96 GB VRAM) |
| **LOW** | Helper scripts (`commit-reviewer-dispatch`, `prism-awareness-bundle`, `prompt-rewrite-test`) | references to retired models | updated to 32 B / gpt‑oss:120b |

**Demoted items – leave untouched**

* Auto‑synth provenance files (`backend-helper_synthesis.md` etc.) – they self‑correct on next synth and editing them is a wrong layer.

---

### Next steps

1. **Re‑run the PRISM synthesis** to ensure all source memories are regenerated with the updated model names.
2. **Verify operator‑facing docs** (e.g., `COMMANDS_DIGEST.md`) – regenerate if they still reference retired models.
3. **Run a quick health check** on a host to confirm that `qwen2.5-coder:32b` is loaded and the “preferred model missing” flag no longer triggers.

Once those checks pass, the fleet‑wide documentation and runtime configuration are fully aligned with the current hardware and model inventory.
```

## Backlinks

- task_type: [[task-type-auto-userprompt]]
- recommendation: [[consensus-escalate]]
- voter: [[model-qwen2-5-coder-32b]]
