/**
 * PRISM Manufacturing Intelligence - Collision Detection MCP Tools
 * 8 tools for comprehensive collision detection in CNC machining
 * 
 * SAFETY CRITICAL: Missing a collision = machine crash, injury, death
 * 
 * @version 1.0.0
 * @module collisionTools
 */

import {
  collisionEngine,
  Vector3,
  Quaternion,
  ToolAssembly,
  ToolHolder,
  MachineEnvelope,
  Fixture,
  Workpiece,
  Toolpath,
  ToolpathMove,
  CollisionReport,
  NearMissResult,
  CollisionGeometry,
  AABB,
  Capsule
} from '../engines/CollisionEngine.js';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Collision detection tool definitions for MCP server
 */
export const collisionTools = [
  // ==========================================================================
  // TOOL 1: check_toolpath_collision
  // ==========================================================================
  {
    name: 'check_toolpath_collision',
    description: `Check entire toolpath for collisions with machine, fixtures, and workpiece.
    
SAFETY CRITICAL: Missing a collision can result in:
- Machine crash and damage
- Tool breakage with flying debris  
- Operator injury or death

Returns comprehensive collision report with:
- All detected collisions
- Near-miss warnings
- Minimum clearance found
- Specific collision locations`,
    inputSchema: {
      type: 'object',
      properties: {
        toolpath: {
          type: 'object',
          description: 'Toolpath to check',
          properties: {
            toolpathId: { type: 'string', description: 'Toolpath identifier' },
            tool: {
              type: 'object',
              properties: {
                toolId: { type: 'string' },
                toolType: { type: 'string' },
                diameter: { type: 'number', description: 'Tool diameter (mm)' },
                fluteLength: { type: 'number', description: 'Cutting length (mm)' },
                overallLength: { type: 'number', description: 'Total length (mm)' },
                shankDiameter: { type: 'number', description: 'Shank diameter (mm)' },
                stickout: { type: 'number', description: 'Stickout from holder (mm)' }
              },
              required: ['toolId', 'diameter', 'fluteLength', 'overallLength']
            },
            moves: {
              type: 'array',
              description: 'Array of toolpath moves',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['RAPID', 'LINEAR', 'ARC_CW', 'ARC_CCW'] },
                  start: {
                    type: 'object',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                      z: { type: 'number' }
                    }
                  },
                  end: {
                    type: 'object',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                      z: { type: 'number' }
                    }
                  },
                  feedRate: { type: 'number' },
                  lineNumber: { type: 'number' }
                },
                required: ['type', 'start', 'end']
              }
            },
            workOffset: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                z: { type: 'number' }
              }
            }
          },
          required: ['toolpathId', 'tool', 'moves']
        },
        machine: {
          type: 'object',
          description: 'Machine envelope specification',
          properties: {
            machineId: { type: 'string' },
            xLimits: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' }
              }
            },
            yLimits: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' }
              }
            },
            zLimits: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' }
              }
            }
          },
          required: ['machineId', 'xLimits', 'yLimits', 'zLimits']
        },
        fixtures: {
          type: 'array',
          description: 'Array of fixtures/workholding',
          items: {
            type: 'object',
            properties: {
              fixtureId: { type: 'string' },
              type: { type: 'string' },
              position: {
                type: 'object',
                properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } }
              },
              boundingBox: {
                type: 'object',
                description: 'AABB bounding box',
                properties: {
                  min: {
                    type: 'object',
                    properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } }
                  },
                  max: {
                    type: 'object',
                    properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } }
                  }
                }
              }
            },
            required: ['fixtureId', 'boundingBox']
          }
        },
        workpiece: {
          type: 'object',
          description: 'Optional workpiece geometry',
          properties: {
            workpieceId: { type: 'string' },
            boundingBox: {
              type: 'object',
              properties: {
                min: {
                  type: 'object',
                  properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } }
                },
                max: {
                  type: 'object',
                  properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } }
                }
              }
            }
          }
        }
      },
      required: ['toolpath', 'machine', 'fixtures']
    }
  },

  // ==========================================================================
  // TOOL 2: validate_rapid_moves
  // ==========================================================================
  {
    name: 'validate_rapid_moves',
    description: `Validate all rapid (G0) moves in toolpath for safety.
    
Rapid moves are MOST DANGEROUS because:
- Machine moves at maximum speed
- No cutting engagement to limit force
- Collision impact is maximum

Checks:
- Machine envelope limits
- Fixture interference
- Clear height violations`,
    inputSchema: {
      type: 'object',
      properties: {
        toolpath: {
          type: 'object',
          description: 'Toolpath with moves to validate',
          properties: {
            tool: {
              type: 'object',
              properties: {
                diameter: { type: 'number' }
              }
            },
            moves: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  start: { type: 'object' },
                  end: { type: 'object' },
                  lineNumber: { type: 'number' }
                }
              }
            }
          }
        },
        machine: {
          type: 'object',
          description: 'Machine envelope'
        },
        fixtures: {
          type: 'array',
          description: 'Fixture geometries'
        },
        safeZ: {
          type: 'number',
          description: 'Safe Z height for rapids (mm)'
        }
      },
      required: ['toolpath', 'machine', 'fixtures']
    }
  },

  // ==========================================================================
  // TOOL 3: check_fixture_clearance
  // ==========================================================================
  {
    name: 'check_fixture_clearance',
    description: `Check tool clearance against all fixtures at a specific position.
    
Use before:
- Starting a new operation
- After tool change
- At operation boundaries`,
    inputSchema: {
      type: 'object',
      properties: {
        position: {
          type: 'object',
          description: 'Tool tip position to check',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y', 'z']
        },
        tool: {
          type: 'object',
          description: 'Tool assembly',
          properties: {
            diameter: { type: 'number' },
            fluteLength: { type: 'number' },
            overallLength: { type: 'number' },
            shankDiameter: { type: 'number' }
          },
          required: ['diameter', 'fluteLength', 'overallLength']
        },
        fixtures: {
          type: 'array',
          description: 'Fixtures to check against'
        },
        toolAxis: {
          type: 'object',
          description: 'Tool axis direction (default: Z-down)',
          properties: {
            x: { type: 'number', default: 0 },
            y: { type: 'number', default: 0 },
            z: { type: 'number', default: -1 }
          }
        },
        minClearance: {
          type: 'number',
          description: 'Minimum required clearance (mm)',
          default: 2.0
        }
      },
      required: ['position', 'tool', 'fixtures']
    }
  },

  // ==========================================================================
  // TOOL 4: calculate_safe_approach
  // ==========================================================================
  {
    name: 'calculate_safe_approach',
    description: `Calculate safe approach vector to target position.
    
Determines collision-free approach direction for:
- First plunge into pocket
- Re-entry after retract
- Tool change approach`,
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'object',
          description: 'Target position',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y', 'z']
        },
        toolRadius: {
          type: 'number',
          description: 'Tool radius (mm)'
        },
        obstacles: {
          type: 'array',
          description: 'Obstacle geometries to avoid'
        },
        clearance: {
          type: 'number',
          description: 'Required clearance (mm)',
          default: 2.0
        },
        preferredDirection: {
          type: 'string',
          description: 'Preferred approach: Z_PLUS, Z_MINUS, X_PLUS, X_MINUS, Y_PLUS, Y_MINUS',
          enum: ['Z_PLUS', 'Z_MINUS', 'X_PLUS', 'X_MINUS', 'Y_PLUS', 'Y_MINUS'],
          default: 'Z_PLUS'
        }
      },
      required: ['target', 'toolRadius', 'obstacles']
    }
  },

  // ==========================================================================
  // TOOL 5: detect_near_miss
  // ==========================================================================
  {
    name: 'detect_near_miss',
    description: `Detect near-miss situations along toolpath.
    
Near-misses indicate:
- Programming close to limits
- Potential collision with small errors
- Areas needing extra caution

Severity levels:
- HIGH: < 1mm clearance
- MEDIUM: 1-3mm clearance  
- LOW: 3-5mm clearance`,
    inputSchema: {
      type: 'object',
      properties: {
        toolpath: {
          type: 'object',
          description: 'Toolpath to analyze'
        },
        obstacles: {
          type: 'array',
          description: 'Obstacles to check (fixtures, workpiece)'
        },
        threshold: {
          type: 'number',
          description: 'Near-miss threshold distance (mm)',
          default: 5.0
        },
        reportAll: {
          type: 'boolean',
          description: 'Report all near-misses or just worst',
          default: false
        }
      },
      required: ['toolpath', 'obstacles']
    }
  },

  // ==========================================================================
  // TOOL 6: generate_collision_report
  // ==========================================================================
  {
    name: 'generate_collision_report',
    description: `Generate comprehensive collision report for toolpath.
    
Includes:
- All collision detections
- All near-miss warnings
- Minimum clearance analysis
- Risk assessment
- Recommended safe zones`,
    inputSchema: {
      type: 'object',
      properties: {
        toolpath: {
          type: 'object',
          description: 'Toolpath to analyze'
        },
        machine: {
          type: 'object',
          description: 'Machine envelope'
        },
        fixtures: {
          type: 'array',
          description: 'Fixtures'
        },
        workpiece: {
          type: 'object',
          description: 'Workpiece geometry'
        },
        includeNearMisses: {
          type: 'boolean',
          description: 'Include near-miss analysis',
          default: true
        },
        nearMissThreshold: {
          type: 'number',
          description: 'Near-miss threshold (mm)',
          default: 5.0
        }
      },
      required: ['toolpath', 'machine', 'fixtures']
    }
  },

  // ==========================================================================
  // TOOL 7: validate_tool_clearance
  // ==========================================================================
  {
    name: 'validate_tool_clearance',
    description: `Validate complete tool assembly clearance including holder.
    
Checks entire assembly:
- Cutting tool
- Tool shank
- Tool holder
- Collet/adapter

Critical for:
- Deep pocket machining
- 5-axis positioning
- Long tool assemblies`,
    inputSchema: {
      type: 'object',
      properties: {
        tool: {
          type: 'object',
          description: 'Complete tool assembly',
          properties: {
            toolId: { type: 'string' },
            diameter: { type: 'number' },
            fluteLength: { type: 'number' },
            overallLength: { type: 'number' },
            shankDiameter: { type: 'number' },
            stickout: { type: 'number' },
            holder: {
              type: 'object',
              properties: {
                holderId: { type: 'string' },
                holderType: { type: 'string' },
                maxDiameter: { type: 'number' },
                length: { type: 'number' }
              }
            }
          },
          required: ['diameter', 'fluteLength', 'overallLength']
        },
        position: {
          type: 'object',
          description: 'Tool tip position',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y', 'z']
        },
        toolAxis: {
          type: 'object',
          description: 'Tool axis direction',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          default: { x: 0, y: 0, z: -1 }
        },
        obstacles: {
          type: 'array',
          description: 'Obstacle geometries'
        }
      },
      required: ['tool', 'position', 'obstacles']
    }
  },

  // ==========================================================================
  // TOOL 8: check_5axis_head_clearance
  // ==========================================================================
  {
    name: 'check_5axis_head_clearance',
    description: `Check 5-axis spindle head clearance at tilted orientation.
    
CRITICAL for 5-axis machining:
- Head can collide when tilted
- Clearance changes with orientation
- Must check at extreme angles

Validates:
- Spindle head vs fixtures
- Spindle head vs workpiece
- Spindle head vs table`,
    inputSchema: {
      type: 'object',
      properties: {
        position: {
          type: 'object',
          description: 'Tool tip position',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y', 'z']
        },
        toolAxis: {
          type: 'object',
          description: 'Tool axis direction (unit vector)',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y', 'z']
        },
        machine: {
          type: 'object',
          description: 'Machine with spindle head geometry',
          properties: {
            machineId: { type: 'string' },
            spindleHead: {
              type: 'array',
              description: 'Spindle head collision geometry'
            }
          }
        },
        fixtures: {
          type: 'array',
          description: 'Fixtures to check against'
        },
        workpiece: {
          type: 'object',
          description: 'Workpiece geometry'
        },
        aAngle: {
          type: 'number',
          description: 'A-axis angle (degrees)'
        },
        bAngle: {
          type: 'number',
          description: 'B-axis angle (degrees)'
        },
        cAngle: {
          type: 'number',
          description: 'C-axis angle (degrees)'
        }
      },
      required: ['position', 'toolAxis', 'machine']
    }
  }
];

