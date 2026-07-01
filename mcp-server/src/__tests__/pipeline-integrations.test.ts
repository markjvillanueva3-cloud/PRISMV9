/**
 * pipeline-integrations.test.ts — COMMAND-KERNEL-MS0 / U-CK14
 *
 * Round-trip oracle for the U-CK14 wiring: a `.claude/commands/*.md`
 * skill declares `pipeline_integrations:` frontmatter → the executor
 * lists it as a live member of the named pipeline. Plus regression
 * guards on every edge case the dormant frontmatter exposes:
 *  - inline `# comment` tails (the CK12 minimal YAML parser keeps them
 *    in the value; CK14's `discoverPipelineIntegrations` MUST strip)
 *  - missing `name:` (slug falls back to filename)
 *  - multi-pipeline membership (one skill registers in N pipelines)
 *  - integration filter (`opts.pipeline`)
 *  - underscore/dotfile exclusion (consistent with the rest of CK12/13)
 *  - deterministic ordering (by phase, then by skill)
 *  - real-data E2E against the live `.claude/commands/` corpus (the
 *    fail-on-revert oracle per RGS-TOOL-MS1)
 *
 * Test filename matches the unit deliverable per B1.
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  discoverPipelineIntegrations,
  DEFAULT_COMMANDS_DIR,
} from "../../../.claude/kernel/pipeline-exec.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function mkTmp() {
  const dir = mkdtempSync(join(tmpdir(), "prism-pipeline-integrations-"));
  return {
    dir,
    write: (name: string, text: string) => writeFileSync(join(dir, name), text, "utf-8"),
    cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* swallow */ } },
  };
}

function skill(name: string, integrations: any[], extra = ""): string {
  const lines = ["---", `name: ${name}`, `description: a test skill for ${name}`, "pipeline_integrations:"];
  for (const it of integrations) {
    lines.push(`  - pipeline: ${it.pipeline}`);
    if (it.phase) lines.push(`    phase: ${it.phase}`);
    if (it.ordering) lines.push(`    ordering: ${it.ordering}`);
    if (it.trigger) lines.push(`    trigger: ${it.trigger}`);
    if (it.action) lines.push(`    action: ${it.action}`);
  }
  if (extra) lines.push(extra);
  lines.push("---", "", "# body", "");
  return lines.join("\n");
}

// ---------- Round-trip — the load-bearing exit-condition test ---------------

describe("discoverPipelineIntegrations — round-trip (U-CK14 exit-condition oracle)", () => {
  it("a skill declaring pipeline_integrations → executor lists it as a pipeline member", () => {
    const t = mkTmp();
    try {
      t.write("my-skill.md", skill("my-skill", [{ pipeline: "forge", phase: "P4-implement", ordering: "during" }]));
      const integ = discoverPipelineIntegrations({ commandsDir: t.dir });
      expect(integ.ok).toBe(true);
      expect(integ.scanned).toBe(1);
      const members = integ.members as Record<string, any[]>;
      expect(Object.keys(members)).toEqual(["forge"]);
      expect(members.forge).toHaveLength(1);
      expect(members.forge[0]).toMatchObject({ skill: "my-skill", phase: "P4-implement", ordering: "during" });
    } finally { t.cleanup(); }
  });

  it("filtering by pipeline returns the members array for THAT pipeline only", () => {
    const t = mkTmp();
    try {
      t.write("a.md", skill("a", [{ pipeline: "forge", phase: "P0" }]));
      t.write("b.md", skill("b", [{ pipeline: "checkin", phase: "step-3" }]));
      const forgeOnly = discoverPipelineIntegrations({ commandsDir: t.dir, pipeline: "forge" });
      expect(Array.isArray(forgeOnly.members)).toBe(true);
      expect(forgeOnly.members).toHaveLength(1);
      expect((forgeOnly.members as any[])[0].skill).toBe("a");
      const checkinOnly = discoverPipelineIntegrations({ commandsDir: t.dir, pipeline: "checkin" });
      expect((checkinOnly.members as any[])).toHaveLength(1);
      expect((checkinOnly.members as any[])[0].skill).toBe("b");
    } finally { t.cleanup(); }
  });

  it("one skill registers as a member of MULTIPLE pipelines", () => {
    const t = mkTmp();
    try {
      t.write("multi.md", skill("multi", [
        { pipeline: "forge", phase: "P4" },
        { pipeline: "checkin", phase: "step-9" },
        { pipeline: "roadmap", phase: "wiring-pass" },
      ]));
      const integ = discoverPipelineIntegrations({ commandsDir: t.dir });
      const members = integ.members as Record<string, any[]>;
      expect(Object.keys(members).sort()).toEqual(["checkin", "forge", "roadmap"]);
      expect(members.forge[0].skill).toBe("multi");
      expect(members.checkin[0].skill).toBe("multi");
      expect(members.roadmap[0].skill).toBe("multi");
    } finally { t.cleanup(); }
  });
});

// ---------- Comment-tail stripping (the CK12 parser bug-class workaround) ---

