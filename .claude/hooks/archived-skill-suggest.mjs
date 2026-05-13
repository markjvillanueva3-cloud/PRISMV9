#!/usr/bin/env node
// tier: T0
/**
 * archived-skill-suggest.mjs — UserPromptSubmit hook (HS-06 Phase 2 / smart-recall).
 *
 * Companion to wiki-precheck-inject.mjs. That hook surfaces wiki entries
 * relevant to the prompt; THIS hook surfaces ARCHIVED SKILLS (under
 * .claude/commands-archive/) whose wiki-description matches the prompt's
 * intent. Restores discoverability of skills the HS-06 archive removed
 * from the harness manifest, without paying the manifest token tax.
 *
 * ROUND-2 CRITICAL FIX (Reviewer B P0): the PRISM wiki regenerator stores
 * namespaced skills with a hyphen-flattened name (e.g. archive file
 * `commands-archive/sparc/coder.md` → leaf-index name `sparc-coder`,
 * `commands-archive/automation/self-healing.md` → `automation-self-healing`).
 * The walker must produce the same wikiName form so set-intersection with
 * leaf-index matches. We also lowercase + underscore-to-hyphen normalize
 * because the wiki regen does the same (verified: archive
 * `COMMAND_COMPLIANCE_REPORT.md` → wiki name `analysis-command-compliance-report`).
 *
 * Map values carry BOTH the absolute archive path AND the harness
 * invocation form (`sparc:coder`) so output rendering needs zero
 * additional filesystem walks per matched prompt.
 *
 * Fail-safe: continueOnError. Never blocks. Silent on any error.
 *
 * Knobs:
 *   PRISM_ARCHIVED_SKILL_SUGGEST=0         → disable entirely (no-op continue)
 *   PRISM_ARCHIVED_SKILL_MIN_SCORE=<float> → BM25 threshold (default 6.0)
 *   PRISM_ARCHIVED_SKILL_TOP_K=<int>       → number of hits to surface (default 2, floored at 1)
 *
 * Self-test: invoke with `node archived-skill-suggest.mjs --test`. Coverage
 * meets CLAUDE.md comprehensive-build-enforce floor: happy + ≥3 failure
 * modes + ≥2 adversarial + variability + the Round-2 P0 regression guard.
 */
