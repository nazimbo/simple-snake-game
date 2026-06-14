// Procedural chiptune music + sound effects via the Web Audio API.
// No audio files, no dependencies, works offline — in keeping with the project.
//
// A Web Audio context can only start after a user gesture, so the context is
// created lazily (ensureContext) the first time playback is requested, which
// always happens from a click/keypress (Start button, mute toggle, etc.).
//
// Music is a 4-bar loop (Am–F–C–G) driven by a look-ahead scheduler for tight
// timing: a lead melody, an arpeggio, a bass line and drums (kick/snare/hat),
// softened by a low-pass filter and an echo send.

function midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
}

// Per-bar patterns (16 sixteenth-notes each); null = rest. Concatenated into a
// 64-step loop over the chord progression Am – F – C – G.
const LEAD = [
    76, null, 72, null, 74, null, 76, null, 81, null, null, 79, 76, null, 74, null, // Am
    72, null, 69, null, 72, null, 77, null, 76, null, null, 74, 72, null, 69, null, // F
    76, null, 79, null, 76, null, 72, null, 74, null, null, 76, 79, null, 76, null, // C
    74, null, 71, null, 74, null, 79, null, 77, null, null, 74, 71, null, 74, null  // G
];
const BASS = [
    45, null, null, null, 45, null, null, null, 57, null, null, null, 52, null, null, null, // A2
    41, null, null, null, 41, null, null, null, 53, null, null, null, 48, null, null, null, // F2
    48, null, null, null, 48, null, null, null, 60, null, null, null, 55, null, null, null, // C3
    43, null, null, null, 43, null, null, null, 55, null, null, null, 50, null, null, null  // G2
];
const ARP = [
    69, 72, 76, 81, 69, 72, 76, 81, 69, 72, 76, 81, 69, 72, 76, 81, // Am: A C E A
    65, 69, 72, 77, 65, 69, 72, 77, 65, 69, 72, 77, 65, 69, 72, 77, // F:  F A C F
    72, 76, 79, 84, 72, 76, 79, 84, 72, 76, 79, 84, 72, 76, 79, 84, // C:  C E G C
    67, 71, 74, 79, 67, 71, 74, 79, 67, 71, 74, 79, 67, 71, 74, 79  // G:  G B D G
];
// Drum hits repeat every bar: kick on 1 & 3, snare on 2 & 4, hat on the offbeats
const BAR_KICK  = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
const BAR_SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
const BAR_HAT   = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];

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

        this.bpm = 128;
        this.totalSteps = 64;
        this.currentStep = 0;
        this.nextNoteTime = 0;
        this.timerId = null;
        this.lookahead = 0.025;     // scheduler tick (s)
        this.scheduleAhead = 0.12;  // how far ahead to schedule (s)
    }

    stepDuration() {
        return (60 / this.bpm) / 4; // sixteenth note
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
        const dur = this.stepDuration();
        const bar = step % 16;

        if (LEAD[step]) this.voice(midiToFreq(LEAD[step]), time, dur * 1.7, 'square', 0.17, true);
        if (BASS[step]) this.voice(midiToFreq(BASS[step]), time, dur * 1.4, 'triangle', 0.24, false);
        if (ARP[step]) this.voice(midiToFreq(ARP[step]), time, dur * 0.8, 'square', 0.08, true);

        if (BAR_KICK[bar]) this.kick(time);
        if (BAR_SNARE[bar]) this.noiseHit(time, 1500, 0.28, 0.12);
        if (BAR_HAT[bar]) this.noiseHit(time, 7000, 0.12, 0.04);
    }

    startMusic() {
        this.ensureContext();
        if (!this.ctx || this.timerId) return;

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
