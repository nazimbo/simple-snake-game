// Initialize game when window loads
window.addEventListener('load', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    try {
        // Initialize game
        const game = new Game(canvas);

        // Add touch controls for mobile devices
        if ('ontouchstart' in window) {
            setupTouchControls(game);
        }

        // Add keyboard focus handling
        handleKeyboardFocus();

        // Show start screen
        document.getElementById('startScreen').style.display = 'flex';

    } catch (error) {
        console.error('Failed to initialize game:', error);
        showErrorMessage('Failed to start game. Please refresh the page.');
    }
});

// Setup touch controls for mobile devices
function setupTouchControls(game) {
    const touchControlsDiv = document.createElement('div');
    touchControlsDiv.className = 'touch-controls';
    touchControlsDiv.innerHTML = `
        <div></div>
        <button class="touch-button" data-direction="up">↑</button>
        <div></div>
        <button class="touch-button" data-direction="left">←</button>
        <button class="touch-button" data-direction="down">↓</button>
        <button class="touch-button" data-direction="right">→</button>
    `;

    document.querySelector('.game-container').appendChild(touchControlsDiv);

    // Map touch controls to directions
    const directionMap = {
        'up': { x: 0, y: -1 },
        'down': { x: 0, y: 1 },
        'left': { x: -1, y: 0 },
        'right': { x: 1, y: 0 }
    };

    // Add touch event listeners
    const buttons = touchControlsDiv.querySelectorAll('.touch-button');
    buttons.forEach(button => {
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const direction = button.dataset.direction;
            if (direction && directionMap[direction]) {
                game.snake.setDirection(directionMap[direction], performance.now());
            }
        });
    });
}

// Handle keyboard focus for better accessibility
function handleKeyboardFocus() {
    // Prevent spacebar from scrolling the page
    window.addEventListener('keydown', (e) => {
        if (e.key === ' ' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
        }
    });

    // Add focus indicators for buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('focus', () => {
            button.style.outline = '2px solid #fff';
        });
        button.addEventListener('blur', () => {
            button.style.outline = 'none';
        });
    });
}

// Error handling
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        z-index: 1000;
    `;
    errorDiv.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
        margin-top: 10px;
        padding: 5px 15px;
        background: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;
    closeButton.onclick = () => errorDiv.remove();

    errorDiv.appendChild(document.createElement('br'));
    errorDiv.appendChild(closeButton);
    document.body.appendChild(errorDiv);
}

// Add PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    });
}

// Handle visibility change for better UX
document.addEventListener('visibilitychange', () => {
    const canvas = document.getElementById('gameCanvas');
    if (canvas && window.game) {
        if (document.hidden && !window.game.gameOver && window.game.gameStarted) {
            window.game.togglePause();
        }
    }
});

// Prevent accidental back navigation
window.addEventListener('beforeunload', (e) => {
    if (window.game && window.game.gameStarted && !window.game.gameOver) {
        e.preventDefault();
        e.returnValue = '';
    }
});