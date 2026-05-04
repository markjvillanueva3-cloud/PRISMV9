/**
 * HyperMillACServerConfig tests — CAM-EXHAUST-MS0 / U-CAM-HM-ACSRV-TESTS-01
 *
 * Coverage:
 *   1. Constants: AC_SERVER_DEFAULT_PORT=18365, BIND_HOST=127.0.0.1, etc.
 *   2. AC_ROUTES: 5 canonical routes (/status, /execute, /job-status, /extract, /optimize)
 *   3. DEFAULT_AC_CORS_CONFIG: hyperCAD-S panel origins only
 *   4. buildACServerConfig(): defaults + override merging
 *   5. validateACServerConfig(): rejects 0.0.0.0, port out-of-range, timeout out-of-range
 *   6. describeACServerConfig(): summary contains key fields
 *   7. DEFAULT_AC_SERVER_CONFIG: production sentinel
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  AC_SERVER_DEFAULT_PORT,
  AC_SERVER_BIND_HOST,
  AC_SERVER_DEFAULT_TIMEOUT_MS,
  AC_SERVER_MAX_CONCURRENT,
  AC_ROUTES,
  DEFAULT_AC_CORS_CONFIG,
  DEFAULT_AC_SERVER_CONFIG,
  buildACServerConfig,
  validateACServerConfig,
  describeACServerConfig,
  type ACServerConfig,
} from "../engines/HyperMillACServerConfig.js";

const EXPECTED_PORT = 18365;
const EXPECTED_HOST = "127.0.0.1";
const EXPECTED_TIMEOUT_MS = 30_000;
const EXPECTED_MAX_CONCURRENT = 4;
const PORT_MIN = 1024;
const PORT_MAX = 65535;
const TIMEOUT_MIN_MS = 1000;
const TIMEOUT_MAX_MS = 300_000;

describe("HyperMillACServerConfig — module constants", () => {
  it("AC_SERVER_DEFAULT_PORT = 18365 (matches HyperMillACBridgeEngine)", () => {
    expect(AC_SERVER_DEFAULT_PORT).toBe(EXPECTED_PORT);
  });

  it("AC_SERVER_BIND_HOST = 127.0.0.1 (loopback-only — security invariant)", () => {
    expect(AC_SERVER_BIND_HOST).toBe(EXPECTED_HOST);
  });

  it("AC_SERVER_DEFAULT_TIMEOUT_MS = 30000", () => {
    expect(AC_SERVER_DEFAULT_TIMEOUT_MS).toBe(EXPECTED_TIMEOUT_MS);
  });

  it("AC_SERVER_MAX_CONCURRENT = 4", () => {
    expect(AC_SERVER_MAX_CONCURRENT).toBe(EXPECTED_MAX_CONCURRENT);
  });
});

describe("HyperMillACServerConfig — AC_ROUTES", () => {
  it("contains 5 canonical routes", () => {
    expect(Object.keys(AC_ROUTES).length).toBe(5);
  });

  it("STATUS = /status, EXECUTE = /execute, JOB_STATUS = /job-status", () => {
    expect(AC_ROUTES.STATUS).toBe("/status");
    expect(AC_ROUTES.EXECUTE).toBe("/execute");
    expect(AC_ROUTES.JOB_STATUS).toBe("/job-status");
  });

  it("EXTRACT = /extract, OPTIMIZE = /optimize", () => {
    expect(AC_ROUTES.EXTRACT).toBe("/extract");
    expect(AC_ROUTES.OPTIMIZE).toBe("/optimize");
  });

  it("all route values start with /", () => {
    Object.values(AC_ROUTES).forEach((r) => {
      expect(r.startsWith("/")).toBe(true);
    });
  });
});

describe("HyperMillACServerConfig — DEFAULT_AC_CORS_CONFIG", () => {
  it("allows hyperCAD-S dev server (localhost:3000) and file:// origin (null)", () => {
    expect(DEFAULT_AC_CORS_CONFIG.allowedOrigins).toContain("http://localhost:3000");
    expect(DEFAULT_AC_CORS_CONFIG.allowedOrigins).toContain("http://127.0.0.1:3000");
    expect(DEFAULT_AC_CORS_CONFIG.allowedOrigins).toContain("null");
  });

  it("does NOT allow wildcard (*) origin (security invariant)", () => {
    expect(DEFAULT_AC_CORS_CONFIG.allowedOrigins).not.toContain("*");
  });

  it("allowed methods are GET / POST / OPTIONS only", () => {
    expect([...DEFAULT_AC_CORS_CONFIG.allowedMethods].sort()).toEqual(["GET", "OPTIONS", "POST"]);
  });

  it("includes X-PRISM-Client + X-AC-Session custom headers", () => {
    expect(DEFAULT_AC_CORS_CONFIG.allowedHeaders).toContain("X-PRISM-Client");
    expect(DEFAULT_AC_CORS_CONFIG.allowedHeaders).toContain("X-AC-Session");
  });

  it("preflight cache = 600 seconds (10 minutes)", () => {
    expect(DEFAULT_AC_CORS_CONFIG.maxAgeSecs).toBe(600);
  });
});

describe("HyperMillACServerConfig — buildACServerConfig()", () => {
  it("returns canonical defaults when called with no overrides", () => {
    const cfg = buildACServerConfig();
    expect(cfg.host).toBe(EXPECTED_HOST);
    expect(cfg.port).toBe(EXPECTED_PORT);
    expect(cfg.timeoutMs).toBe(EXPECTED_TIMEOUT_MS);
    expect(cfg.maxConcurrent).toBe(EXPECTED_MAX_CONCURRENT);
    expect(cfg.mockMode).toBe(false);
    expect(cfg.accessLogPath).toBe(null);
    expect(cfg.cors).toBe(DEFAULT_AC_CORS_CONFIG);
  });

  it("override port", () => {
    const cfg = buildACServerConfig({ port: 19999 });
    expect(cfg.port).toBe(19999);
    expect(cfg.host).toBe(EXPECTED_HOST); // unchanged
  });

  it("override timeoutMs + maxConcurrent", () => {
    const cfg = buildACServerConfig({ timeoutMs: 60_000, maxConcurrent: 8 });
    expect(cfg.timeoutMs).toBe(60_000);
    expect(cfg.maxConcurrent).toBe(8);
  });

  it("override mockMode", () => {
    const cfg = buildACServerConfig({ mockMode: true });
    expect(cfg.mockMode).toBe(true);
  });

  it("override accessLogPath", () => {
    const cfg = buildACServerConfig({ accessLogPath: "/var/log/ac-server.log" });
    expect(cfg.accessLogPath).toBe("/var/log/ac-server.log");
  });

  it("override cors with custom config", () => {
    const customCors = {
      allowedOrigins: ["http://custom"],
      allowedMethods: ["GET"],
      allowedHeaders: ["Content-Type"],
      maxAgeSecs: 60,
    };
    const cfg = buildACServerConfig({ cors: customCors });
    expect(cfg.cors).toBe(customCors);
  });
});

describe("HyperMillACServerConfig — validateACServerConfig()", () => {
  it("returns empty array for default config (valid)", () => {
    const errors = validateACServerConfig(buildACServerConfig());
    expect(errors).toEqual([]);
  });

  it("rejects host = 0.0.0.0 (network exposure security violation)", () => {
    const cfg: ACServerConfig = { ...buildACServerConfig(), host: "0.0.0.0" };
    const errors = validateACServerConfig(cfg);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("Security violation");
    expect(errors[0]).toContain("loopback-only");
  });

  it("accepts 'localhost' as a valid alias for 127.0.0.1", () => {
    const cfg: ACServerConfig = { ...buildACServerConfig(), host: "localhost" };
    const errors = validateACServerConfig(cfg);
    expect(errors.filter((e) => e.includes("Security"))).toEqual([]);
  });

  it("rejects port < 1024 (privileged range)", () => {
    const cfg: ACServerConfig = { ...buildACServerConfig(), port: 80 };
    const errors = validateACServerConfig(cfg);
    expect(errors.some((e) => e.includes("Port"))).toBe(true);
  });

  it("rejects port > 65535 (out of range)", () => {
    const cfg: ACServerConfig = { ...buildACServerConfig(), port: 99999 };
    const errors = validateACServerConfig(cfg);
    expect(errors.some((e) => e.includes("Port"))).toBe(true);
  });

  it("accepts port at min boundary (1024)", () => {
    const cfg: ACServerConfig = { ...buildACServerConfig(), port: PORT_MIN };
    expect(validateACServerConfig(cfg).filter((e) => e.includes("Port"))).toEqual([]);
  });

  it("accepts port at max boundary (65535)", () => {
    const cfg: ACServerConfig = { ...buildACServerConfig(), port: PORT_MAX };
    expect(validateACServerConfig(cfg).filter((e) => e.includes("Port"))).toEqual([]);
  });

  it("rejects timeoutMs < 1000", () => {
    const cfg: ACServerConfig = { ...buildACServerConfig(), timeoutMs: 500 };
    expect(validateACServerConfig(cfg).some((e) => e.includes("timeoutMs"))).toBe(true);
  });

  it("rejects timeoutMs > 300000 (5 minutes)", () => {
    const cfg: ACServerConfig = { ...buildACServerConfig(), timeoutMs: 600_000 };
    expect(validateACServerConfig(cfg).some((e) => e.includes("timeoutMs"))).toBe(true);
  });

  it("accepts timeout at min/max boundaries", () => {
    const min: ACServerConfig = { ...buildACServerConfig(), timeoutMs: TIMEOUT_MIN_MS };
    const max: ACServerConfig = { ...buildACServerConfig(), timeoutMs: TIMEOUT_MAX_MS };
    expect(validateACServerConfig(min).filter((e) => e.includes("timeoutMs"))).toEqual([]);
    expect(validateACServerConfig(max).filter((e) => e.includes("timeoutMs"))).toEqual([]);
  });

  it("rejects maxConcurrent < 1 or > 16", () => {
    const low: ACServerConfig = { ...buildACServerConfig(), maxConcurrent: 0 };
    const high: ACServerConfig = { ...buildACServerConfig(), maxConcurrent: 32 };
    expect(validateACServerConfig(low).some((e) => e.includes("maxConcurrent"))).toBe(true);
    expect(validateACServerConfig(high).some((e) => e.includes("maxConcurrent"))).toBe(true);
  });

  it("multiple violations all surface in error array", () => {
    const cfg: ACServerConfig = { ...buildACServerConfig(), host: "0.0.0.0", port: 80, timeoutMs: 100 };
    const errors = validateACServerConfig(cfg);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("HyperMillACServerConfig — describeACServerConfig()", () => {
  it("includes bind, timeout, concurrent, mock mode, routes, CORS in summary", () => {
    const summary = describeACServerConfig(buildACServerConfig());
    expect(summary).toContain("AC Companion Server");
    expect(summary).toContain(`${EXPECTED_HOST}:${EXPECTED_PORT}`);
    expect(summary).toContain(`${EXPECTED_TIMEOUT_MS}ms`);
    expect(summary).toContain(`${EXPECTED_MAX_CONCURRENT} max`);
    expect(summary).toContain("Mock mode:   false");
    expect(summary).toContain("/status");
    expect(summary).toContain("/execute");
  });

  it("reflects mockMode override in summary", () => {
    const summary = describeACServerConfig(buildACServerConfig({ mockMode: true }));
    expect(summary).toContain("Mock mode:   true");
  });
});

describe("HyperMillACServerConfig — DEFAULT_AC_SERVER_CONFIG", () => {
  it("matches buildACServerConfig() output", () => {
    const fresh = buildACServerConfig();
    expect(DEFAULT_AC_SERVER_CONFIG.host).toBe(fresh.host);
    expect(DEFAULT_AC_SERVER_CONFIG.port).toBe(fresh.port);
    expect(DEFAULT_AC_SERVER_CONFIG.timeoutMs).toBe(fresh.timeoutMs);
    expect(DEFAULT_AC_SERVER_CONFIG.maxConcurrent).toBe(fresh.maxConcurrent);
  });

  it("passes validateACServerConfig with no errors", () => {
    expect(validateACServerConfig(DEFAULT_AC_SERVER_CONFIG)).toEqual([]);
  });
});

describe("HyperMillACServerConfig — dispatcher wiring (camDispatcher.ts)", () => {
  const ACSRV_ACTIONS = [
    "cam_hypermill_ac_server_build_config",
    "cam_hypermill_ac_server_validate_config",
    "cam_hypermill_ac_server_describe_config",
    "cam_hypermill_ac_server_get_defaults",
  ] as const;

  const ACTION_COUNT_EXPECTED = 4;

  const dispatcherPath = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

  const readDispatcher = async (): Promise<string> => {
    const fs = await import("node:fs/promises");
    return fs.readFile(dispatcherPath, "utf-8");
  };

  it("registers all 4 cam_hypermill_ac_server_* enum entries", async () => {
    const src = await readDispatcher();
    expect(ACSRV_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of ACSRV_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares matching case statements for every action", async () => {
    const src = await readDispatcher();
    for (const action of ACSRV_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("imports buildACServerConfig from the canonical engine path in build_config case", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_ac_server_build_config"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("buildACServerConfig");
    expect(body).toContain('"../../engines/HyperMillACServerConfig.js"');
    expect(body).toMatch(/params\.overrides/);
  });

  it("validate_config case calls validateACServerConfig and reports valid + errorCount", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_ac_server_validate_config"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("validateACServerConfig");
    expect(body).toContain("valid");
    expect(body).toContain("errorCount");
    expect(body).toMatch(/errors\.length\s*===\s*0/);
  });

  it("describe_config case calls describeACServerConfig and returns description string", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_ac_server_describe_config"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("describeACServerConfig");
    expect(body).toContain("description");
  });

  it("get_defaults case surfaces canonical constants (port, host, routes, corsDefaults)", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_ac_server_get_defaults"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("DEFAULT_AC_SERVER_CONFIG");
    expect(body).toContain("AC_SERVER_DEFAULT_PORT");
    expect(body).toContain("AC_SERVER_BIND_HOST");
    expect(body).toContain("AC_ROUTES");
    expect(body).toContain("DEFAULT_AC_CORS_CONFIG");
  });

  it("validate_config case rebuilds via buildACServerConfig (sanitises arbitrary params.config input)", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_ac_server_validate_config"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("buildACServerConfig");
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    for (const action of ACSRV_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("build_config case rejects non-object overrides (typeof guard against array/null/string)", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_ac_server_build_config"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toMatch(/typeof\s+params\.overrides\s*===\s*"object"/);
  });

  it("get_defaults case wires AC_SERVER_DEFAULT_TIMEOUT_MS and AC_SERVER_MAX_CONCURRENT", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_ac_server_get_defaults"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("AC_SERVER_DEFAULT_TIMEOUT_MS");
    expect(body).toContain("AC_SERVER_MAX_CONCURRENT");
  });
});
