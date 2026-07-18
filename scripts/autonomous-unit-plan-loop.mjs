#!/usr/bin/env node
/**
 * PRISM Autonomous Unit Plan Loop (Zulu)
 *
 * Continuously drives the Master Unit Plan with full PRISM rule enforcement.
 * - Loads prism-protocol-enforcer + scrutiny + auto-learning skills
 * - Picks highest-ROI ready units
 * - Runs harness with Hermes/Ollama
 * - Enforces 3-of-3 scrutiny + no-stubs + dedup
 * - Auto-generates memories/wiki on mistakes
 * - Sleeps between cycles
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HARNESS = path.resolve(HERE, 'hermes-unit-plan-harness.mjs');
const VERIFY = path.resolve(HERE, 'hermes-unit-plan-verify-harness.mjs');
const REQUEUE = path.resolve(HERE, 'hermes-unit-plan-requeue.mjs');

const LOOP_INTERVAL_MIN = parseInt(process.env.UNIT_PLAN_LOOP_INTERVAL_MIN || '15', 10);
const MAX_CYCLES = parseInt(process.env.UNIT_PLAN_MAX_CYCLES || '0', 10); // 0 = infinite

let cycle = 0;

async function runCycle() {
  cycle++;
  console.log(`\n=== Autonomous Unit Plan Loop -- Cycle ${cycle} ===`);

  // 1. Run harness (dry-run first to get queue)
  const status = spawnSync(process.execPath, [HARNESS, '--status', '--json'], { stdio: 'pipe' });
  if (status.stdout) {
    console.log('Queue snapshot:', status.stdout.toString().slice(0, 800));
  }

  // 2. Execute one capped pass (enforces PRISM rules via harness + skills)
  const run = spawnSync(process.execPath, [HARNESS, '--cap', '2'], { stdio: 'inherit' });
  if (run.status !== 0) {
    console.error('Harness run failed');
  }

  // 3. VERIFY drafts -> promote build-ready, flag NEEDS-REWORK. This was a `// Future:` stub;
  //    without it the drafter drains (actionable=0) and the pipeline idles with UNREVIEWED drafts
  //    stuck forever. The verify harness is deterministic (+Ollama-advisory), fail-soft, exit 0 --
  //    it gives the loop continuous work after drafts drain and produces build-ready-queue.json for
  //    a specialist/build slot to consume (the "no down time" pipeline advance, R15 WIRE step).
  // --no-llm: keep the deterministic gate fast so a hung Ollama can't pin the shared lock while
  // the 13-min scheduled --no-llm task waits (scrutiny arms A+C). The Ollama opinion is advisory.
  const verify = spawnSync(process.execPath, [VERIFY, '--no-llm', '--cap', '20'], { stdio: 'inherit' });
  if (verify.status !== 0) console.error('Verify harness run failed');

  // 4. REQUEUE NEEDS-REWORK -> redraft. Closes the loop's only dead-end: a draft the verify stage
  //    flags NEEDS-REWORK is DROPPED from build-ready-queue AND left Status="Drafted", so the drafter
  //    (orderQueue excludes non-"Not Started") never re-picks it -- stuck forever (the silent-done
  //    no-downtime hole, R12). This stage resets those units and re-drafts at a higher token budget
  //    (the truncation that usually caused the NEEDS-REWORK). Structural (split/replace) verdicts +
  //    units past the redraft cap are surfaced needs-human, never looped. Fail-soft, exit 0.
  const requeue = spawnSync(process.execPath, [REQUEUE, '--apply', '--cap', '2'], { stdio: 'inherit' });
  if (requeue.status !== 0) console.error('Requeue stage run failed');

  if (MAX_CYCLES > 0 && cycle >= MAX_CYCLES) {
    console.log('Max cycles reached. Exiting.');
    process.exit(0);
  }

  console.log(`Sleeping ${LOOP_INTERVAL_MIN} minutes...\n`);
  await new Promise(r => setTimeout(r, LOOP_INTERVAL_MIN * 60 * 1000));
}

async function main() {
  console.log('PRISM Autonomous Unit Plan Loop started (Zulu)');
  while (true) {
    await runCycle();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});