describe("discoverPipelineIntegrations — inline-comment-tail strip", () => {
  it("strips '# /forge, /forge2..7'-style comment tails from pipeline keys", () => {
    const t = mkTmp();
    try {
      // Use the EXACT shape the real corpus uses (per
      // .claude/commands/staged-sanity.md).
      const body = `---
name: stripper
description: a skill testing comment-tail stripping
pipeline_integrations:
  - pipeline: forge                       # /forge, /forge2..7
    phase: P6-commit
    trigger: "pre-commit pre-flight"
    action: invoke
---

# body
`;
      t.write("stripper.md", body);
      const integ = discoverPipelineIntegrations({ commandsDir: t.dir });
      const members = integ.members as Record<string, any[]>;
      // The KEY in the registry must be the bare "forge", not the full
      // "forge                       # /forge, /forge2..7"
      expect(Object.keys(members)).toEqual(["forge"]);
      expect(members.forge[0].phase).toBe("P6-commit");
    } finally { t.cleanup(); }
  });

  it("strips comment tails from phase + action too (consistency across fields)", () => {
    const t = mkTmp();
    try {
      const body = `---
name: phasestrip
description: a skill testing phase-field comment stripping
pipeline_integrations:
  - pipeline: forge
    phase: P4-implement         # mid-pipeline
    action: invoke              # not invoke-if-engine-build
---

# body
`;
      t.write("phasestrip.md", body);
      const m = (discoverPipelineIntegrations({ commandsDir: t.dir, pipeline: "forge" }).members as any[])[0];
      expect(m.phase).toBe("P4-implement");
      expect(m.action).toBe("invoke");
    } finally { t.cleanup(); }
  });

  it("does NOT strip prose triggers (free-form text that may contain # legitimately)", () => {
    const t = mkTmp();
    try {
      // trigger is free-form prose; a literal # is allowed (e.g. "issue #42").
      const body = `---
name: triggerprose
description: a skill with a literal # in the trigger prose
pipeline_integrations:
  - pipeline: forge
    phase: P0
    trigger: "checks issue #42 before proceeding"
---

# body
`;
      t.write("triggerprose.md", body);
      const m = (discoverPipelineIntegrations({ commandsDir: t.dir, pipeline: "forge" }).members as any[])[0];
      // The CK12 YAML parser preserves the QUOTED trigger string verbatim.
      // We DO NOT strip `#` from trigger — it's prose, not a key.
      expect(m.trigger).toBe("checks issue #42 before proceeding");
    } finally { t.cleanup(); }
  });
});

// ---------- Slug fallback + exclusion rules ---------------------------------

describe("discoverPipelineIntegrations — slug + exclusion rules", () => {
  it("falls back to filename when `name:` frontmatter is absent", () => {
    const t = mkTmp();
    try {
      // No `name:` field in frontmatter — slug from filename
      const body = `---
description: noname skill
pipeline_integrations:
  - pipeline: forge
    phase: P0
---

# body
`;
      t.write("filename-slug.md", body);
      const m = (discoverPipelineIntegrations({ commandsDir: t.dir, pipeline: "forge" }).members as any[])[0];
      expect(m.skill).toBe("filename-slug");
    } finally { t.cleanup(); }
  });

  it("excludes underscore-prefixed (`_README.md`) and dotfiles (`.gitkeep`)", () => {
    const t = mkTmp();
    try {
      t.write("kept.md", skill("kept", [{ pipeline: "forge", phase: "P0" }]));
      t.write("_README.md", skill("readme", [{ pipeline: "forge", phase: "P0" }]));
      t.write(".gitkeep", "");
      const m = discoverPipelineIntegrations({ commandsDir: t.dir, pipeline: "forge" }).members as any[];
      expect(m).toHaveLength(1);
      expect(m[0].skill).toBe("kept");
    } finally { t.cleanup(); }
  });

  it("ignores non-.md files", () => {
    const t = mkTmp();
    try {
      t.write("a.md", skill("a", [{ pipeline: "forge", phase: "P0" }]));
      t.write("a.txt", "noise");
      t.write("a.json", "{}");
      const m = discoverPipelineIntegrations({ commandsDir: t.dir, pipeline: "forge" }).members as any[];
      expect(m).toHaveLength(1);
      expect(m[0].skill).toBe("a");
    } finally { t.cleanup(); }
  });
});

// ---------- Determinism + ordering ------------------------------------------

describe("discoverPipelineIntegrations — deterministic ordering", () => {
  it("sorts members within a pipeline by phase, then by skill name", () => {
    const t = mkTmp();
    try {
      // Write in REVERSE order so the disk read order doesn't accidentally match.
      t.write("z.md", skill("z", [{ pipeline: "forge", phase: "P9-late" }]));
      t.write("m.md", skill("m", [{ pipeline: "forge", phase: "P4-mid" }]));
      t.write("a.md", skill("a", [{ pipeline: "forge", phase: "P0-early" }]));
      t.write("b.md", skill("b", [{ pipeline: "forge", phase: "P0-early" }]));
      const m = discoverPipelineIntegrations({ commandsDir: t.dir, pipeline: "forge" }).members as any[];
      // P0-early × {a, b} → a then b; then P4-mid (m); then P9-late (z)
      expect(m.map((x) => x.skill)).toEqual(["a", "b", "m", "z"]);
    } finally { t.cleanup(); }
  });
});

