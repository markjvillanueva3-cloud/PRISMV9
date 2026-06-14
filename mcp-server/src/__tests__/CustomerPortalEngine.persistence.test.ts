/**
 * CustomerPortalEngine.persistence.test.ts -- U-HOTEL-PORTAL-PERSISTENCE (slot:hotel)
 *
 * Guards the SQLite-WAL durability of the four portal record types (tokens,
 * messages, quality documents, service cases). Before this unit they lived only
 * in process-memory Maps and vanished on every MCP-server restart.
 *
 * Three layers:
 *   1. RESTART E2E (the headline) -- write through one engine instance, close it
 *      (simulated process kill), open a FRESH instance on the SAME db file, and
 *      read every record back. This is the kill-restart-readback proof.
 *   2. PARITY -- the logic that moved from Maps into SQL (sort order, message
 *      500-bound, portal-mode doc filter, error throws) behaves identically.
 *   3. ADVERSARIAL -- transient rate window resets on restart (R12: persisting it
 *      would be a bug), cross-connection WAL visibility, and SQL-injection safety
 *      via prepared statements.
 *
 * R9: every assertion fails if the persistence layer regresses (e.g. a re-stub
 * that drops the write, or a Map sneaking back in). Each uses a real temp file
 * (NOT ":memory:") for the restart/WAL tests because ":memory:" is per-connection
 * and would make a restart test a no-op false-pass.
 */
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CustomerPortalEngine } from "../engines/CustomerPortalEngine.js";

const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/; // ISO-8601 timestamp prefix

// --- temp-file lifecycle ----------------------------------------------------

let counter = 0;
const tempPaths: string[] = [];
const liveEngines: CustomerPortalEngine[] = [];

function tempDbPath(): string {
  const p = path.join(os.tmpdir(), `portal-persist-${process.pid}-${Date.now()}-${counter++}.db`);
  tempPaths.push(p);
  return p;
}

function fileEngine(dbPath: string): CustomerPortalEngine {
  const e = new CustomerPortalEngine({ dbPath });
  liveEngines.push(e);
  return e;
}

function memEngine(): CustomerPortalEngine {
  const e = new CustomerPortalEngine({ dbPath: ":memory:" });
  liveEngines.push(e);
  return e;
}

afterEach(() => {
  for (const e of liveEngines.splice(0)) {
    try { e.close(); } catch { /* already closed */ }
  }
  for (const p of tempPaths.splice(0)) {
    for (const suffix of ["", "-wal", "-shm"]) {
      try { fs.rmSync(p + suffix, { force: true }); } catch { /* ignore */ }
    }
  }
});

// --- 1. RESTART E2E (kill-restart-readback) ---------------------------------

