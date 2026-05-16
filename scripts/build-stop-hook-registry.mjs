#!/usr/bin/env node
/**
 * build-stop-hook-registry.mjs — regenerates state/shared/STOP_HOOK_REGISTRY.json
 *
 * The hand-maintained STOP_HOOK_REGISTRY.json drifted 24 days stale (last
 * touched 2026-04-22) while 9 new `stop_on_*.mjs` Stop hooks shipped — so
 * `stop_on_hook_unregistered.mjs` started warning every session ("N stop-hooks
 * not in STOP_HOOK_REGISTRY.json"). There was NO generator (verified: grep
 * STOP_HOOK_REGISTRY scripts/ → 0). This is that generator.
 *
 * It scans `.claude/hooks/stop_on_*.mjs`, extracts {name,file,description,
 * severity,tier} from each header, and emits the canonical registry. Mirrors
 * the conventions of `build-hook-registry.mjs` (atomic tmp→rename write,
 * `.previous.json` backup, --check / --json / --self-test modes).
 *
 * Metadata extraction (deterministic, pure):
 *   - tier:        `// tier: T#` line → int; else "Tier N" in prose; else 6
 *   - severity:    HARD BLOCK / BLOCKS / "blocks exit" / "BLOCK:" → "block"
 *                  auto-release / "severity: pass" / cleanup-only       → "pass"
 *                  otherwise                                            → "warn"
 *   - description: first substantive JSDoc line — drops the `/**` opener,
 *                  `===`/`---` rule lines, the `<filename> — Stop hook`
 *                  echo line, and bare `Stop Hook:` headers; falls back to
 *                  a title-cased inference from the filename.
 *
 * Modes:
 *   (none)       regenerate, print 1-line summary. exit 0 ok / 1 error.
 *   --json       also dump the full registry to stdout.
 *   --check      do NOT write; exit 1 if on-disk registry is missing or its
 *                hook set differs from what would be generated now; else 0.
 *   --self-test  run internal assertions on the pure helpers; exit 0 iff pass.
 *
 * No subprocess spawns, no network. Pure fs + JSON.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..").split("\\").join("/");
const HOOKS_DIR = path.join(REPO_ROOT, ".claude", "hooks").split("\\").join("/");
const REGISTRY = path.join(REPO_ROOT, "state", "shared", "STOP_HOOK_REGISTRY.json").split("\\").join("/");
const SCHEMA_VERSION = 1;

/**
 * Infer a human description from a `stop_on_foo_bar.mjs` filename when the
 * header has none: "stop_on_repeat_error" → "Stop on repeat error".
 */
export function inferDescriptionFromName(filename) {
  const base = String(filename || "").replace(/\.mjs$/, "");
  const rest = base.replace(/^stop_on_/, "").replace(/_/g, " ").trim();
  if (!rest) return "Stop hook";
  return "Stop on " + rest;
}

/**
 * Extract {name,file,description,severity,tier} from one stop-hook's source.
 * Pure — no I/O. Robust to: empty src, no JSDoc, filename-echo-only JSDoc,
 * CRLF, missing tier marker, non-numeric tier.
 */
