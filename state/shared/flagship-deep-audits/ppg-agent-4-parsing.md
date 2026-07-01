# PPG Deep Audit — Agent 4: Drawing Parsing

## Format Support Matrix

| Format | Parser Engine | Status | End-to-End Support | Notes |
|--------|---------------|--------|-------------------|-------|
| **PDF (2D)** | PDFBlueprintDimensionExtractorEngine | ✅ Implemented | ⚠️ Text-only | Regex-based extraction from searchable PDFs; requires OCR for scans |
| **PDF (Scanned)** | BlueprintVisionOCREngine | ✅ Implemented | ✅ Full | Claude Vision API; extracts geometry, GD&T, dimensions, material specs |
| **DXF** | DXFParserEngine, DXFGeometryParserEngine | ✅ Implemented | ✅ Full | Handles LINE, ARC, CIRCLE, LWPOLYLINE, ELLIPSE, SPLINE; converts to Polygon2D |
| **SVG** | DXFParserEngine | ✅ Integrated | ✅ Full | Path parsing (M/L/C/Z), transforms, winding number polygon classification |
| **STEP/IGES** | ❌ None found | ❌ Missing | ❌ Stub | No dedicated parser; geometry input requires DXF/SVG conversion upstream |
| **STL (3D)** | ❌ None found | ❌ Missing | ❌ Stub | 3D mesh input unsupported; no polygon → STL translator in pipeline |
| **Native CAD (SolidWorks/Inventor/Fusion 360)** | ❌ None found | ❌ Missing | ❌ Stub | Indirect via export to DXF/PDF only; no native CAD SDK integration |
| **Hand-marked/Scanned** | BlueprintVisionOCREngine | ✅ Implemented | ✅ Full | Supports JPEG/PNG/GIF/WebP; Vision model extracts pencil/ink annotations |

## GD&T Extraction

**Engine:** `PDFBlueprintDimensionExtractorEngine` (regex-based) + `BlueprintVisionOCREngine` (Vision-based)

**Symbols Detected (14+ covered):**
- ⌀ (Diameter), ⌖ (Position), ∥ (Parallelism), ⊥ (Perpendicularity)
- ⌒ (Profile Line/Surface), ○ (Circularity), ⌭ (Cylindricity)
- ∠ (Angularity), ↗ (Runout, Total Runout)
- ▬ (Flatness), — (Straightness)
- ◎ (Concentricity), ≡ (Symmetry)

**Datum References:** Extracted as string array (A, B, C, …); material conditions (MMC/LMC/RFS) parsed from Vision output.

**Extraction Method:**
- Text-based PDFs: Regex patterns + unicode symbol matching
- Scanned drawings: Claude Vision identifies feature control frames, tolerance values, datum references with 0.85–0.95 confidence

**Gaps:** No automated frame extraction for complex nested frames; relies on Vision model text-understanding quality.

## OCR Integration

**Provider:** Anthropic Claude Vision API (`@anthropic-ai/sdk`)

**Implementation:**
- **BlueprintVisionOCREngine** uses Claude Sonnet 4 (default: `claude-sonnet-4-20250514`)
- Input: JPEG, PNG, GIF, WebP (base64 or file path)
- Output: Structured JSON with dimensions, GD&T, profiles, title block, surface finishes, notes
- No Tesseract or Google Cloud Vision dependency

**Capabilities:**
- Geometry extraction: approximate profile vertices (0.80–0.95 confidence)
- Material/finish: reads callouts from drawing
- Thickness detection (critical for wire EDM)
- Confidence scoring per extracted element

**Limitations:** API key required; rate-limited; no offline capability.

## Real vs Stub

| Component | Real/Stub | Evidence |
|-----------|-----------|----------|
| **DXF Geometry Parser** | ✅ Real | 1,800 LOC; handles arcs, splines, transforms; unit tests present |
| **PDF Text Extraction** | ✅ Real | Regex engine with 14+ GD&T symbols; dimension/tolerance regex patterns |
| **Vision OCR** | ✅ Real | Full Claude Vision integration; live in blueprint-vision-ocr.test.ts |
| **Feature Recognition** | ⚠️ Partial | FeatureRecognitionEngine (308 LOC) recognizes 22 types; CADFeatureRecognitionEngine marked stub (U-EFF25) |
| **STEP Parser** | ❌ Stub | Documented as missing in audit; no engine file found |
| **3D Mesh Support** | ❌ Stub | No STL translator; geometry limited to 2D (Polygon2D) |
| **Post-extraction GD&T Stackup** | ✅ Real | GDTStackupEngine, ToleranceStackUpEngine exist; worst-case/RSS analysis implemented |

## Score: **68/100**

**Rationale:**
- **+40** for vision-powered OCR (BlueprintVisionOCREngine fully wired)
- **+15** for DXF/SVG geometry parsing with polygon assembly
- **+10** for 14+ GD&T symbol detection in Vision + text modes
- **+8** for dimension/tolerance extraction (text + Vision)
- **-15** for missing STEP/IGES parsers (common CAD exchange format)
- **-10** for no native CAD integration (SolidWorks/Inventor/Fusion)
- **-8** for no 3D mesh (STL) support
- **-5** for no integrated PDF drawing viewer in frontend
- **-2** for CADFeatureRecognitionEngine stub

**Improvement Path:**
1. **Add STEPParserEngine** (~1,200 LOC; reference cadquery/step-reader libs)
2. **Integrate PDF viewer + GD&T overlay** into PPG frontend (currently display-only)
3. **Wire CADFeatureRecognitionEngine** from CAD feature extraction
4. **Add STL mesh support** for 3D parts (tesselation → 2D toolpath)
5. **Test end-to-end** on JM Die historical drawings (PDF/DXF corpus)
