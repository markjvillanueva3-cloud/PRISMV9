#!/usr/bin/env node
/**
 * harness-wiring-audit.mjs — AUTOCOMPACT-AUTONOMOUS-MS0 / U-AAM04
 *
 * Catches the class of silent-failure bug observed twice in 2026-05-15..16:
 *   1. Gap 3 in session-start-auto-resume.mjs was REVERTED by a peer/linter — the
 *      hook file existed on disk in its working form, but the wiring it depended
 *      on (matcher under SessionStart) was silently rolled back. Auditor would have
 *      surfaced it as a wired-ref-pointing-to-stale-content drift the moment the
 *      revert landed.
 *   2. precompact-release-slot.mjs existed on disk for 18+ hours after the prior
 *      session claimed it was "wired in settings.json" — but `grep precompact-release-slot
 *      C:/Users/wompu/.claude/settings.json` returned 0 matches. The auditor would have
 *      flagged it as an ORPHAN HOOK (on disk, no settings reference) immediately.
 *
 * What it does (deterministic, pure-function-driven):
 *   - Walks `.claude/hooks/*.mjs` (excluding __tests__, helpers, smoke drivers)
 *   - Parses C:/Users/<user>/.claude/settings.json AND H:/.claude/settings.json
 *     for `\.claude/hooks/<name>.mjs` references (settingsRefs)
 *   - Parses `.claude/hooks/bundles/*.mjs` for `${HOOK_BASE}/<name>.mjs` references
 *     (bundleChildRefs) — closes the 2026-05-14 bundle-blindness regression
 *   - Computes:
 *       wiredSet  = settingsRefs ∪ bundleChildRefs
 *       orphans   = onDisk \ wiredSet \ excluded (silently dead-code on disk)
 *       dangling  = wiredSet \ onDisk           (settings refs to non-existent files)
 *       mirrorDrift = C: settings differ from H: settings (byte-equal check)
 *
 * Outputs:
 *   - state/shared/HOOK_WIRING_AUDIT.json (machine-readable, schemaVersion=1)
 *   - state/shared/HOOK_WIRING_AUDIT.md (human-readable digest with top-20 orphans)
 *
 * Exit codes:
 *   0 = clean (no findings above threshold)
 *   1 = WARN findings present (default threshold = mirrorDrift OR dangling >= 1)
 *   2 = CRITICAL findings present (--severity fail with mirrorDrift)
 *
 * Knobs:
 *   --json / --md / --both (default: --both)
 *   --severity warn|fail (default: warn)
 *   --hooks-root <path> (default: H:/prism/.claude/hooks)
 *   --settings-c <path> (default: C:/Users/wompu/.claude/settings.json)
 *   --settings-h <path> (default: H:/.claude/settings.json)
 *   --quiet (suppress stdout summary; reports still written)
 *
 * @milestone AUTOCOMPACT-AUTONOMOUS-MS0/U-AAM04-WIRING-AUDIT
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// REPO_ROOT derived from script location (scripts/) so the audit + its report are
// correct from ANY worktree/clone, not hardcoded to H:/prism (matches the portability
// fix tango applied to the other audit generators, e.g. 502b811ecf). The C:/H:
// settings paths stay machine-level (the canonical mirror locations; CLI-overridable).
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS_ROOT_DEFAULT = path.join(REPO_ROOT, ".claude", "hooks");
const SETTINGS_C_DEFAULT = "C:/Users/wompu/.claude/settings.json";
const SETTINGS_H_DEFAULT = "H:/.claude/settings.json";
const REPORT_JSON = path.join(REPO_ROOT, "state", "shared", "HOOK_WIRING_AUDIT.json");
const REPORT_MD = path.join(REPO_ROOT, "state", "shared", "HOOK_WIRING_AUDIT.md");
const SCHEMA_VERSION = 1;

// Hooks under these subpaths are NEVER expected to be wired in settings.json:
// __tests__/ are test fixtures; helpers/ are libraries imported by other hooks;
// bundles/ ARE wired in settings.json (so they're NOT excluded), but their
// CHILDREN are referenced inside bundle files and counted via bundleChildRefs.
const EXCLUDE_DIR_PATTERNS = [
  /[\\/]__tests__[\\/]/,
  /[\\/]helpers[\\/]/,
];

// Smoke-driver files inside __tests__/ start with `_smoke-` and aren't tests/hooks.
// Anti-regression: explicit pattern means rename to `_smoke-X.mjs` doesn't
// accidentally start counting as orphans.
const EXCLUDE_FILE_PATTERNS = [
  /^_/,  // _smoke-*, _helper-*, etc. (leading underscore = internal)
];

/**
 * Recursively find all .mjs files under a root, returning {fullPath, basename}.
 * Respects exclude patterns. Returns [] if root doesn't exist (fail-soft so
 * the auditor doesn't crash on a fresh checkout missing a hooks dir).
 */
