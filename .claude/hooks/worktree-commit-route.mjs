#!/usr/bin/env node
// tier: T0
/**
 * worktree-commit-route.mjs — PreToolUse(Bash) worktree-routing enforcement
 *
 * WHY: 6 concurrent chats all try to commit to H:/prism (the main
 * worktree). git-anti-clobber.mjs serializes but does NOT route — two
 * chats doing unrelated work still collide on HEAD. The user has 15
 * worktrees already set up, one per active work theme. This hook
 * intercepts `git commit` and checks whether the current working
 * directory matches a worktree whose branch name maps to the commit's
 * intent. If not, it deny-with-reason so the chat can re-enter the right
 * worktree or create a new one.
 *
 * ── ACTIVATION (SLOT-WORKTREE-MS0/U-P1-ROUTE-ACTIVATE, 2026-05-14) ──────
 * This hook ships ENV-OPT-IN, DEFAULT OFF. It is wired into bash-bundle.mjs
 * but does NOTHING unless `PRISM_WORKTREE_ROUTE_ENABLE=1` is set in the
 * environment. Rationale: until the per-slot worktrees exist (SLOT-WORKTREE-MS0
 * P3-CUTOVER), every chat shares H:/prism on cad-fusion-live-ms0 — arming this
 * hook fleet-wide would deny routine commits that have no themed worktree to
 * route to. Default-OFF lets the fleet adopt incrementally: a chat that has its
 * own slot worktree sets the env var; the rest are unaffected.
 * The milestone's P3-DEFAULT-ON unit flips the default once every chat is on a
 * slot worktree. Kill switch (always available, even after default-on):
 * `PRISM_WORKTREE_ROUTE_DISABLE=1` hard-disables regardless of the enable flag.
 *
 * ── CROSS-CUTTING SCOPE WHITELIST ──────────────────────────────────────
 * Even when armed, commit subjects whose leading scope token matches one of
 * CROSS_CUTTING_SCOPES (INFRA-FIX, INFRA-CLEANUP, HOOK-FIX, FLEET-FIX) are
 * allowed on the main tree — they affect every chat, so routing them into one
 * themed worktree would be wrong. `[MAIN-FORCE]` is the unconditional bypass;
 * `[MAIN]` is a softer override — it allows genuinely cross-cutting work, but
 * if the staged files cluster on a theme that HAS a dedicated worktree it
 * still denies with a route hint (use `[MAIN-FORCE]` to bypass that check).
 *
 * FIRES ON:  PreToolUse, matcher ^Bash$ (via bash-bundle.mjs)
 * ACTION:    deny when the commit would land on main while a matching
 *            work/* worktree exists, OR when the commit subject does not
 *            correspond to any active worktree AND the cwd is main.
 * NON-BLOCKING PATHS (allow):
 *   - PRISM_WORKTREE_ROUTE_ENABLE unset/!=1 (default — hook is dormant)
 *   - PRISM_WORKTREE_ROUTE_DISABLE=1 (kill switch — always wins)
 *   - commit from within a non-main worktree whose branch matches the
 *     commit scope token (e.g. committing on work/lathe-master while
 *     subject contains LATHE)
 *   - commits with subject prefix [MAIN] (explicit user override)
 *   - commit subjects whose scope token is in CROSS_CUTTING_SCOPES
 *   - empty/no-subject commits (let git decide — the anti-clobber hook
 *     handles serialization, not routing)
 *
 * DETECTION:
 *   1. Parse cmd: `git commit [-am "subject"]` / `git commit -m "..."` /
 *      heredoc form (`git commit -m "$(cat <<EOF ... EOF)"`).
 *   2. Extract the subject line (first line of the -m arg).
 *   3. Extract a SCOPE TOKEN from the subject — first token before
 *      colon/slash (e.g. "LATHE-PROD-READY-MS0/U-LPR-CRUD-WIRE: …"
 *      → "LATHE").
 *   4. Call `git worktree list --porcelain`. For each worktree, extract
 *      the branch basename (work/lathe-master → "lathe-master").
 *   5. Match scope token against branch basename via substring (case
 *      insensitive): SCOPE matches BRANCH iff scope.includes(branchHead)
 *      OR branchHead.includes(scope.toLowerCase()). Heuristic but
 *      practical — "LATHE" matches "lathe-master".
 *   6. Decide:
 *        - If cwd is a matching worktree       → allow
 *        - If cwd is main AND a match exists   → deny with route hint
 *        - If cwd is main AND no match exists  → allow with warning
 *          (the user is genuinely on a main-branch task)
 *        - If cwd is a non-matching worktree   → deny (wrong tree)
 *
 * SIDE EFFECTS: none. Reads `git worktree list` via spawnSync (synchronous
 * because this is a PreToolUse decision). Max timeout 2s.
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { exit } from "node:process";
import { branchBasename, scopeMatchesBranch, isSlotBranch } from "../../scripts/lib/worktree-route-match.mjs"; // U-WORKTREE-ROUTE-SLOT-FIX

// ── Activation gate (SLOT-WORKTREE-MS0/U-P1-ROUTE-ACTIVATE 2026-05-14
//                    → U-P3-DEFAULT-ON 2026-05-15) ────────────────────────
// DEFAULT ON since the 11-slot worktree fleet is bootstrapped
// (U-P3-BOOTSTRAP @ 65c5c3148 — `git worktree list` shows all 11
// H:/prism-slot-<name>). PRISM_WORKTREE_ROUTE_DISABLE=1 is the live kill
// switch and ALWAYS wins. The transitional PRISM_WORKTREE_ROUTE_ENABLE=1
// knob is preserved as a no-op for back-compat (chats that set it stay
// armed; the convention-matching DISABLE is the live opt-out).
// First executable statement so a disabled hook costs ~nothing: it exits
// before reading stdin. That is safe inside bash-bundle.mjs — the runner
// settles each child via its `close` handler regardless of whether the stdin
// write landed, and wraps that write in try/catch besides.
// TECH DEBT: this hook predates the U-P1-ADD-LANE-GUARD import-safety
// lesson and still uses a top-level exit() (vs the isHookArmed()+main()
// pattern in git-add-lane-guard.mjs + main-tree-write-block.mjs). Cheap
// refactor when this hook grows tests — for now it has none in tree.
const ROUTE_DISABLED = process.env.PRISM_WORKTREE_ROUTE_DISABLE === "1";
if (ROUTE_DISABLED) exit(0);

// ── Parse stdin ────────────────────────────────────────────────────────
let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf-8"));
} catch {
  exit(0);
}

const tool = payload?.tool_name || payload?.tool || "";
if (tool !== "Bash") exit(0);

const cmd = String(payload?.tool_input?.command ?? payload?.input?.command ?? "");
if (!cmd.trim()) exit(0);

// ── Match git commit (NOT commit-tree, NOT log) ──────────────────────
const COMMIT_RE = /\bgit(?:\.exe)?\s+(?:-[A-Za-z-]+\s+|--[A-Za-z-]+(?:=\S+)?\s+)*commit(?!-tree)\b/;
if (!COMMIT_RE.test(cmd)) exit(0);

// ── Extract commit subject ────────────────────────────────────────────
// Try, in order:
//   1. -m "subject" / -m 'subject' / -m subject
//   2. heredoc inside "$(cat <<'EOF' ... EOF )"
//   3. -F /path/to/file → skip (can't read without IO)

function firstLine(s) {
  if (!s) return "";
  const i = s.indexOf("\n");
  return (i === -1 ? s : s.slice(0, i)).trim();
}

function extractSubject(command) {
  // Heredoc form — common on this project
  const hd = command.match(/-m\s+"\$\(cat\s+<<['"]?(\w+)['"]?\s*\n([\s\S]*?)\n\1\s*\)"/);
  if (hd) return firstLine(hd[2]);
  // Plain -m form
  const m = command.match(/-m\s+(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|(\S+))/);
  if (m) return firstLine(m[1] ?? m[2] ?? m[3] ?? "");
  return "";
}

const subject = extractSubject(cmd);

// No subject → let git handle it (editor opens). We don't route these.
if (!subject) exit(0);

// [MAIN-FORCE] is the unconditional bypass — use only when you've explicitly
// acknowledged scope drift and still want to commit on the current tree.
if (/^\s*\[\s*MAIN-FORCE\s*\]/i.test(subject)) exit(0);

// Cross-cutting commit prefixes that legitimately belong on the active main
// tree because they affect every chat in the fleet simultaneously. Listing
// them explicitly is safer than relying on [MAIN-FORCE] for routine infra
// work (which would train operators to add MAIN-FORCE to everything).
//
// Each pattern matches the leading scope token before the first ":" or "/".
const CROSS_CUTTING_SCOPES = [
  /^\s*INFRA-FIX\b/i,        // Hook/settings/build-system fixes affecting all chats
  /^\s*INFRA-CLEANUP\b/i,    // Ghost-hook removal, dead-asset deletion, etc.
  /^\s*HOOK-FIX\b/i,         // Same family — explicit hook category
  /^\s*FLEET-FIX\b/i,        // Anything that targets the multi-chat fleet itself
];
if (CROSS_CUTTING_SCOPES.some((re) => re.test(subject))) exit(0);

// Explicit override — but FIRST check whether [MAIN] is being used to mask
// scope drift. The user's policy: [MAIN] should be reserved for genuinely
// cross-cutting work, not as an easy bypass for misclassified work.
const isMainOverride = /^\s*\[\s*MAIN\s*\]/i.test(subject);
if (isMainOverride) {
  // Inspect staged files; if they cluster strongly around a single theme
  // for which a themed worktree exists, warn the user before allowing.
  const stagedRes = spawnSyncSafe(["diff", "--cached", "--name-only"]);
  if (stagedRes && stagedRes.status === 0 && stagedRes.stdout.trim()) {
    const stagedFiles = stagedRes.stdout.split(/\r?\n/).filter(Boolean);
    const inferred = inferScopeFromFiles(stagedFiles);
    if (inferred.dominant && inferred.confidence >= 0.6) {
      // Check if a worktree exists for the inferred scope
      // (Worktree list query happens later — defer the deny to that point.)
      // Stash inferred scope on globals for the post-worktree-query check.
      globalThis.__inferredScope = inferred.dominant;
      globalThis.__inferredConfidence = inferred.confidence;
      globalThis.__inferredFiles = stagedFiles;
      // Fall through to worktree query below; the [MAIN] override will be
      // re-evaluated AFTER we know whether a themed worktree exists.
    } else {
      exit(0); // genuinely cross-cutting, allow [MAIN]
    }
  } else {
    exit(0); // no staged files / git unavailable, allow [MAIN]
  }
}

function spawnSyncSafe(args) {
  try {
    const git = findGit();
    if (!git) return null;
    return spawnSync(git, args, { cwd: process.cwd(), timeout: 2000, encoding: "utf-8" });
  } catch {
    return null;
  }
}

/**
 * Infer the dominant scope from a list of file paths by counting topic
 * keywords. Returns {dominant, confidence} where confidence is the share
 * of files attributed to the dominant topic.
 */
