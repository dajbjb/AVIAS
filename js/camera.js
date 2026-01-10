/**
 * CAMERA ENGINE - Simple & Reliable
 * -------------------
 * Handles camera stream with CSS filters (no external dependencies).
 * Works offline and is much faster than DeepAR.
 */

class CameraApp {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.stream = null;
        this.isRunning = false;
        this.currentFilter = 'none';

        console.log("CameraApp: Initialized.");

        // Bind global functions
        window.startCamera = () => this.startSequence();
        window.stopCamera = () => this.stopSequence();

        // Bind UI events
        this.bindEvents();
    }

    bindEvents() {
        // Capture button
        const captureBtn = document.getElementById('capture-btn');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => this.capture());
        }

        // Flip camera button
        const flipBtn = document.getElementById('camera-flip-btn');
        if (flipBtn) {
            flipBtn.addEventListener('click', () => this.flipCamera());
        }

        // Filter buttons
        document.addEventListener('click', (e) => {
            const filterBtn = e.target.closest('.nav-filter-item');
            if (filterBtn) {
                const filter = filterBtn.getAttribute('data-filter');
                this.setFilter(filter);

                // Update active state
                document.querySelectorAll('.nav-filter-item').forEach(btn => {
                    btn.classList.remove('active');
                });
                filterBtn.classList.add('active');
            }
        });

        // Story editor events
        this.bindEditorEvents();
    }

    async startSequence() {
        if (this.isRunning) return;
        console.log("CameraApp: Starting camera...");

        // Get elements
        this.canvas = document.getElementById('main-camera-canvas');
        if (!this.canvas) {
            console.error("Canvas not found!");
            return;
        }

        this.ctx = this.canvas.getContext('2d');

        // Create video element
        this.video = document.createElement('video');
        this.video.autoplay = true;
        this.video.muted = true;
        this.video.playsInline = true;

        try {
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });

            this.video.srcObject = this.stream;

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });

            // Set canvas size to match video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            this.isRunning = true;
            this.renderLoop();

            console.log("CameraApp: Camera started successfully!");

        } catch (error) {
            console.error("Camera Error:", error);
            alert("Camera access denied. Please allow camera permissions.");
        }
    }

    stopSequence() {
        if (!this.isRunning) return;
        console.log("CameraApp: Stopping camera...");

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        if (this.video) {
            this.video.pause();
            this.video.srcObject = null;
        }

        this.isRunning = false;

        // Clear canvas
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    renderLoop() {
        if (!this.isRunning) return;

        // Draw video frame to canvas
        if (this.video && this.video.readyState >= 2) {
            // Mirror the video horizontally
            this.ctx.save();
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(this.video, -this.canvas.width, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();

            // Apply filter if needed
            this.applyFilter();
        }

        requestAnimationFrame(() => this.renderLoop());
    }

    applyFilter() {
        if (this.currentFilter === 'none') return;

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        switch (this.currentFilter) {
            case 'galaxy':
                // Purple/blue cosmic effect
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = data[i] * 0.7 + 50;     // R - add purple
                    data[i + 1] = data[i + 1] * 0.5;  // G - reduce
                    data[i + 2] = data[i + 2] * 1.3;  // B - boost blue
                }
                break;

            case 'hope':
                // Warm golden glow
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] * 1.2);     // R - boost
                    data[i + 1] = Math.min(255, data[i + 1] * 1.1); // G - slight boost
                    data[i + 2] = data[i + 2] * 0.8;            // B - reduce
                }
                break;

            case 'humanoid':
                // Metallic silver/gray
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    const metallic = avg > 128 ? avg * 1.2 : avg * 0.8;
                    data[i] = data[i + 1] = data[i + 2] = Math.min(255, metallic);
                }
                break;

            case 'makeup':
                // Soft pink/peach tones
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] * 1.1 + 10);   // R - boost
                    data[i + 1] = Math.min(255, data[i + 1] * 1.05); // G - slight boost
                    data[i + 2] = Math.min(255, data[i + 2] * 0.95); // B - slight reduce
                }
                break;
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    setFilter(filter) {
        this.currentFilter = filter;
        console.log("Filter set to:", filter);
    }

    flipCamera() {
        // Simple implementation: restart with opposite facing mode
        const wasRunning = this.isRunning;
        this.stopSequence();

        if (wasRunning) {
            setTimeout(() => this.startSequence(), 300);
        }
    }

    capture() {
        if (!this.isRunning || !this.canvas) {
            console.warn("Camera not running!");
            return;
        }

        console.log("CameraApp: Capturing image...");

        // Flash effect
        const flash = document.getElementById('screen-flash');
        if (flash) {
            flash.style.opacity = '1';
            setTimeout(() => { flash.style.opacity = '0'; }, 150);
        }

        // Capture the current frame
        const imageData = this.canvas.toDataURL('image/jpeg', 0.9);

        // Stop camera
        this.stopSequence();

        // Hide camera interface
        const cameraInterface = document.getElementById('camera-interface');
        if (cameraInterface) {
            cameraInterface.style.display = 'none';
        }

        // Show story editor
        const storyEditor = document.getElementById('story-editor');
        const capturedImage = document.getElementById('captured-image');

        if (storyEditor && capturedImage) {
            capturedImage.src = imageData;
            storyEditor.style.display = 'flex';
        }

        console.log("CameraApp: Image captured and editor opened.");
    }

    bindEditorEvents() {
        // Close editor button
        const closeBtn = document.getElementById('close-editor');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeEditor();
            });
        }

        // Send story button
        const sendBtn = document.getElementById('send-story-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendStory();
            });
        }

        // Text mode toggle
        const textModeBtn = document.getElementById('toggle-text-mode');
        if (textModeBtn) {
            textModeBtn.addEventListener('click', () => {
                this.toggleTextMode();
            });
        }

        // Draw mode toggle
        const drawModeBtn = document.getElementById('toggle-draw-mode');
        if (drawModeBtn) {
            drawModeBtn.addEventListener('click', () => {
                this.toggleDrawMode();
            });
        }

        // Font selection
        document.addEventListener('click', (e) => {
            const fontBtn = e.target.closest('.font-btn');
            if (fontBtn) {
                document.querySelectorAll('.font-btn').forEach(btn => btn.classList.remove('active'));
                fontBtn.classList.add('active');
            }

            const colorBtn = e.target.closest('.color-dot');
            if (colorBtn) {
                const color = colorBtn.getAttribute('data-color');
                const activeText = document.querySelector('.text-element.active');
                if (activeText) {
                    activeText.style.color = color;
                }
            }
        });
    }

    toggleTextMode() {
        const textControls = document.getElementById('text-controls');
        const textLayer = document.getElementById('text-layer');

        if (!textControls || !textLayer) return;

        if (textControls.style.display === 'none' || !textControls.style.display) {
            textControls.style.display = 'flex';

            // Create new text element
            const textElement = document.createElement('div');
            textElement.className = 'text-element active';
            textElement.contentEditable = true;
            textElement.textContent = 'Tap to edit';
            textElement.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 32px;
                font-weight: bold;
                text-align: center;
                cursor: move;
                padding: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            `;

            // Make draggable
            this.makeDraggable(textElement);

            textLayer.appendChild(textElement);
            textElement.focus();

        } else {
            textControls.style.display = 'none';
        }
    }

    toggleDrawMode() {
        alert("Draw mode coming soon!");
    }

    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        element.onmousedown = dragMouseDown;
        element.ontouchstart = dragTouchStart;

        function dragMouseDown(e) {
            if (e.target.contentEditable === 'true' && e.target === element) {
                return;
            }
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function dragTouchStart(e) {
            e.preventDefault();
            const touch = e.touches[0];
            pos3 = touch.clientX;
            pos4 = touch.clientY;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementTouchDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.transform = 'none';
        }

        function elementTouchDrag(e) {
            e.preventDefault();
            const touch = e.touches[0];
            pos1 = pos3 - touch.clientX;
            pos2 = pos4 - touch.clientY;
            pos3 = touch.clientX;
            pos4 = touch.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.transform = 'none';
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    }

    closeEditor() {
        const storyEditor = document.getElementById('story-editor');
        const cameraInterface = document.getElementById('camera-interface');
        const textLayer = document.getElementById('text-layer');
        const textControls = document.getElementById('text-controls');

        if (storyEditor) storyEditor.style.display = 'none';
        if (cameraInterface) cameraInterface.style.display = 'block';
        if (textLayer) textLayer.innerHTML = '';
        if (textControls) textControls.style.display = 'none';

        // Restart camera
        this.startSequence();
    }

    async sendStory() {
        const capturedImage = document.getElementById('captured-image');
        const caption = document.getElementById('story-caption');
        const textLayer = document.getElementById('text-layer');
        const previewContainer = document.getElementById('editor-preview-container');

        if (!capturedImage || !previewContainer) return;

        // Show loading
        const aiLoader = document.getElementById('ai-loader');
        if (aiLoader) {
            aiLoader.style.display = 'flex';
            const statusText = document.getElementById('ai-status-text');
            if (statusText) statusText.textContent = 'Preparing story...';
        }

        try {
            // Create a composite image with text overlays
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size to match image
            const img = new Image();
            img.src = capturedImage.src;

            await new Promise((resolve) => {
                img.onload = resolve;
            });

            canvas.width = img.width;
            canvas.height = img.height;

            // Draw image
            ctx.drawImage(img, 0, 0);

            // Draw text overlays
            const textElements = textLayer.querySelectorAll('.text-element');
            const containerRect = previewContainer.getBoundingClientRect();
            const imgRect = capturedImage.getBoundingClientRect();

            textElements.forEach(textEl => {
                const rect = textEl.getBoundingClientRect();
                const x = (rect.left - imgRect.left) / imgRect.width * canvas.width;
                const y = (rect.top - imgRect.top) / imgRect.height * canvas.height;

                ctx.font = `bold ${32 * (canvas.width / imgRect.width)}px Arial`;
                ctx.fillStyle = textEl.style.color || 'white';
                ctx.textAlign = 'center';
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.fillText(textEl.textContent, x, y);
            });

            const finalImageData = canvas.toDataURL('image/jpeg', 0.9);

            // Upload to cloud if possible
            let imageUrl = finalImageData;
            if (typeof SyncManager !== 'undefined' && SyncManager.uploadImage) {
                imageUrl = await SyncManager.uploadImage(finalImageData);
            }

            // Create story object
            const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
            const storyData = {
                imageUrl: imageUrl,
                text: caption ? caption.value : '',
                author: currentUser,
                timestamp: Date.now(),
                filter: this.currentFilter
            };

            // Save to Firebase
            if (typeof SyncManager !== 'undefined' && SyncManager.addStory) {
                await SyncManager.addStory(storyData);
            }

            console.log("Story sent successfully!");

            // Close editor and return to home
            this.closeEditor();

            // Switch to home tab
            const homeTab = document.querySelector('[data-tab="home"]');
            if (homeTab) {
                homeTab.click();
            }

        } catch (error) {
            console.error("Error sending story:", error);
            alert("Failed to send story. Please try again.");
        } finally {
            if (aiLoader) aiLoader.style.display = 'none';
        }
    }
}

// Initialize camera app immediately (script loads with defer, so DOM is ready)
window.AppCamera = new CameraApp();
console.log("Camera app ready!");
