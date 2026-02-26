---
name: prism-cutting-tools
description: |
  Comprehensive cutting tool database for PRISM Manufacturing Intelligence.
  Manufacturers, sizes, geometries, coatings, and selection guidelines.
  
  Modules Covered:
  - PRISM_CUTTING_TOOL_DATABASE_V2 (55K chars)
  - PRISM_STEEL_ENDMILL_DB_V2 (33K chars)
  - Tool geometry and coating reference
  
  Gateway Routes: tools.*, tools.select.*
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "cutting", "tools", "comprehensive", "tool", "database", "manufacturing", "intelligence"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-cutting-tools")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-cutting-tools") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What cutting parameters for 316 stainless?"
→ Load skill: skill_content("prism-cutting-tools") → Extract relevant cutting data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot tools issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM CUTTING TOOLS DATABASE
## Manufacturers, Sizes, Geometries, and Selection
# 1. MANUFACTURERS DATABASE

## 1.1 Premium American

| Manufacturer | Specialty | Quality | Price Level |
|--------------|-----------|---------|-------------|
| **Harvey Tool** | Miniature & Specialty | Premium | ★★★★ |
| **Helical Solutions** | High Performance | Premium | ★★★★ |
| **SGS Tool** | Solid Carbide | Premium | ★★★★ |
| **IMCO Carbide** | High Performance | Premium | ★★★★ |
| **Destiny Tool** | High Feed | Premium | ★★★★ |
| **Gorilla Mill** | Roughing | Premium | ★★★★ |
| **Datron** | High Speed | Premium | ★★★★★ |
| **Lakeshore Carbide** | Value Performance | Professional | ★★ |
| **Kodiak** | Value | Professional | ★★ |

## 1.2 Premium European

| Manufacturer | Country | Specialty | Price Level |
|--------------|---------|-----------|-------------|
| **Fraisa** | Switzerland | High Performance | ★★★★★ |
| **Emuge-Franken** | Germany | Threading & Milling | ★★★★ |
| **Gühring** | Germany | Drilling & Milling | ★★★★ |
| **MAPAL** | Germany | Precision Tools | ★★★★★ |
| **Hoffmann/Garant** | Germany | Garant Brand | ★★★★ |
| **Dormer Pramet** | UK/Czech | Rotating Tools | ★★★ |

## 1.3 Premium Japanese

| Manufacturer | Specialty | Price Level |
|--------------|-----------|-------------|
| **OSG** | Threading & Milling | ★★★★ |
| **Nachi** | Drills & End Mills | ★★★★ |
| **Mitsubishi Materials** | Carbide Tools | ★★★★ |
| **Sumitomo** | Carbide & CBN | ★★★★ |
| **Moldino (Hitachi)** | Die/Mold | ★★★★★ |
| **Union Tool** | Micro Tools | ★★★★★ |
| **NS Tool** | High Precision | ★★★★★ |

## 1.4 Indexable Insert Leaders

| Manufacturer | Country | Price Level |
|--------------|---------|-------------|
| **Sandvik Coromant** | Sweden | ★★★★★ |
| **Kennametal** | USA | ★★★★ |
| **ISCAR** | Israel | ★★★★ |
| **Ingersoll** | USA | ★★★★ |
| **Seco Tools** | Sweden | ★★★★ |
| **Walter** | Germany | ★★★★★ |
| **WIDIA** | USA | ★★★ |
| **Kyocera** | Japan | ★★★★ |
| **Tungaloy** | Japan | ★★★★ |

## 1.5 Value/Import

| Manufacturer | Quality | Price Level | Best For |
|--------------|---------|-------------|----------|
| **YG-1** | Professional | ★★ | Cost-effective production |
| **M.A. Ford** | Professional | ★★★ | General purpose |
| **AccuPro** | Economy | ★ | Prototyping |
| **Shars** | Economy | ★ | Hobbyist/learning |
# 2. STANDARD TOOL SIZES

## 2.1 Inch Sizes

### Micro (0.005" - 0.050")
```
0.005, 0.010, 0.015, 0.020, 0.025, 0.030, 0.035, 0.040, 0.045, 0.050
```