function inferScopeFromFiles(files) {
  const TOPIC_PATTERNS = {
    session: /(session|reorientation|compaction|handoff|context|token-?economy|output-?cache|tool-?call-?paral|file-?read-?dedup|stale-?detect)/i,
    cam: /(cam[-A-Z]|cam\/|camDispatcher|hyperMill|mastercam|solidcam|powermill)/i,
    cad: /(cad[-A-Z]|cadDispatcher|cad\/)/i,
    mill: /(mill[-A-Z]|millDispatcher|mill\/)/i,
    lathe: /(lathe[-A-Z]|latheDispatcher|lathe\/)/i,
    wedm: /(wedm|wire-?edm)/i,
    sinker: /(sinker)/i,
    edm: /(edm[-A-Z]|edmDispatcher)/i,
    grinder: /(grinder|grinding)/i,
    welder: /(welder|welding)/i,
    safety: /(safety|safetyDispatcher|collision|forceCapability)/i,
    physics: /(physics\/|kienzle|taylor|johnsonCook)/i,
    // KNOWLEDGE-WIKI-MS0 + future ingest/lint work. Matches WikiX engines,
    // WIKI_SCHEMA.md, wiki-bootstrap.mjs, knowledge/wiki/ pages, wikiLock.
    // Tight: `Wiki[A-Z]` wont accidentally hit unrelated lowercase wiki.
    knowledge: /(WIKI_|Wiki[A-Z]|wiki-?(?:bootstrap|lock|lint|ingest)|knowledge\/(?:wiki|memories|lint-reports))/,
    test: /(__tests__|\.test\.ts$|\.spec\.ts$)/i,
    hooks: /(\.claude\/hooks\/|hookDispatcher)/i,
    docs: /\.(md|txt)$/i,
  };
  const counts = new Map();
  let total = 0;
  for (const f of files) {
    let matched = false;
    for (const [topic, re] of Object.entries(TOPIC_PATTERNS)) {
      if (re.test(f)) {
        counts.set(topic, (counts.get(topic) ?? 0) + 1);
        matched = true;
      }
    }
    if (matched) total += 1;
  }
  // Strip docs/test/hooks weight when determining dominant content topic
  const NON_CONTENT = new Set(["test", "hooks", "docs"]);
  let dominant = null;
  let dominantCount = 0;
  let contentTotal = 0;
  for (const [topic, n] of counts.entries()) {
    if (NON_CONTENT.has(topic)) continue;
    contentTotal += n;
    if (n > dominantCount) {
      dominantCount = n;
      dominant = topic;
    }
  }
  if (!dominant || contentTotal === 0) {
    return { dominant: null, confidence: 0 };
  }
  return { dominant, confidence: dominantCount / contentTotal };
}

