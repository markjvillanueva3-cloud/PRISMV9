# TOKEN-ECONOMY-REPORT — Intel-Ollama-Obsidian P7-U01

Generated: 2026-05-06T20:15:19.191Z
Settings source: `H:\prism-iooms0\.claude\settings.json`

## Summary

- **Synthetic prompts run:** 10
- **UserPromptSubmit hooks measured:** 14
- **Total injected tokens (all prompts × all hooks):** 2,426
- **Mean injected tokens per prompt:** 243
- **Hook errors observed:** 0

## Per-Category Breakdown

| Category | Tokens | Share | Hooks | Errors |
|---|---:|---:|---:|---:|
| router | 899 | 37.1% | 5 | 0 |
| other | 827 | 34.1% | 2 | 0 |
| coordination | 650 | 26.8% | 3 | 0 |
| housekeeping | 50 | 2.1% | 4 | 0 |

## Per-Hook Hot-Spots (top 15)

| Hook | Category | Tokens | Mean/Prompt | Errors |
|---|---|---:|---:|---:|
| `knowledge-augmented-reasoning-v3.mjs` | other | 827 | 83 | 0 |
| `auto-route.mjs` | router | 678 | 68 | 0 |
| `agent-coordination.mjs` | coordination | 550 | 55 | 0 |
| `pre-claude-review-inject.mjs` | router | 121 | 12 | 0 |
| `ollama-auto-router.mjs` | router | 50 | 5 | 0 |
| `shortcode-injector.mjs` | router | 50 | 5 | 0 |
| `tribal-categorize-reminder.mjs` | housekeeping | 50 | 5 | 0 |
| `cross-session-work-aware.mjs` | coordination | 50 | 5 | 0 |
| `realtime-session-coordinator.mjs` | coordination | 50 | 5 | 0 |
| `user-prompt-submit-p1.mjs` | other | 0 | 0 | 0 |
| `ai-auto-command-router.mjs` | router | 0 | 0 | 0 |
| `node-process-janitor.mjs` | housekeeping | 0 | 0 | 0 |
| `capability-reminder.mjs` | housekeeping | 0 | 0 | 0 |
| `periodic-checkin.mjs` | housekeeping | 0 | 0 | 0 |

## How to interpret

- Token counts are the chars/4 approximation (within ~10% of GPT-4's BPE for English). The benchmark is comparative, not absolute.
- Each row is the cost of running ONE UserPromptSubmit hook against ONE synthetic prompt — the per-prompt total is the sum across all hooks.
- The synthetic prompt set is frozen (`SYNTHETIC_PROMPTS` in the script) so reruns are diff-able. Don't mutate it; append only.
- Pre-wiring baseline = run this script with the offload-stats reset (P0-U03 reset point: 2026-05-01). Post-wiring measurement = run again after P3/P4 land.
- Total savings target per the milestone exit_condition: ≥50% (floor) / 80% (target).
