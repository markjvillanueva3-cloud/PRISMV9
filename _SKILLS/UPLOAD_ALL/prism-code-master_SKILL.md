---
name: prism-code-master
description: |
  Unified code and architecture reference. Patterns, algorithms, dependencies.
---

```
Is file on User's C: drive?
├── YES, small (<10K lines) → Filesystem:read_file
│   path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\..."
│
├── YES, large (>10K lines) → Desktop Commander:read_file
│   path: "C:\\...", offset: [start], length: [count]
│
└── In Claude's container (/mnt/, /home/) → view tool
    ⚠️ DON'T save PRISM work here - resets every session!
```

## 1.2 Decision Tree: Writing Files

```
Where should output go?
├── PRISM work (persistent) → Filesystem:write_file
│   path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\..."
│
├── Large file (>50KB) → Chunked approach (see Section 5)
│   Filesystem:write_file (first chunk)
│   Desktop Commander:write_file mode='append' (rest)
│
└── User artifact → create_file + present_files
    path: "/mnt/user-data/outputs/..."
```

## 1.3 Decision Tree: Searching

```
What do you need?
├── List directory → Filesystem:list_directory
├── Search file NAMES → Desktop Commander:start_search searchType:"files"
├── Search file CONTENTS → Desktop Commander:start_search searchType:"content"
└── Deep recursive tree → Filesystem:directory_tree
```

## 1.4 Tool Quick Reference

| Task | Tool | Key Parameters |
|------|------|----------------|
| Read C: file | `Filesystem:read_file` | path, head/tail |
| Write C: file | `Filesystem:write_file` | path, content |
| Read large file | `Desktop Commander:read_file` | path, offset, length |
| Append to file | `Desktop Commander:write_file` | path, content, mode:"append" |
| List directory | `Filesystem:list_directory` | path |
| Search files | `Desktop Commander:start_search` | path, pattern, searchType |
| File info | `Desktop Commander:get_file_info` | path |
| Run script | `Desktop Commander:start_process` | command, timeout_ms |

# 3. ALGORITHM SELECTION

## 3.1 Quick Lookup by Problem Type

### Optimization Problems
| Problem | Algorithm | PRISM Engine |
|---------|-----------|--------------|
| Minimize cost with constraints | Simplex / Interior Point | PRISM_CONSTRAINED_OPTIMIZER |
| Multi-objective (cost + time) | NSGA-II | PRISM_NSGA2 |
| Sequence operations | Ant Colony / Genetic | PRISM_ACO_SEQUENCER |
| Parameter tuning | Bayesian Optimization | PRISM_BAYESIAN_SYSTEM |
| Global search | Simulated Annealing | PRISM_SIMULATED_ANNEALING |

### Prediction Problems
| Problem | Algorithm | PRISM Engine |
|---------|-----------|--------------|
| Predict numeric value | XGBoost / Random Forest | PRISM_XGBOOST_ENGINE |
| Classify categories | SVM / Logistic | PRISM_SVM_ENGINE |
| Time series forecast | LSTM | PRISM_LSTM_ENGINE |
| Uncertainty quantification | Monte Carlo | PRISM_MONTE_CARLO_ENGINE |

### Manufacturing Problems
| Problem | Algorithm | PRISM Engine |
|---------|-----------|--------------|
| Cutting force | Kienzle Model | PRISM_KIENZLE_FORCE |
| Tool life | Taylor Equation | PRISM_TAYLOR_TOOL_LIFE |
| Chatter prediction | Stability Lobes | PRISM_STABILITY_LOBES |
| Material flow stress | Johnson-Cook | PRISM_JOHNSON_COOK_ENGINE |
| Heat distribution | FEM / Fourier | PRISM_HEAT_TRANSFER_ENGINE |

### Geometry/CAD Problems
| Problem | Algorithm | PRISM Engine |
|---------|-----------|--------------|
| Collision detection | GJK / A* | PRISM_COLLISION_ENGINE |
| Toolpath optimization | Dijkstra / A* | PRISM_TOOLPATH_OPTIMIZER |
| Feature recognition | Pattern Matching | PRISM_COMPLETE_FEATURE_ENGINE |

### Signal Processing
| Problem | Algorithm | PRISM Engine |
|---------|-----------|--------------|
| Frequency analysis | FFT | PRISM_FFT_PREDICTIVE_CHATTER |
| Vibration detection | Wavelet Transform | PRISM_WAVELET_CHATTER |
| Noise filtering | Kalman Filter | PRISM_KALMAN_FILTER |

## 3.2 Algorithm Selection Decision Tree

```
Is your problem about...
├── Finding optimal values? → OPTIMIZATION
│   ├── Single objective? → Linear/Nonlinear Programming
│   ├── Multiple objectives? → NSGA-II, MOEA/D
│   └── Discrete choices? → GA, ACO, SA
│
├── Making predictions? → MACHINE LEARNING
│   ├── Continuous output? → Regression (XGBoost, RF)
│   ├── Categorical output? → Classification (SVM)
│   └── Sequential data? → RNN/LSTM
│
├── Manufacturing physics? → PHYSICS ENGINES
│   ├── Cutting forces? → Kienzle/Merchant
│   ├── Tool wear? → Taylor
│   └── Vibration? → Stability Analysis
│
└── Scheduling? → SCHEDULING ENGINES
    ├── Job sequencing? → ACO/GA
    └── Resource allocation? → LP/Assignment
```

