# PRISM Skill-Library Audit — 2026-05-12

> @eng_khairallah1 Phase-4: *"One skill is a tool. Ten skills is a workforce."* — but count is vanity. This grades all **501** skills against the production-grade bar (linter-clean ∧ 3-Question-satisfied ∧ all-three-scenario-tests pass).

*Generated 2026-05-12T14:09:26.732Z · schema 1.0.0 · sum-invariant OK ✓*

## Scorecard

| Grade | Count | Share |
|---|---:|---:|
| ✅ production_grade | **0** | 0.0% |
| 🛠️ needs_refinement | **481** | 96.0% |
| 🗑️ stub_or_orphan | **20** | 4.0% |
| **total** | **501** | 100% |

## Advisories

- Invocation telemetry unavailable (all invocation_count_30d are null — U-SKU04 pending). 'Top by invocation' falls back to trigger-phrase count as a breadth-of-applicability proxy; the zero-invocation → orphan rule is disabled.
- SKILL_QUALITY_REGISTRY.json does not persist `skill_type` — the audit re-derives it from each skill's frontmatter. Consider extending SkillQualityRegistryBuilder (U-SKU06 follow-up) so the registry carries it.
- 0 production-grade skills — expected on the first audit after U-SKU02: production-grade requires all three scenario tests to PASS, and no skill has been run through prism_dev:skill_test yet. The actionable output is the gap list (which skills are `near` — already linter-clean + 3Q-OK, just missing the fixture run).

## Per-domain breakdown

| Domain | Total | ✅ prod | 🛠️ needs | 🗑️ stub |
|---|---:|---:|---:|---:|
| Other/cross-cutting | 306 | 0 | 289 | 17 |
| Dev-pipeline | 43 | 0 | 40 | 3 |
| WEDM/EDM | 28 | 0 | 28 | 0 |
| CAM | 21 | 0 | 21 | 0 |
| Lathe/Turning | 18 | 0 | 18 | 0 |
| Wiki/Knowledge | 14 | 0 | 14 | 0 |
| CAM-vendor | 13 | 0 | 13 | 0 |
| Business | 12 | 0 | 12 | 0 |
| Hooks/Harness | 11 | 0 | 11 | 0 |
| CAD | 8 | 0 | 8 | 0 |
| Milling | 8 | 0 | 8 | 0 |
| Grinding | 5 | 0 | 5 | 0 |
| Shop-floor | 5 | 0 | 5 | 0 |
| Welding | 5 | 0 | 5 | 0 |
| Skills-meta | 4 | 0 | 4 | 0 |

## Top 20 by `trigger_phrase_count` (proxy — invocation telemetry unavailable)

| # | Skill | Trigger phrases | Grade | Domain |
|---:|---|---:|---|---|
| 1 | `figma:figma-generate-design` | 23 | needs_refinement | Other/cross-cutting |
| 2 | `qodo-skills:qodo-get-rules` | 23 | needs_refinement | Other/cross-cutting |
| 3 | `obsidian:obsidian-cli` | 19 | needs_refinement | Other/cross-cutting |
| 4 | `quality-check-lathe` | 15 | needs_refinement | Other/cross-cutting |
| 5 | `quality-gate-lathe` | 15 | needs_refinement | Other/cross-cutting |
| 6 | `swiss-program` | 14 | needs_refinement | Lathe/Turning |
| 7 | `cost-optimize-lathe` | 12 | needs_refinement | Business |
| 8 | `qodo-skills:qodo-pr-resolver` | 11 | needs_refinement | Other/cross-cutting |
| 9 | `chip-control` | 10 | needs_refinement | Other/cross-cutting |
| 10 | `claude-md-management:claude-md-improver` | 10 | needs_refinement | Other/cross-cutting |
| 11 | `octo:skill-doc-delivery` | 10 | needs_refinement | Other/cross-cutting |
| 12 | `swiss-production` | 10 | needs_refinement | Lathe/Turning |
| 13 | `build-state` | 9 | needs_refinement | Other/cross-cutting |
| 14 | `figma:figma-generate-library` | 9 | needs_refinement | Other/cross-cutting |
| 15 | `lathe-groove` | 9 | needs_refinement | Lathe/Turning |
| 16 | `obsidian:defuddle` | 9 | needs_refinement | Other/cross-cutting |
| 17 | `octo:skill-debug` | 9 | needs_refinement | Other/cross-cutting |
| 18 | `octo:skill-rollback` | 9 | needs_refinement | Other/cross-cutting |
| 19 | `octo:skill-verify` | 9 | needs_refinement | Other/cross-cutting |
| 20 | `figma:figma-implement-design` | 8 | needs_refinement | Other/cross-cutting |

