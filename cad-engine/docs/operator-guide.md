# CAD Engine Operator Guide

## Natural Language Queries

Ask questions in plain English. The system automatically classifies your query and routes it to the correct domain.

### Supported Domains

| Domain | Example Queries |
|--------|----------------|
| **CAD** | "Draw me a bearing block with 4 mounting holes" |
| **CAM** | "Best roughing strategy for 4140 steel?" |
| **SHOP** | "How do I set up the vise for milling?" |
| **Troubleshoot** | "I'm getting chatter on my finishing pass" |

### Query Types

- **Draw** — "Draw me...", "Create a...", "Design a..."
- **Explain** — "What is a fillet?", "Explain adaptive clearing"
- **Recommend** — "Best strategy for...", "Which tool should I use?"
- **Troubleshoot** — "I'm getting chatter", "Poor surface finish"
- **Setup** — "How do I set up...", "Prepare the machine for..."
- **Compare** — "Climb vs conventional milling?"
- **Calculate** — "What RPM for 6061 with 10mm endmill?"
- **Teach** — "Teach me from this video: https://..."
- **Lookup** — "Show me titanium properties"

### Parameter Extraction

The system automatically extracts parameters from your queries:
- **Material**: "aluminum", "4140 steel", "titanium", etc.
- **RPM**: "5000 RPM", "at 3000 rpm"
- **Tool diameter**: "10mm endmill", "12mm tool"
- **Cutting speed**: "300 m/min", "200 sfm"

---

## Teach-Me Mode

Provide a URL to any machining tutorial, and the system will:

1. **Detect content type** (video, document, webpage)
2. **Extract knowledge** (cutting parameters, procedures, tips, material info)
3. **Validate against physics** (reject unsafe values, verify parameter ranges)
4. **Store validated knowledge** for future queries
5. **Generate a learning report** with key takeaways

### Usage

```
"Teach me from this video: https://youtube.com/watch?v=example"
```

### What Gets Extracted

- **Cutting parameters**: speeds, feeds, RPM, depths of cut
- **Procedures**: step-by-step machining processes
- **Tips and notes**: practical advice from experienced machinists
- **Material knowledge**: machinability info, recommendations

### Validation Rules

Extracted knowledge is validated against physics models:
- Cutting speed must be within material-safe range
- RPM must not exceed 60,000
- Feed per tooth must not exceed 1.0 mm/tooth
- Unsafe practices (remove guard, bypass interlock) are rejected

---

## Platform-Specific Guidance

The system generates step-by-step instructions with menu paths for your specific CAD/CAM platform.

### Supported CAD Platforms
- SolidWorks
- Fusion 360
- CATIA
- NX (Siemens)
- Creo (PTC)

### Supported CAM Platforms
- Mastercam
- hyperMILL
- PowerMill
- Fusion 360 CAM
- ESPRIT

### Example Output

For "How to extrude in SolidWorks":
1. Select sketch plane — `Insert > Sketch (select plane)`
2. Create the profile sketch with required dimensions
3. Exit sketch and apply extrude — `Insert > Boss/Base > Extrude`
4. Verify feature in the feature tree

---

## Safety System

All outputs pass through safety validation before being shown to the operator.

### S(x) >= 0.70 Hard Block

Every recommendation, strategy, and practice is scored from 0.0 to 1.0. If the safety score drops below 0.70, the output is **blocked** and the operator is informed of the specific safety concern.

### What Gets Checked

- **CAD features**: tool availability, depth limits, tolerance capability, material difficulty, aspect ratios
- **CAM strategies**: surface speed, feed rate, RPM, cutting force (Kienzle model), power, depth-of-cut ratio
- **Shop practices**: unsafe keywords, coolant requirements, RPM limits, contradictory steps

### Safety Warnings

The system adds warnings for:
- Titanium/inconel machining without coolant (fire risk)
- RPM exceeding material-safe limits
- Deep pockets requiring special tooling
- Tight tolerances requiring precision processes
