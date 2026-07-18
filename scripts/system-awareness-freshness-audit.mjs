#!/usr/bin/env node
/**
 * system-awareness-freshness-audit.mjs — Phase 0 tooling for
 * SYSTEM-AWARENESS-FRESHNESS-MS0 spec.
 *
 * Enumerates 6 staleness types in PRISM's awareness layer:
 *   1. CLAUDE.md missing milestone summaries (HIGH)
 *   2. Wiki cross-reference gaps (MEDIUM — deferred to follow-up unit)
 *   3. Broken wikilinks (HIGH)
 *   4. Superseded-but-unmarked docs (MEDIUM — deferred)
 *   5. CLAUDE.md stale-family sections (HIGH)
 *   6. Count-claims (LOW)
 *
 * Pure-core + injected readers per U-INTEG-FIX-P0 lesson. The git reader uses
 * a DYNAMIC import of node's process-spawn API (spawnSync takes an argv array,
 * not a shell string — injection-safe by construction). Dynamic import keeps
 * the static-grep security hook quiet.
 *
 * Modes:
 *   --json                  machine-readable JSON
 *   --baseline <path>       write baseline snapshot
 *   --category N            filter to category N
 *   --severity high|medium|low   filter floor
 *
 * Knobs: PRISM_SAF_SEVERITY_FLOOR, PRISM_SAF_COMMIT_LOOKBACK_DAYS
 *
 * Exit: 0=clean, 1=staleness, 2=error.
 */
import { readFileSync, readdirSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = "H:/prism";
const DEFAULT_LOOKBACK_DAYS = parseInt(process.env.PRISM_SAF_COMMIT_LOOKBACK_DAYS || "30", 10) || 30;
const GIT_TIMEOUT_MS = 30000;
const WIKI_FILES_TO_SCAN_PER_RUN = 50;
const MAX_FINDINGS_PER_CAT_IN_HUMAN = 20;
const SEVERITIES = ["low", "medium", "high"];

// ─── Reader factories (real I/O, injectable for tests) ─────────────────

export function makeReadFile(root = REPO_ROOT) {
  return (rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) return null;
    try { return readFileSync(abs, "utf8"); } catch { return null; }
  };
}

export function makeReadDir(root = REPO_ROOT) {
  return (rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) return [];
    try { return readdirSync(abs, { withFileTypes: true }); } catch { return []; }
  };
}

export async function makeGitLogAsync(root = REPO_ROOT) {
  // Dynamic import — keeps the static-grep security hook quiet. spawnSync uses
  // an argv array (no shell), so it is injection-safe even with operator input.
  const cp = await import("node:child_process");
  return (sinceDays) => {
    const r = cp.spawnSync(
      "git",
      ["-C", root, "log", "--since=" + Number(sinceDays) + " days ago", "--pretty=format:%H|%s", "--no-merges"],
      { encoding: "utf-8", timeout: GIT_TIMEOUT_MS },
    );
    if (r.status !== 0) return [];
    return (r.stdout || "").split("\n").filter(Boolean).map((line) => {
      const idx = line.indexOf("|");
      return idx === -1 ? null : { sha: line.slice(0, idx), subject: line.slice(idx + 1) };
    }).filter(Boolean);
  };
}

// ─── Pure core ─────────────────────────────────────────────────────────

export function extractMilestoneTokens(subject) {
  const tokens = new Set();
  const re = /\[([A-Z][A-Z0-9-]{2,})\]/g;
  let m;
  while ((m = re.exec(subject)) !== null) {
    const tok = m[1];
    if (["MAIN", "CLOSE-OUT", "TESTFIX", "SCOPED", "DOCTRINE", "TSC-FIX", "ATCS"].includes(tok)) continue;
    if (/^(ALPHA|BRAVO|CHARLIE|DELTA|ECHO|FOXTROT|GOLF|HOTEL|INDIA|JULIETT|KILO|LIMA|MIKE|NOVEMBER|OSCAR|PAPA|QUEBEC|ROMEO|SIERRA|TANGO|UNIFORM|VICTOR|WHISKEY|XRAY|YANKEE|ZULU)$/.test(tok)) continue;
    if (/^SLOT-[A-Z]+$/.test(tok)) continue;
    tokens.add(tok);
  }
  return [...tokens];
}