// ============================================================================
// TOOL HANDLER
// ============================================================================

/**
 * Convert raw position object to Vector3
 */
function toVector3(pos: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(pos.x, pos.y, pos.z);
}

/**
 * Convert raw AABB to typed AABB
 */
function toAABB(box: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }): AABB {
  return {
    type: 'AABB',
    min: toVector3(box.min),
    max: toVector3(box.max)
  };
}

/**
 * Convert raw toolpath to typed Toolpath
 */
function toToolpath(raw: any): Toolpath {
  return {
    toolpathId: raw.toolpathId || 'unknown',
    tool: {
      toolId: raw.tool.toolId || 'T1',
      toolType: raw.tool.toolType || 'endmill',
      diameter: raw.tool.diameter,
      fluteLength: raw.tool.fluteLength,
      overallLength: raw.tool.overallLength,
      shankDiameter: raw.tool.shankDiameter || raw.tool.diameter * 0.8,
      stickout: raw.tool.stickout || raw.tool.overallLength
    },
    moves: raw.moves.map((m: any) => ({
      type: m.type as any,
      start: toVector3(m.start),
      end: toVector3(m.end),
      feedRate: m.feedRate,
      arcCenter: m.arcCenter ? toVector3(m.arcCenter) : undefined,
      arcRadius: m.arcRadius,
      lineNumber: m.lineNumber
    })),
    workOffset: raw.workOffset ? toVector3(raw.workOffset) : new Vector3(0, 0, 0)
  };
}

