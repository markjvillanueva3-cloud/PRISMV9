/**
 * InboxPruneStale.test.ts
 *
 * OBSIDIAN-AUTOMATE-MS3/U-INBOX-PRUNE-CRON
 *
 * Validates the inbox-prune-stale cron entry: stale files (>48h) get archived,
 * fresh files stay, machine-generated files (brief-/perf-report-/resources-)
 * are exempt regardless of age, dry-run never moves anything, errors are
 * non-fatal, idempotent re-run.
 *
 * 11 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync, rmSync, utimesSync, statSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInboxPrune } from "../../scripts/inbox-prune-stale.mjs";

let tmpInbox: string;
let tmpArchive: string;
let tmpStateFile: string;

const NOW = Date.UTC(2026, 4, 8, 5, 7, 0); // matches cron fire moment
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function writeAged(name: string, body: string, ageMs: number): string {
  const full = join(tmpInbox, name);
  writeFileSync(full, body, "utf8");
  const mt = new Date(NOW - ageMs);
  utimesSync(full, mt, mt);
  return full;
}

beforeEach(() => {
  tmpInbox = mkdtempSync(join(tmpdir(), "prune-inbox-"));
  tmpArchive = join(tmpInbox, "archived-stale");
  tmpStateFile = join(tmpInbox, "state.json");
});

afterEach(() => {
  rmSync(tmpInbox, { recursive: true, force: true });
});

describe("inbox-prune-stale (cron entry)", () => {
  // -------------------- HAPPY PATHS --------------------

  it("archives a single >48h file when --apply", () => {
    writeAged("old.md", "stale capture", 3 * DAY_MS);
    const r = runInboxPrune({
      flags: { apply: true },
      inbox: tmpInbox,
      archive: tmpArchive,
      now: NOW,
      stateFile: tmpStateFile,
    });
    expect(r.archived).toBe(1);
    expect(r.errored).toBe(0);
    expect(existsSync(join(tmpInbox, "old.md"))).toBe(false);
    expect(existsSync(join(tmpArchive, "old.md"))).toBe(true);
  });

  it("dry-run lists candidates without moving them", () => {
    writeAged("old.md", "stale capture", 3 * DAY_MS);
    const r = runInboxPrune({
      flags: { apply: false },
      inbox: tmpInbox,
      archive: tmpArchive,
      now: NOW,
      stateFile: tmpStateFile,
    });
    expect(r.scanned).toBe(1);
    expect(r.archived).toBe(0);
    expect(existsSync(join(tmpInbox, "old.md"))).toBe(true);
    expect(existsSync(tmpArchive)).toBe(false);
  });

  it("leaves files <48h alone", () => {
    writeAged("fresh.md", "today", 6 * HOUR_MS);
    const r = runInboxPrune({
      flags: { apply: true },
      inbox: tmpInbox,
      archive: tmpArchive,
      now: NOW,
      stateFile: tmpStateFile,
    });
    expect(r.scanned).toBe(0);
    expect(existsSync(join(tmpInbox, "fresh.md"))).toBe(true);
  });

  it("threshold is exactly 48h — 47h kept, 49h archived", () => {
    writeAged("just-fresh.md", "fresh", 47 * HOUR_MS);
    writeAged("just-stale.md", "stale", 49 * HOUR_MS);
    const r = runInboxPrune({
      flags: { apply: true },
      inbox: tmpInbox,
      archive: tmpArchive,
      now: NOW,
      stateFile: tmpStateFile,
    });
    expect(r.archived).toBe(1);
    expect(existsSync(join(tmpInbox, "just-fresh.md"))).toBe(true);
    expect(existsSync(join(tmpInbox, "just-stale.md"))).toBe(false);
    expect(existsSync(join(tmpArchive, "just-stale.md"))).toBe(true);
  });

  it("multiple stale files all archive in one run", () => {
    writeAged("a.md", "a", 3 * DAY_MS);
    writeAged("b.md", "b", 4 * DAY_MS);
    writeAged("c.md", "c", 5 * DAY_MS);
    const r = runInboxPrune({
      flags: { apply: true },
      inbox: tmpInbox,
      archive: tmpArchive,
      now: NOW,
      stateFile: tmpStateFile,
    });
    expect(r.archived).toBe(3);
    expect(readdirSync(tmpArchive).length).toBe(3);
  });

  // -------------------- EXEMPT FILES --------------------

  it("brief-* files are exempt regardless of age", () => {
    writeAged("brief-2026-05-01.md", "old brief", 30 * DAY_MS);
    const r = runInboxPrune({
      flags: { apply: true },
      inbox: tmpInbox,
      archive: tmpArchive,
      now: NOW,
      stateFile: tmpStateFile,
    });
    expect(r.scanned).toBe(0);
    expect(existsSync(join(tmpInbox, "brief-2026-05-01.md"))).toBe(true);
  });

  it("perf-report-* files are exempt", () => {
    writeAged("perf-report-2026-04.md", "old report", 60 * DAY_MS);
    const r = runInboxPrune({
      flags: { apply: true },
      inbox: tmpInbox,
      archive: tmpArchive,
      now: NOW,
      stateFile: tmpStateFile,
    });
    expect(r.scanned).toBe(0);
  });

  it("resources-* markers are exempt", () => {
    writeAged("resources-haas-abc-2026-04-01.md", "marker", 30 * DAY_MS);
    const r = runInboxPrune({
      flags: { apply: true },
      inbox: tmpInbox,
      archive: tmpArchive,
      now: NOW,
      stateFile: tmpStateFile,
    });
    expect(r.scanned).toBe(0);
  });

  // -------------------- EDGE CASES --------------------

  it("empty inbox → ok with zero counts", () => {
    const r = runInboxPrune({
      flags: { apply: true },
      inbox: tmpInbox,
      archive: tmpArchive,
      now: NOW,
      stateFile: tmpStateFile,
    });
    expect(r.scanned).toBe(0);
    expect(r.archived).toBe(0);
    expect(r.errored).toBe(0);
  });

  it("idempotent — re-running on already-archived corpus is a no-op", () => {
    writeAged("old.md", "stale", 3 * DAY_MS);
    runInboxPrune({
      flags: { apply: true }, inbox: tmpInbox, archive: tmpArchive, now: NOW, stateFile: tmpStateFile,
    });
    const r2 = runInboxPrune({
      flags: { apply: true }, inbox: tmpInbox, archive: tmpArchive, now: NOW, stateFile: tmpStateFile,
    });
    expect(r2.scanned).toBe(0);
    expect(r2.archived).toBe(0);
  });

  it("non-md files in inbox are ignored", () => {
    writeAged("notes.txt", "old txt", 3 * DAY_MS);
    writeAged("photo.png", "binary", 3 * DAY_MS);
    const r = runInboxPrune({
      flags: { apply: true },
      inbox: tmpInbox,
      archive: tmpArchive,
      now: NOW,
      stateFile: tmpStateFile,
    });
    expect(r.scanned).toBe(0);
  });

  it("persists state file with run summary", () => {
    writeAged("old.md", "stale", 3 * DAY_MS);
    runInboxPrune({
      flags: { apply: true }, inbox: tmpInbox, archive: tmpArchive, now: NOW, stateFile: tmpStateFile,
    });
    expect(existsSync(tmpStateFile)).toBe(true);
    const stateRaw = JSON.parse(readFileSync(tmpStateFile, "utf8"));
    expect(stateRaw.lastApply).toBe(true);
    expect(stateRaw.lastScanned).toBe(1);
    expect(stateRaw.lastArchived).toBe(1);
  });
});
