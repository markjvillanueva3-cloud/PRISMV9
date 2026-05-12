/**
 * HookCreationGuardEngine tests — HOOK-SYNERGY-MS0 / U-HOOK-CREATION-GATE  (H5)
 *
 * Covers the four match dimensions (exact name, fuzzy name, description overlap,
 * signature collision), the four recommendation outcomes (skip/extend/rename/proceed),
 * adapter functions (entriesFromManifest, entriesFromRegistry), and the throwing variant
 * (mustCheckBeforeCreating). Round-trip with a real HookManifest is exercised in the
 * dispatcher test file (hookDispatcher.creationCheck.test.ts).
 */

import { describe, it, expect } from "vitest";
import {
  HookCreationGuardEngine,
  hookCreationGuardEngine,
  entriesFromManifest,
  entriesFromRegistry,
  type HookCatalogEntry,
} from "../engines/HookCreationGuardEngine.js";
import {
  HookCreationCheckResultSchema,
  HOOK_CREATION_GUARD_SCHEMA_VERSION,
} from "../schemas/hookCreationGuardSchema.js";
import { HOOK_MANIFEST_SCHEMA_VERSION, type HookManifest } from "../schemas/hookManifestSchema.js";

// ── Fixture catalog (deterministic + minimal) ────────────────────────────────

const FIXTURE_CATALOG: HookCatalogEntry[] = [
  {
    id: "file-claim-guard",
    file: ".claude/hooks/file-claim-guard.mjs",
    description: "Prevents two concurrent Claude chats from silently editing the same file.",
    events: ["PreToolUse"],
    matchers: ["^(Edit|Write|MultiEdit)$"],
    signatures: [{ event: "PreToolUse", matcher: "^(Edit|Write|MultiEdit)$" }],
  },
  {
    id: "commit-ownership-guard",
    file: ".claude/hooks/commit-ownership-guard.mjs",
    description: "Blocks git commits that include files owned by other live sessions.",
    events: ["PreToolUse"],
    matchers: ["^Bash$"],
    signatures: [{ event: "PreToolUse", matcher: "^Bash$" }],
  },
  {
    id: "hook-cross-worktree-block",
    file: ".claude/hooks/hook-cross-worktree-block.mjs",
    description: "Blocks shared-state writes from non-main worktrees in the 6-chat fleet.",
    events: ["PreToolUse"],
    matchers: ["^(Edit|Write|MultiEdit|NotebookEdit)$"],
    signatures: [{ event: "PreToolUse", matcher: "^(Edit|Write|MultiEdit|NotebookEdit)$" }],
  },
  {
    id: "stale-claim-sweeper",
    file: ".claude/hooks/stale-claim-sweeper.mjs",
    description: "Reaps stale claims and locks from coordination state on SessionStart.",
    events: ["SessionStart", "Stop"],
    matchers: [""],
    signatures: [{ event: "SessionStart", matcher: "" }, { event: "Stop", matcher: "" }],
  },
];

// ── Tests ───────────────────────────────────────────────────────────────────

