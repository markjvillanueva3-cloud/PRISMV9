#!/usr/bin/env node
/**
 * session-identity-check.mjs — Diagnostic tool to verify session identity
 *
 * Run this to see how the compaction system will identify your session.
 * Helps debug cross-session context bleed issues.
 */

import fs from "node:fs";
import path from "node:path";
import { inferAgentIdentity, sanitizeIdentityKey } from "./agent-identity.mjs";

const SURVIVAL_DIR = "H:/prism/.claude/helpers";
const CLAIMS_FILE = "H:/prism/state/shared/SESSION_TRACK_CLAIMS.json";
const HANDOFFS_DIR = "H:/prism/state/shared/handoffs";

function main() {
  const identity = inferAgentIdentity({});

  console.log("=== SESSION IDENTITY ===");
  console.log(`Family:     ${identity.family}`);
  console.log(`Machine:    ${identity.machine}`);
  console.log(`SessionKey: ${identity.sessionKey}`);
  console.log(`Instance:   ${identity.instance}`);
  console.log();

  // Check expected survival file
  const key = sanitizeIdentityKey(identity.instance, `${identity.family}-${identity.sessionKey}`);
  const expectedSurvival = `.compaction-survival-${key}.md`;
  const survivalPath = path.join(SURVIVAL_DIR, expectedSurvival);

  console.log("=== COMPACTION SURVIVAL ===");
  console.log(`Expected file: ${expectedSurvival}`);
  console.log(`Full path:     ${survivalPath}`);

  if (fs.existsSync(survivalPath)) {
    const stat = fs.statSync(survivalPath);
    const ageMin = Math.round((Date.now() - stat.mtimeMs) / 60000);
    console.log(`Status:        EXISTS (${ageMin}m old)`);
  } else {
    console.log(`Status:        NOT FOUND`);

    // List similar files
    const files = fs.readdirSync(SURVIVAL_DIR).filter(f =>
      f.startsWith(".compaction-survival-") && f.includes(identity.machine)
    );
    if (files.length > 0) {
      console.log(`Similar files: ${files.slice(0, 5).join(", ")}`);
    }
  }
  console.log();

  // Check track claims
  console.log("=== TRACK CLAIMS ===");
  try {
    const data = JSON.parse(fs.readFileSync(CLAIMS_FILE, "utf-8"));
    const myClaim = data.claims[identity.sessionKey];

    if (myClaim) {
      console.log(`Your claim:    ${myClaim.track}`);
      console.log(`Claimed at:    ${myClaim.claimed_at}`);
    } else {
      console.log(`Your claim:    NONE (session key: ${identity.sessionKey})`);
    }

    const otherClaims = Object.entries(data.claims)
      .filter(([k]) => k !== identity.sessionKey && k !== "THIS_SESSION")
      .map(([k, v]) => `${k}→${v.track}`);

    if (otherClaims.length > 0) {
      console.log(`Other claims:  ${otherClaims.join(", ")}`);
    } else {
      console.log(`Other claims:  NONE`);
    }

    if (data.claims.THIS_SESSION) {
      console.log(`WARNING:       THIS_SESSION placeholder still exists (BUG)`);
    }
  } catch (err) {
    console.log(`Error:         ${err.message}`);
  }
  console.log();

  // Check handoffs
  console.log("=== HANDOFFS ===");
  try {
    const files = fs.readdirSync(HANDOFFS_DIR).filter(f =>
      f.startsWith("HANDOFF-") && f.endsWith(".md")
    );

    const myHandoffs = files.filter(f =>
      f.includes(identity.sessionKey) || f.includes(identity.machine)
    );

    if (myHandoffs.length > 0) {
      console.log(`Your handoffs: ${myHandoffs.join(", ")}`);
    } else {
      console.log(`Your handoffs: NONE`);
    }

    console.log(`Total active:  ${files.length}`);
  } catch (err) {
    console.log(`Error:         ${err.message}`);
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