describe("CustomerPortalEngine persistence -- kill/restart/readback E2E", () => {
  it("all four record types survive a close()+reopen on the same db file", () => {
    const dbPath = tempDbPath();
    const ent = "ORDER-PERSIST-1";

    // ---- session 1: write through engine A, then "kill" (close) ----
    const a = fileEngine(dbPath);
    const tok = a.createToken({ token_type: "order", entity_id: ent, scope: ["view", "messages", "documents"] });
    const msg = a.addMessage({
      entity_type: "order", entity_id: ent, sender_type: "customer",
      sender_name: "Acme QA", message: "Where is my FAI packet?",
    });
    const doc = a.addQualityDocument({ job_id: ent, doc_type: "fai_as9102", title: "FAI AS9102 rev A" });
    const sc = a.createServiceCase({
      entity_type: "order", entity_id: ent, subject: "Late delivery", summary: "Order is 3 days late", severity: "high",
    });
    a.close();

    // ---- session 2: a fresh engine on the SAME file (process restart) ----
    const b = fileEngine(dbPath);

    // token survived + is still valid
    const tokens = b.listTokens(ent);
    expect(tokens.length).toBe(1);
    expect(tokens[0].token).toBe(tok.token);
    expect(tokens[0].scope).toEqual(["view", "messages", "documents"]);
    expect(b.validateToken(tok.token, "messages").valid).toBe(true);

    // message survived
    const msgs = b.listMessages("order", ent, 50);
    expect(msgs.length).toBe(1);
    expect(msgs[0].id).toBe(msg.id);
    expect(msgs[0].message).toBe("Where is my FAI packet?");

    // quality doc survived
    const docs = b.listQualityDocuments(ent, false);
    expect(docs.length).toBe(1);
    expect(docs[0].id).toBe(doc.id);
    expect(b.getQualityDocument(ent, doc.id)?.title).toBe("FAI AS9102 rev A");

    // service case survived
    const cases = b.listServiceCases("order", ent);
    expect(cases.length).toBe(1);
    expect(cases[0].id).toBe(sc.id);
    expect(cases[0].severity).toBe("high");
  });

  it("revocation persists across restart (a revoked token stays revoked)", () => {
    const dbPath = tempDbPath();
    const a = fileEngine(dbPath);
    const tok = a.createToken({ token_type: "quote", entity_id: "Q-REVOKE-1" });
    a.revokeToken(tok.token);
    a.close();

    const b = fileEngine(dbPath);
    const v = b.validateToken(tok.token);
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/revoked/);
  });

  it("a mutated quality-doc review (approve) persists across restart", () => {
    const dbPath = tempDbPath();
    const a = fileEngine(dbPath);
    const doc = a.addQualityDocument({ job_id: "JOB-APPROVE-1", doc_type: "coc", title: "CoC" });
    a.updateQualityDocument({ doc_id: doc.id, job_id: "JOB-APPROVE-1", status: "approved", reviewed_by: "qa-lead" });
    a.close();

    const b = fileEngine(dbPath);
    const reread = b.getQualityDocument("JOB-APPROVE-1", doc.id);
    expect(reread?.status).toBe("approved");
    expect(reread?.reviewed_by).toBe("qa-lead");
    expect(reread?.reviewed_at).toMatch(ISO_TS); // review timestamp is a real ISO date, persisted
    // portal-mode now exposes it (approved); a draft would not
    expect(b.listQualityDocuments("JOB-APPROVE-1", true).length).toBe(1);
  });

  it("a fresh db file starts empty (no migration, no stale rows)", () => {
    const b = fileEngine(tempDbPath());
    expect(b.listTokens("anything").length).toBe(0);
    expect(b.listMessages("order", "anything").length).toBe(0);
    expect(b.listQualityDocuments("anything").length).toBe(0);
    expect(b.listServiceCases("order", "anything").length).toBe(0);
    expect(b.health().journalMode.toLowerCase()).toBe("wal");
    expect(b.health().schemaVersion).toBe(1);
  });
});

// --- 2. PARITY (logic moved from Maps to SQL behaves identically) -----------

