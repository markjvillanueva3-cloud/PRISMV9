/**
 * command-migrate.test.ts
 *
 * COMMAND-KERNEL-MS0/U-CK07 — codemod behavior matrix.
 *
 * Exit-criteria proven here:
 *  - `--dry-run` lists every anti-pattern per command (hardcoded count,
 *    hardcoded path, session-id boilerplate, corpus-level boilerplate).
 *  - `--apply` frontmatter normalization is idempotent (re-apply → no-op)
 *    and reversible (body bytes never change — only the frontmatter block).
 *  - fails soft per-command: one unreadable/empty command is reported and
 *    skipped; the batch keeps migrating every other command.
 *
 * Comprehensive-build floor: happy path + ≥3 failure modes (empty file,
 * unclosed fence, missing description, no-frontmatter) + ≥2 adversarial
 * (binary-ish junk, a command that is only a fence) + ≥3 spanning configs
 * (well-formed / missing-name / no-frontmatter / count / path / boilerplate),
 * determinism, `_internals` units.
 *
 * Hermetic — a tmpdir command corpus, no network. The codemod is a `.mjs`
 * script; vitest imports it directly.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  migrateCommand,
  runMigration,
  parseFrontmatter,
  normalizeFrontmatter,
  detectAntiPatterns,
  detectBoilerplate,
  _internals,
} from "../../../.claude/scripts/command-migrate.mjs";

interface Fixture {
  dir: string;
  write: (name: string, text: string) => void;
  cleanup: () => void;
}

function makeFixture(): Fixture {
  const dir = mkdtempSync(join(tmpdir(), "prism-cmdmigrate-"));
  return {
    dir,
    write: (name, text) => writeFileSync(join(dir, name), text, "utf8"),
    cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* swallow */ } },
  };
}

/** A well-formed command with the given frontmatter body. */
function cmd(fm: string, body = "Run the thing.\nSecond line of body.\n"): string {
  return `---\n${fm}\n---\n\n${body}`;
}

const antiPatternTypes = (r: ReturnType<typeof migrateCommand>): string[] =>
  r.antiPatterns.map((a) => a.type);

describe("command-migrate — anti-pattern detection (--dry-run headline)", () => {
  it("detects a hardcoded inventory count", () => {
    const r = migrateCommand({
      filename: "status.md",
      text: cmd("name: status\ndescription: shows the system status overview", "PRISM has 3245 engines wired today."),
    });
    expect(r.ok).toBe(true);
    expect(antiPatternTypes(r)).toContain("hardcoded-count");
  });

  it("does NOT flag a small number that is not a rot-prone count", () => {
    const r = migrateCommand({
      filename: "x.md",
      text: cmd("name: x\ndescription: a command that mentions 3 engines only", "Pick 3 engines and go."),
    });
    expect(antiPatternTypes(r)).not.toContain("hardcoded-count");
  });

  it("detects a hardcoded absolute path", () => {
    const r = migrateCommand({
      filename: "p.md",
      text: cmd("name: p\ndescription: a command with a baked absolute path inside", "Read H:/prism/scripts/thing.mjs now."),
    });
    expect(antiPatternTypes(r)).toContain("hardcoded-path");
  });

  it("detects session-id boilerplate", () => {
    const r = migrateCommand({
      filename: "s.md",
      text: cmd("name: s\ndescription: a command that derives the stable session id", "STABLE=$(node helper.mjs)"),
    });
    expect(antiPatternTypes(r)).toContain("session-id-boilerplate");
  });

  it("a clean command yields zero anti-patterns", () => {
    const r = migrateCommand({
      filename: "clean.md",
      text: cmd("name: clean\ndescription: a clean command with no anti-patterns at all", "Do the work cleanly."),
    });
    expect(r.antiPatterns).toEqual([]);
  });
});

describe("command-migrate — frontmatter normalization (--apply)", () => {
  it("HAPPY: adds `name:` derived from the filename when absent", () => {
    const r = migrateCommand(
      { filename: "my-skill.md", text: cmd("description: a skill missing its name field entirely") },
      { apply: true },
    );
    expect(r.changes.some((c) => c.includes("added name: my-skill"))).toBe(true);
    expect(parseFrontmatter(r.migrated).fmLines).toContain("name: my-skill");
  });

  it("normalizes `key:value` spacing", () => {
    const r = migrateCommand(
      { filename: "k.md", text: "---\nname:k\ndescription:   squished and padded value here\n---\n\nbody\n" },
      { apply: true },
    );
    const fm = parseFrontmatter(r.migrated).fmLines;
    expect(fm).toContain("name: k");
    expect(fm).toContain("description: squished and padded value here");
  });

  it("IDEMPOTENT: re-applying to an already-migrated command is a no-op", () => {
    const input = cmd("description: a command initially missing its name");
    const first = migrateCommand({ filename: "idem.md", text: input }, { apply: true });
    expect(first.changes.length).toBeGreaterThan(0);
    const second = migrateCommand({ filename: "idem.md", text: first.migrated }, { apply: true });
    expect(second.changes).toEqual([]);
    expect(second.migrated).toBe(first.migrated);
  });

  it("REVERSIBLE: the body is byte-identical — only the frontmatter changes", () => {
    const body = "Line one.\nLine two with H:/prism/x noise.\nLine three.\n";
    const r = migrateCommand({ filename: "b.md", text: cmd("description: command body must be preserved exactly", body) }, { apply: true });
    expect(parseFrontmatter(r.migrated).body).toBe(parseFrontmatter(cmd("description: command body must be preserved exactly", body)).body);
  });

  it("a command already conformant is left byte-identical (no change)", () => {
    const input = cmd("name: ok\ndescription: an already fully conformant command file");
    const r = migrateCommand({ filename: "ok.md", text: input }, { apply: true });
    expect(r.changes).toEqual([]);
    expect(r.migrated).toBe(input);
  });
});

