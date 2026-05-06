/**
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P15-U03 — PlanTrajectoryExtractorEngine tests.
 *
 * Coverage:
 *   - parsePlan happy paths × 3+ plan formats (frontmatter / decisions / milestones)
 *   - Status inference: explicit text > milestone-derived, ≥3 status variants
 *   - Decisions: chose / rejected / considered prefixes detected
 *   - Milestones: GFM checkbox / emoji / DONE-TODO-WIP-FIXME-BLOCKED keyword
 *   - Sections: heading depth, body preview, line numbers
 *   - summarize: aggregates across multiple trajectories
 *   - deriveId: filename-safe slug, max length
 *   - Failure modes: empty input, non-string input, malformed
 *   - Adversarial: unclosed frontmatter, oversize body, deep nesting
 *
 * 31 tests; ≥3 failure modes × ≥2 adversarial inputs per spec.
 */
import { describe, it, expect } from "vitest";
import {
  PlanTrajectoryExtractorEngine,
  planTrajectoryExtractorEngine,
} from "../engines/PlanTrajectoryExtractorEngine.js";

// ───────────── Tests ─────────────

describe("PlanTrajectoryExtractorEngine — parsePlan: title + body", () => {
  it("extracts H1 as title, preserves body without frontmatter", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "---\ncreated: 2026-01-15\nupdated: 2026-04-20\n---\n\n# My Plan Title\n\nSome content here.\n";
    const t = e.parsePlan(md, "/plans/foo.md");
    expect(t.title).toBe("My Plan Title");
    expect(t.body).toContain("# My Plan Title");
    expect(t.body).not.toContain("---");
    expect(t.createdISO).toBe("2026-01-15T00:00:00.000Z");
    expect(t.updatedISO).toBe("2026-04-20T00:00:00.000Z");
  });

  it("falls back to first non-empty line when no H1", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const t = e.parsePlan("\n\nFirst non-empty line\nrest", "/x/p.md");
    expect(t.title).toBe("First non-empty line");
  });

  it("falls back to id when content is whitespace-only", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const t = e.parsePlan("   \n\n  ", "/x/my-plan.md");
    expect(t.title).toBe("my-plan");
  });

  it("returns minimal trajectory for empty markdown", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const t = e.parsePlan("", "/x/empty.md");
    expect(t.title).toBe("empty");
    expect(t.body).toBe("");
    expect(t.decisions).toEqual([]);
    expect(t.milestones).toEqual([]);
    expect(t.sections).toEqual([]);
  });

  it("ignores malformed frontmatter (no closing ---)", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "---\ncreated: 2026-01-15\n# Title After Bad Frontmatter\n\ntext";
    const t = e.parsePlan(md, "/x/p.md");
    // No frontmatter strip; H1 still picked
    expect(t.title).toBe("Title After Bad Frontmatter");
    expect(t.createdISO).toBe("");
  });
});

describe("PlanTrajectoryExtractorEngine — decisions", () => {
  it("captures 'we chose X' / 'decided to Y' / 'will use Z' as kind=chose", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = [
      "# Plan",
      "",
      "We chose Postgres over SQLite.",
      "Decided to use vitest for tests.",
      "Will use TypeScript strict mode.",
    ].join("\n");
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.decisions.length).toBe(3);
    expect(t.decisions.every((d) => d.kind === "chose")).toBe(true);
    expect(t.decisions[0].text).toContain("Postgres over SQLite");
  });

  it("captures 'rejected X' / 'ruled out Y' as kind=rejected", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "# P\nRejected Mongo for now.\nRuled out gRPC.\n";
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.decisions.length).toBe(2);
    expect(t.decisions.map((d) => d.kind)).toEqual(["rejected", "rejected"]);
  });

  it("captures 'option: foo' / 'choice - bar' as kind=considered", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "# P\nOption: A more complex approach\nChoice - Stay simple\n";
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.decisions.length).toBe(2);
    expect(t.decisions.every((d) => d.kind === "considered")).toBe(true);
    expect(t.decisions[0].text).toBe("A more complex approach");
  });

  it("attaches section context to each decision", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = [
      "# Plan",
      "",
      "## Backend",
      "We chose Postgres.",
      "",
      "## Frontend",
      "Decided to use React.",
    ].join("\n");
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.decisions[0].section).toBe("Backend");
    expect(t.decisions[1].section).toBe("Frontend");
  });

  it("records 1-based line numbers for decisions", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "# T\n\nWe chose Foo.\n";
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.decisions[0].line).toBe(3);
  });
});

