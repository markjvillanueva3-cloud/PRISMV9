---
name: reference_holder_taper_contact_categorization_2026_06_01
description: Canonical CAM-agnostic holder axis — separates CAT/BT by taper size AND contact type (taper-only vs dual-contact/BIG-PLUS); BCV=CAT data-bug fix.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.143Z
aliases: reference_holder_taper_contact_categorization_2026_06_01
---


**Holder taper×contact categorization** (slot:juliett, 2026-06-01, commit `f544da914f`, U-HOLDER-TAPER-CONTACT-CATEGORIZATION).

`mcp-server/src/data/holder-categorization.ts` (+25 real-value tests in `src/__tests__/`) is the CAM-agnostic holder axis — sibling of `tool-material-categorization.ts` (ISO 513). Built for romeo's Fusion tooling DB; ports 1:1 across Fusion/hyperMILL/Mastercam/Esprit. Exports: `CAT_TAPER_SIZES=[30,40,45,50,60]`, `BT_TAPER_SIZES=[30,35,40,45,50]`, `SK_TAPER_SIZES=[30,40,50]` (only DB-present sizes — no fabricated CAT35/BT60), `normalizeHolderDesignation(text)`, `categorizeHolder(input)`, `HolderCategorySchema` (zod).

**Two sub-axes** the operator asked for: (1) taper size 30/35/40/45/50/60; (2) contact type — `taper_only` (plain CAT/BT/SK steep register) · `dual_contact_big_plus` (BIG-PLUS®: simultaneous taper + spindle gauge-FACE) · `inherently_dual` (HSK/CAPTO/KM/PSC, dual by design) · `unknown` (fail-loud).

**BIG DAISHOWA designations (authoritative, adversarially verified):** `BBT` = BIG-PLUS on a **BT** taper (JIS B6339); `BCV` = BIG-PLUS on a **CAT** taper (CV = CAT V-flange, ANSI B5.50 — **NOT BT**). Dominant real signal in the corpus = a record's `taper` field carrying a `*_bigplus` suffix (`cat40_bigplus`) — most dual-contact holders keep a plain "CAT40" designation, so `categorizeHolder` reads the taper/name/description, not just the key. `bigPlusLicensed` set ONLY from an explicit flag — never inferred (a BIG-PLUS holder in a standard spindle runs taper-only; inferring a license = false-safety claim). Parser is start-anchored + longest-BIG-PLUS-first so BBT/BCV never leak into bare BT/CV; size-validity gate yields `taperSize:null` for out-of-range; unparseable → null / `{unknown,unknown}`.

**Data-bug fixed (same commit):** `holders.json` store `PRISM_BIG_DAISHOWA_HOLDER_DATABASE.tapers` had `BCV40`/`BCV50` mislabeled `interface:"BT40"/"BT50"` with BT pull-studs (MAS403/JIS B6339) — a copy-paste-from-BT bug. Corrected to `interface:"CAT40"/"CAT50"` + `["ANSI B5.50"]` pull-stud. Independent confirmation: the 131 `BCV40-*` part numbers in `HOLDER_DATABASE.holders` are real BIG DAISHOWA CAT40 BIG-PLUS part numbers and already resolve to CAT. See [[reference_tool_material_categorization_2026_06_01]] for the material sibling; spec `state/shared/specs/TOOL-HOLDER-DB-ORGANIZATION-FOR-ROMEO.md`. Lesson [[holder-bcv-is-cat-not-bt]].
