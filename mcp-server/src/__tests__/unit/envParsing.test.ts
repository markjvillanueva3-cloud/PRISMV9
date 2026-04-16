/**
 * Unit tests for envBool, envString, envInt
 */

import { describe, it, expect, afterEach } from 'vitest';
import { envBool, envString, envInt } from '../../utils/env.js';

describe('envBool', () => {
  afterEach(() => { delete process.env.TEST_BOOL; });

  it('returns fallback when env var is undefined', () => {
    expect(envBool('TEST_BOOL')).toBe(false);
    expect(envBool('TEST_BOOL', true)).toBe(true);
  });

  it('parses "true" as true (case-insensitive)', () => {
    process.env.TEST_BOOL = 'true';
    expect(envBool('TEST_BOOL')).toBe(true);
    process.env.TEST_BOOL = 'TRUE';
    expect(envBool('TEST_BOOL')).toBe(true);
    process.env.TEST_BOOL = 'True';
    expect(envBool('TEST_BOOL')).toBe(true);
  });

  it('parses "1" and "yes" as true', () => {
    process.env.TEST_BOOL = '1';
    expect(envBool('TEST_BOOL')).toBe(true);
    process.env.TEST_BOOL = 'yes';
    expect(envBool('TEST_BOOL')).toBe(true);
  });

  it('parses "false", "0", "no" as false', () => {
    process.env.TEST_BOOL = 'false';
    expect(envBool('TEST_BOOL')).toBe(false);
    process.env.TEST_BOOL = '0';
    expect(envBool('TEST_BOOL')).toBe(false);
    process.env.TEST_BOOL = 'no';
    expect(envBool('TEST_BOOL')).toBe(false);
  });

  it('trims whitespace', () => {
    process.env.TEST_BOOL = '  true  ';
    expect(envBool('TEST_BOOL')).toBe(true);
  });
});

describe('envString', () => {
  afterEach(() => { delete process.env.TEST_STR; });

  it('returns fallback when undefined', () => {
    expect(envString('TEST_STR', 'default')).toBe('default');
  });

  it('returns the env value when set', () => {
    process.env.TEST_STR = 'hello';
    expect(envString('TEST_STR', 'default')).toBe('hello');
  });

  it('returns fallback for empty string', () => {
    process.env.TEST_STR = '';
    expect(envString('TEST_STR', 'default')).toBe('default');
  });

  it('trims whitespace', () => {
    process.env.TEST_STR = '  hello  ';
    expect(envString('TEST_STR', 'default')).toBe('hello');
  });
});

describe('envInt', () => {
  afterEach(() => { delete process.env.TEST_INT; });

  it('returns fallback when undefined', () => {
    expect(envInt('TEST_INT', 42)).toBe(42);
  });

  it('parses valid integers', () => {
    process.env.TEST_INT = '100';
    expect(envInt('TEST_INT', 0)).toBe(100);
  });

  it('returns fallback for non-numeric', () => {
    process.env.TEST_INT = 'abc';
    expect(envInt('TEST_INT', 42)).toBe(42);
  });

  it('returns fallback for empty string', () => {
    process.env.TEST_INT = '';
    expect(envInt('TEST_INT', 42)).toBe(42);
  });

  it('truncates floats to integers', () => {
    process.env.TEST_INT = '3.14';
    expect(envInt('TEST_INT', 0)).toBe(3);
  });
});