// ── Extract scope token from subject ─────────────────────────────────
// Subject shape on this project: "LAYER-PHASE-MS0/U-XYZ-WIRE: descriptive"
// Scope token = text before the first "-" or "/" in the leading ALL-CAPS
// prefix. Fallback: first word.
function extractScope(subj) {
  const pre = subj.split(":")[0] || subj;
  // Grab the leading ALL-CAPS hyphenated prefix (e.g. "LATHE-PROD-READY-MS0")
  const uppercasePrefix = pre.match(/^[A-Z][A-Z0-9]+(?:[-][A-Z0-9]+)*/);
  if (!uppercasePrefix) {
    // Fallback: first whitespace-delimited word, lowercased
    return (pre.split(/\s+/)[0] || "").toLowerCase();
  }
  // Use the FIRST segment of that prefix (e.g. "LATHE") as the scope key
  const first = uppercasePrefix[0].split("-")[0];
  return first.toLowerCase();
}

const scope = extractScope(subject);
if (!scope) exit(0);

// ── Query git worktrees ──────────────────────────────────────────────
const gitCandidates = [
  "git", // shell PATH
  "C:\\Program Files\\Git\\cmd\\git.exe",
  "C:\\Program Files (x86)\\Git\\cmd\\git.exe",
];

function findGit() {
  for (const g of gitCandidates) {
    try {
      const p = spawnSync(g, ["--version"], { timeout: 1500, encoding: "utf-8" });
      if (p.status === 0) return g;
    } catch { /* try next */ }
  }
  return null;
}

