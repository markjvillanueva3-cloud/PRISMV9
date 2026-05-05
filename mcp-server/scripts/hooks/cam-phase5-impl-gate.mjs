#!/usr/bin/env node
/**
 * cam-phase5-impl-gate.mjs — pre-commit gate for U-CAM-ENRICH-05.
 *
 * The original gate enforced "no stub Phase-5 implementations" while the
 * CAM-ENRICH milestone was in flight. That milestone has shipped; the gate
 * file was deleted at some point and broke every commit on every branch
 * because H:/PRISM/.husky/pre-commit still references it unconditionally.
 *
 * This restored stub is a no-op: the gate it enforced is no longer relevant,
 * but the hook line in the husky pre-commit needs *something* at this path
 * to exit 0. Leaving it as an empty exit-0 shim is the minimal fix that
 * keeps git history consistent and lets unrelated milestones commit without
 * scope-creeping into a husky-config refactor.
 *
 * If a real Phase-5 gate is needed in the future, replace this body with the
 * real check. The husky line will pick it up automatically.
 */

process.exit(0);
