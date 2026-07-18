# GALAXY OBSIDIAN-BRAIN AUDIT — 2026-05-28

> **Produced by:** dynamic-workflow `wf_ff92b952-169` (17 agents, 3.97M tokens, 134 tool-uses, 17 min) — first real test of the Claude Code dynamic-workflows feature in PRISM.
> **Scope:** does each domain galaxy have a WORKING Obsidian brain bidirectionally connected to the master PRISM brain, and does the galaxy-buildout generator/brief/build-kit mandate it?
> **Owner:** slot:alpha (Obsidian-brain domain owner, operator-designated this session — [[project-alpha-owns-obsidian-brain]]).
> **Verdict:** `declared-not-working` on 2 of 4 connection axes → FIXED at the generator + template level this session.

---

## Brain connection model (the truth, verified against the live generator + 34 galaxy MEMORY.md files)

| Axis | Direction | Before | After this session |
|------|-----------|--------|--------------------|
| **PULL** | master → galaxy | ✅ mandated (STEP 5a + FAIL 7) | ✅ unchanged |
| **PUSH** | galaxy → master (by type) | ✅ mandated (STEP 5b + FAIL 9, via `stop-obsidian-memory-feed.mjs`) | ✅ + sync-stamp cadence (STEP 5b) |
| **MASTER-INDEX back-pointer** | master → galaxy (discovery) | ❌ **entirely absent** — master index blind to every galaxy brain | ✅ STEP 5d + FAIL 12 + master MEMORY.md registry |
| **RECALL round-trip** | proof | ❌ never verified (gate checked presence only) | ✅ FAIL 13 (header + sync-stamp) + CONN-5 advisory |

**Key reframe:** knowledge was always *reachable* (galaxy sentinels keyword-search the flat `knowledge/memories/<type>/` dirs — no brain severed). The gap was that the master index never learned the per-galaxy brains existed, and recall was never proven. Both closed.

---

## Confirmed findings (5/5 passed adversarial verify, 0 refuted)

| # | Finding | Severity |
|---|---------|----------|
| **A1** | Generator mandated 2 of 4 connection criteria — PULL + PUSH enforced; master-side back-pointer + recall verification missing | P1 → FIXED |
| **A2** | master→domain works at TYPE level, never reaches per-galaxy namespaces; `migrate-memories-to-galaxies.mjs` MISSING (only dry-run classifier shipped) | P1 → DEFERRED (see D1) |
| **A4** | Doctrine (DOMAIN-GALAXY + BUILD-KIT) only implies "have a MEMORY.md", never specifies WORKING + CONNECTED | P1 → doc-reflection follow-up |
| **A5** | 0/34 galaxy MEMORY.md files carry a `## Master-brain link` header or `Last master-sync` stamp — birth-snapshot rot risk | P1 → template + generator fix |
| **A6** | Runtime cascade partially live: `tribal-by-domain-inject` + `pre-edit-galaxy-cascade-inject` wired, but cascade injects CLAUDE.md head only (not MEMORY.md) | P2 → noted |

---

## Shipped this session (slot:alpha, the Obsidian-brain owner)

1. **`state/shared/specs/MASTER-BRAIN-TEMPLATE.md`** — the canonical alpha-owned working-connected-brain pattern (4 axes + clone-and-tune protocol + CONN-1..5 gate). The deliverable: every other slot clones + fine-tunes this, does not re-derive.
2. **`scripts/generate-per-slot-galaxy-buildout-files.mjs`** — CHANGE 1-5: `## Master-brain link` header requirement, fixed STEP 5c (galaxy index) + new STEP 5d (master back-pointer), FAIL 12 (back-pointer gate) + FAIL 13 (header/sync-stamp gate), STEP 5b sync-stamp cadence, brain step points at the template. Bumped 11→13 artifacts.
3. **24 regenerated briefs** — each now mandates the connected brain (6 connection-content matches per brief, verified).
4. **Alpha's own galaxy compliant** — `engines/token-optimization/MEMORY.md` has the `## Master-brain link` header; master `MEMORY.md` `## Indexed memories` has the `[galaxy:token-optimization]` back-pointer (CONN-4 closed). Owner eats its own dogfood; first compliant exemplar.
5. **Kernel → alpha** — COMMAND-KERNEL-MS0 (PSK, the brain/OS syscall substrate) assigned to alpha; 28/29 done, only **U-CK11** open (scrutiny pass) → close-out debt. Appended to alpha's queue (does not preempt current work).