// ---------- Adversarial / failure-soft ---------------------------------------

describe("discoverPipelineIntegrations — fail-soft on malformed input", () => {
  it("ignores files without frontmatter", () => {
    const t = mkTmp();
    try {
      t.write("good.md", skill("good", [{ pipeline: "forge", phase: "P0" }]));
      t.write("no-fm.md", "just body, no frontmatter\n");
      const m = discoverPipelineIntegrations({ commandsDir: t.dir, pipeline: "forge" }).members as any[];
      expect(m).toHaveLength(1);
      expect(m[0].skill).toBe("good");
    } finally { t.cleanup(); }
  });

  it("ignores entries where pipeline_integrations is not an array", () => {
    const t = mkTmp();
    try {
      const body = `---
name: notarray
description: pipeline_integrations is a scalar, not an array
pipeline_integrations: forge
---

# body
`;
      t.write("notarray.md", body);
      const integ = discoverPipelineIntegrations({ commandsDir: t.dir });
      const members = integ.members as Record<string, any[]>;
      // Scalar value → skipped silently; no membership registered
      expect(Object.keys(members)).toEqual([]);
    } finally { t.cleanup(); }
  });

  it("ignores entries with no pipeline name (missing `pipeline:` field)", () => {
    const t = mkTmp();
    try {
      const body = `---
name: nopipe
description: an integration entry missing the pipeline field
pipeline_integrations:
  - phase: P0
    action: invoke
---

# body
`;
      t.write("nopipe.md", body);
      const integ = discoverPipelineIntegrations({ commandsDir: t.dir });
      expect(Object.keys(integ.members as object)).toEqual([]);
    } finally { t.cleanup(); }
  });

  it("returns ok:true scanned:0 for a non-existent commands dir (fail-soft)", () => {
    const integ = discoverPipelineIntegrations({ commandsDir: "/nonexistent-dir-xyz-12345" });
    expect(integ.ok).toBe(true);
    expect(integ.scanned).toBe(0);
    expect(integ.members).toEqual({});
  });

  it("filter for a non-existent commands dir returns []", () => {
    const integ = discoverPipelineIntegrations({ commandsDir: "/nonexistent-dir-xyz-12345", pipeline: "forge" });
    expect(integ.members).toEqual([]);
  });

  it("default ordering is 'during' when ordering is absent", () => {
    const t = mkTmp();
    try {
      t.write("a.md", skill("a", [{ pipeline: "forge", phase: "P0" }]));
      const m = (discoverPipelineIntegrations({ commandsDir: t.dir, pipeline: "forge" }).members as any[])[0];
      expect(m.ordering).toBe("during");
    } finally { t.cleanup(); }
  });
});

// ---------- Real-data E2E — fail-on-revert oracle ---------------------------

describe("real-data E2E — live `.claude/commands/` corpus", () => {
  it("scans the live commands dir and finds at least one pipeline_integrations declaration", () => {
    if (!existsSync(DEFAULT_COMMANDS_DIR)) return; // graceful skip in unusual envs
    const integ = discoverPipelineIntegrations({});
    expect(integ.ok).toBe(true);
    expect(integ.scanned).toBeGreaterThan(0);
    // The corpus is KNOWN to carry pipeline_integrations on ≥ 13 skills
    // (per grep at U-CK14 ship time). The fail-on-revert assertion is
    // that AT LEAST ONE pipeline carries members.
    const members = integ.members as Record<string, any[]>;
    expect(Object.keys(members).length).toBeGreaterThan(0);
  });

  it("forge pipeline carries live members (the canonical demo pipeline)", () => {
    if (!existsSync(DEFAULT_COMMANDS_DIR)) return;
    const integ = discoverPipelineIntegrations({ pipeline: "forge" });
    expect(integ.ok).toBe(true);
    const members = integ.members as any[];
    // Live corpus shows ≥ 4 forge members. Assert at least 1 to keep the
    // test resilient to deletion of a single skill while still failing
    // if the entire feature regresses.
    expect(members.length).toBeGreaterThanOrEqual(1);
    // Every member must have a non-empty skill + a non-null phase
    for (const m of members) {
      expect(typeof m.skill).toBe("string");
      expect(m.skill.length).toBeGreaterThan(0);
      expect(m.phase === null).toBe(false);
    }
  });

  it("returns deterministic key set across re-runs (no ordering flakiness)", () => {
    if (!existsSync(DEFAULT_COMMANDS_DIR)) return;
    const a = discoverPipelineIntegrations({}).members as Record<string, any[]>;
    const b = discoverPipelineIntegrations({}).members as Record<string, any[]>;
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    // Per-pipeline member ordering is stable too
    for (const key of Object.keys(a)) {
      expect(a[key].map((m) => m.skill)).toEqual(b[key].map((m) => m.skill));
    }
  });
});
