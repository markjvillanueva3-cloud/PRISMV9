const PRISM_DND = {
    // Make element draggable
    makeDraggable(element, options = {}) {
        const { handle = null, data = null, onStart, onEnd } = options;
        
        element.draggable = true;
        const handleEl = handle ? element.querySelector(handle) : element;
        
        handleEl.style.cursor = 'grab';
        
        element.addEventListener('dragstart', (e) => {
            element.classList.add('dragging');
            handleEl.style.cursor = 'grabbing';
            
            if (data) {
                e.dataTransfer.setData('application/json', JSON.stringify(data));
            }
            e.dataTransfer.setData('text/plain', element.id || '');
            e.dataTransfer.effectAllowed = 'move';
            
            onStart?.(e, element);
        });
        
        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
            handleEl.style.cursor = 'grab';
            onEnd?.(e, element);
        });
        
        return element;
    },
    
    // Make container a drop zone
    makeDropZone(container, options = {}) {
        const { accept = '*', onDrop, onDragOver, onDragEnter, onDragLeave } = options;
        
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            container.classList.add('drag-over');
            onDragOver?.(e);
        });
        
        container.addEventListener('dragenter', (e) => {
            e.preventDefault();
            container.classList.add('drag-over');
            onDragEnter?.(e);
        });
        
        container.addEventListener('dragleave', (e) => {
            if (!container.contains(e.relatedTarget)) {
                container.classList.remove('drag-over');
                onDragLeave?.(e);
            }
        });
        
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('drag-over');
            
            let data;
            try {
                data = JSON.parse(e.dataTransfer.getData('application/json'));
            } catch {
                data = e.dataTransfer.getData('text/plain');
            }
            
            onDrop?.(e, data);
        });
        
        return container;
    },
    
    // Sortable list
    makeSortable(container, options = {}) {
        const { itemSelector = '> *', handle = null, onSort } = options;
        let draggedItem = null;
        let placeholder = null;
        
        const items = () => Array.from(container.querySelectorAll(itemSelector));
        
        const createPlaceholder = (item) => {
            const ph = document.createElement('div');
            ph.className = 'sortable-placeholder';
            ph.style.cssText = `height: ${item.offsetHeight}px; background: #f0f0f0; border: 2px dashed #ccc;`;
            return ph;
        };
        
        items().forEach(item => {
            this.makeDraggable(item, {
                handle,
                onStart: () => {
                    draggedItem = item;
                    placeholder = createPlaceholder(item);
                    item.parentNode.insertBefore(placeholder, item.nextSibling);
                    item.style.opacity = '0.5';
                },
                onEnd: () => {
                    item.style.opacity = '';
                    if (placeholder && placeholder.parentNode) {
                        placeholder.parentNode.insertBefore(item, placeholder);
                        placeholder.remove();
                    }
                    placeholder = null;
                    
                    const newOrder = items().map(el => el.dataset.id || el.id);
                    onSort?.(newOrder);
                    draggedItem = null;
                }
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!draggedItem || item === draggedItem) return;
                
                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                
                if (e.clientY < midY) {
                    container.insertBefore(placeholder, item);
                } else {
                    container.insertBefore(placeholder, item.nextSibling);
                }
            });
        });
        
        return container;
    },
    
    // File drop zone
    makeFileDropZone(container, options = {}) {
        const { accept = '*', multiple = true, onFiles } = options;
        
        const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            container.addEventListener(event, preventDefaults);
        });
        
        container.addEventListener('dragenter', () => container.classList.add('file-drag-over'));
        container.addEventListener('dragleave', (e) => {
            if (!container.contains(e.relatedTarget)) {
                container.classList.remove('file-drag-over');
            }
        });
        
        container.addEventListener('drop', (e) => {
            container.classList.remove('file-drag-over');
            
            let files = Array.from(e.dataTransfer.files);
            
            if (accept !== '*') {
                const acceptList = accept.split(',').map(a => a.trim());
                files = files.filter(f => 
                    acceptList.some(a => {
                        if (a.startsWith('.')) return f.name.endsWith(a);
                        if (a.endsWith('/*')) return f.type.startsWith(a.slice(0, -1));
                        return f.type === a;
                    })
                );
            }
            
            if (!multiple) files = files.slice(0, 1);
            
            onFiles?.(files);
        });
        
        return container;
    }
}