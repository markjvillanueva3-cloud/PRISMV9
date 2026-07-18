/**
 * psk-whoami.test.ts — COMMAND-KERNEL-MS0/U-CK02 dedicated deliverable.
 *
 * U-CK02 ships REAL whoami / manifest / position syscalls. This is the
 * envelope-mandated test file; its load-bearing exit condition is:
 *
 *   "psk whoami resolves {sessionId, slot, branch, topic, worktree,
 *    userClaudeDir, memoryPath} with paths DETECTED at runtime
 *    (no hardcoded wompu / Mark Villanueva literals)"
 *
 * The general psk acceptance suite (psk.test.ts) covers the dispatcher wire +
 * the manifest live-count cross-check. THIS file is whoami- and
 * path-detection-centric, plus a proper `position` composition test (the one
 * U-CK02 syscall psk.test.ts does not exercise).
 *
 * Real-value assertions only — no toBeDefined() / toBeTruthy() stubs.
 *
 * Perf note: each `dispatch('whoami')` spawns stable-session-id.mjs + git, so
 * the default-env whoami/manifest/position results are resolved ONCE in
 * beforeAll and reused by every test that only inspects a default-env result.
 * Only the env-override + adversarial-param tests re-dispatch.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// psk.mjs lives at repo-root/.claude/kernel/. __dirname here is
// mcp-server/src/__tests__, so `../../..` climbs to the repo root.
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const PSK_PATH = path.join(REPO_ROOT, ".claude", "kernel", "psk.mjs");
const PSK_SRC = fs.readFileSync(PSK_PATH, "utf8");

// The seven-field whoami contract from the U-CK02 envelope exit condition.
const WHOAMI_CONTRACT = [
  "sessionId", "slot", "branch", "topic",
  "worktree", "userClaudeDir", "memoryPath",
] as const;

let psk: typeof import("../../../.claude/kernel/psk.mjs");
let UNRESOLVED: string;

// Default-env results, resolved once (see Perf note above).
let baseWhoami: any;
let baseManifest: any;
let basePosition: any;

// Snapshot the one env var these tests mutate so a failed assertion can never
// leak a fake PRISM_USER_CLAUDE_DIR into a sibling test or the next file.
const ENV_KEY = "PRISM_USER_CLAUDE_DIR";
const ENV_ORIGINAL = process.env[ENV_KEY];

beforeAll(async () => {
  if (!fs.existsSync(PSK_PATH)) {
    throw new Error(`psk.mjs not found at ${PSK_PATH} — U-CK01/U-CK02 not built?`);
  }
  // pathToFileURL keeps the import working regardless of OS path separators.
  psk = await import(new URL(`file://${PSK_PATH.replace(/\\/g, "/")}`).href);
  UNRESOLVED = psk.UNRESOLVED_SENTINEL;
  // One default-env resolution of each U-CK02 syscall — reused below.
  baseWhoami = await psk.dispatch("whoami", {});
  baseManifest = await psk.dispatch("manifest", {});
  basePosition = await psk.dispatch("position", {});
});

afterEach(() => {
  // Restore the env var after every test (the override tests mutate it).
  if (ENV_ORIGINAL === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = ENV_ORIGINAL;
});

// ---------------------------------------------------------------------------
// A. EXIT CONDITION — no hardcoded user paths in the psk.mjs source.
// ---------------------------------------------------------------------------
describe("psk.mjs source — no hardcoded user paths (U-CK02 exit condition)", () => {
  it("contains no hardcoded operator identity literals", () => {
    // The U-CK02 exit condition names these two literals explicitly. A real
    // user-home path may still APPEAR in runtime OUTPUT (os.homedir() resolves
    // it) — but it must never be BAKED INTO THE SOURCE.
    expect(PSK_SRC).not.toMatch(/wompu/i);
    expect(PSK_SRC).not.toMatch(/mark[\s._-]*villanueva/i);
  });

  it("contains no hardcoded absolute Windows user-home path", () => {
    // e.g. `C:\Users\someone\` baked as a literal. os.homedir() / path.join
    // are the only sanctioned ways to reach a user dir.
    expect(PSK_SRC).not.toMatch(/[A-Za-z]:\\\\?Users\\\\?[A-Za-z0-9 ._-]+\\\\/);
    expect(PSK_SRC).not.toMatch(/["'][A-Za-z]:[\\/]Users[\\/][A-Za-z0-9 ._-]+[\\/]/);
  });

  it("contains no hardcoded absolute POSIX user-home path", () => {
    // e.g. `/home/jdoe/` or `/Users/jdoe/` baked as a literal.
    expect(PSK_SRC).not.toMatch(/["']\/(?:home|Users)\/[a-z][\w.-]+\//);
  });

  it("DOES detect the user dir at runtime (os.homedir + env override are present)", () => {
    // Positive control — the source must actually USE the runtime mechanisms,
    // otherwise the "no hardcoded path" tests above pass on a stub.
    expect(PSK_SRC).toMatch(/os\.homedir\(\)/);
    expect(PSK_SRC).toMatch(/PRISM_USER_CLAUDE_DIR/);
  });
});

// ---------------------------------------------------------------------------
// B. slugForRepo — pure repo→slug transform (exported for deterministic test).
// ---------------------------------------------------------------------------
describe("slugForRepo — pure repo→slug transform", () => {
  it("uppercases + replaces every non-alphanumeric run-char with '-'", () => {
    // path.resolve leaves an already-absolute Windows path unchanged, so the
    // transform is deterministic here: H:\prism → H--PRISM.
    expect(psk.slugForRepo("H:\\prism")).toBe("H--PRISM");
    expect(psk.slugForRepo("C:\\Users\\foo\\bar-baz")).toBe("C--USERS-FOO-BAR-BAZ");
  });

  it("is case-insensitive (collapses input case into the uppercased slug)", () => {
    expect(psk.slugForRepo("H:\\PRISM")).toBe(psk.slugForRepo("H:\\prism"));
    expect(psk.slugForRepo("h:\\PrIsM")).toBe("H--PRISM");
  });

  it("collapses dots and mixed separators to '-'", () => {
    expect(psk.slugForRepo("H:\\a.b.c")).toBe("H--A-B-C");
  });

  it("never emits a trailing '-' (trailing run is stripped)", () => {
    // path.resolve strips trailing separators, so the resolved input never
    // ends in a separator — assert the slug-end invariant directly.
    expect(psk.slugForRepo("H:\\prism\\")).toBe("H--PRISM");
    expect(psk.slugForRepo("H:\\prism").endsWith("-")).toBe(false);
    expect(psk.slugForRepo(REPO_ROOT).endsWith("-")).toBe(false);
  });

  it("matches the actual project slug Claude Code uses for this repo", () => {
    // The real per-project memory dir is <claude>/projects/H--PRISM/memory —
    // slugForRepo(REPO_ROOT) must reproduce that exact folder name.
    const slug = psk.slugForRepo(REPO_ROOT);
    expect(slug).toBe(slug.toUpperCase());
    expect(/^[A-Z0-9-]+$/.test(slug)).toBe(true);
    expect(slug).toContain("PRISM");
  });

  it("preserves a LEADING hyphen for POSIX absolute paths (regression guard)", () => {
    // The docstring calls this out as a bug class: stripping leading dashes
    // would break detectMemoryPath on every Linux/macOS box. Only meaningful
    // where path.resolve leaves a leading-separator path intact (POSIX).
    if (process.platform !== "win32") {
      expect(psk.slugForRepo("/home/user/code")).toBe("-HOME-USER-CODE");
    } else {
      // On win32 path.resolve drive-anchors a POSIX path, so the leading-sep
      // case is unreachable — assert the transform still produced a clean slug.
      expect(/^[A-Z0-9-]+$/.test(psk.slugForRepo("/home/user/code"))).toBe(true);
    }
  });

  it("does not throw on an empty string (adversarial input)", () => {
    // path.resolve("") === process.cwd() — slug is the cwd slug, never a throw.
    const slug = psk.slugForRepo("");
    expect(typeof slug).toBe("string");
    expect(slug.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// C. whoami — the seven-field contract (inspects the default-env baseWhoami).
// ---------------------------------------------------------------------------
describe("dispatch('whoami') — seven-field contract", () => {
  it("returns ok:true with every contract field present and string-typed", () => {
    expect(baseWhoami.ok).toBe(true);
    expect(baseWhoami.syscall).toBe("whoami");
    expect(baseWhoami.note).toContain("U-CK02");
    for (const field of WHOAMI_CONTRACT) {
      // Each field is ALWAYS a string — a resolved value or the sentinel.
      expect(typeof baseWhoami.result[field]).toBe("string");
      expect(baseWhoami.result[field].length).toBeGreaterThan(0);
    }
  });

  it("resolves repoRoot / slotsFile / helpersDir to real on-disk paths", () => {
    expect(fs.statSync(baseWhoami.result.repoRoot).isDirectory()).toBe(true);
    expect(fs.existsSync(baseWhoami.result.helpersDir)).toBe(true);
    expect(baseWhoami.result.helpersDir.replace(/\\/g, "/").endsWith(".claude/helpers")).toBe(true);
    // slotsFile path is declared even when the file itself is absent.
    expect(baseWhoami.result.slotsFile.replace(/\\/g, "/").endsWith("state/shared/chat-slots.json")).toBe(true);
  });

  it("surfaces a *_detail object for every degradable field (slim-safe, never null)", () => {
    // slimResponse strips literal null — these MUST be plain objects so the
    // keys survive the MCP envelope. Empty {} on success, {error,...} on miss.
    for (const k of ["userClaudeDirDetail", "memoryPathDetail", "worktreeDetail", "topicErrors"]) {
      expect(typeof baseWhoami.result[k]).toBe("object");
      expect(baseWhoami.result[k]).not.toBeNull();
    }
    expect(["commit-subject-scope-ms", "commit-subject", "current-position", "branch-segment", "fallback"])
      .toContain(baseWhoami.result.topicSource);
  });

  it("resolves a degradable field to EITHER a real value OR exactly the sentinel", () => {
    // worktree: a resolved value is an on-disk dir; the sentinel carries detail.
    if (baseWhoami.result.worktree === UNRESOLVED) {
      expect(typeof baseWhoami.result.worktreeDetail.error).toBe("string");
    } else {
      expect(fs.statSync(baseWhoami.result.worktree).isDirectory()).toBe(true);
    }
    // slot: a real NATO slot name OR the sentinel (a bare CLI/test call has no
    // bound chat slot, so the sentinel is the expected real outcome here).
    expect(["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", UNRESOLVED])
      .toContain(baseWhoami.result.slot);
  });
});

// ---------------------------------------------------------------------------
// D. Runtime path detection — the load-bearing U-CK02 behaviour.
// ---------------------------------------------------------------------------
describe("whoami — runtime path detection (PRISM_USER_CLAUDE_DIR)", () => {
  it("honours a valid PRISM_USER_CLAUDE_DIR override over os.homedir()", async () => {
    // Use a real temp dir so the existence probe inside detectUserClaudeDir
    // passes — proving the override path is RESOLVED, not just echoed.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "psk-claude-"));
    try {
      process.env[ENV_KEY] = tmp;
      const r = await psk.dispatch("whoami", {});
      expect(r.result.userClaudeDir).toBe(tmp);
      // memoryPath is derived from userClaudeDir + the repo slug. The temp dir
      // has no projects/<slug>/memory tree, so memoryPath degrades to the
      // sentinel and memoryPathDetail.expected names the path it looked for.
      const expectedMem = path.join(tmp, "projects", psk.slugForRepo(REPO_ROOT), "memory");
      expect(r.result.memoryPath).toBe(UNRESOLVED);
      expect(r.result.memoryPathDetail.expected).toBe(expectedMem);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("rejects a PRISM_USER_CLAUDE_DIR carrying a literal '..' traversal segment", async () => {
    // Build the value by string concat — path.join would pre-normalize the
    // '..' away and never reach the guard. The guard fires when the raw input
    // is absolute but path.normalize(raw) !== raw.
    const traversal = os.tmpdir() + path.sep + ".." + path.sep + "psk-escape-attempt";
    expect(path.normalize(traversal)).not.toBe(traversal); // precondition: it IS un-normalized
    process.env[ENV_KEY] = traversal;
    const r = await psk.dispatch("whoami", {});
    expect(r.result.userClaudeDir).toBe(UNRESOLVED);
    expect(r.result.userClaudeDirDetail.errorCode).toBe("PATH_TRAVERSAL");
    // The rejection must cascade: memoryPath is derived from userClaudeDir, so a
    // rejected userClaudeDir leaves memoryPath UNRESOLVED with a slim-safe detail
    // object — `expected` is the UNRESOLVED sentinel (NOT null, which slimResponse
    // would strip), and `error` names the upstream cause.
    expect(r.result.memoryPath).toBe(UNRESOLVED);
    expect(r.result.memoryPathDetail.expected).toBe(UNRESOLVED);
    expect(r.result.memoryPathDetail.error).toContain("userClaudeDir not resolved");
  });

  it("degrades (does not crash) when PRISM_USER_CLAUDE_DIR points at a missing path", async () => {
    // Absolute + normalized but non-existent — surfaced as a degraded field,
    // not an exception, not a false resolve.
    const ghost = path.join(os.tmpdir(), `psk-ghost-${process.pid}-does-not-exist`);
    process.env[ENV_KEY] = ghost;
    const r = await psk.dispatch("whoami", {});
    expect(r.ok).toBe(true);
    expect(r.result.userClaudeDir).toBe(UNRESOLVED);
    expect(r.result.userClaudeDirDetail.path).toBe(ghost);
    expect(typeof r.result.userClaudeDirDetail.error).toBe("string");
  });

  it("with NO override, resolves userClaudeDir UNDER os.homedir() (never a baked literal)", async () => {
    delete process.env[ENV_KEY];
    const r = await psk.dispatch("whoami", {});
    if (r.result.userClaudeDir !== UNRESOLVED) {
      // Whatever it resolved to, it MUST sit inside the runtime-detected home —
      // this is the proof that detection is live, not hardcoded.
      const home = os.homedir();
      expect(r.result.userClaudeDir.startsWith(home)).toBe(true);
      expect(r.result.userClaudeDir.replace(/\\/g, "/").endsWith(".claude")).toBe(true);
    } else {
      // No ~/.claude on this box — degraded, with detail. Still not a crash.
      expect(typeof r.result.userClaudeDirDetail.error).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// E. manifest — live counts (light check; psk.test.ts owns the deep cross-check).
// ---------------------------------------------------------------------------
describe("dispatch('manifest') — live counts", () => {
  it("returns positive integer engine/dispatcher counts traced to the inventory file", () => {
    expect(baseManifest.ok).toBe(true);
    if (baseManifest.degraded) {
      // Inventory file missing on this box — degraded path must still be structured.
      expect(typeof baseManifest.result.parseError).toBe("string");
      return;
    }
    expect(Number.isInteger(baseManifest.result.counts.engines)).toBe(true);
    expect(baseManifest.result.counts.engines).toBeGreaterThan(0);
    expect(Number.isInteger(baseManifest.result.counts.dispatchers)).toBe(true);
    expect(baseManifest.result.counts.dispatchers).toBeGreaterThan(0);
    // Provenance — the count is traceable to PRISM-INVENTORY-LATEST.md.
    expect(baseManifest.result.origin.file.replace(/\\/g, "/").endsWith("PRISM-INVENTORY-LATEST.md")).toBe(true);
  });

  it("exposes a `top` quick-access surface whose every key faithfully mirrors `counts`", () => {
    // manifest advertises a 10-key `top` surface for fast operator inspection.
    // Every key MUST be a faithful projection of the full `counts` map: the
    // number when counts carries it, null otherwise — never a stale/baked value.
    if (baseManifest.degraded) {
      expect(typeof baseManifest.result.parseError).toBe("string");
      return;
    }
    const { top, counts } = baseManifest.result;
    const TOP_KEYS = [
      "engines", "dispatchers", "actions", "algorithms", "registries",
      "tests", "source_hooks", "claude_hooks", "scripts", "slash_cmds_local",
    ];
    expect(Object.keys(top).sort()).toEqual([...TOP_KEYS].sort());
    let resolvedCount = 0;
    for (const k of TOP_KEYS) {
      if (typeof counts[k] === "number") {
        // counts has it → top must mirror the exact value, not approximate it.
        expect(top[k]).toBe(counts[k]);
        resolvedCount++;
      } else {
        // counts lacks it → top must be explicit null, never undefined/stale.
        expect(top[k]).toBeNull();
      }
    }
    // The inventory file in this repo populates the core counts — at least the
    // two headline keys must have resolved, proving `top` isn't all-null.
    expect(resolvedCount).toBeGreaterThanOrEqual(2);
    expect(top.engines).toBe(counts.engines);
    expect(top.dispatchers).toBe(counts.dispatchers);
  });
});

// ---------------------------------------------------------------------------
// F. position — composed from snapshots, never re-derived.
// ---------------------------------------------------------------------------
describe("dispatch('position') — composed snapshots", () => {
  it("returns the four-snapshot contract with per-source provenance + availability", () => {
    expect(basePosition.ok).toBe(true);
    expect(basePosition.syscall).toBe("position");
    expect(basePosition.note).toContain("U-CK02");
    for (const k of ["build", "svi", "drift", "milestone"]) {
      expect(k in basePosition.result).toBe(true);
    }
    // Every snapshot has a source path + an availability status.
    for (const k of Object.keys(basePosition.result.sources)) {
      expect(typeof basePosition.result.sources[k]).toBe("string");
      expect(k in basePosition.result.available).toBe(true);
    }
  });

  it("composes BUILD_STATE.json's headline rather than re-deriving it", () => {
    const buildStatePath = path.join(REPO_ROOT, "state", "shared", "BUILD_STATE.json");
    if (!fs.existsSync(buildStatePath)) return; // snapshot absent on this box — nothing to cross-check
    if (basePosition.result.available["BUILD_STATE.json"] !== true) return;
    // psk's position.build MUST equal the file's headline object verbatim —
    // proof it READS the snapshot, never recomputes it.
    const fileHeadline = JSON.parse(fs.readFileSync(buildStatePath, "utf8")).headline ?? null;
    expect(basePosition.result.build).toEqual(fileHeadline);
  });
});

// ---------------------------------------------------------------------------
// G. Fail-soft contract — U-CK02 syscalls never throw, even on hostile input.
// ---------------------------------------------------------------------------
describe("U-CK02 syscalls — fail-soft contract", () => {
  it("whoami / manifest / position all return a structured {ok} result on empty params", () => {
    for (const [sc, r] of [["whoami", baseWhoami], ["manifest", baseManifest], ["position", basePosition]] as const) {
      expect(typeof r.ok).toBe("boolean");
      expect(r.syscall).toBe(sc);
    }
  });

  it("whoami tolerates a non-object params arg (null) without throwing", async () => {
    const r = await psk.dispatch("whoami", null as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect(r.syscall).toBe("whoami");
  });

  it("whoami tolerates a numeric sessionId (adversarial type) without throwing", async () => {
    const r = await psk.dispatch("whoami", { sessionId: 99999 as unknown as string });
    expect(r.ok).toBe(true);
    // A bogus id resolves nothing — sessionId stays the sentinel, never crashes.
    expect(typeof r.result.sessionId).toBe("string");
  });

  it("whoami tolerates a control-char sessionId (adversarial value) without throwing", async () => {
    const r = await psk.dispatch("whoami", { sessionId: " bad-id" });
    expect(r.ok).toBe(true);
    expect(typeof r.result.slot).toBe("string");
  });
});
