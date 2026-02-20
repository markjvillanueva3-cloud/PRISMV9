// PRISM_GCODE_BACKPLOT_ENGINE - Lines 320787-321648 (862 lines) - G-code backplot\n\nconst PRISM_GCODE_BACKPLOT_ENGINE = {
  version: '1.0.0',

  // Current state
  state: {
    position: { x: 0, y: 0, z: 0 },
    workOffset: { x: 0, y: 0, z: 0 },
    feedRate: 100,
    spindleSpeed: 0,
    spindleOn: false,
    coolantOn: false,
    absoluteMode: true,
    metric: true,
    plane: 'XY',  // G17, G18, G19
    currentTool: 1,
    toolLengthOffset: 0,
    toolRadius: 0
  },
  // Parsed moves
  moves: [],

  // Animation state
  animation: {
    isPlaying: false,
    currentFrame: 0,
    speed: 1.0,
    animationId: null
  },
  // Material removal grid (voxel-based)
  materialGrid: null,

  // G-CODE PARSER

  parser: {
    /**
     * Parse G-code string into structured moves
     */
    parse(gcode) {
      const lines = gcode.split('\n');
      const moves = [];

      // Reset state
      const state = {
        x: 0, y: 0, z: 0,
        a: 0, b: 0, c: 0,
        f: 100,
        s: 0,
        absolute: true,
        metric: true,
        plane: 'XY',
        rapidMode: false,
        arcMode: null,  // 'CW' or 'CCW'
        tool: 1
      };
      let lineNumber = 0;

      for (const rawLine of lines) {
        lineNumber++;
        const line = this._cleanLine(rawLine);
        if (!line) continue;

        const parsed = this._parseLine(line, state, lineNumber);
        if (parsed) {
          moves.push(...parsed);
        }
      }
      return {
        moves,
        statistics: this._calculateStatistics(moves)
      };
    },
    _cleanLine(line) {
      // Remove comments
      let clean = line.replace(/\(.*?\)/g, '').replace(/;.*$/, '');
      // Remove N-numbers at start
      clean = clean.replace(/^N\d+\s*/i, '');
      return clean.trim().toUpperCase();
    },
    _parseLine(line, state, lineNumber) {
      const moves = [];
      const words = this._parseWords(line);

      // Track changes
      let newX = null, newY = null, newZ = null;
      let newA = null, newB = null, newC = null;
      let arcI = null, arcJ = null, arcK = null, arcR = null;
      let moveType = null;

      for (const word of words) {
        const code = word.letter;
        const value = word.value;

        switch (code) {
          case 'G':
            switch (Math.floor(value)) {
              case 0: moveType = 'rapid'; state.rapidMode = true; break;
              case 1: moveType = 'linear'; state.rapidMode = false; break;
              case 2: moveType = 'arc_cw'; state.arcMode = 'CW'; break;
              case 3: moveType = 'arc_ccw'; state.arcMode = 'CCW'; break;
              case 17: state.plane = 'XY'; break;
              case 18: state.plane = 'XZ'; break;
              case 19: state.plane = 'YZ'; break;
              case 20: state.metric = false; break;
              case 21: state.metric = true; break;
              case 28: moveType = 'home'; break;
              case 43: /* Tool length offset */ break;
              case 49: /* Cancel TLO */ break;
              case 54: case 55: case 56: case 57: case 58: case 59:
                /* Work offsets */ break;
              case 90: state.absolute = true; break;
              case 91: state.absolute = false; break;
            }
            break;

          case 'X': newX = value; break;
          case 'Y': newY = value; break;
          case 'Z': newZ = value; break;
          case 'A': newA = value; break;
          case 'B': newB = value; break;
          case 'C': newC = value; break;
          case 'I': arcI = value; break;
          case 'J': arcJ = value; break;
          case 'K': arcK = value; break;
          case 'R': arcR = value; break;
          case 'F': state.f = value; break;
          case 'S': state.s = value; break;
          case 'T': state.tool = value; break;
          case 'M':
            // M-codes (spindle, coolant, etc.)
            break;
        }
      }
      // Calculate target position
      const targetX = newX !== null ? (state.absolute ? newX : state.x + newX) : state.x;
      const targetY = newY !== null ? (state.absolute ? newY : state.y + newY) : state.y;
      const targetZ = newZ !== null ? (state.absolute ? newZ : state.z + newZ) : state.z;

      // Create move if position changed or explicit move type
      if (moveType || newX !== null || newY !== null || newZ !== null) {
        const effectiveMoveType = moveType || (state.rapidMode ? 'rapid' : 'linear');

        if (effectiveMoveType === 'arc_cw' || effectiveMoveType === 'arc_ccw') {
          // Generate arc points
          const arcMoves = this._generateArcMoves(
            state.x, state.y, state.z,
            targetX, targetY, targetZ,
            arcI, arcJ, arcK, arcR,
            effectiveMoveType === 'arc_cw',
            state.plane,
            state.f,
            lineNumber
          );
          moves.push(...arcMoves);
        } else {
          moves.push({
            type: effectiveMoveType,
            from: { x: state.x, y: state.y, z: state.z },
            to: { x: targetX, y: targetY, z: targetZ },
            feedRate: state.rapidMode ? 10000 : state.f,
            lineNumber,
            tool: state.tool
          });
        }
        state.x = targetX;
        state.y = targetY;
        state.z = targetZ;
      }
      return moves;
    },
    _parseWords(line) {
      const words = [];
      const regex = /([A-Z])(-?\d*\.?\d+)/g;
      let match;

      while ((match = regex.exec(line)) !== null) {
        words.push({
          letter: match[1],
          value: parseFloat(match[2])
        });
      }
      return words;
    },
    _generateArcMoves(x1, y1, z1, x2, y2, z2, i, j, k, r, clockwise, plane, feedRate, lineNumber) {
      const moves = [];

      // Calculate arc center
      let cx, cy, startAngle, endAngle, radius;

      if (r !== null) {
        // R format
        radius = Math.abs(r);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const h = Math.sqrt(radius * radius - (dist / 2) ** 2);

        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;

        const sign = (clockwise ? 1 : -1) * (r < 0 ? -1 : 1);
        cx = mx + sign * h * (-dy / dist);
        cy = my + sign * h * (dx / dist);
      } else {
        // IJK format
        cx = x1 + (i || 0);
        cy = y1 + (j || 0);
        radius = Math.sqrt((x1 - cx) ** 2 + (y1 - cy) ** 2);
      }
      startAngle = Math.atan2(y1 - cy, x1 - cx);
      endAngle = Math.atan2(y2 - cy, x2 - cx);

      // Calculate sweep angle
      let sweep = endAngle - startAngle;
      if (clockwise) {
        if (sweep > 0) sweep -= Math.PI * 2;
      } else {
        if (sweep < 0) sweep += Math.PI * 2;
      }
      // Generate points along arc
      const segments = Math.max(12, Math.abs(Math.round(sweep / (Math.PI / 18))));
      const deltaZ = (z2 - z1) / segments;

      let prevX = x1, prevY = y1, prevZ = z1;

      for (let seg = 1; seg <= segments; seg++) {
        const t = seg / segments;
        const angle = startAngle + sweep * t;
        const newX = cx + radius * Math.cos(angle);
        const newY = cy + radius * Math.sin(angle);
        const newZ = z1 + deltaZ * seg;

        moves.push({
          type: 'arc',
          from: { x: prevX, y: prevY, z: prevZ },
          to: { x: newX, y: newY, z: newZ },
          feedRate,
          lineNumber,
          arcData: { center: { x: cx, y: cy }, radius, clockwise }
        });

        prevX = newX;
        prevY = newY;
        prevZ = newZ;
      }
      return moves;
    },
    _calculateStatistics(moves) {
      let rapidDistance = 0;
      let feedDistance = 0;
      let machiningTime = 0;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (const move of moves) {
        const dx = move.to.x - move.from.x;
        const dy = move.to.y - move.from.y;
        const dz = move.to.z - move.from.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (move.type === 'rapid') {
          rapidDistance += dist;
        } else {
          feedDistance += dist;
          if (move.feedRate > 0) {
            machiningTime += dist / move.feedRate;
          }
        }
        minX = Math.min(minX, move.from.x, move.to.x);
        maxX = Math.max(maxX, move.from.x, move.to.x);
        minY = Math.min(minY, move.from.y, move.to.y);
        maxY = Math.max(maxY, move.from.y, move.to.y);
        minZ = Math.min(minZ, move.from.z, move.to.z);
        maxZ = Math.max(maxZ, move.from.z, move.to.z);
      }
      return {
        totalMoves: moves.length,
        rapidDistance,
        feedDistance,
        totalDistance: rapidDistance + feedDistance,
        machiningTime,  // in minutes
        boundingBox: {
          min: { x: minX, y: minY, z: minZ },
          max: { x: maxX, y: maxY, z: maxZ }
        }
      };
    }
  },
  // VISUALIZATION ENGINE

  visualizer: {
    scene: null,
    camera: null,
    renderer: null,
    container: null,
    toolpathGroup: null,
    toolMesh: null,
    stockMesh: null,

    /**
     * Initialize Three.js visualization
     */
    init(containerId) {
      if (typeof THREE === 'undefined') {
        console.error('[BACKPLOT] Three.js not available');
        return false;
      }
      this.container = document.getElementById(containerId);
      if (!this.container) {
        console.error('[BACKPLOT] Container not found:', containerId);
        return false;
      }
      // Scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x1a1a2e);

      // Camera
      const aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 10000);
      this.camera.position.set(200, 200, 200);
      this.camera.lookAt(0, 0, 0);

      // Renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.container.appendChild(this.renderer.domElement);

      // Lights
      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      this.scene.add(ambient);

      const directional = new THREE.DirectionalLight(0xffffff, 0.7);
      directional.position.set(100, 200, 100);
      this.scene.add(directional);

      // Grid
      const grid = new THREE.GridHelper(500, 50, 0x4fc3f7, 0x222244);
      this.scene.add(grid);

      // Axes
      const axes = new THREE.AxesHelper(50);
      this.scene.add(axes);

      // Groups
      this.toolpathGroup = new THREE.Group();
      this.scene.add(this.toolpathGroup);

      // Create tool representation
      this._createToolMesh();

      // Controls (basic orbit)
      this._setupControls();

      // Start render loop
      this._animate();

      (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[BACKPLOT] Visualizer initialized');
      return true;
    },
    _createToolMesh() {
      // Simple tool representation (cylinder + cone)
      const toolGroup = new THREE.Group();

      // Shank
      const shankGeom = new THREE.CylinderGeometry(3, 3, 30, 16);
      const shankMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
      const shank = new THREE.Mesh(shankGeom, shankMat);
      shank.position.y = 20;
      toolGroup.add(shank);

      // Cutting end
      const cutGeom = new THREE.ConeGeometry(5, 15, 16);
      const cutMat = new THREE.MeshPhongMaterial({ color: 0xffaa00 });
      const cut = new THREE.Mesh(cutGeom, cutMat);
      cut.position.y = -2;
      cut.rotation.x = Math.PI;
      toolGroup.add(cut);

      // Holder
      const holderGeom = new THREE.CylinderGeometry(8, 8, 40, 16);
      const holderMat = new THREE.MeshPhongMaterial({ color: 0x555566 });
      const holder = new THREE.Mesh(holderGeom, holderMat);
      holder.position.y = 55;
      toolGroup.add(holder);

      this.toolMesh = toolGroup;
      this.scene.add(this.toolMesh);
    },
    _setupControls() {
      let isDragging = false;
      let previousMouse = { x: 0, y: 0 };

      this.renderer.domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMouse = { x: e.clientX, y: e.clientY };
      });

      this.renderer.domElement.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - previousMouse.x;
        const dy = e.clientY - previousMouse.y;

        // Orbit camera around origin
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(this.camera.position);
        spherical.theta -= dx * 0.01;
        spherical.phi += dy * 0.01;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

        this.camera.position.setFromSpherical(spherical);
        this.camera.lookAt(0, 0, 0);

        previousMouse = { x: e.clientX, y: e.clientY };
      });

      this.renderer.domElement.addEventListener('mouseup', () => isDragging = false);
      this.renderer.domElement.addEventListener('mouseleave', () => isDragging = false);

      this.renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.1 : 0.9;
        this.camera.position.multiplyScalar(factor);
      });
    },
    _animate() {
      requestAnimationFrame(() => this._animate());
      this.renderer.render(this.scene, this.camera);
    },
    /**
     * Render toolpath moves
     */
    renderToolpath(moves, options = {}) {
      // Clear previous
      while (this.toolpathGroup.children.length > 0) {
        this.toolpathGroup.remove(this.toolpathGroup.children[0]);
      }
      const rapidColor = options.rapidColor || 0x00ff00;
      const feedColor = options.feedColor || 0x4fc3f7;
      const arcColor = options.arcColor || 0xff00ff;

      // Create line segments for each move type
      const rapidPoints = [];
      const feedPoints = [];
      const arcPoints = [];

      for (const move of moves) {
        const from = new THREE.Vector3(move.from.x, move.from.z, move.from.y);
        const to = new THREE.Vector3(move.to.x, move.to.z, move.to.y);

        if (move.type === 'rapid') {
          rapidPoints.push(from, to);
        } else if (move.type === 'arc') {
          arcPoints.push(from, to);
        } else {
          feedPoints.push(from, to);
        }
      }
      // Create lines
      if (rapidPoints.length > 0) {
        const rapidGeom = new THREE.BufferGeometry().setFromPoints(rapidPoints);
        const rapidMat = new THREE.LineBasicMaterial({ color: rapidColor, linewidth: 1 });
        const rapidLines = new THREE.LineSegments(rapidGeom, rapidMat);
        this.toolpathGroup.add(rapidLines);
      }
      if (feedPoints.length > 0) {
        const feedGeom = new THREE.BufferGeometry().setFromPoints(feedPoints);
        const feedMat = new THREE.LineBasicMaterial({ color: feedColor, linewidth: 2 });
        const feedLines = new THREE.LineSegments(feedGeom, feedMat);
        this.toolpathGroup.add(feedLines);
      }
      if (arcPoints.length > 0) {
        const arcGeom = new THREE.BufferGeometry().setFromPoints(arcPoints);
        const arcMat = new THREE.LineBasicMaterial({ color: arcColor, linewidth: 2 });
        const arcLines = new THREE.LineSegments(arcGeom, arcMat);
        this.toolpathGroup.add(arcLines);
      }
      // Fit camera to toolpath
      if (moves.length > 0) {
        this._fitCameraToMoves(moves);
      }
    },
    _fitCameraToMoves(moves) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (const move of moves) {
        minX = Math.min(minX, move.from.x, move.to.x);
        maxX = Math.max(maxX, move.from.x, move.to.x);
        minY = Math.min(minY, move.from.y, move.to.y);
        maxY = Math.max(maxY, move.from.y, move.to.y);
        minZ = Math.min(minZ, move.from.z, move.to.z);
        maxZ = Math.max(maxZ, move.from.z, move.to.z);
      }
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;

      const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
      const distance = size * 2;

      this.camera.position.set(
        centerX + distance,
        centerZ + distance,
        centerY + distance
      );
      this.camera.lookAt(centerX, centerZ, centerY);
    },
    /**
     * Update tool position
     */
    updateToolPosition(x, y, z) {
      if (this.toolMesh) {
        this.toolMesh.position.set(x, z + 35, y);
      }
    },
    /**
     * Render progressive toolpath (for animation)
     */
    renderProgressiveToolpath(moves, upToIndex) {
      // Clear previous
      while (this.toolpathGroup.children.length > 0) {
        this.toolpathGroup.remove(this.toolpathGroup.children[0]);
      }
      const completedPoints = [];
      const currentPoints = [];

      for (let i = 0; i < Math.min(upToIndex, moves.length); i++) {
        const move = moves[i];
        const from = new THREE.Vector3(move.from.x, move.from.z, move.from.y);
        const to = new THREE.Vector3(move.to.x, move.to.z, move.to.y);

        if (i < upToIndex - 1) {
          completedPoints.push(from, to);
        } else {
          currentPoints.push(from, to);
        }
      }
      // Completed path
      if (completedPoints.length > 0) {
        const geom = new THREE.BufferGeometry().setFromPoints(completedPoints);
        const mat = new THREE.LineBasicMaterial({ color: 0x4fc3f7 });
        const lines = new THREE.LineSegments(geom, mat);
        this.toolpathGroup.add(lines);
      }
      // Current segment (highlighted)
      if (currentPoints.length > 0) {
        const geom = new THREE.BufferGeometry().setFromPoints(currentPoints);
        const mat = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 });
        const lines = new THREE.LineSegments(geom, mat);
        this.toolpathGroup.add(lines);

        // Update tool position to end of current segment
        const lastMove = moves[Math.min(upToIndex - 1, moves.length - 1)];
        if (lastMove) {
          this.updateToolPosition(lastMove.to.x, lastMove.to.y, lastMove.to.z);
        }
      }
    }
  },
  // ANIMATION CONTROLLER

  animator: {
    moves: [],
    currentFrame: 0,
    isPlaying: false,
    speed: 1.0,
    animationId: null,
    onUpdate: null,

    load(moves) {
      this.moves = moves;
      this.currentFrame = 0;
      this.isPlaying = false;
    },
    play() {
      if (this.moves.length === 0) return;
      this.isPlaying = true;
      this._tick();
    },
    pause() {
      this.isPlaying = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    },
    stop() {
      this.pause();
      this.currentFrame = 0;
      this._updateVisualization();
    },
    setSpeed(speed) {
      this.speed = speed;
    },
    seekTo(frame) {
      this.currentFrame = Math.max(0, Math.min(frame, this.moves.length));
      this._updateVisualization();
    },
    seekToPercent(percent) {
      this.seekTo(Math.floor(this.moves.length * percent / 100));
    },
    _tick() {
      if (!this.isPlaying) return;

      this.currentFrame += this.speed;

      if (this.currentFrame >= this.moves.length) {
        this.currentFrame = this.moves.length;
        this.isPlaying = false;
      }
      this._updateVisualization();

      if (this.isPlaying) {
        this.animationId = requestAnimationFrame(() => this._tick());
      }
    },
    _updateVisualization() {
      const vis = PRISM_GCODE_BACKPLOT_ENGINE.visualizer;
      vis.renderProgressiveToolpath(this.moves, Math.floor(this.currentFrame));

      if (this.onUpdate) {
        this.onUpdate({
          frame: Math.floor(this.currentFrame),
          total: this.moves.length,
          percent: (this.currentFrame / this.moves.length) * 100,
          currentMove: this.moves[Math.floor(this.currentFrame)]
        });
      }
    }
  },
  // MATERIAL REMOVAL SIMULATION (Voxel-based)

  materialRemoval: {
    grid: null,
    resolution: 1.0,  // mm per voxel
    stockDimensions: null,

    /**
     * Initialize voxel grid for stock
     */
    initializeStock(dimensions, resolution = 1.0) {
      this.resolution = resolution;
      this.stockDimensions = dimensions;

      const nx = Math.ceil(dimensions.x / resolution);
      const ny = Math.ceil(dimensions.y / resolution);
      const nz = Math.ceil(dimensions.z / resolution);

      // Create 3D grid (1 = material, 0 = removed)
      this.grid = new Uint8Array(nx * ny * nz);
      this.grid.fill(1);

      this.nx = nx;
      this.ny = ny;
      this.nz = nz;

      console.log(`[MATERIAL_REMOVAL] Initialized ${nx}x${ny}x${nz} voxel grid`);
      return this;
    },
    /**
     * Remove material along toolpath
     */
    simulateMove(move, toolRadius, toolLength) {
      if (!this.grid) return;

      const r = Math.ceil(toolRadius / this.resolution);
      const steps = Math.ceil(
        Math.sqrt(
          (move.to.x - move.from.x) ** 2 +
          (move.to.y - move.from.y) ** 2 +
          (move.to.z - move.from.z) ** 2
        ) / this.resolution
      );

      for (let s = 0; s <= steps; s++) {
        const t = steps > 0 ? s / steps : 0;
        const x = move.from.x + (move.to.x - move.from.x) * t;
        const y = move.from.y + (move.to.y - move.from.y) * t;
        const z = move.from.z + (move.to.z - move.from.z) * t;

        this._removeSpherical(x, y, z, toolRadius);
      }
    },
    _removeSpherical(cx, cy, cz, radius) {
      const r = Math.ceil(radius / this.resolution);
      const ix = Math.floor(cx / this.resolution);
      const iy = Math.floor(cy / this.resolution);
      const iz = Math.floor(cz / this.resolution);

      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dz = -r; dz <= 0; dz++) {  // Only remove downward from tool
            if (dx * dx + dy * dy + dz * dz <= r * r) {
              const gx = ix + dx;
              const gy = iy + dy;
              const gz = iz + dz;

              if (gx >= 0 && gx < this.nx &&
                  gy >= 0 && gy < this.ny &&
                  gz >= 0 && gz < this.nz) {
                const idx = gx + gy * this.nx + gz * this.nx * this.ny;
                this.grid[idx] = 0;
              }
            }
          }
        }
      }
    },
    /**
     * Generate mesh from current voxel state
     */
    generateMesh() {
      // Simple marching cubes or surface extraction
      // Simplified version - just show remaining voxels as boxes
      const vertices = [];
      const indices = [];

      let vertexCount = 0;

      for (let z = 0; z < this.nz; z++) {
        for (let y = 0; y < this.ny; y++) {
          for (let x = 0; x < this.nx; x++) {
            const idx = x + y * this.nx + z * this.nx * this.ny;
            if (this.grid[idx] === 1) {
              // Check if surface voxel (has at least one empty neighbor)
              if (this._isSurfaceVoxel(x, y, z)) {
                // Add cube vertices
                const px = x * this.resolution;
                const py = y * this.resolution;
                const pz = z * this.resolution;
                const s = this.resolution;

                // 8 vertices of cube
                vertices.push(
                  px, py, pz,
                  px + s, py, pz,
                  px + s, py + s, pz,
                  px, py + s, pz,
                  px, py, pz + s,
                  px + s, py, pz + s,
                  px + s, py + s, pz + s,
                  px, py + s, pz + s
                );

                // 12 triangles (6 faces)
                const base = vertexCount;
                indices.push(
                  base, base + 1, base + 2, base, base + 2, base + 3,  // bottom
                  base + 4, base + 6, base + 5, base + 4, base + 7, base + 6,  // top
                  base, base + 4, base + 5, base, base + 5, base + 1,  // front
                  base + 2, base + 6, base + 7, base + 2, base + 7, base + 3,  // back
                  base, base + 3, base + 7, base, base + 7, base + 4,  // left
                  base + 1, base + 5, base + 6, base + 1, base + 6, base + 2   // right
                );

                vertexCount += 8;
              }
            }
          }
        }
      }
      return { vertices: new Float32Array(vertices), indices };
    },
    _isSurfaceVoxel(x, y, z) {
      const neighbors = [
        [x - 1, y, z], [x + 1, y, z],
        [x, y - 1, z], [x, y + 1, z],
        [x, y, z - 1], [x, y, z + 1]
      ];

      for (const [nx, ny, nz] of neighbors) {
        if (nx < 0 || nx >= this.nx ||
            ny < 0 || ny >= this.ny ||
            nz < 0 || nz >= this.nz) {
          return true;  // Edge of grid
        }
        const idx = nx + ny * this.nx + nz * this.nx * this.ny;
        if (this.grid[idx] === 0) {
          return true;  // Has empty neighbor
        }
      }
      return false;
    }
  },
  // MAIN API

  /**
   * Parse G-code and generate backplot
   */
  loadGCode(gcode, options = {}) {
    const parseResult = this.parser.parse(gcode);
    this.moves = parseResult.moves;

    console.log(`[BACKPLOT] Parsed ${parseResult.moves.length} moves`);
    console.log(`[BACKPLOT] Machining time: ${parseResult.statistics.machiningTime.toFixed(2)} min`);

    return parseResult;
  },
  /**
   * Render the loaded toolpath
   */
  render(containerId) {
    if (!this.visualizer.scene) {
      this.visualizer.init(containerId);
    }
    this.visualizer.renderToolpath(this.moves);
    this.animator.load(this.moves);
  },
  /**
   * Start animation playback
   */
  play() {
    this.animator.play();
  },
  /**
   * Pause animation
   */
  pause() {
    this.animator.pause();
  },
  /**
   * Stop and reset animation
   */
  stop() {
    this.animator.stop();
  },
  /**
   * Set animation speed multiplier
   */
  setSpeed(speed) {
    this.animator.setSpeed(speed);
  },
  // INITIALIZATION

  init() {
    console.log('[GCODE_BACKPLOT_ENGINE] Initializing...');

    // Connect to existing systems
    if (typeof PRISM_REAL_TOOLPATH_ENGINE !== 'undefined') {
      PRISM_REAL_TOOLPATH_ENGINE.backplot = this;
      console.log('[GCODE_BACKPLOT_ENGINE] ✓ Connected to PRISM_REAL_TOOLPATH_ENGINE');
    }
    if (typeof POST_GENERATOR !== 'undefined') {
      POST_GENERATOR.backplot = this;
      console.log('[GCODE_BACKPLOT_ENGINE] ✓ Connected to POST_GENERATOR');
    }
    // Global access
    window.PRISM_GCODE_BACKPLOT_ENGINE = this;
    window.backplotGCode = (gcode) => this.loadGCode(gcode);

    console.log('[GCODE_BACKPLOT_ENGINE] ✓ Initialized');
    console.log('[GCODE_BACKPLOT_ENGINE]   - G-code parser: G0, G1, G2, G3, G17-19, G20/21, G90/91');
    console.log('[GCODE_BACKPLOT_ENGINE]   - Arc interpolation: R and IJK formats');
    console.log('[GCODE_BACKPLOT_ENGINE]   - Animation: play/pause/stop with speed control');
    console.log('[GCODE_BACKPLOT_ENGINE]   - Material removal: voxel-based simulation');

    return this;
  }
};
