# Hook Scope Report — 11-leg PSN classification

**Generated:** 2026-05-25T17:49:11.359Z  
**Source:** H:\prism\state\shared\HOOK_REGISTRY.json  
**Total hooks scoped:** 635

## Aggregate

### By verdict
| Verdict | Count | % |
|---|---|---|
| live | 327 | 51.5% |
| orphan | 304 | 47.9% |
| dead-stub | 4 | 0.6% |

**Wired:** 327 / 635 (51.5%)
**PSN-synergized:** 170 / 635 (26.8%)
**Multi-leg hooks:** 49 (touch ≥2 PSN legs)

### By PSN leg
| Leg | Hooks touching | % of fleet |
|---|---|---|
| Obsidian-brain | 28 | 4.4% |
| PRISM-OS | 18 | 2.8% |
| Wiki | 35 | 5.5% |
| Memories | 5 | 0.8% |
| Tribal | 28 | 4.4% |
| System-Viz | 16 | 2.5% |
| Engines | 52 | 8.2% |
| Algorithms | 11 | 1.7% |
| Formulas | 16 | 2.5% |
| NN-GNN | 7 | 1.1% |
| PRISM-AI | 24 | 3.8% |

### Ghost references (wired but file missing)
_None._

## Top 20 orphans by code-size (candidates for wiring)
| Hook | PSN legs | Purpose |
|---|---|---|
| `stale-claim-sweeper` | - | stale-claim-sweeper.mjs — SessionStart + Stop hook. |
| `test-100-percent-gate` | Engines, Algorithms | test-100-percent-gate.mjs — Stop Hook |
| `extended-thinking-auto` | - | Extended Thinking Auto-Switch — UserPromptSubmit Hook |
| `golf-slot-write-allowlist` | Engines | golf-slot-write-allowlist.mjs — PreToolUse T0 hook (U-CLEANUP-A5) |
| `ai-duplication-guard` | Algorithms, Formulas | AI Duplication Guard — PreToolUse Hook (Phase 0.1 Fix) |
| `alpha-slot-reaper-guardian` | - | alpha-slot-reaper-guardian.mjs — the ALPHA slot owns the fleet reaper. |
| `tribal-by-domain-inject` | Wiki, Tribal, NN-GNN | tribal-by-domain-inject.mjs — UserPromptSubmit |
| `orchestrator-advisory-inject` | - | orchestrator-advisory-inject.mjs — UserPromptSubmit hook that injects |
| `prism-awareness-v2` | Formulas | prism-awareness-v2.mjs — SessionStart hook |
| `command-telemetry-record` | - | command-telemetry-record.mjs — PostToolUse "Skill" hook |
| `obsidian-precheck-inject` | Obsidian-brain | obsidian-precheck-inject.mjs — UserPromptSubmit hook |
| `wiki-link-suggest` | Obsidian-brain, Wiki | wiki-link-suggest.mjs — PostToolUse hook for memory/wiki writes |
| `ollama-unified-semantic-router` | Tribal, Algorithms | ollama-unified-semantic-router.mjs — UserPromptSubmit hook |
| `git-anti-clobber` | - | Git Anti-Clobber Hook — PreToolUse (Worktree-Aware v2) |
| `error-pattern-memory` | - | error-pattern-memory.mjs — PostToolUse Hook (Bash, Edit, Write) |
| `agent-watchdog` | - | agent-watchdog.mjs — stall detector for the 10-chat PRISM fleet. |
| `error-pattern-learner` | - | error-pattern-learner.mjs — dual-mode hook. |
| `memory-autocompact-stop` | Obsidian-brain | memory-autocompact-stop.mjs — Stop hook. The ACT counterpart to the |
| `ollama-reviewer-second-opinion` | - | ollama-reviewer-second-opinion — PreToolUse hook on Bash for `git commit`. |
| `dist-integrity-check` | - | dist-integrity-check.mjs — SessionStart hook (PILLAR-TELEMETRY-RECOVERY-MS0/U-PT |

## Deprecated still-in-tree
_None._

## Dead stubs (live + <20 lines or <500B)
| Hook | Notes |
|---|---|
| `cost-bridge-on-tool-wear-log` | tiny (15 lines, 1143B) |
| `pre-write-roadmap-home` | tiny (11 lines, 535B) |
| `protect-document-content` | tiny (2 lines, 12B) |
| `stop_on_non_h_roadmap` | tiny (11 lines, 514B) |

## Hooks NOT synergized with any PSN leg (potential rewires)
Total: **226** live hooks touch zero PSN legs (per keyword scan).

_Full per-hook classifications in `HOOK-SCOPE-REPORT.json`._