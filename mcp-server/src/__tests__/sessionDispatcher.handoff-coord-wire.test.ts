/**
 * sessionDispatcher.handoff-coord-wire.test.ts
 *
 * OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-MULTI-SESSION-HANDOFF —
 * round-trip wire tests for the 4 new actions wrapping
 * MultiSessionHandoffCoordinatorEngine through prism_session.
 *
 * Pattern mirrors ai-dispatcher-ledger-wire.test.ts: captures the
 * MCP handler closure via a fake server, then invokes each action
 * end-to-end (schema validation → switch dispatch → engine call →
 * response shape). No mocks of the underlying engine.
 *
 * Engine-direct behaviour is already covered by
 * MultiSessionHandoffCoordinatorEngine.test.ts (11 cases). This file
 * only verifies the dispatcher wire — schema acceptance, lazy import,
 * custom-dir param routing, dry-run safety on the destructive action,
 * confirm semantics, and the response shape every caller depends on.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

/**
 * Stand up a tiny fake MCP server, run the dispatcher's registration
 * against it, capture the tool() closure so tests can invoke actions
 * the same way the real MCP framework would.
 */
function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerSessionDispatcher(fakeServer);
  return { handler };
}

async function call(
  handler: Handler,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const r = await handler({ action, params });
  // sessionDispatcher returns { content: [{ type, text }] } via ok()
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

/**
 * Stamp a temp handoff file at a controlled age (minutes ago).
 * Mirrors the helper from MultiSessionHandoffCoordinatorEngine.test.ts
 * so engine + wire tests share an authoring contract.
 */
function createHandoffFile(
  dir: string,
  name: string,
  body: string,
  ageMinutes = 0,
): void {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, body);
  if (ageMinutes > 0) {
    const mtime = new Date(Date.now() - ageMinutes * 60 * 1000);
    fs.utimesSync(filePath, mtime, mtime);
  }
}

