---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-013
title: JM Die offset cascade verification — H-values must strictly decrease per pass
category: quality
domain: process_engineering
knowledge_type: tip
confidence: 96
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "h-register", "offset", "cascade", "quality-check", "anti-pattern", "operation:roughing", "operation:edm"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: da950f30c9d1ce688cbafee7f6c38a1eb000ba3df85519b2f653b4da8b485191
mirror_ts: 2026-05-05T13:36:00.831Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die offset cascade verification — H-values must strictly decrease per pass

**Category:** `quality` · **Domain:** `process_engineering`

**Confidence:** `96` · **Source:** `jm_die_production_analysis`

## Tip

A critical quality check for any JM Die wire EDM program: H-register offset values must strictly decrease from rough to final skim. Typical cascade: H1=0.0085 > H2=0.0068 > H3=0.0059 > H4=0.0054 (inches). If any H-value equals or exceeds the previous pass, the wire will re-cut the same material or leave stock — both cause quality issues. The neural analysis engine flags 'AP003: Offset increases between passes' as a major anti-pattern. When reviewing programs, verify: H[n+1] < H[n] for all passes. The decrement between passes should be 0.0005-0.0015" — smaller decrements are fine for precision, but larger decrements indicate missing passes.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-016|JM Die program quality scoring — 4 factors: completeness, correctness, optimization, safety]] _(category+op:1+tag:3)_
- [[wedm-kb-019|Taper accuracy: skim passes are critical]] _(category+op:1+tag:3)_
- [[wedm-kb-011|Recast layer thickness determines part integrity]] _(category+op:1+tag:2)_
- [[jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]] _(op:1+tag:5)_
- [[jm-die-012|JM Die tungsten carbide — zinc-coated wire mandatory, E952+E56xx ACU sequence]] _(op:1+tag:4)_

## Tags

#wire-edm #jm-die #h-register #offset #cascade #quality-check #anti-pattern #operation-roughing #operation-edm
