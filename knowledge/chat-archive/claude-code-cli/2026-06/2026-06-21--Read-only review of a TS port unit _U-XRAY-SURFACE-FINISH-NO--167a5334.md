---
type: "chat-session"
source: "claude-code-cli"
session_id: "167a5334-51e0-44fa-a725-0b1efccb4ef7"
title: "Read-only review of a TS port unit (U-XRAY-SURFACE-FINISH-NORMALIZE live-MCP com"
date: "2026-06-21"
first_ts: "2026-06-21T02:09:29.608Z"
last_ts: "2026-06-21T02:12:08.989Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 15
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/167a5334-51e0-44fa-a725-0b1efccb4ef7/subagents/agent-ab6191b4b3621e3b0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Read-only review of a TS port unit (U-XRAY-SURFACE-FINISH-NORMALIZE live-MCP com

> **claude-code-cli** | 2026-06-21 | 40 msgs (15 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/167a5334-51e0-44fa-a725-0b1efccb4ef7/subagents/agent-ab6191b4b3621e3b0.jsonl`

## Transcript

### User | 2026-06-21T02:09:29.608Z

Read-only review of a TS port unit (U-XRAY-SURFACE-FINISH-NORMALIZE live-MCP completion, slot:xray). Grade PASS/FAIL with P0/P1/P2 + file:line. Do NOT edit.

CONTEXT: A pure surface-finish callout normalizer already shipped on the `.mjs` side (`scripts/lib/ollama-vision-extract-lib.mjs::normalizeSurfaceFinish`) and passed a full 2-arm scrutiny. This unit is the TS PORT of that exact logic, to fix the same callout-drop gap on the LIVE MCP path. Your job: verify PORT FIDELITY + WIRING, not re-derive the algorithm.

FILES (read end-to-end):
1. H:/prism/mcp-server/src/utils/surfaceFinishNormalize.ts (NEW) -- the TS port.
2. H:/prism/mcp-server/src/engines/BlueprintVisionOCREngine.ts -- the wiring: new import + `convertDimensions` (~line 846) now calls `resolveSurfaceFinishRa(d.surface_finish_ra)` instead of `d.surface_finish_ra ?? undefined`.
3. Canonical reference for parity: H:/prism/scripts/lib/ollama-vision-extract-lib.mjs (the `normalizeSurfaceFinish` + `sfRaValue` functions, lines ~205-300).

FOCUS:
- PORT FIDELITY: does the TS `normalizeSurfaceFinish` produce IDENTICAL results to the .mjs for every branch (RMS, microinch, micron, ISO-N, bare preferred-series, bare>50, ambiguous, negative-reject, empty)? Any divergence is a P1.
- The micron-sign regex is built via `new RegExp("(?:[" + MICRO_SIGNS + "]|u)..." )` where MICRO_SIGNS = String.fromCharCode(0xB5)+String.fromCharCode(0x3BC). Confirm this matches the same inputs as the .mjs literal `/(?:µ|μ|u).../` -- especially the char-class `[µμ]` vs alternation `(?:µ|μ)` equivalence, and that "u" alone still works.
- WIRING: `resolveSurfaceFinishRa(d.surface_finish_ra)` returns `number | undefined`; the prior expression was also `number | undefined`; RawDimension.surface_finish_ra is typed `number | null` but the VLM may emit a string at runtime -> does the resolver handle the runtime string safely? Is the change purely additive (no regression for the numeric path)?
- Any TS type issue, or any behavior the 16 vitest te
... [+218 chars truncated]

### Assistant | 2026-06-21T02:09:34.188Z

I'll review this TS port for fidelity and wiring. Let me start by reading all three files end-to-end.

### Assistant | 2026-06-21T02:09:34.660Z

[tool_use: Read]

### Assistant | 2026-06-21T02:09:35.293Z

[tool_use: Read]

### User | 2026-06-21T02:09:37.135Z

[tool_result] 1	/**
2	 * Surface-finish callout normalization.
3	 *
4	 * TS port of the canonical pure normalizer in
5	 * `scripts/lib/ollama-vision-extract-lib.mjs` (`normalizeSurfaceFinish`,
6	 * U-XRAY-SURFACE-FINISH-NORMALIZE). The MCP/TS bundle cannot cleanly import the
7	 * scripts/.mjs (separate runtime, untyped, node-only sibling imports), so this is a
8	 * documented cross-boundary CLONE -- keep the tw
... [+5819 chars truncated]

### User | 2026-06-21T02:09:38.400Z

[tool_result] 195	    } else {
196	      return { mm: null, resolved: false, assumed: false, unit: "unknown" };
197	    }
198	  }
199	  const mm = u === "in" ? v * MM_PER_INCH : v;
200	  return { mm, resolved: true, assumed, unit: u };
201	}
202	
203	// -- surface-finish callout normalization (U-XRAY-SURFACE-FINISH-NORMALIZE) --
204	// VLMs frequently emit a surface-finish callout as TEXT ("63 RMS", "125 uin", 
... [+7426 chars truncated]

### Assistant | 2026-06-21T02:09:41.688Z

Now let me see the .mjs lines I need for the bare-number and the full `(?:µ|u)"` microinch branch I noticed, plus the wiring site in the engine.

### Assistant | 2026-06-21T02:09:43.323Z

[tool_use: Read]

### Assistant | 2026-06-21T02:09:43.648Z

[tool_use: Read]

### User | 2026-06-21T02:09:44.958Z

[tool_result] 820	      thickness_mm: raw.thickness_mm,
821	      dimension_count: raw.dimensions.length,
822	      tightest_tolerance_mm: tightest,
823	      units: raw.units === "in" ? "in" : "mm",
824	      tokens_used,
825	    };
826	  }
827	
828	  // ── Conversion Helpers ──────────────────────────────────────────────
829	
830	  private convertDimensions(raw: RawDimension[]): ExtractedDimension[] {
831	   
... [+2135 chars truncated]

### User | 2026-06-21T02:09:45.281Z

[tool_result] 1	// Tests for the surface-finish callout normalizer (U-XRAY-SURFACE-FINISH-NORMALIZE, TS
2	// port). Reference values are pinned identical to the canonical .mjs side
3	// (scripts/lib/ollama-vision-extract-lib.test.mjs) so the cross-boundary clone stays in sync.
4	import { describe, it, expect } from "vitest";
5	import {
6	  normalizeSurfaceFinish,
7	  resolveSurfaceFinishRa,
8	  ISO_N_GRADE_RA_U
... [+5153 chars truncated]

### Assistant | 2026-06-21T02:09:49.063Z

I now have a key divergence to verify. The .mjs `hasMicroinch` has a THIRD alternative the TS port is missing. Let me confirm the .mjs line 266 exactly and check the import + RawDimension type in the engine.

### Assistant | 2026-06-21T02:09:50.990Z

[tool_use: Grep]

### Assistant | 2026-06-21T02:09:51.841Z

[tool_use: Grep]

### User | 2026-06-21T02:09:52.358Z

[tool_result] 266:  const hasMicroinch = /(?:µ|μ|u)\s?in\b/.test(lower) || /micro\s?-?inch/.test(lower) || /(?:µ|u)"/.test(lower);
269:  if (hasMicroinch) return { ra_um: uin(value), system: "Ra-uin", resolved: true, assumed: false, raw: s };

### User | 2026-06-21T02:09:53.241Z

[tool_result] 46:import { resolveSurfaceFinishRa } from "../utils/surfaceFinishNormalize.js";
226:      "surface_finish_ra": null,
848:        surface_finish_ra: resolveSurfaceFinishRa(d.surface_finish_ra),
934:  surface_finish_ra?: number | null;

### Assistant | 2026-06-21T02:09:56.292Z

I've found a real divergence. Let me verify the RawDimension type and check the .mjs uin rounding to confirm the `3.175` / `6.35` parity, and confirm the unicode escape behavior. Let me also run the tests.

### Assistant | 2026-06-21T02:09:57.288Z

[tool_use: Read]

### Assistant | 2026-06-21T02:09:58.285Z

[tool_use: Bash]

### User | 2026-06-21T02:09:58.398Z

[tool_result] 920	  notes?: RawNote[];
921	  profiles?: RawProfile[];
922	  part_bounds_mm?: { width: number; height: number; depth?: number };
923	  thickness_mm?: number | null;
924	  surface_finishes?: Array<{ ra_um: number; location: string; raw_text: string }>;
925	}
926	
927	interface RawDimension {
928	  type?: string;
929	  nominal?: number;
930	  unit?: string;
931	  tolerance_type?: string | null;
932
... [+359 chars truncated]

### User | 2026-06-21T02:10:03.297Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/utils/__tests__/surfaceFinishNormalize.test.ts (16 tests) 5ms

 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  21:10:02
   Duration  128ms (transform 20ms, setup 0ms, import 29ms, tests 5ms, environment 0ms)

### Assistant | 2026-06-21T02:10:09.386Z

All 16 tests pass. Now let me confirm the divergence I found is real and assess its impact. The .mjs has a third microinch alternation `/(?:µ|u)"/` (matching the inch-double-quote notation like `63µ"` or `63u"`), which the TS port omits. Let me verify the TS port's `hasMicroinch` again and check whether the wiring site passes a string at runtime that could hit this notation.

The TS port (line 85):
```ts
const hasMicroinch = MICROINCH_RE.test(lower) || /micro\s?-?inch/.test(lower);
```
where `MICROINCH_RE = /(?:[µμ]|u)\s?in\b/`.

The .mjs (line 266):
```js
const hasMicroinch = /(?:µ|μ|u)\s?in\b/.test(lower) || /micro\s?-?inch/.test(lower) || /(?:µ|u)"/.test(lower);
```

The TS port is missing the `/(?:µ|u)"/` alternation. Let me verify this is a genuine behavioral gap and not handled elsewhere, and confirm the char-class equivalence question.

### Assistant | 2026-06-21T02:10:14.629Z

[tool_use: Bash]

### User | 2026-06-21T02:10:19.327Z

[tool_result] MICROINCH_RE source: (?:[µμ]|u)s?in
MICRON_RE source: (?:[µμ]|u)m
"125 µin"    mjs(in-word): true ts(in-word): false | mjs(dq): false
"250 μin"    mjs(in-word): true ts(in-word): false | mjs(dq): false
"32 uin"     mjs(in-word): true ts(in-word): false | mjs(dq): false
"63µ\""      mjs(in-word): false ts(in-word): false | mjs(dq): true
"63u\""      mjs(in-word): false ts(in-word): false | mjs(dq
... [+212 chars truncated]

### Assistant | 2026-06-21T02:10:24.377Z

This is the critical finding. The `\s?` in the regex source got mangled. Look at the printed source: `(?:[µμ]|u)s?in` — the `\s` became a literal `s`! The `new RegExp("... \\s? ...")` — wait, the string has `\\s?` which should produce `\s?`. Let me look very carefully. The printed source is `(?:[µμ]|u)s?in` — the backslash before `s` is GONE. That means the TS regex matches literal `s`, not whitespace. Let me dig into exactly why, and re-test against the actual TS module rather than my reconstruction.

### Assistant | 2026-06-21T02:10:28.569Z

[tool_use: Bash]

### User | 2026-06-21T02:10:37.106Z

[tool_result] source = "(?:[µμ]|u)s?in\b"
flags  = 
raw arg= "(?:[µμ]|u)s?in\b"
--- now check the ACTUAL bytes on disk at line 42 ---
L42: "const MICROINCH_RE = new RegExp(\"(?:[\" + MICRO_SIGNS + \"]|u)\\\\s?in\\\\b\");"
L43: "const MICRON_RE = new RegExp(\"(?:[\" + MICRO_SIGNS + \"]|u)m\\\\b\");"

### Assistant | 2026-06-21T02:10:43.694Z

The on-disk source is correct: `\\s?in\\b` and `m\\b` — those are proper escaped `\s?` and `\b`. My `JSON.stringify` printout of `re.source` was misleading because `\s` renders as `s` in some terminal displays. Let me definitively test against the **actual compiled TS module** to avoid any reconstruction error.

### Assistant | 2026-06-21T02:10:50.438Z

[tool_use: Bash]

### User | 2026-06-21T02:10:54.752Z

[tool_result] Exit code 1
node:internal/modules/esm/resolve:857
  throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base), null);
        ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'esbuild' imported from C:\Users\wompu\AppData\Local\Temp\sf-parity-check.mjs
    at packageResolve (node:internal/modules/esm/resolve:857:9)
    at moduleResolve (node:internal/modules/esm/resolve:926:18)
  
... [+496 chars truncated]

### Assistant | 2026-06-21T02:10:57.241Z

esbuild isn't resolvable from /tmp. Let me run the script from the mcp-server dir so node_modules resolves, writing the helper into the project tmp.

### Assistant | 2026-06-21T02:11:06.347Z

[tool_use: Bash]

### User | 2026-06-21T02:11:10.254Z

[tool_result] DIVERGE "63µ\""
   ts : {"ra_um":1.6002,"system":"Ra-uin","resolved":true,"assumed":true}
   mjs: {"ra_um":1.6002,"system":"Ra-uin","resolved":true,"assumed":false}
DIVERGE "63u\""
   ts : {"ra_um":1.6002,"system":"Ra-uin","resolved":true,"assumed":true}
   mjs: {"ra_um":1.6002,"system":"Ra-uin","resolved":true,"assumed":false}
DIVERGE "16µ\""
   ts : {"ra_um":0.4064,"system":"Ra-uin","resolved":t
... [+114 chars truncated]

### Assistant | 2026-06-21T02:11:16.472Z

The parity test confirms the divergence precisely. The remaining cases all match. Let me characterize the exact impact:

- The 3 divergences are all the `µ"` / `u"` (microinch-double-quote) notation — e.g. `63µ"`, `63u"`, `16µ"`.
- For these, the **`ra_um` value is IDENTICAL** in both (1.6002, 0.4064) but the path differs: the .mjs treats them as an EXPLICIT microinch token (`resolved:true, assumed:false`), while the TS port falls through to the bare-number disambiguation (`assumed:true`, because the values happen to be in the uin-preferred series or >50).

Let me check whether there's a case where this divergence flips `ra_um` itself or `resolved` (the operator-visible severity), not just the `assumed` flag. A microinch-`"` value NOT in the uin-preferred series and ≤50 would fall through to `unresolved()` in the TS port while resolving in the .mjs.

### Assistant | 2026-06-21T02:11:22.155Z

[tool_use: Bash]

### User | 2026-06-21T02:11:26.185Z

[tool_result] "10µ\""    TS resolved=false ra=null | MJS resolved=true ra=0.254
"25µ\""    TS resolved=true ra=25 | MJS resolved=true ra=0.635
"40µ\""    TS resolved=false ra=null | MJS resolved=true ra=1.016
"5u\""     TS resolved=false ra=null | MJS resolved=true ra=0.127

### Assistant | 2026-06-21T02:11:33.283Z

This is now a confirmed P1 with real data-corruption severity, not just a cosmetic `assumed` flag difference. For the `µ"` / `u"` microinch-double-quote notation:

- `10µ"`: TS drops it entirely (`resolved=false`, callout LOST) vs .mjs recovers `0.254 um`. This is exactly the recall-leak this unit exists to fix.
- `25µ"`: **TS produces `25 um`** (40x too large — bare-number trap: 25 is in `RA_UM_PREFERRED`, so it's read as 25 micrometres) vs .mjs correct `0.635 um`. This is a **silent value corruption**, the worst outcome — a wrong Ra that passes downstream as if valid.
- `40µ"`, `5u"`: TS drops; .mjs recovers.

`63µ"` (in uin-preferred series) happened to land on the right value by coincidence of the bare-number path, but `25µ"` does not.

Let me confirm the wiring path is otherwise sound (additive, numeric path unchanged) and check the runtime-string-from-VLM concern is genuinely possible given the type is `number | null`.

### Assistant | 2026-06-21T02:11:39.030Z

[tool_use: Bash]

### User | 2026-06-21T02:11:43.282Z

[tool_result] num 0.8   -> 0.8 (was 0.8)
num 0     -> 0 (old ?? undefined would keep 0)
null      -> undefined (was undefined)
undefined -> undefined (was undefined)
NaN       -> undefined (old ?? undefined would LEAK NaN)
string 63 RMS -> 1.6002 (old would leak the STRING)
string smooth -> undefined

### Assistant | 2026-06-21T02:12:08.989Z

The wiring is sound and actually strictly better than the prior expression: it handles the runtime-string case (the whole point of the unit), and additionally hardens NaN (old `?? undefined` would have leaked a NaN into a `number`-typed field). The numeric pass-through (including `0`) is preserved. The runtime-string concern is genuine — the engine type declares `number | null` but the VLM JSON can deliver a string, and the resolver coerces it safely.

I have everything I need. Let me give my verdict.

---

VERDICT: FAIL

summary: The TS port is a faithful clone for all 9 branches the 16 vitest tests cover, the wiring is correctly additive (and strictly better than the prior `?? undefined` — it also hardens NaN and the runtime-string case the VLM actually emits). But the port DROPS one alternation present in the canonical .mjs `hasMicroinch` — the `µ"`/`u"` microinch-double-quote notation — and that gap is not cosmetic: for callouts like `25µ"` the TS port silently emits a 40x-too-large Ra (25 um instead of 0.635 um) via the bare-number trap, and for `10µ"`/`40µ"`/`5u"` it drops the callout entirely (the exact recall-leak this unit exists to close). The 16 tests do not exercise this notation, so it slipped through green.

findings:
- [P1] H:/prism/mcp-server/src/utils/surfaceFinishNormalize.ts:85 -- PORT-FIDELITY GAP: `hasMicroinch` is `MICROINCH_RE.test(lower) || /micro\s?-?inch/.test(lower)` but the canonical .mjs (ollama-vision-extract-lib.mjs:266) has a THIRD alternative `|| /(?:µ|u)"/.test(lower)` (microinch written with the inch double-quote, e.g. `63µ"`, `25u"`). Without it, a `µ"`/`u"` callout never matches the explicit-microinch branch and falls through to the bare-number disambiguation. Trigger + impact (verified by compiling the TS module and diffing vs the .mjs): `25µ"` -> TS returns ra_um=25 um (40x too large; 25 is in RA_UM_PREFERRED so the bare path reads it as micrometres) where .mjs returns 0.635 um -- a SILENT value corruption that passes downstrea
... [+2236 chars truncated]
