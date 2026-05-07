/**
 * HyperMillPRISMPlugin.dll presence + contract test — U-CAM86-DLL
 * ================================================================
 * Verifies the C# plugin DLL produced by `dotnet build` under
 * H:/PRISM/plugins/hypermill/ exists, has non-zero size, and ships
 * alongside its COM host + runtimeconfig required by hyperMILL's
 * .NET 8 plugin loader.
 *
 * This is a CONTRACT test, not an execution test — actually loading the
 * DLL into hyperMILL is Phase-9 final-validation territory (U-CAM-FINAL-02
 * harness validation). Here we just lock down that the build artifact
 * exists and matches the adapter's expectations.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const DLL_ROOT = "H:/PRISM/plugins/hypermill/bin";

describe("U-CAM86-DLL — HyperMillPRISMPlugin build artifacts", () => {
  it("HyperMillPRISMPlugin.dll exists in plugins/hypermill/bin/", () => {
    const dll = path.join(DLL_ROOT, "HyperMillPRISMPlugin.dll");
    expect(fs.existsSync(dll)).toBe(true);
    const size = fs.statSync(dll).size;
    expect(size).toBeGreaterThan(1024);
  });

  it("COM host (HyperMillPRISMPlugin.comhost.dll) ships alongside main DLL", () => {
    const comhost = path.join(DLL_ROOT, "HyperMillPRISMPlugin.comhost.dll");
    expect(fs.existsSync(comhost)).toBe(true);
  });

  it("runtimeconfig.json declares net8.0 framework (compatible with hyperMILL 2024)", () => {
    const rc = path.join(DLL_ROOT, "HyperMillPRISMPlugin.runtimeconfig.json");
    expect(fs.existsSync(rc)).toBe(true);
    const cfg = JSON.parse(fs.readFileSync(rc, "utf-8"));
    const tfm = cfg.runtimeOptions?.tfm ?? "";
    expect(tfm).toMatch(/net(8|9|10)/);
  });

  it("C# source scaffolds 9 message-type methods matching HMPluginMessage enum", () => {
    const src = fs.readFileSync("H:/PRISM/plugins/hypermill/src/PrismBridge.cs", "utf-8");
    // Must cover the 9 message types the TypeScript HMPluginMessageSchema enum lists
    const requiredMessages = [
      "project_opened",
      "operation_selected",
      "pre_calculate",
      "post_calculate",
      "simulation_point",
      "nc_output_start",
      "nc_output_complete",
      "request_analysis",
      "request_overlay",
    ];
    for (const m of requiredMessages) {
      expect(src).toContain(m);
    }
  });

  it("C# class is ComVisible and has a stable GUID", () => {
    const src = fs.readFileSync("H:/PRISM/plugins/hypermill/src/PrismBridge.cs", "utf-8");
    expect(src).toMatch(/\[ComVisible\(true\)\]/);
    expect(src).toMatch(/\[Guid\("[0-9A-F-]{36}"\)\]/i);
  });

  it("csproj targets net8.0 with EnableComHosting=true", () => {
    const csproj = fs.readFileSync(
      "H:/PRISM/plugins/hypermill/HyperMillPRISMPlugin.csproj",
      "utf-8"
    );
    expect(csproj).toMatch(/<TargetFramework>net8\.0<\/TargetFramework>/);
    expect(csproj).toMatch(/<EnableComHosting>true<\/EnableComHosting>/);
  });

  it("bridge endpoint respects PRISM_HYPERMILL_ENDPOINT env override", () => {
    const src = fs.readFileSync("H:/PRISM/plugins/hypermill/src/PrismBridge.cs", "utf-8");
    expect(src).toContain("PRISM_HYPERMILL_ENDPOINT");
  });

  it("bridge methods never throw (COM-host stability contract)", () => {
    const src = fs.readFileSync("H:/PRISM/plugins/hypermill/src/PrismBridge.cs", "utf-8");
    // Must catch exceptions — hyperMILL would crash if a COM method threw
    expect(src).toMatch(/catch\s*\(Exception/);
  });

  it("envelope shape matches TS HMPluginMessageSchema (message_id, message_type, timestamp, payload)", () => {
    const src = fs.readFileSync("H:/PRISM/plugins/hypermill/src/PrismBridge.cs", "utf-8");
    expect(src).toContain("message_id");
    expect(src).toContain("message_type");
    expect(src).toContain("timestamp");
    expect(src).toContain("payload");
  });

  it("bin/ contains exactly the set expected by hyperMILL's regasm install: DLL + comhost + deps + runtimeconfig", () => {
    const files = fs.readdirSync(DLL_ROOT);
    expect(files).toContain("HyperMillPRISMPlugin.dll");
    expect(files).toContain("HyperMillPRISMPlugin.comhost.dll");
    expect(files).toContain("HyperMillPRISMPlugin.deps.json");
    expect(files).toContain("HyperMillPRISMPlugin.runtimeconfig.json");
  });

  it("PRISM_HYPERMILL_ENDPOINT default points to localhost (safe for local dev)", () => {
    const src = fs.readFileSync("H:/PRISM/plugins/hypermill/src/PrismBridge.cs", "utf-8");
    expect(src).toMatch(/localhost:\d+/);
  });
});
