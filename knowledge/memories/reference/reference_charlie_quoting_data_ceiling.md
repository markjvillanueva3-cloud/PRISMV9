---
name: reference_charlie_quoting_data_ceiling
description: Quoting gotcha
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.512Z
aliases: reference_charlie_quoting_data_ceiling
---


QUOTING-SYNERGY-MS0 iter56-59. The DocuStrata corpus (111,745 docs, 72% SCAN_GENERIC) is INBOUND customer engineering prints — NOT JM Die's outbound revenue (which lives in ERP/accounting). So a synth-only training baseline has a real data ceiling: iter58 MAPE 71.1%, factor 0.5845; iter59 overlaying 10 hand-curated invoices changed nothing (0/10 matched — the curated invoices used fictional part_ids like AF-102-05 absent from iter56's real corpus, which uses file-derived ids like R910).

**R12 discipline:** report the data-limited result honestly — never dress up MAPE. The structural fix (real outbound revenue) needs `AccountingHardeningEngine`/ERP connector (next bottleneck: U-QP-ACCOUNTING-WIRE) or re-curating with real corpus part_ids (U-QP-CURATE-WITH-REAL-PART-IDS).