const git = findGit();
if (!git) exit(0); // no git → can't route, let command through

const wtRes = spawnSync(git, ["worktree", "list", "--porcelain"], {
  cwd: process.cwd(),
  timeout: 2000,
  encoding: "utf-8",
});
if (wtRes.status !== 0) exit(0);

// Parse porcelain format:
//   worktree H:/prism
//   HEAD ...
//   branch refs/heads/main
//   (blank line)
//   worktree H:/prism-lathe-master
//   HEAD ...
//   branch refs/heads/work/lathe-master
//   (blank line)
const worktrees = [];
{
  let cur = {};
  for (const raw of wtRes.stdout.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      if (cur.path) worktrees.push(cur);
      cur = {};
      continue;
    }
    const [k, ...rest] = line.split(" ");
    const v = rest.join(" ");
    if (k === "worktree") cur.path = v;
    else if (k === "branch") cur.branch = v.replace(/^refs\/heads\//, "");
    else if (k === "HEAD") cur.head = v;
    else if (k === "detached") cur.detached = true;
  }
  if (cur.path) worktrees.push(cur);
}

if (worktrees.length === 0) exit(0);

// ── [MAIN] override scope-drift check ───────────────────────────────
// If we got here via [MAIN] override and the inferred file scope is strong,
// re-evaluate: is there a themed worktree for the inferred scope? If yes,
// deny and route. If no, suggest creating one.
if (isMainOverride && globalThis.__inferredScope) {
  const inferredScope = globalThis.__inferredScope;
  const inferredConfidence = globalThis.__inferredConfidence;
  const inferredFiles = globalThis.__inferredFiles || [];

  // Find themed worktrees that match the INFERRED scope
  const inferredMatches = worktrees.filter((w) => {
    const head = branchBasename(w.branch);
    return head !== "main" && head !== "master" && scopeMatchesBranch(inferredScope, head);
  });

  // Current branch
  const curBranch = currentWt ? branchBasename(currentWt.branch) : null;
  const curMatchesInferred = curBranch && scopeMatchesBranch(inferredScope, curBranch);

  // If we're already on a worktree matching the inferred scope → silent allow (the
  // [MAIN] prefix is harmless; user is in the right place).
  if (curMatchesInferred) exit(0);

  if (inferredMatches.length > 0) {
    deny(
      [
        `WORKTREE-ROUTE: [MAIN] override is masking scope drift.`,
        ``,
        `Detected file scope: "${inferredScope}" (${(inferredConfidence * 100).toFixed(0)}% of staged files)`,
        `Sample staged files:`,
        ...inferredFiles.slice(0, 5).map((f) => `  • ${f}`),
        ``,
        `You are on: ${currentWt?.path ?? process.cwd()} (${currentWt?.branch ?? "unknown"})`,
        `Subject prefix [MAIN] would normally allow this, but a dedicated worktree exists:`,
        ...inferredMatches.map((w) => `  • ${w.path}   (${w.branch})`),
        ``,
        `ACTION: cd into the matching worktree and re-run the commit:`,
        `  cd "${inferredMatches[0].path}"`,
        `  ${cmd.slice(0, 200)}`,
        ``,
        `If this is genuinely cross-cutting and the [MAIN] prefix is correct, prefix`,
        `the commit subject with [MAIN-FORCE] (instead of [MAIN]) to bypass this check.`,
      ].join("\n"),
    );
  }

  // No matching worktree exists — suggest creating one
  const suggestedPath = `../prism-${inferredScope}`;
  const suggestedBranch = `work/${inferredScope}`;
  deny(
    [
      `WORKTREE-ROUTE: [MAIN] override is masking scope drift, no themed tree for inferred scope.`,
      ``,
      `Detected file scope: "${inferredScope}" (${(inferredConfidence * 100).toFixed(0)}% of staged files)`,
      `Sample staged files:`,
      ...inferredFiles.slice(0, 5).map((f) => `  • ${f}`),
      ``,
      `ACTION — create the dedicated worktree and re-run the commit there:`,
      `  git worktree add "${suggestedPath}" -b ${suggestedBranch}`,
      `  cd "${suggestedPath}"`,
      `  ${cmd.slice(0, 200)}`,
      ``,
      `If this is genuinely cross-cutting work that belongs on main, prefix the commit`,
      `subject with [MAIN-FORCE] to bypass this check (instead of just [MAIN]).`,
      ``,
      `Rationale: [MAIN] was being used to dump session-efficiency / infra work into`,
      `unrelated themed worktrees. [MAIN-FORCE] requires explicit acknowledgement.`,
    ].join("\n"),
  );
}

