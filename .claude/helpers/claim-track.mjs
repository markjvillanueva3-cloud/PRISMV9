#!/usr/bin/env node
/**
 * claim-track.mjs — Register a track claim with proper session identity
 *
 * Usage: node claim-track.mjs <track> [notes]
 *
 * This helper ensures claims are keyed by ACTUAL session identity (PID),
 * preventing the cross-session context bleed caused by the old THIS_SESSION bug.
 */

import fs from "node:fs";
import process from "node:process";
import { inferAgentIdentity } from "./agent-identity.mjs";

const CLAIMS_FILE = "H:/prism/state/shared/SESSION_TRACK_CLAIMS.json";

function main() {
  const track = process.argv[2];
  const notes = process.argv.slice(3).join(" ") || "";

  if (!track) {
    console.error("Usage: node claim-track.mjs <track> [notes]");
    console.error("Example: node claim-track.mjs LATHE-PROD-READY-MS0 'Continuing Phase 2'");
    process.exit(1);
  }

  const identity = inferAgentIdentity({});
  const sessionKey = identity.sessionKey;
  const now = new Date().toISOString();

  let data;
  try {
    data = JSON.parse(fs.readFileSync(CLAIMS_FILE, "utf-8"));
  } catch {
    data = {
      schema_version: "3.0.0",
      description: "Track claims keyed by session identity",
      updated: now,
      claims: {},
      available_tracks: [],
      blocked_tracks: [],
    };
  }

  // Remove any stale claims from THIS session (in case of session restart)
  const keysToRemove = Object.keys(data.claims).filter(k =>
    k.includes(sessionKey) || k === "THIS_SESSION"
  );
  for (const k of keysToRemove) {
    delete data.claims[k];
  }

  // Add new claim with real session identity
  data.claims[sessionKey] = {
    track,
    milestone: track,
    claimed_at: now,
    instance: identity.instance,
    notes: notes || `Claimed by ${identity.instance}`,
  };

  data.updated = now;

  fs.writeFileSync(CLAIMS_FILE, JSON.stringify(data, null, 2) + "\n");

  console.log(`Track claimed: ${track}`);
  console.log(`Session key: ${sessionKey}`);
  console.log(`Instance: ${identity.instance}`);
}

main();
