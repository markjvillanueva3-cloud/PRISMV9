// scripts/lib/graph-stream-degree.mjs
// -----------------------------------
// Streaming degree-0 detector for the 643MB system-graph.json (U-GRAPH-STREAM-DEGREE,
// 2026-06-09 slot:alpha).
//
// THE PROBLEM: graph-io.mjs `readGraphStreaming` only dodges the V8 512MB
// STRING-cap during parse -- it still MATERIALIZES the full `{nodes:[...],
// edges:[...]}` object (arr.push + result[key]=arr), so the 110K-node / 643MB
// graph blows the V8 heap. That single OOM breaks system-viz-query (find +
// node-card) AND was crashing lint-wiki-orphans --graph.
//
// THE FIX: a true STREAMING pass. It reuses readGraphStreaming's exact byte-walk
// (escape-aware, depth-tracked) but, for each element of a large array, invokes a
// CALLBACK and discards the element instead of pushing it. The 643MB file Buffer
// is OFF-HEAP (Node Buffers are allocated outside the V8 heap, so they do NOT
// count against --max-old-space-size); the only ON-HEAP state we keep is a small
// edge-endpoint Set (~110K ids) + minimal node records (id/layer/kind/parent) --
// tens of MB, well under the default heap. No materialized arrays => no OOM.
//
// Pure-ish: streamGraphElements takes a Buffer (fully unit-testable, no I/O);
// streamDegreeZeroNodeIds takes a path with an injectable readImpl.
//
// Scope: this computes degree-0 nodes (the disconnected-graph-nodes use-case).
// It is NOT a general graph loader -- it deliberately does not reconstruct the
// full graph (that is the thing that OOMs). The shared graph-io owner (sierra)
// can fold this streaming approach into graph-io / system-viz-query.

import * as fs from "node:fs";

// Mirror graph-io.LARGE_ARRAY_KEYS -- the keys whose arrays are too big to
// materialize. Kept local (not imported) so this helper has no coupling that
// could drag the materializing reader back in.
export const LARGE_ARRAY_KEYS = new Set(["nodes", "edges"]);

const LBRACE = 0x7b, RBRACE = 0x7d, LBRACKET = 0x5b, RBRACKET = 0x5d;
const QUOTE = 0x22, BACKSLASH = 0x5c, COLON = 0x3a, COMMA = 0x2c;
const isWS = (c) => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;

/**
 * Walk a graph-shaped JSON Buffer. For every element of a LARGE_ARRAY_KEYS array
 * (nodes/edges), call onLargeElement(key, parsedElement) and DISCARD it (never
 * accumulated). Small top-level values (meta, schemaVersion, ...) are passed to
 * onSmallValue(key, parsedValue) if provided. Byte-walk ported verbatim from
 * graph-io.readGraphStreaming (escape-aware strings, depth-tracked braces) so the
 * parse semantics are identical -- only the accumulation is removed.
 *
 * Pure w.r.t. I/O (operates on a Buffer). Throws on a malformed top-level shape
 * (same as graph-io) -- fail loud (R12).
 *
 * @param {Buffer} buf
 * @param {{onLargeElement?:(key:string,el:any)=>void, onSmallValue?:(key:string,val:any)=>void}} cbs
 */
