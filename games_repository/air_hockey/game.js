/**
 * KINGDOM AIR HOCKEY - ROYAL LOVE EDITION
 * Premium 3D Air Hockey Game Engine
 */

// Configuration
const CONFIG = {
    FRICTION: 0.985,
    WALL_BOUNCE: 0.85,
    PUCK_MAX_SPEED: 25,
    COLLISION_FORCE: 1.5,
    MAX_SCORE: 7,
    GOAL_COOLDOWN: 2000,
    TABLE_WIDTH: 10,
    TABLE_DEPTH: 16,
    WALL_HEIGHT: 0.5,
    PUCK_RADIUS: 0.35,
    PUCK_HEIGHT: 0.15,
    MALLET_RADIUS: 0.5,
    MALLET_HEIGHT: 0.2,
    GOAL_WIDTH: 3,
    COLORS: {
        table: 0x1a1a2e,
        tableBorder: 0xC9A962,
        glass: 0x88ccff,
        puck: 0xF4E4BA,
        mallet1: 0x4a69bd,
        mallet2: 0xe84a5f,
        particles: 0xffd700
    },
    AI: {
        easy: { reactionTime: 0.3, accuracy: 0.6, speed: 0.5, defensiveness: 0.7, errorMargin: 1.5 },
        medium: { reactionTime: 0.15, accuracy: 0.8, speed: 0.75, defensiveness: 0.6, errorMargin: 0.8 },
        hard: { reactionTime: 0.05, accuracy: 0.95, speed: 1.0, defensiveness: 0.5, errorMargin: 0.2 }
    }
};

// Wait for everything to load
window.addEventListener('DOMContentLoaded', function () {
    console.log('🎮 Starting Kingdom Air Hockey...');

    // Check Three.js
    if (typeof THREE === 'undefined') {
        alert('שגיאה: Three.js לא נטען. בדוק חיבור לאינטרנט.');
        return;
    }

    try {
        window.game = new AirHockeyGame();
        console.log('✅ Game ready!');
    } catch (error) {
        console.error('Error:', error);
        alert('שגיאה: ' + error.message);
    }
});

