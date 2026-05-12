/**
 * Smoke test for generate-build-context.mjs
 *
 * Verifies that the awareness-backbone build-context generator produces a
 * non-empty, structured markdown file across:
 *   - happy path (full PRISM tree, git available)
 *   - failure: AGENT_WORKBOARD missing → fallback section emitted
 *   - failure: roadmap-index missing → fallback section emitted
 *   - failure: CURRENT_POSITION missing → fallback section emitted
 *   - adversarial: malformed roadmap-index JSON → caught + fallback
 *   - adversarial: empty git history (no recent commits) → "no commits" note
 *
 * Strategy: spawn the script in a sandbox $tmpdir with a fixture PRISM tree;
 * assert output structure and content. We do NOT touch the live state/shared/
 * directory. Each test starts from a freshly-built fixture root.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const SCRIPT = resolve(__dirname, "..", "..", "scripts", "generate-build-context.mjs");

interface Fixture {
  root: string;
  shared: string;
  outPath: string;
}

function makeFixture(opts: {
  withGit?: boolean;
  withWorkboard?: boolean;
  withRoadmap?: boolean;
  malformedRoadmap?: boolean;
  withCurrentPosition?: boolean;
  withCommits?: boolean;
}): Fixture {
  const root = mkdtempSync(join(tmpdir(), "prism-bc-test-"));
  const shared = join(root, "state", "shared");
  const handoffs = join(shared, "handoffs");
  const enginesDir = join(root, "mcp-server", "src", "engines");
  const dispatchersDir = join(root, "mcp-server", "src", "tools", "dispatchers");

  mkdirSync(shared, { recursive: true });
  mkdirSync(handoffs, { recursive: true });
  mkdirSync(join(root, "mcp-server", "scripts"), { recursive: true });
  mkdirSync(join(root, "mcp-server", "data"), { recursive: true });
  mkdirSync(join(root, "state"), { recursive: true });
  mkdirSync(enginesDir, { recursive: true });
  mkdirSync(dispatchersDir, { recursive: true });

  copyFileSync(SCRIPT, join(root, "mcp-server", "scripts", "generate-build-context.mjs"));

  if (opts.withWorkboard) {
    writeFileSync(
      join(shared, "AGENT_WORKBOARD.md"),
      "# Workboard\n- CLAIM: claude-test1 owns engines/Foo.ts\n- CLAIM: claude-test2 owns dispatchers/bar.ts\n",
      "utf8"
    );
  }

  if (opts.withCurrentPosition) {
    writeFileSync(
      join(root, "state", "CURRENT_POSITION.md"),
      "milestone: TEST-MS9\nU-TEST-99\n",
      "utf8"
    );
  }

  if (opts.withRoadmap) {
    const payload = opts.malformedRoadmap
      ? "{ this is not valid json"
      : JSON.stringify({
          units: [
            { id: "U-TEST-A", scope: "TEST-MS9", title: "next thing", status: "pending" },
            { id: "U-TEST-B", scope: "TEST-MS9", title: "another", status: "queued" },
            { id: "U-TEST-DONE", scope: "TEST-MS9", title: "completed", status: "done" },
          ],
        });
    writeFileSync(join(root, "mcp-server", "data", "roadmap-index.json"), payload, "utf8");
  }

  if (opts.withGit) {
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: root });

    if (opts.withCommits) {
      writeFileSync(join(enginesDir, "FooEngine.ts"), "// engine A\n", "utf8");
      writeFileSync(join(dispatchersDir, "fooDispatcher.ts"), "// dispatcher A\n", "utf8");
      execFileSync("git", ["add", "-A"], { cwd: root });
      execFileSync("git", ["commit", "-m", "[TEST]/U-TEST-1: initial scaffold"], { cwd: root });

      writeFileSync(join(enginesDir, "BarEngine.ts"), "// engine B\n", "utf8");
      execFileSync("git", ["add", "-A"], { cwd: root });
      execFileSync("git", ["commit", "-m", "[TEST]/U-TEST-2: add bar engine"], { cwd: root });
    }
  }

  return { root, shared, outPath: join(shared, "PRISM-BUILD-CONTEXT.md") };
}

function runScript(fixtureRoot: string): { code: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [join(fixtureRoot, "mcp-server", "scripts", "generate-build-context.mjs"), "--quiet"], {
    cwd: fixtureRoot,
    encoding: "utf8",
    timeout: 30_000,
  });
  return { code: result.status, stdout: result.stdout || "", stderr: result.stderr || "" };
}

describe("generate-build-context.mjs (awareness backbone)", () => {
  let fixture: Fixture | null = null;

  afterEach(() => {
    if (fixture) {
      rmSync(fixture.root, { recursive: true, force: true });
      fixture = null;
    }
  });

  it("happy path — emits all expected sections when all sources are present", () => {
    fixture = makeFixture({ withGit: true, withWorkboard: true, withRoadmap: true, withCurrentPosition: true, withCommits: true });
    const { code } = runScript(fixture.root);
    expect(code).toBe(0);
    expect(existsSync(fixture.outPath)).toBe(true);

    const content = readFileSync(fixture.outPath, "utf8");
    expect(content).toContain("# PRISM-BUILD-CONTEXT");
    expect(content).toContain("## Active branch");
    expect(content).toContain("## What we just built");
    expect(content).toContain("## What we're building right now");
    expect(content).toContain("## What's queued next");
    expect(content).toContain("U-TEST-A");
    expect(content).toContain("CLAIM: claude-test1");
  });

  it("failure: AGENT_WORKBOARD missing → emits fallback note instead of crashing", () => {
    fixture = makeFixture({ withGit: true, withWorkboard: false, withRoadmap: true, withCurrentPosition: true, withCommits: true });
    const { code } = runScript(fixture.root);
    expect(code).toBe(0);

    const content = readFileSync(fixture.outPath, "utf8");
    expect(content).toContain("AGENT_WORKBOARD.md not found");
    expect(content).toContain("U-TEST-A");
  });

  it("failure: roadmap-index.json missing → fallback note rendered", () => {
    fixture = makeFixture({ withGit: true, withWorkboard: true, withRoadmap: false, withCurrentPosition: true, withCommits: true });
    const { code } = runScript(fixture.root);
    expect(code).toBe(0);

    const content = readFileSync(fixture.outPath, "utf8");
    expect(content).toContain("roadmap-index.json not found");
  });

  it("failure: CURRENT_POSITION.md missing → milestone unknown but file still emits", () => {
    fixture = makeFixture({ withGit: true, withWorkboard: true, withRoadmap: true, withCurrentPosition: false, withCommits: true });
    const { code } = runScript(fixture.root);
    expect(code).toBe(0);

    const content = readFileSync(fixture.outPath, "utf8");
    expect(content).toContain("CURRENT_POSITION.md not found");
    expect(content).toContain("# PRISM-BUILD-CONTEXT");
  });

  it("adversarial: malformed roadmap JSON → caught and replaced with note", () => {
    fixture = makeFixture({ withGit: true, withWorkboard: true, withRoadmap: true, malformedRoadmap: true, withCurrentPosition: true, withCommits: true });
    const { code } = runScript(fixture.root);
    expect(code).toBe(0);

    const content = readFileSync(fixture.outPath, "utf8");
    expect(content).toContain("roadmap-index.json malformed JSON");
    expect(content).not.toContain("U-TEST-A");
  });

  it("adversarial: no git / no commits in window → emits 'no commits' note", () => {
    fixture = makeFixture({ withGit: true, withWorkboard: true, withRoadmap: true, withCurrentPosition: true, withCommits: false });
    const { code } = runScript(fixture.root);
    expect(code).toBe(0);

    const content = readFileSync(fixture.outPath, "utf8");
    expect(content).toMatch(/no commits in last|git unavailable/);
  });
});
