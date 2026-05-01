/**
 * PRISM_UNIFIED_3D_VIEWPORT_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 929
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

const PRISM_UNIFIED_3D_VIEWPORT_ENGINE = {
  version: '3.0.0',
  name: 'PRISM Unified 3D Viewport Engine',

  // CONFIGURATION
  config: {
    defaultBackground: 0x1a1a2e,
    gridColor: 0x3b82f6,
    gridSecondary: 0x1e3a5f,
    axisColors: { x: 0xff0000, y: 0x00ff00, z: 0x0000ff },
    toolpathColors: {
      rapid: 0xff6b6b,
      feed: 0x4ecdc4,
      plunge: 0xffd93d,
      retract: 0x95e1d3,
      arc: 0xa855f7
    },
    stockColor: 0x60a5fa,
    fixtureColor: 0xfbbf24,
    toolColor: 0xef4444,
    workpieceColor: 0x22c55e,
    highlightColor: 0xf97316,
    selectionColor: 0x06b6d4
  },
  // STATE MANAGEMENT
  state: {
    viewports: new Map(),
    activeViewport: null,
    selectedObjects: [],
    measurementPoints: [],
    sectionPlanes: [],
    animationFrame: null
  },
  // VIEWPORT CREATION & MANAGEMENT

  createViewport(containerId, options = {}) {
    if (typeof THREE === 'undefined') {
      console.warn('[PRISM-3D] THREE.js not loaded');
      return null;
    }
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[PRISM-3D] Container '${containerId}' not found`);
      return null;
    }
    const viewport = {
      id: containerId,
      container: container,
      scene: new THREE.Scene(),
      camera: null,
      renderer: null,
      controls: null,
      lights: [],
      helpers: [],
      objects: {
        stock: null,
        fixture: null,
        workpiece: null,
        tool: null,
        toolpath: null,
        machine: null
      },
      layers: {
        model: new THREE.Group(),
        toolpath: new THREE.Group(),
        measurement: new THREE.Group(),
        annotation: new THREE.Group()
      },
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      clock: new THREE.Clock(),
      options: { ...this.config, ...options }
    };
    // Initialize scene
    viewport.scene.background = new THREE.Color(viewport.options.defaultBackground);

    // Add layer groups to scene
    Object.values(viewport.layers).forEach(layer => viewport.scene.add(layer));

    // Setup camera
    const aspect = container.clientWidth / container.clientHeight;
    viewport.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
    viewport.camera.position.set(300, 200, 300);
    viewport.camera.lookAt(0, 0, 0);

    // Setup renderer
    viewport.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    viewport.renderer.setSize(container.clientWidth, container.clientHeight);
    viewport.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    viewport.renderer.shadowMap.enabled = true;
    viewport.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(viewport.renderer.domElement);

    // Setup controls (OrbitControls)
    if (typeof THREE.OrbitControls !== 'undefined') {
      viewport.controls = new THREE.OrbitControls(viewport.camera, viewport.renderer.domElement);
      viewport.controls.enableDamping = true;
      viewport.controls.dampingFactor = 0.05;
      viewport.controls.screenSpacePanning = true;
      viewport.controls.minDistance = 10;
      viewport.controls.maxDistance: 5000;
    }
    // Setup lighting
    this._setupLighting(viewport);

    // Setup helpers (grid, axes)
    this._setupHelpers(viewport);

    // Event listeners
    this._setupEventListeners(viewport);

    // Store viewport
    this.state.viewports.set(containerId, viewport);
    this.state.activeViewport = viewport;

    // Start render loop
    this._startRenderLoop(viewport);

    console.log(`[PRISM-3D] Viewport '${containerId}' created`);
    return viewport;
  },
  _setupLighting(viewport) {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    viewport.scene.add(ambient);
    viewport.lights.push(ambient);

    // Main directional light with shadows
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(100, 200, 100);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 1000;
    mainLight.shadow.camera.left = -200;
    mainLight.shadow.camera.right = 200;
    mainLight.shadow.camera.top = 200;
    mainLight.shadow.camera.bottom = -200;
    viewport.scene.add(mainLight);
    viewport.lights.push(mainLight);

    // Fill lights
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight1.position.set(-100, 50, -100);
    viewport.scene.add(fillLight1);
    viewport.lights.push(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
    fillLight2.position.set(0, -100, 0);
    viewport.scene.add(fillLight2);
    viewport.lights.push(fillLight2);
  },
  _setupHelpers(viewport) {
    // Grid helper
    const grid = new THREE.GridHelper(500, 50, viewport.options.gridColor, viewport.options.gridSecondary);
    grid.position.y = 0;
    viewport.scene.add(grid);
    viewport.helpers.push(grid);

    // Axes helper
    const axes = new THREE.AxesHelper(100);
    viewport.scene.add(axes);
    viewport.helpers.push(axes);
  },
  _setupEventListeners(viewport) {
    const container = viewport.container;

    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      viewport.camera.aspect = width / height;
      viewport.camera.updateProjectionMatrix();
      viewport.renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // Mouse events for picking
    container.addEventListener('click', (e) => this._onMouseClick(e, viewport));
    container.addEventListener('mousemove', (e) => this._onMouseMove(e, viewport));
    container.addEventListener('dblclick', (e) => this._onDoubleClick(e, viewport));
  },
  _onMouseClick(event, viewport) {
    const rect = viewport.container.getBoundingClientRect();
    viewport.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    viewport.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    viewport.raycaster.setFromCamera(viewport.mouse, viewport.camera);
    const intersects = viewport.raycaster.intersectObjects(viewport.layers.model.children, true);

    if (intersects.length > 0) {
      const selected = intersects[0].object;
      this._selectObject(selected, viewport);

      // Dispatch event
      viewport.container.dispatchEvent(new CustomEvent('prism-object-selected', {
        detail: { object: selected, point: intersects[0].point }
      }));
    }
  },
  _onMouseMove(event, viewport) {
    const rect = viewport.container.getBoundingClientRect();
    viewport.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    viewport.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  },
  _onDoubleClick(event, viewport) {
    // Focus on clicked object
    viewport.raycaster.setFromCamera(viewport.mouse, viewport.camera);
    const intersects = viewport.raycaster.intersectObjects(viewport.layers.model.children, true);

    if (intersects.length > 0) {
      this.focusOnObject(intersects[0].object, viewport.id);
    }
  },
  _selectObject(object, viewport) {
    // Clear previous selection
    this.state.selectedObjects.forEach(obj => {
      if (obj.userData.originalMaterial) {
        obj.material = obj.userData.originalMaterial;
      }
    });
    this.state.selectedObjects = [];

    // Highlight new selection
    if (object.material) {
      object.userData.originalMaterial = object.material;
      object.material = object.material.clone();
      object.material.emissive = new THREE.Color(this.config.selectionColor);
      object.material.emissiveIntensity = 0.3;
    }
    this.state.selectedObjects.push(object);
  },
  _startRenderLoop(viewport) {
    const animate = () => {
      viewport.animationId = requestAnimationFrame(animate);

      if (viewport.controls) {
        viewport.controls.update();
      }
      // Update any animations
      const delta = viewport.clock.getDelta();
      this._updateAnimations(viewport, delta);

      viewport.renderer.render(viewport.scene, viewport.camera);
    };
    animate();
  },
  _updateAnimations(viewport, delta) {
    // Tool animation during simulation
    if (viewport.simulation && viewport.simulation.running) {
      this._updateSimulationFrame(viewport, delta);
    }
  },
  // MODEL LOADING & CREATION

  loadStock(viewport_id, dimensions, material = 'aluminum') {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport) return null;

    // Remove existing stock
    if (viewport.objects.stock) {
      viewport.layers.model.remove(viewport.objects.stock);
    }
    const { x, y, z } = dimensions;
    const geometry = new THREE.BoxGeometry(x, z, y); // Y-up coordinate system

    const matProps = this._getMaterialProperties(material);
    const meshMaterial = new THREE.MeshStandardMaterial({
      color: matProps.color,
      metalness: matProps.metalness,
      roughness: matProps.roughness,
      transparent: true,
      opacity: 0.9
    });

    const stock = new THREE.Mesh(geometry, meshMaterial);
    stock.position.set(0, z / 2, 0);
    stock.castShadow = true;
    stock.receiveShadow = true;
    stock.userData = { type: 'stock', dimensions, material };

    // Add edges for visibility
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x60a5fa });
    const wireframe = new THREE.LineSegments(edges, edgeMaterial);
    stock.add(wireframe);

    viewport.objects.stock = stock;
    viewport.layers.model.add(stock);

    return stock;
  },
  _getMaterialProperties(material) {
    const materials = {
      aluminum: { color: 0xc0c0c0, metalness: 0.8, roughness: 0.4 },
      steel: { color: 0x7a7a7a, metalness: 0.9, roughness: 0.3 },
      stainless: { color: 0xa8a8a8, metalness: 0.95, roughness: 0.2 },
      titanium: { color: 0x878787, metalness: 0.85, roughness: 0.35 },
      brass: { color: 0xd4af37, metalness: 0.9, roughness: 0.3 },
      copper: { color: 0xb87333, metalness: 0.9, roughness: 0.35 },
      plastic: { color: 0xf0f0f0, metalness: 0.0, roughness: 0.8 },
      wood: { color: 0xdeb887, metalness: 0.0, roughness: 0.9 }
    };
    return materials[material] || materials.aluminum;
  },
  loadTool(viewport_id, toolData) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport) return null;

    // Remove existing tool
    if (viewport.objects.tool) {
      viewport.layers.model.remove(viewport.objects.tool);
    }
    const tool = this._createToolGeometry(toolData);
    tool.position.set(0, toolData.stickout || 100, 0);
    tool.userData = { type: 'tool', data: toolData };

    viewport.objects.tool = tool;
    viewport.layers.model.add(tool);

    return tool;
  },
  _createToolGeometry(toolData) {
    const group = new THREE.Group();
    const { type, diameter, length, fluteLength, cornerRadius } = toolData;

    const material = new THREE.MeshStandardMaterial({
      color: 0x404040,
      metalness: 0.95,
      roughness: 0.2
    });

    const cutterMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700, // TiN coating color
      metalness: 0.9,
      roughness: 0.3
    });

    // Shank
    const shankLength = length - (fluteLength || length * 0.6);
    const shankGeom = new THREE.CylinderGeometry(
      diameter / 2,
      diameter / 2,
      shankLength,
      32
    );
    const shank = new THREE.Mesh(shankGeom, material);
    shank.position.y = -shankLength / 2;
    group.add(shank);

    // Cutting portion
    let cutter;
    const flLength = fluteLength || length * 0.6;

    switch (type) {
      case 'endmill':
      case 'flat_endmill':
        const endmillGeom = new THREE.CylinderGeometry(
          diameter / 2,
          diameter / 2,
          flLength,
          32
        );
        cutter = new THREE.Mesh(endmillGeom, cutterMaterial);
        cutter.position.y = -shankLength - flLength / 2;
        break;

      case 'ballnose':
      case 'ball_endmill':
        const ballGroup = new THREE.Group();

        // Cylindrical flute portion
        const ballFluteGeom = new THREE.CylinderGeometry(
          diameter / 2,
          diameter / 2,
          flLength - diameter / 2,
          32
        );
        const ballFlute = new THREE.Mesh(ballFluteGeom, cutterMaterial);
        ballFlute.position.y = -(flLength - diameter / 2) / 2;
        ballGroup.add(ballFlute);

        // Ball tip
        const ballTipGeom = new THREE.SphereGeometry(diameter / 2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const ballTip = new THREE.Mesh(ballTipGeom, cutterMaterial);
        ballTip.rotation.x = Math.PI;
        ballTip.position.y = -(flLength - diameter / 2);
        ballGroup.add(ballTip);

        ballGroup.position.y = -shankLength;
        cutter = ballGroup;
        break;

      case 'bullnose':
      case 'corner_radius':
        const crRadius = cornerRadius || diameter * 0.1;
        // Simplified bullnose as cylinder with rounded bottom
        const bullnoseGeom = new THREE.CylinderGeometry(
          diameter / 2,
          diameter / 2,
          flLength,
          32
        );
        cutter = new THREE.Mesh(bullnoseGeom, cutterMaterial);
        cutter.position.y = -shankLength - flLength / 2;
        break;

      case 'drill':
        const drillGroup = new THREE.Group();

        // Drill body
        const drillBodyGeom = new THREE.CylinderGeometry(
          diameter / 2,
          diameter / 2,
          flLength - diameter,
          32
        );
        const drillBody = new THREE.Mesh(drillBodyGeom, cutterMaterial);
        drillBody.position.y = -(flLength - diameter) / 2;
        drillGroup.add(drillBody);

        // Drill point (118° standard)
        const drillPointGeom = new THREE.ConeGeometry(diameter / 2, diameter, 32);
        const drillPoint = new THREE.Mesh(drillPointGeom, cutterMaterial);
        drillPoint.rotation.x = Math.PI;
        drillPoint.position.y = -(flLength - diameter / 2);
        drillGroup.add(drillPoint);

        drillGroup.position.y = -shankLength;
        cutter = drillGroup;
        break;

      case 'facemill':
        const facemillGeom = new THREE.CylinderGeometry(
          diameter / 2,
          diameter / 2,
          20,
          32
        );
        cutter = new THREE.Mesh(facemillGeom, cutterMaterial);
        cutter.position.y = -shankLength - 10;
        break;

      default:
        // Default to endmill shape
        const defaultGeom = new THREE.CylinderGeometry(
          diameter / 2,
          diameter / 2,
          flLength,
          32
        );
        cutter = new THREE.Mesh(defaultGeom, cutterMaterial);
        cutter.position.y = -shankLength - flLength / 2;
    }
    group.add(cutter);
    return group;
  },
  // TOOLPATH VISUALIZATION

  loadToolpath(viewport_id, toolpathData, options = {}) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport) return null;

    const {
      showRapids = true,
      rapidColor = this.config.toolpathColors.rapid,
      feedColor = this.config.toolpathColors.feed,
      lineWidth = 1,
      animate = false
    } = options;

    // Clear existing toolpath
    this.clearToolpath(viewport_id);

    const toolpathGroup = new THREE.Group();
    toolpathGroup.userData = { type: 'toolpath' };

    // Parse toolpath and create line segments
    if (toolpathData.points) {
      this._createToolpathFromPoints(toolpathGroup, toolpathData.points, { rapidColor, feedColor, showRapids });
    } else if (toolpathData.operations) {
      toolpathData.operations.forEach(op => {
        if (op.passes) {
          op.passes.forEach(pass => {
            if (pass.points) {
              this._createToolpathFromPoints(toolpathGroup, pass.points, { rapidColor, feedColor, showRapids });
            }
          });
        }
      });
    } else if (toolpathData.gcode) {
      this._createToolpathFromGCode(toolpathGroup, toolpathData.gcode, { rapidColor, feedColor, showRapids });
    }
    viewport.objects.toolpath = toolpathGroup;
    viewport.layers.toolpath.add(toolpathGroup);

    if (animate) {
      this._animateToolpath(viewport, toolpathGroup);
    }
    return toolpathGroup;
  },
  _createToolpathFromPoints(group, points, options) {
    const rapidPoints = [];
    const feedPoints = [];
    let lastPoint = null;

    points.forEach(pt => {
      const point = new THREE.Vector3(pt.x || 0, pt.z || 0, pt.y || 0);

      if (pt.rapid || pt.type === 'rapid') {
        if (lastPoint) rapidPoints.push(lastPoint.clone(), point);
      } else {
        if (lastPoint) feedPoints.push(lastPoint.clone(), point);
      }
      lastPoint = point;
    });

    // Create rapid lines
    if (options.showRapids && rapidPoints.length > 0) {
      const rapidGeom = new THREE.BufferGeometry().setFromPoints(rapidPoints);
      const rapidMat = new THREE.LineDashedMaterial({
        color: options.rapidColor,
        dashSize: 3,
        gapSize: 2
      });
      const rapidLines = new THREE.LineSegments(rapidGeom, rapidMat);
      rapidLines.computeLineDistances();
      rapidLines.userData = { type: 'rapid' };
      group.add(rapidLines);
    }
    // Create feed lines
    if (feedPoints.length > 0) {
      const feedGeom = new THREE.BufferGeometry().setFromPoints(feedPoints);
      const feedMat = new THREE.LineBasicMaterial({ color: options.feedColor });
      const feedLines = new THREE.LineSegments(feedGeom, feedMat);
      feedLines.userData = { type: 'feed' };
      group.add(feedLines);
    }
  },
  _createToolpathFromGCode(group, gcode, options) {
    const lines = gcode.split('\n');
    const points = [];
    let currentPos = { x: 0, y: 0, z: 0 };
    let isRapid = false;

    lines.forEach(line => {
      const clean = line.split('(')[0].split(';')[0].trim().toUpperCase();
      if (!clean) return;

      // Parse G-codes
      if (clean.includes('G0') && !clean.includes('G00')) isRapid = true;
      if (clean.includes('G00')) isRapid = true;
      if (clean.includes('G1') && !clean.includes('G10')) isRapid = false;
      if (clean.includes('G01')) isRapid = false;

      // Parse coordinates
      const xMatch = clean.match(/X([+-]?\d*\.?\d+)/);
      const yMatch = clean.match(/Y([+-]?\d*\.?\d+)/);
      const zMatch = clean.match(/Z([+-]?\d*\.?\d+)/);

      if (xMatch) currentPos.x = parseFloat(xMatch[1]);
      if (yMatch) currentPos.y = parseFloat(yMatch[1]);
      if (zMatch) currentPos.z = parseFloat(zMatch[1]);

      if (xMatch || yMatch || zMatch) {
        points.push({
          x: currentPos.x,
          y: currentPos.y,
          z: currentPos.z,
          rapid: isRapid
        });
      }
    });

    this._createToolpathFromPoints(group, points, options);
  },
  clearToolpath(viewport_id) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport) return;

    while (viewport.layers.toolpath.children.length > 0) {
      const child = viewport.layers.toolpath.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      viewport.layers.toolpath.remove(child);
    }
    viewport.objects.toolpath = null;
  },
  // VIEW CONTROLS

  setView(viewport_id, view) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport) return;

    const distance = 500;
    const views = {
      front: { position: [0, 0, distance], up: [0, 1, 0] },
      back: { position: [0, 0, -distance], up: [0, 1, 0] },
      top: { position: [0, distance, 0], up: [0, 0, -1] },
      bottom: { position: [0, -distance, 0], up: [0, 0, 1] },
      left: { position: [-distance, 0, 0], up: [0, 1, 0] },
      right: { position: [distance, 0, 0], up: [0, 1, 0] },
      iso: { position: [distance * 0.6, distance * 0.6, distance * 0.6], up: [0, 1, 0] },
      isometric: { position: [distance * 0.6, distance * 0.6, distance * 0.6], up: [0, 1, 0] }
    };
    const viewConfig = views[view.toLowerCase()];
    if (viewConfig) {
      viewport.camera.position.set(...viewConfig.position);
      viewport.camera.up.set(...viewConfig.up);
      viewport.camera.lookAt(0, 0, 0);
      if (viewport.controls) viewport.controls.update();
    }
  },
  fitToView(viewport_id, padding = 1.2) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport) return;

    const box = new THREE.Box3();
    viewport.layers.model.traverse(obj => {
      if (obj.isMesh) {
        box.expandByObject(obj);
      }
    });

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = viewport.camera.fov * (Math.PI / 180);
    const distance = (maxDim * padding) / (2 * Math.tan(fov / 2));

    viewport.camera.position.set(
      center.x + distance * 0.6,
      center.y + distance * 0.6,
      center.z + distance * 0.6
    );
    viewport.camera.lookAt(center);

    if (viewport.controls) {
      viewport.controls.target.copy(center);
      viewport.controls.update();
    }
  },
  focusOnObject(object, viewport_id) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport || !object) return;

    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 100;
    const distance = maxDim * 3;

    viewport.camera.position.set(
      center.x + distance * 0.6,
      center.y + distance * 0.6,
      center.z + distance * 0.6
    );
    viewport.camera.lookAt(center);

    if (viewport.controls) {
      viewport.controls.target.copy(center);
      viewport.controls.update();
    }
  },
  // MEASUREMENT TOOLS

  startMeasurement(viewport_id, type = 'distance') {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport) return;

    viewport.measurementMode = {
      active: true,
      type: type,
      points: []
    };
  },
  addMeasurementPoint(viewport_id, point) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport || !viewport.measurementMode?.active) return;

    viewport.measurementMode.points.push(point.clone());

    // Create point marker
    const markerGeom = new THREE.SphereGeometry(2, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const marker = new THREE.Mesh(markerGeom, markerMat);
    marker.position.copy(point);
    viewport.layers.measurement.add(marker);

    // Check if measurement is complete
    if (viewport.measurementMode.type === 'distance' && viewport.measurementMode.points.length === 2) {
      this._completeMeasurement(viewport);
    }
  },
  _completeMeasurement(viewport) {
    const points = viewport.measurementMode.points;

    if (viewport.measurementMode.type === 'distance' && points.length >= 2) {
      const distance = points[0].distanceTo(points[1]);

      // Create measurement line
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00 });
      const line = new THREE.Line(lineGeom, lineMat);
      viewport.layers.measurement.add(line);

      // Create label (sprite)
      const midPoint = new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5);
      this._createMeasurementLabel(viewport, midPoint, `${distance.toFixed(3)} mm`);

      // Dispatch event
      viewport.container.dispatchEvent(new CustomEvent('prism-measurement-complete', {
        detail: { type: 'distance', value: distance, unit: 'mm', points: points }
      }));
    }
    viewport.measurementMode.active = false;
  },
  _createMeasurementLabel(viewport, position, text) {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(position);
    sprite.scale.set(50, 12.5, 1);
    viewport.layers.measurement.add(sprite);
  },
  clearMeasurements(viewport_id) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport) return;

    while (viewport.layers.measurement.children.length > 0) {
      const child = viewport.layers.measurement.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
      viewport.layers.measurement.remove(child);
    }
  },
  // SECTION VIEWS

  addSectionPlane(viewport_id, axis = 'x', position = 0) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport) return null;

    const normal = new THREE.Vector3(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0,
      axis === 'z' ? 1 : 0
    );

    const plane = new THREE.Plane(normal, -position);
    viewport.renderer.localClippingEnabled = true;

    // Apply clipping plane to all meshes
    viewport.layers.model.traverse(obj => {
      if (obj.isMesh && obj.material) {
        if (!obj.material.clippingPlanes) {
          obj.material.clippingPlanes = [];
        }
        obj.material.clippingPlanes.push(plane);
        obj.material.clipIntersection = false;
        obj.material.needsUpdate = true;
      }
    });

    // Create visual plane helper
    const planeHelper = new THREE.PlaneHelper(plane, 200, 0xff0000);
    viewport.scene.add(planeHelper);

    const sectionData = { plane, helper: planeHelper, axis, position };
    this.state.sectionPlanes.push(sectionData);

    return sectionData;
  },
  removeSectionPlane(viewport_id, sectionData) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport || !sectionData) return;

    // Remove plane from all materials
    viewport.layers.model.traverse(obj => {
      if (obj.isMesh && obj.material?.clippingPlanes) {
        const idx = obj.material.clippingPlanes.indexOf(sectionData.plane);
        if (idx > -1) {
          obj.material.clippingPlanes.splice(idx, 1);
          obj.material.needsUpdate = true;
        }
      }
    });

    // Remove helper
    viewport.scene.remove(sectionData.helper);

    // Remove from state
    const idx = this.state.sectionPlanes.indexOf(sectionData);
    if (idx > -1) this.state.sectionPlanes.splice(idx, 1);
  },
  // SIMULATION SUPPORT

  initializeSimulation(viewport_id, toolpathData, stockData) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport) return null;

    viewport.simulation = {
      running: false,
      paused: false,
      speed: 1.0,
      currentIndex: 0,
      toolpath: toolpathData,
      stock: stockData,
      toolPosition: new THREE.Vector3(0, stockData?.z || 100, 0)
    };
    return viewport.simulation;
  },
  startSimulation(viewport_id) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport?.simulation) return;

    viewport.simulation.running = true;
    viewport.simulation.paused = false;
  },
  pauseSimulation(viewport_id) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport?.simulation) return;

    viewport.simulation.paused = true;
  },
  stopSimulation(viewport_id) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport?.simulation) return;

    viewport.simulation.running = false;
    viewport.simulation.paused = false;
    viewport.simulation.currentIndex = 0;
  },
  setSimulationSpeed(viewport_id, speed) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport?.simulation) return;

    viewport.simulation.speed = Math.max(0.1, Math.min(10, speed));
  },
  _updateSimulationFrame(viewport, delta) {
    if (!viewport.simulation?.running || viewport.simulation.paused) return;

    const sim = viewport.simulation;
    const tool = viewport.objects.tool;

    if (!tool || !sim.toolpath?.points) return;

    // Advance simulation
    sim.currentIndex += delta * sim.speed * 60; // 60 points per second at 1x speed

    if (sim.currentIndex >= sim.toolpath.points.length) {
      sim.currentIndex = sim.toolpath.points.length - 1;
      sim.running = false;
      viewport.container.dispatchEvent(new CustomEvent('prism-simulation-complete'));
      return;
    }
    // Update tool position
    const idx = Math.floor(sim.currentIndex);
    const pt = sim.toolpath.points[idx];
    if (pt) {
      tool.position.set(pt.x || 0, pt.z || 0, pt.y || 0);
    }
    // Dispatch progress event
    viewport.container.dispatchEvent(new CustomEvent('prism-simulation-progress', {
      detail: {
        progress: sim.currentIndex / sim.toolpath.points.length,
        currentPoint: pt,
        index: idx
      }
    }));
  },
  // CLEANUP

  destroyViewport(viewport_id) {
    const viewport = this.state.viewports.get(viewport_id);
    if (!viewport) return;

    // Cancel animation frame
    if (viewport.animationId) {
      cancelAnimationFrame(viewport.animationId);
    }
    // Dispose geometries and materials
    viewport.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    // Dispose renderer
    viewport.renderer.dispose();

    // Remove canvas
    if (viewport.renderer.domElement?.parentNode) {
      viewport.renderer.domElement.parentNode.removeChild(viewport.renderer.domElement);
    }
    // Remove from state
    this.state.viewports.delete(viewport_id);

    console.log(`[PRISM-3D] Viewport '${viewport_id}' destroyed`);
  }
}