describe("prism_session handoff_coord_* wire (OBSIDIAN-PRISM-OS-MS0)", () => {
  let handler: Handler;
  let tempDir: string;

  beforeAll(async () => {
    handler = await createServer().handler;
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-coord-wire-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch { /* best-effort cleanup */ }
  });

  // ---------------------------------------------------------------------
  // handoff_coord_status
  // ---------------------------------------------------------------------

  describe("handoff_coord_status", () => {
    it("returns coordinate() shape on empty dir", async () => {
      const r = await call(handler, "handoff_coord_status", { handoff_dir: tempDir });
      expect(r.success).toBe(true);
      expect(r.workQueue.totalSessions).toBe(0);
      expect(r.workQueue.activeSessions).toBe(0);
      expect(r.workQueue.staleSessions).toBe(0);
      // slimResponse may strip empty arrays — accept missing or empty
      expect(r.workQueue.pendingGoals ?? []).toEqual([]);
      expect(r.workQueue.nextActions ?? []).toEqual([]);
      expect(r.workQueue.conflicts ?? []).toEqual([]);
      // recommendations / tokenEstimate may also be slim-stripped on empty data —
      // verify only fields that survive slimResponse
      expect(typeof r.workQueue.totalSessions).toBe("number");
    });

    it("aggregates open goals from multiple handoffs", async () => {
      createHandoffFile(
        tempDir,
        "HANDOFF-s1.md",
        "Family: Claude\n\n## Open Goals\n- ship U-ORPHAN-RESCUE-1\n- ship U-ORPHAN-RESCUE-2\n",
      );
      createHandoffFile(
        tempDir,
        "HANDOFF-s2.md",
        "Family: Codex\n\n## Open Goals\n- ship U-COMPLETELY-DIFFERENT\n",
      );
      const r = await call(handler, "handoff_coord_status", { handoff_dir: tempDir });
      expect(r.success).toBe(true);
      expect(r.workQueue.totalSessions).toBe(2);
      expect(r.workQueue.pendingGoals.length).toBe(3);
    });

    it("flags stale sessions older than 30 min", async () => {
      createHandoffFile(tempDir, "HANDOFF-fresh.md", "Family: Claude\n", 0);
      createHandoffFile(tempDir, "HANDOFF-stale.md", "Family: Claude\n", 60); // 60 min old
      const r = await call(handler, "handoff_coord_status", { handoff_dir: tempDir });
      expect(r.workQueue.totalSessions).toBe(2);
      expect(r.workQueue.staleSessions).toBe(1);
      expect(r.workQueue.activeSessions).toBe(1);
    });

    it("falls back to default singleton dir when handoff_dir omitted", async () => {
      // Default dir is H:/prism/state/shared which exists. Just confirm
      // the call doesn't reject and returns a valid shape — count is
      // whatever the live tree currently has.
      const r = await call(handler, "handoff_coord_status", {});
      expect(r.success).toBe(true);
      expect(typeof r.workQueue.totalSessions).toBe("number");
      expect(r.workQueue.totalSessions).toBeGreaterThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------
  // handoff_coord_inject
  // ---------------------------------------------------------------------

  describe("handoff_coord_inject", () => {
    it("returns formatted markdown text + byte/token estimates", async () => {
      createHandoffFile(tempDir, "HANDOFF-x.md", "Family: Claude\n");
      const r = await call(handler, "handoff_coord_inject", { handoff_dir: tempDir });
      expect(r.success).toBe(true);
      expect(typeof r.text).toBe("string");
      expect(r.text).toContain("Multi-Session Handoff");
      expect(r.tokenEstimate).toBeGreaterThan(0);
      expect(r.bytes).toBeGreaterThan(0);
      // dispatcher uses Math.ceil(text.length / 3.5) for the token approximation
      expect(r.tokenEstimate).toBe(Math.ceil(r.text.length / 3.5));
    });

    it("renders empty-dir digest without throwing", async () => {
      const r = await call(handler, "handoff_coord_inject", { handoff_dir: tempDir });
      expect(r.success).toBe(true);
      expect(r.text).toContain("Sessions: 0 total");
    });
  });

  // ---------------------------------------------------------------------
  // handoff_coord_load_sessions
  // ---------------------------------------------------------------------

  describe("handoff_coord_load_sessions", () => {
    it("enumerates and parses every HANDOFF-*.md", async () => {
      createHandoffFile(tempDir, "HANDOFF-a.md", "Family: Claude\nMachine: MarkV\n");
      createHandoffFile(tempDir, "HANDOFF-b.md", "Family: Codex\nMachine: DESKTOP\n");
      createHandoffFile(tempDir, "not-a-handoff.md", "ignored\n");
      const r = await call(handler, "handoff_coord_load_sessions", { handoff_dir: tempDir });
      expect(r.success).toBe(true);
      expect(r.count).toBe(2);
      expect(r.sessions).toHaveLength(2);
      expect(r.sessions.every((s: any) => typeof s.sessionId === "string")).toBe(true);
    });

    it("classifies sessions by age into active vs stale counts", async () => {
      createHandoffFile(tempDir, "HANDOFF-active.md", "Family: Claude\n", 0);
      createHandoffFile(tempDir, "HANDOFF-stale1.md", "Family: Claude\n", 45);
      createHandoffFile(tempDir, "HANDOFF-stale2.md", "Family: Claude\n", 90);
      const r = await call(handler, "handoff_coord_load_sessions", { handoff_dir: tempDir });
      expect(r.active).toBe(1);
      expect(r.stale).toBe(2);
      expect(r.count).toBe(3);
    });

    it("returns count:0 on non-existent dir (engine try/catch)", async () => {
      const r = await call(handler, "handoff_coord_load_sessions", {
        handoff_dir: path.join(tempDir, "does-not-exist"),
      });
      expect(r.success).toBe(true);
      expect(r.count).toBe(0);
      // slimResponse may strip the empty sessions array — accept either shape
      expect(r.sessions ?? []).toEqual([]);
      expect(r.active ?? 0).toBe(0);
      expect(r.stale ?? 0).toBe(0);
    });
  });

  // ---------------------------------------------------------------------
  // handoff_coord_cleanup_stale  (DESTRUCTIVE — dry-run by default)
  // ---------------------------------------------------------------------

  describe("handoff_coord_cleanup_stale", () => {
    it("defaults to DRY-RUN: lists would-deletes WITHOUT unlinking", async () => {
      createHandoffFile(tempDir, "HANDOFF-keep.md", "Family: Claude\n", 0);
      createHandoffFile(tempDir, "HANDOFF-drop1.md", "Family: Claude\n", 45);
      createHandoffFile(tempDir, "HANDOFF-drop2.md", "Family: Claude\n", 90);

      const r = await call(handler, "handoff_coord_cleanup_stale", {
        handoff_dir: tempDir,
      });

      expect(r.success).toBe(true);
      expect(r.dry_run).toBe(true);
      expect(r.would_delete_count).toBe(2);
      expect(r.scanned).toBe(3);

      // Files must still exist — dry-run is read-only
      expect(fs.existsSync(path.join(tempDir, "HANDOFF-keep.md"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "HANDOFF-drop1.md"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "HANDOFF-drop2.md"))).toBe(true);
    });

    it("actually unlinks when confirm:true is passed", async () => {
      createHandoffFile(tempDir, "HANDOFF-keep.md", "Family: Claude\n", 0);
      createHandoffFile(tempDir, "HANDOFF-drop.md", "Family: Claude\n", 90);

      const r = await call(handler, "handoff_coord_cleanup_stale", {
        handoff_dir: tempDir,
        confirm: true,
      });

      expect(r.success).toBe(true);
      expect(r.dry_run).toBe(false);
      expect(r.confirmed).toBe(true);
      expect(r.cleaned).toBe(1);
      expect(fs.existsSync(path.join(tempDir, "HANDOFF-keep.md"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, "HANDOFF-drop.md"))).toBe(false);
    });

    it("clamps max_age_ms below 60_000 to 60_000 (foot-gun guard)", async () => {
      createHandoffFile(tempDir, "HANDOFF-toddler.md", "Family: Claude\n", 0);
      const r = await call(handler, "handoff_coord_cleanup_stale", {
        handoff_dir: tempDir,
        max_age_ms: 100, // operator typo / unit-confusion
      });
      expect(r.success).toBe(true);
      expect(r.max_age_ms).toBe(60_000);
      // Fresh file (age ~0 ms) is far below the 60s floor — nothing flagged
      expect(r.would_delete_count).toBe(0);
    });

    it("clamps negative max_age_ms (finite) to 60_000 floor", async () => {
      createHandoffFile(tempDir, "HANDOFF-mid.md", "Family: Claude\n", 45);
      // -1 IS Number.isFinite() → goes through the Math.max clamp, not the fallback
      const r = await call(handler, "handoff_coord_cleanup_stale", {
        handoff_dir: tempDir,
        max_age_ms: -1,
      });
      expect(r.success).toBe(true);
      expect(r.max_age_ms).toBe(60_000);
    });

    it("falls back to default 30 min when max_age_ms is a non-numeric string", async () => {
      createHandoffFile(tempDir, "HANDOFF-mid.md", "Family: Claude\n", 45);
      // schema accepts strings via the z.union; Number("garbage") → NaN → fallback
      const r = await call(handler, "handoff_coord_cleanup_stale", {
        handoff_dir: tempDir,
        max_age_ms: "garbage",
      });
      expect(r.success).toBe(true);
      expect(r.max_age_ms).toBe(30 * 60 * 1000);
    });

    it("treats confirm:false as dry-run (does not unlink)", async () => {
      createHandoffFile(tempDir, "HANDOFF-drop.md", "Family: Claude\n", 90);
      const r = await call(handler, "handoff_coord_cleanup_stale", {
        handoff_dir: tempDir,
        confirm: false, // explicit no-confirm
      });
      expect(r.dry_run).toBe(true);
      expect(r.would_delete_count).toBe(1);
      expect(fs.existsSync(path.join(tempDir, "HANDOFF-drop.md"))).toBe(true);
    });

    it("refuses confirmed delete when handoff_dir is outside allowlist (foot-cannon guard)", async () => {
      // Reviewer B P1.3: confirm:true + outside-allowlist path must refuse.
      // Picking C:/ root which is NEVER in the allowlist (allowed roots are
      // H:/prism/state/** and the OS tmp dir).
      const outsidePath = "C:/Users";
      const r = await call(handler, "handoff_coord_cleanup_stale", {
        handoff_dir: outsidePath,
        confirm: true,
        max_age_ms: 60_000,
      });
      expect(r.success).toBe(false);
      expect(r.error).toBe("handoff_dir_not_in_allowlist");
      expect(r.resolved).toContain("Users");
      expect(Array.isArray(r.allowed_roots)).toBe(true);
      expect(r.allowed_roots.some((p: string) => p.includes("prism/state"))).toBe(true);
    });

    it("allows confirmed delete under OS tmp dir (allowlist accepts test paths)", async () => {
      // tempDir is under os.tmpdir() — must be allowlisted.
      createHandoffFile(tempDir, "HANDOFF-drop.md", "Family: Claude\n", 90);
      const r = await call(handler, "handoff_coord_cleanup_stale", {
        handoff_dir: tempDir,
        confirm: true,
      });
      expect(r.success).toBe(true);
      expect(r.confirmed).toBe(true);
      expect(r.cleaned).toBe(1);
    });
  });

  // ---------------------------------------------------------------------
  // Cross-action sanity
  // ---------------------------------------------------------------------

  describe("all 4 actions accept handoff_dir override", () => {
    it("each action routes to the supplied custom dir, not the singleton", async () => {
      createHandoffFile(tempDir, "HANDOFF-only-here.md", "Family: Claude\n");

      const a = await call(handler, "handoff_coord_status", { handoff_dir: tempDir });
      expect(a.workQueue.totalSessions).toBe(1);

      const b = await call(handler, "handoff_coord_inject", { handoff_dir: tempDir });
      expect(b.text).toContain("Sessions: 1 total");

      const c = await call(handler, "handoff_coord_load_sessions", { handoff_dir: tempDir });
      expect(c.count).toBe(1);

      const d = await call(handler, "handoff_coord_cleanup_stale", { handoff_dir: tempDir });
      expect(d.scanned).toBe(1);
    });
  });
});
