# FILES TO ADD TO CLAUDE PROJECT FOLDER

Copy these 4 files from:
`C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_PROJECT_FILES\`

## Files:
1. **00_CONDENSED_PROTOCOL.md** - Quick reference, tools, paths, 50 skills summary
2. **01_CORE_RULES.md** - Full skill inventory, 10 Commandments, protocols
3. **07_REFERENCE_PATHS.md** - All paths including 50 skill directories
4. **SKILL_v3.md** (optional) - Detailed master skill file

## Remove/Replace:
- SKILL.md (old v1)
- SKILL_v2.md (outdated - references 18 skills)
- Any files referencing "10 skills" or "18 skills"

---

# INSTRUCTIONS TO PASTE INTO CLAUDE

Copy everything below this line and paste into Claude's custom instructions:

═══════════════════════════════════════════════════════════════════════════════

**Purpose & context**

Mark is leading the comprehensive rebuild of PRISM Manufacturing Intelligence from version 8.89.002 to 9.0.0, transforming a massive 986,621-line monolithic codebase containing 831 modules into a modern, modular architecture. The project encompasses extracting and enhancing databases for materials (1,047+ materials with 127 parameters each), machines (824+ machines across 43 manufacturers), cutting tools, workholding systems, and manufacturing intelligence algorithms sourced from 220+ MIT/Stanford courses. Success is measured by achieving 100% database utilization (minimum 6-8 consumers per database), complete parameter coverage for all materials and machines, and seamless integration of academic algorithms with manufacturing data. The work involves systematic extraction, validation, and enhancement of existing databases while preventing any data loss or duplication across iterations.

**Current state**

Mark is actively working through a structured extraction process using numbered micro-sessions (1.A.1 through 1.A.11+), with Sessions 1.A.1-1.A.4 completed covering materials, machines, tools, and cutting parameters. The current focus is on enhancing existing materials databases with complete 127-parameter coverage before adding new materials, following the principle of depth-first enhancement rather than breadth-first expansion. Recent work includes creating comprehensive carbon steel databases (CS-001 through CS-030) with full scientific parameters including Kienzle cutting force coefficients, Johnson-Cook constitutive models, and Taylor tool life equations. The project maintains rigorous state tracking through CURRENT_STATE.json files and detailed session logs to ensure continuity across development sessions.

**On the horizon**

The immediate priority is completing the materials database enhancement with full 127-parameter coverage for all existing materials before expanding to the target 1,047 materials across 30 categories. Upcoming sessions will focus on aluminum alloys, titanium alloys, and other material families requiring comprehensive scientific data integration. The project roadmap includes implementing Level 5 machine database enhancements (CAD-mapped specifications) for manufacturers with available STEP files, and exploring Claude-Flow multi-agent orchestration to potentially reduce the estimated 75-130 session timeline to 20-35 sessions through parallel processing.

**Key learnings & principles**

The "10 Commandments" development philosophy governs all work, requiring 100% database utilization, comprehensive validation, and graceful error handling. A critical principle is enhancing existing data with complete parameter coverage before adding new entries - depth-first rather than breadth-first expansion. The project has established that materials databases require exactly 127 parameters including composition, physical properties, mechanical properties, cutting force models, constitutive models, tool life data, chip formation characteristics, tribology data, thermal properties, surface integrity parameters, machinability indices, recommended parameters, and statistical metadata. Auto-compact is disabled for PRISM sessions to maintain full context, and comprehensive database audits must precede any changes to prevent data loss or regression.

**Approach & patterns**

Development follows a systematic micro-session approach with 15-25 items per session to avoid context limitations, using state-driven workflows with persistent JSON tracking rather than chat-based memory. Each session begins with reading CURRENT_STATE.json, verifying filesystem access, and checking recent session logs before proceeding. The workflow emphasizes local-first development on the C: drive with periodic uploads to Box for cloud backup, optimizing for performance while maintaining data persistence. File operations use structured naming conventions and comprehensive validation to ensure data integrity across the massive codebase extraction and enhancement process.

**Tools & resources**

The project utilizes MCP filesystem tools for direct C: drive access, Desktop Commander for advanced file operations, and **50 specialized PRISM skills** for development optimization. Key resources include 220+ indexed MIT/Stanford courses mapped to 175+ algorithms, comprehensive CAD file collections for machine manufacturers, and validated scientific literature sources including the Machining Data Handbook and ASM Metals Handbooks. The development environment supports both container-based and local filesystem operations, with established protocols for handling large files, batch operations, and systematic module extraction from the monolithic source code.

**Other instructions**

- Auto-compact is disabled for PRISM development sessions. User wants comprehensive database audits before any changes.
- Read the full prompt: double check data/databases/modules/engines/algorithms/code first before doing anything
- As a reminder: make sure all the data/databases/modules/engines/algorithms/code are being carried over into every new iteration of this app.
- Double check we're not doing or have done tasks multiple times.
- Use Python scripts when necessary. Ensure that every new iteration of the app seamlessly incorporates EVERYTHING from previous versions to facilitate continuous development
- Create both large file web app and the more efficient version as we continue working on this app.
- Don't present FILES unless requested. Utilize all existing databases/modules/engines/algorithms/learning engines/data/code
- Don't compact chats
- PRISM materials work: ENHANCE existing materials with full 127-parameter coverage FIRST, then expand database with new materials. Do not add new materials until existing ones are fully parameterized.
- Stage 3+: Add TypeScript types incrementally. Post-v9.0: WebAssembly only if performance bottlenecks emerge.
- PRISM has 50 skills in /mnt/skills/user/: 9 core dev, 3 monolith nav, 5 materials, 4 session mgmt, 6 quality, 6 code/arch, 4 context, 2 knowledge, 10 AI experts. Read relevant skill BEFORE task.

═══════════════════════════════════════════════════════════════════════════════

# END OF INSTRUCTIONS
