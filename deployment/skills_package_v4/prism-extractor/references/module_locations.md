# PRISM Module Locations Reference

## Known Line Numbers in Monolith

Source: `PRISM_v8_89_002_TRUE_100_PERCENT.html` (986,621 lines)

### Machine Databases (CORE)

| Module | Line Number |
|--------|-------------|
| PRISM_POST_MACHINE_DATABASE | 136163 |
| PRISM_LATHE_MACHINE_DB | 278625 |
| PRISM_LATHE_V2_MACHINE_DATABASE_V2 | 120973 |
| PRISM_MACHINE_3D_DATABASE | 319283 |
| PRISM_MACHINE_3D_MODEL_DATABASE_V2 | 54014 |
| PRISM_MACHINE_3D_MODEL_DATABASE_V3 | 54613 |
| PRISM_OKUMA_MACHINE_CAD_DATABASE | 529636 |

### Materials Databases

| Module | Approximate Location |
|--------|---------------------|
| PRISM_MATERIAL_KC_DATABASE | ~50000-60000 |
| PRISM_ENHANCED_MATERIAL_DATABASE | ~60000-70000 |
| PRISM_MATERIALS_MASTER | ~70000-90000 |
| PRISM_JOHNSON_COOK_DATABASE | ~90000-100000 |

### Search Patterns

To find modules not listed:

```bash
# Search for module definition
grep -n "const PRISM_MODULE_NAME" source.html

# Search with context
grep -n -A5 "const PRISM_MODULE_NAME = {" source.html
```

### Module Naming Conventions

- `PRISM_*_DATABASE` - Data storage modules
- `PRISM_*_ENGINE` - Processing/calculation modules
- `PRISM_*_KB` - Knowledge base modules
- `PRISM_*_SYSTEM` - System/infrastructure modules
- `PRISM_*_LOOKUP` - Lookup table modules

### Batch Extraction Order

1. **Stage 1.A (Databases)**: Lines ~50000-300000
2. **Stage 1.B (Engines)**: Lines ~300000-600000
3. **Stage 1.C-J (Other)**: Lines ~600000-986621

### Tips

- Large modules (>5000 lines) often have multiple internal sections
- Look for `// ===` separators marking module boundaries
- Some modules span multiple const declarations
- Watch for modules that reference ENHANCED databases (33 manufacturers)
