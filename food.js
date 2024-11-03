class Food {
    constructor() {
        this.position = {x: 15, y: 15};
        this.value = 10; // Default score value
        this.spawnTime = Date.now();
    }

    spawn(width, height, snake) {
        const availablePositions = [];
        
        // Generate all possible positions
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (!this.isOnSnake({x, y}, snake)) {
                    availablePositions.push({x, y});
                }
            }
        }

        if (availablePositions.length === 0) {
            return false; // No available positions
        }

        // Randomly select from available positions
        const randomIndex = Math.floor(Math.random() * availablePositions.length);
        this.position = availablePositions[randomIndex];
        this.spawnTime = Date.now();
        return true;
    }

    isOnSnake(position, snake) {
        return snake.getSegments().some(segment => 
            segment.x === position.x && segment.y === position.y
        );
    }

    getPosition() {
        return this.position;
    }

    getValue() {
        return this.value;
    }

    // Get food age for potential special effects
    getAge() {
        return Date.now() - this.spawnTime;
    }
}