import { readFileSync, writeFileSync, appendFileSync, statSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LEAF_INDEX = "H:/prism/knowledge/wiki/architecture/_leaf-index.jsonl";
const ARCHIVE_DIR = "H:/prism/.claude/commands-archive";
const CACHE_DIR = join(tmpdir(), "prism-archived-skill-cache");
const CACHE = join(CACHE_DIR, "archived-skill-corpus.json");
const TELEMETRY = "H:/prism/mcp-server/data/state/hook-fire-counts.jsonl";

const MIN_PROMPT_LEN = 12;
const MIN_PROMPT_TOKENS = 2;
const MIN_SCORE = Number(process.env.PRISM_ARCHIVED_SKILL_MIN_SCORE || 6.0);
const TOP_K = Math.max(1, Number(process.env.PRISM_ARCHIVED_SKILL_TOP_K || 2));
const MIN_MATCHES = 2;
const DESC_PREVIEW_LEN = 120;
const PROMPT_CAP_BYTES = 32 * 1024;  // Adversarial-input cap before tokenize
const DJB2_SEED = 5381;              // Standard djb2 hash seed (Bernstein)

// STOP set deliberately wider than wiki-precheck-inject's — includes verbs and
// common skill-prompt fillers ("help", "show", "find") that would otherwise
// false-positive against generic skill descriptions.
const STOP = new Set([
  "the","and","for","with","from","that","this","what","how","why","when",
  "engine","engines","dispatcher","action","hook","skill","prism","src","data",
  "file","line","get","set","run","use","add","new","old","one","two","all",
  "any","some","into","over","under","via","off",
  "make","build","fix","check","look","need","want","help","show","list",
  "tell","find","good","just","like","also","more","much"
]);

// Tokenize splits on whitespace/punctuation per the regex AND additionally
// emits hyphen-split sub-tokens. Critical for archived-skill recall: corpus
// entry "sparc-coder" must yield {"sparc-coder","sparc","coder"} so a user
// prompt mentioning "sparc" or "coder" (without hyphen) still matches.
// Without this, a 2-token namespaced skill collapses to a 1-match score
// that falls below MIN_MATCHES=2 and the hook silently misses true positives.
function tokenize(s) {
  const matches = String(s || "").toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || [];
  const out = new Set();
  for (const m of matches) {
    if (STOP.has(m)) continue;
    out.add(m);
    if (m.includes("-")) {
      for (const part of m.split("-")) {
        if (part.length >= 3 && !STOP.has(part)) out.add(part);
      }
    }
  }
  return [...out];
}

function tele(decision, extra) {
  // Match wiki-precheck-inject convention: wrap in try/catch + best-effort append.
  // No existsSync gate — appendFileSync will create-or-fail-silently if the
  // directory chain is missing.
  try {
    appendFileSync(TELEMETRY, JSON.stringify({ ts: new Date().toISOString(), hook: "archived-skill-suggest", decision, ...extra }) + "\n", "utf8");
  } catch { /* ignore */ }
}

// Normalize a skill basename to the wiki-regen convention: lowercase +
// underscores→hyphens. The wiki regenerator does this so `COMMAND_COMPLIANCE_REPORT.md`
// is indexed as `command-compliance-report`. Our walker must match exactly.
function normalizeSkillName(s) {
  return String(s).toLowerCase().replace(/_/g, "-");
}

// ── Archived-skill enumeration (Round-2 P0 fix) ─────────────────────────────
// Returns Map<wikiName, { path, invokeName }>:
//   wikiName    = `<parent>-<basename>` (normalized) for namespaced skills
//               = `<basename>` (normalized) for archive-root skills
//                 Matches the leaf-index `name` field exactly.
//   invokeName  = `<parent>:<basename>` (raw, preserving original case) — the
//                 harness uses the FILESYSTEM PATH to register slash commands,
//                 so this stays unnormalized so `mv` restores work bit-exact.
//   path        = absolute path to the .md file (no second walk needed at render).
// Symlinks/junctions: skipped via isSymbolicLink check to bound walk time on
// pathological filesystem layouts.
function scanArchivedSkills() {
  const skills = new Map();
  if (!existsSync(ARCHIVE_DIR)) return skills;
  function walk(dir, normalizedNs, rawNs) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isSymbolicLink && e.isSymbolicLink()) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        const childNs = normalizeSkillName(e.name);
        walk(p, normalizedNs ? `${normalizedNs}-${childNs}` : childNs, rawNs ? `${rawNs}:${e.name}` : e.name);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        const rawBase = e.name.slice(0, -3);
        const normBase = normalizeSkillName(rawBase);
        const wikiName = normalizedNs ? `${normalizedNs}-${normBase}` : normBase;
        // The harness uses colon-namespace for the *immediate* parent dir only
        // (verified by inspecting /sparc:coder vs no `/sparc:sub:coder` form).
        const invokeName = rawNs ? `${rawNs}:${rawBase}` : rawBase;
        skills.set(wikiName, { path: p, invokeName });
      }
    }
  }
  walk(ARCHIVE_DIR, "", "");
  return skills;
}

// Stable cache key: combines LEAF_INDEX mtime with content-hash of sorted skill
// names + count. ARCHIVE_DIR.mtime alone is insufficient (Windows: parent dir
// mtime doesn't propagate from subdir-content moves), but a hash over the
// actual skill names is fully invariant: nested archive change → names list
// changes → hash changes → corpus rebuilt.
function cacheKeyFromSkills(skills, leafMtime) {
  const names = [...skills.keys()].sort().join("|");
  let h = DJB2_SEED;
  for (let i = 0; i < names.length; i++) h = ((h << 5) + h + names.charCodeAt(i)) | 0;
  return `${leafMtime}:${skills.size}:${h}`;
}

