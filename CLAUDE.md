# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A browser-based Snake game built with vanilla JavaScript and the HTML5 Canvas API. There is **no build system, package manager, transpiler, or test framework** — the source files are served as-is to the browser.

## Running & Developing

There is nothing to build or install. To run the game, serve the directory over HTTP and open `index.html`:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Use a server rather than opening the file directly via `file://`: the service worker registers at the root scope (`/service-worker.js`) and its cache list uses root-relative paths (`/index.html`, `/styles.css`, ...), so PWA features only work when served from the site root.

There is no lint or test command. Verify changes by playing the game in the browser and watching the console. Press **Ctrl+D** in-game to toggle a live debug panel (FPS, game speed, snake length, head/food positions, game state). Press **M** (or the speaker button on the board) to mute/unmute sound.

## Architecture

Classes are plain global scripts (no modules, no `import`/`export`). They attach to the global scope and `index.html` loads them in dependency order — **this order matters**:

```
snake.js  →  food.js  →  themes.js  →  audio.js  →  game.js  →  main.js
```

- **`Snake` (`snake.js`)** — owns the segment list, movement, and self-collision. Movement is **toroidal**: the head wraps around board edges via `(pos + dir + size) % size` rather than colliding with walls. Self-collision is detected with a `collisionMap` (a `Map` keyed by `"x,y"` strings) rebuilt each tick. Direction changes are rejected if they reverse the current direction or arrive faster than `moveDelay` (debounce), which is why `setDirection` takes a timestamp.

- **`Food` (`food.js`)** — holds position and score value. `spawn()` builds the list of all cells not occupied by the snake and picks one at random. It **returns `false` when no cell is free**, which is the game's win condition (board fully filled).

- **`themes.js`** — defines the global `THEMES` array and `ThemeManager`. Each theme has a `ui` half (CSS custom properties applied to `:root` via `ThemeManager.applyUI` — page chrome, overlays, buttons) and a `board` half (tokens the canvas renderer reads — background gradient/vignette, grid style, snake HSL gradient + glow, food, particle colour). Snake colour is expressed in HSL so one token set covers both flat-monochrome and multi-hue gradients (`hueHead → hueTail`). The chosen theme persists in `localStorage` under `snakeTheme`. Adding a theme is purely data: append an entry to `THEMES`.

- **`audio.js`** — `AudioManager`: procedural chiptune music + SFX via the Web Audio API (no audio files). The `AudioContext` is created lazily on the first user gesture (browsers block autoplay), so `resume()`/`startMusic()` are called from `startGame`/`restart`/unpause. Music is a `setInterval` step sequencer over `melody`/`bass` frequency arrays; SFX (`playEat`, `playGameOver`, `playWin`) are short enveloped oscillators. Mute state persists in `localStorage` under `snakeMuted`. `Game` owns an instance as `this.audio` and every call is null-guarded (Web Audio may be absent).

- **`Game` (`game.js`)** — the orchestrator. Holds canvas/context, game state, scoring, the main loop, and all rendering. It instantiates `Snake` and `Food`, runs collision checks, and drives every screen transition. This is the largest file and where most gameplay changes go.

- **`main.js`** — bootstraps on `window.load`: constructs `Game`, wires touch controls on touch devices, registers the service worker, and adds page-level UX handlers (auto-pause on tab hidden, `beforeunload` guard, spacebar scroll prevention).

### Game loop (in `Game`)

`gameLoop()` runs on `requestAnimationFrame` but uses a **fixed-timestep accumulator**: it only calls `update()` + `render()` once `deltaTime >= gameSpeed`. `gameSpeed` starts at 150ms and decreases by `speedIncrease` (2ms) per food eaten, floored at `minSpeed` (50ms) — so the game accelerates as the score climbs. The loop handle is stored in `this.animationFrameId`.

### Rendering

`render()` runs **every animation frame** (decoupled from the fixed-timestep `update()`, so effects stay smooth even when game logic ticks slowly): it draws the background, blits the **pre-rendered grid** from an off-screen canvas (`gridCanvas`, rebuilt by `renderGrid()` whenever the theme changes), then draws food, snake, and effects. All colours come from `this.activeTheme.board`. The snake uses an HSL gradient along the body with rounded corners, connection rectangles to smooth joints, and direction-oriented eyes. Eating food spawns an expanding ring + a few particles (`spawnFoodEffects` → `updateEffects`/`drawEffects`), all tinted by the theme's effect colour.

### State & screens

Game state lives as booleans/numbers on the `Game` instance (`gameStarted`, `gameOver`, `isPaused`, `score`, `gameSpeed`). The four overlays (`startScreen`, `pauseScreen`, `gameOver`, `winScreen`) are plain HTML divs toggled via `display`; `hideAllScreens()` hides all of them and each state transition shows the relevant one. High score persists in `localStorage` under the key `snakeHighScore`.

## Conventions & gotchas

- **No frameworks or dependencies** — keep it that way unless explicitly asked. Use plain DOM APIs and Canvas.
- When adding a new class file, add a `<script>` tag in `index.html` in the correct load order and (if it's a cached asset) to the `ASSETS` list in `service-worker.js`.
- The service worker is **network-first** (`skipWaiting` + `clients.claim`): it fetches fresh assets when online and falls back to cache offline, so updates land on the next reload. Still bump `CACHE_NAME` in `service-worker.js` (currently `snake-game-v11`) whenever cached assets change, so the offline fallback and old-cache cleanup stay correct. `main.js` reloads the page once on `controllerchange` so a new worker's fresh assets take effect without a manual refresh.
- `game.js` polyfills `CanvasRenderingContext2D.roundRect` (absent on Safari < 16); the rounded snake segments depend on it. Keep canvas APIs Safari-safe and pair every `backdrop-filter` with a `-webkit-` prefix.
- DOM lookups are defensively guarded (`if (element)` / `if (button)`) throughout — follow this pattern since scripts run against a fixed HTML structure.
- The board is sized as `canvas dimension / gridSize` (400 / 20 = 20×20 cells). Changing `gridSize` or the canvas `width`/`height` in `index.html` reshapes the grid.
- A few teardown/pause paths call `cancelAnimationFrame(this.animationFrame)`, but the active loop handle is `this.animationFrameId`; the loop's own guard (`if (this.gameOver || this.isPaused)`) is what actually stops it. Prefer `this.animationFrameId` when touching this code.
