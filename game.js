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
        
        // Touch handling
        this.touchStartX = null;
        this.touchStartY = null;
        this.minSwipeDistance = 30;
        
        // Initialize game
        this.setupEventListeners();
        this.resizeCanvas();
        this.initGame();
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // Mobile controls
        if (this.isMobile()) {
            this.setupMobileControls();
            this.setupTouchControls();
        }
        
        // Pause button
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        
        // Window resize
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Only prevent default on the game canvas
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
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

    setupMobileControls() {
        const controls = document.getElementById('mobileControls');
        controls.style.display = 'flex';

        const directions = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 }
        };

        Object.entries(directions).forEach(([dir, vector]) => {
            const button = document.getElementById(`${dir}Btn`);
            
            // Handle both touch and click events
            ['touchstart', 'mousedown'].forEach(eventType => {
                button.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    if (!this.isPaused && this.isValidMove(vector)) {
                        this.direction = vector;
                    }
                });
            });
            
            // Prevent default on touchend to avoid any unwanted behavior
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
            });
        });
    }

    setupTouchControls() {
        this.canvas.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.touchStartX || !this.touchStartY || this.isPaused) return;

            const touchEndX = e.touches[0].clientX;
            const touchEndY = e.touches[0].clientY;
            
            const deltaX = touchEndX - this.touchStartX;
            const deltaY = touchEndY - this.touchStartY;
            
            // Only process swipe if it's long enough
            if (Math.abs(deltaX) > this.minSwipeDistance || Math.abs(deltaY) > this.minSwipeDistance) {
                // Determine primary direction of swipe
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    // Horizontal swipe
                    const newDir = { x: deltaX > 0 ? 1 : -1, y: 0 };
                    if (this.isValidMove(newDir)) {
                        this.direction = newDir;
                    }
                } else {
                    // Vertical swipe
                    const newDir = { x: 0, y: deltaY > 0 ? 1 : -1 };
                    if (this.isValidMove(newDir)) {
                        this.direction = newDir;
                    }
                }
                
                // Reset touch start position to allow for continuous swipes
                this.touchStartX = touchEndX;
                this.touchStartY = touchEndY;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            this.touchStartX = null;
            this.touchStartY = null;
        }, { passive: true });
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