### Miniature (1/16" - 1/8")
```
0.062 (1/16"), 0.078 (5/64"), 0.094 (3/32"), 0.109 (7/64"), 0.125 (1/8")
```

### Fractional Standard
| Size | Decimal | Size | Decimal |
|------|---------|------|---------|
| 1/8" | 0.125 | 1/2" | 0.500 |
| 5/32" | 0.156 | 9/16" | 0.562 |
| 3/16" | 0.187 | 5/8" | 0.625 |
| 1/4" | 0.250 | 3/4" | 0.750 |
| 5/16" | 0.312 | 7/8" | 0.875 |
| 3/8" | 0.375 | 1" | 1.000 |

## 2.2 Metric Sizes

### Standard Metric
```
1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 32, 40, 50 mm
```

### Intermediate Metric
```
1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7, 9, 11, 13, 15, 17, 19 mm
```

## 2.3 Shank Sizes

| Standard | Common Sizes |
|----------|--------------|
| Inch | 1/8", 3/16", 1/4", 3/8", 1/2", 5/8", 3/4", 1" |
| Metric | 3, 4, 6, 8, 10, 12, 16, 20, 25 mm |
# 3. END MILL GEOMETRIES

## 3.1 Flute Count Selection

| Flutes | Material | Application |
|--------|----------|-------------|
| **2** | Aluminum, Plastics | Chip clearance critical, slotting |
| **3** | Aluminum, Soft metals | Balance of clearance and finish |
| **4** | Steel, Iron | General purpose, finishing |
| **5** | Steel, Stainless | High feed, better finish |
| **6+** | Hardened, Finishing | Maximum feed, mirror finish |

## 3.2 Helix Angle

| Angle | Characteristics | Best For |
|-------|-----------------|----------|
| **30°** | Standard, good chip evacuation | General purpose |
| **35°** | Higher shear, smoother cut | Steel, finishing |
| **40°** | High shear, excellent finish | Stainless, Ti |
| **45°** | Very high shear | Finishing passes |
| **Variable** | Chatter reduction | Problem setups |

## 3.3 End Types

| Type | Description | Application |
|------|-------------|-------------|
| **Square** | Flat bottom | Shoulders, pockets, floors |
| **Ball** | Hemispherical | 3D contouring, fillets |
| **Bull Nose** | Corner radius | Strength + floor finish |
| **Chamfer** | Angled tip | Chamfers, deburring |
| **Tapered** | Draft angle | Draft walls, molds |
| **Lollipop** | Ball on stem | Undercuts |

## 3.4 Length Designations

| Designation | LOC/D Ratio | Use Case |
|-------------|-------------|----------|
| **Stub** | 0.5-1.0 | Maximum rigidity |
| **Standard** | 1.5-2.5 | General purpose |
| **Long** | 3.0-4.0 | Deep pockets |
| **Extra Long** | 5.0+ | Very deep features |
| **Reach** | Extended neck | Clearance issues |

**Rule of Thumb:** Use shortest possible length. Deflection ∝ L³
# 4. TOOL COATINGS

## 4.1 Coating Comparison

| Coating | Color | Hardness (HV) | Max Temp | Best For |
|---------|-------|---------------|----------|----------|
| **Uncoated** | Silver | 1600 | 500°C | Aluminum, plastics |
| **TiN** | Gold | 2300 | 600°C | General steel |
| **TiCN** | Gray/Blue | 3000 | 400°C | Abrasive materials |
| **TiAlN** | Purple/Black | 3300 | 800°C | High-speed steel |
| **AlTiN** | Black | 3500 | 900°C | Dry machining, hard |
| **AlCrN** | Silver/Gray | 3200 | 1100°C | Stainless, Ti |
| **nACo** | Blue/Black | 4500 | 1200°C | Hardened steel |
| **Diamond** | Gray | 10000 | 600°C | Aluminum, graphite |
| **DLC** | Black | 3500 | 350°C | Non-ferrous, plastic |

## 4.2 Coating Selection by Material

