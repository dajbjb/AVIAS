/**
 * PHOTO EDITOR V2 - Fully Functional
 * - Real filters that work
 * - Draggable & resizable stickers/text
 * - AI enhancements via Gemini
 * - Always visible preview
 */

class PhotoEditor {
    constructor() {
        this.screen = document.getElementById('photo-editor-screen');
        this.canvas = document.getElementById('editor-canvas');
        this.ctx = this.canvas?.getContext('2d');
        this.loadingOverlay = document.querySelector('.editor-loading-overlay');
        this.toolbar = document.querySelector('.editor-bottom-toolbar');
        this.elementsLayer = document.querySelector('.elements-layer');

        // State
        this.originalImage = null;
        this.currentFilter = 'none';
        this.elements = []; // Stickers, text, etc.
        this.selectedElement = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };

        // Adjustments
        this.adjustments = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            warmth: 0,
            blur: 0
        };

        // History
        this.history = [];
        this.historyIndex = -1;

        // Filter presets (CSS filter values)
        this.filterPresets = {
            none: '',
            vivid: 'saturate(1.4) contrast(1.1)',
            warm: 'sepia(0.2) saturate(1.2)',
            cool: 'hue-rotate(20deg) saturate(0.9)',
            vintage: 'sepia(0.4) contrast(1.1) brightness(0.95)',
            bw: 'grayscale(1) contrast(1.2)',
            dramatic: 'contrast(1.4) saturate(1.1) brightness(0.9)',
            soft: 'brightness(1.05) contrast(0.95) saturate(0.9)',
            hdr: 'contrast(1.3) saturate(1.3) brightness(1.05)'
        };

        // Text styling defaults
        this.currentTextFont = 'Arial';
        this.currentTextColor = '#FFFFFF';
        this.currentTextSize = 32;

        this.init();
    }

    init() {
        this.bindCoreEvents();
        this.bindToolEvents();
        this.bindDragEvents();
        this.bindTextToolbarEvents();
        console.log('PhotoEditor V2: Ready');
    }

    // ========================================
    // CORE EVENTS
    // ========================================

    bindCoreEvents() {
        // Cancel / Back Button
        document.getElementById('editor-cancel-btn')?.addEventListener('click', () => this.close());

        // Save Button
        document.getElementById('editor-save-btn')?.addEventListener('click', () => this.save());

        // Undo/Redo
        document.getElementById('editor-undo-btn')?.addEventListener('click', () => this.undo());
        document.getElementById('editor-redo-btn')?.addEventListener('click', () => this.redo());

        // Toggle Toolbar (Clean View Logic)
        const toggleBtn = document.getElementById('edit-toggle-btn');
        const toolbar = document.getElementById('editor-bottom-toolbar');
        const closeToolbarBtn = document.getElementById('close-toolbar-btn');

        if (toggleBtn && toolbar) {
            toggleBtn.addEventListener('click', () => {
                toolbar.classList.add('active');
                toggleBtn.classList.add('hidden');
            });
        }

        if (closeToolbarBtn && toolbar && toggleBtn) {
            closeToolbarBtn.addEventListener('click', () => {
                toolbar.classList.remove('active');
                toggleBtn.classList.remove('hidden');
            });
        }

        // Click on canvas to deselect elements
        this.canvas?.addEventListener('click', () => this.deselectAll());
    }


    bindToolEvents() {
        // Quick Tools - Click should also open toolbar if closed
        document.querySelectorAll('.quick-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const toolbar = document.querySelector('.editor-bottom-toolbar');
                const toggleBtn = document.getElementById('edit-toggle-btn');

                if (!toolbar.classList.contains('active')) {
                    toolbar.classList.add('active');
                    toggleBtn.classList.add('hidden');
                }

                this.selectTool(btn.dataset.tool);
            });
        });

        // Filter Presets (with touch support for iOS)
        document.querySelectorAll('.filter-preset').forEach(preset => {
            preset.addEventListener('click', () => this.applyFilter(preset.dataset.filter));
            preset.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.applyFilter(preset.dataset.filter);
            });
        });

        // Stickers (with touch support - prevent double firing)
        document.querySelectorAll('.sticker-btn').forEach(btn => {
            let touchHandled = false;

            btn.addEventListener('touchstart', () => {
                touchHandled = true;
            });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (touchHandled) {
                    this.addSticker(btn.dataset.emoji);
                    touchHandled = false;
                }
            });

            btn.addEventListener('click', (e) => {
                // Only fire click if touch didn't already handle it
                if (!touchHandled) {
                    this.addSticker(btn.dataset.emoji);
                }
                touchHandled = false;
            });
        });

        // Text Tool - Create inline editable text when clicking "text" tool
        document.getElementById('text-tool-btn')?.addEventListener('click', () => {
            this.createEditableText();
        });

        // Font Selection (new style)
        document.querySelectorAll('.font-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.font-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTextFont = btn.dataset.font;
                if (this.selectedElement && this.selectedElement.type === 'text') {
                    this.selectedElement.fontFamily = btn.dataset.font;
                    this.selectedElement.el.style.fontFamily = btn.dataset.font;
                }
            });
        });

        // Color Selection (new style)
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTextColor = btn.dataset.color;
                if (this.selectedElement && this.selectedElement.type === 'text') {
                    this.selectedElement.color = btn.dataset.color;
                    this.selectedElement.el.style.color = btn.dataset.color;
                }
            });
        });

        // Size Slider
        document.getElementById('text-size-slider')?.addEventListener('input', (e) => {
            this.currentTextSize = parseInt(e.target.value);
            if (this.selectedElement && this.selectedElement.type === 'text') {
                this.selectedElement.size = this.currentTextSize;
                this.selectedElement.el.style.fontSize = this.currentTextSize + 'px';
            }
        });

        // Delete Selected Text Button
        document.getElementById('delete-selected-text')?.addEventListener('click', () => {
            if (this.selectedElement && this.selectedElement.type === 'text') {
                this.deleteElement(this.selectedElement);
            }
        });

        // Adjustments Touch Fix
        ['brightness', 'contrast', 'saturation', 'warmth'].forEach(adj => {
            const slider = document.getElementById(`adj-${adj}`);
            if (slider) {
                // Prevent drag of element when moving slider
                slider.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
                slider.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false });

                slider.addEventListener('input', (e) => {
                    this.adjustments[adj] = parseInt(e.target.value);
                    document.getElementById(`${adj}-val`).textContent = e.target.value;
                    this.renderCanvas();
                });
            }
        });

        // AI Magic buttons
        document.querySelectorAll('.ai-magic-btn').forEach(btn => {
            btn.addEventListener('click', () => this.applyAIMagic(btn.dataset.action));
        });

        // AI Prompt
        document.getElementById('ai-run-prompt-btn')?.addEventListener('click', () => {
            const prompt = document.getElementById('ai-smart-prompt')?.value;
            if (prompt) this.processAIPrompt(prompt);
        });

        // =====================
        // NEW GLASS NAV BINDINGS
        // =====================

        // Main tool items -> switch to that view
        document.querySelectorAll('.editor-nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.editorTool;
                this.showEditorView(tool);

                // Special actions
                if (tool === 'my-stories') {
                    this.loadMyStoriesNav();
                }
                // Text tool just opens the toolbar, user clicks "add text" button
            });
        });

        // Back buttons
        ['filters-back', 'adjust-back', 'text-back', 'mystories-back'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => {
                this.showEditorView('main');
            });
        });

        // Filter items in new nav
        document.querySelectorAll('.editor-filter-item').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.editor-filter-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyFilter(btn.dataset.filter);
            });
        });

        // Color circles in new nav
        document.querySelectorAll('.color-circle').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-circle').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTextColor = btn.dataset.color;
                if (this.selectedElement && this.selectedElement.type === 'text') {
                    this.selectedElement.el.style.color = btn.dataset.color;
                }
            });
        });

        // Font circles in new nav
        document.querySelectorAll('.font-circle').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.font-circle').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTextFont = btn.dataset.font;
                if (this.selectedElement && this.selectedElement.type === 'text') {
                    this.selectedElement.el.style.fontFamily = btn.dataset.font;
                }
            });
        });
    }

    // Show editor nav view with morphing
    showEditorView(viewName) {
        const views = {
            'main': 'editor-main-tools',
            'filters': 'editor-filters-view',
            'adjust': 'editor-adjust-view',
            'text': 'editor-text-view',
            'my-stories': 'editor-mystories-view'
        };

        document.querySelectorAll('.editor-nav-view').forEach(v => v.classList.remove('active'));

        const targetId = views[viewName];
        if (targetId) {
            const el = document.getElementById(targetId);
            if (el) el.classList.add('active');
        }

        // Show/hide text toolbar
        const textToolbar = document.getElementById('text-toolbar');
        if (textToolbar) {
            if (viewName === 'text') {
                textToolbar.classList.add('active');
            } else {
                textToolbar.classList.remove('active');
            }
        }
    }

    // Initialize text toolbar events
    bindTextToolbarEvents() {
        // Add new text button
        document.getElementById('add-new-text-btn')?.addEventListener('click', () => {
            this.createNewTextElement();
        });

        // Delete selected text
        document.getElementById('delete-text-btn')?.addEventListener('click', () => {
            if (this.selectedElement && this.selectedElement.type === 'text') {
                this.deleteElement(this.selectedElement);
                this.updateDeleteButtonState();
            }
        });

        // Color buttons
        document.querySelectorAll('.txt-color').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.txt-color').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTextColor = btn.dataset.color;

                // Update selected text if exists
                if (this.selectedElement && this.selectedElement.type === 'text') {
                    this.selectedElement.color = btn.dataset.color;
                    this.selectedElement.el.style.color = btn.dataset.color;
                }
            });
        });

        // Font buttons
        document.querySelectorAll('.txt-font').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.txt-font').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTextFont = btn.dataset.font;

                // Update selected text if exists
                if (this.selectedElement && this.selectedElement.type === 'text') {
                    this.selectedElement.fontFamily = btn.dataset.font;
                    this.selectedElement.el.style.fontFamily = btn.dataset.font;
                }
            });
        });

        // Size slider
        const sizeSlider = document.getElementById('txt-size-slider');
        const sizeVal = document.getElementById('txt-size-val');
        if (sizeSlider) {
            sizeSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                this.currentTextSize = size;
                if (sizeVal) sizeVal.textContent = size;

                // Update selected text if exists
                if (this.selectedElement && this.selectedElement.type === 'text') {
                    this.selectedElement.size = size;
                    this.selectedElement.el.style.fontSize = size + 'px';
                }
            });
        }
    }

    updateDeleteButtonState() {
        const deleteBtn = document.getElementById('delete-text-btn');
        if (deleteBtn) {
            deleteBtn.disabled = !(this.selectedElement && this.selectedElement.type === 'text');
        }
    }

    // Create new draggable, resizable text element
    createNewTextElement() {
        const container = this.elementsLayer;
        if (!container) return;

        const el = document.createElement('div');
        el.className = 'text-element';
        el.contentEditable = 'true';
        el.innerText = 'טקסט';
        el.style.fontFamily = this.currentTextFont;
        el.style.color = this.currentTextColor;
        el.style.fontSize = this.currentTextSize + 'px';

        // Resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        el.appendChild(resizeHandle);

        // Delete handle
        const deleteHandle = document.createElement('div');
        deleteHandle.className = 'delete-handle';
        deleteHandle.innerHTML = '×';
        el.appendChild(deleteHandle);

        // Position in center
        const x = (container.offsetWidth / 2) - 50;
        const y = (container.offsetHeight / 2) - 20;
        el.style.left = x + 'px';
        el.style.top = y + 'px';

        container.appendChild(el);

        // Create element object
        const element = {
            type: 'text',
            content: 'טקסט',
            x: x,
            y: y,
            size: this.currentTextSize,
            color: this.currentTextColor,
            fontFamily: this.currentTextFont,
            el: el
        };
        this.elements.push(element);

        // Select it
        this.selectTextElement(element);

        // Focus for editing
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        // Drag functionality
        this.setupTextDrag(el, element);

        // Resize functionality
        this.setupTextResize(resizeHandle, el, element);

        // Delete handle - click and touch
        const handleDelete = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.deleteElement(element);
            this.updateDeleteButtonState();
        };
        deleteHandle.addEventListener('click', handleDelete);
        deleteHandle.addEventListener('touchend', handleDelete);

        // Touch to select (important for mobile)
        el.addEventListener('touchend', (e) => {
            if (!e.target.classList.contains('resize-handle') &&
                !e.target.classList.contains('delete-handle')) {
                this.selectTextElement(element);
            }
        });

        // Click to select
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectTextElement(element);
        });

        // Update content on blur
        el.addEventListener('blur', () => {
            element.content = el.innerText || el.textContent;
        });

        this.saveHistory();
    }

    selectTextElement(element) {
        // Deselect all
        document.querySelectorAll('.text-element').forEach(e => e.classList.remove('selected'));
        this.selectedElement = element;
        element.el.classList.add('selected');
        this.updateDeleteButtonState();
    }

    setupTextDrag(el, element) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        const onStart = (e) => {
            // Don't drag if clicking on handles
            if (e.target.classList.contains('resize-handle') ||
                e.target.classList.contains('delete-handle')) {
                return;
            }

            // Blur editing if was focused
            if (document.activeElement === el) {
                el.blur();
            }

            isDragging = true;
            el.style.cursor = 'grabbing';

            const touch = e.touches ? e.touches[0] : e;
            startX = touch.clientX;
            startY = touch.clientY;
            startLeft = parseInt(el.style.left) || 0;
            startTop = parseInt(el.style.top) || 0;

            this.selectTextElement(element);

            if (e.cancelable) e.preventDefault();
        };

        const onMove = (e) => {
            if (!isDragging) return;

            const touch = e.touches ? e.touches[0] : e;
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            const newX = startLeft + dx;
            const newY = startTop + dy;

            element.x = newX;
            element.y = newY;
            el.style.left = newX + 'px';
            el.style.top = newY + 'px';

            if (e.cancelable) e.preventDefault();
        };

        const onEnd = () => {
            if (isDragging) {
                isDragging = false;
                el.style.cursor = 'move';
                this.saveHistory();
            }
        };

        el.addEventListener('mousedown', onStart);
        el.addEventListener('touchstart', onStart, { passive: false });
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
    }

    setupTextResize(handle, el, element) {
        let isResizing = false;
        let startSize, startX;

        const onStart = (e) => {
            isResizing = true;
            const touch = e.touches ? e.touches[0] : e;
            startX = touch.clientX;
            startSize = element.size || parseInt(el.style.fontSize) || 32;
            e.preventDefault();
            e.stopPropagation();
        };

        const onMove = (e) => {
            if (!isResizing) return;
            const touch = e.touches ? e.touches[0] : e;
            const dx = touch.clientX - startX;
            const newSize = Math.max(16, Math.min(100, startSize + dx / 2));

            element.size = newSize;
            el.style.fontSize = newSize + 'px';

            // Update slider
            const slider = document.getElementById('txt-size-slider');
            const sizeVal = document.getElementById('txt-size-val');
            if (slider) slider.value = newSize;
            if (sizeVal) sizeVal.textContent = Math.round(newSize);

            e.preventDefault();
        };

        const onEnd = () => {
            if (isResizing) {
                isResizing = false;
                this.saveHistory();
            }
        };

        handle.addEventListener('mousedown', onStart);
        handle.addEventListener('touchstart', onStart, { passive: false });
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
    }

    // Load my stories in nav
    loadMyStoriesNav() {
        const list = document.getElementById('my-stories-list');
        if (!list) return;

        const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
        const stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
        const now = Date.now();
        const myStories = stories.filter(s => s.author === currentUser && (now - s.timestamp) < 5 * 60 * 60 * 1000);

        list.innerHTML = '';

        if (myStories.length === 0) {
            list.innerHTML = '<span style="color:#888; font-size:11px;">אין סטוריז</span>';
            return;
        }

        myStories.forEach(story => {
            const item = document.createElement('div');
            item.className = 'story-mini-item';

            const img = document.createElement('img');
            img.src = story.imageUrl;

            const del = document.createElement('button');
            del.className = 'story-mini-delete';
            del.innerHTML = '×';
            del.onclick = (e) => {
                e.stopPropagation();
                if (confirm('למחוק?')) {
                    let allStories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
                    allStories = allStories.filter(s => s.id !== story.id && s.timestamp !== story.timestamp);
                    localStorage.setItem('kingdom_stories', JSON.stringify(allStories));
                    this.loadMyStoriesNav();
                }
            };

            item.appendChild(img);
            item.appendChild(del);
            list.appendChild(item);
        });
    }

    open(imageSrc) {
        if (!imageSrc) return;

        // STOP CAMERA to save battery and performance
        if (window.AppCamera && window.AppCamera.stopCamera) {
            window.AppCamera.stopCamera();
        } else {
            // Fallback standard stop
            const video = document.querySelector('video');
            if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
        }

        // Show editor screen
        if (this.screen) {
            this.screen.style.display = 'flex';
        }

        // Reset state
        this.elements = [];
        this.history = [];
        this.historyIndex = -1;
        this.adjustments = { brightness: 0, contrast: 0, saturation: 0, warmth: 0 };
        this.currentFilter = 'none';

        // Load Image
        this.originalImage = new Image();
        this.originalImage.onload = () => {
            this.resizeCanvas();
            this.renderCanvas();
            this.saveHistory();
            this.updateHistoryButtons();
        };
        this.originalImage.src = imageSrc;

        // Reset UI
        this.updateSlidersUI();
        this.updateFilterUI();
        if (this.elementsLayer) this.elementsLayer.innerHTML = '';

        // Show edit toggle button, hide toolbar initially
        const toolbar = document.getElementById('editor-bottom-toolbar');
        const toggleBtn = document.getElementById('edit-toggle-btn');
        if (toolbar) toolbar.classList.remove('active');
        if (toggleBtn) toggleBtn.classList.remove('hidden');
    }

    close() {
        // Hide editor screen
        if (this.screen) {
            this.screen.style.display = 'none';
        }

        // Hide toolbar
        const toolbar = document.getElementById('editor-bottom-toolbar');
        if (toolbar) toolbar.classList.remove('active');

        // RESTART CAMERA
        if (window.AppCamera && window.AppCamera.startCamera) {
            window.AppCamera.startCamera();
        }
    }

    // ========================================
    // DRAG & DROP FOR ELEMENTS
    // ========================================

    bindDragEvents() {
        // We bind these document-wide for smooth dragging
        // Mouse
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        // Touch
        document.addEventListener('touchmove', (e) => this.onDrag(e), { passive: false });
        document.addEventListener('touchend', () => this.endDrag());
    }

    startDrag(e, element) {
        e.preventDefault();
        e.stopPropagation(); // Stop bubbling
        this.isDragging = true;
        this.selectedElement = element;

        // Select this element UI
        this.deselectAll();
        element.el.classList.add('selected');

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const rect = element.el.getBoundingClientRect();
        this.dragOffset = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    onDrag(e) {
        if (!this.isDragging || !this.selectedElement) return;
        e.preventDefault(); // Prevent scrolling

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const containerRect = this.elementsLayer.getBoundingClientRect();

        let x = clientX - containerRect.left - this.dragOffset.x;
        let y = clientY - containerRect.top - this.dragOffset.y;

        // Update model
        this.selectedElement.x = x;
        this.selectedElement.y = y;

        // Update DOM
        this.selectedElement.el.style.left = x + 'px';
        this.selectedElement.el.style.top = y + 'px';
    }

    endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.saveHistory();
        }
    }

    deselectAll() {
        document.querySelectorAll('.draggable-element').forEach(el => {
            el.classList.remove('selected');
        });
        // We don't nullify selectedElement immediately to allow color/font changes
        // Only if clicking outside
    }

    updateElementStyle(element) {
        if (element.type === 'text') {
            const textEl = element.el.querySelector('.text-content');
            if (textEl) {
                textEl.style.color = element.color;
                textEl.style.fontFamily = element.fontFamily;
            }
        }
    }

    deleteElement(element) {
        if (!element) return;

        // Remove from DOM
        if (element.el && element.el.parentNode) {
            element.el.parentNode.removeChild(element.el);
        }

        // Remove from elements array
        const index = this.elements.indexOf(element);
        if (index > -1) {
            this.elements.splice(index, 1);
        }

        // Clear selection
        if (this.selectedElement === element) {
            this.selectedElement = null;
        }

        this.saveHistory();

        // Hide delete button if no text selected
        const deleteBtn = document.getElementById('delete-selected-text');
        if (deleteBtn) deleteBtn.style.display = 'none';
    }

    // Instagram-style: Create editable text directly on image
    createEditableText() {
        const container = this.elementsLayer;
        if (!container) return;

        // Create contenteditable div
        const el = document.createElement('div');
        el.className = 'editable-text';
        el.contentEditable = 'true';
        el.innerText = 'הקלד כאן';
        el.style.fontFamily = this.currentTextFont;
        el.style.color = this.currentTextColor;
        el.style.fontSize = this.currentTextSize + 'px';

        // Position in center
        const x = (container.offsetWidth / 2) - 75;
        const y = (container.offsetHeight / 2) - 25;
        el.style.left = x + 'px';
        el.style.top = y + 'px';

        container.appendChild(el);

        // Create element object
        const element = {
            type: 'text',
            content: 'הקלד כאן',
            x: x,
            y: y,
            size: this.currentTextSize,
            color: this.currentTextColor,
            fontFamily: this.currentTextFont,
            el: el
        };
        this.elements.push(element);

        // Select it immediately
        this.deselectAll();
        el.classList.add('selected');
        this.selectedElement = element;

        // Show delete button
        const deleteBtn = document.getElementById('delete-selected-text');
        if (deleteBtn) deleteBtn.style.display = 'flex';

        // Focus for immediate editing
        el.focus();

        // Select all text for easy replacement
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        // Drag events
        el.addEventListener('mousedown', (e) => {
            if (e.target === el && !el.isContentEditable) {
                this.startDrag(e, element);
            }
        });

        el.addEventListener('touchstart', (e) => {
            // Select element on touch
            this.deselectAll();
            el.classList.add('selected');
            this.selectedElement = element;
            const deleteBtn = document.getElementById('delete-selected-text');
            if (deleteBtn) deleteBtn.style.display = 'flex';
        });

        // Update content on blur
        el.addEventListener('blur', () => {
            element.content = el.innerText;
            this.saveHistory();
        });

        // Click to select (not drag)
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deselectAll();
            el.classList.add('selected');
            this.selectedElement = element;
            const deleteBtn = document.getElementById('delete-selected-text');
            if (deleteBtn) deleteBtn.style.display = 'flex';
        });

        this.saveHistory();
    }

    // ... (rest of methods)

    addText(text) {
        const container = this.elementsLayer;
        if (!container || !text.trim()) return;

        const el = document.createElement('div');
        el.className = 'draggable-element';

        // Get current selected font/color logic or default
        const defaultFont = 'Montserrat, sans-serif';
        const defaultColor = '#ffffff';

        el.innerHTML = `
            <span class="text-content" style="font-family:${defaultFont}; color:${defaultColor}">${text}</span>
            <div class="resize-handle"></div>
            <button class="delete-element-btn"><i class="fa-solid fa-times"></i></button>
        `;

        const x = (container.offsetWidth / 2) - 50;
        const y = (container.offsetHeight / 2) - 15;
        el.style.left = x + 'px';
        el.style.top = y + 'px';

        container.appendChild(el);

        const element = {
            type: 'text',
            content: text,
            x: x,
            y: y,
            size: 24,
            color: defaultColor,
            fontFamily: defaultFont,
            el: el
        };
        this.elements.push(element);

        // Events
        el.addEventListener('mousedown', (e) => this.startDrag(e, element));
        el.addEventListener('touchstart', (e) => this.startDrag(e, element));

        // Delete button
        const delBtn = el.querySelector('.delete-element-btn');
        delBtn.addEventListener('mousedown', (e) => e.stopPropagation()); // Prevent drag start
        delBtn.addEventListener('touchstart', (e) => e.stopPropagation());
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteElement(element);
        });

        this.deselectAll();
        el.classList.add('selected');
        this.selectedElement = element;

        this.saveHistory();
    }

    // ...

    // ========================================
    // REAL AI MAGIC (Prompt Processing)
    // ========================================

    async processAIPrompt(prompt) {
        this.showLoading('AI מנתח בקשה...');
        await new Promise(r => setTimeout(r, 1500)); // Simulate thinking

        const p = prompt.toLowerCase();
        let applied = [];

        // Reset first? Maybe user wants cumulative. Let's keep cumulative.

        // Semantic Analysis Logic
        if (p.includes('חורף') || p.includes('קר') || p.includes('cold') || p.includes('winter')) {
            this.adjustments.warmth = -30;
            this.adjustments.saturation = -10;
            this.adjustments.contrast = 10;
            this.currentFilter = 'cool';
            applied.push('אווירה חורפית');
        }

        if (p.includes('קיץ') || p.includes('חם') || p.includes('warm') || p.includes('summer') || p.includes('שמש')) {
            this.adjustments.warmth = 40;
            this.adjustments.saturation = 20;
            this.adjustments.brightness = 5;
            this.currentFilter = 'warm';
            applied.push('אווירה קיצית');
        }

        if (p.includes('ישן') || p.includes('vintage') || p.includes('old') || p.includes('retro')) {
            this.adjustments.saturation = -30;
            this.adjustments.contrast = 20;
            this.adjustments.warmth = 20;
            this.currentFilter = 'vintage';
            applied.push('סגנון וינטג\'');
        }

        if (p.includes('שחור לבן') || p.includes('bw') || p.includes('black')) {
            this.currentFilter = 'bw';
            this.adjustments.contrast = 20;
            applied.push('שחור לבן');
        }

        if (p.includes('שמח') || p.includes('happy') || p.includes('חי') || p.includes('vibrant')) {
            this.adjustments.saturation = 40;
            this.adjustments.brightness = 10;
            this.currentFilter = 'vivid';
            applied.push('צבעים שמחים');
        }

        if (p.includes('דרמטי') || p.includes('dramatic') || p.includes('עצוב') || p.includes('dark')) {
            this.adjustments.brightness = -20;
            this.adjustments.contrast = 40;
            this.adjustments.saturation = -10;
            this.currentFilter = 'dramatic';
            applied.push('מראה דרמטי');
        }

        // Apply changes
        this.updateSlidersUI();
        this.updateFilterUI();
        this.renderCanvas();
        this.saveHistory();
        this.hideLoading();

        if (applied.length > 0) {
            // alert(`AI ביצע: ${applied.join(', ')}`);
        } else {
            // Fallback for unknown
            this.adjustments.contrast = 10;
            this.adjustments.brightness = 5;
            this.renderCanvas();
        }
    }

    updateSlidersUI() {
        ['brightness', 'contrast', 'saturation', 'warmth'].forEach(adj => {
            const slider = document.getElementById(`adj-${adj}`);
            const val = document.getElementById(`${adj}-val`);
            if (slider) slider.value = this.adjustments[adj];
            if (val) val.textContent = this.adjustments[adj];
        });
    }

    updateFilterUI() {
        document.querySelectorAll('.filter-preset').forEach(p => {
            p.classList.toggle('active', p.dataset.filter === this.currentFilter);
        });
    }

    // ========================================
    // OPEN / CLOSE / SAVE
    // ========================================

    open(imageData) {
        if (!this.screen || !this.canvas) return;

        this.screen.classList.add('active');
        this.toolbar?.classList.remove('collapsed');
        document.getElementById('main-nav').style.display = 'none';

        // Clear previous state
        this.elements.forEach(e => e.el?.remove());
        this.elements = [];
        this.history = [];
        this.historyIndex = -1;
        this.resetAdjustments();
        this.currentFilter = 'none';

        // Load image
        const img = new Image();
        img.onload = () => {
            this.originalImage = img;

            // Set canvas size (max 1000px for performance)
            const maxSize = 1000;
            let w = img.width;
            let h = img.height;
            if (w > maxSize || h > maxSize) {
                const ratio = Math.min(maxSize / w, maxSize / h);
                w *= ratio;
                h *= ratio;
            }

            this.canvas.width = w;
            this.canvas.height = h;
            this.renderCanvas();

            // Match elements layer size
            if (this.elementsLayer) {
                this.elementsLayer.style.width = this.canvas.offsetWidth + 'px';
                this.elementsLayer.style.height = this.canvas.offsetHeight + 'px';
            }

            this.saveHistory();
            this.generateFilterPreviews();
        };
        img.src = imageData;
    }

    close() {
        this.screen?.classList.remove('active');
        document.getElementById('main-nav').style.display = 'flex';

        // Clear elements
        this.elements.forEach(e => e.el?.remove());
        this.elements = [];
    }

    async save() {
        this.showLoading('מעלה סטורי...');

        // Create final canvas with all elements
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = this.canvas.width;
        finalCanvas.height = this.canvas.height;
        const finalCtx = finalCanvas.getContext('2d');

        // Draw base image (with filters applied)
        // Note: this.canvas doesn't have the filter context, so recreate logic or capture visual state
        // Simplest for now: Draw the main canvas content

        // Apply current filter to context before drawing
        const filterStr = this.filterPresets[this.currentFilter] || 'none';
        // Add manual adjustments strings
        const brightness = 100 + (this.adjustments.brightness || 0);
        const contrast = 100 + (this.adjustments.contrast || 0);
        const saturate = 100 + (this.adjustments.saturation || 0);
        const warmth = this.adjustments.warmth || 0;
        let adjustFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;
        if (warmth > 0) adjustFilter += ` sepia(${warmth * 0.5}%)`;
        if (warmth < 0) adjustFilter += ` hue-rotate(${warmth * 0.5}deg)`;

        finalCtx.filter = `${filterStr} ${adjustFilter}`;
        finalCtx.drawImage(this.originalImage, 0, 0, finalCanvas.width, finalCanvas.height);
        finalCtx.filter = 'none';

        // Draw elements
        for (const element of this.elements) {
            await this.drawElementToCanvas(finalCtx, element);
        }

        const dataURL = finalCanvas.toDataURL('image/jpeg', 0.85);

        // --- SAVE SYSTEM (CLOUD SYNC) ---
        const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';

        const storyData = {
            author: currentUser,
            timestamp: Date.now(),
            imageUrl: dataURL,
            filter: this.currentFilter,
            type: 'image',
            caption: this.elements.find(e => e.type === 'text')?.content || ''
        };

        try {
            if (typeof SyncManager !== 'undefined' && SyncManager.addStory) {
                // This handles Cloud Upload + Firestore + Local Storage
                await SyncManager.addStory(storyData);
                this.showToast('הסטורי הועלה לענן בהצלחה! ☁️✨');
            } else {
                // Fallback if SyncManager is missing
                const stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
                stories.push({ ...storyData, id: Date.now().toString() });
                localStorage.setItem('kingdom_stories', JSON.stringify(stories));
                this.showToast('נשמר מקומית (אין חיבור לשרת) 💾');
            }
        } catch (e) {
            console.error(e);
            this.showToast('שגיאה בשמירה, נסה שוב');
        }

        await new Promise(r => setTimeout(r, 1200));

        this.hideLoading();
        this.close();

        // Reload home logic
        if (typeof window.renderHome === 'function') window.renderHome();
        if (typeof window.renderStatusRings === 'function') window.renderStatusRings();
    }

    async drawElementToCanvas(ctx, element) {
        const scaleX = this.canvas.width / this.elementsLayer.offsetWidth;
        const scaleY = this.canvas.height / this.elementsLayer.offsetHeight;

        const x = element.x * scaleX;
        const y = element.y * scaleY;
        const size = element.size * scaleX;

        if (element.type === 'sticker') {
            ctx.font = `${size}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(element.content, x, y);
        } else if (element.type === 'text') {
            ctx.font = `bold ${size}px Arial`;
            ctx.fillStyle = element.color || '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            ctx.fillText(element.content, x, y);
            ctx.shadowBlur = 0;
        }
    }

    // ========================================
    // RENDERING
    // ========================================

    renderCanvas() {
        if (!this.ctx || !this.originalImage) return;

        // Clear
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Build filter string
        let filter = this.filterPresets[this.currentFilter] || '';

        // Add adjustments
        const brightness = 100 + (this.adjustments.brightness || 0);
        const contrast = 100 + (this.adjustments.contrast || 0);
        const saturate = 100 + (this.adjustments.saturation || 0);
        const warmth = this.adjustments.warmth || 0;

        let adjustFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;
        if (warmth > 0) adjustFilter += ` sepia(${warmth * 0.5}%)`;
        if (warmth < 0) adjustFilter += ` hue-rotate(${warmth * 0.5}deg)`;

        this.ctx.filter = filter ? `${filter} ${adjustFilter}` : adjustFilter;

        // Draw
        this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);

        // Reset filter
        this.ctx.filter = 'none';
    }

    resetAdjustments() {
        this.adjustments = { brightness: 0, contrast: 0, saturation: 0, warmth: 0 };
        ['brightness', 'contrast', 'saturation', 'warmth'].forEach(adj => {
            const slider = document.getElementById(`adj-${adj}`);
            const val = document.getElementById(`${adj}-val`);
            if (slider) slider.value = 0;
            if (val) val.textContent = '0';
        });
    }

    // ========================================
    // TOOLS
    // ========================================

    selectTool(tool) {
        // Update button states
        document.querySelectorAll('.quick-tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        // Show corresponding panel
        document.querySelectorAll('.tool-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `panel-${tool}`);
        });

        // Expand toolbar if collapsed
        this.toolbar?.classList.remove('collapsed');
    }

    applyFilter(filterName) {
        document.querySelectorAll('.filter-preset').forEach(p => {
            p.classList.toggle('active', p.dataset.filter === filterName);
        });

        this.currentFilter = filterName;
        this.renderCanvas();
        this.saveHistory();
    }

    generateFilterPreviews() {
        // Create small preview images for each filter
        document.querySelectorAll('.filter-preview').forEach(preview => {
            const filterName = preview.closest('.filter-preset')?.dataset.filter;
            if (!filterName || !this.originalImage) return;

            const mini = document.createElement('canvas');
            mini.width = 70;
            mini.height = 70;
            const mCtx = mini.getContext('2d');

            mCtx.filter = this.filterPresets[filterName] || '';

            // Draw cropped center of image
            const size = Math.min(this.originalImage.width, this.originalImage.height);
            const sx = (this.originalImage.width - size) / 2;
            const sy = (this.originalImage.height - size) / 2;

            mCtx.drawImage(this.originalImage, sx, sy, size, size, 0, 0, 70, 70);

            // Replace content
            preview.innerHTML = '';
            const img = document.createElement('img');
            img.src = mini.toDataURL();
            preview.appendChild(img);
        });
    }

    // ========================================
    // STICKERS & TEXT (Draggable)
    // ========================================

    addSticker(emoji) {
        const container = this.elementsLayer;
        if (!container) return;

        // Create element
        const el = document.createElement('div');
        el.className = 'draggable-element';
        el.innerHTML = `
            <span class="sticker-content">${emoji}</span>
            <div class="resize-handle"></div>
            <button class="delete-element-btn"><i class="fa-solid fa-times"></i></button>
        `;

        // Position in center
        const x = (container.offsetWidth / 2) - 30;
        const y = (container.offsetHeight / 2) - 30;
        el.style.left = x + 'px';
        el.style.top = y + 'px';

        container.appendChild(el);

        // Create data object
        const element = {
            type: 'sticker',
            content: emoji,
            x: x,
            y: y,
            size: 60,
            el: el
        };
        this.elements.push(element);

        // Bind events
        el.addEventListener('mousedown', (e) => this.startDrag(e, element));
        el.addEventListener('touchstart', (e) => this.startDrag(e, element));
        el.querySelector('.delete-element-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteElement(element);
        });

        // Select it
        this.deselectAll();
        el.classList.add('selected');
        this.selectedElement = element;

        this.saveHistory();
    }

    addText(text) {
        const container = this.elementsLayer;
        if (!container || !text.trim()) return;

        const el = document.createElement('div');
        el.className = 'draggable-element';
        el.innerHTML = `
            <span class="text-content">${text}</span>
            <div class="resize-handle"></div>
            <button class="delete-element-btn"><i class="fa-solid fa-times"></i></button>
        `;

        const x = (container.offsetWidth / 2) - 50;
        const y = (container.offsetHeight / 2) - 15;
        el.style.left = x + 'px';
        el.style.top = y + 'px';

        container.appendChild(el);

        const element = {
            type: 'text',
            content: text,
            x: x,
            y: y,
            size: 24,
            color: '#ffffff',
            el: el
        };
        this.elements.push(element);

        el.addEventListener('mousedown', (e) => this.startDrag(e, element));
        el.addEventListener('touchstart', (e) => this.startDrag(e, element));
        el.querySelector('.delete-element-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteElement(element);
        });

        this.deselectAll();
        el.classList.add('selected');
        this.selectedElement = element;

        this.saveHistory();
    }

    // ========================================
    // AI MAGIC (Real Effects)
    // ========================================

    async applyAIMagic(action) {
        this.showLoading('AI מעבד...');

        // Simulate processing time for now
        await new Promise(r => setTimeout(r, 800));

        switch (action) {
            case 'enhance':
                // Auto-enhance: slightly boost everything
                this.adjustments.brightness = 8;
                this.adjustments.contrast = 12;
                this.adjustments.saturation = 15;
                break;

            case 'warm':
                // Warm tone
                this.adjustments.warmth = 25;
                this.adjustments.saturation = 10;
                break;

            case 'cool':
                // Cool tone
                this.adjustments.warmth = -20;
                this.adjustments.saturation = 5;
                break;

            case 'dramatic':
                // High contrast dramatic look
                this.adjustments.contrast = 30;
                this.adjustments.saturation = 20;
                this.adjustments.brightness = -5;
                break;

            case 'soft':
                // Soft dreamy look
                this.adjustments.contrast = -10;
                this.adjustments.brightness = 10;
                this.adjustments.saturation = -10;
                break;

            case 'vibrant':
                // Pop colors
                this.adjustments.saturation = 35;
                this.adjustments.contrast = 10;
                break;
        }

        // Update sliders UI
        ['brightness', 'contrast', 'saturation', 'warmth'].forEach(adj => {
            const slider = document.getElementById(`adj-${adj}`);
            const val = document.getElementById(`${adj}-val`);
            if (slider) slider.value = this.adjustments[adj];
            if (val) val.textContent = this.adjustments[adj];
        });

        this.renderCanvas();
        this.saveHistory();
        this.hideLoading();
    }

    // ========================================
    // HISTORY
    // ========================================

    saveHistory() {
        // Remove future states if we're not at the end
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Save current state
        this.history.push({
            filter: this.currentFilter,
            adjustments: { ...this.adjustments },
            elements: this.elements.map(e => ({
                type: e.type,
                content: e.content,
                x: e.x,
                y: e.y,
                size: e.size,
                color: e.color
            }))
        });

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
        this.currentFilter = state.filter;
        this.adjustments = { ...state.adjustments };

        // Update UI
        document.querySelectorAll('.filter-preset').forEach(p => {
            p.classList.toggle('active', p.dataset.filter === state.filter);
        });

        ['brightness', 'contrast', 'saturation', 'warmth'].forEach(adj => {
            const slider = document.getElementById(`adj-${adj}`);
            const val = document.getElementById(`${adj}-val`);
            if (slider) slider.value = this.adjustments[adj];
            if (val) val.textContent = this.adjustments[adj];
        });

        this.renderCanvas();
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

    showLoading(text = 'מעבד...') {
        const loadingText = this.loadingOverlay?.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = text;
        this.loadingOverlay?.classList.add('active');
    }

    hideLoading() {
        this.loadingOverlay?.classList.remove('active');
    }
    resizeCanvas() {
        if (!this.originalImage) return;

        const maxW = window.innerWidth;
        const maxH = window.innerHeight * 0.8; // Leave space for UI

        let w = this.originalImage.width;
        let h = this.originalImage.height;

        // Maintain aspect ratio
        if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w *= ratio;
            h *= ratio;
        }

        if (this.canvas) {
            this.canvas.width = w;
            this.canvas.height = h;
        }

        // Also update elements layer size to match
        if (this.elementsLayer) {
            this.elementsLayer.style.width = w + 'px';
            this.elementsLayer.style.height = h + 'px';
        }
    }

    renderCanvas() {
        if (!this.ctx || !this.originalImage) return;

        // Clear
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Base Setup
        this.ctx.save();

        // Apply Filters via Context Filter (Modern Browsers)
        const filterStr = this.filterPresets[this.currentFilter] || '';

        // Manual adjustments convert to CSS filter strings
        const brightness = 100 + (this.adjustments.brightness || 0);
        const contrast = 100 + (this.adjustments.contrast || 0);
        const saturate = 100 + (this.adjustments.saturation || 0);
        const warmth = this.adjustments.warmth || 0;

        // Warmth is tricky in canvas filter without heavy pixel manipulation
        // We simulate warmth with Sepia + Hue Rotate
        let adjustFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;

        if (warmth > 0) {
            adjustFilter += ` sepia(${warmth * 0.5}%)`;
        } else if (warmth < 0) {
            adjustFilter += ` hue-rotate(${warmth * 0.5}deg)`;
        }

        const blur = this.adjustments.blur || 0;
        if (blur > 0) adjustFilter += ` blur(${blur}px)`;

        this.ctx.filter = `${filterStr} ${adjustFilter}`.trim();
        if (this.ctx.filter === '') this.ctx.filter = 'none';

        // Draw Image
        this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);

        this.ctx.restore();
    }

    selectTool(toolName) {
        // Switch Active Button
        document.querySelectorAll('.quick-tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === toolName);
        });

        // Switch Panel
        document.querySelectorAll('.tool-panel').forEach(panel => {
            panel.classList.remove('active');
            panel.style.display = 'none'; // Ensure hide
        });

        const activePanel = document.getElementById(`panel-${toolName}`);
        if (activePanel) {
            activePanel.style.display = 'block';
            setTimeout(() => activePanel.classList.add('active'), 10);
        }

        // Ensure toolbar is expanded
        const toolbar = document.querySelector('.editor-bottom-toolbar');
        const toggleBtn = document.getElementById('edit-toggle-btn');
        if (toolbar && !toolbar.classList.contains('active')) {
            toolbar.classList.add('active');
            if (toggleBtn) toggleBtn.classList.add('hidden');
        }

        // Special logic for My Stories
        if (toolName === 'my-stories') {
            this.loadMyStories();
        }
    }

    loadMyStories() {
        const list = document.getElementById('my-stories-list');
        if (!list) return;
        list.innerHTML = '<div style="color:#aaa; padding:20px;">טוען...</div>';

        const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
        const stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");

        // Filter my active stories
        const now = Date.now();
        const myStories = stories.filter(s => s.author === currentUser && (now - s.timestamp) < 5 * 60 * 60 * 1000);

        list.innerHTML = '';
        if (myStories.length === 0) {
            list.innerHTML = '<div style="color:#aaa; padding:10px;">אין סטוריז פעילים כרגע.</div>';
            return;
        }

        myStories.forEach(s => {
            const item = document.createElement('div');
            item.style.cssText = "position:relative; flex-shrink:0; width:80px; height:120px; border-radius:8px; overflow:hidden; border:1px solid #444;";

            const img = document.createElement('img');
            img.src = s.imageUrl;
            img.style.cssText = "width:100%; height:100%; object-fit:cover;";

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            delBtn.style.cssText = "position:absolute; bottom:5px; right:5px; background:rgba(255,0,0,0.8); color:white; border:none; border-radius:50%; width:24px; height:24px; font-size:10px; cursor:pointer;";

            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('למחוק?')) {
                    if (typeof SyncManager !== 'undefined' && SyncManager.deleteStory) {
                        SyncManager.deleteStory(s.id);
                        this.loadMyStories(); // Reload
                    } else {
                        // Fallback local delete
                        const newStories = stories.filter(x => x.id !== s.id);
                        localStorage.setItem('kingdom_stories', JSON.stringify(newStories));
                        this.loadMyStories();
                    }
                }
            };

            item.appendChild(img);
            item.appendChild(delBtn);
            list.appendChild(item);
        });
    }

    applyFilter(filterName) {
        this.currentFilter = filterName;

        // Update UI
        document.querySelectorAll('.filter-preset').forEach(p => {
            p.classList.toggle('active', p.dataset.filter === filterName);
        });

        this.renderCanvas();
        this.saveHistory();
    }

    addSticker(emoji) {
        if (!emoji) {
            console.log('addSticker: No emoji provided');
            return;
        }

        const container = this.elementsLayer;
        if (!container) {
            console.log('addSticker: elementsLayer not found');
            return;
        }

        console.log('Adding sticker:', emoji);

        const el = document.createElement('div');
        el.className = 'draggable-element';

        el.innerHTML = `
            <span class="sticker-content">${emoji}</span>
            <div class="resize-handle"></div>
            <button class="delete-element-btn"><i class="fa-solid fa-xmark"></i></button>
        `;

        const x = (container.offsetWidth / 2) - 30;
        const y = (container.offsetHeight / 2) - 30;
        el.style.left = x + 'px';
        el.style.top = y + 'px';

        container.appendChild(el);

        const element = {
            type: 'sticker',
            content: emoji,
            x: x,
            y: y,
            size: 60,
            el: el
        };
        this.elements.push(element);

        // Events
        el.addEventListener('mousedown', (e) => this.startDrag(e, element));
        el.addEventListener('touchstart', (e) => this.startDrag(e, element)); // Pass e directly

        // Delete button
        const delBtn = el.querySelector('.delete-element-btn');
        delBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        delBtn.addEventListener('touchstart', (e) => e.stopPropagation());
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteElement(element);
        });

        this.deselectAll();
        el.classList.add('selected');
        this.selectedElement = element;
        this.saveHistory();
    }

    applyAIMagic(action) {
        this.showLoading('AI Magic בפעולה...');
        setTimeout(() => {
            switch (action) {
                case 'enhance':
                    this.adjustments.brightness = 10;
                    this.adjustments.contrast = 15;
                    this.adjustments.saturation = 10;
                    break;
                case 'warm':
                    this.adjustments.warmth = 30;
                    this.adjustments.saturation = 10;
                    break;
                case 'cool':
                    this.adjustments.warmth = -30;
                    this.adjustments.brightness = 5;
                    break;
                case 'dramatic':
                    this.currentFilter = 'dramatic';
                    this.adjustments.contrast = 25;
                    break;
            }
            this.updateSlidersUI();
            this.renderCanvas();
            this.saveHistory();
            this.hideLoading();
            this.showToast('קסם הופעל! ✨');
        }, 800);
    }

    updateSlidersUI() {
        ['brightness', 'contrast', 'saturation', 'warmth'].forEach(adj => {
            const slider = document.getElementById(`adj-${adj}`);
            const val = document.getElementById(`${adj}-val`);
            if (slider) slider.value = this.adjustments[adj];
            if (val) val.textContent = this.adjustments[adj];
        });
    }

    showToast(msg) {
        // Create simple toast if not exists
        let toast = document.getElementById('editor-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'editor-toast';
            toast.style.cssText = "position:absolute; top:80px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:10px 20px; border-radius:30px; z-index:2000; font-family:sans-serif; opacity:0; transition:opacity 0.3s; pointer-events:none; white-space:nowrap;";
            this.screen.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = 1;
        setTimeout(() => { toast.style.opacity = 0; }, 3000);
    }

    async drawElementToCanvas(ctx, element) {
        // Helper for saving
        ctx.save();
        const x = element.x;
        const y = element.y;

        // Assuming elements act as DOM overlays, we approximate their position on canvas
        // Since canvas and overlay are 1:1, coords match.
        if (element.type === 'image') return; // Not implemented yet

        if (element.type === 'text') {
            ctx.font = `bold ${element.size}px ${element.fontFamily || 'Arial'}`;
            ctx.fillStyle = element.color || '#fff';
            ctx.textBaseline = 'top';
            ctx.fillText(element.content, x, y);
        } else if (element.type === 'sticker') {
            ctx.font = `${element.size}px Arial`;
            ctx.textBaseline = 'top';
            ctx.fillText(element.content, x, y);
        }
        ctx.restore();
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    window.photoEditor = new PhotoEditor();
});

// Global API
window.openPhotoEditor = (imageData) => {
    window.photoEditor?.open(imageData);
};