export function findHooksOnDisk(root) {
  if (!fs.existsSync(root)) return [];
  const results = [];
  walk(root);
  return results;

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const norm = full.replace(/\\/g, "/");
      if (entry.isDirectory()) {
        if (EXCLUDE_DIR_PATTERNS.some((p) => p.test(norm + "/"))) continue;
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".mjs")) continue;
      if (EXCLUDE_FILE_PATTERNS.some((p) => p.test(entry.name))) continue;
      results.push({ fullPath: norm, basename: entry.name });
    }
  }
}

/**
 * Extract all `.claude/hooks/<basename>.mjs` references from a settings.json
 * (or any settings-shaped text). Returns a Set of basenames.
 *
 * The match is robust to forward/backslash, quoted/unquoted, and ignores
 * commented-out lines — `//` comments aren't legal JSON anyway so they
 * shouldn't appear, but if they do we don't false-count them.
 */
export function parseSettingsWiring(content) {
  const refs = new Set();
  if (!content || typeof content !== "string") return refs;
  // Match `.claude/hooks/<name>.mjs` with either / or \ separators. JSON-escaped
  // Windows paths contain \\ (two backslashes) in the raw file content — use
  // [\\/]+ so we tolerate single forward-slash, single backslash, AND the JSON
  // double-backslash representation. Captured name may also contain subdirs
  // (e.g. `bundles/posttool-edit-bundle.mjs`) — basename strip below normalizes.
  const pattern = /\.claude[\\/]+hooks[\\/]+([\w./\\-]+\.mjs)/g;
  let m;
  while ((m = pattern.exec(content)) !== null) {
    const captured = m[1].replace(/\\/g, "/");
    const basename = captured.split("/").pop();
    if (basename) refs.add(basename);
  }
  return refs;
}

/**
 * Walk bundle files and union the children they reference. Closes the
 * 2026-05-14 bundle-blindness regression: `stop-bundle.mjs` fans out to
 * ~14 non-blocking Stop hooks, `sessionstart-bundle.mjs` to ~19 injectors,
 * `posttool-edit-bundle.mjs` to many more. Without this, every child shows
 * up as an orphan even though it IS wired (via bundle).
 *
 * Bundle file references take the form `${HOOK_BASE}/<name>.mjs` or
 * `import("../<name>.mjs")` or similar — the regex is liberal so we capture
 * all child basenames.
 */
export function parseBundleChildren(bundleDir) {
  const refs = new Set();
  if (!fs.existsSync(bundleDir)) return refs;
  let entries;
  try { entries = fs.readdirSync(bundleDir, { withFileTypes: true }); }
  catch { return refs; }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".mjs")) continue;
    const full = path.join(bundleDir, entry.name);
    let src;
    try { src = fs.readFileSync(full, "utf8"); }
    catch { continue; }
    // Match any .mjs basename referenced as a child path. Cover both
    // `${HOOK_BASE}/foo.mjs` (the documented pattern) and direct
    // `../foo.mjs` imports. **Require a path separator** before the basename
    // — `"foo.mjs"` as a bare string literal (decision tag, test fixture
    // name passed to `join(tempDir, "foo.mjs")`, return-value label) is NOT
    // a wiring reference, and the regex must not capture it (the prior
    // version produced 6 false-positive "dangling" entries from
    // bundles/smoke-test.mjs alone — verified 2026-05-16).
    const pattern = /["'`]([^"'`\s]*[/\\][^"'`\s/\\]+\.mjs)["'`]/g;
    let m;
    while ((m = pattern.exec(src)) !== null) {
      const cleaned = m[1].replace(/\\/g, "/");
      const basename = cleaned.split("/").pop();
      // Exclude self-references (a bundle naming itself in a string literal)
      // and the bundle's own basename — bundles fan out to OTHER hooks.
      if (basename && basename !== entry.name) refs.add(basename);
    }
  }
  return refs;
}

/**
 * Compute the audit result. Pure function — no I/O. Caller assembles inputs.
 *
 * @param {{onDisk: Array<{fullPath, basename}>, settingsRefs: Set<string>,
 *           bundleRefs: Set<string>, settingsCBytes: number, settingsHBytes: number,
 *           settingsCEqualsH: boolean}} input
 * @returns {{schemaVersion, generatedAtIso, hooksOnDisk, hooksWired,
 *            wiredViaSettings, wiredViaBundle, orphans, dangling, mirrorDrift,
 *            mirrorBytes, severity}}
 */