/**
 * Convert raw machine to typed MachineEnvelope
 */
function toMachineEnvelope(raw: any): MachineEnvelope {
  return {
    machineId: raw.machineId || 'unknown',
    xLimits: raw.xLimits,
    yLimits: raw.yLimits,
    zLimits: raw.zLimits,
    aLimits: raw.aLimits,
    bLimits: raw.bLimits,
    cLimits: raw.cLimits,
    spindleHead: raw.spindleHead?.map((g: any) => toCollisionGeometry(g)),
    fixedObstacles: raw.fixedObstacles?.map((g: any) => toCollisionGeometry(g))
  };
}

/**
 * Convert raw fixture to typed Fixture
 */
function toFixture(raw: any): Fixture {
  return {
    fixtureId: raw.fixtureId || 'fixture',
    type: raw.type || 'generic',
    position: raw.position ? toVector3(raw.position) : new Vector3(0, 0, 0),
    orientation: new Quaternion(),
    geometry: raw.boundingBox ? [toAABB(raw.boundingBox)] : [],
    clearanceZone: raw.clearanceZone ? toAABB(raw.clearanceZone) : undefined
  };
}

/**
 * Convert raw workpiece to typed Workpiece
 */
function toWorkpiece(raw: any): Workpiece | undefined {
  if (!raw) return undefined;
  return {
    workpieceId: raw.workpieceId || 'workpiece',
    stockGeometry: raw.boundingBox ? toAABB(raw.boundingBox) : {
      type: 'AABB',
      min: new Vector3(0, 0, 0),
      max: new Vector3(100, 100, 50)
    },
    workOffset: raw.workOffset ? toVector3(raw.workOffset) : new Vector3(0, 0, 0),
    orientation: new Quaternion()
  };
}