export function extractStopHookMeta(src, filename) {
  const name = String(filename || "").replace(/\.mjs$/, "");
  const text = typeof src === "string" ? src.replace(/\r\n/g, "\n") : "";

  // tier: `// tier: T4` (preferred) or prose "Tier 6"
  let tier = 6;
  const tierLine = text.match(/^\s*\/\/\s*tier:\s*T?(\d+)/im);
  if (tierLine) {
    tier = Number.parseInt(tierLine[1], 10);
  } else {
    const tierProse = text.match(/\bTier\s+(\d+)\b/i);
    if (tierProse) tier = Number.parseInt(tierProse[1], 10);
  }
  if (!Number.isFinite(tier) || tier < 0 || tier > 9) tier = 6;

  // severity from intent words in the first ~1500 chars of header
  const head = text.slice(0, 1500);
  let severity = "warn";
  if (/\bHARD BLOCK\b|\bBLOCKS\b|blocks?\s+(?:exit|session|termination)|\bBLOCK:/i.test(head)) {
    severity = "block";
  } else if (/auto-?release|severity:\s*pass|cleanup[- ]only|"severity":\s*"pass"/i.test(head)) {
    severity = "pass";
  }

  // description: walk JSDoc body lines, drop noise, take first substantive.
  let description = "";
  const jsdoc = text.match(/\/\*\*([\s\S]*?)\*\//);
  if (jsdoc) {
    const lines = jsdoc[1]
      .split("\n")
      .map((l) => l.replace(/^\s*\*\s?/, "").trim())
      .filter(Boolean);
    const fnameEcho = new RegExp(
      "^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\.mjs)?\\s*[—-]\\s*(?:Tier\\s*\\d+\\s*)?Stop ?[Hh]ook\\.?$",
      "i"
    );
    for (const line of lines) {
      if (/^[=_-]{3,}$/.test(line)) continue;            // ===== / ----- rules
      if (/^Stop Hook:?\s*$/i.test(line)) continue;        // bare "Stop Hook:"
      if (fnameEcho.test(line)) continue;                  // "foo.mjs — Stop hook"
      if (/^@\w+/.test(line)) continue;                    // @milestone etc.
      // "Stop Hook: Content Deletion Guard" → keep the part after the colon
      const titled = line.match(/^Stop Hook:\s*(.+)$/i);
      description = (titled ? titled[1] : line).trim();
      break;
    }
  }
  if (!description) description = inferDescriptionFromName(filename);
  if (description.length > 160) description = description.slice(0, 157) + "...";

  return { name, file: name + ".mjs", description, severity, tier };
}

/**
 * Scan the hooks dir for `stop_on_*.mjs` (excludes test/smoke/disabled).
 * Returns sorted array of {name,file,description,severity,tier}. Unreadable
 * files are skipped and surfaced in the returned `.skipped`.
 */
export function scanStopHooks(hooksDir) {
  const result = { hooks: [], skipped: [] };
  let entries;
  try {
    entries = fs.readdirSync(hooksDir, { withFileTypes: true });
  } catch {
    return result;
  }
  const names = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => n.startsWith("stop_on_") && n.endsWith(".mjs"))
    .filter((n) => !n.endsWith(".test.mjs") && !n.endsWith(".disabled") && !n.startsWith("_"))
    .sort();
  for (const n of names) {
    let src;
    try {
      src = fs.readFileSync(path.join(hooksDir, n), "utf8");
    } catch (e) {
      result.skipped.push({ file: n, reason: String((e && e.message) || e) });
      continue;
    }
    result.hooks.push(extractStopHookMeta(src, n));
  }
  return result;
}

/** Assemble the full registry object (pure given a scan result). */
export function buildRegistry(scan) {
  return {
    schemaVersion: SCHEMA_VERSION,
    description: "Tier 6 stop-hooks registry for session exit validation",
    lastUpdated: new Date().toISOString(),
    generatedBy: "scripts/build-stop-hook-registry.mjs",
    counts: {
      total: scan.hooks.length,
      bySeverity: scan.hooks.reduce((a, h) => ((a[h.severity] = (a[h.severity] || 0) + 1), a), {}),
      skipped: scan.skipped.length,
    },
    hooks: scan.hooks,
    skipped: scan.skipped,
  };
}

