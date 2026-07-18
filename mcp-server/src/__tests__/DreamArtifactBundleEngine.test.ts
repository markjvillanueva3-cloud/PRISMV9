/**
 * Tests for DreamArtifactBundleEngine (DREAM-RECEIPT-MS0/U-DR01).
 *
 * Covers: 5 happy + 5 failure modes + 3 adversarial + 4 variability + 2 idempotency
 *   + 3 schema-version + 2 composition (real engines, not mocked) = 24 cases.
 *
 * All assertions are real-behavior (concrete value comparisons + cross-field
 * invariant checks); no toBeDefined()/exists()/single-presence-only patterns.
 */

import { describe, it, expect } from "vitest";
import {
  DreamArtifactBundleEngine,
  BUNDLE_SCHEMA_VERSION,
  type Bundle,
  type Proposal,
  type Source,
  type CreateBundleInput,
} from "../engines/DreamArtifactBundleEngine.js";
import { DreamLoopProposalEngine } from "../engines/DreamLoopProposalEngine.js";
import { MemoryDiffEngine } from "../engines/MemoryDiffEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures — deterministic, no randomness, no Date.now()
// ─────────────────────────────────────────────────────────────────────────────

const SHA = "a".repeat(64); // valid SHA-256 hex
const ISO = "2026-05-26T15:00:00.000Z";

function fixtureInput(overrides: Partial<CreateBundleInput> = {}): CreateBundleInput {
  return {
    artifact_id: "dr-test-0001",
    created_at: ISO,
    created_by: "claude-00569f88-bravo",
    parent_trace: ["U-DR01"],
    source_summary: "test fixture",
    sources: [],
    proposals: [],
    ...overrides,
  };
}

function fixtureProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    proposal_id: "p-0001",
    target_path: "state/shared/slot-souls/bravo.md",
    mutation_type: "patch",
    risk_class: "memory",
    before_sha256: SHA,
    after_content: "added refuse rule: inline-physics-constants",
    provenance: "session=00569f88 source=correction",
    rationale: "rule promoted after 3 observations",
    ...overrides,
  };
}