describe("CustomerPortalEngine persistence -- behavior parity", () => {
  it("token lifecycle: create/revoke/validate/list/scope", () => {
    const e = memEngine();
    const t = e.createToken({ token_type: "order", entity_id: "ENT-1", scope: ["view"] });
    expect(t.access_count).toBe(0);
    expect(e.validateToken(t.token).valid).toBe(true);
    // validate bumped access_count durably
    expect(e.listTokens("ENT-1")[0].access_count).toBe(1);
    // scope gate
    expect(e.validateToken(t.token, "respond").valid).toBe(false);
    // revoke
    e.revokeToken(t.token);
    expect(e.validateToken(t.token).reason).toMatch(/revoked/);
  });

  it("createToken/revokeToken throws preserved", () => {
    const e = memEngine();
    expect(() => e.createToken({ token_type: "order", entity_id: "" })).toThrow(/entity_id is required/);
    expect(() => e.createToken({ token_type: "order", entity_id: "X", expires_in_days: 0 })).toThrow(/expires_in_days/);
    expect(() => e.createToken({ token_type: "order", entity_id: "X", rate_limit: 0 })).toThrow(/rate_limit/);
    expect(() => e.revokeToken("nope")).toThrow(/Token not found/);
  });

  it("listMessages returns newest-first and honors the limit", () => {
    const e = memEngine();
    for (const text of ["m1", "m2", "m3"]) {
      e.addMessage({ entity_type: "order", entity_id: "ENT-M", sender_type: "customer", sender_name: "C", message: text });
    }
    const all = e.listMessages("order", "ENT-M", 50);
    expect(all.map((m) => m.message)).toEqual(["m3", "m2", "m1"]);
    expect(e.listMessages("order", "ENT-M", 2).length).toBe(2);
    expect(e.listMessages("order", "ENT-M", 2)[0].message).toBe("m3");
  });

  it("addMessage bounds a thread to the newest 500", () => {
    const e = memEngine();
    for (let i = 0; i < 505; i++) {
      e.addMessage({ entity_type: "order", entity_id: "ENT-BOUND", sender_type: "customer", sender_name: "C", message: `msg-${i}` });
    }
    const got = e.listMessages("order", "ENT-BOUND", 1000);
    expect(got.length).toBe(500);
    // newest survived; oldest evicted
    expect(got[0].message).toBe("msg-504");
    expect(got.some((m) => m.message === "msg-0")).toBe(false);
    expect(got.some((m) => m.message === "msg-4")).toBe(false);
    expect(got.some((m) => m.message === "msg-5")).toBe(true);
  });

  it("addMessage validation throws preserved (empty + over-length)", () => {
    const e = memEngine();
    expect(() => e.addMessage({ entity_type: "order", entity_id: "X", sender_type: "shop", sender_name: "S", message: "   " }))
      .toThrow(/cannot be empty/);
    expect(() => e.addMessage({ entity_type: "order", entity_id: "X", sender_type: "shop", sender_name: "S", message: "z".repeat(5001) }))
      .toThrow(/character limit/);
  });

  it("markMessagesRead marks only matching unread, returns the count, is idempotent", () => {
    const e = memEngine();
    e.addMessage({ entity_type: "order", entity_id: "ENT-R", sender_type: "customer", sender_name: "C", message: "a" });
    e.addMessage({ entity_type: "order", entity_id: "ENT-R", sender_type: "customer", sender_name: "C", message: "b" });
    e.addMessage({ entity_type: "order", entity_id: "ENT-R", sender_type: "shop", sender_name: "S", message: "c" });
    expect(e.markMessagesRead("order", "ENT-R", "customer")).toBe(2);
    expect(e.markMessagesRead("order", "ENT-R", "customer")).toBe(0); // already read
  });

  it("quality docs: portal-mode filter shows only approved", () => {
    const e = memEngine();
    const d1 = e.addQualityDocument({ job_id: "J", doc_type: "coc", title: "draft doc" });
    e.addQualityDocument({ job_id: "J", doc_type: "material_cert", title: "approved doc", status: "approved" });
    expect(e.listQualityDocuments("J", false).length).toBe(2);
    const portal = e.listQualityDocuments("J", true);
    expect(portal.length).toBe(1);
    expect(portal[0].title).toBe("approved doc");
    // insertion order preserved in internal listing
    expect(e.listQualityDocuments("J", false)[0].id).toBe(d1.id);
  });

  it("updateQualityDocument throws are preserved", () => {
    const e = memEngine();
    expect(() => e.updateQualityDocument({ doc_id: "x", job_id: "NO-JOB" })).toThrow(/No documents for job NO-JOB/);
    e.addQualityDocument({ job_id: "J2", doc_type: "coc", title: "t" });
    expect(() => e.updateQualityDocument({ doc_id: "ghost", job_id: "J2" })).toThrow(/Document ghost not found/);
  });

  it("addQualityDocument throws preserved", () => {
    const e = memEngine();
    expect(() => e.addQualityDocument({ job_id: "", doc_type: "coc", title: "t" })).toThrow(/job_id is required/);
    expect(() => e.addQualityDocument({ job_id: "J", doc_type: "coc", title: "" })).toThrow(/title is required/);
  });

  it("service cases: create defaults, list sort, escalate, resolve, satisfaction", () => {
    const e = memEngine();
    const c1 = e.createServiceCase({ entity_type: "order", entity_id: "ENT-SC", subject: "s1", summary: "u1" });
    expect(c1.status).toBe("waiting_on_shop");
    expect(c1.escalation_level).toBe(0);

    const esc = e.updateServiceCase({ case_id: c1.id, escalate: true });
    expect(esc.escalation_level).toBe(1);
    expect(esc.status).toBe("escalated");

    const res = e.updateServiceCase({ case_id: c1.id, status: "resolved", satisfaction_score: 5 });
    expect(res.status).toBe("resolved");
    expect(res.resolved_at).toMatch(ISO_TS); // resolution timestamp set to a real ISO date
    expect(res.satisfaction_score).toBe(5);

    // list is most-recently-updated first
    const c2 = e.createServiceCase({ entity_type: "order", entity_id: "ENT-SC", subject: "s2", summary: "u2" });
    const list = e.listServiceCases("order", "ENT-SC");
    expect(list.length).toBe(2);
    expect(list[0].id).toBe(c2.id); // c2 updated most recently
  });

  it("service case throws are preserved", () => {
    const e = memEngine();
    expect(() => e.createServiceCase({ entity_type: "order", entity_id: "", subject: "s", summary: "u" })).toThrow(/entity_id is required/);
    expect(() => e.createServiceCase({ entity_type: "order", entity_id: "X", subject: "", summary: "u" })).toThrow(/subject is required/);
    expect(() => e.updateServiceCase({ case_id: "ghost" })).toThrow(/Service case ghost not found/);
    const c = e.createServiceCase({ entity_type: "order", entity_id: "X", subject: "s", summary: "u" });
    expect(() => e.updateServiceCase({ case_id: c.id, satisfaction_score: 9 })).toThrow(/satisfaction_score must be between 1 and 5/);
  });
});

