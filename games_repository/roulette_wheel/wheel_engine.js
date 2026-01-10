/**
 * KINGDOM CHRONOS - ULTIMATE WHEEL ENGINE
 * 
 * Architecture:
 * 1. PhysicsController: Handles inertia, friction, velocity, and time-delta integration.
 * 2. RenderEngine: Handles high-DPI canvas drawing, arc calculations, and visual effects.
 * 3. GameLogic: Handles probabilities, state management (Idle, Spin, Win), and inputs.
 * 4. UXController: Handles particles, modal feedbacks, and haptics (visual).
 */

class WheelEngine {
    constructor() {
        // --- CONFIG & STATE ---
        this.canvas = document.getElementById('wheel-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: true }); // Standard 2D context

        this.width = 0;
        this.height = 0;
        this.centerX = 0;
        this.centerY = 0;
        this.radius = 0;

        this.rawSegmentsData = ["Passion", "Adventure", "Mystery", "Romance", "Fortune", "Wisdom"]; // Default Data
        this.segments = []; // Processed Objects

        // Kingdom Gradients (Updated for Roulette/Casino feel)
        // Red, Black, Green(for Zeros usually) - but mapped to user inputs
        this.palette = [
            ['#8a1c1c', '#600e0e'], // Classic Red
            ['#222222', '#0a0a0a'], // Classic Black
            ['#1c6028', '#0e3012'], // Classic Green
            ['#8a1c1c', '#600e0e'], // Red
            ['#222222', '#0a0a0a']  // Black
        ];

        // --- PHYSICS VARS ---
        this.angle = 0; // Current rotation in Radians
        this.velocity = 0; // Current Anglular Velocity (Rad/Frame)
        this.friction = 0.985; // Heavier friction (Wood wheel)
        this.isSpinning = false;
        this.isStopping = false;

        // --- UX VARS ---
        this.needle = document.getElementById('needle');
        this.victoryModal = document.getElementById('victory-modal');
        this.victoryText = document.getElementById('victory-text');
        this.spinBtn = document.getElementById('spin-trigger');
        this.statusLabel = document.getElementById('status-label');

        // --- CONFIG VARS ---
        this.configPanel = document.getElementById('config-panel');
        this.segmentsContainer = document.getElementById('segments-container');

        // --- BINDINGS ---
        this.init();
        this.setupEvents();

        // --- LOOP ---
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    init() {
        this.resize();
        this.renderConfigInputs(); // Setup initial UI
        this.loadConfigFromUI(); // Sync logic to UI
    }

    setupEvents() {
        window.addEventListener('resize', () => this.resize());
        this.spinBtn.addEventListener('click', () => this.spin());

        document.getElementById('update-wheel').addEventListener('click', () => this.loadConfigFromUI());
        document.getElementById('add-segment-btn').addEventListener('click', () => this.addSegmentUI());
        document.getElementById('claim-btn').addEventListener('click', () => this.reset());
        document.getElementById('toggle-config').addEventListener('click', () => {
            this.configPanel.classList.toggle('minimized');
        });
    }

    // --- DYNAMIC CONFIG UI MANAGEMENT ---

    renderConfigInputs() {
        this.segmentsContainer.innerHTML = ''; // Clear
        this.rawSegmentsData.forEach((text, index) => {
            this.createInputRow(text, index);
        });
    }

    createInputRow(value = "", index = null) {
        const row = document.createElement('div');
        row.className = 'segment-row';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.className = 'glass-input';
        input.placeholder = 'Enter text...';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-segment-btn';
        removeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
        removeBtn.onclick = () => {
            row.remove();
        };

        row.appendChild(input);
        row.appendChild(removeBtn);
        this.segmentsContainer.appendChild(row);

        // Scroll to bottom if added
        this.segmentsContainer.scrollTop = this.segmentsContainer.scrollHeight;
    }

    addSegmentUI() {
        this.createInputRow("New Option");
    }

    loadConfigFromUI() {
        // Read DOM inputs
        const inputs = this.segmentsContainer.querySelectorAll('input');
        const newSegments = [];
        inputs.forEach(input => {
            if (input.value.trim().length > 0) {
                newSegments.push(input.value.trim());
            }
        });

        if (newSegments.length === 0) {
            alert("Warning: Wheel cannot be empty!");
            return;
        }

        // Update Internal Data
        this.rawSegmentsData = newSegments;

        // Rebuild Segments Objects
        const arcSize = (Math.PI * 2) / this.rawSegmentsData.length;
        this.segments = this.rawSegmentsData.map((label, i) => ({
            label: label,
            id: i,
            gradient: this.palette[i % this.palette.length],
            index: i
        }));

        this.arcSize = arcSize;
        this.draw(); // Force render
    }

    resize() {
        // FIX: Instead of measuring the DOM element (which is skewed by 3D transform),
        // we use a fixed logical size that matches the CSS definition.
        // The CSS defines the wrapper as 600x600 (approx), and inner canvas as 580x580.
        // We force the internal canvas resolution to match this square aspect ratio.

        const LOGICAL_SIZE = 580; // Matches CSS #wheel-canvas width/height
        const dpr = window.devicePixelRatio || 1;

        this.width = LOGICAL_SIZE;
        this.height = LOGICAL_SIZE;

        // Physical Resolution
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;

        // We do NOT set style.width/height here mainly because CSS handles it absolutely.
        // If we did, we'd need to ensure we don't break the CSS absolute positioning.

        // Normalize coordinates system
        this.ctx.scale(dpr, dpr);

        // Recalculate geometric center
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.radius = (this.width / 2) - 10; // Padding inside the canvas

        this.draw();
    }

    // --- PHYSICS ENGINE ---

    spin() {
        if (this.isSpinning) return;
        if (this.segments.length < 2) {
            alert("Add at least 2 segments!");
            return;
        }

        this.isSpinning = true;
        this.isStopping = false;
        this.configPanel.classList.add('minimized'); // Auto hide config

        // EXPLOSIVE START: Random high velocity
        // Range: 0.3 to 0.6 rad/frame approx
        this.velocity = (Math.random() * 0.3) + 0.4;

        this.spinBtn.disabled = true;

        // Kick visual bumper
        this.needle.style.transform = `translateX(-50%) rotateX(-40deg) skewX(20deg)`;
        setTimeout(() => {
            this.needle.style.transform = `translateX(-50%) rotateX(-40deg)`;
        }, 300);
    }

    updatePhysics() {
        if (!this.isSpinning) return;

        // Integration
        this.angle += this.velocity;
        this.angle %= (Math.PI * 2); // Keep normalized 0-2PI

        // Friction Application
        if (this.velocity > 0) {
            this.velocity *= this.friction;
        }

        // Logic: Stop Condition
        if (this.velocity < 0.002 && this.velocity > 0) {
            this.isStopping = true;
        }

        if (this.velocity < 0.0005) {
            this.velocity = 0;
            this.isSpinning = false;
            this.finalizeResult();
        }

        // Needle Physics (Visual only - simulated bounce based on segment passing)
        if (this.velocity > 0.05) {
            const tremor = Math.sin(Date.now() / 20) * (this.velocity * 5); // Scale shake by speed
            this.needle.style.transform = `translateX(-50%) rotateX(-40deg) rotateZ(${tremor}deg)`;
        } else {
            this.needle.style.transform = `translateX(-50%) rotateX(-40deg)`;
        }
    }

    finalizeResult() {
        // Calculate Winner (Pointer at Top / -90deg)
        let currentRotation = this.angle;

        const effectiveAngle = ((Math.PI * 2) - currentRotation - (Math.PI / 2)) % (Math.PI * 2);
        const positiveAngle = effectiveAngle < 0 ? effectiveAngle + (Math.PI * 2) : effectiveAngle;

        const winningIndex = Math.floor(positiveAngle / this.arcSize);
        const winner = this.segments[winningIndex];

        // UX Feedback
        setTimeout(() => {
            this.triggerWin(winner);
        }, 500);
    }

    triggerWin(winner) {
        if (!winner) return; // safety
        this.victoryText.textContent = winner.label;
        this.victoryModal.classList.add('active');

        // Start Particles
        if (!this.particleSystem) {
            this.particleSystem = new ParticleEngine();
        }
        this.particleSystem.explode();
    }

    reset() {
        this.victoryModal.classList.remove('active');
        this.spinBtn.disabled = false;
        if (this.particleSystem) this.particleSystem.stop();
        this.configPanel.classList.remove('minimized'); // Bring back config
    }

    updateStatus(text, color) {
        if (!this.statusLabel) return;
        this.statusLabel.innerText = text;
        this.statusLabel.previousElementSibling.style.backgroundColor = color;
        this.statusLabel.previousElementSibling.style.boxShadow = `0 0 10px ${color}`;
    }

    // --- RENDER ENGINE ---

    gameLoop(timestamp) {
        this.updatePhysics();
        this.draw();

        if (this.particleSystem && this.particleSystem.active) {
            this.particleSystem.update();
            this.particleSystem.draw();
        }

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    draw() {
        // Clear
        this.ctx.clearRect(0, 0, this.width, this.height);

        if (this.segments.length === 0) return;

        this.ctx.save();

        // Move to center
        this.ctx.translate(this.centerX, this.centerY);

        // Apply Physics Rotation
        this.ctx.rotate(this.angle);

        // DRAW SEGMENTS
        this.segments.forEach((seg, i) => {
            const startAng = i * this.arcSize;
            const endAng = startAng + this.arcSize;

            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, this.radius, startAng, endAng);
            this.ctx.closePath();

            // Gradient Fill
            const grd = this.ctx.createLinearGradient(0, 0, this.radius * Math.cos(startAng + this.arcSize / 2), this.radius * Math.sin(startAng + this.arcSize / 2));
            grd.addColorStop(0, seg.gradient[0]);
            grd.addColorStop(1, seg.gradient[1]);
            this.ctx.fillStyle = grd;
            this.ctx.fill();

            // Gold Separator Lines (3D Ridge Effect)
            // 1. Dark Shadow base
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(this.radius * Math.cos(endAng), this.radius * Math.sin(endAng));
            this.ctx.strokeStyle = '#5a461b'; // Darker Gold Shadow
            this.ctx.lineWidth = 5;
            this.ctx.stroke();

            // 2. Main Gold Body
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(this.radius * Math.cos(endAng), this.radius * Math.sin(endAng));
            this.ctx.strokeStyle = '#b38728'; // Gold
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // 3. Highlight Top
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(this.radius * Math.cos(endAng), this.radius * Math.sin(endAng));
            this.ctx.strokeStyle = '#fcf6ba'; // Bright Gold Highlight
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // DRAW TEXT
            this.ctx.save();
            this.ctx.rotate(startAng + this.arcSize / 2);
            this.ctx.textAlign = "right";
            this.ctx.fillStyle = "#fff"; // White text

            // Text Emboss Effect
            this.ctx.shadowColor = "rgba(0,0,0,0.8)";
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetX = 1;
            this.ctx.shadowOffsetY = 1;

            // Typography Auto-Scaling
            const availableWidth = this.radius * 0.60;
            let fontSize = 28;
            this.ctx.font = `bold ${fontSize}px "Playfair Display", serif`;

            // Smart Shrink
            while (this.ctx.measureText(seg.label).width > availableWidth && fontSize > 10) {
                fontSize--;
                this.ctx.font = `bold ${fontSize}px "Playfair Display", serif`;
            }

            this.ctx.fillText(seg.label, this.radius - 20, 8);

            this.ctx.restore();
        });

        // Inner Gold Ring (Hides the center connection points)
        // Base Shadow
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 72, 0, Math.PI * 2);
        this.ctx.fillStyle = '#5a461b'; // Dark shadow ring
        this.ctx.fill();

        // Main Gold Ring
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 70, 0, Math.PI * 2);
        const ringGrad = this.ctx.createLinearGradient(-70, -70, 70, 70);
        ringGrad.addColorStop(0, '#bf953f');
        ringGrad.addColorStop(0.5, '#fcf6ba');
        ringGrad.addColorStop(1, '#bf953f');
        this.ctx.fillStyle = ringGrad;
        this.ctx.fill();

        // Inner Center (Darker to simulate depth/hole for turret)
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 65, 0, Math.PI * 2);
        this.ctx.fillStyle = '#1a0b05'; // Dark hole
        this.ctx.fill();

