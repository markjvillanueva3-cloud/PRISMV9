const PRISM_REST_MATERIAL_ENGINE = {
  version: '1.0.0',
  name: 'PRISM Rest Material Analysis Engine',

  config: {
    defaultAllowance: 0,      // mm - additional offset
    maxRestMaterial: 1.0,     // mm - max rest to display
    colorSteps: 4,            // Number of color gradient steps
    colors: {
      step1: 0xffff00,  // Yellow - minimal rest
      step2: 0x88ff00,  // Yellow-Green
      step3: 0x00ff88,  // Green-Cyan
      step4: 0x0088ff   // Blue - maximum rest
    },
    modelTessellation: 'normal', // normal, fine, very_fine
    tolerances: {
      normal: 0.1,
      fine: 0.05,
      very_fine: 0.01
    }
  },
  state: {
    targetModel: null,
    currentStock: null,
    restMaterialData: null,
    analysisComplete: false
  },
  // ANALYSIS SETUP

  setTargetModel(modelData) {
    this.state.targetModel = modelData;
    this.state.analysisComplete = false;
    return true;
  },
  setCurrentStock(stockData) {
    this.state.currentStock = stockData;
    this.state.analysisComplete = false;
    return true;
  },
  // REST MATERIAL CALCULATION

  analyzeRestMaterial(options = {}) {
    const {
      allowance = this.config.defaultAllowance,
      maxRestMaterial = this.config.maxRestMaterial,
      tessellation = this.config.modelTessellation
    } = options;

    if (!this.state.targetModel || !this.state.currentStock) {
      return {
        success: false,
        error: 'Model and stock must be set before analysis'
      };
    }
    const tolerance = this.config.tolerances[tessellation];

    // Sample points on target model surface
    const samplePoints = this._sampleModelSurface(this.state.targetModel, tolerance);

    // For each point, find distance to current stock
    const restData = samplePoints.map(point => {
      const stockDistance = this._findDistanceToStock(point, this.state.currentStock);
      const restMaterial = stockDistance - allowance;

      return {
        position: point.position,
        normal: point.normal,
        restMaterial: Math.max(0, restMaterial),
        colorStep: this._getColorStep(restMaterial, maxRestMaterial)
      };
    });

    this.state.restMaterialData = restData;
    this.state.analysisComplete = true;

    return {
      success: true,
      summary: this._generateSummary(restData, maxRestMaterial),
      data: restData
    };
  },
  _sampleModelSurface(model, tolerance) {
    // Generate sample points on model surface
    const points = [];

    if (model.type === 'mesh' && model.vertices && model.normals) {
      // Sample at vertex positions
      for (let i = 0; i < model.vertices.length; i += 3) {
        points.push({
          position: {
            x: model.vertices[i],
            y: model.vertices[i + 1],
            z: model.vertices[i + 2]
          },
          normal: model.normals ? {
            x: model.normals[i],
            y: model.normals[i + 1],
            z: model.normals[i + 2]
          } : { x: 0, y: 0, z: 1 }
        });
      }
    }
    return points;
  },
  _findDistanceToStock(point, stock) {
    // Simplified distance calculation
    // In full implementation, would use proper surface distance
    if (stock.type === 'voxel' && typeof PRISM_VOXEL_STOCK_ENGINE !== 'undefined') {
      const inStock = PRISM_VOXEL_STOCK_ENGINE.isPointInStock(
        point.position.x,
        point.position.y,
        point.position.z
      );
      return inStock ? 0.1 : 0; // Simplified
    }
    return 0;
  },
  _getColorStep(restMaterial, maxRest) {
    if (restMaterial <= 0) return 0;

    const normalized = Math.min(restMaterial / maxRest, 1);
    const step = Math.floor(normalized * (this.config.colorSteps - 1)) + 1;

    return Math.min(step, this.config.colorSteps);
  },
  // ANALYSIS RESULTS

  _generateSummary(restData, maxRest) {
    const withRest = restData.filter(d => d.restMaterial > 0);

    if (withRest.length === 0) {
      return {
        hasRestMaterial: false,
        coveragePercent: 100,
        maxRestFound: 0,
        avgRestMaterial: 0,
        distribution: { step1: 0, step2: 0, step3: 0, step4: 0 }
      };
    }
    const distribution = { step1: 0, step2: 0, step3: 0, step4: 0 };
    let totalRest = 0;
    let maxRestFound = 0;

    withRest.forEach(d => {
      distribution[`step${d.colorStep}`]++;
      totalRest += d.restMaterial;
      maxRestFound = Math.max(maxRestFound, d.restMaterial);
    });

    return {
      hasRestMaterial: true,
      coveragePercent: ((restData.length - withRest.length) / restData.length * 100).toFixed(1),
      maxRestFound: maxRestFound.toFixed(3),
      avgRestMaterial: (totalRest / withRest.length).toFixed(3),
      distribution: distribution,
      thresholds: {
        step1: `< ${(maxRest * 0.25).toFixed(2)}mm`,
        step2: `< ${(maxRest * 0.5).toFixed(2)}mm`,
        step3: `< ${(maxRest * 0.75).toFixed(2)}mm`,
        step4: `> ${(maxRest * 0.75).toFixed(2)}mm`
      }
    };
  },
  getRestMaterialAreas(minRest = 0) {
    if (!this.state.restMaterialData) return [];

    return this.state.restMaterialData
      .filter(d => d.restMaterial >= minRest)
      .map(d => ({
        position: d.position,
        restAmount: d.restMaterial
      }));
  },
  // VISUALIZATION

  generateVisualization() {
    if (typeof THREE === 'undefined' || !this.state.restMaterialData) return null;

    const group = new THREE.Group();
    group.name = 'RestMaterialVisualization';

    // Create point cloud for rest material display
    const positions = [];
    const colors = [];

    const colorPalette = [
      new THREE.Color(this.config.colors.step1),
      new THREE.Color(this.config.colors.step2),
      new THREE.Color(this.config.colors.step3),
      new THREE.Color(this.config.colors.step4)
    ];

    this.state.restMaterialData.forEach(d => {
      if (d.restMaterial > 0) {
        positions.push(d.position.x, d.position.y, d.position.z);
        const color = colorPalette[d.colorStep - 1] || colorPalette[3];
        colors.push(color.r, color.g, color.b);
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true
    });

    const points = new THREE.Points(geometry, material);
    group.add(points);

    return group;
  },
  generateLegend() {
    return {
      title: 'Rest Material',
      colors: [
        { color: '#ffff00', label: 'Minimal (Step 1)' },
        { color: '#88ff00', label: 'Low (Step 2)' },
        { color: '#00ff88', label: 'Medium (Step 3)' },
        { color: '#0088ff', label: 'High (Step 4)' }
      ],
      unit: 'mm'
    };
  }
}