describe("command-migrate — CRLF line endings + empty values", () => {
  const toCrlf = (s: string): string => s.replace(/\n/g, "\r\n");

  it("parseFrontmatter sees the frontmatter of a CRLF file + reports eol", () => {
    const fm = parseFrontmatter(toCrlf(cmd("name: c\ndescription: a crlf command that must still parse cleanly")));
    expect(fm.hasFrontmatter).toBe(true);
    expect(fm.eol).toBe("\r\n");
    expect(fm.fmLines).toContain("name: c");
  });

  it("a CRLF command missing `name` migrates AND stays CRLF (reversibility — no LF flip)", () => {
    const crlf = toCrlf(cmd("description: a crlf command initially missing its name field"));
    const r = migrateCommand({ filename: "crlf-skill.md", text: crlf }, { apply: true });
    expect(r.ok).toBe(true);
    expect(r.changes.some((c) => c.includes("added name: crlf-skill"))).toBe(true);
    // Every line ending stays CRLF — no lone \n leaked into the file.
    expect(/(?<!\r)\n/.test(r.migrated)).toBe(false);
    expect(parseFrontmatter(r.migrated).body).toBe(parseFrontmatter(crlf).body); // body untouched
  });

  it("a CRLF command is idempotent under --apply", () => {
    const crlf = toCrlf(cmd("description: a crlf command used for the idempotency check"));
    const first = migrateCommand({ filename: "ci.md", text: crlf }, { apply: true });
    const second = migrateCommand({ filename: "ci.md", text: first.migrated }, { apply: true });
    expect(second.changes).toEqual([]);
    expect(second.migrated).toBe(first.migrated);
  });

  it("an empty `name:` value is filled with the slug (CK06 requires non-empty)", () => {
    const r = migrateCommand(
      { filename: "en.md", text: "---\nname:\ndescription: a command whose name value is blank here\n---\n\nbody\n" },
      { apply: true },
    );
    expect(r.changes.some((c) => c.includes("set empty name: en"))).toBe(true);
    expect(parseFrontmatter(r.migrated).fmLines).toContain("name: en");
  });

  it("an empty `description:` value is warned (cannot be synthesized)", () => {
    const r = migrateCommand({ filename: "ed.md", text: "---\nname: ed\ndescription:\n---\n\nbody\n" });
    expect(r.warnings).toEqual(expect.arrayContaining([expect.stringContaining("description")]));
  });
});

