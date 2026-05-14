/**
 * peerAuditTickPowerShell.test.ts — CLEANUP-MS0 / U-CLEANUP-B6
 *
 * Contract assertions for the PowerShell shim at
 * `scripts/system-health/06-peer-audit-tick.ps1`. The shim itself is a thin
 * invocation surface — it cannot be vitest-exercised end-to-end (vitest
 * doesn't run PowerShell, and a dry-run still requires `mcp-server/dist/`
 * to be present, which the per-test sandbox doesn't guarantee). Instead
 * this test pins the CONTRACT the shim depends on, so a future engine
 * rename / argv-name drift / flag rewording would fail HERE rather than
 * fail-silently the first time the cron fires in production.
 *
 * Verified contracts:
 *   1. The shim file exists at the spec-mandated path.
 *   2. The shim parses cleanly as a PowerShell script (no syntax errors
 *      introduced by an unrelated edit).
 *   3. PeerCommitAuditorEngine.ts exports `tickFromCli` (the entrypoint
 *      the shim's `node -e` payload calls).
 *   4. The engine's argv flags the shim forwards (`--dry-run`,
 *      `--skip-activity-gate`, `--activity-window-hours`) are still the
 *      flags `parseCliArgs` recognises. Catches a rename of either side.
 *   5. The shim sets + restores PRISM_GOLF_TICK=1 around the node call.
 *   6. The shim DOES NOT invoke the MCP HTTP bridge (R1-B1 contract:
 *      stdio-only PRISM; cron has no MCP client).
 *   7. The shim NEVER writes to engine-state paths; only OS temp files
 *      for stdout/stderr capture which are unlinked in `finally`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const HERE = resolve(dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = resolve(HERE, "..", "..", "..");
const SHIM_PATH = join(REPO_ROOT, "scripts/system-health/06-peer-audit-tick.ps1");
const ENGINE_SRC = join(REPO_ROOT, "mcp-server/src/engines/PeerCommitAuditorEngine.ts");

const SHIM_SOURCE = existsSync(SHIM_PATH) ? readFileSync(SHIM_PATH, "utf8") : "";
const ENGINE_SOURCE = existsSync(ENGINE_SRC) ? readFileSync(ENGINE_SRC, "utf8") : "";

describe("06-peer-audit-tick.ps1 — shim file", () => {
  it("exists at the spec-mandated path", () => {
    expect(existsSync(SHIM_PATH)).toBe(true);
    expect(statSync(SHIM_PATH).size).toBeGreaterThan(2000);  // sanity: not an empty stub
  });

  it("declares the unit + spec citation in the header", () => {
    expect(SHIM_SOURCE).toMatch(/CLEANUP-MS0/);
    expect(SHIM_SOURCE).toMatch(/U-CLEANUP-B6/);
    expect(SHIM_SOURCE).toMatch(/GOLF-WATCHDOG-MS0/);
  });

  it("documents the R1-B1 contract (node -e import, NOT MCP HTTP bridge)", () => {
    expect(SHIM_SOURCE).toMatch(/NOT.*MCP HTTP bridge|stdio-only/i);
    expect(SHIM_SOURCE).toMatch(/node -e|Start-Process.*node|tickFromCli/);
  });
});

describe("06-peer-audit-tick.ps1 — PowerShell syntax", () => {
  it("parses cleanly under pwsh -Command [scriptblock]::Create", () => {
    // Skip on hosts that don't have pwsh on PATH (CI Linux runners without
    // PowerShell Core installed). Local Windows + CI Windows have pwsh.
    const probe = spawnSync("pwsh", ["-NoProfile", "-Command", "$PSVersionTable.PSVersion"], {
      encoding: "utf8", timeout: 10_000,
    });
    if (probe.status !== 0) {
      // pwsh unavailable — assert the file at least exists and has #-prefixed
      // comments characteristic of a PS script. Soft check; this won't catch
      // syntax errors but neither will a host without pwsh.
      expect(SHIM_SOURCE.split(/\r?\n/)[0]).toMatch(/^#/);
      return;
    }
    const r = spawnSync("pwsh", [
      "-NoProfile",
      "-Command",
      `try { [scriptblock]::Create((Get-Content -Raw '${SHIM_PATH.replace(/'/g, "''")}')) | Out-Null; exit 0 } catch { Write-Error $_.Exception.Message; exit 1 }`,
    ], { encoding: "utf8", timeout: 15_000 });
    expect(r.status, `pwsh parse stderr: ${r.stderr}`).toBe(0);
  });
});

describe("PeerCommitAuditorEngine.ts — engine contract the shim depends on", () => {
  it("source file exists at the expected path", () => {
    expect(existsSync(ENGINE_SRC)).toBe(true);
  });

  it("exports tickFromCli (the shim's invocation target)", () => {
    expect(ENGINE_SOURCE).toMatch(/export\s+function\s+tickFromCli/);
  });

  it("tickFromCli accepts the flags the shim forwards", () => {
    // The shim forwards --dry-run, --skip-activity-gate, --activity-window-hours.
    // Each must be recognised by the engine's parseCliArgs implementation
    // (lookup by string-literal in the engine source — any rename of either
    // side fails this test before fail-silently in prod).
    expect(ENGINE_SOURCE).toMatch(/['"`]--dry-run['"`]/);
    expect(ENGINE_SOURCE).toMatch(/['"`]--no-activity-gate['"`]/);
    expect(ENGINE_SOURCE).toMatch(/['"`]--activity-window-hours['"`]/);
  });
});

describe("06-peer-audit-tick.ps1 — PRISM_GOLF_TICK env var lifecycle", () => {
  it("captures the prior value BEFORE setting", () => {
    expect(SHIM_SOURCE).toMatch(/\$origGolfTick\s*=\s*\$env:PRISM_GOLF_TICK/);
  });

  it("sets PRISM_GOLF_TICK=1 BEFORE invoking node", () => {
    expect(SHIM_SOURCE).toMatch(/\$env:PRISM_GOLF_TICK\s*=\s*["']1["']/);
  });

  it("restores the prior value in a finally block (idempotent unset when missing)", () => {
    expect(SHIM_SOURCE).toMatch(/finally\s*\{[\s\S]*PRISM_GOLF_TICK[\s\S]*\}/);
    expect(SHIM_SOURCE).toMatch(/Remove-Item\s+Env:PRISM_GOLF_TICK/);
  });
});

describe("06-peer-audit-tick.ps1 — no MCP HTTP bridge calls + no hidden writes", () => {
  it("does NOT invoke an HTTP client (no Invoke-RestMethod / Invoke-WebRequest / curl / port 3100)", () => {
    expect(SHIM_SOURCE).not.toMatch(/Invoke-RestMethod/);
    expect(SHIM_SOURCE).not.toMatch(/Invoke-WebRequest/);
    expect(SHIM_SOURCE).not.toMatch(/curl\s+http/);
    // Port 3100 is the MCP HTTP bridge per spec R1-B1 — should not appear here.
    expect(SHIM_SOURCE).not.toMatch(/:3100\b/);
  });

  it("does NOT use persistent-write cmdlets (Out-File / Set-Content / Add-Content) outside temp-file capture", () => {
    // Allowed: GetTempFileName + Remove-Item in finally. Reject anything else.
    expect(SHIM_SOURCE).not.toMatch(/Out-File/);
    expect(SHIM_SOURCE).not.toMatch(/Add-Content/);
    // Set-Content is permitted only in defensive paths; verify none exists
    // in this current shim (we don't write any state file).
    expect(SHIM_SOURCE).not.toMatch(/Set-Content/);
  });

  it("uses Start-Process with split RedirectStandardOutput/Error (NOT 2>&1 merged)", () => {
    expect(SHIM_SOURCE).toMatch(/Start-Process/);
    expect(SHIM_SOURCE).toMatch(/-RedirectStandardOutput/);
    expect(SHIM_SOURCE).toMatch(/-RedirectStandardError/);
  });

  it("cleans up temp files in a finally block", () => {
    expect(SHIM_SOURCE).toMatch(/Remove-Item\s+\$stdoutFile/);
    expect(SHIM_SOURCE).toMatch(/Remove-Item\s+\$stderrFile/);
  });
});

describe("06-peer-audit-tick.ps1 — dist build error path", () => {
  it("lists candidate paths tried before bailing (mirrors G8 P1-5 fix pattern)", () => {
    expect(SHIM_SOURCE).toMatch(/candidatePaths/);
    // Two candidates: flat dist + mirrored dist (matches G8 cron-registry-reconcile)
    expect(SHIM_SOURCE).toMatch(/dist\/engines\/PeerCommitAuditorEngine\.js/);
    expect(SHIM_SOURCE).toMatch(/dist\/mcp-server\/src\/engines\/PeerCommitAuditorEngine\.js/);
  });

  it("emits a clear build command in the not-built error message", () => {
    expect(SHIM_SOURCE).toMatch(/npm run build:fast/);
  });

  it("exits non-zero (code 2) when the engine isn't built", () => {
    // The dist-not-built path must `exit 2` per the cron contract (real errors).
    expect(SHIM_SOURCE).toMatch(/exit\s+2/);
  });
});

describe("06-peer-audit-tick.ps1 — parameter contract", () => {
  it("accepts -DryRun (forwarded as --dry-run)", () => {
    expect(SHIM_SOURCE).toMatch(/\[switch\]\$DryRun/);
    expect(SHIM_SOURCE).toMatch(/if\s*\(\$DryRun\)[\s\S]{0,200}["']--dry-run["']/);
  });

  it("accepts -SkipActivityGate (forwarded as --no-activity-gate to match engine parseCliArgs)", () => {
    expect(SHIM_SOURCE).toMatch(/\[switch\]\$SkipActivityGate/);
    expect(SHIM_SOURCE).toMatch(/if\s*\(\$SkipActivityGate\)[\s\S]{0,200}["']--no-activity-gate["']/);
  });

  it("accepts -ActivityWindowHours (forwarded as --activity-window-hours)", () => {
    expect(SHIM_SOURCE).toMatch(/\[int\]\$ActivityWindowHours/);
    expect(SHIM_SOURCE).toMatch(/--activity-window-hours/);
  });

  it("defaults RepoRoot to H:/prism (so Task Scheduler invocation works)", () => {
    expect(SHIM_SOURCE).toMatch(/\$RepoRoot\s*=\s*["']H:\/prism["']/);
  });
});
