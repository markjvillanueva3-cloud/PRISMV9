# Galaxy SOUL.md + CLAUDE.md Quality Audit

> Graded on the LOCAL Blackwell GPU via ollama-fanout (model `qwen2.5-coder:32b`, concurrency 3, peak 3). ZERO Claude API -- no org rate-limit, no sibling-session starvation. 34/34 graded.

**Fleet mean:** soulGrade 0.804 | claudeGrade 0.819 | stub souls 3 | stub CLAUDE.md 8 | incoherent 2 | parse-failed 0

## Worst souls (bottom 10 by soulGrade)
| galaxy | soul | claude | verdict |
|---|---|---|---|
| business | 0.6 | 0.7 | Refuses are clear but lacks substantive body. |
| frontend-app | 0.6 | 0.8 | Role mismatch, unclear identity. |
| mit-curriculum | 0.6 | 0.4 | Generic content, lacks domain-specificity. |
| shop-floor | 0.6 | 0.5 | Lacks domain-specific identity and rules. |
| agent-orchestration | 0.75 | 0.85 | Refuses are clear but could be more specific. |
| hermes-zulu | 0.75 | 0.85 | Refuses list is detailed but lacks clarity. |
| knowledge-conversion | 0.75 | 0.85 | Refuses are clear but incomplete. |
| token-optimization | 0.75 | 0.85 | Refuses list is generic. |
| cam | 0.8 | 0.6 | Good domain-specific content, minor improvements needed. |
| quoting | 0.8 | 0.9 | Good domain-specific content, minor improvements needed. |

## Worst CLAUDE.md (bottom 10 by claudeGrade)
| galaxy | claude | soul | verdict |
|---|---|---|---|
| mit-curriculum | 0.4 | 0.6 | Incorrect engine paths, irrelevant tribal pointers. |
| shop-floor | 0.5 | 0.6 | Overly generic, lacks specific shop-floor rules. |
| cam | 0.6 | 0.8 | Lacks detailed rules and examples; stub sections present. |
| business | 0.7 | 0.6 | Good scope and constants, but gotchas incomplete. |
| cad-fusion-live | 0.75 | 0.85 | Detailed but lacks specific rules and safety rails. |
| lathe | 0.75 | 0.85 | Gotchas incomplete, lacks threading lead-in/out details. |
| pdf-corpus | 0.75 | 0.85 | Lacks depth in domain-specific rules. |
| pdf-corpus-mill | 0.75 | 0.85 | Contains boilerplate and irrelevant engines. |
| speed-feed | 0.75 | 0.85 | Good structure, but could be more concise. |
| tribal-knowledge | 0.75 | 0.8 | Detailed but could be more concise. |

## All grades (alphabetical)
| galaxy | soul | claude | stubSoul | stubClaude | top issue |
|---|---|---|---|---|---|
| academy | 0.85 | 0.9 |  |  | Incomplete sentence in 'What this specialist does' section |
| agent-orchestration | 0.75 | 0.85 |  |  | Refuses need domain-specific examples |
| ai-training | 0.85 | 0.9 |  |  | More specific examples of refusals |
| backend-helper | 0.85 | 0.9 |  |  | Lacks specific persona details in SOUL.md |
| blueprint-vision | 0.85 | 0.9 |  |  | Lacks specific domain examples in SOUL.md |
| bug-hunting | 0.85 | 0.9 |  |  | Lacks specific persona traits |
| business | 0.6 | 0.7 |  | Y | SOUL.md lacks detailed domain-specific content |
| cad | 0.85 | 0.9 |  |  | AI-synergy details incomplete in SOUL.md |
| cad-fusion-live | 0.85 | 0.75 |  |  | SOUL.md could include more detailed responsibilities. |
| cam | 0.8 | 0.6 |  | Y | CLAUDE.md lacks specific domain rules and examples |
| compliance-safety | 0.85 | 0.9 |  |  | Safety gate droplet in Refuses section |
| corpus-aggregation | 0.85 | 0.9 |  |  | Refuses section cut off in SOUL.md |
| database-expansion | 0.85 | 0.9 |  |  | Non-atomic JSON writes not fully explained |
| discovery | 0.85 | 0.9 |  |  | More specific examples of duplication prevention |
| dormant-data | 0.85 | 0.9 |  |  | More specific domain rules needed in SOUL.md |
| fleet-hygiene | 0.85 | 0.9 |  |  | More specific domain examples needed in SOUL.md |
| frontend-app | 0.6 | 0.8 | Y |  | Role should be frontend specialist |
| hermes-zulu | 0.75 | 0.85 |  |  | Refuses list in SOUL.md needs clearer explanations |
| knowledge-conversion | 0.75 | 0.85 |  |  | Incomplete refuses in SOUL.md |
| lathe | 0.85 | 0.75 |  | Y | Refuses list cut off |
| mill | 0.85 | 0.9 |  |  | More specific domain-specific refuses needed in SOUL.md |
| mit-curriculum | 0.6 | 0.4 | Y | Y | SOUL.md is generic and not domain-specific |
| pdf-corpus | 0.85 | 0.75 |  | Y | CLAUDE.md lacks detailed domain rules |
| pdf-corpus-mill | 0.85 | 0.75 |  | Y | Lacks detailed domain rules in CLAUDE.md |
| post-processor | 0.85 | 0.9 |  |  | More specific examples of dialect tokens needed in SOUL.md |
| quality | 0.85 | 0.9 |  |  | Cpk computation cut-off in SOUL.md |
| quoting | 0.8 | 0.9 |  |  | Refuses section lacks specific consequences for violations |
| shop-floor | 0.6 | 0.5 | Y | Y | Generic content in SOUL.md |
| speed-feed | 0.85 | 0.75 |  |  | Lacks specific examples in SOUL.md |
| system-viz | 0.85 | 0.9 |  |  | Minor formatting issues in SOUL.md |
| token-optimization | 0.75 | 0.85 |  |  | Generic refuses in SOUL.md |
| tribal-knowledge | 0.8 | 0.75 |  |  | Soul needs more substantive content |
| wedm | 0.85 | 0.75 |  | Y | Incomplete gotchas section in CLAUDE.md |
| wiring | 0.85 | 0.9 |  |  | More specific examples of domain rules needed |
