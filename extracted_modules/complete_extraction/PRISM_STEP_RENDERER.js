const PRISM_STEP_RENDERER = {
  version: '1.0.0',

  /**
   * Create optimized Three.js scene from STEP data
   */
  async renderSTEP(stepData, container, options = {}) {
    if (typeof THREE === 'undefined') {
      console.error('[STEP_RENDERER] Three.js not loaded');
      return null;
    }
    // Get or create scene
    let scene, camera, renderer;

    if (options.scene) {
      scene = options.scene;
      camera = options.camera;
      renderer = options.renderer;
    } else {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(options.background || 0x1a1a2e);

      const aspect = container.clientWidth / container.clientHeight;
      camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 10000);
      camera.position.set(200, 200, 200);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const dir = new THREE.DirectionalLight(0xffffff, 0.7);
      dir.position.set(200, 300, 200);
      scene.add(dir);
    }
    // Convert STEP to mesh
    const meshResult = PRISM_STEP_TO_MESH_KERNEL.convertToMesh(stepData, {
      divisions: options.divisions || 24
    });

    if (!meshResult.success) {
      console.error('[STEP_RENDERER] Conversion failed:', meshResult.errors);
      return null;
    }
    // Create Three.js group
    const group = PRISM_STEP_TO_MESH_KERNEL.createThreeGroup(meshResult, {
      color: options.color || 0x888899
    });

    scene.add(group);

    // Fit camera
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    camera.position.set(
      center.x + maxDim * 1.5,
      center.y + maxDim * 1.5,
      center.z + maxDim * 1.5
    );
    camera.lookAt(center);

    // Setup controls
    this._setupControls(renderer.domElement, camera, center);

    // Animate
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return {
      scene,
      camera,
      renderer,
      group,
      meshResult
    };
  },
  _setupControls(domElement, camera, center) {
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    domElement.addEventListener('mousedown', e => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    });

    domElement.addEventListener('mousemove', e => {
      if (!isDragging) return;

      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;

      const spherical = new THREE.Spherical();
      const offset = camera.position.clone().sub(center);
      spherical.setFromVector3(offset);

      spherical.theta -= dx * 0.01;
      spherical.phi += dy * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

      offset.setFromSpherical(spherical);
      camera.position.copy(center).add(offset);
      camera.lookAt(center);

      prevMouse = { x: e.clientX, y: e.clientY };
    });

    domElement.addEventListener('mouseup', () => isDragging = false);
    domElement.addEventListener('mouseleave', () => isDragging = false);

    domElement.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const offset = camera.position.clone().sub(center);
      offset.multiplyScalar(factor);
      camera.position.copy(center).add(offset);
    });
  }
}