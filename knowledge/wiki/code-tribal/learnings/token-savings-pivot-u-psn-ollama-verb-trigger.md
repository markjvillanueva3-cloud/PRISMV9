# TOKEN-SAVINGS-PIVOT/U-PSN-OLLAMA-VERB-TRIGGER — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-OLLAMA-VERB-TRIGGER (slot:alpha iter4): verb-keyword fallback in ollama-pipeline-injector — closes the 22→30% offload gap

**Commit:** `6ddf7916afc9` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T13:37:36-05:00
**Tags:** token-savings-pivot, u-psn-ollama-verb-trigger, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-OLLAMA-VERB-TRIGGER (slot:alpha iter4): verb-keyword fallback in ollama-pipeline-injector — closes the 22→30% offload gap

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-OLLAMA-VERB-TRIGGER (slot:alpha iter4): verb-keyword fallback in ollama-pipeline-injector — closes the 22→30% offload gap

Pre-iter4 only slash-command pipelines (/forge-audit, /rgs, /scrutinize,
etc.) triggered the Ollama route injector. Bare-prose offload-eligible
prompts ("summarize this file", "explain how this works", "classify
these items", "why is this failing", etc.) got no Ollama nudge despite
CLAUDE.md §AI SYSTEM ROUTING explicitly naming those verbs as qwen2.5-
coder:7b territory. Result: offload rate stuck at 17-22%, well under the
30% doctrine target.

PSN-synergy fix — 7 verb-trigger regexes layered AFTER the existing
slash-command match. Verb-fallback only fires when no slash matched, so
existing pipelines never get duplicate nudges:

  verb-diff-summary  — "summarize the diff/changes/commit"
  verb-error-triage  — "why is this failing", "triage", "what's wrong"
  verb-docstring     — "add a docstring", "write jsdoc"
  verb-lint          — "lint check this", "style check the code"
  verb-classify      — "classify these items", "classification of"
  verb-explain       — "explain this code", "walk me through the X"
  verb-summarize     — "summarize this file", "tl;dr"

Ordering load-bearing: diff-summary precedes generic summarize so
"summarize the diff" surfaces the diff-specific route (test 9 guards
this — R7 specific-wins discipline).

Each verb-trigger emits a 1-2 line route card pointing at concrete MCP
actions (prism_intelligence:ollama_summarize, ollama_explain, etc.) and
the /ollama-bridge skill. Header tagged "Ollama offload candidate
(verb-trigger: <key>)" to distinguish from "/<pipeline> routes".

Per-file scrutiny per CLAUDE.md: NOT triggered — only 2 files, hook+test
pair, not compound-error class. End-of-task 3-of-3 Stop gate runs at
session end.

Refactor side-effect: extracted matchPipelineTrigger + matchVerbTrigger
as pure exports; IIFE main() converted to named function gated on
process.argv[1].endsWith() so the module is safely importable for tests
(without firing stdin-read on every import). PRISM_OLLAMA_VERB_INJECT=0
disables verb-trigger only; PRISM_OLLAMA_PIPELINE_INJECT=0 disables the
whole hook.

23/23 node:test pass:
  • 8 happy paths (7 spanning verbs + double-spelling 'summarise')
  • R7 specificity guard: diff-summary > summarize when both could match
  • 4 failure modes (empty, null, undefined, non-string)
  • 3 adversarial (no-verb prompts return null, no over-fire on
    "let me explain my reasoning", 5KB input bounded <100ms)
  • 4 pipeline-precedence guards (slash always wins)
  • 2 case-insensitive variants
```

## Files touched (3)
- .../ollama-pipeline-verb-trigger.test.mjs          | 152 +++++++++++++++++++++
- .claude/hooks/ollama-pipeline-injector.mjs         | 104 ++++++++++++--
- 2 files changed, 248 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- wrong"

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6ddf7916afc9`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._