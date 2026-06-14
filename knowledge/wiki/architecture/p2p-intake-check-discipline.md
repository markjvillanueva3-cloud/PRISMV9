---
title: P2P Intake-Check Discipline
type: architecture
slot: kilo
domain: print-to-program
created: 2026-05-23
status: active
related:
  - reference_kilo_queue_revisit_2026_05_23
  - reference_u_intake_check_wire_peer_absorption_2026_05_23
  - KILO-QUEUE-PSN-SYNERGY-2026-05-23
synergy_with:
  - feedback_token_savings_discoveries_2026_05_23
  - feedback_high_roi_backend_first_slot_queue
aliases:
  - p2p-intake-check-discipline
  - p2p-pre-flight
  - print-to-program-pre-flight
---

# P2P Intake-Check Discipline — Token-Savings Synergy

## Rule

**Before invoking `print_to_program_full` / `print_to_program_enhanced` / `print_to_program_plan`, always run `print_to_program_check_intake` (skill: `/p2p-intake-check`) when input completeness is in doubt.**

Per kilo's slot soul refuse-list: `silent-fallback-on-ambiguous-callouts → reject`. This is the contract-enforcement surface for that refuse.

## Token-savings math

| Path | Wall-clock | Token cost | Outcome on incomplete input |
|---|---|---|---|
| Direct `print_to_program_full` on incomplete input | ~30s+ | ~50K (intermediate state of stages 1-5) | Stage 3-5 surfaces gap, full pipeline state is discarded |
| `/p2p-intake-check` first | ~10ms | <500 tokens | Gap surfaced immediately, no pipeline state generated |
| Direct on complete input | ~30s | ~50K (success path) | OK |
| `/p2p-intake-check` first on complete input | ~30s + 10ms | ~50K + <500 | OK with negligible overhead |

**Savings:** ~99% wall-clock + ~99% token on incomplete inputs. **Break-even point:** if even 1% of P2P invocations have incomplete inputs, the pre-flight discipline pays for itself across the fleet.

## When to invoke

Per kilo soul **"validate-blueprint-extraction-before-cam"**:

- Before any `/print-to-program` or `print_to_program_full` invocation when input completeness is in doubt
- Before queuing a blueprint for OCR/feature recognition
- As a pre-flight gate in CI / automation that feeds drawings into the P2P pipeline
- When debugging a P2P pipeline run that failed early — to confirm the input was complete

## Implementation

| Layer | Artifact |
|---|---|
| MCP action | `prism_cam:print_to_program_check_intake` |
| Engine method | `PrintToProgramPipelineEngine.calculate("print_to_program_check_intake")` |
| Algorithm | `validateIntake(input: DrawingInput) → { complete, missing_dimensions, ambiguous_tolerances, warnings }` |
| Skill wrapper | `/p2p-intake-check` (`.claude/commands/p2p-intake-check.md`) |
| Test | `mcp-server/src/__tests__/PrintToProgramCheckIntake.test.ts` (7/7 PASS) |
| Spec | [[KILO-QUEUE-PSN-SYNERGY-2026-05-23]] |
| Memory (audit) | [[reference_kilo_queue_revisit_2026_05_23]] |
| Memory (ship) | [[reference_u_intake_check_wire_peer_absorption_2026_05_23]] |

## Return contract

`ValidationResult`:
```typescript
{
  success: boolean,                  // false if any critical warning
  safety_checks: SafetyCheck[],      // always [] for intake-only
  safety_pass_rate: number,          // 1.0 on success, 0 on critical
  warnings: PipelineWarning[],       // intake-specific (critical/warning/info)
  recommendations: string[],         // "Missing dimensions: …", "Ambiguous tolerances: …"
}
```

**Critical warnings (success → false):**
- "No material callout found on drawing" (missing `material.material_name`)
- Per-feature: missing/zero depth, hole without diameter, slot without width, thread without pitch

**Non-critical warnings (success may still be true):**
- "ISO material group not determined — defaulting to P (steel)"
- "Stock size not specified — will estimate from feature extents"
- Per-feature: very tight tolerance flagged for capability verification

## Kilo-voice reporting format

When invoking, report in standard kilo pipeline-aware format:

> "Intake → success: false. 1 critical (material), 0 ambiguous tolerances. 12/14 dimensions complete. 2 features missing depth (F3, F7). Recommend: surface to operator before feature-recognition stage."

## PSN synergy claim (8 of 11 legs)

| Leg | Wire |
|---|---|
| Obsidian | 2 reference memories + this wiki entry (cross-feeds vault) |
| **Wiki** | **THIS architecture entry — auto-surfaced via wiki-precheck-inject when keywords match** |
| Memories | per Obsidian above |
| System-Viz | `ghost.kilo_p2p_intake_check` L6 skill roost (queued for next regen) |
| Engines | `PrintToProgramPipelineEngine` |
| Algorithms | `validateIntake()` |
| Skills | `/p2p-intake-check` |
| Tribal | domain tag `print-to-program` (boost via tribal-by-domain-inject) |

3 PSN legs not yet wired (PRISM OS dispatcher action surface, NN/GNN feedback loop, PRISM AI auto-routing) — follow-up units exist in [[KILO-QUEUE-PSN-SYNERGY-2026-05-23]] decomposition.

## Compounding-savings prediction

If fleet adoption reaches 50% of P2P invocations within a week (achievable via wiki auto-injection on keywords like "print-to-program", "blueprint", "drawing"), and 10% of historical P2P invocations had incomplete inputs:

- 50% × 10% × 50K tokens = 2.5K tokens saved per P2P invocation across fleet
- At ~20 P2P invocations/day across 26 chats = ~50K tokens/day saved fleet-wide
- Monthly: ~1.5M tokens saved

**Self-multiplying via wiki-precheck-inject:** every prompt mentioning P2P keywords surfaces this entry, growing fleet adoption automatically without operator effort.

## Anti-patterns to avoid

- ❌ Skipping intake-check and silently failing in stage 3-5 of `print_to_program_full`
- ❌ Treating ISO group inference as a blocker (it's a warning — defaults to P/steel)
- ❌ Running intake-check then ignoring its `success: false` verdict and proceeding to `print_to_program_full` anyway
- ❌ Building parallel completeness-checking engines (duplicate of `validateIntake` — duplicationGuardEngine will block)

## Cross-refs

- [[reference_kilo_queue_revisit_2026_05_23]] — audit trail for the missing 3-of-4 adaptive_orchestrator capabilities
- [[reference_u_intake_check_wire_peer_absorption_2026_05_23]] — ship details + peer-absorption disclosure
- [[KILO-QUEUE-PSN-SYNERGY-2026-05-23]] — decomposition of all P2P multi-session units with PSN wiring plan
- [[feedback_token_savings_discoveries_2026_05_23]] — sister token-savings findings from alpha slot same day
- Skill: `.claude/commands/p2p-intake-check.md`
- Test: `mcp-server/src/__tests__/PrintToProgramCheckIntake.test.ts`
- Source-of-truth dispatcher action: `prism_cam:print_to_program_check_intake`
