/* ==========================================================================
   IPACU :: SYNTHESIZED WEB AUDIO API SOUND ENGINE
   ========================================================================== */

class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmGain = null;
    this.bgmTimer = null;
    this.isBGMPlaying = false;
    this.tempoMultiplier = 1.5; // Fast default gameplay tempo
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.isBGMPlaying) {
      this.startBGM();
    }
  }

  setBGMTempo(multiplier) {
    this.tempoMultiplier = multiplier;
  }

  startBGM() {
    if (this.muted || !this.ctx || this.isBGMPlaying) return;
    this.isBGMPlaying = true;

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.09, this.ctx.currentTime);
    this.bgmGain.connect(this.ctx.destination);

    // Fast-Paced Horror Violin & Percussive Beat Pattern
    const melody = [
      { note: 293.66, dur: 0.35 }, // D4 fast
      { note: 311.13, dur: 0.35 }, // Eb4
      { note: 369.99, dur: 0.45 }, // F#4
      { note: 349.23, dur: 0.30 }, // F4
      { note: 277.18, dur: 0.50 }, // C#4
      { note: 293.66, dur: 0.40 }, // D4
      { note: 220.00, dur: 0.35 }, // A3
      { note: 233.08, dur: 0.45 }, // Bb3
    ];

    let noteIdx = 0;
    const playNextViolinNote = () => {
      if (!this.isBGMPlaying || this.muted || !this.ctx) return;

      const item = melody[noteIdx];
      noteIdx = (noteIdx + 1) % melody.length;
      const actualDur = item.dur / (this.tempoMultiplier || 1.5);
      const now = this.ctx.currentTime;

      // 1. Sawtooth Violin Oscillator
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      // 2. Vibrato LFO for Horror Violin weeping effect
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 8 * this.tempoMultiplier; // Fast vibrato
      lfoGain.gain.value = item.note * 0.03;
      lfo.connect(osc.frequency);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(item.note, now);

      // Lowpass Filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.exponentialRampToValueAtTime(0.2, now + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + actualDur * 0.95);

      lfo.start(now);
      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.bgmGain);
      osc.start(now);

      lfo.stop(now + actualDur);
      osc.stop(now + actualDur);

      // 3. Fast Rhythmic Horror Percussive Bass Beat Drop (Kick + Sub Pulse)
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.type = 'triangle';
      kickOsc.frequency.setValueAtTime(120 * (this.tempoMultiplier > 2.0 ? 1.4 : 1.0), now);
      kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

      kickGain.gain.setValueAtTime(0.3, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      kickOsc.connect(kickGain);
      kickGain.connect(this.bgmGain);
      kickOsc.start(now);
      kickOsc.stop(now + 0.1);

      // Schedule next fast note beat
      this.bgmTimer = setTimeout(playNextViolinNote, actualDur * 1000);
    };

    playNextViolinNote();
  }

  stopBGM() {
    this.isBGMPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    }
  }

  playClick() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playTrapDeploy() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playShield() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  playCamo() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playSonar() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1800, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playCaptureTriumph() {
    if (this.muted || !this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.1);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.1 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + idx * 0.1);
      osc.stop(this.ctx.currentTime + idx * 0.1 + 0.35);
    });
  }
}

export const sound = new AudioSynthesizer();