export function streamGraphElements(buf, { onLargeElement, onSmallValue } = {}) {
  // Must be a real Buffer: byte-indexing (buf[i]) yields byte codes only on a
  // Buffer. A string also has .length but indexes to CHARS (and mis-walks
  // multi-byte UTF-8), so Buffer.isBuffer is the load-bearing guard.
  if (!Buffer.isBuffer(buf)) {
    throw new Error("streamGraphElements: expected a Buffer");
  }
  let i = 0;
  while (i < buf.length && isWS(buf[i])) i++;
  if (buf[i] !== LBRACE) {
    throw new Error(`streamGraphElements: expected '{' at offset ${i}, got ${buf.length ? String.fromCharCode(buf[i]) : "EOF"}`);
  }
  i++;

  while (i < buf.length) {
    while (i < buf.length && (isWS(buf[i]) || buf[i] === COMMA)) i++;
    if (buf[i] === RBRACE) { i++; break; }
    if (buf[i] !== QUOTE) {
      throw new Error(`streamGraphElements: expected string key at offset ${i}`);
    }
    const keyStart = i;
    i++;
    while (i < buf.length) {
      if (buf[i] === BACKSLASH) { i += 2; continue; }
      if (buf[i] === QUOTE) { i++; break; }
      i++;
    }
    const key = JSON.parse(buf.toString("utf8", keyStart, i));
    while (i < buf.length && buf[i] !== COLON) i++;
    i++;
    while (i < buf.length && isWS(buf[i])) i++;

    if (LARGE_ARRAY_KEYS.has(key) && buf[i] === LBRACKET) {
      i++;
      while (i < buf.length) {
        while (i < buf.length && (isWS(buf[i]) || buf[i] === COMMA)) i++;
        if (buf[i] === RBRACKET) { i++; break; }
        const elemStart = i;
        let depth = 0;
        let inStr = false;
        while (i < buf.length) {
          const c = buf[i];
          if (inStr) {
            if (c === BACKSLASH) { i += 2; continue; }
            if (c === QUOTE) inStr = false;
            i++;
            continue;
          }
          if (c === QUOTE) { inStr = true; i++; continue; }
          if (c === LBRACE || c === LBRACKET) { depth++; i++; continue; }
          if (c === RBRACE || c === RBRACKET) {
            if (depth === 0) break;
            depth--;
            i++;
            continue;
          }
          if (c === COMMA && depth === 0) break;
          i++;
        }
        // Stream the element through the callback, then let it be GC'd. NOT pushed.
        if (onLargeElement) {
          let el;
          try { el = JSON.parse(buf.toString("utf8", elemStart, i)); } catch { el = null; }
          if (el !== null) onLargeElement(key, el);
        }
      }
      continue;
    }

    // Non-large value -- extract its byte range, parse whole (small).
    const valStart = i;
    let depth = 0;
    let inStr = false;
    while (i < buf.length) {
      const c = buf[i];
      if (inStr) {
        if (c === BACKSLASH) { i += 2; continue; }
        if (c === QUOTE) inStr = false;
        i++;
        continue;
      }
      if (c === QUOTE) { inStr = true; i++; continue; }
      if (c === LBRACE || c === LBRACKET) { depth++; i++; continue; }
      if (c === RBRACE) { if (depth === 0) break; depth--; i++; continue; }
      if (c === RBRACKET) { depth--; i++; continue; }
      if (c === COMMA && depth === 0) break;
      i++;
    }
    if (onSmallValue) {
      let val;
      try { val = JSON.parse(buf.toString("utf8", valStart, i)); } catch { val = undefined; }
      if (val !== undefined) onSmallValue(key, val);
    }
  }
}

/**
 * Extract the minimal node fields the degree-0 report needs -- NOT the full node
 * (that is what OOMs when accumulated). Pure.
 */
export function minimalNodeRecord(n) {
  return {
    id: n.id,
    layer: n.layer,
    kind: n.kind || n.subgroup || n.type || "?",
    parent: n.parent,
  };
}

/**
 * Compute degree-0 node records (nodes that appear in NO edge) from a graph
 * Buffer, holding only the edge-endpoint Set + minimal node records on-heap.
 * Pure (operates on a Buffer). Returns
 * { degreeZero:[{id,layer,kind,parent}], totalNodes, totalEdges, withParent }.
 */
export function degreeZeroFromBuffer(buf) {
  const edgeEndpoints = new Set();
  const nodeRecs = [];
  let totalEdges = 0;
  streamGraphElements(buf, {
    onLargeElement(key, el) {
      if (key === "edges") {
        totalEdges++;
        if (el.from != null) edgeEndpoints.add(el.from);
        if (el.to != null) edgeEndpoints.add(el.to);
      } else if (key === "nodes") {
        if (el.id != null) nodeRecs.push(minimalNodeRecord(el));
      }
    },
  });
  const degreeZero = nodeRecs.filter((n) => !edgeEndpoints.has(n.id));
  const withParent = degreeZero.filter((n) => n.parent).length;
  return { degreeZero, totalNodes: nodeRecs.length, totalEdges, withParent };
}

/**
 * File wrapper: read the graph (Buffer -- off-heap) and stream-compute degree-0.
 * readImpl is injectable for tests. Never materializes the node/edge arrays.
 */
export function streamDegreeZeroNodeIds(filePath, { readImpl = fs.readFileSync } = {}) {
  const buf = readImpl(filePath);
  return degreeZeroFromBuffer(buf);
}
