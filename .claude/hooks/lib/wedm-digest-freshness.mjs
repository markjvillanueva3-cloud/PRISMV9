// tier: T1
/**
 * wedm-digest-freshness hook
 * Warns if WEDM_DIGEST.json is older than 7 days
 *
 * Built by: MS-P0-V / U-P0-V03
 * Hook type: PreToolUse (Write/Edit on WEDM files)
 */

import { statSync, existsSync } from 'fs';
import { join } from 'path';

const DIGEST_PATH = join(process.env.PRISM_ROOT || 'H:/PRISM', 'mcp-server/data/state/WEDM_DIGEST.json');
const MAX_AGE_DAYS = 7;

export function checkDigestFreshness() {
  if (!existsSync(DIGEST_PATH)) {
    return {
      status: 'warn',
      message: 'WEDM_DIGEST.json does not exist. Run wedm_generate_digest.ts to create it.'
    };
  }

  const stats = statSync(DIGEST_PATH);
  const ageMs = Date.now() - stats.mtimeMs;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays > MAX_AGE_DAYS) {
    return {
      status: 'warn',
      message: `WEDM_DIGEST.json is ${Math.floor(ageDays)} days old. Consider running wedm_generate_digest.ts to refresh.`
    };
  }

  return {
    status: 'pass',
    message: `WEDM_DIGEST.json is fresh (${Math.floor(ageDays)} days old)`
  };
}

export default checkDigestFreshness;