## 3.3 Algorithm Complexity Reference

| Algorithm | Time | Space | Best For |
|-----------|------|-------|----------|
| Simplex | O(2^n) worst | O(n²) | LP, fast |
| NSGA-II | O(MN²) | O(N) | 2-3 objectives |
| Genetic Algorithm | O(g×n×f) | O(n) | Global search |
| XGBoost | O(n×d×log n) | O(n) | Tabular data |
| FFT | O(n log n) | O(n) | Frequency |
| Dijkstra | O((V+E) log V) | O(V) | Shortest path |

# 5. LARGE FILE WRITING

## 5.1 Why Chunked Writing?

| Method | Speed | Risk | Best For |
|--------|-------|------|----------|
| Single Filesystem:write_file | ❌ Truncates >50KB | High | Small files |
| Multiple edit_file calls | ❌ Very slow | Medium | Small edits |
| **Chunked write + append** | ⚡ **FASTEST** | Low | **Large files** |

## 5.2 Optimal Workflow

```
FILE SIZE: 50-150KB
═══════════════════
CHUNK 1: Filesystem:write_file (header + first 30%)
CHUNK 2: Desktop Commander:write_file mode='append' (next 35%)
CHUNK 3: Desktop Commander:write_file mode='append' (last 35% + closing)

FILE SIZE: 150KB+
═══════════════════
CHUNK 1: Filesystem:write_file (header + first 3-4 entries)
CHUNKS 2-N: Desktop Commander:write_file mode='append' (3-4 entries each)
FINAL: Desktop Commander:write_file mode='append' (closing)
```

## 5.3 Chunk Size Guidelines

| Entry Complexity | Entries/Chunk | Approx KB |
|------------------|---------------|-----------|
| Simple (20 params) | 8-10 | ~15KB |
| Medium (50 params) | 5-6 | ~18KB |
| Full (127 params) | 3-4 | ~20KB |

**Rule:** Keep chunks under 25KB to avoid truncation.

## 5.4 Template: First Chunk

```javascript
Filesystem:write_file({
  path: "C:\\PRISM REBUILD...\\file.js",
  content: `/**
 * PRISM [TYPE] DATABASE
 * Created: ${new Date().toISOString().split('T')[0]}
 */
const MODULE = {
  metadata: { file: "file.js", count: N },
  entries: {
    "ENTRY-001": { ... },
    "ENTRY-002": { ... },
`
})
```

## 5.5 Template: Append Chunks

```javascript
Desktop Commander:write_file({
  path: "C:\\PRISM REBUILD...\\file.js",
  content: `
    "ENTRY-003": { ... },
    "ENTRY-004": { ... },
`,
  mode: "append"
})
```

## 5.6 Template: Final Chunk

```javascript
Desktop Commander:write_file({
  path: "C:\\PRISM REBUILD...\\file.js",
  content: `
    "ENTRY-010": { ... }
  }
};
module.exports = MODULE;
`,
  mode: "append"
})
```

## 5.7 Verification

```javascript
// Check file size
Desktop Commander:get_file_info({ path: "..." })

// Check last lines (no truncation)
Desktop Commander:read_file({ path: "...", offset: -20 })
// Should see: `};\n\nmodule.exports = ...`
```

# 7. QUICK REFERENCE

## 7.1 Tool Selection Summary

| Task | Tool |
|------|------|
| Read C: file | `Filesystem:read_file` |
| Write C: file | `Filesystem:write_file` |
| Read LARGE file | `Desktop Commander:read_file` (offset/length) |
| Append to file | `Desktop Commander:write_file` (mode:"append") |
| Search content | `Desktop Commander:start_search` (searchType:"content") |
| List directory | `Filesystem:list_directory` |

## 7.2 Pattern Summary

| Pattern | Key Principle |
|---------|---------------|
| Abstraction | Hide implementation behind interface |
| Defensive | Validate early, fail fast |
| Immutability | Return new objects, don't mutate |
| Fallback | Primary → Secondary → Defaults |

## 7.3 Algorithm Summary

| Problem Type | Go-To Algorithm |
|--------------|-----------------|
| Optimization | NSGA-II (multi), Simplex (single) |
| Prediction | XGBoost (tabular), LSTM (sequence) |
| Manufacturing | Kienzle (force), Taylor (tool life) |
| Scheduling | ACO, Genetic Algorithm |

## 7.4 File Writing Summary

```
<50KB  → Single Filesystem:write_file
50KB+  → Chunked: write_file + append + append
```

## MIT FOUNDATION

| Course | Topics |
|--------|--------|
| 6.001 (SICP) | Abstraction, higher-order functions |
| 6.005 | Specifications, testing, defensive programming |
| 6.046J | Algorithm design and analysis |
| 15.083J | Optimization methods |
| 6.867 | Machine learning algorithms |

---

**END OF PRISM CODE MASTER SKILL**
