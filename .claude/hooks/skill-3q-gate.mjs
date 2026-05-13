#!/usr/bin/env node
// tier: T0
/**
 * skill-3q-gate.mjs — U-SKU01 (SKILLS-UTILIZATION-MS0) PreToolUse gate.
 *
 * @eng_khairallah1 Phase-2: before a skill is written, three questions must be
 * answered — (Q1) what does this skill DO? be brutally specific; (Q2) WHEN should
 * it activate? list ≥5 trigger phrases; (Q3) what does PERFECT OUTPUT look like?
 * show an actual example. This hook BLOCKS any `Write`/`Edit`/`MultiEdit` whose
 * target is a skill file (`**​/SKILL.md`, `.claude/commands/*.md`, or a
 * `commands/*.md` under a plugin) unless the *resulting* content satisfies all
 * three — so `/forge-skills` (and manual authors) can't accumulate vague stubs.
 *
 * Latency discipline (the failure-mode the spec calls out): the path check is a
 * cheap regex done FIRST; the tsx import of `skillQualitySchema.ts` (so the
 * gate's Q1/Q2/Q3 use the *same* primitives as the U-SKU03 linter's R1/R3/R7)
 * happens only when the path actually matches a skill file — which is rare.
 *
 * Exemptions: `skill_type: methodology` or `reference` in the frontmatter exempts
 * Q3 (no single "output sample"); `disable-model-invocation: true` exempts Q2
 * (the description isn't loaded); a `trigger_phrases:` frontmatter array of ≥5
 * satisfies Q2 on its own. Escape hatch: `_skip_3q_gate: true` in the tool input,
 * or `PRISM_SKILL_3Q_GATE=0` in the environment.
 *
 * Output: `{decision:"block", reason:"3Q-gate: …"}` to deny, `{decision:"approve"}`
 * to allow (PRISM PreToolUse convention; see duplication-hard-block.mjs).
 *
 * PENDING-WIRE (U-SKU01 step-3): not yet registered. Wire as a PreToolUse hook
 * (matcher `Edit|Write|MultiEdit`, placed AFTER the existing edit-bundle so it
 * sees the final content) once `work/skills-utilization-ms0` merges:
 *   { "type": "command",
 *     "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/skill-3q-gate.mjs",
 *     "timeout": 8000 }
 * Deferred this session because settings.json registration lives in the
 * machine-level config (c-to-h-mirror'd) and the project settings.json has
 * in-flight WIP. Step-4 (a "Phase 0: Three-Question Test" section in the
 * `forge-skills` skill) is likewise deferred — `forge-skills.md` is a user-level
 * skill, out of this worktree's lane.
 */
import fs from "node:fs";
import path from "node:path";

const SKILL_PATH_RE = /(?:[\\/]SKILL\.md$|[\\/]\.claude[\\/]commands[\\/][^\\/]+\.md$|[\\/]commands[\\/][^\\/]+\.md$)/i;
const Q1_MIN_DESC_CHARS = 40;
const Q2_MIN_TRIGGER_PHRASES = 5;

const RESEARCH_REF = "state/shared/research/2026-05-10-skills-openclaw.md §2";

function readStdin() { try { return fs.readFileSync(0, "utf8"); } catch { return ""; } }
const approve = () => { console.log(JSON.stringify({ decision: "approve" })); };
const block = (reason) => { console.log(JSON.stringify({ decision: "block", reason })); };

/** Reconstruct the file content that the tool call would produce. Returns null when
 *  we can't (an Edit whose old_string isn't in the current file, etc.) — in which
 *  case the gate allows (don't block on the hook's own confusion). */
function resultingContent(toolName, ti) {
  if (toolName === "Write") return typeof ti.content === "string" ? ti.content : null;
  const fp = ti.file_path;
  let cur = "";
  try { cur = fs.readFileSync(fp, "utf8"); } catch { cur = ""; }
  if (toolName === "Edit") {
    if (typeof ti.old_string !== "string" || typeof ti.new_string !== "string") return null;
    if (ti.old_string === "" && cur === "") return ti.new_string;        // create-via-Edit
    if (!cur.includes(ti.old_string)) return null;
    return ti.replace_all ? cur.split(ti.old_string).join(ti.new_string) : cur.replace(ti.old_string, ti.new_string);
  }
  if (toolName === "MultiEdit") {
    if (!Array.isArray(ti.edits)) return null;
    let out = cur;
    for (const e of ti.edits) {
      if (typeof e.old_string !== "string" || typeof e.new_string !== "string") return null;
      if (e.old_string === "" && out === "") { out = e.new_string; continue; }
      if (!out.includes(e.old_string)) return null;
      out = e.replace_all ? out.split(e.old_string).join(e.new_string) : out.replace(e.old_string, e.new_string);
    }
    return out;
  }
  return null;
}

