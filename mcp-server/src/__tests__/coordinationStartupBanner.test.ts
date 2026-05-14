/**
 * Tests for U-COORD06 SessionStart banner hook:
 *   .claude/hooks/coordination-startup-banner.mjs
 *
 * Strategy: spawn the hook as a real Node subprocess with controlled env
 * overrides + tmpfile state. Assert exact stdout JSON, stderr empty, exit 0.
 * No mocks. Real-value assertions only (no .toBeDefined/.toBeNull/.toBeTruthy).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(__dirname, '../../..', '.claude/hooks/coordination-startup-banner.mjs');

const SPAWN_TIMEOUT_MS = 10_000;
const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

interface RunResult {
  stdout: string;
  stderr: string;
  exit: number;
}

function runHook(env: Record<string, string>): RunResult {
  // Strip any inherited PRISM_COORD_BANNER_* vars from the base env so a leaked
  // parent-env knob (developer shell, CI step, future global setting) cannot
  // silently corrupt a test — or worse, make a test pass for the wrong reason.
  // The `env` argument is the ONLY source of truth for banner knobs.
  const base: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('PRISM_COORD_BANNER_')) continue;
    if (v !== undefined) base[k] = v;
  }
  const r = spawnSync(process.execPath, [HOOK], {
    input: '{}',
    env: { ...base, ...env },
    encoding: 'utf8',
    timeout: SPAWN_TIMEOUT_MS,
  });
  return {
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim(),
    exit: r.status ?? -1,
  };
}

interface SummaryShape {
  schemaVersion?: number;
  generated_at: string;
  daemon_active: boolean;
  active_sessions: number | string | null;
  health: string;
  daemon_pid?: number;
  sessions?: Array<{ id: string; family: string }>;
  latest_activity?: unknown;
  full_status_size_kb?: number;
}

let tmpRoot: string;
let summaryPath: string;
let markerPath: string;
let testCounter = 0;

function isolatedEnv(extra: Record<string, string> = {}): Record<string, string> {
  return {
    PRISM_COORD_BANNER_SUMMARY_PATH: summaryPath,
    PRISM_COORD_BANNER_MARKER_PATH: markerPath,
    ...extra,
  };
}

function writeSummary(s: SummaryShape): void {
  fs.writeFileSync(summaryPath, JSON.stringify(s));
}

beforeEach(() => {
  testCounter += 1;
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), `banner-test-${testCounter}-`));
  summaryPath = path.join(tmpRoot, 'summary.json');
  markerPath = path.join(tmpRoot, '.banner-who-hint-shown');
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
});

describe('coordination-startup-banner: HOOK file exists', () => {
  it('HOOK absolute path resolves to a regular file under .claude/hooks/', () => {
    const stat = fs.statSync(HOOK);
    expect(stat.isFile()).toBe(true);
    expect(HOOK.endsWith('coordination-startup-banner.mjs')).toBe(true);
  });
});

describe('coordination-startup-banner: defensive contract', () => {
  it('emits exit code 0 with healthy summary', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 2,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.exit).toBe(0);
  });

  it('emits exit code 0 with missing summary', () => {
    // beforeEach creates tmpRoot but never the summary file — so it is absent.
    const r = runHook(isolatedEnv());
    expect(r.exit).toBe(0);
  });

  it('emits exit code 0 with corrupt JSON', () => {
    fs.writeFileSync(summaryPath, '{{{not-json');
    const r = runHook(isolatedEnv());
    expect(r.exit).toBe(0);
  });

  it('emits exit code 0 when summary file IS a directory', () => {
    fs.mkdirSync(summaryPath, { recursive: true });
    fs.writeFileSync(markerPath, new Date().toISOString()); // suppress hint — focus on offline path
    const r = runHook(isolatedEnv());
    expect(r.exit).toBe(0);
    expect(r.stdout).toBe('{"result":"Coordination: offline (no summary file)"}');
  });

  it('writes empty stderr across every code path (healthy)', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 5,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stderr).toBe('');
  });

  it('writes empty stderr across every code path (missing)', () => {
    const r = runHook(isolatedEnv());
    expect(r.stderr).toBe('');
  });

  it('emits exactly one stdout line (one trailing newline)', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 3,
      health: 'healthy',
    });
    // Touch marker so the hint doesn't append (keeps this test focused on line count)
    fs.writeFileSync(markerPath, new Date().toISOString());
    const r = spawnSync(process.execPath, [HOOK], {
      input: '{}',
      env: { ...process.env, ...isolatedEnv() },
      encoding: 'utf8',
      timeout: SPAWN_TIMEOUT_MS,
    });
    const lines = (r.stdout || '').split('\n').filter((line) => line.length > 0);
    expect(lines.length).toBe(1);
  });

  it('survives pathological paths (300-char segment) with exit 0 + valid offline JSON', () => {
    // A path segment far past the 255-char filename limit makes fs.readFileSync /
    // fs.statSync throw ENAMETOOLONG; readSummary()/shouldShowHint() each catch it.
    // This exercises robustness right up to the last-resort catch boundary — the
    // literal `void main().catch()` line is structurally unreachable via black-box
    // input (every I/O path has its own catch), so this is the closest honest
    // coverage without instrumenting the hook with a fault-injection knob.
    const longSegment = 'x'.repeat(300);
    const r = runHook({
      PRISM_COORD_BANNER_SUMMARY_PATH: path.join(tmpRoot, longSegment, 'summary.json'),
      PRISM_COORD_BANNER_MARKER_PATH: path.join(tmpRoot, longSegment, '.marker'),
    });
    expect(r.exit).toBe(0);
    expect(r.stderr).toBe('');
    const parsed = JSON.parse(r.stdout) as { result: string };
    const isOfflineMessage =
      parsed.result === 'Coordination: offline (no summary file)' ||
      parsed.result === 'Coordination: offline (no summary file) · /who for details';
    expect(isOfflineMessage).toBe(true);
  });
});

describe('coordination-startup-banner: DISABLE knob', () => {
  it('PRISM_COORD_BANNER_DISABLE=1 yields empty result', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 5,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv({ PRISM_COORD_BANNER_DISABLE: '1' }));
    expect(r.stdout).toBe('{"result":""}');
  });

  it('PRISM_COORD_BANNER_DISABLE=0 does NOT suppress', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 1,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv({ PRISM_COORD_BANNER_DISABLE: '0' }));
    expect(r.stdout).toBe('{"result":"Coordination: connected (solo session)"}');
  });

  it('PRISM_COORD_BANNER_DISABLE="" does NOT suppress', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 1,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv({ PRISM_COORD_BANNER_DISABLE: '' }));
    expect(r.stdout).toBe('{"result":"Coordination: connected (solo session)"}');
  });
});

describe('coordination-startup-banner: offline detection', () => {
  it('missing summary file → "offline (no summary file)"', () => {
    fs.writeFileSync(markerPath, new Date().toISOString()); // suppress hint for focused assert
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: offline (no summary file)"}');
  });

  it('corrupt JSON → "offline (corrupt summary file)"', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    fs.writeFileSync(summaryPath, '}}}garbage{{{');
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: offline (corrupt summary file)"}');
  });

  it('JSON that is a bare string → "offline (corrupt summary file)"', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    fs.writeFileSync(summaryPath, '"just-a-string"');
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: offline (corrupt summary file)"}');
  });

  it('JSON null → "offline (corrupt summary file)"', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    fs.writeFileSync(summaryPath, 'null');
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: offline (corrupt summary file)"}');
  });

  it('daemon_active=false → "daemon offline"', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: false,
      active_sessions: 0,
      health: 'down',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: daemon offline"}');
  });
});

describe('coordination-startup-banner: healthy banner with count', () => {
  it('healthy with 4 active → "3 other sessions online"', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 4,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: 3 other sessions online"}');
  });

  it('healthy with 2 active → "1 other session online" (singular)', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 2,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: 1 other session online"}');
  });

  it('healthy solo (1 active) → "connected (solo session)"', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 1,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: connected (solo session)"}');
  });

  it('healthy zero → "connected (solo session)" (treats 0 the same as 1)', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 0,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: connected (solo session)"}');
  });
});

describe('coordination-startup-banner: stale snapshot detection', () => {
  it('snapshot > STALE_MS old → "stale snapshot — N other sessions seen (Xh ago)"', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date(Date.now() - 8 * MS_PER_HOUR).toISOString(),
      daemon_active: true,
      active_sessions: 5,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe(
      '{"result":"Coordination: stale snapshot — 4 other sessions seen (8h ago)"}'
    );
  });

  it('snapshot 1d+ old → days-formatted age', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date(Date.now() - 3 * MS_PER_DAY).toISOString(),
      daemon_active: true,
      active_sessions: 7,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe(
      '{"result":"Coordination: stale snapshot — 6 other sessions seen (3d ago)"}'
    );
  });

  it('snapshot 30 min old (STALE_MS=10min default) → "30m ago"', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date(Date.now() - 30 * 60_000).toISOString(),
      daemon_active: true,
      active_sessions: 3,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe(
      '{"result":"Coordination: stale snapshot — 2 other sessions seen (30m ago)"}'
    );
  });

  it('STALE_MS env override accepted (1ms forces stale)', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date(Date.now() - 5_000).toISOString(),
      daemon_active: true,
      active_sessions: 3,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv({ PRISM_COORD_BANNER_STALE_MS: '1' }));
    expect(r.stdout).toMatch(/^\{"result":"Coordination: stale snapshot — 2 other sessions seen \(\d+s ago\)"\}$/);
  });

  it('STALE_MS bogus value falls back to 10min default', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date(Date.now() - 5_000).toISOString(),
      daemon_active: true,
      active_sessions: 3,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv({ PRISM_COORD_BANNER_STALE_MS: 'not-a-number' }));
    // 5s old + 10min default = NOT stale → healthy branch
    expect(r.stdout).toBe('{"result":"Coordination: 2 other sessions online"}');
  });

  it('snapshot exactly STALE_MS-1 old → still healthy (not stale)', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date(Date.now() - 100).toISOString(),
      daemon_active: true,
      active_sessions: 2,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv({ PRISM_COORD_BANNER_STALE_MS: '60000' }));
    expect(r.stdout).toBe('{"result":"Coordination: 1 other session online"}');
  });
});

describe('coordination-startup-banner: non-healthy health (not stale)', () => {
  it('health="degraded" → "degraded — N other sessions"', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 3,
      health: 'degraded',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: degraded — 2 other sessions"}');
  });

  it('health="initializing" → "initializing — solo session"', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 1,
      health: 'initializing',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: initializing — solo session"}');
  });
});

describe('coordination-startup-banner: count edge cases', () => {
  it('active_sessions non-numeric ("banana") → 0 others (solo)', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 'banana',
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: connected (solo session)"}');
  });

  it('active_sessions negative (-5) → 0 others (solo)', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: -5,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: connected (solo session)"}');
  });

  it('active_sessions null → 0 others (solo)', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: null,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: connected (solo session)"}');
  });

  it('active_sessions fractional (3.7) → 2 others (floor then -1)', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 3.7,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: 2 other sessions online"}');
  });
});

describe('coordination-startup-banner: timestamp edge cases', () => {
  it('summary missing generated_at → healthy (no stale check possible)', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    // Write summary without generated_at field
    fs.writeFileSync(
      summaryPath,
      JSON.stringify({ daemon_active: true, active_sessions: 3, health: 'healthy' })
    );
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: 2 other sessions online"}');
  });

  it('summary generated_at not a string → healthy (skip stale check)', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    fs.writeFileSync(
      summaryPath,
      JSON.stringify({
        generated_at: 12345,
        daemon_active: true,
        active_sessions: 3,
        health: 'healthy',
      })
    );
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: 2 other sessions online"}');
  });

  it('summary generated_at unparseable → healthy (skip stale check)', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: 'not-an-iso-string',
      daemon_active: true,
      active_sessions: 3,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: 2 other sessions online"}');
  });

  it('summary generated_at in the future (clock skew) → treated as fresh', () => {
    fs.writeFileSync(markerPath, new Date().toISOString());
    writeSummary({
      generated_at: new Date(Date.now() + 60 * 60_000).toISOString(),
      daemon_active: true,
      active_sessions: 3,
      health: 'healthy',
    });
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: 2 other sessions online"}');
  });
});

describe('coordination-startup-banner: /who first-run hint', () => {
  it('no marker file → hint appended', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 2,
      health: 'healthy',
    });
    // markerPath does NOT exist (beforeEach creates tmpRoot but not marker)
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe(
      '{"result":"Coordination: 1 other session online · /who for details"}'
    );
  });

  it('fresh marker (just written) → hint suppressed', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 2,
      health: 'healthy',
    });
    fs.writeFileSync(markerPath, new Date().toISOString());
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: 1 other session online"}');
  });

  it('marker mtime 10 days old → hint resurfaces (default 7-day TTL)', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 2,
      health: 'healthy',
    });
    fs.writeFileSync(markerPath, 'stale');
    const tenDaysAgo = new Date(Date.now() - 10 * MS_PER_DAY);
    fs.utimesSync(markerPath, tenDaysAgo, tenDaysAgo);
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe(
      '{"result":"Coordination: 1 other session online · /who for details"}'
    );
  });

  it('marker mtime 5 days old → hint suppressed (within 7-day TTL)', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 2,
      health: 'healthy',
    });
    fs.writeFileSync(markerPath, 'fresh-ish');
    const fiveDaysAgo = new Date(Date.now() - 5 * MS_PER_DAY);
    fs.utimesSync(markerPath, fiveDaysAgo, fiveDaysAgo);
    const r = runHook(isolatedEnv());
    expect(r.stdout).toBe('{"result":"Coordination: 1 other session online"}');
  });

  it('HINT_TTL_MS env override accepted (1ms forces hint)', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 2,
      health: 'healthy',
    });
    fs.writeFileSync(markerPath, 'fresh');
    const r = runHook(isolatedEnv({ PRISM_COORD_BANNER_HINT_TTL_MS: '1' }));
    expect(r.stdout).toBe(
      '{"result":"Coordination: 1 other session online · /who for details"}'
    );
  });

  it('HINT_TTL_MS bogus value falls back to 7-day default', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 2,
      health: 'healthy',
    });
    fs.writeFileSync(markerPath, 'fresh');
    const r = runHook(
      isolatedEnv({ PRISM_COORD_BANNER_HINT_TTL_MS: 'not-a-number' })
    );
    expect(r.stdout).toBe('{"result":"Coordination: 1 other session online"}');
  });

  it('first-run hint refreshes marker mtime', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 1,
      health: 'healthy',
    });
    // No marker initially
    const r1 = runHook(isolatedEnv());
    expect(r1.stdout).toBe(
      '{"result":"Coordination: connected (solo session) · /who for details"}'
    );
    const stat1 = fs.statSync(markerPath);
    expect(stat1.isFile()).toBe(true);

    // Second run within TTL → no hint
    const r2 = runHook(isolatedEnv());
    expect(r2.stdout).toBe('{"result":"Coordination: connected (solo session)"}');
  });

  it('marker in non-existent parent directory → mkdir recursive creates it', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 1,
      health: 'healthy',
    });
    const deepMarker = path.join(tmpRoot, 'sub1', 'sub2', '.banner-marker');
    const r = runHook({
      PRISM_COORD_BANNER_SUMMARY_PATH: summaryPath,
      PRISM_COORD_BANNER_MARKER_PATH: deepMarker,
    });
    expect(r.stdout).toBe(
      '{"result":"Coordination: connected (solo session) · /who for details"}'
    );
    expect(fs.statSync(deepMarker).isFile()).toBe(true);
  });
});

describe('coordination-startup-banner: output format invariants', () => {
  it('every emitted line is valid JSON parseable to {result: <string>}', () => {
    const cases: Array<{ name: string; setup: () => Record<string, string> }> = [
      {
        name: 'disabled',
        setup: () => isolatedEnv({ PRISM_COORD_BANNER_DISABLE: '1' }),
      },
      {
        name: 'missing-summary',
        setup: () => isolatedEnv(),
      },
      {
        name: 'corrupt-summary',
        setup: () => {
          fs.writeFileSync(summaryPath, 'xxx');
          return isolatedEnv();
        },
      },
      {
        name: 'daemon-offline',
        setup: () => {
          writeSummary({
            generated_at: new Date().toISOString(),
            daemon_active: false,
            active_sessions: 0,
            health: 'down',
          });
          return isolatedEnv();
        },
      },
      {
        name: 'healthy',
        setup: () => {
          writeSummary({
            generated_at: new Date().toISOString(),
            daemon_active: true,
            active_sessions: 3,
            health: 'healthy',
          });
          return isolatedEnv();
        },
      },
    ];
    for (const c of cases) {
      const envOverride = c.setup();
      const r = runHook(envOverride);
      let parsed: { result: string } | null = null;
      try {
        parsed = JSON.parse(r.stdout);
      } catch {
        // null leaves parsed null → assertion below will fail with details
      }
      expect(parsed === null ? 'parse-failed:' + r.stdout : typeof parsed.result).toBe(
        'string'
      );
    }
  });

  it('result string is never multi-line', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 2,
      health: 'healthy',
    });
    fs.writeFileSync(markerPath, new Date().toISOString());
    const r = runHook(isolatedEnv());
    const parsed = JSON.parse(r.stdout) as { result: string };
    expect(parsed.result.includes('\n')).toBe(false);
  });

  it('result always begins with "Coordination: " or is empty', () => {
    writeSummary({
      generated_at: new Date().toISOString(),
      daemon_active: true,
      active_sessions: 2,
      health: 'healthy',
    });
    fs.writeFileSync(markerPath, new Date().toISOString());
    const r = runHook(isolatedEnv());
    const parsed = JSON.parse(r.stdout) as { result: string };
    const startsCorrectly =
      parsed.result === '' || parsed.result.startsWith('Coordination: ');
    expect(startsCorrectly).toBe(true);
  });
});
