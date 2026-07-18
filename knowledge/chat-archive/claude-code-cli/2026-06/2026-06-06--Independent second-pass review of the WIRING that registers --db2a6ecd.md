---
type: "chat-session"
source: "claude-code-cli"
session_id: "db2a6ecd-1b45-420d-9186-67a94149d954"
title: "Independent second-pass review of the WIRING that registers a new system-viz gen"
date: "2026-06-06"
first_ts: "2026-06-06T03:45:32.840Z"
last_ts: "2026-06-06T03:48:52.701Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 9
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/db2a6ecd-1b45-420d-9186-67a94149d954/subagents/agent-a9b2592ccea3425d6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Independent second-pass review of the WIRING that registers a new system-viz gen

> **claude-code-cli** | 2026-06-06 | 25 msgs (9 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db2a6ecd-1b45-420d-9186-67a94149d954/subagents/agent-a9b2592ccea3425d6.jsonl`

## Transcript

### User | 2026-06-06T03:45:32.840Z

Independent second-pass review of the WIRING that registers a new system-viz generator into the PRISM viz pipeline. Focus on integration correctness, silent-no-op risk, dedup, naming/convention conformance, and inlined constants — do NOT assume another reviewer caught everything.

The new generator scripts/generate-hermes-features.mjs writes state/shared/system-viz/hermes-augmentation.json (a {newNodes,newEdges,stats} augmentation). It was wired in two files; verify the wiring is complete and correct:

1. H:/prism/scripts/regen-viz.mjs — a `"generate-hermes-features.mjs"` entry must be present in the FAST[] array (around line 124, right after the dream-artifacts entry). Confirm it's inside the array and well-formed.

2. H:/prism/scripts/merge-augmentations.mjs — three edits must ALL be present and consistent (model them on the existing `dreamArtifacts` lines):
   (a) `const hermesApp = loadOptional("hermes-augmentation.json");` near line 139 — the filename must EXACTLY match what the generator writes (a mismatch = silent no-op; this is the #1 failure mode for this pattern).
   (b) a `versions.hermesApp` registration near line 260.
   (c) a splice block `if (hermesApp?.newNodes) { ... }` (near line 1373) that pushes nodes/edges into G with dedup (existingIds / edgeKey) and sets `G.meta.hermesApp`. Verify the block-scoped const names (existingIds, edgeKey, existingEdges) don't collide with sibling splice blocks, and that the dedup edgeKey matches the sibling pattern.

Verify against the sibling `dreamArtifacts` wiring in the same files (read those lines for parity). Confirm:
- filename byte-match between generator OUT_PATH (`hermes-augmentation.json`) and loadOptional arg.
- the splice connects to real graph nodes (`tr.mcp` and `ghost.planned_features` must be expected to exist in the base graph).
- no syntax errors, no duplicate variable declarations at the same scope, no inlined magic constants that should be shared.

Report P0/P1 issues only. Grade PASS or FAIL wit
... [+93 chars truncated]

### Assistant | 2026-06-06T03:45:57.528Z

I'll review the wiring statically. Let me read the relevant sections of both files plus the generator's OUT_PATH.

### Assistant | 2026-06-06T03:45:58.944Z

[tool_use: Bash]

### Assistant | 2026-06-06T03:45:59.371Z

[tool_use: Read]

### User | 2026-06-06T03:46:02.184Z

[tool_result] 100	  "generate-college-course-features.mjs",
101	  "generate-resource-pdf-features.mjs",
102	  "generate-pdf-course-bridge-features.mjs",
103	  "generate-cadcam-training-corpus-features.mjs",
104	  "generate-extracted-pdf-tips-features.mjs",
105	  "generate-post-pdf-corpus-features.mjs",  // POST-PDF-NODE-MS0/U-POST-PDF-CORPUS-NODE (slot:echo 2026-05-26) — Post-Processor Training Guide + Postabil
... [+5032 chars truncated]

### User | 2026-06-06T03:46:05.526Z

[tool_result] 54:const OUT_PATH = path.join(VIZ_DIR, "hermes-augmentation.json");
212:export function run({ outPath = OUT_PATH, appDir, outputsDir = OUTPUTS_DIR, fsImpl = fs } = {}) {

### Assistant | 2026-06-06T03:46:11.573Z

Confirmed: generator OUT_PATH writes `hermes-augmentation.json` (line 54), and the FAST[] entry on regen-viz.mjs line 124 is present, inside the array, well-formed, with a descriptive comment. Now let me verify the three merge-augmentations.mjs edits and the sibling dreamArtifacts wiring for parity.

### Assistant | 2026-06-06T03:46:12.716Z

[tool_use: Bash]

### User | 2026-06-06T03:46:18.918Z

[tool_result] 139:const dreamArtifacts = loadOptional("dream-artifacts-augmentation.json");  // DREAM-RECEIPT-MS0/U-DR09 (slot:bravo 2026-05-26)
140:const hermesApp     = loadOptional("hermes-augmentation.json");  // HERMES-APP-INCORPORATION-MS0/U-HERMES-VIZ-ROOST (slot:bravo 2026-06-06)
259:if (dreamArtifacts)  versions.dreamArtifacts  = dreamArtifacts.generated_at ?? "present";
260:if (hermesApp)       versio
... [+900 chars truncated]

### Assistant | 2026-06-06T03:46:22.818Z

All three edits present. Now let me read both splice blocks in full to verify block-scoped const names, dedup logic, and parity.

### Assistant | 2026-06-06T03:46:23.477Z

[tool_use: Read]

### User | 2026-06-06T03:46:26.257Z

[tool_result] 1345	// Dream-artifacts layer: ghost.dream_artifacts roost + one dream-artifact child per
1346	// staged/validated/applied/discarded receipt-bundle. Source:
1347	// state/shared/dream-artifacts/<id>/manifest.json via generate-dream-artifacts-features.mjs.
1348	// DREAM-RECEIPT-MS0/U-DR09 (slot:bravo 2026-05-26) — Hermes Dreaming v0.1.0 interop.
1349	let dreamArtifactsNodes = 0, dreamArtifactsEdges
... [+2541 chars truncated]

### Assistant | 2026-06-06T03:46:31.953Z

The splice block is byte-for-byte parallel to the dreamArtifacts sibling. The block-scoped consts (`existingIds`, `edgeKey`, `existingEdges`, `k`) are all declared inside the `if (hermesApp?.newNodes) {...}` block scope, so no collision with the sibling blocks (each block re-declares them in its own scope — confirmed by the bridgePriority block at 1408+ doing the same). Now let me verify the edge dedup `edgeKey` matches the generator's edge shape, and confirm the splice connects to real base-graph nodes (`tr.mcp`, `ghost.planned_features`). Let me check the generator's edge field names and node targets.

### Assistant | 2026-06-06T03:46:33.456Z

[tool_use: Bash]

### User | 2026-06-06T03:46:41.146Z

[tool_result] 3: * generate-hermes-features.mjs — system-viz augmentation: the Nous Hermes desktop app.
7: * Surfaces the EXTERNAL Nous Research Hermes desktop app (Electron GUI + Python
11: *   - parent roost `ghost.hermes_app` (kind ghost-roost, under `ghost.planned_features`).
12: *   - `hermes-capability.native-mcp` node + a `bridges` edge to PRISM's MCP node
13: *     `tr.mcp` (MCP Server :3100) — the chan
... [+3014 chars truncated]

### Assistant | 2026-06-06T03:46:50.098Z

The generator emits edges with `{ from, to, kind }` fields. The merge `edgeKey` is `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`. The generator uses `from`/`to` (matches the `||` fallback) but its discriminator field is `kind`, not `type`. Let me verify this is consistent with the sibling dreamArtifacts generator — whether edges there also use `kind` and whether `type` in edgeKey is intentionally a different field. Let me check the dream-artifacts generator's edge shape for parity.

### Assistant | 2026-06-06T03:46:50.331Z

[tool_use: Bash]

### User | 2026-06-06T03:47:00.763Z

[tool_result] 89:      kind: "ghost-roost",
96:      newEdges.push({ from: PLANNED_PARENT, to: DREAM_ROOST_ID, kind: "contains" });
115:      kind: "dream-artifact",
123:    newEdges.push({ from: DREAM_ROOST_ID, to: childId, kind: "contains" });

### Assistant | 2026-06-06T03:47:16.833Z

Confirmed parity: the dreamArtifacts sibling generator also emits edges with `{ from, to, kind }` and no `type` field. So the `edgeKey`'s `e.type ?? ""` segment resolves to `""` for both generators identically — the hermes wiring is byte-identical to the proven sibling, not a divergence. The dedup behavior matches exactly.

Let me confirm the two base-graph node IDs actually exist as expected targets. The generator declares `tr.mcp` and `ghost.planned_features` as connection points. Both are well-known canonical base-graph nodes (the comment at line 46 says `tr.mcp` was "verified via system-viz find"). I'll do a quick static check that these IDs are referenced elsewhere in the merge pipeline / generators as real nodes rather than ones this augmentation must create.

### Assistant | 2026-06-06T03:47:18.230Z

[tool_use: Bash]

### User | 2026-06-06T03:47:27.912Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-06T03:47:34.687Z

No matches in the merge/engine-graph scripts — these node IDs are created by other generators or the base graph builder. Let me locate where `ghost.planned_features` and `tr.mcp` originate to confirm they're real base-graph nodes (not phantom targets that would create dangling edges).

### Assistant | 2026-06-06T03:47:35.395Z

[tool_use: Bash]

### User | 2026-06-06T03:48:19.041Z

[tool_result] H:/prism/scripts/audit-roadmap-viz-bindings.mjs
H:/prism/scripts/generate-ai-memo-xref-features.mjs
H:/prism/scripts/generate-ai-memo-xref-features.test.mjs
H:/prism/scripts/generate-bridge-priority-features.mjs
H:/prism/scripts/generate-bridge-synergy-features.mjs
H:/prism/scripts/generate-cadcam-training-corpus-features.mjs
H:/prism/scripts/generate-cadcam-training-corpus-features.test.mjs
H:/pr
... [+704 chars truncated]

### Assistant | 2026-06-06T03:48:52.701Z

`ghost.planned_features` is used by many sibling generators as a parent roost — including the proven `generate-dream-artifacts-features.mjs` and `generate-bridge-priority-features.mjs`, both of which attach under `ghost.planned_features` exactly as hermes does. This is the canonical parent roost for ghost-roost children, so it's a real base-graph node. `tr.mcp` (the MCP Server :3100 transport node) is a well-established base node referenced across the AI-memo-xref and bridge generators. Both targets are real and pre-existing.

The review is complete. All wiring is verified statically.

---

## Independent second-pass review — Hermes viz generator wiring

**Grade: PASS**

All wiring is complete, correct, and byte-parallel to the proven `dreamArtifacts` sibling. The #1 failure mode (filename mismatch → silent no-op) is clear: the generator's `OUT_PATH` writes `hermes-augmentation.json` (`generate-hermes-features.mjs:54`) and the merge consumer reads `loadOptional("hermes-augmentation.json")` (`merge-augmentations.mjs:140`) — exact byte-match. All three required merge edits are present and consistent: (a) the `loadOptional` at line 140, (b) the `versions.hermesApp` registration at line 260 (matching the sibling's `?? "present"` fallback), and (c) the splice block at 1378-1401 that dedups nodes via `existingIds` and edges via `edgeKey`/`existingEdges`, then sets `G.meta.hermesApp`. The FAST[] entry is present inside the array at `regen-viz.mjs:124`, well-formed with a descriptive comment, immediately after the dream-artifacts entry as specified.

**Verification details (no P0/P1 issues found):**
- **No const collisions** — `existingIds`, `edgeKey`, `existingEdges`, `k` are all declared inside the `if (hermesApp?.newNodes) {...}` block scope; each sibling splice block (dreamArtifacts 1350, bridgePriority 1408) re-declares its own copies in its own block scope, so there is no same-scope duplicate-declaration error.
- **edgeKey/dedup parity** — the hermes `edgeKey` (`${e.f
... [+2131 chars truncated]
