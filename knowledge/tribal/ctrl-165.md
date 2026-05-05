---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-165
title: Siemens 840D PROC / ENDPROC — structured subroutine programming with typed parameters
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: heuristic
confidence: 91
source: controller:siemens_840d_sinumerik_manual
created_at: 2026-04-15
usage_count: 0
tags: ["siemens", "840d", "proc", "endproc", "subroutine", "spf", "parameters", "structured-programming", "m17", "ret", "operation:drilling", "tool:drill", "controller:fanuc", "controller:siemens"]
material_groups: []
operation_types: ["drilling"]
content_hash: 9b023fa86abc21acf26f19d5c79432dfddf6a13d3f5298237ffa2d9022380281
mirror_ts: 2026-05-05T13:36:01.225Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens 840D PROC / ENDPROC — structured subroutine programming with typed parameters

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `91` · **Source:** `controller:siemens_840d_sinumerik_manual`

## Tip

840D subroutines use PROC and ENDPROC keywords to define named procedures with typed parameter passing. Syntax: PROC MySubr(REAL _X, INT _N, STRING[32] _NAME) at the top of the .spf file. Parameters are passed by value; use VAR keyword for pass-by-reference. Return to caller with RET (continue program execution) or M17 (end of subroutine file). Example: PROC DRILL_PATTERN(REAL _X0, REAL _Y0, INT _COUNT) begins a parameterized drill pattern subroutine. Inside the procedure use parameter names directly with no # syntax. Global variables use the $ prefix (machine data) or _A_ prefix (cross-program persistent variables). Benefits over Fanuc Macro B: (1) readable named parameters, (2) local variable scope, (3) STRING and ARRAY types, (4) CASE/DEFAULT branching. ShopMill programs compile to PROC-based .spf files internally. Recursive PROC calls are supported up to the nesting depth limit (typically 16).

## Applies to

- Operation types: `drilling`

## Related tips

- [[ctrl-168|Siemens ShopMill and ShopTurn — graphical programming layer on top of 840D G-code]] _(category+op:1+tag:5)_
- [[tk-dl-post-007|Subprogram threshold: 5+ cycle points saves 60-80% program size]] _(category+op:1+tag:3)_
- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(category+op:1+tag:3)_
- [[ctrl-068|TOROT, TOFRAME, and TCARR Tool Orientation Commands]] _(category+op:1+tag:3)_
- [[ctrl-070|ShopMill/ShopTurn Conversational Programming]] _(category+op:1+tag:3)_

## Tags

#siemens #840d #proc #endproc #subroutine #spf #parameters #structured-programming #m17 #ret #operation-drilling #tool-drill #controller-fanuc #controller-siemens
