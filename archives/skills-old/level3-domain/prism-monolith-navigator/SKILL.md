---
name: prism-monolith-navigator
description: |
  Navigate the 986,621-line PRISM v8.89.002 monolith. Contains structure overview and search patterns. For actual line numbers, use prism-extraction-index (500+ pre-indexed).
---

# PRISM Monolith Navigator

> ⚡ **FOR LINE NUMBERS:** Use `prism-extraction-index` (500+ modules pre-indexed)

## Monolith Location

```
Path: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html
Size: 48.6 MB | Lines: 986,621 | Modules: 831
```

## Monolith Structure Overview

```
Lines 1-10,000:         HTML wrapper, CSS, initial setup
Lines 10,000-50,000:    Core infrastructure (Gateway, Constants, Units)
Lines 50,000-150,000:   Machine databases (CORE layer)
Lines 150,000-350,000:  More machine databases, post processors
Lines 350,000-500,000:  Tool databases, workholding
Lines 500,000-600,000:  Manufacturer-specific (Okuma, etc.)
Lines 600,000-700,000:  Materials databases
Lines 700,000-850,000:  Engines (Physics, AI/ML, Optimization)
Lines 850,000-950,000:  Knowledge bases, Learning modules
Lines 950,000-986,621:  Final integration, enhanced Gateway
```

## Finding Modules

### Method 1: Use Pre-Built Index (PREFERRED)
```
1. Read prism-extraction-index
2. Look up module name → get line number instantly
3. Read module using offset
```

### Method 2: Search (Only if not in index)
```javascript
Desktop Commander:start_search({
  path: "C:\\PRISM REBUILD...\\PRISM_v8_89_002_TRUE_100_PERCENT",
  pattern: "const PRISM_MODULE_NAME",
  searchType: "content",
  contextLines: 2
})
```

### Method 3: By Region (When browsing)
Use the structure overview above to narrow down where to look.

## Search Patterns That Work

| Find | Pattern |
|------|---------|
| Module start | `const PRISM_[NAME]` |
| All databases | `const PRISM_.*_DATABASE` |
| All engines | `const PRISM_.*_ENGINE` |
| Knowledge bases | `const PRISM_.*_KB` |
| Module end | Next `const PRISM_` or `// END` marker |

## Reading Modules

```javascript
// Once you have line number from index or search:
Desktop Commander:read_file({
  path: "C:\\...\\PRISM_v8_89_002_TRUE_100_PERCENT.html",
  offset: LINE_NUMBER,
  length: 2000  // Adjust for module size
})
```

## Module Size Estimates

| Type | Typical Lines | Read Length |
|------|---------------|-------------|
| Small utility | 100-500 | 600 |
| Database (small) | 500-2,000 | 2,500 |
| Database (large) | 2,000-10,000 | 12,000 |
| Engine | 200-5,000 | 6,000 |
| Knowledge Base | 5,000-50,000 | sections |

## Important Notes

1. **Multiple versions exist** - Some modules (like GATEWAY) appear multiple times. Usually want highest line number (latest).

2. **Update the index** - When you find new modules, add them to prism-extraction-index.

3. **Use index first** - Searching takes 30+ seconds, index lookup is instant.

## Integration

| Skill | Relationship |
|-------|--------------|
| prism-extraction-index | Pre-built line numbers (USE THIS FIRST) |
| prism-extractor | Extraction workflow |
| prism-tool-selector | Which tools to use |