        this.ctx.restore();

        // Glossy Overlay (Static Reflection acting as varnish)
        const shine = this.ctx.createRadialGradient(this.centerX - 100, this.centerY - 100, 20, this.centerX, this.centerY, this.radius);
        shine.addColorStop(0, "rgba(255,255,255,0.05)"); // Subtle shine
        shine.addColorStop(0.5, "transparent");
        shine.addColorStop(1, "rgba(0,0,0,0.3)"); // Edge shadow

        this.ctx.fillStyle = shine;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

/**
 * MICRO-ENGINE FOR PARTICLE SYSTEM
 */
class ParticleEngine {
    constructor() {
        this.canvas = document.getElementById('particle-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.active = false;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    explode() {
        this.active = true;
        this.particles = [];
        // Create gold particles
        for (let i = 0; i < 150; i++) {
            this.particles.push({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                size: Math.random() * 6 + 2,
                color: Math.random() > 0.5 ? '#bf953f' : '#fcf6ba', // Gold/White mix
                life: 1.0,
                decay: 0.01 + Math.random() * 0.02
            });
        }
    }

    update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravity
            p.vx *= 0.95; // Air resistance
            p.life -= p.decay;

            if (p.life <= 0) {
                this.particles.splice(index, 1);
            }
        });

        if (this.particles.length === 0) {
            this.active = false;
        }
    }

    draw() {
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }

    stop() {
        this.active = false;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// --- INITIALIZE MASTER SYSTEM ---
document.addEventListener('DOMContentLoaded', () => {
    window.KingdomWheel = new WheelEngine();
});
