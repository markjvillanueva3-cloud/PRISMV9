const PRISM_POST_PROCESSOR_UI = {

  /**
   * Render the post processor selection and download panel
   */
  renderPanel() {
    const machines = PRISM_POST_PROCESSOR_GENERATOR.getAvailableMachines();

    return `
    <div id="prismPostGeneratorPanel" style="
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 12px;
      padding: 24px;
      margin: 20px 0;
    ">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
        <div style="
          width: 48px; height: 48px;
          background: linear-gradient(135deg, #10b981, #3b82f6);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
        ">⚙️</div>
        <div>
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text);">
            Post Processor Generator
          </h3>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-muted);">
            Generate optimized, machine-specific post processors
          </p>
        </div>
        <div style="margin-left: auto; background: rgba(16, 185, 129, 0.2); padding: 4px 12px; border-radius: 20px;">
          <span style="color: #10b981; font-size: 11px; font-weight: 600;">✓ ${machines.length} MACHINES AVAILABLE</span>
        </div>
      </div>

      <!-- Machine Selection Grid -->
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      ">
        ${machines.map(m => this._renderMachineCard(m)).join('')}
      </div>

      <!-- Quick Actions -->
      <div style="
        display: flex;
        gap: 12px;
        padding-top: 16px;
        border-top: 1px solid var(--border);
      ">
        <button onclick="PRISM_POST_PROCESSOR_UI.downloadAll()" style="
          padding: 10px 20px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          📦 Download All Posts (.zip)
        </button>
        <button onclick="PRISM_POST_PROCESSOR_UI.showRequestForm()" style="
          padding: 10px 20px;
          background: rgba(255,255,255,0.1);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-size: 13px;
          cursor: pointer;
        ">
          + Request New Machine
        </button>
      </div>
    </div>
    `;
  },
  _renderMachineCard(machine) {
    const typeColors = {
      'mill': '#3b82f6',
      'mill_turn': '#8b5cf6',
      'lathe': '#f59e0b'
    };
    const color = typeColors[machine.type] || '#6b7280';

    const axisLabel = machine.axes === 5 ? '5-Axis' :
                      machine.axes === 9 ? 'Multi-Task' :
                      `${machine.axes}-Axis`;

    return `
    <div class="post-machine-card" style="
      background: var(--bg-dark);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      transition: all 0.2s;
      cursor: pointer;
    " onclick="PRISM_POST_PROCESSOR_UI.selectMachine('${machine.id}')"
       onmouseover="this.style.borderColor='${color}'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'"
       onmouseout="this.style.borderColor='var(--border)'; this.style.boxShadow='none'">

      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <div style="font-size: 14px; font-weight: 700; color: var(--text);">${machine.name}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${machine.manufacturer}</div>
        </div>
        <div style="
          background: ${color}20;
          color: ${color};
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        ">${axisLabel}</div>
      </div>

      <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
        <strong>Control:</strong> ${machine.control}
      </div>

      <div style="display: flex; gap: 8px;">
        <button onclick="event.stopPropagation(); PRISM_POST_PROCESSOR_UI.downloadPost('${machine.id}')" style="
          flex: 1;
          padding: 8px 12px;
          background: linear-gradient(135deg, ${color}, ${color}dd);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        ">
          ⬇️ Download .cps
        </button>
        <button onclick="event.stopPropagation(); PRISM_POST_PROCESSOR_UI.previewPost('${machine.id}')" style="
          padding: 8px 12px;
          background: rgba(255,255,255,0.1);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 11px;
          cursor: pointer;
        ">
          👁️
        </button>
      </div>
    </div>
    `;
  },
  /**
   * Download post processor for a machine
   */
  downloadPost(machineId) {
    console.log('[POST_UI] Downloading post for:', machineId);

    const result = PRISM_POST_PROCESSOR_GENERATOR.downloadPostProcessor(machineId);

    if (result.success) {
      this.showNotification(`Downloaded ${result.filename}`, 'success');
    } else {
      this.showNotification(`Failed: ${result.error}`, 'error');
    }
    return result;
  },
  /**
   * Preview post processor code
   */
  previewPost(machineId) {
    const result = PRISM_POST_PROCESSOR_GENERATOR.generatePostProcessor(machineId);

    if (!result.success) {
      alert('Failed to generate preview: ' + result.error);
      return;
    }
    // Show preview modal
    const modal = document.createElement('div');
    modal.id = 'postPreviewModal';
    modal.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    `;

    modal.innerHTML = `
      <div style="
        background: var(--bg-dark, #1a1a2e);
        border-radius: 12px;
        width: 100%;
        max-width: 900px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      ">
        <div style="
          padding: 16px 20px;
          border-bottom: 1px solid var(--border, #333);
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div>
            <h3 style="margin: 0; color: var(--text, #fff); font-size: 16px;">${result.filename}</h3>
            <p style="margin: 4px 0 0 0; color: var(--text-muted, #888); font-size: 12px;">
              ${result.machineName} • ${result.lineCount} lines
            </p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="PRISM_POST_PROCESSOR_UI.copyPostCode('${machineId}')" style="
              padding: 8px 16px;
              background: rgba(255,255,255,0.1);
              border: 1px solid var(--border, #333);
              border-radius: 6px;
              color: var(--text, #fff);
              cursor: pointer;
              font-size: 12px;
            ">📋 Copy</button>
            <button onclick="PRISM_POST_PROCESSOR_UI.downloadPost('${machineId}')" style="
              padding: 8px 16px;
              background: #10b981;
              border: none;
              border-radius: 6px;
              color: white;
              cursor: pointer;
              font-size: 12px;
              font-weight: 600;
            ">⬇️ Download</button>
            <button onclick="document.getElementById('postPreviewModal').remove()" style="
              padding: 8px 12px;
              background: transparent;
              border: none;
              color: var(--text-muted, #888);
              cursor: pointer;
              font-size: 18px;
            ">✕</button>
          </div>
        </div>
        <pre style="
          flex: 1;
          overflow: auto;
          margin: 0;
          padding: 16px;
          background: #0d0d1a;
          color: #e0e0e0;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 11px;
          line-height: 1.5;
        ">${this._escapeHtml(result.content)}</pre>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  },
  /**
   * Copy post code to clipboard
   */
  copyPostCode(machineId) {
    const result = PRISM_POST_PROCESSOR_GENERATOR.generatePostProcessor(machineId);

    if (result.success) {
      navigator.clipboard.writeText(result.content).then(() => {
        this.showNotification('Copied to clipboard!', 'success');
      });
    }
  },
  /**
   * Download all posts as ZIP
   */
  async downloadAll() {
    this.showNotification('Generating all post processors...', 'info');

    // Check if JSZip is available, if not load it
    if (typeof JSZip === 'undefined') {
      await this._loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    }
    const zip = new JSZip();
    const machines = PRISM_POST_PROCESSOR_GENERATOR.getAvailableMachines();

    for (const machine of machines) {
      const result = PRISM_POST_PROCESSOR_GENERATOR.generatePostProcessor(machine.id);
      if (result.success) {
        zip.file(result.filename, result.content);
      }
    }
    // Add README
    zip.file('README.txt', this._generateReadme(machines));

    // Generate and download
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'prism_post_processors.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification(`Downloaded ${machines.length} post processors`, 'success');
  },
  _generateReadme(machines) {
    return `PRISM OPTIMIZED POST PROCESSORS
================================

Generated: ${new Date().toISOString()}
Generator: PRISM Manufacturing Intelligence v8.9.290

INCLUDED POST PROCESSORS:
${machines.map(m => `- ${m.name} (${m.control})`).join('\n')}

INSTALLATION:

Autodesk Fusion 360:
  Copy .cps files to: %APPDATA%\\Autodesk\\Fusion 360 CAM\\Posts

Mastercam:
  Copy to: C:\\Mastercam\\mill\\posts

PowerMill:
  Copy to: C:\\Users\\Public\\Documents\\Autodesk\\PowerMill\\Posts

SUPPORT:
https://prism-manufacturing.com/support
`;
  },
  /**
   * Show machine request form
   */
  showRequestForm() {
    const modal = document.createElement('div');
    modal.id = 'requestMachineModal';
    modal.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    `;

    modal.innerHTML = `
      <div style="
        background: var(--bg-dark, #1a1a2e);
        border-radius: 12px;
        padding: 24px;
        width: 100%;
        max-width: 500px;
      ">
        <h3 style="margin: 0 0 16px 0; color: var(--text, #fff);">Request New Machine</h3>
        <p style="color: var(--text-muted, #888); font-size: 13px; margin-bottom: 20px;">
          We'll add your machine to our database. Please provide as much detail as possible.
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <input type="text" id="reqMachineName" placeholder="Machine Name (e.g., DMG MORI DMU 50)" style="
            padding: 10px 12px;
            background: var(--bg, #0d0d1a);
            border: 1px solid var(--border, #333);
            border-radius: 6px;
            color: var(--text, #fff);
            font-size: 13px;
          ">
          <input type="text" id="reqManufacturer" placeholder="Manufacturer" style="
            padding: 10px 12px;
            background: var(--bg, #0d0d1a);
            border: 1px solid var(--border, #333);
            border-radius: 6px;
            color: var(--text, #fff);
            font-size: 13px;
          ">
          <input type="text" id="reqController" placeholder="Controller (e.g., Siemens 840D, Fanuc 31i)" style="
            padding: 10px 12px;
            background: var(--bg, #0d0d1a);
            border: 1px solid var(--border, #333);
            border-radius: 6px;
            color: var(--text, #fff);
            font-size: 13px;
          ">
          <textarea id="reqNotes" placeholder="Additional notes (axes, special features, etc.)" rows="3" style="
            padding: 10px 12px;
            background: var(--bg, #0d0d1a);
            border: 1px solid var(--border, #333);
            border-radius: 6px;
            color: var(--text, #fff);
            font-size: 13px;
            resize: vertical;
          "></textarea>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 20px;">
          <button onclick="PRISM_POST_PROCESSOR_UI.submitRequest()" style="
            flex: 1;
            padding: 12px;
            background: #10b981;
            border: none;
            border-radius: 6px;
            color: white;
            font-weight: 600;
            cursor: pointer;
          ">Submit Request</button>
          <button onclick="document.getElementById('requestMachineModal').remove()" style="
            padding: 12px 20px;
            background: transparent;
            border: 1px solid var(--border, #333);
            border-radius: 6px;
            color: var(--text, #fff);
            cursor: pointer;
          ">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  },
  submitRequest() {
    const name = document.getElementById('reqMachineName')?.value;
    const manufacturer = document.getElementById('reqManufacturer')?.value;
    const controller = document.getElementById('reqController')?.value;
    const notes = document.getElementById('reqNotes')?.value;

    if (!name || !controller) {
      alert('Please provide at least the machine name and controller.');
      return;
    }
    // Store request (in real implementation, would send to server)
    console.log('[POST_UI] Machine request:', { name, manufacturer, controller, notes });

    document.getElementById('requestMachineModal')?.remove();
    this.showNotification('Request submitted! We\'ll add this machine soon.', 'success');
  },
  selectMachine(machineId) {
    // Highlight selected machine
    document.querySelectorAll('.post-machine-card').forEach(card => {
      card.style.borderColor = 'var(--border)';
    });
    event.currentTarget.style.borderColor = '#10b981';
  },
  showNotification(message, type = 'info') {
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6'
    };
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      z-index: 10001;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  async _loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },
  /**
   * Initialize and inject into page
   */
  init() {
    console.log('[PRISM_POST_PROCESSOR_UI] Initializing...');

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    window.PRISM_POST_PROCESSOR_UI = this;

    console.log('[PRISM_POST_PROCESSOR_UI] Ready');
  }
}