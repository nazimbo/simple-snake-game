class Snake {
    constructor() {
        this.segments = [{x: 10, y: 10}];
        this.direction = {x: 1, y: 0};
        this.nextDirection = {x: 1, y: 0};
        this.growing = false;
        this.lastMoveTime = 0;
        this.moveDelay = 150;
    }

    update(width, height) {
        // Only update direction if it's not opposite to current direction
        const isOpposite = (
            (this.nextDirection.x !== 0 && this.nextDirection.x === -this.direction.x) ||
            (this.nextDirection.y !== 0 && this.nextDirection.y === -this.direction.y)
        );

        if (!isOpposite) {
            this.direction = {...this.nextDirection};
        }

        const head = this.segments[0];
        const newHead = {
            x: (head.x + this.direction.x + width) % width,
            y: (head.y + this.direction.y + height) % height
        };

        // Check for self-collision before adding new head
        if (this.checkSelfCollision(newHead)) {
            return true; // Collision detected
        }

        this.segments.unshift(newHead);
        if (!this.growing) {
            this.segments.pop();
        }
        this.growing = false;
        return false; // No collision
    }

    checkSelfCollision(head) {
        return this.segments.some((segment, index) => 
            // Skip the last segment when checking collision (allows snake to move)
            index < this.segments.length - (this.growing ? 0 : 1) &&
            segment.x === head.x && 
            segment.y === head.y
        );
    }

    setDirection(newDirection, currentTime) {
        // Prevent rapid direction changes
        if (currentTime - this.lastMoveTime < this.moveDelay) {
            return false;
        }

        // Prevent 180-degree turns
        const isOpposite = (
            (newDirection.x !== 0 && newDirection.x === -this.direction.x) ||
            (newDirection.y !== 0 && newDirection.y === -this.direction.y)
        );

        if (!isOpposite) {
            this.nextDirection = newDirection;
            this.lastMoveTime = currentTime;
            return true;
        }
        return false;
    }

    grow() {
        this.growing = true;
    }

    getHead() {
        return this.segments[0];
    }

    getSegments() {
        return this.segments;
    }
}