---
title: "Holder lesson: BCV is BIG-PLUS CAT, not BT (data-bug class)"
type: lesson
domain: database-expansion
created: 2026-06-01
by: claude-a6304a93 (slot:juliett)
commit: f544da914f
tags: [holder, big-plus, big-daishowa, data-bug, categorization, cross-cam]
---

# BCV = BIG-PLUS **CAT**, not BT

## The fact (BIG DAISHOWA, the BIG-PLUS inventor)
- **BBT** = BIG-PLUS on a **BT** taper (JIS B6339 / MAS 403).
- **BCV** = BIG-PLUS on a **CAT** taper — `CV` is BIG DAISHOWA's notation for the **CAT V-flange** (ANSI B5.50). BCV is therefore a CAT-family holder, **not** BT.
- **BIG-PLUS®** = dual contact: simultaneous steep-taper register + spindle gauge-**face** contact. Backward-compatible — a BIG-PLUS holder in a standard (non-BIG-PLUS) spindle runs taper-only.

## The bug we found and fixed
`mcp-server/data/prism-reference-db/holders.json`, store `PRISM_BIG_DAISHOWA_HOLDER_DATABASE.tapers`: records `BCV40`/`BCV50` carried `interface:"BT40"/"BT50"`, `name:"BIG-PLUS BT40/50"`, and BT pull-studs (`MAS403`/`JIS B6339`). Every field had been **copy-pasted from a BT record** and only the key swapped. Corrected to `interface:"CAT40"/"CAT50"`, `name:"BIG-PLUS CAT40/50"`, `pullStudOptions:["ANSI B5.50"]` (the CAT retention-knob standard).

**Independent confirmation:** the 131 `BCV40-HDC.*` / `BCV40-MEGA.*` part numbers in the separate `HOLDER_DATABASE.holders` store are real BIG DAISHOWA CAT40 BIG-PLUS part numbers and already resolve to CAT — so the `tapers.BCV*` records were the outliers, not the truth.

## Why it mattered
A workflow synthesis briefly canonized "BCV→BT per live data" — i.e. it would have baked the data bug into the categorization logic. An adversarial critic caught it (cited BIG DAISHOWA nomenclature). **Lesson: when live data and a manufacturer standard disagree, the standard wins — and the data is the thing to fix.** Verify a single-source data point against the manufacturer before treating it as ground truth, especially a taxonomy axis other code will key off.

## The durable guard
`mcp-server/src/data/holder-categorization.ts` classifies `BCV→CAT` from the designation token alone (independent of the data field), and its 25 tests include a regression guard asserting `normalizeHolderDesignation("BCV40").interface === "CAT"` (and `!== "BT"`). Re-introducing the inversion fails the suite.

See: [[reference_holder_taper_contact_categorization_2026_06_01]] · spec `state/shared/specs/TOOL-HOLDER-DB-ORGANIZATION-FOR-ROMEO.md`.
