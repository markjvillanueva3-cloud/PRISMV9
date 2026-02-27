/**
 * L2-P3-MS1: 16 Infrastructure Engine Tests
 * Smoke tests for all 16 new engines: singletons, core operations, API shape.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  authEngine,
  tenantEngine,
  rateLimitEngine,
  cacheEngine,
  queueEngine,
  eventEngine,
  loggingEngine,
  metricsEngine,
  healthEngine,
  configEngine,
  migrationEngine,
  notificationEngine,
  webhookEngine,
  auditEngine,
  exportEngine,
  pluginEngine,
} from "../engines/index.js";

// ============================================================================
// 1. AuthEngine — SECURITY CRITICAL
// ============================================================================
describe("AuthEngine (SECURITY)", () => {
  it("singleton exists", () => expect(authEngine).toBeDefined());
  it("registers and logs in", () => {
    const reg = authEngine.register("testuser_auth", "securePass123!", ["operator"]);
    expect(reg.success).toBe(true);
    expect(reg.user_id).toBeDefined();

    const login = authEngine.login("testuser_auth", "securePass123!");
    expect(login.success).toBe(true);
    expect(login.token).toBeDefined();
    expect(login.token!.token_type).toBe("Bearer");
    expect(login.token!.expires_in_sec).toBe(3600);
  });
  it("rejects wrong password", () => {
    const login = authEngine.login("testuser_auth", "wrongPass");
    expect(login.success).toBe(false);
    expect(login.error).toContain("Invalid");
  });
  it("checks permissions", () => {
    const reg = authEngine.register("permuser", "securePass123!", ["programmer"]);
    const check = authEngine.checkPermission(reg.user_id!, "program:create");
    expect(check.allowed).toBe(true);

    const noAccess = authEngine.checkPermission(reg.user_id!, "admin:delete");
    expect(noAccess.allowed).toBe(false);
  });
  it("lists roles", () => {
    expect(authEngine.getRoles().length).toBeGreaterThanOrEqual(7);
  });
});

// ============================================================================
// 2. TenantEngine
// ============================================================================
describe("TenantEngine", () => {
  beforeEach(() => tenantEngine.clear());
  it("singleton exists", () => expect(tenantEngine).toBeDefined());
  it("creates and retrieves tenant", () => {
    const t = tenantEngine.create({ name: "Acme CNC", owner_user_id: "USR-001", plan: "professional" });
    expect(t.id).toContain("TNT-");
    expect(t.plan).toBe("professional");
    expect(t.quota.max_users).toBe(25);

    const got = tenantEngine.get(t.id);
    expect(got!.name).toBe("Acme CNC");
  });
  it("checks quota", () => {
    const t = tenantEngine.create({ name: "Small Shop", owner_user_id: "USR-002", plan: "free" });
    const quota = tenantEngine.checkQuota(t.id, "max_users");
    expect(quota.within_quota).toBe(true);
    expect(quota.limit).toBe(2);
  });
  it("tracks stats", () => {
    tenantEngine.create({ name: "T1", owner_user_id: "U1" });
    tenantEngine.create({ name: "T2", owner_user_id: "U2", plan: "enterprise" });
    const stats = tenantEngine.getStats();
    expect(stats.total).toBe(2);
    expect(stats.by_plan.free).toBe(1);
    expect(stats.by_plan.enterprise).toBe(1);
  });
});

// ============================================================================
// 3. RateLimitEngine — SECURITY
// ============================================================================
describe("RateLimitEngine (SECURITY)", () => {
  beforeEach(() => rateLimitEngine.clear());
  it("singleton exists", () => expect(rateLimitEngine).toBeDefined());
  it("allows within limit", () => {
    const check = rateLimitEngine.check("RL-API-USER", "user123");
    expect(check.allowed).toBe(true);
    expect(check.remaining).toBeGreaterThan(0);
  });
  it("consumes tokens", () => {
    const first = rateLimitEngine.consume("RL-API-USER", "user456");
    expect(first.allowed).toBe(true);
    const remaining = first.remaining;
    const second = rateLimitEngine.consume("RL-API-USER", "user456");
    expect(second.remaining).toBeLessThan(remaining);
  });
  it("lists default rules", () => {
    expect(rateLimitEngine.listRules().length).toBeGreaterThanOrEqual(5);
  });
});

// ============================================================================
// 4. CacheEngine
// ============================================================================
describe("CacheEngine", () => {
  beforeEach(() => cacheEngine.clearAll());
  it("singleton exists", () => expect(cacheEngine).toBeDefined());
  it("sets and gets values", () => {
    cacheEngine.set("key1", { data: 42 });
    expect(cacheEngine.get("key1")).toEqual({ data: 42 });
    expect(cacheEngine.has("key1")).toBe(true);
  });
  it("tracks hit/miss", () => {
    cacheEngine.set("hit", "value");
    cacheEngine.get("hit");
    cacheEngine.get("miss");
    const stats = cacheEngine.stats();
    expect(stats.hit_count).toBe(1);
    expect(stats.miss_count).toBe(1);
    expect(stats.hit_rate_pct).toBe(50);
  });
  it("supports namespaces", () => {
    cacheEngine.set("key", "a", "ns1");
    cacheEngine.set("key", "b", "ns2");
    expect(cacheEngine.get("key", "ns1")).toBe("a");
    expect(cacheEngine.get("key", "ns2")).toBe("b");
  });
});

// ============================================================================
// 5. QueueEngine
// ============================================================================
describe("QueueEngine", () => {
  beforeEach(() => queueEngine.clear());
  it("singleton exists", () => expect(queueEngine).toBeDefined());
  it("enqueues and dequeues", () => {
    queueEngine.enqueue("machining", { part: "bracket" });
    queueEngine.enqueue("machining", { part: "shaft" }, { priority: "high" });
    const job = queueEngine.dequeue("machining");
    expect(job).toBeDefined();
    expect(job!.payload).toEqual({ part: "shaft" }); // high priority first
    expect(job!.status).toBe("processing");
  });
  it("completes and tracks stats", () => {
    const job = queueEngine.enqueue("test-q", { x: 1 });
    const dequeued = queueEngine.dequeue("test-q");
    queueEngine.complete(dequeued!.id, { result: "ok" });
    const stats = queueEngine.stats("test-q");
    expect(stats.completed).toBe(1);
  });
});

// ============================================================================
// 6. EventEngine
// ============================================================================
describe("EventEngine", () => {
  beforeEach(() => eventEngine.clear());
  it("singleton exists", () => expect(eventEngine).toBeDefined());
  it("emits and subscribes", () => {
    let received: unknown = null;
    eventEngine.subscribe("machine.*", "test-sub", (evt) => { received = evt.payload; });
    eventEngine.emit("machine.start", { id: "CNC-1" }, "test");
    expect(received).toEqual({ id: "CNC-1" });
  });
  it("tracks history", () => {
    eventEngine.emit("alarm.triggered", { code: 100 });
    eventEngine.emit("alarm.cleared", { code: 100 });
    const history = eventEngine.getHistory("alarm.*");
    expect(history.length).toBe(2);
  });
  it("reports stats", () => {
    eventEngine.emit("t1", {});
    eventEngine.emit("t2", {});
    const stats = eventEngine.stats();
    expect(stats.total_emitted).toBe(2);
    expect(stats.topics.length).toBe(2);
  });
});

// ============================================================================
// 7. LoggingEngine
// ============================================================================
describe("LoggingEngine", () => {
  beforeEach(() => loggingEngine.clear());
  it("singleton exists", () => expect(loggingEngine).toBeDefined());
  it("logs and queries", () => {
    loggingEngine.info("test", "Boot complete");
    loggingEngine.error("test", "Something failed", { code: 500 });
    const all = loggingEngine.query({ namespace: "test" });
    expect(all.length).toBe(2);
    const errors = loggingEngine.query({ level: "error" });
    expect(errors.length).toBe(1);
  });
  it("reports stats", () => {
    loggingEngine.warn("a", "w1");
    loggingEngine.error("b", "e1");
    const stats = loggingEngine.stats();
    expect(stats.by_level.warn).toBe(1);
    expect(stats.by_level.error).toBe(1);
  });
});

// ============================================================================
// 8. MetricsEngine
// ============================================================================
describe("MetricsEngine", () => {
  beforeEach(() => metricsEngine.reset());
  it("singleton exists", () => expect(metricsEngine).toBeDefined());
  it("increments counters", () => {
    metricsEngine.increment("api_calls", 1, { endpoint: "/calc" });
    metricsEngine.increment("api_calls", 1, { endpoint: "/calc" });
    expect(metricsEngine.getCounter("api_calls", { endpoint: "/calc" })).toBe(2);
  });
  it("records gauges", () => {
    metricsEngine.gauge("cpu_usage", 73.5);
    expect(metricsEngine.getGauge("cpu_usage")).toBe(73.5);
  });
  it("observes histograms", () => {
    for (let i = 0; i < 100; i++) metricsEngine.observe("latency", i * 0.01);
    const h = metricsEngine.getHistogram("latency");
    expect(h.count).toBe(100);
    expect(h.p50).toBeGreaterThan(0);
    expect(h.p99).toBeGreaterThan(h.p50);
  });
  it("exports all metrics", () => {
    metricsEngine.increment("requests");
    metricsEngine.gauge("temp", 42);
    const exp = metricsEngine.export();
    expect(exp.total_metrics).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// 9. HealthEngine
// ============================================================================
describe("HealthEngine", () => {
  beforeEach(() => healthEngine.clear());
  it("singleton exists", () => expect(healthEngine).toBeDefined());
  it("reports liveness", () => {
    const live = healthEngine.liveness();
    expect(live.alive).toBe(true);
    expect(live.uptime_sec).toBeGreaterThanOrEqual(0);
  });
  it("checks registered components", () => {
    healthEngine.registerComponent("database", () => ({ status: "healthy", message: "Connected" }));
    healthEngine.registerComponent("cache", () => ({ status: "healthy" }));
    const check = healthEngine.check();
    expect(check.status).toBe("healthy");
    expect(check.checks_passed).toBe(2);
    expect(check.score_pct).toBe(100);
  });
  it("reports degraded when component fails", () => {
    healthEngine.registerComponent("ok1", () => ({ status: "healthy" }));
    healthEngine.registerComponent("ok2", () => ({ status: "healthy" }));
    healthEngine.registerComponent("bad", () => ({ status: "unhealthy", message: "down" }));
    const check = healthEngine.check();
    // 1 of 3 failed = 33% < 50% → degraded
    expect(check.status).toBe("degraded");
    expect(check.checks_failed).toBe(1);
  });
});

// ============================================================================
// 10. ConfigEngine
// ============================================================================
describe("ConfigEngine", () => {
  beforeEach(() => configEngine.clear());
  it("singleton exists", () => expect(configEngine).toBeDefined());
  it("sets and gets config", () => {
    configEngine.set("db.host", "localhost", "default");
    configEngine.set("db.host", "prod-db.internal", "env");
    expect(configEngine.get("db.host")).toBe("prod-db.internal"); // env > default
  });
  it("validates required fields", () => {
    configEngine.set("api.key", "", "default", { required: true });
    const v = configEngine.validate();
    expect(v.valid).toBe(false);
    expect(v.missing_required.length).toBe(1);
  });
  it("exports with redaction", () => {
    configEngine.set("db.password", "s3cret", "runtime", { secret: true });
    configEngine.set("db.host", "localhost");
    const exp = configEngine.exportConfig(false);
    expect(exp["db.password"]).toBe("***REDACTED***");
    expect(exp["db.host"]).toBe("localhost");
  });
});

// ============================================================================
// 11. MigrationEngine
// ============================================================================
describe("MigrationEngine", () => {
  beforeEach(() => migrationEngine.clear());
  it("singleton exists", () => expect(migrationEngine).toBeDefined());
  it("registers and applies migrations", () => {
    migrationEngine.register({
      id: "M1", version: "1.0.0", name: "Initial schema",
      description: "Create tables",
      up: () => ({ success: true, changes: ["Created users table"] }),
      down: () => ({ success: true, changes: ["Dropped users table"] }),
    });
    migrationEngine.register({
      id: "M2", version: "1.1.0", name: "Add indexes",
      description: "Add performance indexes",
      up: () => ({ success: true, changes: ["Added idx_users_email"] }),
      down: () => ({ success: true, changes: ["Dropped idx_users_email"] }),
    });

    const results = migrationEngine.apply();
    expect(results.length).toBe(2);
    expect(results[0].status).toBe("applied");
    expect(results[1].status).toBe("applied");

    const status = migrationEngine.status();
    expect(status.applied.length).toBe(2);
    expect(status.pending.length).toBe(0);
    expect(status.current_version).toBe("1.1.0");
  });
  it("rolls back", () => {
    migrationEngine.register({
      id: "M1", version: "1.0.0", name: "Init",
      description: "",
      up: () => ({ success: true, changes: ["up"] }),
      down: () => ({ success: true, changes: ["down"] }),
    });
    migrationEngine.apply();
    const rollback = migrationEngine.rollback();
    expect(rollback.length).toBe(1);
    expect(rollback[0].status).toBe("rolled_back");
  });
});

// ============================================================================
// 12. NotificationEngine
// ============================================================================
describe("NotificationEngine", () => {
  beforeEach(() => notificationEngine.clear());
  it("singleton exists", () => expect(notificationEngine).toBeDefined());
  it("sends and lists", () => {
    notificationEngine.send("user1", "Alert", "Machine CNC-1 stopped", { channel: "in_app", priority: "high" });
    notificationEngine.send("user1", "Info", "Job complete");
    const list = notificationEngine.list("user1");
    expect(list.length).toBe(2);
    const priorities = list.map(n => n.priority).sort();
    expect(priorities).toEqual(["high", "normal"]);
  });
  it("marks as read", () => {
    const n = notificationEngine.send("user2", "Test", "Body");
    notificationEngine.markRead(n.id);
    const unread = notificationEngine.list("user2", true);
    expect(unread.length).toBe(0);
  });
  it("templates", () => {
    notificationEngine.registerTemplate({
      id: "TPL-1", name: "Alarm", channel: "email",
      subject_template: "ALARM: {{machine}}", body_template: "Machine {{machine}} triggered alarm {{code}}",
    });
    const n = notificationEngine.send("user3", "", "", {
      template_id: "TPL-1", channel: "email",
      context: { machine: "CNC-5", code: "E-100" },
    });
    expect(n.subject).toContain("CNC-5");
    expect(n.body).toContain("E-100");
  });
});

// ============================================================================
// 13. WebhookEngine
// ============================================================================
describe("WebhookEngine", () => {
  beforeEach(() => webhookEngine.clear());
  it("singleton exists", () => expect(webhookEngine).toBeDefined());
  it("registers and delivers", () => {
    const wh = webhookEngine.register("https://example.com/hook", ["job.completed", "alarm.triggered"]);
    expect(wh.id).toContain("WHK-");
    expect(wh.secret.length).toBe(64); // 32 bytes hex

    const deliveries = webhookEngine.deliver("job.completed", { job_id: "J-001" });
    expect(deliveries.length).toBe(1);
    expect(deliveries[0].success).toBe(true);
    expect(deliveries[0].signature.length).toBe(64);
  });
  it("tracks stats", () => {
    webhookEngine.register("https://a.com/hook", ["alarm.triggered"]);
    webhookEngine.deliver("alarm.triggered", { code: 100 });
    const stats = webhookEngine.stats();
    expect(stats.total_webhooks).toBe(1);
    expect(stats.total_deliveries).toBe(1);
    expect(stats.success_rate_pct).toBe(100);
  });
});

// ============================================================================
// 14. AuditEngine
// ============================================================================
describe("AuditEngine", () => {
  beforeEach(() => auditEngine.clear());
  it("singleton exists", () => expect(auditEngine).toBeDefined());
  it("logs and queries", () => {
    auditEngine.log("auth", "user.login", "admin", { ip: "10.0.0.1" });
    auditEngine.log("safety", "collision.detected", "system", { severity: "critical" }, { severity: "critical" });
    auditEngine.log("data", "program.created", "programmer1", { name: "Part-001.nc" });

    const all = auditEngine.query({});
    expect(all.length).toBe(3);

    const safety = auditEngine.query({ category: "safety" });
    expect(safety.length).toBe(1);
    expect(safety[0].action).toBe("collision.detected");
  });
  it("generates reports", () => {
    auditEngine.log("auth", "login", "user1");
    auditEngine.log("auth", "login", "user2");
    auditEngine.log("safety", "alarm", "system", {}, { severity: "critical" });

    const now = new Date();
    const report = auditEngine.report(
      new Date(now.getTime() - 60000).toISOString(),
      new Date(now.getTime() + 60000).toISOString()
    );
    expect(report.total_events).toBe(3);
    expect(report.unique_actors).toBe(3);
    expect(report.by_category.auth).toBe(2);
  });
  it("enforces sequencing", () => {
    auditEngine.log("system", "boot", "system");
    auditEngine.log("system", "ready", "system");
    expect(auditEngine.getSequence()).toBe(2);
  });
});

// ============================================================================
// 15. ExportEngine
// ============================================================================
describe("ExportEngine", () => {
  beforeEach(() => exportEngine.clear());
  it("singleton exists", () => expect(exportEngine).toBeDefined());
  it("renders CSV", () => {
    const job = exportEngine.render("csv", "Tool List", "tools", { id: "T-001", name: "EM-10", value: 25.50 });
    expect(job.status).toBe("completed");
    expect(job.output_content).toContain("id,name,value");
    expect(job.output_content).toContain("T-001");
  });
  it("renders JSON", () => {
    const job = exportEngine.render("json", "Report", "report", { total: 42 });
    expect(job.format).toBe("json");
    expect(job.output_content).toContain('"total": 42');
  });
  it("lists templates", () => {
    const templates = exportEngine.listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(4);
    expect(templates.find(t => t.format === "setup_sheet")).toBeDefined();
  });
  it("tracks stats", () => {
    exportEngine.render("csv", "A", "src", { x: 1 });
    exportEngine.render("pdf", "B", "src", { y: 2 });
    const stats = exportEngine.stats();
    expect(stats.total_exports).toBe(2);
    expect(stats.by_format.csv).toBe(1);
    expect(stats.by_format.pdf).toBe(1);
  });
});

// ============================================================================
// 16. PluginEngine
// ============================================================================
describe("PluginEngine", () => {
  beforeEach(() => pluginEngine.clear());
  it("singleton exists", () => expect(pluginEngine).toBeDefined());
  it("registers and enables plugin", () => {
    const plugin = pluginEngine.register({
      id: "plg-test", name: "Test Plugin", version: "1.0.0",
      description: "Test", author: "PRISM",
      hooks: ["pre_calculate", "post_calculate"],
    });
    expect(plugin.status).toBe("registered");

    const result = pluginEngine.enable("plg-test");
    expect(result.success).toBe(true);

    const got = pluginEngine.get("plg-test");
    expect(got!.status).toBe("enabled");
    expect(got!.hooks_registered.length).toBe(2);
  });
  it("executes hooks", () => {
    pluginEngine.registerHook("custom-plg", "pre_save", 100, (ctx) => ({ ...ctx, validated: true }));
    const result = pluginEngine.executeHook("pre_save", { data: "test" });
    expect(result.validated).toBe(true);
    expect(result.data).toBe("test");
  });
  it("detects missing dependencies", () => {
    const plugin = pluginEngine.register({
      id: "plg-dep", name: "Dep Plugin", version: "1.0.0",
      description: "Needs auth", author: "PRISM",
      dependencies: ["plg-auth-missing"],
    });
    expect(plugin.status).toBe("incompatible");
    expect(plugin.error).toContain("Missing dependencies");
  });
  it("reports stats", () => {
    pluginEngine.register({ id: "p1", name: "P1", version: "1.0.0", description: "", author: "" });
    pluginEngine.register({ id: "p2", name: "P2", version: "1.0.0", description: "", author: "" });
    pluginEngine.enable("p1");
    const stats = pluginEngine.stats();
    expect(stats.total_plugins).toBe(2);
    expect(stats.enabled).toBe(1);
  });
});
