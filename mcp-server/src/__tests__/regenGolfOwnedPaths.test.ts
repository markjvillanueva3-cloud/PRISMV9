// regenGolfOwnedPaths.test.ts — CLEANUP-MS0/U-CLEANUP-G11 — verify
// scripts/regen-golf-owned-paths.mjs: the single source of truth for the
// golf-slot write allowlist.
//
// Coverage (per comprehensive-build-enforce floor):
//   - Happy path: pure functions + fresh-sandbox apply produce valid artifacts
//   - SUPERSET INVARIANT: the compiled regex matches every path A5's inline
//     FALLBACK_ALLOW matches (anti-regression — A5 uses ONLY this regex when
//     the file is present, so a narrower regex silently revokes golf writes)
//   - Variability: file / dir / glob registry kinds all exercised
//   - Failure mode 1: malformed registry entry (missing path, unknown kind)
//   - Failure mode 2: glob with zero or >1 '*'
//   - Failure mode 3: unparseable existing JSON → full regen with fresh stamp
//   - Adversarial 1: empty string, pure-metachar paths, traversal-shaped paths
//   - Adversarial 2: regex-metachar filenames under a dir glob
//   - Idempotency: re-run is a byte-identical no-op (generatedAt preserved)
//   - --check drift detection, --dry-run no-write, --json shape, --help
//
// Pure functions are imported directly. Script behavior is exercised via
// execFileSync into temp sandboxes (--root override) so we never touch H:/prism.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Pure exports from the script under test.
import {
  CANONICAL_REGISTRY,
  escapeRe,
  registryEntryToRegexBody,
  compileAllowlistRegexString,
  compileAllowlistRegex,
  scanDashboards,
  buildOwnedPathsObject,
  buildRegexFileContent,
} from "../../../scripts/regen-golf-owned-paths.mjs";

// A5's inline fallback — the anti-regression oracle.
import { _internals as A5 } from "../../../.claude/hooks/golf-slot-write-allowlist.mjs";

