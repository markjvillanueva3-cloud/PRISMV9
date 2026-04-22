---
name: autofire-forge-perf
enabled: true
event: prompt
pattern: (too\s+slow|performance\s+(issue|problem|optimization)|speed\s+up|optimize\s+(for\s+)?(speed|performance)|slow\s+(response|load|build|query)|latency\s+(issue|problem|high)|bottleneck|profile\s+(the|this)|takes?\s+too\s+long)
action: warn
---

Use `/forge-perf` for performance profiling and optimization. Invoke with `skill: "forge-perf"`. This profiles execution, identifies bottlenecks, applies targeted optimizations, and benchmarks before/after results.
