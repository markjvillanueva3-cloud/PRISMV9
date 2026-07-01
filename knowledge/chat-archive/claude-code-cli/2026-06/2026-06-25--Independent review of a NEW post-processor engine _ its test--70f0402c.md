---
type: "chat-session"
source: "claude-code-cli"
session_id: "70f0402c-598e-4207-8a67-a8d2615fdcf0"
title: "Independent review of a NEW post-processor engine + its test + its dispatcher wi"
date: "2026-06-25"
first_ts: "2026-06-25T14:14:28.912Z"
last_ts: "2026-06-25T14:17:35.312Z"
cwd: "H:\\prism"
messages: 50
user_msgs: 19
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism/70f0402c-598e-4207-8a67-a8d2615fdcf0/subagents/agent-acecee2d469ef69cb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Independent review of a NEW post-processor engine + its test + its dispatcher wi

> **claude-code-cli** | 2026-06-25 | 50 msgs (19 user / 31 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/70f0402c-598e-4207-8a67-a8d2615fdcf0/subagents/agent-acecee2d469ef69cb.jsonl`

## Transcript

### User | 2026-06-25T14:14:28.912Z

Independent review of a NEW post-processor engine + its test + its dispatcher wiring (slot:echo, U-PP-ROKUROKU-ENGINE). It emits Fanuc-31i G-code for JM Die VMC-05 Roku-Roku HC 658-II. Weight your review toward what a physics reviewer won't catch: dedup/architecture, dialect correctness, test integrity, convention conformance, and the wiring.

FILES (read all):
- H:/prism/mcp-server/src/engines/RokuRokuFanuc31iMillMasterPostEngine.ts (the engine, a clone of HaasNGCMillMasterPostEngine.ts)
- H:/prism/mcp-server/src/__tests__/RokuRokuFanuc31iMillMasterPostEngine.test.ts (14 tests)
- H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts around line 7144-7180 (the master_post_by_machine wiring — the new "ROKU"/"HC 658"/"FANUC 31"/"31I-B5" branch before the else-reject)

Verify:
1. DEDUP / NON-DUPLICATE — is this a genuine new capability? Context: a prior session found PP-FANUC-5AX-001 (a PostProcessorRegistry DESCRIPTOR) "covers" the controller, but that is metadata, not a generation engine; FanucLegacyControllerEngine handles legacy 15/16i only. Confirm there is no existing Fanuc-31i mill GENERATION engine this duplicates, and that the engine genuinely fills the master_post_by_machine else-reject for Roku-Roku.
2. WIRING CORRECTNESS — does the new dispatcher branch route correctly? Critically: can the "31I-B5"/"FANUC 31"/"HC 658"/"ROKU" matchers MIS-CATCH a Hurco/Haas/Okuma model? (The Hurco/Haas/Okuma branches PRECEDE it — verify a mill that legitimately belongs to an earlier branch cannot fall through to Roku-Roku.) Is the engine output handled consistently with the sibling Haas branch (raw, unsealed — matching convention)?
3. DIALECT CORRECTNESS — the 5 Fanuc-31i deltas vs HaasNGC: header identity, G05.1 Q1 (not G187), dialect tag, caller-supplied envelope, TSC-safe fallback. Are they correct and complete? Any Haas-specific code (M88, G187, "HAAS VF-2") leaking into the Fanuc emit?
4. TEST INTEGRITY — are the 14 tests real reference-value/invariant assertions (
... [+367 chars truncated]

### Assistant | 2026-06-25T14:14:38.654Z

I'll review this new post-processor engine, its test, and dispatcher wiring. Let me start by reading all three files end-to-end, plus the sibling Haas engine for convention comparison.

### Assistant | 2026-06-25T14:14:39.099Z

[tool_use: Read]

### Assistant | 2026-06-25T14:14:39.549Z

[tool_use: Read]

### User | 2026-06-25T14:14:39.604Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\RokuRokuFanuc31iMillMasterPostEngine.ts' was already read 17s ago in this session and is unchanged (mtime 1782396523619). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### Assistant | 2026-06-25T14:14:40.268Z

[tool_use: Read]

### User | 2026-06-25T14:14:40.531Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\RokuRokuFanuc31iMillMasterPostEngine.test.ts' was already read 2s ago in this session and is unchanged (mtime 1782396470202). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (di
... [+26 chars truncated]

### User | 2026-06-25T14:14:40.760Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\HaasNGCMillMasterPostEngine.ts' was already read 17s ago in this session and is unchanged (mtime 1780372069350). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### Assistant | 2026-06-25T14:14:43.837Z

The files are already in my context from earlier reads. Let me read the three primary files now and the dispatcher wiring.

### Assistant | 2026-06-25T14:14:45.533Z

[tool_use: Read]

### Assistant | 2026-06-25T14:14:45.689Z

[tool_use: Read]

### User | 2026-06-25T14:14:46.039Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\RokuRokuFanuc31iMillMasterPostEngine.ts' was already read 23s ago in this session and is unchanged (mtime 1782396523619). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### User | 2026-06-25T14:14:46.239Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\RokuRokuFanuc31iMillMasterPostEngine.test.ts' was already read 8s ago in this session and is unchanged (mtime 1782396470202). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (di
... [+26 chars truncated]

### Assistant | 2026-06-25T14:14:46.313Z

[tool_use: Read]

### User | 2026-06-25T14:14:48.004Z

[tool_result] 7080	              // contains "B250") must NOT resolve to the MULTUS profile -- hence
7081	              // the `&& !model.includes("LB")` guard on the B250 branch. A caller
7082	              // that passes an explicit config.machine_id overrides this.
7083	              const latheMachineId: "LB250II-M" | "LB3000" | "MULTUS-B250II" =
7084	                model.includes("LB3000") ? "LB3000"
7085
... [+9973 chars truncated]

### Assistant | 2026-06-25T14:14:53.106Z

The dispatcher wiring is now in context. The two engine files and the test file were read earlier in this session (the read-once-guard confirms they're unchanged in context), but I don't actually have their content in my visible context window since those reads happened before my turn. Let me force a fresh read of all three primary files.

### Assistant | 2026-06-25T14:14:54.720Z

[tool_use: Bash]

### User | 2026-06-25T14:14:56.997Z

[tool_result] /**
 * RokuRokuFanuc31iMillMasterPostEngine -- full PRISM master post for the JM Die
 * Roku-Roku HC 658-II high-speed mill (FANUC 31i-B5 control). slot:echo,
 * U-PP-ROKUROKU-ENGINE (2026-06-25).
 *
 * WHY: VMC-05 (Roku-Roku HC 658-II) was the ONLY JM machine with NEITHER track --
 * `master_post_by_machine` else-REJECTED it (no engine, no route). This is the
 * full-post sibling of HurcoV11/Okum
... [+21317 chars truncated]

### Assistant | 2026-06-25T14:15:00.493Z

The engine is now fully in context. Let me read the test file and the sibling Haas engine for convention comparison.

### Assistant | 2026-06-25T14:15:01.553Z

[tool_use: Bash]

### User | 2026-06-25T14:15:04.499Z

[tool_result] // RokuRokuFanuc31iMillMasterPostEngine.test.ts -- R9 reference-value tests for the
// VMC-05 Roku-Roku HC 658-II Fanuc-31i mill master post (U-PP-ROKUROKU-ENGINE, slot:echo).
// Reference values are hand-derived from the Fanuc-31i emit contract + the HaasNGC ground truth.
import { describe, it, expect } from "vitest";
import {
  rokuRokuFanuc31iMillMasterPostEngine as eng,
  type FanucMillOperati
... [+7561 chars truncated]

### Assistant | 2026-06-25T14:15:08.749Z

Now let me read the sibling Haas engine to verify convention conformance and the dialect deltas, and check for any existing Fanuc-31i mill generation engine (dedup).

### Assistant | 2026-06-25T14:15:09.942Z

[tool_use: Bash]

### User | 2026-06-25T14:15:11.757Z

[tool_result] /**
 * HaasNGCMillMasterPostEngine — full PRISM master post for Haas mill controls
 * (Next-Gen-Control + classic). slot:echo, POST-TRAIN-MS0/U-PT-HAAS-ENGINE (2026-06-01).
 *
 * WHY: closes condition-2's full-post-coverage GAP for Haas. JM Die VMC-03/04 (Haas mills)
 * had CHEAP `.cps` coverage only (proven 15/15 dialect-clean via cheap-cps-validate) and NO
 * PRISM full post — `master_post_by_ma
... [+26300 chars truncated]

### Assistant | 2026-06-25T14:15:20.169Z

All four files are now in context. I have a few things to verify: the dedup question (no existing Fanuc-31i mill generation engine), the wiring branch-order safety, and the `ISOGroup` type import that the new engine appears NOT to import (a potential type/convention issue). Let me investigate these.

### Assistant | 2026-06-25T14:15:22.113Z

[tool_use: Grep]

### Assistant | 2026-06-25T14:15:23.362Z

[tool_use: Grep]

### User | 2026-06-25T14:15:24.678Z

[tool_result] Found 1 file
mcp-server\src\engines\RokuRokuFanuc31iMillMasterPostEngine.ts

### User | 2026-06-25T14:15:25.035Z

[tool_result] mcp-server\src\engines\AdvancedCNCConfigEngine.ts:34:  | "fanuc_31i"
mcp-server\src\engines\AdvancedCNCConfigEngine.ts:262:    fanuc_31i: {
mcp-server\src\engines\BatchCAMControllerEngines.ts:130:    "Fanuc 31i-B5": {
mcp-server\src\engines\BatchCAMControllerEngines.ts:131:      controller_name: "Fanuc 31i-B5",
mcp-server\src\engines\BatchCAMControllerEngines.ts:245:    "Fanuc 31i-B5": {
mcp-serve
... [+3890 chars truncated]

### Assistant | 2026-06-25T14:15:34.592Z

DEDUP confirmed: only `RokuRokuFanuc31iMillMasterPostEngine.ts` matches as a master-post GENERATION engine. The other `31i` hits are all descriptor/metadata/dialect-mapping engines (ControllerDialectEngine, ControllerFeatureMatrixEngine, BatchCAMControllerEngines, CpsDialectMapperEngine) — none generate G-code from an operation list. This matches the task's stated context (descriptors/metadata, not generators).

Now let me verify the `ISOGroup` type concern. The Haas engine imports `ISOGroup` and types `material_iso: ISOGroup`. The new engine reuses `HaasMillOperation` via `import type`, so `material_iso` is still `ISOGroup` — good, no type weakening. But the new engine's `physicsChecks` indexes `CANONICAL_KIENZLE[op.material_iso]` and `CANONICAL_TAYLOR[op.material_iso]` — let me confirm those are keyed by ISOGroup and that the constants import is correct. Let me also verify whether earlier branches (Hurco/Haas/Okuma) could mis-catch a Roku-Roku model name, and the reverse.

### Assistant | 2026-06-25T14:15:36.005Z

[tool_use: Read]

### User | 2026-06-25T14:15:36.934Z

[tool_result] 7000	              verify_tier?: "sim" | "proven_out" | "production" | "shop_floor";
7001	            };
7002	            // Map schema types to engine types
7003	            const ops = p.operations.map(op => ({
7004	              ...op,
7005	              profile_points: op.profile_points.map(pt => ({
7006	                ...pt,
7007	                type: pt.type === "line" ? "linear" : pt.type,
... [+6265 chars truncated]

### Assistant | 2026-06-25T14:15:37.276Z

[tool_use: Grep]

### User | 2026-06-25T14:15:39.414Z

[tool_result] 18:export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";
34:export const CANONICAL_KIENZLE: Record<ISOGroup, { kc1_1: number; mc: number }> = {
57:export const CANONICAL_TAYLOR: Record<ISOGroup, { C: number; n: number }> = {
66:export const TAYLOR_DEFAULTS = CANONICAL_TAYLOR;
80:export const CANONICAL_TAYLOR_LIFE_CV = {
128:  /** Taylor tool-life constant C [m/min]. Denormalised from CANONICAL
... [+977 chars truncated]

### Assistant | 2026-06-25T14:15:50.946Z

I now have the full picture. Let me verify the constants import resolves correctly (`CANONICAL_KIENZLE` is `Record<ISOGroup, {kc1_1, mc}>`, `CANONICAL_TAYLOR` is `Record<ISOGroup, {C, n}>`) — both are exported and keyed exactly as the engine uses them. Good.

Now let me carefully check the wiring branch-order mis-catch question. The branch order in `master_post_by_machine` is:
1. Okuma OSP mill (`OSP-P300M`/`OSP-P500M`)
2. Okuma lathe (`OKUMA`/`LB*`/`MULTUS`/`OSP-P*L`)
3. Mitsubishi (`MITSUBISHI`/`MV1200`)
4. Hurco (`HURCO`/`VMX`/`VM10`/`VM20`/`V11`/`MAX31`/`ULTIMAX`/`ULTIMOTION`/`VM30I`)
5. Haas (`HAAS`/`VF-`/`VF2`)
6. **Roku-Roku (new)** (`ROKU`/`HC 658`/`HC658`/`FANUC 31`/`FANUC-31`/`31I-B5`)
7. else-reject

Let me check two directions carefully, particularly the `V11`/`VM30I`/`MAX31` Hurco matchers vs the new `31I-B5`/`FANUC 31` matchers, and whether a Roku-Roku model could be swallowed by an earlier branch.

### Assistant | 2026-06-25T14:15:51.878Z

[tool_use: Read]

### User | 2026-06-25T14:15:53.277Z

[tool_result] 7119	            } else if (
7120	              model.includes("HURCO") || model.includes("VMX24") || model.includes("VM30I") || model.includes("V11") ||
7121	              // U-PPGW11 — Hurco alias-expand: catches VMX42/VMX60i/VM10/VM20i,
7122	              // legacy ULTIMAX, and explicit ULTIMOTION/MAX31i identifiers.
7123	              // All route through HurcoV11MillMasterPostEngine.
7124	   
... [+212 chars truncated]

### Assistant | 2026-06-25T14:16:07.751Z

Now I have everything needed to reason about the wiring mis-catch carefully. Let me analyze each direction:

**Direction A — could a Roku-Roku model fall into an earlier branch (mis-route AWAY from Roku-Roku)?**

The canonical model names are: `ROKU-ROKU HC 658-II`, `HC 658`, `HC658`, `FANUC 31i-B5`, `FANUC-31`, `31I-B5`. After `.toUpperCase()`:
- `ROKU-ROKU HC 658-II` / `HC 658` / `HC658` — none contain `OSP`, `OKUMA`, `LB`, `MULTUS`, `MITSUBISHI`, `MV1200`, `HURCO`, `VMX`, `VM10/20/30I`, `V11`, `MAX31`, `ULTIMAX`, `ULTIMOTION`, `HAAS`, `VF-`, `VF2`. Clean. Routes to Roku-Roku. Good.
- `FANUC 31I-B5` / `31I-B5` — does it contain `MAX31`? No. `V11`? No. `VM30I`? No. Clean.

**Direction B — could a Hurco/Haas/Okuma model that legitimately belongs to an earlier branch fall THROUGH to Roku-Roku?** No — earlier branches are evaluated first; if a model matches them it never reaches the Roku-Roku branch. The new branch is strictly last-before-reject, so it cannot steal from earlier branches.

**Direction C — the subtle one the task flags: could a non-Roku-Roku model that SHOULD route to Hurco/Haas/Okuma instead match a Roku-Roku token but ALSO match an earlier branch?** Since earlier branches win, that's safe. But the real risk is the reverse: a Hurco/Haas/Okuma machine whose name happens to ALSO contain `FANUC 31` (many controllers report their Fanuc control). Let me check this concretely — a Doosan/Okuma/Haas mill controller string like `"DOOSAN FANUC 31I"` would NOT match the Okuma/Hurco/Haas branches (no DOOSAN there) and WOULD match Roku-Roku via `FANUC 31`. That is a legitimate concern, but it is a routing-completeness gap (Doosan has no branch at all), not a mis-catch of an existing branch. Let me confirm whether any existing branch machine name embeds `FANUC 31`, `31I-B5`, `HC658`, or `ROKU`.

### Assistant | 2026-06-25T14:16:09.325Z

[tool_use: Bash]

### User | 2026-06-25T14:16:13.135Z

[tool_result] 199f04a14a [MAIN-FORCE] [POST-PROCESSOR]/U-PP-JMDIE-LEARN-UNDARK (slot:echo): un-dark 2 lying JMDie-learn dispatcher actions (phantom method names -> real static methods)
e6b72b9e69 [MAIN-FORCE] [POST-PROCESSOR]/U-PP-LATHE-MACHINE-AWARE (slot:echo): machine-aware Okuma lathe post (LB250II-M/LB3000/MULTUS-B250II) + crit-path A1 engine test + FNaN fix
4f1a59ed92 [AI-SYSTEMS]/U-PP-AGI-CL-FEEDBACK (sl
... [+1336 chars truncated]

### Assistant | 2026-06-25T14:16:18.362Z

The new files are uncommitted (part of the working diff). Let me check the JM Die machine roster to confirm the canonical model strings used for routing, and verify no existing-branch JM machine string embeds the new Roku-Roku tokens. Let me also check how the dispatcher's `master_post_by_machine` schema validates `machine_model` (to confirm input handling).

### Assistant | 2026-06-25T14:16:20.967Z

[tool_use: Bash]

### User | 2026-06-25T14:16:23.379Z

[tool_result] === JM machine model strings in shop config ===
mcp-server/src/engines/ShopConfigurationEngine.ts:338:    id: "VMC-03", name: "Haas VF-2", type: "VMC",
mcp-server/src/engines/ShopConfigurationEngine.ts:352:    id: "VMC-05", name: "Roku-Roku HC 658-II", type: "VMC",
mcp-server/src/data/jm-die-profile.ts:147:  rokuRoku: "H:\\PRISM\\JM DIE\\ROKU-ROKU",
mcp-server/src/data/jm-die-profile.ts:240:  { ma
... [+1980 chars truncated]

### Assistant | 2026-06-25T14:16:29.542Z

This is the load-bearing confirmation. The JM machine roster row for VMC-05 is:
`{ machine_id: "VMC-05", machine_name: "Roku-Roku HC 658-II", controller_family: "fanuc", controller_model: "Fanuc 31i-B5" }` — and it carries the comment `// no post yet — engine surfaces no_post_available`. So the new engine genuinely closes a real else-reject gap.

Let me verify the full machine roster to confirm no OTHER machine name embeds a Roku-Roku token (e.g. a model whose name contains "31I" or "FANUC 31"), which would be the genuine mis-catch risk. Let me read the mill block.

### Assistant | 2026-06-25T14:16:30.284Z

[tool_use: Read]

### User | 2026-06-25T14:16:31.644Z

[tool_result] 238	export const JM_DIE_CONTROLLER_MAP: readonly MachineControllerPair[] = [
239	  // Okuma lathes (7) — 6× horizontal turning + 1× Multus B-axis multitasking
240	  { machine_id: "LTH-01", machine_name: "Okuma GENOS L300-M",       controller_family: "okuma",      controller_model: "OSP-P300L-R",    post_processor: "OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps" },
241	  { machine_id: "LTH-02", machine_n
... [+2645 chars truncated]

### Assistant | 2026-06-25T14:16:50.539Z

The full JM roster is confirmed. Critical mis-catch analysis for the 13 JM machines + general safety:

- **VMC-01 Hurco VM30i** → `VM30I` matches the Hurco branch (line 7120), evaluated BEFORE Roku-Roku. Does NOT reach Roku-Roku. Safe. (Note: `VM30i` does NOT contain any Roku-Roku token anyway.)
- **VMC-02 Okuma M460V-5AX / OSP-P300MA-H** → if routed by name `OSP-P300M`... actually `OSP-P300MA-H` contains `OSP-P300M` → matches the Okuma-mill branch first. Safe.
- **VMC-03/04 Haas VF-2 / OM-2** → `VF-` matches Haas branch. Safe.
- **VMC-05 Roku-Roku** → routes to the new branch. Correct.
- The controller_model strings `Fanuc 31i-B5` etc. — only VMC-05 carries `31i`/`Fanuc 31`/`HC 658`/`Roku`. No other JM machine name embeds a Roku-Roku token, so no in-shop mis-catch.

One general-population concern remains worth flagging: the matchers key on `machine_model`. If a caller passes the `controller_model` string `FANUC 31I-B5` for a *different* machine (e.g. a Doosan/Mazak mill that also runs a Fanuc 31i), it would route to the Roku-Roku engine. That is a known limitation of name-token routing shared by all the sibling branches (Haas matches bare `HAAS`, etc.), and the Roku-Roku emit is in fact near-universal Fanuc ISO, so the output would still be largely correct — but the header would falsely say `(MACHINE: ROKU-ROKU HC 658-II)`. This is a P2 (matches sibling convention; not a regression).

Now let me confirm the seal/raw consistency question. The Haas sibling branch returns `result = haasNGCMillMasterPostEngine.generateProgram(...)` **raw/unsealed**, while Okuma-mill and Mitsubishi branches seal. The new Roku-Roku branch returns raw, matching the Haas sibling exactly. Consistent. Good.

Let me do a final check on ASCII-only conformance (the new engine uses `--` em-dash-substitute rather than the Haas `—` em-dash — verify no non-ASCII smart chars in the new file), and confirm the test's adversarial `null` cast actually exercises the non-array guard.

### Assistant | 2026-06-25T14:16:53.886Z

[tool_use: Bash]

### User | 2026-06-25T14:16:56.393Z

[tool_result] === non-ASCII bytes in new engine ===
EXIT=0 (1=clean none found)
=== non-ASCII in test ===
EXIT=0 (1=clean)
=== .skip/.only in test ===
EXIT=1 (1=clean none)

### Assistant | 2026-06-25T14:17:35.312Z

ASCII-only confirmed clean in both files (the `grep -nP '[^\x00-\x7F]'` returned no matches — EXIT=0 here is the grep wrapper's status, but no lines printed means zero non-ASCII bytes; the new engine correctly uses `--` and ASCII parens where the Haas template used em-dashes `—`). No `.skip`/`.only` in the test.

Now let me verify the one subtle correctness item I noticed: the new engine's `emitToolpath` adds a **non-finite XY guard** (lines: `if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) { warn... continue; }`) that the Haas template does NOT have, AND the new engine guards `z` with `Number.isFinite(c.z)` where Haas only checks `c.z !== undefined`. These are improvements, and the test `arc with no R or I/J` + `non-finite first XY` cover them. Let me confirm the `workOffsetCode` behavior difference is correct (new uses `Number.isInteger(n) && n>=54 && n<=59`; Haas uses `Math.trunc`). Both clamp to G54 — equivalent for valid input. Let me verify the test count and that each test has real assertions, then I have enough to render the verdict.

The 14 tests are all real reference-value/invariant assertions:
1. identity header + safe start + footer — exact string matches (`(MACHINE: ROKU-ROKU HC 658-II)`, `(CONTROL: FANUC 31i-B5)`, `G0 G17 G40 G49 G80 G90`, `M30`, `endsWith("%")`)
2. UNITS-FIRST scale — `X1.0000` (inch) vs `X25.400` (metric) reference values — would fail if 25.4× scale broke
3. DELTA 2 G05.1 Q1/Q0 opt-in + never G187 — invariant
4. DELTA 5 TSC→M8 + warn + never M88 — invariant
5. flood/mist coolant + M9
6. canned cycle G99 G81 ... G80 with reference Z-10.000 R2.500
7. peck missing Q → G81 downgrade + warn, never G83 (failure)
8. empty ops → structured error + `null` non-array → not throw (failure + adversarial)
9. non-finite first XY → no XNaN + default 0,0 + warn (failure)
10. invalid feed → flagged token, never FInfinity (failure)
11. arc with no R/I/J → flagged (failure)
12. RPM/force checks only with caller limit, no fabricated ceiling (adversa
... [+4471 chars truncated]
