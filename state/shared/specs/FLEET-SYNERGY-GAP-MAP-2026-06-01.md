# FLEET-SYNERGY GAP MAP — 34-Galaxy Master-Brain Wiring Audit (2026-06-01)

> Produced by the `fleet-synergy-audit` Workflow (8 agents, run `wf_a4f7e4a2-5e4`, slot:bravo) for the goal:
> *"wired to all applicable nodes and galaxies then to the master brain, synergized obsidian + psn + system-viz + prism-awareness + memories + wiki + tribal."*
> **Advisory / human-verify.** All `scripts/*.mjs` paths are EXISTING edit targets, not new files.

## Headline — the master-brain link is COMPLETE fleet-wide

- **All 34 galaxies are wired on the 3 load-bearing connection legs:** (1) master-index back-pointer (`[galaxy:<g>]` row in master `MEMORY.md`), (2) memories (`engines/<g>/MEMORY.md` with `## Master-brain link` + `Last master-sync`), (6) PSN/octopus brain-dir RAG. **The master-brain CONNECTION itself is done.**
- `galaxy-verify.mjs --all` reads "0 PASS / 24 FAIL" but that is **corrupted by a broken wiki heuristic** (see §1). Backing it out: 3 galaxies are 7/7 (cad/delta, mill/foxtrot, lathe/whiskey), most are 5/7, and ~9 are the genuine 4/7 tail. The remaining fails degrade **searchability / self-awareness polish**, NOT the brain link.

## §1 — `>=3 wiki refs` FAIL is a BROKEN HEURISTIC (not a real gap), and the obvious fix is ALSO wrong

`scripts/galaxy-verify.mjs:50-52` greps `knowledge/wiki/index.md` for the lowercase galaxy slug as a **whole word** (`\b${g}\b`). The index keys entries by **CamelCase engine class names** (`[[CADAdapterRegistry]]`), so the slug never appears as a whole word → returns **0 for ALL 26 galaxies**, including demonstrably-mature ones (token-optimization, hermes-zulu, cad). Evidence: `\bcad\b`=0 but substring `cad`=64 hits; `\bmill\b`=0 but `mill`=10.

**The workflow's proposed one-line fix (`src/engines/<g>/`) is VERIFIED WRONG** (bravo, 2026-06-01): engines live FLAT at `src/engines/<EngineName>.ts`, NOT under per-galaxy dirs — `grep -c "src/engines/hermes-zulu/" index.md` = **0** (also mill/cad/quoting = 0), while `src/engines/` appears 576× (flat engine paths). So matching `src/engines/<galaxy>/` still returns 0.

**Correct fix needs a galaxy→engine→wiki mapping** (the index has no per-galaxy source paths). Options for the tool owner:
1. Build/consume a galaxy→engine-class list (from each galaxy's `PATHS.md` or a registry), then count wiki/index.md entries for those engine classes. (Correct, more work.)
2. Interim: count wiki entries whose resolved `source:` lives under the galaxy — requires the index to carry per-engine source paths mapped to galaxies (it does carry `src/engines/<EngineName>.ts`, but galaxy ownership of each flat engine is not encoded in the index).
3. **Do NOT** drop `\b` to a bare substring match — it over-matches (`cad`→`Decade`, `CADAdapter`) and yields false PASSes; a false PASS on a verification tool is worse than the current honest false FAIL.

→ Until fixed, treat `>=3 wiki refs` FAILs as **measurement noise**, not content gaps. Do NOT seed fake wiki entries to chase the metric.

## §2 — Real systemic gaps (per-owner, MEMORY.md template drift)

| Gap | Count | Nature | Lane |
|-----|-------|--------|------|
| `## Known failure modes` (non-empty) | 21 | template drift | owning slot |
| High-ROI/Indexed pointers ≥10 | 17 | template drift | owning slot |
| `## Initial state` | 17 | template drift | owning slot |
| cross-galaxy bridges section | 11 | template drift | owning slot |
| `closed-loop-with-india` block (CLAUDE.md) | 4 (fleet-hygiene, database-expansion, frontend-app papa+quebec) | template drift | owning slot |
| soul `domain_filter != any` | 4 (golf, oscar, papa, quebec) | soul polish | owning slot |

## §3 — system-viz node omissions (sierra/golf lane — existing-file edits)

- **(a)** `database-expansion` absent from `scripts/generate-galaxy-features.mjs` GALAXIES array → add slug + SOUL_MAP `"database-expansion":"juliett"`.
- **(b)** meta-galaxies (frontend-app, wiring, system-viz, discovery, bug-hunting) lack an `eng.<slug>` rollup → `scripts/generate-galaxy-constituents.mjs` collapses them into `eng.other`; make it consult `slot-galaxy-map.mjs`.
- **(c)** `fleet-hygiene` missing from the same GALAXIES array → same one-line add.

## §4 — bravo (hermes-zulu) — DONE this session (`U-FLEET-GALAXY-BRAVO-WIRE`)

✓ `## Known failure modes` (renamed from `## Known regression classes`) · ✓ `## Initial state` added · ✓ High-ROI pointers 8→11 (octopus-consensus pointers) · ✓ `Last master-sync` → 2026-06-01. Remaining: the `>=3 wiki refs` fail = the §1 broken heuristic (NOT a content gap — hermes-zulu's engines ARE in the wiki index). galaxy-verify bravo: FAIL(4) → FAIL(1, the heuristic).

## §5 — Routing (AGENT_CHAT; NOT bravo's lane)

- **§1 `galaxy-verify.mjs` heuristic** → golf / infra slot. **Highest-leverage single fix** (needs the galaxy→engine map per §1; the obvious fix is verified-wrong). Flips ~22 false fails once correct.
- **§3 system-viz GALAXIES-array + constituents** → sierra (constituents) / golf or juliett (features array).
- **§2 template-drift sections + souls + india-block** → each owning slot (mechanical clone-and-tune from `MASTER-BRAIN-TEMPLATE.md`).
- **backend-helper slot-map conflict** (`slot-galaxy-map.mjs` papa) → golf/operator.
- **SHIPPED-but-unsurfaced scaffolds** (knowledge-conversion, mit-curriculum, tribal-knowledge) → juliett / india / uniform.

**Bottom line:** master-brain link is complete (all 34 on legs 1/2/6). The "0 PASS" is misleading — the §1 heuristic fix (with the correct galaxy→engine mapping) is the highest-leverage action and is golf/infra's lane. bravo's own galaxy is wired (§4).
