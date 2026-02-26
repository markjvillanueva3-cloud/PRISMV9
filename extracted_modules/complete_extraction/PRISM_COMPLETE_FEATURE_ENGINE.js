const PRISM_COMPLETE_FEATURE_ENGINE = {
  version: '1.0.0',

  // FEATURE TYPES WITH FULL DEFINITIONS

  featureTypes: {
    pocket: {
      name: 'Pocket',
      params: ['length', 'width', 'depth', 'cornerRadius', 'floor', 'walls'],
      operations: ['rough_pocket', 'finish_pocket', 'finish_floor'],
      tools: ['endmill', 'ball_endmill'],
      recognition: {
        keywords: ['pocket', 'cavity', 'recess', 'depression'],
        patterns: /pocket|cavity|recess|\b(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)\s*deep/i
      }
    },
    hole: {
      name: 'Hole',
      params: ['diameter', 'depth', 'type', 'tolerance'],
      types: ['thru', 'blind', 'counterbore', 'countersink', 'tapped'],
      operations: ['center_drill', 'drill', 'ream', 'bore', 'tap'],
      tools: ['drill', 'reamer', 'boring_bar', 'tap'],
      recognition: {
        keywords: ['hole', 'drill', 'bore', 'thru', 'through'],
        patterns: /[ØⲐ∅]\s*(\d+\.?\d*)|(\.\d+)\s*(?:thru|through|deep)/i
      }
    },
    slot: {
      name: 'Slot',
      params: ['length', 'width', 'depth', 'endType'],
      endTypes: ['open', 'closed', 'one_open'],
      operations: ['rough_slot', 'finish_slot'],
      tools: ['endmill', 'slot_mill'],
      recognition: {
        keywords: ['slot', 'groove', 'channel', 'keyway'],
        patterns: /slot|groove|keyway|channel/i
      }
    },
    thread: {
      name: 'Thread',
      params: ['size', 'pitch', 'type', 'depth', 'class'],
      types: ['internal', 'external'],
      operations: ['drill', 'tap', 'thread_mill'],
      tools: ['tap', 'thread_mill'],
      recognition: {
        keywords: ['thread', 'tap', 'screw'],
        patterns: /(M\d+\.?\d*\s*[xX×]\s*\d+\.?\d*)|([\d\/]+\s*[-–]\s*\d+\s*(?:UNC|UNF|UNEF|UN))/i
      }
    },
    contour: {
      name: 'Contour/Profile',
      params: ['boundary', 'depth', 'wallAngle', 'bottomRadius'],
      operations: ['rough_contour', 'finish_contour'],
      tools: ['endmill', 'ball_endmill'],
      recognition: {
        keywords: ['contour', 'profile', 'outline', 'perimeter'],
        patterns: /contour|profile|outline/i
      }
    },
    face: {
      name: 'Face',
      params: ['length', 'width', 'finish'],
      operations: ['face_mill'],
      tools: ['face_mill', 'endmill'],
      recognition: {
        keywords: ['face', 'surface', 'flat', 'plane'],
        patterns: /face|surface|flat|plane/i
      }
    },
    chamfer: {
      name: 'Chamfer',
      params: ['angle', 'size', 'edges'],
      operations: ['chamfer'],
      tools: ['chamfer_mill', 'endmill'],
      recognition: {
        keywords: ['chamfer', 'bevel', 'break edge'],
        patterns: /chamfer|bevel|(\d+\.?\d*)\s*[°˚]\s*[xX×]\s*(\d+\.?\d*)/i
      }
    },
    fillet: {
      name: 'Fillet',
      params: ['radius', 'edges'],
      operations: ['fillet'],
      tools: ['ball_endmill', 'corner_radius_endmill'],
      recognition: {
        keywords: ['fillet', 'radius', 'round'],
        patterns: /fillet|radius|round|R\s*(\d+\.?\d*)/i
      }
    },
    boss: {
      name: 'Boss',
      params: ['diameter', 'height', 'draft'],
      operations: ['contour', 'face'],
      tools: ['endmill'],
      recognition: {
        keywords: ['boss', 'post', 'stud', 'protrusion'],
        patterns: /boss|post|stud|protrusion/i
      }
    },
    rib: {
      name: 'Rib',
      params: ['height', 'width', 'length', 'draft'],
      operations: ['contour', 'face'],
      tools: ['endmill'],
      recognition: {
        keywords: ['rib', 'web', 'wall'],
        patterns: /rib|web|thin\s*wall/i
      }
    }
  },
  // FEATURE RECOGNITION (from text, print, or CAD)

  recognize(input) {
    const result = {
      features: [],
      confidence: 0,
      rawText: '',
      dimensions: {}
    };
    // Determine input type
    if (typeof input === 'string') {
      result.rawText = input;
      result.features = this._recognizeFromText(input);
    } else if (input?.type === 'print') {
      result.features = this._recognizeFromPrint(input);
    } else if (input?.geometry) {
      result.features = this._recognizeFromCAD(input);
    } else if (input?.features) {
      // Already has features
      result.features = input.features.map((f, i) => ({
        id: `F${i+1}`,
        ...f,
        ...this._enrichFeature(f)
      }));
    }
    // Calculate overall confidence
    if (result.features.length > 0) {
      result.confidence = result.features.reduce((sum, f) => sum + (f.confidence || 70), 0) / result.features.length;
    }
    return result;
  },
  _recognizeFromText(text) {
    const features = [];
    let featureId = 1;

    // Extract dimensions first
    const dimensions = this._extractDimensions(text);

    // Check each feature type
    for (const [typeKey, typeDef] of Object.entries(this.featureTypes)) {
      // Check keywords
      const hasKeyword = typeDef.recognition.keywords.some(kw =>
        text.toLowerCase().includes(kw.toLowerCase())
      );

      // Check patterns
      const patternMatch = text.match(typeDef.recognition.patterns);

      if (hasKeyword || patternMatch) {
        const feature = {
          id: `F${featureId++}`,
          type: typeKey,
          name: typeDef.name,
          confidence: hasKeyword && patternMatch ? 95 : hasKeyword ? 75 : 60,
          operations: typeDef.operations,
          tools: typeDef.tools,
          params: {}
        };
        // Extract feature-specific parameters
        if (typeKey === 'pocket' && dimensions.length >= 2) {
          feature.params.length = dimensions[0]?.value;
          feature.params.width = dimensions[1]?.value;
          feature.params.depth = dimensions[2]?.value || 0.25;
          feature.params.cornerRadius = 0.125;
        }
        if (typeKey === 'hole') {
          const diaMatch = text.match(/[ØⲐ∅]\s*(\d+\.?\d*)/);
          if (diaMatch) feature.params.diameter = parseFloat(diaMatch[1]);
          feature.params.type = text.match(/thru|through/i) ? 'thru' : 'blind';
        }
        if (typeKey === 'thread') {
          const threadMatch = text.match(/(M\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
          if (threadMatch) {
            feature.params.size = threadMatch[1];
            feature.params.pitch = parseFloat(threadMatch[2]);
          }
          const inchThread = text.match(/([\d\/]+)\s*[-–]\s*(\d+)\s*(UNC|UNF|UNEF)/i);
          if (inchThread) {
            feature.params.size = inchThread[1];
            feature.params.tpi = parseInt(inchThread[2]);
            feature.params.form = inchThread[3];
          }
        }
        features.push(feature);
      }
    }
    // If no features found, create a default face operation
    if (features.length === 0 && dimensions.length > 0) {
      features.push({
        id: 'F1',
        type: 'face',
        name: 'Face',
        confidence: 50,
        operations: ['face_mill'],
        tools: ['face_mill'],
        params: {
          length: dimensions[0]?.value || 6,
          width: dimensions[1]?.value || 4
        }
      });
    }
    return features;
  },
  _extractDimensions(text) {
    const dimensions = [];

    // Decimal inches (e.g., "2.5" or "2.500 in")
    const inchMatches = text.matchAll(/(\d+\.\d+)\s*(?:in|"|inch)?/gi);
    for (const match of inchMatches) {
      dimensions.push({ value: parseFloat(match[1]), unit: 'inch' });
    }
    // Metric (e.g., "25mm" or "25.4 mm")
    const mmMatches = text.matchAll(/(\d+\.?\d*)\s*mm/gi);
    for (const match of mmMatches) {
      dimensions.push({ value: parseFloat(match[1]) / 25.4, unit: 'mm', original: parseFloat(match[1]) });
    }
    // Fractional inches (e.g., "1/4" or "3-1/2")
    const fracMatches = text.matchAll(/(\d+)?\s*[-]?\s*(\d+)\/(\d+)/g);
    for (const match of fracMatches) {
      const whole = match[1] ? parseInt(match[1]) : 0;
      const num = parseInt(match[2]);
      const den = parseInt(match[3]);
      dimensions.push({ value: whole + num/den, unit: 'inch', fractional: true });
    }
    return dimensions;
  },
  _recognizeFromPrint(printData) {
    // Analyze print image/PDF using pattern matching
    const features = [];
    let featureId = 1;

    if (printData.holes) {
      for (const hole of printData.holes) {
        features.push({
          id: `F${featureId++}`,
          type: 'hole',
          name: 'Hole',
          confidence: hole.confidence || 85,
          operations: hole.tapped ? ['center_drill', 'drill', 'tap'] : ['center_drill', 'drill'],
          tools: hole.tapped ? ['center_drill', 'drill', 'tap'] : ['center_drill', 'drill'],
          params: {
            diameter: hole.diameter,
            depth: hole.depth,
            type: hole.type || 'thru',
            x: hole.x,
            y: hole.y
          }
        });
      }
    }
    if (printData.pockets) {
      for (const pocket of printData.pockets) {
        features.push({
          id: `F${featureId++}`,
          type: 'pocket',
          name: 'Pocket',
          confidence: pocket.confidence || 80,
          operations: ['rough_pocket', 'finish_pocket'],
          tools: ['endmill'],
          params: pocket
        });
      }
    }
    if (printData.threads) {
      for (const thread of printData.threads) {
        features.push({
          id: `F${featureId++}`,
          type: 'thread',
          name: 'Thread',
          confidence: thread.confidence || 90,
          operations: ['drill', 'tap'],
          tools: ['drill', 'tap'],
          params: thread
        });
      }
    }
    return features;
  },
  _recognizeFromCAD(cadData) {
    const features = [];
    let featureId = 1;

    // Analyze CAD geometry
    if (cadData.faces) {
      // Find planar faces that could be pockets
      for (const face of cadData.faces) {
        if (face.type === 'planar' && face.normal?.z === -1) {
          // Downward facing face = pocket floor
          features.push({
            id: `F${featureId++}`,
            type: 'pocket',
            name: 'Pocket',
            confidence: 100,
            operations: ['rough_pocket', 'finish_pocket'],
            tools: ['endmill'],
            params: {
              boundary: face.boundary,
              depth: Math.abs(face.z),
              floor: face.z
            }
          });
        }
      }
    }
    if (cadData.holes) {
      for (const hole of cadData.holes) {
        features.push({
          id: `F${featureId++}`,
          type: 'hole',
          name: 'Hole',
          confidence: 100,
          operations: ['drill'],
          tools: ['drill'],
          params: hole
        });
      }
    }
    return features;
  },
  _enrichFeature(feature) {
    const typeDef = this.featureTypes[feature.type];
    if (!typeDef) return feature;

    return {
      operations: feature.operations || typeDef.operations,
      tools: feature.tools || typeDef.tools
    };
  },
  // FEATURE CREATION (generate CAD geometry)

  create(featureType, params) {
    const typeDef = this.featureTypes[featureType];
    if (!typeDef) {
      console.error('[FEATURE_ENGINE] Unknown feature type:', featureType);
      return null;
    }
    const geometry = {
      type: featureType,
      params,
      boundary: null,
      volume: null,
      operations: typeDef.operations,
      tools: typeDef.tools
    };
    // Generate geometry based on type
    switch (featureType) {
      case 'pocket':
        geometry.boundary = this._createRectangularBoundary(
          params.x || 0, params.y || 0,
          params.length, params.width,
          params.cornerRadius || 0
        );
        geometry.volume = params.length * params.width * params.depth;
        geometry.floor = -(params.depth || 0.25);
        break;

      case 'hole':
        geometry.boundary = this._createCircularBoundary(
          params.x || 0, params.y || 0,
          params.diameter / 2
        );
        geometry.volume = Math.PI * Math.pow(params.diameter/2, 2) * params.depth;
        break;

      case 'slot':
        geometry.boundary = this._createSlotBoundary(
          params.startX || 0, params.startY || 0,
          params.endX || params.length, params.endY || 0,
          params.width
        );
        geometry.volume = params.length * params.width * params.depth;
        break;

      case 'contour':
        geometry.boundary = params.boundary || [];
        break;

      case 'chamfer':
        geometry.edges = params.edges || [];
        geometry.angle = params.angle || 45;
        geometry.size = params.size || 0.03;
        break;

      case 'fillet':
        geometry.edges = params.edges || [];
        geometry.radius = params.radius || 0.125;
        break;
    }
    return geometry;
  },
  _createRectangularBoundary(cx, cy, length, width, cornerRadius) {
    if (cornerRadius <= 0) {
      return [
        { x: cx - length/2, y: cy - width/2 },
        { x: cx + length/2, y: cy - width/2 },
        { x: cx + length/2, y: cy + width/2 },
        { x: cx - length/2, y: cy + width/2 }
      ];
    }
    // With corner radius
    const boundary = [];
    const r = Math.min(cornerRadius, length/2, width/2);
    const segments = 8; // Segments per corner

    // Top-right corner
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * (Math.PI / 2);
      boundary.push({
        x: cx + length/2 - r + r * Math.cos(angle),
        y: cy + width/2 - r + r * Math.sin(angle)
      });
    }
    // Top-left corner
    for (let i = 0; i <= segments; i++) {
      const angle = (Math.PI / 2) + (i / segments) * (Math.PI / 2);
      boundary.push({
        x: cx - length/2 + r + r * Math.cos(angle),
        y: cy + width/2 - r + r * Math.sin(angle)
      });
    }
    // Bottom-left corner
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI + (i / segments) * (Math.PI / 2);
      boundary.push({
        x: cx - length/2 + r + r * Math.cos(angle),
        y: cy - width/2 + r + r * Math.sin(angle)
      });
    }
    // Bottom-right corner
    for (let i = 0; i <= segments; i++) {
      const angle = (3 * Math.PI / 2) + (i / segments) * (Math.PI / 2);
      boundary.push({
        x: cx + length/2 - r + r * Math.cos(angle),
        y: cy - width/2 + r + r * Math.sin(angle)
      });
    }
    return boundary;
  },
  _createCircularBoundary(cx, cy, radius) {
    const boundary = [];
    const segments = 32;

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      boundary.push({
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      });
    }
    return boundary;
  },
  _createSlotBoundary(x1, y1, x2, y2, width) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const nx = -dy / len * width / 2;
    const ny = dx / len * width / 2;

    const boundary = [];
    const segments = 8;

    // One end semicircle
    for (let i = 0; i <= segments; i++) {
      const angle = Math.atan2(-ny, -nx) + (i / segments) * Math.PI;
      boundary.push({