// Procedural chiptune music + sound effects via the Web Audio API.
// No audio files, no dependencies, works offline — in keeping with the project.
//
// A Web Audio context can only start after a user gesture, so the context is
// created lazily (ensureContext) the first time playback is requested, which
// always happens from a click/keypress (Start button, track/mute toggle, etc.).
//
// Each track is a 4-bar loop driven by a look-ahead scheduler for tight timing:
// a lead melody, an arpeggio, a bass line and drums (kick/snare/hat), softened
// by a low-pass filter and an echo send. Tracks are plain data in MUSIC_TRACKS,
// so adding one is just another entry.

function midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
}

const rep = (arr, n) => {
    let out = [];
    for (let i = 0; i < n; i++) out = out.concat(arr);
    return out;
};
const rest = (n) => new Array(n).fill(null);

const MUSIC_TRACKS = [
    {
        id: 'adventure',
        label: 'Adventure',
        bpm: 128,
        leadType: 'square',
        lead: [
            76, null, 72, null, 74, null, 76, null, 81, null, null, 79, 76, null, 74, null, // Am
            72, null, 69, null, 72, null, 77, null, 76, null, null, 74, 72, null, 69, null, // F
            76, null, 79, null, 76, null, 72, null, 74, null, null, 76, 79, null, 76, null, // C
            74, null, 71, null, 74, null, 79, null, 77, null, null, 74, 71, null, 74, null  // G
        ],
        bass: [
            45, null, null, null, 45, null, null, null, 57, null, null, null, 52, null, null, null,
            41, null, null, null, 41, null, null, null, 53, null, null, null, 48, null, null, null,
            48, null, null, null, 48, null, null, null, 60, null, null, null, 55, null, null, null,
            43, null, null, null, 43, null, null, null, 55, null, null, null, 50, null, null, null
        ],
        arp: [
            ...rep([69, 72, 76, 81], 4), ...rep([65, 69, 72, 77], 4),
            ...rep([72, 76, 79, 84], 4), ...rep([67, 71, 74, 79], 4)
        ],
        kick:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hat:   [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]
    },
    {
        id: 'sunrise',
        label: 'Sunrise',
        bpm: 120,
        leadType: 'square',
        lead: [
            72, null, 76, null, 79, null, 76, null, 72, null, 74, null, 76, null, null, null, // C
            74, null, 71, null, 67, null, 71, null, 74, null, 76, null, 74, null, null, null, // G
            72, null, 76, null, 81, null, 79, null, 76, null, 72, null, 74, null, null, null, // Am
            69, null, 72, null, 77, null, 72, null, 69, null, 65, null, 67, null, null, null  // F
        ],
        bass: [
            48, null, null, null, 48, null, null, null, 60, null, null, null, 55, null, null, null,
            43, null, null, null, 43, null, null, null, 55, null, null, null, 50, null, null, null,
            45, null, null, null, 45, null, null, null, 57, null, null, null, 52, null, null, null,
            41, null, null, null, 41, null, null, null, 53, null, null, null, 48, null, null, null
        ],
        arp: [
            ...rep([60, 64, 67, 72], 4), ...rep([55, 59, 62, 67], 4),
            ...rep([57, 60, 64, 69], 4), ...rep([53, 57, 60, 65], 4)
        ],
        kick:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hat:   [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]
    },
    {
        id: 'midnight',
        label: 'Midnight',
        bpm: 124,
        leadType: 'sawtooth',
        lead: [
            69, null, null, null, 72, null, 76, null, null, null, 72, null, 69, null, null, null, // Am
            67, null, null, null, 71, null, 74, null, null, null, 71, null, 67, null, null, null, // G
            65, null, null, null, 69, null, 72, null, null, null, 69, null, 65, null, null, null, // F
            64, null, null, null, 68, null, 71, null, null, null, 68, null, 64, null, null, null  // E
        ],
        bass: [
            45, null, null, null, 45, null, null, null, 45, null, null, null, 45, null, null, null,
            43, null, null, null, 43, null, null, null, 43, null, null, null, 43, null, null, null,
            41, null, null, null, 41, null, null, null, 41, null, null, null, 41, null, null, null,
            40, null, null, null, 40, null, null, null, 40, null, null, null, 40, null, null, null
        ],
        arp: rest(64),
        kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hat:   [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]
    },
    {
        id: 'off',
        label: 'Off',
        silent: true
    }
];

class AudioManager {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.musicBus = null;
        this.drumBus = null;
        this.sfxGain = null;
        this.noiseBuffer = null;
        this.delay = null;

        this.muted = false;
        try {
            this.muted = localStorage.getItem('snakeMuted') === 'true';
        } catch (e) {
            // localStorage unavailable — default to unmuted
        }

        let storedTrack = null;
        try {
            storedTrack = localStorage.getItem('snakeTrack');
        } catch (e) {
            // ignore
        }
        this.track = MUSIC_TRACKS.find((t) => t.id === storedTrack) || MUSIC_TRACKS[0];