describe("HookCreationGuardEngine", () => {
  const eng = new HookCreationGuardEngine();

  describe("smoke + interface", () => {
    it("exports a singleton of the right class", () => {
      expect(hookCreationGuardEngine).toBeInstanceOf(HookCreationGuardEngine);
      expect(hookCreationGuardEngine.constructor.name).toBe("HookCreationGuardEngine");
    });

    it("getCapabilities lists exactly three documented capabilities", () => {
      const caps = eng.getCapabilities().map((c) => c.name).sort();
      expect(caps).toEqual(["checkBeforeCreating", "loadCatalog", "mustCheckBeforeCreating"]);
    });

    it("validateInput returns the specific error for missing proposedName", () => {
      expect(eng.validateInput({})).toBe("proposedName is required and must be a non-empty string");
      expect(eng.validateInput({ proposedName: "" })).toBe("proposedName is required and must be a non-empty string");
      expect(eng.validateInput(null)).toBe("expected an input object");
    });

    it("validateInput returns null for a valid input", () => {
      expect(eng.validateInput({ proposedName: "foo.mjs", description: "" })).toBeNull();
    });

    it("result passes its own Zod schema with schemaVersion pinned to 1", () => {
      const r = eng.checkBeforeCreating(
        { proposedName: "brand-new-unique-hook.mjs", description: "Does something unique." },
        { catalog: FIXTURE_CATALOG },
      );
      expect(() => HookCreationCheckResultSchema.parse(r)).not.toThrow();
      expect(r.schemaVersion).toBe(HOOK_CREATION_GUARD_SCHEMA_VERSION);
      expect(r.schemaVersion).toBe(1);
    });
  });

  describe("exact-name match → skip", () => {
    it("identical basename (with extension) recommends skip", () => {
      const r = eng.checkBeforeCreating(
        { proposedName: "file-claim-guard.mjs", description: "Different description here." },
        { catalog: FIXTURE_CATALOG },
      );
      expect(r.shouldProceed).toBe(false);
      expect(r.recommendation).toBe("skip");
      expect(r.topMatch?.id).toBe("file-claim-guard");
      expect(r.topMatch?.reasons.includes("exact-name")).toBe(true);
      expect(r.topMatch?.score).toBe(1);
      expect(r.reason).toMatch(/Exact name collision/);
    });

    it("identical basename without extension also collides", () => {
      const r = eng.checkBeforeCreating(
        { proposedName: "file-claim-guard", description: "" },
        { catalog: FIXTURE_CATALOG },
      );
      expect(r.recommendation).toBe("skip");
      expect(r.topMatch?.id).toBe("file-claim-guard");
    });

    it("full path is normalized to basename for collision check", () => {
      const r = eng.checkBeforeCreating(
        { proposedName: "H:/prism/.claude/hooks/file-claim-guard.mjs", description: "" },
        { catalog: FIXTURE_CATALOG },
      );
      expect(r.recommendation).toBe("skip");
    });
  });

  describe("fuzzy-name match → rename or extend depending on score", () => {
    it("≥3-char delta lands in the 'rename' band (0.7..0.85)", () => {
      const r = eng.checkBeforeCreating(
        { proposedName: "file-claaim-gardd.mjs", description: "" },
        { catalog: FIXTURE_CATALOG },
      );
      expect(r.shouldProceed).toBe(false);
      expect(r.matches.length).toBeGreaterThan(0);
      expect(r.topMatch?.id).toBe("file-claim-guard");
      expect(r.topMatch?.score).toBeGreaterThanOrEqual(0.7);
      expect(r.topMatch?.score).toBeLessThan(0.85);
      expect(r.recommendation).toBe("rename");
      expect(r.topMatch?.reasons.includes("fuzzy-name")).toBe(true);
    });

    it("single-char delta produces 'extend' band (score ≥0.85)", () => {
      const r = eng.checkBeforeCreating(
        { proposedName: "file-claim-guardx.mjs", description: "" },
        { catalog: FIXTURE_CATALOG },
      );
      expect(r.recommendation).toBe("extend");
      expect(r.topMatch?.score).toBeGreaterThanOrEqual(0.85);
    });

    it("completely-different name produces zero matches and recommendation 'proceed'", () => {
      const r = eng.checkBeforeCreating(
        { proposedName: "xyzzy-quux-randomname-7777.mjs", description: "" },
        { catalog: FIXTURE_CATALOG },
      );
      expect(r.shouldProceed).toBe(true);
      expect(r.recommendation).toBe("proceed");
      expect(r.matches).toHaveLength(0);
      expect(r.topMatch === undefined).toBe(true);
    });
  });

  describe("description overlap boosts score", () => {
    it("shared content tokens flag stale-claim-sweeper even with a different name", () => {
      const r = eng.checkBeforeCreating(
        {
          proposedName: "claim-reaper.mjs",
          description: "Reaps stale claims from coordination tables every SessionStart.",
        },
        { catalog: FIXTURE_CATALOG },
      );
      const top = r.topMatch;
      expect(top?.id).toBe("stale-claim-sweeper");
      expect(top?.reasons.includes("description-overlap")).toBe(true);
      expect(r.shouldProceed).toBe(false);
    });

    it("no description-overlap when no shared tokens above min-length threshold", () => {
      const r = eng.checkBeforeCreating(
        {
          proposedName: "totally-different-name-here.mjs",
          description: "Foo bar baz qux.",
        },
        { catalog: FIXTURE_CATALOG },
      );
      const hasDescOverlap = r.matches.some((m) => m.reasons.includes("description-overlap"));
      expect(hasDescOverlap).toBe(false);
    });
  });

  describe("signature collision → extend (high-priority)", () => {
    it("(PreToolUse, ^Bash$) collides with commit-ownership-guard regardless of name", () => {
      const r = eng.checkBeforeCreating(
        {
          proposedName: "my-bash-monitor.mjs",
          description: "",
          event: "PreToolUse",
          matcher: "^Bash$",
        },
        { catalog: FIXTURE_CATALOG },
      );
      expect(r.shouldProceed).toBe(false);
      expect(r.recommendation).toBe("extend");
      const colliding = r.matches.find((m) => m.id === "commit-ownership-guard");
      expect(colliding?.reasons.includes("signature-match")).toBe(true);
      expect(colliding?.detail).toMatch(/signature-match:PreToolUse/);
    });

    it("(SessionStart, empty matcher) collides with stale-claim-sweeper", () => {
      const r = eng.checkBeforeCreating(
        {
          proposedName: "new-session-init.mjs",
          description: "",
          event: "SessionStart",
          matcher: "",
        },
        { catalog: FIXTURE_CATALOG },
      );
      const sigMatch = r.matches.find((m) => m.reasons.includes("signature-match"));
      expect(sigMatch?.id).toBe("stale-claim-sweeper");
    });

    it("no signature collision when matcher differs", () => {
      const r = eng.checkBeforeCreating(
        {
          proposedName: "xyz-distinct.mjs",
          description: "",
          event: "PreToolUse",
          matcher: "^Read$",
        },
        { catalog: FIXTURE_CATALOG },
      );
      expect(r.shouldProceed).toBe(true);
    });

    it("no signature dimension when event is omitted", () => {
      const r = eng.checkBeforeCreating(
        { proposedName: "xyz-distinct.mjs", description: "" },
        { catalog: FIXTURE_CATALOG },
      );
      expect(r.shouldProceed).toBe(true);
    });
  });

  describe("mustCheckBeforeCreating", () => {
    it("throws when shouldProceed is false; attaches the result on err.result", () => {
      let thrown: unknown = null;
      try {
        eng.mustCheckBeforeCreating(
          { proposedName: "file-claim-guard.mjs", description: "" },
          { catalog: FIXTURE_CATALOG },
        );
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(Error);
      expect((thrown as Error).message).toMatch(/HookCreationGuard/);
      const r = (thrown as Error & { result?: { recommendation?: string; topMatch?: { id?: string } } }).result;
      expect(r?.recommendation).toBe("skip");
      expect(r?.topMatch?.id).toBe("file-claim-guard");
    });

    it("returns the result when shouldProceed is true", () => {
      const r = eng.mustCheckBeforeCreating(
        { proposedName: "totally-unique-new-hook-xyz.mjs", description: "" },
        { catalog: FIXTURE_CATALOG },
      );
      expect(r.shouldProceed).toBe(true);
      expect(r.recommendation).toBe("proceed");
    });
  });

  describe("catalog adapters", () => {
    it("entriesFromManifest converts a manifest into the same shape as catalog input", () => {
      const manifest: HookManifest = {
        schemaVersion: HOOK_MANIFEST_SCHEMA_VERSION,
        generatedAt: "2026-05-12T00:00:00.000Z",
        repoRoot: "/repo",
        hookDirs: ["/repo/.claude/hooks"],
        settingsFiles: ["/repo/.claude/settings.json"],
        hooks: [
          {
            id: "test-hook",
            file: ".claude/hooks/test-hook.mjs",
            kind: "claude-mjs",
            sizeBytes: 100,
            lineCount: 10,
            description: "A test hook.",
            exports: [],
            wired: true,
            hardBlock: false,
            events: ["PreToolUse"],
            wirings: [
              { event: "PreToolUse", matcher: "^Bash$", source: "/repo/.claude/settings.json", order: 0 },
              { event: "PreToolUse", matcher: "^Read$", source: "/repo/.claude/settings.json", order: 1 },
            ],
          },
        ],
        events: { PreToolUse: [".claude/hooks/test-hook.mjs"] },
        danglingRefs: [],
        stats: {
          totalHooks: 1, byKind: { "claude-mjs": 1 }, byEvent: { PreToolUse: 1 },
          wired: 1, orphaned: 0, hardBlock: 0, danglingRefs: 0, totalLines: 10, eventTypes: ["PreToolUse"],
        },
      };
      const entries = entriesFromManifest(manifest);
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe("test-hook");
      expect(entries[0].signatures).toEqual([
        { event: "PreToolUse", matcher: "^Bash$" },
        { event: "PreToolUse", matcher: "^Read$" },
      ]);
    });

    it("entriesFromRegistry parses the HOOK_REGISTRY.json shape, skipping garbage", () => {
      const raw = {
        hooks: [
          {
            id: "alpha",
            file: ".claude/hooks/alpha.mjs",
            description: "Alpha description",
            events: ["PostToolUse"],
            wirings: [{ event: "PostToolUse", matcher: "^Write$" }],
          },
          { id: "beta", file: ".claude/hooks/beta.mjs" },
          null,
          { description: "missing file" },
        ],
      };
      const entries = entriesFromRegistry(raw);
      expect(entries.map((e) => e.id).sort()).toEqual(["alpha", "beta"]);
      const alpha = entries.find((e) => e.id === "alpha");
      expect(alpha?.signatures).toEqual([{ event: "PostToolUse", matcher: "^Write$" }]);
    });

    it("entriesFromRegistry returns empty array on malformed input", () => {
      expect(entriesFromRegistry(null)).toEqual([]);
      expect(entriesFromRegistry("not-an-object")).toEqual([]);
      expect(entriesFromRegistry({})).toEqual([]);
      expect(entriesFromRegistry({ hooks: "not-an-array" })).toEqual([]);
    });
  });

  describe("determinism", () => {
    it("identical input → identical output (deep-equal)", () => {
      const input = { proposedName: "file-claim-guardx.mjs", description: "Foo bar." };
      const r1 = eng.checkBeforeCreating(input, { catalog: FIXTURE_CATALOG });
      const r2 = eng.checkBeforeCreating(input, { catalog: FIXTURE_CATALOG });
      expect(r1).toEqual(r2);
    });

    it("matches array is sorted by score desc, then by id asc", () => {
      const tieCatalog: HookCatalogEntry[] = [
        { id: "zebra-test-hook", file: "z.mjs", description: "", events: [], matchers: [], signatures: [] },
        { id: "alpha-test-hook", file: "a.mjs", description: "", events: [], matchers: [], signatures: [] },
      ];
      const r = eng.checkBeforeCreating(
        { proposedName: "beta-test-hook.mjs", description: "" },
        { catalog: tieCatalog },
      );
      if (r.matches.length >= 2 && r.matches[0].score === r.matches[1].score) {
        expect(r.matches[0].id < r.matches[1].id).toBe(true);
      }
    });
  });

  describe("edge-case inputs", () => {
    it("empty catalog → proceed", () => {
      const r = eng.checkBeforeCreating({ proposedName: "x.mjs", description: "" }, { catalog: [] });
      expect(r.shouldProceed).toBe(true);
      expect(r.matches).toEqual([]);
    });

    it("zero-length description doesn't trip description-overlap", () => {
      const r = eng.checkBeforeCreating(
        { proposedName: "totally-different.mjs", description: "" },
        { catalog: FIXTURE_CATALOG },
      );
      const hasDescOverlap = r.matches.some((m) => m.reasons.includes("description-overlap"));
      expect(hasDescOverlap).toBe(false);
    });

    it("registry file missing → loadCatalog returns []", () => {
      const fakeFs = {
        existsSync: () => false,
        readFileSync: () => "",
      };
      const r = eng.loadCatalog({ registryPath: "/does/not/exist.json", fsImpl: fakeFs });
      expect(r).toEqual([]);
    });

    it("registry file malformed JSON → loadCatalog returns []", () => {
      const fakeFs = {
        existsSync: () => true,
        readFileSync: () => "not-json",
      };
      const r = eng.loadCatalog({ registryPath: "/wherever.json", fsImpl: fakeFs });
      expect(r).toEqual([]);
    });
  });
});