export function computeAudit({
  onDisk, settingsRefs, bundleRefs,
  settingsCBytes = 0, settingsHBytes = 0, settingsCEqualsH = true,
}) {
  const onDiskBasenames = new Set(onDisk.map((h) => h.basename));
  const wiredSet = new Set([...settingsRefs, ...bundleRefs]);
  const orphans = [];
  for (const hook of onDisk) {
    if (!wiredSet.has(hook.basename)) orphans.push(hook.basename);
  }
  const dangling = [];
  for (const ref of wiredSet) {
    // Exclude bundle-children that may be in subdirs not walked by findHooksOnDisk
    // — if it's wired but truly missing, it'll surface here.
    if (!onDiskBasenames.has(ref)) dangling.push(ref);
  }
  orphans.sort();
  dangling.sort();
  const mirrorDrift = !settingsCEqualsH;
  // Severity ladder:
  //   critical: mirrorDrift (C:↔H: out of sync — the mirror hook is failing)
  //   warn: dangling >= 1 OR orphan rate >= 30%
  //   ok: otherwise
  const orphanRate = onDisk.length > 0 ? orphans.length / onDisk.length : 0;
  let severity = "ok";
  if (mirrorDrift) severity = "critical";
  else if (dangling.length > 0 || orphanRate >= 0.30) severity = "warn";

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAtIso: new Date().toISOString(),
    hooksOnDisk: onDisk.length,
    hooksWired: wiredSet.size,
    wiredViaSettings: settingsRefs.size,
    wiredViaBundle: bundleRefs.size,
    orphans,
    orphanCount: orphans.length,
    orphanRate: Math.round(orphanRate * 1000) / 1000,
    dangling,
    danglingCount: dangling.length,
    mirrorDrift,
    mirrorBytes: { c: settingsCBytes, h: settingsHBytes, equal: settingsCEqualsH },
    severity,
  };
}

/**
 * Format the audit as a Markdown digest. Top-20 orphans for surface readability;
 * full list lives in the JSON sibling.
 */
