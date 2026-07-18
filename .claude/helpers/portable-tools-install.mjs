#!/usr/bin/env node
/**
 * portable-tools-install.mjs — Install portable tools to H: drive.
 *
 * Run this script once on each PC to set up H: drive with portable tools.
 * After running, all hooks will work regardless of which PC has H: drive.
 *
 * Tools installed:
 *   - Node.js 22.x → H:\Tools\nodejs\
 *   - Python (WinPython 3.13) → H:\Tools\python\ (junction)
 *
 * Usage (from any PC with H: drive connected):
 *   node H:\prism\.claude\helpers\portable-tools-install.mjs
 *
 * The script uses curl to download Node.js if missing, and creates
 * necessary junctions for Python.
 */

import { existsSync, mkdirSync, createWriteStream, renameSync, rmSync, statSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { join } from "node:path";
import https from "node:https";
import { createReadStream } from "node:fs";
import { createUnzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { createInterface } from "node:readline";

const TOOLS_DIR = "H:/Tools";
const NODE_DIR = join(TOOLS_DIR, "nodejs");
const NODE_EXE = join(NODE_DIR, "node.exe");
const PYTHON_DIR = join(TOOLS_DIR, "python");
const WINPYTHON_DIR = join(TOOLS_DIR, "WPy64-3.13.12.0/python");

const NODE_VERSION = "22.12.0";
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`;
const NODE_ZIP = join(TOOLS_DIR, `node-v${NODE_VERSION}-win-x64.zip`);

function log(msg) { console.log(`[setup] ${msg}`); }
function ok(msg) { console.log(`[setup] ✓ ${msg}`); }
function warn(msg) { console.log(`[setup] ⚠ ${msg}`); }
function error(msg) { console.error(`[setup] ✗ ${msg}`); }

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https.get(url, response => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, resp => {
          resp.pipe(file);
          file.on("finish", () => { file.close(); resolve(); });
        }).on("error", reject);
      } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on("error", reject);
  });
}

function runCmd(cmd, args, opts = {}) {
  try {
    return execFileSync(cmd, args, { windowsHide: true, encoding: "utf8", timeout: 120000, ...opts });
  } catch (e) {
    return null;
  }
}

async function installNode() {
  log(`Installing Node.js ${NODE_VERSION} to ${NODE_DIR}...`);

  // Create dirs
  mkdirSync(TOOLS_DIR, { recursive: true });

  // Check if already installed
  if (existsSync(NODE_EXE)) {
    const version = runCmd(NODE_EXE, ["--version"]);
    if (version && version.includes(NODE_VERSION)) {
      ok(`Node.js ${version.trim()} already installed`);
      return true;
    }
    log(`Upgrading from ${version?.trim() || "unknown"} to v${NODE_VERSION}`);
  }

  // Download
  if (!existsSync(NODE_ZIP)) {
    log(`Downloading from ${NODE_URL}...`);
    try {
      // Try curl first (usually available)
      const curlResult = runCmd("curl", ["-L", "-o", NODE_ZIP, NODE_URL], { timeout: 300000 });
      if (!existsSync(NODE_ZIP)) {
        throw new Error("curl download failed");
      }
    } catch {
      // Fall back to native download
      try {
        await downloadFile(NODE_URL, NODE_ZIP);
      } catch (e) {
        error(`Download failed: ${e.message}`);
        return false;
      }
    }
  }

  // Extract using PowerShell (available on all Windows)
  log("Extracting...");
  const extractDir = join(TOOLS_DIR, `node-v${NODE_VERSION}-win-x64`);

  // Remove old extraction if exists
  if (existsSync(extractDir)) {
    rmSync(extractDir, { recursive: true, force: true });
  }

  const psResult = runCmd("powershell", [
    "-NoProfile", "-Command",
    `Expand-Archive -Path '${NODE_ZIP}' -DestinationPath '${TOOLS_DIR}' -Force`
  ], { timeout: 120000 });

  if (!existsSync(extractDir)) {
    error("Extraction failed");
    return false;
  }

  // Move contents to nodejs folder
  if (existsSync(NODE_DIR)) {
    rmSync(NODE_DIR, { recursive: true, force: true });
  }
  renameSync(extractDir, NODE_DIR);

  // Clean up zip
  rmSync(NODE_ZIP, { force: true });

  // Verify
  const version = runCmd(NODE_EXE, ["--version"]);
  if (!version) {
    error("Node.js installation verification failed");
    return false;
  }

  ok(`Node.js ${version.trim()} installed successfully`);
  return true;
}

function setupPythonJunction() {
  log("Setting up Python junction...");

  // Check if WinPython is installed
  if (!existsSync(WINPYTHON_DIR)) {
    warn("WinPython not found at H:\\Tools\\WPy64-3.13.12.0\\python");
    warn("Download from: https://github.com/winpython/winpython/releases");
    warn("Extract to: H:\\Tools\\WPy64-3.13.12.0");
    return false;
  }

  // Check if junction already exists correctly
  if (existsSync(PYTHON_DIR)) {
    try {
      const stat = statSync(PYTHON_DIR);
      const pyExe = join(PYTHON_DIR, "python.exe");
      if (existsSync(pyExe)) {
        const version = runCmd(pyExe, ["--version"]);
        if (version) {
          ok(`Python junction already set: ${version.trim()}`);
          return true;
        }
      }
    } catch { /* ignore */ }

    // Junction broken, remove and recreate
    rmSync(PYTHON_DIR, { recursive: true, force: true });
  }

  // Create junction using PowerShell (works without admin for junctions)
  const psResult = runCmd("powershell", [
    "-NoProfile", "-Command",
    `New-Item -ItemType Junction -Path '${PYTHON_DIR}' -Target '${WINPYTHON_DIR}' -Force`
  ]);

  if (!existsSync(join(PYTHON_DIR, "python.exe"))) {
    error("Python junction creation failed");
    return false;
  }

  const version = runCmd(join(PYTHON_DIR, "python.exe"), ["--version"]);
  ok(`Python junction created: ${version?.trim() || "unknown version"}`);
  return true;
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  PRISM Portable Tools Installer");
  console.log("  H: drive setup for cross-PC portability");
  console.log("=".repeat(60) + "\n");

  let allOk = true;

  // Node.js
  const nodeOk = await installNode();
  allOk = allOk && nodeOk;

  // Python
  const pythonOk = setupPythonJunction();
  allOk = allOk && pythonOk;

  console.log("\n" + "=".repeat(60));
  if (allOk) {
    console.log("  ✓ ALL TOOLS INSTALLED");
    console.log("  H: drive is now portable across PCs.");
  } else {
    console.log("  ⚠ PARTIAL INSTALL");
    console.log("  Review warnings above and fix manually.");
  }
  console.log("=".repeat(60) + "\n");

  // Show verification commands
  console.log("Verify with:");
  console.log(`  "${NODE_EXE}" --version`);
  console.log(`  "${join(PYTHON_DIR, "python.exe")}" --version`);
  console.log();

  process.exit(allOk ? 0 : 1);
}

main().catch(e => {
  error(`Fatal: ${e.message}`);
  process.exit(1);
});
