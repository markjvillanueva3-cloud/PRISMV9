/**
 * JmDieUserProfileEngine + JM_DIE_TEAM_SEED tests (hotel iter23).
 *
 * Real-behavior assertions only (no toBeDefined() / length > 0 stubs).
 * Hotel-soul gates verified: PII redaction, fail-CLOSED permission check,
 * owner-tier full access, backup-role permission delta vs primary.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  JmDieUserProfileEngine,
  PRISM_FEATURES,
  OWNER_ALL_FEATURES,
  type PrismFeature,
} from "../engines/JmDieUserProfileEngine.js";
import { JM_DIE_TEAM_SEED } from "../data/jm-die-team-seed.js";

function freshEngine(): JmDieUserProfileEngine {
  const e = new JmDieUserProfileEngine();
  for (const seed of JM_DIE_TEAM_SEED) {
    e.create(seed);
  }
  return e;
}

describe("JmDieUserProfileEngine — basic state", () => {
  let engine: JmDieUserProfileEngine;
  beforeEach(() => {
    engine = freshEngine();
  });

  it("seeds exactly 8 office/management profiles", () => {
    expect(engine.size()).toBe(8);
  });

  it("seeds the 8 named team members by stable id", () => {
    const ids = engine
      .listRedacted()
      .map((p) => p.id)
      .sort();
    expect(ids).toEqual([
      "user-adam",
      "user-colleen",
      "user-darren",
      "user-mark",
      "user-paul",
      "user-stanley",
      "user-sylwia",
      "user-vicky",
    ]);
  });

  it("get() returns null for unknown user (fail-CLOSED)", () => {
    expect(engine.get("user-nonexistent")).toBeNull();
    expect(engine.getRedacted("user-nonexistent")).toBeNull();
  });

  it("create() refuses duplicate id", () => {
    expect(() =>
      engine.create({
        id: "user-mark",
        legal_name: "imposter",
        display_name: "imposter",
        role: "cnc_manager_developer",
        work_email: "imposter@jmdie.com",
        responsibilities: [],
        owned_domains: [],
        permissions: [],
      })
    ).toThrow(/already exists/);
  });

  it("create() refuses missing @ in work_email", () => {
    const e = new JmDieUserProfileEngine();
    expect(() =>
      e.create({
        id: "user-bad",
        legal_name: "bad",
        display_name: "bad",
        role: "owner",
        work_email: "no-at-sign",
        responsibilities: [],
        owned_domains: [],
        permissions: [],
      })
    ).toThrow(/invalid work_email/);
  });

  it("create() refuses is_backup_for pointing to unseeded primary", () => {
    const e = new JmDieUserProfileEngine();
    expect(() =>
      e.create({
        id: "user-stanley",
        legal_name: "Stanley",
        display_name: "Stanley",
        role: "asst_shop_foreman",
        work_email: "stanley@jmdie.com",
        responsibilities: [],
        owned_domains: [],
        permissions: [],
        is_backup_for: "user-adam-not-yet",
      })
    ).toThrow(/references unknown profile/);
  });
});

describe("JmDieUserProfileEngine — RBAC permission checks", () => {
  let engine: JmDieUserProfileEngine;
  beforeEach(() => {
    engine = freshEngine();
  });

  it("Paul (owner) has access to EVERY feature in PRISM_FEATURES", () => {
    for (const feature of PRISM_FEATURES) {
      expect(engine.checkPermission("user-paul", feature)).toBe(true);
    }
  });

  it("Paul's owner-tier covers all 51+ canonical features", () => {
    // sanity check the bundle is non-trivial — anchors at exact length
    expect(PRISM_FEATURES.length).toBeGreaterThanOrEqual(51);
    expect(OWNER_ALL_FEATURES.size).toBe(PRISM_FEATURES.length);
  });

  it("Stanley = Adam minus 4 admin features (hiring + PO approval + quote approval + material POs)", () => {
    const stanleyAllowed = (f: PrismFeature) => engine.checkPermission("user-stanley", f);
    const adamAllowed = (f: PrismFeature) => engine.checkPermission("user-adam", f);

    // Adam has them; Stanley does not
    expect(adamAllowed("hr.hiring")).toBe(true);
    expect(stanleyAllowed("hr.hiring")).toBe(false);

    expect(adamAllowed("purchasing.approve_po")).toBe(true);
    expect(stanleyAllowed("purchasing.approve_po")).toBe(false);

    expect(adamAllowed("quoting.approve")).toBe(true);
    expect(stanleyAllowed("quoting.approve")).toBe(false);

    expect(adamAllowed("inventory.order_materials")).toBe(true);
    expect(stanleyAllowed("inventory.order_materials")).toBe(false);

    // Both have these core shop-floor ones
    expect(adamAllowed("shop_floor.delegate_tasks")).toBe(true);
    expect(stanleyAllowed("shop_floor.delegate_tasks")).toBe(true);
    expect(adamAllowed("shop_floor.scheduling")).toBe(true);
    expect(stanleyAllowed("shop_floor.scheduling")).toBe(true);
  });

  it("Vicky is scoped to shipping/receiving + laser_marking ONLY", () => {
    // YES — her domain
    expect(engine.checkPermission("user-vicky", "shipping.create")).toBe(true);
    expect(engine.checkPermission("user-vicky", "shipping.ups_fedex_integration")).toBe(true);
    expect(engine.checkPermission("user-vicky", "shipping.laser_marking")).toBe(true);
    expect(engine.checkPermission("user-vicky", "receiving.intake_pdfs")).toBe(true);
    expect(engine.checkPermission("user-vicky", "receiving.intake_pictures")).toBe(true);

    // NO — outside her domain
    expect(engine.checkPermission("user-vicky", "shop_floor.write_jobs")).toBe(false);
    expect(engine.checkPermission("user-vicky", "accounting.write_gl")).toBe(false);
    expect(engine.checkPermission("user-vicky", "hr.hiring")).toBe(false);
    expect(engine.checkPermission("user-vicky", "quoting.approve")).toBe(false);
    expect(engine.checkPermission("user-vicky", "admin.user_management")).toBe(false);
  });

  it("Sylwia has full HR + accounting + payroll authority", () => {
    expect(engine.checkPermission("user-sylwia", "hr.payroll_admin")).toBe(true);
    expect(engine.checkPermission("user-sylwia", "accounting.run_payroll")).toBe(true);
    expect(engine.checkPermission("user-sylwia", "accounting.write_gl")).toBe(true);
    expect(engine.checkPermission("user-sylwia", "accounting.financial_reports")).toBe(true);
    // not in her domain
    expect(engine.checkPermission("user-sylwia", "shop_floor.write_jobs")).toBe(false);
    expect(engine.checkPermission("user-sylwia", "cad_cam.programming")).toBe(false);
  });

  it("Darren can see + write prospects, send first-contact emails, and approve quotes", () => {
    expect(engine.checkPermission("user-darren", "sales.view_prospects")).toBe(true);
    expect(engine.checkPermission("user-darren", "sales.write_prospects")).toBe(true);
    expect(engine.checkPermission("user-darren", "sales.send_first_contact")).toBe(true);
    expect(engine.checkPermission("user-darren", "quoting.approve")).toBe(true);
    expect(engine.checkPermission("user-darren", "quoting.send")).toBe(true);
    // owner's right hand — view-only on accounting
    expect(engine.checkPermission("user-darren", "accounting.view_ar")).toBe(true);
    expect(engine.checkPermission("user-darren", "accounting.write_ar")).toBe(false);
    expect(engine.checkPermission("user-darren", "accounting.run_payroll")).toBe(false);
  });

  it("Mark owns CAD/CAM + has developer-tier admin (user mgmt, audit, tutorials)", () => {
    expect(engine.checkPermission("user-mark", "cad_cam.programming")).toBe(true);
    expect(engine.checkPermission("user-mark", "cad_cam.post_processing")).toBe(true);
    expect(engine.checkPermission("user-mark", "cad_cam.simulation")).toBe(true);
    expect(engine.checkPermission("user-mark", "cad_cam.reverse_engineering")).toBe(true);
    expect(engine.checkPermission("user-mark", "cad_cam.training")).toBe(true);
    expect(engine.checkPermission("user-mark", "admin.user_management")).toBe(true);
    expect(engine.checkPermission("user-mark", "admin.system_config")).toBe(true);
    expect(engine.checkPermission("user-mark", "admin.view_audit")).toBe(true);
    expect(engine.checkPermission("user-mark", "admin.tutorials_authoring")).toBe(true);
    // NOT his domain — payroll/HR is Sylwia's
    expect(engine.checkPermission("user-mark", "accounting.run_payroll")).toBe(false);
    expect(engine.checkPermission("user-mark", "hr.payroll_admin")).toBe(false);
  });

  it("Colleen has full inventory + purchasing day-to-day authority", () => {
    expect(engine.checkPermission("user-colleen", "inventory.order_tools")).toBe(true);
    expect(engine.checkPermission("user-colleen", "inventory.order_materials")).toBe(true);
    expect(engine.checkPermission("user-colleen", "purchasing.create_po")).toBe(true);
    expect(engine.checkPermission("user-colleen", "office.reception")).toBe(true);
    // not in her domain
    expect(engine.checkPermission("user-colleen", "quoting.approve")).toBe(false);
    expect(engine.checkPermission("user-colleen", "hr.hiring")).toBe(false);
  });

  it("checkPermission fail-CLOSED on unknown user", () => {
    expect(engine.checkPermission("user-imposter", "admin.user_management")).toBe(false);
    expect(engine.checkPermission("", "admin.user_management")).toBe(false);
  });

  it("checkPermission fail-CLOSED on unknown feature (even for owner Paul)", () => {
    expect(engine.checkPermission("user-paul", "shop_floor.megabad_feature")).toBe(false);
    expect(engine.checkPermission("user-paul", "")).toBe(false);
  });
});

describe("JmDieUserProfileEngine — PII redaction (hotel-soul gate)", () => {
  let engine: JmDieUserProfileEngine;
  beforeEach(() => {
    engine = freshEngine();
    // attach PII to mark for redaction test
    engine._reset();
    engine.create({
      id: "user-mark",
      legal_name: "Mark Villanueva",
      display_name: "Mark",
      role: "cnc_manager_developer",
      work_email: "mvillanueva@jmdie.com",
      personal_email: "mark.personal@gmail.com",
      personal_phone: "(708) 343-0900 x123",
      responsibilities: ["dev"],
      owned_domains: ["cad_cam"],
      permissions: [],
    });
  });

  it("redacts personal_email — keeps first 2 chars + domain only", () => {
    const r = engine.getRedacted("user-mark")!;
    expect(r.personal_email_redacted).toBe("ma***@gmail.com");
  });

  it("redacts personal_phone — keeps last 4 digits only", () => {
    const r = engine.getRedacted("user-mark")!;
    // Phone "(708) 343-0900 x123" → digits "70834309000123" → last 4 = "0123"
    expect(r.personal_phone_redacted).toBe("***-***-0123");
  });

  it("does NOT redact work_email (public-by-design)", () => {
    const r = engine.getRedacted("user-mark")!;
    expect(r.work_email).toBe("mvillanueva@jmdie.com");
  });

  it("returns null for personal_email_redacted when no personal email set", () => {
    engine._reset();
    engine.create({
      id: "user-no-personal",
      legal_name: "No Personal",
      display_name: "No Personal",
      role: "owner",
      work_email: "x@jmdie.com",
      responsibilities: [],
      owned_domains: [],
      permissions: [],
    });
    const r = engine.getRedacted("user-no-personal")!;
    expect(r.personal_email_redacted).toBeNull();
    expect(r.personal_phone_redacted).toBeNull();
  });
});

describe("JmDieUserProfileEngine — listRedacted + filter + coverage", () => {
  let engine: JmDieUserProfileEngine;
  beforeEach(() => {
    engine = freshEngine();
  });

  it("listRedacted() returns all 8 sorted by display_name", () => {
    const names = engine.listRedacted().map((p) => p.display_name);
    expect(names).toEqual([
      "Adam",
      "Colleen",
      "Darren",
      "Mark",
      "Paul",
      "Stanley",
      "Sylwia",
      "Vicky",
    ]);
  });

  it("listRedacted({ role: 'owner' }) returns only Paul", () => {
    const owners = engine.listRedacted({ role: "owner" });
    expect(owners).toHaveLength(1);
    expect(owners[0].id).toBe("user-paul");
  });

  it("listRedacted({ owned_domain: 'shop_floor' }) returns Adam + Stanley", () => {
    const shopFloor = engine.listRedacted({ owned_domain: "shop_floor" });
    const ids = shopFloor.map((p) => p.id).sort();
    expect(ids).toEqual(["user-adam", "user-stanley"]);
  });

  it("coverageReport() lists all features as covered (8 profiles span the matrix)", () => {
    const c = engine.coverageReport();
    expect(c.total_features).toBe(PRISM_FEATURES.length);
    // Paul alone covers everything
    expect(c.covered_features).toBe(PRISM_FEATURES.length);
    expect(c.uncovered).toEqual([]);
  });

  it("coverageReport.per_user has all 8 entries with non-empty permission_count", () => {
    const c = engine.coverageReport();
    expect(c.per_user).toHaveLength(8);
    const paulEntry = c.per_user.find((u) => u.id === "user-paul")!;
    expect(paulEntry.permission_count).toBe(PRISM_FEATURES.length); // owner == all
    const colleenEntry = c.per_user.find((u) => u.id === "user-colleen")!;
    expect(colleenEntry.permission_count).toBeGreaterThan(5);
    expect(colleenEntry.permission_count).toBeLessThan(PRISM_FEATURES.length);
  });
});

describe("JmDieUserProfileEngine — active user session", () => {
  let engine: JmDieUserProfileEngine;
  beforeEach(() => {
    engine = freshEngine();
  });

  it("setActiveUser() rejects unseeded id", () => {
    expect(() => engine.setActiveUser("user-imposter")).toThrow(/not seeded/);
  });

  it("setActiveUser() returns prior active (null on first set)", () => {
    expect(engine.setActiveUser("user-mark")).toBeNull();
    expect(engine.setActiveUser("user-adam")).toBe("user-mark");
  });

  it("getActiveUser() returns redacted profile of active user", () => {
    expect(engine.getActiveUser()).toBeNull();
    engine.setActiveUser("user-paul");
    const active = engine.getActiveUser()!;
    expect(active.id).toBe("user-paul");
    expect(active.role).toBe("owner");
  });
});

describe("JM_DIE_TEAM_SEED — content integrity", () => {
  it("Stanley references Adam via is_backup_for", () => {
    const stanley = JM_DIE_TEAM_SEED.find((s) => s.id === "user-stanley")!;
    expect(stanley.is_backup_for).toBe("user-adam");
  });

  it("every seeded profile has a jmdie.com work email", () => {
    for (const seed of JM_DIE_TEAM_SEED) {
      expect(seed.work_email.endsWith("@jmdie.com")).toBe(true);
    }
  });

  it("every seeded profile has at least one responsibility", () => {
    for (const seed of JM_DIE_TEAM_SEED) {
      expect(seed.responsibilities.length).toBeGreaterThan(0);
    }
  });

  it("Mark's seed mentions every CNC discipline the operator named", () => {
    const mark = JM_DIE_TEAM_SEED.find((s) => s.id === "user-mark")!;
    const allResp = mark.responsibilities.join(" ");
    expect(allResp).toMatch(/mill/i);
    expect(allResp).toMatch(/lathe/i);
    expect(allResp).toMatch(/5-axis/i);
    expect(allResp).toMatch(/mill-turn/i);
    expect(allResp).toMatch(/CAD\/CAM/i);
  });

  it("Vicky's seed mentions UPS + FedEx + Docustrata-PDF/picture intake (Paul's Evernote replacement)", () => {
    const vicky = JM_DIE_TEAM_SEED.find((s) => s.id === "user-vicky")!;
    const allResp = vicky.responsibilities.join(" ").toLowerCase();
    expect(allResp).toContain("ups");
    expect(allResp).toContain("fedex");
    expect(allResp).toContain("docustrata");
    expect(allResp).toContain("pdf");
    expect(allResp).toContain("picture");
  });

  it("Paul's seed has empty permissions[] (owner short-circuits at engine level)", () => {
    const paul = JM_DIE_TEAM_SEED.find((s) => s.id === "user-paul")!;
    expect(paul.role).toBe("owner");
    expect(paul.permissions).toEqual([]);
  });

  it("seed order places Adam before Stanley (is_backup_for resolves)", () => {
    const adamIdx = JM_DIE_TEAM_SEED.findIndex((s) => s.id === "user-adam");
    const stanleyIdx = JM_DIE_TEAM_SEED.findIndex((s) => s.id === "user-stanley");
    expect(adamIdx).toBeGreaterThan(-1);
    expect(stanleyIdx).toBeGreaterThan(adamIdx);
  });
});