function atomicWriteJson(file, obj) {
  const tmp = file + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

function selfTest() {
  const fails = [];
  const ok = (cond, msg) => { if (!cond) fails.push(msg); };

  // tier extraction
  ok(extractStopHookMeta("// tier: T4\n/** x */", "stop_on_a.mjs").tier === 4, "tier T4");
  ok(extractStopHookMeta("// tier: T0\n/** x */", "stop_on_a.mjs").tier === 0, "tier T0");
  ok(extractStopHookMeta("/** no tier */", "stop_on_a.mjs").tier === 6, "tier default 6");
  ok(extractStopHookMeta("/** runs as Tier 6 thing */", "stop_on_a.mjs").tier === 6, "tier prose");
  ok(extractStopHookMeta("// tier: T99\n/** x */", "stop_on_a.mjs").tier === 6, "tier out-of-range→6");

  // severity
  ok(extractStopHookMeta("/** HARD BLOCK: prevents x */", "stop_on_a.mjs").severity === "block", "sev block (HARD BLOCK)");
  ok(extractStopHookMeta("/** BLOCKS session termination */", "stop_on_a.mjs").severity === "block", "sev block (BLOCKS)");
  ok(extractStopHookMeta('/** severity: pass — auto-release */', "stop_on_a.mjs").severity === "pass", "sev pass");
  ok(extractStopHookMeta("/** just surfaces a note */", "stop_on_a.mjs").severity === "warn", "sev warn default");

  // description: filename-echo dropped, real desc taken
  const m1 = extractStopHookMeta(
    "// tier: T4\n/**\n * stop_on_repeat_error.mjs — Stop hook\n *\n * Reads error-memory.json and blocks on repeats.\n */",
    "stop_on_repeat_error.mjs"
  );
  ok(/Reads error-memory/.test(m1.description), "desc skips filename echo: " + m1.description);

  // description: "Stop Hook: Title" form → keep title
  const m2 = extractStopHookMeta(
    "/**\n * Stop Hook: Content Deletion Guard\n * ===\n * HARD BLOCK x\n */",
    "stop_on_content_deletion.mjs"
  );
  ok(m2.description === "Content Deletion Guard", "desc title form: " + m2.description);
  ok(m2.severity === "block", "title-form severity still block");

  // description: separator + bare-header skipped, fallback inference
  const m3 = extractStopHookMeta("/**\n * =====\n * Stop Hook:\n */", "stop_on_foo_bar.mjs");
  ok(m3.description === "Stop on foo bar", "desc fallback inference: " + m3.description);

  // adversarial
  ok(extractStopHookMeta("", "stop_on_x.mjs").description === "Stop on x", "empty src → inferred");
  ok(extractStopHookMeta(null, "stop_on_x.mjs").tier === 6, "null src → tier 6");
  ok(extractStopHookMeta("no comment at all", "stop_on_y_z.mjs").description === "Stop on y z", "no jsdoc → inferred");
  const long = "/**\n * " + "x".repeat(300) + "\n */";
  ok(extractStopHookMeta(long, "stop_on_a.mjs").description.length <= 160, "desc capped at 160");

  // buildRegistry shape
  const reg = buildRegistry({ hooks: [{ name: "stop_on_a", file: "stop_on_a.mjs", description: "d", severity: "warn", tier: 6 }], skipped: [] });
  ok(reg.schemaVersion === SCHEMA_VERSION && reg.counts.total === 1 && reg.counts.bySeverity.warn === 1, "buildRegistry shape");
  ok(Array.isArray(reg.hooks) && Array.isArray(reg.skipped), "buildRegistry arrays");

  if (fails.length) {
    console.error("SELF-TEST FAIL:\n - " + fails.join("\n - "));
    process.exit(1);
  }
  console.log("SELF-TEST PASS (" + 18 + " assertions)");
  process.exit(0);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) return selfTest();

  const scan = scanStopHooks(HOOKS_DIR);
  if (scan.hooks.length === 0) {
    console.error("ERROR: no stop_on_*.mjs found under " + HOOKS_DIR);
    process.exit(1);
  }
  const registry = buildRegistry(scan);

  if (argv.includes("--check")) {
    let onDisk = null;
    try { onDisk = JSON.parse(fs.readFileSync(REGISTRY, "utf8")); } catch { /* missing/corrupt */ }
    const want = new Set(registry.hooks.map((h) => h.file));
    const have = new Set(((onDisk && onDisk.hooks) || []).map((h) => h.file || h.name + ".mjs"));
    const missing = [...want].filter((f) => !have.has(f));
    const extra = [...have].filter((f) => !want.has(f));
    if (!onDisk || missing.length || extra.length) {
      console.error(`STALE: missing=${missing.length} extra=${extra.length}` +
        (missing.length ? " | missing: " + missing.slice(0, 5).join(", ") : ""));
      process.exit(1);
    }
    console.log("OK: STOP_HOOK_REGISTRY.json matches disk (" + registry.hooks.length + " hooks)");
    process.exit(0);
  }

  // backup prior, then atomic write
  try {
    if (fs.existsSync(REGISTRY)) {
      fs.copyFileSync(REGISTRY, REGISTRY.replace(/\.json$/, ".previous.json"));
    }
  } catch { /* non-fatal */ }
  try {
    atomicWriteJson(REGISTRY, registry);
  } catch (e) {
    console.error("ERROR: write failed: " + ((e && e.message) || e));
    process.exit(1);
  }

  if (argv.includes("--json")) {
    console.log(JSON.stringify(registry, null, 2));
  } else {
    const bs = registry.counts.bySeverity;
    console.log(
      `STOP_HOOK_REGISTRY.json regenerated: ${registry.counts.total} hooks ` +
      `(block=${bs.block || 0} warn=${bs.warn || 0} pass=${bs.pass || 0})` +
      (registry.counts.skipped ? ` · ${registry.counts.skipped} skipped` : "")
    );
  }
  process.exit(0);
}

const isCli =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/").toLowerCase() ===
    path.resolve(process.argv[1]).replace(/\\/g, "/").toLowerCase();
if (isCli) main();
