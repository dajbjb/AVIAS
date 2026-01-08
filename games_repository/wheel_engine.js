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

        this.palette = [
            ['#2c3e50', '#4ca1af'], // Mystery
            ['#141E30', '#243B55'], // Royal
            ['#42275a', '#734b6d'], // Passion
            ['#1f4037', '#99f2c8'], // Nature
            ['#c21500', '#ffc500'], // Fortune (Gold/Red)
            ['#000046', '#1CB5E0']  // Ice
        ];

        // --- PHYSICS VARS ---
        this.angle = 0; // Current rotation in Radians
        this.velocity = 0; // Current Anglular Velocity (Rad/Frame)
        this.friction = 0.99; // Damping (0.99 = 1% loss per frame)
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
            // Optional: Auto update or wait for update button? 
            // Better wait for manual update to avoid refreshing wheel while typing/editing
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

        // Feedback
        this.updateStatus("CONFIG UPDATED", "#E5E4E2");
    }

    resize() {
        const container = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;

        // Get physical pixel size
        const rect = container.getBoundingClientRect();

        this.width = rect.width;
        this.height = rect.height;

        // scale canvas for retina
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;

        // Normalize coordinates system
        this.ctx.scale(dpr, dpr);

        // Recalculate geometric center
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.radius = (Math.min(this.width, this.height) / 2) - 20; // 20px padding

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
        this.updateStatus("ACCELERATING", "#00d2ff");

        // Kick visual bumper
        this.needle.style.transform = `translateX(-50%) rotate(-30deg)`;
        setTimeout(() => {
            this.needle.style.transform = `translateX(-50%) rotate(0deg)`;
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
        // If velocity is super low, we snap to grid or stop.
        if (this.velocity < 0.002 && this.velocity > 0) {
            this.isStopping = true;
            this.updateStatus("STABILIZING", "#ffc107");
        }

        if (this.velocity < 0.0005) {
            this.velocity = 0;
            this.isSpinning = false;
            this.finalizeResult();
        }

        // Needle Physics (Visual only - simulated bounce based on segment passing)
        // We calculate 'roughness' based on speed to shake the needle
        if (this.velocity > 0.05) {
            const tremor = Math.sin(Date.now() / 20) * (this.velocity * 20); // Scale shake by speed
            this.needle.style.transform = `translateX(-50%) rotate(${tremor}deg)`;
        } else {
            this.needle.style.transform = `translateX(-50%) rotate(0deg)`;
        }
    }

    finalizeResult() {
        this.updateStatus("LOCKED", "#00ff88");

        // Calculate Winner
        // Pointer is at Top ( -PI/2 or 270 deg)
        // We translate the world rotation to find what slice is at -PI/2

        // 1. Normalize current angle to positive 0-2PI
        let currentRotation = this.angle;

        // 2. The pointer is static at top. 
        // If the wheel rotates +X rads, the slice at top is effectively -X relative to 0 index.
        // Slice Index = floor( ( (2PI - currentRotation + offset) % 2PI ) / arcSize )
        // Offset: Since 0 index usually starts at 3 o'clock (0 rads), we need to shift by PI/2

        const effectiveAngle = ((Math.PI * 2) - currentRotation - (Math.PI / 2)) % (Math.PI * 2);
        // Handle negative modulo case just in case
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
        this.updateStatus("SYSTEM READY", "#fff");
        if (this.particleSystem) this.particleSystem.stop();
        this.configPanel.classList.remove('minimized'); // Bring back config
    }

    updateStatus(text, color) {
        this.statusLabel.innerText = text;
        this.statusLabel.previousElementSibling.style.backgroundColor = color;
        this.statusLabel.previousElementSibling.style.boxShadow = `0 0 10px ${color}`;
    }

    // --- RENDER ENGINE ---

    gameLoop(timestamp) {
        // Delta time calculation could go here for perfect physics step, 
        // but for a simple wheel, frame-based decay is smooth enough.

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

        // Draw Outer Rim Shadow (Fake 3D)

        // DRAW SEGMENTS
        this.segments.forEach((seg, i) => {
            const startAng = i * this.arcSize;
            const endAng = startAng + this.arcSize;

            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, this.radius, startAng, endAng);
            this.ctx.closePath();

            // Gradient Fill
            const grd = this.ctx.createLinearGradient(0, 0, this.radius, this.radius);
            grd.addColorStop(0, seg.gradient[0]);
            grd.addColorStop(1, seg.gradient[1]);
            this.ctx.fillStyle = grd;
            this.ctx.fill();

            // Segment Border
            this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // DRAW TEXT
            this.ctx.save();
            this.ctx.rotate(startAng + this.arcSize / 2);
            this.ctx.textAlign = "right";
            this.ctx.fillStyle = "#fff";
            this.ctx.font = "bold 18px Outfit"; // Fallback

            // Typography Auto-Scaling
            const availableWidth = this.radius * 0.75; // 75% of radius available
            let fontSize = 24;
            this.ctx.font = `bold ${fontSize}px Outfit`;

            // Smart Shrink
            while (this.ctx.measureText(seg.label).width > availableWidth && fontSize > 10) {
                fontSize--;
                this.ctx.font = `bold ${fontSize}px Outfit`;
            }

            // Add slight shadow to text for readability
            this.ctx.shadowColor = "rgba(0,0,0,0.5)";
            this.ctx.shadowBlur = 4;
            this.ctx.shadowOffsetX = 1;
            this.ctx.shadowOffsetY = 1;

            this.ctx.fillText(seg.label, this.radius - 20, 8); // 8 is decent baseline offset

            this.ctx.restore();
        });

        this.ctx.restore();

        // Draw Light Reflections (Static Layer over Rotating Layer)
        // Simulates glass/plastic shine on top of the wheel
        const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, "rgba(255,255,255,0.05)");
        gradient.addColorStop(0.5, "transparent");
        gradient.addColorStop(1, "rgba(255,255,255,0.05)");

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

/**
 * MICRO-ENGINE FOR PARTICLE SYSTEM
 * Handles the "Confetti" on win.
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
        // Create 100 particles
        for (let i = 0; i < 150; i++) {
            this.particles.push({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                vx: (Math.random() - 0.5) * 15, // Random explosion spread X
                vy: (Math.random() - 0.5) * 15, // Random explosion spread Y
                size: Math.random() * 8 + 2,
                color: `hsl(${Math.random() * 360}, 80%, 60%)`,
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
