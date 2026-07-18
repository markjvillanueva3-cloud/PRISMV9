---
name: feedback_port_gate_operator_byte_faithful
description: "When porting a pass/fail (safety) gate across languages, match the boolean operator BYTE-faithfully — `??` is not `||`; the swap fails OPEN on falsy-but-present values."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.440Z
aliases: feedback_port_gate_operator_byte_faithful
---


# Porting a gate operator: `??` ≠ `||` ≠ `&&` — a byte-faithful match or it fails OPEN

When you re-implement a pass/fail or safety gate in another language (e.g. a `.mjs` rule ported to a TS engine), the boolean/coalescing operators are **load-bearing semantics, not style**. `||` falls through on ANY falsy (`0`, `""`, `false`, `NaN`, `null`, `undefined`); `??` falls through ONLY on `null`/`undefined`. Swapping them changes behavior whenever a value is **falsy-but-present**.

**Concrete failure (CIMCO SPINE-1, commit `d7dfb6ded6`):** canonical `input[cat] || input[\`${cat}s\`]` was ported as `rec[cat] ?? rec[\`${cat}s\`]`. A grouped report `{collision: 0, collisions:[{line:2}]}` made `??` keep the `0` → `Array.isArray(0)===false` → the real findings were silently dropped → the gate returned `pass:true` on a program the canonical FAILS. **Fail-OPEN in a safety gate** — the worst direction.

**Why:** the `??`-keeps-falsy nuance is invisible on the happy path (every test used clean inputs), so it survives self-review and even two of three reviewers (one called `??`/`||` "behaviorally equivalent"). Only an adversarial reviewer who *constructed the divergent input* caught it.

**How to apply:**
1. When a port claims "faithful"/"parity", diff the operators character-for-character against canonical — `||`/`??`/`&&`/`===`/`==` are NOT interchangeable.
2. A "parity-lock" test is only load-bearing if it exercises the **divergent** input (a falsy-but-present key, an empty string, a `0`), not just clean data. A test that passes under both operators locks nothing.
3. For safety gates, bias the review toward "can this return PASS when it should FAIL?" — fail-OPEN is the catastrophic direction.

Pairs with R9 (tests verify intent), R12 (fail loud). Caught by the 3-of-3 scrutiny gate. See [[reference_cimco_bridge_engine_spine1_2026_06_02]].