## Gap list — prioritized (top 60 of 501)

Worked top-to-bottom this is the fastest path to growing the production-grade count. `near` = already linter-clean + 3Q-OK, just needs `happy/edge/stress.md` written + a `prism_dev:skill_test` run.

| Skill | Grade | Distance | Domain | Why |
|---|---|---|---|---|
| `claude-code-setup:claude-automation-recommender` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `claude-md-management:claude-md-improver` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `codebase-memory-exploring` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `cowork-connectors` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `figma:figma-create-design-system-rules` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `figma:figma-create-new-file` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `figma:figma-generate-library` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `hookify:writing-rules` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `lathe-optimize` | needs_refinement | mid | Lathe/Turning | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 4 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `lathe-validate` | needs_refinement | mid | Lathe/Turning | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 4 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `mastercam-setup` | needs_refinement | mid | CAM-vendor | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 4 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `mill-optimize` | needs_refinement | mid | Milling | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 4 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `mill-validate` | needs_refinement | mid | Milling | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 4 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `obsidian:defuddle` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `obsidian:obsidian-cli` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:flow-define` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 3 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `octo:flow-deliver` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:flow-develop` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:flow-discover` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:octopus-quick` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 4 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `octo:skill-audit` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-claw` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-content-pipeline` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-copilot-provider` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-cost-projections` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-coverage-audit` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-debate` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 3 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `octo:skill-debug` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-decision-support` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-deck` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-design-lineage` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 4 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `octo:skill-doctor` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-issues` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-iterative-loop` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-knowledge-work` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 3 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `octo:skill-meta-prompt` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-resume` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-rollback` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-status` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-task-management` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-thought-partner` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-verify` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-visual-feedback` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:skill-writing-plans` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `octo:sys-configure` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `qodo-skills:qodo-get-rules` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `qodo-skills:qodo-pr-resolver` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `quality-check-lathe` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `run-continuous` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 3 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `security-audit` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 4 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `ship-lathe` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 4 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `six-chat-bootstrap` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 3 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `smart-apply` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 4 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `superpowers:using-superpowers` | needs_refinement | mid | Other/cross-cutting | Q3: no perfect-output example (no skill_type — would be exempt if tagged methodology/reference); no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 3 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `superpowers:verification-before-completion` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `team-dispatch` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 3 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `trend` | needs_refinement | mid | Other/cross-cutting | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `wedm-optimize` | needs_refinement | mid | WEDM/EDM | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 4 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| `wedm-tier6` | needs_refinement | mid | WEDM/EDM | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test) |
| `wedm-validate` | needs_refinement | mid | WEDM/EDM | no scenarios/ fixtures yet (write happy/edge/stress.md, then prism_dev:skill_test); (note: 4 trigger phrases — below the 3Q-gate's ≥5 ideal, above the linter's ≥3 floor) |
| … | | | | *(441 more — see the JSON sidecar)* |

## ROI estimate (@eng_khairallah1 heuristic — a range, not a precise figure)

- Heuristic: @eng_khairallah1: a production-grade skill you use weekly saves ≈30 min/wk ⇒ ≈25 engineer-hours/year.
- Production-grade today: **0** ⇒ realized ≈ **0–0 engineer-hours/year**.
- Potential: writing+running fixtures for the **40** skills that already pass linter+3Q would lift the library to **40** production-grade ⇒ up to ≈ **1000 engineer-hours/year**.
- 25 hrs/yr per production-grade skill assumes weekly use; the lower bound assumes only 20% of the production-grade subset is used weekly.
- This is a deliberately fuzzy heuristic, presented as a range — do not cite it as a precise figure.
- N = 0 today (the 3-scenario protocol shipped in U-SKU02 and no skill has been run through prism_dev:skill_test yet) ⇒ realized ROI is $0; the estimate becomes meaningful as the gap list is worked.

## Sources

- Registry: `H:\prism-skills-util\state\shared\registries\SKILL_QUALITY_REGISTRY.json` (generated 2026-05-12T01:19:19.340Z)
- Lint report: `H:\prism-skills-util\state\shared\skill-lint-report.json` (generated 2026-05-12T03:19:58.597Z)
- skill_type provenance: none
- `scenarios/` dirs probed on disk: yes

*Re-run: `node scripts/skill-library-audit.mjs` · monthly cron `0 8 1 * *` (cron id `skill-library-audit-monthly`) · dispatcher `prism_dev:skill_audit`.*