function distinctTriggerPhraseCount(description, frontmatter, schema) {
  // a frontmatter `trigger_phrases:` array of ≥5 satisfies Q2 on its own
  const fmTp = frontmatter?.trigger_phrases;
  if (Array.isArray(fmTp)) {
    const distinct = [...new Set(fmTp.map((s) => String(s).trim().toLowerCase()).filter(Boolean))];
    if (distinct.length >= Q2_MIN_TRIGGER_PHRASES) return distinct.length;
    // fall through to the description heuristic — take the max of the two signals
    return Math.max(distinct.length, schema.extractTriggerPhrases(description).length);
  }
  return schema.extractTriggerPhrases(description).length;
}

async function main() {
  if (process.env.PRISM_SKILL_3Q_GATE === "0") return approve();

  let input = {};
  try { input = JSON.parse(readStdin() || "{}"); } catch { input = {}; }
  const toolName = input.tool_name ?? input.toolName ?? "";
  const ti = input.tool_input ?? input.toolInput ?? {};

  // --- cheap gates first (no imports) ---
  if (!/^(Write|Edit|MultiEdit)$/.test(toolName)) return approve();
  const fp = ti.file_path ?? ti.filePath ?? "";
  if (typeof fp !== "string" || !SKILL_PATH_RE.test(fp)) return approve();
  if (ti._skip_3q_gate === true || ti.skip_3q_gate === true) return approve();

  // --- only now pay the tsx cost (skill edits are rare) ---
  let schema;
  try {
    const { register } = await import("tsx/esm/api");
    register();
    schema = await import("../../mcp-server/src/schemas/skillQualitySchema.ts");
  } catch {
    // can't load the shared primitives → don't block (the U-SKU03 linter still catches it after the fact)
    return approve();
  }

  const content = resultingContent(toolName, ti);
  if (content == null) return approve();                       // couldn't reconstruct → allow

  const parsed = schema.parseSkillFile(content);
  if (parsed.parseError) {
    return block(`3Q-gate: the skill's frontmatter block is malformed — "${parsed.parseError}". Fix the \`---\` block (it must open AND close), then the 3 questions are re-checked. See ${RESEARCH_REF}`);
  }
  const fm = parsed.frontmatter ?? {};
  const body = parsed.body ?? "";
  const description = typeof fm.description === "string" ? fm.description : "";
  const skillType = schema.coerceSkillType(fm.skill_type ?? fm["skill-type"]);
  const disableModelInvocation = fm["disable-model-invocation"] === true || fm.disable_model_invocation === true;

  // --- Q1: brutally specific description ---
  if (description.trim().length < Q1_MIN_DESC_CHARS) {
    return block(`3Q-gate: Q1 — the \`description\` must be ≥${Q1_MIN_DESC_CHARS} chars and say concretely what the skill does (got ${description.trim().length}). "${description.slice(0, 60)}". See ${RESEARCH_REF}`);
  }
  for (const re of schema.VAGUE_DESCRIPTION_OPENERS) {
    if (re.test(description)) {
      return block(`3Q-gate: Q1 — the \`description\` is a vague hand-wave ("${description.slice(0, 80)}") — name what the skill concretely does and when it fires. See ${RESEARCH_REF}`);
    }
  }
  const descVague = schema.detectVagueLanguageViolations(description);
  if (descVague.length) {
    return block(`3Q-gate: Q1 — the \`description\` contains banned vague language (${descVague.join(", ")}). Replace it with concrete, testable wording. See ${RESEARCH_REF}`);
  }
  if (description.length > schema.SKILL_DESCRIPTION_MAX_CHARS) {
    return block(`3Q-gate: Q1 — the \`description\` is ${description.length} chars; cap is ${schema.SKILL_DESCRIPTION_MAX_CHARS}. Tighten it. See ${RESEARCH_REF}`);
  }

  // --- Q2: ≥5 distinct trigger phrases (exempt for non-model-invocable / reference skills) ---
  if (!disableModelInvocation && skillType !== "reference") {
    const n = distinctTriggerPhraseCount(description, fm, schema);
    if (n < Q2_MIN_TRIGGER_PHRASES) {
      return block(`3Q-gate: Q2 — the description yields only ${n} distinct trigger phrase(s); ≥${Q2_MIN_TRIGGER_PHRASES} required. Add quoted "use when …" phrases to the description, or a \`trigger_phrases:\` array of ≥${Q2_MIN_TRIGGER_PHRASES} to the frontmatter. See ${RESEARCH_REF}`);
    }
  }

  // --- Q3: a perfect-output example (exempt for methodology / reference skills) ---
  if (skillType !== "methodology" && skillType !== "reference" && !schema.detectOutputExample(body)) {
    return block(`3Q-gate: Q3 — show what perfect output looks like (a fenced code block or table near "example"/"output"/"perfect"/"returns"/"result"). If this skill has no single output sample, add \`skill_type: methodology\` to the frontmatter or pass \`_skip_3q_gate: true\`. See ${RESEARCH_REF}`);
  }

  return approve();
}

main().catch(() => { approve(); });   // any unexpected failure ⇒ allow, never strand an edit
