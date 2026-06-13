class Game {
    constructor(canvas) {
        if (!canvas || !canvas.getContext) {
            throw new Error('Canvas not supported or not provided');
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = 20;
        this.width = Math.floor(canvas.width / this.gridSize);
        this.height = Math.floor(canvas.height / this.gridSize);
        
        // Game state
        this.gameStarted = false;
        this.gameOver = false;
        this.isPaused = false;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        this.lastRenderTime = 0;
        this.gameSpeed = 150;
        this.minSpeed = 50;
        this.speedIncrease = 2;
        this.debug = false;

        // Performance optimizations
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.fps = 0;
        this.animationFrameId = null;

        // Create off-screen canvas for the grid
        this.gridCanvas = document.createElement('canvas');
        this.gridCanvas.width = canvas.width;
        this.gridCanvas.height = canvas.height;
        this.gridCtx = this.gridCanvas.getContext('2d');

        // Visual effects
        this.particles = [];
        this.ripples = [];

        // Initialize game objects
        this.resetGame();
        this.setupEventListeners();
        this.updateHighScoreDisplays();
        
        // Pre-render the grid
        this.renderGrid();
    }

    resetGame() {
        this.snake = new Snake();
        this.food = new Food();
        this.score = 0;
        this.gameSpeed = 150;
        this.gameOver = false;
        this.isPaused = false;
        this.lastRenderTime = 0;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.particles = [];
        this.ripples = [];

        // Update UI
        this.updateScores();
        this.hideAllScreens();
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', this.handleKeyPress.bind(this));

        // Button controls
        const startButton = document.getElementById('startButton');
        const restartButton = document.getElementById('restartButton');
        const winRestartButton = document.getElementById('winRestartButton');
        
        if (startButton) startButton.addEventListener('click', () => this.startGame());
        if (restartButton) restartButton.addEventListener('click', () => this.restart());
        if (winRestartButton) winRestartButton.addEventListener('click', () => this.restart());

        // Debug toggle (Ctrl + D)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.toggleDebug();
            }
        });
    }

    handleKeyPress(e) {
        if (e.key === 'Enter' && !this.gameStarted) {
            this.startGame();
            return;
        }

        if (!this.gameStarted || this.gameOver) return;

        const currentTime = performance.now();
        
        switch(e.key) {
            case 'ArrowUp':
                this.snake.setDirection({x: 0, y: -1}, currentTime);
                break;
            case 'ArrowDown':
                this.snake.setDirection({x: 0, y: 1}, currentTime);
                break;
            case 'ArrowLeft':
                this.snake.setDirection({x: -1, y: 0}, currentTime);
                break;
            case 'ArrowRight':
                this.snake.setDirection({x: 1, y: 0}, currentTime);
                break;
            case ' ':
                e.preventDefault();
                this.togglePause();
                break;
        }
    }

    hideAllScreens() {
        const screens = ['startScreen', 'gameOver', 'winScreen', 'pauseScreen'];
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) screen.style.display = 'none';
        });
    }

    startGame() {
        if (this.gameStarted) return;
        
        this.gameStarted = true;
        this.hideAllScreens();
        this.resetGame();
        this.gameLoop(0);
    }

    togglePause() {
        if (this.gameOver) return;
        
        this.isPaused = !this.isPaused;
        const pauseScreen = document.getElementById('pauseScreen');
        
        if (this.isPaused) {
            cancelAnimationFrame(this.animationFrame);
            if (pauseScreen) pauseScreen.style.display = 'flex';
        } else {
            if (pauseScreen) pauseScreen.style.display = 'none';
            this.lastRenderTime = 0;
            this.gameLoop(0);
        }
    }

    toggleDebug() {
        this.debug = !this.debug;
        const debugPanel = document.getElementById('debugPanel');
        if (debugPanel) {
            debugPanel.style.display = this.debug ? 'block' : 'none';
        }
    }

    updateDebugInfo() {
        if (!this.debug) return;

        const debugInfo = document.getElementById('debugInfo');
        if (!debugInfo) return;

        const info = {
            'FPS': this.fps,
            'Game Speed': this.gameSpeed,
            'Score': this.score,
            'Snake Length': this.snake.getSegments().length,
            'Snake Head': JSON.stringify(this.snake.getHead()),
            'Food Position': JSON.stringify(this.food.getPosition()),
            'Game State': this.gameOver ? 'Game Over' : (this.isPaused ? 'Paused' : 'Playing')
        };

        debugInfo.textContent = Object.entries(info)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
    }

    cleanup() {
        cancelAnimationFrame(this.animationFrameId);
        this.gridCanvas = null;
        this.gridCtx = null;
    }

    update() {
        if (this.gameOver || !this.gameStarted || this.isPaused) return;

        // Update snake and check for collision
        const collision = this.snake.update(this.width, this.height);
        if (collision) {
            this.endGame();
            return;
        }

        // Check for food collision
        const head = this.snake.getHead();
        const foodPos = this.food.getPosition();
        
        if (head.x === foodPos.x && head.y === foodPos.y) {
            // Subtle ripple + a few soft particles where the food was
            this.spawnFoodEffects(foodPos.x, foodPos.y);

            // Increase score
            this.score += this.food.getValue();
            this.updateScores();

            // Grow snake
            this.snake.grow();
            
            // Spawn new food
            if (!this.food.spawn(this.width, this.height, this.snake)) {
                this.winGame();
                return;
            }
            
            // Increase speed
            this.gameSpeed = Math.max(this.minSpeed, this.gameSpeed - this.speedIncrease);
        }

        this.updateDebugInfo();
    }

    updateScores() {
        this.updateElement('score', this.score);
        this.updateHighScoreDisplays();
    }

    updateHighScoreDisplays() {
        const highScore = Math.max(this.score, this.highScore);
        ['highScore', 'startHighScore', 'gameOverHighScore', 'winHighScore'].forEach(id => {
            this.updateElement(id, highScore);
        });
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    renderGrid() {
        const g = this.gridCtx;
        g.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);

        // Barely-there grid for spatial reference
        g.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        g.lineWidth = 1;
        for (let i = 1; i < this.width; i++) {
            g.beginPath();
            g.moveTo(i * this.gridSize, 0);
            g.lineTo(i * this.gridSize, this.canvas.height);
            g.stroke();
        }
        for (let i = 1; i < this.height; i++) {
            g.beginPath();
            g.moveTo(0, i * this.gridSize);
            g.lineTo(this.canvas.width, i * this.gridSize);
            g.stroke();
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Layered scene: background → grid → food → snake → effects
        this.drawBackground();
        this.ctx.drawImage(this.gridCanvas, 0, 0);
        this.drawFood();
        this.drawSnake();
        this.drawEffects();
    }

    drawBackground() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Calm, flat base with a soft vignette for depth
        this.ctx.fillStyle = '#15161c';
        this.ctx.fillRect(0, 0, w, h);

        const vignette = this.ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.75);
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        this.ctx.fillStyle = vignette;
        this.ctx.fillRect(0, 0, w, h);
    }

    drawFood() {
        const foodPos = this.food.getPosition();
        const t = performance.now() / 1000;
        const cx = (foodPos.x + 0.5) * this.gridSize;
        const cy = (foodPos.y + 0.5) * this.gridSize;
        const pulse = 1 + Math.sin(t * 3) * 0.06;
        const radius = (this.gridSize / 2.8) * pulse;

        // Soft single-colour body with a gentle shadow (no neon halo)
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(224, 161, 107, 0.45)';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#e0a16b';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.restore();

        // Subtle highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        this.ctx.beginPath();
        this.ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.3, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    drawSnake() {
        const segments = this.snake.getSegments();
        const size = this.gridSize;
        const len = segments.length;

        // Soft drop shadow for depth — no coloured glow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetY = 1;

        segments.forEach((segment, index) => {
            const isHead = index === 0;
            const x = segment.x * size;
            const y = segment.y * size;

            // A single muted green, gently darkening toward the tail
            const ratio = len > 1 ? index / (len - 1) : 0;
            const light = isHead ? 60 : 56 - ratio * 14;
            this.ctx.fillStyle = `hsl(150, 30%, ${light}%)`;

            if (isHead) {
                this.drawRoundedSegment(x, y, size, 8);
                this.ctx.shadowColor = 'transparent';
                this.drawSnakeEyes(x, y);
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            } else {
                this.drawBodySegment(segment, segments[index - 1], segments[index + 1], x, y, size);
            }
        });

        // Reset shadow
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
    }

    drawBodySegment(segment, prevSegment, nextSegment, x, y, size) {
        // Calculate the connection direction with previous and next segments
        const prevDir = prevSegment ? {
            x: segment.x - prevSegment.x,
            y: segment.y - prevSegment.y
        } : null;
        
        const nextDir = nextSegment ? {
            x: nextSegment.x - segment.x,
            y: nextSegment.y - segment.y
        } : null;
        
        // Handle wrapping around edges
        if (prevDir) {
            if (Math.abs(prevDir.x) > 1) prevDir.x = -Math.sign(prevDir.x);
            if (Math.abs(prevDir.y) > 1) prevDir.y = -Math.sign(prevDir.y);
        }
        if (nextDir) {
            if (Math.abs(nextDir.x) > 1) nextDir.x = -Math.sign(nextDir.x);
            if (Math.abs(nextDir.y) > 1) nextDir.y = -Math.sign(nextDir.y);
        }

        // Draw the main segment body
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size - 1, size - 1, 4);
        this.ctx.fill();

        // Draw additional rectangles to smooth connections
        if (prevDir) {
            this.drawConnectionRect(x, y, size, prevDir);
        }
        if (nextDir) {
            this.drawConnectionRect(x, y, size, nextDir);
        }
    }

    drawConnectionRect(x, y, size, direction) {
        const offset = 2; // Slight overlap for smooth connection
        if (direction.x !== 0) {
            const connectionX = direction.x > 0 ? x - offset : x + size - 1;
            this.ctx.fillRect(connectionX, y, offset * 2, size - 1);
        }
        if (direction.y !== 0) {
            const connectionY = direction.y > 0 ? y - offset : y + size - 1;
            this.ctx.fillRect(x, connectionY, size - 1, offset * 2);
        }
    }

    drawRoundedSegment(x, y, size, radius) {
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size - 1, size - 1, radius);
        this.ctx.fill();
    }

    drawSnakeEyes(x, y) {
        this.ctx.fillStyle = '#000';
        const eyeSize = 3;
        const eyePadding = 6;
        const dx = this.snake.direction.x;
        const dy = this.snake.direction.y;
        
        // Add eye shine
        const shineSize = 1;
        this.ctx.fillStyle = '#fff';
        
        if (dx !== 0) {
            // Draw main eyes
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(x + (dx > 0 ? 15 : 5), y + eyePadding, eyeSize, 0, 2 * Math.PI);
            this.ctx.arc(x + (dx > 0 ? 15 : 5), y + eyePadding + 8, eyeSize, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Add shine to eyes
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(x + (dx > 0 ? 14 : 4), y + eyePadding - 1, shineSize, 0, 2 * Math.PI);
            this.ctx.arc(x + (dx > 0 ? 14 : 4), y + eyePadding + 7, shineSize, 0, 2 * Math.PI);
            this.ctx.fill();
        } else {
            // Draw main eyes
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(x + eyePadding, y + (dy > 0 ? 15 : 5), eyeSize, 0, 2 * Math.PI);
            this.ctx.arc(x + eyePadding + 8, y + (dy > 0 ? 15 : 5), eyeSize, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Add shine to eyes
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(x + eyePadding - 1, y + (dy > 0 ? 14 : 4), shineSize, 0, 2 * Math.PI);
            this.ctx.arc(x + eyePadding + 7, y + (dy > 0 ? 14 : 4), shineSize, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }

    spawnFoodEffects(gridX, gridY) {
        const cx = (gridX + 0.5) * this.gridSize;
        const cy = (gridY + 0.5) * this.gridSize;

        // One expanding ring
        this.ripples.push({ x: cx, y: cy, r: this.gridSize * 0.3, life: 1 });

        // A handful of soft particles in the food's own colour
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const speed = 0.8 + Math.random() * 1.6;
            this.particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.03 + Math.random() * 0.02,
                size: 1.5 + Math.random() * 1.5
            });
        }
    }

    updateEffects() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.9;
            p.vy *= 0.9;
            p.life -= p.decay;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.r += 0.8;
            r.life -= 0.05;
            if (r.life <= 0) this.ripples.splice(i, 1);
        }
    }

    drawEffects() {
        this.ripples.forEach(r => {
            this.ctx.globalAlpha = Math.max(0, r.life) * 0.5;
            this.ctx.strokeStyle = '#e0a16b';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, r.r, 0, 2 * Math.PI);
            this.ctx.stroke();
        });

        this.particles.forEach(p => {
            this.ctx.globalAlpha = Math.max(0, p.life) * 0.8;
            this.ctx.fillStyle = '#e0a16b';
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, Math.max(0.1, p.size * p.life), 0, 2 * Math.PI);
            this.ctx.fill();
        });

        this.ctx.globalAlpha = 1;
    }

    gameLoop(currentTime) {
        if (this.gameOver || this.isPaused) {
            cancelAnimationFrame(this.animationFrameId);
            return;
        }

        // Calculate FPS
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            if (this.debug) {
                this.updateDebugInfo();
            }
        }

        // Fixed-timestep: game logic only advances once gameSpeed has elapsed...
        const deltaTime = currentTime - this.lastFrameTime;
        if (deltaTime >= this.gameSpeed) {
            this.update();
            this.lastFrameTime = currentTime;
        }

        // ...but effects and rendering run every frame for smooth animation.
        this.updateEffects();
        this.render();

        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    endGame() {
        this.gameOver = true;
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
        }

        // Show game over screen
        this.updateElement('finalScore', this.score);
        const gameOverScreen = document.getElementById('gameOver');
        if (gameOverScreen) gameOverScreen.style.display = 'flex';

        this.updateHighScoreDisplays();
        cancelAnimationFrame(this.animationFrame);
    }

    winGame() {
        this.gameOver = true;
        
        // Update scores
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
        }

        // Show win screen
        this.updateElement('winFinalScore', this.score);
        const winScreen = document.getElementById('winScreen');
        if (winScreen) winScreen.style.display = 'flex';

        this.updateHighScoreDisplays();
        cancelAnimationFrame(this.animationFrame);
    }

    restart() {
        this.resetGame();
        this.gameLoop(0);
    }
}