#!/usr/bin/env node
/**
 * U-WIRE-AUTH-HELPER -- attach getAuthHeaders() to every own-fetch API client
 * that sets `headers: { "Content-Type": "application/json" }` but drops the
 * Authorization bearer.
 *
 * WHY: almost every /api/v1/<domain>/* route is auth-gated (401 AUTH_REQUIRED),
 * but ~66 web/src/api/*.ts clients build their own fetch() with only a
 * Content-Type header -- so a LOGGED-IN user's calls 401 and the page dead-pans.
 * The canonical fix helper already exists (api/authToken.ts getAuthHeaders()).
 *
 * TRANSFORM (idempotent):
 *   1. inject `import { getAuthHeaders } from './authToken';` if the file
 *      references neither authToken nor getAuthHeaders already.
 *   2. replace   headers: { "Content-Type": "application/json" }
 *      with       headers: { "Content-Type": "application/json", ...getAuthHeaders() }
 *      (both single- and double-quote variants). Spread AFTER Content-Type so
 *      it is additive and can never clobber the content type.
 *
 * SAFETY:
 *   - Skips authToken.ts itself + any file already spreading getAuthHeaders().
 *   - getAuthHeaders() returns {} when no token -> a public route is unaffected
 *     (server ignores a bearer it doesn't require). So attaching everywhere is
 *     safe AND fixes every gated route.
 *   - --dry prints the plan without writing.
 *
 * Usage: node scripts/wire-api-auth-headers.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.resolve(__dirname, '..', 'mcp-server', 'web', 'src', 'api');
const DRY = process.argv.includes('--dry');

const IMPORT_LINE = "import { getAuthHeaders } from './authToken';";
// Match the header object, both quote styles, tolerant of inner spacing.
const HEADER_RE =
  /headers:\s*\{\s*(['"])Content-Type\1:\s*(['"])application\/json\2\s*\}/g;

const files = fs
  .readdirSync(API_DIR)
  .filter((f) => f.endsWith('.ts') && f !== 'authToken.ts')
  .map((f) => path.join(API_DIR, f));

let changed = 0;
let skipped = 0;
const report = [];

for (const file of files) {
  const base = path.basename(file);
  const original = fs.readFileSync(file, 'utf8');
  let src = original;
  let didRepair = false;

  // 0) REPAIR a prior run's mis-injection FIRST (before any skip): the import
  //    line wedged between `import ... {` and its member list splits the
  //    statement. Pull it out; re-inserted safely at the top in step 1.
  const WEDGE_RE = /(\{)\r?\n(import \{ getAuthHeaders \} from '\.\/authToken';\r?\n)/g;
  if (WEDGE_RE.test(src)) {
    src = src.replace(WEDGE_RE, '$1\n');
    didRepair = true;
  }

  const alreadySpread = /\.\.\.getAuthHeaders\(\)/.test(src);
  const matches = src.match(HEADER_RE);

  // Nothing to spread AND no repair needed -> skip. (A repaired file still
  // needs its top-of-file import re-inserted, so it does NOT skip.)
  if (!didRepair && (alreadySpread || !matches || matches.length === 0)) {
    skipped++;
    continue;
  }

  const nHeaders = matches ? matches.length : 0;

  // 1) inject import at the VERY TOP if absent (side-effect-free named import
  //    is always valid there; avoids the multi-line-import split bug).
  const hasImport =
    /^import \{ getAuthHeaders \} from '\.\/authToken';/m.test(src);
  if (!hasImport) {
    src = IMPORT_LINE + '\n' + src;
  }

  // 2) attach spread to each matching header object.
  src = src.replace(HEADER_RE, (full, q1, q2) => {
    // rebuild preserving the file's quote style
    return `headers: { ${q1}Content-Type${q1}: ${q2}application/json${q2}, ...getAuthHeaders() }`;
  });

  if (src === original) {
    skipped++;
    continue;
  }
  const tags = [];
  if (nHeaders > 0 && !alreadySpread) tags.push(`+${nHeaders} header(s)`);
  if (!hasImport) tags.push('+import');
  if (didRepair) tags.push('REPAIRED-wedge');
  report.push(`${base}: ${tags.join(' ') || 'rewrite'}`);
  changed++;
  if (!DRY) fs.writeFileSync(file, src, 'utf8');
}

console.log(`${DRY ? '[DRY] ' : ''}auth-header wire: ${changed} file(s) changed, ${skipped} skipped (already-wired / no-match)`);
for (const r of report) console.log('  ' + r);
