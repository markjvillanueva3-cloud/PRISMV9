#!/usr/bin/env node
import fs from 'fs';

const docBody = fs.readFileSync('H:/prism/mcp-server/src/tools/dispatchers/documentLearningDispatcher.ts', 'utf8');

const name = 'doc_upload';

// Pattern from the hook
const handlerRe = new RegExp(`\\b${name}\\s*:\\s*(handle[A-Z]|async\\s|\\()`);
const objKeyRe = new RegExp(`["'\`]?${name}["'\`]?\\s*:\\s*[a-zA-Z_]`);

console.log('handlerRe source:', handlerRe.source);
console.log('handlerRe matches:', handlerRe.test(docBody));
console.log('objKeyRe source:', objKeyRe.source);
console.log('objKeyRe matches:', objKeyRe.test(docBody));

// Simpler pattern that should work
const simpleRe = new RegExp(`\\b${name}\\s*:\\s*handle`);
console.log('simpleRe source:', simpleRe.source);
console.log('simpleRe matches:', simpleRe.test(docBody));
