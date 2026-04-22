#!/usr/bin/env node
/**
 * release-track.mjs — Release a track claim for this session
 *
 * Usage: node release-track.mjs
 *
 * Removes this session's track claim from SESSION_TRACK_CLAIMS.json.
 */

import fs from "node:fs";
import { inferAgentIdentity } from "./agent-identity.mjs";

const CLAIMS_FILE = "H:/prism/state/shared/SESSION_TRACK_CLAIMS.json";

function main() {
  const identity = inferAgentIdentity({});
  const sessionKey = identity.sessionKey;
  const now = new Date().toISOString();

  let data;
  try {
    data = JSON.parse(fs.readFileSync(CLAIMS_FILE, "utf-8"));
  } catch {
    console.log("No claims file found");
    return;
  }

  // Find and remove claims matching our session
  const keysToRemove = Object.keys(data.claims).filter(k =>
    k.includes(sessionKey) || k === sessionKey
  );

  if (keysToRemove.length === 0) {
    console.log(`No claims found for session: ${sessionKey}`);
    return;
  }

  for (const k of keysToRemove) {
    const claim = data.claims[k];
    console.log(`Released: ${claim.track} (key: ${k})`);
    delete data.claims[k];
  }

  data.updated = now;
  fs.writeFileSync(CLAIMS_FILE, JSON.stringify(data, null, 2) + "\n");
}

main();
