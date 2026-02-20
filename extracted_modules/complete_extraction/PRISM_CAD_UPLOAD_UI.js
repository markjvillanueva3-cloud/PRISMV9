const PRISM_CAD_UPLOAD_UI = {

  /**
   * Create a CAD upload dropbox for a module
   */
  createDropbox(containerId, category, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('[CAD_UPLOAD_UI] Container not found:', containerId);
      return null;
    }
    const dropboxId = `cadDropbox_${category}_${Date.now()}`;
    const inputId = `cadInput_${category}_${Date.now()}`;

    const dropboxHTML = `
      <div id="${dropboxId}" class="cad-upload-dropbox" style="
        margin: 10px 0;
        padding: 15px;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08));
        border: 2px dashed rgba(99, 102, 241, 0.3);
        border-radius: 10px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
      " ondragover="PRISM_CAD_UPLOAD_UI.handleDragOver(event)"
         ondragleave="PRISM_CAD_UPLOAD_UI.handleDragLeave(event)"
         ondrop="PRISM_CAD_UPLOAD_UI.handleDrop(event, '${category}', ${JSON.stringify(options).replace(/"/g, "'")})">

        <div style="font-size: 28px; margin-bottom: 8px;">📦</div>
        <div style="font-size: 12px; font-weight: 600; color: #a5b4fc; margin-bottom: 4px;">
          ${options.title || 'Upload CAD Model to Train AI'}
        </div>
        <div style="font-size: 10px; color: #9ca3af; margin-bottom: 10px;">
          Drag & drop STEP, STL, or OBJ files here
        </div>

        <label for="${inputId}" style="
          display: inline-block;
          padding: 8px 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 6px;
          color: white;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">
          📁 Browse Files
        </label>
        <input type="file" id="${inputId}" accept=".step,.stp,.stl,.obj,.iges,.igs"
               style="display: none;"
               onchange="PRISM_CAD_UPLOAD_UI.handleFileSelect(event, '${category}', ${JSON.stringify(options).replace(/"/g, "'")})">

        <div id="${dropboxId}_status" style="margin-top: 10px; font-size: 10px; display: none;">
          <span class="status-text" style="color: #4ade80;">Processing...</span>
        </div>

        <div id="${dropboxId}_learned" style="margin-top: 8px; font-size: 10px; display: none;">
          <div style="color: #4ade80; font-weight: 600;">✓ Model Learned!</div>
          <div style="color: #9ca3af; margin-top: 4px;">
            <span id="${dropboxId}_confidence">Confidence: --</span>
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', dropboxHTML);
    return dropboxId;
  },
  handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.8)';
    event.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))';
  },
  handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
    event.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))';
  },
  async handleDrop(event, category, options) {
    event.preventDefault();
    event.stopPropagation();

    this.handleDragLeave(event);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      await this.processFile(files[0], category, options, event.currentTarget.id);
    }
  },
  async handleFileSelect(event, category, options) {
    const files = event.target.files;
    if (files.length > 0) {
      const dropboxId = event.target.id.replace('cadInput_', 'cadDropbox_');
      await this.processFile(files[0], category, options, dropboxId);
    }
  },
  async processFile(file, category, options, dropboxId) {
    console.log('[CAD_UPLOAD_UI] Processing:', file.name, 'for', category);

    // Show status
    const statusEl = document.getElementById(`${dropboxId}_status`);
    const learnedEl = document.getElementById(`${dropboxId}_learned`);

    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.querySelector('.status-text').textContent = 'Analyzing CAD geometry...';
    }
    try {
      // Use unified learning system
      if (typeof handleUnifiedCADUpload === 'function') {
        const metadata = {
          type: options.type || 'general',
          subtype: options.subtype || file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '_'),
          ...options
        };
        const result = await handleUnifiedCADUpload(file, category, metadata);

        if (result) {
          if (statusEl) statusEl.style.display = 'none';
          if (learnedEl) {
            learnedEl.style.display = 'block';
            const confEl = document.getElementById(`${dropboxId}_confidence`);
            if (confEl) {
              confEl.textContent = `Confidence: ${Math.round((result.confidence || 0.85) * 100)}%`;
            }
          }
          // Dispatch success event
          window.dispatchEvent(new CustomEvent('cadUploadSuccess', {
            detail: { category, file: file.name, result }
          }));

          console.log('[CAD_UPLOAD_UI] Successfully learned from:', file.name);
        } else {
          throw new Error('Could not extract geometry');
        }
      } else {
        throw new Error('Learning system not available');
      }
    } catch (e) {
      console.error('[CAD_UPLOAD_UI] Error:', e);
      if (statusEl) {
        statusEl.querySelector('.status-text').style.color = '#f87171';
        statusEl.querySelector('.status-text').textContent = 'Error: ' + e.message;
      }
    }
  }
}