---
name: prism-builder-emulator
description: Allows ZULU to fully emulate the user as primary builder using the new prism_builder MCP functions.
version: 1.0.0
---

# prism-builder-emulator Skill

## Loaded Actions
- `prism_builder:emulate_primary_builder`
- `prism_builder:analyze_task_user_style`
- `prism_builder:decide_next_unit`
- `prism_builder:generate_user_style_prompt`
- `prism_builder:apply_4loop_gate`

## Usage
Call `prism_builder:emulate_primary_builder` with a goal. ZULU will respond in the user's exact terse, outcome-first style and drive the 4-LOOP autonomously.

## Integration
- Injected into ZULU system prompt via awareness hook.
- Available in `/zulu-master` and RGS loop.
- Respects all CLAUDE.md rules.

**Status:** Built autonomously. Ready for activation.