#!/usr/bin/env node
/**
 * Launch-readiness verifier (LAUNCH-FE, 2026-06-23, slot:quebec).
 *
 * The product-launch plan docs in state/shared/specs/ have drifted from live code
 * TWICE (v2 said Electron/Capacitor were ZERO and the SFC honesty-fixes pending;
 * v3 had to correct it by reading the live tree). This harness replaces the
 * drift-prone manual reorientation with a deterministic, re-runnable check of the
 * launch INVARIANTS against the live frontend (R5: a deterministic question is
 * answered by code, not by re-reading docs every session).
 *
 * Pure check functions (string/object in -> verdict out) are exported + unit
 * tested with both passing AND broken inputs (R9). The CLI runner does the IO and
 * emits a punch-list (markdown + --json).
 *
 *   node scripts/verify-launch-readiness.mjs            # human punch-list
 *   node scripts/verify-launch-readiness.mjs --json     # machine report
 *   node scripts/verify-launch-readiness.mjs --out <f>  # also write markdown to <f>
 *
 * Exit code 0 if every launch-gating check passes, 1 otherwise.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const WEB = 'mcp-server/web';
const SRC = 'mcp-server/src';

// ---- the launch invariants (single place to extend) ----------------------

/** Launch-critical route gates: [routePath, requiredFeatureKey]. */
export const EXPECTED_GATES = [
  ['vibration', 'sfc.sld'],
  ['vendor-compare', 'sfc.vendor_parity'],
  ['ppg', 'post.generate'],
  ['ppg-lite', 'post.generate'],
  ['print-to-cnc', 'print_to_cnc'],
];

/** Files whose mere existence is a launch surface (verified deeper by their own tests). */
export const KEY_FILES = [
  `${WEB}/src/pages/VendorComparePage.tsx`,
  `${WEB}/src/lib/toolLifeCurve.ts`,
  `${WEB}/src/components/sfc/AdvancedSpeedFeedPanel.tsx`,
  `${WEB}/src/components/entitlement/FeatureGate.tsx`,
  `${WEB}/src/data/pricing.ts`,
  `${WEB}/src/pages/CheckoutOutcomePage.tsx`,
  `${WEB}/electron/main.cjs`,
  `${WEB}/capacitor.config.json`,
];

/** npm deps that gate the desktop + mobile channels. */
export const SHELL_DEPS = ['electron', 'electron-builder', '@capacitor/core', '@capacitor/cli'];

// ---- pure checks (no IO; unit tested) ------------------------------------