// --- 3. ADVERSARIAL ---------------------------------------------------------

describe("CustomerPortalEngine persistence -- adversarial", () => {
  it("rate-limit window is TRANSIENT: it resets on restart (must NOT persist)", () => {
    const dbPath = tempDbPath();
    const a = fileEngine(dbPath);
    const t = a.createToken({ token_type: "order", entity_id: "ENT-RL", rate_limit: 2 });
    // exhaust the window: 2 ok, 3rd rate-limited
    expect(a.validateToken(t.token).valid).toBe(true);
    expect(a.validateToken(t.token).valid).toBe(true);
    expect(a.validateToken(t.token).reason).toMatch(/Rate limit exceeded/);
    a.close();

    // restart: the rate bucket is in-memory only -> a fresh process can access again
    const b = fileEngine(dbPath);
    expect(b.validateToken(t.token).valid).toBe(true);
  });

  it("WAL: a second open connection on the same file sees the first's committed write", () => {
    const dbPath = tempDbPath();
    const a = fileEngine(dbPath);
    const b = fileEngine(dbPath); // both open concurrently
    const t = a.createToken({ token_type: "order", entity_id: "ENT-WAL" });
    a.addMessage({ entity_type: "order", entity_id: "ENT-WAL", sender_type: "shop", sender_name: "S", message: "live" });
    // b never wrote, but must observe a's committed rows
    expect(b.listTokens("ENT-WAL").map((x) => x.token)).toContain(t.token);
    expect(b.listMessages("order", "ENT-WAL").length).toBe(1);
  });

  it("prepared statements neutralize a SQL-injection entity_id (stored verbatim, schema intact)", () => {
    const e = memEngine();
    const evil = "x'; DROP TABLE portal_tokens; --";
    const t = e.createToken({ token_type: "order", entity_id: evil });
    // table still exists and the row round-trips verbatim
    const got = e.listTokens(evil);
    expect(got.length).toBe(1);
    expect(got[0].entity_id).toBe(evil);
    expect(got[0].token).toBe(t.token);
    // a subsequent write proves the table was not dropped
    expect(() => e.createToken({ token_type: "order", entity_id: "ENT-AFTER" })).not.toThrow();
    expect(e.listTokens("ENT-AFTER").length).toBe(1);
  });

  it("close() is idempotent and getDbPath reflects the configured path", () => {
    const dbPath = tempDbPath();
    const e = fileEngine(dbPath);
    e.createToken({ token_type: "order", entity_id: "ENT-CLOSE" });
    expect(e.getDbPath()).toBe(dbPath);
    e.close();
    expect(() => e.close()).not.toThrow(); // second close is a no-op
  });

  it("customer_id and notes round-trip both null AND present across restart", () => {
    const dbPath = tempDbPath();
    const a = fileEngine(dbPath);
    a.createToken({ token_type: "order", entity_id: "ENT-NULL" });             // no customer_id
    a.createToken({ token_type: "order", entity_id: "ENT-CUST", customer_id: "CUST-9" }); // present
    a.addQualityDocument({ job_id: "ENT-NULL", doc_type: "coc", title: "t" }); // no notes
    a.close();

    const b = fileEngine(dbPath);
    const tokNull = b.listTokens("ENT-NULL")[0];
    expect(tokNull.customer_id).toBe(undefined);   // NULL column -> undefined (not null, not "")
    expect(tokNull.last_accessed).toBe(undefined);
    const tokCust = b.listTokens("ENT-CUST")[0];
    expect(tokCust.customer_id).toBe("CUST-9");     // present value survives, not coerced to null
    const doc = b.listQualityDocuments("ENT-NULL")[0];
    expect(doc.notes).toBe(undefined);
    expect(doc.metadata).toEqual({});
  });
});
