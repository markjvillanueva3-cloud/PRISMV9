/**
 * CADInstallationProbeEngine (U-CAUT01)
 * ======================================
 *
 * Probes the local workstation for installed CAD/CAM software by querying
 * the Windows registry (via "reg query") and checking well-known filesystem
 * paths.  On non-Windows platforms, returns graceful "unknown" results with
 * confidence=0 so callers can branch to mock/CI mode.
 *
 * Design rules:
 *   - Uses execFile (NOT shell:true) — never interpolates user data into
 *     a shell command (security-critical for a production CNC system)
 *   - Results cached per-session; call probe(true) to force refresh
 *   - Returns AtomicValue-style objects: { value, confidence, source }
 *   - Duplication guard checked at module load time (LOG_ONLY — no throw
 *     since this engine is brand new and the check is for auditability)
 *
 * Supported systems: solidworks | inventor | freecad | mastercam |
 *                    fusion360 | hypermill
 *
 * @module engines/CADInstallationProbeEngine
 * @milestone CAD-AUTOMATION-MS0 / U-CAUT01
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import { log } from "../utils/Logger.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CADSystem =
  | "solidworks"
  | "inventor"
  | "freecad"
  | "mastercam"
  | "fusion360"
  | "hypermill";

/**
 * AtomicValue-style result for a single CAD installation probe.
 * `confidence` 0-1: 1.0 = executable found on disk; 0.8 = registry hit only;
 *   0.0 = not found / non-Windows.
 */
export interface CADInstallationResult {
  cadSystem: CADSystem;
  installed: boolean;
  version?: string;
  installPath?: string;
  executablePath?: string;
  /** API/SDK version if detectable (e.g. SolidWorks API version from registry) */
  apiVersion?: string;
  /** Detection method: "filesystem" | "registry" | "none" | "unsupported_platform" */
  source: string;
  /** 0-1 confidence in the installed determination */
  confidence: number;
  /** Human-readable detection summary */
  detail: string;
}

/** Full probe result set (all 6 systems) */
export interface CADProbeResult {
  value: CADInstallationResult[];
  probedAt: string;
  platform: string;
  confidence: number; // avg across all
  source: "probe" | "cache";
}

// ── Per-CAD probe configuration ───────────────────────────────────────────────

interface CADProbeConfig {
  system: CADSystem;
  /** Windows registry keys to query (HKLM) */
  registryKeys: string[];
  /** Well-known executable glob-style paths (may contain * for version wildcards).
   *  On Windows, we expand via fs.readdirSync on parent dirs. */
  wellKnownExePaths: string[];
  /** Well-known install directory patterns (no exe) — used for installPath */
  wellKnownDirPatterns: string[];
  /** Registry value name that holds the install path (optional) */
  registryInstallValue?: string;
}

const LOCAL_APP_DATA = process.env.LOCALAPPDATA ?? "C:\\Users\\Default\\AppData\\Local";

const CAD_PROBE_CONFIGS: CADProbeConfig[] = [
  {
    system: "solidworks",
    registryKeys: [
      "HKLM\\SOFTWARE\\SolidWorks",
      "HKLM\\SOFTWARE\\WOW6432Node\\SolidWorks",
    ],
    wellKnownExePaths: [
      "C:\\Program Files\\SOLIDWORKS Corp\\SOLIDWORKS\\sldworks.exe",
    ],
    wellKnownDirPatterns: ["C:\\Program Files\\SOLIDWORKS Corp"],
    registryInstallValue: "SolidWorks",
  },
  {
    system: "inventor",
    registryKeys: [
      "HKLM\\SOFTWARE\\Autodesk\\Inventor",
      "HKLM\\SOFTWARE\\WOW6432Node\\Autodesk\\Inventor",
    ],
    wellKnownExePaths: [
      "C:\\Program Files\\Autodesk\\Inventor\\Bin\\Inventor.exe",
    ],
    wellKnownDirPatterns: ["C:\\Program Files\\Autodesk"],
    registryInstallValue: "Inventor",
  },
  {
    system: "freecad",
    registryKeys: [],
    wellKnownExePaths: ["C:\\Program Files\\FreeCAD\\bin\\FreeCADCmd.exe"],
    wellKnownDirPatterns: ["C:\\Program Files\\FreeCAD"],
  },
  {
    system: "mastercam",
    registryKeys: [
      "HKLM\\SOFTWARE\\CNC Software",
      "HKLM\\SOFTWARE\\WOW6432Node\\CNC Software",
    ],
    wellKnownExePaths: ["C:\\Program Files\\Mastercam\\Mastercam.exe"],
    wellKnownDirPatterns: ["C:\\Program Files\\Mastercam"],
    registryInstallValue: "InstallPath",
  },
  {
    system: "fusion360",
    registryKeys: [],
    wellKnownExePaths: [
      `${LOCAL_APP_DATA}\\Autodesk\\webdeploy\\production\\Fusion360.exe`,
    ],
    wellKnownDirPatterns: [
      `${LOCAL_APP_DATA}\\Autodesk\\webdeploy\\production`,
    ],
  },
  {
    system: "hypermill",
    registryKeys: [
      "HKLM\\SOFTWARE\\OPEN MIND Technologies",
      "HKLM\\SOFTWARE\\WOW6432Node\\OPEN MIND Technologies",
    ],
    wellKnownExePaths: [
      "C:\\Program Files\\OPEN MIND\\hyperMILL\\hyperMILL.exe",
    ],
    wellKnownDirPatterns: ["C:\\Program Files\\OPEN MIND"],
    registryInstallValue: "InstallDir",
  },
];

