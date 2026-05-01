const PRISM_FILE_VALIDATION = {
  supportedTypes: {
    cad: ['.step', '.stp', '.iges', '.igs', '.stl', '.sldprt', '.x_t', '.sat', '.3dm'],
    drawing: ['.pdf', '.dxf', '.dwg'],
    image: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'],
    gcode: ['.nc', '.ngc', '.gcode', '.tap', '.mpf']
  },
  getSupportedExtensions() {
    return Object.values(this.supportedTypes).flat();
  },
  isSupported(filename) {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    return this.getSupportedExtensions().includes(ext);
  },
  getFileType(filename) {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    for (const [type, exts] of Object.entries(this.supportedTypes)) {
      if (exts.includes(ext)) return type;
    }
    return 'unknown';
  },
  validate(file) {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }
    if (!this.isSupported(file.name)) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      return {
        valid: false,
        error: `File type "${ext}" is not supported. Supported types: ${this.getSupportedExtensions().join(', ')}`
      };
    }
    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      return { valid: false, error: 'File size exceeds 100MB limit' };
    }
    return { valid: true, type: this.getFileType(file.name) };
  },
  init() {
    // Wrap existing file handlers with validation
    const originalHandlers = ['handleFileUpload', 'handleFileSelect', 'handleFileLoad'];

    originalHandlers.forEach(handlerName => {
      if (typeof window[handlerName] === 'function') {
        const original = window[handlerName];
        window[handlerName] = (event) => {
          const file = event?.target?.files?.[0] || event;
          if (file && file.name) {
            const validation = this.validate(file);
            if (!validation.valid) {
              if (typeof showToast === 'function') {
                showToast(validation.error, 'error');
              }
              console.error('[PRISM_FILE_VALIDATION]', validation.error);
              return;
            }
          }
          original(event);
        };
      }
    });

    console.log('[PRISM_FILE_VALIDATION] Initialized');
  }
}