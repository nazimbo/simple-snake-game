// Procedural chiptune music + sound effects via the Web Audio API.
// No audio files, no dependencies, works offline — in keeping with the project.
//
// A Web Audio context can only start after a user gesture, so the context is
// created lazily (ensureContext) the first time playback is requested, which
// always happens from a click/keypress (Start button, mute toggle, etc.).

const NOTE = {
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00,
    C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00
};

class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        this.muted = false;
        try {
            this.muted = localStorage.getItem('snakeMuted') === 'true';
        } catch (e) {
            // localStorage unavailable — default to unmuted
        }

        this.musicTimer = null;
        this.musicStep = 0;
        this.stepDuration = 0.15; // seconds per 8th-note step

        // A short looping melody in A-minor / C-major (0 = rest)
        const N = NOTE;
        this.melody = [
            N.E5, 0, N.G5, N.E5, N.A5, 0, N.G5, 0,
            N.E5, 0, N.C5, N.E5, N.D5, 0, 0, 0,
            N.C5, 0, N.E5, N.G5, N.A5, 0, N.G5, N.E5,
            N.D5, 0, N.C5, N.D5, N.E5, 0, 0, 0
        ];
        this.bass = [
            N.A2, 0, 0, 0, N.F2, 0, 0, 0, N.C2, 0, 0, 0, N.G2, 0, 0, 0,
            N.A2, 0, 0, 0, N.F2, 0, 0, 0, N.C2, 0, 0, 0, N.G2, 0, 0, 0
        ];
    }

    ensureContext() {
        if (this.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;

        this.ctx = new AC();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.7;
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.35;
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.6;
        this.sfxGain.connect(this.masterGain);
    }

    resume() {
        this.ensureContext();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    // One enveloped tone
    playTone(freq, duration, type, when, vol, dest) {
        if (!this.ctx || !freq) return;
        const t = this.ctx.currentTime + (when || 0);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(g);
        g.connect(dest || this.sfxGain);
        osc.start(t);
        osc.stop(t + duration + 0.02);
    }

    startMusic() {
        this.ensureContext();
        if (!this.ctx || this.musicTimer) return;

        this.musicStep = 0;
        const step = () => {
            const i = this.musicStep % this.melody.length;
            this.playTone(this.melody[i], this.stepDuration * 0.9, 'square', 0, 0.22, this.musicGain);
            this.playTone(this.bass[i], this.stepDuration * 1.9, 'triangle', 0, 0.30, this.musicGain);
            this.musicStep++;
        };
        step();
        this.musicTimer = setInterval(step, this.stepDuration * 1000);
    }

    stopMusic() {
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    }

    playEat() {
        this.ensureContext();
        this.playTone(880, 0.08, 'square', 0, 0.4, this.sfxGain);
        this.playTone(1320, 0.09, 'square', 0.07, 0.4, this.sfxGain);
    }

    playGameOver() {
        this.ensureContext();
        [440, 349, 262, 196].forEach((f, i) => {
            this.playTone(f, 0.28, 'sawtooth', i * 0.15, 0.4, this.sfxGain);
        });
    }

    playWin() {
        this.ensureContext();
        [523, 659, 784, 1047].forEach((f, i) => {
            this.playTone(f, 0.20, 'square', i * 0.1, 0.4, this.sfxGain);
        });
    }

    setMuted(muted) {
        this.muted = muted;
        try {
            localStorage.setItem('snakeMuted', muted ? 'true' : 'false');
        } catch (e) {
            // ignore
        }
        if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 0.7;
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    isMuted() {
        return this.muted;
    }
}