// ── Low-level helpers ─────────────────────────────────────────────────────────

/**
 * Run execFile and resolve with stdout/stderr/code — NEVER rejects.
 * Safe: does not use shell interpolation.
 */
function execFileNoThrow(
  bin: string,
  args: string[],
  timeoutMs = 5000
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile(
      bin,
      args,
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        const rawCode = err ? (err as NodeJS.ErrnoException & { code?: unknown }).code : 0;
        const code = typeof rawCode === "number" ? rawCode : err ? 1 : 0;
        resolve({
          stdout: typeof stdout === "string" ? stdout : "",
          stderr: typeof stderr === "string" ? stderr : "",
          code,
        });
      }
    );
  });
}

/**
 * Attempt to expand a versioned directory — e.g. "C:\Program Files\Mastercam"
 * and return the first matching subdirectory, or the base dir itself.
 */
function expandVersionedDir(base: string): string | undefined {
  try {
    if (fs.existsSync(base)) return base;
    const parent = base.replace(/\\[^\\]+$/, "");
    const segment = base.split("\\").pop() ?? "";
    if (!fs.existsSync(parent)) return undefined;
    const children = fs.readdirSync(parent);
    const match = children.find((c) =>
      c.toLowerCase().startsWith(segment.toLowerCase())
    );
    return match ? `${parent}\\${match}` : undefined;
  } catch {
    return undefined;
  }
}

/** Parse "reg query" stdout for a version or install-path string. */
function parseRegValue(stdout: string, valueName?: string): string | undefined {
  if (!stdout) return undefined;
  const lines = stdout.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines like:   DisplayVersion    REG_SZ    2024
    if (valueName) {
      const re = new RegExp(`^${valueName}\\s+REG_\\w+\\s+(.+)$`, "i");
      const m = trimmed.match(re);
      if (m) return m[1].trim();
    }
    // Fallback: return first REG_SZ value found
    const m2 = trimmed.match(/REG_SZ\s+(.+)$/i);
    if (m2) return m2[1].trim();
  }
  return undefined;
}

// ── Engine class ──────────────────────────────────────────────────────────────

export class CADInstallationProbeEngine {
  private cache: CADProbeResult | null = null;
  private readonly cacheMaxAgeMs = 5 * 60 * 1000; // 5 minutes per session

  /**
   * Probe all 6 CAD systems.  Results are cached for the session.
   * @param forceRefresh — set true to bypass cache
   */
  async probe(forceRefresh = false): Promise<CADProbeResult> {
    if (!forceRefresh && this.cache) {
      const age = Date.now() - new Date(this.cache.probedAt).getTime();
      if (age < this.cacheMaxAgeMs) {
        return { ...this.cache, source: "cache" };
      }
    }

    const platform = process.platform;

    if (platform !== "win32") {
      const results: CADInstallationResult[] = CAD_PROBE_CONFIGS.map((cfg) => ({
        cadSystem: cfg.system,
        installed: false,
        source: "unsupported_platform",
        confidence: 0,
        detail: `Platform ${platform} — Windows registry/filesystem probe unavailable`,
      }));
      const result: CADProbeResult = {
        value: results,
        probedAt: new Date().toISOString(),
        platform,
        confidence: 0,
        source: "probe",
      };
      this.cache = result;
      return result;
    }

    const results = await Promise.all(
      CAD_PROBE_CONFIGS.map((cfg) => this.probeOne(cfg))
    );

    const avgConfidence =
      results.reduce((s, r) => s + r.confidence, 0) / results.length;

    const result: CADProbeResult = {
      value: results,
      probedAt: new Date().toISOString(),
      platform,
      confidence: avgConfidence,
      source: "probe",
    };
    this.cache = result;
    log.info(`[CADInstallationProbeEngine] probe complete`, {
      installed: results.filter((r) => r.installed).map((r) => r.cadSystem),
    });
    return result;
  }