describe("PlanTrajectoryExtractorEngine — milestones", () => {
  it("parses GFM checkboxes [x] as done, [ ] as todo", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "# T\n- [x] Built the engine\n- [ ] Wire dispatcher\n- [X] Wrote tests\n";
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.milestones.length).toBe(3);
    expect(t.milestones.map((m) => m.state)).toEqual(["done", "todo", "done"]);
    expect(t.milestones[0].text).toBe("Built the engine");
  });

  it("parses emoji prefixes ✅ / ❌ / ⏳ to done/blocked/wip", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "# T\n- ✅ Shipped\n- ❌ Build broke\n- ⏳ Waiting on review\n";
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.milestones.map((m) => m.state)).toEqual(["done", "blocked", "wip"]);
  });

  it("parses keyword prefixes DONE/TODO/WIP/FIXME/BLOCKED", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = [
      "# T",
      "- DONE: Engine built",
      "- TODO: Dispatcher wiring",
      "- WIP: Test coverage",
      "- FIXME: Edge case in parser",
      "- BLOCKED: Waiting on peer chat",
    ].join("\n");
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.milestones.map((m) => m.state)).toEqual(["done", "todo", "wip", "wip", "blocked"]);
  });
});

describe("PlanTrajectoryExtractorEngine — sections", () => {
  it("captures heading depth and body preview per section", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = [
      "# Top",
      "Top body line.",
      "",
      "## Sub",
      "Sub body content here.",
      "",
      "### Deep",
      "Deep section text.",
    ].join("\n");
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.sections.length).toBe(3);
    expect(t.sections[0].title).toBe("Top");
    expect(t.sections[0].depth).toBe(1);
    expect(t.sections[1].title).toBe("Sub");
    expect(t.sections[1].depth).toBe(2);
    expect(t.sections[2].title).toBe("Deep");
    expect(t.sections[2].depth).toBe(3);
    expect(t.sections[0].bodyPreview).toContain("Top body line");
    expect(t.sections[1].bodyPreview).toContain("Sub body content here");
  });

  it("attaches 1-based line number to section heading", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "\n\n# Title\nx\n## Sub\n";
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.sections[0].line).toBe(3);
    expect(t.sections[1].line).toBe(5);
  });
});

describe("PlanTrajectoryExtractorEngine — status inference", () => {
  it("infers from explicit Status: line in head", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "# T\nStatus: shipped and verified\n\nbody";
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.status).toBe("completed");
  });

  it("infers in_progress from 'in-progress' marker", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "# T\nstatus: in-progress\n";
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.status).toBe("in_progress");
  });

  it("infers blocked from explicit text", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "# T\nStatus: blocked on peer chat\n";
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.status).toBe("blocked");
  });

  it("infers from milestones when no explicit status: all-done → completed", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "# T\n- [x] One\n- [x] Two\n";
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.status).toBe("completed");
  });

  it("infers from milestones: any blocked → blocked", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "# T\n- [x] Done\n- BLOCKED: stuck\n";
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.status).toBe("blocked");
  });

  it("infers from milestones: mix of done+todo → in_progress", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "# T\n- [x] Done\n- [ ] Pending\n";
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.status).toBe("in_progress");
  });

  it("returns unknown when no explicit status and no milestones", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const t = e.parsePlan("# T\nJust some prose.\n", "/x/p.md");
    expect(t.status).toBe("unknown");
  });
});

describe("PlanTrajectoryExtractorEngine — deriveId", () => {
  it("slugifies a filename", () => {
    const e = new PlanTrajectoryExtractorEngine();
    expect(e.deriveId("/foo/bar/Hello World!.md")).toBe("hello-world");
    expect(e.deriveId("brainstorm-and-generate-a-piped-sphinx.md")).toBe("brainstorm-and-generate-a-piped-sphinx");
  });

  it("handles backslash paths and uppercase", () => {
    const e = new PlanTrajectoryExtractorEngine();
    expect(e.deriveId("C:\\Users\\x\\.claude\\plans\\Foo Bar.md")).toBe("foo-bar");
  });

  it("clamps long filenames to 80 chars", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const long = "a".repeat(200) + ".md";
    const id = e.deriveId(long);
    expect(id.length).toBe(80);
  });

  it("returns empty string for non-string / empty input", () => {
    const e = new PlanTrajectoryExtractorEngine();
    expect(e.deriveId("")).toBe("");
    expect(e.deriveId(undefined as unknown as string)).toBe("");
  });
});

