/**
 * CAMERA ENGINE with AR Effects - Professional Version 🔥
 * Advanced face tracking with smooth, animated effects & head rotation support
 */

class CameraApp {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.stream = null;
        this.isRunning = false;
        this.currentFilter = 'none';
        this.facingMode = 'user';

        // Face detection
        this.faceDetection = null;
        this.detectedFaces = [];

        // Smoothing for fluid animations
        this.smoothedFaces = [];
        this.smoothingFactor = 0.85; // High smoothing for stability

        // Animation frame counter
        this.frameCount = 0;

        // Particle system
        this.particles = [];

        console.log("CameraApp: Initialized with professional AR effects!");

        // Bind global functions
        window.startCamera = () => this.startSequence();
        window.stopCamera = () => this.stopSequence();
    }

    bindEvents() {
        const captureBtn = document.getElementById('capture-photo');
        const flipBtn = document.getElementById('flip-camera');
        const closeEditorBtn = document.getElementById('close-editor');

        if (captureBtn) {
            captureBtn.addEventListener('click', () => this.capturePhoto());
        }

        if (flipBtn) {
            flipBtn.addEventListener('click', () => this.flipCamera());
        }

        if (closeEditorBtn) {
            closeEditorBtn.addEventListener('click', () => this.closeEditor());
        }

        // Filter buttons
        document.querySelectorAll('.nav-filter-item').forEach(filterBtn => {
            filterBtn.addEventListener('click', () => {
                this.currentFilter = filterBtn.dataset.filter;
                document.querySelectorAll('.nav-filter-item').forEach(btn => {
                    btn.classList.remove('active');
                });
                filterBtn.classList.add('active');
            });
        });

        // Story editor events
        this.bindEditorEvents();
    }

    async initFaceDetection() {
        try {
            if (typeof FaceDetection === 'undefined') {
                console.warn('MediaPipe not loaded, face effects will be disabled');
                return false;
            }

            this.faceDetection = new FaceDetection({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
                }
            });

            this.faceDetection.setOptions({
                model: 'short',
                minDetectionConfidence: 0.5
            });

            this.faceDetection.onResults((results) => {
                this.detectedFaces = results.detections || [];
            });

            await this.faceDetection.initialize();
            console.log('Face detection initialized!');
            return true;
        } catch (error) {
            console.warn('Face detection init error:', error);
            return false;
        }
    }

    async startSequence() {
        console.log('Starting camera sequence...');

        this.video = document.getElementById('webcam');
        this.canvas = document.getElementById('camera-canvas');

        if (!this.video || !this.canvas) {
            console.error('Video or Canvas element not found');
            return;
        }

        this.ctx = this.canvas.getContext('2d');

        try {
            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            await new Promise(resolve => {
                this.video.onloadedmetadata = () => {
                    console.log('Video metadata loaded');
                    resolve();
                };
            });

            await this.video.play();

            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            this.isRunning = true;

            await this.initFaceDetection();

            this.renderLoop();

            console.log('Camera started successfully!');
        } catch (error) {
            console.error('Error starting camera:', error);
            alert('שגיאה בגישה למצלמה: ' + error.message);
        }
    }

    async stopSequence() {
        this.isRunning = false;

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.video) {
            this.video.srcObject = null;
        }

        console.log('Camera stopped');
    }

    renderLoop() {
        if (!this.isRunning) return;

        this.frameCount++;

        // Draw video frame
        this.ctx.save();
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.video, -this.canvas.width, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // Apply color filters
        this.applyColorFilter();

        // Send frame to face detection
        if (this.needsFaceDetection() && this.faceDetection) {
            this.faceDetection.send({ image: this.video });
        }

        // Draw face effects
        this.drawFaceEffects();

        requestAnimationFrame(() => this.renderLoop());
    }

    needsFaceDetection() {
        const faceEffects = ['sunglasses', 'bunny', 'hearts', 'rabbit', 'crown', 'dog'];
        return faceEffects.includes(this.currentFilter);
    }

    applyColorFilter() {
        if (this.currentFilter === 'galaxy') {
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, 'rgba(138, 43, 226, 0.15)');
            gradient.addColorStop(0.5, 'rgba(75, 0, 130, 0.15)');
            gradient.addColorStop(1, 'rgba(25, 25, 112, 0.15)');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.currentFilter === 'hope') {
            const gradient = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, 0,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
            );
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 140, 0, 0.2)');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.currentFilter === 'humanoid') {
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.08)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.currentFilter === 'makeup') {
            this.ctx.fillStyle = 'rgba(255, 182, 193, 0.12)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawFaceEffects() {
        if (!this.detectedFaces || this.detectedFaces.length === 0) return;

        // Smooth face positions AND landmarks to reduce jitter
        this.smoothedFaces = this.detectedFaces.map((det, idx) => {
            if (!det.boundingBox) return null;

            const prev = this.smoothedFaces[idx];
            const factor = this.smoothingFactor;
            const currentLandmarks = det.landmarks || [];

            // If no previous data, use current
            if (!prev || !prev.boundingBox) {
                return {
                    boundingBox: { ...det.boundingBox },
                    landmarks: currentLandmarks.map(lm => ({ ...lm }))
                };
            }

            // Smooth landmarks as well
            const prevLandmarks = prev.landmarks || [];
            const smoothedLandmarks = currentLandmarks.map((lm, i) => {
                const prevLm = prevLandmarks[i];
                if (!prevLm) return { ...lm };
                return {
                    x: prevLm.x * factor + lm.x * (1 - factor),
                    y: prevLm.y * factor + lm.y * (1 - factor),
                    z: (prevLm.z || 0) * factor + (lm.z || 0) * (1 - factor)
                };
            });

            return {
                boundingBox: {
                    xCenter: prev.boundingBox.xCenter * factor + det.boundingBox.xCenter * (1 - factor),
                    yCenter: prev.boundingBox.yCenter * factor + det.boundingBox.yCenter * (1 - factor),
                    width: prev.boundingBox.width * factor + det.boundingBox.width * (1 - factor),
                    height: prev.boundingBox.height * factor + det.boundingBox.height * (1 - factor)
                },
                landmarks: smoothedLandmarks
            };
        }).filter(f => f !== null);

        // Draw effects on each face
        this.smoothedFaces.forEach(detection => {
            const bbox = detection.boundingBox;
            if (!bbox) return;

            // Convert to canvas coords (mirrored)
            const x = (1 - bbox.xCenter) * this.canvas.width;
            const y = bbox.yCenter * this.canvas.height;
            const w = bbox.width * this.canvas.width;
            const h = bbox.height * this.canvas.height;

            const keypoints = detection.landmarks || [];

            switch (this.currentFilter) {
                case 'sunglasses':
                    this.drawSunglasses(x, y, w, h, keypoints);
                    break;
                case 'bunny':
                    this.drawBunnyEars(x, y, w, h, keypoints);
                    break;
                case 'hearts':
                    this.drawHeartEyes(x, y, w, h, keypoints);
                    break;
                case 'rabbit':
                    this.drawRabbit(x, y, w, h, keypoints);
                    break;
                case 'crown':
                    this.drawCrown(x, y, w, h, keypoints);
                    break;
                case 'dog':
                    this.drawDogFace(x, y, w, h, keypoints);
                    break;
            }
        });
    }

    // ==================== PRO AR EFFECTS WITH HEAD ROTATION ====================

    applyHeadRotation(landmarks, centerX, centerY) {
        if (!landmarks || landmarks.length < 6) return 0;

        const leftEye = landmarks[1];
        const rightEye = landmarks[0];

        const deltaY = rightEye.y - leftEye.y;
        const deltaX = rightEye.x - leftEye.x;

        const angle = Math.atan2(deltaY, -deltaX);

        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(-angle);
        this.ctx.translate(-centerX, -centerY);

        return angle;
    }

    drawSunglasses(x, y, w, h, landmarks) {
        this.ctx.save();

        let eyeY = y - h * 0.08;
        let centerX = x;
        let scale = 1;

        if (landmarks && landmarks.length >= 6) {
            const leftEye = landmarks[1];
            const rightEye = landmarks[0];

            const lx = (1 - leftEye.x) * this.canvas.width;
            const rx = (1 - rightEye.x) * this.canvas.width;
            const ly = leftEye.y * this.canvas.height;
            const ry = rightEye.y * this.canvas.height;

            eyeY = (ly + ry) / 2;
            centerX = (lx + rx) / 2;

            const dist = Math.hypot(lx - rx, ly - ry);
            scale = dist / (w * 0.4);

            this.applyHeadRotation(landmarks, centerX, eyeY);
        }

        const glassWidth = w * 0.42 * scale;
        const glassHeight = w * 0.22 * scale;
        const gap = w * 0.06 * scale;

        this.ctx.shadowColor = 'rgba(0,0,0,0.6)';
        this.ctx.shadowBlur = 20 * scale;
        this.ctx.shadowOffsetY = 10 * scale;

        const drawLens = (lx, ly) => {
            const grad = this.ctx.createLinearGradient(lx, ly - glassHeight / 2, lx, ly + glassHeight / 2);
            grad.addColorStop(0, '#2b32b2');
            grad.addColorStop(0.5, '#1488cc');
            grad.addColorStop(1, '#ec008c');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.moveTo(lx - glassWidth / 2, ly - glassHeight * 0.4);
            this.ctx.quadraticCurveTo(lx, ly - glassHeight * 0.5, lx + glassWidth / 2, ly - glassHeight * 0.4);
            this.ctx.bezierCurveTo(lx + glassWidth / 2 + 5, ly + glassHeight / 2, lx - glassWidth / 2 - 5, ly + glassHeight / 2, lx - glassWidth / 2, ly - glassHeight * 0.4);
            this.ctx.fill();
        };

        drawLens(centerX - glassWidth / 2 - gap / 2, eyeY);
        drawLens(centerX + glassWidth / 2 + gap / 2, eyeY);

        const drawFrame = (lx, ly) => {
            this.ctx.beginPath();
            this.ctx.moveTo(lx - glassWidth / 2, ly - glassHeight * 0.4);
            this.ctx.quadraticCurveTo(lx, ly - glassHeight * 0.5, lx + glassWidth / 2, ly - glassHeight * 0.4);
            this.ctx.bezierCurveTo(lx + glassWidth / 2 + 5, ly + glassHeight / 2, lx - glassWidth / 2 - 5, ly + glassHeight / 2, lx - glassWidth / 2, ly - glassHeight * 0.4);

            const strokeGrad = this.ctx.createLinearGradient(lx - 20, ly - 20, lx + 20, ly + 20);
            strokeGrad.addColorStop(0, '#DAA520');
            strokeGrad.addColorStop(0.4, '#FFD700');
            strokeGrad.addColorStop(0.6, '#FFFACD');
            strokeGrad.addColorStop(1, '#DAA520');

            this.ctx.strokeStyle = strokeGrad;
            this.ctx.lineWidth = 4 * scale;
            this.ctx.stroke();
        };

        this.ctx.shadowBlur = 0;
        drawFrame(centerX - glassWidth / 2 - gap / 2, eyeY);
        drawFrame(centerX + glassWidth / 2 + gap / 2, eyeY);

        this.ctx.beginPath();
        this.ctx.moveTo(centerX - gap / 2, eyeY - glassHeight * 0.3);
        this.ctx.quadraticCurveTo(centerX, eyeY - glassHeight * 0.5, centerX + gap / 2, eyeY - glassHeight * 0.3);
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3 * scale;
        this.ctx.stroke();

        this.ctx.globalCompositeOperation = 'overlay';
        const shimmer = (Math.sin(this.frameCount * 0.08) + 1) / 2;

        const drawGlint = (lx, ly) => {
            const glintGrad = this.ctx.createLinearGradient(lx - glassWidth / 2, ly - glassHeight, lx + glassWidth / 2, ly + glassHeight);
            glintGrad.addColorStop(0, 'rgba(255,255,255,0)');
            glintGrad.addColorStop(0.4 + shimmer * 0.2, 'rgba(255,255,255,0.6)');
            glintGrad.addColorStop(0.6 + shimmer * 0.2, 'rgba(255,255,255,0)');

            this.ctx.fillStyle = glintGrad;
            this.ctx.beginPath();
            this.ctx.moveTo(lx - glassWidth / 2, ly - glassHeight * 0.4);
            this.ctx.quadraticCurveTo(lx, ly - glassHeight * 0.5, lx + glassWidth / 2, ly - glassHeight * 0.4);
            this.ctx.bezierCurveTo(lx + glassWidth / 2 + 5, ly + glassHeight / 2, lx - glassWidth / 2 - 5, ly + glassHeight / 2, lx - glassWidth / 2, ly - glassHeight * 0.4);
            this.ctx.fill();
        };

        drawGlint(centerX - glassWidth / 2 - gap / 2, eyeY);
        drawGlint(centerX + glassWidth / 2 + gap / 2, eyeY);

        this.ctx.restore();
    }

    drawBunnyEars(x, y, w, h, landmarks) {
        this.ctx.save();

        let earY = y - h * 0.8;
        let centerX = x;
        let scale = 1;

        if (landmarks && landmarks.length >= 6) {
            const leftEye = landmarks[1];
            const rightEye = landmarks[0];
            const nose = landmarks[2];

            const lx = (1 - leftEye.x) * this.canvas.width;
            const rx = (1 - rightEye.x) * this.canvas.width;
            const ly = leftEye.y * this.canvas.height;
            const ry = rightEye.y * this.canvas.height;
            const ny = nose.y * this.canvas.height;

            centerX = (lx + rx) / 2;
            const noseToEyeDist = Math.abs(ny - (ly + ry) / 2);
            earY = (ly + ry) / 2 - (noseToEyeDist * 3.2);

            const dist = Math.hypot(lx - rx, ly - ry);
            scale = dist / (w * 0.4);

            this.applyHeadRotation(landmarks, centerX, earY);
        }

        const earHeight = h * 1.5 * scale;
        const earWidth = w * 0.25 * scale;
        const wobble = Math.sin(this.frameCount * 0.1) * 0.03;

        const drawFurryEar = (ex, ey, rot) => {
            this.ctx.save();
            this.ctx.translate(ex, ey);
            this.ctx.rotate(rot);

            this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
            this.ctx.shadowBlur = 15;

            const outerGrad = this.ctx.createLinearGradient(-earWidth / 2, 0, earWidth / 2, 0);
            outerGrad.addColorStop(0, '#f0f0f0');
            outerGrad.addColorStop(0.5, '#ffffff');
            outerGrad.addColorStop(1, '#e0e0e0');

            this.ctx.fillStyle = outerGrad;
            this.ctx.beginPath();
            this.ctx.ellipse(0, -earHeight / 2, earWidth / 2, earHeight / 2, 0, 0, Math.PI);
            this.ctx.lineTo(earWidth / 2, earHeight * 0.1);
            this.ctx.quadraticCurveTo(0, earHeight * 0.2, -earWidth / 2, earHeight * 0.1);
            this.ctx.fill();

            const innerGrad = this.ctx.createRadialGradient(0, -earHeight * 0.3, 10, 0, -earHeight * 0.3, earWidth * 0.6);
            innerGrad.addColorStop(0, '#ffdde1');
            innerGrad.addColorStop(1, '#ff9a9e');

            this.ctx.fillStyle = innerGrad;
            this.ctx.shadowBlur = 0;
            this.ctx.beginPath();
            this.ctx.ellipse(0, -earHeight * 0.35, earWidth * 0.25, earHeight * 0.35, 0, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        };

        drawFurryEar(centerX - w * 0.2 * scale, earY, -0.2 + wobble);
        drawFurryEar(centerX + w * 0.2 * scale, earY, 0.2 - wobble);

        this.ctx.restore();
        this.drawBunnyFaceDetails(x, y, w, h, landmarks, scale);
    }

    drawBunnyFaceDetails(x, y, w, h, landmarks, scale) {
        if (!landmarks || landmarks.length < 6) return;
        this.ctx.save();

        const nose = landmarks[2];
        const nx = (1 - nose.x) * this.canvas.width;
        const ny = nose.y * this.canvas.height;

        this.applyHeadRotation(landmarks, nx, ny);

        this.ctx.fillStyle = '#ffb7b2';
        this.ctx.beginPath();
        this.ctx.ellipse(nx, ny, w * 0.05 * scale, w * 0.035 * scale, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2 * scale;

        const drawWhisker = (ang) => {
            this.ctx.beginPath();
            this.ctx.moveTo(nx + (Math.cos(ang) * 10 * scale), ny + (Math.sin(ang) * 5 * scale));
            this.ctx.lineTo(nx + (Math.cos(ang) * 80 * scale), ny + (Math.sin(ang) * 30 * scale));
            this.ctx.stroke();
        };

        drawWhisker(Math.PI - 0.2);
        drawWhisker(Math.PI);
        drawWhisker(Math.PI + 0.2);
        drawWhisker(0.2);
        drawWhisker(0);
        drawWhisker(-0.2);

        this.ctx.restore();
    }

    drawHeartEyes(x, y, w, h, landmarks) {
        this.ctx.save();

        let eyeY = y, centerX = x, scale = 1, lx = x - 50, rx = x + 50;

        if (landmarks && landmarks.length >= 6) {
            const leftEye = landmarks[1];
            const rightEye = landmarks[0];
            lx = (1 - leftEye.x) * this.canvas.width;
            rx = (1 - rightEye.x) * this.canvas.width;
            const ly = leftEye.y * this.canvas.height;
            const ry = rightEye.y * this.canvas.height;

            eyeY = (ly + ry) / 2;
            centerX = (lx + rx) / 2;
            const dist = Math.hypot(lx - rx, ly - ry);
            scale = dist / (w * 0.4);

            this.applyHeadRotation(landmarks, centerX, eyeY);
        }

        const size = w * 0.2 * scale;
        const pulse = 1 + Math.sin(this.frameCount * 0.2) * 0.15;

        const draw3DHeart = (hx, hy) => {
            const hSize = size * pulse;

            this.ctx.shadowColor = '#ff3366';
            this.ctx.shadowBlur = 30;

            const grad = this.ctx.createLinearGradient(hx - hSize, hy - hSize, hx + hSize, hy + hSize);
            grad.addColorStop(0, '#ff5e62');
            grad.addColorStop(1, '#ff9966');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            const topCurveHeight = hSize * 0.3;
            this.ctx.moveTo(hx, hy + topCurveHeight);
            this.ctx.bezierCurveTo(hx, hy, hx - hSize / 2, hy - hSize / 2, hx - hSize, hy + topCurveHeight);
            this.ctx.bezierCurveTo(hx - hSize, hy + hSize / 2, hx, hy + hSize * 1.2, hx, hy + hSize * 1.5);
            this.ctx.bezierCurveTo(hx, hy + hSize * 1.2, hx + hSize, hy + hSize / 2, hx + hSize, hy + topCurveHeight);
            this.ctx.bezierCurveTo(hx + hSize, hy - hSize / 2, hx + hSize / 2, hy, hx, hy + topCurveHeight);
            this.ctx.fill();

            this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
            this.ctx.shadowBlur = 0;
            this.ctx.beginPath();
            this.ctx.ellipse(hx - hSize * 0.4, hy + hSize * 0.2, hSize * 0.15, hSize * 0.08, 0.5, 0, Math.PI * 2);
            this.ctx.fill();
        };

        draw3DHeart(lx, eyeY);
        draw3DHeart(rx, eyeY);

        this.drawLoveParticles(centerX, eyeY - 100 * scale, scale);

        this.ctx.restore();
    }

    drawLoveParticles(x, y, scale) {
        if (!this.particles) this.particles = [];

        if (this.frameCount % 5 === 0) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 200 * scale,
                y: y,
                size: Math.random() * 10 + 5,
                speed: Math.random() * 2 + 1,
                alpha: 1
            });
        }

        this.particles.forEach((p, i) => {
            p.y -= p.speed;
            p.alpha -= 0.01;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                return;
            }

            this.ctx.fillStyle = `rgba(255, 105, 180, ${p.alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * scale, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawRabbit(x, y, w, h, landmarks) {
        this.drawBunnyEars(x, y, w, h, landmarks);

        if (!landmarks) return;
        this.ctx.save();

        const nose = landmarks[2];
        const nx = (1 - nose.x) * this.canvas.width;
        const ny = nose.y * this.canvas.height;

        const drawCheek = (offset, w_val) => {
            const cx = nx + offset * w_val * 0.2;
            const cy = ny + w_val * 0.05;

            const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, w_val * 0.15);
            grad.addColorStop(0, 'rgba(255, 192, 203, 0.6)');
            grad.addColorStop(1, 'rgba(255, 192, 203, 0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, w_val * 0.15, 0, Math.PI * 2);
            this.ctx.fill();
        };

        this.applyHeadRotation(landmarks, nx, ny);
        drawCheek(-1, w);
        drawCheek(1, w);

        this.ctx.restore();
    }

    drawCrown(x, y, w, h, landmarks) {
        this.ctx.save();

        let crownY = y - h * 0.8;
        let centerX = x;
        let scale = 1;

        if (landmarks && landmarks.length >= 6) {
            const leftEye = landmarks[1];
            const rightEye = landmarks[0];
            const nose = landmarks[2];

            const lx = (1 - leftEye.x) * this.canvas.width;
            const rx = (1 - rightEye.x) * this.canvas.width;
            const ly = leftEye.y * this.canvas.height;
            const ry = rightEye.y * this.canvas.height;
            const ny = nose.y * this.canvas.height;

            centerX = (lx + rx) / 2;
            const noseToEyeDist = Math.abs(ny - (ly + ry) / 2);
            crownY = (ly + ry) / 2 - (noseToEyeDist * 3.5);

            const dist = Math.hypot(lx - rx, ly - ry);
            scale = dist / (w * 0.4);

            this.applyHeadRotation(landmarks, centerX, crownY);
        }

        const crownW = w * 0.8 * scale;
        const crownH = h * 0.5 * scale;

        this.ctx.shadowColor = '#FFD700';
        this.ctx.shadowBlur = 40;

        const grad = this.ctx.createLinearGradient(centerX - crownW / 2, crownY, centerX + crownW / 2, crownY + crownH);
        grad.addColorStop(0, '#BF953F');
        grad.addColorStop(0.3, '#FCF6BA');
        grad.addColorStop(0.5, '#FBF5B7');
        grad.addColorStop(0.7, '#B38728');
        grad.addColorStop(1, '#AA771C');

        this.ctx.fillStyle = grad;
        this.ctx.strokeStyle = '#8a6e28';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(centerX - crownW / 2, crownY + crownH);
        this.ctx.lineTo(centerX + crownW / 2, crownY + crownH);
        this.ctx.lineTo(centerX + crownW / 2, crownY + crownH * 0.4);
        this.ctx.lineTo(centerX + crownW / 3, crownY + crownH * 0.6);
        this.ctx.lineTo(centerX + crownW / 6, crownY);
        this.ctx.lineTo(centerX, crownY + crownH * 0.5);
        this.ctx.lineTo(centerX - crownW / 6, crownY);
        this.ctx.lineTo(centerX - crownW / 3, crownY + crownH * 0.6);
        this.ctx.lineTo(centerX - crownW / 2, crownY + crownH * 0.4);
        this.ctx.closePath();

        this.ctx.fill();
        this.ctx.stroke();

        const drawJewel = (jx, jy, color, size) => {
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(jx, jy, size, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(jx - size * 0.3, jy - size * 0.3, size * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
        };

        const twinkle = Math.sin(this.frameCount * 0.15) > 0.8;

        drawJewel(centerX, crownY + crownH * 0.75, '#DC143C', crownW * 0.08);
        drawJewel(centerX - crownW / 3.5, crownY + crownH * 0.75, '#0F52BA', crownW * 0.06);
        drawJewel(centerX + crownW / 3.5, crownY + crownH * 0.75, '#50C878', crownW * 0.06);

        if (twinkle) {
            this.ctx.shadowColor = 'white';
            this.ctx.shadowBlur = 30;
        }
        drawJewel(centerX - crownW / 6, crownY, '#FFFFFF', crownW * 0.04);
        drawJewel(centerX + crownW / 6, crownY, '#FFFFFF', crownW * 0.04);

        this.ctx.restore();
    }

    drawDogFace(x, y, w, h, landmarks) {
        this.ctx.save();

        let centerX = x, noseX = x, noseY = y, scale = 1;

        if (landmarks && landmarks.length >= 6) {
            const leftEye = landmarks[1];
            const rightEye = landmarks[0];
            const nose = landmarks[2];

            const lx = (1 - leftEye.x) * this.canvas.width;
            const rx = (1 - rightEye.x) * this.canvas.width;
            const ly = leftEye.y * this.canvas.height;
            const ry = rightEye.y * this.canvas.height;

            centerX = (lx + rx) / 2;
            noseX = (1 - nose.x) * this.canvas.width;
            noseY = nose.y * this.canvas.height;

            const dist = Math.hypot(lx - rx, ly - ry);
            scale = dist / (w * 0.4);

            this.applyHeadRotation(landmarks, centerX, noseY);
        }

        const earSize = w * 0.4 * scale;
        const earY = noseY - h * 0.6 * scale;

        const drawEar = (deg, ex, ey) => {
            this.ctx.save();
            this.ctx.translate(ex, ey);
            this.ctx.rotate(deg);

            const earGrad = this.ctx.createLinearGradient(0, 0, 0, earSize);
            earGrad.addColorStop(0, '#8B4513');
            earGrad.addColorStop(1, '#A0522D');

            this.ctx.fillStyle = earGrad;
            this.ctx.ellipse(0, 0, earSize * 0.6, earSize, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        };

        drawEar(-0.4, centerX - w * 0.35 * scale, earY);
        drawEar(0.4, centerX + w * 0.35 * scale, earY);

        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.beginPath();
        const nSize = w * 0.12 * scale;
        this.ctx.moveTo(noseX - nSize, noseY - nSize * 0.5);
        this.ctx.quadraticCurveTo(noseX, noseY - nSize * 0.8, noseX + nSize, noseY - nSize * 0.5);
        this.ctx.quadraticCurveTo(noseX, noseY + nSize, noseX - nSize, noseY - nSize * 0.5);
        this.ctx.fill();

        this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
        this.ctx.beginPath();
        this.ctx.ellipse(noseX - nSize * 0.3, noseY - nSize * 0.2, nSize * 0.3, nSize * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();

        const tongueLen = (Math.sin(this.frameCount * 0.15) * 0.5 + 0.5) * (h * 0.15 * scale);

        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.beginPath();
        const tY = noseY + nSize;
        this.ctx.moveTo(noseX - nSize * 0.6, tY);
        this.ctx.quadraticCurveTo(noseX, tY + nSize * 2 + tongueLen, noseX + nSize * 0.6, tY);
        this.ctx.fill();

        this.ctx.strokeStyle = '#D64545';
        this.ctx.beginPath();
        this.ctx.moveTo(noseX, tY + nSize * 0.5);
        this.ctx.lineTo(noseX, tY + nSize * 1.5 + tongueLen * 0.8);
        this.ctx.stroke();

        this.ctx.restore();
    }

    // ==================== CAPTURE & EDITING ====================

    capturePhoto() {
        const imageDataUrl = this.canvas.toDataURL('image/png');

        // Flash effect
        const flashDiv = document.createElement('div');
        flashDiv.className = 'screen-flash';
        flashDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:9999;pointer-events:none;';
        document.body.appendChild(flashDiv);
        setTimeout(() => flashDiv.remove(), 300);

        // Open the new Photo Editor
        if (window.openPhotoEditor) {
            console.log('Opening Photo Editor...');
            window.openPhotoEditor(imageDataUrl);
        } else {
            // Fallback to old editor
            console.log('Photo Editor not found, using fallback...');
            const captureImg = document.getElementById('captured-image');
            const textLayer = document.getElementById('text-layer');
            const editorSection = document.getElementById('story-editor');
            const cameraOverlay = document.getElementById('camera-overlay');

            if (captureImg && editorSection) {
                captureImg.src = imageDataUrl;
                if (textLayer) textLayer.innerHTML = '';
                editorSection.style.display = 'flex';
                if (cameraOverlay) cameraOverlay.style.display = 'none';
            }
        }
    }

    closeEditor() {
        const editorSection = document.getElementById('story-editor');
        const cameraOverlay = document.getElementById('camera-overlay');

        if (editorSection && cameraOverlay) {
            editorSection.style.display = 'none';
            cameraOverlay.style.display = 'flex';
        }
    }

    flipCamera() {
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        this.stopSequence();
        setTimeout(() => this.startSequence(), 100);
    }

    bindEditorEvents() {
        const addTextBtn = document.getElementById('add-text-btn');
        const sendStoryBtn = document.getElementById('send-story-btn');

        if (addTextBtn) {
            addTextBtn.addEventListener('click', () => this.addTextToStory());
        }

        if (sendStoryBtn) {
            sendStoryBtn.addEventListener('click', () => this.sendStory());
        }

        const fontBtns = document.querySelectorAll('.font-option');
        fontBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedText = document.querySelector('.text-item.selected');
                if (selectedText) {
                    selectedText.style.fontFamily = btn.dataset.font;
                }
            });
        });
    }

    addTextToStory() {
        const textLayer = document.getElementById('text-layer');

        const textItem = document.createElement('div');
        textItem.className = 'text-item';
        textItem.contentEditable = true;
        textItem.textContent = 'טקסט חדש';
        textItem.style.left = '50%';
        textItem.style.top = '50%';

        textLayer.appendChild(textItem);

        textItem.addEventListener('mousedown', (e) => this.startDrag(e, textItem));
        textItem.addEventListener('touchstart', (e) => this.startDrag(e, textItem));

        textItem.addEventListener('click', () => {
            document.querySelectorAll('.text-item').forEach(t => t.classList.remove('selected'));
            textItem.classList.add('selected');
        });

        textItem.focus();
    }

    startDrag(e, element) {
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const rect = element.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;

        const onMove = (moveEvent) => {
            const moveX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const moveY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;

            element.style.left = (moveX - offsetX) + 'px';
            element.style.top = (moveY - offsetY) + 'px';
        };

        const onEnd = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchend', onEnd);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
    }

    async sendStory() {
        const capturedImage = document.getElementById('captured-image');
        const textLayer = document.getElementById('text-layer');

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = capturedImage.naturalWidth;
        tempCanvas.height = capturedImage.naturalHeight;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(capturedImage, 0, 0);

        const textItems = textLayer.querySelectorAll('.text-item');
        textItems.forEach(item => {
            const text = item.textContent;
            const style = window.getComputedStyle(item);
            const fontSize = parseInt(style.fontSize);
            const fontFamily = style.fontFamily;

            tempCtx.font = `${fontSize}px ${fontFamily}`;
            tempCtx.fillStyle = style.color;
            tempCtx.textAlign = 'center';

            const x = parseInt(item.style.left);
            const y = parseInt(item.style.top);

            tempCtx.fillText(text, x, y);
        });

        const finalImageDataUrl = tempCanvas.toDataURL('image/png');

        try {
            const currentUser = localStorage.getItem('currentUser');
            const timestamp = Date.now();

            if (typeof firebase !== 'undefined' && firebase.storage) {
                const storageRef = firebase.storage().ref();
                const imageRef = storageRef.child(`stories/${currentUser}/${timestamp}.png`);

                await imageRef.putString(finalImageDataUrl, 'data_url');
                const downloadURL = await imageRef.getDownloadURL();

                const dbRef = firebase.database().ref('stories');
                await dbRef.push({
                    user: currentUser,
                    imageUrl: downloadURL,
                    timestamp: timestamp,
                    viewedBy: {}
                });

                alert('הסטורי נשלח בהצלחה!');
                this.closeEditor();
            } else {
                console.log('Story data (offline mode):', finalImageDataUrl.substring(0, 100));
                alert('הסטורי נשמר (מצב לא מקוון)');
                this.closeEditor();
            }
        } catch (error) {
            console.error('Error sending story:', error);
            alert('שגיאה בשליחת הסטורי');
        }
    }

    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }
}

// Initialize on load
window.AppCamera = new CameraApp();
window.AppCamera.bindEvents();
console.log('Camera app ready!');
