---
name: prism-context-dna
description: |
  Context window optimization. Priority allocation and compression.
---

**MIT Foundation:** 6.033 (Systems), 6.824 (Distributed), 6.005 (Software Construction)

## CONTEXT DNA STRUCTURE

### The DNA Object (Add to CURRENT_STATE.json)
```json
{
  "contextDNA": {
    "version": "1.0",
    "lastUpdated": "2026-01-23T18:30:00Z",
    
    "essence": {
      "whatWeAreDoing": "Rebuilding PRISM v9.0 from v8.89 monolith",
      "currentFocus": "Materials database enhancement - carbon steels",
      "currentFile": "carbon_steels_031_040.js",
      "position": "Creating P-CS-031 through P-CS-040"
    },
    
    "keyDecisions": [
      "127-param schema locked - no changes without discussion",
      "Chunked write for files >50KB (prevents truncation)",
      "ENHANCE existing materials before adding new ones",
      "Local C: drive is primary, Box for backup",
      "Desktop Commander:write_file with mode:append for large files"
    ],
    
    "patternsProven": {
      "materialCreation": "template → modify per grade → validate → write",
      "largeFiles": "header chunk (write) → body chunks (append) → verify",
      "extraction": "monolith-index → read section → parse → document → save",
      "sessionStart": "read state → check checkpoint → announce → continue"
    },
    
    "patternsFailed": [
      "Single write_file >50KB → truncates at ~50KB",
      "edit_file for large changes → very slow (5x slower than append)",
      "Container /home/claude/ → resets every session, data lost"
    ],
    
    "criticalPaths": {
      "state": "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json",
      "materials": "C:\\PRISM REBUILD...\\EXTRACTED\\materials\\enhanced\\",
      "skills": "C:\\PRISM REBUILD...\\_SKILLS\\",
      "monolith": "C:\\PRISM REBUILD...\\_BUILD\\PRISM_v8_89_002...\\*.html"
    },
    
    "toolPreferences": {
      "readFiles": "Filesystem:read_file",
      "writeFiles": "Filesystem:write_file (small) or Desktop Commander (large/append)",
      "search": "Desktop Commander:start_search with searchType",
      "readSkills": "view(/mnt/skills/user/...)"
    },
    
    "reconstructionHints": [
      "If lost: Read CURRENT_STATE.json first",
      "For materials work: Read prism-material-templates skill",
      "For large files: Read prism-large-file-writer skill",
      "Check SESSION_LOGS/ for detailed history"
    ]
  }
}
```

## DNA OPERATIONS

### 1. Initialize DNA (First Time)
```javascript
// Add to CURRENT_STATE.json if not present
const initialDNA = {
  contextDNA: {
    version: "1.0",
    lastUpdated: new Date().toISOString(),
    essence: {
      whatWeAreDoing: "Rebuilding PRISM v9.0",
      currentFocus: "",
      currentFile: "",
      position: ""
    },
    keyDecisions: [],
    patternsProven: {},
    patternsFailed: [],
    criticalPaths: { /* ... */ },
    toolPreferences: { /* ... */ },
    reconstructionHints: []
  }
};
```

### 2. Update DNA (During Session)
```javascript
// Quick essence update
state.contextDNA.essence.currentFocus = "Carbon steels P-CS-031 to P-CS-040";
state.contextDNA.essence.position = "Completed P-CS-035, working on P-CS-036";
state.contextDNA.lastUpdated = new Date().toISOString();

// Add proven pattern
state.contextDNA.patternsProven.chipFormation = "Use ASM Handbook Vol 1 Table 2-1";

// Add failed approach
state.contextDNA.patternsFailed.push("Using Filesystem:write_file for 80KB caused truncation");
```

### 3. Compress DNA (Before Compaction Warning)
```javascript
// Generate minimal reconstruction string
const dnaCompressed = `
PRISM DNA v1.0 | ${new Date().toISOString()}
DOING: ${state.contextDNA.essence.currentFocus}
AT: ${state.contextDNA.essence.position}
FILE: ${state.contextDNA.essence.currentFile}
PATTERN: ${state.contextDNA.patternsProven.materialCreation}
CRITICAL: Use append mode for large files, never container storage
RECOVER: Read CURRENT_STATE.json → check checkpoint → continue
`;
```

### 4. Reconstruct from DNA (After Compaction/New Chat)
```javascript
// 1. Read state file
const state = JSON.parse(await readFile(STATE_PATH));

// 2. Extract DNA
const dna = state.contextDNA;

// 3. Announce recovery
console.log(`
═══════════════════════════════════════════════════════════════
RECOVERING FROM CONTEXT DNA
═══════════════════════════════════════════════════════════════
Focus: ${dna.essence.currentFocus}
Position: ${dna.essence.position}
Pattern: ${dna.patternsProven.materialCreation || 'Check patternProven'}

Key Decisions to Remember:
${dna.keyDecisions.map(d => '- ' + d).join('\n')}

Ready to continue from: ${dna.essence.position}
═══════════════════════════════════════════════════════════════
`);

// 4. Resume work
```

## DNA TEMPLATES

### For Material Sessions
```json
{
  "essence": {
    "whatWeAreDoing": "Creating materials database with 127 params each",
    "currentFocus": "Carbon steels [range]",
    "currentFile": "carbon_steels_XXX_XXX.js",
    "position": "Material P-CS-XXX"
  },
  "patternsProven": {
    "materialCreation": "prism-material-templates → modify → prism-validator → write"
  }
}
```

### For Extraction Sessions
```json
{
  "essence": {
    "whatWeAreDoing": "Extracting modules from monolith",
    "currentFocus": "[Category] extraction",
    "currentFile": "EXTRACTED/[category]/[module].js",
    "position": "Module [X] of [Y]"
  },
  "patternsProven": {
    "extraction": "prism-monolith-index → read lines → parse → document deps → save"
  }
}
```

### For Architecture Sessions
```json
{
  "essence": {
    "whatWeAreDoing": "Building PRISM v9.0 architecture",
    "currentFocus": "[Component] implementation",
    "currentFile": "[path]",
    "position": "[specific task]"
  },
  "patternsProven": {
    "architecture": "design → prototype → test → integrate"
  }
}
```

## RECOVERY PROTOCOL

### After Compaction
```
1. Read transcript file mentioned in compaction summary (for details)
2. Read CURRENT_STATE.json (for DNA)
3. Extract contextDNA.essence for quick orientation
4. Check contextDNA.position for exact resume point
5. Reference contextDNA.patternsProven for how to proceed
6. Continue work
```

### After New Chat
```
1. Read CURRENT_STATE.json
2. Announce: "Recovering from DNA..."
3. Display essence (what, where, position)
4. Display key decisions to remember
5. Display proven patterns to use
6. Resume from position
```

### Emergency Recovery (No State File)
```
1. List SESSION_LOGS/ directory
2. Read latest session log
3. Reconstruct DNA from log
4. Read EXTRACTED/ to verify progress
5. Resume from last known point
```

## END OF SKILL

**Impact:** 90% context recovery vs ~40% without DNA
**MIT Foundation:** 6.033 state management, 6.824 replication, 6.005 immutability
