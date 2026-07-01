# TRIBAL+WIKI Coverage Matrix — Victor Audit (2026-05-27 iter-1)

> **Slot:** victor · **Goal:** `assess current state of tribal knowledge and wiki across all main domains for the prism app` → enable closed-loop self-learning / self-improving plan.
>
> **Iter-1 deliverable:** comprehensive 25-domain coverage matrix from filesystem counts. No subjective narrowing — every domain enumerated per comprehensive-build directive.
>
> **Iter-2 follows:** parallel Explore agents on the bottom-tier domains.

---

## Surface totals (2026-05-27)

| Surface | Count | Location |
|---------|------:|----------|
| Wiki entries (total) | **37,243** | `knowledge/wiki/**/*.md` |
| Tribal canonical (filtered) | **2,639** | `knowledge/wiki/code-tribal/**/*.md` |
| Memory files (Obsidian mirror, H:) | **10,847** | `knowledge/memories/**/*.md` |
| Memory files (auto-memory, C:) | **742** | `C:/Users/wompu/.claude/projects/H--PRISM/memory/*.md` |
| Engine galaxies (with sentinel CLAUDE.md) | **20** | `mcp-server/src/engines/<galaxy>/CLAUDE.md` |
| Engine galaxies (with ENGINE_DIGEST) | **10** | `mcp-server/data/docs/galaxies/<galaxy>/ENGINE_DIGEST.md` |

Note: CLAUDE.md headline counts (`722 wiki entries`) reference an older `wiki/index.md` snapshot. Live `find` total is 37,243 — the index file does NOT enumerate every entry. The 722 number is **stale** and should be re-derived for any planning that depends on it.

---

## 25-domain coverage matrix

Per the operator's /goal enumeration. **Columns:** wiki (filename-match), tribal (`code-tribal/*<dom>*.md`), memory H:, memory C:, galaxy-digest (ENGINE_DIGEST.md size in lines, "—" if no galaxy).

| # | Domain | Wiki | Tribal | Mem H: | Mem C: | Galaxy digest | Tier |
|--:|--------|-----:|-------:|-------:|-------:|--------------:|:----:|
| 1 | milling / mill | 1308 / 220 | 53 | 304 | 2 | **189** | GREEN |
| 2 | lathe / turning | 1327 / 527 | 25 | 364 | 33 | **210** | GREEN |
| 3 | wire-EDM (wedm) | 1213 / 6 | 67 | 344 | 11 | **175** | GREEN (naming split: `wedm` vs `wire-edm`) |
| 4 | post processors | 47 | 50 | 304 | 102 | **120** | YELLOW |
| 5 | speed/feed calculator (SFC) | 96 + 52 (speedfeed) | 15 + 3 (speed) | 13 | 3 | speed-feed sentinel only | YELLOW |
| 6 | engineering | (not in keyword list — covered by sub-domains) | — | — | — | — | DERIVED |
| 7 | CAD 2D sketching | (rolled into CAD) | — | — | — | — | INSIDE CAD |
| 8 | CAD 3D modeling (mesh/surfaces/asm/contour/aerospace/robotics) | 2398 | 274 | 997 | 35 | **116** | GREEN-overall, but sub-buckets unaudited |
| 9 | CAM programming (settings/macros/templates/entry-boxes) | 4161 | 28 | 2446 | 17 | **77** | GREEN-overall, but tribal-thin (28 tips for the heaviest engine surface — drift signal) |
| 10 | quoting | 79 + 222 (quote) | 58 | 13 | 10 | **30** | YELLOW |
| 11 | shop-floor management | **9** | **4** | 38 | 3 | **18** | RED |
| 12 | business management | 504 | 3 | 462 | 1 | **51** | YELLOW (large memory, thin tribal) |
| 13 | accounting (QuickBooks) | 12 / **2** | **0** / **0** | mem not searched | 0 | (inside business) | RED |
| 14 | file digest / Evernote redistribution | **0** | **0** | **0** | **0** | — | RED — TRUE GAP |
| 15 | scheduling | 53 | **1** | 7 | 0 | — | RED-ORANGE |
| 16 | HR | 319 | 22 | (inside business) | — | (inside business) | YELLOW |
| 17 | ERP (E2) | 444 + 90 (e2) | 9 + 8 (e2) | 68 | 3 | — | YELLOW |
| 18 | payroll | 23 | 3 | (inside HR/business) | — | (inside business) | ORANGE |
| 19 | logistics | **0** | **0** | (not searched) | 0 | — | RED — TRUE GAP |
| 20 | audits | 426 | 99 | 149 | 31 | — | GREEN-content, no galaxy |
| 21 | OSHA | 14 | **1** | **0** | 0 | — | RED |
| 22 | ISO certification | 207 | 6 | (inside business) | — | (inside compliance-safety sentinel) | YELLOW |
| 23 | purchasing | 24 | **0** | 6 | 0 | — | RED-ORANGE |
| 24 | maintenance | 53 | **0** | 13 | 0 | — | ORANGE |
| 25 | alarms / troubleshooting | 128 + 41 | 1 + **0** | 3 | 0 | — | ORANGE (heavy controller-error surface unindexed in tribal) |