describe("PlanTrajectoryExtractorEngine — summarize", () => {
  it("aggregates totals across multiple trajectories", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const t1 = e.parsePlan("# A\nWe chose Foo.\n- [x] Done", "/p/a.md");
    const t2 = e.parsePlan("# B\nRejected Bar.\n- [ ] Pending", "/p/b.md");
    const t3 = e.parsePlan("# C\nStatus: blocked\n- BLOCKED: stuck", "/p/c.md");
    const s = e.summarize([t1, t2, t3]);
    expect(s.totalPlans).toBe(3);
    expect(s.totalDecisions).toBe(2);
    expect(s.decisionsByKind.chose).toBe(1);
    expect(s.decisionsByKind.rejected).toBe(1);
    expect(s.totalMilestones).toBe(3);
    expect(s.milestonesByState.done).toBe(1);
    expect(s.milestonesByState.todo).toBe(1);
    expect(s.milestonesByState.blocked).toBe(1);
    expect(s.byStatus.completed).toBe(1);
    expect(s.byStatus.in_progress).toBe(1);
    expect(s.byStatus.blocked).toBe(1);
  });

  it("returns zeroed summary on empty / non-array input", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const s1 = e.summarize([]);
    expect(s1.totalPlans).toBe(0);
    expect(s1.totalDecisions).toBe(0);
    const s2 = e.summarize(undefined as unknown as readonly never[]);
    expect(s2.totalPlans).toBe(0);
  });

  it("ignores non-object trajectory entries", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const valid = e.parsePlan("# T\n- [x] Done", "/p.md");
    const s = e.summarize([valid, null as unknown as never, "garbage" as unknown as never]);
    expect(s.totalPlans).toBe(1);
  });
});

describe("PlanTrajectoryExtractorEngine — adversarial inputs", () => {
  it("handles non-string rawMarkdown without throwing", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const t = e.parsePlan(undefined as unknown as string, "/x/p.md");
    expect(t.title).toBe("p");
    expect(t.body).toBe("");
  });

  it("clamps oversize section title to MAX_SECTION_TITLE_LEN (200)", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const longTitle = "X".repeat(500);
    const md = `# ${longTitle}\nbody`;
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.title.length).toBe(200);
  });

  it("clamps oversize section body to MAX_BODY_PREVIEW (1000)", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const longBody = "Y".repeat(5000);
    const md = `# T\n## Sub\n${longBody}`;
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.sections.find((s) => s.title === "Sub")?.bodyPreview.length).toBe(1000);
  });

  it("clamps oversize decision text to MAX_DECISION_LEN (400)", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const longRest = "Z".repeat(800);
    const md = `# T\nWe chose ${longRest}\n`;
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.decisions[0].text.length).toBe(400);
  });

  it("survives malformed frontmatter timestamps (returns empty ISO)", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const md = "---\ncreated: not-a-date\nupdated: also-bogus\n---\n# T";
    const t = e.parsePlan(md, "/x/p.md");
    expect(t.createdISO).toBe("");
    expect(t.updatedISO).toBe("");
    expect(t.title).toBe("T");
  });

  it("normalizes backslash source_path to forward slashes", () => {
    const e = new PlanTrajectoryExtractorEngine();
    const t = e.parsePlan("# T", "C:\\Users\\x\\.claude\\plans\\foo.md");
    expect(t.source_path).toBe("C:/Users/x/.claude/plans/foo.md");
  });
});

describe("PlanTrajectoryExtractorEngine — exported singleton (real-behavior round trip)", () => {
  it("singleton runs the full parse + summarize pipeline on multi-plan corpus", () => {
    const md1 = [
      "---", "created: 2026-01-15", "updated: 2026-04-01", "---",
      "# Auth Refactor", "Status: shipped",
      "## Backend",
      "We chose JWT over sessions.",
      "Rejected OAuth-only flow.",
      "- [x] Token signing",
      "- [x] Refresh logic",
    ].join("\n");
    const md2 = "# WIP Feature\n- [ ] Step 1\n- [ ] Step 2\n";
    const t1 = planTrajectoryExtractorEngine.parsePlan(md1, "/plans/auth.md");
    const t2 = planTrajectoryExtractorEngine.parsePlan(md2, "/plans/wip.md");
    expect(t1.title).toBe("Auth Refactor");
    expect(t1.status).toBe("completed");
    expect(t1.decisions.length).toBe(2);
    expect(t1.decisions[0].kind).toBe("chose");
    expect(t1.decisions[1].kind).toBe("rejected");
    expect(t1.milestones.length).toBe(2);
    expect(t1.milestones.every((m) => m.state === "done")).toBe(true);
    expect(t1.createdISO).toBe("2026-01-15T00:00:00.000Z");
    expect(t2.status).toBe("in_progress");
    const s = planTrajectoryExtractorEngine.summarize([t1, t2]);
    expect(s.totalPlans).toBe(2);
    expect(s.byStatus.completed).toBe(1);
    expect(s.byStatus.in_progress).toBe(1);
    expect(s.totalDecisions).toBe(2);
    expect(s.totalMilestones).toBe(4);
  });
});