describe("command-migrate — fail-soft + failure modes", () => {
  it("FAILURE: an empty command file → ok:false, not a throw", () => {
    const r = migrateCommand({ filename: "empty.md", text: "" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("empty");
  });

  it("FAILURE: an unclosed frontmatter fence → warned, no crash", () => {
    const r = migrateCommand({ filename: "bad.md", text: "---\nname: bad\n(no closing fence)\nbody\n" });
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual(expect.arrayContaining([expect.stringContaining("malformed")]));
  });

  it("FAILURE: a command with no frontmatter at all → warned, untouched on apply", () => {
    const input = "Just a body, no frontmatter.\n";
    const r = migrateCommand({ filename: "nofm.md", text: input }, { apply: true });
    expect(r.warnings).toEqual(expect.arrayContaining([expect.stringContaining("no frontmatter")]));
    expect(r.migrated).toBe(input); // no safe mechanical fix → untouched
  });

  it("FAILURE: missing required `description` is warned (never synthesized)", () => {
    const r = migrateCommand({ filename: "nod.md", text: cmd("name: nod") }, { apply: true });
    expect(r.warnings).toEqual(expect.arrayContaining([expect.stringContaining("description")]));
  });

  it("ADVERSARIAL: junk / fence-only input does not throw", () => {
    expect(migrateCommand({ filename: "j.md", text: "  binary junk ￿" }).ok).toBe(true);
    expect(migrateCommand({ filename: "f.md", text: "---\n---\n" }).ok).toBe(true);
  });
});

describe("command-migrate — runMigration (corpus, fail-soft batch)", () => {
  let f: Fixture;
  beforeEach(() => { f = makeFixture(); });
  afterEach(() => f.cleanup());

  it("dry-run scans the corpus and reports anti-patterns without writing", () => {
    f.write("a.md", cmd("name: a\ndescription: command a with a hardcoded path inside", "see H:/prism/x"));
    f.write("b.md", cmd("name: b\ndescription: command b is perfectly clean here", "all good"));
    const original = readFileSync(join(f.dir, "a.md"), "utf8");
    const { summary } = runMigration({ commandsDir: f.dir, apply: false });
    expect(summary.mode).toBe("dry-run");
    expect(summary.total).toBe(2);
    expect(summary.antiPatternTotal).toBeGreaterThanOrEqual(1);
    expect(summary.applied).toBe(0);
    expect(readFileSync(join(f.dir, "a.md"), "utf8")).toBe(original); // dry-run never writes
  });

  it("apply writes normalized frontmatter; one bad file does not halt the batch", () => {
    f.write("good.md", cmd("description: a good command missing only its name field"));
    f.write("empty.md", "");
    f.write("also-good.md", cmd("description: another good command also missing its name"));
    const { commands, summary } = runMigration({ commandsDir: f.dir, apply: true });
    expect(summary.total).toBe(3);
    expect(summary.failed).toBe(1); // empty.md
    expect(summary.applied).toBe(2); // both good commands migrated despite the bad one
    expect(commands.find((c) => c.filename === "empty.md")?.ok).toBe(false);
    expect(readFileSync(join(f.dir, "good.md"), "utf8")).toContain("name: good");
  });

  it("apply is idempotent at the corpus level (second run applies nothing)", () => {
    f.write("c.md", cmd("description: a command for the corpus idempotency check"));
    runMigration({ commandsDir: f.dir, apply: true });
    const second = runMigration({ commandsDir: f.dir, apply: true });
    expect(second.summary.applied).toBe(0);
  });

  it("missing commands dir → graceful summary, no throw", () => {
    const { summary } = runMigration({ commandsDir: join(f.dir, "does-not-exist"), apply: true });
    expect(summary.error).toContain("not found");
    expect(summary.total).toBe(0);
  });
});

describe("command-migrate — boilerplate-hash (corpus-level)", () => {
  it("flags a 5+ line block duplicated across >= MIN_BOILERPLATE_COMMANDS commands", () => {
    const shared = "Step one of the shared block.\nStep two of the shared block.\nStep three here.\nStep four here.\nStep five here.";
    const docs = [];
    for (let i = 0; i < _internals.MIN_BOILERPLATE_COMMANDS; i++) {
      docs.push({ slug: `dup${i}`, body: `Intro for command ${i}.\n${shared}\nUnique tail ${i}.` });
    }
    docs.push({ slug: "unique", body: "A wholly unique command body.\nNothing shared at all here.\n" });
    const flagged = detectBoilerplate(docs);
    expect(flagged.get("dup0")?.some((x) => x.type === "boilerplate-hash")).toBe(true);
    expect(flagged.get("dup0")?.[0].count).toBeGreaterThanOrEqual(_internals.MIN_BOILERPLATE_COMMANDS);
    expect(flagged.get("unique")).toEqual([]);
  });

  it("a block in only a few commands is NOT flagged as boilerplate", () => {
    const shared = "only two share.\nthis line too.\nand this.\nand this one.\nlast shared line.";
    const docs = [
      { slug: "x", body: shared },
      { slug: "y", body: shared },
      { slug: "z", body: "totally different content here.\nmore unique lines.\n" },
    ];
    const flagged = detectBoilerplate(docs);
    expect(flagged.get("x")).toEqual([]); // 2 < MIN_BOILERPLATE_COMMANDS
  });
});

describe("command-migrate — _internals (pure)", () => {
  it("slugFromFilename: kebab slug from a .md filename", () => {
    expect(_internals.slugFromFilename("My_Skill.md")).toBe("my-skill");
    expect(_internals.slugFromFilename("checkin-alpha.md")).toBe("checkin-alpha");
    expect(_internals.slugFromFilename("")).toBe("");
  });
  it("frontmatterKeys: extracts top-level keys", () => {
    const keys = _internals.frontmatterKeys(["name: x", "description: y", "  nested: skip", "tier: T2"]);
    expect(keys.has("name")).toBe(true);
    expect(keys.has("tier")).toBe(true);
    expect(keys.has("nested")).toBe(false); // indented → not top-level
  });
  it("parseFrontmatter: splits fence from body; flags missing/unclosed", () => {
    const ok = parseFrontmatter("---\nname: a\n---\nbody here");
    expect(ok.hasFrontmatter).toBe(true);
    expect(ok.body).toBe("body here");
    expect(parseFrontmatter("no fence here").hasFrontmatter).toBe(false);
    expect(parseFrontmatter("---\nname: a\nunclosed").malformed).toBe(true);
  });
  it("detectAntiPatterns: line numbers are 1-based", () => {
    const aps = detectAntiPatterns("clean line\nPRISM has 4500 hooks here\nclean again");
    expect(aps[0].type).toBe("hardcoded-count");
    expect(aps[0].line).toBe(2);
  });
});