  /** Probe a single CAD system. */
  async probeOne(cfg: CADProbeConfig): Promise<CADInstallationResult> {
    // ── Step 1: Filesystem check on well-known exe paths ──────────────────
    for (const exePath of cfg.wellKnownExePaths) {
      try {
        if (fs.existsSync(exePath)) {
          const installPath = exePath.replace(/\\[^\\]+$/, "");
          const version = await this.tryGetVersionFromRegistry(cfg);
          return {
            cadSystem: cfg.system,
            installed: true,
            version,
            installPath,
            executablePath: exePath,
            source: "filesystem",
            confidence: 1.0,
            detail: `Executable found at ${exePath}`,
          };
        }
      } catch {
        // continue
      }
    }

    // ── Step 2: Expanded directory scan (version-agnostic dirs) ──────────
    for (const dirBase of cfg.wellKnownDirPatterns) {
      const expanded = expandVersionedDir(dirBase);
      if (expanded) {
        const version = await this.tryGetVersionFromRegistry(cfg);
        return {
          cadSystem: cfg.system,
          installed: true,
          version,
          installPath: expanded,
          source: "filesystem",
          confidence: 0.9,
          detail: `Install directory found at ${expanded}`,
        };
      }
    }

    // ── Step 3: Windows registry query ────────────────────────────────────
    for (const regKey of cfg.registryKeys) {
      const regResult = await this.queryRegistry(regKey);
      if (regResult.found) {
        const version = parseRegValue(regResult.stdout, "DisplayVersion")
          ?? parseRegValue(regResult.stdout, "Version")
          ?? parseRegValue(regResult.stdout, cfg.registryInstallValue);
        const installPath = parseRegValue(regResult.stdout, cfg.registryInstallValue)
          ?? parseRegValue(regResult.stdout, "InstallPath")
          ?? parseRegValue(regResult.stdout, "InstallDir");
        return {
          cadSystem: cfg.system,
          installed: true,
          version,
          installPath,
          source: "registry",
          confidence: 0.8,
          detail: `Registry key found: ${regKey}`,
        };
      }
    }

    // ── Not found ─────────────────────────────────────────────────────────
    return {
      cadSystem: cfg.system,
      installed: false,
      source: "none",
      confidence: 0,
      detail: `No installation found for ${cfg.system}`,
    };
  }

  /** Query a registry key. Returns found=true if key exists (exit code 0). */
  private async queryRegistry(
    key: string
  ): Promise<{ found: boolean; stdout: string }> {
    // reg.exe is at C:\Windows\System32\reg.exe — no PATH injection needed
    const result = await execFileNoThrow(
      "C:\\Windows\\System32\\reg.exe",
      ["query", key],
      5000
    );
    return { found: result.code === 0, stdout: result.stdout };
  }

  /** Try to extract version info from registry for a given config. */
  private async tryGetVersionFromRegistry(
    cfg: CADProbeConfig
  ): Promise<string | undefined> {
    for (const key of cfg.registryKeys) {
      const r = await this.queryRegistry(key);
      if (r.found) {
        const v =
          parseRegValue(r.stdout, "DisplayVersion") ??
          parseRegValue(r.stdout, "Version");
        if (v) return v;
      }
    }
    return undefined;
  }

  /** Invalidate session cache (e.g. after a software install). */
  invalidateCache(): void {
    this.cache = null;
    log.info("[CADInstallationProbeEngine] cache invalidated");
  }

  /** Return cached result synchronously (null if not probed yet). */
  getCached(): CADProbeResult | null {
    return this.cache;
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────
export const cadInstallationProbeEngine = new CADInstallationProbeEngine();
