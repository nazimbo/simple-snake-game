class Snake {
    constructor() {
        this.segments = [{x: 10, y: 10}];
        this.direction = {x: 1, y: 0};
        this.nextDirection = {x: 1, y: 0};
        this.growing = false;
    }

    update() {
        this.direction = {...this.nextDirection};
        const head = this.segments[0];
        const newHead = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y
        };

        this.segments.unshift(newHead);
        if (!this.growing) {
            this.segments.pop();
        }
        this.growing = false;
    }

    grow() {
        this.growing = true;
    }

    setDirection(direction) {
        const oppositeDirection = (
            (direction.x !== 0 && direction.x === -this.direction.x) ||
            (direction.y !== 0 && direction.y === -this.direction.y)
        );

        if (!oppositeDirection) {
            this.nextDirection = direction;
        }
    }

    checkCollision(width, height) {
        const head = this.segments[0];
        
        // Wall collision
        if (head.x < 0 || head.x >= width || head.y < 0 || head.y >= height) {
            return true;
        }

        // Self collision
        for (let i = 1; i < this.segments.length; i++) {
            if (head.x === this.segments[i].x && head.y === this.segments[i].y) {
                return true;
            }
        }

        return false;
    }
}

class Food {
    constructor() {
        this.position = {x: 15, y: 15};
    }

    spawn(width, height, snake) {
        let newPosition;
        do {
            newPosition = {
                x: Math.floor(Math.random() * width),
                y: Math.floor(Math.random() * height)
            };
        } while (this.isOnSnake(newPosition, snake));
        
        this.position = newPosition;
    }

    isOnSnake(position, snake) {
        return snake.segments.some(segment => 
            segment.x === position.x && segment.y === position.y
        );
    }
}

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = 20;
        this.width = canvas.width / this.gridSize;
        this.height = canvas.height / this.gridSize;
        this.snake = new Snake();
        this.food = new Food();
        this.score = 0;
        this.gameOver = false;
        this.animationFrame = null;
        this.lastRenderTime = 0;
        this.gameSpeed = 150; // Lower = faster

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowUp':
                    this.snake.setDirection({x: 0, y: -1});
                    break;
                case 'ArrowDown':
                    this.snake.setDirection({x: 0, y: 1});
                    break;
                case 'ArrowLeft':
                    this.snake.setDirection({x: -1, y: 0});
                    break;
                case 'ArrowRight':
                    this.snake.setDirection({x: 1, y: 0});
                    break;
            }
        });

        document.getElementById('restartButton').addEventListener('click', () => {
            this.restart();
        });
    }

    update() {
        if (this.gameOver) return;

        this.snake.update();

        // Check for collisions
        if (this.snake.checkCollision(this.width, this.height)) {
            this.endGame();
            return;
        }

        // Check for food collision
        const head = this.snake.segments[0];
        if (head.x === this.food.position.x && head.y === this.food.position.y) {
            this.score += 10;
            document.getElementById('score').textContent = this.score;
            this.snake.grow();
            this.food.spawn(this.width, this.height, this.snake);
            this.gameSpeed = Math.max(50, this.gameSpeed - 2); // Speed up the game
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw food
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(
            (this.food.position.x + 0.5) * this.gridSize,
            (this.food.position.y + 0.5) * this.gridSize,
            this.gridSize / 2,
            0,
            2 * Math.PI
        );
        this.ctx.fill();

        // Draw snake
        this.snake.segments.forEach((segment, index) => {
            const isHead = index === 0;
            
            // Calculate gradient colors
            const hue = 120 + (index * 2);
            this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;

            // Draw rounded rectangle for each segment
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            const size = this.gridSize - 1;
            const radius = isHead ? 8 : 4;

            this.ctx.beginPath();
            this.ctx.roundRect(x, y, size, size, radius);
            this.ctx.fill();

            // Draw eyes if it's the head
            if (isHead) {
                this.ctx.fillStyle = '#000';
                const eyeSize = 3;
                const eyeOffset = 4;
                
                // Position eyes based on direction
                const dx = this.snake.direction.x;
                const dy = this.snake.direction.y;
                
                if (dx !== 0) {
                    // Moving horizontally
                    this.ctx.beginPath();
                    this.ctx.arc(x + (dx > 0 ? 15 : 5), y + 6, eyeSize, 0, 2 * Math.PI);
                    this.ctx.arc(x + (dx > 0 ? 15 : 5), y + 14, eyeSize, 0, 2 * Math.PI);
                    this.ctx.fill();
                } else {
                    // Moving vertically
                    this.ctx.beginPath();
                    this.ctx.arc(x + 6, y + (dy > 0 ? 15 : 5), eyeSize, 0, 2 * Math.PI);
                    this.ctx.arc(x + 14, y + (dy > 0 ? 15 : 5), eyeSize, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
            }
        });
    }

    gameLoop(currentTime) {
        if (this.lastRenderTime === 0) {
            this.lastRenderTime = currentTime;
        }

        const elapsed = currentTime - this.lastRenderTime;

        if (elapsed > this.gameSpeed) {
            this.update();
            this.render();
            this.lastRenderTime = currentTime;
        }

        if (!this.gameOver) {
            this.animationFrame = requestAnimationFrame((time) => this.gameLoop(time));
        }
    }

    start() {
        this.gameLoop(0);
    }

    endGame() {
        this.gameOver = true;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').style.display = 'flex';
        cancelAnimationFrame(this.animationFrame);
    }

    restart() {
        this.snake = new Snake();
        this.food = new Food();
        this.score = 0;
        this.gameSpeed = 150;
        this.gameOver = false;
        this.lastRenderTime = 0;
        document.getElementById('score').textContent = '0';
        document.getElementById('gameOver').style.display = 'none';
        this.start();
    }
}

// Initialize and start the game
const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);
game.start();