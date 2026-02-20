const PRISM_3D_VISUALIZATION_PIPELINE = {
  version: '1.0.0',
  settings: { showFeatures: true, showDimensions: true, showToolpaths: true, highlightColor: 0x00ff00, selectionColor: 0xff6600, featureColors: { hole: 0xff0000, pocket: 0x00ff00, slot: 0x0000ff, boss: 0xffff00, thread: 0xff00ff }, quality: 'high' },
  components: { scene: null, camera: null, renderer: null, controls: null, lights: [], meshes: {}, helpers: [] },

  init() {
    console.log('[3D_VISUALIZATION_PIPELINE] v1.0 Initializing...');
    if (typeof scene !== 'undefined') this.components.scene = scene;
    if (typeof camera !== 'undefined') this.components.camera = camera;
    if (typeof renderer !== 'undefined') this.components.renderer = renderer;
    this._enhanceExistingSystems();
    window.PRISM_3D = this;
    window.show3DFeatures = (features) => this.visualizeFeatures(features);
    window.highlight3DFeature = (feature) => this.highlightFeature(feature);
    window.show3DToolpath = (toolpath) => this.visualizeToolpath(toolpath);
    console.log('[3D_VISUALIZATION_PIPELINE] v1.0 Ready');
    return this;
  },
  _enhanceExistingSystems() {
    if (typeof ULTIMATE_3D_MACHINE_SYSTEM !== 'undefined') { ULTIMATE_3D_MACHINE_SYSTEM.pipeline = this; console.log('[3D_VISUALIZATION_PIPELINE] ✓ Connected ULTIMATE_3D_MACHINE_SYSTEM'); }
    if (typeof PRISM_TOOL_3D_GENERATOR !== 'undefined') {
      PRISM_TOOL_3D_GENERATOR.materials = { carbide: { color: 0x606060, metalness: 0.8, roughness: 0.2 }, hss: { color: 0x808080, metalness: 0.7, roughness: 0.3 }, coating_tin: { color: 0xd4af37, metalness: 0.9, roughness: 0.1 }, coating_tialn: { color: 0x4a148c, metalness: 0.9, roughness: 0.15 }, coating_altin: { color: 0x1a237e, metalness: 0.85, roughness: 0.2 } };
      console.log('[3D_VISUALIZATION_PIPELINE] ✓ Enhanced PRISM_TOOL_3D_GENERATOR');
    }
  },
  visualizeFeatures(features) {
    if (!this.components.scene || typeof THREE === 'undefined') return;
    this.clearFeatureVisualizations();
    const featureGroup = new THREE.Group(); featureGroup.name = 'featureVisualization';
    for (const feature of features) { const mesh = this.createFeatureMesh(feature); if (mesh) { mesh.userData.feature = feature; featureGroup.add(mesh); } }
    this.components.scene.add(featureGroup); this.components.meshes.features = featureGroup;
    return featureGroup;
  },
  createFeatureMesh(feature) {
    if (typeof THREE === 'undefined') return null;
    const color = this.settings.featureColors[feature.type] || 0x999999;
    const material = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    let geometry;
    switch (feature.type) {
      case 'hole': geometry = new THREE.CylinderGeometry(feature.params?.diameter/2 || 0.25, feature.params?.diameter/2 || 0.25, feature.params?.depth || 1, 32); break;
      case 'pocket': geometry = new THREE.BoxGeometry(feature.params?.width || 1, feature.params?.depth || 0.5, feature.params?.length || 1); break;
      case 'slot': geometry = new THREE.BoxGeometry(feature.params?.length || 2, feature.params?.depth || 0.25, feature.params?.width || 0.5); break;
      case 'boss': geometry = new THREE.CylinderGeometry(feature.params?.diameter/2 || 0.5, feature.params?.diameter/2 || 0.5, feature.params?.height || 0.5, 32); break;
      default: geometry = new THREE.SphereGeometry(0.25, 16, 16);
    }
    const mesh = new THREE.Mesh(geometry, material);
    if (feature.position) mesh.position.set(feature.position.x || 0, feature.position.y || 0, feature.position.z || 0);
    return mesh;
  },
  highlightFeature(feature) {
    const featureGroup = this.components.meshes.features; if (!featureGroup) return;
    featureGroup.traverse(child => { if (child.isMesh && child.material) child.material.emissive = new THREE.Color(0x000000); });
    featureGroup.traverse(child => { if (child.isMesh && child.userData.feature === feature) child.material.emissive = new THREE.Color(this.settings.highlightColor); });
  },
  clearFeatureVisualizations() { if (this.components.meshes.features && this.components.scene) { this.components.scene.remove(this.components.meshes.features); this.components.meshes.features = null; } },

  visualizeToolpath(toolpath, options = {}) {
    if (!this.components.scene || typeof THREE === 'undefined') return;
    this.clearToolpathVisualization();
    const toolpathGroup = new THREE.Group(); toolpathGroup.name = 'toolpathVisualization';
    const rapidMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 1, transparent: true, opacity: 0.5 });
    const cuttingMaterial = new THREE.LineBasicMaterial({ color: options.color || 0x00ff00, linewidth: 2 });
    const rapidPoints = [], cuttingPoints = [];
    const moves = toolpath.moves || toolpath.points || toolpath;
    if (Array.isArray(moves)) {
      for (let i = 0; i < moves.length - 1; i++) {
        const p1 = moves[i], p2 = moves[i + 1];
        const v1 = new THREE.Vector3(p1.x, p1.z, p1.y), v2 = new THREE.Vector3(p2.x, p2.z, p2.y);
        if (p2.rapid || p2.isRapid) rapidPoints.push(v1, v2); else cuttingPoints.push(v1, v2);
      }
    }
    if (rapidPoints.length > 0) { const g = new THREE.BufferGeometry().setFromPoints(rapidPoints); toolpathGroup.add(new THREE.LineSegments(g, rapidMaterial)); }
    if (cuttingPoints.length > 0) { const g = new THREE.BufferGeometry().setFromPoints(cuttingPoints); toolpathGroup.add(new THREE.LineSegments(g, cuttingMaterial)); }
    this.components.scene.add(toolpathGroup); this.components.meshes.toolpath = toolpathGroup;
    return toolpathGroup;
  },
  clearToolpathVisualization() { if (this.components.meshes.toolpath && this.components.scene) { this.components.scene.remove(this.components.meshes.toolpath); this.components.meshes.toolpath = null; } },

  addEnhancedLighting() {
    if (!this.components.scene || typeof THREE === 'undefined') return;
    for (const light of this.components.lights) this.components.scene.remove(light); this.components.lights = [];
    const ambient = new THREE.AmbientLight(0x404040, 0.5); this.components.scene.add(ambient); this.components.lights.push(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8); keyLight.position.set(5, 10, 5); this.components.scene.add(keyLight); this.components.lights.push(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3); fillLight.position.set(-5, 5, -5); this.components.scene.add(fillLight); this.components.lights.push(fillLight);
  }
}