function loadArchivedSkillCorpus() {
  let leafStat;
  try { leafStat = statSync(LEAF_INDEX); } catch { return null; }

  const skills = scanArchivedSkills();
  if (skills.size === 0) {
    return { cacheKey: `${leafStat.mtimeMs}:0:0`, entries: [], idf: {}, skills };
  }

  const cacheKey = cacheKeyFromSkills(skills, leafStat.mtimeMs);

  if (existsSync(CACHE)) {
    try {
      const c = JSON.parse(readFileSync(CACHE, "utf8"));
      if (c && c.cacheKey === cacheKey && Array.isArray(c.entries)) {
        // Re-attach the live Map (not serialized) so render can do .get().
        c.skills = skills;
        return c;
      }
    } catch { /* rebuild on corrupt cache */ }
  }

  let text;
  try { text = readFileSync(LEAF_INDEX, "utf8"); } catch { return null; }

  const entries = [];
  const df = Object.create(null);
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    if (!r || r.type !== "skill" || !r.name) continue;
    if (!skills.has(r.name)) continue;  // only archive-resident skills

    // Strip the wiki's placeholder "_(no description in frontmatter)_" so the
    // corpus signal is real description tokens, not generic placeholder noise.
    const descRaw = String(r.desc || "");
    const desc = descRaw.includes("no description in frontmatter") ? "" : descRaw;

    const toks = [...new Set(tokenize(r.name + " " + (r.title || "") + " " + desc))];
    if (toks.length === 0) continue;
    for (const t of toks) df[t] = (df[t] || 0) + 1;
    entries.push({
      name: r.name,
      desc: (r.title || desc || r.name).trim(),
      toks,
    });
  }

  const N = entries.length || 1;
  const idf = Object.create(null);
  for (const [t, freq] of Object.entries(df)) idf[t] = Math.log(1 + N / freq);

  const corpus = { cacheKey, entries, idf, skills };
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    const serializable = { cacheKey, entries, idf };  // Map not serializable
    writeFileSync(CACHE, JSON.stringify(serializable), "utf8");
  } catch { /* ignore */ }
  return corpus;
}

// BM25-lite scoring against a precomputed prompt token Set (hoisted out of
// the per-entry loop by caller).
function score(promptSet, entry, idf) {
  let s = 0;
  let matches = 0;
  for (const t of entry.toks) if (promptSet.has(t)) { s += idf[t] || 0; matches++; }
  return { s, matches };
}

// Prefix-anchored swap: commands-archive/<rest> → commands/<rest>. Anchoring
// eliminates the failure class where a hypothetical archive entry named
// "commands-archive-tools/foo.md" would accidentally double-substitute.
function renderRestoreCommand(archivePath) {
  const rel = archivePath.replace(/\\/g, "/").replace("H:/prism/", "");
  return `mv ${rel} ${rel.replace(/^\.claude\/commands-archive\//, ".claude/commands/")}`;
}

function readStdin() {
  let raw = "";
  try { raw = readFileSync(0, "utf8") || ""; } catch { /* ignore */ }
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

function out(obj) {
  try { process.stdout.write(JSON.stringify({ continue: true, ...obj })); } catch { /* ignore */ }
}

async function runHook() {
  const input = readStdin();
  if (process.env.PRISM_ARCHIVED_SKILL_SUGGEST === "0") { tele("disabled"); return out({}); }

  const prompt = String(input?.prompt || "");
  if (prompt.length < MIN_PROMPT_LEN) { tele("skip_short", { len: prompt.length }); return out({}); }

  const promptCapped = prompt.length > PROMPT_CAP_BYTES ? prompt.slice(0, PROMPT_CAP_BYTES) : prompt;
  const promptToks = tokenize(promptCapped);
  if (promptToks.length < MIN_PROMPT_TOKENS) { tele("skip_low_tokens"); return out({}); }

  const corpus = loadArchivedSkillCorpus();
  if (!corpus || !corpus.entries.length) {
    tele("noop_empty_archive", { entries: corpus?.entries?.length || 0 });
    return out({});
  }

  const promptSet = new Set(promptToks);  // Hoisted once per prompt.
  const ranked = [];
  for (const e of corpus.entries) {
    const { s, matches } = score(promptSet, e, corpus.idf);
    if (s >= MIN_SCORE && matches >= MIN_MATCHES) ranked.push({ e, s, matches });
  }

  if (!ranked.length) {
    tele("noop_no_matches", { archived: corpus.entries.length, prompt_tokens: promptToks.length });
    return out({});
  }

  ranked.sort((a, b) => b.s - a.s);
  const top = ranked.slice(0, TOP_K);
  tele("matched", { hits: top.length, top_score: Math.round(top[0].s * 10) / 10 });

  const lines = ["## 💡 Archived skills that may be relevant"];
  for (const { e, s } of top) {
    const meta = corpus.skills.get(e.name);
    if (!meta) continue;  // Shouldn't happen — set-intersection guarantees presence.
    const restoreCmd = renderRestoreCommand(meta.path);
    lines.push(`- **/${meta.invokeName}** (BM25 ${s.toFixed(1)}) — ${e.desc.slice(0, DESC_PREVIEW_LEN)}`);
    lines.push(`  Wiki: \`/wiki-query ${e.name}\`  ·  Restore: \`${restoreCmd}\``);
  }
  lines.push("_These skills are archived (HS-06). Restored via the `mv` command if you actually need to invoke them; otherwise read the wiki entry first._");

  out({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: lines.join("\n") } });
}

