/**
 * LoggingEngine — companion test
 * ===============================
 * WIRE-UNWIRED-MS0/U-WIRE-LOGGING-ENGINE
 *
 * Verifies the prism_infra read-only surface (log_* actions) backed by the
 * LoggingEngine singleton — structured logging with levels, namespaces,
 * context enrichment, rotation, and query.
 *
 * Wired (read-only):
 *   - log_query      → loggingEngine.query(q)
 *   - log_stats      → loggingEngine.stats()
 *   - log_get_config → loggingEngine.getConfig()
 *
 * Write (log/trace/.../fatal), configure, and clear are exercised here to
 * seed fixtures + verify the read surface, but are NOT exposed via MCP.
 *
 * Every assertion compares against a concrete expected value (R9).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { LoggingEngine, loggingEngine, type LogLevel } from "../engines/LoggingEngine.js";

describe("LoggingEngine", () => {
  beforeEach(() => {
    // clear() wipes entries + resets the module-level logIdCounter.
    // Also reset config to the documented defaults (clear() does NOT reset
    // config — a prior configure() would leak otherwise).
    loggingEngine.clear();
    loggingEngine.configure({
      min_level: "info",
      max_entries: 10000,
      namespaces_enabled: [],
      namespaces_disabled: [],
    });
  });

  describe("log — level gating", () => {
    it("records an entry at or above min_level (default 'info')", () => {
      const entry = loggingEngine.info("app", "started");
      expect(entry?.level).toEqual("info");
      expect(entry?.namespace).toEqual("app");
      expect(entry?.message).toEqual("started");
      expect(entry?.id).toEqual(1);
    });

    it("DROPS entries below min_level (trace/debug filtered when min_level='info')", () => {
      expect(loggingEngine.trace("app", "noise") === undefined).toEqual(true);
      expect(loggingEngine.debug("app", "noise") === undefined).toEqual(true);
      // Nothing recorded.
      expect(loggingEngine.stats().total_entries).toEqual(0);
    });

    it("records every level at or above min_level after lowering min_level to 'trace'", () => {
      loggingEngine.configure({ min_level: "trace" });
      const levels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
      for (const lvl of levels) loggingEngine.log(lvl, "ns", `msg-${lvl}`);
      expect(loggingEngine.stats().total_entries).toEqual(6);
    });

    it("assigns a monotonically increasing id to each recorded entry", () => {
      expect(loggingEngine.info("a", "1")?.id).toEqual(1);
      expect(loggingEngine.info("a", "2")?.id).toEqual(2);
      expect(loggingEngine.info("a", "3")?.id).toEqual(3);
    });

    it("stamps each entry with a parseable ISO timestamp", () => {
      const before = Date.now();
      const entry = loggingEngine.warn("ns", "msg");
      const after = Date.now();
      const ts = Date.parse(entry?.timestamp ?? "");
      expect(Number.isFinite(ts)).toEqual(true);
      expect(ts >= before && ts <= after).toEqual(true);
    });

    it("carries context + correlation_id through onto the entry", () => {
      const entry = loggingEngine.log("error", "db", "query failed", { table: "users" }, "req-42");
      expect(entry?.context).toEqual({ table: "users" });
      expect(entry?.correlation_id).toEqual("req-42");
    });
  });

  describe("namespace filtering", () => {
    it("drops entries from a disabled namespace", () => {
      loggingEngine.configure({ namespaces_disabled: ["spammy"] });
      expect(loggingEngine.info("spammy", "x") === undefined).toEqual(true);
      expect(loggingEngine.info("quiet", "y")?.namespace).toEqual("quiet");
    });

    it("when namespaces_enabled is non-empty, only those namespaces record", () => {
      loggingEngine.configure({ namespaces_enabled: ["allowed"] });
      expect(loggingEngine.info("allowed", "ok")?.namespace).toEqual("allowed");
      expect(loggingEngine.info("other", "no") === undefined).toEqual(true);
    });
  });

  describe("query — filters", () => {
    beforeEach(() => {
      loggingEngine.configure({ min_level: "trace" });
      loggingEngine.log("info", "app", "user login");
      loggingEngine.log("warn", "app.auth", "slow token check");
      loggingEngine.log("error", "db", "connection lost", undefined, "corr-1");
      loggingEngine.log("debug", "app", "cache miss");
    });

    it("filters by minimum level (level='warn' returns warn+error+fatal)", () => {
      const r = loggingEngine.query({ level: "warn" });
      const levels = r.map((e) => e.level).sort();
      expect(levels).toEqual(["error", "warn"]);
    });

    it("filters by exact namespace", () => {
      const r = loggingEngine.query({ namespace: "db" });
      expect(r.length).toEqual(1);
      expect(r[0].namespace).toEqual("db");
    });

    it("namespace filter matches dotted-prefix descendants ('app' matches 'app.auth')", () => {
      const r = loggingEngine.query({ namespace: "app" });
      const namespaces = r.map((e) => e.namespace).sort();
      expect(namespaces).toEqual(["app", "app", "app.auth"]);
    });

    it("filters by case-insensitive message substring", () => {
      const r = loggingEngine.query({ search: "CONNECTION" });
      expect(r.length).toEqual(1);
      expect(r[0].message).toEqual("connection lost");
    });

    it("filters by correlation_id", () => {
      const r = loggingEngine.query({ correlation_id: "corr-1" });
      expect(r.length).toEqual(1);
      expect(r[0].namespace).toEqual("db");
    });

    it("respects the limit (returns the LAST `limit` entries)", () => {
      const r = loggingEngine.query({ limit: 2 });
      expect(r.length).toEqual(2);
      // Last two of the 4 seeded entries (insertion order).
      expect(r.map((e) => e.message)).toEqual(["connection lost", "cache miss"]);
    });

    it("an empty query returns all entries (up to the default limit of 100)", () => {
      expect(loggingEngine.query({}).length).toEqual(4);
    });

    it("combines multiple filters (level + namespace)", () => {
      const r = loggingEngine.query({ level: "warn", namespace: "app" });
      // 'app' prefix-matches 'app.auth'; only the warn-level one qualifies.
      expect(r.length).toEqual(1);
      expect(r[0].namespace).toEqual("app.auth");
    });
  });

  describe("query — time-range filters", () => {
    it("filters by `since` / `until` ISO timestamps", () => {
      // The cutoff must sit STRICTLY between the two entries' timestamps.
      // query uses since>=  and  until<= , so a same-ms collision on either
      // side would double-count. Spin once before AND once after capturing
      // the cutoff so: early.ts < cutoff < late.ts (all distinct ms).
      loggingEngine.configure({ min_level: "trace" });
      loggingEngine.log("info", "ns", "early");
      const t1 = Date.now();
      while (Date.now() === t1) { /* spin <1ms — cutoff strictly after 'early' */ }
      const cutoff = new Date().toISOString();
      const t2 = Date.now();
      while (Date.now() === t2) { /* spin <1ms — 'late' strictly after cutoff */ }
      loggingEngine.log("info", "ns", "late");
      const sinceCut = loggingEngine.query({ since: cutoff });
      expect(sinceCut.length).toEqual(1);
      expect(sinceCut[0].message).toEqual("late");
      const untilCut = loggingEngine.query({ until: cutoff });
      expect(untilCut.length).toEqual(1);
      expect(untilCut[0].message).toEqual("early");
    });
  });

  describe("stats", () => {
    it("aggregates total_entries, by_level, by_namespace", () => {
      loggingEngine.configure({ min_level: "trace" });
      loggingEngine.log("info", "a", "1");
      loggingEngine.log("info", "a", "2");
      loggingEngine.log("error", "b", "3");
      const s = loggingEngine.stats();
      expect(s.total_entries).toEqual(3);
      expect(s.by_level.info).toEqual(2);
      expect(s.by_level.error).toEqual(1);
      expect(s.by_namespace.a).toEqual(2);
      expect(s.by_namespace.b).toEqual(1);
    });

    it("counts errors_last_hour for error + fatal entries", () => {
      loggingEngine.log("error", "ns", "err");
      loggingEngine.log("fatal", "ns", "fatal");
      loggingEngine.log("info", "ns", "info");
      const s = loggingEngine.stats();
      // Both error + fatal are <1h old (just logged) → counted.
      expect(s.errors_last_hour).toEqual(2);
    });

    it("reports oldest_entry + newest_entry timestamps, empty strings when no entries", () => {
      const empty = loggingEngine.stats();
      expect(empty.total_entries).toEqual(0);
      expect(empty.oldest_entry).toEqual("");
      expect(empty.newest_entry).toEqual("");
      loggingEngine.info("ns", "first");
      loggingEngine.info("ns", "second");
      const s = loggingEngine.stats();
      expect(s.oldest_entry.length > 0).toEqual(true);
      expect(s.newest_entry.length > 0).toEqual(true);
    });
  });

  describe("getConfig / configure", () => {
    it("getConfig returns the current config (defaults after beforeEach reset)", () => {
      const cfg = loggingEngine.getConfig();
      expect(cfg.min_level).toEqual("info");
      expect(cfg.max_entries).toEqual(10000);
      expect(cfg.namespaces_enabled).toEqual([]);
      expect(cfg.namespaces_disabled).toEqual([]);
    });

    it("configure applies a partial update and returns the merged config", () => {
      const merged = loggingEngine.configure({ min_level: "error" });
      expect(merged.min_level).toEqual("error");
      expect(merged.max_entries).toEqual(10000); // unchanged
      expect(loggingEngine.getConfig().min_level).toEqual("error");
    });

    it("getConfig returns a copy — mutating it does not affect the engine", () => {
      const cfg = loggingEngine.getConfig();
      cfg.min_level = "fatal";
      expect(loggingEngine.getConfig().min_level).toEqual("info");
    });
  });

  describe("rotation — max_entries cap", () => {
    it("evicts oldest entries once max_entries is exceeded (ring buffer)", () => {
      loggingEngine.configure({ min_level: "trace", max_entries: 3 });
      for (let i = 1; i <= 5; i++) loggingEngine.log("info", "ns", `msg-${i}`);
      const all = loggingEngine.query({ limit: 100 });
      expect(all.length).toEqual(3);
      // Oldest two (msg-1, msg-2) evicted; msg-3..5 remain.
      expect(all.map((e) => e.message)).toEqual(["msg-3", "msg-4", "msg-5"]);
    });
  });

  describe("adversarial inputs", () => {
    it("handles an empty message string", () => {
      const entry = loggingEngine.info("ns", "");
      expect(entry?.message).toEqual("");
    });

    it("handles a deeply nested context object", () => {
      const ctx = { a: { b: { c: [1, 2, 3] } } };
      const entry = loggingEngine.error("ns", "deep", ctx);
      expect(entry?.context).toEqual(ctx);
    });

    it("query with limit larger than entry count returns the whole buffer", () => {
      loggingEngine.info("ns", "only");
      expect(loggingEngine.query({ limit: 9999 }).length).toEqual(1);
    });

    it("query for a namespace with no entries returns an empty array", () => {
      loggingEngine.info("real", "x");
      expect(loggingEngine.query({ namespace: "ghost" })).toEqual([]);
    });
  });

  describe("class export — multi-instance isolation", () => {
    it("a new LoggingEngine instance keeps its own entry buffer", () => {
      const local = new LoggingEngine();
      local.configure({ min_level: "trace" });
      local.info("local-ns", "isolated");
      expect(local.stats().total_entries).toEqual(1);
      // Singleton was cleared in beforeEach and never got this entry.
      expect(loggingEngine.stats().total_entries).toEqual(0);
    });
  });
});
