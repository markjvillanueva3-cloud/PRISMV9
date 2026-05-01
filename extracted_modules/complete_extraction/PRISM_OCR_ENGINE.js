const PRISM_OCR_ENGINE = {
  version: '1.0.0',
  tesseractLoaded: false,
  worker: null,

  // INITIALIZATION

  async init() {
    if (this.tesseractLoaded) return true;

    try {
      // Load Tesseract.js from CDN if not already loaded
      if (typeof Tesseract === 'undefined') {
        await this._loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js');
      }
      // Create worker
      this.worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            this._emitProgress(m.progress * 100);
          }
        }
      });

      this.tesseractLoaded = true;
      (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM OCR] Tesseract.js initialized successfully');
      return true;
    } catch (error) {
      console.error('[PRISM OCR] Failed to initialize:', error);
      return false;
    }
  },
  _loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },
  _emitProgress(percent) {
    if (typeof PRISM_MASTER_ORCHESTRATOR !== 'undefined') {
      PRISM_MASTER_ORCHESTRATOR.communicationHub.emit('ocr:progress', { percent }, 'ocr');
    }
  },
  // TEXT EXTRACTION

  async extractTextFromImage(imageSource) {
    if (!this.tesseractLoaded) {
      await this.init();
    }
    try {
      const result = await this.worker.recognize(imageSource);
      return this._processOCRResult(result);
    } catch (error) {
      console.error('[PRISM OCR] Text extraction failed:', error);
      return { success: false, error: error.message };
    }
  },
  async extractTextFromCanvas(canvas) {
    const dataUrl = canvas.toDataURL('image/png');
    return this.extractTextFromImage(dataUrl);
  },
  async extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = await this.extractTextFromImage(e.target.result);
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
  _processOCRResult(result) {
    const { data } = result;

    // Extract dimensions from text
    const dimensions = this._extractDimensions(data.text);

    // Extract tolerances
    const tolerances = this._extractTolerances(data.text);

    // Build word-level data with bounding boxes
    const words = data.words.map(word => ({
      text: word.text,
      confidence: word.confidence,
      bbox: word.bbox,
      baseline: word.baseline
    }));

    // Build line-level data
    const lines = data.lines.map(line => ({
      text: line.text,
      confidence: line.confidence,
      bbox: line.bbox
    }));

    return {
      success: true,
      fullText: data.text,
      confidence: data.confidence,
      dimensions,
      tolerances,
      words,
      lines,
      blocks: data.blocks?.length || 0
    };
  },
  // DIMENSION EXTRACTION

  _extractDimensions(text) {
    const dimensions = [];

    // Decimal dimensions: 1.500, 0.250, etc.
    const decimalPattern = /\b(\d+\.\d{1,4})\s*(?:"|in|mm)?\b/g;
    let match;
    while ((match = decimalPattern.exec(text)) !== null) {
      dimensions.push({
        value: parseFloat(match[1]),
        original: match[0],
        type: 'decimal',
        unit: match[0].includes('mm') ? 'mm' : 'inch'
      });
    }
    // Fractional dimensions: 1/2, 3/8, 1-1/2, etc.
    const fractionPattern = /\b(\d+)?-?(\d+)\/(\d+)\s*(?:"|in)?\b/g;
    while ((match = fractionPattern.exec(text)) !== null) {
      const whole = match[1] ? parseInt(match[1]) : 0;
      const num = parseInt(match[2]);
      const den = parseInt(match[3]);
      dimensions.push({
        value: whole + num / den,
        original: match[0],
        type: 'fraction',
        unit: 'inch'
      });
    }
    // Metric dimensions: 10mm, 25.4 mm, etc.
    const metricPattern = /\b(\d+(?:\.\d+)?)\s*mm\b/gi;
    while ((match = metricPattern.exec(text)) !== null) {
      dimensions.push({
        value: parseFloat(match[1]),
        original: match[0],
        type: 'metric',
        unit: 'mm'
      });
    }
    return dimensions;
  },
  _extractTolerances(text) {
    const tolerances = [];

    // Bilateral: ±0.005, +/- 0.001
    const bilateralPattern = /[±\+\-\/]+\s*(\d+\.\d+)/g;
    let match;
    while ((match = bilateralPattern.exec(text)) !== null) {
      tolerances.push({
        type: 'bilateral',
        value: parseFloat(match[1]),
        original: match[0]
      });
    }
    // Unilateral: +0.002/-0.000
    const unilateralPattern = /\+(\d+\.\d+)\s*\/\s*-(\d+\.\d+)/g;
    while ((match = unilateralPattern.exec(text)) !== null) {
      tolerances.push({
        type: 'unilateral',
        plus: parseFloat(match[1]),
        minus: parseFloat(match[2]),
        original: match[0]
      });
    }
    // Limit dimensions: 1.000/1.002
    const limitPattern = /(\d+\.\d+)\s*\/\s*(\d+\.\d+)/g;
    while ((match = limitPattern.exec(text)) !== null) {
      tolerances.push({
        type: 'limit',
        min: Math.min(parseFloat(match[1]), parseFloat(match[2])),
        max: Math.max(parseFloat(match[1]), parseFloat(match[2])),
        original: match[0]
      });
    }
    return tolerances;
  },
  // SPECIALIZED EXTRACTION

  extractThreadCallouts(text) {
    const threads = [];

    // UNC/UNF: 1/4-20 UNC, #10-32 UNF
    const uncPattern = /([#\d\/\-]+)-(\d+)\s*(UNC|UNF)?/gi;
    let match;
    while ((match = uncPattern.exec(text)) !== null) {
      threads.push({
        type: match[3] || 'UNC',
        size: match[1],
        tpi: parseInt(match[2]),
        original: match[0]
      });
    }
    // Metric: M6x1.0, M10
    const metricPattern = /M(\d+(?:\.\d+)?)(?:\s*[xX]\s*(\d+(?:\.\d+)?))?/g;
    while ((match = metricPattern.exec(text)) !== null) {
      threads.push({
        type: 'Metric',
        diameter: parseFloat(match[1]),
        pitch: match[2] ? parseFloat(match[2]) : null,
        original: match[0]
      });
    }
    // NPT: 1/4 NPT, 1/2-14 NPT
    const nptPattern = /([\d\/]+)(?:-(\d+))?\s*NPT/gi;
    while ((match = nptPattern.exec(text)) !== null) {
      threads.push({
        type: 'NPT',
        size: match[1],
        tpi: match[2] ? parseInt(match[2]) : null,
        original: match[0]
      });
    }
    return threads;
  },
  extractSurfaceFinishCallouts(text) {
    const finishes = [];

    // Ra values: Ra 32, Ra 0.8, Ra=1.6
    const raPattern = /Ra\s*[=:]?\s*(\d+(?:\.\d+)?)/gi;
    let match;
    while ((match = raPattern.exec(text)) !== null) {
      finishes.push({
        type: 'Ra',
        value: parseFloat(match[1]),
        original: match[0]
      });
    }
    // N-number: N4, N5, N6
    const nPattern = /\bN(\d+)\b/g;
    while ((match = nPattern.exec(text)) !== null) {
      finishes.push({
        type: 'N-number',
        value: parseInt(match[1]),
        original: match[0]
      });
    }
    // Microinch: 32 μin, 125 microinch
    const uinPattern = /(\d+)\s*(?:μin|µin|microinch)/gi;
    while ((match = uinPattern.exec(text)) !== null) {
      finishes.push({
        type: 'microinch',
        value: parseInt(match[1]),
        original: match[0]
      });
    }
    return finishes;
  },
  // CLEANUP

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.tesseractLoaded = false;
    }
  }
}