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

        // Initialize game objects
        this.resetGame();
        this.setupEventListeners();
        this.updateHighScoreDisplays();

        // Add food animation properties
        this.foodPulseValue = 0;
        this.foodPulseSpeed = 0.05;
    }

    resetGame() {
        this.snake = new Snake();
        this.food = new Food();
        this.score = 0;
        this.gameSpeed = 150;
        this.gameOver = false;
        this.isPaused = false;
        this.lastRenderTime = 0;
        
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

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background grid
        this.drawGrid();
        
        // Draw food
        this.drawFood();
        
        // Draw snake
        this.drawSnake();
    }

    drawGrid() {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 0.5;
        
        for (let i = 0; i <= this.width; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.gridSize, 0);
            this.ctx.lineTo(i * this.gridSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let i = 0; i <= this.height; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.gridSize);
            this.ctx.lineTo(this.canvas.width, i * this.gridSize);
            this.ctx.stroke();
        }
    }

    drawFood() {
        const foodPos = this.food.getPosition();
        
        // Update pulse animation
        this.foodPulseValue += this.foodPulseSpeed;
        const pulseScale = 1 + Math.sin(this.foodPulseValue) * 0.1;
        
        // Base food color
        const baseRadius = (this.gridSize / 2.5) * pulseScale;
        
        // Draw outer glow
        const gradient = this.ctx.createRadialGradient(
            (foodPos.x + 0.5) * this.gridSize,
            (foodPos.y + 0.5) * this.gridSize,
            baseRadius * 0.5,
            (foodPos.x + 0.5) * this.gridSize,
            (foodPos.y + 0.5) * this.gridSize,
            baseRadius * 1.5
        );
        
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.6, 'rgba(255, 0, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = '#ff0000';
        this.ctx.shadowBlur = 15;
        
        // Draw main food circle
        this.ctx.beginPath();
        this.ctx.arc(
            (foodPos.x + 0.5) * this.gridSize,
            (foodPos.y + 0.5) * this.gridSize,
            baseRadius,
            0,
            2 * Math.PI
        );
        this.ctx.fill();
        
        // Add shine effect
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.beginPath();
        this.ctx.arc(
            (foodPos.x + 0.4) * this.gridSize,
            (foodPos.y + 0.4) * this.gridSize,
            baseRadius * 0.2,
            0,
            2 * Math.PI
        );
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
    }

    drawSnake() {
        const segments = this.snake.getSegments();
        
        segments.forEach((segment, index) => {
            const isHead = index === 0;
            const nextSegment = segments[index + 1];
            const prevSegment = segments[index - 1];
            
            // Calculate gradient colors
            const hue = 120 + (index * 2);
            this.ctx.fillStyle = `hsl(${hue}, 70%, ${isHead ? 60 : 50}%)`;
            
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            const size = this.gridSize;
            
            // Add subtle shadow
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 3;
            
            if (isHead) {
                // Draw head with rounded corners
                this.drawRoundedSegment(x, y, size, 8);
                this.drawSnakeEyes(x, y);
            } else {
                // Draw body segments with connection logic
                this.drawBodySegment(segment, prevSegment, nextSegment, x, y, size);
            }
            
            this.ctx.shadowBlur = 0;
        });
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

    gameLoop(currentTime) {
        if (this.gameOver || this.isPaused) return;

        if (this.lastRenderTime === 0) {
            this.lastRenderTime = currentTime;
        }

        const elapsed = currentTime - this.lastRenderTime;

        if (elapsed > this.gameSpeed) {
            this.update();
            this.render();
            this.lastRenderTime = currentTime;
        }

        this.animationFrame = requestAnimationFrame((time) => this.gameLoop(time));
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