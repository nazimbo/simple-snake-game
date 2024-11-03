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
        this.ctx.fillStyle = '#ff0000';
        this.ctx.shadowColor = '#ff0000';
        this.ctx.shadowBlur = 10;
        
        this.ctx.beginPath();
        this.ctx.arc(
            (foodPos.x + 0.5) * this.gridSize,
            (foodPos.y + 0.5) * this.gridSize,
            this.gridSize / 2.5,
            0,
            2 * Math.PI
        );
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
    }

    drawSnake() {
        this.snake.getSegments().forEach((segment, index) => {
            const isHead = index === 0;
            
            // Calculate gradient colors
            const hue = 120 + (index * 2);
            this.ctx.fillStyle = `hsl(${hue}, 70%, ${isHead ? 60 : 50}%)`;

            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            const size = this.gridSize - 1;
            const radius = isHead ? 8 : 4;

            // Add subtle shadow
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 3;
            
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, size, size, radius);
            this.ctx.fill();
            
            this.ctx.shadowBlur = 0;

            // Draw eyes on head
            if (isHead) {
                this.drawSnakeEyes(x, y);
            }
        });
    }

    drawSnakeEyes(x, y) {
        this.ctx.fillStyle = '#000';
        const eyeSize = 3;
        const dx = this.snake.direction.x;
        const dy = this.snake.direction.y;
        
        if (dx !== 0) {
            this.ctx.beginPath();
            this.ctx.arc(x + (dx > 0 ? 15 : 5), y + 6, eyeSize, 0, 2 * Math.PI);
            this.ctx.arc(x + (dx > 0 ? 15 : 5), y + 14, eyeSize, 0, 2 * Math.PI);
            this.ctx.fill();
        } else {
            this.ctx.beginPath();
            this.ctx.arc(x + 6, y + (dy > 0 ? 15 : 5), eyeSize, 0, 2 * Math.PI);
            this.ctx.arc(x + 14, y + (dy > 0 ? 15 : 5), eyeSize, 0, 2 * Math.PI);
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