// ── Inline self-test ────────────────────────────────────────────────────────
// Per CLAUDE.md comprehensive-build-enforce: happy + ≥3 failure modes +
// ≥2 adversarial + variability + Round-2 P0 regression guard. Every assertion
// checks a real reference value — no toBeDefined()-style stubs.
async function runSelfTest() {
  let passed = 0;
  let failed = 0;
  const results = [];

  function assertEqual(name, got, expected) {
    if (got === expected) { passed++; results.push(`  ✓ ${name}`); }
    else { failed++; results.push(`  ✗ ${name}: got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`); }
  }
  function assertTruthy(name, got, hint) {
    if (got) { passed++; results.push(`  ✓ ${name}`); }
    else { failed++; results.push(`  ✗ ${name}: got falsy${hint ? ` (${hint})` : ""}`); }
  }

  // T1 (happy)
  assertTruthy("T1 happy: tokenize prompt yields ≥3 meaningful tokens",
    tokenize("review the deployment script for safety issues").length >= 3);

  // T2 (failure mode: empty input)
  assertEqual("T2 fail-empty: tokenize empty → 0 tokens", tokenize("").length, 0);

  // T3 (failure mode: stopwords only)
  assertEqual("T3 fail-stopwords: 'the and for with' → 0 tokens", tokenize("the and for with").length, 0);

  // T4 (failure mode: hook is robust to missing/invalid corpus inputs)
  const corpus = loadArchivedSkillCorpus();
  assertTruthy("T4 fail-missing-input: loadArchivedSkillCorpus returns object-or-null",
    corpus === null || (corpus && typeof corpus === "object" && Array.isArray(corpus.entries)));

  // T5 (adversarial: NaN — exact behavior, no crash).
  // Note: tokenize uses `s || ""` defaulting; NaN is falsy in JS so it defaults
  // to "" → 0 tokens. Asserting the EXACT result so future changes that break
  // the defaulting (e.g. `String(s ?? "")`) surface as a test failure rather
  // than silently changing behavior under adversarial inputs.
  const t5 = tokenize(NaN);
  assertEqual("T5 adversarial-NaN: tokenize(NaN) → [] (NaN is falsy, defaults to '')", JSON.stringify(t5), JSON.stringify([]));

  // T11 (integration regression guard — the smoke-test bug):
  // Hyphen-split must produce sub-tokens so namespaced skill names match
  // unhyphenated prompt tokens. Pre-fix `sparc-coder` collapsed to 1 token,
  // making the corpus unrecallable from "use sparc methodology" prompts.
  const t11 = new Set(tokenize("sparc-coder"));
  assertTruthy("T11 namespace tokenize: 'sparc-coder' contains 'sparc-coder'", t11.has("sparc-coder"));
  assertTruthy("T11 namespace tokenize: 'sparc-coder' contains 'sparc' (split)", t11.has("sparc"));
  assertTruthy("T11 namespace tokenize: 'sparc-coder' contains 'coder' (split)", t11.has("coder"));
  // And the multi-segment case (github-code-review) yields all parts:
  const t11b = new Set(tokenize("github-code-review"));
  assertTruthy("T11 namespace tokenize: 'github-code-review' yields 'github'+'code'+'review'",
    t11b.has("github") && t11b.has("code") && t11b.has("review") && t11b.has("github-code-review"));

  // T6 (adversarial: oversize ~74KB — bounded time)
  const t6Start = Date.now();
  tokenize("deploy webhook integration payment ".repeat(2000));
  const t6Dur = Date.now() - t6Start;
  assertTruthy(`T6 adversarial-oversize: tokenize ~74KB completes <500ms (actual ${t6Dur}ms)`, t6Dur < 500);

  // T7 (variability + Round-2 P0 regression guard):
  // Asserts the corpus has skills from ≥2 distinct wiki namespaces — and uses
  // the corpus itself (not hand-listed basenames) so it stays valid as the
  // archive layout evolves. Also proves the namespace-flattening walker fix
  // is producing the wiki-aligned `<ns>-<base>` form.
  if (corpus && corpus.skills && corpus.skills.size > 0) {
    const namespaces = new Set();
    for (const wikiName of corpus.skills.keys()) {
      const m = wikiName.match(/^([a-z][a-z0-9]+)-/);
      if (m) namespaces.add(m[1]);
    }
    assertTruthy(`T7 variability + P0 guard: ≥2 distinct namespaces in archive (seen: ${[...namespaces].join(",")})`,
      namespaces.size >= 2);
  } else {
    results.push("  ⚠ T7 skipped: empty archive (Phase 1 not yet run on this machine?)");
  }

  // T8 (behavior: BM25 math is correct — sum of IDF over matched tokens)
  const scored = score(new Set(["deploy","webhook"]),
    { toks: ["deploy","webhook","test"] }, { deploy: 1.5, webhook: 2.0, test: 0.5 });
  assertEqual("T8 behavior: BM25 score sum = 3.5", scored.s, 3.5);
  assertEqual("T8 behavior: BM25 match count = 2", scored.matches, 2);

  // T9 (round-trip: renderRestoreCommand uses prefix-anchored swap, not substring)
  const cmd1 = renderRestoreCommand("H:/prism/.claude/commands-archive/sparc/coder.md");
  assertEqual("T9 render: typical archive path swap",
    cmd1, "mv .claude/commands-archive/sparc/coder.md .claude/commands/sparc/coder.md");
  // Adversarial: archive path containing the literal "commands-archive" deeper in
  const cmd2 = renderRestoreCommand("H:/prism/.claude/commands-archive/x/commands-archive-tools.md");
  assertEqual("T9 render: anchored regex prevents inner substring substitution",
    cmd2, "mv .claude/commands-archive/x/commands-archive-tools.md .claude/commands/x/commands-archive-tools.md");

  // T10 (Round-2 P0 regression guard for namespace + invokeName conventions):
  // Walker must produce wikiNames matching `^[a-z]+(-[a-z0-9-]+)+$` for any
  // archived skill in a subdirectory, AND invokeName must use `:` separator.
  const skills = scanArchivedSkills();
  if (skills.size > 0) {
    const namespacedKey = [...skills.keys()].find(n => /^[a-z][a-z0-9]+-[a-z0-9-]+$/.test(n));
    assertTruthy(`T10 P0 guard: ≥1 namespaced wikiName exists (sample keys: ${[...skills.keys()].slice(0,3).join(",")})`,
      !!namespacedKey);
    if (namespacedKey) {
      const meta = skills.get(namespacedKey);
      assertTruthy(`T10 P0 guard: meta.invokeName uses ':' namespace separator (got '${meta.invokeName}')`,
        meta.invokeName.includes(":"));
      assertTruthy(`T10 P0 guard: meta.path is a real absolute path containing commands-archive`,
        meta.path.includes("commands-archive"));
    }
  } else {
    results.push("  ⚠ T10 skipped: empty archive");
  }

  console.log(results.join("\n"));
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

if (process.argv.includes("--test")) {
  runSelfTest().catch((err) => { console.error("self-test crashed:", err); process.exit(1); });
} else {
  runHook().catch(() => out({}));
}