        this.totalSteps = 64;
        this.currentStep = 0;
        this.nextNoteTime = 0;
        this.timerId = null;
        this.lookahead = 0.025;     // scheduler tick (s)
        this.scheduleAhead = 0.12;  // how far ahead to schedule (s)
    }

    getTracks() {
        return MUSIC_TRACKS;
    }

    getTrackId() {
        return this.track ? this.track.id : null;
    }

    stepDuration() {
        const bpm = this.track && this.track.bpm ? this.track.bpm : 128;
        return (60 / bpm) / 4; // sixteenth note
    }

    ensureContext() {
        if (this.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;

        const ctx = new AC();
        this.ctx = ctx;

        this.master = ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.55;
        this.master.connect(ctx.destination);

        // Music runs through a gentle low-pass to tame square-wave harshness
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 2600;
        lowpass.connect(this.master);

        this.musicBus = ctx.createGain();
        this.musicBus.gain.value = 0.9;
        this.musicBus.connect(lowpass);

        // Echo send (feeds back into the music bus so echoes are filtered too)
        this.delay = ctx.createDelay(1.0);
        this.delay.delayTime.value = this.stepDuration() * 3;
        const feedback = ctx.createGain();
        feedback.gain.value = 0.28;
        const wet = ctx.createGain();
        wet.gain.value = 0.3;
        this.delay.connect(feedback);
        feedback.connect(this.delay);
        this.delay.connect(wet);
        wet.connect(this.musicBus);

        this.drumBus = ctx.createGain();
        this.drumBus.gain.value = 0.8;
        this.drumBus.connect(this.master);

        this.sfxGain = ctx.createGain();
        this.sfxGain.gain.value = 0.6;
        this.sfxGain.connect(this.master);

        // 1s of white noise reused for hats/snare
        const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuffer = buffer;
    }

    resume() {
        this.ensureContext();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    // A single melodic voice with a short attack/decay envelope
    voice(freq, time, duration, type, vol, sendDelay) {
        if (!this.ctx || !freq) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(vol, time + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        osc.connect(g);
        g.connect(this.musicBus);
        if (sendDelay && this.delay) g.connect(this.delay);
        osc.start(time);
        osc.stop(time + duration + 0.02);
    }

    kick(time) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(50, time + 0.12);
        g.gain.setValueAtTime(0.5, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
        osc.connect(g);
        g.connect(this.drumBus);
        osc.start(time);
        osc.stop(time + 0.2);
    }

    noiseHit(time, highpassFreq, vol, duration) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = highpassFreq;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + duration);
        src.connect(hp);
        hp.connect(g);
        g.connect(this.drumBus);
        src.start(time);
        src.stop(time + duration + 0.02);
    }

    scheduleStep(step, time) {
        const t = this.track;
        const dur = this.stepDuration();
        const bar = step % 16;

        if (t.lead[step]) this.voice(midiToFreq(t.lead[step]), time, dur * 1.7, t.leadType, 0.17, true);
        if (t.bass[step]) this.voice(midiToFreq(t.bass[step]), time, dur * 1.4, 'triangle', 0.24, false);
        if (t.arp[step]) this.voice(midiToFreq(t.arp[step]), time, dur * 0.8, 'square', 0.08, true);

        if (t.kick[bar]) this.kick(time);
        if (t.snare[bar]) this.noiseHit(time, 1500, 0.28, 0.12);
        if (t.hat[bar]) this.noiseHit(time, 7000, 0.12, 0.04);
    }

    startMusic() {
        this.ensureContext();
        if (!this.ctx || this.timerId) return;
        if (!this.track || this.track.silent) return;

        this.totalSteps = this.track.lead.length;
        if (this.delay) this.delay.delayTime.value = this.stepDuration() * 3;
        this.currentStep = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.05;
        this.timerId = setInterval(() => {
            // Look-ahead scheduler: queue every note due in the next window
            while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAhead) {
                this.scheduleStep(this.currentStep, this.nextNoteTime);
                this.nextNoteTime += this.stepDuration();
                this.currentStep = (this.currentStep + 1) % this.totalSteps;
            }
        }, this.lookahead * 1000);
    }

    stopMusic() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    setTrack(id) {
        const next = MUSIC_TRACKS.find((t) => t.id === id);
        if (!next) return;
        this.track = next;
        try {
            localStorage.setItem('snakeTrack', next.id);
        } catch (e) {
            // ignore
        }
        // If music is currently playing, swap to the new track immediately
        if (this.timerId) {
            this.stopMusic();
            this.startMusic();
        }
    }

    // One enveloped SFX tone
    playTone(freq, duration, type, when, vol) {
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
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + duration + 0.02);
    }

    playEat() {
        this.ensureContext();
        this.playTone(880, 0.08, 'square', 0, 0.4);
        this.playTone(1320, 0.09, 'square', 0.07, 0.4);
    }

    playGameOver() {
        this.ensureContext();
        [440, 349, 262, 196].forEach((f, i) => this.playTone(f, 0.28, 'sawtooth', i * 0.15, 0.4));
    }

    playWin() {
        this.ensureContext();
        [523, 659, 784, 1047].forEach((f, i) => this.playTone(f, 0.20, 'square', i * 0.1, 0.4));
    }

    setMuted(muted) {
        this.muted = muted;
        try {
            localStorage.setItem('snakeMuted', muted ? 'true' : 'false');
        } catch (e) {
            // ignore
        }
        if (this.master) this.master.gain.value = muted ? 0 : 0.55;
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    isMuted() {
        return this.muted;
    }
}