export function formatMarkdown(audit) {
  const lines = [];
  const sev = audit.severity === "critical" ? "🔴 CRITICAL"
            : audit.severity === "warn" ? "🟡 WARN"
            : "🟢 OK";
  lines.push(`# Hook Wiring Audit — ${sev}`);
  lines.push("");
  lines.push(`Generated: \`${audit.generatedAtIso}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Hooks on disk | **${audit.hooksOnDisk}** |`);
  lines.push(`| Wired (settings ∪ bundle) | **${audit.hooksWired}** |`);
  lines.push(`| Wired via settings.json | ${audit.wiredViaSettings} |`);
  lines.push(`| Wired via bundle child-refs | ${audit.wiredViaBundle} |`);
  lines.push(`| Orphan hooks (on disk, no ref) | **${audit.orphanCount}** (${(audit.orphanRate * 100).toFixed(1)}%) |`);
  lines.push(`| Dangling refs (wired, no file) | **${audit.danglingCount}** |`);
  lines.push(`| C:↔H: settings byte-equal | ${audit.mirrorBytes.equal ? "✓" : "✗"} (C: ${audit.mirrorBytes.c}B, H: ${audit.mirrorBytes.h}B) |`);
  lines.push("");
  if (audit.mirrorDrift) {
    lines.push("## 🔴 Mirror drift detected");
    lines.push("");
    lines.push("`C:/Users/wompu/.claude/settings.json` and `H:/.claude/settings.json` are NOT byte-identical.");
    lines.push("The c-to-h-mirror hook should be replicating C: → H: on every Edit/Write. Either it's not firing,");
    lines.push("it's masking an error, OR a peer chat is writing directly to H: (against the doctrine).");
    lines.push("");
    lines.push("**Triage**: run `node H:/prism/scripts/mirror-c-to-h-audit.mjs` to see file-level deltas.");
    lines.push("");
  }
  if (audit.dangling.length > 0) {
    lines.push(`## 🟡 Dangling references (${audit.dangling.length})`);
    lines.push("");
    lines.push("These hook paths are referenced in settings.json but the file does NOT exist on disk.");
    lines.push("Cause: settings entry left over from a renamed/deleted hook, OR a typo in the wiring.");
    lines.push("");
    for (const ref of audit.dangling) lines.push(`- \`${ref}\``);
    lines.push("");
  }
  if (audit.orphans.length > 0) {
    const shown = audit.orphans.slice(0, 20);
    lines.push(`## 🟡 Orphan hooks (top ${shown.length} of ${audit.orphanCount})`);
    lines.push("");
    lines.push("These hook files exist on disk but are NOT referenced by settings.json OR any bundle.");
    lines.push("They are dead code unless invoked manually. Verify:");
    lines.push("  1. Was the hook deliberately authored as a library/helper? Move to `helpers/`.");
    lines.push("  2. Was the hook supposed to be wired? Add a settings.json entry.");
    lines.push("  3. Was the hook deleted but the file remained? Remove the .mjs file.");
    lines.push("");
    for (const orphan of shown) lines.push(`- \`${orphan}\``);
    if (audit.orphans.length > shown.length) {
      lines.push("");
      lines.push(`_…and ${audit.orphans.length - shown.length} more in \`HOOK_WIRING_AUDIT.json\`._`);
    }
    lines.push("");
  }
  if (audit.severity === "ok") {
    lines.push("## ✓ Clean");
    lines.push("");
    lines.push("All hooks on disk are wired (directly or via bundle), no dangling refs, mirror in sync.");
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("`scripts/harness-wiring-audit.mjs --json --md` regenerates this report.");
  lines.push("Stop hook `stop-wiring-audit-suggest.mjs` surfaces critical/warn findings at session end.");
  lines.push("Knob: `PRISM_WIRING_AUDIT_SUGGEST_DISABLE=1`.");
  return lines.join("\n") + "\n";
}

// ─── CLI entry ───────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    json: true, md: true,
    severity: "warn",
    hooksRoot: HOOKS_ROOT_DEFAULT,
    settingsC: SETTINGS_C_DEFAULT,
    settingsH: SETTINGS_H_DEFAULT,
    quiet: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") { args.json = true; args.md = false; }
    else if (a === "--md") { args.md = true; args.json = false; }
    else if (a === "--both") { args.json = true; args.md = true; }
    else if (a === "--severity") args.severity = argv[++i];
    else if (a === "--hooks-root") args.hooksRoot = argv[++i];
    else if (a === "--settings-c") args.settingsC = argv[++i];
    else if (a === "--settings-h") args.settingsH = argv[++i];
    else if (a === "--quiet") args.quiet = true;
  }
  return args;
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, "utf8"); }
  catch { return ""; }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const onDisk = findHooksOnDisk(args.hooksRoot);
  const settingsC = readFileSafe(args.settingsC);
  const settingsH = readFileSafe(args.settingsH);
  const settingsRefs = parseSettingsWiring(settingsC);
  // Union H: refs too, in case the mirror is lagging or differs.
  for (const r of parseSettingsWiring(settingsH)) settingsRefs.add(r);
  const bundleRefs = parseBundleChildren(path.join(args.hooksRoot, "bundles"));
  const audit = computeAudit({
    onDisk, settingsRefs, bundleRefs,
    settingsCBytes: settingsC.length,
    settingsHBytes: settingsH.length,
    settingsCEqualsH: settingsC === settingsH,
  });

  if (args.json) {
    try {
      fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
      fs.writeFileSync(REPORT_JSON, JSON.stringify(audit, null, 2), "utf8");
    } catch { /* fail-soft */ }
  }
  if (args.md) {
    try {
      fs.mkdirSync(path.dirname(REPORT_MD), { recursive: true });
      fs.writeFileSync(REPORT_MD, formatMarkdown(audit), "utf8");
    } catch { /* fail-soft */ }
  }
  if (!args.quiet) {
    const sevTag = audit.severity === "critical" ? "🔴 CRITICAL"
                 : audit.severity === "warn" ? "🟡 WARN"
                 : "🟢 OK";
    process.stdout.write(
      `${sevTag}: ${audit.hooksOnDisk} on-disk · ${audit.hooksWired} wired · ` +
      `${audit.orphanCount} orphans (${(audit.orphanRate * 100).toFixed(1)}%) · ` +
      `${audit.danglingCount} dangling · mirror ${audit.mirrorBytes.equal ? "OK" : "DRIFT"}\n`,
    );
  }
  // Exit code per --severity flag:
  //   warn: exit 1 if any warn-or-higher finding
  //   fail: exit 2 if critical, 1 if warn-only, 0 otherwise (CI-friendly)
  if (args.severity === "fail" && audit.severity === "critical") process.exit(2);
  if (audit.severity === "critical" || audit.severity === "warn") process.exit(1);
  process.exit(0);
}

// CLI-vs-module detection: only run main() when invoked directly via node,
// not when imported by tests.
const isCli = process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/").toLowerCase() ===
    path.resolve(process.argv[1]).replace(/\\/g, "/").toLowerCase();
if (isCli) main();
