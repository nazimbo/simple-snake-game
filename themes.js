// Theme catalogue + manager.
//
// Each theme has two halves:
//   ui    — CSS custom properties applied to :root (page chrome, overlays, buttons)
//   board — tokens read by Game's canvas renderer (background, grid, snake, food, effects)
//
// Snake colour is expressed in HSL so a single token set can describe both a flat
// monochrome body and a multi-hue gradient (hueHead → hueTail along the body).

const THEMES = [
    {
        id: 'slate',
        label: 'Sobre',
        ui: {
            bg: '#15161c', surface: 'rgba(255,255,255,0.035)', border: 'rgba(255,255,255,0.08)',
            text: '#e7e8ec', textDim: '#8b8e99', accent: '#79b894', food: '#e0a16b',
            overlay: 'rgba(21,22,28,0.82)', btnText: '#10221a',
            font: "'Segoe UI','Trebuchet MS',system-ui,sans-serif"
        },
        board: {
            bg: ['#15161c', '#15161c'], vignette: 0.35,
            grid: { style: 'lines', color: 'rgba(255,255,255,0.035)' },
            snake: { hueHead: 150, hueTail: 150, sat: 30, lightHead: 60, lightTail: 42, glow: 'rgba(0,0,0,0.35)', glowBlur: 4, corner: 8, eye: '#11160f' },
            food: { color: '#e0a16b', glow: 'rgba(224,161,107,0.45)', glowBlur: 10, sparkle: false, highlight: true, pulse: 0.06 },
            effect: { color: '#e0a16b' }
        }
    },
    {
        id: 'neon',
        label: 'Néon',
        ui: {
            bg: '#0a0420', surface: 'rgba(255,255,255,0.04)', border: 'rgba(0,240,255,0.18)',
            text: '#f3edff', textDim: '#9d8fc7', accent: '#00f0ff', food: '#ffd24a',
            overlay: 'rgba(8,4,26,0.8)', btnText: '#06021a',
            font: "'Segoe UI','Trebuchet MS',system-ui,sans-serif"
        },
        board: {
            bg: ['#0a0524', '#15093a'], vignette: 0.2,
            grid: { style: 'dots', color: 'rgba(0,240,255,0.18)' },
            snake: { hueHead: 185, hueTail: 300, sat: 95, lightHead: 65, lightTail: 55, glow: 'rgba(0,240,255,0.6)', glowBlur: 14, corner: 8, eye: '#06021a' },
            food: { color: '#ffd24a', glow: 'rgba(255,154,61,0.9)', glowBlur: 18, sparkle: true, highlight: true, pulse: 0.12 },
            effect: { color: '#ff7ad6' }
        }
    },
    {
        id: 'gameboy',
        label: 'Game Boy',
        ui: {
            bg: '#9bbc0f', surface: 'rgba(15,56,15,0.08)', border: 'rgba(15,56,15,0.3)',
            text: '#0f380f', textDim: '#306230', accent: '#306230', food: '#0f380f',
            overlay: 'rgba(155,188,15,0.9)', btnText: '#9bbc0f',
            font: "'Courier New',monospace"
        },
        board: {
            bg: ['#9bbc0f', '#9bbc0f'], vignette: 0,
            grid: { style: 'dots', color: 'rgba(15,56,15,0.18)' },
            snake: { hueHead: 90, hueTail: 90, sat: 55, lightHead: 25, lightTail: 16, glow: 'transparent', glowBlur: 0, corner: 1, eye: '#9bbc0f' },
            food: { color: '#0f380f', glow: 'transparent', glowBlur: 0, sparkle: false, highlight: false, pulse: 0 },
            effect: { color: '#306230' }
        }
    },
    {
        id: 'forest',
        label: 'Forêt',
        ui: {
            bg: '#1b2419', surface: 'rgba(255,255,255,0.04)', border: 'rgba(140,180,120,0.15)',
            text: '#e8efe0', textDim: '#9bae8c', accent: '#8fc46b', food: '#e6794b',
            overlay: 'rgba(20,30,18,0.85)', btnText: '#16210f',
            font: "'Segoe UI','Trebuchet MS',system-ui,sans-serif"
        },
        board: {
            bg: ['#16210f', '#22301a'], vignette: 0.3,
            grid: { style: 'lines', color: 'rgba(180,220,150,0.05)' },
            snake: { hueHead: 95, hueTail: 78, sat: 45, lightHead: 55, lightTail: 36, glow: 'rgba(0,0,0,0.4)', glowBlur: 5, corner: 7, eye: '#16210f' },
            food: { color: '#e6794b', glow: 'rgba(230,121,75,0.4)', glowBlur: 10, sparkle: false, highlight: true, pulse: 0.06 },
            effect: { color: '#e6794b' }
        }
    },
    {
        id: 'ocean',
        label: 'Océan',
        ui: {
            bg: '#0c1a26', surface: 'rgba(255,255,255,0.04)', border: 'rgba(90,180,210,0.15)',
            text: '#dff0f6', textDim: '#7fa8b8', accent: '#34c6c6', food: '#ffcf5c',
            overlay: 'rgba(8,20,30,0.85)', btnText: '#06161c',
            font: "'Segoe UI','Trebuchet MS',system-ui,sans-serif"
        },
        board: {
            bg: ['#08141e', '#0f2535'], vignette: 0.3,
            grid: { style: 'lines', color: 'rgba(120,200,220,0.05)' },
            snake: { hueHead: 185, hueTail: 205, sat: 55, lightHead: 58, lightTail: 42, glow: 'rgba(0,0,0,0.35)', glowBlur: 5, corner: 8, eye: '#06161c' },
            food: { color: '#ffcf5c', glow: 'rgba(255,207,92,0.4)', glowBlur: 10, sparkle: false, highlight: true, pulse: 0.07 },
            effect: { color: '#ffcf5c' }
        }
    },
    {
        id: 'sakura',
        label: 'Sakura',
        ui: {
            bg: '#fdeef2', surface: 'rgba(0,0,0,0.03)', border: 'rgba(200,120,150,0.2)',
            text: '#5a3645', textDim: '#a87f8e', accent: '#e6789e', food: '#7bbf8a',
            overlay: 'rgba(253,238,242,0.85)', btnText: '#ffffff',
            font: "'Segoe UI','Trebuchet MS',system-ui,sans-serif"
        },
        board: {
            bg: ['#fde3ea', '#fbeef2'], vignette: 0.12,
            grid: { style: 'lines', color: 'rgba(200,120,150,0.08)' },
            snake: { hueHead: 330, hueTail: 345, sat: 60, lightHead: 68, lightTail: 55, glow: 'rgba(0,0,0,0.12)', glowBlur: 4, corner: 9, eye: '#5a3645' },
            food: { color: '#7bbf8a', glow: 'rgba(123,191,138,0.4)', glowBlur: 8, sparkle: false, highlight: true, pulse: 0.07 },
            effect: { color: '#e6789e' }
        }
    },
    {
        id: 'ember',
        label: 'Lave',
        ui: {
            bg: '#1a0f0c', surface: 'rgba(255,255,255,0.04)', border: 'rgba(255,120,60,0.18)',
            text: '#ffe9df', textDim: '#c79a8c', accent: '#ff7a3d', food: '#ffd24a',
            overlay: 'rgba(20,8,5,0.85)', btnText: '#1a0f0c',
            font: "'Segoe UI','Trebuchet MS',system-ui,sans-serif"
        },
        board: {
            bg: ['#160805', '#2a0f08'], vignette: 0.4,
            grid: { style: 'lines', color: 'rgba(255,120,60,0.06)' },
            snake: { hueHead: 30, hueTail: 8, sat: 90, lightHead: 58, lightTail: 42, glow: 'rgba(255,90,20,0.6)', glowBlur: 12, corner: 8, eye: '#160805' },
            food: { color: '#ffe06a', glow: 'rgba(255,180,40,0.8)', glowBlur: 16, sparkle: true, highlight: true, pulse: 0.1 },
            effect: { color: '#ff7a3d' }
        }
    },
    {
        id: 'noir',
        label: 'Noir',
        ui: {
            bg: '#101012', surface: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)',
            text: '#f2f2f3', textDim: '#888888', accent: '#d8d8da', food: '#ffffff',
            overlay: 'rgba(16,16,18,0.85)', btnText: '#101012',
            font: "'Segoe UI','Trebuchet MS',system-ui,sans-serif"
        },
        board: {
            bg: ['#101012', '#161618'], vignette: 0.35,
            grid: { style: 'dots', color: 'rgba(255,255,255,0.06)' },
            snake: { hueHead: 0, hueTail: 0, sat: 0, lightHead: 80, lightTail: 50, glow: 'rgba(0,0,0,0.5)', glowBlur: 5, corner: 6, eye: '#101012' },
            food: { color: '#ffffff', glow: 'rgba(255,255,255,0.4)', glowBlur: 10, sparkle: false, highlight: true, pulse: 0.06 },
            effect: { color: '#ffffff' }
        }
    }
];

const ThemeManager = {
    STORAGE_KEY: 'snakeTheme',

    getStoredId() {
        try {
            return localStorage.getItem(this.STORAGE_KEY);
        } catch (e) {
            return null;
        }
    },

    getInitial() {
        const id = this.getStoredId();
        return THEMES.find(t => t.id === id) || THEMES[0];
    },

    store(id) {
        try {
            localStorage.setItem(this.STORAGE_KEY, id);
        } catch (e) {
            // localStorage unavailable (private mode, etc.) — fail silently
        }
    },

    applyUI(ui) {
        const root = document.documentElement.style;
        root.setProperty('--bg', ui.bg);
        root.setProperty('--surface', ui.surface);
        root.setProperty('--border', ui.border);
        root.setProperty('--text', ui.text);
        root.setProperty('--text-dim', ui.textDim);
        root.setProperty('--accent', ui.accent);
        root.setProperty('--food', ui.food);
        root.setProperty('--overlay', ui.overlay);
        root.setProperty('--btn-text', ui.btnText);
        root.setProperty('--font', ui.font);
    }
};