// Normalize paths for cross-platform comparison (Windows is case-insensitive).
function normalize(p) {
  return path.resolve(p).replace(/\\/g, "/").toLowerCase();
}

const cwdNorm = normalize(process.cwd());
const currentWt = worktrees.find((w) => cwdNorm === normalize(w.path));

// SLOT-WORKTREE ALLOW (U-WORKTREE-ROUTE-SLOT-FIX 2026-06-12): slot worktrees
// (branch slot/<name>) are governed by slot-commit-enforce, NOT scope->branch
// matching -- their branch is named by SLOT (alpha) while commits carry MILESTONE
// scopes (HIGH-ROI-HUNT) that never match, so the themed-worktree heuristic below
// would wrongly deny every slot commit (and a malformed peer worktree could
// wildcard-block them). If the committing tree is a slot worktree, allow.
const committingWt = currentWt || worktrees.find((w) =>
  cwdNorm.startsWith(normalize(w.path) + "/") || cwdNorm === normalize(w.path));
if (committingWt && isSlotBranch(committingWt.branch)) exit(0);

// ── Match scope → worktree ───────────────────────────────────────────
// Branch basename = last segment of branch ref (work/lathe-master → lathe-master)
// branchBasename imported from scripts/lib/worktree-route-match.mjs (U-WORKTREE-ROUTE-SLOT-FIX)