/**
 * Convert raw geometry to CollisionGeometry
 */
function toCollisionGeometry(raw: any): CollisionGeometry {
  if (raw.type === 'AABB' || (raw.min && raw.max)) {
    return toAABB(raw);
  }
  if (raw.type === 'sphere') {
    return {
      type: 'sphere',
      center: toVector3(raw.center),
      radius: raw.radius
    };
  }
  if (raw.type === 'capsule') {
    return {
      type: 'capsule',
      start: toVector3(raw.start),
      end: toVector3(raw.end),
      radius: raw.radius
    };
  }
  // Default to AABB
  return {
    type: 'AABB',
    min: new Vector3(-50, -50, -50),
    max: new Vector3(50, 50, 50)
  };
}

/**
 * Handle collision tool calls
 */
export async function handleCollisionTool(
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  switch (toolName) {
    // ========================================================================
    // check_toolpath_collision
    // ========================================================================
    case 'check_toolpath_collision': {
      const toolpath = toToolpath(args.toolpath);
      const machine = toMachineEnvelope(args.machine);
      const fixtures = (args.fixtures || []).map(toFixture);
      const workpiece = toWorkpiece(args.workpiece);

      const report = collisionEngine.generateCollisionReport(
        toolpath,
        machine,
        fixtures,
        workpiece
      );

      return {
        safe: report.safe,
        collisionCount: report.collisionCount,
        nearMissCount: report.nearMissCount,
        minClearance: report.minClearance,
        minClearancePosition: report.minClearancePosition?.toArray(),
        collisions: report.collisions.map(c => ({
          description: c.description,
          distance: c.distance,
          penetrationDepth: c.penetrationDepth,
          position: c.pointA?.toArray()
        })),
        nearMisses: report.nearMisses.map(nm => ({
          distance: nm.distance,
          severity: nm.severity,
          position: nm.position.toArray(),
          objectA: nm.objectA,
          objectB: nm.objectB
        })),
        timestamp: report.timestamp,
        recommendation: report.safe 
          ? 'Toolpath is collision-free'
          : `DANGER: ${report.collisionCount} collision(s) detected. DO NOT RUN THIS PROGRAM.`
      };
    }

    // ========================================================================
    // validate_rapid_moves
    // ========================================================================
    case 'validate_rapid_moves': {
      const toolpath = toToolpath(args.toolpath);
      const machine = toMachineEnvelope(args.machine);
      const fixtures = (args.fixtures || []).map(toFixture);
      const safeZ = args.safeZ;

      const result = collisionEngine.validateRapidMoves(toolpath, machine, fixtures);

      // Additional safe-Z check
      const safeZIssues: string[] = [];
      if (safeZ !== undefined) {
        for (let i = 0; i < toolpath.moves.length; i++) {
          const move = toolpath.moves[i];
          if (move.type === 'RAPID') {
            if (move.start.z < safeZ && move.end.z < safeZ) {
              // Rapid below safe Z
              const minZ = Math.min(move.start.z, move.end.z);
              if (minZ < safeZ) {
                safeZIssues.push(
                  `Rapid at line ${move.lineNumber || i} travels at Z=${minZ.toFixed(2)} below safe height ${safeZ}`
                );
              }
            }
          }
        }
      }

      return {
        safe: result.safe && safeZIssues.length === 0,
        issues: [...result.issues, ...safeZIssues],
        rapidCount: toolpath.moves.filter(m => m.type === 'RAPID').length,
        recommendation: result.safe && safeZIssues.length === 0
          ? 'All rapid moves are safe'
          : 'DANGER: Fix rapid move issues before running program'
      };
    }

    // ========================================================================
    // check_fixture_clearance
    // ========================================================================
    case 'check_fixture_clearance': {
      const position = toVector3(args.position);
      const toolAxis = args.toolAxis 
        ? toVector3(args.toolAxis).normalize()
        : new Vector3(0, 0, -1);
      const minClearance = args.minClearance || 2.0;
      const fixtures = (args.fixtures || []).map(toFixture);
      
      const tool: ToolAssembly = {
        toolId: 'check',
        toolType: 'endmill',
        diameter: args.tool.diameter,
        fluteLength: args.tool.fluteLength,
        overallLength: args.tool.overallLength,
        shankDiameter: args.tool.shankDiameter || args.tool.diameter * 0.8,
        stickout: args.tool.overallLength
      };

      // Collect all fixture geometries
      const obstacles: CollisionGeometry[] = [];
      for (const fixture of fixtures) {
        obstacles.push(...fixture.geometry);
      }

      const result = collisionEngine.validateToolClearance(
        tool,
        position,
        toolAxis,
        obstacles
      );

      return {
        clear: result.clear && result.minClearance >= minClearance,
        minClearance: result.minClearance,
        requiredClearance: minClearance,
        clearanceMargin: result.minClearance - minClearance,
        issues: result.issues,
        recommendation: result.clear && result.minClearance >= minClearance
          ? `Tool has ${result.minClearance.toFixed(2)}mm clearance (required: ${minClearance}mm)`
          : result.issues.length > 0
            ? `COLLISION DETECTED: ${result.issues.join('; ')}`
            : `INSUFFICIENT CLEARANCE: ${result.minClearance.toFixed(2)}mm < ${minClearance}mm required`
      };
    }

    // ========================================================================
    // calculate_safe_approach
    // ========================================================================
    case 'calculate_safe_approach': {
      const target = toVector3(args.target);
      const toolRadius = args.toolRadius;
      const clearance = args.clearance || 2.0;
      const obstacles = (args.obstacles || []).map(toCollisionGeometry);

      const result = collisionEngine.calculateSafeApproach(
        target,
        toolRadius,
        obstacles,
        clearance
      );

      const directionNames: Record<string, string> = {
        '0,0,1': 'Z+ (from above)',
        '0,0,-1': 'Z- (from below)',
        '1,0,0': 'X+ (from right)',
        '-1,0,0': 'X- (from left)',
        '0,1,0': 'Y+ (from back)',
        '0,-1,0': 'Y- (from front)'
      };

      const approachKey = `${result.approach.x},${result.approach.y},${result.approach.z}`;

      return {
        safe: result.safe,
        approachDirection: result.approach.toArray(),
        approachDescription: directionNames[approachKey] || 'Custom direction',
        safeStartPosition: result.safeStartPosition.toArray(),
        targetPosition: target.toArray(),
        recommendation: result.safe
          ? `Approach from ${directionNames[approachKey] || 'calculated direction'}`
          : 'WARNING: No completely safe approach found. Manual verification required.'
      };
    }

    // ========================================================================
    // detect_near_miss
    // ========================================================================
    case 'detect_near_miss': {
      const toolpath = toToolpath(args.toolpath);
      const threshold = args.threshold || 5.0;
      const reportAll = args.reportAll || false;

      // Convert obstacles to fixtures/workpieces
      const obstacles: (Fixture | Workpiece)[] = (args.obstacles || []).map((o: any) => {
        if (o.workpieceId) {
          return toWorkpiece(o)!;
        }
        return toFixture(o);
      });

      const nearMisses = collisionEngine.detectNearMisses(toolpath, obstacles, threshold);

      // Sort by distance
      nearMisses.sort((a, b) => a.distance - b.distance);

      const results = reportAll ? nearMisses : nearMisses.slice(0, 10);

      return {
        nearMissCount: nearMisses.length,
        threshold,
        worstClearance: nearMisses.length > 0 ? nearMisses[0].distance : Infinity,
        nearMisses: results.map(nm => ({
          distance: nm.distance,
          severity: nm.severity,
          position: nm.position.toArray(),
          objectA: nm.objectA,
          objectB: nm.objectB,
          recommendedClearance: nm.recommendedClearance
        })),
        severityCounts: {
          HIGH: nearMisses.filter(nm => nm.severity === 'HIGH').length,
          MEDIUM: nearMisses.filter(nm => nm.severity === 'MEDIUM').length,
          LOW: nearMisses.filter(nm => nm.severity === 'LOW').length
        },
        recommendation: nearMisses.length === 0
          ? `No near-misses within ${threshold}mm threshold`
          : nearMisses.filter(nm => nm.severity === 'HIGH').length > 0
            ? 'CAUTION: HIGH severity near-misses detected. Review toolpath carefully.'
            : 'Near-misses detected. Consider increasing clearance for safety margin.'
      };
    }

    // ========================================================================
    // generate_collision_report
    // ========================================================================
    case 'generate_collision_report': {
      const toolpath = toToolpath(args.toolpath);
      const machine = toMachineEnvelope(args.machine);
      const fixtures = (args.fixtures || []).map(toFixture);
      const workpiece = toWorkpiece(args.workpiece);
      const includeNearMisses = args.includeNearMisses !== false;
      const nearMissThreshold = args.nearMissThreshold || 5.0;

      const report = collisionEngine.generateCollisionReport(
        toolpath,
        machine,
        fixtures,
        workpiece
      );

      return {
        summary: {
          status: report.safe ? 'SAFE' : 'COLLISION_DETECTED',
          toolpathId: report.toolpathId,
          machineId: report.machineId,
          timestamp: report.timestamp,
          collisionCount: report.collisionCount,
          nearMissCount: includeNearMisses ? report.nearMissCount : 0,
          minClearance: report.minClearance
        },
        collisions: report.collisions.map(c => ({
          description: c.description,
          distance: c.distance,
          penetrationDepth: c.penetrationDepth,
          location: c.pointA?.toArray()
        })),
        nearMisses: includeNearMisses ? report.nearMisses.map(nm => ({
          distance: nm.distance,
          severity: nm.severity,
          location: nm.position.toArray(),
          between: `${nm.objectA} and ${nm.objectB}`
        })) : [],
        analysis: {
          minClearanceLocation: report.minClearancePosition?.toArray(),
          safetyMargin: report.minClearance > 0 ? report.minClearance : 0,
          riskLevel: report.collisionCount > 0 ? 'CRITICAL' :
                     report.nearMisses.filter(nm => nm.severity === 'HIGH').length > 0 ? 'HIGH' :
                     report.nearMisses.length > 0 ? 'MODERATE' : 'LOW'
        },
        recommendation: report.safe
          ? `Toolpath verified safe. Minimum clearance: ${report.minClearance.toFixed(2)}mm`
          : `STOP: ${report.collisionCount} collision(s) detected. DO NOT RUN THIS PROGRAM.`
      };
    }

    // ========================================================================
    // validate_tool_clearance
    // ========================================================================
    case 'validate_tool_clearance': {
      const position = toVector3(args.position);
      const toolAxis = args.toolAxis 
        ? toVector3(args.toolAxis).normalize()
        : new Vector3(0, 0, -1);
      const obstacles = (args.obstacles || []).map(toCollisionGeometry);

      const tool: ToolAssembly = {
        toolId: args.tool.toolId || 'check',
        toolType: 'endmill',
        diameter: args.tool.diameter,
        fluteLength: args.tool.fluteLength,
        overallLength: args.tool.overallLength,
        shankDiameter: args.tool.shankDiameter || args.tool.diameter * 0.8,
        stickout: args.tool.stickout || args.tool.overallLength,
        holder: args.tool.holder ? {
          holderId: args.tool.holder.holderId || 'holder',
          holderType: args.tool.holder.holderType || 'CAT40',
          envelope: [],
          maxDiameter: args.tool.holder.maxDiameter || 63,
          length: args.tool.holder.length || 100
        } : undefined
      };

      const result = collisionEngine.validateToolClearance(
        tool,
        position,
        toolAxis,
        obstacles
      );

      return {
        clear: result.clear,
        minClearance: result.minClearance,
        issues: result.issues,
        toolAssembly: {
          cuttingDiameter: tool.diameter,
          cuttingLength: tool.fluteLength,
          overallLength: tool.overallLength,
          shankDiameter: tool.shankDiameter,
          holderDiameter: tool.holder?.maxDiameter,
          holderLength: tool.holder?.length,
          totalAssemblyLength: tool.overallLength + (tool.holder?.length || 0)
        },
        recommendation: result.clear
          ? `Tool assembly has ${result.minClearance.toFixed(2)}mm clearance`
          : `COLLISION: ${result.issues.join('; ')}`
      };
    }

    // ========================================================================
    // check_5axis_head_clearance
    // ========================================================================
    case 'check_5axis_head_clearance': {
      const position = toVector3(args.position);
      const toolAxis = toVector3(args.toolAxis).normalize();
      const machine = toMachineEnvelope(args.machine);
      const fixtures = (args.fixtures || []).map(toFixture);
      const workpiece = toWorkpiece(args.workpiece);

      const result = collisionEngine.check5AxisHeadClearance(
        position,
        toolAxis,
        machine,
        fixtures,
        workpiece
      );

      // Calculate head orientation angles
      const zAxis = new Vector3(0, 0, -1);
      const aAngle = Math.acos(toolAxis.z) * 180 / Math.PI;
      const bAngle = Math.atan2(toolAxis.x, -toolAxis.z) * 180 / Math.PI;

      return {
        clear: result.clear,
        minClearance: result.minClearance,
        issues: result.issues,
        headOrientation: {
          toolAxisVector: toolAxis.toArray(),
          approximateAAngle: aAngle,
          approximateBAngle: bAngle
        },
        position: position.toArray(),
        recommendation: result.clear
          ? `5-axis head has ${result.minClearance.toFixed(2)}mm clearance at this orientation`
          : `HEAD COLLISION: ${result.issues.join('; ')}. Reorient or retract.`
      };
    }

    default:
      throw new Error(`Unknown collision tool: ${toolName}`);
  }
}

/**
 * Get all collision tool definitions
 */
export function getCollisionTools() {
  return collisionTools;
}

/**
 * Register all collision detection tools with the MCP server
 * SAFETY CRITICAL: These tools prevent crashes, injuries, and death
 */
export function registerCollisionTools(server: any): void {
  for (const tool of collisionTools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      async (params: any) => {
        const result = await handleCollisionTool(tool.name, params);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          metadata: { safety_critical: true, ...result }
        };
      }
    );
  }
  console.log("Registered: Collision Detection tools (8 tools) - SAFETY CRITICAL");
}