/** The `primary` Tailwind color must exist (its absence = invisible CTAs fleet-wide). */
export function checkPrimaryToken(tailwindConfigText) {
  const hasKey = /\bprimary:\s*\{/.test(tailwindConfigText);
  const hasDefault = /\bDEFAULT\b/.test(tailwindConfigText);
  return {
    name: 'design.primary-token',
    pass: hasKey && hasDefault,
    detail: hasKey
      ? hasDefault
        ? 'primary color defined with DEFAULT'
        : 'primary color present but no DEFAULT (bare bg-primary/text-primary will not resolve)'
      : 'primary color key MISSING -> every primary CTA renders with no color',
  };
}

/** Each expected paid route must be wrapped in its exact FeatureGate (one-line <Route>). */
export function checkRouteGates(appTsxText, expected = EXPECTED_GATES) {
  const lines = appTsxText.split('\n');
  const missing = [];
  for (const [path, key] of expected) {
    const gated = lines.some(
      (l) => l.includes(`path="${path}"`) && l.includes(`<FeatureGate feature="${key}">`),
    );
    if (!gated) missing.push(`${path} -> ${key}`);
  }
  return {
    name: 'commerce.route-gating',
    pass: missing.length === 0,
    detail: missing.length ? `ungated paid routes (revenue leak): ${missing.join(', ')}` : `${expected.length} paid routes gated`,
    missing,
  };
}

/** Desktop + mobile shells require their deps to be installed. */
export function checkShellDeps(pkgJson) {
  const all = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
  const missing = SHELL_DEPS.filter((d) => !(d in all));
  return {
    name: 'channels.shell-deps',
    pass: missing.length === 0,
    detail: missing.length ? `missing shell deps: ${missing.join(', ')}` : 'electron + capacitor deps present',
    missing,
  };
}

/**
 * Pricing registry must carry the operator-decided numbers, FIELD-ANCHORED so a
 * stray number elsewhere cannot mask a drift: the one-time SFC price is checked
 * inside the `sfc_perpetual` entry and the single-post price inside `post_perpetual`
 * (both share the `priceUsd:` field), and the 4 paid subscription `monthlyUsd:`
 * tiers must all be present. Deep validation stays in pricing.test.ts (14/14).
 */
export function checkPricing(pricingText) {
  const tiers = ['29', '79', '199', '499'];
  const checks = {
    'one-time SFC perpetual $299': /sfc_perpetual[\s\S]{0,240}priceUsd:\s*299\b/.test(pricingText),
    'one-time single-post $199': /post_perpetual[\s\S]{0,240}priceUsd:\s*199\b/.test(pricingText),
    'subscription tiers $29/$79/$199/$499': tiers.every((p) => new RegExp(`monthlyUsd:\\s*${p}\\b`).test(pricingText)),
    'entitlement matrix': /ENTITLEMENT_MATRIX/.test(pricingText),
  };
  const missing = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  return {
    name: 'commerce.pricing-registry',
    pass: missing.length === 0,
    detail: missing.length
      ? `pricing registry drift: ${missing.join(', ')}`
      : 'field-anchored: one-time SFC $299 + single-post $199 + 4 paid tiers + matrix',
    missing,
  };
}

/** Launch surfaces whose files must exist. existsFn injected for testability. */
export function checkKeyFiles(existsFn, files = KEY_FILES) {
  const missing = files.filter((f) => !existsFn(f));
  return {
    name: 'surfaces.key-files',
    pass: missing.length === 0,
    detail: missing.length ? `missing launch files: ${missing.join(', ')}` : `${files.length} launch surfaces present`,
    missing,
  };
}

// ---- cross-slot + safety launch gates (no IO; unit tested) ---------------
// These are NOT quebec FE files -- they are the backend + safety invariants that
// gate SELLING the product (billing security, entitlement enforcement, the post-
// processor safety pipeline). Encoding them here means ONE command reports the
// WHOLE launch state, instead of the harness deferring them to a drift-prone doc
// (the exact failure mode this harness exists to kill).

/** Stripe webhook handler MUST verify the signature (a forged billing event must be rejected). */
export function checkWebhookSignature(billingRoutesText) {
  const pass = /verifyStripeSignature\s*\(/.test(billingRoutesText);
  return {
    name: 'commerce.webhook-sig',
    pass,
    detail: pass
      ? 'Stripe webhook verifies signature (forged events rejected)'
      : 'Stripe webhook does NOT verify signature -> forged billing events accepted (security P0)',
  };
}

/** The paid SFC calc route MUST be entitlement-gated (free users blocked past their cap). */
export function checkEntitlementEnforced(sfcRoutesText) {
  const pass = /requireTier\s*\(/.test(sfcRoutesText);
  return {
    name: 'commerce.entitlement-enforced',
    pass,
    detail: pass
      ? 'paid SFC route enforces requireTier (entitlement gate live)'
      : 'paid SFC route NOT entitlement-gated -> free users call paid features unchecked',
  };
}

/** Generated G-code MUST hit the alarm-DB cross-reference in the post pipeline P5 gate. */
export function checkPostAlarmGate(postPipelineText) {
  // anchored to the ACTIVE instantiation (`new AlarmRegistry(`), not a bare token:
  // a disabled/skipped stage that only `stages.push({stage:"...alarm_check", status:"skipped"})`
  // plus a stray import must NOT pass this gate.
  const pass = /new\s+AlarmRegistry\s*\(/.test(postPipelineText) && /alarm_check/.test(postPipelineText);
  return {
    name: 'safety.post-alarmdb-gate',
    pass,
    detail: pass
      ? 'post pipeline P5 cross-references AlarmRegistry (alarm-trigger check)'
      : 'post pipeline P5 does NOT check the alarm DB -> G-code could trip a controller alarm',
  };
}

/** Non-pipeline-validated post output MUST be fenced PREVIEW-ONLY so it cannot reach a machine. */
export function checkPostExportFence(fenceText) {
  const pass = /PREVIEW ONLY/.test(fenceText) && /_PREVIEW_unvalidated/.test(fenceText);
  return {
    name: 'safety.post-export-fence',
    pass,
    detail: pass
      ? 'unvalidated post output stamped PREVIEW-ONLY + _PREVIEW_unvalidated.nc'
      : 'no PREVIEW-ONLY fence -> unvalidated G-code can masquerade as machine-ready',
  };
}

/** Aggregate the per-check verdicts into a launch report. */
export function buildReport(checks) {
  const failing = checks.filter((c) => !c.pass);
  return {
    ok: failing.length === 0,
    total: checks.length,
    passed: checks.length - failing.length,
    failing: failing.map((c) => c.name),
    checks,
  };
}

// ---- IO runner -----------------------------------------------------------

function readText(rel) {
  const p = join(REPO_ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

export function runLaunchReadiness() {
  const tailwind = readText(`${WEB}/tailwind.config.js`);
  const app = readText(`${WEB}/src/App.tsx`);
  const pricing = readText(`${WEB}/src/data/pricing.ts`);
  let pkg = {};
  try {
    pkg = JSON.parse(readText(`${WEB}/package.json`) || '{}');
  } catch {
    pkg = {};
  }
  const existsRel = (rel) => existsSync(join(REPO_ROOT, rel));
  // cross-slot / safety launch-gate sources (backend routes + pipeline + FE safety fence)
  const billing = readText(`${SRC}/routes/billing.ts`);
  const sfcRoutes = readText(`${SRC}/routes/sfc.ts`);
  const postPipeline = readText(`${SRC}/engines/PostProcessorPipelineEngine.ts`);
  const exportFence = readText(`${WEB}/src/pages/postExportSafety.ts`);
  const fe = [
    checkPrimaryToken(tailwind),
    checkRouteGates(app),
    checkShellDeps(pkg),
    checkPricing(pricing),
    checkKeyFiles(existsRel),
  ].map((c) => ({ ...c, group: 'fe' }));
  const crossSlot = [
    checkWebhookSignature(billing),
    checkEntitlementEnforced(sfcRoutes),
    checkPostAlarmGate(postPipeline),
    checkPostExportFence(exportFence),
  ].map((c) => ({ ...c, group: 'cross-slot' }));
  return buildReport([...fe, ...crossSlot]);
}

function toMarkdown(report, stamp) {
  const lines = [];
  lines.push(`# PRISM Launch-Readiness (live-verified) -- ${stamp}`);
  lines.push('');
  lines.push(`> Auto-generated by \`scripts/verify-launch-readiness.mjs\` against the live tree.`);
  lines.push(`> Trust this over the dated state/shared/specs/LAUNCH-*.md docs (which drift).`);
  lines.push('');
  lines.push(`**Overall: ${report.ok ? 'PASS' : 'FAIL'}** (${report.passed}/${report.total} launch-gate checks)`);
  lines.push('');
  const groupTable = (title, group) => {
    const rows = report.checks.filter((c) => c.group === group);
    if (!rows.length) return;
    lines.push(`### ${title}`);
    lines.push('');
    lines.push('| Check | Status | Detail |');
    lines.push('|---|---|---|');
    for (const c of rows) lines.push(`| ${c.name} | ${c.pass ? 'PASS' : 'FAIL'} | ${c.detail} |`);
    lines.push('');
  };
  groupTable('FE launch invariants (quebec)', 'fe');
  groupTable('Cross-slot + safety launch gates (echo/papa backend + FE safety fence)', 'cross-slot');
  // any check not in a named group still renders -- never silently drop a FAIL row.
  const named = new Set(['fe', 'cross-slot']);
  const other = report.checks.filter((c) => !named.has(c.group));
  if (other.length) {
    lines.push('### Other checks');
    lines.push('');
    lines.push('| Check | Status | Detail |');
    lines.push('|---|---|---|');
    for (const c of other) lines.push(`| ${c.name} | ${c.pass ? 'PASS' : 'FAIL'} | ${c.detail} |`);
    lines.push('');
  }
  lines.push('_Code-verifiable launch gates only. Remaining NON-code launch items (cannot be checked here):_');
  lines.push('_- operator: provision Stripe LIVE keys (`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`) + a live test charge (U-COMM-07)._');
  lines.push('_- papa: entitlement-enforcement + live-Stripe E2E proof through the dispatcher._');
  lines.push('_- charlie: quoting accuracy (71% MAPE) = WAVE 2 (do not sell quotes until it clears its gate)._');
  lines.push('_- hotel: ERP page-depth = WAVE 3._');
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const report = runLaunchReadiness();
  const stamp = new Date().toISOString();
  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(toMarkdown(report, stamp) + '\n');
  }
  const outIdx = args.indexOf('--out');
  if (outIdx !== -1 && args[outIdx + 1]) {
    writeFileSync(resolve(process.cwd(), args[outIdx + 1]), toMarkdown(report, stamp));
  }
  process.exit(report.ok ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main();
}