// scopeMatchesBranch imported from scripts/lib/worktree-route-match.mjs
// (U-WORKTREE-ROUTE-SLOT-FIX -- fixes the empty-token wildcard bug; see tests)

const matchedWts = worktrees.filter((w) => {
  const head = branchBasename(w.branch);
  return head !== "main" && head !== "master" && scopeMatchesBranch(scope, head);
});

// ── Decision ──────────────────────────────────────────────────────────
// deny()/warn() emit JSON + exit(0). Because `exit` is imported from
// "node:process" it never returns, which means the callers do not need
// `return` — `return` at module top-level is illegal in ES modules.
function deny(reason) {
  // Emit BOTH continue:false AND decision:"block" + permissionDecision:"deny".
  // Earlier behavior emitted only continue:false, which the harness treats
  // as advisory — denied commits still went through. The decision/
  // permissionDecision keys are what the harness actually enforces on
  // PreToolUse blocks. Keeping continue:false for backward compat with
  // any consumer that reads the legacy field.
  console.log(JSON.stringify({
    continue: false,
    decision: "block",
    reason,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }));
  exit(0);
}

function warn(reason) {
  console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: reason } }));
  exit(0);
}

// Case 1: cwd is itself a matching worktree → allow silently
if (currentWt) {
  const head = branchBasename(currentWt.branch);
  if (head === "main" || head === "master") {
    // On main tree. Is there a matching work/* worktree we should route to?
    if (matchedWts.length > 0) {
      const candidates = matchedWts
        .map((w) => `  • ${w.path}   (${w.branch})`)
        .join("\n");
      deny(
        [
          `WORKTREE-ROUTE: commit subject scope="${scope}" belongs in a dedicated worktree.`,
          "",
          `You are on: ${currentWt.path} (${currentWt.branch}) — the shared main tree.`,
          `Matching worktree(s):`,
          candidates,
          "",
          `ACTION: cd into the matching worktree and re-run the commit there:`,
          `  cd "${matchedWts[0].path}" && ${cmd.slice(0, 180)}`,
          "",
          `OR, if this really belongs on main, prefix the commit subject with [MAIN]`,
          `to override this hook. Reason: prevent 6 concurrent chats from colliding`,
          `on main/HEAD when themed worktrees are available.`,
        ].join("\n"),
      );
    }
    // On main and no themed match exists → DENY with actionable
    // "start a new tree" command. Per user directive: "if one doesn't
    // exist, start a new tree." Previously this was a warn; now it
    // blocks with an exact command so cross-chat routing is deterministic.
    // Override: prefix subject with [MAIN] for genuinely cross-cutting work.
    const newWtPath = `../prism-${scope}`;
    const newBranch = `work/${scope}`;
    deny(
      [
        `WORKTREE-ROUTE: no worktree exists for scope="${scope}". Start one before committing.`,
        ``,
        `You are on: ${currentWt.path} (${currentWt.branch}) — the shared main tree.`,
        ``,
        `ACTION — create the dedicated worktree and re-run the commit there:`,
        `  git worktree add "${newWtPath}" -b ${newBranch}`,
        `  cd "${newWtPath}"`,
        `  ${cmd.slice(0, 200)}`,
        ``,
        `OR, if this genuinely is cross-cutting main-tree work, prefix the commit`,
        `subject with [MAIN] to override this hook.`,
        ``,
        `Rationale: 6 concurrent chats all auto-committing to main collide on HEAD.`,
        `Themed worktrees eliminate the collision and give a clean audit trail per scope.`,
      ].join("\n"),
    );
  }
  // On a non-main worktree. Does it match the commit scope?
  if (scopeMatchesBranch(scope, head)) {
    exit(0); // perfect — silent allow
  }
  // On a worktree that does NOT match the scope.
  const candidates = matchedWts.length > 0
    ? matchedWts.map((w) => `  • ${w.path}   (${w.branch})`).join("\n")
    : "  (none — but consider creating one: git worktree add ../prism-" + scope + " work/" + scope + ")";
  deny(
    [
      `WORKTREE-ROUTE: wrong tree for this commit.`,
      "",
      `You are on:           ${currentWt.path} (${currentWt.branch})`,
      `Commit subject scope: ${scope}`,
      `Matching worktree(s):`,
      candidates,
      "",
      `ACTION: cd to the matching worktree and commit there, OR prefix the`,
      `commit subject with [MAIN] to override. This prevents cross-contamination`,
      `between parallel chats working on unrelated scopes.`,
    ].join("\n"),
  );
}

// Case 2: cwd is NOT a registered worktree (e.g. subdirectory). Bubble up
// to the enclosing worktree.
const ancestor = worktrees.find((w) =>
  cwdNorm.startsWith(normalize(w.path) + "/") || cwdNorm === normalize(w.path),
);
if (ancestor) {
  // Re-run decision with the enclosing worktree as "currentWt".
  const head = branchBasename(ancestor.branch);
  if (head === "main" || head === "master") {
    if (matchedWts.length > 0) {
      const candidates = matchedWts
        .map((w) => `  • ${w.path}   (${w.branch})`)
        .join("\n");
      deny(
        [
          `WORKTREE-ROUTE: commit subject scope="${scope}" belongs in a dedicated worktree.`,
          "",
          `Enclosing worktree: ${ancestor.path} (${ancestor.branch}) — the shared main tree.`,
          `Matching worktree(s):`,
          candidates,
          "",
          `ACTION: cd into the matching worktree and re-run the commit.`,
          `Override: prefix commit subject with [MAIN].`,
        ].join("\n"),
      );
    }
    exit(0);
  }
  if (scopeMatchesBranch(scope, head)) exit(0);
}

// Fallback: unknown cwd relationship — allow with no message.
exit(0);