const SCRIPT_PATH = path.resolve(__dirname, "../../../scripts/regen-golf-owned-paths.mjs");
const NODE_BIN = process.execPath;
const SCRIPT_TIMEOUT_MS = 15_000;
const JSON_REL = "state/shared/golf-owned-paths.json";
const REGEX_REL = "state/shared/.golf-allowlist-regex.txt";

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function runScript(root: string, ...extraArgs: string[]): RunResult {
  try {
    const stdout = execFileSync(NODE_BIN, [SCRIPT_PATH, "--root", root, ...extraArgs], {
      encoding: "utf-8",
      timeout: SCRIPT_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: (err.stdout || "").toString(),
      stderr: (err.stderr || "").toString(),
      exitCode: typeof err.status === "number" ? err.status : 1,
    };
  }
}

/** Build a canonical example path that a registry entry is meant to match. */
function exampleFor(entry: { path: string; kind: string }): string {
  if (entry.kind === "file") return entry.path;
  if (entry.kind === "dir") return entry.path.replace(/\/+$/, "") + "/example-file.md";
  if (entry.kind === "glob") {
    const star = entry.path.indexOf("*");
    return entry.path.slice(0, star) + "example" + entry.path.slice(star + 1);
  }
  throw new Error(`unknown kind ${entry.kind}`);
}

// ─── Pure: CANONICAL_REGISTRY shape ──────────────────────────────────────

describe("CANONICAL_REGISTRY", () => {
  it("is a non-empty array of well-formed entries", () => {
    expect(Array.isArray(CANONICAL_REGISTRY)).toBe(true);
    expect(CANONICAL_REGISTRY.length).toBeGreaterThanOrEqual(30);
    for (const e of CANONICAL_REGISTRY) {
      expect(typeof e.path).toBe("string");
      expect(e.path.length).toBeGreaterThan(0);
      expect(["file", "dir", "glob"]).toContain(e.kind);
    }
  });

  it("has no duplicate paths", () => {
    const seen = new Set<string>();
    for (const e of CANONICAL_REGISTRY) {
      expect(seen.has(e.path)).toBe(false);
      seen.add(e.path);
    }
  });

  it("exercises all three kinds (file, dir, glob)", () => {
    const kinds = new Set(CANONICAL_REGISTRY.map((e) => e.kind));
    expect(kinds.has("file")).toBe(true);
    expect(kinds.has("dir")).toBe(true);
    expect(kinds.has("glob")).toBe(true);
  });
});

// ─── Pure: escapeRe ──────────────────────────────────────────────────────

describe("escapeRe", () => {
  it("escapes every regex metacharacter", () => {
    expect(escapeRe(".")).toBe("\\.");
    expect(escapeRe("*")).toBe("\\*");
    expect(escapeRe("+")).toBe("\\+");
    expect(escapeRe("?")).toBe("\\?");
    expect(escapeRe("^")).toBe("\\^");
    expect(escapeRe("$")).toBe("\\$");
    expect(escapeRe("(")).toBe("\\(");
    expect(escapeRe(")")).toBe("\\)");
    expect(escapeRe("|")).toBe("\\|");
    expect(escapeRe("[")).toBe("\\[");
    expect(escapeRe("]")).toBe("\\]");
    expect(escapeRe("{")).toBe("\\{");
    expect(escapeRe("}")).toBe("\\}");
    expect(escapeRe("\\")).toBe("\\\\");
  });

  it("leaves forward slash and alphanumerics untouched", () => {
    expect(escapeRe("state/shared/AGENT_CHAT")).toBe("state/shared/AGENT_CHAT");
  });

  it("escapes a real golf path with a literal dot", () => {
    expect(escapeRe("state/shared/.cron-locks")).toBe("state/shared/\\.cron-locks");
  });

  it("handles empty string and coerces non-strings (adversarial)", () => {
    expect(escapeRe("")).toBe("");
    expect(escapeRe(null as unknown as string)).toBe("null");
    expect(escapeRe(undefined as unknown as string)).toBe("undefined");
  });
});

// ─── Pure: registryEntryToRegexBody ──────────────────────────────────────

describe("registryEntryToRegexBody", () => {
  it("file kind → ^...$-anchored body", () => {
    expect(registryEntryToRegexBody({ path: "state/shared/AGENT_CHAT.jsonl", kind: "file" })).toBe(
      "state/shared/AGENT_CHAT\\.jsonl$",
    );
  });

  it("dir kind → strips trailing slash, appends /.+", () => {
    expect(registryEntryToRegexBody({ path: "state/shared/dashboards/", kind: "dir" })).toBe(
      "state/shared/dashboards/.+",
    );
    expect(registryEntryToRegexBody({ path: "state/shared/system-viz/staging/", kind: "dir" })).toBe(
      "state/shared/system-viz/staging/.+",
    );
  });

  it("glob kind → dir + .+ + escaped suffix + $", () => {
    expect(registryEntryToRegexBody({ path: "state/shared/.cron-locks/*.lock", kind: "glob" })).toBe(
      "state/shared/\\.cron-locks/.+\\.lock$",
    );
    expect(registryEntryToRegexBody({ path: "mcp-server/data/state/*.log", kind: "glob" })).toBe(
      "mcp-server/data/state/.+\\.log$",
    );
  });

  it("throws on missing path (failure mode)", () => {
    expect(() => registryEntryToRegexBody({ kind: "file" } as any)).toThrow();
    expect(() => registryEntryToRegexBody(null as any)).toThrow();
    expect(() => registryEntryToRegexBody({ path: "", kind: "file" } as any)).toThrow();
  });

  it("throws on unknown kind (failure mode)", () => {
    expect(() => registryEntryToRegexBody({ path: "x/y", kind: "symlink" } as any)).toThrow(/unknown registry kind/);
  });

  it("throws on a glob with zero or multiple '*' (failure mode)", () => {
    expect(() => registryEntryToRegexBody({ path: "state/shared/no-star", kind: "glob" } as any)).toThrow(/no '\*'/);
    expect(() => registryEntryToRegexBody({ path: "a/*/*.lock", kind: "glob" } as any)).toThrow(/>1 '\*'/);
  });

  it("throws on a dir entry that resolves to an empty base", () => {
    expect(() => registryEntryToRegexBody({ path: "/", kind: "dir" } as any)).toThrow(/empty base/);
  });
});

// ─── Pure: compileAllowlistRegexString / compileAllowlistRegex ───────────

describe("compileAllowlistRegexString", () => {
  it("produces a ^(?:...) alternation that compiles to a valid RegExp", () => {
    const s = compileAllowlistRegexString();
    expect(s.startsWith("^(?:")).toBe(true);
    expect(s.endsWith(")")).toBe(true);
    expect(() => new RegExp(s)).not.toThrow();
  });

  it("throws on an empty or non-array registry (failure mode)", () => {
    expect(() => compileAllowlistRegexString([] as any)).toThrow();
    expect(() => compileAllowlistRegexString(null as any)).toThrow();
    expect(() => compileAllowlistRegexString("nope" as any)).toThrow();
  });

  it("compileAllowlistRegex returns a live RegExp matching a known golf path", () => {
    const re = compileAllowlistRegex();
    expect(re).toBeInstanceOf(RegExp);
    expect(re.test("state/shared/AGENT_CHAT.jsonl")).toBe(true);
  });
});

// ─── SUPERSET INVARIANT — the anti-regression oracle ─────────────────────
// A5 uses ONLY the compiled .golf-allowlist-regex.txt when present; its inline
// FALLBACK_ALLOW becomes the backup. So the G11 regex MUST match every path
// A5's FALLBACK_ALLOW matches (the A5 → G11 direction), or golf chats silently
// lose write access. Iterating CANONICAL_REGISTRY would test the *converse*
// and miss a swap-one-entry regression that keeps the count unchanged.

/** Derive a representative path from one A5 FALLBACK_ALLOW regex by parsing its
 *  source. A5 patterns have exactly three shapes: `^<dir>/.+`, `^<file>$`, and
 *  `^<dir>/.+\.<suffix>$`. Escaped slashes are normalized first; the caller
 *  sanity-checks that the derived path actually matches the source regex, so a
 *  broken derivation fails loudly rather than passing a bogus example. */
function exampleFromA5Regex(re: RegExp): string {
  const unesc = (s: string) => s.replace(/\\(.)/g, "$1");
  let s = re.source.replace(/\\\//g, "/"); // normalize \/ → /
  if (!s.startsWith("^")) throw new Error(`unexpected A5 pattern (no ^): ${re.source}`);
  s = s.slice(1);
  // glob: <dir>/.+\.<suffix>$
  const glob = s.match(/^(.+)\/\.\+\\\.([A-Za-z0-9]+)\$$/);
  if (glob) return `${unesc(glob[1])}/__a5_example__.${glob[2]}`;
  // dir: <dir>/.+
  if (s.endsWith("/.+")) return `${unesc(s.slice(0, -3))}/__a5_example__`;
  // file: <path>$
  if (s.endsWith("$")) return unesc(s.slice(0, -1));
  throw new Error(`unhandled A5 pattern shape: ${re.source}`);
}

/** Normalize a regex body for set comparison: drop leading ^, collapse \/ → /. */
function normalizeBody(src: string): string {
  return src.replace(/^\^/, "").replace(/\\\//g, "/");
}

describe("SUPERSET INVARIANT — G11 regex covers all of A5 FALLBACK_ALLOW", () => {
  const g11 = compileAllowlistRegex();

  it("A5 exposes FALLBACK_ALLOW as a non-empty RegExp array", () => {
    expect(Array.isArray(A5.FALLBACK_ALLOW)).toBe(true);
    expect(A5.FALLBACK_ALLOW.length).toBeGreaterThan(0);
    for (const re of A5.FALLBACK_ALLOW) expect(re).toBeInstanceOf(RegExp);
  });

  it("functional: every path A5 FALLBACK_ALLOW matches is ALSO matched by the G11 regex", () => {
    for (const a5re of A5.FALLBACK_ALLOW as RegExp[]) {
      const ex = exampleFromA5Regex(a5re);
      // Sanity: our derived example genuinely belongs to this A5 pattern. If
      // this fails, exampleFromA5Regex is broken — not the invariant.
      expect(a5re.test(ex)).toBe(true);
      // THE INVARIANT: G11 must also grant it. A narrowing regression (registry
      // entry deleted or swapped) fails here even when the count is unchanged.
      expect(g11.test(ex), `G11 regex does not cover A5 path: ${ex} (from /${a5re.source}/)`).toBe(true);
    }
  });

  it("structural: every A5 FALLBACK_ALLOW pattern body is present in the registry-derived body set", () => {
    const a5Bodies = (A5.FALLBACK_ALLOW as RegExp[]).map((re) => normalizeBody(re.source));
    const g11Bodies = new Set(CANONICAL_REGISTRY.map((e) => normalizeBody(registryEntryToRegexBody(e))));
    for (const body of a5Bodies) {
      expect(g11Bodies.has(body), `A5 pattern body missing from registry: ${body}`).toBe(true);
    }
  });

  it("registry is at least as large as A5's inline fallback (no entries dropped)", () => {
    expect(CANONICAL_REGISTRY.length).toBeGreaterThanOrEqual(A5.FALLBACK_ALLOW.length);
  });

  it("converse guard: G11 grants nothing A5 does not also recognize (no bogus over-grant)", () => {
    // Not the load-bearing invariant, but catches a typo'd registry entry that
    // would silently widen golf's blast radius beyond A5's intent.
    for (const entry of CANONICAL_REGISTRY) {
      const ex = exampleFor(entry);
      expect(
        (A5.FALLBACK_ALLOW as RegExp[]).some((re) => re.test(ex)),
        `registry grants a path A5 rejects: ${ex}`,
      ).toBe(true);
    }
  });
});

// ─── Variability + negative + adversarial path matching ──────────────────

describe("compiled regex path matching", () => {
  const re = compileAllowlistRegex();

  it("matches file / dir / glob kinds (variability)", () => {
    expect(re.test("state/shared/AGENT_CHAT.jsonl")).toBe(true); // file
    expect(re.test("state/shared/dashboards/nested/deep/x.md")).toBe(true); // dir, nested
    expect(re.test("state/shared/.cron-locks/golf-cron.lock")).toBe(true); // glob
    expect(re.test("mcp-server/data/state/server.log")).toBe(true); // glob
  });

  it("rejects paths that are NOT golf-owned (negative)", () => {
    expect(re.test("mcp-server/src/engines/Foo.ts")).toBe(false);
    expect(re.test("CLAUDE.md")).toBe(false);
    expect(re.test("state/shared/handoffs/HANDOFF-x-topic.md")).toBe(false);
    expect(re.test("state/shared/golf-owned-paths.json.evil")).toBe(false);
    expect(re.test("state/shared/dashboards")).toBe(false); // bare dir, no file under it
    expect(re.test("state/shared/AGENT_CHAT.jsonl.bak")).toBe(false); // suffix not a rename-suffix
  });

  it("rejects adversarial inputs (empty, traversal-shaped, near-miss prefixes)", () => {
    expect(re.test("")).toBe(false);
    expect(re.test("state/shared/../secret.json")).toBe(false);
    expect(re.test("state/shared/dashboards-evil/x.md")).toBe(false); // prefix collision
    expect(re.test("xstate/shared/AGENT_CHAT.jsonl")).toBe(false); // ^ anchor holds
  });

  it("a regex-metachar filename under a dir glob still matches (adversarial)", () => {
    expect(re.test("state/shared/dashboards/[weird](name).md")).toBe(true);
    expect(re.test("state/shared/dashboards/a+b*c.md")).toBe(true);
  });
});

// ─── Pure: buildOwnedPathsObject / buildRegexFileContent ─────────────────

describe("buildOwnedPathsObject", () => {
  it("has schemaVersion 1, generator string, and registry-derived fields", () => {
    const obj = buildOwnedPathsObject({ discoveredDashboards: ["state/shared/dashboards/a.md"] });
    expect(obj.schemaVersion).toBe(1);
    expect(typeof obj.generator).toBe("string");
    expect(obj.generator).toContain("regen-golf-owned-paths.mjs");
    expect(Array.isArray(obj.ownedPaths)).toBe(true);
    expect(obj.ownedPaths.length).toBe(CANONICAL_REGISTRY.length);
    expect(typeof obj.allowlistRegex).toBe("string");
    expect(() => new RegExp(obj.allowlistRegex)).not.toThrow();
    expect(obj.discoveredDashboards).toEqual(["state/shared/dashboards/a.md"]);
  });

  it("generatedAt is null when not supplied, preserved when supplied", () => {
    expect(buildOwnedPathsObject({}).generatedAt).toBeNull();
    expect(buildOwnedPathsObject({ generatedAt: "2026-05-14T00:00:00.000Z" }).generatedAt).toBe(
      "2026-05-14T00:00:00.000Z",
    );
  });
});

describe("buildRegexFileContent", () => {
  it("first non-# line is exactly the regex string", () => {
    const content = buildRegexFileContent("^(?:abc)");
    const firstNonComment = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith("#"));
    expect(firstNonComment).toBe("^(?:abc)");
  });

  it("is timestamp-free — identical content on repeated calls (idempotency)", () => {
    expect(buildRegexFileContent("^(?:x)")).toBe(buildRegexFileContent("^(?:x)"));
  });
});

// ─── Pure: scanDashboards ────────────────────────────────────────────────

describe("scanDashboards", () => {
  let sandbox: string;
  beforeEach(() => {
    sandbox = mkdtempSync(path.join(tmpdir(), "regen-golf-scan-"));
  });
  afterEach(() => {
    rmSync(sandbox, { recursive: true, force: true });
  });

  it("returns [] when dashboards/ is absent (failure mode)", () => {
    expect(scanDashboards(sandbox)).toEqual([]);
  });

  it("returns sorted repo-relative paths for a nested tree", () => {
    const dash = path.join(sandbox, "state", "shared", "dashboards");
    mkdirSync(path.join(dash, "sub"), { recursive: true });
    writeFileSync(path.join(dash, "z.md"), "z");
    writeFileSync(path.join(dash, "a.md"), "a");
    writeFileSync(path.join(dash, "sub", "b.md"), "b");
    const found = scanDashboards(sandbox);
    expect(found).toEqual([
      "state/shared/dashboards/a.md",
      "state/shared/dashboards/sub/b.md",
      "state/shared/dashboards/z.md",
    ]);
  });
});

// ─── Script behavior (execFileSync into temp sandbox) ────────────────────

describe("regen-golf-owned-paths.mjs CLI", () => {
  let sandbox: string;
  beforeEach(() => {
    sandbox = mkdtempSync(path.join(tmpdir(), "regen-golf-cli-"));
  });
  afterEach(() => {
    rmSync(sandbox, { recursive: true, force: true });
  });

  it("--help exits 0 and prints usage", () => {
    const r = runScript(sandbox, "--help");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("regen-golf-owned-paths.mjs");
    expect(r.stdout).toContain("--check");
  });

  it("apply writes both artifacts; JSON parses and regex compiles (happy path)", () => {
    const r = runScript(sandbox, "--json");
    expect(r.exitCode).toBe(0);
    const summary = JSON.parse(r.stdout.trim());
    expect(summary.ok).toBe(true);
    expect(summary.mode).toBe("apply");
    expect(summary.json.action).toBe("written");
    expect(summary.regex.action).toBe("written");

    const jsonAbs = path.join(sandbox, JSON_REL);
    const regexAbs = path.join(sandbox, REGEX_REL);
    expect(existsSync(jsonAbs)).toBe(true);
    expect(existsSync(regexAbs)).toBe(true);

    const obj = JSON.parse(readFileSync(jsonAbs, "utf-8"));
    expect(obj.schemaVersion).toBe(1);
    expect(typeof obj.generatedAt).toBe("string");
    expect(() => new RegExp(obj.allowlistRegex)).not.toThrow();

    const regexLine = readFileSync(regexAbs, "utf-8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith("#"));
    expect(() => new RegExp(regexLine as string)).not.toThrow();
    // The two artifacts agree on the regex.
    expect(regexLine).toBe(obj.allowlistRegex);
  });

  it("is idempotent — second apply is a byte-identical no-op (generatedAt preserved)", () => {
    runScript(sandbox);
    const jsonAbs = path.join(sandbox, JSON_REL);
    const regexAbs = path.join(sandbox, REGEX_REL);
    const json1 = readFileSync(jsonAbs, "utf-8");
    const regex1 = readFileSync(regexAbs, "utf-8");
    const stamp1 = JSON.parse(json1).generatedAt;

    const r2 = runScript(sandbox, "--json");
    const summary2 = JSON.parse(r2.stdout.trim());
    expect(summary2.json.action).toBe("unchanged");
    expect(summary2.regex.action).toBe("unchanged");
    expect(readFileSync(jsonAbs, "utf-8")).toBe(json1);
    expect(readFileSync(regexAbs, "utf-8")).toBe(regex1);
    expect(JSON.parse(readFileSync(jsonAbs, "utf-8")).generatedAt).toBe(stamp1);
  });

  it("--dry-run writes nothing and reports would-write", () => {
    const r = runScript(sandbox, "--dry-run", "--json");
    expect(r.exitCode).toBe(0);
    const summary = JSON.parse(r.stdout.trim());
    expect(summary.mode).toBe("dry-run");
    expect(summary.json.action).toBe("would-write");
    expect(existsSync(path.join(sandbox, JSON_REL))).toBe(false);
    expect(existsSync(path.join(sandbox, REGEX_REL))).toBe(false);
  });

  it("--check exits 1 on drift (no files), exits 0 after apply, exits 1 after mutation", () => {
    // Fresh sandbox: artifacts missing → drift.
    const r1 = runScript(sandbox, "--check", "--json");
    expect(r1.exitCode).toBe(1);
    expect(JSON.parse(r1.stdout.trim()).drift).toBe(true);

    // Apply, then --check is clean.
    runScript(sandbox);
    const r2 = runScript(sandbox, "--check", "--json");
    expect(r2.exitCode).toBe(0);
    expect(JSON.parse(r2.stdout.trim()).drift).toBe(false);

    // Mutate the regex file → --check detects drift again.
    writeFileSync(path.join(sandbox, REGEX_REL), "# tampered\n^(?:nothing)\n");
    const r3 = runScript(sandbox, "--check", "--json");
    expect(r3.exitCode).toBe(1);
    expect(JSON.parse(r3.stdout.trim()).drift).toBe(true);
    expect(JSON.parse(r3.stdout.trim()).regex.action).toBe("drift");
  });

  it("regenerates from an unparseable existing JSON with a fresh timestamp (failure mode)", () => {
    runScript(sandbox);
    const jsonAbs = path.join(sandbox, JSON_REL);
    writeFileSync(jsonAbs, "{ this is not json");
    const r = runScript(sandbox, "--json");
    expect(r.exitCode).toBe(0);
    const summary = JSON.parse(r.stdout.trim());
    expect(summary.json.action).toBe("written");
    const obj = JSON.parse(readFileSync(jsonAbs, "utf-8"));
    expect(obj.schemaVersion).toBe(1);
    expect(typeof obj.generatedAt).toBe("string");
  });

  it("picks up dashboard files into discoveredDashboards", () => {
    const dash = path.join(sandbox, "state", "shared", "dashboards");
    mkdirSync(dash, { recursive: true });
    writeFileSync(path.join(dash, "live.md"), "x");
    const r = runScript(sandbox, "--json");
    const summary = JSON.parse(r.stdout.trim());
    expect(summary.discoveredDashboards).toBe(1);
    const obj = JSON.parse(readFileSync(path.join(sandbox, JSON_REL), "utf-8"));
    expect(obj.discoveredDashboards).toEqual(["state/shared/dashboards/live.md"]);
  });
});