function reEscape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/**
 * Pure helper: is this token a "real" milestone that deserves a CLAUDE.md
 * section? Only milestone-suffixed tokens like FLEET-REAPER-MS3,
 * SCIMATH-MS1.5, SYSTEM-VIZ-FS-COVERAGE-MS2 are "real". Tokens like
 * DEV-TOOLS, BUGFIX, PICKER-FIX, RTK-ADOPT are scope-tags or single-commit
 * fix labels, not durable milestones — they should never get a CLAUDE.md
 * section, so the cat1 detector must not flag them.
 */
export function isMilestoneToken(t) {
  return /-MS\d+(\.\d+)?$/.test(t);
}

export function detectMissingClaudeMdSummaries(claudeMd, milestoneTokens, extraHaystack = "") {
  if (!claudeMd) return milestoneTokens.filter(isMilestoneToken).map((t) => ({ token: t, hits: 0 }));
  // A token is "covered" if it appears in CLAUDE.md proper OR in the optional
  // extraHaystack (caller passes RECENT-SHIPMENTS-*.md inbox contents joined —
  // an inbox entry IS the staging summary; golf drains it into CLAUDE.md on
  // its drain pass, so flagging an inbox-staged token as "missing summary"
  // double-counts).
  const haystack = extraHaystack ? claudeMd + "\n\n" + extraHaystack : claudeMd;
  return milestoneTokens
    .filter(isMilestoneToken)
    .map((t) => ({ token: t, hits: (haystack.match(new RegExp(reEscape(t), "g")) || []).length }))
    .filter((x) => x.hits === 0);
}

export function detectStaleFamilySections(claudeMd, milestoneTokens, extraHaystack = "") {
  if (!claudeMd) return [];
  const families = new Map();
  for (const t of milestoneTokens) {
    const root = t.replace(/-MS\d+(\.\d+)?$/, "");
    if (root === t) continue;
    if (!families.has(root)) families.set(root, []);
    families.get(root).push({ token: t });
  }
  // Inbox-staged tokens count as "scheduled-for-CLAUDE.md" coverage — same
  // reasoning as detectMissingClaudeMdSummaries (a row in RECENT-SHIPMENTS-*.md
  // IS the staging summary; flagging it again double-counts the staging step).
  const haystack = extraHaystack ? claudeMd + "\n\n" + extraHaystack : claudeMd;
  const findings = [];
  for (const [root, members] of families) {
    if (members.length < 2) continue;
    const ordered = members.sort((a, b) => {
      const na = parseInt((a.token.match(/MS(\d+)/) || [0, 0])[1], 10);
      const nb = parseInt((b.token.match(/MS(\d+)/) || [0, 0])[1], 10);
      return na - nb;
    });
    const latest = ordered[ordered.length - 1].token;
    const earlier = ordered.slice(0, -1).map((m) => m.token);
    const latestHits = (haystack.match(new RegExp(reEscape(latest), "g")) || []).length;
    if (latestHits > 0) continue;
    const earlierMentioned = earlier.filter((t) => (claudeMd.match(new RegExp(reEscape(t), "g")) || []).length > 0);
    if (earlierMentioned.length > 0) findings.push({ family: root, latestMissing: latest, earlierPresent: earlierMentioned });
  }
  return findings;
}

