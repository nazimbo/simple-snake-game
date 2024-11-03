class VirtualJoystick {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.active = false;
        this.visible = false;
        this.startPos = { x: 0, y: 0 };
        this.currentPos = { x: 0, y: 0 };
        this.maxDistance = Math.min(this.canvas.width, this.canvas.height) * 0.15; // Adaptive size
        this.deadzone = 0.05; // Smaller deadzone for better responsiveness
        this.touchId = null;
        this.lastDirection = { x: 0, y: 0 };
        
        // Control zones
        this.leftZone = {
            x: 0,
            y: this.canvas.height * 0.3,
            width: this.canvas.width * 0.5,
            height: this.canvas.height * 0.7
        };
        
        this.rightZone = {
            x: this.canvas.width * 0.5,
            y: this.canvas.height * 0.3,
            width: this.canvas.width * 0.5,
            height: this.canvas.height * 0.7
        };
        
        this.activeZone = null;
        this.setupEventListeners();
        
        // Visual feedback states
        this.invalidMove = false;
        this.invalidMoveTimer = null;
    }

    setupEventListeners() {
        // Touch event handlers with proper event delegation
        const handleTouch = (e) => {
            // Only prevent default if touch is in game area
            if (this.isTouchInGameArea(e.touches[0])) {
                e.preventDefault();
            }
        };

        this.canvas.addEventListener('touchstart', (e) => {
            handleTouch(e);
            this.handleStart(e);
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            handleTouch(e);
            this.handleMove(e);
        }, { passive: false });
        
        // Use touchend on document to catch events outside canvas
        document.addEventListener('touchend', (e) => {
            if (this.touchId !== null) {
                e.preventDefault();
                this.handleEnd(e);
            }
        });
        
        document.addEventListener('touchcancel', (e) => {
            if (this.touchId !== null) {
                e.preventDefault();
                this.handleEnd(e);
            }
        });
    }

    isTouchInGameArea(touch) {
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        return (x >= 0 && x <= this.canvas.width && 
                y >= this.canvas.height * 0.3 && y <= this.canvas.height);
    }

    handleStart(e) {
        if (this.game.isPaused || this.game.isGameOver) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        // Determine which zone was touched
        if (touchY >= this.leftZone.y) {
            if (touchX < this.canvas.width * 0.5) {
                this.activeZone = this.leftZone;
            } else {
                this.activeZone = this.rightZone;
            }
            
            this.touchId = touch.identifier;
            this.active = true;
            this.visible = true;
            this.startPos = { x: touchX, y: touchY };
            this.currentPos = { ...this.startPos };
            
            // Clear any invalid move state
            this.invalidMove = false;
            if (this.invalidMoveTimer) {
                clearTimeout(this.invalidMoveTimer);
            }
        }
    }

    handleMove(e) {
        if (!this.active || this.game.isPaused || this.game.isGameOver) return;

        const touch = Array.from(e.touches).find(t => t.identifier === this.touchId);
        if (!touch) return;

        const rect = this.canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        this.currentPos = { x: touchX, y: touchY };

        // Calculate direction vector
        const dx = this.currentPos.x - this.startPos.x;
        const dy = this.currentPos.y - this.startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Limit joystick movement
        if (distance > this.maxDistance) {
            const angle = Math.atan2(dy, dx);
            this.currentPos = {
                x: this.startPos.x + Math.cos(angle) * this.maxDistance,
                y: this.startPos.y + Math.sin(angle) * this.maxDistance
            };
        }

        if (distance > this.maxDistance * this.deadzone) {
            // Simplified 4-directional control
            const angle = Math.atan2(dy, dx);
            
            // Convert angle to direction
            let newDirection;
            if (Math.abs(dy) > Math.abs(dx)) {
                // Vertical movement
                newDirection = { x: 0, y: dy > 0 ? 1 : -1 };
            } else {
                // Horizontal movement
                newDirection = { x: dx > 0 ? 1 : -1, y: 0 };
            }

            // Check if move is valid (not 180° turn)
            if (!this.isOppositeDirection(newDirection, this.game.direction)) {
                this.game.direction = newDirection;
                this.lastDirection = newDirection;
                this.invalidMove = false;
            } else {
                // Visual feedback for invalid move
                this.invalidMove = true;
                if (this.invalidMoveTimer) clearTimeout(this.invalidMoveTimer);
                this.invalidMoveTimer = setTimeout(() => {
                    this.invalidMove = false;
                }, 500);
            }
        }
    }

    handleEnd(e) {
        const activeTouch = Array.from(e.touches).find(t => t.identifier === this.touchId);
        if (!activeTouch) {
            this.active = false;
            this.touchId = null;
            
            // Fade out joystick
            setTimeout(() => {
                if (!this.active) {
                    this.visible = false;
                }
            }, 200);
        }
    }

    isOppositeDirection(newDir, currentDir) {
        return (newDir.x !== 0 && newDir.x === -currentDir.x) || 
               (newDir.y !== 0 && newDir.y === -currentDir.y);
    }

    draw(ctx) {
        if (!this.visible) return;

        const baseAlpha = this.active ? 0.8 : 0.6;
        
        // Draw control zone indicator
        if (this.activeZone) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.active ? 0.1 : 0.05})`;
            ctx.fillRect(
                this.activeZone.x,
                this.activeZone.y,
                this.activeZone.width,
                this.activeZone.height
            );
        }

        // Draw joystick base
        ctx.beginPath();
        ctx.arc(this.startPos.x, this.startPos.y, this.maxDistance, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${baseAlpha * 0.2})`;
        ctx.fill();
        
        // Draw direction guide
        if (this.active) {
            ctx.beginPath();
            ctx.moveTo(this.startPos.x, this.startPos.y);
            ctx.lineTo(this.currentPos.x, this.currentPos.y);
            ctx.strokeStyle = this.invalidMove ? 
                `rgba(255, 0, 0, ${baseAlpha})` : 
                `rgba(255, 255, 255, ${baseAlpha})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw joystick handle
        const handleGradient = ctx.createRadialGradient(
            this.currentPos.x, this.currentPos.y, 0,
            this.currentPos.x, this.currentPos.y, 30
        );
        
        if (this.invalidMove) {
            handleGradient.addColorStop(0, `rgba(255, 100, 100, ${baseAlpha})`);
            handleGradient.addColorStop(1, `rgba(200, 50, 50, ${baseAlpha})`);
        } else {
            handleGradient.addColorStop(0, `rgba(255, 255, 255, ${baseAlpha})`);
            handleGradient.addColorStop(1, `rgba(200, 200, 200, ${baseAlpha})`);
        }
        
        ctx.beginPath();
        ctx.arc(this.currentPos.x, this.currentPos.y, 30, 0, Math.PI * 2);
        ctx.fillStyle = handleGradient;
        ctx.fill();
        ctx.strokeStyle = `rgba(0, 0, 0, ${baseAlpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Call this when canvas is resized
    updateDimensions() {
        this.maxDistance = Math.min(this.canvas.width, this.canvas.height) * 0.15;
        
        this.leftZone = {
            x: 0,
            y: this.canvas.height * 0.3,
            width: this.canvas.width * 0.5,
            height: this.canvas.height * 0.7
        };
        
        this.rightZone = {
            x: this.canvas.width * 0.5,
            y: this.canvas.height * 0.3,
            width: this.canvas.width * 0.5,
            height: this.canvas.height * 0.7
        };
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
        
        // Control settings
        this.hasTouch = this.detectTouchSupport();
        this.joystick = null;
        this.touchEnabled = false;
        this.keyboardEnabled = true;
        
        // Initialize game
        this.setupEventListeners();
        this.initControls();
        this.resizeCanvas();
        this.initGame();
    }

    detectTouchSupport() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0);
    }

    initControls() {
        // Always create joystick if touch is supported
        if (this.hasTouch) {
            this.joystick = new VirtualJoystick(this);
            this.touchEnabled = true;
        }
        
        // Create control toggle button for touch-enabled devices
        if (this.hasTouch) {
            const controlToggle = document.createElement('button');
            controlToggle.id = 'controlToggle';
            controlToggle.className = 'control-btn';
            controlToggle.textContent = this.touchEnabled ? '⌨️' : '👆';
            controlToggle.title = this.touchEnabled ? 'Switch to Keyboard' : 'Switch to Touch';
            
            controlToggle.addEventListener('click', () => {
                this.toggleControls();
            });
            
            const header = document.querySelector('.game-header');
            header.insertBefore(controlToggle, header.firstChild);
        }
    }

    toggleControls() {
        this.touchEnabled = !this.touchEnabled;
        this.keyboardEnabled = !this.touchEnabled;
        
        const controlToggle = document.getElementById('controlToggle');
        if (controlToggle) {
            controlToggle.textContent = this.touchEnabled ? '⌨️' : '👆';
            controlToggle.title = this.touchEnabled ? 'Switch to Keyboard' : 'Switch to Touch';
        }
        
        // Reset controls state
        if (this.joystick) {
            this.joystick.active = false;
            this.joystick.visible = false;
        }
        this.direction = { x: 0, y: 0 };
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.keyboardEnabled) {
                this.handleKeydown(e);
            }
        });
        
        // Pause button
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        
        // Window resize with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resizeCanvas();
                if (this.joystick) {
                    this.joystick.updateDimensions();
                }
            }, 250);
        });

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && !this.isPaused && !this.isGameOver) {
                this.togglePause();
            }
        });
    }

    resizeCanvas() {
        const maxSize = Math.min(window.innerWidth - 40, window.innerHeight - 40, 400);
        this.canvas.width = this.canvas.height = maxSize;
        this.gridSize = Math.floor(maxSize / this.tileCount);
        this.draw(); // Redraw immediately after resize
    }

    initGame() {
        // Reset game state
        this.snake = [{ x: 10, y: 10 }];
        this.direction = { x: 0, y: 0 };
        this.lastDirection = { x: 0, y: 0 };
        this.score = 0;
        this.speed = 1;
        this.currentInterval = this.baseInterval;
        this.isPaused = false;
        this.isGameOver = false;
        
        // Reset controls
        if (this.joystick) {
            this.joystick.active = false;
            this.joystick.visible = false;
        }
        
        this.generateFood();
        this.updateScoreDisplay();
        this.hideScreens();
    }

    moveSnake() {
        // Store last direction before moving
        this.lastDirection = { ...this.direction };
        
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

    draw() {
        // Clear canvas with background
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

        // Draw joystick if touch is enabled
        if (this.touchEnabled && this.joystick && !this.isPaused) {
            this.joystick.draw(this.ctx);
        }
    }

    // ... (keep existing methods for drawGrid, drawSnakeSegment, drawFood, etc.)

    showGameOver() {
        this.isGameOver = true;
        
        // Clean up touch state
        if (this.joystick) {
            this.joystick.active = false;
            this.joystick.visible = false;
        }
        
        document.getElementById('gameOverScreen').classList.remove('hidden');
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalHighScore').textContent = this.highScore;
        document.getElementById('finalSpeed').textContent = this.speed;
    }

    gameLoop(currentTime) {
        if (this.isPaused) return;
        
        if (!this.lastMoveTime) {
            this.lastMoveTime = currentTime;
        }

        if (this.checkCollision()) {
            this.showGameOver();
            return;
        }

        const deltaTime = currentTime - this.lastMoveTime;
        
        // Update snake position based on current interval
        if (deltaTime > this.currentInterval) {
            this.moveSnake();
            this.lastMoveTime = currentTime;
        }

        // Always draw every frame for smooth animation
        this.draw();
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }
}

// Start the game when the window loads
window.addEventListener('load', () => {
    const game = new SnakeGame();
    requestAnimationFrame(game.gameLoop.bind(game));
});