// Main Game Class
class AirHockeyGame {
    constructor() {
        this.state = 'menu';
        this.mode = 'vsPlayer';
        this.difficulty = 'medium';
        this.score = { p1: 0, p2: 0 };

        this.container = document.getElementById('gameContainer');

        // Initialize Vectors FIRST
        this.puckVelocity = new THREE.Vector3(0, 0, 0);
        this.mallet1Target = new THREE.Vector3(0, 0, 0);
        this.mallet2Target = new THREE.Vector3(0, 0, 0);

        // Setup Three.js
        this.setupRenderer();
        this.setupScene();
        this.createTable();
        this.createGameObjects();
        this.setupLights();

        // Setup systems
        this.setupInput();
        this.setupUI();

        // AI
        this.aiReactionDelay = 0;

        // Particles
        this.particles = [];

        // Start animation
        this.clock = new THREE.Clock();
        this.animate();

        window.addEventListener('resize', () => this.onResize());
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.COLORS.table);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 18, 0);
        this.camera.lookAt(0, 0, 0);
    }

    createTable() {
        // Glass surface
        const tableGeom = new THREE.BoxGeometry(CONFIG.TABLE_WIDTH, 0.3, CONFIG.TABLE_DEPTH);
        const tableMat = new THREE.MeshStandardMaterial({
            color: CONFIG.COLORS.glass,
            metalness: 0.1,
            roughness: 0.1,
            transparent: true,
            opacity: 0.3
        });
        this.table = new THREE.Mesh(tableGeom, tableMat);
        this.table.receiveShadow = true;
        this.table.position.y = -0.15;
        this.scene.add(this.table);

        // Gold border
        const borderGeom = new THREE.BoxGeometry(CONFIG.TABLE_WIDTH + 0.4, 0.2, CONFIG.TABLE_DEPTH + 0.4);
        const borderMat = new THREE.MeshStandardMaterial({
            color: CONFIG.COLORS.tableBorder,
            metalness: 0.8,
            roughness: 0.2
        });
        const border = new THREE.Mesh(borderGeom, borderMat);
        border.position.y = -0.3;
        this.scene.add(border);

        // Walls
        this.walls = [];
        const wallMat = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.tableBorder, metalness: 0.6, roughness: 0.3 });
        const hw = CONFIG.TABLE_WIDTH / 2;
        const hd = CONFIG.TABLE_DEPTH / 2;
        const wh = CONFIG.WALL_HEIGHT;

        // Left & Right
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, wh, CONFIG.TABLE_DEPTH), wallMat);
        leftWall.position.set(-hw - 0.1, wh / 2, 0);
        this.scene.add(leftWall);
        this.walls.push({ axis: 'x', value: -hw });

        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, wh, CONFIG.TABLE_DEPTH), wallMat);
        rightWall.position.set(hw + 0.1, wh / 2, 0);
        this.scene.add(rightWall);
        this.walls.push({ axis: 'x', value: hw });

        // Top & Bottom with goal gaps
        const goalHW = CONFIG.GOAL_WIDTH / 2;
        const sideLen = (CONFIG.TABLE_WIDTH - CONFIG.GOAL_WIDTH) / 2;

        [
            { x: -hw + sideLen / 2, z: -hd - 0.1 },
            { x: hw - sideLen / 2, z: -hd - 0.1 },
            { x: -hw + sideLen / 2, z: hd + 0.1 },
            { x: hw - sideLen / 2, z: hd + 0.1 }
        ].forEach(w => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(sideLen, wh, 0.2), wallMat);
            mesh.position.set(w.x, wh / 2, w.z);
            this.scene.add(mesh);
            this.walls.push({ axis: 'z', value: w.z > 0 ? hd : -hd, minX: w.x - sideLen / 2, maxX: w.x + sideLen / 2 });
        });

        // Center line
        const lineGeom = new THREE.PlaneGeometry(CONFIG.TABLE_WIDTH, 0.05);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
        const centerLine = new THREE.Mesh(lineGeom, lineMat);
        centerLine.rotation.x = -Math.PI / 2;
        centerLine.position.y = 0.01;
        this.scene.add(centerLine);
    }

    createGameObjects() {
        // Puck
        const puckGeom = new THREE.CylinderGeometry(CONFIG.PUCK_RADIUS, CONFIG.PUCK_RADIUS, CONFIG.PUCK_HEIGHT, 32);
        const puckMat = new THREE.MeshStandardMaterial({
            color: CONFIG.COLORS.puck,
            metalness: 0.7,
            roughness: 0.2,
            emissive: CONFIG.COLORS.puck,
            emissiveIntensity: 0.3
        });
        this.puck = new THREE.Mesh(puckGeom, puckMat);
        this.puck.castShadow = true;
        this.puck.position.set(0, CONFIG.PUCK_HEIGHT / 2, 0);
        this.scene.add(this.puck);

        // Mallets
        const malletGeom = new THREE.CylinderGeometry(CONFIG.MALLET_RADIUS, CONFIG.MALLET_RADIUS, CONFIG.MALLET_HEIGHT, 32);

        const mallet1Mat = new THREE.MeshStandardMaterial({
            color: CONFIG.COLORS.mallet1,
            metalness: 0.5,
            roughness: 0.3,
            emissive: CONFIG.COLORS.mallet1,
            emissiveIntensity: 0.2
        });
        this.mallet1 = new THREE.Mesh(malletGeom, mallet1Mat);
        this.mallet1.castShadow = true;
        this.mallet1.position.set(0, CONFIG.MALLET_HEIGHT / 2, CONFIG.TABLE_DEPTH / 2 - 2);
        this.scene.add(this.mallet1);

        const mallet2Mat = new THREE.MeshStandardMaterial({
            color: CONFIG.COLORS.mallet2,
            metalness: 0.5,
            roughness: 0.3,
            emissive: CONFIG.COLORS.mallet2,
            emissiveIntensity: 0.2
        });
        this.mallet2 = new THREE.Mesh(malletGeom, mallet2Mat);
        this.mallet2.castShadow = true;
        this.mallet2.position.set(0, CONFIG.MALLET_HEIGHT / 2, -CONFIG.TABLE_DEPTH / 2 + 2);
        this.scene.add(this.mallet2);

        // Initialize targets to current positions
        this.mallet1Target.copy(this.mallet1.position);
        this.mallet2Target.copy(this.mallet2.position);
    }

    setupLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

        const spotLight = new THREE.SpotLight(0xffffff, 1.5);
        spotLight.position.set(0, 15, 0);
        spotLight.castShadow = true;
        this.scene.add(spotLight);

        const accent1 = new THREE.PointLight(CONFIG.COLORS.tableBorder, 0.5, 10);
        accent1.position.set(-5, 2, 0);
        this.scene.add(accent1);

        const accent2 = new THREE.PointLight(CONFIG.COLORS.tableBorder, 0.5, 10);
        accent2.position.set(5, 2, 0);
        this.scene.add(accent2);
    }

    setupInput() {
        const canvas = this.renderer.domElement;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        canvas.addEventListener('mousemove', (e) => {
            if (this.state !== 'playing') return;
            this.handleInput(e.clientX, e.clientY);
        });

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.state !== 'playing' || !e.touches.length) return;
            this.handleInput(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.state !== 'playing' || !e.touches.length) return;
            this.handleInput(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });
    }

    handleInput(clientX, clientY) {
        this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const point = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, point);

        if (point) {
            if (this.mode === 'vsPlayer') {
                if (point.z > 0) {
                    this.mallet1Target.x = point.x;
                    this.mallet1Target.z = point.z;
                } else {
                    this.mallet2Target.x = point.x;
                    this.mallet2Target.z = point.z;
                }
            } else {
                if (point.z > 0) {
                    this.mallet1Target.x = point.x;
                    this.mallet1Target.z = point.z;
                }
            }
        }
    }

    setupUI() {
        // Mode buttons
        document.getElementById('btnVsPlayer').addEventListener('click', () => {
            console.log('👥 2-player mode');
            document.getElementById('difficultyPanel').classList.remove('visible');
            this.startGame('vsPlayer');
        });

        document.getElementById('btnVsAI').addEventListener('click', () => {
            console.log('🤖 AI mode');
            document.getElementById('difficultyPanel').classList.add('visible');
        });

        document.getElementById('btnStartAI').addEventListener('click', () => {
            const selected = document.querySelector('.diff-btn.selected');
            this.difficulty = selected ? selected.dataset.level : 'medium';
            console.log('🎯 Starting with difficulty:', this.difficulty);
            this.startGame('vsAI');
        });

        // Difficulty buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // Pause
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());

        // Overlay buttons
        document.getElementById('overlayPrimaryBtn').addEventListener('click', () => {
            if (this.state === 'paused') this.resume();
            else if (this.state === 'gameover') this.showScreen('menu');
        });

        document.getElementById('overlaySecondaryBtn').addEventListener('click', () => {
            this.showScreen('menu');
            this.hideOverlay();
        });
    }

    startGame(mode) {
        this.mode = mode;
        this.score = { p1: 0, p2: 0 };
        this.state = 'playing';
        this.resetPositions();
        this.updateScoreDisplay();
        this.showScreen('game');
    }

    resetPositions() {
        this.puck.position.set(0, CONFIG.PUCK_HEIGHT / 2, 0);
        this.puckVelocity.set(0, 0, 0);
        this.mallet1.position.set(0, CONFIG.MALLET_HEIGHT / 2, CONFIG.TABLE_DEPTH / 2 - 2);
        this.mallet2.position.set(0, CONFIG.MALLET_HEIGHT / 2, -CONFIG.TABLE_DEPTH / 2 + 2);
        this.mallet1Target.copy(this.mallet1.position);
        this.mallet2Target.copy(this.mallet2.position);
    }

    update(dt) {
        if (this.state !== 'playing') return;

        // AI
        if (this.mode === 'vsAI') this.updateAI(dt);

        // Physics
        this.updateMallets(dt);
        this.updatePuck(dt);
        this.checkCollisions();
        this.checkGoals();

        // Particles
        this.updateParticles(dt);
    }

    updateAI(dt) {
        const cfg = CONFIG.AI[this.difficulty];
        this.aiReactionDelay -= dt;
        if (this.aiReactionDelay > 0) return;
        this.aiReactionDelay = cfg.reactionTime;

        let targetX = this.puck.position.x;
        let targetZ = this.puck.position.z;

        if (this.puckVelocity.length() > 2) {
            const predTime = 0.5 / cfg.accuracy;
            targetX += this.puckVelocity.x * predTime;
            targetZ += this.puckVelocity.z * predTime;
        }

        targetX += (Math.random() - 0.5) * cfg.errorMargin;

        if (this.puck.position.z > -CONFIG.TABLE_DEPTH / 4) {
            targetZ = -CONFIG.TABLE_DEPTH / 2 + 2;
            targetX *= cfg.defensiveness;
        }

        const spd = cfg.speed * 0.3;
        this.mallet2Target.x += (targetX - this.mallet2Target.x) * spd;
        this.mallet2Target.z += (targetZ - this.mallet2Target.z) * spd;
    }

    updateMallets(dt) {
        const lerp = 0.15;
        const hw = CONFIG.TABLE_WIDTH / 2 - CONFIG.MALLET_RADIUS;
        const hd = CONFIG.TABLE_DEPTH / 2 - CONFIG.MALLET_RADIUS;

        // Mallet 1
        this.mallet1.position.x += (this.mallet1Target.x - this.mallet1.position.x) * lerp;
        this.mallet1.position.z += (this.mallet1Target.z - this.mallet1.position.z) * lerp;
        this.mallet1.position.x = Math.max(-hw, Math.min(hw, this.mallet1.position.x));
        this.mallet1.position.z = Math.max(0, Math.min(hd, this.mallet1.position.z));

        // Mallet 2
        this.mallet2.position.x += (this.mallet2Target.x - this.mallet2.position.x) * lerp;
        this.mallet2.position.z += (this.mallet2Target.z - this.mallet2.position.z) * lerp;
        this.mallet2.position.x = Math.max(-hw, Math.min(hw, this.mallet2.position.x));
        this.mallet2.position.z = Math.max(-hd, Math.min(0, this.mallet2.position.z));
    }

    updatePuck(dt) {
        this.puck.position.x += this.puckVelocity.x * dt * 60;
        this.puck.position.z += this.puckVelocity.z * dt * 60;
        this.puckVelocity.multiplyScalar(CONFIG.FRICTION);

        if (this.puckVelocity.length() < 0.01) this.puckVelocity.set(0, 0, 0);
        if (this.puckVelocity.length() > CONFIG.PUCK_MAX_SPEED) {
            this.puckVelocity.normalize().multiplyScalar(CONFIG.PUCK_MAX_SPEED);
        }

        this.puck.rotation.y += this.puckVelocity.length() * dt;
    }

    checkCollisions() {
        const px = this.puck.position.x;
        const pz = this.puck.position.z;
        const r = CONFIG.PUCK_RADIUS;

        // Walls
        this.walls.forEach(wall => {
            if (wall.axis === 'x') {
                if (Math.abs(px - wall.value) < r) {
                    this.puck.position.x = wall.value + (px > wall.value ? r : -r);
                    this.puckVelocity.x *= -CONFIG.WALL_BOUNCE;
                    this.createParticles(this.puck.position.x, this.puck.position.z, 0xffffff);
                }
            } else {
                if (wall.minX && (px < wall.minX || px > wall.maxX)) return;
                if (Math.abs(pz - wall.value) < r) {
                    this.puck.position.z = wall.value + (pz > wall.value ? r : -r);
                    this.puckVelocity.z *= -CONFIG.WALL_BOUNCE;
                    this.createParticles(this.puck.position.x, this.puck.position.z, 0xffffff);
                }
            }
        });

        // Mallets
        this.checkMalletCollision(this.mallet1, CONFIG.COLORS.mallet1);
        this.checkMalletCollision(this.mallet2, CONFIG.COLORS.mallet2);
    }

    checkMalletCollision(mallet, color) {
        const dx = this.puck.position.x - mallet.position.x;
        const dz = this.puck.position.z - mallet.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = CONFIG.PUCK_RADIUS + CONFIG.MALLET_RADIUS;

        if (dist < minDist) {
            const angle = Math.atan2(dz, dx);
            const overlap = minDist - dist;

            this.puck.position.x += Math.cos(angle) * overlap;
            this.puck.position.z += Math.sin(angle) * overlap;

            const speed = this.puckVelocity.length();
            this.puckVelocity.x = Math.cos(angle) * (speed + 2) * CONFIG.COLLISION_FORCE;
            this.puckVelocity.z = Math.sin(angle) * (speed + 2) * CONFIG.COLLISION_FORCE;

            this.createParticles(this.puck.position.x, this.puck.position.z, color);
        }
    }

    checkGoals() {
        const px = this.puck.position.x;
        const pz = this.puck.position.z;
        const goalHW = CONFIG.GOAL_WIDTH / 2;
        const tableHD = CONFIG.TABLE_DEPTH / 2;

        if (Math.abs(px) < goalHW) {
            if (pz < -tableHD) this.handleGoal(1);
            else if (pz > tableHD) this.handleGoal(2);
        }
    }

    handleGoal(scorer) {
        this.state = 'goal';
        if (scorer === 1) this.score.p1++;
        else this.score.p2++;

        this.updateScoreDisplay();
        this.createExplosion(this.puck.position.x, this.puck.position.z);

        // Flash
        const flash = document.getElementById('goalFlash');
        if (flash) {
            flash.classList.add('active');
            setTimeout(() => flash.classList.remove('active'), 500);
        }

        if (this.score.p1 >= CONFIG.MAX_SCORE || this.score.p2 >= CONFIG.MAX_SCORE) {
            setTimeout(() => this.showGameOver(), 1000);
        } else {
            setTimeout(() => {
                this.showGoalOverlay(scorer);
                setTimeout(() => {
                    this.resetPositions();
                    this.state = 'playing';
                    this.hideOverlay();
                }, CONFIG.GOAL_COOLDOWN);
            }, 500);
        }
    }

    // Particles
    createParticles(x, z, color) {
        for (let i = 0; i < 8; i++) {
            const geom = new THREE.SphereGeometry(0.05, 8, 8);
            const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
            const p = new THREE.Mesh(geom, mat);
            const angle = (Math.PI * 2 * i) / 8;
            p.position.set(x, 0.1, z);
            p.velocity = new THREE.Vector3(Math.cos(angle) * 0.3, 0.2, Math.sin(angle) * 0.3);
            p.life = 1;
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    createExplosion(x, z) {
        for (let i = 0; i < 30; i++) {
            const geom = new THREE.SphereGeometry(0.08, 8, 8);
            const mat = new THREE.MeshBasicMaterial({ color: CONFIG.COLORS.particles, transparent: true, opacity: 1 });
            const p = new THREE.Mesh(geom, mat);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const spd = 0.5 + Math.random() * 0.5;
            p.position.set(x, 0.1, z);
            p.velocity = new THREE.Vector3(Math.sin(phi) * Math.cos(theta) * spd, Math.cos(phi) * spd, Math.sin(phi) * Math.sin(theta) * spd);
            p.life = 1;
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.position.add(p.velocity.clone().multiplyScalar(dt * 10));
            p.velocity.y -= 0.02;
            p.life -= dt * 2;
            p.material.opacity = p.life;
            if (p.life <= 0) {
                this.scene.remove(p);
                p.geometry.dispose();
                p.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    // UI Methods
    showScreen(name) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(name + 'Screen').classList.add('active');
        this.state = name === 'menu' ? 'menu' : this.state;
    }

    updateScoreDisplay() {
        document.getElementById('score1').textContent = this.score.p1;
        document.getElementById('score2').textContent = this.score.p2;
    }

    showGoalOverlay(scorer) {
        document.getElementById('overlayIcon').textContent = '⚽';
        document.getElementById('overlayTitle').textContent = 'GOAL!';
        document.getElementById('overlaySubtitle').textContent = scorer === 1 ? 'שחקן 1 הבקיע!' : 'שחקן 2 הבקיע!';
        document.getElementById('overlayScore').textContent = `${this.score.p1} - ${this.score.p2}`;
        document.getElementById('overlayPrimaryBtn').style.display = 'none';
        document.getElementById('overlaySecondaryBtn').style.display = 'none';
        document.getElementById('overlay').classList.add('visible');
    }

    showGameOver() {
        this.state = 'gameover';
        const winner = this.score.p1 >= CONFIG.MAX_SCORE ? 1 : 2;
        document.getElementById('overlayIcon').textContent = '👑';
        document.getElementById('overlayTitle').textContent = 'GAME OVER';
        document.getElementById('overlaySubtitle').textContent = winner === 1 ? 'שחקן 1 ניצח!' : 'שחקן 2 ניצח!';
        document.getElementById('overlayScore').textContent = `${this.score.p1} - ${this.score.p2}`;
        document.getElementById('overlayPrimaryBtn').textContent = 'תפריט ראשי';
        document.getElementById('overlayPrimaryBtn').style.display = 'block';
        document.getElementById('overlaySecondaryBtn').style.display = 'none';
        document.getElementById('overlay').classList.add('visible');
    }

    pause() {
        if (this.state !== 'playing') return;
        this.state = 'paused';
        document.getElementById('overlayIcon').textContent = '⏸';
        document.getElementById('overlayTitle').textContent = 'PAUSED';
        document.getElementById('overlaySubtitle').textContent = 'המשחק מושהה';
        document.getElementById('overlayScore').textContent = `${this.score.p1} - ${this.score.p2}`;
        document.getElementById('overlayPrimaryBtn').textContent = 'המשך';
        document.getElementById('overlayPrimaryBtn').style.display = 'block';
        document.getElementById('overlaySecondaryBtn').style.display = 'block';
        document.getElementById('overlay').classList.add('visible');
    }

    resume() {
        this.state = 'playing';
        this.hideOverlay();
    }

    hideOverlay() {
        document.getElementById('overlay').classList.remove('visible');
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const dt = this.clock.getDelta();
        this.update(dt);
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
