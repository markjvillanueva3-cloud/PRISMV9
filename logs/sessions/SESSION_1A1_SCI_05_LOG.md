# SESSION 1.A.1-SCI-05: Aluminum Alloys Scientific Data
**Date:** 2026-01-22/23
**Status:** ✅ COMPLETE

---

## Objectives
- Create comprehensive aluminum alloys scientific database with validated Kienzle and Johnson-Cook parameters
- Cover all major wrought series (1xxx, 2xxx, 3xxx, 5xxx, 6xxx, 7xxx)
- Include common cast alloys (A356, A357, 319, 380, 383, 390, 413, 518, 713)
- Add silicon content machining guide for cast alloys

---

## Completed

### Recovery Work
Previous session was interrupted mid-write, creating:
- PRISM_ALUMINUM_ALLOYS_SCIENTIFIC.js (incomplete, no closing braces)
- PRISM_ALUMINUM_ALLOYS_SCIENTIFIC_PART2.js (fragment with cast alloys)

Recovery actions:
1. ✅ Analyzed existing file content (40KB, 38+ alloys partially defined)
2. ✅ Appended remaining cast alloys (518, 713, A357, 319)
3. ✅ Added series characteristics documentation
4. ✅ Added silicon content machining guide (critical for cast alloy tooling)
5. ✅ Added utility functions (getMaterial, getKienzle, searchBySeries, etc.)
6. ✅ Added proper closing braces and export statements
7. ✅ Deleted PART2 fragment file

### Final File Contents
**PRISM_ALUMINUM_ALLOYS_SCIENTIFIC.js** (52,568 bytes)

**Wrought Alloys (22):**
- 1xxx Series (2): 1050, 1100
- 2xxx Series (4): 2011, 2014, 2024, 2219
- 3xxx Series (1): 3003
- 5xxx Series (2): 5052, 5083
- 6xxx Series (5): 6061, 6063, 6082, 6262, 6351
- 7xxx Series (8): 7050, 7075, 7175, 7475, 7055, 7150, 7010, 7039

**Cast Alloys (7):**
- Al-Si: A356, A357, 319, 380, 383, 390, 413
- Al-Mg: 518
- Al-Zn: 713

### Special Features Included

**Series Characteristics:**
- All 7 wrought series documented
- Heat treatability, corrosion resistance, weldability
- Machining notes for each series

**Silicon Machining Guide:**
| Range | Tool Material | Examples |
|-------|---------------|----------|
| 0-7% Si | Carbide (coated/uncoated) | A356, A357, 319, 518 |
| 7-11% Si | Carbide (coated recommended) | 380, 383 |
| 11-13% Si | Carbide or PCD | 413 |
| >13% Si | PCD or CBN MANDATORY | 390 |

**Utility Functions:**
- `getMaterial(id)`, `getKienzle()`, `getJohnsonCook()`
- `searchBySeries()`, `getCastAlloys()`
- `getByMachinabilityRating()`, `searchByApplication()`
- `getSiliconToolingRecommendation()`, `getSeriesInfo()`
- `getAerospaceAlloys()` - helper for 2xxx/7xxx aerospace grades

---

## Files Created/Modified
| File | Action | Size |
|------|--------|------|
| PRISM_ALUMINUM_ALLOYS_SCIENTIFIC.js | Completed | 52,568 bytes |
| PRISM_ALUMINUM_ALLOYS_SCIENTIFIC_PART2.js | Deleted | - |
| CURRENT_STATE.json | Updated | - |

---

## Key Technical Decisions

1. **J-C Parameters Source**: Primary source is Lesuer (2000) for 2024-T3 and 7075-T6. Others interpolated or marked as low reliability.

2. **Kienzle Values**: König & Klocke (1997) for wrought alloys, Machining Data Handbook for cast alloys. Silicon content significantly affects kc1_1.

3. **Silicon Content Classification**: Used standard 7%/11%/13% thresholds for tooling recommendations based on primary Si crystal formation.

4. **Cast Alloy Coverage**: Focused on most common automotive/aerospace casting alloys. Hypereutectic 390 included due to its importance in engine applications.

5. **Temper Coverage**: Most alloys have multiple tempers (O, T4, T6, etc.) with corresponding property changes documented.

---

## Issues/Notes
- J-C parameters for many aluminum alloys have significant uncertainty - reliability ratings included
- Cast alloys with >12% Si require dramatically different machining approach (noted clearly)
- Some aerospace alloys (7xxx) have SCC susceptibility - noted in series characteristics
- 2011 contains lead - environmental compliance note added

---

## Next Session
**ID:** 1.A.1-SCI-06
**Focus:** Titanium Alloys scientific data
**Materials:** 
- CP Titanium (Grades 1-4)
- Ti-6Al-4V (multiple conditions)
- Ti-5Al-2.5Sn
- Ti-6Al-2Sn-4Zr-2Mo
- Beta alloys (Ti-15-3, Ti-10-2-3)
**Estimated:** ~20 materials, ~2,500 lines

---

## Session Statistics
- Duration: ~15 minutes (recovery session)
- File size: 52,568 bytes
- Materials completed: 29 (22 wrought + 7 cast)
- Files modified: 1 (completed)
- Files deleted: 1 (fragment)
- State updates: 1
- Scientific Materials Progress: 5/10 micro-sessions complete (107 materials total)