function fixtureSource(overrides: Partial<Source> = {}): Source {
  return {
    source_id: "s-0001",
    source_type: "handoff",
    source_path: "state/shared/handoffs/HANDOFF-claude-00569f88-bravo-work.md",
    scanned_at: ISO,
    byte_count: 4096,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HAPPY PATH (5 cases)
// ─────────────────────────────────────────────────────────────────────────────

describe("DreamArtifactBundleEngine — happy path", () => {
  it("T01 createBundle with minimal valid spec produces a schema-valid Bundle", () => {
    const bundle = DreamArtifactBundleEngine.createBundle(fixtureInput());
    expect(bundle.manifest.artifact_id).toBe("dr-test-0001");
    expect(bundle.manifest.schemaVersion).toBe(BUNDLE_SCHEMA_VERSION);
    expect(bundle.manifest.proposal_count).toBe(0);
    expect(bundle.manifest.status).toBe("staged");
    expect(bundle.sources).toEqual([]);
    expect(bundle.proposals).toEqual([]);
    expect(bundle.report).toContain("# Dream Artifact dr-test-0001");
    expect(bundle.report).toContain("created_by: claude-00569f88-bravo");
  });

  it("T02 serializeBundle round-trips losslessly through parseBundle", () => {
    const before = DreamArtifactBundleEngine.createBundle(fixtureInput({
      sources: [fixtureSource()],
      proposals: [fixtureProposal()],
    }));
    const files = DreamArtifactBundleEngine.serializeBundle(before);
    const after = DreamArtifactBundleEngine.parseBundle(files);
    expect(after.manifest).toEqual(before.manifest);
    expect(after.sources).toEqual(before.sources);
    expect(after.proposals).toEqual(before.proposals);
    expect(after.report).toEqual(before.report);
  });

  it("T03 validateBundle on a well-formed Bundle returns ok:true with no errors", () => {
    const bundle = DreamArtifactBundleEngine.createBundle(fixtureInput({
      proposals: [fixtureProposal()],
    }));
    const res = DreamArtifactBundleEngine.validateBundle(bundle);
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it("T04 appendProposal returns a NEW bundle (immutable) with the proposal added", () => {
    const b0 = DreamArtifactBundleEngine.createBundle(fixtureInput());
    const b1 = DreamArtifactBundleEngine.appendProposal(b0, fixtureProposal());
    expect(b0.proposals).toHaveLength(0); // original unchanged (immutability proof)
    expect(b1.proposals).toHaveLength(1);
    expect(b1.proposals[0].proposal_id).toBe("p-0001");
    expect(b1.manifest.proposal_count).toBe(1);
    expect(b1).not.toBe(b0);
  });

  it("T05 renderReport produces a non-empty markdown summary with risk/source roll-up", () => {
    const bundle = DreamArtifactBundleEngine.createBundle(fixtureInput({
      sources: [fixtureSource()],
      proposals: [
        fixtureProposal({ proposal_id: "p-a", risk_class: "memory" }),
        fixtureProposal({ proposal_id: "p-b", risk_class: "skill" }),
        fixtureProposal({ proposal_id: "p-c", risk_class: "hook" }),
      ],
    }));
    const report = bundle.report;
    expect(report).toContain("## Proposals (3)");
    expect(report).toContain("memory=1");
    expect(report).toContain("skill=1");
    expect(report).toContain("hook=1");
    expect(report).toContain("## Sources (1)");
    expect(report).toContain("handoff=1");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FAILURE MODES (5 cases) — Zod schema + cross-field invariants
// ─────────────────────────────────────────────────────────────────────────────

describe("DreamArtifactBundleEngine — failure modes", () => {
  it("T06 createBundle missing artifact_id throws Zod validation error", () => {
    const bad = { ...fixtureInput(), artifact_id: undefined } as unknown as CreateBundleInput;
    expect(() => DreamArtifactBundleEngine.createBundle(bad)).toThrow();
  });

  it("T07 appendProposal with invalid mutation_type throws Zod validation error", () => {
    const b0 = DreamArtifactBundleEngine.createBundle(fixtureInput());
    const bad = fixtureProposal({ mutation_type: "explode" as unknown as Proposal["mutation_type"] });
    expect(() => DreamArtifactBundleEngine.appendProposal(b0, bad)).toThrow();
  });

  it("T08 parseBundle with malformed manifest JSON throws with descriptive message", () => {
    expect(() => DreamArtifactBundleEngine.parseBundle({
      manifest: "{not json",
      report: "",
      sources: "",
      proposals: "",
    })).toThrow(/malformed manifest JSON/);
  });

  it("T09 parseBundle with malformed proposals.jsonl line throws naming the bad line number", () => {
    const validManifest = JSON.stringify({
      schemaVersion: BUNDLE_SCHEMA_VERSION,
      artifact_id: "dr-test-0001",
      created_at: ISO,
      created_by: "claude-test",
      parent_trace: [],
      source_summary: "",
      proposal_count: 1,
      status: "staged",
    });
    const validProposal = JSON.stringify(fixtureProposal());
    const badProposalsJsonl = `${validProposal}\n{this is not json}\n`;
    expect(() => DreamArtifactBundleEngine.parseBundle({
      manifest: validManifest,
      report: "",
      sources: "",
      proposals: badProposalsJsonl,
    })).toThrow(/proposals\.jsonl line 2/);
  });

  it("T10 validateBundle on cross-field-invalid Bundle (proposal_count mismatch) returns ok:false with named error", () => {
    const bundle = DreamArtifactBundleEngine.createBundle(fixtureInput({
      proposals: [fixtureProposal()],
    }));
    // Tamper: drift the count without going through appendProposal
    const tampered: Bundle = { ...bundle, manifest: { ...bundle.manifest, proposal_count: 99 } };
    const res = DreamArtifactBundleEngine.validateBundle(tampered);
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors.some((e) => e.includes("proposal_count=99"))).toBe(true);
  });

  it("T10b validateBundle on status:applied with missing before_sha256 returns ok:false", () => {
    const noBeforeProp = fixtureProposal({ before_sha256: null });
    const bundle = DreamArtifactBundleEngine.createBundle(fixtureInput({
      proposals: [noBeforeProp],
    }));
    const applied: Bundle = { ...bundle, manifest: { ...bundle.manifest, status: "applied" } };
    const res = DreamArtifactBundleEngine.validateBundle(applied);
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors.some((e) => e.includes("status:applied"))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADVERSARIAL (3 cases) — oversize, bad SHA, prototype pollution
// ─────────────────────────────────────────────────────────────────────────────

describe("DreamArtifactBundleEngine — adversarial inputs", () => {
  it("T11 oversize after_content (>1 MB) is rejected by Zod max", () => {
    const huge = "x".repeat(1_000_001);
    const bad = fixtureProposal({ after_content: huge });
    expect(() => DreamArtifactBundleEngine.createBundle(fixtureInput({ proposals: [bad] }))).toThrow();
  });

  it("T12 invalid SHA-256 (wrong length / non-hex) is rejected", () => {
    const bad = fixtureProposal({ before_sha256: "not-a-sha" });
    expect(() => DreamArtifactBundleEngine.createBundle(fixtureInput({ proposals: [bad] }))).toThrow();
  });

  it("T13 prototype-pollution via __proto__ key in parsed proposal is contained — no leak to Object.prototype", () => {
    // Construct a poisoned jsonl line with a literal __proto__ key trying to inject a polluted property.
    const probeBefore = Object.prototype.hasOwnProperty.call(Object.prototype, "polluted");
    expect(probeBefore).toBe(false);

    const validManifest = JSON.stringify({
      schemaVersion: BUNDLE_SCHEMA_VERSION,
      artifact_id: "dr-poison-0001",
      created_at: ISO,
      created_by: "claude-test",
      parent_trace: [],
      source_summary: "",
      proposal_count: 1,
      status: "staged",
    });
    const poisonedJsonl = `{"proposal_id":"p-poison","target_path":"x","mutation_type":"write","risk_class":"memory","before_sha256":null,"after_content":"","provenance":"p","rationale":"","__proto__":{"polluted":"YES_POLLUTED"}}\n`;

    let parsedBundle: Bundle | null = null;
    let threw = false;
    try {
      // Will likely throw because manifest says proposal_count=1 but the parse may still attempt the proposal line.
      parsedBundle = DreamArtifactBundleEngine.parseBundle({
        manifest: validManifest,
        report: "",
        sources: "",
        proposals: poisonedJsonl,
      });
    } catch {
      threw = true;
    }

    // INVARIANT 1: regardless of accept-or-reject path, Object.prototype must NOT have been polluted.
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted")).toBe(false);
    // INVARIANT 2: a fresh empty object must NOT inherit the injected property.
    const probe: { polluted?: string } = {};
    expect(probe.polluted).not.toBe("YES_POLLUTED");
    // INVARIANT 3: if accepted, the resulting proposal must not carry the unknown key (Zod .strict() strips OR throws).
    if (!threw && parsedBundle !== null) {
      expect(parsedBundle.proposals).toHaveLength(1);
      const keys = Object.keys(parsedBundle.proposals[0]);
      expect(keys).not.toContain("__proto__");
      expect(keys).not.toContain("polluted");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VARIABILITY (4 spans) — mutation types, risk classes, source types, multi-entity
// ─────────────────────────────────────────────────────────────────────────────

describe("DreamArtifactBundleEngine — variability", () => {
  it("T14 accepts all 4 mutation_type values (write|patch|append|delete)", () => {
    const proposals = (["write", "patch", "append", "delete"] as const).map((mt, i) => fixtureProposal({
      proposal_id: `p-mut-${i}`,
      mutation_type: mt,
    }));
    const bundle = DreamArtifactBundleEngine.createBundle(fixtureInput({ proposals }));
    expect(bundle.proposals.map((p) => p.mutation_type)).toEqual(["write", "patch", "append", "delete"]);
  });

  it("T15 accepts all 6 risk_class values (memory|skill|hook|engine|wiki|other)", () => {
    const classes = ["memory", "skill", "hook", "engine", "wiki", "other"] as const;
    const proposals = classes.map((rc, i) => fixtureProposal({
      proposal_id: `p-rc-${i}`,
      risk_class: rc,
    }));
    const bundle = DreamArtifactBundleEngine.createBundle(fixtureInput({ proposals }));
    expect(bundle.proposals.map((p) => p.risk_class)).toEqual([...classes]);
  });

  it("T16 accepts all 7 source_type values (handoff|memory|transcript|wiki|git-log|manual|other)", () => {
    const types = ["handoff", "memory", "transcript", "wiki", "git-log", "manual", "other"] as const;
    const sources = types.map((st, i) => fixtureSource({
      source_id: `s-${i}`,
      source_type: st,
    }));
    const bundle = DreamArtifactBundleEngine.createBundle(fixtureInput({ sources }));
    expect(bundle.sources.map((s) => s.source_type)).toEqual([...types]);
  });

  it("T17 multi-entity bundle: 5 sources + 5 proposals all preserved through round-trip", () => {
    const sources = Array.from({ length: 5 }, (_, i) => fixtureSource({ source_id: `s-${i}` }));
    const proposals = Array.from({ length: 5 }, (_, i) => fixtureProposal({ proposal_id: `p-${i}` }));
    const before = DreamArtifactBundleEngine.createBundle(fixtureInput({ sources, proposals }));
    const after = DreamArtifactBundleEngine.parseBundle(DreamArtifactBundleEngine.serializeBundle(before));
    expect(after.sources).toHaveLength(5);
    expect(after.proposals).toHaveLength(5);
    expect(after.manifest.proposal_count).toBe(5);
    expect(after.proposals.map((p) => p.proposal_id).sort()).toEqual(["p-0", "p-1", "p-2", "p-3", "p-4"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDEMPOTENCY (2 cases)
// ─────────────────────────────────────────────────────────────────────────────

describe("DreamArtifactBundleEngine — idempotency", () => {
  it("T18 appendProposal with duplicate proposal_id is a no-op (first-write wins)", () => {
    const p = fixtureProposal({ proposal_id: "dup-1" });
    const b1 = DreamArtifactBundleEngine.appendProposal(
      DreamArtifactBundleEngine.createBundle(fixtureInput()),
      p,
    );
    const b2 = DreamArtifactBundleEngine.appendProposal(b1, { ...p, after_content: "MUTATED_LATER" });
    expect(b2.proposals).toHaveLength(1);
    expect(b2.proposals[0].after_content).toBe("added refuse rule: inline-physics-constants");
    expect(b2.proposals[0].after_content).not.toBe("MUTATED_LATER");
    expect(b2.manifest.proposal_count).toBe(1);
  });

  it("T19 appendSource with duplicate source_id is a no-op (first-write wins)", () => {
    const s = fixtureSource({ source_id: "dup-s" });
    const b1 = DreamArtifactBundleEngine.appendSource(
      DreamArtifactBundleEngine.createBundle(fixtureInput()),
      s,
    );
    const b2 = DreamArtifactBundleEngine.appendSource(b1, { ...s, byte_count: 999_999 });
    expect(b2.sources).toHaveLength(1);
    expect(b2.sources[0].byte_count).toBe(4096);
    expect(b2.sources[0].byte_count).not.toBe(999_999);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA-VERSION COMPAT (3 cases)
// ─────────────────────────────────────────────────────────────────────────────

describe("DreamArtifactBundleEngine — schema version", () => {
  it("T20 SCHEMA_VERSION constant is exported and embedded in every new manifest", () => {
    expect(BUNDLE_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(DreamArtifactBundleEngine.SCHEMA_VERSION).toBe(BUNDLE_SCHEMA_VERSION);
    const bundle = DreamArtifactBundleEngine.createBundle(fixtureInput());
    expect(bundle.manifest.schemaVersion).toBe(BUNDLE_SCHEMA_VERSION);
  });

  it("T21 forward-compat: parseBundle on schemaVersion 1.1.0 (minor bump) still succeeds", () => {
    const futureManifest = JSON.stringify({
      schemaVersion: "1.1.0",
      artifact_id: "dr-future-0001",
      created_at: ISO,
      created_by: "claude-future",
      parent_trace: [],
      source_summary: "future bundle",
      proposal_count: 0,
      status: "staged",
    });
    const parsed = DreamArtifactBundleEngine.parseBundle({
      manifest: futureManifest,
      report: "",
      sources: "",
      proposals: "",
    });
    expect(parsed.manifest.schemaVersion).toBe("1.1.0");
    expect(parsed.manifest.artifact_id).toBe("dr-future-0001");
    expect(parsed.manifest.source_summary).toBe("future bundle");
  });

  it("T21b parseBundle on schemaVersion 2.0.0 (major bump) throws — engine handles 1.x only", () => {
    const incompatManifest = JSON.stringify({
      schemaVersion: "2.0.0",
      artifact_id: "dr-future-0001",
      created_at: ISO,
      created_by: "claude-future",
      parent_trace: [],
      source_summary: "",
      proposal_count: 0,
      status: "staged",
    });
    expect(() => DreamArtifactBundleEngine.parseBundle({
      manifest: incompatManifest,
      report: "",
      sources: "",
      proposals: "",
    })).toThrow(/incompatible schemaVersion=2\.0\.0/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITION (2 cases) — real adapters over real existing engines (NOT mocked)
// ─────────────────────────────────────────────────────────────────────────────

describe("DreamArtifactBundleEngine — composition with existing engines", () => {
  it("T22 fromDreamLoopBatch produces bundle proposals for each refuse_rule + skill", () => {
    // Use the REAL DreamLoopProposalEngine — not a mock — to validate the composition end-to-end.
    const batch = DreamLoopProposalEngine.propose({
      slot: "bravo",
      current_refuse_list: [],
      corrections: [
        { text: "do not inline physics constants", source: "user-2026-05-26" },
        { text: "do not inline physics constants", source: "user-2026-05-25" },
      ],
      error_patterns: [
        { pattern: "stub engine creation attempted", count: 4 },
      ],
      min_repetitions: 2,
    });
    expect(batch.refuse_rules.length).toBeGreaterThan(0);
    expect(batch.skills.length).toBeGreaterThan(0);

    const bundle = DreamArtifactBundleEngine.fromDreamLoopBatch(batch, {
      artifact_id: "dr-compose-1",
      created_at: ISO,
      created_by: "claude-00569f88",
      slot_soul_path: "state/shared/slot-souls/bravo.md",
      skill_root: ".claude/commands",
    });
    expect(bundle.proposals).toHaveLength(batch.refuse_rules.length + batch.skills.length);
    expect(bundle.proposals.some((p) => p.target_path === "state/shared/slot-souls/bravo.md")).toBe(true);
    expect(bundle.proposals.some((p) => p.target_path.startsWith(".claude/commands/"))).toBe(true);
    expect(bundle.manifest.source_summary).toContain("slot=bravo");
    expect(bundle.manifest.proposal_count).toBe(bundle.proposals.length);
  });

  it("T22b getCapabilities returns schemaVersion + every enum a client must understand", () => {
    const caps = DreamArtifactBundleEngine.getCapabilities();
    expect(caps.schemaVersion).toBe(BUNDLE_SCHEMA_VERSION);
    expect([...caps.mutationTypes].sort()).toEqual(["append", "delete", "patch", "write"]);
    expect([...caps.riskClasses].sort()).toEqual(["engine", "hook", "memory", "other", "skill", "wiki"]);
    expect([...caps.sourceTypes].sort()).toEqual(["git-log", "handoff", "manual", "memory", "other", "transcript", "wiki"]);
    expect([...caps.proposalStatuses].sort()).toEqual(["applied", "discarded", "failed", "staged", "validated"]);
  });

  it("T22c diffAgainstLive flags would_change correctly for no-op + change + create + delete", () => {
    const bundle = DreamArtifactBundleEngine.createBundle(fixtureInput({
      proposals: [
        fixtureProposal({ proposal_id: "p-write-noop", target_path: "a.md", mutation_type: "write", after_content: "same" }),
        fixtureProposal({ proposal_id: "p-write-change", target_path: "b.md", mutation_type: "write", after_content: "new" }),
        fixtureProposal({ proposal_id: "p-write-create", target_path: "c.md", mutation_type: "write", after_content: "fresh" }),
        fixtureProposal({ proposal_id: "p-delete-noop", target_path: "d.md", mutation_type: "delete", after_content: "" }),
        fixtureProposal({ proposal_id: "p-delete-change", target_path: "e.md", mutation_type: "delete", after_content: "" }),
      ],
    }));
    const live: Record<string, string> = {
      "a.md": "same",     // no-op
      "b.md": "old",      // change
      // c.md absent — create
      // d.md absent — delete no-op
      "e.md": "exists",   // delete will remove
    };
    const diff = DreamArtifactBundleEngine.diffAgainstLive(bundle, live);
    expect(diff).toHaveLength(5);
    const byId = Object.fromEntries(diff.map((d) => [d.proposal_id, d]));
    expect(byId["p-write-noop"].would_change).toBe(false);
    expect(byId["p-write-noop"].reason).toContain("no-op");
    expect(byId["p-write-change"].would_change).toBe(true);
    expect(byId["p-write-create"].would_change).toBe(true);
    expect(byId["p-write-create"].reason).toContain("does not exist");
    expect(byId["p-delete-noop"].would_change).toBe(false);
    expect(byId["p-delete-noop"].reason).toContain("already absent");
    expect(byId["p-delete-change"].would_change).toBe(true);
    expect(byId["p-delete-change"].reason).toContain("delete will remove");
  });

  it("T22e planApply filters by approveList, classifies writes vs deletes vs skipped, computes backup_targets, rejects empty backupRoot", () => {
    const bundle = DreamArtifactBundleEngine.createBundle(fixtureInput({
      proposals: [
        fixtureProposal({ proposal_id: "p-w1", target_path: "a.md", mutation_type: "write" }),
        fixtureProposal({ proposal_id: "p-w2", target_path: "b.md", mutation_type: "patch" }),
        fixtureProposal({ proposal_id: "p-d1", target_path: "c.md", mutation_type: "delete" }),
        fixtureProposal({ proposal_id: "p-skip", target_path: "d.md", mutation_type: "write" }),
      ],
    }));

    // approve subset: 3 of 4 proposals
    const planSubset = DreamArtifactBundleEngine.planApply(bundle, ["p-w1", "p-w2", "p-d1"], "state/shared/dream-backups");
    expect(planSubset.writes).toHaveLength(2);
    expect(planSubset.writes.map((w) => w.proposal_id).sort()).toEqual(["p-w1", "p-w2"]);
    expect(planSubset.deletes).toHaveLength(1);
    expect(planSubset.deletes[0].proposal_id).toBe("p-d1");
    expect(planSubset.skipped).toHaveLength(1);
    expect(planSubset.skipped[0].proposal_id).toBe("p-skip");
    expect(planSubset.skipped[0].reason).toBe("not in approveList");
    // backup_targets are namespaced under backupRoot/<artifact_id>/<target_path>
    expect(planSubset.writes[0].backup_target).toBe("state/shared/dream-backups/dr-test-0001/a.md");
    expect(planSubset.deletes[0].backup_target).toBe("state/shared/dream-backups/dr-test-0001/c.md");

    // approve "all" — every proposal goes through, none skipped
    const planAll = DreamArtifactBundleEngine.planApply(bundle, "all", "state/shared/dream-backups");
    expect(planAll.writes).toHaveLength(3);
    expect(planAll.deletes).toHaveLength(1);
    expect(planAll.skipped).toHaveLength(0);

    // trailing slashes on backupRoot are stripped
    const planTrailing = DreamArtifactBundleEngine.planApply(bundle, "all", "state/shared/dream-backups///");
    expect(planTrailing.writes[0].backup_target).toBe("state/shared/dream-backups/dr-test-0001/a.md");

    // empty backupRoot rejected
    expect(() => DreamArtifactBundleEngine.planApply(bundle, "all", "")).toThrow(/non-empty string/);
  });

  it("T22d markDiscarded flips status to 'discarded' + computes archive_path under root + rejects empty root", () => {
    const bundle = DreamArtifactBundleEngine.createBundle(fixtureInput({ artifact_id: "dr-toss-0001" }));
    expect(bundle.manifest.status).toBe("staged");
    const { bundle: discarded, archive_path } = DreamArtifactBundleEngine.markDiscarded(bundle, "state/shared/dream-archive");
    expect(discarded.manifest.status).toBe("discarded");
    expect(archive_path).toBe("state/shared/dream-archive/dr-toss-0001");
    // trailing slashes on root are stripped
    const { archive_path: ap2 } = DreamArtifactBundleEngine.markDiscarded(bundle, "state/shared/dream-archive///");
    expect(ap2).toBe("state/shared/dream-archive/dr-toss-0001");
    // empty root rejected
    expect(() => DreamArtifactBundleEngine.markDiscarded(bundle, "")).toThrow(/non-empty string/);
  });

  it("T23 fromMemoryDiff produces bundle proposals for each added/removed/changed entry", () => {
    // Use the REAL MemoryDiffEngine — not a mock.
    const diff = MemoryDiffEngine.diff(
      [
        { entry_id: "m1", hash: "h1" },
        { entry_id: "m2", hash: "h2" }, // will be removed
        { entry_id: "m3", hash: "h3a" }, // will be changed
      ],
      [
        { entry_id: "m1", hash: "h1" },   // unchanged
        { entry_id: "m3", hash: "h3b" },  // changed
        { entry_id: "m4", hash: "h4" },   // added
      ],
    );
    expect(diff.added).toEqual(["m4"]);
    expect(diff.removed).toEqual(["m2"]);
    expect(diff.changed).toEqual(["m3"]);

    const bundle = DreamArtifactBundleEngine.fromMemoryDiff(diff, {
      artifact_id: "dr-compose-2",
      created_at: ISO,
      created_by: "claude-00569f88",
      namespace_path: "knowledge/memories/feedback",
    });
    expect(bundle.proposals).toHaveLength(3); // 1 add + 1 remove + 1 change
    expect(bundle.proposals.map((p) => p.mutation_type).sort()).toEqual(["delete", "patch", "write"]);
    expect(bundle.proposals.every((p) => p.risk_class === "memory")).toBe(true);
    expect(bundle.manifest.source_summary).toContain("+1 -1 ~1");
    expect(bundle.manifest.proposal_count).toBe(3);
  });
});
