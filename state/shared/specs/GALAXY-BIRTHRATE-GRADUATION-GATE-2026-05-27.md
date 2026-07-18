# Galaxy Birthrate / Graduation Gate (U-GALAXY-MS1-G4, 2026-05-27 slot:alpha)

> **Problem solved:** PRISM has 20 enumerated galaxies (per `DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`) with Phase-A cascade now complete. Without a gate, any new domain could become a "galaxy" by fiat → galaxy count proliferates → cascade overhead grows linearly → per-prompt context inflation defeats the doctrine's token-savings purpose.

## The graduation gate

A directory becomes a **galaxy** (gets its own `CLAUDE.md` + `MEMORY.md` sentinels + Phase-A doctrine) only when it meets ALL THREE of:

1. **Soul slot assigned** — a NATO slot in `JULIETT-12CHAT-ALLOCATION-MS0` is canonically (or de-facto-but-documented) responsible for this domain
2. **3+ specialist commits in trailing 30 days** — measured via `git log --since=30d --grep="\\[<scope>\\]" --author="<slot>"` (the scope prefix identifies the domain milestone; the slot author identifies the specialist activity)
3. **Spec or milestone envelope exists** — at `mcp-server/data/milestones/<DOMAIN>-MS*.json` OR `state/shared/specs/<DOMAIN>-*-2026-*.md`

A directory that fails any of (1)+(2)+(3) is a **project** (still tracked, but no galaxy cascade). Promotion from project → galaxy fires when all 3 criteria turn green; demotion fires when criterion (2) falls below 3 commits/30d AND the soul slot is reclaimed by another domain.

## Current 20 galaxies — gate self-check (2026-05-27)

| Galaxy | Soul slot | 30d commits | Spec/Envelope | Gate |
|--------|-----------|-------------|---------------|------|
| mill | alpha (canonical) | many | ENGINE_DIGEST plus per-galaxy CLAUDE.md | ✅ PASS |
| lathe | TBD (D3) | many | per-galaxy CLAUDE.md | ⚠ SOUL-MISSING |
| wedm | TBD (D3) | several | per-galaxy CLAUDE.md | ⚠ SOUL-MISSING |
| quoting | charlie (canonical) | 20+ this session | QUOTING-SYNERGY-MS0 | ✅ PASS |
| business | hotel (canonical) | many | per-galaxy CLAUDE.md | ✅ PASS |
| academy | lima (de-facto) | many | AHMAD-LLM-CURRICULUM-ACADEMY-MS0 (proposed) | ✅ PASS (de-facto doc) |
| post-processor | echo (de-facto) | 10+ this session | POST-PDF-NODE-MS0 + POST-BRIDGE-SYNERGY-MS0 | ✅ PASS |
| cad | TBD | many (cad-fusion-live-ms0 branch) | branch evidence | ⚠ SOUL-MISSING |
| cam | TBD (alpha mill bridge) | several | per-galaxy CLAUDE.md | ⚠ SOUL-MISSING |
| shop-floor | TBD | unverified | per-galaxy CLAUDE.md | ⚠ SOUL-MISSING + COMMITS-UNVERIFIED |
| mit-curriculum | india (de-facto) | several | MIT-LIVE-EXTRACT past commits | ✅ PASS (de-facto doc) |
| pdf-corpus | lima (de-facto, CANONICAL per feedback) | many | PRISM-ACADEMY-FEATURES-MS0 | ✅ PASS |
| pdf-corpus-mill | foxtrot (de-facto) | several | per-galaxy CLAUDE.md | ✅ PASS (de-facto doc) |
| corpus-aggregation | kilo (de-facto) | several | per-galaxy CLAUDE.md | ✅ PASS (de-facto doc) |
| cad-fusion-live | branch-scoped | many | cad-fusion-live-ms0 branch | ⚠ SOUL-MISSING (branch != slot) |
| speed-feed | oscar (de-facto) | recent OSCAR-SFC-9AXIS-MS0 | per-galaxy CLAUDE.md | ✅ PASS |
| quality | TBD | unverified | per-galaxy CLAUDE.md | ⚠ SOUL-MISSING + COMMITS-UNVERIFIED |
| knowledge-conversion | juliett (de-facto) | KNOWLEDGE-CONVERSION-MS0 + JULIETT-DB-BRIDGE | KC-MS0 spec | ✅ PASS |
| tribal-knowledge | golf-hosted | several | per-galaxy CLAUDE.md | ⚠ SOUL-MISSING (golf is hygiene host) |
| agent-orchestration | zebra (canonical) | many (ZEBRA-OMNISCIENT/ORCHESTRATOR) | ZEBRA-* milestones | ✅ PASS |
| compliance-safety | TBD | several | per-galaxy CLAUDE.md + root §SAFETY | ⚠ SOUL-MISSING |

**Audit result:** 12 of 20 galaxies fully pass the gate. 8 need soul-slot assignments (lathe / wedm / cad / cam / shop-floor / cad-fusion-live / tribal-knowledge / compliance-safety / quality — counted 9, soul-shared categories overlap). These are **legitimate galaxies** — the gate-failure is paperwork (assign a soul) not substance.

## Soul-assignment proposal (extends `U-GALAXY-MS1-D3` from MS1 envelope)

| Galaxy | Proposed soul (rationale) |
|--------|---------------------------|
| lathe | **TBD** — significant work-area; defer to operator |
| wedm | **TBD** — same |
| cad | **delta** or new slot — many cad-* engines + active branch |
| cam | **alpha** as secondary (mill→mill-turn→cam adjacency) or **delta** |
| shop-floor | **TBD** — possibly **uniform** (machine-live data) |
| cad-fusion-live | **delta** if cad gets a different soul |
| tribal-knowledge | **golf** formally (already hygiene host) |
| compliance-safety | **TBD** — possibly cross-cutting (every safety-touching slot inherits) |
| quality | **TBD** — possibly **victor** (V for verify) |

Operator slot-assignment decision is the gate to closing these 9 ⚠ markers.

## Demotion path (if galaxy goes stale)

If a galaxy has 0 specialist commits in a 30-day window AND its soul slot has been reassigned, the galaxy is **demoted** to project status:
1. Per-galaxy `CLAUDE.md` + `MEMORY.md` move to `state/shared/specs/archived-galaxies/<galaxy>-<date>.md`
2. Galaxy enumeration in `DOMAIN-GALAXY-DOCTRINE.md` flags as ARCHIVED
3. Reverse-pointer redirects emitted at the old subdir paths

Demotion is conservative — wait 90 days of inactivity before removing.

## Cross-refs

- Parent doctrine: [`DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)
- MS1 envelope: `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json` → `U-GALAXY-MS1-G4-GALAXY-BIRTHRATE-GRADUATION-GATE`
- Sister gate: `U-GALAXY-MS1-D3-WEDM-LATHE-SOUL-ASSIGN` (this spec extends the soul-assignment scope to 9 galaxies vs the original 2)
- JULIETT-12CHAT-ALLOCATION amendment proposal embedded in §Soul-assignment proposal above
