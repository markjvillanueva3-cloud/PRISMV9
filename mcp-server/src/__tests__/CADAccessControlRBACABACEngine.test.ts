/**
 * CADAccessControlRBACABACEngine.test.ts — U-FS-12 (PHASE-47)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADAccessControlRBACABACEngine,
  type AccessClock,
  type IdProvider,
} from "../engines/CADAccessControlRBACABACEngine.js";
import type { AbacAttributes, UserContext } from "../schemas/cadAccessControlSchema.js";

const HASH = (c: string) => c.repeat(64);
const H1 = HASH("a");

function makeClock(start = "2026-04-20T00:00:00Z"): AccessClock & {
  advanceSeconds(s: number): void;
} {
  let t = new Date(start).getTime();
  return {
    now: () => new Date(t).toISOString(),
    advanceSeconds: (s) => {
      t += s * 1000;
    },
  };
}

function makeIds(): IdProvider {
  let n = 0;
  return {
    newId: () => {
      n++;
      return `id${n}`;
    },
  };
}

function user(opts: Partial<UserContext> & { userId: string }): UserContext {
  return {
    userId: opts.userId,
    countryCode: opts.countryCode ?? "US",
    isUSPerson: opts.isUSPerson ?? true,
    roles: opts.roles ?? [],
    investigative: opts.investigative ?? false,
  };
}

const publicAbac: AbacAttributes = {
  exportClass: "public",
  allowedCountries: [],
  requiresUSPerson: false,
};

const itarAbac: AbacAttributes = {
  exportClass: "itar",
  allowedCountries: ["US"],
  requiresUSPerson: true,
};

describe("CADAccessControlRBACABACEngine (U-FS-12)", () => {
  let eng: CADAccessControlRBACABACEngine;
  let clock: ReturnType<typeof makeClock>;

  beforeEach(() => {
    clock = makeClock();
    eng = new CADAccessControlRBACABACEngine({ clock, ids: makeIds() });
    eng.upsertPolicy({
      contentHash: H1,
      abac: publicAbac,
      grants: [],
      recordSessions: false,
    });
  });

  describe("RBAC", () => {
    it("viewer cannot edit", () => {
      eng.grant(H1, {
        userId: "u1",
        roles: ["viewer"],
        grantedBy: "root",
      });
      const d = eng.check(H1, user({ userId: "u1" }), "edit");
      expect(d.allowed).toBe(false);
      expect(d.failedLayer).toBe("rbac");
    });

    it("editor can edit", () => {
      eng.grant(H1, {
        userId: "u1",
        roles: ["editor"],
        grantedBy: "root",
      });
      expect(eng.check(H1, user({ userId: "u1" }), "edit").allowed).toBe(true);
    });

    it("owner can delete + grant", () => {
      eng.grant(H1, {
        userId: "u1",
        roles: ["owner"],
        grantedBy: "root",
      });
      expect(eng.check(H1, user({ userId: "u1" }), "delete").allowed).toBe(true);
      expect(eng.check(H1, user({ userId: "u1" }), "grant").allowed).toBe(true);
    });

    it("auditor can read audit but not edit", () => {
      eng.grant(H1, {
        userId: "a1",
        roles: ["auditor"],
        grantedBy: "root",
      });
      expect(eng.check(H1, user({ userId: "a1" }), "audit_read").allowed).toBe(true);
      expect(eng.check(H1, user({ userId: "a1" }), "edit").allowed).toBe(false);
    });

    it("no grant + no user role = denied", () => {
      expect(eng.check(H1, user({ userId: "u1" }), "view").allowed).toBe(false);
    });
  });

  describe("ABAC export control", () => {
    beforeEach(() => {
      eng.setAbac(H1, itarAbac);
      eng.grant(H1, {
        userId: "u1",
        roles: ["editor"],
        grantedBy: "root",
      });
      eng.grant(H1, {
        userId: "foreign",
        roles: ["editor"],
        grantedBy: "root",
      });
    });

    it("US person on ITAR allowed to view", () => {
      const d = eng.check(H1, user({ userId: "u1", isUSPerson: true, countryCode: "US" }), "view");
      expect(d.allowed).toBe(true);
    });

    it("non-US person on ITAR denied", () => {
      const d = eng.check(
        H1,
        user({ userId: "foreign", isUSPerson: false, countryCode: "DE" }),
        "view",
      );
      expect(d.allowed).toBe(false);
      expect(d.failedLayer).toBe("abac");
    });

    it("country not on allow-list is denied", () => {
      eng.setAbac(H1, {
        exportClass: "ear",
        allowedCountries: ["US", "GB"],
        requiresUSPerson: false,
      });
      const d = eng.check(
        H1,
        user({ userId: "u1", isUSPerson: false, countryCode: "CN" }),
        "view",
      );
      expect(d.allowed).toBe(false);
      expect(d.reason).toMatch(/allow-list/);
    });

    it("ITAR print/download requires US-person even if role permits", () => {
      eng.grant(H1, {
        userId: "foreign",
        roles: ["owner"],
        grantedBy: "root",
      });
      // view path would also be blocked by requiresUSPerson — but download should
      // still be explicitly blocked
      const d = eng.check(
        H1,
        user({ userId: "foreign", isUSPerson: false, countryCode: "DE" }),
        "download",
      );
      expect(d.allowed).toBe(false);
    });
  });

  describe("checkout soft-lock", () => {
    beforeEach(() => {
      eng.grant(H1, { userId: "a", roles: ["editor"], grantedBy: "root" });
      eng.grant(H1, { userId: "b", roles: ["editor"], grantedBy: "root" });
    });

    it("first checkout succeeds; second is denied", () => {
      const r1 = eng.checkout(H1, user({ userId: "a" }));
      expect(r1.allowed).toBe(true);
      const r2 = eng.checkout(H1, user({ userId: "b" }));
      expect(r2.allowed).toBe(false);
      expect(r2.failedLayer).toBe("checkout");
    });

    it("checkin releases the lock", () => {
      eng.checkout(H1, user({ userId: "a" }));
      eng.checkin(H1, user({ userId: "a" }));
      expect(eng.checkout(H1, user({ userId: "b" })).allowed).toBe(true);
    });

    it("only holder may checkin", () => {
      eng.checkout(H1, user({ userId: "a" }));
      const r = eng.checkin(H1, user({ userId: "b" }));
      expect(r.allowed).toBe(false);
    });
  });

  describe("session recording", () => {
    it("returns sessionId when recording is on", () => {
      eng.setSessionRecording(H1, true);
      eng.grant(H1, { userId: "u1", roles: ["viewer"], grantedBy: "root" });
      const { decision, sessionId } = eng.open(H1, user({ userId: "u1" }));
      expect(decision.allowed).toBe(true);
      expect(sessionId).toMatch(/^sess-/);
      const rec = eng.session(sessionId!);
      expect(rec?.actions[0].action).toBe("view");
    });

    it("no session when recording is off", () => {
      eng.grant(H1, { userId: "u1", roles: ["viewer"], grantedBy: "root" });
      const { sessionId } = eng.open(H1, user({ userId: "u1" }));
      expect(sessionId).toBeUndefined();
    });

    it("recordSessionAction appends and endSession closes", () => {
      eng.setSessionRecording(H1, true);
      eng.grant(H1, { userId: "u1", roles: ["viewer"], grantedBy: "root" });
      const { sessionId } = eng.open(H1, user({ userId: "u1" }));
      const r1 = eng.recordSessionAction(sessionId!, "view", { pane: "top" });
      expect(r1.actions.length).toBe(2);
      const r2 = eng.endSession(sessionId!);
      expect(r2.endedAt).toBeDefined();
      expect(() => eng.recordSessionAction(sessionId!, "view")).toThrow(/ended/);
    });
  });

  describe("audit log", () => {
    it("logs allow + deny with eventId traceback", () => {
      eng.grant(H1, { userId: "u1", roles: ["viewer"], grantedBy: "root" });
      eng.check(H1, user({ userId: "u1" }), "view");
      eng.check(H1, user({ userId: "u1" }), "edit");
      const events = eng.auditEvents(H1, "u1");
      expect(events.length).toBe(2);
      expect(events[0].result).toBe("allowed");
      expect(events[1].result).toBe("denied");
    });

    it("missing policy still audits the attempt", () => {
      const d = eng.check(HASH("b"), user({ userId: "x" }), "view");
      expect(d.allowed).toBe(false);
      expect(eng.auditEvents(HASH("b")).length).toBe(1);
    });
  });

  describe("grants lifecycle", () => {
    it("grant then revoke removes access", () => {
      eng.grant(H1, { userId: "u1", roles: ["editor"], grantedBy: "root" });
      expect(eng.check(H1, user({ userId: "u1" }), "edit").allowed).toBe(true);
      eng.revoke(H1, "u1");
      expect(eng.check(H1, user({ userId: "u1" }), "edit").allowed).toBe(false);
    });

    it("expired grants are denied", () => {
      eng.grant(H1, {
        userId: "u1",
        roles: ["editor"],
        grantedBy: "root",
        expiresAt: "2026-04-20T00:00:30Z",
      });
      clock.advanceSeconds(60);
      const d = eng.check(H1, user({ userId: "u1" }), "edit");
      expect(d.allowed).toBe(false);
      expect(d.failedLayer).toBe("expired_grant");
    });

    it("second grant for same user replaces roles", () => {
      eng.grant(H1, { userId: "u1", roles: ["viewer"], grantedBy: "root" });
      eng.grant(H1, { userId: "u1", roles: ["owner"], grantedBy: "root" });
      const pol = eng.getPolicy(H1)!;
      expect(pol.grants.length).toBe(1);
      expect(pol.grants[0].roles).toEqual(["owner"]);
    });
  });
});
