/**
 * Tests for dream-stage-wiki-stub.mjs + companion hook helpers.
 *
 * U-MWO07 (slot:bravo 2026-05-26). Real concrete-value assertions only.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BUNDLE_SCHEMA_VERSION,
  unitSlug,
  parseArgs,
  buildWikiStub,
  renderReport,
  artifactId,
  buildBundle,
  fetchCommitInfo,
  run,
} from "./dream-stage-wiki-stub.mjs";
import { extractUnitId, unitSlug as hookUnitSlug } from "../.claude/hooks/stop-wiki-stub-stager.mjs";

describe("unitSlug", () => {
  it("strips U- prefix + kebabs", () => {
    assert.equal(unitSlug("U-MWO07"), "mwo07");
    assert.equal(unitSlug("U-DR08"), "dr08");
  });
  it("preserves dashes, strips other punctuation", () => {
    assert.equal(unitSlug("U-CAM-OPT_v2"), "cam-opt-v2");
  });
  it("matches the hook-side unitSlug (cross-file invariant)", () => {
    assert.equal(unitSlug("U-MWO07"), hookUnitSlug("U-MWO07"));
    assert.equal(unitSlug("U-CAM-OPT_v2"), hookUnitSlug("U-CAM-OPT_v2"));
  });
});

describe("parseArgs", () => {
  it("parses --foo bar pairs", () => {
    const out = parseArgs(["--unit", "U-X", "--commit-subject", "subj"]);
    assert.equal(out.unit, "U-X");
    assert.equal(out["commit-subject"], "subj");
  });
  it("ignores trailing flag without value", () => {
    const out = parseArgs(["--unit", "U-X", "--orphan"]);
    assert.equal(out.unit, "U-X");
    assert.equal(out.orphan, undefined);
  });
  it("empty argv → empty object", () => {
    assert.deepEqual(parseArgs([]), {});
  });
});

describe("extractUnitId (hook side)", () => {
  it("finds U-<ID> in conventional commit subjects", () => {
    assert.equal(extractUnitId("[MAIN] [MWO]/U-MWO07 (slot:bravo): foo"), "U-MWO07");
    assert.equal(extractUnitId("[MAIN] [DR]/U-DR08 (slot:bravo): bar"), "U-DR08");
  });
  it("returns null for non-conforming subjects", () => {
    assert.equal(extractUnitId("just a message"), null);
    assert.equal(extractUnitId(""), null);
    assert.equal(extractUnitId(null), null);
  });
});

describe("buildWikiStub", () => {
  it("emits valid frontmatter + sections for the unit", () => {
    const stub = buildWikiStub({
      unitId: "U-MWO07",
      commitSubject: "[MAIN]/U-MWO07: foo",
      commitSha: "abc123def456",
      commitBody: "Body line one\nBody line two",
    });
    assert.ok(stub.startsWith("---\n"));
    assert.ok(stub.includes("name: mwo07"));
    assert.ok(stub.includes("unit: U-MWO07"));
    assert.ok(stub.includes("commit: abc123def456"));
    assert.ok(stub.includes("# U-MWO07"));
    assert.ok(stub.includes("AUTO-STAGED STUB"));
    assert.ok(stub.includes("Body line one"));
    assert.ok(stub.includes("Body line two"));
  });
  it("handles empty body + sha gracefully", () => {
    const stub = buildWikiStub({ unitId: "U-X", commitSubject: "", commitSha: null, commitBody: "" });
    assert.ok(stub.includes("commit: (unknown)"));
    assert.ok(stub.includes("commitSubject: \n") || stub.includes("`(unknown)`"));
    assert.ok(stub.includes("_(empty — fill in from commit body)_"));
  });
});

describe("renderReport", () => {
  it("includes artifact_id, schema, status=staged, /dream-review hint", () => {
    const md = renderReport({
      artifact_id: "wiki-mwo07-abc",
      created_at: "2026-05-26T00:00:00Z",
      created_by: "test",
      unitId: "U-MWO07",
      slug: "mwo07",
      commitSha: "abc",
    });
    assert.ok(md.includes("# Dream Artifact Bundle — wiki-mwo07-abc"));
    assert.ok(md.includes("**Status**: staged"));
    assert.ok(md.includes(`**Schema**: ${BUNDLE_SCHEMA_VERSION}`));
    assert.ok(md.includes("/dream-review wiki-mwo07-abc"));
    assert.ok(md.includes("knowledge/wiki/code-tribal/learnings/mwo07.md"));
  });
});

describe("artifactId", () => {
  it("matches wiki-<slug>-<iso>-<rand> pattern", () => {
    const id = artifactId("mwo07", Date.UTC(2026, 4, 26, 0, 0, 0));
    assert.match(id, /^wiki-mwo07-2026-05-26T00-00-00-000Z-[0-9a-f]{6}$/);
  });
});

describe("buildBundle", () => {
  it("produces 4 well-formed files; proposal target_path matches slug", () => {
    const bundle = buildBundle({
      unitId: "U-MWO07",
      commitSubject: "[MAIN]/U-MWO07: foo",
      commitSha: "deadbeef",
      commitBody: "body",
      now: () => Date.UTC(2026, 4, 26),
    });
    assert.equal(Object.keys(bundle.files).length, 4);
    const manifest = JSON.parse(bundle.files["manifest.json"]);
    assert.equal(manifest.status, "staged");
    assert.equal(manifest.proposal_count, 1);
    assert.equal(manifest.source_count, 1);
    assert.equal(manifest.schemaVersion, BUNDLE_SCHEMA_VERSION);
    const proposal = JSON.parse(bundle.files["proposals.jsonl"].trim());
    assert.equal(proposal.mutation_type, "write");
    assert.equal(proposal.risk_class, "wiki");
    assert.equal(proposal.target_path, "knowledge/wiki/code-tribal/learnings/mwo07.md");
    assert.ok(proposal.after_content.includes("# U-MWO07"));
    const source = JSON.parse(bundle.files["sources.jsonl"].trim());
    assert.equal(source.source_type, "commit");
    assert.equal(source.locator, "deadbeef");
    assert.ok(bundle.files["REPORT.md"].includes("/dream-review"));
  });
});

describe("fetchCommitInfo", () => {
  it("uses spawnSync-shape runner, returns sha+body", () => {
    const fakeRunner = (_cmd, args) => {
      if (args[2] === "rev-parse") return { stdout: "abc1234567890\n", error: null };
      if (args[2] === "log") return { stdout: "subject\n\nbody", error: null };
      return { stdout: "", error: new Error("unknown") };
    };
    const out = fetchCommitInfo({ runner: fakeRunner });
    assert.equal(out.sha, "abc123456789");   // truncated to 12
    assert.equal(out.body, "subject\n\nbody");
  });
  it("returns sha=null and body='' when runner errors", () => {
    const fakeRunner = () => ({ stdout: "", error: new Error("git not found") });
    const out = fetchCommitInfo({ runner: fakeRunner });
    assert.equal(out.sha, null);
    assert.equal(out.body, "");
  });
});

describe("run (integration via mock fs)", () => {
  function makeMockFs() {
    const norm = (p) => String(p).replace(/[/\\]+/g, "/").replace(/\/$/, "");
    const store = new Map();
    return {
      _store: store,
      _norm: norm,
      mkdirSync(_d) { /* no-op */ },
      writeFileSync(p, content) { store.set(norm(p), Buffer.from(String(content))); },
    };
  }
  it("writes 4 files + returns artifact_id when --unit provided", () => {
    const fsImpl = makeMockFs();
    const result = run({
      argv: ["--unit", "U-MWO07", "--commit-subject", "[MAIN]/U-MWO07: x"],
      fsImpl,
      artifactsRoot: "/state/dream-artifacts",
      now: () => Date.UTC(2026, 4, 26),
      fetcher: () => ({ sha: "abc", body: "body" }),
    });
    assert.equal(result.ok, true);
    assert.ok(result.artifact_id.startsWith("wiki-mwo07-"));
    assert.equal(result.unitId, "U-MWO07");
    const norm = fsImpl._norm;
    const dirNorm = norm(result.bundleDir);
    const written = [...fsImpl._store.keys()].filter((k) => k.startsWith(dirNorm));
    assert.equal(written.length, 4);
  });
  it("missing --unit returns ok:false", () => {
    const fsImpl = makeMockFs();
    const result = run({ argv: [], fsImpl, fetcher: () => ({ sha: null, body: "" }) });
    assert.equal(result.ok, false);
    assert.match(result.reason, /missing/);
  });
});
