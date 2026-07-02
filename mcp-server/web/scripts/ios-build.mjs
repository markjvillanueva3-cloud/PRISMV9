#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const WEB_ROOT = resolve(dirname(__filename), "..");
const IOS_ROOT = resolve(WEB_ROOT, "ios");
const IOS_APP_ROOT = resolve(IOS_ROOT, "App");
const PODFILE = resolve(IOS_APP_ROOT, "Podfile");
const WORKSPACE = resolve(IOS_APP_ROOT, "App.xcworkspace");
const SIMULATOR_APP = resolve(IOS_APP_ROOT, "build", "Build", "Products", "Debug-iphonesimulator", "App.app");
const RELATIVE_CAPACITOR_IOS = "../../node_modules/@capacitor/ios";

const args = new Set(process.argv.slice(2));
const shouldBuildSimulator = args.has("--build-simulator");
const skipWebBuild = args.has("--no-web-build");

function commandName(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function run(label, executable, commandArgs, cwd = WEB_ROOT) {
  console.log(`[ios-build] ${label}`);
  const windowsShim = process.platform === "win32" && /\.(cmd|bat)$/i.test(executable);
  const result = spawnSync(
    windowsShim ? "cmd.exe" : executable,
    windowsShim ? ["/d", "/s", "/c", executable, ...commandArgs] : commandArgs,
    {
    cwd,
    stdio: "inherit",
    shell: false,
    env: process.env,
    },
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function normalizePodfile() {
  if (!existsSync(PODFILE)) {
    throw new Error(`Podfile not found at ${PODFILE}. Run Capacitor iOS scaffold first.`);
  }
  const before = readFileSync(PODFILE, "utf8");
  let after = before
    .replace(
      /require_relative\s+['"][^'"]*@capacitor\/ios\/scripts\/pods_helpers['"]/,
      `require_relative '${RELATIVE_CAPACITOR_IOS}/scripts/pods_helpers'`,
    )
    .replace(
      /pod 'Capacitor', :path => '[^']*@capacitor\/ios'/,
      `pod 'Capacitor', :path => '${RELATIVE_CAPACITOR_IOS}'`,
    )
    .replace(
      /pod 'CapacitorCordova', :path => '[^']*@capacitor\/ios'/,
      `pod 'CapacitorCordova', :path => '${RELATIVE_CAPACITOR_IOS}'`,
    );

  if (after.includes("PRISM/mcp-server/web/node_modules") || after.includes("PRISM\\mcp-server\\web\\node_modules")) {
    throw new Error("Podfile still contains a machine-specific PRISM node_modules path after normalization.");
  }
  if (after !== before) {
    writeFileSync(PODFILE, after, "utf8");
    console.log("[ios-build] Normalized Podfile Capacitor paths.");
  } else {
    console.log("[ios-build] Podfile Capacitor paths already portable.");
  }
}

function prepareIosScaffold() {
  if (!skipWebBuild) {
    run("Build web bundle", commandName("npm"), ["run", "build"]);
  }
  if (!existsSync(IOS_ROOT)) {
    run("Create iOS scaffold", commandName("npx"), ["cap", "add", "ios"]);
  }
  run("Sync Capacitor iOS assets", commandName("npx"), ["cap", "sync", "ios"]);
  normalizePodfile();
  if (!existsSync(WORKSPACE)) {
    throw new Error(`Xcode workspace not found at ${WORKSPACE}.`);
  }
}

function buildSimulatorApp() {
  if (process.platform !== "darwin") {
    throw new Error("iOS simulator builds require macOS with Xcode and CocoaPods.");
  }
  run("Install CocoaPods", "pod", ["install"], IOS_APP_ROOT);
  run("Build unsigned iOS simulator app", "xcodebuild", [
    "-workspace",
    "App.xcworkspace",
    "-scheme",
    "App",
    "-configuration",
    "Debug",
    "-sdk",
    "iphonesimulator",
    "-destination",
    "generic/platform=iOS Simulator",
    "-derivedDataPath",
    "build",
    "CODE_SIGN_IDENTITY=",
    "CODE_SIGNING_REQUIRED=NO",
    "CODE_SIGNING_ALLOWED=NO",
    "build",
  ], IOS_APP_ROOT);
  if (!existsSync(SIMULATOR_APP)) {
    throw new Error(`Expected simulator app was not produced at ${SIMULATOR_APP}.`);
  }
  console.log(`[ios-build] Simulator app ready: ${SIMULATOR_APP}`);
}

try {
  prepareIosScaffold();
  if (shouldBuildSimulator) {
    buildSimulatorApp();
  } else if (process.platform !== "darwin") {
    console.log("[ios-build] iOS scaffold is ready; Xcode build skipped because this host is not macOS.");
  }
} catch (error) {
  console.error(`[ios-build] ${error.message}`);
  process.exit(1);
}