---

## Confirmed structural findings

1. **Naming split — `wedm` vs `wire-edm`**: 1213 vs 6 wiki entries. Two filename conventions for the same domain — search recall is forked. Closed-loop plan should pick one canonical slug and add aliases / rename.
2. **CAM tribal under-indexed**: CAM has 4161 wiki + 2446 memory but only **28 tribal tips**. The richest engine surface (cam galaxy) has the thinnest tribal layer — operator+macro+template knowledge isn't landing in canonical tribal.
3. **Shop-floor galaxy is a stub**: 9 wiki + 4 tribal + 18-line digest. Currently an "honest stub" per alpha's MS1 work. This is the slot that was originally pre-assigned to november for refine — still open.
4. **Business galaxy has 462 memory files but 3 tribal**: massive memory surface unpromoted to tribal canonical. Tribal extraction pipeline is silent on the business cluster.
5. **TRUE GAPS — 0/0/0 coverage**: `logistics`, `evernote/file-digest`. These are domains the operator explicitly named that have no wiki, no tribal, no memory presence at all.
6. **Galaxies missing for 8 operator domains**: scheduling, HR, ERP, payroll, logistics, audits, purchasing, maintenance — none have a `mcp-server/src/engines/<dom>/` sentinel or `data/docs/galaxies/<dom>/` digest. These either live inside `business/` or are unrepresented at engine layer.
7. **Compliance-safety sentinel exists** but no ENGINE_DIGEST for it (compliance/OSHA/ISO/audits aggregation gap).

---

## Bottom-tier (RED) for iter-2 deep scan

Five domains will receive parallel Explore agents in iter-2:

1. **logistics** — true greenfield. Verify it's not hidden under another name (shipping? supply-chain?).
2. **evernote / automatic file digest** — confirm no existing OCR/ingest/redistribute engine. Check `pdf-corpus*`, `knowledge-conversion`.
3. **shop-floor** — alpha left this as a refine target. Need to deep-scan MachineLive*+Traveler* sources to extract concrete gotchas.
4. **accounting / quickbooks** — operator named QuickBooks specifically. Check `business/` for QBO connector engines.
5. **alarm + troubleshoot** — controller-error knowledge (Fanuc/Heidenhain/Haas alarm codes) is presumably in machine manuals but not indexed to tribal. High-leverage closed-loop input.

Iter-3 will synthesize the closed-loop plan referencing these scans + the gap profile.

---

## Loop-state

- **iter:** 1/4
- **started:** 2026-05-27 (slot:victor session `65997de2`)
- **next:** dispatch 5 parallel Explore agents on the RED-tier domains
- **eventual deliverable:** `CLOSED-LOOP-TRIBAL-WIKI-PLAN-VICTOR-2026-05-27.md` with concrete roadmap units (engine + dispatcher + test + wiring per domain) and self-improvement triggers (re-ingest signals, auto-prune stale).

— Generated by slot:victor, /loop iter 1, 2026-05-27.
