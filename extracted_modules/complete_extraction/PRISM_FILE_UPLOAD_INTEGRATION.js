const PRISM_FILE_UPLOAD_INTEGRATION = {
  version: '1.0.0',

  init() {
    console.log('[FILE_UPLOAD_INTEGRATION] v1.0 Initializing...');

    if (typeof extractFromImage === 'function') window._originalExtractFromImage = extractFromImage;
    window.extractFromImage = async function() {
      console.log('[FILE_UPLOAD_INTEGRATION] Processing image...');
      const fileInput = document.querySelector('input[type="file"]');
      const file = fileInput?.files?.[0];
      if (!file) { alert('Please select an image file first.'); return; }

      const statusEl = document.getElementById('processingStatus') || document.createElement('div');
      statusEl.id = 'processingStatus';
      statusEl.innerHTML = '<div style="padding:10px;background:#3b82f6;color:white;border-radius:4px;position:fixed;top:10px;right:10px;z-index:9999;">PRISM AI is analyzing the image...</div>';
      document.body.appendChild(statusEl);

      try {
        let result;
        if (typeof PRISM_ENHANCED_MASTER_ORCHESTRATOR !== 'undefined') result = await PRISM_ENHANCED_MASTER_ORCHESTRATOR.processFile(file, { enableOCR: true, generate3D: true });
        else if (typeof ADVANCED_PRINT_READING_ENGINE !== 'undefined') result = await ADVANCED_PRINT_READING_ENGINE.analyze(file);
        if (result) {
          PRISM_FILE_UPLOAD_INTEGRATION.applyExtractionResults(result);
          statusEl.innerHTML = '<div style="padding:10px;background:#10b981;color:white;border-radius:4px;position:fixed;top:10px;right:10px;z-index:9999;">✓ Analysis complete! Dimensions extracted.</div>';
        }
        setTimeout(() => statusEl.remove(), 3000);
      } catch (error) {
        statusEl.innerHTML = '<div style="padding:10px;background:#ef4444;color:white;border-radius:4px;position:fixed;top:10px;right:10px;z-index:9999;">Error: ' + error.message + '</div>';
        setTimeout(() => statusEl.remove(), 5000);
      }
    };
    if (typeof extractFromPdf === 'function') window._originalExtractFromPdf = extractFromPdf;
    window.extractFromPdf = async function() {
      console.log('[FILE_UPLOAD_INTEGRATION] Processing PDF...');
      const fileInput = document.querySelector('input[type="file"]');
      const file = fileInput?.files?.[0];
      if (!file) { alert('Please select a PDF file first.'); return; }

      const statusEl = document.getElementById('processingStatus') || document.createElement('div');
      statusEl.id = 'processingStatus';
      statusEl.innerHTML = '<div style="padding:10px;background:#3b82f6;color:white;border-radius:4px;position:fixed;top:10px;right:10px;z-index:9999;">PRISM AI is analyzing the PDF...</div>';
      document.body.appendChild(statusEl);

      try {
        let result;
        if (typeof PRISM_ENHANCED_MASTER_ORCHESTRATOR !== 'undefined') result = await PRISM_ENHANCED_MASTER_ORCHESTRATOR.processFile(file, { enableOCR: true, generate3D: true });
        else if (typeof ADVANCED_PRINT_READING_ENGINE !== 'undefined') result = await ADVANCED_PRINT_READING_ENGINE.analyze(file);
        if (result) {
          PRISM_FILE_UPLOAD_INTEGRATION.applyExtractionResults(result);
          statusEl.innerHTML = '<div style="padding:10px;background:#10b981;color:white;border-radius:4px;position:fixed;top:10px;right:10px;z-index:9999;">✓ PDF analysis complete!</div>';
        }
        setTimeout(() => statusEl.remove(), 3000);
      } catch (error) {
        statusEl.innerHTML = '<div style="padding:10px;background:#ef4444;color:white;border-radius:4px;position:fixed;top:10px;right:10px;z-index:9999;">Error: ' + error.message + '</div>';
        setTimeout(() => statusEl.remove(), 5000);
      }
    };
    console.log('[FILE_UPLOAD_INTEGRATION] v1.0 Ready');
  },
  applyExtractionResults(result) {
    console.log('[FILE_UPLOAD_INTEGRATION] Applying extraction results...');
    let dimensions = null;
    if (result.results?.extraction?.boundingBox) dimensions = result.results.extraction.boundingBox;
    else if (result.results?.extraction?.dimensions?.length >= 3) {
      dimensions = { x: result.results.extraction.dimensions[0]?.value, y: result.results.extraction.dimensions[1]?.value, z: result.results.extraction.dimensions[2]?.value };
    } else if (result.boundingBox) dimensions = result.boundingBox;

    if (dimensions) {
      const dimX = document.getElementById('modelDimX'), dimY = document.getElementById('modelDimY'), dimZ = document.getElementById('modelDimZ');
      if (dimX) dimX.textContent = (dimensions.x || 0).toFixed(3) + '"';
      if (dimY) dimY.textContent = (dimensions.y || 0).toFixed(3) + '"';
      if (dimZ) dimZ.textContent = (dimensions.z || 0).toFixed(3) + '"';
      if (typeof modelBounds !== 'undefined') { modelBounds.x = dimensions.x || modelBounds.x; modelBounds.y = dimensions.y || modelBounds.y; modelBounds.z = dimensions.z || modelBounds.z; }
      if (typeof updateViewerStock === 'function') updateViewerStock();
      if (typeof createModelMesh === 'function') createModelMesh(dimensions.x, dimensions.y, dimensions.z);
      console.log('[FILE_UPLOAD_INTEGRATION] Applied dimensions:', dimensions);
    }
    if (result.results?.surfaceFinish?.finishes?.length > 0) {
      const surfaceFinish = result.results.surfaceFinish.finishes[0];
      const finishInput = document.getElementById('surfaceFinish') || document.getElementById('finishRa');
      if (finishInput && surfaceFinish.ra) { finishInput.value = surfaceFinish.ra; console.log('[FILE_UPLOAD_INTEGRATION] Applied surface finish:', surfaceFinish.ra); }
    }
    if (typeof PRISM_EVENT_MANAGER !== 'undefined') PRISM_EVENT_MANAGER.emit('file:processed', result);
  }
}