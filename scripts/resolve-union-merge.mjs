#!/usr/bin/env node
// Resolve a 3-way merge conflict by concatenating both halves of every
// <<<<<<< HEAD ... ======= ... >>>>>>> ... block.
//
// Use ONLY when conflict is purely additive (e.g. two sides added different
// items to the same list/array/switch). NOT safe for overlapping edits.
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: resolve-union-merge.mjs <file>'); process.exit(2); }

const original = readFileSync(file, 'utf8');
const lines = original.split('\n');
const out = [];

let inConflict = false;
let inOurs = false;
let oursBuf = [];
let theirsBuf = [];

for (const line of lines) {
  if (line.startsWith('<<<<<<<')) {
    inConflict = true;
    inOurs = true;
    oursBuf = [];
    theirsBuf = [];
    continue;
  }
  if (inConflict && line.startsWith('=======')) {
    inOurs = false;
    continue;
  }
  if (inConflict && line.startsWith('>>>>>>>')) {
    out.push(...oursBuf, ...theirsBuf);
    inConflict = false;
    inOurs = false;
    oursBuf = [];
    theirsBuf = [];
    continue;
  }
  if (inConflict) {
    if (inOurs) oursBuf.push(line);
    else theirsBuf.push(line);
    continue;
  }
  out.push(line);
}

writeFileSync(file, out.join('\n'), 'utf8');
console.log(`Resolved ${file}`);
