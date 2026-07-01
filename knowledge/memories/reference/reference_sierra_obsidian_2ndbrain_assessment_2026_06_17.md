---
name: reference_sierra_obsidian_2ndbrain_assessment_2026_06_17
description: "Sierra's 2026-06-17 evidence-based assessment of the PRISM Obsidian vault as a true 2nd brain + persistent context for ALL galaxies/chats, validated against current (2026) best-practice articles read via Playwright. VERDICT: STRONG / best-in-class -- PRISM is the rare vault that implements ALL THREE convergent 2026 AI-memory paradigms simultaneously (Obsidian REST plugin + Claude-Code AutoMemory ~/.claude/projects/*/memory + Karpathy LLM-compiled knowledge/wiki). Persistent-context ask ANSWERED: 34/34 galaxies back-pointer-indexed w/ MEMORY.md, 26 chat slots w/ per-chat handoffs + Stop-hook auto-feed. Also LIVE-VALIDATED U2 control surface end-to-end (Obsidian launched, :27123 up, ObsidianControlBridgeEngine.listCommands=193 cmds, write-gate=write-disabled by default). Ranked gaps: (1) 16,628 orphans=23.9% (best-practice 'no orphan files'); (2) Auto-Dream contradiction-detect weak (dream-*.mjs scripts exist); (3) MECE uncategorized/ bucket; (4) /Daily protocol partial (inbox/mistakes/connections dirs empty)."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.197Z
aliases: reference_sierra_obsidian_2ndbrain_assessment_2026_06_17
---


# Obsidian vault = true 2nd-brain assessment (2026-06-17, slot:sierra)

Operator: "launch obsidian, assess if it has everything to be a true PRISM 2nd brain +
persistent context for all galaxies/chats, read every article via playwright to ensure we
built it correctly." Grounded in [[reference_obsidian_vault_audit_2026_06_08]] (don't re-derive).

## Method
Launched Obsidian (H:/OBSIDIAN/Obsidian.exe; :27123 now LIVE + authenticated, live-brain READY).
Read 2 current best-practice articles in full via Playwright + an 8-article web-search synthesis
(slyapustin "Second Brain Has Amnesia" = the 3-paradigm comparison; pasqualepillitteri
"Obsidian+Claude Code" = MECE + /Daily + graph-test). Measured PRISM against the converged
checklist with REAL numbers (my obsidian-vault-navigator). NOT literally "every article" (web is
unbounded) -- I read the canonical converging set; findings stabilized (R12 honesty).

## VERDICT: STRONG / best-in-class (with a clear top gap)
The 2026 articles frame three competing AI-memory paradigms; the cutting edge is doing more than
one. **PRISM runs ALL THREE simultaneously** -- which exceeds every setup the articles describe:
- **Obsidian plugins** -> obsidian-local-rest-api + my obsidian-vault-navigator (filesystem nav).
- **Claude-Code AutoMemory** -> `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
  (index loaded at session start, topic files on demand -- the EXACT pattern, verbatim).
- **Karpathy LLM-compiled wiki** -> `knowledge/wiki/` (index.md, promote-memory-to-wiki self-
  improving back-write, Ollama health checks). Self-improves: answers -> memory -> wiki.

## Best-practice checklist -> PRISM (triangulated)
- Local-first plain markdown, no lock-in -> STRONG (69,445 .md on disk).
- Quote-the-source / cite to avoid hallucination -> STRONG (HONESTY RULES + fact-checker agent + cite file:line).
- MCP cheap reads (tools eat context) -> STRONG (200-token node cards + navigator, no GUI/MCP needed).
- Index-over-RAG at scale (a real vault won't fit a context window) -> STRONG (wiki index + master-index + cheap-node-access; 69K notes >> any window).
- **Persistent context for ALL galaxies + chats** -> STRONG, the ask is ANSWERED:
  34/34 galaxies have a `[galaxy:*]` back-pointer in master MEMORY.md + a galaxy `MEMORY.md`;
  26 chat slots (alpha..zulu) persist via per-chat HANDOFF-* + Stop-hook `stop-obsidian-memory-feed.mjs`.
- Auto-Dream consolidation -> PARTIAL: dream-*.mjs scripts EXIST (dream-session-walk,
  dream-stage-memory-receipt, dream-stage-wiki-stub, hermes-dream-cycle-synth); dedup landed
  (promote-gate hub-deinflate 9791b04732); relative->absolute dates is a CLAUDE.md rule.
  WEAK: no dedicated contradiction-detector.

## Ranked GAPS (evidence, highest-ROI first)
1. **Orphans: 16,628 / 69,445 = 23.9%** (best-practice "the graph test: NO orphan files").
   The single biggest measurable divergence. Root = most memories are link-free prose
   ([[feedback_use_wiki_links_in_memories]] rule 4) + 4,136 broken wikilinks (audit). Highest-ROI
   fix = link-heal, BUT judgment-heavy: the articles WARN that AI-invented links you can't source
   poison the brain -> must be a careful scoped build, NOT a blind 16K auto-pass.
2. **Auto-Dream contradiction-detect** weak -> a dedicated detector would complete the cycle.
3. **MECE violation:** `uncategorized/` (10 files) -- a lossy bucket the MECE principle forbids.
4. **/Daily protocol partial:** inbox/mistakes/connections memory dirs are EMPTY (0 files); PRISM's
   per-chat handoffs + dream-cycle substitute, but there's no consolidated daily note.

## Prior-audit gaps now CLOSED (progress since 2026-06-08)
- memory-rag-inject DEAD (0 settings) -> now wired in 2 settings. CLOSED.
- promote-memory-to-wiki junk-promotion -> 4-class content filter + hub-deinflate. CLOSED (freeze-gated arm).

## U2 LIVE-VALIDATION (closes the R12 deferral from [[reference_sierra_obsidian_control_surface_2026_06_17]])
With Obsidian launched: ObsidianControlBridgeEngine end-to-end vs live API --
listCommands ok=193 commands, list(memories) ok=19, read-engine status ok+authenticated,
create with write-gate OFF -> reason=write-disabled (security gate proven live, no mutation).
periodic(daily) fail-soft timeout (endpoint slow/unconfigured -- surfaced, not thrown).

Siblings: [[reference_sierra_obsidian_vault_navigator_2026_06_17]] ·
[[reference_sierra_obsidian_control_surface_2026_06_17]] · [[reference_obsidian_vault_audit_2026_06_08]].
