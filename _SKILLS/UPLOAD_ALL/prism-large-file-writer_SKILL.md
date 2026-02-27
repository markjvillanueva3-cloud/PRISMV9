---
name: prism-large-file-writer
description: |
  Chunked write patterns for large files. Prevents truncation.
---

> ⚡ **KEY DISCOVERY:** `Desktop Commander:write_file` with `mode='append'` is dramatically faster than alternatives for large files.

## 🔴 WHY THIS SKILL EXISTS

| Method | Speed | Risk | Best For |
|--------|-------|------|----------|
| Single `Filesystem:write_file` | ❌ Slow, truncates >50KB | High | Small files only |
| Multiple `edit_file` calls | ❌ Very slow (huge diffs) | Medium | Small edits |
| **Chunked write + append** | ⚡⚡ **FASTEST** | Low | **Large files** |

**The Problem:** Large single writes can truncate mid-stream, corrupting files.  
**The Solution:** Write in chunks using append mode.

## 🚀 OPTIMAL WORKFLOW

### For Files 50-150KB (e.g., 10 materials @ 127 params each)

```
CHUNK 1: Filesystem:write_file (header + first 3-4 entries)
CHUNK 2: Desktop Commander:write_file mode='append' (next 3 entries)
CHUNK 3: Desktop Commander:write_file mode='append' (remaining entries + closing)
```

### For Files 150KB+ (e.g., 20+ materials)

```
CHUNK 1: Filesystem:write_file (header + first 3 entries)
CHUNKS 2-N: Desktop Commander:write_file mode='append' (3-4 entries each)
FINAL: Desktop Commander:write_file mode='append' (last entries + closing brace)
```

## 📋 CODE TEMPLATES

### Chunk 1: Create File with Header
```javascript
Filesystem:write_file({
  path: "C:\\PRISM REBUILD...\\EXTRACTED\\[category]\\filename.js",
  content: `/**
 * PRISM [TYPE] DATABASE - [Description]
 * File: filename.js
 * Entries: X through Y
 * Parameters per entry: 127
 * Created: ${new Date().toISOString().split('T')[0]}
 */

const MODULE_NAME = {
  metadata: {
    file: "filename.js",
    category: "[CATEGORY]",
    entryCount: N,
    schemaVersion: "3.0.0",
    created: "${new Date().toISOString().split('T')[0]}"
  },

  entries: {
    // First 3-4 entries here...
    "ENTRY-001": { ... },
    "ENTRY-002": { ... },
    "ENTRY-003": { ... },
`
})
```

### Chunk 2+: Append More Entries
```javascript
Desktop Commander:write_file({
  path: "C:\\PRISM REBUILD...\\EXTRACTED\\[category]\\filename.js",
  content: `
    // ═══════════════════════════════════════════════════════════════
    // ENTRY-004: [Name]
    // ═══════════════════════════════════════════════════════════════
    "ENTRY-004": { ... },

    "ENTRY-005": { ... },

    "ENTRY-006": { ... },
`,
  mode: "append"
})
```

### Final Chunk: Close the Object
```javascript
Desktop Commander:write_file({
  path: "C:\\PRISM REBUILD...\\EXTRACTED\\[category]\\filename.js",
  content: `
    "ENTRY-010": { ... }
  }
};

// Export
if (typeof module !== 'undefined') module.exports = MODULE_NAME;
if (typeof window !== 'undefined') window.MODULE_NAME = MODULE_NAME;
`,
  mode: "append"
})
```

## 🎯 COMPACT FORMATTING (40% Smaller)

For entries with many parameters, use single-line JSON style for subsections:

### Instead of this (verbose):
```javascript
physical: {
  density: 7850,
  melting_point: {
    solidus: 1450,
    liquidus: 1500
  },
  specific_heat: 486,
  thermal_conductivity: 48.0,
  thermal_expansion: 12.1e-6,
  electrical_resistivity: 0.18e-6
},
```

### Use this (compact):
```javascript
physical: {
  density: 7850, melting_point: { solidus: 1450, liquidus: 1500 },
  specific_heat: 486, thermal_conductivity: 48.0,
  thermal_expansion: 12.1e-6, electrical_resistivity: 0.18e-6
},
```

**Benefits:**
- ~40% fewer lines
- Faster append operations
- Still human-readable
- All 127 parameters preserved

## 📊 CHUNK SIZE GUIDELINES

| Entry Complexity | Entries per Chunk | Approx. KB |
|------------------|-------------------|------------|
| Simple (20 params) | 8-10 | ~15KB |
| Medium (50 params) | 5-6 | ~18KB |
| Full (127 params) | 3-4 | ~20KB |

**Rule:** Keep chunks under 25KB to avoid truncation risk.

## 🔄 MATERIALS DATABASE EXAMPLE

Creating `carbon_steels_031_040.js` (10 materials, 127 params each):

```
SESSION WORKFLOW:
1. Filesystem:write_file → Header + P-CS-031 to P-CS-034 (4 materials)
2. Desktop Commander:write_file mode='append' → P-CS-035 to P-CS-037 (3 materials)
3. Desktop Commander:write_file mode='append' → P-CS-038 to P-CS-040 + closing (3 materials)

RESULT: ~60KB file created in 3 fast operations
```

## ⚠️ COMMON MISTAKES

### ❌ DON'T: Single large write
```javascript
// FAILS: Will truncate around 50KB
Filesystem:write_file({ path: "...", content: HUGE_60KB_STRING })
```

### ❌ DON'T: Multiple edit_file calls
```javascript
// SLOW: Each edit recalculates entire diff
edit_file({ file_path: "...", old_string: "}", new_string: "...\n}" })
edit_file({ file_path: "...", old_string: "}", new_string: "...\n}" })
// Takes 10x longer than append
```

### ✅ DO: Chunked write + append
```javascript
// FAST: Direct append, no diff calculation
Filesystem:write_file({ ... })  // Initial
Desktop Commander:write_file({ ..., mode: "append" })  // Fast appends
Desktop Commander:write_file({ ..., mode: "append" })  // Fast appends
```

## 🔍 VERIFICATION AFTER WRITING

```javascript
// Check file completeness
Desktop Commander:get_file_info({
  path: "C:\\...\\filename.js"
})
// Should show expected size (e.g., ~60KB for 10 materials)

// Verify no truncation - check last lines
Desktop Commander:read_file({
  path: "C:\\...\\filename.js",
  offset: -20  // Last 20 lines
})
// Should see proper closing: `};\n\nmodule.exports = ...`
```

## 📁 WHEN TO USE THIS SKILL

| Task | Use This Skill? |
|------|-----------------|
| Creating material files (127 params each) | ✅ YES |
| Creating machine database files | ✅ YES |
| Creating tool catalog files | ✅ YES |
| Writing session logs (<5KB) | ❌ No, use single write |
| Updating CURRENT_STATE.json | ❌ No, use single write |
| Extracting from monolith | ❌ No, use prism-extractor |

## 🎯 QUICK REFERENCE

```
1. File >50KB? → USE THIS SKILL
2. Multiple similar entries? → USE THIS SKILL
3. Previous write truncated? → USE THIS SKILL

FORMULA:
  Chunk 1 = Filesystem:write_file (header + 30%)
  Chunk 2 = Desktop Commander mode='append' (next 35%)
  Chunk 3 = Desktop Commander mode='append' (last 35% + closing)
```
