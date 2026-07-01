# PRISM DEVELOPMENT PROMPT - BOX ENABLED v1.0
## For Claude Desktop App with Direct Filesystem Access
## Created: 2026-01-20

---

## 🔧 ENVIRONMENT CONFIGURATION

**Platform:** Claude Desktop App (Windows)
**Filesystem Access:** `C:\Users\wompu\Box\PRISM REBUILD`
**Persistence:** ✅ Files persist across sessions via Box sync

---

## 📁 BOX FOLDER STRUCTURE

```
C:\Users\wompu\Box\PRISM\
├── _BUILD/              ← Production builds (ZIP files)
├── _DOCS/               ← Development documents & prompts
├── _SESSION_ARCHIVES/   ← Completed session archives
├── EXTRACTED/           ← ACTIVE DEVELOPMENT AREA
│   ├── machines/
│   │   ├── BASIC/       ← Basic machine specs
│   │   └── ENHANCED/    ← Full kinematic specs (collision avoidance)
│   ├── materials/       ← Material databases
│   ├── tools/           ← Tool databases
│   ├── engines/         ← Physics, AI, optimization engines
│   ├── knowledge_bases/ ← Knowledge systems
│   ├── systems/         ← Core systems & infrastructure
│   ├── business/        ← Business/ERP modules
│   └── learning/        ← AI learning modules
├── MIT COURSES/         ← Reference materials (READ ONLY)
├── RESOURCES/           ← CAD files, catalogs (IGNORE)
└── SESSION_LOGS/        ← Session documentation
```

---

## 🚀 SESSION START PROTOCOL

1. **Read audit:** `Filesystem:read_file` on `_DOCS/PRISM_MASTER_AUDIT.md`
2. **Check last session:** `Filesystem:list_directory` on `SESSION_LOGS/`
3. **Verify structure:** `Filesystem:list_directory` on key folders
4. **Continue work:** Pick up where previous session left off

---

## 💾 FILE OPERATIONS

### Writing Files
```
Filesystem:write_file
- path: C:\Users\wompu\Box\PRISM\EXTRACTED\[category]\[filename].js
- content: [full file content]
```

### Reading Files
```
Filesystem:read_text_file
- path: C:\Users\wompu\Box\PRISM\[path]\[filename]
```

### Creating Directories
```
Filesystem:create_directory
- path: C:\Users\wompu\Box\PRISM\[new\path]
```

---

## 📋 NAMING CONVENTIONS

### Machine Databases
- BASIC: `PRISM_[MANUFACTURER]_MACHINE_DATABASE.js`
- ENHANCED: `PRISM_[MANUFACTURER]_MACHINE_DATABASE_ENHANCED_v2.js`

### Other Modules
- `PRISM_[MODULE_NAME]_[TYPE].js`
- `PRISM_[MODULE_NAME]_[TYPE]_v[VERSION].js`

### Session Logs
- `SESSION_[STAGE]_[SUBSTAGE]_[NUMBER]_LOG.md`

---

## 🎯 CURRENT PRIORITIES

### Phase 1: Machine Database ENHANCED Expansion
- [x] MHI (10 machines)
- [x] Cincinnati (8 machines)
- [x] Giddings & Lewis (8 machines)
- [x] Fidia (7 machines)
- [x] Soraluce (7 machines)
- [ ] Roku-Roku
- [ ] AWEA
- [ ] Emco
- [ ] Takumi
- [ ] +13 more manufacturers

### Phase 2: Materials Database
- [ ] Extract from main build
- [ ] Organize by material type
- [ ] Add enhanced properties

### Phase 3: Engines Extraction
- [ ] Physics engines
- [ ] AI/ML engines
- [ ] Optimization engines

---

## ⚙️ ENHANCED DATABASE SCHEMA v2.0

Every ENHANCED machine database must include:

```javascript
{
  manufacturer: {
    id, name, fullName, country, city, founded,
    specialty: [], marketSegments: []
  },
  
  machines: {
    "[machine_id]": {
      id, model, series, type, subType, axes,
      
      control: {
        manufacturer, model, features: []
      },
      
      spindle: {
        type, maxRpm, peakPower, continuousPower,
        peakTorque, continuousTorque, taper,
        geometry: { noseToGageLine, housingDiameter, housingLength }
      },
      
      travels: {
        x: { min, max }, y: { min, max }, z: { min, max }
      },
      
      rotaryAxes: {  // For 4/5-axis
        a/b/c: {
          type, range: { min, max }, drive,
          maxSpeed, clampTorque, pivotPoint: { x, y, z }
        }
      },
      
      rapids: { x, y, z, a?, b?, c? },
      acceleration: { x, y, z },
      
      kinematicChain: {
        type, structure, sequence: []
      },
      
      collisionZones: {
        spindleHead: { type, components/dimensions },
        // Additional zones as needed
      },
      
      tcpcRtcp: { supported, modes: [] },
      
      atc: { capacity, maxToolWeight, changeTime }
    }
  }
}
```

---

## 📝 SESSION END PROTOCOL

1. **Update audit:** Modify `_DOCS/PRISM_MASTER_AUDIT.md` with progress
2. **Write session log:** Create `SESSION_LOGS/SESSION_[X]_LOG.md`
3. **List created files:** Show what was added this session
4. **State next steps:** What should next session do

---

## 🔄 CROSS-SESSION CONTINUITY

Since files persist in Box:
- ✅ Can read previous session's output
- ✅ Can continue partial work
- ✅ Can verify previous implementations
- ✅ Can update existing files
- ✅ Progress accumulates across sessions

---

## ⚠️ IMPORTANT NOTES

1. **Always use full Windows paths:** `C:\Users\wompu\Box\PRISM\...`
2. **Box sync:** Files auto-sync to cloud after writing
3. **RESOURCES folder:** Ignore (user preference)
4. **MIT COURSES:** Reference only, don't modify
5. **Permissions:** Should be pre-authorized for all operations

---

*This prompt should be loaded at the start of each PRISM development session*
