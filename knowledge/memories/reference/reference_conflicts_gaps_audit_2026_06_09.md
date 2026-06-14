---
name: reference_conflicts_gaps_audit_2026_06_09
description: "Fleet-wide conflicts/gaps/inefficiencies audit (11-agent Workflow, adversarially verified) — P0/P1 findings + top-5 ROI, incl self-implicating defects in bravo's own galaxy-completeness tooling"
type: reference
galaxy: bug-hunting
source: prism-memory
synced: 2026-06-09T14:54:09.070Z
aliases: reference_conflicts_gaps_audit_2026_06_09
---


# Conflicts / Gaps / Inefficiencies audit — 2026-06-09 (slot:bravo)

11-agent ultracode Workflow (`w5btm651b`): 5 scan lenses → 5 refute-by-default verifiers → synthesis. 2.67M subagent tokens, all findings grounded to file:line.

## P0 (conflicts)
- **4 souls contradict `CHAT-SLOT-DOMAINS.md`, all live-injected:** mike.md:2 (`misc-cleanup`→Wire Wizard), kilo.md:2 (`print-to-program`→CAM), foxtrot.md:2 (`tribal-knowledge`→Milling), india.md:2 (`post-processor`→AI-NN-GNN). **mike.md:25,31 routes wire-EDM (its OWN domain) to charlie** — silent-overwrite precursor. Root cause: 4 souls still anchor superseded JULIETT-12CHAT-ALLOCATION; echo/bravo/charlie already migrated. Fix = one soul-migration pass keyed off CHAT-SLOT-DOMAINS.md (closes P0 + echo/india dup P1 + JULIETT R7 P1). Owner alpha/golf.
- **golf write-allowlist asserted-but-unwired:** `golf-slot-write-allowlist`=0 refs all 3 settings.json (control reaper-guardian=2). Both CLAUDE.md copies claim "feature commits impossible by design" — golf commits touch .claude/scripts+hooks anyway. 2-line CLAUDE.md fix.

## P1
- **slot-worktree branches ≠ commit reality (R7):** chat-slots.json records slot/<name> but worktrees 2640-3570 behind HEAD; all 40 recent commits `[MAIN]` on shared tree. Lane guards arm on recorded branch not CWD → no-op. Decide: re-arm on CWD OR retire model + update CLAUDE.md.
- **session-consolidate-graph.mjs eats 8s timeout** (67.5% failure rate last-40) instead of `isMcpDown(readMcpState())` from mcp-state-check.mjs (lib already exports it). 8s × 67% × 26 slots Stop latency.
- **wiki↔tribal 17.1% coverage** (32630/39345 missing) post a3e6d3ca97 clobber. MUST shard 160MB index before `embed-missing-wiki-batch.mjs` (write-side V8 cap bit twice 2026-06-08).
- **galaxy-completeness-advisory.mjs orphaned 11d** (0 refs; header "NOT YET WIRED").

## SELF-IMPLICATING (bravo's own session work — honest correction)
- **34/34 galaxy gate can't discriminate** — zero failures = zero power. dormant-data tribal=104 but `dormant`=1/`dead-edge`=5(sierra's)/`unwired`=98(other galaxies) → 103/104 belong elsewhere. My commits 3ea4f40192 (added dead-edge,unwired KW) + 193814a781 (padded shop-floor/cad-fusion-live) are the mechanism. **The 34/34 driven to earlier this session was partly keyword-bleed + count-padding, not real coverage.**
- **20 engine memories = thin padding** grounded in PATHS.md that self-flags "NOT a hand-verified atlas". Delete them; keep the 3 genuinely-good shop-floor tribal tips.
- **rubric blind to synthesis staleness:** 7/8 galaxies have synthesis 2-5d older than MEMORY.md; check validates shape not mtime.
- **3 of 4 galaxy scripts untested; author-galaxy-domain-memories.mjs non-idempotent + unstable sort.**
- **Fix all of the above:** switch tribal/memory matching to frontmatter `galaxy:` tag (resolves gate + gaming + node_* asymmetry), add synthesisFresh check, revert dormant-data KW, add R9 tests.

## Top-5 ROI
1. soul-migration pass (CHAT-SLOT-DOMAINS.md canonical) 2. isMcpDown guard on session-consolidate-graph 3. golf CLAUDE.md 2-line fix 4. galaxy-completeness frontmatter-tag matching 5. shard tribal-index → embed-missing-wiki-batch.

## Couldn't verify (R12)
fleet lens's multi-host soul-contention (5 hosts on QuoteEstimatorEngine, papa→bravo AGENT_CHAT msg) — AGENT_CHAT timestamps not independently grounded. P2, no P0/P1 impact.
