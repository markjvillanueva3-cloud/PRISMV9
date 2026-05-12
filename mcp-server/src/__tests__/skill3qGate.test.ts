/**
 * skill3qGate.test.ts — U-SKU01 (SKILLS-UTILIZATION-MS0) coverage for the
 * Three-Question pre-build gate `.claude/hooks/skill-3q-gate.mjs`.
 *
 * The hook is a PreToolUse gate: it reads `{tool_name, tool_input}` on stdin and
 * prints `{decision:"approve"}` or `{decision:"block", reason:"3Q-gate: …"}`.
 * Tests drive it with `spawnSync('node', [hook], {input: JSON.stringify(...)})`
 * and assert the decision + (for blocks) which question failed.
 *
 * Coverage: a fully-compliant skill is allowed; each of Q1 (vague / too short),
 * Q2 (<5 trigger phrases), Q3 (no output example) blocks with the right message;
 * the `_skip_3q_gate` tool-input flag and the `PRISM_SKILL_3Q_GATE=0` env both
 * bypass; non-skill paths and non-edit tools aren't gated; a plugin-namespaced
 * `SKILL.md` IS gated; `skill_type: methodology` exempts Q3; `disable-model-
 * invocation: true` exempts Q2; malformed frontmatter blocks; and an `Edit` is
 * reconstructed against the on-disk file and the *result* re-checked.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const HOOK = path.join(REPO_ROOT, ".claude", "hooks", "skill-3q-gate.mjs");

const COMPLIANT_DESC = 'Use when the user asks to "validate a manifest", "check a config schema", "lint a settings file", "audit deploy parameters", or "verify a YAML file before commit" — runs the project schema checker and reports the keys that violate it.';
const OUTPUT_BODY = "# /demo\n\nValidates files against the project schema.\n\n## Output\n```\nfoo.yml: 2 violations — `port` must be int, `host` required\n```\n";
const NO_OUTPUT_BODY = "# /demo\n\nDoes the thing in three steps.\n\n## Steps\n1. one\n2. two\n3. three\n";
const mkSkill = (fm: string, body: string) => `---\n${fm}\n---\n${body}`;

interface GateResult { decision: string; reason: string; raw: string; status: number }
function runGate(toolName: string, toolInput: Record<string, unknown>, env: Record<string, string> = {}): GateResult {
  const r = spawnSync(process.execPath, [HOOK], {
    cwd: REPO_ROOT,
    input: JSON.stringify({ tool_name: toolName, tool_input: toolInput }),
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 30_000,
  });
  let parsed: any = {};
  try { parsed = JSON.parse((r.stdout ?? "").trim()); } catch { parsed = {}; }
  return { decision: String(parsed.decision ?? ""), reason: String(parsed.reason ?? ""), raw: r.stdout ?? "", status: r.status ?? -1 };
}

describe("skill-3q-gate.mjs — PreToolUse Three-Question gate", () => {
  it("allows a fully-3Q-compliant SKILL.md Write", () => {
    const g = runGate("Write", { file_path: "/x/.claude/commands/demo.md", content: mkSkill(`name: demo\ndescription: ${COMPLIANT_DESC}`, OUTPUT_BODY) });
    expect(g.decision).toBe("approve");
  });

  it("denies Q1 — banned vague language in the description", () => {
    const g = runGate("Write", {
      file_path: "/x/.claude/commands/vague.md",
      content: mkSkill(`name: vague\ndescription: This skill processes various inputs and handles them as needed, doing whatever the situation appropriately requires.`, OUTPUT_BODY),
    });
    expect(g.decision).toBe("block");
    expect(g.reason).toMatch(/3Q-gate: Q1/);
    expect(g.reason).toMatch(/vague language/i);
  });

  it("denies Q1 — description shorter than 40 chars", () => {
    const g = runGate("Write", { file_path: "/x/SKILL.md", content: mkSkill(`name: t\ndescription: does things`, OUTPUT_BODY) });
    expect(g.decision).toBe("block");
    expect(g.reason).toMatch(/3Q-gate: Q1/);
    expect(g.reason).toMatch(/≥40|40 chars/);
  });

  it("denies Q2 — fewer than 5 distinct trigger phrases", () => {
    const g = runGate("Write", {
      file_path: "/x/.claude/commands/q2.md",
      content: mkSkill(`name: q2\ndescription: Runs the project schema checker over a manifest and prints which keys violate the schema together with their line numbers.`, OUTPUT_BODY),
    });
    expect(g.decision).toBe("block");
    expect(g.reason).toMatch(/3Q-gate: Q2/);
    expect(g.reason).toMatch(/trigger phrase/i);
  });

  it("denies Q3 — no perfect-output example in the body", () => {
    const g = runGate("Write", { file_path: "/x/.claude/commands/q3.md", content: mkSkill(`name: q3\ndescription: ${COMPLIANT_DESC}`, NO_OUTPUT_BODY) });
    expect(g.decision).toBe("block");
    expect(g.reason).toMatch(/3Q-gate: Q3/);
  });

  it("allows when _skip_3q_gate: true is in the tool input", () => {
    const g = runGate("Write", { file_path: "/x/.claude/commands/q3.md", content: mkSkill(`name: q3\ndescription: ${COMPLIANT_DESC}`, NO_OUTPUT_BODY), _skip_3q_gate: true });
    expect(g.decision).toBe("approve");
  });

  it("allows when PRISM_SKILL_3Q_GATE=0", () => {
    const g = runGate("Write", { file_path: "/x/.claude/commands/q3.md", content: mkSkill(`name: q3\ndescription: ${COMPLIANT_DESC}`, NO_OUTPUT_BODY) }, { PRISM_SKILL_3Q_GATE: "0" });
    expect(g.decision).toBe("approve");
  });

  it("does not gate a non-skill .md file", () => {
    const g = runGate("Write", { file_path: "/x/README.md", content: "# Readme\n\njust prose, no frontmatter" });
    expect(g.decision).toBe("approve");
  });

  it("does not gate a non-edit tool", () => {
    const g = runGate("Read", { file_path: "/x/.claude/commands/demo.md" });
    expect(g.decision).toBe("approve");
  });

  it("gates a plugin-namespaced SKILL.md", () => {
    const g = runGate("Write", { file_path: "/h/.claude/plugins/cache/mp/pl/1.0.0/skills/foo/SKILL.md", content: mkSkill(`name: foo\ndescription: ${COMPLIANT_DESC}`, NO_OUTPUT_BODY) });
    expect(g.decision).toBe("block");
    expect(g.reason).toMatch(/3Q-gate: Q3/);
  });

  it("exempts Q3 for a methodology skill", () => {
    const g = runGate("Write", { file_path: "/x/.claude/commands/method.md", content: mkSkill(`name: method\ndescription: ${COMPLIANT_DESC}\nskill_type: methodology`, NO_OUTPUT_BODY) });
    expect(g.decision).toBe("approve");
  });

  it("exempts Q2 for a disable-model-invocation skill", () => {
    const g = runGate("Write", { file_path: "/x/.claude/commands/internal.md", content: mkSkill(`name: internal\ndescription: Internal helper that rebuilds the per-shop pricing cache after an ERP sync run.\ndisable-model-invocation: true`, OUTPUT_BODY) });
    expect(g.decision).toBe("approve");
  });

  it("blocks a SKILL.md whose frontmatter block is never closed", () => {
    const g = runGate("Write", { file_path: "/x/SKILL.md", content: `---\nname: broken\ndescription: ${COMPLIANT_DESC}\n# never closes the --- block\n# /broken\n\nbody\n` });
    expect(g.decision).toBe("block");
    expect(g.reason).toMatch(/malformed/i);
  });

  it("reconstructs an Edit against the on-disk file and re-checks the result", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-3q-edit-"));
    try {
      const cmdDir = path.join(dir, ".claude", "commands");      // path must match the skill-file regex
      fs.mkdirSync(cmdDir, { recursive: true });
      const fp = path.join(cmdDir, "edit-target.md");
      const original = mkSkill(`name: edit-target\ndescription: ${COMPLIANT_DESC}`, OUTPUT_BODY);
      fs.writeFileSync(fp, original);

      // Edit that rewrites the description to a vague hand-wave → block on Q1
      const bad = runGate("Edit", { file_path: fp, old_string: `description: ${COMPLIANT_DESC}`, new_string: "description: Handles various things appropriately as needed." });
      expect(bad.decision).toBe("block");
      expect(bad.reason).toMatch(/3Q-gate: Q1/);

      // Edit that only tweaks a body line — the result is still compliant → approve
      const ok = runGate("Edit", { file_path: fp, old_string: "Validates files against the project schema.", new_string: "Validates configuration files against the project schema, key by key." });
      expect(ok.decision).toBe("approve");

      // Edit whose old_string isn't in the file → can't reconstruct → allow (don't block on confusion)
      const cant = runGate("Edit", { file_path: fp, old_string: "this text is not in the file", new_string: "whatever" });
      expect(cant.decision).toBe("approve");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
