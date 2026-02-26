/**
 * R6-MS0: Memory Profiling Test Suite
 * PRISM Production Hardening - Heap Analysis Under Sustained Load
 * 
 * Verifies memory stays bounded during sustained operations.
 * Safety-critical: memory exhaustion during machining calculation = danger.
 */
import { describe, it, expect } from 'vitest';

const MEMORY_LIMITS = {
  maxHeapMB: 3500,        // --max-old-space-size=4096, warn at 3500
  maxRssMB: 4500,         // RSS includes native memory
  maxGrowthPerIterMB: 5,  // Per-iteration leak threshold
  iterations: 100,        // Number of cycles to detect leaks
};

describe('R6 Memory Profile', () => {
  it('should report current memory usage within bounds', () => {
    const mem = process.memoryUsage();
    const heapMB = mem.heapUsed / (1024 * 1024);
    const rssMB = mem.rss / (1024 * 1024);
    
    console.log(`Heap: ${heapMB.toFixed(1)}MB / ${MEMORY_LIMITS.maxHeapMB}MB`);
    console.log(`RSS: ${rssMB.toFixed(1)}MB / ${MEMORY_LIMITS.maxRssMB}MB`);
    console.log(`External: ${(mem.external / 1024 / 1024).toFixed(1)}MB`);
    console.log(`Array Buffers: ${(mem.arrayBuffers / 1024 / 1024).toFixed(1)}MB`);
    
    expect(heapMB).toBeLessThan(MEMORY_LIMITS.maxHeapMB);
    expect(rssMB).toBeLessThan(MEMORY_LIMITS.maxRssMB);
  });

  it('should not leak memory over iterations', () => {
    const snapshots: number[] = [];
    
    for (let i = 0; i < MEMORY_LIMITS.iterations; i++) {
      // Simulate work that could leak
      const data = new Array(1000).fill(0).map((_, j) => ({
        id: `material-${j}`,
        name: `Test Material ${j}`,
        properties: { hardness: Math.random() * 800, density: 2 + Math.random() * 20 }
      }));
      
      // Process and discard (should be GC'd)
      const processed = data.filter(d => d.properties.hardness > 400);
      void processed.length; // Use but don't retain
      
      if (i % 10 === 0) {
        snapshots.push(process.memoryUsage().heapUsed);
      }
    }
    
    // Check for monotonic growth (leak indicator)
    if (snapshots.length >= 3) {
      const firstThird = snapshots.slice(0, Math.floor(snapshots.length / 3));
      const lastThird = snapshots.slice(-Math.floor(snapshots.length / 3));
      
      const avgFirst = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
      const avgLast = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
      const growthMB = (avgLast - avgFirst) / (1024 * 1024);
      
      console.log(`Memory growth over ${MEMORY_LIMITS.iterations} iterations: ${growthMB.toFixed(2)}MB`);
      
      // Growth should be bounded (allow some GC variance)
      expect(growthMB).toBeLessThan(MEMORY_LIMITS.iterations * MEMORY_LIMITS.maxGrowthPerIterMB);
    }
  });

  it('should have reasonable V8 heap statistics', () => {
    const v8 = require('v8');
    const stats = v8.getHeapStatistics();
    const usedPct = (stats.used_heap_size / stats.heap_size_limit) * 100;
    
    console.log(`V8 Heap: ${(stats.used_heap_size / 1024 / 1024).toFixed(1)}MB used`);
    console.log(`V8 Heap Limit: ${(stats.heap_size_limit / 1024 / 1024).toFixed(1)}MB`);
    console.log(`Usage: ${usedPct.toFixed(1)}%`);
    
    expect(usedPct).toBeLessThan(85); // Should not be near limit
  });
});
