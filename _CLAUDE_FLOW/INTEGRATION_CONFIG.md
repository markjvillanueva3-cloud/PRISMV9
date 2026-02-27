# PRISM Claude Flow Integration Configuration
# Version 1.0 - Memory, Workers, and Agent Configuration

## 1. Memory MCP Server Setup

### Installation (if not already installed)
```bash
npm install -g @anthropic/memory-mcp-server
```

### Claude Desktop Config Addition
Add to `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@anthropic/memory-mcp-server"],
      "env": {
        "MEMORY_FILE_PATH": "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\.claude-memory\\prism_memory.json"
      }
    }
  }
}
```

### Memory Categories for PRISM
```json
{
  "categories": {
    "session_state": "Current extraction/migration progress",
    "architecture_decisions": "Architectural choices and rationale",
    "blockers": "Current blockers and workarounds",
    "extracted_modules": "Which modules have been extracted",
    "consumer_wiring": "Database->Consumer mappings verified",
    "knowledge_insights": "Insights from MIT courses applied",
    "performance_metrics": "Extraction/migration timing data"
  }
}
```

---

## 2. Background Worker Configuration

### Worker Types for PRISM

#### Extractor Worker
- **Purpose**: Extract modules from monolith in background
- **Trigger**: New extraction session started
- **Output**: Extracted module files to EXTRACTED\ directory

#### Auditor Worker  
- **Purpose**: Verify extraction completeness
- **Trigger**: After each extraction batch
- **Output**: Audit report, gap analysis

#### Consumer Mapper Worker
- **Purpose**: Generate consumer wiring for databases
- **Trigger**: Database extraction complete
- **Output**: Consumer mapping JSON, wiring code

#### Knowledge Indexer Worker
- **Purpose**: Index MIT courses and build algorithm registry
- **Trigger**: On-demand or when new courses added
- **Output**: Updated MIT_COURSE_INDEX.json, ALGORITHM_REGISTRY.json

### Claude Flow Worker Config
Create file: `.claude-flow/workers.json`
```json
{
  "workers": {
    "extractor": {
      "script": "scripts/extract_worker.js",
      "schedule": "on-demand",
      "timeout": 300000,
      "retries": 3
    },
    "auditor": {
      "script": "scripts/audit_worker.js", 
      "schedule": "after:extractor",
      "timeout": 60000,
      "retries": 2
    },
    "consumer-mapper": {
      "script": "scripts/consumer_mapper_worker.js",
      "schedule": "after:auditor",
      "timeout": 120000,
      "retries": 2
    },
    "knowledge-indexer": {
      "script": "scripts/knowledge_indexer.js",
      "schedule": "daily",
      "timeout": 600000,
      "retries": 1
    }
  }
}
```

---

## 3. Agent Configuration for Swarm Orchestration

### Agent Roles
```json
{
  "agents": {
    "lead-architect": {
      "role": "Coordination and decision-making",
      "skills": ["prism-development", "prism-state-manager"],
      "priority": 1
    },
    "extractor-agent": {
      "role": "Module extraction from monolith",
      "skills": ["prism-extractor", "prism-python-tools"],
      "priority": 2,
      "parallelism": 3
    },
    "auditor-agent": {
      "role": "Verify extraction completeness",
      "skills": ["prism-auditor"],
      "priority": 3
    },
    "consumer-agent": {
      "role": "Map and wire consumers",
      "skills": ["prism-consumer-mapper", "prism-utilization"],
      "priority": 4
    },
    "knowledge-agent": {
      "role": "Apply MIT course knowledge",
      "skills": ["prism-knowledge-base"],
      "priority": 5
    }
  }
}
```

### Swarm Deployment Commands
```bash
# Initialize swarm for extraction
claude-flow swarm create prism-extraction --agents 5

# Deploy agents by role
claude-flow swarm deploy extractor-agent --count 3
claude-flow swarm deploy auditor-agent --count 1
claude-flow swarm deploy consumer-agent --count 1

# Monitor progress
claude-flow swarm status prism-extraction

# Merge results
claude-flow swarm merge --to CURRENT_STATE.json
```

---

## 4. Auto-Consolidation Setup

### Consolidation Rules
When context compacts or session ends:
1. Update CURRENT_STATE.json with all progress
2. Write session log to SESSION_LOGS/
3. Commit extracted files to EXTRACTED/
4. Update Memory MCP with key decisions
5. Trigger background auditor if extractions occurred

### Consolidation Script
Create: `scripts/auto_consolidate.js`
```javascript
const fs = require('fs');
const path = require('path');

const PRISM_ROOT = 'C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\';

async function consolidate() {
  // 1. Read current state
  const statePath = path.join(PRISM_ROOT, 'CURRENT_STATE.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  
  // 2. Update timestamps
  state.lastUpdated = new Date().toISOString();
  
  // 3. Scan EXTRACTED for new files
  const extractedDir = path.join(PRISM_ROOT, 'EXTRACTED');
  // ... scan logic
  
  // 4. Write updated state
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  
  // 5. Write session log
  const logPath = path.join(PRISM_ROOT, 'SESSION_LOGS', 
    `SESSION_${state.currentSession.id}_LOG.md`);
  // ... generate log
  
  console.log('Consolidation complete');
}

consolidate();
```

---

## 5. Integration Checklist

### Immediate Setup
- [x] MIT_COURSE_INDEX.json created
- [x] ALGORITHM_REGISTRY.json created  
- [ ] Memory MCP server installed
- [ ] Background workers configured
- [ ] Auto-consolidation hooks active

### Verification
```bash
# Test memory MCP
claude-flow memory list

# Test worker execution
claude-flow worker run knowledge-indexer --dry-run

# Test swarm deployment
claude-flow swarm test prism-extraction
```

---

## 6. Usage During Development

### Starting a Session
```
1. Claude reads CURRENT_STATE.json
2. Memory MCP provides context from last session
3. Claude announces session start
4. Background knowledge-indexer runs if needed
```

### During Session
```
1. Claude extracts modules
2. Background auditor verifies
3. Memory MCP captures decisions
4. State file updated every 3-5 operations
```

### Ending a Session
```
1. Claude updates CURRENT_STATE.json
2. Auto-consolidation runs
3. Memory MCP persists key insights
4. Background workers queue next tasks
```