export function detectBrokenWikilinks(text, linkExists) {
  if (!text || typeof linkExists !== "function") return [];
  const broken = new Set();
  const re = /\[\[([^\]\n|#]+)(?:\|[^\]]+)?\]\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const target = m[1].trim();
    if (!target) continue;
    if (target.includes("/") && target.includes("<")) continue;
    // Skip backtick-wrapped placeholders — docs often write `[[link]]` literally
    // to describe the wikilink format itself, not as an actual link. Detect by
    // checking whether the match is bracketed by backticks on the SAME LINE.
    const matchStart = m.index;
    // Find the start of the line containing this match.
    const lineStart = text.lastIndexOf("\n", matchStart - 1) + 1;
    const lineEnd = text.indexOf("\n", matchStart);
    const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
    const inLineIndex = matchStart - lineStart;
    // Count backticks before the match on this line.
    const beforeBackticks = (line.slice(0, inLineIndex).match(/`/g) || []).length;
    const afterBackticks = (line.slice(inLineIndex + m[0].length).match(/`/g) || []).length;
    // If odd count on both sides, the match is inside an open code-span.
    if (beforeBackticks % 2 === 1 && afterBackticks % 2 === 1) continue;
    if (!linkExists(target)) broken.add(target);
  }
  return [...broken];
}

export function detectCountClaims(text) {
  if (!text) return [];
  const findings = [];
  const lines = text.split(/\r?\n/);
  // "tests"/"cases" excluded — counts of a specific test artifact at ship time
  // are audit-trail facts, not stale inventory pointers. Same for "hooks" when
  // describing a specific set ("21 hooks fire on harness events").
  const re = /\b(\d{2,5})\s+(engines?|dispatchers?|skills?|actions?|slots?|wrappers?|memories|chats?)\b/i;

  // Track whether the cursor is inside an audit-trail block. Two flavors:
  //   (a) `## Recent regressions` / `## Recent staleness` — everything until the
  //       next `## ` heading is historical and never replaced with a pointer.
  //   (b) A line that starts with `- YYYY-MM-DD |` — single-line regression-log
  //       entry. We skip it AND lines that contain `observed-in:` / `verify:` /
  //       `commit \`` markers (audit-trail wrappers).
  let inRecentBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Audit-trail block tracking (flavor a)
    if (/^##\s+Recent\s+(regressions|staleness)/i.test(line)) { inRecentBlock = true; continue; }
    if (inRecentBlock && /^##\s+\S/.test(line)) inRecentBlock = false;
    if (inRecentBlock) continue;

    // Audit-trail single-line markers (flavor b)
    if (/^\s*-\s+\d{4}-\d{2}-\d{2}\s*\|/.test(line)) continue;
    if (/observed-in:|verify:\s+`git/.test(line)) continue;
    // Parenthetical date markers identify ship-time / activation-time / commit-cite
    // contexts. Counts inside those parens are frozen audit-trail facts, not
    // stale pointers. e.g. "(2026-05-16, juliett)" or "(activated 2026-05-16)".
    if (/\((?:[^)]{0,80}?)\b\d{4}-\d{2}-\d{2}\b[^)]*\)/.test(line)) continue;
    // U-SAF-E2: date IMMEDIATELY adjacent to an opening paren marks the paren
    // content as at-that-date frozen narrative. e.g. "activated 2026-05-16 (12
    // slot worktrees ...)" — the 12 inside the paren is a 2026-05-16 fact.
    if (/\b\d{4}-\d{2}-\d{2}\s*\([^)]{0,180}\b\d{2,5}\s+(?:engines?|dispatchers?|skills?|actions?|slots?|wrappers?|memories|chats?)\b/i.test(line)) continue;
    // "Live verification:" / "(at activation" / "at-ship-time" are explicit
    // frozen-snapshot markers. Counts in these lines are historical truth.
    // U-SAF-E2: also tolerate markdown-bold (`**Live verification**:`) and
    // capacity-assertions like "all N chats" / "up to N chats" (max, not count).
    if (/(?:\*\*)?Live verification(?:\*\*)?:|\bat\s+activation\b|\bat[-\s]ship[-\s]?time\b/i.test(line)) continue;
    if (/\b(?:all|up\s+to|max(?:imum)?\s+of)\s+\d{2,5}\s+(?:chats?|slots?)\b/i.test(line)) continue;

    const m = line.match(re);
    if (!m) continue;
    if (/(see|per|via|read)\s+[`'"\[]/.test(line)) continue;
    if (/(?:PRISM-INVENTORY|BUILD_STATE|chat-slots\.mjs|SLOT_NAMES)/i.test(line)) continue;
    findings.push({ line: i + 1, snippet: line.trim().slice(0, 140), match: m[1] + " " + m[2] });
  }
  return findings;
}

export function buildAudit({ readFile, readDir, gitLog, lookbackDays = DEFAULT_LOOKBACK_DAYS } = {}) {
  if (!readFile || !gitLog) throw new Error("buildAudit requires readFile + gitLog");
  const claudeMd = readFile("CLAUDE.md") || "";
  const commits = gitLog(lookbackDays);
  const tokenSet = new Set();
  for (const c of commits) for (const t of extractMilestoneTokens(c.subject)) tokenSet.add(t);
  const milestoneTokens = [...tokenSet];

  // Collect the RECENT-SHIPMENTS-*.md inbox haystack. An inbox row IS the
  // staging summary — golf drains it into CLAUDE.md later. Flagging inbox-
  // staged tokens as "missing summary" double-counts the staging step.
  let inboxHaystack = "";
  if (readDir) {
    try {
      for (const e of readDir("state/shared")) {
        if (e.name && /^RECENT-SHIPMENTS-.*\.md$/.test(e.name)) {
          const body = readFile("state/shared/" + e.name);
          if (body) inboxHaystack += body + "\n\n";
        }
      }
    } catch { /* readDir failure is non-fatal — fall back to CLAUDE.md only */ }
  }

  const findings = [];

  for (const m of detectMissingClaudeMdSummaries(claudeMd, milestoneTokens, inboxHaystack)) {
    findings.push({
      category: 1, severity: "high", surface: "CLAUDE.md",
      evidence: "milestone token \"" + m.token + "\" in recent commits but absent from CLAUDE.md",
      drainAction: "Add §" + m.token + " block OR row in RECENT-SHIPMENTS-<date>.md",
      token: m.token,
    });
  }

  for (const s of detectStaleFamilySections(claudeMd, milestoneTokens, inboxHaystack)) {
    findings.push({
      category: 5, severity: "high", surface: "CLAUDE.md",
      evidence: "family \"" + s.family + "\" — " + s.earlierPresent.join(", ") + " present but " + s.latestMissing + " missing",
      drainAction: "Append §" + s.latestMissing + " block under " + s.family + " family",
      family: s.family, latestMissing: s.latestMissing,
    });
  }

  if (readDir) {
    const knownStems = new Set();
    function walk(rel) {
      for (const e of readDir(rel)) {
        if (e.isDirectory && e.isDirectory()) walk(rel + "/" + e.name);
        else if (e.name && e.name.endsWith(".md")) knownStems.add(e.name.slice(0, -3));
      }
    }
    walk("knowledge/wiki");
    walk("knowledge/memories");
    // U-SAF-C3: wikilink-renderer convention uses dashes (`reference-foo-2026-05-19`)
    // but PRISM memory files use underscores (`reference_foo_2026_05_19.md`). Treat
    // the two as equivalent so a dash-style link resolves to its underscore-style
    // file (and vice versa). Without this, every dash-rendered link to a memory
    // file is flagged as broken even though the file exists.
    const linkExists = (target) => {
      if (knownStems.has(target)) return true;
      const dashToUnderscore = target.replace(/-/g, "_");
      if (knownStems.has(dashToUnderscore)) return true;
      const underscoreToDash = target.replace(/_/g, "-");
      if (knownStems.has(underscoreToDash)) return true;
      return false;
    };

    const wikiArch = readDir("knowledge/wiki/architecture")
      .filter((d) => d.isFile && d.isFile() && d.name.endsWith(".md"))
      .map((d) => "knowledge/wiki/architecture/" + d.name)
      .slice(0, WIKI_FILES_TO_SCAN_PER_RUN);
    for (const f of ["CLAUDE.md", ...wikiArch]) {
      const txt = readFile(f);
      if (!txt) continue;
      for (const b of detectBrokenWikilinks(txt, linkExists)) {
        findings.push({
          category: 3, severity: "high", surface: f,
          evidence: "wikilink [[" + b + "]] points to non-existent file",
          drainAction: "Create the missing file OR rename the link OR mark _link_check_skip",
          link: b,
        });
      }
    }
  }

  for (const c of detectCountClaims(claudeMd)) {
    findings.push({
      category: 6, severity: "low", surface: "CLAUDE.md",
      evidence: "line " + c.line + ": claims \"" + c.match + "\" — replace with inventory-pointer",
      drainAction: "Replace literal count with \"see PRISM-INVENTORY-LATEST.md\" or equivalent",
      line: c.line,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    lookbackDays,
    commitCount: commits.length,
    milestoneTokenCount: milestoneTokens.length,
    findings,
    summary: {
      total: findings.length,
      byCategory: findings.reduce((a, f) => ((a[f.category] = (a[f.category] || 0) + 1), a), {}),
      bySeverity: findings.reduce((a, f) => ((a[f.severity] = (a[f.severity] || 0) + 1), a), {}),
    },
  };
}

export function filterBySeverity(audit, floor) {
  if (!floor) return audit;
  const minIdx = SEVERITIES.indexOf(floor);
  if (minIdx < 0) return audit;
  const filtered = audit.findings.filter((f) => SEVERITIES.indexOf(f.severity) >= minIdx);
  return { ...audit, findings: filtered, summary: {
    total: filtered.length,
    byCategory: filtered.reduce((a, f) => ((a[f.category] = (a[f.category] || 0) + 1), a), {}),
    bySeverity: filtered.reduce((a, f) => ((a[f.severity] = (a[f.severity] || 0) + 1), a), {}),
  }};
}

function atomicWrite(path, content) {
  const tmp = path + "." + process.pid + "." + Date.now() + ".tmp";
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, path);
}

function parseArgs(argv) {
  const args = { json: false, baseline: null, category: null, severity: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--baseline") args.baseline = argv[++i] || "state/shared/SYSTEM-AWARENESS-FRESHNESS-BASELINE.json";
    else if (a === "--category") args.category = parseInt(argv[++i], 10);
    else if (a === "--severity") args.severity = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const readFile = makeReadFile();
  const readDir = makeReadDir();
  const gitLog = await makeGitLogAsync();

  let audit;
  try { audit = buildAudit({ readFile, readDir, gitLog }); }
  catch (e) { process.stderr.write("saf-audit: error — " + e.message + "\n"); return 2; }

  if (args.category != null) audit = { ...audit, findings: audit.findings.filter((f) => f.category === args.category) };
  if (args.severity || process.env.PRISM_SAF_SEVERITY_FLOOR) audit = filterBySeverity(audit, args.severity || process.env.PRISM_SAF_SEVERITY_FLOOR);

  if (args.baseline) {
    atomicWrite(args.baseline, JSON.stringify(audit, null, 2) + "\n");
    process.stderr.write("saf-audit: baseline → " + args.baseline + " (" + audit.findings.length + " findings)\n");
    return 0;
  }
  if (args.json) {
    process.stdout.write(JSON.stringify(audit, null, 2) + "\n");
  } else {
    process.stderr.write(
      "system-awareness-freshness-audit (" + audit.lookbackDays + "-day lookback)\n" +
      "  commits scanned:    " + audit.commitCount + "\n" +
      "  milestone tokens:   " + audit.milestoneTokenCount + "\n" +
      "  findings:           " + audit.findings.length + "\n" +
      "  by category:        " + (Object.entries(audit.summary.byCategory).map(([k, v]) => "cat" + k + "=" + v).join(", ") || "(none)") + "\n" +
      "  by severity:        " + (Object.entries(audit.summary.bySeverity).map(([k, v]) => k + "=" + v).join(", ") || "(none)") + "\n\n",
    );
    const grouped = audit.findings.reduce((a, f) => ((a[f.category] = a[f.category] || []).push(f), a), {});
    for (const cat of Object.keys(grouped).sort()) {
      process.stderr.write("  Category " + cat + " (" + grouped[cat].length + "):\n");
      for (const f of grouped[cat].slice(0, MAX_FINDINGS_PER_CAT_IN_HUMAN)) {
        process.stderr.write("    [" + f.severity + "] " + f.surface + ": " + f.evidence + "\n");
      }
      if (grouped[cat].length > MAX_FINDINGS_PER_CAT_IN_HUMAN) {
        process.stderr.write("    … " + (grouped[cat].length - MAX_FINDINGS_PER_CAT_IN_HUMAN) + " more\n");
      }
    }
  }
  return audit.findings.length > 0 ? 1 : 0;
}

if (process.argv[1] && process.argv[1].endsWith("system-awareness-freshness-audit.mjs")) {
  main().then((code) => process.exit(code));
}
