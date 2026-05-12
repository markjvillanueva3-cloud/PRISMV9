/**
 * PPG-REAL S6a U-PPR23: PRISM Physics Bridge tests.
 * Validates: HTTP bridge structure, payload format, response parsing,
 * graceful offline handling, retry logic, NaN guards, comment JSON format.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const BRIDGE_PATH = path.resolve(
  __dirname,
  "../../scripts/fusion360-prism-addin/prism_bridge.py"
);

const bridgeContent = fs.readFileSync(BRIDGE_PATH, "utf-8");

describe("U-PPR23: PRISM Physics Bridge module structure", () => {
  it("prism_bridge.py exists and is substantial", () => {
    expect(fs.existsSync(BRIDGE_PATH)).toBe(true);
    expect(bridgeContent.length).toBeGreaterThan(3000);
  });

  it("defines PRISMPhysicsBridge class", () => {
    expect(bridgeContent).toContain("class PRISMPhysicsBridge");
  });

  it("defines PhysicsSFResult class", () => {
    expect(bridgeContent).toContain("class PhysicsSFResult");
  });

  it("defines BatchSFResult class", () => {
    expect(bridgeContent).toContain("class BatchSFResult");
  });
});

describe("U-PPR23: Server communication", () => {
  it("uses urllib (Python stdlib, not requests — Fusion 360 sandbox)", () => {
    expect(bridgeContent).toContain("import urllib.request");
    expect(bridgeContent).toContain("import urllib.error");
    // Must NOT use 'requests' which isn't in Fusion 360's Python
    const importLines = bridgeContent
      .split("\n")
      .filter((l) => l.startsWith("import ") || l.startsWith("from "));
    const usesRequests = importLines.some(
      (l) => l.includes("import requests") && !l.includes("#")
    );
    expect(usesRequests).toBe(false);
  });

  it("targets PPG pipeline endpoint", () => {
    expect(bridgeContent).toContain("/ppg/pipeline");
  });

  it("sends tool geometry in payload", () => {
    expect(bridgeContent).toContain("diameter_mm");
    expect(bridgeContent).toContain("flutes");
    expect(bridgeContent).toContain("tool_material");
    expect(bridgeContent).toContain("coating");
  });

  it("sends workpiece material with ISO group", () => {
    expect(bridgeContent).toContain("iso_group");
    expect(bridgeContent).toContain("mat_name");
  });

  it("sends operation context (type, ap, ae)", () => {
    expect(bridgeContent).toContain("op_type");
    expect(bridgeContent).toContain("ap_mm");
    expect(bridgeContent).toContain("ae_mm");
  });

  it("sends machine context (model, max_rpm)", () => {
    expect(bridgeContent).toContain("machine_name");
    expect(bridgeContent).toContain("max_rpm");
    expect(bridgeContent).toContain("max_power");
  });

  it("receives RPM, feed, force, power, confidence, tool_life", () => {
    expect(bridgeContent).toContain('"rpm"');
    expect(bridgeContent).toContain("feed_mmmin");
    expect(bridgeContent).toContain("force_N");
    expect(bridgeContent).toContain("power_kW");
    expect(bridgeContent).toContain("confidence");
    expect(bridgeContent).toContain("tool_life_min");
  });

  it("receives stable_rpm_range", () => {
    expect(bridgeContent).toContain("stable_rpm_range");
    expect(bridgeContent).toContain("stable_rpm_min");
    expect(bridgeContent).toContain("stable_rpm_max");
  });
});

describe("U-PPR23: Graceful offline handling", () => {
  it("has is_available() health check", () => {
    expect(bridgeContent).toContain("def is_available(self)");
    expect(bridgeContent).toContain("/health");
  });

  it("returns None on server unavailable (graceful skip)", () => {
    expect(bridgeContent).toContain("return None");
    // compute_physics_sf returns None if server is down
    const computeMethod = bridgeContent.substring(
      bridgeContent.indexOf("def compute_physics_sf"),
      bridgeContent.indexOf("def compute_batch_sf")
    );
    expect(computeMethod).toContain("if not self.is_available()");
    expect(computeMethod).toContain("return None");
  });

  it("caches health check results for 30 seconds", () => {
    expect(bridgeContent).toContain("_last_health_check");
    expect(bridgeContent).toContain("30");
    expect(bridgeContent).toContain("_server_ok");
  });
});

describe("U-PPR23: Timeout and retry", () => {
  it("configures 5-second timeout", () => {
    expect(bridgeContent).toContain("TIMEOUT_SECONDS = 5");
  });

  it("retries once on transient failure", () => {
    expect(bridgeContent).toContain("MAX_RETRIES = 1");
    expect(bridgeContent).toContain("_post_with_retry");
    // Verify retry loop exists
    expect(bridgeContent).toContain("for attempt in range(MAX_RETRIES + 1)");
  });

  it("does NOT retry on 4xx client errors", () => {
    expect(bridgeContent).toContain("e.code < 500");
    expect(bridgeContent).toContain("no retry");
  });

  it("has retry delay between attempts", () => {
    expect(bridgeContent).toContain("RETRY_DELAY_SECONDS");
    expect(bridgeContent).toContain("time.sleep(RETRY_DELAY_SECONDS)");
  });
});

describe("U-PPR23: Version check", () => {
  it("checks server version on health check", () => {
    expect(bridgeContent).toContain("_server_version");
    expect(bridgeContent).toContain("get_server_version");
  });

  it("defines minimum server version", () => {
    expect(bridgeContent).toContain('MIN_SERVER_VERSION = "1.0.0"');
  });
});

describe("U-PPR23: NaN/Infinity guards", () => {
  it("has _safe_numeric helper for response parsing", () => {
    expect(bridgeContent).toContain("def _safe_numeric");
  });

  it("guards against NaN", () => {
    expect(bridgeContent).toContain("f != f");  // NaN self-comparison trick
  });

  it("guards against Infinity", () => {
    expect(bridgeContent).toContain('float("inf")');
    expect(bridgeContent).toContain('float("-inf")');
  });
});

describe("U-PPR23: Comment JSON format", () => {
  it("generates PRISM comment JSON for CPS parsePrismComment()", () => {
    expect(bridgeContent).toContain("to_comment_json");
    expect(bridgeContent).toContain('{"prism":');
  });

  it("includes force, power, confidence in comment JSON", () => {
    const jsonMethod = bridgeContent.substring(
      bridgeContent.indexOf("def to_comment_json"),
      bridgeContent.indexOf("def __repr__")
    );
    expect(jsonMethod).toContain('"force"');
    expect(jsonMethod).toContain('"power"');
    expect(jsonMethod).toContain('"confidence"');
    expect(jsonMethod).toContain('"tool_life_min"');
  });

  it("includes stable RPM range in comment JSON", () => {
    expect(bridgeContent).toContain('"stable_rpm_min"');
    expect(bridgeContent).toContain('"stable_rpm_max"');
  });
});

describe("U-PPR23: X-PRISM-Client header", () => {
  it("identifies as Fusion 360 add-in in request headers", () => {
    expect(bridgeContent).toContain("X-PRISM-Client");
    expect(bridgeContent).toContain("fusion360-addin");
  });
});
