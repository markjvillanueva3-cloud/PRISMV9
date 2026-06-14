---
name: reference_u_knowledge_link_audit_wire_2026_05_20
description: "U-KNOWLEDGE-LINK-AUDIT-WIRE (echo /goal synergy iter 4) — wired weekly wiki↔memory broken-link audit into Stop hook, atomic O_EXCL P0 fix; banner misattributed"
aliases: reference_u_knowledge_link_audit_wire_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.002Z
---


**Iter 4 of the /goal synergize loop in echo slot (2026-05-20, session 88b0032d).** Wired `scripts/knowledge-link-audit.mjs` (iter 3) into `H:\prism\.claude\hooks\handoff-memory-seed-stop.mjs` as a fourth Stop-hook piggyback alongside `pruneStaleHandoffs` + `refreshZuluAwareness` + `regenCapabilityReport`. Weekly throttle via `.knowledge-link-audit.lock` mtime; knob `PRISM_KNOWLEDGE_LINK_AUDIT_DISABLE=1`; detached + non-blocking.

**First real run from the wired hook:** **4,136 broken / 97,673 total `[[name]]` tokens across 24,795 markdown files**. This is the silent-degradation surface the substrate exposes — every broken link is a tribal/memory-rag lookup that fails quietly. Producer side now flows; consumer-side surfacer (threshold-based systemMessage or SessionStart inject pointer) is the natural follow-up iter.

**P0 fix during per-file scrutiny (Reviewer-B):** original implementation used `statSync → writeFileSync` (check-then-write) which is non-atomic — under sub-ms concurrent Stop bursts across the 26-slot fleet, 2+ hooks could pass the freshness check before any wrote, spawning multiple parallel 24K-file scans. **Fix:** atomic O_EXCL acquire via `writeFileSync(lockPath, ..., {flag:"wx"})`. EEXIST → freshness check → either return (peer owns the window) OR `unlinkSync` + retry-with-`wx` for the stale-lock path. Burst/stale/first-run paths all walked through; two-round race for stale-lock is wx-atomic-safe. Reviewer-B re-PASS on the fix.

**Per-file 2-of-2 scrutiny gate (post `U-REDUCE-AGENT-REVIEW`):** A PASS (code-analyzer, round 1), B FAIL→PASS (reviewer, round 2 after O_EXCL fix). 2-of-2 cleared.

## Misattribution — content correct, banner wrong

My pathspec-targeted commit `git commit -- .claude/hooks/handoff-memory-seed-stop.mjs` lost the multi-attempt git-index-lock race against the heavy 26-slot fleet, then on retry the `-m "..."` heredoc got mangled by Bash and a line of the commit body was parsed as a literal pathspec ("Knob: PRISM_KNOWLEDGE_LINK_AUDIT_DISABLE=1." → "did not match any file(s) known to git"). The earlier `git add` had already staged the file; another peer (kilo) ran `git commit` in the contention window and **swept my 56 LOC into their commit `9416042d56`** ("[MAIN] [HIGH-ROI-SKILL-SYNERGY]/U-SKILL-LEDGER-REVIVE-FIX1 (slot:kilo): scrutiny arm-C P0 — env-var insulation").

Content verification: `git show --stat 9416042d56` reports `.claude/hooks/handoff-memory-seed-stop.mjs | 56 +++++++++++++++++++++++++++++-`. `git show HEAD:.claude/hooks/handoff-memory-seed-stop.mjs | grep -c auditKnowledgeLinks` returns 2 (function declaration + main() call site). Lock-fix code is present at lines 162-185 of HEAD. **Work IS on HEAD and verified intact**; only the commit banner credits kilo with my 56 LOC.

**Same class as `[[reference_iter2_html_adopt_misattribution_2026_05_18]]`** — recurring shared-tree git-add-window misattribution under heavy fleet contention. No forward fix attempted (would destabilize peer history). Logged here so future audits can credit the 56 LOC + the P0 fix correctly.

## What this completes

5 of 8 /goal surfaces now actively flowing data via the Stop-hook substrate:
1. **handoff-prune** (cron, iter 0 — ECHO-UNDONE H6, commit `7fcbe2f720`)
2. **zulu-awareness producer** (iter 1, commit `4e7d2be81b`)
3. **capability-map consumer** (iter 2, commit `896c63847f`)
4. **knowledge-link-audit producer** (iter 4, **content in commit `9416042d56` mis-attributed to kilo**)

Surfaces still to wire actively (loop continues): wiki ⇄ tribal cross-reference completeness, NN/GNN feedback consumer, prism-ai-system ↔ obsidian-brain cross-feed, system-viz roost for the integrity ledger. Avoid lanes: `claude-dbba2d72` (NN/GNN↔AI consumers) and `ZULU-HERMES-GAPS` orchestrator sweep.

## Apply-in-future

- Pathspec-commit doctrine (`git commit -- <path>`) **does not protect** under shared-tree contention if the commit step itself fails — the file stays staged, peer sweeps it on their next commit. The robust pattern is single-line `-m` (Bash-safe) **plus** retry-loop with jitter **plus** verification of the commit hash after success. The misattribution is recoverable in audit (the SHA + file content speak), not a code-quality regression.
- Next iter (5): consumer-side surfacer for the broken-link report — emit `systemMessage` via Stop hook `hookSpecificOutput` when broken-count crosses a threshold, OR register a SessionStart inject pointer (the dormant Reviewer-B P1 deferred from this iter).
