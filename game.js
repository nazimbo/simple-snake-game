class VirtualJoystick {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.active = false;
        this.startPos = { x: 0, y: 0 };
        this.currentPos = { x: 0, y: 0 };
        this.maxDistance = 50; // Maximum joystick distance
        this.deadzone = 0.2; // Minimum distance ratio to register movement
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Touch events
        this.canvas.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleEnd.bind(this), { passive: false });
        
        // Prevent default touch behaviors
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault());
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault());
        this.canvas.addEventListener('touchend', (e) => e.preventDefault());
    }

    handleStart(e) {
        if (this.game.isPaused) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        
        this.active = true;
        this.startPos = {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
        this.currentPos = { ...this.startPos };
    }

    handleMove(e) {
        if (!this.active || this.game.isPaused) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        
        this.currentPos = {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };

        // Calculate direction vector
        const dx = this.currentPos.x - this.startPos.x;
        const dy = this.currentPos.y - this.startPos.y;
        
        // Calculate distance
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only update direction if beyond deadzone
        if (distance > this.maxDistance * this.deadzone) {
            // Normalize the direction
            const angle = Math.atan2(dy, dx);
            
            // Convert angle to closest cardinal direction (right, up, left, down)
            const sector = Math.round(angle / (Math.PI / 2));
            
            // Map sector to direction
            const directions = [
                { x: 1, y: 0 },   // right
                { x: 0, y: -1 },  // up
                { x: -1, y: 0 },  // left
                { x: 0, y: 1 }    // down
            ];
            
            // Get the normalized sector index (0-3)
            const normalizedSector = ((sector % 4) + 4) % 4;
            
            // Update game direction if it's a valid move
            const newDir = directions[normalizedSector];
            if (this.game.isValidMove(newDir)) {
                this.game.direction = newDir;
            }
        }
    }

    handleEnd() {
        this.active = false;
    }

    draw(ctx) {
        if (!this.active) return;
        
        // Draw base circle
        ctx.beginPath();
        ctx.arc(this.startPos.x, this.startPos.y, this.maxDistance, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw joystick handle
        ctx.beginPath();
        ctx.arc(this.currentPos.x, this.currentPos.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.stroke();
    }
}

class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game elements
        this.snake = [];
        this.food = { x: 0, y: 0 };
        this.direction = { x: 0, y: 0 };
        this.lastDirection = { x: 0, y: 0 };
        
        // Game state
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        this.speed = 1;
        this.baseInterval = 200;
        this.currentInterval = this.baseInterval;
        this.lastMoveTime = 0;
        this.isPaused = false;
        this.isGameOver = false;
        
        // Grid settings
        this.gridSize = 20;
        this.tileCount = 20;
        
        // Initialize joystick if on mobile
        this.joystick = null;
        if (this.isMobile()) {
            this.joystick = new VirtualJoystick(this);
        }
        
        // Initialize game
        this.setupEventListeners();
        this.resizeCanvas();
        this.initGame();
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // Pause button
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        
        // Window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const maxSize = Math.min(window.innerWidth - 40, window.innerHeight - 40, 400);
        this.canvas.width = this.canvas.height = maxSize;
        this.gridSize = Math.floor(maxSize / this.tileCount);
    }

    initGame() {
        this.snake = [{ x: 10, y: 10 }];
        this.direction = { x: 0, y: 0 };
        this.generateFood();
        this.score = 0;
        this.speed = 1;
        this.currentInterval = this.baseInterval;
        this.isPaused = false;
        this.isGameOver = false;
        this.updateScoreDisplay();
        this.hideScreens();
    }

    generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        this.food = newFood;
    }

    moveSnake() {
        const head = { 
            x: this.snake[0].x + this.direction.x,
            y: this.snake[0].y + this.direction.y 
        };

        // Check if snake ate food
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.speed = 1 + Math.floor(this.score / 5);
            this.currentInterval = Math.max(this.baseInterval - (this.speed - 1) * 20, 50);
            this.generateFood();
            this.updateScoreDisplay();
            
            // Update high score
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('snakeHighScore', this.highScore);
            }
        } else {
            this.snake.pop();
        }

        this.snake.unshift(head);
    }

    checkCollision() {
        const head = this.snake[0];
        
        // Wall collision
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            return true;
        }
        
        // Self collision
        return this.snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y);
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw snake
        this.snake.forEach((segment, index) => {
            this.drawSnakeSegment(segment, index === 0);
        });

        // Draw food
        this.drawFood();

        // Draw joystick if active
        if (this.joystick && !this.isPaused) {
            this.joystick.draw(this.ctx);
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= this.tileCount; i++) {
            const pos = i * this.gridSize;
            this.ctx.beginPath();
            this.ctx.moveTo(pos, 0);
            this.ctx.lineTo(pos, this.canvas.height);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, pos);
            this.ctx.lineTo(this.canvas.width, pos);
            this.ctx.stroke();
        }
    }

    drawSnakeSegment(segment, isHead) {
        const x = segment.x * this.gridSize;
        const y = segment.y * this.gridSize;
        
        // Create gradient for snake segment
        const gradient = this.ctx.createRadialGradient(
            x + this.gridSize/2, y + this.gridSize/2, 2,
            x + this.gridSize/2, y + this.gridSize/2, this.gridSize/2
        );
        gradient.addColorStop(0, '#50C878');
        gradient.addColorStop(1, '#228B22');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, this.gridSize - 2, this.gridSize - 2, 5);
        this.ctx.fill();

        // Draw eyes if it's the head
        if (isHead) {
            this.drawSnakeEyes(segment);
        }
    }

    drawSnakeEyes(head) {
        const x = head.x * this.gridSize;
        const y = head.y * this.gridSize;
        
        // White part of eyes
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(x + this.gridSize * 0.3, y + this.gridSize * 0.3, 3, 0, Math.PI * 2);
        this.ctx.arc(x + this.gridSize * 0.7, y + this.gridSize * 0.3, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Pupils
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(x + this.gridSize * 0.3, y + this.gridSize * 0.3, 1.5, 0, Math.PI * 2);
        this.ctx.arc(x + this.gridSize * 0.7, y + this.gridSize * 0.3, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawFood() {
        const x = this.food.x * this.gridSize;
        const y = this.food.y * this.gridSize;
        
        const gradient = this.ctx.createRadialGradient(
            x + this.gridSize/2, y + this.gridSize/2, 2,
            x + this.gridSize/2, y + this.gridSize/2, this.gridSize/2
        );
        gradient.addColorStop(0, '#FF6347');
        gradient.addColorStop(1, '#8B0000');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, this.gridSize - 2, this.gridSize - 2, 5);
        this.ctx.fill();

        // Draw highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(x + this.gridSize * 0.3, y + this.gridSize * 0.3, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    updateScoreDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
        document.getElementById('speed').textContent = this.speed;
    }

    handleKeydown(e) {
        if (this.isPaused && e.key !== ' ' && e.key !== 'Escape') return;

        switch (e.key) {
            case 'ArrowUp':
                if (this.direction.y === 0) {
                    this.direction = { x: 0, y: -1 };
                }
                break;
            case 'ArrowDown':
                if (this.direction.y === 0) {
                    this.direction = { x: 0, y: 1 };
                }
                break;
            case 'ArrowLeft':
                if (this.direction.x === 0) {
                    this.direction = { x: -1, y: 0 };
                }
                break;
            case 'ArrowRight':
                if (this.direction.x === 0) {
                    this.direction = { x: 1, y: 0 };
                }
                break;
            case ' ':
            case 'Escape':
                this.togglePause();
                break;
        }
    }

    isValidMove(newDirection) {
        // Prevent 180-degree turns
        return (this.direction.x === 0 && this.direction.y === 0) || 
               (newDirection.x === 0 && this.direction.x === 0) || 
               (newDirection.y === 0 && this.direction.y === 0);
    }

    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    togglePause() {
        if (this.isGameOver) return;
        
        this.isPaused = !this.isPaused;
        document.getElementById('pauseScreen').classList.toggle('hidden', !this.isPaused);
        document.getElementById('pauseBtn').textContent = this.isPaused ? '▶️' : '⏸️';
        
        if (!this.isPaused) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    showGameOver() {
        this.isGameOver = true;
        document.getElementById('gameOverScreen').classList.remove('hidden');
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalHighScore').textContent = this.highScore;
        document.getElementById('finalSpeed').textContent = this.speed;
    }

    hideScreens() {
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('pauseScreen').classList.add('hidden');
    }

    restartGame() {
        this.initGame();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    gameLoop(currentTime) {
        if (this.isPaused) return;

        if (this.checkCollision()) {
            this.showGameOver();
            return;
        }

        requestAnimationFrame(this.gameLoop.bind(this));

        if (currentTime - this.lastMoveTime > this.currentInterval) {
            this.moveSnake();
            this.draw();
            this.lastMoveTime = currentTime;
        }
    }
}

// Start the game when the window loads
window.addEventListener('load', () => {
    const game = new SnakeGame();
    game.gameLoop();
});