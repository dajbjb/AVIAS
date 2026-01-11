/**
 * PHOTO EDITOR - "Dual Studio"
 * Mobile-first photo editing with AI features
 */

class PhotoEditor {
    constructor() {
        // Elements
        this.screen = document.getElementById('photo-editor-screen');
        this.canvas = document.getElementById('editor-canvas');
        this.drawingCanvas = document.getElementById('editor-drawing-canvas');
        this.ctx = this.canvas?.getContext('2d');
        this.drawCtx = this.drawingCanvas?.getContext('2d');
        this.toolsPanel = document.querySelector('.editor-tools-panel');
        this.loadingOverlay = document.querySelector('.editor-loading-overlay');

        // State
        this.originalImage = null;
        this.currentImage = null;
        this.history = [];
        this.historyIndex = -1;
        this.isDrawing = false;
        this.currentTool = null;
        this.brushColor = '#ffffff';
        this.brushSize = 5;

        // Adjustments
        this.adjustments = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            warmth: 0
        };

        this.bindEvents();
        console.log('PhotoEditor: Initialized');
    }

    bindEvents() {
        // Back Button
        document.getElementById('editor-back-btn')?.addEventListener('click', () => this.close());

        // Save Button
        document.getElementById('editor-save-btn')?.addEventListener('click', () => this.save());

        // Mode Tabs
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchMode(tab.dataset.mode));
        });

        // Creative Tools
        document.querySelectorAll('.creative-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectCreativeTool(btn.dataset.tool));
        });

        // AI Tools
        document.querySelectorAll('.ai-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectAITool(btn.dataset.tool));
        });

        // AI Suggestions
        document.querySelectorAll('.ai-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => this.applyAISuggestion(btn.dataset.action));
        });

        // Brush Options
        document.querySelectorAll('.brush-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.brush-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        document.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.brushColor = btn.dataset.color;
            });
        });

        document.getElementById('brush-size-slider')?.addEventListener('input', (e) => {
            this.brushSize = e.target.value;
            document.getElementById('brush-size-display').textContent = `${this.brushSize}px`;
        });

        // Stickers
        document.querySelectorAll('.sticker-item').forEach(sticker => {
            sticker.addEventListener('click', () => this.addSticker(sticker.textContent));
        });

        // Adjustment Sliders
        ['brightness', 'contrast', 'saturation', 'warmth'].forEach(adj => {
            const slider = document.getElementById(`adjust-${adj}`);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    this.adjustments[adj] = parseInt(e.target.value);
                    document.getElementById(`${adj}-value`).textContent = e.target.value;
                    this.applyAdjustments();
                });
            }
        });

        // AI Prompt
        document.getElementById('ai-prompt-submit')?.addEventListener('click', () => this.processAIPrompt());

        // Undo/Redo
        document.getElementById('editor-undo-btn')?.addEventListener('click', () => this.undo());
        document.getElementById('editor-redo-btn')?.addEventListener('click', () => this.redo());

        // Drawing Events
        this.bindDrawingEvents();
    }

    bindDrawingEvents() {
        if (!this.drawingCanvas) return;

        const getPos = (e) => {
            const rect = this.drawingCanvas.getBoundingClientRect();
            const touch = e.touches ? e.touches[0] : e;
            return {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
        };

        this.drawingCanvas.addEventListener('mousedown', (e) => this.startDraw(getPos(e)));
        this.drawingCanvas.addEventListener('mousemove', (e) => this.draw(getPos(e)));
        this.drawingCanvas.addEventListener('mouseup', () => this.endDraw());
        this.drawingCanvas.addEventListener('mouseleave', () => this.endDraw());

        this.drawingCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDraw(getPos(e));
        });
        this.drawingCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(getPos(e));
        });
        this.drawingCanvas.addEventListener('touchend', () => this.endDraw());
    }

    // ========================================
    // CORE FUNCTIONS
    // ========================================

    open(imageData) {
        if (!this.screen || !this.canvas || !this.ctx) return;

        this.screen.classList.add('active');
        this.showToolbar();

        const img = new Image();
        img.onload = () => {
            this.originalImage = img;
            this.currentImage = img;

            // Set canvas size
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.drawingCanvas.width = img.width;
            this.drawingCanvas.height = img.height;

            // Draw image
            this.ctx.drawImage(img, 0, 0);

            // Save to history
            this.saveState();
        };
        img.src = imageData;

        // Hide main nav
        document.getElementById('main-nav').style.display = 'none';
    }

    close() {
        this.screen?.classList.remove('active');
        this.hideToolbar();

        // Show main nav
        document.getElementById('main-nav').style.display = 'flex';

        // Clear
        this.history = [];
        this.historyIndex = -1;
    }

    save() {
        this.showLoading();

        // Merge canvases
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = this.canvas.width;
        finalCanvas.height = this.canvas.height;
        const finalCtx = finalCanvas.getContext('2d');

        finalCtx.drawImage(this.canvas, 0, 0);
        finalCtx.drawImage(this.drawingCanvas, 0, 0);

        const dataURL = finalCanvas.toDataURL('image/jpeg', 0.9);

        // Download or upload
        setTimeout(() => {
            this.hideLoading();

            // Create download link
            const link = document.createElement('a');
            link.download = `kingdom_edit_${Date.now()}.jpg`;
            link.href = dataURL;
            link.click();

            // Close editor after save
            this.close();
        }, 500);
    }

    // ========================================
    // TOOLBAR VISIBILITY
    // ========================================

    showToolbar() {
        this.toolsPanel?.classList.remove('hidden');
    }

    hideToolbar() {
        this.toolsPanel?.classList.add('hidden');
    }

    toggleToolbar() {
        this.toolsPanel?.classList.toggle('hidden');
    }

    // ========================================
    // MODE SWITCHING
    // ========================================

    switchMode(mode) {
        // Update tabs
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        // Update panels
        document.querySelectorAll('.tools-container').forEach(panel => {
            panel.classList.remove('active');
        });

        if (mode === 'creative') {
            document.getElementById('creative-tools')?.classList.add('active');
        } else {
            document.getElementById('ai-tools')?.classList.add('active');
        }

        // Hide sub panels
        document.querySelectorAll('.sub-tools-panel').forEach(p => p.classList.remove('active'));
    }

    // ========================================
    // CREATIVE TOOLS
    // ========================================

    selectCreativeTool(tool) {
        // Toggle button active state
        document.querySelectorAll('.creative-tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        // Hide all sub panels first
        document.querySelectorAll('.sub-tools-panel').forEach(p => p.classList.remove('active'));

        this.currentTool = tool;

        switch (tool) {
            case 'draw':
                document.getElementById('draw-options')?.classList.add('active');
                this.drawingCanvas?.classList.add('drawing-active');
                break;
            case 'stickers':
                document.getElementById('stickers-options')?.classList.add('active');
                this.drawingCanvas?.classList.remove('drawing-active');
                break;
            case 'adjust':
                document.getElementById('adjust-options')?.classList.add('active');
                this.drawingCanvas?.classList.remove('drawing-active');
                break;
            default:
                this.drawingCanvas?.classList.remove('drawing-active');
        }
    }

    // ========================================
    // DRAWING
    // ========================================

    startDraw(pos) {
        if (this.currentTool !== 'draw') return;
        this.isDrawing = true;
        this.drawCtx.beginPath();
        this.drawCtx.moveTo(pos.x, pos.y);
        this.drawCtx.strokeStyle = this.brushColor;
        this.drawCtx.lineWidth = this.brushSize;
        this.drawCtx.lineCap = 'round';
        this.drawCtx.lineJoin = 'round';
    }

    draw(pos) {
        if (!this.isDrawing) return;
        this.drawCtx.lineTo(pos.x, pos.y);
        this.drawCtx.stroke();
    }

    endDraw() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.saveState();
        }
    }

    // ========================================
    // STICKERS
    // ========================================

    addSticker(emoji) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.drawCtx.font = '80px sans-serif';
        this.drawCtx.textAlign = 'center';
        this.drawCtx.textBaseline = 'middle';
        this.drawCtx.fillText(emoji, centerX, centerY);

        this.saveState();
    }

    // ========================================
    // ADJUSTMENTS
    // ========================================

    applyAdjustments() {
        if (!this.originalImage) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply CSS filters
        const brightness = 100 + this.adjustments.brightness;
        const contrast = 100 + this.adjustments.contrast;
        const saturate = 100 + this.adjustments.saturation;
        const sepia = this.adjustments.warmth > 0 ? this.adjustments.warmth : 0;

        this.ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) sepia(${sepia}%)`;
        this.ctx.drawImage(this.originalImage, 0, 0);
        this.ctx.filter = 'none';
    }

    // ========================================
    // AI FEATURES (Placeholders)
    // ========================================

    selectAITool(tool) {
        // Hide all sub panels
        document.querySelectorAll('.sub-tools-panel').forEach(p => p.classList.remove('active'));

        switch (tool) {
            case 'style':
                document.getElementById('style-options')?.classList.add('active');
                break;
            case 'background':
                document.getElementById('background-options')?.classList.add('active');
                break;
            case 'mood':
                document.getElementById('mood-options')?.classList.add('active');
                break;
            case 'prompt':
                document.querySelector('.ai-prompt-container')?.classList.add('active');
                break;
            case 'enhance':
                this.autoEnhance();
                break;
        }
    }

    applyAISuggestion(action) {
        this.showLoading();

        setTimeout(() => {
            switch (action) {
                case 'enhance':
                    this.adjustments.brightness = 10;
                    this.adjustments.contrast = 15;
                    break;
                case 'warm':
                    this.adjustments.warmth = 20;
                    break;
                case 'vibrant':
                    this.adjustments.saturation = 25;
                    break;
            }
            this.applyAdjustments();
            this.hideLoading();
            this.saveState();
        }, 800);
    }

    autoEnhance() {
        this.showLoading();
        setTimeout(() => {
            this.adjustments.brightness = 5;
            this.adjustments.contrast = 10;
            this.adjustments.saturation = 15;
            this.applyAdjustments();
            this.hideLoading();
            this.saveState();
        }, 1000);
    }

    processAIPrompt() {
        const prompt = document.getElementById('ai-prompt-input')?.value;
        if (!prompt) return;

        this.showLoading();

        // Simulated AI processing
        setTimeout(() => {
            console.log('AI Prompt:', prompt);
            this.hideLoading();
            alert('תכונת AI זו תהיה זמינה בקרוב!');
        }, 1500);
    }

    // ========================================
    // HISTORY (Undo/Redo)
    // ========================================

    saveState() {
        // Truncate future states
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Save current state
        const state = {
            main: this.canvas.toDataURL(),
            drawing: this.drawingCanvas.toDataURL()
        };
        this.history.push(state);
        this.historyIndex++;

        this.updateHistoryButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    restoreState(state) {
        const mainImg = new Image();
        mainImg.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(mainImg, 0, 0);
        };
        mainImg.src = state.main;

        const drawImg = new Image();
        drawImg.onload = () => {
            this.drawCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
            this.drawCtx.drawImage(drawImg, 0, 0);
        };
        drawImg.src = state.drawing;

        this.updateHistoryButtons();
    }

    updateHistoryButtons() {
        const undoBtn = document.getElementById('editor-undo-btn');
        const redoBtn = document.getElementById('editor-redo-btn');

        if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
        if (redoBtn) redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }

    // ========================================
    // LOADING
    // ========================================

    showLoading() {
        this.loadingOverlay?.classList.add('active');
    }

    hideLoading() {
        this.loadingOverlay?.classList.remove('active');
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    window.photoEditor = new PhotoEditor();
});

// Global function to open editor
window.openPhotoEditor = (imageData) => {
    window.photoEditor?.open(imageData);
};
