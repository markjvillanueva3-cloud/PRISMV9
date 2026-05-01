const PRISM_CLIPBOARD = {
    async copy(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.cssText = 'position: fixed; left: -9999px;';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (error) {
            console.error('[PRISM_CLIPBOARD] Copy failed:', error);
            return false;
        }
    },
    
    async paste() {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                return await navigator.clipboard.readText();
            }
            return null;
        } catch (error) {
            console.error('[PRISM_CLIPBOARD] Paste failed:', error);
            return null;
        }
    },
    
    async copyHTML(html) {
        try {
            const blob = new Blob([html], { type: 'text/html' });
            const item = new ClipboardItem({ 'text/html': blob });
            await navigator.clipboard.write([item]);
            return true;
        } catch (error) {
            console.error('[PRISM_CLIPBOARD] Copy HTML failed:', error);
            return false;
        }
    },
    
    async copyImage(canvas) {
        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve));
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            return true;
        } catch (error) {
            console.error('[PRISM_CLIPBOARD] Copy image failed:', error);
            return false;
        }
    },
    
    // Copy with toast notification
    async copyWithFeedback(text, successMessage = 'Copied!') {
        const success = await this.copy(text);
        if (success && typeof PRISM_TOAST !== 'undefined') {
            PRISM_TOAST.success(successMessage);
        }
        return success;
    }
}