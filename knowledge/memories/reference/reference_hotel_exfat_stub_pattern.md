---
name: reference_hotel_exfat_stub_pattern
description: A sub-500-byte engine .ts is an exFAT-corruption stub, not a real impl
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.146Z
aliases: reference_hotel_exfat_stub_pattern
---


A sub-500-byte engine .ts in PRISM is an exFAT-corruption stub awaiting restore, NOT a real implementation. BusinessSyncEngine.ts was the 1-of-1 (320 bytes -> restored to 5231B real impl with severity-ordered worstStatus aggregation, 18/18 tests; commit 1378d854aa bravo iter22). Before trusting a business engine, grep for <500-byte .ts files as stub candidates.
