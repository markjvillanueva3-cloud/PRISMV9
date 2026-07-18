---
name: feedback-p2p-pre-flight-discipline-2026-05-23
description: Always run /p2p-intake-check (or the underlying print_to_program_check_intake MCP action) BEFORE invoking print_to_program_full / print_to_program_enhanced / print_to_program_plan when input completeness is in doubt. ~99% token + wall-clock savings on incomplete inputs (10ms + <500 tokens vs 30s+ + 50K+ tokens of intermediate pipeline state). Permanent context retention via memory + wiki + skill triple-injection — zero marginal cost.
metadata:
  type: feedback
---

# P2P Intake-Check Pre-Flight — Standing Doctrine

**Rule:** Before invoking any `print_to_program_*` full-pipeline MCP action, run `/p2p-intake-check` (or `prism_cam:print_to_program_check_intake` directly) when input completeness is in doubt.

**Why:** The full P2P pipeline (`print_to_program_full`) burns ~30 seconds wall-clock + ~50K tokens of intermediate stage state before surfacing input gaps at stage 3-5. The intake-check returns the same gap-detection in ~10ms with <500 tokens. **~99% token + wall-clock savings on incomplete inputs.** Break-even at 1% incomplete-input rate across the fleet — i.e. it pays for itself essentially always.

Per kilo's slot soul refuse-list (CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0): `silent-fallback-on-ambiguous-callouts → reject`. The intake-check IS the contract-enforcement surface for that refuse — chats SHOULD NOT proceed to `print_to_program_full` when intake returns `success: false`.

**How to apply:**

1. When you have a `DrawingInput` shape and intend to feed it to `print_to_program_full`:
   - First call `prism_cam({ action: "print_to_program_check_intake", params: <DrawingInput> })`
   - If `success: false` → surface the gap to operator, DO NOT proceed
   - If `success: true` → proceed to `print_to_program_full`
2. When operating an autonomous P2P loop:
   - Use intake-check as a quick gate that skips known-incomplete inputs without burning pipeline cycles
3. When debugging a P2P pipeline failure that happened in stage 3-5:
   - Re-run intake-check on the same input as a quick triage step — it will name the missing fields
4. Operator interface: `/p2p-intake-check <drawing.json>` (skill at `.claude/commands/p2p-intake-check.md`)

**What NOT to do:**

- ❌ Skip intake-check and let the full pipeline surface the gap at stage 3-5 (wastes 30s + ~50K tokens per false start)
- ❌ Treat ISO-group inference as a blocker — it's a warning (defaults to P/steel) — only material-name absence is critical
- ❌ Build a parallel completeness-checking engine — `validateIntake()` already covers this surface (`duplicationGuardEngine.mustCheckBeforeCreating()` will block such an attempt)
- ❌ Override `success: false` and proceed anyway — that violates kilo's refuse-list contract

**Cross-refs (the PSN triple):**

- Skill: `.claude/commands/p2p-intake-check.md` (`/p2p-intake-check`)
- Wiki: [[p2p-intake-check-discipline]] (auto-surfaced via wiki-precheck-inject on `p2p|blueprint|drawing|print-to-program` keywords)
- MCP action: `prism_cam:print_to_program_check_intake`
- Engine: `PrintToProgramPipelineEngine.calculate("print_to_program_check_intake")`
- Test: `mcp-server/src/__tests__/PrintToProgramCheckIntake.test.ts` (7/7 PASS)
- Audit: [[reference_kilo_queue_revisit_2026_05_23]]
- Ship: [[reference_u_intake_check_wire_peer_absorption_2026_05_23]]
- Decomposition: [[KILO-QUEUE-PSN-SYNERGY-2026-05-23]]
- Sister-token-savings: [[feedback_token_savings_discoveries_2026_05_23]]
- Doctrine context: [[feedback_psn_definition]] (11-leg PSN architecture this fits into)

**Compounding-savings prediction** (per the wiki entry's calc): if fleet adoption reaches 50% via auto-injection on relevant prompts, ~1.5M tokens/month saved fleet-wide.

**Permanent context retention mechanism (free):**

This memory file is auto-indexed by FOUR existing injection surfaces — zero marginal token cost going forward:

1. **memory-vault-pre-search** (top-3 hits on UserPromptSubmit with matching tokens like "p2p", "blueprint", "drawing", "print-to-program")
2. **tribal-by-domain-inject** (slot-domain-aware; surfaces on prompts in kilo/delta/echo/india domains)
3. **master-index-precheck-inject** (top-5 hits on UserPromptSubmit via system-graph token match)
4. **subagent-per-task-presearch** (every spawned subagent gets a fresh keyword search of this vault — per [[reference_subagent_per_task_presearch_2026_05_15]])

Plus the c-to-h-mirror Stop hook auto-replicates this file across `C:/Users/<u>/.claude/projects/H--prism/memory/` ↔ `H:/prism/knowledge/memories/feedback/` for free cross-machine retention.

**No code change, no settings.json edit, no hook install required.** The discipline is now load-bearing across the fleet permanently.
