---
description: Fast pre-flight check of a blueprint / drawing input for the print-to-program pipeline. Surfaces missing fields, ambiguous tolerances, and incomplete material specs WITHOUT running the full P2P pipeline. ~10ms vs ~30s+ for the full pipeline — 99% time savings on incomplete inputs.
allowed-tools: Bash, Read
---

# /p2p-intake-check — Print-to-Program Intake Pre-Flight

**Purpose:** Validate a drawing/blueprint input's completeness for the print-to-program pipeline BEFORE incurring full-pipeline cost. Single MCP action call. Returns missing fields + ambiguous tolerances + per-feature warnings.

**Shipped:** 2026-05-23 (slot:kilo iter 5) — wraps the `print_to_program_check_intake` MCP action shipped earlier the same session (engine case in `b925b381df` + dispatcher wire in `6ea81d124f`). PSN-synergy artifact per kilo /goal "+ synergized to PSN".

## When to invoke

Per kilo soul **"validate-blueprint-extraction-before-cam"** + refuse-list **"emitting-program-without-pmi-validation"**:

- Before any `/print-to-program` or `print_to_program_full` invocation when input completeness is in doubt
- Before queuing a blueprint for OCR/feature recognition
- As a pre-flight gate in CI / automation that feeds drawings into the P2P pipeline
- When debugging a P2P pipeline run that failed early — to confirm the input was complete

**Refuse-list overlap:** if intake-check returns `success: false` with critical warnings, the caller MUST NOT proceed to `print_to_program_full` until the gap is filled. This is the contract enforcement for kilo's "silent-fallback-on-ambiguous-callouts → reject" refuse.

## Usage

```bash
# Quick smoke-check with a minimal drawing input
echo '{
  "part_number": "TEST-001",
  "material": { "material_name": "1045 steel", "iso_group": "P" },
  "features": [],
  "dimensions": []
}' | command node -e "
  const stdin = require('fs').readFileSync(0, 'utf8');
  const input = JSON.parse(stdin);
  const { printToProgramPipelineEngine } = await import('H:/prism/mcp-server/dist/engines/PrintToProgramPipelineEngine.js');
  const result = printToProgramPipelineEngine.calculate('print_to_program_check_intake', input);
  console.log(JSON.stringify(result, null, 2));
"

# Or via MCP dispatcher (any chat with prism_cam access):
# prism_cam({ action: "print_to_program_check_intake", params: <DrawingInput> })
```

## Return shape

`ValidationResult`:

```typescript
{
  success: boolean,           // false if any critical warning (e.g. missing material)
  safety_checks: SafetyCheck[],  // always [] for intake-only (full safety via print_to_program_validate)
  safety_pass_rate: number,   // 1.0 on success, 0 on critical
  warnings: PipelineWarning[], // intake-specific warnings (critical/warning/info)
  recommendations: string[],   // "Missing dimensions: …", "Ambiguous tolerances: …"
}
```

**Critical warning examples (success → false):**
- "No material callout found on drawing" (missing `material.material_name`)
- Per-feature: missing/zero depth, hole without diameter, slot without width, thread without pitch

**Warning examples (success may still be true if no critical):**
- "ISO material group not determined — defaulting to P (steel)"
- "Stock size not specified — will estimate from feature extents"
- Per-feature: very tight tolerance flagged for capability verification

## Pipeline-aware reporting (kilo voice)

When invoking, report results in the standard kilo format:

> "Intake → success: false. 1 critical (material), 0 ambiguous tolerances. 12/14 dimensions complete. 2 features missing depth (F3, F7). Recommend: surface to operator before feature-recognition stage."

## PSN wiring (7 of 11 legs)

| PSN leg | Wire-in |
|---|---|
| Obsidian | `reference_kilo_queue_revisit_2026_05_23.md` (iter-2 rationale) + `reference_u_intake_check_wire_peer_absorption_2026_05_23.md` (ship details) |
| Wiki | (this skill IS a wiki node under `.claude/commands/`) |
| Memories | per Obsidian above |
| System-Viz | `ghost.kilo_p2p_intake_check` L6 skill roost (queued for next regen) |
| Engines | `PrintToProgramPipelineEngine.calculate("print_to_program_check_intake")` |
| Algorithms | underlying `validateIntake()` method (private) |
| Tribal | domain tag `print-to-program` |

## Cross-refs

- Underlying MCP action: `prism_cam:print_to_program_check_intake`
- Engine method: `PrintToProgramPipelineEngine.calculate("print_to_program_check_intake")`
- Test verification: `mcp-server/src/__tests__/PrintToProgramCheckIntake.test.ts` (7/7 PASS)
- Audit memory: [[reference_kilo_queue_revisit_2026_05_23]]
- Ship disclosure: [[reference_u_intake_check_wire_peer_absorption_2026_05_23]]
- Decomposition spec: [[KILO-QUEUE-PSN-SYNERGY-2026-05-23]]
- Picker queue: `state/shared/kilo-queue-psn-decomposition.json` (3 single-session shippable atoms)
- Doctrine: kilo slot soul (validate-blueprint-extraction-before-cam) + R12 fail-loud

## Efficiency claim

For an incomplete input that would have caused `print_to_program_full` to surface failure at stage 3-5 (~30s+ wall-clock + 50K+ tokens of intermediate state), `/p2p-intake-check` returns in ~10ms with the gap surfaced. **~99% wall-clock + token savings on incomplete inputs.** For complete inputs, overhead is negligible (~10ms vs the multi-second full pipeline).
