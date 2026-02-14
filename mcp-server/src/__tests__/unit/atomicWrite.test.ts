/**
 * PRISM MCP Server — atomicWrite Unit Tests
 * P0-MS0a Step 16d: Verify crash-safe write behavior.
 * 
 * Tests:
 * - Writes file successfully
 * - File content matches input
 * - No .tmp files left after successful write
 * - Serializes concurrent writes (no corruption)
 */

import { describe, it, expect, afterEach } from 'vitest';
import { atomicWrite } from '../../utils/atomicWrite.js';
import { readFile, unlink, readdir } from 'fs/promises';
import path from 'path';
import os from 'os';

const TEST_DIR = os.tmpdir();

function testPath(name: string): string {
  return path.join(TEST_DIR, `prism-test-${name}-${Date.now()}.txt`);
}

async function cleanup(filePath: string): Promise<void> {
  try { await unlink(filePath); } catch { /* ignore */ }
}

describe('atomicWrite', () => {
  const paths: string[] = [];

  afterEach(async () => {
    for (const p of paths) await cleanup(p);
    paths.length = 0;
  });

  it('writes file with correct content', async () => {
    const p = testPath('basic');
    paths.push(p);
    await atomicWrite(p, 'hello PRISM');
    const content = await readFile(p, 'utf-8');
    expect(content).toBe('hello PRISM');
  });

  it('overwrites existing file', async () => {
    const p = testPath('overwrite');
    paths.push(p);
    await atomicWrite(p, 'version 1');
    await atomicWrite(p, 'version 2');
    const content = await readFile(p, 'utf-8');
    expect(content).toBe('version 2');
  });

  it('leaves no .tmp files after success', async () => {
    const p = testPath('notmp');
    paths.push(p);
    await atomicWrite(p, 'clean write');
    const dir = path.dirname(p);
    const base = path.basename(p);
    const files = await readdir(dir);
    const tmps = files.filter(f => f.startsWith(base) && f.endsWith('.tmp'));
    expect(tmps).toHaveLength(0);
  });

  it('serializes concurrent writes without corruption', async () => {
    const p = testPath('concurrent');
    paths.push(p);
    // Fire 5 concurrent writes — last one should win
    const writes = Array.from({ length: 5 }, (_, i) =>
      atomicWrite(p, `write-${i}`)
    );
    await Promise.all(writes);
    const content = await readFile(p, 'utf-8');
    // Content should be one of the writes (not corrupted/mixed)
    expect(content).toMatch(/^write-\d$/);
  });
});
