class Snake {
    constructor() {
        this.segments = new Array(1);
        this.segments[0] = {x: 10, y: 10};
        this.direction = {x: 1, y: 0};
        this.nextDirection = {x: 1, y: 0};
        this.growing = false;
        this.lastMoveTime = 0;
        this.moveDelay = 150;
        
        // Cache for collision detection
        this.collisionMap = new Map();
    }

    update(width, height) {
        // Check direction change
        if (!this.isOppositeDirection(this.nextDirection, this.direction)) {
            this.direction = {...this.nextDirection};
        }

        const head = this.segments[0];
        const newHead = {
            x: (head.x + this.direction.x + width) % width,
            y: (head.y + this.direction.y + height) % height
        };

        // Update collision map
        this.updateCollisionMap(newHead);
        
        // Check for collision
        if (this.hasCollision(newHead)) {
            return true;
        }

        // Update segments
        this.segments.unshift(newHead);
        if (!this.growing) {
            const removed = this.segments.pop();
            this.collisionMap.delete(`${removed.x},${removed.y}`);
        }
        this.growing = false;
        
        return false;
    }

    updateCollisionMap(newHead) {
        // Clear and rebuild collision map
        this.collisionMap.clear();
        for (let i = 0; i < this.segments.length - (this.growing ? 0 : 1); i++) {
            const seg = this.segments[i];
            this.collisionMap.set(`${seg.x},${seg.y}`, true);
        }
    }

    hasCollision(position) {
        return this.collisionMap.has(`${position.x},${position.y}`);
    }

    isOppositeDirection(dir1, dir2) {
        return (dir1.x !== 0 && dir1.x === -dir2.x) || 
               (dir1.y !== 0 && dir1.y === -dir2.y);
    }

    setDirection(newDirection, currentTime) {
        if (currentTime - this.lastMoveTime < this.moveDelay) {
            return false;
        }

        if (!this.isOppositeDirection(newDirection, this.direction)) {
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