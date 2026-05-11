---
milestone: SKILLS-UTILIZATION-MS0
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
research_source: state/shared/research/2026-05-10-skills-openclaw.md
external_source: "@eng_khairallah1 — 'How to Use Claude Skills to Automate Any Workflow (Full Course)' — captured to H:/last.md 2026-05-11 (X post HTTP 402, fetched out-of-band)"
total_units: 8
critical_path_role: U-SKU06 (registry schema) → {U-SKU01 3Q-gate, U-SKU02 3-scenario test, U-SKU03 linter} → U-SKU05 (library audit) → U-SKU08 (INTERNAL bundle — public release deferred per hard rule). U-SKU04 (cadence) depends on U-SKU06 + LOOP-MIGRATE cron infra. U-SKU07 (marketplace scan) standalone.
hard_rule: Nothing from the H: drive may be shared/published/distributed publicly (set 2026-05-11, "for now"). U-SKU08 is therefore internal-only; the "share publicly" step from @eng_khairallah1's Phase-4 is deferred behind explicit per-artifact clearance. See feedback_no_public_h_drive.md.
loop_registrations: 2 (weekly skill-refinement digest U-SKU04; monthly marketplace scan U-SKU07)
date: 2026-05-10
dedup_note: ALL units extend existing PRISM assets (forge-skills, skill-modernize, wiki-lint, harness-security-audit, src/registries/*). Each unit's step-1 is `duplicationGuardEngine.checkBeforeCreating()`. NONE create a parallel skill-management surface.
---

# SKILLS-UTILIZATION-MS0 — atomized

> The skill-quality-discipline pillar. PRISM has ~247 project skills + ~390 user skills = ~637 total. The question is not quantity (we're 8× past @eng_khairallah1's "ten skills = workforce" bar) — it's whether each is **production-grade** by his Three-Question + Three-Scenario standard, or whether half are vague stubs that never auto-fire / fire wrongly / drifted stale. This milestone installs the pre-build gate, the test protocol, the linter, the refinement cadence, the library audit, the registry schema to track all of it, the marketplace scan, and the public-export path. It is a synergy-edge with HOOKS-AUTOMATION-V2 (skills carry scoped hooks), KNOWLEDGE-VAULT (skills cross-trigger wiki entries), and AUTO-LEARNING-LOOP (marketplace scan reuses the source-monitor pattern).
>
> Source doctrine: `state/shared/research/2026-05-10-skills-openclaw.md` §1-4 (anatomy / patterns / discovery / ecosystem) + the @eng_khairallah1 4-phase course (`H:/last.md`). The course's contribution is the **process discipline** the research card lacked: the 3-question pre-build gate, the 3-scenario production-grade bar, the weekly refinement cycle, the "vague language is banned" rule, the library-as-workforce framing, and the master-tracking-doc pattern.

---

## U-SKU06 — Skill registry schema extension (the foundation — do first)

- pillar: skills
- tier: T0
- ai_priority_score: 65
- leverage_score: 12
- why: @eng_khairallah1 Phase-4 — "maintain a master document tracking all your Skills, their status, and their last refinement date." PRISM has skill registries in `src/registries/` but they lack the quality-tracking fields the other 7 units in this milestone read. Without this, the 3Q-gate (U-SKU01), the test runner (U-SKU02), the linter (U-SKU03), the refinement cadence (U-SKU04) and the audit (U-SKU05) have nowhere to record their verdicts.
- depends_on: []
- blocks: [U-SKU01, U-SKU02, U-SKU03, U-SKU04, U-SKU05]
- parallel_with: [U-SKU07]
- viz_node_id: `core.registry.skill-registry` (extend existing, do not create)
- closes_synergy_edge: skills × registries
- loop_schedule: none

verifies_via:
  channel: test
  tool: `cd mcp-server && npx vitest run skillRegistry`
  expected_signal: schema parses every existing SKILL.md / commands/*.md; new fields default sanely (`production_grade: false`, `last_refined: <file mtime>`, `scenario_tests: {happy:null, edge:null, stress:null}`); zero parse failures across ~637 skills
  re_run_cost: ~15s
  baseline: registry tracks name/description/path/model/effort only; no quality fields

micro_steps:
  - step-1:
      tool: Bash
      path: `H:/prism/`
      action: `node -e "import('./mcp-server/dist/engines/DuplicationGuardEngine.js').then(m=>console.log(JSON.stringify(m.duplicationGuardEngine.checkBeforeCreating({assetType:'schema',proposedName:'skillQualitySchema',keywords:['skill','registry','quality'],description:'skill quality tracking fields'}))))"` — confirm no existing schema already covers this; if it does, EXTEND that one
      verify: `shouldProceed: true` OR a named existing schema to extend
  - step-2:
      tool: Read
      path: `mcp-server/src/registries/` (locate the current skill registry file — likely `skillRegistry.ts` or `commandRegistry.ts`)
      action: read its exports + the schema it conforms to
      verify: current `SkillRegistryEntry` interface identified
  - step-3:
      tool: Edit
      path: `mcp-server/src/schemas/<existing skill schema>.ts` (or new `skillQualitySchema.ts` if none — gated by step-1)
      action: add fields — `production_grade: boolean` (default false), `last_refined: string` (ISO date, default = SKILL.md mtime), `trigger_phrases: string[]` (extracted from description, default []), `has_output_example: boolean`, `body_line_count: number`, `scenario_tests: { happy: 'pass'|'fail'|null, edge: 'pass'|'fail'|null, stress: 'pass'|'fail'|null }`, `vague_language_violations: string[]`, `last_audited: string|null`, `invocation_count_30d: number` (from telemetry)
      verify: tsc clean
  - step-4:
      tool: Edit
      path: `mcp-server/src/registries/<skill registry>.ts`
      action: add a `buildSkillRegistry()` populator that walks `~/.claude/skills/**/SKILL.md` + `~/.claude/commands/*.md` + `H:/prism/.claude/skills/**/SKILL.md` + `H:/prism/.claude/commands/*.md` + plugin skills; parses frontmatter + body; fills the new fields with safe defaults; writes `state/shared/registries/SKILL_QUALITY_REGISTRY.json`
      verify: `node scripts/build-skill-quality-registry.mjs` (or equivalent) produces a JSON with ~637 entries
  - step-5:
      tool: Write
      path: `mcp-server/src/__tests__/skillRegistry.test.ts` (extend if exists)
      action: 8 cases — schema parses a minimal SKILL.md, parses a full one, defaults applied on missing fields, trigger_phrases extracted from a description with 5 phrases, has_output_example true when body contains a fenced code block labelled output/example, body_line_count correct, plugin-namespaced skill parsed, malformed frontmatter → entry with `_parse_error` not a crash
      verify: 8 passed
  - step-6:
      tool: Bash
      path: `H:/prism/`
      action: run the populator against the real ~637 skills; spot-check 5 entries
      verify: zero unhandled exceptions; `SKILL_QUALITY_REGISTRY.json` written; entry count within ±5 of `ls ~/.claude/{skills,commands} + project + plugins | wc -l`

adversarial_cases:
  - SKILL.md with no frontmatter at all (legacy `commands/foo.md` plain markdown) → entry created with name=filename, description="", trigger_phrases=[], not a crash
  - description >1024 chars → truncate for storage, flag `description_over_limit: true`
  - Two skills same name across tiers (user overrides project) → registry records both with a `shadowed_by` / `shadows` pointer, not silent overwrite (R7 — surface conflicts, don't average)
  - SKILL.md that is a symlink (Windows junction) → resolve through it; record real path

variability_axis:
  - 0 / 100 / 637+ skills in registry
  - skill type: rigid / flexible / methodology / reference
  - location tier: enterprise / user / project / plugin
  - frontmatter completeness: full / partial / none (legacy flat command)

failure_modes:
  - Glob over `~/.claude/skills/**` slow on cold FS → cache by mtime; incremental rebuild
  - Frontmatter YAML parse fails for ~3% of skills → `_parse_error` field, advisory not block; maintain `skill-registry-parse-failures.json`
  - Registry diverges across worktrees → committed to main; rebuilt nightly + on `/skill-modernize`
  - Telemetry source for `invocation_count_30d` missing → field nullable; degrade gracefully

---

## U-SKU01 — Three-Question pre-build gate (PreToolUse hook on skill creation)

- pillar: skills
- tier: T0
- ai_priority_score: 72
- leverage_score: 13
- why: @eng_khairallah1 Phase-2 — "Before you build, answer three questions: (1) what does this skill do? Be brutally specific. (2) When should it activate? List ≥5 trigger phrases. (3) What does perfect output look like? Show an actual example." PRISM's `/forge-skills` autopilot creates skills but doesn't enforce this gate, so we accumulate vague ones. This hook BLOCKS any Write to `**/SKILL.md` or `.claude/commands/*.md` unless the body satisfies all three.
- depends_on: [U-SKU06]
- blocks: []
- parallel_with: [U-SKU02, U-SKU03, U-SKU07]
- viz_node_id: `core.hooks.skill-3q-gate` (TBD-create)
- closes_synergy_edge: skills × hooks
- loop_schedule: none

verifies_via:
  channel: integration
  tool: E2E — Write a SKILL.md missing the output example → assert blocked with `decision:"deny", message:"3Q-gate: missing perfect-output example (Q3)"`. Write a complete one → allowed.
  expected_signal: deny on any of the 3 missing; allow when all 3 present
  re_run_cost: 30s
  baseline: today — `/forge-skills` writes whatever it generates; no gate

micro_steps:
  - step-1:
      tool: Bash
      path: `H:/prism/`
      action: dedup check — confirm no existing PreToolUse hook already gates skill creation (grep settings.json hooks for SKILL.md matchers + check `forge-skills` skill body for an internal gate)
      verify: no existing gate, or a named one to extend
  - step-2:
      tool: Write
      path: `H:/prism/.claude/hooks/skill-3q-gate.mjs`
      action: PreToolUse on `^(Write|Edit|MultiEdit)$` where target path matches `/SKILL\.md$|\.claude[\\/]commands[\\/].*\.md$` — parse the proposed content; check Q1 (description ≥ 40 chars AND not in the vague-verb set), Q2 (description contains ≥ 5 distinct trigger phrases — heuristic: count quoted strings + "use when X" clauses + comma-separated action verbs ≥ 5), Q3 (body contains a fenced code block within ~3 lines of the word `example`/`output`/`perfect`); on any failure → `{decision:"deny", message:"3Q-gate: <which Q failed and why> — see state/shared/research/2026-05-10-skills-openclaw.md §2"}`; escape hatch `_skip_3q_gate: true` in tool input
      verify: hook runs; denies on each synthetic violation; allows a compliant skill
  - step-3:
      tool: Edit
      path: `H:/.claude/settings.json`
      action: register `skill-3q-gate.mjs` under PreToolUse matcher `Edit|Write|MultiEdit` (the hook self-filters by path); place AFTER the existing edit-bundle so it sees the final content
      verify: verify-hook-refs clean; registry rerun lists it
  - step-4:
      tool: Edit
      path: `H:/prism/.claude/commands/forge-skills.md` (and the plugin variant if present)
      action: add a "Phase 0: Three-Question Test" section to the skill body that makes the autopilot answer Q1/Q2/Q3 BEFORE writing — so the gate is satisfied by construction, not by retry
      verify: `/forge-skills` dry-run shows the 3 answers emitted before any Write
  - step-5:
      tool: Write
      path: `H:/prism/.claude/hooks/__tests__/skill-3q-gate.test.mjs`
      action: 7 cases — all-3-present (allow), Q1 vague ("helps with stuff") (deny), Q2 only 2 trigger phrases (deny), Q3 no example block (deny), `_skip_3q_gate` override (allow), Edit to a non-skill .md (allow, not gated), plugin-namespaced SKILL.md (gated)
      verify: 7 passed
  - step-6:
      tool: Bash
      path: `H:/prism/`
      action: E2E — attempt to create `~/.claude/skills/test-stub/SKILL.md` with `description: "does things"` and no example → observe block; fix to compliant → observe allow; delete the test skill
      verify: block then allow observed; no test artifact left

adversarial_cases:
  - Skill author games Q2 by stuffing 5 near-identical phrases ("write email", "write an email", "write the email"...) → heuristic dedupes on stem similarity ≥ 0.8 before counting
  - Q3 example block present but it's a bash command not an output sample → accept if labelled (don't over-police; the human/autopilot knows what "perfect output" means for that skill)
  - Edit that only changes the body's step 3 wording, frontmatter untouched → gate re-checks; if it was already compliant, no-op allow (don't re-block on every minor edit)
  - Methodology skill (e.g. brainstorming) legitimately has no single "output example" → escape hatch + a `skill_type: methodology` frontmatter field exempts Q3

variability_axis:
  - skill type: rigid (must have example) / flexible (example recommended) / methodology (example exempt) / reference (exempt)
  - creation path: `/forge-skills` autopilot / manual Write / Edit of existing / plugin import
  - 0 / 3 / 5 / 12 trigger phrases in description

failure_modes:
  - False-positive on a legitimately-terse-but-specific skill → escape hatch + telemetry of overrides; if override rate > 10%, loosen Q1 threshold
  - Heuristic for "trigger phrases" undercounts a well-written description → accept any of {≥5 quoted strings} OR {≥3 "use when" clauses} OR {a `trigger_phrases:` frontmatter array of ≥5}
  - Hook adds latency to every Edit → self-filter by path FIRST (cheap regex), only parse content if path matches

---

## U-SKU02 — Three-Scenario skill-test protocol + runner

- pillar: skills
- tier: T0
- ai_priority_score: 70
- leverage_score: 13
- why: @eng_khairallah1 Phase-3 — "Run your Skill against three scenarios: the happy path (80% of cases), the edge case (weird/incomplete/conflicting input), the stress test (biggest/messiest version). If it passes all three with client-ready output, it is production-grade." PRISM has NO skill-testing protocol. This unit defines the `<skill>/scenarios/{happy,edge,stress}.md` fixture convention and a `prism_dev:skill_test` action (+ `/skill-test` skill) that runs them and records `scenario_tests.{happy,edge,stress}` in the registry.
- depends_on: [U-SKU06]
- blocks: [U-SKU05]
- parallel_with: [U-SKU01, U-SKU03, U-SKU07]
- viz_node_id: `core.dispatch.prism_dev.skill_test` (extend prism_dev)
- closes_synergy_edge: skills × dev-tools × testing
- loop_schedule: none

verifies_via:
  channel: integration
  tool: round-trip `prism_dev:skill_test {skill:"de-sloppify"}` — runs the 3 scenario fixtures, returns `{happy:'pass'|'fail', edge:..., stress:..., production_grade: bool}`; assert it persists to SKILL_QUALITY_REGISTRY.json
  expected_signal: 3 verdicts returned + persisted; production_grade = (all three pass)
  re_run_cost: ~1-3min per skill (depends on skill body)
  baseline: no skill-testing exists

micro_steps:
  - step-1:
      tool: Bash
      path: `H:/prism/`
      action: dedup — confirm `prism_dev` has no `skill_test`/`test_skill` action; confirm no `/skill-test` skill exists; confirm `forge-tests` doesn't already cover SKILL.md fixtures
      verify: clear to add, or named asset to extend
  - step-2:
      tool: Write
      path: `H:/prism/mcp-server/src/engines/SkillScenarioTestEngine.ts`
      action: engine — given a skill name: locate `<skill-dir>/scenarios/happy.md`, `edge.md`, `stress.md` (each = an input prompt + an expected-output-shape rubric); for each, invoke the skill body against the input (via Skill tool composition or a sandboxed sub-call), grade the output against the rubric (keyword presence + structure + no-error markers); return per-scenario pass/fail + an aggregate `production_grade`. WIRE-EXEMPT note NOT applicable — this engine wires to prism_dev.
      verify: tsc clean
  - step-3:
      tool: Edit
      path: `H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts`
      action: add action `skill_test` to the enum + schema (`{skill: string, scenario?: 'happy'|'edge'|'stress'|'all'}`) + lazy import + call `skillScenarioTestEngine.run(...)`; persist verdicts to the registry
      verify: action appears in `prism_dev` action enum; schema validates
  - step-4:
      tool: Write
      path: `H:/prism/.claude/commands/skill-test.md`
      action: `/skill-test <skill>` — thin wrapper over `prism_dev:skill_test`; also `/skill-test --all` to sweep every skill that has a scenarios/ dir; this skill itself satisfies the 3Q gate (Q1 specific, Q2 trigger phrases "test a skill", "is this skill production-grade", "run skill scenarios", "skill happy-path test", "validate my skill", Q3 example output block)
      verify: `/skill-test` parses; 3Q-gate (U-SKU01) passes it
  - step-5:
      tool: Write
      path: `H:/prism/.claude/skills/de-sloppify/scenarios/{happy,edge,stress}.md` (seed fixtures for 3 representative skills — pick one rigid, one flexible, one methodology)
      action: write the 3 scenario fixtures for each seed skill — happy = a normal sloppy-code sample, edge = empty/already-clean input, stress = a 2000-line file with mixed languages
      verify: fixtures exist; `prism_dev:skill_test {skill:"de-sloppify"}` runs them
  - step-6:
      tool: Write
      path: `H:/prism/mcp-server/src/__tests__/SkillScenarioTestEngine.test.ts`
      action: 6 cases — all-3-pass → production_grade true, edge-fail → production_grade false, missing scenarios/ dir → returns `{status:'no-fixtures'}` not a crash, malformed fixture → graded fail with reason, `scenario:'happy'` only → single verdict, round-trip through `prism_dev:skill_test` dispatcher (not just the engine singleton)
      verify: `npx vitest run SkillScenarioTestEngine` → 6 passed
  - step-7:
      tool: Bash
      path: `H:/prism/`
      action: round-trip E2E — call `prism_dev:skill_test {skill:"de-sloppify", scenario:"all"}` via MCP; confirm verdicts land in SKILL_QUALITY_REGISTRY.json
      verify: registry entry for de-sloppify now has non-null `scenario_tests`

adversarial_cases:
  - Skill that calls another skill in its body → scenario runner must handle the composed call without infinite recursion (max-depth 3)
  - Stress fixture so large it would blow the context window → runner truncates input to a configurable cap + notes `stress_truncated: true` (still a valid stress test of "does it degrade gracefully")
  - Skill whose output is non-deterministic (LLM-generated prose) → rubric grades on STRUCTURE + KEYWORD PRESENCE, not exact match; flaky-grade tolerance with 2 retries
  - Malicious scenario fixture with `!`shell injection`!` → runner disables skill-shell-execution while grading fixtures

variability_axis:
  - skill type: rigid (exact-match rubric possible) / flexible (structural rubric) / methodology (process-followed rubric)
  - scenario: happy / edge / stress
  - skill body size: <100 lines / 100-500 / >500 (over-cap — flag)
  - fixture present / absent / malformed

failure_modes:
  - Grading is itself an LLM call → cost; cap at 1 grading call per scenario; cache by fixture-hash
  - Skill has no scenarios/ dir → `no-fixtures` status; U-SKU05 audit treats `no-fixtures` as `production_grade: false` (you can't claim production-grade without tests)
  - Runner sandbox leaks state between scenarios → fresh sub-context per scenario
  - `prism_dev` action enum collision with another in-flight unit → coordinate via cross-worktree firewall (HOOK-SYNERGY H6)

---

## U-SKU03 — Skill linter: vague-language ban + 500-line cap + trigger-phrase floor

- pillar: skills
- tier: T0
- ai_priority_score: 68
- leverage_score: 12
- why: @eng_khairallah1 Phase-2 — "Vague language like 'format nicely' or 'handle appropriately' is banned. Every instruction must be specific and testable. Keep the entire file under 500 lines." This is the cheapest, most-automatable quality lever — a static linter catches the bulk of bad skills without an LLM call. Extends the existing `/wiki-lint` and `/skill-modernize` pattern.
- depends_on: [U-SKU06]
- blocks: []
- parallel_with: [U-SKU01, U-SKU02, U-SKU07]
- viz_node_id: `core.script.skill-lint` (sibling of wiki-lint)
- closes_synergy_edge: skills × lint × token-economy
- loop_schedule: `0 7 * * 0` (Sunday 7am — weekly skill-lint sweep, same window as HOOK-SYNERGY H3)

verifies_via:
  channel: test
  tool: `node scripts/skill-lint.mjs --self-test` then `node scripts/skill-lint.mjs --all`
  expected_signal: self-test exit 0; `--all` produces `state/shared/skill-lint-report.json` flagging every SKILL.md with (a) banned vague verbs, (b) >500 body lines, (c) <3 trigger phrases in description, (d) `toBeDefined`-style placeholder language in the body
  re_run_cost: ~10s for self-test, ~30s for full sweep over 637 skills
  baseline: no skill linter; `/wiki-lint` lints wiki entries only

micro_steps:
  - step-1:
      tool: Bash
      path: `H:/prism/`
      action: dedup — confirm no `scripts/skill-lint.mjs` exists; check `/skill-modernize` skill body for an internal linter; check `/wiki-lint` for a generalizable core
      verify: clear to add or a core to reuse
  - step-2:
      tool: Write
      path: `H:/prism/scripts/skill-lint.mjs`
      action: walk all SKILL.md + commands/*.md; rules — R1 vague-verb ban (regex set: `format nicely|handle appropriately|as needed|appropriately|properly handle|deal with|make it nice|clean it up|etc\.|and so on|various` in instruction lines); R2 body-line-count > 500 → flag; R3 description trigger-phrase count < 3 (reuse U-SKU01's heuristic) → flag; R4 placeholder language in body (`TODO|TBD|FIXME|<insert|\[your |stub`) → flag; R5 SKILL.md > 1024-char description → flag; emit per-skill findings to `skill-lint-report.json`; `--fix` mode for R2 (suggests sibling-file split points) and R4 (lists the placeholders); exit code = total flagged count (0 in `--self-test` against a clean fixture)
      verify: `--self-test` exits 0; `--all` runs in <60s
  - step-3:
      tool: Edit
      path: `H:/.claude/settings.json`
      action: register `skill-lint.mjs --all` as a Stop hook (advisory, non-blocking) — surfaces the report count at session end if a SKILL.md was edited this session
      verify: verify-hook-refs clean
  - step-4:
      tool: Write
      path: `H:/prism/scripts/__tests__/skill-lint.test.mjs`
      action: 7 cases — clean skill (0 flags), "format nicely" in body (R1 flag), 600-line body (R2 flag), description with 1 trigger phrase (R3 flag), "TODO finish this" in body (R4 flag), `--fix` on R2 suggests split, plugin-namespaced skill linted
      verify: 7 passed
  - step-5:
      tool: Edit
      path: `H:/prism/.claude/commands/skill-modernize.md` (extend existing) OR `H:/prism/.claude/commands/skill-lint.md` (new — gated by step-1)
      action: wire `skill-lint.mjs` into the modernize flow OR ship a standalone `/skill-lint [skill|--all]` skill (3Q-compliant: Q1 specific, Q2 phrases "lint my skills", "check skill quality", "find vague language in skills", "skill over 500 lines", "skill lint report", Q3 example output)
      verify: skill parses; 3Q-gate passes it
  - step-6:
      tool: Bash
      path: `H:/prism/`
      action: run `node scripts/skill-lint.mjs --all` against the real 637; record the report
      verify: report written; flagged count is a concrete number (this becomes input to U-SKU05's audit)

adversarial_cases:
  - A skill legitimately uses "etc." inside a quoted example, not as a lazy instruction → linter only flags vague verbs OUTSIDE fenced code blocks and outside quoted strings
  - Skill body is 480 lines but 200 of those are a single embedded example → R2 counts non-fenced-code lines; if the instruction portion is <500 it passes (but flags `large_example_block: true` as advisory)
  - Description deliberately terse for a `disable-model-invocation` skill (the description isn't even loaded) → R3 exempt when `disable-model-invocation: true`
  - `--fix` mode mangles a SKILL.md → `--fix` only WRITES with `--apply`; default is dry-run emitting a diff

variability_axis:
  - skill type: rigid / flexible / methodology / reference
  - body size: <100 / 100-500 / 500-1000 / >1000 lines
  - description quality: rich (≥5 phrases) / minimal (1-2) / empty
  - `disable-model-invocation`: true (R3 exempt) / false

failure_modes:
  - Regex false-positives on domain text (e.g. "handle appropriately" in a skill ABOUT error handling) → context-aware: skip if the line is inside an example block or is itself defining the banned phrase
  - Linter flags 400 of 637 skills → that's the SIGNAL, not a failure; U-SKU05 prioritizes the high-invocation ones first
  - `skill-lint-report.json` grows large → keep only flagged entries + a summary header
  - Stop-hook latency → run async, write report, surface only a 1-line count

---

## U-SKU04 — Weekly skill-refinement cadence (telemetry-driven nudge + master tracking)

- pillar: skills
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: @eng_khairallah1 Phase-3 — "Every time you use a Skill and the output is not quite right, update the SKILL.md immediately. Set a calendar reminder to review and refine your Skill every Friday for the first month." Maps to a PRISM cron: weekly, surface (a) skills invoked this week whose output was overridden/corrected (from telemetry), (b) skills not refined in >90d but invoked >10×/month (stale-but-hot), (c) skills the linter flagged. Push a digest to the user + chat bus. This is the "master document tracking status + last refinement date" made live.
- depends_on: [U-SKU06]  # + LOOP-MIGRATE-MS0 cron infra (soft)
- blocks: []
- parallel_with: [U-SKU01, U-SKU02, U-SKU03, U-SKU05, U-SKU07, U-SKU08]
- viz_node_id: `core.cron.skill-refinement-digest` (TBD-create)
- closes_synergy_edge: skills × loops × telemetry
- loop_schedule: `/loop --interval 7d --max 4` (weekly digest, 4 weeks then re-evaluate) + cron `13 9 * * 5` (Friday 9:13am — the @eng_khairallah1 "Friday reminder")

verifies_via:
  channel: integration
  tool: trigger the digest manually → assert it emits `state/shared/skill-refinement-digest-<date>.md` listing the 3 categories with concrete skill names + reasons
  expected_signal: digest file written; ≥1 skill listed in at least one category (or "all skills healthy" if genuinely none); pushed to chat bus
  re_run_cost: ~20s
  baseline: no skill-refinement cadence; skills drift silently

micro_steps:
  - step-1:
      tool: Bash
      path: `H:/prism/`
      action: dedup — confirm no existing cron/loop for skill refinement (check `mcp-server/data/cron/` + `state/shared/cron-registry`); check `/weekly-synthesis` skill doesn't already cover it
      verify: clear to add or named asset to extend
  - step-2:
      tool: Write
      path: `H:/prism/mcp-server/src/engines/SkillRefinementDigestEngine.ts`
      action: engine — read SKILL_QUALITY_REGISTRY.json + telemetry; compute the 3 categories: (a) `output_overridden_this_week` (telemetry events where a skill ran then the user/model immediately corrected the output), (b) `stale_but_hot` (`last_refined` > 90d ago AND `invocation_count_30d` > 10), (c) `linter_flagged` (from skill-lint-report.json); produce a markdown digest with per-skill: name, why-flagged, suggested-fix-pointer, last_refined; update each entry's nothing (read-only — refinement is a human/forge action)
      verify: tsc clean
  - step-3:
      tool: Edit
      path: `H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts`
      action: add action `skill_refinement_digest` (+ schema `{push_to_bus?: boolean}`) + lazy import + call
      verify: action in `prism_dev` enum
  - step-4:
      tool: Edit
      path: `H:/prism/mcp-server/data/cron/<cron registry file>` (or wherever PRISM crons live)
      action: register `13 9 * * 5` → `prism_dev:skill_refinement_digest {push_to_bus:true}`
      verify: cron list shows the entry
  - step-5:
      tool: Write
      path: `H:/prism/mcp-server/src/__tests__/SkillRefinementDigestEngine.test.ts`
      action: 6 cases — all-healthy → "no action needed" digest, 1 overridden skill → category-a populated, 1 stale-hot → category-b, 1 linter-flagged → category-c, telemetry missing → degrades to lint+stale only, round-trip through `prism_dev:skill_refinement_digest`
      verify: 6 passed
  - step-6:
      tool: Bash
      path: `H:/prism/`
      action: round-trip E2E — `prism_dev:skill_refinement_digest {push_to_bus:false}` → digest file produced
      verify: `state/shared/skill-refinement-digest-<date>.md` exists with the 3 sections

adversarial_cases:
  - Telemetry has no "output overridden" event type yet → category-a falls back to "skills with high recent invocation but no recent edit" as a proxy; flag the proxy in the digest
  - 100 skills flagged at once (first run after the audit) → digest caps the actionable list at top-15 by `invocation_count_30d`, links the full list
  - Cron fires while a worktree has an uncommitted SKILL.md edit → digest reads committed state from main; notes "N skills have uncommitted edits — refinement in progress"
  - Digest pushed to chat bus but no chats active → write to file + queue, don't fail

variability_axis:
  - 0 / 5 / 100 skills flagged
  - telemetry: rich / partial / absent
  - cadence: weekly digest / Friday reminder / on-demand
  - delivery: file only / file + chat bus / file + chat bus + PushNotification

failure_modes:
  - Cron oversubscribe → guarded by weekly + `/loop --max 4`
  - Digest never read → also surfaced on SessionStart if >1 week old (keyword-gated, low cost)
  - "Refinement done" never recorded → the `last_refined` field auto-updates on any SKILL.md edit (mtime); no manual bookkeeping needed
  - SkillRefinementDigestEngine becomes stale itself → it's covered by U-SKU05's own audit (eat-your-own-dogfood)

---

## U-SKU05 — Skill-library audit: grade PRISM's 637 skills against the production-grade bar

- pillar: skills
- tier: T1
- ai_priority_score: 75
- leverage_score: 14
- why: @eng_khairallah1 Phase-4 — "One skill is a tool. Ten skills is a workforce." PRISM has ~637 skills — 64× the "workforce" bar by count. But count is vanity; the real question is how many are PRODUCTION-GRADE (pass 3Q + 3-scenario + linter). This unit runs the full audit and produces a scorecard: X production-grade / Y need-refinement / Z stub-or-orphan. Highest-leverage unit in this milestone — it converts "we have 637 skills" into "we have N skills that actually work, here's the gap list." Also computes the @eng_khairallah1 ROI: hours/year saved by the production-grade subset.
- depends_on: [U-SKU01, U-SKU02, U-SKU03, U-SKU06]
- blocks: [U-SKU08]
- parallel_with: [U-SKU04, U-SKU07]
- viz_node_id: `core.script.skill-library-audit` (TBD-create)
- closes_synergy_edge: skills × audit × business-value
- loop_schedule: `0 8 1 * *` (1st of month 8am — monthly re-audit)

verifies_via:
  channel: metric
  tool: `node scripts/skill-library-audit.mjs` → `state/shared/SKILL-LIBRARY-AUDIT-<date>.md` + `.json`
  expected_signal: scorecard with concrete counts: `production_grade: N`, `needs_refinement: M`, `stub_or_orphan: K`, `N+M+K == total skills`; per-domain breakdown (CAD, CAM, lathe, WEDM, dev-tools, ...); top-20 highest-invocation skills with their grade; estimated annual hours saved by the production-grade subset
  re_run_cost: ~2-5min (linter is fast; 3-scenario tests only run for skills that HAVE fixtures — most won't yet, so they grade `no-fixtures → not-production-grade`)
  baseline: today — 637 skills, 0 graded; "we have a lot of skills" is the only available statement

micro_steps:
  - step-1:
      tool: Bash
      path: `H:/prism/`
      action: dedup — confirm no `scripts/skill-library-audit.mjs`; check `/commands-audit` skill (it audits slash-command UTILIZATION — distinct from QUALITY, but coordinate so they don't double-report); check `forge-skills` for an audit mode
      verify: clear to add; note `/commands-audit` as a sibling to cross-link
  - step-2:
      tool: Write
      path: `H:/prism/scripts/skill-library-audit.mjs`
      action: read SKILL_QUALITY_REGISTRY.json + skill-lint-report.json + telemetry; for each skill compute `grade ∈ {production_grade, needs_refinement, stub_or_orphan}` where production_grade = (passes linter) AND (3Q satisfied) AND (has scenarios/ dir with all 3 passing OR explicitly `skill_type: methodology` with a process-rubric); needs_refinement = passes 3Q but has linter flags or no fixtures; stub_or_orphan = fails 3Q OR body < 10 lines OR invocation_count_30d == 0 AND last_refined > 180d; emit the scorecard markdown (per-domain table, top-20 by invocation, ROI estimate using @eng_khairallah1's 30min/wk×skill heuristic scaled by actual invocation frequency) + the machine-readable JSON
      verify: runs in <5min; scorecard counts sum to total
  - step-3:
      tool: Edit
      path: `H:/prism/mcp-server/data/cron/<cron registry>`
      action: register `0 8 1 * *` → run the audit monthly
      verify: cron list shows it
  - step-4:
      tool: Write
      path: `H:/prism/scripts/__tests__/skill-library-audit.test.mjs`
      action: 6 cases — all-pass skill → production_grade, linter-flagged skill → needs_refinement, 5-line skill → stub_or_orphan, zero-invocation 200d-old skill → stub_or_orphan, methodology skill with process-rubric → production_grade, scorecard sum invariant (N+M+K == total)
      verify: 6 passed
  - step-5:
      tool: Bash
      path: `H:/prism/`
      action: run the audit against the real 637; commit the scorecard
      verify: `SKILL-LIBRARY-AUDIT-<date>.md` written; the 3 counts are concrete numbers; this is the deliverable
  - step-6:
      tool: Edit
      path: `H:/prism/state/shared/specs/BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md` (or a follow-up unit registry)
      action: if the audit finds >50 `stub_or_orphan` skills, append a `SKILL-CLEANUP-MS1` follow-up milestone stub (disable, don't delete — per the never-delete rule); if it finds high-value gaps (a domain with 0 production-grade skills), append a `SKILL-GAP-FILL-MS1` stub
      verify: follow-up milestone(s) appended IF warranted; no-op if the library is healthy

adversarial_cases:
  - A skill with `invocation_count_30d == 0` because it's brand-new this week → grade by age: <14d old → exempt from stub_or_orphan regardless of invocation
  - A skill that's a deliberate reference (`user-invocable: false`, never "invoked" in the telemetry sense) → graded by linter + 3Q only; invocation count not applicable
  - Telemetry undercounts invocations (some skills fire via Skill-tool composition, not `/slash`) → audit reconciles both invocation channels; flag `invocation_undercounted: possible` if telemetry coverage < 80%
  - Audit itself is slow enough to time out the monthly cron → chunked: lint+3Q for all 637 (fast), 3-scenario tests only for the ~N that have fixtures (bounded)

variability_axis:
  - library size: 10 (the @eng_khairallah1 bar) / 100 / 637 (PRISM reality)
  - grade distribution: mostly-production / mostly-needs-refinement / mostly-stub
  - domain: CAD / CAM / lathe / WEDM / dev-tools / business / cross-cutting
  - skill age: <14d / 14-90d / 90-180d / >180d

failure_modes:
  - Audit grades 500 of 637 as needs_refinement → expected on first run; the value is the PRIORITIZED gap list, not a passing grade
  - 3-scenario tests can't run for skills without fixtures (most) → those grade needs_refinement (honest — "untested ≠ production-grade"); U-SKU02's fixture-seeding handles the top-20 first
  - ROI estimate is fuzzy → present it as a range, cite the @eng_khairallah1 heuristic explicitly, don't claim precision
  - Monthly cron collides with month-1 manual run → idempotent; latest run wins

---

## U-SKU07 — Skill-marketplace scan for PRISM-domain-relevant skills

- pillar: skills
- tier: T1
- ai_priority_score: 55
- leverage_score: 9
- why: @eng_khairallah1 Phase-1 — "Browse skillsmp.com or github.com/anthropics/skills and find a Skill relevant to your work. There are over 80,000 community Skills... most people have never installed a single one." PRISM should periodically scan skillsmp.com + anthropics/skills + the major collections (wshobson/agents, obra/superpowers) for skills relevant to its domains (manufacturing, CAD, CAM, CNC, document processing, code review) and surface install candidates. Reuses the AUTO-LEARNING-LOOP-MS0 ReputableSourceMonitor pattern — this is a specialized source.
- depends_on: []  # AUTO-LEARNING-LOOP-MS0 source-monitor pattern (soft reuse)
- blocks: []
- parallel_with: [U-SKU01, U-SKU02, U-SKU03, U-SKU04, U-SKU05, U-SKU06, U-SKU08]
- viz_node_id: `core.engine.skill-marketplace-scanner` (TBD-create)
- closes_synergy_edge: skills × auto-learning × external-sources
- loop_schedule: `0 10 1 * *` (1st of month 10am — monthly marketplace scan) + `/loop --interval 30d --max 12`

verifies_via:
  channel: integration
  tool: `prism_knowledge:learn_url_extract` over skillsmp.com/categories + github.com/anthropics/skills → `state/shared/skill-marketplace-candidates-<date>.json`
  expected_signal: candidates file with ≥1 PRISM-domain-relevant skill (name, source-url, what it does, why-relevant, dedup-check-vs-existing-637); if a candidate duplicates an existing PRISM skill, it's marked `already_covered_by: <skill>` not listed as a gap
  re_run_cost: ~1min (web fetch — via Playwright per the standing preference, since skillsmp.com is JS-rendered)
  baseline: no marketplace scanning; PRISM's 637 skills are all home-grown, blind to community work

micro_steps:
  - step-1:
      tool: Bash
      path: `H:/prism/`
      action: dedup — confirm no existing marketplace-scan engine; check if `AUTO-LEARNING-LOOP-MS0`'s `ReputableSourceMonitorEngine` already lists skillsmp.com as a source (if so, this unit just adds a domain-filter on top of it, not a new engine)
      verify: clear to add or named engine to extend with a source
  - step-2:
      tool: Write
      path: `H:/prism/mcp-server/src/engines/SkillMarketplaceScannerEngine.ts`
      action: engine — fetch (via Playwright MCP, per standing preference) skillsmp.com category pages + github.com/anthropics/skills README + wshobson/agents + obra/superpowers indexes; for each listed skill: extract name + description + url; score domain-relevance against PRISM's domain vocabulary (manufacturing/CAD/CAM/CNC/lathe/WEDM/document/code-review/testing/git); for relevant ones run `duplicationGuardEngine.checkBeforeCreating({assetType:'skill', proposedName, keywords, description})` against the 637; emit candidates JSON with `{name, source, description, relevance_score, dedup_verdict, recommendation: 'install'|'study'|'already-covered'|'skip'}`
      verify: tsc clean; engine returns a candidates list
  - step-3:
      tool: Edit
      path: `H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts` (or `prism_dev`)
      action: add action `skill_marketplace_scan` (+ schema `{sources?: string[], min_relevance?: number}`) + lazy import + call
      verify: action in enum
  - step-4:
      tool: Edit
      path: `H:/prism/mcp-server/data/cron/<cron registry>`
      action: register `0 10 1 * *` → monthly scan; results to chat bus + `skill-marketplace-candidates-<date>.json`
      verify: cron entry present
  - step-5:
      tool: Write
      path: `H:/prism/mcp-server/src/__tests__/SkillMarketplaceScannerEngine.test.ts`
      action: 6 cases — relevant new skill → recommendation 'install'/'study', relevant skill that dups an existing one → 'already-covered' with the name, irrelevant skill → 'skip', source unreachable → degrades to other sources + flags partial, malformed listing → skipped not crashed, round-trip through the dispatcher
      verify: 6 passed
  - step-6:
      tool: Bash
      path: `H:/prism/`
      action: round-trip E2E — `prism_knowledge:skill_marketplace_scan {min_relevance:0.5}` → candidates file produced; spot-check that PRISM's existing PDF/document skills are correctly marked `already-covered` against anthropics/skills' pdf skill
      verify: candidates file written; dedup verdicts sane

adversarial_cases:
  - skillsmp.com changes its HTML structure → scanner tolerant; if extraction yields 0 candidates, flag `source_parse_failed` not "no skills available"
  - A community skill with malicious bash in its body → scanner NEVER auto-installs; it only RECOMMENDS; install is a human/forge action that goes through `harness-security-audit`
  - 80,000 skills listed → scanner only fetches category pages relevant to PRISM domains + a cap of 200 candidates per run; rest deferred
  - Community skill is just a worse copy of a PRISM skill → dedup verdict `already-covered`; don't recommend regression

variability_axis:
  - source: skillsmp.com / anthropics/skills / wshobson/agents / obra/superpowers
  - relevance: high (manufacturing-specific) / medium (general dev) / low (off-domain)
  - dedup verdict: novel / partial-overlap / already-covered
  - reachability: all sources up / partial / all down

failure_modes:
  - Playwright unavailable → fall back to WebFetch for the GitHub READMEs (those are public, no 402); skip skillsmp.com (JS-gated) and flag it skipped — do NOT silently degrade (R12 / the standing Playwright preference)
  - Relevance scorer too loose → 200 candidates of noise; tighten domain vocabulary; require ≥2 domain-keyword hits
  - Monthly cron + `/loop --max 12` both fire → idempotent dedup on candidate-name+source
  - Recommending a skill that turns out malicious → mitigated: recommend ≠ install; install path has the security audit gate

---

## U-SKU08 — Bundle PRISM's production-grade skills as an INTERNAL plugin (public publication DEFERRED — hard rule)

> ⚠️ **HARD RULE (2026-05-11):** Nothing from the H: drive may be shared / published / distributed publicly — no public GitHub repo, no agentskills.io submission, no posting H: paths/code/data externally. This unit is therefore **internal-only**: it consolidates the production-grade skills into one installable bundle for the user's own multi-machine / multi-chat reuse. The "share publicly" step from @eng_khairallah1's Phase-4 is **deferred** behind explicit per-artifact clearance and is NOT part of this milestone. See `feedback_no_public_h_drive.md`.

- pillar: skills
- tier: T1
- ai_priority_score: 50
- leverage_score: 9
- why: @eng_khairallah1 Phase-4 — consolidating your best skills into one installable bundle (he frames it as "share publicly"; PRISM's variant is **internal distribution** per the hard rule above). Once U-SKU05's audit identifies the production-grade subset, package those as a `.claude-plugin/plugin.json` + `skills/<name>/SKILL.md` bundle for reuse across the user's own setup. Forcing function regardless of release scope: a skill you'd put in a curated bundle has to actually be production-grade.
- depends_on: [U-SKU05]
- blocks: []
- parallel_with: [U-SKU04, U-SKU07]
- viz_node_id: `core.script.export-prism-skills-plugin` (TBD-create)
- closes_synergy_edge: skills × plugins (internal distribution only — NOT external)
- loop_schedule: none (manual — rebuild on demand after each audit)

verifies_via:
  channel: integration
  tool: `node scripts/export-prism-skills-plugin.mjs --out dist/prism-manufacturing-skills/` → assert the output dir has a valid `.claude-plugin/plugin.json`, a `skills/` tree containing ONLY production-grade skills (cross-checked against the audit JSON), and a generated README; then `claude plugin validate dist/prism-manufacturing-skills/` (or the equivalent dry-run) passes
  expected_signal: plugin dir valid; skill count == audit's `production_grade` count for the chosen domain filter; no `needs_refinement`/`stub` skills leaked in
  re_run_cost: ~30s
  baseline: PRISM's skills are unpublished; no shareable bundle

micro_steps:
  - step-1:
      tool: Bash
      path: `H:/prism/`
      action: dedup — confirm no existing plugin-export script; check if PRISM already ships a `.claude-plugin/plugin.json` anywhere
      verify: clear to add
  - step-2:
      tool: Write
      path: `H:/prism/scripts/export-prism-skills-plugin.mjs`
      action: read SKILL-LIBRARY-AUDIT-<date>.json; filter to `grade == production_grade` (optional `--domain manufacturing|cad|cam|all`); copy each skill's directory (SKILL.md + scenarios/ + reference siblings) into `<out>/skills/<name>/`; write `<out>/.claude-plugin/plugin.json` (name `prism-manufacturing-skills`, description, version from git SHA, author); generate `<out>/README.md` listing each included skill with its description + trigger phrases; copy a LICENSE; emit a manifest of what was included + what was excluded-and-why
      verify: output dir structurally valid; includes only production-grade skills
  - step-3:
      tool: Write
      path: `H:/prism/scripts/__tests__/export-prism-skills-plugin.test.mjs`
      action: 6 cases — valid plugin.json emitted, only production-grade skills copied (a needs_refinement skill in the audit is NOT in the output), README lists all included skills, `--domain cad` filters correctly, scenarios/ dirs carried along, empty production-grade set → emits an empty-but-valid plugin + a warning (don't ship vapor)
      verify: 6 passed
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: run the export for `--domain manufacturing`; validate the bundle
      verify: `dist/prism-manufacturing-skills/` produced; validation passes; manifest lists included/excluded
  - step-5:
      tool: Write
      path: `H:/prism/state/shared/PRISM-SKILLS-BUNDLE-CHECKLIST.md`
      action: an INTERNAL-distribution checklist — what to verify before reusing the bundle across the user's own machines/chats (no broken sibling-file links, no machine-specific absolute paths, scenarios/ carried along, README accurate). A separate **DEFERRED — DO NOT EXECUTE** section records the bar that ANY future public release would have to clear (full secrets scan via harness-security-audit, zero H: paths, zero JM-Die data, LICENSE, and explicit per-artifact clearance from the user) — but per the hard rule, public release is OUT OF SCOPE for this milestone and must not happen without that clearance.
      verify: checklist exists; the public-release section is clearly marked DEFERRED + gated on explicit user clearance; references harness-security-audit as the gate IF that future is ever unlocked

adversarial_cases:
  - A production-grade skill references an internal file path (`H:/prism/...`) in its body → export FAILS that skill with `excluded: internal-path-leak`; doesn't ship it
  - A skill's scenarios/ fixtures contain JM Die customer data → export scrubs scenarios/ for proprietary markers; excludes if it can't scrub safely
  - Audit JSON is stale (skills changed since) → export re-runs the linter on each candidate before including; stale-pass → re-grade
  - `--domain all` would publish 200+ skills → fine, but warn that a smaller domain-focused bundle has better discoverability on the marketplace

variability_axis:
  - domain filter: manufacturing / cad / cam / dev-tools / all
  - production-grade count: 0 (empty bundle warning) / 10 / 50+
  - target: local dist/ / public GitHub repo / agentskills.io submission
  - skill complexity: single-file / with-siblings / with-scenarios

failure_modes:
  - Production-grade set is empty on first run (audit hasn't found any yet) → emit empty valid plugin + a clear warning; don't ship vapor
  - Secrets/internal-path leak slips through → harness-security-audit is a hard gate in the publish checklist; export itself also scans
  - Plugin validation tool not available → fall back to a structural JSON-schema check on plugin.json + a manual review note
  - Published bundle drifts from the live PRISM skills → version pinned to git SHA; re-export after each audit

---

## Milestone-level dependency graph

```
U-SKU06 (registry schema — foundation)
   ├──▶ U-SKU01 (3Q pre-build gate)        ─┐
   ├──▶ U-SKU02 (3-scenario test + runner)  ─┼──▶ U-SKU05 (library audit) ──▶ U-SKU08 (public export)
   ├──▶ U-SKU03 (linter)                    ─┘
   └──▶ U-SKU04 (refinement cadence) ── + LOOP-MIGRATE cron infra (soft)

U-SKU07 (marketplace scan) — standalone, soft-reuses AUTO-LEARNING-LOOP source-monitor
```

Critical path: **U-SKU06 → U-SKU02 → U-SKU05 → U-SKU08** (the test protocol gates the audit gates the export). U-SKU01/03/04 parallelizable after U-SKU06. U-SKU07 fully independent.

## Cross-cuts / synergy edges closed
- skills × registries (U-SKU06)
- skills × hooks (U-SKU01)
- skills × dev-tools × testing (U-SKU02)
- skills × lint × token-economy (U-SKU03)
- skills × loops × telemetry (U-SKU04)
- skills × audit × business-value (U-SKU05) — the highest-leverage edge here
- skills × auto-learning × external-sources (U-SKU07) — reading FROM public sources only
- skills × plugins (U-SKU08) — internal distribution only; public release deferred per hard rule (`feedback_no_public_h_drive.md`)

## Synergy with other milestones in this roadmap
- **HOOKS-AUTOMATION-V2-MS0** — skills carry scoped lifecycle hooks (`hooks:` frontmatter field); U-SKU01's gate is itself a hook; the read-once dedup (U-HKA01) and the 3Q gate share the PreToolUse-on-Write surface.
- **KNOWLEDGE-VAULT-MS0** — U-VAULT04 ("skill ↔ wiki cross-trigger registry") and U-SKU06 (skill quality registry) should share one registry, not two; reconcile at build time.
- **AUTO-LEARNING-LOOP-MS0** — U-SKU07 (marketplace scan) is a specialization of `ReputableSourceMonitorEngine`; do NOT build a parallel poller — add skillsmp.com + anthropics/skills as sources to that engine and put the domain-relevance filter on top.
- **WIKI-EVOLVE-MS0** — `/skill-lint` (U-SKU03) is a sibling of `/wiki-lint`; share the lint-core.

## Loop registrations: 2
- `/loop --interval 7d --max 4` + cron `13 9 * * 5` — weekly skill-refinement digest (U-SKU04)
- `/loop --interval 30d --max 12` + cron `0 10 1 * *` — monthly marketplace scan (U-SKU07); cron `0 8 1 * *` monthly library re-audit (U-SKU05)

## Adversarial coverage: 28 cases across 8 units
## Variability axes: 32 across 8 units
## Failure modes: 28 across 8 units

## Estimated effort: 18-26h (1 chat, sequential along the critical path; U-SKU01/03/04/07 parallelizable)

## ROI framing (per @eng_khairallah1's heuristic, applied to PRISM)
His math: 1 skill saving 30 min/wk = 26 h/yr; 10 skills = 260 h/yr. PRISM has ~637 skills. If even 100 of them are production-grade and each saves 15 min per invocation at ~4 invocations/month, that's ~1,200 h/yr of operator+agent time. The audit (U-SKU05) replaces this estimate with the real number. The point of this whole milestone is to move PRISM from "we have 637 skills" (vanity metric) to "we have N production-grade skills saving M hours/year, here's the gap list to grow N" (the @eng_khairallah1 discipline).
