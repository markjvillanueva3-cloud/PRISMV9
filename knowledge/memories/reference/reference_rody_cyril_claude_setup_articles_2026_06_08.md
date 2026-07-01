---
name: reference_rody_cyril_claude_setup_articles_2026_06_08
description: "3 X articles (0x_rody x2, cyrilXBT x1) on Claude Code best-practice setup — self-check, anti-fabrication, MIT-textbook-corpus. PRISM already exceeds all three; verified via ultracode workflow."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.146Z
aliases: reference_rody_cyril_claude_setup_articles_2026_06_08
---


**Three X articles the operator had alpha verify our setup against (2026-06-08).** Read via `api.fxtwitter.com/<user>/status/<id>` (X's guest API was rate-limited; fxtwitter returns the long-form `article.content.blocks` JSON without auth).

## Article 1 — @0x_rody "Make Claude Code Review Its Own Work Before Showing You" (status 2063928611619455268)
4-layer self-check: (L1) CLAUDE.md self-check protocol defining what "done" means + re-verify-tests-not-memory; (L2) PostToolUse hooks running lint+typecheck after every edit, output fed back; (L3) **Stop hook that RUNS THE TEST SUITE before "done" — the article's most-important layer**; (L4) self-reviewer subagent invoked before commits. Anti-patterns: hooks too slow (test belongs in Stop, lint/type per-edit), no Stop hook, CLAUDE.md >50 lines (Claude skims past), never invoking the reviewer, `--skip-hooks` bypass.

## Article 2 — @cyrilXBT "12 Free MIT AI Textbooks Into Claude" (status 2063634505940754601)
Upload 12 ML textbooks as PERMANENT Claude Project knowledge so the model reasons from first principles + pushes back on mathematically-flawed frameworks (cites the chapter). The 12: 1.Mohri *Foundations of ML* (mlbook.cs.nyu.edu), 2.Prince *Understanding Deep Learning* (udlbook.github.io), 3.MIT *Machine Learning Systems* (mlsysbook.ai), 4.Kochenderfer *Algorithms for Decision Making* (algorithmsbook.com), 5.Goodfellow *Deep Learning* (deeplearningbook.org), 6.Sutton&Barto *RL: An Introduction* (incompleteideas.net/book), 7.Bellemare *Distributional RL* (distributional-rl.org), 8.Albrecht *Multi-Agent RL* (marl-book.com), 9.Kochenderfer decision-making (mykel.kochenderfer.com/textbooks), 10.Barocas *Fairness and ML* (fairmlbook.org), 11.Murphy *Probabilistic ML: Intro* vol1 (probml.github.io/book1), 12.Murphy *Probabilistic ML: Advanced* vol2 (probml.github.io/book2). Pattern = corpus-as-permanent-reasoning-layer.

## Article 3 — @0x_rody "Make Claude Code Stop Making Stuff Up When It Doesn't Know" (status 2063295395434831922)
4-layer anti-fabrication: (L1) CLAUDE.md honesty rules + explicit **"I don't know" license**; (L2) verification-before-write (verify a symbol exists before claiming/using it); (L3) PostToolUse type/lint + Stop test hooks catching fabricated imports; (L4) fact-checker subagent. Working-signals: Claude asks before adding deps, cites `file:line` for existing code, tsc/linter stay quiet. **"I don't know license" is half config (CLAUDE.md) + half habit (reward "I haven't verified this" with patience, not frustration).**

## PRISM mapping (already implemented, deeper than the articles)
- A1/A3 L1 → global CLAUDE.md `## HONESTY RULES` (line 40, already cites @0x_rody) + R8/R12 + Karpathy block.
- A1/A3 L2/L3 → PostToolUse eslint/tsc hooks + Stop scrutiny gate; `stop_on_failing_tests.mjs` (T0 fail-closed test-report gate).
- A1/A3 L4 → the **3-of-3 scrutiny-before-stop gate** + per-file 2-reviewer gate (reviewer/code-analyzer/verifier/test-review/physics-review agents) — INSTITUTIONALIZED + Stop-hook-ENFORCED, not manual-invoke (the articles' weakness).
- A2 → academy/pdf-corpus/ai-training/mit-curriculum galaxies + MIT-OCW integration ([[reference_knowledge_conversion_ms0_2026_05_17|KNOWLEDGE-CONVERSION-MS0]]) + CAG cold-anchor + RAG.

Verified via ultracode workflow `setup-verify-vs-rody-articles` (run wf_4c9296d1-215). Related: [[reference_knowledge_conversion_ms0_2026_05_17]], [[feedback_psn_definition]].
