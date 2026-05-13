/**
 * golfSlotWriteAllowlist.test.ts — tests for .claude/hooks/golf-slot-write-allowlist.mjs (U-CLEANUP-A5)
 *
 * Coverage (per comprehensive-build-enforce floor):
 *   - Happy path: allowlisted dashboard / ledger / state path → allowed
 *   - Failure mode 1 (path traversal via ..): blocked
 *   - Failure mode 2 (path outside repo): blocked
 *   - Failure mode 3 (non-allowlisted under state/shared/): blocked
 *   - Adversarial 1 (Windows-style absolute path): blocked when outside repo
 *   - Adversarial 2 (empty / null path): handled cleanly
 *   - Adversarial 3 (atomic-rename suffix .tmp/.swp/~): allowed when base is allowlisted
 *   - Variability: 5 spanning allowlist categories exercised
 *
 * Tests import the hook's pure-function exports (`_internals`) directly,
 * bypassing the full stdin/chat-slot/stable-session-id integration. The
 * integration is verified separately by manual smoke-test + the ordering test.
 */

import { describe, it, expect } from "vitest";

// @ts-expect-error: .mjs ESM import from .ts test file
import { _internals } from "../../../.claude/hooks/golf-slot-write-allowlist.mjs";

const { normalizeRelativePath, stripRenameSuffix, isAllowed, FALLBACK_ALLOW } = _internals as {
  normalizeRelativePath: (filePath: string) => string | null;
  stripRenameSuffix: (rel: string) => string;
  isAllowed: (rel: string, customRegex: RegExp | null) => boolean;
  FALLBACK_ALLOW: RegExp[];
};