## Operator decisions (taken)
- **D1 — migrator deferred (brief-only now).** `classify-memories-by-galaxy.mjs` misroutes ~79% to `business` / 1 to `mill` (additive-keyword over-match) — the migrator can't ship correctly until the classifier is fixed. Per-galaxy dirs stay an aspiration; flat-type keyword search is the working path. **Classifier bug logged as a real regression below.**
- **D2 — generation-time PULL sufficient for launch.** Per-session re-pull is doctrine-mandated (sync-stamp) but not a hard commit gate.
- **D3 — keep type-based feed** for launch (cheapest, already wired).
- **D4 — regenerate 24 briefs now.** Done.

## Re-runnable verification channel (forge-audit-v3 META artifact)
```bash
# Generator-level (expect: >=2 / matches / 0)
grep -c 'master MEMORY.md\|Master-brain link' scripts/generate-per-slot-galaxy-buildout-files.mjs   # >=2 (was 0)
grep -cE 'FAIL 12|FAIL 13' scripts/generate-per-slot-galaxy-buildout-files.mjs                       # 2
grep -c 'H--PRISM' scripts/generate-per-slot-galaxy-buildout-files.mjs                               # 0 (must stay lowercase)
# Per-galaxy CONN-1..5 — see state/shared/specs/MASTER-BRAIN-TEMPLATE.md
```

## Dynamic-workflow lesson (first PRISM use of the feature)
- **`agentType: 'Explore'` is incompatible with `schema`.** Explore is a read-only prose-return agent; the harness withholds the `StructuredOutput` tool from it, so a schema-constrained call can never complete (v1 run: 12 agents, 0 tokens, 0 tool-uses, clean fast-fail). **Use the default workflow agent for any schema-constrained call.**
- Even with the default agent, the 5 `parallel()` map readers + 1 auditor still failed StructuredOutput (stochastic 2-nudge limit on large prose reads) while identical-setup `pipeline()` auditors succeeded. **Mitigation:** keep schema-agent prompts tight, append an explicit "You MUST call StructuredOutput before finishing", and design phases to be resilient to partial map failure (the auditors were self-sufficient — read their own files — so the run produced 5 confirmed findings despite 0 maps).

## Deferred doc-reflection follow-up (R12 — flagged, NOT silently dropped)
1. BUILD-KIT + DOMAIN-GALAXY-DOCTRINE prose additions (the 9 bidirectional-brain sentences from the synthesis) — the template + generator are self-contained, so this is reinforcing not load-bearing.
2. CLAUDE.md §OBSIDIAN-BRAIN-OWNERSHIP line (alpha owns brain + template + kernel) + `## Recent regressions` entry.
3. **Real regression to fix:** `classify-memories-by-galaxy.mjs` 79%-to-business misroute (blocks the migrator). Candidate unit `U-BRAIN-CLASSIFIER-FIX`.
4. The 23 non-alpha galaxies adopt the `## Master-brain link` header on their next galaxy-buildout (clone-and-tune via the regenerated briefs) — not retrofitted en masse here.

## Recent regression (CLAUDE.md back-flow)
- 2026-05-28 | per-galaxy Obsidian brains were `declared-not-working` — master index blind to every galaxy brain (no back-pointer), recall never verified, 0/34 MEMORY.md had a master-link header | fix: MASTER-BRAIN-TEMPLATE + generator CHANGE 1-5 + alpha exemplar | observed-by: wf_ff92b952-169 (slot:alpha)
- 2026-05-28 | `classify-memories-by-galaxy.mjs` misroutes ~79% of memories to `business` (additive keyword over-match) — blocks `migrate-memories-to-galaxies.mjs` | fix: DEFERRED (U-BRAIN-CLASSIFIER-FIX) | observed-by: wf_ff92b952-169

_Audit by slot:alpha session a198ff5f, 2026-05-28._