| Workpiece | Recommended Coating | Why |
|-----------|---------------------|-----|
| **Aluminum** | Uncoated or DLC | TiN sticks to Al |
| **Steel (<35 HRC)** | TiN or TiCN | Good wear resistance |
| **Steel (35-50 HRC)** | TiAlN or AlTiN | High heat |
| **Steel (>50 HRC)** | AlTiN or nACo | Extreme hardness |
| **Stainless** | AlCrN or TiAlN | Heat + galling |
| **Titanium** | AlCrN | Low reactivity |
| **Inconel** | AlTiN or AlCrN | High heat |
| **Cast Iron** | TiCN or TiAlN | Abrasion |
| **Graphite** | Diamond | Only option |
# 5. TOOL SELECTION GUIDE

## 5.1 Selection Algorithm

```javascript
function selectEndMill(params) {
  const {
    material,
    operation,      // 'roughing', 'finishing', 'slotting'
    featureSize,    // mm or inches
    depthOfCut,
    rigidity = 'good'
  } = params;
  
  let recommendations = {
    diameter: null,
    flutes: null,
    coating: null,
    helix: null,
    length: null
  };
  
  // Diameter selection
  // For pockets: D ≤ 0.6 × corner radius
  // For slots: D = slot width
  // General: largest that fits
  
  // Flute selection
  if (['aluminum', 'plastic'].includes(material)) {
    recommendations.flutes = operation === 'roughing' ? 2 : 3;
  } else if (['steel', 'iron'].includes(material)) {
    recommendations.flutes = operation === 'roughing' ? 4 : 5;
  } else if (['stainless', 'titanium'].includes(material)) {
    recommendations.flutes = 4;  // Balance clearance and strength
  } else if (material === 'hardened') {
    recommendations.flutes = operation === 'roughing' ? 4 : 6;
  }
  
  // Length selection
  const locRequired = depthOfCut * 1.2;  // 20% safety
  if (locRequired < featureSize * 1.0) {
    recommendations.length = 'stub';
  } else if (locRequired < featureSize * 2.5) {
    recommendations.length = 'standard';
  } else if (locRequired < featureSize * 4.0) {
    recommendations.length = 'long';
  } else {
    recommendations.length = 'extra_long';
  }
  
  return recommendations;
}
```

## 5.2 Quick Reference Tables

### By Material
| Material | Flutes | Helix | Coating | Speed Factor |
|----------|--------|-------|---------|--------------|
| Aluminum 6061 | 2-3 | 35-45° | None/DLC | 1.0 |
| Steel 1045 | 4 | 30-35° | TiAlN | 0.5 |
| Stainless 304 | 4 | 35-40° | AlCrN | 0.3 |
| Ti-6Al-4V | 4 | 35-40° | AlCrN | 0.15 |
| Inconel 718 | 4-5 | 30-35° | AlTiN | 0.08 |
| Hardened D2 | 4-6 | 30° | nACo | 0.2 |

### By Operation
| Operation | Flutes | End Type | Length |
|-----------|--------|----------|--------|
| Roughing | 3-4 | Square/Bull | Standard |
| Finishing walls | 4-5 | Square | Standard |
| Finishing floors | 4+ | Square | Stub |
| 3D contouring | 4 | Ball | As needed |
| Slotting | 2-3 | Square | Standard |

## 5.3 Gateway Routes

| Route | Function | Description |
|-------|----------|-------------|
| `tools.manufacturers` | getManufacturers() | List all manufacturers |
| `tools.sizes.inch` | getSizesInch() | Inch size list |
| `tools.sizes.metric` | getSizesMetric() | Metric size list |
| `tools.coatings` | getCoatings() | Coating database |
| `tools.select` | selectTool() | Recommend tool |
| `tools.geometry` | getGeometry() | Geometry specs |
## ERROR CODES

| Code | Description | Resolution |
|------|-------------|------------|
| TOOL-1001 | Invalid material | Use supported materials |
| TOOL-1002 | Size not standard | Use closest standard size |
| TOOL-1003 | Coating mismatch | Check coating guide |
| TOOL-1004 | Excessive length | Consider reach tools |
**END OF PRISM CUTTING TOOLS DATABASE SKILL**
**Version 1.0 | Level 4 Reference | ~400 Lines**