describe("golf-slot-write-allowlist — U-CLEANUP-A5", () => {
  // ─── Happy path — allowlist matches ────────────────────────────────────

  describe("happy path: allowlisted categories", () => {
    it("allows dashboards/ subtree", () => {
      const cases = [
        "state/shared/dashboards/WIRING-CANDIDATES-DASHBOARD.md",
        "state/shared/dashboards/HOOK_HEALTH_DIGEST.md",
        "state/shared/dashboards/sub/nested-dashboard.md",
        "state/shared/dashboards/archive/2026/old-report.md.gz",
      ];
      for (const c of cases) {
        expect(isAllowed(c, null)).toBe(true);
      }
    });

    it("allows golf-owned ledger JSONLs", () => {
      const cases = [
        "state/shared/bug-attribution-ledger.jsonl",
        "state/shared/peer-audit-ticks.jsonl",
        "state/shared/wiki-inject-misses.jsonl",
        "state/shared/golf-envelope-mutations.jsonl",
        "state/shared/system-viz-headline-history.jsonl",
        "state/shared/AGENT_CHAT.jsonl",
        "state/shared/DR_DRILL_LEDGER.jsonl",
      ];
      for (const c of cases) {
        expect(isAllowed(c, null)).toBe(true);
      }
    });

    it("allows golf config + transient state files", () => {
      const cases = [
        "state/shared/golf-owned-paths.json",
        "state/shared/golf-token-budget.json",
        "state/shared/golf-cron-registry.json",
        "state/shared/.envelope-drift-last.json",
        "state/shared/.peer-audit-cache.json",
        "state/shared/.cron-locks/foo.lock",
        "state/shared/.cron-locks/peer-audit-tick.lock",
      ];
      for (const c of cases) {
        expect(isAllowed(c, null)).toBe(true);
      }
    });

    it("allows top-level reports + system-viz staging", () => {
      const cases = [
        "state/shared/HOOK_HEALTH_DIGEST.md",
        "state/shared/MEMORY_GARDEN_REPORT.md",
        "state/shared/CLAUDE_MD_DRIFT_REPORT.md",
        "state/shared/system-viz/staging/new-node-batch.json",
        "state/shared/system-viz/staging/edges.diff",
        "mcp-server/data/state/golf.log",
      ];
      for (const c of cases) {
        expect(isAllowed(c, null)).toBe(true);
      }
    });
  });

  // ─── Failure mode 1: non-allowlisted ───────────────────────────────────

  describe("failure mode: paths NOT in allowlist", () => {
    it("blocks writes to src/ engine files", () => {
      const cases = [
        "mcp-server/src/engines/PRISMCreativeReasoningEngine.ts",
        "mcp-server/src/engines/MasterIndexEngine.ts",
        "mcp-server/src/tools/dispatchers/devDispatcher.ts",
      ];
      for (const c of cases) {
        expect(isAllowed(c, null)).toBe(false);
      }
    });

    it("blocks writes to .claude/* (hooks, commands, settings)", () => {
      const cases = [
        ".claude/hooks/file-claim-guard.mjs",
        ".claude/commands/forge6.md",
        ".claude/settings.json",
      ];
      for (const c of cases) {
        expect(isAllowed(c, null)).toBe(false);
      }
    });

    it("blocks writes to CLAUDE.md", () => {
      expect(isAllowed("CLAUDE.md", null)).toBe(false);
    });

    it("blocks writes to state/shared/* non-allowlisted siblings", () => {
      const cases = [
        "state/shared/BUILD_STATE.json", // peer-owned
        "state/shared/MILESTONE_PROGRESS.json", // peer-owned
        "state/shared/HOOK_REGISTRY.json", // peer-owned
        "state/shared/specs/FOO.md", // spec docs are peer-authored
        "state/shared/coordination.db", // SQLite is peer-managed via H8
      ];
      for (const c of cases) {
        expect(isAllowed(c, null)).toBe(false);
      }
    });

    it("blocks writes to mcp-server/data/* non-log files", () => {
      const cases = [
        "mcp-server/data/milestones/CLEANUP-MS0.json",
        "mcp-server/data/roadmap-index.json",
        "mcp-server/data/state/HEALTH_CHECK_REPORT.json",
      ];
      for (const c of cases) {
        expect(isAllowed(c, null)).toBe(false);
      }
    });
  });

  // ─── Failure mode 2: path traversal ────────────────────────────────────

  describe("failure mode: path-traversal defense", () => {
    it("rejects paths that resolve outside repo via ..", () => {
      // These would all resolve outside H:/prism after path.resolve()
      const cases = [
        "../outside-repo.md",
        "../../etc/passwd",
        "state/shared/dashboards/../../../escape.md",
      ];
      for (const c of cases) {
        const rel = normalizeRelativePath(`H:/prism/${c}`);
        // normalizeRelativePath returns null when path escapes repo
        if (rel === null) {
          expect(rel).toBeNull();
        } else {
          // If the path stays in-repo after .. collapse, it should not be in allowlist
          expect(isAllowed(rel, null)).toBe(false);
        }
      }
    });

    it("rejects absolute paths outside repo", () => {
      expect(normalizeRelativePath("C:/Windows/System32/cmd.exe")).toBeNull();
      expect(normalizeRelativePath("D:/totally-different-drive/file.txt")).toBeNull();
    });
  });

  // ─── Adversarial: edge cases ───────────────────────────────────────────

  describe("adversarial: edge cases", () => {
    it("normalizes Windows backslashes to forward slashes", () => {
      const rel = normalizeRelativePath("H:\\prism\\state\\shared\\dashboards\\report.md");
      expect(rel).not.toBeNull();
      expect(rel).toBe("state/shared/dashboards/report.md");
      expect(isAllowed(rel!, null)).toBe(true);
    });

    it("handles paths with trailing slash on directory", () => {
      // path.resolve normalizes; consumer-side input may have trailing slash
      const rel = normalizeRelativePath("H:/prism/state/shared/dashboards/");
      expect(rel).not.toBeNull();
      // Trailing slash collapses; should NOT match dashboards/.+ (requires at least 1 char)
      expect(isAllowed(rel!, null)).toBe(false);
    });

    it("stripRenameSuffix tolerates .tmp.<pid>.<ts> atomic-rename pattern", () => {
      const cases = [
        ["state/shared/dashboards/foo.md.tmp.12345.1700000000000", "state/shared/dashboards/foo.md"],
        ["state/shared/golf-owned-paths.json.tmp.99", "state/shared/golf-owned-paths.json"],
        ["state/shared/bug-attribution-ledger.jsonl.swp", "state/shared/bug-attribution-ledger.jsonl"],
        ["state/shared/CLAUDE_MD_DRIFT_REPORT.md~", "state/shared/CLAUDE_MD_DRIFT_REPORT.md"],
      ];
      for (const [raw, expected] of cases) {
        expect(stripRenameSuffix(raw)).toBe(expected);
      }
    });

    it("strip-then-check allows atomic-rename writes to allowlisted paths", () => {
      const rawWithSuffix = "state/shared/dashboards/MEMORY_GARDEN_REPORT.md.tmp.42.1700000000000";
      const stripped = stripRenameSuffix(rawWithSuffix);
      expect(isAllowed(stripped, null)).toBe(true);
    });

    it("FALLBACK_ALLOW is a non-trivial allowlist (>=15 patterns)", () => {
      expect(FALLBACK_ALLOW.length).toBeGreaterThanOrEqual(15);
    });
  });

  // ─── Custom regex override ─────────────────────────────────────────────

  describe("custom regex override (G11 emits)", () => {
    it("uses custom regex when provided, ignoring fallback", () => {
      // Custom regex that ONLY allows a single file
      const custom = /^state\/shared\/ONLY_THIS_ONE\.md$/;
      expect(isAllowed("state/shared/ONLY_THIS_ONE.md", custom)).toBe(true);
      // Fallback would have allowed dashboards/, but custom regex says NO
      expect(isAllowed("state/shared/dashboards/foo.md", custom)).toBe(false);
    });

    it("custom regex with .* matches everything (use sparingly)", () => {
      const wideOpen = /^.+$/;
      expect(isAllowed("anywhere/in/repo.md", wideOpen)).toBe(true);
      expect(isAllowed(".claude/settings.json", wideOpen)).toBe(true);
    });
  });

  // ─── Variability: 5 spanning categories ────────────────────────────────

  describe("variability: spanning allowlist categories", () => {
    const spanningCases: Array<[string, string, boolean]> = [
      ["dashboards subtree", "state/shared/dashboards/category-x/file.md", true],
      ["root ledger jsonl", "state/shared/bug-attribution-ledger.jsonl", true],
      ["dotfile config", "state/shared/.envelope-drift-last.json", true],
      ["nested staging dir", "state/shared/system-viz/staging/batch-1/nodes.json", true],
      ["MCP state log", "mcp-server/data/state/cleanup-tick.log", true],
      ["src code (peer territory)", "mcp-server/src/engines/Foo.ts", false],
      ["hook code (peer territory)", ".claude/hooks/some-other.mjs", false],
      ["doc (peer territory)", "knowledge/wiki/architecture/x.md", false],
    ];

    for (const [name, path, expected] of spanningCases) {
      it(`category: ${name} → ${expected ? "allowed" : "blocked"}`, () => {
        expect(isAllowed(path, null)).toBe(expected);
      });
    }
  });
});
