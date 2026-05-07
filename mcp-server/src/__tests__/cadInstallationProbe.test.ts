/**
 * cadInstallationProbe.test.ts
 * ============================
 * Tests for CADInstallationProbeEngine (U-CAUT01).
 *
 * Mocks:
 *  - node:fs  (existsSync, readdirSync)
 *  - child_process execFile (via vi.mock)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock node:fs before importing the engine ─────────────────────────────────
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    readdirSync: vi.fn(() => [] as string[]),
  };
});

// ── Mock child_process execFile ───────────────────────────────────────────────
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    execFile: vi.fn(
      (
        _bin: string,
        _args: string[],
        _opts: unknown,
        cb: (err: Error | null, stdout: string, stderr: string) => void
      ) => {
        // Default: simulate "not found" (non-zero exit)
        const err = Object.assign(new Error("not found"), { code: 1 });
        cb(err, "", "ERROR: The system cannot find...");
        return { stdin: null } as unknown as ReturnType<typeof actual.execFile>;
      }
    ),
  };
});

// ── Mock logger ───────────────────────────────────────────────────────────────
vi.mock("../utils/Logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import * as fsModule from "node:fs";
import * as cpModule from "node:child_process";
import {
  CADInstallationProbeEngine,
  cadInstallationProbeEngine,
  type CADInstallationResult,
  type CADSystem,
} from "../engines/CADInstallationProbeEngine.js";

const mockExistsSync = vi.mocked(fsModule.existsSync);
const mockExecFile = vi.mocked(cpModule.execFile);

/** Configure execFile mock to simulate a successful reg query for one key */
function mockRegFound(keyFragment: string, stdout: string): void {
  mockExecFile.mockImplementation(
    (bin: unknown, args: unknown, _opts: unknown, cb: unknown) => {
      const callArgs = args as string[];
      const cbFn = cb as (
        err: Error | null,
        stdout: string,
        stderr: string
      ) => void;
      if (
        String(bin).includes("reg.exe") &&
        callArgs.some((a) => a.includes(keyFragment))
      ) {
        cbFn(null, stdout, "");
      } else {
        const err = Object.assign(new Error("not found"), { code: 1 });
        cbFn(err, "", "");
      }
      return { stdin: null } as ReturnType<typeof cpModule.execFile>;
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────

describe("CADInstallationProbeEngine — probe matrix (6 systems)", () => {
  let engine: CADInstallationProbeEngine;

  beforeEach(() => {
    engine = new CADInstallationProbeEngine();
    mockExistsSync.mockReturnValue(false);
    mockExecFile.mockImplementation(
      (_b, _a, _o, cb: unknown) => {
        const cbFn = cb as (err: Error | null, stdout: string, stderr: string) => void;
        const err = Object.assign(new Error("not found"), { code: 1 });
        cbFn(err, "", "");
        return { stdin: null } as ReturnType<typeof cpModule.execFile>;
      }
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── All 6 systems detected via filesystem ────────────────────────────────

  const EXE_PATHS: Record<CADSystem, string> = {
    solidworks:
      "C:\\Program Files\\SOLIDWORKS Corp\\SOLIDWORKS\\sldworks.exe",
    inventor:
      "C:\\Program Files\\Autodesk\\Inventor\\Bin\\Inventor.exe",
    freecad: "C:\\Program Files\\FreeCAD\\bin\\FreeCADCmd.exe",
    mastercam: "C:\\Program Files\\Mastercam\\Mastercam.exe",
    fusion360:
      `${process.env.LOCALAPPDATA ?? "C:\\Users\\Default\\AppData\\Local"}\\Autodesk\\webdeploy\\production\\Fusion360.exe`,
    hypermill:
      "C:\\Program Files\\OPEN MIND\\hyperMILL\\hyperMILL.exe",
  };

  const ALL_SYSTEMS: CADSystem[] = [
    "solidworks",
    "inventor",
    "freecad",
    "mastercam",
    "fusion360",
    "hypermill",
  ];

  it.each(ALL_SYSTEMS)(
    "detects %s as installed when exe exists on filesystem (Windows)",
    async (system) => {
      if (process.platform !== "win32") return; // skip on CI Linux

      const exePath = EXE_PATHS[system];
      mockExistsSync.mockImplementation((p) => p === exePath);

      const result = await engine.probe();
      const entry = result.value.find((r) => r.cadSystem === system);

      expect(entry).toBeDefined();
      expect(entry!.installed).toBe(true);
      expect(entry!.executablePath).toBe(exePath);
      expect(entry!.source).toBe("filesystem");
      expect(entry!.confidence).toBe(1.0);
    }
  );

  it.each(ALL_SYSTEMS)(
    "returns installed=false for %s when neither exe nor registry found",
    async (system) => {
      if (process.platform !== "win32") return;

      mockExistsSync.mockReturnValue(false);

      const result = await engine.probe();
      const entry = result.value.find((r) => r.cadSystem === system);

      expect(entry).toBeDefined();
      expect(entry!.installed).toBe(false);
      expect(entry!.confidence).toBe(0);
      expect(entry!.source).toBe("none");
    }
  );

  // ── Registry detection ───────────────────────────────────────────────────

  it("detects SolidWorks via registry when exe absent (Windows)", async () => {
    if (process.platform !== "win32") return;

    mockExistsSync.mockReturnValue(false);
    const regStdout =
      "HKEY_LOCAL_MACHINE\\SOFTWARE\\SolidWorks\r\n" +
      "    DisplayVersion    REG_SZ    2024 SP4.0\r\n";
    mockRegFound("SolidWorks", regStdout);

    const result = await engine.probe();
    const sw = result.value.find((r) => r.cadSystem === "solidworks");

    expect(sw!.installed).toBe(true);
    expect(sw!.source).toBe("registry");
    expect(sw!.confidence).toBe(0.8);
    expect(sw!.version).toBe("2024 SP4.0");
  });

  it("detects Mastercam via registry with InstallPath value (Windows)", async () => {
    if (process.platform !== "win32") return;

    mockExistsSync.mockReturnValue(false);
    const regStdout =
      "HKEY_LOCAL_MACHINE\\SOFTWARE\\CNC Software\r\n" +
      "    InstallPath    REG_SZ    C:\\Program Files\\Mastercam 2024\r\n";
    mockRegFound("CNC Software", regStdout);

    const result = await engine.probe();
    const mc = result.value.find((r) => r.cadSystem === "mastercam");

    expect(mc!.installed).toBe(true);
    expect(mc!.source).toBe("registry");
    expect(mc!.installPath).toBe("C:\\Program Files\\Mastercam 2024");
  });

  // ── All 6 returned in probe result ──────────────────────────────────────

  it("returns exactly 6 entries covering all CAD systems", async () => {
    const result = await engine.probe();
    expect(result.value).toHaveLength(6);

    const systems = result.value.map((r) => r.cadSystem).sort();
    expect(systems).toEqual([
      "freecad",
      "fusion360",
      "hypermill",
      "inventor",
      "mastercam",
      "solidworks",
    ]);
  });

  // ── Non-Windows graceful fallback ────────────────────────────────────────

  it("returns installed=false with unsupported_platform source on non-Windows", async () => {
    const origPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });

    const result = await engine.probe(true);
    const allUnknown = result.value.every(
      (r) => !r.installed && r.source === "unsupported_platform" && r.confidence === 0
    );
    expect(allUnknown).toBe(true);
    expect(result.confidence).toBe(0);

    Object.defineProperty(process, "platform", { value: origPlatform, configurable: true });
  });
});

// ── Caching tests ─────────────────────────────────────────────────────────────

describe("CADInstallationProbeEngine — caching", () => {
  let engine: CADInstallationProbeEngine;

  beforeEach(() => {
    engine = new CADInstallationProbeEngine();
    mockExistsSync.mockReturnValue(false);
    mockExecFile.mockImplementation(
      (_b, _a, _o, cb: unknown) => {
        const cbFn = cb as (err: Error | null, stdout: string, stderr: string) => void;
        const err = Object.assign(new Error("not found"), { code: 1 });
        cbFn(err, "", "");
        return { stdin: null } as ReturnType<typeof cpModule.execFile>;
      }
    );
  });

  it("returns source=probe on first call", async () => {
    const result = await engine.probe();
    expect(result.source).toBe("probe");
  });

  it("returns source=cache on second call within TTL", async () => {
    await engine.probe();
    const second = await engine.probe();
    expect(second.source).toBe("cache");
  });

  it("returns source=probe after forceRefresh=true", async () => {
    await engine.probe();
    const refreshed = await engine.probe(true);
    expect(refreshed.source).toBe("probe");
  });

  it("invalidateCache() causes next probe to fetch fresh data", async () => {
    await engine.probe();
    engine.invalidateCache();
    expect(engine.getCached()).toBeNull();
    const fresh = await engine.probe();
    expect(fresh.source).toBe("probe");
  });

  it("getCached() returns null before first probe", () => {
    expect(engine.getCached()).toBeNull();
  });

  it("getCached() returns cached result after probe", async () => {
    await engine.probe();
    expect(engine.getCached()).not.toBeNull();
    expect(engine.getCached()!.value).toHaveLength(6);
  });
});

// ── Singleton export ──────────────────────────────────────────────────────────

describe("CADInstallationProbeEngine — singleton", () => {
  it("exports cadInstallationProbeEngine singleton instance", () => {
    expect(cadInstallationProbeEngine).toBeInstanceOf(CADInstallationProbeEngine);
  });

  it("singleton probe() resolves without throwing on any platform", async () => {
    mockExistsSync.mockReturnValue(false);
    await expect(cadInstallationProbeEngine.probe(true)).resolves.toBeDefined();
  });
});

// ── Graceful missing binary ───────────────────────────────────────────────────

describe("CADInstallationProbeEngine — graceful on missing binaries", () => {
  it("handles ENOENT from execFile without throwing", async () => {
    const engine = new CADInstallationProbeEngine();
    mockExistsSync.mockReturnValue(false);
    mockExecFile.mockImplementation(
      (_b, _a, _o, cb: unknown) => {
        const cbFn = cb as (err: Error | null, stdout: string, stderr: string) => void;
        const err = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
        cbFn(err, "", "");
        return { stdin: null } as ReturnType<typeof cpModule.execFile>;
      }
    );

    // Should not throw; all systems should be marked not-installed
    const result = await engine.probe(true);
    expect(result.value.every((r) => !r.installed)).toBe(
      process.platform !== "win32" ? true : true
    );
  });
});
